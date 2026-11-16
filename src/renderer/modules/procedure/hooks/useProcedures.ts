// =============================================================================
// XENOCARE EMR - useProcedures Hook
// React Query hook for procedure management
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { useAuth } from '../../../contexts/AuthContext';
import { getVisibilityAwareRefetchInterval } from '../../../lib/query/polling';
import { scheduleQueryInvalidations } from '../../../lib/query/invalidation';
import * as proceduresApi from '../api/procedures.api';
import * as consumablesApi from '../api/procedure-consumables.api';
import type {
  ProcedureStatus,
  CreateProcedureDTO,
  UpdateProcedureDTO,
  PreOpChecklist,
  CreateProcedureConsumableDTO,
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
    backgroundScope: 'procedures:write',
    maxRetries: 4,
    ...options,
  });

// Query keys
export const procedureKeys = {
  all: ['procedures'] as const,
  lists: () => [...procedureKeys.all, 'list'] as const,
  today: (facilityId: string) =>
    [...procedureKeys.lists(), 'today', facilityId] as const,
  byDateRange: (facilityId: string, start: string, end: string) =>
    [...procedureKeys.lists(), facilityId, start, end] as const,
  byPatient: (patientId: string) =>
    [...procedureKeys.lists(), 'patient', patientId] as const,
  byAdmission: (admissionId: string) =>
    [...procedureKeys.lists(), 'admission', admissionId] as const,
  byStatus: (facilityId: string, status: ProcedureStatus) =>
    [...procedureKeys.lists(), facilityId, status] as const,
  bySurgeon: (surgeonId: string) =>
    [...procedureKeys.lists(), 'surgeon', surgeonId] as const,
  pending: (facilityId: string) =>
    [...procedureKeys.lists(), 'pending', facilityId] as const,
  search: (facilityId: string, term: string) =>
    [...procedureKeys.lists(), 'search', facilityId, term] as const,
  detail: (id: string) => [...procedureKeys.all, 'detail', id] as const,
  byNumber: (number: string) =>
    [...procedureKeys.all, 'number', number] as const,
  stats: (facilityId: string, start: string, end: string) =>
    [...procedureKeys.all, 'stats', facilityId, start, end] as const,
  consumables: (procedureId: string) =>
    [...procedureKeys.detail(procedureId), 'consumables'] as const,
  consumablesCost: (procedureId: string) =>
    [...procedureKeys.consumables(procedureId), 'cost'] as const,
};

/**
 * Hook to fetch today's procedures
 */
export function useTodaysProcedures() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: procedureKeys.today(facilityId || ''),
    queryFn: () => proceduresApi.getTodaysProcedures(facilityId!),
    enabled: !!facilityId,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
  });
}

/**
 * Hook to fetch procedures by date range
 */
export function useProceduresByDateRange(startDate: string, endDate: string) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: procedureKeys.byDateRange(facilityId || '', startDate, endDate),
    queryFn: () =>
      proceduresApi.getProceduresByDateRange(facilityId!, startDate, endDate),
    enabled: !!facilityId && !!startDate && !!endDate,
  });
}

/**
 * Hook to fetch a single procedure
 */
export function useProcedure(procedureId: string) {
  return useQuery({
    queryKey: procedureKeys.detail(procedureId),
    queryFn: () => proceduresApi.getProcedureById(procedureId),
    enabled: !!procedureId,
  });
}

/**
 * Hook to fetch procedure by number
 */
export function useProcedureByNumber(procedureNumber: string) {
  return useQuery({
    queryKey: procedureKeys.byNumber(procedureNumber),
    queryFn: () => proceduresApi.getProcedureByNumber(procedureNumber),
    enabled: !!procedureNumber,
  });
}

/**
 * Hook to fetch patient procedures
 */
export function usePatientProcedures(patientId: string) {
  return useQuery({
    queryKey: procedureKeys.byPatient(patientId),
    queryFn: () => proceduresApi.getPatientProcedures(patientId),
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch admission procedures
 */
export function useAdmissionProcedures(admissionId: string) {
  return useQuery({
    queryKey: procedureKeys.byAdmission(admissionId),
    queryFn: () => proceduresApi.getAdmissionProcedures(admissionId),
    enabled: !!admissionId,
  });
}

/**
 * Hook to fetch procedures by status
 */
export function useProceduresByStatus(status: ProcedureStatus) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: procedureKeys.byStatus(facilityId || '', status),
    queryFn: () => proceduresApi.getProceduresByStatus(facilityId!, status),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch procedures by surgeon (current user)
 */
export function useMyProcedures(startDate?: string, endDate?: string) {
  const { staff } = useAuth();
  const surgeonId = staff?.id;

  return useQuery({
    queryKey: procedureKeys.bySurgeon(surgeonId || ''),
    queryFn: () =>
      proceduresApi.getProceduresBySurgeon(surgeonId!, startDate, endDate),
    enabled: !!surgeonId,
  });
}

/**
 * Hook to fetch pending procedures
 */
export function usePendingProcedures() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: procedureKeys.pending(facilityId || ''),
    queryFn: () => proceduresApi.getPendingProcedures(facilityId!),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch completed procedures
 */
export function useCompletedProcedures(limit?: number) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: [...procedureKeys.lists(), 'completed', facilityId, limit],
    queryFn: () => proceduresApi.getCompletedProcedures(facilityId!, limit),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch all procedures
 */
export function useAllProcedures(limit?: number) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: [...procedureKeys.lists(), 'all', facilityId, limit],
    queryFn: () => proceduresApi.getAllProcedures(facilityId!, limit),
    enabled: !!facilityId,
  });
}

