// Workflow Exception Types for EMR System
// Generated: December 20, 2025

// =====================================================
// ENUMS
// =====================================================

export type ExceptionType =
  | 'PaymentOverride'
  | 'QueueSkip'
  | 'PriorityChange'
  | 'TriageOverride'
  | 'AccessException'
  | 'ResultAmendment'
  | 'OrderCancellation'
  | 'DiscountApproval'
  | 'RefundApproval'
  | 'ScheduleOverride'
  | 'MedicationOverride'
  | 'PolicyException'
  | 'RoleElevation'
  | 'SystemOverride'
  | 'Other';

export type ExceptionStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'AutoApproved'
  | 'Executed';

export type ExceptionSeverity = 'Low' | 'Normal' | 'High' | 'Critical';

export type RiskLevel = 'Low' | 'Medium' | 'High';

// =====================================================
// WORKFLOW EXCEPTION TYPES
// =====================================================

export interface WorkflowException {
  id: string;
  exception_number: string;

  // Classification
  exception_type: ExceptionType;
  category?: string;
  severity: ExceptionSeverity;

  // Entity reference
  entity_type: string;
  entity_id: string;
  entity_reference?: string;

  // State change
  original_state: Record<string, unknown>;
  new_state: Record<string, unknown>;

  // Justification
  reason: string;
  justification?: string;
  supporting_documents: SupportingDocument[];

  // Actors
  requested_by: string;
  executed_by?: string;
  approved_by?: string;
  rejected_by?: string;

  // Status
  status: ExceptionStatus;
  status_reason?: string;

  // Approval chain
  required_approval_role?: string;
  approval_deadline?: string;

  // Risk assessment
  risk_level?: RiskLevel;
  financial_impact?: number;
  patient_impact_notes?: string;

  // Timestamps
  requested_at: string;
  approved_at?: string;
  rejected_at?: string;
  executed_at: string;

  // Session context
  session_id?: string;
  ip_address?: string;
  user_agent?: string;

  // Metadata
  metadata: Record<string, unknown>;

  created_at: string;
  created_by?: string;
}

export interface SupportingDocument {
  name: string;
  type: string;
  path?: string;
  id?: string;
}

export interface WorkflowExceptionWithDetails extends WorkflowException {
  requested_by_user: {
    id: string;
    full_name: string;
    role: string;
  };
  executed_by_user?: {
    id: string;
    full_name: string;
    role: string;
  };
  approved_by_user?: {
    id: string;
    full_name: string;
    role: string;
  };
}

// =====================================================
// EXCEPTION RULES
// =====================================================

