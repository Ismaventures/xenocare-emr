// =============================================================================
// NDC MEDICAL CENTRE EMR - Bed Transfers Hooks
// React Query hooks for patient bed/ward transfers
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getTransferHistory,
  getTransferById,
  getTransfersByWard,
  getPendingTransfers,
  getTransfersByReason,
  createBedTransfer,
  updateTransferNotes,
  cancelPendingTransfer,
} from '../api/transfers.api';
import type {
  CreateBedTransferDTO,
  TransferReason,
} from '../../../types/database.types';
import { useAuth } from '../../../contexts/AuthContext';
import { admissionKeys } from './useAdmissions';
import { bedKeys } from './useBeds';
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
  > & {
    backgroundScope?: string;
    maxRetries?: number;
  },
) => {
  const {
    backgroundScope = 'inpatient:transfers:write',
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
export const transferKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  history: (admissionId: string) =>
    [...transferKeys.all, 'history', admissionId] as const,
  byAdmission: (admissionId: string) =>
    [...transferKeys.lists(), 'admission', admissionId] as const,
  detail: (transferId: string) =>
    [...transferKeys.all, 'detail', transferId] as const,
  byWard: (wardId: string, direction: 'incoming' | 'outgoing') =>
    [...transferKeys.all, 'byWard', wardId, direction] as const,
  pending: (facilityId: string) =>
    [...transferKeys.all, 'pending', facilityId] as const,
  byReason: (facilityId: string, reason: TransferReason) =>
    [...transferKeys.all, 'byReason', facilityId, reason] as const,
};

/**
 * Get transfer history for an admission
 */
export function useTransferHistory(admissionId: string) {
  return useQuery({
    queryKey: transferKeys.history(admissionId),
    queryFn: () => getTransferHistory(admissionId),
    enabled: !!admissionId,
  });
}

/**
 * Get a single transfer by ID
 */
export function useTransfer(transferId: string) {
  return useQuery({
    queryKey: transferKeys.detail(transferId),
    queryFn: () => getTransferById(transferId),
    enabled: !!transferId,
  });
}

/**
 * Get transfers by ward (incoming or outgoing)
 */
export function useTransfersByWard(
  wardId: string,
  direction: 'incoming' | 'outgoing',
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: [...transferKeys.byWard(wardId, direction), startDate, endDate],
    queryFn: () => getTransfersByWard(wardId, direction, startDate, endDate),
    enabled: !!wardId,
  });
}

/**
 * Get pending transfers for a facility
 */
export function usePendingTransfers(facilityId: string) {
  return useQuery({
    queryKey: transferKeys.pending(facilityId),
    queryFn: () => getPendingTransfers(facilityId),
    enabled: !!facilityId,
  });
}

/**
 * Get transfers by reason
 */
export function useTransfersByReason(
  facilityId: string,
  reason: TransferReason,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: [
      ...transferKeys.byReason(facilityId, reason),
      startDate,
      endDate,
    ],
    queryFn: () => getTransfersByReason(facilityId, reason, startDate, endDate),
    enabled: !!facilityId && !!reason,
  });
}

/**
 * Transfer patient to a different bed/ward
 */
export function useTransferPatient() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (data: {
      admission_id: string;
      to_ward_id: string;
      to_bed_id: string;
      transfer_reason: string;
      notes?: string;
    }) => {
      const userId = staff?.id;
      if (!userId) throw new Error('User not authenticated');

      const transferData: CreateBedTransferDTO = {
        admission_id: data.admission_id,
        to_ward_id: data.to_ward_id,
        to_bed_id: data.to_bed_id,
        transfer_reason: data.transfer_reason as TransferReason,
        notes: data.notes,
      };

      return createBedTransfer(transferData, userId);
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: admissionKeys.all });
      queryClient.invalidateQueries({ queryKey: bedKeys.all });
      queryClient.invalidateQueries({ queryKey: wardKeys.all });
      queryClient.invalidateQueries({
        queryKey: transferKeys.history(variables.admission_id),
      });
    },
  });
}

/**
 * Update transfer notes
 */
export function useUpdateTransferNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transferId,
      notes,
    }: {
      transferId: string;
      notes: string;
    }) => updateTransferNotes(transferId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
    },
  });
}

/**
 * Cancel a pending transfer
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: ({
      transferId,
      reason,
    }: {
      transferId: string;
      reason: string;
    }) => {
      const userId = staff?.id;
      if (!userId) throw new Error('User not authenticated');
      return cancelPendingTransfer(transferId, reason, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: admissionKeys.all });
      queryClient.invalidateQueries({ queryKey: bedKeys.all });
    },
  });
}
