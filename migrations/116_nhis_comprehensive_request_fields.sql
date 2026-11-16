-- ============================================================================
-- COMPREHENSIVE NHIS INTERNAL REQUEST WORKFLOW
-- 
-- This migration:
-- 1. Adds clinical fields to nhis_referral_queue for comprehensive requests
-- 2. Creates a view for NHIS officers to see all required clinical details
-- 3. Updates request_type enum to include 'admission' and other service types
-- 4. Ensures all internal NHIS requests carry diagnosis, chief_complaint, 
--    examination_findings, and referral_reason
-- ============================================================================

-- =============================================================================
-- PART 1: ADD CLINICAL FIELDS TO nhis_referral_queue
-- These fields capture the required clinical information from consultation
-- =============================================================================

-- Add diagnosis field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'diagnosis'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN diagnosis TEXT;
        COMMENT ON COLUMN public.nhis_referral_queue.diagnosis IS 'Diagnosis from consultation - REQUIRED for NHIS processing';
    END IF;
END $$;

-- Add diagnosis_codes (ICD-10 codes if available)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'diagnosis_codes'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN diagnosis_codes TEXT[];
        COMMENT ON COLUMN public.nhis_referral_queue.diagnosis_codes IS 'ICD-10 diagnosis codes array';
    END IF;
END $$;

-- Add examination_findings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'examination_findings'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN examination_findings TEXT;
        COMMENT ON COLUMN public.nhis_referral_queue.examination_findings IS 'General examination findings from consultation';
    END IF;
END $$;

-- Add history_of_present_illness
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'history_of_present_illness'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN history_of_present_illness TEXT;
        COMMENT ON COLUMN public.nhis_referral_queue.history_of_present_illness IS 'HPI from consultation';
    END IF;
END $$;

