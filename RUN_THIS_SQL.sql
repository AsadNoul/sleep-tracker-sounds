-- ===================================================================
-- ONBOARDING V2.0 - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ===================================================================

-- Step 1: Add new columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_preset VARCHAR(50),
ADD COLUMN IF NOT EXISTS profession VARCHAR(100),
ADD COLUMN IF NOT EXISTS onboarding_version INTEGER;

-- Step 2: Set version 1 for ALL existing users (completed or not)
-- New users completing V2 onboarding will get version 2 set by the app
UPDATE user_profiles 
SET onboarding_version = 1 
WHERE onboarding_version IS NULL;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_profession 
ON user_profiles(profession);

CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_preset 
ON user_profiles(onboarding_preset);

-- Step 4: Create analytics view for tracking
-- Drop existing view first to avoid column name conflicts
DROP VIEW IF EXISTS onboarding_analytics;

CREATE VIEW onboarding_analytics AS
SELECT 
  onboarding_preset,
  profession,
  COUNT(*) as user_count,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as premium_users,
  ROUND(AVG(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) * 100, 2) as conversion_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (onboarding_completed_at - created_at))/60)::numeric, 2) as avg_completion_time_minutes,
  MIN(created_at) as first_user_at,
  MAX(created_at) as latest_user_at
FROM user_profiles
WHERE onboarding_completed_at IS NOT NULL
AND onboarding_version = 2
GROUP BY onboarding_preset, profession
ORDER BY user_count DESC;

-- Step 5: Grant access to authenticated users
GRANT SELECT ON onboarding_analytics TO authenticated;

-- Step 6: Add helpful comments for documentation
COMMENT ON COLUMN user_profiles.onboarding_preset IS 
  'Selected professional preset during onboarding: healthcare, night_shift, insomnia, or custom';

COMMENT ON COLUMN user_profiles.profession IS 
  'User profession or work type for better targeting and personalization';

COMMENT ON COLUMN user_profiles.onboarding_version IS 
  'Onboarding flow version: 1 = original, 2 = enhanced with professional presets';

COMMENT ON VIEW onboarding_analytics IS 
  'Analytics view tracking onboarding completion by preset and profession for V2.0 users';

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('onboarding_preset', 'profession', 'onboarding_version')
ORDER BY ordinal_position;

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles'
AND indexname LIKE 'idx_user_profiles_%';

-- Test the analytics view
SELECT * FROM onboarding_analytics LIMIT 5;

-- Check existing users versioning
SELECT 
  onboarding_version,
  COUNT(*) as user_count,
  COUNT(CASE WHEN onboarding_completed_at IS NOT NULL THEN 1 END) as completed_count
FROM user_profiles
GROUP BY onboarding_version;

-- ===================================================================
-- SAMPLE ANALYTICS QUERIES
-- ===================================================================

-- Most popular presets
SELECT 
  onboarding_preset,
  user_count,
  conversion_rate_percent,
  avg_completion_time_minutes
FROM onboarding_analytics
ORDER BY user_count DESC;

-- Healthcare professionals conversion
SELECT * FROM onboarding_analytics
WHERE profession LIKE '%health%' OR profession LIKE '%nurse%' OR profession LIKE '%doctor%';

-- Fastest completing preset
SELECT onboarding_preset, MIN(avg_completion_time_minutes) as fastest_time
FROM onboarding_analytics
GROUP BY onboarding_preset
ORDER BY fastest_time ASC
LIMIT 1;

-- ===================================================================
-- ROLLBACK (if needed)
-- ===================================================================

-- DROP VIEW onboarding_analytics;
-- DROP INDEX IF EXISTS idx_user_profiles_profession;
-- DROP INDEX IF EXISTS idx_user_profiles_onboarding_preset;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS onboarding_preset;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS profession;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS onboarding_version;

-- ===================================================================
-- NOTES
-- ===================================================================

-- Valid preset values:
--   - 'healthcare'    (Healthcare Worker preset)
--   - 'night_shift'   (Night Shift Worker preset)
--   - 'insomnia'      (I Have Insomnia preset)
--   - 'custom'        (Custom Setup - no preset)

-- Profession field examples:
--   - 'Healthcare Worker', 'Nurse', 'Doctor', 'Paramedic'
--   - 'Security Guard', 'Factory Worker', 'Warehouse Worker'
--   - 'Student', 'Freelancer', 'Entrepreneur'
--   - Any user-entered profession

-- Onboarding versions:
--   - NULL: Never completed onboarding
--   - 1: Completed old onboarding (before presets)
--   - 2: Completed new onboarding (with presets)

-- ===================================================================
-- STATUS: Ready to Execute ✅
-- ESTIMATED TIME: < 1 second
-- RISK LEVEL: Low (non-destructive, additive only)
-- ===================================================================
