-- =============================================================================
-- Migration: Fix Payer/HMO Field Mapping
-- Version: 136
-- Date: 2026-02-11
-- Description:
--   The payer_info JSONB on the patients table stores HMO name in the "scheme"
--   key (set from nhis_hmos dropdown during registration), but the DB trigger
--   populate_nhis_claim_payer_info() was reading non-existent keys "hmo_name" 
--   and "payer_name". Also, process_nhis_referral_queue() never set 
--   nhis_profiles.provider_name, leaving it NULL/empty for all profiles.
--
-- Actual payer_info structure:
--   { "scheme": "HMO Name", "enrolee_id": "...", "relationship": "Self", 
--     "expiration_date": "..." }
--
-- Fixes:
--   1. Update populate_nhis_claim_payer_info() trigger to read correct keys
--   2. Backfill nhis_profiles.provider_name from patients.payer_info->>'scheme'
--   3. Backfill nhis_claims.hmo_name/payer_name from patients.payer_info->>'scheme'
-- =============================================================================

-- ===========================================================================
-- 1. FIX populate_nhis_claim_payer_info() TRIGGER
--    Read payer_info->>'scheme' instead of payer_info->>'hmo_name'
-- ===========================================================================

CREATE OR REPLACE FUNCTION populate_nhis_claim_payer_info()
RETURNS TRIGGER AS $$
DECLARE
    v_patient RECORD;
    v_profile RECORD;
    v_hmo_name TEXT;
    v_hmo_id UUID;
BEGIN
    -- Only on INSERT, populate payer fields if not already set
    IF TG_OP = 'INSERT' THEN
        -- Get patient info
        SELECT payer_info, nhis_number INTO v_patient
        FROM patients WHERE id = NEW.patient_id;
        
        -- Get NHIS profile
        SELECT provider_name, scheme_type, enrollee_id INTO v_profile
        FROM nhis_profiles WHERE patient_id = NEW.patient_id
        ORDER BY created_at DESC LIMIT 1;
        
        -- Resolve HMO name: payer_info.scheme is the actual HMO name field
        v_hmo_name := COALESCE(
            NEW.hmo_name,
            v_patient.payer_info->>'scheme',
            v_profile.provider_name
        );
        
        -- Try to resolve hmo_id from nhis_hmos table by name
        IF v_hmo_name IS NOT NULL AND v_hmo_name <> '' THEN
            SELECT id INTO v_hmo_id FROM nhis_hmos WHERE name = v_hmo_name LIMIT 1;
        END IF;
        
        -- Set fields
        NEW.hmo_name := COALESCE(NEW.hmo_name, v_hmo_name);
        NEW.hmo_id := COALESCE(NEW.hmo_id, v_hmo_id);
        NEW.payer_name := COALESCE(NEW.payer_name, v_hmo_name);
        NEW.scheme_type := COALESCE(NEW.scheme_type, v_profile.scheme_type::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS trg_populate_nhis_claim_payer ON nhis_claims;
CREATE TRIGGER trg_populate_nhis_claim_payer
    BEFORE INSERT ON nhis_claims
    FOR EACH ROW
    EXECUTE FUNCTION populate_nhis_claim_payer_info();

-- ===========================================================================
-- 2. BACKFILL nhis_profiles.provider_name FROM patients.payer_info->>'scheme'
--    Only for profiles where provider_name is NULL or empty
-- ===========================================================================

UPDATE nhis_profiles np
SET provider_name = p.payer_info->>'scheme',
    updated_at = NOW()
FROM patients p
WHERE np.patient_id = p.id
  AND (np.provider_name IS NULL OR np.provider_name = '')
  AND p.payer_info->>'scheme' IS NOT NULL
  AND p.payer_info->>'scheme' <> '';

-- ===========================================================================
-- 3. BACKFILL nhis_claims.hmo_name & payer_name from patients.payer_info->>'scheme'
--    Only for claims where hmo_name is NULL or empty
-- ===========================================================================

UPDATE nhis_claims nc
SET hmo_name = COALESCE(p.payer_info->>'scheme', np.provider_name),
    payer_name = COALESCE(p.payer_info->>'scheme', np.provider_name),
    hmo_id = nh.id
FROM patients p
LEFT JOIN nhis_profiles np ON np.patient_id = p.id
LEFT JOIN nhis_hmos nh ON nh.name = COALESCE(p.payer_info->>'scheme', np.provider_name)
WHERE nc.patient_id = p.id
  AND (nc.hmo_name IS NULL OR nc.hmo_name = '');

-- ===========================================================================
-- 4. DONE
-- ===========================================================================

DO $$
DECLARE
    v_profiles_updated INT;
    v_claims_updated INT;
BEGIN
    SELECT count(*) INTO v_profiles_updated
    FROM nhis_profiles WHERE provider_name IS NOT NULL AND provider_name <> '';
    
    SELECT count(*) INTO v_claims_updated
    FROM nhis_claims WHERE hmo_name IS NOT NULL AND hmo_name <> '';
    
    RAISE NOTICE 'Migration 136_fix_payer_hmo_mapping completed';
    RAISE NOTICE '  - Fixed populate_nhis_claim_payer_info() to read payer_info.scheme';
    RAISE NOTICE '  - nhis_profiles with provider_name: %', v_profiles_updated;
    RAISE NOTICE '  - nhis_claims with hmo_name: %', v_claims_updated;
END $$;
