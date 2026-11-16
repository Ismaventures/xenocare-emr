/**
 * useAITrends — React hook for detecting trends in patient data.
 *
 * Works on STRUCTURED data (vitals, labs) — queried via SQL, not embeddings.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../api/supabaseClient';
import type { TrendInsight } from '../types/ai.types';

interface TrendOptions {
  patientId: string;
  enabled?: boolean;
  dayRange?: number;
}

/**
 * Fetch and analyse trends for a patient's vitals over a time range.
 */
export function useAITrends({
  patientId,
  enabled = true,
  dayRange = 30,
}: TrendOptions) {
  return useQuery<TrendInsight[], Error>({
    queryKey: ['ai', 'trends', patientId, dayRange],
    queryFn: () => fetchTrends(patientId, dayRange),
    enabled: enabled && !!patientId,
    staleTime: 120_000, // 2 minutes
  });
}

async function fetchTrends(
  patientId: string,
  dayRange: number,
): Promise<TrendInsight[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dayRange);

  // Fetch vitals
  const { data: vitals, error } = await supabase
    .from('vitals')
    .select(
      'date_recorded, blood_pressure_systolic, blood_pressure_diastolic, pulse, temperature, respiratory_rate, oxygen_saturation, weight',
    )
    .eq('patient_id', patientId)
    .gte('date_recorded', cutoff.toISOString())
    .order('date_recorded', { ascending: true });

  if (error) throw new Error(`Vitals fetch: ${error.message}`);
  if (!vitals || vitals.length < 2) return [];

  const insights: TrendInsight[] = [];

  // Analyse each vital parameter
  analyseTrendField(
    vitals,
    'blood_pressure_systolic',
    'Systolic BP',
    'mmHg',
    90,
    140,
    insights,
  );
  analyseTrendField(
    vitals,
    'blood_pressure_diastolic',
    'Diastolic BP',
    'mmHg',
    60,
    90,
    insights,
  );
  analyseTrendField(vitals, 'pulse', 'Pulse Rate', 'bpm', 60, 100, insights);
  analyseTrendField(
    vitals,
    'temperature',
    'Temperature',
    '°C',
    36.1,
    37.5,
    insights,
  );
  analyseTrendField(
    vitals,
    'respiratory_rate',
    'Respiratory Rate',
    '/min',
    12,
    20,
    insights,
  );
  analyseTrendField(
    vitals,
    'oxygen_saturation',
    'SpO2',
    '%',
    95,
    100,
    insights,
  );

  return insights;
}

function analyseTrendField(
  records: Record<string, unknown>[],
  field: string,
  label: string,
  unit: string,
  normalLow: number,
  normalHigh: number,
  insights: TrendInsight[],
) {
  const values = records
    .map((r) => ({ value: Number(r[field]), date: String(r.date_recorded) }))
    .filter((v) => !isNaN(v.value) && v.value > 0);

  if (values.length < 2) return;

  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const avg = values.reduce((sum, v) => sum + v.value, 0) / values.length;
  const min = Math.min(...values.map((v) => v.value));
  const max = Math.max(...values.map((v) => v.value));

  // Determine direction
  let direction: TrendInsight['direction'] = 'stable';
  const delta = latest.value - previous.value;
  const deltaPercent = Math.abs(delta / previous.value) * 100;

  if (deltaPercent > 5) {
    direction = delta > 0 ? 'rising' : 'falling';
  }

  // Determine severity
  let severity: TrendInsight['severity'] = 'normal';
  if (latest.value < normalLow || latest.value > normalHigh) {
    severity = 'warning';
    if (latest.value < normalLow * 0.85 || latest.value > normalHigh * 1.15) {
      severity = 'critical';
    }
  }

  insights.push({
    parameter: label,
    direction,
    currentValue: latest.value,
    previousValue: previous.value,
    unit,
    percentChange: Math.round(deltaPercent * 10) / 10,
    dataPoints: values.length,
    dateRange: { from: values[0].date, to: latest.date },
    severity,
    normalRange: { low: normalLow, high: normalHigh },
    summary: buildTrendSummary(
      label,
      latest.value,
      direction,
      severity,
      unit,
      avg,
      min,
      max,
    ),
  });
}

function buildTrendSummary(
  label: string,
  current: number,
  direction: string,
  severity: string,
  unit: string,
  avg: number,
  min: number,
  max: number,
): string {
  const dirText =
    direction === 'stable'
      ? 'stable'
      : direction === 'rising'
        ? 'trending upward'
        : 'trending downward';
  const sevText =
    severity === 'critical'
      ? '⚠️ CRITICAL: '
      : severity === 'warning'
        ? '⚡ Warning: '
        : '';
  return `${sevText}${label} is ${dirText} at ${current} ${unit} (avg: ${Math.round(avg * 10) / 10}, range: ${min}–${max}).`;
}
