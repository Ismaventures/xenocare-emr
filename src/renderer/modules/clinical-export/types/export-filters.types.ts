/**
 * Clinical Export System - Export Filters & Configuration Types
 * XENOCARE EMR
 *
 * Type definitions for export filters, configuration, and settings
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type {
  EncounterType,
  ClinicalPriority,
  PaymentCategory,
  AdmissionStatus,
  DischargeOutcome,
} from './clinical-records.types';

// ==================== MODULE SELECTION ====================

/**
 * Export module categories
 */
export type ExportModuleCategory =
  | 'core'
  | 'clinical'
  | 'operational'
  | 'financial';

/**
 * Available export modules
 */
export interface ExportModules {
  // Core modules
  demographics: boolean;
  encounters: boolean;
  diagnoses: boolean;

  // Clinical modules
  vitals: boolean;
  nursing: boolean;
  treatmentPlans: boolean;
  clinicalNotes: boolean;
  prescriptions: boolean;
  laboratory: boolean;
  radiology: boolean;
  procedures: boolean;
  allergies: boolean;

  // Specialty modules
  dental: boolean;
  physiotherapy: boolean;
  ophthalmology: boolean;
  nutrition: boolean;

  // Operational modules
  admissions: boolean;
  wardRounds: boolean;
  bedTransfers: boolean;
  wardStats: boolean;

  // Financial modules
  billing: boolean;
  payments: boolean;

  // Analytics
  analytics: boolean;
}

// ==================== DEPARTMENT REPORT TYPES ====================

/**
 * Department identifier for reports
 */
export type ReportDepartment =
  | 'laboratory'
  | 'radiology'
  | 'dental'
  | 'physiotherapy'
  | 'ophthalmology'
  | 'nutrition'
  | 'procedures';

/**
 * Filters for department-level reports (not patient-specific)
 */
export interface DepartmentReportFilters {
  dateRange: DateRangeFilter;
  facilityId?: string;
  doctorId?: string;
  status?: string;
  patientCategory?: string;
}

