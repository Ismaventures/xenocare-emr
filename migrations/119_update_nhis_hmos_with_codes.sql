-- =============================================================================
-- Migration: 119_update_nhis_hmos_with_codes.sql
-- Description: Add HMO codes to nhis_hmos table and update with official NHIA codes
-- Date: 2026-02-05
-- Source: NHIA/NHIS Accredited HMOs and Codes list (2026)
-- =============================================================================

-- =============================================================================
-- PART 1: ADD hmo_code COLUMN TO nhis_hmos TABLE
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'nhis_hmos' AND column_name = 'hmo_code'
    ) THEN
        ALTER TABLE public.nhis_hmos ADD COLUMN hmo_code VARCHAR(10);
        COMMENT ON COLUMN public.nhis_hmos.hmo_code IS 'Official NHIA HMO Code/ID';
    END IF;
END $$;

-- Create index on hmo_code
CREATE INDEX IF NOT EXISTS idx_nhis_hmos_code ON nhis_hmos(hmo_code) WHERE hmo_code IS NOT NULL;

-- =============================================================================
-- PART 2: UPDATE EXISTING HMOs WITH THEIR CODES
-- =============================================================================

-- First, let's update existing HMOs with their codes (matching by name patterns)
UPDATE nhis_hmos SET hmo_code = '102' WHERE LOWER(name) LIKE '%a&m healthcare%' OR LOWER(name) LIKE '%a & m healthcare%';
UPDATE nhis_hmos SET hmo_code = '6' WHERE LOWER(name) LIKE '%aiico%';
UPDATE nhis_hmos SET hmo_code = '111' WHERE LOWER(name) LIKE '%alleanza%';
UPDATE nhis_hmos SET hmo_code = '119' WHERE LOWER(name) LIKE '%ally healthcare%';
UPDATE nhis_hmos SET hmo_code = '121' WHERE LOWER(name) LIKE '%aman health%';
UPDATE nhis_hmos SET hmo_code = '76' WHERE LOWER(name) LIKE '%anchor hmo%';
UPDATE nhis_hmos SET hmo_code = '89' WHERE LOWER(name) LIKE '%ashmed%';
UPDATE nhis_hmos SET hmo_code = '63' WHERE LOWER(name) LIKE '%avon%';
UPDATE nhis_hmos SET hmo_code = '59' WHERE LOWER(name) LIKE '%axa mansard%';
UPDATE nhis_hmos SET hmo_code = '97' WHERE LOWER(name) LIKE '%bastion%';
UPDATE nhis_hmos SET hmo_code = '120' WHERE LOWER(name) LIKE '%bonitas%';
UPDATE nhis_hmos SET hmo_code = '99' WHERE LOWER(name) LIKE '%century medicaid%';
UPDATE nhis_hmos SET hmo_code = '3' WHERE LOWER(name) LIKE '%clearline%';
UPDATE nhis_hmos SET hmo_code = '22' WHERE LOWER(name) LIKE '%defence health%';
UPDATE nhis_hmos SET hmo_code = '117' WHERE LOWER(name) LIKE '%delog%';
UPDATE nhis_hmos SET hmo_code = '115' WHERE LOWER(name) LIKE '%doheec%';
UPDATE nhis_hmos SET hmo_code = '100' WHERE LOWER(name) LIKE '%dot hmo%';
UPDATE nhis_hmos SET hmo_code = '94' WHERE LOWER(name) LIKE '%fountain%';
UPDATE nhis_hmos SET hmo_code = '60' WHERE LOWER(name) LIKE '%gni%';
UPDATE nhis_hmos SET hmo_code = '112' WHERE LOWER(name) LIKE '%gorah%';
UPDATE nhis_hmos SET hmo_code = '43' WHERE LOWER(name) LIKE '%greenbay%';
UPDATE nhis_hmos SET hmo_code = '78' WHERE LOWER(name) LIKE '%greenfield%';
UPDATE nhis_hmos SET hmo_code = '108' WHERE LOWER(name) LIKE '%grooming%';
UPDATE nhis_hmos SET hmo_code = '96' WHERE LOWER(name) LIKE '%hallmark%';
UPDATE nhis_hmos SET hmo_code = '87' WHERE LOWER(name) LIKE '%health assur%';
UPDATE nhis_hmos SET hmo_code = '35' WHERE LOWER(name) LIKE '%health partners%';
UPDATE nhis_hmos SET hmo_code = '4' WHERE LOWER(name) LIKE '%healthcare international%' OR LOWER(name) LIKE '%hci healthcare%';
UPDATE nhis_hmos SET hmo_code = '122' WHERE LOWER(name) LIKE '%healthspring%';
UPDATE nhis_hmos SET hmo_code = '1' WHERE LOWER(name) LIKE '%hygeia%';
UPDATE nhis_hmos SET hmo_code = '113' WHERE LOWER(name) LIKE '%infinite x2%';
UPDATE nhis_hmos SET hmo_code = '14' WHERE LOWER(name) LIKE '%integrated health%';
UPDATE nhis_hmos SET hmo_code = '11' WHERE LOWER(name) LIKE '%international health m%';
UPDATE nhis_hmos SET hmo_code = '69' WHERE LOWER(name) LIKE '%ives%';
UPDATE nhis_hmos SET hmo_code = '109' WHERE LOWER(name) LIKE '%kenn%dia%' OR LOWER(name) LIKE '%kene%dia%';
UPDATE nhis_hmos SET hmo_code = '90' WHERE LOWER(name) LIKE '%leadway%';
UPDATE nhis_hmos SET hmo_code = '79' WHERE LOWER(name) LIKE '%life%worth%' OR LOWER(name) LIKE '%lifeworth%';
UPDATE nhis_hmos SET hmo_code = '118' WHERE LOWER(name) LIKE '%lifesaver%';
UPDATE nhis_hmos SET hmo_code = '98' WHERE LOWER(name) LIKE '%maayoit%';
UPDATE nhis_hmos SET hmo_code = '48' WHERE LOWER(name) LIKE '%marina%';
UPDATE nhis_hmos SET hmo_code = '29' WHERE LOWER(name) LIKE '%markfema%';
UPDATE nhis_hmos SET hmo_code = '103' WHERE LOWER(name) LIKE '%masslife%';
UPDATE nhis_hmos SET hmo_code = '110' WHERE LOWER(name) LIKE '%mb%o%' OR LOWER(name) LIKE '%mb &%';
UPDATE nhis_hmos SET hmo_code = '44' WHERE LOWER(name) LIKE '%medexia%';
UPDATE nhis_hmos SET hmo_code = '71' WHERE LOWER(name) LIKE '%medicare alliance%' OR LOWER(name) LIKE '%doma%';
UPDATE nhis_hmos SET hmo_code = '5' WHERE LOWER(name) LIKE '%mediplan%';
UPDATE nhis_hmos SET hmo_code = '77' WHERE LOWER(name) LIKE '%metro%health%' OR LOWER(name) LIKE '%metrohealth%';
UPDATE nhis_hmos SET hmo_code = '116' WHERE LOWER(name) LIKE '%nem health%';
UPDATE nhis_hmos SET hmo_code = '86' WHERE LOWER(name) LIKE '%nnpc%';
UPDATE nhis_hmos SET hmo_code = '51' WHERE LOWER(name) LIKE '%nonsuch%';
UPDATE nhis_hmos SET hmo_code = '114' WHERE LOWER(name) LIKE '%noor health%';
UPDATE nhis_hmos SET hmo_code = '74' WHERE LOWER(name) LIKE '%novo health%';
UPDATE nhis_hmos SET hmo_code = '39' WHERE LOWER(name) LIKE '%oceanic%';
UPDATE nhis_hmos SET hmo_code = '105' WHERE LOWER(name) LIKE '%peramare%';
UPDATE nhis_hmos SET hmo_code = '88' WHERE LOWER(name) LIKE '%phillips%';
UPDATE nhis_hmos SET hmo_code = '73' WHERE LOWER(name) LIKE '%police health%';
UPDATE nhis_hmos SET hmo_code = '36' WHERE LOWER(name) LIKE '%precious%';
UPDATE nhis_hmos SET hmo_code = '30' WHERE LOWER(name) LIKE '%prepaid%';
UPDATE nhis_hmos SET hmo_code = '17' WHERE LOWER(name) LIKE '%princeton%';
UPDATE nhis_hmos SET hmo_code = '57' WHERE LOWER(name) LIKE '%pro%health%' OR LOWER(name) LIKE '%prohealth%';
UPDATE nhis_hmos SET hmo_code = '65' WHERE LOWER(name) LIKE '%redcare%';
UPDATE nhis_hmos SET hmo_code = '64' WHERE LOWER(name) LIKE '%regenix%';
UPDATE nhis_hmos SET hmo_code = '92' WHERE LOWER(name) LIKE '%reliance%';
UPDATE nhis_hmos SET hmo_code = '93' WHERE LOWER(name) LIKE '%roding%';
UPDATE nhis_hmos SET hmo_code = '10' WHERE LOWER(name) LIKE '%ronsberger%';
UPDATE nhis_hmos SET hmo_code = '101' WHERE LOWER(name) LIKE '%rothauge%';
UPDATE nhis_hmos SET hmo_code = '26' WHERE LOWER(name) LIKE '%royal health%';
UPDATE nhis_hmos SET hmo_code = '54' WHERE LOWER(name) LIKE '%salus%';
UPDATE nhis_hmos SET hmo_code = '107' WHERE LOWER(name) LIKE '%seraph%' OR LOWER(name) LIKE '%sepraph%';
UPDATE nhis_hmos SET hmo_code = '104' WHERE LOWER(name) LIKE '%skyda%';
UPDATE nhis_hmos SET hmo_code = '13' WHERE LOWER(name) LIKE '%songhai%';
UPDATE nhis_hmos SET hmo_code = '106' WHERE LOWER(name) LIKE '%springtide%';
UPDATE nhis_hmos SET hmo_code = '34' WHERE LOWER(name) LIKE '%sterling%';
UPDATE nhis_hmos SET hmo_code = '16' WHERE LOWER(name) LIKE '%sunu%' OR LOWER(name) LIKE '%managed healthcare%';
UPDATE nhis_hmos SET hmo_code = '91' WHERE LOWER(name) LIKE '%synergy%';
UPDATE nhis_hmos SET hmo_code = '2' WHERE LOWER(name) LIKE '%total health%';
UPDATE nhis_hmos SET hmo_code = '61' WHERE LOWER(name) LIKE '%ultimate health%';
UPDATE nhis_hmos SET hmo_code = '23' WHERE LOWER(name) LIKE '%united comprehensive%';
UPDATE nhis_hmos SET hmo_code = '7' WHERE LOWER(name) LIKE '%united healthcare%';
UPDATE nhis_hmos SET hmo_code = '21' WHERE LOWER(name) LIKE '%venus%';
UPDATE nhis_hmos SET hmo_code = '24' WHERE LOWER(name) LIKE '%veritas%';
UPDATE nhis_hmos SET hmo_code = '67' WHERE LOWER(name) LIKE '%well health%';
UPDATE nhis_hmos SET hmo_code = '41' WHERE LOWER(name) LIKE '%wellness%';
UPDATE nhis_hmos SET hmo_code = '28' WHERE LOWER(name) LIKE '%zuma%';

