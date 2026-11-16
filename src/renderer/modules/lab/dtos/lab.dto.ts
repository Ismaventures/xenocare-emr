import {
  LabRequest,
  LabTestCatalogue,
  LabResult,
  LabResultComponent,
  Patient,
  Staff,
} from '../../../types/database.types';

// =============================================================================
// Enums - Updated to match EMR Workflow Reference
// =============================================================================

// Complete Lab Request Status from workflow reference
export const LAB_REQUEST_STATUS = [
  'Pending', // Initial state when doctor orders
  'Accepted', // Lab accepts the request
  'Rejected', // Lab rejects (e.g., invalid test, no capacity)
  'Awaiting_Payment', // Waiting for payment
  'Paid', // Payment received
  'Waived', // Payment waived (NHIS/DHML)
  'Sample_Collected', // Specimen obtained
  'Processing', // Lab running tests
  'Result_Ready', // Results entered
  'Result_Viewed', // Doctor has reviewed
  'Cancelled', // Request cancelled
  // Legacy status for backward compatibility
  'Sample Collected',
  'In Progress',
  'Completed',
] as const;

export type LabRequestStatus = (typeof LAB_REQUEST_STATUS)[number];

// New workflow status (for new features)
export const LAB_WORKFLOW_STATUS = [
  'Pending',
  'Accepted',
  'Rejected',
  'Awaiting_Payment',
  'Paid',
  'Waived',
  'Sample_Collected',
  'Processing',
  'Result_Ready',
  'Result_Viewed',
  'Cancelled',
] as const;

export type LabWorkflowStatus = (typeof LAB_WORKFLOW_STATUS)[number];

// Standard EMR Lab Categories
export const LAB_CATEGORIES = [
  'Hematology',
  'Chemical Pathology',
  'Microbiology',
  'Serology',
] as const;

export type LabCategory = (typeof LAB_CATEGORIES)[number];

// Sample types for lab tests
export const SAMPLE_TYPES = ['Blood', 'Stool', 'Urine', 'Semen'] as const;

export type SampleType = (typeof SAMPLE_TYPES)[number];

// Result status indicators
export const RESULT_STATUS = ['Normal', 'Abnormal', 'Critical'] as const;

export type ResultStatus = (typeof RESULT_STATUS)[number];

// Standard lab tests by category
export const STANDARD_LAB_TESTS = {
  Hematology: ['Full Blood Count (FBC)', 'ESR', 'Blood Group & Genotype'],
  'Chemical Pathology': [
    'Fasting Blood Sugar',
    'Liver Function Test',
    'Urea & Electrolytes',
    'Lipid Profile',
  ],
  Microbiology: ['Urinalysis', 'Stool M/C/S', 'Blood Culture'],
  Serology: ['HIV', 'HBsAg', 'HCV', 'VDRL'],
} as const;

// =============================================================================
// DTOs
// =============================================================================

// Main Lab Request DTO (LAB_REQUEST equivalent)
export interface LabRequestDTO extends Omit<LabRequest, 'status'> {
  patient?: Patient;
  doctor?: Staff; // ordered_by / requested_by
  technician?: Staff; // processed_by
  test?: LabTestCatalogue;
  // Override status to use our extended type
  status: LabRequestStatus;
  // Clinical context - diagnosis/indication from doctor
  diagnosis?: string[]; // ICD-10 codes/diagnoses - WHY this test was ordered
  // New relation to results
  lab_result?: LabResultDTO;
  // Encounter relation for tracking
  encounter?: {
    id: string;
    visit_id: string;
    encounter_number: string | null;
    encounter_date: string | null;
    status: string;
    clinic_name?: string | null;
    clinic_id?: string | null;
  };
}

// Lab Test DTO (LAB_TEST equivalent)
export interface LabTestDTO extends LabTestCatalogue {
  // Alias properties for field mapping
  lab_test_id?: string; // Maps to test_id
  cost?: number; // Maps to price
  nhis_covered?: boolean; // Maps to nhis_eligible
}

// Lab Result DTO (LAB_RESULT equivalent)
export interface LabResultDTO extends LabResult {
  uploader?: Staff; // uploaded_by relation
  verifier?: Staff; // verified_by relation
  components?: LabResultComponentDTO[];
  request?: LabRequestDTO;
  // Enhanced fields from lab_results table
  structured_result?: Record<string, unknown>; // JSONB template data
  result_template_type?: string; // Template used (numeric_table, culture_sensitivity, etc.)
  workflow_status?: string; // Pending, Verified, Approved, Released
  collected_at?: string; // Sample collection timestamp
  reported_at?: string; // Result reported timestamp
  approved_by?: string; // Approving consultant UUID
  approved_at?: string; // Approval timestamp
  version?: number; // Version for audit trail
  // Mapped legacy fields
  result?: string; // Maps from result_value
  result_unit?: string; // Maps from unit
  remarks?: string; // Maps from comments
  is_abnormal?: boolean;
  is_critical?: boolean;
}

