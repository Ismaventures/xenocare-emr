// =============================================================================
// NHIS Module React Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import * as nhisApi from '../api';
import {
  notifyNHISRequest,
  notifyNHISAuthorizationNeeded,
  notifyNHISClaimUpdate,
} from '../../../lib/notifications/trigger.service';
import type {
  NhisProfileFilters,
  NhisAuthorizationFilters,
  NhisApprovalFilters,
  NhisClaimFilters,
  CreateNhisProfileDTO,
  UpdateNhisProfileDTO,
  CreateAuthorizationDTO,
  VerifyAuthorizationDTO,
  CreatePostingDTO,
  CreateApprovalRequestDTO,
  ApprovalDecisionDTO,
  VerifyEncounterRequest,
  EmergencyOverrideRequest,
  NhisTariffGroup,
  ReferralQueueFilters,
  CreateReferralQueueDTO,
  ProcessReferralQueueDTO,
  ProvisionalApprovalDTO,
  OfficialCodeEntryDTO,
  NhisServiceType,
} from '../types';

// =============================================================================
// Provisional Authorization Hooks
// =============================================================================

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
    backgroundScope = 'nhis:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// Query Keys
export const nhisQueryKeys = {
  all: ['nhis'] as const,
  profiles: () => [...nhisQueryKeys.all, 'profiles'] as const,
  profilesList: (filters: NhisProfileFilters) =>
    [...nhisQueryKeys.profiles(), 'list', filters] as const,
  profileByPatient: (patientId: string) =>
    [...nhisQueryKeys.profiles(), 'byPatient', patientId] as const,
  authorizations: () => [...nhisQueryKeys.all, 'authorizations'] as const,
  authorizationsList: (filters: NhisAuthorizationFilters) =>
    [...nhisQueryKeys.authorizations(), 'list', filters] as const,
  activeAuth: (patientId: string) =>
    [...nhisQueryKeys.authorizations(), 'active', patientId] as const,
  postings: () => [...nhisQueryKeys.all, 'postings'] as const,
  postingsList: (filters?: {
    status?: string;
    date?: string;
    clinic_id?: string;
  }) => [...nhisQueryKeys.postings(), 'list', filters] as const,
  approvals: () => [...nhisQueryKeys.all, 'approvals'] as const,
  approvalsList: (filters: NhisApprovalFilters) =>
    [...nhisQueryKeys.approvals(), 'list', filters] as const,
  pendingApprovals: () => [...nhisQueryKeys.approvals(), 'pending'] as const,
  claims: () => [...nhisQueryKeys.all, 'claims'] as const,
  claimsList: (filters: NhisClaimFilters) =>
    [...nhisQueryKeys.claims(), 'list', filters] as const,
  exportBatches: () => [...nhisQueryKeys.all, 'exportBatches'] as const,
  tariffRules: (group?: NhisTariffGroup) =>
    [...nhisQueryKeys.all, 'tariffRules', group] as const,
  policyConfigs: () => [...nhisQueryKeys.all, 'policyConfigs'] as const,
  hmos: () => [...nhisQueryKeys.all, 'hmos'] as const,
  dashboardStats: () => [...nhisQueryKeys.all, 'dashboardStats'] as const,
  encounterState: (encounterId: string) =>
    [...nhisQueryKeys.all, 'encounterState', encounterId] as const,
  auditLog: (filters?: { entity_type?: string; entity_id?: string }) =>
    [...nhisQueryKeys.all, 'auditLog', filters] as const,
  referralQueue: () => [...nhisQueryKeys.all, 'referralQueue'] as const,
  referralQueueList: (filters: ReferralQueueFilters) =>
    [...nhisQueryKeys.referralQueue(), 'list', filters] as const,
  referralQueueStats: () =>
    [...nhisQueryKeys.referralQueue(), 'stats'] as const,
  provisionalApprovals: () =>
    [...nhisQueryKeys.approvals(), 'provisional'] as const,
  preAuthServices: () => [...nhisQueryKeys.all, 'preAuthServices'] as const,
  catalogueSearch: (query: string) =>
    [...nhisQueryKeys.all, 'catalogueSearch', query] as const,
};

// =============================================================================
// NHIS Profiles Hooks
// =============================================================================

