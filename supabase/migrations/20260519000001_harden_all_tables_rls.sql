-- =============================================
-- Migration: Harden All Tables Row Level Security (RLS) & Add Audit Logging
-- Path: AL Prospect Finder Web App/supabase/migrations/20260519000001_harden_all_tables_rls.sql
-- Description: Sets up enterprise-grade RLS protection for all tables and automatically logs administrative changes.
-- =============================================

-- ══════════════════════════════════════════════
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ══════════════════════════════════════════════

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

-- ══════════════════════════════════════════════
-- 2. CREATE AUDIT LOGS INFRASTRUCTURE
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id uuid,
  action text NOT NULL,
  previous_value text,
  new_value text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if present
DROP POLICY IF EXISTS "audit_logs_read" ON public.audit_logs;

-- Policies for audit_logs
CREATE POLICY "audit_logs_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- Automated triggers to populate audit logs
CREATE OR REPLACE FUNCTION public.audit_user_changes()
RETURNS trigger SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
  actor uuid;
BEGIN
  -- Determine who made the change (if authenticated)
  actor := auth.uid();
  
  -- 1. Track UPDATE action (role, status modifications)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO public.audit_logs (actor_id, target_user_id, action, previous_value, new_value)
      VALUES (actor, NEW.id, 'ROLE_CHANGE', OLD.role, NEW.role);
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (actor_id, target_user_id, action, previous_value, new_value)
      VALUES (actor, NEW.id, 'STATUS_CHANGE', OLD.status, NEW.status);
    END IF;
  
  -- 2. Track DELETE action
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, target_user_id, action, previous_value, new_value)
    VALUES (actor, OLD.id, 'USER_DELETION', OLD.role, NULL);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate update trigger
DROP TRIGGER IF EXISTS tr_audit_user_update ON public.users;
CREATE TRIGGER tr_audit_user_update
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_changes();

-- Drop and recreate delete trigger
DROP TRIGGER IF EXISTS tr_audit_user_delete ON public.users;
CREATE TRIGGER tr_audit_user_delete
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_changes();

-- ══════════════════════════════════════════════
-- 3. HARDEN USERS POLICY (users)
-- ══════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- SELECT
CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- INSERT
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- UPDATE
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- DELETE
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

-- ══════════════════════════════════════════════
-- 4. HARDEN TEAMS POLICY (teams)
-- ══════════════════════════════════════════════

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_read" ON public.teams;
DROP POLICY IF EXISTS "teams_write" ON public.teams;
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;

-- SELECT
CREATE POLICY "teams_read" ON public.teams FOR SELECT TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE
CREATE POLICY "teams_write" ON public.teams FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ══════════════════════════════════════════════
-- 5. HARDEN PROSPECTS POLICY (prospects)
-- ══════════════════════════════════════════════

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_read" ON public.prospects;
DROP POLICY IF EXISTS "prospects_write" ON public.prospects;
DROP POLICY IF EXISTS "prospects_select" ON public.prospects;
DROP POLICY IF EXISTS "prospects_insert" ON public.prospects;
DROP POLICY IF EXISTS "prospects_update" ON public.prospects;
DROP POLICY IF EXISTS "prospects_delete" ON public.prospects;

