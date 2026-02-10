-- Function to allow users to delete their own account
-- This is required for GDPR compliance and Google Play Data Safety requirements

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_to_delete UUID;
BEGIN
  -- Get the current user's ID
  user_id_to_delete := auth.uid();
  
  -- Check if user is authenticated
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Delete user data from all tables
  -- Note: Adjust table names based on your actual schema
  DELETE FROM sleep_sessions WHERE user_id = user_id_to_delete;
  DELETE FROM sleep_insights WHERE user_id = user_id_to_delete;
  DELETE FROM analytics_events WHERE user_id = user_id_to_delete;
  DELETE FROM journal_entries WHERE user_id = user_id_to_delete;
  DELETE FROM bedtime_routines WHERE user_id = user_id_to_delete;
  DELETE FROM room_environment WHERE user_id = user_id_to_delete;
  DELETE FROM user_settings WHERE user_id = user_id_to_delete;
  DELETE FROM user_profiles WHERE id = user_id_to_delete;
  
  -- Delete the auth user
  -- This requires admin privileges, so we use security definer
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;

COMMENT ON FUNCTION delete_user() IS 'Allows authenticated users to delete their own account and all associated data';
