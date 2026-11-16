/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER MODULE DTOs
 * Description: Type definitions, interfaces, and helper functions
 * =============================================================================
 */

// =============================================================================
// ENUMS & CONSTANTS (Aligned with Database Schema)
// =============================================================================

/**
 * Visit Types - matches database and workflow definitions
 */
export const VisitTypes = [
  'New Visit',
  'Follow-Up',
  'Emergency',
  'Referral',
  'Referred NHIS Patient (External)',
  'Routine Check-Up',
  'Walk-In',
  'General',
  'Specialty',
  'Antenatal',
  'Immunization',
  'Medical-Checkup',
  'A&E',
] as const;

export type VisitType = (typeof VisitTypes)[number];

/**
 * Visit Type options for dropdowns with labels
 */
export const VisitTypeOptions = [
  { value: 'New Visit', label: 'New Visit' },
  { value: 'Follow-Up', label: 'Follow-Up Visit' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Referral', label: 'Referral' },
  {
    value: 'Referred NHIS Patient (External)',
    label: 'Referred NHIS Patient (External)',
  },
  { value: 'Routine Check-Up', label: 'Routine Check-Up' },
  { value: 'Walk-In', label: 'Walk-In' },
  { value: 'General', label: 'General Outpatient (GOPD)' },
  { value: 'Specialty', label: 'Specialty Clinic' },
  { value: 'Antenatal', label: 'Antenatal Care' },
  { value: 'Immunization', label: 'Immunization' },
  { value: 'Medical-Checkup', label: 'Medical Check-up' },
  { value: 'A&E', label: 'Accident & Emergency' },
] as const;

/**
 * Encounter Statuses - matches database visit_status enum
 */
export const EncounterStatuses = [
  'Active',
  'Waiting',
  'In Progress',
  'Completed',
  'Cancelled',
  'Created',
  'Closed',
] as const;

export type EncounterStatus = (typeof EncounterStatuses)[number];

/**
 * Priority Levels - matches database priority enum
 */
export const PriorityLevels = ['Normal', 'Urgent', 'Emergency'] as const;

export type PriorityLevel = (typeof PriorityLevels)[number];

/**
 * Queue Status - matches database queue_status enum
 */
export const QueueStatuses = [
  'Waiting',
  'Called',
  'In Progress',
  'Completed',
  'Cancelled',
  'No Show',
  'Ready_For_Consultation',
  'Skipped',
] as const;

export type QueueStatus = (typeof QueueStatuses)[number];

/**
 * Payment Categories for encounters
 */
export const PaymentCategories = [
  { value: 'Cash', label: 'Cash Payment', requiresPaymentFirst: true },
  { value: 'POS', label: 'POS/Card Payment', requiresPaymentFirst: true },
  {
    value: 'Bank_Transfer',
    label: 'Bank Transfer',
    requiresPaymentFirst: true,
  },
  {
    value: 'NHIS',
    label: 'NHIS (Health Insurance)',
    requiresPaymentFirst: false,
  },
  {
    value: 'Retainership',
    label: 'Retainership/Corporate',
    requiresPaymentFirst: false,
  },
  {
    value: 'Military_Free',
    label: 'Military Free Treatment',
    requiresPaymentFirst: false,
  },
  {
    value: 'Staff_Account',
    label: 'Staff Account',
    requiresPaymentFirst: false,
  },
] as const;

export type PaymentCategory = (typeof PaymentCategories)[number]['value'];

/**
 * Workflow Stages for encounter tracking
 */
export const WorkflowStages = [
  'registered',
  'encounter_created',
  'awaiting_consultation_payment',
  'paid',
  'waived',
  'vitals_taken',
  'in_queue',
  'in_consultation',
  'treatment_plan_created',
  'services_requested',
  'services_completed',
  'encounter_closed',
] as const;

export type WorkflowStage = (typeof WorkflowStages)[number];

// =============================================================================
// CLINIC INTERFACES
// =============================================================================

export interface Clinic {
  id: string; // UUID primary key
  clinic_id: string; // Business ID like CLN-001
  clinic_name: string;
  clinic_code: string;
  description?: string | null;
  // Private / Cash fees
  consultation_fee: number;
  follow_up_fee: number;
  emergency_fee: number;
  // Civilian NHIS fees
  nhis_consultation_fee?: number;
  nhis_follow_up_fee?: number;
  nhis_emergency_fee?: number;
  // Military NHIS / DHML fees
  military_nhis_consultation_fee?: number;
  military_nhis_follow_up_fee?: number;
  military_nhis_emergency_fee?: number;
  // Retainership / Corporate fees
  retainership_consultation_fee?: number;
  retainership_follow_up_fee?: number;
  retainership_emergency_fee?: number;
  // GIFSHIP fees
  gifship_consultation_fee?: number;
  gifship_follow_up_fee?: number;
  gifship_emergency_fee?: number;
  // Security Services NHIS fees
  security_services_nhis_consultation_fee?: number;
  security_services_nhis_follow_up_fee?: number;
  security_services_nhis_emergency_fee?: number;
  department_id?: string | null;
  location?: string | null;
  operating_hours?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClinicDTO {
  clinic_name: string;
  clinic_code: string;
  description?: string;
  consultation_fee: number;
  follow_up_fee?: number;
  emergency_fee?: number;
  // Security Services NHIS fees
  security_services_nhis_consultation_fee?: number;
  security_services_nhis_follow_up_fee?: number;
  security_services_nhis_emergency_fee?: number;
  department_id?: string;
  location?: string;
  operating_hours?: string;
  is_active?: boolean;
}

export interface UpdateClinicDTO extends Partial<CreateClinicDTO> {
  clinic_id: string;
}

// =============================================================================
// ENCOUNTER/VISIT INTERFACES
// =============================================================================

/**
 * Encounter Interface
 *
 * All records across the EMR (billing, lab, radiology, pharmacy, etc.)
 * must be tied to an encounter via encounter_id or visit_id.
 *
 * The encounter is linked to the patient via:
 * - patient_id (UUID) - internal foreign key
 * - emr_number (string) - unique patient identifier that never changes
 */
export interface Encounter {
  id: string; // UUID primary key
  visit_id: string; // Display ID like VIS-20251223-01001
  encounter_number?: string | null;
  patient_id: string;
  emr_number?: string | null; // Patient's unique EMR number (from patient record)
  clinic_id?: string | null;
  visit_type: string;
  priority?: PriorityLevel | null;
  status: EncounterStatus;
  chief_complaint?: string | null;
  payment_category?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  encounter_date?: string | null;
  discharge_date?: string | null;
  discharge_notes?: string | null;
  attending_doctor_id?: string | null;
  registered_by?: string | null;
  created_at: string;
  updated_at: string;
  // Workflow tracking
  current_stage?: WorkflowStage | null;
  stage_updated_at?: string | null;
  stage_history?: any[] | null;
  closed_by?: string | null;
  closed_reason?: string | null;
  // Joined fields
  patient?: {
    patient_id: string;
    first_name: string;
    last_name: string;
    surname?: string;
    emr_number?: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    contact_phone?: string;
  } | null;
  clinic?: Clinic | null;
  attending_doctor?: {
    staff_id: string;
    first_name: string;
    last_name: string;
    rank?: string; // Military rank instead of title
  } | null;
  registrar?: {
    staff_id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface CreateEncounterDTO {
  patient_id: string;
  clinic_id?: string;
  visit_type: VisitType;
  priority?: PriorityLevel;
  chief_complaint?: string;
  payment_category?: string;
  attending_doctor_id?: string;
  encounter_date?: string;
}

export interface UpdateEncounterDTO {
  visit_id: string;
  clinic_id?: string;
  visit_type?: VisitType;
  priority?: PriorityLevel;
  status?: EncounterStatus;
  chief_complaint?: string;
  payment_category?: string;
  attending_doctor_id?: string;
  discharge_date?: string;
  discharge_notes?: string;
  end_time?: string;
}

// =============================================================================
// FILTER INTERFACES
// =============================================================================

export interface EncounterFilters {
  query?: string;
  status?: EncounterStatus | 'all';
  visit_type?: VisitType | 'all';
  clinic_id?: string;
  priority?: PriorityLevel | 'all';
  date_from?: string;
  date_to?: string;
  patient_id?: string;
  attending_doctor_id?: string;
  limit?: number;
  offset?: number;
  // Extended filters for admin
  patient_category?: string;
  insurance_type?: string;
  payment_category?: string;
  gender?: string;
  age_min?: number;
  age_max?: number;
  course?: string;
  diagnosis?: string;
  diagnosis_code?: string;
  icd10_category?: string;
  chief_complaint?: string;
  department_id?: string;
  // Specialty & Provider
  specialty_code?: string;
  registered_by?: string;
  // Clinical
  has_consultation?: string;
  has_treatment_plan?: string;
  // Services & Orders
  has_lab_order?: string;
  lab_status?: string;
  has_radiology_order?: string;
  radiology_status?: string;
  has_prescription?: string;
  prescription_status?: string;
  has_procedure?: string;
  // Referrals
  has_internal_referral?: string;
  referral_target_specialty?: string;
  has_external_referral?: string;
  nhis_referral_status?: string;
  nhis_claim_status?: string;
  // Admission & Disposition
  patient_type?: string;
  was_admitted?: string;
  ward?: string;
  discharge_status?: string;
  encounter_outcome?: string;
  los_min?: number;
  los_max?: number;
  // A&E Specific
  triage_category?: string;
  arrival_mode?: string;
  ae_disposition?: string;
  // ANC Specific
  anc_visit_number?: string;
  gestational_age_min?: string;
  gestational_age_max?: string;
  // Billing extended
  has_pending_bills?: string;
  has_completed_payment?: string;
  billing_amount_min?: number;
  billing_amount_max?: number;
  // Time
  is_overdue?: string;
  is_expired?: string;
}

export interface ClinicFilters {
  query?: string;
  is_active?: boolean;
  department_id?: string;
}

// =============================================================================
// STATS INTERFACE
// =============================================================================

export interface EncounterStats {
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  todayTotal: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get status badge color for encounters
 */
export function getEncounterStatusColor(status: EncounterStatus | string): {
  bg: string;
  text: string;
  border: string;
} {
  const statusColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    Active: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    Created: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    },
    Completed: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    Closed: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
    Cancelled: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    // Legacy statuses for backward compatibility
    Waiting: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    },
    'In Progress': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    'No Show': {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
  };

  return (
    statusColors[status] || {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    }
  );
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: PriorityLevel | string): {
  bg: string;
  text: string;
  border: string;
} {
  const priorityColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    Normal: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    Urgent: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
    },
    Emergency: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
    },
    // Legacy values for backward compatibility
    Low: {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
    },
    High: {
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
    },
    Critical: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
    },
  };

  return (
    priorityColors[priority] || {
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
    }
  );
}

