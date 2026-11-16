/**
 * Clinical Export System - Record Types
 * NDC MEDICAL CENTRE EMR
 *
 * Comprehensive type definitions for clinical records following
 * international healthcare data standards (HL7 FHIR, ICD-10, LOINC, SNOMED-CT, CPT, ATC)
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

// ==================== PATIENT CORE ====================

/**
 * HL7 Administrative Gender codes
 */
export type AdministrativeGender = 'Male' | 'Female' | 'Other' | 'Unknown';

/**
 * Patient Core Record - Demographics and identification
 * Follows HL7 FHIR Patient resource structure
 */
export interface PatientCoreRecord {
  id: string;
  mrn: string; // Medical Record Number
  emr_number: string;
  first_name: string;
  middle_name?: string;
  surname: string;
  date_of_birth: string; // ISO 8601 date
  age: number;
  gender: AdministrativeGender;
  blood_group?: string;
  genotype?: string;
  marital_status?: string;
  occupation?: string;
  nationality?: string;
  state_of_origin?: string;
  lga?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  city?: string;
  state?: string;
  emergency_contact?: EmergencyContact;
  patient_category: string;
  patient_type?: string;
  insurance_type?: string;
  nhis_number?: string;
  hmo_id?: string;
  service_number?: string;
  hmo_name?: string;
  company_name?: string;
  staff_id?: string;
  registration_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  address?: string;
}

// ==================== ENCOUNTER ====================

/**
 * Encounter types following HL7 FHIR Encounter class
 */
export type EncounterType =
  | 'OPD'
  | 'Inpatient'
  | 'Emergency'
  | 'Day Case'
  | 'Home Visit';

/**
 * Encounter status following HL7 FHIR
 */
export type EncounterStatus =
  | 'planned'
  | 'in-progress'
  | 'on-hold'
  | 'discharged'
  | 'completed'
  | 'cancelled'
  | 'entered-in-error';

/**
 * Clinical priority levels
 */
export type ClinicalPriority = 'Normal' | 'Urgent' | 'Emergency' | 'STAT';

/**
 * Encounter Record - Clinical visit/admission
 * Follows HL7 FHIR Encounter resource structure
 */
export interface EncounterRecord {
  id: string;
  visit_id?: string; // VARCHAR visit ID for legacy linking
  encounter_number: string;
  patient_id: string;
  encounter_type: EncounterType;
  visit_type: string;
  status: string;
  workflow_status?: string;
  priority: ClinicalPriority;
  facility_id?: string;
  facility_name?: string;
  department_id: string;
  department_name: string;
  clinic_id?: string;
  clinic_name?: string;
  attending_doctor_id?: string;
  attending_doctor_name?: string;
  primary_nurse_id?: string;
  primary_nurse_name?: string;
  chief_complaint?: string;
  history_present_illness?: string; // HPI narrative
  encounter_date: string;
  check_in_time?: string;
  check_out_time?: string;
  triage_time?: string;
  consultation_start_time?: string;
  consultation_end_time?: string;
  created_at: string;
  updated_at: string;
}

// ==================== DIAGNOSIS (ICD-10) ====================

/**
 * Diagnosis type categories
 */
export type DiagnosisType =
  | 'primary'
  | 'secondary'
  | 'admission'
  | 'discharge'
  | 'differential'
  | 'working';

/**
 * Diagnosis certainty levels
 */
export type DiagnosisCertainty =
  | 'Confirmed'
  | 'Provisional'
  | 'Differential'
  | 'Ruled Out';

/**
 * Diagnosis Record - Clinical diagnosis with ICD-10 coding
 * ICD-10 code is MANDATORY for all diagnoses
 */
export interface DiagnosisRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  diagnosis_type: DiagnosisType;
  diagnosis_text: string;
  icd10_code: string; // MANDATORY - ICD-10-CM code
  icd10_description?: string;
  icd10_chapter?: string;
  icd10_block?: string;
  snomed_code?: string; // Optional SNOMED-CT code
  certainty?: DiagnosisCertainty;
  onset_date?: string;
  resolution_date?: string;
  is_chronic?: boolean;
  notes?: string;
  diagnosed_by_id?: string;
  diagnosed_by_name?: string;
  diagnosed_at: string;
  created_at?: string;
  updated_at?: string;
}

