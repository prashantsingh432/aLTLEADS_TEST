-- ============================================================
-- FIX PROSPECT DELETE RLS
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop the existing restrictive prospects_delete policy
DROP POLICY IF EXISTS "prospects_delete" ON public.prospects;
DROP POLICY IF EXISTS "prospects_delete_admin" ON public.prospects;

-- Create a permissive delete policy: any authenticated Admin or SUPER_ADMIN can delete
-- This uses public.is_admin() which already includes both Admin and SUPER_ADMIN roles
CREATE POLICY "prospects_delete"
  ON public.prospects FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Also verify the is_admin() function is correct (covers both roles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (role = 'Admin' OR role = 'SUPER_ADMIN')
      AND status = 'Active'
  );
$$;

-- Confirm: show the current prospects RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'prospects'
ORDER BY cmd;
