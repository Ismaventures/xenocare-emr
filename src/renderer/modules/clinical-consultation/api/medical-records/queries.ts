/**
 * =============================================================================
 * XENOCARE EMR - QUERY BUILDERS
 * Supabase query builder functions for medical records
 * =============================================================================
 */

import { supabase } from '../../../../api/supabaseClient';
import {
  VISIT_SELECT_FIELDS,
  CONSULTATION_SELECT_FIELDS,
  VITALS_SELECT_FIELDS,
  PRESCRIPTION_SELECT_FIELDS,
  LAB_REQUEST_SELECT_FIELDS,
  RADIOLOGY_REQUEST_SELECT_FIELDS,
  PROCEDURE_SELECT_FIELDS,
  NURSING_NOTES_SELECT_FIELDS,
  DAILY_PROGRESS_NOTES_SELECT_FIELDS,
  WARD_ROUND_NOTES_SELECT_FIELDS,
  TREATMENT_PLANS_SELECT_FIELDS,
  ACTIVE_MEDICATION_STATUSES,
  log,
} from './constants';

// =============================================================================
// Visit/Encounter Queries
// =============================================================================

export async function fetchVisitsByPatientUuid(
  patientUuid: string,
  options: { dateFilter?: string | null; limit?: number } = {},
) {
  const { dateFilter, limit = 10 } = options;

  let query = supabase
    .from('visits')
    .select(VISIT_SELECT_FIELDS)
    .eq('patient_id', patientUuid)
    .order('encounter_date', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (dateFilter) {
    query = query.gte('encounter_date', dateFilter);
  }

  const { data, error } = await query;

  if (error) {
    log('error', 'Error fetching visits:', error);
  }

  return data || [];
}

export async function fetchVisitsByEncounterIds(
  encounterIds: string[],
  options: { limit?: number } = {},
) {
  const { limit = 10 } = options;

  if (encounterIds.length === 0) return [];

  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT_FIELDS)
    .in('id', encounterIds)
    .order('encounter_date', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    log('error', 'Error fetching visits by encounter_ids:', error);
  }

  return data || [];
}

export async function fetchVisitById(encounterId: string) {
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT_FIELDS)
    .eq('id', encounterId)
    .single();

  if (error) {
    log('error', 'Error fetching visit by id:', error);
    return null;
  }

  return data;
}

export async function countVisitsByPatientUuid(
  patientUuid: string,
  dateFilter?: string | null,
) {
  let query = supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientUuid);

  if (dateFilter) {
    query = query.gte('encounter_date', dateFilter);
  }

  const { count, error } = await query;

  if (error) {
    log('error', 'Error counting visits:', error);
  }

  return count || 0;
}

// =============================================================================
// Consultation Queries
// =============================================================================

export async function fetchConsultationsByPatientId(
  patientId: string,
  options: { dateFilter?: string | null } = {},
) {
  const { dateFilter } = options;

  let query = supabase
    .from('consultations')
    .select(CONSULTATION_SELECT_FIELDS)
    .eq('patient_id', patientId)
    .order('consultation_date', { ascending: false });

  if (dateFilter) {
    query = query.gte('consultation_date', dateFilter);
  }

  const { data, error } = await query;

  if (error) {
    log('error', 'Error fetching consultations:', error);
  }

  return data || [];
}

export async function fetchConsultationByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('consultations')
    .select(CONSULTATION_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log('error', 'Error fetching consultation by encounter_id:', error);
  }

  return data;
}

export async function fetchConsultationByVisitId(visitId: string) {
  const { data, error } = await supabase
    .from('consultations')
    .select(CONSULTATION_SELECT_FIELDS)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log('error', 'Error fetching consultation by visit_id:', error);
  }

  return data;
}

export async function fetchConsultationsByEncounterIds(encounterIds: string[]) {
  if (encounterIds.length === 0) return [];

  const { data, error } = await supabase
    .from('consultations')
    .select('encounter_id, visit_id, diagnosis, diagnosis_text, complaints')
    .in('encounter_id', encounterIds);

  if (error) {
    log('error', 'Error fetching consultations by encounter_ids:', error);
  }

  return data || [];
}

// =============================================================================
// Vitals Queries
// =============================================================================

export async function fetchLatestVitals(patientUuid: string) {
  const { data, error } = await supabase
    .from('vitals')
    .select(VITALS_SELECT_FIELDS)
    .eq('patient_id', patientUuid)
    .order('date_recorded', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    log('error', 'Error fetching latest vitals:', error);
  }

  return data;
}

export async function fetchVitalsByEncounter(
  patientUuid: string,
  encounterId: string,
) {
  const { data, error } = await supabase
    .from('vitals')
    .select(VITALS_SELECT_FIELDS)
    .eq('patient_id', patientUuid)
    .eq('encounter_id', encounterId)
    .order('date_recorded', { ascending: false });

  if (error) {
    log('error', 'Error fetching vitals by encounter:', error);
  }

  return data || [];
}