// ==================== VITALS (LOINC CODED) ====================

/**
 * LOINC codes for vital signs
 * Reference: LOINC vital signs panel (85353-1)
 */
export const LOINC_VITAL_SIGNS = {
  BODY_TEMPERATURE: '8310-5',
  BODY_TEMPERATURE_ORAL: '8331-1',
  BODY_TEMPERATURE_TYMPANIC: '8333-7',
  BODY_TEMPERATURE_AXILLARY: '8328-7',
  BP_SYSTOLIC: '8480-6',
  BP_DIASTOLIC: '8462-4',
  BP_MEAN_ARTERIAL: '8478-0',
  HEART_RATE: '8867-4',
  RESPIRATORY_RATE: '9279-1',
  OXYGEN_SATURATION: '2708-6',
  BODY_WEIGHT: '29463-7',
  BODY_HEIGHT: '8302-2',
  BMI: '39156-5',
  HEAD_CIRCUMFERENCE: '9843-4',
  WAIST_CIRCUMFERENCE: '56086-2',
  PAIN_SCORE: '72514-3',
  BLOOD_GLUCOSE: '2339-0',
  BLOOD_GLUCOSE_FASTING: '1558-6',
  BLOOD_GLUCOSE_RANDOM: '2345-7',
} as const;

/**
 * Temperature units
 */
export type TemperatureUnit = 'C' | 'F';

/**
 * Weight units
 */
export type WeightUnit = 'kg' | 'lb';

/**
 * Height units
 */
export type HeightUnit = 'cm' | 'in' | 'm' | 'ft';

/**
 * Vitals Record - Patient vital signs with LOINC coding
 * Each measurement has associated LOINC code for standardization
 */
export interface VitalsRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;

  // Temperature (LOINC 8310-5)
  temperature?: number;
  temperature_unit: TemperatureUnit;
  temperature_site?: 'Oral' | 'Axillary' | 'Tympanic' | 'Rectal';
  temperature_loinc?: string;

  // Blood Pressure (LOINC 8480-6, 8462-4)
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  blood_pressure_position?: 'Sitting' | 'Standing' | 'Lying' | 'Supine';
  bp_systolic_loinc?: string;
  bp_diastolic_loinc?: string;

  // Pulse (LOINC 8867-4)
  pulse_rate?: number;
  pulse_rhythm?: 'Regular' | 'Irregular';
  pulse_volume?: 'Normal' | 'Weak' | 'Bounding';
  pulse_loinc?: string;

  // Respiration (LOINC 9279-1)
  respiratory_rate?: number;
  respiratory_pattern?: 'Normal' | 'Labored' | 'Shallow' | 'Deep';
  respiratory_loinc?: string;

  // Oxygen Saturation (LOINC 2708-6)
  oxygen_saturation?: number;
  oxygen_saturation_method?: 'Room Air' | 'Supplemental O2';
  oxygen_flow_rate?: number;
  oxygen_loinc?: string;

  // Weight (LOINC 29463-7)
  weight?: number;
  weight_unit: WeightUnit;
  weight_loinc?: string;

  // Height (LOINC 8302-2)
  height?: number;
  height_unit: HeightUnit;
  height_loinc?: string;

  // BMI (LOINC 39156-5) - calculated
  bmi?: number;
  bmi_loinc?: string;

  // Blood Glucose (LOINC 2339-0)
  blood_glucose?: number;
  blood_glucose_unit?: 'mg/dL' | 'mmol/L';
  blood_glucose_type?: 'Fasting' | 'Random' | 'Post-prandial';
  blood_glucose_loinc?: string;

  // Pain Score (LOINC 72514-3) - 0-10 scale
  pain_score?: number;
  pain_location?: string;
  pain_character?: string;
  pain_loinc?: string;

  // Additional measurements
  head_circumference?: number;
  waist_circumference?: number;

  // Level of consciousness
  avpu_score?: 'Alert' | 'Voice' | 'Pain' | 'Unresponsive';
  gcs_score?: number;
  gcs_eye?: number;
  gcs_verbal?: number;
  gcs_motor?: number;

  // Recording info
  recorded_by_id: string;
  recorded_by_name: string;
  recorded_at: string;
  notes?: string;
}