-- SELECT
CREATE POLICY "prospects_read" ON public.prospects FOR SELECT TO authenticated
  USING (
    public.is_admin() 
    OR team_id IS NULL 
    OR team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- INSERT
CREATE POLICY "prospects_insert" ON public.prospects FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- UPDATE
CREATE POLICY "prospects_update" ON public.prospects FOR UPDATE TO authenticated
  USING (
    public.is_admin() 
    OR team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    public.is_admin() 
    OR team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

-- DELETE
CREATE POLICY "prospects_delete" ON public.prospects FOR DELETE TO authenticated
  USING (public.is_admin());

-- ══════════════════════════════════════════════
-- 6. HARDEN CREDITS POLICY (credits)
-- ══════════════════════════════════════════════

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credits_read" ON public.credits;
DROP POLICY IF EXISTS "credits_write" ON public.credits;
DROP POLICY IF EXISTS "credits_select" ON public.credits;
DROP POLICY IF EXISTS "credits_insert" ON public.credits;
DROP POLICY IF EXISTS "credits_update" ON public.credits;

-- SELECT
CREATE POLICY "credits_read" ON public.credits FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- INSERT
CREATE POLICY "credits_insert" ON public.credits FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE
CREATE POLICY "credits_update" ON public.credits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ══════════════════════════════════════════════
-- 7. HARDEN AI MODELS POLICY (ai_models)
-- ══════════════════════════════════════════════

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_models_read" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_write" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_select" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_insert" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_update" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_delete" ON public.ai_models;

-- SELECT
CREATE POLICY "ai_models_read" ON public.ai_models FOR SELECT TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE
CREATE POLICY "ai_models_write" ON public.ai_models FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ══════════════════════════════════════════════
-- 8. HARDEN PRODUCTS POLICY (products)
-- ══════════════════════════════════════════════

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_read" ON public.products;
DROP POLICY IF EXISTS "products_write" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

-- SELECT: Global products or user's team products
CREATE POLICY "products_read" ON public.products FOR SELECT TO authenticated
  USING (
    public.is_admin() 
    OR team_id = '' 
    OR team_id IS NULL 
    OR team_id = (SELECT team_id::text FROM public.users WHERE id = auth.uid())
    OR (SELECT team_id::text FROM public.users WHERE id = auth.uid()) = ANY(team_ids)
  );

-- INSERT / UPDATE / DELETE
CREATE POLICY "products_write" ON public.products FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ══════════════════════════════════════════════
-- 9. HARDEN PERSONAS POLICY (personas)
-- ══════════════════════════════════════════════

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personas_read" ON public.personas;
DROP POLICY IF EXISTS "personas_write" ON public.personas;
DROP POLICY IF EXISTS "personas_select" ON public.personas;
DROP POLICY IF EXISTS "personas_insert" ON public.personas;
DROP POLICY IF EXISTS "personas_update" ON public.personas;
DROP POLICY IF EXISTS "personas_delete" ON public.personas;

-- SELECT: Global personas or user's team personas
CREATE POLICY "personas_read" ON public.personas FOR SELECT TO authenticated
  USING (
    public.is_admin() 
    OR team_id = '' 
    OR team_id IS NULL 
    OR team_id = (SELECT team_id::text FROM public.users WHERE id = auth.uid())
    OR (SELECT team_id::text FROM public.users WHERE id = auth.uid()) = ANY(team_ids)
  );

-- INSERT / UPDATE / DELETE
CREATE POLICY "personas_write" ON public.personas FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ══════════════════════════════════════════════
-- 10. HARDEN CONTACT REQUESTS POLICY (contact_requests)
-- ══════════════════════════════════════════════

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_requests_all" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_select" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_insert" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_update" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_delete" ON public.contact_requests;

-- SELECT
CREATE POLICY "contact_requests_read" ON public.contact_requests FOR SELECT TO authenticated
  USING (
    public.is_admin() 
    OR team_id = '' 
    OR team_id IS NULL 
    OR team_id = (SELECT team_id::text FROM public.users WHERE id = auth.uid())
  );

-- INSERT
CREATE POLICY "contact_requests_insert" ON public.contact_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() 
    OR team_id = '' 
    OR team_id IS NULL 
    OR team_id = (SELECT team_id::text FROM public.users WHERE id = auth.uid())
  );

-- UPDATE
CREATE POLICY "contact_requests_update" ON public.contact_requests FOR UPDATE TO authenticated
  USING (
    public.is_admin() 
    OR team_id = (SELECT team_id::text FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    public.is_admin() 
    OR team_id = (SELECT team_id::text FROM public.users WHERE id = auth.uid())
  );

-- DELETE
CREATE POLICY "contact_requests_delete" ON public.contact_requests FOR DELETE TO authenticated
  USING (public.is_admin());

-- ══════════════════════════════════════════════
-- 11. ROLE ESCALATION & PROFILE MUTATION SAFETY TRIGGER
-- ══════════════════════════════════════════════

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