-- =============================================================================
-- PART 3: INSERT ANY NEW HMOs THAT DON'T EXIST
-- Using INSERT ... ON CONFLICT to handle duplicates
-- =============================================================================

INSERT INTO nhis_hmos (name, hmo_code) VALUES
    ('A&M HEALTHCARE TRUST LIMITED', '102'),
    ('AIICO MULTISHIELD NIGERIA LIMITED', '6'),
    ('ALLEANZA HEALTH MANAGEMENT LIMITED', '111'),
    ('ALLY HEALTHCARE LIMITED', '119'),
    ('AMAN HEALTH MAINTENANCE ORGANIZATIONS', '121'),
    ('ANCHOR HMO INTERNATIONAL COMPANY LIMITED', '76'),
    ('ASHMED INTEGRATED HEALTH SERVICES LTD.', '89'),
    ('AVON HEALTHCARE LIMITED', '63'),
    ('AXA MANSARD HEALTH LIMITED', '59'),
    ('BASTION HEALTH LIMITED', '97'),
    ('BONITAS HEALTH MAINTENANCE LIMITED', '120'),
    ('CENTURY MEDICAID SERVICES LIMITED', '99'),
    ('CLEARLINE INTERNATIONAL LIMITED', '3'),
    ('DEFENCE HEALTH MAINTENANCE LIMITED', '22'),
    ('DELOG MEDICAL SERVICES LTD. (HMO)', '117'),
    ('DOHEEC INTERNATIONAL HEALTHCARE LIMITED HMO', '115'),
    ('DOT HMO LTD.', '100'),
    ('FOUNTAIN HEALTHCARE LIMITED', '94'),
    ('GNI HEALTHCARE LTD', '60'),
    ('GORAH HEALTHCARE LTD.', '112'),
    ('GREENBAY HEALTHCARE SERVICES LIMITED', '43'),
    ('GREENFIELD HEALTH MANAGEMENT LTD', '78'),
    ('GROOMING HEALTH MANAGEMENT LIMITED', '108'),
    ('HALLMARK HEALTH SERVICES LIMITED', '96'),
    ('HEALTH ASSUR LIMITED', '87'),
    ('HEALTH PARTNERS LIMITED', '35'),
    ('HEALTHCARE INTERNATIONAL LIMITED', '4'),
    ('HEALTHSPRING HMO', '122'),
    ('HYGEIA HMO LIMITED', '1'),
    ('INFINITE X2 HEALTH MAINTENANCE SERVICES', '113'),
    ('INTEGRATED HEALTHCARE', '14'),
    ('INTERNATIONAL HEALTH MGT. SERVICES', '11'),
    ('IVES MEDICARE', '69'),
    ('KENNEDIA HMO LIMITED', '109'),
    ('LEADWAY HEALTH LIMITED', '90'),
    ('LIFE WORTH MEDICARE LTD', '79'),
    ('LIFESAVER HEALTHCARE LTD', '118'),
    ('MAAYOIT HEALTH CARE LIMITED', '98'),
    ('MARINA MEDICAL SERVICES HMO LIMITED', '48'),
    ('MARKFEMA NIGERIA LTD.', '29'),
    ('MASSLIFE HEALTHCARE LIMITED', '103'),
    ('MB & O HEALTHCARE SERVICES LIMITED', '110'),
    ('MEDEXIA LIMITED', '44'),
    ('MEDICARE ALLIANCE LIMITED', '71'),
    ('MEDIPLAN HEALTHCARE LIMITED', '5'),
    ('METROHEALTH HMO LIMITED', '77'),
    ('NEM HEALTH LIMITED', '116'),
    ('NNPC-HMO LIMITED', '86'),
    ('NONSUCH MEDICARE LIMITED', '51'),
    ('NOOR HEALTH LTD.', '114'),
    ('NOVO HEALTH AFRICA LIMITED', '74'),
    ('OCEANIC HEALTH MANAGEMENT LIMITED', '39'),
    ('PERAMARE HEALTH MANAGEMENT COMPANY LIMITED', '105'),
    ('PHILLIPS HEALTH MANAGEMENT SERVICES LIMITED', '88'),
    ('POLICE HEALTH MAINTENANCE LIMITED', '73'),
    ('PRECIOUS HEALTHCARE LIMITED', '36'),
    ('PREPAID MEDICARE SERVICES LTD.', '30'),
    ('PRINCETON HEALTH', '17'),
    ('PROHEALTH HMO LTD', '57'),
    ('REDCARE HEALTH SERVICES LIMITED', '65'),
    ('REGENIX HEALTH CARE SERVICE LIMITED', '64'),
    ('RELIANCE HMO LIMITED', '92'),
    ('RODING HEALTHCARE LTD.', '93'),
    ('RONSBERGER NIGERIA LTD.', '10'),
    ('ROTHAUGE HEALTHCARE LIMITED', '101'),
    ('ROYAL HEALTH MAINTENANCE SERVICES LTD.', '26'),
    ('SALUS TRUST GTE', '54'),
    ('SERAPH HMO LIMITED', '107'),
    ('SKYDA HEALTH LIMITED', '104'),
    ('SONGHAI HEALTH TRUST', '13'),
    ('SPRINGTIDE HEALTHCARE SERVICES LTD.', '106'),
    ('STERLING HEALTH MANAGED CARE SERVICES LIMITED', '34'),
    ('SUNU HEALTH NIGERIA LIMITED', '16'),
    ('SYNERGY WELLCARE MEDICAID LIMITED', '91'),
    ('TOTAL HEALTH TRUST LIMITED', '2'),
    ('ULTIMATE HEALTH MANAGEMENT SERVICES LTD', '61'),
    ('UNITED COMPREHENSIVE HEALTH MANAGERS LTD.', '23'),
    ('UNITED HEALTHCARE INTERNATIONAL LIMITED', '7'),
    ('VENUS MEDICARE LTD', '21'),
    ('VERITAS HEALTHCARE LIMITED', '24'),
    ('WELL HEALTH NETWORK LIMITED', '67'),
    ('WELLNESS HEALTH MANAGEMENT SERVICES LIMITED', '41'),
    ('ZUMA HEALTH TRUST', '28')
