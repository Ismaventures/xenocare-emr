/**
 * Treatment Plan Types and DTOs
 *
 * Treatment plans bridge doctor orders to nursing execution.
 * Based on EMR Workflow Reference document.
 */

// =============================================================================
// Enums
// =============================================================================

export const TREATMENT_PLAN_STATUS = [
  'Created',
  'Viewed',
  'In_Progress',
  'Completed',
  'Cancelled',
] as const;

export type TreatmentPlanStatus = (typeof TREATMENT_PLAN_STATUS)[number];

export const TREATMENT_TASK_STATUS = [
  'Pending',
  'In_Progress',
  'Completed',
  'Skipped',
  'Escalated',
] as const;

export type TreatmentTaskStatus = (typeof TREATMENT_TASK_STATUS)[number];

export const TREATMENT_TASK_TYPES = [
  'Administer_Medication',
  'Monitor_Vitals',
  'Procedure',
  'Observation',
  'Patient_Education',
  'Wound_Care',
  'Sample_Collection',
  'Other',
] as const;

export type TreatmentTaskType = (typeof TREATMENT_TASK_TYPES)[number];

// =============================================================================
// DTOs
// =============================================================================

export interface TreatmentPlanDTO {
  plan_id: string;
  encounter_id: string;
  patient_id: string;
  consultation_id?: string;

  // Plan details
  title: string;
  description?: string;
  instructions?: string;

  // Status
  status: TreatmentPlanStatus;

  // Doctor who created
  created_by: string;
  created_at: string;

  // Nurse who first viewed
  viewed_by?: string;
  viewed_at?: string;

  // Completion
  completed_by?: string;
  completed_at?: string;
  completion_notes?: string;

  updated_at: string;

  // Relations
  tasks?: TreatmentTaskDTO[];
  patient?: {
    patient_id: string;
    first_name: string;
    surname: string;
    file_number: string;
  };
  creator?: {
    staff_id: string;
    first_name: string;
    last_name: string;
  };
}

export interface TreatmentTaskDTO {
  task_id: string;
  plan_id: string;
  encounter_id: string;
  patient_id: string;

  // Task details
  task_type: TreatmentTaskType;
  title: string;
  description?: string;
  instructions?: string;

  // Scheduling
  scheduled_time?: string;
  due_time?: string;
  frequency?: string;

  // For medication tasks
  medication_name?: string;
  dosage?: string;
  route?: string;

  // Status
  status: TreatmentTaskStatus;
  priority: 'Emergency' | 'Urgent' | 'Normal';

  // Execution tracking
  started_at?: string;
  started_by?: string;
  completed_at?: string;
  completed_by?: string;

  // Documentation
  execution_notes?: string;
  patient_response?: string;
  escalation_reason?: string;
  escalated_to?: string;

  // Ordering
  sequence_order: number;

  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTreatmentPlanDTO {
  encounter_id: string;
  patient_id: string;
  consultation_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  tasks?: CreateTreatmentTaskDTO[];
}

export interface CreateTreatmentTaskDTO {
  task_type: TreatmentTaskType;
  title: string;
  description?: string;
  instructions?: string;
  scheduled_time?: string;
  due_time?: string;
  frequency?: string;
  medication_name?: string;
  dosage?: string;
  route?: string;
  priority?: 'Emergency' | 'Urgent' | 'Normal';
  sequence_order?: number;
}

export interface UpdateTreatmentPlanDTO {
  plan_id: string;
  title?: string;
  description?: string;
  instructions?: string;
  status?: TreatmentPlanStatus;
  completion_notes?: string;
}

export interface UpdateTreatmentTaskDTO {
  task_id: string;
  status?: TreatmentTaskStatus;
  execution_notes?: string;
  patient_response?: string;
  escalation_reason?: string;
  escalated_to?: string;
}

export interface ExecuteTaskDTO {
  task_id: string;
  execution_notes: string;
  patient_response?: string;
}

export interface EscalateTaskDTO {
  task_id: string;
  reason: string;
  escalate_to: string;
}

// =============================================================================
// Helpers
// =============================================================================

export function getTreatmentPlanStatusColor(
  status: TreatmentPlanStatus,
): string {
  switch (status) {
    case 'Created':
      return 'bg-blue-100 text-blue-800';
    case 'Viewed':
      return 'bg-yellow-100 text-yellow-800';
    case 'In_Progress':
      return 'bg-orange-100 text-orange-800';
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTreatmentPlanStatusLabel(
  status: TreatmentPlanStatus,
): string {
  switch (status) {
    case 'Created':
      return 'Created';
    case 'Viewed':
      return 'Viewed by Nurse';
    case 'In_Progress':
      return 'In Progress';
    case 'Completed':
      return 'Completed';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function getTaskStatusColor(status: TreatmentTaskStatus): string {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'In_Progress':
      return 'bg-blue-100 text-blue-800';
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Skipped':
      return 'bg-gray-100 text-gray-800';
    case 'Escalated':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTaskStatusLabel(status: TreatmentTaskStatus): string {
  switch (status) {
    case 'Pending':
      return 'Pending';
    case 'In_Progress':
      return 'In Progress';
    case 'Completed':
      return 'Completed';
    case 'Skipped':
      return 'Skipped';
    case 'Escalated':
      return 'Escalated';
    default:
      return status;
  }
}

export function getTaskTypeLabel(type: TreatmentTaskType): string {
  switch (type) {
    case 'Administer_Medication':
      return 'Administer Medication';
    case 'Monitor_Vitals':
      return 'Monitor Vitals';
    case 'Procedure':
      return 'Procedure';
    case 'Observation':
      return 'Observation';
    case 'Patient_Education':
      return 'Patient Education';
    case 'Wound_Care':
      return 'Wound Care';
    case 'Sample_Collection':
      return 'Sample Collection';
    case 'Other':
      return 'Other';
    default:
      return type;
  }
}

export function getTaskTypeIcon(type: TreatmentTaskType): string {
  switch (type) {
    case 'Administer_Medication':
      return '💊';
    case 'Monitor_Vitals':
      return '📊';
    case 'Procedure':
      return '🩺';
    case 'Observation':
      return '👁️';
    case 'Patient_Education':
      return '📚';
    case 'Wound_Care':
      return '🩹';
    case 'Sample_Collection':
      return '🧪';
    case 'Other':
      return '📋';
    default:
      return '📋';
  }
}

export function calculatePlanProgress(tasks: TreatmentTaskDTO[]): number {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  return Math.round((completed / tasks.length) * 100);
}
