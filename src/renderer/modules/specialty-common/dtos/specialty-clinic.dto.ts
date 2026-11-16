/**
 * =============================================================================
 * SPECIALTY CLINIC SHARED DTOs
 * =============================================================================
 * Shared type definitions for:
 * - Clinic triage observations (pre-consultation nurse/tech recordings)
 * - Order set templates (bundled investigation panels)
 * - Care plans (longitudinal treatment tracking)
 * - Care plan sessions (individual visit data)
 * - Clinical scoring (auto-calculated scores)
 * =============================================================================
 */

import type { SpecialtyCode } from '../../clinical-consultation/dtos/specialty-template.dto';

// =============================================================================
// Clinic Triage
// =============================================================================

/** A single triage test definition (admin-configured per specialty) */
export interface ClinicTriageConfig {
  id: string;
  specialty_code: string;
  test_name: string;
  test_code: string;
  input_type: 'text' | 'number' | 'select' | 'measurement';
  options?: string[];
  unit?: string;
  normal_min?: number;
  normal_max?: number;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

/** A recorded triage observation */
export interface ClinicTriageObservation {
  id: string;
  patient_id: string;
  encounter_id: string;
  clinic_type: string;
  observation_type: string;
  observation_value: string;
  observation_unit?: string;
  observation_category: string;
  normal_range?: string;
  is_abnormal: boolean;
  performed_by: string;
  performed_at: string;
  notes?: string;
  created_at: string;
  // Joined fields
  performer_name?: string;
}

/** DTO for creating a triage observation */
export interface CreateTriageObservationDTO {
  patient_id: string;
  encounter_id: string;
  clinic_type: string;
  observation_type: string;
  observation_value: string;
  observation_unit?: string;
  observation_category?: string;
  normal_range?: string;
  is_abnormal?: boolean;
  performed_by: string;
  notes?: string;
}

// =============================================================================
// Order Sets
// =============================================================================

/** An item within an order set */
export interface OrderSetItem {
  name: string;
  code?: string;
  specimen_type?: string;
  modality?: string;
  body_part?: string;
  category?: string;
  clinical_notes?: string;
}

/** A specialty order set template */
export interface SpecialtyOrderSet {
  id: string;
  specialty_code: string;
  set_name: string;
  description?: string;
  clinical_scenario?: string;
  orders: {
    lab_tests?: OrderSetItem[];
    imaging?: OrderSetItem[];
    procedures?: OrderSetItem[];
  };
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
}

// =============================================================================
// Care Plans
// =============================================================================

export type CareplanStatus = 'Active' | 'Completed' | 'Cancelled' | 'On_Hold';
export type SessionStatus = 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled';

/** A generic specialty care plan */
export interface SpecialtyCareplan {
  id: string;
  patient_id: string;
  encounter_id?: string;
  specialty_code: string;
  plan_type: string;
  plan_name: string;
  status: CareplanStatus;
  diagnosis?: string[];
  goals?: string[];
  baseline_data: Record<string, unknown>;
  total_sessions?: number;
  frequency?: string;
  expected_duration?: string;
  nhis_code?: string;
  billing_category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed
  completed_sessions?: number;
  next_session_date?: string;
  // Joined
  creator_name?: string;
  patient_name?: string;
}

/** DTO for creating a care plan */
export interface CreateCareplanDTO {
  patient_id: string;
  encounter_id?: string;
  specialty_code: string;
  plan_type: string;
  plan_name: string;
  diagnosis?: string[];
  goals?: string[];
  baseline_data?: Record<string, unknown>;
  total_sessions?: number;
  frequency?: string;
  expected_duration?: string;
  nhis_code?: string;
  billing_category?: string;
  created_by: string;
}

/** A session within a care plan */
export interface CareplanSession {
  id: string;
  careplan_id: string;
  session_number: number;
  status: SessionStatus;
  scheduled_date?: string;
  completed_date?: string;
  session_data: Record<string, unknown>;
  notes?: string;
  assessment?: string;
  plan_for_next?: string;
  recorded_by?: string;
  billing_id?: string;
  created_at: string;
  // Joined
  recorder_name?: string;
}

/** DTO for creating a session */
export interface CreateSessionDTO {
  careplan_id: string;
  session_number: number;
  status?: SessionStatus;
  scheduled_date?: string;
  completed_date?: string;
  session_data?: Record<string, unknown>;
  notes?: string;
  assessment?: string;
  plan_for_next?: string;
  recorded_by?: string;
}

/** DTO for completing a session */
export interface CompleteSessionDTO {
  session_data: Record<string, unknown>;
  notes?: string;
  assessment?: string;
  plan_for_next?: string;
  recorded_by: string;
}

// =============================================================================
// Clinical Scoring
// =============================================================================

/** A single item in a clinical score questionnaire */
export interface ScoreItem {
  id: string;
  question: string;
  options: { value: number; label: string }[];
}

/** A severity range for interpreting score results */
export interface SeverityRange {
  min: number;
  max: number;
  label: string;
  color: string;
  clinical_action?: string;
}

/** Definition of a clinical scoring instrument */
export interface ClinicalScoreDefinition {
  id: string;
  name: string;
  full_name: string;
  specialty_codes: string[];
  description?: string;
  items: ScoreItem[];
  max_score: number;
  severity_ranges: SeverityRange[];
  interpretation_notes?: string;
}

/** A computed score result */
export interface ScoreResult {
  score_id: string;
  total_score: number;
  max_score: number;
  severity: SeverityRange;
  item_scores: Record<string, number>;
  computed_at: string;
}
