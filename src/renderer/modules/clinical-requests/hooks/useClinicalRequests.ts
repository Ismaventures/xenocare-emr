/**
 * Clinical Requests Hooks
 * =======================
 * React Query hooks for Clinical Requests module
 */

import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getClinicalRequests,
  getPendingRequests,
  getAdmissionRequests,
  getProcedureRequests,
  getClinicalRequestById,
  getClinicalRequestByNumber,
  getPatientRequests,
  getEncounterRequests,
  createClinicalRequest,
  createAdmissionRequest,
  createProcedureRequest,
  createBulkClinicalRequests,
  updateClinicalRequest,
  updateRequestStatus,
  approveRequest,
  rejectRequest,
  scheduleRequest,
  startRequest,
  completeRequest,
  cancelRequest,
  getRequestStatusHistory,
  getClinicalRequestStats,
  getRequestSummary,
  getTodaysPendingCount,
  batchApproveProcedureRequests,
  batchRejectProcedureRequests,
  BatchApproveProcedureRequestsDTO,
  BatchRejectProcedureRequestsDTO,
  executeAdmission,
  scheduleProcedure,
  executeDischarge,
  ExecuteAdmissionData,
  ScheduleProcedureData,
  ExecuteDischargeData,
} from '../api/clinical-requests.api';
import {
  ClinicalRequestDTO,
  ClinicalRequestWithDetailsDTO,
  CreateClinicalRequestDTO,
  CreateAdmissionRequestDTO,
  CreateProcedureRequestDTO,
  UpdateClinicalRequestDTO,
  UpdateStatusDTO,
  ApproveRequestDTO,
  RejectRequestDTO,
  ScheduleRequestDTO,
  CompleteRequestDTO,
  ClinicalRequestFiltersDTO,
  ClinicalRequestStatusHistoryDTO,
  ClinicalRequestStatsDTO,
  ClinicalRequestType,
  ClinicalRequestStatus,
} from '../dtos/clinical-request.dto';

// ==========================================
// EXECUTION MUTATIONS
// ==========================================

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
    backgroundScope = 'clinical-requests:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// ==========================================
// QUERY KEYS
// ==========================================

export const clinicalRequestKeys = {
  all: ['clinical-requests'] as const,
  lists: () => [...clinicalRequestKeys.all, 'list'] as const,
  list: (filters?: ClinicalRequestFiltersDTO) =>
    [...clinicalRequestKeys.lists(), filters] as const,
  pending: (type?: ClinicalRequestType | ClinicalRequestType[]) =>
    [...clinicalRequestKeys.all, 'pending', type] as const,
  admissions: (status?: ClinicalRequestStatus | ClinicalRequestStatus[]) =>
    [...clinicalRequestKeys.all, 'admissions', status] as const,
  procedures: (status?: ClinicalRequestStatus | ClinicalRequestStatus[]) =>
    [...clinicalRequestKeys.all, 'procedures', status] as const,
  details: () => [...clinicalRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...clinicalRequestKeys.details(), id] as const,
  byNumber: (number: string) =>
    [...clinicalRequestKeys.all, 'number', number] as const,
  patient: (patientId: string, filters?: ClinicalRequestFiltersDTO) =>
    [...clinicalRequestKeys.all, 'patient', patientId, filters] as const,
  encounter: (encounterId: string) =>
    [...clinicalRequestKeys.all, 'encounter', encounterId] as const,
  history: (requestId: string) =>
    [...clinicalRequestKeys.all, 'history', requestId] as const,
  stats: () => [...clinicalRequestKeys.all, 'stats'] as const,
  summary: () => [...clinicalRequestKeys.all, 'summary'] as const,
  todayPending: () => [...clinicalRequestKeys.all, 'today-pending'] as const,
  specialty: (module: string) =>
    [...clinicalRequestKeys.all, 'specialty', module] as const,
};

// ==========================================
// LIST QUERIES
// ==========================================

/**
 * Hook to fetch clinical requests with filters
 */
export function useClinicalRequests(
  filters?: ClinicalRequestFiltersDTO,
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.list(filters),
    queryFn: () => getClinicalRequests(filters),
    staleTime: 15000, // Cache for 15 seconds
    ...options,
  });
}

/**
 * Hook to fetch pending requests
 */
