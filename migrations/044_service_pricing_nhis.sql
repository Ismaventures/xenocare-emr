-- =============================================================================
-- Migration: Service Pricing with NHIS Configuration
-- Add NHIS-specific pricing fields to all service catalogues
-- =============================================================================

-- Add NHIS fields to lab_test_catalogue
ALTER TABLE lab_test_catalogue
ADD COLUMN IF NOT EXISTS nhis_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS nhis_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS is_nhis_covered BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Add NHIS fields to imaging_catalogue
ALTER TABLE imaging_catalogue
ADD COLUMN IF NOT EXISTS nhis_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS nhis_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS is_nhis_covered BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Add updated_by to clinics for audit trail on consultation fee changes
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS nhis_consultation_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_follow_up_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_emergency_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Add NHIS fields to drug_catalogue for admin price management
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS nhis_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS is_nhis_covered BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0 CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Create service_price_audit table for tracking price changes
CREATE TABLE IF NOT EXISTS service_price_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(50) NOT NULL, -- 'consultation', 'lab', 'radiology', 'pharmacy'
    service_id UUID NOT NULL,
    service_name VARCHAR(255),
    field_changed VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES staff(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lab_test_nhis_covered ON lab_test_catalogue(is_nhis_covered) WHERE is_nhis_covered = TRUE;
CREATE INDEX IF NOT EXISTS idx_imaging_nhis_covered ON imaging_catalogue(is_nhis_covered) WHERE is_nhis_covered = TRUE;
CREATE INDEX IF NOT EXISTS idx_drug_nhis_covered ON drug_catalogue(is_nhis_covered) WHERE is_nhis_covered = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_price_audit_service ON service_price_audit(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_service_price_audit_changed_at ON service_price_audit(changed_at DESC);

-- Add comments
COMMENT ON COLUMN lab_test_catalogue.nhis_code IS 'NHIS tariff code for this lab test';
COMMENT ON COLUMN lab_test_catalogue.nhis_price IS 'NHIS approved price for this test (the tariff price NHIS recognizes)';
COMMENT ON COLUMN lab_test_catalogue.is_nhis_covered IS 'Whether this test is covered under NHIS';
COMMENT ON COLUMN lab_test_catalogue.nhis_percentage IS 'Percentage NHIS covers (e.g., 50 = NHIS pays 50%, patient pays 50%)';

COMMENT ON COLUMN imaging_catalogue.nhis_code IS 'NHIS tariff code for this imaging exam';
COMMENT ON COLUMN imaging_catalogue.nhis_price IS 'NHIS approved price for this exam (the tariff price NHIS recognizes)';
COMMENT ON COLUMN imaging_catalogue.is_nhis_covered IS 'Whether this exam is covered under NHIS';
COMMENT ON COLUMN imaging_catalogue.nhis_percentage IS 'Percentage NHIS covers (e.g., 50 = NHIS pays 50%, patient pays 50%)';

COMMENT ON COLUMN clinics.nhis_consultation_fee IS 'NHIS-approved consultation fee for this clinic';
COMMENT ON COLUMN clinics.nhis_follow_up_fee IS 'NHIS-approved follow-up fee for this clinic';
COMMENT ON COLUMN clinics.nhis_emergency_fee IS 'NHIS-approved emergency fee for this clinic';

COMMENT ON TABLE service_price_audit IS 'Audit trail for all service price changes';

-- Update existing lab tests to be NHIS covered by default and set NHIS price = regular price
UPDATE lab_test_catalogue 
SET 
    is_nhis_covered = TRUE, 
    nhis_price = COALESCE(price, 0)
WHERE nhis_price IS NULL;

-- Update existing imaging exams to be NHIS covered by default and set NHIS price = regular price
UPDATE imaging_catalogue 
SET 
    is_nhis_covered = TRUE, 
    nhis_price = COALESCE(price, 0)
WHERE nhis_price IS NULL;

-- Update clinics to have NHIS fees matching regular fees by default
UPDATE clinics 
SET 
    nhis_consultation_fee = COALESCE(consultation_fee, 0),
    nhis_follow_up_fee = COALESCE(follow_up_fee, 0),
    nhis_emergency_fee = COALESCE(emergency_fee, 0)
WHERE nhis_consultation_fee IS NULL OR nhis_consultation_fee = 0;

-- Update existing drugs to set NHIS price = selling price (if not already set)
UPDATE drug_catalogue 
SET 
    nhis_price = COALESCE(selling_price, unit_price, 0)
WHERE nhis_price IS NULL;

-- =============================================================================
-- DONE
-- =============================================================================
