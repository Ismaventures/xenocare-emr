/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - MEDICAL RECORDS TYPES
 * Centralized type definitions for medical records module
 * =============================================================================
 */

import type { ClinicalNoteRecord } from '../../dtos/clinical-note-template.types';

// =============================================================================
// Core Status/Severity Types
// =============================================================================

export type ProblemStatus = 'Active' | 'Resolved' | 'Chronic' | 'Monitoring';
export type ProblemSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type AllergySeverity =
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Life-threatening';

// =============================================================================
// Patient Identifier Types
// =============================================================================

export interface ResolvedPatientIds {
  uuid: string; // patients.id (UUID primary key)
  externalId: string; // patients.patient_id (VARCHAR, e.g., "P-00001")
  emrNumber: string; // patients.emr_number (e.g., "NDC-0001")
}

// =============================================================================
// Database Row Types (raw data from Supabase)
// =============================================================================

export interface VisitRow {
  id: string;
  visit_id: string;
  encounter_number?: string;
  encounter_date?: string;
  start_time?: string;
  visit_type?: string;
  chief_complaint?: string;
  status?: string;
  patient_id?: string;
  attending_doctor_id?: string;
  attending_doctor?: StaffRow | StaffRow[];
  clinic_id?: string;
  clinic?: { clinic_name?: string; clinic_code?: string } | null;
}

export interface StaffRow {
  id?: string;
  first_name: string;
  last_name: string;
}

export interface ConsultationRow {
  consultation_id: string;
  encounter_id?: string;
  visit_id?: string;
  patient_id?: string;
  consultation_date?: string;
  complaints?: string;
  history_of_present_illness?: string;
  past_medical_history?: string;
  family_history?: string;
  social_history?: string;
  review_of_systems?: string;
  examination_findings?: string;
  physical_examination?: string;
  diagnosis?: string | string[];
  diagnosis_text?: string;
  differential_diagnosis?: string[];
  treatment_plan?: string;
  recommendations?: string;
  follow_up_date?: string;
  notes?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clinical_notes?: string;
  icd10_codes?: Array<{ code: string; description: string; type?: string }>;
  doctor_id?: string;
  created_at?: string;
  updated_at?: string;
  specialty_data?: Record<string, unknown> | null;
}

export interface VitalsRow {
  id: string;
  patient_id?: string;
  encounter_id?: string;
  visit_id?: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  blood_glucose?: number;
  pain_level?: number;
  notes?: string;
  is_critical?: boolean;
  date_recorded: string;
  nurse_id?: string;
  nurse?: StaffRow | StaffRow[];
}

export interface PrescriptionRow {
  prescription_id: string;
  patient_id?: string;
  encounter_id?: string;
  visit_id?: string;
  drug_id?: string;
  drug_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity_prescribed?: number;
  instructions?: string;
  route?: string;
  status?: string;
  doctor_id?: string;
  created_at?: string;
  drug?: { id: string; name: string };
  doctor?:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
}

export interface LabRequestRow {
  request_id: string;
  patient_id?: string;
  encounter_id?: string;
  visit_id?: string;
  test_id?: string;
  status?: string;
  priority?: string;
  result?: string | object;
  result_notes?: string;
  clinical_notes?: string;
  is_critical?: boolean;
  result_date?: string;
  result_value?: number;
  result_unit?: string;
  result_status?: string;
  reference_range?: string;
  interpretation?: string;
  methodology?: string;
  result_file_url?: string;
  sample_collected_at?: string;
  processing_started_at?: string;
  result_entered_at?: string;
  ordered_by?: string;
  processed_by?: string;
  sample_collected_by?: string;
  result_entered_by?: string;
  created_at?: string;
  test?: LabTestCatalogueRow;
  lab_results?: LabResultRow[];
}

export interface LabTestCatalogueRow {
  id: string;
  name: string;
  category?: string;
  category_code?: string;
  result_template_type?: string;
}

export interface LabResultRow {
  id: string;
  request_id?: string;
  test_id?: string;
  patient_id?: string;
  result_value?: string;
  unit?: string;
  reference_range?: string;
  is_abnormal?: boolean;
  is_critical?: boolean;
  comments?: string;
  verified_by?: string;
  verified_at?: string;
  technician_id?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
  last_modified_by?: string;
  structured_result?: Record<string, unknown>;
  result_template_type?: string;
  collected_at?: string;
  reported_at?: string;
  approved_by?: string;
  approved_at?: string;
  workflow_status?: string;
  critical_notified_at?: string;
  interpretation?: string;
  methodology?: string;
  sample_type?: string;
  sample_collected_at?: string;
  sample_collected_by?: string;
}

