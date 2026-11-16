// =============================================================================
// PhysioAssessmentForm Component
// Initial physiotherapy assessment and evaluation form
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  ClipboardList,
  Save,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  Target,
} from 'lucide-react';
import type {
  CreatePhysioAssessmentDTO,
  UpdatePhysioAssessmentDTO,
  PhysioAssessmentDTO,
  OnsetType,
  MobilityStatus,
  PainCharacter,
  Prognosis,
  RedFlag,
} from '../types/physiotherapy.types';

// =============================================================================
// Types
// =============================================================================

interface PhysioAssessmentFormProps {
  patientId: string;
  encounterId: string;
  existingAssessment?: PhysioAssessmentDTO | null;
  onSaveAssessment: (
    assessment: CreatePhysioAssessmentDTO,
  ) => Promise<PhysioAssessmentDTO>;
  onUpdateAssessment?: (
    assessmentId: string,
    assessment: UpdatePhysioAssessmentDTO,
  ) => Promise<void>;
  readOnly?: boolean;
}

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

const PROGNOSIS_OPTIONS: { value: Prognosis; label: string; color: string }[] =
  [
    {
      value: 'Excellent',
      label: 'Excellent',
      color: 'bg-green-100 text-green-700',
    },
    { value: 'Good', label: 'Good', color: 'bg-blue-100 text-blue-700' },
    { value: 'Fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-700' },
    {
      value: 'Guarded',
      label: 'Guarded',
      color: 'bg-orange-100 text-orange-700',
    },
    { value: 'Poor', label: 'Poor', color: 'bg-red-100 text-red-700' },
  ];

