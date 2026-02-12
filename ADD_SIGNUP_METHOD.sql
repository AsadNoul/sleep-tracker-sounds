-- Add signup_method column to user_profiles table
-- Run this in Supabase SQL Editor if the column doesn't exist

-- Check if column exists, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'signup_method'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN signup_method VARCHAR(20);
    COMMENT ON COLUMN user_profiles.signup_method IS 'Method used to sign up: email, google, apple';
  END IF;
END $$;

-- Create index for faster filtering in admin dashboard
CREATE INDEX IF NOT EXISTS idx_user_profiles_signup_method ON user_profiles(signup_method);
