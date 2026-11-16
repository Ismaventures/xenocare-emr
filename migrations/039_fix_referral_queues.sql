-- Migration: Fix NHIS Referral Queue Progression
-- 
-- 1. Updates process_nhis_referral_queue to:
--    a) Set nhis_verification_status = 'verified' on the created encounter
--    b) Automatically add the patient to the 'Nursing' queue for Vitals
-- 
-- This fixes the issue where external referral patients would get stuck
-- after NHIS approval (encounter created but not in queue).

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
        -- FIX 1: Set nhis_verification_status = 'verified' since this is an approved referral
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
            nhis_verification_status, -- Explicitly set verified
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
            'verified', -- Mark as verified immediately
            COALESCE(v_queue.chief_complaint, v_queue.clinical_basis, p_referral_reason, 'NHIS Referral')
        )
        RETURNING id INTO v_encounter_id;
        
        -- FIX 2: Add patient to Nursing Queue for Vitals
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
            v_encounter_id, -- queue.visit_id stores encounter UUID
            v_encounter_id,
            v_queue.target_clinic_id,
            'Q-' || LPAD((floor(random() * 9000) + 1000)::text, 4, '0'),
            'Nursing', -- Send to Nursing for Vitals
            'Normal',
            'Waiting',
            'External NHIS Referral - Approved',
            NOW(),
            NOW()
        );

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
'Process external NHIS referral queue item. On approval, creates an encounter, marks it as verified, and adds patient to Nursing queue.';
