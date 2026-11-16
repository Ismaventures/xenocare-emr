-- =============================================================================
-- NDC EMR - SPECIALTY DEPARTMENTS AND CLINICS
-- Description: Add Dental, Ophthalmology, Physiotherapy departments and clinics
-- =============================================================================

-- =============================================================================
-- ADD SPECIALTY DEPARTMENTS
-- =============================================================================

INSERT INTO departments (code, name, category, description, status) VALUES
    ('DEPT013', 'Dental', 'Clinical', 'Dental and Oral Health Services', 'Active'),
    ('DEPT014', 'Ophthalmology', 'Clinical', 'Eye Care and Vision Services', 'Active'),
    ('DEPT015', 'Physiotherapy', 'Clinical', 'Physical Therapy and Rehabilitation', 'Active')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- =============================================================================
-- ADD SPECIALTY CLINICS
-- =============================================================================

DO $$
DECLARE
    dental_dept_id UUID;
    ophthal_dept_id UUID;
    physio_dept_id UUID;
BEGIN
    -- Get department IDs
    SELECT id INTO dental_dept_id FROM departments WHERE code = 'DEPT013';
    SELECT id INTO ophthal_dept_id FROM departments WHERE code = 'DEPT014';
    SELECT id INTO physio_dept_id FROM departments WHERE code = 'DEPT015';
    
    -- Dental Clinic
    IF dental_dept_id IS NOT NULL THEN
        INSERT INTO clinics (clinic_id, clinic_name, clinic_code, department_id, consultation_fee) VALUES
            ('CLN-DENTAL', 'Dental Clinic', 'DENT', dental_dept_id, 3000.00)
        ON CONFLICT (clinic_id) DO UPDATE SET 
            clinic_name = EXCLUDED.clinic_name,
            department_id = EXCLUDED.department_id;
    END IF;
    
    -- Ophthalmology/Eye Clinic
    IF ophthal_dept_id IS NOT NULL THEN
        INSERT INTO clinics (clinic_id, clinic_name, clinic_code, department_id, consultation_fee) VALUES
            ('CLN-EYE', 'Eye Clinic', 'EYE', ophthal_dept_id, 3500.00)
        ON CONFLICT (clinic_id) DO UPDATE SET 
            clinic_name = EXCLUDED.clinic_name,
            department_id = EXCLUDED.department_id;
    END IF;
    
    -- Physiotherapy Clinic
    IF physio_dept_id IS NOT NULL THEN
        INSERT INTO clinics (clinic_id, clinic_name, clinic_code, department_id, consultation_fee) VALUES
            ('CLN-PHYSIO', 'Physiotherapy Clinic', 'PHYSIO', physio_dept_id, 2500.00)
        ON CONFLICT (clinic_id) DO UPDATE SET 
            clinic_name = EXCLUDED.clinic_name,
            department_id = EXCLUDED.department_id;
    END IF;
END $$;

-- =============================================================================
-- ADD SPECIALTY REQUEST TYPE TO CLINICAL_REQUESTS
-- This enables referrals to specialty modules
-- =============================================================================

-- Add specialty_module column to track which specialty module should handle the request
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS specialty_module VARCHAR(50);

-- Add comment
COMMENT ON COLUMN clinical_requests.specialty_module IS 'Target specialty module: dental, ophthalmology, physiotherapy';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_clinical_requests_specialty ON clinical_requests(specialty_module) WHERE specialty_module IS NOT NULL;

-- =============================================================================
-- UPDATE QUEUE ROUTING FOR SPECIALTIES
-- When a referral is created to a specialty department, update queue location
-- =============================================================================

-- Function to route patient to specialty queue when referral is approved
CREATE OR REPLACE FUNCTION route_to_specialty_queue()
RETURNS TRIGGER AS $$
DECLARE
    v_dept_code VARCHAR(50);
    v_queue_location VARCHAR(50);
BEGIN
    -- Only process when status changes to Approved and it's a Referral
    IF NEW.status = 'Approved' AND NEW.request_type = 'Referral' AND OLD.status != 'Approved' THEN
        -- Get target department code
        SELECT code INTO v_dept_code 
        FROM departments 
        WHERE id = NEW.target_department_id;
        
        -- Map department to queue location
        CASE v_dept_code
            WHEN 'DEPT013' THEN v_queue_location := 'Dental';
            WHEN 'DEPT014' THEN v_queue_location := 'Ophthalmology';
            WHEN 'DEPT015' THEN v_queue_location := 'Physiotherapy';
            ELSE v_queue_location := NULL;
        END CASE;
        
        -- If it's a specialty referral, update the queue
        IF v_queue_location IS NOT NULL THEN
            -- Update the queue entry for this encounter
            UPDATE queue SET 
                location = v_queue_location::queue_location,
                status = 'Waiting',
                updated_at = NOW()
            WHERE visit_id = NEW.encounter_id
            AND status NOT IN ('Completed', 'Cancelled', 'No_Show');
            
            -- Also update specialty_module column
            NEW.specialty_module := LOWER(v_queue_location);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for specialty routing
DROP TRIGGER IF EXISTS specialty_referral_routing ON clinical_requests;
CREATE TRIGGER specialty_referral_routing
    BEFORE UPDATE ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION route_to_specialty_queue();

-- =============================================================================
-- FUNCTION: Direct route to specialty on visit creation
-- When a specialty doctor is selected, route directly to that queue
-- =============================================================================

CREATE OR REPLACE FUNCTION route_visit_to_specialty()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_dept_code VARCHAR(50);
    v_queue_location VARCHAR(50);
BEGIN
    -- Get the attending doctor's department
    IF NEW.attending_doctor_id IS NOT NULL THEN
        SELECT d.code INTO v_doctor_dept_code
        FROM staff s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = NEW.attending_doctor_id;
        
        -- Map department to queue location
        CASE v_doctor_dept_code
            WHEN 'DEPT013' THEN v_queue_location := 'Dental';
            WHEN 'DEPT014' THEN v_queue_location := 'Ophthalmology';
            WHEN 'DEPT015' THEN v_queue_location := 'Physiotherapy';
            ELSE v_queue_location := NULL;
        END CASE;
        
        -- If specialty doctor, update the queue immediately
        IF v_queue_location IS NOT NULL THEN
            -- Update queue for this visit
            UPDATE queue SET 
                location = v_queue_location::queue_location,
                status = 'Waiting',
                updated_at = NOW()
            WHERE visit_id = NEW.id
            AND status NOT IN ('Completed', 'Cancelled', 'No_Show');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for visit specialty routing
DROP TRIGGER IF EXISTS visit_specialty_routing ON visits;
CREATE TRIGGER visit_specialty_routing
    AFTER INSERT OR UPDATE OF attending_doctor_id ON visits
    FOR EACH ROW
    EXECUTE FUNCTION route_visit_to_specialty();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON departments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON clinics TO authenticated;
