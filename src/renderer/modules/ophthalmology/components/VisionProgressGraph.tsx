import React from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EyeExamDTO } from '../types/ophthalmology.types';

interface VisionProgressGraphProps {
  exams: EyeExamDTO[];
}

// Snellen string → decimal (6/6=1.0, 6/12=0.5, 6/60=0.1, etc.)
function parseVA(va?: string | null): number | null {
  if (!va) return null;
  const m = va.match(/(?:6|20)\/(\d+)/i);
  if (!m) return null;
  const den = parseInt(m[1], 10);
  if (isNaN(den) || den === 0) return null;
  return parseFloat((6 / den).toFixed(3));
}

// Decimal back to Snellen label for axis
function decToSnellen(v: number): string {
  if (v >= 1) return '6/6';
  if (v >= 0.66) return '6/9';
  if (v >= 0.5) return '6/12';
  if (v >= 0.33) return '6/18';
  if (v >= 0.25) return '6/24';
  if (v >= 0.16) return '6/36';
  if (v >= 0.1) return '6/60';
  return '';
}

export default function VisionProgressGraph({
  exams,
}: VisionProgressGraphProps) {
  const dataPoints = [...exams]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .map((exam) => ({
      label: format(new Date(exam.created_at), 'dd MMM yy'),
      od: parseVA(exam.va_right_unaided || exam.va_right_aided),
      os: parseVA(exam.va_left_unaided || exam.va_left_aided),
      rawOD: exam.va_right_unaided || exam.va_right_aided || '',
      rawOS: exam.va_left_unaided || exam.va_left_aided || '',
    }))
    .filter((d) => d.od !== null || d.os !== null);

  if (dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-50 text-slate-500 text-sm rounded-lg border border-slate-200">
        No visits with visual acuity data recorded yet.
      </div>
    );
  }

  // Trend analysis (only meaningful with 2+ points)
  const hasTrend = dataPoints.length >= 2;
  const firstOD = dataPoints[0].od;
  const lastOD = dataPoints[dataPoints.length - 1].od;
  const firstOS = dataPoints[0].os;
  const lastOS = dataPoints[dataPoints.length - 1].os;
  const odImproving =
    hasTrend && firstOD != null && lastOD != null && lastOD > firstOD;
  const osImproving =
    hasTrend && firstOS != null && lastOS != null && lastOS > firstOS;

  // SVG chart dimensions
  const width = 480;
  const height = 160;
  const pad = { top: 12, right: 20, bottom: 24, left: 36 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxVal = 1.2;
  const xStep =
    dataPoints.length > 1 ? chartW / (dataPoints.length - 1) : chartW;
  const toY = (v: number | null) =>
    v != null ? pad.top + chartH - (v / maxVal) * chartH : null;
  const toX = (i: number) => pad.left + i * xStep;

  const buildPath = (key: 'od' | 'os') => {
    return dataPoints
      .map((p, i) => {
        const y = toY(p[key]);
        return y != null ? `${i === 0 ? 'M' : 'L'}${toX(i)},${y}` : '';
      })
      .filter(Boolean)
      .join(' ');
  };

  const odPath = buildPath('od');
  const osPath = buildPath('os');

  const gridLines = [0.1, 0.25, 0.5, 0.66, 1.0];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Visual Acuity Progress
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> OD
            (Right)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />{' '}
            OS (Left)
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {gridLines.map((v) => {
          const y = toY(v)!;
          return (
            <g key={v}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
              <text
                x={pad.left - 4}
                y={y + 3}
                fontSize={8}
                fill="#9ca3af"
                textAnchor="end"
              >
                {decToSnellen(v)}
              </text>
            </g>
          );
        })}

        {/* Session labels */}
        {dataPoints.map((p, i) => (
          <text
            key={i}
            x={toX(i)}
            y={height - 4}
            fontSize={7}
            fill="#9ca3af"
            textAnchor="middle"
          >
            {p.label}
          </text>
        ))}

        {/* OD line */}
        {odPath && (
          <path
            d={odPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* OS line */}
        {osPath && (
          <path
            d={osPath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots with value labels */}
        {dataPoints.map((p, i) => {
          const yOD = toY(p.od);
          const yOS = toY(p.os);
          return (
            <g key={i}>
              {yOD != null && (
                <>
                  <circle cx={toX(i)} cy={yOD} r={3} fill="#3b82f6" />
                  <text
                    x={toX(i)}
                    y={yOD - 6}
                    fontSize={7}
                    fill="#3b82f6"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {p.rawOD}
                  </text>
                </>
              )}
              {yOS != null && (
                <>
                  <circle cx={toX(i)} cy={yOS} r={3} fill="#10b981" />
                  <text
                    x={toX(i)}
                    y={yOS + 12}
                    fontSize={7}
                    fill="#10b981"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {p.rawOS}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Trend indicators */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 text-[11px]">
        {hasTrend ? (
          <>
            <span className="flex items-center gap-1 text-blue-700">
              OD:
              {firstOD != null && lastOD != null ? (
                odImproving ? (
                  <>
                    <TrendingUp size={12} className="text-green-600" />{' '}
                    Improving
                  </>
                ) : lastOD < firstOD ? (
                  <>
                    <TrendingDown size={12} className="text-red-500" />{' '}
                    Declining
                  </>
                ) : (
                  <>
                    <Minus size={12} /> Stable
                  </>
                )
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              OS:
              {firstOS != null && lastOS != null ? (
                osImproving ? (
                  <>
                    <TrendingUp size={12} className="text-green-600" />{' '}
                    Improving
                  </>
                ) : lastOS < firstOS ? (
                  <>
                    <TrendingDown size={12} className="text-red-500" />{' '}
                    Declining
                  </>
                ) : (
                  <>
                    <Minus size={12} /> Stable
                  </>
                )
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </span>
          </>
        ) : (
          <span className="text-slate-400">
            Baseline recorded — trend available after next visit
          </span>
        )}
      </div>
    </div>
  );
}
