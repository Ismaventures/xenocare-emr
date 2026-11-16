// =============================================================================
// XENOCARE EMR - useBeds Hook
// React Query hook for bed management
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { useAuth } from '../../../contexts/AuthContext';
import { useFacilityId } from '../../../hooks/useFacilityId';
import * as bedsApi from '../api/beds.api';
import type { BedStatus, BedType } from '../../../types/database.types';
import { wardKeys } from './useWards';

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  >,
) =>
  useBackgroundMutation<TData, TError, TVariables, TContext>({
    backgroundScope: 'inpatient:beds:write',
    maxRetries: 4,
    ...options,
  });

// Query keys
export const bedKeys = {
  all: ['beds'] as const,
  lists: () => [...bedKeys.all, 'list'] as const,
  byWard: (wardId: string) => [...bedKeys.lists(), 'ward', wardId] as const,
  available: (wardId: string) =>
    [...bedKeys.byWard(wardId), 'available'] as const,
  availableInFacility: (facilityId: string) =>
    [...bedKeys.lists(), 'facility', facilityId, 'available'] as const,
  byStatus: (wardId: string, status: BedStatus) =>
    [...bedKeys.byWard(wardId), status] as const,
  detail: (id: string) => [...bedKeys.all, 'detail', id] as const,
  availability: (facilityId: string) =>
    [...bedKeys.all, 'availability', facilityId] as const,
  stats: (wardId: string) => [...bedKeys.all, 'stats', wardId] as const,
};

/**
 * Hook to fetch beds in a ward
 */
export function useBedsByWard(wardId: string) {
  return useQuery({
    queryKey: bedKeys.byWard(wardId),
    queryFn: () => bedsApi.getBedsByWard(wardId),
    enabled: !!wardId,
  });
}

/**
 * Hook to fetch a single bed
 */
export function useBed(bedId: string) {
  return useQuery({
    queryKey: bedKeys.detail(bedId),
    queryFn: () => bedsApi.getBedById(bedId),
    enabled: !!bedId,
  });
}

/**
 * Hook to fetch available beds in a ward
 */
export function useAvailableBeds(wardId: string) {
  return useQuery({
    queryKey: bedKeys.available(wardId),
    queryFn: () => bedsApi.getAvailableBedsByWard(wardId),
    enabled: !!wardId,
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to fetch available beds across facility
 */
export function useAvailableBedsInFacility() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: bedKeys.availableInFacility(facilityId || ''),
    queryFn: () => bedsApi.getAvailableBedsInFacility(facilityId!),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch bed availability view
 */
export function useBedAvailability() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: bedKeys.availability(facilityId || ''),
    queryFn: () => bedsApi.getBedAvailability(facilityId!),
    enabled: !!facilityId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch beds by status
 */
export function useBedsByStatus(wardId: string, status: BedStatus) {
  return useQuery({
    queryKey: bedKeys.byStatus(wardId, status),
    queryFn: () => bedsApi.getBedsByStatus(wardId, status),
    enabled: !!wardId,
  });
}

/**
 * Hook to fetch bed occupancy stats
 */
export function useBedOccupancyStats(wardId: string) {
  return useQuery({
    queryKey: bedKeys.stats(wardId),
    queryFn: () => bedsApi.getBedOccupancyStats(wardId),
    enabled: !!wardId,
  });
}

/**
 * Hook to create a new bed
 */
export function useCreateBed() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: (data: Parameters<typeof bedsApi.createBed>[0]) =>
      bedsApi.createBed(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bedKeys.byWard(data.ward_id) });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to create multiple beds
 */
export function useCreateBulkBeds() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: ({
      wardId,
      bedType,
      startNumber,
      count,
      prefix,
      dailyRate,
    }: {
      wardId: string;
      bedType: BedType;
      startNumber: number;
      count: number;
      prefix?: string;
      dailyRate?: number;
    }) =>
      bedsApi.createBulkBeds(
        wardId,
        bedType,
        startNumber,
        count,
        prefix,
        dailyRate,
      ),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: bedKeys.byWard(data[0].ward_id),
        });
        queryClient.invalidateQueries({
          queryKey: bedKeys.availability(facilityId || ''),
        });
        queryClient.invalidateQueries({
          queryKey: wardKeys.census(facilityId || ''),
        });
      }
    },
  });
}

/**
 * Hook to update a bed
 */
export function useUpdateBed() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: ({
      bedId,
      updates,
    }: {
      bedId: string;
      updates: Parameters<typeof bedsApi.updateBed>[1];
    }) => bedsApi.updateBed(bedId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bedKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: bedKeys.byWard(data.ward_id) });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to update bed status
 */
export function useUpdateBedStatus() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: ({ bedId, status }: { bedId: string; status: BedStatus }) =>
      bedsApi.updateBedStatus(bedId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bedKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: bedKeys.byWard(data.ward_id) });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to reserve a bed
 */
export function useReserveBed() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: ({ bedId, patientId }: { bedId: string; patientId: string }) =>
      bedsApi.reserveBed(bedId, patientId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bedKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: bedKeys.byWard(data.ward_id) });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to deactivate a bed
 */
export function useDeactivateBed() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: (bedId: string) => bedsApi.deactivateBed(bedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bedKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}
