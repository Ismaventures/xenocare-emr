// =============================================================================
// PhysioSessionRecordModal
// SOAP-structured modal for therapists to record physiotherapy session notes
// =============================================================================

import React, { useState } from 'react';
import {
  Activity,
  Save,
  AlertCircle,
  Dumbbell,
  Zap,
  MessageSquare,
  ClipboardList,
  Eye,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Heart,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import {
  useCompletePhysioSession,
  useUpdateSessionAttendance,
  useBillPhysioSession,
} from '../hooks/usePhysiotherapy';
import { getPhysioPlanSessionLockReason } from '../utils/session-access';
import type {
  PhysioSessionDTO,
  ManualTherapyTechnique,
  ElectrotherapyModality,
  ToleranceLevel,
  SwellingLevel,
  TendernessLevel,
  ProgressIndicator,
  PhysioPlanPaymentStatus,
  PhysioPlanSummary,
} from '../types/physiotherapy.types';

// =============================================================================
// Constants
// =============================================================================

const MANUAL_TECHNIQUES: ManualTherapyTechnique[] = [
  'Joint_Mobilization',
  'Joint_Manipulation',
  'Soft_Tissue_Mobilization',
  'Massage',
  'MFR',
  'Stretching',
  'Trigger_Point_Release',
  'Dry_Needling',
  'Muscle_Energy_Technique',
  'Neural_Mobilization',
];

const ELECTRO_MODALITIES: ElectrotherapyModality[] = [
  'TENS',
  'IFT',
  'Ultrasound',
  'SWD',
  'MWD',
  'Laser',
  'EMS',
  'NMES',
  'Iontophoresis',
  'Phonophoresis',
  'Shockwave',
];

const TOLERANCE_OPTIONS: {
  value: ToleranceLevel;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: 'Good',
    label: 'Good',
    description: 'Tolerated well, no adverse reactions',
    color: 'bg-green-100 text-green-700',
  },
  {
    value: 'Fair',
    label: 'Fair',
    description: 'Some difficulty, required modifications',
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    value: 'Poor',
    label: 'Poor',
    description: 'Unable to tolerate, significant discomfort',
    color: 'bg-red-100 text-red-700',
  },
];

const SWELLING_DESCRIPTIVE: {
  value: SwellingLevel;
  label: string;
  description: string;
}[] = [
  {
    value: 'None',
    label: 'No Swelling',
    description: 'No observable swelling or oedema',
  },
  {
    value: 'Mild',
    label: 'Mild',
    description: 'Slight swelling, minimal distension',
  },
  {
    value: 'Moderate',
    label: 'Moderate',
    description: 'Noticeable swelling with distension',
  },
  {
    value: 'Severe',
    label: 'Severe',
    description: 'Significant oedema, marked distension',
  },
];

const TENDERNESS_DESCRIPTIVE: {
  value: TendernessLevel;
  label: string;
  description: string;
}[] = [
  {
    value: 'None',
    label: 'No Tenderness',
    description: 'No pain on palpation',
  },
  {
    value: 'Mild',
    label: 'Mild',
    description: 'Slight discomfort on firm palpation',
  },
  {
    value: 'Moderate',
    label: 'Moderate',
    description: 'Pain on light palpation, patient winces',
  },
  {
    value: 'Severe',
    label: 'Severe',
    description: 'Pain on minimal contact, guarding present',
  },
];

const PROGRESS_OPTIONS: {
  value: ProgressIndicator;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: 'Improved',
    label: 'Improved',
    description: 'Measurable improvement in symptoms or function',
    icon: <TrendingUp size={14} />,
    color: 'bg-green-100 text-green-700 border-green-300',
  },
  {
    value: 'No_Change',
    label: 'No Change',
    description: 'No significant change in condition',
    icon: <Minus size={14} />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  {
    value: 'Worse',
    label: 'Worsened',
    description: 'Condition has deteriorated since last session',
    icon: <TrendingDown size={14} />,
    color: 'bg-red-100 text-red-700 border-red-300',
  },
];

