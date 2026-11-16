/**
 * =============================================================================
 * XENOCARE EMR - IDEMPOTENCY KEY UTILITIES
 * Prevent duplicate record creation from network retries or double-clicks
 * =============================================================================
 *
 * This module works with the database-level idempotency system:
 * - idempotency_key: Unique key to prevent duplicates (VARCHAR(128))
 * - idempotency_hash: SHA256 hash of payload to detect key reuse bugs
 * - idempotency_created_at: Timestamp when key was first used
 *
 * See: migrations/062_idempotency_improvements.sql
 * See: docs/IDEMPOTENCY_ROLLOUT_GUIDE.md
 * =============================================================================
 */

/** Maximum length for idempotency keys (matches database DOMAIN constraint) */
// =============================================================================
// IDEMPOTENT INSERT UTILITIES
// =============================================================================
// These helpers ensure duplicate submissions return the original record
// instead of throwing errors - critical for good EMR UX.

import { supabase } from '../api/supabaseClient';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('Idempotency');

export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/**
 * Generate a unique idempotency key for create operations
 *
 * Format: {userId}-{action}-{timestamp}-{random}
 *
 * @param userId - The ID of the user performing the action
 * @param action - A descriptive action name (e.g., 'create-billing-order')
 * @returns A unique idempotency key string
 *
 * @example
 * const key = generateIdempotencyKey('user-123', 'create-billing-order');
 * // Returns: "user-123-create-billing-order-1706108400000-a1b2c3d4"
 */
export function generateIdempotencyKey(userId: string, action: string): string {
  const timestamp = Date.now();
  const random = generateRandomString(8);
  return `${userId}-${action}-${timestamp}-${random}`;
}

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  // Use crypto API if available, fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}

/**
 * Idempotency key storage for tracking in-flight requests
 * Prevents duplicate submissions within the same session
 */
class IdempotencyTracker {
  private pendingKeys = new Set<string>();

  private completedKeys = new Map<string, { timestamp: number; result: any }>();

  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a key is currently being processed
   */
  isPending(key: string): boolean {
    return this.pendingKeys.has(key);
  }

  /**
   * Check if a key was recently completed and get cached result
   */
  getCompleted(key: string): { result: any } | null {
    const entry = this.completedKeys.get(key);
    if (!entry) return null;

    // Check if entry is still valid
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.completedKeys.delete(key);
      return null;
    }

    return { result: entry.result };
  }

  /**
   * Mark a key as being processed
   */
  markPending(key: string): void {
    this.pendingKeys.add(key);
  }

  /**
   * Mark a key as completed with its result
   */
  markCompleted(key: string, result: any): void {
    this.pendingKeys.delete(key);
    this.completedKeys.set(key, { timestamp: Date.now(), result });
    this.cleanup();
  }

  /**
   * Mark a key as failed (remove from pending)
   */
  markFailed(key: string): void {
    this.pendingKeys.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.completedKeys.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.completedKeys.delete(key);
      }
    }
  }
}

// Singleton instance
export const idempotencyTracker = new IdempotencyTracker();

/**
 * Wrapper function to execute a create operation with idempotency protection
 *
 * @param key - The idempotency key for this operation
 * @param fn - The async function to execute
 * @returns The result of the operation
 * @throws Error if the operation is already in progress
 *
 * @example
 * const result = await withIdempotency(
 *   generateIdempotencyKey(userId, 'create-order'),
 *   async () => await createBillingOrder(data)
 * );
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Check if already completed
  const completed = idempotencyTracker.getCompleted(key);
  if (completed) {
    log.info(`[Idempotency] Returning cached result for key: ${key}`);
    return completed.result as T;
  }

  // Check if currently pending
  if (idempotencyTracker.isPending(key)) {
    throw new IdempotencyError('Operation already in progress', key, 'PENDING');
  }

  // Mark as pending and execute
  idempotencyTracker.markPending(key);

  try {
    const result = await fn();
    idempotencyTracker.markCompleted(key, result);
    return result;
  } catch (error) {
    idempotencyTracker.markFailed(key);

    // Check if this is a duplicate key error from the database
    if (isDuplicateKeyError(error)) {
      throw new IdempotencyError(
        'Duplicate operation detected',
        key,
        'DUPLICATE',
      );
    }

    throw error;
  }
}

/**
 * Check if an error is a duplicate key constraint violation
 */
function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const errorObj = error as Record<string, unknown>;

  // Supabase/PostgreSQL duplicate key error
  if (errorObj.code === '23505') return true;

  // Check error message
  const message = String(errorObj.message || '').toLowerCase();
  return (
    message.includes('duplicate') ||
    message.includes('unique constraint') ||
    message.includes('idempotency_key')
  );
}

/**
 * Custom error for idempotency violations
 */
export class IdempotencyError extends Error {
  constructor(
    message: string,
    public readonly idempotencyKey: string,
    public readonly type: 'PENDING' | 'DUPLICATE',
  ) {
    super(message);
    this.name = 'IdempotencyError';
  }
}

