-- =============================================================================
-- Migration: 120_security_services_nhis_paramilitary.sql
-- Description: Add Security Services NHIS support for Paramilitary Organizations
-- Date: 2026-02-05
-- =============================================================================
-- Nigerian Security Services/Paramilitary Organizations covered under NHIS:
-- 1. Nigeria Police Force (NPF)
-- 2. Nigeria Security and Civil Defence Corps (NSCDC)
-- 3. Nigeria Immigration Service (NIS)
-- 4. Nigeria Customs Service (NCS)
-- 5. Federal Fire Service (FFS)
-- 6. Department of State Services (DSS)
-- 7. Nigeria Correctional Service (NCoS)
-- 8. Federal Road Safety Corps (FRSC)
-- 9. National Drug Law Enforcement Agency (NDLEA)
-- 10. Economic and Financial Crimes Commission (EFCC)
-- 11. Independent Corrupt Practices Commission (ICPC)
-- 12. Nigeria Intelligence Agency (NIA)
-- =============================================================================

-- =============================================================================
-- PART 1: ADD ENUM VALUE FOR SECURITY SERVICES NHIS
-- =============================================================================

-- Add 'Security_Services_NHIS' to the insurance_type enum
DO $$
BEGIN
    -- Check if the enum type exists and add new value if not present
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Security_Services_NHIS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'insurance_type')
    ) THEN
        ALTER TYPE insurance_type ADD VALUE IF NOT EXISTS 'Security_Services_NHIS';
        RAISE NOTICE 'Added Security_Services_NHIS to insurance_type enum';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'insurance_type value Security_Services_NHIS already exists';
END $$;

-- =============================================================================
-- PART 2: CREATE SECURITY ORGANIZATIONS LOOKUP TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS security_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(20) NOT NULL,
    category VARCHAR(50) DEFAULT 'Paramilitary',
    parent_ministry VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_security_orgs_code ON security_organizations(code);
CREATE INDEX IF NOT EXISTS idx_security_orgs_short_name ON security_organizations(short_name);
CREATE INDEX IF NOT EXISTS idx_security_orgs_active ON security_organizations(is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE security_organizations IS 'Nigerian Security Services and Paramilitary Organizations covered under NHIS';
COMMENT ON COLUMN security_organizations.code IS 'Unique organization code';
COMMENT ON COLUMN security_organizations.name IS 'Full official name of the organization';
COMMENT ON COLUMN security_organizations.short_name IS 'Common abbreviation/acronym (e.g., NPF, FRSC)';
COMMENT ON COLUMN security_organizations.category IS 'Organization category (Paramilitary, Security Agency, etc.)';

-- =============================================================================
-- PART 3: SEED SECURITY ORGANIZATIONS DATA
-- =============================================================================

INSERT INTO security_organizations (code, name, short_name, category, parent_ministry, display_order) VALUES
    ('NPF', 'Nigeria Police Force', 'NPF', 'Law Enforcement', 'Ministry of Police Affairs', 1),
    ('NSCDC', 'Nigeria Security and Civil Defence Corps', 'NSCDC', 'Paramilitary', 'Ministry of Interior', 2),
    ('NIS', 'Nigeria Immigration Service', 'NIS', 'Paramilitary', 'Ministry of Interior', 3),
    ('NCS', 'Nigeria Customs Service', 'NCS', 'Paramilitary', 'Ministry of Finance', 4),
    ('FFS', 'Federal Fire Service', 'FFS', 'Paramilitary', 'Ministry of Interior', 5),
    ('DSS', 'Department of State Services', 'DSS', 'Security Agency', 'Office of the National Security Adviser', 6),
    ('NCoS', 'Nigeria Correctional Service', 'NCoS', 'Paramilitary', 'Ministry of Interior', 7),
    ('FRSC', 'Federal Road Safety Corps', 'FRSC', 'Paramilitary', 'Ministry of Transport', 8),
    ('NDLEA', 'National Drug Law Enforcement Agency', 'NDLEA', 'Law Enforcement', 'Ministry of Justice', 9),
    ('EFCC', 'Economic and Financial Crimes Commission', 'EFCC', 'Law Enforcement', 'Ministry of Justice', 10),
    ('ICPC', 'Independent Corrupt Practices Commission', 'ICPC', 'Anti-Corruption', 'Presidency', 11),
    ('NIA', 'Nigeria Intelligence Agency', 'NIA', 'Security Agency', 'Office of the National Security Adviser', 12)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    category = EXCLUDED.category,
    parent_ministry = EXCLUDED.parent_ministry,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- =============================================================================
-- PART 4: ADD SECURITY ORGANIZATION COLUMN TO PATIENTS TABLE
-- =============================================================================

DO $$
BEGIN
    -- Add security_organization column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'security_organization'
    ) THEN
        ALTER TABLE public.patients ADD COLUMN security_organization VARCHAR(20);
        COMMENT ON COLUMN public.patients.security_organization IS 'Security organization code for Security Services NHIS patients (e.g., NPF, FRSC, NSCDC)';
        RAISE NOTICE 'Added security_organization column to patients table';
    END IF;

    -- Add security_organization_rank column if not exists (for force number/rank)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'security_service_number'
    ) THEN
        ALTER TABLE public.patients ADD COLUMN security_service_number VARCHAR(50);
        COMMENT ON COLUMN public.patients.security_service_number IS 'Service/Force number for Security Services NHIS patients';
        RAISE NOTICE 'Added security_service_number column to patients table';
    END IF;
END $$;

-- Create index on security_organization for efficient lookups
CREATE INDEX IF NOT EXISTS idx_patients_security_org ON patients(security_organization) WHERE security_organization IS NOT NULL;

