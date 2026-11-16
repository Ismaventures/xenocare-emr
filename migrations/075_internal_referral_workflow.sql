-- =============================================================================
-- INTERNAL REFERRAL WORKFLOW MIGRATION
-- Aligns system with standard hospital referral workflow:
-- 1. Doctor creates internal referral to specialty clinic
-- 2. Patient reports to Encounter Office / Medical Records
-- 3. Encounter Officer reviews referral, books appointment, creates new encounter
-- 4. Patient pays for new encounter
-- 5. Patient sees specialist with linked referral information
-- =============================================================================

-- =============================================================================
-- 1. ADD REFERRAL-RELATED FIELDS TO CLINICAL_REQUESTS
-- =============================================================================

-- Add fields to track referral workflow status
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS referral_workflow_status VARCHAR(50) DEFAULT 'Pending_Encounter_Office';

-- Add comment
COMMENT ON COLUMN clinical_requests.referral_workflow_status IS 
'Workflow status for referrals: Pending_Encounter_Office, Appointment_Booked, Encounter_Created, Completed, Cancelled';

-- Add appointment fields for referral scheduling
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS appointment_date DATE,
ADD COLUMN IF NOT EXISTS appointment_time TIME,
ADD COLUMN IF NOT EXISTS appointment_notes TEXT,
ADD COLUMN IF NOT EXISTS appointment_booked_by UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS appointment_booked_at TIMESTAMP WITH TIME ZONE;

-- Add new encounter reference (the encounter created for this referral)
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS referral_encounter_id UUID REFERENCES visits(id);

COMMENT ON COLUMN clinical_requests.referral_encounter_id IS 
'The new encounter created for this referral visit (distinct from the originating encounter_id)';

-- Add source clinic reference for display
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS source_clinic_id UUID REFERENCES clinics(id);

COMMENT ON COLUMN clinical_requests.source_clinic_id IS 
'The clinic where the patient was referred FROM';

-- =============================================================================
-- 2. ADD REFERRAL FIELDS TO VISITS/ENCOUNTERS TABLE
-- =============================================================================

-- Add fields to track if an encounter is from a referral
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS is_referral_encounter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_referral_id UUID REFERENCES clinical_requests(id),
ADD COLUMN IF NOT EXISTS referring_doctor_id UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS referring_clinic_id UUID REFERENCES clinics(id),
ADD COLUMN IF NOT EXISTS referral_reason TEXT,
ADD COLUMN IF NOT EXISTS referral_clinical_notes TEXT;

COMMENT ON COLUMN visits.is_referral_encounter IS 'TRUE if this encounter was created from an internal referral';
COMMENT ON COLUMN visits.source_referral_id IS 'Link to the original clinical_request referral';
COMMENT ON COLUMN visits.referring_doctor_id IS 'The doctor who made the referral';
COMMENT ON COLUMN visits.referring_clinic_id IS 'The clinic the patient was referred FROM';
COMMENT ON COLUMN visits.referral_reason IS 'The reason for the referral (copied from clinical_request)';
COMMENT ON COLUMN visits.referral_clinical_notes IS 'Clinical notes from the referring doctor';

-- =============================================================================
-- 3. CREATE INDEXES FOR REFERRAL QUERIES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinical_requests_referral_workflow 
ON clinical_requests(referral_workflow_status) 
WHERE request_type = 'Referral';

CREATE INDEX IF NOT EXISTS idx_clinical_requests_appointment_date 
ON clinical_requests(appointment_date) 
WHERE request_type = 'Referral' AND appointment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_referral_encounter 
ON visits(source_referral_id) 
WHERE is_referral_encounter = TRUE;

CREATE INDEX IF NOT EXISTS idx_visits_referring_doctor 
ON visits(referring_doctor_id) 
WHERE referring_doctor_id IS NOT NULL;

-- =============================================================================
-- 4. CREATE VIEW FOR PENDING REFERRALS (ENCOUNTER OFFICE USE)
-- =============================================================================

CREATE OR REPLACE VIEW pending_internal_referrals AS
SELECT 
    cr.id AS referral_id,
    cr.request_number AS referral_number,
    cr.created_at AS referral_date,
    cr.urgency,
    cr.specialty_module,
    cr.referral_workflow_status,
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
    -- Get clinical notes from consultation linked to the encounter
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
'View for Encounter Office to see pending internal referrals awaiting appointment booking or encounter creation';

