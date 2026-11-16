/**
 * =============================================================================
 * XENOCARE EMR - COMPREHENSIVE URINALYSIS DIPSTICK RESULT FORM
 * =============================================================================
 *
 * Production-grade urinalysis dipstick form supporting:
 * - Multiple dipstick types (N10, N11, N13, N14, Pediatric, Diabetic, Renal, etc.)
 * - Parameter-driven dynamic visibility
 * - Full clinical parameter coverage (17+ analytes)
 * - Semi-quantitative and numeric values
 * - Reference ranges and abnormal flagging
 * - Physical, chemical, and microscopic examination
 * - Clean hospital-grade UI optimized for high-volume labs
 *
 * Compatible with existing database schema and backward-compatible
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Droplets,
  FlaskConical,
  Microscope,
  ClipboardList,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Beaker,
  Activity,
  Heart,
  Pill,
  Eye,
} from 'lucide-react';
import { Button, Input, Textarea } from '../../../../components/ui';
import { UrinalysisResult } from '../../dtos/lab-templates.dto';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface UrinalysisFormProps {
  value: UrinalysisResult;
  onChange: (value: UrinalysisResult) => void;
  readOnly?: boolean;
}

// Dipstick Panel Types - determines which parameters are visible
type DipstickPanelType =
  | 'complete' // Full urinalysis (all parameters)
  // Single parameter strips
  | 'single_glucose' // Glucose only
  | 'single_protein' // Protein only
  | 'single_ketone' // Ketone only
  // Multi-parameter strips (2-9)
  | 'param_2' // 2-parameter (GLU, PRO)
  | 'param_3' // 3-parameter (GLU, PRO, pH)
  | 'param_5' // 5-parameter
  | 'param_7' // 7-parameter
  | 'param_9' // 9-parameter
  // Standard full strips (10-14)
  | 'standard_10' // Standard 10-parameter dipstick
  | 'standard_11' // 11-parameter with ascorbic acid
  | 'extended_13' // 13-parameter with microalbumin/creatinine
  | 'extended_14' // 14-parameter full panel
  // Specialized clinical panels
  | 'pediatric' // Pediatric panel
  | 'diabetic' // Diabetic monitoring
  | 'renal' // Renal screening (includes ACR)
  | 'liver' // Liver function screening
  | 'infection' // Infection-focused
  | 'microalbuminuria' // Microalbumin screening
  | 'pregnancy' // Pregnancy screening
  | 'dipstick_only'; // Chemical only, no microscopy

// Parameter status for flagging
type ParameterStatus = 'normal' | 'abnormal' | 'critical';

// Extended chemical parameters (backward compatible)
interface ExtendedChemicalParams {
  // Standard dipstick parameters
  ph?: number;
  protein?: string;
  glucose?: string;
  ketones?: string;
  blood?: string;
  bilirubin?: string;
  urobilinogen?: string;
  nitrite?: string;
  leukocyteEsterase?: string;
  // Extended parameters
  ascorbicAcid?: string;
  microalbumin?: string;
  creatinine?: string;
  albumin_creatinine_ratio?: number;
  calcium?: string;
}

// =============================================================================
// CONSTANTS - DIPSTICK PANEL CONFIGURATIONS
// =============================================================================

const DIPSTICK_PANELS: Record<
  DipstickPanelType,
  {
    label: string;
    description: string;
    parameters: string[];
    showMicroscopy: boolean;
    showPhysical: boolean;
  }
> = {
  complete: {
    label: 'Complete Urinalysis',
    description:
      'Full panel with physical, chemical, and microscopic examination',
    parameters: [
      'ph',
      'protein',
      'glucose',
      'ketones',
      'blood',
      'bilirubin',
      'urobilinogen',
      'nitrite',
      'leukocyteEsterase',
      'ascorbicAcid',
      'microalbumin',
      'creatinine',
      'calcium',
    ],
    showMicroscopy: true,
    showPhysical: true,
  },
  // ===== SINGLE PARAMETER STRIPS =====
  single_glucose: {
    label: '1-Parameter (Glucose Only)',
    description: 'Single glucose test strip',
    parameters: ['glucose'],
    showMicroscopy: false,
    showPhysical: false,
  },
  single_protein: {
    label: '1-Parameter (Protein Only)',
    description: 'Single protein test strip',
    parameters: ['protein'],
    showMicroscopy: false,
    showPhysical: false,
  },
  single_ketone: {
    label: '1-Parameter (Ketone Only)',
    description: 'Single ketone test strip',
    parameters: ['ketones'],
    showMicroscopy: false,
    showPhysical: false,
  },
  // ===== MULTI-PARAMETER STRIPS (2-9) =====
  param_2: {
    label: '2-Parameter Strip',
    description: 'Glucose + Protein',
    parameters: ['glucose', 'protein'],
    showMicroscopy: false,
    showPhysical: false,
  },
  param_3: {
    label: '3-Parameter Strip',
    description: 'Glucose, Protein, pH',
    parameters: ['glucose', 'protein', 'ph'],
    showMicroscopy: false,
    showPhysical: false,
  },
  param_5: {
    label: '5-Parameter Strip',
    description: 'Glucose, Protein, pH, Blood, Ketones',
    parameters: ['glucose', 'protein', 'ph', 'blood', 'ketones'],
    showMicroscopy: false,
    showPhysical: false,
  },
  param_7: {
    label: '7-Parameter Strip',
    description: 'Glucose, Protein, pH, Blood, Ketones, Nitrite, Leukocytes',
    parameters: [
      'glucose',
      'protein',
      'ph',
      'blood',
      'ketones',
      'nitrite',
      'leukocyteEsterase',
    ],
    showMicroscopy: false,
    showPhysical: false,
  },
  param_9: {
    label: '9-Parameter Strip',
    description: 'Adds Bilirubin, Urobilinogen',
    parameters: [
      'glucose',
      'protein',
      'ph',
      'blood',
      'ketones',
      'nitrite',
      'leukocyteEsterase',
      'bilirubin',
      'urobilinogen',
    ],
    showMicroscopy: false,
    showPhysical: false,
  },
  // ===== STANDARD FULL STRIPS (10-14) =====
  standard_10: {
    label: 'Standard 10-Parameter (Combi N10)',
    description:
      'Standard dipstick: Leukocytes, Nitrite, Urobilinogen, Protein, pH, Blood, SG, Ketones, Bilirubin, Glucose',
    parameters: [
      'leukocyteEsterase',
      'nitrite',
      'urobilinogen',
      'protein',
      'ph',
      'blood',
      'ketones',
      'bilirubin',
      'glucose',
    ],
    showMicroscopy: false,
    showPhysical: true,
  },
  standard_11: {
    label: 'Standard 11-Parameter (Combi N11)',
    description: 'With Ascorbic Acid interference detection',
    parameters: [
      'leukocyteEsterase',
      'nitrite',
      'urobilinogen',
      'protein',
      'ph',
      'blood',
      'ketones',
      'bilirubin',
      'glucose',
      'ascorbicAcid',
    ],
    showMicroscopy: false,
    showPhysical: true,
  },
  extended_13: {
    label: 'Extended 13-Parameter (Combi N13)',
    description: 'Includes Microalbumin and Creatinine for ACR',
    parameters: [
      'leukocyteEsterase',
      'nitrite',
      'urobilinogen',
      'protein',
      'ph',
      'blood',
      'ketones',
      'bilirubin',
      'glucose',
      'ascorbicAcid',
      'microalbumin',
      'creatinine',
    ],
    showMicroscopy: false,
    showPhysical: true,
  },
  extended_14: {
    label: 'Extended 14-Parameter (Combi N14)',
    description: 'Full extended panel including Calcium',
    parameters: [
      'leukocyteEsterase',
      'nitrite',
      'urobilinogen',
      'protein',
      'ph',
      'blood',
      'ketones',
      'bilirubin',
      'glucose',
      'ascorbicAcid',
      'microalbumin',
      'creatinine',
      'calcium',
    ],
    showMicroscopy: false,
    showPhysical: true,
  },
  pediatric: {
    label: 'Pediatric Panel',
    description: 'Child-appropriate urinalysis parameters',
    parameters: [
      'leukocyteEsterase',
      'nitrite',
      'protein',
      'ph',
      'blood',
      'glucose',
    ],
    showMicroscopy: true,
    showPhysical: true,
  },
  diabetic: {
    label: 'Diabetic Monitoring',
    description: 'Focus on glucose, ketones, microalbumin',
    parameters: [
      'glucose',
      'ketones',
      'protein',
      'microalbumin',
      'creatinine',
      'ph',
    ],
    showMicroscopy: false,
    showPhysical: true,
  },
  renal: {
    label: 'Renal Screening',
    description: 'Kidney function assessment with ACR',
    parameters: [
      'protein',
      'blood',
      'microalbumin',
      'creatinine',
      'ph',
      'leukocyteEsterase',
      'nitrite',
    ],
    showMicroscopy: true,
    showPhysical: true,
  },
  liver: {
    label: 'Liver Function Screening',
    description: 'Hepatobiliary markers in urine',
    parameters: ['bilirubin', 'urobilinogen', 'protein', 'ph', 'blood'],
    showMicroscopy: false,
    showPhysical: true,
  },
  infection: {
    label: 'Infection Panel (UTI)',
    description: 'Urinary tract infection screening',
    parameters: ['leukocyteEsterase', 'nitrite', 'blood', 'protein', 'ph'],
    showMicroscopy: true,
    showPhysical: true,
  },
  microalbuminuria: {
    label: 'Microalbuminuria Screening',
    description: 'Early kidney damage detection',
    parameters: ['microalbumin', 'creatinine', 'protein'],
    showMicroscopy: false,
    showPhysical: false,
  },
  pregnancy: {
    label: 'Pregnancy Screening',
    description: 'Prenatal urinalysis panel',
    parameters: [
      'protein',
      'glucose',
      'leukocyteEsterase',
      'nitrite',
      'ketones',
      'blood',
      'ph',
    ],
    showMicroscopy: true,
    showPhysical: true,
  },
  dipstick_only: {
    label: 'Dipstick Only (Chemical)',
    description: 'Chemical analysis only, no microscopy',
    parameters: [
      'leukocyteEsterase',
      'nitrite',
      'urobilinogen',
      'protein',
      'ph',
      'blood',
      'ketones',
      'bilirubin',
      'glucose',
    ],
    showMicroscopy: false,
    showPhysical: true,
  },
};

// =============================================================================
// PARAMETER DEFINITIONS WITH REFERENCE RANGES
// =============================================================================

interface ParameterDefinition {
  key: string;
  label: string;
  shortLabel: string;
  unit?: string;
  type: 'semiquantitative' | 'numeric' | 'select';
  options?: string[];
  numericRange?: { min: number; max: number; step: number };
  referenceRange: string;
  normalValues: string[];
  abnormalValues?: string[];
  criticalValues?: string[];
  category: 'infection' | 'renal' | 'metabolic' | 'liver' | 'physical';
  clinicalSignificance: string;
}

const PARAMETER_DEFINITIONS: Record<string, ParameterDefinition> = {
  // INFECTION INDICATORS
  leukocyteEsterase: {
    key: 'leukocyteEsterase',
    label: 'Leukocyte Esterase',
    shortLabel: 'LEU',
    type: 'semiquantitative',
    options: ['Negative', 'Trace', '+', '++', '+++'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['Trace', '+', '++'],
    criticalValues: ['+++'],
    category: 'infection',
    clinicalSignificance:
      'Indicates presence of white blood cells; suggests UTI',
  },
  nitrite: {
    key: 'nitrite',
    label: 'Nitrite',
    shortLabel: 'NIT',
    type: 'semiquantitative',
    options: ['Negative', 'Positive'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['Positive'],
    category: 'infection',
    clinicalSignificance:
      'Bacterial conversion of nitrate; indicates bacteriuria',
  },

  // RENAL FUNCTION
  protein: {
    key: 'protein',
    label: 'Protein',
    shortLabel: 'PRO',
    type: 'semiquantitative',
    options: ['Negative', 'Trace', '+', '++', '+++', '++++'],
    referenceRange: 'Negative',
    normalValues: ['Negative', 'Trace'],
    abnormalValues: ['+', '++'],
    criticalValues: ['+++', '++++'],
    category: 'renal',
    clinicalSignificance: 'Indicates glomerular or tubular dysfunction',
  },
  blood: {
    key: 'blood',
    label: 'Blood (Hemoglobin/RBC)',
    shortLabel: 'BLD',
    type: 'semiquantitative',
    options: ['Negative', 'Trace', '+', '++', '+++'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['Trace', '+'],
    criticalValues: ['++', '+++'],
    category: 'renal',
    clinicalSignificance: 'Indicates hematuria; renal/urinary tract pathology',
  },
  microalbumin: {
    key: 'microalbumin',
    label: 'Albumin (Microalbumin)',
    shortLabel: 'MAU',
    unit: 'mg/L',
    type: 'semiquantitative',
    options: [
      'Normal (<20)',
      'Low (20-50)',
      'Moderate (50-100)',
      'High (100-200)',
      'Very High (>200)',
    ],
    referenceRange: '<20 mg/L',
    normalValues: ['Normal (<20)'],
    abnormalValues: ['Low (20-50)', 'Moderate (50-100)'],
    criticalValues: ['High (100-200)', 'Very High (>200)'],
    category: 'renal',
    clinicalSignificance:
      'Early marker of diabetic nephropathy and cardiovascular risk',
  },
  creatinine: {
    key: 'creatinine',
    label: 'Creatinine (Urine)',
    shortLabel: 'CRE',
    unit: 'mmol/L',
    type: 'semiquantitative',
    options: ['Low (<3.5)', 'Normal (3.5-26.5)', 'High (>26.5)'],
    referenceRange: '3.5-26.5 mmol/L',
    normalValues: ['Normal (3.5-26.5)'],
    abnormalValues: ['Low (<3.5)', 'High (>26.5)'],
    category: 'renal',
    clinicalSignificance:
      'Used for ACR calculation; reflects urine concentration',
  },
  calcium: {
    key: 'calcium',
    label: 'Calcium',
    shortLabel: 'CA',
    type: 'semiquantitative',
    options: ['Normal', 'Elevated'],
    referenceRange: 'Normal',
    normalValues: ['Normal'],
    abnormalValues: ['Elevated'],
    category: 'renal',
    clinicalSignificance: 'May indicate hypercalciuria; risk of kidney stones',
  },

  // METABOLIC INDICATORS
  glucose: {
    key: 'glucose',
    label: 'Glucose',
    shortLabel: 'GLU',
    type: 'semiquantitative',
    options: ['Negative', 'Trace', '+', '++', '+++', '++++'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['Trace', '+'],
    criticalValues: ['++', '+++', '++++'],
    category: 'metabolic',
    clinicalSignificance:
      'Glucosuria; suggests diabetes mellitus or renal threshold issue',
  },
  ketones: {
    key: 'ketones',
    label: 'Ketones',
    shortLabel: 'KET',
    type: 'semiquantitative',
    options: ['Negative', 'Trace', '+', '++', '+++'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['Trace', '+'],
    criticalValues: ['++', '+++'],
    category: 'metabolic',
    clinicalSignificance:
      'Indicates ketosis; DKA, starvation, or low-carb diet',
  },
  ph: {
    key: 'ph',
    label: 'pH',
    shortLabel: 'pH',
    type: 'numeric',
    numericRange: { min: 4.5, max: 9.0, step: 0.5 },
    referenceRange: '5.0-8.0',
    normalValues: ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'],
    abnormalValues: ['4.5', '8.5', '9.0'],
    category: 'metabolic',
    clinicalSignificance:
      'Acid-base status; diet, infection, or metabolic disorders',
  },
  ascorbicAcid: {
    key: 'ascorbicAcid',
    label: 'Ascorbic Acid (Vitamin C)',
    shortLabel: 'ASC',
    type: 'semiquantitative',
    options: ['Negative', '+', '++', '+++'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['+', '++', '+++'],
    category: 'metabolic',
    clinicalSignificance:
      'High levels may cause false-negative results for glucose, blood',
  },

  // LIVER & HEMOLYSIS MARKERS
  bilirubin: {
    key: 'bilirubin',
    label: 'Bilirubin',
    shortLabel: 'BIL',
    type: 'semiquantitative',
    options: ['Negative', '+', '++', '+++'],
    referenceRange: 'Negative',
    normalValues: ['Negative'],
    abnormalValues: ['+'],
    criticalValues: ['++', '+++'],
    category: 'liver',
    clinicalSignificance:
      'Conjugated bilirubin; indicates hepatobiliary disease',
  },
  urobilinogen: {
    key: 'urobilinogen',
    label: 'Urobilinogen',
    shortLabel: 'URO',
    unit: 'EU/dL',
    type: 'semiquantitative',
    options: ['Normal (0.2-1.0)', 'Elevated (+)', 'Markedly Elevated (++)'],
    referenceRange: '0.2-1.0 EU/dL',
    normalValues: ['Normal (0.2-1.0)'],
    abnormalValues: ['Elevated (+)', 'Markedly Elevated (++)'],
    category: 'liver',
    clinicalSignificance: 'Liver function; hemolysis or hepatocellular damage',
  },

  // PHYSICAL CHARACTERISTICS
  specificGravity: {
    key: 'specificGravity',
    label: 'Specific Gravity',
    shortLabel: 'SG',
    type: 'numeric',
    numericRange: { min: 1.001, max: 1.035, step: 0.001 },
    referenceRange: '1.005-1.030',
    normalValues: [],
    category: 'physical',
    clinicalSignificance: 'Urine concentration; hydration status',
  },
};

// =============================================================================
// URINE PHYSICAL CHARACTERISTICS OPTIONS
// =============================================================================

const URINE_COLORS = [
  { value: 'Colorless', significance: 'Very dilute urine, overhydration' },
  { value: 'Pale Yellow', significance: 'Normal, well-hydrated' },
  { value: 'Yellow', significance: 'Normal' },
  {
    value: 'Dark Yellow',
    significance: 'Concentrated urine, mild dehydration',
  },
  { value: 'Amber', significance: 'Dehydration' },
  { value: 'Orange', significance: 'Bile pigments, medications' },
  { value: 'Pink/Red', significance: 'Blood, hemoglobin, myoglobin, beets' },
  { value: 'Brown', significance: 'Bile pigments, myoglobin, melanin' },
  { value: 'Green', significance: 'Pseudomonas infection, medications' },
  { value: 'Milky/Cloudy', significance: 'Pyuria, chyluria, lipiduria' },
];

const URINE_APPEARANCES = [
  { value: 'Clear', significance: 'Normal' },
  {
    value: 'Slightly Cloudy',
    significance: 'May be normal; minor precipitation',
  },
  { value: 'Cloudy', significance: 'Cells, bacteria, crystals, mucus' },
  { value: 'Turbid', significance: 'Heavy cellular/bacterial content' },
  { value: 'Hazy', significance: 'Minor particles present' },
];

const URINE_ODORS = [
  { value: 'Normal', significance: 'Aromatic, characteristic' },
  { value: 'Ammoniacal', significance: 'Bacterial decomposition, old sample' },
  { value: 'Fruity', significance: 'Ketones (DKA)' },
  { value: 'Foul/Putrid', significance: 'Bacterial infection' },
  { value: 'Sweet', significance: 'Diabetes (glucose)' },
  { value: 'Fishy', significance: 'Trimethylaminuria, bacterial vaginosis' },
];

// Microscopy options
const BACTERIA_LEVELS = ['None Seen', 'Few', 'Moderate', 'Many', 'Loaded'];
const CAST_TYPES = [
  'Hyaline',
  'Granular',
  'Fine Granular',
  'Coarse Granular',
  'RBC',
  'WBC',
  'Epithelial',
  'Waxy',
  'Fatty',
  'Broad',
];
const CRYSTAL_TYPES = [
  // Acidic urine
  'Uric Acid',
  'Calcium Oxalate (Monohydrate)',
  'Calcium Oxalate (Dihydrate)',
  'Amorphous Urates',
  // Alkaline urine
  'Triple Phosphate',
  'Amorphous Phosphates',
  'Calcium Carbonate',
  'Ammonium Biurate',
  // Abnormal
  'Cystine',
  'Tyrosine',
  'Leucine',
  'Cholesterol',
  'Bilirubin',
  'Sulfonamide',
  'Drug Crystals',
];
const CELL_QUANTITY = [
  'None',
  '0-2',
  '2-5',
  '5-10',
  '10-20',
  '20-50',
  '>50',
  'TNTC',
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

// Collapsible Section
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  icon,
  color,
  badge,
  badgeColor = 'bg-gray-100 text-gray-700',
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colorClasses: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-800',
    },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
    },
    teal: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-800',
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm print:break-inside-avoid">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full ${colors.bg} px-4 py-3 border-b ${colors.border} flex items-center justify-between hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-3">
          <span className={colors.text}>{icon}</span>
          <h3 className={`font-semibold ${colors.text}`}>{title}</h3>
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        <span className={`${colors.text} print:hidden`}>
          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </span>
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

// Parameter Input Field with Flagging
const ParameterField: React.FC<{
  definition: ParameterDefinition;
  value: string | number | undefined;
  onChange: (value: string | number | undefined) => void;
  readOnly?: boolean;
  showReferenceRange?: boolean;
}> = ({ definition, value, onChange, readOnly, showReferenceRange = true }) => {
  const getStatus = (): ParameterStatus => {
    if (!value) return 'normal';
    const strValue = String(value);
    if (definition.criticalValues?.includes(strValue)) return 'critical';
    if (definition.abnormalValues?.includes(strValue)) return 'abnormal';
    if (definition.normalValues.includes(strValue)) return 'normal';
    // For numeric pH
    if (definition.key === 'ph') {
      const num = parseFloat(strValue);
      if (num < 5.0 || num > 8.0) return 'abnormal';
    }
    return 'normal';
  };

  const status = getStatus();
  const statusColors = {
    normal: 'border-gray-300 bg-white',
    abnormal: 'border-yellow-400 bg-yellow-50',
    critical: 'border-red-500 bg-red-50 ring-1 ring-red-200',
  };
  const statusTextColors = {
    normal: 'text-green-700',
    abnormal: 'text-yellow-700',
    critical: 'text-red-700 font-bold',
  };
  const statusLabels = {
    normal: '',
    abnormal: 'ABN',
    critical: '⚠️ CRIT',
  };

  if (readOnly) {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-700">
            {definition.label}
          </span>
          {showReferenceRange && (
            <span className="text-xs text-gray-400 ml-2">
              ({definition.referenceRange})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${statusTextColors[status]}`}>
            {value || '—'}
          </span>
          {status !== 'normal' && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
            >
              {statusLabels[status]}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 truncate">
            {definition.label}
          </span>
          {definition.unit && (
            <span className="text-xs text-gray-400">({definition.unit})</span>
          )}
        </div>
        {showReferenceRange && (
          <span className="text-xs text-gray-400">
            Ref: {definition.referenceRange}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2">
        {definition.type === 'semiquantitative' ||
        definition.type === 'select' ? (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors min-w-[140px] ${statusColors[status]}`}
          >
            <option value="">Select</option>
            {definition.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) =>
              onChange(e.target.value ? parseFloat(e.target.value) : undefined)
            }
            step={definition.numericRange?.step}
            min={definition.numericRange?.min}
            max={definition.numericRange?.max}
            className={`text-sm w-24 ${statusColors[status]}`}
            placeholder={definition.referenceRange}
          />
        )}
        {status !== 'normal' && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${status === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
          >
            {statusLabels[status]}
          </span>
        )}
      </div>
    </div>
  );
};

// Color indicator for urine
const ColorSwatch: React.FC<{ color: string }> = ({ color }) => {
  const colorMap: Record<string, string> = {
    Colorless: 'bg-gray-100 border-gray-300',
    'Pale Yellow': 'bg-yellow-100 border-yellow-200',
    Yellow: 'bg-yellow-300 border-yellow-400',
    'Dark Yellow': 'bg-yellow-500 border-yellow-600',
    Amber: 'bg-amber-500 border-amber-600',
    Orange: 'bg-orange-500 border-orange-600',
    'Pink/Red': 'bg-red-400 border-red-500',
    Brown: 'bg-amber-800 border-amber-900',
    Green: 'bg-green-500 border-green-600',
    'Milky/Cloudy': 'bg-gray-300 border-gray-400',
  };
  return (
    <span
      className={`inline-block w-5 h-5 rounded-full border-2 ${colorMap[color] || 'bg-gray-200 border-gray-300'}`}
    />
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function UrinalysisForm({
  value,
  onChange,
  readOnly = false,
}: UrinalysisFormProps) {
  // State for dipstick panel selection
  const [selectedPanel, setSelectedPanel] =
    useState<DipstickPanelType>('complete');

  // Extended state stored in value (backward compatible)
  const extendedData = useMemo(
    () => ({
      dipstickType: (value as any).dipstickType || selectedPanel,
      testMethod: (value as any).testMethod || 'Urine Dipstick Analysis',
      collectionTime: (value as any).collectionTime,
      sampleVolume: (value as any).sampleVolume,
      specimenType: (value as any).specimenType || 'Random',
    }),
    [value, selectedPanel],
  );

  // Safe accessors
  const physical = value.physical || { color: '', appearance: '' };
  const chemical = value.chemical || {};
  const microscopy = value.microscopy || {};

  // Extended chemical with new fields
  const extendedChemical = useMemo(
    () => ({
      ...chemical,
      ascorbicAcid: (chemical as any).ascorbicAcid,
      microalbumin: (chemical as any).microalbumin,
      creatinine: (chemical as any).creatinine,
      calcium: (chemical as any).calcium,
      albumin_creatinine_ratio: (chemical as any).albumin_creatinine_ratio,
    }),
    [chemical],
  );

  // Current panel config
  const panelConfig = DIPSTICK_PANELS[selectedPanel];

  // Check if parameter should be visible
  const isParameterVisible = useCallback(
    (paramKey: string): boolean => {
      return panelConfig.parameters.includes(paramKey);
    },
    [panelConfig],
  );

  // Calculate ACR if microalbumin and creatinine are available
  const calculatedACR = useMemo(() => {
    const microalb = parseFloat(
      String(extendedChemical.microalbumin || '').replace(/[^0-9.]/g, ''),
    );
    const creat = parseFloat(
      String(extendedChemical.creatinine || '').replace(/[^0-9.]/g, ''),
    );
    if (!isNaN(microalb) && !isNaN(creat) && creat > 0) {
      return (microalb / creat).toFixed(1);
    }
    return null;
  }, [extendedChemical.microalbumin, extendedChemical.creatinine]);

  // Count abnormal results
  const abnormalCount = useMemo(() => {
    let count = 0;
    Object.entries(extendedChemical).forEach(([key, val]) => {
      const def = PARAMETER_DEFINITIONS[key];
      if (def && val) {
        const strVal = String(val);
        if (
          def.abnormalValues?.includes(strVal) ||
          def.criticalValues?.includes(strVal)
        ) {
          count++;
        }
      }
    });
    return count;
  }, [extendedChemical]);

  // Update handlers
  const updatePhysical = useCallback(
    <K extends keyof NonNullable<UrinalysisResult['physical']>>(
      field: K,
      fieldValue: any,
    ) => {
      onChange({ ...value, physical: { ...physical, [field]: fieldValue } });
    },
    [value, physical, onChange],
  );

  const updateChemical = useCallback(
    (field: string, fieldValue: any) => {
      onChange({
        ...value,
        chemical: { ...chemical, [field]: fieldValue } as any,
      });
    },
    [value, chemical, onChange],
  );

  const updateMicroscopy = useCallback(
    <K extends keyof NonNullable<UrinalysisResult['microscopy']>>(
      field: K,
      fieldValue: any,
    ) => {
      onChange({
        ...value,
        microscopy: { ...microscopy, [field]: fieldValue },
      });
    },
    [value, microscopy, onChange],
  );

  const updateExtended = useCallback(
    (field: string, fieldValue: any) => {
      onChange({ ...value, [field]: fieldValue });
    },
    [value, onChange],
  );

  // Panel change handler
  const handlePanelChange = (panel: DipstickPanelType) => {
    setSelectedPanel(panel);
    updateExtended('dipstickType', panel);
  };

  return (
    <div className="space-y-5">
      {/* Header with Test Method & Panel Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-4 print:bg-indigo-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <Beaker className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-indigo-900">
                Urinalysis Dipstick Analysis
              </h2>
              <p className="text-sm text-indigo-600">
                Test Method: Reagent Strip / Chemical Analysis
              </p>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                Dipstick Panel:
              </label>
              <select
                value={selectedPanel}
                onChange={(e) =>
                  handlePanelChange(e.target.value as DipstickPanelType)
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
              >
                {Object.entries(DIPSTICK_PANELS).map(([key, panel]) => (
                  <option key={key} value={key}>
                    {panel.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Panel description */}
        <div className="mt-3 flex items-start gap-2 text-sm text-indigo-700 bg-indigo-100/50 rounded-lg p-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{panelConfig.description}</span>
        </div>

        {/* Abnormal count badge */}
        {abnormalCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {abnormalCount} abnormal result{abnormalCount > 1 ? 's' : ''}{' '}
              detected
            </span>
          </div>
        )}
      </div>

      {/* Specimen Information */}
      <CollapsibleSection
        title="Specimen Information"
        icon={<FlaskConical className="h-5 w-5" />}
        color="teal"
        defaultOpen={!readOnly}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Specimen Type
            </label>
            {readOnly ? (
              <span className="text-gray-900">
                {extendedData.specimenType || '—'}
              </span>
            ) : (
              <select
                value={extendedData.specimenType}
                onChange={(e) => updateExtended('specimenType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Random">Random</option>
                <option value="First Morning">First Morning</option>
                <option value="Midstream Clean Catch">
                  Midstream Clean Catch
                </option>
                <option value="24-Hour Collection">24-Hour Collection</option>
                <option value="Catheter">Catheter</option>
                <option value="Suprapubic">Suprapubic Aspiration</option>
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Collection Time
            </label>
            {readOnly ? (
              <span className="text-gray-900">
                {extendedData.collectionTime || '—'}
              </span>
            ) : (
              <Input
                type="datetime-local"
                value={extendedData.collectionTime || ''}
                onChange={(e) =>
                  updateExtended('collectionTime', e.target.value)
                }
                className="text-sm"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Volume (mL)
            </label>
            {readOnly ? (
              <span className="text-gray-900">{physical.volume ?? '—'}</span>
            ) : (
              <Input
                type="number"
                value={physical.volume ?? ''}
                onChange={(e) =>
                  updatePhysical(
                    'volume',
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="Volume"
                className="text-sm"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Dipstick Used
            </label>
            {readOnly ? (
              <span className="text-gray-900">{panelConfig.label}</span>
            ) : (
              <span className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg block">
                {panelConfig.label}
              </span>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Physical Examination */}
      {panelConfig.showPhysical && (
        <CollapsibleSection
          title="Physical Characteristics"
          icon={<Eye className="h-5 w-5" />}
          color="yellow"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Color */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Color
              </label>
              <div className="flex items-center gap-2">
                {physical.color && <ColorSwatch color={physical.color} />}
                {readOnly ? (
                  <span className="text-gray-900">{physical.color || '—'}</span>
                ) : (
                  <select
                    value={physical.color || ''}
                    onChange={(e) => updatePhysical('color', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select</option>
                    {URINE_COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.value}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {physical.color && !readOnly && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  {
                    URINE_COLORS.find((c) => c.value === physical.color)
                      ?.significance
                  }
                </p>
              )}
            </div>

            {/* Appearance */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Appearance / Turbidity
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {physical.appearance || '—'}
                </span>
              ) : (
                <select
                  value={physical.appearance || ''}
                  onChange={(e) => updatePhysical('appearance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {URINE_APPEARANCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.value}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Specific Gravity */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Specific Gravity
              </label>
              {readOnly ? (
                <span className="text-gray-900">
                  {physical.specificGravity ?? '—'}
                </span>
              ) : (
                <Input
                  type="number"
                  step="0.001"
                  min="1.001"
                  max="1.035"
                  value={physical.specificGravity ?? ''}
                  onChange={(e) =>
                    updatePhysical(
                      'specificGravity',
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  placeholder="1.005-1.030"
                  className="text-sm"
                />
              )}
              <span className="text-xs text-gray-400">Ref: 1.005-1.030</span>
            </div>

            {/* Odor */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Odor
              </label>
              {readOnly ? (
                <span className="text-gray-900">{physical.odor || '—'}</span>
              ) : (
                <select
                  value={physical.odor || ''}
                  onChange={(e) => updatePhysical('odor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select</option>
                  {URINE_ODORS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Chemical Examination (Dipstick) - Grouped by Clinical Category */}
      <CollapsibleSection
        title="Chemical Examination (Dipstick Results)"
        icon={<Activity className="h-5 w-5" />}
        color="blue"
        badge={abnormalCount > 0 ? `${abnormalCount} Abnormal` : undefined}
        badgeColor={
          abnormalCount > 0 ? 'bg-amber-100 text-amber-700' : undefined
        }
      >
        <div className="space-y-4">
          {/* Infection Indicators */}
          {(isParameterVisible('leukocyteEsterase') ||
            isParameterVisible('nitrite')) && (
            <div className="border border-red-100 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-3 py-2 border-b border-red-100">
                <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Infection Indicators
                </h4>
              </div>
              <div className="divide-y divide-gray-100">
                {isParameterVisible('leukocyteEsterase') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.leukocyteEsterase}
                    value={extendedChemical.leukocyteEsterase}
                    onChange={(v) => updateChemical('leukocyteEsterase', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('nitrite') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.nitrite}
                    value={extendedChemical.nitrite}
                    onChange={(v) => updateChemical('nitrite', v)}
                    readOnly={readOnly}
                  />
                )}
              </div>
            </div>
          )}

          {/* Renal Function */}
          {(isParameterVisible('protein') ||
            isParameterVisible('blood') ||
            isParameterVisible('microalbumin') ||
            isParameterVisible('creatinine') ||
            isParameterVisible('calcium')) && (
            <div className="border border-blue-100 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Renal Function Markers
                </h4>
              </div>
              <div className="divide-y divide-gray-100">
                {isParameterVisible('protein') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.protein}
                    value={extendedChemical.protein}
                    onChange={(v) => updateChemical('protein', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('blood') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.blood}
                    value={extendedChemical.blood}
                    onChange={(v) => updateChemical('blood', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('microalbumin') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.microalbumin}
                    value={extendedChemical.microalbumin}
                    onChange={(v) => updateChemical('microalbumin', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('creatinine') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.creatinine}
                    value={extendedChemical.creatinine}
                    onChange={(v) => updateChemical('creatinine', v)}
                    readOnly={readOnly}
                  />
                )}
                {/* Calculated ACR */}
                {calculatedACR &&
                  isParameterVisible('microalbumin') &&
                  isParameterVisible('creatinine') && (
                    <div className="flex items-center justify-between py-2.5 px-3 bg-indigo-50">
                      <div>
                        <span className="text-sm font-medium text-indigo-800">
                          Albumin–Creatinine Ratio (ACR)
                        </span>
                        <span className="text-xs text-indigo-600 ml-2">
                          (Calculated)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${parseFloat(calculatedACR) > 30 ? 'text-red-700' : parseFloat(calculatedACR) > 3 ? 'text-yellow-700' : 'text-green-700'}`}
                        >
                          {calculatedACR} mg/mmol
                        </span>
                        {parseFloat(calculatedACR) > 30 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            ABN
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                {isParameterVisible('calcium') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.calcium}
                    value={extendedChemical.calcium}
                    onChange={(v) => updateChemical('calcium', v)}
                    readOnly={readOnly}
                  />
                )}
              </div>
            </div>
          )}

          {/* Metabolic Indicators */}
          {(isParameterVisible('glucose') ||
            isParameterVisible('ketones') ||
            isParameterVisible('ph') ||
            isParameterVisible('ascorbicAcid')) && (
            <div className="border border-green-100 rounded-lg overflow-hidden">
              <div className="bg-green-50 px-3 py-2 border-b border-green-100">
                <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Metabolic Indicators
                </h4>
              </div>
              <div className="divide-y divide-gray-100">
                {isParameterVisible('glucose') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.glucose}
                    value={extendedChemical.glucose}
                    onChange={(v) => updateChemical('glucose', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('ketones') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.ketones}
                    value={extendedChemical.ketones}
                    onChange={(v) => updateChemical('ketones', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('ph') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.ph}
                    value={extendedChemical.ph}
                    onChange={(v) => updateChemical('ph', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('ascorbicAcid') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.ascorbicAcid}
                    value={extendedChemical.ascorbicAcid}
                    onChange={(v) => updateChemical('ascorbicAcid', v)}
                    readOnly={readOnly}
                  />
                )}
              </div>
              {/* Vitamin C interference warning */}
              {extendedChemical.ascorbicAcid &&
                extendedChemical.ascorbicAcid !== 'Negative' && (
                  <div className="bg-amber-50 px-3 py-2 border-t border-amber-200">
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      High Vitamin C may cause false-negative results for
                      glucose and blood
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Liver & Hemolysis Markers */}
          {(isParameterVisible('bilirubin') ||
            isParameterVisible('urobilinogen')) && (
            <div className="border border-orange-100 rounded-lg overflow-hidden">
              <div className="bg-orange-50 px-3 py-2 border-b border-orange-100">
                <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Liver & Hemolysis Markers
                </h4>
              </div>
              <div className="divide-y divide-gray-100">
                {isParameterVisible('bilirubin') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.bilirubin}
                    value={extendedChemical.bilirubin}
                    onChange={(v) => updateChemical('bilirubin', v)}
                    readOnly={readOnly}
                  />
                )}
                {isParameterVisible('urobilinogen') && (
                  <ParameterField
                    definition={PARAMETER_DEFINITIONS.urobilinogen}
                    value={extendedChemical.urobilinogen}
                    onChange={(v) => updateChemical('urobilinogen', v)}
                    readOnly={readOnly}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Microscopic Examination */}
      {panelConfig.showMicroscopy && (
        <CollapsibleSection
          title="Microscopic Examination"
          icon={<Microscope className="h-5 w-5" />}
          color="green"
        >
          <div className="space-y-4">
            {/* Cellular Elements */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* RBC */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  RBC (/HPF)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">{microscopy.rbc || '—'}</span>
                ) : (
                  <select
                    value={microscopy.rbc || ''}
                    onChange={(e) => updateMicroscopy('rbc', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select</option>
                    {CELL_QUANTITY.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-xs text-gray-400">Ref: 0-2</span>
              </div>

              {/* WBC */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  WBC (/HPF)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">{microscopy.wbc || '—'}</span>
                ) : (
                  <select
                    value={microscopy.wbc || ''}
                    onChange={(e) => updateMicroscopy('wbc', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select</option>
                    {CELL_QUANTITY.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-xs text-gray-400">Ref: 0-5</span>
              </div>

              {/* Epithelial Cells */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Epithelial Cells (/HPF)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.epithelialCells || '—'}
                  </span>
                ) : (
                  <Input
                    value={microscopy.epithelialCells || ''}
                    onChange={(e) =>
                      updateMicroscopy('epithelialCells', e.target.value)
                    }
                    placeholder="e.g., Few squamous"
                    className="text-sm"
                  />
                )}
              </div>

              {/* Bacteria */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Bacteria
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.bacteria || '—'}
                  </span>
                ) : (
                  <select
                    value={microscopy.bacteria || ''}
                    onChange={(e) =>
                      updateMicroscopy('bacteria', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select</option>
                    {BACTERIA_LEVELS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Casts and Crystals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Casts */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Casts (/LPF)
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.casts || '—'}
                  </span>
                ) : (
                  <Input
                    value={microscopy.casts || ''}
                    onChange={(e) => updateMicroscopy('casts', e.target.value)}
                    placeholder="e.g., 0-2"
                    className="text-sm"
                  />
                )}
              </div>

              {/* Cast Types */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Cast Types
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.castTypes?.join(', ') || '—'}
                  </span>
                ) : (
                  <select
                    multiple
                    value={microscopy.castTypes || []}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value,
                      );
                      updateMicroscopy('castTypes', selected);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24"
                  >
                    {CAST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Crystals */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Crystals
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.crystals || '—'}
                  </span>
                ) : (
                  <Input
                    value={microscopy.crystals || ''}
                    onChange={(e) =>
                      updateMicroscopy('crystals', e.target.value)
                    }
                    placeholder="e.g., Few"
                    className="text-sm"
                  />
                )}
              </div>

              {/* Crystal Types */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Crystal Types
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.crystalTypes?.join(', ') || '—'}
                  </span>
                ) : (
                  <select
                    multiple
                    value={microscopy.crystalTypes || []}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions,
                        (opt) => opt.value,
                      );
                      updateMicroscopy('crystalTypes', selected);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24"
                  >
                    {CRYSTAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Other organisms */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Yeast */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Yeast
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.yeast || '—'}
                  </span>
                ) : (
                  <select
                    value={microscopy.yeast || ''}
                    onChange={(e) => updateMicroscopy('yeast', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select</option>
                    {BACTERIA_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Parasites */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Parasites
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {microscopy.parasites || '—'}
                  </span>
                ) : (
                  <Input
                    value={microscopy.parasites || ''}
                    onChange={(e) =>
                      updateMicroscopy('parasites', e.target.value)
                    }
                    placeholder="Specify if seen"
                    className="text-sm"
                  />
                )}
              </div>

              {/* Mucus */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Mucus Threads
                </label>
                {readOnly ? (
                  <span className="text-gray-900">
                    {(microscopy as any).mucus || '—'}
                  </span>
                ) : (
                  <select
                    value={(microscopy as any).mucus || ''}
                    onChange={(e) =>
                      updateMicroscopy('mucus' as any, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select</option>
                    {BACTERIA_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Other Findings */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Other Microscopic Findings
              </label>
              {readOnly ? (
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg min-h-[60px]">
                  {microscopy.otherFindings || '—'}
                </p>
              ) : (
                <Textarea
                  value={microscopy.otherFindings || ''}
                  onChange={(e) =>
                    updateMicroscopy('otherFindings', e.target.value)
                  }
                  rows={2}
                  placeholder="Spermatozoa, Trichomonas, unusual cells, etc."
                />
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Interpretation & Comments */}
      <CollapsibleSection
        title="Interpretation & Comments"
        icon={<ClipboardList className="h-5 w-5" />}
        color="purple"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Interpretation
            </label>
            {readOnly ? (
              <div className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap min-h-[80px]">
                {value.interpretation || '—'}
              </div>
            ) : (
              <Textarea
                value={value.interpretation || ''}
                onChange={(e) =>
                  onChange({ ...value, interpretation: e.target.value })
                }
                rows={3}
                placeholder="Provide clinical interpretation of findings. Include correlation with clinical presentation and recommendations..."
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Comments / Notes
            </label>
            {readOnly ? (
              <div className="text-gray-900 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap min-h-[60px]">
                {value.comments || '—'}
              </div>
            ) : (
              <Textarea
                value={value.comments || ''}
                onChange={(e) =>
                  onChange({ ...value, comments: e.target.value })
                }
                rows={2}
                placeholder="Sample quality notes, technical comments, follow-up recommendations..."
              />
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Print-friendly summary (visible only in print) */}
      <div className="hidden print:block border border-gray-300 rounded-lg p-4 mt-4">
        <h4 className="font-bold text-gray-900 mb-2">
          Test Method: Urine Dipstick Analysis ({panelConfig.label})
        </h4>
        <p className="text-sm text-gray-600">
          Results reported using reagent strip method. Reference ranges provided
          for each parameter. Abnormal results flagged as ABN or CRIT for
          critical values.
        </p>
      </div>
    </div>
  );
}
