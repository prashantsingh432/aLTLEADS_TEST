DO $$
DECLARE
    super_admin_id uuid;
BEGIN
    -- Check if user already exists
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'superadmin@amplior.com';

    IF super_admin_id IS NULL THEN
        -- Create new UUID for the user
        super_admin_id := gen_random_uuid();
        
        -- Insert into auth.users (Supabase Authentication)
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            super_admin_id,
            'authenticated',
            'authenticated',
            'superadmin@amplior.com',
            extensions.crypt('superadmin@amplior.com', extensions.gen_salt('bf')),
            current_timestamp,
            current_timestamp,
            current_timestamp,
            '{"provider": "email", "providers": ["email"]}',
            '{}'
        );
    ELSE
        -- Update password if user already exists
        UPDATE auth.users 
        SET encrypted_password = extensions.crypt('superadmin@amplior.com', extensions.gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, current_timestamp)
        WHERE id = super_admin_id;
    END IF;

    -- Upsert into public.users (Your App's Database) with the 'Admin' role
    INSERT INTO public.users (id, email, name, role)
    VALUES (super_admin_id, 'superadmin@amplior.com', 'Super Admin', 'Admin')
    ON CONFLICT (id) DO UPDATE SET 
        role = 'Admin',
        name = 'Super Admin';
        
END $$;
