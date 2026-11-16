/**
 * Notes Timeline Component
 *
 * A reusable timeline-based design for displaying nursing notes,
 * daily progress notes, and other clinical documentation in a
 * chronological timeline format.
 */

import React, { useState, useMemo } from 'react';
import { formatStaffName } from '../../../utils/staffDisplay';
import {
  Clock,
  User,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Stethoscope,
  ClipboardList,
  FileText,
  Droplets,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type NoteType =
  | 'nursing'
  | 'progress'
  | 'soap'
  | 'vitals'
  | 'doctor'
  | 'handover';

export interface TimelineNote {
  id: string;
  type: NoteType;
  timestamp: string;
  title?: string;

  // Author info
  author?: {
    first_name?: string;
    last_name?: string;
    role?: string;
  };

  // Common fields
  content?: string;
  patient_condition?: string;
  is_critical?: boolean;
  shift?: 'morning' | 'afternoon' | 'night';

  // Nursing-specific
  note_type?: string;
  interventions_performed?: string;
  patient_response?: string;
  pain_level?: number | null;
  follow_up_required?: boolean;
  follow_up_notes?: string;
  requires_doctor_review?: boolean;
  doctor_reviewed_at?: string;

  // SOAP fields
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;

  // Progress note specific
  nursing_summary?: string;
  vital_signs_summary?: string;
  alert_level?: string;

  // I/O Tracking
  oral_intake_ml?: number;
  iv_intake_ml?: number;
  urine_output_ml?: number;
  other_output_ml?: number;
  io_notes?: string;

  // Raw data for custom rendering
  raw?: any;
}

export interface NotesTimelineProps {
  notes: TimelineNote[];
  title?: string;
  emptyMessage?: string;
  showDateHeaders?: boolean;
  expandedByDefault?: boolean;
  maxInitialNotes?: number;
  onNoteClick?: (note: TimelineNote) => void;
  onNoteEdit?: (note: TimelineNote) => void;
  onNoteDelete?: (note: TimelineNote) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getConditionColor(condition?: string): string {
  if (!condition) return 'bg-gray-100 text-gray-700';
  const lower = condition.toLowerCase();
  if (lower === 'critical') return 'bg-red-100 text-red-700';
  if (lower === 'deteriorating' || lower === 'unstable')
    return 'bg-orange-100 text-orange-700';
  if (lower === 'stable') return 'bg-green-100 text-green-700';
  if (lower === 'improving') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function getAlertLevelColor(level?: string): string {
  if (!level) return 'border-gray-200 bg-gray-50';
  const lower = level.toLowerCase();
  if (lower === 'critical') return 'border-red-300 bg-red-50';
  if (lower === 'warning') return 'border-orange-300 bg-orange-50';
  if (lower === 'caution') return 'border-yellow-300 bg-yellow-50';
  return 'border-gray-200 bg-gray-50';
}

function getShiftColor(shift?: string): string {
  if (!shift) return 'bg-gray-100 text-gray-600';
  const lower = shift.toLowerCase();
  if (lower === 'morning') return 'bg-amber-100 text-amber-700';
  if (lower === 'afternoon') return 'bg-blue-100 text-blue-700';
  if (lower === 'night') return 'bg-indigo-100 text-indigo-700';
  return 'bg-gray-100 text-gray-600';
}

function getTypeConfig(type: NoteType): {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (type) {
    case 'nursing':
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: <ClipboardList size={18} className="text-emerald-600" />,
        label: 'Nursing',
      };
    case 'progress':
      return {
        color: 'text-sky-600',
        bgColor: 'bg-sky-50',
        borderColor: 'border-sky-200',
        icon: <FileText size={18} className="text-sky-600" />,
        label: 'Progress',
      };
    case 'soap':
      return {
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        icon: <Stethoscope size={18} className="text-indigo-600" />,
        label: 'SOAP',
      };
    case 'vitals':
      return {
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        icon: <Activity size={18} className="text-pink-600" />,
        label: 'Vitals',
      };
    case 'doctor':
      return {
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        icon: <Stethoscope size={18} className="text-purple-600" />,
        label: 'Doctor',
      };
    case 'handover':
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: <Clock size={18} className="text-amber-600" />,
        label: 'Handover',
      };
    default:
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <FileText size={18} className="text-gray-600" />,
        label: 'Note',
      };
  }
}

