/**
 * Request Deduplication for XENOCARE EMR
 *
 * Prevents duplicate mutation requests from being sent to the server.
 * Useful for preventing double-submits, rapid clicks, and network retries.
 *
 * @module requestDeduplication
 */

// =============================================================================
// Types
// =============================================================================

interface PendingRequest<T> {
  promise: Promise<T>;
  startedAt: number;
  key: string;
}

interface DeduplicationOptions {
  /** Time in ms before a request is considered stale and can be retried (default: 30s) */
  staleAfterMs?: number;
  /** Whether to throw on duplicate request (default: false - returns pending promise) */
  throwOnDuplicate?: boolean;
  /** Custom key generator */
  keyGenerator?: (...args: unknown[]) => string;
}

// =============================================================================
// Request Deduplication Manager
// =============================================================================

/**
 * Manages in-flight mutation requests to prevent duplicates.
 *
 * When a duplicate request is detected:
 * - Returns the promise from the original in-flight request
 * - Caller gets the same result as the first request
 * - No duplicate server call is made
 */
class RequestDeduplicationManager {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();

  private staleAfterMs: number;

  constructor(staleAfterMs: number = 30000) {
    this.staleAfterMs = staleAfterMs;

    // Cleanup stale requests periodically
    setInterval(() => this.cleanupStale(), 60000);
  }

  /**
   * Check if a request with this key is already in flight
   */
  isPending(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (!pending) return false;

    // Check if stale
    if (Date.now() - pending.startedAt > this.staleAfterMs) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get the pending promise for a key, if it exists
   */
  getPending<T>(key: string): Promise<T> | null {
    const pending = this.pendingRequests.get(key);
    if (!pending) return null;

    if (Date.now() - pending.startedAt > this.staleAfterMs) {
      this.pendingRequests.delete(key);
      return null;
    }

    return pending.promise as Promise<T>;
  }

  /**
   * Register a new pending request
   */
  register<T>(key: string, promise: Promise<T>): Promise<T> {
    const pendingRequest: PendingRequest<T> = {
      promise,
      startedAt: Date.now(),
      key,
    };

    this.pendingRequests.set(key, pendingRequest as PendingRequest<unknown>);

    // Auto-cleanup when promise settles
    promise.finally(() => {
      // Only delete if it's still the same promise
      const current = this.pendingRequests.get(key);
      if (current && current.promise === promise) {
        this.pendingRequests.delete(key);
      }
    });

    return promise;
  }

  /**
   * Execute a function with deduplication
   */
  async dedupe<T>(
    key: string,
    fn: () => Promise<T>,
    options: DeduplicationOptions = {},
  ): Promise<T> {
    const { throwOnDuplicate = false } = options;

    // Check for existing pending request
    const pending = this.getPending<T>(key);
    if (pending) {
      if (throwOnDuplicate) {
        throw new DuplicateRequestError(key);
      }
      return pending;
    }

    // Execute and register
    const promise = fn();
    return this.register(key, promise);
  }

  /**
   * Clear a specific pending request
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get stats about pending requests
   */
  getStats(): { pending: number; keys: string[] } {
    return {
      pending: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }

  /**
   * Remove stale requests
   */
  private cleanupStale(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.startedAt > this.staleAfterMs) {
        this.pendingRequests.delete(key);
      }
    }
  }
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when a duplicate request is detected and throwOnDuplicate is true
 */
export class DuplicateRequestError extends Error {
  public readonly key: string;