const QUICK_TREATMENT_TEMPLATES: { label: string; value: string }[] = [
  {
    label: 'Mobilisation + Exercise',
    value:
      'Joint mobilization (Grade III-IV), therapeutic exercises, stretching programme',
  },
  {
    label: 'Electrotherapy + Manual',
    value:
      'Electrotherapy (TENS/IFT), soft tissue mobilization, home exercise review',
  },
  {
    label: 'Post-Op Rehab',
    value:
      'Range of motion exercises, strengthening (progressive resistance), gait training, scar mobilization',
  },
  {
    label: 'Pain Management',
    value:
      'Ice/heat therapy, TENS, gentle ROM, relaxation techniques, pain education',
  },
  {
    label: 'Neuro Rehab',
    value:
      'Functional mobility training, balance exercises, coordination drills, task-specific practice',
  },
];

// =============================================================================
// Props
// =============================================================================

interface PhysioSessionRecordModalProps {
  session: PhysioSessionDTO;
  plan?: PhysioPlanSummary;
  planPaymentStatus?: PhysioPlanPaymentStatus;
  onClose: () => void;
}

// =============================================================================
// Sub-components
// =============================================================================

function SectionHeader({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg ${color}`}
    >
      {icon}
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

function PainScale({
  value,
  onChange,
  label,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  label: string;
}) {
  const painDescription = (n: number): string => {
    if (n === 0) return 'No Pain';
    if (n <= 2) return 'Mild';
    if (n <= 4) return 'Moderate';
    if (n <= 6) return 'Mod-Severe';
    if (n <= 8) return 'Severe';
    return 'Worst';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">
          {label}: {value ?? '-'}/10
        </span>
        {value != null && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              value <= 3
                ? 'bg-green-100 text-green-700'
                : value <= 6
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {painDescription(value)}
          </span>
        )}
      </div>
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-1 text-xs font-bold rounded ${
              value === n
                ? n <= 3
                  ? 'bg-green-500 text-white'
                  : n <= 6
                    ? 'bg-yellow-500 text-white'
                    : 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-gray-400 px-0.5">
        <span>No Pain</span>
        <span>Moderate</span>
        <span>Worst Possible</span>
      </div>
    </div>
  );
}

function DescriptiveLevelSelector({
  label,
  options,
  value,
  onChange,
  colors,
}: {
  label: string;
  options: { value: string; label: string; description: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-left px-2.5 py-1.5 rounded-lg border transition-colors ${
              value === opt.value
                ? colors[opt.value] ||
                  'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-xs font-semibold block">{opt.label}</span>
            <span
              className={`text-[9px] leading-tight block mt-0.5 ${
                value === opt.value ? 'opacity-80' : 'text-gray-400'
              }`}
            >
              {opt.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  None: 'bg-green-100 text-green-700 border-green-300',
  Mild: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Moderate: 'bg-orange-100 text-orange-700 border-orange-300',
  Severe: 'bg-red-100 text-red-700 border-red-300',
};

// =============================================================================
// Component
// =============================================================================

export default function PhysioSessionRecordModal({
  session,
  plan,
  planPaymentStatus,
  onClose,
}: PhysioSessionRecordModalProps) {
  const alreadyPaid =
    planPaymentStatus === 'paid' || planPaymentStatus === 'waived';
  const { showToast } = useToast();
  const completeSessionMutation = useCompletePhysioSession();
  const missSessionMutation = useUpdateSessionAttendance();
  const billSessionMutation = useBillPhysioSession();

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<
    'S' | 'O' | 'T' | 'A' | 'P'
  >('S');
  const [formData, setFormData] = useState({
    // Subjective
    pain_score_before: undefined as number | undefined,
    subjective_report: '',
    interval_history: '',
    changes_since_last: '',
    // Objective
    objective_findings: '',
    rom_changes: '',
    strength_changes: '',
    functional_changes: '',
    swelling: '' as SwellingLevel | '',
    tenderness: '' as TendernessLevel | '',
    functional_limitations: '',
    gait_assessment: '',
    // Treatment
    treatment_provided: '',
    modalities_used: [] as string[],
    exercises_performed: '',
    exercise_sets_reps: '',
    manual_techniques_used: '',
    duration_minutes: 45,
    // Assessment
    pain_score_after: undefined as number | undefined,
    patient_response: '',
    tolerance: '' as ToleranceLevel | '',
    adverse_reactions: '',
    progress_notes: '',
    progress_indicator: '' as ProgressIndicator | '',
    compliance_level: '',
    // Plan
    next_session_focus: '',
    home_program_modified: false,
    home_program_changes: '',
    home_exercise_instructions: '',
    plan_for_next_visit: '',
  });
  const [missReason, setMissReason] = useState('');
  const [showMissDialog, setShowMissDialog] = useState(false);
  const [billAfterComplete, setBillAfterComplete] = useState(!alreadyPaid);
  const [sessionFee, setSessionFee] = useState('5000');

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleModality = (mod: string) => {
    setFormData((prev) => ({
      ...prev,
      modalities_used: prev.modalities_used.includes(mod)
        ? prev.modalities_used.filter((m) => m !== mod)
        : [...prev.modalities_used, mod],
    }));
  };

  const applyTemplate = (template: string) => {
    updateField(
      'treatment_provided',
      formData.treatment_provided
        ? `${formData.treatment_provided}\n${template}`
        : template,
    );
  };

  const sessionLockReason = getPhysioPlanSessionLockReason({
    payment_status: planPaymentStatus || plan?.payment_status,
    is_nhis_plan: plan?.is_nhis_plan,
    nhis_approval_status: plan?.nhis_approval_status,
  });

  const handleRecordSession = async () => {
    if (sessionLockReason) {
      showToast({
        title: 'Session Locked',
        message: sessionLockReason,
        type: 'warning',
      });
      return;
    }

    if (!formData.treatment_provided.trim()) {
      showToast({
        title: 'Required',
        message: 'Please enter treatment provided',
        type: 'error',
      });
      setActiveSection('T');
      return;
    }

    setIsSaving(true);
    try {
      await completeSessionMutation.mutateAsync({
        sessionId: session.session_id,
        input: {
          // Subjective
          pain_score_before: formData.pain_score_before,
          subjective_report: formData.subjective_report || undefined,
          interval_history: formData.interval_history || undefined,
          changes_since_last: formData.changes_since_last || undefined,
          // Objective
          objective_findings: formData.objective_findings || undefined,
          rom_changes: formData.rom_changes || undefined,
          strength_changes: formData.strength_changes || undefined,
          functional_changes: formData.functional_changes || undefined,
          swelling: formData.swelling || undefined,
          tenderness: formData.tenderness || undefined,
          functional_limitations: formData.functional_limitations || undefined,
          gait_assessment: formData.gait_assessment || undefined,
          // Treatment
          treatment_provided: formData.treatment_provided || undefined,
          modalities_used:
            formData.modalities_used.length > 0
              ? formData.modalities_used
              : undefined,
          exercises_performed: formData.exercises_performed || undefined,
          exercise_sets_reps: formData.exercise_sets_reps || undefined,
          manual_techniques_used: formData.manual_techniques_used || undefined,
          duration_minutes: formData.duration_minutes || undefined,
          // Assessment
          pain_score_after: formData.pain_score_after,
          patient_response: formData.patient_response || undefined,
          tolerance: formData.tolerance || undefined,
          adverse_reactions: formData.adverse_reactions || undefined,
          progress_notes: formData.progress_notes || undefined,
          progress_indicator: formData.progress_indicator || undefined,
          compliance_level: formData.compliance_level || undefined,
          // Plan
          next_session_focus: formData.next_session_focus || undefined,
          home_program_modified: formData.home_program_modified || undefined,
          home_program_changes: formData.home_program_changes || undefined,
          home_exercise_instructions:
            formData.home_exercise_instructions || undefined,
          plan_for_next_visit: formData.plan_for_next_visit || undefined,
          // Audit
          treated_by: '',
          treated_at: new Date().toISOString(),
        },
      });

      if (billAfterComplete && !alreadyPaid) {
        const fee = parseFloat(sessionFee);
        if (!isNaN(fee) && fee > 0) {
          try {
            await billSessionMutation.mutateAsync({
              sessionId: session.session_id,
              sessionFee: fee,
            });
          } catch {
            showToast({
              title: 'Billing Warning',
              message: 'Session saved but billing failed. You can bill later.',
              type: 'warning',
            });
          }
        }
      }

      showToast({
        title: 'Session Recorded',
        message: `Session ${session.session_number} completed successfully`,
        type: 'success',
      });
      onClose();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to record session',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkMissed = async () => {
    try {
      await missSessionMutation.mutateAsync({
        sessionId: session.session_id,
        status: 'Missed',
        reason: missReason || undefined,
      });
      showToast({
        title: 'Session Marked',
        message: `Session ${session.session_number} marked as missed`,
        type: 'warning',
      });
      setShowMissDialog(false);
      onClose();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to update session',
        type: 'error',
      });
    }
  };

  // SOAP tab navigation
  const soapTabs: {
    key: typeof activeSection;
    label: string;
    letter: string;
    color: string;
  }[] = [
    { key: 'S', label: 'Subjective', letter: 'S', color: 'bg-blue-500' },
    { key: 'O', label: 'Objective', letter: 'O', color: 'bg-emerald-500' },
    { key: 'T', label: 'Treatment', letter: 'T', color: 'bg-purple-500' },
    { key: 'A', label: 'Assessment', letter: 'A', color: 'bg-amber-500' },
    { key: 'P', label: 'Plan', letter: 'P', color: 'bg-rose-500' },
  ];

  const patientName = plan?.patient
    ? `${plan.patient.first_name} ${plan.patient.last_name}`
    : undefined;
  const diagnosis = plan?.treatment_approach;
  const totalSessions = plan?.total_sessions_planned || 0;

  return (
    <Modal isOpen onClose={onClose} title="" size="xl">
      {/* ── Session Header ── */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Session {session.session_number}
                {totalSessions > 0 ? ` of ${totalSessions}` : ''}
              </h2>
              {patientName && (
                <p className="text-purple-100 text-xs flex items-center gap-1">
                  <User size={11} /> {patientName}
                  {diagnosis && <span className="mx-1">|</span>}
                  {diagnosis && <span className="italic">{diagnosis}</span>}
                </p>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-purple-200">
            <p className="flex items-center gap-1">
              <Calendar size={11} /> {new Date().toLocaleDateString()}
            </p>
            {session.scheduled_date && (
              <p>Scheduled: {session.scheduled_date}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── SOAP Tab Bar ── */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {soapTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSection(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeSection === tab.key
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span
              className={`${tab.color} text-white w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold`}
            >
              {tab.letter}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {sessionLockReason && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Session Locked</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {sessionLockReason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SOAP Content ── */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* ═══ SUBJECTIVE ═══ */}
        {activeSection === 'S' && (
          <div className="space-y-4">
            <SectionHeader
              icon={<MessageSquare size={14} />}
              title="Subjective — Patient's Report"
              color="bg-blue-50 text-blue-800"
            />
            <PainScale
              value={formData.pain_score_before}
              onChange={(v) => updateField('pain_score_before', v)}
              label="Pain Score Before Treatment (NRS)"
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Patient's Subjective Report
              </label>
              <textarea
                value={formData.subjective_report}
                onChange={(e) =>
                  updateField('subjective_report', e.target.value)
                }
                placeholder="How is the patient feeling today? Current symptoms, location, severity..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Changes Since Last Session
              </label>
              <textarea
                value={formData.changes_since_last}
                onChange={(e) =>
                  updateField('changes_since_last', e.target.value)
                }
                placeholder="Any improvements or worsening since last visit? New symptoms?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Interval History
              </label>
              <textarea
                value={formData.interval_history}
                onChange={(e) =>
                  updateField('interval_history', e.target.value)
                }
                placeholder="Activities since last session, home exercise compliance, sleep quality..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* ═══ OBJECTIVE ═══ */}
        {activeSection === 'O' && (
          <div className="space-y-4">
            <SectionHeader
              icon={<Eye size={14} />}
              title="Objective — Clinical Findings"
              color="bg-emerald-50 text-emerald-800"
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Objective Findings
              </label>
              <textarea
                value={formData.objective_findings}
                onChange={(e) =>
                  updateField('objective_findings', e.target.value)
                }
                placeholder="Physical examination findings, palpation, observation..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ROM Changes
                </label>
                <textarea
                  value={formData.rom_changes}
                  onChange={(e) => updateField('rom_changes', e.target.value)}
                  placeholder="e.g., Shoulder flexion 120° (was 90°)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Muscle Strength
                </label>
                <textarea
                  value={formData.strength_changes}
                  onChange={(e) =>
                    updateField('strength_changes', e.target.value)
                  }
                  placeholder="e.g., Quads 4/5 (was 3/5), Hamstrings 4/5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DescriptiveLevelSelector
                label="Swelling Assessment"
                options={SWELLING_DESCRIPTIVE}
                value={formData.swelling}
                onChange={(v) => updateField('swelling', v as SwellingLevel)}
                colors={LEVEL_COLORS}
              />
              <DescriptiveLevelSelector
                label="Tenderness Assessment"
                options={TENDERNESS_DESCRIPTIVE}
                value={formData.tenderness}
                onChange={(v) =>
                  updateField('tenderness', v as TendernessLevel)
                }
                colors={LEVEL_COLORS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Functional Limitations
              </label>
              <textarea
                value={formData.functional_limitations}
                onChange={(e) =>
                  updateField('functional_limitations', e.target.value)
                }
                placeholder="e.g., Unable to climb stairs, difficulty with overhead reach..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gait Assessment
                </label>
                <textarea
                  value={formData.gait_assessment}
                  onChange={(e) =>
                    updateField('gait_assessment', e.target.value)
                  }
                  placeholder="e.g., Antalgic gait, Trendelenburg +ve on L"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Functional Changes
                </label>
                <textarea
                  value={formData.functional_changes}
                  onChange={(e) =>
                    updateField('functional_changes', e.target.value)
                  }
                  placeholder="e.g., Now able to walk 200m (was 50m)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ TREATMENT ═══ */}
        {activeSection === 'T' && (
          <div className="space-y-4">
            <SectionHeader
              icon={<Activity size={14} />}
              title="Treatment — Interventions Performed"
              color="bg-purple-50 text-purple-800"
            />

            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quick Templates
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TREATMENT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => applyTemplate(tmpl.value)}
                    className="px-2 py-1 text-[10px] rounded-full border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    + {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Treatment Provided <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.treatment_provided}
                onChange={(e) =>
                  updateField('treatment_provided', e.target.value)
                }
                placeholder="Describe treatment provided (e.g., Lumbar spine mobilization Grade III-IV, Core strengthening exercises 3x10)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            {/* Modalities */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Zap className="inline h-3 w-3 mr-0.5" />
                Electrotherapy Modalities
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ELECTRO_MODALITIES.map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleModality(mod)}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      formData.modalities_used.includes(mod)
                        ? 'bg-purple-100 border-purple-300 text-purple-700 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {mod.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercises & Manual Techniques */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Exercises Performed
                </label>
                <textarea
                  value={formData.exercises_performed}
                  onChange={(e) =>
                    updateField('exercises_performed', e.target.value)
                  }
                  placeholder="e.g., Core stability ex, Quad strengthening, Hamstring stretches"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sets / Reps / Parameters
                </label>
                <textarea
                  value={formData.exercise_sets_reps}
                  onChange={(e) =>
                    updateField('exercise_sets_reps', e.target.value)
                  }
                  placeholder="e.g., 3x10 reps, 15 sec hold x5, 2kg weight"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Manual Techniques
              </label>
              <textarea
                value={formData.manual_techniques_used}
                onChange={(e) =>
                  updateField('manual_techniques_used', e.target.value)
                }
                placeholder="e.g., PA glides L4-L5 Grade III, STM to paraspinals, MFR to IT band"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            {/* Duration */}
            <div className="flex items-center gap-4">
              <div className="w-36">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Clock className="inline h-3 w-3 mr-0.5" /> Duration (min)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    updateField(
                      'duration_minutes',
                      parseInt(e.target.value, 10) || 0,
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  min={1}
                  max={180}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ ASSESSMENT ═══ */}
        {activeSection === 'A' && (
          <div className="space-y-4">
            <SectionHeader
              icon={<ClipboardList size={14} />}
              title="Assessment — Clinical Reasoning & Response"
              color="bg-amber-50 text-amber-800"
            />

            <PainScale
              value={formData.pain_score_after}
              onChange={(v) => updateField('pain_score_after', v)}
              label="Pain Score After Treatment (NRS)"
            />

            {/* Pain change indicator */}
            {formData.pain_score_before !== undefined &&
              formData.pain_score_after !== undefined && (
                <div
                  className={`text-xs font-medium px-3 py-1.5 rounded ${
                    formData.pain_score_after < formData.pain_score_before
                      ? 'bg-green-50 text-green-700'
                      : formData.pain_score_after > formData.pain_score_before
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  Pain: {formData.pain_score_before}/10 →{' '}
                  {formData.pain_score_after}/10
                  {formData.pain_score_after < formData.pain_score_before &&
                    ` (↓${formData.pain_score_before - formData.pain_score_after} improvement)`}
                  {formData.pain_score_after > formData.pain_score_before &&
                    ` (↑${formData.pain_score_after - formData.pain_score_before} worsened)`}
                  {formData.pain_score_after === formData.pain_score_before &&
                    ' (no change)'}
                </div>
              )}

            {/* Overall Progress */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Overall Progress Indicator
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PROGRESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('progress_indicator', opt.value)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      formData.progress_indicator === opt.value
                        ? `${opt.color} font-medium`
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {opt.icon} {opt.label}
                    </span>
                    <span
                      className={`text-[9px] leading-tight block mt-0.5 ${
                        formData.progress_indicator === opt.value
                          ? 'opacity-80'
                          : 'text-gray-400'
                      }`}
                    >
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tolerance */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Treatment Tolerance
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TOLERANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('tolerance', opt.value)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      formData.tolerance === opt.value
                        ? `${opt.color} border-current font-medium`
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-semibold block">
                      {opt.label}
                    </span>
                    <span
                      className={`text-[9px] leading-tight block mt-0.5 ${
                        formData.tolerance === opt.value
                          ? 'opacity-80'
                          : 'text-gray-400'
                      }`}
                    >
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Patient Response
                </label>
                <textarea
                  value={formData.patient_response}
                  onChange={(e) =>
                    updateField('patient_response', e.target.value)
                  }
                  placeholder="How did the patient respond to treatment?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Compliance Level
                </label>
                <select
                  value={formData.compliance_level}
                  onChange={(e) =>
                    updateField('compliance_level', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">-- Select compliance level --</option>
                  <option value="Excellent">
                    Excellent — Fully compliant with all instructions & home
                    programme
                  </option>
                  <option value="Good">
                    Good — Mostly compliant, minor deviations from programme
                  </option>
                  <option value="Fair">
                    Fair — Partially compliant, some sessions/exercises missed
                  </option>
                  <option value="Poor">
                    Poor — Non-compliant, not following treatment programme
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Progress Notes / Clinical Reasoning
              </label>
              <textarea
                value={formData.progress_notes}
                onChange={(e) => updateField('progress_notes', e.target.value)}
                placeholder="Clinical observations, reasoning, and overall assessment..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Adverse Reactions
              </label>
              <input
                type="text"
                value={formData.adverse_reactions}
                onChange={(e) =>
                  updateField('adverse_reactions', e.target.value)
                }
                placeholder="Any adverse reactions? (Leave blank if none)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* ═══ PLAN ═══ */}
        {activeSection === 'P' && (
          <div className="space-y-4">
            <SectionHeader
              icon={<Target size={14} />}
              title="Plan — Next Steps & Home Programme"
              color="bg-rose-50 text-rose-800"
            />

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Plan for Next Session
              </label>
              <textarea
                value={formData.next_session_focus}
                onChange={(e) =>
                  updateField('next_session_focus', e.target.value)
                }
                placeholder="Focus areas and goals for next session..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Plan for Next Visit
              </label>
              <textarea
                value={formData.plan_for_next_visit}
                onChange={(e) =>
                  updateField('plan_for_next_visit', e.target.value)
                }
                placeholder="e.g., Progress to resistance exercises, reassess ROM, consider discharge..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.home_program_modified}
                  onChange={(e) =>
                    updateField('home_program_modified', e.target.checked)
                  }
                  className="rounded border-gray-300"
                />
                Home Exercise Programme Modified
              </label>
              {formData.home_program_modified && (
                <textarea
                  value={formData.home_program_changes}
                  onChange={(e) =>
                    updateField('home_program_changes', e.target.value)
                  }
                  placeholder="What changed in the home programme?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Home Exercise Instructions
              </label>
              <textarea
                value={formData.home_exercise_instructions}
                onChange={(e) =>
                  updateField('home_exercise_instructions', e.target.value)
                }
                placeholder="Specific exercises and instructions given to patient for home..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            {/* Billing Option — hidden for NHIS plans, already paid/waived, or completed sessions */}
            {!alreadyPaid && !plan?.is_nhis_plan && session.attendance_status !== 'Attended' && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={billAfterComplete}
                    onChange={(e) => setBillAfterComplete(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Bill this session on completion
                </label>
                {billAfterComplete && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">₦</span>
                    <input
                      type="number"
                      value={sessionFee}
                      onChange={(e) => setSessionFee(e.target.value)}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                      min={0}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer Actions ── */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
        <Button
          variant="outline"
          onClick={() => setShowMissDialog(true)}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <AlertCircle size={14} className="mr-1" />
          Mark as Missed
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRecordSession}
            disabled={
              isSaving ||
              !!sessionLockReason ||
              !formData.treatment_provided.trim()
            }
          >
            <Save size={14} className="mr-1" />
            {isSaving ? 'Saving...' : 'Complete Session'}
          </Button>
        </div>
      </div>

      {/* Mark Missed Dialog */}
      {showMissDialog && (
        <Modal
          isOpen={showMissDialog}
          onClose={() => setShowMissDialog(false)}
          title="Mark Session as Missed"
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              This will mark Session {session.session_number} as missed. This
              action can be undone.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={missReason}
                onChange={(e) => setMissReason(e.target.value)}
                placeholder="Reason for missed session"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMissDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMarkMissed}
                disabled={missSessionMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {missSessionMutation.isPending
                  ? 'Updating...'
                  : 'Mark as Missed'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
