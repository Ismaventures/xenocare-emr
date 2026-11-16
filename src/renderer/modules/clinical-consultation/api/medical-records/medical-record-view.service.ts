/**
 * =============================================================================
 * XENOCARE EMR - MEDICAL RECORD VIEW SERVICE
 * Complete patient medical records view
 * =============================================================================
 */

import type {
  PatientMedicalRecordView,
  MedicalRecordsFilters,
  VitalsTrend,
  VisitRow,
  ConsultationRow,
  PrescriptionRow,
  PatientRow,
} from './types';
import { log } from './constants';
import { getTimeframeDate, toLookupMap, uniqueValues } from './utils';
import {
  resolvePatientUuid,
  discoverEncounterIdsFromRelatedRecords,
  getPatientByUuid,
  getPrincipalPatientName,
} from './patient-id-resolver';
import {
  fetchVisitsByPatientUuid,
  fetchVisitsByEncounterIds,
  fetchConsultationsByPatientId,
  fetchLatestVitals,
  fetchActiveMedicationsByPatientId,
  fetchMedicationsByEncounterIds,
  fetchDrugCatalogueByIds,
  fetchEncounterCountsBatch,
  countLabRequestsByPatientId,
  countRadiologyRequestsByPatientId,
  countPrescriptionsByPatientId,
  fetchVitalsTrend,
} from './queries';
import {
  mapPatientRowToHeader,
  mapVitalsRowToSnapshot,
  mapPrescriptionToMedicationSummary,
  mapVisitToEncounterSummary,
  calculateEncounterCounts,
} from './mappers';
import {
  extractProblemsFromDiagnoses,
  mapConsultationsForProblemExtraction,
} from './problems-extractor';

// =============================================================================
// Get Patient Medical Record View
// =============================================================================

/**
 * Get complete patient medical records view
 */
