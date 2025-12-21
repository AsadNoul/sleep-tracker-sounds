-- Add sleep_recordings table to store audio recording events during sleep sessions
CREATE TABLE IF NOT EXISTS sleep_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('snoring', 'sleep_talk', 'noise', 'movement')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  audio_file_url TEXT,
  loudness_db REAL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sleep_recordings_user_id ON sleep_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_recordings_session_id ON sleep_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_sleep_recordings_timestamp ON sleep_recordings(timestamp);
CREATE INDEX IF NOT EXISTS idx_sleep_recordings_event_type ON sleep_recordings(event_type);

-- Enable Row Level Security
ALTER TABLE sleep_recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own recordings" ON sleep_recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" ON sleep_recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings" ON sleep_recordings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings" ON sleep_recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_sleep_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sleep_recordings_updated_at
  BEFORE UPDATE ON sleep_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_sleep_recordings_updated_at();
