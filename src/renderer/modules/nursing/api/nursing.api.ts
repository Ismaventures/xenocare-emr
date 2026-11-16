import { supabase } from '../../../api/supabaseClient';
import {
  NursingCareDTO,
  CreateNursingCareDTO,
  UpdateNursingCareDTO,
  NursingCareFilters,
  NursingCareStats,
  VitalSignsData,
  Vitals,
  CreateVitalsDTO,
  UpdateVitalsDTO,
  VitalsFilters,
  NursingQueue,
  QueueFilters,
  NursingStats,
  TimelineEvent,
} from '../dtos/nursing.dto';
import { Patient, Staff } from '../../../types/database.types';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('NursingAPI');

// =============================================================================
// VITALS API FUNCTIONS (New dedicated vitals table)
// =============================================================================

/**
 * Get vitals records with filters
 */
export async function getVitals(
  filters: VitalsFilters = {},
): Promise<Vitals[]> {
  let query = supabase
    .from('vitals')
    .select(
      `
      *,
      patient:patients!vitals_patient_id_fkey(patient_id, first_name, surname, date_of_birth, gender),
      nurse:staff!vitals_nurse_id_fkey(staff_id, first_name, last_name),
      encounter:visits!vitals_encounter_id_fkey(visit_id, encounter_number, visit_type)
    `,
    )
    .order('date_recorded', { ascending: false });

  if (filters.patient_id) {
    // Resolve external patient_id (e.g. PT-00001) to internal UUID if needed
    const resolvedPatientId =
      (await resolvePatientUuid(filters.patient_id)) || filters.patient_id;
    query = query.eq('patient_id', resolvedPatientId);
  }

  if (filters.encounter_id) {
    query = query.eq('encounter_id', filters.encounter_id);
  }

  if (filters.nurse_id) {
    query = query.eq('nurse_id', filters.nurse_id);
  }

  if (filters.date_from) {
    query = query.gte('date_recorded', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('date_recorded', filters.date_to);
  }

  if (filters.is_critical !== undefined) {
    query = query.eq('is_critical', filters.is_critical);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching vitals:', error);
    throw error;
  }

  return (data || []) as Vitals[];
}

/**
 * Get single vitals record by ID
 */
export async function getVitalsById(vitalsId: string): Promise<Vitals | null> {
  const { data, error } = await supabase
    .from('vitals')
    .select(
      `
      *,
      patient:patients!vitals_patient_id_fkey(patient_id, first_name, surname, date_of_birth, gender),
      nurse:staff!vitals_nurse_id_fkey(staff_id, first_name, last_name),
      encounter:visits!vitals_encounter_id_fkey(visit_id, encounter_number, visit_type)
    `,
    )
    .eq('id', vitalsId)
    .single();

  if (error) {
    log.error('Error fetching vitals:', error);
    throw error;
  }

  return data as Vitals | null;
}

/**
 * Map raw vitals records into the legacy nursing DTO while enriching lookups.
 */
function mapVitalsRecordToCare(
  record: any,
  fallbackPatientIdentifier?: string,
  lookups?: NursingCareLookups,
): NursingCareDTO {
  const recordId =
    record?.id ??
    record?.vitals_id ??
    record?.vitalsId ??
    record?.care_id ??
    null;

  const vitalSigns: VitalSignsData = {
    temperature: normalizeNumericValue(record?.temperature),
    pulse: normalizeNumericValue(record?.pulse),
    blood_pressure_systolic: normalizeNumericValue(
      record?.blood_pressure_systolic,
    ),
    blood_pressure_diastolic: normalizeNumericValue(
      record?.blood_pressure_diastolic,
    ),
    respiratory_rate: normalizeNumericValue(record?.respiratory_rate),
    oxygen_saturation: normalizeNumericValue(record?.oxygen_saturation),
    weight: normalizeNumericValue(record?.weight),
    height: normalizeNumericValue(record?.height),
    bmi: normalizeNumericValue(record?.bmi),
    blood_glucose: normalizeNumericValue(record?.blood_glucose),
    pain_level: normalizeNumericValue(record?.pain_level),
  };

  const patientIdentifier =
    record?.patient?.id ??
    record?.patient?.patient_id ??
    fallbackPatientIdentifier ??
    record?.patient_id ??
    record?.patientId ??
    null;

  const nurseIdentifier =
    record?.nurse?.id ??
    record?.nurse?.staff_id ??
    record?.nurse_id ??
    record?.nurseId ??
    null;

  const encounterIdentifier =
    record?.encounter?.id ??
    record?.encounter?.visit_id ??
    record?.encounter_id ??
    record?.visit_id ??
    record?.encounterId ??
    null;

  const resolvedPatient =
    record?.patient ||
    (patientIdentifier ? lookups?.patients.get(patientIdentifier) : undefined);
  const resolvedNurse =
    record?.nurse ||
    (nurseIdentifier ? lookups?.staff.get(nurseIdentifier) : undefined);

  const createdAt =
    normalizeTimestamp(record?.date_recorded) ||
    normalizeTimestamp(record?.created_at) ||
    new Date().toISOString();

  const updatedAt =
    normalizeTimestamp(record?.updated_at) ||
    normalizeTimestamp(record?.date_recorded) ||
    normalizeTimestamp(record?.created_at) ||
    createdAt;

  return {
    care_id: (recordId ?? '').toString(),
    patient_id: (
      resolvedPatient?.patient_id ||
      patientIdentifier ||
      ''
    ).toString(),
    visit_id: encounterIdentifier ? encounterIdentifier.toString() : null,
    nurse_id: (
      resolvedNurse?.staff_id ||
      resolvedNurse?.id ||
      nurseIdentifier ||
      ''
    ).toString(),
    care_type: 'Vital Signs',
    notes: record?.notes ?? null,
    next_care_time: null,
    vital_signs: vitalSigns,
    ward: null,
    bed_number: null,
    created_at: createdAt,
    updated_at: updatedAt,
    patient: resolvedPatient || undefined,
    nurse: resolvedNurse || undefined,
  };
}
/**
 * Delete vitals record
 */
export async function deleteVitals(vitalsId: string): Promise<void> {
  const { error } = await supabase
    .from('vitals')
    .delete()
    .eq('vitals_id', vitalsId);

  if (error) {
    log.error('Error deleting vitals:', error);
    throw error;
  }
}

/**
 * Get patient's latest vitals
 */
export async function getPatientLatestVitals(
  patientId: string,
): Promise<Vitals | null> {
  // Resolve external patient_id (e.g. PT-00001) to internal UUID if needed
  const resolvedPatientId = (await resolvePatientUuid(patientId)) || patientId;

  const { data, error } = await supabase
    .from('vitals')
    .select(
      `
      *,
      nurse:staff(staff_id, first_name, last_name)
    `,
    )
    .eq('patient_id', resolvedPatientId)
    .order('date_recorded', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    log.error('Error fetching latest vitals:', error);
    throw error;
  }

  return data as Vitals | null;
}

/**
 * Get critical vitals (for alerts)
 */
export async function getCriticalVitals(): Promise<Vitals[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('vitals')
    .select(
      `
      *,
      patient:patients!vitals_patient_id_fkey(patient_id, first_name, surname),
      nurse:staff!vitals_nurse_id_fkey(staff_id, first_name, last_name)
    `,
    )
    .eq('is_critical', true)
    .gte('date_recorded', today)
    .order('date_recorded', { ascending: false });

  if (error) {
    log.error('Error fetching critical vitals:', error);
    throw error;
  }

  return (data || []) as Vitals[];
}

// =============================================================================
// Helpers for legacy nursing care compatibility
// =============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NursingCareLookups = {
  patients: Map<string, Patient>;
  staff: Map<string, Staff>;
};

