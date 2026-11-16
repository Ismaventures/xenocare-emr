// =============================================================================
// Physiotherapy Module React Query Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { scheduleQueryInvalidations } from '../../../lib/query/invalidation';
import {
  getPhysioAssessments,
  getPhysioAssessment,
  getPatientPhysioAssessments,
  getEncounterPhysioAssessments,
  createPhysioAssessment,
  updatePhysioAssessment,
  completePhysioAssessment,
  getPhysioPlans,
  getPhysioPlan,
  getActivePhysioPlan,
  createPhysioPlan,
  updatePhysioPlan,
  updatePhysioPlanStatus,
  getPhysioSessions,
  getPlanSessions,
  getPhysioSession,
  createPhysioSession,
  completePhysioSession,
  updateSessionAttendance,
  getPhysioProgressNotes,
  createPhysioProgressNote,
  getPhysioDischarge,
  createPhysioDischarge,
  getPhysioStats,
  getPatientPainTrend,
  billPhysioSession,
  billPhysioPlan,
  getActivePhysioPlans,
  getPatientPhysioPlans,
  extendPhysioPlan,
  getPhysioPlanExtensions,
  createPhysioPlanFromConsultation,
  updatePhysioPlanPaymentStatus,
  rescheduleSession,
  adjustPlanSessionCount,
  updateSessionsApproved,
  getPhysioPlanNhisApproval,
  approvePhysioPlanNhis,
  rejectPhysioPlanNhis,
  resubmitPhysioPlanNhis,
  getPhysioPlanTimeline,
  PhysioAssessmentFilters,
  PhysioSessionFilters,
} from '../api/physiotherapy.api';
import type {
  CreatePhysioAssessmentDTO,
  UpdatePhysioAssessmentDTO,
  CreatePhysioPlanDTO,
  UpdatePhysioPlanDTO,
  CreatePhysioSessionDTO,
  CreatePhysioProgressDTO,
  CreatePhysioDischargeDTO,
  PhysioPlanStatus,
  CreatePhysioPlanExtensionDTO,
  ConsultationPhysioOrderDTO,
} from '../types/physiotherapy.types';

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
    backgroundScope = 'physio:write',
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

export const physioKeys = {
  all: ['physiotherapy'] as const,
  assessments: () => [...physioKeys.all, 'assessments'] as const,
  assessmentsList: (filters: PhysioAssessmentFilters) =>
    [...physioKeys.assessments(), 'list', filters] as const,
  assessmentDetail: (id: string) =>
    [...physioKeys.assessments(), 'detail', id] as const,
  patientAssessments: (patientId: string) =>
    [...physioKeys.assessments(), 'patient', patientId] as const,
  encounterAssessments: (encounterId: string) =>
    [...physioKeys.assessments(), 'encounter', encounterId] as const,
  plans: () => [...physioKeys.all, 'plans'] as const,
  assessmentPlans: (assessmentId: string) =>
    [...physioKeys.plans(), 'assessment', assessmentId] as const,
  planDetail: (id: string) => [...physioKeys.plans(), 'detail', id] as const,
  activePlan: (assessmentId: string) =>
    [...physioKeys.plans(), 'active', assessmentId] as const,
  sessions: () => [...physioKeys.all, 'sessions'] as const,
  sessionsList: (filters: PhysioSessionFilters) =>
    [...physioKeys.sessions(), 'list', filters] as const,
  planSessions: (planId: string) =>
    [...physioKeys.sessions(), 'plan', planId] as const,
  sessionDetail: (id: string) =>
    [...physioKeys.sessions(), 'detail', id] as const,
  progressNotes: (assessmentId: string) =>
    [...physioKeys.all, 'progress', assessmentId] as const,
  discharge: (assessmentId: string) =>
    [...physioKeys.all, 'discharge', assessmentId] as const,
  stats: (therapistId?: string) =>
    [...physioKeys.all, 'stats', therapistId] as const,
  painTrend: (assessmentId: string) =>
    [...physioKeys.all, 'pain-trend', assessmentId] as const,
  activePlans: (filters?: Record<string, unknown>) =>
    [...physioKeys.plans(), 'active-list', filters] as const,
  patientPlans: (patientId: string) =>
    [...physioKeys.plans(), 'patient', patientId] as const,
  planExtensions: (planId: string) =>
    [...physioKeys.plans(), 'extensions', planId] as const,
  planTimeline: (planId: string) =>
    [...physioKeys.plans(), 'timeline', planId] as const,
};

// =============================================================================
// Assessment Hooks
// =============================================================================

