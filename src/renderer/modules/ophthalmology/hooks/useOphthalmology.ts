// =============================================================================
// Ophthalmology Module React Query Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getEyeExams,
  getEyeExam,
  getPatientEyeExams,
  getEncounterEyeExams,
  createEyeExam,
  updateEyeExam,
  completeEyeExam,
  getEyeProcedures,
  getEyeProcedure,
  createEyeProcedure,
  completeEyeProcedure,
  cancelEyeProcedure,
  getExamPrescriptions,
  getPatientEyePrescriptions,
  createGlassesPrescription,
  createContactLensPrescription,
  createEyeMedicationPrescription,
  getOphthalmologyStats,
  getPatientVisualAcuityTrend,
  getPatientIOPTrend,
  getPatientRefractionHistory,
  acceptEyeProcedure,
  rejectEyeProcedure,
  EyeExamFilters,
  EyeProcedureFilters,
} from '../api/ophthalmology.api';
import type {
  CreateEyeExamDTO,
  UpdateEyeExamDTO,
  CreateEyeProcedureDTO,
  CompleteEyeProcedureDTO,
  CreateGlassesPrescriptionDTO,
  CreateEyeMedicationDTO,
} from '../types/ophthalmology.types';

// =============================================================================
// Query Keys
// =============================================================================

export const ophthalmologyKeys = {
  all: ['ophthalmology'] as const,
  exams: () => [...ophthalmologyKeys.all, 'exams'] as const,
  examsList: (filters: EyeExamFilters) =>
    [...ophthalmologyKeys.exams(), 'list', filters] as const,
  examDetail: (id: string) =>
    [...ophthalmologyKeys.exams(), 'detail', id] as const,
  patientExams: (patientId: string) =>
    [...ophthalmologyKeys.exams(), 'patient', patientId] as const,
  encounterExams: (encounterId: string) =>
    [...ophthalmologyKeys.exams(), 'encounter', encounterId] as const,
  procedures: () => [...ophthalmologyKeys.all, 'procedures'] as const,
  proceduresList: (filters: EyeProcedureFilters) =>
    [...ophthalmologyKeys.procedures(), 'list', filters] as const,
  procedureDetail: (id: string) =>
    [...ophthalmologyKeys.procedures(), 'detail', id] as const,
  examPrescriptions: (examId: string) =>
    [...ophthalmologyKeys.all, 'prescriptions', 'exam', examId] as const,
  patientPrescriptions: (patientId: string) =>
    [...ophthalmologyKeys.all, 'prescriptions', 'patient', patientId] as const,
  stats: (ophthalmologistId?: string) =>
    [...ophthalmologyKeys.all, 'stats', ophthalmologistId] as const,
  visualAcuityTrend: (patientId: string) =>
    [...ophthalmologyKeys.all, 'va-trend', patientId] as const,
  iopTrend: (patientId: string) =>
    [...ophthalmologyKeys.all, 'iop-trend', patientId] as const,
  refractionHistory: (patientId: string) =>
    [...ophthalmologyKeys.all, 'refraction', patientId] as const,
};

// =============================================================================
// Eye Exam Hooks
// =============================================================================

/**
 * Get eye exams with filters
 */
export function useEyeExams(filters: EyeExamFilters = {}) {
  return useQuery({
    queryKey: ophthalmologyKeys.examsList(filters),
    queryFn: () => getEyeExams(filters),
  });
}

/**
 * Get a single eye exam
 */
export function useEyeExam(examId: string) {
  return useQuery({
    queryKey: ophthalmologyKeys.examDetail(examId),
    queryFn: () => getEyeExam(examId),
    enabled: !!examId,
  });
}

/**
 * Get eye exams for a patient
 */
export function usePatientEyeExams(patientId: string) {
  return useQuery({
    queryKey: ophthalmologyKeys.patientExams(patientId),
    queryFn: () => getPatientEyeExams(patientId),
    enabled: !!patientId,
  });
}

/**
 * Get eye exams for an encounter
 */
export function useEncounterEyeExams(encounterId: string) {
  return useQuery({
    queryKey: ophthalmologyKeys.encounterExams(encounterId),
    queryFn: () => getEncounterEyeExams(encounterId),
    enabled: !!encounterId,
  });
}

/**
 * Create an eye exam
 */
export function useCreateEyeExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEyeExamDTO) => createEyeExam(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ophthalmologyKeys.exams() });
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.patientExams(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.encounterExams(data.encounter_id),
      });
    },
  });
}

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  >,
) =>
  useBackgroundMutation<TData, TError, TVariables, TContext>({
    backgroundScope: 'ophthalmology:write',
    maxRetries: 4,
    ...options,
  });
/**
 * Update an eye exam
 */
export function useUpdateEyeExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      input,
    }: {
      examId: string;
      input: UpdateEyeExamDTO;
    }) => updateEyeExam(examId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.examDetail(data.exam_id),
      });
      queryClient.invalidateQueries({ queryKey: ophthalmologyKeys.exams() });
    },
  });
}

/**
 * Complete an eye exam
 */
export function useCompleteEyeExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, staffId }: { examId: string; staffId: string }) =>
      completeEyeExam(examId, staffId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.examDetail(data.exam_id),
      });
      queryClient.invalidateQueries({ queryKey: ophthalmologyKeys.exams() });
    },
  });
}