export interface RadiologyRequestRow {
  request_id: string;
  patient_id?: string;
  encounter_id?: string;
  visit_id?: string;
  imaging_id?: string;
  imaging_type?: string;
  body_part?: string;
  clinical_indication?: string;
  status?: string;
  priority?: string;
  findings?: string;
  impression?: string;
  report?: string;
  report_uploaded_at?: string;
  performed_at?: string;
  result_file_url?: string;
  created_at?: string;
  imaging?: ImagingCatalogueRow;
  scan_result?: {
    findings?: string;
    impression?: string;
    technique?: string;
    comparison?: string;
    report_date?: string;
    image_urls?: string[];
    radiologist?: { first_name: string; last_name: string };
  };
}

export interface ProcedureRow {
  id: string;
  encounter_id?: string;
  visit_id?: string;
  procedure_number?: string;
  procedure_name?: string;
  procedure_code?: string;
  status?: string;
  priority?: string;
  scheduled_date?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  indication?: string;
  pre_procedure_diagnosis?: string;
  post_procedure_diagnosis?: string;
  findings?: string;
  procedure_notes?: string;
  technique_description?: string;
  complications?: string;
  post_op_instructions?: string;
  created_at?: string;
  primary_surgeon?: StaffRow | StaffRow[];
}

export interface ImagingCatalogueRow {
  id: string;
  name: string;
  code?: string;
  modality?: string;
}

export interface NursingNoteRow {
  id: string;
  encounter_id?: string;
  note_type?: string;
  title?: string;
  content: string;
  patient_condition?: string;
  pain_level?: number;
  interventions_performed?: string;
  patient_response?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;
  shift?: string;
  is_critical?: boolean;
  requires_doctor_review?: boolean;
  doctor_reviewed_by?: string;
  doctor_reviewed_at?: string;
  created_at: string;
  recorded_by?: StaffRow | StaffRow[];
}

export interface WardRoundNoteRow {
  id: string;
  round_date: string;
  round_type: string;
  subjective_notes?: string;
  objective_findings?: string;
  assessment?: string;
  plan?: string;
  patient_condition?: string;
  created_at: string;
  attending_physician?: StaffRow | StaffRow[];
}

export interface DailyProgressNoteRow {
  progress_id: string;
  encounter_id?: string;
  note_date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  nursing_summary?: string;
  vital_signs_summary?: string;
  oral_intake_ml?: number;
  iv_intake_ml?: number;
  urine_output_ml?: number;
  other_output_ml?: number;
  io_notes?: string;
  patient_condition?: string;
  alert_level?: string;
  recorded_at: string;
  recorded_by?: StaffRow | StaffRow[];
}

export interface TreatmentPlanRow {
  id: string;
  encounter_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  status?: string;
  created_at: string;
  created_by?: string;
  creator?: StaffRow | StaffRow[];
  tasks?: TreatmentTaskRow[];
}

export interface TreatmentTaskRow {
  id: string;
  plan_id?: string;
  task_type?: string;
  description?: string;
  status?: string;
  scheduled_at?: string;
  completed_at?: string;
  completed_by?: string | StaffRow | StaffRow[];
  notes?: string;
  result_value?: string;
}

export interface PatientRow {
  id: string;
  patient_id: string;
  emr_number?: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  gender?: string;
  date_of_birth?: string;
  contact_phone?: string;
  email?: string;
  blood_group?: string;
  genotype?: string;
  patient_category?: string;
  insurance_type?: string;
  nhis_number?: string;
  nhis_provider_name?: string;
  photo_url?: string;
  known_allergies?: string[];
  patient_type?: string;
  service_number?: string;
  rank?: string;
  title?: string;
  unit?: string;
  military_branch?: string;
  occupation?: string;
  employer?: string;
  national_id?: string;
  residential_address?: string;
  principal_id?: string;
  relationship_to_principal?: string;
  registration_date?: string;
  status?: string;
}

// =============================================================================
// DTO Types (returned from API functions)
// =============================================================================

export interface AllergyInfo {
  allergen: string;
  reaction?: string;
  severity: AllergySeverity;
}

export interface MedicationSummary {
  prescription_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  status: string;
  prescribed_date: string;
  prescribed_by?: string;
}

export interface PatientProblem {
  id: string;
  name: string;
  icd_code?: string;
  status: ProblemStatus;
  severity: ProblemSeverity;
  onset_date: string;
  last_reviewed: string;
  related_encounter_count: number;
  notes?: string;
}

export interface VitalSnapshot {
  blood_pressure?: { systolic: number; diastolic: number };
  pulse_rate?: number;
  heart_rate?: number; // Alias for pulse_rate used by some components
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  blood_glucose?: number;
  pain_level?: number;
  notes?: string;
  nurse_name?: string;
  recorded_by_name?: string; // Alternative name for nurse_name
  is_critical?: boolean;
  recorded_at: string;
}

