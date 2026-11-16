/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER DETAILS SERVICE
 * Full encounter detail loading with parallel queries
 * =============================================================================
 */

import type {
  EncounterDetail,
  VisitRow,
  ConsultationRow,
  VitalsRow,
  PrescriptionRow,
  LabRequestRow,
  RadiologyRequestRow,
  ProcedureRow,
  NursingNoteRow,
  DailyProgressNoteRow,
  TreatmentPlanRow,
  WardRoundNoteRow,
} from './types';
import { isValidUuid, log, VITALS_SELECT_FIELDS } from './constants';
import {
  uniqueValues,
  toLookupMap,
  groupBy,
  normalizeDoctorName,
} from './utils';
import {
  fetchVisitById,
  fetchConsultationByEncounterId,
  fetchConsultationByVisitId,
  fetchVitalsByEncounter,
  fetchVitalsByVisitId,
  fetchPrescriptionsByEncounterId,
  fetchPrescriptionsByVisitId,
  fetchLabRequestsByEncounterId,
  fetchLabRequestsByVisitId,
  fetchRadiologyRequestsByEncounterId,
  fetchRadiologyRequestsByVisitId,
  fetchProceduresByEncounterId,
  fetchProceduresByVisitId,
  fetchNursingNotesByEncounterId,
  fetchProgressNotesByEncounterId,
  fetchTreatmentPlansByEncounterId,
  fetchWardRoundNotesByEncounterId,
  fetchDrugCatalogueByIds,
  fetchLabTestCatalogueByIds,
  fetchImagingCatalogueByIds,
  fetchStaffByIds,
  fetchLabResultsByRequestIds,
  fetchScanResultsByRequestIds,
} from './queries';
import { fetchClinicalNotesByEncounter } from '../clinical-notes-template.api';
import {
  mapVitalsRowToSnapshot,
  mapVitalsRowsToSnapshots,
  mapConsultationRowToDetail,
  mapConsultationToClinicalNotes,
  mapPrescriptionToDetail,
  mapPrescriptionToMedicationDetail,
  mapLabRequestToDetail,
  mapLabRequestToRequestDetail,
  mapRadiologyRequestToDetail,
  mapProcedureToDetail,
  mapNursingNoteToDetail,
  mapProgressNoteToDetail,
  mapTreatmentPlanToDetail,
} from './mappers';
import { supabase } from '../../../../api/supabaseClient';
import {
  createTraceId,
  estimatePayloadBytes,
  logOperationDuration,
  logOperationSummary,
  toMetricKey,
} from '../../../../utils/observability';

// =============================================================================
// Get Encounter Details
// =============================================================================

/**
 * Get full encounter details with all related data
 * OPTIMIZED: Uses parallel queries with merged phases for faster loading
 */
