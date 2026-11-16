-- =============================================================================
-- Migration 131: Session Persistence & Recovery
-- =============================================================================
-- Ensures queue sessions persist until consultation is properly completed.
-- Adds RPCs for resuming and abandoning sessions.
-- Created: 2026-02-07
-- =============================================================================

-- =============================================================================
-- 1. Add session tracking fields to queue table
-- =============================================================================

-- Add session_started_at to track when session was started (distinct from called_at)
ALTER TABLE public.queue 
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ;

-- Add session_staff_id to track who started the session (for session ownership)
ALTER TABLE public.queue 
  ADD COLUMN IF NOT EXISTS session_staff_id UUID REFERENCES public.staff(id);

-- Add session_notes for any in-progress notes before consultation is saved
ALTER TABLE public.queue 
  ADD COLUMN IF NOT EXISTS session_notes TEXT;

-- =============================================================================
-- 2. RPC: Abandon/Cancel Session (revert to Waiting)
-- Use when admin closes wizard without completing consultation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.abandon_specialty_session(
  p_queue_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_staff_id UUID;
  v_is_admin BOOLEAN;
  v_queue RECORD;
BEGIN
  -- Get current staff
  SELECT id, role::text IN ('super_admin', 'admin', 'medical_director', 'Admin', 'System_Admin', 'Medical_Director')
  INTO v_staff_id, v_is_admin
  FROM staff 
  WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Get queue entry
  SELECT * INTO v_queue
  FROM queue
  WHERE id = p_queue_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Queue entry not found'
    );
  END IF;
  
  -- Only allow abandoning In Progress sessions
  IF v_queue.status != 'In Progress' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session is not in progress',
      'current_status', v_queue.status
    );
  END IF;
  
  -- Check permission: only session owner or admin can abandon
  IF NOT v_is_admin AND v_queue.assigned_to != v_staff_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only the session owner or an admin can abandon this session'
    );
  END IF;
  
  -- Revert to Waiting status
  UPDATE queue
  SET status = 'Waiting',
      called_at = NULL,
      assigned_to = NULL,
      session_started_at = NULL,
      session_staff_id = NULL,
      updated_at = NOW()
  WHERE id = p_queue_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Session abandoned - patient returned to waiting queue',
    'queue_id', p_queue_id,
    'new_status', 'Waiting'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.abandon_specialty_session(UUID) TO authenticated;

-- =============================================================================
-- 3. RPC: Resume Session (for re-opening wizard)
-- Validates session is still in progress and returns session data
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resume_specialty_session(
  p_queue_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_staff_id UUID;
  v_is_admin BOOLEAN;
  v_queue RECORD;
  v_patient RECORD;
  v_visit RECORD;
BEGIN
  -- Get current staff
  SELECT id, role::text IN ('super_admin', 'admin', 'medical_director', 'Admin', 'System_Admin', 'Medical_Director')
  INTO v_staff_id, v_is_admin
  FROM staff 
  WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Get queue entry with lock
  SELECT q.*, 
         p.patient_id AS emr_number,
         p.first_name,
         p.surname AS last_name,
         p.date_of_birth,
         p.gender
  INTO v_queue
  FROM queue q
  LEFT JOIN patients p ON p.id = q.patient_id
  WHERE q.id = p_queue_id
  FOR UPDATE OF q;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Queue entry not found'
    );
  END IF;
  
  -- Check if session is in progress
  IF v_queue.status != 'In Progress' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session is not in progress',
      'current_status', v_queue.status
    );
  END IF;
  
  -- Check permission: only session owner or admin can resume
  IF NOT v_is_admin AND v_queue.assigned_to IS NOT NULL AND v_queue.assigned_to != v_staff_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Session assigned to another staff member'
    );
  END IF;
  
  -- Update session tracking
  UPDATE queue
  SET session_staff_id = v_staff_id,
      updated_at = NOW()
  WHERE id = p_queue_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Session resumed successfully',
    'queue_id', p_queue_id,
    'patient', jsonb_build_object(
      'id', v_queue.patient_id,
      'patient_id', v_queue.emr_number,
      'first_name', v_queue.first_name,
      'last_name', v_queue.last_name,
      'gender', v_queue.gender,
      'date_of_birth', v_queue.date_of_birth
    ),
    'visit_id', v_queue.visit_id,
    'encounter_id', v_queue.encounter_id,
    'session_started_at', v_queue.called_at,
    'session_notes', v_queue.session_notes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resume_specialty_session(UUID) TO authenticated;

-- =============================================================================
-- 4. Update start_specialty_session to set session tracking fields
-- =============================================================================

