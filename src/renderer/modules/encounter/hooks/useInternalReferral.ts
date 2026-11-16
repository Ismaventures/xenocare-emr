/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - INTERNAL REFERRAL HOOKS
 *
 * React Query hooks for managing internal referrals in the Encounter Office.
 * =============================================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getPendingReferrals,
  getReferralById,
  bookReferralAppointment,
  createReferralEncounter,
  getReferralEncounters,
  cancelReferral,
  getReferralStats,
  type PendingReferral,
  type ReferralEncounter,
  type BookAppointmentDTO,
  type CreateReferralEncounterDTO,
  type ReferralFilters,
} from '../api/internal-referral.api';
import { useToast } from '../../../components/ui/Toast';

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
    backgroundScope = 'internal-referral:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// =============================================================================
// Query Keys
// =============================================================================

export const internalReferralKeys = {
  all: ['internal-referrals'] as const,
  pending: (filters?: ReferralFilters) =>
    [...internalReferralKeys.all, 'pending', filters] as const,
  detail: (id: string) => [...internalReferralKeys.all, 'detail', id] as const,
  encounters: (specialty?: string, clinicId?: string) =>
    [...internalReferralKeys.all, 'encounters', specialty, clinicId] as const,
  stats: () => [...internalReferralKeys.all, 'stats'] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch pending internal referrals for Encounter Office
 */
export function usePendingReferrals(filters?: ReferralFilters) {
  return useQuery({
    queryKey: internalReferralKeys.pending(filters),
    queryFn: () => getPendingReferrals(filters),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  });
}

/**
 * Hook to fetch a single referral by ID
 */
export function useReferralDetail(referralId: string | null) {
  return useQuery({
    queryKey: internalReferralKeys.detail(referralId || ''),
    queryFn: () => (referralId ? getReferralById(referralId) : null),
    enabled: !!referralId,
  });
}

/**
 * Hook to fetch referral encounters for a specialty clinic
 */
export function useReferralEncounters(
  specialtyModule?: string,
  clinicId?: string,
) {
  return useQuery({
    queryKey: internalReferralKeys.encounters(specialtyModule, clinicId),
    queryFn: () => getReferralEncounters(specialtyModule, clinicId),
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Hook to fetch referral statistics
 */
export function useReferralStats() {
  return useQuery({
    queryKey: internalReferralKeys.stats(),
    queryFn: getReferralStats,
    refetchInterval: 60000,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to book an appointment for a referral
 */
export function useBookReferralAppointment() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (dto: BookAppointmentDTO) => bookReferralAppointment(dto),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: internalReferralKeys.all });

      showToast({
        type: 'success',
        title: 'Appointment Booked',
        message: 'The referral appointment has been scheduled successfully.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Booking Failed',
        message: error.message || 'Failed to book the appointment.',
      });
    },
  });
}

/**
 * Hook to create a referral encounter
 */
export function useCreateReferralEncounter() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateReferralEncounterDTO) =>
      createReferralEncounter(dto),
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: internalReferralKeys.all });
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });

      showToast({
        type: 'success',
        title: 'Encounter Created',
        message: `Referral encounter ${result.encounterNumber} has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: error.message || 'Failed to create the referral encounter.',
      });
    },
  });
}

/**
 * Hook to cancel a referral
 */
export function useCancelReferral() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      referralId,
      reason,
      cancelledBy,
    }: {
      referralId: string;
      reason: string;
      cancelledBy?: string;
    }) => cancelReferral(referralId, reason, cancelledBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internalReferralKeys.all });

      showToast({
        type: 'success',
        title: 'Referral Cancelled',
        message: 'The referral has been cancelled.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: error.message || 'Failed to cancel the referral.',
      });
    },
  });
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Hook to get referral counts by status for badges/indicators
 */
export function useReferralCounts() {
  const { data: stats, isLoading } = useReferralStats();

  return {
    isLoading,
    pending: stats?.pending || 0,
    appointmentBooked: stats?.appointmentBooked || 0,
    encounterCreated: stats?.encounterCreated || 0,
    total: stats?.total || 0,
    urgentCount:
      (stats?.byUrgency.urgent || 0) + (stats?.byUrgency.emergency || 0),
  };
}
