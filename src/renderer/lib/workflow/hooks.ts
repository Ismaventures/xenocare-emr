// =============================================================================
// EMR Workflow Hooks - React Query Integration
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useBackgroundMutation } from '../../hooks/useBackgroundMutation';
import {
  getActiveEncounters,
  getEncounter,
  getPatientActiveEncounter,
  createEncounter,
  transitionEncounter,
  moveToQueue,
  recordEncounterPayment,
  completeEncounter,
  cancelEncounter,
  getEncounterStats,
} from './api';
import {
  EncounterDTO,
  CreateEncounterDTO,
  TransitionEncounterDTO,
  MoveToQueueDTO,
} from './types';

// Query Keys
export const workflowKeys = {
  all: ['workflow'] as const,
  encounters: () => [...workflowKeys.all, 'encounters'] as const,
  encounter: (id: string) => [...workflowKeys.encounters(), id] as const,
  patientEncounter: (patientId: string) =>
    [...workflowKeys.all, 'patient', patientId] as const,
  stats: () => [...workflowKeys.all, 'stats'] as const,
};

function invalidateQueryKeys(
  queryClient: ReturnType<typeof useQueryClient>,
  keys: ReadonlyArray<ReadonlyArray<string>>,
): void {
  const seen = new Set<string>();

  for (const queryKey of keys) {
    const signature = JSON.stringify(queryKey);
    if (seen.has(signature)) continue;
    seen.add(signature);
    queryClient.invalidateQueries({ queryKey });
  }
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all active encounters for today
 * Includes is_assigned_to_current_user flag for queue access control
 */
export function useActiveEncounters() {
  const { staff } = useAuth();
  const currentUserId = staff?.id;

  return useQuery({
    queryKey: [...workflowKeys.encounters(), currentUserId],
    queryFn: () => getActiveEncounters(currentUserId),
    refetchInterval: 15000, // Refresh every 15 seconds (reduced from 5s)
    staleTime: 10000, // Cache for 10 seconds
  });
}

/**
 * Get a specific encounter by visit ID
 */
export function useEncounter(visitId: string) {
  return useQuery({
    queryKey: workflowKeys.encounter(visitId),
    queryFn: () => getEncounter(visitId),
    enabled: !!visitId,
  });
}

/**
 * Get active encounter for a patient
 */
export function usePatientActiveEncounter(patientId: string) {
  return useQuery({
    queryKey: workflowKeys.patientEncounter(patientId),
    queryFn: () => getPatientActiveEncounter(patientId),
    enabled: !!patientId,
  });
}

/**
 * Get encounter statistics
 */
export function useEncounterStats() {
  return useQuery({
    queryKey: workflowKeys.stats(),
    queryFn: getEncounterStats,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
    staleTime: 15000, // Consider data stale after 15 seconds
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    networkMode: 'always',
  });
}

/**
 * Subscribe to workflow changes for real-time updates
 */
export function useWorkflowSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('workflow-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
        },
        () => {
          invalidateQueryKeys(queryClient, [
            workflowKeys.encounters(),
            workflowKeys.stats(),
            ['consultations'],
          ]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue',
        },
        () => {
          invalidateQueryKeys(queryClient, [
            workflowKeys.encounters(),
            workflowKeys.stats(),
            ['queue'],
          ]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
        },
        () => {
          invalidateQueryKeys(queryClient, [
            workflowKeys.encounters(),
            workflowKeys.stats(),
            ['consultations'],
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new encounter (Patient Check-In) - with OPTIMISTIC UPDATE
 */
export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:create',
    entityKey: (dto) => `patient:${dto.patient_id}`,
    maxRetries: 4,
    mutationFn: (dto: CreateEncounterDTO) => createEncounter(dto),

    // OPTIMISTIC UPDATE - Update stats instantly
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: workflowKeys.stats() });
      await queryClient.cancelQueries({ queryKey: ['encounters', 'stats'] });
      await queryClient.cancelQueries({ queryKey: workflowKeys.encounters() });

      // Snapshot for rollback
      const previousStats = queryClient.getQueryData(workflowKeys.stats());
      const previousEncounterStats = queryClient.getQueryData([
        'encounters',
        'stats',
      ]);
      const previousEncounterLists = queryClient.getQueriesData({
        queryKey: workflowKeys.encounters(),
      });

      const optimisticEncounter = {
        visit_id: `optimistic-${Date.now()}`,
        current_stage: 'waiting',
        status: 'active',
        created_at: new Date().toISOString(),
        __optimistic: true,
      } as Partial<EncounterDTO>;

      queryClient.setQueriesData(
        { queryKey: workflowKeys.encounters() },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return [optimisticEncounter, ...old];
        },
      );

      // Optimistically increment stats
      queryClient.setQueryData(workflowKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: (old.total || 0) + 1,
          active: (old.active || 0) + 1,
          today: (old.today || 0) + 1,
        };
      });

      queryClient.setQueryData(['encounters', 'stats'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: (old.total || 0) + 1,
          active: (old.active || 0) + 1,
          today: (old.today || 0) + 1,
          todayCount: (old.todayCount || 0) + 1,
        };
      });

      return { previousStats, previousEncounterStats, previousEncounterLists };
    },

    // Rollback on error
    onError: (_err, _dto, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(workflowKeys.stats(), context.previousStats);
      }
      if (context?.previousEncounterStats) {
        queryClient.setQueryData(
          ['encounters', 'stats'],
          context.previousEncounterStats,
        );
      }
      if (context?.previousEncounterLists) {
        context.previousEncounterLists.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
    },

    // Background sync — invalidate ALL affected caches after mutation settles
    onSettled: () => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounters(),
        workflowKeys.stats(),
        ['queue'],
        ['internal-referrals'],
      ]);
    },
  });
}

