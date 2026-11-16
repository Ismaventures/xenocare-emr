/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - useFacilityId Hook
 * =============================================================================
 *
 * Resolves the current user's facility_id with a fallback to the default
 * (first) facility. This prevents the "0 data" bug where staff members
 * with NULL facility_id see empty dashboards across all facility-scoped modules.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../api/supabaseClient';

/**
 * Returns a resolved facility_id — either from the staff record
 * or by falling back to the first facility in the database.
 *
 * Also auto-patches the staff record if facility_id was missing,
 * so subsequent page loads work without the fallback.
 */
export function useFacilityId(): {
  facilityId: string | null;
  isLoading: boolean;
} {
  const { staff } = useAuth();
  const staffFacilityId = staff?.facility_id;

  // Only fetch fallback when staff exists but has no facility_id
  const { data: fallbackFacilityId, isLoading } = useQuery({
    queryKey: ['default-facility'],
    queryFn: async () => {
      const { data: facility } = await supabase
        .from('facilities')
        .select('id')
        .limit(1)
        .single();

      const fid = facility?.id || null;

      // Auto-patch the staff record so this fix is permanent
      if (fid && staff?.id) {
        await supabase
          .from('staff')
          .update({ facility_id: fid })
          .eq('id', staff.id)
          .is('facility_id', null);
      }

      return fid;
    },
    enabled: !!staff && !staffFacilityId,
    staleTime: Infinity, // Only fetch once per session
    gcTime: Infinity,
  });

  return {
    facilityId: staffFacilityId || fallbackFacilityId || null,
    isLoading: !staffFacilityId && isLoading,
  };
}
