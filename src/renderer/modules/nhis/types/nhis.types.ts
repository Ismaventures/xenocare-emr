// =============================================================================
// NHIS Module Types
// =============================================================================

// Enum Types (matching database enums)
export type NhisSchemeType =
  | 'Personnel'
  | 'Civilian_NHIS'
  | 'HMO_Private'
  | 'Special';
export type NhisProfileStatus = 'active' | 'inactive' | 'suspended' | 'expired';
export type NhisPatientOrigin = 'internal' | 'referred';
export type NhisAuthStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'revoked'
  | 'used';
export type NhisVerificationStatus =
  | 'not_applicable'
  | 'unverified'
  | 'blocked'
  | 'verified'
  | 'expired'
  | 'emergency_override';
export type NhisApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'provisional'
  | 'approved'
  | 'rejected'
  | 'expired';
export type BillingReleaseStatus = 'blocked' | 'released' | 'billed' | 'waived';
export type ServiceExecutionStatus =
  | 'draft'
  | 'ordered'
  | 'blocked'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type NhisTariffGroup =
  | 'Personnel'
  | 'Civilian_HMO'
  | 'Special'
  | 'Private';
export type NhisClaimStatus =
  | 'draft'
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'submitted'
  | 'paid'
  | 'rejected'
  | 'disputed';
export type NhisPostingStatus =
  | 'pending'
  | 'posted'
  | 'seen'
  | 'completed'
  | 'cancelled';

// Service types that can have specific authorizations
export type NhisServiceType =
  | 'general_outpatient'
  | 'dental'
  | 'ophthalmology'
  | 'physiotherapy'
  | 'laboratory'
  | 'radiology'
  | 'pharmacy'
  | 'surgery'
  | 'ent'
  | 'cardiology'
  | 'orthopedics'
  | 'obstetrics_gynecology'
  | 'pediatrics'
  | 'psychiatry'
  | 'other';

// =============================================================================
// Policy Configuration
// =============================================================================

export interface NhisPolicyConfig {
  id: string;
  provider_name: string;
  validity_days: number;
  one_hour_rule_enabled: boolean;
  one_hour_grace_period_minutes: number;
  emergency_override_allowed: boolean;
  emergency_followup_deadline_hours: number;
  approval_rules: Record<
    string,
    {
      requires_approval: boolean;
      max_wait_hours?: number;
      threshold_amount?: number;
    }
  >;
  military_drug_coverage_percent: number;
  civilian_drug_coverage_percent: number;
  default_copay_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// NHIS Profile
// =============================================================================

export interface NhisProfile {
  id: string;
  patient_id: string;
  scheme_type: NhisSchemeType;
  provider_name: string | null;
  plan_category: string | null;
  enrollee_id: string | null;
  status: NhisProfileStatus;
  patient_origin: NhisPatientOrigin;
  referring_facility_name: string | null;
  referring_facility_nhis_id: string | null;
  referral_document_path: string | null;
  referral_code: string | null;
  referral_date: string | null;
  referral_expiry_date: string | null;
  referral_reason: string | null;
  policy_config_id: string | null;
  tariff_group: NhisTariffGroup;
  verification_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;

  // Joined data
  patient?: {
    id: string;
    patient_id: string;
    emr_number: string;
    first_name: string;
    middle_name: string | null;
    surname: string;
    gender: string;
    date_of_birth: string;
    contact_phone: string | null;
    nhis_number?: string | null;
    service_number?: string | null;
    nhis_patient_source?: string | null;
    referral_code?: string | null;
    referring_facility_name?: string | null;
    referring_facility_nhis_id?: string | null;
    referral_date?: string | null;
    referral_reason?: string | null;
    referral_status?: string | null;
    referral_expiry_date?: string | null;
    clinical_summary?: string | null;
    insurance_type?: string | null;
    patient_category?: string | null;
    patient_type?: string | null;
    payer_info?: any | null;
    rank?: string | null;
    military_branch?: string | null;
    unit?: string | null;
    occupation?: string | null;
    employer?: string | null;
    residential_address?: string | null;
    blood_group?: string | null;
    nationality?: string | null;
    state_of_origin?: string | null;
    lga?: string | null;
    nok_name?: string | null;
    nok_relationship?: string | null;
    nok_phone?: string | null;
    nok_address?: string | null;
  };
  policy_config?: NhisPolicyConfig;
  verified_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateNhisProfileDTO {
  patient_id: string;
  scheme_type: NhisSchemeType;
  provider_name?: string;
  plan_category?: string;
  enrollee_id?: string;
  patient_origin: NhisPatientOrigin;
  referring_facility_name?: string;
  referring_facility_nhis_id?: string;
  referral_code?: string;
  referral_date?: string;
  referral_expiry_date?: string;
  referral_reason?: string;
  tariff_group: NhisTariffGroup;
  policy_config_id?: string;
  verification_notes?: string;
}

export interface UpdateNhisProfileDTO extends Partial<CreateNhisProfileDTO> {
  status?: NhisProfileStatus;
  verification_notes?: string;
}

// =============================================================================
// NHIS Authorization
// =============================================================================

export interface NhisAuthorization {
  id: string;
  patient_id: string;
  nhis_profile_id: string | null;
  auth_code: string;
  auth_type: string;
  start_date: string;
  expiry_date: string;
  status: NhisAuthStatus;
  source: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  renewal_required_at: string | null;
  renewed_from_id: string | null;
  attachment_path: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;