/**
 * Get visit type badge color
 */
export function getVisitTypeColor(visitType: VisitType | string): {
  bg: string;
  text: string;
  border: string;
} {
  const typeColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    'New Visit': {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    'Follow-Up': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    Emergency: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    Referral: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
    'Routine Check-Up': {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
    },
    'Walk-In': {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    },
    General: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    Specialty: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
    },
    Antenatal: {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-200',
    },
    Immunization: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
    },
    'Medical-Checkup': {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
  };

  return (
    typeColors[visitType] || {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    }
  );
}

/**
 * Format patient name from encounter
 */
export function formatEncounterPatientName(encounter: Encounter): string {
  if (!encounter.patient) return 'Unknown Patient';
  const { first_name, surname, last_name } = encounter.patient;
  // Use surname if available (from DB), fall back to last_name for backwards compatibility
  const familyName = surname || last_name || '';
  return `${familyName}, ${first_name || ''}`.trim() || 'Unknown Patient';
}

/**
 * Format doctor name from encounter
 */
export function formatEncounterDoctorName(encounter: Encounter): string {
  if (!encounter.attending_doctor) return 'Not Assigned';
  const { rank, first_name, last_name } = encounter.attending_doctor;
  return (
    `${rank || ''} ${first_name || ''} ${last_name || ''}`.trim() ||
    'Not Assigned'
  );
}

