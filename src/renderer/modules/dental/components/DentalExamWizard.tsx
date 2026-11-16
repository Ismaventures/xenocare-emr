/**
 * =============================================================================
 * XENOCARE EMR - DENTAL EXAMINATION WIZARD
 * Modern step-based dental examination workflow with progress indicator
 * Following SOAP methodology tailored for dental practice
 * =============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  FileText,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Loader2,
  Activity,
  CheckSquare,
  Smile,
  ClipboardCheck,
  Edit3,
  Pill,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { INPUT_CLS, LABEL_CLS } from '../../../components/ui/ConsultationFormUI';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';
import type {
  CreateDentalExamDTO,
  DentalExamDTO,
  GingivalStatus,
  PainCharacter,
  DentalUrgency,
  RadiographType,
  OcclusionClass,
  DentalChartEntryDTO,
  CreateDentalChartEntryDTO,
} from '../types/dental.types';
import DentalChart from './DentalChart';
import SpecialtyOrdersStep, {
  createDefaultSpecialtyReferrals,
  type SpecialtyReferralsState,
} from '../../specialty-common/components/SpecialtyOrdersStep';
import {
  useLabTestCatalogue,
  useImagingCatalogue,
  useDrugCatalogue,
  useProcedureCatalogue,
} from '../../clinical-consultation/hooks/useConsultation';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  ProcedureOrderDTO,
  PrescriptionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';
import type { SpecialtyOrdersPayload } from '../../specialty-common/utils/specialty-order-submission';

const DENTAL_TEMPLATE_CATEGORY = 'dental_exam';
const DENTAL_TEMPLATE_FIELDS = [
  'complaint_description',
  'dental_history',
  'medical_history',
  'extraoral_findings',
  'intraoral_findings',
  'radiograph_findings',
  'provisional_diagnosis',
  'final_diagnosis',
  'treatment_plan',
] as const;

type DentalTemplateField = (typeof DENTAL_TEMPLATE_FIELDS)[number];

// =============================================================================
// Shared Interactive UI Components
// =============================================================================

/** Chip-based single-select for options ≤ 8 — replaces raw <select> */
function ChipField({
  options,
  value,
  onChange,
  disabled,
}: {
  options: SelectOption[];
  value: string;
  onChange: (val: string | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (disabled) return;
              onChange(isSelected ? undefined : opt.value);
            }}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              isSelected
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Toggle pill for boolean fields — replaces raw <select> with 2 options */
function TogglePill({
  value,
  onChange,
  trueLabel,
  falseLabel,
  disabled,
}: {
  value: boolean | undefined;
  onChange: (val: boolean | undefined) => void;
  trueLabel: string;
  falseLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {[
        { label: falseLabel, boolVal: false },
        { label: trueLabel, boolVal: true },
      ].map(({ label, boolVal }) => {
        const isSelected = value === boolVal;
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (disabled) return;
              onChange(isSelected ? undefined : boolVal);
            }}
            disabled={disabled}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              isSelected
                ? boolVal
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Pain scale with gradient color buttons — replaces raw 0-10 <select> */
function DentalPainScale({
  value,
  onChange,
  disabled,
}: {
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  disabled?: boolean;
}) {
  const getColor = (v: number) => {
    if (v <= 3) return { bg: 'bg-emerald-500', ring: 'ring-emerald-200' };
    if (v <= 6) return { bg: 'bg-amber-500', ring: 'ring-amber-200' };
    return { bg: 'bg-rose-500', ring: 'ring-rose-200' };
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 11 }, (_, i) => {
          const isSelected = value === i;
          const { bg, ring } = getColor(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (disabled) return;
                onChange(isSelected ? undefined : i);
              }}
              disabled={disabled}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
                isSelected
                  ? `${bg} text-white ring-2 ring-offset-1 ${ring} scale-110`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 px-1">
        <span>No pain</span>
        <span>Moderate</span>
        <span>Severe</span>
      </div>
    </div>
  );
}

// =============================================================================
// Types
// =============================================================================

interface DentalExamWizardProps {
  patientId: string;
  emrNumber?: string;
  encounterId: string;
  patientName?: string;
  encounterNumber?: string;
  consultationId?: string;
  facilityId?: string;
  existingExam?: DentalExamDTO | null;
  existingChartEntries?: DentalChartEntryDTO[];
  onSaveExam: (
    exam: CreateDentalExamDTO,
    orders?: SpecialtyOrdersPayload,
  ) => Promise<DentalExamDTO>;
  onSaveChartEntry: (entry: CreateDentalChartEntryDTO) => Promise<void>;
  onUpdateExam?: (
    examId: string,
    exam: Partial<CreateDentalExamDTO>,
    orders?: SpecialtyOrdersPayload,
  ) => Promise<void>;
  onClose?: () => void;
  readOnly?: boolean;
}

interface Step {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  description: string;
  category: 'subjective' | 'objective' | 'assessment' | 'plan';
}

// =============================================================================
// Step Configuration - Dental SOAP Methodology
// =============================================================================

const STEPS: Step[] = [
  {
    id: 'complaint',
    title: 'Chief Complaint',
    shortTitle: 'Complaint',
    icon: <FileText size={12} />,
    description: 'Primary presenting complaint',
    category: 'subjective',
  },
  {
    id: 'history',
    title: 'Medical & Dental History',
    shortTitle: 'History',
    icon: <ClipboardList size={12} />,
    description: 'Patient history & allergies',
    category: 'subjective',
  },
  {
    id: 'examination',
    title: 'Oral Examination',
    shortTitle: 'Exam',
    icon: <Stethoscope size={12} />,
    description: 'Clinical examination findings',
    category: 'objective',
  },
  {
    id: 'periodontal',
    title: 'Periodontal Assessment',
    shortTitle: 'Perio',
    icon: <Activity size={12} />,
    description: 'Gingival & periodontal status',
    category: 'objective',
  },
  {
    id: 'radiograph',
    title: 'Radiographic Findings',
    shortTitle: 'X-Ray',
    icon: <FileText size={12} />,
    description: 'Radiograph interpretation',
    category: 'objective',
  },
  {
    id: 'charting',
    title: 'Dental Chart',
    shortTitle: 'Chart',
    icon: <Smile size={12} />,
    description: 'Tooth-by-tooth charting',
    category: 'assessment',
  },
  {
    id: 'diagnosis',
    title: 'Diagnosis & Plan',
    shortTitle: 'Plan',
    icon: <CheckSquare size={12} />,
    description: 'Diagnosis & treatment plan',
    category: 'plan',
  },
  {
    id: 'orders',
    title: 'Orders & Services',
    shortTitle: 'Orders',
    icon: <Pill size={12} />,
    description: 'Rx, Labs, Imaging, Procedures, Referrals',
    category: 'plan',
  },
  {
    id: 'review',
    title: 'Review & Submit',
    shortTitle: 'Review',
    icon: <ClipboardCheck size={12} />,
    description: 'Review all details before submission',
    category: 'plan',
  },
];

const SOAP_COLORS = {
  subjective: {
    bg: 'bg-blue-500',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  objective: {
    bg: 'bg-green-500',
    light: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
  },
  assessment: {
    bg: 'bg-purple-500',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
  },
  plan: {
    bg: 'bg-orange-500',
    light: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
};

// =============================================================================
// Constants
// =============================================================================

const GINGIVAL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Healthy', label: 'Healthy Gingiva' },
  { value: 'Mild_Gingivitis', label: 'Mild Gingivitis' },
  { value: 'Moderate_Gingivitis', label: 'Moderate Gingivitis' },
  { value: 'Severe_Gingivitis', label: 'Severe Gingivitis' },
  { value: 'Periodontitis', label: 'Periodontitis' },
  { value: 'Gingival_Recession', label: 'Gingival Recession' },
];

const OCCLUSION_OPTIONS: SelectOption[] = [
  { value: 'Class_I', label: 'Class I - Normal Occlusion' },
  { value: 'Class_II_Retrognathic', label: 'Class II - Retrognathic' },
  { value: 'Class_III_Prognathic', label: 'Class III - Prognathic' },
  { value: 'Open_Bite', label: 'Open Bite' },
  { value: 'Crossbite', label: 'Crossbite' },
  { value: 'Not_Assessed', label: 'Not Assessed' },
];

const PAIN_CHARACTER_OPTIONS: SelectOption[] = [
  { value: 'Sharp', label: 'Sharp pain' },
  { value: 'Dull', label: 'Dull ache' },
  { value: 'Throbbing', label: 'Throbbing pain' },
  { value: 'Cold_Sensitivity', label: 'Sensitivity to cold' },
  { value: 'Hot_Sensitivity', label: 'Sensitivity to hot' },
  { value: 'Biting_Pain', label: 'Pain on biting' },
  { value: 'Intermittent', label: 'Intermittent pain' },
  { value: 'Constant', label: 'Constant pain' },
  { value: 'Radiating', label: 'Radiating pain' },
  { value: 'No_Pain', label: 'No pain' },
];

const URGENCY_OPTIONS: SelectOption[] = [
  { value: 'Emergency', label: 'Emergency – immediate treatment' },
  { value: 'Urgent', label: 'Urgent – within 24–48 hours' },
  { value: 'Priority', label: 'Priority – within 1 week' },
  { value: 'Routine', label: 'Routine treatment' },
  { value: 'Elective', label: 'Elective treatment' },
];

const ESTIMATED_SESSIONS_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Single visit' },
  { value: '2', label: '2 visits' },
  { value: '3', label: '3–4 visits' },
  { value: '5', label: '5+ visits' },
];

const RADIOGRAPH_TYPES: SelectOption[] = [
  { value: 'None', label: 'No radiograph taken' },
  { value: 'Periapical', label: 'Periapical X-ray' },
  { value: 'Bitewing', label: 'Bitewing X-ray' },
  { value: 'OPG', label: 'Panoramic (OPG)' },
  { value: 'CBCT', label: 'CBCT Scan' },
  { value: 'Other', label: 'Other imaging' },
];

const CONSULTATION_TYPE_OPTIONS = [
  'New Patient',
  'Recall',
  'Emergency',
  'Follow-up',
  'Referral',
];

const COMPLAINT_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Toothache', label: 'Toothache' },
  { value: 'Swelling', label: 'Swelling' },
  { value: 'Sensitivity', label: 'Sensitivity' },
  { value: 'Broken_Tooth', label: 'Broken Tooth' },
  { value: 'Missing_Tooth', label: 'Missing Tooth' },
  { value: 'Bleeding_Gums', label: 'Bleeding Gums' },
  { value: 'Dental_Abscess', label: 'Dental Abscess' },
  { value: 'Loose_Tooth', label: 'Loose Tooth' },
  { value: 'Halitosis', label: 'Bad Breath (Halitosis)' },
  { value: 'Jaw_Pain', label: 'Jaw Pain' },
  { value: 'Oral_Ulcer', label: 'Oral Ulcer / Sore' },
  { value: 'Dry_Socket', label: 'Dry Socket' },
  { value: 'Food_Impaction', label: 'Food Impaction' },
  { value: 'Difficulty_Chewing', label: 'Difficulty Chewing' },
  { value: 'Routine_Checkup', label: 'Routine Dental Checkup' },
  { value: 'Follow_Up', label: 'Follow-up Visit' },
  { value: 'Other', label: 'Other' },
];

const COMPLAINT_DESCRIPTION_OPTIONS: SelectOption[] = [
  { value: 'Sharp pain when chewing', label: 'Sharp pain when chewing' },
  { value: 'Persistent dull tooth pain', label: 'Persistent dull tooth pain' },
  { value: 'Throbbing tooth pain', label: 'Throbbing tooth pain' },
  { value: 'Sensitivity to cold', label: 'Sensitivity to cold' },
  { value: 'Sensitivity to hot', label: 'Sensitivity to hot' },
  { value: 'Pain on biting', label: 'Pain on biting' },
  { value: 'Spontaneous tooth pain', label: 'Spontaneous tooth pain' },
  {
    value: 'Bleeding gums when brushing',
    label: 'Bleeding gums when brushing',
  },
  { value: 'Swelling around tooth', label: 'Swelling around tooth' },
  { value: 'Broken or chipped tooth', label: 'Broken or chipped tooth' },
  { value: 'Missing tooth concern', label: 'Missing tooth concern' },
  { value: 'Jaw stiffness or pain', label: 'Jaw stiffness or pain' },
  { value: 'Bad breath concern', label: 'Bad breath concern' },
  { value: 'Ulcer in mouth', label: 'Ulcer in mouth' },
  { value: 'Post-extraction pain', label: 'Post-extraction pain' },
  { value: 'Routine dental examination', label: 'Routine dental examination' },
  { value: 'Other', label: 'Other' },
];

const AFFECTED_AREA_OPTIONS: SelectOption[] = [
  { value: 'Upper_Right_Quadrant', label: 'Upper Right Quadrant' },
  { value: 'Upper_Left_Quadrant', label: 'Upper Left Quadrant' },
  { value: 'Lower_Right_Quadrant', label: 'Lower Right Quadrant' },
  { value: 'Lower_Left_Quadrant', label: 'Lower Left Quadrant' },
  { value: 'Upper_Anterior', label: 'Upper Anterior Teeth' },
  { value: 'Lower_Anterior', label: 'Lower Anterior Teeth' },
  { value: 'Multiple_Teeth', label: 'Multiple Teeth' },
  { value: 'Generalized', label: 'Generalized' },
  { value: 'Specific_Tooth', label: 'Specific Tooth (FDI 11–48)' },
];

const DURATION_OPTIONS: SelectOption[] = [
  { value: 'Today', label: 'Today' },
  { value: '1-2_days', label: '1–2 days' },
  { value: '3-7_days', label: '3–7 days' },
  { value: '1-2_weeks', label: '1–2 weeks' },
  { value: '2-4_weeks', label: '2–4 weeks' },
  { value: 'More_than_1_month', label: 'More than 1 month' },
  { value: 'Chronic', label: 'Chronic / recurring' },
  { value: 'Unknown', label: 'Unknown' },
];

const TOBACCO_USE_OPTIONS: SelectOption[] = [
  { value: 'Never', label: 'Never used' },
  { value: 'Former', label: 'Former smoker' },
  { value: 'Current_Smoker', label: 'Current smoker' },
  { value: 'Smokeless', label: 'Smokeless tobacco' },
  { value: 'Occasional', label: 'Occasional use' },
];

const ALCOHOL_USE_OPTIONS: SelectOption[] = [
  { value: 'None', label: 'None' },
  { value: 'Occasional', label: 'Occasional' },
  { value: 'Moderate', label: 'Moderate use' },
  { value: 'Heavy', label: 'Heavy use' },
  { value: 'Unknown', label: 'Unknown' },
];

const EXTRAORAL_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal facial symmetry' },
  { value: 'Facial_Swelling', label: 'Facial swelling present' },
  { value: 'Tender_Lymph_Nodes', label: 'Tender lymph nodes' },
  { value: 'TMJ_Tenderness', label: 'TMJ tenderness' },
  { value: 'Limited_Jaw_Opening', label: 'Limited jaw opening' },
  { value: 'Facial_Asymmetry', label: 'Facial asymmetry' },
];

const INTRAORAL_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal oral mucosa' },
  { value: 'Ulcer', label: 'Ulcer present' },
  { value: 'Redness', label: 'Redness / inflammation' },
  { value: 'White_Lesion', label: 'White lesion' },
  { value: 'Swelling', label: 'Swelling present' },
  { value: 'Infection', label: 'Infection suspected' },
];

