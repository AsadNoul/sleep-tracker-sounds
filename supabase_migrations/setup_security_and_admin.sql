-- Complete Database Security Setup with Admin Access
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_created_at ON sleep_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_insights_user_id ON sleep_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_bedtime_routines_user_id ON bedtime_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_room_environment_user_id ON room_environment(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- STEP 2: Helper Function to Check Admin
-- ============================================

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

-- ============================================
-- STEP 3: Enable Row Level Security
-- ============================================

ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bedtime_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_environment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Drop Existing Policies (if any)
-- ============================================

DROP POLICY IF EXISTS "Users can view own data" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can insert own data" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can update own data" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can delete own data" ON sleep_sessions;
DROP POLICY IF EXISTS "Admin can view all data" ON sleep_sessions;

DROP POLICY IF EXISTS "Users can view own data" ON sleep_insights;
DROP POLICY IF EXISTS "Users can insert own data" ON sleep_insights;
DROP POLICY IF EXISTS "Users can update own data" ON sleep_insights;
DROP POLICY IF EXISTS "Users can delete own data" ON sleep_insights;
DROP POLICY IF EXISTS "Admin can view all data" ON sleep_insights;

DROP POLICY IF EXISTS "Users can view own data" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert own data" ON analytics_events;
DROP POLICY IF EXISTS "Admin can view all data" ON analytics_events;

DROP POLICY IF EXISTS "Users can view own data" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert own data" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own data" ON journal_entries;
DROP POLICY IF EXISTS "Users can delete own data" ON journal_entries;
DROP POLICY IF EXISTS "Admin can view all data" ON journal_entries;

DROP POLICY IF EXISTS "Users can view own data" ON bedtime_routines;
DROP POLICY IF EXISTS "Users can insert own data" ON bedtime_routines;
DROP POLICY IF EXISTS "Users can update own data" ON bedtime_routines;
DROP POLICY IF EXISTS "Users can delete own data" ON bedtime_routines;
DROP POLICY IF EXISTS "Admin can view all data" ON bedtime_routines;

DROP POLICY IF EXISTS "Users can view own data" ON room_environment;
DROP POLICY IF EXISTS "Users can insert own data" ON room_environment;
DROP POLICY IF EXISTS "Users can update own data" ON room_environment;
DROP POLICY IF EXISTS "Users can delete own data" ON room_environment;
DROP POLICY IF EXISTS "Admin can view all data" ON room_environment;

DROP POLICY IF EXISTS "Users can view own data" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own data" ON user_settings;
DROP POLICY IF EXISTS "Users can update own data" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own data" ON user_settings;
DROP POLICY IF EXISTS "Admin can view all data" ON user_settings;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON user_profiles;

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================

-- ===== SLEEP SESSIONS =====
CREATE POLICY "Users can view own data"
  ON sleep_sessions FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON sleep_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON sleep_sessions FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own data"
  ON sleep_sessions FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ===== SLEEP INSIGHTS =====
CREATE POLICY "Users can view own data"
  ON sleep_insights FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON sleep_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON sleep_insights FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own data"
  ON sleep_insights FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ===== ANALYTICS EVENTS =====
CREATE POLICY "Users can view own data"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ===== JOURNAL ENTRIES =====
CREATE POLICY "Users can view own data"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own data"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ===== BEDTIME ROUTINES =====
CREATE POLICY "Users can view own data"
  ON bedtime_routines FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON bedtime_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON bedtime_routines FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own data"
  ON bedtime_routines FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ===== ROOM ENVIRONMENT =====
CREATE POLICY "Users can view own data"
  ON room_environment FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON room_environment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON room_environment FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own data"
  ON room_environment FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ===== USER SETTINGS =====
CREATE POLICY "Users can view own data"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own data"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own data"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id OR is_admin());

-- ===== USER PROFILES =====
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

-- ============================================
-- STEP 6: Grant Necessary Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================
-- Done! Your database is now secure.
-- ============================================

-- Test if admin check works:
-- SELECT is_admin(); -- Should return true when logged in as admin@naulx.com
