import {
  Queue,
  QueueLocation,
  Patient,
  Staff,
} from '../../../types/database.types';

// =============================================================================
// Enums - Updated to match EMR Workflow Reference
// =============================================================================

export const QUEUE_STATUS = [
  'Waiting',
  'Ready_For_Consultation',
  'In Progress',
  'Completed',
  'Skipped',
  'Cancelled',
  // Legacy status mappings for backward compatibility
  'Called',
  'In_Consultation',
  'No Show',
] as const;

export type QueueStatus = (typeof QUEUE_STATUS)[number];

// New status values from workflow reference
export const NEW_QUEUE_STATUS = [
  'Waiting',
  'Ready_For_Consultation',
  'In Progress',
  'Completed',
  'Skipped',
  'Cancelled',
] as const;

export type NewQueueStatus = (typeof NEW_QUEUE_STATUS)[number];

export const DEPARTMENTS = [
  'Reception',
  'Nursing',
  'Consultation',
  'Laboratory',
  'Radiology',
  'Pharmacy',
  'Billing',
  // Specialty Clinical Departments
  'Dental',
  'Ophthalmology',
  'Physiotherapy',
  'Nutrition',
  'Neuropsychiatry',
  // Emergency Departments
  'Emergency',
  'Triage',
  'Resuscitation',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const PRIORITY_LEVELS = ['Emergency', 'Urgent', 'Normal'] as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

// =============================================================================
// DTOs - Enhanced with time tracking and priority
// =============================================================================

export interface QueueDTO {
  id: string;
  visit_id: string;
  patient_id: string;
  department_id?: string;
  clinic_id?: string;

  ticket_number: string;
  status: QueueStatus;
  priority: PriorityLevel;
  location: Department;

  assigned_to?: string;
  called_at?: string;
  started_at?: string;
  completed_at?: string;

  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  patient?: Patient;
  assigned_staff?: Staff;
  lab_requests?: QueueLabRequestDTO[];
  encounter?: {
    id: string;
    encounter_number?: string;
    visit_type?: string;
    status?: string;
  };
}

export interface QueueLabRequestDTO {
  request_id: string;
  visit_id: string | null;
  test_id: string;
  status: string;
  priority: PriorityLevel;
  clinical_notes?: string | null;
  test?: {
    id: string;
    name: string;
    code?: string | null;
    category?: string | null;
    price?: number | null;
    specimen_type?: string | null;
  };
}

export interface CreateQueueDTO {
  patient_id: string;
  encounter_id?: string;
  clinic_id?: string;
  department: Department;
  priority?: PriorityLevel;
  notes?: string;
}

export interface UpdateQueueDTO {
  id: string;
  status?: QueueStatus;
  department?: Department;
  priority?: PriorityLevel;
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  skip_reason?: string;
}

export interface CallPatientDTO {
  id: string;
  called_by: string;
}

export interface SkipPatientDTO {
  id: string;
  reason: string;
  skipped_by: string;
}

export interface RequeuePatientDTO {
  id: string;
  priority?: PriorityLevel;
  requeued_by: string;
}

export interface QueueFilters {
  department?: Department;
  clinic_id?: string;
  status?: QueueStatus;
  date?: string;
  priority?: PriorityLevel;
}

export interface QueueStats {
  waiting: number;
  ready_for_consultation: number;
  in_progress: number;
  completed_today: number;
  skipped: number;
  average_wait_time: string;
  emergency_waiting: number;
  urgent_waiting: number;
  normal_waiting: number;
  longest_wait: string;
  no_shows: number;
}

export interface DepartmentQueue {
  department: Department;
  waiting: number;
  in_progress: number;
  current_number: string | null;
}

// =============================================================================
// Department Mapping Helpers
// =============================================================================

export const DEPARTMENT_TO_DB_LOCATION: Record<Department, QueueLocation> = {
  Reception: 'Registration',
  Nursing: 'Nursing',
  Consultation: 'Consultation',
  Laboratory: 'Lab',
  Radiology: 'Radiology',
  Pharmacy: 'Pharmacy',
  Billing: 'Billing',
  // Specialty Clinical Departments
  Dental: 'Dental',
  Ophthalmology: 'Ophthalmology',
  Physiotherapy: 'Physiotherapy',
  Nutrition: 'Nutrition',
  Neuropsychiatry: 'Neuropsychiatry',
  // Emergency Departments
  Emergency: 'Emergency',
  Triage: 'Triage',
  Resuscitation: 'Resuscitation',
};

const DB_LOCATION_TO_DEPARTMENT: Record<string, Department> = {
  Reception: 'Reception',
  Registration: 'Reception',
  Nursing: 'Nursing',
  Consultation: 'Consultation',
  Lab: 'Laboratory',
  Laboratory: 'Laboratory',
  Radiology: 'Radiology',
  Pharmacy: 'Pharmacy',
  Billing: 'Billing',
  Cashier: 'Billing',
  CustomerService: 'Reception',
  // Specialty Clinical Departments
  Dental: 'Dental',
  Ophthalmology: 'Ophthalmology',
  Physiotherapy: 'Physiotherapy',
  Nutrition: 'Nutrition',
  Neuropsychiatry: 'Neuropsychiatry',
  // Emergency Departments
  Emergency: 'Emergency',
  Triage: 'Triage',
  Resuscitation: 'Resuscitation',
};

export function toDbQueueLocation(department: Department): QueueLocation {
  return DEPARTMENT_TO_DB_LOCATION[department] ?? 'Registration';
}

export function fromDbQueueLocation(
  location: QueueLocation | string,
): Department {
  const key = location as QueueLocation;
  return DB_LOCATION_TO_DEPARTMENT[key] ?? (location as Department);
}

// =============================================================================
// Helpers - Updated for new status values
// =============================================================================

export function getQueueStatusColor(
  status: QueueStatus,
): 'warning' | 'info' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'Waiting':
      return 'warning';
    case 'Ready_For_Consultation':
    case 'Called':
      return 'info';
    case 'In_Consultation':
    case 'In Progress':
      return 'info';
    case 'Completed':
      return 'success';
    case 'Skipped':
    case 'No Show':
      return 'error';
    case 'Cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export function getQueueStatusLabel(status: QueueStatus): string {
  switch (status) {
    case 'Waiting':
      return 'Waiting';
    case 'Ready_For_Consultation':
      return 'Ready for Consultation';
    case 'In_Consultation':
      return 'In Consultation';
    case 'Completed':
      return 'Completed';
    case 'Skipped':
      return 'Skipped';
    case 'Cancelled':
      return 'Cancelled';
    // Legacy mappings
    case 'Called':
      return 'Called';
    case 'In Progress':
      return 'In Progress';
    case 'No Show':
      return 'No Show';
    default:
      return status;
  }
}

export function getPriorityColor(priority: PriorityLevel): string {
  switch (priority) {
    case 'Emergency':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Urgent':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Normal':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

export function getPriorityIcon(priority: PriorityLevel): string {
  switch (priority) {
    case 'Emergency':
      return '🔴';
    case 'Urgent':
      return '🟠';
    case 'Normal':
    default:
      return '🟢';
  }
}

export function getPrioritySortOrder(priority: PriorityLevel): number {
  switch (priority) {
    case 'Emergency':
      return 1;
    case 'Urgent':
      return 2;
    case 'Normal':
    default:
      return 3;
  }
}

export function getDepartmentColor(department: Department): string {
  switch (department) {
    case 'Reception':
      return 'bg-blue-500';
    case 'Nursing':
      return 'bg-pink-500';
    case 'Consultation':
      return 'bg-green-500';
    case 'Laboratory':
      return 'bg-purple-500';
    case 'Radiology':
      return 'bg-orange-500';
    case 'Pharmacy':
      return 'bg-indigo-500';
    case 'Billing':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}

export function formatWaitTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

export function formatQueueNumber(
  num: string | number | undefined | null,
): string {
  if (!num) return '---';
  return num.toString().padStart(3, '0');
}
