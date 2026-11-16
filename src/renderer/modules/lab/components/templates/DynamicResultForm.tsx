import React, { useMemo } from 'react';
import { AlertCircle, FlaskConical, Info, Beaker } from 'lucide-react';
import {
  ResultTemplateType,
  StructuredResult,
  NumericTableResult,
  PanelNumericResult,
  CultureSensitivityResult,
  ParasiteReportResult,
  QualitativeQuantitativeResult,
  UrinalysisResult,
  NarrativeDiagnosticResult,
  NumericTimingResult,
  BinaryMetadataResult,
  createEmptyStructuredResult,
  LAB_CATEGORIES,
  LabCategoryCode,
} from '../../dtos/lab-templates.dto';

import NumericTableForm from './NumericTableForm';
import CultureSensitivityForm from './CultureSensitivityForm';
import UrinalysisForm from './UrinalysisForm';
import QualitativeQuantitativeForm from './QualitativeQuantitativeForm';
import ParasiteReportForm from './ParasiteReportForm';
import NarrativeDiagnosticForm from './NarrativeDiagnosticForm';
import BinaryMetadataForm from './BinaryMetadataForm';

// =============================================================================
// Types
// =============================================================================

/** Structure for test parameter components */
export interface TestParameterComponent {
  name: string;
  unit: string;
  reference_range: string;
  critical_low?: number;
  critical_high?: number;
}

export interface DynamicResultFormProps {
  /** The template type to render */
  templateType: ResultTemplateType;
  /** Category code (for fallback template determination) */
  categoryCode?: LabCategoryCode;
  /** The structured result value */
  value: StructuredResult | null;
  /** Callback when the value changes */
  onChange: (value: StructuredResult) => void;
  /** Name of the test (used for contextual UI) */
  testName?: string;
  /** Unit of measurement (for numeric forms) */
  unit?: string;
  /** Reference range string (for numeric forms) */
  referenceRange?: string;
  /** Test parameters (for panel tests) - can be flat array or nested structure */
  testParameters?:
    | {
        components: TestParameterComponent[];
      }
    | Array<{
        name: string;
        unit?: string;
        referenceRange?: string;
        criticalLow?: number;
        criticalHigh?: number;
      }>;
  /** Whether the form is read-only */
  readOnly?: boolean;
}

// =============================================================================
// Category-Specific Default Parameters
// =============================================================================

/**
 * Get default parameters for a category when no specific test parameters are provided
 */
