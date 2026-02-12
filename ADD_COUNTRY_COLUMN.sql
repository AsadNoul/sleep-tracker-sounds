-- Add country column to user_profiles table for IP-based country tracking
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);

-- Add index for faster country-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country_code ON user_profiles(country_code);

-- Add comment to explain the columns
COMMENT ON COLUMN user_profiles.country IS 'User country name detected from IP address';
COMMENT ON COLUMN user_profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, GB, IN)';
COMMENT ON COLUMN user_profiles.ip_address IS 'Last known IP address of the user';