// ==================== NURSING RECORDS ====================

/**
 * Nursing note types
 */
export type NursingNoteType =
  | 'Progress_Note'
  | 'Observation'
  | 'Assessment'
  | 'Handoff'
  | 'Incident'
  | 'Admission'
  | 'Discharge'
  | 'Transfer';

/**
 * Patient condition status
 */
export type PatientCondition =
  | 'Stable'
  | 'Improving'
  | 'Deteriorating'
  | 'Critical'
  | 'Guarded';

/**
 * Nursing Record - Nursing notes and observations
 */
export interface NursingRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  admission_id?: string;
  note_type: NursingNoteType;
  notes: string;
  patient_condition: PatientCondition;
  interventions?: string[];
  observations?: string;
  concerns?: string;
  care_provided?: string;
  patient_response?: string;
  assessment?: string; // Nursing assessment
  nursing_diagnosis?: string; // Nursing diagnosis
  pain_level?: number; // Pain score 0-10
  response_to_treatment?: string; // Patient response to treatment
  nurse_id: string;
  nurse_name: string;
  shift?: 'Morning' | 'Afternoon' | 'Night';
  created_at: string;
  updated_at?: string;
}

/**
 * Treatment task status
 */
export type TreatmentTaskStatus =
  | 'Pending'
  | 'In_Progress'
  | 'Completed'
  | 'Skipped'
  | 'Cancelled';

/**
 * Treatment Task Record
 */
export interface TreatmentTaskRecord {
  id: string;
  treatment_plan_id: string;
  task_name: string;
  description?: string;
  scheduled_time?: string;
  completed_time?: string;
  status: TreatmentTaskStatus;
  completed_by_id?: string;
  completed_by_name?: string;
  notes?: string;
}

/**
 * Treatment Plan Record - Care plans and tasks
 */
export interface TreatmentPlanRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  admission_id?: string;
  title: string;
  instructions: string;
  priority?: ClinicalPriority;
  start_date?: string;
  end_date?: string;
  status: 'Created' | 'In_Progress' | 'Completed' | 'Cancelled';
  tasks: TreatmentTaskRecord[];
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at?: string;
}

// ==================== CLINICAL NOTES ====================

/**
 * Allergy severity levels
 */
export type AllergySeverity =
  | 'Mild'
  | 'Moderate'
  | 'Severe'
  | 'Life-threatening';

/**
 * Allergy Record
 */
export interface AllergyRecord {
  id: string;
  patient_id: string;
  allergen: string;
  allergen_type: 'Drug' | 'Food' | 'Environmental' | 'Other';
  reaction?: string;
  severity?: AllergySeverity;
  onset_date?: string;
  snomed_code?: string;
  is_active: boolean;
  recorded_by?: string;
  recorded_at: string;
}

/**
 * Clinical Note Record - Doctor's consultation notes
 * Follows SOAP format
 */
export interface ClinicalNoteRecord {
  id: string;
  encounter_id: string;
  patient_id: string;

  // Chief Complaint
  chief_complaint: string;
  duration_of_illness?: string;

  // History (Subjective)
  history_of_present_illness?: string;
  past_medical_history?: string;
  past_surgical_history?: string;
  family_history?: string;
  social_history?: string;
  drug_history?: string;
  allergy_history?: string;
  allergies?: AllergyRecord[];
  menstrual_history?: string;
  obstetric_history?: string;
  review_of_systems?: string;

  // Physical Examination (Objective)
  general_examination?: string;
  physical_examination?: string;
  systemic_examination?: {
    cardiovascular?: string;
    respiratory?: string;
    gastrointestinal?: string;
    neurological?: string;
    musculoskeletal?: string;
    skin?: string;
    ent?: string;
    eye?: string;
    genitourinary?: string;
  };

  // Assessment
  assessment?: string;
  provisional_diagnosis?: string;
  differential_diagnosis?: string[];

