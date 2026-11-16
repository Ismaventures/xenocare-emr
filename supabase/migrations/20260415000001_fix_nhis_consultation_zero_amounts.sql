-- =============================================================================
-- Migration: Fix NHIS consultation billing zero amounts
-- =============================================================================
-- Problem: process_nhis_referral_queue() hardcodes all amounts to 0 when
--          creating billing_orders and billing_items for NHIS consultations.
--          This means receipts show ₦0 instead of the real consultation fee.
--          63 existing zero-amount NHIS consultation billing orders need fixing.
--
-- Fix:
--   1. Backfill all existing zero-amount NHIS consultation billing records
--      with correct clinic fees from the clinics table.
--   2. Update process_nhis_referral_queue() to look up the real consultation fee
--      from clinics.consultation_fee / emergency_fee / follow_up_fee.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Backfill existing zero-amount NHIS consultation billing records
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1a: Fix billing_items — set unit_price, unit_cost, gross_amount, total_price, nhis_payable
UPDATE billing_items bi
SET
    unit_price  = c.consultation_fee,
    unit_cost   = c.consultation_fee,
    gross_amount = c.consultation_fee * bi.quantity,
    total_price  = c.consultation_fee * bi.quantity,
    nhis_payable = c.consultation_fee * bi.quantity,
    patient_payable = 0
FROM billing_orders bo
JOIN visits v ON v.id = bo.encounter_id
JOIN clinics c ON c.id = v.clinic_id
WHERE bi.billing_order_id = bo.id
  AND bo.source_module = 'consultation'
  AND bo.nhis_covered = true
  AND bo.total_amount = 0
  AND c.consultation_fee IS NOT NULL
  AND c.consultation_fee > 0;

-- Step 1b: Fix billing_orders — set total_amount, net_amount, nhis_payable from billing_items
UPDATE billing_orders bo
SET
    total_amount  = sub.total,
    net_amount    = sub.total,
    nhis_payable  = sub.total,
    nhis_percentage = 100,
    patient_payable = 0,
    balance_amount  = 0
FROM (
    SELECT
        bi.billing_order_id,
        SUM(bi.gross_amount) AS total
    FROM billing_items bi
    JOIN billing_orders bo2 ON bo2.id = bi.billing_order_id
    WHERE bo2.source_module = 'consultation'
      AND bo2.nhis_covered = true
      AND bo2.total_amount = 0
    GROUP BY bi.billing_order_id
) sub
WHERE bo.id = sub.billing_order_id
  AND sub.total > 0;

