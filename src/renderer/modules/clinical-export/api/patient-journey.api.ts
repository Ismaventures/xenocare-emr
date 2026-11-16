/**
 * Clinical Export System - Patient Journey API
 * XENOCARE EMR
 *
 * Data aggregation service for fetching complete patient clinical records
 * across all modules for export
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import { supabase } from '../../../api/supabaseClient';
import { createScopedLogger } from '../../../utils/logger';
import type {
  PatientCoreRecord,
  EncounterRecord,
  DiagnosisRecord,
  VitalsRecord,
  NursingRecord,
  TreatmentPlanRecord,
  ClinicalNoteRecord,
  PrescriptionRecord,
  LabRequestRecord,
  LabResultRecord,
  RadiologyRequestRecord,
  RadiologyReportRecord,
  ProcedureRecord,
  BillingRecord,
  BillingItemRecord,
  PaymentRecord,
  AdmissionRecord,
  WardRoundNoteRecord,
  BedTransferRecord,
  ExportFilters,
  ExportMetadata,
  PatientAnalytics,
} from '../types';

// ==================== TYPES ====================

const log = createScopedLogger('ClinicalExport');

function buildIdentifierSummary(
  encounterIds: string[],
  visitIds: string[] = [],
) {
  return {
    encounterCount: encounterIds.length,
    visitCount: visitIds.length,
  };
}

/**
 * Complete patient journey export data
 */
export interface PatientJourneyExport {
  exportMetadata: ExportMetadata;
  patient: PatientCoreRecord;
  encounters: EncounterRecord[];
  diagnoses: DiagnosisRecord[];
  vitals: VitalsRecord[];
  nursingRecords: NursingRecord[];
  treatmentPlans: TreatmentPlanRecord[];
  clinicalNotes: ClinicalNoteRecord[];
  prescriptions: PrescriptionRecord[];
  labRequests: LabRequestRecord[];
  labResults: LabResultRecord[];
  radiologyRequests: RadiologyRequestRecord[];
  radiologyReports: RadiologyReportRecord[];
  procedures: ProcedureRecord[];
  billingRecords: BillingRecord[];
  admissions: AdmissionRecord[];
  wardRoundNotes: WardRoundNoteRecord[];
  bedTransfers: BedTransferRecord[];
  analytics?: PatientAnalytics;
}

/**
 * Multi-patient export result
 */
export interface MultiPatientExport {
  exportMetadata: ExportMetadata;
  patients: PatientJourneyExport[];
  aggregateAnalytics?: Record<string, unknown>;
}

// ==================== STAFF NAME LOOKUP CACHE ====================

// Cache for staff names to avoid repeated lookups
const staffNameCache = new Map<string, string>();

/**
 * Lookup staff name by staff_id (varchar code like "STAFF001") or UUID
 * Caches results to avoid repeated database calls
 */
