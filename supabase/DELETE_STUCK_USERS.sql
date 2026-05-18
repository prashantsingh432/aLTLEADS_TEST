-- Run this in the Supabase SQL Editor to completely delete the stuck accounts
-- This will allow you to log in from the frontend again (which will automatically recreate them cleanly)

-- 1. Delete from public.users first (just in case foreign keys don't cascade)
DELETE FROM public.users 
WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com');

-- 2. Delete from auth.users (the actual authentication accounts)
DELETE FROM auth.users 
WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com');

-- Check if they are gone (this should return 0 rows)
SELECT id, email FROM auth.users WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com');
