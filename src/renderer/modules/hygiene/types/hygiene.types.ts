/**
 * Hygiene/Infection Control Module Types
 * Encounter-centric hygiene care documentation and infection surveillance
 */

// ============================================================================
// ENUMS
// ============================================================================

export type HygieneActivityCategory =
  | 'BATH'
  | 'ORAL'
  | 'WOUND'
  | 'CATH'
  | 'LINE'
  | 'DRAIN'
  | 'SKIN'
  | 'LINEN'
  | 'ISOL'
  | 'HAND'
  | 'DEVICE'
  | 'OTHER';

export type PatientTolerance =
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'Refused'
  | 'Unable_To_Assess';

export type HygieneStatus =
  | 'Completed'
  | 'Refused'
  | 'Missed'
  | 'Deferred'
  | 'In_Progress';

export type MissedCareReason =
  | 'Patient_Refused'
  | 'Patient_Unstable'
  | 'Off_Ward'
  | 'Staffing'
  | 'Emergency'
  | 'Equipment_Issue'
  | 'Other';

export type InfectionType =
  | 'SSI'
  | 'CAUTI'
  | 'CLABSI'
  | 'VAP'
  | 'CDI'
  | 'MRSA'
  | 'Other_HAI';

export type InfectionSeverity = 'Mild' | 'Moderate' | 'Severe';

export type InfectionOutcome =
  | 'Resolved'
  | 'Ongoing'
  | 'Worsened'
  | 'Death_Related'
  | 'Death_Unrelated';

export type Shift = 'Morning' | 'Afternoon' | 'Night';

export type CareFrequency =
  | 'daily'
  | 'twice_daily'
  | 'shift'
  | '2_hourly'
  | '4_hourly'
  | 'per_protocol'
  | 'as_needed'
  | 'as_ordered'
  | 'each_entry'
  | 'each_contact'
  | 'random';

// ============================================================================
// HYGIENE ACTIVITY CATALOGUE TYPES
// ============================================================================

export interface HygieneActivityCatalogue {
  id: string;
  category: HygieneActivityCategory;
  activity_code: string;
  activity_name: string;
  description: string | null;
  default_frequency: CareFrequency | null;
  frequency_hours: number | null;
  requires_two_staff: boolean;
  requires_supplies: string[];
  triggers_infection_alert: boolean;
  requires_documentation: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HygieneActivityCatalogueFormData {
  category: HygieneActivityCategory;
  activity_code: string;
  activity_name: string;
  description?: string;
  default_frequency?: CareFrequency;
  frequency_hours?: number;
  requires_two_staff?: boolean;
  requires_supplies?: string[];
  triggers_infection_alert?: boolean;
  requires_documentation?: boolean;
}

// ============================================================================
// HYGIENE CARE RECORDS TYPES
// ============================================================================

export interface InfectionRiskFlags {
  surgical_site?: boolean;
  central_line?: boolean;
  urinary_catheter?: boolean;
  ventilator?: boolean;
  immunocompromised?: boolean;
  diabetes?: boolean;
  prolonged_hospitalization?: boolean;
  recent_antibiotics?: boolean;
  wound_contaminated?: boolean;
  notes?: string;
}

export interface HygieneCareRecord {
  id: string;

  // Core references (ENCOUNTER-CENTRIC)
  encounter_id: string;
  patient_id: string;
  admission_id: string | null;

  // Location context
  ward_id: string | null;
  bed_id: string | null;

  // Activity details
  activity_catalogue_id: string | null;
  activity_category: HygieneActivityCategory;
  activity_code: string;
  activity_name: string;

  // Timing
  scheduled_time: string | null;
  performed_time: string;
  duration_minutes: number | null;
  shift: Shift | null;

  // Performers
  performed_by: string;
  assisted_by: string | null;

  // Patient response
  patient_tolerance: PatientTolerance;
  patient_response: string | null;

  // Clinical findings
  findings: string | null;
  complications: string | null;
  requires_follow_up: boolean;
  follow_up_notes: string | null;

  // Infection risk tracking
  infection_risk_flags: InfectionRiskFlags;

  // Linked records (cross-module integration)
  linked_surgery_id: string | null;
  linked_wound_id: string | null;
  linked_device_type: string | null;

  // Status tracking
  status: HygieneStatus;
  missed_reason: MissedCareReason | null;
  missed_reason_details: string | null;
  deferred_to: string | null;

