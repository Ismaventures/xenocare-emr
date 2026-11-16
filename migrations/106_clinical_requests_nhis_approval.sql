-- ===========================================================================
-- Migration: Add NHIS Approval Fields to Clinical Requests
-- 
-- This migration adds NHIS approval workflow support to clinical_requests table
-- specifically for specialty referrals (Dental, Ophthalmology, Physiotherapy, Surgery).
-- 
-- Workflow: 
-- 1. Consultant creates specialty referral
-- 2. For NHIS patients → referral goes to NHIS queue first (nhis_approval_status = 'pending')
-- 3. NHIS officer approves/rejects
-- 4. Only after approval → referral appears in Encounter Office/Specialty queue
-- ===========================================================================

-- 1. Add NHIS approval fields to clinical_requests table
DO $$
BEGIN
    -- Add nhis_approval_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clinical_requests' 
        AND column_name = 'nhis_approval_status'
    ) THEN
        ALTER TABLE public.clinical_requests 
        ADD COLUMN nhis_approval_status text DEFAULT 'not_required'
        CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
        
        COMMENT ON COLUMN public.clinical_requests.nhis_approval_status IS 
        'NHIS approval status for referrals: not_required (private patients), pending, approved, rejected, expired';
    END IF;

    -- Add nhis_authorization_id column (links to nhis_approvals table)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clinical_requests' 
        AND column_name = 'nhis_authorization_id'
    ) THEN
        ALTER TABLE public.clinical_requests 
        ADD COLUMN nhis_authorization_id uuid REFERENCES nhis_approvals(id);
        
        COMMENT ON COLUMN public.clinical_requests.nhis_authorization_id IS 
        'Reference to nhis_approvals entry for NHIS specialty referral authorization';
    END IF;

    -- Add clinical_findings column for NHIS authorization context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clinical_requests' 
        AND column_name = 'clinical_findings'
    ) THEN
        ALTER TABLE public.clinical_requests 
        ADD COLUMN clinical_findings text;
        
        COMMENT ON COLUMN public.clinical_requests.clinical_findings IS 
        'Clinical findings to support NHIS authorization request';
    END IF;

    -- Add provisional_diagnosis column for NHIS authorization context
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clinical_requests' 
        AND column_name = 'provisional_diagnosis'
    ) THEN
        ALTER TABLE public.clinical_requests 
        ADD COLUMN provisional_diagnosis text;
        
        COMMENT ON COLUMN public.clinical_requests.provisional_diagnosis IS 
        'Provisional diagnosis to support NHIS authorization request';
    END IF;
END $$;

-- 2. Create index for NHIS approval status queries
CREATE INDEX IF NOT EXISTS idx_clinical_requests_nhis_status 
ON clinical_requests(nhis_approval_status) 
WHERE nhis_approval_status IN ('pending', 'approved');

-- 3. Create index for referral type queries with NHIS
CREATE INDEX IF NOT EXISTS idx_clinical_requests_referrals_nhis 
ON clinical_requests(request_type, specialty_module, nhis_approval_status) 
WHERE request_type = 'Referral';

-- 4. Function to auto-create NHIS approval entry for specialty referrals
CREATE OR REPLACE FUNCTION auto_create_nhis_approval_for_referral()
RETURNS TRIGGER AS $$
DECLARE
    v_is_nhis BOOLEAN := FALSE;
    v_patient_record RECORD;
    v_encounter_record RECORD;
    v_approval_id UUID;
    v_specialty_name TEXT;
