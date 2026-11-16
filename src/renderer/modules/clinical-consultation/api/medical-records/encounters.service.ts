/**
 * =============================================================================
 * XENOCARE EMR - ENCOUNTERS SERVICE
 * Patient encounters listing and pagination
 * =============================================================================
 */

import type {
  EncounterSummary,
  PaginatedEncounters,
  MedicalRecordsFilters,
  VisitRow,
  ConsultationRow,
  StaffRow,
} from './types';
import { log } from './constants';
import {
  getTimeframeDate,
  toLookupMap,
  parseDiagnosisToArray,
  normalizeDoctorName,
} from './utils';
import {
  resolvePatientUuid,
  discoverEncounterIdsFromRelatedRecords,
} from './patient-id-resolver';
import {
  fetchVisitsByPatientUuid,
  fetchVisitsByEncounterIds,
  countVisitsByPatientUuid,
  fetchConsultationsByEncounterIds,
  fetchEncounterCountsBatch,
} from './queries';
import {
  mapVisitToEncounterSummary,
  calculateEncounterCounts,
} from './mappers';
import { supabase } from '../../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../../lib/filterSanitizer';

// =============================================================================
// Get Paginated Encounters
// =============================================================================

/**
 * Get paginated encounters for a patient
 */
export async function getPatientEncounters(
  patientId: string,
  page: number = 1,
  limit: number = 10,
  filters?: MedicalRecordsFilters,
): Promise<PaginatedEncounters> {
  log('log', 'getPatientEncounters called with:', patientId);

  const offset = (page - 1) * limit;
  const dateFilter = filters?.timeframe
    ? getTimeframeDate(filters.timeframe)
    : null;

  // Resolve patient identifiers
  const resolved = await resolvePatientUuid(patientId);
  if (!resolved) {
    log('error', 'Could not resolve patient for encounters:', patientId);
    return { encounters: [], total: 0, page, totalPages: 0, hasMore: false };
  }

  const {
    uuid: patientUuid,
    externalId: patientExternalId,
    emrNumber: patientEmrNumber,
  } = resolved;
  log('log', 'Resolved for encounters - UUID:', patientUuid);

  // Get total count
  let totalCount = await countVisitsByPatientUuid(patientUuid, dateFilter);
  log('log', 'Total encounters count:', totalCount);

  // Fetch encounters - primary strategy: by patient UUID
  let encounters = await fetchVisitsByPatientUuid(patientUuid, {
    dateFilter,
    limit,
  });

  // Apply offset manually for pagination
  if (offset > 0 && encounters.length > offset) {
    encounters = encounters.slice(offset, offset + limit);
  }

  // FALLBACK: If no encounters found, try via related records
  if (encounters.length === 0) {
    log('log', 'No direct encounters found, trying fallback...');

    const encounterIds =
      await discoverEncounterIdsFromRelatedRecords(patientExternalId);

    if (encounterIds.length > 0) {
      log('log', 'Found encounter_ids via fallback:', encounterIds.length);
      encounters = await fetchVisitsByEncounterIds(encounterIds, { limit });
      totalCount = encounterIds.length;

      // Apply offset
      if (offset > 0 && encounters.length > offset) {
        encounters = encounters.slice(offset, offset + limit);
      }
    }
  }

  if (encounters.length === 0) {
    log('log', 'No encounters found by any method');
    return { encounters: [], total: 0, page, totalPages: 0, hasMore: false };
  }

  // Fetch consultations for diagnosis info
  const encounterIds = encounters.map((e) => e.id);
  const consultations = await fetchConsultationsByEncounterIds(encounterIds);
  const consultationMap = toLookupMap(
    consultations,
    (c) => c.encounter_id || '',
  );

  // Fetch counts in batch for performance
  const visitIds = encounters.map((e) => e.visit_id);
  const batchCounts = await fetchEncounterCountsBatch(encounterIds, visitIds);
  const countsMap = calculateEncounterCounts(
    encounters as VisitRow[],
    batchCounts,
  );

  // Map to summaries
  const encounterSummaries: EncounterSummary[] = encounters.map((enc) => {
    const consultation = consultationMap.get(enc.id);
    const counts = countsMap.get(enc.id);

    return mapVisitToEncounterSummary(enc as VisitRow, {
      patientUuid,
      emrNumber: patientEmrNumber,
      consultation: consultation as ConsultationRow | undefined,
      counts,
    });
  });

  const total = totalCount;
  const totalPages = Math.ceil(total / limit);

  return {
    encounters: encounterSummaries,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

// =============================================================================
// Get Encounters by Problem
// =============================================================================

/**
 * Get encounters filtered by problem/diagnosis
 */
export async function getEncountersByProblem(
  patientId: string,
  problemName: string,
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedEncounters> {
  log('log', 'getEncountersByProblem called:', patientId, problemName);

  const offset = (page - 1) * limit;

  // Resolve patient identifiers
  const resolved = await resolvePatientUuid(patientId);
  if (!resolved) {
    log('error', 'Could not resolve patient for problem search:', patientId);
    return { encounters: [], total: 0, page, totalPages: 0, hasMore: false };
  }

  const {
    uuid: patientUuid,
    externalId: patientExternalId,
    emrNumber: patientEmrNumber,
  } = resolved;

  // Get consultations with matching diagnosis
  const { data: consultations, error } = await supabase
    .from('consultations')
    .select(
      'consultation_id, consultation_date, diagnosis, diagnosis_text, visit_id',
    )
    .eq('patient_id', patientExternalId)
    .or(
      `diagnosis.ilike.%${sanitizeFilterValue(problemName)}%,diagnosis_text.ilike.%${sanitizeFilterValue(problemName)}%`,
    )
    .order('consultation_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log('error', 'Error fetching encounters by problem:', error);
    return { encounters: [], total: 0, page, totalPages: 0, hasMore: false };
  }

  // Get total count
  const { count } = await supabase
    .from('consultations')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientExternalId)
    .or(
      `diagnosis.ilike.%${sanitizeFilterValue(problemName)}%,diagnosis_text.ilike.%${sanitizeFilterValue(problemName)}%`,
    );

  // Get visit details for each consultation
  const visitIds =
    consultations
      ?.map((c: { visit_id: string }) => c.visit_id)
      .filter(Boolean) || [];
  const { data: visits } = await supabase
    .from('visits')
    .select(
      `
      id, visit_id, encounter_number, encounter_date, visit_type,
      chief_complaint, status,
      attending_doctor:staff!visits_attending_doctor_id_fkey(first_name, last_name)
    `,
    )
    .in('visit_id', visitIds);

  type VisitResult = {
    id: string;
    visit_id: string;
    encounter_number?: string;
    encounter_date?: string;
    visit_type?: string;
    chief_complaint?: string;
    status?: string;
    attending_doctor?: StaffRow | StaffRow[];
  };

  const visitMap = new Map(
    (visits as VisitResult[] | null)?.map((v) => [v.visit_id, v]) || [],
  );

  type ConsultationResult = {
    consultation_id: string;
    consultation_date?: string;
    diagnosis?: string | string[];
    diagnosis_text?: string;
    visit_id: string;
  };

  const encounterSummaries: EncounterSummary[] = (
    (consultations || []) as ConsultationResult[]
  ).map((c) => {
    const visit = visitMap.get(c.visit_id);
    const diagnoses = parseDiagnosisToArray(c.diagnosis, c.diagnosis_text);
    const doctorName = visit
      ? normalizeDoctorName(visit.attending_doctor)
      : null;

    return {
      encounter_id: visit?.id || c.consultation_id,
      encounter_number:
        visit?.encounter_number || visit?.visit_id || c.visit_id,
      visit_id: c.visit_id,
      patient_id: patientUuid,
      emr_number: patientEmrNumber,
      encounter_date: visit?.encounter_date || c.consultation_date || '',
      visit_type: visit?.visit_type || 'General',
      chief_complaint: visit?.chief_complaint || '',
      diagnoses,
      doctor: doctorName ? { name: doctorName } : null,
      status: visit?.status || 'Completed',
      has_labs: false,
      has_imaging: false,
      has_prescriptions: false,
      lab_count: 0,
      imaging_count: 0,
      prescription_count: 0,
    };
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    encounters: encounterSummaries,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}