export function useNhisProfiles(filters: NhisProfileFilters = {}) {
  return useQuery({
    queryKey: nhisQueryKeys.profilesList(filters),
    queryFn: () => nhisApi.fetchNhisProfiles(filters),
  });
}

export function useNhisProfileByPatient(patientId: string, enabled = true) {
  return useQuery({
    queryKey: nhisQueryKeys.profileByPatient(patientId),
    queryFn: () => nhisApi.fetchNhisProfileByPatientId(patientId),
    enabled: !!patientId && enabled,
  });
}

export function useCreateNhisProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateNhisProfileDTO) => nhisApi.createNhisProfile(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.profiles() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      queryClient.setQueryData(
        nhisQueryKeys.profileByPatient(data.patient_id),
        data,
      );
    },
  });
}

export function useUpdateNhisProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      dto,
    }: {
      profileId: string;
      dto: UpdateNhisProfileDTO;
    }) => nhisApi.updateNhisProfile(profileId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.profiles() });
      queryClient.setQueryData(
        nhisQueryKeys.profileByPatient(data.patient_id),
        data,
      );
    },
  });
}

// =============================================================================
// NHIS Authorizations Hooks
// =============================================================================

export function useNhisAuthorizations(filters: NhisAuthorizationFilters = {}) {
  return useQuery({
    queryKey: nhisQueryKeys.authorizationsList(filters),
    queryFn: () => nhisApi.fetchNhisAuthorizations(filters),
  });
}

export function useActiveAuthorization(patientId: string, enabled = true) {
  return useQuery({
    queryKey: nhisQueryKeys.activeAuth(patientId),
    queryFn: () => nhisApi.fetchActiveAuthorization(patientId),
    enabled: !!patientId && enabled,
  });
}

export function useCreateAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAuthorizationDTO) =>
      nhisApi.createNhisAuthorization(dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.authorizations(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      if (data.patient_id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.activeAuth(data.patient_id),
        });
      }

      // Notify NHIS desk about new authorization request
      notifyNHISAuthorizationNeeded(
        (variables as any).patient_name || 'Patient',
        (variables as any).procedure_name || 'Authorization Request',
        data.id || '',
        undefined, // target all billing clerks
        (variables as any).created_by,
      ).catch(() => {});
    },
  });
}

export function useVerifyAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: VerifyAuthorizationDTO) =>
      nhisApi.verifyAuthorization(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.authorizations(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      if (data.patient_id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.activeAuth(data.patient_id),
        });
      }
    },
  });
}

export function useRevokeAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      authId,
      revokedBy,
      reason,
    }: {
      authId: string;
      revokedBy: string;
      reason: string;
    }) => nhisApi.revokeAuthorization(authId, revokedBy, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.authorizations(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      if (data.patient_id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.activeAuth(data.patient_id),
        });
      }
    },
  });
}

/**
 * Hook to fetch provisional authorizations awaiting official codes
 */
export function useProvisionalAuthorizationsAwaitingCode(limit = 50) {
  return useQuery({
    queryKey: [
      ...nhisQueryKeys.authorizations(),
      'provisional-awaiting-code',
      limit,
    ] as const,
    queryFn: () => nhisApi.fetchProvisionalAuthorizationsAwaitingCode(limit),
  });
}

/**
 * Hook to fetch authorizations expiring soon
 */
export function useAuthorizationsExpiringSoon(limit = 50) {
  return useQuery({
    queryKey: [
      ...nhisQueryKeys.authorizations(),
      'expiring-soon',
      limit,
    ] as const,
    queryFn: () => nhisApi.fetchAuthorizationsExpiringSoon(limit),
  });
}

/**
 * Hook to fetch authorization service summary
 */
export function useAuthorizationServiceSummary() {
  return useQuery({
    queryKey: [...nhisQueryKeys.authorizations(), 'service-summary'] as const,
    queryFn: () => nhisApi.fetchAuthorizationServiceSummary(),
  });
}

/**
 * Hook to check service authorization for a patient
 */