  // Plan
  plan?: string;
  investigations_ordered?: string[];
  treatment_plan?: string;
  follow_up_instructions?: string;
  follow_up_date?: string;
  referrals?: string[];

  // Recording info
  doctor_id: string;
  doctor_name: string;
  doctor_specialty?: string;
  created_at: string;
  updated_at?: string;
  signed_at?: string;
  is_signed: boolean;
}

// ==================== PRESCRIPTIONS (ATC/RxNorm) ====================

/**
 * Medication route of administration
 */
export type MedicationRoute =
  | 'Oral'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'Topical'
  | 'Inhalation'
  | 'Rectal'
  | 'Sublingual'
  | 'Transdermal'
  | 'Ophthalmic'
  | 'Otic'
  | 'Nasal'
  | 'Vaginal';

/**
 * Prescription status
 */
export type PrescriptionStatus =
  | 'Pending'
  | 'Verified'
  | 'Dispensed'
  | 'Partially_Dispensed'
  | 'Cancelled'
  | 'Returned';

/**
 * ATC Classification Levels
 * Level 1: Anatomical main group (1 letter)
 * Level 2: Therapeutic subgroup (2 digits)
 * Level 3: Pharmacological subgroup (1 letter)
 * Level 4: Chemical subgroup (1 letter)
 * Level 5: Chemical substance (2 digits)
 */
export interface ATCClassification {
  code: string; // Full ATC code (e.g., A10BA02)
  level1?: string; // Anatomical main group
  level2?: string; // Therapeutic subgroup
  level3?: string; // Pharmacological subgroup
  level4?: string; // Chemical subgroup
  level5?: string; // Chemical substance
  description?: string;
}

/**
 * Prescription Record - Medication orders with ATC/RxNorm coding
 */
export interface PrescriptionRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  prescription_number?: string;

  // Drug identification
  drug_id?: string;
  drug_name: string;
  generic_name?: string;
  brand_name?: string;
  formulation?: string; // Tablet, Capsule, Syrup, etc.
  strength?: string; // 500mg, 250mg/5ml, etc.

  // Standard coding
  atc_code?: string; // ATC Classification
  atc_classification?: ATCClassification;
  rxnorm_code?: string; // RxNorm (optional)
  snomed_code?: string; // SNOMED-CT (optional)
  nhis_code?: string; // NHIS drug code

  // Dosage instructions
  dosage: string; // Display dosage
  dosage_value?: number;
  dosage_unit?: string; // UCUM units
  route: MedicationRoute;
  frequency: string; // OD, BD, TDS, QDS, etc.
  frequency_per_day?: number;
  duration: string;
  duration_value?: number;
  duration_unit?: 'days' | 'weeks' | 'months';

  // Quantities
  quantity_prescribed: number;
  quantity_dispensed?: number;
  quantity_returned?: number;

  // Additional info
  instructions?: string;
  special_instructions?: string;
  food_relation?: 'Before meals' | 'After meals' | 'With meals' | 'Any time';
  prn?: boolean; // As needed
  prn_reason?: string;
  is_controlled?: boolean;

  // Status tracking
  status: PrescriptionStatus;

  // Prescriber info
  prescribed_by_id: string;
  prescribed_by_name: string;
  prescribed_at: string;

  // Verification
  verified_by_id?: string;
  verified_by_name?: string;
  verified_at?: string;

  // Dispensing
  dispensed_by_id?: string;
  dispensed_by_name?: string;
  dispensed_at?: string;
  dispensing_notes?: string;

  // NHIS/Insurance
  is_nhis_covered?: boolean;
  nhis_price?: number;
  retail_price?: number;
  created_at?: string;
  updated_at?: string;
}

// ==================== LABORATORY (LOINC) ====================

/**
 * Lab test priority
 */
export type LabPriority = 'Routine' | 'Urgent' | 'STAT';

/**
 * Lab request status
 */
export type LabRequestStatus =
  | 'Pending'
  | 'Collected'
  | 'Processing'
  | 'Completed'
  | 'Cancelled';

/**
 * Abnormal flag codes (HL7)
 */
