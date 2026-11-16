-- ============================================================================
-- Migration: 070_add_clinical_context_fields.sql
-- Purpose: Add diagnosis and clinical context fields to request tables
-- This enables Pharmacy, Lab, and Radiology staff to see WHY a request was made
-- ============================================================================

-- Add diagnosis field to prescriptions table
-- This stores the diagnosis/indication for the prescribed medication
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS diagnosis TEXT[];

ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS clinical_notes TEXT;

COMMENT ON COLUMN prescriptions.diagnosis IS 'Array of diagnosis/indication codes or text for why this medication was prescribed';
COMMENT ON COLUMN prescriptions.clinical_notes IS 'Clinical notes/indication explaining why this medication was prescribed';

-- Add diagnosis field to lab_requests table
-- Lab already has clinical_notes, but adding diagnosis for ICD-10 codes
ALTER TABLE lab_requests 
ADD COLUMN IF NOT EXISTS diagnosis TEXT[];

COMMENT ON COLUMN lab_requests.diagnosis IS 'Array of diagnosis/indication codes or text for why this lab test was ordered';

-- Add diagnosis field to radiology_requests table
-- Radiology already has clinical_indication and clinical_history, adding diagnosis for ICD-10
ALTER TABLE radiology_requests 
ADD COLUMN IF NOT EXISTS diagnosis TEXT[];

COMMENT ON COLUMN radiology_requests.diagnosis IS 'Array of diagnosis/indication codes or text for why this imaging was ordered';

-- Create index for searching by diagnosis
CREATE INDEX IF NOT EXISTS idx_prescriptions_diagnosis ON prescriptions USING GIN (diagnosis);
CREATE INDEX IF NOT EXISTS idx_lab_requests_diagnosis ON lab_requests USING GIN (diagnosis);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_diagnosis ON radiology_requests USING GIN (diagnosis);

-- ============================================================================
-- Done
-- ============================================================================
