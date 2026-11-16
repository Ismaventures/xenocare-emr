/**
 * =============================================================================
 * XENOCARE EMR - EYE EXAMINATION WIZARD
 * Modern step-based eye examination workflow with progress indicator
 * Following SOAP methodology tailored for ophthalmology practice
 * =============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Loader2,
  Activity,
  CheckSquare,
  Eye,
  Glasses,
  ClipboardCheck,
  Edit3,
  Pill,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { INPUT_CLS, TABLE_INPUT_CLS, LABEL_CLS } from '../../../components/ui/ConsultationFormUI';
import type {
  EyeExamDTO,
  CreateEyeExamDTO,
  UpdateEyeExamDTO,
  AffectedEye,
} from '../types/ophthalmology.types';
import SpecialtyOrdersStep, {
  createDefaultSpecialtyReferrals,
  type SpecialtyReferralsState,
} from '../../specialty-common/components/SpecialtyOrdersStep';
import ClinicTriageDisplay from '../../specialty-common/components/ClinicTriageDisplay';
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
import TemplateSearchPopover from '../../../components/ui/TemplateSearchPopover';
import {
  SelectWithOther,
  type SelectOption,
} from '../../shared/components/SelectWithOther';

const OPHTHALMOLOGY_TEMPLATE_CATEGORY = 'ophthalmology_exam';
const OPHTHALMOLOGY_TEMPLATE_FIELDS = [
  'chief_complaint',
  'provisional_diagnosis',
  'final_diagnosis',
  'treatment_plan',
] as const;

type OphthalmologyTemplateField = (typeof OPHTHALMOLOGY_TEMPLATE_FIELDS)[number];

// =============================================================================
// Types
// =============================================================================

/** Workflow mode: 'triage' for nurses (History + VA/IOP only), 'full' for doctors (all steps) */
export type EyeExamMode = 'triage' | 'full';

interface EyeExamWizardProps {
  encounterId: string;
  patientId: string;
  emrNumber?: string;
  patientName?: string;
  encounterNumber?: string;
  existingExam?: EyeExamDTO;
  onSave?: (
    data: CreateEyeExamDTO | UpdateEyeExamDTO,
    orders?: SpecialtyOrdersPayload,
  ) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  readOnly?: boolean;
  /** Workflow mode — 'triage' shows only History + VA/IOP for nurses; 'full' shows all steps */
  mode?: EyeExamMode;
  /** Optional step ID to start on (e.g. 'orders') */
  initialStepId?: string;
  /** When true, show ONLY the orders step — no wizard chrome */
  ordersOnly?: boolean;
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
// Step Configuration - Ophthalmology SOAP Methodology
// =============================================================================

// Step IDs visible in triage mode (nurses)
const TRIAGE_STEP_IDS = new Set(['history', 'visual_acuity']);

const ALL_STEPS: Step[] = [
  {
    id: 'history',
    title: 'History & Complaint',
    shortTitle: 'History',
    icon: <FileText size={12} />,
    description: 'Chief complaint & medical history',
    category: 'subjective',
  },
  {
    id: 'visual_acuity',
    title: 'Visual Acuity & IOP',
    shortTitle: 'VA/IOP',
    icon: <Eye size={12} />,
    description: 'Vision testing & pressure',
    category: 'objective',
  },
  {
    id: 'refraction',
    title: 'Refraction',
    shortTitle: 'Refraction',
    icon: <Glasses size={12} />,
    description: 'Auto & subjective refraction',
    category: 'objective',
  },
  {
    id: 'anterior',
    title: 'Anterior Segment',
    shortTitle: 'Anterior',
    icon: <Stethoscope size={12} />,
    description: 'Slit lamp examination',
    category: 'objective',
  },
  {
    id: 'posterior',
    title: 'Posterior Segment',
    shortTitle: 'Posterior',
    icon: <Activity size={12} />,
    description: 'Fundus examination',
    category: 'objective',
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

const AFFECTED_EYE_OPTIONS: SelectOption[] = [
  { value: 'Right', label: 'Right Eye (OD)' },
  { value: 'Left', label: 'Left Eye (OS)' },
  { value: 'Both', label: 'Both Eyes (OU)' },
];

const VA_OPTIONS: SelectOption[] = [
  '6/6',
  '6/9',
  '6/12',
  '6/18',
  '6/24',
  '6/36',
  '6/60',
  '3/60',
  '1/60',
  'CF',
  'HM',
  'PL',
  'NPL',
].map((v) => ({ value: v, label: v }));

const NEAR_VISION_OPTIONS: SelectOption[] = [
  'N5',
  'N6',
  'N8',
  'N10',
  'N12',
  'N14',
  'N18',
  'N24',
  'N36',
  'N48',
].map((v) => ({ value: v, label: v }));

const IOP_METHOD_OPTIONS: SelectOption[] = [
  'NCT',
  'Goldmann',
  'iCare',
  'Schiotz',
  'Palpation',
].map((v) => ({ value: v, label: v }));

const LENS_STATUS_OPTIONS: SelectOption[] = [
  'Clear',
  'Early_Cataract',
  'Immature_Cataract',
  'Mature_Cataract',
  'Hypermature_Cataract',
  'Pseudophakia',
  'Aphakia',
].map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));

const AC_DEPTH_OPTIONS: SelectOption[] = [
  'Deep',
  'Normal',
  'Shallow',
  'Flat',
].map((v) => ({ value: v, label: v }));
const PUPIL_REACTION_OPTIONS: SelectOption[] = [
  'Brisk',
  'Sluggish',
  'Fixed',
  'RAPD',
].map((v) => ({ value: v, label: v }));
const DISC_COLOR_OPTIONS: SelectOption[] = ['Pink', 'Pale', 'Hyperemic'].map(
  (v) => ({ value: v, label: v }),
);
const FOVEAL_REFLEX_OPTIONS: SelectOption[] = ['Present', 'Absent', 'Dull'].map(
  (v) => ({ value: v, label: v }),
);
const CYCLO_AGENT_OPTIONS: SelectOption[] = [
  { value: 'Cyclopentolate 1%', label: 'Cyclopentolate 1%' },
  { value: 'Atropine 1%', label: 'Atropine 1%' },
  { value: 'Tropicamide 1%', label: 'Tropicamide 1%' },
  { value: 'Homatropine 2%', label: 'Homatropine 2%' },
];

const COLOUR_VISION_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Red-Green defective (OD)', label: 'Red-Green defective (OD)' },
  { value: 'Red-Green defective (OS)', label: 'Red-Green defective (OS)' },
  { value: 'Red-Green defective (OU)', label: 'Red-Green defective (OU)' },
  { value: 'Blue-Yellow defective', label: 'Blue-Yellow defective' },
  { value: 'Total colour blindness', label: 'Total colour blindness' },
  { value: 'Not tested', label: 'Not tested' },
];

