/**
 * TimelinePanel - Chronological encounter event timeline
 * - Auto-expands cards on scroll into viewport, collapses when scrolled away
 * - Category filter chips, date sort, and date grouping
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  FileText,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  Scan,
  Syringe,
  User,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import { EncounterDetail } from '../../../../api/medical-records.api';
import { formatDateTime } from '../shared/utils';

interface TimelinePanelProps {
  encounter: EncounterDetail;
}

type TimelineEventType =
  | 'consultation'
  | 'progress_note'
  | 'ward_round_note'
  | 'nursing_note'
  | 'clinical_note'
  | 'vitals'
  | 'prescription'
  | 'lab'
  | 'imaging'
  | 'procedure'
  | 'admission';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description: string;
  author?: string;
  status?: string;
  is_critical?: boolean;
}

function isTestEvent(type: TimelineEventType): boolean {
  return type === 'lab' || type === 'imaging' || type === 'procedure';
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CHIPS: { key: TimelineEventType | 'all' | 'tests' | 'clinical'; label: string; color: string; activeColor: string; types?: TimelineEventType[] }[] = [
  { key: 'all', label: 'All', color: 'bg-slate-100 text-slate-600 hover:bg-slate-200', activeColor: 'bg-slate-900 text-white' },
  { key: 'consultation', label: 'Consultation', color: 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100', activeColor: 'bg-blue-700 text-white' },
  { key: 'vitals', label: 'Vitals', color: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100', activeColor: 'bg-rose-700 text-white' },
  { key: 'prescription', label: 'Medications', color: 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100', activeColor: 'bg-green-700 text-white' },
  { key: 'tests', label: 'Tests', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100', activeColor: 'bg-cyan-700 text-white', types: ['lab', 'imaging', 'procedure'] },
  { key: 'clinical', label: 'Notes', color: 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100', activeColor: 'bg-violet-700 text-white', types: ['progress_note', 'ward_round_note', 'nursing_note', 'clinical_note'] },
];

type SortOrder = 'desc' | 'asc';

// ─── Auto-expanding Timeline Event Card ─────────────────────────────────────

interface TimelineEventCardProps {
  event: TimelineEvent;
  getEventBg: (type: TimelineEventType) => string;
  getEventIcon: (type: TimelineEventType) => React.ReactNode;
}

function TimelineEventCard({
  event,
  getEventBg,
  getEventIcon,
}: TimelineEventCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [manualLock, setManualLock] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IntersectionObserver with hysteresis:
  // - Expand immediately when 30% visible
  // - Collapse only after FULLY out of view for 400ms (prevents blink)
  // - Manual click locks the card so auto-behavior stops
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (manualLock) return;

        if (entry.isIntersecting) {
          // Cancel any pending collapse
          if (collapseTimer.current) {
            clearTimeout(collapseTimer.current);
            collapseTimer.current = null;
          }
          setIsOpen(true);
        } else {
          // Debounce collapse — only close after 400ms fully out of view
          if (collapseTimer.current) clearTimeout(collapseTimer.current);
          collapseTimer.current = setTimeout(() => {
            setIsOpen(false);
            collapseTimer.current = null;
          }, 400);
        }
      },
      { threshold: [0, 0.3], rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [manualLock]);

  const testEvent = isTestEvent(event.type);

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setManualLock(true); // Stop auto-behavior after manual click
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={cardRef}
      className="relative pl-16 group cursor-pointer"
      onClick={() => handleToggle()}
    >
      <div
        className={`absolute left-0 top-0 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 duration-300 bg-white ${getEventBg(event.type)}`}
      >
        {getEventIcon(event.type)}
      </div>

      <div
        className={`rounded-xl border p-6 shadow-sm hover:shadow-md transition-all duration-300 ${
          testEvent
            ? 'bg-cyan-50/60 border-cyan-300 ring-1 ring-cyan-200'
            : 'bg-white border-slate-200'
        } ${isOpen ? 'ring-2 ring-blue-100' : ''}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-serif font-bold text-slate-900 leading-tight">
                {event.title}
              </h4>
              {testEvent && (
                <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-cyan-600 text-white tracking-wider">
                  Test Event
                </span>
              )}
              {event.is_critical && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-black uppercase rounded-full animate-pulse">
                  Critical Alert
                </span>
              )}
              {event.status && (
                <span
                  className={`px-2 py-0.5 text-xs font-black uppercase rounded-full ${
                    event.status === 'Completed' || event.status === 'Dispensed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {event.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock size={12} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-400">
                {formatDateTime(event.date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {event.author && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                  {event.author.charAt(0)}
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                  {event.author}
                </span>
              </div>
            )}
            <button
              className={`text-slate-400 hover:text-slate-600 border p-1 rounded-md transition-colors ${isOpen ? 'bg-blue-50 text-blue-500' : ''}`}
              aria-label="Toggle details"
              onClick={(e) => handleToggle(e)}
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="relative pt-4 border-t border-slate-100 mt-2">
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
            <div className="absolute -bottom-1 -right-1 opacity-10">
              {getEventIcon(event.type)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TimelinePanel({ encounter }: TimelinePanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Consolidate all encounter events into a single sorted array
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // 1. Initial Consultation
    if (encounter.consultation) {
      allEvents.push({
        id: `consult-${encounter.encounter_id}`,
        type: 'consultation',
        date: encounter.consultation.created_at || encounter.encounter_date,
        title: 'Initial Consultation',
        description:
          encounter.consultation.chief_complaint ||
          'Patient consultation recorded',
        author: encounter.doctor?.name,
      });
    }

    // 2. Daily Progress Notes (Ward Rounds)
    if (encounter.daily_progress_notes) {
      encounter.daily_progress_notes.forEach((note) => {
        allEvents.push({
          id: note.progress_id,
          type: 'progress_note',
          date: note.recorded_at,
          title: 'Daily Progress Note',
          description: note.assessment || 'Progress evaluation',
          author: note.recorded_by_name,
        });
      });
    }

    // 3. Ward Round Notes
    if (encounter.ward_round_notes) {
      encounter.ward_round_notes.forEach((note) => {
        const authorName = note.attending_physician
          ? `${note.attending_physician.first_name} ${note.attending_physician.last_name}`.trim()
          : undefined;

        allEvents.push({
          id: note.id,
          type: 'ward_round_note',
          date: note.created_at,
          title: `Ward Round (${note.round_type})`,
          description:
            note.assessment ||
            note.plan ||
            note.subjective_notes ||
            'Ward round note recorded',
          author: authorName,
        });
      });
    }

    // 4. Nursing Notes
    if (encounter.nursing_notes) {
      encounter.nursing_notes.forEach((note) => {
        allEvents.push({
          id: note.id,
          type: 'nursing_note',
          date: note.created_at,
          title:
            note.note_type === 'Observation'
              ? 'Nursing Observation'
              : `Nursing Note: ${note.note_type}`,
          description: note.content,
          author: note.recorded_by_name,
          is_critical: note.is_critical,
        });
      });
    }

    // 4. Vitals Snapshots
    if (encounter.all_vitals) {
      encounter.all_vitals.forEach((vital, idx) => {
        const bpDisplay = vital.blood_pressure
          ? typeof vital.blood_pressure === 'object'
            ? `${vital.blood_pressure.systolic}/${vital.blood_pressure.diastolic}`
            : vital.blood_pressure
          : 'N/A';
        allEvents.push({
          id: `vital-${idx}`,
          type: 'vitals',
          date: vital.recorded_at,
          title: 'Vital Signs Recorded',
          description: `BP: ${bpDisplay}, HR: ${vital.heart_rate || 'N/A'}, Temp: ${vital.temperature || 'N/A'}`,
          author: vital.recorded_by_name,
        });
      });
    }

    // 5. Prescriptions
    if (encounter.prescriptions) {
      encounter.prescriptions.forEach((p) => {
        allEvents.push({
          id: p.id,
          type: 'prescription',
          date: encounter.encounter_date, // Approximate if date not available on prescription
          title: 'Medication Prescribed',
          description: `${p.drug_name} - ${p.dosage} ${p.frequency}`,
          status: p.dispensed ? 'Dispensed' : 'Pending',
        });
      });
    }

    // 6. Lab Results / Requests
    const labEvents = encounter.lab_results?.length
      ? encounter.lab_results
      : encounter.lab_requests || [];
    if (labEvents.length > 0) {
      labEvents.forEach((lab: any) => {
        const detailParts: string[] = [];
        if (lab.clinical_notes)
          detailParts.push(`Clinical Notes: ${lab.clinical_notes}`);
        if (lab.result) detailParts.push(`Result: ${lab.result}`);
        if (lab.result_value || lab.result_unit) {
          detailParts.push(
            `Value: ${`${lab.result_value || ''} ${lab.result_unit || ''}`.trim()}`,
          );
        }
        if (lab.reference_range || lab.normal_range) {
          detailParts.push(
            `Reference: ${lab.reference_range || lab.normal_range}`,
          );
        }
        if (lab.interpretation)
          detailParts.push(`Interpretation: ${lab.interpretation}`);
        if (lab.result_notes) detailParts.push(`Notes: ${lab.result_notes}`);
        if (Array.isArray(lab.lab_results_items)) {
          const itemComments = lab.lab_results_items
            .map((item: any) => item?.comments)
            .filter(Boolean);
          if (itemComments.length > 0) {
            detailParts.push(`Result Notes: ${itemComments.join('; ')}`);
          }
        }

        allEvents.push({
          id: lab.request_id || lab.id,
          type: 'lab',
          date:
            lab.result_date ||
            lab.requested_at ||
            lab.requested_date ||
            lab.created_at,
          title:
            lab.result || lab.result_value
              ? 'LAB TEST RESULT'
              : 'LAB TEST ORDER',
          description: [
            `Test: ${lab.test_name || 'Laboratory Test'}`,
            ...detailParts,
          ]
            .filter(Boolean)
            .join(' | '),
          status: lab.status,
        });
      });
    }

    // 7. Imaging Results / Requests
    const imagingEvents = encounter.imaging_results?.length
      ? encounter.imaging_results
      : encounter.radiology_requests || [];
    if (imagingEvents.length > 0) {
      imagingEvents.forEach((rad: any) => {
        const reportObj =
          typeof rad.report === 'object' && rad.report !== null
            ? rad.report
            : null;
        const reportFindings = reportObj?.findings as string | undefined;
        const reportImpression = reportObj?.impression as string | undefined;
        const details: string[] = [];
        if (rad.clinical_indication)
          details.push(`Clinical Indication: ${rad.clinical_indication}`);
        if (typeof rad.report === 'string' && rad.report.trim())
          details.push(`Report: ${rad.report}`);
        if (rad.findings || reportFindings)
          details.push(`Findings: ${rad.findings || reportFindings}`);
        if (rad.impression || reportImpression)
          details.push(`Impression: ${rad.impression || reportImpression}`);
        if (rad.radiologist_name)
          details.push(`Reported By: ${rad.radiologist_name}`);

        allEvents.push({
          id: rad.request_id || rad.id,
          type: 'imaging',
          date:
            rad.report_date ||
            rad.requested_at ||
            rad.requested_date ||
            rad.created_at,
          title:
            rad.findings || rad.impression || reportFindings || reportImpression
              ? 'IMAGING TEST RESULT'
              : 'IMAGING TEST ORDER',
          description: [
            `Test: ${rad.exam_name || rad.study_type || rad.modality || 'Imaging Study'}`,
            rad.body_part ? `Body Part: ${rad.body_part}` : null,
            ...details,
          ]
            .filter(Boolean)
            .join(' | '),
          status: rad.status,
        });
      });
    }

    // 8. Procedure Results / Records
    if (encounter.procedure_results) {
      encounter.procedure_results.forEach((proc) => {
        const parts = [
          proc.indication ? `Indication: ${proc.indication}` : null,
          proc.findings ? `Findings: ${proc.findings}` : null,
          proc.post_procedure_diagnosis
            ? `Post-op Dx: ${proc.post_procedure_diagnosis}`
            : null,
          proc.complications ? `Complications: ${proc.complications}` : null,
          proc.procedure_notes ? `Notes: ${proc.procedure_notes}` : null,
        ].filter(Boolean);

        allEvents.push({
          id: proc.id,
          type: 'procedure',
          date: proc.completed_at || proc.started_at || proc.requested_date,
          title:
            proc.findings || proc.post_procedure_diagnosis
              ? 'Procedure Result'
              : 'Procedure Record',
          description: [`Procedure: ${proc.procedure_name}`, ...parts]
            .filter(Boolean)
            .join(' | '),
          status: proc.status,
          author: proc.surgeon_name,
        });
      });
    }

    // 9. Clinical Note Records (Progress Note, Clinical Update, Follow-up, Addendum, Result Review)
    const noteTypeLabels: Record<string, string> = {
      progress_note: 'Progress Note',
      result_review: 'Result Review',
      clinical_update: 'Clinical Update',
      follow_up: 'Follow-up Note',
      addendum: 'Addendum',
    };
    if (encounter.clinical_note_records) {
      encounter.clinical_note_records.forEach((note) => {
        const label =
          note.display_label ||
          noteTypeLabels[note.note_type] ||
          note.note_type.replace(/_/g, ' ');
        const noteDescription =
          [
            note.objective,
            note.assessment,
            note.subjective,
            note.notes,
            note.plan,
            note.follow_up_notes,
          ]
            .filter(Boolean)
            .join(' | ') || 'Clinical note recorded';
        allEvents.push({
          id: note.id,
          type: 'clinical_note',
          date: note.created_at,
          title: label,
          description:
            note.note_type === 'result_review'
              ? `Test Review: ${noteDescription}`
              : noteDescription,
          status: note.status === 'final' ? 'Final' : note.status,
        });
      });
    }

    // Sort by date descending
    return allEvents.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [encounter]);

  const testEventCount = useMemo(
    () => events.filter((e) => isTestEvent(e.type)).length,
    [events],
  );
  const clinicalEventCount = useMemo(
    () => events.filter((e) => !isTestEvent(e.type)).length,
    [events],
  );

  // Category counts for chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: events.length };
    for (const e of events) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    counts['tests'] = events.filter((e) => isTestEvent(e.type)).length;
    counts['clinical'] = events.filter((e) => ['progress_note', 'ward_round_note', 'nursing_note', 'clinical_note'].includes(e.type)).length;
    return counts;
  }, [events]);

  // Filter events by selected category
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (activeCategory !== 'all') {
      const chip = CATEGORY_CHIPS.find((c) => c.key === activeCategory);
      if (chip?.types) {
        filtered = events.filter((e) => chip.types!.includes(e.type));
      } else {
        filtered = events.filter((e) => e.type === activeCategory);
      }
    }
    // Apply sort order
    return sortOrder === 'desc'
      ? filtered
      : [...filtered].reverse();
  }, [events, activeCategory, sortOrder]);

  // Group events by date for visual date separators
  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; events: TimelineEvent[] }[] = [];
    let currentDate = '';
    for (const event of filteredEvents) {
      const d = event.date ? new Date(event.date) : null;
      const dateKey = d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown Date';
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: dateKey, label: dateKey, events: [] });
      }
      groups[groups.length - 1].events.push(event);
    }
    return groups;
  }, [filteredEvents]);

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="text-blue-600" size={18} />;
      case 'progress_note':
        return <FileText className="text-indigo-600" size={18} />;
      case 'clinical_note':
        return <FileText className="text-violet-600" size={18} />;
      case 'ward_round_note':
        return <ClipboardList className="text-pink-600" size={18} />;
      case 'nursing_note':
        return <MessageSquare className="text-emerald-600" size={18} />;
      case 'vitals':
        return <Activity className="text-rose-600" size={18} />;
      case 'prescription':
        return <Pill className="text-green-600" size={18} />;
      case 'lab':
        return <FlaskConical className="text-cyan-600" size={18} />;
      case 'imaging':
        return <Scan className="text-purple-600" size={18} />;
      case 'procedure':
        return <Syringe className="text-amber-600" size={18} />;
      case 'admission':
        return <User className="text-amber-600" size={18} />;
      default:
        return <Clock className="text-slate-400" size={18} />;
    }
  };

  const getEventBg = (type: TimelineEventType) => {
    switch (type) {
      case 'consultation':
        return 'bg-blue-50 border-blue-100';
      case 'progress_note':
        return 'bg-indigo-50 border-indigo-100';
      case 'clinical_note':
        return 'bg-violet-50 border-violet-100';
      case 'ward_round_note':
        return 'bg-pink-50 border-pink-100';
      case 'nursing_note':
        return 'bg-emerald-50 border-emerald-100';
      case 'vitals':
        return 'bg-rose-50 border-rose-100';
      case 'prescription':
        return 'bg-green-50 border-green-100';
      case 'lab':
        return 'bg-cyan-50 border-cyan-100';
      case 'imaging':
        return 'bg-purple-50 border-purple-100';
      case 'procedure':
        return 'bg-amber-50 border-amber-100';
      case 'admission':
        return 'bg-amber-50 border-amber-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <Clock size={48} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-serif font-bold text-slate-900">
          No events found
        </h3>
        <p className="text-slate-500">
          This encounter does not have any recorded events yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* ─── Toolbar: Category chips + Sort toggle ─── */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2.5">
        {/* Top row: label + sort */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter & Sort
            </p>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
            title={sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
          >
            {sortOrder === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
        {/* Category chips row */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORY_CHIPS.map((chip) => {
            const count = categoryCounts[chip.key] || 0;
            if (chip.key !== 'all' && count === 0) return null;
            const isActive = activeCategory === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setActiveCategory(chip.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                  isActive ? chip.activeColor : chip.color
                }`}
              >
                {chip.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Auto-scroll info hint ─── */}
      <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <ChevronDown size={14} className="text-blue-500 animate-bounce" />
        <span className="text-xs text-blue-600 font-medium">Scroll through entries — they expand automatically as you read</span>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Clock size={36} className="text-slate-300 mb-3" />
          <h3 className="text-base font-serif font-bold text-slate-900">
            No events in this view
          </h3>
          <p className="text-slate-500 text-sm">
            Switch filters to view all timeline entries.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Continuous Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 ml-[0.5px]" />

          <div className="space-y-6">
            {groupedByDate.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="relative pl-16 mb-4">
                  <div className="absolute left-[17px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-700 border-4 border-white ring-1 ring-slate-200 z-10 flex items-center justify-center">
                    <Clock size={9} className="text-white" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="space-y-8">
                  {group.events.map((event, idx) => (
                    <TimelineEventCard
                      key={`${event.id}-${idx}`}
                      event={event}
                      getEventBg={getEventBg}
                      getEventIcon={getEventIcon}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Timeline End Pointer */}
            <div className="relative pl-16">
              <div className="absolute left-6 top-1 w-3 h-3 -ml-[5.5px] rounded-full bg-slate-300 border-4 border-white ring-1 ring-slate-100" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {sortOrder === 'desc' ? 'Beginning of records for this encounter' : 'End of records for this encounter'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
