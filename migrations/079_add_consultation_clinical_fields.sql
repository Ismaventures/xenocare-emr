-- Migration: 079_add_consultation_clinical_fields.sql
-- Description: Adds missing clinical documentation fields to consultations table
-- Fields needed for comprehensive clinical history documentation

-- =============================================================================
-- ADD MISSING CLINICAL FIELDS TO CONSULTATIONS TABLE
-- =============================================================================

-- Family History - hereditary conditions, family medical history
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS family_history TEXT;

-- Social History - lifestyle, occupation, habits, living conditions
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS social_history TEXT;

-- Review of Systems - systematic review of all body systems
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS review_of_systems TEXT;

-- Physical Examination - detailed physical exam findings (separate from examination_findings)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS physical_examination TEXT;

-- Recommendations - doctor's recommendations to patient
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS recommendations TEXT;

-- ICD-10 structured diagnosis (separate from free-text diagnosis)
-- This allows storing ICD-10 codes in a structured format
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS icd10_codes JSONB DEFAULT '[]'::jsonb;

-- =============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN consultations.family_history IS 'Family medical history including hereditary conditions';
COMMENT ON COLUMN consultations.social_history IS 'Social history including lifestyle, occupation, habits';
COMMENT ON COLUMN consultations.review_of_systems IS 'Systematic review of all body systems';
COMMENT ON COLUMN consultations.physical_examination IS 'Detailed physical examination findings';
COMMENT ON COLUMN consultations.recommendations IS 'Doctor recommendations to patient';
COMMENT ON COLUMN consultations.icd10_codes IS 'Structured ICD-10 diagnosis codes as JSON array [{code, description, type}]';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM information_schema.columns 
    WHERE table_name = 'consultations' 
    AND column_name IN ('family_history', 'social_history', 'review_of_systems', 'physical_examination', 'recommendations', 'icd10_codes');
    
    RAISE NOTICE 'Consultation clinical fields added: % of 6 new columns present', v_count;
END $$;