// Shared flat record for any department export row
export interface DepartmentReportRow {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Summary section for department month-end report
 */
export interface DepartmentReportSummary {
  department: ReportDepartment;
  period_label: string;
  date_from: string;
  date_to: string;
  total_records: number;
  by_status: Record<string, number>;
  by_patient_category: Record<string, number>;
  top_providers: { name: string; count: number }[];
}

/**
 * Full department report bundle
 */
export interface DepartmentReport {
  summary: DepartmentReportSummary;
  records: DepartmentReportRow[];
  generated_at: string;
  generated_by: string;
  generated_by_name: string;
}

/**
 * Single export module identifier
 */
export type ExportModule = keyof ExportModules;

/**
 * Module metadata for UI display
 */
export interface ModuleMetadata {
  id: keyof ExportModules;
  name: string;
  description: string;
  category: ExportModuleCategory;
  icon?: string;
  dependencies?: (keyof ExportModules)[];
  requiredPermission?: string;
}

/**
 * All available modules with metadata
 */
export const EXPORT_MODULES: ModuleMetadata[] = [
  // Core
  {
    id: 'demographics',
    name: 'Patient Demographics',
    description: 'Basic patient information and contact details',
    category: 'core',
  },
  {
    id: 'encounters',
    name: 'Encounters/Visits',
    description: 'All patient encounters and visits',
    category: 'core',
  },
  {
    id: 'diagnoses',
    name: 'Diagnoses (ICD-10)',
    description: 'All diagnoses with ICD-10 codes',
    category: 'core',
  },

  // Clinical
  {
    id: 'vitals',
    name: 'Vital Signs (LOINC)',
    description: 'Patient vital signs with LOINC coding',
    category: 'clinical',
  },
  {
    id: 'nursing',
    name: 'Nursing Notes',
    description: 'Nursing documentation and observations',
    category: 'clinical',
  },
  {
    id: 'treatmentPlans',
    name: 'Treatment Plans',
    description: 'Care plans and treatment tasks',
    category: 'clinical',
    dependencies: ['nursing'],
  },
  {
    id: 'clinicalNotes',
    name: 'Clinical Notes',
    description: 'Doctor consultation notes (SOAP)',
    category: 'clinical',
  },
  {
    id: 'prescriptions',
    name: 'Prescriptions (ATC)',
    description: 'Medication orders with ATC coding',
    category: 'clinical',
  },
  {
    id: 'laboratory',
    name: 'Laboratory (LOINC)',
    description: 'Lab requests and results with LOINC',
    category: 'clinical',
  },
  {
    id: 'radiology',
    name: 'Radiology',
    description: 'Imaging requests and reports',
    category: 'clinical',
  },
  {
    id: 'procedures',
    name: 'Procedures (CPT)',
    description: 'Medical procedures with CPT/ICD-10-PCS',
    category: 'clinical',
  },
  {
    id: 'allergies',
    name: 'Allergies',
    description: 'Patient allergies and adverse reactions',
    category: 'clinical',
  },

  // Specialty
  {
    id: 'dental',
    name: 'Dental',
    description: 'Dental exams, chart and procedures',
    category: 'clinical',
  },
  {
    id: 'physiotherapy',
    name: 'Physiotherapy',
    description: 'Physio assessments, plans and sessions',
    category: 'clinical',
  },
  {
    id: 'ophthalmology',
    name: 'Ophthalmology',
    description: 'Eye exams, VA, IOP and prescriptions',
    category: 'clinical',
  },
  {
    id: 'nutrition',
    name: 'Nutrition',
    description: 'Nutrition care plans and sessions',
    category: 'clinical',
  },

  // Operational
  {
    id: 'admissions',
    name: 'Admissions',
    description: 'Inpatient admissions and discharges',
    category: 'operational',
  },
  {
    id: 'wardRounds',
    name: 'Ward Rounds',
    description: 'Daily ward round notes',
    category: 'operational',
    dependencies: ['admissions'],
  },
  {
    id: 'bedTransfers',
    name: 'Bed Transfers',
    description: 'Ward and bed transfer history',
    category: 'operational',
    dependencies: ['admissions'],
  },
  {
    id: 'wardStats',
    name: 'Ward Statistics',
    description: 'Bed occupancy and ward utilization',
    category: 'operational',
  },

  // Financial
  {
    id: 'billing',
    name: 'Billing',
    description: 'Invoices and billing items',
    category: 'financial',
    requiredPermission: 'billing.view',
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Payment transactions and receipts',
    category: 'financial',
    requiredPermission: 'billing.view',
  },

  // Analytics
  {
    id: 'analytics',
    name: 'Analytics & Statistics',
    description: 'Calculated metrics and charts',
    category: 'core',
  },
];

// ==================== FILTER DEFINITIONS ====================

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from: string; // ISO 8601 date
  to: string; // ISO 8601 date
  preset?: DateRangePreset;
}

/**
 * Common date range presets
 */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(
  preset: DateRangePreset,
): DateRangeFilter {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today.toISOString(), to: now.toISOString(), preset };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday.toISOString(), to: today.toISOString(), preset };
    }

    case 'last_7_days': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo.toISOString(), to: now.toISOString(), preset };
    }

    case 'last_30_days': {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return { from: monthAgo.toISOString(), to: now.toISOString(), preset };
    }

    case 'this_week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return { from: startOfWeek.toISOString(), to: now.toISOString(), preset };
    }

    case 'last_week': {
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(endOfLastWeek.getDate() - endOfLastWeek.getDay());
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      return {
        from: startOfLastWeek.toISOString(),
        to: endOfLastWeek.toISOString(),
        preset,
      };
    }

    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: startOfMonth.toISOString(),
        to: now.toISOString(),
        preset,
      };
    }

    case 'last_month': {
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: startOfLastMonth.toISOString(),
        to: endOfLastMonth.toISOString(),
        preset,
      };
    }

    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      return {
        from: startOfQuarter.toISOString(),
        to: now.toISOString(),
        preset,
      };
    }

    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfLastQuarter = new Date(
        now.getFullYear(),
        (quarter - 1) * 3,
        1,
      );
      const endOfLastQuarter = new Date(now.getFullYear(), quarter * 3, 0);
      return {
        from: startOfLastQuarter.toISOString(),
        to: endOfLastQuarter.toISOString(),
        preset,
      };
    }

    case 'this_year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: startOfYear.toISOString(), to: now.toISOString(), preset };
    }

    case 'last_year': {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return {
        from: startOfLastYear.toISOString(),
        to: endOfLastYear.toISOString(),
        preset,
      };
    }

    case 'all_time':
      // Return empty strings to indicate no date filtering
      return { from: '', to: '', preset };

    default:
      return { from: '', to: '', preset: 'custom' };
  }
}