ON CONFLICT (name) DO UPDATE SET 
    hmo_code = EXCLUDED.hmo_code,
    updated_at = NOW();

-- =============================================================================
-- PART 4: CREATE HELPER VIEW FOR HMO LOOKUP
-- =============================================================================

DROP VIEW IF EXISTS nhis_hmos_lookup CASCADE;

CREATE VIEW nhis_hmos_lookup AS
SELECT 
    id,
    name AS hmo_name,
    hmo_code,
    CONCAT(name, ' (', COALESCE(hmo_code, 'N/A'), ')') AS display_name,
    created_at,
    updated_at
FROM nhis_hmos
ORDER BY name;

GRANT SELECT ON nhis_hmos_lookup TO authenticated;
GRANT SELECT ON nhis_hmos_lookup TO service_role;

-- =============================================================================
-- PART 5: VERIFICATION - Show updated HMOs with codes
-- =============================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_with_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM nhis_hmos;
    SELECT COUNT(*) INTO v_with_code FROM nhis_hmos WHERE hmo_code IS NOT NULL;
    
    RAISE NOTICE 'Migration 119 completed: % total HMOs, % with codes', v_total, v_with_code;
END $$;

SELECT 'SUCCESS: NHIS HMOs updated with official NHIA codes!' as result;
