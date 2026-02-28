-- Migration: add missing columns that the app tries to save but don't exist yet
-- Run this in Supabase SQL editor

ALTER TABLE sleep_records
ADD COLUMN IF NOT EXISTS is_nap BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deep_sleep_quality INTEGER,
ADD COLUMN IF NOT EXISTS snoring_intensity TEXT,
ADD COLUMN IF NOT EXISTS disruption_score TEXT,
ADD COLUMN IF NOT EXISTS movement_score INTEGER,
ADD COLUMN IF NOT EXISTS movement_events INTEGER,
ADD COLUMN IF NOT EXISTS avg_spo2 REAL,
ADD COLUMN IF NOT EXISTS respiratory_rate REAL,
ADD COLUMN IF NOT EXISTS ambient_noise REAL,
ADD COLUMN IF NOT EXISTS light_level REAL,
ADD COLUMN IF NOT EXISTS chronotype TEXT,
ADD COLUMN IF NOT EXISTS efficiency INTEGER,
ADD COLUMN IF NOT EXISTS user_rating INTEGER;

-- Update schema cache (PostgREST needs this to pick up new columns)
NOTIFY pgrst, 'reload schema';
