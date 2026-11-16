-- Migration: Comprehensive Patient Clinical Context RPC
-- Returns structured JSON with ALL clinical data for a patient,
-- including staff attribution (doctor/nurse names).
-- Strict patient-scoping: only returns data for the given patient.

-- ============================================================
-- get_patient_clinical_context
-- Single function that returns a full structured JSON "chart"
-- for a single patient, including staff names.
-- ============================================================
CREATE OR REPLACE FUNCTION get_patient_clinical_context(
  p_patient_id uuid,
  p_max_per_section int DEFAULT 25
)
RETURNS jsonb AS $$
DECLARE
  v_patient_varchar varchar(50);
  v_patient_uuid uuid;
  v_result jsonb;
  v_demographics jsonb;
  v_encounters jsonb;
  v_consultations jsonb;
  v_nursing_notes jsonb;
  v_vitals jsonb;
  v_lab_results jsonb;
  v_radiology jsonb;
  v_prescriptions jsonb;
  v_admissions jsonb;
  v_ward_rounds jsonb;
  v_progress_notes jsonb;
  v_procedures jsonb;
  v_referrals jsonb;
  v_triage jsonb;
  v_allergies jsonb;
BEGIN
  -- ── Resolve both ID formats ──
  SELECT p.id, p.patient_id INTO v_patient_uuid, v_patient_varchar
    FROM patients p WHERE p.id = p_patient_id;
  IF v_patient_uuid IS NULL THEN
    SELECT p.id, p.patient_id INTO v_patient_uuid, v_patient_varchar
      FROM patients p WHERE p.patient_id = p_patient_id::text;
  END IF;
  IF v_patient_uuid IS NULL THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  -- ── 1. Demographics ──
  SELECT jsonb_build_object(
    'name', p.first_name || ' ' || COALESCE(p.middle_name || ' ', '') || p.surname,
    'emr_number', p.emr_number,
    'gender', p.gender::text,
    'date_of_birth', p.date_of_birth,
    'age_years', EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth)),
    'blood_group', p.blood_group,
    'allergies', COALESCE(p.known_allergies, ARRAY[]::text[]),
    'phone', p.contact_phone,
    'category', p.patient_category::text,
    'insurance_type', p.insurance_type::text,
    'nhis_number', p.nhis_number,
    'occupation', p.occupation,
    'clinical_summary', p.clinical_summary,
    'nok_name', p.nok_name,
    'nok_phone', p.nok_phone,
    'nok_relationship', p.nok_relationship,
    'current_status', p.current_status
  ) INTO v_demographics
  FROM patients p WHERE p.id = v_patient_uuid;

  -- ── 2. Encounters (visits) ──
  SELECT COALESCE(jsonb_agg(enc ORDER BY enc->>'encounter_date' DESC), '[]'::jsonb) INTO v_encounters
  FROM (
    SELECT jsonb_build_object(
      'encounter_id', v.id,
      'visit_id', v.visit_id,
      'encounter_date', v.encounter_date,
      'visit_type', v.visit_type,
      'chief_complaint', v.chief_complaint,
      'status', v.status::text,
      'category', v.encounter_category,
      'priority', v.priority::text,
      'current_stage', v.current_stage,
      'attending_doctor', COALESCE(
        s.first_name || ' ' || s.last_name,
        'Not assigned'
      ),
      'attending_doctor_role', s.role::text,
      'clinic_name', cl.name,
      'ward_location', v.ward_location,
      'bed_number', v.bed_number,
      'discharge_date', v.discharge_date,
      'discharge_notes', v.discharge_notes
    ) AS enc
    FROM visits v
    LEFT JOIN staff s ON v.attending_doctor_id = s.id
    LEFT JOIN clinics cl ON v.clinic_id = cl.id
    WHERE v.patient_id = v_patient_uuid
    ORDER BY v.encounter_date DESC NULLS LAST
    LIMIT p_max_per_section
  ) sub;

  -- ── 3. Consultations (with doctor names) ──
  SELECT COALESCE(jsonb_agg(con ORDER BY con->>'consultation_date' DESC), '[]'::jsonb) INTO v_consultations
  FROM (
    SELECT jsonb_build_object(
      'consultation_id', c.consultation_id,
      'encounter_id', c.encounter_id,
      'consultation_date', c.consultation_date,
      'complaints', c.complaints,
      'history_of_present_illness', c.history_of_present_illness,
      'past_medical_history', c.past_medical_history,
      'family_history', c.family_history,
      'social_history', c.social_history,
      'review_of_systems', c.review_of_systems,
      'examination_findings', c.examination_findings,
      'physical_examination', c.physical_examination,
      'assessment', c.assessment,
      'plan', c.plan,
      'treatment_plan', c.treatment_plan,
      'diagnosis', c.diagnosis,
      'diagnosis_text', c.diagnosis_text,
      'differential_diagnosis', c.differential_diagnosis,
      'icd10_codes', c.icd10_codes,
      'clinical_notes', c.clinical_notes,
      'recommendations', c.recommendations,
      'follow_up_date', c.follow_up_date,
      'follow_up_notes', c.follow_up_notes,
      'doctor_name', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown'),
      'doctor_role', s.role::text,
      'status', c.status::text
    ) AS con
    FROM consultations c
    JOIN visits v ON c.encounter_id = v.id
    LEFT JOIN staff s ON c.doctor_id = s.staff_id
    WHERE v.patient_id = v_patient_uuid
    ORDER BY c.consultation_date DESC NULLS LAST
    LIMIT p_max_per_section
  ) sub;

  -- ── 4. Nursing Notes (with nurse names) ──
  SELECT COALESCE(jsonb_agg(nn ORDER BY nn->>'created_at' DESC), '[]'::jsonb) INTO v_nursing_notes
  FROM (
    SELECT jsonb_build_object(
      'id', n.id,
      'encounter_id', n.encounter_id,
      'note_type', n.note_type,
      'title', n.title,
      'content', n.content,
      'patient_condition', n.patient_condition,
      'pain_level', n.pain_level,
      'interventions_performed', n.interventions_performed,
      'patient_response', n.patient_response,
      'is_critical', n.is_critical,
      'shift', n.shift,
      'created_at', n.created_at,
      'nurse_name', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown'),
      'doctor_reviewed_by', COALESCE(s2.first_name || ' ' || s2.last_name, NULL),
      'doctor_reviewed_at', n.doctor_reviewed_at
    ) AS nn
    FROM nursing_notes n
    LEFT JOIN staff s ON n.recorded_by = s.id
    LEFT JOIN staff s2 ON n.doctor_reviewed_by = s2.id
    WHERE n.patient_id = v_patient_uuid
    ORDER BY n.created_at DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 5. Vitals (with recording nurse) ──
  SELECT COALESCE(jsonb_agg(vt ORDER BY vt->>'date_recorded' DESC), '[]'::jsonb) INTO v_vitals
  FROM (
    SELECT jsonb_build_object(
      'date_recorded', vt.date_recorded,
      'temperature', vt.temperature,
      'bp_systolic', vt.blood_pressure_systolic,
      'bp_diastolic', vt.blood_pressure_diastolic,
      'blood_pressure', vt.blood_pressure,
      'pulse', vt.pulse,
      'respiratory_rate', vt.respiratory_rate,
      'oxygen_saturation', vt.oxygen_saturation,
      'weight', vt.weight,
      'height', vt.height,
      'bmi', vt.bmi,
      'blood_glucose', vt.blood_glucose,
      'pain_level', vt.pain_level,
      'is_critical', vt.is_critical,
      'notes', vt.notes,
      'recorded_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
    ) AS vt
    FROM vitals vt
    LEFT JOIN staff s ON vt.nurse_id = s.id
    WHERE vt.patient_id = v_patient_uuid
    ORDER BY vt.date_recorded DESC NULLS LAST
    LIMIT p_max_per_section
  ) sub;

  -- ── 6. Lab Results (with ordering doctor and technician) ──
  SELECT COALESCE(jsonb_agg(lr ORDER BY lr->>'created_at' DESC), '[]'::jsonb) INTO v_lab_results
  FROM (
    SELECT jsonb_build_object(
      'request_id', req.request_id,
      'created_at', req.created_at,
      'status', req.status::text,
      'priority', req.priority::text,
      'is_critical', req.is_critical,
      'clinical_notes', req.clinical_notes,
      'test_name', COALESCE(cat.name, 'Unknown Test'),
      'result_value', COALESCE(res.result_value, req.result_value::text),
      'unit', COALESCE(res.unit, req.result_unit),
      'reference_range', COALESCE(res.reference_range, req.reference_range),
      'is_abnormal', res.is_abnormal,
      'interpretation', COALESCE(res.interpretation, req.interpretation),
      'result_notes', req.result_notes,
      'result_date', COALESCE(res.reported_at, req.result_date),
      'ordered_by', COALESCE(s_ord.first_name || ' ' || s_ord.last_name, 'Unknown'),
      'technician', COALESCE(s_tech.first_name || ' ' || s_tech.last_name, NULL),
      'verified_by', COALESCE(s_ver.first_name || ' ' || s_ver.last_name, NULL)
    ) AS lr
    FROM lab_requests req
    JOIN visits v ON req.encounter_id = v.id
    LEFT JOIN lab_test_catalogue cat ON req.test_id = cat.id
    LEFT JOIN lab_results res ON res.request_id = req.request_id
    LEFT JOIN staff s_ord ON req.ordered_by = s_ord.staff_id
    LEFT JOIN staff s_tech ON res.technician_id = s_tech.id
    LEFT JOIN staff s_ver ON res.verified_by = s_ver.id
    WHERE v.patient_id = v_patient_uuid
    ORDER BY req.created_at DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 7. Radiology (with ordering doctor and radiologist) ──
  SELECT COALESCE(jsonb_agg(rx ORDER BY rx->>'created_at' DESC), '[]'::jsonb) INTO v_radiology
  FROM (
    SELECT jsonb_build_object(
      'request_id', r.request_id,
      'created_at', r.created_at,
      'imaging_type', r.imaging_type,
      'body_part', r.body_part,
      'clinical_indication', r.clinical_indication,
      'clinical_history', r.clinical_history,
      'status', r.status::text,
      'priority', r.priority::text,
      'findings', COALESCE(sr.findings, r.findings),
      'impression', COALESCE(sr.impression, r.impression),
      'recommendation', sr.recommendation,
      'report', r.report,
      'ordered_by', COALESCE(s_ord.first_name || ' ' || s_ord.last_name, 'Unknown'),
      'radiologist', COALESCE(s_rad.first_name || ' ' || s_rad.last_name, NULL),
      'performed_at', COALESCE(r.performed_at, r.scan_completed_at)
    ) AS rx
    FROM radiology_requests r
    JOIN visits v ON r.encounter_id = v.id
    LEFT JOIN scan_results sr ON sr.request_id = r.request_id
    LEFT JOIN staff s_ord ON r.ordered_by = s_ord.staff_id
    LEFT JOIN staff s_rad ON sr.radiologist_id = s_rad.id
    WHERE v.patient_id = v_patient_uuid
    ORDER BY r.created_at DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 8. Prescriptions / Medications (with prescribing doctor) ──
  SELECT COALESCE(jsonb_agg(px ORDER BY px->>'created_at' DESC), '[]'::jsonb) INTO v_prescriptions
  FROM (
    SELECT jsonb_build_object(
      'prescription_id', p.prescription_id,
      'created_at', p.created_at,
      'drug_name', COALESCE(p.drug_name, dc.name, 'Unknown Drug'),
      'dosage', p.dosage,
      'frequency', p.frequency,
      'duration', p.duration,
      'route', p.route,
      'quantity_prescribed', p.quantity_prescribed,
      'quantity_dispensed', p.quantity_dispensed,
      'instructions', p.instructions,
      'status', p.status::text,
      'clinical_notes', p.clinical_notes,
      'prescribed_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown'),
      'dispensed_at', p.dispensed_at,
      'dispensed_by', COALESCE(s2.first_name || ' ' || s2.last_name, NULL)
    ) AS px
    FROM prescriptions p
    JOIN visits v ON p.encounter_id = v.id
    LEFT JOIN drug_catalogue dc ON p.drug_id = dc.id
    LEFT JOIN staff s ON p.doctor_id = s.staff_id
    LEFT JOIN staff s2 ON p.dispensed_by = s2.id
    WHERE v.patient_id = v_patient_uuid
    ORDER BY p.created_at DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 9. Admissions (with care team) ──
  SELECT COALESCE(jsonb_agg(adm ORDER BY adm->>'admission_date' DESC), '[]'::jsonb) INTO v_admissions
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'admission_number', a.admission_number,
      'admission_date', a.admission_date,
      'actual_discharge_date', a.actual_discharge_date,
      'admission_type', a.admission_type,
      'admission_status', a.admission_status,
      'acuity_level', a.acuity_level,
      'chief_complaint', a.chief_complaint,
      'reason_for_admission', a.reason_for_admission,
      'admitting_diagnosis', a.admitting_diagnosis,
      'admitting_diagnosis_icd10', a.admitting_diagnosis_icd10,
      'secondary_diagnoses', a.secondary_diagnoses,
      'discharge_diagnosis', a.discharge_diagnosis,
      'discharge_summary', a.discharge_summary,
      'discharge_instructions', a.discharge_instructions,
      'discharge_medications', a.discharge_medications,
      'code_status', a.code_status,
      'diet_type', a.diet_type,
      'activity_level', a.activity_level,
      'isolation_required', a.isolation_required,
      'allergies_snapshot', a.allergies_snapshot,
      'notes', a.notes,
      'admitting_doctor', COALESCE(s1.first_name || ' ' || s1.last_name, 'Unknown'),
      'attending_physician', COALESCE(s2.first_name || ' ' || s2.last_name, NULL),
      'primary_nurse', COALESCE(s3.first_name || ' ' || s3.last_name, NULL),
      'ward_name', w.name,
      'bed_number', b.bed_number
    ) AS adm
    FROM admissions a
    LEFT JOIN staff s1 ON a.admitting_doctor_id = s1.id
    LEFT JOIN staff s2 ON a.attending_physician_id = s2.id
    LEFT JOIN staff s3 ON a.primary_nurse_id = s3.id
    LEFT JOIN wards w ON a.current_ward_id = w.id
    LEFT JOIN beds b ON a.current_bed_id = b.id
    WHERE a.patient_id = v_patient_uuid
    ORDER BY a.admission_date DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 10. Ward Round Notes (with physician) ──
  SELECT COALESCE(jsonb_agg(wrn ORDER BY wrn->>'round_date' DESC), '[]'::jsonb) INTO v_ward_rounds
  FROM (
    SELECT jsonb_build_object(
      'id', w.id,
      'round_date', w.round_date,
      'round_type', w.round_type,
      'subjective_notes', w.subjective_notes,
      'objective_findings', w.objective_findings,
      'vital_signs', w.vital_signs,
      'assessment', w.assessment,
      'plan', w.plan,
      'nursing_instructions', w.nursing_instructions,
      'patient_condition', w.patient_condition,
      'estimated_discharge_date', w.estimated_discharge_date,
      'attending_physician', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown'),
      'created_by', COALESCE(s2.first_name || ' ' || s2.last_name, 'Unknown'),
      'participants', w.participants
    ) AS wrn
    FROM ward_round_notes w
    LEFT JOIN staff s ON w.attending_physician_id = s.id
    LEFT JOIN staff s2 ON w.created_by = s2.id
    WHERE w.encounter_id IN (SELECT id FROM visits WHERE patient_id = v_patient_uuid)
    ORDER BY w.round_date DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 11. Daily Progress Notes ──
  SELECT COALESCE(jsonb_agg(dpn ORDER BY dpn->>'note_date' DESC), '[]'::jsonb) INTO v_progress_notes
  FROM (
    SELECT jsonb_build_object(
      'note_date', d.note_date,
      'subjective', d.subjective,
      'objective', d.objective,
      'assessment', d.assessment,
      'plan', d.plan,
      'nursing_summary', d.nursing_summary,
      'vital_signs_summary', d.vital_signs_summary,
      'patient_condition', d.patient_condition,
      'alert_level', d.alert_level,
      'intake_oral_ml', d.oral_intake_ml,
      'intake_iv_ml', d.iv_intake_ml,
      'urine_output_ml', d.urine_output_ml,
      'recorded_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
    ) AS dpn
    FROM daily_progress_notes d
    LEFT JOIN staff s ON d.recorded_by = s.id
    WHERE d.patient_id = v_patient_uuid
    ORDER BY d.note_date DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 12. Procedures ──
  SELECT COALESCE(jsonb_agg(pr ORDER BY pr->>'scheduled_date' DESC), '[]'::jsonb) INTO v_procedures
  FROM (
    SELECT jsonb_build_object(
      'procedure_number', p.procedure_number,
      'procedure_name', p.procedure_name,
      'procedure_code', p.procedure_code,
      'scheduled_date', p.scheduled_date,
      'actual_start_time', p.actual_start_time,
      'actual_end_time', p.actual_end_time,
      'status', p.status,
      'priority', p.priority,
      'indication', p.indication,
      'pre_procedure_diagnosis', p.pre_procedure_diagnosis,
      'post_procedure_diagnosis', p.post_procedure_diagnosis,
      'anesthesia_type', p.anesthesia_type,
      'procedure_notes', p.procedure_notes,
      'findings', p.findings,
      'technique_description', p.technique_description,
      'complications', p.complications,
      'estimated_blood_loss_ml', p.estimated_blood_loss_ml,
      'post_op_instructions', p.post_op_instructions,
      'primary_surgeon', COALESCE(s1.first_name || ' ' || s1.last_name, 'Unknown'),
      'anesthesiologist', COALESCE(s2.first_name || ' ' || s2.last_name, NULL),
      'scrub_nurse', COALESCE(s3.first_name || ' ' || s3.last_name, NULL)
    ) AS pr
    FROM procedures p
    LEFT JOIN staff s1 ON p.primary_surgeon_id = s1.id
    LEFT JOIN staff s2 ON p.anesthesiologist_id = s2.id
    LEFT JOIN staff s3 ON p.scrub_nurse_id = s3.id
    WHERE p.patient_id = v_patient_uuid
    ORDER BY p.scheduled_date DESC NULLS LAST
    LIMIT p_max_per_section
  ) sub;

  -- ── 13. Referrals ──
  SELECT COALESCE(jsonb_agg(ref ORDER BY ref->>'created_at' DESC), '[]'::jsonb) INTO v_referrals
  FROM (
    SELECT jsonb_build_object(
      'referral_number', r.referral_number,
      'referral_type', r.referral_type::text,
      'priority', r.priority::text,
      'status', r.status::text,
      'reason_for_referral', r.reason_for_referral,
      'clinical_summary', r.clinical_summary,
      'created_at', r.created_at,
      'referring_physician', COALESCE(s1.first_name || ' ' || s1.last_name, 'Unknown'),
      'receiving_physician', COALESCE(s2.first_name || ' ' || s2.last_name, NULL),
      'source_department', sd.name,
      'target_department', td.name
    ) AS ref
    FROM referrals r
    LEFT JOIN staff s1 ON r.referring_physician_id = s1.id
    LEFT JOIN staff s2 ON r.receiving_physician_id = s2.id
    LEFT JOIN departments sd ON r.source_department_id = sd.id
    LEFT JOIN departments td ON r.target_department_id = td.id
    WHERE r.patient_id = v_patient_uuid
    ORDER BY r.created_at DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── 14. Triage Assessments ──
  SELECT COALESCE(jsonb_agg(tr ORDER BY tr->>'created_at' DESC), '[]'::jsonb) INTO v_triage
  FROM (
    SELECT jsonb_build_object(
      'created_at', t.created_at,
      'chief_complaint', t.chief_complaint_text,
      'triage_level', t.triage_level,
      'triage_color', t.triage_color,
      'temperature', t.temperature,
      'bp_systolic', t.blood_pressure_systolic,
      'bp_diastolic', t.blood_pressure_diastolic,
      'pulse_rate', t.pulse_rate,
      'respiratory_rate', t.respiratory_rate,
      'oxygen_saturation', t.oxygen_saturation,
      'weight', t.weight,
      'pain_score', t.pain_score,
      'consciousness', t.consciousness::text,
      'triaged_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
    ) AS tr
    FROM triage_assessments t
    LEFT JOIN staff s ON t.triaged_by = s.id
    WHERE t.patient_id = v_patient_uuid
    ORDER BY t.created_at DESC
    LIMIT p_max_per_section
  ) sub;

  -- ── Assemble result ──
  v_result := jsonb_build_object(
    'demographics', v_demographics,
    'encounters', v_encounters,
    'consultations', v_consultations,
    'nursing_notes', v_nursing_notes,
    'vitals', v_vitals,
    'lab_results', v_lab_results,
    'radiology', v_radiology,
    'prescriptions', v_prescriptions,
    'admissions', v_admissions,
    'ward_round_notes', v_ward_rounds,
    'daily_progress_notes', v_progress_notes,
    'procedures', v_procedures,
    'referrals', v_referrals,
    'triage', v_triage,
    'generated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
   SET search_path = public;

-- ============================================================
-- get_patient_encounter_details
-- Returns all clinical data for a SPECIFIC encounter
-- ============================================================
CREATE OR REPLACE FUNCTION get_patient_encounter_details(
  p_patient_id uuid,
  p_encounter_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_patient_uuid uuid;
  v_result jsonb;
BEGIN
  -- Resolve patient ID
  SELECT p.id INTO v_patient_uuid FROM patients p WHERE p.id = p_patient_id;
  IF v_patient_uuid IS NULL THEN
    SELECT p.id INTO v_patient_uuid FROM patients p WHERE p.patient_id = p_patient_id::text;
  END IF;
  IF v_patient_uuid IS NULL THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  -- Verify the encounter belongs to this patient
  IF NOT EXISTS (
    SELECT 1 FROM visits WHERE id = p_encounter_id AND patient_id = v_patient_uuid
  ) THEN
    RAISE EXCEPTION 'Encounter not found for this patient';
  END IF;

  SELECT jsonb_build_object(
    'encounter', (
      SELECT jsonb_build_object(
        'id', v.id, 'visit_id', v.visit_id, 'encounter_date', v.encounter_date,
        'visit_type', v.visit_type, 'chief_complaint', v.chief_complaint,
        'status', v.status::text, 'category', v.encounter_category,
        'attending_doctor', COALESCE(s.first_name || ' ' || s.last_name, 'Not assigned'),
        'discharge_date', v.discharge_date, 'discharge_notes', v.discharge_notes
      )
      FROM visits v LEFT JOIN staff s ON v.attending_doctor_id = s.id
      WHERE v.id = p_encounter_id
    ),
    'consultations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'consultation_date', c.consultation_date,
        'complaints', c.complaints, 'history_of_present_illness', c.history_of_present_illness,
        'examination_findings', c.examination_findings, 'assessment', c.assessment,
        'plan', c.plan, 'diagnosis', c.diagnosis, 'diagnosis_text', c.diagnosis_text,
        'icd10_codes', c.icd10_codes, 'clinical_notes', c.clinical_notes,
        'treatment_plan', c.treatment_plan,
        'doctor_name', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
      ))
      FROM consultations c LEFT JOIN staff s ON c.doctor_id = s.staff_id
      WHERE c.encounter_id = p_encounter_id
    ), '[]'::jsonb),
    'vitals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date_recorded', vt.date_recorded,
        'temperature', vt.temperature, 'blood_pressure', vt.blood_pressure,
        'pulse', vt.pulse, 'respiratory_rate', vt.respiratory_rate,
        'oxygen_saturation', vt.oxygen_saturation, 'weight', vt.weight,
        'pain_level', vt.pain_level,
        'recorded_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
      ) ORDER BY vt.date_recorded DESC)
      FROM vitals vt LEFT JOIN staff s ON vt.nurse_id = s.id
      WHERE vt.encounter_id = p_encounter_id
    ), '[]'::jsonb),
    'nursing_notes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'title', n.title, 'content', n.content, 'note_type', n.note_type,
        'patient_condition', n.patient_condition, 'is_critical', n.is_critical,
        'created_at', n.created_at,
        'nurse_name', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
      ) ORDER BY n.created_at DESC)
      FROM nursing_notes n LEFT JOIN staff s ON n.recorded_by = s.id
      WHERE n.encounter_id = p_encounter_id
    ), '[]'::jsonb),
    'lab_requests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'created_at', lr.created_at, 'status', lr.status::text,
        'test_name', COALESCE(cat.name, 'Unknown'), 'clinical_notes', lr.clinical_notes,
        'result_value', COALESCE(res.result_value, lr.result_value::text),
        'reference_range', COALESCE(res.reference_range, lr.reference_range),
        'is_abnormal', res.is_abnormal, 'interpretation', COALESCE(res.interpretation, lr.interpretation),
        'ordered_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
      ) ORDER BY lr.created_at DESC)
      FROM lab_requests lr
      LEFT JOIN lab_test_catalogue cat ON lr.test_id = cat.id
      LEFT JOIN lab_results res ON res.request_id = lr.request_id
      LEFT JOIN staff s ON lr.ordered_by = s.staff_id
      WHERE lr.encounter_id = p_encounter_id
    ), '[]'::jsonb),
    'radiology', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'imaging_type', r.imaging_type, 'body_part', r.body_part,
        'clinical_indication', r.clinical_indication, 'status', r.status::text,
        'findings', COALESCE(sr.findings, r.findings),
        'impression', COALESCE(sr.impression, r.impression),
        'ordered_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
      ) ORDER BY r.created_at DESC)
      FROM radiology_requests r
      LEFT JOIN scan_results sr ON sr.request_id = r.request_id
      LEFT JOIN staff s ON r.ordered_by = s.staff_id
      WHERE r.encounter_id = p_encounter_id
    ), '[]'::jsonb),
    'prescriptions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'drug_name', COALESCE(p.drug_name, dc.name, 'Unknown'),
        'dosage', p.dosage, 'frequency', p.frequency, 'duration', p.duration,
        'route', p.route, 'instructions', p.instructions, 'status', p.status::text,
        'prescribed_by', COALESCE(s.first_name || ' ' || s.last_name, 'Unknown')
      ) ORDER BY p.created_at DESC)
      FROM prescriptions p
      LEFT JOIN drug_catalogue dc ON p.drug_id = dc.id
      LEFT JOIN staff s ON p.doctor_id = s.staff_id
      WHERE p.encounter_id = p_encounter_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
   SET search_path = public;
