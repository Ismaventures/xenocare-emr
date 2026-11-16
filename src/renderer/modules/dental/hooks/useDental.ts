// =============================================================================
// Dental Module React Query Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getDentalExams,
  getDentalExam,
  getPatientDentalExams,
  getEncounterDentalExams,
  createDentalExam,
  updateDentalExam,
  completeDentalExam,
  getDentalChart,
  getPatientDentalChart,
  getToothHistory,
  createDentalChartEntry,
  updateDentalChartEntry,
  batchCreateDentalChart,
  getDentalProcedures,
  getDentalProcedure,
  createDentalProcedure,
  updateDentalProcedure,
  startDentalProcedure,
  completeDentalProcedure,
  cancelDentalProcedure,
  getDentalPrescriptions,
  createDentalPrescription,
  getDentalStats,
  acceptDentalProcedure,
  rejectDentalProcedure,
  DentalExamFilters,
  DentalProcedureFilters,
} from '../api/dental.api';
import type {
  CreateDentalExamDTO,
  UpdateDentalExamDTO,
  CreateDentalChartEntryDTO,
  CreateDentalProcedureDTO,
  UpdateDentalProcedureDTO,
  CreateDentalPrescriptionDTO,
} from '../types/dental.types';

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
    backgroundScope = 'dental:write',
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

export const dentalKeys = {
  all: ['dental'] as const,
  exams: () => [...dentalKeys.all, 'exams'] as const,
  examsList: (filters: DentalExamFilters) =>
    [...dentalKeys.exams(), 'list', filters] as const,
  examDetail: (id: string) => [...dentalKeys.exams(), 'detail', id] as const,
  patientExams: (patientId: string) =>
    [...dentalKeys.exams(), 'patient', patientId] as const,
  encounterExams: (encounterId: string) =>
    [...dentalKeys.exams(), 'encounter', encounterId] as const,
  chart: () => [...dentalKeys.all, 'chart'] as const,
  examChart: (examId: string) =>
    [...dentalKeys.chart(), 'exam', examId] as const,
  patientChart: (patientId: string) =>
    [...dentalKeys.chart(), 'patient', patientId] as const,
  toothHistory: (patientId: string, toothNumber: number) =>
    [...dentalKeys.chart(), 'tooth', patientId, toothNumber] as const,
  procedures: () => [...dentalKeys.all, 'procedures'] as const,
  proceduresList: (filters: any) =>
    [...dentalKeys.procedures(), 'list', filters] as const,
  procedureDetail: (id: string) =>
    [...dentalKeys.procedures(), 'detail', id] as const,
  prescriptions: (examId: string) =>
    [...dentalKeys.all, 'prescriptions', examId] as const,
  stats: (dentistId?: string) =>
    [...dentalKeys.all, 'stats', dentistId] as const,
};

// =============================================================================
// Dental Exam Hooks
// =============================================================================

/**
 * Get dental exams with filters
 */
export function useDentalExams(filters: DentalExamFilters = {}) {
  return useQuery({
    queryKey: dentalKeys.examsList(filters),
    queryFn: () => getDentalExams(filters),
  });
}

/**
 * Get a single dental exam
 */
export function useDentalExam(examId: string) {
  return useQuery({
    queryKey: dentalKeys.examDetail(examId),
    queryFn: () => getDentalExam(examId),
    enabled: !!examId,
  });
}

/**
 * Get dental exams for a patient
 */
export function usePatientDentalExams(patientId: string) {
  return useQuery({
    queryKey: dentalKeys.patientExams(patientId),
    queryFn: () => getPatientDentalExams(patientId),
    enabled: !!patientId,
  });
}

/**
 * Get dental exams for an encounter
 */
export function useEncounterDentalExams(encounterId: string) {
  return useQuery({
    queryKey: dentalKeys.encounterExams(encounterId),
    queryFn: () => getEncounterDentalExams(encounterId),
    enabled: !!encounterId,
  });
}

/**
 * Create a dental exam
 */
export function useCreateDentalExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDentalExamDTO) => createDentalExam(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dentalKeys.exams() });
      queryClient.invalidateQueries({
        queryKey: dentalKeys.patientExams(data.patient_id),
      });
      queryClient.invalidateQueries({
        queryKey: dentalKeys.encounterExams(data.encounter_id),
      });
    },
  });
}

/**
 * Update a dental exam
 */
export function useUpdateDentalExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      input,
    }: {
      examId: string;
      input: UpdateDentalExamDTO;
    }) => updateDentalExam(examId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.examDetail(data.exam_id),
      });
      queryClient.invalidateQueries({ queryKey: dentalKeys.exams() });
    },
  });
}

/**
 * Complete a dental exam
 */
export function useCompleteDentalExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (examId: string) => completeDentalExam(examId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.examDetail(data.exam_id),
      });
      queryClient.invalidateQueries({ queryKey: dentalKeys.exams() });
    },
  });
}

// =============================================================================
// Dental Chart Hooks
// =============================================================================

/**
 * Get dental chart for an exam
 */
