-- Fix for "function uuid_generate_v4() does not exist" error
-- This usually happens because the function is not in the search path or the extension is missing.
-- We will switch to using gen_random_uuid() which is built-in in modern Postgres (v13+).

-- 1. Ensure pgcrypto is enabled (provides gen_random_uuid on older versions, though v13+ has it in core)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Update the create_staff_user function to use gen_random_uuid()
CREATE OR REPLACE FUNCTION create_staff_user(
    email_address TEXT,
    password TEXT,
    first_name TEXT,
    last_name TEXT,
    user_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
-- Include extensions in search path just in case
SET search_path = public, extensions
AS $$
DECLARE
    new_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- 1. Check if the executing user is an admin
    SELECT role INTO current_user_role
    FROM staff
    WHERE user_id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin', 'medical_director', 'config_admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can create new users.';
    END IF;

    -- 2. Generate new UUID using gen_random_uuid()
    new_user_id := gen_random_uuid();

    -- 3. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        email_address,
        crypt(password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
            'full_name', first_name || ' ' || last_name,
            'role', user_role
        ),
        NOW(),
        NOW(),
        '',
        ''
    );

    RETURN new_user_id;
END;
$$;

-- 3. Update staff table default if it relies on uuid_generate_v4()
-- We attempt to set it to gen_random_uuid() which is safer
ALTER TABLE staff ALTER COLUMN id SET DEFAULT gen_random_uuid();
