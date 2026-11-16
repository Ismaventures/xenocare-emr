-- Migration: Fix NHIS Referral Workflow Routing
-- ============================================================================
-- CORRECT WORKFLOWS:
-- 
-- 1. EXTERNAL REFERRAL (Patient from outside facility):
--    NHIS Approval → Billing Queue (payment verification) → Consultation Queue
--
-- 2. INTERNAL REFERRAL (Specialty Clinics - Dental, Eye, Physio, Surgery):
--    NHIS Approval → Referral Section (Encounter Module) 
--    → Admin books appointment & creates encounter (for approved specialty clinic)
--    → Specialty Clinic Queue
-- ============================================================================

-- Drop existing function versions to avoid conflicts
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

-- ============================================================================
-- 1. FIX EXTERNAL REFERRAL: Route to BILLING first, not Nursing
-- ============================================================================

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
    v_is_internal_referral boolean := false;
    v_target_location text;
    v_billing_order_id uuid;
    v_order_number text;
BEGIN
    -- Get staff ID from user ID
    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;
    
    -- Get queue item
    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;
    
    IF v_queue IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item not found');
    END IF;
    
    IF v_queue.status NOT IN ('pending', 'in_review') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Queue item already processed');
    END IF;
    
    -- Determine if this is an internal referral (specialty) vs external referral
    v_is_internal_referral := (v_queue.request_type = 'internal_nhis_approval');
    
    -- Get patient info
    SELECT * INTO v_patient FROM patients WHERE id = v_queue.patient_id;
    
    IF v_patient IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patient not found');
    END IF;
    
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
        -- Get clinic info
        IF v_queue.target_clinic_id IS NOT NULL THEN
            SELECT * INTO v_clinic FROM clinics WHERE id = v_queue.target_clinic_id;
        END IF;
        
        -- ====================================================================
        -- INTERNAL REFERRAL (Specialty): Don't create encounter here!
        -- Encounter is created by Encounter Office AFTER appointment booking.
        -- Just update the clinical_request status to 'approved'.
        -- ====================================================================
        IF v_is_internal_referral THEN
            -- Update the linked clinical_request to approved status
            UPDATE clinical_requests
            SET 
                nhis_approval_status = 'approved',
                status = 'Approved',
                referral_workflow_status = 'Pending_Encounter_Office', -- Ready for Encounter Office
                updated_at = NOW()
            WHERE id = v_queue.clinical_request_id;
            
            -- Update the queue item
            UPDATE nhis_referral_queue SET
                status = 'approved',
                processed_by = v_staff_id,
                processed_at = NOW(),
                processing_notes = p_notes
            WHERE id = p_queue_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'action', 'approved',
                'request_type', 'internal_specialty_referral',
                'message', 'Internal specialty referral approved. Patient visible in Encounter Office Referrals Queue.'
            );
            
            RETURN v_result;
        END IF;
        
        -- ====================================================================
        -- EXTERNAL REFERRAL: Create encounter and route to BILLING
        -- ====================================================================
        
        -- Generate encounter number
        SELECT 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD((COALESCE(MAX(CAST(SUBSTRING(encounter_number FROM 14) AS INTEGER)), 0) + 1)::text, 4, '0')
        INTO v_encounter_number
        FROM visits
        WHERE encounter_number LIKE 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
        
        -- Generate visit_id
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
            nhis_verification_status,
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
            'verified', -- Mark as verified (NHIS approval done)
            COALESCE(v_queue.chief_complaint, v_queue.clinical_basis, p_referral_reason, 'NHIS Referral')
        )
        RETURNING id INTO v_encounter_id;
        
        -- ====================================================================
        -- FIX: Route to BILLING queue first (not Nursing!)
        -- After payment verification, Billing will route to Consultation
        -- ====================================================================
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
            'Billing', -- CHANGED: Route to Billing first!
            'Normal',
            'Waiting',
            'External NHIS Referral - Approved. Awaiting payment verification.',
            NOW(),
            NOW()
        );

        -- Create consultation billing order (NHIS patients need billing records for audit)
        -- Note: billing_orders is a header table; line items go in billing_items
        
        -- Generate order number
        SELECT 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 13) AS INTEGER)), 0) + 1)::text, 4, '0')
        INTO v_order_number
        FROM billing_orders
        WHERE order_number LIKE 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
        
        INSERT INTO billing_orders (
            order_number,
            encounter_id,
            visit_id,
            patient_id,
            total_amount,
            net_amount,
            nhis_covered,
            nhis_payable,
            patient_payable,
            status,
            source_module,
            payment_method,
            created_at,
            updated_at
        ) VALUES (
            v_order_number,
            v_encounter_id,
            v_encounter_id,
            v_queue.patient_id,
            0, -- Total amount
            0, -- Net amount
            TRUE, -- NHIS covered
            0, -- NHIS pays 0 for registration
            0, -- Patient pays 0
            'Pending',
            'registration',
            'NHIS'::payment_method,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_billing_order_id;
        
        -- Add a billing item for the consultation fee
        INSERT INTO billing_items (
            billing_order_id,
            item_type,
            item_name,
            service_name,
            quantity,
            unit_price,
            unit_cost,
            total_price,
            gross_amount,
            nhis_covered,
            nhis_payable,
            patient_payable,
            status
        ) VALUES (
            v_billing_order_id,
            'Consultation',
            'Consultation Fee (NHIS Referral)',
            'Consultation Fee (NHIS Referral)',
            1,
            0,
            0,
            0,
            0,
            TRUE,
            0,
            0,
            'Unpaid'
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
        
        -- Create authorization record
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
        
        -- Update patient referral fields
        UPDATE patients SET
            nhis_patient_source = 'Referral',
            referral_code = COALESCE(p_referral_code, referral_code),
            referring_facility_name = COALESCE(p_referral_source, referring_facility_name),
            referral_status = 'Active'::referral_status_enum
        WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'approved',
            'request_type', 'external_referral',
            'encounter_id', v_encounter_id,
            'encounter_number', v_encounter_number,
            'authorization_id', v_authorization_id,
            'next_queue', 'Billing',
            'message', 'External NHIS referral approved. Patient routed to Billing Queue for verification.'
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
        
        -- If internal referral, also update clinical_request
        IF v_is_internal_referral AND v_queue.clinical_request_id IS NOT NULL THEN
            UPDATE clinical_requests
            SET 
                nhis_approval_status = 'rejected',
                status = 'Rejected',
                referral_workflow_status = 'Cancelled',
                updated_at = NOW()
            WHERE id = v_queue.clinical_request_id;
        END IF;
        
        -- Update patient referral status
        UPDATE patients SET
            referral_status = 'Cancelled'::referral_status_enum,
            updated_at = NOW()
        WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'action', 'rejected',
            'reason', p_rejection_reason,
            'message', 'NHIS referral rejected'
        );
    ELSE
        v_result := jsonb_build_object('success', false, 'error', 'Invalid action. Use approve or reject');
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_nhis_referral_queue IS 
'Process NHIS referral queue items.
- EXTERNAL referrals: Creates encounter and routes to Billing Queue (then Consultation after payment).
- INTERNAL referrals: Updates clinical_request status, patient appears in Encounter Office Referrals.';

-- ============================================================================
-- 2. ADD clinical_request_id TO nhis_referral_queue (for internal referral linking)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'clinical_request_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN clinical_request_id uuid REFERENCES clinical_requests(id);
        COMMENT ON COLUMN public.nhis_referral_queue.clinical_request_id IS 
        'Links to the original clinical_request for internal specialty referrals';
    END IF;
END $$;

-- ============================================================================
-- 3. FIX INTERNAL REFERRAL: create_referral_encounter routes to SPECIALTY QUEUE
-- ============================================================================

-- Drop existing to recreate
DROP FUNCTION IF EXISTS create_referral_encounter(uuid, uuid, uuid, varchar, varchar, uuid);

CREATE OR REPLACE FUNCTION create_referral_encounter(
    p_referral_id UUID,
    p_clinic_id UUID,
    p_attending_doctor_id UUID,
    p_visit_type VARCHAR DEFAULT 'Follow-up',
    p_priority VARCHAR DEFAULT 'Normal',
    p_created_by UUID DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    v_referral RECORD;
    v_clinic RECORD;
    v_new_encounter_id UUID;
    v_encounter_number VARCHAR;
    v_visit_id VARCHAR;
    v_today_prefix VARCHAR;
    v_next_seq INT;
    v_target_location VARCHAR;
BEGIN
    -- Get referral details
    SELECT 
        cr.*,
        p.emr_number,
        p.insurance_type,
        rd.first_name AS ref_doc_first,
        rd.last_name AS ref_doc_last
    INTO v_referral
    FROM clinical_requests cr
    JOIN patients p ON cr.patient_id = p.id
    LEFT JOIN staff rd ON cr.requesting_doctor_id = rd.id
    WHERE cr.id = p_referral_id
      AND cr.request_type = 'Referral';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Referral not found');
    END IF;
    
    -- Check NHIS approval status for NHIS patients
    IF v_referral.insurance_type IN ('Military_NHIS', 'Civilian_NHIS', 'GIFSHIP', 'DHML') THEN
        IF v_referral.nhis_approval_status != 'approved' THEN
            RETURN jsonb_build_object('success', false, 'error', 'NHIS approval required before creating encounter');
        END IF;
    END IF;
    
    -- Check referral hasn't already been converted
    IF v_referral.referral_encounter_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Referral already converted to encounter: ' || v_referral.referral_encounter_id);
    END IF;
    
    -- Get clinic info for specialty detection
    SELECT * INTO v_clinic FROM clinics WHERE id = p_clinic_id;
    
    -- Determine target location based on specialty_module
    v_target_location := CASE v_referral.specialty_module
        WHEN 'dental' THEN 'Dental'
        WHEN 'ophthalmology' THEN 'Eye Clinic'
        WHEN 'physiotherapy' THEN 'Physiotherapy'
        WHEN 'surgery' THEN 'Surgery'
        WHEN 'ent' THEN 'ENT'
        WHEN 'cardiology' THEN 'Cardiology'
        WHEN 'orthopedics' THEN 'Orthopedics'
        ELSE COALESCE(v_clinic.clinic_name, 'Consultation')
    END;
    
    -- Generate encounter number
    SELECT 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
           LPAD((COALESCE(MAX(CAST(SUBSTRING(encounter_number FROM 14) AS INTEGER)), 0) + 1)::text, 4, '0')
    INTO v_encounter_number
    FROM visits
    WHERE encounter_number LIKE 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
    
    -- Generate visit_id
    v_today_prefix := 'S-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
    SELECT COALESCE(MAX(CAST(SUBSTRING(visit_id FROM LENGTH(v_today_prefix) + 1) AS INTEGER)), 0) + 1
    INTO v_next_seq
    FROM visits
    WHERE visit_id LIKE v_today_prefix || '%';
    v_visit_id := v_today_prefix || LPAD(v_next_seq::text, 5, '0');
    
    -- Create the new encounter
    INSERT INTO visits (
        patient_id,
        visit_id,
        clinic_id,
        attending_doctor_id,
        visit_type,
        priority,
        status,
        encounter_number,
        encounter_date,
        payment_category,
        insurance_type,
        nhis_verification_status,
        
        -- Referral-specific fields
        is_referral_encounter,
        source_referral_id,
        referring_doctor_id,
        referring_clinic_id,
        referral_reason,
        referral_clinical_notes,
        
        -- Chief complaint
        chief_complaint,
        
        created_at,
        updated_at
    ) VALUES (
        v_referral.patient_id,
        v_visit_id,
        p_clinic_id,
        p_attending_doctor_id,
        p_visit_type,
        p_priority,
        'Active',
        v_encounter_number,
        CURRENT_DATE,
        CASE WHEN v_referral.insurance_type IN ('Military_NHIS', 'Civilian_NHIS', 'GIFSHIP', 'DHML') 
             THEN 'NHIS'::payment_method ELSE 'Cash'::payment_method END,
        v_referral.insurance_type,
        'verified', -- Already NHIS approved
        
        TRUE,
        p_referral_id,
        v_referral.requesting_doctor_id,
        v_referral.source_clinic_id,
        v_referral.clinical_reason,
        v_referral.notes,
        
        'Referral from ' || COALESCE(v_referral.ref_doc_first || ' ' || v_referral.ref_doc_last, 'Unknown') || 
        ': ' || COALESCE(v_referral.clinical_reason, 'See referral notes'),
        
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_encounter_id;
    
    -- Update the referral with the new encounter ID
    UPDATE clinical_requests
    SET referral_encounter_id = v_new_encounter_id,
        referral_workflow_status = 'Encounter_Created',
        status = 'Approved',
        approved_at = NOW(),
        approved_by = p_created_by,
        updated_at = NOW()
    WHERE id = p_referral_id;
    
    -- ====================================================================
    -- FIX: Route to SPECIALTY CLINIC QUEUE directly (already NHIS approved)
    -- ====================================================================
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
        v_referral.patient_id,
        v_new_encounter_id,
        v_new_encounter_id,
        p_clinic_id,
        'Q-' || LPAD((floor(random() * 9000) + 1000)::text, 4, '0'),
        v_target_location, -- Route to Specialty Clinic!
        p_priority,
        'Waiting',
        'Internal Referral - ' || v_target_location || ' appointment',
        NOW(),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'encounter_id', v_new_encounter_id,
        'encounter_number', v_encounter_number,
        'target_location', v_target_location,
        'message', 'Encounter created. Patient routed to ' || v_target_location || ' queue.'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_referral_encounter IS 
'Creates a new encounter from an internal referral. Called by Encounter Office after appointment booking.
Routes directly to specialty clinic queue (Dental, Eye, Physio, etc.) since NHIS approval already done.';

GRANT EXECUTE ON FUNCTION create_referral_encounter TO authenticated;

-- ============================================================================
-- 4. UPDATE pending_internal_referrals VIEW
-- ============================================================================

-- Must DROP first because column order/names are changing
DROP VIEW IF EXISTS pending_internal_referrals CASCADE;

CREATE VIEW pending_internal_referrals AS
SELECT 
    cr.id AS referral_id,
    cr.request_number AS referral_number,
    cr.created_at AS referral_date,
    cr.urgency,
    cr.specialty_module,
    cr.referral_workflow_status,
    cr.nhis_approval_status,
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
    
    -- Referring Doctor Info
    rd.id AS referring_doctor_id,
    rd.first_name AS referring_doctor_first_name,
    rd.last_name AS referring_doctor_last_name,
    rd.department AS referring_doctor_department,
    src_dept.name AS source_department_name,
    src_clinic.clinic_name AS source_clinic_name,
    
    -- Target Info
    tgt_dept.id AS target_department_id,
    tgt_dept.name AS target_department_name,
    tgt_dept.code AS target_department_code,
    
    -- Original Encounter Info
    v.encounter_number AS original_encounter_number,
    v.encounter_date AS original_encounter_date,
    v.chief_complaint AS original_chief_complaint,
    c.notes AS original_clinical_notes,
    c.diagnosis AS original_diagnosis,
    
    -- Booking Info
    cr.referral_encounter_id,
    cr.appointment_booked_by,
    cr.appointment_booked_at,
    booked_staff.first_name AS booked_by_first_name,
    booked_staff.last_name AS booked_by_last_name

FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
LEFT JOIN visits v ON cr.encounter_id = v.id
LEFT JOIN consultations c ON c.encounter_id = v.id
LEFT JOIN staff rd ON cr.requesting_doctor_id = rd.id
LEFT JOIN departments src_dept ON cr.requesting_department_id = src_dept.id
LEFT JOIN clinics src_clinic ON cr.source_clinic_id = src_clinic.id
LEFT JOIN departments tgt_dept ON cr.target_department_id = tgt_dept.id
LEFT JOIN staff booked_staff ON cr.appointment_booked_by = booked_staff.id

WHERE cr.request_type = 'Referral'
  AND cr.status NOT IN ('Cancelled', 'Rejected')
  -- Only show referrals that are ready for Encounter Office
  -- (either not requiring NHIS or already NHIS approved)
  AND (cr.nhis_approval_status IN ('not_required', 'approved'))
  AND cr.referral_workflow_status IN ('Pending_Encounter_Office', 'Appointment_Booked')
ORDER BY 
    CASE cr.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        WHEN 'Routine' THEN 3 
        ELSE 4 
    END,
    cr.created_at ASC;

COMMENT ON VIEW pending_internal_referrals IS 
'View for Encounter Office to see pending internal referrals that are ready for appointment booking.
Only shows referrals that have passed NHIS approval (if required).';

