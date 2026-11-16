/**
 * Clinical Requests DTOs
 * =====================
 * Data Transfer Objects for the Clinical Requests system.
 * Handles: Admission Requests, Procedure/Surgery Requests, Follow-ups, Referrals, Discharges
 */

// ==========================================
// ENUMS
// ==========================================

export type ClinicalRequestType =
  | 'Follow-Up'
  | 'Procedure'
  | 'Surgery'
  | 'Admission'
  | 'Referral'
  | 'Transfer'
  | 'Discharge';

export type ClinicalRequestStatus =
  | 'Pending'
  | 'Under_Review'
  | 'Approved'
  | 'Rejected'
  | 'Scheduled'
  | 'In_Progress'
  | 'Completed'
  | 'Cancelled';

export type ClinicalUrgency = 'Routine' | 'Urgent' | 'Emergency';

export type AdmissionType = 'Emergency' | 'Elective';

export type LevelOfCare = 'Ward' | 'ICU' | 'HDU' | 'NICU';

export type OPDClassification = 'MOPD' | 'SOPD';

export type PatientStatus = 'OPD' | 'In-Patient' | 'Discharged' | 'Deceased';

// ==========================================
// BASE DTO (Read)
// ==========================================

export interface ClinicalRequestDTO {
  id: string;
  request_number: string;

  // Patient & Encounter
  patient_id: string;
  encounter_id: string;

  // Requesting Info
  requesting_doctor_id: string;
  requesting_department_id?: string;

  // Request Details
  request_type: ClinicalRequestType;
  clinical_reason: string;
  urgency: ClinicalUrgency;
  suggested_timeframe?: string;
  notes?: string;

  // Target
  target_department_id?: string;
  target_ward_id?: string;
  target_doctor_id?: string;

  // Admission-specific
  admission_type?: AdmissionType;
  suggested_ward_type?: string;
  level_of_care?: LevelOfCare;
  expected_duration?: string;
  special_requirements?: string;

  // Procedure/Surgery-specific
  procedure_catalogue_id?: string;
  procedure_name?: string;
  procedure_notes?: string;
  pre_op_requirements?: string;

  // Follow-up specific
  follow_up_reason?: string;
  follow_up_instructions?: string;

  // Status & Approval
  status: ClinicalRequestStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;

  // Execution Links
  admission_id?: string;
  procedure_id?: string;
  referral_id?: string;
  follow_up_visit_id?: string;

  // Scheduling
  scheduled_date?: string;
  scheduled_time?: string;
  scheduled_by?: string;
  scheduling_notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  facility_id?: string;
}

// ==========================================
// EXTENDED DTO (with Joins)
// ==========================================

export interface ClinicalRequestWithDetailsDTO extends ClinicalRequestDTO {
  // Patient Info
  patient_name?: string;
  patient_public_id?: string; // VARCHAR patient_id for specialty module FK (eye_exams, dental_exams, etc.)
  emr_number?: string;
  patient_gender?: string;
  patient_dob?: string;
  patient_phone?: string;
  patient_category?: string;
  insurance_type?: string;

  // Requesting Doctor
  requesting_doctor_name?: string;
  requesting_department_name?: string;

  // Target Info
  target_department_name?: string;
  target_ward_name?: string;
  target_ward_type?: string;
  target_doctor_name?: string;
  available_beds?: number;

  // Encounter Info
  encounter_number?: string;

  // Procedure Catalogue Info
  procedure_code?: string;
  procedure_category?: string;

  // Billing Info
  billing_status?: string;
}

// ==========================================
// CREATE DTOs
// ==========================================