const RED_FLAG_OPTIONS: RedFlag[] = [
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
// Helper Components
// =============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  badge,
  badgeColor,
}: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeColor || 'bg-blue-100 text-blue-700'}`}
            >
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// =============================================================================
// Pain Scale Component
// =============================================================================

interface PainScaleProps {
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}

function PainScale({ value, onChange, label, disabled }: PainScaleProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-lg font-bold text-gray-900">{value ?? '-'}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => !disabled && onChange(num)}
            disabled={disabled}
            className={`
              flex-1 py-2 text-xs font-bold rounded transition-all
              ${
                value === num
                  ? num <= 3
                    ? 'bg-green-500 text-white'
                    : num <= 6
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
              ${disabled ? 'cursor-not-allowed opacity-60' : ''}
            `}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PhysioAssessmentForm({
  patientId,
  encounterId,
  existingAssessment,
  onSaveAssessment,
  onUpdateAssessment,
  readOnly = false,
}: PhysioAssessmentFormProps) {
  // Form state - use full DTO for internal state
  const [formData, setFormData] = useState<Partial<PhysioAssessmentDTO>>(
    () => ({
      patient_id: patientId,
      encounter_id: encounterId,
      // Chief Complaint - fields in CreatePhysioAssessmentDTO
      chief_complaint: existingAssessment?.chief_complaint || '',
      complaint_duration: existingAssessment?.complaint_duration || '',
      onset_type: existingAssessment?.onset_type,
      mechanism_of_injury: existingAssessment?.mechanism_of_injury || '',

      // Pain - fields in CreatePhysioAssessmentDTO
      pain_location: existingAssessment?.pain_location || '',
      pain_score: existingAssessment?.pain_score,
      pain_at_rest: existingAssessment?.pain_at_rest,
      pain_on_activity: existingAssessment?.pain_on_activity,
      pain_character: existingAssessment?.pain_character,
      aggravating_factors: existingAssessment?.aggravating_factors || '',
      relieving_factors: existingAssessment?.relieving_factors || '',

      // History - fields in CreatePhysioAssessmentDTO
      medical_history: existingAssessment?.medical_history || '',
      surgical_history: existingAssessment?.surgical_history || '',
      medications: existingAssessment?.medications || '',
      allergies: existingAssessment?.allergies || '',
      occupation: existingAssessment?.occupation || '',

      // Functional - fields in UpdatePhysioAssessmentDTO
      mobility_status: existingAssessment?.mobility_status,
      functional_status: existingAssessment?.functional_status || '',
      gait_pattern: existingAssessment?.gait_pattern || '',
      balance_assessment: existingAssessment?.balance_assessment || '',

      // ROM - fields in UpdatePhysioAssessmentDTO
      rom_joint: existingAssessment?.rom_joint || '',
      rom_notes: existingAssessment?.rom_notes || '',

      // Muscle strength - fields in UpdatePhysioAssessmentDTO
      muscle_groups_tested: existingAssessment?.muscle_groups_tested || [],
      muscle_strength_notes: existingAssessment?.muscle_strength_notes || '',

      // Neurological - fields in UpdatePhysioAssessmentDTO
      sensation_intact: existingAssessment?.sensation_intact,
      sensation_notes: existingAssessment?.sensation_notes || '',
      reflexes_normal: existingAssessment?.reflexes_normal,

      // Red Flags - fields in UpdatePhysioAssessmentDTO
      red_flags: existingAssessment?.red_flags || [],
      red_flags_present: existingAssessment?.red_flags_present || false,
      precautions: existingAssessment?.precautions || '',
      contraindications: existingAssessment?.contraindications || '',

      // Goals - fields in UpdatePhysioAssessmentDTO
      short_term_goals: existingAssessment?.short_term_goals || '',
      long_term_goals: existingAssessment?.long_term_goals || '',
      patient_goals: existingAssessment?.patient_goals || '',
      estimated_sessions: existingAssessment?.estimated_sessions,

      // Diagnosis - fields in UpdatePhysioAssessmentDTO
      physio_diagnosis: existingAssessment?.physio_diagnosis || '',
      icd_codes: existingAssessment?.icd_codes || [],
      problem_list: existingAssessment?.problem_list || [],
      prognosis: existingAssessment?.prognosis,
      prognosis_notes: existingAssessment?.prognosis_notes || '',

      ...existingAssessment,
    }),
  );

  // Section visibility state
  const [openSections, setOpenSections] = useState({
    chiefComplaint: true,
    painAssessment: true,
    history: false,
    functional: false,
    redFlags: false,
    goals: false,
    diagnosis: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedAssessment, setSavedAssessment] =
    useState<PhysioAssessmentDTO | null>(existingAssessment || null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const updateFormData = useCallback(
    <K extends keyof PhysioAssessmentDTO>(
      field: K,
      value: PhysioAssessmentDTO[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const toggleRedFlag = (flag: RedFlag) => {
    if (readOnly) return;
    const currentFlags = formData.red_flags || [];
    const index = currentFlags.indexOf(flag);
    let newFlags: RedFlag[];

    if (index >= 0) {
      newFlags = currentFlags.filter((_, i) => i !== index);
    } else {
      newFlags = [...currentFlags, flag];
    }

    setFormData((prev) => ({
      ...prev,
      red_flags: newFlags,
      red_flags_present: newFlags.length > 0,
    }));
  };

  const handleSaveAssessment = useCallback(async () => {
    if (readOnly) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (savedAssessment && onUpdateAssessment) {
        // Update existing - use UpdatePhysioAssessmentDTO fields
        const updateData: UpdatePhysioAssessmentDTO = {
          // From CreateDTO (base)
          chief_complaint: formData.chief_complaint,
          complaint_duration: formData.complaint_duration,
          onset_type: formData.onset_type,
          mechanism_of_injury: formData.mechanism_of_injury,
          pain_location: formData.pain_location,
          pain_score: formData.pain_score,
          pain_at_rest: formData.pain_at_rest,
          pain_on_activity: formData.pain_on_activity,
          pain_character: formData.pain_character as string | undefined,
          aggravating_factors: formData.aggravating_factors,
          relieving_factors: formData.relieving_factors,
          medical_history: formData.medical_history,
          surgical_history: formData.surgical_history,
          medications: formData.medications,
          allergies: formData.allergies,
          occupation: formData.occupation,
          // Update-only fields
          functional_status: formData.functional_status,
          mobility_status: formData.mobility_status,
          gait_pattern: formData.gait_pattern,
          balance_assessment: formData.balance_assessment,
          rom_joint: formData.rom_joint,
          rom_notes: formData.rom_notes,
          muscle_groups_tested: formData.muscle_groups_tested,
          muscle_strength_notes: formData.muscle_strength_notes,
          sensation_intact: formData.sensation_intact,
          sensation_notes: formData.sensation_notes,
          reflexes_normal: formData.reflexes_normal,
          physio_diagnosis: formData.physio_diagnosis,
          icd_codes: formData.icd_codes,
          problem_list: formData.problem_list,
          short_term_goals: formData.short_term_goals,
          long_term_goals: formData.long_term_goals,
          patient_goals: formData.patient_goals,
          estimated_sessions: formData.estimated_sessions,
          red_flags: formData.red_flags,
          red_flags_present: formData.red_flags_present,
          precautions: formData.precautions,
          contraindications: formData.contraindications,
          prognosis: formData.prognosis,
          prognosis_notes: formData.prognosis_notes,
        };
        await onUpdateAssessment(savedAssessment.assessment_id, updateData);
        setSuccessMessage('Assessment updated successfully');
      } else {
        // Create new - spread all formData to include all assessment fields
        const createData: CreatePhysioAssessmentDTO = {
          patient_id: patientId,
          encounter_id: encounterId,
          ...formData,
        };
        const newAssessment = await onSaveAssessment(createData);
        setSavedAssessment(newAssessment);
        setSuccessMessage('Assessment saved successfully');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save assessment',
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    formData,
    patientId,
    encounterId,
    savedAssessment,
    onSaveAssessment,
    onUpdateAssessment,
    readOnly,
  ]);

  const hasRedFlags = (formData.red_flags || []).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Physiotherapy Assessment
            </h2>
            <p className="text-sm text-gray-500">
              Initial evaluation and examination
            </p>
          </div>
        </div>
      </div>

      {/* Red Flag Warning */}
      {hasRedFlags && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-800">Red Flags Detected!</h4>
            <p className="text-sm text-red-700 mt-1">
              {(formData.red_flags || []).join(', ')}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Consider medical consultation before proceeding with
              physiotherapy.
            </p>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {/* Chief Complaint Section */}
      <CollapsibleSection
        title="Chief Complaint"
        icon={<FileText className="h-5 w-5 text-emerald-600" />}
        isOpen={openSections.chiefComplaint}
        onToggle={() => toggleSection('chiefComplaint')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chief Complaint <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.chief_complaint || ''}
                onChange={(e) =>
                  updateFormData('chief_complaint', e.target.value)
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={2}
                placeholder="Primary reason for referral..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={formData.complaint_duration || ''}
                onChange={(e) =>
                  updateFormData('complaint_duration', e.target.value)
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., 3 weeks"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Onset Type
              </label>
              <div className="flex flex-wrap gap-2">
                {ONSET_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      !readOnly && updateFormData('onset_type', opt.value)
                    }
                    disabled={readOnly}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${
                        formData.onset_type === opt.value
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                      ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mechanism of Injury
              </label>
              <input
                type="text"
                value={formData.mechanism_of_injury || ''}
                onChange={(e) =>
                  updateFormData('mechanism_of_injury', e.target.value)
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="How did the injury occur?"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Pain Assessment Section */}
      <CollapsibleSection
        title="Pain Assessment"
        icon={<Activity className="h-5 w-5 text-red-600" />}
        isOpen={openSections.painAssessment}
        onToggle={() => toggleSection('painAssessment')}
        badge={
          formData.pain_score !== undefined
            ? `${formData.pain_score}/10`
            : undefined
        }
        badgeColor={
          formData.pain_score !== undefined
            ? formData.pain_score <= 3
              ? 'bg-green-100 text-green-700'
              : formData.pain_score <= 6
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            : undefined
        }
      >
        <div className="space-y-4">
          <PainScale
            value={formData.pain_score}
            onChange={(val) => updateFormData('pain_score', val)}
            label="Current Pain Score (0-10)"
            disabled={readOnly}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pain at Rest (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={formData.pain_at_rest ?? ''}
                onChange={(e) =>
                  updateFormData(
                    'pain_at_rest',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pain on Activity (0-10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={formData.pain_on_activity ?? ''}
                onChange={(e) =>
                  updateFormData(
                    'pain_on_activity',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pain Location
            </label>
            <input
              type="text"
              value={formData.pain_location || ''}
              onChange={(e) => updateFormData('pain_location', e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., Lower back, radiating to left leg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pain Character
            </label>
            <div className="flex flex-wrap gap-2">
              {PAIN_CHARACTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    !readOnly && updateFormData('pain_character', opt.value)
                  }
                  disabled={readOnly}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      formData.pain_character === opt.value
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                    ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aggravating Factors
              </label>
              <textarea
                value={formData.aggravating_factors || ''}
                onChange={(e) =>
                  updateFormData('aggravating_factors', e.target.value)
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={2}
                placeholder="What makes it worse?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relieving Factors
              </label>
              <textarea
                value={formData.relieving_factors || ''}
                onChange={(e) =>
                  updateFormData('relieving_factors', e.target.value)
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={2}
                placeholder="What makes it better?"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Red Flags Section */}
      <CollapsibleSection
        title="Red Flags Screening"
        icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        isOpen={openSections.redFlags}
        onToggle={() => toggleSection('redFlags')}
        badge={
          hasRedFlags ? `${(formData.red_flags || []).length} detected` : 'None'
        }
        badgeColor={
          hasRedFlags
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Screen for red flags that may indicate serious underlying pathology
            requiring medical evaluation.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {RED_FLAG_OPTIONS.map((flag) => (
              <label
                key={flag}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                  ${
                    (formData.red_flags || []).includes(flag)
                      ? 'bg-red-50 border-red-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }
                  ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                `}
              >
                <input
                  type="checkbox"
                  checked={(formData.red_flags || []).includes(flag)}
                  onChange={() => toggleRedFlag(flag)}
                  disabled={readOnly}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">{flag}</span>
              </label>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* Goals Section */}
      <CollapsibleSection
        title="Treatment Goals"
        icon={<Target className="h-5 w-5 text-blue-600" />}
        isOpen={openSections.goals}
        onToggle={() => toggleSection('goals')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short-Term Goals (2-4 weeks)
            </label>
            <textarea
              value={formData.short_term_goals || ''}
              onChange={(e) =>
                updateFormData('short_term_goals', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={3}
              placeholder="SMART goals for the first few weeks..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Long-Term Goals (6-12 weeks)
            </label>
            <textarea
              value={formData.long_term_goals || ''}
              onChange={(e) =>
                updateFormData('long_term_goals', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={3}
              placeholder="Expected outcomes by discharge..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Goals
            </label>
            <textarea
              value={formData.patient_goals || ''}
              onChange={(e) => updateFormData('patient_goals', e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
              placeholder="What does the patient want to achieve?"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Diagnosis Section */}
      <CollapsibleSection
        title="Diagnosis & Prognosis"
        icon={<ClipboardList className="h-5 w-5 text-purple-600" />}
        isOpen={openSections.diagnosis}
        onToggle={() => toggleSection('diagnosis')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Physiotherapy Diagnosis
            </label>
            <textarea
              value={formData.physio_diagnosis || ''}
              onChange={(e) =>
                updateFormData('physio_diagnosis', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
              placeholder="Movement system diagnosis..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prognosis
            </label>
            <div className="flex flex-wrap gap-2">
              {PROGNOSIS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    !readOnly && updateFormData('prognosis', opt.value)
                  }
                  disabled={readOnly}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${
                      formData.prognosis === opt.value
                        ? `${opt.color} ring-2 ring-offset-1`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                    ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prognosis Notes
            </label>
            <textarea
              value={formData.prognosis_notes || ''}
              onChange={(e) =>
                updateFormData('prognosis_notes', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
              placeholder="Factors affecting prognosis..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      {!readOnly && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveAssessment}
            disabled={isSaving || !formData.chief_complaint}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/25"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {savedAssessment ? 'Update Assessment' : 'Save Assessment'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
