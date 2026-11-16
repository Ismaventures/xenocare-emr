-- ============================================================================
-- AUTO-CREATE NHIS REFERRAL QUEUE WITH CLINICAL DATA
-- 
-- This migration updates the trigger to:
-- 1. For NHIS patients with Referral/Admission requests, auto-create nhis_referral_queue entry
-- 2. Pull clinical data from consultation (diagnosis, examination_findings, chief_complaint)
-- 3. Ensure NHIS officers see comprehensive clinical info for approval processing
-- ============================================================================

-- =============================================================================
-- PART 1: Create function to auto-create nhis_referral_queue for NHIS clinical requests
-- This handles Referral requests (specialty clinic referrals) and Admission requests
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_create_nhis_referral_queue_for_clinical_request()
RETURNS TRIGGER AS $$
DECLARE
    v_is_nhis BOOLEAN := FALSE;
    v_patient_record RECORD;
    v_encounter_record RECORD;
    v_consultation_record RECORD;
    v_queue_id UUID;
    v_service_type TEXT;
    v_request_type TEXT;
BEGIN
    -- Only process Referral and Admission type requests
    IF NEW.request_type NOT IN ('Referral', 'Admission') THEN
        RETURN NEW;
    END IF;

    -- Get patient insurance info
    SELECT 
        p.id,
        p.insurance_type,
        p.patient_category,
        p.first_name || ' ' || COALESCE(p.middle_name || ' ', '') || p.surname AS full_name,
        p.patient_id AS emr_number,
        p.nhis_number,
        p.nhis_patient_source
    INTO v_patient_record
    FROM patients p
    WHERE p.id = NEW.patient_id;

    -- Check if patient is NHIS
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

    -- If not NHIS, no queue entry needed
    IF NOT v_is_nhis THEN
        RETURN NEW;
    END IF;

    -- Get consultation data for this encounter (if any)
    SELECT 
        c.diagnosis,
        c.diagnosis_text,
        c.examination_findings,
        c.history_of_present_illness,
        c.complaints,
        c.treatment_plan,
        c.clinical_notes,
        v.chief_complaint
    INTO v_consultation_record
    FROM visits v
    LEFT JOIN consultations c ON c.encounter_id = v.id
    WHERE v.id = NEW.encounter_id;

    -- Determine service_type and request_type for queue
    IF NEW.request_type = 'Referral' THEN
        v_service_type := 'specialty_referral';
        v_request_type := 'internal_nhis_approval';
    ELSIF NEW.request_type = 'Admission' THEN
        v_service_type := 'admission';
        v_request_type := 'internal_admission';
    ELSE
        v_service_type := 'other';
        v_request_type := 'internal_nhis_approval';
    END IF;

    -- Create NHIS referral queue entry with clinical data
    INSERT INTO nhis_referral_queue (
        patient_id,
        request_type,
        clinical_request_id,
        status,
        priority,
        requested_by,
        requested_at,
        
        -- Clinical data from consultation
        chief_complaint,
        diagnosis,
        diagnosis_codes,
        examination_findings,
        history_of_present_illness,
        clinical_basis,
        clinical_notes,
        treatment_plan,
        
        -- Service details
        service_type,
        service_name,
        urgency,
        specialty_module,
        source_encounter_id,
        requesting_doctor_id,
        
        -- Admission-specific
        admission_type,
        level_of_care,
        expected_duration,
        
        -- Request notes
        request_notes
    ) VALUES (
        NEW.patient_id,
        v_request_type,
        NEW.id,
        'pending',
        CASE WHEN NEW.urgency = 'Emergency' THEN 'emergency' 
             WHEN NEW.urgency = 'Urgent' THEN 'urgent' 
             ELSE 'normal' END,
        NEW.requesting_doctor_id,
        NOW(),
        
        -- Clinical data
        COALESCE(v_consultation_record.chief_complaint, v_consultation_record.complaints),
        COALESCE(v_consultation_record.diagnosis_text, array_to_string(v_consultation_record.diagnosis, ', ')),
        v_consultation_record.diagnosis,
        v_consultation_record.examination_findings,
        v_consultation_record.history_of_present_illness,
        NEW.clinical_reason,  -- This is the "reason for referral/admission"
        v_consultation_record.clinical_notes,
        v_consultation_record.treatment_plan,
        
        -- Service details
        v_service_type,
        CASE 
            WHEN NEW.request_type = 'Referral' THEN INITCAP(NEW.specialty_module) || ' Referral'
            WHEN NEW.request_type = 'Admission' THEN 'Inpatient Admission'
            ELSE NEW.request_type
        END,
        NEW.urgency,
        NEW.specialty_module,
        NEW.encounter_id,
        NEW.requesting_doctor_id,
        
        -- Admission-specific
        NEW.admission_type,
        COALESCE(NEW.level_of_care, 'Ward'),
        NEW.expected_duration,
        
        -- Notes
        'Internal NHIS request for ' || v_patient_record.full_name || 
        ' - ' || NEW.request_type || 
        CASE WHEN NEW.specialty_module IS NOT NULL THEN ' (' || INITCAP(NEW.specialty_module) || ')' ELSE '' END
    )
    RETURNING id INTO v_queue_id;

    -- Update clinical request with queue link (if column exists)
    -- Note: This allows linking back from clinical_request to the queue item

    RAISE NOTICE 'Created NHIS referral queue entry % for clinical request %', v_queue_id, NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_nhis_referral_queue_for_clinical_request IS 
'Automatically creates nhis_referral_queue entries for NHIS patients with Referral or Admission requests.
Populates clinical data (diagnosis, examination_findings, chief_complaint) from the consultation.
This ensures NHIS officers have comprehensive clinical info for approval processing.';

-- =============================================================================
-- PART 2: Create the trigger
-- =============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_nhis_queue_for_clinical_request ON clinical_requests;

-- Create new trigger
CREATE TRIGGER trg_auto_nhis_queue_for_clinical_request
    AFTER INSERT ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_nhis_referral_queue_for_clinical_request();

-- =============================================================================
-- PART 3: Add index for clinical_request_id lookup (if not exists)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_clinical_request_id 
    ON nhis_referral_queue(clinical_request_id) 
    WHERE clinical_request_id IS NOT NULL;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 'SUCCESS: Auto-create NHIS referral queue with clinical data trigger installed!' as result;
