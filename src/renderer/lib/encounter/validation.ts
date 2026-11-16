/**
 * Encounter Validation Utilities
 *
 * These utilities ensure encounter-centric architecture is enforced
 * across all clinical modules. Every clinical action must validate
 * the encounter before proceeding.
 *
 * HIERARCHY ENFORCEMENT:
 * - Every record MUST be tied to a valid encounter (visit_id)
 * - Every encounter MUST be tied to a valid EMR number (patient)
 * - No record can exist without both valid EMR number AND encounter
 */

import { supabase } from '../../api/supabaseClient';

// ============================================================================
// Types
// ============================================================================

export type EncounterStatus =
  | 'Created'
  | 'Active'
  | 'Completed'
  | 'Closed'
  | 'Cancelled';

export interface Encounter {
  visit_id: string;
  patient_id: string;
  status: EncounterStatus;
  current_stage: string;
  visit_type: string;
  payment_category: string;
  priority: string;
  chief_complaint: string | null;
  start_time: string;
  end_time: string | null;
  attending_doctor_id: string | null;
  registered_by: string | null;
  closed_by: string | null;
  closed_reason: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EncounterSummary extends Encounter {
  file_number: string;
  patient_name: string;
  encounter_number: string;
  encounter_id: string; // Alias for visit_id
  encounter_status: EncounterStatus; // Alias for status
  attending_doctor_name: string | null;
  consultation_count: number;
  vitals_count: number;
  lab_order_count: number;
  radiology_order_count: number;
  prescription_count: number;
  billing_order_count: number;
  is_active: boolean;
  duration_minutes: number;
}

export interface EncounterValidationResult {
  isValid: boolean;
  encounter: Encounter | null;
  error?: string;
  errorCode?:
    | 'NOT_FOUND'
    | 'CLOSED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'UNAUTHORIZED';
}

export interface CloseEncounterParams {
  encounterId: string;
  closedBy: string;
  finalDiagnosis?: string;
  dischargeNotes?: string;
  closedReason?: string;
}

export interface ReopenEncounterParams {
  encounterId: string;
  reopenedBy: string;
  reason: string;
}

export interface CreateAddendumParams {
  encounterId: string;
  patientId: string;
  addendumType:
    | 'clinical_note'
    | 'correction'
    | 'late_result'
    | 'administrative';
  content: string;
  referenceEntityType?: string;
  referenceEntityId?: string;
  createdBy: string;
}

// ============================================================================
// EMR → Encounter → Record Hierarchy Validation Types
// ============================================================================

export type RecordType =
  | 'consultation'
  | 'vitals'
  | 'lab_request'
  | 'radiology_request'
  | 'prescription'
  | 'nursing_note'
  | 'billing_order'
  | 'treatment_plan';

export interface RecordLinkageValidation {
  isValid: boolean;
  patientId: string | null;
  encounterId: string | null;
  emrNumber: string | null;
  error?: string;
  errorCode?:
    | 'MISSING_EMR'
    | 'MISSING_ENCOUNTER'
    | 'INVALID_EMR'
    | 'INVALID_ENCOUNTER'
    | 'LINKAGE_MISMATCH'
    | 'ENCOUNTER_CLOSED';
}

export interface CreateRecordParams {
  recordType: RecordType;
  patientId: string; // Required - EMR linkage
  encounterId: string; // Required - Encounter linkage
  data: Record<string, any>;
  createdBy: string;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Fetches an encounter by ID
 * Supports both UUID (id column) and VARCHAR (visit_id column) lookups
 */
export async function getEncounter(
  encounterId: string,
): Promise<Encounter | null> {
  // First try lookup by visit_id (VARCHAR identifier like "V-2024-001")
  const { data: byVisitId, error: visitIdError } = await supabase
    .from('visits')
    .select('*')
    .eq('visit_id', encounterId)
    .maybeSingle();

  if (byVisitId) {
    return byVisitId as Encounter;
  }

  // If not found, try lookup by id (UUID primary key)
  const { data: byId, error: idError } = await supabase
    .from('visits')
    .select('*')
    .eq('id', encounterId)
    .maybeSingle();

  if (byId) {
    return byId as Encounter;
  }

  // Not found by either method
  console.warn(
    '[getEncounter] Encounter not found by visit_id or id:',
    encounterId,
  );
  return null;
}

/**
 * Fetches encounter summary with all counts
 */
export async function getEncounterSummary(
  encounterId: string,
): Promise<EncounterSummary | null> {
  const { data, error } = await supabase
    .from('encounter_summary')
    .select('*')
    .eq('encounter_id', encounterId)
    .single();

  if (error || !data) {
    return null;
  }

  // Map database fields to interface
  const summary: EncounterSummary = {
    ...data,
    encounter_id: data.encounter_id || data.visit_id,
    encounter_status: data.encounter_status || data.status,
  } as EncounterSummary;

  return summary;
}

/**
 * Validates that an encounter exists and is in a modifiable state
 * Call this before ANY clinical data modification
 */
export async function validateEncounterForModification(
  encounterId: string,
): Promise<EncounterValidationResult> {
  if (!encounterId) {
    return {
      isValid: false,
      encounter: null,
      error: 'encounter_id is required for all clinical data',
      errorCode: 'NOT_FOUND',
    };
  }

  const encounter = await getEncounter(encounterId);

  if (!encounter) {
    return {
      isValid: false,
      encounter: null,
      error: `Encounter not found: ${encounterId}`,
      errorCode: 'NOT_FOUND',
    };
  }

  if (encounter.status === 'Closed' || encounter.status === 'Completed') {
    return {
      isValid: false,
      encounter,
      error: 'Cannot modify data on a closed encounter',
      errorCode: 'CLOSED',
    };
  }

  if (encounter.status === 'Cancelled') {
    return {
      isValid: false,
      encounter,
      error: 'Cannot modify data on a cancelled encounter',
      errorCode: 'CANCELLED',
    };
  }

  return {
    isValid: true,
    encounter,
  };
}

/**
 * Checks if an encounter is active (can be modified)
 */
export function isEncounterActive(status: EncounterStatus): boolean {
  return status === 'Active' || status === 'Created';
}

/**
 * Checks if an encounter is closed (read-only)
 */
export function isEncounterClosed(status: EncounterStatus): boolean {
  return (
    status === 'Closed' || status === 'Completed' || status === 'Cancelled'
  );
}

/**
 * Validates patient_id matches the encounter's patient
 */
export async function validatePatientEncounterMatch(
  patientId: string,
  encounterId: string,
): Promise<boolean> {
  const encounter = await getEncounter(encounterId);

  if (!encounter) {
    return false;
  }

  return encounter.patient_id === patientId;
}

// ============================================================================
// EMR → Encounter → Record Hierarchy Enforcement
// ============================================================================

/**
 * Validates that a patient exists and has a valid EMR number
 */
export async function validateEmrNumber(patientId: string): Promise<{
  isValid: boolean;
  emrNumber: string | null;
  patientUuid: string | null;
  error?: string;
}> {
  if (!patientId) {
    return {
      isValid: false,
      emrNumber: null,
      patientUuid: null,
      error: 'Patient ID (EMR number) is required',
    };
  }

  // Try to find patient by id, patient_id, or emr_number
  const { data, error } = await supabase
    .from('patients')
    .select('id, patient_id, emr_number')
    .or(
      `id.eq.${patientId},patient_id.eq.${patientId},emr_number.eq.${patientId}`,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    // Fallback to specific lookups if OR query fails
    const { data: byPatientId } = await supabase
      .from('patients')
      .select('id, patient_id, emr_number')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (byPatientId) {
      return {
        isValid: true,
        emrNumber: byPatientId.emr_number || byPatientId.patient_id,
        patientUuid: byPatientId.id,
      };
    }

    const { data: byEmr } = await supabase
      .from('patients')
      .select('id, patient_id, emr_number')
      .eq('emr_number', patientId)
      .maybeSingle();

    if (byEmr) {
      return {
        isValid: true,
        emrNumber: byEmr.emr_number || byEmr.patient_id,
        patientUuid: byEmr.id,
      };
    }

    return {
      isValid: false,
      emrNumber: null,
      patientUuid: null,
      error: `Invalid EMR number: Patient not found for identifier "${patientId}"`,
    };
  }

  if (!data) {
    return {
      isValid: false,
      emrNumber: null,
      patientUuid: null,
      error: `Invalid EMR number: Patient not found for identifier "${patientId}"`,
    };
  }

  return {
    isValid: true,
    emrNumber: data.emr_number || data.patient_id,
    patientUuid: data.id,
  };
}

/**
 * Validates that an encounter exists and is tied to the correct patient
 */
export async function validateEncounterLinkage(
  encounterId: string,
  expectedPatientId?: string,
): Promise<{
  isValid: boolean;
  encounter: Encounter | null;
  patientId: string | null;
  error?: string;
}> {
  if (!encounterId) {
    return {
      isValid: false,
      encounter: null,
      patientId: null,
      error: 'Encounter ID is required for all clinical records',
    };
  }

  // Get encounter - try both id and visit_id
  let { data: encounter, error } = await supabase
    .from('visits')
    .select('*')
    .eq('id', encounterId)
    .maybeSingle();

  if (!encounter) {
    const result = await supabase
      .from('visits')
      .select('*')
      .eq('visit_id', encounterId)
      .maybeSingle();
    encounter = result.data;
    error = result.error;
  }

  if (error || !encounter) {
    return {
      isValid: false,
      encounter: null,
      patientId: null,
      error: `Invalid encounter: Encounter not found for ID "${encounterId}"`,
    };
  }

  // If expected patient provided, verify match
  if (expectedPatientId) {
    const patientMatch = encounter.patient_id === expectedPatientId;

    if (!patientMatch) {
      // Also check if the expected ID matches the patient's other identifiers
      const { data: patient } = await supabase
        .from('patients')
        .select('id, patient_id, emr_number')
        .eq('id', encounter.patient_id)
        .maybeSingle();

      const isMatchByExternalId = patient?.patient_id === expectedPatientId;
      const isMatchByEmr = patient?.emr_number === expectedPatientId;

      if (!isMatchByExternalId && !isMatchByEmr) {
        return {
          isValid: false,
          encounter: encounter as Encounter,
          patientId: encounter.patient_id,
          error: `Linkage mismatch: Encounter ${encounterId} belongs to patient ${encounter.patient_id}, not ${expectedPatientId}`,
        };
      }
    }
  }

  return {
    isValid: true,
    encounter: encounter as Encounter,
    patientId: encounter.patient_id,
  };
}

/**
 * MASTER VALIDATION: Validates the complete EMR → Encounter → Record hierarchy
 * Call this BEFORE creating or updating ANY clinical record
 */
export async function validateRecordLinkage(
  patientId: string,
  encounterId: string,
  options?: {
    allowClosedEncounter?: boolean;
    recordType?: RecordType;
  },
): Promise<RecordLinkageValidation> {
  console.log(
    '[Validation] Validating record linkage - Patient:',
    patientId,
    'Encounter:',
    encounterId,
  );

  // Step 1: Validate EMR number exists
  if (!patientId) {
    return {
      isValid: false,
      patientId: null,
      encounterId: null,
      emrNumber: null,
      error:
        'Patient ID (EMR number) is required - no record can exist without a valid patient',
      errorCode: 'MISSING_EMR',
    };
  }

  const emrValidation = await validateEmrNumber(patientId);
  if (!emrValidation.isValid) {
    return {
      isValid: false,
      patientId: null,
      encounterId: null,
      emrNumber: null,
      error: emrValidation.error,
      errorCode: 'INVALID_EMR',
    };
  }

  // Step 2: Validate encounter exists
  if (!encounterId) {
    return {
      isValid: false,
      patientId: emrValidation.patientUuid,
      encounterId: null,
      emrNumber: emrValidation.emrNumber,
      error:
        'Encounter ID is required - no record can exist without a valid encounter',
      errorCode: 'MISSING_ENCOUNTER',
    };
  }

  const encounterValidation = await validateEncounterLinkage(
    encounterId,
    emrValidation.patientUuid!,
  );
  if (!encounterValidation.isValid) {
    return {
      isValid: false,
      patientId: emrValidation.patientUuid,
      encounterId: null,
      emrNumber: emrValidation.emrNumber,
      error: encounterValidation.error,
      errorCode: 'INVALID_ENCOUNTER',
    };
  }

  // Step 3: Verify encounter belongs to patient (double-check)
  if (encounterValidation.patientId !== emrValidation.patientUuid) {
    return {
      isValid: false,
      patientId: emrValidation.patientUuid,
      encounterId,
      emrNumber: emrValidation.emrNumber,
      error: `Linkage mismatch: Encounter does not belong to the specified patient`,
      errorCode: 'LINKAGE_MISMATCH',
    };
  }

  // Step 4: Check encounter status (unless explicitly allowed)
  if (!options?.allowClosedEncounter) {
    const encounter = encounterValidation.encounter!;
    if (isEncounterClosed(encounter.status)) {
      return {
        isValid: false,
        patientId: emrValidation.patientUuid,
        encounterId,
        emrNumber: emrValidation.emrNumber,
        error: `Cannot add records to ${encounter.status.toLowerCase()} encounter. Use addendum for closed encounters.`,
        errorCode: 'ENCOUNTER_CLOSED',
      };
    }
  }

  console.log(
    '[Validation] Record linkage valid - EMR:',
    emrValidation.emrNumber,
    'Encounter:',
    encounterId,
  );

  return {
    isValid: true,
    patientId: emrValidation.patientUuid,
    encounterId,
    emrNumber: emrValidation.emrNumber,
  };
}

/**
 * Wrapper to enforce linkage on record creation
 * Use this to wrap any function that creates clinical records
 */
export function enforceRecordLinkage<
  T extends {
    patient_id?: string;
    patientId?: string;
    encounter_id?: string;
    encounterId?: string;
    visit_id?: string;
  },
>(
  fn: (params: T) => Promise<any>,
  options?: { allowClosedEncounter?: boolean; recordType?: RecordType },
) {
  return async (params: T) => {
    const patientId = params.patient_id || params.patientId;
    const encounterId =
      params.encounter_id || params.encounterId || params.visit_id;

    const validation = await validateRecordLinkage(
      patientId || '',
      encounterId || '',
      options,
    );

    if (!validation.isValid) {
      const error = new Error(validation.error);
      (error as any).code = validation.errorCode;
      (error as any).validation = validation;
      throw error;
    }

    // Ensure the params have the resolved IDs
    return fn({
      ...params,
      patient_id: validation.patientId,
      encounter_id: validation.encounterId,
    } as T);
  };
}

/**
 * Validates record before update - ensures the record exists and linkage is valid
 */
export async function validateRecordUpdate(
  tableName: string,
  recordId: string,
  idColumn: string = 'id',
): Promise<RecordLinkageValidation> {
  // Get the existing record to verify its linkage
  const { data: record, error } = await supabase
    .from(tableName)
    .select('patient_id, visit_id, encounter_id')
    .eq(idColumn, recordId)
    .maybeSingle();

  if (error || !record) {
    return {
      isValid: false,
      patientId: null,
      encounterId: null,
      emrNumber: null,
      error: `Record not found in ${tableName} with ${idColumn}=${recordId}`,
      errorCode: 'INVALID_ENCOUNTER',
    };
  }

  const encounterId = record.encounter_id || record.visit_id;

  return validateRecordLinkage(record.patient_id, encounterId);
}

/**
 * Batch validate multiple records for the same encounter
 */
export async function validateBatchRecordLinkage(
  patientId: string,
  encounterId: string,
  recordCount: number,
): Promise<RecordLinkageValidation & { batchSize: number }> {
  const validation = await validateRecordLinkage(patientId, encounterId);

  return {
    ...validation,
    batchSize: recordCount,
  };
}

// ============================================================================
// Encounter Lifecycle Functions
// ============================================================================

/**
 * Close an encounter using the PostgreSQL function
 */
export async function closeEncounter(params: CloseEncounterParams): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('close_encounter', {
    p_encounter_id: params.encounterId,
    p_closed_by: params.closedBy,
    p_final_diagnosis: params.finalDiagnosis || null,
    p_discharge_notes: params.dischargeNotes || null,
    p_closed_reason: params.closedReason || 'Normal discharge',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result };
}

/**
 * Reopen a closed encounter (admin only)
 */
export async function reopenEncounter(params: ReopenEncounterParams): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { data, error } = await supabase.rpc('reopen_encounter', {
    p_encounter_id: params.encounterId,
    p_reopened_by: params.reopenedBy,
    p_reason: params.reason,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string };

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result };
}

// ============================================================================
// Addendum Functions (for notes after closure)
// ============================================================================

/**
 * Create an addendum for a closed encounter
 */
export async function createAddendum(params: CreateAddendumParams): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { data, error } = await supabase
    .from('encounter_addendums')
    .insert({
      encounter_id: params.encounterId,
      patient_id: params.patientId,
      addendum_type: params.addendumType,
      content: params.content,
      reference_entity_type: params.referenceEntityType || null,
      reference_entity_id: params.referenceEntityId || null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get all addendums for an encounter
 */
export async function getEncounterAddendums(encounterId: string) {
  const { data, error } = await supabase
    .from('encounter_addendums')
    .select(
      `
      *,
      creator:staff!created_by(first_name, surname, role),
      approver:staff!approved_by(first_name, surname, role)
    `,
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Approve an addendum (admin only)
 */
export async function approveAddendum(
  addendumId: string,
  approvedBy: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('encounter_addendums')
    .update({
      is_approved: true,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('addendum_id', addendumId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Log a clinical action to the audit trail
 */
export async function logClinicalAction(params: {
  encounterId: string;
  patientId: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'VIEW'
    | 'CLOSE'
    | 'TRANSITION'
    | 'REOPEN';
  entityType: string;
  entityId: string;
  performedBy: string;
  oldValue?: any;
  newValue?: any;
  notes?: string;
}): Promise<void> {
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
}

/**
 * Get audit trail for an encounter
 */
export async function getEncounterAuditTrail(encounterId: string) {
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

  if (error) {
    throw error;
  }

  return data;
}

// ============================================================================
// Encounter Query Functions
// ============================================================================

/**
 * Get all encounters for a patient
 */
export async function getPatientEncounters(patientId: string) {
  const { data, error } = await supabase
    .from('encounter_summary')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as EncounterSummary[];
}

/**
 * Get active encounters (for dashboard/queue)
 */
export async function getActiveEncounters() {
  const { data, error } = await supabase
    .from('encounter_summary')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data as EncounterSummary[];
}

/**
 * Get encounters by stage
 */
export async function getEncountersByStage(stage: string) {
  const { data, error } = await supabase
    .from('encounter_summary')
    .select('*')
    .eq('current_stage', stage)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data as EncounterSummary[];
}

// ============================================================================
// Encounter Continuation - Find patient's most recent continuable encounter
// ============================================================================

/**
 * Get the patient's most recent encounter that can be continued.
 *
 * Standard EMR Practice:
 * - OPD encounters: Can be continued within 48 hours if still Active
 * - In-Patient encounters: Can be continued throughout the admission
 * - Only encounters in certain stages can receive new orders
 *
 * This prevents manipulation by:
 * 1. Time-bounding OPD encounters
 * 2. Enforcing stage-based restrictions
 * 3. Requiring encounters to be "Active" status
 *
 * @param patientId - The patient's UUID
 * @param encounterType - Filter by encounter type (OPD, In-Patient, Emergency)
 * @returns The most recent continuable encounter or null if none exists
 */
export async function getPatientRecentContinuableEncounter(
  patientId: string,
  encounterType?: 'OPD' | 'In-Patient' | 'Emergency',
): Promise<EncounterSummary | null> {
  // Stages that are "closed" - no more orders allowed
  const closedStages = ['completed', 'billing_final'];

  // Check if patient has an active admission — if so, skip time filter
  let hasActiveAdmission = false;
  const { data: admission } = await supabase
    .from('admissions')
    .select('id')
    .eq('patient_id', patientId)
    .eq('admission_status', 'admitted')
    .maybeSingle();
  hasActiveAdmission = !!admission;

  // Maximum age for OPD/Emergency encounters (48 hours)
  // In-Patient or admitted patients have no time limit
  const maxAgeHours =
    encounterType === 'In-Patient' || hasActiveAdmission ? 0 : 48;

  let query = supabase
    .from('encounter_summary')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'Active')
    .not('current_stage', 'in', `(${closedStages.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(1);

  // Apply time filter for OPD/Emergency (48-hour window) — unless admitted
  if (maxAgeHours > 0) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
    query = query.gte('created_at', cutoffDate.toISOString());
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching continuable encounter:', error);
    return null;
  }

  return data as EncounterSummary | null;
}

/**
 * Check if a specific encounter can be continued with new orders.
 * Returns detailed information about what actions are allowed.
 */
export interface EncounterContinuationStatus {
  canContinue: boolean;
  reason: string;
  requiresJustification: boolean;
  hoursOld: number;
  allowedActions: string[];
}

export async function checkEncounterContinuationStatus(
  encounterId: string,
): Promise<EncounterContinuationStatus> {
  const { data: encounter, error } = await supabase
    .from('encounter_summary')
    .select('*')
    .eq('visit_id', encounterId)
    .maybeSingle();

  if (error || !encounter) {
    return {
      canContinue: false,
      reason: 'Encounter not found',
      requiresJustification: false,
      hoursOld: 0,
      allowedActions: [],
    };
  }

  // Check if patient has an active admission (bypass 48hr OPD limit)
  let hasActiveAdmission = false;
  if (encounter.patient_id) {
    const { data: admission } = await supabase
      .from('admissions')
      .select('id')
      .eq('patient_id', encounter.patient_id)
      .eq('admission_status', 'admitted')
      .maybeSingle();
    hasActiveAdmission = !!admission;
  }

  const hoursOld =
    (Date.now() - new Date(encounter.created_at).getTime()) / (1000 * 60 * 60);
  const closedStages = ['completed', 'billing_final'];

  // Rule 1: Status must be Active
  if (encounter.status !== 'Active') {
    return {
      canContinue: false,
      reason: `Encounter is ${encounter.status}. Only active encounters can be continued.`,
      requiresJustification: false,
      hoursOld,
      allowedActions: [],
    };
  }

  // Rule 2: Stage check
  if (closedStages.includes(encounter.current_stage)) {
    return {
      canContinue: false,
      reason:
        'Encounter has been completed. Create a new encounter for additional services.',
      requiresJustification: false,
      hoursOld,
      allowedActions: [],
    };
  }

  // Rule 3: Time check (48 hours for OPD — skip if patient has active admission)
  if (hoursOld > 48 && !hasActiveAdmission) {
    return {
      canContinue: false,
      reason: `Encounter is over 48 hours old. Create a new encounter.`,
      requiresJustification: false,
      hoursOld,
      allowedActions: [],
    };
  }

  // Rule 3b: Patient has active admission — allow regardless of encounter age
  if (hasActiveAdmission) {
    return {
      canContinue: true,
      reason: 'Patient is currently admitted — encounter can be continued.',
      requiresJustification: false,
      hoursOld,
      allowedActions: getActionsForStage(encounter.current_stage),
    };
  }

  // Rule 4: Soft limit - require justification after 24 hours
  if (hoursOld > 24) {
    return {
      canContinue: true,
      reason: `Encounter is ${Math.floor(hoursOld)} hours old. Justification required for new orders.`,
      requiresJustification: true,
      hoursOld,
      allowedActions: getActionsForStage(encounter.current_stage),
    };
  }

  // Normal - can continue
  return {
    canContinue: true,
    reason: 'Encounter can be continued with additional orders.',
    requiresJustification: false,
    hoursOld,
    allowedActions: getActionsForStage(encounter.current_stage),
  };
}

/**
 * Get allowed actions based on current workflow stage
 */
function getActionsForStage(stage: string): string[] {
  const fullAccess = [
    'lab_orders',
    'radiology_orders',
    'prescriptions',
    'procedures',
    'clinical_requests',
  ];

  switch (stage) {
    case 'consultation':
    case 'doctor_review':
    case 'lab_results':
    case 'radiology_results':
      return fullAccess;
    case 'lab_pending':
      return ['lab_orders', 'radiology_orders'];
    case 'radiology_pending':
      return ['lab_orders', 'radiology_orders'];
    case 'pharmacy_pending':
      return ['prescriptions'];
    case 'procedure_pending':
      return ['lab_orders', 'prescriptions'];
    default:
      return fullAccess;
  }
}

// ============================================================================
// Validation Middleware (for use in API calls)
// ============================================================================

/**
 * Higher-order function to wrap clinical API calls with encounter validation
 * ENFORCES: Every record must have valid EMR + Encounter linkage
 */
export function withEncounterValidation<
  T extends {
    encounter_id?: string;
    visit_id?: string;
    patient_id?: string;
    patientId?: string;
  },
>(
  fn: (params: T) => Promise<any>,
  options?: { allowClosedEncounter?: boolean; recordType?: RecordType },
) {
  return async (params: T) => {
    const encounterId = params.encounter_id || params.visit_id;
    const patientId = params.patient_id || params.patientId;

    if (!encounterId) {
      throw new Error(
        'encounter_id is required for all clinical data - no record can exist without a valid encounter',
      );
    }

    // Use comprehensive linkage validation if patient_id is provided
    if (patientId) {
      const linkageValidation = await validateRecordLinkage(
        patientId,
        encounterId,
        options,
      );

      if (!linkageValidation.isValid) {
        const error = new Error(linkageValidation.error);
        (error as any).code = linkageValidation.errorCode;
        (error as any).validation = linkageValidation;
        throw error;
      }

      return fn({
        ...params,
        patient_id: linkageValidation.patientId,
        encounter_id: linkageValidation.encounterId,
      } as T);
    }

    // Fallback to basic encounter validation
    const validation = await validateEncounterForModification(encounterId);

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return fn(params);
  };
}

/**
 * Hook-friendly validation function
 */
export function useEncounterValidation() {
  return {
    validateForModification: validateEncounterForModification,
    isActive: isEncounterActive,
    isClosed: isEncounterClosed,
    validatePatientMatch: validatePatientEncounterMatch,
    // EMR → Encounter → Record hierarchy validation
    validateEmr: validateEmrNumber,
    validateEncounterLink: validateEncounterLinkage,
    validateRecordLink: validateRecordLinkage,
    enforceRecordLink: enforceRecordLinkage,
    validateRecordUpdate,
    validateBatchRecords: validateBatchRecordLinkage,
  };
}

export default {
  getEncounter,
  getEncounterSummary,
  validateEncounterForModification,
  isEncounterActive,
  isEncounterClosed,
  validatePatientEncounterMatch,
  closeEncounter,
  reopenEncounter,
  createAddendum,
  getEncounterAddendums,
  approveAddendum,
  logClinicalAction,
  getEncounterAuditTrail,
  getPatientEncounters,
  getActiveEncounters,
  getEncountersByStage,
  withEncounterValidation,
  useEncounterValidation,
  // EMR → Encounter → Record hierarchy enforcement
  validateEmrNumber,
  validateEncounterLinkage,
  validateRecordLinkage,
  enforceRecordLinkage,
  validateRecordUpdate,
  validateBatchRecordLinkage,
  // Encounter continuation
  getPatientRecentContinuableEncounter,
  checkEncounterContinuationStatus,
};
