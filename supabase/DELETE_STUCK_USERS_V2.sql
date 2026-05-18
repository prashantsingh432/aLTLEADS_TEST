-- Run this in the Supabase SQL Editor to completely delete the stuck accounts
-- This script removes dependencies first to avoid foreign key constraints

-- 1. Get the IDs and delete from credits
DELETE FROM public.credits 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com')
);

-- 2. Delete from profile_views (if any)
DELETE FROM public.profile_views 
WHERE agent_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com')
);

-- 3. Delete from comments (if any)
DELETE FROM public.comments 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com')
);

-- 4. Delete from public.users
DELETE FROM public.users 
WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com');

-- 5. Finally, delete from auth.users (the actual authentication accounts)
DELETE FROM auth.users 
WHERE email IN ('prashantk@amplior.com', 'ankits@amplior.com');
