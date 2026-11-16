import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../../api/supabaseClient';
import {
  // New Vitals API
  getVitals,
  getVitalsById,
  createVitals,
  updateVitals,
  deleteVitals,
  getPatientLatestVitals,
  getCriticalVitals,
  // New Queue API
  getNursingQueue,
  updateQueueStatus,
  getNursingStats,
  // Legacy Nursing Care API
  getNursingCareRecords,
  getNursingCareRecord,
  createNursingCareRecord,
  updateNursingCareRecord,
  deleteNursingCareRecord,
  getNursingCareStats,
  getLatestVitalSigns,
  getVitalSignsHistory,
  getPatientsRequiringCare,
  getNursingQueuePatients,
  getNursingQueueCount,
  callNursingQueuePatient,
  startServingPatient,
  completeNursingQueue,
} from '../api/nursing.api';
import {
  // New Vitals DTOs
  VitalsFilters,
  CreateVitalsDTO,
  UpdateVitalsDTO,
  QueueFilters,
  // Legacy DTOs
  NursingCareFilters,
  CreateNursingCareDTO,
  UpdateNursingCareDTO,
} from '../dtos/nursing.dto';
import { useBackgroundMutation } from '../../../hooks/useBackgroundMutation';

// =============================================================================
// CONSULTED PATIENTS HOOKS (For Nursing Reports)
// =============================================================================

import {
  getConsultedPatients,
  getConsultedPatientsCount,
  type ConsultedPatient,
} from '../api/nursing.api';

// =============================================================================
// Query Keys
// =============================================================================

export const nursingKeys = {
  all: ['nursing'] as const,
  // New Vitals Keys
  vitals: () => [...nursingKeys.all, 'vitals'] as const,
  vitalsList: (filters: VitalsFilters) =>
    [...nursingKeys.vitals(), 'list', filters] as const,
  vitalsDetail: (id: string) =>
    [...nursingKeys.vitals(), 'detail', id] as const,
  patientLatestVitals: (patientId: string) =>
    [...nursingKeys.vitals(), 'latest', patientId] as const,
  criticalVitals: () => [...nursingKeys.vitals(), 'critical'] as const,
  // New Queue Keys
  nursingQueue: () => [...nursingKeys.all, 'nursingQueue'] as const,
  nursingQueueList: (filters: QueueFilters) =>
    [...nursingKeys.nursingQueue(), 'list', filters] as const,
  // Stats Keys
  nursingStats: () => [...nursingKeys.all, 'nursingStats'] as const,
  // Legacy Keys
  lists: () => [...nursingKeys.all, 'list'] as const,
  list: (filters: NursingCareFilters) =>
    [...nursingKeys.lists(), filters] as const,
  details: () => [...nursingKeys.all, 'detail'] as const,
  detail: (id: string) => [...nursingKeys.details(), id] as const,
  stats: () => [...nursingKeys.all, 'stats'] as const,
  patientVitals: (patientId: string) =>
    [...nursingKeys.all, 'patientVitals', patientId] as const,
  patientVitalHistory: (patientId: string, days: number) =>
    [...nursingKeys.all, 'vitalHistory', patientId, days] as const,
  patientsRequiringCare: () => [...nursingKeys.all, 'requiring-care'] as const,
  queue: () => [...nursingKeys.all, 'queue'] as const,
  queueCount: () => [...nursingKeys.all, 'queue-count'] as const,
};

// =============================================================================
// NEW VITALS HOOKS
// =============================================================================

/**
 * Get vitals records with filters
 */
export function useVitals(filters: VitalsFilters = {}) {
  return useQuery({
    queryKey: nursingKeys.vitalsList(filters),
    queryFn: () => getVitals(filters),
    retry: false,
    staleTime: 30000,
  });
}

/**
 * Get single vitals record by ID
 */
export function useVitalsById(vitalsId: string | null) {
  return useQuery({
    queryKey: nursingKeys.vitalsDetail(vitalsId || ''),
    queryFn: () => getVitalsById(vitalsId!),
    enabled: !!vitalsId,
  });
}

/**
 * Get patient's latest vitals
 */
