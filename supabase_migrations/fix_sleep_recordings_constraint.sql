-- Drop the existing check constraint on sleep_recordings
ALTER TABLE public.sleep_recordings 
DROP CONSTRAINT IF EXISTS sleep_recordings_event_type_check;

-- Add the updated check constraint including 'dreaming' and 'voice_note'
ALTER TABLE public.sleep_recordings 
ADD CONSTRAINT sleep_recordings_event_type_check 
CHECK (event_type IN ('snoring', 'sleep_talk', 'noise', 'movement', 'dreaming', 'voice_note'));