  // Supervisor review
  supervisor_reviewed: boolean;
  supervisor_id: string | null;
  supervisor_reviewed_at: string | null;
  supervisor_notes: string | null;

  // Notes
  notes: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface HygieneCareRecordWithDetails extends HygieneCareRecord {
  patient_name?: string;
  patient_emr_number?: string;
  performed_by_name?: string;
  assisted_by_name?: string;
  supervisor_name?: string;
  ward_name?: string;
  bed_number?: string;
  surgery_number?: string;
}

export interface HygieneCareRecordFormData {
  // Activity selection
  activity_catalogue_id?: string;
  activity_category: HygieneActivityCategory;
  activity_code: string;
  activity_name: string;

  // Timing
  scheduled_time?: string;
  performed_time?: string;
  duration_minutes?: number;
  shift?: Shift;

  // Performers
  assisted_by?: string;

  // Patient response
  patient_tolerance: PatientTolerance;
  patient_response?: string;

  // Clinical findings
  findings?: string;
  complications?: string;
  requires_follow_up?: boolean;
  follow_up_notes?: string;

  // Infection risk tracking
  infection_risk_flags?: InfectionRiskFlags;

  // Linked records
  linked_surgery_id?: string;
  linked_wound_id?: string;
  linked_device_type?: string;

  // Status tracking
  status: HygieneStatus;
  missed_reason?: MissedCareReason;
  missed_reason_details?: string;
  deferred_to?: string;

  // Notes
  notes?: string;
}

// Quick-entry form for batch documentation
export interface QuickHygieneEntryData {
  activity_code: string;
  status: HygieneStatus;
  patient_tolerance?: PatientTolerance;
  notes?: string;
  missed_reason?: MissedCareReason;
}

// ============================================================================
// HYGIENE CARE SCHEDULES TYPES
// ============================================================================

export interface HygieneCareSchedule {
  id: string;

  // Core references
  encounter_id: string;
  patient_id: string;
  admission_id: string | null;

  // Activity
  activity_catalogue_id: string | null;
  activity_code: string;
  activity_name: string;

  // Schedule configuration
  frequency: CareFrequency;
  frequency_hours: number | null;
  start_date: string;
  end_date: string | null;
  next_due: string | null;

  // Activity requirements
  requires_two_staff: boolean;

  // Linked records
  linked_surgery_id: string | null;
  linked_device_type: string | null;

  // Status
  is_active: boolean;
  paused_reason: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HygieneCareScheduleWithDetails extends HygieneCareSchedule {
  patient_name?: string;
  patient_emr_number?: string;
  ward_name?: string;
  bed_number?: string;
  surgery_number?: string;
  last_completed?: string;
  compliance_rate?: number;
}

export interface HygieneCareScheduleFormData {
  activity_catalogue_id?: string;
  activity_code: string;
  activity_name: string;
  frequency: CareFrequency;
  frequency_hours?: number;
  start_date: string;
  end_date?: string;
  linked_surgery_id?: string;
  linked_device_type?: string;
}

// ============================================================================
// INFECTION SURVEILLANCE TYPES
// ============================================================================

export interface InfectionSurveillance {
  id: string;

  // Core references (ENCOUNTER-CENTRIC)
  encounter_id: string;
  patient_id: string;
  admission_id: string | null;

  // Infection classification
  infection_type: InfectionType;
  infection_site: string | null;

  // Related records
  surgery_id: string | null;
  linked_surgery_id: string | null;
  hygiene_record_id: string | null;

  // Detection details
  detected_date: string;
  detected_by: string;
  detection_method: string | null;

  // Clinical details
  symptoms: string | null;
  culture_results: string | null;
  organism: string | null;
  sensitivity_pattern: string | null;
  notes: string | null;

  // Classification
  severity: InfectionSeverity | null;
  device_related: boolean;
  is_device_related: boolean;
  is_post_surgical: boolean;
  is_community_onset: boolean;
  device_type: string | null;
  device_days: number | null;

  // Action and treatment
  action_taken: string | null;
  treatment_initiated: boolean;
  treatment_notes: string | null;

  // Outcome tracking
  outcome: InfectionOutcome | null;
  resolution_date: string | null;