export function usePatientLatestVitals(patientId: string | null) {
  return useQuery({
    queryKey: nursingKeys.patientLatestVitals(patientId || ''),
    queryFn: () => getPatientLatestVitals(patientId!),
    enabled: !!patientId,
    staleTime: 60000,
  });
}

/**
 * Get critical vitals alerts
 */
export function useCriticalVitals() {
  return useQuery({
    queryKey: nursingKeys.criticalVitals(),
    queryFn: getCriticalVitals,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });
}

/**
 * Create new vitals record - OPTIMISTIC UPDATE for instant save feel
 */
export function useCreateVitals() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'vitals:create',
    entityKey: (data) => `patient:${data.patient_id}`,
    maxRetries: 4,
    mutationFn: (data: CreateVitalsDTO) => createVitals(data),
    onMutate: async (newVitals) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.vitals() });
      await queryClient.cancelQueries({ queryKey: nursingKeys.nursingStats() });

      const previousVitals = queryClient.getQueryData(nursingKeys.vitals());
      const previousStats = queryClient.getQueryData(
        nursingKeys.nursingStats(),
      );

      // Optimistically add to list with temp ID
      queryClient.setQueriesData(
        { queryKey: nursingKeys.vitals() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return [
              {
                ...newVitals,
                vitals_id: `temp-${Date.now()}`,
                created_at: new Date().toISOString(),
              },
              ...old,
            ];
          }
          return old;
        },
      );

      // Update stats
      queryClient.setQueryData(nursingKeys.nursingStats(), (old: any) => {
        if (!old) return old;
        return { ...old, vitalsToday: (old.vitalsToday || 0) + 1 };
      });

      return { previousVitals, previousStats, patientId: newVitals.patient_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousVitals) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.vitals() },
          context.previousVitals,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(
          nursingKeys.nursingStats(),
          context.previousStats,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.vitals() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.nursingStats() });
      if (variables.patient_id) {
        queryClient.invalidateQueries({
          queryKey: nursingKeys.patientLatestVitals(variables.patient_id),
        });
      }
      queryClient.invalidateQueries({ queryKey: nursingKeys.criticalVitals() });
    },
  });
}

/**
 * Update vitals record - OPTIMISTIC UPDATE
 */
export function useUpdateVitals() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'vitals:update',
    entityKey: (data) => `vitals:${data.vitals_id}`,
    maxRetries: 4,
    mutationFn: (data: UpdateVitalsDTO) => updateVitals(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.vitals() });

      const previousVitals = queryClient.getQueryData(nursingKeys.vitals());
      const previousDetail = queryClient.getQueryData(
        nursingKeys.vitalsDetail(updateData.vitals_id),
      );

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: nursingKeys.vitals() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((v: any) =>
            v.vitals_id === updateData.vitals_id ? { ...v, ...updateData } : v,
          );
        },
      );

      queryClient.setQueryData(
        nursingKeys.vitalsDetail(updateData.vitals_id),
        (old: any) => {
          if (!old) return old;
          return { ...old, ...updateData };
        },
      );

      return { previousVitals, previousDetail, vitalsId: updateData.vitals_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousVitals) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.vitals() },
          context.previousVitals,
        );
      }
      if (context?.previousDetail && context?.vitalsId) {
        queryClient.setQueryData(
          nursingKeys.vitalsDetail(context.vitalsId),
          context.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, updateData) => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.vitals() });
      queryClient.invalidateQueries({
        queryKey: nursingKeys.vitalsDetail(updateData.vitals_id),
      });
    },
  });
}

/**
 * Delete vitals record - OPTIMISTIC UPDATE
 */
