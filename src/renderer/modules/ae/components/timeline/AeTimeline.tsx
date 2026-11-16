// =============================================================================
// AeTimeline — Full clinical timeline for A&E encounter
// Shows ALL information entered across every form with staff names & timestamps
// =============================================================================

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  Activity,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  LogOut,
  CheckCircle2,
  Shield,
  Plus,
  Send,
  HeartPulse,
  Syringe,
  Eye,
  ClipboardList,
} from 'lucide-react';
import { useAeTimeline } from '../../hooks/useAe';
import { supabase } from '../../../../api/supabaseClient';
import SavedNotesPopover from '../../../../components/ui/SavedNotesPopover';
import TemplateSearchPopover from '../../../../components/ui/TemplateSearchPopover';

interface AeTimelineProps {
  encounterId: string;
  patientId?: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  arrival: Activity,
  triage: AlertTriangle,
  assessment: Shield,
  clinical: Stethoscope,
  observation: HeartPulse,
  order: FlaskConical,
  medication: Pill,
  procedure: Syringe,
  treatment: Pill,
  nursing: ClipboardList,
  disposition: LogOut,
  system: CheckCircle2,
  admin: FileText,
  note: FileText,
  result: Eye,
  alert: AlertCircle,
  handover: FileText,
};

const ROLE_TITLE_MAP: Record<string, string> = {
  doctor: 'Dr.',
  medical_director: 'Dr.',
  nurse: 'Nrs.',
  pharmacist: 'Pharm.',
  lab_technician: 'Lab Tech.',
  radiologist: 'Rad.',
  admin: 'Admin',
  super_admin: 'Admin',
  receptionist: 'Rec.',
  billing_clerk: 'Billing',
  cashier: 'Cashier',
};

