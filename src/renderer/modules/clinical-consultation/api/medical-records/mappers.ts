/**
 * =============================================================================
 * XENOCARE EMR - DATA MAPPERS
 * Transform raw database rows to DTOs
 * =============================================================================
 */

import type {
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
  PatientRow,
  StaffRow,
  VitalSnapshot,
  EncounterSummary,
  PatientHeaderData,
  MedicationSummary,
  ConsultationDetail,
  ClinicalNotes,
  PrescriptionDetail,
  MedicationDetail,
  LabRequestDetail,
  LabResultDetail,
  ImagingResultDetail,
  ProcedureDetail,
  NursingNoteDetail,
  DailyProgressNoteDetail,
  TreatmentPlanDetail,
  EncounterCounts,
} from './types';

import {
  normalizeDoctorName,
  normalizeStaffName,
  parseDiagnosisToArray,
  diagnosisToString,
  safeJsonParse,
  calculateAge,
  parseAllergies,
  groupBy,
} from './utils';

// =============================================================================
// Vitals Mappers
// =============================================================================

export function mapVitalsRowToSnapshot(
  vitals: VitalsRow | null,
): VitalSnapshot | undefined {
  if (!vitals) return undefined;

  const nurseName = normalizeStaffName(vitals.nurse) ?? undefined;

  return {
    blood_pressure:
      vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic
        ? {
            systolic: vitals.blood_pressure_systolic,
            diastolic: vitals.blood_pressure_diastolic,
          }
        : undefined,
    pulse_rate: vitals.pulse ?? undefined,
    heart_rate: vitals.pulse ?? undefined, // Alias for pulse_rate
    temperature: vitals.temperature ?? undefined,
    respiratory_rate: vitals.respiratory_rate ?? undefined,
    oxygen_saturation: vitals.oxygen_saturation ?? undefined,
    weight: vitals.weight ?? undefined,
    height: vitals.height ?? undefined,
    bmi: vitals.bmi ?? undefined,
    blood_glucose: vitals.blood_glucose ?? undefined,
    pain_level: vitals.pain_level ?? undefined,
    notes: vitals.notes ?? undefined,
    is_critical: vitals.is_critical ?? false,
    nurse_name: nurseName,
    recorded_by_name: nurseName, // Alias for nurse_name
    recorded_at: vitals.date_recorded,
  };
}

export function mapVitalsRowsToSnapshots(vitals: VitalsRow[]): VitalSnapshot[] {
  return vitals.map((v) => mapVitalsRowToSnapshot(v)!).filter(Boolean);
}

// =============================================================================
// Patient Header Mapper
// =============================================================================

export function mapPatientRowToHeader(
  patient: PatientRow,
  principalName?: string,
): PatientHeaderData {
  return {
    patient_id: patient.patient_id,
    emr_number: patient.emr_number || patient.patient_id,
    first_name: patient.first_name,
    middle_name: patient.middle_name,
    surname: patient.surname,
    gender: patient.gender || '',
    date_of_birth: patient.date_of_birth || '',
    age: patient.date_of_birth ? calculateAge(patient.date_of_birth) : 0,
    contact_phone: patient.contact_phone,
    email: patient.email,
    blood_group: patient.blood_group,
    genotype: patient.genotype,
    patient_category: patient.patient_category,
    insurance_type: patient.insurance_type,
    nhis_number: patient.nhis_number,
    nhis_provider_name: patient.nhis_provider_name,
    photo_url: patient.photo_url,
    allergies: parseAllergies(patient.known_allergies),
    critical_alerts: [],
    patient_type: patient.patient_type,
    service_number: patient.service_number,
    rank: patient.rank,
    title: patient.title,
    unit: patient.unit,
    military_branch: patient.military_branch,
    occupation: patient.occupation,
    employer: patient.employer,
    national_id: patient.national_id,
    residential_address: patient.residential_address,
    principal_name: principalName,
    relationship_to_principal: patient.relationship_to_principal,
    registration_date: patient.registration_date,
    status: patient.status,
  };
}

// =============================================================================
// Medication Mappers
// =============================================================================

