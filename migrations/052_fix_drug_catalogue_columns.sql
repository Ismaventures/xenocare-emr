-- =============================================================================
-- Migration 047: Fix Drug Catalogue - Add missing columns
-- Run this on your Supabase database to fix the "column not found in schema cache" errors
-- =============================================================================

-- Add all potentially missing columns to drug_catalogue
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_eligible BOOLEAN DEFAULT FALSE;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_percentage INTEGER DEFAULT 0;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_price DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS nhis_code VARCHAR(50);

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS is_nhis_covered BOOLEAN DEFAULT FALSE;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT TRUE;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'Unit';

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100);

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS formulation VARCHAR(100);

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(100);

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Add check constraint for nhis_percentage if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'drug_catalogue_nhis_percentage_check'
    ) THEN
        ALTER TABLE drug_catalogue 
        ADD CONSTRAINT drug_catalogue_nhis_percentage_check 
        CHECK (nhis_percentage >= 0 AND nhis_percentage <= 100);
    END IF;
EXCEPTION WHEN others THEN
    NULL; -- Ignore if constraint already exists with different name
END $$;

-- Add unit_price column if it doesn't exist (some schemas may not have it)
ALTER TABLE drug_catalogue
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) DEFAULT 0;

-- Sync selling_price from unit_price where selling_price is 0 or null (only if unit_price exists and has data)
DO $$
BEGIN
    UPDATE drug_catalogue 
    SET selling_price = unit_price 
    WHERE (selling_price IS NULL OR selling_price = 0) AND unit_price > 0;
EXCEPTION WHEN undefined_column THEN
    NULL; -- unit_price doesn't exist, skip
END $$;

-- Sync unit_cost from unit_price where unit_cost is 0 or null
DO $$
BEGIN
    UPDATE drug_catalogue 
    SET unit_cost = unit_price 
    WHERE (unit_cost IS NULL OR unit_cost = 0) AND unit_price > 0;
EXCEPTION WHEN undefined_column THEN
    NULL; -- unit_price doesn't exist, skip
END $$;

-- =============================================================================
-- IMPORTANT: After running this migration, you need to refresh the PostgREST
-- schema cache. In Supabase, this happens automatically, but may take a minute.
-- You can also restart PostgREST or call: NOTIFY pgrst, 'reload schema'
-- =============================================================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN drug_catalogue.nhis_percentage IS 'Percentage NHIS covers (0-100). E.g., 50 means NHIS pays 50%, patient pays 50%';
COMMENT ON COLUMN drug_catalogue.nhis_eligible IS 'Whether this drug is eligible for NHIS coverage';
COMMENT ON COLUMN drug_catalogue.is_controlled IS 'Whether this is a controlled substance requiring special handling';
COMMENT ON COLUMN drug_catalogue.requires_prescription IS 'Whether this drug requires a prescription to dispense';
