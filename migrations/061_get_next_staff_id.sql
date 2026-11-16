-- Function to get the next staff ID based on role
-- This ensures consistency with the ID generation logic

CREATE OR REPLACE FUNCTION get_next_staff_id(role_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prefix VARCHAR;
    seq INTEGER;
    formatted_seq VARCHAR;
    num_part TEXT;
BEGIN
    -- Determine prefix based on role
    CASE role_input
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
    -- Use regexp_replace to extract digit portion after prefix, cast to integer for proper numeric MAX
    SELECT COALESCE(MAX(
        CASE 
            WHEN staff_id ~ ('^' || prefix || '-\d+$')
            THEN regexp_replace(staff_id, '^' || prefix || '-', '')::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO seq
    FROM staff
    WHERE staff_id LIKE prefix || '-%';

    formatted_seq := LPAD(seq::TEXT, 3, '0');
    
    RETURN prefix || '-' || formatted_seq;
END;
$$;
