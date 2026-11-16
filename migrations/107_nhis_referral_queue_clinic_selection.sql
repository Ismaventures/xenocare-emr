-- ===========================================================================
-- Migration: Add Clinic Selection to NHIS Referral Queue
-- 
-- This migration adds the ability for admin to specify which clinic an
-- external NHIS referral patient wants to visit. The encounter is only
-- created after NHIS approval, using the selected clinic.
-- 
-- Workflow: 
-- 1. Admin selects patient and target clinic
-- 2. Request goes to NHIS queue with clinic info (nhis_approval_status = 'pending')
-- 3. NHIS officer approves/rejects
-- 4. Only after approval → encounter is created with the selected clinic
-- ===========================================================================

-- 1. Add target_clinic_id and target_doctor_id columns to nhis_referral_queue
DO $$
BEGIN
    -- Add target_clinic_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhis_referral_queue' 
        AND column_name = 'target_clinic_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue 
        ADD COLUMN target_clinic_id uuid REFERENCES clinics(id);
        
        COMMENT ON COLUMN public.nhis_referral_queue.target_clinic_id IS 
        'The clinic the external NHIS patient wants to visit (selected by admin)';
    END IF;

    -- Add target_doctor_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhis_referral_queue' 
        AND column_name = 'target_doctor_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue 
        ADD COLUMN target_doctor_id uuid REFERENCES staff(id);
        
        COMMENT ON COLUMN public.nhis_referral_queue.target_doctor_id IS 
        'The doctor to assign for the encounter (optional, can be assigned later)';
    END IF;

    -- Add visit_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhis_referral_queue' 
        AND column_name = 'visit_type'
    ) THEN
        ALTER TABLE public.nhis_referral_queue 
        ADD COLUMN visit_type text DEFAULT 'Referred NHIS Patient (External)';
        
        COMMENT ON COLUMN public.nhis_referral_queue.visit_type IS 
        'The visit type for the encounter to be created after approval';
    END IF;

    -- Add encounter_id column (populated after approval creates encounter)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhis_referral_queue' 
        AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue 
        ADD COLUMN encounter_id uuid REFERENCES visits(id);
        
        COMMENT ON COLUMN public.nhis_referral_queue.encounter_id IS 
        'The encounter created after NHIS approval (null until approved)';
    END IF;

    -- Add chief_complaint column for encounter creation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'nhis_referral_queue' 
        AND column_name = 'chief_complaint'
    ) THEN
        ALTER TABLE public.nhis_referral_queue 
        ADD COLUMN chief_complaint text;
        
        COMMENT ON COLUMN public.nhis_referral_queue.chief_complaint IS 
        'Chief complaint for the encounter (from referral reason or admin input)';
    END IF;
END $$;

-- 2. Create index for pending referrals with clinic
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_clinic 
ON nhis_referral_queue(target_clinic_id, status) 
WHERE status = 'pending';

-- 2b. Create index for request_type (external_referral vs internal_nhis_approval)
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_request_type 
ON nhis_referral_queue(request_type, status) 
WHERE status = 'pending';

-- 2c. Add comment describing request_type values
COMMENT ON COLUMN public.nhis_referral_queue.request_type IS 
'Type of NHIS approval request: 
 - external_referral: Patient referred from external facility, requires NHIS verification
 - internal_nhis_approval: Internal NHIS patient going to non-GOPD clinic, requires approval';

-- 3. Drop ALL existing versions of the function to avoid ambiguity
DO $$
DECLARE
    func_oid oid;
BEGIN
    -- Find and drop all functions with this name
    FOR func_oid IN 
        SELECT p.oid 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE p.proname = 'process_nhis_referral_queue' 
        AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- 4. Update the process_nhis_referral_queue function to create encounter on approval
