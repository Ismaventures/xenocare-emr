/**
 * =============================================================================
 * XENOCARE EMR - OPTIMISTIC LOCKING UTILITIES
 * Prevent concurrent update conflicts using version-based locking
 * =============================================================================
 *
 * This module works with the database-level optimistic locking system:
 * - version: Integer that auto-increments on each update
 * - last_modified_by: UUID of the user who last modified
 * - update_*_with_lock(): Type-safe RPC functions for atomic updates
 *
 * See: migrations/061_add_optimistic_locking.sql
 * See: migrations/063_optimistic_locking_improvements.sql
 * =============================================================================
 */

import { supabase } from '../api/supabaseClient';

/**
 * PostgreSQL error codes for version conflicts
 */
export const VERSION_CONFLICT_ERROR_CODE = 'P0003';
export const RECORD_NOT_FOUND_ERROR_CODE = 'P0002';

/**
 * Conflict information returned when version mismatch occurs
 */
export interface VersionConflictInfo {
  currentVersion: number;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

/**
 * Error thrown when an optimistic lock check fails
 * (i.e., the record was modified by another user)
 */
export class OptimisticLockError extends Error {
  public readonly conflictInfo?: VersionConflictInfo;

  constructor(
    public readonly tableName: string,
    public readonly recordId: string,
    public readonly expectedVersion: number,
    conflictInfo?: VersionConflictInfo,
    message?: string,
  ) {
    super(
      message ||
        `Conflict: Record ${recordId} in ${tableName} was modified by another user. ` +
          `Expected version ${expectedVersion}${
            conflictInfo
              ? `, current version ${conflictInfo.currentVersion}`
              : ''
          }. Please refresh and try again.`,
    );
    this.name = 'OptimisticLockError';
    this.conflictInfo = conflictInfo;
  }
}

/**
 * Tables that support optimistic locking with version column
 */
export type VersionedTable =
  | 'patients'
  | 'encounters'
  | 'consultations'
  | 'prescriptions'
  | 'diagnoses'
  | 'vitals'
  | 'nursing_notes'
  | 'admissions'
  | 'billing_orders'
  | 'lab_requests'
  | 'lab_results'
  | 'radiology_requests'
  | 'radiology_reports'
  | 'procedures'
  | 'ward_rounds';

/**
 * Interface for records that support optimistic locking
 */
export interface VersionedRecord {
  id: string;
  version: number;
  last_modified_by?: string;
  updated_at?: string;
}

/**
 * Options for update operations
 */
export interface UpdateWithLockOptions {
  /** User ID performing the update (for audit trail) */
  modifiedBy: string;
  /** Whether to log conflicts to the audit table */
  logConflict?: boolean;
  /** Additional client info for conflict logging */
  clientInfo?: Record<string, unknown>;
  /** Automatically retry once with latest version when conflict occurs */
  autoResolveConflict?: boolean;
  /** If auto-resolve fails, return latest record instead of throwing conflict */
  suppressConflictError?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS (defined before use for TypeScript)
// =============================================================================

/**
 * Map table names to their type-safe RPC function names
 */
function getRpcFunctionForTable(table: VersionedTable): string | null {
  const rpcMap: Record<string, string> = {
    patients: 'update_patient_with_lock',
    billing_orders: 'update_billing_order_with_lock',
    consultations: 'update_consultation_with_lock',
    lab_requests: 'update_lab_request_with_lock',
    prescriptions: 'update_prescription_with_lock',
  };
  return rpcMap[table] || null;
}

/**
 * Some logical table names are aliases in the current schema.
 */
function getPhysicalTableForVersionedTable(table: VersionedTable): string {
  if (table === 'encounters') return 'visits';
  if (table === 'radiology_reports') return 'scan_results';
  return table;
}

/**
 * Map each versioned table to its canonical key column.
 */
function getPrimaryKeyColumnForTable(table: VersionedTable): string {
  const keyMap: Record<string, string> = {
    patients: 'id',
    encounters: 'id',
    consultations: 'consultation_id',
    prescriptions: 'prescription_id',
    diagnoses: 'id',
    vitals: 'id',
    nursing_notes: 'id',
    admissions: 'id',
    billing_orders: 'id',
    lab_requests: 'request_id',
    lab_results: 'id',
    radiology_requests: 'request_id',
    radiology_reports: 'id',
    procedures: 'id',
    ward_rounds: 'id',
  };
  return keyMap[table] || 'id';
}

/**
 * Parse version conflict details from error message
 */
function parseConflictError(message: string): VersionConflictInfo | undefined {
  // Expected format: "Version conflict: expected X, found Y. Last modified by Z at W"
  const match = message.match(
    /expected (\d+), found (\d+)\. Last modified by ([a-f0-9-]+) at (.+)/i,
  );

  if (match) {
    return {
      currentVersion: parseInt(match[2], 10),
      lastModifiedBy: match[3] !== 'null' ? match[3] : undefined,
      lastModifiedAt: match[4] !== 'null' ? new Date(match[4]) : undefined,
    };
  }

  // Simpler format: just version numbers
  const simpleMatch = message.match(/expected (\d+), found (\d+)/i);
  if (simpleMatch) {
    return {
      currentVersion: parseInt(simpleMatch[2], 10),
    };
  }

  // Database function format: "The requested version (1) is less than the existing version (2)."
  const requestedExistingMatch = message.match(
    /requested version\s*\((\d+)\)\s*is\s*less\s*than\s*the\s*existing\s*version\s*\((\d+)\)/i,
  );
  if (requestedExistingMatch) {
    return {
      currentVersion: parseInt(requestedExistingMatch[2], 10),
    };
  }

  return undefined;
}

/**
 * Fetch current version info for a record to provide better conflict details
 */
async function fetchConflictInfo(
  table: VersionedTable,
  id: string,
): Promise<VersionConflictInfo | undefined> {
  try {
    const physicalTable = getPhysicalTableForVersionedTable(table);
    const keyColumn = getPrimaryKeyColumnForTable(table);
    const { data } = await supabase
      .from(physicalTable)
      .select('version, last_modified_by, updated_at')
      .eq(keyColumn, id)
      .maybeSingle();

    if (data) {
      return {
        currentVersion: data.version,
        lastModifiedBy: data.last_modified_by,
        lastModifiedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      };
    }
  } catch (error) {
    console.error('[OptimisticLocking] Failed to fetch conflict info:', error);
  }
  return undefined;
}

/**
 * Log a version conflict to the audit table
 */
async function logVersionConflict(
  tableName: string,
  recordId: string,
  expectedVersion: number,
  conflictInfo: VersionConflictInfo | undefined,
  options: UpdateWithLockOptions,
): Promise<void> {
  try {
    await supabase.rpc('log_version_conflict', {
      p_table_name: tableName,
      p_record_id: recordId,
      p_expected_version: expectedVersion,
      p_actual_version: conflictInfo?.currentVersion ?? 0,
      p_attempted_by: options.modifiedBy,
      p_last_modified_by: conflictInfo?.lastModifiedBy ?? null,
      p_client_info: options.clientInfo ?? null,
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('[OptimisticLocking] Failed to log conflict:', error);
  }
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Update a record with optimistic locking
 *
 * This function will only succeed if the record's current version
 * matches the expected version. If another user has modified the
 * record, an OptimisticLockError will be thrown.
 *
 * @param table - The table name
 * @param id - The record ID
 * @param data - The data to update (excluding version)
 * @param currentVersion - The version the client last read
 * @param options - Update options including modifiedBy user ID
 * @returns The updated record with new version
 * @throws OptimisticLockError if version mismatch
 *
 * @example
 * try {
 *   const updated = await updateWithLock('patients', patient.id,
 *     { address: newAddress },
 *     patient.version,
 *     { modifiedBy: currentUser.id }
 *   );
 *   console.log('Updated to version:', updated.version);
 * } catch (error) {
 *   if (error instanceof OptimisticLockError) {
 *     // Show conflict resolution UI with conflict info
 *     showConflictDialog(error.conflictInfo);
 *   }
 * }
 */
export async function updateWithLock<T = unknown>(
  table: VersionedTable,
  id: string,
  data: Record<string, unknown>,
  currentVersion: number,
  options?: UpdateWithLockOptions,
): Promise<T> {
  const autoResolveConflict = options?.autoResolveConflict !== false;
  const suppressConflictError = options?.suppressConflictError !== false;

  const resolveConflictOrThrow = async (
    conflictInfo: VersionConflictInfo | undefined,
    fallbackMessage?: string,
  ): Promise<T> => {
    if (autoResolveConflict) {
      try {
        const latest = await refreshRecord<VersionedRecord>(table, id);
        if (latest) {
          return await updateWithLock<T>(table, id, data, latest.version, {
            ...options,
            autoResolveConflict: false,
          });
        }
      } catch {
        // Fall through to suppression or throw.
      }
    }

    if (suppressConflictError) {
      const latest = await refreshRecord<T & VersionedRecord>(table, id);
      if (latest) {
        return latest as T;
      }
    }

    throw new OptimisticLockError(
      table,
      id,
      currentVersion,
      conflictInfo,
      fallbackMessage,
    );
  };

  const physicalTable = getPhysicalTableForVersionedTable(table);
  const keyColumn = getPrimaryKeyColumnForTable(table);

  // Check if there's a type-safe RPC function for this table
  const rpcFunction = getRpcFunctionForTable(table);

  if (rpcFunction && options?.modifiedBy) {
    // Use type-safe RPC function (preferred)
    const { data: result, error } = await supabase.rpc(rpcFunction, {
      p_id: id,
      p_expected_version: currentVersion,
      p_updates: data,
      p_modified_by: options.modifiedBy,
    });

    if (error) {
      // Parse version conflict error
      if (
        error.code === VERSION_CONFLICT_ERROR_CODE ||
        error.message?.includes('Version conflict')
      ) {
        const conflictInfo = parseConflictError(error.message);

        // Optionally log the conflict
        if (options?.logConflict) {
          await logVersionConflict(
            table,
            id,
            currentVersion,
            conflictInfo,
            options,
          );
        }

        return resolveConflictOrThrow(conflictInfo);
      }

      if (error.message?.toLowerCase().includes('requested version')) {
        const conflictInfo = parseConflictError(error.message);
        if (options?.logConflict) {
          await logVersionConflict(
            table,
            id,
            currentVersion,
            conflictInfo,
            options,
          );
        }
        return resolveConflictOrThrow(conflictInfo);
      }

      if (error.code === RECORD_NOT_FOUND_ERROR_CODE) {
        throw new Error(`Record ${id} not found in ${table}`);
      }

      throw error;
    }

    return (Array.isArray(result) ? result[0] : result) as T;
  }

  // Fallback to direct update with version check
  const {
    data: result,
    error,
    count,
  } = await supabase
    .from(physicalTable)
    .update({
      ...data,
      last_modified_by: options?.modifiedBy,
    })
    .eq(keyColumn, id)
    .eq('version', currentVersion)
    .select()
    .maybeSingle(); // Use maybeSingle to handle 0 rows gracefully

  // Check if update affected any rows
  if (error) {
    // Could be version mismatch or other error
    if (error.code === 'PGRST116') {
      // No rows returned - version mismatch, fetch current state for better error
      const conflictInfo = await fetchConflictInfo(table, id);
      if (options?.logConflict && options.modifiedBy) {
        await logVersionConflict(
          table,
          id,
          currentVersion,
          conflictInfo,
          options,
        );
      }
      return resolveConflictOrThrow(conflictInfo);
    }
    throw error;
  }

  // CRITICAL: Handle empty result (0 rows updated) as version conflict
  // Supabase may return data: null with no error when WHERE doesn't match
  if (!result) {
    console.warn(
      `[OptimisticLocking] Update returned no rows for ${table}:${id} version ${currentVersion} - likely version conflict`,
    );
    // Fetch current version to provide conflict details
    const conflictInfo = await fetchConflictInfo(table, id);

    if (options?.logConflict && options.modifiedBy) {
      await logVersionConflict(
        table,
        id,
        currentVersion,
        conflictInfo,
        options,
      );
    }

    return resolveConflictOrThrow(conflictInfo);
  }

  return result as T;
}

/**
 * Batch update with optimistic locking
 *
 * Updates multiple records, ensuring all versions match.
 * If any record has a version mismatch, the entire batch fails.
 *
 * @param updates - Array of updates with table, id, data, and version
 * @returns Array of updated records
 * @throws OptimisticLockError if any version mismatch
 */
export async function batchUpdateWithLock<T = unknown>(
  updates: Array<{
    table: VersionedTable;
    id: string;
    data: Record<string, unknown>;
    currentVersion: number;
  }>,
): Promise<T[]> {
  const results: T[] = [];
  const errors: OptimisticLockError[] = [];

  // Process updates sequentially to maintain atomicity
  for (const update of updates) {
    try {
      const result = await updateWithLock<T>(
        update.table,
        update.id,
        update.data,
        update.currentVersion,
      );
      results.push(result);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        errors.push(error);
      } else {
        throw error;
      }
    }
  }

  // If any errors, throw the first one (could aggregate if needed)
  if (errors.length > 0) {
    throw errors[0];
  }

  return results;
}

/**
 * Fetch a record with its current version for subsequent update
 *
 * @param table - The table name
 * @param id - The record ID
 * @returns The record with version, or null if not found
 */
export async function fetchWithVersion<T extends VersionedRecord>(
  table: VersionedTable,
  id: string,
): Promise<T | null> {
  const physicalTable = getPhysicalTableForVersionedTable(table);
  const keyColumn = getPrimaryKeyColumnForTable(table);

  const { data, error } = await supabase
    .from(physicalTable)
    .select('*')
    .eq(keyColumn, id)
    .single();

  if (error || !data) return null;
  return data as T;
}

/**
 * Check if a record's version is still current
 *
 * Useful for validating before a complex operation
 *
 * @param table - The table name
 * @param id - The record ID
 * @param expectedVersion - The version to check against
 * @returns true if version matches, false otherwise
 */
export async function isVersionCurrent(
  table: VersionedTable,
  id: string,
  expectedVersion: number,
): Promise<boolean> {
  const physicalTable = getPhysicalTableForVersionedTable(table);
  const keyColumn = getPrimaryKeyColumnForTable(table);

  const { data, error } = await supabase
    .from(physicalTable)
    .select('version')
    .eq(keyColumn, id)
    .single();

  if (error || !data) return false;
  return data.version === expectedVersion;
}

/**
 * Refresh a record to get the latest version after a conflict
 *
 * @param table - The table name
 * @param id - The record ID
 * @returns The latest version of the record
 */
export async function refreshRecord<T extends VersionedRecord>(
  table: VersionedTable,
  id: string,
): Promise<T | null> {
  return fetchWithVersion<T>(table, id);
}

/**
 * Higher-order function to wrap an update operation with retry on conflict
 *
 * @param maxRetries - Maximum number of retry attempts
 * @param onConflict - Callback when conflict occurs, receives current and new versions
 * @returns Wrapped update function
 *
 * @example
 * const safeUpdate = withConflictRetry(3, (current, latest) => {
 *   // Merge changes or prompt user
 *   return mergePatientData(current, latest);
 * });
 *
 * await safeUpdate(async () => {
 *   return updateWithLock('patients', id, changes, version);
 * });
 */
export function withConflictRetry<T extends VersionedRecord>(
  maxRetries: number,
  onConflict: (
    currentData: Record<string, unknown>,
    latestRecord: T,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>,
) {
  return async function retryableUpdate(
    table: VersionedTable,
    id: string,
    data: Record<string, unknown>,
    currentVersion: number,
  ): Promise<T> {
    let lastError: OptimisticLockError | null = null;
    let currentData = data;
    let version = currentVersion;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await updateWithLock<T>(table, id, currentData, version);
      } catch (error) {
        if (error instanceof OptimisticLockError && attempt < maxRetries) {
          lastError = error;

          // Fetch latest record
          const latest = await refreshRecord<T>(table, id);
          if (!latest) {
            throw new Error(`Record ${id} no longer exists`);
          }

          // Let caller resolve the conflict
          currentData = await onConflict(currentData, latest);
          version = latest.version;
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  };
}

/**
 * Type guard to check if a record has version field
 */
export function isVersionedRecord(record: unknown): record is VersionedRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'id' in record &&
    'version' in record &&
    typeof (record as VersionedRecord).version === 'number'
  );
}

/**
 * Get current version info for a record using the safe RPC function
 */
export async function getRecordVersion(
  table: VersionedTable,
  id: string,
): Promise<VersionConflictInfo | null> {
  const { data, error } = await supabase.rpc('get_record_version', {
    p_table_name: table,
    p_record_id: id,
  });

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  return {
    currentVersion: row.current_version,
    lastModifiedBy: row.last_modified_by,
    lastModifiedAt: row.last_modified_at
      ? new Date(row.last_modified_at)
      : undefined,
  };
}