export function usePendingRequests(
  requestType?: ClinicalRequestType | ClinicalRequestType[],
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.pending(requestType),
    queryFn: () => getPendingRequests(requestType),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch admission requests
 */
export function useAdmissionRequests(
  status?: ClinicalRequestStatus | ClinicalRequestStatus[],
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.admissions(status),
    queryFn: () => getAdmissionRequests(status),
    ...options,
  });
}

/**
 * Hook to fetch procedure/surgery requests
 */
export function useProcedureRequests(
  status?: ClinicalRequestStatus | ClinicalRequestStatus[],
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.procedures(status),
    queryFn: () => getProcedureRequests(status),
    ...options,
  });
}

/**
 * Hook to fetch specialty referrals (Dental, Ophthalmology, Physiotherapy)
 */
export function useSpecialtyReferrals(
  specialtyModule: string,
  status?: ClinicalRequestStatus | ClinicalRequestStatus[],
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.specialty(specialtyModule),
    queryFn: () =>
      getClinicalRequests({
        request_type: 'Referral',
        specialty_module: specialtyModule,
        status,
      }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    ...options,
  });
}

// ==========================================
// SINGLE RECORD QUERIES
// ==========================================

/**
 * Hook to fetch a single clinical request by ID
 */
export function useClinicalRequest(
  id: string,
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.detail(id),
    queryFn: () => getClinicalRequestById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to fetch a clinical request by request number
 */
export function useClinicalRequestByNumber(
  requestNumber: string,
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.byNumber(requestNumber),
    queryFn: () => getClinicalRequestByNumber(requestNumber),
    enabled: !!requestNumber,
    ...options,
  });
}

/**
 * Hook to fetch requests for a specific patient
 */
export function usePatientRequests(
  patientId: string,
  filters?: ClinicalRequestFiltersDTO,
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.patient(patientId, filters),
    queryFn: () => getPatientRequests(patientId, filters),
    enabled: !!patientId,
    ...options,
  });
}

/**
 * Hook to fetch requests for a specific encounter
 */
export function useEncounterRequests(
  encounterId: string,
  options?: Omit<
    UseQueryOptions<ClinicalRequestWithDetailsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.encounter(encounterId),
    queryFn: () => getEncounterRequests(encounterId),
    enabled: !!encounterId,
    ...options,
  });
}

// ==========================================
// STATUS HISTORY QUERY
// ==========================================

/**
 * Hook to fetch status history for a request
 */
export function useRequestStatusHistory(
  requestId: string,
  options?: Omit<
    UseQueryOptions<ClinicalRequestStatusHistoryDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.history(requestId),
    queryFn: () => getRequestStatusHistory(requestId),
    enabled: !!requestId,
    ...options,
  });
}

// ==========================================
// STATISTICS QUERIES
// ==========================================

/**
 * Hook to fetch clinical request statistics
 */
export function useClinicalRequestStats(
  options?: Omit<
    UseQueryOptions<ClinicalRequestStatsDTO[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.stats(),
    queryFn: getClinicalRequestStats,
    ...options,
  });
}

/**
 * Hook to fetch request summary counts
 */
export function useRequestSummary(
  options?: Omit<
    UseQueryOptions<Record<ClinicalRequestStatus, number>, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.summary(),
    queryFn: getRequestSummary,
    ...options,
  });
}

/**
 * Hook to fetch today's pending count
 */
export function useTodaysPendingCount(
  options?: Omit<
    UseQueryOptions<
      {
        total: number;
        admissions: number;
        procedures: number;
        emergency: number;
      },
      Error
    >,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: clinicalRequestKeys.todayPending(),
    queryFn: getTodaysPendingCount,
    refetchInterval: 60000, // Refresh every minute
    ...options,
  });
}

// ==========================================
// CREATE MUTATIONS
// ==========================================

/**
 * Hook to create a clinical request
 */
export function useCreateClinicalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateClinicalRequestDTO) =>
      createClinicalRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
    },
  });
}

/**
 * Hook to create an admission request
 */
export function useCreateAdmissionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAdmissionRequestDTO) =>
      createAdmissionRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
    },
  });
}

/**
 * Hook to create a procedure request
 */
export function useCreateProcedureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateProcedureRequestDTO) =>
      createProcedureRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
    },
  });
}

/**
 * Hook to bulk create clinical requests
 */
export function useCreateBulkRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requests: CreateClinicalRequestDTO[]) =>
      createBulkClinicalRequests(requests),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
    },
  });
}

// ==========================================
// UPDATE MUTATIONS
// ==========================================

/**
 * Hook to update a clinical request
 */