const SOFT_TISSUE_OPTIONS: SelectOption[] = [
  { value: 'Healthy', label: 'Healthy gingiva' },
  { value: 'Mild_Gingivitis', label: 'Mild gingivitis' },
  { value: 'Moderate_Gingivitis', label: 'Moderate gingivitis' },
  { value: 'Severe_Gingivitis', label: 'Severe gingivitis' },
  { value: 'Gingival_Recession', label: 'Gingival recession' },
  { value: 'Soft_Tissue_Lesion', label: 'Soft tissue lesion' },
];

const HARD_TISSUE_OPTIONS: SelectOption[] = [
  { value: 'Healthy', label: 'Healthy dentition' },
  { value: 'Caries', label: 'Dental caries present' },
  { value: 'Fractured', label: 'Fractured tooth' },
  { value: 'Restorations', label: 'Restorations present' },
  { value: 'Missing', label: 'Missing teeth' },
  { value: 'Attrition', label: 'Attrition / erosion' },
];

const TMJ_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Clicking', label: 'Clicking present' },
  { value: 'Crepitus', label: 'Crepitus' },
  { value: 'Pain', label: 'Pain on movement' },
  { value: 'Deviation', label: 'Deviation on opening' },
  { value: 'Limited', label: 'Limited movement' },
];

