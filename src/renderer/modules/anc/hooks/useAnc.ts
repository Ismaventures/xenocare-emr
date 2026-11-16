// =============================================================================
// ANC Module — React Query Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { getVisibilityAwareRefetchInterval } from '../../../lib/query/polling';
import { scheduleQueryInvalidations } from '../../../lib/query/invalidation';
import {
  getActivePregnancies,
  getAllPregnancies,
  getPregnancyEpisode,
  getActivePregnancyByPatient,
  createPregnancyEpisode,
  updatePregnancyEpisode,
  getAncVisits,
  getAncVisit,
  getAncVisitByEncounter,
  createAncVisit,
  updateAncVisit,
  completeAncVisit,
  getObservationsForVisit,
  getObservationsForPregnancy,
  createObservation,
  getRiskFlags,
  getActiveRiskFlags,
  createRiskFlag,
  resolveRiskFlag,
  getPregnancyOutcome,
  createPregnancyOutcome,
  createAncEncounterAndVisit,
  saveAncDoctorReview,
  getAncDashboardStats,
  getTodayAncSchedule,
  getAncEncounterLabRequests,
  getAncEncounterRadiologyRequests,
  getAncEncounterPrescriptions,
} from '../api/anc.api';
import type {
  PregnancyEpisodeFormDTO,
  AncObservationFormDTO,
  AncDoctorReviewFormDTO,
  DeliveryOutcomeFormDTO,
  AncRiskFlagFormDTO,
} from '../dtos/anc.dto';
import type { PregnancyEpisode } from '../api/anc.types';

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
    backgroundScope = 'anc:write',
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

export const ANC_KEYS = {
  all: ['anc'] as const,
  dashboard: () => [...ANC_KEYS.all, 'dashboard'] as const,
  stats: () => [...ANC_KEYS.all, 'stats'] as const,
  todaySchedule: () => [...ANC_KEYS.all, 'today-schedule'] as const,
  // Pregnancy episodes
  pregnancies: () => [...ANC_KEYS.all, 'pregnancies'] as const,
  activePregnancies: () => [...ANC_KEYS.pregnancies(), 'active'] as const,
  patientPregnancies: (patientId: string) =>
    [...ANC_KEYS.pregnancies(), 'patient', patientId] as const,
  pregnancy: (id: string) => [...ANC_KEYS.pregnancies(), id] as const,
  activePregnancy: (patientId: string) =>
    [...ANC_KEYS.pregnancies(), 'active', patientId] as const,
  // Visits
  visits: (episodeId: string) =>
    [...ANC_KEYS.all, 'visits', episodeId] as const,
  visit: (visitId: string) => [...ANC_KEYS.all, 'visit', visitId] as const,
  visitByEncounter: (encounterId: string) =>
    [...ANC_KEYS.all, 'visit-encounter', encounterId] as const,
  // Observations
  observations: (visitId: string) => [...ANC_KEYS.all, 'obs', visitId] as const,
  pregnancyObservations: (episodeId: string) =>
    [...ANC_KEYS.all, 'obs-pregnancy', episodeId] as const,
  // Risk flags
  riskFlags: (episodeId: string) =>
    [...ANC_KEYS.all, 'risks', episodeId] as const,
  activeRisks: (episodeId: string) =>
    [...ANC_KEYS.all, 'risks-active', episodeId] as const,
  // Outcome
  outcome: (episodeId: string) =>
    [...ANC_KEYS.all, 'outcome', episodeId] as const,
  // Encounter orders
  labs: (encounterId: string) =>
    [...ANC_KEYS.all, 'labs', encounterId] as const,
  radiology: (encounterId: string) =>
    [...ANC_KEYS.all, 'radiology', encounterId] as const,
  prescriptions: (encounterId: string) =>
    [...ANC_KEYS.all, 'prescriptions', encounterId] as const,
};

// =============================================================================
// Dashboard / List Hooks
// =============================================================================

export function useAncDashboardStats() {
  return useQuery({
    queryKey: ANC_KEYS.stats(),
    queryFn: getAncDashboardStats,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30_000),
  });
}

export function useTodayAncSchedule() {
  return useQuery({
    queryKey: ANC_KEYS.todaySchedule(),
    queryFn: getTodayAncSchedule,
    refetchInterval: () => getVisibilityAwareRefetchInterval(15_000),
  });
}

export function useActivePregnancies() {
  return useQuery({
    queryKey: ANC_KEYS.activePregnancies(),
    queryFn: getActivePregnancies,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30_000),
  });
}

