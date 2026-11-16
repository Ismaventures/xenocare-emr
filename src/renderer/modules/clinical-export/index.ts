/**
 * Clinical Export System
 * NDC MEDICAL CENTRE EMR
 *
 * Comprehensive clinical records export module following international
 * healthcare data standards (HL7 FHIR, ICD-10, LOINC, ATC, CPT)
 *
 * @version 1.0.0
 * @date January 24, 2026
 *
 * @module clinical-export
 * @description
 * This module provides a unified export system for clinical records across
 * all EMR modules. It supports multiple export formats (PDF, Excel, CSV, JSON/FHIR)
 * and includes analytics capabilities for clinical, operational, and financial reporting.
 *
 * ## Features
 * - Multi-format export (PDF, Excel, CSV, JSON/FHIR)
 * - International healthcare coding standards integration
 * - Comprehensive analytics engine
 * - Professional medical report generation
 * - Data aggregation across all clinical modules
 *
 * ## Healthcare Standards Supported
 * - ICD-10: Diagnosis coding
 * - LOINC: Lab tests and vital signs
 * - ATC: Medication classification
 * - CPT/ICD-10-PCS: Procedure coding
 * - HL7 FHIR R4: Data interoperability
 *
 * ## Usage
 * ```tsx
 * import { ClinicalExportModal, fetchPatientJourney, downloadClinicalExportPDF } from '@/modules/clinical-export';
 *
 * // In component
 * <ClinicalExportModal
 *   isOpen={showExport}
 *   onClose={() => setShowExport(false)}
 *   patientId={patient.id}
 *   patientName={patient.name}
 *   emrNumber={patient.emr_number}
 *   userId={currentUser.id}
 *   userName={currentUser.name}
 * />
 * ```
 */

// ==================== TYPES ====================
export * from './types';

// ==================== STANDARDS SERVICES ====================
export * from './standards';

// ==================== DATA AGGREGATION API ====================
export * from './api';

// ==================== EXPORT ENGINES ====================
export * from './exporters';

// ==================== ANALYTICS ENGINE ====================
export * from './analytics';

// ==================== UI COMPONENTS ====================
export * from './components';
