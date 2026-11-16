-- =============================================================================
-- Migration 057: Follow-Up Booking RPC
--
-- Adds a Postgres function that UPSERTS a clinical_request of type 'Follow-Up'
-- tied to an originating encounter. This is called by the frontend whenever a
-- doctor saves a consultation with a follow_up_date set (or clears it).
--
-- Deduplication key:  encounter_id + request_type = 'Follow-Up' + status != 'Cancelled'
-- One active follow-up per encounter. Editing the consultation re-calls this
-- function and updates the same row — no duplicates are ever created.
--
-- Follow-up lifecycle (reuses existing referral_workflow_status):
--   Pending_Encounter_Office  → visible in Encounter Module → Booking tab
--   Appointment_Booked        → date/time confirmed by encounter office
--   Encounter_Created         → patient arrived, new encounter opened
--   Completed                 → follow-up encounter closed
--   Cancelled                 → doctor cleared follow_up_date or admin cancelled
-- =============================================================================

CREATE OR REPLACE FUNCTION public.upsert_followup_booking(
  p_encounter_id          uuid,
  p_patient_id            uuid,
  p_requesting_doctor_id  uuid,
  p_source_clinic_id      uuid    DEFAULT NULL,
  p_follow_up_date        date    DEFAULT NULL,
  p_follow_up_notes       text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
  v_result_id   uuid;
BEGIN

  -- -----------------------------------------------------------------------
  -- 1. Look for an existing active Follow-Up booking for this encounter
  -- -----------------------------------------------------------------------
  SELECT id INTO v_existing_id
  FROM   public.clinical_requests
  WHERE  encounter_id  = p_encounter_id
    AND  request_type  = 'Follow-Up'::public.clinical_request_type
    AND  status       != 'Cancelled'::public.clinical_request_status
  ORDER  BY created_at DESC
  LIMIT  1;

  -- -----------------------------------------------------------------------
  -- 2a. Doctor cleared the date → cancel any existing booking
  -- -----------------------------------------------------------------------
  IF p_follow_up_date IS NULL THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.clinical_requests
      SET    status                   = 'Cancelled'::public.clinical_request_status,
             referral_workflow_status = 'Cancelled',
             updated_at              = now()
      WHERE  id = v_existing_id;
    END IF;
    RETURN v_existing_id;  -- NULL if no booking existed

  -- -----------------------------------------------------------------------
  -- 2b. Date set and existing booking found → UPDATE in place (no duplicate)
  -- -----------------------------------------------------------------------
  ELSIF v_existing_id IS NOT NULL THEN
    UPDATE public.clinical_requests
    SET    scheduled_date            = p_follow_up_date,
           appointment_date          = p_follow_up_date,
           follow_up_reason          = p_follow_up_notes,
           follow_up_instructions    = p_follow_up_notes,
           notes                     = p_follow_up_notes,
           clinical_reason           = COALESCE(p_follow_up_notes, 'Follow-up visit'),
           source_clinic_id          = COALESCE(p_source_clinic_id, source_clinic_id),
           -- If it was somehow cancelled before, reactivate it
           status                    = CASE
                                         WHEN status = 'Cancelled'::public.clinical_request_status
                                         THEN 'Pending'::public.clinical_request_status
                                         ELSE status
                                       END,
           referral_workflow_status  = CASE
                                         WHEN referral_workflow_status = 'Cancelled'
                                         THEN 'Pending_Encounter_Office'
                                         ELSE referral_workflow_status
                                       END,
           updated_at                = now()
    WHERE  id = v_existing_id
    RETURNING id INTO v_result_id;

    RETURN v_result_id;

  -- -----------------------------------------------------------------------
  -- 2c. Date set, no existing booking → INSERT new Follow-Up record
  -- -----------------------------------------------------------------------
  ELSE
    INSERT INTO public.clinical_requests (
      patient_id,
      encounter_id,
      requesting_doctor_id,
      source_clinic_id,
      request_type,
      clinical_reason,
      follow_up_reason,
      follow_up_instructions,
      notes,
      scheduled_date,
      appointment_date,
      urgency,
      status,
      referral_workflow_status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      p_patient_id,
      p_encounter_id,
      p_requesting_doctor_id,
      p_source_clinic_id,
      'Follow-Up'::public.clinical_request_type,
      COALESCE(NULLIF(TRIM(p_follow_up_notes), ''), 'Follow-up visit'),
      p_follow_up_notes,
      p_follow_up_notes,
      p_follow_up_notes,
      p_follow_up_date,
      p_follow_up_date,
      'Routine'::public.clinical_urgency,
      'Pending'::public.clinical_request_status,
      'Pending_Encounter_Office',
      p_requesting_doctor_id,
      now(),
      now()
    )
    RETURNING id INTO v_result_id;

    RETURN v_result_id;
  END IF;

END;
$$;

COMMENT ON FUNCTION public.upsert_followup_booking IS
  'Creates or updates a Follow-Up booking (clinical_request) when a doctor saves a consultation with a follow_up_date. '
  'Idempotent: calling it again with the same encounter_id updates the same row. '
  'Passing NULL for p_follow_up_date cancels any existing booking. '
  'The Encounter Office sees Follow-Up entries in the Booking tab (InternalReferralQueue).';

-- Grant execute to authenticated users (Supabase RLS)
GRANT EXECUTE ON FUNCTION public.upsert_followup_booking TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_followup_booking TO service_role;