/**
 * Complete export filters
 */
export interface ExportFilters {
  // Patient selection
  patientIds?: string[];
  patientCategories?: string[];
  ageRange?: { min?: number; max?: number };
  gender?: ('Male' | 'Female' | 'Other')[];

  // Encounter selection
  encounterIds?: string[];
  encounterTypes?: EncounterType[];
  encounterStatuses?: string[];
  priorities?: ClinicalPriority[];

  // Date range
  dateRange: DateRangeFilter;

  // Location filters
  facilityIds?: string[];
  departmentIds?: string[];
  clinicIds?: string[];
  wardIds?: string[];

  // Provider filters
  doctorIds?: string[];
  nurseIds?: string[];

  // Clinical filters
  icd10Codes?: string[];
  icd10Chapters?: string[];
  diagnosisTypes?: string[];

  // Admission filters
  admissionTypes?: string[];
  admissionStatuses?: AdmissionStatus[];
  dischargeOutcomes?: DischargeOutcome[];
  losRange?: { min?: number; max?: number }; // Length of stay in days

  // Billing filters
  paymentCategories?: PaymentCategory[];
  billingStatuses?: string[];
  amountRange?: { min?: number; max?: number };

  // Module selection
  includeModules: ExportModules;

  // Pagination (for large exports)
  limit?: number;
  offset?: number;
}

/**
 * Default export filters
 */
export function getDefaultExportFilters(): ExportFilters {
  return {
    dateRange: getDateRangeFromPreset('this_month'),
    includeModules: {
      demographics: true,
      encounters: true,
      diagnoses: true,
      vitals: true,
      nursing: false,
      treatmentPlans: false,
      clinicalNotes: true,
      prescriptions: true,
      laboratory: true,
      radiology: true,
      procedures: true,
      allergies: true,
      dental: false,
      physiotherapy: false,
      ophthalmology: false,
      nutrition: false,
      admissions: false,
      wardRounds: false,
      bedTransfers: false,
      wardStats: false,
      billing: false,
      payments: false,
      analytics: true,
    },
  };
}

// ==================== EXPORT CONFIGURATION ====================

/**
 * Export format types
 */
export type ExportFormat = 'PDF' | 'Excel' | 'CSV' | 'JSON';

/**
 * PDF page orientation
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * PDF page size
 */
export type PageSize = 'A4' | 'Letter' | 'Legal';

/**
 * PDF export options
 */
export interface PDFExportOptions {
  orientation: PageOrientation;
  pageSize: PageSize;
  includeHeader: boolean;
  includeFooter: boolean;
  includePageNumbers: boolean;
  includeTOC: boolean; // Table of Contents
  includeCharts: boolean;
  includeCoverPage: boolean;
  watermark?: string;
  confidentialityNotice: boolean;
  hospitalLogo: boolean;
  compressImages: boolean;
}

/**
 * Excel export options
 */
export interface ExcelExportOptions {
  separateSheets: boolean; // Separate sheet per module
  splitByModule?: boolean; // Alias for separateSheets
  includeFormatting: boolean;
  includeFormulas: boolean; // Include Excel formulas
  includeCharts?: boolean; // Include charts in Excel
  includeSummarySheet: boolean;
  freezeHeaders: boolean;
  autoFitColumns: boolean;
  autoFilter?: boolean; // Add auto-filter to columns
  includeFilters: boolean;
  dateFormat: string;
  numberFormat: string;
}

/**
 * CSV export options
 */
export interface CSVExportOptions {
  delimiter: ',' | ';' | '\t';
  encoding: 'UTF-8' | 'UTF-16' | 'ASCII';
  includeHeaders: boolean;
  quoteStrings: boolean;
  dateFormat: string;
  nullValue: string;
}

/**
 * JSON export options
 */
