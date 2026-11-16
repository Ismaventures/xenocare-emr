/**
 * =============================================================================
 * XENOCARE EMR - ENCOUNTER MODULE HOOKS
 * Description: React Query hooks for encounters and clinics
 * =============================================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  encounterApi,
  getEncounterClinicalData,
  EncounterClinicalData,
  getDiagnosisFilterOptions,
  getChiefComplaintFilterOptions,
  getCourseFilterOptions,
} from '../api/encounter.api';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  EncounterFilters,
  CreateEncounterDTO,
  UpdateEncounterDTO,
  ClinicFilters,
  CreateClinicDTO,
  UpdateClinicDTO,
} from '../dtos/encounter.dto';

// =============================================================================
// CLINICAL DATA HOOKS (FOR REPORTS)
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
    backgroundScope = 'encounter:write',
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
// QUERY KEYS
// =============================================================================

export const encounterKeys = {
  all: ['encounters'] as const,
  lists: () => [...encounterKeys.all, 'list'] as const,
  list: (filters: EncounterFilters) =>
    [...encounterKeys.lists(), filters] as const,
  details: () => [...encounterKeys.all, 'detail'] as const,
  detail: (id: string) => [...encounterKeys.details(), id] as const,
  stats: () => [...encounterKeys.all, 'stats'] as const,
  patient: (patientId: string) =>
    [...encounterKeys.all, 'patient', patientId] as const,
  today: () => [...encounterKeys.all, 'today'] as const,
};

export const clinicKeys = {
  all: ['clinics'] as const,
  lists: () => [...clinicKeys.all, 'list'] as const,
  list: (filters: ClinicFilters) => [...clinicKeys.lists(), filters] as const,
  active: () => [...clinicKeys.all, 'active'] as const,
  details: () => [...clinicKeys.all, 'detail'] as const,
  detail: (id: string) => [...clinicKeys.details(), id] as const,
};

// =============================================================================
// ENCOUNTER HOOKS
// =============================================================================

/**
 * Hook to fetch encounters with optional filters
 */
export function useEncounters(filters: EncounterFilters = {}) {
  return useQuery({
    queryKey: encounterKeys.list(filters),
    queryFn: () => encounterApi.getEncounters(filters),
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to fetch single encounter by ID
 */
export function useEncounter(visitId: string | undefined) {
  return useQuery({
    queryKey: encounterKeys.detail(visitId || ''),
    queryFn: () => encounterApi.getEncounterById(visitId!),
    enabled: !!visitId,
  });
}

/**
 * Hook to fetch encounter statistics
 */
export function useEncounterStats() {
  return useQuery({
    queryKey: encounterKeys.stats(),
    queryFn: () => encounterApi.getEncounterStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch patient encounters history
 */
export function usePatientEncounters(patientId: string | undefined) {
  return useQuery({
    queryKey: encounterKeys.patient(patientId || ''),
    queryFn: () => encounterApi.getPatientEncounters(patientId!),
    enabled: !!patientId,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to fetch today's encounters
 */
export function useTodaysEncounters() {
  return useQuery({
    queryKey: encounterKeys.today(),
    queryFn: () => encounterApi.getTodaysEncounters(),
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to create new encounter - with OPTIMISTIC UPDATE
 * @deprecated Use useCreateEncounter from lib/workflow instead for proper workflow integration
 * This version is kept for backward compatibility but should not be used for new code.
 * The workflow version handles:
 * - Stage transitions (current_stage)
 * - Auto-routing to queue
 * - Stage transition logging
 * - Billing order creation for consultation fees
 */
export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'encounter:create:module',
    entityKey: (encounter) => `patient:${encounter.patient_id}`,
    maxRetries: 4,
    mutationFn: (encounter: CreateEncounterDTO) =>
      encounterApi.createEncounter(encounter),

    // OPTIMISTIC UPDATE - Update stats instantly
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: encounterKeys.stats() });

      const previousStats = queryClient.getQueryData(encounterKeys.stats());

      // Optimistically increment stats
      queryClient.setQueryData(encounterKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: (old.total || 0) + 1,
          active: (old.active || 0) + 1,
          today: (old.today || 0) + 1,
          todayCount: (old.todayCount || 0) + 1,
        };
      });

      return { previousStats };
    },

    onError: (_err, _dto, context) => {
      if (context?.previousStats) {
        queryClient.setQueryData(encounterKeys.stats(), context.previousStats);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    },
  });
}

/**
 * Hook to update encounter - OPTIMISTIC UPDATE
 */
export function useUpdateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (encounter: UpdateEncounterDTO) =>
      encounterApi.updateEncounter(encounter),
    onMutate: async (encounter) => {
      await queryClient.cancelQueries({
        queryKey: encounterKeys.detail(encounter.visit_id),
      });

      const previousEncounter = queryClient.getQueryData(
        encounterKeys.detail(encounter.visit_id),
      );

      // Optimistically update the encounter
      queryClient.setQueryData(
        encounterKeys.detail(encounter.visit_id),
        (old: any) => {
          if (!old) return old;
          return { ...old, ...encounter };
        },
      );

      return { previousEncounter, visitId: encounter.visit_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousEncounter && context?.visitId) {
        queryClient.setQueryData(
          encounterKeys.detail(context.visitId),
          context.previousEncounter,
        );
      }
    },
    onSettled: (_data, _err, encounter) => {
      queryClient.invalidateQueries({
        queryKey: encounterKeys.detail(encounter.visit_id),
      });
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: encounterKeys.stats() });
    },
  });
}

