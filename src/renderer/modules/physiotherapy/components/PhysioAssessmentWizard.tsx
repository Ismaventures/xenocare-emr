/**
 * =============================================================================
 * XENOCARE EMR - PHYSIOTHERAPY ASSESSMENT WIZARD
 * Modern step-based assessment workflow with progress indicator
 * Following SOAP methodology tailored for physiotherapy practice
 * =============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  FileText,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Loader2,
  Activity,
  CheckSquare,
  Dumbbell,
  Target,
  AlertTriangle,
  ClipboardCheck,
  Edit3,
  ShoppingCart,
  BarChart3,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import {
  SpecialtyOrdersStep,
  createDefaultSpecialtyReferrals,
  type SpecialtyReferralsState,
} from '../../specialty-common';
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import {
  useLabTestCatalogue,
  useImagingCatalogue,
  useDrugCatalogue,
  useProcedureCatalogue,
} from '../../clinical-consultation/hooks/useConsultation';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  ProcedureOrderDTO,
  PrescriptionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';
import type { SpecialtyOrdersPayload } from '../../specialty-common/utils/specialty-order-submission';
import type {
  CreatePhysioAssessmentDTO,
  PhysioAssessmentDTO,
  OnsetType,
  MobilityStatus,
  PainCharacter,
  PainPattern,
  HandDominance,
  Prognosis,
  RedFlag,
  OutcomeMeasure,
  OutcomeMeasureEntry,
} from '../types/physiotherapy.types';
import { OUTCOME_MEASURE_INFO } from '../types/physiotherapy.types';

const PHYSIO_TEMPLATE_CATEGORY = 'physio_assessment';
const PHYSIO_TEMPLATE_FIELDS = [
  'chief_complaint',
  'rom_notes',
  'muscle_strength_notes',
  'sensation_notes',
  'reflex_notes',
  'palpation_findings',
  'physio_diagnosis',
  'short_term_goals',
  'long_term_goals',
  'patient_goals',
  'prognosis_notes',
] as const;

type PhysioTemplateField = (typeof PHYSIO_TEMPLATE_FIELDS)[number];

// =============================================================================
// Types
// =============================================================================

interface PhysioAssessmentWizardProps {
  patientId: string;
  emrNumber?: string;
  encounterId: string;
  patientName?: string;
  encounterNumber?: string;
  existingAssessment?: PhysioAssessmentDTO | null;
  onSaveAssessment: (
    assessment: CreatePhysioAssessmentDTO,
    orders?: SpecialtyOrdersPayload,
  ) => Promise<PhysioAssessmentDTO>;
  onUpdateAssessment?: (
    assessmentId: string,
    assessment: Partial<CreatePhysioAssessmentDTO>,
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
// Step Configuration - Physiotherapy SOAP Methodology
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
    id: 'pain',
    title: 'Pain Assessment',
    shortTitle: 'Pain',
    icon: <Activity size={12} />,
    description: 'Pain evaluation & characteristics',
    category: 'subjective',
  },
  {
    id: 'history',
    title: 'Medical History',
    shortTitle: 'History',
    icon: <ClipboardList size={12} />,
    description: 'Medical & functional history',
    category: 'subjective',
  },
  {
    id: 'examination',
    title: 'Physical Examination',
    shortTitle: 'Exam',
    icon: <Stethoscope size={12} />,
    description: 'ROM, strength, neurological',
    category: 'objective',
  },
  {
    id: 'functional',
    title: 'Functional Assessment',
    shortTitle: 'Function',
    icon: <Dumbbell size={12} />,
    description: 'Mobility & ADL assessment',
    category: 'objective',
  },
  {
    id: 'goals',
    title: 'Goals & Plan',
    shortTitle: 'Goals',
    icon: <Target size={12} />,
    description: 'Treatment goals & prognosis',
    category: 'plan',
  },
  {
    id: 'orders',
    title: 'Orders',
    shortTitle: 'Orders',
    icon: <ShoppingCart size={12} />,
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

const ONSET_TYPE_OPTIONS: { value: OnsetType; label: string }[] = [
  { value: 'Sudden', label: 'Sudden' },
  { value: 'Gradual', label: 'Gradual' },
  { value: 'Traumatic', label: 'Traumatic' },
  { value: 'Post_Surgical', label: 'Post-Surgical' },
  { value: 'Unknown', label: 'Unknown' },
];

const MOBILITY_STATUS_OPTIONS: { value: MobilityStatus; label: string }[] = [
  { value: 'Independent', label: 'Independent' },
  { value: 'Assisted', label: 'Assisted' },
  { value: 'Dependent', label: 'Dependent' },
  { value: 'Bed_Bound', label: 'Bed Bound' },
];

const PAIN_CHARACTER_OPTIONS: { value: PainCharacter; label: string }[] = [
  { value: 'Sharp', label: 'Sharp' },
  { value: 'Dull', label: 'Dull' },
  { value: 'Burning', label: 'Burning' },
  { value: 'Aching', label: 'Aching' },
  { value: 'Shooting', label: 'Shooting' },
  { value: 'Throbbing', label: 'Throbbing' },
  { value: 'Cramping', label: 'Cramping' },
  { value: 'Stiffness', label: 'Stiffness' },
];

const PAIN_PATTERN_OPTIONS: { value: PainPattern; label: string }[] = [
  { value: 'Constant', label: 'Constant' },
  { value: 'Intermittent', label: 'Intermittent' },
  { value: 'Activity_Related', label: 'Activity Related' },
  { value: 'Positional', label: 'Positional' },
  { value: 'Morning_Stiffness', label: 'Morning Stiffness' },
  { value: 'Night_Pain', label: 'Night Pain' },
];

const HAND_DOMINANCE_OPTIONS: { value: HandDominance; label: string }[] = [
  { value: 'Right', label: 'Right' },
  { value: 'Left', label: 'Left' },
  { value: 'Ambidextrous', label: 'Ambidextrous' },
];

const PROGNOSIS_OPTIONS: { value: Prognosis; label: string }[] = [
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' },
  { value: 'Guarded', label: 'Guarded' },
  { value: 'Poor', label: 'Poor' },
];

const RED_FLAGS: RedFlag[] = [
  'Cauda Equina Syndrome',
  'Spinal Cord Compression',
  'Fracture',
  'Malignancy',
  'Infection',
  'Inflammatory Arthritis',
  'Abdominal Aortic Aneurysm',
  'Severe/Progressive Neurological Deficit',
  'Unexplained Weight Loss',
  'Bladder/Bowel Dysfunction',
  'Saddle Anesthesia',
  'Bilateral Leg Weakness',
];

// =============================================================================
// Modern Interactive UI Components
// =============================================================================

type AccordionColor = 'blue' | 'green' | 'orange' | 'red' | 'indigo';

const ACCENT_BORDER: Record<AccordionColor, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  orange: 'border-l-amber-500',
  red: 'border-l-rose-500',
  indigo: 'border-l-indigo-500',
};

const STATUS_DOT: Record<string, string> = {
  empty: 'bg-gray-300',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

// Shared modern input class
const INPUT_CLS =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-sm placeholder:text-gray-300';

function getSectionStatus(fields: unknown[]): 'empty' | 'partial' | 'complete' {
  const filled = fields.filter((f) => {
    if (Array.isArray(f)) return f.length > 0;
    return f !== undefined && f !== null && f !== '' && f !== false;
  });
  if (filled.length === 0) return 'empty';
  if (filled.length === fields.length) return 'complete';
  return 'partial';
}

/** Modern flat accordion with colored left accent and animated expand */
function AccordionSection({
  title,
  subtitle,
  icon,
  color,
  status,
  preview,
  defaultOpen = false,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: AccordionColor;
  status: 'empty' | 'partial' | 'complete';
  preview?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-l-[3px] ${ACCENT_BORDER[color]} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3.5 px-5 py-4 group"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]} ${status === 'partial' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">{title}</h3>
            {status === 'complete' && (
              <Check size={13} className="text-emerald-500" />
            )}
          </div>
          {!isOpen && preview ? (
            <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">{preview}</p>
          ) : !isOpen && subtitle ? (
            <p className="text-xs text-gray-300 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {isOpen && actions && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {actions}
          </div>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1">
            {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Clickable pill/chip selector for short option lists */
function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value?: T;
  onChange: (val: T | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            if (disabled) return;
            onChange(value === opt.value ? undefined : opt.value);
          }}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            value === opt.value
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Interactive NRS pain scale (0-10) with color gradient */
function PainScale({
  value,
  onChange,
  disabled,
  label,
}: {
  value?: number;
  onChange: (val: number | undefined) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">{label}</label>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const isSelected = value === n;
          const bg = n <= 3 ? 'bg-emerald-500' : n <= 6 ? 'bg-amber-500' : 'bg-rose-500';
          const ring = n <= 3 ? 'ring-emerald-200' : n <= 6 ? 'ring-amber-200' : 'ring-rose-200';
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                if (!disabled) onChange(isSelected ? undefined : n);
              }}
              disabled={disabled}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
                isSelected
                  ? `${bg} text-white ring-2 ring-offset-1 ${ring} scale-110`
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Modern toggle switch for boolean fields */
function ToggleField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white'
      }`}
    >
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        disabled={disabled}
        className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : ''
          }`}
        />
      </button>
    </label>
  );
}

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
    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
      {/* Slim progress rail */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-teal-600 tabular-nums">
          {progressPercentage}%
        </span>
      </div>

      {/* Pill step indicators */}
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const isPast = index < currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(index)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : isPast
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              {isCompleted ? (
                <Check size={11} className="text-emerald-600" />
              ) : (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-white/20' : 'bg-gray-200/60'
                }`}>
                  {index + 1}
                </span>
              )}
              <span className="hidden lg:inline">{step.shortTitle}</span>
            </button>
          );
        })}
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
  formData: Partial<PhysioAssessmentDTO>;
  onChange: (field: keyof PhysioAssessmentDTO, value: any) => void;
  readOnly: boolean;
}) {
  const complaintPreview = [
    formData.chief_complaint,
    formData.complaint_duration ? `${formData.complaint_duration}` : '',
    formData.onset_type,
  ].filter(Boolean).join(' • ') || undefined;

  const referralPreview = [
    formData.referral_source ? `From: ${formData.referral_source}` : '',
    formData.referral_diagnosis,
  ].filter(Boolean).join(' • ') || undefined;

  return (
    <div className="space-y-3">
      <AccordionSection
        title="Chief Complaint"
        subtitle="Primary reason for physiotherapy referral"
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.chief_complaint, formData.complaint_duration, formData.onset_type, formData.onset_date, formData.mechanism_of_injury])}
        preview={complaintPreview}
        defaultOpen
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Chief Complaint <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={formData.chief_complaint || ''}
              onChange={(e) => onChange('chief_complaint', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={3}
              placeholder="Describe the patient's main complaint..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Duration
            </label>
            <input
              type="text"
              value={formData.complaint_duration || ''}
              onChange={(e) => onChange('complaint_duration', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 3 months"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Onset Type
            </label>
            <ChipSelect
              options={ONSET_TYPE_OPTIONS}
              value={formData.onset_type}
              onChange={(val) => onChange('onset_type', val)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Onset Date
            </label>
            <input
              type="date"
              value={formData.onset_date || ''}
              onChange={(e) => onChange('onset_date', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Mechanism of Injury
            </label>
            <textarea
              value={formData.mechanism_of_injury || ''}
              onChange={(e) => onChange('mechanism_of_injury', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="How did the injury/condition occur..."
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Referral Information"
        subtitle="Source of referral and diagnosis"
        icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.referral_source, formData.referral_diagnosis])}
        preview={referralPreview}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Referral Source
            </label>
            <input
              type="text"
              value={formData.referral_source || ''}
              onChange={(e) => onChange('referral_source', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., Dr. Smith / GOPD"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Referral Diagnosis
            </label>
            <input
              type="text"
              value={formData.referral_diagnosis || ''}
              onChange={(e) => onChange('referral_diagnosis', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Diagnosis from referring physician"
            />
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// Step 2: Pain Assessment
function PainStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<PhysioAssessmentDTO>;
  onChange: (field: keyof PhysioAssessmentDTO, value: any) => void;
  readOnly: boolean;
}) {
  const painPreview = [
    formData.pain_score != null ? `Pain ${formData.pain_score}/10` : '',
    formData.pain_location,
    formData.pain_character,
    formData.pain_pattern,
  ].filter(Boolean).join(' • ') || undefined;

  return (
    <div className="space-y-3">
      <AccordionSection
        title="Pain Assessment"
        subtitle="Comprehensive pain evaluation"
        icon={<Activity className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.pain_location, formData.pain_score, formData.pain_character, formData.pain_pattern])}
        preview={painPreview}
        defaultOpen
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pain Location
            </label>
            <textarea
              value={formData.pain_location || ''}
              onChange={(e) => onChange('pain_location', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Describe the location and distribution of pain..."
            />
          </div>

          {/* Visual NRS Pain Scales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <PainScale label="Current Pain" value={formData.pain_score} onChange={(v) => onChange('pain_score', v)} disabled={readOnly} />
            <PainScale label="At Rest" value={formData.pain_at_rest} onChange={(v) => onChange('pain_at_rest', v)} disabled={readOnly} />
            <PainScale label="On Activity" value={formData.pain_on_activity} onChange={(v) => onChange('pain_on_activity', v)} disabled={readOnly} />
            <PainScale label="Worst Pain" value={formData.pain_worst} onChange={(v) => onChange('pain_worst', v)} disabled={readOnly} />
            <PainScale label="Best Pain" value={formData.pain_best} onChange={(v) => onChange('pain_best', v)} disabled={readOnly} />
          </div>

          {/* Chip selectors for character & pattern */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Pain Character
              </label>
              <ChipSelect
                options={PAIN_CHARACTER_OPTIONS}
                value={formData.pain_character}
                onChange={(val) => onChange('pain_character', val)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Pain Pattern
              </label>
              <ChipSelect
                options={PAIN_PATTERN_OPTIONS}
                value={formData.pain_pattern}
                onChange={(val) => onChange('pain_pattern', val)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Pain Radiation
              </label>
              <input
                type="text"
                value={formData.pain_radiation || ''}
                onChange={(e) => onChange('pain_radiation', e.target.value)}
                disabled={readOnly}
                className={INPUT_CLS}
                placeholder="Does pain radiate? Where?"
              />
            </div>

            <ToggleField
              label="Night Pain Present"
              checked={formData.night_pain || false}
              onChange={(val) => onChange('night_pain', val)}
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Aggravating Factors
              </label>
              <textarea
                value={formData.aggravating_factors || ''}
                onChange={(e) =>
                  onChange('aggravating_factors', e.target.value)
                }
                disabled={readOnly}
                className={INPUT_CLS}
                rows={2}
                placeholder="What makes the pain worse?"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Relieving Factors
              </label>
              <textarea
                value={formData.relieving_factors || ''}
                onChange={(e) => onChange('relieving_factors', e.target.value)}
                disabled={readOnly}
                className={INPUT_CLS}
                rows={2}
                placeholder="What makes the pain better?"
              />
            </div>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// Step 3: Medical History
function HistoryStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<PhysioAssessmentDTO>;
  onChange: (field: keyof PhysioAssessmentDTO, value: any) => void;
  readOnly: boolean;
}) {
  const medicalPreview = [
    formData.medical_history,
    formData.medications ? `Meds: ${formData.medications}` : '',
  ].filter(Boolean).join(' | ') || undefined;

  const occupationPreview = [
    formData.occupation,
    formData.hobbies,
    formData.hand_dominance,
  ].filter(Boolean).join(' • ') || undefined;

  return (
    <div className="space-y-3">
      <AccordionSection
        title="Medical History"
        subtitle="Relevant medical and surgical history"
        icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.medical_history, formData.surgical_history, formData.medications, formData.allergies])}
        preview={medicalPreview}
        defaultOpen
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              placeholder="Diabetes, hypertension, cardiac conditions..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Surgical History
            </label>
            <textarea
              value={formData.surgical_history || ''}
              onChange={(e) => onChange('surgical_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Previous surgeries relevant to condition..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Current Medications
            </label>
            <textarea
              value={formData.medications || ''}
              onChange={(e) => onChange('medications', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Pain medications, anti-inflammatories..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Allergies
              <span className="ml-2 text-xs text-rose-400 font-normal">
                (Important)
              </span>
            </label>
            <textarea
              value={formData.allergies || ''}
              onChange={(e) => onChange('allergies', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Drug allergies, latex..."
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Occupational & Lifestyle"
        subtitle="Work and activity information"
        icon={<Dumbbell className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.occupation, formData.hobbies, formData.hand_dominance])}
        preview={occupationPreview}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Occupation
            </label>
            <input
              type="text"
              value={formData.occupation || ''}
              onChange={(e) => onChange('occupation', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Job / Work type"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Hobbies
            </label>
            <input
              type="text"
              value={formData.hobbies || ''}
              onChange={(e) => onChange('hobbies', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Sports, activities..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Hand Dominance
            </label>
            <ChipSelect
              options={HAND_DOMINANCE_OPTIONS}
              value={formData.hand_dominance}
              onChange={(val) => onChange('hand_dominance', val)}
              disabled={readOnly}
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Previous Treatment"
        subtitle="Prior physiotherapy or treatments"
        icon={<Activity className="h-5 w-5 text-blue-600" />}
        color="blue"
        status={getSectionStatus([formData.previous_physio_treatment, formData.previous_treatment_details])}
        preview={formData.previous_physio_treatment ? formData.previous_treatment_details || 'Previous physio received' : undefined}
      >
        <div className="space-y-4">
          <ToggleField
            label="Previous Physiotherapy Treatment"
            checked={formData.previous_physio_treatment || false}
            onChange={(val) => onChange('previous_physio_treatment', val)}
            disabled={readOnly}
          />

          {formData.previous_physio_treatment && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Treatment Details
                </label>
                <textarea
                  value={formData.previous_treatment_details || ''}
                  onChange={(e) =>
                    onChange('previous_treatment_details', e.target.value)
                  }
                  disabled={readOnly}
                  className={INPUT_CLS}
                  rows={2}
                  placeholder="What treatment was received?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Response to Treatment
                </label>
                <textarea
                  value={formData.previous_treatment_response || ''}
                  onChange={(e) =>
                    onChange('previous_treatment_response', e.target.value)
                  }
                  disabled={readOnly}
                  className={INPUT_CLS}
                  rows={2}
                  placeholder="How did patient respond?"
                />
              </div>
            </div>
          )}
        </div>
      </AccordionSection>
    </div>
  );
}

// Step 4: Physical Examination
function ExaminationStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<PhysioAssessmentDTO>;
  onChange: (field: keyof PhysioAssessmentDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-3">
      <AccordionSection
        title="Posture Assessment"
        subtitle="Standing and sitting posture"
        icon={<Stethoscope className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.posture_standing, formData.posture_sitting, formData.posture_deviations])}
        preview={formData.posture_deviations || formData.posture_standing || undefined}
        defaultOpen
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Standing Posture
            </label>
            <textarea
              value={formData.posture_standing || ''}
              onChange={(e) => onChange('posture_standing', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Describe standing posture..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Sitting Posture
            </label>
            <textarea
              value={formData.posture_sitting || ''}
              onChange={(e) => onChange('posture_sitting', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Describe sitting posture..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Postural Deviations
            </label>
            <textarea
              value={formData.posture_deviations || ''}
              onChange={(e) => onChange('posture_deviations', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Kyphosis, lordosis, scoliosis, forward head..."
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Range of Motion"
        subtitle="Active and passive range assessment"
        icon={<Activity className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.rom_joint, formData.rom_notes])}
        preview={formData.rom_joint ? `Joint: ${formData.rom_joint}` : undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Joint Assessed
            </label>
            <input
              type="text"
              value={formData.rom_joint || ''}
              onChange={(e) => onChange('rom_joint', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., Lumbar spine, Shoulder, Knee"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              ROM Notes
            </label>
            <textarea
              value={formData.rom_notes || ''}
              onChange={(e) => onChange('rom_notes', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Active/passive ROM, limitations, end feel..."
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Muscle Strength (MRC)"
        subtitle="Manual muscle testing"
        icon={<Dumbbell className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.muscle_strength_notes])}
        preview={formData.muscle_strength_notes || undefined}
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Strength Assessment
          </label>
          <textarea
            value={formData.muscle_strength_notes || ''}
            onChange={(e) => onChange('muscle_strength_notes', e.target.value)}
            disabled={readOnly}
            className={INPUT_CLS}
            rows={3}
            placeholder="Document muscle groups tested and grades (0-5)..."
          />
        </div>
      </AccordionSection>

      <AccordionSection
        title="Neurological Assessment"
        subtitle="Sensation, reflexes, neural tension"
        icon={<Activity className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.sensation_notes, formData.reflex_notes, formData.neural_tension_tests])}
        preview={formData.sensation_notes || formData.reflex_notes || undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Sensation Notes
            </label>
            <textarea
              value={formData.sensation_notes || ''}
              onChange={(e) => onChange('sensation_notes', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Dermatome testing, sensory deficits..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Reflex Notes
            </label>
            <textarea
              value={formData.reflex_notes || ''}
              onChange={(e) => onChange('reflex_notes', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Deep tendon reflexes tested..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Neural Tension Tests
            </label>
            <textarea
              value={formData.neural_tension_tests || ''}
              onChange={(e) => onChange('neural_tension_tests', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="SLR, Slump, ULTT results..."
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Palpation Findings"
        subtitle="Soft tissue and bony palpation"
        icon={<Stethoscope className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.palpation_findings, formData.trigger_points])}
        preview={formData.palpation_findings || undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Palpation Findings
            </label>
            <textarea
              value={formData.palpation_findings || ''}
              onChange={(e) => onChange('palpation_findings', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Muscle tightness, spasm, tenderness..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Trigger Points
            </label>
            <textarea
              value={formData.trigger_points || ''}
              onChange={(e) => onChange('trigger_points', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Location of trigger points..."
            />
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// Step 5: Functional Assessment
function FunctionalStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<PhysioAssessmentDTO>;
  onChange: (field: keyof PhysioAssessmentDTO, value: any) => void;
  readOnly: boolean;
}) {
  const measures = (formData.outcome_measures as OutcomeMeasureEntry[] | undefined) || [];
  const functionalPreview = [
    formData.mobility_status,
    formData.gait_pattern,
    formData.functional_status,
  ].filter(Boolean).join(' • ') || undefined;

  const outcomesPreview = measures.length > 0
    ? `${measures.length} measure${measures.length > 1 ? 's' : ''}: ${measures.map(m => {
        const info = OUTCOME_MEASURE_INFO[m.measure];
        return `${info?.label || m.measure}${m.score != null ? ` ${m.score}` : ''}`;
      }).join(', ')}`
    : undefined;

  const flagCount = formData.red_flags?.length || 0;
  const redFlagsPreview = flagCount > 0
    ? `⚠ ${flagCount} flagged: ${formData.red_flags!.join(', ')}`
    : undefined;

  return (
    <div className="space-y-3">
      <AccordionSection
        title="Functional Assessment"
        subtitle="Mobility and ADL assessment"
        icon={<Dumbbell className="h-5 w-5 text-green-600" />}
        color="green"
        status={getSectionStatus([formData.mobility_status, formData.gait_pattern, formData.functional_status, formData.adl_status, formData.balance_assessment, formData.fall_history])}
        preview={functionalPreview}
        defaultOpen
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Mobility Status
            </label>
            <ChipSelect
              options={MOBILITY_STATUS_OPTIONS}
              value={formData.mobility_status}
              onChange={(val) => onChange('mobility_status', val)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Gait Pattern
            </label>
            <input
              type="text"
              value={formData.gait_pattern || ''}
              onChange={(e) => onChange('gait_pattern', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Normal, antalgic, Trendelenburg..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Functional Status
            </label>
            <textarea
              value={formData.functional_status || ''}
              onChange={(e) => onChange('functional_status', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Current functional limitations..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              ADL Status
            </label>
            <textarea
              value={formData.adl_status || ''}
              onChange={(e) => onChange('adl_status', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Dressing, bathing, transfers..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Balance Assessment
            </label>
            <textarea
              value={formData.balance_assessment || ''}
              onChange={(e) => onChange('balance_assessment', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Static/dynamic balance, Berg score..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Fall History
            </label>
            <textarea
              value={formData.fall_history || ''}
              onChange={(e) => onChange('fall_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Previous falls, circumstances..."
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Outcome Measures (ICF Standards)"
        subtitle="Standardised baseline measures aligned with ICF framework"
        icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
        color="indigo"
        status={getSectionStatus([measures.length > 0 ? measures : undefined])}
        preview={outcomesPreview}
        actions={
          !readOnly ? (
            <button
              type="button"
              onClick={() => {
                onChange('outcome_measures', [
                  ...measures,
                  { measure: 'NRS' as OutcomeMeasure, score: null, baseline_score: null, icf_domain: 'Body_Functions', notes: '' },
                ]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
            >
              <Plus size={14} />
              Add Measure
            </button>
          ) : undefined
        }
      >
        {/* ICF Domain Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'Body_Functions', label: 'Body Functions', color: 'bg-rose-100 text-rose-700' },
            { key: 'Activity', label: 'Activity', color: 'bg-amber-100 text-amber-700' },
            { key: 'Participation', label: 'Participation', color: 'bg-emerald-100 text-emerald-700' },
          ] as const).map((d) => (
            <span key={d.key} className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.color}`}>
              {d.label}
            </span>
          ))}
        </div>

        {measures.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No outcome measures added yet. Click &quot;Add Measure&quot; to record baseline scores.
          </div>
        ) : (
          <div className="space-y-3">
            {measures.map((entry, idx) => {
              const info = OUTCOME_MEASURE_INFO[entry.measure];
              const domainColor =
                entry.icf_domain === 'Body_Functions' ? 'border-l-rose-400' :
                entry.icf_domain === 'Participation' ? 'border-l-emerald-400' :
                'border-l-amber-400';
              return (
                <div key={idx} className={`bg-white border border-gray-100 border-l-[3px] ${domainColor} rounded-2xl p-4 shadow-sm`}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Measure</label>
                      <select
                        value={entry.measure}
                        onChange={(e) => {
                          const updated = [...measures];
                          const selected = e.target.value as OutcomeMeasure;
                          const newInfo = OUTCOME_MEASURE_INFO[selected];
                          updated[idx] = { ...updated[idx], measure: selected, icf_domain: newInfo?.icf_domain || 'Activity' };
                          onChange('outcome_measures', updated);
                        }}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
                      >
                        <optgroup label="Pain & Impairment (Body Functions)">
                          {(['VAS', 'NRS', 'McGill_Pain', 'MAS', 'NIHSS', 'FMA'] as OutcomeMeasure[]).map(m => (
                            <option key={m} value={m}>{OUTCOME_MEASURE_INFO[m].label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Region-Specific (Activity)">
                          {(['ODI', 'NDI', 'DASH', 'QuickDASH', 'LEFS', 'SPADI'] as OutcomeMeasure[]).map(m => (
                            <option key={m} value={m}>{OUTCOME_MEASURE_INFO[m].label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Joint-Specific (Activity)">
                          {(['KOOS', 'WOMAC', 'HOOS', 'FAAM'] as OutcomeMeasure[]).map(m => (
                            <option key={m} value={m}>{OUTCOME_MEASURE_INFO[m].label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Balance & Mobility (Performance)">
                          {(['TUG', 'Berg_Balance', '6MWT', '10MWT', 'DGI', 'FRT'] as OutcomeMeasure[]).map(m => (
                            <option key={m} value={m}>{OUTCOME_MEASURE_INFO[m].label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Independence & Participation">
                          {(['Barthel_Index', 'FIM', 'WHODAS', 'SF36', 'EQ5D', 'PSFS', 'GAS', 'GROC'] as OutcomeMeasure[]).map(m => (
                            <option key={m} value={m}>{OUTCOME_MEASURE_INFO[m].label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Score <span className="text-gray-400">({info?.score_range})</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={entry.score ?? ''}
                        onChange={(e) => {
                          const updated = [...measures];
                          updated[idx] = { ...updated[idx], score: e.target.value ? parseFloat(e.target.value) : null };
                          onChange('outcome_measures', updated);
                        }}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
                        placeholder="Score"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Baseline</label>
                      <input
                        type="number"
                        step="any"
                        value={entry.baseline_score ?? ''}
                        onChange={(e) => {
                          const updated = [...measures];
                          updated[idx] = { ...updated[idx], baseline_score: e.target.value ? parseFloat(e.target.value) : null };
                          onChange('outcome_measures', updated);
                        }}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
                        placeholder="Baseline"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                      <input
                        type="text"
                        value={entry.notes || ''}
                        onChange={(e) => {
                          const updated = [...measures];
                          updated[idx] = { ...updated[idx], notes: e.target.value };
                          onChange('outcome_measures', updated);
                        }}
                        disabled={readOnly}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-0"
                        placeholder={info?.interpretation || 'Notes'}
                      />
                    </div>
                    {!readOnly && (
                      <div className="md:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...measures];
                            updated.splice(idx, 1);
                            onChange('outcome_measures', updated);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4"
                          title="Remove measure"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccordionSection>

      <AccordionSection
        title="Red Flags Screening"
        subtitle="Check for serious pathology indicators"
        icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        color="red"
        status={flagCount > 0 ? 'complete' : 'empty'}
        preview={redFlagsPreview}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RED_FLAGS.map((flag) => {
            const isPositive = formData.red_flags?.includes(flag) || false;
            return (
              <div
                key={flag}
                className={`flex items-center justify-between gap-3 px-4 py-3 bg-white border-2 rounded-xl transition-colors ${
                  isPositive ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <span className="text-sm font-medium text-gray-700 flex-1">
                  {flag}
                </span>
                <select
                  value={isPositive ? 'Positive' : 'Not Assessed'}
                  onChange={(e) => {
                    const current = formData.red_flags || [];
                    if (e.target.value === 'Positive') {
                      if (!current.includes(flag)) {
                        onChange('red_flags', [...current, flag]);
                      }
                    } else {
                      onChange(
                        'red_flags',
                        current.filter((f: RedFlag) => f !== flag),
                      );
                    }
                  }}
                  disabled={readOnly}
                  className={`px-3 py-1.5 border-2 rounded-lg text-sm font-medium focus:ring-0 transition-colors min-w-[140px] ${
                    isPositive
                      ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-500'
                      : 'border-gray-200 text-gray-600 focus:border-gray-400'
                  }`}
                >
                  <option value="Not Assessed">Not Assessed</option>
                  <option value="Negative">Negative</option>
                  <option value="Positive">Positive</option>
                </select>
              </div>
            );
          })}
        </div>

        {flagCount > 0 && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-xl">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium text-sm">
                Red flags identified - Consider medical referral
              </span>
            </div>
          </div>
        )}
      </AccordionSection>
    </div>
  );
}

// Step 6: Goals & Plan
function GoalsStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<PhysioAssessmentDTO>;
  onChange: (field: keyof PhysioAssessmentDTO, value: any) => void;
  readOnly: boolean;
}) {
  const diagnosisPreview = formData.physio_diagnosis || undefined;
  const goalsPreview = [formData.short_term_goals, formData.long_term_goals]
    .filter(Boolean).map((g, i) => `${i === 0 ? 'STG' : 'LTG'}: ${(g as string).slice(0, 40)}`).join(' | ') || undefined;
  const prognosisPreview = [
    formData.prognosis,
    formData.estimated_sessions ? `${formData.estimated_sessions} sessions` : null,
    formData.estimated_duration_weeks ? `${formData.estimated_duration_weeks} weeks` : null,
  ].filter(Boolean).join(' • ') || undefined;

  return (
    <div className="space-y-3">
      <AccordionSection
        title="Physiotherapy Diagnosis"
        subtitle="Clinical impression and problem list"
        icon={<ClipboardList className="h-5 w-5 text-orange-600" />}
        color="orange"
        status={getSectionStatus([formData.physio_diagnosis])}
        preview={diagnosisPreview}
        defaultOpen
      >
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Physiotherapy Diagnosis <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={formData.physio_diagnosis || ''}
            onChange={(e) => onChange('physio_diagnosis', e.target.value)}
            disabled={readOnly}
            className={INPUT_CLS}
            rows={2}
            placeholder="Clinical diagnosis based on assessment findings..."
          />
        </div>
      </AccordionSection>

      <AccordionSection
        title="Treatment Goals"
        subtitle="Short-term and long-term objectives"
        icon={<Target className="h-5 w-5 text-orange-600" />}
        color="orange"
        status={getSectionStatus([formData.short_term_goals, formData.long_term_goals, formData.patient_goals])}
        preview={goalsPreview}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Short-Term Goals (2-4 weeks)
            </label>
            <textarea
              value={formData.short_term_goals || ''}
              onChange={(e) => onChange('short_term_goals', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Pain reduction, ROM improvement..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Long-Term Goals (6-12 weeks)
            </label>
            <textarea
              value={formData.long_term_goals || ''}
              onChange={(e) => onChange('long_term_goals', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Return to work, full function..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Patient Goals
            </label>
            <textarea
              value={formData.patient_goals || ''}
              onChange={(e) => onChange('patient_goals', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="What does the patient want to achieve?"
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Prognosis & Treatment Plan"
        subtitle="Expected outcome and session planning"
        icon={<CheckSquare className="h-5 w-5 text-orange-600" />}
        color="orange"
        status={getSectionStatus([formData.prognosis, formData.estimated_sessions, formData.precautions, formData.contraindications])}
        preview={prognosisPreview}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Prognosis
            </label>
            <ChipSelect
              options={PROGNOSIS_OPTIONS}
              value={formData.prognosis}
              onChange={(val) => onChange('prognosis', val)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Estimated Sessions
            </label>
            <input
              type="number"
              min={1}
              value={formData.estimated_sessions ?? ''}
              onChange={(e) =>
                onChange(
                  'estimated_sessions',
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Number of sessions"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Duration (weeks)
            </label>
            <input
              type="number"
              min={1}
              value={formData.estimated_duration_weeks ?? ''}
              onChange={(e) =>
                onChange(
                  'estimated_duration_weeks',
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Treatment duration"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Prognosis Notes
          </label>
          <textarea
            value={formData.prognosis_notes || ''}
            onChange={(e) => onChange('prognosis_notes', e.target.value)}
            disabled={readOnly}
            className={INPUT_CLS}
            rows={2}
            placeholder="Factors affecting prognosis..."
          />
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Precautions
            </label>
            <textarea
              value={formData.precautions || ''}
              onChange={(e) => onChange('precautions', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Treatment precautions..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Contraindications
            </label>
            <textarea
              value={formData.contraindications || ''}
              onChange={(e) => onChange('contraindications', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Treatments to avoid..."
            />
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// =============================================================================
// Step 7: Review Step
// =============================================================================

function ReviewStep({
  formData,
  onEditStep,
  onChange,
  orderCounts,
}: {
  formData: Partial<PhysioAssessmentDTO>;
  onEditStep: (stepIndex: number) => void;
  onChange?: (field: keyof PhysioAssessmentDTO, value: any) => void;
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
        className={`bg-gradient-to-br ${isEditing ? 'from-teal-50 to-white border-teal-300 ring-2 ring-teal-200' : `from-${color}-50 to-white border-${color}-100`} rounded-xl border p-4 transition-all`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${isEditing ? 'bg-teal-100' : `bg-${color}-100`} rounded-lg`}
            >
              {icon}
            </div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {isEditing && (
              <span className="px-2 py-0.5 bg-teal-600 text-white text-xs font-bold rounded uppercase">
                Editing
              </span>
            )}
          </div>
          <button
            onClick={handleEditClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isEditing
                ? 'bg-teal-600 text-white hover:bg-teal-700'
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
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Review Assessment Details</h2>
            <p className="text-teal-100 text-sm">
              Please verify all information before submitting
            </p>
          </div>
        </div>
      </div>

      {/* Chief Complaint */}
      <ReviewSection
        title="Chief Complaint"
        stepIndex={0}
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        color="blue"
      >
        <div className="col-span-2 lg:col-span-3">
          <Field label="Chief Complaint" value={formData.chief_complaint} />
        </div>
        <Field label="Duration" value={formData.complaint_duration} />
        <Field label="Onset" value={formData.onset_type} />
        <Field
          label="Mechanism of Injury"
          value={formData.mechanism_of_injury}
        />
        <Field label="Referral Source" value={formData.referral_source} />
        <Field label="Referral Diagnosis" value={formData.referral_diagnosis} />
      </ReviewSection>

      {/* Pain Assessment */}
      <ReviewSection
        title="Pain Assessment"
        stepIndex={1}
        icon={<Activity className="h-5 w-5 text-blue-600" />}
        color="blue"
      >
        <Field
          label="Pain Score"
          value={formData.pain_score ? `${formData.pain_score}/10` : undefined}
        />
        <Field
          label="Pain at Rest"
          value={
            formData.pain_at_rest ? `${formData.pain_at_rest}/10` : undefined
          }
        />
        <Field
          label="Pain on Activity"
          value={
            formData.pain_on_activity
              ? `${formData.pain_on_activity}/10`
              : undefined
          }
        />
        <Field
          label="Worst Pain"
          value={formData.pain_worst ? `${formData.pain_worst}/10` : undefined}
        />
        <Field
          label="Best Pain"
          value={formData.pain_best ? `${formData.pain_best}/10` : undefined}
        />
        <Field label="Pain Pattern" value={formData.pain_pattern} />
        <Field
          label="Night Pain"
          value={
            formData.night_pain
              ? 'Yes'
              : formData.night_pain === false
                ? 'No'
                : undefined
          }
        />
        <Field
          label="Aggravating Factors"
          value={formData.aggravating_factors}
        />
        <Field label="Relieving Factors" value={formData.relieving_factors} />
      </ReviewSection>

      {/* Medical History */}
      <ReviewSection
        title="Medical History"
        stepIndex={2}
        icon={<ClipboardList className="h-5 w-5 text-blue-600" />}
        color="blue"
      >
        <Field label="Medical History" value={formData.medical_history} />
        <Field label="Surgical History" value={formData.surgical_history} />
        <Field label="Medications" value={formData.medications} />
        <Field label="Allergies" value={formData.allergies} />
        <Field label="Occupation" value={formData.occupation} />
        <Field label="Hobbies" value={formData.hobbies} />
        <Field
          label="Previous Physio"
          value={
            formData.previous_physio_treatment
              ? 'Yes'
              : formData.previous_physio_treatment === false
                ? 'No'
                : undefined
          }
        />
        <Field
          label="Previous Treatment Details"
          value={formData.previous_treatment_details}
        />
      </ReviewSection>

      {/* Physical Examination */}
      <ReviewSection
        title="Physical Examination"
        stepIndex={3}
        icon={<Stethoscope className="h-5 w-5 text-green-600" />}
        color="green"
      >
        <Field label="Standing Posture" value={formData.posture_standing} />
        <Field label="Sitting Posture" value={formData.posture_sitting} />
        <Field
          label="Postural Deviations"
          value={formData.posture_deviations}
        />
        <Field label="Joint Assessed" value={formData.rom_joint} />
        <Field label="ROM Notes" value={formData.rom_notes} />
        <Field label="Muscle Strength" value={formData.muscle_strength_notes} />
        <Field label="Sensation" value={formData.sensation_notes} />
        <Field label="Reflexes" value={formData.reflex_notes} />
        <Field label="Neural Tension" value={formData.neural_tension_tests} />
        <Field label="Palpation" value={formData.palpation_findings} />
        <Field label="Trigger Points" value={formData.trigger_points} />
      </ReviewSection>

      {/* Functional Assessment */}
      <ReviewSection
        title="Functional Assessment"
        stepIndex={4}
        icon={<Dumbbell className="h-5 w-5 text-green-600" />}
        color="green"
      >
        <Field label="Mobility Status" value={formData.mobility_status} />
        <Field label="Gait Pattern" value={formData.gait_pattern} />
        <Field label="Functional Status" value={formData.functional_status} />
        <Field label="ADL Status" value={formData.adl_status} />
        <Field label="Balance" value={formData.balance_assessment} />
        <Field label="Fall History" value={formData.fall_history} />
        {((formData.outcome_measures as OutcomeMeasureEntry[] | undefined) || []).length > 0 && (
          <div className="col-span-2 lg:col-span-3">
            <Field
              label="Outcome Measures"
              value={((formData.outcome_measures as OutcomeMeasureEntry[] | undefined) || [])
                .map((e) => {
                  const info = OUTCOME_MEASURE_INFO[e.measure];
                  return `${info?.label || e.measure}: ${e.score ?? 'N/A'} (${info?.score_range || ''})`;
                })
                .join('; ')}
            />
          </div>
        )}
        <div className="col-span-2 lg:col-span-3">
          <Field label="Red Flags" value={formData.red_flags?.join(', ')} />
        </div>
      </ReviewSection>

      {/* Goals & Plan */}
      <ReviewSection
        title="Goals & Plan"
        stepIndex={5}
        icon={<Target className="h-5 w-5 text-orange-600" />}
        color="orange"
      >
        <div className="col-span-2 lg:col-span-3">
          <Field
            label="Physiotherapy Diagnosis"
            value={formData.physio_diagnosis}
          />
        </div>
        <Field label="Short-Term Goals" value={formData.short_term_goals} />
        <Field label="Long-Term Goals" value={formData.long_term_goals} />
        <Field label="Patient Goals" value={formData.patient_goals} />
        <Field label="Prognosis" value={formData.prognosis} />
        <Field label="Est. Sessions" value={formData.estimated_sessions} />
        <Field
          label="Duration (weeks)"
          value={formData.estimated_duration_weeks}
        />
        <Field label="Prognosis Notes" value={formData.prognosis_notes} />
        <Field label="Precautions" value={formData.precautions} />
        <Field label="Contraindications" value={formData.contraindications} />
      </ReviewSection>

      {/* Orders Summary Note */}
      <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl border border-orange-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Orders Summary
            </h3>
            <p className="text-sm text-gray-500">
              Prescriptions, Labs, Imaging, Procedures, and Referrals
            </p>
          </div>
          <button
            onClick={() => onEditStep(6)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
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
              <span className="px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                {orderCounts.prescriptions} Prescription
                {orderCounts.prescriptions > 1 ? 's' : ''}
              </span>
            )}
            {orderCounts.labs > 0 && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {orderCounts.labs} Lab Test{orderCounts.labs > 1 ? 's' : ''}
              </span>
            )}
            {orderCounts.imaging > 0 && (
              <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {orderCounts.imaging} Imaging Study
                {orderCounts.imaging !== 1 ? 'ies' : ''}
              </span>
            )}
            {orderCounts.procedures > 0 && (
              <span className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                {orderCounts.procedures} Procedure
                {orderCounts.procedures > 1 ? 's' : ''}
              </span>
            )}
            {orderCounts.referrals > 0 && (
              <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                {orderCounts.referrals} Specialty Referral
                {orderCounts.referrals > 1 ? 's' : ''}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No orders configured. Click "Edit" to add prescriptions, lab tests,
            imaging studies, procedures, or cross-specialty referrals.
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
              changes to any section, or click "Complete Assessment" to save the
              record.
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

export default function PhysioAssessmentWizard({
  patientId,
  emrNumber,
  encounterId,
  patientName,
  encounterNumber,
  existingAssessment,
  onSaveAssessment,
  onUpdateAssessment,
  onClose,
  readOnly = false,
}: PhysioAssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    'left' | 'right'
  >('right');

  const [formData, setFormData] = useState<Partial<PhysioAssessmentDTO>>(() => {
    if (existingAssessment) {
      return { ...existingAssessment };
    }
    return {
      patient_id: patientId,
      encounter_id: encounterId,
    };
  });

  // Order state for specialty orders
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
        category: p.category || 'General',
        price: p.price,
      })),
    [procedures],
  );

  const isLastStep = currentStep === STEPS.length - 1;

  const physioTemplateValues: Record<PhysioTemplateField, string> = {
    chief_complaint: formData.chief_complaint || '',
    rom_notes: formData.rom_notes || '',
    muscle_strength_notes: formData.muscle_strength_notes || '',
    sensation_notes: formData.sensation_notes || '',
    reflex_notes: formData.reflex_notes || '',
    palpation_findings: formData.palpation_findings || '',
    physio_diagnosis: formData.physio_diagnosis || '',
    short_term_goals: formData.short_term_goals || '',
    long_term_goals: formData.long_term_goals || '',
    patient_goals: formData.patient_goals || '',
    prognosis_notes: formData.prognosis_notes || '',
  };

  const handleFieldChange = useCallback(
    (field: keyof PhysioAssessmentDTO, value: any) => {
      if (readOnly) return;
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [readOnly],
  );

  const applyPhysioTemplate = useCallback(
    (templateData: Record<string, string>) => {
      if (readOnly) return;

      setFormData((prev) => {
        const next = { ...prev };

        for (const field of PHYSIO_TEMPLATE_FIELDS) {
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

  const goNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(STEPS[currentStep].id));
    if (currentStep < STEPS.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (readOnly) return;

    const ordersPayload: SpecialtyOrdersPayload = {
      labOrders,
      radiologyOrders,
      prescriptions,
      procedureOrders,
      specialtyReferrals,
    };

    setIsLoading(true);
    try {
      if (existingAssessment?.assessment_id && onUpdateAssessment) {
        await onUpdateAssessment(
          existingAssessment.assessment_id,
          formData,
          ordersPayload,
        );
      } else {
        // Spread all formData to include all fields in the create request
        const createData: CreatePhysioAssessmentDTO = {
          patient_id: patientId,
          encounter_id: encounterId,
          ...formData,
        };
        await onSaveAssessment(createData, ordersPayload);
      }
      setCompletedSteps(new Set(STEPS.map((s) => s.id)));
      onClose?.();
    } catch (error) {
      console.error('Failed to save assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate encounter-centric requirements
  if (!encounterId || !patientId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Missing Required Information
        </h3>
        <p className="text-gray-600 text-center mb-4">
          Both Patient ID and Encounter ID are required to create a
          physiotherapy assessment. All clinical records must be tied to a valid
          encounter.
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
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-xl">
            <Dumbbell className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {patientName || 'Patient'}
            </p>
            <p className="text-xs text-gray-400">
              EMR: {emrNumber || patientId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {encounterNumber && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full font-medium text-[11px]">
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
        <div className="p-6 bg-gray-50/50 min-h-full">
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
              <PainStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 2 && (
              <HistoryStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 3 && (
              <ExaminationStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 4 && (
              <FunctionalStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 5 && (
              <GoalsStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {currentStep === 6 && (
              <SpecialtyOrdersStep
                currentSpecialty="physiotherapy"
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
                clinicalFindings={formData.chief_complaint || ''}
                provisionalDiagnosis={formData.physio_diagnosis || ''}
                patientName={patientName}
                readOnly={readOnly}
              />
            )}
            {currentStep === 7 && (
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
              templateType="physiotherapy"
              category={PHYSIO_TEMPLATE_CATEGORY}
              currentValues={physioTemplateValues}
              onTemplateSelect={applyPhysioTemplate}
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
              onClick={handleSubmit}
              disabled={isLoading || readOnly}
              className="bg-teal-600 hover:bg-teal-700 min-w-[180px]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Complete Assessment
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700 min-w-[100px]"
            >
              Next
              <ChevronRight size={18} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