export function mapPrescriptionToMedicationSummary(
  prescription: PrescriptionRow,
): MedicationSummary {
  return {
    prescription_id: prescription.prescription_id,
    drug_name: prescription.drug?.name || 'Unknown Drug',
    dosage: prescription.dosage || '',
    frequency: prescription.frequency || '',
    status: prescription.status || '',
    prescribed_date: prescription.created_at || '',
    prescribed_by: undefined,
  };
}

export function mapPrescriptionToDetail(
  prescription: PrescriptionRow,
): PrescriptionDetail {
  const doctorRaw = prescription.doctor;
  const doctorObj = Array.isArray(doctorRaw) ? doctorRaw[0] : doctorRaw;
  const doctorName = doctorObj
    ? `${doctorObj.first_name} ${doctorObj.last_name}`.trim()
    : undefined;
  return {
    id: prescription.prescription_id,
    prescription_id: prescription.prescription_id,
    drug_name:
      prescription.drug?.name || prescription.drug_name || 'Unknown Drug',
    dosage: prescription.dosage || '',
    frequency: prescription.frequency || '',
    duration: prescription.duration || '',
    quantity: prescription.quantity_prescribed || 0,
    instructions: prescription.instructions,
    route: prescription.route,
    prescribed_by: prescription.doctor_id,
    prescribed_by_name: doctorName,
    created_at: prescription.created_at,
    is_external: prescription.is_external ?? false,
    dispensed:
      prescription.status === 'Dispensed' ||
      prescription.status === 'Completed',
  };
}

export function mapPrescriptionToMedicationDetail(
  prescription: PrescriptionRow,
): MedicationDetail {
  return {
    prescription_id: prescription.prescription_id,
    drug_name: prescription.drug?.name || 'Unknown Drug',
    dosage: prescription.dosage || '',
    frequency: prescription.frequency || '',
    duration: prescription.duration || '',
    quantity: prescription.quantity_prescribed || 0,
    instructions: prescription.instructions,
    status: prescription.status || '',
    is_external: prescription.is_external ?? false,
  };
}

// =============================================================================
// Consultation Mapper
// =============================================================================

export function mapConsultationRowToDetail(
  consultation: ConsultationRow,
  doctorName?: string | null,
): ConsultationDetail {
  return {
    chief_complaint: consultation.complaints,
    history_of_present_illness: consultation.history_of_present_illness,
    examination_findings: consultation.examination_findings,
    diagnosis: consultation.diagnosis,
    differential_diagnosis: consultation.differential_diagnosis,
    treatment_plan: consultation.treatment_plan,
    past_medical_history: consultation.past_medical_history,
    family_history: consultation.family_history,
    social_history: consultation.social_history,
    review_of_systems: consultation.review_of_systems,
    physical_examination: consultation.physical_examination,
    follow_up_date: consultation.follow_up_date,
    follow_up_notes: consultation.notes,
    recommendations: consultation.recommendations,
    subjective: consultation.subjective,
    objective: consultation.objective,
    assessment: consultation.assessment,
    plan: consultation.plan,
    clinical_notes: consultation.clinical_notes,
    consultation_date: consultation.consultation_date,
    created_at: consultation.created_at,
    updated_at: consultation.updated_at,
    doctor_name: doctorName ?? undefined,
    icd10_codes: consultation.icd10_codes,
    specialty_data: consultation.specialty_data,
  };
}

export function mapConsultationToClinicalNotes(
  consultation: ConsultationRow | null,
  chiefComplaint?: string,
): ClinicalNotes {
  const diagnosisText = consultation
    ? diagnosisToString(consultation.diagnosis, consultation.diagnosis_text)
    : '';

  return {
    subjective: consultation?.history_of_present_illness,
    objective: consultation?.examination_findings,
    assessment: diagnosisText,
    plan: consultation?.treatment_plan,
    complaints: consultation?.complaints || chiefComplaint || '',
    diagnosis: diagnosisText,
    treatment_plan: consultation?.treatment_plan,
    follow_up_notes: consultation?.notes,
    follow_up_date: consultation?.follow_up_date,
  };
}

// =============================================================================
// Lab Result Mappers
// =============================================================================

