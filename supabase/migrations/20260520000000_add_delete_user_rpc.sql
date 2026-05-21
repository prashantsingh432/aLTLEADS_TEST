-- ============================================================================
-- Migration: Add Admin Deletion RPC
-- Path: AL Prospect Finder Web App/supabase/migrations/20260520000000_add_delete_user_rpc.sql
-- Description: Creates a secure RPC function that allows authenticated Admins and Super Admins to permanently delete users from both auth.users and public.users.
-- ============================================================================
DROP FUNCTION IF EXISTS public.delete_user_by_admin(uuid);

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  executor_role text;
  target_role text;
BEGIN
  -- 1. Check if the executor is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Unauthenticated.';
  END IF;

  -- 2. Get executor's role from public.users
  SELECT role INTO executor_role FROM public.users WHERE id = auth.uid();
  
  -- 3. Get target user's role from public.users
  SELECT role INTO target_role FROM public.users WHERE id = target_user_id;

  -- 4. Check if executor is Admin or SUPER_ADMIN
  IF executor_role NOT IN ('Admin', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only Admins or Super Admins can delete users.';
  END IF;

  -- 5. Safeguard: Non-SUPER_ADMIN cannot delete a SUPER_ADMIN
  IF target_role = 'SUPER_ADMIN' AND executor_role <> 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Access Denied: Only Super Admins can delete other Super Admins.';
  END IF;

  -- 6. Safeguard: A user cannot delete themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Access Denied: You cannot delete your own account.';
  END IF;

  -- 7. Execute deletion from auth.users (triggers cascading delete to public.users & credits via the BEFORE DELETE trigger)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
