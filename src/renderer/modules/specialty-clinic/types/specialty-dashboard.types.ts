/**
 * Dynamic Specialty Dashboard - Type Definitions
 *
 * Types for the unified specialty dashboard system that supports all 18+ specialties
 * without specialty-specific switch/case logic.
 *
 * @module specialty-dashboard.types
 * @version 2.2
 */

// =============================================================================
// SPECIALTY DEPARTMENT CONFIGURATION
// =============================================================================

/**
 * Feature flags for specialty-specific UI capabilities.
 * These enable/disable UI components without code changes.
 */
export interface SpecialtyFeatureFlags {
  has_tooth_chart?: boolean;
  has_vision_test?: boolean;
  has_visual_acuity?: boolean;
  has_exercises?: boolean;
  has_progress_tracking?: boolean;
  has_ecg?: boolean;
  has_skin_diagram?: boolean;
  has_growth_chart?: boolean;
  has_audiogram?: boolean;
  has_procedures?: boolean;
  [key: string]: boolean | undefined;
}

/**
 * Specialty department configuration from the database.
 * This is the single source of truth for all specialty metadata.
 */
export interface SpecialtyDepartment {
  id: string;
  specialty_code: string;
  specialty_name: string;
  queue_department: string;
  referral_key: string;
  icon_name: string | null;
  color_class: string | null;
  requires_dedicated_queue: boolean;
  is_active: boolean;
  display_order: number;
  version: number;
  feature_flags: SpecialtyFeatureFlags;
  created_at: string;
  updated_at: string;
}

/**
 * Simplified specialty config returned by the dashboard RPC.
 */
export interface SpecialtyConfig {
  specialty_code: string;
  specialty_name: string;
  icon_name: string | null;
  color_class: string | null;
  feature_flags: SpecialtyFeatureFlags;
}

// =============================================================================
// DASHBOARD DATA TYPES
// =============================================================================

/**
 * Stats displayed on the specialty dashboard.
 */
export interface SpecialtyStats {
  waiting: number;
  in_progress: number;
  completed_today: number;
  pending_referrals: number;
  pending_procedures: number;
  total_exams: number;
}

/**
 * Patient in the specialty queue.
 */
export interface SpecialtyQueuePatient {
  id: string;
  ticket_number: string;
  status: string;
  priority: string;
  created_at: string;
  called_at: string | null;
  first_name: string;
  last_name: string;
  emr_number: string;
  patient_id: string;
  assigned_doctor_first: string | null;
  assigned_doctor_last: string | null;
  // Encounter/visit linkage - essential for clinical record creation
  visit_id: string | null;
  encounter_id: string | null;
}

/**
 * Referral to the specialty.
 */
export interface SpecialtyReferral {
  id: string;
  request_number: string;
  status: string;
  urgency: string;
  clinical_notes: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  emr_number: string;
  requesting_doctor_first: string | null;
  requesting_doctor_last: string | null;
}

/**
 * Specialty procedure request.
 */
export interface SpecialtyProcedure {
  id: string;
  request_number: string;
  procedure_name: string;
  procedure_type: string | null;
  status: string;
  priority: string;
  clinical_notes: string | null;
  created_at: string;
  first_name: string;
  last_name: string;
  emr_number: string;
  requesting_doctor_first: string | null;
  requesting_doctor_last: string | null;
}

/**
 * Specialty exam/assessment record.
 */
export interface SpecialtyExam {
  id: string;
  exam_type: string;
  status: string;
  findings: string | null;
  created_at: string;
  completed_at: string | null;
  first_name: string;
  last_name: string;
  emr_number: string;
  examiner_first: string | null;
  examiner_last: string | null;
}

/**
 * Specialty consultation history record - includes full details for viewing.
 */