export function mapLabRequestToDetail(
  lab: LabRequestRow,
  staffMap?: Map<string, string>,
): LabResultDetail {
  const labResult =
    Array.isArray(lab.lab_results) && lab.lab_results.length > 0
      ? lab.lab_results[0]
      : null;

  let resultString = '';
  if (labResult) {
    resultString =
      `${labResult.result_value || ''} ${labResult.unit || ''}`.trim();
  } else if (lab.result) {
    resultString =
      typeof lab.result === 'object'
        ? JSON.stringify(lab.result)
        : String(lab.result);
  } else if (lab.result_value) {
    resultString = `${lab.result_value} ${lab.result_unit || ''}`.trim();
  }

  // Template type from result first, fall back to catalogue
  const templateType =
    labResult?.result_template_type ||
    lab.test?.result_template_type ||
    undefined;
  const categoryCode = lab.test?.category_code || undefined;

  return {
    request_id: lab.request_id,
    test_name: lab.test?.name || 'Unknown Test',
    category: lab.test?.category || '',
    category_code: categoryCode,
    status: lab.status || '',
    priority: lab.priority,
    result: resultString || lab.result_notes || undefined,
    result_value: lab.result_value,
    result_unit: lab.result_unit,
    reference_range: lab.reference_range,
    interpretation: lab.interpretation,
    methodology: lab.methodology,
    is_critical: lab.is_critical,
    is_abnormal: labResult?.is_abnormal || false,
    requested_at: lab.created_at,
    requested_date: lab.created_at || '',
    result_date: lab.result_date,
    processed_by_name: lab.processed_by && staffMap?.get(lab.processed_by),
    result_entered_by_name:
      lab.result_entered_by && staffMap?.get(lab.result_entered_by),
    sample_collected_by_name:
      lab.sample_collected_by && staffMap?.get(lab.sample_collected_by),
    clinical_notes: lab.clinical_notes,
    result_notes: lab.result_notes,
    result_file_url: lab.result_file_url,
    lab_results_items: lab.lab_results?.map((r) => ({
      result_value: r.result_value || '',
      unit: r.unit || '',
      reference_range: r.reference_range || '',
      is_abnormal: r.is_abnormal || false,
      is_critical: r.is_critical || false,
      comments: r.comments,
      structured_result: r.structured_result,
      result_template_type: r.result_template_type,
    })),
    structured_result: labResult?.structured_result,
    result_template_type: templateType,
  };
}

export function mapLabRequestToRequestDetail(
  lab: LabRequestRow,
): LabRequestDetail {
  const labResult =
    Array.isArray(lab.lab_results) && lab.lab_results.length > 0
      ? lab.lab_results[0]
      : null;

  let parsedResult = lab.result;
  if (typeof lab.result === 'string') {
    parsedResult = safeJsonParse(lab.result, lab.result);
  }

  const templateType =
    labResult?.result_template_type ||
    lab.test?.result_template_type ||
    undefined;
  const categoryCode = lab.test?.category_code || undefined;

  return {
    id: lab.request_id,
    test_name: lab.test?.name || 'Unknown Test',
    category: lab.test?.category,
    category_code: categoryCode,
    status: lab.status || '',
    requested_at: lab.created_at || '',
    results: labResult
      ? [
          {
            parameter: lab.test?.name || 'Result',
            value: labResult.result_value || '',
            unit: labResult.unit || '',
            ref_low: null,
            ref_high: null,
            reference_range: labResult.reference_range,
            is_abnormal: labResult.is_abnormal,
            is_critical: labResult.is_critical,
          },
        ]
      : parsedResult
        ? Array.isArray(parsedResult)
          ? parsedResult
          : [parsedResult]
        : undefined,
    structured_result: labResult?.structured_result,
    result_template_type: templateType,
  };
}

// =============================================================================
// Imaging Result Mapper
// =============================================================================

