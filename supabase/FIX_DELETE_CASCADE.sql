-- =============================================================
-- FIX_DELETE_CASCADE.sql
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This fixes the "Database error deleting user" error by adding
-- ON DELETE CASCADE to all foreign keys referencing auth.users
-- =============================================================

-- STEP 1: Add a trigger so deleting from auth.users
--         automatically removes the row from public.users
-- (This is the root cause of the error — auth.users tries to
--  delete but public.users has a FK pointing back at it)

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Nullify created_by_uid in prospects (preserve the data, just unlink the user)
  UPDATE public.prospects
  SET created_by_uid = NULL
  WHERE created_by_uid = OLD.id;

  -- Delete user's credits
  DELETE FROM public.credits WHERE user_id = OLD.id;

  -- Delete the public.users profile
  DELETE FROM public.users WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

-- Drop existing trigger if it already exists (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create the trigger that fires BEFORE delete on auth.users
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();

-- STEP 2: Fix the FK constraint on public.credits to cascade
--         when a public.users row is deleted
ALTER TABLE public.credits
  DROP CONSTRAINT IF EXISTS credits_user_id_fkey;

ALTER TABLE public.credits
  ADD CONSTRAINT credits_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- STEP 3: Fix the FK on prospects.created_by_uid to SET NULL
--         (we don't want to delete prospects just because a user left)
ALTER TABLE public.prospects
  DROP CONSTRAINT IF EXISTS prospects_created_by_uid_fkey;

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_created_by_uid_fkey
  FOREIGN KEY (created_by_uid)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- Done! You can now delete users from the Supabase Auth dashboard.
-- The deletion order will be:
--   1. Trigger fires → clears credits + nullifies prospect links
--   2. public.users row is deleted
--   3. auth.users row is deleted ✅
SELECT 'FIX_DELETE_CASCADE applied successfully ✅' AS status;
