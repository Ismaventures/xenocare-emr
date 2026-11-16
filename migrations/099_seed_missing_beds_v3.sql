-- Comprehensive Bed Repair Script (V3)
-- This script will:
-- 1. Identify the active facility
-- 2. Find existing wards (matching standard codes or names)
-- 3. Populate missing beds for ALL active wards
-- 4. Fix status capitalization for compatibility

DO $$
DECLARE
    v_facility_id UUID;
    v_ward RECORD;
    v_bed_count INTEGER;
BEGIN
    -- 1. Get Facility
    SELECT id INTO v_facility_id FROM facilities LIMIT 1;
    
    IF v_facility_id IS NULL THEN
        INSERT INTO facilities (code, name, facility_type) 
        VALUES ('NDC_HOSP', 'NDC Medical Centre', 'hospital')
        RETURNING id INTO v_facility_id;
    END IF;

    RAISE NOTICE 'Using Facility ID: %', v_facility_id;

    -- 2. Ensure Standard Wards Exist (if they don't already)
    -- We use ON CONFLICT DO NOTHING to prefer existing wards
    INSERT INTO wards (facility_id, name, code, ward_type, total_beds, available_beds, is_active)
    VALUES 
        (v_facility_id, 'Male General Ward', 'MGW01', 'general', 10, 10, true),
        (v_facility_id, 'Female General Ward', 'FGW01', 'general', 10, 10, true),
        (v_facility_id, 'Pediatric Ward', 'PED01', 'pediatric', 10, 10, true),
        (v_facility_id, 'Maternity Ward', 'MAT01', 'maternity', 10, 10, true),
        (v_facility_id, 'Emergency Ward', 'EMR01', 'emergency', 10, 10, true)
    ON CONFLICT (code) DO NOTHING;

    -- 3. Loop through ALL active wards and ensure they have beds
    FOR v_ward IN SELECT * FROM wards WHERE facility_id = v_facility_id AND is_active = true LOOP
        
        -- Count existing beds
        SELECT COUNT(*) INTO v_bed_count FROM beds WHERE ward_id = v_ward.id;
        
        RAISE NOTICE 'Ward % (%) has % beds', v_ward.name, v_ward.code, v_bed_count;

        -- If no beds, seed them
        IF v_bed_count = 0 THEN
            RAISE NOTICE 'Seeding beds for %...', v_ward.name;
            
            INSERT INTO beds (ward_id, bed_number, bed_type, status, is_active)
            VALUES 
                (v_ward.id, v_ward.code || '-01', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-02', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-03', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-04', 'standard', 'Available', true),
                (v_ward.id, v_ward.code || '-05', 'standard', 'Available', true);
                
            -- Update ward available count
            UPDATE wards SET available_beds = 5 WHERE id = v_ward.id;
        END IF;

        -- Fix any lowercase 'available' statuses to 'Available' (PascalCase) for View compatibility
        UPDATE beds 
        SET status = 'Available' 
        WHERE ward_id = v_ward.id AND status = 'available';

    END LOOP;

    -- 4. Force refresh of the materialized view (if applicable) or ward counts
    UPDATE wards w
    SET available_beds = (
        SELECT COUNT(*) 
        FROM beds b 
        WHERE b.ward_id = w.id 
        AND (b.status = 'Available' OR b.status = 'available') -- Count both just in case
        AND b.is_active = true
    );

    RAISE NOTICE 'Bed repair completed successfully';
END $$;
