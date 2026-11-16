// =============================================================================
// A&E Module Types
// =============================================================================

export type ArrivalMode =
  | 'walk_in'
  | 'ambulance'
  | 'transfer'
  | 'police'
  | 'military_escort'
  | 'other';
export type ReferralSource =
  | 'self'
  | 'clinic'
  | 'hospital'
  | 'police'
  | 'military'
  | 'workplace'
  | 'other';
export type IncidentType =
  | 'rta'
  | 'assault'
  | 'fall'
  | 'burn'
  | 'gunshot'
  | 'blast'
  | 'poisoning'
  | 'drowning'
  | 'medical'
  | 'obstetric'
  | 'pediatric'
  | 'other';

export type AirwayStatus =
  | 'patent'
  | 'compromised'
  | 'obstructed'
  | 'intubated';
export type BreathingStatus = 'normal' | 'labored' | 'absent' | 'assisted';
export type CirculationStatus = 'stable' | 'compromised' | 'shock' | 'arrest';

export type DispositionType =
  | 'discharge'
  | 'admit'
  | 'transfer'
  | 'refer'
  | 'death'
  | 'absconded'
  | 'left_against_advice';
export type ConditionAtDisposition =
  | 'stable'
  | 'improved'
  | 'unchanged'
  | 'deteriorated'
  | 'critical'
  | 'deceased';

export type FluidRoute = 'iv' | 'oral' | 'io' | 'sc' | 'other';
export type ProcedureOutcome =
  | 'successful'
  | 'partial'
  | 'failed'
  | 'abandoned';

export type TimelineEventCategory =
  | 'arrival'
  | 'triage'
  | 'assessment'
  | 'order'
  | 'treatment'
  | 'result'
  | 'procedure'
  | 'medication'
  | 'observation'
  | 'disposition'
  | 'note'
  | 'alert'
  | 'handover';

export type TimelineSeverity = 'info' | 'warning' | 'critical' | 'success';

export type TriageLevel = 1 | 2 | 3 | 4 | 5;
export type AcuityColor = 'Red' | 'Yellow' | 'Green';

export function triageLevelToAcuityColor(level: TriageLevel): AcuityColor {
  if (level <= 2) return 'Red';
  if (level === 3) return 'Yellow';
  return 'Green';
}

export function acuityColorToClasses(color: AcuityColor): string {
  switch (color) {
    case 'Red':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Green':
      return 'bg-green-100 text-green-800 border-green-300';
  }
}

export function triageLevelLabel(level: TriageLevel): string {
  switch (level) {
    case 1:
      return 'Resuscitation';
    case 2:
      return 'Emergent';
    case 3:
      return 'Urgent';
    case 4:
      return 'Less Urgent';
    case 5:
      return 'Non-Urgent';
  }
}

// =============================================================================
// Database Row Types (matching table shapes)
// =============================================================================