export interface EncounterSummary {
  encounter_id: string;
  encounter_number: string;
  visit_id: string;
  patient_id: string;
  emr_number: string;
  encounter_date: string;
  visit_type: string;
  chief_complaint: string;
  diagnoses: string[];
  doctor: { name: string; specialty?: string } | null;
  status: string;
  has_labs: boolean;
  has_imaging: boolean;
  has_prescriptions: boolean;
  lab_count: number;
  imaging_count: number;
  prescription_count: number;
  clinic_id?: string;
  clinic_name?: string;
}

export interface EncounterDetail {
  encounter_id: string;
  encounter_number: string;
  visit_id: string;
  patient_id: string;
  patient_name?: string;
  emr_number: string;
  encounter_date: string;
  visit_type: string;
  chief_complaint: string;
  status: string;
  diagnoses?: string[];
  doctor: { name: string; specialty?: string } | null;
  clinic_id?: string;
  clinic_name?: string;
  specialty_code?: string;
  consultation?: ConsultationDetail;
  clinical_notes: ClinicalNotes;
  vitals?: VitalSnapshot;
  all_vitals?: VitalSnapshot[];
  prescriptions?: PrescriptionDetail[];
  medications: MedicationDetail[];
  lab_requests?: LabRequestDetail[];
  lab_results: LabResultDetail[];
  radiology_requests?: RadiologyRequestSimple[];
  imaging_results: ImagingResultDetail[];
  procedure_results?: ProcedureDetail[];
  referrals?: ReferralDetail[];
  nursing_notes?: NursingNoteDetail[];
  daily_progress_notes?: DailyProgressNoteDetail[];
  ward_round_notes?: WardRoundNoteRow[];
  treatment_plans?: TreatmentPlanDetail[];
  clinical_note_records?: ClinicalNoteRecord[];
}

export interface ConsultationDetail {
  chief_complaint?: string;
  history_of_present_illness?: string;
  examination_findings?: string;
  diagnosis?: string | string[];
  differential_diagnosis?: string[];
  treatment_plan?: string;
  past_medical_history?: string;
  family_history?: string;
  social_history?: string;
  review_of_systems?: string;
  physical_examination?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
  recommendations?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clinical_notes?: string;
  consultation_date?: string;
  created_at?: string;
  updated_at?: string;
  doctor_name?: string;
  icd10_codes?: Array<{ code: string; description: string; type?: string }>;
  specialty_data?: Record<string, unknown> | null;
}

export interface ClinicalNotes {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  complaints: string;
  diagnosis: string;
  treatment_plan?: string;
  follow_up_notes?: string;
  follow_up_date?: string;
}

export interface PrescriptionDetail {
  id: string;
  prescription_id?: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  route?: string;
  prescribed_by?: string;
  prescribed_by_name?: string;
  created_at?: string;
  dispensed: boolean;
  is_changed?: boolean;
}

export interface MedicationDetail {
  prescription_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  status: string;
}

export interface LabRequestDetail {
  id: string;
  test_name: string;
  category?: string;
  category_code?: string;
  status: string;
  requested_at: string;
  clinical_indication?: string;
  results?: Array<{
    parameter: string;
    value: string | number;
    unit: string;
    ref_low: number | null;
    ref_high: number | null;
    reference_range?: string;
    is_abnormal?: boolean;
    is_critical?: boolean;
  }>;
  structured_result?: Record<string, unknown> | null;
  result_template_type?: string | null;
}

export interface LabResultDetail {
  request_id: string;
  test_name: string;
  category: string;
  category_code?: string;
  status: string;
  priority?: string;
  result?: string;
  result_notes?: string;
  clinical_notes?: string;
  normal_range?: string;
  is_abnormal?: boolean;
  is_critical?: boolean;
  requested_date: string;
  requested_at?: string;
  result_date?: string;
  result_value?: number;
  result_unit?: string;
  result_status?: string;
  reference_range?: string;
  interpretation?: string;
  methodology?: string;
  result_file_url?: string;
  sample_collected_at?: string;
  processing_started_at?: string;
  result_entered_at?: string;
  ordered_by?: string;
  processed_by_name?: string;
  result_entered_by_name?: string;
  sample_collected_by_name?: string;
  structured_result?: Record<string, unknown> | null;
  result_template_type?: string | null;
  lab_results_items?: Array<{
    result_value: string;
    unit: string;
    reference_range: string;
    is_abnormal: boolean;
    is_critical: boolean;
    comments?: string;
    verified_by_name?: string;
    verified_at?: string;
    structured_result?: Record<string, unknown> | null;
    result_template_type?: string | null;
  }>;
}

