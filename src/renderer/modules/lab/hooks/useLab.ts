import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { useBackgroundMutation } from '../../../hooks/useBackgroundMutation';
import {
  getLabRequests,
  getLabRequest,
  getLabReportRequests,
  updateLabRequest,
  collectSample,
  startProcessing,
  enterResult,
  enterEnhancedResult,
  EnhancedLabResultInput,
  getLabStats,
  getLabTestCatalogue,
  getPatientLabHistory,
  getPendingLabRequests,
  acceptLabRequest,
  rejectLabRequest,
  batchAcceptLabRequests,
  batchRejectLabRequests,
  getActiveLabFormTemplate,
  getLabFormTemplateHistory,
  saveLabFormTemplate,
  rollbackLabFormTemplate,
  AcceptLabRequestDTO,
  RejectLabRequestDTO,
  BatchAcceptLabRequestsDTO,
  BatchRejectLabRequestsDTO,
  SaveLabFormTemplateInput,
  RollbackLabFormTemplateInput,
} from '../api/lab.api';
import {
  LabRequestFilters,
  LabRequestDTO,
  UpdateLabRequestDTO,
  CreateLabResultDTO,
} from '../dtos/lab.dto';

// =============================================================================
// Query Keys
// =============================================================================

export const labKeys = {
  all: ['lab'] as const,
  lists: () => [...labKeys.all, 'list'] as const,
  list: (filters: LabRequestFilters) => [...labKeys.lists(), filters] as const,
  details: () => [...labKeys.all, 'detail'] as const,
  detail: (id: string) => [...labKeys.details(), id] as const,
  stats: () => [...labKeys.all, 'stats'] as const,
  catalogue: (category?: string) =>
    [...labKeys.all, 'catalogue', category] as const,
  patientHistory: (patientId: string) =>
    [...labKeys.all, 'patient-history', patientId] as const,
  pending: (patientId?: string) =>
    [...labKeys.all, 'pending', patientId] as const,
  formTemplate: (testId: string) =>
    [...labKeys.all, 'form-template', testId] as const,
  formTemplateHistory: (testId: string) =>
    [...labKeys.all, 'form-template-history', testId] as const,
};

// =============================================================================
// Queries
// =============================================================================

/**
 * Get lab requests with filters
 */
export function useLabRequests(filters: LabRequestFilters = {}) {
  return useQuery({
    queryKey: labKeys.list(filters),
    queryFn: () => getLabRequests(filters),
    // Realtime subscription handles near-instant updates; polling is fallback.
    refetchInterval: 45000,
    staleTime: 20000,
  });
}

/**
 * Get a single lab request
 */
export function useLabRequest(requestId: string | null) {
  return useQuery({
    queryKey: labKeys.detail(requestId || ''),
    queryFn: () => getLabRequest(requestId!),
    enabled: !!requestId,
  });
}

/**
 * Get all requests belonging to the same report/submission.
 */
export function useLabReportRequests(request: LabRequestDTO | null) {
  return useQuery({
    queryKey: [
      ...labKeys.details(),
      'report',
      request?.lab_request_group_id ||
        request?.encounter_id ||
        request?.request_id ||
        'none',
    ],
    queryFn: () => getLabReportRequests(request!),
    enabled: !!request,
    staleTime: 15000,
  });
}

/**
 * Get lab statistics
 */
export function useLabStats() {
  return useQuery({
    queryKey: labKeys.stats(),
    queryFn: getLabStats,
    refetchInterval: 45000,
    staleTime: 20000,
  });
}

/**
 * Get lab test catalogue
 */
export function useLabTestCatalogue(category?: string) {
  return useQuery({
    queryKey: labKeys.catalogue(category),
    queryFn: () => getLabTestCatalogue(category),
  });
}

/**
 * Get patient's lab history
 */
export function usePatientLabHistory(patientId: string | null) {
  return useQuery({
    queryKey: labKeys.patientHistory(patientId || ''),
    queryFn: () => getPatientLabHistory(patientId!),
    enabled: !!patientId,
  });
}

/**
 * Get pending lab requests
 */
export function usePendingLabRequests(patientId?: string) {
  return useQuery({
    queryKey: labKeys.pending(patientId),
    queryFn: () => getPendingLabRequests(patientId),
    refetchInterval: 45000,
    staleTime: 20000,
  });
}

