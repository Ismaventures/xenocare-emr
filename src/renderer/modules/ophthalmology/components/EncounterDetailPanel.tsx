/**
 * =============================================================================
 * Encounter Detail Panel — Right-panel exam detail with role-based fields
 * Inpatient-style clinical timeline layout with colour-coded dots,
 * vertical line, OD/OS comparison cards, and consultant-grade documentation
 * =============================================================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Eye,
  Edit3,
  Save,
  X,
  Circle,
  Clock,
  Calendar,
  User,
  CheckCircle,
  Activity,
  Lock,
  Copy,
  FileText,
  Glasses,
  Layers,
  Stethoscope,
  Send,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { useToast } from '../../../components/ui/Toast';
import type {
  EyeExamDTO,
  UpdateEyeExamDTO,
} from '../types/ophthalmology.types';
import {
  canEditSection,
  SYMPTOM_OPTIONS,
  DIAGNOSIS_OPTIONS,
  CORNEA_FINDINGS,
  CONJUNCTIVA_FINDINGS,
  LENS_FINDINGS,
  OPTIC_DISC_FINDINGS,
  MACULA_FINDINGS,
  FOLLOW_UP_INTERVALS,
} from '../constants/clinicalOptions';

// =============================================================================
// Sub-Components
// =============================================================================

/** Timeline card — inpatient-style clinical timeline entry */
function TimelineCard({
  title,
  icon,
  dotColor,
  ringColor,
  badgeColor,
  locked,
  lockLabel,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  dotColor: string;
  ringColor: string;
  badgeColor: string;
  locked?: boolean;
  lockLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="relative flex gap-4 items-start">
      {/* Coloured dot on timeline line */}
      <div
        className={`w-5 h-5 rounded-full border-2 border-white ring-4 z-10 shrink-0 mt-1 ${dotColor} ${ringColor}`}
      />
      {/* Content card */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="bg-white border rounded-xl shadow-sm transition-all">
          <div
            className="px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-100 cursor-pointer select-none"
            onClick={() => setIsOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
              }
            }}
            aria-expanded={isOpen}
          >
            <div className="min-w-0 inline-flex items-center gap-2">
              <span className="text-slate-400 shrink-0">
                {isOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
              <span
                className={`text-sm font-bold tracking-wide px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${badgeColor}`}
              >
                {icon && <span className="shrink-0 opacity-80">{icon}</span>}
                {title}
              </span>
            </div>
            {locked && (
              <span className="flex items-center gap-1 text-sm text-amber-700 font-semibold">
                <Lock size={12} />
                {lockLabel || 'Consultant only'}
              </span>
            )}
          </div>
          {isOpen && <div className="px-5 py-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function ODOSHeader() {
  return (
    <thead>
      <tr className="bg-slate-50">
        <th className="py-2 px-2.5 text-left text-sm font-semibold text-slate-500 uppercase tracking-wider w-[34%]">
          Parameter
        </th>
        <th className="py-2 px-2.5 text-center text-sm font-bold text-blue-700 uppercase tracking-wider border-l border-slate-200 bg-blue-50/50">
          <span className="inline-flex items-center justify-center gap-1">
            <Eye className="h-3 w-3" />
            OD · Right Eye
          </span>
        </th>
        <th className="py-2 px-2.5 text-center text-sm font-bold text-emerald-700 uppercase tracking-wider border-l border-slate-200 bg-emerald-50/50">
          <span className="inline-flex items-center justify-center gap-1">
            <Eye className="h-3 w-3" />
            OS · Left Eye
          </span>
        </th>
      </tr>
    </thead>
  );
}

function CompRow({
  label,
  od,
  os,
  unit = '',
  highlight = false,
  editing = false,
  onChangeOD,
  onChangeOS,
}: {
  label: string;
  od?: string | number | null;
  os?: string | number | null;
  unit?: string;
  highlight?: boolean;
  editing?: boolean;
  onChangeOD?: (val: string) => void;
  onChangeOS?: (val: string) => void;
}) {
  const fmt = (v: string | number | null | undefined) =>
    v === null || v === undefined || v === ''
      ? '—'
      : unit
        ? `${v}${unit}`
        : String(v);

  return (
    <tr
      className={`border-b border-slate-100 last:border-0 ${highlight ? 'bg-amber-50/50' : ''}`}
    >
      <td className="py-1.5 px-2.5 text-sm text-slate-600 font-medium">
        {label}
      </td>
      <td className="py-1.5 px-2.5 text-center border-l border-slate-100">
        {editing && onChangeOD ? (
          <input
            type="text"
            value={od ?? ''}
            onChange={(e) => onChangeOD(e.target.value)}
            className="w-full text-center text-sm border border-slate-200 rounded px-1.5 py-1 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
          />
        ) : (
          <span className="text-sm text-slate-900 font-mono">{fmt(od)}</span>
        )}
      </td>
      <td className="py-1.5 px-2.5 text-center border-l border-slate-100">
        {editing && onChangeOS ? (
          <input
            type="text"
            value={os ?? ''}
            onChange={(e) => onChangeOS(e.target.value)}
            className="w-full text-center text-sm border border-slate-200 rounded px-1.5 py-1 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
          />
        ) : (
          <span className="text-sm text-slate-900 font-mono">{fmt(os)}</span>
        )}
      </td>
    </tr>
  );
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string | number | boolean | null;
  className?: string;
}) {
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? '—');
  return (
    <div className={className}>
      <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">{display}</dd>
    </div>
  );
}

