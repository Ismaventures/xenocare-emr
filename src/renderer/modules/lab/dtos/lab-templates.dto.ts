// =============================================================================
// Lab Result Template Types and Category Definitions
// These types support the dynamic result entry form system
// =============================================================================

// =============================================================================
// Standard Lab Categories (Canonical List)
// =============================================================================

export const LAB_CATEGORY_CODES = [
  'HEMATOLOGY',
  'CLINICAL_CHEMISTRY',
  'MICROBIOLOGY',
  'PARASITOLOGY',
  'SEROLOGY',
  'URINALYSIS',
  'HISTOPATHOLOGY',
  'ENDOCRINOLOGY',
  'MOLECULAR',
  'COAGULATION',
  'BLOOD_BANK',
] as const;

export type LabCategoryCode = (typeof LAB_CATEGORY_CODES)[number];

// =============================================================================
// Result Template Types
// =============================================================================

export const RESULT_TEMPLATE_TYPES = [
  'numeric_table', // Hematology, Coagulation
  'panel_numeric', // Clinical Chemistry
  'culture_sensitivity', // Microbiology
  'parasite_report', // Parasitology
  'qualitative_quantitative', // Serology
  'urinalysis_checklist', // Urinalysis
  'narrative_diagnostic', // Histopathology
  'numeric_timing', // Endocrinology
  'binary_metadata', // Molecular/Rapid tests
] as const;

export type ResultTemplateType = (typeof RESULT_TEMPLATE_TYPES)[number];

// =============================================================================
// Category Definitions
// =============================================================================

export interface LabCategoryDefinition {
  code: LabCategoryCode;
  name: string;
  displayName: string;
  description: string;
  resultTemplateType: ResultTemplateType;
  displayOrder: number;
  color: string;
  bgColor: string;
}