async function resolvePatientUuid(
  identifier?: string | null,
): Promise<string | null> {
  if (!identifier) return null;

  // If the identifier is a UUID, try to find by id first (avoids VARCHAR = UUID error)
  if (UUID_REGEX.test(identifier)) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('id', identifier)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }

      // UUID was passed but patient not found by id - try by patient_id as fallback
      // (Some systems might store UUID-like strings in patient_id VARCHAR column)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', identifier)
        .maybeSingle();

      if (!fallbackError && fallbackData?.id) {
        return fallbackData.id;
      }

      if (error && !['PGRST116', '42703'].includes(error.code ?? '')) {
        log.error('Failed patient lookup by id:', error);
      }

      // UUID format but patient not found - return null, not the invalid UUID
      log.warn(`Patient with UUID ${identifier} not found in database`);
      return null;
    } catch (lookupError) {
      log.error('Patient resolution (by id) threw:', lookupError);
      return null;
    }
  }

  // Try resolving by patient_id (legacy EMR number like 'PT-00001')
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', identifier)
      .maybeSingle();

    if (!error && data?.id) {
      return data.id;
    }

    // Fallback: Check emr_number (Primary Hospital ID like 'NDC-0001')
    const { data: emrData, error: emrError } = await supabase
      .from('patients')
      .select('id')
      .eq('emr_number', identifier)
      .maybeSingle();

    if (!emrError && emrData?.id) {
      return emrData.id;
    }

    if (error && !['PGRST116', '42703'].includes(error.code ?? '')) {
      log.error('Failed patient lookup by patient_id:', error);
    }
  } catch (lookupError) {
    log.error('Patient resolution (by patient_id) threw:', lookupError);
  }

  // Patient not found by any method
  log.warn(`Patient with identifier ${identifier} not found`);
  return null;
}

async function resolveVisitUuid(
  identifier?: string | null,
): Promise<string | null> {
  if (!identifier) return null;

  // If the identifier is a UUID, try to find by id first (avoids VARCHAR = UUID error)
  if (UUID_REGEX.test(identifier)) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('id')
        .eq('id', identifier)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }

      if (error && !['PGRST116', '42703'].includes(error.code ?? '')) {
        log.error('Failed visit lookup by id:', error);
      }
    } catch (lookupError) {
      log.error('Visit resolution (by id) threw:', lookupError);
    }
  }

  // Try resolving by visit_id (legacy visit number like 'V-00001')
  // Only do this for non-UUID identifiers to avoid VARCHAR = UUID comparison error
  if (!UUID_REGEX.test(identifier)) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('id')
        .eq('visit_id', identifier)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }

      if (error && !['PGRST116', '42703'].includes(error.code ?? '')) {
        log.error('Failed visit lookup by visit_id:', error);
      }
    } catch (lookupError) {
      log.error('Visit resolution (by visit_id) threw:', lookupError);
    }
  }

  return identifier;
}

async function resolveStaffUuid(
  identifier?: string | null,
): Promise<string | null> {
  if (!identifier) return null;

  // If the identifier is a UUID, try to find by id first (avoids VARCHAR = UUID error)
  if (UUID_REGEX.test(identifier)) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('id', identifier)
        .maybeSingle();

      if (!error && data) {
        return data.id ?? data.staff_id ?? identifier;
      }

      if (error && !['PGRST116', '42703'].includes(error.code ?? '')) {
        log.error('Failed staff lookup by id:', error);
      }
    } catch (lookupError) {
      log.error('Staff resolution (by id) threw:', lookupError);
    }
  }

  // Try resolving by staff_id (legacy staff number)
  // Only do this for non-UUID identifiers to avoid VARCHAR = UUID comparison error
  if (!UUID_REGEX.test(identifier)) {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('staff_id', identifier)
        .maybeSingle();

      if (!error && data) {
        return data.id ?? data.staff_id ?? identifier;
      }

      if (error && !['PGRST116', '42703'].includes(error.code ?? '')) {
        log.error('Failed staff lookup by staff_id:', error);
      }
    } catch (lookupError) {
      log.error('Staff resolution (by staff_id) threw:', lookupError);
    }
  }

  return identifier;
}

function determineCriticalFlag(vitalSigns?: VitalSignsData | null): boolean {
  if (!vitalSigns) return false;

  const oxygenSaturation = normalizeNumericValue(vitalSigns.oxygen_saturation);
  const temperature = normalizeNumericValue(vitalSigns.temperature);
  const pulse = normalizeNumericValue(vitalSigns.pulse);
  const systolic = normalizeNumericValue(vitalSigns.blood_pressure_systolic);
  const diastolic = normalizeNumericValue(vitalSigns.blood_pressure_diastolic);

  if (oxygenSaturation !== undefined && oxygenSaturation < 92) {
    return true;
  }

  if (temperature !== undefined && (temperature > 39.5 || temperature < 35)) {
    return true;
  }

  if (pulse !== undefined && (pulse > 120 || pulse < 50)) {
    return true;
  }

  if (systolic !== undefined && (systolic > 180 || systolic < 90)) {
    return true;
  }

  if (diastolic !== undefined && (diastolic > 110 || diastolic < 50)) {
    return true;
  }

  return false;
}

function buildVitalsPayload(vitalSigns?: VitalSignsData | null) {
  if (!vitalSigns) return {} as Record<string, unknown>;

  const payload: Record<string, unknown> = {};

  const {
    temperature,
    pulse,
    blood_pressure_systolic,
    blood_pressure_diastolic,
    respiratory_rate,
    oxygen_saturation,
    weight,
    height,
    bmi,
    blood_glucose,
    pain_level,
  } = vitalSigns;

  const normalizedTemperature = normalizeNumericValue(temperature);
  const normalizedPulse = normalizeNumericValue(pulse);
  const normalizedSystolic = normalizeNumericValue(blood_pressure_systolic);
  const normalizedDiastolic = normalizeNumericValue(blood_pressure_diastolic);
  const normalizedRespiratory = normalizeNumericValue(respiratory_rate);
  const normalizedOxygen = normalizeNumericValue(oxygen_saturation);
  const normalizedWeight = normalizeNumericValue(weight);
  const normalizedHeight = normalizeNumericValue(height);
  const normalizedBmi = normalizeNumericValue(bmi);
  const normalizedGlucose = normalizeNumericValue(blood_glucose);
  const normalizedPain = normalizeNumericValue(pain_level);

  if (normalizedTemperature !== undefined)
    payload.temperature = normalizedTemperature;
  if (normalizedPulse !== undefined) payload.pulse = normalizedPulse;
  if (normalizedSystolic !== undefined)
    payload.blood_pressure_systolic = normalizedSystolic;
  if (normalizedDiastolic !== undefined)
    payload.blood_pressure_diastolic = normalizedDiastolic;
  if (normalizedSystolic !== undefined && normalizedDiastolic !== undefined) {
    payload.blood_pressure = `${normalizedSystolic}/${normalizedDiastolic}`;
  }
  if (normalizedRespiratory !== undefined)
    payload.respiratory_rate = normalizedRespiratory;
  if (normalizedOxygen !== undefined)
    payload.oxygen_saturation = normalizedOxygen;
  if (normalizedWeight !== undefined) payload.weight = normalizedWeight;
  if (normalizedHeight !== undefined) payload.height = normalizedHeight;
  if (normalizedBmi !== undefined) payload.bmi = normalizedBmi;
  if (normalizedGlucose !== undefined)
    payload.blood_glucose = normalizedGlucose;
  if (normalizedPain !== undefined) payload.pain_level = normalizedPain;

  return payload;
}