export async function getEncounterDetails(
  encounterId: string,
): Promise<EncounterDetail | null> {
  const startTime = performance.now();
  const traceId = createTraceId('MedicalRecords', 'getEncounterDetails');
  const stepMetrics: Record<string, number> = {};
  let patientIdForLogs: string | undefined;

  const trackStep = (
    step: string,
    durationMs: number,
    payload: unknown,
    extra: Record<string, unknown> = {},
  ): void => {
    stepMetrics[toMetricKey(step)] = Math.round(durationMs);
    logOperationDuration({
      module: 'MedicalRecords',
      action: 'getEncounterDetails',
      step,
      duration_ms: durationMs,
      trace_id: traceId,
      encounter_id: encounterId,
      patient_id: patientIdForLogs,
      payload_bytes: estimatePayloadBytes(payload),
      ...extra,
    });
  };

  const runStep = async <T>(
    step: string,
    fn: () => Promise<T>,
    extra: Record<string, unknown> = {},
  ): Promise<T> => {
    const startedAt = performance.now();
    try {
      const result = await fn();
      trackStep(step, performance.now() - startedAt, result, extra);
      return result;
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      stepMetrics[toMetricKey(step)] = Math.round(durationMs);
      logOperationDuration({
        module: 'MedicalRecords',
        action: 'getEncounterDetails',
        step,
        duration_ms: durationMs,
        trace_id: traceId,
        encounter_id: encounterId,
        patient_id: patientIdForLogs,
        error: error instanceof Error ? error.message : String(error),
        ...extra,
      });
      throw error;
    }
  };

  try {
    const [
      visit,
      consultationResult,
      vitalsResult,
      medicationsResult,
      labRequestsResult,
      radiologyResult,
      proceduresResult,
      nursingNotesResult,
      progressNotesResult,
      treatmentPlansResult,
      wardRoundNotesResult,
      clinicalNoteRecords,
    ] = await Promise.all([
      runStep('visit_query', () => fetchVisitById(encounterId), {
        query_type: 'primary',
      }),
      runStep(
        'consultation_query',
        () => fetchConsultationByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'vitals_query',
        () =>
          supabase
            .from('vitals')
            .select(VITALS_SELECT_FIELDS)
            .eq('encounter_id', encounterId)
            .order('date_recorded', { ascending: false }),
        { query_type: 'primary' },
      ),
      runStep(
        'prescriptions_query',
        () => fetchPrescriptionsByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'lab_requests_query',
        () => fetchLabRequestsByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'radiology_requests_query',
        () => fetchRadiologyRequestsByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'procedures_query',
        () => fetchProceduresByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'nursing_notes_query',
        () => fetchNursingNotesByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'progress_notes_query',
        () => fetchProgressNotesByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'treatment_plans_query',
        () => fetchTreatmentPlansByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'ward_round_notes_query',
        () => fetchWardRoundNotesByEncounterId(encounterId),
        { query_type: 'primary' },
      ),
      runStep(
        'clinical_note_records_query',
        () => fetchClinicalNotesByEncounter(encounterId),
        { query_type: 'primary' },
      ),
    ]);

    if (!visit) {
      const totalDurationMs = performance.now() - startTime;
      log('error', 'Encounter not found:', encounterId);
      logOperationSummary({
        module: 'MedicalRecords',
        action: 'getEncounterDetails',
        total_duration_ms: totalDurationMs,
        trace_id: traceId,
        encounter_id: encounterId,
        status: 'not_found',
        ...stepMetrics,
      });
      return null;
    }

    patientIdForLogs = visit.patient_id || undefined;

    // Extract results
    let consultation = consultationResult as ConsultationRow | null;
    let allVitals = ((vitalsResult as { data: VitalsRow[] | null })?.data ||
      []) as VitalsRow[];
    let medications = (medicationsResult || []) as PrescriptionRow[];
    let labResults = (labRequestsResult || []) as LabRequestRow[];
    let imagingResults = (radiologyResult || []) as RadiologyRequestRow[];
    let procedureResults = (proceduresResult || []) as ProcedureRow[];
    const nursingNotes = (nursingNotesResult || []) as NursingNoteRow[];
    const dailyProgressNotes = (progressNotesResult ||
      []) as DailyProgressNoteRow[];
    const treatmentPlans = (treatmentPlansResult || []) as TreatmentPlanRow[];
    const wardRoundNotes = (wardRoundNotesResult ||
      []) as unknown as WardRoundNoteRow[];

    const combinedPromises: Promise<unknown>[] = [];
    const combinedKeys: string[] = [];

    const needsConsultationFallback = !consultation;
    const needsVitalsFallback = allVitals.length === 0;
    const needsMedsFallback = medications.length === 0;
    const needsLabsFallback = labResults.length === 0;
    const needsImagingFallback = imagingResults.length === 0;
    const needsProceduresFallback = procedureResults.length === 0;
    const fallbackVisitUuid = isValidUuid(visit.visit_id)
      ? visit.visit_id
      : visit.id;

    if (needsConsultationFallback) {
      combinedKeys.push('fallback_consultation');
      combinedPromises.push(
        runStep(
          'fallback_consultation_query',
          () => fetchConsultationByVisitId(fallbackVisitUuid),
          { query_type: 'fallback' },
        ),
      );
    }
    if (needsVitalsFallback) {
      combinedKeys.push('fallback_vitals');
      combinedPromises.push(
        runStep(
          'fallback_vitals_query',
          () => fetchVitalsByVisitId(visit.patient_id || '', visit.id),
          { query_type: 'fallback' },
        ),
      );
    }
    if (needsMedsFallback) {
      combinedKeys.push('fallback_medications');
      combinedPromises.push(
        runStep(
          'fallback_medications_query',
          () => fetchPrescriptionsByVisitId(fallbackVisitUuid),
          { query_type: 'fallback' },
        ),
      );
    }
    if (needsLabsFallback) {
      combinedKeys.push('fallback_labs');
      combinedPromises.push(
        runStep(
          'fallback_labs_query',
          () => fetchLabRequestsByVisitId(fallbackVisitUuid),
          { query_type: 'fallback' },
        ),
      );
    }
    if (needsImagingFallback) {
      combinedKeys.push('fallback_imaging');
      combinedPromises.push(
        runStep(
          'fallback_imaging_query',
          () => fetchRadiologyRequestsByVisitId(fallbackVisitUuid),
          { query_type: 'fallback' },
        ),
      );
    }
    if (needsProceduresFallback) {
      combinedKeys.push('fallback_procedures');
      combinedPromises.push(
        runStep(
          'fallback_procedures_query',
          () => fetchProceduresByVisitId(fallbackVisitUuid),
          { query_type: 'fallback' },
        ),
      );
    }

    combinedKeys.push('patient');
    combinedPromises.push(
      runStep(
        'patient_query',
        () =>
          Promise.resolve(
            supabase
              .from('patients')
              .select('patient_id, emr_number')
              .eq('id', visit.patient_id)
              .maybeSingle(),
          ),
        { query_type: 'lookup' },
      ),
    );

    const drugIds = uniqueValues(medications.map((m) => m.drug_id));
    if (drugIds.length > 0) {
      combinedKeys.push('drugs');
      combinedPromises.push(
        runStep(
          'drug_catalogue_query',
          () => fetchDrugCatalogueByIds(drugIds),
          { query_type: 'catalogue' },
        ),
      );
    }

    const testIds = uniqueValues(labResults.map((lr) => lr.test_id));
    if (testIds.length > 0) {
      combinedKeys.push('tests');
      combinedPromises.push(
        runStep(
          'lab_test_catalogue_query',
          () => fetchLabTestCatalogueByIds(testIds),
          { query_type: 'catalogue' },
        ),
      );
    }

    const labRequestIds = labResults.map((lr) => lr.request_id);
    if (labRequestIds.length > 0) {
      combinedKeys.push('labResultsItems');
      combinedPromises.push(
        runStep(
          'lab_result_items_query',
          () => fetchLabResultsByRequestIds(labRequestIds),
          { query_type: 'catalogue' },
        ),
      );
    }

    const imagingIds = uniqueValues(imagingResults.map((ir) => ir.imaging_id));
    if (imagingIds.length > 0) {
      combinedKeys.push('imaging');
      combinedPromises.push(
        runStep(
          'imaging_catalogue_query',
          () => fetchImagingCatalogueByIds(imagingIds),
          { query_type: 'catalogue' },
        ),
      );
    }

    const radiologyRequestIds = imagingResults.map((ir) => ir.request_id);
    if (radiologyRequestIds.length > 0) {
      combinedKeys.push('scanResults');
      combinedPromises.push(
        runStep(
          'scan_results_query',
          () => fetchScanResultsByRequestIds(radiologyRequestIds),
          { query_type: 'catalogue' },
        ),
      );
    }

    const labStaffIds = uniqueValues(
      labResults.flatMap((lr) => [
        lr.processed_by,
        lr.result_entered_by,
        lr.sample_collected_by,
      ]),
    );
    if (labStaffIds.length > 0) {
      combinedKeys.push('labStaff');
      combinedPromises.push(
        runStep('lab_staff_query', () => fetchStaffByIds(labStaffIds), {
          query_type: 'catalogue',
        }),
      );
    }

    const combinedBatchStartedAt = performance.now();
    const combinedResults = await Promise.all(combinedPromises);
    trackStep(
      'fallback_and_catalogue_batch',
      performance.now() - combinedBatchStartedAt,
      combinedResults,
      {
        query_count: combinedPromises.length,
      },
    );

    const resultMap = new Map<string, unknown>();
    combinedKeys.forEach((key, idx) => {
      resultMap.set(key, combinedResults[idx]);
    });

    if (resultMap.has('fallback_consultation')) {
      const result = resultMap.get('fallback_consultation');
      if (result) consultation = result as ConsultationRow;
    }
    if (resultMap.has('fallback_vitals')) {
      const result = resultMap.get('fallback_vitals') as VitalsRow[];
      if (Array.isArray(result) && result.length > 0) allVitals = result;
    }
    if (resultMap.has('fallback_medications')) {
      const result = resultMap.get('fallback_medications') as PrescriptionRow[];
      if (Array.isArray(result) && result.length > 0) medications = result;
    }
    if (resultMap.has('fallback_labs')) {
      const result = resultMap.get('fallback_labs') as LabRequestRow[];
      if (Array.isArray(result) && result.length > 0) labResults = result;
    }
    if (resultMap.has('fallback_imaging')) {
      const result = resultMap.get('fallback_imaging') as RadiologyRequestRow[];
      if (Array.isArray(result) && result.length > 0) imagingResults = result;
    }
    if (resultMap.has('fallback_procedures')) {
      const result = resultMap.get('fallback_procedures') as ProcedureRow[];
      if (Array.isArray(result) && result.length > 0) procedureResults = result;
    }

    const patient = (
      resultMap.get('patient') as {
        data: { patient_id: string; emr_number: string } | null;
      }
    )?.data;
    const patientEmrNumber = patient?.emr_number || patient?.patient_id || '';

    const postFallbackPromises: Promise<unknown>[] = [];
    const postFallbackKeys: string[] = [];

    if (
      resultMap.has('fallback_medications') &&
      medications.length > 0 &&
      !resultMap.has('drugs')
    ) {
      const newDrugIds = uniqueValues(medications.map((m) => m.drug_id));
      if (newDrugIds.length > 0) {
        postFallbackKeys.push('drugs');
        postFallbackPromises.push(
          runStep(
            'post_fallback_drug_catalogue_query',
            () => fetchDrugCatalogueByIds(newDrugIds),
            { query_type: 'catalogue' },
          ),
        );
      }
    }
    if (
      resultMap.has('fallback_labs') &&
      labResults.length > 0 &&
      !resultMap.has('tests')
    ) {
      const newTestIds = uniqueValues(labResults.map((lr) => lr.test_id));
      if (newTestIds.length > 0) {
        postFallbackKeys.push('tests');
        postFallbackPromises.push(
          runStep(
            'post_fallback_lab_test_catalogue_query',
            () => fetchLabTestCatalogueByIds(newTestIds),
            { query_type: 'catalogue' },
          ),
        );
      }
      const newLabRequestIds = labResults.map((lr) => lr.request_id);
      if (newLabRequestIds.length > 0) {
        postFallbackKeys.push('labResultsItems');
        postFallbackPromises.push(
          runStep(
            'post_fallback_lab_result_items_query',
            () => fetchLabResultsByRequestIds(newLabRequestIds),
            { query_type: 'catalogue' },
          ),
        );
      }
      const newLabStaffIds = uniqueValues(
        labResults.flatMap((lr) => [
          lr.processed_by,
          lr.result_entered_by,
          lr.sample_collected_by,
        ]),
      );
      if (newLabStaffIds.length > 0) {
        postFallbackKeys.push('labStaff');
        postFallbackPromises.push(
          runStep(
            'post_fallback_lab_staff_query',
            () => fetchStaffByIds(newLabStaffIds),
            { query_type: 'catalogue' },
          ),
        );
      }
    }
    if (
      resultMap.has('fallback_imaging') &&
      imagingResults.length > 0 &&
      !resultMap.has('imaging')
    ) {
      const newImagingIds = uniqueValues(
        imagingResults.map((ir) => ir.imaging_id),
      );
      if (newImagingIds.length > 0) {
        postFallbackKeys.push('imaging');
        postFallbackPromises.push(
          runStep(
            'post_fallback_imaging_catalogue_query',
            () => fetchImagingCatalogueByIds(newImagingIds),
            { query_type: 'catalogue' },
          ),
        );
      }
    }

    if (postFallbackPromises.length > 0) {
      const postFallbackBatchStartedAt = performance.now();
      const postFallbackResults = await Promise.all(postFallbackPromises);
      trackStep(
        'post_fallback_catalogue_batch',
        performance.now() - postFallbackBatchStartedAt,
        postFallbackResults,
        {
          query_count: postFallbackPromises.length,
        },
      );
      postFallbackKeys.forEach((key, idx) => {
        resultMap.set(key, postFallbackResults[idx]);
      });
    }

    const mappingStartedAt = performance.now();
    const catalogueData: Record<string, unknown[]> = {
      drugs: (resultMap.get('drugs') as unknown[]) || [],
      tests: (resultMap.get('tests') as unknown[]) || [],
      labResultsItems: (resultMap.get('labResultsItems') as unknown[]) || [],
      imaging: (resultMap.get('imaging') as unknown[]) || [],
      labStaff: (resultMap.get('labStaff') as unknown[]) || [],
      scanResults: (resultMap.get('scanResults') as unknown[]) || [],
    };

    if (catalogueData.drugs && Array.isArray(catalogueData.drugs)) {
      const drugMap = toLookupMap(
        catalogueData.drugs as Array<{ id: string; name: string }>,
        (d) => d.id,
      );
      medications = medications.map((m) => ({
        ...m,
        drug: m.drug_id ? drugMap.get(m.drug_id) : undefined,
      }));
    }

    if (catalogueData.tests && Array.isArray(catalogueData.tests)) {
      const testMap = toLookupMap(
        catalogueData.tests as Array<{
          id: string;
          name: string;
          category?: string;
          category_code?: string;
          result_template_type?: string;
        }>,
        (t) => t.id,
      );
      labResults = labResults.map((lr) => ({
        ...lr,
        test: lr.test_id ? testMap.get(lr.test_id) : undefined,
      }));
    }

    if (
      catalogueData.labResultsItems &&
      Array.isArray(catalogueData.labResultsItems)
    ) {
      const resultsMap = groupBy(
        catalogueData.labResultsItems as Array<{
          request_id?: string;
          lab_request_id?: string;
        }>,
        (r) => r.request_id || r.lab_request_id || '',
      );
      labResults = labResults.map((lr) => ({
        ...lr,
        lab_results: (resultsMap.get(lr.request_id) ||
          []) as LabRequestRow['lab_results'],
      }));
    }

    let staffNameMap = new Map<string, string>();
    if (catalogueData.labStaff && Array.isArray(catalogueData.labStaff)) {
      staffNameMap = new Map(
        (
          catalogueData.labStaff as Array<{
            id: string;
            first_name: string;
            last_name: string;
          }>
        ).map((s) => [s.id, `${s.first_name} ${s.last_name}`]),
      );
    }

    if (catalogueData.imaging && Array.isArray(catalogueData.imaging)) {
      const imagingMap = toLookupMap(
        catalogueData.imaging as Array<{
          id: string;
          name: string;
          modality?: string;
        }>,
        (i) => i.id,
      );
      imagingResults = imagingResults.map((ir) => ({
        ...ir,
        imaging: ir.imaging_id ? imagingMap.get(ir.imaging_id) : undefined,
      }));
    }

    if (catalogueData.scanResults && Array.isArray(catalogueData.scanResults)) {
      const scanResultsMap = new Map(
        (
          catalogueData.scanResults as Array<{
            request_id: string;
            findings?: string;
            impression?: string;
            technique?: string;
            comparison?: string;
            radiologist?: { first_name: string; last_name: string };
            report_date?: string;
            image_urls?: string[];
          }>
        ).map((sr) => [sr.request_id, sr]),
      );
      imagingResults = imagingResults.map((ir) => {
        const scanResult = scanResultsMap.get(ir.request_id);
        if (!scanResult) return ir;
        return {
          ...ir,
          findings: scanResult.findings || ir.findings,
          impression: scanResult.impression || ir.impression,
          scan_result: {
            findings: scanResult.findings,
            impression: scanResult.impression,
            technique: scanResult.technique,
            comparison: scanResult.comparison,
            report_date: scanResult.report_date,
            image_urls: scanResult.image_urls,
            radiologist: scanResult.radiologist,
          },
        };
      });
    }

    const latestVitals = allVitals.length > 0 ? allVitals[0] : null;
    const vitalsSnapshot = mapVitalsRowToSnapshot(latestVitals);
    const allVitalsSnapshots = mapVitalsRowsToSnapshots(allVitals);
    const doctorName = normalizeDoctorName(visit.attending_doctor);

    const visitClinic = Array.isArray(visit.clinic)
      ? visit.clinic[0]
      : visit.clinic;
    const response: EncounterDetail = {
      encounter_id: visit.id,
      encounter_number: visit.encounter_number || visit.visit_id,
      visit_id: visit.visit_id,
      patient_id: visit.patient_id || '',
      emr_number: patientEmrNumber,
      encounter_date: visit.encounter_date || visit.start_time || '',
      visit_type: visit.visit_type || 'General',
      chief_complaint: visit.chief_complaint || '',
      status: visit.status || '',
      doctor: doctorName ? { name: doctorName } : null,
      clinic_id: visit.clinic_id || undefined,
      clinic_name: visitClinic?.clinic_name || undefined,
      specialty_code: visitClinic?.clinic_code || undefined,
      consultation: consultation
        ? mapConsultationRowToDetail(consultation, doctorName)
        : undefined,
      clinical_notes: mapConsultationToClinicalNotes(
        consultation,
        visit.chief_complaint,
      ),
      vitals: vitalsSnapshot,
      all_vitals: allVitalsSnapshots,
      prescriptions: medications.map(mapPrescriptionToDetail),
      medications: medications.map(mapPrescriptionToMedicationDetail),
      lab_requests: labResults.map(mapLabRequestToRequestDetail),
      lab_results: labResults.map((lr) =>
        mapLabRequestToDetail(lr, staffNameMap),
      ),
      radiology_requests: imagingResults.map((ir) => ({
        id: ir.request_id,
        study_type: ir.imaging?.name || ir.imaging_type || '',
        body_part: ir.body_part || '',
        status: ir.status || '',
        clinical_indication: ir.clinical_indication,
        requested_at: ir.created_at || '',
        report: ir.findings
          ? {
              findings: ir.findings || '',
              impression: ir.impression,
              reported_at: ir.report_uploaded_at,
            }
          : undefined,
      })),
      imaging_results: imagingResults.map(mapRadiologyRequestToDetail),
      procedure_results: procedureResults.map(mapProcedureToDetail),
      nursing_notes: nursingNotes.map(mapNursingNoteToDetail),
      daily_progress_notes: dailyProgressNotes.map(mapProgressNoteToDetail),
      ward_round_notes: wardRoundNotes,
      treatment_plans: treatmentPlans.map(mapTreatmentPlanToDetail),
      clinical_note_records: clinicalNoteRecords || [],
    };

    trackStep(
      'mapping_and_assembly',
      performance.now() - mappingStartedAt,
      response,
      {
        medication_count: medications.length,
        lab_count: labResults.length,
        imaging_count: imagingResults.length,
        procedure_count: procedureResults.length,
      },
    );

    const totalDurationMs = performance.now() - startTime;
    logOperationSummary({
      module: 'MedicalRecords',
      action: 'getEncounterDetails',
      total_duration_ms: totalDurationMs,
      trace_id: traceId,
      encounter_id: encounterId,
      patient_id: patientIdForLogs,
      payload_bytes: estimatePayloadBytes(response),
      ...stepMetrics,
    });

    return response;
  } catch (error) {
    const totalDurationMs = performance.now() - startTime;
    logOperationSummary({
      module: 'MedicalRecords',
      action: 'getEncounterDetails',
      total_duration_ms: totalDurationMs,
      trace_id: traceId,
      encounter_id: encounterId,
      patient_id: patientIdForLogs,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      ...stepMetrics,
    });
    throw error;
  }
}