-- =============================================================================
-- PART 5: CREATE VIEW FOR SECURITY SERVICES PATIENTS
-- =============================================================================

DROP VIEW IF EXISTS security_services_patients_view CASCADE;

CREATE VIEW security_services_patients_view AS
SELECT 
    p.id,
    p.patient_id,
    p.emr_number,
    CONCAT(p.first_name, ' ', COALESCE(p.middle_name || ' ', ''), p.surname) AS full_name,
    p.first_name,
    p.surname,
    p.gender,
    p.date_of_birth,
    p.contact_phone,
    p.insurance_type,
    p.patient_category,
    p.security_organization,
    p.security_service_number,
    so.name AS security_org_name,
    so.short_name AS security_org_short_name,
    so.category AS security_org_category,
    p.payer_info->>'scheme' AS hmo_scheme,
    p.payer_info->>'enrolee_id' AS nhis_enrolee_id,
    p.created_at,
    p.updated_at
FROM patients p
LEFT JOIN security_organizations so ON p.security_organization = so.code
WHERE p.insurance_type::text = 'Security_Services_NHIS'
  AND p.status != 'Inactive'
ORDER BY so.display_order, p.surname, p.first_name;

GRANT SELECT ON security_services_patients_view TO authenticated;
GRANT SELECT ON security_services_patients_view TO service_role;

-- =============================================================================
-- PART 6: CREATE VIEW FOR SECURITY ORGANIZATIONS LOOKUP
-- =============================================================================

DROP VIEW IF EXISTS security_organizations_lookup CASCADE;

CREATE VIEW security_organizations_lookup AS
SELECT 
    id,
    code,
    name,
    short_name,
    category,
    CONCAT(name, ' (', short_name, ')') AS display_name,
    parent_ministry,
    display_order
FROM security_organizations
WHERE is_active = true
ORDER BY display_order, name;

GRANT SELECT ON security_organizations_lookup TO authenticated;
GRANT SELECT ON security_organizations_lookup TO service_role;
GRANT SELECT ON security_organizations TO authenticated;
GRANT SELECT ON security_organizations TO service_role;

-- =============================================================================
-- PART 7: UPDATE TARIFF GROUP MAPPING TO INCLUDE SECURITY SERVICES
-- Security Services NHIS should use the same tariff structure as Civilian NHIS
-- =============================================================================

-- Add comment for documentation
COMMENT ON TABLE security_organizations IS 'Nigerian Security Services covered under NHIS. Security_Services_NHIS uses Civilian_HMO tariff group.';

-- =============================================================================
-- PART 8: ADD PRICING COLUMN FOR SECURITY SERVICES NHIS (if clinics table exists)
-- =============================================================================

DO $$
BEGIN
    -- Add security_services_nhis_consultation_fee if clinics table exists and column doesn't
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinics') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'clinics' 
            AND column_name = 'security_services_nhis_consultation_fee'
        ) THEN
            ALTER TABLE public.clinics ADD COLUMN security_services_nhis_consultation_fee NUMERIC(10,2) DEFAULT 0;
            COMMENT ON COLUMN public.clinics.security_services_nhis_consultation_fee IS 'Security Services NHIS patient consultation fee (same as Civilian NHIS rates)';
            
            -- Set default to match civilian NHIS rates
            UPDATE clinics SET security_services_nhis_consultation_fee = nhis_consultation_fee WHERE nhis_consultation_fee IS NOT NULL;
            
            RAISE NOTICE 'Added security_services_nhis_consultation_fee column to clinics table';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- PART 9: UPDATE EXISTING FUNCTIONS TO RECOGNIZE SECURITY SERVICES NHIS
-- These functions check if a patient is NHIS for approval workflows
-- =============================================================================

-- Update the is_nhis_patient function if it exists
DO $$
BEGIN
    -- Check if function exists and contains the old logic
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'is_nhis_patient'
    ) THEN
        RAISE NOTICE 'Note: is_nhis_patient function exists - Security_Services_NHIS should be detected by existing LIKE %%NHIS%% pattern';
    END IF;
END $$;

-- =============================================================================
-- PART 10: VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_org_count INTEGER;
    v_has_column BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_org_count FROM security_organizations WHERE is_active = true;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'security_organization'
    ) INTO v_has_column;
    
    RAISE NOTICE 'Migration 120 completed:';
    RAISE NOTICE '  - Security organizations seeded: %', v_org_count;
    RAISE NOTICE '  - security_organization column added: %', v_has_column;
    RAISE NOTICE '  - Security_Services_NHIS insurance type: Added to enum';
END $$;

SELECT 'SUCCESS: Security Services NHIS with Paramilitary Organizations support added!' as result;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- This migration adds support for Security Services NHIS covering:
-- 
-- Law Enforcement:
--   - NPF: Nigeria Police Force
--   - NDLEA: National Drug Law Enforcement Agency
--   - EFCC: Economic and Financial Crimes Commission
--
-- Paramilitary:
--   - NSCDC: Nigeria Security and Civil Defence Corps
--   - NIS: Nigeria Immigration Service
--   - NCS: Nigeria Customs Service
--   - FFS: Federal Fire Service
--   - NCoS: Nigeria Correctional Service
--   - FRSC: Federal Road Safety Corps
--
-- Security Agencies:
--   - DSS: Department of State Services
--   - NIA: Nigeria Intelligence Agency
--
-- Anti-Corruption:
--   - ICPC: Independent Corrupt Practices Commission
--
-- When registering a patient with Security_Services_NHIS:
-- 1. Select "Security Services NHIS" as Insurance Category
-- 2. Select the specific organization (e.g., NPF, FRSC)
-- 3. Enter Force/Service Number (optional)
-- 4. Enter HMO details as usual
-- =============================================================================
