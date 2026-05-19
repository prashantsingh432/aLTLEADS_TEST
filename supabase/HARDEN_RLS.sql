-- =============================================
-- Script: Harden Users Row Level Security (RLS)
-- Path: AL Prospect Finder Web App/supabase/HARDEN_RLS.sql
-- Description: Run this SQL directly in your Supabase Dashboard SQL Editor.
-- =============================================

-- 1. Ensure RLS is enabled on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
DROP POLICY IF EXISTS "users_policy" ON public.users;

-- 3. Create non-recursive security helper to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'Admin' 
      AND status = 'Active'
  );
END;
$$;

-- 4. Create RLS Policies
-- SELECT: Users can read their own profile, or Admins can read all profiles
CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- INSERT: Anyone authenticated can insert their own profile on signup, or Admins
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- UPDATE: Users can update their own profile, or Admins can update any profile
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- DELETE: Only active Admins can delete user profiles
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated
  USING (public.is_admin());


-- 5. Trigger-based Safety Net: Prevent Non-Admins from Elevating Roles or Changing Statuses
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  -- If there is a logged-in user, check if they are an admin
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
        AND role = 'Admin' 
        AND status = 'Active'
    ) THEN
      -- If they are trying to edit someone else's record, block completely
      IF OLD.id <> auth.uid() THEN
        RAISE EXCEPTION 'Access Denied: Standard users cannot update other profiles.';
      END IF;

      -- If they are editing their own record, block role or status modifications
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Access Denied: Standard users are not permitted to change system roles.';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Access Denied: Standard users are not permitted to change system status.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.users;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
