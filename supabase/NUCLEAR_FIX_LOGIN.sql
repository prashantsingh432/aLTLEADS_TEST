-- =============================================
-- NUCLEAR FIX: Run this in Supabase SQL Editor
-- This FORCEFULLY resets passwords and confirms emails
-- =============================================

-- 1. FORCE confirm ALL user emails (including existing ones)
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. RESET password for prashantk@amplior.com to "amplior@12345"
UPDATE auth.users
SET 
  encrypted_password = crypt('amplior@12345', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'prashantk@amplior.com';

-- 3. RESET password for ankits@amplior.com to "amplior@12345"
UPDATE auth.users
SET 
  encrypted_password = crypt('amplior@12345', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'ankits@amplior.com';

-- 4. Verify: Check what we have now
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC;
