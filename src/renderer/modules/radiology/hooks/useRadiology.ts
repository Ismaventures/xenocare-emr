import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import { useBackgroundMutation } from '../../../hooks/useBackgroundMutation';
import {
  getRadiologyRequests,
  getRadiologyRequest,
  updateRadiologyRequest,
  scheduleImaging,
  startImaging,
  completeImaging,
  submitReport,
  getRadiologyStats,
  getImagingCatalogue,
  normalizeImagingCatalogueRecord,
  getPatientRadiologyHistory,
  getPendingRadiologyRequests,
  uploadRadiologyImages,
  skipToAwaitingReport,
  finalizeReport,
  acceptRadiologyRequest,
  rejectRadiologyRequest,
  batchAcceptRadiologyRequests,
  batchRejectRadiologyRequests,
  AcceptRadiologyRequestDTO,
  RejectRadiologyRequestDTO,
  BatchAcceptRadiologyRequestsDTO,
  BatchRejectRadiologyRequestsDTO,
  SubmitReportResult,
} from '../api/radiology.api';
import {
  ImagingDTO,
  RadiologyRequestFilters,
  UpdateRadiologyRequestDTO,
  UploadScanImageDTO,
  CreateScanResultDTO,
} from '../dtos/radiology.dto';

// =============================================================================
// Query Keys
// =============================================================================

export const radiologyKeys = {
  all: ['radiology'] as const,
  lists: () => [...radiologyKeys.all, 'list'] as const,
  list: (filters: RadiologyRequestFilters) =>
    [...radiologyKeys.lists(), filters] as const,
  details: () => [...radiologyKeys.all, 'detail'] as const,
  detail: (id: string) => [...radiologyKeys.details(), id] as const,
  stats: () => [...radiologyKeys.all, 'stats'] as const,
  catalogue: (modality?: string) =>
    [...radiologyKeys.all, 'catalogue', modality] as const,
  patientHistory: (patientId: string) =>
    [...radiologyKeys.all, 'patient-history', patientId] as const,
  pending: (patientId?: string) =>
    [...radiologyKeys.all, 'pending', patientId] as const,
};

// =============================================================================
// Queries
// =============================================================================

/**
 * Get radiology requests with filters
 */
export function useRadiologyRequests(filters: RadiologyRequestFilters = {}) {
  return useQuery({
    queryKey: radiologyKeys.list(filters),
    queryFn: () => getRadiologyRequests(filters),
    // Realtime subscription handles near-instant updates; polling is fallback.
    refetchInterval: 45000,
    staleTime: 20000,
  });
}

/**
 * Get a single radiology request
 */
export function useRadiologyRequest(requestId: string | null) {
  return useQuery({
    queryKey: radiologyKeys.detail(requestId || ''),
    queryFn: () => getRadiologyRequest(requestId!),
    enabled: !!requestId,
  });
}

/**
 * Get radiology statistics
 */
export function useRadiologyStats() {
  return useQuery({
    queryKey: radiologyKeys.stats(),
    queryFn: () => getRadiologyStats(),
    refetchInterval: 45000,
    staleTime: 20000,
  });
}

/**
 * Get imaging catalogue.
 * Uses useQuery (not useOfflineQuery) so the reference_data IndexedDB store
 * cannot serve stale empty results from pre-auth fetches.
 * Guarded by enabled: !!staff?.staff_id so it never fires before login.
 */
export function useImagingCatalogue(modality?: string) {
  const { staff } = useAuth();
  const queryResult = useQuery({
    queryKey: radiologyKeys.catalogue(modality),
    queryFn: () => getImagingCatalogue(modality),
    staleTime: 0,
    enabled: !!staff?.staff_id,
  });

  const data = useMemo(
    () =>
      Array.isArray(queryResult.data)
        ? queryResult.data
            .map((item) =>
              normalizeImagingCatalogueRecord(
                item as Partial<ImagingDTO> & Record<string, unknown>,
              ),
            )
            .filter((item): item is ImagingDTO => item !== null)
        : undefined,
    [queryResult.data],
  );

  return {
    ...queryResult,
    data,
  };
}

/**
 * Get patient's radiology history
 */
export function usePatientRadiologyHistory(patientId: string | null) {
  return useQuery({
    queryKey: radiologyKeys.patientHistory(patientId || ''),
    queryFn: () => getPatientRadiologyHistory(patientId!),
    enabled: !!patientId,
  });
}