  // Provisional authorization fields
  is_provisional: boolean;
  provisional_reason: string | null;
  provisional_approved_by: string | null;
  provisional_approved_at: string | null;
  actual_code_received_at: string | null;

  // Service-specific authorization fields
  specific_clinic_code: string | null;
  specific_service_type: NhisServiceType | null;
  authorization_source: 'internal' | 'external' | null;

  // Joined data
  patient?: {
    id: string;
    patient_id: string;
    emr_number: string;
    first_name: string;
    surname: string;
  };
  verified_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  provisional_approved_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateAuthorizationDTO {
  patient_id: string;
  nhis_profile_id?: string;
  auth_code: string;
  auth_type?: string;
  start_date?: string;
  validity_days?: number; // Used to compute expiry_date
  source?: string;
  verification_notes?: string;
  // Provisional fields
  is_provisional?: boolean;
  provisional_reason?: string;
  specific_service_type?: NhisServiceType;
  authorization_source?: 'internal' | 'external';
}

export interface ProvisionalApprovalDTO {
  patient_id: string;
  service_type: NhisServiceType;
  reason: string;
  encounter_id?: string;
  expiry_days?: number;
}

export interface OfficialCodeEntryDTO {
  authorization_id: string;
  official_code: string;
}

export interface ServiceAuthorizationCheckResult {
  is_authorized: boolean;
  authorization_id: string | null;
  authorization_status: string;
  is_provisional: boolean;
  expires_at: string | null;
  reason: string;
}

export interface NhisAuthorizationService {
  id: string;
  authorization_id: string;
  service_type: string;
  service_id: string | null;
  service_table: string | null;
  approved_at: string;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface VerifyAuthorizationDTO {
  auth_id: string;
  verified_by: string;
  verification_notes?: string;
}

// =============================================================================
// NHIS Posting
// =============================================================================

export interface NhisPosting {
  id: string;
  encounter_id: string;
  auth_id: string | null;
  patient_id: string;
  clinic_id: string | null;
  specialty_name: string | null;
  doctor_id: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: NhisPostingStatus;
  posted_by: string;
  posted_at: string;
  seen_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;

  // Joined data
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    surname: string;
  };
  clinic?: {
    id: string;
    name: string;
  };
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreatePostingDTO {
  encounter_id: string;
  auth_id?: string;
  patient_id: string;
  clinic_id?: string;
  specialty_name?: string;
  doctor_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  posted_by: string;
}

// =============================================================================
// NHIS Approval
// =============================================================================

export interface NhisApproval {
  id: string;
  service_request_id: string;
  service_type: string;
  encounter_id: string;
  patient_id: string;
  service_name: string | null;
  service_code: string | null;
  estimated_cost: number | null;
  status: NhisApprovalStatus;
  requested_by: string | null;
  requested_at: string;
  request_reason: string | null;
  clinical_justification: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  rejection_reason: string | null;
  approval_expiry: string | null;
  authorization_code: string | null;