/**
 * Format encounter date/time
 */
export function formatEncounterDateTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format encounter date only
 */
export function formatEncounterDate(
  dateString: string | null | undefined,
): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get consultation fee based on visit type.
 * Uses SINGLE SOURCE OF TRUTH: consultation_fee, follow_up_fee, emergency_fee
 * Same price for ALL insurance types. NHIS coverage is handled separately.
 */
export function getConsultationFee(
  clinic: Clinic | null | undefined,
  visitType: VisitType,
  _insuranceType?: string, // Kept for API compatibility, no longer used for fee selection
): number {
  if (!clinic) return 0;

  // Single source of truth: always use the base fee columns
  switch (visitType) {
    case 'Emergency':
      return clinic.emergency_fee || clinic.consultation_fee;
    case 'Follow-Up':
      return clinic.follow_up_fee || clinic.consultation_fee;
    default:
      return clinic.consultation_fee;
  }
}

/**
 * Calculate wait time
 */
export function calculateWaitTime(
  startTime: string | null | undefined,
): string {
  if (!startTime) return '-';

  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Check if encounter is overdue (waiting beyond configured threshold).
 * @param encounter The encounter to check
 * @param overdueMinutes Configurable threshold in minutes (default: 30)
 */
export function isEncounterOverdue(
  encounter: Encounter,
  overdueMinutes = 30,
): boolean {
  const waitingStatuses = ['Active', 'Created', 'Waiting'];
  if (!waitingStatuses.includes(encounter.status) || !encounter.start_time)
    return false;

  const start = new Date(encounter.start_time);
  const now = new Date();
  const diffMins = (now.getTime() - start.getTime()) / 60000;

  return diffMins > overdueMinutes;
}
