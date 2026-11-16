// Referral Types for EMR System
// Generated: December 20, 2025

// =====================================================
// ENUMS
// =====================================================

export type ReferralStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled';

export type ReferralPriority = 'Routine' | 'Urgent' | 'Emergent' | 'Stat';

export type ReferralType =
  | 'Consultation'
  | 'Transfer'
  | 'CoManagement'
  | 'Procedure';

// =====================================================
// REFERRAL TYPES
// =====================================================

export interface Referral {
  id: string;
  referral_number: string;

  // Patient/Visit
  patient_id: string;
  visit_id: string;

  // Source (referring)
  source_department_id: string;
  from_department_id: string; // Alias
  referring_physician_id: string;
  referring_user_id?: string;

  // Target (receiving)
  target_department_id: string;
  to_department_id: string; // Alias
  receiving_physician_id?: string;
  assigned_to?: string;

  // Referral details
  referral_type: ReferralType;
  priority: ReferralPriority;

  // Clinical info
  reason_for_referral: string;
  clinical_summary?: string;
  relevant_history?: string;
  current_medications?: string;
  allergies?: string;
  clinical_questions?: string[];

  // Attachments
  attachments: ReferralAttachment[];

  // Status
  status: ReferralStatus;
  status_reason?: string;

  // Response
  acceptance_notes?: string;
  consultation_notes?: string;
  recommendations?: string;
  follow_up_required: boolean;
  follow_up_instructions?: string;

  // Scheduling
  preferred_date?: string;
  scheduled_date?: string;
  scheduled_time?: string;

  // Timestamps
  referred_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  response_due_by?: string;
  expires_at?: string;

  // Metadata
  metadata: Record<string, unknown>;

  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ReferralAttachment {
  name: string;
  type: 'lab_request' | 'radiology_request' | 'document' | 'file';
  id?: string;
  path?: string;
}

export interface ReferralWithDetails extends Referral {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    medical_record_number: string;
  };
  visit: {
    id: string;
    visit_number: string;
    visit_type: string;
  };
  source_department: {
    id: string;
    code: string;
    name: string;
  };
  target_department: {
    id: string;
    code: string;
    name: string;
  };
  referring_physician: {
    id: string;
    full_name: string;
    role: string;
  };
  receiving_physician?: {
    id: string;
    full_name: string;
    role: string;
  };
}

// =====================================================
// REFERRAL STATUS HISTORY
// =====================================================

export interface ReferralStatusHistory {
  id: string;
  referral_id: string;
  old_status?: ReferralStatus;
  new_status: ReferralStatus;
  changed_by: string;
  reason?: string;
  notes?: string;
  created_at: string;
}

export interface ReferralStatusHistoryWithUser extends ReferralStatusHistory {
  changed_by_user: {
    id: string;
    full_name: string;
  };
}

// =====================================================
// REFERRAL TEMPLATES
// =====================================================