  // Joined data
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    surname: string;
    patient_emr_number?: string;
  };
  requested_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  decided_by_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateApprovalRequestDTO {
  service_request_id: string;
  service_type: string;
  encounter_id: string;
  patient_id: string;
  service_name: string;
  service_code?: string;
  estimated_cost?: number;
  requested_by: string;
  request_reason?: string;
  clinical_justification?: string;
}

export interface ApprovalDecisionDTO {
  approval_id: string;
  decision: 'approved' | 'rejected' | 'provisional';
  decided_by: string;
  decision_notes?: string;
  rejection_reason?: string;
  authorization_code?: string; // NHIS authorization/approval code
  authorization_date?: string; // Date of authorization
}

// =============================================================================
// NHIS Claims
// =============================================================================

export interface NhisClaimServiceLine {
  item_id: string;
  service_type: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  tariff_price: number;
  covered_amount: number;
  patient_copay: number;
  approval_id?: string;
}

export interface NhisClaim {
  id: string;
  claim_number: string;
  encounter_id: string;
  patient_id: string;
  nhis_profile_id: string | null;
  auth_id: string | null;
  tariff_group: NhisTariffGroup;
  provider_name: string | null;
  service_lines: NhisClaimServiceLine[];
  total_tariff: number;
  claimable_amount: number;
  patient_pay_amount: number;
  includes_emergency_services: boolean;
  requires_post_authorization: boolean;
  post_authorization_verified: boolean;
  status: NhisClaimStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  export_batch_id: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  payment_reference: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Joined data
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    surname: string;
  };
  encounter?: {
    id: string;
    visit_id: string;
    encounter_date: string;
  };
}

// =============================================================================
// NHIS Export Batch
// =============================================================================

export interface NhisExportBatch {
  id: string;
  batch_number: string;
  export_type: string;
  period_start: string;
  period_end: string;
  provider_name: string | null;
  total_claims: number;
  total_amount: number;
  claim_ids: string[];
  export_file_path: string | null;
  export_format: string;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  submission_reference: string | null;
  dhq_format_version: string | null;
  facility_nhis_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// =============================================================================
// NHIS Tariff Rules
// =============================================================================

export interface NhisTariffRule {
  id: string;
  tariff_group: NhisTariffGroup;
  service_type: string;
  service_id: string | null;
  service_code: string | null;
  service_name: string | null;
  covered_type: string;
  patient_copay_percent: number;
  claim_amount: number | null;
  claim_rate: number | null;
  approval_required: boolean;
  approval_threshold_amount: number | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Encounter NHIS State
// =============================================================================

export interface EncounterNhisState {
  encounter_id: string;
  payer_type: string;
  nhis_auth_id: string | null;
  nhis_verification_status: NhisVerificationStatus;
  nhis_verified_by: string | null;
  nhis_verified_at: string | null;
  nhis_tariff_group: NhisTariffGroup | null;
  nhis_policy_snapshot: Record<string, unknown> | null;
  nhis_override_reason: string | null;
  nhis_override_by: string | null;
  nhis_override_at: string | null;
  requires_post_authorization: boolean;
}

// =============================================================================
// Verification Request/Response
// =============================================================================

export interface VerifyEncounterRequest {
  encounter_id: string;
  auth_id: string;
  verified_by: string;
  tariff_group: NhisTariffGroup;
}

export interface VerifyEncounterResponse {
  success: boolean;
  encounter_id?: string;
  auth_id?: string;
  tariff_group?: NhisTariffGroup;
  error?: string;
}

export interface EmergencyOverrideRequest {
  encounter_id: string;
  override_by: string;
  reason: string;
}

export interface EmergencyOverrideResponse {
  success: boolean;
  encounter_id?: string;
  status?: string;
  requires_post_authorization?: boolean;
  error?: string;
}

// =============================================================================
// Service Execution Check
// =============================================================================

export interface CanExecuteServiceRequest {
  encounter_id: string;
  service_type: string;
  service_id: string;
}

export interface CanExecuteServiceResponse {
  can_execute: boolean;
  reason: string;
  status?: NhisVerificationStatus;
}

// =============================================================================
// Dashboard Statistics
// =============================================================================

export interface NhisDashboardStats {
  total_profiles: number;
  active_profiles: number;
  pending_authorizations: number;
  active_authorizations: number;
  pending_approvals: number;
  provisional_approvals: number; // Approvals with provisional status awaiting official codes
  pending_claims: number;
  total_claims_amount: number;
  total_nhis_billing_amount: number; // Total from billing_orders for NHIS patients
  referred_patients_count: number;
  emergency_overrides_count: number;
  // Total NHIS registered patients at facility (patients with nhis_number)
  total_nhis_patients: number;
}

// =============================================================================
// Filter/Query Types
// =============================================================================

export interface NhisProfileFilters {
  scheme_type?: NhisSchemeType;
  status?: NhisProfileStatus;
  patient_origin?: NhisPatientOrigin;
  provider_name?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface NhisAuthorizationFilters {
  status?: NhisAuthStatus;
  source?: string;
  patient_id?: string;
  auth_code?: string;
  page?: number;
  limit?: number;
}

export interface NhisApprovalFilters {
  status?: NhisApprovalStatus;
  service_type?: string;
  patient_id?: string;
  encounter_id?: string;
  /** Exclude items with this service_category (e.g. 'specialty' to hide specialty referral entries) */
  exclude_category?: string;
  /** Search by patient name or service name */
  search?: string;
  page?: number;
  limit?: number;
}

export interface NhisClaimFilters {
  status?: NhisClaimStatus;
  tariff_group?: NhisTariffGroup;
  provider_name?: string;
  patient_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// HMO List (from existing nhis_hmos table)
// =============================================================================

export interface NhisHmo {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Referral Queue Types
// =============================================================================

export type ReferralQueueStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'all';
export type ReferralQueuePriority = 'normal' | 'urgent' | 'emergency' | 'all';

// Service type for internal NHIS requests
export type NhisServiceType =
  | 'lab'
  | 'radiology'
  | 'pharmacy'
  | 'procedure'
  | 'surgery'
  | 'admission'
  | 'specialty_referral'
  | 'external_referral';

export interface ReferralQueueItem {
  id: string;
  patient_id: string;
  request_type: string;
  referral_code: string | null;
  referral_date: string | null;
  referral_source: string | null;
  referral_facility_nhis_id: string | null;
  clinical_basis: string | null;
  referring_clinician: string | null;
  days_since_referral: number | null;
  is_expired: boolean;
  status: ReferralQueueStatus;
  priority: ReferralQueuePriority;
  requested_by: string | null;
  requested_at: string;
  request_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  processing_notes: string | null;
  rejection_reason: string | null;
  authorization_id: string | null;
  created_at: string;
  updated_at: string;

