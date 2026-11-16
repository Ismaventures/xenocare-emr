-- =============================================================================
-- Migration: 035_fix_patient_id_default.sql
-- Description: Ensure patient_id has proper UUID default
-- Author: System
-- Date: 2024-12-23
-- =============================================================================

-- Enable UUID extension (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alternative: Use gen_random_uuid() which is built into PostgreSQL 13+
-- This doesn't require the uuid-ossp extension

-- Update the patient_id column to use gen_random_uuid() as default
ALTER TABLE patients 
ALTER COLUMN patient_id SET DEFAULT gen_random_uuid();

-- Verify the trigger for emr_number exists
DROP TRIGGER IF EXISTS trg_generate_emr_number ON patients;
CREATE TRIGGER trg_generate_emr_number
    BEFORE INSERT ON patients
    FOR EACH ROW
    WHEN (NEW.emr_number IS NULL)
    EXECUTE FUNCTION generate_emr_number();