// =============================================================================
// Pregnancy Episode Hooks
// =============================================================================

export function usePatientPregnancies(patientId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.patientPregnancies(patientId || ''),
    queryFn: () => getAllPregnancies(patientId!),
    enabled: !!patientId,
  });
}

export function usePregnancyEpisode(episodeId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.pregnancy(episodeId || ''),
    queryFn: () => getPregnancyEpisode(episodeId!),
    enabled: !!episodeId,
  });
}

export function useActivePregnancy(patientId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.activePregnancy(patientId || ''),
    queryFn: () => getActivePregnancyByPatient(patientId!),
    enabled: !!patientId,
  });
}

export function useCreatePregnancy() {
  const qc = useQueryClient();
  return useMutation({
    optimisticUpdates: (dto) => {
      const tempId = `temp-anc-preg-${Date.now()}`;
      const optimistic = {
        id: tempId,
        patient_id: dto.patient_id,
        status: 'active',
        lmp: dto.lmp,
        risk_level: dto.risk_level,
        is_optimistic: true,
        created_at: new Date().toISOString(),
      };

      return [
        {
          queryKey: ANC_KEYS.activePregnancies(),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
        {
          queryKey: ANC_KEYS.patientPregnancies(dto.patient_id),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
      ];
    },
    mutationFn: (dto: PregnancyEpisodeFormDTO) => createPregnancyEpisode(dto),
    onSuccess: (_data, dto: PregnancyEpisodeFormDTO) => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.activePregnancies(),
        ANC_KEYS.patientPregnancies(dto.patient_id),
        ANC_KEYS.activePregnancy(dto.patient_id),
        ANC_KEYS.stats(),
      ]);
    },
  });
}

export function useUpdatePregnancy() {
  const qc = useQueryClient();
  return useMutation({
    optimisticUpdates: ({ episodeId, updates }) => [
      {
        queryKey: ANC_KEYS.pregnancy(episodeId),
        updater: (prev) => {
          if (!prev || typeof prev !== 'object') return prev;
          return {
            ...(prev as Record<string, unknown>),
            ...updates,
            updated_at: new Date().toISOString(),
          };
        },
      },
    ],
    mutationFn: ({
      episodeId,
      updates,
    }: {
      episodeId: string;
      updates: Partial<PregnancyEpisode>;
    }) => updatePregnancyEpisode(episodeId, updates),
    onSuccess: () => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.pregnancies(),
        ANC_KEYS.stats(),
      ]);
    },
  });
}

// =============================================================================
// ANC Visit Hooks
// =============================================================================

export function useAncVisits(episodeId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.visits(episodeId || ''),
    queryFn: () => getAncVisits(episodeId!),
    enabled: !!episodeId,
  });
}

export function useAncVisit(visitId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.visit(visitId || ''),
    queryFn: () => getAncVisit(visitId!),
    enabled: !!visitId,
  });
}

export function useAncVisitByEncounter(encounterId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.visitByEncounter(encounterId || ''),
    queryFn: () => getAncVisitByEncounter(encounterId!),
    enabled: !!encounterId,
  });
}

export function useCreateAncEncounterAndVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAncEncounterAndVisit,
    onSuccess: (_data, params: any) => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.visits(params.pregnancy_episode_id),
        ANC_KEYS.todaySchedule(),
        ANC_KEYS.stats(),
      ]);
    },
  });
}

export function useCompleteAncVisit() {
  const qc = useQueryClient();
  return useMutation({
    optimisticUpdates: (visitId) => [
      {
        queryKey: ANC_KEYS.visit(visitId),
        updater: (prev) => {
          if (!prev || typeof prev !== 'object') return prev;
          return {
            ...(prev as Record<string, unknown>),
            visit_status: 'completed',
            updated_at: new Date().toISOString(),
          };
        },
      },
    ],
    mutationFn: (visitId: string) => completeAncVisit(visitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ANC_KEYS.all });
    },
  });
}

// =============================================================================
// Observation Hooks
// =============================================================================

export function useAncObservations(visitId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.observations(visitId || ''),
    queryFn: () => getObservationsForVisit(visitId!),
    enabled: !!visitId,
  });
}

export function usePregnancyObservations(episodeId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.pregnancyObservations(episodeId || ''),
    queryFn: () => getObservationsForPregnancy(episodeId!),
    enabled: !!episodeId,
  });
}

