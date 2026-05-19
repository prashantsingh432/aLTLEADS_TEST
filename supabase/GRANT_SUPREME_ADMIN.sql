-- =========================================================================
-- Script: Grant Supreme Admin & Establish Production-Grade Role Hierarchy
-- Path: AL Prospect Finder Web App/supabase/GRANT_SUPREME_ADMIN.sql
-- Description: Run this SQL directly in your Supabase Dashboard SQL Editor.
-- =========================================================================

-- 1. Ensure RLS is enabled on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create optimized, non-recursive security helpers
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN' 
      AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND (role = 'Admin' OR role = 'SUPER_ADMIN')
      AND status = 'Active'
  );
END;
$$;

-- 3. Drop existing RLS policies on public.users to prevent conflicts
DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;
DROP POLICY IF EXISTS "users_policy" ON public.users;

-- 4. Re-create hardened RLS Policies matching the hierarchy
-- SELECT: Users can read their own profile, or Admins can read all profiles
CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- INSERT: Anyone authenticated can insert their own profile on signup, or Admins
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- UPDATE: Users can update their own profile, or Admins can update any profile (subject to triggers)
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- DELETE: Only SUPER_ADMIN can delete anyone, Admins can delete standard users
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated
  USING (
    public.is_super_admin() 
    OR (
      public.is_admin() 
      AND NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = users.id 
          AND (role = 'SUPER_ADMIN' OR role = 'Admin')
      )
    )
  );

-- 5. Establish Hierarchy & Safety Net Trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  curr_user_role text;
BEGIN
  -- If there is a logged-in user, check their role
  IF auth.uid() IS NOT NULL THEN
    -- Get current logged-in user's role
    SELECT role INTO curr_user_role FROM public.users WHERE id = auth.uid();
    
    -- SUPER_ADMIN is completely unrestricted (bypass all triggers)
    IF curr_user_role = 'SUPER_ADMIN' THEN
      RETURN NEW;
    END IF;

    -- Admins are restricted: cannot mutate SUPER_ADMIN profiles or elevate users to SUPER_ADMIN
    IF curr_user_role = 'Admin' THEN
      IF OLD.role = 'SUPER_ADMIN' OR NEW.role = 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Access Denied: Admins cannot modify Super Admin profiles or elevate users to SUPER_ADMIN.';
      END IF;
      
      IF OLD.id <> auth.uid() AND OLD.role = 'Admin' THEN
        RAISE EXCEPTION 'Access Denied: Admins cannot update other Admin profiles.';
      END IF;
      
      RETURN NEW;
    END IF;

    -- Standard users restrictions
    -- 1. Cannot update other users' profiles
    IF OLD.id <> auth.uid() THEN
      RAISE EXCEPTION 'Access Denied: Standard users cannot update other profiles.';
    END IF;

    -- 2. Cannot escalate their own role or change status
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: Standard users are not permitted to change system roles.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Access Denied: Standard users are not permitted to change system status.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.users;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 6. Elevate admin@amplior.com to SUPER_ADMIN role
INSERT INTO public.users (id, email, name, role, status)
SELECT id, email, 'Super Admin', 'SUPER_ADMIN', 'Active'
FROM auth.users
WHERE email = 'admin@amplior.com'
ON CONFLICT (id) DO UPDATE 
SET 
    role = 'SUPER_ADMIN',
    name = 'Super Admin',
    status = 'Active';