/**
 * Hook to update encounter status - OPTIMISTIC UPDATE
 */
export function useUpdateEncounterStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, status }: { visitId: string; status: string }) =>
      encounterApi.updateEncounterStatus(visitId, status),
    onMutate: async ({ visitId, status }) => {
      await queryClient.cancelQueries({
        queryKey: encounterKeys.detail(visitId),
      });
      await queryClient.cancelQueries({ queryKey: encounterKeys.lists() });

      const previousEncounter = queryClient.getQueryData(
        encounterKeys.detail(visitId),
      );
      const previousLists = queryClient.getQueryData(encounterKeys.lists());

      // Optimistically update status
      queryClient.setQueryData(encounterKeys.detail(visitId), (old: any) => {
        if (!old) return old;
        return { ...old, status };
      });

      queryClient.setQueriesData(
        { queryKey: encounterKeys.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((enc: any) =>
            enc.visit_id === visitId ? { ...enc, status } : enc,
          );
        },
      );

      return { previousEncounter, previousLists, visitId };
    },
    onError: (_err, _data, context) => {
      if (context?.previousEncounter && context?.visitId) {
        queryClient.setQueryData(
          encounterKeys.detail(context.visitId),
          context.previousEncounter,
        );
      }
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: encounterKeys.lists() },
          context.previousLists,
        );
      }
    },
    onSettled: (_data, _err, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: encounterKeys.detail(visitId),
      });
      queryClient.invalidateQueries({ queryKey: encounterKeys.lists() });
      queryClient.invalidateQueries({ queryKey: encounterKeys.stats() });
      queryClient.invalidateQueries({ queryKey: encounterKeys.today() });
    },
  });
}

/**
 * Hook to delete (cancel) encounter - OPTIMISTIC UPDATE
 */
export function useDeleteEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visitId: string) => encounterApi.deleteEncounter(visitId),
    onMutate: async (visitId) => {
      await queryClient.cancelQueries({ queryKey: encounterKeys.all });

      const previousLists = queryClient.getQueryData(encounterKeys.lists());
      const previousStats = queryClient.getQueryData(encounterKeys.stats());

      // Optimistically remove from lists
      queryClient.setQueriesData(
        { queryKey: encounterKeys.lists() },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter((enc: any) => enc.visit_id !== visitId);
        },
      );

      // Update stats
      queryClient.setQueryData(encounterKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: Math.max(0, (old.total || 0) - 1),
          active: Math.max(0, (old.active || 0) - 1),
        };
      });

      return { previousLists, previousStats };
    },
    onError: (_err, _visitId, context) => {
      if (context?.previousLists) {
        queryClient.setQueriesData(
          { queryKey: encounterKeys.lists() },
          context.previousLists,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(encounterKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    },
  });
}

// =============================================================================
// CLINIC HOOKS
// =============================================================================

/**
 * Hook to fetch clinics with optional filters
 */
export function useClinics(filters: ClinicFilters = {}) {
  return useQuery({
    queryKey: clinicKeys.list(filters),
    queryFn: () => encounterApi.getClinics(filters),
  });
}

/**
 * Hook to fetch active clinics only
 */
export function useActiveClinics() {
  return useQuery({
    queryKey: clinicKeys.active(),
    queryFn: () => encounterApi.getActiveClinics(),
  });
}

/**
 * Hook to fetch single clinic by ID
 */
export function useClinic(clinicId: string | undefined) {
  return useQuery({
    queryKey: clinicKeys.detail(clinicId || ''),
    queryFn: () => encounterApi.getClinicById(clinicId!),
    enabled: !!clinicId,
  });
}

/**
 * Hook to create new clinic
 */
export function useCreateClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clinic: CreateClinicDTO) => encounterApi.createClinic(clinic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}

/**
 * Hook to update clinic
 */