/**
 * Get pending radiology requests
 */
export function usePendingRadiologyRequests(patientId?: string) {
  return useQuery({
    queryKey: radiologyKeys.pending(patientId),
    queryFn: () => getPendingRadiologyRequests(patientId),
    refetchInterval: 45000,
    staleTime: 20000,
  });
}

// =============================================================================
// Mutations - With Optimistic Updates for Workflow Status (NOT clinical reports)
// =============================================================================

/**
 * Update radiology request - OPTIMISTIC UPDATE (status only)
 */
export function useUpdateRadiologyRequest() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:update',
    entityKey: (data) => `radiology-request:${data.request_id}`,
    maxRetries: 4,
    mutationFn: (data: UpdateRadiologyRequestDTO) =>
      updateRadiologyRequest(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: radiologyKeys.lists() });

      const previousLists = queryClient.getQueryData(radiologyKeys.lists());
      const previousDetail = queryClient.getQueryData(
        radiologyKeys.detail(updateData.request_id),
      );

      // Optimistically update in lists
      queryClient.setQueriesData(
        { queryKey: radiologyKeys.lists() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((r: any) =>
              r.request_id === updateData.request_id
                ? { ...r, ...updateData }
                : r,
            );
          }
          return old;
        },
      );

      return {
        previousLists,
        previousDetail,
        requestId: updateData.request_id,
      };
    },
    onError: (_err, _data, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: radiologyKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousDetail && context?.requestId) {
        queryClient.setQueryData(
          radiologyKeys.detail(context.requestId),
          context.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.pending() });
    },
  });
}

/**
 * Start imaging procedure - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useStartImaging() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:start-imaging',
    entityKey: (requestId: string) => `radiology-request:${requestId}`,
    maxRetries: 4,
    mutationFn: (requestId: string) => startImaging(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: radiologyKeys.lists() });
      await queryClient.cancelQueries({ queryKey: radiologyKeys.stats() });

      const previousLists = queryClient.getQueryData(radiologyKeys.lists());
      const previousStats = queryClient.getQueryData(radiologyKeys.stats());

      // Optimistically update status to In Progress
      queryClient.setQueriesData(
        { queryKey: radiologyKeys.lists() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((r: any) =>
              r.request_id === requestId
                ? {
                    ...r,
                    status: 'In Progress',
                    started_at: new Date().toISOString(),
                  }
                : r,
            );
          }
          return old;
        },
      );

      // Update stats
      queryClient.setQueryData(radiologyKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          scheduled: Math.max(0, (old.scheduled || 0) - 1),
          in_progress: (old.in_progress || 0) + 1,
        };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: radiologyKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(radiologyKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.pending() });
    },
  });
}

/**
 * Schedule imaging
 */
export function useScheduleImaging() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:schedule',
    entityKey: ({ requestId }) => `radiology-request:${requestId}`,
    maxRetries: 4,
    mutationFn: ({
      requestId,
      scheduledDate,
    }: {
      requestId: string;
      scheduledDate: string;
    }) => scheduleImaging(requestId, scheduledDate),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.pending() });
    },
  });
}

/**
 * Complete imaging - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useCompleteImaging() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:complete-imaging',
    entityKey: ({ requestId }) => `radiology-request:${requestId}`,
    maxRetries: 4,
    mutationFn: ({
      requestId,
      imageUrl,
    }: {
      requestId: string;
      imageUrl?: string;
    }) => completeImaging(requestId, imageUrl),
    onMutate: async ({ requestId }) => {
      await queryClient.cancelQueries({ queryKey: radiologyKeys.lists() });
      await queryClient.cancelQueries({ queryKey: radiologyKeys.stats() });

      const previousLists = queryClient.getQueryData(radiologyKeys.lists());
      const previousStats = queryClient.getQueryData(radiologyKeys.stats());

      // Optimistically update status to Imaging Completed
      queryClient.setQueriesData(
        { queryKey: radiologyKeys.lists() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((r: any) =>
              r.request_id === requestId
                ? {
                    ...r,
                    status: 'Imaging Completed',
                    completed_at: new Date().toISOString(),
                  }
                : r,
            );
          }
          return old;
        },
      );

      // Update stats
      queryClient.setQueryData(radiologyKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          in_progress: Math.max(0, (old.in_progress || 0) - 1),
          imaging_completed: (old.imaging_completed || 0) + 1,
        };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _data, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: radiologyKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(radiologyKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
    },
  });
}

/**
 * Skip image upload and move directly to Awaiting Report
 */
