-- Corrected Seed Script for Facilities/Wards/Beds
-- Uses facility_id instead of department_id (fixing previous error)

DO $$
DECLARE
    v_facility_id UUID;
    v_ward_id UUID;
BEGIN
    -- 1. Get Facility (or create default if missing)
    SELECT id INTO v_facility_id FROM facilities LIMIT 1;
    
    IF v_facility_id IS NULL THEN
        INSERT INTO facilities (code, name, facility_type) 
        VALUES ('NDC_HOSP', 'NDC Medical Centre', 'hospital')
        RETURNING id INTO v_facility_id;
    END IF;

    -- 2. Male General Ward
    INSERT INTO wards (
        facility_id, 
        code, 
        name, 
        ward_type, 
        total_beds, 
        available_beds,
        is_active
    )
    VALUES (
        v_facility_id, 
        'WARD_MALE_GEN', 
        'Male General Ward', 
        'general', 
        10, 
        10,
        true
    )
    ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name,
        facility_id = EXCLUDED.facility_id
    RETURNING id INTO v_ward_id;

    -- Beds for Male Ward
    -- Using status 'available' (lowercase) and bed_type 'standard'
    INSERT INTO beds (ward_id, bed_number, bed_type, status, is_active)
    VALUES 
        (v_ward_id, 'MG-01', 'standard', 'available', true),
        (v_ward_id, 'MG-02', 'standard', 'available', true),
        (v_ward_id, 'MG-03', 'standard', 'available', true),
        (v_ward_id, 'MG-04', 'standard', 'available', true),
        (v_ward_id, 'MG-05', 'standard', 'available', true)
    ON CONFLICT (ward_id, bed_number) DO UPDATE SET 
        status = 'available', 
        is_active = true;

    -- 3. Female General Ward
    INSERT INTO wards (
        facility_id, 
        code, 
        name, 
        ward_type, 
        total_beds, 
        available_beds,
        is_active
    )
    VALUES (
        v_facility_id, 
        'WARD_FEMALE_GEN', 
        'Female General Ward', 
        'general', 
        10, 
        10,
        true
    )
    ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name,
        facility_id = EXCLUDED.facility_id
    RETURNING id INTO v_ward_id;

    -- Beds for Female Ward
    INSERT INTO beds (ward_id, bed_number, bed_type, status, is_active)
    VALUES 
        (v_ward_id, 'FG-01', 'standard', 'available', true),
        (v_ward_id, 'FG-02', 'standard', 'available', true),
        (v_ward_id, 'FG-03', 'standard', 'available', true),
        (v_ward_id, 'FG-04', 'standard', 'available', true),
        (v_ward_id, 'FG-05', 'standard', 'available', true)
    ON CONFLICT (ward_id, bed_number) DO UPDATE SET 
        status = 'available', 
        is_active = true;
        
    RAISE NOTICE 'Beds have been successfully seeded for facility %', v_facility_id;
END $$;