export type AbnormalFlag = 'H' | 'L' | 'N' | 'C' | 'HH' | 'LL' | 'A';
// H=High, L=Low, N=Normal, C=Critical, HH=Critical High, LL=Critical Low, A=Abnormal

/**
 * Lab Request Record - Laboratory test orders
 */
export interface LabRequestRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  request_number?: string;

  // Test details
  test_id?: string;
  test_name: string;
  test_code?: string;
  loinc_code?: string; // LOINC code
  test_category: string;
  test_subcategory?: string;

  // Clinical context
  priority: LabPriority;
  clinical_indication?: string;
  clinical_history?: string;
  clinical_notes?: string; // Additional clinical notes
  fasting_required?: boolean;

  // Sample info
  sample_type?: string; // Blood, Urine, etc.
  sample_collection_date?: string;
  sample_collection_time?: string;
  sample_collected_by_id?: string;
  sample_collected_by_name?: string;
  collected_at?: string; // When sample was collected
  processed_at?: string; // When sample was processed

  // Ordering info
  ordered_by_id: string;
  ordered_by_name: string;
  ordered_at: string;

  // Status
  status: LabRequestStatus;

  // Results
  results?: LabResultRecord[];
  completed_at?: string;

  // Billing
  is_nhis_covered?: boolean;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Lab Result Record - Laboratory test results
 */
export interface LabResultRecord {
  id: string;
  lab_request_id: string;

  // Test identification
  test_name: string;
  test_code?: string;
  loinc_code?: string; // LOINC code

  // Result values
  result_value: string; // Display value
  result_numeric?: number; // Numeric value if applicable
  result_text?: string; // Text result if applicable
  unit?: string; // UCUM units

  // Reference ranges
  reference_range_low?: number;
  reference_range_high?: number;
  reference_range_text?: string;
  age_specific_range?: boolean;
  gender_specific_range?: boolean;

  // Interpretation
  abnormal_flag?: AbnormalFlag;
  interpretation?: string;
  comments?: string;

  // Processing info
  method?: string;
  instrument?: string;
  performed_by_id?: string;
  performed_by_name?: string;
  performed_at?: string;

  // Verification
  verified_by_id?: string;
  verified_by_name?: string;
  verified_at?: string;

  completed_at: string;
}

// ==================== RADIOLOGY (LOINC/DICOM) ====================

/**
 * Imaging modality types
 */
export type ImagingModality =
  | 'X-Ray'
  | 'CT'
  | 'MRI'
  | 'Ultrasound'
  | 'Mammogram'
  | 'Fluoroscopy'
  | 'PET'
  | 'Nuclear Medicine'
  | 'Angiography'
  | 'Echocardiography';

/**
 * Radiology request status
 */
export type RadiologyRequestStatus =
  | 'Pending'
  | 'Scheduled'
  | 'In_Progress'
  | 'Completed'
  | 'Reported'
  | 'Cancelled';

/**
 * Laterality
 */
export type Laterality = 'Left' | 'Right' | 'Bilateral' | 'N/A';

/**
 * Radiology Request Record - Imaging orders
 */
export interface RadiologyRequestRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  request_number?: string;

  // Imaging details
  imaging_type: ImagingModality;
  examination_name: string;
  examination_code?: string;
  loinc_code?: string; // LOINC code
  body_part: string;
  body_region?: string;
  laterality?: Laterality;

  // Clinical context
  clinical_indication: string;
  clinical_history?: string;
  relevant_findings?: string;
  contrast_required?: boolean;
  contrast_type?: string;

  // Priority and scheduling
  priority: ClinicalPriority;
  scheduled_date?: string;
  scheduled_time?: string;
  performed_at?: string; // When the imaging was performed

  // Ordering info
  ordered_by_id: string;
  ordered_by_name: string;
  ordered_at: string;

  // Status
  status: RadiologyRequestStatus;

  // Billing
  is_nhis_covered?: boolean;
  price?: number;
}

/**
 * Radiology Report Record - Imaging reports
 */
export interface RadiologyReportRecord {
  id: string;
  radiology_request_id: string;

