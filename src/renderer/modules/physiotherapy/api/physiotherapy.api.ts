// =============================================================================
// Physiotherapy Module API
// =============================================================================
// Follows encounter-centric patterns from radiology.api.ts

import { supabase } from '../../../api/supabaseClient';
import { validateEncounterForModification } from '../../../lib/encounter/validation';
import { logAudit, EntityType, AuditAction } from '../../../lib/audit';
import { createBillingOrder } from '../../billing/api/billing-order.api';
import { calculateNhisServiceCoverage } from '../../billing/utils/coverage.utils';
import {
  createServiceApprovalRequest,
  getServiceApprovalStatus,
} from '../../../lib/nhis/serviceApprovalWorkflow';
import type {
  PhysioAssessmentDTO,
  CreatePhysioAssessmentDTO,
  UpdatePhysioAssessmentDTO,
  PhysioPlanDTO,
  CreatePhysioPlanDTO,
  UpdatePhysioPlanDTO,
  PhysioSessionDTO,
  CreatePhysioSessionDTO,
  PhysioProgressDTO,
  CreatePhysioProgressDTO,
  PhysioDischargeDTO,
  CreatePhysioDischargeDTO,
  PhysioPlanStatus,
  PhysioPlanExtensionDTO,
  CreatePhysioPlanExtensionDTO,
  PhysioPlanSummary,
  ConsultationPhysioOrderDTO,
} from '../types/physiotherapy.types';

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership'];
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StaffLookupRow = {
  id: string;
  staff_id?: string | null;
  first_name: string;
  last_name: string;
  role?: string | null;
};

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

async function fetchStaffLookupMap(
  staffIds: Array<string | null | undefined>,
): Promise<Map<string, StaffLookupRow>> {
  const normalizedIds = [
    ...new Set(
      staffIds
        .filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0,
        )
        .map((id) => id.trim()),
    ),
  ];

  if (!normalizedIds.length) return new Map();

  const uuidIds = normalizedIds.filter(isUuid);
  const legacyStaffIds = normalizedIds.filter((id) => !isUuid(id));

  const requests: Array<
    Promise<{ data: StaffLookupRow[] | null; error: any }>
  > = [];
  if (uuidIds.length) {
    requests.push(
      supabase
        .from('staff')
        .select('id, staff_id, first_name, last_name, role')
        .in('id', uuidIds),
    );
  }
  if (legacyStaffIds.length) {
    requests.push(
      supabase
        .from('staff')
        .select('id, staff_id, first_name, last_name, role')
        .in('staff_id', legacyStaffIds),
    );
  }

  const map = new Map<string, StaffLookupRow>();
  const results = await Promise.all(requests);
  for (const result of results) {
    if (result.error) {
      // Staff hydration is best-effort and should not break timeline rendering.
      console.warn('[Physio] Failed to resolve staff details:', result.error);
      continue;
    }

    for (const row of result.data || []) {
      map.set(row.id, row);
      if (row.staff_id) {
        map.set(row.staff_id, row);
      }
    }
  }

  return map;
}

