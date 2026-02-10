-- SQL Updates for Enhanced Onboarding
-- Run these commands in your Supabase SQL Editor

-- 1. Add new fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_preset VARCHAR(50),
ADD COLUMN IF NOT EXISTS profession VARCHAR(100),
ADD COLUMN IF NOT EXISTS onboarding_version INTEGER DEFAULT 2;

-- 2. Update existing records to set version
UPDATE user_profiles 
SET onboarding_version = 1 
WHERE onboarding_completed_at IS NOT NULL 
AND onboarding_version IS NULL;

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_profession 
ON user_profiles(profession);

CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_preset 
ON user_profiles(onboarding_preset);

-- 4. Add comment for documentation
COMMENT ON COLUMN user_profiles.onboarding_preset IS 'Selected preset: healthcare, night_shift, insomnia, or custom';
COMMENT ON COLUMN user_profiles.profession IS 'User profession for targeted features';
COMMENT ON COLUMN user_profiles.onboarding_version IS 'Version of onboarding flow completed (1=old, 2=enhanced)';

-- 5. Optional: Create view for analytics
CREATE OR REPLACE VIEW onboarding_analytics AS
SELECT 
  onboarding_preset,
  profession,
  COUNT(*) as user_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_days_since_signup,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as premium_users
FROM user_profiles
WHERE onboarding_completed_at IS NOT NULL
GROUP BY onboarding_preset, profession;

-- 6. Grant access to the view (adjust role as needed)
GRANT SELECT ON onboarding_analytics TO authenticated;

-- 7. Verify changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('onboarding_preset', 'profession', 'onboarding_version');