export function mapRadiologyRequestToDetail(
  imaging: RadiologyRequestRow,
): ImagingResultDetail {
  const radiologistName = imaging.scan_result?.radiologist
    ? `Dr. ${imaging.scan_result.radiologist.first_name} ${imaging.scan_result.radiologist.last_name}`
    : undefined;

  return {
    request_id: imaging.request_id,
    exam_name:
      imaging.imaging?.name ||
      `${imaging.imaging_type || ''} ${imaging.body_part || ''}`.trim() ||
      'Unknown Exam',
    study_type: imaging.imaging?.name || imaging.imaging_type,
    body_part: imaging.body_part,
    modality: imaging.imaging?.modality || imaging.imaging_type || '',
    status: imaging.status || '',
    findings: imaging.scan_result?.findings || imaging.findings,
    impression: imaging.scan_result?.impression || imaging.impression,
    result_file_url: imaging.result_file_url,
    requested_date: imaging.created_at || '',
    report_date: imaging.scan_result?.report_date || imaging.report_uploaded_at,
    technique: imaging.scan_result?.technique,
    comparison: imaging.scan_result?.comparison,
    image_urls: imaging.scan_result?.image_urls,
    radiologist_name: radiologistName,
  };
}

// =============================================================================
// Procedure Mapper
// =============================================================================

export function mapProcedureToDetail(procedure: ProcedureRow): ProcedureDetail {
  return {
    id: procedure.id,
    procedure_number: procedure.procedure_number,
    procedure_name: procedure.procedure_name || 'Procedure',
    procedure_code: procedure.procedure_code,
    status: procedure.status || 'Pending',
    priority: procedure.priority,
    requested_date: procedure.scheduled_date || procedure.created_at || '',
    started_at: procedure.actual_start_time,
    completed_at: procedure.actual_end_time,
    indication: procedure.indication,
    pre_procedure_diagnosis: procedure.pre_procedure_diagnosis,
    post_procedure_diagnosis: procedure.post_procedure_diagnosis,
    findings: procedure.findings,
    procedure_notes: procedure.procedure_notes,
    technique_description: procedure.technique_description,
    complications: procedure.complications,
    post_op_instructions: procedure.post_op_instructions,
    surgeon_name: normalizeStaffName(procedure.primary_surgeon) || undefined,
  };
}

// =============================================================================
// Nursing Notes Mapper
// =============================================================================

export function mapNursingNoteToDetail(
  note: NursingNoteRow,
): NursingNoteDetail {
  return {
    id: note.id,
    note_type: note.note_type || '',
    title: note.title,
    content: note.content,
    patient_condition: note.patient_condition,
    pain_level: note.pain_level,
    interventions_performed: note.interventions_performed,
    patient_response: note.patient_response,
    follow_up_required: note.follow_up_required || false,
    follow_up_notes: note.follow_up_notes,
    shift: note.shift,
    is_critical: note.is_critical || false,
    requires_doctor_review: note.requires_doctor_review || false,
    doctor_reviewed_by: note.doctor_reviewed_by,
    doctor_reviewed_at: note.doctor_reviewed_at,
    recorded_by_name: normalizeStaffName(note.recorded_by) || 'Unknown',
    created_at: note.created_at,
  };
}

// =============================================================================
// Daily Progress Notes Mapper
// =============================================================================

export function mapProgressNoteToDetail(
  note: DailyProgressNoteRow,
): DailyProgressNoteDetail {
  return {
    progress_id: note.progress_id,
    note_date: note.note_date,
    subjective: note.subjective,
    objective: note.objective,
    assessment: note.assessment,
    plan: note.plan,
    nursing_summary: note.nursing_summary,
    vital_signs_summary: note.vital_signs_summary,
    oral_intake_ml: note.oral_intake_ml,
    iv_intake_ml: note.iv_intake_ml,
    urine_output_ml: note.urine_output_ml,
    other_output_ml: note.other_output_ml,
    io_notes: note.io_notes,
    patient_condition: note.patient_condition,
    alert_level: note.alert_level,
    recorded_by_name: normalizeStaffName(note.recorded_by) || 'Unknown',
    recorded_at: note.recorded_at,
  };
}

// =============================================================================
// Treatment Plan Mapper
// =============================================================================

export function mapTreatmentPlanToDetail(
  plan: TreatmentPlanRow,
): TreatmentPlanDetail {
  return {
    plan_id: plan.id,
    title: plan.title,
    description: plan.description,
    instructions: plan.instructions,
    status: plan.status || '',
    created_at: plan.created_at,
    created_by_name: normalizeDoctorName(plan.creator) || 'Unknown',
    tasks: (plan.tasks || []).map((task) => {
      const completedBy =
        typeof task.completed_by === 'string'
          ? undefined
          : normalizeStaffName(task.completed_by as StaffRow | StaffRow[]);
      return {
        task_id: task.id,
        task_type: task.task_type || '',
        description: task.description,
        status: task.status || '',
        scheduled_at: task.scheduled_at,
        due_date: task.scheduled_at, // Alias for scheduled_at
        completed_at: task.completed_at,
        completed_by_name: completedBy ?? undefined,
        notes: task.notes,
        result_value: task.result_value,
      };
    }),
  };
}

