-- ============================================
-- ADMIN SETUP & ROW LEVEL SECURITY (RLS)
-- Run this in Supabase SQL Editor
-- CORRECTED to match your actual database tables
-- ============================================

-- Step 1: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sleep_records_user_id ON sleep_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_insights_user_id ON sleep_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- Step 2: Create is_admin() function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email = 'admin@naulx.com'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Enable RLS on all tables
ALTER TABLE sleep_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies and create new ones with admin access

-- Sleep Records
DROP POLICY IF EXISTS "Users can view own sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Users can insert own sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Users can update own sleep records" ON sleep_records;
DROP POLICY IF EXISTS "Users can delete own sleep records" ON sleep_records;

CREATE POLICY "Users can view own sleep records"
ON sleep_records FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own sleep records"
ON sleep_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep records"
ON sleep_records FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own sleep records"
ON sleep_records FOR DELETE
USING (auth.uid() = user_id OR is_admin());

-- Sleep Insights
DROP POLICY IF EXISTS "Users can view own sleep insights" ON sleep_insights;
DROP POLICY IF EXISTS "Users can insert own sleep insights" ON sleep_insights;
DROP POLICY IF EXISTS "Users can update own sleep insights" ON sleep_insights;

CREATE POLICY "Users can view own sleep insights"
ON sleep_insights FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own sleep insights"
ON sleep_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep insights"
ON sleep_insights FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

-- Analytics Events
DROP POLICY IF EXISTS "Users can view their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;

CREATE POLICY "Users can view their own analytics events"
ON analytics_events FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert their own analytics events"
ON analytics_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Journal Entries
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON journal_entries;

CREATE POLICY "Users can view own journal entries"
ON journal_entries FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own journal entries"
ON journal_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
ON journal_entries FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own journal entries"
ON journal_entries FOR DELETE
USING (auth.uid() = user_id OR is_admin());

-- User Settings
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can view own settings"
ON user_settings FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own settings"
ON user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON user_settings FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

-- User Profiles (uses 'id' not 'user_id')
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id OR is_admin());

-- ============================================
-- DONE! Admin system is now set up.
-- Admin (admin@naulx.com) can now view ALL users' data
-- Regular users can only see their own data
-- ============================================
