-- =============================================================================
-- Migration: Fix Bed Status Values to PascalCase
-- Date: 2026-01-21
-- Description: Standardizes all bed status values to PascalCase ('Available', 
--              'Occupied', etc.) and ensures the beds table has correct values
-- =============================================================================

-- First, let's see what status values exist (for debugging)
DO $$
DECLARE
    v_status_counts TEXT;
BEGIN
    SELECT string_agg(status || ': ' || cnt::TEXT, ', ')
    INTO v_status_counts
    FROM (
        SELECT status, COUNT(*) as cnt 
        FROM beds 
        GROUP BY status
    ) sub;
    
    RAISE NOTICE 'Current bed status distribution: %', v_status_counts;
END $$;

-- =============================================================================
-- ENSURE BEDS EXIST FOR ALL WARDS
-- If a ward has total_beds > 0 but no actual beds, create them
-- =============================================================================

CREATE OR REPLACE FUNCTION ensure_ward_beds()
RETURNS TABLE(ward_name TEXT, beds_created INTEGER) AS $$
DECLARE
    v_ward RECORD;
    v_existing_count INTEGER;
    v_created INTEGER;
    v_bed_number VARCHAR(20);
    i INTEGER;
BEGIN
    FOR v_ward IN 
        SELECT w.id, w.name, w.code, w.total_beds, w.price
        FROM wards w 
        WHERE w.is_active = true
          AND w.total_beds > 0
    LOOP
        ward_name := v_ward.name;
        v_created := 0;
        
        -- Count existing beds
        SELECT COUNT(*) INTO v_existing_count
        FROM beds b
        WHERE b.ward_id = v_ward.id AND b.is_active = true;
        
        -- If no beds exist, create them
        IF v_existing_count = 0 THEN
            FOR i IN 1..v_ward.total_beds LOOP
                v_bed_number := v_ward.code || '-B' || LPAD(i::TEXT, 2, '0');
                
                INSERT INTO beds (ward_id, bed_number, bed_type, status, is_active, daily_rate)
                VALUES (v_ward.id, v_bed_number, 'standard', 'Available', true, COALESCE(v_ward.price, 5000))
                ON CONFLICT (ward_id, bed_number) DO UPDATE SET
                    status = 'Available',
                    is_active = true,
                    updated_at = NOW();
                
                v_created := v_created + 1;
            END LOOP;
            
            RAISE NOTICE 'Ward "%": Created % beds', v_ward.name, v_created;
        ELSE
            RAISE NOTICE 'Ward "%": Already has % beds', v_ward.name, v_existing_count;
        END IF;
        
        beds_created := v_created;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the bed creation
SELECT * FROM ensure_ward_beds();

-- Clean up
DROP FUNCTION IF EXISTS ensure_ward_beds();

-- =============================================================================
-- FIX ANY BEDS WITH NULL OR INCORRECT STATUS
-- =============================================================================

-- Fix any beds with NULL status - set to Available
UPDATE beds
SET status = 'Available',
    is_active = COALESCE(is_active, true),
    updated_at = NOW()
WHERE status IS NULL;

-- Fix any beds with is_active = NULL
UPDATE beds
SET is_active = true,
    updated_at = NOW()
WHERE is_active IS NULL;

-- Update wards.available_beds to match actual available bed count
UPDATE wards w
SET available_beds = (
    SELECT COUNT(*)::integer
    FROM beds b
    WHERE b.ward_id = w.id 
    AND b.status = 'Available'
    AND b.is_active = true
),
updated_at = NOW()
WHERE w.is_active = true;

-- Update wards.total_beds to match actual bed count
UPDATE wards w
SET total_beds = (
    SELECT COUNT(*)::integer
    FROM beds b
    WHERE b.ward_id = w.id
    AND b.is_active = true
),
updated_at = NOW()
WHERE w.is_active = true;

-- Show final status
DO $$
DECLARE
    v_record RECORD;
BEGIN
    RAISE NOTICE '=== Bed Status Summary by Ward ===';
    
    FOR v_record IN
        SELECT 
            w.name as ward_name,
            w.total_beds,
            w.available_beds,
            COUNT(b.id) FILTER (WHERE b.status = 'Available' AND b.is_active = true) as actual_available,
            COUNT(b.id) FILTER (WHERE b.status = 'Occupied' AND b.is_active = true) as occupied,
            COUNT(b.id) FILTER (WHERE b.is_active = true) as total_active_beds
        FROM wards w
        LEFT JOIN beds b ON b.ward_id = w.id
        WHERE w.is_active = true
        GROUP BY w.id, w.name, w.total_beds, w.available_beds
        ORDER BY w.name
    LOOP
        RAISE NOTICE 'Ward: %, Total: %, Available: %, Actual Available: %, Occupied: %',
            v_record.ward_name,
            v_record.total_beds,
            v_record.available_beds,
            v_record.actual_available,
            v_record.occupied;
    END LOOP;
END $$;

-- =============================================================================
-- Verify the fix worked
-- =============================================================================
DO $$
DECLARE
    v_available_count INTEGER;
    v_total_wards INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_available_count 
    FROM beds 
    WHERE status = 'Available' AND is_active = true;
    
    SELECT COUNT(*) INTO v_total_wards 
    FROM wards 
    WHERE is_active = true;
    
    RAISE NOTICE 'Migration 077 complete:';
    RAISE NOTICE '  Total available beds: %', v_available_count;
    RAISE NOTICE '  Total active wards: %', v_total_wards;
END $$;
