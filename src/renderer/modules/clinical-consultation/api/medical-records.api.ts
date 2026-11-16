/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - PATIENT MEDICAL RECORDS API
 * Problem-oriented medical records view for clinical consultations
 *
 * This file is a facade that re-exports from the refactored module structure.
 * All implementation is now in the ./medical-records/ directory.
 * =============================================================================
 */

// =============================================================================
// Re-export all types
// =============================================================================

export type {
  ProblemStatus,
  ProblemSeverity,
  AllergySeverity,
  ResolvedPatientIds,
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
  WardRoundNoteRow,
  RadiologyRequestSimple,
  ImagingResultDetail,
  ReferralDetail,
  NursingNoteDetail,
  DailyProgressNoteDetail,
  TreatmentPlanDetail,
  PatientHeaderData,
  VitalsTrend,
  RecordStats,
  PatientMedicalRecordView,
  MedicalRecordsFilters,
  PaginatedEncounters,
  VisitRow,
  ConsultationRow,
  VitalsRow,
  PrescriptionRow,
  LabRequestRow,
  RadiologyRequestRow,
  ProcedureRow,
  PatientRow,
  StaffRow,
  ConsultationDiagnosis,
} from './medical-records';

// =============================================================================
// Re-export all API functions
// =============================================================================

export {
  // Main view service
  getPatientMedicalRecordView,
  getPatientVitalsTrend,

  // Encounters service
  getPatientEncounters,
  getEncountersByProblem,

  // Encounter details service
  getEncounterDetails,

  // Utilities
  resolvePatientUuid,
  discoverEncounterIdsFromRelatedRecords,
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
  extractProblemsFromDiagnoses,
  mapConsultationsForProblemExtraction,
  extractDiagnosisFromConsultation,

  // Constants
  LOG_ENABLED,
  log,
  UUID_REGEX,
  isValidUuid,
  ACTIVE_MEDICATION_STATUSES,
  SEVERITY_ORDER,
} from './medical-records';
