-- ======================================================
-- MASTER AUTH & USER SYNC SCRIPT (RECOVERY MODE)
-- Run this in Supabase SQL Editor
-- ======================================================

-- 1. CLEANUP ORPHANED TYPOS
-- This removes any users that have typo emails to prevent confusion.
DELETE FROM public.users WHERE email = 'admin@ampior.com';
-- Note: auth.users deletion should be done via Dashboard if possible, 
-- but this script focuses on public visibility and role forcing.

-- 2. FORCE ADMIN ROLES & SYNC IDS
-- This ensures that your primary accounts are set as ADMIN in the public schema.
-- We use an UPSERT-like logic to ensure they exist with the correct role.

-- First, get the IDs from auth.users (if they exist) and update public.users
-- This is a "healing" query.
UPDATE public.users p
SET 
  role = 'Admin',
  status = 'Active'
FROM auth.users a
WHERE p.id = a.id
  AND a.email IN ('admin@amplior.com', 'prashantk@amplior.com', 'prashant.k@amplior.com');

-- 3. RESET PASSWORDS (SUPABASE COMPATIBLE)
-- Using the standard Supabase crypt hashing.
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = now(),
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"Admin"'
  )
WHERE email IN ('admin@amplior.com', 'prashantk@amplior.com', 'prashant.k@amplior.com');

-- 4. ENSURE PUBLIC.USERS ENTRIES EXIST
-- If they exist in auth but not in public, this creates them.
INSERT INTO public.users (id, email, name, role, status)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  'Admin',
  'Active'
FROM auth.users
WHERE email IN ('admin@amplior.com', 'prashantk@amplior.com', 'prashant.k@amplior.com')
ON CONFLICT (id) DO UPDATE 
SET role = 'Admin', status = 'Active';

-- 5. FIX RLS FOR PUBLIC.USERS
-- Ensuring the policies are exactly right.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read" ON public.users;
CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (true);

-- 6. VERIFY RESULTS
SELECT id, email, role, name FROM public.users;
