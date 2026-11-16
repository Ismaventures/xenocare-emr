/**
 * Dental Module - Type Definitions
 *
 * All types and DTOs for the dental module, following existing EMR patterns.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ToothStatus =
  | 'Present'
  | 'Missing'
  | 'Impacted'
  | 'Deciduous'
  | 'Unerupted'
  | 'Partial_Eruption';

export type ToothCondition =
  | 'Healthy'
  | 'Caries'
  | 'Filled'
  | 'Crown'
  | 'Bridge_Abutment'
  | 'Root_Canal_Treated'
  | 'Fractured'
  | 'Mobile'
  | 'Extracted';

export type GingivalStatus =
  | 'Healthy'
  | 'Gingivitis'
  | 'Mild_Periodontitis'
  | 'Moderate_Periodontitis'
  | 'Severe_Periodontitis';

export type DentalUrgency =
  | 'Emergency'
  | 'Urgent'
  | 'Priority'
  | 'Routine'
  | 'Elective';

export type PainCharacter =
  | 'Sharp'
  | 'Dull'
  | 'Throbbing'
  | 'Intermittent'
  | 'Constant';

export type OcclusionClass =
  | 'Class_I'
  | 'Class_II_Div1'
  | 'Class_II_Div2'
  | 'Class_III';

export type CariesClassification =
  | 'Class_I'
  | 'Class_II'
  | 'Class_III'
  | 'Class_IV'
  | 'Class_V'
  | 'Class_VI';

export type AnesthesiaType =
  | 'None'
  | 'Topical'
  | 'Local'
  | 'Block'
  | 'Sedation'
  | 'General';

export type DentalProcedureCategory =
  | 'Preventive'
  | 'Restorative'
  | 'Endodontic'
  | 'Periodontic'
  | 'Prosthodontic'
  | 'Surgical'
  | 'Orthodontic';

export type DentalProcedureType =
  | 'Extraction'
  | 'Simple_Extraction'
  | 'Surgical_Extraction'
  | 'Filling'
  | 'Composite_Filling'
  | 'Amalgam_Filling'
  | 'GIC_Filling'
  | 'Scaling_Polishing'
  | 'Root_Canal'
  | 'RCT_Single_Canal'
  | 'RCT_Multi_Canal'
  | 'Crown_Preparation'
  | 'Bridge_Work'
  | 'Denture_Impression'
  | 'Denture_Fitting'
  | 'Splinting'
  | 'Pulpotomy'
  | 'Pulpectomy'
  | 'Apicectomy'
  | 'Gingivectomy'
  | 'Flap_Surgery'
  | 'Bone_Grafting'
  | 'Implant_Placement'
  | 'Other';

export type DentalMedicationType =
  | 'Analgesic'
  | 'Antibiotic'
  | 'Antiseptic'
  | 'Anti_Inflammatory'
  | 'Other';

export type RadiographType =
  | 'Periapical'
  | 'Bitewing'
  | 'OPG'
  | 'CBCT'
  | 'Lateral_Ceph'
  | 'Occlusal';

export type RestorationMaterial =
  | 'Amalgam'
  | 'Composite'
  | 'GIC'
  | 'Ceramic'
  | 'Gold'
  | 'Zirconia';

export type PeriapicalStatus =
  | 'Normal'
  | 'Periapical_Abscess'
  | 'Granuloma'
  | 'Cyst';

// FDI Tooth Numbering System
export const ADULT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
} as const;

export const DECIDUOUS_TEETH = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81],
} as const;

// =============================================================================
// DENTAL EXAM DTOs
// =============================================================================

export interface DentalExamDTO {
  exam_id: string;
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  facility_id?: string;

  // Visit classification
  consultation_type?: string; // New Patient / Recall / Emergency / Follow-up / Referral

  // Chief Complaint
  chief_complaint?: string;
  complaint_type?: string; // Structured complaint category
  complaint_description?: string; // Primary complaint description dropdown
  complaint_duration?: string;
  affected_area?: string; // Specific tooth/region (FDI notation)
  pain_level?: number;
  pain_character?: PainCharacter;

  // History
  dental_history?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  systemic_conditions?: Record<string, boolean>;
  tobacco_use?: string;
  alcohol_use?: string;

  // Oral Examination
  extraoral_findings?: string;
  intraoral_findings?: string;
  soft_tissue_exam?: string;
  hard_tissue_exam?: string;
  occlusion_notes?: string;
  occlusion_class?: OcclusionClass;
  tmj_assessment?: string;
  examination_notes?: string;

  // Periodontal Assessment
  gingival_status?: GingivalStatus;
  bleeding_on_probing?: boolean;
  plaque_score?: number;
  calculus_present?: boolean;
  calculus_type?: string;
  pocket_depth_notes?: string;

  // Radiographic Findings
  radiograph_taken?: boolean;
  radiograph_type?: RadiographType;
  radiograph_findings?: string;

  // Diagnosis
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];

  // Treatment Plan
  treatment_plan?: string;
  urgency?: DentalUrgency;
  estimated_sessions?: number;
  estimated_cost?: number;

  // Follow-up
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;

  // Audit
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
  finalized_by?: string;

  // Relations (populated)
  dental_chart?: DentalChartEntryDTO[];
  procedures?: DentalProcedureDTO[];
  prescriptions?: DentalPrescriptionDTO[];
  patient?: {
    patient_id: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    emr_number?: string;
  };
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
  };
}

export interface CreateDentalExamDTO {
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  facility_id?: string;

  // Visit classification
  consultation_type?: string;

  // Chief Complaint
  chief_complaint?: string;
  complaint_type?: string;
  complaint_description?: string;
  complaint_duration?: string;
  affected_area?: string;
  pain_level?: number;
  pain_character?: string;

  // History
  dental_history?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  systemic_conditions?: Record<string, boolean>;
  tobacco_use?: string;
  alcohol_use?: string;

  // Oral Examination
  extraoral_findings?: string;
  intraoral_findings?: string;
  soft_tissue_exam?: string;
  hard_tissue_exam?: string;
  occlusion_notes?: string;
  occlusion_class?: string;
  tmj_assessment?: string;
  examination_notes?: string;

  // Periodontal Assessment
  gingival_status?: GingivalStatus;
  bleeding_on_probing?: boolean;
  plaque_score?: number;
  calculus_present?: boolean;
  calculus_type?: string;
  pocket_depth_notes?: string;

  // Radiograph
  radiograph_taken?: boolean;
  radiograph_type?: string;
  radiograph_findings?: string;

  // Diagnosis & Plan
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];
  treatment_plan?: string;
  urgency?: DentalUrgency;
  estimated_sessions?: number;
  estimated_cost?: number;

  // Follow-up
  follow_up_required?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
}

export interface UpdateDentalExamDTO extends Partial<CreateDentalExamDTO> {
  // All fields now in CreateDentalExamDTO, this extends for backward compatibility
}

// =============================================================================
// DENTAL CHART DTOs
// =============================================================================

export interface DentalChartEntryDTO {
  chart_id: string;
  exam_id: string;
  patient_id: string;
  encounter_id: string;

  tooth_number: number;
  tooth_status: ToothStatus;
  condition?: ToothCondition;
  caries_classification?: CariesClassification;
  mobility_grade?: number;

  // Surface Involvement (MODBL)
  mesial?: boolean;
  occlusal?: boolean;
  distal?: boolean;
  buccal?: boolean;
  lingual?: boolean;
  incisal?: boolean;

  // Additional Findings
  periapical_status?: PeriapicalStatus;
  restoration_material?: RestorationMaterial;
  restoration_date?: string;
  prosthesis_type?: string;
  sensitivity?: string;
  notes?: string;

  // Audit
  recorded_by?: string;
  recorded_at: string;
  updated_at: string;
}

export interface CreateDentalChartEntryDTO {
  exam_id: string;
  patient_id: string;
  encounter_id: string;

  tooth_number: number;
  tooth_status: ToothStatus;
  condition?: ToothCondition;
  caries_classification?: string;
  mobility_grade?: number;

  mesial?: boolean;
  occlusal?: boolean;
  distal?: boolean;
  buccal?: boolean;
  lingual?: boolean;
  incisal?: boolean;

  periapical_status?: string;
  restoration_material?: string;
  restoration_date?: string;
  prosthesis_type?: string;
  sensitivity?: string;
  notes?: string;
}

export interface UpdateDentalChartEntryDTO extends Partial<CreateDentalChartEntryDTO> {
  chart_id?: string;
}

// Batch update for entire chart
export interface DentalChartBatchDTO {
  exam_id: string;
  patient_id: string;
  encounter_id: string;
  entries: CreateDentalChartEntryDTO[];
}

// =============================================================================
// DENTAL PROCEDURE DTOs
// =============================================================================

export interface DentalProcedureDTO {
  procedure_id: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  procedure_code?: string;
  procedure_type: DentalProcedureType;
  procedure_category?: DentalProcedureCategory;
  tooth_numbers?: number[];
  surfaces?: string[];
  procedure_description?: string;

  // Anesthesia
  anesthesia_type?: AnesthesiaType;
  anesthesia_agent?: string;
  anesthesia_quantity?: string;
  anesthesia_site?: string;

  // Pre-Procedure
  consent_obtained?: boolean;
  consent_date?: string;
  pre_procedure_notes?: string;

  // Procedure Execution
  procedure_date?: string;
  duration_minutes?: number;
  materials_used?: string;
  complications?: string;

  // Post-Procedure
  post_procedure_instructions?: string;
  medications_prescribed?: string;
  sutures_placed?: boolean;
  suture_type?: string;
  suture_removal_date?: string;

  // Billing
  fee?: number;
  discount_percent?: number;

  // Status & Audit
  status: string;
  priority?: string;
  scheduled_date?: string;
  performed_by?: string;
  assisted_by?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Relations
  performer?: {
    id: string;
    first_name: string;
    last_name: string;
  };

  // Patient (from join in list queries)
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    surname: string;
    emr_number?: string;
  };
}

export interface CreateDentalProcedureDTO {
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  procedure_code?: string;
  procedure_type: string;
  procedure_category?: string;
  tooth_numbers?: number[];
  surfaces?: string[];
  procedure_description?: string;

  anesthesia_type?: string;
  anesthesia_agent?: string;
  anesthesia_quantity?: string;

  consent_obtained?: boolean;
  pre_procedure_notes?: string;

  scheduled_date?: string;
  priority?: string;
  fee?: number;
}

export interface UpdateDentalProcedureDTO extends Partial<CreateDentalProcedureDTO> {
  procedure_date?: string;
  duration_minutes?: number;
  materials_used?: string;
  complications?: string;
  post_procedure_instructions?: string;
  medications_prescribed?: string;
  sutures_placed?: boolean;
  suture_type?: string;
  suture_removal_date?: string;
  performed_by?: string;
  assisted_by?: string;
  status?: string;
}

export interface CompleteDentalProcedureDTO {
  procedure_id: string;
  procedure_date: string;
  duration_minutes?: number;
  materials_used?: string;
  complications?: string;
  post_procedure_instructions?: string;
  performed_by: string;
  assisted_by?: string;
}

// =============================================================================
// DENTAL PRESCRIPTION DTOs
// =============================================================================

export interface DentalPrescriptionDTO {
  prescription_id: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  procedure_id?: string;
  facility_id?: string;

  medication_name: string;
  medication_type?: DentalMedicationType;
  generic_name?: string;
  dosage: string;
  dosage_form?: string;
  frequency: string;
  duration: string;
  route?: string;
  quantity?: number;
  refills_allowed?: number;

  special_instructions?: string;
  warnings?: string;

  prescribed_by?: string;
  prescribed_at: string;
  status: string;
  dispensed_at?: string;
  dispensed_by?: string;

  // Relations
  prescriber?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateDentalPrescriptionDTO {
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  procedure_id?: string;
  facility_id?: string;

  medication_name: string;
  medication_type?: string;
  generic_name?: string;
  dosage: string;
  dosage_form?: string;
  frequency: string;
  duration: string;
  route?: string;
  quantity?: number;
  refills_allowed?: number;

  special_instructions?: string;
  warnings?: string;
}

// =============================================================================
// QUERY PARAMS
// =============================================================================

export interface DentalExamQueryParams {
  patient_id?: string;
  encounter_id?: string;
  facility_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}

export interface DentalProcedureQueryParams {
  patient_id?: string;
  encounter_id?: string;
  exam_id?: string;
  procedure_type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  performed_by?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface DentalExamFormState {
  activeTab: 'complaint' | 'examination' | 'chart' | 'diagnosis' | 'plan';
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  selectedTooth?: number;
}

export interface DentalChartSelectionState {
  selectedTeeth: number[];
  highlightedTooth?: number;
  viewMode: 'adult' | 'pediatric' | 'mixed';
  showConditions: boolean;
  showProcedures: boolean;
}