/**
 * Transition encounter to next stage - OPTIMISTIC UPDATE
 */
export function useTransitionEncounter() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:transition',
    entityKey: (dto) => `encounter:${dto.visit_id}`,
    maxRetries: 4,
    mutationFn: (dto: TransitionEncounterDTO) => transitionEncounter(dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({
        queryKey: workflowKeys.encounter(dto.visit_id),
      });
      await queryClient.cancelQueries({ queryKey: workflowKeys.encounters() });

      const previousEncounter = queryClient.getQueryData(
        workflowKeys.encounter(dto.visit_id),
      );
      const previousEncounters = queryClient.getQueryData(
        workflowKeys.encounters(),
      );

      // Optimistically update encounter stage
      queryClient.setQueryData(
        workflowKeys.encounter(dto.visit_id),
        (old: any) => {
          if (!old) return old;
          return { ...old, current_stage: dto.to_stage };
        },
      );

      queryClient.setQueryData(workflowKeys.encounters(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((enc: any) =>
          enc.visit_id === dto.visit_id
            ? { ...enc, current_stage: dto.to_stage }
            : enc,
        );
      });

      return { previousEncounter, previousEncounters, visitId: dto.visit_id };
    },
    onError: (_err, _dto, context) => {
      if (context?.previousEncounter && context?.visitId) {
        queryClient.setQueryData(
          workflowKeys.encounter(context.visitId),
          context.previousEncounter,
        );
      }
      if (context?.previousEncounters) {
        queryClient.setQueryData(
          workflowKeys.encounters(),
          context.previousEncounters,
        );
      }
    },
    onSettled: (_data, _err, dto) => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounter(dto.visit_id),
        workflowKeys.encounters(),
        workflowKeys.stats(),
        ['queue'],
      ]);
    },
  });
}

/**
 * Move patient to a specific queue - OPTIMISTIC UPDATE
 */
export function useMoveToQueue() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:move-to-queue',
    entityKey: (dto) => `encounter:${dto.visit_id}`,
    maxRetries: 4,
    mutationFn: (dto: MoveToQueueDTO) => moveToQueue(dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.encounters() });
      await queryClient.cancelQueries({ queryKey: ['queue'] });

      const previousEncounters = queryClient.getQueryData(
        workflowKeys.encounters(),
      );
      const previousQueue = queryClient.getQueryData(['queue']);

      // Optimistically update encounter's location
      queryClient.setQueryData(workflowKeys.encounters(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((enc: any) =>
          enc.visit_id === dto.visit_id
            ? { ...enc, current_stage: dto.department }
            : enc,
        );
      });

      return { previousEncounters, previousQueue, visitId: dto.visit_id };
    },
    onError: (_err, _dto, context) => {
      if (context?.previousEncounters) {
        queryClient.setQueryData(
          workflowKeys.encounters(),
          context.previousEncounters,
        );
      }
      if (context?.previousQueue) {
        queryClient.setQueryData(['queue'], context.previousQueue);
      }
    },
    onSettled: (_, _err, dto) => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounter(dto.visit_id),
        workflowKeys.encounters(),
        ['queue'],
      ]);
    },
  });
}

/**
 * Record payment for encounter
 */
export function useRecordEncounterPayment() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:record-payment',
    entityKey: ({ visitId }) => `encounter:${visitId}`,
    maxRetries: 4,
    mutationFn: ({
      visitId,
      amount,
      paymentMethod,
      receiptNumber,
    }: {
      visitId: string;
      amount: number;
      paymentMethod: string;
      receiptNumber?: string;
    }) => recordEncounterPayment(visitId, amount, paymentMethod, receiptNumber),
    onSuccess: (_, variables) => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounter(variables.visitId),
        workflowKeys.encounters(),
        workflowKeys.stats(),
        ['queue'],
        ['billing'],
      ]);
    },
  });
}

/**
 * Complete an encounter - OPTIMISTIC UPDATE
 */