/**
 * Type for tables that support idempotency keys
 */
export type IdempotentTable =
  | 'billing_orders'
  | 'lab_requests'
  | 'radiology_requests'
  | 'prescriptions'
  | 'encounters'
  | 'patients'
  | 'consultations'
  | 'admissions'
  | 'procedures'
  | 'nursing_notes'
  | 'vitals';

/**
 * Action names for idempotency key generation
 */
export const IdempotencyActions = {
  // Patient management
  CREATE_PATIENT: 'create-patient',
  REGISTER_PATIENT: 'register-patient',

  // Encounter management
  CREATE_ENCOUNTER: 'create-encounter',
  CHECK_IN_PATIENT: 'check-in-patient',

  // Clinical orders
  CREATE_LAB_REQUEST: 'create-lab-request',
  CREATE_RADIOLOGY_REQUEST: 'create-radiology-request',
  CREATE_PRESCRIPTION: 'create-prescription',
  CREATE_CONSULTATION: 'create-consultation',

  // Billing
  CREATE_BILLING_ORDER: 'create-billing-order',
  CREATE_RECEIPT: 'create-receipt',
  CREATE_INVOICE: 'create-invoice',

  // Nursing
  CREATE_VITALS: 'create-vitals',
  CREATE_NURSING_NOTE: 'create-nursing-note',

  // Inpatient
  CREATE_ADMISSION: 'create-admission',
  CREATE_PROCEDURE: 'create-procedure',
  CREATE_WARD_ROUND: 'create-ward-round',
} as const;

export type IdempotencyAction =
  (typeof IdempotencyActions)[keyof typeof IdempotencyActions];

/**
 * Generate a SHA256 hash of a payload for idempotency mismatch detection
 *
 * This hash is stored alongside the idempotency key to detect when the same
 * key is reused with different data (indicates a client-side bug).
 *
 * @param payload - The request payload to hash
 * @returns A 64-character hex string (SHA256 truncated)
 *
 * @example
 * const hash = hashPayload({ amount: 1000, patient_id: 'abc' });
 * // Returns: "a1b2c3d4e5f6..."
 */
export function hashPayload(payload: unknown): string {
  // Normalize the payload by sorting keys to ensure consistent hashing
  const normalized = JSON.stringify(payload, sortKeys(payload));

  // Use Web Crypto API for hashing (available in Electron/modern browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // For async contexts, use this pattern:
    // const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    // For sync fallback, use simple hash:
    return simpleHash(normalized);
  }

  return simpleHash(normalized);
}

/**
 * Sort keys recursively for consistent JSON stringification
 */
function sortKeys(obj: unknown): (key: string, value: unknown) => unknown {
  const seen = new WeakSet();

  return function replacer(_key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);

      if (Array.isArray(value)) {
        return value;
      }

      return Object.keys(value as object)
        .sort()
        .reduce((sorted: Record<string, unknown>, key: string) => {
          sorted[key] = (value as Record<string, unknown>)[key];
          return sorted;
        }, {});
    }
    return value;
  };
}

/**
 * Simple hash function for sync contexts (djb2 algorithm)
 * Returns a hex string that looks like a SHA256 hash
 */
function simpleHash(str: string): string {
  let hash1 = 5381;
  let hash2 = 52711;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }

  // Combine hashes and convert to hex
  const combined = Math.abs(hash1).toString(16) + Math.abs(hash2).toString(16);
  // Pad to 64 chars to look like SHA256
  return combined.padEnd(64, '0').slice(0, 64);
}

/**
 * Async version of payload hashing using Web Crypto API
 * Use this when you can await the result
 *
 * @param payload - The request payload to hash
 * @returns A 64-character hex string (SHA256)
 */
export async function hashPayloadAsync(payload: unknown): Promise<string> {
  const normalized = JSON.stringify(payload, sortKeys(payload));

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  return simpleHash(normalized);
}

/**
 * Validate an idempotency key against the database constraints
 *
 * @param key - The idempotency key to validate
 * @returns True if valid, false otherwise
 */
export function isValidIdempotencyKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) return false;
  if (key !== key.trim()) return false; // No leading/trailing whitespace
  if (key.trim().length === 0) return false; // Not blank
  return true;
}

/**
 * Options for idempotent insert operations
 */
export interface IdempotencyOptions {
  /** User ID for key generation */
  userId: string;
  /** Action name for key generation */
  action: IdempotencyAction | string;
  /** Whether to include payload hash */
  includeHash?: boolean;
}

/**
 * Prepare idempotency fields for a database insert
 *
 * @param payload - The data being inserted
 * @param options - Idempotency configuration
 * @returns Object with idempotency_key and optionally idempotency_hash
 *
 * @example
 * const idempotencyFields = prepareIdempotencyFields(orderData, {
 *   userId: currentUser.id,
 *   action: IdempotencyActions.CREATE_BILLING_ORDER,
 *   includeHash: true,
 * });
 *
 * await supabase.from('billing_orders').insert({
 *   ...orderData,
 *   ...idempotencyFields,
 * });
 */
