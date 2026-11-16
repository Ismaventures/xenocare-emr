/**
 * Clinical Export System - Exporters
 * NDC MEDICAL CENTRE EMR
 *
 * Central export point for all export engines
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

// PDF Exporter
export {
  ClinicalPDFExporter,
  generateClinicalExportPDF,
  downloadClinicalExportPDF,
} from './pdf-exporter';

// Excel Exporter
export {
  ClinicalExcelExporter,
  MultiPatientExcelExporter,
  generateClinicalExportExcel,
  downloadClinicalExportExcel,
  generateMultiPatientExportExcel,
  downloadMultiPatientExportExcel,
} from './excel-exporter';

// JSON/FHIR Exporter
export {
  ClinicalJSONExporter,
  generateClinicalExportJSON,
  downloadClinicalExportJSON,
  generateFHIRBundle,
} from './json-exporter';

export type {
  FHIRBundle,
  FHIRPatient,
  FHIREncounter,
  FHIRCondition,
  FHIRObservation,
  FHIRMedicationRequest,
  FHIRServiceRequest,
  FHIRProcedure,
  FHIRDiagnosticReport,
} from './json-exporter';

// CSV Exporter
export {
  ClinicalCSVExporter,
  generateClinicalExportCSV,
  downloadClinicalExportCSV,
  generateAllModuleCSVs,
} from './csv-exporter';