/**
 * Get active lab form template for a specific test.
 */
export function useLabFormTemplate(testId: string | null, enabled = true) {
  return useQuery({
    queryKey: labKeys.formTemplate(testId || ''),
    queryFn: () => getActiveLabFormTemplate(testId!),
    enabled: enabled && !!testId,
    staleTime: 30000,
  });
}

/**
 * Get lab form template version history for a specific test.
 */
export function useLabFormTemplateHistory(
  testId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: labKeys.formTemplateHistory(testId || ''),
    queryFn: () => getLabFormTemplateHistory(testId!),
    enabled: enabled && !!testId,
    staleTime: 30000,
  });
}

/**
 * Save edited form as template for subsequent forms.
 */
export function useSaveLabFormTemplate() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:template:save',
    entityKey: (data: SaveLabFormTemplateInput) =>
      `lab-test-template:${data.test_id}`,
    maxRetries: 3,
    mutationFn: (data: SaveLabFormTemplateInput) => saveLabFormTemplate(data),
    onSuccess: (savedTemplate) => {
      queryClient.invalidateQueries({
        queryKey: labKeys.formTemplate(savedTemplate.test_id),
      });
      queryClient.invalidateQueries({
        queryKey: labKeys.formTemplateHistory(savedTemplate.test_id),
      });
    },
  });
}

/**
 * Roll back active template to a prior version.
 */
export function useRollbackLabFormTemplate() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:template:rollback',
    entityKey: (data: RollbackLabFormTemplateInput) =>
      `lab-test-template:${data.test_id}`,
    maxRetries: 3,
    mutationFn: (data: RollbackLabFormTemplateInput) =>
      rollbackLabFormTemplate(data),
    onSuccess: (rolledBackTemplate) => {
      queryClient.invalidateQueries({
        queryKey: labKeys.formTemplate(rolledBackTemplate.test_id),
      });
      queryClient.invalidateQueries({
        queryKey: labKeys.formTemplateHistory(rolledBackTemplate.test_id),
      });
    },
  });
}

// =============================================================================
// Mutations - With Optimistic Updates for Workflow Status (NOT lab results)
// =============================================================================

/**
 * Update lab request - OPTIMISTIC UPDATE (status only)
 */
export function useUpdateLabRequest() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:update',
    entityKey: (data) => `lab-request:${data.request_id}`,
    maxRetries: 4,
    mutationFn: (data: UpdateLabRequestDTO) => updateLabRequest(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: labKeys.lists() });

      const previousLists = queryClient.getQueryData(labKeys.lists());
      const previousDetail = queryClient.getQueryData(
        labKeys.detail(updateData.request_id),
      );

      // Optimistically update in lists
      queryClient.setQueriesData({ queryKey: labKeys.lists() }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((r: any) =>
            r.request_id === updateData.request_id
              ? { ...r, ...updateData }
              : r,
          );
        }
        return old;
      });

      return {
        previousLists,
        previousDetail,
        requestId: updateData.request_id,
      };
    },
    onError: (_err, _data, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: labKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousDetail && context?.requestId) {
        queryClient.setQueryData(
          labKeys.detail(context.requestId),
          context.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
    },
  });
}