// Lab Result Component DTO
export interface LabResultComponentDTO extends LabResultComponent {}

// Create Lab Result DTO
export interface CreateLabResultDTO {
  lab_request_id: string;
  result: string;
  result_value?: number;
  result_unit?: string;
  result_status?: ResultStatus;
  reference_range?: string;
  remarks?: string;
  interpretation?: string;
  methodology?: string;
  attachment_url?: string;
}

// Update Lab Result DTO
export interface UpdateLabResultDTO {
  lab_result_id: string;
  result?: string;
  result_value?: number;
  result_status?: ResultStatus;
  remarks?: string;
  interpretation?: string;
}

// Create Lab Result Component DTO
export interface CreateLabResultComponentDTO {
  lab_result_id: string;
  component_name: string;
  component_code?: string;
  result_value?: number;
  result_text?: string;
  result_unit?: string;
  reference_range?: string;
  result_status?: ResultStatus;
  sequence_number?: number;
}

export interface UpdateLabRequestDTO {
  request_id: string;
  status?: LabRequestStatus;
  result?: string; // Legacy - use CreateLabResultDTO
  result_value?: number;
  result_unit?: string;
  result_status?: ResultStatus;
  reference_range?: string;
  interpretation?: string;
  methodology?: string;
  normal_range?: string;
  result_notes?: string; // Notes about the result
  sample_collected_at?: string;
  result_date?: string;
  specimen_type?: string;
  specimen_identifier?: string;
}

export interface LabRequestFilters {
  page?: number;
  limit?: number;
  status?: LabRequestStatus;
  patient_id?: string;
  test_id?: string;
  doctor_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  category?: LabCategory;
  sample_type?: SampleType;
  /**
   * If true, include requests with nhis_approval_status = 'pending'.
   * Default is false - pending NHIS requests are hidden from the Lab queue
   * until they are approved by the NHIS desk.
   */
  includeNhisPending?: boolean;
}

export interface LabStats {
  pending: number;
  accepted: number;
  awaiting_payment: number;
  sample_collected: number;
  processing: number;
  result_ready: number;
  completed_today: number;
  rejected_today: number;
  average_turnaround: string;
}

// =============================================================================
// Helpers - Updated for new workflow states
// =============================================================================

export function getLabStatusColor(
  status: LabRequestStatus,
): 'warning' | 'info' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'Accepted':
      return 'info';
    case 'Rejected':
      return 'error';
    case 'Awaiting_Payment':
      return 'warning';
    case 'Paid':
    case 'Waived':
      return 'info';
    case 'Sample_Collected':
    case 'Sample Collected':
      return 'info';
    case 'Processing':
    case 'In Progress':
      return 'info';
    case 'Result_Ready':
    case 'Completed':
      return 'success';
    case 'Result_Viewed':
      return 'success';
    case 'Cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export function getLabCategoryColor(category: LabCategory | string): string {
  switch (category) {
    case 'Hematology':
      return 'bg-red-100 text-red-800';
    case 'Chemical Pathology':
      return 'bg-blue-100 text-blue-800';
    case 'Microbiology':
      return 'bg-green-100 text-green-800';
    case 'Serology':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getSampleTypeColor(sampleType: SampleType | string): string {
  switch (sampleType) {
    case 'Blood':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Urine':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Stool':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Semen':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getResultStatusColor(status: ResultStatus | string): string {
  switch (status) {
    case 'Normal':
      return 'text-green-600 bg-green-50';
    case 'Abnormal':
      return 'text-orange-600 bg-orange-50';
    case 'Critical':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function formatLabResult(
  result: string | null,
  normalRange: string | null,
): {
  result: string;
  isNormal: boolean | null;
} {
  if (!result) return { result: 'Pending', isNormal: null };

  // For now, just return the result - in a real app, we'd parse and compare
  return { result, isNormal: null };
}

// =============================================================================
// Validation
// =============================================================================

export interface LabResultFormErrors {
  result?: string;
  notes?: string;
}

export function validateLabResultForm(
  result: string,
  status: LabRequestStatus,
): LabResultFormErrors {
  const errors: LabResultFormErrors = {};

  if (status === 'Completed' && !result.trim()) {
    errors.result = 'Result is required when marking as completed';
  }

  return errors;
}