BEGIN
    -- Only process Referral type requests with specialty_module set
    IF NEW.request_type != 'Referral' OR NEW.specialty_module IS NULL THEN
        NEW.nhis_approval_status := 'not_required';
        RETURN NEW;
    END IF;

    -- Get patient insurance info
    SELECT 
        p.insurance_type,
        p.patient_category,
        p.first_name || ' ' || COALESCE(p.middle_name || ' ', '') || p.last_name AS full_name,
        p.patient_id AS emr_number
    INTO v_patient_record
    FROM patients p
    WHERE p.id = NEW.patient_id;

    -- Check if patient is NHIS using insurance_type from patient registration
    -- Valid NHIS insurance types: Military_NHIS, Civilian_NHIS, GIFSHIP, DHML
    IF v_patient_record IS NOT NULL THEN
        IF v_patient_record.insurance_type IN ('Military_NHIS', 'Civilian_NHIS', 'GIFSHIP', 'DHML') THEN
            v_is_nhis := TRUE;
        END IF;
    END IF;

    -- Also check encounter payer type as fallback
    IF NOT v_is_nhis THEN
        SELECT payer_type, insurance_type INTO v_encounter_record FROM visits WHERE id = NEW.encounter_id;
        IF v_encounter_record.payer_type = 'nhis' 
           OR v_encounter_record.insurance_type IN ('Military_NHIS', 'Civilian_NHIS', 'GIFSHIP', 'DHML') THEN
            v_is_nhis := TRUE;
        END IF;
    END IF;

    -- If not NHIS, mark as not required
    IF NOT v_is_nhis THEN
        NEW.nhis_approval_status := 'not_required';
        RETURN NEW;
    END IF;

    -- For NHIS patients, set status to pending and create approval entry
    NEW.nhis_approval_status := 'pending';

    -- Determine specialty name for display
    v_specialty_name := INITCAP(NEW.specialty_module) || ' Referral';

    -- Create NHIS approval entry
    INSERT INTO nhis_approvals (
        service_request_id,
        service_type,
        service_category,
        encounter_id,
        patient_id,
        patient_emr_number,
        patient_name,
        service_name,
        service_code,
        estimated_cost,
        requested_by,
        requested_at,
        request_reason,
        clinical_justification,
        clinical_findings,
        provisional_diagnosis,
        status
    ) VALUES (
        NEW.id::text,
        NEW.specialty_module || '_referral',
        'specialty',
        NEW.encounter_id,
        NEW.patient_id,
        v_patient_record.emr_number,
        v_patient_record.full_name,
        v_specialty_name,
        'REF-' || UPPER(NEW.specialty_module),
        0, -- Referrals typically don't have a direct cost
        NEW.requesting_doctor_id,
        NOW(),
        NEW.clinical_reason,
        NEW.clinical_reason,
        NEW.clinical_findings,
        NEW.provisional_diagnosis,
        'pending'
    )
    RETURNING id INTO v_approval_id;

    -- Link the approval to the clinical request
    NEW.nhis_authorization_id := v_approval_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for auto-creating NHIS approvals on referral insert
DROP TRIGGER IF EXISTS trg_auto_nhis_approval_referral ON clinical_requests;
CREATE TRIGGER trg_auto_nhis_approval_referral
    BEFORE INSERT ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_nhis_approval_for_referral();

-- 6. Function to update clinical_request when NHIS approval is decided
CREATE OR REPLACE FUNCTION sync_clinical_request_nhis_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process specialty referral type services
    IF NEW.service_type LIKE '%_referral' AND NEW.service_request_id IS NOT NULL THEN
        -- Update the clinical_request nhis_approval_status
        UPDATE clinical_requests
        SET 
            nhis_approval_status = NEW.status,
            updated_at = NOW()
        WHERE id::text = NEW.service_request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to sync NHIS approval status back to clinical_requests
DROP TRIGGER IF EXISTS trg_sync_nhis_to_clinical_request ON nhis_approvals;
CREATE TRIGGER trg_sync_nhis_to_clinical_request
    AFTER UPDATE OF status ON nhis_approvals
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION sync_clinical_request_nhis_status();

-- 8. Add surgery_referral to NhisServiceType if not exists
-- (This ensures serviceApprovalWorkflow.ts types are consistent)
DO $$
BEGIN
    -- Add surgery_referral mapping to nhis_tariff_rules if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nhis_tariff_rules') THEN
        INSERT INTO nhis_tariff_rules (service_type, tariff_group, approval_required, is_active)
        SELECT 'surgery_referral', 'Civilian_HMO', true, true
        WHERE NOT EXISTS (
            SELECT 1 FROM nhis_tariff_rules WHERE service_type = 'surgery_referral'
        );
        
        -- Also add for Personnel tariff group
        INSERT INTO nhis_tariff_rules (service_type, tariff_group, approval_required, is_active)
        SELECT 'surgery_referral', 'Personnel', true, true
        WHERE NOT EXISTS (
            SELECT 1 FROM nhis_tariff_rules WHERE service_type = 'surgery_referral' AND tariff_group = 'Personnel'
        );
    END IF;
END $$;

-- 9. Update existing referrals for NHIS patients to have pending status
-- (This is a one-time update for any existing referrals that need NHIS approval)
-- Uses insurance_type values from patient registration: Military_NHIS, Civilian_NHIS, GIFSHIP, DHML
UPDATE clinical_requests cr
SET nhis_approval_status = 'pending'
FROM patients p
WHERE cr.patient_id = p.id
  AND cr.request_type = 'Referral'
  AND cr.specialty_module IS NOT NULL
  AND cr.nhis_approval_status = 'not_required'
  AND p.insurance_type IN ('Military_NHIS', 'Civilian_NHIS', 'GIFSHIP', 'DHML');

COMMENT ON TABLE clinical_requests IS 
'Clinical requests for admissions, procedures, surgeries, referrals, and transfers. 
Referrals for NHIS patients require NHIS approval before proceeding to Encounter Office.';
