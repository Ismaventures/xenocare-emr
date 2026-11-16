-- ============================================================================
-- COMPREHENSIVE BED DIAGNOSTIC & FIX (V5)
-- 
-- This script will:
-- 1. Diagnose why beds aren't showing
-- 2. Check if wards exist
-- 3. Check if beds exist  
-- 4. Check RLS policies
-- 5. Create beds if missing
-- 6. Temporarily disable RLS to test
-- ============================================================================

-- DIAGNOSTIC STEP 1: Check wards table
SELECT 'WARDS CHECK' as step;
SELECT id, name, code, ward_type, facility_id, is_active, total_beds, available_beds
FROM wards 
LIMIT 20;

-- DIAGNOSTIC STEP 2: Check beds table
SELECT 'BEDS CHECK' as step;
SELECT b.id, b.bed_number, b.bed_type, b.status, b.is_active, b.ward_id, w.name as ward_name
FROM beds b
LEFT JOIN wards w ON w.id = b.ward_id
LIMIT 50;

-- DIAGNOSTIC STEP 3: Check if there are ANY beds at all
SELECT 'TOTAL BED COUNT' as step, COUNT(*) as total_beds FROM beds;
SELECT 'AVAILABLE BED COUNT' as step, COUNT(*) as available_beds FROM beds WHERE status ILIKE 'available' AND is_active = true;

-- DIAGNOSTIC STEP 4: Check facilities
SELECT 'FACILITIES CHECK' as step;
SELECT id, code, name FROM facilities LIMIT 5;

-- DIAGNOSTIC STEP 5: Check staff facility assignment
SELECT 'STAFF FACILITY CHECK' as step;
SELECT s.id, s.first_name, s.last_name, s.role, s.facility_id, f.name as facility_name
FROM staff s
LEFT JOIN facilities f ON f.id = s.facility_id
LIMIT 10;

-- ============================================================================
-- FIX: SEED BEDS FOR ALL WARDS
-- ============================================================================

DO $$
DECLARE
    v_ward RECORD;
    v_bed_count INTEGER;
    v_created_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== STARTING BED SEED ===';
    
    FOR v_ward IN 
        SELECT id, code, name, facility_id
        FROM wards 
        WHERE is_active = true
    LOOP
        -- Count existing beds in this ward
        SELECT COUNT(*) INTO v_bed_count FROM beds WHERE ward_id = v_ward.id;
        
        RAISE NOTICE 'Ward: % (%) - Facility: % - Existing beds: %', 
            v_ward.name, v_ward.code, v_ward.facility_id, v_bed_count;
        
        -- If no beds exist, create 5 standard beds
        IF v_bed_count = 0 THEN
            RAISE NOTICE '  -> Creating 5 beds for ward %', v_ward.name;
            
            INSERT INTO beds (ward_id, bed_number, bed_type, status, is_active)
            VALUES 
                (v_ward.id, v_ward.code || '-01', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-02', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-03', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-04', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-05', 'standard', 'Available', true)
            ON CONFLICT (ward_id, bed_number) DO UPDATE SET status = 'Available', is_active = true;
            
            v_created_count := v_created_count + 5;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== COMPLETED: Created % new beds ===', v_created_count;
END $$;

-- Update ward counts
UPDATE wards w
SET 
    available_beds = (
        SELECT COUNT(*) FROM beds b 
        WHERE b.ward_id = w.id 
        AND b.status ILIKE 'available'
        AND b.is_active = true
    ),
    total_beds = (
        SELECT COUNT(*) FROM beds b 
        WHERE b.ward_id = w.id 
        AND b.is_active = true
    );

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT 'FINAL VERIFICATION' as step;
SELECT 
    w.name as ward_name,
    w.code,
    w.facility_id,
    w.total_beds,
    w.available_beds,
    (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id) as actual_beds,
    (SELECT COUNT(*) FROM beds b WHERE b.ward_id = w.id AND b.status ILIKE 'available' AND b.is_active = true) as actual_available
FROM wards w
WHERE w.is_active = true
ORDER BY w.name;

-- ============================================================================
-- OPTIONAL: If still not working, temporarily disable RLS for testing
-- UNCOMMENT THE LINES BELOW ONLY FOR TESTING, THEN RE-ENABLE
-- ============================================================================

-- ALTER TABLE beds DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE wards DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