export function useCheckServiceAuthorization(
  patientId: string,
  serviceType: NhisServiceType,
  encounterId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...nhisQueryKeys.authorizations(),
      'check-service',
      patientId,
      serviceType,
      encounterId,
    ] as const,
    queryFn: () =>
      nhisApi.checkServiceAuthorization(patientId, serviceType, encounterId),
    enabled: !!patientId && !!serviceType && enabled,
  });
}

/**
 * Hook to create provisional authorization
 */
export function useCreateProvisionalAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dto,
      approvedBy,
    }: {
      dto: ProvisionalApprovalDTO;
      approvedBy: string;
    }) => nhisApi.createProvisionalAuthorization(dto, approvedBy),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.authorizations(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      if (data.patient_id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.activeAuth(data.patient_id),
        });
      }
    },
  });
}

/**
 * Hook to enter official NHIS code for a provisional authorization
 */
export function useEnterOfficialCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dto,
      enteredBy,
    }: {
      dto: OfficialCodeEntryDTO;
      enteredBy: string;
    }) => nhisApi.enterOfficialCode(dto, enteredBy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.authorizations(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

/**
 * Hook to fetch services covered by an authorization
 */
export function useAuthorizationServices(
  authorizationId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...nhisQueryKeys.authorizations(),
      'services',
      authorizationId,
    ] as const,
    queryFn: () => nhisApi.fetchAuthorizationServices(authorizationId),
    enabled: !!authorizationId && enabled,
  });
}

/**
 * Hook to add a service to an authorization
 */
export function useAddServiceToAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      authorizationId,
      serviceType,
      serviceId,
      serviceTable,
      approvedBy,
      notes,
    }: {
      authorizationId: string;
      serviceType: string;
      serviceId: string | null;
      serviceTable: string | null;
      approvedBy: string;
      notes?: string;
    }) =>
      nhisApi.addServiceToAuthorization(
        authorizationId,
        serviceType,
        serviceId,
        serviceTable,
        approvedBy,
        notes,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          ...nhisQueryKeys.authorizations(),
          'services',
          variables.authorizationId,
        ],
      });
    },
  });
}

// =============================================================================
// Specialty Referral NHIS Integration Hooks
// =============================================================================

/**
 * Hook to check if a patient is NHIS
 */
export function useIsNhisPatient(patientId: string, enabled = true) {
  return useQuery({
    queryKey: [...nhisQueryKeys.profiles(), 'isNhis', patientId] as const,
    queryFn: () => nhisApi.isNhisPatient(patientId),
    enabled: !!patientId && enabled,
  });
}

/**
 * Hook to create NHIS approval for specialty referral
 */
export function useCreateSpecialtyReferralApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      referralRequestId,
      patientId,
      specialty,
      reason,
      requestedBy,
      estimatedCost,
    }: {
      referralRequestId: string;
      patientId: string;
      specialty: string;
      reason: string;
      requestedBy: string;
      estimatedCost?: number;
    }) =>
      nhisApi.createSpecialtyReferralApproval(
        referralRequestId,
        patientId,
        specialty,
        reason,
        requestedBy,
        estimatedCost,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.approvals() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

/**
 * Hook to get NHIS approval status for a specialty referral
 */
export function useSpecialtyReferralApprovalStatus(
  referralRequestId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...nhisQueryKeys.approvals(),
      'referral',
      referralRequestId,
    ] as const,
    queryFn: () =>
      nhisApi.getSpecialtyReferralApprovalStatus(referralRequestId),
    enabled: !!referralRequestId && enabled,
  });
}

// =============================================================================
// Encounter Verification Hooks
// =============================================================================

export function useEncounterNhisState(encounterId: string, enabled = true) {
  return useQuery({
    queryKey: nhisQueryKeys.encounterState(encounterId),
    queryFn: () => nhisApi.getEncounterNhisState(encounterId),
    enabled: !!encounterId && enabled,
  });
}

export function useVerifyEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: VerifyEncounterRequest) =>
      nhisApi.verifyNhisEncounter(request),
    onSuccess: (data, variables) => {
      if (data.success && data.encounter_id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.encounterState(data.encounter_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });

      // Notify about encounter verification
      if (data.success) {
        notifyNHISRequest(
          (variables as any).patient_name || 'Patient',
          'Encounter Verification',
          `NHIS encounter verified successfully`,
          data.encounter_id || '',
          undefined,
          (variables as any).verified_by,
        ).catch(() => {});
      }
    },
  });
}