export interface CreateClinicalRequestDTO {
  patient_id: string;
  encounter_id: string;
  requesting_doctor_id: string;
  requesting_department_id?: string;
  request_type: ClinicalRequestType;
  clinical_reason: string;
  urgency?: ClinicalUrgency;
  suggested_timeframe?: string;
  notes?: string;
  target_department_id?: string;
  target_ward_id?: string;
  target_doctor_id?: string;
  facility_id?: string;
  created_by?: string;
  // Specialty module for internal referrals — maps to specialty consultation templates & queue routing
  specialty_module?: string;
  // Source clinic ID - tracks which clinic the referral originated from
  source_clinic_id?: string;
  // Procedure-specific fields (for Procedure/Surgery requests)
  procedure_catalogue_id?: string;
  procedure_name?: string;
  procedure_notes?: string;
  pre_op_requirements?: string;
  // Admission-specific fields
  admission_type?: AdmissionType;
  expected_duration?: string;
  special_requirements?: string;
}

export interface CreateAdmissionRequestDTO extends CreateClinicalRequestDTO {
  request_type: 'Admission';
  admission_type: AdmissionType;
  suggested_ward_type?: string;
  level_of_care?: LevelOfCare;
  expected_duration?: string;
  special_requirements?: string;
}

export interface CreateProcedureRequestDTO extends CreateClinicalRequestDTO {
  request_type: 'Procedure' | 'Surgery';
  procedure_catalogue_id?: string;
  procedure_name: string;
  procedure_notes?: string;
  pre_op_requirements?: string;
}

export interface CreateFollowUpRequestDTO extends CreateClinicalRequestDTO {
  request_type: 'Follow-Up';
  follow_up_reason: string;
  follow_up_instructions?: string;
}

export interface CreateReferralRequestDTO extends CreateClinicalRequestDTO {
  request_type: 'Referral';
  target_department_id: string;
  target_doctor_id?: string;
}

export interface CreateTransferRequestDTO extends CreateClinicalRequestDTO {
  request_type: 'Transfer';
  target_ward_id: string;
  level_of_care?: LevelOfCare;
}

export interface CreateDischargeRequestDTO extends CreateClinicalRequestDTO {
  request_type: 'Discharge';
}

// ==========================================
// UPDATE DTOs
// ==========================================

export interface UpdateClinicalRequestDTO {
  clinical_reason?: string;
  urgency?: ClinicalUrgency;
  suggested_timeframe?: string;
  notes?: string;
  target_department_id?: string;
  target_ward_id?: string;
  target_doctor_id?: string;

  // Admission-specific
  admission_type?: AdmissionType;
  suggested_ward_type?: string;
  level_of_care?: LevelOfCare;
  expected_duration?: string;
  special_requirements?: string;

  // Procedure-specific
  procedure_catalogue_id?: string;
  procedure_name?: string;
  procedure_notes?: string;
  pre_op_requirements?: string;

  // Follow-up specific
  follow_up_reason?: string;
  follow_up_instructions?: string;
}

// ==========================================
// STATUS UPDATE DTOs
// ==========================================

export interface UpdateStatusDTO {
  status: ClinicalRequestStatus;
  reviewed_by: string;
  review_notes?: string;
}

export interface ApproveRequestDTO {
  approved_by: string;
  review_notes?: string;
}

export interface RejectRequestDTO {
  reviewed_by: string;
  rejection_reason: string;
}

export interface ScheduleRequestDTO {
  scheduled_date: string;
  scheduled_time?: string;
  scheduled_by: string;
  scheduling_notes?: string;
  target_ward_id?: string; // For admission - which ward
}

export interface CompleteRequestDTO {
  reviewed_by: string;
  review_notes?: string;
  // Link to the created entity
  admission_id?: string;
  procedure_id?: string;
  referral_id?: string;
  follow_up_visit_id?: string;
}

// ==========================================
// FILTER DTOs
// ==========================================

