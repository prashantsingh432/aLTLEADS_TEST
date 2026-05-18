-- =================================================================================
-- ⚠️ DANGER: NUCLEAR PURGE SCRIPT ⚠️
-- This script completely empties the database of EVERY SINGLE USER.
-- It wipes dependencies (credits) first, then wipes public.users,
-- and finally wipes auth.users.
-- =================================================================================

-- 1. Wipe all dependent user data (prevent foreign key errors)
DELETE FROM public.credits;

-- 2. Wipe all CRM profiles
DELETE FROM public.users;

-- 3. Wipe all actual authentication accounts (passwords, emails, etc)
DELETE FROM auth.users;

-- Verification (should return 0)
SELECT count(*) as remaining_auth_users FROM auth.users;
SELECT count(*) as remaining_public_users FROM public.users;