export async function fetchVitalsByVisitId(
  patientUuid: string,
  encounterId: string,
) {
  const { data, error } = await supabase
    .from('vitals')
    .select(VITALS_SELECT_FIELDS)
    .eq('patient_id', patientUuid)
    .eq('encounter_id', encounterId)
    .order('date_recorded', { ascending: false });

  if (error) {
    log('error', 'Error fetching vitals by encounter_id:', error);
  }

  return data || [];
}

export async function fetchVitalsTrend(
  patientUuid: string,
  dateFilter: string | null,
) {
  let query = supabase
    .from('vitals')
    .select(
      `
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      pulse,
      respiratory_rate,
      oxygen_saturation,
      weight,
      height,
      date_recorded
    `,
    )
    .eq('patient_id', patientUuid)
    .order('date_recorded', { ascending: true })
    .limit(100);

  if (dateFilter) {
    query = query.gte('date_recorded', dateFilter);
  }

  const { data, error } = await query;

  if (error) {
    log('error', 'Error fetching vitals trend:', error);
  }

  return data || [];
}

// =============================================================================
// Prescription/Medication Queries
// =============================================================================

export async function fetchActiveMedicationsByPatientId(patientId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT_FIELDS)
    .eq('patient_id', patientId)
    .in('status', ACTIVE_MEDICATION_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    log('error', 'Error fetching active medications:', error);
  }

  return data || [];
}

export async function fetchMedicationsByEncounterIds(encounterIds: string[]) {
  if (encounterIds.length === 0) return [];

  const { data, error } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT_FIELDS)
    .in('encounter_id', encounterIds)
    .in('status', ACTIVE_MEDICATION_STATUSES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    log('error', 'Error fetching medications by encounter_ids:', error);
  }

  return data || [];
}

export async function fetchPrescriptionsByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching prescriptions by encounter_id:', error);
  }

  return data || [];
}

export async function fetchPrescriptionsByVisitId(visitId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(PRESCRIPTION_SELECT_FIELDS)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching prescriptions by visit_id:', error);
  }

  return data || [];
}

// =============================================================================
// Lab Request Queries
// =============================================================================

export async function fetchLabRequestsByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('lab_requests')
    .select(LAB_REQUEST_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching lab requests by encounter_id:', error);
  }

  return data || [];
}

export async function fetchLabRequestsByVisitId(visitId: string) {
  const { data, error } = await supabase
    .from('lab_requests')
    .select(LAB_REQUEST_SELECT_FIELDS)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching lab requests by visit_id:', error);
  }

  return data || [];
}

export async function countLabRequestsByPatientId(patientId: string) {
  const { count, error } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId);

  if (error) {
    log('error', 'Error counting lab requests:', error);
  }

  return count || 0;
}

// =============================================================================
// Radiology Request Queries
// =============================================================================

export async function fetchRadiologyRequestsByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('radiology_requests')
    .select(RADIOLOGY_REQUEST_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching radiology requests by encounter_id:', error);
  }

  return data || [];
}

export async function fetchRadiologyRequestsByVisitId(visitId: string) {
  const { data, error } = await supabase
    .from('radiology_requests')
    .select(RADIOLOGY_REQUEST_SELECT_FIELDS)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching radiology requests by visit_id:', error);
  }

  return data || [];
}

export async function countRadiologyRequestsByPatientId(patientId: string) {
  const { count, error } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId);

  if (error) {
    log('error', 'Error counting radiology requests:', error);
  }

  return count || 0;
}

// =============================================================================
// Procedure Queries
// =============================================================================

export async function fetchProceduresByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(PROCEDURE_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching procedures by encounter_id:', error);
  }

  return data || [];
}

export async function fetchProceduresByVisitId(visitId: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select(PROCEDURE_SELECT_FIELDS)
    .eq('visit_id', visitId)
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching procedures by visit_id:', error);
  }

  return data || [];
}

// =============================================================================
// Nursing Notes Queries
// =============================================================================

export async function fetchNursingNotesByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('nursing_notes')
    .select(NURSING_NOTES_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching nursing notes:', error);
  }

  return data || [];
}

// =============================================================================
// Daily Progress Notes Queries
// =============================================================================

export async function fetchProgressNotesByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('daily_progress_notes')
    .select(DAILY_PROGRESS_NOTES_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('note_date', { ascending: false });

  if (error) {
    log('error', 'Error fetching progress notes:', error);
  }

  return data || [];
}

// =============================================================================
// Ward Round Notes Queries
// =============================================================================

export async function fetchWardRoundNotesByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(WARD_ROUND_NOTES_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching ward round notes:', error);
  }

  return data || [];
}

