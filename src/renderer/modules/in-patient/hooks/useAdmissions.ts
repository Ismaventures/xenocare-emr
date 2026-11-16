// =============================================================================
// NDC MEDICAL CENTRE EMR - useAdmissions Hook
// React Query hook for admission management
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { useAuth } from '../../../contexts/AuthContext';
import { useFacilityId } from '../../../hooks/useFacilityId';
import * as admissionsApi from '../api/admissions.api';
import type {
  AdmissionStatus,
  CreateAdmissionDTO,
  UpdateAdmissionDTO,
  DischargeAdmissionDTO,
} from '../../../types/database.types';
import { wardKeys } from './useWards';
import { bedKeys } from './useBeds';
import { billingKeys } from '../../billing/hooks/useBilling';

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
    backgroundScope = 'inpatient:admissions:write',
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
export const admissionKeys = {
  all: ['admissions'] as const,
  lists: () => [...admissionKeys.all, 'list'] as const,
  active: (facilityId: string) =>
    [...admissionKeys.lists(), 'active', facilityId] as const,
  pending: () => [...admissionKeys.all, 'pending-requests'] as const,
  history: (facilityId: string, status?: string) =>
    [...admissionKeys.lists(), 'history', facilityId, status] as const,
  byPatient: (patientId: string) =>
    [...admissionKeys.lists(), 'patient', patientId] as const,
  byWard: (wardId: string) =>
    [...admissionKeys.lists(), 'ward', wardId] as const,
  byStatus: (facilityId: string, status: AdmissionStatus) =>
    [...admissionKeys.lists(), facilityId, status] as const,
  discharged: (facilityId: string) =>
    [...admissionKeys.lists(), 'discharged', facilityId] as const,
  pendingDischarge: (facilityId: string) =>
    [...admissionKeys.lists(), 'pending-discharge', facilityId] as const,
  detail: (id: string) => [...admissionKeys.all, 'detail', id] as const,
  byNumber: (number: string) =>
    [...admissionKeys.all, 'number', number] as const,
  stats: (facilityId: string) =>
    [...admissionKeys.all, 'stats', facilityId] as const,
  search: (facilityId: string, term: string) =>
    [...admissionKeys.lists(), 'search', facilityId, term] as const,
};

/**
 * Hook to fetch pending admission requests
 * These are admission requests from doctors waiting for bed assignment
 */
export function usePendingAdmissionRequests() {
  return useQuery({
    queryKey: admissionKeys.pending(),
    queryFn: () => admissionsApi.getPendingAdmissionRequests(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to confirm a single admission request
 * Uses optimistic updates for instant UI feedback
 */
export function useConfirmAdmissionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: admissionsApi.ConfirmAdmissionDTO) =>
      admissionsApi.confirmAdmissionRequest(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: admissionKeys.pending() });
      await queryClient.cancelQueries({ queryKey: admissionKeys.all });

      const previousPending = queryClient.getQueryData(admissionKeys.pending());

      // Optimistically remove from pending list
      queryClient.setQueryData(
        admissionKeys.pending(),
        (old: admissionsApi.PendingAdmissionRequest[] | undefined) =>
          old?.filter((r) => r.id !== dto.request_id) || [],
      );

      return { previousPending };
    },
    onError: (_err, _dto, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(
          admissionKeys.pending(),
          context.previousPending,
        );
      }
    },
    onSuccess: async () => {
      // Immediately refetch active admissions and billing for instant UI update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: admissionKeys.all }),
        queryClient.refetchQueries({ queryKey: billingKeys.all }),
        queryClient.refetchQueries({ queryKey: bedKeys.all }),
        queryClient.refetchQueries({ queryKey: wardKeys.all }),
      ]);
    },
    onSettled: () => {
      // Ensure all queries are fresh
      queryClient.invalidateQueries({ queryKey: admissionKeys.pending() });
    },
  });
}

/**
 * Hook to batch confirm admission requests
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchConfirmAdmissionRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: admissionsApi.BatchConfirmAdmissionsDTO) =>
      admissionsApi.batchConfirmAdmissionRequests(dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: admissionKeys.pending() });
      await queryClient.cancelQueries({ queryKey: admissionKeys.all });

      const previousPending = queryClient.getQueryData(admissionKeys.pending());

      queryClient.setQueryData(
        admissionKeys.pending(),
        (old: admissionsApi.PendingAdmissionRequest[] | undefined) =>
          old?.filter((r) => !dto.request_ids.includes(r.id)) || [],
      );

      return { previousPending };
    },
    onError: (_err, _dto, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(
          admissionKeys.pending(),
          context.previousPending,
        );
      }
    },
    onSuccess: async () => {
      // Immediately refetch for instant UI update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: admissionKeys.all }),
        queryClient.refetchQueries({ queryKey: billingKeys.all }),
        queryClient.refetchQueries({ queryKey: bedKeys.all }),
        queryClient.refetchQueries({ queryKey: wardKeys.all }),
      ]);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: admissionKeys.pending() });
    },
  });
}

/**
 * Hook to fetch active admissions
 */
export function useActiveAdmissions() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.active(facilityId || ''),
    queryFn: () => admissionsApi.getActiveAdmissions(facilityId!),
    enabled: !!facilityId,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to fetch admission history (all admissions with optional filters)
 */
