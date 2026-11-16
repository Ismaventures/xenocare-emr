-- ============================================================================
-- COMPREHENSIVE BED FIX (V4)
-- 
-- This script addresses:
-- 1. Status constraint mismatch (Available vs available)
-- 2. Missing bed data for existing wards
-- 3. Ward available_beds counter sync
-- ============================================================================

-- STEP 1: Fix the status CHECK constraint to accept both cases
-- (If this fails, it means RLS or permissions need adjustment)
ALTER TABLE beds DROP CONSTRAINT IF EXISTS beds_status_check;

ALTER TABLE beds ADD CONSTRAINT beds_status_check CHECK (
    status IN ('Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved',
               'available', 'occupied', 'cleaning', 'maintenance', 'reserved')
);

-- STEP 2: Normalize all existing beds to 'Available' (PascalCase)
UPDATE beds SET status = 'Available' WHERE status = 'available';
UPDATE beds SET status = 'Occupied' WHERE status = 'occupied';
UPDATE beds SET status = 'Reserved' WHERE status = 'reserved';
UPDATE beds SET status = 'Cleaning' WHERE status = 'cleaning';
UPDATE beds SET status = 'Maintenance' WHERE status = 'maintenance';

-- STEP 3: Seed beds for ALL wards that are missing beds
DO $$
DECLARE
    v_ward RECORD;
    v_bed_count INTEGER;
BEGIN
    FOR v_ward IN 
        SELECT id, code, name 
        FROM wards 
        WHERE is_active = true
    LOOP
        -- Count existing beds in this ward
        SELECT COUNT(*) INTO v_bed_count FROM beds WHERE ward_id = v_ward.id;
        
        RAISE NOTICE 'Ward % (%) has % beds', v_ward.name, v_ward.code, v_bed_count;
        
        -- If no beds exist, create 5 standard beds
        IF v_bed_count = 0 THEN
            RAISE NOTICE 'Creating beds for ward %...', v_ward.name;
            
            INSERT INTO beds (ward_id, bed_number, bed_type, status, is_active)
            VALUES 
                (v_ward.id, v_ward.code || '-01', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-02', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-03', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-04', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-05', 'standard', 'Available', true)
            ON CONFLICT (ward_id, bed_number) DO UPDATE SET status = 'Available', is_active = true;
        END IF;
    END LOOP;
END $$;

-- STEP 4: Update ward available_beds counter to match actual available beds
UPDATE wards w
SET 
    available_beds = (
        SELECT COUNT(*) 
        FROM beds b 
        WHERE b.ward_id = w.id 
        AND b.status = 'Available'
        AND b.is_active = true
    ),
    total_beds = (
        SELECT COUNT(*) 
        FROM beds b 
        WHERE b.ward_id = w.id 
        AND b.is_active = true
    );

-- STEP 5: Verify - List all wards and their bed counts
SELECT 
    w.name as ward_name,
    w.code as ward_code,
    w.total_beds,
    w.available_beds,
    (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id AND b.is_active = true) as actual_bed_count,
    (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id AND b.status = 'Available' AND b.is_active = true) as actual_available_count
FROM wards w
WHERE w.is_active = true
ORDER BY w.name;
