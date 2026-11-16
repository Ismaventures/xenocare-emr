/**
 * =============================================================================
 * XENOCARE EMR - ENCOUNTER HELPERS
 * =============================================================================
 *
 * Utility functions for handling encounter identifiers and data transformations.
 *
 * CRITICAL: The database has two types of encounter ID references:
 * - UUID (visits.id) - Used by: consultations, procedure_requests, encounter_care_team
 * - VARCHAR (visits.visit_id) - Used by: most other tables (lab, radiology, pharmacy, nursing, etc.)
 *
 * This module provides helpers to ensure the correct ID type is used for each table.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tables that use UUID (visits.id) for encounter_id
 *
 * Based on actual FK constraints in schema.sql:
 * - Most tables reference visits.id (UUID)
 */
export type UuidEncounterTable =
  | 'consultations'
  | 'procedure_requests'
  | 'encounter_care_team'
  | 'encounter_access_logs'
  | 'encounter_transfers'
  | 'lab_requests'
  | 'radiology_requests'
  | 'prescriptions'
  | 'nursing_notes'
  | 'admissions'
  | 'billing_orders'
  | 'clinical_requests'
  | 'invoices'
  | 'queue'
  | 'receipts'
  | 'patient_chief_complaints'
  | 'external_referrals'
  | 'scan_results'
  | 'procedures'
  | 'vitals'
  | 'treatment_plans';

/**
 * Tables that use VARCHAR (visits.visit_id) for encounter_id
 *
 * Based on actual FK constraints in schema.sql:
 * - daily_progress_notes → visits.visit_id
 * - doctor_orders → visits.visit_id
 */
export type VarcharEncounterTable =
  | 'daily_progress_notes'
  | 'doctor_orders'
  | 'shift_handovers';

export type EncounterTable = UuidEncounterTable | VarcharEncounterTable;

/**
 * Encounter identifier pair
 */
