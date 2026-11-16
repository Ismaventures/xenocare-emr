-- URGENT FIX: Apply via Supabase Dashboard SQL Editor
-- Go to: https://supabase.com/dashboard/project/wseumhbzroyznxeuipwa/sql/new
-- Copy and paste this entire file

-- Drop ALL existing versions of the function
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

-- Recreate the function with CORRECT billing_orders columns
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
    
    -- Determine if this is an internal referral
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
        
        -- INTERNAL REFERRAL: Check if this is from a doctor (has clinical_request_id) or direct encounter
        IF v_is_internal_referral THEN
            -- CASE A: Doctor referral (has clinical_request_id) → Update clinical_request, show in Internal Referrals
            IF v_queue.clinical_request_id IS NOT NULL THEN
                UPDATE clinical_requests
                SET 
                    nhis_approval_status = 'approved',
                    status = 'Approved',
                    referral_workflow_status = 'Pending_Encounter_Office',
                    updated_at = NOW()
                WHERE id = v_queue.clinical_request_id;
                
                UPDATE nhis_referral_queue SET
                    status = 'approved',
                    processed_by = v_staff_id,
                    processed_at = NOW(),
                    processing_notes = p_notes
                WHERE id = p_queue_id;
                
                RETURN jsonb_build_object(
                    'success', true,
                    'action', 'approved',
                    'request_type', 'internal_specialty_referral',
                    'message', 'Internal specialty referral approved. Patient visible in Encounter Office for appointment booking.'
                );
            END IF;
            
            -- CASE B: Direct encounter request (no clinical_request_id) → Create encounter immediately
            -- This is when someone tries to create encounter directly from Encounter page for NHIS patient
            
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
                COALESCE(v_queue.visit_type, 'Follow Up'),
                'Active'::visit_status,
                'NHIS'::payment_method,
                v_patient.insurance_type,
                'verified',
                COALESCE(v_queue.chief_complaint, 'NHIS Approved Encounter')
            )
            RETURNING id INTO v_encounter_id;
            
            -- Route to NURSING queue (100% NHIS auto-verified, no billing action needed)
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
                'Nursing',
                'Normal',
                'Waiting',
                'Internal NHIS Patient - 100% auto-verified. Proceed to nursing assessment.',
                NOW(),
                NOW()
            );
            
            -- Generate billing order number
            SELECT 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                   LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 13) AS INTEGER)), 0) + 1)::text, 4, '0')
            INTO v_order_number
            FROM billing_orders
            WHERE order_number LIKE 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
            
            -- Create billing order (auto-verified as Paid_NHIS for 100% coverage)
            INSERT INTO billing_orders (
                order_number,
                encounter_id,
                visit_id,
                patient_id,
                total_amount,
                net_amount,
                nhis_covered,
                nhis_percentage,
                nhis_payable,
                patient_payable,
                status,
                source_module,
                payment_method,
                paid_amount,
                balance_amount,
                created_at,
                updated_at
            ) VALUES (
                v_order_number,
                v_encounter_id,
                v_encounter_id,
                v_queue.patient_id,
                0,
                0,
                TRUE,
                100,
                0,
                0,
                'Paid_NHIS',
                'consultation',
                'NHIS'::payment_method,
                0,
                0,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_billing_order_id;
            
            -- Add billing item with proper clinic-based service name
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
                nhis_percentage,
                nhis_payable,
                patient_payable,
                status
            ) VALUES (
                v_billing_order_id,
                'Consultation',
                COALESCE(v_clinic.clinic_name, 'General') || ' - Consultation',
                COALESCE(v_clinic.clinic_name, 'General') || ' - Consultation',
                1,
                0,
                0,
                0,
                0,
                TRUE,
                100,
                0,
                0,
                'Paid'
            );
            
            -- Update queue item
            UPDATE nhis_referral_queue SET
                status = 'approved',
                processed_by = v_staff_id,
                processed_at = NOW(),
                processing_notes = p_notes,
                encounter_id = v_encounter_id
            WHERE id = p_queue_id;
            
            RETURN jsonb_build_object(
                'success', true,
                'action', 'approved',
                'request_type', 'direct_internal_encounter',
                'encounter_id', v_encounter_id,
                'encounter_number', v_encounter_number,
                'billing_order_id', v_billing_order_id,
                'next_queue', 'Nursing',
                'message', 'NHIS approved. Encounter created and 100% auto-verified. Routed to Nursing Queue.'
            );
        END IF;
        
        -- EXTERNAL REFERRAL: Create encounter and route to Billing
        
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
            'verified',
            COALESCE(v_queue.chief_complaint, v_queue.clinical_basis, p_referral_reason, 'NHIS Referral')
        )
        RETURNING id INTO v_encounter_id;
        
        -- Route to BILLING queue first
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
            'Nursing',
            'Normal',
            'Waiting',
            'External NHIS Referral - 100% auto-verified. Proceed to nursing assessment.',
            NOW(),
            NOW()
        );

        -- Generate billing order number
        SELECT 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
               LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 13) AS INTEGER)), 0) + 1)::text, 4, '0')
        INTO v_order_number
        FROM billing_orders
        WHERE order_number LIKE 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';
        
        -- Create billing order (auto-verified as Paid_NHIS for 100% coverage)
        INSERT INTO billing_orders (
            order_number,
            encounter_id,
            visit_id,
            patient_id,
            total_amount,
            net_amount,
            nhis_covered,
            nhis_percentage,
            nhis_payable,
            patient_payable,
            status,
            source_module,
            payment_method,
            paid_amount,
            balance_amount,
            created_at,
            updated_at
        ) VALUES (
            v_order_number,
            v_encounter_id,
            v_encounter_id,
            v_queue.patient_id,
            0,
            0,
            TRUE,
            100,
            0,
            0,
            'Paid_NHIS',
            'consultation',
            'NHIS'::payment_method,
            0,
            0,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_billing_order_id;
        
        -- Add billing item with proper clinic-based service name
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
            nhis_percentage,
            nhis_payable,
            patient_payable,
            status
        ) VALUES (
            v_billing_order_id,
            'Consultation',
            COALESCE(v_clinic.clinic_name, 'General') || ' - Consultation (NHIS Referral)',
            COALESCE(v_clinic.clinic_name, 'General') || ' - Consultation (NHIS Referral)',
            1,
            0,
            0,
            0,
            0,
            TRUE,
            100,
            0,
            0,
            'Paid'
        );

        -- Update NHIS Profile
        UPDATE nhis_profiles
        SET status = 'active', verified_by = v_staff_id, verified_at = NOW(), updated_at = NOW()
        WHERE patient_id = v_queue.patient_id
        RETURNING id INTO v_nhis_profile_id;
        
        IF v_nhis_profile_id IS NULL THEN
            INSERT INTO nhis_profiles (
                patient_id, enrollee_id, scheme_type, provider_name, patient_origin, tariff_group, status, verified_by, verified_at
            ) VALUES (
                v_queue.patient_id,
                COALESCE(v_patient.nhis_number, 'PEND-' || v_patient.patient_id),
                CASE 
                    WHEN v_patient.insurance_type::text IN ('Military_NHIS', 'DHML') THEN 'Personnel'::nhis_scheme_type
                    WHEN v_patient.insurance_type::text IN ('Civilian_NHIS', 'GIFSHIP') THEN 'Civilian_NHIS'::nhis_scheme_type
                    ELSE 'Civilian_NHIS'::nhis_scheme_type
                END,
                v_patient.payer_info->>'scheme',
                'referred'::nhis_patient_origin,
                v_derived_tariff_group,
                'active'::nhis_profile_status,
                v_staff_id,
                NOW()
            )
            RETURNING id INTO v_nhis_profile_id;
        ELSE
            -- Also update provider_name on existing profiles if it's NULL
            UPDATE nhis_profiles
            SET provider_name = COALESCE(provider_name, v_patient.payer_info->>'scheme'),
                updated_at = NOW()
            WHERE id = v_nhis_profile_id AND (provider_name IS NULL OR provider_name = '');
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
        
        -- Update queue item
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
        
        -- Update patient
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
            'billing_order_id', v_billing_order_id,
            'next_queue', 'Nursing',
            'message', 'External NHIS referral approved. 100% auto-verified. Patient routed to Nursing Queue.'
        );
        
    ELSIF p_action = 'reject' THEN
        UPDATE nhis_referral_queue SET
            status = 'rejected',
            processed_by = v_staff_id,
            processed_at = NOW(),
            processing_notes = p_notes,
            rejection_reason = p_rejection_reason
        WHERE id = p_queue_id;
        
        IF v_is_internal_referral AND v_queue.clinical_request_id IS NOT NULL THEN
            UPDATE clinical_requests
            SET nhis_approval_status = 'rejected', status = 'Rejected', referral_workflow_status = 'Cancelled', updated_at = NOW()
            WHERE id = v_queue.clinical_request_id;
        END IF;
        
        UPDATE patients SET referral_status = 'Cancelled'::referral_status_enum, updated_at = NOW()
        WHERE id = v_queue.patient_id;
        
        v_result := jsonb_build_object('success', true, 'action', 'rejected', 'message', 'NHIS referral rejected');
    ELSE
        v_result := jsonb_build_object('success', false, 'error', 'Invalid action');
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_nhis_referral_queue TO authenticated;
GRANT EXECUTE ON FUNCTION process_nhis_referral_queue TO service_role;

-- Add clinical_request_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'clinical_request_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN clinical_request_id uuid REFERENCES clinical_requests(id);
    END IF;
END $$;

-- Success message
SELECT 'SUCCESS: process_nhis_referral_queue function has been updated!' as result;
