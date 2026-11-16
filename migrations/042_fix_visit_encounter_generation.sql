-- =====================================================
-- Migration 042: Fix visit_id and encounter_number Generation
-- =====================================================
-- This migration ensures visit_id and encounter_number are 
-- auto-generated when creating visits (encounters).
-- =====================================================

-- 1. Create sequence for visit_id (if not exists)
CREATE SEQUENCE IF NOT EXISTS visit_id_seq START WITH 1001;

-- 2. Sync sequence with existing data
DO $$
DECLARE
    max_num INTEGER;
BEGIN
    -- Find highest existing visit number to avoid collisions
    SELECT COALESCE(MAX(
        CASE 
            WHEN visit_id ~ '-[0-9]+$' THEN 
                CAST(SUBSTRING(visit_id FROM '-([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_num
    FROM visits;
    
    IF max_num >= 1001 THEN
        PERFORM setval('visit_id_seq', max_num + 1, false);
    END IF;
END $$;

-- 3. Create function to generate visit_id
CREATE OR REPLACE FUNCTION generate_visit_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visit_id IS NULL OR NEW.visit_id = '' THEN
        NEW.visit_id := 'VIS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('visit_id_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for visit_id
DROP TRIGGER IF EXISTS trg_generate_visit_id ON visits;
CREATE TRIGGER trg_generate_visit_id
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION generate_visit_id();

-- 5. Create sequence for encounter_number (if not exists)
CREATE SEQUENCE IF NOT EXISTS encounter_number_seq START WITH 1001;

-- 6. Sync encounter_number sequence with existing data
DO $$
DECLARE
    max_num INTEGER;
BEGIN
    -- Find highest existing encounter number to avoid collisions
    SELECT COALESCE(MAX(
        CASE 
            WHEN encounter_number ~ '-[0-9]+$' THEN 
                CAST(SUBSTRING(encounter_number FROM '-([0-9]+)$') AS INTEGER)
            ELSE 0
        END
    ), 0) INTO max_num
    FROM visits;
    
    IF max_num >= 1001 THEN
        PERFORM setval('encounter_number_seq', max_num + 1, false);
    END IF;
END $$;

-- 7. Create/update function to generate encounter_number
CREATE OR REPLACE FUNCTION generate_encounter_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.encounter_number IS NULL OR NEW.encounter_number = '' THEN
        NEW.encounter_number := 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('encounter_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for encounter_number
DROP TRIGGER IF EXISTS trg_generate_encounter_number ON visits;
CREATE TRIGGER trg_generate_encounter_number
    BEFORE INSERT ON visits
    FOR EACH ROW
    EXECUTE FUNCTION generate_encounter_number();

-- 9. Backfill any existing NULL encounter_numbers
UPDATE visits 
SET encounter_number = 'ENC-' || TO_CHAR(COALESCE(created_at::date, CURRENT_DATE), 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0')
WHERE encounter_number IS NULL;

-- 10. Backfill any existing NULL visit_ids (if somehow missing)
UPDATE visits 
SET visit_id = 'VIS-' || TO_CHAR(COALESCE(created_at::date, CURRENT_DATE), 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 5, '0')
WHERE visit_id IS NULL OR visit_id = '';

RAISE NOTICE 'Migration 042 complete: visit_id and encounter_number triggers installed';
