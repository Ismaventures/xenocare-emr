-- =============================================================================
-- NHIS Workflow Fix - Run this in Supabase SQL Editor
-- Fixes the update_nhis_approval_status function type mismatch
-- =============================================================================

-- Fix the update_nhis_approval_status function
CREATE OR REPLACE FUNCTION update_nhis_approval_status(
  p_service_type text,
  p_service_id uuid,
  p_new_status text,
  p_approved_by uuid DEFAULT NULL,
  p_approval_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  target_table text;
  id_field text;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('approved', 'rejected', 'expired', 'pending', 'not_required') THEN
    RAISE EXCEPTION 'Invalid NHIS approval status: %', p_new_status;
  END IF;
  
  -- Determine target table and ID field
  CASE p_service_type
    WHEN 'lab' THEN
      target_table := 'lab_requests';
      id_field := 'request_id';
    WHEN 'radiology' THEN
      target_table := 'radiology_requests';
      id_field := 'request_id';
    WHEN 'pharmacy' THEN
      target_table := 'prescriptions';
      id_field := 'prescription_id';
    WHEN 'procedure' THEN
      target_table := 'procedure_requests';
      id_field := 'request_id';
    ELSE
      RAISE EXCEPTION 'Unknown service type: %', p_service_type;
  END CASE;
  
  -- Update the status (cast text to nhis_approval_status enum)
  EXECUTE format(
    'UPDATE %I SET 
      nhis_approval_status = $1::nhis_approval_status,
      updated_at = NOW()
    WHERE %I = $2',
    target_table, id_field
  ) USING p_new_status, p_service_id;
  
  -- Log to audit trail (service_id is uuid, changed_by is uuid - no casting needed)
  INSERT INTO service_price_audit (
    service_type,
    service_id,
    service_name,
    field_changed,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    p_service_type,
    p_service_id,
    'NHIS Approval Update',
    'nhis_approval_status',
    'pending',
    p_new_status,
    p_approved_by,
    COALESCE(p_approval_notes, 'Status updated via NHIS desk')
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_nhis_approval_status IS 
  'Function to approve/reject NHIS pre-authorization requests';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_nhis_approval_status TO authenticated;

SELECT 'update_nhis_approval_status function fixed!' AS status;