export function useSkipToAwaitingReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string }) =>
      skipToAwaitingReport(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
    },
    onError: (error) => {
      console.error('[skipToAwaitingReport] Failed:', error);
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
    },
  });
}

/**
 * Upload radiology images
 */
export function useUploadRadiologyImages() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:images:upload',
    entityKey: ({ requestId }) => `radiology-request:${requestId}`,
    maxRetries: 4,
    mutationFn: ({
      requestId,
      images,
    }: {
      requestId: string;
      images: UploadScanImageDTO[];
    }) => uploadRadiologyImages(requestId, images),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.pending() });
    },
  });
}

/**
 * Submit report - NO OPTIMISTIC UPDATE (clinical findings - server truth required)
 * Clinical reports require strict server validation and audit trail.
 *
 * Accepts patientId from the caller to avoid a round-trip re-fetch of the
 * full request after save. The API returns a lightweight SubmitReportResult.
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      reportData,
      patientId,
    }: {
      requestId: string;
      reportData: CreateScanResultDTO;
      patientId?: string | null;
    }) => submitReport(requestId, reportData, patientId),
    onSuccess: (result: SubmitReportResult) => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.pending() });
      if (result.patient_id) {
        queryClient.invalidateQueries({
          queryKey: radiologyKeys.patientHistory(result.patient_id),
        });
      }
    },
    onError: (error) => {
      console.error('[submitReport] Failed:', error);
    },
  });
}

/**
 * Finalize radiology report
 */
export function useFinalizeReport() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:report:finalize',
    entityKey: (requestId: string) => `radiology-request:${requestId}`,
    maxRetries: 4,
    mutationFn: (requestId: string) => finalizeReport(requestId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.pending() });
    },
  });
}

/**
 * Subscribe to radiology request changes for real-time updates
 */
export function useRadiologySubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('radiology-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radiology_requests',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: radiologyKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Accept a radiology request and create billing
 */
export function useAcceptRadiologyRequest() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:accept',
    entityKey: (dto) => `radiology-request:${dto.request_id}`,
    maxRetries: 4,
    mutationFn: (dto: AcceptRadiologyRequestDTO) => acceptRadiologyRequest(dto),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      if (updatedRequest?.request_id) {
        queryClient.invalidateQueries({
          queryKey: radiologyKeys.detail(updatedRequest.request_id),
        });
      }
    },
  });
}

/**
 * Reject a radiology request
 */
export function useRejectRadiologyRequest() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:reject',
    entityKey: (dto) => `radiology-request:${dto.request_id}`,
    maxRetries: 4,
    mutationFn: (dto: RejectRadiologyRequestDTO) => rejectRadiologyRequest(dto),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
      if (updatedRequest?.request_id) {
        queryClient.invalidateQueries({
          queryKey: radiologyKeys.detail(updatedRequest.request_id),
        });
      }
    },
  });
}

/**
 * Batch accept radiology requests - creates billing for all approved requests
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchAcceptRadiologyRequests() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:batch-accept',
    entityKey: () => 'radiology-request:batch',
    maxRetries: 4,
    mutationFn: (dto: BatchAcceptRadiologyRequestsDTO) =>
      batchAcceptRadiologyRequests(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: radiologyKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: radiologyKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: radiologyKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((req: any) =>
              dto.request_ids.includes(req.request_id)
                ? { ...req, status: 'Accepted' }
                : req,
            ),
          };
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
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
    },
  });
}

/**
 * Batch reject radiology requests - no billing created
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchRejectRadiologyRequests() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'radiology:request:batch-reject',
    entityKey: () => 'radiology-request:batch',
    maxRetries: 4,
    mutationFn: (dto: BatchRejectRadiologyRequestsDTO) =>
      batchRejectRadiologyRequests(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: radiologyKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: radiologyKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: radiologyKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((req: any) =>
              dto.request_ids.includes(req.request_id)
                ? { ...req, status: 'Rejected' }
                : req,
            ),
          };
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
      queryClient.invalidateQueries({ queryKey: radiologyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: radiologyKeys.stats() });
    },
  });
}