// =============================================================================
// Timeline Item Component
// =============================================================================

interface TimelineItemProps {
  note: TimelineNote;
  isFirst: boolean;
  isLast: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function TimelineItem({
  note,
  isFirst,
  isLast,
  onClick,
  onEdit,
  onDelete,
}: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = getTypeConfig(note.type);

  // Calculate I/O balance if applicable
  const hasIOData =
    note.oral_intake_ml ||
    note.iv_intake_ml ||
    note.urine_output_ml ||
    note.other_output_ml;
  const totalIntake = (note.oral_intake_ml || 0) + (note.iv_intake_ml || 0);
  const totalOutput = (note.urine_output_ml || 0) + (note.other_output_ml || 0);
  const ioBalance = totalIntake - totalOutput;

  return (
    <div className="relative pl-16 group">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-100" />
      )}

      {/* Timeline Dot/Icon */}
      <div
        className={`absolute left-0 top-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 duration-300 bg-white ${
          note.is_critical
            ? 'border-red-300 bg-red-50'
            : `${typeConfig.borderColor} ${typeConfig.bgColor}`
        }`}
      >
        {note.is_critical ? (
          <AlertTriangle size={18} className="text-red-600" />
        ) : (
          typeConfig.icon
        )}
      </div>

      {/* Content Card */}
      <div
        className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer mb-6 ${
          note.is_critical ? 'border-red-200' : typeConfig.borderColor
        }`}
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 text-xs font-black uppercase rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>
              <h4 className="text-base font-bold text-gray-900 mr-1">
                {note.title && note.title !== 'Title (Optional)'
                  ? note.title
                  : note.note_type?.replace(/_/g, ' ') || 'Clinical Note'}
              </h4>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              {note.is_critical && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-black uppercase rounded-full animate-pulse border border-red-200 shadow-sm">
                  ⚠ Status: Critical
                </span>
              )}
              {note.shift && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full border border-gray-100 ${getShiftColor(note.shift)}`}
                >
                  Shift: {note.shift}
                </span>
              )}
              {note.patient_condition && (
                <span
                  className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full border border-gray-100 ${getConditionColor(note.patient_condition)}`}
                >
                  Condition: {note.patient_condition}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock size={12} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-400">
                {formatDateTime(note.timestamp)}
              </span>
            </div>
          </div>

          {note.author && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${typeConfig.bgColor} ${typeConfig.borderColor}`}
            >
              <div
                className={`w-6 h-6 rounded-full ${typeConfig.bgColor.replace('50', '600')} flex items-center justify-center text-xs font-bold text-white`}
                style={{
                  backgroundColor:
                    note.type === 'nursing'
                      ? '#059669'
                      : note.type === 'doctor'
                        ? '#7c3aed'
                        : '#0284c7',
                }}
              >
                {note.author.first_name?.charAt(0) || 'U'}
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-tight ${typeConfig.color}`}
              >
                {formatStaffName(note.author.first_name, note.author.last_name, note.author.role)}
              </span>
            </div>
          )}
        </div>

        {/* Collapsed Preview */}
        {!isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex-1 mr-4 min-w-0">
              <p className="text-sm text-gray-500 italic line-clamp-3 break-words whitespace-pre-wrap">
                {note.content
                  ? note.content
                  : note.nursing_summary
                    ? note.nursing_summary
                    : 'Medical entry logged.'}
              </p>
            </div>
            <button
              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
            >
              <Eye size={14} />
              View Note
            </button>
          </div>
        )}

        {/* Expanded Content View */}
        {isExpanded && (
          <div className="animate-in fade-in duration-300 slide-in-from-top-2">
            {/* Main Content */}
            {note.content && (
              <div className="mb-4 mt-3">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            )}

            {/* SOAP Notes Grid (for SOAP or progress notes) */}
            {(note.subjective ||
              note.objective ||
              note.assessment ||
              note.plan) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {note.subjective && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs flex items-center justify-center font-black">
                        S
                      </span>
                      <h5 className="text-xs font-bold text-blue-700 uppercase">
                        Subjective
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                      {note.subjective}
                    </p>
                  </div>
                )}
                {note.objective && (
                  <div className="p-3 bg-green-50 rounded-xl border border-green-100 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-green-200 text-green-700 text-xs flex items-center justify-center font-black">
                        O
                      </span>
                      <h5 className="text-xs font-bold text-green-700 uppercase">
                        Objective
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                      {note.objective}
                    </p>
                  </div>
                )}
                {note.assessment && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-xs flex items-center justify-center font-black">
                        A
                      </span>
                      <h5 className="text-xs font-bold text-amber-700 uppercase">
                        Assessment
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                      {note.assessment}
                    </p>
                  </div>
                )}
                {note.plan && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-black">
                        P
                      </span>
                      <h5 className="text-xs font-bold text-purple-700 uppercase">
                        Plan
                      </h5>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
                      {note.plan}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Nursing Summary */}
            {note.nursing_summary && (
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 mb-3">
                <h5 className="text-xs font-bold text-teal-700 uppercase mb-1">
                  Nursing Summary
                </h5>
                <p className="text-sm text-gray-700">{note.nursing_summary}</p>
              </div>
            )}

            {/* Interventions & Response */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {note.interventions_performed && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <h5 className="text-xs font-bold text-green-700 uppercase mb-1">
                    Interventions Performed
                  </h5>
                  <p className="text-sm text-gray-700">
                    {note.interventions_performed}
                  </p>
                </div>
              )}
              {note.patient_response && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <h5 className="text-xs font-bold text-blue-700 uppercase mb-1">
                    Patient Response
                  </h5>
                  <p className="text-sm text-gray-700">
                    {note.patient_response}
                  </p>
                </div>
              )}
            </div>

            {/* I/O Balance Section */}
            {hasIOData && (
              <div className="mt-4 p-4 bg-cyan-50 rounded-xl border border-cyan-200 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Droplets size={16} className="text-cyan-600" />
                  <h5 className="text-xs font-bold text-cyan-700 uppercase">
                    Intake/Output Balance
                  </h5>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xs text-cyan-600 uppercase font-medium">
                      Total Intake
                    </p>
                    <p className="text-lg font-bold text-cyan-700">
                      {totalIntake} ml
                    </p>
                    <p className="text-xs text-gray-500">
                      Oral: {note.oral_intake_ml || 0}ml | IV:{' '}
                      {note.iv_intake_ml || 0}ml
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xs text-orange-600 uppercase font-medium">
                      Total Output
                    </p>
                    <p className="text-lg font-bold text-orange-700">
                      {totalOutput} ml
                    </p>
                    <p className="text-xs text-gray-500">
                      Urine: {note.urine_output_ml || 0}ml | Other:{' '}
                      {note.other_output_ml || 0}ml
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xs text-gray-600 uppercase font-medium">
                      Balance
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      {ioBalance > 0 ? (
                        <TrendingUp size={16} className="text-green-600" />
                      ) : ioBalance < 0 ? (
                        <TrendingDown size={16} className="text-red-600" />
                      ) : (
                        <Minus size={16} className="text-gray-600" />
                      )}
                      <p
                        className={`text-lg font-bold ${ioBalance > 0 ? 'text-green-700' : ioBalance < 0 ? 'text-red-700' : 'text-gray-700'}`}
                      >
                        {ioBalance > 0 ? '+' : ''}
                        {ioBalance} ml
                      </p>
                    </div>
                  </div>
                </div>
                {note.io_notes && (
                  <p className="mt-2 text-sm text-gray-600 italic">
                    {note.io_notes}
                  </p>
                )}
              </div>
            )}

            {/* Follow-up Notes (if expanded) */}
            {note.follow_up_required && note.follow_up_notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <h5 className="text-xs font-bold text-amber-700 uppercase mb-1">
                  Follow-up Notes
                </h5>
                <p className="text-sm text-amber-900">{note.follow_up_notes}</p>
              </div>
            )}

            {/* Footer Badges & Collapse */}
            <div className="flex items-center gap-3 mt-4 flex-wrap pt-3 border-t border-gray-100">
              {note.pain_level !== null && note.pain_level !== undefined && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    note.pain_level >= 7
                      ? 'bg-red-100 text-red-700'
                      : note.pain_level >= 4
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                  }`}
                >
                  <Heart size={12} className="inline mr-1" />
                  Pain: {note.pain_level}/10
                </span>
              )}
              {note.follow_up_required && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <AlertCircle size={12} />
                  Follow-up Required
                </span>
              )}
              {note.requires_doctor_review && !note.doctor_reviewed_at && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Stethoscope size={12} />
                  Needs Doctor Review
                </span>
              )}
              {note.doctor_reviewed_at && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Doctor Reviewed
                </span>
              )}

              {/* Action Buttons */}
              {(onEdit || onDelete) && (
                <div className="ml-auto flex items-center gap-2 border-l border-gray-200 pl-3">
                  {onEdit && (
                    <button
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1.5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      title="Edit note"
                    >
                      <Edit size={13} />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1.5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      title="Delete note"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              )}

              {/* Collapse Toggle */}
              <button
                className={`${!(onEdit || onDelete) ? 'ml-auto' : ''} px-2 py-1 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <ChevronUp size={14} />
                Collapse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Date Header Component
// =============================================================================

interface DateHeaderProps {
  date: string;
  noteCount: number;
}

function DateHeader({ date, noteCount }: DateHeaderProps) {
  return (
    <div className="relative flex items-center justify-center my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
        <Calendar size={14} className="text-gray-500" />
        <span className="text-sm font-semibold text-gray-700">
          {formatDate(date)}
        </span>
        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Timeline Component
// =============================================================================

export function NotesTimeline({
  notes,
  title = 'Clinical Notes Timeline',
  emptyMessage = 'No notes have been recorded yet.',
  showDateHeaders = true,
  expandedByDefault = false,
  maxInitialNotes = 10,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
}: NotesTimelineProps) {
  const [showAll, setShowAll] = useState(expandedByDefault);

  // Sort notes by timestamp (most recent first)
  const sortedNotes = useMemo(() => {
    return [...notes].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [notes]);

  // Group notes by date if showDateHeaders is true
  const groupedNotes = useMemo(() => {
    if (!showDateHeaders) return null;

    const groups: Record<string, TimelineNote[]> = {};
    sortedNotes.forEach((note) => {
      const dateKey = new Date(note.timestamp).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
    });
    return groups;
  }, [sortedNotes, showDateHeaders]);

  // Limit visible notes
  const visibleNotes = showAll
    ? sortedNotes
    : sortedNotes.slice(0, maxInitialNotes);
  const hasMoreNotes = sortedNotes.length > maxInitialNotes;

  if (notes.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <FileText size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">{emptyMessage}</h3>
        <p className="text-gray-500 mt-2">
          Notes will appear here once they are documented.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-emerald-100 flex items-center justify-center">
              <FileText size={16} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-500">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}{' '}
                documented
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-emerald-300 to-gray-200" />

        {showDateHeaders && groupedNotes
          ? // Grouped by date
            Object.entries(groupedNotes).map(
              ([dateKey, dayNotes], groupIdx) => (
                <div key={dateKey}>
                  <DateHeader
                    date={dayNotes[0].timestamp}
                    noteCount={dayNotes.length}
                  />
                  {dayNotes.map((note, idx) => (
                    <TimelineItem
                      key={note.id}
                      note={note}
                      isFirst={groupIdx === 0 && idx === 0}
                      isLast={
                        groupIdx === Object.keys(groupedNotes).length - 1 &&
                        idx === dayNotes.length - 1
                      }
                      onClick={() => onNoteClick?.(note)}
                      onEdit={onNoteEdit ? () => onNoteEdit(note) : undefined}
                      onDelete={
                        onNoteDelete ? () => onNoteDelete(note) : undefined
                      }
                    />
                  ))}
                </div>
              ),
            )
          : // Simple list
            visibleNotes.map((note, idx) => (
              <TimelineItem
                key={note.id}
                note={note}
                isFirst={idx === 0}
                isLast={idx === visibleNotes.length - 1}
                onClick={() => onNoteClick?.(note)}
                onEdit={onNoteEdit ? () => onNoteEdit(note) : undefined}
                onDelete={onNoteDelete ? () => onNoteDelete(note) : undefined}
              />
            ))}
      </div>

      {/* Show More Button */}
      {hasMoreNotes && !showAll && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-3 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2"
          >
            <ChevronDown size={18} />
            Show {sortedNotes.length - maxInitialNotes} More Notes
          </button>
        </div>
      )}

      {hasMoreNotes && showAll && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAll(false)}
            className="px-6 py-3 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <ChevronUp size={18} />
            Show Less
          </button>
        </div>
      )}
    </div>
  );
}

export default NotesTimeline;