export function useCompleteEncounter() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:complete',
    entityKey: (visitId: string) => `encounter:${visitId}`,
    maxRetries: 4,
    mutationFn: (visitId: string) => completeEncounter(visitId),
    onMutate: async (visitId) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.encounters() });
      await queryClient.cancelQueries({ queryKey: workflowKeys.stats() });

      const previousEncounters = queryClient.getQueryData(
        workflowKeys.encounters(),
      );
      const previousStats = queryClient.getQueryData(workflowKeys.stats());

      // Optimistically mark as completed
      queryClient.setQueryData(workflowKeys.encounters(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((enc: any) =>
          enc.visit_id === visitId
            ? { ...enc, status: 'Completed', current_stage: 'Completed' }
            : enc,
        );
      });

      // Update stats
      queryClient.setQueryData(workflowKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          active: Math.max(0, (old.active || 0) - 1),
          completed: (old.completed || 0) + 1,
        };
      });

      return { previousEncounters, previousStats, visitId };
    },
    onError: (_err, _visitId, context) => {
      if (context?.previousEncounters) {
        queryClient.setQueryData(
          workflowKeys.encounters(),
          context.previousEncounters,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(workflowKeys.stats(), context.previousStats);
      }
    },
    onSettled: (_, _err, visitId) => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounter(visitId),
        workflowKeys.encounters(),
        workflowKeys.stats(),
        ['queue'],
      ]);
    },
  });
}

/**
 * Cancel an encounter - OPTIMISTIC UPDATE
 */
export function useCancelEncounter() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:cancel',
    entityKey: ({ visitId }) => `encounter:${visitId}`,
    maxRetries: 4,
    mutationFn: ({ visitId, reason }: { visitId: string; reason?: string }) =>
      cancelEncounter(visitId, reason),
    onMutate: async ({ visitId }) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.encounters() });
      await queryClient.cancelQueries({ queryKey: workflowKeys.stats() });

      const previousEncounters = queryClient.getQueryData(
        workflowKeys.encounters(),
      );
      const previousStats = queryClient.getQueryData(workflowKeys.stats());

      // Optimistically mark as cancelled
      queryClient.setQueryData(workflowKeys.encounters(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((enc: any) =>
          enc.visit_id === visitId
            ? { ...enc, status: 'Cancelled', current_stage: 'Cancelled' }
            : enc,
        );
      });

      // Update stats
      queryClient.setQueryData(workflowKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          active: Math.max(0, (old.active || 0) - 1),
          cancelled: (old.cancelled || 0) + 1,
        };
      });

      return { previousEncounters, previousStats, visitId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEncounters) {
        queryClient.setQueryData(
          workflowKeys.encounters(),
          context.previousEncounters,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(workflowKeys.stats(), context.previousStats);
      }
    },
    onSettled: (_, _err, { visitId }) => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounter(visitId),
        workflowKeys.encounters(),
        workflowKeys.stats(),
        ['queue'],
      ]);
    },
  });
}

/**
 * Start a consultation - marks patient as "In Progress" and removes from waiting queue
 * Prevents multiple doctors from working on the same patient
 */
export function useStartConsultation() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'consultation:start',
    entityKey: ({ encounterId }) => `encounter:${encounterId}`,
    maxRetries: 4,
    mutationFn: ({
      encounterId,
      doctorId,
    }: {
      encounterId: string;
      doctorId?: string;
    }) =>
      import('./api').then((api) =>
        api.startConsultation(encounterId, doctorId),
      ),
    onMutate: async ({ encounterId }) => {
      await queryClient.cancelQueries({ queryKey: workflowKeys.encounters() });
      await queryClient.cancelQueries({ queryKey: ['queue'] });

      const previousEncounters = queryClient.getQueryData(
        workflowKeys.encounters(),
      );

      // Optimistically remove from waiting queue (filter out or mark as in progress)
      queryClient.setQueryData(workflowKeys.encounters(), (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((enc: any) =>
          enc.id === encounterId
            ? {
                ...enc,
                current_stage: 'consultation',
                queue_entry: { ...enc.queue_entry, status: 'In Progress' },
              }
            : enc,
        );
      });

      return { previousEncounters, encounterId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEncounters) {
        queryClient.setQueryData(
          workflowKeys.encounters(),
          context.previousEncounters,
        );
      }
    },
    onSettled: () => {
      invalidateQueryKeys(queryClient, [
        workflowKeys.encounters(),
        workflowKeys.stats(),
        ['queue'],
      ]);
    },
  });
}

/**
 * Cancel/release a consultation - optionally returns patient to queue
 */
export function useCancelConsultation() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'consultation:cancel',
    entityKey: ({ encounterId }) => `encounter:${encounterId}`,
    maxRetries: 4,
    mutationFn: ({
      encounterId,
      returnToQueue,
    }: {
      encounterId: string;
      returnToQueue?: boolean;
    }) =>
      import('./api').then((api) =>
        api.cancelConsultation(encounterId, returnToQueue),
      ),
    onSettled: () => {
      invalidateQueryKeys(queryClient, [workflowKeys.encounters(), ['queue']]);
    },
  });
}