const COVER_TEST_OPTIONS: SelectOption[] = [
  { value: 'Orthophoria', label: 'Orthophoria (normal)' },
  { value: 'Exophoria', label: 'Exophoria' },
  { value: 'Esophoria', label: 'Esophoria' },
  { value: 'Exotropia', label: 'Exotropia (XT)' },
  { value: 'Esotropia', label: 'Esotropia (ET)' },
  { value: 'Hypertropia', label: 'Hypertropia' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const OCULAR_MOTILITY_OPTIONS: SelectOption[] = [
  { value: 'Full in all gazes', label: 'Full in all gazes (normal)' },
  { value: 'Restricted right gaze', label: 'Restricted right gaze' },
  { value: 'Restricted left gaze', label: 'Restricted left gaze' },
  { value: 'Restricted upgaze', label: 'Restricted upgaze' },
  { value: 'Restricted downgaze', label: 'Restricted downgaze' },
  { value: 'Nystagmus', label: 'Nystagmus' },
  { value: 'Diplopia', label: 'Diplopia' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const VISUAL_FIELDS_OPTIONS: SelectOption[] = [
  { value: 'Full to confrontation', label: 'Full to confrontation' },
  { value: 'Temporal defect (OD)', label: 'Temporal defect (OD)' },
  { value: 'Temporal defect (OS)', label: 'Temporal defect (OS)' },
  { value: 'Nasal defect (OD)', label: 'Nasal defect (OD)' },
  { value: 'Nasal defect (OS)', label: 'Nasal defect (OS)' },
  { value: 'Central scotoma', label: 'Central scotoma' },
  { value: 'Bitemporal hemianopia', label: 'Bitemporal hemianopia' },
  { value: 'Homonymous hemianopia', label: 'Homonymous hemianopia' },
  {
    value: 'Inferior altitudinal defect',
    label: 'Inferior altitudinal defect',
  },
  {
    value: 'Superior altitudinal defect',
    label: 'Superior altitudinal defect',
  },
  { value: 'Generalised constriction', label: 'Generalised constriction' },
  { value: 'Not assessed', label: 'Not assessed' },
];

const IOP_CLASSIFICATION_OPTIONS: SelectOption[] = [
  { value: 'Normal (10-21 mmHg)', label: 'Normal (10-21 mmHg)' },
  { value: 'Borderline (22-24 mmHg)', label: 'Borderline (22-24 mmHg)' },
  { value: 'Elevated (≥25 mmHg)', label: 'Elevated (≥25 mmHg)' },
  { value: 'Low (<10 mmHg)', label: 'Low (<10 mmHg)' },
];

const LIDS_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Ptosis', label: 'Ptosis' },
  { value: 'Entropion', label: 'Entropion' },
  { value: 'Ectropion', label: 'Ectropion' },
  { value: 'Blepharitis', label: 'Blepharitis' },
  { value: 'Chalazion', label: 'Chalazion' },
  { value: 'Hordeolum', label: 'Hordeolum (stye)' },
  { value: 'Lagophthalmos', label: 'Lagophthalmos' },
  { value: 'Trichiasis', label: 'Trichiasis' },
];

const CONJUNCTIVA_OPTIONS: SelectOption[] = [
  { value: 'Clear', label: 'Clear' },
  { value: 'Injected', label: 'Injected' },
  { value: 'Chemosis', label: 'Chemosis' },
  { value: 'Pterygium', label: 'Pterygium' },
  { value: 'Pinguecula', label: 'Pinguecula' },
  { value: 'Follicles', label: 'Follicles' },
  { value: 'Papillae', label: 'Papillae' },
  {
    value: 'Subconjunctival haemorrhage',
    label: 'Subconjunctival haemorrhage',
  },
  { value: 'Discharge', label: 'Discharge' },
];

const SCLERA_OPTIONS: SelectOption[] = [
  { value: 'White and quiet', label: 'White and quiet' },
  { value: 'Episcleritis', label: 'Episcleritis' },
  { value: 'Scleritis', label: 'Scleritis' },
  { value: 'Scleral thinning', label: 'Scleral thinning' },
  { value: 'Jaundiced', label: 'Jaundiced' },
];

const CORNEA_OPTIONS: SelectOption[] = [
  { value: 'Clear', label: 'Clear' },
  { value: 'Arcus senilis', label: 'Arcus senilis' },
  { value: 'Band keratopathy', label: 'Band keratopathy' },
  { value: 'Corneal opacity', label: 'Corneal opacity' },
  { value: 'Corneal ulcer', label: 'Corneal ulcer' },
  { value: 'Keratoconus', label: 'Keratoconus' },
  { value: 'Keratic precipitates', label: 'Keratic precipitates (KPs)' },
  { value: 'Oedema', label: 'Oedema' },
  { value: 'Vascularisation', label: 'Vascularisation' },
];

const AC_FINDING_OPTIONS: SelectOption[] = [
  { value: 'Deep and quiet', label: 'Deep and quiet (normal)' },
  { value: 'Deep - cells and flare', label: 'Deep — cells and flare' },
  { value: 'Shallow', label: 'Shallow' },
  { value: 'Flat', label: 'Flat' },
  { value: 'Hyphaema', label: 'Hyphaema' },
  { value: 'Hypopyon', label: 'Hypopyon' },
];

const IRIS_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Rubeosis iridis', label: 'Rubeosis iridis' },
  { value: 'Posterior synechiae', label: 'Posterior synechiae' },
  { value: 'Anterior synechiae', label: 'Anterior synechiae' },
  { value: 'Iris atrophy', label: 'Iris atrophy' },
  { value: 'Heterochromia', label: 'Heterochromia' },
  { value: 'Iridodonesis', label: 'Iridodonesis' },
];

const MEDIA_OPTIONS: SelectOption[] = [
  { value: 'Clear', label: 'Clear' },
  { value: 'Vitreous opacities', label: 'Vitreous opacities' },
  {
    value: 'Posterior vitreous detachment',
    label: 'Posterior vitreous detachment (PVD)',
  },
  { value: 'Vitreous haemorrhage', label: 'Vitreous haemorrhage' },
  { value: 'Asteroid hyalosis', label: 'Asteroid hyalosis' },
  { value: 'Hazy', label: 'Hazy' },
];

const DISC_OPTIONS: SelectOption[] = [
  { value: 'Pink and healthy', label: 'Pink and healthy' },
  { value: 'Pale temporal rim', label: 'Pale temporal rim' },
  { value: 'Temporal pallor', label: 'Temporal pallor' },
  { value: 'Diffuse pallor', label: 'Diffuse pallor' },
  { value: 'Hyperaemic', label: 'Hyperaemic' },
  { value: 'Blurred margins', label: 'Blurred margins (papilloedema)' },
  { value: 'Cupping (glaucoma)', label: 'Cupping (glaucoma)' },
  { value: 'RNFL defect', label: 'RNFL defect' },
];

const MACULA_OPTIONS: SelectOption[] = [
  { value: 'Normal foveal reflex', label: 'Normal foveal reflex' },
  { value: 'Dull foveal reflex', label: 'Dull foveal reflex' },
  { value: 'Absent foveal reflex', label: 'Absent foveal reflex' },
  { value: 'Drusen', label: 'Drusen' },
  { value: 'Macular oedema', label: 'Macular oedema' },
  { value: 'Epiretinal membrane', label: 'Epiretinal membrane' },
  { value: 'Macular hole', label: 'Macular hole' },
  { value: 'ARMD (dry)', label: 'ARMD (dry)' },
  { value: 'ARMD (wet)', label: 'ARMD (wet)' },
  { value: 'Macular scar', label: 'Macular scar' },
];

const VESSELS_OPTIONS: SelectOption[] = [
  { value: 'Normal calibre and course', label: 'Normal calibre and course' },
  { value: 'A/V nipping', label: 'A/V nipping' },
  { value: 'Silver wiring', label: 'Silver wiring' },
  { value: 'Copper wiring', label: 'Copper wiring' },
  { value: 'Disc collaterals', label: 'Disc collaterals' },
  {
    value: 'Neovascularisation disc (NVD)',
    label: 'Neovascularisation disc (NVD)',
  },
  {
    value: 'Neovascularisation elsewhere (NVE)',
    label: 'Neovascularisation elsewhere (NVE)',
  },
  { value: 'Arterial occlusion', label: 'Arterial occlusion' },
  { value: 'Venous occlusion', label: 'Venous occlusion' },
  { value: 'Sheathing', label: 'Sheathing' },
];

const PERIPHERY_OPTIONS: SelectOption[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Lattice degeneration', label: 'Lattice degeneration' },
  { value: 'Retinal hole', label: 'Retinal hole' },
  { value: 'Retinal tear', label: 'Retinal tear' },
  { value: 'Retinal detachment', label: 'Retinal detachment' },
  { value: 'Chorioretinal scar', label: 'Chorioretinal scar' },
  {
    value: 'Peripheral neovascularisation',
    label: 'Peripheral neovascularisation',
  },
  { value: 'Paving stone degeneration', label: 'Paving stone degeneration' },
];

const DR_GRADING_OPTIONS: SelectOption[] = [
  { value: 'No DR', label: 'No DR' },
  { value: 'Mild NPDR', label: 'Mild NPDR' },
  { value: 'Moderate NPDR', label: 'Moderate NPDR' },
  { value: 'Severe NPDR', label: 'Severe NPDR' },
  {
    value: 'PDR (without high-risk features)',
    label: 'PDR (without high-risk features)',
  },
  { value: 'PDR (high-risk features)', label: 'PDR (high-risk features)' },
  { value: 'Advanced PDR', label: 'Advanced PDR' },
  { value: 'DMO present', label: '+ Diabetic Macular Oedema (DMO)' },
];

const SPECTACLE_REC_OPTIONS: SelectOption[] = [
  { value: 'Full time', label: 'Full time' },
  { value: 'Distance only', label: 'Distance only' },
  { value: 'Near only', label: 'Near only' },
  { value: 'Bifocals', label: 'Bifocals' },
  { value: 'Progressives', label: 'Progressives' },
  { value: 'Driving only', label: 'Driving only' },
  { value: 'Reading only', label: 'Reading only' },
  { value: 'Not required', label: 'Not required' },
];

const REFRACTIVE_ERROR_LABELS = [
  'Myopia OD',
  'Myopia OS',
  'Hyperopia OD',
  'Hyperopia OS',
  'Astigmatism OD',
  'Astigmatism OS',
  'Presbyopia',
  'Emmetropia',
  'Anisometropia',
  'Amblyopia',
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
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Step Content Components
// =============================================================================

// Step 1: History & Complaint
function HistoryStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<EyeExamDTO>;
  onChange: (field: keyof EyeExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-blue-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Chief Complaint
            </h3>
            <p className="text-sm text-gray-500">Primary presenting symptoms</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Chief Complaint <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.chief_complaint || ''}
              onChange={(e) =>
                onChange('chief_complaint', e.target.value.slice(0, 100))
              }
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              maxLength={100}
              placeholder="Describe the patient's main eye complaint..."
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
              placeholder="e.g., 2 weeks"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Eye Involved
            </label>
            <SelectWithOther
              fieldId="eye:affected_eye"
              value={formData.affected_eye || ''}
              onChange={(v) => onChange('affected_eye', v || undefined)}
              options={AFFECTED_EYE_OPTIONS}
              disabled={readOnly}
              placeholder="Select eye..."
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Medical History Section */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-blue-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Medical History
            </h3>
            <p className="text-sm text-gray-500">
              Relevant ocular and systemic history
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Ocular History
            </label>
            <textarea
              value={formData.ocular_history || ''}
              onChange={(e) => onChange('ocular_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Previous eye conditions, surgeries..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Systemic History
            </label>
            <textarea
              value={formData.systemic_history || ''}
              onChange={(e) => onChange('systemic_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Diabetes, hypertension, medications..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Family History
            </label>
            <textarea
              value={formData.family_history || ''}
              onChange={(e) => onChange('family_history', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={1}
              placeholder="Glaucoma, macular degeneration..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Drug Allergies
              <span className="ml-2 text-xs text-red-500 font-normal">
                (Important)
              </span>
            </label>
            <textarea
              value={formData.drug_allergy || ''}
              onChange={(e) => onChange('drug_allergy', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={1}
              placeholder="Eye drops, systemic medications..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2: Visual Acuity & IOP
function VisualAcuityStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<EyeExamDTO>;
  onChange: (field: keyof EyeExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Visual Acuity */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Visual Acuity
            </h3>
            <p className="text-sm text-gray-500">
              Distance and near vision testing
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 font-medium text-gray-700">
                  Measurement
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Right Eye (OD)
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Left Eye (OS)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-1.5 px-2 text-gray-600">Unaided</td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_right_unaided"
                    value={formData.va_right_unaided || ''}
                    onChange={(v) =>
                      onChange('va_right_unaided', v || undefined)
                    }
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_left_unaided"
                    value={formData.va_left_unaided || ''}
                    onChange={(v) =>
                      onChange('va_left_unaided', v || undefined)
                    }
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-gray-600">Aided</td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_right_aided"
                    value={formData.va_right_aided || ''}
                    onChange={(v) => onChange('va_right_aided', v || undefined)}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_left_aided"
                    value={formData.va_left_aided || ''}
                    onChange={(v) => onChange('va_left_aided', v || undefined)}
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-gray-600">Pinhole</td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_right_pinhole"
                    value={formData.va_right_pinhole || ''}
                    onChange={(v) =>
                      onChange('va_right_pinhole', v || undefined)
                    }
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_left_pinhole"
                    value={formData.va_left_pinhole || ''}
                    onChange={(v) =>
                      onChange('va_left_pinhole', v || undefined)
                    }
                    options={VA_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 text-gray-600">Near</td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_right_near"
                    value={formData.va_right_near || ''}
                    onChange={(v) => onChange('va_right_near', v || undefined)}
                    options={NEAR_VISION_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:va_left_near"
                    value={formData.va_left_near || ''}
                    onChange={(v) => onChange('va_left_near', v || undefined)}
                    options={NEAR_VISION_OPTIONS}
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              <tr className="bg-purple-50/50">
                <td className="py-1.5 px-2 text-gray-600">Colour Vision</td>
                <td colSpan={2} className="py-1.5 px-2">
                  <SelectWithOther
                    fieldId="eye:colour_vision"
                    value={formData.colour_vision || ''}
                    onChange={(v) => onChange('colour_vision', v || undefined)}
                    options={COLOUR_VISION_OPTIONS}
                    disabled={readOnly}
                    placeholder="Select result..."
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* IOP */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Intraocular Pressure (IOP)
            </h3>
            <p className="text-sm text-gray-500">Tonometry measurement</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Method
            </label>
            <SelectWithOther
              fieldId="eye:iop_method"
              value={formData.iop_method || ''}
              onChange={(v) => onChange('iop_method', v || undefined)}
              options={IOP_METHOD_OPTIONS}
              disabled={readOnly}
              placeholder="Select..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Right Eye (mmHg)
            </label>
            <input
              type="number"
              min={0}
              max={80}
              value={formData.iop_right ?? ''}
              onChange={(e) =>
                onChange(
                  'iop_right',
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 14"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Left Eye (mmHg)
            </label>
            <input
              type="number"
              min={0}
              max={80}
              value={formData.iop_left ?? ''}
              onChange={(e) =>
                onChange(
                  'iop_left',
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 15"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              IOP Classification
            </label>
            <SelectWithOther
              fieldId="eye:iop_classification"
              value={formData.iop_classification || ''}
              onChange={(v) => onChange('iop_classification', v || undefined)}
              options={IOP_CLASSIFICATION_OPTIONS}
              disabled={readOnly}
              placeholder="Select classification..."
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Binocular Vision & Motility */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Binocular Vision & Motility
            </h3>
            <p className="text-sm text-gray-500">
              Cover test, ocular movements and visual fields
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Cover Test
            </label>
            <SelectWithOther
              fieldId="eye:cover_test"
              value={formData.cover_test || ''}
              onChange={(v) => onChange('cover_test', v || undefined)}
              options={COVER_TEST_OPTIONS}
              disabled={readOnly}
              placeholder="Select result..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Ocular Motility
            </label>
            <SelectWithOther
              fieldId="eye:ocular_motility"
              value={formData.ocular_motility || ''}
              onChange={(v) => onChange('ocular_motility', v || undefined)}
              options={OCULAR_MOTILITY_OPTIONS}
              disabled={readOnly}
              placeholder="Select result..."
              className={INPUT_CLS}
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Visual Fields (Confrontation)
            </label>
            <SelectWithOther
              fieldId="eye:visual_fields_confrontation"
              value={formData.visual_fields_confrontation || ''}
              onChange={(v) =>
                onChange('visual_fields_confrontation', v || undefined)
              }
              options={VISUAL_FIELDS_OPTIONS}
              disabled={readOnly}
              placeholder="Select result..."
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 3: Refraction
function RefractionStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<EyeExamDTO>;
  onChange: (field: keyof EyeExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Auto-Refraction */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Glasses className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Auto-Refraction
            </h3>
            <p className="text-sm text-gray-500">Automated readings</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 font-medium text-gray-700">
                  Eye
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Sphere
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Cylinder
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Axis
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-1.5 px-2 font-medium text-gray-700">OD</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.ar_right_sphere ?? ''}
                    onChange={(e) =>
                      onChange(
                        'ar_right_sphere',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.ar_right_cylinder ?? ''}
                    onChange={(e) =>
                      onChange(
                        'ar_right_cylinder',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.ar_right_axis ?? ''}
                    onChange={(e) =>
                      onChange(
                        'ar_right_axis',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="0-180"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium text-gray-700">OS</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.ar_left_sphere ?? ''}
                    onChange={(e) =>
                      onChange(
                        'ar_left_sphere',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.ar_left_cylinder ?? ''}
                    onChange={(e) =>
                      onChange(
                        'ar_left_cylinder',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.ar_left_axis ?? ''}
                    onChange={(e) =>
                      onChange(
                        'ar_left_axis',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="0-180"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cycloplegic Refraction (Wet Refraction) */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-amber-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <Glasses className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Cycloplegic Refraction (Wet Refraction)
            </h3>
            <p className="text-sm text-gray-500">Post-cycloplegia readings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Cycloplegic Agent
            </label>
            <SelectWithOther
              fieldId="eye:cyclo_agent"
              value={formData.cyclo_agent || ''}
              onChange={(v) => onChange('cyclo_agent', v || undefined)}
              options={CYCLO_AGENT_OPTIONS}
              disabled={readOnly}
              placeholder="Select agent..."
              className={TABLE_INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Instillation Time
            </label>
            <input
              type="time"
              value={formData.cyclo_instillation_time || ''}
              onChange={(e) =>
                onChange('cyclo_instillation_time', e.target.value || undefined)
              }
              disabled={readOnly}
              className={TABLE_INPUT_CLS}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 font-medium text-gray-700">
                  Eye
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Sphere
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Cylinder
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Axis
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-1.5 px-2 font-medium text-gray-700">OD</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.cyclo_right_sphere ?? ''}
                    onChange={(e) =>
                      onChange(
                        'cyclo_right_sphere',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.cyclo_right_cylinder ?? ''}
                    onChange={(e) =>
                      onChange(
                        'cyclo_right_cylinder',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.cyclo_right_axis ?? ''}
                    onChange={(e) =>
                      onChange(
                        'cyclo_right_axis',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="0-180"
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium text-gray-700">OS</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.cyclo_left_sphere ?? ''}
                    onChange={(e) =>
                      onChange(
                        'cyclo_left_sphere',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.cyclo_left_cylinder ?? ''}
                    onChange={(e) =>
                      onChange(
                        'cyclo_left_cylinder',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="±0.00"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.cyclo_left_axis ?? ''}
                    onChange={(e) =>
                      onChange(
                        'cyclo_left_axis',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                    placeholder="0-180"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Subjective Refraction */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Glasses className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Subjective Refraction (Final Rx)
            </h3>
            <p className="text-sm text-gray-500">Final prescription</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 font-medium text-gray-700">
                  Eye
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Sphere
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Cyl
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Axis
                </th>
                <th className="text-center py-1.5 px-2 font-medium text-gray-700">
                  Add
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-1.5 px-2 font-medium text-gray-700">OD</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.rx_right_sphere ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_right_sphere',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.rx_right_cylinder ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_right_cylinder',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.rx_right_axis ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_right_axis',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.rx_right_add ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_right_add',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
              <tr>
                <td className="py-1.5 px-2 font-medium text-gray-700">OS</td>
                <td className="py-1.5 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.rx_left_sphere ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_left_sphere',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.rx_left_cylinder ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_left_cylinder',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.rx_left_axis ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_left_axis',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    step="0.25"
                    value={formData.rx_left_add ?? ''}
                    onChange={(e) =>
                      onChange(
                        'rx_left_add',
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                    disabled={readOnly}
                    className={TABLE_INPUT_CLS}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Refractive Error Classification */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-purple-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <Glasses className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Refractive Error Classification
            </h3>
            <p className="text-sm text-gray-500">Select all that apply</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {REFRACTIVE_ERROR_LABELS.map((label) => {
            const currentVal: string =
              (formData.refractive_error_classification as string) || '';
            const selected = currentVal
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            const isChecked = selected.includes(label);
            return (
              <button
                key={label}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return;
                  const next = isChecked
                    ? selected.filter((s) => s !== label)
                    : [...selected, label];
                  onChange(
                    'refractive_error_classification',
                    next.join(', ') || undefined,
                  );
                }}
                className={`px-3 py-2 rounded-full text-xs font-medium border transition-all duration-150 ${
                  isChecked
                    ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spectacle Recommendation */}
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Glasses className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Spectacle Recommendation
            </h3>
            <p className="text-sm text-gray-500">
              Wearing instructions for the patient
            </p>
          </div>
        </div>
        <SelectWithOther
          fieldId="eye:spectacle_recommendation"
          value={formData.spectacle_recommendation || ''}
          onChange={(v) => onChange('spectacle_recommendation', v || undefined)}
          options={SPECTACLE_REC_OPTIONS}
          disabled={readOnly}
          placeholder="Select recommendation..."
          className={INPUT_CLS}
        />
      </div>
    </div>
  );
}

// Step 4: Anterior Segment
function AnteriorStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<EyeExamDTO>;
  onChange: (field: keyof EyeExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Stethoscope className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Anterior Segment Examination
            </h3>
            <p className="text-sm text-gray-500">
              Slit lamp examination findings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Lids & Adnexa (OD)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_right_lids"
              value={formData.anterior_right_lids || ''}
              onChange={(v) => onChange('anterior_right_lids', v || undefined)}
              options={LIDS_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Lids & Adnexa (OS)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_left_lids"
              value={formData.anterior_left_lids || ''}
              onChange={(v) => onChange('anterior_left_lids', v || undefined)}
              options={LIDS_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Conjunctiva (OD)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_right_conjunctiva"
              value={formData.anterior_right_conjunctiva || ''}
              onChange={(v) =>
                onChange('anterior_right_conjunctiva', v || undefined)
              }
              options={CONJUNCTIVA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Conjunctiva (OS)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_left_conjunctiva"
              value={formData.anterior_left_conjunctiva || ''}
              onChange={(v) =>
                onChange('anterior_left_conjunctiva', v || undefined)
              }
              options={CONJUNCTIVA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Sclera (OD)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_right_sclera"
              value={formData.anterior_right_sclera || ''}
              onChange={(v) =>
                onChange('anterior_right_sclera', v || undefined)
              }
              options={SCLERA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Sclera (OS)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_left_sclera"
              value={formData.anterior_left_sclera || ''}
              onChange={(v) => onChange('anterior_left_sclera', v || undefined)}
              options={SCLERA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Cornea (OD)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_right_cornea"
              value={formData.anterior_right_cornea || ''}
              onChange={(v) =>
                onChange('anterior_right_cornea', v || undefined)
              }
              options={CORNEA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Cornea (OS)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_left_cornea"
              value={formData.anterior_left_cornea || ''}
              onChange={(v) => onChange('anterior_left_cornea', v || undefined)}
              options={CORNEA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Anterior Chamber (OD)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_right_ac"
              value={formData.anterior_right_ac || ''}
              onChange={(v) => onChange('anterior_right_ac', v || undefined)}
              options={AC_FINDING_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Anterior Chamber (OS)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_left_ac"
              value={formData.anterior_left_ac || ''}
              onChange={(v) => onChange('anterior_left_ac', v || undefined)}
              options={AC_FINDING_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Iris (OD)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_right_iris"
              value={formData.anterior_right_iris || ''}
              onChange={(v) => onChange('anterior_right_iris', v || undefined)}
              options={IRIS_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Iris (OS)
            </label>
            <SelectWithOther
              fieldId="eye:anterior_left_iris"
              value={formData.anterior_left_iris || ''}
              onChange={(v) => onChange('anterior_left_iris', v || undefined)}
              options={IRIS_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Lens Status (OD)
            </label>
            <SelectWithOther
              fieldId="eye:lens_status"
              value={formData.anterior_right_lens_status || ''}
              onChange={(v) =>
                onChange('anterior_right_lens_status', v || undefined)
              }
              options={LENS_STATUS_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Lens Status (OS)
            </label>
            <SelectWithOther
              fieldId="eye:lens_status"
              value={formData.anterior_left_lens_status || ''}
              onChange={(v) =>
                onChange('anterior_left_lens_status', v || undefined)
              }
              options={LENS_STATUS_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pupil Reaction (OD)
            </label>
            <SelectWithOther
              fieldId="eye:pupil_reaction"
              value={formData.pupil_right_reaction || ''}
              onChange={(v) => onChange('pupil_right_reaction', v || undefined)}
              options={PUPIL_REACTION_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pupil Reaction (OS)
            </label>
            <SelectWithOther
              fieldId="eye:pupil_reaction"
              value={formData.pupil_left_reaction || ''}
              onChange={(v) => onChange('pupil_left_reaction', v || undefined)}
              options={PUPIL_REACTION_OPTIONS}
              disabled={readOnly}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 5: Posterior Segment
function PosteriorStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<EyeExamDTO>;
  onChange: (field: keyof EyeExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-emerald-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Posterior Segment Examination
            </h3>
            <p className="text-sm text-gray-500">Fundus examination findings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Media (OD)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_right_media"
              value={formData.posterior_right_media || ''}
              onChange={(v) =>
                onChange('posterior_right_media', v || undefined)
              }
              options={MEDIA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Media (OS)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_left_media"
              value={formData.posterior_left_media || ''}
              onChange={(v) => onChange('posterior_left_media', v || undefined)}
              options={MEDIA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Disc (OD)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_right_disc_color"
              value={formData.posterior_right_disc_color || ''}
              onChange={(v) =>
                onChange('posterior_right_disc_color', v || undefined)
              }
              options={DISC_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Disc (OS)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_left_disc_color"
              value={formData.posterior_left_disc_color || ''}
              onChange={(v) =>
                onChange('posterior_left_disc_color', v || undefined)
              }
              options={DISC_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              C:D Ratio (OD)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.posterior_right_cdr ?? ''}
              onChange={(e) =>
                onChange(
                  'posterior_right_cdr',
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 0.3"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              C:D Ratio (OS)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.posterior_left_cdr ?? ''}
              onChange={(e) =>
                onChange(
                  'posterior_left_cdr',
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 0.3"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Macula (OD)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_right_macula"
              value={formData.posterior_right_macula || ''}
              onChange={(v) =>
                onChange('posterior_right_macula', v || undefined)
              }
              options={MACULA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Macula (OS)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_left_macula"
              value={formData.posterior_left_macula || ''}
              onChange={(v) =>
                onChange('posterior_left_macula', v || undefined)
              }
              options={MACULA_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Vessels (OD)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_right_vessels"
              value={formData.posterior_right_vessels || ''}
              onChange={(v) =>
                onChange('posterior_right_vessels', v || undefined)
              }
              options={VESSELS_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Vessels (OS)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_left_vessels"
              value={formData.posterior_left_vessels || ''}
              onChange={(v) =>
                onChange('posterior_left_vessels', v || undefined)
              }
              options={VESSELS_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Peripheral Retina (OD)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_right_periphery"
              value={formData.posterior_right_periphery || ''}
              onChange={(v) =>
                onChange('posterior_right_periphery', v || undefined)
              }
              options={PERIPHERY_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Peripheral Retina (OS)
            </label>
            <SelectWithOther
              fieldId="eye:posterior_left_periphery"
              value={formData.posterior_left_periphery || ''}
              onChange={(v) =>
                onChange('posterior_left_periphery', v || undefined)
              }
              options={PERIPHERY_OPTIONS}
              disabled={readOnly}
              placeholder="Select finding..."
              className={INPUT_CLS}
            />
          </div>
          <div className="lg:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              DR Grading (Diabetic Retinopathy)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  DR Grade (OD)
                </label>
                <SelectWithOther
                  fieldId="eye:posterior_right_dr_grading"
                  value={formData.posterior_right_dr_grading || ''}
                  onChange={(v) =>
                    onChange('posterior_right_dr_grading', v || undefined)
                  }
                  options={DR_GRADING_OPTIONS}
                  disabled={readOnly}
                  placeholder="Select grade..."
                  className={TABLE_INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  DR Grade (OS)
                </label>
                <SelectWithOther
                  fieldId="eye:posterior_left_dr_grading"
                  value={formData.posterior_left_dr_grading || ''}
                  onChange={(v) =>
                    onChange('posterior_left_dr_grading', v || undefined)
                  }
                  options={DR_GRADING_OPTIONS}
                  disabled={readOnly}
                  placeholder="Select grade..."
                  className={TABLE_INPUT_CLS}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 6: Diagnosis & Plan
function DiagnosisStep({
  formData,
  onChange,
  readOnly,
}: {
  formData: Partial<EyeExamDTO>;
  onChange: (field: keyof EyeExamDTO, value: any) => void;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 border-l-[3px] border-l-amber-500 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <CheckSquare className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-gray-800 tracking-tight">
              Diagnosis & Management Plan
            </h3>
            <p className="text-sm text-gray-500">
              Final diagnosis and treatment recommendations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
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
              placeholder="Initial clinical impression..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Final Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.final_diagnosis || ''}
              onChange={(e) => onChange('final_diagnosis', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              rows={2}
              placeholder="Confirmed diagnosis for both eyes..."
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
              placeholder="Medications, procedures, glasses prescription, follow-up..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Follow-up Interval
            </label>
            <input
              type="text"
              value={formData.follow_up_interval || ''}
              onChange={(e) => onChange('follow_up_interval', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="e.g., 2 weeks, 1 month"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Referral To
            </label>
            <input
              type="text"
              value={formData.referral_to || ''}
              onChange={(e) => onChange('referral_to', e.target.value)}
              disabled={readOnly}
              className={INPUT_CLS}
              placeholder="Retina specialist, Glaucoma clinic..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Step 8: Review Step
// =============================================================================

function ReviewStep({
  formData,
  onEditStep,
  onChange,
  orderCounts,
}: {
  formData: Partial<EyeExamDTO>;
  onEditStep: (stepIndex: number) => void;
  onChange?: (field: keyof EyeExamDTO, value: any) => void;
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
        className={`bg-white border-l-[3px] ${isEditing ? 'border-l-blue-500 ring-2 ring-blue-100' : `border-l-${color}-500`} rounded-2xl border border-gray-100 shadow-sm p-5 transition-all`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${isEditing ? 'bg-blue-100' : `bg-${color}-100`} rounded-lg`}
            >
              {icon}
            </div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {isEditing && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded uppercase">
                Editing
              </span>
            )}
          </div>
          <button
            onClick={handleEditClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isEditing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Review Examination Details</h2>
            <p className="text-blue-100 text-sm">
              Please verify all information before submitting
            </p>
          </div>
        </div>
      </div>

      {/* History & Complaint */}
      <ReviewSection
        title="History & Complaint"
        stepIndex={0}
        icon={<FileText className="h-4 w-4 text-blue-600" />}
        color="blue"
      >
        <Field label="Chief Complaint" value={formData.chief_complaint} />
        <Field label="Duration" value={formData.complaint_duration} />
        <Field
          label="Eye Involved"
          value={
            formData.affected_eye === 'Right'
              ? 'Right Eye (OD)'
              : formData.affected_eye === 'Left'
                ? 'Left Eye (OS)'
                : formData.affected_eye === 'Both'
                  ? 'Both Eyes (OU)'
                  : formData.affected_eye
          }
        />
        <Field label="Ocular History" value={formData.ocular_history} />
        <Field label="Systemic History" value={formData.systemic_history} />
        <Field label="Family History" value={formData.family_history} />
        <Field label="Drug Allergy" value={formData.drug_allergy} />
        <Field
          label="Current Medications"
          value={formData.current_medications}
        />
      </ReviewSection>

      {/* Visual Acuity & IOP */}
      <ReviewSection
        title="Visual Acuity & IOP"
        stepIndex={1}
        icon={<Eye className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field label="VA OD (Unaided)" value={formData.va_right_unaided} />
        <Field label="VA OS (Unaided)" value={formData.va_left_unaided} />
        <Field label="VA OD (Pinhole)" value={formData.va_right_pinhole} />
        <Field label="VA OS (Pinhole)" value={formData.va_left_pinhole} />
        <Field label="VA OD (Aided)" value={formData.va_right_aided} />
        <Field label="VA OS (Aided)" value={formData.va_left_aided} />
        <Field label="BCVA OD" value={formData.bcva_right} />
        <Field label="BCVA OS" value={formData.bcva_left} />
        <Field
          label="IOP OD"
          value={formData.iop_right ? `${formData.iop_right} mmHg` : undefined}
        />
        <Field
          label="IOP OS"
          value={formData.iop_left ? `${formData.iop_left} mmHg` : undefined}
        />
        <Field label="IOP Method" value={formData.iop_method} />
      </ReviewSection>

      {/* Refraction */}
      <ReviewSection
        title="Refraction"
        stepIndex={2}
        icon={<Glasses className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field label="AR OD Sphere" value={formData.ar_right_sphere} />
        <Field label="AR OD Cylinder" value={formData.ar_right_cylinder} />
        <Field label="AR OD Axis" value={formData.ar_right_axis} />
        <Field label="AR OS Sphere" value={formData.ar_left_sphere} />
        <Field label="AR OS Cylinder" value={formData.ar_left_cylinder} />
        <Field label="AR OS Axis" value={formData.ar_left_axis} />
        <Field label="Rx OD Sphere" value={formData.rx_right_sphere} />
        <Field label="Rx OD Cylinder" value={formData.rx_right_cylinder} />
        <Field label="Rx OD Axis" value={formData.rx_right_axis} />
        <Field label="Rx OS Sphere" value={formData.rx_left_sphere} />
        <Field label="Rx OS Cylinder" value={formData.rx_left_cylinder} />
        <Field label="Rx OS Axis" value={formData.rx_left_axis} />
        <Field label="Add OD" value={formData.rx_right_add} />
        <Field label="Add OS" value={formData.rx_left_add} />
      </ReviewSection>

      {/* Anterior Segment */}
      <ReviewSection
        title="Anterior Segment"
        stepIndex={3}
        icon={<Stethoscope className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field label="Lids OD" value={formData.anterior_right_lids} />
        <Field label="Lids OS" value={formData.anterior_left_lids} />
        <Field
          label="Conjunctiva OD"
          value={formData.anterior_right_conjunctiva}
        />
        <Field
          label="Conjunctiva OS"
          value={formData.anterior_left_conjunctiva}
        />
        <Field label="Cornea OD" value={formData.anterior_right_cornea} />
        <Field label="Cornea OS" value={formData.anterior_left_cornea} />
        <Field label="AC OD" value={formData.anterior_right_ac} />
        <Field label="AC OS" value={formData.anterior_left_ac} />
        <Field label="Pupil OD" value={formData.anterior_right_pupil} />
        <Field label="Pupil OS" value={formData.anterior_left_pupil} />
        <Field label="Lens OD" value={formData.anterior_right_lens} />
        <Field label="Lens OS" value={formData.anterior_left_lens} />
      </ReviewSection>

      {/* Posterior Segment */}
      <ReviewSection
        title="Posterior Segment"
        stepIndex={4}
        icon={<Activity className="h-4 w-4 text-emerald-600" />}
        color="green"
      >
        <Field
          label="Disc Color OD"
          value={formData.posterior_right_disc_color}
        />
        <Field
          label="Disc Color OS"
          value={formData.posterior_left_disc_color}
        />
        <Field label="C:D Ratio OD" value={formData.posterior_right_cdr} />
        <Field label="C:D Ratio OS" value={formData.posterior_left_cdr} />
        <Field label="Macula OD" value={formData.posterior_right_macula} />
        <Field label="Macula OS" value={formData.posterior_left_macula} />
        <Field
          label="Periphery OD"
          value={formData.posterior_right_periphery}
        />
        <Field label="Periphery OS" value={formData.posterior_left_periphery} />
      </ReviewSection>

      {/* Diagnosis & Plan */}
      <ReviewSection
        title="Diagnosis & Plan"
        stepIndex={5}
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
          <Field label="Final Diagnosis" value={formData.final_diagnosis} />
        </div>
        <div className="col-span-2 lg:col-span-3">
          <Field label="Treatment Plan" value={formData.treatment_plan} />
        </div>
        <Field label="Follow-up" value={formData.follow_up_interval} />
        <Field label="Referral To" value={formData.referral_to} />
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
            onClick={() => onEditStep(6)}
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

export default function EyeExamWizard({
  encounterId,
  patientId,
  emrNumber,
  patientName,
  encounterNumber,
  existingExam,
  onSave,
  onCancel,
  onClose,
  readOnly = false,
  mode = 'full',
  initialStepId,
  ordersOnly = false,
}: EyeExamWizardProps) {
  // Filter steps based on mode
  const STEPS = useMemo(
    () =>
      mode === 'triage'
        ? ALL_STEPS.filter((s) => TRIAGE_STEP_IDS.has(s.id))
        : ALL_STEPS,
    [mode],
  );
  const isTriage = mode === 'triage';

  const [currentStep, setCurrentStep] = useState(() => {
    if (initialStepId) {
      const idx = STEPS.findIndex((s) => s.id === initialStepId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    'left' | 'right'
  >('right');

  const [formData, setFormData] = useState<Partial<EyeExamDTO>>(() => {
    if (existingExam) return existingExam;
    return {
      encounter_id: encounterId,
      patient_id: patientId,
    };
  });

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
  const hasOrderSelections =
    labOrders.length > 0 ||
    radiologyOrders.length > 0 ||
    prescriptions.length > 0 ||
    procedureOrders.length > 0 ||
    Object.values(specialtyReferrals).some((ref) => ref.selected);

  const ophthalmologyTemplateValues: Record<OphthalmologyTemplateField, string> = {
    chief_complaint: formData.chief_complaint || '',
    provisional_diagnosis: formData.provisional_diagnosis || '',
    final_diagnosis: formData.final_diagnosis || '',
    treatment_plan: formData.treatment_plan || '',
  };

  const handleFieldChange = useCallback(
    (field: keyof EyeExamDTO, value: any) => {
      if (readOnly) return;
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [readOnly],
  );

  const applyOphthalmologyTemplate = useCallback(
    (templateData: Record<string, string>) => {
      if (readOnly) return;

      setFormData((prev) => {
        const next = { ...prev };

        for (const field of OPHTHALMOLOGY_TEMPLATE_FIELDS) {
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
    if (!onSave || readOnly) return;

    const sanitizedFormData: Partial<EyeExamDTO> = {
      ...formData,
      chief_complaint: formData.chief_complaint
        ? formData.chief_complaint.trim().slice(0, 100)
        : formData.chief_complaint,
    };

    setIsLoading(true);
    try {
      const ordersPayload: SpecialtyOrdersPayload = {
        labOrders,
        radiologyOrders,
        prescriptions,
        procedureOrders,
        specialtyReferrals,
      };

      if (existingExam?.exam_id) {
        const updateData: UpdateEyeExamDTO = {
          ...sanitizedFormData,
          status: isTriage ? 'In Progress' : 'Completed',
        };
        await onSave(updateData, ordersPayload);
      } else {
        // Create new exam - send ALL form data, not just basic fields
        const createData: CreateEyeExamDTO = {
          encounter_id: sanitizedFormData.encounter_id || encounterId,
          patient_id: sanitizedFormData.patient_id || patientId,
          // Spread all form data to include all fields entered
          ...sanitizedFormData,
          // Triage saves as 'In Progress' so doctor knows triage is done
          status: isTriage ? 'In Progress' : 'Completed',
        };
        await onSave(createData, ordersPayload);
      }
      setCompletedSteps(new Set(STEPS.map((s) => s.id)));
      (onClose || onCancel)?.();
    } catch (error) {
      console.error('Failed to save eye exam:', error);
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
          Both Patient ID and Encounter ID are required to create an eye
          examination. All clinical records must be tied to a valid encounter.
        </p>
        <Button variant="outline" onClick={onClose || onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Patient Info Header - Encounter-Centric (hidden in ordersOnly) */}
      {!ordersOnly && (
        <div className="flex items-center justify-between px-6 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Eye className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                {patientName || 'Patient'}
              </p>
              <p className="text-xs text-blue-600">
                EMR: {emrNumber || patientId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isTriage && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold uppercase">
                Nurse Triage
              </span>
            )}
            {encounterNumber && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                {encounterNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Indicator — hidden in ordersOnly mode */}
      {!ordersOnly && (
        <ProgressIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />
      )}

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
            {STEPS[currentStep]?.id === 'history' && (
              <HistoryStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {STEPS[currentStep]?.id === 'visual_acuity' && (
              <div className="space-y-4">
                {/* Nurse triage observations (VA, IOP, Autorefraction recorded pre-consultation) */}
                <ClinicTriageDisplay
                  encounterId={encounterId}
                  clinicType="OPHTHALMOLOGY"
                />
                <VisualAcuityStep
                  formData={formData}
                  onChange={handleFieldChange}
                  readOnly={readOnly}
                />
              </div>
            )}
            {STEPS[currentStep]?.id === 'refraction' && (
              <RefractionStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {STEPS[currentStep]?.id === 'anterior' && (
              <AnteriorStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {STEPS[currentStep]?.id === 'posterior' && (
              <PosteriorStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {STEPS[currentStep]?.id === 'diagnosis' && (
              <DiagnosisStep
                formData={formData}
                onChange={handleFieldChange}
                readOnly={readOnly}
              />
            )}
            {STEPS[currentStep]?.id === 'orders' && (
              <div className="space-y-4">
                <SpecialtyOrdersStep
                  currentSpecialty="ophthalmology"
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
                  provisionalDiagnosis={formData.provisional_diagnosis || ''}
                  patientName={patientName}
                  readOnly={readOnly}
                />
              </div>
            )}
            {STEPS[currentStep]?.id === 'review' && (
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
        {ordersOnly ? (
          /* Orders-only mode: close + send request actions */
          <>
            <span className="text-sm text-gray-500">
              Orders & Services
              {hasOrderSelections
                ? ' • Ready to send'
                : ' • Select items to send'}
            </span>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose || onCancel}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={
                  isLoading || readOnly || !hasOrderSelections || !onSave
                }
                className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Send Requests
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* Normal wizard navigation */
          <>
            <div className="flex items-center gap-3">
              {!readOnly && (
                <TemplateSearchPopover
                  templateType="ophthalmology"
                  category={OPHTHALMOLOGY_TEMPLATE_CATEGORY}
                  currentValues={ophthalmologyTemplateValues}
                  onTemplateSelect={applyOphthalmologyTemplate}
                />
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                Step {currentStep + 1} of {STEPS.length}
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                  className="bg-blue-600 hover:bg-blue-700 min-w-[180px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {isTriage ? 'Save Triage' : 'Complete Examination'}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={goNext}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 min-w-[100px]"
                >
                  Next
                  <ChevronRight size={18} className="ml-1" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
