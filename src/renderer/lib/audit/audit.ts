/**
 * Clinical Audit Trail System
 *
 * Provides comprehensive audit logging for all clinical actions.
 * Every modification to clinical data must be logged here.
 *
 * Enhanced with:
 * - Comprehensive audit categories and actions
 * - Severity levels for compliance monitoring
 * - Security event tracking
 * - Emergency override logging
 */

import { supabase } from '../../api/supabaseClient';

// ============================================================================
// Types - Legacy
// ============================================================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'CLOSE'
  | 'TRANSITION'
  | 'REOPEN'
  | 'DISPENSE'
  | 'COLLECT_SAMPLE'
  | 'ENTER_RESULT'
  | 'APPROVE'
  | 'REJECT';

export type EntityType =
  | 'encounter'
  | 'consultation'
  | 'vitals'
  | 'nursing_care'
  | 'lab_request'
  | 'lab_result'
  | 'radiology_request'
  | 'radiology_report'
  | 'prescription'
  | 'dispense'
  | 'billing_order'
  | 'payment'
  | 'triage'
  | 'referral'
  | 'addendum';

// ============================================================================
// Types - Enhanced
// ============================================================================

export type AuditCategory =
  | 'patient'
  | 'encounter'
  | 'clinical_note'
  | 'order'
  | 'result'
  | 'prescription'
  | 'vitals'
  | 'billing'
  | 'administration'
  | 'authentication'
  | 'access_control'
  | 'configuration'
  | 'data_export'
  | 'emergency';

export type EnhancedAuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'complete'
  | 'sign'
  | 'cosign'
  | 'transfer'
  | 'discharge'
  | 'admit'
  | 'print'
  | 'export'
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'permission_granted'
  | 'permission_revoked'
  | 'override'
  | 'acknowledge';

export type AuditSeverity =
  | 'info'
  | 'notice'
  | 'warning'
  | 'alert'
  | 'critical';

