-- This script UPDATES the existing prashantk@amplior.com user
-- It sets their password to 'amp@12345' and grants them SUPREME ADMIN access.

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- 1. Find the user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'prashantk@amplior.com';

  IF target_user_id IS NOT NULL THEN
      -- 2. Update their password to amp@12345 and force-confirm their email
      UPDATE auth.users 
      SET 
        encrypted_password = crypt('amp@12345', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = '{"name":"Supreme Admin","role":"Admin"}'
      WHERE id = target_user_id;

      -- 3. Upgrade their CRM profile to Supreme Admin
      INSERT INTO public.users (id, email, name, role, status)
      VALUES (target_user_id, 'prashantk@amplior.com', 'Supreme Admin', 'Admin', 'Active')
      ON CONFLICT (id) DO UPDATE 
      SET role = 'Admin', name = 'Supreme Admin', status = 'Active';

      -- 4. Give them maximum starting credits
      INSERT INTO public.credits (user_id, balance)
      VALUES (target_user_id, 999999)
      ON CONFLICT (user_id) DO UPDATE SET balance = 999999;
  END IF;

END $$;
