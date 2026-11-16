/**
 * =============================================================================
 * SPECIALTY CLINIC HOOKS
 * =============================================================================
 * React Query hooks for triage, order sets, care plans, and sessions.
 * =============================================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getTriageConfigs,
  getTriageObservations,
  getTriageObservationsByClinic,
  createTriageObservations,
  getOrderSets,
  getPatientCareplans,
  getCareplanById,
  createCareplan,
  updateCareplanStatus,
  getCareplanSessions,
  getPatientCareplanSessions,
  createSession,
  completeSession,
  updateSessionStatus,
  getActiveCarePlansBySpecialty,
  getConsultationAddendums,
  addConsultationAddendum,
} from '../api/specialty-clinic.api';
import type {
  CreateTriageObservationDTO,
  CreateCareplanDTO,
  CreateSessionDTO,
  CompleteSessionDTO,
} from '../dtos/specialty-clinic.dto';

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
    backgroundScope = 'specialty-clinic:write',
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
// Triage Hooks
// =============================================================================

/** Get triage test configuration for a specialty clinic */
export function useTriageConfigs(specialtyCode: string | undefined) {
  return useQuery({
    queryKey: ['triage-configs', specialtyCode],
    queryFn: () => getTriageConfigs(specialtyCode!),
    enabled: !!specialtyCode,
    staleTime: 10 * 60 * 1000, // 10 min — configs rarely change
  });
}

/** Get recorded triage observations for an encounter */
export function useTriageObservations(encounterId: string | undefined) {
  return useQuery({
    queryKey: ['triage-observations', encounterId],
    queryFn: () => getTriageObservations(encounterId!),
    enabled: !!encounterId,
  });
}

/** Get triage observations for an encounter filtered by clinic type */
export function useTriageObservationsByClinic(
  encounterId: string | undefined,
  clinicType: string | undefined,
) {
  return useQuery({
    queryKey: ['triage-observations', encounterId, clinicType],
    queryFn: () => getTriageObservationsByClinic(encounterId!, clinicType!),
    enabled: !!encounterId && !!clinicType,
  });
}

/** Mutation to record triage observations */
export function useCreateTriageObservations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (observations: CreateTriageObservationDTO[]) =>
      createTriageObservations(observations),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['triage-observations'],
      });
    },
  });
}

// =============================================================================
// Order Set Hooks
// =============================================================================

/** Get order sets for a specialty (system + facility) */
export function useOrderSets(specialtyCode: string | undefined) {
  return useQuery({
    queryKey: ['order-sets', specialtyCode],
    queryFn: () => getOrderSets(specialtyCode!),
    enabled: !!specialtyCode,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// Care Plan Hooks
// =============================================================================

/** Get all care plans for a patient, optionally by specialty */
export function usePatientCareplans(
  patientId: string | undefined,
  specialtyCode?: string,
) {
  return useQuery({
    queryKey: ['careplans', patientId, specialtyCode],
    queryFn: () => getPatientCareplans(patientId!, specialtyCode),
    enabled: !!patientId,
  });
}

/** Get a single care plan */
export function useCareplan(careplanId: string | undefined) {
  return useQuery({
    queryKey: ['careplan', careplanId],
    queryFn: () => getCareplanById(careplanId!),
    enabled: !!careplanId,
  });
}

/** Create a care plan */
export function useCreateCareplan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCareplanDTO) => createCareplan(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['careplans'],
      });
    },
  });
}

/** Update care plan status */
export function useUpdateCareplanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      careplanId,
      status,
    }: {
      careplanId: string;
      status: 'Active' | 'Completed' | 'Cancelled' | 'On_Hold';
    }) => updateCareplanStatus(careplanId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['careplan'],
      });
      queryClient.invalidateQueries({
        queryKey: ['careplans'],
      });
    },
  });
}

// =============================================================================
// Session Hooks
// =============================================================================

/** Get all sessions for a care plan */
export function useCareplanSessions(careplanId: string | undefined) {
  return useQuery({
    queryKey: ['careplan-sessions', careplanId],
    queryFn: () => getCareplanSessions(careplanId!),
    enabled: !!careplanId,
  });
}

/** Get all sessions across all care plans for a patient */
export function usePatientCareplanSessions(
  patientId: string | undefined,
  specialtyCode?: string,
) {
  return useQuery({
    queryKey: ['patient-careplan-sessions', patientId, specialtyCode],
    queryFn: () => getPatientCareplanSessions(patientId!, specialtyCode),
    enabled: !!patientId,
  });
}

/** Create a session */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateSessionDTO) => createSession(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['careplan-sessions'],
      });
    },
  });
}

/** Complete a session */
export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      dto,
    }: {
      sessionId: string;
      dto: CompleteSessionDTO;
    }) => completeSession(sessionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['careplan-sessions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['careplans'],
      });
    },
  });
}

/** Update session status */
export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      status,
    }: {
      sessionId: string;
      status: 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled';
    }) => updateSessionStatus(sessionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['careplan-sessions'],
      });
    },
  });
}

// =============================================================================
// Active Care Plans by Specialty (for clinic dashboards)
// =============================================================================

/** Get all active/on-hold care plans for a specialty clinic */
export function useActiveCarePlans(
  specialtyCode: string | undefined,
  statusFilter?: ('Active' | 'On_Hold' | 'Completed' | 'Cancelled')[],
) {
  return useQuery({
    queryKey: ['active-careplans', specialtyCode, statusFilter],
    queryFn: () => getActiveCarePlansBySpecialty(specialtyCode!, statusFilter),
    enabled: !!specialtyCode,
    staleTime: 60 * 1000, // 1 min
  });
}

// =============================================================================
// Consultation Addendums
// =============================================================================

/** Get addendums for a single consultation */
export function useConsultationAddendums(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-addendums', consultationId],
    queryFn: () => getConsultationAddendums(consultationId!),
    enabled: !!consultationId,
    staleTime: 30 * 1000,
  });
}

/** Add a new addendum note */
export function useAddConsultationAddendum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      consultationId,
      noteText,
      createdBy,
    }: {
      consultationId: string;
      noteText: string;
      createdBy: string;
    }) => addConsultationAddendum(consultationId, noteText, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['consultation-addendums'],
      });
    },
  });
}