  // Clinic selection for external NHIS - encounter created after NHIS approval
  target_clinic_id?: string | null;
  target_doctor_id?: string | null;
  visit_type?: string | null;
  chief_complaint?: string | null;
  encounter_id?: string | null;

  // ============ CLINICAL DATA FIELDS (for NHIS officer review) ============
  // These fields capture the clinical context from the consultation
  diagnosis?: string | null; // Diagnosis text from consultation
  diagnosis_codes?: string[] | null; // ICD-10 codes if available
  examination_findings?: string | null; // General examination findings
  history_of_present_illness?: string | null; // HPI from consultation
  clinical_notes?: string | null; // Additional clinical notes
  treatment_plan?: string | null; // Treatment plan from consultation

  // Service-specific fields
  service_type?: NhisServiceType | null; // lab, radiology, procedure, admission, etc.
  service_name?: string | null; // Name of specific service requested
  urgency?: 'Routine' | 'Urgent' | 'Emergency' | null;
  estimated_cost?: number | null;

  // Source encounter reference
  source_encounter_id?: string | null;
  requesting_doctor_id?: string | null;
  specialty_module?: string | null; // dental, ophthalmology, physiotherapy

  // Admission-specific fields
  admission_type?: 'Emergency' | 'Elective' | null;
  level_of_care?: 'Ward' | 'ICU' | 'HDU' | 'NICU' | null;
  expected_duration?: string | null;

  // ============ JOINED DATA ============
  // Joined clinic data
  target_clinic?: {
    id: string;
    clinic_name: string;
    clinic_code: string;
  };

  // Joined doctor data for target doctor
  target_doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };

  // Joined requesting doctor data
  requesting_doctor?: {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
  };

  // Joined patient data with registration info
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    middle_name: string | null;
    surname: string;
    emr_number: string;
    service_number: string | null;
    phone: string | null;
    gender: string | null;
    date_of_birth: string | null;
    nhis_number: string | null;
  };

