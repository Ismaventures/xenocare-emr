-- Migration: Comprehensive Fix for NHIS Referrals (Internal + External)
-- Fixes:
-- 1. Adds missing 'nhis_approval_status' to clinical_requests (Fixes 400 Bad Request in Internal Referrals).
-- 2. Updates 'process_nhis_referral_queue' to insert patient into Nursing Queue (Fixes "Stuck" External Referrals).
-- 3. Ensures target_clinic_id exists for proper routing.

-- ===========================================================================
-- Part 1: Ensure Schema Integrity (Missing Columns)
-- ===========================================================================

DO $$
BEGIN
    -- 1. clinical_requests: nhis_approval_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clinical_requests' AND column_name = 'nhis_approval_status'
    ) THEN
        ALTER TABLE public.clinical_requests 
        ADD COLUMN nhis_approval_status text DEFAULT 'not_required'
        CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    END IF;

    -- 2. clinical_requests: nhis_authorization_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clinical_requests' AND column_name = 'nhis_authorization_id'
    ) THEN
        ALTER TABLE public.clinical_requests 
        ADD COLUMN nhis_authorization_id uuid REFERENCES nhis_approvals(id);
    END IF;

    -- 3. nhis_referral_queue: target_clinic_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'target_clinic_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN target_clinic_id uuid REFERENCES clinics(id);
    END IF;
    
    -- 4. nhis_referral_queue: target_doctor_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'target_doctor_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN target_doctor_id uuid REFERENCES staff(id);
    END IF;

    -- 5. nhis_referral_queue: visit_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'visit_type'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN visit_type text DEFAULT 'Referred NHIS Patient (External)';
    END IF;

    -- 6. nhis_referral_queue: encounter_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'encounter_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN encounter_id uuid REFERENCES visits(id);
    END IF;

    -- 7. nhis_referral_queue: chief_complaint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'chief_complaint'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN chief_complaint text;
    END IF;
END $$;

-- ===========================================================================
-- Part 2: Fix External Referral Processing (Insert into Queue)
-- ===========================================================================

-- Drop old versions to avoid conflicts
DO $$
DECLARE
    func_oid oid;
BEGIN
    FOR func_oid IN 
        SELECT p.oid FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE p.proname = 'process_nhis_referral_queue' AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Create robust version
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
    -- Get staff ID
    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;
    
    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;
    
    IF v_queue IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item not found');
    END IF;
    
    IF v_queue.status NOT IN ('pending', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item already processed');
    END IF;
    
    SELECT * INTO v_patient FROM patients WHERE id = v_queue.patient_id;
    
    -- Derive tariff group
    v_derived_tariff_group := CASE 
        WHEN v_patient.insurance_type::text IN ('DHML', 'Military_NHIS') THEN 'Personnel'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'Civilian_NHIS' THEN 'Civilian_HMO'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'GIFSHIP' THEN 'Civilian_HMO'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'Retainership' THEN 'Special'::nhis_tariff_group
        WHEN v_patient.insurance_type::text = 'Private' THEN 'Private'::nhis_tariff_group
        ELSE COALESCE(p_tariff_group, 'Civilian_HMO'::nhis_tariff_group)
    END;

    IF p_action = 'approve' THEN
        IF v_queue.target_clinic_id IS NOT NULL THEN
            SELECT * INTO v_clinic FROM clinics WHERE id = v_queue.target_clinic_id;
        END IF;
        
        -- Generate encounter Number
        SELECT 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD((COALESCE(MAX(CAST(SUBSTRING(encounter_number FROM 14) AS INTEGER)), 0) + 1)::text, 4, '0')
        INTO v_encounter_number
        FROM visits
        WHERE encounter_number LIKE 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
        
        -- Generate Visit ID
        v_today_prefix := 'S-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
        SELECT COALESCE(MAX(CAST(SUBSTRING(visit_id FROM LENGTH(v_today_prefix) + 1) AS INTEGER)), 0) + 1
        INTO v_next_seq
        FROM visits
        WHERE visit_id LIKE v_today_prefix || '%';
        v_visit_id := v_today_prefix || LPAD(v_next_seq::text, 5, '0');
        
        -- Create Encounter
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
            nhis_verification_status, -- Explicit verified status
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
            'verified', 
            COALESCE(v_queue.chief_complaint, v_queue.clinical_basis, p_referral_reason, 'NHIS Referral')
        )
        RETURNING id INTO v_encounter_id;
        
        -- FIX: Add to Nursing Queue
        INSERT INTO queue (
            patient_id,
            visit_id,
            encounter_id,
            clinic_id,
            ticket_number,
            location,
            priority,
            status,
            notes,
            created_at,
            updated_at
        ) VALUES (
            v_queue.patient_id,
            v_encounter_id,
            v_encounter_id,
            v_queue.target_clinic_id,
            'Q-' || LPAD((floor(random() * 9000) + 1000)::text, 4, '0'),
            'Nursing', -- Initial destination
            'Normal',
            'Waiting',
            'External NHIS Referral - Approved',
            NOW(),
            NOW()
        );

        -- Update NHIS Profile
        UPDATE nhis_profiles
        SET status = 'active', verified_by = v_staff_id, verified_at = NOW(), updated_at = NOW()
        WHERE patient_id = v_queue.patient_id
        RETURNING id INTO v_nhis_profile_id;
        
        IF v_nhis_profile_id IS NULL THEN
            INSERT INTO nhis_profiles (
                patient_id, enrollee_id, scheme_type, patient_origin, tariff_group, status, verified_by, verified_at
            ) VALUES (
                v_queue.patient_id,
                COALESCE(v_patient.nhis_number, 'PEND-' || v_patient.patient_id),
                CASE 
                    WHEN v_patient.insurance_type::text IN ('Military_NHIS', 'DHML') THEN 'Personnel'::nhis_scheme_type
                    WHEN v_patient.insurance_type::text IN ('Civilian_NHIS', 'GIFSHIP') THEN 'Civilian_NHIS'::nhis_scheme_type
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
        
        -- Create Authorization
        INSERT INTO nhis_authorizations (
            patient_id, nhis_profile_id, auth_code, auth_type, source, start_date, expiry_date, status, 
            referral_source, referral_clinical_basis, referring_clinician, referral_date, referral_code, 
            verified_by, verified_at, verification_notes
        ) VALUES (
            v_queue.patient_id, v_nhis_profile_id, 
            COALESCE(p_auth_code, 'REF-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')),
            'referral', 'referred_patient', NOW(), NOW() + INTERVAL '30 days', 'active',
             COALESCE(p_referral_source, v_queue.referral_source), 
             v_queue.clinical_basis, 
             COALESCE(p_referring_clinician, v_queue.referring_clinician), 
             COALESCE(p_referral_date, v_queue.referral_date), 
             COALESCE(p_referral_code, v_queue.referral_code),
             v_staff_id, NOW(), p_notes
        )
        RETURNING id INTO v_authorization_id;
        
        -- Update Queue with Encounter and Auth
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
        
        UPDATE patients SET
            nhis_patient_source = 'Referral',
            referral_code = COALESCE(p_referral_code, referral_code),
            referring_facility_name = COALESCE(p_referral_source, referring_facility_name),
            referral_status = 'Active'::referral_status_enum
        WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'approved',
            'encounter_id', v_encounter_id,
            'encounter_number', v_encounter_number,
            'message', 'External NHIS referral approved. Patient moved to Nursing Queue.'
        );
        
    ELSIF p_action = 'reject' THEN
        UPDATE nhis_referral_queue SET
            status = 'rejected',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            rejection_reason = p_rejection_reason
        WHERE id = p_queue_id;
        
        UPDATE patients SET referral_status = 'Cancelled'::referral_status_enum WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object('success', true, 'action', 'rejected', 'message', 'External NHIS referral rejected');
    ELSE
        v_result := jsonb_build_object('success', false, 'error', 'Invalid action');
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- Part 3: Fix Internal Referral Workflow
-- Ensure nhis_approval_status is visible in view if used
-- ===========================================================================

