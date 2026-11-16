-- =============================================================================
-- Migration 133: Add encounter_id and visit_id to specialty queue RPC response
-- =============================================================================
-- 
-- Problem: The get_specialty_dashboard RPC doesn't return visit_id or encounter_id
--          for queue patients, which breaks the encounter-centric architecture.
--          Clinical records cannot be created without a valid encounter_id.
--
-- Solution: Update the RPC to include q.visit_id and q.encounter_id in the queue query
-- =============================================================================

-- Update the get_specialty_dashboard function to include encounter IDs in queue
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
  -- UPDATED: Now includes visit_id and encounter_id for encounter-centric clinical records
  SELECT COALESCE(jsonb_agg(row_to_json(sq.*) ORDER BY sq.created_at), '[]'::jsonb) INTO v_queue
  FROM (
    SELECT q.id, q.ticket_number, q.status, q.priority, q.created_at, q.called_at,
           p.first_name, p.surname AS last_name, p.emr_number, p.patient_id,
           s_assigned.first_name AS assigned_doctor_first, s_assigned.last_name AS assigned_doctor_last,
           q.visit_id, q.encounter_id  -- CRITICAL: Required for clinical record linkage
    FROM queue q
    JOIN patients p ON p.id = q.patient_id
    LEFT JOIN staff s_assigned ON s_assigned.id = q.assigned_to
    WHERE (q.specialty_code = p_specialty_code 
           OR (q.location::TEXT = v_config.queue_department AND v_config.requires_dedicated_queue = true))
      AND q.status IN ('Waiting', 'Called', 'In Progress')
    ORDER BY q.created_at
    LIMIT 50
  ) sq;

  -- Get pending referrals (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(sr.*) ORDER BY sr.created_at DESC), '[]'::jsonb) INTO v_referrals
  FROM (
    SELECT cr.id, cr.request_number, cr.status, cr.urgency, cr.clinical_reason AS clinical_notes, cr.created_at,
           p.first_name, p.surname AS last_name, p.emr_number,
           s.first_name AS requesting_doctor_first, s.last_name AS requesting_doctor_last
    FROM clinical_requests cr
    JOIN patients p ON p.id = cr.patient_id
    LEFT JOIN staff s ON s.id = cr.requesting_doctor_id
    WHERE cr.target_specialty_code = p_specialty_code 
      AND cr.request_type = 'Referral'
      AND cr.status IN ('Pending', 'Approved', 'In_Progress')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) sr;

  -- Get pending procedures (limited to 20)
  SELECT COALESCE(jsonb_agg(row_to_json(sp.*) ORDER BY sp.created_at DESC), '[]'::jsonb) INTO v_procedures
  FROM (
    SELECT cr.id, cr.request_number, 
           COALESCE(cr.procedure_name, 'Procedure') AS procedure_name,
           cr.request_type AS procedure_type,
           cr.status, cr.urgency, cr.clinical_reason AS clinical_notes, cr.created_at,
           p.first_name, p.surname AS last_name, p.emr_number,
           s.first_name AS requesting_doctor_first, s.last_name AS requesting_doctor_last
    FROM clinical_requests cr
    JOIN patients p ON p.id = cr.patient_id
    LEFT JOIN staff s ON s.id = cr.requesting_doctor_id
    WHERE cr.target_specialty_code = p_specialty_code 
      AND cr.request_type = 'Procedure'
      AND cr.status IN ('Pending', 'Approved', 'In_Progress', 'Scheduled')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) sp;

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
  SELECT COALESCE(jsonb_agg(row_to_json(sh.*) ORDER BY sh.consultation_date DESC), '[]'::jsonb) INTO v_history
  FROM (
    SELECT c.consultation_id AS id,
           c.complaints,
           c.complaints AS chief_complaint,
           c.diagnosis,
           c.clinical_notes,
           c.examination_findings,
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

-- Update the function comment
COMMENT ON FUNCTION get_specialty_dashboard(varchar) IS 
  'Returns aggregated dashboard data for a specialty in ONE call. Updated to include visit_id and encounter_id for encounter-centric clinical records.';