// =============================================================================
// Treatment Plans Queries
// =============================================================================

export async function fetchTreatmentPlansByEncounterId(encounterId: string) {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select(TREATMENT_PLANS_SELECT_FIELDS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Error fetching treatment plans:', error);
  }

  return data || [];
}

// =============================================================================
// Catalogue Lookups
// =============================================================================

export async function fetchDrugCatalogueByIds(drugIds: string[]) {
  if (drugIds.length === 0) return [];

  const { data, error } = await supabase
    .from('drug_catalogue')
    .select('id, name')
    .in('id', drugIds);

  if (error) {
    log('error', 'Error fetching drug catalogue:', error);
  }

  return data || [];
}

export async function fetchLabTestCatalogueByIds(testIds: string[]) {
  if (testIds.length === 0) return [];

  const { data, error } = await supabase
    .from('lab_test_catalogue')
    .select('id, name, category, category_code, result_template_type')
    .in('id', testIds);

  if (error) {
    log('error', 'Error fetching lab test catalogue:', error);
  }

  return data || [];
}

export async function fetchImagingCatalogueByIds(imagingIds: string[]) {
  if (imagingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('imaging_catalogue')
    .select('id, name, code, modality')
    .in('id', imagingIds);

  if (error) {
    log('error', 'Error fetching imaging catalogue:', error);
  }

  return data || [];
}

export async function fetchStaffByIds(staffIds: string[]) {
  if (staffIds.length === 0) return [];

  const { data, error } = await supabase
    .from('staff')
    .select('id, first_name, last_name')
    .in('id', staffIds);

  if (error) {
    log('error', 'Error fetching staff:', error);
  }

  return data || [];
}

export async function fetchLabResultsByRequestIds(requestIds: string[]) {
  if (requestIds.length === 0) return [];

  const { data, error } = await supabase
    .from('lab_results')
    .select(
      `
      id, request_id, test_id, patient_id, result_value, unit, reference_range,
      is_abnormal, is_critical, comments, verified_by, verified_at,
      technician_id, created_at, updated_at, structured_result,
      result_template_type, workflow_status
    `,
    )
    .in('request_id', requestIds);

  if (error) {
    log('error', 'Error fetching lab results:', error);
  }

  return data || [];
}

export async function fetchScanResultsByRequestIds(requestIds: string[]) {
  if (requestIds.length === 0) return [];

  const primary = await supabase
    .from('scan_results')
    .select('*')
    .in('request_id', requestIds);

  if (!primary.error) {
    return ((primary.data || []) as Array<Record<string, any>>).map((row) => ({
      ...row,
      request_id: row.request_id || row.scan_request_id,
      notes: row.notes || row.recommendation || null,
    }));
  }

  const legacy = await supabase
    .from('scan_results')
    .select('*')
    .in('scan_request_id', requestIds);

  if (legacy.error) {
    log('error', 'Error fetching scan results:', {
      primaryError: primary.error,
      legacyError: legacy.error,
    });
    return [];
  }

  return ((legacy.data || []) as Array<Record<string, any>>).map((row) => ({
    ...row,
    request_id: row.request_id || row.scan_request_id,
    notes: row.notes || row.recommendation || null,
  }));
}

// =============================================================================
// Batch Counts (Optimized)
// =============================================================================

export async function fetchEncounterCountsBatch(
  encounterIds: string[],
  visitIds: string[],
) {
  if (encounterIds.length === 0) {
    return { labs: [], imaging: [], prescriptions: [] };
  }

  // Fetch all records in batch instead of individual counts
  const [labsResult, imagingResult, prescriptionsResult] = await Promise.all([
    supabase
      .from('lab_requests')
      .select('encounter_id, visit_id')
      .or(
        `encounter_id.in.(${encounterIds.join(',')}),visit_id.in.(${visitIds.join(',')})`,
      ),
    supabase
      .from('radiology_requests')
      .select('encounter_id, visit_id')
      .or(
        `encounter_id.in.(${encounterIds.join(',')}),visit_id.in.(${visitIds.join(',')})`,
      ),
    supabase
      .from('prescriptions')
      .select('encounter_id, visit_id')
      .or(
        `encounter_id.in.(${encounterIds.join(',')}),visit_id.in.(${visitIds.join(',')})`,
      ),
  ]);

  return {
    labs: labsResult.data || [],
    imaging: imagingResult.data || [],
    prescriptions: prescriptionsResult.data || [],
  };
}

// =============================================================================
// Prescription Count (for stats)
// =============================================================================

export async function countPrescriptionsByPatientId(patientId: string) {
  const { count, error } = await supabase
    .from('prescriptions')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId);

  if (error) {
    log('error', 'Error counting prescriptions:', error);
  }

  return count || 0;
}
