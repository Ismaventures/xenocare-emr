import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { useBackgroundMutation } from '../../../hooks/useBackgroundMutation';
import { getVisibilityAwareRefetchInterval } from '../../../lib/query/polling';
import {
  getQueue,
  getDepartmentWaitingQueue,
  addToQueue,
  callNextPatient,
  updateQueueEntry,
  startServing,
  completeServing,
  markNoShow,
  transferToDepartment,
  getQueueStats,
  getDepartmentQueues,
  getCurrentCalledNumber,
} from '../api/queue.api';
import {
  CreateQueueDTO,
  UpdateQueueDTO,
  QueueFilters,
  Department,
} from '../dtos/queue.dto';

// =============================================================================
// Query Keys
// =============================================================================

export const queueKeys = {
  all: ['queue'] as const,
  lists: () => [...queueKeys.all, 'list'] as const,
  list: (filters: QueueFilters) => [...queueKeys.lists(), filters] as const,
  departmentQueue: (department: Department) =>
    [...queueKeys.all, 'department', department] as const,
  stats: () => [...queueKeys.all, 'stats'] as const,
  departmentQueues: () => [...queueKeys.all, 'departments'] as const,
  currentNumber: (department: Department) =>
    [...queueKeys.all, 'current', department] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Get queue entries with filters
 */
export function useQueue(filters: QueueFilters = {}) {
  return useQuery({
    queryKey: queueKeys.list(filters),
    queryFn: () => getQueue(filters),
    // Realtime subscription handles near-instant updates; polling is fallback.
    refetchInterval: () => getVisibilityAwareRefetchInterval(30000),
    staleTime: 15000,
  });
}

/**
 * Get department waiting queue
 */
export function useDepartmentQueue(department: Department) {
  return useQuery({
    queryKey: queueKeys.departmentQueue(department),
    queryFn: () => getDepartmentWaitingQueue(department),
    // Realtime subscription handles near-instant updates; polling is fallback.
    refetchInterval: () => getVisibilityAwareRefetchInterval(30000),
    staleTime: 15000,
    enabled: !!department,
  });
}

/**
 * Get queue statistics
 */
export function useQueueStats() {
  return useQuery({
    queryKey: queueKeys.stats(),
    queryFn: getQueueStats,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
    staleTime: 30000,
  });
}

/**
 * Get all department queue summaries
 */
export function useDepartmentQueues() {
  return useQuery({
    queryKey: queueKeys.departmentQueues(),
    queryFn: getDepartmentQueues,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30000),
    staleTime: 15000,
  });
}

/**
 * Get current called number for a department
 */
export function useCurrentNumber(department: Department) {
  return useQuery({
    queryKey: queueKeys.currentNumber(department),
    queryFn: () => getCurrentCalledNumber(department),
    refetchInterval: () => getVisibilityAwareRefetchInterval(30000),
    staleTime: 15000,
    enabled: !!department,
  });
}

/**
 * Subscribe to queue changes for real-time updates
 */
export function useQueueSubscription() {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleInvalidate = () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
      }

      invalidateTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queueKeys.all });
        invalidateTimerRef.current = null;
      }, 300);
    };

    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .subscribe();

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// =============================================================================
// Mutation Hooks - With Optimistic Updates for Instant UI
// =============================================================================

/**
 * Add patient to queue - OPTIMISTIC UPDATE
 */
