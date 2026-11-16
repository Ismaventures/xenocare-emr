// =============================================================================
// XENOCARE EMR - useWards Hook
// React Query hook for ward management
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { useAuth } from '../../../contexts/AuthContext';
import { useFacilityId } from '../../../hooks/useFacilityId';
import * as wardsApi from '../api/wards.api';
import type { WardType } from '../../../types/database.types';

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  > & {
    backgroundScope?: string;
    maxRetries?: number;
  },
) => {
  const {
    backgroundScope = 'inpatient:wards:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// Query keys
export const wardKeys = {
  all: ['wards'] as const,
  lists: () => [...wardKeys.all, 'list'] as const,
  list: (facilityId: string) => [...wardKeys.lists(), facilityId] as const,
  byType: (facilityId: string, type: WardType) =>
    [...wardKeys.list(facilityId), type] as const,
  detail: (id: string) => [...wardKeys.all, 'detail', id] as const,
  census: (facilityId: string) =>
    [...wardKeys.all, 'census', facilityId] as const,
  available: (facilityId: string) =>
    [...wardKeys.all, 'available', facilityId] as const,
};

/**
 * Hook to fetch all wards
 */
export function useWards() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: wardKeys.list(facilityId || ''),
    queryFn: () => wardsApi.getWards(facilityId!),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch a single ward
 */
export function useWard(wardId: string) {
  return useQuery({
    queryKey: wardKeys.detail(wardId),
    queryFn: () => wardsApi.getWardById(wardId),
    enabled: !!wardId,
  });
}

/**
 * Hook to fetch wards by type
 */
export function useWardsByType(wardType: WardType) {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: wardKeys.byType(facilityId || '', wardType),
    queryFn: () => wardsApi.getWardsByType(facilityId!, wardType),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch ward census data
 */
export function useWardCensus() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: wardKeys.census(facilityId || ''),
    queryFn: () => wardsApi.getWardCensus(facilityId!),
    enabled: !!facilityId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch wards with available beds
 */
export function useWardsWithAvailability() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: wardKeys.available(facilityId || ''),
    queryFn: () => wardsApi.getWardsWithAvailability(facilityId!),
    enabled: !!facilityId,
  });
}

/**
 * Hook to create a new ward
 */
export function useCreateWard() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof wardsApi.createWard>[0], 'facility_id'>,
    ) => wardsApi.createWard({ ...data, facility_id: facilityId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wardKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to update a ward
 */
export function useUpdateWard() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: ({
      wardId,
      updates,
    }: {
      wardId: string;
      updates: Parameters<typeof wardsApi.updateWard>[1];
    }) => wardsApi.updateWard(wardId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: wardKeys.detail(data.id) });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to deactivate a ward
 */
export function useDeactivateWard() {
  const queryClient = useQueryClient();
  const { facilityId } = useFacilityId();

  return useMutation({
    mutationFn: (wardId: string) => wardsApi.deactivateWard(wardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wardKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to assign head nurse to ward
 */
export function useAssignHeadNurse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wardId, nurseId }: { wardId: string; nurseId: string }) =>
      wardsApi.assignHeadNurse(wardId, nurseId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wardKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: wardKeys.lists() });
    },
  });
}