/**
 * Get physio assessments with filters
 */
export function usePhysioAssessments(filters: PhysioAssessmentFilters = {}) {
  return useQuery({
    queryKey: physioKeys.assessmentsList(filters),
    queryFn: () => getPhysioAssessments(filters),
  });
}

/**
 * Get a single physio assessment
 */
export function usePhysioAssessment(assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.assessmentDetail(assessmentId),
    queryFn: () => getPhysioAssessment(assessmentId),
    enabled: !!assessmentId,
  });
}

/**
 * Get physio assessments for a patient
 */
export function usePatientPhysioAssessments(patientId: string) {
  return useQuery({
    queryKey: physioKeys.patientAssessments(patientId),
    queryFn: () => getPatientPhysioAssessments(patientId),
    enabled: !!patientId,
  });
}

/**
 * Get physio assessments for an encounter
 */
export function useEncounterPhysioAssessments(encounterId: string) {
  return useQuery({
    queryKey: physioKeys.encounterAssessments(encounterId),
    queryFn: () => getEncounterPhysioAssessments(encounterId),
    enabled: !!encounterId,
  });
}

/**
 * Create a physio assessment
 */
export function useCreatePhysioAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePhysioAssessmentDTO) =>
      createPhysioAssessment(input),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.assessments(),
        physioKeys.patientAssessments(data.patient_id),
        physioKeys.encounterAssessments(data.encounter_id),
      ]);
    },
  });
}

/**
 * Update a physio assessment
 */
export function useUpdatePhysioAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assessmentId,
      input,
    }: {
      assessmentId: string;
      input: UpdatePhysioAssessmentDTO;
    }) => updatePhysioAssessment(assessmentId, input),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.assessmentDetail(data.assessment_id),
        physioKeys.assessments(),
      ]);
    },
  });
}

/**
 * Complete a physio assessment
 */
export function useCompletePhysioAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assessmentId,
      staffId,
    }: {
      assessmentId: string;
      staffId: string;
    }) => completePhysioAssessment(assessmentId, staffId),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.assessmentDetail(data.assessment_id),
        physioKeys.assessments(),
      ]);
    },
  });
}

// =============================================================================
// Plan Hooks
// =============================================================================

/**
 * Get physio plans for an assessment
 */
export function usePhysioPlans(assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.assessmentPlans(assessmentId),
    queryFn: () => getPhysioPlans(assessmentId),
    enabled: !!assessmentId,
  });
}

/**
 * Get a single physio plan
 */
export function usePhysioPlan(planId: string) {
  return useQuery({
    queryKey: physioKeys.planDetail(planId),
    queryFn: () => getPhysioPlan(planId),
    enabled: !!planId,
  });
}

/**
 * Get active plan for an assessment
 */
export function useActivePhysioPlan(assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.activePlan(assessmentId),
    queryFn: () => getActivePhysioPlan(assessmentId),
    enabled: !!assessmentId,
  });
}

/**
 * Create a physio plan
 */
export function useCreatePhysioPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePhysioPlanDTO) => createPhysioPlan(input),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.plans(),
        physioKeys.assessmentPlans(data.assessment_id),
      ]);
    },
  });
}

/**
 * Update a physio plan
 */
export function useUpdatePhysioPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      input,
    }: {
      planId: string;
      input: UpdatePhysioPlanDTO;
    }) => updatePhysioPlan(planId, input),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.planDetail(data.plan_id),
        physioKeys.assessmentPlans(data.assessment_id),
      ]);
    },
  });
}

/**
 * Update plan status
 */
export function useUpdatePhysioPlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      status,
      reason,
    }: {
      planId: string;
      status: PhysioPlanStatus;
      reason?: string;
    }) => updatePhysioPlanStatus(planId, status, reason),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.planDetail(data.plan_id),
        physioKeys.assessmentPlans(data.assessment_id),
      ]);
    },
  });
}

// =============================================================================
// Session Hooks
// =============================================================================

/**
 * Get physio sessions with filters
 */
export function usePhysioSessions(filters: PhysioSessionFilters = {}) {
  return useQuery({
    queryKey: physioKeys.sessionsList(filters),
    queryFn: () => getPhysioSessions(filters),
  });
}

/**
 * Get sessions for a plan
 */
export function usePlanSessions(planId: string) {
  return useQuery({
    queryKey: physioKeys.planSessions(planId),
    queryFn: () => getPlanSessions(planId),
    enabled: !!planId,
  });
}

/**
 * Get a single physio session
 */