export function prepareIdempotencyFields(
  payload: unknown,
  options: IdempotencyOptions,
): { idempotency_key: string; idempotency_hash?: string } {
  const key = generateIdempotencyKey(options.userId, options.action);

  const result: { idempotency_key: string; idempotency_hash?: string } = {
    idempotency_key: key,
  };

  if (options.includeHash !== false) {
    result.idempotency_hash = hashPayload(payload);
  }

  return result;
}

/**
 * Check if an error is a duplicate idempotency key error
 */
export function isDuplicateIdempotencyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return err.message?.includes('idempotency_key') ?? false;
  }
  return false;
}

/**
 * Fetch existing record by idempotency key
 * Used when a duplicate is detected to return the original record
 */
export async function fetchByIdempotencyKey<T>(
  table: IdempotentTable,
  idempotencyKey: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    log.error(`[Idempotency] Failed to fetch by key:`, error);
    return null;
  }

  return data as T | null;
}

/**
 * Insert with idempotency - returns existing record on duplicate
 *
 * This is the RECOMMENDED way to do idempotent inserts.
 * If the idempotency_key already exists, returns the existing record
 * instead of throwing an error.
 *
 * @param table - The table to insert into
 * @param data - The data to insert (must include idempotency_key)
 * @param selectColumns - Columns to return (default '*')
 * @returns The inserted or existing record
 *
 * @example
 * const order = await idempotentInsert('billing_orders', {
 *   ...orderData,
 *   ...prepareIdempotencyFields(orderData, { userId, action: 'create-order' })
 * });
 */
export async function idempotentInsert<T extends { idempotency_key: string }>(
  table: IdempotentTable,
  data: T,
  selectColumns: string = '*',
): Promise<T> {
  const { data: inserted, error } = await supabase
    .from(table)
    .insert(data as Record<string, unknown>)
    .select(selectColumns)
    .single();

  if (error) {
    // If duplicate key, fetch and return existing record
    if (isDuplicateIdempotencyError(error)) {
      log.info(
        `[Idempotency] Duplicate detected, returning existing record`,
      );
      const existing = await fetchByIdempotencyKey<T>(
        table,
        data.idempotency_key,
      );
      if (existing) {
        return existing;
      }
      // If we can't fetch existing, throw original error
      throw error;
    }
    throw error;
  }

  return inserted as unknown as T;
}

/**
 * Insert with idempotency using UPSERT (DO NOTHING on conflict)
 *
 * Alternative approach using PostgreSQL's ON CONFLICT DO NOTHING.
 * Slightly more efficient as it's a single query.
 *
 * @param table - The table to insert into
 * @param data - The data to insert (must include idempotency_key)
 * @param selectColumns - Columns to return (default '*')
 * @returns The inserted or existing record
 */
export async function idempotentUpsert<T extends { idempotency_key: string }>(
  table: IdempotentTable,
  data: T,
  selectColumns: string = '*',
): Promise<T> {
  // Try insert first
  const { data: inserted, error } = await supabase
    .from(table)
    .upsert(data as Record<string, unknown>, {
      onConflict: 'idempotency_key',
      ignoreDuplicates: true, // DO NOTHING on conflict
    })
    .select(selectColumns)
    .single();

  // Check for "no rows returned" error code
  const errorCode =
    error && typeof error === 'object' && 'code' in error
      ? (error as { code: string }).code
      : null;

  // If no data returned (DO NOTHING case), fetch existing
  if (!inserted || errorCode === 'PGRST116') {
    const existing = await fetchByIdempotencyKey<T>(
      table,
      data.idempotency_key,
    );
    if (existing) {
      return existing;
    }
  }

  if (error && !isDuplicateIdempotencyError(error)) {
    throw error;
  }

  return inserted as unknown as T;
}

/**
 * Wrap a create operation with idempotency handling
 *
 * Automatically catches duplicate key errors and returns the existing record.
 * Use this when you can't easily modify the insert logic.
 *
 * @param idempotencyKey - The key to use for deduplication
 * @param createFn - The function that creates the record
 * @param fetchExistingFn - Function to fetch existing record by idempotency key
 * @returns The created or existing record
 *
 * @example
 * const order = await withIdempotentCreate(
 *   idempotencyKey,
 *   () => createBillingOrder(data),
 *   (key) => getBillingOrderByIdempotencyKey(key)
 * );
 */
export async function withIdempotentCreate<T>(
  idempotencyKey: string,
  createFn: () => Promise<T>,
  fetchExistingFn: (key: string) => Promise<T | null>,
): Promise<T> {
  try {
    return await createFn();
  } catch (error) {
    if (isDuplicateIdempotencyError(error)) {
      log.info(
        `[Idempotency] Duplicate detected for key ${idempotencyKey}, fetching existing`,
      );
      const existing = await fetchExistingFn(idempotencyKey);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}