/**
 * Collect sample - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useCollectSample() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:collect-sample',
    entityKey: (requestId: string) => `lab-request:${requestId}`,
    maxRetries: 4,
    mutationFn: (requestId: string) => collectSample(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: labKeys.lists() });
      await queryClient.cancelQueries({ queryKey: labKeys.stats() });

      const previousLists = queryClient.getQueryData(labKeys.lists());
      const previousStats = queryClient.getQueryData(labKeys.stats());

      // Optimistically update status to Sample Collected
      queryClient.setQueriesData({ queryKey: labKeys.lists() }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((r: any) =>
            r.request_id === requestId
              ? {
                  ...r,
                  status: 'Sample Collected',
                  collected_at: new Date().toISOString(),
                }
              : r,
          );
        }
        return old;
      });

      // Update stats
      queryClient.setQueryData(labKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pending: Math.max(0, (old.pending || 0) - 1),
          sampleCollected: (old.sampleCollected || 0) + 1,
        };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: labKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(labKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
    },
  });
}

/**
 * Start processing - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useStartProcessing() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:start-processing',
    entityKey: (requestId: string) => `lab-request:${requestId}`,
    maxRetries: 4,
    mutationFn: (requestId: string) => startProcessing(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: labKeys.lists() });
      await queryClient.cancelQueries({ queryKey: labKeys.stats() });

      const previousLists = queryClient.getQueryData(labKeys.lists());
      const previousStats = queryClient.getQueryData(labKeys.stats());

      // Optimistically update status to Processing
      queryClient.setQueriesData({ queryKey: labKeys.lists() }, (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((r: any) =>
            r.request_id === requestId
              ? {
                  ...r,
                  status: 'Processing',
                  started_at: new Date().toISOString(),
                }
              : r,
          );
        }
        return old;
      });

      // Update stats
      queryClient.setQueryData(labKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          sampleCollected: Math.max(0, (old.sampleCollected || 0) - 1),
          processing: (old.processing || 0) + 1,
        };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: labKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(labKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
    },
  });
}

/**
 * Enter result - NO OPTIMISTIC UPDATE (clinical lab results - server truth required)
 * Lab results require strict server validation, reference range checking, and audit trail
 *
 * Uses enterEnhancedResult to store in lab_results table with:
 * - structured_result (JSONB for template data)
 * - result_template_type (identifies which form/template was used)
 * - workflow_status, patient_id, test_id links
 */
export function useEnterResult() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:result:enter',
    entityKey: (data: CreateLabResultDTO | EnhancedLabResultInput) =>
      `lab-request:${data.lab_request_id}`,
    maxRetries: 4,
    mutationFn: (data: CreateLabResultDTO | EnhancedLabResultInput) => {
      // Use enhanced function which properly stores in lab_results table
      return enterEnhancedResult(data as EnhancedLabResultInput);
    },
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
      if (updatedRequest.patient_id) {
        queryClient.invalidateQueries({
          queryKey: labKeys.patientHistory(updatedRequest.patient_id),
        });
      }
    },
  });
}

/**
 * Subscribe to lab request changes for real-time updates
 */
export function useLabSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('lab-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_requests',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: labKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// =============================================================================
// Approval Workflow Mutations
// =============================================================================

/**
 * Accept a lab request - creates billing order on acceptance
 */
export function useAcceptLabRequest() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:accept',
    entityKey: (dto) => `lab-request:${dto.request_id}`,
    maxRetries: 4,
    mutationFn: (dto: AcceptLabRequestDTO) => acceptLabRequest(dto),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
      if (updatedRequest.request_id) {
        queryClient.invalidateQueries({
          queryKey: labKeys.detail(updatedRequest.request_id),
        });
      }
    },
  });
}

/**
 * Reject a lab request - no billing created
 */
export function useRejectLabRequest() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:reject',
    entityKey: (dto) => `lab-request:${dto.request_id}`,
    maxRetries: 4,
    mutationFn: (dto: RejectLabRequestDTO) => rejectLabRequest(dto),
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
      if (updatedRequest.request_id) {
        queryClient.invalidateQueries({
          queryKey: labKeys.detail(updatedRequest.request_id),
        });
      }
    },
  });
}

/**
 * Batch accept lab requests - creates billing for all approved requests
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchAcceptLabRequests() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:batch-accept',
    entityKey: () => 'lab-request:batch',
    maxRetries: 4,
    mutationFn: (dto: BatchAcceptLabRequestsDTO) => batchAcceptLabRequests(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: labKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: labKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData({ queryKey: labKeys.lists() }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((req: any) =>
            dto.request_ids.includes(req.request_id)
              ? { ...req, status: 'Accepted' }
              : req,
          ),
        };
      });

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
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
    },
  });
}

/**
 * Batch reject lab requests - no billing created
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchRejectLabRequests() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'lab:request:batch-reject',
    entityKey: () => 'lab-request:batch',
    maxRetries: 4,
    mutationFn: (dto: BatchRejectLabRequestsDTO) => batchRejectLabRequests(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: labKeys.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: labKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData({ queryKey: labKeys.lists() }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((req: any) =>
            dto.request_ids.includes(req.request_id)
              ? { ...req, status: 'Rejected' }
              : req,
          ),
        };
      });

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
      queryClient.invalidateQueries({ queryKey: labKeys.lists() });
      queryClient.invalidateQueries({ queryKey: labKeys.stats() });
      queryClient.invalidateQueries({ queryKey: labKeys.pending() });
    },
  });
}