  // Examination details
  examination_date?: string;
  examination_time?: string;

  // Report content
  technique?: string;
  comparison?: string;
  findings: string;
  impression: string;
  recommendation?: string;
  critical_finding?: boolean;
  critical_finding_communicated?: boolean;
  critical_finding_communicated_to?: string;
  critical_finding_communicated_at?: string;

  // DICOM reference
  dicom_study_uid?: string; // DICOM Study Instance UID
  dicom_series_count?: number;
  dicom_image_count?: number;
  pacs_accession_number?: string;

  // Reporting info
  radiologist_id: string;
  radiologist_name: string;
  reported_at: string;
  reported_by_name?: string; // Display name of reporter

  // Technical details
  contrast_used?: string; // Contrast agent used
  radiation_dose?: string; // Radiation dose if applicable

  // Verification
  verified_by_id?: string;
  verified_by_name?: string;
  verified_at?: string;

  // Addendum
  addendum?: string;
  addendum_by?: string;
  addendum_at?: string;
}

// ==================== PROCEDURES (ICD-10-PCS/CPT) ====================

/**
 * Procedure type categories
 */
export type ProcedureType =
  | 'Diagnostic'
  | 'Therapeutic'
  | 'Surgical'
  | 'Preventive'
  | 'Palliative';

/**
 * Procedure urgency levels
 */
export type ProcedureUrgency = 'Elective' | 'Urgent' | 'Emergency';

/**
 * Procedure outcome
 */
export type ProcedureOutcome =
  | 'Successful'
  | 'Partially_Successful'
  | 'Unsuccessful'
  | 'Complicated'
  | 'Aborted';

/**
 * Anesthesia types
 */
export type AnesthesiaType =
  | 'General'
  | 'Regional'
  | 'Local'
  | 'Spinal'
  | 'Epidural'
  | 'Sedation'
  | 'None';

/**
 * Procedure Record - Medical/surgical procedures
 */
export interface ProcedureRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  admission_id?: string;
  procedure_number?: string;

  // Procedure identification
  procedure_name: string;
  procedure_type: ProcedureType;

  // Standard coding
  icd10_pcs_code?: string; // ICD-10-PCS
  cpt_code?: string; // CPT code
  snomed_code?: string; // SNOMED-CT
  nhis_code?: string; // NHIS procedure code

  // Clinical details
  urgency: ProcedureUrgency;
  body_site?: string;
  laterality?: Laterality;
  indication?: string;
  preoperative_diagnosis?: string;
  postoperative_diagnosis?: string;

  // Procedure details
  technique?: string;
  findings?: string;
  complications?: string;
  blood_loss_ml?: number;
  specimens_sent?: string;
  implants_used?: string;

  // Outcome
  outcome?: ProcedureOutcome;
  status?: string; // Procedure status
  notes?: string; // Additional notes

  // Personnel
  performed_by_id: string;
  performed_by_name: string;
  assistant_id?: string;
  assistant_name?: string;
  anesthetist_id?: string;
  anesthetist_name?: string;
  scrub_nurse_id?: string;
  scrub_nurse_name?: string;

  // Anesthesia
  anesthesia_type?: AnesthesiaType;
  anesthesia_start?: string;
  anesthesia_end?: string;

  // Timing
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
  performed_at: string;
  scheduled_at?: string;
  created_at?: string;
  updated_at?: string;

  // Location
  theatre_id?: string;
  theatre_name?: string;

  // Documentation
  operative_notes?: string;
  post_op_instructions?: string;

  // Billing
  is_nhis_covered?: boolean;
  price?: number;
}

// ==================== BILLING ====================

/**
 * Payment category types
 */
export type PaymentCategory =
  | 'Cash'
  | 'NHIS'
  | 'Insurance'
  | 'Retainership'
  | 'Waiver'
  | 'Corporate'
  | 'Staff';

/**
 * Billing status
 */
export type BillingStatus =
  | 'Pending'
  | 'Partial'
  | 'Paid'
  | 'Waived'
  | 'Cancelled'
  | 'Refunded';

/**
 * Service type categories
 */
