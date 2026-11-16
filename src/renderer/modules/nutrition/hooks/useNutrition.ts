/**
 * =============================================================================
 * NUTRITION MODULE - REACT QUERY HOOKS
 * =============================================================================
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNutritionStats,
  getActiveNutritionCarePlans,
  getNutritionCarePlans,
  createNutritionCarePlan,
  updateNutritionCarePlanStatus,
  getNutritionCarePlanSessions,
  createNutritionSession,
  completeNutritionSession,
} from '../api/nutrition.api';
import type { NutritionCarePlanDTO } from '../types/nutrition.types';
import type {
  CompleteSessionDTO,
  CreateSessionDTO,
} from '../../specialty-common/dtos/specialty-clinic.dto';

export const nutritionKeys = {
  all: ['nutrition'] as const,
  stats: () => [...nutritionKeys.all, 'stats'] as const,
  carePlans: () => [...nutritionKeys.all, 'care-plans'] as const,
  activePlans: () => [...nutritionKeys.carePlans(), 'active'] as const,
  patientCarePlans: (patientId: string) =>
    [...nutritionKeys.carePlans(), 'patient', patientId] as const,
  sessions: (planId: string) =>
    [...nutritionKeys.all, 'sessions', planId] as const,
};

function getCarePlanContextFromCache(
  qc: ReturnType<typeof useQueryClient>,
  careplanId: string,
): { patientId?: string; encounterId?: string } {
  const cachedCarePlanQueries = qc.getQueriesData({
    queryKey: nutritionKeys.carePlans(),
  });

  for (const [, queryData] of cachedCarePlanQueries) {
    if (!Array.isArray(queryData)) continue;
    const matchingPlan = queryData.find((plan: any) => plan?.id === careplanId);
    if (matchingPlan) {
      return {
        patientId: matchingPlan.patient_id,
        encounterId: matchingPlan.encounter_id,
      };
    }
  }

  return {};
}

function invalidateClinicalContext(
  qc: ReturnType<typeof useQueryClient>,
  context: { patientId?: string; encounterId?: string },
) {
  const invalidations: Array<Promise<unknown>> = [];

  if (context.patientId) {
    invalidations.push(
      qc.invalidateQueries({ queryKey: ['patientHistory', context.patientId] }),
    );
  }

  if (context.encounterId) {
    invalidations.push(
      qc.invalidateQueries({
        queryKey: ['clinical-timeline', context.encounterId],
      }),
    );
  }

  if (invalidations.length > 0) {
    void Promise.all(invalidations);
  }
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

export function useNutritionStats() {
  return useQuery({
    queryKey: nutritionKeys.stats(),
    queryFn: getNutritionStats,
    staleTime: 1000 * 60 * 5,
  });
}

// -----------------------------------------------------------------------------
// Care plans
// -----------------------------------------------------------------------------

export function useAllNutritionCarePlans() {
  return useQuery({
    queryKey: [...nutritionKeys.carePlans(), 'all'],
    queryFn: () => getNutritionCarePlans(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useActiveNutritionCarePlans() {
  return useQuery({
    queryKey: nutritionKeys.activePlans(),
    queryFn: getActiveNutritionCarePlans,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePatientNutritionCarePlans(patientId: string | undefined) {
  return useQuery({
    queryKey: nutritionKeys.patientCarePlans(patientId || ''),
    queryFn: () => getNutritionCarePlans(patientId),
    enabled: !!patientId,
  });
}

export function useCreateNutritionCarePlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: NutritionCarePlanDTO) => createNutritionCarePlan(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: nutritionKeys.activePlans() });
      qc.invalidateQueries({
        queryKey: nutritionKeys.patientCarePlans(data.patient_id),
      });
      qc.invalidateQueries({ queryKey: nutritionKeys.stats() });
      invalidateClinicalContext(qc, {
        patientId: data.patient_id,
        encounterId: data.encounter_id,
      });
    },
  });
}

export function useUpdateNutritionCarePlanStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      status,
    }: {
      planId: string;
      status: 'Active' | 'Completed' | 'Cancelled' | 'On_Hold';
    }) => updateNutritionCarePlanStatus(planId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nutritionKeys.carePlans() });
      qc.invalidateQueries({ queryKey: nutritionKeys.stats() });
    },
  });
}

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------

export function useNutritionCarePlanSessions(planId: string | undefined) {
  return useQuery({
    queryKey: nutritionKeys.sessions(planId || ''),
    queryFn: () => getNutritionCarePlanSessions(planId!),
    enabled: !!planId,
  });
}

export function useCreateNutritionSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateSessionDTO) => createNutritionSession(dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({
        queryKey: nutritionKeys.sessions(dto.careplan_id),
      });
      qc.invalidateQueries({ queryKey: nutritionKeys.carePlans() });
      qc.invalidateQueries({ queryKey: nutritionKeys.stats() });

      const carePlanContext = getCarePlanContextFromCache(qc, dto.careplan_id);
      invalidateClinicalContext(qc, carePlanContext);
    },
  });
}

export function useCompleteNutritionSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      careplan_id: _careplanId,
      ...dto
    }: Omit<CompleteSessionDTO, 'recorded_by'> & {
      sessionId: string;
      careplan_id: string;
    }) => completeNutritionSession(sessionId, dto as CompleteSessionDTO),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: nutritionKeys.sessions(vars.careplan_id),
      });
      qc.invalidateQueries({ queryKey: nutritionKeys.carePlans() });
      qc.invalidateQueries({ queryKey: nutritionKeys.stats() });

      const carePlanContext = getCarePlanContextFromCache(qc, vars.careplan_id);
      invalidateClinicalContext(qc, carePlanContext);
    },
  });
}