function normalizeNumericValue(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    value = trimmed;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  return numeric;
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }

  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

async function fetchPatientsByIdentifiers(
  identifiers: Array<string | null | undefined>,
): Promise<Map<string, Patient>> {
  const map = new Map<string, Patient>();
  const unique = Array.from(
    new Set(
      identifiers
        .filter((id): id is string => !!id)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );

  if (!unique.length) {
    return map;
  }

  const uuidIdentifiers = unique.filter((id) => UUID_REGEX.test(id));
  const legacyIdentifiers = unique.filter((id) => !UUID_REGEX.test(id));

  const addPatient = (patient: Patient) => {
    if (!patient) return;
    if (patient.id) {
      map.set(patient.id, patient);
    }
    if ((patient as any).patient_id) {
      map.set((patient as any).patient_id, patient);
    }
  };

  if (uuidIdentifiers.length) {
    const { data, error } = await supabase
      .from('patients')
      .select(
        'id, patient_id, first_name, surname, date_of_birth, gender, blood_group',
      )
      .in('id', uuidIdentifiers);

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to fetch patients by id:', error);
    }

    data?.forEach((patient) => addPatient(patient as Patient));
  }

  const remainingLegacy = legacyIdentifiers.filter((id) => !map.has(id));

  if (remainingLegacy.length) {
    const { data, error } = await supabase
      .from('patients')
      .select(
        'id, patient_id, first_name, surname, date_of_birth, gender, blood_group',
      )
      .in('patient_id', remainingLegacy);

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to fetch patients by patient_id:', error);
    }

    data?.forEach((patient) => addPatient(patient as Patient));
  }

  return map;
}

async function fetchStaffByIdentifiers(
  identifiers: Array<string | null | undefined>,
): Promise<Map<string, Staff>> {
  const map = new Map<string, Staff>();
  const unique = Array.from(
    new Set(
      identifiers
        .filter((id): id is string => !!id)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );

  if (!unique.length) {
    return map;
  }

  const uuidIdentifiers = unique.filter((id) => UUID_REGEX.test(id));
  const legacyIdentifiers = unique.filter((id) => !UUID_REGEX.test(id));

  const addStaff = (staff: Staff) => {
    if (!staff) return;
    if ((staff as any).id) {
      map.set((staff as any).id, staff);
    }
    if ((staff as any).staff_id) {
      map.set((staff as any).staff_id, staff);
    }
  };

  if (uuidIdentifiers.length) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, staff_id, first_name, last_name, email, role')
      .in('id', uuidIdentifiers);

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to fetch staff by id:', error);
    }

    data?.forEach((staff) => addStaff(staff as Staff));
  }

  const remainingLegacy = legacyIdentifiers.filter((id) => !map.has(id));

  if (remainingLegacy.length) {
    const { data, error } = await supabase
      .from('staff')
      .select('id, staff_id, first_name, last_name, email, role')
      .in('staff_id', remainingLegacy);

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to fetch staff by staff_id:', error);
    }

    data?.forEach((staff) => addStaff(staff as Staff));
  }

  return map;
}

async function buildNursingCareLookups(
  records: any[],
  extraPatientIdentifiers: Array<string | null | undefined> = [],
  extraStaffIdentifiers: Array<string | null | undefined> = [],
): Promise<NursingCareLookups> {
  const patientIdentifiers: Array<string | null | undefined> = [];
  const staffIdentifiers: Array<string | null | undefined> = [];

  records.forEach((record) => {
    patientIdentifiers.push(
      record?.patient?.id,
      record?.patient?.patient_id,
      record?.patient_id,
      record?.patientId,
    );

    staffIdentifiers.push(
      record?.nurse?.id,
      record?.nurse?.staff_id,
      record?.nurse_id,
      record?.nurseId,
    );
  });

  patientIdentifiers.push(...extraPatientIdentifiers);
  staffIdentifiers.push(...extraStaffIdentifiers);

  const [patients, staff] = await Promise.all([
    fetchPatientsByIdentifiers(patientIdentifiers),
    fetchStaffByIdentifiers(staffIdentifiers),
  ]);

  return { patients, staff };
}

// =============================================================================
// QUEUE API FUNCTIONS (Updated with encounter and clinic support)
// =============================================================================

/**
 * Get nursing queue
 */
export async function getNursingQueue(
  filters: QueueFilters = {},
): Promise<NursingQueue[]> {
  let query = supabase
    .from('queue')
    .select(
      `
      *,
      patient:patients(patient_id, first_name, surname, date_of_birth, gender),
      encounter:visits!queue_encounter_id_fkey(visit_id, encounter_number, visit_type, chief_complaint),
      clinic:clinics(clinic_id, clinic_name, clinic_code),
      assigned_staff:staff!queue_assigned_to_fkey(staff_id, first_name, last_name)
    `,
    )
    .eq('location', 'Nursing')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }

  if (filters.clinic_id) {
    query = query.eq('clinic_id', filters.clinic_id);
  }

  if (filters.date) {
    query = query.gte('created_at', filters.date);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching nursing queue:', error);
    throw error;
  }

  return (data || []) as NursingQueue[];
}

/**
 * Update queue status
 */
export async function updateQueueStatus(
  queueId: string,
  status: string,
): Promise<NursingQueue> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'In Progress') {
    updateData.started_at = new Date().toISOString();
  } else if (status === 'Completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('queue')
    .update(updateData)
    .eq('id', queueId)
    .select()
    .single();

  if (error) {
    log.error('Error updating queue status:', error);
    throw error;
  }

  return data as NursingQueue;
}

/**
 * Get nursing stats
 */
export async function getNursingStats(): Promise<NursingStats> {
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: todayVitals },
    { count: criticalVitals },
    { count: waitingQueue },
    { count: inProgressQueue },
    { count: completedToday },
  ] = await Promise.all([
    supabase
      .from('vitals')
      .select('*', { count: 'exact', head: true })
      .gte('date_recorded', today),
    supabase
      .from('vitals')
      .select('*', { count: 'exact', head: true })
      .eq('is_critical', true)
      .gte('date_recorded', today),
    supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('location', 'Nursing')
      .eq('status', 'Waiting'),
    supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('location', 'Nursing')
      .eq('status', 'In Progress'),
    supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('location', 'Nursing')
      .eq('status', 'Completed')
      .gte('completed_at', today),
  ]);

  return {
    todayVitals: todayVitals || 0,
    criticalVitals: criticalVitals || 0,
    waitingQueue: waitingQueue || 0,
    inProgressQueue: inProgressQueue || 0,
    completedToday: completedToday || 0,
  };
}

// =============================================================================
// LEGACY NURSING CARE API FUNCTIONS
// =============================================================================

/**
 * Get nursing care records with filters
 */