export function useEmergencyOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: EmergencyOverrideRequest) =>
      nhisApi.emergencyOverride(request),
    onSuccess: (data) => {
      if (data.success && data.encounter_id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.encounterState(data.encounter_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

export function useSetEncounterPayerType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      encounterId,
      payerType,
    }: {
      encounterId: string;
      payerType: 'private' | 'nhis' | 'retainership' | 'military_free';
    }) => nhisApi.setEncounterPayerType(encounterId, payerType),
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: nhisQueryKeys.encounterState(data.id),
        });
      }
    },
  });
}

// =============================================================================
// NHIS Postings Hooks
// =============================================================================

export function useNhisPostings(filters?: {
  status?: string;
  date?: string;
  clinic_id?: string;
}) {
  return useQuery({
    queryKey: nhisQueryKeys.postingsList(filters),
    queryFn: () => nhisApi.fetchNhisPostings(filters),
  });
}

export function useCreatePosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePostingDTO) => nhisApi.createNhisPosting(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.postings() });
    },
  });
}

export function useUpdatePostingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postingId,
      status,
      staffId,
    }: {
      postingId: string;
      status: string;
      staffId?: string;
    }) => nhisApi.updatePostingStatus(postingId, status, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.postings() });
    },
  });
}

// =============================================================================
// NHIS Approvals Hooks
// =============================================================================

export function useNhisApprovals(filters: NhisApprovalFilters = {}) {
  return useQuery({
    queryKey: nhisQueryKeys.approvalsList(filters),
    queryFn: () => nhisApi.fetchNhisApprovals(filters),
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: nhisQueryKeys.pendingApprovals(),
    queryFn: () => nhisApi.fetchPendingApprovals(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch provisional approvals (approved provisionally, awaiting official NHIS codes)
 */
export function useProvisionalApprovals(limit = 50) {
  return useQuery({
    queryKey: nhisQueryKeys.provisionalApprovals(),
    queryFn: () => nhisApi.fetchProvisionalApprovals(limit),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateApprovalRequestDTO) =>
      nhisApi.createApprovalRequest(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.approvals() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

export function useProcessApprovalDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ApprovalDecisionDTO) =>
      nhisApi.processApprovalDecision(dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: nhisQueryKeys.approvals() });

      const previousApprovalLists = queryClient.getQueriesData({
        queryKey: nhisQueryKeys.approvals(),
      });

      queryClient.setQueriesData(
        { queryKey: nhisQueryKeys.approvals() },
        (current: unknown) => {
          if (!current || typeof current !== 'object') {
            return current;
          }

          const listResult = current as { data?: Array<any> } & Record<
            string,
            any
          >;
          if (!Array.isArray(listResult.data)) {
            return current;
          }

          const nextData = listResult.data.flatMap((item) => {
            if (item?.id !== dto.approval_id) {
              return [item];
            }

            const nextItem = {
              ...item,
              status: dto.decision,
              decision_notes: dto.decision_notes,
              rejection_reason: dto.rejection_reason,
              authorization_code: dto.authorization_code,
            };

            if (dto.decision === 'approved' || dto.decision === 'rejected') {
              return [];
            }

            return [nextItem];
          });

          return {
            ...listResult,
            data: nextData,
          };
        },
      );

      return { previousApprovalLists };
    },
    onError: (_error, _dto, context) => {
      for (const [queryKey, previous] of context?.previousApprovalLists || []) {
        queryClient.setQueryData(queryKey, previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.approvals() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      // Invalidate department queues so approved requests appear in their respective queues
      queryClient.invalidateQueries({ queryKey: ['lab'] });
      queryClient.invalidateQueries({ queryKey: ['radiology'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['physiotherapy'] });
    },
  });
}

// =============================================================================
// Service Release Hooks
// =============================================================================

export function useReleaseServiceToBilling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceType,
      serviceId,
      releasedBy,
    }: {
      serviceType: string;
      serviceId: string;
      releasedBy: string;
    }) => nhisApi.releaseServiceToBilling(serviceType, serviceId, releasedBy),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['lab'] });
      queryClient.invalidateQueries({ queryKey: ['radiology'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useCanExecuteService() {
  return useMutation({
    mutationFn: (request: {
      encounter_id: string;
      service_type: string;
      service_id: string;
    }) => nhisApi.canExecuteService(request),
  });
}

// =============================================================================
// NHIS Claims Hooks
// =============================================================================

export function useNhisClaims(filters: NhisClaimFilters = {}) {
  return useQuery({
    queryKey: nhisQueryKeys.claimsList(filters),
    queryFn: () => nhisApi.fetchNhisClaims(filters),
  });
}

export function useGenerateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      encounterId,
      createdBy,
    }: {
      encounterId: string;
      createdBy: string;
    }) => nhisApi.generateClaim(encounterId, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.claims() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

export function useUpdateClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      claimId,
      status,
      staffId,
      notes,
    }: {
      claimId: string;
      status: string;
      staffId: string;
      notes?: string;
    }) => nhisApi.updateClaimStatus(claimId, status, staffId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.claims() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

// =============================================================================
// Export Batches Hooks
// =============================================================================

export function useExportBatches(filters?: {
  status?: string;
  provider?: string;
}) {
  return useQuery({
    queryKey: nhisQueryKeys.exportBatches(),
    queryFn: () => nhisApi.fetchExportBatches(filters),
  });
}

export function useCreateExportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      periodStart,
      periodEnd,
      providerName,
      createdBy,
    }: {
      periodStart: string;
      periodEnd: string;
      providerName: string | null;
      createdBy: string;
    }) =>
      nhisApi.createExportBatch(
        periodStart,
        periodEnd,
        providerName,
        createdBy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.exportBatches(),
      });
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.claims() });
    },
  });
}

