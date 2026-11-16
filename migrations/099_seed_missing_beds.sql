-- Ensure we have a nursing department
DO $$
DECLARE
    dept_id UUID;
    ward_id UUID;
BEGIN
    -- Get or Create Nursing Department
    SELECT id INTO dept_id FROM departments WHERE name ILIKE '%Nurse%' OR name ILIKE '%Nursing%' LIMIT 1;
    
    IF dept_id IS NULL THEN
        -- Fallback to any department if specific one not found, or create new
         INSERT INTO departments (code, name, category, description) 
         VALUES ('DEPT_NURSING_GEN', 'Nursing Department', 'Medical', 'General Nursing')
         RETURNING id INTO dept_id;
    END IF;

    -- 1. Ensure Male Ward
    INSERT INTO wards (department_id, code, name, ward_type, total_beds, available_beds, gender_restriction)
    VALUES (dept_id, 'WARD_MALE_GEN', 'Male General Ward', 'General', 10, 10, 'Male')
    ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO ward_id;

    -- Beds for Male Ward
    IF ward_id IS NOT NULL THEN
        INSERT INTO beds (ward_id, bed_number, status, is_active)
        VALUES 
            (ward_id, 'MG-01', 'Available', true),
            (ward_id, 'MG-02', 'Available', true),
            (ward_id, 'MG-03', 'Available', true),
            (ward_id, 'MG-04', 'Available', true),
            (ward_id, 'MG-05', 'Available', true)
        ON CONFLICT (ward_id, bed_number) DO UPDATE SET status = 'Available', is_active = true;
    END IF;

    -- 2. Ensure Female Ward
    INSERT INTO wards (department_id, code, name, ward_type, total_beds, available_beds, gender_restriction)
    VALUES (dept_id, 'WARD_FEMALE_GEN', 'Female General Ward', 'General', 10, 10, 'Female')
    ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO ward_id;

    -- Beds for Female Ward
    IF ward_id IS NOT NULL THEN
        INSERT INTO beds (ward_id, bed_number, status, is_active)
        VALUES 
            (ward_id, 'FG-01', 'Available', true),
            (ward_id, 'FG-02', 'Available', true),
            (ward_id, 'FG-03', 'Available', true),
            (ward_id, 'FG-04', 'Available', true),
            (ward_id, 'FG-05', 'Available', true)
        ON CONFLICT (ward_id, bed_number) DO UPDATE SET status = 'Available', is_active = true;
    END IF;
    
    RAISE NOTICE 'Beds seeded successfully';
END $$;