  // Joined staff data
  requester?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  processor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateReferralQueueDTO {
  patient_id: string;
  request_type?: string;
  referral_code?: string;
  referral_date?: string;
  referral_source?: string;
  referral_facility_nhis_id?: string;
  clinical_basis?: string; // Reason for referral / clinical basis
  referring_clinician?: string;
  priority?: ReferralQueuePriority;
  requested_by: string;
  request_notes?: string;

  // Clinic selection for external NHIS patients (encounter created after approval)
  target_clinic_id?: string;
  target_doctor_id?: string;
  visit_type?: string;
  chief_complaint?: string;

  // For internal referrals - links to clinical_requests
  clinical_request_id?: string;

  // ============ CLINICAL DATA FIELDS ============
  // These MUST be populated from consultation for NHIS officer processing
  diagnosis?: string; // Diagnosis text from consultation
  diagnosis_codes?: string[]; // ICD-10 codes if available
  examination_findings?: string; // General examination findings
  history_of_present_illness?: string; // HPI from consultation
  clinical_notes?: string; // Additional clinical notes
  treatment_plan?: string; // Treatment plan from consultation

  // Service-specific fields
  service_type?: NhisServiceType; // lab, radiology, procedure, admission, etc.
  service_name?: string; // Name of specific service requested
  urgency?: 'Routine' | 'Urgent' | 'Emergency';
  estimated_cost?: number;

  // Source encounter reference (link to originating encounter)
  source_encounter_id?: string;
  requesting_doctor_id?: string;
  specialty_module?: string;

  // Admission-specific fields
  admission_type?: 'Emergency' | 'Elective';
  level_of_care?: 'Ward' | 'ICU' | 'HDU' | 'NICU';
  expected_duration?: string;
}

export interface ProcessReferralQueueDTO {
  queue_id: string;
  action: 'approve' | 'reject';
  processed_by: string;
  processing_notes?: string;
  rejection_reason?: string;
  auth_code?: string;
  tariff_group?: NhisTariffGroup;
  // Overrides for referral data
  referral_source?: string;
  referral_code?: string;
  referral_date?: string;
  referral_reason?: string;
  referring_clinician?: string;
}

export interface ReferralQueueFilters {
  status?: ReferralQueueStatus;
  priority?: ReferralQueuePriority;
  is_expired?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  referral_direction?: 'incoming' | 'outgoing';
  request_type?: string | string[];
}

// =============================================================================
// OUTGOING NHIS EXTERNAL REFERRAL TYPES
// For referring NHIS patients from NDC to external hospitals
// =============================================================================

export type OutgoingReferralUrgency = 'Routine' | 'Urgent' | 'Emergency';

export interface CreateOutgoingReferralDTO {
  patient_id: string;
  source_encounter_id: string;
  requesting_doctor_id: string;

  // Clinical data from consultation
  clinical_findings: string;
  investigation_findings?: string;
  provisional_diagnosis: string;
  reason_for_referral: string;
  additional_notes?: string;
  urgency: OutgoingReferralUrgency;

  // Auto-populated
  requested_by: string;
}

export interface ApproveOutgoingReferralDTO {
  queue_id: string;
  nhis_referral_code: string;
  destination_facility_name: string;
  destination_facility_nhis_id?: string;
  destination_facility_address?: string;
  referral_valid_from: string;
  referral_valid_to: string;
  processing_notes?: string;
  processed_by: string;
}

export interface OutgoingReferralItem {
  queue_id: string;
  queue_status: string;
  referral_direction: 'outgoing';
  requested_at: string;
  processed_at: string | null;

  // NHIS Referral Details (entered by NHIS officer)
  nhis_referral_code: string | null;
  referral_valid_from: string | null;
  referral_valid_to: string | null;
  is_expired: boolean;

  // Destination Facility (entered by NHIS officer)
  destination_facility_name: string | null;
  destination_facility_nhis_id: string | null;
  destination_facility_address: string | null;

  // Patient Info
  patient_id: string;
  file_number: string;
  emr_number: string | null;
  patient_full_name: string;
  patient_age: number | null;
  gender: string | null;
  contact_phone: string | null;
  residential_address: string | null;

  // Patient NHIS Info
  nhis_number: string | null;
  hmo_code: string | null;
  nhis_id_no: string | null;

  // Clinical Data (from doctor)
  clinical_findings: string | null;
  examination_findings: string | null;
  investigation_findings: string | null;
  provisional_diagnosis: string | null;
  diagnosis: string | null;
  reason_for_referral: string | null;
  clinical_notes: string | null;

  // Referring Doctor
  referring_doctor_id: string | null;
  referring_doctor_name: string | null;
  referring_doctor_department: string | null;

  // Source Encounter
  source_encounter_id: string | null;
  encounter_number: string | null;
  encounter_date: string | null;

  // Print Info
  printed_at: string | null;
  print_count: number;
  printed_by_first_name: string | null;
  printed_by_last_name: string | null;

  // Approval Info
  approved_by_first_name: string | null;
  approved_by_last_name: string | null;
  approval_notes: string | null;
}
