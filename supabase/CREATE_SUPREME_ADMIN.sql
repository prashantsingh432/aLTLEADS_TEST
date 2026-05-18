-- This script COMPLETELY CREATES the prashantk@amplior.com user from scratch 
-- with the password 'amp@12345' and grants them SUPREME ADMIN access.

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- 1. Create the user in auth.users (the login system)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'prashantk@amplior.com',
    crypt('amp@12345', gen_salt('bf')), -- Sets the password to amp@12345
    now(), -- Auto-confirms the email!
    '{"provider":"email","providers":["email"]}',
    '{"name":"Supreme Admin","role":"Admin"}',
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- 2. Create the user in public.users (the CRM profile)
  INSERT INTO public.users (id, email, name, role, status)
  VALUES (
    new_user_id,
    'prashantk@amplior.com',
    'Supreme Admin',
    'Admin',
    'Active'
  )
  ON CONFLICT (id) DO UPDATE 
  SET role = 'Admin', name = 'Supreme Admin', status = 'Active';

  -- 3. Give them maximum starting credits just in case
  INSERT INTO public.credits (user_id, balance)
  VALUES (new_user_id, 999999)
  ON CONFLICT (user_id) DO UPDATE 
  SET balance = 999999;

END $$;
