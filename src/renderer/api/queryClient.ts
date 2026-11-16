import {
  QueryClient,
  QueryCache,
  MutationCache,
  Query,
} from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { supabase } from './supabaseClient';
import {
  isVersionConflictError,
  toSimpleUserErrorMessage,
} from '../lib/errors/errorNormalization';
import {
  clearIndexedDbQueryClientCache,
  createIndexedDbQueryPersister,
} from '../lib/offline/storage/queryPersister';
import { createScopedLogger } from '../utils/logger';

export const QUERY_CACHE_OWNER_KEY = 'ndc_react_query_cache_owner_v1';

const log = createScopedLogger('QueryClient');

const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h
let hasBootstrappedPersistence = false;

const NON_PERSISTENT_ROOT_KEYS = new Set([
  'auth',
  'notifications',
  'messaging',
  'queue',
  // Catalogue / reference-data queries must NOT be persisted.
  // They require an authenticated session (RLS) and would be stored as [] if
  // fetched pre-login. That empty array is then restored by persistQueryClient
  // asynchronously — *after* the SIGNED_IN removeQueries call — causing an
  // async race that serves empty dropdowns even after the user logs in.
  // Catalogues are small reference tables; always fetch fresh after login.
  'catalogues',
]);

function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;

  const key = query.queryKey as readonly unknown[];
  const root = String(key[0] || '').toLowerCase();
  if (NON_PERSISTENT_ROOT_KEYS.has(root)) return false;

  const keyText = key.map((part) => String(part).toLowerCase()).join(':');
  if (keyText.includes('search')) return false;
  if (keyText.includes('notification')) return false;
  if (keyText.includes('unread')) return false;

  // Radiology imaging catalogue also requires auth — exclude from persistence.
  if (root === 'radiology' && keyText.includes('catalogue')) return false;

  // Highly volatile live workflow queues are better fetched fresh.
  if (root === 'workflow' && keyText.includes('encounters')) return false;

  return true;
}

export function setupPersistentQueryCache(): void {
  if (hasBootstrappedPersistence || typeof window === 'undefined') return;

  const persister = createIndexedDbQueryPersister();

  // persistQueryClient returns [unsubscribe, restorePromise].
  // Purge catalogue entries AFTER the restore promise resolves so the removal
  // always runs after IndexedDB hydration — not on a blind 300ms timer that
  // could fire before the async restoration completes.
  const [, restorePromise] = persistQueryClient({
    queryClient,
    persister,
    maxAge: QUERY_CACHE_MAX_AGE_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: shouldPersistQuery,
    },
  });

  void restorePromise
    .then(() => {
      queryClient.removeQueries({ queryKey: ['catalogues'] });
      queryClient.removeQueries({ queryKey: ['radiology', 'catalogue'] });
    })
    .catch((error) => {
      log.warn('Failed to restore persisted query cache', { error });
      queryClient.removeQueries({ queryKey: ['catalogues'] });
      queryClient.removeQueries({ queryKey: ['radiology', 'catalogue'] });
    });

  hasBootstrappedPersistence = true;
}

export function clearPersistedQueryCache(): void {
  void clearIndexedDbQueryClientCache();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds - fresher data across modules
      gcTime: 1000 * 60 * 60 * 2, // 2 hours - keep recently visited module data warm
      placeholderData: (previousData) => previousData,
      retry: 1,
      // Clinic staff constantly alt-tab between EMR, lab system, etc.
      // refetchOnWindowFocus:true would trigger a full waterfall refetch on
      // every window switch — generating hundreds of Supabase round-trips
      // per session with zero user benefit. Stale data is handled by
      // the 30s staleTime + realtime invalidation instead.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch once on reconnect if stale
      networkMode: 'offlineFirst', // Use cached data first, then fetch
    },
    mutations: {
      networkMode: 'always',
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Suppress expected ICD unavailability — the component UI handles this gracefully
      if (
        error &&
        typeof error === 'object' &&
        (error as { code?: string }).code === 'ICD_UNAVAILABLE'
      )
        return;
      if (isVersionConflictError(error)) return;
      if (
        error instanceof Error &&
        error.message.includes('Electron IPC not available')
      ) {
        return;
      }
      console.error('[Query Error]:', {
        queryKey: query.queryKey,
        error: toSimpleUserErrorMessage(error),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      if (isVersionConflictError(error)) return;
      console.error('[Mutation Error]:', {
        mutationKey: mutation.options.mutationKey,
        variables,
        error: toSimpleUserErrorMessage(error),
      });
    },
  }),
});

// Prefetch commonly used data on app startup
export const prefetchCommonData = async () => {
  // These are lightweight reference datasets used throughout modules.
  const prefetchPromises = [
    queryClient.prefetchQuery({
      queryKey: ['staff', 'list'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('staff')
          .select('id,staff_id,first_name,last_name,role,department,is_active')
          .eq('is_active', true)
          .order('first_name')
          .limit(300);
        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 10, // 10 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: ['departments', 'list', undefined],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .order('name');
        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 30, // 30 minutes
    }),
  ];

  await Promise.allSettled(prefetchPromises);
};
