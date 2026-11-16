-- =============================================================================
-- Migration: NHIS Full Category Coverage & Orphan Prevention
-- Version: 135
-- Date: 2026-02-11
-- Description:
--   Adds nhis_approval_status to clinical_requests and specialty tables
--   (dental_procedures, dental_prescriptions, eye_exams, eye_procedures,
--   eye_prescriptions) so NHIS approval tracking works across ALL service
--   categories. Also guards generate_nhis_claim() against creating
--   empty (zero-service) claims.
--
-- Issues Fixed:
--   1. clinical_requests has no nhis_approval_status → procedure/surgery/referral
--      queries in fetchNhisComprehensiveClaims return empty results
--   2. Specialty tables lack nhis_approval_status → updateServiceApprovalStatus
--      silently fails for dental/eye services
--   3. generate_nhis_claim() can create claims with 0 service lines (orphan)
--   4. Consultations and admissions have no NHIS tracking columns
-- =============================================================================

-- ===========================================================================
-- 1. ADD nhis_approval_status TO clinical_requests
--    (Procedure, Surgery, Referral, Admission requests)
-- ===========================================================================

ALTER TABLE clinical_requests
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE clinical_requests
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE clinical_requests
  ADD COLUMN IF NOT EXISTS billing_release_status character varying(20) 
    DEFAULT 'pending'::character varying;

-- Index for NHIS filtering on clinical_requests
CREATE INDEX IF NOT EXISTS idx_clinical_requests_nhis_status
  ON clinical_requests(nhis_approval_status) 
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

COMMENT ON COLUMN clinical_requests.nhis_approval_status IS 
  'NHIS approval status for procedures/surgery/referrals. Matches lab_requests/prescriptions/radiology_requests pattern.';
COMMENT ON COLUMN clinical_requests.nhis_approval_id IS 
  'Reference to nhis_approvals entry for this request';
COMMENT ON COLUMN clinical_requests.billing_release_status IS 
  'Whether this request has been released to billing. Values: pending, released, billed';

-- ===========================================================================
-- 2. ADD nhis_approval_status TO dental_procedures
-- ===========================================================================

ALTER TABLE dental_procedures
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE dental_procedures
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE dental_procedures
  ADD COLUMN IF NOT EXISTS billing_release_status character varying(20) 
    DEFAULT 'pending'::character varying;