// Helper to check if patient is NHIS (includes all NHIS categories + DHML which is Military NHIS HMO)
function isNhisPatient(insuranceType: string): boolean {
  const normalized = (insuranceType || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  return (
    normalized.includes('nhis') ||
    normalized === 'dhml' ||
    normalized === 'gifship'
  );
}

// Helper to get insurance type from visit
async function getPatientInsuranceType(encounterId: string): Promise<string> {
  const { data } = await supabase
    .from('visits')
    .select('payment_category, insurance_type')
    .eq('id', encounterId)
    .maybeSingle();

  return data?.insurance_type || data?.payment_category || 'Cash';
}

// Helper to resolve patient UUID from patient_id string
async function resolvePatientUUID(patientId: string): Promise<string | null> {
  // Try by VARCHAR patient_id first
  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (data?.id) return data.id;

  // Fallback: patientId might already be a UUID (patients.id)
  const { data: byUuid } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();

  return byUuid?.id || null;
}

/** Filters for querying physio assessments */
export interface PhysioAssessmentFilters {
  patient_id?: string;
  encounter_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  facility_id?: string;
  limit?: number;
  offset?: number;
}

/** Filters for querying physio sessions */
export interface PhysioSessionFilters {
  patient_id?: string;
  encounter_id?: string;
  plan_id?: string;
  assessment_id?: string;
  from_date?: string;
  to_date?: string;
  facility_id?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

const PHYSIO_ASSESSMENT_COLUMNS = `
  assessment_id,
  patient_id,
  encounter_id,
  consultation_id,
  facility_id,
  referral_source,
  referral_doctor_id,
  referral_diagnosis,
  referral_date,
  referral_reason,
  chief_complaint,
  complaint_duration,
  onset_type,
  onset_date,
  mechanism_of_injury,
  pain_location,
  pain_location_diagram,
  pain_score,
  pain_at_rest,
  pain_on_activity,
  pain_worst,
  pain_best,
  pain_character,
  pain_radiation,
  aggravating_factors,
  relieving_factors,
  pain_pattern,
  night_pain,
  medical_history,
  surgical_history,
  medications,
  allergies,
  occupation,
  hobbies,
  hand_dominance,
  functional_status,
  adl_status,
  mobility_status,
  gait_pattern,
  gait_aids_used,
  balance_assessment,
  fall_history,
  posture_standing,
  posture_sitting,
  posture_deviations,
  rom_joint,
  rom_notes,
  rom_flexion_active,
  rom_extension_active,
  rom_abduction_active,
  rom_adduction_active,
  rom_internal_rotation_active,
  rom_external_rotation_active,
  rom_flexion_passive,
  rom_extension_passive,
  rom_abduction_passive,
  rom_adduction_passive,
  rom_internal_rotation_passive,
  rom_external_rotation_passive,
  rom_end_feel,
  rom_pain_arc,
  muscle_groups_tested,
  muscle_strength_grades,
  muscle_strength_notes,
  sensation_intact,
  sensation_notes,
  dermatome_affected,
  myotome_affected,
  reflexes_tested,
  reflexes_normal,
  reflex_notes,
  neural_tension_tests,
  special_tests_performed,
  special_tests_findings,
  palpation_findings,
  trigger_points,
  tenderness_location,
  swelling_present,
  swelling_notes,
  previous_physio_treatment,
  previous_treatment_details,
  previous_treatment_response,
  physio_diagnosis,
  icd_codes,
  problem_list,
  short_term_goals,
  long_term_goals,
  patient_goals,
  expected_outcomes,
  estimated_sessions,
  estimated_duration_weeks,
  outcome_measures,
  red_flags,
  red_flags_present,
  yellow_flags,
  precautions,
  contraindications,
  prognosis,
  prognosis_notes,
  status,
  created_by,
  created_at,
  updated_at,
  finalized_at,
  finalized_by
`;

const PHYSIO_PLAN_COLUMNS = `
  plan_id,
  assessment_id,
  patient_id,
  encounter_id,
  facility_id,
  prescribing_doctor_id,
  consultation_id,
  sessions_completed,
  start_date,
  instructions,
  billing_type,
  clinical_request_id,
  treatment_approach,
  manual_therapy,
  manual_therapy_techniques,
  manual_therapy_parameters,
  therapeutic_exercise,
  exercises_prescribed,
  exercise_parameters,
  home_exercises,
  exercise_progression_criteria,
  electrotherapy,
  electro_modalities,
  electro_parameters,
  heat_therapy,
  heat_type,
  cold_therapy,
  cold_type,
  hydrotherapy,
  hydro_type,
  traction,
  traction_type,
  traction_parameters,
  other_modalities,
  other_modality_details,
  assistive_devices,
  assistive_device_instructions,
  frequency,
  session_duration_minutes,
  total_sessions_planned,
  patient_education,
  activity_modifications,
  ergonomic_advice,
  treatment_precautions,
  monitoring_parameters,
  re_eval_interval,
  status,
  status_reason,
  created_by,
  created_at,
  updated_at,
  approved_by,
  approved_at,
  payment_status,
  sessions_approved,
  is_nhis_plan,
  nhis_approval_id,
  nhis_approval_status,
  nhis_authorization_code
`;

const PHYSIO_SESSION_COLUMNS = `
  session_id,
  plan_id,
  assessment_id,
  patient_id,
  encounter_id,
  facility_id,
  session_number,
  session_date,
  scheduled_date,
  is_pre_generated,
  pain_score_before,
  subjective_report,
  interval_history,
  objective_findings,
  rom_changes,
  strength_changes,
  functional_changes,
  treatment_provided,
  modalities_used,
  modality_parameters,
  exercises_performed,
  exercise_sets_reps,
  manual_techniques_used,
  patient_response,
  pain_score_after,
  tolerance,
  adverse_reactions,
  progress_notes,
  compliance_level,
  plan_modifications,
  next_session_focus,
  outcome_measure_used,
  outcome_measure_score,
  attendance_status,
  treated_by,
  treated_at,
  created_at,
  updated_at,
  changes_since_last,
  swelling,
  tenderness,
  functional_limitations,
  gait_assessment,
  progress_indicator,
  home_exercise_instructions,
  plan_for_next_visit
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the currently authenticated staff member
 */
async function getCurrentStaff(): Promise<{
  id: string;
  staff_id: string;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user.email)
    .single();

  return data;
}

/**
 * Hydrate physio assessments with patient and provider data
 */
async function hydratePhysioAssessments(
  assessments: PhysioAssessmentDTO[],
): Promise<PhysioAssessmentDTO[]> {
  if (!assessments.length) return assessments;

  // Get unique patient IDs (may be VARCHAR patient_id or UUID id)
  const patientIds = [...new Set(assessments.map((a) => a.patient_id))];
  const { data: patients } = await supabase
    .from('patients')
    .select('id, patient_id, first_name, surname, date_of_birth, emr_number')
    .or(
      `patient_id.in.(${patientIds.join(',')}),id.in.(${patientIds.join(',')})`,
    );

  // Get unique staff IDs (created_by and referral_doctor_id)
  const staffIds = [
    ...new Set([
      ...assessments.filter((a) => a.created_by).map((a) => a.created_by!),
      ...assessments
        .filter((a) => a.referral_doctor_id)
        .map((a) => a.referral_doctor_id!),
    ]),
  ];
  const staffMap = await fetchStaffLookupMap(staffIds);

  // Build map keyed by both patient_id and id (UUID) for flexible lookup
  const patientMap = new Map<
    string,
    {
      patient_id: string;
      first_name: string;
      last_name: string;
      date_of_birth?: string;
      emr_number?: string;
    }
  >();
  patients?.forEach((p) => {
    const mapped = {
      patient_id: p.patient_id,
      first_name: p.first_name,
      last_name: p.surname,
      date_of_birth: p.date_of_birth,
      emr_number: p.emr_number,
    };
    patientMap.set(p.patient_id, mapped);
    patientMap.set(p.id, mapped); // Also map by UUID
  });
  return assessments.map((assessment) => ({
    ...assessment,
    patient: patientMap.get(assessment.patient_id),
    provider: assessment.created_by
      ? staffMap.get(assessment.created_by)
      : undefined,
    referrer: assessment.referral_doctor_id
      ? (() => {
          const ref = staffMap.get(assessment.referral_doctor_id);
          return ref
            ? {
                id: ref.id,
                first_name: ref.first_name,
                last_name: ref.last_name,
                title: ref.role || undefined,
              }
            : undefined;
        })()
      : undefined,
  }));
}

/**
 * Hydrate physio sessions with therapist data
 */
async function hydratePhysioSessions(
  sessions: PhysioSessionDTO[],
): Promise<PhysioSessionDTO[]> {
  if (!sessions.length) return sessions;

  const staffIds = [
    ...new Set(sessions.filter((s) => s.treated_by).map((s) => s.treated_by!)),
  ];
  const staffMap = await fetchStaffLookupMap(staffIds);

  return sessions.map((session) => ({
    ...session,
    therapist: session.treated_by
      ? staffMap.get(session.treated_by)
      : undefined,
  }));
}

/**
 * Check if a physio session has been paid for
 */
async function isPhysioSessionPaid(sessionId: string): Promise<boolean> {
  const { data: billingItem } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('source_type', 'PhysioSession')
    .eq('source_id', sessionId)
    .single();

  if (!billingItem) return false;

  const { data: order } = await supabase
    .from('billing_orders')
    .select('status')
    .eq('id', billingItem.billing_order_id)
    .single();

  return order ? PAID_STATUSES.includes(order.status) : false;
}

/**
 * Check if a physio plan's billing has been paid.
 * Looks up the billing item by service_reference_id matching the plan_id.
 * Returns: { billed: boolean, paid: boolean, billingStatus?: string }
 */
export async function checkPhysioPlanPaymentStatus(planId: string): Promise<{
  billed: boolean;
  paid: boolean;
  billingStatus?: string;
}> {
  // Find billing item for this plan
  const { data: billingItem } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .or(`item_id.eq.${planId},service_reference_id.eq.${planId}`)
    .limit(1)
    .maybeSingle();

  if (!billingItem?.billing_order_id) return { billed: false, paid: false };

  const { data: order } = await supabase
    .from('billing_orders')
    .select('status')
    .eq('id', billingItem.billing_order_id)
    .single();

  if (!order) return { billed: true, paid: false };

  return {
    billed: true,
    paid: PAID_STATUSES.includes(order.status),
    billingStatus: order.status,
  };
}

// =============================================================================
// PHYSIO ASSESSMENT CRUD
// =============================================================================

/**
 * Get physio assessments with filters
 */
export async function getPhysioAssessments(
  filters: PhysioAssessmentFilters = {},
): Promise<PhysioAssessmentDTO[]> {
  let query = supabase
    .from('physio_assessments')
    .select(PHYSIO_ASSESSMENT_COLUMNS);

  if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
  if (filters.encounter_id)
    query = query.eq('encounter_id', filters.encounter_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.facility_id) query = query.eq('facility_id', filters.facility_id);
  if (filters.from_date) query = query.gte('created_at', filters.from_date);
  if (filters.to_date) query = query.lte('created_at', filters.to_date);

  query = query.order('created_at', { ascending: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset)
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1,
    );

  const { data, error } = await query;
  if (error) throw error;

  return hydratePhysioAssessments((data || []) as PhysioAssessmentDTO[]);
}

/**
 * Get a single physio assessment by ID
 */
export async function getPhysioAssessment(
  assessmentId: string,
): Promise<PhysioAssessmentDTO | null> {
  const { data, error } = await supabase
    .from('physio_assessments')
    .select(PHYSIO_ASSESSMENT_COLUMNS)
    .eq('assessment_id', assessmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const hydrated = await hydratePhysioAssessments([
    data as PhysioAssessmentDTO,
  ]);
  return hydrated[0] || null;
}

/**
 * Get physio assessments for a patient
 */
export async function getPatientPhysioAssessments(
  patientId: string,
): Promise<PhysioAssessmentDTO[]> {
  return getPhysioAssessments({ patient_id: patientId });
}

/**
 * Get physio assessments for an encounter
 */
export async function getEncounterPhysioAssessments(
  encounterId: string,
): Promise<PhysioAssessmentDTO[]> {
  return getPhysioAssessments({ encounter_id: encounterId });
}

/**
 * Create a new physio assessment
 */
export async function createPhysioAssessment(
  input: CreatePhysioAssessmentDTO,
): Promise<PhysioAssessmentDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  // Build insert object dynamically - include all defined fields from input
  const insertData: Record<string, unknown> = {
    patient_id: input.patient_id,
    encounter_id: input.encounter_id,
    status: 'Pending',
    created_by: staff?.id,
  };

  // List of all optional fields that can be included on create
  const optionalFields: (keyof CreatePhysioAssessmentDTO)[] = [
    // Core identifiers
    'consultation_id',
    'facility_id',
    // Referral Information
    'referral_source',
    'referral_doctor_id',
    'referral_diagnosis',
    'referral_date',
    'referral_reason',
    // Chief Complaint
    'chief_complaint',
    'complaint_duration',
    'onset_type',
    'onset_date',
    'mechanism_of_injury',
    // Pain Assessment
    'pain_location',
    'pain_location_diagram',
    'pain_score',
    'pain_at_rest',
    'pain_on_activity',
    'pain_worst',
    'pain_best',
    'pain_character',
    'pain_radiation',
    'aggravating_factors',
    'relieving_factors',
    'pain_pattern',
    'night_pain',
    // History
    'medical_history',
    'surgical_history',
    'medications',
    'allergies',
    'occupation',
    'hobbies',
    'hand_dominance',
    // Functional Assessment
    'functional_status',
    'adl_status',
    'mobility_status',
    'gait_pattern',
    'gait_aids_used',
    'balance_assessment',
    'fall_history',
    // Posture Assessment
    'posture_standing',
    'posture_sitting',
    'posture_deviations',
    // Range of Motion
    'rom_joint',
    'rom_notes',
    'rom_flexion_active',
    'rom_extension_active',
    'rom_abduction_active',
    'rom_adduction_active',
    'rom_internal_rotation_active',
    'rom_external_rotation_active',
    'rom_flexion_passive',
    'rom_extension_passive',
    'rom_abduction_passive',
    'rom_adduction_passive',
    'rom_internal_rotation_passive',
    'rom_external_rotation_passive',
    'rom_end_feel',
    'rom_pain_arc',
    // Muscle Strength
    'muscle_groups_tested',
    'muscle_strength_grades',
    'muscle_strength_notes',
    // Neurological
    'sensation_intact',
    'sensation_notes',
    'dermatome_affected',
    'myotome_affected',
    'reflexes_tested',
    'reflexes_normal',
    'reflex_notes',
    'neural_tension_tests',
    // Special Tests
    'special_tests_performed',
    'special_tests_findings',
    // Palpation
    'palpation_findings',
    'trigger_points',
    'tenderness_location',
    'swelling_present',
    'swelling_notes',
    // Previous Treatment
    'previous_physio_treatment',
    'previous_treatment_details',
    'previous_treatment_response',
    // Diagnosis
    'physio_diagnosis',
    'icd_codes',
    'problem_list',
    // Goals
    'short_term_goals',
    'long_term_goals',
    'patient_goals',
    'expected_outcomes',
    'estimated_sessions',
    'estimated_duration_weeks',
    // Outcome Measures (ICF-aligned)
    'outcome_measures',
    // Precautions
    'red_flags',
    'red_flags_present',
    'yellow_flags',
    'precautions',
    'contraindications',
    // Prognosis
    'prognosis',
    'prognosis_notes',
  ];

  // Add all defined non-null values
  const inputRecord = input as unknown as Record<string, unknown>;
  optionalFields.forEach((field) => {
    const value = inputRecord[field];
    if (value !== undefined && value !== null && value !== '') {
      insertData[field] = value;
    }
  });

  const { data, error } = await supabase
    .from('physio_assessments')
    .insert(insertData)
    .select(PHYSIO_ASSESSMENT_COLUMNS)
    .single();

  if (error) throw error;

  // Update queue status to Completed - patient leaves queue after assessment is saved
  await supabase
    .from('queue')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('visit_id', input.encounter_id)
    .eq('location', 'Physiotherapy');

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.assessment_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as PhysioAssessmentDTO;
}

/**
 * Update a physio assessment
 */
export async function updatePhysioAssessment(
  assessmentId: string,
  input: UpdatePhysioAssessmentDTO,
): Promise<PhysioAssessmentDTO> {
  // Get existing assessment
  const { data: existing, error: fetchError } = await supabase
    .from('physio_assessments')
    .select('assessment_id, encounter_id, patient_id, status')
    .eq('assessment_id', assessmentId)
    .single();

  if (fetchError || !existing) throw new Error('Physio assessment not found');
  if (existing.status === 'Completed')
    throw new Error('Cannot modify completed assessment');

  await validateEncounterForModification(existing.encounter_id);

  // Build update object (exclude undefined values)
  const updateData: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      updateData[key] = value;
    }
  });
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('physio_assessments')
    .update(updateData)
    .eq('assessment_id', assessmentId)
    .select(PHYSIO_ASSESSMENT_COLUMNS)
    .single();

  if (error) throw error;

  const staff = await getCurrentStaff();
  if (staff) {
    await logAudit({
      encounterId: existing.encounter_id,
      patientId: existing.patient_id,
      action: 'UPDATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: assessmentId,
      performedBy: staff.staff_id,
      oldValue: existing,
      newValue: data,
    });
  }

  return data as PhysioAssessmentDTO;
}

/**
 * Complete a physio assessment
 */
export async function completePhysioAssessment(
  assessmentId: string,
  staffId: string,
): Promise<PhysioAssessmentDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('physio_assessments')
    .select('assessment_id, encounter_id, patient_id, status')
    .eq('assessment_id', assessmentId)
    .single();

  if (fetchError || !existing) throw new Error('Physio assessment not found');
  if (existing.status === 'Completed')
    throw new Error('Assessment already completed');

  await validateEncounterForModification(existing.encounter_id);

  const { data, error } = await supabase
    .from('physio_assessments')
    .update({
      status: 'Completed',
      finalized_at: new Date().toISOString(),
      finalized_by: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', assessmentId)
    .select(PHYSIO_ASSESSMENT_COLUMNS)
    .single();

  if (error) throw error;

  await logAudit({
    encounterId: existing.encounter_id,
    patientId: existing.patient_id,
    action: 'UPDATE' as AuditAction,
    entityType: 'consultation' as EntityType,
    entityId: assessmentId,
    performedBy: staffId,
    oldValue: existing,
    newValue: { status: 'Completed', finalized_at: data.finalized_at },
  });

  return data as PhysioAssessmentDTO;
}

// =============================================================================
// PHYSIO PLAN CRUD
// =============================================================================

/**
 * Get physio plans for an assessment
 */
export async function getPhysioPlans(
  assessmentId: string,
): Promise<PhysioPlanDTO[]> {
  const { data, error } = await supabase
    .from('physio_plans')
    .select(PHYSIO_PLAN_COLUMNS)
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PhysioPlanDTO[];
}

/**
 * Get a single physio plan by ID
 */
export async function getPhysioPlan(
  planId: string,
): Promise<PhysioPlanDTO | null> {
  const { data, error } = await supabase
    .from('physio_plans')
    .select(PHYSIO_PLAN_COLUMNS)
    .eq('plan_id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PhysioPlanDTO;
}

/**
 * Get active plan for an assessment
 */
export async function getActivePhysioPlan(
  assessmentId: string,
): Promise<PhysioPlanDTO | null> {
  const { data, error } = await supabase
    .from('physio_plans')
    .select(PHYSIO_PLAN_COLUMNS)
    .eq('assessment_id', assessmentId)
    .eq('status', 'Active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PhysioPlanDTO;
}

/**
 * Create a physio treatment plan
 */
export async function createPhysioPlan(
  input: CreatePhysioPlanDTO,
): Promise<PhysioPlanDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  // Detect NHIS patient from encounter
  const insuranceType = await getPatientInsuranceType(input.encounter_id);
  const nhis = isNhisPatient(insuranceType);

  // Resolve correct patient UUID for NHIS approval FK
  // input.patient_id is the EMR number (patients.patient_id), NOT patients.id
  // nhis_approvals.patient_id FK references patients.id
  let patientUuidForApproval = input.patient_id;
  if (nhis) {
    const { data: visitData } = await supabase
      .from('visits')
      .select('patient_id')
      .eq('id', input.encounter_id)
      .maybeSingle();
    if (visitData?.patient_id) {
      patientUuidForApproval = visitData.patient_id;
    } else {
      const resolved = await resolvePatientUUID(input.patient_id);
      if (resolved) patientUuidForApproval = resolved;
    }
  }

  // NHIS limit: max 6 sessions
  let sessionsPlanned = input.total_sessions_planned || 0;
  if (nhis && sessionsPlanned > 6) {
    sessionsPlanned = 6;
  }

  const { data, error } = await supabase
    .from('physio_plans')
    .insert({
      assessment_id: input.assessment_id,
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      facility_id: input.facility_id,
      treatment_approach: input.treatment_approach,
      manual_therapy: input.manual_therapy,
      manual_therapy_techniques: input.manual_therapy_techniques,
      manual_therapy_parameters: input.manual_therapy_parameters,
      therapeutic_exercise: input.therapeutic_exercise,
      exercises_prescribed: input.exercises_prescribed,
      exercise_parameters: input.exercise_parameters,
      home_exercises: input.home_exercises,
      electrotherapy: input.electrotherapy,
      electro_modalities: input.electro_modalities,
      electro_parameters: input.electro_parameters,
      heat_therapy: input.heat_therapy,
      heat_type: input.heat_type,
      cold_therapy: input.cold_therapy,
      cold_type: input.cold_type,
      traction: input.traction,
      traction_type: input.traction_type,
      traction_parameters: input.traction_parameters,
      assistive_devices: input.assistive_devices,
      assistive_device_instructions: input.assistive_device_instructions,
      frequency: input.frequency,
      session_duration_minutes: input.session_duration_minutes,
      total_sessions_planned: sessionsPlanned,
      patient_education: input.patient_education,
      activity_modifications: input.activity_modifications,
      ergonomic_advice: input.ergonomic_advice,
      treatment_precautions: input.treatment_precautions,
      re_eval_interval: input.re_eval_interval,
      prescribing_doctor_id: input.prescribing_doctor_id,
      consultation_id: input.consultation_id,
      start_date: input.start_date,
      instructions: input.instructions,
      billing_type: input.billing_type || 'per_session',
      clinical_request_id: input.clinical_request_id,
      sessions_completed: 0,
      status: 'Active',
      payment_status: 'pending_billing',
      is_nhis_plan: nhis,
      sessions_approved: nhis ? Math.min(sessionsPlanned, 6) : null,
    })
    .select(PHYSIO_PLAN_COLUMNS)
    .single();

  if (error) throw error;

  // AUTO-GENERATE session records if total_sessions_planned is set
  if (sessionsPlanned > 0) {
    const sessionsToCreate = [];
    const startDate = input.start_date
      ? new Date(input.start_date)
      : new Date();
    for (let i = 1; i <= sessionsPlanned; i++) {
      sessionsToCreate.push({
        plan_id: data.plan_id,
        assessment_id: input.assessment_id,
        patient_id: input.patient_id,
        encounter_id: input.encounter_id,
        facility_id: input.facility_id,
        session_number: i,
        session_date: new Date().toISOString(),
        scheduled_date: new Date(
          startDate.getTime() + (i - 1) * 2 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0],
        is_pre_generated: true,
        treatment_provided: 'Pending',
        attendance_status: 'Rescheduled',
      });
    }
    await supabase.from('physio_sessions').insert(sessionsToCreate);
  }

  // NHIS plans: submit to NHIS approval queue for pre-authorization
  if (nhis && staff) {
    try {
      const approvalResult = await createServiceApprovalRequest({
        serviceType: 'physiotherapy_plan',
        serviceId: data.plan_id,
        serviceName: `Physiotherapy Plan - ${sessionsPlanned} sessions`,
        serviceCategory: 'physiotherapy',
        encounterId: input.encounter_id,
        patientId: patientUuidForApproval,
        estimatedCost: 0, // Cost determined at billing
        requestedBy: staff.staff_id,
        clinicalJustification:
          input.instructions ||
          input.treatment_approach ||
          'Physiotherapy treatment plan',
        requestReason: 'NHIS physiotherapy plan requires pre-authorization',
      });

      if (approvalResult.approvalId) {
        await supabase
          .from('physio_plans')
          .update({
            nhis_approval_id: approvalResult.approvalId,
            nhis_approval_status:
              approvalResult.status === 'approved' ? 'approved' : 'pending',
          })
          .eq('plan_id', data.plan_id);
        data.nhis_approval_id = approvalResult.approvalId;
        data.nhis_approval_status =
          approvalResult.status === 'approved' ? 'approved' : 'pending';
      }
    } catch (err) {
      console.error('Failed to submit physio plan for NHIS approval:', err);
      // Plan is still created, just mark approval as pending
      await supabase
        .from('physio_plans')
        .update({
          nhis_approval_status: 'pending',
        })
        .eq('plan_id', data.plan_id);
      data.nhis_approval_status = 'pending';
    }
  }

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.plan_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as PhysioPlanDTO;
}

/**
 * Update a physio plan
 */
export async function updatePhysioPlan(
  planId: string,
  input: UpdatePhysioPlanDTO,
): Promise<PhysioPlanDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('physio_plans')
    .select('plan_id, encounter_id, patient_id, status')
    .eq('plan_id', planId)
    .single();

  if (fetchError || !existing) throw new Error('Physio plan not found');
  if (existing.status === 'Discharged')
    throw new Error('Cannot modify discharged plan');

  await validateEncounterForModification(existing.encounter_id);

  const updateData: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      updateData[key] = value;
    }
  });
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('physio_plans')
    .update(updateData)
    .eq('plan_id', planId)
    .select(PHYSIO_PLAN_COLUMNS)
    .single();

  if (error) throw error;

  const staff = await getCurrentStaff();
  if (staff) {
    await logAudit({
      encounterId: existing.encounter_id,
      patientId: existing.patient_id,
      action: 'UPDATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: planId,
      performedBy: staff.staff_id,
      oldValue: existing,
      newValue: data,
    });
  }

  return data as PhysioPlanDTO;
}

/**
 * Update plan status
 */
export async function updatePhysioPlanStatus(
  planId: string,
  status: PhysioPlanStatus,
  reason?: string,
): Promise<PhysioPlanDTO> {
  return updatePhysioPlan(planId, { status, status_reason: reason });
}

// =============================================================================
// PHYSIO SESSION CRUD
// =============================================================================

/**
 * Get physio sessions with filters
 */
export async function getPhysioSessions(
  filters: PhysioSessionFilters = {},
): Promise<PhysioSessionDTO[]> {
  // Include patient join for display in the queue/list views
  const selectWithPatient = `${PHYSIO_SESSION_COLUMNS}, patient:patients!physio_sessions_patient_id_fkey(id, patient_id, first_name, surname, emr_number)`;

  let query = supabase.from('physio_sessions').select(selectWithPatient);

  if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
  if (filters.encounter_id)
    query = query.eq('encounter_id', filters.encounter_id);
  if (filters.plan_id) query = query.eq('plan_id', filters.plan_id);
  if (filters.assessment_id)
    query = query.eq('assessment_id', filters.assessment_id);
  if (filters.facility_id) query = query.eq('facility_id', filters.facility_id);
  if (filters.from_date) query = query.gte('session_date', filters.from_date);
  if (filters.to_date) query = query.lte('session_date', filters.to_date);

  query = query.order('session_date', { ascending: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset)
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1,
    );

  const { data, error } = await query;
  if (error) throw error;

  // Transform patient array to object (Supabase returns array for FK joins)
  const transformedData = (data || []).map((item: any) => ({
    ...item,
    patient: Array.isArray(item.patient) ? item.patient[0] : item.patient,
  })) as unknown as PhysioSessionDTO[];

  return hydratePhysioSessions(transformedData);
}

/**
 * Get sessions for a plan
 */
export async function getPlanSessions(
  planId: string,
): Promise<PhysioSessionDTO[]> {
  return getPhysioSessions({ plan_id: planId });
}

/**
 * Get a single physio session by ID
 */
export async function getPhysioSession(
  sessionId: string,
): Promise<PhysioSessionDTO | null> {
  const { data, error } = await supabase
    .from('physio_sessions')
    .select(PHYSIO_SESSION_COLUMNS)
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const hydrated = await hydratePhysioSessions([data as PhysioSessionDTO]);
  return hydrated[0] || null;
}

/**
 * Create a physio session
 */
export async function createPhysioSession(
  input: CreatePhysioSessionDTO,
): Promise<PhysioSessionDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  // Get the next session number
  const { data: lastSession } = await supabase
    .from('physio_sessions')
    .select('session_number')
    .eq('plan_id', input.plan_id)
    .order('session_number', { ascending: false })
    .limit(1)
    .single();

  const sessionNumber = (lastSession?.session_number || 0) + 1;

  const { data, error } = await supabase
    .from('physio_sessions')
    .insert({
      plan_id: input.plan_id,
      assessment_id: input.assessment_id,
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      facility_id: input.facility_id,
      session_number: sessionNumber,
      session_date: input.session_date || new Date().toISOString(),
      pain_score_before: input.pain_score_before,
      subjective_report: input.subjective_report,
      interval_history: input.interval_history,
      objective_findings: input.objective_findings,
      treatment_provided: input.treatment_provided,
      modalities_used: input.modalities_used,
      modality_parameters: input.modality_parameters,
      exercises_performed: input.exercises_performed,
      manual_techniques_used: input.manual_techniques_used,
      patient_response: input.patient_response,
      pain_score_after: input.pain_score_after,
      tolerance: input.tolerance,
      adverse_reactions: input.adverse_reactions,
      progress_notes: input.progress_notes,
      goals_addressed: input.goals_addressed,
      next_session_plan: input.next_session_plan,
      home_program_modified: input.home_program_modified,
      home_program_changes: input.home_program_changes,
      duration_minutes: input.duration_minutes,
      attendance_status: input.attendance_status || 'Attended',
      missed_reason: input.missed_reason,
    })
    .select(PHYSIO_SESSION_COLUMNS)
    .single();

  if (error) throw error;

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.session_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as PhysioSessionDTO;
}

/**
 * Bill for a physio session.
 * Creates a billing order for the session fee.
 */
export async function billPhysioSession(
  sessionId: string,
  sessionFee: number,
): Promise<void> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  // Get the session with patient info
  const { data: session, error: fetchError } = await supabase
    .from('physio_sessions')
    .select(
      `
      session_id,
      plan_id,
      patient_id,
      encounter_id,
      session_number,
      treatment_provided,
      modalities_used
    `,
    )
    .eq('session_id', sessionId)
    .single();

  if (fetchError) throw fetchError;
  if (!session) throw new Error('Physio session not found');

  // Get patient UUID for billing
  const patientUuid = await resolvePatientUUID(session.patient_id);
  if (!patientUuid) {
    throw new Error('Patient UUID not found');
  }

  // Get insurance type for NHIS calculation
  const insuranceType = await getPatientInsuranceType(session.encounter_id);

  // Calculate pricing using proper NHIS coverage utility
  const coverage = calculateNhisServiceCoverage({
    insuranceType,
    serviceType: 'Physiotherapy',
    regularPrice: sessionFee,
    nhisPrice: null, // Physio sessions typically don't have separate NHIS prices
    isServiceNhisCovered: true,
    serviceNhisPercentage: null, // Use default based on insurance type
    quantity: 1,
  });

  // Build service name
  const modalities = session.modalities_used?.join(', ') || 'General Treatment';
  const serviceName = `Physiotherapy Session #${session.session_number}: ${modalities}`;

  // Create billing order
  await createBillingOrder({
    patient_id: patientUuid,
    encounter_id: session.encounter_id || undefined,
    source_module: 'physiotherapy',
    service_reference_id: sessionId,
    service_description: serviceName,
    service_name: serviceName,
    quantity: 1,
    unit_price: coverage.grossAmount,
    unit_cost: coverage.grossAmount,
    gross_amount: coverage.grossAmount,
    service_type: 'Physiotherapy',
    nhis_covered: coverage.isNhis,
    nhis_percentage: coverage.nhisPercentage,
    nhis_payable: coverage.nhisPayable,
    patient_payable: coverage.patientPayable,
  });

  // Audit log
  await logAudit({
    encounterId: session.encounter_id,
    patientId: session.patient_id,
    action: 'CREATE' as AuditAction,
    entityType: 'billing' as EntityType,
    entityId: sessionId,
    performedBy: staff.staff_id,
    newValue: { billing_created: true, amount: coverage.grossAmount },
  });
}

/**
 * Bill for a physio treatment plan.
 * For per-session plans, the supplied fee is treated as a session fee and multiplied by planned sessions.
 * For package plans, the supplied fee is treated as the package total.
 */
export async function billPhysioPlan(
  planId: string,
  planFee: number,
  description?: string,
): Promise<void> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  // Get the plan
  const { data: plan, error: fetchError } = await supabase
    .from('physio_plans')
    .select(
      `
      plan_id,
      patient_id,
      encounter_id,
      total_sessions_planned,
      billing_type,
      treatment_approach,
      assessment:physio_assessments!physio_plans_assessment_id_fkey(physio_diagnosis)
    `,
    )
    .eq('plan_id', planId)
    .single();

  if (fetchError) throw fetchError;
  if (!plan) throw new Error('Physio plan not found');

  // Get patient UUID for billing
  const patientUuid = await resolvePatientUUID(plan.patient_id);
  if (!patientUuid) {
    throw new Error('Patient UUID not found');
  }

  // Get insurance type for NHIS calculation
  const insuranceType = await getPatientInsuranceType(plan.encounter_id);

  const sessionCount = Math.max(1, plan.total_sessions_planned || 1);
  const isPerSessionBilling = plan.billing_type === 'per_session';
  const billedQuantity = isPerSessionBilling ? sessionCount : 1;
  const totalPlanFee = isPerSessionBilling ? planFee * sessionCount : planFee;

  // Calculate pricing using proper NHIS coverage utility
  const coverage = calculateNhisServiceCoverage({
    insuranceType,
    serviceType: 'Physiotherapy',
    regularPrice: totalPlanFee,
    nhisPrice: null, // Physio plans typically don't have separate NHIS prices
    isServiceNhisCovered: true,
    serviceNhisPercentage: null, // Use default based on insurance type
    quantity: 1,
  });

  // Build service name
  const assessment = plan.assessment as { physio_diagnosis?: string } | null;
  const diagnosis = assessment?.physio_diagnosis || 'Physiotherapy Treatment';
  const sessions = plan.total_sessions_planned || 'Multiple';
  const serviceName =
    description ||
    `Physiotherapy Plan: ${diagnosis} (${sessions} sessions${isPerSessionBilling ? `, ₦${planFee.toLocaleString()}/session` : ''})`;

  // Create billing order
  await createBillingOrder({
    patient_id: patientUuid,
    encounter_id: plan.encounter_id || undefined,
    source_module: 'physiotherapy',
    service_reference_id: planId,
    service_description: serviceName,
    service_name: serviceName,
    quantity: billedQuantity,
    unit_price: planFee,
    unit_cost: planFee,
    gross_amount: coverage.grossAmount,
    service_type: 'Physiotherapy',
    nhis_covered: coverage.isNhis,
    nhis_percentage: coverage.nhisPercentage,
    nhis_payable: coverage.nhisPayable,
    patient_payable: coverage.patientPayable,
  });

  // Update plan payment status to awaiting_payment
  await supabase
    .from('physio_plans')
    .update({
      payment_status: 'awaiting_payment',
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', planId);

  // Audit log
  await logAudit({
    encounterId: plan.encounter_id,
    patientId: plan.patient_id,
    action: 'CREATE' as AuditAction,
    entityType: 'billing' as EntityType,
    entityId: planId,
    performedBy: staff.staff_id,
    newValue: { billing_created: true, amount: coverage.grossAmount },
  });
}

/**
 * Update a physio plan's payment status.
 * Called when admin verifies payment or when plan fee is waived.
 */
export async function updatePhysioPlanPaymentStatus(
  planId: string,
  status: 'pending_billing' | 'awaiting_payment' | 'paid' | 'waived',
): Promise<void> {
  const { error } = await supabase
    .from('physio_plans')
    .update({ payment_status: status, updated_at: new Date().toISOString() })
    .eq('plan_id', planId);

  if (error) throw error;
}

/**
 * Complete a physio session with outcomes
 */
export async function completePhysioSession(
  sessionId: string,
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
  },
): Promise<PhysioSessionDTO> {
  const staff = await getCurrentStaff();
  const { data: existing, error: fetchError } = await supabase
    .from('physio_sessions')
    .select('session_id, encounter_id, patient_id, plan_id')
    .eq('session_id', sessionId)
    .single();

  if (fetchError || !existing) throw new Error('Physio session not found');

  await validateEncounterForModification(existing.encounter_id);

  // Enforce approved session limit
  const { data: plan } = await supabase
    .from('physio_plans')
    .select(
      'sessions_approved, sessions_completed, payment_status, is_nhis_plan, nhis_approval_status',
    )
    .eq('plan_id', existing.plan_id)
    .single();

  if (plan) {
    // Block NHIS plans that haven't been approved
    if (
      plan.is_nhis_plan &&
      plan.nhis_approval_status !== 'approved' &&
      plan.nhis_approval_status !== 'not_required'
    ) {
      throw new Error(
        'Cannot record session — NHIS authorization has not been approved. Awaiting NHIS admin clearance.',
      );
    }
    // Cash/private plans still require payment clearance before sessions can be recorded.
    if (
      !plan.is_nhis_plan &&
      plan.payment_status !== 'paid' &&
      plan.payment_status !== 'waived'
    ) {
      throw new Error('Cannot record session — payment has not been verified');
    }
    // Block if exceeding approved sessions
    if (
      plan.sessions_approved != null &&
      (plan.sessions_completed || 0) >= plan.sessions_approved
    ) {
      throw new Error(
        `Cannot exceed ${plan.sessions_approved} approved sessions. Request more from admin/NHIS.`,
      );
    }
  }

  const { data, error } = await supabase
    .from('physio_sessions')
    .update({
      // Subjective
      pain_score_before: input.pain_score_before,
      subjective_report: input.subjective_report,
      interval_history: input.interval_history,
      changes_since_last: input.changes_since_last,
      // Objective
      objective_findings: input.objective_findings,
      rom_changes: input.rom_changes,
      strength_changes: input.strength_changes,
      functional_changes: input.functional_changes,
      swelling: input.swelling,
      tenderness: input.tenderness,
      functional_limitations: input.functional_limitations,
      gait_assessment: input.gait_assessment,
      // Treatment
      treatment_provided: input.treatment_provided,
      modalities_used: input.modalities_used,
      modality_parameters: input.modality_parameters,
      exercises_performed: input.exercises_performed,
      exercise_sets_reps: input.exercise_sets_reps,
      manual_techniques_used: input.manual_techniques_used,
      duration_minutes: input.duration_minutes,
      // Response / Assessment
      patient_response: input.patient_response,
      pain_score_after: input.pain_score_after,
      tolerance: input.tolerance,
      adverse_reactions: input.adverse_reactions,
      progress_notes: input.progress_notes,
      goals_addressed: input.goals_addressed,
      progress_indicator: input.progress_indicator,
      compliance_level: input.compliance_level,
      plan_modifications: input.plan_modifications,
      // Plan
      next_session_focus: input.next_session_focus,
      next_session_plan: input.next_session_plan,
      home_program_modified: input.home_program_modified,
      home_program_changes: input.home_program_changes,
      home_exercise_instructions: input.home_exercise_instructions,
      plan_for_next_visit: input.plan_for_next_visit,
      // Outcome measures
      outcome_measure_used: input.outcome_measure_used,
      outcome_measure_score: input.outcome_measure_score,
      // Audit
      treated_by: input.treated_by || staff?.id || null,
      treated_at: input.treated_at,
      attendance_status: 'Attended',
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .select(PHYSIO_SESSION_COLUMNS)
    .single();

  if (error) throw error;

  await logAudit({
    encounterId: existing.encounter_id,
    patientId: existing.patient_id,
    action: 'UPDATE' as AuditAction,
    entityType: 'consultation' as EntityType,
    entityId: sessionId,
    performedBy: staff?.staff_id || input.treated_by,
    oldValue: existing,
    newValue: data,
  });

  return data as PhysioSessionDTO;
}

/**
 * Mark session as missed/cancelled
 */
export async function updateSessionAttendance(
  sessionId: string,
  status: 'Missed' | 'Cancelled' | 'Rescheduled',
  reason?: string,
): Promise<PhysioSessionDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('physio_sessions')
    .select('session_id, encounter_id')
    .eq('session_id', sessionId)
    .single();

  if (fetchError || !existing) throw new Error('Physio session not found');

  const { data, error } = await supabase
    .from('physio_sessions')
    .update({
      attendance_status: status,
      subjective_report: reason ? `${status}: ${reason}` : status,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .select(PHYSIO_SESSION_COLUMNS)
    .single();

  if (error) throw error;

  return data as PhysioSessionDTO;
}

// =============================================================================
// SESSION MANAGEMENT (Admin: reschedule, adjust count, NHIS enforcement)
// =============================================================================

/**
 * Reschedule a session — update scheduled_date for a pending/missed session
 */
export async function rescheduleSession(
  sessionId: string,
  newDate: string,
  reason?: string,
): Promise<PhysioSessionDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('physio_sessions')
    .select('session_id, attendance_status, plan_id')
    .eq('session_id', sessionId)
    .single();

  if (fetchError || !existing) throw new Error('Physio session not found');
  if (existing.attendance_status === 'Attended') {
    throw new Error('Cannot reschedule a completed session');
  }

  const { data, error } = await supabase
    .from('physio_sessions')
    .update({
      scheduled_date: newDate,
      attendance_status: 'Rescheduled',
      missed_reason: reason || `Rescheduled to ${newDate}`,
      make_up_scheduled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .select(PHYSIO_SESSION_COLUMNS)
    .single();

  if (error) throw error;
  return data as PhysioSessionDTO;
}

/**
 * Adjust plan session count — add or remove sessions.
 * Enforces: NHIS plans cannot exceed 6 sessions.
 * Enforces: Cannot go below sessions_completed.
 * Enforces: Cannot exceed sessions_approved (if set by paypoint/NHIS).
 */
export async function adjustPlanSessionCount(
  planId: string,
  newTotalSessions: number,
  reason?: string,
): Promise<{
  plan: PhysioPlanDTO;
  sessionsAdded: number;
  sessionsRemoved: number;
}> {
  const { data: plan, error: fetchError } = await supabase
    .from('physio_plans')
    .select(
      'plan_id, patient_id, encounter_id, assessment_id, facility_id, total_sessions_planned, sessions_completed, sessions_approved, is_nhis_plan, status, start_date',
    )
    .eq('plan_id', planId)
    .single();

  if (fetchError || !plan) throw new Error('Physio plan not found');
  if (plan.status !== 'Active') throw new Error('Can only adjust active plans');

  const currentTotal = plan.total_sessions_planned || 0;
  const completed = plan.sessions_completed || 0;

  // Validation: can't go below completed sessions
  if (newTotalSessions < completed) {
    throw new Error(`Cannot reduce below ${completed} completed sessions`);
  }

  // Validation: NHIS cap at 6
  if (plan.is_nhis_plan && newTotalSessions > 6) {
    throw new Error('NHIS plans cannot exceed 6 sessions');
  }

  // Validation: cannot exceed approved sessions (if set)
  if (
    plan.sessions_approved != null &&
    newTotalSessions > plan.sessions_approved
  ) {
    throw new Error(
      `Cannot exceed ${plan.sessions_approved} approved sessions`,
    );
  }

  let sessionsAdded = 0;
  let sessionsRemoved = 0;

  if (newTotalSessions > currentTotal) {
    // Add new sessions
    const toAdd = newTotalSessions - currentTotal;
    sessionsAdded = toAdd;
    const sessionsToCreate = [];
    const startDate = plan.start_date ? new Date(plan.start_date) : new Date();
    for (let i = currentTotal + 1; i <= newTotalSessions; i++) {
      sessionsToCreate.push({
        plan_id: planId,
        assessment_id: plan.assessment_id,
        patient_id: plan.patient_id,
        encounter_id: plan.encounter_id,
        facility_id: plan.facility_id,
        session_number: i,
        session_date: new Date().toISOString(),
        scheduled_date: new Date(
          startDate.getTime() + (i - 1) * 2 * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0],
        is_pre_generated: true,
        treatment_provided: 'Pending',
        attendance_status: 'Rescheduled',
      });
    }
    await supabase.from('physio_sessions').insert(sessionsToCreate);
  } else if (newTotalSessions < currentTotal) {
    // Remove un-attended sessions from the end
    sessionsRemoved = currentTotal - newTotalSessions;
    const { data: pendingSessions } = await supabase
      .from('physio_sessions')
      .select('session_id, session_number, attendance_status')
      .eq('plan_id', planId)
      .in('attendance_status', ['Rescheduled', 'Cancelled'])
      .order('session_number', { ascending: false })
      .limit(sessionsRemoved);

    if (pendingSessions && pendingSessions.length > 0) {
      const idsToRemove = pendingSessions.map(
        (s: { session_id: string }) => s.session_id,
      );
      await supabase
        .from('physio_sessions')
        .delete()
        .in('session_id', idsToRemove);
    }
  }

  // Update plan total
  const { data: updated, error: updateErr } = await supabase
    .from('physio_plans')
    .update({
      total_sessions_planned: newTotalSessions,
      status_reason:
        reason ||
        (sessionsAdded > 0
          ? `Added ${sessionsAdded} sessions`
          : `Reduced by ${sessionsRemoved} sessions`),
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', planId)
    .select(PHYSIO_PLAN_COLUMNS)
    .single();

  if (updateErr) throw updateErr;

  // Record extension if sessions were added
  if (sessionsAdded > 0) {
    await supabase.from('physio_plan_extensions').insert({
      plan_id: planId,
      previous_sessions_planned: currentTotal,
      additional_sessions: sessionsAdded,
      new_total_sessions: newTotalSessions,
      reason: reason || 'Admin adjustment',
    });
  }

  return { plan: updated as PhysioPlanDTO, sessionsAdded, sessionsRemoved };
}

/**
 * Update sessions_approved count (paypoint/NHIS clearance).
 * NHIS plans capped at 6.
 */
export async function updateSessionsApproved(
  planId: string,
  approvedCount: number,
): Promise<void> {
  const { data: plan, error: fetchError } = await supabase
    .from('physio_plans')
    .select('plan_id, is_nhis_plan')
    .eq('plan_id', planId)
    .single();

  if (fetchError || !plan) throw new Error('Physio plan not found');

  if (plan.is_nhis_plan && approvedCount > 6) {
    throw new Error('NHIS plans cannot approve more than 6 sessions');
  }

  const { error } = await supabase
    .from('physio_plans')
    .update({
      sessions_approved: approvedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', planId);

  if (error) throw error;
}

// =============================================================================
// NHIS APPROVAL MANAGEMENT
// =============================================================================

/**
 * Get NHIS approval status for a physio plan
 */
export async function getPhysioPlanNhisApproval(planId: string): Promise<{
  nhis_approval_status: string | null;
  nhis_approval_id: string | null;
  nhis_authorization_code: string | null;
  approval_details?: {
    status: string;
    decidedBy?: string;
    decidedAt?: string;
    rejectionReason?: string;
  } | null;
}> {
  const { data: plan, error } = await supabase
    .from('physio_plans')
    .select('nhis_approval_status, nhis_approval_id, nhis_authorization_code')
    .eq('plan_id', planId)
    .single();

  if (error || !plan) throw new Error('Physio plan not found');

  let approval_details = null;
  if (plan.nhis_approval_id) {
    approval_details =
      (await getServiceApprovalStatus('physiotherapy_plan', planId)) || null;
  }

  return {
    nhis_approval_status: plan.nhis_approval_status,
    nhis_approval_id: plan.nhis_approval_id,
    nhis_authorization_code: plan.nhis_authorization_code,
    approval_details,
  };
}

/**
 * Approve a physio plan's NHIS request and store the authorization code.
 * Called when NHIS admin approves through the NHIS approval queue.
 */
export async function approvePhysioPlanNhis(
  planId: string,
  authorizationCode: string,
  approvedBy: string,
): Promise<void> {
  if (!authorizationCode?.trim()) {
    throw new Error('NHIS authorization code is required');
  }

  const { data: plan, error: fetchError } = await supabase
    .from('physio_plans')
    .select('plan_id, nhis_approval_id, is_nhis_plan')
    .eq('plan_id', planId)
    .single();

  if (fetchError || !plan) throw new Error('Physio plan not found');
  if (!plan.is_nhis_plan) throw new Error('Plan is not an NHIS plan');

  // Update the plan with approval and auth code
  const { error } = await supabase
    .from('physio_plans')
    .update({
      nhis_approval_status: 'approved',
      nhis_authorization_code: authorizationCode.trim(),
      payment_status: 'waived',
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', planId);

  if (error) throw error;

  // Also update the nhis_approvals record if it exists
  if (plan.nhis_approval_id) {
    await supabase
      .from('nhis_approvals')
      .update({
        status: 'approved',
        decided_by: approvedBy,
        decided_at: new Date().toISOString(),
        decision_notes: `Authorization code: ${authorizationCode.trim()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.nhis_approval_id);
  }
}

/**
 * Reject a physio plan's NHIS request.
 * Called when NHIS admin rejects through the NHIS approval queue.
 */
export async function rejectPhysioPlanNhis(
  planId: string,
  rejectionReason: string,
  rejectedBy: string,
): Promise<void> {
  const { data: plan, error: fetchError } = await supabase
    .from('physio_plans')
    .select('plan_id, nhis_approval_id, is_nhis_plan')
    .eq('plan_id', planId)
    .single();

  if (fetchError || !plan) throw new Error('Physio plan not found');
  if (!plan.is_nhis_plan) throw new Error('Plan is not an NHIS plan');

  const { error } = await supabase
    .from('physio_plans')
    .update({
      nhis_approval_status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', planId);

  if (error) throw error;

  if (plan.nhis_approval_id) {
    await supabase
      .from('nhis_approvals')
      .update({
        status: 'rejected',
        decided_by: rejectedBy,
        decided_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.nhis_approval_id);
  }
}

/**
 * Re-submit a rejected NHIS physio plan for approval
 */
export async function resubmitPhysioPlanNhis(planId: string): Promise<void> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  const { data: plan, error: fetchError } = await supabase
    .from('physio_plans')
    .select(
      'plan_id, patient_id, encounter_id, total_sessions_planned, is_nhis_plan, nhis_approval_status, instructions, treatment_approach',
    )
    .eq('plan_id', planId)
    .single();

  if (fetchError || !plan) throw new Error('Physio plan not found');
  if (!plan.is_nhis_plan) throw new Error('Plan is not an NHIS plan');
  if (plan.nhis_approval_status !== 'rejected')
    throw new Error('Can only re-submit rejected plans');

  // Resolve correct patient UUID (plan.patient_id is EMR number, not patients.id)
  const { data: resubVisit } = await supabase
    .from('visits')
    .select('patient_id')
    .eq('id', plan.encounter_id)
    .maybeSingle();
  const resubPatientUuid = resubVisit?.patient_id || (await resolvePatientUUID(plan.patient_id)) || plan.patient_id;

  const approvalResult = await createServiceApprovalRequest({
    serviceType: 'physiotherapy_plan',
    serviceId: plan.plan_id,
    serviceName: `Physiotherapy Plan - ${plan.total_sessions_planned || 0} sessions (re-submission)`,
    serviceCategory: 'physiotherapy',
    encounterId: plan.encounter_id,
    patientId: resubPatientUuid,
    estimatedCost: 0,
    requestedBy: staff.staff_id,
    clinicalJustification:
      plan.instructions ||
      plan.treatment_approach ||
      'Physiotherapy treatment plan',
    requestReason: 'NHIS physiotherapy plan re-submission after rejection',
  });

  await supabase
    .from('physio_plans')
    .update({
      nhis_approval_id: approvalResult.approvalId || plan.plan_id,
      nhis_approval_status: 'pending',
      nhis_authorization_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq('plan_id', planId);
}

// =============================================================================
// PROGRESS & DISCHARGE
// =============================================================================

/**
 * Get physio progress notes
 */
export async function getPhysioProgressNotes(
  assessmentId: string,
): Promise<PhysioProgressDTO[]> {
  const { data, error } = await supabase
    .from('physio_progress')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('evaluation_date', { ascending: false });

  if (error) throw error;
  return (data || []) as PhysioProgressDTO[];
}

/**
 * Create a progress note (re-evaluation)
 */
export async function createPhysioProgressNote(
  input: CreatePhysioProgressDTO,
): Promise<PhysioProgressDTO> {
  // encounter_id is optional in CreatePhysioProgressDTO
  if (input.encounter_id) {
    await validateEncounterForModification(input.encounter_id);
  }

  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('physio_progress')
    .insert({
      assessment_id: input.assessment_id,
      plan_id: input.plan_id,
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      facility_id: input.facility_id,
      evaluation_type: input.evaluation_type,
      evaluation_date: input.evaluation_date || new Date().toISOString(),
      session_number_at_eval: input.session_number_at_eval,
      pain_score: input.pain_score,
      rom_data: input.rom_data,
      strength_data: input.strength_data,
      functional_score: input.functional_score,
      outcome_measure_used: input.outcome_measure_used,
      outcome_score: input.outcome_score,
      goals_achieved: input.goals_achieved,
      goals_in_progress: input.goals_in_progress,
      goals_not_achieved: input.goals_not_achieved,
      progress_summary: input.progress_summary,
      clinical_reasoning: input.clinical_reasoning,
      barriers_to_progress: input.barriers_to_progress,
      plan_modified: input.plan_modified,
      modifications_made: input.modifications_made,
      new_goals: input.new_goals,
      continue_therapy: input.continue_therapy,
      sessions_remaining: input.sessions_remaining,
      ready_for_discharge: input.ready_for_discharge,
      discharge_recommendations: input.discharge_recommendations,
    })
    .select('*')
    .single();

  if (error) throw error;

  if (staff && input.encounter_id) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.progress_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as PhysioProgressDTO;
}

/**
 * Get discharge summary for an assessment
 */
export async function getPhysioDischarge(
  assessmentId: string,
): Promise<PhysioDischargeDTO | null> {
  const { data, error } = await supabase
    .from('physio_discharges')
    .select('*')
    .eq('assessment_id', assessmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PhysioDischargeDTO;
}

/**
 * Create a discharge summary
 */
export async function createPhysioDischarge(
  input: CreatePhysioDischargeDTO,
): Promise<PhysioDischargeDTO> {
  // Note: CreatePhysioDischargeDTO doesn't include encounter_id in the type
  // The discharge is based on the assessment which is already linked to an encounter

  const staff = await getCurrentStaff();

  // Get encounter_id from the assessment for auditing
  const { data: assessment } = await supabase
    .from('physio_assessments')
    .select('encounter_id')
    .eq('assessment_id', input.assessment_id)
    .single();

  const { data, error } = await supabase
    .from('physio_discharges')
    .insert({
      assessment_id: input.assessment_id,
      plan_id: input.plan_id,
      patient_id: input.patient_id,
      facility_id: input.facility_id,
      discharge_date: input.discharge_date || new Date().toISOString(),
      discharge_reason: input.discharge_reason,
      initial_diagnosis: input.initial_diagnosis,
      initial_presentation: input.initial_presentation,
      total_sessions_attended: input.total_sessions_attended,
      total_sessions_missed: input.total_sessions_missed,
      duration_of_care: input.duration_of_care,
      initial_pain: input.initial_pain,
      final_pain: input.final_pain,
      initial_rom: input.initial_rom,
      final_rom: input.final_rom,
      initial_strength: input.initial_strength,
      final_strength: input.final_strength,
      initial_functional_status: input.initial_functional_status,
      final_functional_status: input.final_functional_status,
      goals_summary: input.goals_summary,
      discharge_instructions: input.discharge_instructions,
      home_exercise_program: input.home_exercise_program,
      activity_guidelines: input.activity_guidelines,
      precautions: input.precautions,
      follow_up_recommended: input.follow_up_recommended,
      follow_up_interval: input.follow_up_interval,
      return_criteria: input.return_criteria,
      referred_to: input.referred_to,
      referral_reason: input.referral_reason,
      patient_satisfaction: input.patient_satisfaction,
      patient_feedback: input.patient_feedback,
    })
    .select('*')
    .single();

  if (error) throw error;

  // Update the plan status to Discharged
  if (input.plan_id) {
    await supabase
      .from('physio_plans')
      .update({ status: 'Discharged', status_reason: input.discharge_reason })
      .eq('plan_id', input.plan_id);
  }

  if (staff && assessment?.encounter_id) {
    await logAudit({
      encounterId: assessment.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.discharge_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as PhysioDischargeDTO;
}

// =============================================================================
// PAIN TREND
// =============================================================================

/**
 * Get pain score trend for a patient's physio treatment
 */
export async function getPatientPainTrend(assessmentId: string): Promise<
  Array<{
    session_number: number;
    session_date: string;
    pain_before?: number;
    pain_after?: number;
  }>
> {
  const { data, error } = await supabase
    .from('physio_sessions')
    .select('session_number, session_date, pain_score_before, pain_score_after')
    .eq('assessment_id', assessmentId)
    .eq('attendance_status', 'Attended')
    .order('session_number', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    session_number: row.session_number,
    session_date: row.session_date,
    pain_before: row.pain_score_before,
    pain_after: row.pain_score_after,
  }));
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get physiotherapy statistics
 */
export async function getPhysioStats(
  therapistId?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{
  total_assessments: number;
  assessments_by_status: Record<string, number>;
  total_sessions: number;
  sessions_attended: number;
  sessions_missed: number;
  avg_sessions_per_case: number;
  common_diagnoses: Array<{ diagnosis: string; count: number }>;
}> {
  let assessmentsQuery = supabase
    .from('physio_assessments')
    .select('assessment_id, status, physio_diagnosis', { count: 'exact' });
  let sessionsQuery = supabase
    .from('physio_sessions')
    .select('session_id, attendance_status, assessment_id', { count: 'exact' });

  if (therapistId) {
    assessmentsQuery = assessmentsQuery.eq('created_by', therapistId);
    sessionsQuery = sessionsQuery.eq('treated_by', therapistId);
  }
  if (dateFrom) {
    assessmentsQuery = assessmentsQuery.gte('created_at', dateFrom);
    sessionsQuery = sessionsQuery.gte('session_date', dateFrom);
  }
  if (dateTo) {
    assessmentsQuery = assessmentsQuery.lte('created_at', dateTo);
    sessionsQuery = sessionsQuery.lte('session_date', dateTo);
  }

  const [assessmentsResult, sessionsResult] = await Promise.all([
    assessmentsQuery,
    sessionsQuery,
  ]);

  const assessments = assessmentsResult.data || [];
  const sessions = sessionsResult.data || [];

  // Count assessments by status
  const assessmentsByStatus: Record<string, number> = {};
  assessments.forEach((a) => {
    assessmentsByStatus[a.status] = (assessmentsByStatus[a.status] || 0) + 1;
  });

  // Count sessions by attendance
  let sessionsAttended = 0;
  let sessionsMissed = 0;
  sessions.forEach((s) => {
    if (s.attendance_status === 'Attended') sessionsAttended++;
    else if (s.attendance_status === 'Missed') sessionsMissed++;
  });

  // Count sessions per assessment
  const sessionsPerAssessment: Record<string, number> = {};
  sessions.forEach((s) => {
    sessionsPerAssessment[s.assessment_id] =
      (sessionsPerAssessment[s.assessment_id] || 0) + 1;
  });
  const avgSessions =
    Object.keys(sessionsPerAssessment).length > 0
      ? Object.values(sessionsPerAssessment).reduce((a, b) => a + b, 0) /
        Object.keys(sessionsPerAssessment).length
      : 0;

  // Count diagnoses
  const diagnosisCounts: Record<string, number> = {};
  assessments.forEach((a) => {
    if (a.physio_diagnosis) {
      diagnosisCounts[a.physio_diagnosis] =
        (diagnosisCounts[a.physio_diagnosis] || 0) + 1;
    }
  });

  const commonDiagnoses = Object.entries(diagnosisCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total_assessments: assessmentsResult.count || assessments.length,
    assessments_by_status: assessmentsByStatus,
    total_sessions: sessionsResult.count || sessions.length,
    sessions_attended: sessionsAttended,
    sessions_missed: sessionsMissed,
    avg_sessions_per_case: Math.round(avgSessions * 10) / 10,
    common_diagnoses: commonDiagnoses,
  };
}

// =============================================================================
// TREATMENT PLAN WORKFLOW — NEW FUNCTIONS
// =============================================================================

/**
 * Get all active physio plans (for Physiotherapy Dashboard)
 * Returns plans with patient info and session counts
 */
export async function getActivePhysioPlans(
  filters: {
    status?: PhysioPlanStatus;
    patient_id?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PhysioPlanSummary[]> {
  let query = supabase
    .from('physio_plans')
    .select(PHYSIO_PLAN_COLUMNS)
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.in('status', ['Active', 'On_Hold']);
  }
  if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset)
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1,
    );

  const { data, error } = await query;
  if (error) throw error;

  if (!data?.length) return [];

  // Hydrate with patient and doctor info
  const patientIds = [...new Set(data.map((p) => p.patient_id))];
  const doctorIds = [
    ...new Set(
      data
        .filter((p) => p.prescribing_doctor_id)
        .map((p) => p.prescribing_doctor_id),
    ),
  ];

  const [patientsResult, doctorsResult] = await Promise.all([
    supabase
      .from('patients')
      .select('id, patient_id, first_name, surname, emr_number, date_of_birth')
      .or(
        `patient_id.in.(${patientIds.join(',')}),id.in.(${patientIds.join(',')})`,
      ),
    doctorIds.length > 0
      ? fetchStaffLookupMap(doctorIds)
      : Promise.resolve(new Map<string, StaffLookupRow>()),
  ]);

  // Build map keyed by both patient_id and id (UUID) for flexible lookup
  const patientMap = new Map<
    string,
    {
      patient_id: string;
      first_name: string;
      last_name: string;
      emr_number?: string;
    }
  >();
  patientsResult.data?.forEach((p) => {
    const mapped = {
      patient_id: p.patient_id,
      first_name: p.first_name,
      last_name: p.surname,
      emr_number: p.emr_number,
    };
    patientMap.set(p.patient_id, mapped);
    patientMap.set(p.id, mapped); // Also map by UUID
  });
  const doctorMap = doctorsResult as Map<string, StaffLookupRow>;

  return data.map((plan) => ({
    plan_id: plan.plan_id,
    patient_id: plan.patient_id,
    encounter_id: plan.encounter_id,
    assessment_id: plan.assessment_id,
    total_sessions_planned: plan.total_sessions_planned || 0,
    sessions_completed: plan.sessions_completed || 0,
    sessions_remaining: Math.max(
      0,
      (plan.total_sessions_planned || 0) - (plan.sessions_completed || 0),
    ),
    status: plan.status,
    start_date: plan.start_date,
    frequency: plan.frequency,
    instructions: plan.instructions,
    billing_type: plan.billing_type,
    payment_status: plan.payment_status || 'pending_billing',
    sessions_approved: plan.sessions_approved ?? null,
    is_nhis_plan: plan.is_nhis_plan || false,
    nhis_approval_id: plan.nhis_approval_id ?? null,
    nhis_approval_status: plan.nhis_approval_status ?? null,
    nhis_authorization_code: plan.nhis_authorization_code ?? null,
    treatment_approach: plan.treatment_approach,
    created_at: plan.created_at,
    patient: patientMap.get(plan.patient_id),
    prescribing_doctor: plan.prescribing_doctor_id
      ? (() => {
          const doctor = doctorMap.get(plan.prescribing_doctor_id);
          return doctor
            ? {
                id: doctor.id,
                first_name: doctor.first_name,
                last_name: doctor.last_name,
                title: doctor.role || undefined,
              }
            : undefined;
        })()
      : undefined,
  })) as PhysioPlanSummary[];
}

/**
 * Get plan summaries for a specific patient (for patient record display)
 */
export async function getPatientPhysioPlans(
  patientId: string,
): Promise<PhysioPlanSummary[]> {
  return getActivePhysioPlans({
    patient_id: patientId,
    status: undefined as unknown as PhysioPlanStatus,
  });
}

/**
 * Extend a treatment plan by adding more sessions
 */
export async function extendPhysioPlan(
  input: CreatePhysioPlanExtensionDTO,
): Promise<PhysioPlanExtensionDTO> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  // Get current plan
  const { data: plan, error: planError } = await supabase
    .from('physio_plans')
    .select(
      'plan_id, patient_id, encounter_id, assessment_id, facility_id, total_sessions_planned, status, is_nhis_plan, sessions_approved, nhis_approval_id',
    )
    .eq('plan_id', input.plan_id)
    .single();

  if (planError || !plan) throw new Error('Treatment plan not found');
  if (plan.status !== 'Active' && plan.status !== 'On_Hold') {
    throw new Error('Can only extend active or on-hold plans');
  }

  const previousTotal = plan.total_sessions_planned || 0;
  const newTotal = previousTotal + input.additional_sessions;

  // NHIS enforcement: extensions beyond 6 sessions are allowed but require
  // NHIS pre-authorization. The approval flow (below) will route it to the
  // NHIS desk. Non-NHIS plans have no session cap.

  // Cannot exceed approved sessions (unless requesting an increase via extension)
  // For NHIS plans, the extension itself IS the request for more approved sessions,
  // so we skip this guard — NHIS desk will approve/reject the new total.
  if (
    !plan.is_nhis_plan &&
    plan.sessions_approved != null &&
    newTotal > plan.sessions_approved
  ) {
    throw new Error(
      `Cannot exceed ${plan.sessions_approved} approved sessions. Request more from admin.`,
    );
  }

  // Update plan total
  // NHIS plans: immediately reset approval status to 'pending' so sessions
  // stay locked until the NHIS desk clears the extension request.
  const planUpdate: Record<string, unknown> = {
    total_sessions_planned: newTotal,
    status: 'Active',
    updated_at: new Date().toISOString(),
  };
  if (plan.is_nhis_plan) {
    planUpdate.nhis_approval_status = 'pending';
    planUpdate.payment_status = 'pending_billing';
  }
  const { error: updateError } = await supabase
    .from('physio_plans')
    .update(planUpdate)
    .eq('plan_id', input.plan_id);

  if (updateError) throw updateError;

  // Log the extension
  const { data: extension, error: extensionError } = await supabase
    .from('physio_plan_extensions')
    .insert({
      plan_id: input.plan_id,
      previous_sessions_planned: previousTotal,
      additional_sessions: input.additional_sessions,
      new_total_sessions: newTotal,
      reason: input.reason,
      extended_by: staff.id,
    })
    .select('*')
    .single();

  if (extensionError) throw extensionError;

  // Auto-generate the additional session records
  const { data: lastSession } = await supabase
    .from('physio_sessions')
    .select('session_number')
    .eq('plan_id', input.plan_id)
    .order('session_number', { ascending: false })
    .limit(1)
    .single();

  const startSessionNum = (lastSession?.session_number || previousTotal) + 1;
  const today = new Date();
  const newSessions = [];

  for (let i = 0; i < input.additional_sessions; i++) {
    newSessions.push({
      plan_id: plan.plan_id,
      assessment_id: plan.assessment_id,
      patient_id: plan.patient_id,
      encounter_id: plan.encounter_id,
      facility_id: plan.facility_id,
      session_number: startSessionNum + i,
      session_date: new Date().toISOString(),
      scheduled_date: new Date(today.getTime() + i * 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      is_pre_generated: true,
      treatment_provided: 'Pending',
      attendance_status: 'Rescheduled',
    });
  }

  if (newSessions.length > 0) {
    await supabase.from('physio_sessions').insert(newSessions);
  }

  // Non-NHIS plans: auto-bill the additional sessions immediately.
  // NHIS plans: NO billing order here. Billing is deferred until the NHIS
  // desk approves the extension. On approval, if < 100% coverage,
  // a billing order for the copay is created; if 100%, payment is waived.
  if (input.session_fee && input.session_fee > 0 && !plan.is_nhis_plan) {
    const totalExtensionFee = input.session_fee * input.additional_sessions;

    // Get patient UUID for billing
    const patientUuid = await resolvePatientUUID(plan.patient_id);
    if (!patientUuid) throw new Error('Patient UUID not found');

    const insuranceType = await getPatientInsuranceType(plan.encounter_id);
    const coverage = calculateNhisServiceCoverage({
      insuranceType,
      serviceType: 'Physiotherapy',
      regularPrice: totalExtensionFee,
      nhisPrice: null,
      isServiceNhisCovered: true,
      serviceNhisPercentage: null,
      quantity: 1,
    });

    const serviceName = `Physiotherapy Extension: +${input.additional_sessions} sessions (₦${input.session_fee}/session)`;

    await createBillingOrder({
      patient_id: patientUuid,
      encounter_id: plan.encounter_id || undefined,
      source_module: 'physiotherapy',
      service_reference_id: plan.plan_id,
      service_description: serviceName,
      service_name: serviceName,
      quantity: input.additional_sessions,
      unit_price: input.session_fee,
      unit_cost: input.session_fee,
      gross_amount: coverage.grossAmount,
      service_type: 'Physiotherapy',
      nhis_covered: coverage.isNhis,
      nhis_percentage: coverage.nhisPercentage,
      nhis_payable: coverage.nhisPayable,
      patient_payable: coverage.patientPayable,
    });

    // Lock plan: set payment_status to awaiting_payment so sessions are blocked until payment
    await supabase
      .from('physio_plans')
      .update({
        payment_status: 'awaiting_payment',
        updated_at: new Date().toISOString(),
      })
      .eq('plan_id', plan.plan_id);
  }

  // NHIS plans: submit extension to NHIS approval queue for pre-authorization
  if (plan.is_nhis_plan && staff) {
    try {
      // Resolve correct patient UUID (plan.patient_id is EMR number, not patients.id)
      const { data: extVisit } = await supabase
        .from('visits')
        .select('patient_id')
        .eq('id', plan.encounter_id)
        .maybeSingle();
      const extPatientUuid = extVisit?.patient_id || (await resolvePatientUUID(plan.patient_id)) || plan.patient_id;

      const approvalResult = await createServiceApprovalRequest({
        serviceType: 'physiotherapy_plan_extension',
        serviceId: plan.plan_id,
        serviceName: `Physiotherapy Plan Extension - +${input.additional_sessions} sessions (new total: ${newTotal})`,
        serviceCategory: 'physiotherapy',
        encounterId: plan.encounter_id,
        patientId: extPatientUuid,
        estimatedCost: input.session_fee
          ? input.session_fee * input.additional_sessions
          : 0,
        requestedBy: staff.staff_id,
        clinicalJustification:
          input.reason || 'Patient requires additional physiotherapy sessions',
        requestReason:
          'NHIS physiotherapy plan extension requires pre-authorization',
      });

      // Lock plan for NHIS approval — sessions stay blocked until NHIS desk clears
      await supabase
        .from('physio_plans')
        .update({
          nhis_approval_status:
            approvalResult.status === 'approved' ? 'approved' : 'pending',
          nhis_approval_id: approvalResult.approvalId || plan.nhis_approval_id,
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', plan.plan_id);
    } catch (err) {
      // Extension is still created, just mark approval as pending
      await supabase
        .from('physio_plans')
        .update({
          nhis_approval_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', plan.plan_id);
    }
  }

  await logAudit({
    encounterId: plan.encounter_id,
    patientId: plan.patient_id,
    action: 'UPDATE' as AuditAction,
    entityType: 'consultation' as EntityType,
    entityId: plan.plan_id,
    performedBy: staff.staff_id,
    newValue: {
      extension: true,
      additional_sessions: input.additional_sessions,
      new_total: newTotal,
      billed: !!input.session_fee,
    },
  });

  return extension as PhysioPlanExtensionDTO;
}

/**
 * Get extensions for a plan
 */
export async function getPhysioPlanExtensions(
  planId: string,
): Promise<PhysioPlanExtensionDTO[]> {
  const { data, error } = await supabase
    .from('physio_plan_extensions')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PhysioPlanExtensionDTO[];
}

// =============================================================================
// TIMELINE DATA — Aggregated chronological view for plan timeline UI
// =============================================================================

export type PhysioTimelineEntryType =
  | 'assessment'
  | 'session'
  | 'progress_note';

export interface PhysioTimelineEntry {
  id: string;
  type: PhysioTimelineEntryType;
  date: string;
  /** For sessions only */
  session_number?: number;
  /** Assessment/progress note title or session label */
  title: string;
  /** Pain scores (sessions) */
  pain_before?: number;
  pain_after?: number;
  /** Session fields */
  treatment_provided?: string;
  modalities_used?: string[];
  manual_techniques_used?: string;
  exercises_performed?: string;
  patient_response?: string;
  tolerance?: string;
  adverse_reactions?: string;
  attendance_status?: string;
  progress_indicator?: string;
  swelling?: string;
  tenderness?: string;
  home_exercise_instructions?: string;
  plan_for_next_visit?: string;
  subjective_report?: string;
  changes_since_last?: string;
  objective_findings?: string;
  rom_changes?: string;
  strength_changes?: string;
  functional_changes?: string;
  functional_limitations?: string;
  gait_assessment?: string;
  progress_notes?: string;
  compliance_level?: string;
  /** Assessment fields */
  chief_complaint?: string;
  physio_diagnosis?: string;
  prognosis?: string;
  short_term_goals?: string;
  long_term_goals?: string;
  referral_source?: string;
  referral_diagnosis?: string;
  /** Progress note fields */
  evaluation_type?: string;
  progress_summary?: string;
  goals_achieved?: string[];
  goals_in_progress?: string[];
  plan_modified?: boolean;
  modifications_made?: string;
  continue_therapy?: boolean;
  ready_for_discharge?: boolean;
  /** Staff who performed/created */
  staff_name?: string;
  staff_role?: string;
}

/**
 * Get a unified chronological timeline for a physiotherapy plan.
 * Merges: assessment, completed sessions, and progress notes.
 */
export async function getPhysioPlanTimeline(
  planId: string,
  assessmentId: string,
): Promise<PhysioTimelineEntry[]> {
  // Fetch all data in parallel
  const [sessions, assessment, progressNotes] = await Promise.all([
    getPlanSessions(planId),
    assessmentId ? getPhysioAssessment(assessmentId) : Promise.resolve(null),
    assessmentId ? getPhysioProgressNotes(assessmentId) : Promise.resolve([]),
  ]);

  const timelineStaffIds = [
    assessment?.created_by,
    ...sessions.map((s) => s.treated_by),
    ...progressNotes.map((pn) => pn.evaluated_by || (pn as any).created_by),
  ];
  const staffMap = await fetchStaffLookupMap(timelineStaffIds);

  const entries: PhysioTimelineEntry[] = [];

  // 1. Assessment (Initial Assessment entry)
  if (assessment) {
    const staff = assessment.provider as
      | (typeof assessment.provider & { role?: string; title?: string })
      | undefined;
    const fallbackStaff = assessment.created_by
      ? staffMap.get(assessment.created_by)
      : undefined;
    entries.push({
      id: assessment.assessment_id,
      type: 'assessment',
      date: assessment.created_at,
      title: 'Physiotherapy Initial Assessment',
      chief_complaint: assessment.chief_complaint,
      physio_diagnosis: assessment.physio_diagnosis,
      prognosis: assessment.prognosis,
      short_term_goals: assessment.short_term_goals,
      long_term_goals: assessment.long_term_goals,
      referral_source: assessment.referral_source,
      referral_diagnosis: assessment.referral_diagnosis,
      pain_before: assessment.pain_score,
      staff_name: staff
        ? `${staff.first_name} ${staff.last_name}`
        : fallbackStaff
          ? `${fallbackStaff.first_name} ${fallbackStaff.last_name}`
          : undefined,
      staff_role:
        staff?.role || staff?.title || fallbackStaff?.role || undefined,
    });
  }

  // 2. Sessions (all statuses for full timeline picture)
  for (const s of sessions) {
    const staff = s.therapist as
      | (typeof s.therapist & { role?: string; title?: string })
      | undefined;
    const fallbackStaff = s.treated_by ? staffMap.get(s.treated_by) : undefined;
    entries.push({
      id: s.session_id,
      type: 'session',
      date: s.session_date || s.scheduled_date || s.created_at,
      session_number: s.session_number,
      title: `Session ${s.session_number}`,
      pain_before: s.pain_score_before,
      pain_after: s.pain_score_after,
      treatment_provided: s.treatment_provided,
      modalities_used: s.modalities_used,
      manual_techniques_used: s.manual_techniques_used,
      exercises_performed: s.exercises_performed,
      patient_response: s.patient_response,
      tolerance: s.tolerance,
      adverse_reactions: s.adverse_reactions,
      attendance_status: s.attendance_status,
      progress_indicator: s.progress_indicator,
      swelling: s.swelling,
      tenderness: s.tenderness,
      home_exercise_instructions: s.home_exercise_instructions,
      plan_for_next_visit: s.plan_for_next_visit,
      subjective_report: s.subjective_report,
      changes_since_last: s.changes_since_last,
      objective_findings: s.objective_findings,
      rom_changes: s.rom_changes,
      strength_changes: s.strength_changes,
      functional_changes: s.functional_changes,
      functional_limitations: s.functional_limitations,
      gait_assessment: s.gait_assessment,
      progress_notes: s.progress_notes,
      compliance_level: s.compliance_level,
      staff_name: staff
        ? `${staff.first_name} ${staff.last_name}`
        : fallbackStaff
          ? `${fallbackStaff.first_name} ${fallbackStaff.last_name}`
          : undefined,
      staff_role:
        staff?.role || staff?.title || fallbackStaff?.role || undefined,
    });
  }

  // 3. Progress notes (re-evaluations / follow-up consultation notes)
  for (const pn of progressNotes) {
    const staff = pn.evaluator as
      | (typeof pn.evaluator & { role?: string; title?: string })
      | undefined;
    const noteStaffId = pn.evaluated_by || (pn as any).created_by;
    const fallbackStaff = noteStaffId ? staffMap.get(noteStaffId) : undefined;
    entries.push({
      id: pn.progress_id,
      type: 'progress_note',
      date: pn.evaluation_date || pn.created_at,
      title:
        pn.evaluation_type === 'Discharge'
          ? 'Physiotherapy Discharge Summary'
          : pn.evaluation_type === 'Re_Evaluation'
            ? 'Physiotherapy Follow-up Re-evaluation'
            : `Physiotherapy ${pn.evaluation_type?.replace(/_/g, ' ') || 'Consultation Note'}`,
      evaluation_type: pn.evaluation_type,
      progress_summary: pn.progress_summary,
      pain_before: pn.pain_score,
      goals_achieved: pn.goals_achieved,
      goals_in_progress: pn.goals_in_progress,
      plan_modified: pn.plan_modified,
      modifications_made: pn.modifications_made,
      continue_therapy: pn.continue_therapy,
      ready_for_discharge: pn.ready_for_discharge,
      staff_name: staff
        ? `${staff.first_name} ${staff.last_name}`
        : fallbackStaff
          ? `${fallbackStaff.first_name} ${fallbackStaff.last_name}`
          : undefined,
      staff_role:
        staff?.role || staff?.title || fallbackStaff?.role || undefined,
    });
  }

  // Sort chronologically, NEWEST first (reverse for display)
  entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return entries;
}

/**
 * Create a physio treatment plan from a consultation order
 * Called when a doctor orders physiotherapy during consultation
 */
export async function createPhysioPlanFromConsultation(params: {
  patient_id: string;
  encounter_id: string;
  prescribing_doctor_id: string;
  consultation_id?: string;
  clinical_request_id?: string;
  order: ConsultationPhysioOrderDTO;
}): Promise<PhysioPlanDTO> {
  const plan = await createPhysioPlan({
    assessment_id: '', // Will be linked when physio team creates assessment
    patient_id: params.patient_id,
    encounter_id: params.encounter_id,
    prescribing_doctor_id: params.prescribing_doctor_id,
    consultation_id: params.consultation_id,
    clinical_request_id: params.clinical_request_id,
    total_sessions_planned: params.order.sessions_prescribed,
    frequency: params.order.frequency,
    start_date: params.order.start_date,
    instructions: params.order.instructions,
    billing_type: params.order.billing_type || 'per_session',
    session_duration_minutes: params.order.session_duration_minutes,
  });

  return plan;
}