const CALCULUS_OPTIONS: SelectOption[] = [
  { value: 'None', label: 'No calculus' },
  { value: 'Supragingival', label: 'Supragingival calculus' },
  { value: 'Subgingival', label: 'Subgingival calculus' },
  { value: 'Both', label: 'Both present' },
];

const BOP_OPTIONS: SelectOption[] = [
  { value: 'Absent', label: 'Absent' },
  { value: 'Present', label: 'Present' },
];

const QUICK_COMPLAINT_BUTTONS = [
  'Toothache',
  'Swelling',
  'Broken_Tooth',
  'Sensitivity',
  'Routine_Checkup',
];

const SYSTEMIC_CONDITIONS_LIST = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Anticoagulant Therapy',
  'Bisphosphonate Therapy',
  'Pregnancy',
  'HIV/AIDS',
  'Bleeding Disorder',
  'Epilepsy',
  'Asthma',
  'Renal Disease',
  'Liver Disease',
  'Immunosuppressed',
];

// =============================================================================
// Progress Indicator Component
// =============================================================================

function ProgressIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<string>;
  onStepClick: (index: number) => void;
}) {
  const progressPercentage = useMemo(() => {
    const completedCount = completedSteps.size;
    const totalSteps = steps.length;
    return Math.round((completedCount / totalSteps) * 100);
  }, [completedSteps.size, steps.length]);

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      {/* Pill Step Indicators */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const colors = SOAP_COLORS[step.category];

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(index)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 whitespace-nowrap shrink-0 ${
                isActive
                  ? `${colors.bg} text-white border-transparent shadow-sm scale-105`
                  : isCompleted
                    ? `bg-white ${colors.border} ${colors.text} hover:shadow-sm`
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
              }`}
            >
              {isCompleted ? (
                <Check size={12} className="shrink-0" />
              ) : (
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  {step.icon}
                </span>
              )}
              <span className="hidden sm:inline">{step.shortTitle}</span>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-400 to-violet-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Step Content Components
// =============================================================================

// Step 1: Chief Complaint
function ComplaintStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onChange: (field: keyof CreateDentalExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  // Auto-populate complaint_type when quick button is clicked
  const handleQuickComplaint = (category: string) => {
    if (readOnly) return;
    onChange(
      'complaint_type',
      formData.complaint_type === category ? undefined : category,
    );
  };

  return (
    <div className="space-y-6">
      {/* Visit Classification */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-purple-500 shadow-sm p-5">
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">
          Visit Classification
        </h4>
        <div className="flex flex-wrap gap-2">
          {CONSULTATION_TYPE_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              disabled={readOnly}
              onClick={() =>
                onChange(
                  'consultation_type',
                  formData.consultation_type === type ? undefined : type,
                )
              }
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-all duration-150 ${
                formData.consultation_type === type
                  ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-blue-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Chief Complaint
            </h3>
            <p className="text-sm text-gray-500">
              What brings the patient in today?
            </p>
          </div>
        </div>

        {/* Quick Complaint Buttons */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Quick Select
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_COMPLAINT_BUTTONS.map((cat) => {
              const opt = COMPLAINT_CATEGORY_OPTIONS.find(
                (c) => c.value === cat,
              );
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleQuickComplaint(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-medium border transition-all duration-150 ${
                    formData.complaint_type === cat
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {opt?.label || cat.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Complaint Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Complaint Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.complaint_type || ''}
              onChange={(e) =>
                onChange('complaint_type', e.target.value || undefined)
              }
              disabled={readOnly}
              className={INPUT_CLS}
            >
              <option value="">Select category...</option>
              {COMPLAINT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Complaint Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Primary Complaint Description
            </label>
            <select
              value={formData.complaint_description || ''}
              onChange={(e) =>
                onChange('complaint_description', e.target.value || undefined)
              }
              disabled={readOnly}
              className={INPUT_CLS}
            >
              <option value="">Select description...</option>
              {COMPLAINT_DESCRIPTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Affected Area / Tooth */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Affected Area / Tooth
            </label>
            <ChipField
              options={AFFECTED_AREA_OPTIONS}
              value={formData.affected_area || ''}
              onChange={(v) => onChange('affected_area', v)}
              disabled={readOnly}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Duration
            </label>
            <ChipField
              options={DURATION_OPTIONS}
              value={formData.complaint_duration || ''}
              onChange={(v) => onChange('complaint_duration', v)}
              disabled={readOnly}
            />
          </div>

          {/* Pain Severity */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pain Severity (0-10)
            </label>
            <DentalPainScale
              value={formData.pain_level}
              onChange={(v) => onChange('pain_level', v)}
              disabled={readOnly}
            />
          </div>

          {/* Pain Type */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pain Type
            </label>
            <ChipField
              options={PAIN_CHARACTER_OPTIONS}
              value={formData.pain_character || ''}
              onChange={(v) => onChange('pain_character', v)}
              disabled={readOnly}
            />
          </div>

          {/* Additional Complaint Notes */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Additional Complaint Notes
              <span className="ml-2 text-xs text-gray-400 font-normal">
                (Optional)
              </span>
            </label>
            <textarea
              value={formData.chief_complaint || ''}
              onChange={(e) => onChange('chief_complaint', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Any additional notes about the complaint..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: History
function HistoryStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onChange: (field: keyof CreateDentalExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  const conditions =
    (formData.systemic_conditions as Record<string, boolean>) || {};
  const toggleCondition = (name: string) => {
    onChange('systemic_conditions', {
      ...conditions,
      [name]: !conditions[name],
    });
  };

  return (
    <div className="space-y-6">
      {/* Systemic Conditions */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-rose-500 shadow-sm p-5">
        <h4 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-3">
          Systemic Conditions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {SYSTEMIC_CONDITIONS_LIST.map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => !readOnly && toggleCondition(cond)}
              disabled={readOnly}
              className={`px-3 py-2 rounded-full text-xs font-medium border transition-all duration-150 text-left ${
                conditions[cond]
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-blue-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Medical & Dental History
            </h3>
            <p className="text-sm text-gray-500">Relevant patient history</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Dental History
            </label>
            <textarea
              value={formData.dental_history || ''}
              onChange={(e) => onChange('dental_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Previous dental treatments, extractions, prosthetics..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Medical History
            </label>
            <textarea
              value={formData.medical_history || ''}
              onChange={(e) => onChange('medical_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Diabetes, hypertension, bleeding disorders..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Allergies
              <span className="ml-2 text-xs text-red-500 font-normal">
                (Important)
              </span>
            </label>
            <textarea
              value={formData.allergies || ''}
              onChange={(e) => onChange('allergies', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={1}
              placeholder="Drug allergies, latex allergy, material sensitivities..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Current Medications
            </label>
            <textarea
              value={formData.current_medications || ''}
              onChange={(e) => onChange('current_medications', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Current medications including anticoagulants, bisphosphonates, immunosuppressants..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Tobacco Use
            </label>
            <ChipField
              options={TOBACCO_USE_OPTIONS}
              value={formData.tobacco_use || ''}
              onChange={(v) => onChange('tobacco_use', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Alcohol Use
            </label>
            <ChipField
              options={ALCOHOL_USE_OPTIONS}
              value={formData.alcohol_use || ''}
              onChange={(v) => onChange('alcohol_use', v)}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Oral Examination
function ExaminationStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onChange: (field: keyof CreateDentalExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Stethoscope className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Oral Examination
            </h3>
            <p className="text-sm text-gray-500">
              Clinical examination findings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Extraoral Findings
            </label>
            <ChipField
              options={EXTRAORAL_OPTIONS}
              value={formData.extraoral_findings || ''}
              onChange={(v) => onChange('extraoral_findings', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Intraoral Findings
            </label>
            <ChipField
              options={INTRAORAL_OPTIONS}
              value={formData.intraoral_findings || ''}
              onChange={(v) => onChange('intraoral_findings', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Soft Tissue Exam
            </label>
            <ChipField
              options={SOFT_TISSUE_OPTIONS}
              value={formData.soft_tissue_exam || ''}
              onChange={(v) => onChange('soft_tissue_exam', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Hard Tissue Exam
            </label>
            <ChipField
              options={HARD_TISSUE_OPTIONS}
              value={formData.hard_tissue_exam || ''}
              onChange={(v) => onChange('hard_tissue_exam', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Occlusion Classification
            </label>
            <ChipField
              options={OCCLUSION_OPTIONS}
              value={formData.occlusion_class || ''}
              onChange={(v) => onChange('occlusion_class', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              TMJ Assessment
            </label>
            <ChipField
              options={TMJ_OPTIONS}
              value={formData.tmj_assessment || ''}
              onChange={(v) => onChange('tmj_assessment', v)}
              disabled={readOnly}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Examination Notes
              <span className="ml-2 text-xs text-gray-400 font-normal">
                (Optional)
              </span>
            </label>
            <textarea
              value={(formData as any).examination_notes || ''}
              onChange={(e) =>
                onChange('examination_notes' as any, e.target.value)
              }
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Any additional examination notes..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Periodontal Assessment
function PeriodontalStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onChange: (field: keyof CreateDentalExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Periodontal Assessment
            </h3>
            <p className="text-sm text-gray-500">
              Gingival and periodontal status
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Gingival Status
            </label>
            <ChipField
              options={GINGIVAL_STATUS_OPTIONS}
              value={formData.gingival_status || ''}
              onChange={(v) => onChange('gingival_status', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Plaque Score (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={formData.plaque_score ?? ''}
              onChange={(e) =>
                onChange(
                  'plaque_score',
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="0-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Bleeding on Probing
            </label>
            <TogglePill
              value={formData.bleeding_on_probing}
              onChange={(v) => onChange('bleeding_on_probing', v)}
              trueLabel="Present"
              falseLabel="Absent"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Calculus Present
            </label>
            <ChipField
              options={CALCULUS_OPTIONS}
              value={
                (formData as any).calculus_type ||
                (formData.calculus_present
                  ? 'Supragingival'
                  : formData.calculus_present === false
                    ? 'None'
                    : '')
              }
              onChange={(v) => {
                onChange('calculus_type' as any, v);
                onChange(
                  'calculus_present',
                  v && v !== 'None'
                    ? true
                    : v === 'None'
                      ? false
                      : undefined,
                );
              }}
              disabled={readOnly}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pocket Depth Notes
              <span className="ml-2 text-xs text-gray-400 font-normal">
                (Optional)
              </span>
            </label>
            <textarea
              value={formData.pocket_depth_notes || ''}
              onChange={(e) => onChange('pocket_depth_notes', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Probing depths, areas of concern..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 5: Radiographic Findings
function RadiographStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onChange: (field: keyof CreateDentalExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <FileText className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Radiographic Findings
            </h3>
            <p className="text-sm text-gray-500">
              X-ray interpretation and findings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Radiograph Taken
            </label>
            <ChipField
              options={RADIOGRAPH_TYPES}
              value={formData.radiograph_type || ''}
              onChange={(v) => {
                onChange('radiograph_type', v);
                onChange('radiograph_taken', !!(v && v !== 'None'));
              }}
              disabled={readOnly}
            />
          </div>

          {formData.radiograph_type && formData.radiograph_type !== 'None' && (
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Radiographic Findings
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  (Optional)
                </span>
              </label>
              <textarea
                value={formData.radiograph_findings || ''}
                onChange={(e) =>
                  onChange('radiograph_findings', e.target.value)
                }
                disabled={readOnly}
                className={INPUT_CLS}
                rows={3}
                placeholder="e.g., Periapical infection, Bone loss, Impacted tooth, Normal findings..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 6: Dental Chart
function ChartingStep({
  patientId,
  encounterId,
  savedExam,
  existingChartEntries,
  onSaveChartEntry,
  readOnly,
}: {
  patientId: string;
  encounterId: string;
  savedExam: DentalExamDTO | null;
  existingChartEntries?: DentalChartEntryDTO[];
  onSaveChartEntry: (entry: CreateDentalChartEntryDTO) => Promise<void>;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-purple-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <Smile className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Dental Chart
            </h3>
            <p className="text-sm text-gray-500">
              Tooth-by-tooth charting and conditions
            </p>
          </div>
        </div>

        {savedExam ? (
          <DentalChart
            patientId={patientId}
            examId={savedExam.exam_id}
            encounterId={encounterId}
            existingEntries={existingChartEntries || savedExam.dental_chart}
            onSaveEntry={onSaveChartEntry}
            readOnly={readOnly}
          />
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium">
              Save the examination first
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Click "Save & Continue" to enable dental charting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 7: Diagnosis & Plan
function DiagnosisStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onChange: (field: keyof CreateDentalExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-amber-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <CheckSquare className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Diagnosis & Treatment Plan
            </h3>
            <p className="text-sm text-gray-500">
              Final diagnosis and recommended treatment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Provisional Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.provisional_diagnosis || ''}
              onChange={(e) =>
                onChange('provisional_diagnosis', e.target.value)
              }
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="e.g., Dental caries, Irreversible pulpitis, Gingivitis, Periodontitis..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Treatment Plan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.treatment_plan || ''}
              onChange={(e) => onChange('treatment_plan', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="e.g., Root canal therapy, Extraction, Scaling and polishing..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Urgency
            </label>
            <ChipField
              options={URGENCY_OPTIONS}
              value={formData.urgency || ''}
              onChange={(v) => onChange('urgency', v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Estimated Sessions
            </label>
            <ChipField
              options={ESTIMATED_SESSIONS_OPTIONS}
              value={formData.estimated_sessions?.toString() || ''}
              onChange={(v) => {
                onChange('estimated_sessions', v ? parseInt(v) : undefined);
              }}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Step 9: Review Step
// =============================================================================

function ReviewStep({
  formData,
  onEditStep,
  onChange,
  orderCounts,
}: {
  formData: Partial<CreateDentalExamDTO>;
  onEditStep: (stepIndex: number) => void;
  onChange?: (field: keyof CreateDentalExamDTO, value: any) => void;
  orderCounts?: {
    labs: number;
    imaging: number;
    prescriptions: number;
    procedures: number;
    referrals: number;
  };
}) {
  // State for inline editing
  const [editingSection, setEditingSection] = useState<number | null>(null);

  function ReviewSection({
    title,
    stepIndex,
    icon,
    color,
    children,
    editContent,
  }: {
    title: string;
    stepIndex: number;
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
    editContent?: React.ReactNode;
  }) {
    const isEditing = editingSection === stepIndex;

    const handleEditClick = () => {
      if (editContent && onChange) {
        setEditingSection(isEditing ? null : stepIndex);
      } else {
        onEditStep(stepIndex);
      }
    };

    return (
      <div
        className={`bg-gradient-to-br ${isEditing ? 'from-violet-50 to-white border-violet-300 ring-2 ring-violet-200' : `from-${color}-50 to-white border-${color}-100`} rounded-xl border p-4 transition-all`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${isEditing ? 'bg-violet-100' : `bg-${color}-100`} rounded-lg`}
            >
              {icon}
            </div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {isEditing && (
              <span className="px-2 py-0.5 bg-violet-600 text-white text-xs font-bold rounded uppercase">
                Editing
              </span>
            )}
          </div>
          <button
            onClick={handleEditClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isEditing
                ? 'bg-violet-600 text-white hover:bg-violet-700'
                : `text-${color}-600 hover:bg-${color}-100`
            }`}
          >
            {isEditing ? (
              <>
                <Check size={14} />
                Done
              </>
            ) : (
              <>
                <Edit3 size={14} />
                Edit
              </>
            )}
          </button>
        </div>
        {isEditing && editContent ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            {editContent}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {children}
          </div>
        )}
      </div>
    );
  }

  function Field({
    label,
    value,
  }: {
    label: string;
    value?: string | number | null;
  }) {
    return (
      <div>
        <span className="text-gray-500">{label}:</span>
        <span className="ml-1 font-medium text-gray-900">{value || '—'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Review Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Review Examination Details</h2>
            <p className="text-violet-100 text-sm">
              Please verify all information before submitting
            </p>
          </div>
        </div>
      </div>

      {/* Chief Complaint */}
      <ReviewSection
        title="Chief Complaint"
        stepIndex={0}
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        color="blue"
        editContent={
          onChange && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Complaint Category
                  </label>
                  <select
                    value={formData.complaint_type || ''}
                    onChange={(e) =>
                      onChange('complaint_type', e.target.value || undefined)
                    }
                    className={INPUT_CLS}
                  >
                    <option value="">Select...</option>
                    {COMPLAINT_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Description
                  </label>
                  <select
                    value={formData.complaint_description || ''}
                    onChange={(e) =>
                      onChange(
                        'complaint_description',
                        e.target.value || undefined,
                      )
                    }
                    className={INPUT_CLS}
                  >
                    <option value="">Select...</option>
                    {COMPLAINT_DESCRIPTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Duration
                  </label>
                  <ChipField
                    options={DURATION_OPTIONS}
                    value={formData.complaint_duration || ''}
                    onChange={(v) => onChange('complaint_duration', v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Pain Type
                  </label>
                  <ChipField
                    options={PAIN_CHARACTER_OPTIONS}
                    value={formData.pain_character || ''}
                    onChange={(v) => onChange('pain_character', v)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Pain Level (0-10)
                  </label>
                  <DentalPainScale
                    value={formData.pain_level}
                    onChange={(v) => onChange('pain_level', v)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  value={formData.chief_complaint || ''}
                  onChange={(e) => onChange('chief_complaint', e.target.value)}
                  className={INPUT_CLS}
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )
        }
      >
        <Field
          label="Category"
          value={
            COMPLAINT_CATEGORY_OPTIONS.find(
              (o) => o.value === formData.complaint_type,
            )?.label || formData.complaint_type
          }
        />
        <Field label="Description" value={formData.complaint_description} />
        <Field
          label="Affected Area"
          value={
            AFFECTED_AREA_OPTIONS.find(
              (o) => o.value === formData.affected_area,
            )?.label || formData.affected_area
          }
        />
        <Field
          label="Duration"
          value={
            DURATION_OPTIONS.find(
              (o) => o.value === formData.complaint_duration,
            )?.label || formData.complaint_duration
          }
        />
        <Field
          label="Pain Type"
          value={
            PAIN_CHARACTER_OPTIONS.find(
              (o) => o.value === formData.pain_character,
            )?.label || formData.pain_character
          }
        />
        <Field
          label="Pain Level"
          value={
            formData.pain_level !== undefined && formData.pain_level !== null
              ? `${formData.pain_level}/10`
              : undefined
          }
        />
        {formData.chief_complaint && (
          <div className="col-span-2 lg:col-span-3">
            <Field label="Additional Notes" value={formData.chief_complaint} />
          </div>
        )}
      </ReviewSection>

      {/* Medical & Dental History */}
      <ReviewSection
        title="Medical & Dental History"
        stepIndex={1}
        icon={<ClipboardList className="h-4 w-4 text-blue-600" />}
        color="blue"
      >
        <Field label="Medical History" value={formData.medical_history} />
        <Field label="Dental History" value={formData.dental_history} />
        <Field label="Allergies" value={formData.allergies} />
      </ReviewSection>

      {/* Oral Examination */}
      <ReviewSection
        title="Oral Examination"
        stepIndex={2}
        icon={<Stethoscope className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field
          label="Extra-oral"
          value={
            EXTRAORAL_OPTIONS.find(
              (o) => o.value === formData.extraoral_findings,
            )?.label || formData.extraoral_findings
          }
        />
        <Field
          label="Intra-oral"
          value={
            INTRAORAL_OPTIONS.find(
              (o) => o.value === formData.intraoral_findings,
            )?.label || formData.intraoral_findings
          }
        />
        <Field
          label="Soft Tissue"
          value={
            SOFT_TISSUE_OPTIONS.find(
              (o) => o.value === formData.soft_tissue_exam,
            )?.label || formData.soft_tissue_exam
          }
        />
        <Field
          label="Hard Tissue"
          value={
            HARD_TISSUE_OPTIONS.find(
              (o) => o.value === formData.hard_tissue_exam,
            )?.label || formData.hard_tissue_exam
          }
        />
        <Field
          label="TMJ"
          value={
            TMJ_OPTIONS.find((o) => o.value === formData.tmj_assessment)
              ?.label || formData.tmj_assessment
          }
        />
        <Field
          label="Occlusion"
          value={
            OCCLUSION_OPTIONS.find((o) => o.value === formData.occlusion_class)
              ?.label || formData.occlusion_class
          }
        />
      </ReviewSection>

      {/* Periodontal Assessment */}
      <ReviewSection
        title="Periodontal Assessment"
        stepIndex={3}
        icon={<Activity className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field
          label="Gingival Status"
          value={
            GINGIVAL_STATUS_OPTIONS.find(
              (o) => o.value === formData.gingival_status,
            )?.label || formData.gingival_status
          }
        />
        <Field
          label="Plaque Score"
          value={
            formData.plaque_score !== undefined
              ? `${formData.plaque_score}%`
              : undefined
          }
        />
        <Field
          label="Bleeding on Probing"
          value={
            formData.bleeding_on_probing === true
              ? 'Present'
              : formData.bleeding_on_probing === false
                ? 'Absent'
                : undefined
          }
        />
        <Field
          label="Calculus"
          value={
            CALCULUS_OPTIONS.find(
              (o) => o.value === (formData as any).calculus_type,
            )?.label ||
            (formData.calculus_present
              ? 'Yes'
              : formData.calculus_present === false
                ? 'No'
                : undefined)
          }
        />
        <Field label="Pocket Depth Notes" value={formData.pocket_depth_notes} />
      </ReviewSection>

      {/* Radiographic Findings */}
      <ReviewSection
        title="Radiographic Findings"
        stepIndex={4}
        icon={<FileText className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field
          label="Radiograph Type"
          value={
            RADIOGRAPH_TYPES.find((o) => o.value === formData.radiograph_type)
              ?.label || formData.radiograph_type
          }
        />
        <div className="col-span-2 lg:col-span-3">
          <Field
            label="Radiograph Findings"
            value={formData.radiograph_findings}
          />
        </div>
      </ReviewSection>

      {/* Dental Chart Note */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-purple-500 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Smile className="h-4 w-4 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Dental Chart
            </h3>
          </div>
          <button
            onClick={() => onEditStep(5)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Edit3 size={14} />
            Edit
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Tooth-by-tooth charting has been recorded. Click "Edit" to view or
          modify.
        </p>
      </div>

      {/* Diagnosis & Plan */}
      <ReviewSection
        title="Diagnosis & Plan"
        stepIndex={6}
        icon={<CheckSquare className="h-4 w-4 text-amber-600" />}
        color="orange"
      >
        <div className="col-span-2 lg:col-span-3">
          <Field
            label="Provisional Diagnosis"
            value={formData.provisional_diagnosis}
          />
        </div>
        <div className="col-span-2 lg:col-span-3">
          <Field label="Treatment Plan" value={formData.treatment_plan} />
        </div>
        <Field
          label="Urgency"
          value={
            URGENCY_OPTIONS.find((o) => o.value === formData.urgency)?.label ||
            formData.urgency
          }
        />
        <Field
          label="Estimated Sessions"
          value={
            ESTIMATED_SESSIONS_OPTIONS.find(
              (o) => o.value === formData.estimated_sessions?.toString(),
            )?.label || formData.estimated_sessions
          }
        />
      </ReviewSection>

      {/* Orders Summary Note */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-amber-500 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <Pill className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              Orders & Services
            </h3>
          </div>
          <button
            onClick={() => onEditStep(7)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <Edit3 size={14} />
            Edit
          </button>
        </div>
        {orderCounts &&
        orderCounts.labs +
          orderCounts.imaging +
          orderCounts.prescriptions +
          orderCounts.procedures +
          orderCounts.referrals >
          0 ? (
          <div className="flex flex-wrap gap-2">
            {orderCounts.prescriptions > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                {orderCounts.prescriptions} Prescription
                {orderCounts.prescriptions !== 1 ? 's' : ''}
              </span>
            )}
            {orderCounts.labs > 0 && (
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                {orderCounts.labs} Lab Test{orderCounts.labs !== 1 ? 's' : ''}
              </span>
            )}
            {orderCounts.imaging > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                {orderCounts.imaging} Imaging Stud
                {orderCounts.imaging !== 1 ? 'ies' : 'y'}
              </span>
            )}
            {orderCounts.procedures > 0 && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                {orderCounts.procedures} Procedure
                {orderCounts.procedures !== 1 ? 's' : ''}
              </span>
            )}
            {orderCounts.referrals > 0 && (
              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-medium">
                {orderCounts.referrals} Referral
                {orderCounts.referrals !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No orders configured. Click "Edit" to add lab tests, prescriptions,
            or referrals.
          </p>
        )}
      </div>

      {/* Confirmation Message */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Ready to Submit?</p>
            <p className="text-sm text-amber-700 mt-1">
              Please review all the details above. Click on "Edit" to make
              changes to any section, or click "Complete Examination" to save
              the record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function DentalExamWizard({
  patientId,
  emrNumber,
  encounterId,
  patientName,
  encounterNumber,
  consultationId,
  facilityId,
  existingExam,
  existingChartEntries,
  onSaveExam,
  onSaveChartEntry,
  onUpdateExam,
  onClose,
  readOnly = false,
}: DentalExamWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [savedExam, setSavedExam] = useState<DentalExamDTO | null>(
    existingExam || null,
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    'left' | 'right'
  >('right');

  const [formData, setFormData] = useState<Partial<CreateDentalExamDTO>>(
    () => ({
      patient_id: patientId,
      encounter_id: encounterId,
      consultation_id: consultationId,
      facility_id: facilityId,
      // Chief Complaint
      chief_complaint: existingExam?.chief_complaint || '',
      complaint_duration: existingExam?.complaint_duration || '',
      complaint_description: existingExam?.complaint_description || '',
      pain_level: existingExam?.pain_level,
      pain_character: existingExam?.pain_character,
      // History
      dental_history: existingExam?.dental_history || '',
      medical_history: existingExam?.medical_history || '',
      allergies: existingExam?.allergies || '',
      current_medications: existingExam?.current_medications || '',
      // Oral Examination
      extraoral_findings: existingExam?.extraoral_findings || '',
      intraoral_findings: existingExam?.intraoral_findings || '',
      soft_tissue_exam: existingExam?.soft_tissue_exam || '',
      hard_tissue_exam: existingExam?.hard_tissue_exam || '',
      occlusion_notes: existingExam?.occlusion_notes || '',
      occlusion_class: existingExam?.occlusion_class,
      tmj_assessment: existingExam?.tmj_assessment || '',
      // Periodontal
      gingival_status: existingExam?.gingival_status,
      bleeding_on_probing: existingExam?.bleeding_on_probing,
      plaque_score: existingExam?.plaque_score,
      calculus_present: existingExam?.calculus_present,
      pocket_depth_notes: existingExam?.pocket_depth_notes || '',
      // Radiograph
      radiograph_taken: existingExam?.radiograph_taken,
      radiograph_type: existingExam?.radiograph_type,
      radiograph_findings: existingExam?.radiograph_findings || '',
      // Diagnosis & Plan
      provisional_diagnosis: existingExam?.provisional_diagnosis || '',
      final_diagnosis: existingExam?.final_diagnosis || '',
      icd_codes: existingExam?.icd_codes || [],
      treatment_plan: existingExam?.treatment_plan || '',
      urgency: existingExam?.urgency,
      estimated_sessions: existingExam?.estimated_sessions,
      estimated_cost: existingExam?.estimated_cost,
      // Follow-up
      follow_up_required: existingExam?.follow_up_required,
      follow_up_date: existingExam?.follow_up_date || '',
      follow_up_notes: existingExam?.follow_up_notes || '',
    }),
  );

  // =============================================================================
  // Orders State (for lab, imaging, prescriptions, procedures, referrals)
  // =============================================================================
  const [labOrders, setLabOrders] = useState<LabOrderDTO[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrderDTO[]>(
    [],
  );
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrderDTO[]>(
    [],
  );
  const [procedureOrders, setProcedureOrders] = useState<ProcedureOrderDTO[]>(
    [],
  );
  const [specialtyReferrals, setSpecialtyReferrals] =
    useState<SpecialtyReferralsState>(createDefaultSpecialtyReferrals());

  // Fetch catalogues for orders
  const { data: labTests = [] } = useLabTestCatalogue();
  const { data: imagingStudies = [], isLoading: isLoadingImaging } = useImagingCatalogue();
  const { data: drugs = [] } = useDrugCatalogue();
  const { data: procedures = [] } = useProcedureCatalogue();

  // Convert catalogues to SearchableOption format
  const labTestOptions = useMemo(
    () =>
      labTests.map((t: any) => ({
        id: t.id,
        name: t.test_name || t.name,
        code: t.test_code || t.code,
        category: t.category || 'General',
        price: t.price,
      })),
    [labTests],
  );

  const imagingOptions = useMemo(
    () =>
      imagingStudies.map((i: any) => ({
        id: i.imaging_id,
        name: i.imaging_name,
        code: i.imaging_code,
        category: i.imaging_type || 'General',
        extraInfo: i.body_part ?? undefined,
        price: i.price,
        requiresNhisAuth: i.requires_nhis_authorization || false,
      })),
    [imagingStudies],
  );

  const drugOptions = useMemo(
    () =>
      drugs.map((d: any) => ({
        id: d.id,
        name: d.drug_name || d.name,
        code: d.drug_code || d.code,
        category: d.category || 'General',
        price: d.price,
      })),
    [drugs],
  );

  const procedureOptions = useMemo(
    () =>
      procedures.map((p: any) => ({
        id: p.id,
        name: p.procedure_name || p.name,
        code: p.procedure_code || p.code,
        category: p.category || p.procedure_type || 'General',
        price: p.price,
      })),
    [procedures],
  );

  const isLastStep = currentStep === STEPS.length - 1;

  const dentalTemplateValues: Record<DentalTemplateField, string> = {
    complaint_description: formData.complaint_description || '',
    dental_history: formData.dental_history || '',
    medical_history: formData.medical_history || '',
    extraoral_findings: formData.extraoral_findings || '',
    intraoral_findings: formData.intraoral_findings || '',
    radiograph_findings: formData.radiograph_findings || '',
    provisional_diagnosis: formData.provisional_diagnosis || '',
    final_diagnosis: formData.final_diagnosis || '',
    treatment_plan: formData.treatment_plan || '',
  };

  const handleFieldChange = useCallback(
    (field: keyof CreateDentalExamDTO, value: any) => {
      if (readOnly) return;
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [readOnly],
  );

  const applyDentalTemplate = useCallback(
    (templateData: Record<string, string>) => {
      if (readOnly) return;

      setFormData((prev) => {
        const next = { ...prev };

        for (const field of DENTAL_TEMPLATE_FIELDS) {
          if (field in templateData) {
            next[field] = templateData[field] ?? '';
          }
        }

        return next;
      });
    },
    [readOnly],
  );

  const goToStep = (index: number) => {
    if (index === currentStep) return;
    setTransitionDirection(index > currentStep ? 'right' : 'left');
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(index);
      setIsTransitioning(false);
    }, 150);
  };

  const goNext = async () => {
    // Mark current step as completed
    setCompletedSteps((prev) => new Set(prev).add(STEPS[currentStep].id));

    // If on charting step, save first
    if (currentStep === 5 && !savedExam) {
      await handleSave();
    }

    if (currentStep < STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (readOnly || !formData.patient_id || !formData.encounter_id) return;

    const ordersPayload: SpecialtyOrdersPayload = {
      labOrders,
      radiologyOrders,
      prescriptions,
      procedureOrders,
      specialtyReferrals,
    };

    const sanitized: CreateDentalExamDTO = {
      ...formData,
      patient_id: formData.patient_id,
      encounter_id: formData.encounter_id,
    };

    // Omit empty optional values so Supabase stores null/defaults instead of invalid empty strings.
    const dateFields: Array<'follow_up_date'> = ['follow_up_date'];
    const numericFields: Array<
      'pain_level' | 'plaque_score' | 'estimated_sessions' | 'estimated_cost'
    > = ['pain_level', 'plaque_score', 'estimated_sessions', 'estimated_cost'];
    for (const key of dateFields) {
      if (sanitized[key] === '' || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    }
    for (const key of numericFields) {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    }

    setIsLoading(true);
    try {
      if (savedExam?.exam_id && onUpdateExam) {
        await onUpdateExam(savedExam.exam_id, sanitized, ordersPayload);
      } else {
        const newExam = await onSaveExam(sanitized, ordersPayload);
        setSavedExam(newExam);
      }
      // Mark all steps as completed on final save
      if (isLastStep) {
        setCompletedSteps(new Set(STEPS.map((s) => s.id)));
        onClose?.();
      }
    } catch (error) {
      console.error('Failed to save dental exam:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate encounter-centric requirements
  if (!encounterId || !patientId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight mb-2">
          Missing Required Information
        </h3>
        <p className="text-gray-600 text-center mb-4">
          Both Patient ID and Encounter ID are required to create a dental
          examination. All clinical records must be tied to a valid encounter.
        </p>
        <Button variant="outline" onClick={onClose}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Patient Info Header - Encounter-Centric */}
      <div className="flex items-center justify-between px-6 py-3 bg-violet-50 border-b border-violet-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Smile className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-violet-900">
              {patientName || 'Patient'}
            </p>
            <p className="text-xs text-violet-600">
              EMR: {emrNumber || patientId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {encounterNumber && (
            <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full font-medium">
              {encounterNumber}
            </span>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 bg-gray-50 min-h-full">
          <div
            className={`transition-all duration-150 ease-out ${
              isTransitioning
                ? transitionDirection === 'right'
                  ? 'opacity-0 translate-x-8'
                  : 'opacity-0 -translate-x-8'
                : 'opacity-100 translate-x-0'
            }`}
          >
            {currentStep === 0 && (
              <ComplaintStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 1 && (
              <HistoryStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 2 && (
              <ExaminationStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 3 && (
              <PeriodontalStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 4 && (
              <RadiographStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 5 && (
              <ChartingStep
                patientId={patientId}
                encounterId={encounterId}
                savedExam={savedExam}
                existingChartEntries={existingChartEntries}
                onSaveChartEntry={onSaveChartEntry}
                readOnly={readOnly}
              />
            )}
            {currentStep === 6 && (
              <DiagnosisStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 7 && (
              <SpecialtyOrdersStep
                currentSpecialty="dental"
                labOrders={labOrders}
                radiologyOrders={radiologyOrders}
                prescriptions={prescriptions}
                procedureOrders={procedureOrders}
                onLabOrdersChange={setLabOrders}
                onRadiologyOrdersChange={setRadiologyOrders}
                onPrescriptionsChange={setPrescriptions}
                onProcedureOrdersChange={setProcedureOrders}
                specialtyReferrals={specialtyReferrals}
                onSpecialtyReferralsChange={setSpecialtyReferrals}
                labTestOptions={labTestOptions}
                imagingOptions={imagingOptions}
                isLoadingImaging={isLoadingImaging}
                drugOptions={drugOptions}
                procedureOptions={procedureOptions}
                clinicalFindings={
                  formData.intraoral_findings ||
                  formData.extraoral_findings ||
                  ''
                }
                provisionalDiagnosis={formData.provisional_diagnosis || ''}
                patientName={patientName}
                readOnly={readOnly}
              />
            )}
            {currentStep === 8 && (
              <ReviewStep
                formData={formData}
                onEditStep={goToStep}
                onChange={handleFieldChange}
                orderCounts={{
                  labs: labOrders.length,
                  imaging: radiologyOrders.length,
                  prescriptions: prescriptions.length,
                  procedures: procedureOrders.length,
                  referrals: Object.values(specialtyReferrals).filter(
                    (r) => r.selected,
                  ).length,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {!readOnly && (
            <TemplateSearchPopover
              templateType="dental"
              category={DENTAL_TEMPLATE_CATEGORY}
              currentValues={dentalTemplateValues}
              onTemplateSelect={applyDentalTemplate}
            />
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>

        {/* Navigation Buttons - Grouped together */}
        <div className="flex items-center gap-3">
          {/* Back Button - Hidden on first step */}
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={goBack}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              <ChevronLeft size={18} className="mr-1" />
              Back
            </Button>
          )}

          {isLastStep ? (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isLoading || readOnly}
              className="bg-violet-600 hover:bg-violet-700 min-w-[180px]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Complete Examination
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={isLoading}
              className="bg-violet-600 hover:bg-violet-700 min-w-[100px]"
            >
              {currentStep === 5 && !savedExam ? 'Save & Continue' : 'Next'}
              <ChevronRight size={18} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
