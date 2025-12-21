-- Add onboarding fields to user_profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS sleep_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sleep_troubles JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sleep_pattern TEXT,
ADD COLUMN IF NOT EXISTS average_sleep_hours INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS wake_up_feeling TEXT,
ADD COLUMN IF NOT EXISTS health_conditions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_bed_time TEXT DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS preferred_wake_time TEXT DEFAULT '07:00',
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comment to document the structure
COMMENT ON COLUMN user_profiles.sleep_goals IS 'Array of sleep goal IDs (e.g., ["fall_asleep_faster", "sleep_longer"])';
COMMENT ON COLUMN user_profiles.sleep_troubles IS 'Array of sleep trouble IDs (e.g., ["trouble_falling_asleep", "anxiety"])';
COMMENT ON COLUMN user_profiles.health_conditions IS 'Array of health condition IDs (e.g., ["none", "insomnia"])';
COMMENT ON COLUMN user_profiles.sleep_pattern IS 'Sleep pattern consistency: consistent, somewhat_consistent, or irregular';
COMMENT ON COLUMN user_profiles.wake_up_feeling IS 'How user feels when waking up: refreshed, okay, tired, or exhausted';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'Timestamp when user completed the onboarding questionnaire';

-- Create an index for faster queries on onboarding completion
CREATE INDEX IF NOT EXISTS idx_onboarding_completed
ON user_profiles (onboarding_completed_at)
WHERE onboarding_completed_at IS NOT NULL;
