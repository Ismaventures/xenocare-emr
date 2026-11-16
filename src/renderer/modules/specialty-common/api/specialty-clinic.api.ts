/**
 * =============================================================================
 * SPECIALTY CLINIC API
 * =============================================================================
 * Supabase API calls for:
 * - Clinic triage observations (CRUD)
 * - Clinic triage configs (read)
 * - Specialty order sets (read, facility-created)
 * - Specialty care plans (CRUD)
 * - Care plan sessions (CRUD)
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';
import type {
  ClinicTriageConfig,
  ClinicTriageObservation,
  CreateTriageObservationDTO,
  SpecialtyCareplan,
  CreateCareplanDTO,
  CareplanSession,
  CreateSessionDTO,
  CompleteSessionDTO,
  SpecialtyOrderSet,
} from '../dtos/specialty-clinic.dto';
import { getSystemOrderSets } from '../constants/order-sets';

// =============================================================================
// Helpers
// =============================================================================

/** Returns true when the error is a "table not found" from PostgREST (migration not yet applied) */
function isTableNotFound(error: any): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

// =============================================================================
// Triage Observations
// =============================================================================

const TRIAGE_OBS_COLUMNS = `
  id, patient_id, encounter_id, clinic_type,
  observation_type, observation_value, observation_unit,
  observation_category, normal_range, is_abnormal,
  performed_by, performed_at, notes, created_at
`;

/** Get triage configs for a specialty */
export async function getTriageConfigs(
  specialtyCode: string,
): Promise<ClinicTriageConfig[]> {
  const { data, error } = await supabase
    .from('clinic_triage_configs')
    .select('*')
    .eq('specialty_code', specialtyCode)
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  return (data || []).map((c) => ({
    ...c,
    options: c.options
      ? typeof c.options === 'string'
        ? JSON.parse(c.options)
        : c.options
      : undefined,
  }));
}

/** Get triage observations for an encounter */
export async function getTriageObservations(
  encounterId: string,
): Promise<ClinicTriageObservation[]> {
  const { data, error } = await supabase
    .from('clinic_triage_observations')
    .select(TRIAGE_OBS_COLUMNS)
    .eq('encounter_id', encounterId)
    .order('performed_at', { ascending: true });

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  return data || [];
}

/** Get triage observations for an encounter filtered by clinic type */
export async function getTriageObservationsByClinic(
  encounterId: string,
  clinicType: string,
): Promise<ClinicTriageObservation[]> {
  const { data, error } = await supabase
    .from('clinic_triage_observations')
    .select(TRIAGE_OBS_COLUMNS)
    .eq('encounter_id', encounterId)
    .eq('clinic_type', clinicType)
    .order('performed_at', { ascending: true });

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  return data || [];
}

/** Record a batch of triage observations (nurse submits all at once) */
export async function createTriageObservations(
  observations: CreateTriageObservationDTO[],
): Promise<ClinicTriageObservation[]> {
  if (observations.length === 0) return [];

  const { data, error } = await supabase
    .from('clinic_triage_observations')
    .insert(observations)
    .select(TRIAGE_OBS_COLUMNS);

  if (error) throw error;
  return data || [];
}

// =============================================================================
// Order Sets
// =============================================================================

/** Get order sets for a specialty (system defaults + facility custom) */
export async function getOrderSets(
  specialtyCode: string,
): Promise<SpecialtyOrderSet[]> {
  const systemSets = getSystemOrderSets(specialtyCode);

  // Also fetch facility-custom sets from DB
  const { data: dbSets, error } = await supabase
    .from('specialty_order_sets')
    .select('*')
    .eq('specialty_code', specialtyCode)
    .eq('is_active', true)
    .order('set_name');

  // If the table doesn't exist yet (migration 201 not applied), return system sets only
  if (error) {
    if (isTableNotFound(error)) return systemSets;
    throw error;
  }

  const facilitySets: SpecialtyOrderSet[] = (dbSets || []).map((s) => ({
    ...s,
    orders: typeof s.orders === 'string' ? JSON.parse(s.orders) : s.orders,
  }));

  return [...systemSets, ...facilitySets];
}

// =============================================================================
// Care Plans
// =============================================================================