export interface EnhancedAuditLogEntry {
  category: AuditCategory;
  action: EnhancedAuditAction;
  resourceType: string;
  resourceId?: string;
  description: string;
  severity?: AuditSeverity;
  patientId?: string;
  encounterId?: string;
  resourceName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface EnhancedAuditLogRecord {
  id: string;
  category: AuditCategory;
  action: EnhancedAuditAction;
  severity: AuditSeverity;
  user_id: string | null;
  user_role: string | null;
  user_name: string | null;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  patient_id: string | null;
  patient_name: string | null;
  encounter_id: string | null;
  description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditQueryOptions {
  category?: AuditCategory;
  action?: EnhancedAuditAction;
  severity?: AuditSeverity;
  userId?: string;
  patientId?: string;
  encounterId?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  audit_id: string;
  encounter_id: string;
  patient_id: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string;
  old_value: any;
  new_value: any;
  performed_by: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
  performer?: {
    first_name: string;
    surname: string;
    role: string;
  };
}

export interface CreateAuditParams {
  encounterId: string;
  patientId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  performedBy: string;
  oldValue?: any;
  newValue?: any;
  notes?: string;
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Log a clinical action to the audit trail
 */
export async function logAudit(params: CreateAuditParams): Promise<void> {
  try {
    await supabase.from('clinical_audit_log').insert({
      encounter_id: params.encounterId,
      patient_id: params.patientId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      performed_by: params.performedBy,
      old_value: params.oldValue ? JSON.stringify(params.oldValue) : null,
      new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      notes: params.notes,
    });
  } catch (error) {
    // Log to console but don't throw - audit failures shouldn't break clinical operations
    console.error('Failed to log audit entry:', error);
  }
}

/**
 * Get audit trail for an encounter
 */
export async function getEncounterAuditTrail(
  encounterId: string,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('clinical_audit_log')
    .select(
      `
      *,
      performer:staff!performed_by(first_name, surname, role)
    `,
    )
    .eq('encounter_id', encounterId)
    .order('performed_at', { ascending: false });

  if (error) throw error;
  return data as AuditLogEntry[];
}

/**
 * Get audit trail for a patient (across all encounters)
 */
export async function getPatientAuditTrail(
  patientId: string,
  limit: number = 100,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('clinical_audit_log')
    .select(
      `
      *,
      performer:staff!performed_by(first_name, surname, role)
    `,
    )
    .eq('patient_id', patientId)
    .order('performed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as AuditLogEntry[];
}

/**
 * Get audit trail for a specific entity
 */
export async function getEntityAuditTrail(
  entityType: EntityType,
  entityId: string,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('clinical_audit_log')
    .select(
      `
      *,
      performer:staff!performed_by(first_name, surname, role)
    `,
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('performed_at', { ascending: false });

  if (error) throw error;
  return data as AuditLogEntry[];
}

/**
 * Get audit trail by performer
 */
export async function getPerformerAuditTrail(
  performerId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('clinical_audit_log')
    .select(
      `
      *,
      performer:staff!performed_by(first_name, surname, role)
    `,
    )
    .eq('performed_by', performerId)
    .order('performed_at', { ascending: false });

  if (dateFrom) {
    query = query.gte('performed_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('performed_at', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as AuditLogEntry[];
}

// ============================================================================
// Audit Helper Functions
// ============================================================================

/**
 * Create audit entry for a new record creation
 */
export async function auditCreate(params: {
  encounterId: string;
  patientId: string;
  entityType: EntityType;
  entityId: string;
  performedBy: string;
  data: any;
}): Promise<void> {
  await logAudit({
    encounterId: params.encounterId,
    patientId: params.patientId,
    action: 'CREATE',
    entityType: params.entityType,
    entityId: params.entityId,
    performedBy: params.performedBy,
    newValue: params.data,
  });
}

/**
 * Create audit entry for a record update
 */
export async function auditUpdate(params: {
  encounterId: string;
  patientId: string;
  entityType: EntityType;
  entityId: string;
  performedBy: string;
  oldData: any;
  newData: any;
}): Promise<void> {
  await logAudit({
    encounterId: params.encounterId,
    patientId: params.patientId,
    action: 'UPDATE',
    entityType: params.entityType,
    entityId: params.entityId,
    performedBy: params.performedBy,
    oldValue: params.oldData,
    newValue: params.newData,
  });
}

/**
 * Create audit entry for viewing sensitive data
 */
export async function auditView(params: {
  encounterId: string;
  patientId: string;
  entityType: EntityType;
  entityId: string;
  performedBy: string;
}): Promise<void> {
  await logAudit({
    encounterId: params.encounterId,
    patientId: params.patientId,
    action: 'VIEW',
    entityType: params.entityType,
    entityId: params.entityId,
    performedBy: params.performedBy,
  });
}

// ============================================================================
// Audit Report Functions
// ============================================================================

export interface AuditSummary {
  totalActions: number;
  actionsByType: Record<AuditAction, number>;
  actionsByEntity: Record<EntityType, number>;
  recentActions: AuditLogEntry[];
}

/**
 * Get audit summary for a date range
 */
export async function getAuditSummary(
  dateFrom: string,
  dateTo: string,
): Promise<AuditSummary> {
  const { data, error } = await supabase
    .from('clinical_audit_log')
    .select('*')
    .gte('performed_at', dateFrom)
    .lte('performed_at', dateTo);

  if (error) throw error;

  const entries = data as AuditLogEntry[];

  // Calculate summaries
  const actionsByType = entries.reduce(
    (acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    },
    {} as Record<AuditAction, number>,
  );

  const actionsByEntity = entries.reduce(
    (acc, entry) => {
      acc[entry.entity_type] = (acc[entry.entity_type] || 0) + 1;
      return acc;
    },
    {} as Record<EntityType, number>,
  );

  return {
    totalActions: entries.length,
    actionsByType,
    actionsByEntity,
    recentActions: entries.slice(0, 20),
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  logAudit,
  getEncounterAuditTrail,
  getPatientAuditTrail,
  getEntityAuditTrail,
  getPerformerAuditTrail,
  auditCreate,
  auditUpdate,
  auditView,
  getAuditSummary,
  // Enhanced functions
  logClinicalAction,
  logPatientAccess,
  logAuthEvent,
  logEmergencyOverride,
  queryEnhancedAuditLogs,
  getSecurityEvents,
  getRecentAuditEvents,
  getChangedFields,
  createAuditSnapshot,
};

// ============================================================================
// Enhanced Audit Functions
// ============================================================================

/**
 * Log a clinical action to the enhanced audit trail
 *
 * @example
 * // Log a lab order creation
 * await logClinicalAction({
 *   category: 'order',
 *   action: 'create',
 *   resourceType: 'lab_request',
 *   resourceId: request.id,
 *   description: `Lab test ordered: ${testName}`,
 *   patientId: patient.patient_id,
 *   encounterId: encounter.id,
 * });
 */
export async function logClinicalAction(
  entry: EnhancedAuditLogEntry,
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('log_audit_event', {
      p_category: entry.category,
      p_action: entry.action,
      p_resource_type: entry.resourceType,
      p_resource_id: entry.resourceId || null,
      p_description: entry.description,
      p_severity: entry.severity || 'info',
      p_user_id: user?.id || null,
      p_patient_id: entry.patientId || null,
      p_encounter_id: entry.encounterId || null,
      p_resource_name: entry.resourceName || null,
      p_old_values: entry.oldValues || null,
      p_new_values: entry.newValues || null,
      p_changed_fields: entry.changedFields || null,
      p_reason: entry.reason || null,
      p_metadata: entry.metadata || {},
    });

    if (error) {
      console.error('Failed to log enhanced audit event:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('Enhanced audit logging error:', error);
    return null;
  }
}

/**
 * Log access to patient records (for compliance tracking)
 */
export async function logPatientAccess(
  patientId: string,
  resourceType: string,
  resourceId?: string,
  reason?: string,
): Promise<void> {
  await logClinicalAction({
    category: 'patient',
    action: 'read',
    resourceType,
    resourceId,
    patientId,
    description: `Accessed patient ${resourceType}`,
    severity: 'info',
    reason,
  });
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(
  action: 'login' | 'logout' | 'failed_login',
  userId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const descriptions: Record<typeof action, string> = {
    login: 'User logged in successfully',
    logout: 'User logged out',
    failed_login: 'Failed login attempt',
  };

  await logClinicalAction({
    category: 'authentication',
    action,
    resourceType: 'session',
    description: descriptions[action],
    severity: action === 'failed_login' ? 'warning' : 'info',
    metadata: {
      ...metadata,
      userId,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log an emergency override action (requires reason)
 */
export async function logEmergencyOverride(
  resourceType: string,
  resourceId: string,
  description: string,
  reason: string,
  patientId?: string,
  encounterId?: string,
): Promise<void> {
  await logClinicalAction({
    category: 'emergency',
    action: 'override',
    resourceType,
    resourceId,
    description,
    patientId,
    encounterId,
    reason,
    severity: 'critical',
    metadata: {
      overrideTimestamp: new Date().toISOString(),
    },
  });
}

/**
 * Query enhanced audit logs with filters
 */
export async function queryEnhancedAuditLogs(
  options: AuditQueryOptions = {},
): Promise<{ data: EnhancedAuditLogRecord[]; count: number | null }> {
  const {
    category,
    action,
    severity,
    userId,
    patientId,
    encounterId,
    resourceType,
    resourceId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (action) query = query.eq('action', action);
  if (severity) query = query.eq('severity', severity);
  if (userId) query = query.eq('user_id', userId);
  if (patientId) query = query.eq('patient_id', patientId);
  if (encounterId) query = query.eq('encounter_id', encounterId);
  if (resourceType) query = query.eq('resource_type', resourceType);
  if (resourceId) query = query.eq('resource_id', resourceId);
  if (startDate) query = query.gte('created_at', startDate.toISOString());
  if (endDate) query = query.lte('created_at', endDate.toISOString());

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to query audit logs: ${error.message}`);

  return { data: data || [], count };
}

/**
 * Get security-related events
 */
export async function getSecurityEvents(
  limit = 100,
): Promise<EnhancedAuditLogRecord[]> {
  const { data, error } = await supabase
    .from('security_audit_events')
    .select('*')
    .limit(limit);

  if (error) throw new Error(`Failed to get security events: ${error.message}`);
  return data || [];
}

/**
 * Get recent audit events (last 24 hours)
 */
export async function getRecentAuditEvents(
  limit = 100,
): Promise<EnhancedAuditLogRecord[]> {
  const { data, error } = await supabase
    .from('recent_audit_events')
    .select('*')
    .limit(limit);

  if (error) throw new Error(`Failed to get recent events: ${error.message}`);
  return data || [];
}

/**
 * Calculate changed fields between old and new values
 */
export function getChangedFields(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  const allKeys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);

  for (const key of allKeys) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Create an audit-friendly snapshot of an object (removes sensitive fields)
 */
export function createAuditSnapshot<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ['password', 'token', 'secret', 'pin'],
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
      snapshot[key] = '[REDACTED]';
    } else {
      snapshot[key] = value;
    }
  }

  return snapshot;
}
