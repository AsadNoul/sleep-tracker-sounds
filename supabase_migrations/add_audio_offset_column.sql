-- Migration: Add audio offset column to sleep_recordings table
-- Description: Adds audio_offset_ms column to store timestamp offset for playback
-- Date: 2026-01-04

-- Add audio_offset_ms column to sleep_recordings table
-- This stores the milliseconds offset from session start for accurate playback
ALTER TABLE sleep_recordings 
ADD COLUMN IF NOT EXISTS audio_offset_ms BIGINT DEFAULT 0;

-- Add index for faster queries when filtering by audio availability
CREATE INDEX IF NOT EXISTS idx_sleep_recordings_audio_url 
ON sleep_recordings(audio_file_url) 
WHERE audio_file_url IS NOT NULL;

-- Add index for efficient timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_sleep_recordings_offset 
ON sleep_recordings(session_id, audio_offset_ms);

-- Add comment to document the column
COMMENT ON COLUMN sleep_recordings.audio_offset_ms IS 
'Milliseconds offset from session start time for audio playback positioning';

-- Verify the changes
DO $$
BEGIN
  -- Check if column was added successfully
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sleep_recordings' 
    AND column_name = 'audio_offset_ms'
  ) THEN
    RAISE NOTICE '✅ audio_offset_ms column added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add audio_offset_ms column';
  END IF;
END $$;
