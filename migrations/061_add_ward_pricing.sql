-- Migration: Add Ward Admission Pricing
-- Version: 061
-- Date: 2026-01-07
-- Description: Adds pricing columns to wards for admission fees

-- 1. Add pricing columns to wards table
ALTER TABLE wards
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS nhis_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_nhis_covered BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 50, -- Standard NHIS copay split if applicable
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- 2. Seed mock prices for existing wards
UPDATE wards
SET
    price = CASE
        WHEN ward_type = 'icu' THEN 20000.00
        WHEN ward_type = 'maternity' THEN 7500.00
        WHEN ward_type = 'pediatric' THEN 4000.00
        ELSE 5000.00 -- General, etc.
    END,
    nhis_price = CASE
        WHEN ward_type = 'icu' THEN 10000.00
        WHEN ward_type = 'maternity' THEN 3000.00
        WHEN ward_type = 'pediatric' THEN 1500.00
        ELSE 2000.00 -- General, etc.
    END,
    is_nhis_covered = TRUE,
    nhis_percentage = CASE
        WHEN ward_type = 'icu' THEN 50
        ELSE 90 -- NHIS covers 90% usually for general
    END
WHERE facility_id IS NOT NULL;