export type ServiceType =
  | 'Consultation'
  | 'Laboratory'
  | 'Radiology'
  | 'Pharmacy'
  | 'Procedure'
  | 'Ward'
  | 'Theatre'
  | 'Nursing'
  | 'Supplies'
  | 'Other';

/**
 * Payment method
 */
export type PaymentMethod =
  | 'Cash'
  | 'Card'
  | 'Transfer'
  | 'POS'
  | 'Insurance'
  | 'Cheque'
  | 'Mobile Money';

/**
 * Billing Item Record
 */
export interface BillingItemRecord {
  id: string;
  billing_id: string;

  // Service details
  service_type: ServiceType;
  service_id?: string;
  service_name: string;
  service_code?: string;
  cpt_code?: string; // CPT code for billing

  // Quantity and pricing
  quantity: number;
  unit_price: number;
  amount: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
  tax_amount?: number;
  final_amount: number;

  // Insurance/NHIS
  nhis_covered?: boolean;
  nhis_amount?: number;
  insurance_covered?: boolean;
  insurance_amount?: number;

  // Reference
  reference_id?: string; // Link to actual service (lab request, prescription, etc.)
  reference_type?: string;

  notes?: string;
}

/**
 * Payment Record
 */
export interface PaymentRecord {
  id: string;
  billing_id: string;
  receipt_number?: string;

  // Payment details
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  bank_name?: string;

  // Receiver info
  received_by_id: string;
  received_by_name: string;
  received_at: string;

  notes?: string;
}

/**
 * Billing Record - Financial transactions
 */
export interface BillingRecord {
  id: string;
  encounter_id: string;
  encounter_number?: string;
  patient_id: string;
  order_number: string;
  invoice_number?: string;

  // Payment category
  payment_category: PaymentCategory;
  payment_method?: string; // Cash, POS, Transfer, etc.
  hmo_id?: string;
  hmo_name?: string;
  hmo_code?: string;
  authorization_code?: string;

  // Amounts
  subtotal_amount: number;
  sub_total?: number; // Alias for subtotal_amount
  discount_amount?: number;
  discount?: number; // Alias for discount_amount
  tax_amount?: number;
  tax?: number; // Alias for tax_amount
  total_amount: number;
  nhis_amount?: number;
  insurance_amount?: number;
  patient_responsibility: number;
  amount_paid: number;
  balance: number;

  // Status
  status: BillingStatus;

  // Items and payments
  items: BillingItemRecord[];
  payments: PaymentRecord[];

  // Timestamps
  created_at: string;
  updated_at?: string;
  finalized_at?: string;

  // Created by
  created_by_id?: string;
  created_by_name?: string;

  notes?: string;
}

// ==================== ADMISSION/INPATIENT ====================

/**
 * Admission type
 */
export type AdmissionType =
  | 'Emergency'
  | 'Elective'
  | 'Transfer'
  | 'Observation'
  | 'Day Case';

/**
 * Admission status
 */
export type AdmissionStatus =
  | 'Admitted'
  | 'Stable'
  | 'Critical'
  | 'Improving'
  | 'Discharged'
  | 'Transferred'
  | 'DAMA'
  | 'Deceased';

/**
 * Discharge outcome
 */
export type DischargeOutcome =
  | 'Recovered'
  | 'Improved'
  | 'Unchanged'
  | 'Referred'
  | 'DAMA' // Discharged Against Medical Advice
  | 'Absconded'
  | 'Transferred'
  | 'Deceased';

/**
 * Admission Record - Inpatient admissions
 */
export interface AdmissionRecord {
  id: string;
  encounter_id: string;
  patient_id: string;
  admission_number: string;

  // Admission details
  admission_type: AdmissionType;
  admission_date: string;
  admission_time?: string;
  admission_source?: string; // ER, Clinic, Transfer, etc.
  source?: string; // Alias for admission_source

  // Ward/Bed assignment
  ward_id: string;
  ward_name: string;
  ward_type?: string;
  bed_id: string;
  bed_number: string;
  room_number?: string;
  room_type?: 'General' | 'Semi-Private' | 'Private' | 'ICU' | 'HDU';

