-- Create crash_reports table to store app crashes
CREATE TABLE IF NOT EXISTS crash_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Error information
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('critical', 'error', 'warning')),

  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),

  -- Device information
  device_model VARCHAR(255),
  os_name VARCHAR(50),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  build_version VARCHAR(50),

  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_crash_reports_severity ON crash_reports(severity);
CREATE INDEX IF NOT EXISTS idx_crash_reports_timestamp ON crash_reports(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_crash_reports_user_id ON crash_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_crash_reports_resolved ON crash_reports(resolved);
CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON crash_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE crash_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own crash reports
CREATE POLICY "Users can insert their own crash reports"
ON crash_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Allow service role to insert any crash reports (for edge functions)
CREATE POLICY "Service role can insert any crash reports"
ON crash_reports FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Only admins/developers can view crash reports
-- For now, allow service role full access
CREATE POLICY "Service role can view all crash reports"
ON crash_reports FOR SELECT
TO service_role
USING (true);

-- Policy: Only admins/developers can update crash reports
CREATE POLICY "Service role can update crash reports"
ON crash_reports FOR UPDATE
TO service_role
USING (true);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crash_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_crash_reports_updated_at
BEFORE UPDATE ON crash_reports
FOR EACH ROW
EXECUTE FUNCTION update_crash_reports_updated_at();

-- Create a view for quick crash statistics
CREATE OR REPLACE VIEW crash_statistics AS
SELECT
  DATE(timestamp) as crash_date,
  severity,
  COUNT(*) as crash_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT device_model) as affected_devices
FROM crash_reports
GROUP BY DATE(timestamp), severity
ORDER BY crash_date DESC, severity;

COMMENT ON TABLE crash_reports IS 'Stores app crash reports for debugging and monitoring';
COMMENT ON VIEW crash_statistics IS 'Quick view of crash statistics by date and severity';
