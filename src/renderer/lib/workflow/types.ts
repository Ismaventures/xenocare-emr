// =============================================================================
// EMR Workflow Types - Patient Journey Orchestration
// =============================================================================

import {
  Patient,
  Visit,
  Queue,
  PaymentMethod,
  Priority,
  VisitStatus,
  QueueStatus,
} from '../../types';

// =============================================================================
// Workflow Stage Definitions
// =============================================================================

export const WORKFLOW_STAGES = [
  'registration', // Patient arrives and registers
  'payment', // Payment category determined and processed
  'queue_waiting', // Patient in queue waiting for consultation
  'nursing_vitals', // Nurse takes vital signs
  'consultation', // Doctor consultation
  'lab_pending', // Lab tests ordered and pending
  'lab_results', // Lab results ready
  'radiology_pending', // Radiology tests ordered and pending
  'radiology_results', // Radiology results ready
  'procedure_pending', // Procedures ordered and pending
  'doctor_review', // Doctor reviews test results
  'pharmacy_pending', // Prescriptions pending
  'pharmacy_dispense', // Medications dispensed
  'billing_final', // Final billing
  'completed', // Encounter complete
  // Specialty Clinical Stages
  'dental_pending', // Dental procedure ordered
  'dental_exam', // Dental examination in progress
  'dental_procedure', // Dental procedure in progress
  'ophthalmology_pending', // Eye procedure ordered
  'ophthalmology_exam', // Eye examination in progress
  'ophthalmology_procedure', // Eye procedure in progress
  'physiotherapy_pending', // Physio referral ordered
  'physiotherapy_assessment', // Physio assessment in progress
  'physiotherapy_session', // Physio session in progress
  // A&E (Accident & Emergency) Stages
  'ae_arrival', // Patient arrived at A&E
  'ae_triage', // Triage assessment
  'ae_assessment', // Clinician assessment
  'ae_treatment', // Active treatment
  'ae_disposition', // Disposition decision
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

// =============================================================================
// Payment Category Types
// =============================================================================

export const PAYMENT_CATEGORIES = [
  { value: 'Cash', label: 'Cash Payment', requiresPaymentFirst: true },
  { value: 'POS', label: 'POS/Card Payment', requiresPaymentFirst: true },
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
] as const;

export type PaymentCategory = PaymentMethod;

// =============================================================================
// Visit/Encounter Types
// =============================================================================

export const VISIT_TYPES = [
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

export type VisitType = (typeof VISIT_TYPES)[number]['value'];

// =============================================================================
// Encounter DTO - Complete Patient Journey
// =============================================================================

export interface EncounterDTO {
  id: string;
  visit_id: string;
  patient_id: string;
  patient?: Patient;
  clinic_id?: string;
  visit_type: VisitType;
  payment_category: PaymentCategory;
  priority: Priority;
  status: VisitStatus;
  current_stage: WorkflowStage;
  encounter_number?: string;
  chief_complaint?: string;
  // Doctor assignment
  attending_doctor_id?: string;
  is_assigned_to_current_user?: boolean; // True if current user is assigned doctor/consultant
  // Timeline tracking
  registration_time: string;
  payment_time?: string;
  consultation_start?: string;
  consultation_end?: string;
  encounter_end?: string;
  // Related records
  queue_entry?: Queue;
  consultation_id?: string;
  lab_requests?: string[];
  radiology_requests?: string[];
  prescriptions?: string[];
  billing_id?: string;
  // Billing summary
  total_charges?: number;
  total_paid?: number;
  balance?: number;
  // Metadata
  registered_by?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Create/Update DTOs
// =============================================================================

export type OPDClassification = 'MOPD' | 'SOPD';

export interface CreateEncounterDTO {
  patient_id: string;
  visit_type: VisitType;
  payment_category: PaymentCategory;
  priority?: Priority;
  chief_complaint?: string;
  notes?: string;
  clinic_id?: string;
  attending_doctor_id?: string;
  opd_classification?: OPDClassification; // Auto-set based on department
  // Referral encounter fields - set when creating encounter from a referral
  is_referral_encounter?: boolean;
  source_referral_id?: string; // Links back to clinical_requests.id
  referring_doctor_id?: string;
  referral_reason?: string;
  specialty_module?: string; // e.g. 'cardiology', 'dental' — used for NHIS specialty queue routing
}

export interface UpdateEncounterDTO {
  visit_id: string;
  status?: VisitStatus;
  current_stage?: WorkflowStage;
  chief_complaint?: string;
  notes?: string;
}

export interface TransitionEncounterDTO {
  visit_id: string;
  next_stage: WorkflowStage;
  notes?: string;
  // Optional routing
  target_department?: string;
}

// =============================================================================
// Queue Movement DTO
// =============================================================================

export interface MoveToQueueDTO {
  visit_id: string;
  patient_id: string;
  department:
    | 'Reception'
    | 'Nursing'
    | 'Consultation'
    | 'Laboratory'
    | 'Radiology'
    | 'Pharmacy'
    | 'Billing'
    | 'Dental'
    | 'Ophthalmology'
    | 'Physiotherapy'
    | 'Emergency'
    | 'Triage'
    | 'Resuscitation';
  priority?: Priority;
  clinic_id?: string;
  notes?: string;
}

// =============================================================================
// Workflow State Machine
// =============================================================================

export interface WorkflowTransition {
  from: WorkflowStage;
  to: WorkflowStage[];
  requiresPayment?: boolean;
  requiresAction?: string;
}

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  {
    from: 'registration',
    to: ['payment', 'queue_waiting', 'nursing_vitals'],
    requiresPayment: false,
  },
  {
    from: 'payment',
    to: [
      'queue_waiting',
      'nursing_vitals',
      'consultation',
      'lab_pending',
      'radiology_pending',
      'procedure_pending',
      'pharmacy_pending',
    ],
    requiresPayment: true,
  },
  { from: 'queue_waiting', to: ['nursing_vitals', 'consultation', 'payment'] },
  { from: 'nursing_vitals', to: ['consultation', 'queue_waiting', 'payment'] },
  {
    from: 'consultation',
    to: [
      'payment', // Allow payment for service orders (lab/radiology/pharmacy)
      'lab_pending',
      'radiology_pending',
      'procedure_pending',
      'pharmacy_pending',
      'billing_final',
      'completed',
      'doctor_review',
    ],
  },
  { from: 'lab_pending', to: ['lab_results', 'billing_final', 'completed'] },
  {
    from: 'lab_results',
    to: [
      'doctor_review',
      'radiology_pending',
      'procedure_pending',
      'pharmacy_pending',
      'billing_final',
      'completed',
    ],
  },
  {
    from: 'radiology_pending',
    to: ['radiology_results', 'billing_final', 'completed'],
  },
  {
    from: 'radiology_results',
    to: [
      'doctor_review',
      'procedure_pending',
      'pharmacy_pending',
      'billing_final',
      'completed',
    ],
  },
  {
    from: 'procedure_pending',
    to: ['doctor_review', 'pharmacy_pending', 'billing_final'],
  },
  {
    from: 'doctor_review',
    to: [
      'lab_pending',
      'radiology_pending',
      'procedure_pending',
      'pharmacy_pending',
      'billing_final',
      'completed',
    ],
  },
  { from: 'pharmacy_pending', to: ['pharmacy_dispense'] },
  { from: 'pharmacy_dispense', to: ['billing_final', 'completed'] },
  { from: 'billing_final', to: ['completed'] },
  // A&E Transitions
  { from: 'ae_arrival', to: ['ae_triage'] },
  { from: 'ae_triage', to: ['ae_assessment', 'queue_waiting'] },
  {
    from: 'ae_assessment',
    to: [
      'ae_treatment',
      'lab_pending',
      'radiology_pending',
      'pharmacy_pending',
      'ae_disposition',
    ],
  },
  {
    from: 'ae_treatment',
    to: ['ae_assessment', 'ae_disposition', 'lab_pending', 'radiology_pending'],
  },
  { from: 'ae_disposition', to: ['completed'] },
];

// =============================================================================
// Helper Functions
// =============================================================================

export function getNextStages(currentStage: WorkflowStage): WorkflowStage[] {
  const transition = WORKFLOW_TRANSITIONS.find((t) => t.from === currentStage);
  return transition?.to || [];
}

export function canTransition(from: WorkflowStage, to: WorkflowStage): boolean {
  const transition = WORKFLOW_TRANSITIONS.find((t) => t.from === from);
  return transition?.to.includes(to) || false;
}

export function getStageDisplayName(stage: WorkflowStage): string {
  const names: Record<WorkflowStage, string> = {
    registration: 'Registration',
    payment: 'Payment Processing',
    queue_waiting: 'Waiting in Queue',
    nursing_vitals: 'Vitals Check',
    consultation: 'Doctor Consultation',
    lab_pending: 'Lab Tests Pending',
    lab_results: 'Lab Results Ready',
    radiology_pending: 'Imaging Pending',
    radiology_results: 'Imaging Results Ready',
    procedure_pending: 'Procedure Pending',
    doctor_review: 'Doctor Review',
    pharmacy_pending: 'Pharmacy Processing',
    pharmacy_dispense: 'Medication Dispensed',
    billing_final: 'Final Billing',
    completed: 'Visit Completed',
    // Specialty module stages
    dental_pending: 'Dental Pending',
    dental_exam: 'Dental Examination',
    dental_procedure: 'Dental Procedure',
    ophthalmology_pending: 'Eye Exam Pending',
    ophthalmology_exam: 'Eye Examination',
    ophthalmology_procedure: 'Eye Procedure',
    physiotherapy_pending: 'Physiotherapy Pending',
    physiotherapy_assessment: 'Physiotherapy Assessment',
    physiotherapy_session: 'Physiotherapy Session',
    // A&E stages
    ae_arrival: 'A&E Arrival',
    ae_triage: 'A&E Triage',
    ae_assessment: 'A&E Assessment',
    ae_treatment: 'A&E Treatment',
    ae_disposition: 'A&E Disposition',
  };
  return names[stage] || stage;
}

export function getStageColor(stage: WorkflowStage): string {
  const colors: Record<WorkflowStage, string> = {
    registration: 'bg-blue-100 text-blue-800',
    payment: 'bg-yellow-100 text-yellow-800',
    queue_waiting: 'bg-orange-100 text-orange-800',
    nursing_vitals: 'bg-pink-100 text-pink-800',
    consultation: 'bg-purple-100 text-purple-800',
    lab_pending: 'bg-amber-100 text-amber-800',
    lab_results: 'bg-lime-100 text-lime-800',
    radiology_pending: 'bg-cyan-100 text-cyan-800',
    radiology_results: 'bg-teal-100 text-teal-800',
    procedure_pending: 'bg-fuchsia-100 text-fuchsia-800',
    doctor_review: 'bg-indigo-100 text-indigo-800',
    pharmacy_pending: 'bg-rose-100 text-rose-800',
    pharmacy_dispense: 'bg-emerald-100 text-emerald-800',
    billing_final: 'bg-slate-100 text-slate-800',
    completed: 'bg-green-100 text-green-800',
    // Specialty module stages
    dental_pending: 'bg-violet-100 text-violet-800',
    dental_exam: 'bg-violet-200 text-violet-900',
    dental_procedure: 'bg-violet-300 text-violet-950',
    ophthalmology_pending: 'bg-sky-100 text-sky-800',
    ophthalmology_exam: 'bg-sky-200 text-sky-900',
    ophthalmology_procedure: 'bg-sky-300 text-sky-950',
    physiotherapy_pending: 'bg-lime-100 text-lime-800',
    physiotherapy_assessment: 'bg-lime-200 text-lime-900',
    physiotherapy_session: 'bg-lime-300 text-lime-950',
    // A&E stages
    ae_arrival: 'bg-red-100 text-red-800',
    ae_triage: 'bg-red-200 text-red-900',
    ae_assessment: 'bg-red-300 text-red-950',
    ae_treatment: 'bg-orange-200 text-orange-900',
    ae_disposition: 'bg-orange-300 text-orange-950',
  };
  return colors[stage] || 'bg-gray-100 text-gray-800';
}

export function requiresPaymentFirst(
  paymentCategory: PaymentCategory,
): boolean {
  return paymentCategory === 'Cash' || paymentCategory === 'POS';
}

export function mapStageToDepartment(stage: WorkflowStage): string {
  const mapping: Record<WorkflowStage, string> = {
    registration: 'Reception',
    payment: 'Billing',
    queue_waiting: 'Reception',
    nursing_vitals: 'Nursing',
    consultation: 'Consultation',
    lab_pending: 'Laboratory',
    lab_results: 'Laboratory',
    radiology_pending: 'Radiology',
    radiology_results: 'Radiology',
    procedure_pending: 'Nursing',
    doctor_review: 'Consultation',
    pharmacy_pending: 'Pharmacy',
    pharmacy_dispense: 'Pharmacy',
    billing_final: 'Billing',
    completed: 'Reception',
    // Specialty module stages
    dental_pending: 'Dental',
    dental_exam: 'Dental',
    dental_procedure: 'Dental',
    ophthalmology_pending: 'Ophthalmology',
    ophthalmology_exam: 'Ophthalmology',
    ophthalmology_procedure: 'Ophthalmology',
    physiotherapy_pending: 'Physiotherapy',
    physiotherapy_assessment: 'Physiotherapy',
    physiotherapy_session: 'Physiotherapy',
    // A&E stages
    ae_arrival: 'Emergency',
    ae_triage: 'Emergency',
    ae_assessment: 'Emergency',
    ae_treatment: 'Emergency',
    ae_disposition: 'Emergency',
  };
  return mapping[stage] || 'Reception';
}