function getCategoryDefaultParameters(
  categoryCode?: LabCategoryCode,
  testName?: string,
): TestParameterComponent[] {
  // Check test name for specific panels
  const lowerTestName = (testName || '').toLowerCase();

  // CBC / Full Blood Count
  if (
    lowerTestName.includes('cbc') ||
    lowerTestName.includes('fbc') ||
    lowerTestName.includes('full blood count') ||
    lowerTestName.includes('complete blood count')
  ) {
    return [
      {
        name: 'WBC (White Blood Cells)',
        unit: 'x10^9/L',
        reference_range: '4.0-11.0',
        critical_low: 2.0,
        critical_high: 30.0,
      },
      {
        name: 'RBC (Red Blood Cells)',
        unit: 'x10^12/L',
        reference_range: '4.5-5.5 (M), 4.0-5.0 (F)',
      },
      {
        name: 'Hemoglobin (Hb)',
        unit: 'g/dL',
        reference_range: '13.5-17.5 (M), 12.0-16.0 (F)',
        critical_low: 7.0,
        critical_high: 20.0,
      },
      {
        name: 'Hematocrit (HCT)',
        unit: '%',
        reference_range: '40-54 (M), 36-48 (F)',
      },
      { name: 'MCV', unit: 'fL', reference_range: '80-100' },
      { name: 'MCH', unit: 'pg', reference_range: '27-33' },
      { name: 'MCHC', unit: 'g/dL', reference_range: '32-36' },
      { name: 'RDW', unit: '%', reference_range: '11.5-14.5' },
      {
        name: 'Platelet Count',
        unit: 'x10^9/L',
        reference_range: '150-400',
        critical_low: 50,
        critical_high: 1000,
      },
      { name: 'Neutrophils', unit: '%', reference_range: '40-70' },
      { name: 'Lymphocytes', unit: '%', reference_range: '20-40' },
      { name: 'Monocytes', unit: '%', reference_range: '2-8' },
      { name: 'Eosinophils', unit: '%', reference_range: '1-4' },
      { name: 'Basophils', unit: '%', reference_range: '0-1' },
    ];
  }

  // Liver Function Tests
  if (
    lowerTestName.includes('lft') ||
    lowerTestName.includes('liver function') ||
    lowerTestName.includes('hepatic panel')
  ) {
    return [
      { name: 'Total Bilirubin', unit: 'mg/dL', reference_range: '0.1-1.2' },
      { name: 'Direct Bilirubin', unit: 'mg/dL', reference_range: '0.0-0.3' },
      { name: 'AST (SGOT)', unit: 'U/L', reference_range: '10-40' },
      { name: 'ALT (SGPT)', unit: 'U/L', reference_range: '7-56' },
      {
        name: 'ALP (Alkaline Phosphatase)',
        unit: 'U/L',
        reference_range: '44-147',
      },
      { name: 'GGT', unit: 'U/L', reference_range: '9-48' },
      { name: 'Total Protein', unit: 'g/dL', reference_range: '6.0-8.3' },
      { name: 'Albumin', unit: 'g/dL', reference_range: '3.5-5.0' },
      { name: 'Globulin', unit: 'g/dL', reference_range: '2.3-3.5' },
    ];
  }

  // Renal Function Tests
  if (
    lowerTestName.includes('rft') ||
    lowerTestName.includes('renal function') ||
    lowerTestName.includes('kidney function') ||
    lowerTestName.includes('urea') ||
    lowerTestName.includes('creatinine')
  ) {
    return [
      { name: 'Urea', unit: 'mg/dL', reference_range: '7-20' },
      { name: 'BUN', unit: 'mg/dL', reference_range: '7-20' },
      {
        name: 'Creatinine',
        unit: 'mg/dL',
        reference_range: '0.7-1.3 (M), 0.6-1.1 (F)',
        critical_high: 10.0,
      },
      { name: 'eGFR', unit: 'mL/min/1.73m²', reference_range: '>90' },
      {
        name: 'Uric Acid',
        unit: 'mg/dL',
        reference_range: '3.5-7.2 (M), 2.5-6.2 (F)',
      },
    ];
  }

  // Lipid Panel
  if (
    lowerTestName.includes('lipid') ||
    lowerTestName.includes('cholesterol')
  ) {
    return [
      {
        name: 'Total Cholesterol',
        unit: 'mg/dL',
        reference_range: '<200 desirable',
      },
      {
        name: 'Triglycerides',
        unit: 'mg/dL',
        reference_range: '<150 desirable',
      },
      {
        name: 'HDL Cholesterol',
        unit: 'mg/dL',
        reference_range: '>40 (M), >50 (F)',
      },
      {
        name: 'LDL Cholesterol',
        unit: 'mg/dL',
        reference_range: '<100 optimal',
      },
      { name: 'VLDL Cholesterol', unit: 'mg/dL', reference_range: '5-40' },
      {
        name: 'Total Cholesterol/HDL Ratio',
        unit: '',
        reference_range: '<5.0',
      },
    ];
  }

  // Electrolytes
  if (
    lowerTestName.includes('electrolyte') ||
    lowerTestName.includes('e/u/c') ||
    lowerTestName.includes('euc')
  ) {
    return [
      {
        name: 'Sodium (Na+)',
        unit: 'mEq/L',
        reference_range: '136-145',
        critical_low: 120,
        critical_high: 160,
      },
      {
        name: 'Potassium (K+)',
        unit: 'mEq/L',
        reference_range: '3.5-5.0',
        critical_low: 2.5,
        critical_high: 6.5,
      },
      { name: 'Chloride (Cl-)', unit: 'mEq/L', reference_range: '98-106' },
      { name: 'Bicarbonate (HCO3-)', unit: 'mEq/L', reference_range: '22-29' },
      { name: 'Urea', unit: 'mg/dL', reference_range: '7-20' },
      { name: 'Creatinine', unit: 'mg/dL', reference_range: '0.7-1.3' },
    ];
  }

  // Thyroid Function
  if (
    lowerTestName.includes('thyroid') ||
    lowerTestName.includes('tft') ||
    lowerTestName.includes('t3') ||
    lowerTestName.includes('t4') ||
    lowerTestName.includes('tsh')
  ) {
    return [
      { name: 'TSH', unit: 'mIU/L', reference_range: '0.4-4.0' },
      { name: 'Free T4 (FT4)', unit: 'ng/dL', reference_range: '0.8-1.8' },
      { name: 'Free T3 (FT3)', unit: 'pg/mL', reference_range: '2.3-4.2' },
      { name: 'Total T4', unit: 'μg/dL', reference_range: '4.5-12.5' },
      { name: 'Total T3', unit: 'ng/dL', reference_range: '80-200' },
    ];
  }

  // Coagulation
  if (
    lowerTestName.includes('coag') ||
    lowerTestName.includes('pt') ||
    lowerTestName.includes('inr') ||
    lowerTestName.includes('aptt') ||
    lowerTestName.includes('clotting')
  ) {
    return [
      {
        name: 'PT (Prothrombin Time)',
        unit: 'seconds',
        reference_range: '11-13.5',
      },
      { name: 'INR', unit: '', reference_range: '0.9-1.1' },
      { name: 'APTT', unit: 'seconds', reference_range: '25-35' },
      { name: 'Fibrinogen', unit: 'mg/dL', reference_range: '200-400' },
      { name: 'D-Dimer', unit: 'ng/mL', reference_range: '<500' },
    ];
  }

  // Glucose tests
  if (
    lowerTestName.includes('glucose') ||
    lowerTestName.includes('sugar') ||
    lowerTestName.includes('fbs') ||
    lowerTestName.includes('rbs')
  ) {
    return [
      {
        name: 'Blood Glucose',
        unit: 'mg/dL',
        reference_range: '70-100 (Fasting), <140 (Random)',
        critical_low: 40,
        critical_high: 500,
      },
    ];
  }

  // Cardiac markers
  if (
    lowerTestName.includes('cardiac') ||
    lowerTestName.includes('troponin') ||
    lowerTestName.includes('ck-mb') ||
    lowerTestName.includes('bnp')
  ) {
    return [
      {
        name: 'Troponin I',
        unit: 'ng/mL',
        reference_range: '<0.04',
        critical_high: 0.1,
      },
      { name: 'CK-MB', unit: 'U/L', reference_range: '<25' },
      { name: 'BNP', unit: 'pg/mL', reference_range: '<100' },
      { name: 'Myoglobin', unit: 'ng/mL', reference_range: '<90' },
    ];
  }

  // HbA1c
  if (
    lowerTestName.includes('hba1c') ||
    lowerTestName.includes('glycated') ||
    lowerTestName.includes('glycosylated')
  ) {
    return [
      {
        name: 'HbA1c',
        unit: '%',
        reference_range: '<5.7 Normal, 5.7-6.4 Prediabetes, ≥6.5 Diabetes',
      },
      { name: 'Estimated Average Glucose', unit: 'mg/dL', reference_range: '' },
    ];
  }

  // Based on category if no specific test match
  if (categoryCode === 'HEMATOLOGY') {
    return [
      { name: 'Parameter 1', unit: '', reference_range: '' },
      { name: 'Parameter 2', unit: '', reference_range: '' },
    ];
  }

  if (categoryCode === 'CLINICAL_CHEMISTRY') {
    return [{ name: 'Analyte', unit: '', reference_range: '' }];
  }

  if (categoryCode === 'COAGULATION') {
    return [
      {
        name: 'PT (Prothrombin Time)',
        unit: 'seconds',
        reference_range: '11-13.5',
      },
      { name: 'INR', unit: '', reference_range: '0.9-1.1' },
      { name: 'APTT', unit: 'seconds', reference_range: '25-35' },
    ];
  }

  if (categoryCode === 'ENDOCRINOLOGY') {
    return [{ name: 'Hormone Level', unit: '', reference_range: '' }];
  }

  // Empty default
  return [];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize test parameters to the expected format for NumericTableForm
 */
function normalizeTestParameters(
  testParameters: DynamicResultFormProps['testParameters'],
): { components: TestParameterComponent[] } | undefined {
  if (!testParameters) return undefined;

  // Already in correct format
  if (
    'components' in testParameters &&
    Array.isArray(testParameters.components)
  ) {
    return testParameters as { components: TestParameterComponent[] };
  }

  // Convert flat array to nested format
  if (Array.isArray(testParameters)) {
    return {
      components: testParameters.map((p) => ({
        name: p.name,
        unit: p.unit || '',
        reference_range: p.referenceRange || '',
        critical_low: p.criticalLow,
        critical_high: p.criticalHigh,
      })),
    };
  }

  return undefined;
}

function ensureTemplateType(
  templateType: ResultTemplateType | undefined,
  categoryCode?: LabCategoryCode,
): ResultTemplateType {
  if (templateType) return templateType;

  // Fallback based on category
  if (categoryCode && LAB_CATEGORIES[categoryCode]) {
    return LAB_CATEGORIES[categoryCode].resultTemplateType;
  }

  // Default fallback
  return 'numeric_table';
}

function ensureResultValue(
  value: StructuredResult | null | undefined,
  templateType: ResultTemplateType,
): StructuredResult {
  if (value) return value;
  return createEmptyStructuredResult(templateType);
}

/**
 * Convert PanelNumericResult to NumericTableResult format for the form
 */
function convertPanelToNumericTable(
  panel: PanelNumericResult,
): NumericTableResult {
  // Flatten all analytes from all panels into parameters
  const parameters =
    panel.panels?.flatMap((group, groupIdx) =>
      group.analytes.map((analyte, analyteIdx) => ({
        id: analyte.id || `${groupIdx}-${analyteIdx}`,
        parameter: `${group.groupName}: ${analyte.analyte}`,
        resultValue: analyte.resultValue,
        unit: analyte.unit,
        referenceRange: analyte.referenceRange,
        flag: analyte.flag,
        isAbnormal: analyte.isAbnormal,
        isCritical: false,
      })),
    ) || [];

  return {
    templateType: 'numeric_table',
    version: panel.version || 1,
    completedAt: panel.completedAt,
    parameters,
    morphologyComments: panel.interpretationNote,
  };
}

/**
 * Convert NumericTableResult back to PanelNumericResult format
 * This also handles newly added parameters by creating an "Additional" panel group
 */
function convertNumericTableToPanel(
  table: NumericTableResult,
  original: PanelNumericResult,
): PanelNumericResult {
  // Track which parameters were matched to original panels
  const matchedParamIds = new Set<string>();

  // Update existing panels with their matched values
  const updatedPanels =
    original.panels?.map((group) => ({
      ...group,
      analytes: group.analytes.map((analyte) => {
        const matchingParam = table.parameters.find(
          (p) =>
            p.parameter === `${group.groupName}: ${analyte.analyte}` ||
            p.parameter === analyte.analyte,
        );
        if (matchingParam) {
          matchedParamIds.add(matchingParam.id);
        }
        return matchingParam
          ? {
              ...analyte,
              resultValue: matchingParam.resultValue,
              unit: matchingParam.unit,
              referenceRange: matchingParam.referenceRange,
              flag: matchingParam.flag,
              isAbnormal: matchingParam.isAbnormal,
            }
          : analyte;
      }),
    })) || [];

  // Find newly added parameters (those not matched to original structure)
  const newParameters = table.parameters.filter(
    (p) => !matchedParamIds.has(p.id),
  );

  // If there are new parameters, add them as an "Additional Parameters" group
  if (newParameters.length > 0) {
    const additionalGroup = {
      groupName: 'Additional Parameters',
      analytes: newParameters.map((p) => ({
        id: p.id,
        analyte: p.parameter,
        resultValue: p.resultValue,
        unit: p.unit,
        referenceRange: p.referenceRange,
        flag: p.flag,
        isAbnormal: p.isAbnormal,
      })),
    };
    updatedPanels.push(additionalGroup);
  }

  return {
    ...original,
    panels: updatedPanels,
    interpretationNote: table.morphologyComments,
  };
}

/**
 * Convert NumericTimingResult to NumericTableResult format for the form
 */
function convertTimingToNumericTable(
  timing: NumericTimingResult,
): NumericTableResult {
  return {
    templateType: 'numeric_table',
    version: timing.version || 1,
    completedAt: timing.completedAt,
    parameters: timing.results || [],
    morphologyComments: timing.interpretation,
  };
}

/**
 * Convert NumericTableResult back to NumericTimingResult format
 */
function convertNumericTableToTiming(
  table: NumericTableResult,
  original: NumericTimingResult,
): NumericTimingResult {
  return {
    ...original,
    results: table.parameters,
    interpretation: table.morphologyComments,
  };
}

// =============================================================================
// Component
// =============================================================================

export default function DynamicResultForm({
  templateType: rawTemplateType,
  categoryCode,
  value: rawValue,
  onChange,
  testName,
  unit,
  referenceRange,
  testParameters,
  readOnly = false,
}: DynamicResultFormProps) {
  const templateType = ensureTemplateType(rawTemplateType, categoryCode);
  const value = useMemo(
    () => ensureResultValue(rawValue, templateType),
    [rawValue, templateType],
  );

  // Get category info for display
  const categoryInfo = categoryCode ? LAB_CATEGORIES[categoryCode] : null;

  // Normalize test parameters for numeric forms - use category defaults if not provided
  const normalizedParams = useMemo(() => {
    const provided = normalizeTestParameters(testParameters);

    // If parameters provided, use them
    if (provided && provided.components.length > 0) {
      return provided;
    }

    // Otherwise, get defaults based on test name or category
    const defaults = getCategoryDefaultParameters(categoryCode, testName);
    if (defaults.length > 0) {
      return { components: defaults };
    }

    return provided;
  }, [testParameters, categoryCode, testName]);

  // Get field descriptions for the current template
  const templateFieldInfo = useMemo(() => {
    switch (templateType) {
      case 'numeric_table':
        return {
          description:
            'Enter numeric values for each parameter with units and reference ranges',
          fields: [
            'Parameter Name',
            'Result Value',
            'Unit',
            'Reference Range',
            'Flag (Auto-calculated)',
          ],
        };
      case 'panel_numeric':
        return {
          description: 'Multi-panel test results grouped by analyte category',
          fields: [
            'Panel Group',
            'Analyte',
            'Result Value',
            'Unit',
            'Reference Range',
          ],
        };
      case 'culture_sensitivity':
        return {
          description:
            'Microbiology culture with organism identification and antibiotic sensitivity',
          fields: [
            'Specimen Info',
            'Microscopy',
            'Organism Isolated',
            'Colony Count',
            'Antibiotic Sensitivity (S/I/R)',
          ],
        };
      case 'parasite_report':
        return {
          description:
            'Detection and quantification of parasites in blood/stool specimens',
          fields: [
            'Specimen Type',
            'Examination Method',
            'Parasite Species',
            'Density/Count',
            'Stage',
          ],
        };
      case 'qualitative_quantitative':
        return {
          description:
            'Qualitative (Positive/Negative) with optional quantitative value',
          fields: [
            'Qualitative Result',
            'Quantitative Value (if applicable)',
            'Method',
            'Cutoff Value',
          ],
        };
      case 'urinalysis_checklist':
        return {
          description:
            'Comprehensive urinalysis with physical, chemical, and microscopic findings',
          fields: [
            'Physical (Color, Appearance, SG)',
            'Chemical (pH, Protein, Glucose, etc.)',
            'Microscopy (RBC, WBC, Casts, Crystals)',
          ],
        };
      case 'narrative_diagnostic':
        return {
          description:
            'Histopathology/Cytology with macroscopic and microscopic descriptions',
          fields: [
            'Specimen Adequacy',
            'Gross Description',
            'Microscopic Findings',
            'Diagnosis',
            'ICD-10 Code',
          ],
        };
      case 'numeric_timing':
        return {
          description: 'Time-based serial measurements (e.g., OGTT)',
          fields: [
            'Collection Time',
            'Fasting Status',
            'Result at Each Timepoint',
          ],
        };
      case 'binary_metadata':
        return {
          description:
            'Binary result (Detected/Not Detected) with test kit and QC information',
          fields: ['Result', 'Kit Name', 'Lot Number', 'Expiry', 'QC Status'],
        };
      default:
        return { description: '', fields: [] };
    }
  }, [templateType]);

  // Render the appropriate form based on template type
  const renderForm = () => {
    switch (templateType) {
      case 'numeric_table':
        return (
          <NumericTableForm
            value={value as NumericTableResult}
            onChange={onChange}
            testParameters={normalizedParams}
            readOnly={readOnly}
          />
        );

      case 'panel_numeric':
        // Panel numeric - convert to NumericTableResult format for the form
        // The form will handle the panel structure internally
        return (
          <NumericTableForm
            value={convertPanelToNumericTable(value as PanelNumericResult)}
            onChange={(v) =>
              onChange(
                convertNumericTableToPanel(v, value as PanelNumericResult),
              )
            }
            testParameters={normalizedParams}
            readOnly={readOnly}
          />
        );

      case 'culture_sensitivity':
        return (
          <CultureSensitivityForm
            value={value as CultureSensitivityResult}
            onChange={onChange}
            readOnly={readOnly}
          />
        );

      case 'parasite_report':
        return (
          <ParasiteReportForm
            value={value as ParasiteReportResult}
            onChange={onChange}
            testName={testName}
            readOnly={readOnly}
          />
        );

      case 'qualitative_quantitative':
        return (
          <QualitativeQuantitativeForm
            value={value as QualitativeQuantitativeResult}
            onChange={onChange}
            testName={testName}
            readOnly={readOnly}
          />
        );

      case 'urinalysis_checklist':
        return (
          <UrinalysisForm
            value={value as UrinalysisResult}
            onChange={onChange}
            readOnly={readOnly}
          />
        );

      case 'narrative_diagnostic':
        return (
          <NarrativeDiagnosticForm
            value={value as NarrativeDiagnosticResult}
            onChange={onChange}
            testName={testName}
            readOnly={readOnly}
          />
        );

      case 'numeric_timing':
        // Numeric timing - convert to NumericTableResult format for the form
        return (
          <NumericTableForm
            value={convertTimingToNumericTable(value as NumericTimingResult)}
            onChange={(v) =>
              onChange(
                convertNumericTableToTiming(v, value as NumericTimingResult),
              )
            }
            testParameters={normalizedParams}
            readOnly={readOnly}
          />
        );

      case 'binary_metadata':
        return (
          <BinaryMetadataForm
            value={value as BinaryMetadataResult}
            onChange={onChange}
            testName={testName}
            readOnly={readOnly}
          />
        );

      default:
        return (
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-800">
                  Unknown Template Type
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Template type "{templateType}" is not supported. Please
                  contact support.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Category & Template Info Banner */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 overflow-hidden">
        {/* Header with Category Badge */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${categoryInfo?.bgColor || 'bg-gray-100'}`}
            >
              <Beaker
                className={`h-5 w-5 ${categoryInfo?.color || 'text-gray-600'}`}
              />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">
                {testName || 'Lab Test'}
              </h4>
              <p className="text-xs text-gray-500">
                {getTemplateTypeLabel(templateType)} Form
              </p>
            </div>
          </div>
          {categoryInfo && (
            <span
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${categoryInfo.bgColor} ${categoryInfo.color}`}
            >
              {categoryInfo.displayName}
            </span>
          )}
        </div>

        {/* Template Field Info */}
        <div className="px-4 py-3 bg-white/50">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                {templateFieldInfo.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {templateFieldInfo.fields.map((field, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-600"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Form */}
      {renderForm()}
    </div>
  );
}

// =============================================================================
// Helper: Template Type Labels
// =============================================================================

function getTemplateTypeLabel(templateType: ResultTemplateType): string {
  const labels: Record<ResultTemplateType, string> = {
    numeric_table: 'Numeric Table',
    panel_numeric: 'Panel Numeric',
    culture_sensitivity: 'Culture & Sensitivity',
    parasite_report: 'Parasite Report',
    qualitative_quantitative: 'Qualitative/Quantitative',
    urinalysis_checklist: 'Urinalysis Checklist',
    narrative_diagnostic: 'Narrative Diagnostic',
    numeric_timing: 'Numeric with Timing',
    binary_metadata: 'Binary with Metadata',
  };
  return labels[templateType] || templateType;
}

// =============================================================================
// Export Template Info for External Use
// =============================================================================

export { getTemplateTypeLabel };