// =============================================================================
// Eye Procedure Hooks
// =============================================================================

/**
 * Get eye procedures with filters
 */
export function useEyeProcedures(filters: EyeProcedureFilters = {}) {
  return useQuery({
    queryKey: ophthalmologyKeys.proceduresList(filters),
    queryFn: () => getEyeProcedures(filters),
  });
}

/**
 * Get a single eye procedure
 */
export function useEyeProcedure(procedureId: string) {
  return useQuery({
    queryKey: ophthalmologyKeys.procedureDetail(procedureId),
    queryFn: () => getEyeProcedure(procedureId),
    enabled: !!procedureId,
  });
}

/**
 * Create an eye procedure
 */
export function useCreateEyeProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEyeProcedureDTO) => createEyeProcedure(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedures(),
      });
    },
  });
}

/**
 * Complete an eye procedure with findings
 */
export function useCompleteEyeProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompleteEyeProcedureDTO) => completeEyeProcedure(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedureDetail(data.procedure_id),
      });
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedures(),
      });
    },
  });
}

/**
 * Cancel an eye procedure
 */
export function useCancelEyeProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      reason,
    }: {
      procedureId: string;
      reason?: string;
    }) => cancelEyeProcedure(procedureId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedureDetail(data.procedure_id),
      });
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedures(),
      });
    },
  });
}

// =============================================================================
// Prescription Hooks
// =============================================================================

/**
 * Get prescriptions for an exam
 */
export function useExamPrescriptions(examId: string) {
  return useQuery({
    queryKey: ophthalmologyKeys.examPrescriptions(examId),
    queryFn: () => getExamPrescriptions(examId),
    enabled: !!examId,
  });
}

/**
 * Get patient's prescription history
 */
export function usePatientEyePrescriptions(patientId: string) {
  return useQuery({
    queryKey: ophthalmologyKeys.patientPrescriptions(patientId),
    queryFn: () => getPatientEyePrescriptions(patientId),
    enabled: !!patientId,
  });
}

/**
 * Create glasses prescription
 */
export function useCreateGlassesPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGlassesPrescriptionDTO) =>
      createGlassesPrescription(input),
    onSuccess: (data) => {
      if (data.exam_id) {
        queryClient.invalidateQueries({
          queryKey: ophthalmologyKeys.examPrescriptions(data.exam_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.patientPrescriptions(data.patient_id),
      });
    },
  });
}

/**
 * Create contact lens prescription
 */
export function useCreateContactLensPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createContactLensPrescription>[0]) =>
      createContactLensPrescription(input),
    onSuccess: (data) => {
      if (data.exam_id) {
        queryClient.invalidateQueries({
          queryKey: ophthalmologyKeys.examPrescriptions(data.exam_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.patientPrescriptions(data.patient_id),
      });
    },
  });
}

/**
 * Create eye medication prescription
 */
export function useCreateEyeMedicationPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEyeMedicationDTO) =>
      createEyeMedicationPrescription(input),
    onSuccess: (data) => {
      if (data.exam_id) {
        queryClient.invalidateQueries({
          queryKey: ophthalmologyKeys.examPrescriptions(data.exam_id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.patientPrescriptions(data.patient_id),
      });
    },
  });
}

// =============================================================================
// Trend & Statistics Hooks
// =============================================================================

/**
 * Get patient's visual acuity trend
 */
export function usePatientVisualAcuityTrend(patientId: string, limit = 10) {
  return useQuery({
    queryKey: ophthalmologyKeys.visualAcuityTrend(patientId),
    queryFn: () => getPatientVisualAcuityTrend(patientId, limit),
    enabled: !!patientId,
  });
}

/**
 * Get patient's IOP trend (for glaucoma monitoring)
 */
export function usePatientIOPTrend(patientId: string, limit = 10) {
  return useQuery({
    queryKey: ophthalmologyKeys.iopTrend(patientId),
    queryFn: () => getPatientIOPTrend(patientId, limit),
    enabled: !!patientId,
  });
}

/**
 * Get patient's refraction history
 */
export function usePatientRefractionHistory(patientId: string, limit = 10) {
  return useQuery({
    queryKey: ophthalmologyKeys.refractionHistory(patientId),
    queryFn: () => getPatientRefractionHistory(patientId, limit),
    enabled: !!patientId,
  });
}

/**
 * Get ophthalmology statistics
 */
export function useOphthalmologyStats(
  ophthalmologistId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: ophthalmologyKeys.stats(ophthalmologistId),
    queryFn: () => getOphthalmologyStats(ophthalmologistId, dateFrom, dateTo),
  });
}
// =============================================================================
// Accept/Reject Hooks (Billing Integration)
// =============================================================================

/**
 * Accept an eye procedure - creates billing order
 */
export function useAcceptEyeProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (procedureId: string) => acceptEyeProcedure(procedureId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedures(),
      });
    },
  });
}

/**
 * Reject an eye procedure
 */
export function useRejectEyeProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      reason,
    }: {
      procedureId: string;
      reason: string;
    }) => rejectEyeProcedure(procedureId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ophthalmologyKeys.procedures(),
      });
    },
  });
}