const CAREPLAN_COLUMNS = `
  id, patient_id, encounter_id, specialty_code,
  plan_type, plan_name, status, diagnosis, goals,
  baseline_data, total_sessions, frequency, expected_duration,
  nhis_code, billing_category, created_by, created_at, updated_at
`;

/** Get all care plans for a patient, optionally filtered by specialty */
export async function getPatientCareplans(
  patientId: string,
  specialtyCode?: string,
): Promise<SpecialtyCareplan[]> {
  let query = supabase
    .from('specialty_careplans')
    .select(CAREPLAN_COLUMNS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (specialtyCode) {
    query = query.eq('specialty_code', specialtyCode);
  }

  const { data, error } = await query;
  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  return data || [];
}

/** Get a single care plan with session count */
export async function getCareplanById(
  careplanId: string,
): Promise<SpecialtyCareplan | null> {
  const { data, error } = await supabase
    .from('specialty_careplans')
    .select(CAREPLAN_COLUMNS)
    .eq('id', careplanId)
    .maybeSingle();

  if (error) {
    if (isTableNotFound(error)) return null;
    throw error;
  }
  return data;
}

/** Create a new care plan */
export async function createCareplan(
  dto: CreateCareplanDTO,
): Promise<SpecialtyCareplan> {
  const { data, error } = await supabase
    .from('specialty_careplans')
    .insert({
      patient_id: dto.patient_id,
      encounter_id: dto.encounter_id || null,
      specialty_code: dto.specialty_code,
      plan_type: dto.plan_type,
      plan_name: dto.plan_name,
      status: 'Active',
      diagnosis: dto.diagnosis || [],
      goals: dto.goals || [],
      baseline_data: dto.baseline_data || {},
      total_sessions: dto.total_sessions || null,
      frequency: dto.frequency || null,
      expected_duration: dto.expected_duration || null,
      nhis_code: dto.nhis_code || null,
      billing_category: dto.billing_category || 'GENERAL',
      created_by: dto.created_by,
    })
    .select(CAREPLAN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

/** Update care plan status */
export async function updateCareplanStatus(
  careplanId: string,
  status: 'Active' | 'Completed' | 'Cancelled' | 'On_Hold',
): Promise<SpecialtyCareplan> {
  const { data, error } = await supabase
    .from('specialty_careplans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', careplanId)
    .select(CAREPLAN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// Care Plan Sessions
// =============================================================================

const SESSION_COLUMNS = `
  id, careplan_id, session_number, status,
  scheduled_date, completed_date, session_data,
  notes, assessment, plan_for_next,
  recorded_by, billing_id, created_at
`;

/** Get all sessions for a care plan */
export async function getCareplanSessions(
  careplanId: string,
): Promise<CareplanSession[]> {
  const { data, error } = await supabase
    .from('careplan_sessions')
    .select(SESSION_COLUMNS)
    .eq('careplan_id', careplanId)
    .order('session_number', { ascending: true });

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  return data || [];
}

/** Get all sessions across all care plans for a patient, optionally filtered by specialty */
export async function getPatientCareplanSessions(
  patientId: string,
  specialtyCode?: string,
): Promise<(CareplanSession & { plan_name: string; plan_type: string; careplan_status: string })[]> {
  // Query from specialty_careplans (proven to work) and embed sessions
  let query = supabase
    .from('specialty_careplans')
    .select(`
      id, plan_name, plan_type, status,
      careplan_sessions (
        ${SESSION_COLUMNS}
      )
    `)
    .eq('patient_id', patientId);

  if (specialtyCode) {
    query = query.eq('specialty_code', specialtyCode);
  }

  const { data, error } = await query;

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }

  // Flatten: each care plan has an array of sessions
  const results: (CareplanSession & { plan_name: string; plan_type: string; careplan_status: string })[] = [];

  for (const plan of data || []) {
    const sessions = (plan as Record<string, unknown>).careplan_sessions;
    if (!Array.isArray(sessions)) continue;
    for (const row of sessions as Record<string, unknown>[]) {
      results.push({
        id: row.id as string,
        careplan_id: row.careplan_id as string,
        session_number: row.session_number as number,
        status: row.status as CareplanSession['status'],
        scheduled_date: row.scheduled_date as string | undefined,
        completed_date: row.completed_date as string | undefined,
        session_data: (row.session_data ?? {}) as Record<string, unknown>,
        notes: row.notes as string | undefined,
        assessment: row.assessment as string | undefined,
        plan_for_next: row.plan_for_next as string | undefined,
        recorded_by: row.recorded_by as string | undefined,
        billing_id: row.billing_id as string | undefined,
        created_at: row.created_at as string,
        plan_name: (plan.plan_name as string) ?? '',
        plan_type: (plan.plan_type as string) ?? '',
        careplan_status: (plan.status as string) ?? '',
      });
    }
  }

  // Sort newest-first
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return results;
}

/** Create a new session (schedule it) */
export async function createSession(
  dto: CreateSessionDTO,
): Promise<CareplanSession> {
  const { data, error } = await supabase
    .from('careplan_sessions')
    .insert({
      careplan_id: dto.careplan_id,
      session_number: dto.session_number,
      status: dto.status || 'Scheduled',
      scheduled_date: dto.scheduled_date || null,
      completed_date: dto.completed_date || null,
      session_data: dto.session_data || {},
      notes: dto.notes || null,
      assessment: dto.assessment || null,
      plan_for_next: dto.plan_for_next || null,
      recorded_by: dto.recorded_by || null,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

/** Complete a session (record data) */
export async function completeSession(
  sessionId: string,
  dto: CompleteSessionDTO,
): Promise<CareplanSession> {
  const { data, error } = await supabase
    .from('careplan_sessions')
    .update({
      status: 'Completed',
      completed_date: new Date().toISOString(),
      session_data: dto.session_data,
      notes: dto.notes || null,
      assessment: dto.assessment || null,
      plan_for_next: dto.plan_for_next || null,
      recorded_by: dto.recorded_by,
    })
    .eq('id', sessionId)
    .select(SESSION_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

/** Update session status (e.g. mark as Missed or Cancelled) */
export async function updateSessionStatus(
  sessionId: string,
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled',
): Promise<CareplanSession> {
  const { data, error } = await supabase
    .from('careplan_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select(SESSION_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// Active care plans by specialty (for dashboards)
// =============================================================================

/** Get all active care plans for a specialty clinic (all patients) */
export async function getActiveCarePlansBySpecialty(
  specialtyCode: string,
  statusFilter?: ('Active' | 'On_Hold' | 'Completed' | 'Cancelled')[],
): Promise<SpecialtyCareplan[]> {
  let query = supabase
    .from('specialty_careplans')
    .select(
      `
      id, patient_id, encounter_id, specialty_code,
      plan_type, plan_name, status, diagnosis, goals,
      baseline_data, total_sessions, frequency, expected_duration,
      created_by, created_at, updated_at,
      patient:patients(id, first_name, surname, emr_number, date_of_birth, gender),
      creator:staff!specialty_careplans_created_by_fkey(id, first_name, last_name)
    `,
    )
    .eq('specialty_code', specialtyCode);

  const statuses = statusFilter && statusFilter.length > 0
    ? statusFilter
    : ['Active', 'On_Hold'];
  query = query.in('status', statuses);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any as SpecialtyCareplan[];
}

// =============================================================================
// Consultation Addendums
// =============================================================================

export interface ConsultationAddendum {
  id: string;
  consultation_id: string;
  note_text: string;
  created_by: string | null;
  created_at: string;
  staff?: { first_name: string; last_name: string; role: string } | null;
}

/** Get all addendum notes for a consultation */
export async function getConsultationAddendums(
  consultationId: string,
): Promise<ConsultationAddendum[]> {
  const { data, error } = await supabase
    .from('consultation_addendums')
    .select(
      `
      id, consultation_id, note_text, created_by, created_at,
      staff(first_name, last_name, role)
    `,
    )
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any as ConsultationAddendum[];
}

/** Add an addendum note to a completed consultation */
export async function addConsultationAddendum(
  consultationId: string,
  noteText: string,
  createdBy: string,
): Promise<ConsultationAddendum> {
  const { data, error } = await supabase
    .from('consultation_addendums')
    .insert({
      consultation_id: consultationId,
      note_text: noteText,
      created_by: createdBy,
    })
    .select(
      `id, consultation_id, note_text, created_by, created_at, staff(first_name, last_name, role)`,
    )
    .single();

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any as ConsultationAddendum;
}
