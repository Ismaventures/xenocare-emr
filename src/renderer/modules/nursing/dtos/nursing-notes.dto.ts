/**
 * Nursing Notes DTOs
 *
 * Types and interfaces for nursing observations, progress notes,
 * and other reports that nurses add to patient encounters.
 */

// =============================================================================
// Enums & Constants
// =============================================================================

export const NURSING_NOTE_TYPES = [
  'Progress_Note',
  'Observation',
  'Incident',
  'Handoff',
  'Assessment',
  'Medication_Note',
  'Procedure_Note',
  'Patient_Response',
] as const;

export type NursingNoteType = (typeof NURSING_NOTE_TYPES)[number];

export const PATIENT_CONDITIONS = [
  'Stable',
  'Improving',
  'Deteriorating',
  'Critical',
  'Unchanged',
] as const;

export type PatientCondition = (typeof PATIENT_CONDITIONS)[number];

export const SHIFT_TYPES = ['Morning', 'Afternoon', 'Night'] as const;

export type ShiftType = (typeof SHIFT_TYPES)[number];

// =============================================================================
// DTOs
// =============================================================================

/**
 * Full nursing note record from database
 */
export interface NursingNoteDTO {
  id: string;

  // Relationships
  encounter_id: string;
  patient_id: string;
  consultation_id?: string | null;
  treatment_plan_id?: string | null;
  treatment_task_id?: string | null;

  // Note content
  note_type: NursingNoteType;
  title?: string | null;
  content: string;

  // Clinical observations
  patient_condition?: PatientCondition | null;
  pain_level?: number | null;

  // Additional fields
  interventions_performed?: string | null;
  patient_response?: string | null;
  follow_up_required: boolean;
  follow_up_notes?: string | null;

  // Recording info
  recorded_by: string;
  shift?: ShiftType | null;

  // Flags
  is_critical: boolean;
  requires_doctor_review: boolean;
  doctor_reviewed_by?: string | null;
  doctor_reviewed_at?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined relations
  patient?: {
    patient_id: string;
    first_name: string;
    surname: string;
    file_number?: string;
    date_of_birth?: string;
    gender?: string;
  } | null;

  recorder?: {
    staff_id: string;
    first_name: string;
    last_name: string;
  } | null;

  encounter?: {
    visit_id: string;
    encounter_number?: string;
    visit_type?: string;
    current_stage?: string;
  } | null;

  treatment_plan?: {
    plan_id: string;
    title: string;
    status: string;
  } | null;
}

/**
 * DTO for creating a new nursing note
 */
export interface CreateNursingNoteDTO {
  encounter_id: string;
  patient_id: string;
  consultation_id?: string;
  treatment_plan_id?: string;
  treatment_task_id?: string;

  note_type: NursingNoteType;
  title?: string;
  content: string;

  patient_condition?: PatientCondition;
  pain_level?: number;

  interventions_performed?: string;
  selected_interventions?: string[]; // Array of intervention codes
  patient_response?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;

  shift?: ShiftType;

  is_critical?: boolean;
  requires_doctor_review?: boolean;
}

/**
 * DTO for updating a nursing note
 */
export interface UpdateNursingNoteDTO {
  id: string;

  note_type?: NursingNoteType;
  title?: string;
  content?: string;

  patient_condition?: PatientCondition;
  pain_level?: number;

  interventions_performed?: string;
  patient_response?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;

  is_critical?: boolean;
  requires_doctor_review?: boolean;
}

/**
 * Filters for querying nursing notes
 */
export interface NursingNoteFilters {
  encounter_id?: string;
  patient_id?: string;
  treatment_plan_id?: string;
  recorded_by?: string;
  note_type?: NursingNoteType;
  patient_condition?: PatientCondition;
  shift?: ShiftType;
  is_critical?: boolean;
  requires_doctor_review?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response for nursing notes
 */
export interface NursingNotesResponse {
  data: NursingNoteDTO[];
  total: number;
  page: number;
  totalPages: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get color class for note type badge
 */
export function getNoteTypeColor(type: NursingNoteType): string {
  const colors: Record<NursingNoteType, string> = {
    Progress_Note: 'bg-blue-100 text-blue-700',
    Observation: 'bg-purple-100 text-purple-700',
    Incident: 'bg-red-100 text-red-700',
    Handoff: 'bg-orange-100 text-orange-700',
    Assessment: 'bg-green-100 text-green-700',
    Medication_Note: 'bg-pink-100 text-pink-700',
    Procedure_Note: 'bg-indigo-100 text-indigo-700',
    Patient_Response: 'bg-teal-100 text-teal-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

/**
 * Get display label for note type
 */
export function getNoteTypeLabel(type: NursingNoteType): string {
  const labels: Record<NursingNoteType, string> = {
    Progress_Note: 'Progress Note',
    Observation: 'Observation',
    Incident: 'Incident Report',
    Handoff: 'Shift Handoff',
    Assessment: 'Assessment',
    Medication_Note: 'Medication Note',
    Procedure_Note: 'Procedure Note',
    Patient_Response: 'Patient Response',
  };
  return labels[type] || type;
}

/**
 * Get color class for patient condition badge
 */
export function getConditionColor(condition: PatientCondition): string {
  const colors: Record<PatientCondition, string> = {
    Stable: 'bg-green-100 text-green-700',
    Improving: 'bg-blue-100 text-blue-700',
    Deteriorating: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
    Unchanged: 'bg-gray-100 text-gray-700',
  };
  return colors[condition] || 'bg-gray-100 text-gray-700';
}

/**
 * Get shift icon/label
 */
export function getShiftLabel(shift: ShiftType): string {
  const labels: Record<ShiftType, string> = {
    Morning: '🌅 Morning (6am-2pm)',
    Afternoon: '☀️ Afternoon (2pm-10pm)',
    Night: '🌙 Night (10pm-6am)',
  };
  return labels[shift] || shift;
}

/**
 * Determine current shift based on time
 */
export function getCurrentShift(): ShiftType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'Morning';
  if (hour >= 14 && hour < 22) return 'Afternoon';
  return 'Night';
}

/**
 * Format note for display
 */
export function formatNursingNote(note: NursingNoteDTO): string {
  const parts: string[] = [];

  if (note.title) {
    parts.push(note.title);
  }

  if (note.patient_condition) {
    parts.push(`Condition: ${note.patient_condition}`);
  }

  if (note.pain_level !== null && note.pain_level !== undefined) {
    parts.push(`Pain: ${note.pain_level}/10`);
  }

  return parts.join(' | ') || note.note_type.replace('_', ' ');
}
