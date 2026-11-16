-- =============================================================================
-- Staff Online Tracking
-- Track which staff members are currently online/active
-- =============================================================================

-- Add last_activity column to track real-time online status
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of active doctors
CREATE INDEX IF NOT EXISTS idx_staff_last_activity ON staff(last_activity) WHERE role = 'doctor';
CREATE INDEX IF NOT EXISTS idx_staff_role_activity ON staff(role, last_activity) WHERE is_active = true;

-- Function to get count of online doctors (active in last 5 minutes)
CREATE OR REPLACE FUNCTION get_online_doctors_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM staff
  WHERE role = 'doctor'
    AND is_active = true
    AND last_activity > NOW() - INTERVAL '5 minutes';
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_online_doctors_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_online_doctors_count() TO service_role;

-- Comment
COMMENT ON COLUMN staff.last_activity IS 'Last activity timestamp for tracking online status. Updated via heartbeat every 30 seconds.';