export interface ExceptionRule {
  id: string;
  name: string;
  description?: string;
  exception_type: ExceptionType;
  conditions: ExceptionConditions;
  auto_approve: boolean;
  required_approval_role?: string;
  notification_roles?: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ExceptionConditions {
  max_financial_impact?: number;
  min_financial_impact?: number;
  allowed_roles?: string[];
  allowed_departments?: string[];
  time_window?: {
    start: string;
    end: string;
  };
  direction?: 'upgrade' | 'downgrade';
  [key: string]: unknown;
}

// =====================================================
// CREATE/UPDATE DTOs
// =====================================================

export interface CreateExceptionDTO {
  exception_type: ExceptionType;
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  original_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  reason: string;
  justification?: string;
  supporting_documents?: SupportingDocument[];
  severity?: ExceptionSeverity;
  financial_impact?: number;
  patient_impact_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ApproveExceptionDTO {
  exception_id: string;
  notes?: string;
}

export interface RejectExceptionDTO {
  exception_id: string;
  reason: string;
}

// =====================================================
// QUERY PARAMETERS
// =====================================================

export interface ExceptionQueryParams {
  exception_type?: ExceptionType | ExceptionType[];
  entity_type?: string;
  entity_id?: string;
  status?: ExceptionStatus | ExceptionStatus[];
  severity?: ExceptionSeverity | ExceptionSeverity[];
  requested_by?: string;
  executed_by?: string;
  from_date?: string;
  to_date?: string;
  has_financial_impact?: boolean;
}

// =====================================================
// EXCEPTION SUMMARY
// =====================================================

export interface ExceptionSummary {
  exception_type: ExceptionType;
  total_count: number;
  auto_approved_count: number;
  pending_count: number;
  high_severity_count: number;
  total_financial_impact: number;
}

export interface ExceptionAuditEntry {
  exception_number: string;
  exception_type: ExceptionType;
  entity_type: string;
  entity_reference?: string;
  reason: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  executed_by_name?: string;
  approved_by_name?: string;
  executed_at: string;
  financial_impact?: number;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getExceptionTypeLabel(type: ExceptionType): string {
  const labels: Record<ExceptionType, string> = {
    PaymentOverride: 'Payment Override',
    QueueSkip: 'Queue Skip',
    PriorityChange: 'Priority Change',
    TriageOverride: 'Triage Override',
    AccessException: 'Access Exception',
    ResultAmendment: 'Result Amendment',
    OrderCancellation: 'Order Cancellation',
    DiscountApproval: 'Discount Approval',
    RefundApproval: 'Refund Approval',
    ScheduleOverride: 'Schedule Override',
    MedicationOverride: 'Medication Override',
    PolicyException: 'Policy Exception',
    RoleElevation: 'Role Elevation',
    SystemOverride: 'System Override',
    Other: 'Other',
  };
  return labels[type];
}

export function getExceptionTypeIcon(type: ExceptionType): string {
  const icons: Record<ExceptionType, string> = {
    PaymentOverride: '💰',
    QueueSkip: '⏭️',
    PriorityChange: '📊',
    TriageOverride: '🏥',
    AccessException: '🔐',
    ResultAmendment: '📝',
    OrderCancellation: '❌',
    DiscountApproval: '🏷️',
    RefundApproval: '💵',
    ScheduleOverride: '📅',
    MedicationOverride: '💊',
    PolicyException: '📋',
    RoleElevation: '👤',
    SystemOverride: '⚙️',
    Other: '📌',
  };
  return icons[type];
}

export function getExceptionSeverityColor(severity: ExceptionSeverity): string {
  const colors: Record<ExceptionSeverity, string> = {
    Low: 'gray',
    Normal: 'blue',
    High: 'orange',
    Critical: 'red',
  };
  return colors[severity];
}

export function getExceptionSeverityBadgeVariant(
  severity: ExceptionSeverity,
): 'neutral' | 'info' | 'warning' | 'danger' {
  const variants: Record<
    ExceptionSeverity,
    'neutral' | 'info' | 'warning' | 'danger'
  > = {
    Low: 'neutral',
    Normal: 'info',
    High: 'warning',
    Critical: 'danger',
  };
  return variants[severity];
}

export function getExceptionStatusColor(status: ExceptionStatus): string {
  const colors: Record<ExceptionStatus, string> = {
    Pending: 'yellow',
    Approved: 'green',
    Rejected: 'red',
    AutoApproved: 'blue',
    Executed: 'gray',
  };
  return colors[status];
}

export function getExceptionStatusBadgeVariant(
  status: ExceptionStatus,
): 'warning' | 'success' | 'danger' | 'info' | 'neutral' {
  const variants: Record<
    ExceptionStatus,
    'warning' | 'success' | 'danger' | 'info' | 'neutral'
  > = {
    Pending: 'warning',
    Approved: 'success',
    Rejected: 'danger',
    AutoApproved: 'info',
    Executed: 'neutral',
  };
  return variants[status];
}

export function formatFinancialImpact(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

export function requiresApproval(exception: WorkflowException): boolean {
  return (
    exception.status === 'Pending' && exception.required_approval_role !== null
  );
}

export function isHighRisk(exception: WorkflowException): boolean {
  return exception.severity === 'High' || exception.severity === 'Critical';
}

export function hasFinancialImpact(exception: WorkflowException): boolean {
  return (
    exception.financial_impact !== undefined && exception.financial_impact > 0
  );
}

// =====================================================
// SHORTCUT FUNCTIONS FOR CREATING SPECIFIC EXCEPTIONS
// =====================================================

export function createPaymentOverrideData(
  visitId: string,
  originalAmount: number,
  overrideAmount: number,
  reason: string,
): CreateExceptionDTO {
  return {
    exception_type: 'PaymentOverride',
    entity_type: 'visit',
    entity_id: visitId,
    original_state: { required_amount: originalAmount },
    new_state: {
      paid_amount: overrideAmount,
      waived_amount: originalAmount - overrideAmount,
    },
    reason,
    severity: originalAmount - overrideAmount > 10000 ? 'High' : 'Normal',
    financial_impact: originalAmount - overrideAmount,
  };
}

export function createQueueSkipData(
  queueId: string,
  patientId: string,
  originalPosition: number,
  newPosition: number,
  reason: string,
): CreateExceptionDTO {
  return {
    exception_type: 'QueueSkip',
    entity_type: 'queue',
    entity_id: queueId,
    original_state: { position: originalPosition },
    new_state: { position: newPosition, patient_id: patientId },
    reason,
    severity: 'Normal',
  };
}

export function createTriageOverrideData(
  triageId: string,
  calculatedESI: number,
  assignedESI: number,
  reason: string,
): CreateExceptionDTO {
  return {
    exception_type: 'TriageOverride',
    entity_type: 'triage',
    entity_id: triageId,
    original_state: { calculated_esi: calculatedESI },
    new_state: { assigned_esi: assignedESI },
    reason,
    // Downgrade is higher risk
    severity: assignedESI > calculatedESI ? 'High' : 'Normal',
  };
}

export function createResultAmendmentData(
  resultId: string,
  resultType: string,
  originalValue: string,
  newValue: string,
  reason: string,
): CreateExceptionDTO {
  return {
    exception_type: 'ResultAmendment',
    entity_type: resultType,
    entity_id: resultId,
    original_state: { value: originalValue },
    new_state: { value: newValue, amendment_type: 'correction' },
    reason,
    severity: 'High',
  };
}
