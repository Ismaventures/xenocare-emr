/**
 * AllNotesPanel - Professional Clinical Documentation View
 *
 * Features:
 * - SOAP-oriented structure with professional document styling
 * - Edit capability for physicians on their own notes
 * - Edit history tracking (edited indicator, timestamp, editor name)
 * - Compact, printable layout
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  X,
  Printer,
  UserCheck,
  TrendingUp,
  Clipboard,
  ClipboardCheck,
  Stethoscope,
  Activity,
  Plus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { EmptyState } from '../../../../../../components/ui/DataDisplay';
import { formatDate, formatDateTime } from '../shared';
import {
  NotesTimeline,
  TimelineNote,
} from '../../../../../nursing/components/NotesTimeline';
import { NursingInterventionCharts } from '../../../../../nursing/components/NursingInterventionCharts';
import { getNursingInterventions } from '../../../../../nursing/api/nursing-interventions.api';

type NotesFilterType =
  | 'all'
  | 'clinical'
  | 'nursing'
  | 'nursing-progress'
  | 'progress'
  | 'treatment'
  | 'interventions';

interface AllNotesPanelProps {
  encounter: EncounterDetail;
  onAddAddendum?: () => void;
  onAddNote?: () => void;
  onAddOrder?: () => void;
  canAddNotesOrOrders?: boolean;
}

// =============================================================================
// Read-Only Field Component
// =============================================================================
function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="mb-6">
      <label className="text-sm font-black text-slate-800 uppercase tracking-wide border-l-4 border-slate-300 pl-2 block mb-2">
        {label}
      </label>
      <p className="text-[15px] font-medium text-slate-800 leading md:leading-relaxed whitespace-pre-wrap bg-white pl-2">
        {value}
      </p>
    </div>
  );
}

// =============================================================================
// Quick Actions Dropdown — single button that reveals all actions
// =============================================================================
function QuickActionsDropdown({
  onAddAddendum,
  onAddNote,
  onAddOrder,
}: {
  onAddAddendum?: () => void;
  onAddNote?: () => void;
  onAddOrder?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items: Array<{ label: string; icon: React.ElementType; color: string; onClick?: () => void }> = [];
  if (onAddAddendum) items.push({ label: 'Addendum', icon: FileText, color: 'text-violet-700 hover:bg-violet-50', onClick: onAddAddendum });
  if (onAddNote) items.push({ label: 'Add Note', icon: FileText, color: 'text-indigo-700 hover:bg-indigo-50', onClick: onAddNote });
  if (onAddOrder) items.push({ label: 'Add Order', icon: Plus, color: 'text-emerald-700 hover:bg-emerald-50', onClick: onAddOrder });

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm border border-emerald-600 whitespace-nowrap"
      >
        <Plus size={14} />
        Actions
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
          {items.map(({ label, icon: Icon, color, onClick }) => (
            <button
              key={label}
              onClick={() => { onClick?.(); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold ${color} transition`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Document Header Component - Professional letterhead style
// =============================================================================
function DocumentHeader({
  title,
  encounterNumber,
  date,
  doctorName,
  onPrint,
}: {
  title: string;
  encounterNumber: string;
  date: string;
  doctorName?: string;
  onPrint?: () => void;
}) {
  return (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Encounter:{' '}
            <span className="font-mono font-medium text-slate-700">
              {encounterNumber}
            </span>
            <span className="mx-2">|</span>
            Date:{' '}
            <span className="font-medium text-slate-700">
              {formatDate(date)}
            </span>
          </p>
          {doctorName && (
            <p className="text-sm text-slate-500">
              Attending:{' '}
              <span className="font-medium text-slate-700">{doctorName}</span>
            </p>
          )}
        </div>
        {onPrint && (
          <button
            onClick={onPrint}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
          >
            <Printer size={14} />
            Print
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SOAP Section Component - Document-style with letter badge
// =============================================================================
function SOAPSection({
  letter,
  title,
  children,
  defaultExpanded = true,
  color = 'slate',
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  color?: 'blue' | 'teal' | 'green' | 'amber' | 'slate';
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colorClasses = {
    blue: 'bg-blue-600',
    teal: 'bg-teal-600',
    green: 'bg-green-600',
    amber: 'bg-amber-600',
    slate: 'bg-slate-600',
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full text-left group"
      >
        <span
          className={`w-8 h-8 ${colorClasses[color]} text-white rounded flex items-center justify-center font-bold text-sm shadow-sm`}
        >
          {letter}
        </span>
        <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide flex-1">
          {title}
        </h3>
        {isExpanded ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronRight size={16} className="text-slate-400" />
        )}
      </button>

      {isExpanded && <div className="mt-3 pl-11">{children}</div>}
    </div>
  );
}

// =============================================================================
// Note Card Component - For nursing and progress notes
// =============================================================================
function NoteCard({
  title,
  author,
  timestamp,
  content,
  badges,
  color = 'slate',
  children,
}: {
  title: string;
  author?: string;
  timestamp: string;
  content?: string;
  badges?: Array<{ text: string; color: string }>;
  color?: 'emerald' | 'purple' | 'amber' | 'red' | 'slate';
  children?: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  const borderColors = {
    emerald: 'border-l-emerald-500',
    purple: 'border-l-purple-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
    slate: 'border-l-slate-500',
  };

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${borderColors[color]} rounded-r shadow-sm mb-3`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-slate-800">{title}</span>
            {badges?.map((badge, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-xs font-medium rounded ${badge.color}`}
              >
                {badge.text}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {author && <span>{author} | </span>}
            {formatDateTime(timestamp)}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {content && (
            <p className="text-sm text-slate-700 leading-relaxed mt-3 whitespace-pre-wrap">
              {content}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================
export function AllNotesPanel({
  encounter,
  onAddAddendum,
  onAddNote,
  onAddOrder,
  canAddNotesOrOrders,
}: AllNotesPanelProps) {
  const [activeFilter, setActiveFilter] = useState<NotesFilterType>('all');

  // Query for Nursing Interventions Count
  const { data: interventionsData } = useQuery({
    queryKey: ['nursing-interventions-count', encounter.encounter_id],
    queryFn: () =>
      getNursingInterventions({
        encounter_id: encounter.encounter_id,
        limit: 1,
      }),
    enabled: !!encounter.encounter_id,
  });

  const interventionsCount = interventionsData?.total || 0;

  const { consultation } = encounter;
  const nursingNotes = encounter.nursing_notes || [];
  const dailyProgressNotes = encounter.daily_progress_notes || [];
  const treatmentPlans = encounter.treatment_plans || [];
  const clinicalNoteRecords = encounter.clinical_note_records || [];

  // Separate nursing progress notes from general nursing notes
  const nursingProgressNotes = nursingNotes.filter(
    (note) => note.note_type === 'Progress_Note',
  );
  const generalNursingNotes = nursingNotes.filter(
    (note) => note.note_type !== 'Progress_Note',
  );

  // Convert nursing and progress notes to timeline format
  const timelineNotes = useMemo(() => {
    const notes: TimelineNote[] = [];

    // Map General Nursing Notes
    generalNursingNotes.forEach((note) => {
      notes.push({
        id: note.id,
        type: 'nursing',
        timestamp: note.created_at,
        title: note.title || note.note_type.replace(/_/g, ' '),
        author: {
          first_name: note.recorded_by_name?.split(' ')[0] || '',
          last_name: note.recorded_by_name?.split(' ').slice(1).join(' ') || '',
          role: 'Nurse',
        },
        content: note.content,
        patient_condition: note.patient_condition,
        is_critical: note.is_critical,
        shift: note.shift as any,
        interventions_performed: note.interventions_performed,
        patient_response: note.patient_response,
        pain_level: note.pain_level,
        follow_up_required: note.follow_up_required,
        follow_up_notes: note.follow_up_notes,
        requires_doctor_review: note.requires_doctor_review,
        doctor_reviewed_at: note.doctor_reviewed_at,
        raw: note,
      });
    });

    // Map Nursing Progress Notes
    nursingProgressNotes.forEach((note) => {
      notes.push({
        id: note.id,
        type: 'nursing',
        timestamp: note.created_at,
        title: note.title || 'Nursing Progress Note',
        author: {
          first_name: note.recorded_by_name?.split(' ')[0] || '',
          last_name: note.recorded_by_name?.split(' ').slice(1).join(' ') || '',
          role: 'Nurse',
        },
        content: note.content,
        patient_condition: note.patient_condition,
        is_critical: note.is_critical,
        shift: note.shift as any,
        interventions_performed: note.interventions_performed,
        patient_response: note.patient_response,
        pain_level: note.pain_level,
        follow_up_required: note.follow_up_required,
        follow_up_notes: note.follow_up_notes,
        requires_doctor_review: note.requires_doctor_review,
        doctor_reviewed_at: note.doctor_reviewed_at,
        raw: note,
      });
    });

    // Map Daily Progress Notes (Doctor/General)
    dailyProgressNotes.forEach((note) => {
      notes.push({
        id: note.progress_id,
        type: 'progress',
        timestamp: note.recorded_at || note.note_date,
        title: 'Daily Progress Note',
        author: {
          first_name: note.recorded_by_name?.split(' ')[0] || '',
          last_name: note.recorded_by_name?.split(' ').slice(1).join(' ') || '',
          role: 'Doctor',
        },
        alert_level: note.alert_level,

        // SOAP
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,

        nursing_summary: note.nursing_summary,
        vital_signs_summary: note.vital_signs_summary,
        patient_condition: note.patient_condition,

        // I/O
        oral_intake_ml: note.oral_intake_ml,
        iv_intake_ml: note.iv_intake_ml,
        urine_output_ml: note.urine_output_ml,
        other_output_ml: note.other_output_ml,

        raw: note,
      });
    });

    // Map Clinical Note Records (from clinical_notes table)
    const noteTypeLabels: Record<string, string> = {
      progress_note: 'Progress Note',
      result_review: 'Result Review',
      clinical_update: 'Clinical Update',
      follow_up: 'Follow-up Note',
      addendum: 'Addendum',
    };
    clinicalNoteRecords.forEach((note) => {
      notes.push({
        id: note.id,
        type: 'doctor',
        timestamp: note.created_at,
        title:
          note.display_label ||
          noteTypeLabels[note.note_type] ||
          note.note_type.replace(/_/g, ' '),
        author: {
          first_name: '',
          last_name: '',
          role: note.author_role || 'Doctor',
        },
        subjective: note.subjective || undefined,
        objective: note.objective || undefined,
        assessment: note.assessment || undefined,
        plan: note.plan || undefined,
        content: note.notes || undefined,
        raw: note,
      });
    });

    return notes.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [
    generalNursingNotes,
    nursingProgressNotes,
    dailyProgressNotes,
    clinicalNoteRecords,
  ]);

  // Filter for timeline display
  const displayedTimelineNotes = useMemo(() => {
    return timelineNotes.filter((note) => {
      if (activeFilter === 'all') return true;

      // Specific filters
      if (activeFilter === 'clinical') {
        return note.type === 'doctor';
      }
      if (activeFilter === 'nursing') {
        // Only general nursing notes (not progress)
        return (
          note.type === 'nursing' && note.raw?.note_type !== 'Progress_Note'
        );
      }
      if (activeFilter === 'nursing-progress') {
        return (
          note.type === 'nursing' && note.raw?.note_type === 'Progress_Note'
        );
      }
      if (activeFilter === 'progress') {
        return note.type === 'progress';
      }

      // Treatment and Interventions are handled separately outside the timeline
      return false;
    });
  }, [timelineNotes, activeFilter]);

  // Extract clinical data
  const chiefComplaint = consultation?.chief_complaint;
  const hpi = consultation?.history_of_present_illness;
  const pastHistory = consultation?.past_medical_history;
  const familyHistory = consultation?.family_history;
  const socialHistory = consultation?.social_history;
  const reviewOfSystems = consultation?.review_of_systems;
  const examination =
    consultation?.examination_findings || consultation?.physical_examination;
  const rawDiagnosis = consultation?.diagnosis;
  const differentialDx = consultation?.differential_diagnosis;
  const treatmentPlan = consultation?.treatment_plan;
  const recommendations = consultation?.recommendations;
  const clinicalNotesText = consultation?.clinical_notes;
  const followUpDate = consultation?.follow_up_date;
  const followUpNotes = consultation?.follow_up_notes;
  const icd10Codes = consultation?.icd10_codes || [];

  // Process diagnosis
  const diagnosisIsArray = Array.isArray(rawDiagnosis);
  const diagnosisText = diagnosisIsArray ? null : rawDiagnosis;

  const parsedIcd10FromDiagnosis: Array<{ code: string; description: string }> =
    diagnosisIsArray
      ? (rawDiagnosis as string[]).map((d) => {
          const match = d.match(/^([A-Z]\d{2}(?:\.\d{1,2})?)\s*-\s*(.+)$/i);
          if (match) return { code: match[1], description: match[2].trim() };
          return { code: '', description: d };
        })
      : [];

  const allIcd10Codes =
    icd10Codes.length > 0 ? icd10Codes : parsedIcd10FromDiagnosis;

  // Section checks
  const hasSubjective =
    chiefComplaint ||
    hpi ||
    pastHistory ||
    familyHistory ||
    socialHistory ||
    reviewOfSystems;
  const hasObjective = examination || clinicalNotesText;
  const hasAssessment =
    diagnosisText ||
    allIcd10Codes.length > 0 ||
    (differentialDx && differentialDx.length > 0);
  const hasPlan = treatmentPlan || recommendations || followUpDate;
  const hasAnySOAP = hasSubjective || hasObjective || hasAssessment || hasPlan;

  // Counts
  const nursingCount = generalNursingNotes.length;
  const nursingProgressCount = nursingProgressNotes.length;
  const progressCount = dailyProgressNotes.length;
  const treatmentPlanCount = treatmentPlans.length;
  const totalNotes =
    (hasAnySOAP ? 1 : 0) +
    nursingCount +
    nursingProgressCount +
    progressCount +
    treatmentPlanCount +
    interventionsCount;

  // Filter visibility
  const showClinical = activeFilter === 'all' || activeFilter === 'clinical';
  const showNursing = activeFilter === 'all' || activeFilter === 'nursing';
  const showNursingProgress =
    activeFilter === 'all' || activeFilter === 'nursing-progress';
  const showProgress = activeFilter === 'all' || activeFilter === 'progress';
  const showTreatment = activeFilter === 'treatment';
  const showInterventions = activeFilter === 'interventions';

  if (totalNotes === 0) {
    return (
      <EmptyState
        title="No Clinical Documentation"
        description="No clinical notes have been recorded for this encounter."
      />
    );
  }

  const filterButtons: Array<{
    key: NotesFilterType;
    label: string;
    count: number;
    icon: React.ElementType;
  }> = [
    {
      key: 'all',
      label: 'All Notes',
      count:
        (hasAnySOAP ? 1 : 0) +
        nursingCount +
        nursingProgressCount +
        progressCount +
        interventionsCount,
      icon: FileText,
    },
    {
      key: 'clinical',
      label: 'Clinical',
      count: hasAnySOAP ? 1 : 0,
      icon: Stethoscope,
    },
    { key: 'nursing', label: 'Nursing', count: nursingCount, icon: UserCheck },
    {
      key: 'nursing-progress',
      label: 'Nursing Progress',
      count: nursingProgressCount,
      icon: ClipboardCheck,
    },
    {
      key: 'progress',
      label: 'Progress',
      count: progressCount,
      icon: TrendingUp,
    },
    {
      key: 'treatment',
      label: 'Treatment Plans',
      count: treatmentPlanCount,
      icon: Clipboard,
    },
    {
      key: 'interventions',
      label: 'Interventions',
      count: interventionsCount,
      icon: Activity,
    },
  ];

  return (
    <div className="w-full">
      {/* Filter Bar + Action Buttons */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto">
          {filterButtons.map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 transition-colors ${
                activeFilter === key
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon size={12} />
              {label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === key ? 'bg-white/20' : 'bg-slate-200'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Actions — single button with dropdown */}
        {canAddNotesOrOrders && (
          <QuickActionsDropdown
            onAddAddendum={onAddAddendum}
            onAddNote={onAddNote}
            onAddOrder={onAddOrder}
          />
        )}
      </div>

      {/* ========== CLINICAL NOTES (SOAP) ========== */}
      {showClinical && hasAnySOAP && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
          <DocumentHeader
            title="Clinical Consultation Notes"
            encounterNumber={encounter.encounter_number}
            date={encounter.encounter_date}
            doctorName={consultation?.doctor_name || encounter.doctor?.name}
          />

          {/* Documented timestamp */}
          {consultation?.created_at && (
            <div className="mb-4 -mt-2">
              <p className="text-xs text-slate-500">
                <Clock size={10} className="inline mr-1" />
                Documented: {formatDateTime(consultation.created_at)}
              </p>
            </div>
          )}

          {/* S - SUBJECTIVE */}
          {hasSubjective && (
            <SOAPSection letter="S" title="Subjective" color="blue">
              {chiefComplaint && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-red-600" />
                    <span className="text-xs font-semibold text-red-700 uppercase">
                      Chief Complaint
                    </span>
                  </div>
                  <p className="text-sm font-medium text-red-900">
                    {chiefComplaint}
                  </p>
                </div>
              )}

              <ReadOnlyField
                label="History of Present Illness"
                value={hpi}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReadOnlyField
                  label="Past Medical History"
                  value={pastHistory}
                />
                <ReadOnlyField
                  label="Family History"
                  value={familyHistory}
                />
                <ReadOnlyField
                  label="Social History"
                  value={socialHistory}
                />
                <ReadOnlyField
                  label="Review of Systems"
                  value={reviewOfSystems}
                />
              </div>
            </SOAPSection>
          )}

          {/* O - OBJECTIVE */}
          {hasObjective && (
            <SOAPSection letter="O" title="Objective" color="teal">
              <ReadOnlyField
                label="Physical Examination"
                value={examination}
              />

              <ReadOnlyField
                label="Additional Clinical Notes"
                value={clinicalNotesText}
              />
            </SOAPSection>
          )}

          {/* A - ASSESSMENT */}
          {hasAssessment && (
            <SOAPSection letter="A" title="Assessment" color="green">
              {diagnosisText && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                  <span className="text-xs font-semibold text-green-700 uppercase block mb-1">
                    Diagnosis
                  </span>
                  <p className="text-sm font-medium text-green-900">
                    {diagnosisText}
                  </p>
                </div>
              )}

              {allIcd10Codes.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                    ICD-10 Codes
                  </span>
                  <div className="space-y-1">
                    {allIcd10Codes.map((icd, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-mono rounded">
                          {icd.code}
                        </span>
                        <span className="text-slate-700">
                          {icd.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {differentialDx && differentialDx.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                    Differential Diagnosis
                  </span>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                    {differentialDx.map((dx: unknown, idx: number) => (
                      <li key={idx}>
                        {typeof dx === 'string'
                          ? dx
                          : typeof dx === 'object' && dx !== null
                            ? ((dx as any).label ??
                              (dx as any).value ??
                              JSON.stringify(dx))
                            : String(dx)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SOAPSection>
          )}

          {/* P - PLAN */}
          {hasPlan && (
            <SOAPSection letter="P" title="Plan" color="amber">
              <ReadOnlyField
                label="Treatment Plan"
                value={treatmentPlan}
              />

              <ReadOnlyField
                label="Patient Recommendations"
                value={recommendations}
              />

              {followUpDate && (
                <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-4">
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-slate-600" />
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Follow-up Date
                      </span>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatDate(followUpDate)}
                      </p>
                      {followUpNotes && (
                        <p className="text-xs text-slate-600 mt-1">
                          {followUpNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </SOAPSection>
          )}

          {/* Signature line */}
          <div className="border-t border-slate-200 pt-4 mt-6">
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">
                  {consultation?.doctor_name ||
                    encounter.doctor?.name ||
                    'Attending Physician'}
                </p>
                <p className="text-xs text-slate-500">
                  {encounter.doctor?.specialty || 'Medical Doctor'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== NURSING INTERVENTIONS CHART ========== */}
      {showInterventions && (
        <div className="mb-8">
          <NursingInterventionCharts encounterId={encounter.encounter_id} />
        </div>
      )}

      {/* ========== TIMELINE NOTES (Nursing, Progress) ========== */}
      {displayedTimelineNotes.length > 0 && (
        <div className="mb-8">
          <NotesTimeline
            notes={displayedTimelineNotes}
            title={activeFilter === 'all' ? 'Timeline' : undefined}
            expandedByDefault
          />
        </div>
      )}

      {/* ========== TREATMENT PLANS ========== */}
      {showTreatment && treatmentPlanCount > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clipboard size={18} className="text-amber-600" />
            <h3 className="font-semibold text-slate-800">Treatment Plans</h3>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {treatmentPlanCount}
            </span>
          </div>

          {treatmentPlans.map((plan) => {
            const completedTasks =
              plan.tasks?.filter((t) => t.status === 'completed').length || 0;
            const totalTasks = plan.tasks?.length || 0;

            const getStatusColor = (status: string) => {
              switch (status?.toLowerCase()) {
                case 'completed':
                  return 'bg-green-100 text-green-700';
                case 'in_progress':
                case 'in progress':
                  return 'bg-blue-100 text-blue-700';
                case 'pending':
                  return 'bg-yellow-100 text-yellow-700';
                case 'cancelled':
                  return 'bg-red-100 text-red-700';
                default:
                  return 'bg-slate-100 text-slate-700';
              }
            };

            return (
              <NoteCard
                key={plan.plan_id}
                title={plan.title || 'Treatment Plan'}
                author={plan.created_by_name}
                timestamp={plan.created_at}
                color="amber"
                badges={[
                  {
                    text: plan.status?.replace(/_/g, ' '),
                    color: getStatusColor(plan.status),
                  },
                  ...(totalTasks > 0
                    ? [
                        {
                          text: `${completedTasks}/${totalTasks} tasks`,
                          color: 'bg-slate-100 text-slate-600',
                        },
                      ]
                    : []),
                ]}
              >
                {plan.description && (
                  <p className="text-sm text-slate-700 mt-3">
                    {plan.description}
                  </p>
                )}

                {plan.instructions && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                    <span className="font-semibold text-blue-700">
                      Instructions:
                    </span>
                    <p className="text-slate-700 mt-1 whitespace-pre-wrap">
                      {plan.instructions}
                    </p>
                  </div>
                )}

                {/* Tasks */}
                {plan.tasks && plan.tasks.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Tasks
                    </span>
                    <div className="mt-2 space-y-2">
                      {plan.tasks.map((task) => (
                        <div
                          key={task.task_id}
                          className={`flex items-start gap-2 p-2 rounded text-xs ${
                            task.status === 'completed'
                              ? 'bg-green-50'
                              : 'bg-slate-50'
                          }`}
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle
                              size={14}
                              className="text-green-600 flex-shrink-0 mt-0.5"
                            />
                          ) : (
                            <Clock
                              size={14}
                              className="text-slate-400 flex-shrink-0 mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">
                                {task.task_type.replace(/_/g, ' ')}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs ${getStatusColor(task.status)}`}
                              >
                                {task.status?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-slate-600 mt-0.5">
                                {task.description}
                              </p>
                            )}
                            {task.completed_at && task.completed_by_name && (
                              <p className="text-green-600 mt-1">
                                {task.completed_by_name}{' '}
                                {formatDateTime(task.completed_at)}
                              </p>
                            )}
                            {task.result_value && (
                              <p className="text-blue-600 font-medium mt-1">
                                Result: {task.result_value}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </NoteCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