export function useUpdateClinicalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateClinicalRequestDTO;
    }) => updateClinicalRequest(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to update request status
 */
export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      statusUpdate,
    }: {
      id: string;
      statusUpdate: UpdateStatusDTO;
    }) => updateRequestStatus(id, statusUpdate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

// ==========================================
// APPROVAL/REJECTION MUTATIONS
// ==========================================

/**
 * Hook to approve a request
 */
export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      approval,
    }: {
      id: string;
      approval: ApproveRequestDTO;
    }) => approveRequest(id, approval),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to reject a request
 */
export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rejection,
    }: {
      id: string;
      rejection: RejectRequestDTO;
    }) => rejectRequest(id, rejection),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

// ==========================================
// SCHEDULING MUTATION
// ==========================================

/**
 * Hook to schedule a request
 */
export function useScheduleRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      schedule,
    }: {
      id: string;
      schedule: ScheduleRequestDTO;
    }) => scheduleRequest(id, schedule),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

// ==========================================
// WORKFLOW MUTATIONS
// ==========================================

/**
 * Hook to start (mark in progress) a request
 */
export function useStartRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) =>
      startRequest(id, staffId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to complete a request
 */
export function useCompleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      completion,
    }: {
      id: string;
      completion: CompleteRequestDTO;
    }) => completeRequest(id, completion),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to cancel a request
 */
export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      staffId,
      reason,
    }: {
      id: string;
      staffId: string;
      reason?: string;
    }) => cancelRequest(id, staffId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      queryClient.setQueryData(clinicalRequestKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to execute an admission from an approved request
 */
export function useExecuteAdmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExecuteAdmissionData) => executeAdmission(data),
    onSuccess: (result) => {
      // Invalidate clinical requests
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      // Invalidate admissions
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      // Invalidate beds
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      // Invalidate wards
      queryClient.invalidateQueries({ queryKey: ['wards'] });
      // Invalidate patients
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      // Update the specific request in cache
      if (result.request) {
        queryClient.setQueryData(
          clinicalRequestKeys.detail(result.request.id),
          result.request,
        );
      }
    },
  });
}

/**
 * Hook to schedule a procedure from an approved request
 */
export function useScheduleProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ScheduleProcedureData) => scheduleProcedure(data),
    onSuccess: (result) => {
      // Invalidate clinical requests
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      // Invalidate procedures
      queryClient.invalidateQueries({ queryKey: ['procedures'] });

      // Update the specific request in cache
      if (result.request) {
        queryClient.setQueryData(
          clinicalRequestKeys.detail(result.request.id),
          result.request,
        );
      }
    },
  });
}

/**
 * Hook to execute a discharge from an approved request
 */
export function useExecuteDischarge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExecuteDischargeData) => executeDischarge(data),
    onSuccess: (result) => {
      // Invalidate clinical requests
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
      // Invalidate admissions
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      // Invalidate beds
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      // Invalidate wards
      queryClient.invalidateQueries({ queryKey: ['wards'] });
      // Invalidate patients
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      // Invalidate in-patient related queries
      queryClient.invalidateQueries({ queryKey: ['in-patient'] });

      // Update the specific request in cache
      if (result.request) {
        queryClient.setQueryData(
          clinicalRequestKeys.detail(result.request.id),
          result.request,
        );
      }
    },
  });
}

// ==========================================
// BATCH PROCEDURE APPROVAL MUTATIONS
// ==========================================

/**
 * Batch approve procedure requests - creates billing for all approved procedures
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchApproveProcedureRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BatchApproveProcedureRequestsDTO) =>
      batchApproveProcedureRequests(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: clinicalRequestKeys.lists(),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: clinicalRequestKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: clinicalRequestKeys.lists() },
        (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((req: any) =>
            dto.request_ids.includes(req.id)
              ? { ...req, status: 'Approved' }
              : req,
          );
        },
      );

      return { previousData };
    },
    onError: (_err, _dto, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
    },
  });
}

/**
 * Batch reject procedure requests - no billing created
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchRejectProcedureRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BatchRejectProcedureRequestsDTO) =>
      batchRejectProcedureRequests(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: clinicalRequestKeys.lists(),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: clinicalRequestKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: clinicalRequestKeys.lists() },
        (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((req: any) =>
            dto.request_ids.includes(req.id)
              ? { ...req, status: 'Rejected' }
              : req,
          );
        },
      );

      return { previousData };
    },
    onError: (_err, _dto, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: clinicalRequestKeys.all });
    },
  });
}
