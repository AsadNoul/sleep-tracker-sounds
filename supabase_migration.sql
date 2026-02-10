-- ============================================
-- SUPABASE DATABASE MIGRATION
-- Sleep Tracker App - New Features Schema
-- 
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add new columns to sleep_records table
-- These columns support the new real-time sleep tracking features

ALTER TABLE sleep_records 
  -- Biometric metrics (optional - from hardware sensors)
  ADD COLUMN IF NOT EXISTS avg_spo2 INTEGER CHECK (avg_spo2 >= 0 AND avg_spo2 <= 100),
  ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER CHECK (respiratory_rate >= 0 AND respiratory_rate <= 100),
  
  -- Environment metrics (from microphone/sensors)
  ADD COLUMN IF NOT EXISTS ambient_noise INTEGER CHECK (ambient_noise >= 0 AND ambient_noise <= 120),
  ADD COLUMN IF NOT EXISTS light_level INTEGER CHECK (light_level >= 0),
  
  -- Circadian rhythm data
  ADD COLUMN IF NOT EXISTS chronotype VARCHAR(50) CHECK (chronotype IN ('Early Bird', 'Intermediate', 'Night Owl', 'Uncategorized', NULL)),
  
  -- NEW: Calculated metrics from app features
  ADD COLUMN IF NOT EXISTS deep_sleep_quality INTEGER CHECK (deep_sleep_quality >= 0 AND deep_sleep_quality <= 100),
  ADD COLUMN IF NOT EXISTS snoring_intensity VARCHAR(20) CHECK (snoring_intensity IN ('None', 'Low', 'Moderate', 'High', NULL)),
  ADD COLUMN IF NOT EXISTS disruption_score VARCHAR(20) CHECK (disruption_score IN ('Low', 'Moderate', 'High', NULL));

-- Step 2: Add comments to document columns
COMMENT ON COLUMN sleep_records.avg_spo2 IS 'Average blood oxygen saturation (%) during sleep - requires external sensor';
COMMENT ON COLUMN sleep_records.respiratory_rate IS 'Average breaths per minute - requires external sensor';
COMMENT ON COLUMN sleep_records.ambient_noise IS 'Ambient noise level in decibels (dB) - from microphone monitoring';
COMMENT ON COLUMN sleep_records.light_level IS 'Light level in lux - from light sensor (optional)';
COMMENT ON COLUMN sleep_records.chronotype IS 'Sleep chronotype classification based on bedtime patterns';
COMMENT ON COLUMN sleep_records.deep_sleep_quality IS 'Deep sleep quality score (0-100) - calculated from sleep stages';
COMMENT ON COLUMN sleep_records.snoring_intensity IS 'Snoring intensity level - calculated from snoring duration vs total sleep';
COMMENT ON COLUMN sleep_records.disruption_score IS 'Overall sleep disruption score - from wake-ups, movements, snoring';

-- Step 3: Create index for faster queries on new metrics
CREATE INDEX IF NOT EXISTS idx_sleep_records_chronotype ON sleep_records(chronotype);
CREATE INDEX IF NOT EXISTS idx_sleep_records_disruption ON sleep_records(disruption_score);

-- Step 4: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sleep_records' 
    AND column_name IN (
        'avg_spo2', 
        'respiratory_rate', 
        'ambient_noise', 
        'light_level', 
        'chronotype',
        'deep_sleep_quality',
        'snoring_intensity',
        'disruption_score'
    )
ORDER BY ordinal_position;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- 
-- WHAT EACH COLUMN DOES:
--
-- 1. avg_spo2 (INTEGER 0-100)
--    - Blood oxygen saturation percentage
--    - Requires external pulse oximeter
--    - NULL if not available
--
-- 2. respiratory_rate (INTEGER 0-100)
--    - Breaths per minute during sleep
--    - Requires external sensor or advanced audio analysis
--    - NULL if not available
--
-- 3. ambient_noise (INTEGER 0-120)
--    - Noise level in decibels during sleep
--    - Captured from microphone in real-time
--    - Used for sleep environment score
--
-- 4. light_level (INTEGER 0+)
--    - Light exposure in lux
--    - Requires light sensor (most phones don't have this)
--    - NULL if not available
--
-- 5. chronotype (VARCHAR)
--    - 'Early Bird', 'Intermediate', 'Night Owl', or 'Uncategorized'
--    - Calculated from average bedtime over 30 days
--    - Helps personalize sleep recommendations
--
-- 6. deep_sleep_quality (INTEGER 0-100) ⭐ NEW
--    - Quality score based on deep sleep percentage
--    - Target is 20% of total sleep
--    - Calculated from sleep stages data
--
-- 7. snoring_intensity (VARCHAR) ⭐ NEW
--    - 'None', 'Low', 'Moderate', or 'High'
--    - Based on snoring duration vs total sleep time
--    - Calculated from audio detection
--
-- 8. disruption_score (VARCHAR) ⭐ NEW
--    - 'Low', 'Moderate', or 'High'
--    - Combines wake-ups, movements, and snoring
--    - Overall sleep quality indicator
--
-- ============================================