CREATE OR REPLACE VIEW pending_internal_referrals AS
SELECT 
    cr.id AS referral_id,
    cr.request_number AS referral_number,
    cr.created_at AS referral_date,
    cr.urgency,
    cr.specialty_module,
    cr.referral_workflow_status,
    cr.nhis_approval_status, -- Added crucial column
    cr.appointment_date,
    cr.appointment_time,
    cr.clinical_reason AS referral_reason,
    cr.notes AS referral_notes,
    
    -- Patient Info
    p.id AS patient_id,
    p.emr_number,
    p.first_name AS patient_first_name,
    p.middle_name AS patient_middle_name,
    p.surname AS patient_surname,
    p.date_of_birth,
    p.gender,
    p.contact_phone AS patient_phone,
    p.patient_category,
    p.insurance_type,
    p.rank AS patient_rank,
    
    -- Source/Referring Info
    rd.id AS referring_doctor_id,
    rd.first_name AS referring_doctor_first_name,
    rd.last_name AS referring_doctor_last_name,
    rd.department AS referring_doctor_department,
    src_dept.name AS source_department_name,
    src_clinic.clinic_name AS source_clinic_name,
    
    -- Target/Destination Info
    tgt_dept.id AS target_department_id,
    tgt_dept.name AS target_department_name,
    tgt_dept.code AS target_department_code,
    
    -- Original Encounter Info
    v.encounter_number AS original_encounter_number,
    v.encounter_date AS original_encounter_date,
    v.chief_complaint AS original_chief_complaint,
    c.notes AS original_clinical_notes,
    c.diagnosis AS original_diagnosis,
    
    -- Status tracking
    cr.referral_encounter_id,
    cr.appointment_booked_by,
    cr.appointment_booked_at,
    booked_by_staff.first_name AS booked_by_first_name,
    booked_by_staff.last_name AS booked_by_last_name

FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
LEFT JOIN visits v ON cr.encounter_id = v.id
LEFT JOIN consultations c ON c.encounter_id = v.id
LEFT JOIN staff rd ON cr.requesting_doctor_id = rd.id
LEFT JOIN departments src_dept ON cr.requesting_department_id = src_dept.id
LEFT JOIN clinics src_clinic ON cr.source_clinic_id = src_clinic.id
LEFT JOIN departments tgt_dept ON cr.target_department_id = tgt_dept.id
LEFT JOIN staff booked_by_staff ON cr.appointment_booked_by = booked_by_staff.id

WHERE cr.request_type = 'Referral'
  AND cr.status NOT IN ('Cancelled', 'Rejected')
  -- Show Pending_Encounter_Office items
  AND cr.referral_workflow_status IN ('Pending_Encounter_Office', 'Appointment_Booked')
ORDER BY 
    CASE cr.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        WHEN 'Routine' THEN 3 
        ELSE 4 
    END,
    cr.created_at ASC;