  // Admission diagnosis
  admission_diagnosis: string;
  admission_icd10?: string;
  admission_notes?: string;

  // Expected stay
  expected_discharge_date?: string;
  expected_los_days?: number;

  // Discharge info
  discharge_date?: string;
  discharge_time?: string;
  discharge_diagnosis?: string;
  discharge_icd10?: string;
  discharge_summary?: string;
  discharge_medications?: string[];
  discharge_disposition?: string; // Home, Transfer, AMA, Expired, etc.
  follow_up_instructions?: string;
  follow_up_date?: string;
  outcome?: DischargeOutcome;

  // Length of stay
  length_of_stay?: number; // Days

  // Care team
  attending_doctor_id: string;
  attending_doctor_name: string;
  primary_nurse_id?: string;
  primary_nurse_name?: string;
  consultant_id?: string;
  consultant_name?: string;

  // Status
  status: AdmissionStatus;

  // Diet
  diet_order?: string;
  activity_order?: string;

  // Code status
  code_status?: 'Full Code' | 'DNR' | 'DNI' | 'Comfort Care';

  // Isolation
  isolation_required?: boolean;
  isolation_type?: string;

  created_at: string;
  updated_at?: string;
}

/**
 * Ward Round type
 */
export type WardRoundType =
  | 'Morning'
  | 'Evening'
  | 'Consultant'
  | 'Emergency'
  | 'Night';

/**
 * Ward Round Note Record - Daily ward rounds (SOAP format)
 */
export interface WardRoundNoteRecord {
  id: string;
  admission_id: string;
  admission_number?: string; // Admission number reference
  patient_id: string;

  // Round details
  round_date: string;
  round_time?: string;
  round_type: WardRoundType;

  // SOAP Notes
  subjective: string; // Patient complaints, symptoms
  objective: string; // Examination findings, vitals
  assessment: string; // Clinical assessment
  plan: string; // Treatment plan
  clinical_notes?: string; // Additional clinical notes

  // Associated vitals
  vital_signs?: VitalsRecord;

  // Additional notes
  investigations_ordered?: string[];
  medication_changes?: string;
  consultant_notes?: string;

  // Doctor info
  doctor_id: string;
  doctor_name: string;
  doctor_specialty?: string;

  // Countersign (for residents)
  countersigned_by_id?: string;
  countersigned_by_name?: string;
  countersigned_at?: string;

  created_at: string;
  updated_at?: string;
}

/**
 * Bed Transfer Record - Ward/bed transfers
 */
export interface BedTransferRecord {
  id: string;
  admission_id: string;
  admission_number?: string; // Admission number reference
  patient_id: string;

  // From location
  from_ward_id: string;
  from_ward_name: string;
  from_bed_id: string;
  from_bed_number: string;
  from_room_number?: string;

  // To location
  to_ward_id: string;
  to_ward_name: string;
  to_bed_id: string;
  to_bed_number: string;
  to_room_number?: string;

  // Transfer details
  transfer_reason: string;
  reason?: string; // Alias for transfer_reason
  clinical_indication?: string;

  // Authorization
  authorized_by_id: string;
  authorized_by_name: string;
  transferred_by_name?: string; // Person who physically transferred

  transfer_date: string;
  transfer_time?: string;

  notes?: string;
}

// ==================== EXPORT METADATA ====================

/**
 * Export metadata for tracking and audit
 */
export interface ExportMetadata {
  exportId: string;
  exportDate: string;
  exportTime: string;
  exportedBy: {
    id: string;
    name: string;
    role: string;
  };
  facility: {
    id: string;
    name: string;
    address?: string;
  };
  dateRange: {
    from: string;
    to: string;
  };
  filters: Record<string, unknown>;
  modulesCovered: string[];
  recordCounts: {
    patients: number;
    encounters: number;
    diagnoses: number;
    vitals: number;
    prescriptions: number;
    labRequests: number;
    radiologyRequests: number;
    procedures: number;
    admissions: number;
    billingRecords: number;
    nursingRecords: number;
  };
  exportFormat: 'PDF' | 'Excel' | 'CSV' | 'JSON';
  version: string;
  generatedAt: string;
}