CREATE OR REPLACE FUNCTION process_nhis_referral_queue(
    p_queue_id uuid,
    p_action character varying,
    p_processed_by uuid,
    p_notes text DEFAULT NULL,
    p_rejection_reason text DEFAULT NULL,
    p_auth_code character varying DEFAULT NULL,
    p_tariff_group nhis_tariff_group DEFAULT 'Civilian_HMO'::nhis_tariff_group,
    p_referral_source text DEFAULT NULL,
    p_referral_code text DEFAULT NULL,
    p_referral_date date DEFAULT NULL,
    p_referral_reason text DEFAULT NULL,
    p_referring_clinician text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_queue RECORD;
    v_patient RECORD;
    v_clinic RECORD;
    v_encounter_id uuid;
    v_encounter_number text;
    v_visit_id text;
    v_today_prefix text;
    v_next_seq int;
    v_nhis_profile_id uuid;
    v_authorization_id uuid;
    v_result jsonb;
    v_derived_tariff_group nhis_tariff_group;
    v_staff_id uuid;
BEGIN
    -- Get staff ID from user ID (p_processed_by is auth.users.id, but we need staff.id)
    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;
    
    -- Get queue item
    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;
    
    IF v_queue IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item not found');
    END IF;
    
    IF v_queue.status NOT IN ('pending', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item already processed');
    END IF;
    
    -- Get patient info
    SELECT * INTO v_patient FROM patients WHERE id = v_queue.patient_id;
    
    IF v_patient IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
    END IF;
    
    -- Derive tariff_group from patient's insurance_type
    -- Mapping: Military_NHIS, DHML -> Personnel
    --          Civilian_NHIS -> Civilian_HMO
    --          GIFSHIP -> Civilian_HMO (federal government scheme)
    --          Retainership -> Special
    --          Private -> Private
    v_derived_tariff_group := CASE 
        WHEN v_patient.insurance_type::text IN ('DHML', 'Military_NHIS') THEN 'Personnel'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'Civilian_NHIS' THEN 'Civilian_HMO'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'GIFSHIP' THEN 'Civilian_HMO'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'Retainership' THEN 'Special'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'Private' THEN 'Private'::nhis_tariff_group
        ELSE COALESCE(p_tariff_group, 'Civilian_HMO'::nhis_tariff_group)
    END;

    IF p_action = 'approve' THEN
        -- Get clinic info if specified
        IF v_queue.target_clinic_id IS NOT NULL THEN
            SELECT * INTO v_clinic FROM clinics WHERE id = v_queue.target_clinic_id;
        END IF;
        
        -- Generate encounter number
        SELECT 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD((COALESCE(MAX(CAST(SUBSTRING(encounter_number FROM 14) AS INTEGER)), 0) + 1)::text, 4, '0')
        INTO v_encounter_number
        FROM visits
        WHERE encounter_number LIKE 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
        
        -- Generate visit_id in format S-YYYYMMDD-NNNNN
        v_today_prefix := 'S-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
        
        SELECT COALESCE(MAX(CAST(SUBSTRING(visit_id FROM LENGTH(v_today_prefix) + 1) AS INTEGER)), 0) + 1
        INTO v_next_seq
        FROM visits
        WHERE visit_id LIKE v_today_prefix || '%';
        
        v_visit_id := v_today_prefix || LPAD(v_next_seq::text, 5, '0');
        
        -- Create the encounter
        INSERT INTO visits (
            patient_id,
            visit_id,
            clinic_id,
            attending_doctor_id,
            encounter_number,
            encounter_date,
            visit_type,
            status,
            payment_category,
            insurance_type,
            chief_complaint
        ) VALUES (
            v_queue.patient_id,
            v_visit_id,
            v_queue.target_clinic_id,
            v_queue.target_doctor_id,
            v_encounter_number,
            CURRENT_DATE,
            COALESCE(v_queue.visit_type, 'Referred NHIS Patient (External)'),
            'Active'::visit_status,
            'NHIS'::payment_method,
            v_patient.insurance_type,
            COALESCE(v_queue.chief_complaint, v_queue.clinical_basis, p_referral_reason, 'NHIS Referral')
        )
        RETURNING id INTO v_encounter_id;
        
        -- Ensure NHIS profile is active
        UPDATE nhis_profiles
        SET status = 'active',
            verified_by = v_staff_id,
            verified_at = NOW(),
            updated_at = NOW()
        WHERE patient_id = v_queue.patient_id
        RETURNING id INTO v_nhis_profile_id;
        
        -- If no profile exists, create one
        IF v_nhis_profile_id IS NULL THEN
            INSERT INTO nhis_profiles (
                patient_id,
                enrollee_id,
                scheme_type,
                patient_origin,
                tariff_group,
                status,
                verified_by,
                verified_at
            ) VALUES (
                v_queue.patient_id,
                COALESCE(v_patient.nhis_number, 'PEND-' || v_patient.patient_id),
                CASE 
                    WHEN v_patient.insurance_type::text IN ('Military_NHIS', 'DHML') THEN 'Personnel'::nhis_scheme_type
                    WHEN v_patient.insurance_type::text IN ('Civilian_NHIS', 'GIFSHIP') THEN 'Civilian_NHIS'::nhis_scheme_type
                    WHEN v_patient.insurance_type::text = 'Retainership' THEN 'Special'::nhis_scheme_type
                    WHEN v_patient.insurance_type::text = 'Private' THEN 'HMO_Private'::nhis_scheme_type
                    ELSE 'Civilian_NHIS'::nhis_scheme_type
                END,
                'referred'::nhis_patient_origin,
                v_derived_tariff_group,
                'active'::nhis_profile_status,
                v_staff_id,
                NOW()
            )
            RETURNING id INTO v_nhis_profile_id;
        END IF;
        
        -- Create authorization record
        INSERT INTO nhis_authorizations (
            patient_id,
            nhis_profile_id,
            auth_code,
            auth_type,
            source,
            start_date,
            expiry_date,
            status,
            referral_source,
            referral_clinical_basis,
            referring_clinician,
            referral_date,
            referral_code,
            verified_by,
            verified_at,
            verification_notes
        ) VALUES (
            v_queue.patient_id,
            v_nhis_profile_id,
            COALESCE(p_auth_code, 'REF-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')),
            'referral',
            'referred_patient',
            NOW(),
            NOW() + INTERVAL '30 days',
            'active'::nhis_auth_status,
            p_referral_source,
            v_queue.clinical_basis,
            p_referring_clinician,
            p_referral_date,
            p_referral_code,
            v_staff_id,
            NOW(),
            p_notes
        )
        RETURNING id INTO v_authorization_id;
        
        -- Update referral data if provided
        UPDATE nhis_referral_queue SET
            status = 'approved',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            authorization_id = v_authorization_id,
            encounter_id = v_encounter_id,
            referral_source = COALESCE(p_referral_source, referral_source),
            referral_code = COALESCE(p_referral_code, referral_code),
            referral_date = COALESCE(p_referral_date, referral_date),
            referring_clinician = COALESCE(p_referring_clinician, referring_clinician)
        WHERE id = p_queue_id;
        
        -- Update patient referral fields
        UPDATE patients SET
            nhis_patient_source = 'Referral',
            referral_code = COALESCE(p_referral_code, referral_code),
            referring_facility_name = COALESCE(p_referral_source, referring_facility_name),
            referral_date = COALESCE(p_referral_date, referral_date),
            referral_reason = COALESCE(p_referral_reason, referral_reason),
            referral_status = 'Active'::referral_status_enum,
            updated_at = NOW()
        WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'approved',
            'encounter_id', v_encounter_id,
            'encounter_number', v_encounter_number,
            'authorization_id', v_authorization_id,
            'nhis_profile_id', v_nhis_profile_id,
            'message', 'External NHIS referral approved. Encounter created: ' || v_encounter_number
        );
        
    ELSIF p_action = 'reject' THEN
        -- Update queue item as rejected
        UPDATE nhis_referral_queue SET
            status = 'rejected',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            rejection_reason = p_rejection_reason
        WHERE id = p_queue_id;
        
        -- Update patient referral status
        UPDATE patients SET
            referral_status = 'Cancelled'::referral_status_enum,
            updated_at = NOW()
        WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'rejected',
            'reason', p_rejection_reason,
            'message', 'External NHIS referral rejected'
        );
    ELSE
        v_result := jsonb_build_object('success', false, 'error', 'Invalid action. Use approve or reject');
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_nhis_referral_queue IS 
'Process external NHIS referral queue item. On approval, creates an encounter with the selected clinic.';
