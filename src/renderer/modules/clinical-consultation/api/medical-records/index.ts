/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - MEDICAL RECORDS MODULE INDEX
 * Barrel export for all medical records functionality
 * =============================================================================
 */

// =============================================================================
// Types Export (all public types)
// =============================================================================

export type {
  // Core types
  ProblemStatus,
  ProblemSeverity,
  AllergySeverity,
  ResolvedPatientIds,

  // DTO types
  AllergyInfo,
  MedicationSummary,
  PatientProblem,
  VitalSnapshot,
  EncounterSummary,
  EncounterDetail,
  ConsultationDetail,
  ClinicalNotes,
  PrescriptionDetail,
  MedicationDetail,
  LabRequestDetail,
  LabResultDetail,
  ProcedureDetail,
  RadiologyRequestSimple,
  ImagingResultDetail,
  ReferralDetail,
  NursingNoteDetail,
  DailyProgressNoteDetail,
  TreatmentPlanDetail,

  // Patient/Record types
  PatientHeaderData,
  VitalsTrend,
  RecordStats,
  PatientMedicalRecordView,
  MedicalRecordsFilters,
  PaginatedEncounters,

  // Row types (for internal use/testing)
  WardRoundNoteRow,
  VisitRow,
  ConsultationRow,
  VitalsRow,
  PrescriptionRow,
  LabRequestRow,
  RadiologyRequestRow,
  ProcedureRow,
  PatientRow,
  StaffRow,
} from './types';

// =============================================================================
// API Functions Export
// =============================================================================

// Main view service
export {
  getPatientMedicalRecordView,
  getPatientVitalsTrend,
} from './medical-record-view.service';

// Encounters service
export {
  getPatientEncounters,
  getEncountersByProblem,
} from './encounters.service';

// Encounter details service
export { getEncounterDetails } from './encounter-details.service';

// =============================================================================
// Utilities Export (for testing/extension)
// =============================================================================

export {
  resolvePatientUuid,
  discoverEncounterIdsFromRelatedRecords,
} from './patient-id-resolver';

export {
  calculateAge,
  getTimeframeDate,
  normalizeDoctorName,
  normalizeStaffName,
  parseDiagnosisToArray,
  diagnosisToString,
  safeJsonParse,
  buildProblemIdStable,
  parseAllergies,
  uniqueValues,
  groupBy,
  toLookupMap,
} from './utils';

export {
  extractProblemsFromDiagnoses,
  mapConsultationsForProblemExtraction,
  extractDiagnosisFromConsultation,
} from './problems-extractor';

export type { ConsultationDiagnosis } from './problems-extractor';

// =============================================================================
// Constants Export
// =============================================================================

export {
  LOG_ENABLED,
  log,
  UUID_REGEX,
  isValidUuid,
  ACTIVE_MEDICATION_STATUSES,
  SEVERITY_ORDER,
} from './constants';
