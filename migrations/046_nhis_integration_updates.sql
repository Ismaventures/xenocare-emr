-- Remove Foreign Key constraints to allow NHIS IDs
ALTER TABLE lab_requests DROP CONSTRAINT IF EXISTS lab_requests_test_id_fkey;
ALTER TABLE radiology_requests DROP CONSTRAINT IF EXISTS radiology_requests_imaging_id_fkey;

-- Create Procedure Requests table for other NHIS types
CREATE TABLE IF NOT EXISTS procedure_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id VARCHAR(50), -- Legacy
    patient_id VARCHAR(50), -- Legacy
    consultation_id UUID REFERENCES consultations(consultation_id),
    encounter_id UUID REFERENCES visits(id),
    procedure_id UUID, -- Links to nhis_procedures(id)
    
    ordered_by VARCHAR(50), -- Staff ID
    
    procedure_name TEXT,
    procedure_type TEXT,
    
    clinical_notes TEXT,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Pending',
    
    -- Results/Execution
    notes TEXT,
    performed_at TIMESTAMP WITH TIME ZONE,
    performed_by VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_procedure_requests_encounter_id ON procedure_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_procedure_requests_consultation_id ON procedure_requests(consultation_id);
