-- Add expo_push_token column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_expo_push_token
ON user_profiles(expo_push_token)
WHERE expo_push_token IS NOT NULL;