-- =============================================================================
-- 5. CREATE VIEW FOR REFERRAL ENCOUNTERS (FOR SPECIALTY CLINICS)
-- =============================================================================

CREATE OR REPLACE VIEW referral_encounters_view AS
SELECT 
    v.id AS encounter_id,
    v.encounter_number,
    v.encounter_date,
    v.visit_type,
    v.status AS encounter_status,
    v.is_referral_encounter,
    v.referral_reason,
    v.referral_clinical_notes,
    
    -- Patient Info
    p.id AS patient_id,
    p.emr_number,
    p.first_name AS patient_first_name,
    p.middle_name AS patient_middle_name,
    p.surname AS patient_surname,
    p.date_of_birth,
    p.gender,
    
    -- Referring Doctor Info
    rd.id AS referring_doctor_id,
    rd.first_name AS referring_doctor_first_name,
    rd.last_name AS referring_doctor_last_name,
    rd.department AS referring_doctor_department,
    
    -- Source Clinic Info
    src_clinic.clinic_name AS source_clinic_name,
    src_clinic.clinic_code AS source_clinic_code,
    
    -- Destination Clinic Info
    dst_clinic.id AS destination_clinic_id,
    dst_clinic.clinic_name AS destination_clinic_name,
    
    -- Original Referral Info
    cr.id AS original_referral_id,
    cr.request_number AS original_referral_number,
    cr.created_at AS original_referral_date,
    cr.urgency AS referral_urgency,
    cr.specialty_module,
    cr.clinical_reason AS referral_clinical_reason,
    cr.notes AS referral_notes,
    
    -- Original Encounter Info (from consultation)
    orig_enc.encounter_number AS original_encounter_number,
    orig_enc.chief_complaint AS original_chief_complaint,
    orig_consult.notes AS original_consultation_notes,
    orig_consult.diagnosis AS original_diagnosis

FROM visits v
JOIN patients p ON v.patient_id = p.id
LEFT JOIN staff rd ON v.referring_doctor_id = rd.id
LEFT JOIN clinics src_clinic ON v.referring_clinic_id = src_clinic.id
LEFT JOIN clinics dst_clinic ON v.clinic_id = dst_clinic.id
LEFT JOIN clinical_requests cr ON v.source_referral_id = cr.id
LEFT JOIN visits orig_enc ON cr.encounter_id = orig_enc.id
LEFT JOIN consultations orig_consult ON orig_consult.encounter_id = orig_enc.id

WHERE v.is_referral_encounter = TRUE
ORDER BY v.encounter_date DESC, v.created_at DESC;

COMMENT ON VIEW referral_encounters_view IS 
'View for specialty clinics to see encounters that originated from internal referrals';

-- =============================================================================
-- 6. MODIFY THE SPECIALTY QUEUE ROUTING TRIGGER
-- Referrals should NOT auto-route to specialty - they go to Encounter Office first
-- =============================================================================

-- Drop the existing trigger that auto-routes referrals
DROP TRIGGER IF EXISTS specialty_referral_routing ON clinical_requests;

-- Create new trigger that routes to Encounter Office instead
CREATE OR REPLACE FUNCTION route_referral_to_encounter_office()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process new Referral requests
    IF NEW.request_type = 'Referral' AND TG_OP = 'INSERT' THEN
        -- Set initial workflow status
        NEW.referral_workflow_status := 'Pending_Encounter_Office';
        
        -- Set status to Under_Review (awaiting Encounter Office action)
        NEW.status := 'Under_Review';
        
        -- Create notification for Encounter Office (optional, can be implemented)
        -- INSERT INTO notifications ...
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER referral_to_encounter_office
    BEFORE INSERT ON clinical_requests
    FOR EACH ROW
    WHEN (NEW.request_type = 'Referral')
    EXECUTE FUNCTION route_referral_to_encounter_office();

-- =============================================================================
-- 7. FUNCTION TO CREATE REFERRAL ENCOUNTER
-- Used by Encounter Office when patient pays for the referral visit
-- =============================================================================

