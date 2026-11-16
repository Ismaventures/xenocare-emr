// =============================================================================
// PhysioSessionTimeline
// Full-screen modal timeline view of a physiotherapy plan's rehabilitation
// journey. Displays assessment, sessions, and progress notes in a vertical
// timeline inspired by the inpatient AdmissionCareModal.
// =============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Dumbbell,
  Zap,
  Heart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ClipboardList,
  Stethoscope,
  Eye,
  ChevronRight,
  BarChart3,
  FileText,
  RefreshCw,
  Target,
  Shield,
  X,
  Maximize2,
  Minimize2,
  Play,
} from 'lucide-react';
import { format } from 'date-fns';
import type { PhysioTimelineEntry } from '../api/physiotherapy.api';
import type {
  PhysioPlanSummary,
  PhysioPlanPaymentStatus,
  PhysioSessionDTO,
} from '../types/physiotherapy.types';
import {
  usePhysioPlanTimeline,
  usePatientPainTrend,
  usePlanSessions,
} from '../hooks/usePhysiotherapy';
import { getPhysioPlanSessionLockReason } from '../utils/session-access';
import PhysioSessionRecordModal from './PhysioSessionRecordModal';

// =============================================================================
// Types
// =============================================================================

interface PhysioSessionTimelineProps {
  plan: PhysioPlanSummary;
  isOpen: boolean;
  onClose: () => void;
  onRecordSession?: (sessionId: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

const MODALITY_ICONS: Record<string, { icon: React.ReactNode; color: string }> =
  {
    TENS: { icon: <Zap size={10} />, color: 'bg-yellow-100 text-yellow-700' },
    IFT: { icon: <Zap size={10} />, color: 'bg-yellow-100 text-yellow-700' },
    Ultrasound: {
      icon: <Activity size={10} />,
      color: 'bg-blue-100 text-blue-700',
    },
    SWD: { icon: <Zap size={10} />, color: 'bg-orange-100 text-orange-700' },
    MWD: { icon: <Zap size={10} />, color: 'bg-orange-100 text-orange-700' },
    Laser: { icon: <Zap size={10} />, color: 'bg-red-100 text-red-700' },
    EMS: { icon: <Zap size={10} />, color: 'bg-purple-100 text-purple-700' },
    Shockwave: { icon: <Zap size={10} />, color: 'bg-pink-100 text-pink-700' },
  };

const TECHNIQUE_LABELS: Record<string, string> = {
  Joint_Mobilization: 'Joint Mob.',
  Joint_Manipulation: 'Manipulation',
  Soft_Tissue_Mobilization: 'Soft Tissue',
  Massage: 'Massage',
  MFR: 'MFR',
  Stretching: 'Stretching',
  Trigger_Point_Release: 'Trigger Pt.',
  Dry_Needling: 'Dry Needling',
  Muscle_Energy_Technique: 'MET',
  Neural_Mobilization: 'Neural Mob.',
};

// Descriptive label maps for dropdown/enumerated fields
const SWELLING_LABELS: Record<
  string,
  { label: string; description: string; color: string }
> = {
  None: {
    label: 'No Swelling',
    description: 'No observable swelling or oedema present',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  Mild: {
    label: 'Mild Swelling',
    description: 'Slight swelling, minimal tissue distension',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  Moderate: {
    label: 'Moderate Swelling',
    description: 'Noticeable swelling with tissue distension',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  Severe: {
    label: 'Severe Swelling',
    description: 'Significant oedema with marked tissue distension',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
};

const TENDERNESS_LABELS: Record<
  string,
  { label: string; description: string; color: string }
> = {
  None: {
    label: 'No Tenderness',
    description: 'No pain on palpation',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  Mild: {
    label: 'Mild Tenderness',
    description: 'Slight discomfort on firm palpation',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  Moderate: {
    label: 'Moderate Tenderness',
    description: 'Pain on light palpation, patient winces',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  Severe: {
    label: 'Severe Tenderness',
    description: 'Pain on minimal contact, guarding present',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
};

const PROGRESS_LABELS: Record<
  string,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  Improved: {
    label: 'Improved',
    description: 'Patient showing measurable improvement in symptoms/function',
    icon: <TrendingDown size={10} />,
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  No_Change: {
    label: 'No Change',
    description: 'No significant change in patient condition',
    icon: <Minus size={10} />,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  Worse: {
    label: 'Worsened',
    description: 'Patient condition has deteriorated since last session',
    icon: <TrendingUp size={10} />,
    color: 'bg-red-50 text-red-700 border-red-200',
  },
};

const TOLERANCE_LABELS: Record<
  string,
  { label: string; description: string; color: string }
> = {
  Good: {
    label: 'Good Tolerance',
    description: 'Tolerated treatment well, no adverse reactions',
    color: 'bg-green-100 text-green-700',
  },
  Fair: {
    label: 'Fair Tolerance',
    description: 'Some difficulty with treatment, required modifications',
    color: 'bg-yellow-100 text-yellow-700',
  },
  Poor: {
    label: 'Poor Tolerance',
    description: 'Unable to tolerate treatment, significant discomfort',
    color: 'bg-red-100 text-red-700',
  },
};

const PAIN_LEVEL_DESCRIPTIONS: Record<
  string,
  { label: string; color: string }
> = {
  '0': { label: 'No Pain', color: 'text-green-700' },
  '1': { label: 'Minimal', color: 'text-green-600' },
  '2': { label: 'Mild', color: 'text-green-600' },
  '3': { label: 'Mild', color: 'text-lime-600' },
  '4': { label: 'Moderate', color: 'text-yellow-600' },
  '5': { label: 'Moderate', color: 'text-yellow-600' },
  '6': { label: 'Moderate-Severe', color: 'text-orange-600' },
  '7': { label: 'Severe', color: 'text-orange-600' },
  '8': { label: 'Very Severe', color: 'text-red-600' },
  '9': { label: 'Excruciating', color: 'text-red-700' },
  '10': { label: 'Worst Possible', color: 'text-red-800' },
};

// =============================================================================
// Helpers
// =============================================================================

function formatTimelineDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function formatTimelineDateTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
  } catch {
    return dateStr;
  }
}

function getPainReduction(
  before?: number,
  after?: number,
): { text: string; color: string; improving: boolean } | null {
  if (before == null || after == null) return null;
  const diff = before - after;
  if (diff > 0)
    return {
      text: `↓ ${diff} pt reduction`,
      color: 'text-green-600',
      improving: true,
    };
  if (diff < 0)
    return {
      text: `↑ ${Math.abs(diff)} pt increase`,
      color: 'text-red-600',
      improving: false,
    };
  return { text: 'No change', color: 'text-gray-500', improving: false };
}

function getStaffTitle(role: string | null | undefined): string {
  if (!role) return '';
  const r = role.toLowerCase();
  if (
    r.includes('doctor') ||
    r.includes('physician') ||
    r.includes('surgeon') ||
    r.includes('consultant') ||
    r.includes('specialist')
  )
    return 'Dr.';
  if (r.includes('nurse')) return 'Nurse';
  if (r.includes('pharmacist')) return 'Pharm.';
  if (r.includes('physio') || r.includes('therapist')) return 'PT';
  if (r.includes('radiolog')) return 'Rad.';
  return '';
}

// =============================================================================
// Progress Summary Header
// =============================================================================

function ProgressSummaryHeader({
  plan,
  entries,
}: {
  plan: PhysioPlanSummary;
  entries: PhysioTimelineEntry[];
}) {
  const completedSessions = entries.filter(
    (e) => e.type === 'session' && e.attendance_status === 'Attended',
  );
  const missedSessions = entries.filter(
    (e) => e.type === 'session' && e.attendance_status === 'Missed',
  );
  const remaining = Math.max(
    0,
    plan.total_sessions_planned - plan.sessions_completed,
  );

  // Calculate overall pain trend
  const sessionsWithPain = completedSessions.filter(
    (s) => s.pain_before != null && s.pain_after != null,
  );
  let painTrend: 'Improving' | 'Stable' | 'Worsening' | 'N/A' = 'N/A';
  if (sessionsWithPain.length >= 2) {
    const first = sessionsWithPain[0];
    const last = sessionsWithPain[sessionsWithPain.length - 1];
    const firstPain = first.pain_before!;
    const lastPain = last.pain_after!;
    if (lastPain < firstPain) painTrend = 'Improving';
    else if (lastPain > firstPain) painTrend = 'Worsening';
    else painTrend = 'Stable';
  }

  const percentage =
    plan.total_sessions_planned > 0
      ? Math.min(
          100,
          Math.round(
            (plan.sessions_completed / plan.total_sessions_planned) * 100,
          ),
        )
      : 0;

  return (
    <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border border-teal-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <BarChart3 size={16} className="text-teal-700" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            Physiotherapy Plan Progress
          </h3>
          {plan.treatment_approach && (
            <p className="text-xs text-gray-500 mt-0.5">
              {plan.treatment_approach}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="bg-white/70 rounded-lg p-2.5 text-center border border-teal-100">
          <div className="text-lg font-bold text-teal-700">
            {plan.sessions_completed}
          </div>
          <div className="text-[10px] font-medium text-gray-500 uppercase">
            Completed
          </div>
        </div>
        <div className="bg-white/70 rounded-lg p-2.5 text-center border border-teal-100">
          <div className="text-lg font-bold text-blue-700">{remaining}</div>
          <div className="text-[10px] font-medium text-gray-500 uppercase">
            Remaining
          </div>
        </div>
        <div className="bg-white/70 rounded-lg p-2.5 text-center border border-teal-100">
          <div className="text-lg font-bold text-red-500">
            {missedSessions.length}
          </div>
          <div className="text-[10px] font-medium text-gray-500 uppercase">
            Missed
          </div>
        </div>
        <div className="bg-white/70 rounded-lg p-2.5 text-center border border-teal-100">
          <div
            className={`text-lg font-bold ${
              painTrend === 'Improving'
                ? 'text-green-600'
                : painTrend === 'Worsening'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {painTrend === 'Improving' && (
              <TrendingDown size={18} className="inline" />
            )}
            {painTrend === 'Worsening' && (
              <TrendingUp size={18} className="inline" />
            )}
            {painTrend === 'Stable' && <Minus size={18} className="inline" />}
            {painTrend === 'N/A' && '—'}
          </div>
          <div className="text-[10px] font-medium text-gray-500 uppercase">
            Pain Trend
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Session Progress</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="w-full bg-white/50 rounded-full h-2.5 border border-teal-200">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              percentage >= 100
                ? 'bg-green-500'
                : percentage >= 50
                  ? 'bg-teal-500'
                  : 'bg-cyan-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-500 text-right">
          {plan.sessions_completed} / {plan.total_sessions_planned} sessions
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Pain Trend Chart (inline, larger for timeline header)
// =============================================================================

function TimelinePainChart({ assessmentId }: { assessmentId: string }) {
  const { data: trend, isLoading } = usePatientPainTrend(assessmentId);

  if (isLoading || !trend || trend.length < 2) return null;

  const maxPain = 10;
  const width = 420;
  const height = 140;
  const padding = { top: 12, right: 16, bottom: 28, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = chartW / (trend.length - 1);
  const toY = (v: number | null) =>
    v != null ? padding.top + chartH - (v / maxPain) * chartH : null;

  const beforeLine = trend
    .map((p, i) => {
      const y = toY(p.pain_before ?? null);
      return y != null
        ? `${i === 0 ? 'M' : 'L'}${padding.left + i * xStep},${y}`
        : '';
    })
    .filter(Boolean)
    .join(' ');

  const afterLine = trend
    .map((p, i) => {
      const y = toY(p.pain_after ?? null);
      return y != null
        ? `${i === 0 ? 'M' : 'L'}${padding.left + i * xStep},${y}`
        : '';
    })
    .filter(Boolean)
    .join(' ');

  // Calculate overall trend
  const firstBefore = trend.find((t) => t.pain_before != null)?.pain_before;
  const lastAfter = [...trend]
    .reverse()
    .find((t) => t.pain_after != null)?.pain_after;
  const overallChange =
    firstBefore != null && lastAfter != null ? firstBefore - lastAfter : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Heart size={12} className="text-red-400" />
          Pain Score Trend (NRS 0-10)
        </span>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-400 inline-block rounded" />{' '}
            Before Treatment
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500 inline-block rounded" />{' '}
            After Treatment
          </span>
        </div>
      </div>
      {/* Overall trend summary */}
      {overallChange != null && (
        <div
          className={`text-xs mb-2 px-2 py-1 rounded inline-flex items-center gap-1 ${
            overallChange > 0
              ? 'bg-green-50 text-green-700'
              : overallChange < 0
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-50 text-gray-600'
          }`}
        >
          {overallChange > 0 ? (
            <TrendingDown size={11} />
          ) : overallChange < 0 ? (
            <TrendingUp size={11} />
          ) : (
            <Minus size={11} />
          )}
          {overallChange > 0
            ? `${overallChange} point overall improvement across ${trend.length} sessions`
            : overallChange < 0
              ? `${Math.abs(overallChange)} point increase across ${trend.length} sessions`
              : `No overall change across ${trend.length} sessions`}
        </div>
      )}
      <svg
        width={width}
        height={height}
        className="w-full"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Pain severity zones */}
        <rect
          x={padding.left}
          y={toY(10)!}
          width={chartW}
          height={toY(7)! - toY(10)!}
          fill="#fef2f2"
          opacity={0.5}
        />
        <rect
          x={padding.left}
          y={toY(7)!}
          width={chartW}
          height={toY(4)! - toY(7)!}
          fill="#fefce8"
          opacity={0.5}
        />
        <rect
          x={padding.left}
          y={toY(4)!}
          width={chartW}
          height={toY(0)! - toY(4)!}
          fill="#f0fdf4"
          opacity={0.5}
        />

        {/* Zone labels on right side */}
        <text
          x={width - padding.right + 2}
          y={toY(8.5)!}
          fontSize={7}
          fill="#dc2626"
          textAnchor="start"
          fontWeight="500"
        >
          Severe
        </text>
        <text
          x={width - padding.right + 2}
          y={toY(5.5)!}
          fontSize={7}
          fill="#ca8a04"
          textAnchor="start"
          fontWeight="500"
        >
          Moderate
        </text>
        <text
          x={width - padding.right + 2}
          y={toY(2)!}
          fontSize={7}
          fill="#16a34a"
          textAnchor="start"
          fontWeight="500"
        >
          Mild
        </text>

        {/* Grid */}
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={toY(v)!}
              y2={toY(v)!}
              stroke="#e5e7eb"
              strokeWidth={0.5}
              strokeDasharray={v === 0 || v === 10 ? undefined : '2,2'}
            />
            <text
              x={padding.left - 6}
              y={toY(v)! + 3}
              fontSize={8}
              fill="#6b7280"
              textAnchor="end"
              fontWeight="500"
            >
              {v}
            </text>
          </g>
        ))}
        {/* Session labels */}
        {trend.map((p, i) => (
          <text
            key={i}
            x={padding.left + i * xStep}
            y={height - 6}
            fontSize={8}
            fill="#6b7280"
            textAnchor="middle"
            fontWeight="500"
          >
            S{p.session_number}
          </text>
        ))}
        {/* Before line */}
        {beforeLine && (
          <path
            d={beforeLine}
            fill="none"
            stroke="#f87171"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* After line */}
        {afterLine && (
          <path
            d={afterLine}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Dots with tooltips */}
        {trend.map((p, i) => {
          const yB = toY(p.pain_before ?? null);
          const yA = toY(p.pain_after ?? null);
          const painDescB =
            p.pain_before != null
              ? PAIN_LEVEL_DESCRIPTIONS[String(p.pain_before)]
              : null;
          const painDescA =
            p.pain_after != null
              ? PAIN_LEVEL_DESCRIPTIONS[String(p.pain_after)]
              : null;
          return (
            <g key={i}>
              {yB != null && (
                <>
                  <circle
                    cx={padding.left + i * xStep}
                    cy={yB}
                    r={4}
                    fill="#f87171"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <title>
                    Session {p.session_number} Before: {p.pain_before}/10 (
                    {painDescB?.label || ''})
                  </title>
                </>
              )}
              {yA != null && (
                <>
                  <circle
                    cx={padding.left + i * xStep}
                    cy={yA}
                    r={4}
                    fill="#22c55e"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <title>
                    Session {p.session_number} After: {p.pain_after}/10 (
                    {painDescA?.label || ''})
                  </title>
                </>
              )}
              {/* Pain reduction arrow between dots */}
              {yB != null &&
                yA != null &&
                p.pain_before != null &&
                p.pain_after != null &&
                p.pain_before !== p.pain_after && (
                  <line
                    x1={padding.left + i * xStep + 5}
                    y1={yB}
                    x2={padding.left + i * xStep + 5}
                    y2={yA}
                    stroke={
                      p.pain_after < p.pain_before ? '#22c55e' : '#ef4444'
                    }
                    strokeWidth={1}
                    strokeDasharray="2,1"
                    opacity={0.5}
                  />
                )}
            </g>
          );
        })}
      </svg>
      {/* Bottom session-by-session summary */}
      <div className="flex flex-wrap gap-2 mt-2">
        {trend.map((p) => {
          const diff =
            p.pain_before != null && p.pain_after != null
              ? p.pain_before - p.pain_after
              : null;
          return (
            <div
              key={p.session_number}
              className="text-[9px] flex items-center gap-1 text-gray-500"
            >
              <span className="font-semibold">S{p.session_number}:</span>
              {p.pain_before != null && (
                <span className="text-red-500">{p.pain_before}</span>
              )}
              {p.pain_before != null && p.pain_after != null && <span>→</span>}
              {p.pain_after != null && (
                <span className="text-green-600">{p.pain_after}</span>
              )}
              {diff != null && diff !== 0 && (
                <span className={diff > 0 ? 'text-green-600' : 'text-red-500'}>
                  ({diff > 0 ? `↓${diff}` : `↑${Math.abs(diff)}`})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Timeline Entry Cards
// =============================================================================

function AssessmentEntry({ entry }: { entry: PhysioTimelineEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-100 text-indigo-700">
                Initial Assessment
              </span>
            </div>
            <h4 className="text-sm font-bold text-gray-900">{entry.title}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatTimelineDate(entry.date)}
              </span>
              {entry.staff_name && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {entry.staff_name}
                </span>
              )}
            </div>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Collapsed preview */}
        {!expanded && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {entry.physio_diagnosis && (
              <span className="text-xs text-gray-600">
                <strong>Dx:</strong> {entry.physio_diagnosis}
              </span>
            )}
            {entry.pain_before != null && (
              <span className="text-xs text-gray-600">
                <strong>Pain:</strong> {entry.pain_before}/10
              </span>
            )}
            {entry.prognosis && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                  entry.prognosis === 'Good' || entry.prognosis === 'Excellent'
                    ? 'bg-green-50 text-green-700'
                    : entry.prognosis === 'Fair'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-700'
                }`}
              >
                Prognosis: {entry.prognosis}
              </span>
            )}
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-indigo-100 pt-3">
            {entry.chief_complaint && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-indigo-600">
                  Chief Complaint
                </span>
                <p className="text-sm text-gray-700 mt-0.5">
                  {entry.chief_complaint}
                </p>
              </div>
            )}
            {entry.referral_diagnosis && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-indigo-600">
                  Referral Diagnosis
                </span>
                <p className="text-sm text-gray-700 mt-0.5">
                  {entry.referral_diagnosis}
                </p>
              </div>
            )}
            {entry.physio_diagnosis && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-indigo-600">
                  Physiotherapy Diagnosis
                </span>
                <p className="text-sm text-gray-700 mt-0.5">
                  {entry.physio_diagnosis}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {entry.short_term_goals && (
                <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                  <span className="text-[10px] font-semibold uppercase text-green-700">
                    Short-term Goals
                  </span>
                  <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">
                    {entry.short_term_goals}
                  </p>
                </div>
              )}
              {entry.long_term_goals && (
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <span className="text-[10px] font-semibold uppercase text-blue-700">
                    Long-term Goals
                  </span>
                  <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">
                    {entry.long_term_goals}
                  </p>
                </div>
              )}
            </div>
            {entry.prognosis && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-indigo-600">
                  Prognosis
                </span>
                <p className="text-sm text-gray-700 mt-0.5">
                  {entry.prognosis}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionEntry({
  entry,
  onRecordPending,
  lockReason,
}: {
  entry: PhysioTimelineEntry;
  onRecordPending?: () => void;
  lockReason?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = entry.attendance_status === 'Attended';
  const isMissed = entry.attendance_status === 'Missed';
  const isCancelled = entry.attendance_status === 'Cancelled';
  const isPending = !isCompleted && !isMissed && !isCancelled;

  const painInfo = getPainReduction(entry.pain_before, entry.pain_after);

  // Parse modalities for display
  const modalities = entry.modalities_used || [];
  const techniques = entry.manual_techniques_used
    ? entry.manual_techniques_used
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const statusConfig = isCompleted
    ? {
        bg: 'border-green-200',
        badge: 'bg-green-100 text-green-700',
        icon: <CheckCircle size={14} className="text-green-600" />,
        label: 'Completed',
      }
    : isMissed
      ? {
          bg: 'border-red-200',
          badge: 'bg-red-100 text-red-700',
          icon: <XCircle size={14} className="text-red-500" />,
          label: 'Missed',
        }
      : isCancelled
        ? {
            bg: 'border-gray-200',
            badge: 'bg-gray-100 text-gray-600',
            icon: <XCircle size={14} className="text-gray-400" />,
            label: 'Cancelled',
          }
        : {
            bg: 'border-amber-200',
            badge: 'bg-amber-100 text-amber-700',
            icon: <Clock size={14} className="text-amber-500" />,
            label: 'Pending',
          };

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${statusConfig.bg}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Session number badge */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : isMissed
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {entry.session_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">
                  {entry.title}
                </h4>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1 ${statusConfig.badge}`}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                {entry.progress_indicator && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-0.5 ${
                      PROGRESS_LABELS[entry.progress_indicator]?.color ||
                      'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {PROGRESS_LABELS[entry.progress_indicator]?.icon}
                    {PROGRESS_LABELS[entry.progress_indicator]?.label ||
                      entry.progress_indicator.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formatTimelineDate(entry.date)}
                </span>
                {entry.staff_name && (
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {entry.staff_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Collapsed preview — key metrics */}
        {!expanded && isCompleted && (
          <div className="mt-2.5 ml-13 flex items-center gap-3 flex-wrap">
            {entry.pain_before != null && entry.pain_after != null && (
              <span className="text-xs font-medium flex items-center gap-1">
                <Heart size={11} className="text-red-400" />
                Pain: {entry.pain_before} → {entry.pain_after}
                {painInfo && (
                  <span className={`text-[10px] ${painInfo.color}`}>
                    ({painInfo.text})
                  </span>
                )}
              </span>
            )}
            {entry.treatment_provided &&
              entry.treatment_provided !== 'Pending' && (
                <span className="text-xs text-gray-600 truncate max-w-[200px]">
                  {entry.treatment_provided}
                </span>
              )}
            {/* Modality pills */}
            {modalities.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {modalities.slice(0, 3).map((mod) => {
                  const modConfig = MODALITY_ICONS[mod];
                  return (
                    <span
                      key={mod}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium rounded ${
                        modConfig?.color || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {modConfig?.icon || <Zap size={8} />}
                      {mod}
                    </span>
                  );
                })}
                {modalities.length > 3 && (
                  <span className="text-[9px] text-gray-400">
                    +{modalities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expanded SOAP detail */}
        {expanded && isCompleted && (
          <div className="mt-3 ml-13 space-y-3 border-t border-gray-100 pt-3">
            {/* Pain scores */}
            {(entry.pain_before != null || entry.pain_after != null) && (
              <div className="flex items-center gap-4">
                {entry.pain_before != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-gray-500 uppercase">
                      Pain Before:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        entry.pain_before <= 3
                          ? 'bg-green-100 text-green-700'
                          : entry.pain_before <= 6
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {entry.pain_before}/10
                    </span>
                  </div>
                )}
                {entry.pain_after != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-gray-500 uppercase">
                      After:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        entry.pain_after <= 3
                          ? 'bg-green-100 text-green-700'
                          : entry.pain_after <= 6
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {entry.pain_after}/10
                    </span>
                  </div>
                )}
                {painInfo && (
                  <span className={`text-xs font-medium ${painInfo.color}`}>
                    {painInfo.improving ? (
                      <TrendingDown size={12} className="inline mr-0.5" />
                    ) : (
                      <TrendingUp size={12} className="inline mr-0.5" />
                    )}
                    {painInfo.text}
                  </span>
                )}
              </div>
            )}

            {/* Subjective */}
            {(entry.subjective_report || entry.changes_since_last) && (
              <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-blue-200 text-blue-700 text-[10px] flex items-center justify-center font-black">
                    S
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 uppercase">
                    Subjective
                  </span>
                </div>
                {entry.subjective_report && (
                  <p className="text-xs text-gray-700">
                    {entry.subjective_report}
                  </p>
                )}
                {entry.changes_since_last && (
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>Changes since last:</strong>{' '}
                    {entry.changes_since_last}
                  </p>
                )}
              </div>
            )}

            {/* Objective */}
            {(entry.objective_findings ||
              entry.rom_changes ||
              entry.strength_changes ||
              entry.swelling ||
              entry.tenderness ||
              entry.functional_limitations ||
              entry.gait_assessment) && (
              <div className="bg-green-50/50 rounded-lg p-2.5 border border-green-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-green-200 text-green-700 text-[10px] flex items-center justify-center font-black">
                    O
                  </span>
                  <span className="text-[10px] font-bold text-green-700 uppercase">
                    Objective
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  {entry.objective_findings && (
                    <p>{entry.objective_findings}</p>
                  )}
                  {entry.rom_changes && (
                    <p>
                      <strong>ROM:</strong> {entry.rom_changes}
                    </p>
                  )}
                  {entry.strength_changes && (
                    <p>
                      <strong>Strength:</strong> {entry.strength_changes}
                    </p>
                  )}
                  {entry.functional_changes && (
                    <p>
                      <strong>Functional:</strong> {entry.functional_changes}
                    </p>
                  )}
                  {entry.functional_limitations && (
                    <p>
                      <strong>Limitations:</strong>{' '}
                      {entry.functional_limitations}
                    </p>
                  )}
                  {entry.gait_assessment && (
                    <p>
                      <strong>Gait:</strong> {entry.gait_assessment}
                    </p>
                  )}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {entry.swelling && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          SWELLING_LABELS[entry.swelling]?.color ||
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                        title={SWELLING_LABELS[entry.swelling]?.description}
                      >
                        Swelling:{' '}
                        {SWELLING_LABELS[entry.swelling]?.label ||
                          entry.swelling}
                      </span>
                    )}
                    {entry.tenderness && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          TENDERNESS_LABELS[entry.tenderness]?.color ||
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                        title={TENDERNESS_LABELS[entry.tenderness]?.description}
                      >
                        Tenderness:{' '}
                        {TENDERNESS_LABELS[entry.tenderness]?.label ||
                          entry.tenderness}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Treatment */}
            {(entry.treatment_provided ||
              modalities.length > 0 ||
              techniques.length > 0 ||
              entry.exercises_performed) && (
              <div className="bg-purple-50/50 rounded-lg p-2.5 border border-purple-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-purple-200 text-purple-700 text-[10px] flex items-center justify-center font-black">
                    T
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 uppercase">
                    Treatment
                  </span>
                </div>
                {entry.treatment_provided &&
                  entry.treatment_provided !== 'Pending' && (
                    <p className="text-xs text-gray-700 mb-1.5">
                      {entry.treatment_provided}
                    </p>
                  )}
                {/* Modalities */}
                {modalities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {modalities.map((mod) => {
                      const modConfig = MODALITY_ICONS[mod];
                      return (
                        <span
                          key={mod}
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                            modConfig?.color || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {modConfig?.icon || <Zap size={9} />}
                          {mod}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Techniques */}
                {techniques.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {techniques.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-teal-100 text-teal-700 border border-teal-200"
                      >
                        <Dumbbell size={9} />
                        {TECHNIQUE_LABELS[tech] || tech.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
                {entry.exercises_performed && (
                  <p className="text-xs text-gray-600 mt-1">
                    <strong>Exercises:</strong> {entry.exercises_performed}
                  </p>
                )}
              </div>
            )}

            {/* Response + Assessment */}
            {(entry.patient_response ||
              entry.tolerance ||
              entry.adverse_reactions ||
              entry.progress_notes) && (
              <div className="bg-amber-50/50 rounded-lg p-2.5 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-700 text-[10px] flex items-center justify-center font-black">
                    A
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 uppercase">
                    Assessment & Response
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  {entry.patient_response && (
                    <p>
                      <strong>Response:</strong> {entry.patient_response}
                    </p>
                  )}
                  {entry.tolerance && (
                    <p>
                      <strong>Tolerance:</strong>{' '}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          TOLERANCE_LABELS[entry.tolerance]?.color ||
                          'bg-gray-100 text-gray-700'
                        }`}
                        title={TOLERANCE_LABELS[entry.tolerance]?.description}
                      >
                        {TOLERANCE_LABELS[entry.tolerance]?.label ||
                          entry.tolerance}
                      </span>
                    </p>
                  )}
                  {entry.adverse_reactions && (
                    <p className="flex items-center gap-1 text-red-700">
                      <AlertTriangle size={11} />
                      <strong>Adverse:</strong> {entry.adverse_reactions}
                    </p>
                  )}
                  {entry.progress_notes && (
                    <p>
                      <strong>Notes:</strong> {entry.progress_notes}
                    </p>
                  )}
                  {entry.compliance_level && (
                    <p>
                      <strong>Compliance:</strong> {entry.compliance_level}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Plan */}
            {(entry.home_exercise_instructions ||
              entry.plan_for_next_visit) && (
              <div className="bg-cyan-50/50 rounded-lg p-2.5 border border-cyan-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-cyan-200 text-cyan-700 text-[10px] flex items-center justify-center font-black">
                    P
                  </span>
                  <span className="text-[10px] font-bold text-cyan-700 uppercase">
                    Plan
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-700">
                  {entry.home_exercise_instructions && (
                    <p>
                      <strong>Home Exercises:</strong>{' '}
                      {entry.home_exercise_instructions}
                    </p>
                  )}
                  {entry.plan_for_next_visit && (
                    <p>
                      <strong>Next Visit:</strong> {entry.plan_for_next_visit}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Missed/Cancelled - minimal */}
        {expanded && (isMissed || isCancelled) && (
          <div className="mt-3 ml-13 text-xs text-gray-500 border-t border-gray-100 pt-2">
            <p>Session was {isMissed ? 'missed' : 'cancelled'}.</p>
          </div>
        )}

        {/* Pending session - actionable */}
        {expanded && isPending && (
          <div className="mt-3 ml-13 border-t border-amber-100 pt-3">
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    Session Awaiting Completion
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    This session has been scheduled but not yet recorded. Click
                    the button below to open the session recording form and
                    enter the SOAP documentation.
                  </p>
                  {entry.date && (
                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                      <Calendar size={10} />
                      Scheduled for {formatTimelineDate(entry.date)}
                    </p>
                  )}
                </div>
              </div>
              {lockReason ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-100/60 px-3 py-2 text-xs text-amber-800">
                  <Shield size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{lockReason}</span>
                </div>
              ) : (
                onRecordPending && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecordPending();
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                  >
                    <Play size={14} />
                    Record This Session
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressNoteEntry({ entry }: { entry: PhysioTimelineEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                  entry.evaluation_type === 'Discharge'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {entry.evaluation_type === 'Discharge'
                  ? 'Discharge'
                  : 'Re-evaluation'}
              </span>
              {entry.ready_for_discharge && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">
                  Ready for Discharge
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-gray-900">{entry.title}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatTimelineDate(entry.date)}
              </span>
              {entry.staff_name && (
                <span className="flex items-center gap-1 font-medium">
                  <User size={11} />
                  {entry.staff_role && (
                    <span className="text-gray-700 font-semibold">
                      {getStaffTitle(entry.staff_role)}
                    </span>
                  )}
                  <span className={entry.staff_role ? 'text-gray-600' : ''}>
                    {entry.staff_name}
                  </span>
                </span>
              )}
            </div>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {!expanded && entry.progress_summary && (
          <p className="mt-2 text-xs text-gray-600 line-clamp-2">
            {entry.progress_summary}
          </p>
        )}

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-amber-100 pt-3">
            {entry.progress_summary && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-amber-600">
                  Progress Summary
                </span>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">
                  {entry.progress_summary}
                </p>
              </div>
            )}
            {entry.pain_before != null && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-amber-600">
                  Pain Score at Evaluation
                </span>
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                    entry.pain_before <= 3
                      ? 'bg-green-100 text-green-700'
                      : entry.pain_before <= 6
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {entry.pain_before}/10
                </span>
              </div>
            )}
            {(entry.goals_achieved?.length ||
              entry.goals_in_progress?.length) && (
              <div className="grid grid-cols-2 gap-2">
                {entry.goals_achieved && entry.goals_achieved.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                    <span className="text-[10px] font-semibold uppercase text-green-700">
                      Goals Achieved
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {entry.goals_achieved.map((g, i) => (
                        <li
                          key={i}
                          className="text-xs text-gray-700 flex items-start gap-1"
                        >
                          <CheckCircle
                            size={10}
                            className="text-green-500 mt-0.5 flex-shrink-0"
                          />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.goals_in_progress &&
                  entry.goals_in_progress.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                      <span className="text-[10px] font-semibold uppercase text-blue-700">
                        In Progress
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {entry.goals_in_progress.map((g, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-700 flex items-start gap-1"
                          >
                            <Target
                              size={10}
                              className="text-blue-500 mt-0.5 flex-shrink-0"
                            />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
            {entry.plan_modified && entry.modifications_made && (
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                <span className="text-[10px] font-semibold uppercase text-purple-700">
                  Plan Modifications
                </span>
                <p className="text-xs text-gray-700 mt-0.5">
                  {entry.modifications_made}
                </p>
              </div>
            )}
            {entry.continue_therapy != null && (
              <p className="text-xs text-gray-600">
                <strong>Continue Therapy:</strong>{' '}
                <span
                  className={
                    entry.continue_therapy ? 'text-green-700' : 'text-red-700'
                  }
                >
                  {entry.continue_therapy ? 'Yes' : 'No'}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Fullscreen Timeline Modal
// =============================================================================

export default function PhysioSessionTimeline({
  plan,
  isOpen,
  onClose,
  onRecordSession,
}: PhysioSessionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'completed' | 'pending' | 'notes'
  >('all');
  const { data: entries = [], isLoading } = usePhysioPlanTimeline(
    plan.plan_id,
    plan.assessment_id,
  );
  const { data: rawSessions = [] } = usePlanSessions(plan.plan_id);
  const [recordingSession, setRecordingSession] =
    useState<PhysioSessionDTO | null>(null);
  const sessionLockReason = getPhysioPlanSessionLockReason(plan);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (recordingSession) {
          setRecordingSession(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, recordingSession]);

  // Derive counts
  const completedCount = entries.filter(
    (e) => e.type === 'session' && e.attendance_status === 'Attended',
  ).length;
  const totalSessions = entries.filter((e) => e.type === 'session').length;

  // Filter entries
  const filteredEntries = useMemo(() => {
    switch (filter) {
      case 'completed':
        return entries.filter(
          (e) => e.type === 'session' && e.attendance_status === 'Attended',
        );
      case 'pending':
        return entries.filter(
          (e) =>
            e.type === 'session' &&
            e.attendance_status !== 'Attended' &&
            e.attendance_status !== 'Missed' &&
            e.attendance_status !== 'Cancelled',
        );
      case 'notes':
        return entries.filter(
          (e) => e.type === 'assessment' || e.type === 'progress_note',
        );
      default:
        return entries;
    }
  }, [entries, filter]);

  if (!isOpen) return null;

  const percentage =
    plan.total_sessions_planned > 0
      ? Math.min(
          100,
          Math.round(
            (plan.sessions_completed / plan.total_sessions_planned) * 100,
          ),
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container — full viewport like inpatient */}
      <div className="relative w-full max-w-[98vw] h-[96vh] bg-white rounded-xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ── LEFT SIDEBAR ── */}
        <div className="w-64 bg-gradient-to-b from-teal-700 via-teal-800 to-cyan-900 flex flex-col flex-shrink-0">
          {/* Brand header */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Dumbbell size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xs font-bold text-white uppercase tracking-wide">
                  Physiotherapy
                </h1>
                <p className="text-[10px] text-teal-200 font-semibold uppercase tracking-widest mt-0.5">
                  Session Timeline
                </p>
              </div>
            </div>
          </div>

          {/* Patient info */}
          <div className="px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {plan.patient
                    ? `${plan.patient.first_name} ${plan.patient.last_name}`
                    : 'Patient'}
                </p>
                {plan.patient?.emr_number && (
                  <p className="text-[10px] text-teal-200">
                    {plan.patient.emr_number}
                  </p>
                )}
              </div>
            </div>
            {plan.prescribing_doctor && (
              <p className="text-[10px] text-teal-300 mt-1">
                Ordered by: {plan.prescribing_doctor.title || 'Dr.'}{' '}
                {plan.prescribing_doctor.first_name}{' '}
                {plan.prescribing_doctor.last_name}
              </p>
            )}
            {plan.treatment_approach && (
              <p className="text-[10px] text-teal-200 mt-1 italic">
                {plan.treatment_approach}
              </p>
            )}
          </div>

          {/* Progress ring */}
          <div className="px-5 py-5 flex flex-col items-center border-b border-white/10">
            <div className="relative w-24 h-24 mb-3">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${percentage}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">
                  {percentage}%
                </span>
                <span className="text-[8px] text-teal-200 uppercase font-semibold">
                  Complete
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-white">
                  {plan.sessions_completed}
                </div>
                <div className="text-[8px] text-teal-200 uppercase">Done</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-white">
                  {Math.max(
                    0,
                    plan.total_sessions_planned - plan.sessions_completed,
                  )}
                </div>
                <div className="text-[8px] text-teal-200 uppercase">Left</div>
              </div>
            </div>
          </div>

          {/* Filter navigation */}
          <div className="px-3 py-3 flex-1">
            <p className="text-[9px] text-teal-300 uppercase font-bold tracking-widest mb-2 px-2">
              Filter View
            </p>
            {[
              {
                key: 'all' as const,
                label: 'All Entries',
                icon: <Activity size={14} />,
                count: entries.length,
              },
              {
                key: 'completed' as const,
                label: 'Completed',
                icon: <CheckCircle size={14} />,
                count: completedCount,
              },
              {
                key: 'pending' as const,
                label: 'Pending',
                icon: <Clock size={14} />,
                count: entries.filter(
                  (e) =>
                    e.type === 'session' &&
                    e.attendance_status !== 'Attended' &&
                    e.attendance_status !== 'Missed' &&
                    e.attendance_status !== 'Cancelled',
                ).length,
              },
              {
                key: 'notes' as const,
                label: 'Assessments & Notes',
                icon: <FileText size={14} />,
                count: entries.filter((e) => e.type !== 'session').length,
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all mb-1 group ${
                  filter === item.key
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-teal-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium flex-1 text-left">
                  {item.label}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    filter === item.key ? 'bg-white/20' : 'bg-white/10'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {/* Plan info at bottom */}
          <div className="px-5 py-3 border-t border-white/10 space-y-1">
            {plan.frequency && (
              <p className="text-[10px] text-teal-300">
                <strong>Frequency:</strong> {plan.frequency}
              </p>
            )}
            {plan.start_date && (
              <p className="text-[10px] text-teal-300">
                <strong>Started:</strong> {formatTimelineDate(plan.start_date)}
              </p>
            )}
            {plan.is_nhis_plan && (
              <div className="flex items-center gap-1 mt-1">
                <Shield size={10} className="text-teal-300" />
                <span className="text-[10px] text-teal-300 font-medium">
                  NHIS Plan (max 6 sessions)
                </span>
              </div>
            )}
            {plan.payment_status && (
              <span
                className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase mt-1 ${
                  plan.payment_status === 'paid' ||
                  plan.payment_status === 'waived'
                    ? 'bg-green-500/20 text-green-200'
                    : plan.payment_status === 'awaiting_payment'
                      ? 'bg-amber-500/20 text-amber-200'
                      : 'bg-red-500/20 text-red-200'
                }`}
              >
                {plan.payment_status === 'paid'
                  ? 'Paid'
                  : plan.payment_status === 'waived'
                    ? 'Waived'
                    : plan.payment_status === 'awaiting_payment'
                      ? 'Awaiting Payment'
                      : 'Unbilled'}
              </span>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity size={20} className="text-teal-600" />
                Rehabilitation Timeline
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {plan.patient?.first_name} {plan.patient?.last_name}
                {plan.treatment_approach ? ` — ${plan.treatment_approach}` : ''}
                {' · '}
                {plan.sessions_completed} of {plan.total_sessions_planned}{' '}
                sessions completed
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
              {/* Progress Summary */}
              <ProgressSummaryHeader plan={plan} entries={entries} />

              {sessionLockReason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Sessions Locked</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {sessionLockReason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pain Trend Chart */}
              {plan.assessment_id && (
                <TimelinePainChart assessmentId={plan.assessment_id} />
              )}

              {/* Timeline entries */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  Loading timeline...
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Dumbbell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium">
                    No entries match the selected filter.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-300 via-cyan-200 to-blue-200" />

                  <div className="space-y-4">
                    {filteredEntries.map((entry) => (
                      <div key={entry.id} className="relative pl-16">
                        {/* Timeline node */}
                        <div
                          className={`absolute left-0 top-4 w-12 h-12 rounded-xl border-2 flex items-center justify-center z-10 shadow-sm bg-white transition-transform hover:scale-110 duration-300 ${
                            entry.type === 'assessment'
                              ? 'border-indigo-300'
                              : entry.type === 'progress_note'
                                ? 'border-amber-300'
                                : entry.attendance_status === 'Attended'
                                  ? 'border-green-300'
                                  : entry.attendance_status === 'Missed'
                                    ? 'border-red-300'
                                    : 'border-gray-300'
                          }`}
                        >
                          {entry.type === 'assessment' && (
                            <Stethoscope
                              size={18}
                              className="text-indigo-600"
                            />
                          )}
                          {entry.type === 'progress_note' && (
                            <FileText size={18} className="text-amber-600" />
                          )}
                          {entry.type === 'session' &&
                            entry.attendance_status === 'Attended' && (
                              <span className="text-sm font-bold text-green-700">
                                {entry.session_number}
                              </span>
                            )}
                          {entry.type === 'session' &&
                            entry.attendance_status === 'Missed' && (
                              <XCircle size={18} className="text-red-500" />
                            )}
                          {entry.type === 'session' &&
                            entry.attendance_status !== 'Attended' &&
                            entry.attendance_status !== 'Missed' &&
                            entry.attendance_status !== 'Cancelled' && (
                              <Clock size={18} className="text-gray-400" />
                            )}
                          {entry.type === 'session' &&
                            entry.attendance_status === 'Cancelled' && (
                              <XCircle size={18} className="text-gray-400" />
                            )}
                        </div>

                        {/* Entry card */}
                        {entry.type === 'assessment' && (
                          <AssessmentEntry entry={entry} />
                        )}
                        {entry.type === 'session' && (
                          <SessionEntry
                            entry={entry}
                            lockReason={
                              entry.attendance_status !== 'Attended' &&
                              entry.attendance_status !== 'Missed' &&
                              entry.attendance_status !== 'Cancelled'
                                ? sessionLockReason
                                : null
                            }
                            onRecordPending={
                              entry.attendance_status !== 'Attended' &&
                              entry.attendance_status !== 'Missed' &&
                              entry.attendance_status !== 'Cancelled' &&
                              !sessionLockReason
                                ? () => {
                                    const session = rawSessions.find(
                                      (s) => s.session_id === entry.id,
                                    );
                                    if (session) {
                                      setRecordingSession(session);
                                    }
                                  }
                                : undefined
                            }
                          />
                        )}
                        {entry.type === 'progress_note' && (
                          <ProgressNoteEntry entry={entry} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Recording Modal - opens on top of timeline */}
      {recordingSession && (
        <PhysioSessionRecordModal
          session={recordingSession}
          plan={plan}
          planPaymentStatus={plan.payment_status}
          onClose={() => {
            setRecordingSession(null);
          }}
        />
      )}
    </div>
  );
}
