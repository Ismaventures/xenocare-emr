-- =============================================================================
-- MIGRATION 210: ADD HISTORY FIELDS TO get_specialty_dashboard RPC
-- =============================================================================
-- Problem: The specialty consultation timeline shows "Not recorded" for Clinical
--   Notes and Examination Findings because the RPC only returns clinical_notes
--   and examination_findings columns, but the wizard writes data to:
--     - history_of_present_illness / past_medical_history / family_history /
--       social_history / review_of_systems  (for clinical notes)
--     - specialty_data._exam_summary  (for exam findings — already returned)
--
-- Solution: Add the individual history columns to the history sub-query so the
--   timeline can show them as fallbacks when clinical_notes is null.
--
-- NOTE: The SpecialtyConsultationWizard handleSubmit has also been patched to
--   compose clinical_notes from these fields at save time (fixes new records).
--   This migration fixes the display of EXISTING saved records.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_specialty_dashboard(p_specialty_code varchar)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_config RECORD;
  v_stats jsonb;
  v_queue jsonb;
  v_referrals jsonb;
  v_procedures jsonb;
  v_exams jsonb;
  v_history jsonb;
  v_user_id uuid;
  v_today date := CURRENT_DATE;
BEGIN
  -- Get current user for access control
  v_user_id := auth.uid();

  -- Verify access to specialty
  IF NOT can_access_specialty(p_specialty_code) THEN
    RAISE EXCEPTION 'Access denied to specialty: %', p_specialty_code;
  END IF;

  -- Get specialty config from specialty_departments table
  SELECT * INTO v_config
  FROM specialty_departments
  WHERE specialty_code = p_specialty_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialty not found: %', p_specialty_code;
  END IF;

  -- Calculate stats for today
  SELECT jsonb_build_object(
    'waiting', COALESCE((
      SELECT COUNT(*) FROM queue q
      WHERE (q.specialty_code = p_specialty_code
             OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
        AND q.status IN ('Waiting', 'Called')
        AND q.created_at::date = v_today
    ), 0),
    'in_progress', COALESCE((
      SELECT COUNT(*) FROM queue q
      WHERE (q.specialty_code = p_specialty_code
             OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
        AND q.status = 'In Progress'
        AND q.created_at::date = v_today
    ), 0),
    'completed', COALESCE((
      SELECT COUNT(*) FROM queue q
      WHERE (q.specialty_code = p_specialty_code
             OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
        AND q.status = 'Completed'
        AND q.created_at::date = v_today
    ), 0),
    'pending_referrals', COALESCE((
      SELECT COUNT(*) FROM clinical_requests cr
      WHERE cr.target_specialty_code = p_specialty_code
        AND cr.request_type = 'Referral'
        AND cr.status IN ('Pending', 'Approved')
    ), 0),
    'pending_procedures', COALESCE((
      SELECT COUNT(*) FROM clinical_requests cr
      WHERE cr.target_specialty_code = p_specialty_code
        AND cr.request_type = 'Procedure'
        AND cr.status IN ('Pending', 'Approved', 'Scheduled')
    ), 0),
    'today_total', COALESCE((
      SELECT COUNT(*) FROM queue q
      WHERE (q.specialty_code = p_specialty_code
             OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
        AND q.created_at::date = v_today
    ), 0)
  ) INTO v_stats;

  -- Get queue (limited to 50 for performance)
  SELECT COALESCE(jsonb_agg(row_to_json(qr.*) ORDER BY qr.created_at ASC), '[]'::jsonb) INTO v_queue
  FROM (
    SELECT q.queue_id, q.queue_number, q.status, q.priority, q.notes,
           q.created_at, q.updated_at, q.called_at, q.seen_at,
           q.visit_id, q.encounter_id,
           p.patient_id, p.first_name, p.surname AS last_name, p.emr_number,
           p.date_of_birth, p.phone_number, p.gender,
           v.visit_date, v.visit_type, v.insurance_type
    FROM queue q
    JOIN patients p ON p.patient_id = q.patient_id
    LEFT JOIN visits v ON v.visit_id = q.visit_id
    WHERE (q.specialty_code = p_specialty_code
           OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
      AND q.status IN ('Waiting', 'Called', 'In Progress')
      AND q.created_at::date = v_today
    ORDER BY q.priority DESC, q.created_at ASC
    LIMIT 50
  ) qr;

  -- Get referrals (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(rr.*) ORDER BY rr.created_at DESC), '[]'::jsonb) INTO v_referrals
  FROM (
    SELECT cr.request_id, cr.request_type, cr.status, cr.priority, cr.reason,
           cr.clinical_findings, cr.provisional_diagnosis, cr.urgency,
           cr.created_at, cr.updated_at, cr.scheduled_date,
           cr.visit_id, cr.encounter_id,
           p.patient_id, p.first_name, p.surname AS last_name, p.emr_number,
           p.date_of_birth, p.gender,
           s.first_name AS requester_first, s.last_name AS requester_last,
           s.specialty_code AS requester_specialty
    FROM clinical_requests cr
    JOIN patients p ON p.patient_id = cr.patient_id
    LEFT JOIN staff s ON s.staff_id = cr.requested_by
    WHERE cr.target_specialty_code = p_specialty_code
      AND cr.request_type = 'Referral'
      AND cr.status IN ('Pending', 'Approved')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) rr;

  -- Get scheduled procedures (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(pr.*) ORDER BY pr.created_at DESC), '[]'::jsonb) INTO v_procedures
  FROM (
    SELECT cr.request_id, cr.request_type, cr.status, cr.priority, cr.reason,
           cr.clinical_findings, cr.provisional_diagnosis,
           cr.created_at, cr.updated_at, cr.scheduled_date,
           cr.visit_id, cr.encounter_id,
           p.patient_id, p.first_name, p.surname AS last_name, p.emr_number
    FROM clinical_requests cr
    JOIN patients p ON p.patient_id = cr.patient_id
    WHERE cr.target_specialty_code = p_specialty_code
      AND cr.request_type = 'Procedure'
      AND cr.status IN ('Pending', 'Approved', 'Scheduled')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) pr;

  -- Get recent exams/consultations (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(se.*) ORDER BY se.created_at DESC), '[]'::jsonb) INTO v_exams
  FROM (
    SELECT c.consultation_id AS id,
           'Consultation' AS exam_type,
           c.status,
           c.examination_findings AS findings,
           c.consultation_date AS created_at,
           c.consultation_date AS completed_at,
           p.first_name, p.surname AS last_name, p.emr_number,
           s.first_name AS examiner_first, s.last_name AS examiner_last
    FROM consultations c
    JOIN patients p ON p.patient_id = c.patient_id
    LEFT JOIN staff s ON s.staff_id = c.doctor_id
    WHERE c.specialty_code = p_specialty_code
      AND c.consultation_date >= (CURRENT_DATE - INTERVAL '7 days')
    ORDER BY c.consultation_date DESC
    LIMIT 20
  ) se;

  -- Get consultation history (limited to 50) with FULL details for viewing
  -- Includes granular history fields so the timeline can display them when
  -- clinical_notes is null (common for consultations saved before migration 210)
  SELECT COALESCE(jsonb_agg(row_to_json(sh.*) ORDER BY sh.consultation_date DESC), '[]'::jsonb) INTO v_history
  FROM (
    SELECT c.consultation_id AS id,
           c.complaints,
           c.complaints AS chief_complaint,
           c.diagnosis,
           c.clinical_notes,
           -- Granular history fields (fallbacks for clinical_notes display)
           c.history_of_present_illness,
           c.past_medical_history,
           c.family_history,
           c.social_history,
           c.review_of_systems,
           -- Examination
           c.examination_findings,
           c.physical_examination,
           c.treatment_plan,
           c.specialty_data,
           c.specialty_code,
           COALESCE(c.icd10_codes, '[]'::jsonb) AS icd_codes,
           c.status,
           p.first_name, p.surname AS last_name, p.emr_number, p.patient_id,
           s.first_name AS doctor_first, s.last_name AS doctor_last,
           c.visit_id, c.encounter_id,
           c.consultation_date,
           c.created_at,
           c.updated_at
    FROM consultations c
    JOIN patients p ON p.patient_id = c.patient_id
    LEFT JOIN staff s ON s.staff_id = c.doctor_id
    WHERE c.specialty_code = p_specialty_code
    ORDER BY c.consultation_date DESC
    LIMIT 50
  ) sh;

  -- Return aggregated dashboard data
  RETURN jsonb_build_object(
    'config', row_to_json(v_config),
    'stats', v_stats,
    'queue', v_queue,
    'referrals', v_referrals,
    'procedures', v_procedures,
    'exams', v_exams,
    'history', v_history
  );
END;
$$;

COMMENT ON FUNCTION get_specialty_dashboard(varchar) IS
  'Returns aggregated dashboard data for a specialty in ONE call. Updated (migration 210) to include granular history fields (hpi, pmh, etc.) in the history sub-query for timeline display fallback.';