export function useDentalChart(examId: string) {
  return useQuery({
    queryKey: dentalKeys.examChart(examId),
    queryFn: () => getDentalChart(examId),
    enabled: !!examId,
  });
}

/**
 * Get patient's full dental chart history
 */
export function usePatientDentalChart(patientId: string) {
  return useQuery({
    queryKey: dentalKeys.patientChart(patientId),
    queryFn: () => getPatientDentalChart(patientId),
    enabled: !!patientId,
  });
}

/**
 * Get tooth history
 */
export function useToothHistory(patientId: string, toothNumber: number) {
  return useQuery({
    queryKey: dentalKeys.toothHistory(patientId, toothNumber),
    queryFn: () => getToothHistory(patientId, toothNumber),
    enabled: !!patientId && toothNumber !== undefined,
  });
}

/**
 * Create a dental chart entry
 */
export function useCreateDentalChartEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDentalChartEntryDTO) =>
      createDentalChartEntry(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.examChart(data.exam_id),
      });
      queryClient.invalidateQueries({
        queryKey: dentalKeys.patientChart(data.patient_id),
      });
    },
  });
}

/**
 * Update a dental chart entry
 */
export function useUpdateDentalChartEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      chartId,
      input,
    }: {
      chartId: string;
      input: Partial<CreateDentalChartEntryDTO>;
    }) => updateDentalChartEntry(chartId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dentalKeys.chart() });
    },
  });
}

/**
 * Batch create dental chart entries
 */
export function useBatchCreateDentalChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      entries,
    }: {
      examId: string;
      entries: Omit<CreateDentalChartEntryDTO, 'exam_id'>[];
    }) => batchCreateDentalChart(examId, entries),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({
          queryKey: dentalKeys.examChart(data[0].exam_id),
        });
        queryClient.invalidateQueries({
          queryKey: dentalKeys.patientChart(data[0].patient_id),
        });
      }
    },
  });
}

// =============================================================================
// Dental Procedure Hooks
// =============================================================================

/**
 * Get dental procedures with filters
 */
export function useDentalProcedures(filters: any = {}) {
  return useQuery({
    queryKey: dentalKeys.proceduresList(filters),
    queryFn: () => getDentalProcedures(filters),
  });
}

/**
 * Get a single dental procedure
 */
export function useDentalProcedure(procedureId: string) {
  return useQuery({
    queryKey: dentalKeys.procedureDetail(procedureId),
    queryFn: () => getDentalProcedure(procedureId),
    enabled: !!procedureId,
  });
}

/**
 * Create a dental procedure
 */
export function useCreateDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDentalProcedureDTO) =>
      createDentalProcedure(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}

/**
 * Update a dental procedure
 */
export function useUpdateDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      input,
    }: {
      procedureId: string;
      input: UpdateDentalProcedureDTO;
    }) => updateDentalProcedure(procedureId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.procedureDetail(data.procedure_id),
      });
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}

/**
 * Start a dental procedure
 */
export function useStartDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (procedureId: string) => startDentalProcedure(procedureId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.procedureDetail(data.procedure_id),
      });
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}

/**
 * Complete a dental procedure
 */
export function useCompleteDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      notes,
      complications,
    }: {
      procedureId: string;
      notes?: string;
      complications?: string;
    }) => completeDentalProcedure(procedureId, notes, complications),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.procedureDetail(data.procedure_id),
      });
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}

/**
 * Cancel a dental procedure
 */
export function useCancelDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      reason,
    }: {
      procedureId: string;
      reason?: string;
    }) => cancelDentalProcedure(procedureId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: dentalKeys.procedureDetail(data.procedure_id),
      });
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}

// =============================================================================
// Dental Prescription Hooks
// =============================================================================

/**
 * Get dental prescriptions for an exam
 */
export function useDentalPrescriptions(examId: string) {
  return useQuery({
    queryKey: dentalKeys.prescriptions(examId),
    queryFn: () => getDentalPrescriptions(examId),
    enabled: !!examId,
  });
}

/**
 * Create a dental prescription
 */
export function useCreateDentalPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof createDentalPrescription>[0]) =>
      createDentalPrescription(input),
    onSuccess: (data) => {
      if (data.exam_id) {
        queryClient.invalidateQueries({
          queryKey: dentalKeys.prescriptions(data.exam_id),
        });
      }
    },
  });
}

// =============================================================================
// Statistics Hooks
// =============================================================================

/**
 * Get dental statistics
 */
export function useDentalStats(
  dentistId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: dentalKeys.stats(dentistId),
    queryFn: () => getDentalStats(dentistId, dateFrom, dateTo),
  });
}
// =============================================================================
// Accept/Reject Hooks (Billing Integration)
// =============================================================================

/**
 * Accept a dental procedure - creates billing order
 */
export function useAcceptDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (procedureId: string) => acceptDentalProcedure(procedureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}

/**
 * Reject a dental procedure
 */
export function useRejectDentalProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      reason,
    }: {
      procedureId: string;
      reason: string;
    }) => rejectDentalProcedure(procedureId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dentalKeys.procedures() });
    },
  });
}
