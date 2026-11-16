// =============================================================================
// XENOCARE EMR - useProcedureCatalogue Hook
// React Query hook for procedure catalogue management
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { useAuth } from '../../../contexts/AuthContext';
import * as catalogueApi from '../api/procedure-catalogue.api';
import type {
  ProcedureCategory,
  ProcedureCatalogue,
} from '../../../types/database.types';

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
    backgroundScope: 'procedures:catalogue:write',
    maxRetries: 4,
    ...options,
  });

// Query keys
export const catalogueKeys = {
  all: ['procedure-catalogue'] as const,
  lists: () => [...catalogueKeys.all, 'list'] as const,
  list: (facilityId?: string) =>
    [...catalogueKeys.lists(), facilityId] as const,
  byCategory: (category: ProcedureCategory, facilityId?: string) =>
    [...catalogueKeys.list(facilityId), category] as const,
  search: (term: string, facilityId?: string) =>
    [...catalogueKeys.lists(), 'search', term, facilityId] as const,
  detail: (id: string) => [...catalogueKeys.all, 'detail', id] as const,
  byCode: (code: string) => [...catalogueKeys.all, 'code', code] as const,
  withAnesthesia: (facilityId?: string) =>
    [...catalogueKeys.list(facilityId), 'anesthesia'] as const,
  withAdmission: (facilityId?: string) =>
    [...catalogueKeys.list(facilityId), 'admission'] as const,
  categoryCounts: (facilityId?: string) =>
    [...catalogueKeys.all, 'counts', facilityId] as const,
};

/**
 * Hook to fetch procedure catalogue
 */
export function useProcedureCatalogue() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;

  return useQuery({
    queryKey: catalogueKeys.list(facilityId),
    queryFn: () => catalogueApi.getProcedureCatalogue(facilityId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch a single procedure from catalogue
 */
export function useProcedureFromCatalogue(procedureId: string) {
  return useQuery({
    queryKey: catalogueKeys.detail(procedureId),
    queryFn: () => catalogueApi.getProcedureFromCatalogue(procedureId),
    enabled: !!procedureId,
  });
}

/**
 * Hook to fetch procedure by code
 */
export function useProcedureByCode(code: string) {
  return useQuery({
    queryKey: catalogueKeys.byCode(code),
    queryFn: () => catalogueApi.getProcedureByCode(code),
    enabled: !!code,
  });
}

/**
 * Hook to fetch procedures by category
 */
export function useProceduresByCategory(category: ProcedureCategory) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;

  return useQuery({
    queryKey: catalogueKeys.byCategory(category, facilityId),
    queryFn: () => catalogueApi.getProceduresByCategory(category, facilityId),
    enabled: !!category,
  });
}

/**
 * Hook to search procedure catalogue
 */
export function useSearchProcedureCatalogue(searchTerm: string) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;

  return useQuery({
    queryKey: catalogueKeys.search(searchTerm, facilityId),
    queryFn: () =>
      catalogueApi.searchProcedureCatalogue(searchTerm, facilityId),
    enabled: searchTerm.length >= 2,
  });
}

/**
 * Hook to fetch procedures requiring anesthesia
 */
export function useProceduresRequiringAnesthesia() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;

  return useQuery({
    queryKey: catalogueKeys.withAnesthesia(facilityId),
    queryFn: () => catalogueApi.getProceduresRequiringAnesthesia(facilityId),
  });
}

/**
 * Hook to fetch procedures requiring admission
 */
export function useProceduresRequiringAdmission() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;

  return useQuery({
    queryKey: catalogueKeys.withAdmission(facilityId),
    queryFn: () => catalogueApi.getProceduresRequiringAdmission(facilityId),
  });
}

/**
 * Hook to fetch procedure category counts
 */
export function useProcedureCategoryCounts() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;

  return useQuery({
    queryKey: catalogueKeys.categoryCounts(facilityId),
    queryFn: () => catalogueApi.getProcedureCategoryCounts(facilityId),
  });
}

/**
 * Hook to create procedure in catalogue
 */
export function useCreateProcedureInCatalogue() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;
  const userId = staff?.id;

  return useMutation({
    mutationFn: (
      data: Omit<ProcedureCatalogue, 'id' | 'created_at' | 'updated_at'>,
    ) =>
      catalogueApi.createProcedureInCatalogue(
        { ...data, facility_id: facilityId || null },
        userId!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: catalogueKeys.categoryCounts(facilityId),
      });
    },
  });
}

/**
 * Hook to update procedure in catalogue
 */
export function useUpdateProcedureInCatalogue() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      procedureId,
      updates,
    }: {
      procedureId: string;
      updates: Partial<Omit<ProcedureCatalogue, 'id' | 'created_at' | 'code'>>;
    }) =>
      catalogueApi.updateProcedureInCatalogue(procedureId, updates, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: catalogueKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.lists() });
    },
  });
}

/**
 * Hook to deactivate procedure in catalogue
 */
export function useDeactivateProcedureInCatalogue() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id ?? undefined;
  const userId = staff?.id;

  return useMutation({
    mutationFn: (procedureId: string) =>
      catalogueApi.deactivateProcedureInCatalogue(procedureId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogueKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: catalogueKeys.categoryCounts(facilityId),
      });
    },
  });
}

/**
 * Hook to update procedure pricing
 */
export function useUpdateProcedurePricing() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      procedureId,
      pricing,
    }: {
      procedureId: string;
      pricing: {
        base_price?: number;
        nhis_price?: number;
        professional_fee?: number;
        facility_fee?: number;
      };
    }) => catalogueApi.updateProcedurePricing(procedureId, pricing, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: catalogueKeys.detail(data.id),
      });
      queryClient.invalidateQueries({ queryKey: catalogueKeys.lists() });
    },
  });
}