export function usePhysioSession(sessionId: string) {
  return useQuery({
    queryKey: physioKeys.sessionDetail(sessionId),
    queryFn: () => getPhysioSession(sessionId),
    enabled: !!sessionId,
  });
}

/**
 * Create a physio session
 */
export function useCreatePhysioSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePhysioSessionDTO) => createPhysioSession(input),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.sessions(),
        physioKeys.planSessions(data.plan_id),
        physioKeys.painTrend(data.assessment_id),
      ]);
    },
  });
}

/**
 * Complete a physio session
 */
export function useCompletePhysioSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: {
        // Subjective
        pain_score_before?: number;
        subjective_report?: string;
        interval_history?: string;
        changes_since_last?: string;
        // Objective
        objective_findings?: string;
        rom_changes?: string;
        strength_changes?: string;
        functional_changes?: string;
        swelling?: string;
        tenderness?: string;
        functional_limitations?: string;
        gait_assessment?: string;
        // Treatment
        treatment_provided?: string;
        modalities_used?: string[];
        modality_parameters?: Record<string, unknown>;
        exercises_performed?: string;
        exercise_sets_reps?: string;
        manual_techniques_used?: string;
        duration_minutes?: number;
        // Response / Assessment
        patient_response?: string;
        pain_score_after?: number;
        tolerance?: string;
        adverse_reactions?: string;
        progress_notes?: string;
        goals_addressed?: string[];
        progress_indicator?: string;
        compliance_level?: string;
        plan_modifications?: string;
        // Plan
        next_session_focus?: string;
        next_session_plan?: string;
        home_program_modified?: boolean;
        home_program_changes?: string;
        home_exercise_instructions?: string;
        plan_for_next_visit?: string;
        // Outcome measures
        outcome_measure_used?: string;
        outcome_measure_score?: number;
        // Audit
        treated_by: string;
        treated_at: string;
      };
    }) => completePhysioSession(sessionId, input),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.sessionDetail(data.session_id),
        physioKeys.planSessions(data.plan_id),
        physioKeys.painTrend(data.assessment_id),
      ]);
    },
  });
}

/**
 * Update session attendance
 */
export function useUpdateSessionAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      status,
      reason,
    }: {
      sessionId: string;
      status: 'Missed' | 'Cancelled' | 'Rescheduled';
      reason?: string;
    }) => updateSessionAttendance(sessionId, status, reason),
    onSuccess: (data) => {
      scheduleQueryInvalidations(queryClient, [
        physioKeys.sessionDetail(data.session_id),
        physioKeys.planSessions(data.plan_id),
      ]);
    },
  });
}

// =============================================================================
// Progress & Discharge Hooks
// =============================================================================

/**
 * Get progress notes for an assessment
 */
export function usePhysioProgressNotes(assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.progressNotes(assessmentId),
    queryFn: () => getPhysioProgressNotes(assessmentId),
    enabled: !!assessmentId,
  });
}

/**
 * Create a progress note
 */
export function useCreatePhysioProgressNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePhysioProgressDTO) =>
      createPhysioProgressNote(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: physioKeys.progressNotes(data.assessment_id),
      });
    },
  });
}

/**
 * Get discharge summary
 */
export function usePhysioDischarge(assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.discharge(assessmentId),
    queryFn: () => getPhysioDischarge(assessmentId),
    enabled: !!assessmentId,
  });
}

/**
 * Create a discharge summary
 */
export function useCreatePhysioDischarge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePhysioDischargeDTO) =>
      createPhysioDischarge(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: physioKeys.discharge(data.assessment_id),
      });
      if (data.plan_id) {
        queryClient.invalidateQueries({
          queryKey: physioKeys.planDetail(data.plan_id),
        });
      }
    },
  });
}

// =============================================================================
// Trend & Statistics Hooks
// =============================================================================

/**
 * Get pain score trend for a physio case
 */
export function usePatientPainTrend(assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.painTrend(assessmentId),
    queryFn: () => getPatientPainTrend(assessmentId),
    enabled: !!assessmentId,
  });
}

/**
 * Get physiotherapy statistics
 */
export function usePhysioStats(
  therapistId?: string,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: physioKeys.stats(therapistId),
    queryFn: () => getPhysioStats(therapistId, dateFrom, dateTo),
  });
}
// =============================================================================
// Billing Integration Hooks
// =============================================================================

/**
 * Bill a single physio session
 */
export function useBillPhysioSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      sessionFee,
    }: {
      sessionId: string;
      sessionFee: number;
    }) => billPhysioSession(sessionId, sessionFee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.sessions() });
    },
  });
}

