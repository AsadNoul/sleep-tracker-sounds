-- Add country column to user_profiles table
-- Run this in Supabase SQL Editor if the column doesn't exist

-- Check if column exists, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN country VARCHAR(2);
    COMMENT ON COLUMN user_profiles.country IS 'ISO 3166-1 alpha-2 country code';
  END IF;
END $$;

-- Create index for faster country filtering in admin dashboard
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