export async function getPatientMedicalRecordView(
  patientId: string,
  filters?: MedicalRecordsFilters,
): Promise<PatientMedicalRecordView | null> {
  log('log', 'getPatientMedicalRecordView called with:', patientId);

  // Resolve patient identifiers
  const resolved = await resolvePatientUuid(patientId);
  if (!resolved) {
    log('error', 'Could not resolve patient identifier:', patientId);
    return null;
  }

  const {
    uuid: patientUuid,
    externalId: patientExternalId,
    emrNumber: patientEmrNumber,
  } = resolved;
  log(
    'log',
    'Resolved patient - UUID:',
    patientUuid,
    'ExternalId:',
    patientExternalId,
    'EMR:',
    patientEmrNumber,
  );

  // Get patient details
  const patientData = await getPatientByUuid(patientUuid);
  if (!patientData) {
    log('error', 'Patient not found:', patientUuid);
    return null;
  }
  const patient = patientData as unknown as PatientRow;

  // Calculate date filter
  const dateFilter = filters?.timeframe
    ? getTimeframeDate(filters.timeframe)
    : null;

  // Fetch consultations for problems - try external ID first, then UUID
  let consultations = await fetchConsultationsByPatientId(patientExternalId, {
    dateFilter,
  });
  log(
    'log',
    'Found consultations by patient_id (external):',
    consultations.length,
  );

  if (consultations.length === 0) {
    log('log', 'No consultations found by external ID, trying UUID');
    consultations = await fetchConsultationsByPatientId(patientUuid, {
      dateFilter,
    });
    log('log', 'Found consultations by UUID:', consultations.length);
  }

  // Fetch encounters - primary strategy: by patient UUID
  let encounters = await fetchVisitsByPatientUuid(patientUuid, {
    dateFilter,
    limit: 10,
  });
  log('log', 'Found encounters:', encounters.length);

  // FALLBACK: If no encounters, try via related records
  if (encounters.length === 0) {
    log('log', 'No direct encounters, trying fallback via related records');
    const encounterIds =
      await discoverEncounterIdsFromRelatedRecords(patientExternalId);

    if (encounterIds.length > 0) {
      log('log', 'Found encounter_ids via fallback:', encounterIds.length);
      encounters = await fetchVisitsByEncounterIds(encounterIds, { limit: 10 });
    }
  }

  // Fetch current medications
  let medications = await fetchActiveMedicationsByPatientId(patientExternalId);

  // Fallback: try by encounter_ids if no medications by patient_id
  if (medications.length === 0 && encounters.length > 0) {
    const encounterIds = encounters.map((e) => e.id);
    log(
      'log',
      'No medications by patient_id, trying via encounter_ids:',
      encounterIds.length,
    );
    medications = await fetchMedicationsByEncounterIds(encounterIds);
  }

  // Enrich medications with drug names
  if (medications.length > 0) {
    const drugIds = uniqueValues(medications.map((m) => m.drug_id));
    if (drugIds.length > 0) {
      const drugs = await fetchDrugCatalogueByIds(drugIds);
      const drugMap = toLookupMap(drugs, (d) => d.id);
      medications = medications.map((m) => ({
        ...m,
        drug: m.drug_id ? drugMap.get(m.drug_id) : undefined,
      }));
    }
  }

  // Fetch latest vitals
  const latestVitals = await fetchLatestVitals(patientUuid);

  // Fetch stats counts
  const [labCount, imagingCount, prescriptionCount] = await Promise.all([
    countLabRequestsByPatientId(patientExternalId),
    countRadiologyRequestsByPatientId(patientExternalId),
    countPrescriptionsByPatientId(patientExternalId),
  ]);

  log(
    'log',
    'Stats counts - Lab:',
    labCount,
    'Imaging:',
    imagingCount,
    'Rx:',
    prescriptionCount,
  );

  // Extract problems from diagnoses
  const consultationDiagnoses = mapConsultationsForProblemExtraction(
    consultations.map((c) => ({
      consultation_id: c.consultation_id,
      consultation_date: c.consultation_date,
      diagnosis: c.diagnosis,
      diagnosis_text: c.diagnosis_text,
      differential_diagnosis: c.differential_diagnosis,
    })),
  );
  const problems = extractProblemsFromDiagnoses(consultationDiagnoses);
  log('log', 'Extracted problems:', problems.length);

  // Fetch encounter counts in batch
  const encounterIds = encounters.map((e) => e.id);
  const visitIds = encounters.map((e) => e.visit_id);
  const batchCounts = await fetchEncounterCountsBatch(encounterIds, visitIds);
  const countsMap = calculateEncounterCounts(
    encounters as VisitRow[],
    batchCounts,
  );

  // Map encounters to summaries
  const consultationMap = toLookupMap(consultations, (c) => c.visit_id || '');
  const encounterSummaries = encounters.map((enc) => {
    const consultation = consultationMap.get(enc.visit_id);
    const counts = countsMap.get(enc.id);

    return mapVisitToEncounterSummary(enc as VisitRow, {
      patientUuid,
      emrNumber: patientEmrNumber,
      consultation: consultation as ConsultationRow | undefined,
      counts,
    });
  });

  // Get principal name for dependents
  let principalName: string | undefined;
  if (patient.patient_type === 'Dependent' && patient.principal_id) {
    principalName = await getPrincipalPatientName(patient.principal_id);
  }

  // Build header data
  const headerData = mapPatientRowToHeader(patient, principalName);

  // Build medication summaries
  const medicationSummaries = (medications as PrescriptionRow[]).map(
    mapPrescriptionToMedicationSummary,
  );

  // Build vitals snapshot
  const latestVitalsSnapshot = mapVitalsRowToSnapshot(latestVitals);

  return {
    patient: headerData,
    header: {
      ...headerData,
      total_encounters: encounters.length,
      last_visit: encounterSummaries[0]?.encounter_date,
    },
    problems,
    recent_encounters: encounterSummaries,
    current_medications: medicationSummaries,
    latest_vitals: latestVitalsSnapshot,
    stats: {
      total_encounters: encounters.length,
      total_problems: problems.length,
      active_problems: problems.filter(
        (p) => p.status === 'Active' || p.status === 'Chronic',
      ).length,
      total_lab_tests: labCount,
      total_imaging: imagingCount,
      total_prescriptions: prescriptionCount,
      last_visit_date: encounterSummaries[0]?.encounter_date,
      last_visit_type: encounterSummaries[0]?.visit_type,
    },
  };
}

// =============================================================================
// Get Patient Vitals Trend
// =============================================================================

/**
 * Get patient vitals trend for charts
 */
export async function getPatientVitalsTrend(
  patientId: string,
  timeframe: '3m' | '6m' | '1y' | 'all' = '6m',
): Promise<VitalsTrend[]> {
  const dateFilter = getTimeframeDate(timeframe);

  // Resolve patient identifiers
  const resolved = await resolvePatientUuid(patientId);
  if (!resolved) {
    log('error', 'Could not resolve patient for vitals trend:', patientId);
    return [];
  }

  const patientUuid = resolved.uuid;
  const data = await fetchVitalsTrend(patientUuid, dateFilter);

  return data.map((record) => ({
    date: record.date_recorded,
    blood_pressure_systolic: record.blood_pressure_systolic,
    blood_pressure_diastolic: record.blood_pressure_diastolic,
    pulse_rate: record.pulse,
    temperature: record.temperature,
    respiratory_rate: record.respiratory_rate,
    oxygen_saturation: record.oxygen_saturation,
    weight: record.weight,
    height: record.height,
  }));
}
