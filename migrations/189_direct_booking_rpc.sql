-- Migration 189: Add SECURITY DEFINER RPC for direct appointment booking
-- This bypasses RLS and satisfies the encounter_id NOT NULL constraint by
-- creating a lightweight placeholder visit record first, then using its UUID
-- as encounter_id in the clinical_request. The placeholder visit can be
-- upgraded to a full encounter when the patient arrives.

CREATE OR REPLACE FUNCTION public.create_direct_booking(
  p_patient_id        uuid,
  p_urgency           text,
  p_clinical_reason   text,
  p_notes             text,
  p_target_department_id uuid,
  p_appointment_date  date,
  p_appointment_time  text,
  p_requesting_doctor_id uuid,
  p_created_by        uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as function owner (postgres), bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_visit_id    uuid;
  v_request_id  uuid;
BEGIN
  -- Step 1: Create a placeholder visit/encounter record.
  -- visit_id (varchar) is NOT NULL with no default, so we generate a compact unique value.
  -- status='Scheduled' distinguishes it from live encounters ('Active').
  INSERT INTO public.visits (
    visit_id,
    patient_id,
    visit_type,
    status,
    start_time,
    encounter_date,
    payer_type,
    registered_by
  ) VALUES (
    'BOOKING-' || upper(substr(extensions.uuid_generate_v4()::text, 1, 8)),
    p_patient_id,
    'Appointment',
    'Scheduled',
    COALESCE(
      (p_appointment_date::text || ' ' || COALESCE(p_appointment_time, '08:00'))::timestamp with time zone,
      now()
    ),
    p_appointment_date,
    'private',
    p_created_by
  )
  RETURNING id INTO v_visit_id;

  -- Step 2: Create the clinical_request linked to the placeholder visit.
  INSERT INTO public.clinical_requests (
    patient_id,
    encounter_id,
    request_type,
    urgency,
    clinical_reason,
    notes,
    target_department_id,
    status,
    referral_workflow_status,
    appointment_date,
    appointment_time,
    requesting_doctor_id,
    appointment_booked_by,
    appointment_booked_at,
    created_by
  ) VALUES (
    p_patient_id,
    v_visit_id,
    'Referral',
    p_urgency,
    p_clinical_reason,
    p_notes,
    p_target_department_id,
    'Approved',
    'Appointment_Booked',
    p_appointment_date,
    p_appointment_time,
    p_requesting_doctor_id,
    p_requesting_doctor_id,
    now(),
    p_created_by
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Allow authenticated and anon users to call this function
GRANT EXECUTE ON FUNCTION public.create_direct_booking(
  uuid, text, text, text, uuid, date, text, uuid, uuid
) TO anon, authenticated;

