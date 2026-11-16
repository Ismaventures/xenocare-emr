import {
  Consultation,
  RequestStatus,
  Priority,
  Patient,
  Staff,
} from '../../../types';

// =============================================================================
// Consultation Workflow States (from EMR Workflow Reference)
// =============================================================================

export const CONSULTATION_STATES = [
  'Patient_Called',
  'Complaints_Entered',
  'Clinical_Notes_Entered',
  'Diagnosis_Confirmed',
  'Treatment_Plan_Created',
  'Orders_Placed',
  'Completed',
] as const;

export type ConsultationState = (typeof CONSULTATION_STATES)[number];

// Visibility rules - what each role can see
export const CONSULTATION_VISIBILITY: Record<string, string[]> = {
  complaints: ['doctor', 'medical_director', 'super_admin', 'admin'],
  clinical_notes: ['doctor', 'medical_director', 'super_admin', 'admin'],
  diagnosis: ['doctor', 'medical_director', 'super_admin', 'admin'],
  treatment_plan: [
    'doctor',
    'nurse',
    'medical_director',
    'super_admin',
    'admin',
  ],
  orders: [
    'doctor',
    'nurse',
    'lab_technician',
    'radiologist',
    'pharmacist',
    'medical_director',
    'super_admin',
    'admin',
  ],
};

// =============================================================================
// Consultation Status Type & Helper
// =============================================================================

export type ConsultationStatus = RequestStatus;