// =============================================================================
// Encounter Summary Mapper
// =============================================================================

export function mapVisitToEncounterSummary(
  visit: VisitRow,
  options: {
    patientUuid: string;
    emrNumber: string;
    consultation?: ConsultationRow | null;
    counts?: EncounterCounts;
  },
): EncounterSummary {
  const { patientUuid, emrNumber, consultation, counts } = options;

  const diagnoses = consultation
    ? parseDiagnosisToArray(consultation.diagnosis, consultation.diagnosis_text)
    : [];

  const doctorName = normalizeDoctorName(visit.attending_doctor);

  const labCount = counts?.lab_count ?? 0;
  const imagingCount = counts?.imaging_count ?? 0;
  const prescriptionCount = counts?.prescription_count ?? 0;

  // Resolve clinic info from join
  const clinicObj = Array.isArray(visit.clinic) ? visit.clinic[0] : visit.clinic;

  return {
    encounter_id: visit.id,
    encounter_number: visit.encounter_number || visit.visit_id,
    visit_id: visit.visit_id,
    patient_id: patientUuid,
    emr_number: emrNumber,
    encounter_date: visit.encounter_date || visit.start_time || '',
    visit_type: visit.visit_type || 'General',
    chief_complaint: visit.chief_complaint || consultation?.complaints || '',
    diagnoses,
    doctor: doctorName ? { name: doctorName } : null,
    status: visit.status || '',
    has_labs: labCount > 0,
    has_imaging: imagingCount > 0,
    has_prescriptions: prescriptionCount > 0,
    lab_count: labCount,
    imaging_count: imagingCount,
    prescription_count: prescriptionCount,
    clinic_id: visit.clinic_id || undefined,
    clinic_name: clinicObj?.clinic_name || undefined,
  };
}

// =============================================================================
// Batch Count Calculator
// =============================================================================

export function calculateEncounterCounts(
  encounters: VisitRow[],
  batchData: {
    labs: Array<{ encounter_id?: string; visit_id?: string }>;
    imaging: Array<{ encounter_id?: string; visit_id?: string }>;
    prescriptions: Array<{ encounter_id?: string; visit_id?: string }>;
  },
): Map<string, EncounterCounts> {
  const countsMap = new Map<string, EncounterCounts>();

  // Initialize counts for all encounters
  for (const enc of encounters) {
    countsMap.set(enc.id, {
      encounter_id: enc.id,
      lab_count: 0,
      imaging_count: 0,
      prescription_count: 0,
    });
  }

  // Count labs
  for (const lab of batchData.labs) {
    const id = lab.encounter_id;
    if (id && countsMap.has(id)) {
      countsMap.get(id)!.lab_count++;
    } else if (lab.visit_id) {
      // Find by visit_id
      const enc = encounters.find((e) => e.visit_id === lab.visit_id);
      if (enc && countsMap.has(enc.id)) {
        countsMap.get(enc.id)!.lab_count++;
      }
    }
  }

  // Count imaging
  for (const img of batchData.imaging) {
    const id = img.encounter_id;
    if (id && countsMap.has(id)) {
      countsMap.get(id)!.imaging_count++;
    } else if (img.visit_id) {
      const enc = encounters.find((e) => e.visit_id === img.visit_id);
      if (enc && countsMap.has(enc.id)) {
        countsMap.get(enc.id)!.imaging_count++;
      }
    }
  }

  // Count prescriptions
  for (const rx of batchData.prescriptions) {
    const id = rx.encounter_id;
    if (id && countsMap.has(id)) {
      countsMap.get(id)!.prescription_count++;
    } else if (rx.visit_id) {
      const enc = encounters.find((e) => e.visit_id === rx.visit_id);
      if (enc && countsMap.has(enc.id)) {
        countsMap.get(enc.id)!.prescription_count++;
      }
    }
  }

  return countsMap;
}
