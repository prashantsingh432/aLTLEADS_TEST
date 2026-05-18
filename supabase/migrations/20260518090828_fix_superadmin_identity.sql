DO $$
DECLARE
    super_admin_id uuid;
BEGIN
    SELECT id INTO super_admin_id FROM auth.users WHERE email = 'superadmin@amplior.com';

    IF super_admin_id IS NOT NULL THEN
        -- GoTrue requires an identity row to allow login.
        INSERT INTO auth.identities (
            id,
            user_id,
            provider_id,
            identity_data,
            provider,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            super_admin_id,
            super_admin_id::text,
            format('{"sub": "%s", "email": "%s"}', super_admin_id, 'superadmin@amplior.com')::jsonb,
            'email',
            current_timestamp,
            current_timestamp
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
