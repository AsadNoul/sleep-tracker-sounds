-- Create sleep_recordings table if it doesn't exist
CREATE TABLE IF NOT EXISTS sleep_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID, -- Link to sleep_sessions if you have one, or just use timestamp
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    type TEXT CHECK (type IN ('snoring', 'coughing', 'sleep_talk', 'noise', 'movement')),
    duration FLOAT, -- in seconds
    volume FLOAT, -- 0 to 1
    audio_uri TEXT, -- Optional link to storage
    metadata JSONB -- For extra info like frequency or intensity
);

-- Create sleep_insights table for AI Sleep Architect
CREATE TABLE IF NOT EXISTS sleep_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    insight_type TEXT CHECK (insight_type IN ('correlation', 'prescription', 'warning', 'achievement')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    action_text TEXT, -- Actionable advice
    priority INTEGER DEFAULT 0,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB -- Store correlation data like { "factor": "stress", "impact": -22 }
);

-- Update user_profiles for chronotype and smart alarm
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS chronotype TEXT CHECK (chronotype IN ('lion', 'bear', 'wolf', 'dolphin')),
ADD COLUMN IF NOT EXISTS smart_alarm_window INTEGER DEFAULT 30, -- minutes
ADD COLUMN IF NOT EXISTS preferred_wake_time TIME;

-- Enable RLS
ALTER TABLE sleep_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_insights ENABLE ROW LEVEL SECURITY;

-- Policies for sleep_recordings
CREATE POLICY "Users can view their own recordings" ON sleep_recordings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recordings" ON sleep_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for sleep_insights
CREATE POLICY "Users can view their own insights" ON sleep_insights
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insights" ON sleep_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);
