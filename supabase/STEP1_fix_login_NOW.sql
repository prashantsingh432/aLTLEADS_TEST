-- =============================================
-- STEP 1: RUN THIS FIRST — Fixes login immediately
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Paste this and click RUN
-- =============================================

-- 1. Confirm ALL existing user emails so they can log in
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. Add missing columns to public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_keys jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS model_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'Agent';

-- 3. Ensure YOUR admin account exists in public.users with correct role
INSERT INTO public.users (id, email, name, role, status)
SELECT id, email, 'Prashant K', 'Admin', 'Active'
FROM auth.users
WHERE email = 'prashantk@amplior.com'
ON CONFLICT (id) DO UPDATE SET role = 'Admin', status = 'Active';

-- 4. Ensure ankits account also has a public.users row
INSERT INTO public.users (id, email, name, role, status)
SELECT id, email, 'Ankit Sundriyal', 'Agent', 'Active'
FROM auth.users
WHERE email = 'ankits@amplior.com'
ON CONFLICT (id) DO NOTHING;

-- 5. Fix anyone with old role values
UPDATE public.users SET role = 'Agent' WHERE role = 'user' OR role IS NULL OR role = '';