export interface RadiologyRequestSimple {
  id: string;
  study_type: string;
  body_part: string;
  status: string;
  clinical_indication?: string;
  requested_at: string;
  report?: {
    findings: string;
    impression?: string;
    reported_by?: string;
    reported_at?: string;
  };
}

export interface ImagingResultDetail {
  request_id: string;
  exam_name: string;
  study_type?: string;
  body_part?: string;
  modality: string;
  status: string;
  findings?: string;
  impression?: string;
  result_file_url?: string;
  requested_date: string;
  report_date?: string;
  technique?: string;
  comparison?: string;
  image_urls?: string[];
  radiologist_name?: string;
}

export interface ProcedureDetail {
  id: string;
  procedure_number?: string;
  procedure_name: string;
  procedure_code?: string;
  status: string;
  priority?: string;
  requested_date: string;
  started_at?: string;
  completed_at?: string;
  indication?: string;
  pre_procedure_diagnosis?: string;
  post_procedure_diagnosis?: string;
  findings?: string;
  procedure_notes?: string;
  technique_description?: string;
  complications?: string;
  post_op_instructions?: string;
  surgeon_name?: string;
}

export interface ReferralDetail {
  specialty?: string;
  department?: string;
  reason?: string;
}

export interface NursingNoteDetail {
  id: string;
  note_type: string;
  title?: string;
  content: string;
  patient_condition?: string;
  pain_level?: number;
  interventions_performed?: string;
  patient_response?: string;
  follow_up_required: boolean;
  follow_up_notes?: string;
  shift?: string;
  is_critical: boolean;
  requires_doctor_review: boolean;
  doctor_reviewed_by?: string;
  doctor_reviewed_at?: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface DailyProgressNoteDetail {
  progress_id: string;
  note_date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  nursing_summary?: string;
  vital_signs_summary?: string;
  oral_intake_ml?: number;
  iv_intake_ml?: number;
  urine_output_ml?: number;
  other_output_ml?: number;
  io_notes?: string;
  patient_condition?: string;
  alert_level?: string;
  recorded_by_name?: string;
  recorded_at: string;
}

export interface TreatmentPlanDetail {
  plan_id: string;
  title: string;
  description?: string;
  instructions?: string;
  status: string;
  created_at: string;
  created_by_name?: string;
  tasks?: TreatmentTaskDetail[];
}

export interface TreatmentTaskDetail {
  task_id: string;
  task_type: string;
  description?: string;
  status: string;
  scheduled_at?: string;
  due_date?: string; // Alias for scheduled_at used by some components
  completed_at?: string;
  completed_by_name?: string;
  notes?: string;
  result_value?: string;
}

// =============================================================================
// Patient Header & Record View Types
// =============================================================================

export interface PatientHeaderData {
  patient_id: string;
  emr_number: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  gender: string;
  date_of_birth: string;
  age: string | number;
  contact_phone?: string;
  email?: string;
  blood_group?: string;
  genotype?: string;
  patient_category?: string;
  insurance_type?: string;
  nhis_number?: string;
  nhis_provider_name?: string;
  photo_url?: string;
  allergies: AllergyInfo[];
  critical_alerts: string[];
  patient_type?: string;
  service_number?: string;
  rank?: string;
  title?: string;
  unit?: string;
  military_branch?: string;
  occupation?: string;
  employer?: string;
  national_id?: string;
  residential_address?: string;
  principal_name?: string;
  relationship_to_principal?: string;
  registration_date?: string;
  status?: string;
}

export interface VitalsTrend {
  date: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
}

export interface RecordStats {
  total_encounters: number;
  total_problems: number;
  active_problems: number;
  total_lab_tests: number;
  total_imaging: number;
  total_prescriptions: number;
  last_visit_date?: string;
  last_visit_type?: string;
}

export interface PatientMedicalRecordView {
  patient: PatientHeaderData;
  header: PatientHeaderData & {
    total_encounters?: number;
    last_visit?: string;
  };
  problems: PatientProblem[];
  recent_encounters: EncounterSummary[];
  current_medications: MedicationSummary[];
  latest_vitals?: VitalSnapshot;
  stats: RecordStats;
}

export interface MedicalRecordsFilters {
  timeframe?: '3m' | '6m' | '1y' | 'all';
  problem_id?: string;
  encounter_type?: string;
  has_labs?: boolean;
  has_imaging?: boolean;
}

export interface PaginatedEncounters {
  encounters: EncounterSummary[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// =============================================================================
// Encounter Counts (for batch fetching optimization)
// =============================================================================

export interface EncounterCounts {
  encounter_id: string;
  lab_count: number;
  imaging_count: number;
  prescription_count: number;
}
