/**
 * Physiotherapy Module - Type Definitions
 *
 * All types and DTOs for the physiotherapy module.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type OnsetType =
  | 'Sudden'
  | 'Gradual'
  | 'Traumatic'
  | 'Post_Surgical'
  | 'Unknown';

export type MobilityStatus =
  | 'Independent'
  | 'Assisted'
  | 'Dependent'
  | 'Bed_Bound';

export type PainCharacter =
  | 'Sharp'
  | 'Dull'
  | 'Burning'
  | 'Aching'
  | 'Shooting'
  | 'Throbbing'
  | 'Cramping'
  | 'Stiffness';

export type PainPattern =
  | 'Constant'
  | 'Intermittent'
  | 'Activity_Related'
  | 'Positional'
  | 'Morning_Stiffness'
  | 'Night_Pain';

export type HandDominance = 'Right' | 'Left' | 'Ambidextrous';

export type EndFeel =
  | 'Normal_Capsular'
  | 'Normal_Bony'
  | 'Normal_Soft_Tissue'
  | 'Abnormal_Empty'
  | 'Abnormal_Spasm'
  | 'Abnormal_Springy';

// MRC Muscle Strength Scale (0-5)
export type MuscleStrengthGrade = 0 | 1 | 2 | 3 | 4 | 5;

export const MUSCLE_STRENGTH_DESCRIPTIONS: Record<MuscleStrengthGrade, string> =
  {
    0: 'No contraction',
    1: 'Flicker or trace contraction',
    2: 'Active movement with gravity eliminated',
    3: 'Active movement against gravity',
    4: 'Active movement against gravity and resistance',
    5: 'Normal power',
  };

export type ManualTherapyTechnique =
  | 'Joint_Mobilization'
  | 'Joint_Manipulation'
  | 'Soft_Tissue_Mobilization'
  | 'Massage'
  | 'MFR' // Myofascial Release
  | 'Stretching'
  | 'Trigger_Point_Release'
  | 'Dry_Needling'
  | 'Muscle_Energy_Technique'
  | 'Neural_Mobilization';

export type ElectrotherapyModality =
  | 'TENS'
  | 'IFT'
  | 'Ultrasound'
  | 'SWD' // Short Wave Diathermy
  | 'MWD' // Microwave Diathermy
  | 'Laser'
  | 'EMS' // Electrical Muscle Stimulation
  | 'NMES' // Neuromuscular EMS
  | 'Iontophoresis'
  | 'Phonophoresis'
  | 'Shockwave';

export type ThermalTherapy =
  | 'Hot_Pack'
  | 'Wax_Bath'
  | 'Infrared'
  | 'Ice_Pack'
  | 'Cold_Spray'
  | 'Ice_Massage'
  | 'Contrast_Bath';

export type TractionType =
  | 'Cervical_Manual'
  | 'Cervical_Mechanical'
  | 'Lumbar_Manual'
  | 'Lumbar_Mechanical';

export type AssistiveDevice =
  | 'Walker'
  | 'Rollator'
  | 'Quad_Cane'
  | 'Single_Cane'
  | 'Forearm_Crutches'
  | 'Axillary_Crutches'
  | 'Wheelchair'
  | 'Knee_Brace'
  | 'Ankle_Brace'
  | 'Lumbar_Support'
  | 'Cervical_Collar'
  | 'Splint'
  | 'Orthotics'
  | 'Compression_Stockings';

export type PhysioPlanStatus =
  | 'Active'
  | 'On_Hold'
  | 'Completed'
  | 'Discharged'
  | 'Transferred';

export type AttendanceStatus =
  | 'Attended'
  | 'Missed'
  | 'Cancelled'
  | 'Rescheduled';

export type EvaluationType =
  | 'Initial'
  | 'Progress'
  | 'Discharge'
  | 'Re_Evaluation';

export type Prognosis = 'Excellent' | 'Good' | 'Fair' | 'Guarded' | 'Poor';

export type ToleranceLevel = 'Good' | 'Fair' | 'Poor';

export type SwellingLevel = 'None' | 'Mild' | 'Moderate' | 'Severe';
export type TendernessLevel = 'None' | 'Mild' | 'Moderate' | 'Severe';
export type ProgressIndicator = 'Improved' | 'No_Change' | 'Worse';

// Common outcome measures (ICF-aligned)
export type OutcomeMeasure =
  // Pain & Impairment (ICF: Body Functions & Structures)
  | 'VAS' // Visual Analog Scale
  | 'NRS' // Numeric Rating Scale
  | 'McGill_Pain' // McGill Pain Questionnaire
  // Spine & Region-Specific (ICF: Activity Limitation)
  | 'ODI' // Oswestry Disability Index
  | 'NDI' // Neck Disability Index
  | 'DASH' // Disabilities of Arm Shoulder Hand
  | 'QuickDASH' // Quick DASH
  | 'LEFS' // Lower Extremity Functional Scale
  | 'SPADI' // Shoulder Pain & Disability Index
  // Joint-Specific (ICF: Activity Limitation)
  | 'KOOS' // Knee Injury and Osteoarthritis Outcome Score
  | 'WOMAC' // Western Ontario McMaster
  | 'HOOS' // Hip Disability & Osteoarthritis Outcome Score
  | 'FAAM' // Foot and Ankle Ability Measure
  // Global Function & QoL (ICF: Activity & Participation)
  | 'SF36' // Short Form 36
  | 'EQ5D' // EuroQol 5D
  | 'PSFS' // Patient-Specific Functional Scale
  | 'GAS' // Goal Attainment Scaling
  | 'GROC' // Global Rating of Change
  // Independence & Disability (ICF: Activity & Participation)
  | 'Barthel_Index'
  | 'FIM' // Functional Independence Measure
  | 'WHODAS' // WHO Disability Assessment Schedule 2.0
  // Balance & Mobility (ICF: Performance-Based)
  | 'TUG' // Timed Up and Go
  | 'Berg_Balance' // Berg Balance Scale
  | '6MWT' // 6-Minute Walk Test
  | '10MWT' // 10-Metre Walk Test
  | 'DGI' // Dynamic Gait Index
  | 'FRT' // Functional Reach Test
  // Neurological (ICF: Body Functions)
  | 'MAS' // Modified Ashworth Scale
  | 'NIHSS' // NIH Stroke Scale
  | 'FMA'; // Fugl-Meyer Assessment

// ICF domain mapping for outcome measures
export type ICFDomain =
  | 'Body_Functions' // b - Body Functions (pain, ROM, strength)
  | 'Body_Structures' // s - Body Structures
  | 'Activity' // d - Activities (walking, dressing, transfers)
  | 'Participation' // d - Participation (work, recreation, social)
  | 'Environmental' // e - Environmental Factors
  | 'Personal'; // pf - Personal Factors

export interface OutcomeMeasureEntry {
  measure: OutcomeMeasure;
  score: number | null;
  baseline_score?: number | null;
  icf_domain: ICFDomain;
  notes?: string;
}

export const OUTCOME_MEASURE_INFO: Record<OutcomeMeasure, {
  label: string;
  icf_domain: ICFDomain;
  score_range: string;
  interpretation: string;
}> = {
  VAS: { label: 'Visual Analog Scale', icf_domain: 'Body_Functions', score_range: '0-100mm', interpretation: '0=No pain, 100=Worst pain' },
  NRS: { label: 'Numeric Rating Scale', icf_domain: 'Body_Functions', score_range: '0-10', interpretation: '0=No pain, 10=Worst pain' },
  McGill_Pain: { label: 'McGill Pain Questionnaire', icf_domain: 'Body_Functions', score_range: '0-78', interpretation: 'Higher=More pain' },
  ODI: { label: 'Oswestry Disability Index', icf_domain: 'Activity', score_range: '0-100%', interpretation: '0=No disability, 100=Bed-bound' },
  NDI: { label: 'Neck Disability Index', icf_domain: 'Activity', score_range: '0-100%', interpretation: '0=No disability, 100=Complete disability' },
  DASH: { label: 'Disabilities of Arm, Shoulder & Hand', icf_domain: 'Activity', score_range: '0-100', interpretation: '0=No disability, 100=Most severe' },
  QuickDASH: { label: 'Quick DASH', icf_domain: 'Activity', score_range: '0-100', interpretation: '0=No disability, 100=Most severe' },
  LEFS: { label: 'Lower Extremity Functional Scale', icf_domain: 'Activity', score_range: '0-80', interpretation: '80=Full function, 0=Unable' },
  SPADI: { label: 'Shoulder Pain & Disability Index', icf_domain: 'Activity', score_range: '0-100', interpretation: '0=Best, 100=Worst' },
  KOOS: { label: 'Knee Injury & Osteoarthritis Outcome', icf_domain: 'Activity', score_range: '0-100', interpretation: '100=No problems, 0=Extreme problems' },
  WOMAC: { label: 'Western Ontario McMaster', icf_domain: 'Activity', score_range: '0-96', interpretation: 'Higher=Worse function' },
  HOOS: { label: 'Hip Disability & Osteoarthritis Outcome', icf_domain: 'Activity', score_range: '0-100', interpretation: '100=No problems, 0=Extreme problems' },
  FAAM: { label: 'Foot & Ankle Ability Measure', icf_domain: 'Activity', score_range: '0-100%', interpretation: '100=Full function' },
  SF36: { label: 'Short Form 36', icf_domain: 'Participation', score_range: '0-100', interpretation: '100=Best health' },
  EQ5D: { label: 'EuroQol 5D', icf_domain: 'Participation', score_range: '0-1.0', interpretation: '1=Perfect health, 0=Dead' },
  PSFS: { label: 'Patient-Specific Functional Scale', icf_domain: 'Activity', score_range: '0-10', interpretation: '0=Unable, 10=Full function' },
  GAS: { label: 'Goal Attainment Scaling', icf_domain: 'Participation', score_range: '-2 to +2', interpretation: '0=Expected, +2=Much better than expected' },
  GROC: { label: 'Global Rating of Change', icf_domain: 'Participation', score_range: '-7 to +7', interpretation: '-7=Much worse, +7=Much better' },
  Barthel_Index: { label: 'Barthel Index', icf_domain: 'Activity', score_range: '0-100', interpretation: '100=Independent, 0=Totally dependent' },
  FIM: { label: 'Functional Independence Measure', icf_domain: 'Activity', score_range: '18-126', interpretation: '126=Complete independence' },
  WHODAS: { label: 'WHO Disability Assessment Schedule', icf_domain: 'Participation', score_range: '0-100', interpretation: '0=No disability, 100=Full disability' },
  TUG: { label: 'Timed Up & Go', icf_domain: 'Activity', score_range: 'Seconds', interpretation: '<10s=Normal, >14s=Fall risk' },
  Berg_Balance: { label: 'Berg Balance Scale', icf_domain: 'Activity', score_range: '0-56', interpretation: '56=Best balance, <45=Fall risk' },
  '6MWT': { label: '6-Minute Walk Test', icf_domain: 'Activity', score_range: 'Metres', interpretation: 'Higher=Better endurance' },
  '10MWT': { label: '10-Metre Walk Test', icf_domain: 'Activity', score_range: 'm/s', interpretation: '<0.8 m/s=Community limitation' },
  DGI: { label: 'Dynamic Gait Index', icf_domain: 'Activity', score_range: '0-24', interpretation: '<19=Fall risk' },
  FRT: { label: 'Functional Reach Test', icf_domain: 'Activity', score_range: 'cm', interpretation: '<15cm=Fall risk' },
  MAS: { label: 'Modified Ashworth Scale', icf_domain: 'Body_Functions', score_range: '0-4', interpretation: '0=No spasticity, 4=Rigid' },
  NIHSS: { label: 'NIH Stroke Scale', icf_domain: 'Body_Functions', score_range: '0-42', interpretation: '0=No deficit, >25=Very severe' },
  FMA: { label: 'Fugl-Meyer Assessment', icf_domain: 'Body_Functions', score_range: '0-226', interpretation: 'Higher=Better motor recovery' },
};

// Red flags for physiotherapy
export const RED_FLAGS = [
  'Cauda Equina Syndrome',
  'Spinal Cord Compression',
  'Fracture',
  'Malignancy',
  'Infection',
  'Inflammatory Arthritis',
  'Abdominal Aortic Aneurysm',
  'Severe/Progressive Neurological Deficit',
  'Unexplained Weight Loss',
  'Bladder/Bowel Dysfunction',
  'Saddle Anesthesia',
  'Bilateral Leg Weakness',
] as const;

export type RedFlag = (typeof RED_FLAGS)[number];

// =============================================================================
// PHYSIOTHERAPY ASSESSMENT DTOs
// =============================================================================

export interface PhysioAssessmentDTO {
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  facility_id?: string;

  // Referral Information
  referral_source?: string;
  referral_doctor_id?: string;
  referral_diagnosis?: string;
  referral_date?: string;
  referral_reason?: string;

  // Chief Complaint
  chief_complaint?: string;
  complaint_duration?: string;
  onset_type?: OnsetType;
  onset_date?: string;
  mechanism_of_injury?: string;

  // Pain Assessment
  pain_location?: string;
  pain_location_diagram?: string;
  pain_score?: number;
  pain_at_rest?: number;
  pain_on_activity?: number;
  pain_worst?: number;
  pain_best?: number;
  pain_character?: PainCharacter;
  pain_radiation?: string;
  aggravating_factors?: string;
  relieving_factors?: string;
  pain_pattern?: PainPattern;
  night_pain?: boolean;

  // History
  medical_history?: string;
  surgical_history?: string;
  medications?: string;
  allergies?: string;
  occupation?: string;
  hobbies?: string;
  hand_dominance?: HandDominance;

  // Functional Assessment
  functional_status?: string;
  adl_status?: string;
  mobility_status?: MobilityStatus;
  gait_pattern?: string;
  gait_aids_used?: AssistiveDevice[];
  balance_assessment?: string;
  fall_history?: string;

  // Outcome Measures (ICF-aligned)
  outcome_measures?: OutcomeMeasureEntry[];

  // Posture Assessment
  posture_standing?: string;
  posture_sitting?: string;
  posture_deviations?: string;

  // Range of Motion
  rom_joint?: string;
  rom_notes?: string;
  rom_flexion_active?: number;
  rom_extension_active?: number;
  rom_abduction_active?: number;
  rom_adduction_active?: number;
  rom_internal_rotation_active?: number;
  rom_external_rotation_active?: number;
  rom_flexion_passive?: number;
  rom_extension_passive?: number;
  rom_abduction_passive?: number;
  rom_adduction_passive?: number;
  rom_internal_rotation_passive?: number;
  rom_external_rotation_passive?: number;
  rom_end_feel?: EndFeel;
  rom_pain_arc?: string;

  // Muscle Strength
  muscle_groups_tested?: string[];
  muscle_strength_grades?: Record<string, MuscleStrengthGrade>;
  muscle_strength_notes?: string;

  // Neurological
  sensation_intact?: boolean;
  sensation_notes?: string;
  dermatome_affected?: string;
  myotome_affected?: string;
  reflexes_tested?: string[];
  reflexes_normal?: boolean;
  reflex_notes?: string;
  neural_tension_tests?: string;

  // Special Tests
  special_tests_performed?: string[];
  special_tests_findings?: Record<string, string>;

  // Palpation
  palpation_findings?: string;
  trigger_points?: string;
  tenderness_location?: string;
  swelling_present?: boolean;
  swelling_notes?: string;

  // Previous Treatment
  previous_physio_treatment?: boolean;
  previous_treatment_details?: string;
  previous_treatment_response?: string;

  // Diagnosis
  physio_diagnosis?: string;
  icd_codes?: string[];
  problem_list?: string[];

  // Goals
  short_term_goals?: string;
  long_term_goals?: string;
  patient_goals?: string;
  expected_outcomes?: string;
  estimated_sessions?: number;
  estimated_duration_weeks?: number;

  // Precautions
  red_flags?: RedFlag[];
  red_flags_present?: boolean;
  yellow_flags?: string[];
  precautions?: string;
  contraindications?: string;

  // Prognosis
  prognosis?: Prognosis;
  prognosis_notes?: string;

  // Audit
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
  finalized_by?: string;

  // Relations
  plan?: PhysioPlanDTO;
  sessions?: PhysioSessionDTO[];
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
  };
  referrer?: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
  };
}

export interface CreatePhysioAssessmentDTO {
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  facility_id?: string;

  // Referral Information
  referral_source?: string;
  referral_doctor_id?: string;
  referral_diagnosis?: string;
  referral_date?: string;
  referral_reason?: string;

  // Chief Complaint
  chief_complaint?: string;
  complaint_duration?: string;
  onset_type?: OnsetType;
  onset_date?: string;
  mechanism_of_injury?: string;

  // Pain Assessment
  pain_location?: string;
  pain_location_diagram?: string;
  pain_score?: number;
  pain_at_rest?: number;
  pain_on_activity?: number;
  pain_worst?: number;
  pain_best?: number;
  pain_character?: PainCharacter | string;
  pain_radiation?: string;
  aggravating_factors?: string;
  relieving_factors?: string;
  pain_pattern?: PainPattern;
  night_pain?: boolean;

  // History
  medical_history?: string;
  surgical_history?: string;
  medications?: string;
  allergies?: string;
  occupation?: string;
  hobbies?: string;
  hand_dominance?: HandDominance;

  // Functional Assessment
  functional_status?: string;
  adl_status?: string;
  mobility_status?: MobilityStatus;
  gait_pattern?: string;
  gait_aids_used?: AssistiveDevice[];
  balance_assessment?: string;
  fall_history?: string;

  // Outcome Measures (ICF-aligned)
  outcome_measures?: OutcomeMeasureEntry[];

  // Posture Assessment
  posture_standing?: string;
  posture_sitting?: string;
  posture_deviations?: string;

  // Range of Motion
  rom_joint?: string;
  rom_notes?: string;
  rom_flexion_active?: number;
  rom_extension_active?: number;
  rom_abduction_active?: number;
  rom_adduction_active?: number;
  rom_internal_rotation_active?: number;
  rom_external_rotation_active?: number;
  rom_flexion_passive?: number;
  rom_extension_passive?: number;
  rom_abduction_passive?: number;
  rom_adduction_passive?: number;
  rom_internal_rotation_passive?: number;
  rom_external_rotation_passive?: number;
  rom_end_feel?: EndFeel;
  rom_pain_arc?: string;

  // Muscle Strength
  muscle_groups_tested?: string[];
  muscle_strength_grades?: Record<string, MuscleStrengthGrade>;
  muscle_strength_notes?: string;

  // Neurological
  sensation_intact?: boolean;
  sensation_notes?: string;
  dermatome_affected?: string;
  myotome_affected?: string;
  reflexes_tested?: string[];
  reflexes_normal?: boolean;
  reflex_notes?: string;
  neural_tension_tests?: string;

  // Special Tests
  special_tests_performed?: string[];
  special_tests_findings?: Record<string, string>;

  // Palpation
  palpation_findings?: string;
  trigger_points?: string;
  tenderness_location?: string;
  swelling_present?: boolean;
  swelling_notes?: string;

  // Previous Treatment
  previous_physio_treatment?: boolean;
  previous_treatment_details?: string;
  previous_treatment_response?: string;

  // Diagnosis
  physio_diagnosis?: string;
  icd_codes?: string[];
  problem_list?: string[];

  // Goals
  short_term_goals?: string;
  long_term_goals?: string;
  patient_goals?: string;
  expected_outcomes?: string;
  estimated_sessions?: number;
  estimated_duration_weeks?: number;

  // Precautions
  red_flags?: RedFlag[];
  red_flags_present?: boolean;
  yellow_flags?: string[];
  precautions?: string;
  contraindications?: string;

  // Prognosis
  prognosis?: Prognosis;
  prognosis_notes?: string;
}

export interface UpdatePhysioAssessmentDTO extends Partial<CreatePhysioAssessmentDTO> {
  // Functional
  functional_status?: string;
  mobility_status?: MobilityStatus;
  gait_pattern?: string;
  balance_assessment?: string;

  // ROM
  rom_joint?: string;
  rom_notes?: string;
  rom_flexion_active?: number;
  rom_extension_active?: number;
  rom_flexion_passive?: number;
  rom_extension_passive?: number;

  // Strength
  muscle_groups_tested?: string[];
  muscle_strength_grades?: Record<string, MuscleStrengthGrade>;
  muscle_strength_notes?: string;

  // Neurological
  sensation_intact?: boolean;
  sensation_notes?: string;
  reflexes_normal?: boolean;

  // Special Tests
  special_tests_performed?: string[];
  special_tests_findings?: Record<string, string>;

  // Diagnosis
  physio_diagnosis?: string;
  icd_codes?: string[];
  problem_list?: string[];

  // Goals
  short_term_goals?: string;
  long_term_goals?: string;
  patient_goals?: string;
  estimated_sessions?: number;

  // Precautions
  red_flags?: RedFlag[];
  red_flags_present?: boolean;
  precautions?: string;
  contraindications?: string;

  // Prognosis
  prognosis?: Prognosis;
  prognosis_notes?: string;
}

// =============================================================================
// PHYSIOTHERAPY PLAN DTOs
// =============================================================================

export type PhysioBillingType = 'per_session' | 'package';
export type PhysioPlanPaymentStatus =
  | 'pending_billing'
  | 'awaiting_payment'
  | 'paid'
  | 'waived';
export type PhysioNhisApprovalStatus =
  | 'pending'
  | 'provisional'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'not_required';

export interface PhysioPlanDTO {
  plan_id: string;
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  facility_id?: string;

  // Doctor-Prescribed Treatment Plan Fields
  prescribing_doctor_id?: string;
  consultation_id?: string;
  sessions_completed: number;
  start_date?: string;
  instructions?: string;
  billing_type?: PhysioBillingType;
  clinical_request_id?: string;
  payment_status?: PhysioPlanPaymentStatus;
  sessions_approved?: number | null;
  is_nhis_plan?: boolean;
  nhis_approval_id?: string | null;
  nhis_approval_status?: PhysioNhisApprovalStatus | null;
  nhis_authorization_code?: string | null;

  // Treatment Approach
  treatment_approach?: string;

  // Manual Therapy
  manual_therapy?: boolean;
  manual_therapy_techniques?: ManualTherapyTechnique[];
  manual_therapy_parameters?: string;

  // Therapeutic Exercise
  therapeutic_exercise?: boolean;
  exercises_prescribed?: string;
  exercise_parameters?: string;
  home_exercises?: string;
  exercise_progression_criteria?: string;

  // Electrotherapy
  electrotherapy?: boolean;
  electro_modalities?: ElectrotherapyModality[];
  electro_parameters?: Record<string, unknown>;

  // Thermal Therapy
  heat_therapy?: boolean;
  heat_type?: string;
  cold_therapy?: boolean;
  cold_type?: string;

  // Hydrotherapy
  hydrotherapy?: boolean;
  hydro_type?: string;

  // Traction
  traction?: boolean;
  traction_type?: TractionType;
  traction_parameters?: string;

  // Other Modalities
  other_modalities?: string[];
  other_modality_details?: string;

  // Assistive Devices
  assistive_devices?: AssistiveDevice[];
  assistive_device_instructions?: string;

  // Session Details
  frequency?: string;
  session_duration_minutes?: number;
  total_sessions_planned?: number;

  // Patient Education
  patient_education?: string;
  activity_modifications?: string;
  ergonomic_advice?: string;

  // Precautions
  treatment_precautions?: string;
  monitoring_parameters?: string;

  // Re-evaluation
  re_eval_interval?: string;

  // Status
  status: PhysioPlanStatus;
  status_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;

  // Relations (hydrated)
  prescribing_doctor?: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
  };
  patient?: {
    patient_id: string;
    first_name: string;
    last_name: string;
    emr_number?: string;
    date_of_birth?: string;
  };
}

export interface CreatePhysioPlanDTO {
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  facility_id?: string;

  // Doctor-prescribed fields
  prescribing_doctor_id?: string;
  consultation_id?: string;
  start_date?: string;
  instructions?: string;
  billing_type?: PhysioBillingType;
  clinical_request_id?: string;

  treatment_approach?: string;

  manual_therapy?: boolean;
  manual_therapy_techniques?: ManualTherapyTechnique[];
  manual_therapy_parameters?: string;

  therapeutic_exercise?: boolean;
  exercises_prescribed?: string;
  exercise_parameters?: string;
  home_exercises?: string;

  electrotherapy?: boolean;
  electro_modalities?: ElectrotherapyModality[];
  electro_parameters?: Record<string, unknown>;

  heat_therapy?: boolean;
  heat_type?: string;
  cold_therapy?: boolean;
  cold_type?: string;

  traction?: boolean;
  traction_type?: TractionType;
  traction_parameters?: string;

  assistive_devices?: AssistiveDevice[];
  assistive_device_instructions?: string;

  frequency?: string;
  session_duration_minutes?: number;
  total_sessions_planned?: number;

  patient_education?: string;
  activity_modifications?: string;
  ergonomic_advice?: string;

  treatment_precautions?: string;
  re_eval_interval?: string;
}

export interface UpdatePhysioPlanDTO extends Partial<CreatePhysioPlanDTO> {
  status?: PhysioPlanStatus;
  status_reason?: string;
}

// =============================================================================
// PHYSIOTHERAPY SESSION DTOs
// =============================================================================

export interface PhysioSessionDTO {
  session_id: string;
  plan_id: string;
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  facility_id?: string;

  session_number: number;
  session_date: string;
  scheduled_date?: string;
  is_pre_generated?: boolean;

  // Pre-Session (Subjective)
  pain_score_before?: number;
  subjective_report?: string;
  interval_history?: string;
  changes_since_last?: string;

  // Objective
  objective_findings?: string;
  rom_changes?: string;
  strength_changes?: string;
  functional_changes?: string;
  swelling?: SwellingLevel;
  tenderness?: TendernessLevel;
  functional_limitations?: string;
  gait_assessment?: string;

  // Treatment
  treatment_provided: string;
  modalities_used?: string[];
  modality_parameters?: Record<string, unknown>;
  exercises_performed?: string;
  exercise_sets_reps?: string;
  manual_techniques_used?: string;

  // Response
  patient_response?: string;
  pain_score_after?: number;
  tolerance?: ToleranceLevel;
  adverse_reactions?: string;

  // Progress
  progress_notes?: string;
  goals_addressed?: string[];
  progress_indicator?: ProgressIndicator;

  // Plan
  next_session_plan?: string;
  next_session_focus?: string;
  home_program_modified?: boolean;
  home_program_changes?: string;
  home_exercise_instructions?: string;
  plan_for_next_visit?: string;
  plan_modifications?: string;
  compliance_level?: string;

  // Attendance
  attendance_status: AttendanceStatus;
  missed_reason?: string;
  make_up_scheduled?: boolean;

  // Duration
  duration_minutes?: number;

  // Audit
  treated_by?: string;
  supervised_by?: string;
  created_at: string;
  updated_at: string;

  // Relations
  therapist?: {
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

export interface CreatePhysioSessionDTO {
  plan_id: string;
  assessment_id: string;
  patient_id: string;
  encounter_id: string;
  facility_id?: string;

  session_number: number;
  session_date?: string;

  pain_score_before?: number;
  subjective_report?: string;
  interval_history?: string;

  objective_findings?: string;
  rom_changes?: string;
  strength_changes?: string;

  treatment_provided: string;
  modalities_used?: string[];
  modality_parameters?: Record<string, unknown>;
  exercises_performed?: string;
  manual_techniques_used?: string;

  patient_response?: string;
  pain_score_after?: number;
  tolerance?: ToleranceLevel;
  adverse_reactions?: string;

  progress_notes?: string;
  goals_addressed?: string[];

  next_session_plan?: string;
  home_program_modified?: boolean;
  home_program_changes?: string;

  duration_minutes?: number;
  attendance_status?: AttendanceStatus;
  missed_reason?: string;
}

// =============================================================================
// PHYSIOTHERAPY PROGRESS DTOs
// =============================================================================

export interface PhysioProgressDTO {
  progress_id: string;
  assessment_id: string;
  plan_id?: string;
  patient_id: string;
  encounter_id?: string;
  facility_id?: string;

  evaluation_date: string;
  evaluation_type: EvaluationType;
  session_number_at_eval?: number;

  // Outcome Measures
  pain_score?: number;
  pain_change?: number;
  rom_data?: Record<string, number>;
  rom_improvement_percent?: number;
  strength_data?: Record<string, MuscleStrengthGrade>;
  functional_score?: number;
  outcome_measure_used?: OutcomeMeasure;
  outcome_score?: number;

  // Goals
  goals_achieved?: string[];
  goals_in_progress?: string[];
  goals_not_achieved?: string[];

  // Assessment
  progress_summary?: string;
  clinical_reasoning?: string;
  complications?: string;
  barriers_to_progress?: string;

  // Plan Modifications
  plan_modified?: boolean;
  modifications_made?: string;
  new_goals?: string;

  // Recommendations
  continue_therapy?: boolean;
  sessions_remaining?: number;
  modify_plan?: boolean;
  ready_for_discharge?: boolean;
  discharge_recommendations?: string;
  home_program_final?: string;
  follow_up_needed?: boolean;
  follow_up_interval?: string;

  // Communication
  physician_updated?: boolean;
  update_summary?: string;

  // Audit
  evaluated_by?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;

  evaluator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreatePhysioProgressDTO {
  assessment_id: string;
  plan_id?: string;
  patient_id: string;
  encounter_id?: string;
  facility_id?: string;

  evaluation_date: string;
  evaluation_type: EvaluationType;
  session_number_at_eval?: number;

  pain_score?: number;
  rom_data?: Record<string, number>;
  strength_data?: Record<string, MuscleStrengthGrade>;
  functional_score?: number;
  outcome_measure_used?: OutcomeMeasure;
  outcome_score?: number;

  goals_achieved?: string[];
  goals_in_progress?: string[];
  goals_not_achieved?: string[];

  progress_summary?: string;
  clinical_reasoning?: string;
  barriers_to_progress?: string;

  plan_modified?: boolean;
  modifications_made?: string;
  new_goals?: string;

  continue_therapy?: boolean;
  sessions_remaining?: number;
  ready_for_discharge?: boolean;
  discharge_recommendations?: string;
}

// =============================================================================
// PHYSIOTHERAPY DISCHARGE DTOs
// =============================================================================

export interface PhysioDischargeDTO {
  discharge_id: string;
  assessment_id: string;
  plan_id?: string;
  patient_id: string;
  facility_id?: string;

  discharge_date: string;
  discharge_reason?: string;

  // Summary
  initial_diagnosis?: string;
  initial_presentation?: string;
  total_sessions_attended?: number;
  total_sessions_missed?: number;
  duration_of_care?: string;

  // Outcomes
  initial_pain?: number;
  final_pain?: number;
  pain_improvement_percent?: number;
  initial_rom?: Record<string, number>;
  final_rom?: Record<string, number>;
  initial_strength?: Record<string, MuscleStrengthGrade>;
  final_strength?: Record<string, MuscleStrengthGrade>;
  initial_functional_status?: string;
  final_functional_status?: string;
  goals_summary?: {
    achieved: string[];
    partial: string[];
    not_achieved: string[];
  };

  // Discharge Plan
  discharge_instructions?: string;
  home_exercise_program?: string;
  activity_guidelines?: string;
  precautions?: string;

  // Follow-up
  follow_up_recommended?: boolean;
  follow_up_interval?: string;
  return_criteria?: string;

  // Referrals
  referred_to?: string;
  referral_reason?: string;

  // Patient Satisfaction
  patient_satisfaction?: number;
  patient_feedback?: string;

  // Audit
  discharged_by?: string;
  created_at: string;

  discharger?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreatePhysioDischargeDTO {
  assessment_id: string;
  plan_id?: string;
  patient_id: string;
  facility_id?: string;

  discharge_date: string;
  discharge_reason?: string;

  initial_diagnosis?: string;
  initial_presentation?: string;
  total_sessions_attended?: number;
  total_sessions_missed?: number;
  duration_of_care?: string;

  initial_pain?: number;
  final_pain?: number;
  initial_rom?: Record<string, number>;
  final_rom?: Record<string, number>;
  initial_strength?: Record<string, MuscleStrengthGrade>;
  final_strength?: Record<string, MuscleStrengthGrade>;
  initial_functional_status?: string;
  final_functional_status?: string;
  goals_summary?: {
    achieved: string[];
    partial: string[];
    not_achieved: string[];
  };

  discharge_instructions?: string;
  home_exercise_program?: string;
  activity_guidelines?: string;
  precautions?: string;

  follow_up_recommended?: boolean;
  follow_up_interval?: string;
  return_criteria?: string;

  referred_to?: string;
  referral_reason?: string;

  patient_satisfaction?: number;
  patient_feedback?: string;
}

// =============================================================================
// QUERY PARAMS
// =============================================================================

export interface PhysioAssessmentQueryParams {
  patient_id?: string;
  encounter_id?: string;
  facility_id?: string;
  status?: string;
  referral_doctor_id?: string;
  from_date?: string;
  to_date?: string;
  created_by?: string;
  limit?: number;
  offset?: number;
}

export interface PhysioSessionQueryParams {
  plan_id?: string;
  patient_id?: string;
  from_date?: string;
  to_date?: string;
  attendance_status?: AttendanceStatus;
  treated_by?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// PLAN EXTENSION DTOs
// =============================================================================

export interface PhysioPlanExtensionDTO {
  extension_id: string;
  plan_id: string;
  previous_sessions_planned: number;
  additional_sessions: number;
  new_total_sessions: number;
  reason?: string;
  extended_by?: string;
  created_at: string;
  extender?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreatePhysioPlanExtensionDTO {
  plan_id: string;
  additional_sessions: number;
  reason?: string;
  session_fee?: number;
}

// =============================================================================
// CONSULTATION PHYSIO ORDER DTO
// =============================================================================

export interface ConsultationPhysioOrderDTO {
  sessions_prescribed: number;
  frequency?: string;
  start_date?: string;
  instructions?: string;
  billing_type?: PhysioBillingType;
  session_duration_minutes?: number;
}

// =============================================================================
// ACTIVE PLAN SUMMARY (for dashboard)
// =============================================================================

export interface PhysioPlanSummary {
  plan_id: string;
  patient_id: string;
  encounter_id: string;
  assessment_id: string;
  total_sessions_planned: number;
  sessions_completed: number;
  sessions_remaining: number;
  status: PhysioPlanStatus;
  start_date?: string;
  frequency?: string;
  instructions?: string;
  billing_type?: PhysioBillingType;
  payment_status?: PhysioPlanPaymentStatus;
  sessions_approved?: number | null;
  is_nhis_plan?: boolean;
  nhis_approval_id?: string | null;
  nhis_approval_status?: PhysioNhisApprovalStatus | null;
  nhis_authorization_code?: string | null;
  treatment_approach?: string;
  created_at: string;
  patient?: {
    patient_id: string;
    first_name: string;
    last_name: string;
    emr_number?: string;
  };
  prescribing_doctor?: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
  };
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface PhysioAssessmentFormState {
  activeTab:
    | 'history'
    | 'pain'
    | 'functional'
    | 'rom'
    | 'strength'
    | 'neuro'
    | 'special_tests'
    | 'diagnosis'
    | 'goals';
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export interface PhysioSessionFormState {
  currentSessionNumber: number;
  lastSessionDate?: string;
  isDirty: boolean;
  isSubmitting: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function calculatePainChange(initial: number, current: number): number {
  return initial - current;
}

export function calculatePainImprovementPercent(
  initial: number,
  current: number,
): number {
  if (initial === 0) return 0;
  return Math.round(((initial - current) / initial) * 100);
}

export function getROMImprovementPercent(
  initialROM: number,
  currentROM: number,
  normalROM: number,
): number {
  const initialDeficit = normalROM - initialROM;
  const currentDeficit = normalROM - currentROM;

  if (initialDeficit === 0) return 100;

  const improvement = initialDeficit - currentDeficit;
  return Math.round((improvement / initialDeficit) * 100);
}

export function getMuscleStrengthDescription(
  grade: MuscleStrengthGrade,
): string {
  return MUSCLE_STRENGTH_DESCRIPTIONS[grade];
}

export function formatSessionFrequency(
  frequency: string,
  totalSessions: number,
): string {
  return `${frequency} × ${totalSessions} sessions`;
}