export function useDeleteVitals() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'vitals:delete',
    entityKey: (vitalsId: string) => `vitals:${vitalsId}`,
    maxRetries: 4,
    mutationFn: (vitalsId: string) => deleteVitals(vitalsId),
    onMutate: async (vitalsId) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.vitals() });

      const previousVitals = queryClient.getQueryData(nursingKeys.vitals());
      const previousStats = queryClient.getQueryData(
        nursingKeys.nursingStats(),
      );

      // Optimistically remove
      queryClient.setQueriesData(
        { queryKey: nursingKeys.vitals() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter((v: any) => v.vitals_id !== vitalsId);
        },
      );

      // Update stats
      queryClient.setQueryData(nursingKeys.nursingStats(), (old: any) => {
        if (!old) return old;
        return { ...old, vitalsToday: Math.max(0, (old.vitalsToday || 0) - 1) };
      });

      return { previousVitals, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousVitals) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.vitals() },
          context.previousVitals,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(
          nursingKeys.nursingStats(),
          context.previousStats,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.vitals() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.nursingStats() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.criticalVitals() });
    },
  });
}

// =============================================================================
// NEW QUEUE HOOKS
// =============================================================================

/**
 * Get nursing queue with filters
 */
export function useNursingQueueNew(filters: QueueFilters = {}) {
  return useQuery({
    queryKey: nursingKeys.nursingQueueList(filters),
    queryFn: () => getNursingQueue(filters),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

/**
 * Update queue status - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useUpdateQueueStatus() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:queue:update-status',
    entityKey: ({ queueId }) => `nursing-queue:${queueId}`,
    maxRetries: 4,
    mutationFn: ({ queueId, status }: { queueId: string; status: string }) =>
      updateQueueStatus(queueId, status),
    onMutate: async ({ queueId, status }) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.nursingQueue() });

      const previousQueue = queryClient.getQueryData(
        nursingKeys.nursingQueue(),
      );
      const previousStats = queryClient.getQueryData(
        nursingKeys.nursingStats(),
      );

      // Optimistically update status
      queryClient.setQueriesData(
        { queryKey: nursingKeys.nursingQueue() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((q: any) =>
              q.id === queueId ? { ...q, status } : q,
            );
          }
          return old;
        },
      );

      return { previousQueue, previousStats };
    },
    onError: (_err, _data, context) => {
      if (context?.previousQueue) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.nursingQueue() },
          context.previousQueue,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(
          nursingKeys.nursingStats(),
          context.previousStats,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.nursingQueue() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.nursingStats() });
    },
  });
}

// =============================================================================
// NURSING STATS HOOK
// =============================================================================

/**
 * Get nursing dashboard stats
 */
export function useNursingStatsNew() {
  return useQuery({
    queryKey: nursingKeys.nursingStats(),
    queryFn: getNursingStats,
    retry: false,
    staleTime: 30000,
  });
}

// =============================================================================
// LEGACY Queries (kept for backward compatibility)
// =============================================================================

/**
 * Get nursing care records with filters
 */
export function useNursingCareRecords(filters: NursingCareFilters = {}) {
  return useQuery({
    queryKey: nursingKeys.list(filters),
    queryFn: () => getNursingCareRecords(filters),
    retry: false,
    staleTime: 30000,
  });
}

/**
 * Get a single nursing care record
 */
export function useNursingCareRecord(careId: string | null) {
  return useQuery({
    queryKey: nursingKeys.detail(careId || ''),
    queryFn: () => getNursingCareRecord(careId!),
    enabled: !!careId,
  });
}

/**
 * Get nursing care statistics
 */
export function useNursingCareStats() {
  return useQuery({
    queryKey: nursingKeys.stats(),
    queryFn: getNursingCareStats,
    retry: false, // Don't retry on failure
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Get patient's latest vital signs
 */
export function useLatestVitalSigns(patientId: string | null) {
  return useQuery({
    queryKey: nursingKeys.patientVitals(patientId || ''),
    queryFn: () => getLatestVitalSigns(patientId!),
    enabled: !!patientId,
  });
}

/**
 * Get patient's vital signs history
 */
export function useVitalSignsHistory(
  patientId: string | null,
  days: number = 7,
) {
  return useQuery({
    queryKey: nursingKeys.patientVitalHistory(patientId || '', days),
    queryFn: () => getVitalSignsHistory(patientId!, days),
    enabled: !!patientId,
  });
}

/**
 * Get patients requiring care
 */
export function usePatientsRequiringCare() {
  return useQuery({
    queryKey: nursingKeys.patientsRequiringCare(),
    queryFn: getPatientsRequiringCare,
    retry: false,
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}

/**
 * Get patients waiting in Nursing queue (after payment verification)
 */
export function useNursingQueue() {
  return useQuery({
    queryKey: nursingKeys.queue(),
    queryFn: getNursingQueuePatients,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  });
}

/**
 * Get count of patients waiting in Nursing queue
 */
export function useNursingQueueCount() {
  return useQuery({
    queryKey: nursingKeys.queueCount(),
    queryFn: getNursingQueueCount,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create nursing care record - OPTIMISTIC UPDATE for instant save
 */
export function useCreateNursingCareRecord() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:care:create',
    entityKey: (data) => `patient:${data.patient_id}`,
    maxRetries: 4,
    mutationFn: (data: CreateNursingCareDTO) => createNursingCareRecord(data),
    onMutate: async (newRecord) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.lists() });
      await queryClient.cancelQueries({ queryKey: nursingKeys.stats() });

      const previousLists = queryClient.getQueryData(nursingKeys.lists());
      const previousStats = queryClient.getQueryData(nursingKeys.stats());

      // Optimistically add record with temp ID
      queryClient.setQueriesData(
        { queryKey: nursingKeys.lists() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return [
              {
                ...newRecord,
                care_id: `temp-${Date.now()}`,
                created_at: new Date().toISOString(),
              },
              ...old,
            ];
          }
          return old;
        },
      );

      // Update stats
      queryClient.setQueryData(nursingKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          totalRecords: (old.totalRecords || 0) + 1,
          todayRecords: (old.todayRecords || 0) + 1,
        };
      });

      return { previousLists, previousStats, patientId: newRecord.patient_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(nursingKeys.stats(), context.previousStats);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.stats() });
      if (variables.patient_id) {
        queryClient.invalidateQueries({
          queryKey: nursingKeys.patientVitals(variables.patient_id),
        });
      }
    },
  });
}

/**
 * Update nursing care record - OPTIMISTIC UPDATE
 */
export function useUpdateNursingCareRecord() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:care:update',
    entityKey: (data) => `nursing-care:${data.care_id}`,
    maxRetries: 4,
    mutationFn: (data: UpdateNursingCareDTO) => updateNursingCareRecord(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.lists() });

      const previousLists = queryClient.getQueryData(nursingKeys.lists());
      const previousDetail = queryClient.getQueryData(
        nursingKeys.detail(updateData.care_id),
      );

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: nursingKeys.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((r: any) =>
            r.care_id === updateData.care_id ? { ...r, ...updateData } : r,
          );
        },
      );

      queryClient.setQueryData(
        nursingKeys.detail(updateData.care_id),
        (old: any) => {
          if (!old) return old;
          return { ...old, ...updateData };
        },
      );

      return { previousLists, previousDetail, careId: updateData.care_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousDetail && context?.careId) {
        queryClient.setQueryData(
          nursingKeys.detail(context.careId),
          context.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, updateData) => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: nursingKeys.detail(updateData.care_id),
      });
    },
  });
}

