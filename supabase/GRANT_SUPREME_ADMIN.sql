-- This script forcefully hardcodes prashantk@amplior.com as the SUPREME ADMIN
-- Even if the user already exists in public.users, it will OVERWRITE their role and name to guarantee access.

-- 1. Ensure prashantk@amplior.com exists in the public.users table and is an ADMIN
INSERT INTO public.users (id, email, name, role, status)
SELECT id, email, 'Supreme Admin', 'Admin', 'Active'
FROM auth.users
WHERE email = 'prashantk@amplior.com'
ON CONFLICT (id) DO UPDATE 
SET 
    role = 'Admin',
    name = 'Supreme Admin',
    status = 'Active';

-- 2. Ensure they bypass all RLS policies (just in case)
-- (Your existing RLS policies in STEP2_rls_and_triggers.sql already allow full read/write for authenticated users, 
--  but this ensures the frontend 'Role.ADMIN' constant matches exactly what is in the database)