export interface JSONExportOptions {
  pretty?: boolean; // Pretty print alias
  prettyPrint?: boolean; // Pretty print
  includeFHIRFormat?: boolean; // Include FHIR resource structure
  fhirCompliant?: boolean; // Alias for includeFHIRFormat
  includeMetadata: boolean;
  flattenNested?: boolean;
  includeNulls?: boolean;
}

/**
 * Complete export configuration
 */
export interface ExportConfiguration {
  format: ExportFormat;
  filename?: string;

  // Format-specific options
  pdfOptions?: PDFExportOptions;
  excelOptions?: ExcelExportOptions;
  csvOptions?: CSVExportOptions;
  jsonOptions?: JSONExportOptions;

  // General options
  includeMetadata: boolean;
  includeTimestamp: boolean;
  groupByPatient: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Security
  password?: string; // PDF password protection
  redactSensitive: boolean; // Redact sensitive info

  // Delivery
  emailTo?: string[];
  saveToServer: boolean;
}

/**
 * Default PDF export options
 */
export function getDefaultPDFOptions(): PDFExportOptions {
  return {
    orientation: 'portrait',
    pageSize: 'A4',
    includeHeader: true,
    includeFooter: true,
    includePageNumbers: true,
    includeTOC: true,
    includeCharts: true,
    includeCoverPage: true,
    confidentialityNotice: true,
    hospitalLogo: true,
    compressImages: true,
  };
}

/**
 * Default Excel export options
 */
export function getDefaultExcelOptions(): ExcelExportOptions {
  return {
    separateSheets: true,
    includeFormatting: true,
    includeFormulas: true,
    includeSummarySheet: true,
    freezeHeaders: true,
    autoFitColumns: true,
    includeFilters: true,
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '#,##0.00',
  };
}

/**
 * Default CSV export options
 */
export function getDefaultCSVOptions(): CSVExportOptions {
  return {
    delimiter: ',',
    encoding: 'UTF-8',
    includeHeaders: true,
    quoteStrings: true,
    dateFormat: 'YYYY-MM-DD',
    nullValue: '',
  };
}

/**
 * Default JSON export options
 */
export function getDefaultJSONOptions(): JSONExportOptions {
  return {
    pretty: true,
    includeFHIRFormat: false,
    includeMetadata: true,
    flattenNested: false,
  };
}

/**
 * Default export configuration
 */
export function getDefaultExportConfiguration(): ExportConfiguration {
  return {
    format: 'PDF',
    pdfOptions: getDefaultPDFOptions(),
    excelOptions: getDefaultExcelOptions(),
    csvOptions: getDefaultCSVOptions(),
    jsonOptions: getDefaultJSONOptions(),
    includeMetadata: true,
    includeTimestamp: true,
    groupByPatient: true,
    redactSensitive: false,
    saveToServer: false,
  };
}

// ==================== EXPORT PROGRESS ====================

/**
 * Export status states
 */
export type ExportStatus =
  | 'idle'
  | 'preparing'
  | 'fetching'
  | 'processing'
  | 'generating'
  | 'completed'
  | 'complete'
  | 'in-progress'
  | 'failed'
  | 'cancelled';

/**
 * Export progress tracking
 */
export interface ExportProgress {
  status?: ExportStatus;
  stage?: string; // Simple stage name (e.g., 'fetching', 'generating')
  message?: string; // User-friendly message
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  progress: number; // 0-100
  currentModule?: string;
  recordsProcessed?: number;
  totalRecords?: number;
  startTime?: string;
  estimatedEndTime?: string;
  error?: string;
}

/**
 * Initial export progress state
 */
export function getInitialExportProgress(): ExportProgress {
  return {
    status: 'idle',
    stage: 'idle',
    message: '',
    currentStep: '',
    totalSteps: 0,
    completedSteps: 0,
    progress: 0,
    recordsProcessed: 0,
    totalRecords: 0,
  };
}

// ==================== EXPORT HISTORY ====================

/**
 * Export history record
 */
export interface ExportHistoryRecord {
  id: string;
  exportDate: string;
  exportedBy: {
    id: string;
    name: string;
  };
  format: ExportFormat;
  filters: ExportFilters;
  configuration: ExportConfiguration;
  filename: string;
  fileSize: number; // Bytes
  recordCount: number;
  status: 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
}
