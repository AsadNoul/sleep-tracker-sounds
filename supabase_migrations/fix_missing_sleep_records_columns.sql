-- Migration to add missing columns to sleep_records table
-- This fixes the error: "Could not find the 'sleep_stages' column of 'sleep_records' in the schema cache"

ALTER TABLE sleep_records 
ADD COLUMN IF NOT EXISTS sleep_date DATE,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS sleep_score INTEGER,
ADD COLUMN IF NOT EXISTS sleep_stages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update existing records to have a sleep_date if missing
UPDATE sleep_records 
SET sleep_date = (start_time::DATE) 
WHERE sleep_date IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN sleep_records.sleep_stages IS 'Array of sleep stage segments (awake, light, deep, rem)';
COMMENT ON COLUMN sleep_records.sleep_score IS 'Calculated sleep score from 0-100';