export interface AeArrival {
  id: string;
  encounter_id: string;
  patient_id: string;
  arrival_time: string;
  arrival_mode: ArrivalMode;
  referral_source: ReferralSource;
  referral_source_detail?: string | null;
  chief_complaint: string;
  incident_type?: IncidentType | null;
  incident_time?: string | null;
  incident_location?: string | null;
  medico_legal_flag: boolean;
  medico_legal_notes?: string | null;
  brought_by_name?: string | null;
  brought_by_phone?: string | null;
  brought_by_relationship?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface AePrimarySurvey {
  id: string;
  encounter_id: string;
  patient_id: string;
  // Airway
  airway_status?: AirwayStatus | null;
  airway_interventions: string[];
  airway_notes?: string | null;
  // Breathing
  breathing_status?: BreathingStatus | null;
  breathing_rate?: number | null;
  spo2?: number | null;
  chest_findings?: string | null;
  breathing_interventions: string[];
  breathing_notes?: string | null;
  // Circulation
  circulation_status?: CirculationStatus | null;
  heart_rate?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  capillary_refill?: string | null;
  bleeding_sites: any[];
  iv_access: any[];
  circulation_interventions: string[];
  circulation_notes?: string | null;
  // Disability
  gcs_eye?: number | null;
  gcs_verbal?: number | null;
  gcs_motor?: number | null;
  gcs_total?: number | null;
  pupil_left?: string | null;
  pupil_right?: string | null;
  consciousness: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive';
  disability_notes?: string | null;
  // Exposure
  exposure_findings?: string | null;
  injuries: any[];
  exposure_notes?: string | null;
  // Meta
  survey_time: string;
  performed_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface AeDisposition {
  id: string;
  encounter_id: string;
  patient_id: string;
  disposition_type: DispositionType;
  disposition_time: string;
  final_diagnosis?: string | null;
  final_diagnosis_icd10?: string | null;
  secondary_diagnoses: any[];
  condition_at_disposition?: ConditionAtDisposition | null;
  // Discharge
  discharge_instructions?: string | null;
  return_precautions?: string | null;
  follow_up_date?: string | null;
  follow_up_clinic_id?: string | null;
  medications_on_discharge: any[];
  // Admission
  admission_ward_id?: string | null;
  admission_reason?: string | null;
  admission_id?: string | null;
  // Transfer
  transfer_destination?: string | null;
  transfer_reason?: string | null;
  // Handover
  handover_summary?: any | null;
  // Meta
  disposition_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface AeTimelineEvent {
  id: string;
  encounter_id: string;
  patient_id: string;
  event_type: string;
  event_category: TimelineEventCategory;
  title: string;
  description?: string | null;
  details?: any;
  severity: TimelineSeverity;
  source_table?: string | null;
  source_id?: string | null;
  performed_by?: string | null;
  performed_at: string;
  created_at: string;
  // Joined staff name for display
  staff?: { first_name: string; last_name: string } | null;
}

export interface AeFluidChart {
  id: string;
  encounter_id: string;
  patient_id: string;
  fluid_type: string;
  route: FluidRoute;
  rate_ml_hr?: number | null;
  volume_ml?: number | null;
  start_time: string;
  end_time?: string | null;
  urine_output_ml?: number | null;
  notes?: string | null;
  administered_by: string;
  created_at: string;
  updated_at: string;
}

export interface AeProcedure {
  id: string;
  encounter_id: string;
  patient_id: string;
  procedure_name: string;
  procedure_catalogue_id?: string | null;
  consent_obtained: boolean;
  consent_notes?: string | null;
  indication?: string | null;
  technique?: string | null;
  findings?: string | null;
  outcome?: ProcedureOutcome | null;
  complications?: string | null;
  performed_by: string;
  assisted_by: any[];
  start_time: string;
  end_time?: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// A&E Encounter summary with joined data
// =============================================================================

export interface AeEncounterSummary {
  encounter_id: string;
  visit_id: string;
  encounter_number?: string;
  patient_id: string;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    surname?: string;
    date_of_birth?: string;
    gender?: string;
    phone_number?: string;
    contact_phone?: string;
    service_number?: string;
  };
  patient_name: string;
  status: string;
  priority: string;
  current_stage: string;
  chief_complaint?: string;
  start_time: string;
  attending_doctor_id?: string;
  // A&E-specific data
  arrival?: AeArrival | null;
  arrival_time?: string | null;
  acuity_color?: string | null;
  triage?: {
    triage_level?: number;
    acuity_color?: string;
    consciousness?: string;
    is_ae_triage?: boolean;
  } | null;
  disposition?: AeDisposition | null;
  // Stats
  timeline_count: number;
}

// =============================================================================
// A&E Dashboard stats
// =============================================================================

export interface AeDashboardStats {
  active_encounters: number;
  awaiting_triage: number;
  critical_count: number;
  today_total: number;
  discharged_today: number;
  admitted_today: number;
  avg_wait_minutes: number | null;
  avg_time_to_triage_min: number | null;
  avg_length_of_stay_min: number | null;
}

// =============================================================================
// Common red flags for A&E triage
// =============================================================================

export const AE_RED_FLAGS = [
  'Chest pain',
  'Difficulty breathing',
  'Altered consciousness',
  'Active bleeding',
  'Pregnancy complications',
  'Seizure',
  'Anaphylaxis',
  'Stroke signs (FAST)',
  'Burns >20% TBSA',
  'Penetrating trauma',
  'Severe headache (thunderclap)',
  'Abdominal rigidity',
  'Hemodynamic instability',
  'Spinal injury suspected',
] as const;

export const AIRWAY_INTERVENTIONS = [
  'Jaw thrust',
  'Chin lift',
  'Oropharyngeal airway (OPA)',
  'Nasopharyngeal airway (NPA)',
  'Endotracheal intubation',
  'Laryngeal mask airway (LMA)',
  'Surgical airway / Cricothyrotomy',
  'Suction',
] as const;

export const BREATHING_INTERVENTIONS = [
  'Oxygen via nasal cannula',
  'Oxygen via face mask',
  'Non-rebreather mask',
  'Bag-valve-mask ventilation',
  'Chest drain insertion',
  'Needle decompression',
  'Nebulizer',
] as const;

export const CIRCULATION_INTERVENTIONS = [
  'IV fluid bolus (crystalloid)',
  'IV fluid bolus (colloid)',
  'Blood products',
  'Tourniquet',
  'Direct pressure',
  'Wound packing',
  'CPR initiated',
  'Defibrillation',
  'Vasopressors',
] as const;