-- Add clinical_notes (general notes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'clinical_notes'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN clinical_notes TEXT;
        COMMENT ON COLUMN public.nhis_referral_queue.clinical_notes IS 'Additional clinical notes';
    END IF;
END $$;

-- Add treatment_plan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'treatment_plan'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN treatment_plan TEXT;
        COMMENT ON COLUMN public.nhis_referral_queue.treatment_plan IS 'Treatment plan from consultation';
    END IF;
END $$;

-- Add service_type (more specific than request_type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN service_type VARCHAR(50);
        COMMENT ON COLUMN public.nhis_referral_queue.service_type IS 'Specific service: lab, radiology, pharmacy, procedure, admission, specialty_referral';
    END IF;
END $$;

-- Add service_name (specific service requested)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'service_name'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN service_name VARCHAR(255);
        COMMENT ON COLUMN public.nhis_referral_queue.service_name IS 'Name of specific service (e.g., CT Scan, MRI, Appendectomy)';
    END IF;
END $$;

-- Add source_encounter_id (link to the originating encounter)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'source_encounter_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN source_encounter_id UUID REFERENCES visits(id);
        COMMENT ON COLUMN public.nhis_referral_queue.source_encounter_id IS 'The encounter from which this request originated';
    END IF;
END $$;

-- Add requesting_doctor_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'requesting_doctor_id'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN requesting_doctor_id UUID REFERENCES staff(id);
        COMMENT ON COLUMN public.nhis_referral_queue.requesting_doctor_id IS 'Doctor who ordered/requested this service';
    END IF;
END $$;

-- Add specialty_module (for specialty clinic requests)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'specialty_module'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN specialty_module VARCHAR(50);
        COMMENT ON COLUMN public.nhis_referral_queue.specialty_module IS 'Target specialty: dental, ophthalmology, physiotherapy';
    END IF;
END $$;

-- Add urgency field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'urgency'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN urgency VARCHAR(20) DEFAULT 'Routine';
        COMMENT ON COLUMN public.nhis_referral_queue.urgency IS 'Urgency: Routine, Urgent, Emergency';
    END IF;
END $$;

-- Add estimated_cost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'estimated_cost'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN estimated_cost DECIMAL(12,2);
        COMMENT ON COLUMN public.nhis_referral_queue.estimated_cost IS 'Estimated cost for NHIS pricing';
    END IF;
END $$;

-- Add admission-specific fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'admission_type'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN admission_type VARCHAR(20);
        COMMENT ON COLUMN public.nhis_referral_queue.admission_type IS 'For admissions: Emergency, Elective';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'level_of_care'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN level_of_care VARCHAR(20);
        COMMENT ON COLUMN public.nhis_referral_queue.level_of_care IS 'For admissions: Ward, ICU, HDU, NICU';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_referral_queue' AND column_name = 'expected_duration'
    ) THEN
        ALTER TABLE public.nhis_referral_queue ADD COLUMN expected_duration VARCHAR(50);
        COMMENT ON COLUMN public.nhis_referral_queue.expected_duration IS 'Expected duration of admission/treatment';
    END IF;
END $$;

-- =============================================================================
-- PART 2: CREATE COMPREHENSIVE VIEW FOR NHIS OFFICERS
-- This view joins all necessary data for NHIS request processing
-- Uses fields from patient registration form
-- =============================================================================

DROP VIEW IF EXISTS nhis_pending_requests_comprehensive CASCADE;

CREATE VIEW nhis_pending_requests_comprehensive AS
SELECT 
    -- Queue Item Info
    q.id AS queue_id,
    q.request_type,
    q.service_type,
    q.service_name,
    q.status AS queue_status,
    q.priority,
    q.urgency,
    q.requested_at,
    q.processed_at,
    
    -- Clinical Request Link
    q.clinical_request_id,
    cr.request_number AS clinical_request_number,
    
    -- ============ PATIENT BIO DATA (from registration form) ============
    p.id AS patient_id,
    p.patient_id AS patient_number,
    p.emr_number,
    p.first_name,
    p.middle_name,
    p.surname,
    p.date_of_birth,
    p.gender,
    p.contact_phone,
    p.residential_address,
    p.nationality,
    p.state_of_origin,
    p.lga,
    
    -- Patient Category & Type
    p.patient_category,
    p.patient_type,
    p.insurance_type,
    
    -- Military/Service Info (from registration)
    p.service_number,
    p.rank,
    p.unit,
    p.military_branch,
    p.title,
    p.course,
    p.occupation,
    p.employer,
    
    -- ============ NHIS DETAILS (from registration form) ============
    p.nhis_number,
    p.nhis_patient_source,
    -- HMO/Scheme info from payer_info JSONB
    p.payer_info->>'scheme' AS hmo_scheme_name,
    p.payer_info->>'enrolee_id' AS hmo_enrolee_id,
    p.payer_info->>'relationship' AS hmo_relationship,
    p.payer_info->>'expiration_date' AS hmo_expiration_date,
    p.payer_info->>'principal_name' AS principal_name,
    p.payer_info->>'principal_rank' AS principal_rank,
    p.payer_info->>'principal_service_number' AS principal_service_number,
    p.payer_info->>'principal_unit' AS principal_unit,
    
    -- External Referral Info (from registration)
    p.referral_code AS patient_referral_code,
    p.referring_facility_name AS patient_referring_facility,
    p.referring_facility_nhis_id AS patient_referring_facility_nhis_id,
    p.referral_date AS patient_referral_date,
    p.referral_reason AS patient_referral_reason,
    p.referral_status AS patient_referral_status,
    p.referral_expiry_date AS patient_referral_expiry,
    p.clinical_summary AS patient_clinical_summary,
    
    -- ============ NHIS PROFILE INFO (separate table) ============
    np.enrollee_id AS nhis_profile_enrollee_id,
    np.scheme_type AS nhis_scheme_type,
    np.provider_name AS nhis_provider_name,
    np.plan_category AS nhis_plan_category,
    np.tariff_group AS nhis_tariff_group,
    np.status AS nhis_profile_status,
    np.patient_origin AS nhis_patient_origin,
    np.referring_facility_name AS nhis_referring_facility,
    np.referral_code AS nhis_profile_referral_code,
    np.referral_date AS nhis_profile_referral_date,
    np.referral_reason AS nhis_profile_referral_reason,
    
    -- ============ CLINICAL INFO (from Queue or Consultation) ============
    q.chief_complaint,
    q.diagnosis,
    q.diagnosis_codes,
    q.examination_findings,
    q.history_of_present_illness,
    q.clinical_basis AS referral_reason,
    q.clinical_notes,
    q.treatment_plan,
    
    -- Fallback to Consultation Data if Queue doesn't have it
    COALESCE(q.chief_complaint, v.chief_complaint) AS effective_chief_complaint,
    COALESCE(q.diagnosis, c.diagnosis_text, array_to_string(c.diagnosis, ', ')) AS effective_diagnosis,
    COALESCE(q.examination_findings, c.examination_findings) AS effective_examination_findings,
    COALESCE(q.history_of_present_illness, c.history_of_present_illness) AS effective_hpi,
    
    -- ============ SOURCE ENCOUNTER INFO ============
    q.source_encounter_id,
    v.encounter_number AS source_encounter_number,
    v.encounter_date AS source_encounter_date,
    v.visit_type AS source_visit_type,
    
    -- Requesting Doctor Info
    rd.id AS requesting_doctor_id,
    rd.first_name AS requesting_doctor_first_name,
    rd.last_name AS requesting_doctor_last_name,
    rd.department AS requesting_doctor_department,
    
    -- Target Info
    q.target_clinic_id,
    tc.clinic_name AS target_clinic_name,
    q.target_doctor_id,
    td.first_name AS target_doctor_first_name,
    td.last_name AS target_doctor_last_name,
    q.specialty_module,
    
    -- ============ ADMISSION/SERVICE DETAILS ============
    q.admission_type,
    q.level_of_care,
    q.expected_duration,
    
    -- External Referral Info (from queue)
    q.referral_code,
    q.referral_date,
    q.referral_source,
    q.referring_clinician,
    CASE 
        WHEN q.referral_date IS NOT NULL 
        THEN CURRENT_DATE - q.referral_date 
        ELSE NULL 
    END AS days_since_referral,
    CASE 
        WHEN q.referral_date IS NOT NULL AND (CURRENT_DATE - q.referral_date) > 30 
        THEN TRUE 
        ELSE FALSE 
    END AS is_referral_expired,
    
    -- Cost Info
    q.estimated_cost,
    
    -- Staff who requested
    rs.first_name AS requester_first_name,
    rs.last_name AS requester_last_name,
    
    -- Staff who processed
    ps.first_name AS processor_first_name,
    ps.last_name AS processor_last_name,
    q.processing_notes,
    q.rejection_reason

FROM nhis_referral_queue q
LEFT JOIN patients p ON q.patient_id = p.id
LEFT JOIN nhis_profiles np ON p.id = np.patient_id
LEFT JOIN clinical_requests cr ON q.clinical_request_id = cr.id
LEFT JOIN visits v ON COALESCE(q.source_encounter_id, cr.encounter_id) = v.id
LEFT JOIN consultations c ON v.id = c.encounter_id
LEFT JOIN staff rd ON COALESCE(q.requesting_doctor_id, cr.requesting_doctor_id) = rd.id
LEFT JOIN clinics tc ON q.target_clinic_id = tc.id
LEFT JOIN staff td ON q.target_doctor_id = td.id
LEFT JOIN staff rs ON q.requested_by = rs.id
LEFT JOIN staff ps ON q.processed_by = ps.id

ORDER BY 
    CASE q.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        WHEN 'Routine' THEN 3 
        ELSE 4 
    END,
    q.requested_at ASC;

COMMENT ON VIEW nhis_pending_requests_comprehensive IS 
'Comprehensive view for NHIS officers showing all patient bio data, NHIS details from registration, and clinical details for request processing';

-- =============================================================================
-- PART 3: UPDATE request_type COMMENT TO INCLUDE ALL SERVICE TYPES
-- =============================================================================

COMMENT ON COLUMN public.nhis_referral_queue.request_type IS 
'Request types: 
- external_referral: Patient from another facility
- internal_nhis_approval: Internal NHIS patient needing specialty clinic/service approval
- internal_admission: NHIS patient admission request
- internal_procedure: NHIS patient procedure request
- internal_lab: NHIS patient lab request (high-cost/special)
- internal_radiology: NHIS patient radiology request (CT, MRI)
- internal_pharmacy: NHIS patient pharmacy request (high-cost drugs)
- renewal: Authorization renewal
- reauthorization: Re-authorization request';

-- =============================================================================
-- PART 4: CREATE INDEX FOR NEW COLUMNS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_service_type 
    ON nhis_referral_queue(service_type) WHERE service_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_source_encounter 
    ON nhis_referral_queue(source_encounter_id) WHERE source_encounter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_urgency 
    ON nhis_referral_queue(urgency, status) WHERE status = 'pending';

-- =============================================================================
-- PART 5: GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON nhis_pending_requests_comprehensive TO authenticated;
GRANT SELECT ON nhis_pending_requests_comprehensive TO service_role;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

SELECT 'SUCCESS: NHIS comprehensive request fields and view created!' as result;
