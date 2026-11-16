/**
 * Clinical Export System - Types Index
 * NDC MEDICAL CENTRE EMR
 *
 * Central export point for all clinical export types
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

// Clinical Records Types
export type {
  // Patient
  AdministrativeGender,
  PatientCoreRecord,
  EmergencyContact,

  // Encounter
  EncounterType,
  EncounterStatus,
  ClinicalPriority,
  EncounterRecord,

  // Diagnosis
  DiagnosisType,
  DiagnosisCertainty,
  DiagnosisRecord,

  // Vitals
  TemperatureUnit,
  WeightUnit,
  HeightUnit,
  VitalsRecord,

  // Nursing
  NursingNoteType,
  PatientCondition,
  NursingRecord,
  TreatmentTaskStatus,
  TreatmentTaskRecord,
  TreatmentPlanRecord,

  // Clinical Notes
  AllergySeverity,
  AllergyRecord,
  ClinicalNoteRecord,

  // Prescriptions
  MedicationRoute,
  PrescriptionStatus,
  ATCClassification,
  PrescriptionRecord,

  // Laboratory
  LabPriority,
  LabRequestStatus,
  AbnormalFlag,
  LabRequestRecord,
  LabResultRecord,

  // Radiology
  ImagingModality,
  RadiologyRequestStatus,
  Laterality,
  RadiologyRequestRecord,
  RadiologyReportRecord,

  // Procedures
  ProcedureType,
  ProcedureUrgency,
  ProcedureOutcome,
  AnesthesiaType,
  ProcedureRecord,

  // Billing
  PaymentCategory,
  BillingStatus,
  ServiceType,
  PaymentMethod,
  BillingItemRecord,
  PaymentRecord,
  BillingRecord,

  // Admission
  AdmissionType,
  AdmissionStatus,
  DischargeOutcome,
  AdmissionRecord,
  WardRoundType,
  WardRoundNoteRecord,
  BedTransferRecord,

  // Export Metadata
  ExportMetadata,
} from './clinical-records.types';

export { LOINC_VITAL_SIGNS } from './clinical-records.types';

// Export Filters Types
export type {
  ExportModuleCategory,
  ExportModules,
  ExportModule,
  ModuleMetadata,
  DateRangeFilter,
  DateRangePreset,
  ExportFilters,
  ExportFormat,
  PageOrientation,
  PageSize,
  PDFExportOptions,
  ExcelExportOptions,
  CSVExportOptions,
  JSONExportOptions,
  ExportConfiguration,
  ExportStatus,
  ExportProgress,
  ExportHistoryRecord,
} from './export-filters.types';

export {
  EXPORT_MODULES,
  getDateRangeFromPreset,
  getDefaultExportFilters,
  getDefaultPDFOptions,
  getDefaultExcelOptions,
  getDefaultCSVOptions,
  getDefaultJSONOptions,
  getDefaultExportConfiguration,
  getInitialExportProgress,
} from './export-filters.types';

// Analytics Types
export type {
  // Common
  AnalyticsPeriod,
  TimeSeriesDataPoint,
  DistributionItem,
  StatisticalSummary,
  ComparisonMetric,

  // Clinical Analytics
  ICD10ChapterStats,
  DiseasePrevalenceStats,
  VisitVolumeStats,
  ADTStats,
  LOSStats,
  ReadmissionStats,
  MortalityStats,
  VitalsStats,
  ClinicalAnalytics,

  // Operational Analytics
  PatientFlowStats,
  WaitTimeStats,
  WorkloadStats,
  BedOccupancyStats,
  TheatreUtilizationStats,
  OperationalAnalytics,

  // Financial Analytics
  RevenueStats,
  InsuranceAnalytics,
  BalanceStats,
  CollectionStats,
  FinancialAnalytics,

  // Patient Analytics
  PatientAnalytics,

  // Combined
  CombinedAnalytics,

  // Charts
  ChartType,
  ChartConfig,
  ChartData,
} from './analytics.types';