function formatStaffName(evt: any): string | null {
  if (evt.staff?.first_name || evt.staff?.last_name) {
    const name =
      `${evt.staff.first_name || ''} ${evt.staff.last_name || ''}`.trim();
    const prefix = ROLE_TITLE_MAP[evt.staff?.role] || '';
    return prefix ? `${prefix} ${name}` : name;
  }
  return null;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function renderDetailsAsList(details: any): React.ReactNode {
  if (!details || typeof details !== 'object') return null;
  const entries = Object.entries(details).filter(
    ([key, val]) =>
      val != null &&
      val !== '' &&
      key !== 'red_flags' &&
      !Array.isArray(val) &&
      typeof val !== 'object',
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
      {entries.map(([key, val]) => (
        <div key={key} className="flex gap-1.5 text-xs">
          <span className="font-semibold text-slate-500 capitalize whitespace-nowrap">
            {key.replace(/_/g, ' ')}:
          </span>
          <span className="text-slate-700 truncate">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AeTimeline({
  encounterId,
  patientId,
}: AeTimelineProps) {
  const { data: events = [], isLoading } = useAeTimeline(encounterId);
  const queryClient = useQueryClient();
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('email', authData?.user?.email ?? '')
        .maybeSingle();

      await supabase.from('ae_timeline_events').insert({
        encounter_id: encounterId,
        patient_id: patientId || null,
        event_category: 'note',
        event_type: 'addendum_note',
        title: 'Clinical Addendum',
        description: noteText.trim(),
        performed_by: staffRow?.id ?? null,
        performed_at: new Date().toISOString(),
        severity: 'info',
      });

      queryClient.invalidateQueries({ queryKey: ['ae'] });
      setNoteText('');
      setShowAddNote(false);
    } catch (err) {
      console.error('[A&E] Note save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Addendum Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Addendum
        </button>
      </div>

      {/* Add Addendum Form */}
      {showAddNote && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Addendum Note
            </label>
            <div className="flex items-center gap-1">
              <TemplateSearchPopover
                templateType="ae"
                category="ae_notes"
                currentValues={{ clinical_notes: noteText }}
                onTemplateSelect={(data) => {
                  if (data.clinical_notes) setNoteText(data.clinical_notes);
                  if (data.notes) setNoteText(data.notes);
                }}
                buttonText="Fill"
              />
              <SavedNotesPopover
                category="ae_notes"
                subcategory="addendum"
                currentValue={noteText}
                onInsert={(content) => setNoteText(content)}
              />
            </div>
          </div>
          <textarea
            value={noteText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNoteText(e.target.value)
            }
            placeholder="Enter addendum note, observation update, or correction..."
            rows={3}
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddNote(false);
                setNoteText('');
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={saving || !noteText.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline Events */}
      {events.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No timeline events yet.</p>
        </div>
      ) : (
        <div className="relative pl-4 sm:pl-0 space-y-4">
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-slate-200 ml-1.5 sm:ml-[108px] hidden sm:block" />

          {events.map((evt: any, idx: number) => {
            const Icon = CATEGORY_ICONS[evt.event_category] || FileText;
            const time = new Date(evt.performed_at || evt.created_at);
            const staffName = formatStaffName(evt);

            let dotColorClass = 'bg-blue-500 ring-blue-100';
            let badgeClass = 'bg-blue-50 text-blue-700';

            if (evt.severity === 'critical') {
              dotColorClass = 'bg-red-500 ring-red-100';
              badgeClass = 'bg-red-50 text-red-700';
            } else if (evt.severity === 'warning') {
              dotColorClass = 'bg-yellow-500 ring-yellow-100';
              badgeClass = 'bg-yellow-50 text-yellow-700';
            } else if (
              evt.event_category === 'triage' ||
              evt.event_category === 'arrival'
            ) {
              dotColorClass = 'bg-indigo-500 ring-indigo-100';
              badgeClass = 'bg-indigo-50 text-indigo-700';
            } else if (
              evt.event_category === 'medication' ||
              evt.event_category === 'procedure'
            ) {
              dotColorClass = 'bg-emerald-500 ring-emerald-100';
              badgeClass = 'bg-emerald-50 text-emerald-700';
            } else if (evt.event_category === 'order') {
              dotColorClass = 'bg-purple-500 ring-purple-100';
              badgeClass = 'bg-purple-50 text-purple-700';
            } else if (evt.event_category === 'observation') {
              dotColorClass = 'bg-cyan-500 ring-cyan-100';
              badgeClass = 'bg-cyan-50 text-cyan-700';
            } else if (
              evt.event_category === 'nursing' ||
              evt.event_category === 'note'
            ) {
              dotColorClass = 'bg-green-500 ring-green-100';
              badgeClass = 'bg-green-50 text-green-700';
            } else if (evt.event_category === 'assessment') {
              dotColorClass = 'bg-orange-500 ring-orange-100';
              badgeClass = 'bg-orange-50 text-orange-700';
            }

            return (
              <div
                key={evt.id || idx}
                className="relative flex flex-col sm:flex-row gap-4 items-start group"
              >
                {/* Time */}
                <div className="sm:w-[100px] sm:text-right pt-0.5 shrink-0 z-10 ml-8 sm:ml-0">
                  <span className="text-[10px] font-bold text-blue-600 block">
                    {formatRelativeTime(time)}
                  </span>
                  <span className="text-xs font-bold text-slate-700 block">
                    {time.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-xs text-slate-400 font-medium uppercase">
                    {time.toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Dot */}
                <div
                  className={`absolute left-0 sm:static sm:ml-0 top-1 sm:top-0 w-4 h-4 rounded-full border-2 border-white ring-2 z-10 shrink-0 mt-0.5 ${dotColorClass}`}
                />

                {/* Event card */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full group-hover:border-slate-300 transition-colors ml-8 sm:ml-0">
                  {/* Header: category badge + staff name */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${badgeClass}`}
                    >
                      <Icon className="h-3 w-3" />
                      {evt.event_category?.replace(/_/g, ' ')}
                    </span>
                    {staffName && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        By: {staffName}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="text-sm font-bold text-slate-800 mb-1">
                    {evt.title}
                  </p>

                  {/* Description split by pipe delimiter into label:value rows */}
                  {evt.description && (
                    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                      {evt.description
                        .split(' | ')
                        .map((line: string, i: number) => {
                          const colonIdx = line.indexOf(':');
                          if (colonIdx > 0) {
                            const label = line.slice(0, colonIdx).trim();
                            const value = line.slice(colonIdx + 1).trim();
                            return (
                              <div key={i} className="flex gap-2 text-xs">
                                <span className="font-semibold text-slate-500 whitespace-nowrap min-w-[120px]">
                                  {label}:
                                </span>
                                <span className="text-slate-700">{value}</span>
                              </div>
                            );
                          }
                          return (
                            <p key={i} className="text-xs text-slate-600">
                              {line}
                            </p>
                          );
                        })}
                    </div>
                  )}

                  {/* If no description, render details object as key-value list */}
                  {!evt.description &&
                    evt.details &&
                    renderDetailsAsList(evt.details)}

                  {/* Red flags tags */}
                  {evt.details?.red_flags &&
                    evt.details.red_flags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {evt.details.red_flags.map((flag: string) => (
                          <span
                            key={flag}
                            className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold uppercase rounded border border-red-100"
                          >
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                  {/* Array details like injuries, interventions */}
                  {evt.details &&
                    typeof evt.details === 'object' &&
                    Object.entries(evt.details)
                      .filter(
                        ([key, val]) =>
                          Array.isArray(val) &&
                          (val as any[]).length > 0 &&
                          key !== 'red_flags',
                      )
                      .map(([key, val]) => (
                        <div key={key} className="mt-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(val as string[]).map(
                              (item: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-slate-50 text-slate-700 text-[10px] font-medium rounded border border-slate-200"
                                >
                                  {String(item).replace(/_/g, ' ')}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
