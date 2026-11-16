import { Patient, Staff, Priority } from '../../../types/database.types';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const CARE_TYPES = [
  'Vital Signs',
  'Medication Administration',
  'Wound Care',
  'IV Therapy',
  'Catheter Care',
  'Patient Education',
  'Pre-operative Care',
  'Post-operative Care',
  'Pain Management',
  'Physical Assessment',
  'Other',
] as const;

export type CareType = (typeof CARE_TYPES)[number];

export const QUEUE_STATUSES = [
  'Waiting',
  'In Progress',
  'Called',
  'Completed',
  'Cancelled',
  'No Show',
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const PRIORITY_LEVELS = ['Normal', 'Urgent', 'Emergency'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

// =============================================================================
// VITALS INTERFACES (New dedicated vitals table)
// =============================================================================

export interface Vitals {
  vitals_id: string;
  encounter_id?: string | null;
  patient_id: string;
  // Core Vital Signs
  temperature?: number | null;
  blood_pressure?: string | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  pulse?: number | null;
  respiratory_rate?: number | null;
  oxygen_saturation?: number | null;
  // Measurements
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  // Additional
  blood_glucose?: number | null;
  pain_level?: number | null;
  // Recording Info
  nurse_id?: string | null;
  date_recorded: string;
  notes?: string | null;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient | null;
  nurse?: Staff | null;
  encounter?: {
    visit_id: string;
    encounter_number?: string;
    visit_type?: string;
  } | null;
}

export interface CreateVitalsDTO {
  encounter_id?: string;
  patient_id: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  blood_glucose?: number;
  pain_level?: number;
  notes?: string;
  is_critical?: boolean;
}

export interface UpdateVitalsDTO extends Partial<CreateVitalsDTO> {
  vitals_id: string;
}

export interface VitalsFilters {
  patient_id?: string;
  encounter_id?: string;
  nurse_id?: string;
  date_from?: string;
  date_to?: string;
  is_critical?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// QUEUE INTERFACES (Updated with encounter_id and clinic_id)
// =============================================================================

export interface NursingQueue {
  id: string;
  encounter_id?: string | null;
  clinic_id?: string | null;
  patient_id: string;
  visit_id?: string | null;
  ticket_number: string;
  location: string;
  priority: PriorityLevel;
  status: QueueStatus;
  created_at: string;
  called_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  updated_at: string;
  // Relations
  patient?: Patient | null;
  encounter?: {
    visit_id: string;
    encounter_number?: string;
    visit_type?: string;
    chief_complaint?: string;
  } | null;
  clinic?: {
    clinic_id: string;
    clinic_name: string;
    clinic_code: string;
  } | null;
  assigned_staff?: Staff | null;
}

export interface QueueFilters {
  status?: QueueStatus | 'all';
  priority?: PriorityLevel | 'all';
  location?: string;
  clinic_id?: string;
  date?: string;
  limit?: number;
}

// =============================================================================
// DTOs (Legacy nursing care - kept for backwards compatibility)
// =============================================================================

export interface NursingCareDTO {
  care_id: string;
  patient_id: string;
  visit_id?: string | null;
  nurse_id: string;
  care_type: CareType;
  notes?: string | null;
  next_care_time?: string | null;
  vital_signs?: VitalSignsData | null;
  ward?: string | null;
  bed_number?: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  nurse?: Staff;
}

export interface VitalSignsData {
  temperature?: number;
  pulse?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number; // Auto-calculated from weight and height
  blood_glucose?: number;
  pain_level?: number;
}

export interface CreateNursingCareDTO {
  patient_id: string;
  visit_id?: string; // Link to visit for workflow tracking
  queue_id?: string; // Queue entry to complete after recording
  encounter_id?: string; // Link to encounter for vitals tracking
  care_type: CareType;
  vital_signs?: VitalSignsData;
  notes: string;
  next_care_time?: string;
}

export interface UpdateNursingCareDTO extends Partial<CreateNursingCareDTO> {
  care_id: string;
}

export interface NursingCareFilters {
  page?: number;
  limit?: number;
  patient_id?: string;
  care_type?: CareType;
  nurse_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface NursingCareStats {
  today: number;
  upcoming_care: number;
}

// =============================================================================
// Validation
// =============================================================================

export interface NursingCareFormErrors {
  patient_id?: string;
  care_type?: string;
  notes?: string;
  vital_signs?: {
    temperature?: string;
    pulse?: string;
    blood_pressure?: string;
    respiratory_rate?: string;
    oxygen_saturation?: string;
  };
}

export function validateNursingCareForm(
  data: CreateNursingCareDTO,
): NursingCareFormErrors {
  const errors: NursingCareFormErrors = {};

  if (!data.patient_id) {
    errors.patient_id = 'Patient is required';
  }

  if (!data.care_type) {
    errors.care_type = 'Care type is required';
  }

  // Notes are optional - only validate length if provided
  if (
    data.notes &&
    data.notes.trim().length > 0 &&
    data.notes.trim().length < 5
  ) {
    errors.notes = 'Notes must be at least 5 characters if provided';
  }

  // Validate vital signs if provided
  if (data.vital_signs) {
    const vitals = data.vital_signs;
    const vitalErrors: NursingCareFormErrors['vital_signs'] = {};

    if (
      vitals.temperature !== undefined &&
      (vitals.temperature < 35 || vitals.temperature > 42)
    ) {
      vitalErrors.temperature = 'Temperature must be between 35°C and 42°C';
    }

    if (
      vitals.pulse !== undefined &&
      (vitals.pulse < 30 || vitals.pulse > 200)
    ) {
      vitalErrors.pulse = 'Pulse must be between 30 and 200 bpm';
    }

    if (
      vitals.blood_pressure_systolic !== undefined &&
      (vitals.blood_pressure_systolic < 60 ||
        vitals.blood_pressure_systolic > 250)
    ) {
      vitalErrors.blood_pressure =
        'Systolic BP must be between 60 and 250 mmHg';
    }

    if (
      vitals.respiratory_rate !== undefined &&
      (vitals.respiratory_rate < 8 || vitals.respiratory_rate > 40)
    ) {
      vitalErrors.respiratory_rate =
        'Respiratory rate must be between 8 and 40 breaths/min';
    }

    if (
      vitals.oxygen_saturation !== undefined &&
      (vitals.oxygen_saturation < 50 || vitals.oxygen_saturation > 100)
    ) {
      vitalErrors.oxygen_saturation = 'SpO2 must be between 50% and 100%';
    }

    if (Object.keys(vitalErrors).length > 0) {
      errors.vital_signs = vitalErrors;
    }
  }

  return errors;
}

// =============================================================================
// Helpers
// =============================================================================

export function formatVitalSigns(vitals: VitalSignsData | null): string {
  if (!vitals) return 'N/A';

  const parts: string[] = [];

  if (vitals.temperature) parts.push(`Temp: ${vitals.temperature}°C`);
  if (vitals.pulse) parts.push(`HR: ${vitals.pulse} bpm`);
  if (vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic) {
    parts.push(
      `BP: ${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`,
    );
  }
  if (vitals.respiratory_rate) parts.push(`RR: ${vitals.respiratory_rate}/min`);
  if (vitals.oxygen_saturation)
    parts.push(`SpO2: ${vitals.oxygen_saturation}%`);
  if (vitals.weight) parts.push(`Wt: ${vitals.weight}kg`);
  if (vitals.height) parts.push(`Ht: ${vitals.height}cm`);
  if (vitals.bmi) parts.push(`BMI: ${vitals.bmi.toFixed(1)}`);

  return parts.length > 0 ? parts.join(' | ') : 'N/A';
}

export function isVitalSignCritical(vitals: VitalSignsData): boolean {
  if (!vitals) return false;

  // Critical thresholds
  if (
    vitals.temperature &&
    (vitals.temperature < 35.5 || vitals.temperature > 39.5)
  )
    return true;
  if (vitals.pulse && (vitals.pulse < 50 || vitals.pulse > 120)) return true;
  if (
    vitals.blood_pressure_systolic &&
    (vitals.blood_pressure_systolic < 90 ||
      vitals.blood_pressure_systolic > 180)
  )
    return true;
  if (
    vitals.blood_pressure_diastolic &&
    (vitals.blood_pressure_diastolic < 60 ||
      vitals.blood_pressure_diastolic > 110)
  )
    return true;
  if (vitals.oxygen_saturation && vitals.oxygen_saturation < 92) return true;
  if (
    vitals.respiratory_rate &&
    (vitals.respiratory_rate < 10 || vitals.respiratory_rate > 30)
  )
    return true;

  return false;
}

export function getCareTypeColor(type: CareType): string {
  switch (type) {
    case 'Vital Signs':
      return 'bg-blue-100 text-blue-800';
    case 'Medication Administration':
      return 'bg-purple-100 text-purple-800';
    case 'Wound Care':
      return 'bg-red-100 text-red-800';
    case 'IV Therapy':
      return 'bg-green-100 text-green-800';
    case 'Pre-operative Care':
    case 'Post-operative Care':
      return 'bg-orange-100 text-orange-800';
    case 'Pain Management':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// =============================================================================
// NEW VITALS & QUEUE HELPERS
// =============================================================================

/**
 * Validate vitals form data
 */
export interface VitalsFormErrors {
  patient_id?: string;
  temperature?: string;
  blood_pressure?: string;
  pulse?: string;
  respiratory_rate?: string;
  oxygen_saturation?: string;
  weight?: string;
  height?: string;
}

export function validateVitalsForm(data: CreateVitalsDTO): VitalsFormErrors {
  const errors: VitalsFormErrors = {};

  if (!data.patient_id) {
    errors.patient_id = 'Patient is required';
  }

  if (
    data.temperature !== undefined &&
    (data.temperature < 30 || data.temperature > 45)
  ) {
    errors.temperature = 'Temperature must be between 30°C and 45°C';
  }

  if (
    data.blood_pressure_systolic !== undefined &&
    (data.blood_pressure_systolic < 50 || data.blood_pressure_systolic > 300)
  ) {
    errors.blood_pressure = 'Systolic BP must be between 50 and 300 mmHg';
  }

  if (
    data.blood_pressure_diastolic !== undefined &&
    (data.blood_pressure_diastolic < 30 || data.blood_pressure_diastolic > 200)
  ) {
    errors.blood_pressure = 'Diastolic BP must be between 30 and 200 mmHg';
  }

  if (data.pulse !== undefined && (data.pulse < 20 || data.pulse > 250)) {
    errors.pulse = 'Pulse must be between 20 and 250 bpm';
  }

  if (
    data.respiratory_rate !== undefined &&
    (data.respiratory_rate < 5 || data.respiratory_rate > 60)
  ) {
    errors.respiratory_rate =
      'Respiratory rate must be between 5 and 60 breaths/min';
  }

  if (
    data.oxygen_saturation !== undefined &&
    (data.oxygen_saturation < 50 || data.oxygen_saturation > 100)
  ) {
    errors.oxygen_saturation = 'SpO2 must be between 50% and 100%';
  }

  if (data.weight !== undefined && (data.weight < 0.5 || data.weight > 500)) {
    errors.weight = 'Weight must be between 0.5 and 500 kg';
  }

  if (data.height !== undefined && (data.height < 20 || data.height > 300)) {
    errors.height = 'Height must be between 20 and 300 cm';
  }

  return errors;
}

/**
 * Format vitals record for display
 */
export function formatVitals(vitals: Vitals | null): string {
  if (!vitals) return 'N/A';

  const parts: string[] = [];

  if (vitals.temperature) parts.push(`Temp: ${vitals.temperature}°C`);
  if (vitals.pulse) parts.push(`HR: ${vitals.pulse} bpm`);
  if (vitals.blood_pressure) parts.push(`BP: ${vitals.blood_pressure} mmHg`);
  if (vitals.respiratory_rate) parts.push(`RR: ${vitals.respiratory_rate}/min`);
  if (vitals.oxygen_saturation)
    parts.push(`SpO2: ${vitals.oxygen_saturation}%`);

  return parts.length > 0 ? parts.join(' | ') : 'N/A';
}

/**
 * Check if vitals are critical
 */
export function isVitalsCritical(vitals: Vitals | VitalSignsData): boolean {
  if (!vitals) return false;

  const v = vitals as any;

  if (v.temperature && (v.temperature < 35.5 || v.temperature > 39.5))
    return true;
  if (
    v.blood_pressure_systolic &&
    (v.blood_pressure_systolic < 90 || v.blood_pressure_systolic > 180)
  )
    return true;
  if (
    v.blood_pressure_diastolic &&
    (v.blood_pressure_diastolic < 60 || v.blood_pressure_diastolic > 110)
  )
    return true;
  if (v.pulse && (v.pulse < 50 || v.pulse > 120)) return true;
  if (v.oxygen_saturation && v.oxygen_saturation < 92) return true;
  if (
    v.respiratory_rate &&
    (v.respiratory_rate < 10 || v.respiratory_rate > 30)
  )
    return true;

  return false;
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(
  weight: number | undefined,
  height: number | undefined,
): number | null {
  if (!weight || !height || height === 0) return null;
  const heightInMeters = height / 100;
  return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
}

/**
 * Get BMI category and color
 */
export function getBMICategory(bmi: number | null | undefined): {
  label: string;
  color: string;
} {
  if (!bmi) return { label: 'N/A', color: 'text-gray-500' };

  if (bmi < 18.5) return { label: 'Underweight', color: 'text-yellow-600' };
  if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
  if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600' };
  return { label: 'Obese', color: 'text-red-600' };
}

/**
 * Get queue status color
 */
export function getQueueStatusColor(status: QueueStatus): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'Waiting':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700' };
    case 'In Progress':
      return { bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'Completed':
      return { bg: 'bg-green-50', text: 'text-green-700' };
    case 'Cancelled':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' };
  }
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: PriorityLevel): {
  bg: string;
  text: string;
} {
  switch (priority) {
    case 'Emergency':
      return { bg: 'bg-red-50', text: 'text-red-700' };
    case 'Urgent':
      return { bg: 'bg-orange-50', text: 'text-orange-700' };
    case 'Normal':
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700' };
  }
}

/**
 * Format wait time from arrival time
 */
export function formatWaitTime(arrivalTime: string | null | undefined): string {
  if (!arrivalTime) return '-';

  const arrival = new Date(arrivalTime);
  const now = new Date();
  const diffMs = now.getTime() - arrival.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Nursing Stats Interface
 */
export interface NursingStats {
  todayVitals: number;
  criticalVitals: number;
  waitingQueue: number;
  inProgressQueue: number;
  completedToday: number;
}

// =============================================================================
// TIMELINE
// =============================================================================

export interface TimelineEvent {
  id: string;
  category:
    | 'consultation'
    | 'nursing_note'
    | 'vital'
    | 'procedure'
    | 'lab'
    | 'pharmacy'
    | 'radiology'
    | 'medication'
    | 'ward_round'
    | 'nutrition_plan'
    | 'nutrition_session'
    | 'nutrition_order';
  title: string;
  description: string;
  timestamp: string;
  author: string;
  authorRole?: string;
  meta?: any;
}