export function useAddToQueue() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:add',
    entityKey: (data) => `patient:${data.patient_id}`,
    maxRetries: 4,
    mutationFn: (data: CreateQueueDTO) => addToQueue(data),
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: queueKeys.all });
      const previousData = queryClient.getQueryData(queueKeys.lists());

      // Optimistically add to queue
      queryClient.setQueriesData(
        { queryKey: queueKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return [
            ...old,
            { ...newEntry, id: `temp-${Date.now()}`, status: 'Waiting' },
          ];
        },
      );

      // Update stats optimistically
      queryClient.setQueryData(queueKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          waiting: (old.waiting || 0) + 1,
          total: (old.total || 0) + 1,
        };
      });

      return { previousData };
    },
    onError: (_err, _data, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queueKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Call next patient - OPTIMISTIC UPDATE
 */
export function useCallNext() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:call-next',
    entityKey: (department: Department) => `queue-department:${department}`,
    maxRetries: 4,
    mutationFn: (department: Department) => callNextPatient(department),
    onMutate: async (department) => {
      await queryClient.cancelQueries({
        queryKey: queueKeys.departmentQueue(department),
      });
      const previousQueue = queryClient.getQueryData(
        queueKeys.departmentQueue(department),
      );

      // Optimistically mark first waiting as Called
      queryClient.setQueryData(
        queueKeys.departmentQueue(department),
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          const sorted = [...old].sort(
            (a, b) => a.ticket_number - b.ticket_number,
          );
          const firstWaiting = sorted.find((q: any) => q.status === 'Waiting');
          if (!firstWaiting) return old;
          return old.map((q: any) =>
            q.id === firstWaiting.id ? { ...q, status: 'Called' } : q,
          );
        },
      );

      return { previousQueue, department };
    },
    onError: (_err, _dept, context) => {
      if (context?.previousQueue && context?.department) {
        queryClient.setQueryData(
          queueKeys.departmentQueue(context.department),
          context.previousQueue,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Update queue entry - OPTIMISTIC UPDATE
 */
export function useUpdateQueue() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:update',
    entityKey: (data) => `queue:${data.id}`,
    maxRetries: 4,
    mutationFn: (data: UpdateQueueDTO) => updateQueueEntry(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: queueKeys.all });
      const previousData = queryClient.getQueryData(queueKeys.lists());

      queryClient.setQueriesData(
        { queryKey: queueKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((q: any) =>
            q.id === updateData.id ? { ...q, ...updateData } : q,
          );
        },
      );

      return { previousData };
    },
    onError: (_err, _data, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queueKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Start serving patient - OPTIMISTIC UPDATE
 */
export function useStartServing() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:start-serving',
    entityKey: (queueId: string) => `queue:${queueId}`,
    maxRetries: 4,
    mutationFn: (queueId: string) => startServing(queueId),
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({ queryKey: queueKeys.all });
      const previousData = queryClient.getQueryData(queueKeys.lists());

      queryClient.setQueriesData(
        { queryKey: queueKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((q: any) =>
            q.id === queueId ? { ...q, status: 'In Progress' } : q,
          );
        },
      );

      // Update stats
      queryClient.setQueryData(queueKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          waiting: Math.max(0, (old.waiting || 0) - 1),
          inProgress: (old.inProgress || 0) + 1,
        };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queueKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Complete serving patient - OPTIMISTIC UPDATE
 */
export function useCompleteServing() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:complete-serving',
    entityKey: (queueId: string) => `queue:${queueId}`,
    maxRetries: 4,
    mutationFn: (queueId: string) => completeServing(queueId),
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({ queryKey: queueKeys.all });
      const previousData = queryClient.getQueryData(queueKeys.lists());

      queryClient.setQueriesData(
        { queryKey: queueKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((q: any) =>
            q.id === queueId ? { ...q, status: 'Completed' } : q,
          );
        },
      );

      // Update stats
      queryClient.setQueryData(queueKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          inProgress: Math.max(0, (old.inProgress || 0) - 1),
          completed: (old.completed || 0) + 1,
        };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queueKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Mark patient as no show - OPTIMISTIC UPDATE
 */
export function useMarkNoShow() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:no-show',
    entityKey: (queueId: string) => `queue:${queueId}`,
    maxRetries: 4,
    mutationFn: (queueId: string) => markNoShow(queueId),
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({ queryKey: queueKeys.all });
      const previousData = queryClient.getQueryData(queueKeys.lists());

      queryClient.setQueriesData(
        { queryKey: queueKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((q: any) =>
            q.id === queueId ? { ...q, status: 'No Show' } : q,
          );
        },
      );

      // Update stats
      queryClient.setQueryData(queueKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          waiting: Math.max(0, (old.waiting || 0) - 1),
          noShow: (old.noShow || 0) + 1,
        };
      });

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queueKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}

/**
 * Transfer patient to another department - OPTIMISTIC UPDATE
 */
export function useTransferDepartment() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'queue:transfer',
    entityKey: ({ queueId }) => `queue:${queueId}`,
    maxRetries: 4,
    mutationFn: ({
      queueId,
      department,
    }: {
      queueId: string;
      department: Department;
    }) => transferToDepartment(queueId, department),
    onMutate: async ({ queueId, department }) => {
      await queryClient.cancelQueries({ queryKey: queueKeys.all });
      const previousData = queryClient.getQueryData(queueKeys.lists());

      // Remove from current view, add to new department
      queryClient.setQueriesData(
        { queryKey: queueKeys.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((q: any) =>
            q.id === queueId
              ? { ...q, location: department, status: 'Waiting' }
              : q,
          );
        },
      );

      return { previousData };
    },
    onError: (_err, _data, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queueKeys.lists(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
  });
}