/**
 * Bill an entire treatment plan upfront
 */
export function useBillPhysioPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      planFee,
      description,
    }: {
      planId: string;
      planFee: number;
      description?: string;
    }) => billPhysioPlan(planId, planFee, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

// =============================================================================
// Treatment Plan Workflow Hooks
// =============================================================================

/**
 * Get all active physio plans (for Physiotherapy Dashboard)
 */
export function useActivePhysioPlans(
  filters: {
    status?: PhysioPlanStatus;
    patient_id?: string;
    limit?: number;
  } = {},
) {
  return useQuery({
    queryKey: physioKeys.activePlans(filters),
    queryFn: () => getActivePhysioPlans(filters),
  });
}

/**
 * Get physio plans for a specific patient
 */
export function usePatientPhysioPlans(patientId: string) {
  return useQuery({
    queryKey: physioKeys.patientPlans(patientId),
    queryFn: () => getPatientPhysioPlans(patientId),
    enabled: !!patientId,
  });
}

/**
 * Update a physio plan's payment status (admin payment verification)
 */
export function useUpdatePlanPaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; status: 'paid' | 'waived' }) =>
      updatePhysioPlanPaymentStatus(input.planId, input.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

/**
 * Reschedule a session to a new date
 */
export function useRescheduleSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      sessionId: string;
      newDate: string;
      reason?: string;
    }) => rescheduleSession(input.sessionId, input.newDate, input.reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: physioKeys.planSessions(data.plan_id),
      });
    },
  });
}

/**
 * Adjust session count for a plan (add or remove sessions)
 */
export function useAdjustPlanSessionCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planId: string;
      newTotalSessions: number;
      reason?: string;
    }) =>
      adjustPlanSessionCount(
        input.planId,
        input.newTotalSessions,
        input.reason,
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: physioKeys.planDetail(data.plan.plan_id),
      });
      queryClient.invalidateQueries({
        queryKey: physioKeys.planSessions(data.plan.plan_id),
      });
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

/**
 * Update sessions_approved count (paypoint/NHIS clearance)
 */
export function useUpdateSessionsApproved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; approvedCount: number }) =>
      updateSessionsApproved(input.planId, input.approvedCount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

// =============================================================================
// NHIS APPROVAL HOOKS
// =============================================================================

export function usePhysioPlanNhisApproval(planId: string) {
  return useQuery({
    queryKey: [...physioKeys.planDetail(planId), 'nhis-approval'],
    queryFn: () => getPhysioPlanNhisApproval(planId),
    enabled: !!planId,
  });
}

export function useApprovePhysioPlanNhis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planId: string;
      authorizationCode: string;
      approvedBy: string;
    }) =>
      approvePhysioPlanNhis(
        input.planId,
        input.authorizationCode,
        input.approvedBy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

export function useRejectPhysioPlanNhis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planId: string;
      rejectionReason: string;
      rejectedBy: string;
    }) =>
      rejectPhysioPlanNhis(
        input.planId,
        input.rejectionReason,
        input.rejectedBy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

export function useResubmitPhysioPlanNhis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => resubmitPhysioPlanNhis(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

/**
 * Extend a treatment plan (add sessions)
 */
export function useExtendPhysioPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePhysioPlanExtensionDTO) =>
      extendPhysioPlan(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: physioKeys.planDetail(data.plan_id),
      });
      queryClient.invalidateQueries({
        queryKey: physioKeys.planSessions(data.plan_id),
      });
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

/**
 * Get extension history for a plan
 */
export function usePhysioPlanExtensions(planId: string) {
  return useQuery({
    queryKey: physioKeys.planExtensions(planId),
    queryFn: () => getPhysioPlanExtensions(planId),
    enabled: !!planId,
  });
}

/**
 * Create a physio plan from a consultation order
 */
export function useCreatePhysioPlanFromConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      patient_id: string;
      encounter_id: string;
      prescribing_doctor_id: string;
      consultation_id?: string;
      clinical_request_id?: string;
      order: ConsultationPhysioOrderDTO;
    }) => createPhysioPlanFromConsultation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: physioKeys.plans() });
    },
  });
}

/**
 * Get unified timeline data for a physio plan (assessment + sessions + progress notes)
 */
export function usePhysioPlanTimeline(planId: string, assessmentId: string) {
  return useQuery({
    queryKey: physioKeys.planTimeline(planId),
    queryFn: () => getPhysioPlanTimeline(planId, assessmentId),
    enabled: !!planId,
  });
}
