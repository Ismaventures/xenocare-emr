import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../../api/supabaseClient';
import * as api from '../api/patient.api';
import {
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientSearchParams,
} from '../dtos/patient.dto';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';

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
    backgroundScope = 'patients:write',
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

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: PatientSearchParams) =>
    [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  stats: () => [...patientKeys.all, 'stats'] as const,
  search: (query: string) => [...patientKeys.all, 'search', query] as const,
  dependents: (principalId: string) =>
    [...patientKeys.all, 'dependents', principalId] as const,
};

// =============================================================================
// Get Patients (with search/filter/pagination)
// =============================================================================

export const usePatients = (params?: PatientSearchParams) => {
  return useQuery({
    queryKey: patientKeys.list(params || {}),
    queryFn: () => api.getPatients(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// =============================================================================
// Get All Patients (Simple list for dropdowns)
// =============================================================================

export const useAllPatients = () => {
  return useQuery({
    queryKey: patientKeys.lists(),
    queryFn: api.getAllPatients,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
};

// =============================================================================
// Get Single Patient
// =============================================================================

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => api.getPatientById(id),
    enabled: !!id,
  });
};

// =============================================================================
// Dependents for a principal
// =============================================================================

export const useDependentsByPrincipal = (principalId: string | null) => {
  return useQuery({
    queryKey: patientKeys.dependents(principalId || ''),
    queryFn: () => api.getDependentsByPrincipal(principalId!),
    enabled: !!principalId,
    staleTime: 1000 * 30,
  });
};

// =============================================================================
// Search Patients (for autocomplete)
// Supports flexible search: name, phone, EMR (full/partial), service number
// =============================================================================

export const usePatientSearch = (query: string) => {
  return useQuery({
    queryKey: patientKeys.search(query),
    queryFn: () => api.searchPatients(query),
    enabled: query.trim().length >= 1, // Allow single character search
    staleTime: 1000 * 30, // 30 seconds
  });
};

// =============================================================================
// Get Patient Statistics
// =============================================================================

export const usePatientStats = () => {
  return useQuery({
    queryKey: patientKeys.stats(),
    queryFn: api.getPatientStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// =============================================================================
// Create Patient - OPTIMISTIC UPDATE for instant save feel
// =============================================================================

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPatient: CreatePatientDTO) => api.createPatient(newPatient),
    onMutate: async (newPatient) => {
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });
      await queryClient.cancelQueries({ queryKey: patientKeys.stats() });

      const previousListSnapshots = queryClient.getQueriesData({
        queryKey: patientKeys.lists(),
      });
      const previousStats = queryClient.getQueryData(patientKeys.stats());

      // Optimistically add patient with temp ID
      queryClient.setQueriesData(
        { queryKey: patientKeys.lists() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return [
              {
                ...newPatient,
                patient_id: `temp-${Date.now()}`,
                created_at: new Date().toISOString(),
              },
              ...old,
            ];
          }
          return old;
        },
      );

      // Update stats
      queryClient.setQueryData(patientKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: (old.total || 0) + 1,
          today: (old.today || 0) + 1,
        };
      });

      return { previousListSnapshots, previousStats };
    },
    onError: (_err, _data, context) => {
      if (context?.previousListSnapshots) {
        context.previousListSnapshots.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      if (context?.previousStats) {
        queryClient.setQueryData(patientKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
    },
  });
};

// =============================================================================
// Update Patient - OPTIMISTIC UPDATE
// =============================================================================

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedPatient: UpdatePatientDTO) =>
      api.updatePatient(updatedPatient),
    onMutate: async (updatedPatient) => {
      await queryClient.cancelQueries({
        queryKey: patientKeys.detail(updatedPatient.patient_id),
      });

      const previousPatient = queryClient.getQueryData(
        patientKeys.detail(updatedPatient.patient_id),
      );
      const previousLists = queryClient.getQueryData(patientKeys.lists());

      // Optimistically update
      queryClient.setQueryData(
        patientKeys.detail(updatedPatient.patient_id),
        (old: any) => {
          if (!old) return old;
          return { ...old, ...updatedPatient };
        },
      );

      queryClient.setQueriesData(
        { queryKey: patientKeys.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((p: any) =>
            p.patient_id === updatedPatient.patient_id
              ? { ...p, ...updatedPatient }
              : p,
          );
        },
      );

      return {
        previousPatient,
        previousLists,
        patientId: updatedPatient.patient_id,
      };
    },
    onError: (_err, _data, context) => {
      if (context?.previousPatient && context?.patientId) {
        queryClient.setQueryData(
          patientKeys.detail(context.patientId),
          context.previousPatient,
        );
      }
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: patientKeys.lists() },
          context.previousLists,
        );
      }
    },
    onSettled: (_data, _err, updatedPatient) => {
      queryClient.invalidateQueries({
        queryKey: patientKeys.detail(updatedPatient.patient_id),
      });
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      // Also invalidate all search queries since patient data changed
      queryClient.invalidateQueries({
        queryKey: [...patientKeys.all, 'search'],
      });
    },
  });
};

// =============================================================================
// Delete Patient (Soft Delete) - OPTIMISTIC UPDATE
// =============================================================================

export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deletePatient(id),
    onMutate: async (patientId) => {
      await queryClient.cancelQueries({ queryKey: patientKeys.lists() });

      const previousLists = queryClient.getQueryData(patientKeys.lists());
      const previousStats = queryClient.getQueryData(patientKeys.stats());

      // Optimistically remove from lists
      queryClient.setQueriesData(
        { queryKey: patientKeys.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter((p: any) => p.patient_id !== patientId);
        },
      );

      // Update stats
      queryClient.setQueryData(patientKeys.stats(), (old: any) => {
        if (!old) return old;
        return { ...old, total: Math.max(0, (old.total || 0) - 1) };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: patientKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(patientKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.stats() });
    },
  });
};

// =============================================================================
// Get Payer Schemes
// =============================================================================

export const usePayerSchemes = () => {
  return useQuery({
    queryKey: ['payer_schemes'],
    queryFn: api.getPayerSchemes,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Subscribe to patient changes for real-time updates
 */
export const usePatientSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('patient-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: patientKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