/**
 * Hook to search procedures
 */
export function useSearchProcedures(searchTerm: string) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: procedureKeys.search(facilityId || '', searchTerm),
    queryFn: () => proceduresApi.searchProcedures(facilityId!, searchTerm),
    enabled: !!facilityId && searchTerm.length >= 2,
  });
}

/**
 * Hook to fetch procedure statistics
 */
export function useProcedureStatistics(startDate: string, endDate: string) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: procedureKeys.stats(facilityId || '', startDate, endDate),
    queryFn: () =>
      proceduresApi.getProcedureStatistics(facilityId!, startDate, endDate),
    enabled: !!facilityId && !!startDate && !!endDate,
  });
}

/**
 * Hook to create a procedure
 */
export function useCreateProcedure() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;
  const userId = staff?.id;

  return useMutation({
    mutationFn: (data: CreateProcedureDTO) =>
      proceduresApi.createProcedure(facilityId!, data, userId!),
    onSuccess: (data) => {
      const keys = [
        procedureKeys.lists(),
        procedureKeys.byPatient(data.patient_id),
      ];
      if (data.admission_id) {
        keys.push(procedureKeys.byAdmission(data.admission_id));
      }

      scheduleQueryInvalidations(queryClient, keys);
    },
  });
}

/**
 * Hook to update a procedure
 */
export function useUpdateProcedure() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    optimisticUpdates: ({ procedureId, updates }) => [
      {
        queryKey: procedureKeys.detail(procedureId),
        updater: (prev) => {
          if (!prev || typeof prev !== 'object') return prev;
          return {
            ...(prev as Record<string, unknown>),
            ...updates,
            updated_at: new Date().toISOString(),
          };
        },
      },
    ],
    mutationFn: ({
      procedureId,
      updates,
    }: {
      procedureId: string;
      updates: UpdateProcedureDTO;
    }) => proceduresApi.updateProcedure(procedureId, updates, userId!),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        procedureKeys.detail(data.id),
        procedureKeys.lists(),
      ]);
    },
  });
}

/**
 * Hook to update procedure status
 */
export function useUpdateProcedureStatus() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;
  const userId = staff?.id;

  return useMutation({
    optimisticUpdates: ({ procedureId, status, additionalUpdates }) => [
      {
        queryKey: procedureKeys.detail(procedureId),
        updater: (prev) => {
          if (!prev || typeof prev !== 'object') return prev;
          return {
            ...(prev as Record<string, unknown>),
            status,
            ...(additionalUpdates || {}),
            updated_at: new Date().toISOString(),
          };
        },
      },
    ],
    mutationFn: ({
      procedureId,
      status,
      additionalUpdates,
    }: {
      procedureId: string;
      status: ProcedureStatus;
      additionalUpdates?: Partial<UpdateProcedureDTO>;
    }) =>
      proceduresApi.updateProcedureStatus(
        procedureId,
        status,
        userId!,
        additionalUpdates,
      ),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        procedureKeys.detail(data.id),
        procedureKeys.lists(),
        procedureKeys.today(facilityId || ''),
      ]);
    },
  });
}

/**
 * Hook to update pre-op checklist
 */
export function useUpdatePreOpChecklist() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      procedureId,
      checklist,
    }: {
      procedureId: string;
      checklist: PreOpChecklist;
    }) => proceduresApi.updatePreOpChecklist(procedureId, checklist, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: procedureKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to record consent
 */
export function useRecordProcedureConsent() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      procedureId,
      consentData,
    }: {
      procedureId: string;
      consentData: {
        consent_obtained: boolean;
        consent_notes?: string;
        consent_document_id?: string;
      };
    }) =>
      proceduresApi.recordProcedureConsent(procedureId, consentData, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: procedureKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to add procedure notes
 */
export function useAddProcedureNotes() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      procedureId,
      notes,
    }: {
      procedureId: string;
      notes: Parameters<typeof proceduresApi.addProcedureNotes>[1];
    }) => proceduresApi.addProcedureNotes(procedureId, notes, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: procedureKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to cancel a procedure
 */
export function useCancelProcedure() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;
  const userId = staff?.id;

  return useMutation({
    optimisticUpdates: ({ procedureId, reason }) => [
      {
        queryKey: procedureKeys.detail(procedureId),
        updater: (prev) => {
          if (!prev || typeof prev !== 'object') return prev;
          return {
            ...(prev as Record<string, unknown>),
            status: 'cancelled',
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          };
        },
      },
    ],
    mutationFn: ({
      procedureId,
      reason,
    }: {
      procedureId: string;
      reason: string;
    }) => proceduresApi.cancelProcedure(procedureId, reason, userId!),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        procedureKeys.detail(data.id),
        procedureKeys.lists(),
        procedureKeys.today(facilityId || ''),
      ]);
    },
  });
}