async function lookupStaffName(
  staffIdOrUuid: string | null | undefined,
): Promise<string> {
  if (!staffIdOrUuid) return '';

  // Check cache first
  if (staffNameCache.has(staffIdOrUuid)) {
    return staffNameCache.get(staffIdOrUuid) || '';
  }

  try {
    // Try lookup by staff_id first (varchar like "STAFF001")
    let { data, error } = await supabase
      .from('staff')
      .select('first_name, last_name')
      .eq('staff_id', staffIdOrUuid)
      .maybeSingle();

    // If not found by staff_id, try by UUID (id column)
    if (!data && !error) {
      const uuidResult = await supabase
        .from('staff')
        .select('first_name, last_name')
        .eq('id', staffIdOrUuid)
        .maybeSingle();
      data = uuidResult.data;
      error = uuidResult.error;
    }

    if (data && !error) {
      const fullName =
        `${data.first_name || ''} ${data.last_name || ''}`.trim();
      staffNameCache.set(staffIdOrUuid, fullName);
      return fullName;
    }
  } catch (e) {
    log.warn('Staff lookup failed; using identifier fallback', {
      hasIdentifier: Boolean(staffIdOrUuid),
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Return the ID as fallback
  staffNameCache.set(staffIdOrUuid, staffIdOrUuid);
  return staffIdOrUuid;
}

/**
 * Batch lookup staff names - more efficient than individual lookups
 */
async function batchLookupStaffNames(
  staffIds: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(staffIds.filter(Boolean))] as string[];
  const uncachedIds = uniqueIds.filter((id) => !staffNameCache.has(id));

  if (uncachedIds.length > 0) {
    // Lookup by staff_id
    const { data: byStaffId } = await supabase
      .from('staff')
      .select('staff_id, first_name, last_name')
      .in('staff_id', uncachedIds);

    if (byStaffId) {
      for (const staff of byStaffId) {
        if (staff.staff_id) {
          const fullName =
            `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
          staffNameCache.set(staff.staff_id, fullName);
        }
      }
    }

    // For any still uncached, try by UUID
    const stillUncached = uncachedIds.filter((id) => !staffNameCache.has(id));
    if (stillUncached.length > 0) {
      const { data: byUuid } = await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .in('id', stillUncached);

      if (byUuid) {
        for (const staff of byUuid) {
          if (staff.id) {
            const fullName =
              `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
            staffNameCache.set(staff.id, fullName);
          }
        }
      }
    }
  }

  // Build result map
  const result = new Map<string, string>();
  for (const id of uniqueIds) {
    result.set(id, staffNameCache.get(id) || id);
  }
  return result;
}

// ==================== PATIENT DATA FETCHING ====================

// Database patient record shape
interface DbPatientRecord {
  id: string | null;
  patient_id: string;
  emr_number: string | null;
  first_name: string;
  middle_name: string | null;
  surname: string;
  date_of_birth: string | null;
  gender: string;
  blood_group: string | null;
  nationality: string | null;
  state_of_origin: string | null;
  lga: string | null;
  contact_phone: string | null;
  email: string | null;
  residential_address: string | null;
  nok_name: string | null;
  nok_phone: string | null;
  nok_relationship: string | null;
  patient_category: string | null;
  patient_type: string | null;
  nhis_number: string | null;
  service_number: string | null;
  rank: string | null;
  unit: string | null;
  occupation: string | null;
  employer: string | null;
  created_at: string;
  status: string;
}

/**
 * Fetch patient core record
 */
export async function fetchPatientCore(
  patientId: string,
): Promise<PatientCoreRecord | null> {
  const selectFields = `
    id,
    patient_id,
    emr_number,
    first_name,
    middle_name,
    surname,
    date_of_birth,
    gender,
    blood_group,
    nationality,
    state_of_origin,
    lga,
    contact_phone,
    email,
    residential_address,
    nok_name,
    nok_phone,
    nok_relationship,
    patient_category,
    patient_type,
    nhis_number,
    service_number,
    rank,
    unit,
    occupation,
    employer,
    created_at,
    status
  `;

  const { data, error } = await supabase
    .from('patients')
    .select(selectFields)
    .eq('id', patientId)
    .single();

  if (error || !data) {
    // Try by patient_id if uuid lookup fails
    const { data: dataByPatientId, error: error2 } = await supabase
      .from('patients')
      .select(selectFields)
      .eq('patient_id', patientId)
      .single();

    if (error2 || !dataByPatientId) return null;

    return mapPatientToCore(dataByPatientId as DbPatientRecord);
  }

  return mapPatientToCore(data as DbPatientRecord);
}

/**
 * Map database patient record to PatientCoreRecord
 */
function mapPatientToCore(data: DbPatientRecord): PatientCoreRecord {
  // Calculate age
  let age = 0;
  if (data.date_of_birth) {
    const dob = new Date(data.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  return {
    id: data.id || data.patient_id,
    mrn: data.emr_number || data.patient_id || '',
    emr_number: data.emr_number || '',
    first_name: data.first_name || '',
    middle_name: data.middle_name || undefined,
    surname: data.surname || '',
    date_of_birth: data.date_of_birth || '',
    age,
    gender:
      (data.gender as 'Male' | 'Female' | 'Other' | 'Unknown') || 'Unknown',
    blood_group: data.blood_group || undefined,
    genotype: undefined,
    marital_status: undefined,
    occupation: data.occupation || undefined,
    nationality: data.nationality || undefined,
    state_of_origin: data.state_of_origin || undefined,
    lga: data.lga || undefined,
    contact_phone: data.contact_phone || undefined,
    contact_email: data.email || undefined,
    address: data.residential_address || undefined,
    city: undefined,
    state: undefined,
    emergency_contact: data.nok_name
      ? {
          name: data.nok_name,
          relationship: data.nok_relationship || '',
          phone: data.nok_phone || '',
        }
      : undefined,
    patient_category: data.patient_category || '',
    patient_type: data.patient_type || undefined,
    nhis_number: data.nhis_number || undefined,
    hmo_id: undefined,
    company_name: data.employer || undefined,
    staff_id: data.service_number || undefined,
    registration_date: data.created_at,
    is_active: data.status === 'Active',
  };
}

/**
 * Resolve any patient identifier to UUID
 */
async function resolvePatientId(
  patientId: string,
): Promise<{ uuid: string; externalId: string } | null> {
  // Try by id (UUID primary key)
  const { data: byId } = await supabase
    .from('patients')
    .select('id, patient_id')
    .eq('id', patientId)
    .maybeSingle();

  if (byId) {
    return { uuid: byId.id, externalId: byId.patient_id };
  }

  // Try by patient_id
  const { data: byPatientId } = await supabase
    .from('patients')
    .select('id, patient_id')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (byPatientId) {
    return { uuid: byPatientId.id, externalId: byPatientId.patient_id };
  }

  return null;
}

/**
 * Fetch encounters (visits) for a patient within date range
 */
export async function fetchPatientEncounters(
  patientId: string,
  filters: ExportFilters,
): Promise<EncounterRecord[]> {
  // Resolve patient ID to UUID
  const resolved = await resolvePatientId(patientId);
  if (!resolved) {
    return [];
  }

  let query = supabase
    .from('visits')
    .select(
      `
      id,
      visit_id,
      patient_id,
      clinic_id,
      visit_type,
      encounter_number,
      encounter_date,
      priority,
      chief_complaint,
      payment_category,
      status,
      start_time,
      end_time,
      attending_doctor_id,
      created_at,
      updated_at,
      clinics:clinic_id(clinic_name),
      staff:attending_doctor_id(first_name, last_name)
    `,
    )
    .eq('patient_id', resolved.uuid)
    .order('encounter_date', { ascending: false });

  // Apply date range filter - convert ISO to date-only format for DATE column
  if (filters.dateRange?.from) {
    const fromDate = filters.dateRange.from.split('T')[0]; // Extract YYYY-MM-DD
    query = query.gte('encounter_date', fromDate);
  }
  if (filters.dateRange?.to) {
    const toDate = filters.dateRange.to.split('T')[0]; // Extract YYYY-MM-DD
    query = query.lte('encounter_date', toDate);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Failed to fetch patient encounters', error, {
      lookupMode: 'visits_by_patient',
    });
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((enc: Record<string, unknown>) => ({
    id: enc.id as string,
    visit_id: (enc.visit_id as string) || '', // Include visit_id for legacy linking
    encounter_number:
      (enc.encounter_number as string) || (enc.visit_id as string) || '',
    patient_id: resolved.uuid,
    encounter_type: (enc.visit_type as string) || 'OPD',
    visit_type: (enc.visit_type as string) || '',
    status: (enc.status as string) || '',
    priority: (enc.priority as string) || 'Normal',
    facility_id: '',
    department_id: '',
    department_name: '',
    clinic_id: enc.clinic_id as string,
    clinic_name:
      ((enc.clinics as Record<string, unknown>)?.clinic_name as string) || '',
    attending_doctor_id: (enc.attending_doctor_id as string) || '',
    attending_doctor_name: enc.staff
      ? `${(enc.staff as Record<string, unknown>).first_name || ''} ${(enc.staff as Record<string, unknown>).last_name || ''}`.trim()
      : '',
    chief_complaint: (enc.chief_complaint as string) || '',
    encounter_date:
      (enc.encounter_date as string) || (enc.start_time as string),
    check_in_time: (enc.start_time as string) || '',
    created_at: enc.created_at as string,
    updated_at: enc.updated_at as string,
  })) as EncounterRecord[];
}

/**
 * Fetch diagnoses from consultations for encounters
 */
export async function fetchDiagnoses(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<DiagnosisRecord[]> {
  if (!encounterIds.length && !visitIds.length) return [];

  // First try by encounter_id
  let data: Record<string, unknown>[] | null = null;
  let error = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('consultations')
      .select(
        `
        consultation_id,
        encounter_id,
        visit_id,
        patient_id,
        doctor_id,
        diagnosis,
        diagnosis_text,
        differential_diagnosis,
        consultation_date,
        created_at,
        staff:doctor_id(first_name, last_name)
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  // If no results by encounter_id, try by visit_id
  if ((!data || data.length === 0) && visitIds.length > 0) {
    log.debug(
      'No consultations found by encounter_id; retrying by visit_id',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('consultations')
      .select(
        `
        consultation_id,
        encounter_id,
        visit_id,
        patient_id,
        doctor_id,
        diagnosis,
        diagnosis_text,
        differential_diagnosis,
        consultation_date,
        created_at,
        staff:doctor_id(first_name, last_name)
      `,
      )
      .in('visit_id', visitIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  if (error) {
    log.error(
      'Failed to fetch consultations',
      error,
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  if (!data || data.length === 0) {
    log.debug(
      'No consultations found',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  log.debug('Fetched consultations', { count: data.length });

  // Convert consultation diagnoses to DiagnosisRecord format
  const diagnosisRecords: DiagnosisRecord[] = [];

  data.forEach((c: Record<string, unknown>) => {
    const doctorName = c.staff
      ? `${(c.staff as Record<string, unknown>).first_name || ''} ${(c.staff as Record<string, unknown>).last_name || ''}`.trim()
      : '';

    // Handle diagnosis which can be array, text, or null
    let diagnosisTexts: string[] = [];
    if (Array.isArray(c.diagnosis)) {
      diagnosisTexts = c.diagnosis as string[];
    } else if (c.diagnosis_text) {
      diagnosisTexts = String(c.diagnosis_text)
        .split(/[,;]/)
        .map((d) => d.trim())
        .filter(Boolean);
    } else if (c.diagnosis) {
      diagnosisTexts = String(c.diagnosis)
        .split(/[,;]/)
        .map((d) => d.trim())
        .filter(Boolean);
    }

    // Create a record for each diagnosis
    diagnosisTexts.forEach((diagText, index) => {
      diagnosisRecords.push({
        id: `${c.consultation_id}-${index}`,
        encounter_id: (c.encounter_id as string) || '',
        patient_id: (c.patient_id as string) || '',
        diagnosis_type: index === 0 ? 'primary' : 'secondary',
        diagnosis_text: diagText,
        icd10_code: '',
        icd10_description: undefined,
        certainty: undefined,
        is_chronic: false,
        notes: undefined,
        diagnosed_by_id: (c.doctor_id as string) || '',
        diagnosed_by_name: doctorName,
        diagnosed_at:
          (c.consultation_date as string) || (c.created_at as string),
      });
    });

    // Add differential diagnoses if present
    if (Array.isArray(c.differential_diagnosis)) {
      (c.differential_diagnosis as string[]).forEach((diffDiag, index) => {
        diagnosisRecords.push({
          id: `${c.consultation_id}-diff-${index}`,
          encounter_id: (c.encounter_id as string) || '',
          patient_id: (c.patient_id as string) || '',
          diagnosis_type: 'differential',
          diagnosis_text: diffDiag,
          icd10_code: '',
          icd10_description: undefined,
          certainty: 'Differential',
          is_chronic: false,
          notes: undefined,
          diagnosed_by_id: (c.doctor_id as string) || '',
          diagnosed_by_name: doctorName,
          diagnosed_at:
            (c.consultation_date as string) || (c.created_at as string),
        });
      });
    }
  });

  return diagnosisRecords;
}
/**
 * Fetch vitals for encounters
 */
export async function fetchVitals(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<VitalsRecord[]> {
  if (!encounterIds.length && !visitIds.length) return [];

  // First try by encounter_id
  let data: Record<string, unknown>[] | null = null;
  let error = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('vitals')
      .select(
        `
        id,
        encounter_id,
        patient_id,
        temperature,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        pulse,
        respiratory_rate,
        oxygen_saturation,
        weight,
        height,
        bmi,
        blood_glucose,
        pain_level,
        nurse_id,
        date_recorded
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  // If no results by encounter_id, try by visit_id
  if ((!data || data.length === 0) && visitIds.length > 0) {
    log.debug(
      'No vitals found by encounter_id; retrying by visit_id',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('vitals')
      .select(
        `
        id,
        encounter_id,
        patient_id,
        temperature,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        pulse,
        respiratory_rate,
        oxygen_saturation,
        weight,
        height,
        bmi,
        blood_glucose,
        pain_level,
        nurse_id,
        date_recorded
      `,
      )
      .in('patient_id', visitIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  if (error) {
    log.error(
      'Failed to fetch vitals',
      error,
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  if (!data || data.length === 0) {
    log.debug(
      'No vitals found',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  log.debug('Fetched vitals', { count: data.length });

  // Lookup nurse names
  const nurseIds = data
    .map((v: Record<string, unknown>) => v.nurse_id as string)
    .filter(Boolean);
  const nurseNames = await batchLookupStaffNames(nurseIds);

  return data.map((v: Record<string, unknown>) => ({
    id: v.id as string,
    encounter_id: v.encounter_id as string,
    patient_id: (v.patient_id as string) || '',
    temperature: v.temperature as number,
    temperature_unit: 'C' as const,
    blood_pressure_systolic: v.blood_pressure_systolic as number,
    blood_pressure_diastolic: v.blood_pressure_diastolic as number,
    pulse_rate: v.pulse as number,
    respiratory_rate: v.respiratory_rate as number,
    oxygen_saturation: v.oxygen_saturation as number,
    weight: v.weight as number,
    weight_unit: 'kg' as const,
    height: v.height as number,
    height_unit: 'cm' as const,
    bmi: v.bmi as number,
    blood_glucose: v.blood_glucose as number,
    pain_score: v.pain_level as number,
    recorded_by_id: v.nurse_id as string,
    recorded_by_name: nurseNames.get(v.nurse_id as string) || '',
    recorded_at: v.date_recorded as string,
  }));
}

/**
 * Fetch nursing records for encounters
 */
export async function fetchNursingRecords(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<NursingRecord[]> {
  if (!encounterIds.length && !visitIds.length) return [];

  // First try by encounter_id
  let data: Record<string, unknown>[] | null = null;
  let error = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('nursing_notes')
      .select(
        `
        id,
        encounter_id,
        patient_id,
        consultation_id,
        treatment_plan_id,
        note_type,
        title,
        content,
        patient_condition,
        pain_level,
        interventions_performed,
        patient_response,
        follow_up_required,
        follow_up_notes,
        recorded_by,
        shift,
        is_critical,
        requires_doctor_review,
        created_at,
        updated_at
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  // If no results by encounter_id, try by visit_id
  if ((!data || data.length === 0) && visitIds.length > 0) {
    log.debug(
      'No nursing notes found by encounter_id; retrying alternate lookup',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('nursing_notes')
      .select(
        `
        id,
        encounter_id,
        patient_id,
        consultation_id,
        treatment_plan_id,
        note_type,
        title,
        content,
        patient_condition,
        pain_level,
        interventions_performed,
        patient_response,
        follow_up_required,
        follow_up_notes,
        recorded_by,
        shift,
        is_critical,
        requires_doctor_review,
        created_at,
        updated_at
      `,
      )
      .in('encounter_id', encounterIds) // Try encounter_id again as nursing_notes may not have visit_id
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  if (error) {
    log.error(
      'Failed to fetch nursing notes',
      error,
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  if (!data || data.length === 0) {
    log.debug(
      'No nursing notes found',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  log.debug('Fetched nursing notes', { count: data.length });

  // Lookup nurse names
  const nurseIds = data
    .map((n: Record<string, unknown>) => n.recorded_by as string)
    .filter(Boolean);
  const nurseNames = await batchLookupStaffNames(nurseIds);

  return data.map((n: Record<string, unknown>) => ({
    id: n.id as string,
    encounter_id: n.encounter_id as string,
    patient_id: (n.patient_id as string) || '',
    admission_id: '', // Not in nursing_notes schema
    note_type: (n.note_type as string) || 'Progress_Note',
    notes: (n.content as string) || (n.title as string) || '', // Use content or title from schema
    patient_condition: (n.patient_condition as string) || 'Stable',
    interventions: n.interventions_performed
      ? [n.interventions_performed as string]
      : [],
    observations: (n.patient_response as string) || '',
    concerns: (n.follow_up_notes as string) || '',
    nurse_id: n.recorded_by as string,
    nurse_name: nurseNames.get(n.recorded_by as string) || '',
    shift: n.shift as string,
    created_at: n.created_at as string,
    updated_at: n.updated_at as string,
  })) as NursingRecord[];
}

/**
 * Fetch prescriptions for encounters
 */
export async function fetchPrescriptions(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<PrescriptionRecord[]> {
  if (!encounterIds.length && !visitIds.length) return [];

  // First try by encounter_id
  let data: Record<string, unknown>[] | null = null;
  let error = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('prescriptions')
      .select(
        `
        prescription_id,
        encounter_id,
        visit_id,
        patient_id,
        drug_id,
        drug_name,
        dosage,
        route,
        frequency,
        duration,
        quantity_prescribed,
        quantity_dispensed,
        instructions,
        status,
        doctor_id,
        created_at,
        verified_by,
        verified_at,
        dispensed_by,
        dispensed_at
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  // If no results by encounter_id, try by visit_id
  if ((!data || data.length === 0) && visitIds.length > 0) {
    log.debug(
      'No prescriptions found by encounter_id; retrying by visit_id',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('prescriptions')
      .select(
        `
        prescription_id,
        encounter_id,
        visit_id,
        patient_id,
        drug_id,
        drug_name,
        dosage,
        route,
        frequency,
        duration,
        quantity_prescribed,
        quantity_dispensed,
        instructions,
        status,
        doctor_id,
        created_at,
        verified_by,
        verified_at,
        dispensed_by,
        dispensed_at
      `,
      )
      .in('visit_id', visitIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  if (error) {
    log.error(
      'Failed to fetch prescriptions',
      error,
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  if (!data || data.length === 0) {
    log.debug(
      'No prescriptions found',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  log.debug('Fetched prescriptions', { count: data.length });

  // Lookup staff names for doctors
  const doctorIds = data
    .map((p: Record<string, unknown>) => p.doctor_id as string)
    .filter(Boolean);
  const doctorNames = await batchLookupStaffNames(doctorIds);

  return data.map((p: Record<string, unknown>) => ({
    id: p.prescription_id as string,
    encounter_id: (p.encounter_id as string) || (p.visit_id as string) || '',
    patient_id: (p.patient_id as string) || '',
    drug_id: p.drug_id as string,
    drug_name: (p.drug_name as string) || '',
    generic_name: '',
    dosage: (p.dosage as string) || '',
    route: (p.route as string) || 'Oral',
    frequency: (p.frequency as string) || '',
    duration: (p.duration as string) || '',
    quantity_prescribed: (p.quantity_prescribed as number) || 0,
    quantity_dispensed: p.quantity_dispensed as number,
    instructions: p.instructions as string,
    status: (p.status as string) || 'Pending',
    prescribed_by_id: p.doctor_id as string,
    prescribed_by_name:
      doctorNames.get(p.doctor_id as string) || (p.doctor_id as string) || '',
    prescribed_at: p.created_at as string,
    verified_by_id: p.verified_by as string,
    verified_at: p.verified_at as string,
    dispensed_by_id: p.dispensed_by as string,
    dispensed_at: p.dispensed_at as string,
  })) as PrescriptionRecord[];
}

/**
 * Fetch lab requests and results for encounters
 */
export async function fetchLabData(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<{
  requests: LabRequestRecord[];
  results: LabResultRecord[];
}> {
  if (!encounterIds.length && !visitIds.length)
    return { requests: [], results: [] };

  // First try by encounter_id
  let requestData: Record<string, unknown>[] | null = null;
  let requestError = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('lab_requests')
      .select(
        `
        request_id,
        encounter_id,
        visit_id,
        patient_id,
        test_id,
        priority,
        clinical_notes,
        status,
        ordered_by,
        created_at,
        result_date
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    requestData = result.data;
    requestError = result.error;
  }

  // If no results by encounter_id, try by visit_id
  if ((!requestData || requestData.length === 0) && visitIds.length > 0) {
    log.debug(
      'No lab requests found by encounter_id; retrying by visit_id',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('lab_requests')
      .select(
        `
        request_id,
        encounter_id,
        visit_id,
        patient_id,
        test_id,
        priority,
        clinical_notes,
        status,
        ordered_by,
        created_at,
        result_date
      `,
      )
      .in('visit_id', visitIds)
      .order('created_at', { ascending: false });

    requestData = result.data;
    requestError = result.error;
  }

  if (requestError) {
    log.error(
      'Failed to fetch lab requests',
      requestError,
      buildIdentifierSummary(encounterIds, visitIds),
    );
  }

  const requests =
    requestData && !requestError
      ? (requestData.map((r: Record<string, unknown>) => ({
          id: r.request_id as string,
          encounter_id:
            (r.encounter_id as string) || (r.visit_id as string) || '',
          patient_id: (r.patient_id as string) || '',
          request_number: (r.request_id as string) || '',
          test_id: r.test_id as string,
          test_name: '', // Not stored in lab_requests, would need join to tests table
          test_category: '', // Not stored in lab_requests
          priority: (r.priority as string) || 'Routine',
          clinical_indication: r.clinical_notes as string,
          ordered_by_id: (r.ordered_by as string) || '',
          ordered_by_name: '', // Will be populated below
          ordered_at: r.created_at as string,
          status: (r.status as string) || 'Pending',
          completed_at: r.result_date as string,
        })) as LabRequestRecord[])
      : ([] as LabRequestRecord[]);

  // Lookup staff names for ordered_by
  if (requests.length > 0) {
    const staffIds = requests.map((r) => r.ordered_by_id).filter(Boolean);
    const staffNames = await batchLookupStaffNames(staffIds);
    for (const request of requests) {
      if (request.ordered_by_id) {
        request.ordered_by_name =
          staffNames.get(request.ordered_by_id) || request.ordered_by_id;
      }
    }
  }

  log.debug('Fetched lab requests', { count: requests.length });

  // Fetch lab results for these requests
  const requestIds = requests.map((r) => r.id).filter(Boolean);
  let results: LabResultRecord[] = [];

  if (requestIds.length > 0) {
    const { data: resultData, error: resultError } = await supabase
      .from('lab_results')
      .select(
        `
        id,
        request_id,
        test_id,
        patient_id,
        result_value,
        unit,
        reference_range,
        is_abnormal,
        is_critical,
        technician_id,
        verified_by,
        verified_at,
        comments,
        created_at
      `,
      )
      .in('request_id', requestIds)
      .order('created_at', { ascending: false });

    if (resultData && !resultError) {
      results = resultData.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        lab_request_id: r.request_id as string,
        test_name: '', // Would need join to lab_test_catalogue via test_id
        result_value: (r.result_value as string) || '',
        result_numeric: undefined, // Not in schema
        unit: r.unit as string,
        reference_range_low: undefined, // Not in schema, use reference_range
        reference_range_high: undefined, // Not in schema
        reference_range_text: r.reference_range as string,
        abnormal_flag: r.is_abnormal
          ? ('A' as const)
          : r.is_critical
            ? ('C' as const)
            : undefined,
        interpretation: r.comments as string,
        performed_by_id: r.technician_id as string,
        verified_by_id: r.verified_by as string,
        completed_at: (r.verified_at as string) || (r.created_at as string),
      })) as LabResultRecord[];
    }
  }

  return { requests, results };
}

/**
 * Fetch radiology requests and reports for encounters
 */
export async function fetchRadiologyData(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<{
  requests: RadiologyRequestRecord[];
  reports: RadiologyReportRecord[];
}> {
  if (!encounterIds.length && !visitIds.length)
    return { requests: [], reports: [] };

  // First try by encounter_id
  let requestData: Record<string, unknown>[] | null = null;
  let requestError = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('radiology_requests')
      .select(
        `
        request_id,
        encounter_id,
        visit_id,
        patient_id,
        imaging_type,
        body_part,
        clinical_indication,
        clinical_history,
        contrast_used,
        priority,
        status,
        ordered_by,
        created_at,
        findings,
        impression,
        report,
        performed_at,
        performed_by,
        report_uploaded_at,
        report_uploaded_by
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    requestData = result.data;
    requestError = result.error;
  }

  // If no results by encounter_id, try by visit_id
  if ((!requestData || requestData.length === 0) && visitIds.length > 0) {
    log.debug(
      'No radiology requests found by encounter_id; retrying by visit_id',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('radiology_requests')
      .select(
        `
        request_id,
        encounter_id,
        visit_id,
        patient_id,
        imaging_type,
        body_part,
        clinical_indication,
        clinical_history,
        contrast_used,
        priority,
        status,
        ordered_by,
        created_at,
        findings,
        impression,
        report,
        performed_at,
        performed_by,
        report_uploaded_at,
        report_uploaded_by
      `,
      )
      .in('visit_id', visitIds)
      .order('created_at', { ascending: false });

    requestData = result.data;
    requestError = result.error;
  }

  if (requestError) {
    log.error(
      'Failed to fetch radiology requests',
      requestError,
      buildIdentifierSummary(encounterIds, visitIds),
    );
  }

  const requests =
    requestData && !requestError
      ? (requestData.map((r: Record<string, unknown>) => ({
          id: r.request_id as string,
          encounter_id:
            (r.encounter_id as string) || (r.visit_id as string) || '',
          patient_id: (r.patient_id as string) || '',
          request_number: (r.request_id as string) || '',
          imaging_type: (r.imaging_type as string) || 'X-Ray',
          examination_name: '', // Not in schema, derived from imaging_type
          body_part: (r.body_part as string) || '',
          laterality: undefined, // Not in radiology_requests schema
          clinical_indication: (r.clinical_indication as string) || '',
          clinical_history: r.clinical_history as string,
          contrast_required: r.contrast_used as boolean,
          priority: (r.priority as string) || 'Routine',
          ordered_by_id: (r.ordered_by as string) || '',
          ordered_by_name: '', // Will be populated below
          ordered_at: r.created_at as string,
          status: (r.status as string) || 'Pending',
        })) as RadiologyRequestRecord[])
      : ([] as RadiologyRequestRecord[]);

  // Lookup staff names for ordered_by
  if (requests.length > 0) {
    const staffIds = requests.map((r) => r.ordered_by_id).filter(Boolean);
    const staffNames = await batchLookupStaffNames(staffIds);
    for (const request of requests) {
      if (request.ordered_by_id) {
        request.ordered_by_name =
          staffNames.get(request.ordered_by_id) || request.ordered_by_id;
      }
    }
  }

  log.debug('Fetched radiology requests', { count: requests.length });

  // Collect radiologist IDs for lookup
  const radiologistIds: string[] = [];
  if (requestData && !requestError) {
    for (const r of requestData) {
      const id =
        ((r as Record<string, unknown>).performed_by as string) ||
        ((r as Record<string, unknown>).report_uploaded_by as string);
      if (id) radiologistIds.push(id);
    }
  }
  const radiologistNames = await batchLookupStaffNames(radiologistIds);

  // Generate reports from the request data itself (findings, impression are in radiology_requests)
  // No separate radiology_reports table exists
  const reports: RadiologyReportRecord[] =
    requestData && !requestError
      ? (requestData
          .filter(
            (r: Record<string, unknown>) =>
              r.findings || r.impression || r.report,
          )
          .map((r: Record<string, unknown>) => {
            const radiologistId =
              (r.performed_by as string) || (r.report_uploaded_by as string);
            return {
              id: r.request_id as string,
              radiology_request_id: r.request_id as string,
              technique: '', // Not stored separately
              findings: (r.findings as string) || '',
              impression: (r.impression as string) || '',
              recommendation: '', // Not in schema
              critical_finding: false, // Not in schema
              radiologist_id: radiologistId,
              radiologist_name:
                radiologistNames.get(radiologistId) || radiologistId || '',
              reported_at:
                (r.report_uploaded_at as string) ||
                (r.performed_at as string) ||
                (r.created_at as string),
            };
          }) as RadiologyReportRecord[])
      : ([] as RadiologyReportRecord[]);

  return { requests, reports };
}

/**
 * Fetch procedures for encounters
 */
export async function fetchProcedures(
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<ProcedureRecord[]> {
  if (!encounterIds.length && !visitIds.length) return [];

  // First try by encounter_id
  let data: Record<string, unknown>[] | null = null;
  let error = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('procedures')
      .select(
        `
        id,
        encounter_id,
        patient_id,
        admission_id,
        procedure_name,
        procedure_code,
        priority,
        status,
        body_site,
        laterality,
        indication,
        findings,
        complications,
        anesthesia_type,
        actual_duration_minutes,
        actual_start_time,
        actual_end_time,
        created_at,
        procedure_notes,
        primary_surgeon_id,
        staff:primary_surgeon_id(first_name, last_name)
      `,
      )
      .in('encounter_id', encounterIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  // If no results by encounter_id, try by patient_id (procedures don't have visit_id)
  if ((!data || data.length === 0) && visitIds.length > 0) {
    log.debug(
      'No procedures found by encounter_id; retrying by patient linkage',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    const result = await supabase
      .from('procedures')
      .select(
        `
        id,
        encounter_id,
        patient_id,
        admission_id,
        procedure_name,
        procedure_code,
        priority,
        status,
        body_site,
        laterality,
        indication,
        findings,
        complications,
        anesthesia_type,
        actual_duration_minutes,
        actual_start_time,
        actual_end_time,
        created_at,
        procedure_notes,
        primary_surgeon_id,
        staff:primary_surgeon_id(first_name, last_name)
      `,
      )
      .in('patient_id', visitIds)
      .order('created_at', { ascending: false });

    data = result.data;
    error = result.error;
  }

  if (error) {
    log.error(
      'Failed to fetch procedures',
      error,
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  if (!data || data.length === 0) {
    log.debug(
      'No procedures found',
      buildIdentifierSummary(encounterIds, visitIds),
    );
    return [];
  }

  log.debug('Fetched procedures', { count: data.length });

  return data.map((p: Record<string, unknown>) => ({
    id: p.id as string,
    encounter_id: p.encounter_id as string,
    patient_id: (p.patient_id as string) || '',
    admission_id: p.admission_id as string,
    procedure_name: (p.procedure_name as string) || '',
    procedure_type: 'Diagnostic' as const, // Default type, not directly in schema
    icd10_pcs_code: undefined, // Not directly in procedures table
    cpt_code: p.procedure_code as string,
    urgency: (p.priority as string) || 'Elective',
    body_site: p.body_site as string,
    laterality: p.laterality as string,
    indication: p.indication as string,
    findings: p.findings as string,
    complications: p.complications as string,
    outcome: p.status as string,
    performed_by_id: p.primary_surgeon_id as string,
    performed_by_name: p.staff
      ? `${(p.staff as Record<string, unknown>).first_name || ''} ${(p.staff as Record<string, unknown>).last_name || ''}`.trim()
      : '',
    assistant_name: '', // Stored in assistant_surgeons jsonb
    anesthetist_name: '', // Would need separate lookup
    anesthesia_type: p.anesthesia_type as string,
    duration_minutes: p.actual_duration_minutes as number,
    start_time: p.actual_start_time as string,
    end_time: p.actual_end_time as string,
    performed_at: p.created_at as string,
    operative_notes: p.procedure_notes as string,
  })) as ProcedureRecord[];
}

/**
 * Fetch billing records for a patient
 * Filters by patient_id to ensure only the specific patient's billing records are returned
 */
export async function fetchBillingRecords(
  patientId: string,
  encounterIds: string[],
  visitIds: string[] = [],
): Promise<BillingRecord[]> {
  if (!patientId) return [];

  // Fetch billing records directly by patient_id
  const { data, error } = await supabase
    .from('billing_orders')
    .select(
      `
      id,
      encounter_id,
      visit_id,
      patient_id,
      order_number,
      payment_method,
      source_module,
      total_amount,
      discount_amount,
      tax_amount,
      net_amount,
      nhis_covered,
      nhis_percentage,
      nhis_payable,
      patient_payable,
      paid_amount,
      balance_amount,
      status,
      created_at,
      updated_at,
      billing_items (
        id,
        item_type,
        item_id,
        item_name,
        quantity,
        unit_price,
        total_price,
        nhis_covered,
        nhis_payable
      ),
      receipts (
        receipt_id,
        receipt_number,
        amount_paid,
        payment_method,
        reference_number,
        issued_by,
        created_at
      )
    `,
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to fetch billing records', error, {
      hasPatientId: Boolean(patientId),
      ...buildIdentifierSummary(encounterIds, visitIds),
    });
    return [];
  }

  if (!data || data.length === 0) {
    log.debug('No billing records found', {
      hasPatientId: Boolean(patientId),
      ...buildIdentifierSummary(encounterIds, visitIds),
    });
    return [];
  }

  log.debug('Fetched billing records', { count: data.length });

  // Transform the nested data to our record format
  return data.map((order: Record<string, unknown>) => {
    const items = (order.billing_items as Record<string, unknown>[]) || [];
    const payments = (order.receipts as Record<string, unknown>[]) || [];

    return {
      id: order.id as string,
      encounter_id: order.encounter_id as string,
      patient_id: (order.patient_id as string) || '',
      order_number: (order.order_number as string) || '',
      invoice_number: order.order_number as string, // Use order_number as invoice reference
      payment_category: (order.payment_method as string) || 'Cash',
      hmo_id: '', // Not in billing_orders schema
      subtotal_amount: (order.total_amount as number) || 0,
      discount_amount: order.discount_amount as number,
      tax_amount: order.tax_amount as number,
      total_amount:
        (order.net_amount as number) || (order.total_amount as number) || 0,
      nhis_amount: (order.nhis_payable as number) || 0,
      patient_responsibility:
        (order.patient_payable as number) ||
        ((order.net_amount as number) || 0) -
          ((order.nhis_payable as number) || 0),
      amount_paid: (order.paid_amount as number) || 0,
      balance: (order.balance_amount as number) || 0,
      status: (order.status as string) || 'Pending',
      items: items.map((item) => ({
        id: item.id as string,
        billing_id: order.id as string,
        service_type: (item.item_type as string) || 'Other',
        service_id: item.item_id as string,
        service_name: (item.item_name as string) || '',
        quantity: (item.quantity as number) || 1,
        unit_price: (item.unit_price as number) || 0,
        amount: (item.total_price as number) || 0,
        final_amount: (item.total_price as number) || 0,
        nhis_covered: item.nhis_covered as boolean,
        nhis_amount: item.nhis_payable as number,
      })) as BillingItemRecord[],
      payments: payments.map((payment) => ({
        id: payment.receipt_id as string,
        billing_id: order.id as string,
        receipt_number: payment.receipt_number as string,
        amount: (payment.amount_paid as number) || 0,
        payment_method: (payment.payment_method as string) || 'Cash',
        reference: payment.reference_number as string,
        received_by_id: payment.issued_by as string,
        received_by_name: '',
        received_at: payment.created_at as string,
      })) as PaymentRecord[],
      created_at: order.created_at as string,
      updated_at: order.updated_at as string,
    };
  }) as BillingRecord[];
}

/**
 * Fetch admissions for a patient
 */
export async function fetchAdmissions(
  patientId: string,
  filters: ExportFilters,
): Promise<AdmissionRecord[]> {
  let query = supabase
    .from('admissions')
    .select(
      `
      id,
      encounter_id,
      patient_id,
      admission_number,
      admission_type,
      admission_date,
      ward_id,
      bed_id,
      admission_diagnosis,
      admission_icd10,
      expected_discharge_date,
      discharge_date,
      discharge_diagnosis,
      discharge_icd10,
      discharge_summary,
      follow_up_instructions,
      outcome,
      length_of_stay,
      attending_doctor_id,
      primary_nurse_id,
      status,
      created_at,
      updated_at,
      wards:ward_id(name, ward_type),
      beds:bed_id(bed_number, room_number),
      doctors:attending_doctor_id(first_name, last_name)
    `,
    )
    .eq('patient_id', patientId)
    .order('admission_date', { ascending: false });

  // Apply date range filter
  if (filters.dateRange?.from) {
    query = query.gte('admission_date', filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    query = query.lte('admission_date', filters.dateRange.to);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((a: Record<string, unknown>) => ({
    id: a.id as string,
    encounter_id: a.encounter_id as string,
    patient_id: a.patient_id as string,
    admission_number: (a.admission_number as string) || '',
    admission_type: (a.admission_type as string) || 'Emergency',
    admission_date: a.admission_date as string,
    ward_id: a.ward_id as string,
    ward_name: ((a.wards as Record<string, unknown>)?.name as string) || '',
    ward_type: (a.wards as Record<string, unknown>)?.ward_type as string,
    bed_id: a.bed_id as string,
    bed_number:
      ((a.beds as Record<string, unknown>)?.bed_number as string) || '',
    room_number: (a.beds as Record<string, unknown>)?.room_number as string,
    admission_diagnosis: (a.admission_diagnosis as string) || '',
    admission_icd10: a.admission_icd10 as string,
    expected_discharge_date: a.expected_discharge_date as string,
    discharge_date: a.discharge_date as string,
    discharge_diagnosis: a.discharge_diagnosis as string,
    discharge_icd10: a.discharge_icd10 as string,
    discharge_summary: a.discharge_summary as string,
    follow_up_instructions: a.follow_up_instructions as string,
    outcome: a.outcome as string,
    length_of_stay: a.length_of_stay as number,
    attending_doctor_id: a.attending_doctor_id as string,
    attending_doctor_name: a.doctors
      ? `${(a.doctors as Record<string, unknown>).first_name || ''} ${(a.doctors as Record<string, unknown>).last_name || ''}`.trim()
      : '',
    primary_nurse_id: a.primary_nurse_id as string,
    status: (a.status as string) || 'Admitted',
    created_at: a.created_at as string,
    updated_at: a.updated_at as string,
  })) as AdmissionRecord[];
}

/**
 * Fetch ward round notes for admissions
 */
export async function fetchWardRoundNotes(
  admissionIds: string[],
): Promise<WardRoundNoteRecord[]> {
  if (!admissionIds.length) return [];

  const { data, error } = await supabase
    .from('ward_rounds')
    .select(
      `
      id,
      admission_id,
      patient_id,
      round_date,
      round_type,
      subjective,
      objective,
      assessment,
      plan,
      investigations_ordered,
      medication_changes,
      doctor_id,
      created_at,
      updated_at,
      users:doctor_id(first_name, last_name)
    `,
    )
    .in('admission_id', admissionIds)
    .order('round_date', { ascending: false });

  if (error || !data) return [];

  return data.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    admission_id: r.admission_id as string,
    patient_id: (r.patient_id as string) || '',
    round_date: r.round_date as string,
    round_type: (r.round_type as string) || 'Morning',
    subjective: (r.subjective as string) || '',
    objective: (r.objective as string) || '',
    assessment: (r.assessment as string) || '',
    plan: (r.plan as string) || '',
    investigations_ordered: r.investigations_ordered as string[],
    medication_changes: r.medication_changes as string,
    doctor_id: r.doctor_id as string,
    doctor_name: r.users
      ? `${(r.users as Record<string, unknown>).first_name || ''} ${(r.users as Record<string, unknown>).last_name || ''}`.trim()
      : '',
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  })) as WardRoundNoteRecord[];
}

/**
 * Fetch bed transfers for admissions
 */
export async function fetchBedTransfers(
  admissionIds: string[],
): Promise<BedTransferRecord[]> {
  if (!admissionIds.length) return [];

  const { data, error } = await supabase
    .from('bed_transfers')
    .select(
      `
      id,
      admission_id,
      patient_id,
      from_ward_id,
      from_bed_id,
      to_ward_id,
      to_bed_id,
      transfer_reason,
      clinical_indication,
      authorized_by,
      transfer_date,
      notes,
      from_ward:from_ward_id(name),
      to_ward:to_ward_id(name),
      from_bed:from_bed_id(bed_number, room_number),
      to_bed:to_bed_id(bed_number, room_number),
      users:authorized_by(first_name, last_name)
    `,
    )
    .in('admission_id', admissionIds)
    .order('transfer_date', { ascending: false });

  if (error || !data) return [];

  return data.map((t: Record<string, unknown>) => ({
    id: t.id as string,
    admission_id: t.admission_id as string,
    patient_id: (t.patient_id as string) || '',
    from_ward_id: t.from_ward_id as string,
    from_ward_name:
      ((t.from_ward as Record<string, unknown>)?.name as string) || '',
    from_bed_id: t.from_bed_id as string,
    from_bed_number:
      ((t.from_bed as Record<string, unknown>)?.bed_number as string) || '',
    from_room_number: (t.from_bed as Record<string, unknown>)
      ?.room_number as string,
    to_ward_id: t.to_ward_id as string,
    to_ward_name:
      ((t.to_ward as Record<string, unknown>)?.name as string) || '',
    to_bed_id: t.to_bed_id as string,
    to_bed_number:
      ((t.to_bed as Record<string, unknown>)?.bed_number as string) || '',
    to_room_number: (t.to_bed as Record<string, unknown>)
      ?.room_number as string,
    transfer_reason: (t.transfer_reason as string) || '',
    clinical_indication: t.clinical_indication as string,
    authorized_by_id: t.authorized_by as string,
    authorized_by_name: t.users
      ? `${(t.users as Record<string, unknown>).first_name || ''} ${(t.users as Record<string, unknown>).last_name || ''}`.trim()
      : '',
    transfer_date: t.transfer_date as string,
    notes: t.notes as string,
  }));
}

// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Fetch complete patient journey data for export
 */
export async function fetchPatientJourney(
  patientId: string,
  filters: ExportFilters,
  exportedBy: { id: string; name: string; role: string },
): Promise<PatientJourneyExport | null> {
  // Fetch patient core data
  const patient = await fetchPatientCore(patientId);
  if (!patient) return null;

  // Fetch encounters
  const encounters = filters.includeModules.encounters
    ? await fetchPatientEncounters(patientId, filters)
    : [];

  const encounterIds = encounters.map((e) => e.id);
  const visitIds = encounters
    .map((e) => e.visit_id)
    .filter(Boolean) as string[];

  log.debug(
    'Prepared patient journey identifiers',
    buildIdentifierSummary(encounterIds, visitIds),
  );

  // Fetch related data based on selected modules
  const [
    diagnoses,
    vitals,
    nursingRecords,
    prescriptions,
    labData,
    radiologyData,
    procedures,
    billingRecords,
    admissions,
  ] = await Promise.all([
    filters.includeModules.diagnoses
      ? fetchDiagnoses(encounterIds, visitIds)
      : [],
    filters.includeModules.vitals ? fetchVitals(encounterIds, visitIds) : [],
    filters.includeModules.nursing
      ? fetchNursingRecords(encounterIds, visitIds)
      : [],
    filters.includeModules.prescriptions
      ? fetchPrescriptions(encounterIds, visitIds)
      : [],
    filters.includeModules.laboratory
      ? fetchLabData(encounterIds, visitIds)
      : { requests: [], results: [] },
    filters.includeModules.radiology
      ? fetchRadiologyData(encounterIds, visitIds)
      : { requests: [], reports: [] },
    filters.includeModules.procedures
      ? fetchProcedures(encounterIds, visitIds)
      : [],
    filters.includeModules.billing
      ? fetchBillingRecords(patientId, encounterIds, visitIds)
      : [],
    filters.includeModules.admissions
      ? fetchAdmissions(patientId, filters)
      : [],
  ]);

  const admissionIds = admissions.map((a) => a.id);

  // Fetch admission-related data
  const [wardRoundNotes, bedTransfers] = await Promise.all([
    filters.includeModules.wardRounds ? fetchWardRoundNotes(admissionIds) : [],
    filters.includeModules.bedTransfers ? fetchBedTransfers(admissionIds) : [],
  ]);

  // Build export metadata
  const exportMetadata: ExportMetadata = {
    exportId: crypto.randomUUID(),
    exportDate: new Date().toISOString().split('T')[0],
    exportTime: new Date().toTimeString().split(' ')[0],
    exportedBy,
    facility: {
      id: 'XENOCARE',
      name: 'XenoCare',
    },
    dateRange: {
      from: filters.dateRange?.from || '',
      to: filters.dateRange?.to || '',
    },
    filters: filters as unknown as Record<string, unknown>,
    modulesCovered: Object.entries(filters.includeModules)
      .filter(([, included]) => included)
      .map(([module]) => module),
    recordCounts: {
      patients: 1,
      encounters: encounters.length,
      diagnoses: diagnoses.length,
      vitals: vitals.length,
      prescriptions: prescriptions.length,
      labRequests: labData.requests.length,
      radiologyRequests: radiologyData.requests.length,
      procedures: procedures.length,
      admissions: admissions.length,
      billingRecords: billingRecords.length,
      nursingRecords: nursingRecords.length,
    },
    exportFormat: 'PDF',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
  };

  return {
    exportMetadata,
    patient,
    encounters,
    diagnoses,
    vitals,
    nursingRecords,
    treatmentPlans: [], // TODO: Implement if treatment_plans table exists
    clinicalNotes: [], // TODO: Implement if clinical_notes table exists
    prescriptions,
    labRequests: labData.requests,
    labResults: labData.results,
    radiologyRequests: radiologyData.requests,
    radiologyReports: radiologyData.reports,
    procedures,
    billingRecords,
    admissions,
    wardRoundNotes,
    bedTransfers,
  };
}

/**
 * Fetch multiple patients' journey data for batch export
 */
export async function fetchMultiPatientJourneys(
  patientIds: string[],
  filters: ExportFilters,
  exportedBy: { id: string; name: string; role: string },
): Promise<MultiPatientExport> {
  const patients: PatientJourneyExport[] = [];

  for (const patientId of patientIds) {
    const journey = await fetchPatientJourney(patientId, filters, exportedBy);
    if (journey) {
      patients.push(journey);
    }
  }

  // Build aggregate metadata
  const exportMetadata: ExportMetadata = {
    exportId: crypto.randomUUID(),
    exportDate: new Date().toISOString().split('T')[0],
    exportTime: new Date().toTimeString().split(' ')[0],
    exportedBy,
    facility: {
      id: 'XENOCARE',
      name: 'XenoCare',
    },
    dateRange: {
      from: filters.dateRange?.from || '',
      to: filters.dateRange?.to || '',
    },
    filters: filters as unknown as Record<string, unknown>,
    modulesCovered: Object.entries(filters.includeModules)
      .filter(([, included]) => included)
      .map(([module]) => module),
    recordCounts: {
      patients: patients.length,
      encounters: patients.reduce((sum, p) => sum + p.encounters.length, 0),
      diagnoses: patients.reduce((sum, p) => sum + p.diagnoses.length, 0),
      vitals: patients.reduce((sum, p) => sum + p.vitals.length, 0),
      prescriptions: patients.reduce(
        (sum, p) => sum + p.prescriptions.length,
        0,
      ),
      labRequests: patients.reduce((sum, p) => sum + p.labRequests.length, 0),
      radiologyRequests: patients.reduce(
        (sum, p) => sum + p.radiologyRequests.length,
        0,
      ),
      procedures: patients.reduce((sum, p) => sum + p.procedures.length, 0),
      admissions: patients.reduce((sum, p) => sum + p.admissions.length, 0),
      billingRecords: patients.reduce(
        (sum, p) => sum + p.billingRecords.length,
        0,
      ),
      nursingRecords: patients.reduce(
        (sum, p) => sum + p.nursingRecords.length,
        0,
      ),
    },
    exportFormat: 'PDF',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
  };

  return {
    exportMetadata,
    patients,
  };
}