/**
 * Delete nursing care record - OPTIMISTIC UPDATE
 */
export function useDeleteNursingCareRecord() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:care:delete',
    entityKey: (careId: string) => `nursing-care:${careId}`,
    maxRetries: 4,
    mutationFn: (careId: string) => deleteNursingCareRecord(careId),
    onMutate: async (careId) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.lists() });

      const previousLists = queryClient.getQueryData(nursingKeys.lists());
      const previousStats = queryClient.getQueryData(nursingKeys.stats());

      // Optimistically remove
      queryClient.setQueriesData(
        { queryKey: nursingKeys.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter((r: any) => r.care_id !== careId);
        },
      );

      // Update stats
      queryClient.setQueryData(nursingKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          totalRecords: Math.max(0, (old.totalRecords || 0) - 1),
        };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: nursingKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(nursingKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.stats() });
    },
  });
}

// =============================================================================
// Queue Mutations - With Optimistic Updates for Workflow Status
// =============================================================================

/**
 * Call patient from nursing queue - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useCallNursingQueuePatient() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:queue:call',
    entityKey: (queueId: string) => `nursing-queue:${queueId}`,
    maxRetries: 4,
    mutationFn: (queueId: string) => callNursingQueuePatient(queueId),
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.queue() });

      const previousQueue = queryClient.getQueryData(nursingKeys.queue());
      const previousCount = queryClient.getQueryData(nursingKeys.queueCount());

      // Optimistically update status to Called
      queryClient.setQueryData(nursingKeys.queue(), (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((q: any) =>
            q.id === queueId
              ? { ...q, status: 'Called', called_at: new Date().toISOString() }
              : q,
          );
        }
        return old;
      });

      return { previousQueue, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(nursingKeys.queue(), context.previousQueue);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(
          nursingKeys.queueCount(),
          context.previousCount,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.queue() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.queueCount() });
    },
  });
}

/**
 * Start serving a patient - OPTIMISTIC UPDATE (workflow status is safe)
 */
