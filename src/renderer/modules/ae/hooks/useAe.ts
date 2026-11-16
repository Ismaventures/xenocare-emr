// =============================================================================
// A&E Module — React Query Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  createArrival,
  getArrival,
  saveAeTriage,
  getAeTriage,
  savePrimarySurvey,
  getPrimarySurvey,
  createDisposition,
  getDisposition,
  createFluidChart,
  getFluidCharts,
  createAeProcedure,
  getAeProcedures,
  getTimelineEvents,
  getActiveAeEncounters,
  getAeDashboardStats,
  getEncounterVitals,
  addVitalObservation,
  getEncounterLabRequests,
  getEncounterRadiologyRequests,
  getEncounterPrescriptions,
  hasActiveAeEncounter,
  submitAeOrders,
  getEncounterConsultations,
} from '../api/ae.api';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
  ProcedureOrderDTO,
  AdmissionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';
import type {
  ArrivalFormDTO,
  TriageFormDTO,
  PrimarySurveyFormDTO,
  DispositionFormDTO,
  FluidChartFormDTO,
  AeProcedureFormDTO,
} from '../dtos/ae.dto';

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
    backgroundScope = 'ae:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// Query keys
const AE_KEYS = {
  all: ['ae'] as const,
  encounters: () => [...AE_KEYS.all, 'encounters'] as const,
  stats: () => [...AE_KEYS.all, 'stats'] as const,
  encounter: (id: string) => [...AE_KEYS.all, 'encounter', id] as const,
  arrival: (id: string) => [...AE_KEYS.encounter(id), 'arrival'] as const,
  triage: (id: string) => [...AE_KEYS.encounter(id), 'triage'] as const,
  survey: (id: string) => [...AE_KEYS.encounter(id), 'survey'] as const,
  disposition: (id: string) =>
    [...AE_KEYS.encounter(id), 'disposition'] as const,
  timeline: (id: string) => [...AE_KEYS.encounter(id), 'timeline'] as const,
  vitals: (id: string) => [...AE_KEYS.encounter(id), 'vitals'] as const,
  fluids: (id: string) => [...AE_KEYS.encounter(id), 'fluids'] as const,
  procedures: (id: string) => [...AE_KEYS.encounter(id), 'procedures'] as const,
  labs: (id: string) => [...AE_KEYS.encounter(id), 'labs'] as const,
  radiology: (id: string) => [...AE_KEYS.encounter(id), 'radiology'] as const,
  prescriptions: (id: string) =>
    [...AE_KEYS.encounter(id), 'prescriptions'] as const,
  consultations: (id: string) =>
    [...AE_KEYS.encounter(id), 'consultations'] as const,
  duplicateCheck: (patientId: string) =>
    [...AE_KEYS.all, 'duplicate', patientId] as const,
};

// =============================================================================
// Dashboard / List Hooks
// =============================================================================

export function useAeEncounters() {
  return useQuery({
    queryKey: AE_KEYS.encounters(),
    queryFn: getActiveAeEncounters,
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 15000, // Refresh every 15s for real-time tracking
  });
}

export function useAeDashboardStats() {
  return useQuery({
    queryKey: AE_KEYS.stats(),
    queryFn: getAeDashboardStats,
    staleTime: 1000 * 15,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 30000,
  });
}

export function useCheckDuplicateAe(patientId: string | undefined) {
  return useQuery({
    queryKey: AE_KEYS.duplicateCheck(patientId || ''),
    queryFn: () => hasActiveAeEncounter(patientId!),
    enabled: !!patientId,
  });
}

// =============================================================================
// Per-Encounter Data Hooks
// =============================================================================

export function useAeArrival(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.arrival(encounterId),
    queryFn: () => getArrival(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeTriage(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.triage(encounterId),
    queryFn: () => getAeTriage(encounterId),
    enabled: !!encounterId,
  });
}

export function useAePrimarySurvey(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.survey(encounterId),
    queryFn: () => getPrimarySurvey(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeDisposition(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.disposition(encounterId),
    queryFn: () => getDisposition(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeTimeline(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.timeline(encounterId),
    queryFn: () => getTimelineEvents(encounterId),
    enabled: !!encounterId,
    refetchInterval: 10000,
  });
}

export function useAeVitals(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.vitals(encounterId),
    queryFn: () => getEncounterVitals(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeFluidCharts(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.fluids(encounterId),
    queryFn: () => getFluidCharts(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeProcedures(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.procedures(encounterId),
    queryFn: () => getAeProcedures(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeConsultations(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.consultations(encounterId),
    queryFn: () => getEncounterConsultations(encounterId),
    enabled: !!encounterId,
  });
}

export function useAeLabRequests(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.labs(encounterId),
    queryFn: () => getEncounterLabRequests(encounterId),
    enabled: !!encounterId,
    refetchInterval: 30000,
  });
}

export function useAeRadiologyRequests(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.radiology(encounterId),
    queryFn: () => getEncounterRadiologyRequests(encounterId),
    enabled: !!encounterId,
    refetchInterval: 30000,
  });
}

export function useAePrescriptions(encounterId: string) {
  return useQuery({
    queryKey: AE_KEYS.prescriptions(encounterId),
    queryFn: () => getEncounterPrescriptions(encounterId),
    enabled: !!encounterId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateArrival() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dto,
      encounterId,
    }: {
      dto: ArrivalFormDTO;
      encounterId: string;
    }) => createArrival(dto, encounterId),
    onSuccess: (_data, { encounterId }) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.arrival(encounterId) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(encounterId) });
      qc.invalidateQueries({ queryKey: AE_KEYS.encounters() });
    },
  });
}

export function useSubmitTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: TriageFormDTO) => saveAeTriage(dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.triage(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.vitals(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.encounters() });
    },
  });
}

export function useSubmitPrimarySurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PrimarySurveyFormDTO) => savePrimarySurvey(dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.survey(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(dto.encounter_id) });
    },
  });
}

export function useSubmitDisposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: DispositionFormDTO) => createDisposition(dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.disposition(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.encounters() });
      qc.invalidateQueries({ queryKey: AE_KEYS.stats() });
    },
  });
}

export function useCreateFluidChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FluidChartFormDTO) => createFluidChart(dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.fluids(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(dto.encounter_id) });
    },
  });
}

export function useCreateAeProcedure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: AeProcedureFormDTO) => createAeProcedure(dto),
    onSuccess: (_data, dto) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.procedures(dto.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(dto.encounter_id) });
    },
  });
}

export function useAddVitalObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addVitalObservation,
    onSuccess: (_data, params) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.vitals(params.encounter_id) });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(params.encounter_id) });
    },
  });
}

export function useSubmitAeOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      encounterId: string;
      patientId: string;
      labOrders: LabOrderDTO[];
      radiologyOrders: RadiologyOrderDTO[];
      prescriptions: PrescriptionOrderDTO[];
      procedureOrders: ProcedureOrderDTO[];
      admissionOrder?: AdmissionOrderDTO | null;
      staffId?: string | null;
    }) => submitAeOrders(params),
    onSuccess: (_data, params) => {
      qc.invalidateQueries({ queryKey: AE_KEYS.labs(params.encounterId) });
      qc.invalidateQueries({ queryKey: AE_KEYS.radiology(params.encounterId) });
      qc.invalidateQueries({
        queryKey: AE_KEYS.prescriptions(params.encounterId),
      });
      qc.invalidateQueries({ queryKey: AE_KEYS.timeline(params.encounterId) });
      qc.invalidateQueries({ queryKey: AE_KEYS.encounters() });
    },
  });
}
