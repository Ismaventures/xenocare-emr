/**
 * =============================================================================
 * XENOCARE EMR - MEDICAL RECORDS CONSTANTS
 * Toggleable logging and shared constants
 * =============================================================================
 */

// =============================================================================
// Logging Configuration
// =============================================================================

/**
 * Set to false in production to disable verbose logging
 */
export const LOG_ENABLED = true;

/**
 * Module-prefixed logger that can be toggled
 */
function formatLogArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return arg;
  }

  if (
    typeof arg === 'number' ||
    typeof arg === 'boolean' ||
    typeof arg === 'bigint'
  ) {
    return String(arg);
  }

  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }

  if (arg == null) {
    return '';
  }

  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function log(level: 'log' | 'warn' | 'error', ...args: unknown[]): void {
  if (!LOG_ENABLED && level === 'log') return;

  const prefix = '[MedicalRecords]';
  const formattedArgs = args
    .map((arg) => formatLogArg(arg))
    .filter((arg) => arg.length > 0);

  switch (level) {
    case 'error':
      console.error(prefix, ...formattedArgs);
      break;
    case 'warn':
      console.warn(prefix, ...formattedArgs);
      break;
    default:
      console.log(prefix, ...formattedArgs);
  }
}

// =============================================================================
// UUID Validation
// =============================================================================

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// =============================================================================
// Status Constants
// =============================================================================

export const ACTIVE_MEDICATION_STATUSES = [
  'Pending',
  'In Progress',
  'Awaiting_Payment',
  'Processing',
] as const;

export const SEVERITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

// =============================================================================
// Query Select Fields (centralized to avoid duplication)
// =============================================================================

export const VISIT_SELECT_FIELDS = `
  id,
  visit_id,
  encounter_number,
  encounter_date,
  start_time,
  visit_type,
  chief_complaint,
  status,
  patient_id,
  attending_doctor_id,
  attending_doctor:staff!visits_attending_doctor_id_fkey(first_name, last_name),
  clinic_id,
  clinic:clinics!visits_clinic_id_fkey(clinic_name, clinic_code)
`;

export const CONSULTATION_SELECT_FIELDS = `
  consultation_id,
  encounter_id,
  visit_id,
  patient_id,
  consultation_date,
  complaints,
  history_of_present_illness,
  past_medical_history,
  family_history,
  social_history,
  review_of_systems,
  examination_findings,
  physical_examination,
  diagnosis,
  diagnosis_text,
  differential_diagnosis,
  treatment_plan,
  recommendations,
  follow_up_date,
  notes,
  subjective,
  objective,
  assessment,
  plan,
  clinical_notes,
  icd10_codes,
  doctor_id,
  created_at,
  updated_at,
  specialty_data
`;

export const VITALS_SELECT_FIELDS = `
  id,
  temperature,
  blood_pressure_systolic,
  blood_pressure_diastolic,
  pulse,
  respiratory_rate,
  oxygen_saturation,
  weight,
  height,
  bmi,
  blood_glucose,
  pain_level,
  notes,
  is_critical,
  date_recorded,
  nurse:staff!vitals_nurse_id_fkey(first_name, last_name)
`;

export const PRESCRIPTION_SELECT_FIELDS = `
  prescription_id,
  drug_id,
  drug_name,
  dosage,
  frequency,
  duration,
  quantity_prescribed,
  instructions,
  route,
  status,
  is_external,
  doctor_id,
  created_at,
  doctor:staff!fk_prescriptions_doctor(first_name, last_name)
`;

export const LAB_REQUEST_SELECT_FIELDS = `
  request_id,
  test_id,
  status,
  priority,
  result,
  result_notes,
  clinical_notes,
  is_critical,
  result_date,
  result_value,
  result_unit,
  result_status,
  reference_range,
  interpretation,
  methodology,
  result_file_url,
  sample_collected_at,
  processing_started_at,
  result_entered_at,
  ordered_by,
  processed_by,
  sample_collected_by,
  result_entered_by,
  created_at
`;

export const RADIOLOGY_REQUEST_SELECT_FIELDS = `
  request_id,
  imaging_id,
  imaging_type,
  body_part,
  clinical_indication,
  status,
  priority,
  findings,
  impression,
  report,
  report_uploaded_at,
  performed_at,
  result_file_url,
  created_at
`;

export const PROCEDURE_SELECT_FIELDS = `
  id,
  encounter_id,
  visit_id,
  procedure_number,
  procedure_name,
  procedure_code,
  status,
  priority,
  scheduled_date,
  actual_start_time,
  actual_end_time,
  indication,
  pre_procedure_diagnosis,
  post_procedure_diagnosis,
  findings,
  procedure_notes,
  technique_description,
  complications,
  post_op_instructions,
  created_at,
  primary_surgeon:staff!procedures_primary_surgeon_id_fkey(first_name, last_name)
`;

export const NURSING_NOTES_SELECT_FIELDS = `
  id,
  note_type,
  title,
  content,
  patient_condition,
  pain_level,
  interventions_performed,
  patient_response,
  follow_up_required,
  follow_up_notes,
  shift,
  is_critical,
  requires_doctor_review,
  doctor_reviewed_by,
  doctor_reviewed_at,
  created_at,
  recorded_by:staff!nursing_notes_recorded_by_fkey(first_name, last_name)
`;

export const DAILY_PROGRESS_NOTES_SELECT_FIELDS = `
  progress_id,
  note_date,
  subjective,
  objective,
  assessment,
  plan,
  nursing_summary,
  vital_signs_summary,
  oral_intake_ml,
  iv_intake_ml,
  urine_output_ml,
  other_output_ml,
  io_notes,
  patient_condition,
  alert_level,
  recorded_at,
  recorded_by:staff!daily_progress_notes_recorded_by_fkey(first_name, last_name)
`;

export const WARD_ROUND_NOTES_SELECT_FIELDS = `
  id,
  round_date,
  round_type,
  subjective_notes,
  objective_findings,
  assessment,
  plan,
  patient_condition,
  created_at,
  attending_physician:staff!ward_round_notes_attending_physician_id_fkey(first_name, last_name)
`;

export const TREATMENT_PLANS_SELECT_FIELDS = `
  id,
  title,
  description,
  instructions,
  status,
  created_at,
  creator:staff!treatment_plans_created_by_fkey(first_name, last_name),
  tasks:treatment_tasks(
    id,
    task_type,
    description,
    status,
    scheduled_at,
    completed_at,
    notes,
    result_value,
    completed_by:staff!treatment_tasks_completed_by_fkey(first_name, last_name)
  )
`;
