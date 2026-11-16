-- ============================================================================
-- Migration 138: Fix NHIS referral triggers to not auto-set pending status
-- ============================================================================
-- PROBLEM: Two DB triggers auto-set nhis_approval_status = 'pending' on 
-- clinical_requests INSERT for NHIS patients:
--   1. trg_auto_nhis_approval_referral (migration 106) 
--   2. trg_clinical_requests_auto_nhis (migration 135)
--
-- This causes referrals to appear in the NHIS Specialty Approval Queue 
-- immediately when a doctor creates them, BEFORE the patient goes through:
--   Internal Referral Queue → Booking → Encounter Creation
--
-- FIX: 
--   1. Modify auto_create_nhis_approval_for_referral() to set 
--      nhis_approval_status = 'not_required' instead of 'pending', and 
--      NOT create the nhis_approvals entry at insert time. 
--      The app code in createReferralEncounter() handles setting 'pending' 
--      at the correct point in the workflow (after booking + encounter creation).
--
--   2. Modify auto_set_nhis_status_for_encounter() to SKIP rows where 
--      request_type = 'Referral' — referrals have their own workflow.
--
-- CORRECT FLOW AFTER FIX:
--   Doctor creates referral → clinical_requests INSERT 
--     → nhis_approval_status = 'not_required' (NOT 'pending')
--     → Referral appears in Internal Referral Queue for booking
--   Staff books appointment → referral_workflow_status = 'Appointment_Booked'
--   Staff creates encounter → createReferralEncounter()
--     → For NHIS patients: sets nhis_approval_status = 'pending'
--     → Routes to NHIS Specialty Approval Queue
--   NHIS approves → approveSpecialtyReferral()
--     → Routes to Nursing → then Specialty Queue
-- ============================================================================

-- 1. Replace auto_create_nhis_approval_for_referral to skip auto-pending
--    Referrals should NOT get nhis_approval_status='pending' at creation time.
--    The app handles this in createReferralEncounter() after booking.
CREATE OR REPLACE FUNCTION auto_create_nhis_approval_for_referral()
RETURNS TRIGGER AS $$
BEGIN
    -- REFERRALS: Always set to 'not_required' at creation time.
    -- The app code (createReferralEncounter) will set 'pending' after
    -- the referral is booked and an encounter is created.
    -- This prevents referrals from appearing in the NHIS Specialty 
    -- Approval Queue before going through the booking workflow.
    IF NEW.request_type = 'Referral' THEN
        NEW.nhis_approval_status := 'not_required';
        RETURN NEW;
    END IF;

    -- For non-referral request types, keep existing behavior
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Replace auto_set_nhis_status_for_encounter to skip Referral rows
--    This function is shared across multiple tables (clinical_requests, 
--    consultations, admissions, dental_procedures, eye_exams, etc.)
--    Only clinical_requests has request_type, so we use TG_TABLE_NAME.
CREATE OR REPLACE FUNCTION auto_set_nhis_status_for_encounter()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_category TEXT;
BEGIN
    -- Only clinical_requests has request_type. For that table, skip Referrals
    -- because they have their own workflow (app sets pending after encounter creation).
    IF TG_TABLE_NAME = 'clinical_requests' THEN
        IF NEW.request_type = 'Referral' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- For all other tables/types, check if the encounter is NHIS
    SELECT payment_category INTO v_payment_category
    FROM visits 
    WHERE id = NEW.encounter_id;
    
    -- If NHIS encounter, set status to 'pending' instead of 'not_required'
    IF v_payment_category = 'NHIS' AND NEW.nhis_approval_status = 'not_required' THEN
        NEW.nhis_approval_status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix any existing referrals that were incorrectly set to 'pending'
--    but haven't had an encounter created yet (no referral_encounter_id).
--    These should be 'not_required' so they appear in the booking queue
--    instead of the NHIS Specialty Approval Queue.
UPDATE clinical_requests
SET nhis_approval_status = 'not_required',
    updated_at = NOW()
WHERE request_type = 'Referral'
  AND nhis_approval_status = 'pending'
  AND referral_encounter_id IS NULL
  AND referral_workflow_status IN ('Pending_Encounter_Office', 'Appointment_Booked');

-- 4. Log what we fixed
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Migration 138: Fixed % referrals with premature pending status', v_count;
END;
$$;

-- ============================================================================
-- 5. Fix complete_specialty_session to be more flexible
--    The old version required assigned_to = current user AND status = 'In Progress'.
--    This fails when patients are routed from Nursing (queue entry is 'Waiting'
--    and has no assigned_to). Now allows completing entries in any active state,
--    and auto-assigns if not already assigned.
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_specialty_session(
  p_queue_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_staff_role text;
BEGIN
  SELECT id, role::text INTO v_staff_id, v_staff_role
  FROM staff WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Try strict match first: assigned to current user and In Progress
  UPDATE queue SET
    status = 'Completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_queue_id
    AND assigned_to = v_staff_id
    AND status = 'In Progress'
  RETURNING jsonb_build_object(
    'queue_id', id,
    'status', status,
    'completed_at', completed_at
  ) INTO v_result;
  
  -- If strict match failed, try flexible match:
  -- Allow completing entries that are Waiting/Called/In Progress
  -- and either unassigned or assigned to the current user.
  -- This handles cases where patients were routed from Nursing
  -- without going through start_specialty_session.
  IF v_result IS NULL THEN
    UPDATE queue SET
      status = 'Completed',
      completed_at = now(),
      assigned_to = COALESCE(assigned_to, v_staff_id),
      updated_at = now()
    WHERE id = p_queue_id
      AND status IN ('Waiting', 'Called', 'In Progress')
      AND (
        assigned_to IS NULL 
        OR assigned_to = v_staff_id
        OR v_staff_role IN ('super_admin', 'admin', 'medical_director')
      )
    RETURNING jsonb_build_object(
      'queue_id', id,
      'status', status,
      'completed_at', completed_at
    ) INTO v_result;
  END IF;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found, not assigned to you, or not in progress';
  END IF;
  
  RETURN v_result;
END;
$$;