CREATE OR REPLACE FUNCTION public.start_specialty_session(p_queue_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_staff_role text;
  v_specialty_code varchar(50);
  v_is_admin boolean;
BEGIN
  SELECT id, role::text, specialty_code INTO v_staff_id, v_staff_role, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Admins can start any session
  v_is_admin := v_staff_role IN ('super_admin', 'admin', 'medical_director', 'Admin', 'System_Admin', 'Medical_Director');
  
  UPDATE queue SET
    status = 'In Progress',
    called_at = COALESCE(called_at, now()),  -- Don't overwrite if resuming
    assigned_to = v_staff_id,
    session_started_at = COALESCE(session_started_at, now()),  -- Track original start
    session_staff_id = v_staff_id,
    updated_at = now()
  WHERE id = p_queue_id
    AND (
      v_is_admin  -- Admins can start any session
      OR specialty_code = v_specialty_code  -- Doctors can start their specialty
      OR specialty_code IS NULL  -- Anyone can start unassigned queue entries
    )
    AND status IN ('Waiting', 'Called', 'In Progress')  -- Allow re-starting In Progress
  RETURNING jsonb_build_object(
    'queue_id', id,
    'status', status,
    'patient_id', patient_id,
    'started_at', called_at,
    'assigned_to', assigned_to,
    'visit_id', visit_id,
    'encounter_id', encounter_id
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;

-- =============================================================================
-- 5. View: Active Sessions with timeout detection
-- =============================================================================

CREATE OR REPLACE VIEW public.v_stale_sessions AS
SELECT 
  q.id AS queue_id,
  q.patient_id,
  q.visit_id,
  q.encounter_id,
  q.ticket_number,
  q.location,
  q.status,
  q.called_at AS session_start,
  q.session_staff_id,
  s.first_name AS staff_first_name,
  s.last_name AS staff_last_name,
  p.first_name AS patient_first_name,
  p.surname AS patient_last_name,
  p.patient_id AS emr_number,
  EXTRACT(EPOCH FROM (NOW() - q.called_at)) / 60 AS minutes_in_session,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - q.called_at)) / 3600 >= 2 THEN 'critical'
    WHEN EXTRACT(EPOCH FROM (NOW() - q.called_at)) / 60 >= 60 THEN 'warning'
    ELSE 'normal'
  END AS session_health
FROM queue q
LEFT JOIN staff s ON s.id = q.session_staff_id
LEFT JOIN patients p ON p.id = q.patient_id
WHERE q.status = 'In Progress'
  AND q.created_at::date = CURRENT_DATE
ORDER BY q.called_at ASC;

COMMENT ON VIEW public.v_stale_sessions IS 
'Shows In Progress sessions with timeout indicators. 
- warning: 60+ minutes in session
- critical: 2+ hours in session';

GRANT SELECT ON public.v_stale_sessions TO authenticated;

-- =============================================================================
-- 6. RPC: Get stale sessions for admin recovery
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_stale_sessions(
  p_location VARCHAR DEFAULT NULL,
  p_minutes_threshold INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'queue_id', queue_id,
      'patient_id', patient_id,
      'emr_number', emr_number,
      'patient_name', patient_first_name || ' ' || patient_last_name,
      'staff_name', staff_first_name || ' ' || staff_last_name,
      'minutes_in_session', ROUND(minutes_in_session::numeric, 0),
      'session_start', session_start,
      'session_health', session_health
    )
  )
  INTO v_result
  FROM v_stale_sessions
  WHERE minutes_in_session >= p_minutes_threshold
    AND (p_location IS NULL OR location = p_location);
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stale_sessions(VARCHAR, INTEGER) TO authenticated;

-- =============================================================================
-- 7. Add index for session queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_queue_in_progress_sessions
  ON queue(status, called_at)
  WHERE status = 'In Progress';

-- =============================================================================
-- 8. Comments
-- =============================================================================

COMMENT ON FUNCTION public.abandon_specialty_session IS 
'Abandon an in-progress session and return patient to waiting queue.
Use when closing wizard without completing consultation.';

COMMENT ON FUNCTION public.resume_specialty_session IS 
'Resume an in-progress session. Returns patient and session data.
Use when re-opening wizard for an existing session.';

COMMENT ON COLUMN queue.session_started_at IS 
'When the session was first started (persists across resumes)';

COMMENT ON COLUMN queue.session_staff_id IS 
'Staff member currently handling the session';

COMMENT ON COLUMN queue.session_notes IS 
'Any in-progress notes before consultation is saved';