CREATE OR REPLACE FUNCTION create_referral_encounter(
    p_referral_id UUID,
    p_clinic_id UUID,
    p_attending_doctor_id UUID,
    p_visit_type VARCHAR DEFAULT 'Follow-up',
    p_priority VARCHAR DEFAULT 'Normal',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_referral RECORD;
    v_new_encounter_id UUID;
    v_encounter_number VARCHAR;
    v_patient_emr VARCHAR;
BEGIN
    -- Get referral details
    SELECT 
        cr.*,
        p.emr_number,
        rd.first_name AS ref_doc_first,
        rd.last_name AS ref_doc_last
    INTO v_referral
    FROM clinical_requests cr
    JOIN patients p ON cr.patient_id = p.id
    LEFT JOIN staff rd ON cr.requesting_doctor_id = rd.id
    WHERE cr.id = p_referral_id
      AND cr.request_type = 'Referral';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral not found: %', p_referral_id;
    END IF;
    
    -- Check referral hasn't already been converted
    IF v_referral.referral_encounter_id IS NOT NULL THEN
        RAISE EXCEPTION 'Referral has already been converted to encounter: %', v_referral.referral_encounter_id;
    END IF;
    
    -- Generate encounter number
    v_encounter_number := 'ENC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                          LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Create the new encounter
    INSERT INTO visits (
        patient_id,
        clinic_id,
        attending_doctor_id,
        visit_type,
        priority,
        status,
        encounter_number,
        encounter_date,
        
        -- Referral-specific fields
        is_referral_encounter,
        source_referral_id,
        referring_doctor_id,
        referring_clinic_id,
        referral_reason,
        referral_clinical_notes,
        
        -- Initial notes
        chief_complaint,
        
        created_at,
        updated_at
    ) VALUES (
        v_referral.patient_id,
        p_clinic_id,
        p_attending_doctor_id,
        p_visit_type,
        p_priority,
        'Active',
        v_encounter_number,
        CURRENT_DATE,
        
        -- Referral fields
        TRUE,
        p_referral_id,
        v_referral.requesting_doctor_id,
        v_referral.source_clinic_id,
        v_referral.clinical_reason,
        v_referral.notes,
        
        -- Chief complaint from referral reason
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
    
    RETURN v_new_encounter_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_referral_encounter IS 
'Creates a new encounter from an internal referral. Called by Encounter Office after patient payment.';

-- =============================================================================
-- 8. FUNCTION TO BOOK REFERRAL APPOINTMENT
-- Used by Encounter Office to schedule the referral visit
-- =============================================================================

CREATE OR REPLACE FUNCTION book_referral_appointment(
    p_referral_id UUID,
    p_appointment_date DATE,
    p_appointment_time TIME DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_booked_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE clinical_requests
    SET appointment_date = p_appointment_date,
        appointment_time = p_appointment_time,
        appointment_notes = p_notes,
        appointment_booked_by = p_booked_by,
        appointment_booked_at = NOW(),
        referral_workflow_status = 'Appointment_Booked',
        updated_at = NOW()
    WHERE id = p_referral_id
      AND request_type = 'Referral';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION book_referral_appointment IS 
'Books an appointment for an internal referral. Used by Encounter Office.';

-- =============================================================================
-- 9. GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT ON pending_internal_referrals TO authenticated;
GRANT SELECT ON referral_encounters_view TO authenticated;
GRANT EXECUTE ON FUNCTION create_referral_encounter TO authenticated;
GRANT EXECUTE ON FUNCTION book_referral_appointment TO authenticated;

-- =============================================================================
-- 10. UPDATE QUEUE LOCATION ENUM TO INCLUDE ENCOUNTER OFFICE
-- =============================================================================

-- Check if 'Encounter_Office' already exists in the enum, add if not
DO $$
BEGIN
    -- Try to add the value - PostgreSQL will raise an error if it already exists
    ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Encounter_Office';
EXCEPTION
    WHEN duplicate_object THEN
        -- Value already exists, do nothing
        NULL;
END $$;

-- =============================================================================
-- SUMMARY:
-- - Internal referrals now route to Encounter Office first
-- - Encounter Officers can view pending referrals via pending_internal_referrals view
-- - They can book appointments using book_referral_appointment()
-- - They can create referral encounters using create_referral_encounter()
-- - New encounters show referral info via referral_encounters_view
-- - Original auto-routing to specialty queues is disabled for referrals
-- =============================================================================