CREATE INDEX IF NOT EXISTS idx_dental_procedures_nhis_status
  ON dental_procedures(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

-- ===========================================================================
-- 3. ADD nhis_approval_status TO dental_prescriptions
-- ===========================================================================

ALTER TABLE dental_prescriptions
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE dental_prescriptions
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE dental_prescriptions
  ADD COLUMN IF NOT EXISTS billing_release_status character varying(20) 
    DEFAULT 'pending'::character varying;

CREATE INDEX IF NOT EXISTS idx_dental_prescriptions_nhis_status
  ON dental_prescriptions(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

-- ===========================================================================
-- 4. ADD nhis_approval_status TO eye_exams
-- ===========================================================================

ALTER TABLE eye_exams
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE eye_exams
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE eye_exams
  ADD COLUMN IF NOT EXISTS billing_release_status character varying(20) 
    DEFAULT 'pending'::character varying;

CREATE INDEX IF NOT EXISTS idx_eye_exams_nhis_status
  ON eye_exams(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

-- ===========================================================================
-- 5. ADD nhis_approval_status TO eye_procedures
-- ===========================================================================

ALTER TABLE eye_procedures
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE eye_procedures
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE eye_procedures
  ADD COLUMN IF NOT EXISTS billing_release_status character varying(20) 
    DEFAULT 'pending'::character varying;

CREATE INDEX IF NOT EXISTS idx_eye_procedures_nhis_status
  ON eye_procedures(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

-- ===========================================================================
-- 6. ADD nhis_approval_status TO eye_prescriptions
-- ===========================================================================

ALTER TABLE eye_prescriptions
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE eye_prescriptions
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE eye_prescriptions
  ADD COLUMN IF NOT EXISTS billing_release_status character varying(20) 
    DEFAULT 'pending'::character varying;

CREATE INDEX IF NOT EXISTS idx_eye_prescriptions_nhis_status
  ON eye_prescriptions(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

-- ===========================================================================
-- 7. ADD nhis_approval_status TO consultations
--    Consultation fees are a distinct NHIS billable category
-- ===========================================================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS consultation_fee numeric(10,2);

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS nhis_consultation_fee numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_consultations_nhis_status
  ON consultations(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

COMMENT ON COLUMN consultations.consultation_fee IS 'Regular consultation fee charged';
COMMENT ON COLUMN consultations.nhis_consultation_fee IS 'NHIS tariff fee for this consultation';

-- ===========================================================================
-- 8. ADD nhis_approval_status TO admissions
--    Inpatient stays are a major NHIS billable category
-- ===========================================================================

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS nhis_approval_status public.nhis_approval_status 
    DEFAULT 'not_required'::public.nhis_approval_status;

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS nhis_approval_id uuid;

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS daily_bed_rate numeric(10,2);

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS nhis_daily_bed_rate numeric(10,2);

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS total_bed_charges numeric(12,2);

ALTER TABLE admissions
  ADD COLUMN IF NOT EXISTS nhis_total_bed_charges numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_admissions_nhis_status
  ON admissions(nhis_approval_status)
  WHERE nhis_approval_status IS NOT NULL AND nhis_approval_status <> 'not_required';

COMMENT ON COLUMN admissions.nhis_approval_status IS 'NHIS approval status for inpatient stay';
COMMENT ON COLUMN admissions.daily_bed_rate IS 'Daily bed/ward charge';
COMMENT ON COLUMN admissions.nhis_daily_bed_rate IS 'NHIS tariff daily bed/ward rate';
COMMENT ON COLUMN admissions.total_bed_charges IS 'Total accumulated bed charges';
COMMENT ON COLUMN admissions.nhis_total_bed_charges IS 'Total NHIS-covered bed charges';

-- ===========================================================================
-- 9. GUARD generate_nhis_claim() AGAINST EMPTY CLAIMS
--    Prevent orphan claims with zero service lines
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.generate_nhis_claim(p_encounter_id uuid, p_created_by uuid) 
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_encounter RECORD;
    v_profile RECORD;
    v_claim_id UUID;
    v_claim_number VARCHAR(50);
    v_service_lines JSONB := '[]'::JSONB;
    v_total_tariff DECIMAL(12,2) := 0;
    v_claimable DECIMAL(12,2) := 0;
    v_patient_pay DECIMAL(12,2) := 0;
    v_line RECORD;
    v_line_count INTEGER := 0;
BEGIN
    -- Get encounter
    SELECT * INTO v_encounter FROM visits WHERE id = p_encounter_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not found');
    END IF;
    
    -- Check encounter is NHIS verified
    IF v_encounter.nhis_verification_status NOT IN ('verified', 'emergency_override') THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not verified for NHIS');
    END IF;
    
    -- Get NHIS profile
    SELECT * INTO v_profile FROM nhis_profiles WHERE patient_id = v_encounter.patient_id;
    
    -- Generate claim number
    v_claim_number := 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Collect service lines from billing_items for this encounter
    FOR v_line IN 
        SELECT bi.* FROM billing_items bi
        JOIN billing_orders bo ON bi.billing_order_id = bo.id
        WHERE bo.encounter_id = p_encounter_id AND bi.nhis_covered = TRUE
    LOOP
        v_service_lines := v_service_lines || jsonb_build_object(
            'item_id', v_line.id,
            'service_name', v_line.service_name,
            'quantity', v_line.quantity,
            'unit_price', v_line.unit_cost,
            'tariff_price', v_line.nhis_payable,
            'covered_amount', v_line.nhis_payable,
            'patient_copay', v_line.patient_payable
        );
        v_total_tariff := v_total_tariff + COALESCE(v_line.gross_amount, 0);
        v_claimable := v_claimable + COALESCE(v_line.nhis_payable, 0);
        v_patient_pay := v_patient_pay + COALESCE(v_line.patient_payable, 0);
        v_line_count := v_line_count + 1;
    END LOOP;
    
    -- GUARD: Prevent creating empty claims (orphan prevention)
    IF v_line_count = 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'No NHIS-covered billing items found for this encounter. Cannot create an empty claim.',
            'encounter_id', p_encounter_id,
            'hint', 'Ensure services have been billed with nhis_covered=true before generating a claim.'
        );
    END IF;
    
    -- Create claim
    INSERT INTO nhis_claims (
        claim_number, encounter_id, patient_id, nhis_profile_id, auth_id,
        tariff_group, provider_name, service_lines,
        total_tariff, claimable_amount, patient_pay_amount,
        includes_emergency_services, requires_post_authorization,
        status, created_by
    ) VALUES (
        v_claim_number, p_encounter_id, v_encounter.patient_id, v_profile.id, v_encounter.nhis_auth_id,
        v_encounter.nhis_tariff_group, v_profile.provider_name, v_service_lines,
        v_total_tariff, v_claimable, v_patient_pay,
        v_encounter.nhis_verification_status = 'emergency_override',
        v_encounter.requires_post_authorization,
        'pending', p_created_by
    ) RETURNING id INTO v_claim_id;
    
    -- Log audit
    INSERT INTO nhis_audit_log (
        action_type, action_description, entity_type, entity_id,
        patient_id, encounter_id, performed_by
    ) VALUES (
        'CLAIM_GENERATED', 'NHIS claim generated with ' || v_line_count || ' service line(s)', 
        'claim', v_claim_id,
        v_encounter.patient_id, p_encounter_id, p_created_by
    );
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'claim_id', v_claim_id,
        'claim_number', v_claim_number,
        'total_tariff', v_total_tariff,
        'claimable_amount', v_claimable,
        'patient_pay', v_patient_pay,
        'service_line_count', v_line_count
    );
END;
$$;

-- ===========================================================================
-- 10. ADD updateServiceApprovalStatus SUPPORT FOR clinical_requests
--     The DB function that resolves service approvals needs to know about
--     clinical_requests now having nhis_approval_status
-- ===========================================================================

-- Update the check_billing_release_allowed function to include clinical_requests
CREATE OR REPLACE FUNCTION check_nhis_approval_for_service(
    p_service_type TEXT,
    p_service_id UUID
) RETURNS public.nhis_approval_status
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_status public.nhis_approval_status;
BEGIN
    CASE p_service_type
        WHEN 'lab_request' THEN
            SELECT nhis_approval_status INTO v_status FROM lab_requests WHERE request_id = p_service_id;
        WHEN 'radiology_request' THEN
            SELECT nhis_approval_status INTO v_status FROM radiology_requests WHERE request_id = p_service_id;
        WHEN 'prescription' THEN
            SELECT nhis_approval_status INTO v_status FROM prescriptions WHERE prescription_id = p_service_id;
        WHEN 'clinical_request', 'procedure', 'surgery', 'referral' THEN
            SELECT nhis_approval_status INTO v_status FROM clinical_requests WHERE id = p_service_id;
        WHEN 'dental_procedure' THEN
            SELECT nhis_approval_status INTO v_status FROM dental_procedures WHERE procedure_id = p_service_id;
        WHEN 'dental_prescription' THEN
            SELECT nhis_approval_status INTO v_status FROM dental_prescriptions WHERE prescription_id = p_service_id;
        WHEN 'eye_exam' THEN
            SELECT nhis_approval_status INTO v_status FROM eye_exams WHERE exam_id = p_service_id;
        WHEN 'eye_procedure' THEN
            SELECT nhis_approval_status INTO v_status FROM eye_procedures WHERE procedure_id = p_service_id;
        WHEN 'eye_prescription' THEN
            SELECT nhis_approval_status INTO v_status FROM eye_prescriptions WHERE prescription_id = p_service_id;
        WHEN 'consultation' THEN
            SELECT nhis_approval_status INTO v_status FROM consultations WHERE consultation_id = p_service_id;
        WHEN 'admission' THEN
            SELECT nhis_approval_status INTO v_status FROM admissions WHERE id = p_service_id;
        ELSE
            v_status := NULL;
    END CASE;
    
    RETURN v_status;
END;
$$;

-- ===========================================================================
-- 11. AUTO-SET nhis_approval_status FOR NHIS ENCOUNTERS
--     When a clinical_request, consultation, or admission is created for 
--     an NHIS encounter, auto-set nhis_approval_status to 'pending'
-- ===========================================================================

CREATE OR REPLACE FUNCTION auto_set_nhis_status_for_encounter()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_category TEXT;
BEGIN
    -- Check if the encounter is NHIS
    SELECT payment_category INTO v_payment_category
    FROM visits 
    WHERE id = NEW.encounter_id;
    
    -- If NHIS encounter, set status to 'pending' instead of 'not_required'
    IF v_payment_category = 'NHIS' AND NEW.nhis_approval_status = 'not_required' THEN
        NEW.nhis_approval_status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to clinical_requests
DROP TRIGGER IF EXISTS trg_clinical_requests_auto_nhis ON clinical_requests;
CREATE TRIGGER trg_clinical_requests_auto_nhis
    BEFORE INSERT ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_nhis_status_for_encounter();

-- Apply to consultations
DROP TRIGGER IF EXISTS trg_consultations_auto_nhis ON consultations;
CREATE TRIGGER trg_consultations_auto_nhis
    BEFORE INSERT ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_nhis_status_for_encounter();

-- Apply to admissions
DROP TRIGGER IF EXISTS trg_admissions_auto_nhis ON admissions;
CREATE TRIGGER trg_admissions_auto_nhis
    BEFORE INSERT ON admissions
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_nhis_status_for_encounter();

-- Apply to dental_procedures
DROP TRIGGER IF EXISTS trg_dental_procedures_auto_nhis ON dental_procedures;
CREATE TRIGGER trg_dental_procedures_auto_nhis
    BEFORE INSERT ON dental_procedures
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_nhis_status_for_encounter();

-- Apply to eye_exams
DROP TRIGGER IF EXISTS trg_eye_exams_auto_nhis ON eye_exams;
CREATE TRIGGER trg_eye_exams_auto_nhis
    BEFORE INSERT ON eye_exams
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_nhis_status_for_encounter();

-- Apply to eye_procedures
DROP TRIGGER IF EXISTS trg_eye_procedures_auto_nhis ON eye_procedures;
CREATE TRIGGER trg_eye_procedures_auto_nhis
    BEFORE INSERT ON eye_procedures
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_nhis_status_for_encounter();

-- ===========================================================================
-- 12. MIGRATION COMPLETE
-- ===========================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 135_nhis_full_category_coverage completed successfully';
    RAISE NOTICE '---';
    RAISE NOTICE 'Added nhis_approval_status + nhis_approval_id + billing_release_status to:';
    RAISE NOTICE '  - clinical_requests (Procedure/Surgery/Referral/Admission requests)';
    RAISE NOTICE '  - dental_procedures';
    RAISE NOTICE '  - dental_prescriptions';
    RAISE NOTICE '  - eye_exams';
    RAISE NOTICE '  - eye_procedures';
    RAISE NOTICE '  - eye_prescriptions';
    RAISE NOTICE '  - consultations (+ consultation_fee, nhis_consultation_fee)';
    RAISE NOTICE '  - admissions (+ daily_bed_rate, nhis_daily_bed_rate, total_bed_charges, nhis_total_bed_charges)';
    RAISE NOTICE '---';
    RAISE NOTICE 'Updated generate_nhis_claim() with empty claim guard';
    RAISE NOTICE 'Created check_nhis_approval_for_service() helper function';
    RAISE NOTICE 'Created auto_set_nhis_status_for_encounter() trigger for auto NHIS detection';
END $$;