  constructor(key: string) {
    super(`Duplicate request detected: ${key}`);
    this.name = 'DuplicateRequestError';
    this.key = key;
  }
}

// =============================================================================
// Global Instance
// =============================================================================

/** Global request deduplication manager */
export const requestDeduper = new RequestDeduplicationManager();

// =============================================================================
// Key Generators
// =============================================================================

/**
 * Generate a deduplication key from action and payload
 */
export function dedupeKey(action: string, ...args: unknown[]): string {
  const argsKey = args
    .map((arg) => {
      if (arg === null || arg === undefined) return '';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, Object.keys(arg as object).sort());
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(':');

  return `${action}:${argsKey}`;
}

/**
 * Pre-defined key generators for common mutations
 */
export const DedupeKeys = {
  // Patient operations
  createPatient: (data: {
    first_name: string;
    surname: string;
    dob?: string;
  }) => dedupeKey('create-patient', data.first_name, data.surname, data.dob),

  updatePatient: (id: string) => dedupeKey('update-patient', id),

  // Encounter operations
  createEncounter: (patientId: string, type: string) =>
    dedupeKey('create-encounter', patientId, type),

  updateEncounter: (id: string) => dedupeKey('update-encounter', id),

  // Billing operations
  createBillingOrder: (patientId: string, serviceRefId?: string) =>
    dedupeKey('create-billing', patientId, serviceRefId),

  verifyPayment: (billingId: string) => dedupeKey('verify-payment', billingId),

  // Lab operations
  acceptLabRequest: (requestId: string) => dedupeKey('accept-lab', requestId),

  rejectLabRequest: (requestId: string) => dedupeKey('reject-lab', requestId),

  // Radiology operations
  acceptRadiologyRequest: (requestId: string) =>
    dedupeKey('accept-radiology', requestId),

  rejectRadiologyRequest: (requestId: string) =>
    dedupeKey('reject-radiology', requestId),

  // Pharmacy operations
  acceptPrescription: (prescriptionId: string) =>
    dedupeKey('accept-prescription', prescriptionId),

  rejectPrescription: (prescriptionId: string) =>
    dedupeKey('reject-prescription', prescriptionId),

  // Clinical requests
  approveProcedure: (requestId: string) =>
    dedupeKey('approve-procedure', requestId),

  rejectProcedure: (requestId: string) =>
    dedupeKey('reject-procedure', requestId),
};

// =============================================================================
// Decorator / Wrapper Functions
// =============================================================================

/**
 * Wrap an async function with request deduplication
 *
 * @example
 * const createPatientDedupe = withDeduplication(
 *   createPatient,
 *   (dto) => DedupeKeys.createPatient(dto)
 * );
 */
export function withDeduplication<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  options: DeduplicationOptions = {},
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    return requestDeduper.dedupe(key, () => fn(...args), options);
  };
}

/**
 * React hook-friendly wrapper for mutations with deduplication
 *
 * @example
 * const { mutate, isPending } = useMutation({
 *   mutationFn: deduplicatedMutation(
 *     'create-patient',
 *     createPatient
 *   ),
 * });
 */
export function deduplicatedMutation<TArgs, TResult>(
  actionName: string,
  fn: (args: TArgs) => Promise<TResult>,
  options: DeduplicationOptions = {},
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs): Promise<TResult> => {
    const key = options.keyGenerator
      ? options.keyGenerator(args)
      : dedupeKey(actionName, args);

    return requestDeduper.dedupe(key, () => fn(args), options);
  };
}

// =============================================================================
// Batch Operation Support
// =============================================================================

/**
 * Deduplicate batch operations by individual item IDs
 * Prevents the same item from being processed in multiple concurrent batches
 */
export function deduplicateBatchItems<T extends { id?: string }>(
  items: T[],
  actionPrefix: string,
): { unique: T[]; duplicates: T[] } {
  const unique: T[] = [];
  const duplicates: T[] = [];

  for (const item of items) {
    if (!item.id) {
      unique.push(item);
      continue;
    }

    const key = `${actionPrefix}:${item.id}`;
    if (requestDeduper.isPending(key)) {
      duplicates.push(item);
    } else {
      unique.push(item);
    }
  }

  return { unique, duplicates };
}

// =============================================================================
// Exports
// =============================================================================

export default requestDeduper;
