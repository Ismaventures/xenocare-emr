// =============================================================================
// PhysioSessionForm Component
// Physiotherapy session logging and documentation
// =============================================================================

import React, { useState, useCallback } from 'react';
import {
  Activity,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  MessageSquare,
} from 'lucide-react';
import type {
  PhysioSessionDTO,
  CreatePhysioSessionDTO,
  PhysioAssessmentDTO,
  ManualTherapyTechnique,
  ElectrotherapyModality,
  ThermalTherapy,
  ToleranceLevel,
  AttendanceStatus,
} from '../types/physiotherapy.types';

// =============================================================================
// Types
// =============================================================================

interface PhysioSessionFormProps {
  patientId: string;
  encounterId: string;
  assessmentId: string;
  planId?: string;
  sessionNumber: number;
  existingSession?: PhysioSessionDTO | null;
  assessment?: PhysioAssessmentDTO | null;
  onSaveSession: (session: CreatePhysioSessionDTO) => Promise<PhysioSessionDTO>;
  onUpdateSession?: (
    sessionId: string,
    session: Partial<CreatePhysioSessionDTO>,
  ) => Promise<void>;
  readOnly?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const MANUAL_THERAPY_OPTIONS: {
  value: ManualTherapyTechnique;
  label: string;
}[] = [
  { value: 'Joint_Mobilization', label: 'Joint Mobilization' },
  { value: 'Joint_Manipulation', label: 'Joint Manipulation' },
  { value: 'Soft_Tissue_Mobilization', label: 'Soft Tissue Mobilization' },
  { value: 'Massage', label: 'Massage' },
  { value: 'MFR', label: 'Myofascial Release (MFR)' },
  { value: 'Stretching', label: 'Stretching' },
  { value: 'Trigger_Point_Release', label: 'Trigger Point Release' },
  { value: 'Dry_Needling', label: 'Dry Needling' },
  { value: 'Muscle_Energy_Technique', label: 'Muscle Energy Technique' },
  { value: 'Neural_Mobilization', label: 'Neural Mobilization' },
];

const ELECTROTHERAPY_OPTIONS: {
  value: ElectrotherapyModality;
  label: string;
  desc: string;
}[] = [
  {
    value: 'TENS',
    label: 'TENS',
    desc: 'Transcutaneous Electrical Nerve Stimulation',
  },
  { value: 'IFT', label: 'IFT', desc: 'Interferential Therapy' },
  { value: 'Ultrasound', label: 'Ultrasound', desc: 'Therapeutic Ultrasound' },
  { value: 'SWD', label: 'SWD', desc: 'Short Wave Diathermy' },
  { value: 'MWD', label: 'MWD', desc: 'Microwave Diathermy' },
  { value: 'Laser', label: 'Laser', desc: 'Low Level Laser Therapy' },
  { value: 'EMS', label: 'EMS', desc: 'Electrical Muscle Stimulation' },
  {
    value: 'NMES',
    label: 'NMES',
    desc: 'Neuromuscular Electrical Stimulation',
  },
  {
    value: 'Shockwave',
    label: 'Shockwave',
    desc: 'Extracorporeal Shockwave Therapy',
  },
];

const THERMAL_THERAPY_OPTIONS: {
  value: ThermalTherapy;
  label: string;
  type: 'heat' | 'cold';
}[] = [
  { value: 'Hot_Pack', label: 'Hot Pack', type: 'heat' },
  { value: 'Wax_Bath', label: 'Wax Bath', type: 'heat' },
  { value: 'Infrared', label: 'Infrared', type: 'heat' },
  { value: 'Ice_Pack', label: 'Ice Pack', type: 'cold' },
  { value: 'Cold_Spray', label: 'Cold Spray', type: 'cold' },
  { value: 'Ice_Massage', label: 'Ice Massage', type: 'cold' },
  { value: 'Contrast_Bath', label: 'Contrast Bath', type: 'heat' },
];

const TOLERANCE_OPTIONS: {
  value: ToleranceLevel;
  label: string;
  color: string;
}[] = [
  { value: 'Good', label: 'Good', color: 'bg-green-100 text-green-700' },
  { value: 'Fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'Poor', label: 'Poor', color: 'bg-red-100 text-red-700' },
];

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'Attended', label: 'Attended' },
  { value: 'Missed', label: 'Missed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Rescheduled', label: 'Rescheduled' },
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
}

function CollapsibleSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
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
      <div className="flex justify-between text-xs text-gray-400">
        <span>No Pain</span>
        <span>Moderate</span>
        <span>Worst Pain</span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PhysioSessionForm({
  patientId,
  encounterId,
  assessmentId,
  planId,
  sessionNumber,
  existingSession,
  onSaveSession,
  onUpdateSession,
  readOnly = false,
}: PhysioSessionFormProps) {
  // Form state using CreatePhysioSessionDTO fields
  const [formData, setFormData] = useState<Partial<CreatePhysioSessionDTO>>(
    () => ({
      patient_id: patientId,
      encounter_id: encounterId,
      assessment_id: assessmentId,
      plan_id: planId,
      session_number: sessionNumber,
      session_date:
        existingSession?.session_date || new Date().toISOString().split('T')[0],

      // Pre-treatment (Subjective)
      pain_score_before: existingSession?.pain_score_before,
      subjective_report: existingSession?.subjective_report || '',
      interval_history: existingSession?.interval_history || '',

      // Objective
      objective_findings: existingSession?.objective_findings || '',
      rom_changes: existingSession?.rom_changes || '',
      strength_changes: existingSession?.strength_changes || '',

      // Treatment
      treatment_provided: existingSession?.treatment_provided || '',
      modalities_used: existingSession?.modalities_used || [],
      exercises_performed: existingSession?.exercises_performed || '',
      manual_techniques_used: existingSession?.manual_techniques_used || '',

      // Response
      patient_response: existingSession?.patient_response || '',
      pain_score_after: existingSession?.pain_score_after,
      tolerance: existingSession?.tolerance,
      adverse_reactions: existingSession?.adverse_reactions || '',

      // Progress
      progress_notes: existingSession?.progress_notes || '',
      goals_addressed: existingSession?.goals_addressed || [],

      // Plan
      next_session_plan: existingSession?.next_session_plan || '',
      home_program_modified: existingSession?.home_program_modified || false,
      home_program_changes: existingSession?.home_program_changes || '',

      // Attendance
      attendance_status: existingSession?.attendance_status || 'Attended',
      missed_reason: existingSession?.missed_reason || '',
      duration_minutes: existingSession?.duration_minutes,
    }),
  );

  // Local state for UI - modality selection
  const [selectedModalities, setSelectedModalities] = useState<string[]>(
    existingSession?.modalities_used || [],
  );
  const [selectedThermalTherapy, setSelectedThermalTherapy] = useState<
    ThermalTherapy[]
  >([]);

  // Section visibility state
  const [openSections, setOpenSections] = useState({
    subjective: true,
    treatment: true,
    objective: false,
    plan: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSession, setSavedSession] = useState<PhysioSessionDTO | null>(
    existingSession || null,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const updateFormData = useCallback(
    <K extends keyof CreatePhysioSessionDTO>(
      field: K,
      value: CreatePhysioSessionDTO[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const toggleArrayItem = <T,>(array: T[], item: T): T[] => {
    const index = array.indexOf(item);
    if (index >= 0) {
      return array.filter((_, i) => i !== index);
    }
    return [...array, item];
  };

  const toggleModality = (modality: string) => {
    if (readOnly) return;
    const newModalities = toggleArrayItem(selectedModalities, modality);
    setSelectedModalities(newModalities);
    updateFormData('modalities_used', newModalities);
  };

  const toggleThermal = (therapy: ThermalTherapy) => {
    if (readOnly) return;
    const newTherapy = toggleArrayItem(selectedThermalTherapy, therapy);
    setSelectedThermalTherapy(newTherapy);
    // Combine with modalities
    const allModalities = [
      ...selectedModalities.filter(
        (m) => !THERMAL_THERAPY_OPTIONS.some((t) => t.value === m),
      ),
      ...newTherapy,
    ];
    updateFormData('modalities_used', allModalities);
  };

  const handleSaveSession = useCallback(async () => {
    if (readOnly) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const sessionData: CreatePhysioSessionDTO = {
        patient_id: patientId,
        encounter_id: encounterId,
        assessment_id: assessmentId,
        plan_id: planId || '',
        session_number: sessionNumber,
        session_date:
          formData.session_date || new Date().toISOString().split('T')[0],
        treatment_provided: formData.treatment_provided || 'Session completed',
        // Subjective
        pain_score_before: formData.pain_score_before,
        subjective_report: formData.subjective_report,
        interval_history: formData.interval_history,
        // Objective
        objective_findings: formData.objective_findings,
        rom_changes: formData.rom_changes,
        strength_changes: formData.strength_changes,
        // Treatment
        modalities_used: formData.modalities_used,
        exercises_performed: formData.exercises_performed,
        manual_techniques_used: formData.manual_techniques_used,
        // Response
        patient_response: formData.patient_response,
        pain_score_after: formData.pain_score_after,
        tolerance: formData.tolerance,
        adverse_reactions: formData.adverse_reactions,
        // Progress
        progress_notes: formData.progress_notes,
        goals_addressed: formData.goals_addressed,
        // Plan
        next_session_plan: formData.next_session_plan,
        home_program_modified: formData.home_program_modified,
        home_program_changes: formData.home_program_changes,
        // Attendance
        attendance_status: formData.attendance_status,
        missed_reason: formData.missed_reason,
        duration_minutes: formData.duration_minutes,
      };

      if (savedSession && onUpdateSession) {
        await onUpdateSession(savedSession.session_id, sessionData);
        setSuccessMessage('Session updated successfully');
      } else {
        const newSession = await onSaveSession(sessionData);
        setSavedSession(newSession);
        setSuccessMessage('Session saved successfully');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setIsSaving(false);
    }
  }, [
    formData,
    patientId,
    encounterId,
    assessmentId,
    planId,
    sessionNumber,
    savedSession,
    onSaveSession,
    onUpdateSession,
    readOnly,
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Physiotherapy Session
              </h2>
              <p className="text-sm text-gray-500">Session #{sessionNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={formData.attendance_status || 'Attended'}
              onChange={(e) =>
                updateFormData(
                  'attendance_status',
                  e.target.value as AttendanceStatus,
                )
              }
              disabled={readOnly}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {ATTENDANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="px-3 py-2 bg-white rounded-lg border">
              <input
                type="date"
                value={formData.session_date || ''}
                onChange={(e) => updateFormData('session_date', e.target.value)}
                disabled={readOnly}
                className="text-sm font-medium text-gray-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

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

      {/* Subjective Section */}
      <CollapsibleSection
        title="Subjective (S)"
        icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
        isOpen={openSections.subjective}
        onToggle={() => toggleSection('subjective')}
      >
        <div className="space-y-4">
          {/* Pre-treatment Pain */}
          <PainScale
            value={formData.pain_score_before}
            onChange={(val) => updateFormData('pain_score_before', val)}
            label="Pain Score Before Treatment"
            disabled={readOnly}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subjective Report
            </label>
            <textarea
              value={formData.subjective_report || ''}
              onChange={(e) =>
                updateFormData('subjective_report', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              placeholder="How is the patient feeling today?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interval History
            </label>
            <textarea
              value={formData.interval_history || ''}
              onChange={(e) =>
                updateFormData('interval_history', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              placeholder="What happened since last session?"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Treatment Section */}
      <CollapsibleSection
        title="Treatment Provided"
        icon={<Zap className="h-5 w-5 text-amber-600" />}
        isOpen={openSections.treatment}
        onToggle={() => toggleSection('treatment')}
      >
        <div className="space-y-4">
          {/* Manual Therapy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manual Therapy Techniques
            </label>
            <div className="flex flex-wrap gap-2">
              {MANUAL_THERAPY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (!readOnly) {
                      const current = formData.manual_techniques_used || '';
                      const techniques = current.split(', ').filter(Boolean);
                      const newTechniques = techniques.includes(opt.label)
                        ? techniques.filter((t) => t !== opt.label)
                        : [...techniques, opt.label];
                      updateFormData(
                        'manual_techniques_used',
                        newTechniques.join(', '),
                      );
                    }
                  }}
                  disabled={readOnly}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      (formData.manual_techniques_used || '').includes(
                        opt.label,
                      )
                        ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500'
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

          {/* Electrotherapy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Electrotherapy Modalities
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ELECTROTHERAPY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleModality(opt.value)}
                  disabled={readOnly}
                  title={opt.desc}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all text-left
                    ${
                      selectedModalities.includes(opt.value)
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                    ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
                  `}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-xs opacity-75 truncate">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Thermal Therapy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thermal Therapy
            </label>
            <div className="flex flex-wrap gap-2">
              {THERMAL_THERAPY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleThermal(opt.value)}
                  disabled={readOnly}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      selectedThermalTherapy.includes(opt.value)
                        ? opt.type === 'heat'
                          ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500'
                          : 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
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

          {/* Exercises */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exercises Performed
            </label>
            <textarea
              value={formData.exercises_performed || ''}
              onChange={(e) =>
                updateFormData('exercises_performed', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={3}
              placeholder="List exercises performed with sets/reps..."
            />
          </div>

          {/* Treatment Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treatment Summary *
            </label>
            <textarea
              value={formData.treatment_provided || ''}
              onChange={(e) =>
                updateFormData('treatment_provided', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={3}
              placeholder="Overall treatment provided this session..."
            />
          </div>

          {/* Duration */}
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={0}
              value={formData.duration_minutes ?? ''}
              onChange={(e) =>
                updateFormData(
                  'duration_minutes',
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="e.g., 45"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Objective Section */}
      <CollapsibleSection
        title="Objective (O) - Response"
        icon={<Target className="h-5 w-5 text-green-600" />}
        isOpen={openSections.objective}
        onToggle={() => toggleSection('objective')}
      >
        <div className="space-y-4">
          {/* Post-treatment Pain */}
          <PainScale
            value={formData.pain_score_after}
            onChange={(val) => updateFormData('pain_score_after', val)}
            label="Pain Score After Treatment"
            disabled={readOnly}
          />

          {/* Tolerance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Treatment Tolerance
            </label>
            <div className="flex gap-2">
              {TOLERANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    !readOnly && updateFormData('tolerance', opt.value)
                  }
                  disabled={readOnly}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${
                      formData.tolerance === opt.value
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
              Patient Response
            </label>
            <textarea
              value={formData.patient_response || ''}
              onChange={(e) =>
                updateFormData('patient_response', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              placeholder="How did the patient respond to treatment?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adverse Reactions (if any)
            </label>
            <textarea
              value={formData.adverse_reactions || ''}
              onChange={(e) =>
                updateFormData('adverse_reactions', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              placeholder="Note any adverse reactions..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Progress Notes
            </label>
            <textarea
              value={formData.progress_notes || ''}
              onChange={(e) => updateFormData('progress_notes', e.target.value)}
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={3}
              placeholder="Overall progress observations..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Plan Section */}
      <CollapsibleSection
        title="Plan (P)"
        icon={<Target className="h-5 w-5 text-purple-600" />}
        isOpen={openSections.plan}
        onToggle={() => toggleSection('plan')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Next Session Plan
            </label>
            <textarea
              value={formData.next_session_plan || ''}
              onChange={(e) =>
                updateFormData('next_session_plan', e.target.value)
              }
              disabled={readOnly}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              rows={2}
              placeholder="What to focus on next session..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.home_program_modified || false}
                onChange={(e) =>
                  updateFormData('home_program_modified', e.target.checked)
                }
                disabled={readOnly}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Home Program Modified
              </span>
            </label>
            {formData.home_program_modified && (
              <textarea
                value={formData.home_program_changes || ''}
                onChange={(e) =>
                  updateFormData('home_program_changes', e.target.value)
                }
                disabled={readOnly}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
                rows={3}
                placeholder="Changes to home exercise program..."
              />
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      {!readOnly && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveSession}
            disabled={isSaving || !formData.treatment_provided}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/25"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {savedSession ? 'Update Session' : 'Save Session'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