export function useAdmissionHistory(options?: {
  status?: AdmissionStatus | 'all';
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.history(facilityId || '', options?.status),
    queryFn: () => admissionsApi.getAdmissionHistory(facilityId!, options),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch patient admissions
 */
export function usePatientAdmissions(patientId: string) {
  return useQuery({
    queryKey: admissionKeys.byPatient(patientId),
    queryFn: () => admissionsApi.getPatientAdmissions(patientId),
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch a single admission
 */
export function useAdmission(admissionId: string) {
  return useQuery({
    queryKey: admissionKeys.detail(admissionId),
    queryFn: () => admissionsApi.getAdmissionById(admissionId),
    enabled: !!admissionId,
  });
}

/**
 * Hook to fetch admission by number
 */
export function useAdmissionByNumber(admissionNumber: string) {
  return useQuery({
    queryKey: admissionKeys.byNumber(admissionNumber),
    queryFn: () => admissionsApi.getAdmissionByNumber(admissionNumber),
    enabled: !!admissionNumber,
  });
}

/**
 * Hook to fetch admissions by ward
 */
export function useAdmissionsByWard(wardId: string) {
  return useQuery({
    queryKey: admissionKeys.byWard(wardId),
    queryFn: () => admissionsApi.getAdmissionsByWard(wardId),
    enabled: !!wardId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch admissions by status
 */
export function useAdmissionsByStatus(status: AdmissionStatus) {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.byStatus(facilityId || '', status),
    queryFn: () => admissionsApi.getAdmissionsByStatus(facilityId!, status),
    enabled: !!facilityId,
  });
}

/**
 * Hook to fetch pending discharges
 */
export function usePendingDischarges() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.pendingDischarge(facilityId || ''),
    queryFn: () => admissionsApi.getPendingDischarges(facilityId!),
    enabled: !!facilityId,
  });
}

/**
 * Hook to search admissions
 */
export function useSearchAdmissions(searchTerm: string) {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.search(facilityId || '', searchTerm),
    queryFn: () => admissionsApi.searchAdmissions(facilityId!, searchTerm),
    enabled: !!facilityId && searchTerm.length >= 2,
  });
}

/**
 * Hook to check if patient has active admission
 */
export function useHasActiveAdmission(patientId: string) {
  return useQuery({
    queryKey: [...admissionKeys.byPatient(patientId), 'active-check'],
    queryFn: () => admissionsApi.hasActiveAdmission(patientId),
    enabled: !!patientId,
  });
}

/**
 * Hook to fetch admission statistics
 */
export function useAdmissionStatistics() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.stats(facilityId || ''),
    queryFn: () => admissionsApi.getAdmissionStatistics(facilityId!),
    enabled: !!facilityId,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to create an admission
 */
export function useCreateAdmission() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { facilityId } = useFacilityId();
  const userId = staff?.id;

  return useMutation({
    mutationFn: (data: CreateAdmissionDTO) =>
      admissionsApi.createAdmission(facilityId!, data, userId!),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: admissionKeys.active(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.byPatient(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.byWard(data.current_ward_id || ''),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.stats(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to update an admission
 */
export function useUpdateAdmission() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { facilityId } = useFacilityId();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      admissionId,
      updates,
    }: {
      admissionId: string;
      updates: UpdateAdmissionDTO;
    }) => admissionsApi.updateAdmission(admissionId, updates, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.active(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.byPatient(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.byWard(data.current_ward_id || ''),
      });
    },
  });
}

/**
 * Hook to update admission status
 */
export function useUpdateAdmissionStatus() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { facilityId } = useFacilityId();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      admissionId,
      status,
    }: {
      admissionId: string;
      status: AdmissionStatus;
    }) => admissionsApi.updateAdmissionStatus(admissionId, status, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.active(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.stats(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to discharge a patient
 */
export function useDischargePatient() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const { facilityId } = useFacilityId();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      admissionId,
      dischargeData,
    }: {
      admissionId: string;
      dischargeData: DischargeAdmissionDTO;
    }) => admissionsApi.dischargePatient(admissionId, dischargeData, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.active(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.byPatient(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.pendingDischarge(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: admissionKeys.stats(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: wardKeys.census(facilityId || ''),
      });
      queryClient.invalidateQueries({
        queryKey: bedKeys.availability(facilityId || ''),
      });
    },
  });
}

/**
 * Hook to assign care team member
 */
export function useAssignCareTeamMember() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      admissionId,
      memberId,
      role,
    }: {
      admissionId: string;
      memberId: string;
      role: string;
    }) =>
      admissionsApi.assignCareTeamMember(admissionId, memberId, role, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to add admission alert
 */
export function useAddAdmissionAlert() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();
  const userId = staff?.id;

  return useMutation({
    mutationFn: ({
      admissionId,
      alertType,
      message,
    }: {
      admissionId: string;
      alertType: string;
      message: string;
    }) =>
      admissionsApi.addAdmissionAlert(admissionId, alertType, message, userId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: admissionKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook to fetch discharged admissions
 */
export function useDischargedAdmissions() {
  const { facilityId } = useFacilityId();

  return useQuery({
    queryKey: admissionKeys.discharged(facilityId || ''),
    queryFn: () => admissionsApi.getDischargedAdmissions(facilityId!),
    enabled: !!facilityId,
  });
}
