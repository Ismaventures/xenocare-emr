/**
 * Physio Assessment View Modal
 * Professional medical record view for physiotherapy assessment details
 * Encounter-centric design with clean, readable layout - COMPREHENSIVE VERSION
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  Calendar,
  User,
  FileText,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  Target,
  TrendingUp,
  Dumbbell,
  Maximize2,
  Minimize2,
  Printer,
  ChevronDown,
  ChevronUp,
  Brain,
  Hand,
  Stethoscope,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import type { PhysioAssessmentDTO } from '../types/physiotherapy.types';
import { extractPrintableFields } from '../../../utils/printFieldUtils';

interface PhysioAssessmentViewModalProps {
  assessment: PhysioAssessmentDTO;
  isOpen: boolean;
  onClose: () => void;
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
  badgeColor = 'bg-gray-100 text-gray-700',
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  badgeColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:break-inside-avoid">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 hover:bg-gray-50 transition-colors print:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Icon className="h-5 w-5 text-emerald-600" />
          </div>
          <h4 className="font-semibold text-gray-900 text-lg">{title}</h4>
          {badge !== undefined && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        <span className="print:hidden">
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </span>
      </button>
      {isOpen && <div className="p-5">{children}</div>}
    </div>
  );
}

export default function PhysioAssessmentViewModal({
  assessment,
  isOpen,
  onClose,
}: PhysioAssessmentViewModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const patientName = assessment.patient
    ? `${assessment.patient.first_name} ${assessment.patient.last_name}`
    : 'Unknown Patient';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'PPP p');
    } catch {
      return dateString;
    }
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'PP');
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  function Field({
    label,
    value,
    className = '',
  }: {
    label: string;
    value?: string | number | null | boolean;
    className?: string;
  }) {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className={className}>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </dt>
        <dd className="text-sm text-gray-900 leading-relaxed">
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
        </dd>
      </div>
    );
  }

  function NotesBlock({
    title,
    content,
  }: {
    title: string;
    content?: string | null;
  }) {
    if (!content) return null;
    return (
      <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-emerald-500">
        <h5 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
          {title}
        </h5>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    );
  }

  function PainScoreBar({ score, label }: { score?: number; label: string }) {
    if (score === undefined || score === null) return null;
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 w-20 font-medium">{label}</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score <= 3
                ? 'bg-green-500'
                : score <= 6
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${(score / 10) * 100}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-800 w-8 text-right">
          {score}/10
        </span>
      </div>
    );
  }

  function ROMTable() {
    const hasROM =
      assessment.rom_flexion_active ||
      assessment.rom_extension_active ||
      assessment.rom_abduction_active ||
      assessment.rom_flexion_passive;
    if (!hasROM) return null;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">
                Movement
              </th>
              <th className="py-2 px-3 text-center text-xs font-semibold text-blue-600">
                Active
              </th>
              <th className="py-2 px-3 text-center text-xs font-semibold text-emerald-600">
                Passive
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(assessment.rom_flexion_active ||
              assessment.rom_flexion_passive) && (
              <tr>
                <td className="py-2 px-3 text-gray-700">Flexion</td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_flexion_active ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_flexion_passive ?? '—'}°
                </td>
              </tr>
            )}
            {(assessment.rom_extension_active ||
              assessment.rom_extension_passive) && (
              <tr>
                <td className="py-2 px-3 text-gray-700">Extension</td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_extension_active ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_extension_passive ?? '—'}°
                </td>
              </tr>
            )}
            {(assessment.rom_abduction_active ||
              assessment.rom_abduction_passive) && (
              <tr>
                <td className="py-2 px-3 text-gray-700">Abduction</td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_abduction_active ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_abduction_passive ?? '—'}°
                </td>
              </tr>
            )}
            {(assessment.rom_adduction_active ||
              assessment.rom_adduction_passive) && (
              <tr>
                <td className="py-2 px-3 text-gray-700">Adduction</td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_adduction_active ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_adduction_passive ?? '—'}°
                </td>
              </tr>
            )}
            {(assessment.rom_internal_rotation_active ||
              assessment.rom_internal_rotation_passive) && (
              <tr>
                <td className="py-2 px-3 text-gray-700">Internal Rotation</td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_internal_rotation_active ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_internal_rotation_passive ?? '—'}°
                </td>
              </tr>
            )}
            {(assessment.rom_external_rotation_active ||
              assessment.rom_external_rotation_passive) && (
              <tr>
                <td className="py-2 px-3 text-gray-700">External Rotation</td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_external_rotation_active ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {assessment.rom_external_rotation_passive ?? '—'}°
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Check if sections have data
  const hasPainData =
    assessment.pain_score !== undefined || assessment.pain_location;
  const hasReferralData =
    assessment.referral_source || assessment.referral_diagnosis;
  const hasFunctionalData =
    assessment.functional_status ||
    assessment.mobility_status ||
    assessment.gait_pattern;
  const hasPostureData =
    assessment.posture_standing ||
    assessment.posture_sitting ||
    assessment.posture_deviations;
  const hasNeurologicalData =
    assessment.sensation_intact !== undefined ||
    assessment.sensation_notes ||
    assessment.dermatome_affected ||
    assessment.reflexes_normal !== undefined;
  const hasSpecialTests =
    assessment.special_tests_performed?.length || assessment.palpation_findings;
  const hasRedFlags =
    assessment.red_flags_present ||
    (assessment.red_flags && assessment.red_flags.length > 0);
  const hasPreviousTreatment =
    assessment.previous_physio_treatment ||
    assessment.previous_treatment_details;

  const allStoredAssessmentFields = useMemo(
    () =>
      extractPrintableFields(
        (assessment as unknown as Record<string, unknown>) || null,
        {
          excludeKeys: ['patient', 'provider', 'encounter'],
          maxDepth: 3,
        },
      ),
    [assessment],
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-200 print:static print:bg-white print:p-0">
      <div
        className={`bg-gray-50 rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out print:rounded-none print:shadow-none print:w-full print:max-w-none print:max-h-none ${
          isMaximized
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'max-w-6xl w-full max-h-[95vh]'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0 print:from-emerald-800 print:to-emerald-800 print:rounded-none">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl p-2.5">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Physiotherapy Assessment Record
              </h2>
              <p className="text-emerald-100 text-sm">
                {formatDate(assessment.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              title="Print"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              title={isMaximized ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isMaximized ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 print:overflow-visible">
          {/* Patient Info Banner */}
          <div className="bg-white border border-emerald-200 rounded-xl p-4 flex items-center gap-4 shadow-sm print:border-2">
            <div className="bg-emerald-100 rounded-full p-3">
              <User className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-lg">
                {patientName}
              </h3>
              <div className="flex items-center gap-4 text-sm text-emerald-700 mt-1">
                {assessment.patient?.emr_number && (
                  <span className="font-semibold">
                    EMR: {assessment.patient.emr_number}
                  </span>
                )}
                <span>•</span>
                <span>ID: {assessment.patient_id}</span>
                {assessment.patient?.date_of_birth && (
                  <>
                    <span>•</span>
                    <span>
                      DOB: {formatDateShort(assessment.patient.date_of_birth)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {assessment.prognosis && (
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    assessment.prognosis === 'Excellent' ||
                    assessment.prognosis === 'Good'
                      ? 'bg-green-100 text-green-800'
                      : assessment.prognosis === 'Fair'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {assessment.prognosis}
                </span>
              )}
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  assessment.status === 'Completed'
                    ? 'bg-green-100 text-green-800'
                    : assessment.status === 'In_Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {assessment.status?.replace('_', ' ') || 'Pending'}
              </span>
            </div>
          </div>

          {/* Red Flags Alert */}
          {hasRedFlags && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 print:break-inside-avoid">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-red-800 text-base">
                    ⚠️ Red Flags Identified
                  </h4>
                  {assessment.red_flags && assessment.red_flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assessment.red_flags.map((flag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                  {assessment.precautions && (
                    <p className="text-sm text-red-700 mt-2">
                      <strong>Precautions:</strong> {assessment.precautions}
                    </p>
                  )}
                  {assessment.contraindications && (
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Contraindications:</strong>{' '}
                      {assessment.contraindications}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chief Complaint */}
          <CollapsibleSection title="Chief Complaint" icon={AlertCircle}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <NotesBlock
                  title="Presenting Complaint"
                  content={assessment.chief_complaint}
                />
              </div>
              <Field label="Duration" value={assessment.complaint_duration} />
              <Field
                label="Onset Type"
                value={assessment.onset_type?.replace('_', ' ')}
              />
              <Field
                label="Onset Date"
                value={formatDateShort(assessment.onset_date)}
              />
              <div className="col-span-2 md:col-span-3">
                <NotesBlock
                  title="Mechanism of Injury"
                  content={assessment.mechanism_of_injury}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Referral Information */}
          {hasReferralData && (
            <CollapsibleSection
              title="Referral Information"
              icon={ClipboardList}
              defaultOpen={false}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field
                  label="Referral Source"
                  value={assessment.referral_source}
                />
                <Field
                  label="Referral Date"
                  value={formatDateShort(assessment.referral_date)}
                />
                <div className="col-span-2">
                  <Field
                    label="Referral Diagnosis"
                    value={assessment.referral_diagnosis}
                  />
                </div>
                {assessment.referral_reason && (
                  <div className="col-span-2 md:col-span-4">
                    <NotesBlock
                      title="Referral Reason"
                      content={assessment.referral_reason}
                    />
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Pain Assessment */}
          {hasPainData && (
            <CollapsibleSection
              title="Pain Assessment"
              icon={Activity}
              badge={
                assessment.pain_score !== undefined
                  ? `${assessment.pain_score}/10`
                  : undefined
              }
              badgeColor={
                (assessment.pain_score ?? 0) <= 3
                  ? 'bg-green-100 text-green-700'
                  : (assessment.pain_score ?? 0) <= 6
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Field
                    label="Pain Location"
                    value={assessment.pain_location}
                  />
                  <Field
                    label="Pain Character"
                    value={assessment.pain_character}
                  />
                  <Field
                    label="Pain Pattern"
                    value={assessment.pain_pattern?.replace('_', ' ')}
                  />
                  <Field
                    label="Pain Radiation"
                    value={assessment.pain_radiation}
                  />
                  <Field label="Night Pain" value={assessment.night_pain} />
                </div>
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Pain Scores (0-10)
                  </h5>
                  <PainScoreBar score={assessment.pain_score} label="Current" />
                  <PainScoreBar
                    score={assessment.pain_at_rest}
                    label="At Rest"
                  />
                  <PainScoreBar
                    score={assessment.pain_on_activity}
                    label="Activity"
                  />
                  <PainScoreBar score={assessment.pain_worst} label="Worst" />
                  <PainScoreBar score={assessment.pain_best} label="Best" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <NotesBlock
                  title="Aggravating Factors"
                  content={assessment.aggravating_factors}
                />
                <NotesBlock
                  title="Relieving Factors"
                  content={assessment.relieving_factors}
                />
              </div>
            </CollapsibleSection>
          )}

          {/* Medical History */}
          <CollapsibleSection
            title="Medical History"
            icon={FileText}
            defaultOpen={false}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Occupation" value={assessment.occupation} />
              <Field label="Hobbies" value={assessment.hobbies} />
              <Field label="Hand Dominance" value={assessment.hand_dominance} />
              <Field label="Allergies" value={assessment.allergies} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <NotesBlock
                title="Medical History"
                content={assessment.medical_history}
              />
              <NotesBlock
                title="Surgical History"
                content={assessment.surgical_history}
              />
              <NotesBlock
                title="Current Medications"
                content={assessment.medications}
              />
            </div>
          </CollapsibleSection>

          {/* Previous Treatment */}
          {hasPreviousTreatment && (
            <CollapsibleSection
              title="Previous Treatment"
              icon={Clock}
              defaultOpen={false}
            >
              <div className="space-y-4">
                <Field
                  label="Previous Physiotherapy"
                  value={assessment.previous_physio_treatment}
                />
                <NotesBlock
                  title="Treatment Details"
                  content={assessment.previous_treatment_details}
                />
                <NotesBlock
                  title="Response to Treatment"
                  content={assessment.previous_treatment_response}
                />
              </div>
            </CollapsibleSection>
          )}

          {/* Functional Assessment */}
          {hasFunctionalData && (
            <CollapsibleSection title="Functional Assessment" icon={TrendingUp}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field
                  label="Functional Status"
                  value={assessment.functional_status}
                />
                <Field
                  label="Mobility Status"
                  value={assessment.mobility_status?.replace('_', ' ')}
                />
                <Field label="ADL Status" value={assessment.adl_status} />
                <Field label="Gait Pattern" value={assessment.gait_pattern} />
                <Field
                  label="Balance Assessment"
                  value={assessment.balance_assessment}
                />
                <Field label="Fall History" value={assessment.fall_history} />
                {assessment.gait_aids_used &&
                  assessment.gait_aids_used.length > 0 && (
                    <div className="col-span-2 md:col-span-3">
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Gait Aids Used
                      </dt>
                      <div className="flex flex-wrap gap-2">
                        {assessment.gait_aids_used.map((aid, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded"
                          >
                            {aid.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </CollapsibleSection>
          )}

          {/* Posture Assessment */}
          {hasPostureData && (
            <CollapsibleSection
              title="Posture Assessment"
              icon={User}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NotesBlock
                  title="Standing Posture"
                  content={assessment.posture_standing}
                />
                <NotesBlock
                  title="Sitting Posture"
                  content={assessment.posture_sitting}
                />
                <NotesBlock
                  title="Posture Deviations"
                  content={assessment.posture_deviations}
                />
              </div>
            </CollapsibleSection>
          )}

          {/* Range of Motion */}
          <CollapsibleSection title="Range of Motion" icon={Activity}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Joint Assessed" value={assessment.rom_joint} />
                <Field
                  label="End Feel"
                  value={assessment.rom_end_feel?.replace('_', ' ')}
                />
                <Field label="Pain Arc" value={assessment.rom_pain_arc} />
              </div>
              <ROMTable />
              {assessment.rom_notes && (
                <NotesBlock title="ROM Notes" content={assessment.rom_notes} />
              )}
            </div>
          </CollapsibleSection>

          {/* Muscle Strength */}
          <CollapsibleSection
            title="Muscle Strength"
            icon={Dumbbell}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {assessment.muscle_groups_tested &&
                assessment.muscle_groups_tested.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Muscle Groups Tested
                    </dt>
                    <div className="flex flex-wrap gap-2">
                      {assessment.muscle_groups_tested.map((group, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {assessment.muscle_strength_grades &&
                Object.keys(assessment.muscle_strength_grades).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">
                            Muscle Group
                          </th>
                          <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500">
                            Grade (0-5)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(assessment.muscle_strength_grades).map(
                          ([muscle, grade]) => (
                            <tr key={muscle}>
                              <td className="py-2 px-3 text-gray-700">
                                {muscle}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold">
                                {grade}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              {assessment.muscle_strength_notes && (
                <NotesBlock
                  title="Strength Notes"
                  content={assessment.muscle_strength_notes}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* Neurological Assessment */}
          {hasNeurologicalData && (
            <CollapsibleSection
              title="Neurological Assessment"
              icon={Brain}
              defaultOpen={false}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field
                  label="Sensation Intact"
                  value={assessment.sensation_intact}
                />
                <Field
                  label="Reflexes Normal"
                  value={assessment.reflexes_normal}
                />
                <Field
                  label="Dermatome Affected"
                  value={assessment.dermatome_affected}
                />
                <Field
                  label="Myotome Affected"
                  value={assessment.myotome_affected}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <NotesBlock
                  title="Sensation Notes"
                  content={assessment.sensation_notes}
                />
                <NotesBlock
                  title="Reflex Notes"
                  content={assessment.reflex_notes}
                />
                <NotesBlock
                  title="Neural Tension Tests"
                  content={assessment.neural_tension_tests}
                />
              </div>
              {assessment.reflexes_tested &&
                assessment.reflexes_tested.length > 0 && (
                  <div className="mt-4">
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Reflexes Tested
                    </dt>
                    <div className="flex flex-wrap gap-2">
                      {assessment.reflexes_tested.map((reflex, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded"
                        >
                          {reflex}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </CollapsibleSection>
          )}

          {/* Special Tests & Palpation */}
          {hasSpecialTests && (
            <CollapsibleSection
              title="Special Tests & Palpation"
              icon={Hand}
              defaultOpen={false}
            >
              <div className="space-y-4">
                {assessment.special_tests_performed &&
                  assessment.special_tests_performed.length > 0 && (
                    <div>
                      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Special Tests Performed
                      </dt>
                      <div className="flex flex-wrap gap-2">
                        {assessment.special_tests_performed.map((test, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded"
                          >
                            {test}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {assessment.special_tests_findings &&
                  Object.keys(assessment.special_tests_findings).length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">
                              Test
                            </th>
                            <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">
                              Finding
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Object.entries(
                            assessment.special_tests_findings,
                          ).map(([test, finding]) => (
                            <tr key={test}>
                              <td className="py-2 px-3 text-gray-700 font-medium">
                                {test}
                              </td>
                              <td className="py-2 px-3 text-gray-600">
                                {finding}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NotesBlock
                    title="Palpation Findings"
                    content={assessment.palpation_findings}
                  />
                  <NotesBlock
                    title="Trigger Points"
                    content={assessment.trigger_points}
                  />
                  <Field
                    label="Tenderness Location"
                    value={assessment.tenderness_location}
                  />
                  <Field
                    label="Swelling Present"
                    value={assessment.swelling_present}
                  />
                </div>
                {assessment.swelling_notes && (
                  <NotesBlock
                    title="Swelling Notes"
                    content={assessment.swelling_notes}
                  />
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Diagnosis & Prognosis */}
          <CollapsibleSection title="Diagnosis & Prognosis" icon={CheckCircle}>
            <div className="space-y-4">
              <NotesBlock
                title="Physiotherapy Diagnosis"
                content={assessment.physio_diagnosis}
              />

              {assessment.problem_list &&
                assessment.problem_list.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Problem List
                    </dt>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {assessment.problem_list.map((problem, idx) => (
                        <li key={idx}>{problem}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {assessment.icd_codes && assessment.icd_codes.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    ICD Codes
                  </dt>
                  <div className="flex flex-wrap gap-2">
                    {assessment.icd_codes.map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <Field label="Prognosis" value={assessment.prognosis} />
              </div>
              {assessment.prognosis_notes && (
                <NotesBlock
                  title="Prognosis Notes"
                  content={assessment.prognosis_notes}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* Treatment Goals */}
          <CollapsibleSection title="Treatment Goals" icon={Target}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NotesBlock
                  title="Short-term Goals"
                  content={assessment.short_term_goals}
                />
                <NotesBlock
                  title="Long-term Goals"
                  content={assessment.long_term_goals}
                />
                <NotesBlock
                  title="Patient Goals"
                  content={assessment.patient_goals}
                />
                <NotesBlock
                  title="Expected Outcomes"
                  content={assessment.expected_outcomes}
                />
              </div>

              {(assessment.estimated_sessions ||
                assessment.estimated_duration_weeks) && (
                <div className="flex gap-4 pt-2">
                  {assessment.estimated_sessions && (
                    <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
                      <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                        Est. Sessions
                      </span>
                      <p className="text-3xl font-bold text-emerald-600">
                        {assessment.estimated_sessions}
                      </p>
                    </div>
                  )}
                  {assessment.estimated_duration_weeks && (
                    <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
                      <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                        Est. Duration
                      </span>
                      <p className="text-3xl font-bold text-emerald-600">
                        {assessment.estimated_duration_weeks}
                      </p>
                      <span className="text-xs text-gray-500 block">weeks</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Yellow Flags */}
          {assessment.yellow_flags && assessment.yellow_flags.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5" />
                Yellow Flags (Psychosocial Factors)
              </h4>
              <div className="flex flex-wrap gap-2">
                {assessment.yellow_flags.map((flag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {allStoredAssessmentFields.length > 0 && (
            <CollapsibleSection
              title="All Stored Assessment Fields"
              icon={FileText}
              defaultOpen={false}
              badge={allStoredAssessmentFields.length}
              badgeColor="bg-emerald-100 text-emerald-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {allStoredAssessmentFields.map((field) => (
                  <div
                    key={field.key}
                    className="border border-gray-200 bg-gray-50 rounded p-2.5"
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">
                      {field.label}
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mt-0.5">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Record Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-semibold text-gray-700 text-sm">
                Record Information
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs block">Created</span>
                <span className="text-gray-900">
                  {formatDate(assessment.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block">
                  Last Updated
                </span>
                <span className="text-gray-900">
                  {formatDate(assessment.updated_at)}
                </span>
              </div>
              {assessment.finalized_at && (
                <div>
                  <span className="text-gray-500 text-xs block">Finalized</span>
                  <span className="text-gray-900">
                    {formatDate(assessment.finalized_at)}
                  </span>
                </div>
              )}
              {assessment.provider && (
                <div>
                  <span className="text-gray-500 text-xs block">Therapist</span>
                  <span className="text-gray-900">
                    {assessment.provider.first_name}{' '}
                    {assessment.provider.last_name}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-mono">
                Assessment ID: {assessment.assessment_id} | Encounter:{' '}
                {assessment.encounter_id}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0 print:hidden">
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
