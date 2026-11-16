-- =============================================================================
-- NDC Medical Centre EMR - Clinical Requests & Workflow Enhancements
-- Migration: 038_clinical_requests_workflow.sql
-- Description: Implements Clinical Requests system for proper EMR workflow
-- =============================================================================

-- 1. OPD Classification Enum
DO $$ BEGIN
    CREATE TYPE opd_classification AS ENUM ('MOPD', 'SOPD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add opd_classification to visits
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS opd_classification opd_classification;

-- 3. Add opd_type to departments
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS opd_type VARCHAR(20) 
CHECK (opd_type IN ('MOPD', 'SOPD', 'Support', 'Diagnostic', 'Administrative'));

-- 4. Patient Status - Track OPD vs In-Patient
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS current_status VARCHAR(20) DEFAULT 'OPD'
CHECK (current_status IN ('OPD', 'In-Patient', 'Discharged', 'Deceased'));

-- 5. Clinical Request Type Enum
DO $$ BEGIN
    CREATE TYPE clinical_request_type AS ENUM (
        'Follow-Up', 'Procedure', 'Surgery', 'Admission', 'Referral', 'Transfer', 'Discharge'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Clinical Request Status Enum
DO $$ BEGIN
    CREATE TYPE clinical_request_status AS ENUM (
        'Pending', 'Under_Review', 'Approved', 'Rejected', 
        'Scheduled', 'In_Progress', 'Completed', 'Cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Urgency Enum (if not exists)
DO $$ BEGIN
    CREATE TYPE clinical_urgency AS ENUM ('Routine', 'Urgent', 'Emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Clinical Requests Table - CORE ENTITY
CREATE TABLE IF NOT EXISTS clinical_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE,
    
    -- Patient & Encounter Link (Encounter-Centric)
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID NOT NULL REFERENCES visits(id),
    
    -- Requesting Doctor
    requesting_doctor_id UUID NOT NULL REFERENCES staff(id),
    requesting_department_id UUID REFERENCES departments(id),
    
    -- Request Details
    request_type clinical_request_type NOT NULL,
    clinical_reason TEXT NOT NULL,
    urgency clinical_urgency NOT NULL DEFAULT 'Routine',
    suggested_timeframe VARCHAR(100),
    notes TEXT,
    
    -- Target (where/who should handle)
    target_department_id UUID REFERENCES departments(id),
    target_ward_id UUID REFERENCES wards(id),
    target_doctor_id UUID REFERENCES staff(id),
    
    -- Admission-specific fields
    admission_type VARCHAR(20) CHECK (admission_type IN ('Emergency', 'Elective')),
    suggested_ward_type VARCHAR(50),
    level_of_care VARCHAR(20) CHECK (level_of_care IN ('Ward', 'ICU', 'HDU', 'NICU')),
    expected_duration VARCHAR(50),
    special_requirements TEXT,
    
    -- Surgery/Procedure-specific fields
    procedure_catalogue_id UUID REFERENCES procedure_catalogue(id),
    procedure_name VARCHAR(255),
    procedure_notes TEXT,
    pre_op_requirements TEXT,
    
    -- Follow-up specific fields
    follow_up_reason TEXT,
    follow_up_instructions TEXT,
    
    -- Status & Approval
    status clinical_request_status DEFAULT 'Pending',
    reviewed_by UUID REFERENCES staff(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Execution Links (filled when request is fulfilled)
    admission_id UUID REFERENCES admissions(id),
    procedure_id UUID REFERENCES procedures(id),
    referral_id UUID REFERENCES referrals(id),
    follow_up_visit_id UUID REFERENCES visits(id),
    
    -- Scheduling (Operations side)
    scheduled_date DATE,
    scheduled_time TIME,
    scheduled_by UUID REFERENCES staff(id),
    scheduling_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    
    -- Facility
    facility_id UUID REFERENCES facilities(id)
);

-- 9. Request Number Generation Sequence
CREATE SEQUENCE IF NOT EXISTS clinical_request_seq START WITH 1001;

-- 10. Function to generate request number
CREATE OR REPLACE FUNCTION generate_clinical_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                              LPAD(nextval('clinical_request_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger for request number
DROP TRIGGER IF EXISTS trg_clinical_request_number ON clinical_requests;
CREATE TRIGGER trg_clinical_request_number
    BEFORE INSERT ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION generate_clinical_request_number();

-- 12. Clinical Request Status History - Audit Trail
CREATE TABLE IF NOT EXISTS clinical_request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES clinical_requests(id) ON DELETE CASCADE,
    from_status clinical_request_status,
    to_status clinical_request_status NOT NULL,
    changed_by UUID REFERENCES staff(id),
    change_reason TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Add clinical_request_id to admissions (link admission to its request)
ALTER TABLE admissions 
ADD COLUMN IF NOT EXISTS clinical_request_id UUID REFERENCES clinical_requests(id);

-- 14. Add clinical_request_id to procedures (link procedure to its request)
ALTER TABLE procedures 
ADD COLUMN IF NOT EXISTS clinical_request_id UUID REFERENCES clinical_requests(id);

-- 15. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinical_requests_patient ON clinical_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_encounter ON clinical_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_status ON clinical_requests(status);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_type ON clinical_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_urgency ON clinical_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_date ON clinical_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_requesting_doctor ON clinical_requests(requesting_doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_target_dept ON clinical_requests(target_department_id);
CREATE INDEX IF NOT EXISTS idx_clinical_request_history_request ON clinical_request_status_history(request_id);

-- 16. RLS Policies
ALTER TABLE clinical_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_requests_select ON clinical_requests;
DROP POLICY IF EXISTS clinical_requests_insert ON clinical_requests;
DROP POLICY IF EXISTS clinical_requests_update ON clinical_requests;

CREATE POLICY clinical_requests_select ON clinical_requests FOR SELECT USING (true);
CREATE POLICY clinical_requests_insert ON clinical_requests FOR INSERT WITH CHECK (true);
CREATE POLICY clinical_requests_update ON clinical_requests FOR UPDATE USING (true);

DROP POLICY IF EXISTS clinical_request_history_select ON clinical_request_status_history;
DROP POLICY IF EXISTS clinical_request_history_insert ON clinical_request_status_history;

CREATE POLICY clinical_request_history_select ON clinical_request_status_history FOR SELECT USING (true);
CREATE POLICY clinical_request_history_insert ON clinical_request_status_history FOR INSERT WITH CHECK (true);

-- 17. Update timestamp trigger
DROP TRIGGER IF EXISTS trg_clinical_requests_updated_at ON clinical_requests;
CREATE TRIGGER trg_clinical_requests_updated_at
    BEFORE UPDATE ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 18. Function to track status changes
CREATE OR REPLACE FUNCTION track_clinical_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO clinical_request_status_history (
            request_id,
            from_status,
            to_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.reviewed_by,
            NEW.review_notes
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinical_request_status_change ON clinical_requests;
CREATE TRIGGER trg_clinical_request_status_change
    AFTER UPDATE ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION track_clinical_request_status_change();

-- 19. Function to update patient status when admission is approved
CREATE OR REPLACE FUNCTION update_patient_status_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    -- When admission is created, update patient status to In-Patient
    IF TG_OP = 'INSERT' THEN
        UPDATE patients 
        SET current_status = 'In-Patient',
            updated_at = NOW()
        WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admission_patient_status ON admissions;
CREATE TRIGGER trg_admission_patient_status
    AFTER INSERT ON admissions
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_status_on_admission();

-- 20. Function to update patient status on discharge
CREATE OR REPLACE FUNCTION update_patient_status_on_discharge()
RETURNS TRIGGER AS $$
BEGIN
    -- When admission status changes to Discharged, update patient
    IF NEW.admission_status = 'Discharged' AND (OLD.admission_status IS NULL OR OLD.admission_status != 'Discharged') THEN
        UPDATE patients 
        SET current_status = 'Discharged',
            updated_at = NOW()
        WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_discharge_patient_status ON admissions;
CREATE TRIGGER trg_discharge_patient_status
    AFTER UPDATE ON admissions
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_status_on_discharge();

-- 21. View for pending requests (Operations Dashboard)
CREATE OR REPLACE VIEW pending_clinical_requests AS
SELECT 
    cr.id,
    cr.request_number,
    cr.request_type,
    cr.clinical_reason,
    cr.urgency,
    cr.status,
    cr.suggested_timeframe,
    cr.admission_type,
    cr.level_of_care,
    cr.procedure_name,
    cr.scheduled_date,
    cr.scheduled_time,
    cr.created_at,
    cr.notes,
    -- Patient Info
    cr.patient_id,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    p.contact_phone AS patient_phone,
    -- Requesting Doctor
    cr.requesting_doctor_id,
    doc.first_name || ' ' || doc.last_name AS requesting_doctor_name,
    -- Departments
    cr.requesting_department_id,
    dept.name AS requesting_department_name,
    cr.target_department_id,
    target_dept.name AS target_department_name,
    -- Ward
    cr.target_ward_id,
    target_ward.name AS target_ward_name,
    -- Encounter
    cr.encounter_id,
    v.visit_id AS encounter_number
FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
JOIN visits v ON cr.encounter_id = v.id
LEFT JOIN staff doc ON cr.requesting_doctor_id = doc.id
LEFT JOIN departments dept ON cr.requesting_department_id = dept.id
LEFT JOIN departments target_dept ON cr.target_department_id = target_dept.id
LEFT JOIN wards target_ward ON cr.target_ward_id = target_ward.id
WHERE cr.status IN ('Pending', 'Under_Review')
ORDER BY 
    CASE cr.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        ELSE 3 
    END,
    cr.created_at ASC;

-- 22. View for admission requests specifically
CREATE OR REPLACE VIEW admission_requests_view AS
SELECT 
    cr.*,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    p.patient_category,
    p.insurance_type,
    doc.first_name || ' ' || doc.last_name AS requesting_doctor_name,
    dept.name AS requesting_department_name,
    target_ward.name AS suggested_ward_name,
    target_ward.ward_type,
    target_ward.available_beds
FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
LEFT JOIN staff doc ON cr.requesting_doctor_id = doc.id
LEFT JOIN departments dept ON cr.requesting_department_id = dept.id
LEFT JOIN wards target_ward ON cr.target_ward_id = target_ward.id
WHERE cr.request_type = 'Admission'
ORDER BY 
    CASE cr.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        ELSE 3 
    END,
    cr.created_at ASC;

-- 23. View for procedure/surgery requests
CREATE OR REPLACE VIEW procedure_requests_view AS
SELECT 
    cr.*,
    p.first_name || ' ' || p.surname AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    doc.first_name || ' ' || doc.last_name AS requesting_doctor_name,
    dept.name AS requesting_department_name,
    pc.name AS catalogue_procedure_name,
    pc.code AS procedure_code,
    pc.category AS procedure_category
FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
LEFT JOIN staff doc ON cr.requesting_doctor_id = doc.id
LEFT JOIN departments dept ON cr.requesting_department_id = dept.id
LEFT JOIN procedure_catalogue pc ON cr.procedure_catalogue_id = pc.id
WHERE cr.request_type IN ('Procedure', 'Surgery')
ORDER BY 
    CASE cr.urgency 
        WHEN 'Emergency' THEN 1 
        WHEN 'Urgent' THEN 2 
        ELSE 3 
    END,
    cr.scheduled_date ASC NULLS LAST,
    cr.created_at ASC;

-- 24. View for request statistics
CREATE OR REPLACE VIEW clinical_request_stats AS
SELECT 
    request_type,
    status,
    urgency,
    COUNT(*) as count,
    DATE(created_at) as request_date
FROM clinical_requests
GROUP BY request_type, status, urgency, DATE(created_at);

-- 25. Update departments with default OPD types
UPDATE departments SET opd_type = 'MOPD' WHERE name ILIKE '%general%' OR name ILIKE '%family%' OR name ILIKE '%primary%';
UPDATE departments SET opd_type = 'SOPD' WHERE name ILIKE '%surgery%' OR name ILIKE '%cardio%' OR name ILIKE '%neuro%' OR name ILIKE '%ortho%' OR name ILIKE '%pediatric%' OR name ILIKE '%gynae%' OR name ILIKE '%ent%' OR name ILIKE '%ophth%';
UPDATE departments SET opd_type = 'Diagnostic' WHERE name ILIKE '%lab%' OR name ILIKE '%radiology%' OR name ILIKE '%imaging%';
UPDATE departments SET opd_type = 'Support' WHERE name ILIKE '%pharmacy%' OR name ILIKE '%nursing%';
UPDATE departments SET opd_type = 'Administrative' WHERE name ILIKE '%admin%' OR name ILIKE '%billing%' OR name ILIKE '%records%';

-- 26. Grant permissions
GRANT ALL ON clinical_requests TO authenticated;
GRANT ALL ON clinical_request_status_history TO authenticated;
GRANT USAGE ON SEQUENCE clinical_request_seq TO authenticated;

COMMENT ON TABLE clinical_requests IS 'Central table for all clinical requests - Admission, Procedure, Surgery, Referral, Follow-up, Discharge';
COMMENT ON TABLE clinical_request_status_history IS 'Audit trail for clinical request status changes';
