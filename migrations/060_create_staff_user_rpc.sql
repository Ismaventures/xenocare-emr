-- Function to create a new user in auth.users and return the ID
-- This allows admins to create users with passwords without needing the service role key on the client
-- SECURITY: This function is SECURITY DEFINER, meaning it runs with the privileges of the creator (superuser/postgres)
-- We MUST check permissions inside the function to ensure only admins can call it.

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
SET search_path = public
AS $$
DECLARE
    new_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- 1. Check if the executing user is an admin
    -- We get the user_id from auth.uid()
    SELECT role INTO current_user_role
    FROM staff
    WHERE user_id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin', 'medical_director', 'config_admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can create new users.';
    END IF;

    -- 2. Generate new UUID
    new_user_id := uuid_generate_v4();

    -- 3. Insert into auth.users
    -- We use crypt() to hash the password. 
    -- Note: Supabase uses bcrypt.
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
        '00000000-0000-0000-0000-000000000000', -- Default instance_id
        new_user_id,
        'authenticated',
        'authenticated',
        email_address,
        crypt(password, gen_salt('bf')),
        NOW(), -- Auto confirm
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