// =============================================================================
// Tariff & Policy Hooks
// =============================================================================

export function useTariffRules(tariffGroup?: NhisTariffGroup) {
  return useQuery({
    queryKey: nhisQueryKeys.tariffRules(tariffGroup),
    queryFn: () => nhisApi.fetchTariffRules(tariffGroup),
  });
}

export function usePolicyConfigs() {
  return useQuery({
    queryKey: nhisQueryKeys.policyConfigs(),
    queryFn: () => nhisApi.fetchPolicyConfigs(),
  });
}

export function useNhisHmos() {
  return useQuery({
    queryKey: nhisQueryKeys.hmos(),
    queryFn: () => nhisApi.fetchNhisHmos(),
  });
}

// =============================================================================
// NHIS Pending Claims Aggregation Hook
// =============================================================================

export function useNhisPendingClaimsSummary() {
  return useQuery({
    queryKey: [...nhisQueryKeys.all, 'pendingClaimsSummary'] as const,
    queryFn: () => nhisApi.fetchNhisPendingClaimsSummary(),
    refetchInterval: 60000, // Refetch every minute
  });
}

// =============================================================================
// Provisional Approvals Hooks
// =============================================================================

export function useAllProvisionalApprovals() {
  return useQuery({
    queryKey: [...nhisQueryKeys.all, 'allProvisionalApprovals'] as const,
    queryFn: () => nhisApi.fetchAllProvisionalApprovals(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useVerifyProvisionalApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      serviceType,
      authorizationCode,
      verifiedBy,
    }: {
      itemId: string;
      serviceType: 'lab' | 'radiology' | 'pharmacy' | 'procedure' | 'specialty';
      authorizationCode: string;
      verifiedBy: string;
    }) =>
      nhisApi.verifyProvisionalApproval(
        itemId,
        serviceType,
        authorizationCode,
        verifiedBy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...nhisQueryKeys.all, 'allProvisionalApprovals'],
      });
      queryClient.invalidateQueries({
        queryKey: [...nhisQueryKeys.all, 'pendingClaimsSummary'],
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
      queryClient.invalidateQueries({
        queryKey: [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'],
      });
    },
  });
}

// =============================================================================
// Dashboard Stats Hook
// =============================================================================