export function useStartServingPatient() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:queue:start',
    entityKey: (queueId: string) => `nursing-queue:${queueId}`,
    maxRetries: 4,
    mutationFn: (queueId: string) => startServingPatient(queueId),
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.queue() });

      const previousQueue = queryClient.getQueryData(nursingKeys.queue());
      const previousCount = queryClient.getQueryData(nursingKeys.queueCount());

      // Optimistically update status to In Progress
      queryClient.setQueryData(nursingKeys.queue(), (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((q: any) =>
            q.id === queueId
              ? {
                  ...q,
                  status: 'In Progress',
                  started_at: new Date().toISOString(),
                }
              : q,
          );
        }
        return old;
      });

      return { previousQueue, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(nursingKeys.queue(), context.previousQueue);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(
          nursingKeys.queueCount(),
          context.previousCount,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.queue() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.queueCount() });
    },
  });
}

/**
 * Complete nursing care and move patient to next station - OPTIMISTIC UPDATE
 */
export function useCompleteNursingQueue() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'nursing:queue:complete',
    entityKey: (queueId: string) => `nursing-queue:${queueId}`,
    maxRetries: 4,
    mutationFn: (queueId: string) => completeNursingQueue(queueId),
    onMutate: async (queueId) => {
      await queryClient.cancelQueries({ queryKey: nursingKeys.queue() });

      const previousQueue = queryClient.getQueryData(nursingKeys.queue());
      const previousCount = queryClient.getQueryData(nursingKeys.queueCount());
      const previousStats = queryClient.getQueryData(nursingKeys.stats());

      // Optimistically mark as Completed and remove from active queue
      queryClient.setQueryData(nursingKeys.queue(), (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((q: any) =>
            q.id === queueId
              ? {
                  ...q,
                  status: 'Completed',
                  completed_at: new Date().toISOString(),
                }
              : q,
          );
        }
        return old;
      });

      // Update count
      queryClient.setQueryData(nursingKeys.queueCount(), (old: any) => {
        if (typeof old === 'number') return Math.max(0, old - 1);
        return old;
      });

      return { previousQueue, previousCount, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(nursingKeys.queue(), context.previousQueue);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(
          nursingKeys.queueCount(),
          context.previousCount,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(nursingKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nursingKeys.queue() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.queueCount() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: nursingKeys.stats() });
    },
  });
}

/**
 * Get patients who have been attended to by a consultant today
 * These patients are eligible for nursing reports
 */
export function useConsultedPatients(
  options: {
    today_only?: boolean;
    search?: string;
    limit?: number;
  } = {},
) {
  return useQuery({
    queryKey: ['nursing', 'consulted-patients', options],
    queryFn: () => getConsultedPatients(options),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

/**
 * Get count of consulted patients today
 */
export function useConsultedPatientsCount(today_only = true) {
  return useQuery({
    queryKey: ['nursing', 'consulted-patients-count', today_only],
    queryFn: () => getConsultedPatientsCount(today_only),
    staleTime: 30000,
  });
}

/**
 * Subscribe to nursing changes for real-time updates
 */
export const useNursingSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('nursing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: nursingKeys.all });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vitals',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: nursingKeys.all });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nursing_care',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: nursingKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

export type { ConsultedPatient };
