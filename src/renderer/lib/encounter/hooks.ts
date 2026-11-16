/**
 * Encounter Hooks
 *
 * React Query hooks for encounter operations with validation.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../hooks/useBackgroundMutation';
import {
  getEncounterSummary,
  getPatientEncounters,
  getActiveEncounters,
  getEncountersByStage,
  closeEncounter,
  reopenEncounter,
  createAddendum,
  getEncounterAddendums,
  validateEncounterForModification,
  EncounterSummary,
  CloseEncounterParams,
  ReopenEncounterParams,
  CreateAddendumParams,
} from './validation';
import { getEncounterAuditTrail, AuditLogEntry } from '../audit';

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
    backgroundScope: 'encounter:lib:write',
    maxRetries: 4,
    ...options,
  });

// =============================================================================
// Query Keys
// =============================================================================

export const encounterKeys = {
  all: ['encounters'] as const,
  lists: () => [...encounterKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...encounterKeys.lists(), filters] as const,
  details: () => [...encounterKeys.all, 'detail'] as const,
  detail: (id: string) => [...encounterKeys.details(), id] as const,
  patient: (patientId: string) =>
    [...encounterKeys.all, 'patient', patientId] as const,
  active: () => [...encounterKeys.all, 'active'] as const,
  byStage: (stage: string) => [...encounterKeys.all, 'stage', stage] as const,
  addendums: (encounterId: string) =>
    [...encounterKeys.all, 'addendums', encounterId] as const,
  audit: (encounterId: string) =>
    [...encounterKeys.all, 'audit', encounterId] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Get encounter summary by ID
 */
export function useEncounterSummary(encounterId: string | null) {
  return useQuery({
    queryKey: encounterKeys.detail(encounterId || ''),
    queryFn: () => getEncounterSummary(encounterId!),
    enabled: !!encounterId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get all encounters for a patient
 */
export function usePatientEncounters(patientId: string | null) {
  return useQuery({
    queryKey: encounterKeys.patient(patientId || ''),
    queryFn: () => getPatientEncounters(patientId!),
    enabled: !!patientId,
  });
}

/**
 * Get all active encounters
 */
export function useActiveEncounters() {
  return useQuery({
    queryKey: encounterKeys.active(),
    queryFn: getActiveEncounters,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get encounters by stage
 */
export function useEncountersByStage(stage: string) {
  return useQuery({
    queryKey: encounterKeys.byStage(stage),
    queryFn: () => getEncountersByStage(stage),
    enabled: !!stage,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Get addendums for an encounter
 */
export function useEncounterAddendums(encounterId: string | null) {
  return useQuery({
    queryKey: encounterKeys.addendums(encounterId || ''),
    queryFn: () => getEncounterAddendums(encounterId!),
    enabled: !!encounterId,
  });
}

/**
 * Get audit trail for an encounter
 */
export function useEncounterAudit(encounterId: string | null) {
  return useQuery({
    queryKey: encounterKeys.audit(encounterId || ''),
    queryFn: () => getEncounterAuditTrail(encounterId!),
    enabled: !!encounterId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Close an encounter
 */
export function useCloseEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CloseEncounterParams) => closeEncounter(params),
    onSuccess: (_, variables) => {
      // Invalidate encounter queries
      queryClient.invalidateQueries({
        queryKey: encounterKeys.detail(variables.encounterId),
      });
      queryClient.invalidateQueries({ queryKey: encounterKeys.active() });
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });
    },
  });
}

/**
 * Reopen an encounter
 */
export function useReopenEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ReopenEncounterParams) => reopenEncounter(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: encounterKeys.detail(variables.encounterId),
      });
      queryClient.invalidateQueries({ queryKey: encounterKeys.active() });
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });
    },
  });
}

/**
 * Create an addendum
 */
export function useCreateAddendum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateAddendumParams) => createAddendum(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: encounterKeys.addendums(variables.encounterId),
      });
    },
  });
}

// =============================================================================
// Validation Hooks
// =============================================================================

/**
 * Hook for encounter validation
 */
export function useEncounterValidation(encounterId: string | null) {
  const validateForModification = useCallback(async () => {
    if (!encounterId) {
      return { isValid: false, error: 'No encounter selected' };
    }
    return validateEncounterForModification(encounterId);
  }, [encounterId]);

  return {
    validateForModification,
  };
}

/**
 * Hook to check if current encounter allows modifications
 */
export function useCanModifyEncounter(encounterId: string | null) {
  const { data: encounter } = useEncounterSummary(encounterId);

  return {
    canModify: encounter?.is_active ?? false,
    isReadOnly: encounter ? !encounter.is_active : true,
    status: encounter?.status,
    stage: encounter?.current_stage,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to get encounter context for forms
 */
export function useEncounterContext(encounterId: string | null) {
  const {
    data: encounter,
    isLoading,
    error,
  } = useEncounterSummary(encounterId);
  const { canModify, isReadOnly } = useCanModifyEncounter(encounterId);

  return {
    encounter,
    isLoading,
    error,
    canModify,
    isReadOnly,
    encounterId: encounter?.visit_id,
    patientId: encounter?.patient_id,
    patientName: encounter?.patient_name,
    fileNumber: encounter?.file_number,
    stage: encounter?.current_stage,
    status: encounter?.status,
  };
}

export default {
  useEncounterSummary,
  usePatientEncounters,
  useActiveEncounters,
  useEncountersByStage,
  useEncounterAddendums,
  useEncounterAudit,
  useCloseEncounter,
  useReopenEncounter,
  useCreateAddendum,
  useEncounterValidation,
  useCanModifyEncounter,
  useEncounterContext,
  encounterKeys,
};
