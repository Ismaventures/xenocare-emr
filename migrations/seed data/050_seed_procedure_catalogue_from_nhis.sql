-- Migration: Seed procedure_catalogue from nhis_procedures
-- This migration populates the procedure_catalogue table with data from nhis_procedures
-- to allow clinical_requests.procedure_catalogue_id to properly reference procedures

-- First, ensure nhis_procedures has the 'type' column (from migration 045)
ALTER TABLE nhis_procedures ADD COLUMN IF NOT EXISTS type TEXT;

-- Map NHIS procedure types to procedure_catalogue categories
-- NHIS types: General Description, Surgical, Laboratory, Radiology, Physiotherapy, etc.
-- procedure_catalogue categories: surgical, diagnostic, therapeutic, minor, major, etc.

-- Insert nhis_procedures into procedure_catalogue
-- We use the nhis_procedures.id as the procedure_catalogue.id to maintain referential integrity
INSERT INTO procedure_catalogue (
    id,
    code,
    name,
    description,
    category,
    subcategory,
    nhis_price,
    base_price,
    requires_consent,
    requires_admission,
    created_at,
    updated_at
)
SELECT 
    np.id,  -- Use same UUID so clinical_requests can reference it
    np.code,
    np.name,
    'NHIS Procedure: ' || np.name,
    -- Map NHIS type to procedure_catalogue category
    CASE 
        WHEN LOWER(COALESCE(np.type, '')) LIKE '%surgical%' OR LOWER(np.name) LIKE '%surgery%' OR LOWER(np.name) LIKE '%excision%' OR LOWER(np.name) LIKE '%resection%' THEN 'surgical'
        WHEN LOWER(COALESCE(np.type, '')) LIKE '%laborator%' OR LOWER(np.name) LIKE '%test%' OR LOWER(np.name) LIKE '%blood%' OR LOWER(np.name) LIKE '%urine%' THEN 'diagnostic'
        WHEN LOWER(COALESCE(np.type, '')) LIKE '%radiolog%' OR LOWER(np.name) LIKE '%x-ray%' OR LOWER(np.name) LIKE '%scan%' OR LOWER(np.name) LIKE '%ultrasound%' OR LOWER(np.name) LIKE '%mri%' OR LOWER(np.name) LIKE '%ct%' THEN 'diagnostic'
        WHEN LOWER(COALESCE(np.type, '')) LIKE '%physiother%' OR LOWER(np.name) LIKE '%therapy%' OR LOWER(np.name) LIKE '%rehabilitation%' THEN 'therapeutic'
        WHEN LOWER(np.name) LIKE '%injection%' OR LOWER(np.name) LIKE '%infusion%' THEN 'injection'
        WHEN LOWER(np.name) LIKE '%biopsy%' THEN 'biopsy'
        WHEN LOWER(np.name) LIKE '%endoscop%' OR LOWER(np.name) LIKE '%colonoscop%' OR LOWER(np.name) LIKE '%gastroscop%' THEN 'endoscopy'
        WHEN LOWER(np.name) LIKE '%wound%' OR LOWER(np.name) LIKE '%dressing%' OR LOWER(np.name) LIKE '%sutur%' THEN 'wound_care'
        WHEN LOWER(np.name) LIKE '%cardiac%' OR LOWER(np.name) LIKE '%heart%' OR LOWER(np.name) LIKE '%ecg%' OR LOWER(np.name) LIKE '%echo%' THEN 'cardiovascular'
        WHEN LOWER(np.name) LIKE '%ortho%' OR LOWER(np.name) LIKE '%fracture%' OR LOWER(np.name) LIKE '%bone%' OR LOWER(np.name) LIKE '%joint%' THEN 'orthopedic'
        WHEN LOWER(np.name) LIKE '%neuro%' OR LOWER(np.name) LIKE '%brain%' OR LOWER(np.name) LIKE '%spine%' THEN 'neurological'
        WHEN LOWER(np.name) LIKE '%obstetric%' OR LOWER(np.name) LIKE '%delivery%' OR LOWER(np.name) LIKE '%caesarean%' OR LOWER(np.name) LIKE '%c-section%' THEN 'obstetric'
        WHEN LOWER(np.name) LIKE '%minor%' OR LOWER(np.name) LIKE '%consultation%' OR LOWER(np.name) LIKE '%review%' THEN 'minor'
        ELSE 'other'
    END AS category,
    np.type AS subcategory,  -- Keep original NHIS type as subcategory
    np.price,  -- NHIS price
    np.price,  -- Base price (same as NHIS initially)
    -- Set requires_consent based on procedure type
    CASE 
        WHEN LOWER(COALESCE(np.type, '')) LIKE '%surgical%' OR LOWER(np.name) LIKE '%surgery%' THEN TRUE
        WHEN LOWER(np.name) LIKE '%biopsy%' OR LOWER(np.name) LIKE '%invasive%' THEN TRUE
        ELSE FALSE
    END AS requires_consent,
    -- Set requires_admission based on procedure type
    CASE 
        WHEN LOWER(COALESCE(np.type, '')) LIKE '%surgical%' AND LOWER(np.name) LIKE '%major%' THEN TRUE
        WHEN LOWER(np.name) LIKE '%admission%' OR LOWER(np.name) LIKE '%inpatient%' THEN TRUE
        ELSE FALSE
    END AS requires_admission,
    NOW(),
    NOW()
FROM nhis_procedures np
WHERE NOT EXISTS (
    -- Don't insert if already exists (idempotent)
    SELECT 1 FROM procedure_catalogue pc WHERE pc.id = np.id OR pc.code = np.code
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_procedure_catalogue_code ON procedure_catalogue(code);
CREATE INDEX IF NOT EXISTS idx_procedure_catalogue_name ON procedure_catalogue(name);
CREATE INDEX IF NOT EXISTS idx_procedure_catalogue_category ON procedure_catalogue(category);

-- Add comment
COMMENT ON TABLE procedure_catalogue IS 'Procedure catalogue seeded from NHIS procedures. IDs match nhis_procedures for referential integrity.';
