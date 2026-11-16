/**
 * Cache Layer for NDC MEDICAL CENTRE EMR
 *
 * Session-scoped cache invalidation utilities.
 *
 * NOTE: The previous in-memory MemoryCache, cacheAside, withCache,
 * writeThroughCache, cachedReferenceData, cachedUserData,
 * setupRealtimeCacheInvalidation, and clearUserSpecificStores were removed
 * because they are no longer needed. All query caching is handled by React
 * Query with IndexedDB persistence (see queryClient.ts and queryPersister.ts).
 * Cross-user isolation is handled by clearPersistedQueryCache() in AuthContext.
 *
 * Realtime invalidation is now handled by realtimeInvalidation.ts which
 * bridges Supabase Realtime events directly to queryClient.invalidateQueries.
 *
 * @module cacheLayer
 */

import { queryClient } from '../api/queryClient';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('CacheLayer');

// =============================================================================
// Session Cleanup
// =============================================================================

/**
 * Clear session-specific React Query data on logout while preserving
 * reference data and catalogue queries that are identical across users.
 *
 * Called by AuthContext.signOut().
 */
export function clearSessionData(): number {
  let deleted = 0;

  const sessionPrefixes = [
    'user',
    'patient',
    'encounter',
    'billing',
    'stats',
    'queue',
    'vitals',
    'consultation',
    'prescriptions',
    'lab',
    'radiology',
    'nursing',
    'admission',
    'procedure',
    'pharmacy',
    'specialty',
    'dental',
    'ophthalmology',
    'workflow',
    'myPatients',
    'patientHistory',
  ];

  const cache = queryClient.getQueryCache();
  const allQueries = cache.getAll();

  for (const query of allQueries) {
    const root = String(
      (query.queryKey as readonly unknown[])[0] || '',
    ).toLowerCase();
    if (sessionPrefixes.includes(root)) {
      cache.remove(query);
      deleted += 1;
    }
  }

  // Reference data (departments, staff list, catalogues, ICD-10, drugs)
  // is intentionally kept — it's shared across users and expensive to re-fetch.
  log.info(
    `[Cache] Cleared ${deleted} session queries, kept reference data`,
  );
  return deleted;
}