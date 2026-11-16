/**
 * Eye Examination Record - Patient View
 *
 * World-class ophthalmology EMR interface designed for tertiary hospital
 * and specialist eye clinic documentation standards.
 *
 * Design principles:
 * - Clear OD/OS separation for rapid clinical comparison
 * - Logical clinical grouping following standard ophthalmic examination flow
 * - Professional, neutral medical design suitable for printing
 * - Collapsible sections for detailed findings
 * - All data fields preserved exactly as-is
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  Calendar,
  User,
  FileText,
  Eye,
  Clock,
  ChevronDown,
  ChevronRight,
  Printer,
  Maximize2,
  Minimize2,
  Activity,
  AlertCircle,
  Stethoscope,
  Target,
  Circle,
  Glasses,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import type { EyeExamDTO } from '../types/ophthalmology.types';
import { extractPrintableFields } from '../../../utils/printFieldUtils';

interface EyeExamViewModalProps {
  exam: EyeExamDTO;
  isOpen: boolean;
  onClose: () => void;
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden print:border-slate-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors print:bg-slate-100"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            {title}
          </h3>
          {badge && (
            <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded font-medium">
              {badge}
            </span>
          )}
        </div>
      </button>
      {isOpen && <div className="p-4 print:block">{children}</div>}
    </div>
  );
}

// OD/OS Comparison Table
interface ComparisonRowProps {
  label: string;
  od?: string | number | null;
  os?: string | number | null;
  unit?: string;
  highlight?: boolean;
}

function ComparisonRow({
  label,
  od,
  os,
  unit = '',
  highlight = false,
}: ComparisonRowProps) {
  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === '') return '—';
    return unit ? `${val}${unit}` : val;
  };

  return (
    <tr
      className={`border-b border-slate-100 last:border-0 ${highlight ? 'bg-amber-50' : ''}`}
    >
      <td className="py-2.5 px-3 text-sm text-slate-600 font-medium w-1/3">
        {label}
      </td>
      <td className="py-2.5 px-3 text-sm text-slate-900 font-mono text-center border-l border-slate-100">
        {formatValue(od)}
      </td>
      <td className="py-2.5 px-3 text-sm text-slate-900 font-mono text-center border-l border-slate-100">
        {formatValue(os)}
      </td>
    </tr>
  );
}

// OD/OS Table Header
function ODOSHeader() {
  return (
    <thead>
      <tr className="bg-slate-100">
        <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">
          Parameter
        </th>
        <th className="py-2 px-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-l border-slate-200">
          <span className="inline-flex items-center gap-1">
            <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />
            OD (Right)
          </span>
        </th>
        <th className="py-2 px-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border-l border-slate-200">
          <span className="inline-flex items-center gap-1">
            <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
            OS (Left)
          </span>
        </th>
      </tr>
    </thead>
  );
}

// Data Field Component
function DataField({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

// Notes Display Component
function NotesDisplay({
  label,
  content,
}: {
  label: string;
  content?: string | null;
}) {
  if (!content) return null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-3">
      <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
        {content}
      </dd>
    </div>
  );
}

// Key Metric Card
function MetricCard({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string;
  value?: string | number | null;
  unit?: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 font-mono">
        {value ?? '—'}
        {unit && (
          <span className="text-sm font-normal text-slate-500 ml-0.5">
            {unit}
          </span>
        )}
      </div>
      {sublabel && (
        <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}

export default function EyeExamViewModal({
  exam,
  isOpen,
  onClose,
}: EyeExamViewModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const patientName = exam.patient
    ? `${exam.patient.first_name} ${exam.patient.surname}`
    : 'Unknown Patient';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Check if sections have data
  const hasHistory =
    exam.ocular_history ||
    exam.ocular_surgery_history ||
    exam.systemic_history ||
    exam.family_history ||
    exam.drug_allergy ||
    exam.current_medications ||
    exam.glasses_history ||
    exam.contact_lens_history;

  const hasAutoRefraction =
    exam.ar_right_sphere ||
    exam.ar_left_sphere ||
    exam.ar_right_cylinder ||
    exam.ar_left_cylinder;

  const hasPupilMotility =
    exam.pupil_right_size ||
    exam.pupil_left_size ||
    exam.cover_test ||
    exam.ocular_motility ||
    exam.convergence ||
    exam.npc;

  const hasAnteriorSegment =
    exam.anterior_right_lids ||
    exam.anterior_left_lids ||
    exam.anterior_right_cornea ||
    exam.anterior_left_cornea ||
    exam.anterior_right_ac ||
    exam.anterior_left_ac ||
    exam.anterior_right_lens ||
    exam.anterior_left_lens;

  const hasGonioscopy =
    exam.gonioscopy_right ||
    exam.gonioscopy_left ||
    exam.angle_right ||
    exam.angle_left;

  const hasPosteriorSegment =
    exam.posterior_right_disc ||
    exam.posterior_left_disc ||
    exam.posterior_right_macula ||
    exam.posterior_left_macula ||
    exam.dilation_performed !== undefined;

  const hasAdditionalTests =
    exam.color_vision ||
    exam.contrast_sensitivity ||
    exam.amsler_grid ||
    exam.schirmer_test_right ||
    exam.schirmer_test_left ||
    exam.visual_field_notes;

  const hasFollowUp =
    exam.follow_up_date || exam.follow_up_notes || exam.follow_up_interval;

  const allStoredExamFields = useMemo(
    () =>
      extractPrintableFields(
        (exam as unknown as Record<string, unknown>) || null,
        {
          excludeKeys: ['patient', 'provider', 'encounter'],
          maxDepth: 3,
        },
      ),
    [exam],
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 print:p-0 print:bg-white print:static">
      <div
        className={`bg-slate-50 flex flex-col shadow-2xl print:shadow-none print:w-full print:h-auto print:max-h-none ${
          isMaximized
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'max-w-6xl w-full max-h-[96vh] rounded-xl'
        }`}
      >
        {/* Document Header - Professional Medical Record Style */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 print:border-b-2 print:border-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-slate-700" />
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  OPHTHALMIC EXAMINATION RECORD
                </h1>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span>
                  Exam Date:{' '}
                  <strong className="text-slate-700">
                    {formatDate(exam.created_at)}
                  </strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  ID:{' '}
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    {exam.exam_id?.slice(0, 8)}
                  </code>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Print record"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 print:overflow-visible print:p-4">
          {/* Patient Demographics Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 print:border-2 print:border-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-slate-200 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {patientName}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    {exam.patient?.emr_number && (
                      <span>
                        MRN:{' '}
                        <strong className="text-slate-700">
                          {exam.patient.emr_number}
                        </strong>
                      </span>
                    )}
                    {exam.patient?.date_of_birth && (
                      <span>
                        DOB:{' '}
                        <strong className="text-slate-700">
                          {formatDateShort(exam.patient.date_of_birth)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {exam.encounter?.encounter_number && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase">
                      Encounter
                    </div>
                    <div className="font-mono text-sm font-semibold text-slate-700">
                      {exam.encounter.encounter_number}
                    </div>
                  </div>
                )}
                {exam.affected_eye && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                    {exam.affected_eye === 'Both'
                      ? 'OU'
                      : exam.affected_eye === 'Right'
                        ? 'OD'
                        : 'OS'}{' '}
                    Affected
                  </span>
                )}
                <span
                  className={`px-3 py-1.5 rounded text-sm font-semibold ${
                    exam.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : exam.status === 'In_Progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {exam.status?.replace('_', ' ') || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Chief Complaint - Prominent Display */}
          <div className="bg-white border-l-4 border-amber-500 rounded-r-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Chief Complaint
                </h3>
                <p className="text-slate-900 font-medium">
                  {exam.chief_complaint || '—'}
                </p>
                {exam.complaint_duration && (
                  <p className="text-sm text-slate-500 mt-1">
                    Duration: {exam.complaint_duration}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* History Section */}
          {hasHistory && (
            <CollapsibleSection title="Clinical History" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <DataField
                    label="Ocular History"
                    value={exam.ocular_history}
                  />
                  <DataField
                    label="Ocular Surgery History"
                    value={exam.ocular_surgery_history}
                  />
                  <DataField
                    label="Glasses History"
                    value={exam.glasses_history}
                  />
                  <DataField
                    label="Contact Lens History"
                    value={exam.contact_lens_history}
                  />
                </div>
                <div className="space-y-3">
                  <DataField
                    label="Systemic History"
                    value={exam.systemic_history}
                  />
                  <DataField
                    label="Family History"
                    value={exam.family_history}
                  />
                  <DataField label="Drug Allergies" value={exam.drug_allergy} />
                  <DataField
                    label="Current Medications"
                    value={exam.current_medications}
                  />
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Visual Acuity Section */}
          <CollapsibleSection title="Visual Acuity">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <ODOSHeader />
                <tbody>
                  <ComparisonRow
                    label="Unaided (Distance)"
                    od={exam.va_right_unaided}
                    os={exam.va_left_unaided}
                  />
                  <ComparisonRow
                    label="Aided (Distance)"
                    od={exam.va_right_aided}
                    os={exam.va_left_aided}
                  />
                  <ComparisonRow
                    label="Pinhole"
                    od={exam.va_right_pinhole}
                    os={exam.va_left_pinhole}
                  />
                  <ComparisonRow
                    label="Near Vision"
                    od={exam.va_right_near}
                    os={exam.va_left_near}
                  />
                  <ComparisonRow
                    label="Best Corrected (BCVA)"
                    od={exam.bcva_right}
                    os={exam.bcva_left}
                    highlight
                  />
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* Refraction Section - Combined Auto & Subjective */}
          <CollapsibleSection title="Refraction">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Auto-Refraction */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Auto-Refraction (Objective)
                </h4>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="py-2 px-2 text-left text-xs font-medium text-slate-500" />
                      <th className="py-2 px-2 text-center text-xs font-semibold text-blue-600">
                        OD
                      </th>
                      <th className="py-2 px-2 text-center text-xs font-semibold text-emerald-600">
                        OS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">Sphere</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.ar_right_sphere ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.ar_left_sphere ?? '—'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">Cylinder</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.ar_right_cylinder ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.ar_left_cylinder ?? '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-600">Axis</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.ar_right_axis ? `${exam.ar_right_axis}°` : '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.ar_left_axis ? `${exam.ar_left_axis}°` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cycloplegic Refraction */}
              {(exam.cyclo_agent ||
                exam.cyclo_right_sphere != null ||
                exam.cyclo_left_sphere != null) && (
                <div className="lg:col-span-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Cycloplegic Refraction (Wet Refraction)
                  </h4>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    {exam.cyclo_agent && (
                      <span className="text-slate-600">
                        Agent:{' '}
                        <strong className="font-mono">
                          {exam.cyclo_agent}
                        </strong>
                      </span>
                    )}
                    {exam.cyclo_instillation_time && (
                      <span className="text-slate-600">
                        Instilled at:{' '}
                        <strong className="font-mono">
                          {exam.cyclo_instillation_time}
                        </strong>
                      </span>
                    )}
                  </div>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="py-2 px-2 text-left text-xs font-medium text-slate-500" />
                        <th className="py-2 px-2 text-center text-xs font-semibold text-blue-600">
                          OD
                        </th>
                        <th className="py-2 px-2 text-center text-xs font-semibold text-emerald-600">
                          OS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-2 text-slate-600">Sphere</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.cyclo_right_sphere ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.cyclo_left_sphere ?? '—'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-2 text-slate-600">Cylinder</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.cyclo_right_cylinder ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.cyclo_left_cylinder ?? '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-slate-600">Axis</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.cyclo_right_axis
                            ? `${exam.cyclo_right_axis}°`
                            : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.cyclo_left_axis
                            ? `${exam.cyclo_left_axis}°`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Subjective Refraction */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Glasses className="h-4 w-4" />
                  Subjective Refraction (Final Rx)
                </h4>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="py-2 px-2 text-left text-xs font-medium text-slate-500" />
                      <th className="py-2 px-2 text-center text-xs font-semibold text-blue-600">
                        OD
                      </th>
                      <th className="py-2 px-2 text-center text-xs font-semibold text-emerald-600">
                        OS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">Sphere</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">
                        {exam.rx_right_sphere ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">
                        {exam.rx_left_sphere ?? '—'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">Cylinder</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">
                        {exam.rx_right_cylinder ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">
                        {exam.rx_left_cylinder ?? '—'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">Axis</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">
                        {exam.rx_right_axis ? `${exam.rx_right_axis}°` : '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold">
                        {exam.rx_left_axis ? `${exam.rx_left_axis}°` : '—'}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2 text-slate-600">Add</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.rx_right_add ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.rx_left_add ?? '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2 text-slate-600">Prism</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.rx_right_prism ?? '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {exam.rx_left_prism ?? '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PD Values */}
            <div className="mt-4 flex items-center justify-center gap-6 py-2 bg-slate-50 rounded text-sm">
              <span className="text-slate-600">
                PD:{' '}
                <strong className="font-mono">{exam.rx_pd ?? '—'} mm</strong>
              </span>
              {(exam.rx_pd_right || exam.rx_pd_left) && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">
                    PD (Mono) — OD:{' '}
                    <strong className="font-mono">
                      {exam.rx_pd_right ?? '—'}
                    </strong>{' '}
                    / OS:{' '}
                    <strong className="font-mono">
                      {exam.rx_pd_left ?? '—'}
                    </strong>{' '}
                    mm
                  </span>
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* IOP & Tonometry */}
          <CollapsibleSection title="Intraocular Pressure (IOP)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <MetricCard
                label="IOP — OD"
                value={exam.iop_right}
                unit=" mmHg"
              />
              <MetricCard label="IOP — OS" value={exam.iop_left} unit=" mmHg" />
              {(exam.cct_right || exam.cct_left) && (
                <>
                  <MetricCard
                    label="CCT — OD"
                    value={exam.cct_right}
                    unit=" μm"
                    sublabel="Pachymetry"
                  />
                  <MetricCard
                    label="CCT — OS"
                    value={exam.cct_left}
                    unit=" μm"
                    sublabel="Pachymetry"
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 rounded p-2">
              {exam.iop_method && (
                <span>
                  Method: <strong>{exam.iop_method}</strong>
                </span>
              )}
              {exam.iop_time && (
                <span>
                  Time: <strong>{exam.iop_time}</strong>
                </span>
              )}
            </div>
          </CollapsibleSection>

          {/* Pupil & Motility */}
          {hasPupilMotility && (
            <CollapsibleSection title="Pupil & Ocular Motility">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pupil Assessment */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Pupil Assessment
                  </h4>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="py-2 px-2 text-left text-xs font-medium text-slate-500" />
                        <th className="py-2 px-2 text-center text-xs font-semibold text-blue-600">
                          OD
                        </th>
                        <th className="py-2 px-2 text-center text-xs font-semibold text-emerald-600">
                          OS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-2 text-slate-600">Size</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.pupil_right_size
                            ? `${exam.pupil_right_size} mm`
                            : '—'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {exam.pupil_left_size
                            ? `${exam.pupil_left_size} mm`
                            : '—'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-slate-600">Reaction</td>
                        <td className="py-2 px-2 text-center">
                          {exam.pupil_right_reaction ?? '—'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {exam.pupil_left_reaction ?? '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Motility */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Ocular Motility
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Cover Test</span>
                      <span className="text-slate-900">
                        {exam.cover_test ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Motility</span>
                      <span className="text-slate-900">
                        {exam.ocular_motility ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Convergence</span>
                      <span className="text-slate-900">
                        {exam.convergence ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-600">NPC</span>
                      <span className="text-slate-900">{exam.npc ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Anterior Segment */}
          {hasAnteriorSegment && (
            <CollapsibleSection title="Anterior Segment (Slit Lamp Examination)">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <ODOSHeader />
                  <tbody>
                    <ComparisonRow
                      label="Lids"
                      od={exam.anterior_right_lids}
                      os={exam.anterior_left_lids}
                    />
                    <ComparisonRow
                      label="Lacrimal"
                      od={exam.anterior_right_lacrimal}
                      os={exam.anterior_left_lacrimal}
                    />
                    <ComparisonRow
                      label="Conjunctiva"
                      od={exam.anterior_right_conjunctiva}
                      os={exam.anterior_left_conjunctiva}
                    />
                    <ComparisonRow
                      label="Sclera"
                      od={exam.anterior_right_sclera}
                      os={exam.anterior_left_sclera}
                    />
                    <ComparisonRow
                      label="Cornea"
                      od={exam.anterior_right_cornea}
                      os={exam.anterior_left_cornea}
                    />
                    <ComparisonRow
                      label="Anterior Chamber"
                      od={
                        exam.anterior_right_ac
                          ? `${exam.anterior_right_ac}${exam.anterior_right_ac_depth ? ` (${exam.anterior_right_ac_depth})` : ''}`
                          : null
                      }
                      os={
                        exam.anterior_left_ac
                          ? `${exam.anterior_left_ac}${exam.anterior_left_ac_depth ? ` (${exam.anterior_left_ac_depth})` : ''}`
                          : null
                      }
                    />
                    <ComparisonRow
                      label="Iris"
                      od={exam.anterior_right_iris}
                      os={exam.anterior_left_iris}
                    />
                    <ComparisonRow
                      label="Pupil"
                      od={exam.anterior_right_pupil}
                      os={exam.anterior_left_pupil}
                    />
                    <ComparisonRow
                      label="Lens"
                      od={
                        exam.anterior_right_lens
                          ? `${exam.anterior_right_lens}${exam.anterior_right_lens_status ? ` (${exam.anterior_right_lens_status})` : ''}`
                          : null
                      }
                      os={
                        exam.anterior_left_lens
                          ? `${exam.anterior_left_lens}${exam.anterior_left_lens_status ? ` (${exam.anterior_left_lens_status})` : ''}`
                          : null
                      }
                    />
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Gonioscopy */}
          {hasGonioscopy && (
            <CollapsibleSection title="Gonioscopy" defaultOpen={false}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <ODOSHeader />
                  <tbody>
                    <ComparisonRow
                      label="Findings"
                      od={exam.gonioscopy_right}
                      os={exam.gonioscopy_left}
                    />
                    <ComparisonRow
                      label="Angle Status"
                      od={exam.angle_right}
                      os={exam.angle_left}
                    />
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Posterior Segment */}
          {hasPosteriorSegment && (
            <CollapsibleSection title="Posterior Segment (Fundoscopy)">
              {/* Dilation Status */}
              {exam.dilation_performed !== undefined && (
                <div
                  className={`mb-4 px-3 py-2 rounded text-sm flex items-center gap-3 ${
                    exam.dilation_performed
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span
                    className={`font-semibold ${exam.dilation_performed ? 'text-green-800' : 'text-slate-700'}`}
                  >
                    {exam.dilation_performed
                      ? '● Dilated Examination'
                      : '○ Undilated Examination'}
                  </span>
                  {exam.dilation_agent && (
                    <span className="text-slate-600">
                      Agent: <strong>{exam.dilation_agent}</strong>
                    </span>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <ODOSHeader />
                  <tbody>
                    <ComparisonRow
                      label="Media"
                      od={exam.posterior_right_media}
                      os={exam.posterior_left_media}
                    />
                    <ComparisonRow
                      label="Optic Disc"
                      od={
                        exam.posterior_right_disc
                          ? `${exam.posterior_right_disc}${exam.posterior_right_disc_color ? ` (${exam.posterior_right_disc_color})` : ''}`
                          : null
                      }
                      os={
                        exam.posterior_left_disc
                          ? `${exam.posterior_left_disc}${exam.posterior_left_disc_color ? ` (${exam.posterior_left_disc_color})` : ''}`
                          : null
                      }
                    />
                    <ComparisonRow
                      label="C/D Ratio"
                      od={exam.posterior_right_cdr}
                      os={exam.posterior_left_cdr}
                      highlight
                    />
                    <ComparisonRow
                      label="Neuroretinal Rim"
                      od={exam.posterior_right_rim}
                      os={exam.posterior_left_rim}
                    />
                    <ComparisonRow
                      label="Macula"
                      od={
                        exam.posterior_right_macula
                          ? `${exam.posterior_right_macula}${exam.posterior_right_foveal_reflex ? ` (FR: ${exam.posterior_right_foveal_reflex})` : ''}`
                          : null
                      }
                      os={
                        exam.posterior_left_macula
                          ? `${exam.posterior_left_macula}${exam.posterior_left_foveal_reflex ? ` (FR: ${exam.posterior_left_foveal_reflex})` : ''}`
                          : null
                      }
                    />
                    <ComparisonRow
                      label="Vessels"
                      od={
                        exam.posterior_right_vessels
                          ? `${exam.posterior_right_vessels}${exam.posterior_right_av_ratio ? ` (A/V: ${exam.posterior_right_av_ratio})` : ''}`
                          : null
                      }
                      os={
                        exam.posterior_left_vessels
                          ? `${exam.posterior_left_vessels}${exam.posterior_left_av_ratio ? ` (A/V: ${exam.posterior_left_av_ratio})` : ''}`
                          : null
                      }
                    />
                    <ComparisonRow
                      label="Periphery"
                      od={exam.posterior_right_periphery}
                      os={exam.posterior_left_periphery}
                    />
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Additional Tests */}
          {hasAdditionalTests && (
            <CollapsibleSection title="Supplementary Tests" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exam.color_vision && (
                  <div className="p-3 bg-slate-50 rounded">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Color Vision
                    </div>
                    <div className="text-sm text-slate-900">
                      {exam.color_vision}
                    </div>
                    {exam.color_vision_method && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Method: {exam.color_vision_method}
                      </div>
                    )}
                  </div>
                )}
                {exam.contrast_sensitivity && (
                  <div className="p-3 bg-slate-50 rounded">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Contrast Sensitivity
                    </div>
                    <div className="text-sm text-slate-900">
                      {exam.contrast_sensitivity}
                    </div>
                  </div>
                )}
                {exam.amsler_grid && (
                  <div className="p-3 bg-slate-50 rounded">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Amsler Grid
                    </div>
                    <div className="text-sm text-slate-900">
                      {exam.amsler_grid}
                    </div>
                  </div>
                )}
                {(exam.schirmer_test_right || exam.schirmer_test_left) && (
                  <div className="p-3 bg-slate-50 rounded">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Schirmer Test
                    </div>
                    <div className="text-sm text-slate-900 flex gap-4">
                      <span>
                        OD:{' '}
                        <strong className="font-mono">
                          {exam.schirmer_test_right ?? '—'} mm
                        </strong>
                      </span>
                      <span>
                        OS:{' '}
                        <strong className="font-mono">
                          {exam.schirmer_test_left ?? '—'} mm
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
                {exam.visual_field_notes && (
                  <div className="p-3 bg-slate-50 rounded col-span-full">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Visual Field Notes
                    </div>
                    <div className="text-sm text-slate-900 whitespace-pre-wrap">
                      {exam.visual_field_notes}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Diagnosis & Assessment */}
          <CollapsibleSection
            title="Diagnosis & Assessment"
            badge={
              exam.icd_codes?.length
                ? `${exam.icd_codes.length} ICD`
                : undefined
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NotesDisplay
                  label="Provisional Diagnosis"
                  content={exam.provisional_diagnosis}
                />
                <NotesDisplay
                  label="Final Diagnosis"
                  content={exam.final_diagnosis}
                />
              </div>

              {exam.icd_codes && exam.icd_codes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-slate-500 uppercase mr-2">
                    ICD Codes:
                  </span>
                  {exam.icd_codes.map((code, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Treatment Plan */}
          <CollapsibleSection title="Management Plan">
            <div className="space-y-4">
              <NotesDisplay
                label="Treatment Plan"
                content={exam.treatment_plan}
              />

              {/* Treatment Modalities */}
              <div className="flex flex-wrap gap-2 pt-2">
                {exam.glasses_prescribed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-sm font-medium">
                    <Glasses className="h-4 w-4" />
                    Spectacles Prescribed
                  </span>
                )}
                {exam.contact_lens_prescribed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-sm font-medium">
                    <Target className="h-4 w-4" />
                    Contact Lens Prescribed
                  </span>
                )}
                {exam.medications_prescribed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-sm font-medium">
                    <Stethoscope className="h-4 w-4" />
                    Medications Prescribed
                  </span>
                )}
                {exam.surgery_recommended && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-800 border border-red-200 rounded text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Surgery Recommended
                    {exam.surgery_type && `: ${exam.surgery_type}`}
                  </span>
                )}
                {exam.referral_needed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Referral: {exam.referral_to || 'Specialist'}
                    {exam.referral_reason && ` — ${exam.referral_reason}`}
                  </span>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Follow-up */}
          {hasFollowUp && (
            <CollapsibleSection title="Follow-Up">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Interval
                  </div>
                  <div className="text-sm text-slate-900 font-medium">
                    {exam.follow_up_interval ?? '—'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Follow-up Date
                  </div>
                  <div className="text-sm text-slate-900 font-medium">
                    {exam.follow_up_date
                      ? formatDateShort(exam.follow_up_date)
                      : '—'}
                  </div>
                </div>
                {exam.follow_up_notes && (
                  <div className="p-3 bg-slate-50 rounded md:col-span-1">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                      Notes
                    </div>
                    <div className="text-sm text-slate-900">
                      {exam.follow_up_notes}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {allStoredExamFields.length > 0 && (
            <CollapsibleSection
              title="All Stored Exam Fields"
              defaultOpen={false}
              badge={String(allStoredExamFields.length)}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {allStoredExamFields.map((field) => (
                  <div
                    key={field.key}
                    className="border border-slate-200 bg-slate-50 rounded p-2.5"
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-600">
                      {field.label}
                    </p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap break-words mt-0.5">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Document Footer / Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 print:border-t-2 print:border-slate-400 print:mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Record Metadata
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500">Created</div>
                <div className="text-slate-700">
                  {formatDate(exam.created_at)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Last Modified</div>
                <div className="text-slate-700">
                  {formatDate(exam.updated_at)}
                </div>
              </div>
              {exam.finalized_at && (
                <div>
                  <div className="text-xs text-slate-500">Finalized</div>
                  <div className="text-slate-700">
                    {formatDate(exam.finalized_at)}
                  </div>
                </div>
              )}
              {exam.provider && (
                <div>
                  <div className="text-xs text-slate-500">Examiner</div>
                  <div className="text-slate-700">
                    {exam.provider.title && `${exam.provider.title} `}
                    {exam.provider.first_name} {exam.provider.last_name}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-400 font-mono">
                Exam ID: {exam.exam_id} | Encounter: {exam.encounter_id}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-6 py-3 bg-white flex justify-end gap-3 shrink-0 print:hidden rounded-b-xl">
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
