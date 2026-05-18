-- 1. Safely DELETE the typo account by removing its dependencies first
DELETE FROM public.credits 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@ampior.com');

DELETE FROM public.users 
WHERE email = 'admin@ampior.com';

DELETE FROM auth.users 
WHERE email = 'admin@ampior.com';

-- 2. FORCE password and verify email for admin@amplior.com
UPDATE auth.users 
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'admin@amplior.com';

-- 3. ENSURE admin@amplior.com is a Supreme Admin in the CRM
INSERT INTO public.users (id, email, name, role, status)
SELECT id, email, 'Supreme Admin', 'Admin', 'Active'
FROM auth.users WHERE email = 'admin@amplior.com'
ON CONFLICT (id) DO UPDATE SET role = 'Admin', status = 'Active';

-- 4. FORCE password and verify email for prashantk@amplior.com
UPDATE auth.users 
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'prashantk@amplior.com';

-- 5. ENSURE prashantk@amplior.com is also a Supreme Admin in the CRM
INSERT INTO public.users (id, email, name, role, status)
SELECT id, email, 'Prashant', 'Admin', 'Active'
FROM auth.users WHERE email = 'prashantk@amplior.com'
ON CONFLICT (id) DO UPDATE SET role = 'Admin', status = 'Active';
