import { queryClient } from '../api/queryClient';
import { supabase } from '../api/supabaseClient';

/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - REALTIME CACHE INVALIDATION
 * =============================================================================
 *
 * This module bridges Supabase Realtime functionality with React Query's
 * cache invalidation. When a database record changes (INSERT, UPDATE, DELETE),
 * this automatically marks the corresponding React Query cache entries as stale.
 *
 * Only core, high-traffic tables are supervised to prevent connection/memory overhead.
 */

// Core high-traffic tables to watch
const SUPERVISED_TABLES = [
  'patients',
  'encounters',
  'billing_orders',
  'queue',
  'prescriptions',
  'lab_requests',
  'radiology_requests',
  'vitals',
];

let realtimeSubscription: any = null;

export function setupRealtimeInvalidation() {
  if (realtimeSubscription) {
    console.warn('[Realtime] Subscription already exists.');
    return;
  }



  // We subscribe to all configured tables using a single channel to save connection slots
  let channel = supabase.channel('emr_global_cache_invalidation');

  SUPERVISED_TABLES.forEach((tableName) => {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        handleRealtimeEvent(tableName, payload);
      },
    );
  });

  realtimeSubscription = channel.subscribe();

  return () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      realtimeSubscription = null;
    }
  };
}

/**
 * Maps database tables to their respective root query keys in React Query
 * and invalidates them.
 */
function handleRealtimeEvent(table: string, _payload: unknown) {

  // Determine the root query key based on the table name
  let rootKey = '';
  switch (table) {
    case 'patients':
      rootKey = 'patient';
      break;
    case 'encounters':
      rootKey = 'encounter';
      break;
    case 'billing_orders':
      rootKey = 'billing';
      break;
    case 'queue':
      rootKey = 'queue';
      break;
    case 'prescriptions':
      rootKey = 'prescriptions';
      break;
    case 'lab_requests':
      rootKey = 'lab';
      break;
    case 'radiology_requests':
      rootKey = 'radiology';
      break;
    case 'vitals':
      rootKey = 'vitals';
      break;
    default:
      return;
  }

  // Tell React Query that any data starting with this rootKey is now stale.
  // This prompts active/visible components to refetch immediately,
  // and offline queries to pick up the new data next time they mount.
  queryClient.invalidateQueries({ queryKey: [rootKey] });
}
