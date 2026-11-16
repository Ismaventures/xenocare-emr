-- Migration: Fix column reference in auto_create_nhis_approval_for_referral
-- Bug: Function referenced p.last_name but patients table uses p.surname

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
    -- FIX: Changed p.last_name to p.surname to match patients table schema
    SELECT 
        p.insurance_type,
        p.patient_category,
        p.first_name || ' ' || COALESCE(p.middle_name || ' ', '') || p.surname AS full_name,
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

COMMENT ON FUNCTION auto_create_nhis_approval_for_referral IS 
'Trigger function to auto-create NHIS approval entry for specialty referrals. Fixed p.last_name -> p.surname.';
