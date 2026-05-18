-- =============================================================================
-- AltLeads CRM - Complete Backend Fix & Sync Script
-- Run this ENTIRE file in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================


-- =============================================================================
-- STEP 1: Fix public.users table — Add all missing columns
-- =============================================================================

-- Add status column (Active / Inactive)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';

-- Make role default to 'Agent' (was 'user' before, which breaks role checks)
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'Agent';

-- Add JSONB columns for API keys, model config, and preferences
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS api_keys jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS model_config jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Add last_login timestamp
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;


-- =============================================================================
-- STEP 2: Fix existing users that have role='user' (old default) → 'Agent'
-- =============================================================================

UPDATE public.users
  SET role = 'Agent'
  WHERE role = 'user' OR role IS NULL OR role = '';

-- Ensure your super-admin account has Admin role
UPDATE public.users
  SET role = 'Admin', status = 'Active'
  WHERE email = 'prashantk@amplior.com';


-- =============================================================================
-- STEP 3: Row Level Security (RLS) Policies
-- These are CRITICAL — without them, the anon/authenticated key cannot read or
-- write anything even though the tables exist.
-- =============================================================================

-- ── Users Table ──────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (so we can recreate cleanly)
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_own"           ON public.users;
DROP POLICY IF EXISTS "users_update_own"           ON public.users;
DROP POLICY IF EXISTS "users_update_admin"         ON public.users;

-- Any logged-in user can read the users table (needed for team lists, etc.)
CREATE POLICY "users_select_authenticated"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- A user can insert their own row (triggered on first login)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- A user can update their own row (for saving preferences, etc.)
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admin can update ANY user row (for role changes, status, etc.)
-- We check the role from the users table for the current session user.
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );


-- ── Teams Table ───────────────────────────────────────────────────────────────
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_select_authenticated" ON public.teams;
DROP POLICY IF EXISTS "teams_all_admin"            ON public.teams;

CREATE POLICY "teams_select_authenticated"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teams_all_admin"
  ON public.teams FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );


-- ── Prospects Table ───────────────────────────────────────────────────────────
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_select_authenticated" ON public.prospects;
DROP POLICY IF EXISTS "prospects_insert_authenticated" ON public.prospects;
DROP POLICY IF EXISTS "prospects_update_authenticated" ON public.prospects;
DROP POLICY IF EXISTS "prospects_delete_admin"         ON public.prospects;

-- All logged-in users can view prospects
CREATE POLICY "prospects_select_authenticated"
  ON public.prospects FOR SELECT
  TO authenticated
  USING (true);

-- All logged-in users can add prospects
CREATE POLICY "prospects_insert_authenticated"
  ON public.prospects FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All logged-in users can update prospects
CREATE POLICY "prospects_update_authenticated"
  ON public.prospects FOR UPDATE
  TO authenticated
  USING (true);

-- Only admins can delete prospects
CREATE POLICY "prospects_delete_admin"
  ON public.prospects FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );


-- ── Credits Table ─────────────────────────────────────────────────────────────
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credits_select_own"     ON public.credits;
DROP POLICY IF EXISTS "credits_select_admin"   ON public.credits;
DROP POLICY IF EXISTS "credits_insert_own"     ON public.credits;
DROP POLICY IF EXISTS "credits_update_own"     ON public.credits;
DROP POLICY IF EXISTS "credits_update_admin"   ON public.credits;

-- A user can always read their own credits
CREATE POLICY "credits_select_own"
  ON public.credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can read ALL credits (for the User Directory tab)
CREATE POLICY "credits_select_admin"
  ON public.credits FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "credits_insert_own"
  ON public.credits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credits_update_own"
  ON public.credits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "credits_update_admin"
  ON public.credits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );


-- ── AI Models Table ───────────────────────────────────────────────────────────
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_models_select_authenticated" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_all_admin"            ON public.ai_models;

CREATE POLICY "ai_models_select_authenticated"
  ON public.ai_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ai_models_all_admin"
  ON public.ai_models FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );


-- ── Products Table ────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_all_admin"            ON public.products;

CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_all_admin"
  ON public.products FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );


-- ── Personas Table ────────────────────────────────────────────────────────────
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personas_select_authenticated" ON public.personas;
DROP POLICY IF EXISTS "personas_all_admin"            ON public.personas;

CREATE POLICY "personas_select_authenticated"
  ON public.personas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "personas_all_admin"
  ON public.personas FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
  );


-- ── Contact Requests Table ────────────────────────────────────────────────────
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_requests_all_authenticated" ON public.contact_requests;

CREATE POLICY "contact_requests_all_authenticated"
  ON public.contact_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── Profile Views Table ───────────────────────────────────────────────────────
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_views_all_authenticated" ON public.profile_views;

CREATE POLICY "profile_views_all_authenticated"
  ON public.profile_views FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- STEP 4: Admin User Creation Function
-- This is the KEY FIX for "Add User" not working.
-- The anon key cannot bypass email confirmation.
-- This Postgres function runs with SECURITY DEFINER (as superuser) and
-- auto-confirms the email so users can log in immediately.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_crm_user(
  user_email    text,
  user_password text,
  user_name     text,
  user_role     text DEFAULT 'Agent',
  user_team_id  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as the DB superuser, bypasses RLS
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only allow Admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins can create users.';
  END IF;

  -- Create the auth user with email already confirmed (no confirmation email sent)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  VALUES (
    gen_random_uuid(),
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),            -- ← This auto-confirms the email!
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', user_name),
    false,
    'authenticated'
  )
  RETURNING id INTO new_user_id;

  -- Insert the user profile into public.users
  INSERT INTO public.users (id, email, name, role, status, team_id)
  VALUES (new_user_id, user_email, user_name, user_role, 'Active', user_team_id);

  RETURN new_user_id;
END;
$$;

-- Grant execute permission to authenticated users (the admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.create_crm_user TO authenticated;


-- =============================================================================
-- STEP 5: Update user role/status function (for Admin edits)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id  uuid,
  new_name        text DEFAULT NULL,
  new_role        text DEFAULT NULL,
  new_status      text DEFAULT NULL,
  new_team_id     uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow Admins
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins can update users.';
  END IF;

  UPDATE public.users
  SET
    name    = COALESCE(new_name,    name),
    role    = COALESCE(new_role,    role),
    status  = COALESCE(new_status,  status),
    team_id = COALESCE(new_team_id, team_id)
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated;


-- =============================================================================
-- STEP 6: Disable email confirmation requirement (Auth settings)
-- NOTE: You ALSO need to do this in Supabase Dashboard:
--   Authentication > Settings > Email Auth > "Confirm email" = OFF
-- The SQL below sets it for any future signups via a trigger:
-- =============================================================================

-- Auto-confirm any user inserted into auth.users (belt-and-suspenders)
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-set email_confirmed_at if null (for users created via signup)
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;

CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();


-- =============================================================================
-- DONE! Summary of what this script fixed:
-- 1. Added missing columns: status, api_keys, model_config, preferences, last_login
-- 2. Fixed old role='user' → role='Agent' for all existing users
-- 3. Set your admin email (prashantk@amplior.com) to role='Admin'
-- 4. Created full RLS policies for ALL tables (SELECT / INSERT / UPDATE / DELETE)
-- 5. Created create_crm_user() function that auto-confirms emails → users can log in immediately
-- 6. Created admin_update_user() function for role/status changes
-- 7. Added auto_confirm_email trigger so ALL new signups are auto-confirmed
-- =============================================================================