export function useNhisDashboardStats() {
  return useQuery({
    queryKey: nhisQueryKeys.dashboardStats(),
    queryFn: () => nhisApi.fetchNhisDashboardStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

// =============================================================================
// Audit Log Hook
// =============================================================================

export function useNhisAuditLog(filters?: {
  entity_type?: string;
  entity_id?: string;
  patient_id?: string;
  action_type?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: nhisQueryKeys.auditLog(filters),
    queryFn: () => nhisApi.fetchNhisAuditLog(filters),
  });
}

// =============================================================================
// Referral Queue Hooks
// =============================================================================

export function useReferralQueue(filters: ReferralQueueFilters = {}) {
  return useQuery({
    queryKey: nhisQueryKeys.referralQueueList(filters),
    queryFn: () => nhisApi.fetchReferralQueue(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useReferralQueueStats() {
  return useQuery({
    queryKey: nhisQueryKeys.referralQueueStats(),
    queryFn: () => nhisApi.getReferralQueueStats(),
    refetchInterval: 30000,
  });
}

export function useCreateReferralQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateReferralQueueDTO) =>
      nhisApi.createReferralQueueItem(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.referralQueue(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

export function useProcessReferralQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: ProcessReferralQueueDTO) =>
      nhisApi.processReferralQueueItem(dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({
        queryKey: nhisQueryKeys.referralQueue(),
      });
      await queryClient.cancelQueries({
        queryKey: nhisQueryKeys.referralQueueStats(),
      });

      const previousQueueLists = queryClient.getQueriesData({
        queryKey: nhisQueryKeys.referralQueue(),
      });
      const previousQueueStats = queryClient.getQueryData(
        nhisQueryKeys.referralQueueStats(),
      );

      const processedItem = previousQueueLists
        .flatMap(([, value]) => {
          const list = (value as { data?: Array<any> } | undefined)?.data;
          return Array.isArray(list) ? list : [];
        })
        .find((item) => item?.id === dto.queue_id);

      queryClient.setQueriesData(
        { queryKey: nhisQueryKeys.referralQueue() },
        (current: unknown) => {
          if (!current || typeof current !== 'object') {
            return current;
          }

          const listResult = current as { data?: Array<any> } & Record<
            string,
            any
          >;
          if (!Array.isArray(listResult.data)) {
            return current;
          }

          return {
            ...listResult,
            data: listResult.data.filter((item) => item?.id !== dto.queue_id),
          };
        },
      );

      queryClient.setQueryData(
        nhisQueryKeys.referralQueueStats(),
        (current: unknown) => {
          if (!current || typeof current !== 'object') {
            return current;
          }

          const stats = { ...(current as Record<string, any>) };
          if (
            processedItem?.status === 'pending' &&
            typeof stats.pending === 'number'
          ) {
            stats.pending = Math.max(0, stats.pending - 1);
          }
          if (
            processedItem?.status === 'pending' &&
            processedItem?.request_type === 'internal_nhis_approval' &&
            typeof stats.internal_pending === 'number'
          ) {
            stats.internal_pending = Math.max(0, stats.internal_pending - 1);
          }
          if (
            processedItem?.status === 'pending' &&
            processedItem?.is_expired &&
            typeof stats.expired === 'number'
          ) {
            stats.expired = Math.max(0, stats.expired - 1);
          }

          return stats;
        },
      );

      return { previousQueueLists, previousQueueStats };
    },
    onError: (_error, _dto, context) => {
      for (const [queryKey, previous] of context?.previousQueueLists || []) {
        queryClient.setQueryData(queryKey, previous);
      }
      queryClient.setQueryData(
        nhisQueryKeys.referralQueueStats(),
        context?.previousQueueStats,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.referralQueue(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.authorizations(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

// =============================================================================
// Specialty Referral NHIS Approval Hooks
// =============================================================================

/**
 * Hook to fetch specialty referrals pending NHIS approval
 * These are internal referrals from clinical_requests table
 */
export function usePendingSpecialtyReferrals() {
  return useQuery({
    queryKey: [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'] as const,
    queryFn: () => nhisApi.fetchPendingSpecialtyReferrals(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch booked NHIS referrals (view-only for NHIS desk)
 * Shows NHIS patients with booked appointments but no encounter created yet.
 */
export function useBookedNhisReferrals() {
  return useQuery({
    queryKey: [...nhisQueryKeys.all, 'bookedNhisReferrals'] as const,
    queryFn: () => nhisApi.fetchBookedNhisReferrals(),
    refetchInterval: 30000,
  });
}

/**
 * Hook to approve a specialty referral
 */
export function useApproveSpecialtyReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      referralId,
      approvedBy,
      isProvisional,
      notes,
      authorizationCode,
    }: {
      referralId: string;
      approvedBy: string;
      isProvisional: boolean;
      notes?: string;
      authorizationCode?: string;
    }) =>
      nhisApi.approveSpecialtyReferral(
        referralId,
        approvedBy,
        isProvisional,
        notes,
        authorizationCode,
      ),
    onMutate: async ({ referralId }) => {
      await queryClient.cancelQueries({
        queryKey: [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'],
      });

      const previousPendingReferrals = queryClient.getQueryData([
        ...nhisQueryKeys.all,
        'pendingSpecialtyReferrals',
      ] as const);

      queryClient.setQueryData(
        [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'] as const,
        (current: unknown) => {
          if (!Array.isArray(current)) {
            return current;
          }

          return current.filter(
            (item) => (item as { id?: string }).id !== referralId,
          );
        },
      );

      return { previousPendingReferrals };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'] as const,
        context?.previousPendingReferrals,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'],
      });
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.approvals() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

/**
 * Hook to reject a specialty referral
 */
export function useRejectSpecialtyReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      referralId,
      rejectedBy,
      reason,
    }: {
      referralId: string;
      rejectedBy: string;
      reason: string;
    }) => nhisApi.rejectSpecialtyReferral(referralId, rejectedBy, reason),
    onMutate: async ({ referralId }) => {
      await queryClient.cancelQueries({
        queryKey: [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'],
      });

      const previousPendingReferrals = queryClient.getQueryData([
        ...nhisQueryKeys.all,
        'pendingSpecialtyReferrals',
      ] as const);

      queryClient.setQueryData(
        [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'] as const,
        (current: unknown) => {
          if (!Array.isArray(current)) {
            return current;
          }

          return current.filter(
            (item) => (item as { id?: string }).id !== referralId,
          );
        },
      );

      return { previousPendingReferrals };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(
        [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'] as const,
        context?.previousPendingReferrals,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...nhisQueryKeys.all, 'pendingSpecialtyReferrals'],
      });
      queryClient.invalidateQueries({ queryKey: nhisQueryKeys.approvals() });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.dashboardStats(),
      });
    },
  });
}

// =============================================================================
// Comprehensive NHIS Claims Report Hook
// =============================================================================

/**
 * Hook to fetch comprehensive NHIS claims data for reporting table
 */
export function useNhisComprehensiveClaims(
  filters: {
    startDate?: string;
    endDate?: string;
    insuranceType?: string;
    category?: string;
    hasAuthCode?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: [...nhisQueryKeys.all, 'comprehensiveClaims', filters] as const,
    queryFn: () => nhisApi.fetchNhisComprehensiveClaims(filters),
    refetchInterval: 60000, // Refetch every minute
  });
}

// =============================================================================
// Pre-Authorization Configuration Hooks
// =============================================================================

/**
 * Hook to fetch all services marked as requiring NHIS pre-authorization
 */
export function usePreAuthRequiredServices() {
  return useQuery({
    queryKey: nhisQueryKeys.preAuthServices(),
    queryFn: () => nhisApi.getPreAuthRequiredServices(),
  });
}

/**
 * Hook to search across all catalogue tables
 */
export function useSearchCatalogueServices(query: string) {
  return useQuery({
    queryKey: nhisQueryKeys.catalogueSearch(query),
    queryFn: () => nhisApi.searchAllCatalogueServices(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

/**
 * Hook to toggle pre-auth requirement for selected services
 */
export function useTogglePreAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      items,
      value,
    }: {
      items: {
        id: string;
        service_type: nhisApi.CatalogueServiceItem['service_type'];
      }[];
      value: boolean;
    }) => nhisApi.togglePreAuthRequirement(items, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.preAuthServices(),
      });
      queryClient.invalidateQueries({
        queryKey: nhisQueryKeys.all.filter((k) => k === 'catalogueSearch'),
      });
    },
  });
}