export function useUpdateClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clinic: UpdateClinicDTO) => encounterApi.updateClinic(clinic),
    onSuccess: (data) => {
      queryClient.setQueryData(clinicKeys.detail(data.clinic_id), data);
      queryClient.invalidateQueries({ queryKey: clinicKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clinicKeys.active() });
    },
  });
}

/**
 * Hook to toggle clinic status
 */
export function useToggleClinicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clinicId,
      isActive,
    }: {
      clinicId: string;
      isActive: boolean;
    }) => encounterApi.toggleClinicStatus(clinicId, isActive),
    onSuccess: (data) => {
      queryClient.setQueryData(clinicKeys.detail(data.clinic_id), data);
      queryClient.invalidateQueries({ queryKey: clinicKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clinicKeys.active() });
    },
  });
}

/**
 * Hook to delete clinic
 */
export function useDeleteClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clinicId: string) => encounterApi.deleteClinic(clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicKeys.all });
    },
  });
}

/**
 * Hook to fetch comprehensive clinical data for an encounter report
 */
export function useEncounterClinicalData(encounterId: string | null) {
  return useQuery({
    queryKey: [...encounterKeys.detail(encounterId || ''), 'clinical-data'],
    queryFn: () => getEncounterClinicalData(encounterId!),
    enabled: !!encounterId,
    staleTime: 30000, // 30 seconds
  });
}

// =============================================================================
// FILTER OPTIONS HOOKS
// =============================================================================

export const filterOptionsKeys = {
  all: ['filterOptions'] as const,
  diagnoses: () => [...filterOptionsKeys.all, 'diagnoses'] as const,
  chiefComplaints: () => [...filterOptionsKeys.all, 'chiefComplaints'] as const,
  courses: () => [...filterOptionsKeys.all, 'courses'] as const,
};

/**
 * Hook to fetch diagnoses for filter dropdown
 */
export function useDiagnosisFilterOptions(limit: number = 50) {
  return useQuery({
    queryKey: filterOptionsKeys.diagnoses(),
    queryFn: () => getDiagnosisFilterOptions(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes - diagnoses don't change often
  });
}

/**
 * Hook to fetch chief complaints for filter dropdown
 */
export function useChiefComplaintFilterOptions() {
  return useQuery({
    queryKey: filterOptionsKeys.chiefComplaints(),
    queryFn: () => getChiefComplaintFilterOptions(),
    staleTime: 1000 * 60 * 30, // 30 minutes - catalogue rarely changes
  });
}

/**
 * Hook to fetch courses for filter dropdown
 */
export function useCourseFilterOptions() {
  return useQuery({
    queryKey: filterOptionsKeys.courses(),
    queryFn: () => getCourseFilterOptions(),
    staleTime: 1000 * 60 * 30, // 30 minutes - courses rarely change
  });
}
/**
 * ICD-10 Chapter categories for filtering
 */
export const ICD10_CATEGORIES = [
  { code: 'A-B', name: 'Infectious and Parasitic Diseases', range: 'A00-B99' },
  { code: 'C', name: 'Neoplasms', range: 'C00-D49' },
  { code: 'D', name: 'Blood & Immune Disorders', range: 'D50-D89' },
  { code: 'E', name: 'Endocrine, Nutritional & Metabolic', range: 'E00-E89' },
  { code: 'F', name: 'Mental & Behavioral Disorders', range: 'F01-F99' },
  { code: 'G', name: 'Nervous System Diseases', range: 'G00-G99' },
  { code: 'H00-H59', name: 'Eye & Adnexa Diseases', range: 'H00-H59' },
  { code: 'H60-H95', name: 'Ear & Mastoid Diseases', range: 'H60-H95' },
  { code: 'I', name: 'Circulatory System Diseases', range: 'I00-I99' },
  { code: 'J', name: 'Respiratory System Diseases', range: 'J00-J99' },
  { code: 'K', name: 'Digestive System Diseases', range: 'K00-K95' },
  { code: 'L', name: 'Skin & Subcutaneous Diseases', range: 'L00-L99' },
  { code: 'M', name: 'Musculoskeletal & Connective Tissue', range: 'M00-M99' },
  { code: 'N', name: 'Genitourinary System Diseases', range: 'N00-N99' },
  { code: 'O', name: 'Pregnancy & Childbirth', range: 'O00-O9A' },
  { code: 'P', name: 'Perinatal Conditions', range: 'P00-P96' },
  { code: 'Q', name: 'Congenital Malformations', range: 'Q00-Q99' },
  { code: 'R', name: 'Symptoms & Abnormal Findings', range: 'R00-R99' },
  { code: 'S-T', name: 'Injury & Poisoning', range: 'S00-T88' },
  { code: 'V-Y', name: 'External Causes', range: 'V00-Y99' },
  { code: 'Z', name: 'Health Status Factors', range: 'Z00-Z99' },
];
