-- Migration: Add NHIS Referral Fields to Patients Table
-- Description: Adds support for NHIS internal vs referral patients

-- Add NHIS patient source type
DO $$ BEGIN
  CREATE TYPE nhis_patient_source AS ENUM ('Internal', 'Referral');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add referral status type
DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('Active', 'Expired', 'Used', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to patients table
ALTER TABLE patients 
  ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nhis_patient_source nhis_patient_source DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS referring_facility_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referring_facility_nhis_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS referral_date DATE,
  ADD COLUMN IF NOT EXISTS referral_reason TEXT,
  ADD COLUMN IF NOT EXISTS referral_status referral_status DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS referral_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS clinical_summary TEXT;

-- Create index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_referral_code ON patients(referral_code) WHERE referral_code IS NOT NULL;

-- Create index on nhis_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_nhis_number ON patients(nhis_number) WHERE nhis_number IS NOT NULL;

-- Create index on national_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id) WHERE national_id IS NOT NULL;

-- Add constraint to ensure referral patients have required fields
ALTER TABLE patients
  ADD CONSTRAINT chk_referral_patients_have_code
  CHECK (
    nhis_patient_source != 'Referral' OR 
    (referral_code IS NOT NULL AND referring_facility_name IS NOT NULL AND referral_date IS NOT NULL)
  ) NOT VALID;

-- Comment on new columns
COMMENT ON COLUMN patients.national_id IS 'National Identification Number (NIN)';
COMMENT ON COLUMN patients.nhis_patient_source IS 'Whether patient is internal or referred from another facility';
COMMENT ON COLUMN patients.referral_code IS 'Unique referral code from the referring facility';
COMMENT ON COLUMN patients.referring_facility_name IS 'Name of the facility that referred the patient';
COMMENT ON COLUMN patients.referring_facility_nhis_id IS 'NHIS facility code of the referring hospital';
COMMENT ON COLUMN patients.referral_date IS 'Date when the referral was issued';
COMMENT ON COLUMN patients.referral_reason IS 'Reason for referral (e.g., specialist consultation)';
COMMENT ON COLUMN patients.referral_status IS 'Current status of the referral (Active, Expired, Used, Cancelled)';
COMMENT ON COLUMN patients.referral_expiry_date IS 'Date when the referral expires';
COMMENT ON COLUMN patients.clinical_summary IS 'Clinical summary from the referring facility';