export interface ClinicalRequestFiltersDTO {
  status?: ClinicalRequestStatus | ClinicalRequestStatus[];
  request_type?: ClinicalRequestType | ClinicalRequestType[];
  urgency?: ClinicalUrgency | ClinicalUrgency[];
  patient_id?: string;
  encounter_id?: string;
  requesting_doctor_id?: string;
  requesting_department_id?: string;
  target_department_id?: string;
  target_ward_id?: string;
  date_from?: string;
  date_to?: string;
  scheduled_date?: string;
  search?: string;
  specialty_module?: string;
}

// ==========================================
// STATUS HISTORY DTO
// ==========================================

export interface ClinicalRequestStatusHistoryDTO {
  id: string;
  request_id: string;
  from_status?: ClinicalRequestStatus;
  to_status: ClinicalRequestStatus;
  changed_by?: string;
  change_reason?: string;
  changed_at: string;

  // With joins
  changed_by_name?: string;
}

// ==========================================
// STATISTICS DTOs
// ==========================================

export interface ClinicalRequestStatsDTO {
  request_type: ClinicalRequestType;
  status: ClinicalRequestStatus;
  urgency: ClinicalUrgency;
  count: number;
  request_date: string;
}

export interface RequestSummaryDTO {
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  scheduled: number;
  in_progress: number;
  completed: number;
  rejected: number;
  cancelled: number;
  by_type: {
    [key in ClinicalRequestType]?: number;
  };
  by_urgency: {
    [key in ClinicalUrgency]?: number;
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export const isAdmissionRequest = (request: ClinicalRequestDTO): boolean =>
  request.request_type === 'Admission';

export const isProcedureRequest = (request: ClinicalRequestDTO): boolean =>
  request.request_type === 'Procedure' || request.request_type === 'Surgery';

export const isFollowUpRequest = (request: ClinicalRequestDTO): boolean =>
  request.request_type === 'Follow-Up';

export const isUrgent = (request: ClinicalRequestDTO): boolean =>
  request.urgency === 'Urgent' || request.urgency === 'Emergency';

export const isPending = (request: ClinicalRequestDTO): boolean =>
  request.status === 'Pending' || request.status === 'Under_Review';

export const canApprove = (request: ClinicalRequestDTO): boolean =>
  request.status === 'Pending' || request.status === 'Under_Review';

export const canSchedule = (request: ClinicalRequestDTO): boolean =>
  request.status === 'Approved';

export const canComplete = (request: ClinicalRequestDTO): boolean =>
  request.status === 'Approved' ||
  request.status === 'Scheduled' ||
  request.status === 'In_Progress';

export const canCancel = (request: ClinicalRequestDTO): boolean =>
  request.status !== 'Completed' && request.status !== 'Cancelled';

// Request Type Labels
export const REQUEST_TYPE_LABELS: Record<ClinicalRequestType, string> = {
  'Follow-Up': 'Follow-Up Appointment',
  Procedure: 'Procedure',
  Surgery: 'Surgery',
  Admission: 'Admission',
  Referral: 'Referral',
  Transfer: 'Transfer',
  Discharge: 'Discharge',
};

// Status Labels with Colors
export const REQUEST_STATUS_CONFIG: Record<
  ClinicalRequestStatus,
  { label: string; color: string; bgColor: string }
> = {
  Pending: {
    label: 'Pending',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  Under_Review: {
    label: 'Under Review',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  Approved: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  Rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  Scheduled: {
    label: 'Scheduled',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  In_Progress: {
    label: 'In Progress',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  Completed: {
    label: 'Completed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  },
};

// Urgency Labels with Colors
export const URGENCY_CONFIG: Record<
  ClinicalUrgency,
  { label: string; color: string; bgColor: string }
> = {
  Routine: { label: 'Routine', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  Urgent: {
    label: 'Urgent',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  Emergency: {
    label: 'Emergency',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

// Level of Care Labels
export const LEVEL_OF_CARE_LABELS: Record<LevelOfCare, string> = {
  Ward: 'General Ward',
  ICU: 'Intensive Care Unit',
  HDU: 'High Dependency Unit',
  NICU: 'Neonatal ICU',
};