function EditableTextField({
  label,
  value,
  onChange,
  rows = 2,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 resize-none disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function EditableSelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20 disabled:bg-slate-50 disabled:text-slate-500"
      >
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NoteBlock({
  label,
  content,
}: {
  label: string;
  content?: string | null;
}) {
  if (!content) return null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
      <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = (() => {
    const s = (status || '').toLowerCase();
    if (s.includes('complete') || s.includes('done') || s.includes('final'))
      return 'Completed';
    if (
      s.includes('progress') ||
      s.includes('active') ||
      s.includes('pending') ||
      s.includes('sched')
    )
      return 'In Progress';
    return 'In Progress';
  })();

  const cfg: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    Pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: <Clock size={10} />,
    },
    'In Progress': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: <Activity size={10} />,
    },
    Completed: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: <CheckCircle size={10} />,
    },
  };
  const c = cfg[normalizedStatus] || cfg['In Progress'];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold ${c.bg} ${c.text}`}
    >
      {c.icon} {normalizedStatus}
    </span>
  );
}

interface ClinicalTimelineNote {
  id: string;
  note_text: string;
  created_at: string;
  staff?: {
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
  } | null;
}

function getClinicalAuthorLabel(role: string | null | undefined): string {
  const r = (role || '').toLowerCase();
  if (r.includes('nurse')) return 'Nurse';
  if (r.includes('ophthalmolog')) return 'Ophthalmologist';
  if (r.includes('optometrist') || r.includes('optometry'))
    return 'Optometrist';
  if (
    r.includes('doctor') ||
    r.includes('physician') ||
    r.includes('surgeon') ||
    r.includes('consultant') ||
    r.includes('specialist') ||
    r.includes('medical officer')
  )
    return 'Dr.';
  return '';
}

function formatClinicalNoteTime(value: string | null | undefined): string {
  if (!value) return 'Unknown time';
  try {
    const noteDate = new Date(value);
    return `${format(noteDate, 'dd MMM yyyy, h:mm a')} (${formatDistanceToNow(noteDate, { addSuffix: true })})`;
  } catch {
    return value;
  }
}

// =============================================================================
// Main Component
// =============================================================================

interface EncounterDetailPanelProps {
  exam: EyeExamDTO;
  userRole: string;
  onSave: (data: UpdateEyeExamDTO) => Promise<void>;
  onCopyFromPrevious?: (exam: EyeExamDTO) => Partial<EyeExamDTO> | undefined;
  previousExam?: EyeExamDTO;
  useInternalScroll?: boolean;
  clinicalTimelineNotes?: ClinicalTimelineNote[];
}

export default function EncounterDetailPanel({
  exam,
  userRole,
  onSave,
  onCopyFromPrevious,
  previousExam,
  useInternalScroll = true,
  clinicalTimelineNotes = [],
}: EncounterDetailPanelProps) {
  // Determine if this record is already entered (completed/finalized)
  const isRecordComplete = !!(
    exam.finalized_at ||
    exam.chief_complaint ||
    exam.provisional_diagnosis ||
    exam.final_diagnosis
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<EyeExamDTO>>({});
  const { showToast } = useToast();

  const isConsultant = ['doctor', 'medical_director', 'super_admin'].includes(
    userRole,
  );

  // Merge edit data with exam for display
  const current = useMemo(() => ({ ...exam, ...editData }), [exam, editData]);

  const updateField = useCallback((field: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleStartEdit = () => {
    setEditData({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!Object.keys(editData).length) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editData as UpdateEyeExamDTO);
      showToast({
        title: 'Saved',
        message: 'Examination record updated.',
        type: 'success',
      });
      setIsEditing(false);
      setEditData({});
    } catch (err) {
      showToast({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Save failed',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPrevious = () => {
    if (previousExam && onCopyFromPrevious) {
      const copied = onCopyFromPrevious(previousExam);
      if (copied) {
        setEditData((prev) => ({ ...prev, ...copied }));
        setIsEditing(true);
        showToast({
          title: 'Copied',
          message: 'Previous examination findings copied.',
          type: 'info',
        });
      }
    }
  };

  const canEdit = (section: string) => canEditSection(section, userRole);
  const sectionLocked = (section: string) => !canEditSection(section, userRole);

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'dd MMM yyyy, HH:mm');
    } catch {
      return d;
    }
  };

  const patientName = exam.patient
    ? `${exam.patient.first_name} ${exam.patient.surname}`
    : 'Patient';

  // Derive visit metadata for the header
  const providerName = exam.provider
    ? `${exam.provider.title ? `${exam.provider.title} ` : ''}${exam.provider.first_name} ${exam.provider.last_name}`
    : null;
  const rxCount = exam.prescriptions?.length || 0;
  const procCount = exam.procedures?.length || 0;

  return (
    <div
      className={`flex flex-col bg-white ${useInternalScroll ? 'h-full' : ''}`}
    >
      {/* Header Bar — rich visit info (moved from timeline sidebar) */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
        {/* Row 1: Visit label + encounter + actions */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-3">
            <StatusBadge status={exam.status} />
            {exam.encounter?.encounter_number && (
              <span className="text-sm font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {exam.encounter.encounter_number}
              </span>
            )}
            {rxCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium bg-purple-50 text-purple-700">
                Rx: {rxCount}
              </span>
            )}
            {procCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium bg-orange-50 text-orange-700">
                Proc: {procCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {previousExam && !isEditing && (
              <button
                onClick={handleCopyPrevious}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                title="Copy findings from previous visit"
              >
                <Copy size={10} />
                Copy Previous
              </button>
            )}
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X size={12} className="mr-1" /> Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save size={12} className="mr-1" />{' '}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : isRecordComplete ? (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Eye size={12} className="mr-1" /> View
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleStartEdit}>
                <Edit3 size={12} className="mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Date/time + provider (Entered by) */}
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-slate-400" />
            <span className="font-medium">{formatDate(exam.created_at)}</span>
          </span>
          {providerName && (
            <span className="flex items-center gap-1">
              <User size={12} className="text-teal-500" />
              <span className="text-slate-500">Entered by:</span>
              <span className="font-bold text-slate-800">{providerName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Clinical Timeline */}
      <div
        className={
          useInternalScroll
            ? 'flex-1 overflow-y-auto px-4 pt-6 pb-4 scroll-pt-28'
            : 'px-4 pt-6 pb-4'
        }
      >
        <div className="relative space-y-5">
          {/* Vertical timeline line — centred on dots */}
          <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-slate-200 z-0" />

          {/* ===== Clinical Timeline Notes ===== */}
          <TimelineCard
            title="Clinical Timeline Notes"
            icon={<Clock size={12} />}
            dotColor="bg-cyan-500"
            ringColor="ring-cyan-100"
            badgeColor="bg-cyan-100 text-cyan-700"
            defaultOpen
          >
            {clinicalTimelineNotes.length > 0 ? (
              <div className="space-y-2.5">
                {clinicalTimelineNotes.map((note) => {
                  const firstName = note.staff?.first_name?.trim() || '';
                  const lastName = note.staff?.last_name?.trim() || '';
                  const fullName =
                    [firstName, lastName].filter(Boolean).join(' ').trim() ||
                    'Unknown user';
                  const roleLabel = getClinicalAuthorLabel(note.staff?.role);
                  return (
                    <div
                      key={note.id}
                      className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-800">
                          <User size={12} className="text-cyan-500" />
                          {roleLabel ? `${roleLabel} ${fullName}` : fullName}
                        </span>
                        <span className="text-xs font-medium text-cyan-600">
                          {formatClinicalNoteTime(note.created_at)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-cyan-900">
                        {note.note_text}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-cyan-200 bg-cyan-50/40 px-3 py-3 text-sm text-cyan-700">
                No clinical timeline notes yet. New addendum notes will appear
                here automatically.
              </div>
            )}
          </TimelineCard>

          {/* ===== Consultation Notes ===== */}
          <TimelineCard
            title="Consultation Notes"
            icon={<FileText size={12} />}
            dotColor="bg-blue-500"
            ringColor="ring-blue-100"
            badgeColor="bg-blue-100 text-blue-700"
            locked={sectionLocked('chief_complaint')}
          >
            <div className="space-y-3">
              {isEditing && canEdit('chief_complaint') ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <EditableTextField
                      label="Chief Complaint"
                      value={current.chief_complaint || ''}
                      onChange={(v) => updateField('chief_complaint', v)}
                      rows={1}
                    />
                  </div>
                  <EditableSelectField
                    label="👁 Eye Involved"
                    value={(current.affected_eye as string) || ''}
                    onChange={(v) => updateField('affected_eye', v)}
                    options={[
                      { value: 'Right', label: 'Right Eye (OD)' },
                      { value: 'Left', label: 'Left Eye (OS)' },
                      { value: 'Both', label: 'Both Eyes (OU)' },
                    ]}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Field
                    label="Chief Complaint"
                    value={current.chief_complaint}
                    className="col-span-2"
                  />
                  <Field
                    label="Eye Involved"
                    value={
                      current.affected_eye === 'Right'
                        ? 'Right Eye (OD)'
                        : current.affected_eye === 'Left'
                          ? 'Left Eye (OS)'
                          : current.affected_eye === 'Both'
                            ? 'Both Eyes (OU)'
                            : current.affected_eye || undefined
                    }
                  />
                </div>
              )}

              {isEditing && canEdit('chief_complaint') ? (
                <div className="grid grid-cols-2 gap-3">
                  <EditableTextField
                    label="Ocular History"
                    value={current.ocular_history || ''}
                    onChange={(v) => updateField('ocular_history', v)}
                  />
                  <EditableTextField
                    label="Systemic History"
                    value={current.systemic_history || ''}
                    onChange={(v) => updateField('systemic_history', v)}
                  />
                  <EditableTextField
                    label="Family History"
                    value={current.family_history || ''}
                    onChange={(v) => updateField('family_history', v)}
                  />
                  <EditableTextField
                    label="Drug Allergy"
                    value={current.drug_allergy || ''}
                    onChange={(v) => updateField('drug_allergy', v)}
                  />
                  <EditableTextField
                    label="Current Medications"
                    value={current.current_medications || ''}
                    onChange={(v) => updateField('current_medications', v)}
                  />
                  <EditableTextField
                    label="Glasses History"
                    value={current.glasses_history || ''}
                    onChange={(v) => updateField('glasses_history', v)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <NoteBlock
                    label="Ocular History"
                    content={current.ocular_history}
                  />
                  <NoteBlock
                    label="Systemic History"
                    content={current.systemic_history}
                  />
                  <NoteBlock
                    label="Family History"
                    content={current.family_history}
                  />
                  <NoteBlock
                    label="Drug Allergy"
                    content={current.drug_allergy}
                  />
                  <NoteBlock
                    label="Current Medications"
                    content={current.current_medications}
                  />
                  <NoteBlock
                    label="Glasses History"
                    content={current.glasses_history}
                  />
                </div>
              )}
            </div>
          </TimelineCard>

          {/* ===== Visual Acuity ===== */}
          <TimelineCard
            title="Visual Acuity"
            icon={<Eye size={12} />}
            dotColor="bg-teal-500"
            ringColor="ring-teal-100"
            badgeColor="bg-teal-100 text-teal-700"
            locked={sectionLocked('visual_acuity')}
          >
            <table className="w-full border border-slate-200 rounded-md overflow-hidden">
              <ODOSHeader />
              <tbody>
                <CompRow
                  label="Unaided"
                  od={current.va_right_unaided}
                  os={current.va_left_unaided}
                  editing={isEditing && canEdit('visual_acuity')}
                  onChangeOD={(v) => updateField('va_right_unaided', v)}
                  onChangeOS={(v) => updateField('va_left_unaided', v)}
                />
                <CompRow
                  label="Best Corrected"
                  od={current.va_right_aided}
                  os={current.va_left_aided}
                  editing={isEditing && canEdit('visual_acuity')}
                  highlight
                  onChangeOD={(v) => updateField('va_right_aided', v)}
                  onChangeOS={(v) => updateField('va_left_aided', v)}
                />
                <CompRow
                  label="Pinhole"
                  od={current.va_right_pinhole}
                  os={current.va_left_pinhole}
                  editing={isEditing && canEdit('visual_acuity')}
                  onChangeOD={(v) => updateField('va_right_pinhole', v)}
                  onChangeOS={(v) => updateField('va_left_pinhole', v)}
                />
                <CompRow
                  label="Near"
                  od={current.va_right_near}
                  os={current.va_left_near}
                  editing={isEditing && canEdit('visual_acuity')}
                  onChangeOD={(v) => updateField('va_right_near', v)}
                  onChangeOS={(v) => updateField('va_left_near', v)}
                />
              </tbody>
            </table>
          </TimelineCard>

          {/* ===== IOP ===== */}
          <TimelineCard
            title="Intraocular Pressure (IOP)"
            icon={<Activity size={12} />}
            dotColor="bg-red-500"
            ringColor="ring-red-100"
            badgeColor="bg-red-100 text-red-700"
            locked={sectionLocked('iop')}
          >
            <table className="w-full border border-slate-200 rounded-md overflow-hidden">
              <ODOSHeader />
              <tbody>
                <CompRow
                  label="IOP (mmHg)"
                  od={current.iop_right}
                  os={current.iop_left}
                  highlight
                  editing={isEditing && canEdit('iop')}
                  onChangeOD={(v) =>
                    updateField('iop_right', v ? Number(v) : null)
                  }
                  onChangeOS={(v) =>
                    updateField('iop_left', v ? Number(v) : null)
                  }
                />
                <CompRow
                  label="CCT (μm)"
                  od={current.cct_right}
                  os={current.cct_left}
                  editing={isEditing && canEdit('iop')}
                  onChangeOD={(v) =>
                    updateField('cct_right', v ? Number(v) : null)
                  }
                  onChangeOS={(v) =>
                    updateField('cct_left', v ? Number(v) : null)
                  }
                />
              </tbody>
            </table>
            {isEditing && canEdit('iop') ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Method
                  </label>
                  <select
                    value={current.iop_method || ''}
                    onChange={(e) => updateField('iop_method', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                  >
                    <option value="">— Select —</option>
                    <option value="GAT">GAT (Goldmann)</option>
                    <option value="NCT">NCT (Air Puff)</option>
                    <option value="Tonopen">Tonopen</option>
                    <option value="Perkins">Perkins</option>
                    <option value="iCare">iCare</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={current.iop_time || ''}
                    onChange={(e) => updateField('iop_time', e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    Classification
                  </label>
                  <select
                    value={current.iop_classification || ''}
                    onChange={(e) =>
                      updateField('iop_classification', e.target.value)
                    }
                    className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                  >
                    <option value="">— Select —</option>
                    <option value="Normal">Normal (10–21 mmHg)</option>
                    <option value="High">High (&gt;21 mmHg)</option>
                    <option value="Low">Low (&lt;10 mmHg)</option>
                    <option value="Borderline">Borderline</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Field label="Method" value={current.iop_method} />
                <Field label="Time" value={current.iop_time} />
                <Field
                  label="Classification"
                  value={current.iop_classification}
                />
              </div>
            )}
          </TimelineCard>

          {/* ===== Refraction ===== */}
          <TimelineCard
            title="Refraction"
            icon={<Glasses size={12} />}
            dotColor="bg-violet-500"
            ringColor="ring-violet-100"
            badgeColor="bg-violet-100 text-violet-700"
            locked={sectionLocked('refraction')}
            lockLabel={
              sectionLocked('refraction') ? 'Consultant only' : undefined
            }
          >
            {/* Auto-Refraction */}
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Glasses size={11} className="opacity-60" />
                Auto-Refraction (AR)
              </div>
              <table className="w-full border border-slate-200 rounded-md overflow-hidden">
                <ODOSHeader />
                <tbody>
                  <CompRow
                    label="Sphere"
                    od={current.ar_right_sphere}
                    os={current.ar_left_sphere}
                    unit="D"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('ar_right_sphere', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('ar_left_sphere', v ? Number(v) : null)
                    }
                  />
                  <CompRow
                    label="Cylinder"
                    od={current.ar_right_cylinder}
                    os={current.ar_left_cylinder}
                    unit="D"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('ar_right_cylinder', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('ar_left_cylinder', v ? Number(v) : null)
                    }
                  />
                  <CompRow
                    label="Axis"
                    od={current.ar_right_axis}
                    os={current.ar_left_axis}
                    unit="°"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('ar_right_axis', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('ar_left_axis', v ? Number(v) : null)
                    }
                  />
                </tbody>
              </table>
            </div>

            {/* Subjective Refraction */}
            <div>
              <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Glasses size={11} className="opacity-60" />
                Subjective Refraction (℞)
              </div>
              <table className="w-full border border-slate-200 rounded-md overflow-hidden">
                <ODOSHeader />
                <tbody>
                  <CompRow
                    label="Sphere"
                    od={current.rx_right_sphere}
                    os={current.rx_left_sphere}
                    unit="D"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('rx_right_sphere', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('rx_left_sphere', v ? Number(v) : null)
                    }
                  />
                  <CompRow
                    label="Cylinder"
                    od={current.rx_right_cylinder}
                    os={current.rx_left_cylinder}
                    unit="D"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('rx_right_cylinder', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('rx_left_cylinder', v ? Number(v) : null)
                    }
                  />
                  <CompRow
                    label="Axis"
                    od={current.rx_right_axis}
                    os={current.rx_left_axis}
                    unit="°"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('rx_right_axis', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('rx_left_axis', v ? Number(v) : null)
                    }
                  />
                  <CompRow
                    label="Add"
                    od={current.rx_right_add}
                    os={current.rx_left_add}
                    unit="D"
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) =>
                      updateField('rx_right_add', v ? Number(v) : null)
                    }
                    onChangeOS={(v) =>
                      updateField('rx_left_add', v ? Number(v) : null)
                    }
                  />
                  <CompRow
                    label="BCVA"
                    od={current.bcva_right}
                    os={current.bcva_left}
                    highlight
                    editing={isEditing && canEdit('refraction')}
                    onChangeOD={(v) => updateField('bcva_right', v)}
                    onChangeOS={(v) => updateField('bcva_left', v)}
                  />
                </tbody>
              </table>
            </div>
          </TimelineCard>

          {/* ===== Anterior Segment ===== */}
          <TimelineCard
            title="Anterior Segment — Slit Lamp"
            icon={<Layers size={12} />}
            dotColor="bg-orange-500"
            ringColor="ring-orange-100"
            badgeColor="bg-orange-100 text-orange-700"
            locked={sectionLocked('anterior_segment')}
          >
            <table className="w-full border border-slate-200 rounded-md overflow-hidden">
              <ODOSHeader />
              <tbody>
                <CompRow
                  label="Lids"
                  od={current.anterior_right_lids}
                  os={current.anterior_left_lids}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) => updateField('anterior_right_lids', v)}
                  onChangeOS={(v) => updateField('anterior_left_lids', v)}
                />
                <CompRow
                  label="Conjunctiva"
                  od={current.anterior_right_conjunctiva}
                  os={current.anterior_left_conjunctiva}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) =>
                    updateField('anterior_right_conjunctiva', v)
                  }
                  onChangeOS={(v) =>
                    updateField('anterior_left_conjunctiva', v)
                  }
                />
                <CompRow
                  label="Cornea"
                  od={current.anterior_right_cornea}
                  os={current.anterior_left_cornea}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) => updateField('anterior_right_cornea', v)}
                  onChangeOS={(v) => updateField('anterior_left_cornea', v)}
                />
                <CompRow
                  label="A/C"
                  od={current.anterior_right_ac}
                  os={current.anterior_left_ac}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) => updateField('anterior_right_ac', v)}
                  onChangeOS={(v) => updateField('anterior_left_ac', v)}
                />
                <CompRow
                  label="Iris"
                  od={current.anterior_right_iris}
                  os={current.anterior_left_iris}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) => updateField('anterior_right_iris', v)}
                  onChangeOS={(v) => updateField('anterior_left_iris', v)}
                />
                <CompRow
                  label="Pupil"
                  od={current.anterior_right_pupil}
                  os={current.anterior_left_pupil}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) => updateField('anterior_right_pupil', v)}
                  onChangeOS={(v) => updateField('anterior_left_pupil', v)}
                />
                <CompRow
                  label="Lens"
                  od={current.anterior_right_lens}
                  os={current.anterior_left_lens}
                  highlight
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) => updateField('anterior_right_lens', v)}
                  onChangeOS={(v) => updateField('anterior_left_lens', v)}
                />
                <CompRow
                  label="Lens Status"
                  od={current.anterior_right_lens_status}
                  os={current.anterior_left_lens_status}
                  editing={isEditing && canEdit('anterior_segment')}
                  onChangeOD={(v) =>
                    updateField('anterior_right_lens_status', v)
                  }
                  onChangeOS={(v) =>
                    updateField('anterior_left_lens_status', v)
                  }
                />
              </tbody>
            </table>
          </TimelineCard>

          {/* ===== Posterior Segment ===== */}
          <TimelineCard
            title="Posterior Segment — Fundoscopy"
            icon={<Eye size={12} />}
            dotColor="bg-emerald-500"
            ringColor="ring-emerald-100"
            badgeColor="bg-emerald-100 text-emerald-700"
            locked={sectionLocked('posterior_segment')}
          >
            <table className="w-full border border-slate-200 rounded-md overflow-hidden">
              <ODOSHeader />
              <tbody>
                <CompRow
                  label="Media"
                  od={current.posterior_right_media}
                  os={current.posterior_left_media}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) => updateField('posterior_right_media', v)}
                  onChangeOS={(v) => updateField('posterior_left_media', v)}
                />
                <CompRow
                  label="Disc"
                  od={current.posterior_right_disc}
                  os={current.posterior_left_disc}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) => updateField('posterior_right_disc', v)}
                  onChangeOS={(v) => updateField('posterior_left_disc', v)}
                />
                <CompRow
                  label="C:D Ratio"
                  od={current.posterior_right_cdr}
                  os={current.posterior_left_cdr}
                  highlight
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) =>
                    updateField('posterior_right_cdr', v ? Number(v) : null)
                  }
                  onChangeOS={(v) =>
                    updateField('posterior_left_cdr', v ? Number(v) : null)
                  }
                />
                <CompRow
                  label="Macula"
                  od={current.posterior_right_macula}
                  os={current.posterior_left_macula}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) => updateField('posterior_right_macula', v)}
                  onChangeOS={(v) => updateField('posterior_left_macula', v)}
                />
                <CompRow
                  label="Foveal Reflex"
                  od={current.posterior_right_foveal_reflex}
                  os={current.posterior_left_foveal_reflex}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) =>
                    updateField('posterior_right_foveal_reflex', v)
                  }
                  onChangeOS={(v) =>
                    updateField('posterior_left_foveal_reflex', v)
                  }
                />
                <CompRow
                  label="Vessels"
                  od={current.posterior_right_vessels}
                  os={current.posterior_left_vessels}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) => updateField('posterior_right_vessels', v)}
                  onChangeOS={(v) => updateField('posterior_left_vessels', v)}
                />
                <CompRow
                  label="A/V Ratio"
                  od={current.posterior_right_av_ratio}
                  os={current.posterior_left_av_ratio}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) => updateField('posterior_right_av_ratio', v)}
                  onChangeOS={(v) => updateField('posterior_left_av_ratio', v)}
                />
                <CompRow
                  label="Periphery"
                  od={current.posterior_right_periphery}
                  os={current.posterior_left_periphery}
                  editing={isEditing && canEdit('posterior_segment')}
                  onChangeOD={(v) =>
                    updateField('posterior_right_periphery', v)
                  }
                  onChangeOS={(v) => updateField('posterior_left_periphery', v)}
                />
              </tbody>
            </table>
          </TimelineCard>

          {/* ===== Diagnosis & Plan ===== */}
          <TimelineCard
            title="Diagnosis & Treatment Plan"
            icon={<Stethoscope size={12} />}
            dotColor="bg-rose-500"
            ringColor="ring-rose-100"
            badgeColor="bg-rose-100 text-rose-700"
            locked={sectionLocked('diagnosis')}
          >
            <div className="space-y-3">
              {isEditing && canEdit('diagnosis') ? (
                <>
                  <EditableTextField
                    label="Provisional Diagnosis"
                    value={current.provisional_diagnosis || ''}
                    onChange={(v) => updateField('provisional_diagnosis', v)}
                    rows={2}
                  />
                  <EditableTextField
                    label="Final Diagnosis"
                    value={current.final_diagnosis || ''}
                    onChange={(v) => updateField('final_diagnosis', v)}
                    rows={2}
                  />
                  <EditableTextField
                    label="Treatment Plan"
                    value={current.treatment_plan || ''}
                    onChange={(v) => updateField('treatment_plan', v)}
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <EditableSelectField
                      label="Glasses Prescribed"
                      value={current.glasses_prescribed ? 'yes' : 'no'}
                      onChange={(v) =>
                        updateField('glasses_prescribed', v === 'yes')
                      }
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                    />
                    <EditableSelectField
                      label="Surgery Recommended"
                      value={current.surgery_recommended ? 'yes' : 'no'}
                      onChange={(v) =>
                        updateField('surgery_recommended', v === 'yes')
                      }
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                    />
                  </div>
                  {current.surgery_recommended && (
                    <EditableTextField
                      label="Surgery Type"
                      value={current.surgery_type || ''}
                      onChange={(v) => updateField('surgery_type', v)}
                      rows={1}
                    />
                  )}
                </>
              ) : (
                <>
                  <NoteBlock
                    label="Provisional Diagnosis"
                    content={current.provisional_diagnosis}
                  />
                  <NoteBlock
                    label="Final Diagnosis"
                    content={current.final_diagnosis}
                  />
                  <NoteBlock
                    label="Treatment Plan"
                    content={current.treatment_plan}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Field
                      label="Glasses Prescribed"
                      value={current.glasses_prescribed}
                    />
                    <Field
                      label="Surgery Recommended"
                      value={current.surgery_recommended}
                    />
                    {current.surgery_recommended && (
                      <Field
                        label="Surgery Type"
                        value={current.surgery_type}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </TimelineCard>

          {/* ===== Follow-Up ===== */}
          <TimelineCard
            title="Follow-Up"
            icon={<Calendar size={12} />}
            dotColor="bg-indigo-500"
            ringColor="ring-indigo-100"
            badgeColor="bg-indigo-100 text-indigo-700"
            locked={sectionLocked('treatment_plan')}
          >
            {isEditing && canEdit('treatment_plan') ? (
              <div className="grid grid-cols-2 gap-3">
                <EditableSelectField
                  label="Follow-Up Interval"
                  value={current.follow_up_interval || ''}
                  onChange={(v) => updateField('follow_up_interval', v)}
                  options={FOLLOW_UP_INTERVALS}
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">
                    📅 Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={current.follow_up_date || ''}
                    onChange={(e) =>
                      updateField('follow_up_date', e.target.value)
                    }
                    className="w-full text-sm border border-slate-200 rounded-md px-2.5 py-1.5 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                  />
                </div>
                <div className="col-span-2">
                  <EditableTextField
                    label="Follow-Up Notes"
                    value={current.follow_up_notes || ''}
                    onChange={(v) => updateField('follow_up_notes', v)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Interval" value={current.follow_up_interval} />
                <Field label="Date" value={current.follow_up_date} />
                <Field label="Notes" value={current.follow_up_notes} />
              </div>
            )}
          </TimelineCard>

          {/* ===== Referral ===== */}
          {(current.referral_needed ||
            (isEditing && canEdit('treatment_plan'))) && (
            <TimelineCard
              title="Referral"
              icon={<Send size={12} />}
              dotColor="bg-amber-500"
              ringColor="ring-amber-100"
              badgeColor="bg-amber-100 text-amber-700"
            >
              {isEditing && canEdit('treatment_plan') ? (
                <div className="space-y-3">
                  <EditableSelectField
                    label="Referral Needed"
                    value={current.referral_needed ? 'yes' : 'no'}
                    onChange={(v) =>
                      updateField('referral_needed', v === 'yes')
                    }
                    options={[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ]}
                  />
                  {current.referral_needed && (
                    <>
                      <EditableTextField
                        label="Referral To"
                        value={current.referral_to || ''}
                        onChange={(v) => updateField('referral_to', v)}
                        rows={1}
                      />
                      <EditableTextField
                        label="Reason"
                        value={current.referral_reason || ''}
                        onChange={(v) => updateField('referral_reason', v)}
                        rows={2}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Referral To" value={current.referral_to} />
                  <Field
                    label="Reason"
                    value={current.referral_reason}
                    className="col-span-2"
                  />
                </div>
              )}
            </TimelineCard>
          )}
        </div>
      </div>
    </div>
  );
}