export const LAB_CATEGORIES: Record<LabCategoryCode, LabCategoryDefinition> = {
  HEMATOLOGY: {
    code: 'HEMATOLOGY',
    name: 'Hematology',
    displayName: 'Hematology',
    description:
      'Blood cell analysis including CBC, differential counts, and blood typing',
    resultTemplateType: 'numeric_table',
    displayOrder: 1,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  CLINICAL_CHEMISTRY: {
    code: 'CLINICAL_CHEMISTRY',
    name: 'Clinical Chemistry',
    displayName: 'Clinical Chemistry / Chemical Pathology',
    description: 'Biochemical analysis of blood and body fluids',
    resultTemplateType: 'panel_numeric',
    displayOrder: 2,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  MICROBIOLOGY: {
    code: 'MICROBIOLOGY',
    name: 'Microbiology',
    displayName: 'Microbiology',
    description: 'Culture, sensitivity, and identification of microorganisms',
    resultTemplateType: 'culture_sensitivity',
    displayOrder: 3,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  PARASITOLOGY: {
    code: 'PARASITOLOGY',
    name: 'Parasitology',
    displayName: 'Parasitology',
    description: 'Detection and identification of parasites in specimens',
    resultTemplateType: 'parasite_report',
    displayOrder: 4,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  SEROLOGY: {
    code: 'SEROLOGY',
    name: 'Serology',
    displayName: 'Immunology / Serology',
    description:
      'Antibody and antigen detection for infectious diseases and autoimmune markers',
    resultTemplateType: 'qualitative_quantitative',
    displayOrder: 5,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  URINALYSIS: {
    code: 'URINALYSIS',
    name: 'Urinalysis',
    displayName: 'Urinalysis',
    description: 'Physical, chemical, and microscopic examination of urine',
    resultTemplateType: 'urinalysis_checklist',
    displayOrder: 6,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  HISTOPATHOLOGY: {
    code: 'HISTOPATHOLOGY',
    name: 'Histopathology',
    displayName: 'Histopathology & Cytology',
    description: 'Tissue examination and pathological diagnosis',
    resultTemplateType: 'narrative_diagnostic',
    displayOrder: 7,
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
  },
  ENDOCRINOLOGY: {
    code: 'ENDOCRINOLOGY',
    name: 'Endocrinology',
    displayName: 'Endocrinology',
    description: 'Hormone level measurements',
    resultTemplateType: 'numeric_timing',
    displayOrder: 8,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  MOLECULAR: {
    code: 'MOLECULAR',
    name: 'Molecular',
    displayName: 'Molecular Diagnostics & Rapid Tests',
    description: 'PCR, genetic testing, and point-of-care rapid diagnostics',
    resultTemplateType: 'binary_metadata',
    displayOrder: 9,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
  },
  COAGULATION: {
    code: 'COAGULATION',
    name: 'Coagulation',
    displayName: 'Coagulation Studies',
    description: 'Blood clotting function tests',
    resultTemplateType: 'numeric_table',
    displayOrder: 10,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  BLOOD_BANK: {
    code: 'BLOOD_BANK',
    name: 'Blood Bank',
    displayName: 'Blood Bank / Transfusion Medicine',
    description: 'Blood typing, cross-matching, and compatibility testing',
    resultTemplateType: 'qualitative_quantitative',
    displayOrder: 11,
    color: 'text-rose-700',
    bgColor: 'bg-rose-100',
  },
};

// =============================================================================
// Result Workflow Status
// =============================================================================

export const RESULT_WORKFLOW_STATUS = [
  'Pending',
  'Verified',
  'Approved',
  'Released',
  'Amended',
] as const;

export type ResultWorkflowStatus = (typeof RESULT_WORKFLOW_STATUS)[number];

// =============================================================================
// Result Flag Types
// =============================================================================

export const RESULT_FLAGS = [
  'Low',
  'Normal',
  'High',
  'Critical Low',
  'Critical High',
] as const;

export type ResultFlag = (typeof RESULT_FLAGS)[number];

// =============================================================================
// Sensitivity Results (for Microbiology)
// =============================================================================

export const SENSITIVITY_RESULTS = ['S', 'I', 'R'] as const;
export type SensitivityResult = (typeof SENSITIVITY_RESULTS)[number];

export const SENSITIVITY_LABELS: Record<SensitivityResult, string> = {
  S: 'Sensitive',
  I: 'Intermediate',
  R: 'Resistant',
};

// =============================================================================
// Growth Levels (for Culture)
// =============================================================================

export const GROWTH_LEVELS = [
  'No Growth',
  'Light Growth',
  'Moderate Growth',
  'Heavy Growth',
  'Mixed Flora',
] as const;

export type GrowthLevel = (typeof GROWTH_LEVELS)[number];

// =============================================================================
// Density Grading (for Parasitology)
// =============================================================================

export const DENSITY_GRADES = ['+', '++', '+++', '++++'] as const;
export type DensityGrade = (typeof DENSITY_GRADES)[number];

// Extended parasite density for form usage
export const PARASITE_DENSITIES = [
  'Not Seen',
  'Scanty',
  '+',
  '++',
  '+++',
  '++++',
] as const;
export type ParasiteDensity = (typeof PARASITE_DENSITIES)[number];

// =============================================================================
// Qualitative Results (for Serology)
// =============================================================================

export const QUALITATIVE_RESULTS = [
  'Positive',
  'Negative',
  'Reactive',
  'Non-Reactive',
  'Indeterminate',
  'Equivocal',
] as const;

export type QualitativeResult = (typeof QUALITATIVE_RESULTS)[number];

// =============================================================================
// Structured Result Data Interfaces
// =============================================================================

// Base interface for all structured results
export interface BaseStructuredResult {
  templateType: ResultTemplateType;
  version: number;
  completedAt?: string;
}

// Numeric Table (Hematology, Coagulation)
export interface NumericTableResult extends BaseStructuredResult {
  templateType: 'numeric_table';
  parameters: NumericParameter[];
  morphologyComments?: string;
}

export interface NumericParameter {
  id: string;
  parameter: string;
  resultValue: number | null;
  unit: string;
  referenceRange: string;
  flag: ResultFlag | null;
  isAbnormal: boolean;
  isCritical: boolean;
}

// Panel Numeric (Clinical Chemistry)
export interface PanelNumericResult extends BaseStructuredResult {
  templateType: 'panel_numeric';
  panels: PanelGroup[];
  interpretationNote?: string;
}

export interface PanelGroup {
  groupName: string;
  analytes: AnalyteResult[];
}

export interface AnalyteResult {
  id: string;
  analyte: string;
  resultValue: number | null;
  unit: string;
  referenceRange: string;
  flag: ResultFlag | null;
  isAbnormal: boolean;
}

// Culture & Sensitivity (Microbiology)
export interface CultureSensitivityResult extends BaseStructuredResult {
  templateType: 'culture_sensitivity';
  // Structured API format
  specimenInfo?: {
    specimenType?: string;
    specimenQuality?: 'Adequate' | 'Inadequate' | 'Contaminated';
    collectionDate?: string;
    source?: string;
  };
  microscopy?: {
    gramStain?: string;
    wetMount?: string;
    cellCount?: string;
    epithelialCells?: string;
    otherFindings?: string;
    wbc?: string;
    rbc?: string;
    organisms?: string;
  };
  cultures?: CultureResult[];
  sensitivities?: SensitivityMatrix[];
  comments?: string;
  recommendations?: string;
  // Form-friendly flattened fields
  specimenType?: string;
  specimenSource?: string;
  specimenQuality?: 'Adequate' | 'Inadequate' | 'Contaminated';
  noGrowth?: boolean;
  incubationTime?: string;
  cultureResults?: Array<{
    id?: string;
    organismName?: string;
    growth?: GrowthLevel | string;
    colonyCount?: string;
    identification?: string;
  }>;
  sensitivityResults?: Array<{
    organismId?: string;
    organismName?: string;
    antibiotics?: Array<{
      name: string;
      result: SensitivityResult;
      mic?: string;
      zone?: string;
    }>;
  }>;
  notes?: string;
}

export interface CultureResult {
  id: string;
  growth: GrowthLevel;
  organismIsolated?: string;
  colonyCount?: string;
  incubationTime?: string;
}

export interface SensitivityMatrix {
  organismId: string;
  antibiotics: AntibioticSensitivity[];
}

export interface AntibioticSensitivity {
  antibiotic: string;
  result: SensitivityResult;
  mic?: string;
  zoneDiameter?: string;
}

// Parasite Report (Parasitology)
export interface ParasiteReportResult extends BaseStructuredResult {
  templateType: 'parasite_report';
  // Structured API format
  specimenInfo?: {
    specimenType: string;
    collectionTime?: string;
    examinationMethods: string[];
  };
  detections?: ParasiteDetection[];
  additionalFindings?: string;
  // Form-friendly fields (aliases)
  specimenType?: string;
  collectionTime?: string;
  examinationMethod?: string;
  fieldsExamined?: number;
  detected?: boolean;
  parasitesFound?: Array<{
    species: string;
    stage?: string;
    density: ParasiteDensity;
    count?: number;
    countPer?: string;
  }>;
  otherFindings?: string;
  notes?: string;
}

export interface ParasiteDetection {
  id: string;
  parasiteDetected: boolean;
  species?: string;
  stage?: string;
  densityGrading?: DensityGrade;
  parasiteCount?: string;
}

// Qualitative + Quantitative (Serology)
export interface QualitativeQuantitativeResult extends BaseStructuredResult {
  templateType: 'qualitative_quantitative';
  qualitativeResult: QualitativeResult;
  signalCutoff?: number;
  quantitative?: {
    titer?: string;
    concentration?: number;
    unit?: string;
    referenceRange?: string;
  };
  confirmation?: {
    test?: string;
    result?:
      | 'Confirmed Positive'
      | 'Confirmed Negative'
      | 'Pending'
      | 'Not Required';
    date?: string;
  };
  interpretation?: string;
  notes?: string;
}

// Urinalysis Checklist - Comprehensive Dipstick Support
export interface UrinalysisResult extends BaseStructuredResult {
  templateType: 'urinalysis_checklist';

  // Dipstick panel type selector (full range: 1-14 parameters + specialized panels)
  dipstickType?:
    | 'complete'
    // Single parameter strips
    | 'single_glucose'
    | 'single_protein'
    | 'single_ketone'
    // Multi-parameter strips (2-9)
    | 'param_2'
    | 'param_3'
    | 'param_5'
    | 'param_7'
    | 'param_9'
    // Standard full strips (10-14)
    | 'standard_10'
    | 'standard_11'
    | 'extended_13'
    | 'extended_14'
    // Specialized clinical panels
    | 'pediatric'
    | 'diabetic'
    | 'renal'
    | 'liver'
    | 'infection'
    | 'microalbuminuria'
    | 'pregnancy'
    | 'dipstick_only';

  // Specimen metadata
  specimenType?:
    | 'Random'
    | 'First Morning'
    | 'Midstream Clean Catch'
    | '24-Hour Collection'
    | 'Catheter'
    | 'Suprapubic';
  collectionTime?: string;
  testMethod?: string;

  // Structured API format - Physical Examination
  physical?: {
    color?: string;
    appearance?: string;
    specificGravity?: number;
    volume?: number;
    odor?: string;
  };

  // Chemical Examination (Dipstick) - Extended to support all dipstick types
  chemical?: {
    // Standard 10-parameter dipstick
    ph?: number;
    protein?: string;
    glucose?: string;
    ketones?: string;
    blood?: string;
    bilirubin?: string;
    urobilinogen?: string;
    nitrite?: string;
    leukocyteEsterase?: string;
    // Extended parameters (N11, N13, N14 dipsticks)
    ascorbicAcid?: string; // Vitamin C - interference detection
    microalbumin?: string; // Albumin for microalbuminuria screening
    creatinine?: string; // Urine creatinine for ACR calculation
    albumin_creatinine_ratio?: number; // Calculated ACR (mg/mmol)
    calcium?: string; // Urine calcium
    // Optional numeric values for quantitative results
    protein_numeric?: number; // mg/dL or g/L
    glucose_numeric?: number; // mg/dL or mmol/L
    microalbumin_numeric?: number; // mg/L
    creatinine_numeric?: number; // mmol/L
  };

  // Microscopic Examination
  microscopy?: {
    rbc?: string;
    wbc?: string;
    epithelialCells?: string;
    casts?: string;
    castTypes?: string[];
    crystals?: string;
    crystalTypes?: string[];
    bacteria?: string;
    yeast?: string;
    parasites?: string;
    mucus?: string; // Mucus threads
    otherFindings?: string;
  };

  interpretation?: string;
  comments?: string;

  // Form-friendly flattened fields (aliases) - backward compatibility
  physicalExamination?: {
    color?: string;
    appearance?: string;
    specificGravity?: number;
    volume?: number;
  };
  chemicalExamination?: {
    pH?: number;
    protein?: string;
    glucose?: string;
    ketones?: string;
    blood?: string;
    bilirubin?: string;
    urobilinogen?: string;
    nitrite?: string;
    leukocyteEsterase?: string;
    // Extended
    ascorbicAcid?: string;
    microalbumin?: string;
    creatinine?: string;
  };
  microscopicExamination?: {
    rbc?: string;
    wbc?: string;
    epithelialCells?: string;
    casts?: string;
    castTypes?: string[];
    crystals?: string;
    crystalTypes?: string[];
    bacteria?: string;
    yeast?: string;
    parasites?: string;
    mucus?: string;
    otherFindings?: string;
  };
}

// Narrative Diagnostic (Histopathology)
export interface NarrativeDiagnosticResult extends BaseStructuredResult {
  templateType: 'narrative_diagnostic';
  // Structured API format
  specimen?: {
    type: string;
    site?: string;
    procedure?: string;
    receivedAt?: string;
    fixative?: string;
    adequacy: 'Adequate' | 'Suboptimal' | 'Inadequate';
  };
  macroscopy?: {
    grossDescription: string;
    measurements?: string;
    blocksSubmitted?: string;
  };
  microscopy?: {
    microscopicFindings: string;
    specialStains?: string;
    immunohistochemistry?: string;
  };
  diagnosis?: {
    finalDiagnosis: string;
    snomedCodes?: string;
    tumorStaging?: string;
    marginStatus?: string;
  };
  recommendations?: string;
  clinicalCorrelation?: string;
  approval?: {
    reportedBy?: string;
    consultantPathologist?: string;
    approvalStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Amended';
    approvalDate?: string;
  };
  // Form-friendly flattened fields
  specimenType?: string;
  specimenSite?: string;
  specimenDescription?: string;
  fixationType?: string;
  clinicalHistory?: string;
  specimenSize?: string;
  specimenWeight?: number;
  blocksSubmitted?: number;
  microscopicDescription?: string;
  specialStains?: string[];
  specialStainResults?: string;
  finalDiagnosis?: string;
  tumorGrade?: string;
  ptnmStage?: string;
  marginStatus?: 'Clear' | 'Involved' | 'Close' | 'Not Applicable';
  comments?: string;
  addendum?: string;
}

// Numeric with Timing (Endocrinology)
export interface NumericTimingResult extends BaseStructuredResult {
  templateType: 'numeric_timing';
  sampleTiming: {
    collectionTime: string;
    fastingStatus: 'Fasting' | 'Non-Fasting' | 'Not Applicable';
    timingNotes?: string;
  };
  results: NumericParameter[];
  interpretation?: string;
  notes?: string;
}

// Binary with Metadata (Molecular/Rapid)
export interface BinaryMetadataResult extends BaseStructuredResult {
  templateType: 'binary_metadata';
  // Structured API format
  result?: 'Detected' | 'Not Detected' | 'Indeterminate' | 'Invalid';
  ctValue?: number;
  viralLoad?: string;
  geneTargets?: string[];
  kitInfo?: {
    kitName?: string;
    name?: string;
    manufacturer?: string;
    lotNumber?: string;
    expiryDate?: string;
  };
  qc?: {
    qcPassed?: boolean;
    positiveControl?: 'Valid' | 'Invalid' | 'N/A';
    negativeControl?: 'Valid' | 'Invalid' | 'N/A';
    internalControl?: 'Valid' | 'Invalid' | 'N/A';
  };
  traceability?: {
    instrumentId?: string;
    runId?: string;
    operator?: string;
    runDate?: string;
  };
  // Form-friendly flattened fields
  detected?: boolean;
  target?: string;
  method?: string;
  qcChecklist?: Record<string, boolean>;
  controlResults?: {
    positiveControl?: 'Valid' | 'Invalid' | 'N/A';
    negativeControl?: 'Valid' | 'Invalid' | 'N/A';
  };
  interpretation?: string;
  comments?: string;
  notes?: string;
}

// Union type of all structured results
export type StructuredResult =
  | NumericTableResult
  | PanelNumericResult
  | CultureSensitivityResult
  | ParasiteReportResult
  | QualitativeQuantitativeResult
  | UrinalysisResult
  | NarrativeDiagnosticResult
  | NumericTimingResult
  | BinaryMetadataResult;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the result template type for a given category code
 */
export function getTemplateTypeForCategory(
  categoryCode: LabCategoryCode | string,
): ResultTemplateType {
  const category = LAB_CATEGORIES[categoryCode as LabCategoryCode];
  return category?.resultTemplateType || 'panel_numeric';
}

/**
 * Get category definition by code or legacy name
 */
export function getCategoryDefinition(
  categoryOrCode: string,
): LabCategoryDefinition | undefined {
  // Direct code match
  if (categoryOrCode in LAB_CATEGORIES) {
    return LAB_CATEGORIES[categoryOrCode as LabCategoryCode];
  }

  // Legacy category name mapping
  const legacyMapping: Record<string, LabCategoryCode> = {
    Hematology: 'HEMATOLOGY',
    'Clinical Chemistry': 'CLINICAL_CHEMISTRY',
    'Chemical Pathology': 'CLINICAL_CHEMISTRY',
    Microbiology: 'MICROBIOLOGY',
    Parasitology: 'PARASITOLOGY',
    Serology: 'SEROLOGY',
    Immunology: 'SEROLOGY',
    Urinalysis: 'URINALYSIS',
    Histopathology: 'HISTOPATHOLOGY',
    'Histopathology & Cytology': 'HISTOPATHOLOGY',
    Endocrinology: 'ENDOCRINOLOGY',
    Hormones: 'ENDOCRINOLOGY',
    'Molecular Diagnostics': 'MOLECULAR',
    Molecular: 'MOLECULAR',
    Coagulation: 'COAGULATION',
    'Blood Bank': 'BLOOD_BANK',
  };

  const code = legacyMapping[categoryOrCode];
  return code ? LAB_CATEGORIES[code] : undefined;
}

/**
 * Get category color classes
 */
export function getCategoryColorClasses(categoryOrCode: string): {
  color: string;
  bgColor: string;
} {
  const def = getCategoryDefinition(categoryOrCode);
  return def
    ? { color: def.color, bgColor: def.bgColor }
    : { color: 'text-gray-700', bgColor: 'bg-gray-100' };
}

/**
 * Check if a result flag indicates abnormal
 */
export function isAbnormalFlag(flag: ResultFlag | null): boolean {
  return flag !== null && flag !== 'Normal';
}

/**
 * Check if a result flag indicates critical
 */
export function isCriticalFlag(flag: ResultFlag | null): boolean {
  return flag === 'Critical Low' || flag === 'Critical High';
}

/**
 * Determine flag based on value and reference range
 */
export function calculateResultFlag(
  value: number | null,
  referenceRange: string,
  criticalLow?: number,
  criticalHigh?: number,
): ResultFlag | null {
  if (value === null) return null;

  // Parse reference range (e.g., "4.0-11.0" or "<5.0" or ">90")
  const rangeMatch = referenceRange.match(
    /^([<>]?)(\d+\.?\d*)\s*-?\s*(\d+\.?\d*)?$/,
  );
  if (!rangeMatch) return null;

  const [, operator, lowStr, highStr] = rangeMatch;
  const low = parseFloat(lowStr);
  const high = highStr ? parseFloat(highStr) : null;

  // Check critical values first
  if (criticalLow !== undefined && value < criticalLow) return 'Critical Low';
  if (criticalHigh !== undefined && value > criticalHigh)
    return 'Critical High';

  // Check normal range
  if (operator === '<') {
    return value < low ? 'Normal' : 'High';
  }
  if (operator === '>') {
    return value > low ? 'Normal' : 'Low';
  }
  if (high !== null) {
    if (value < low) return 'Low';
    if (value > high) return 'High';
    return 'Normal';
  }

  return null;
}

/**
 * Get common antibiotics for sensitivity testing
 */
export function getCommonAntibiotics(): string[] {
  return [
    'Amoxicillin',
    'Amoxicillin-Clavulanate',
    'Ampicillin',
    'Azithromycin',
    'Ceftriaxone',
    'Cefuroxime',
    'Ciprofloxacin',
    'Clindamycin',
    'Cotrimoxazole (SXT)',
    'Doxycycline',
    'Erythromycin',
    'Gentamicin',
    'Imipenem',
    'Levofloxacin',
    'Meropenem',
    'Metronidazole',
    'Nitrofurantoin',
    'Ofloxacin',
    'Penicillin',
    'Piperacillin-Tazobactam',
    'Tetracycline',
    'Vancomycin',
  ];
}

/**
 * Get common parasites for parasitology
 */
export function getCommonParasites(): string[] {
  return [
    'Plasmodium falciparum',
    'Plasmodium vivax',
    'Plasmodium malariae',
    'Plasmodium ovale',
    'Entamoeba histolytica',
    'Giardia lamblia',
    'Ascaris lumbricoides',
    'Hookworm (Ancylostoma/Necator)',
    'Trichuris trichiura',
    'Strongyloides stercoralis',
    'Enterobius vermicularis',
    'Taenia species',
    'Schistosoma haematobium',
    'Schistosoma mansoni',
    'Trichomonas vaginalis',
    'Cryptosporidium species',
    'Microfilaria',
  ];
}

/**
 * Create empty structured result for a template type
 */
export function createEmptyStructuredResult(
  templateType: ResultTemplateType,
): StructuredResult {
  const base = { templateType, version: 1 };

  switch (templateType) {
    case 'numeric_table':
      return { ...base, templateType: 'numeric_table', parameters: [] };
    case 'panel_numeric':
      return { ...base, templateType: 'panel_numeric', panels: [] };
    case 'culture_sensitivity':
      return {
        ...base,
        templateType: 'culture_sensitivity',
        specimenInfo: { specimenType: '', specimenQuality: 'Adequate' },
        microscopy: {},
        cultures: [],
        sensitivities: [],
      };
    case 'parasite_report':
      return {
        ...base,
        templateType: 'parasite_report',
        specimenInfo: { specimenType: '', examinationMethods: [] },
        detections: [],
      };
    case 'qualitative_quantitative':
      return {
        ...base,
        templateType: 'qualitative_quantitative',
        qualitativeResult: 'Negative',
      };
    case 'urinalysis_checklist':
      return {
        ...base,
        templateType: 'urinalysis_checklist',
        physical: { color: '', appearance: '' },
        chemical: {},
        microscopy: {},
      };
    case 'narrative_diagnostic':
      return {
        ...base,
        templateType: 'narrative_diagnostic',
        specimen: { type: '', adequacy: 'Adequate' },
        macroscopy: { grossDescription: '' },
        microscopy: { microscopicFindings: '' },
        diagnosis: { finalDiagnosis: '' },
        approval: { approvalStatus: 'Draft' },
      };
    case 'numeric_timing':
      return {
        ...base,
        templateType: 'numeric_timing',
        sampleTiming: { collectionTime: '', fastingStatus: 'Not Applicable' },
        results: [],
      };
    case 'binary_metadata':
      return {
        ...base,
        templateType: 'binary_metadata',
        result: 'Not Detected',
        kitInfo: { kitName: '', lotNumber: '', expiryDate: '' },
        qc: {
          qcPassed: false,
          positiveControl: 'Valid',
          negativeControl: 'Valid',
        },
        traceability: {},
      };
    default:
      return {
        ...base,
        templateType: 'panel_numeric',
        panels: [],
      } as PanelNumericResult;
  }
}

/**
 * Convert a filled structured result into a reusable template payload.
 * This keeps form structure and metadata but clears patient-specific values.
 */
export function sanitizeStructuredResultForTemplate(
  value: StructuredResult,
): StructuredResult {
  switch (value.templateType) {
    case 'numeric_table':
      return {
        ...value,
        parameters: (value.parameters || []).map((param) => ({
          ...param,
          resultValue: null,
          flag: null,
          isAbnormal: false,
          isCritical: false,
        })),
      };

    case 'panel_numeric':
      return {
        ...value,
        panels: (value.panels || []).map((panel) => ({
          ...panel,
          analytes: (panel.analytes || []).map((analyte) => ({
            ...analyte,
            resultValue: null,
            flag: null,
            isAbnormal: false,
          })),
        })),
      };

    case 'culture_sensitivity':
      return {
        ...value,
        microscopy: {},
        cultures: [],
        sensitivities: [],
        cultureResults: (value.cultureResults || []).map((item) => ({
          ...item,
          growth: 'No Growth',
          colonyCount: '',
          identification: '',
        })),
        sensitivityResults: (value.sensitivityResults || []).map(
          (organism) => ({
            ...organism,
            antibiotics: (organism.antibiotics || []).map((antibiotic) => ({
              ...antibiotic,
              result: 'S',
              mic: '',
              zone: '',
            })),
          }),
        ),
        comments: '',
        recommendations: '',
        notes: '',
      };

    case 'parasite_report':
      return {
        ...value,
        detections: [],
        detected: false,
        parasitesFound: (value.parasitesFound || []).map((parasite) => ({
          ...parasite,
          density: 'Not Seen',
          count: undefined,
        })),
        additionalFindings: '',
        otherFindings: '',
        notes: '',
      };

    case 'qualitative_quantitative':
      return {
        ...value,
        qualitativeResult: 'Negative',
        signalCutoff: undefined,
        quantitative: {
          ...value.quantitative,
          titer: '',
          concentration: undefined,
        },
        confirmation: {
          ...value.confirmation,
          result: 'Not Required',
          date: undefined,
        },
        interpretation: '',
        notes: '',
      };

    case 'urinalysis_checklist':
      return {
        ...value,
        collectionTime: undefined,
        physical: {
          ...value.physical,
          color: '',
          appearance: '',
          specificGravity: undefined,
          volume: undefined,
          odor: '',
        },
        chemical: {},
        microscopy: {},
        physicalExamination: {
          ...value.physicalExamination,
          color: '',
          appearance: '',
          specificGravity: undefined,
          volume: undefined,
        },
        chemicalExamination: {},
        microscopicExamination: {},
        interpretation: '',
        comments: '',
      };

    case 'narrative_diagnostic':
      return {
        ...value,
        specimen: value.specimen
          ? {
              ...value.specimen,
              receivedAt: undefined,
            }
          : undefined,
        macroscopy: value.macroscopy
          ? {
              ...value.macroscopy,
              grossDescription: '',
              measurements: '',
              blocksSubmitted: '',
            }
          : undefined,
        microscopy: value.microscopy
          ? {
              ...value.microscopy,
              microscopicFindings: '',
              specialStains: '',
              immunohistochemistry: '',
            }
          : undefined,
        diagnosis: value.diagnosis
          ? {
              ...value.diagnosis,
              finalDiagnosis: '',
              snomedCodes: '',
              tumorStaging: '',
              marginStatus: '',
            }
          : undefined,
        recommendations: '',
        clinicalCorrelation: '',
        approval: value.approval
          ? {
              ...value.approval,
              approvalStatus: 'Draft',
              approvalDate: undefined,
            }
          : undefined,
        clinicalHistory: '',
        microscopicDescription: '',
        specialStainResults: '',
        finalDiagnosis: '',
        comments: '',
        addendum: '',
      };

    case 'numeric_timing':
      return {
        ...value,
        sampleTiming: {
          ...value.sampleTiming,
          collectionTime: '',
          timingNotes: '',
        },
        results: (value.results || []).map((result) => ({
          ...result,
          resultValue: null,
          flag: null,
          isAbnormal: false,
          isCritical: false,
        })),
        interpretation: '',
        notes: '',
      };

    case 'binary_metadata':
      return {
        ...value,
        result: 'Not Detected',
        ctValue: undefined,
        viralLoad: '',
        detected: false,
        qcChecklist: {},
        interpretation: '',
        comments: '',
        notes: '',
      };

    default:
      return createEmptyStructuredResult(value.templateType);
  }
}