export function getConsultationStatusColor(
  status: ConsultationStatus,
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'In Progress':
      return 'info';
    case 'Completed':
      return 'success';
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getConsultationStateColor(state: ConsultationState): string {
  switch (state) {
    case 'Patient_Called':
      return 'bg-blue-100 text-blue-800';
    case 'Complaints_Entered':
      return 'bg-yellow-100 text-yellow-800';
    case 'Clinical_Notes_Entered':
      return 'bg-orange-100 text-orange-800';
    case 'Diagnosis_Confirmed':
      return 'bg-purple-100 text-purple-800';
    case 'Treatment_Plan_Created':
      return 'bg-indigo-100 text-indigo-800';
    case 'Orders_Placed':
      return 'bg-green-100 text-green-800';
    case 'Completed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getConsultationStateLabel(state: ConsultationState): string {
  switch (state) {
    case 'Patient_Called':
      return 'Patient Called';
    case 'Complaints_Entered':
      return 'Complaints Entered';
    case 'Clinical_Notes_Entered':
      return 'Clinical Notes Entered';
    case 'Diagnosis_Confirmed':
      return 'Diagnosis Confirmed';
    case 'Treatment_Plan_Created':
      return 'Treatment Plan Created';
    case 'Orders_Placed':
      return 'Orders Placed';
    case 'Completed':
      return 'Completed';
    default:
      return state;
  }
}

export function getNextConsultationState(
  currentState: ConsultationState,
): ConsultationState | null {
  const stateOrder: ConsultationState[] = [
    'Patient_Called',
    'Complaints_Entered',
    'Clinical_Notes_Entered',
    'Diagnosis_Confirmed',
    'Treatment_Plan_Created',
    'Orders_Placed',
    'Completed',
  ];

  const currentIndex = stateOrder.indexOf(currentState);
  if (currentIndex === -1 || currentIndex >= stateOrder.length - 1) {
    return null;
  }
  return stateOrder[currentIndex + 1];
}

export function canProgressToState(
  currentState: ConsultationState,
  targetState: ConsultationState,
): boolean {
  const stateOrder: ConsultationState[] = [
    'Patient_Called',
    'Complaints_Entered',
    'Clinical_Notes_Entered',
    'Diagnosis_Confirmed',
    'Treatment_Plan_Created',
    'Orders_Placed',
    'Completed',
  ];

  const currentIndex = stateOrder.indexOf(currentState);
  const targetIndex = stateOrder.indexOf(targetState);

  // Can only progress forward, not backward
  return targetIndex > currentIndex;
}

// =============================================================================
// Consultation Edit Policy
// =============================================================================

export const CONSULTATION_EDIT_REASONS = [
  {
    value: 'documentation_error',
    label: 'Documentation error / typo correction',
  },
  { value: 'wrong_patient_context', label: 'Wrong patient context corrected' },
  { value: 'missing_history', label: 'Missing history details added' },
  { value: 'missing_examination', label: 'Missing examination findings added' },
  { value: 'diagnosis_updated', label: 'Diagnosis updated after review' },
  { value: 'treatment_plan_updated', label: 'Treatment plan updated' },
  { value: 'followup_updated', label: 'Follow-up plan/date updated' },
  {
    value: 'result_based_update',
    label: 'Updated after lab/radiology result review',
  },
  {
    value: 'specialist_review_update',
    label: 'Updated after specialist/consultant review',
  },
  { value: 'compliance_correction', label: 'Compliance/audit correction' },
  { value: 'other', label: 'Other clinical correction' },
] as const;

export type ConsultationEditReason =
  (typeof CONSULTATION_EDIT_REASONS)[number]['value'];

export function getConsultationEditReasonLabel(
  reason?: string | null,
): string | null {
  if (!reason) return null;
  return (
    CONSULTATION_EDIT_REASONS.find((item) => item.value === reason)?.label ||
    reason
  );
}

// =============================================================================
// 15-Minute Edit Window Helpers
// =============================================================================

const EDIT_WINDOW_MINUTES = 15;

/**
 * Check if a consultation is within the 15-minute edit window.
 * @param createdAt - The consultation creation timestamp
 * @returns boolean - true if within edit window
 */
export function isWithinEditWindow(createdAt: string | Date): boolean {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const minutesDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60);
  return minutesDiff < EDIT_WINDOW_MINUTES;
}

/**
 * Get the remaining time in the edit window
 * @param createdAt - The consultation creation timestamp
 * @returns string - Formatted time remaining (e.g., "12m left")
 */
export function getEditWindowRemaining(
  createdAt: string | Date,
): string | null {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const msRemaining =
    createdDate.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000 - now.getTime();

  if (msRemaining <= 0) return null;

  const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
  return `${minutesRemaining}m left`;
}

/**
 * Get the edit window expiry timestamp
 * @param createdAt - The consultation creation timestamp
 * @returns Date - When the edit window expires
 */
export function getEditWindowExpiry(createdAt: string | Date): Date {
  const createdDate = new Date(createdAt);
  return new Date(createdDate.getTime() + EDIT_WINDOW_MINUTES * 60 * 1000);
}

// =============================================================================
// Consultation DTOs
// =============================================================================

export interface ConsultationDTO extends Consultation {
  // Enhanced workflow tracking
  consultation_state?: ConsultationState;
  state_history?: Array<{
    from_state: ConsultationState;
    to_state: ConsultationState;
    changed_at: string;
    changed_by: string;
  }>;
  patient_called_at?: string;
  complaints_entered_at?: string;
  notes_entered_at?: string;
  diagnosis_confirmed_at?: string;
  treatment_plan_created_at?: string;
  orders_placed_at?: string;
  completed_at?: string;

  // Alteration metadata (derived from audit trail)
  is_altered?: boolean;
  altered_at?: string | null;
  altered_by?: string | null;
  alteration_reason?: string | null;
  alteration_reason_label?: string | null;
  alteration_reason_details?: string | null;
}

export interface ConsultationWithRelations extends ConsultationDTO {
  patient: Patient;
  doctor: Staff;
}

// Extended type that includes lab, radiology, and prescription details
export interface ConsultationWithDetails extends ConsultationWithRelations {
  lab_requests?: Array<{
    request_id: string;
    status: string;
    result?: string | null;
    test?: {
      test_id: string;
      test_name: string;
    };
  }>;
  radiology_requests?: Array<{
    request_id: string;
    status: string;
    report?: string | null;
    imaging?: {
      imaging_id: string;
      imaging_name: string;
    };
  }>;
  procedure_requests?: Array<{
    request_id: string;
    status: string;
    notes?: string | null;
    procedure?: {
      procedure_id: string;
      procedure_name: string;
      procedure_type: string;
    };
  }>;
  prescriptions?: Array<{
    prescription_id: string;
    status: string;
    dosage: string;
    frequency: string;
    duration?: string | null;
    route: string;
    quantity_prescribed: number;
    quantity_dispensed: number;
    instructions?: string | null;
    drug?: {
      drug_id: string;
      drug_name: string;
      strength?: string;
    };
  }>;
}

export interface CreateConsultationDTO {
  patient_id: string;
  visit_id?: string;
  encounter_id?: string; // Link to encounter for tracking
  clinic_id?: string; // Link to clinic for tracking
  complaints: string;
  clinical_notes?: string; // General clinical notes
  history_of_present_illness?: string;
  past_medical_history?: string;
  family_history?: string; // Family medical history
  social_history?: string; // Social history (lifestyle, occupation)
  review_of_systems?: string; // Systematic review of body systems
  examination_findings?: string;
  physical_examination?: string; // Detailed physical exam findings
  diagnosis?: string;
  differential_diagnosis?: string[] | null;
  treatment_plan?: string;
  recommendations?: string; // Doctor's recommendations
  follow_up_date?: string;
  follow_up_notes?: string;
  icd10_codes?: Array<{ code: string; description: string; type?: string }>; // Structured ICD-10 codes
  // Specialty consultation fields
  specialty_code?: string; // e.g., 'CARDIOLOGY', 'NEUROLOGY', 'ORTHOPAEDICS'
  specialty_template_id?: string; // UUID of the template used
  specialty_template_version?: number; // Version of the template
  specialty_data?: Record<string, any>; // JSONB field for specialty-specific form data
}

export interface UpdateConsultationDTO extends Partial<CreateConsultationDTO> {
  consultation_id: string;
  version?: number;
  status?: RequestStatus;
  edit_reason?: ConsultationEditReason;
  edit_reason_details?: string;
}

// =============================================================================
// Search & Filter DTOs
// =============================================================================

export interface ConsultationSearchParams {
  query?: string;
  patient_id?: string;
  doctor_id?: string;
  status?: RequestStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface ConsultationSearchResult {
  consultations: ConsultationWithRelations[];
  total: number;
  page: number;
  totalPages: number;
}

// =============================================================================
// Form Validation
// =============================================================================

export interface ConsultationFormErrors {
  patient_id?: string;
  complaints?: string;
  diagnosis?: string;
}

export function validateConsultationForm(
  data: CreateConsultationDTO,
): ConsultationFormErrors {
  const errors: ConsultationFormErrors = {};

  if (!data.patient_id) {
    errors.patient_id = 'Patient is required';
  }

  if (!data.complaints?.trim()) {
    errors.complaints = 'Chief complaints are required';
  }

  return errors;
}

// =============================================================================
// Lab/Radiology Order DTOs
// =============================================================================

export interface LabOrderDTO {
  test_id: string;
  clinical_notes?: string;
  priority?: Priority;
  test_name?: string;
  test_code?: string;
  diagnosis?: string[]; // ICD-10 codes/diagnoses for clinical context
}

export interface RadiologyOrderDTO {
  imaging_id: string;
  body_part?: string;
  clinical_indication?: string;
  priority?: Priority;
  diagnosis?: string[]; // ICD-10 codes/diagnoses for clinical context
}

export interface ProcedureOrderDTO {
  procedure_id: string;
  procedure_name: string;
  procedure_type: string;
  notes?: string;
  priority?: Priority;
  price?: number;
  diagnosis?: string[]; // ICD-10 codes/diagnoses for clinical context
  clinical_notes?: string; // Prefilled clinical findings for NHIS pre-auth
}

export interface AdmissionOrderDTO {
  ward_id?: string;
  ward_name?: string;
  ward_type?: string;
  admission_type: 'Emergency' | 'Elective' | 'Transfer';
  reason: string;
  priority: Priority;
  expected_duration?: string; // e.g., "3 days", "1 week"
  special_requirements?: string;
  attending_doctor_notes?: string;
}

export interface PrescriptionOrderDTO {
  drug_id?: string; // Optional now
  drug_name: string; // Required now
  dosage: string;
  frequency: string;
  duration?: string;
  route?: string;
  quantity_prescribed: number;
  instructions?: string;
  price?: number;
  diagnosis?: string[]; // ICD-10 codes/diagnoses - why this was prescribed
  clinical_notes?: string; // Indication/reason for prescription
}
