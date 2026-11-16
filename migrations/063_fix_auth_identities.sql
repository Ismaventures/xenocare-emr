-- Fix for "Database error querying schema" during login
-- This error often happens when Supabase Auth tries to create an identity for a user that was manually inserted into auth.users
-- but doesn't have a corresponding entry in auth.identities.
-- We need to update the create_staff_user function to also insert into auth.identities.

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
SET search_path = public, extensions
AS $$
DECLARE
    new_user_id UUID;
    current_user_role TEXT;
    v_instance_id UUID;
BEGIN
    -- 1. Check if the executing user is an admin
    SELECT role INTO current_user_role
    FROM staff
    WHERE user_id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin', 'medical_director', 'config_admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can create new users.';
    END IF;

    -- Get instance_id from current user or default
    SELECT instance_id INTO v_instance_id FROM auth.users WHERE id = auth.uid();
    IF v_instance_id IS NULL THEN
        v_instance_id := '00000000-0000-0000-0000-000000000000';
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
        recovery_token,
        is_super_admin
    ) VALUES (
        v_instance_id,
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
        NULL, -- Use NULL instead of empty string
        NULL, -- Use NULL instead of empty string
        FALSE
    );

    -- 4. Insert into auth.identities (Required for Supabase Auth to work correctly with email provider)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object(
            'sub', new_user_id,
            'email', email_address,
            'email_verified', true,
            'phone_verified', false
        ),
        'email',
        new_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    RETURN new_user_id;
END;
$$;

-- 5. Fix existing users that are missing identities
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM auth.users WHERE id NOT IN (SELECT user_id FROM auth.identities) LOOP
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            r.id,
            jsonb_build_object(
                'sub', r.id,
                'email', r.email,
                'email_verified', true,
                'phone_verified', false
            ),
            'email',
            r.id::text,
            NOW(),
            NOW(),
            NOW()
        );
    END LOOP;
END $$;
