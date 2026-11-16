// =============================================================================
// ANC Module — PregnancySummaryCard
// Compact card showing key pregnancy info (GA, EDD, risk, parity)
// =============================================================================

import React from 'react';
import { AlertTriangle, CalendarDays, Baby, Heart, Clock } from 'lucide-react';
import type { PregnancyEpisode } from '../api/anc.types';
import {
  calculateGestationalAge,
  calculateEDD,
  getTrimester,
} from '../api/anc.types';

interface Props {
  episode: PregnancyEpisode;
  compact?: boolean;
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  high: 'bg-red-100 text-red-700 border-red-300',
};

export default function PregnancySummaryCard({ episode, compact }: Props) {
  const ga = calculateGestationalAge(episode.lmp);
  const edd = episode.edd || calculateEDD(episode.lmp);
  const trimester = ga ? getTrimester(ga.weeks) : null;

  const patientName = episode.patient
    ? `${episode.patient.first_name} ${episode.patient.surname}`
    : '—';

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_COLORS[episode.risk_level]}`}
        >
          {episode.risk_level.toUpperCase()}
        </span>
        {ga && (
          <span className="text-gray-600">
            <Clock className="inline h-3.5 w-3.5 mr-1" />
            {ga.weeks}w {ga.days}d
          </span>
        )}
        <span className="text-gray-500">
          G{episode.gravida}P{episode.parity}A{episode.abortions}
        </span>
        {edd && (
          <span className="text-gray-500">
            EDD: {new Date(edd).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      {/* Patient header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{patientName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Episode #{episode.episode_number} ·{' '}
            {episode.patient?.emr_number || episode.patient?.patient_id}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${RISK_COLORS[episode.risk_level]}`}
        >
          {episode.risk_level === 'high' && (
            <AlertTriangle className="h-3 w-3" />
          )}
          {episode.risk_level.toUpperCase()} RISK
        </span>
      </div>

      {/* Key metrics — 2×2 grid that always fits */}
      <div className="grid grid-cols-2 gap-2">
        <MetricBox
          icon={<Clock className="h-3.5 w-3.5 text-pink-500" />}
          label="Gestational Age"
          value={ga ? `${ga.weeks}w ${ga.days}d` : '—'}
          sub={trimester ? `Trimester ${trimester}` : undefined}
        />
        <MetricBox
          icon={<CalendarDays className="h-3.5 w-3.5 text-purple-500" />}
          label="EDD"
          value={
            edd
              ? new Date(edd).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'
          }
        />
        <MetricBox
          icon={<Baby className="h-3.5 w-3.5 text-blue-500" />}
          label="Obstetric Formula"
          value={`G${episode.gravida} P${episode.parity} A${episode.abortions}`}
          sub={`${episode.living_children} living`}
        />
        <MetricBox
          icon={<Heart className="h-3.5 w-3.5 text-red-500" />}
          label="Blood Group"
          value={
            episode.blood_group
              ? `${episode.blood_group} ${episode.rhesus_factor || ''}`.trim()
              : '—'
          }
          sub={episode.genotype || undefined}
        />
      </div>

      {/* Assigned care team */}
      {(episode.primary_doctor || episode.primary_midwife) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2.5 text-[11px] text-gray-500">
          {episode.primary_doctor && (
            <span>
              Doctor: Dr. {episode.primary_doctor.first_name}{' '}
              {episode.primary_doctor.last_name}
            </span>
          )}
          {episode.primary_midwife && (
            <span>
              Midwife: {episode.primary_midwife.first_name}{' '}
              {episode.primary_midwife.last_name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function MetricBox({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5">
      <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}