export async function getNursingCareRecords(filters: NursingCareFilters = {}) {
  const {
    page = 1,
    limit = 10,
    patient_id,
    care_type,
    nurse_id,
    date_from,
    date_to,
  } = filters;
  const offset = (page - 1) * limit;

  if (care_type && care_type !== 'Vital Signs') {
    return {
      data: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }

  let query = supabase
    .from('vitals')
    .select('*', { count: 'exact' })
    .order('date_recorded', { ascending: false })
    .range(offset, offset + limit - 1);

  if (patient_id) {
    const patientUuid = await resolvePatientUuid(patient_id);
    if (!patientUuid) {
      return {
        data: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
    query = query.eq('patient_id', patientUuid);
  }

  if (nurse_id) {
    const nurseUuid = await resolveStaffUuid(nurse_id);
    if (!nurseUuid) {
      return {
        data: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
    query = query.eq('nurse_id', nurseUuid);
  }

  if (date_from) {
    query = query.gte('date_recorded', date_from);
  }

  if (date_to) {
    query = query.lte('date_recorded', date_to);
  }

  const { data, error, count } = await query;

  if (error) {
    log.error('Error fetching nursing records:', error);
    return {
      data: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }

  const rows = data || [];
  const lookups =
    rows.length || patient_id
      ? await buildNursingCareLookups(rows, [patient_id])
      : { patients: new Map(), staff: new Map() };

  const mapped = rows.map((item) =>
    mapVitalsRecordToCare(item, patient_id, lookups),
  );

  return {
    data: mapped,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get a single nursing care record
 */
export async function getNursingCareRecord(
  careId: string,
): Promise<NursingCareDTO> {
  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .or(`id.eq.${careId},vitals_id.eq.${careId}`)
    .single();

  if (error) throw error;

  const lookups = await buildNursingCareLookups(
    [data],
    [data?.patient_id],
    [data?.nurse_id],
  );
  return mapVitalsRecordToCare(data, data?.patient_id, lookups);
}

/**
 * Create nursing care record
 */
export async function createNursingCareRecord(
  data: CreateNursingCareDTO,
): Promise<NursingCareDTO> {
  if (data.care_type !== 'Vital Signs') {
    throw new Error(
      'Only Vital Signs care type is supported in the current nursing schema.',
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .eq('email', user.email)
    .maybeSingle();

  if (staffError && staffError.code !== 'PGRST116') {
    log.error('Failed to load current staff profile:', staffError);
  }

  const nurseUuid = staffData?.id ?? staffData?.staff_id ?? null;

  // Nurse is auto-determined from logged-in user
  // No fallback to data.nurse_id since CreateNursingCareDTO doesn't have it

  const patientUuid = await resolvePatientUuid(data.patient_id);
  if (!patientUuid) {
    throw new Error('Patient not found');
  }

  const encounterUuid = await resolveVisitUuid(
    data.encounter_id || data.visit_id,
  );

  const vitalsPayload = buildVitalsPayload(data.vital_signs);

  const { data: record, error } = await supabase
    .from('vitals')
    .insert({
      ...vitalsPayload,
      patient_id: patientUuid,
      encounter_id: encounterUuid,
      nurse_id: nurseUuid,
      date_recorded: new Date().toISOString(),
      notes: data.notes,
      is_critical: determineCriticalFlag(data.vital_signs),
    })
    .select('*')
    .single();

  if (error) throw error;

  const lookups = await buildNursingCareLookups(
    [record],
    [data.patient_id, patientUuid],
    [nurseUuid].filter(Boolean) as string[], // Only include resolved nurse UUID
  );

  return mapVitalsRecordToCare(record, data.patient_id, lookups);
}

/**
 * Update nursing care record
 */
export async function updateNursingCareRecord(
  data: UpdateNursingCareDTO,
): Promise<NursingCareDTO> {
  const { care_id, vital_signs, patient_id, encounter_id, visit_id, notes } =
    data;

  if (data.care_type && data.care_type !== 'Vital Signs') {
    throw new Error(
      'Only Vital Signs care type is supported in the current nursing schema.',
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (vital_signs) {
    Object.assign(updates, buildVitalsPayload(vital_signs));
    updates.is_critical = determineCriticalFlag(vital_signs);
  }

  if (notes !== undefined) {
    updates.notes = notes;
  }

  if (patient_id) {
    const patientUuid = await resolvePatientUuid(patient_id);
    if (!patientUuid) {
      throw new Error('Patient not found');
    }
    updates.patient_id = patientUuid;
  }

  const resolvedEncounter = await resolveVisitUuid(encounter_id || visit_id);
  if (resolvedEncounter) {
    updates.encounter_id = resolvedEncounter;
  }

  // Note: nurse_id is auto-determined from record, not from DTO in update operations

  const { data: record, error } = await supabase
    .from('vitals')
    .update(updates)
    .or(`id.eq.${care_id},vitals_id.eq.${care_id}`)
    .select('*')
    .single();

  if (error) throw error;

  const lookups = await buildNursingCareLookups(
    [record],
    [patient_id, record?.patient_id],
    [record?.nurse_id].filter(Boolean) as string[],
  );

  return mapVitalsRecordToCare(
    record,
    patient_id ?? (record?.patient_id as string),
    lookups,
  );
}

/**
 * Delete nursing care record
 */
export async function deleteNursingCareRecord(careId: string): Promise<void> {
  const { error } = await supabase
    .from('vitals')
    .delete()
    .or(`id.eq.${careId},vitals_id.eq.${careId}`);

  if (error) throw error;
}

/**
 * Get nursing care statistics
 */
export async function getNursingCareStats(): Promise<NursingCareStats> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayResult] = await Promise.all([
      supabase
        .from('vitals')
        .select('id', { count: 'exact', head: true })
        .gte('date_recorded', today),
    ]);

    if (todayResult.error) {
      log.error('Error fetching today vitals count:', todayResult.error);
    }

    return {
      today: todayResult.count || 0,
      upcoming_care: 0,
    };
  } catch (error) {
    log.error('Error in getNursingCareStats:', error);
    return {
      today: 0,
      upcoming_care: 0,
    };
  }
}

/**
 * Get patient's latest vital signs
 */
export async function getLatestVitalSigns(
  patientId: string,
): Promise<VitalSignsData | null> {
  try {
    const patientUuid = await resolvePatientUuid(patientId);
    if (!patientUuid) return null;

    const { data, error } = await supabase
      .from('vitals')
      .select(
        `
        temperature,
        pulse,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        respiratory_rate,
        oxygen_saturation,
        weight,
        height,
        bmi,
        blood_glucose,
        pain_level,
        date_recorded,
        created_at
      `,
      )
      .eq('patient_id', patientUuid)
      .order('date_recorded', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error('Error fetching latest vital signs:', error);
      return null;
    }

    if (!data) return null;

    return {
      temperature: data.temperature ?? undefined,
      pulse: data.pulse ?? undefined,
      blood_pressure_systolic: data.blood_pressure_systolic ?? undefined,
      blood_pressure_diastolic: data.blood_pressure_diastolic ?? undefined,
      respiratory_rate: data.respiratory_rate ?? undefined,
      oxygen_saturation: data.oxygen_saturation ?? undefined,
      weight: data.weight ?? undefined,
      height: data.height ?? undefined,
      bmi: data.bmi ?? undefined,
      blood_glucose: data.blood_glucose ?? undefined,
      pain_level: data.pain_level ?? undefined,
    };
  } catch (error) {
    log.error('Error fetching latest vital signs:', error);
    return null;
  }
}

/**
 * Get patient's vital signs history
 */
export async function getVitalSignsHistory(
  patientId: string,
  days: number = 7,
) {
  try {
    const patientUuid = await resolvePatientUuid(patientId);
    if (!patientUuid) return [];

    const startDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from('vitals')
      .select(
        `
        temperature,
        pulse,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        respiratory_rate,
        oxygen_saturation,
        weight,
        height,
        bmi,
        blood_glucose,
        pain_level,
        date_recorded,
        created_at
      `,
      )
      .eq('patient_id', patientUuid)
      .gte('date_recorded', startDate)
      .order('date_recorded', { ascending: true });

    if (error) {
      log.error('Error fetching vital signs history:', error);
      return [];
    }

    return (data || []).map((record) => ({
      vitals: {
        temperature: record.temperature ?? undefined,
        pulse: record.pulse ?? undefined,
        blood_pressure_systolic: record.blood_pressure_systolic ?? undefined,
        blood_pressure_diastolic: record.blood_pressure_diastolic ?? undefined,
        respiratory_rate: record.respiratory_rate ?? undefined,
        oxygen_saturation: record.oxygen_saturation ?? undefined,
        weight: record.weight ?? undefined,
        height: record.height ?? undefined,
        bmi: record.bmi ?? undefined,
        blood_glucose: record.blood_glucose ?? undefined,
        pain_level: record.pain_level ?? undefined,
      } as VitalSignsData,
      timestamp: record.date_recorded || record.created_at,
    }));
  } catch (error) {
    log.error('Error in getVitalSignsHistory:', error);
    return [];
  }
}

/**
 * Get patients requiring nursing care
 */
export async function getPatientsRequiringCare() {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('is_critical', true)
      .gte('date_recorded', dayAgo)
      .order('date_recorded', { ascending: false });

    if (error) {
      log.error('Error fetching patients requiring care:', error);
      return [];
    }

    const records = data || [];

    const lookups = await buildNursingCareLookups(
      records,
      records.map((record) => record?.patient_id),
      records.map((record) => record?.nurse_id),
    );

    return records.map((record) => {
      const care = mapVitalsRecordToCare(record, record?.patient_id, lookups);
      const dueTimestamp =
        normalizeTimestamp(record?.date_recorded) ||
        normalizeTimestamp(record?.created_at) ||
        care.created_at ||
        new Date().toISOString();

      return {
        care_id: care.care_id,
        patient_id: care.patient_id,
        care_type: care.care_type,
        next_care_time: dueTimestamp,
        patient: care.patient ?? null,
        notes: care.notes ?? null,
        is_critical: record?.is_critical ?? true,
      };
    });
  } catch (error) {
    log.error('Error in getPatientsRequiringCare:', error);
    return [];
  }
}

// =============================================================================
// Queue-Based Patient Queries
// =============================================================================

export interface NursingQueuePatient {
  id: string;
  ticket_number: string;
  patient_id: string;
  visit_id: string | null;
  encounter_id: string | null; // UUID - the actual encounter ID for database queries
  priority: string;
  status: string;
  created_at: string;
  called_at: string | null;
  notes: string | null;
  patient: {
    id: string;
    patient_id: string;
    first_name: string;
    surname: string;
    date_of_birth: string;
    gender: string;
  } | null;
  visit: {
    visit_id: string;
    visit_type: string;
    payment_category: string;
    chief_complaint: string | null;
  } | null;
}

/**
 * Get patients waiting in the Nursing queue (after payment verification)
 */
export async function getNursingQueuePatients(): Promise<
  NursingQueuePatient[]
> {
  try {
    log.info('[Nursing Queue] Fetching patients...');
    const { data, error } = await supabase
      .from('queue')
      .select(
        `
        id,
        ticket_number,
        patient_id,
        visit_id,
        encounter_id,
        priority,
        status,
        created_at,
        called_at,
        notes,
        patient:patients(id, patient_id, first_name, surname, date_of_birth, gender),
        visit:visits!queue_encounter_id_fkey(visit_id, visit_type, payment_category, chief_complaint)
      `,
      )
      .eq('location', 'Nursing')
      .neq('status', 'Completed')
      .neq('status', 'Cancelled')
      .order('priority', { ascending: false })
      .order('ticket_number', { ascending: true });

    if (error) {
      log.error('[Nursing Queue] Error fetching:', error);
      return [];
    }

    log.info('[Nursing Queue] Found patients:', data?.length || 0, data);
    return (data as unknown as NursingQueuePatient[]) || [];
  } catch (error) {
    log.error('[Nursing Queue] Exception:', error);
    return [];
  }
}

/**
 * Get count of patients waiting in Nursing queue
 */
export async function getNursingQueueCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('location', 'Nursing')
      .neq('status', 'Completed')
      .neq('status', 'Cancelled');

    if (error) {
      log.error('Error fetching nursing queue count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    log.error('Error in getNursingQueueCount:', error);
    return 0;
  }
}

/**
 * Call next patient from nursing queue
 */
export async function callNursingQueuePatient(queueId: string): Promise<void> {
  // Try 'Called' first, fall back to 'Waiting' if enum doesn't exist
  let { error } = await supabase
    .from('queue')
    .update({
      status: 'Called',
      called_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  // Fallback if 'Called' doesn't exist in enum
  if (error?.code === '22P02') {
    log.warn('[Nursing] Called status not in enum, using Waiting');
    const result = await supabase
      .from('queue')
      .update({
        status: 'Waiting',
        called_at: new Date().toISOString(),
      })
      .eq('id', queueId);
    error = result.error;
  }

  if (error) throw error;
}

/**
 * Start serving a patient (mark queue entry as In Progress)
 * Falls back to 'Waiting' if 'In Progress' enum value doesn't exist
 */
export async function startServingPatient(queueId: string): Promise<void> {
  // Try 'In Progress' first
  let { error } = await supabase
    .from('queue')
    .update({
      status: 'In Progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  // Fallback if 'In Progress' doesn't exist in enum
  if (error?.code === '22P02') {
    log.warn(
      '[Nursing] "In Progress" status not in enum, using Waiting with started_at',
    );
    const result = await supabase
      .from('queue')
      .update({
        status: 'Waiting',
        started_at: new Date().toISOString(),
      })
      .eq('id', queueId);
    error = result.error;
  }

  if (error) throw error;
}

function detectSpecialtyQueueFromClinic(
  clinic: {
    clinic_name?: string | null;
    clinic_code?: string | null;
    clinic_id?: string | null;
  } | null,
): 'Dental' | 'Ophthalmology' | 'Physiotherapy' | 'Nutrition' | null {
  if (!clinic) return null;

  const clinicName = (clinic.clinic_name || '').toLowerCase();
  const clinicCode = (clinic.clinic_code || '').toLowerCase();
  const clinicId = (clinic.clinic_id || '').toLowerCase();

  if (
    clinicName.includes('dental') ||
    clinicCode === 'dent' ||
    clinicId === 'cln-dental'
  ) {
    return 'Dental';
  }

  if (
    clinicName.includes('eye') ||
    clinicName.includes('ophthal') ||
    clinicCode === 'eye' ||
    clinicId === 'cln-eye'
  ) {
    return 'Ophthalmology';
  }

  if (
    clinicName.includes('physio') ||
    clinicName.includes('rehab') ||
    clinicCode === 'physio' ||
    clinicId === 'cln-physio'
  ) {
    return 'Physiotherapy';
  }

  if (
    clinicName.includes('nutrition') ||
    clinicName.includes('diet') ||
    clinicCode === 'nut' ||
    clinicId === 'cln-042'
  ) {
    return 'Nutrition';
  }

  return null;
}

/**
 * Complete nursing care for a patient and route to the next queue.
 * - For specialty clinic patients (tagged with [SPECIALTY_NEXT:X]), routes to the specialty queue.
 * - For regular clinic patients, routes to the Consultation queue.
 */
export async function completeNursingQueue(queueId: string): Promise<void> {
  // First get the queue entry to retrieve patient/visit info and notes
  const { data: queueEntry, error: fetchError } = await supabase
    .from('queue')
    .select('patient_id, visit_id, priority, clinic_id, notes')
    .eq('id', queueId)
    .single();

  if (fetchError) throw fetchError;

  // Mark nursing queue as completed
  const { error } = await supabase
    .from('queue')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  if (error) throw error;

  // Determine next destination:
  // 1. Check for A&E encounter (encounter_category = 'emergency') → route to Emergency
  // 2. Check for [SPECIALTY_NEXT:LocationName] tag in notes → route to specialty
  // 3. Fallback: infer specialty from clinic when tag is missing
  // 4. Default → Consultation
  let nextDepartment = 'Consultation';

  // Check if this is an A&E encounter
  if (queueEntry?.visit_id) {
    const { data: visitData } = await supabase
      .from('visits')
      .select('encounter_category, visit_type')
      .eq('id', queueEntry.visit_id)
      .single();

    if (
      visitData?.encounter_category === 'emergency' ||
      visitData?.visit_type === 'A&E' ||
      visitData?.visit_type === 'Emergency'
    ) {
      nextDepartment = 'Emergency';
      log.info(
        '[Nursing] A&E encounter detected — routing to Emergency after vitals',
      );
    }
  }

  // Check for specialty tag override (takes precedence if present)
  const specialtyTag = queueEntry?.notes?.match(/\[SPECIALTY_NEXT:([^\]]+)\]/);
  if (specialtyTag && specialtyTag[1]) {
    nextDepartment = specialtyTag[1];
    log.info(
      `[Nursing] Specialty patient detected — routing to ${nextDepartment} after vitals`,
    );
  }

  // Fallback: some legacy/atomic billing paths may not include [SPECIALTY_NEXT:*]
  // in nursing notes. Infer specialty destination from clinic configuration.
  if (
    !specialtyTag &&
    nextDepartment !== 'Emergency' &&
    queueEntry?.clinic_id
  ) {
    const { data: clinicData } = await supabase
      .from('clinics')
      .select('clinic_name, clinic_code, clinic_id')
      .eq('id', queueEntry.clinic_id)
      .maybeSingle();

    const specialtyFromClinic = detectSpecialtyQueueFromClinic(clinicData);
    if (specialtyFromClinic) {
      nextDepartment = specialtyFromClinic;
      log.info(
        `[Nursing] Specialty inferred from clinic — routing to ${nextDepartment} after vitals`,
      );
    }
  }

  // Route patient to next queue (Consultation or Specialty)
  if (queueEntry?.visit_id) {
    try {
      // Use atomic create_queue_ticket RPC for reliable ticket generation
      const { data: queueResult, error: rpcError } = await supabase.rpc(
        'create_queue_ticket',
        {
          p_dept: nextDepartment,
          p_patient_id: queueEntry.patient_id,
          p_visit_id: queueEntry.visit_id,
          p_encounter_id: queueEntry.visit_id,
          p_clinic_id: queueEntry.clinic_id,
          p_priority: queueEntry.priority || 'Normal',
          p_notes: `Auto-routed after vitals recorded${nextDepartment !== 'Consultation' ? ` — proceeding to ${nextDepartment}` : ''}`,
        },
      );

      if (rpcError || !queueResult?.success) {
        // Fallback to direct insert if RPC doesn't exist or fails
        log.warn(
          '[Nursing] Atomic create_queue_ticket failed, using fallback:',
          rpcError || queueResult?.error,
        );
        const fallbackTicket = Math.floor(Date.now() % 10000);

        await supabase.from('queue').insert({
          patient_id: queueEntry.patient_id,
          visit_id: queueEntry.visit_id,
          encounter_id: queueEntry.visit_id,
          clinic_id: queueEntry.clinic_id,
          ticket_number: fallbackTicket.toString(),
          location: nextDepartment,
          priority: queueEntry.priority || 'Normal',
          status: 'Waiting',
          created_at: new Date().toISOString(),
          notes: `Auto-routed after vitals recorded${nextDepartment !== 'Consultation' ? ` — proceeding to ${nextDepartment}` : ''}`,
        });
      }

      log.info(
        `[Auto-Routing] Patient ${queueEntry.patient_id} routed to ${nextDepartment} queue after vitals`,
      );
    } catch (routingError) {
      log.error(
        `[Auto-Routing] Failed to route to ${nextDepartment}:`,
        routingError,
      );
    }
  }
}

// =============================================================================
// CONSULTED PATIENTS API (For Nursing Reports)
// =============================================================================

export interface ConsultedPatient {
  id: string;
  patient_id: string;
  encounter_id: string;
  consultation_id: string;
  first_name: string;
  surname: string;
  emr_number?: string;
  file_number?: string;
  consultation_date: string;
  diagnosis?: string;
  doctor_name?: string;
  has_treatment_plan: boolean;
  treatment_plan_id?: string;
}

/**
 * Get patients who have been attended to by a consultant (have consultations)
 * These are patients for whom nurses can add nursing reports
 */
export async function getConsultedPatients(
  options: {
    limit?: number;
    today_only?: boolean;
    search?: string;
  } = {},
): Promise<ConsultedPatient[]> {
  const { limit = 50, today_only = true, search } = options;

  // Build date filter for today if requested
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  let query = supabase
    .from('consultations')
    .select(
      `
      consultation_id,
      encounter_id,
      diagnosis,
      created_at,
      patient:patients(
        id,
        patient_id,
        first_name,
        surname,
        emr_number
      ),
      doctor:staff!fk_consultations_doctor(
        first_name,
        last_name
      ),
      treatment_plans(
        id,
        title,
        status
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter for today's consultations if requested
  if (today_only) {
    query = query.gte('created_at', todayIso);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching consulted patients:', error);
    throw error;
  }

  // Transform and filter results
  const results: ConsultedPatient[] = [];
  const seenPatients = new Set<string>(); // Avoid duplicates by patient

  for (const row of data || []) {
    const patient = Array.isArray(row.patient) ? row.patient[0] : row.patient;
    const doctor = Array.isArray(row.doctor) ? row.doctor[0] : row.doctor;
    const treatmentPlans = row.treatment_plans || [];

    if (!patient) continue;

    // Skip if we've already added this patient (keep most recent consultation)
    const patientKey = patient.id || patient.patient_id;
    if (seenPatients.has(patientKey)) continue;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesName = `${patient.first_name} ${patient.surname}`
        .toLowerCase()
        .includes(searchLower);
      const matchesEmr = (patient.emr_number || '')
        .toLowerCase()
        .includes(searchLower);
      if (!matchesName && !matchesEmr) continue;
    }

    seenPatients.add(patientKey);

    results.push({
      id: patient.id || patient.patient_id,
      patient_id: patient.patient_id,
      encounter_id: row.encounter_id,
      consultation_id: row.consultation_id,
      first_name: patient.first_name,
      surname: patient.surname,
      emr_number: patient.emr_number,
      consultation_date: row.created_at,
      diagnosis: row.diagnosis,
      doctor_name: doctor
        ? `Dr. ${doctor.first_name} ${doctor.last_name}`
        : undefined,
      has_treatment_plan: treatmentPlans.length > 0,
      treatment_plan_id: treatmentPlans[0]?.id,
    });
  }

  return results;
}

/**
 * Get count of patients consulted today (for stats)
 */
export async function getConsultedPatientsCount(
  today_only = true,
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  let query = supabase
    .from('consultations')
    .select('consultation_id', { count: 'exact', head: true });

  if (today_only) {
    query = query.gte('created_at', todayIso);
  }

  const { count, error } = await query;

  if (error) {
    log.error('Error fetching consulted patients count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get aggregated clinical timeline for an encounter
 */
export async function getClinicalTimeline(
  encounterId: string,
): Promise<TimelineEvent[]> {
  if (!encounterId) return [];

  const [
    consultationRes,
    nursingNoteRes,
    vitalsRes,
    wardRoundRes,
    labRes,
    prescriptionRes,
    radiologyRes,
    procedureRes,
    medScheduleRes,
    nutritionPlanRes,
  ] = await Promise.all([
    supabase
      .from('consultations')
      .select(
        '*, doctor:staff!fk_consultations_doctor(first_name, last_name, role)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('nursing_notes')
      .select(
        '*, nurse:staff!nursing_notes_recorded_by_fkey(first_name, last_name)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('vitals')
      .select('*, nurse:staff!vitals_nurse_id_fkey(first_name, last_name)')
      .eq('encounter_id', encounterId),
    supabase
      .from('ward_round_notes')
      .select(
        '*, doctor:staff!ward_round_notes_attending_physician_id_fkey(first_name, last_name)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('lab_requests')
      .select(
        '*, orderer:staff!lab_requests_ordered_by_uuid_fkey(first_name, last_name, role, department)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('prescriptions')
      .select(
        '*, doctor:staff!prescriptions_doctor_uuid_fkey(first_name, last_name)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('radiology_requests')
      .select('*')
      .eq('encounter_id', encounterId),
    supabase
      .from('procedures')
      .select(
        '*, surgeon:staff!procedures_primary_surgeon_id_fkey(first_name, last_name)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('medication_schedule')
      .select(
        '*, prescriber:staff!medication_schedule_prescribed_by_fkey(first_name, last_name), admin:staff!medication_schedule_administered_by_fkey(first_name, last_name)',
      )
      .eq('encounter_id', encounterId),
    supabase
      .from('specialty_careplans')
      .select(
        '*, creator:staff!specialty_careplans_created_by_fkey(first_name, last_name, role)',
      )
      .eq('encounter_id', encounterId)
      .eq('specialty_code', 'NUTRITION'),
  ]);

  const timeline: TimelineEvent[] = [];

  const nutritionPlans = nutritionPlanRes.data || [];
  const nutritionPlanIds = nutritionPlans
    .map((plan: any) => plan.id)
    .filter((id: string | undefined): id is string => Boolean(id));

  let nutritionSessions: any[] = [];
  if (nutritionPlanIds.length > 0) {
    const { data: nutritionSessionRows } = await supabase
      .from('careplan_sessions')
      .select('*, recorder:staff(first_name, last_name, role)')
      .in('careplan_id', nutritionPlanIds)
      .order('created_at', { ascending: false });

    nutritionSessions = nutritionSessionRows || [];
  }

  const nutritionPlanMap = new Map(
    nutritionPlans.map((plan: any) => [plan.id, plan]),
  );

  // Process Consultations
  if (consultationRes.data) {
    consultationRes.data.forEach((c: any) => {
      timeline.push({
        id: c.consultation_id,
        category: 'consultation',
        title: 'Doctor Consultation',
        description:
          c.diagnosis_text ||
          c.assessment ||
          c.complaints ||
          'Consultation recorded',
        timestamp: c.created_at,
        author: c.doctor
          ? `Dr. ${c.doctor.first_name} ${c.doctor.last_name}`
          : 'Doctor',
        authorRole: c.doctor?.role || 'Doctor',
        meta: c,
      });
    });
  }

  // Process Ward Round Notes
  if (wardRoundRes.data) {
    wardRoundRes.data.forEach((w: any) => {
      timeline.push({
        id: w.id,
        category: 'ward_round',
        title: `Ward Round: ${(w.round_type || 'General').replace(/_/g, ' ')}`,
        description:
          w.subjective_notes || w.assessment || w.plan || 'No content',
        timestamp: w.created_at,
        author: w.doctor
          ? `Dr. ${w.doctor.first_name} ${w.doctor.last_name}`
          : 'Doctor',
        authorRole: 'Doctor',
        meta: w,
      });
    });
  }

  // Process Nursing Notes
  if (nursingNoteRes.data) {
    nursingNoteRes.data.forEach((n: any) => {
      timeline.push({
        id: n.id,
        category: 'nursing_note',
        title: (n.note_type || 'Nursing Note').replace(/_/g, ' '),
        description: n.content || n.notes || 'Note recorded',
        timestamp: n.created_at,
        author: n.nurse
          ? `${n.nurse.first_name} ${n.nurse.last_name}`
          : 'Nurse',
        authorRole: 'Nurse',
        meta: n,
      });
    });
  }

  // Process Vitals
  if (vitalsRes.data) {
    vitalsRes.data.forEach((v: any) => {
      const summary = [
        v.blood_pressure ? `BP: ${v.blood_pressure}` : null,
        v.temperature ? `Temp: ${v.temperature}°C` : null,
        v.pulse ? `HR: ${v.pulse}` : null,
        v.oxygen_saturation ? `SpO2: ${v.oxygen_saturation}%` : null,
        v.respiratory_rate ? `RR: ${v.respiratory_rate}` : null,
        v.weight ? `Wt: ${v.weight}kg` : null,
      ]
        .filter(Boolean)
        .join(', ');

      timeline.push({
        id: v.id,
        category: 'vital',
        title: 'Vital Signs',
        description: summary || 'Vitals recorded',
        timestamp: v.date_recorded || v.created_at,
        author: v.nurse
          ? `${v.nurse.first_name} ${v.nurse.last_name}`
          : 'Nurse',
        authorRole: 'Nurse',
        meta: v,
      });
    });
  }

  // Process Lab Requests
  if (labRes.data) {
    labRes.data.forEach((l: any) => {
      const statusLabel = l.status || 'Pending';
      const resultInfo = l.result
        ? ` — Result: ${String(l.result).substring(0, 80)}`
        : '';
      const diagnosisText = Array.isArray(l.diagnosis)
        ? l.diagnosis.filter(Boolean).join(', ')
        : l.diagnosis;
      const orderedByNutrition = String(l.orderer?.department || '')
        .toLowerCase()
        .includes('nutrition');
      const authorName = l.orderer
        ? `${l.orderer.first_name} ${l.orderer.last_name}`
        : 'Doctor';
      timeline.push({
        id: l.request_id,
        category: orderedByNutrition ? 'nutrition_order' : 'lab',
        title: orderedByNutrition
          ? `Nutrition Lab: ${statusLabel}`
          : `Lab: ${statusLabel}`,
        description: `${diagnosisText || l.clinical_notes || 'Lab test'}${resultInfo}`,
        timestamp: l.created_at,
        author: orderedByNutrition
          ? authorName
          : l.orderer
            ? `Dr. ${authorName}`
            : 'Doctor',
        authorRole: orderedByNutrition
          ? 'Nutrition'
          : l.orderer?.role || 'Doctor',
        meta: l,
      });
    });
  }

  // Process Nutrition Care Plans
  if (nutritionPlans.length > 0) {
    nutritionPlans.forEach((plan: any) => {
      const baseline = plan?.baseline_data || {};
      const mealSchedule = baseline.meal_schedule || {};
      const mealEntries = [
        mealSchedule.breakfast
          ? `Breakfast: ${mealSchedule.breakfast}`
          : null,
        mealSchedule.mid_morning_snack
          ? `Morning Snack: ${mealSchedule.mid_morning_snack}`
          : null,
        mealSchedule.lunch ? `Lunch: ${mealSchedule.lunch}` : null,
        mealSchedule.evening_snack
          ? `Afternoon Snack: ${mealSchedule.evening_snack}`
          : null,
        mealSchedule.dinner ? `Dinner: ${mealSchedule.dinner}` : null,
        mealSchedule.bedtime_snack
          ? `Bedtime Snack: ${mealSchedule.bedtime_snack}`
          : null,
      ].filter(Boolean);
      const diagnoses = Array.isArray(plan?.diagnosis)
        ? plan.diagnosis.filter(Boolean).join(', ')
        : '';
      const goals = Array.isArray(plan?.goals)
        ? plan.goals.filter(Boolean).join('; ')
        : '';
      timeline.push({
        id: plan.id,
        category: 'nutrition_plan',
        title: `Nutrition Plan: ${plan.status || 'Active'}`,
        description: [
          plan.plan_name || 'Nutrition care plan',
          baseline.diet_type ? `Diet: ${baseline.diet_type}` : null,
          diagnoses ? `Diagnosis: ${diagnoses}` : null,
          baseline.dietary_restrictions
            ? `Restrictions: ${baseline.dietary_restrictions}`
            : null,
          baseline.supplements
            ? `Supplements: ${baseline.supplements}`
            : null,
          baseline.calorie_target_kcal
            ? `Calories: ${baseline.calorie_target_kcal} kcal/day`
            : null,
          baseline.protein_target_g
            ? `Protein: ${baseline.protein_target_g} g/day`
            : null,
          baseline.fluid_target_ml
            ? `Fluids: ${baseline.fluid_target_ml} ml/day`
            : null,
          mealEntries.length > 0 ? mealEntries.join('\n') : null,
          goals ? `Goals: ${goals}` : null,
          baseline.counseling_notes
            ? `Counselling Notes: ${baseline.counseling_notes}`
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
        timestamp: plan.created_at,
        author: plan.creator
          ? `${plan.creator.first_name} ${plan.creator.last_name}`
          : 'Nutrition Team',
        authorRole: plan.creator?.role || 'Nutrition',
        meta: plan,
      });
    });
  }

  // Process Nutrition Sessions
  if (nutritionSessions.length > 0) {
    nutritionSessions.forEach((session: any) => {
      const linkedPlan = nutritionPlanMap.get(session.careplan_id);
      const sessionSummary = [
        linkedPlan?.plan_name || null,
        session.assessment ? `Assessment: ${session.assessment}` : null,
        session.notes ? `Notes: ${session.notes}` : null,
        session.meal_plan_adjustments
          ? `Meal Plan Adjustments: ${session.meal_plan_adjustments}`
          : null,
        session.barriers ? `Barriers: ${session.barriers}` : null,
        session.gastrointestinal_symptoms
          ? `GI Symptoms: ${session.gastrointestinal_symptoms}`
          : null,
        session.plan_for_next ? `Next Plan: ${session.plan_for_next}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      timeline.push({
        id: session.id,
        category: 'nutrition_session',
        title: `Nutrition Session #${session.session_number || 'N/A'}: ${session.status || 'Scheduled'}`,
        description: sessionSummary || 'Nutrition session update',
        timestamp:
          session.completed_date ||
          session.scheduled_date ||
          session.created_at,
        author: session.recorder
          ? `${session.recorder.first_name} ${session.recorder.last_name}`
          : 'Nutrition Team',
        authorRole: session.recorder?.role || 'Nutrition',
        meta: {
          ...session,
          plan_name: linkedPlan?.plan_name,
        },
      });
    });
  }

  // Process Prescriptions
  if (prescriptionRes.data) {
    prescriptionRes.data.forEach((p: any) => {
      const drugInfo = [p.drug_name, p.dosage, p.frequency, p.route]
        .filter(Boolean)
        .join(' • ');
      timeline.push({
        id: p.prescription_id,
        category: 'pharmacy',
        title: `Rx: ${p.status || 'Pending'}`,
        description: drugInfo || 'Prescription',
        timestamp: p.created_at,
        author: p.doctor
          ? `Dr. ${p.doctor.first_name} ${p.doctor.last_name}`
          : 'Doctor',
        authorRole: 'Doctor',
        meta: p,
      });
    });
  }

  // Process Radiology Requests
  if (radiologyRes.data) {
    radiologyRes.data.forEach((r: any) => {
      const desc = [r.imaging_type, r.body_part, r.clinical_indication]
        .filter(Boolean)
        .join(' — ');
      timeline.push({
        id: r.request_id,
        category: 'radiology',
        title: `Imaging: ${r.status || 'Pending'}`,
        description: desc || 'Radiology request',
        timestamp: r.created_at,
        author: 'Doctor',
        authorRole: 'Doctor',
        meta: r,
      });
    });
  }

  // Process Procedures
  if (procedureRes.data) {
    procedureRes.data.forEach((pr: any) => {
      const procDesc = [
        pr.procedure_name,
        pr.indication ? `Indication: ${pr.indication}` : null,
        pr.anesthesia_type ? `Anesthesia: ${pr.anesthesia_type}` : null,
      ]
        .filter(Boolean)
        .join(' • ');
      timeline.push({
        id: pr.id,
        category: 'procedure',
        title: `Procedure: ${pr.status || 'Scheduled'}`,
        description: procDesc || 'Procedure',
        timestamp: pr.actual_start_time || pr.scheduled_date || pr.created_at,
        author: pr.surgeon
          ? `Dr. ${pr.surgeon.first_name} ${pr.surgeon.last_name}`
          : 'Doctor',
        authorRole: 'Doctor',
        meta: pr,
      });
    });
  }

  // Process Medication Schedule (eMAR)
  if (medScheduleRes.data) {
    medScheduleRes.data.forEach((m: any) => {
      const statusLabel =
        m.status === 'given' || m.status === 'administered'
          ? 'Administered'
          : m.status === 'missed'
            ? 'Missed'
            : m.status === 'refused'
              ? 'Refused'
              : m.status === 'pending'
                ? 'Due'
                : m.status || 'Scheduled';
      const adminInfo = m.admin
        ? ` by ${m.admin.first_name} ${m.admin.last_name}`
        : '';
      timeline.push({
        id: m.id,
        category: 'medication',
        title: `eMAR: ${statusLabel}`,
        description:
          `${m.medication_name || 'Medication'} ${m.dose || ''} ${m.route || ''}${adminInfo}`.trim(),
        timestamp: m.administered_at || m.scheduled_time || m.created_at,
        author: m.prescriber
          ? `Dr. ${m.prescriber.first_name} ${m.prescriber.last_name}`
          : m.admin
            ? `${m.admin.first_name} ${m.admin.last_name}`
            : 'Staff',
        authorRole: m.admin ? 'Nurse' : 'Doctor',
        meta: m,
      });
    });
  }

  // Sort by timestamp descending (newest first)
  return timeline.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}