/**
 * Hook to postpone a procedure
 */
export function usePostponeProcedure() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;
  const userId = staff?.id;

  return useMutation({
    optimisticUpdates: ({ procedureId, newDate, reason }) => [
      {
        queryKey: procedureKeys.detail(procedureId),
        updater: (prev) => {
          if (!prev || typeof prev !== 'object') return prev;
          return {
            ...(prev as Record<string, unknown>),
            scheduled_date: newDate,
            postponement_reason: reason,
            updated_at: new Date().toISOString(),
          };
        },
      },
    ],
    mutationFn: ({
      procedureId,
      newDate,
      reason,
    }: {
      procedureId: string;
      newDate: string;
      reason: string;
    }) =>
      proceduresApi.postponeProcedure(procedureId, newDate, reason, userId!),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        procedureKeys.detail(data.id),
        procedureKeys.lists(),
        procedureKeys.today(facilityId || ''),
      ]);
    },
  });
}

// =============================================================================
// CONSUMABLES HOOKS
// =============================================================================

/**
 * Hook to fetch procedure consumables
 */
export function useProcedureConsumables(procedureId: string) {
  return useQuery({
    queryKey: procedureKeys.consumables(procedureId),
    queryFn: () => consumablesApi.getProcedureConsumables(procedureId),
    enabled: !!procedureId,
  });
}

/**
 * Hook to fetch consumables cost
 */
export function useProcedureConsumablesCost(procedureId: string) {
  return useQuery({
    queryKey: procedureKeys.consumablesCost(procedureId),
    queryFn: () => consumablesApi.getProcedureConsumablesTotalCost(procedureId),
    enabled: !!procedureId,
  });
}

/**
 * Hook to add consumable
 */
export function useAddProcedureConsumable() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: (data: CreateProcedureConsumableDTO) =>
      consumablesApi.addProcedureConsumable(data, userId!),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        procedureKeys.consumables(data.procedure_id),
        procedureKeys.consumablesCost(data.procedure_id),
      ]);
    },
  });
}

/**
 * Hook to add multiple consumables
 */
export function useAddBulkConsumables() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      procedureId,
      consumables,
    }: {
      procedureId: string;
      consumables: Omit<CreateProcedureConsumableDTO, 'procedure_id'>[];
    }) =>
      consumablesApi.addBulkProcedureConsumables(
        procedureId,
        consumables,
        userId!,
      ),
    onSuccess: (data) => {
      if (data.length > 0) {
        scheduleQueryInvalidations(queryClient, [
          procedureKeys.consumables(data[0].procedure_id),
          procedureKeys.consumablesCost(data[0].procedure_id),
        ]);
      }
    },
  });
}

/**
 * Hook to remove consumable
 */
export function useRemoveProcedureConsumable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      consumableId,
      procedureId,
    }: {
      consumableId: string;
      procedureId: string;
    }) => consumablesApi.removeProcedureConsumable(consumableId),
    onSuccess: (_, variables) => {
      scheduleQueryInvalidations(queryClient, [
        procedureKeys.consumables(variables.procedureId),
        procedureKeys.consumablesCost(variables.procedureId),
      ]);
    },
  });
}

// =============================================================================
// PROCEDURE HISTORY HOOKS
// =============================================================================

/**
 * Hook to fetch procedure history with filters and pagination
 */
export function useProcedureHistory(
  filters: proceduresApi.ProcedureHistoryFilters = {},
  page: number = 1,
  pageSize: number = 50,
) {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: [
      ...procedureKeys.lists(),
      'history',
      facilityId,
      filters,
      page,
      pageSize,
    ],
    queryFn: () =>
      proceduresApi.getProcedureHistory(facilityId!, filters, page, pageSize),
    enabled: !!facilityId,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch patients who have had procedures
 */
export function usePatientsWithProcedures() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: [
      ...procedureKeys.lists(),
      'patients-with-procedures',
      facilityId,
    ],
    queryFn: () => proceduresApi.getPatientsWithProcedures(facilityId!),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch procedure counts grouped by patient
 */
export function useProcedureCountByPatient() {
  const { staff } = useAuth();
  const facilityId = staff?.facility_id;

  return useQuery({
    queryKey: [...procedureKeys.lists(), 'count-by-patient', facilityId],
    queryFn: () => proceduresApi.getProcedureCountByPatient(facilityId!),
    enabled: !!facilityId,
  });
}