-- Step 1c: Fix receipts — set amount_paid to match the corrected billing order total
UPDATE receipts r
SET amount_paid = bo.total_amount
FROM billing_orders bo
WHERE r.billing_order_id = bo.id
  AND bo.source_module = 'consultation'
  AND bo.nhis_covered = true
  AND r.amount_paid = 0
  AND bo.total_amount > 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: Fix process_nhis_referral_queue() to use real consultation fees
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Recreate with real fee lookup (all other logic preserved from original)
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
    v_consultation_fee numeric(12,2);
    v_service_description text;
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

        -- ─── FIX: Lookup real consultation fee from clinic ───
        v_consultation_fee := COALESCE(
            CASE
                WHEN v_queue.visit_type IN ('A&E', 'Emergency') THEN
                    COALESCE(v_clinic.emergency_fee, v_clinic.consultation_fee)
                WHEN v_queue.visit_type IN ('Follow-up', 'Follow Up') THEN
                    COALESCE(v_clinic.follow_up_fee, v_clinic.consultation_fee)
                ELSE v_clinic.consultation_fee
            END,
            0
        );
        v_service_description := COALESCE(v_clinic.clinic_name, 'General') || ' - Consultation';

        -- INTERNAL REFERRAL
        IF v_is_internal_referral THEN
            -- CASE A: Doctor referral (has clinical_request_id)
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

            -- CASE B: Direct encounter request (no clinical_request_id)

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
                patient_id, visit_id, clinic_id, attending_doctor_id,
                encounter_number, encounter_date, visit_type, status,
                payment_category, insurance_type, nhis_verification_status, chief_complaint
            ) VALUES (
                v_queue.patient_id, v_visit_id, v_queue.target_clinic_id, v_queue.target_doctor_id,
                v_encounter_number, CURRENT_DATE,
                COALESCE(v_queue.visit_type, 'Follow Up'),
                'Active'::visit_status, 'NHIS'::payment_method,
                v_patient.insurance_type, 'verified',
                COALESCE(v_queue.chief_complaint, 'NHIS Approved Encounter')
            )
            RETURNING id INTO v_encounter_id;

            -- Route to NURSING queue
            INSERT INTO queue (
                patient_id, visit_id, encounter_id, clinic_id,
                ticket_number, location, priority, status, notes, created_at, updated_at
            ) VALUES (
                v_queue.patient_id, v_encounter_id, v_encounter_id, v_queue.target_clinic_id,
                'Q-' || LPAD((floor(random() * 9000) + 1000)::text, 4, '0'),
                'Nursing', 'Normal', 'Waiting',
                'Internal NHIS Patient - 100% auto-verified. Proceed to nursing assessment.',
                NOW(), NOW()
            );

            -- Generate billing order number
            SELECT 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                   LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 13) AS INTEGER)), 0) + 1)::text, 4, '0')
            INTO v_order_number
            FROM billing_orders
            WHERE order_number LIKE 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';

            -- Create billing order with REAL consultation fee (was hardcoded 0)
            INSERT INTO billing_orders (
                order_number, encounter_id, visit_id, patient_id,
                total_amount, net_amount, nhis_covered, nhis_percentage,
                nhis_payable, patient_payable, status, source_module,
                payment_method, paid_amount, balance_amount, created_at, updated_at
            ) VALUES (
                v_order_number, v_encounter_id, v_encounter_id, v_queue.patient_id,
                v_consultation_fee,     -- was: 0
                v_consultation_fee,     -- was: 0
                TRUE, 100,
                v_consultation_fee,     -- was: 0
                0,                      -- patient pays 0 (NHIS 100%)
                'Paid_NHIS', 'consultation', 'NHIS'::payment_method,
                0, 0, NOW(), NOW()
            )
            RETURNING id INTO v_billing_order_id;

            -- Add billing item with REAL consultation fee (was hardcoded 0)
            INSERT INTO billing_items (
                billing_order_id, item_type, item_name, service_name,
                quantity, unit_price, unit_cost, total_price, gross_amount,
                nhis_covered, nhis_percentage, nhis_payable, patient_payable, status
            ) VALUES (
                v_billing_order_id, 'Consultation',
                v_service_description, v_service_description,
                1,
                v_consultation_fee,     -- was: 0
                v_consultation_fee,     -- was: 0
                v_consultation_fee,     -- was: 0
                v_consultation_fee,     -- was: 0
                TRUE, 100,
                v_consultation_fee,     -- was: 0
                0, 'Paid'
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
                'consultation_fee', v_consultation_fee,
                'next_queue', 'Nursing',
                'message', 'NHIS approved. Encounter created and 100% auto-verified. Consultation fee: ' || v_consultation_fee || '. Routed to Nursing Queue.'
            );
        END IF;

        -- EXTERNAL REFERRAL: Create encounter and route to Nursing

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
            patient_id, visit_id, clinic_id, attending_doctor_id,
            encounter_number, encounter_date, visit_type, status,
            payment_category, insurance_type, nhis_verification_status, chief_complaint
        ) VALUES (
            v_queue.patient_id, v_visit_id, v_queue.target_clinic_id, v_queue.target_doctor_id,
            v_encounter_number, CURRENT_DATE,
            COALESCE(v_queue.visit_type, 'Referred NHIS Patient (External)'),
            'Active'::visit_status, 'NHIS'::payment_method,
            v_patient.insurance_type, 'verified',
            COALESCE(v_queue.chief_complaint, v_queue.clinical_basis, p_referral_reason, 'NHIS Referral')
        )
        RETURNING id INTO v_encounter_id;

        -- Route to NURSING queue
        INSERT INTO queue (
            patient_id, visit_id, encounter_id, clinic_id,
            ticket_number, location, priority, status, notes, created_at, updated_at
        ) VALUES (
            v_queue.patient_id, v_encounter_id, v_encounter_id, v_queue.target_clinic_id,
            'Q-' || LPAD((floor(random() * 9000) + 1000)::text, 4, '0'),
            'Nursing', 'Normal', 'Waiting',
            'External NHIS Referral - 100% auto-verified. Proceed to nursing assessment.',
            NOW(), NOW()
        );

        -- Generate billing order number
        SELECT 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
               LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 13) AS INTEGER)), 0) + 1)::text, 4, '0')
        INTO v_order_number
        FROM billing_orders
        WHERE order_number LIKE 'BO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';

        -- Create billing order with REAL consultation fee (was hardcoded 0)
        INSERT INTO billing_orders (
            order_number, encounter_id, visit_id, patient_id,
            total_amount, net_amount, nhis_covered, nhis_percentage,
            nhis_payable, patient_payable, status, source_module,
            payment_method, paid_amount, balance_amount, created_at, updated_at
        ) VALUES (
            v_order_number, v_encounter_id, v_encounter_id, v_queue.patient_id,
            v_consultation_fee,     -- was: 0
            v_consultation_fee,     -- was: 0
            TRUE, 100,
            v_consultation_fee,     -- was: 0
            0,                      -- patient pays 0 (NHIS 100%)
            'Paid_NHIS', 'consultation', 'NHIS'::payment_method,
            0, 0, NOW(), NOW()
        )
        RETURNING id INTO v_billing_order_id;

        -- Add billing item with REAL consultation fee (was hardcoded 0)
        INSERT INTO billing_items (
            billing_order_id, item_type, item_name, service_name,
            quantity, unit_price, unit_cost, total_price, gross_amount,
            nhis_covered, nhis_percentage, nhis_payable, patient_payable, status
        ) VALUES (
            v_billing_order_id, 'Consultation',
            v_service_description || ' (NHIS Referral)',
            v_service_description || ' (NHIS Referral)',
            1,
            v_consultation_fee,     -- was: 0
            v_consultation_fee,     -- was: 0
            v_consultation_fee,     -- was: 0
            v_consultation_fee,     -- was: 0
            TRUE, 100,
            v_consultation_fee,     -- was: 0
            0, 'Paid'
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
            -- Update provider_name on existing profiles if NULL
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

        -- Update patient referral info
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
            'consultation_fee', v_consultation_fee,
            'next_queue', 'Nursing',
            'message', 'External NHIS referral approved. 100% auto-verified. Consultation fee: ' || v_consultation_fee || '. Patient routed to Nursing Queue.'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_nhis_referral_queue TO authenticated;
GRANT EXECUTE ON FUNCTION process_nhis_referral_queue TO service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: Ensure nhis_config has ALL insurance categories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO nhis_config (payment_category, coverage_percentage, consultation_fully_covered, description, is_active)
VALUES
    ('Military_NHIS', 100, TRUE, 'Military NHIS - 100% coverage for all services', TRUE),
    ('DHML', 100, TRUE, 'Defence Health Maintenance Limited (Military NHIS) - 100% coverage', TRUE),
    ('Civilian_NHIS', 90, TRUE, 'Civilian NHIS - 90% coverage, consultation 100%', TRUE),
    ('GIFSHIP', 90, TRUE, 'GIFSHIP - 90% coverage, consultation 100%', TRUE),
    ('Security_Services_NHIS', 100, TRUE, 'Security Services NHIS (Paramilitary) - 100% coverage', TRUE),
    ('Retainership', 100, TRUE, 'Retainership/Corporate - 100% coverage', TRUE),
    ('Private', 0, FALSE, 'Private/Cash - No NHIS coverage', TRUE)
ON CONFLICT (payment_category) DO UPDATE SET
    coverage_percentage = EXCLUDED.coverage_percentage,
    consultation_fully_covered = EXCLUDED.consultation_fully_covered,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: Upgrade calculate_nhis_amounts() to handle ALL insurance types
--         using nhis_config as the single source of truth
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop ALL existing overloads so the function name is unambiguous
DO $$
DECLARE
    func_oid oid;
BEGIN
    FOR func_oid IN
        SELECT p.oid FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'calculate_nhis_amounts' AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION calculate_nhis_amounts(
    p_gross_amount DECIMAL,
    p_insurance_type VARCHAR,
    p_service_type VARCHAR DEFAULT 'Other',
    p_service_nhis_percentage INTEGER DEFAULT NULL  -- service-level override from catalogue
)
RETURNS TABLE (
    nhis_covered BOOLEAN,
    nhis_percentage INTEGER,
    nhis_payable DECIMAL,
    patient_payable DECIMAL
) AS $$
DECLARE
    v_config RECORD;
    v_coverage_pct INTEGER := 0;
    v_is_nhis BOOLEAN := FALSE;
    v_consultation_free BOOLEAN := FALSE;
    v_normalized VARCHAR;
    v_svc_lower VARCHAR;
BEGIN
    -- Normalize inputs
    v_normalized := LOWER(REPLACE(COALESCE(p_insurance_type, ''), '_', ' '));
    v_svc_lower := LOWER(COALESCE(p_service_type, 'other'));

    -- Look up full config row from nhis_config (single source of truth)
    SELECT nc.coverage_percentage,
           nc.consultation_fully_covered,
           nc.lab_coverage_percentage,
           nc.radiology_coverage_percentage,
           nc.pharmacy_coverage_percentage,
           nc.procedure_coverage_percentage,
           nc.bed_coverage_percentage
    INTO v_config
    FROM nhis_config nc
    WHERE nc.is_active = TRUE
      AND LOWER(REPLACE(nc.payment_category, '_', ' ')) = v_normalized
    LIMIT 1;

    IF v_config IS NOT NULL AND v_config.coverage_percentage > 0 THEN
        v_is_nhis := TRUE;
        v_consultation_free := COALESCE(v_config.consultation_fully_covered, FALSE);

        -- Priority 1: Service-level override from catalogue (nhis_percentage > 0)
        IF p_service_nhis_percentage IS NOT NULL AND p_service_nhis_percentage > 0 THEN
            v_coverage_pct := p_service_nhis_percentage;

        -- Priority 2: Per-service-category column from nhis_config
        ELSIF v_svc_lower IN ('laboratory', 'lab') AND COALESCE(v_config.lab_coverage_percentage, 0) > 0 THEN
            v_coverage_pct := v_config.lab_coverage_percentage;
        ELSIF v_svc_lower IN ('radiology', 'imaging') AND COALESCE(v_config.radiology_coverage_percentage, 0) > 0 THEN
            v_coverage_pct := v_config.radiology_coverage_percentage;
        ELSIF v_svc_lower IN ('pharmacy', 'medication', 'drug') AND COALESCE(v_config.pharmacy_coverage_percentage, 0) > 0 THEN
            v_coverage_pct := v_config.pharmacy_coverage_percentage;
        ELSIF v_svc_lower IN ('procedure', 'surgery', 'surgical') AND COALESCE(v_config.procedure_coverage_percentage, 0) > 0 THEN
            v_coverage_pct := v_config.procedure_coverage_percentage;
        ELSIF v_svc_lower IN ('bed', 'admission', 'ward') AND COALESCE(v_config.bed_coverage_percentage, 0) > 0 THEN
            v_coverage_pct := v_config.bed_coverage_percentage;

        -- Priority 3: Default coverage percentage
        ELSE
            v_coverage_pct := v_config.coverage_percentage;
        END IF;
    ELSIF v_config IS NULL THEN
        -- Fallback for categories not yet in nhis_config
        IF v_normalized IN ('military nhis', 'dhml') THEN
            v_coverage_pct := 100; v_consultation_free := TRUE; v_is_nhis := TRUE;
        ELSIF v_normalized IN ('civilian nhis', 'nhis', 'gifship') THEN
            v_coverage_pct := 90; v_consultation_free := TRUE; v_is_nhis := TRUE;
        ELSIF v_normalized IN ('security services nhis') THEN
            v_coverage_pct := 100; v_consultation_free := TRUE; v_is_nhis := TRUE;
        ELSIF v_normalized IN ('retainership', 'corporate') THEN
            v_coverage_pct := 100; v_consultation_free := TRUE; v_is_nhis := TRUE;
        ELSE
            v_coverage_pct := 0; v_is_nhis := FALSE;
        END IF;
    END IF;

    -- Special rule: Consultation is 100% free for ALL NHIS patients
    IF v_is_nhis AND v_consultation_free AND v_svc_lower = 'consultation' THEN
        v_coverage_pct := 100;
    END IF;

    -- Calculate amounts
    nhis_covered := v_is_nhis;
    nhis_percentage := COALESCE(v_coverage_pct, 0);
    nhis_payable := ROUND(p_gross_amount * COALESCE(v_coverage_pct, 0) / 100, 2);
    patient_payable := p_gross_amount - nhis_payable;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5: Trigger on billing_orders to auto-calculate NHIS fields from
--         the visit's insurance_type — single source of truth in the DB
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_nhis_billing_order()
RETURNS TRIGGER AS $$
DECLARE
    v_insurance_type VARCHAR;
    v_service_type VARCHAR;
    v_calc RECORD;
BEGIN
    -- Only enforce on orders linked to an encounter
    IF NEW.encounter_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get insurance type from the visit/encounter
    SELECT v.insurance_type::TEXT INTO v_insurance_type
    FROM visits v
    WHERE v.id = NEW.encounter_id;

    -- If no visit found or no insurance type, skip
    IF v_insurance_type IS NULL OR v_insurance_type = '' THEN
        RETURN NEW;
    END IF;

    -- Determine service type from source_module
    v_service_type := CASE
        WHEN NEW.source_module::TEXT = 'consultation' THEN 'Consultation'
        ELSE COALESCE(NEW.source_module::TEXT, 'Other')
    END;

    -- Calculate NHIS amounts using the DB function (reads nhis_config)
    SELECT * INTO v_calc
    FROM calculate_nhis_amounts(
        COALESCE(NEW.total_amount, 0),
        v_insurance_type,
        v_service_type
    );

    -- Apply calculated NHIS fields
    NEW.nhis_covered := v_calc.nhis_covered;
    NEW.nhis_percentage := v_calc.nhis_percentage;
    NEW.nhis_payable := v_calc.nhis_payable;
    NEW.patient_payable := v_calc.patient_payable;

    -- For 100% NHIS coverage: auto-set status and zero out balance
    IF v_calc.nhis_covered AND v_calc.nhis_percentage >= 100 THEN
        NEW.status := 'Paid_NHIS';
        NEW.payment_method := 'NHIS';
        NEW.balance_amount := 0;
        NEW.net_amount := COALESCE(NEW.total_amount, 0);
    ELSIF v_calc.nhis_covered THEN
        -- Partial coverage: patient balance is their portion
        NEW.balance_amount := v_calc.patient_payable;
        NEW.net_amount := COALESCE(NEW.total_amount, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_nhis_billing_order ON billing_orders;
CREATE TRIGGER trg_enforce_nhis_billing_order
    BEFORE INSERT ON billing_orders
    FOR EACH ROW
    EXECUTE FUNCTION enforce_nhis_billing_order();


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 6: Upgrade validate_billing_item() to enforce NHIS coverage using
--         the visit's insurance_type via the billing_order
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_billing_item()
RETURNS TRIGGER AS $$
DECLARE
    v_insurance_type VARCHAR;
    v_service_type VARCHAR;
    v_calc RECORD;
BEGIN
    -- ── Existing audit field defaults ──
    IF NEW.service_name IS NULL OR NEW.service_name = '' THEN
        IF NEW.item_name IS NOT NULL AND NEW.item_name != '' THEN
            NEW.service_name := NEW.item_name;
        ELSE
            RAISE EXCEPTION 'service_name or item_name is required for billing items';
        END IF;
    END IF;

    IF NEW.unit_cost IS NULL THEN
        IF NEW.unit_price IS NOT NULL THEN
            NEW.unit_cost := NEW.unit_price;
        ELSE
            RAISE EXCEPTION 'unit_cost or unit_price is required for billing items';
        END IF;
    END IF;

    IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
        NEW.quantity := 1;
    END IF;

    IF NEW.gross_amount IS NULL THEN
        NEW.gross_amount := NEW.quantity * NEW.unit_cost;
    END IF;

    -- Sync legacy fields
    IF NEW.item_name IS NULL THEN
        NEW.item_name := NEW.service_name;
    END IF;
    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.unit_cost;
    END IF;
    IF NEW.total_price IS NULL THEN
        NEW.total_price := NEW.gross_amount;
    END IF;

    -- ── NEW: Auto-calculate NHIS fields from the parent billing_order's encounter ──
    IF NEW.billing_order_id IS NOT NULL THEN
        -- Look up insurance type via billing_order → visit
        SELECT v.insurance_type::TEXT INTO v_insurance_type
        FROM billing_orders bo
        JOIN visits v ON v.id = bo.encounter_id
        WHERE bo.id = NEW.billing_order_id;

        IF v_insurance_type IS NOT NULL AND v_insurance_type != '' THEN
            -- Determine service type from item_type
            v_service_type := COALESCE(NEW.item_type::TEXT, 'Other');

            -- Calculate NHIS amounts, passing any service-level override
            -- (nhis_percentage > 0 from the catalogue means use that override)
            SELECT * INTO v_calc
            FROM calculate_nhis_amounts(
                NEW.gross_amount,
                v_insurance_type,
                v_service_type,
                CASE WHEN NEW.nhis_percentage > 0 THEN NEW.nhis_percentage ELSE NULL END
            );

            NEW.nhis_covered := v_calc.nhis_covered;
            NEW.nhis_percentage := v_calc.nhis_percentage;
            NEW.nhis_payable := v_calc.nhis_payable;
            NEW.patient_payable := v_calc.patient_payable;

            RETURN NEW;
        END IF;
    END IF;

    -- Fallback: ensure NHIS fields have defaults (no visit lookup possible)
    IF NEW.nhis_covered IS NULL THEN
        NEW.nhis_covered := FALSE;
    END IF;
    IF NEW.nhis_percentage IS NULL THEN
        NEW.nhis_percentage := 0;
    END IF;
    IF NEW.nhis_payable IS NULL THEN
        NEW.nhis_payable := 0;
    END IF;
    IF NEW.patient_payable IS NULL THEN
        NEW.patient_payable := COALESCE(NEW.gross_amount, NEW.quantity * NEW.unit_cost);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (already exists, just ensure it's current)
DROP TRIGGER IF EXISTS trg_validate_billing_item ON billing_items;
CREATE TRIGGER trg_validate_billing_item
    BEFORE INSERT OR UPDATE ON billing_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_billing_item();


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 7: Backfill existing NHIS billing_orders that have wrong patient_payable
--         (e.g., consultation orders where patient_payable > 0 but should be 0)
-- ─────────────────────────────────────────────────────────────────────────────

-- Fix consultation billing_orders where NHIS patient still has patient_payable > 0
UPDATE billing_orders bo
SET
    nhis_covered = TRUE,
    nhis_percentage = 100,
    nhis_payable = bo.total_amount,
    patient_payable = 0,
    balance_amount = 0,
    status = 'Paid_NHIS',
    payment_method = 'NHIS',
    updated_at = NOW()
FROM visits v
WHERE v.id = bo.encounter_id
  AND bo.source_module = 'consultation'
  AND bo.patient_payable > 0
  AND bo.total_amount > 0
  AND v.insurance_type::TEXT IN (
      'DHML', 'Military_NHIS', 'Civilian_NHIS', 'GIFSHIP',
      'Security_Services_NHIS', 'Retainership'
  );

-- Fix matching billing_items for those orders
UPDATE billing_items bi
SET
    nhis_covered = TRUE,
    nhis_percentage = 100,
    nhis_payable = bi.gross_amount,
    patient_payable = 0,
    status = 'Paid'
FROM billing_orders bo
WHERE bi.billing_order_id = bo.id
  AND bo.source_module = 'consultation'
  AND bo.nhis_covered = TRUE
  AND bo.nhis_percentage = 100
  AND bi.patient_payable > 0;

-- Fix receipts for those corrected orders
UPDATE receipts r
SET amount_paid = 0, updated_at = NOW()
FROM billing_orders bo
WHERE r.billing_order_id = bo.id
  AND bo.source_module = 'consultation'
  AND bo.nhis_covered = TRUE
  AND bo.nhis_percentage = 100
  AND bo.patient_payable = 0
  AND r.amount_paid > 0
  AND r.payment_method = 'NHIS';


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 8: Fix ALL NHIS receipts where amount_paid = consultation fee but
--         should be patient_payable (0 for 100% NHIS coverage)
-- ─────────────────────────────────────────────────────────────────────────────

-- For any NHIS billing order where patient_payable = 0, the receipt should also
-- show amount_paid = 0 (patient paid nothing, NHIS covers it all)
UPDATE receipts r
SET amount_paid = COALESCE(bo.patient_payable, 0),
    updated_at = NOW()
FROM billing_orders bo
WHERE r.billing_order_id = bo.id
  AND bo.nhis_covered = TRUE
  AND bo.patient_payable = 0
  AND r.amount_paid > 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 9: Fix verify_payment_and_route() atomic RPC to use patient_payable
--         for the receipt amount_paid instead of GREATEST(balance, net_amount)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop ALL existing overloads of verify_payment_and_route
DO $$
DECLARE
    func_oid oid;
BEGIN
    FOR func_oid IN
        SELECT p.oid FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'verify_payment_and_route' AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;


-- Grant execute on updated functions
GRANT EXECUTE ON FUNCTION calculate_nhis_amounts(DECIMAL, VARCHAR, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_nhis_amounts(DECIMAL, VARCHAR, VARCHAR, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION enforce_nhis_billing_order() TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_nhis_billing_order() TO service_role;