export interface EncounterIds {
  /** UUID from visits.id */
  uuid: string;
  /** VARCHAR from visits.visit_id (e.g., "VIS-00001") */
  visitId: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Regex pattern for validating UUIDs
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Regex pattern for validating visit IDs (e.g., VIS-00001)
 */
export const VISIT_ID_REGEX = /^VIS-\d{5,}$/;

/**
 * Tables that use UUID (visits.id) for encounter_id foreign key
 *
 * VERIFIED from schema.sql FK constraints
 */
export const UUID_ENCOUNTER_TABLES: readonly UuidEncounterTable[] = [
  'consultations',
  'procedure_requests',
  'encounter_care_team',
  'encounter_access_logs',
  'encounter_transfers',
  'lab_requests',
  'radiology_requests',
  'prescriptions',
  'nursing_notes',
  'admissions',
  'billing_orders',
  'clinical_requests',
  'invoices',
  'queue',
  'receipts',
  'patient_chief_complaints',
  'external_referrals',
  'scan_results',
  'procedures',
  'vitals',
  'treatment_plans',
] as const;

/**
 * Tables that use VARCHAR (visits.visit_id) for encounter_id foreign key
 *
 * VERIFIED from schema.sql FK constraints
 */
export const VARCHAR_ENCOUNTER_TABLES: readonly VarcharEncounterTable[] = [
  'daily_progress_notes',
  'doctor_orders',
  'shift_handovers',
] as const;

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Check if a string is a valid UUID
 */
export function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

/**
 * Check if a string is a valid visit ID (VARCHAR format like "VIS-00001")
 */
export function isValidVisitId(value: string | null | undefined): boolean {
  if (!value) return false;
  return VISIT_ID_REGEX.test(value);
}

/**
 * Determine which encounter ID type a table uses
 *
 * @param tableName - Name of the database table
 * @returns 'uuid' if table uses visits.id, 'varchar' if uses visits.visit_id
 */
export function getEncounterIdType(
  tableName: EncounterTable,
): 'uuid' | 'varchar' {
  if ((UUID_ENCOUNTER_TABLES as readonly string[]).includes(tableName)) {
    return 'uuid';
  }
  return 'varchar';
}

/**
 * Get the correct encounter ID for a specific table
 *
 * This is the MAIN HELPER that should be used when inserting records.
 * It ensures the correct ID type (UUID vs VARCHAR) is used based on the table's FK constraint.
 *
 * @param tableName - Name of the database table
 * @param ids - Object containing both UUID and visitId
 * @returns The correct encounter ID for the specified table
 * @throws Error if the required ID is missing
 *
 * @example
 * ```typescript
 * // For lab_requests (uses VARCHAR)
 * const encounterId = getEncounterIdForTable('lab_requests', {
 *   uuid: '7db857c4-8581-44e4-8200-1d28f6d36814',
 *   visitId: 'VIS-00001'
 * });
 * // Returns: 'VIS-00001'
 *
 * // For consultations (uses UUID)
 * const encounterId = getEncounterIdForTable('consultations', {
 *   uuid: '7db857c4-8581-44e4-8200-1d28f6d36814',
 *   visitId: 'VIS-00001'
 * });
 * // Returns: '7db857c4-8581-44e4-8200-1d28f6d36814'
 * ```
 */
export function getEncounterIdForTable(
  tableName: EncounterTable,
  ids: EncounterIds,
): string {
  const idType = getEncounterIdType(tableName);

  if (idType === 'uuid') {
    if (!ids.uuid || !isValidUuid(ids.uuid)) {
      throw new Error(
        `Table '${tableName}' requires a valid UUID encounter_id. Got: ${ids.uuid}`,
      );
    }
    return ids.uuid;
  }
  if (!ids.visitId || !isValidVisitId(ids.visitId)) {
    throw new Error(
      `Table '${tableName}' requires a valid visit_id (VARCHAR) encounter_id. Got: ${ids.visitId}`,
    );
  }
  return ids.visitId;
}

/**
 * Determine the ID type from a given encounter identifier
 *
 * @param identifier - Either a UUID or visit_id string
 * @returns 'uuid' | 'varchar' | 'unknown'
 */
export function detectEncounterIdType(
  identifier: string | null | undefined,
): 'uuid' | 'varchar' | 'unknown' {
  if (!identifier) return 'unknown';
  if (isValidUuid(identifier)) return 'uuid';
  if (isValidVisitId(identifier)) return 'varchar';
  return 'unknown';
}

/**
 * Validate that an encounter ID matches the expected type for a table
 *
 * @param tableName - Name of the database table
 * @param encounterId - The encounter ID to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateEncounterIdForTable(
  tableName: EncounterTable,
  encounterId: string | null | undefined,
): { valid: boolean; error?: string } {
  if (!encounterId) {
    return { valid: false, error: 'Encounter ID is required' };
  }

  const expectedType = getEncounterIdType(tableName);
  const actualType = detectEncounterIdType(encounterId);

  if (actualType === 'unknown') {
    return {
      valid: false,
      error: `Invalid encounter ID format: ${encounterId}`,
    };
  }

  if (expectedType !== actualType) {
    return {
      valid: false,
      error: `Table '${tableName}' expects ${expectedType} encounter_id but got ${actualType}: ${encounterId}`,
    };
  }

  return { valid: true };
}

/**
 * Safe wrapper that returns null instead of throwing for optional encounter IDs
 *
 * @param tableName - Name of the database table
 * @param ids - Object containing both UUID and visitId (can have null values)
 * @returns The correct encounter ID or null if not available
 */
export function getEncounterIdForTableSafe(
  tableName: EncounterTable,
  ids: Partial<EncounterIds>,
): string | null {
  try {
    const fullIds: EncounterIds = {
      uuid: ids.uuid || '',
      visitId: ids.visitId || '',
    };
    return getEncounterIdForTable(tableName, fullIds);
  } catch {
    return null;
  }
}

/**
 * Format encounter IDs for debugging/logging
 */
export function formatEncounterIds(ids: Partial<EncounterIds>): string {
  const parts: string[] = [];
  if (ids.uuid) parts.push(`UUID: ${ids.uuid}`);
  if (ids.visitId) parts.push(`VisitID: ${ids.visitId}`);
  return parts.length > 0 ? parts.join(', ') : 'No IDs provided';
}

// =============================================================================
// COMMON PATTERNS
// =============================================================================

/**
 * Helper to extract both encounter IDs from a visit record
 *
 * @param visit - Visit record from database
 * @returns EncounterIds object
 */
export function extractEncounterIds(visit: {
  id?: string;
  visit_id?: string;
}): EncounterIds {
  return {
    uuid: visit.id || '',
    visitId: visit.visit_id || '',
  };
}

/**
 * Create encounter IDs from component props
 *
 * Many components receive both encounterId (UUID) and encounterNumber (visit_id)
 * This helper standardizes them into EncounterIds format.
 *
 * @param encounterId - UUID from visits.id
 * @param encounterNumber - VARCHAR from visits.visit_id
 * @returns EncounterIds object
 */
export function createEncounterIds(
  encounterId: string | null | undefined,
  encounterNumber: string | null | undefined,
): EncounterIds {
  return {
    uuid: encounterId || '',
    visitId: encounterNumber || '',
  };
}
