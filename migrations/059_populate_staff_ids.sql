-- Migration to populate missing staff_ids based on role
-- This script updates staff records with NULL, empty, or temporary (starting with 'S-') staff_ids.
-- It assigns new IDs in the format ROLE-XXX (e.g., DOC-001, NUR-005).

DO $$
DECLARE
    r RECORD;
    new_id VARCHAR;
    prefix VARCHAR;
    seq INTEGER;
    formatted_seq VARCHAR;
BEGIN
    -- Loop through staff with missing or temporary staff_id
    -- We target NULL, empty string, or IDs starting with 'S-' (temporary format)
    FOR r IN SELECT * FROM staff WHERE staff_id IS NULL OR staff_id = '' OR staff_id LIKE 'S-%' LOOP
        
        -- Determine prefix based on role
        CASE r.role
            WHEN 'super_admin' THEN prefix := 'ADM';
            WHEN 'admin' THEN prefix := 'ADM';
            WHEN 'medical_director' THEN prefix := 'MDR';
            WHEN 'doctor' THEN prefix := 'DOC';
            WHEN 'nurse' THEN prefix := 'NUR';
            WHEN 'lab_technician' THEN prefix := 'LAB';
            WHEN 'radiologist' THEN prefix := 'RAD';
            WHEN 'pharmacist' THEN prefix := 'PHM';
            WHEN 'billing_clerk' THEN prefix := 'BIL';
            WHEN 'receptionist' THEN prefix := 'REC';
            WHEN 'cashier' THEN prefix := 'CSH';
            WHEN 'customer_service' THEN prefix := 'CSV';
            WHEN 'inventory_manager' THEN prefix := 'INV';
            WHEN 'config_admin' THEN prefix := 'CFG';
            ELSE prefix := 'STF';
        END CASE;
        
        -- Find next sequence number for this prefix
        -- We look for existing IDs matching 'PREFIX-XXX' and extract the numeric part
        SELECT COALESCE(MAX(SUBSTRING(staff_id FROM '^[A-Z]+-(\d+)$')::INTEGER), 0) + 1
        INTO seq
        FROM staff
        WHERE staff_id LIKE prefix || '-%';
        
        formatted_seq := LPAD(seq::TEXT, 3, '0');
        new_id := prefix || '-' || formatted_seq;
        
        -- Update the staff record
        -- We use a nested block to handle potential unique constraint violations
        BEGIN
            UPDATE staff SET staff_id = new_id WHERE id = r.id;
            RAISE NOTICE 'Updated staff % % to %', r.first_name, r.last_name, new_id;
        EXCEPTION WHEN unique_violation THEN
            -- If collision, try next number
            seq := seq + 1;
            formatted_seq := LPAD(seq::TEXT, 3, '0');
            new_id := prefix || '-' || formatted_seq;
            UPDATE staff SET staff_id = new_id WHERE id = r.id;
            RAISE NOTICE 'Updated staff % % to % (retry)', r.first_name, r.last_name, new_id;
        END;
        
    END LOOP;
END $$;