export interface SpecialtyConsultationHistory {
  id: string;
  consultation_date: string;
  chief_complaint: string | null;
  complaints: string | null;
  diagnosis: string | null;
  clinical_notes: string | null;
  // Granular history fields (added in migration 210 — fallbacks when clinical_notes is null)
  history_of_present_illness: string | null;
  past_medical_history: string | null;
  family_history: string | null;
  social_history: string | null;
  review_of_systems: string | null;
  examination_findings: string | null;
  physical_examination: string | null;
  treatment_plan: string | null;
  specialty_data: Record<string, unknown> | null;
  specialty_code: string | null;
  // ICD codes can be strings or objects with {code, is_primary, description}
  icd_codes: (
    | string
    | { code: string; is_primary?: boolean; description?: string }
  )[];
  status: string;
  first_name: string;
  last_name: string;
  emr_number: string;
  patient_id: string;
  doctor_first: string | null;
  doctor_last: string | null;
  visit_id: string | null;
  encounter_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Aggregated dashboard data returned by get_specialty_dashboard RPC.
 * This is the ONLY data structure needed to render the entire dashboard.
 */
export interface SpecialtyDashboardData {
  config: SpecialtyConfig;
  stats: SpecialtyStats;
  queue: SpecialtyQueuePatient[];
  referrals: SpecialtyReferral[];
  procedures: SpecialtyProcedure[];
  exams: SpecialtyExam[];
  history: SpecialtyConsultationHistory[];
}

// =============================================================================
// ACTION RESPONSE TYPES
// =============================================================================

/**
 * Response from accept_specialty_referral RPC.
 */
export interface AcceptReferralResponse {
  id: string;
  status: string;
  accepted_at: string;
  accepted_by: string;
}

/**
 * Response from reject_specialty_referral RPC.
 */
export interface RejectReferralResponse {
  id: string;
  status: string;
  rejected_at: string;
  rejected_by: string;
  reason: string;
}

/**
 * Response from start_specialty_session RPC.
 */
export interface StartSessionResponse {
  queue_id: string;
  status: string;
  patient_id: string;
  started_at: string;
  assigned_to: string;
}

/**
 * Response from complete_specialty_session RPC.
 */
export interface CompleteSessionResponse {
  queue_id: string;
  status: string;
  completed_at: string;
}

// =============================================================================
// RPC PARAMETERS
// =============================================================================

/**
 * Parameters for accept_specialty_referral RPC.
 */
export interface AcceptReferralParams {
  p_request_id: string;
  p_notes?: string;
}

/**
 * Parameters for reject_specialty_referral RPC.
 */
export interface RejectReferralParams {
  p_request_id: string;
  p_reason: string;
}

/**
 * Parameters for start_specialty_session RPC.
 */
export interface StartSessionParams {
  p_queue_id: string;
}

/**
 * Parameters for complete_specialty_session RPC.
 */
export interface CompleteSessionParams {
  p_queue_id: string;
  p_notes?: string;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * Return type for useSpecialtyDashboard hook.
 */
export interface UseSpecialtyDashboardResult {
  data: SpecialtyDashboardData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Return type for useCurrentUserSpecialty hook.
 */
export interface UseCurrentUserSpecialtyResult {
  specialty_code: string | null;
  role: string | null;
  isAdmin: boolean;
  isLoading: boolean;
}

// =============================================================================
// UI COMPONENT PROPS
// =============================================================================

/**
 * Props for the main SpecialtyClinicPage component.
 */
export interface SpecialtyClinicPageProps {
  /**
   * Specialty code from route params.
   * If not provided, auto-detect from user's specialty_code.
   */
  specialtyCode?: string;
}

/**
 * Props for SpecialtyHeader component.
 */
export interface SpecialtyHeaderProps {
  name: string;
  icon: string | null;
  colorClass: string | null;
}

/**
 * Props for SpecialtyStats component.
 */
export interface SpecialtyStatsProps {
  stats: SpecialtyStats;
  colorClass?: string | null;
}

/**
 * Props for SpecialtyQueue component.
 */
export interface SpecialtyQueueProps {
  queue: SpecialtyQueuePatient[];
  onStartSession: (queueId: string) => void;
  isStarting?: boolean;
}

/**
 * Props for SpecialtyReferrals component.
 */
export interface SpecialtyReferralsProps {
  referrals: SpecialtyReferral[];
  onAccept: (id: string, notes?: string) => void;
  onReject: (id: string, reason: string) => void;
  isProcessing?: boolean;
}

// =============================================================================
// ICON MAPPING (Lucide icon names from DB)
// =============================================================================

/**
 * Map of icon names from the database to Lucide icon component names.
 * These match the icon_name column in specialty_departments table.
 */
export const SPECIALTY_ICON_MAP: Record<string, string> = {
  Smile: 'Smile',
  Eye: 'Eye',
  Dumbbell: 'Dumbbell',
  Heart: 'Heart',
  Bone: 'Bone',
  Hand: 'Hand',
  Activity: 'Activity',
  Droplet: 'Droplet',
  Baby: 'Baby',
  Brain: 'Brain',
  Scissors: 'Scissors',
  Wind: 'Wind',
  Sparkles: 'Sparkles',
  Ear: 'Ear',
} as const;

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Type guard to check if a value is a valid SpecialtyDashboardData.
 */
export function isSpecialtyDashboardData(
  data: unknown,
): data is SpecialtyDashboardData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.config === 'object' &&
    typeof d.stats === 'object' &&
    Array.isArray(d.queue) &&
    Array.isArray(d.referrals)
  );
}

/**
 * Extract patient display name from queue or referral item.
 */
export function getPatientDisplayName(
  item: SpecialtyQueuePatient | SpecialtyReferral,
): string {
  return `${item.first_name} ${item.last_name}`;
}

/**
 * Check if a feature flag is enabled for the current specialty.
 */
export function isFeatureEnabled(
  config: SpecialtyConfig | undefined,
  feature: keyof SpecialtyFeatureFlags,
): boolean {
  return config?.feature_flags?.[feature] === true;
}