  // Reporting
  reported_to_ic: boolean;
  reported_date: string | null;
  ic_officer_id: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InfectionSurveillanceWithDetails extends InfectionSurveillance {
  patient_name?: string;
  patient_emr_number?: string;
  detected_by_name?: string;
  ic_officer_name?: string;
  surgery_number?: string;
  ward_name?: string;
  patient?: {
    full_name: string;
    emr_number?: string;
  };
}

export interface InfectionSurveillanceFormData {
  infection_type: InfectionType;
  surgery_id?: string;
  hygiene_record_id?: string;
  detected_date: string;
  detection_method?: string;
  symptoms?: string;
  culture_results?: string;
  organism?: string;
  sensitivity_pattern?: string;
  severity?: InfectionSeverity;
  device_related?: boolean;
  device_type?: string;
  device_days?: number;
  action_taken?: string;
  treatment_initiated?: boolean;
  treatment_notes?: string;
  outcome?: InfectionOutcome;
  resolution_date?: string;
}

// ============================================================================
// DASHBOARD AND ANALYTICS TYPES
// ============================================================================

export interface HygieneDashboardStats {
  today_completed: number;
  today_missed: number;
  today_refused: number;
  today_deferred: number;
  overdue_count: number;
  compliance_rate: number;
  pending_supervisor_review: number;
  active_schedules: number;
}

export interface WardComplianceStats {
  ward_id: string;
  ward_name: string;
  total_scheduled: number;
  completed: number;
  missed: number;
  refused: number;
  compliance_rate: number;
  by_category: Record<
    HygieneActivityCategory,
    {
      scheduled: number;
      completed: number;
      compliance_rate: number;
    }
  >;
}

export interface ShiftComplianceStats {
  shift: Shift;
  date: string;
  total_records: number;
  completed: number;
  missed: number;
  refused: number;
  compliance_rate: number;
}

export interface InfectionDashboardStats {
  active_infections: number;
  new_this_week: number;
  new_this_month: number;
  resolved_this_month: number;
  ssi_count: number;
  cauti_count: number;
  clabsi_count: number;
  vap_count: number;
  device_related_percentage: number;
}

export interface InfectionRateStats {
  infection_type: InfectionType;
  month: string;
  total_cases: number;
  device_related: number;
  surgery_related: number;
  resolved: number;
  ongoing: number;
  average_device_days: number | null;
}

export interface NursePerformanceStats {
  nurse_id: string;
  nurse_name: string;
  total_activities: number;
  completed: number;
  missed: number;
  compliance_rate: number;
  average_duration_minutes: number;
  by_category: Record<HygieneActivityCategory, number>;
}

// ============================================================================
// FILTER AND LIST TYPES
// ============================================================================

export interface HygieneRecordFilters {
  patient_id?: string;
  encounter_id?: string;
  ward_id?: string;
  shift?: Shift;
  activity_category?: HygieneActivityCategory[];
  status?: HygieneStatus[];
  date_from?: string;
  date_to?: string;
  performed_by?: string;
  requires_follow_up?: boolean;
  supervisor_reviewed?: boolean;
  search?: string;
}

export interface HygieneScheduleFilters {
  patient_id?: string;
  encounter_id?: string;
  admission_id?: string;
  ward_id?: string;
  activity_category?: HygieneActivityCategory[];
  is_active?: boolean;
  is_overdue?: boolean;
  linked_surgery_id?: string;
}

export interface InfectionFilters {
  patient_id?: string;
  encounter_id?: string;
  infection_type?: InfectionType[];
  severity?: InfectionSeverity[];
  outcome?: InfectionOutcome[];
  device_related?: boolean;
  date_from?: string;
  date_to?: string;
  reported_to_ic?: boolean;
}

// ============================================================================
// WORKLIST TYPES (For nursing workflow)
// ============================================================================

export interface HygieneWorklistItem {
  schedule_id: string;
  patient_id: string;
  patient_name: string;
  patient_emr_number: string;
  encounter_id: string;
  admission_id: string | null;
  ward_id: string;
  ward_name: string;
  bed_id: string | null;
  bed_number: string | null;
  activity_code: string;
  activity_name: string;
  activity_category: HygieneActivityCategory;
  next_due: string;
  is_overdue: boolean;
  minutes_until_due: number;
  last_completed: string | null;
  last_completed_by: string | null;
  requires_two_staff: boolean;
  linked_surgery_id: string | null;
  surgery_date: string | null;
  infection_risk_flags: InfectionRiskFlags | null;
}

export interface PatientHygieneProfile {
  patient_id: string;
  patient_name: string;
  encounter_id: string;
  admission_id: string | null;
  ward_name: string;
  bed_number: string | null;
  admission_date: string | null;
  active_schedules: number;
  pending_activities: HygieneWorklistItem[];
  recent_records: HygieneCareRecordWithDetails[];
  // Compliance stats
  today_completed: number;
  today_missed: number;
  today_refused: number;
  compliance_rate: number;
  compliance_today: number;
  overdue_activities: number;
  // Risk and infection tracking
  infection_risk_flags: InfectionRiskFlags;
  active_infections: InfectionSurveillance[];
  has_active_infection: boolean;
  // Linked surgery info
  linked_surgeries: Array<{
    surgery_id: string;
    surgery_number: string;
    procedure_name: string;
    surgery_date: string;
    wound_classification: string | null;
  }>;
  linked_surgery_ids: string[];
}

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

export function getHygieneStatusColor(status: HygieneStatus): {
  bg: string;
  text: string;
} {
  const colors: Record<HygieneStatus, { bg: string; text: string }> = {
    Completed: { bg: 'bg-green-100', text: 'text-green-800' },
    Refused: { bg: 'bg-orange-100', text: 'text-orange-800' },
    Missed: { bg: 'bg-red-100', text: 'text-red-800' },
    Deferred: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    In_Progress: { bg: 'bg-blue-100', text: 'text-blue-800' },
  };
  return colors[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

export function getHygieneStatusLabel(status: HygieneStatus): string {
  const labels: Record<HygieneStatus, string> = {
    Completed: 'Completed',
    Refused: 'Refused',
    Missed: 'Missed',
    Deferred: 'Deferred',
    In_Progress: 'In Progress',
  };
  return labels[status] || 'Unknown';
}

export function getHygieneCategoryColor(
  category: HygieneActivityCategory,
): string {
  const colors: Record<HygieneActivityCategory, string> = {
    BATH: 'bg-blue-100 text-blue-800',
    ORAL: 'bg-cyan-100 text-cyan-800',
    WOUND: 'bg-red-100 text-red-800',
    CATH: 'bg-purple-100 text-purple-800',
    LINE: 'bg-indigo-100 text-indigo-800',
    DRAIN: 'bg-pink-100 text-pink-800',
    SKIN: 'bg-amber-100 text-amber-800',
    LINEN: 'bg-lime-100 text-lime-800',
    ISOL: 'bg-rose-100 text-rose-800',
    HAND: 'bg-teal-100 text-teal-800',
    DEVICE: 'bg-violet-100 text-violet-800',
    OTHER: 'bg-gray-100 text-gray-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

export function getHygieneCategoryLabel(
  category: HygieneActivityCategory,
): string {
  const labels: Record<HygieneActivityCategory, string> = {
    BATH: 'Bathing',
    ORAL: 'Oral Hygiene',
    WOUND: 'Wound Care',
    CATH: 'Catheter Care',
    LINE: 'Line Care',
    DRAIN: 'Drain Care',
    SKIN: 'Skin/Pressure Care',
    LINEN: 'Linen/Environment',
    ISOL: 'Isolation/Precautions',
    HAND: 'Hand Hygiene',
    DEVICE: 'Device Care',
    OTHER: 'Other',
  };
  return labels[category] || 'Unknown';
}

export function getToleranceColor(tolerance: PatientTolerance): string {
  const colors: Record<PatientTolerance, string> = {
    Good: 'text-green-600',
    Fair: 'text-yellow-600',
    Poor: 'text-orange-600',
    Refused: 'text-red-600',
    Unable_To_Assess: 'text-gray-600',
  };
  return colors[tolerance] || 'text-gray-600';
}

export function getInfectionTypeColor(type: InfectionType): {
  bg: string;
  text: string;
} {
  const colors: Record<InfectionType, { bg: string; text: string }> = {
    SSI: { bg: 'bg-red-100', text: 'text-red-800' },
    CAUTI: { bg: 'bg-purple-100', text: 'text-purple-800' },
    CLABSI: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    VAP: { bg: 'bg-blue-100', text: 'text-blue-800' },
    CDI: { bg: 'bg-orange-100', text: 'text-orange-800' },
    MRSA: { bg: 'bg-pink-100', text: 'text-pink-800' },
    Other_HAI: { bg: 'bg-gray-100', text: 'text-gray-800' },
  };
  return colors[type] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

export function getInfectionTypeLabel(type: InfectionType): string {
  const labels: Record<InfectionType, string> = {
    SSI: 'Surgical Site Infection',
    CAUTI: 'Catheter-Associated UTI',
    CLABSI: 'Central Line-Associated BSI',
    VAP: 'Ventilator-Associated Pneumonia',
    CDI: 'C. difficile Infection',
    MRSA: 'MRSA Infection',
    Other_HAI: 'Other HAI',
  };
  return labels[type] || 'Unknown';
}

export function getSeverityColor(severity: InfectionSeverity | null): {
  bg: string;
  text: string;
} {
  if (!severity) return { bg: 'bg-gray-100', text: 'text-gray-800' };
  const colors: Record<InfectionSeverity, { bg: string; text: string }> = {
    Mild: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    Moderate: { bg: 'bg-orange-100', text: 'text-orange-800' },
    Severe: { bg: 'bg-red-100', text: 'text-red-800' },
  };
  return colors[severity] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

// Alias for consistency with component naming
export const getInfectionSeverityColor = getSeverityColor;

export function getOutcomeColor(outcome: InfectionOutcome | null): {
  bg: string;
  text: string;
} {
  if (!outcome) return { bg: 'bg-gray-100', text: 'text-gray-800' };
  const colors: Record<InfectionOutcome, { bg: string; text: string }> = {
    Resolved: { bg: 'bg-green-100', text: 'text-green-800' },
    Ongoing: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    Worsened: { bg: 'bg-red-100', text: 'text-red-800' },
    Death_Related: { bg: 'bg-gray-900', text: 'text-white' },
    Death_Unrelated: { bg: 'bg-gray-600', text: 'text-white' },
  };
  return colors[outcome] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

// Alias for consistency with component naming
export const getInfectionOutcomeColor = getOutcomeColor;

export function getInfectionOutcomeLabel(
  outcome: InfectionOutcome | null,
): string {
  if (!outcome) return 'Unknown';
  const labels: Record<InfectionOutcome, string> = {
    Resolved: 'Resolved',
    Ongoing: 'Ongoing',
    Worsened: 'Worsened',
    Death_Related: 'Death (Related)',
    Death_Unrelated: 'Death (Unrelated)',
  };
  return labels[outcome] || 'Unknown';
}

export function getMissedReasonLabel(reason: MissedCareReason): string {
  const labels: Record<MissedCareReason, string> = {
    Patient_Refused: 'Patient Refused',
    Patient_Unstable: 'Patient Unstable',
    Off_Ward: 'Patient Off Ward',
    Staffing: 'Staffing Issue',
    Emergency: 'Emergency',
    Equipment_Issue: 'Equipment Issue',
    Other: 'Other',
  };
  return labels[reason] || 'Unknown';
}

export function getFrequencyLabel(frequency: CareFrequency): string {
  const labels: Record<CareFrequency, string> = {
    daily: 'Once Daily',
    twice_daily: 'Twice Daily',
    shift: 'Every Shift',
    '2_hourly': 'Every 2 Hours',
    '4_hourly': 'Every 4 Hours',
    per_protocol: 'Per Protocol',
    as_needed: 'As Needed (PRN)',
    as_ordered: 'As Ordered',
    each_entry: 'Each Entry',
    each_contact: 'Each Contact',
    random: 'Random',
  };
  return labels[frequency] || 'Unknown';
}

export function calculateComplianceRate(
  completed: number,
  total: number,
): number {
  if (total === 0) return 100;
  return Math.round((completed / total) * 100 * 10) / 10;
}

export function isOverdue(nextDue: string): boolean {
  return new Date(nextDue) < new Date();
}

export function getMinutesUntilDue(nextDue: string): number {
  const due = new Date(nextDue);
  const now = new Date();
  return Math.floor((due.getTime() - now.getTime()) / (1000 * 60));
}

export function getShiftFromTime(time: Date = new Date()): Shift {
  const hour = time.getHours();
  if (hour >= 7 && hour < 14) return 'Morning';
  if (hour >= 14 && hour < 21) return 'Afternoon';
  return 'Night';
}

// Validate that required fields are filled when status is Missed
export function validateMissedCareRecord(
  status: HygieneStatus,
  missed_reason?: MissedCareReason,
): { valid: boolean; message?: string } {
  if (status === 'Missed' && !missed_reason) {
    return {
      valid: false,
      message: 'Missed reason is required when care is documented as Missed',
    };
  }
  return { valid: true };
}

// Check if activity is high-risk (infection-related)
export function isHighRiskActivity(category: HygieneActivityCategory): boolean {
  const highRiskCategories: HygieneActivityCategory[] = [
    'WOUND',
    'CATH',
    'LINE',
    'DRAIN',
    'ISOL',
  ];
  return highRiskCategories.includes(category);
}