export interface ReferralTemplate {
  id: string;
  name: string;
  department_id?: string;
  referral_type: ReferralType;
  default_priority: ReferralPriority;
  reason_template?: string;
  clinical_questions?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// =====================================================
// CREATE/UPDATE DTOs
// =====================================================

export interface CreateReferralDTO {
  patient_id: string;
  visit_id: string;
  source_department_id?: string;
  from_department_id?: string;
  target_department_id?: string;
  to_department_id?: string;
  referral_type?: ReferralType;
  priority: ReferralPriority;
  reason_for_referral?: string;
  reason?: string;
  clinical_summary?: string;
  clinical_history?: string;
  clinical_findings?: string;
  relevant_history?: string;
  current_medications?: string;
  allergies?: string;
  clinical_questions?: string[];
  requested_services?: string;
  internal_notes?: string;
  attachments?: ReferralAttachment[];
  preferred_date?: string;
  assigned_to?: string;
}

export interface UpdateReferralDTO {
  id: string;
  clinical_summary?: string;
  relevant_history?: string;
  current_medications?: string;
  allergies?: string;
  clinical_questions?: string[];
  attachments?: ReferralAttachment[];
  preferred_date?: string;
}

export interface AcceptReferralDTO {
  referral_id: string;
  receiving_physician_id: string;
  acceptance_notes?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

export interface RejectReferralDTO {
  referral_id: string;
  reason: string;
}

export interface CompleteReferralDTO {
  referral_id: string;
  consultation_notes: string;
  recommendations?: string;
  follow_up_required: boolean;
  follow_up_instructions?: string;
}

// =====================================================
// QUERY PARAMETERS
// =====================================================

export interface ReferralQueryParams {
  patient_id?: string;
  visit_id?: string;
  source_department_id?: string;
  target_department_id?: string;
  from_department_id?: string;
  to_department_id?: string;
  referring_physician_id?: string;
  referring_user_id?: string;
  receiving_physician_id?: string;
  assigned_to?: string;
  status?: ReferralStatus | ReferralStatus[];
  priority?: ReferralPriority | ReferralPriority[];
  referral_type?: ReferralType;
  from_date?: string;
  to_date?: string;
  include_expired?: boolean;
  limit?: number;
}

// =====================================================
// PENDING REFERRAL VIEW
// =====================================================

export interface PendingReferral {
  id: string;
  referral_number: string;
  patient_name: string;
  referring_physician: string;
  source_department: string;
  priority: ReferralPriority;
  reason_for_referral: string;
  referred_at: string;
  response_due_by?: string;
  is_overdue: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getReferralStatusColor(status: ReferralStatus): string {
  const colors: Record<ReferralStatus, string> = {
    Pending: 'yellow',
    Accepted: 'blue',
    Rejected: 'red',
    InProgress: 'purple',
    Completed: 'green',
    Cancelled: 'gray',
  };
  return colors[status];
}

export function getReferralStatusBadgeVariant(
  status: ReferralStatus,
): 'warning' | 'info' | 'danger' | 'success' | 'neutral' {
  const variants: Record<
    ReferralStatus,
    'warning' | 'info' | 'danger' | 'success' | 'neutral'
  > = {
    Pending: 'warning',
    Accepted: 'info',
    Rejected: 'danger',
    InProgress: 'info',
    Completed: 'success',
    Cancelled: 'neutral',
  };
  return variants[status];
}

export function getReferralPriorityColor(priority: ReferralPriority): string {
  const colors: Record<ReferralPriority, string> = {
    Routine: 'green',
    Urgent: 'orange',
    Emergent: 'red',
    Stat: 'red',
  };
  return colors[priority];
}

export function getReferralTypeLabel(type: ReferralType): string {
  const labels: Record<ReferralType, string> = {
    Consultation: 'Consultation Request',
    Transfer: 'Transfer of Care',
    CoManagement: 'Co-Management',
    Procedure: 'Procedure Request',
  };
  return labels[type];
}

export function isReferralOverdue(referral: Referral): boolean {
  if (!referral.response_due_by) return false;
  if (referral.status !== 'Pending') return false;
  return new Date(referral.response_due_by) < new Date();
}

export function getTimeToDeadline(referral: Referral): string | null {
  if (!referral.response_due_by) return null;

  const deadline = new Date(referral.response_due_by);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) {
    const overdueMins = Math.abs(Math.floor(diffMs / 60000));
    if (overdueMins < 60) return `${overdueMins}m overdue`;
    const overdueHours = Math.floor(overdueMins / 60);
    return `${overdueHours}h overdue`;
  }

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m remaining`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h remaining`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d remaining`;
}

export function canAcceptReferral(referral: Referral): boolean {
  return referral.status === 'Pending';
}

export function canRejectReferral(referral: Referral): boolean {
  return referral.status === 'Pending';
}

export function canStartReferral(referral: Referral): boolean {
  return referral.status === 'Accepted';
}

export function canCompleteReferral(referral: Referral): boolean {
  return referral.status === 'Accepted' || referral.status === 'InProgress';
}

export function canCancelReferral(referral: Referral): boolean {
  return referral.status === 'Pending';
}