export function useCreateObservation() {
  const qc = useQueryClient();
  return useMutation({
    optimisticUpdates: (dto) => {
      const optimistic = {
        id: `temp-anc-obs-${Date.now()}`,
        anc_visit_id: dto.anc_visit_id,
        pregnancy_episode_id: dto.pregnancy_episode_id,
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };

      return [
        {
          queryKey: ANC_KEYS.observations(dto.anc_visit_id),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
        {
          queryKey: ANC_KEYS.pregnancyObservations(dto.pregnancy_episode_id),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
      ];
    },
    mutationFn: (dto: AncObservationFormDTO) => createObservation(dto),
    onSuccess: (_data, dto: AncObservationFormDTO) => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.observations(dto.anc_visit_id),
        ANC_KEYS.pregnancyObservations(dto.pregnancy_episode_id),
        ANC_KEYS.visit(dto.anc_visit_id),
      ]);
    },
  });
}

// =============================================================================
// Risk Flag Hooks
// =============================================================================

export function useRiskFlags(episodeId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.riskFlags(episodeId || ''),
    queryFn: () => getRiskFlags(episodeId!),
    enabled: !!episodeId,
  });
}

export function useActiveRiskFlags(episodeId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.activeRisks(episodeId || ''),
    queryFn: () => getActiveRiskFlags(episodeId!),
    enabled: !!episodeId,
  });
}

export function useCreateRiskFlag() {
  const qc = useQueryClient();
  return useMutation({
    optimisticUpdates: (dto) => {
      const optimistic = {
        id: `temp-anc-risk-${Date.now()}`,
        pregnancy_episode_id: dto.pregnancy_episode_id,
        active: true,
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };

      return [
        {
          queryKey: ANC_KEYS.riskFlags(dto.pregnancy_episode_id),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
        {
          queryKey: ANC_KEYS.activeRisks(dto.pregnancy_episode_id),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
      ];
    },
    mutationFn: (dto: AncRiskFlagFormDTO) => createRiskFlag(dto),
    onSuccess: (_data, dto: AncRiskFlagFormDTO) => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.riskFlags(dto.pregnancy_episode_id),
        ANC_KEYS.activeRisks(dto.pregnancy_episode_id),
        ANC_KEYS.pregnancy(dto.pregnancy_episode_id),
        ANC_KEYS.stats(),
      ]);
    },
  });
}

export function useResolveRiskFlag(episodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (flagId: string) => resolveRiskFlag(flagId),
    onSuccess: () => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.riskFlags(episodeId),
        ANC_KEYS.activeRisks(episodeId),
      ]);
    },
  });
}

// =============================================================================
// Pregnancy Outcome Hooks
// =============================================================================

export function usePregnancyOutcome(episodeId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.outcome(episodeId || ''),
    queryFn: () => getPregnancyOutcome(episodeId!),
    enabled: !!episodeId,
  });
}

export function useCreateOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: DeliveryOutcomeFormDTO) => createPregnancyOutcome(dto),
    onSuccess: (_data, dto: DeliveryOutcomeFormDTO) => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.outcome(dto.pregnancy_episode_id),
        ANC_KEYS.pregnancy(dto.pregnancy_episode_id),
        ANC_KEYS.activePregnancies(),
        ANC_KEYS.stats(),
      ]);
    },
  });
}

// =============================================================================
// Doctor Review Hook
// =============================================================================

export function useSaveAncDoctorReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AncDoctorReviewFormDTO) => saveAncDoctorReview(dto),
    onSuccess: (_data, dto: AncDoctorReviewFormDTO) => {
      scheduleQueryInvalidations(qc, [
        ANC_KEYS.visit(dto.anc_visit_id),
        ANC_KEYS.pregnancy(dto.pregnancy_episode_id),
        ANC_KEYS.todaySchedule(),
      ]);
    },
  });
}

// =============================================================================
// Encounter Order Hooks (Lab, Radiology, Prescriptions)
// =============================================================================

export function useAncLabRequests(encounterId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.labs(encounterId || ''),
    queryFn: () => getAncEncounterLabRequests(encounterId!),
    enabled: !!encounterId,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30_000),
  });
}

export function useAncRadiologyRequests(encounterId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.radiology(encounterId || ''),
    queryFn: () => getAncEncounterRadiologyRequests(encounterId!),
    enabled: !!encounterId,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30_000),
  });
}

export function useAncPrescriptions(encounterId: string | undefined) {
  return useQuery({
    queryKey: ANC_KEYS.prescriptions(encounterId || ''),
    queryFn: () => getAncEncounterPrescriptions(encounterId!),
    enabled: !!encounterId,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30_000),
  });
}
