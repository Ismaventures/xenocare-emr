// =============================================================================
// AeDashboard — Clinical A&E Department Dashboard
// Design: Professional medical dashboard with metric cards + encounters table
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  Activity,
  HeartPulse,
  CheckCircle2,
  TrendingUp,
  Search,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useAeDashboardStats, useAeEncounters } from '../../hooks/useAe';
import type { AeEncounterSummary } from '../../api/ae.types';
import { triageLevelLabel, type TriageLevel } from '../../api/ae.types';

interface AeDashboardProps {
  onSelectEncounter: (
    encounterId: string,
    patientId: string,
    patientName: string,
  ) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPatientAge(dob?: string): string {
  if (!dob) return '';
  const years = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 86400000),
  );
  return `${years}Y`;
}

function getWaitMinutes(arrival?: string | null): number | null {
  if (!arrival) return null;
  return Math.round((Date.now() - new Date(arrival).getTime()) / 60000);
}

function formatWait(mins: number | null): string {
  if (mins === null) return '-';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function stageLabel(stage?: string): string {
  if (!stage) return 'ARRIVAL';
  const map: Record<string, string> = {
    registered: 'REGISTRATION',
    ae_arrival: 'ARRIVAL',
    ae_triage: 'TRIAGE',
    ae_treatment: 'TREATMENT',
    ae_assessment: 'ASSESSMENT',
    ae_disposition: 'DISPOSITION',
    awaiting_labs: 'AWAITING LABS',
    awaiting_imaging: 'AWAITING IMAGING',
  };
  return map[stage] || stage.replace(/_/g, ' ').toUpperCase();
}

function stageColor(stage?: string): string {
  if (!stage) return 'bg-gray-100 text-gray-600';
  if (stage.includes('triage')) return 'bg-amber-100 text-amber-700';
  if (stage.includes('treatment')) return 'bg-red-100 text-red-700';
  if (stage.includes('assessment')) return 'bg-blue-100 text-blue-700';
  if (stage.includes('disposition')) return 'bg-green-100 text-green-700';
  if (stage.includes('lab') || stage.includes('imaging'))
    return 'bg-purple-100 text-purple-700';
  if (stage.includes('arrival')) return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-600';
}

// ─── Acuity Badge Component ───────────────────────────────────────────────

function AcuityBadge({
  level,
  color,
}: {
  level?: number | null;
  color?: string | null;
}) {
  if (!level && !color) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200">
        Pending
      </span>
    );
  }

  const triageLevel = level || (color === 'Red' ? 1 : color === 'Yellow' ? 3 : 4);
  const label = level
    ? triageLevelLabel(level as TriageLevel)
    : color || 'Unknown';

  // Color mapping matching the screenshot design
  let badgeClasses = '';
  if (triageLevel <= 1) {
    badgeClasses = 'bg-red-600 text-white border-red-700';
  } else if (triageLevel === 2) {
    badgeClasses = 'bg-orange-500 text-white border-orange-600';
  } else if (triageLevel === 3) {
    badgeClasses = 'bg-amber-500 text-white border-amber-600';
  } else if (triageLevel === 4) {
    badgeClasses = 'bg-green-600 text-white border-green-700';
  } else {
    badgeClasses = 'bg-blue-500 text-white border-blue-600';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border ${badgeClasses}`}
    >
      Level {triageLevel} -{' '}
      {label}
    </span>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────

export default function AeDashboard({ onSelectEncounter }: AeDashboardProps) {
  const { data: stats, isLoading: statsLoading } = useAeDashboardStats();
  const { data: encounters = [], isLoading: encLoading } = useAeEncounters();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllEncounters, setShowAllEncounters] = useState(false);

  // Filter encounters
  const filteredEncounters = useMemo(() => {
    if (!searchQuery.trim()) return encounters;
    const q = searchQuery.toLowerCase();
    return encounters.filter(
      (enc: AeEncounterSummary) =>
        enc.patient_name?.toLowerCase().includes(q) ||
        enc.chief_complaint?.toLowerCase().includes(q) ||
        enc.encounter_number?.toLowerCase().includes(q),
    );
  }, [encounters, searchQuery]);

  const displayedEncounters = showAllEncounters
    ? filteredEncounters
    : filteredEncounters.slice(0, 8);

  const statCards = [
    {
      label: 'ACTIVE',
      value: stats?.active_encounters ?? 0,
      sub: statsLoading
        ? 'Loading...'
        : `+${stats?.today_total ?? 0} Since 1h`,
      icon: Users,
      iconBg: 'bg-[#005FB8]',
      iconColor: 'text-white',
    },
    {
      label: 'CRITICAL',
      value: stats?.critical_count ?? 0,
      sub: 'Stable Status',
      icon: AlertTriangle,
      iconBg: 'bg-[#D32F2F]',
      iconColor: 'text-white',
    },
    {
      label: 'TRIAGE',
      value: stats?.awaiting_triage ?? 0,
      sub: 'Action Needed',
      icon: HeartPulse,
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
    },
    {
      label: 'AVG WAIT',
      value: stats?.avg_wait_minutes ?? '—',
      sub: 'Calculating...',
      icon: Clock,
      iconBg: 'bg-gray-500',
      iconColor: 'text-white',
    },
    {
      label: 'DISCHARGED',
      value: stats?.discharged_today ?? 0,
      sub: 'Today',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
    },
    {
      label: 'ADMITTED',
      value: stats?.admitted_today ?? 0,
      sub: 'Transferred',
      icon: TrendingUp,
      iconBg: 'bg-[#005FB8]',
      iconColor: 'text-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Metric Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}
              >
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-[11px] font-semibold text-gray-400 tracking-wider mb-0.5">
              {card.label}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {statsLoading ? '—' : card.value}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Active A&E Encounters Table ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">
              Active A&E Encounters
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-56 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005FB8]/20 focus:border-[#005FB8] transition-colors"
              />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Table Content */}
        {encLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-2 text-gray-400">
              <div className="h-4 w-4 border-2 border-gray-300 border-t-[#005FB8] rounded-full animate-spin" />
              <span className="text-sm">Loading encounters...</span>
            </div>
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500 mb-1">
              {searchQuery
                ? 'No matching encounters'
                : 'No active A&E encounters'}
            </p>
            <p className="text-xs text-gray-400">
              {searchQuery
                ? 'Try a different search term'
                : 'New arrivals will appear here automatically'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Acuity
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Chief Complaint
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Arrival
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Wait
                    </th>
                    <th className="text-right px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedEncounters.map((enc: AeEncounterSummary) => {
                    const waitMins = getWaitMinutes(enc.arrival_time);
                    const patient = enc.patient;
                    const age = patient?.date_of_birth
                      ? getPatientAge(patient.date_of_birth)
                      : '';
                    const gender = patient?.gender?.charAt(0) || '';
                    const serviceNum =
                      patient?.service_number ||
                      enc.encounter_number ||
                      enc.visit_id;
                    const arrivalMode = enc.arrival?.arrival_mode
                      ? `(${enc.arrival.arrival_mode.replace(/_/g, '-').charAt(0).toUpperCase() + enc.arrival.arrival_mode.replace(/_/g, '-').slice(1)})`
                      : '';

                    return (
                      <tr
                        key={enc.encounter_id}
                        className="hover:bg-[#F5F7FA] cursor-pointer transition-colors group"
                        onClick={() =>
                          onSelectEncounter(
                            enc.encounter_id,
                            enc.patient_id,
                            enc.patient_name || 'Unknown',
                          )
                        }
                      >
                        {/* Patient Info */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-sm text-gray-900 uppercase">
                              {enc.patient_name || 'Unknown'}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              ID: {serviceNum?.slice(0, 6) || '—'} •{' '}
                              {age ? `${age}` : ''}{' '}
                              {gender ? `${gender}` : ''}
                            </p>
                          </div>
                        </td>

                        {/* Acuity */}
                        <td className="px-4 py-4">
                          <AcuityBadge
                            level={enc.triage?.triage_level}
                            color={enc.acuity_color}
                          />
                        </td>

                        {/* Chief Complaint */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700 max-w-[200px] truncate block">
                            {enc.chief_complaint || '-'}
                          </span>
                        </td>

                        {/* Arrival Time */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {enc.arrival_time
                                ? new Date(
                                    enc.arrival_time,
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : new Date(
                                    enc.start_time,
                                  ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                            </p>
                            {arrivalMode && (
                              <p className="text-[11px] text-gray-400">
                                {arrivalMode}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Stage */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider ${stageColor(enc.current_stage)}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                enc.current_stage?.includes('treatment')
                                  ? 'bg-red-500'
                                  : enc.current_stage?.includes('triage')
                                    ? 'bg-amber-500'
                                    : 'bg-current'
                              }`}
                            />
                            {stageLabel(enc.current_stage)}
                          </span>
                        </td>

                        {/* Wait */}
                        <td className="px-4 py-4">
                          <span
                            className={`text-sm font-semibold ${
                              waitMins !== null && waitMins > 120
                                ? 'text-red-600'
                                : waitMins !== null && waitMins > 60
                                  ? 'text-amber-600'
                                  : 'text-gray-700'
                            }`}
                          >
                            {formatWait(waitMins)}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold text-[#005FB8] uppercase tracking-wider group-hover:underline">
                            View Details
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* See All / Collapse */}
            {filteredEncounters.length > 8 && (
              <div className="px-6 py-3 border-t border-gray-100 text-center">
                <button
                  onClick={() => setShowAllEncounters(!showAllEncounters)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#005FB8] hover:underline"
                >
                  {showAllEncounters
                    ? 'Show Less'
                    : `See All ${filteredEncounters.length} Encounters`}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showAllEncounters ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
