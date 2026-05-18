-- =================================================================================
-- AUTOMATIC EMAIL VERIFICATION BYPASS
-- This script creates a trigger that instantly verifies any new user's email 
-- the moment they sign up, completely bypassing the need for confirmation emails.
-- =================================================================================

-- 1. Create the function that automatically confirms the email
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  -- Immediately set the email_confirmed_at timestamp to now()
  NEW.email_confirmed_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the trigger if it already exists to avoid duplicates
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;

-- 3. Attach the trigger to the auth.users table
CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- Note: 
-- You ALSO have a handle_new_user() trigger that creates the profile in public.users.
-- This new trigger will run BEFORE insert to make sure they are instantly verified 
-- before anything else happens!
