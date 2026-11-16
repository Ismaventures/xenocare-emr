/**
 * =============================================================================
 * NEUROPSYCHIATRY MODULE — TYPE DEFINITIONS
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// Risk Enums (used in care plan sessions & safety alerts)
// -----------------------------------------------------------------------------

export type PsychRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type MedicationCompliance = 'full' | 'partial' | 'none' | 'refused';
export type TherapyType =
  | 'CBT'
  | 'IPT'
  | 'psychodynamic'
  | 'supportive'
  | 'DBT'
  | 'group'
  | 'family'
  | 'other';
export type GlobalAssessment =
  | 'deteriorating'
  | 'unchanged'
  | 'slightly_improved'
  | 'improved'
  | 'much_improved'
  | 'remission';

// -----------------------------------------------------------------------------
// Safety Alert
// -----------------------------------------------------------------------------

export type SuicidalIdeationType =
  | 'absent'
  | 'passive'
  | 'active'
  | 'active_with_plan'
  | 'active_with_intent';

export type HomicidalIdeationType =
  | 'absent'
  | 'present'
  | 'present_with_target';

/** A parsed safety risk summary derived from MSE specialty_data */
export interface PsychSafetyRisk {
  /** True if suicidal ideation is at plan or intent level */
  is_high_risk_suicidal: boolean;
  /** True if homicidal ideation is present with a specific target */
  is_high_risk_homicidal: boolean;
  suicidal_level: SuicidalIdeationType | null;
  homicidal_level: HomicidalIdeationType | null;
}

// -----------------------------------------------------------------------------
// Psychiatric Care Plan
// -----------------------------------------------------------------------------

export interface PsychiatricCarePlanDTO {
  patient_id: string;
  encounter_id?: string;
  plan_type: string; // e.g. 'major_depressive_disorder', 'bipolar_disorder'
  plan_name: string; // Display: 'Psychiatric Management — MDD'
  diagnosis: string[]; // ICD-10 codes
  goals: string[];
  baseline_phq9?: number;
  baseline_gad7?: number;
  baseline_mmse?: number;
  frequency: string; // 'Every 2 weeks', 'Monthly'
  expected_duration: string; // '6 months', 'Ongoing'
  total_sessions?: number; // null = ongoing
  therapy_type?: TherapyType;
  medications?: string; // Free-text medication summary
  safety_plan?: string; // Documented safety plan text
}

// -----------------------------------------------------------------------------
// Psychiatric Session Data (stored in careplan_sessions.session_data JSONB)
// -----------------------------------------------------------------------------

export interface PsychiatricSessionData {
  // Mood Scores
  phq9_score?: number;
  phq9_severity?: string;
  gad7_score?: number;
  gad7_severity?: string;

  // Risk Assessment
  suicidal_ideation: SuicidalIdeationType;
  homicidal_ideation: HomicidalIdeationType;
  risk_level: PsychRiskLevel;

  // Treatment Response
  medication_compliance: MedicationCompliance;
  medication_side_effects?: string;
  global_assessment: GlobalAssessment;

  // Therapy
  therapy_type?: TherapyType;
  therapy_notes?: string;

  // Next Session Planning
  medication_changes?: string;
  plan_for_next?: string;
}

export interface CreatePsychiatricSessionDTO {
  careplan_id: string;
  session_number: number;
  scheduled_date?: string;
  session_data: PsychiatricSessionData;
  notes?: string;
  assessment?: string;
  plan_for_next?: string;
}

// -----------------------------------------------------------------------------
// Stats for dashboard
// -----------------------------------------------------------------------------

export interface NeuropsychiatryStats {
  active_care_plans: number;
  high_risk_patients: number;
  sessions_this_month: number;
  average_phq9_trend: 'improving' | 'stable' | 'worsening' | 'unknown';
}
