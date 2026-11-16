export type ObservabilityLevel = 'info' | 'warn' | 'error';

export interface ObservabilityFields {
  module: string;
  action: string;
  step?: string;
  duration_ms: number;
  level_override?: ObservabilityLevel;
  trace_id?: string;
  patient_id?: string;
  encounter_id?: string;
  payload_bytes?: number;
  [key: string]: unknown;
}

interface SummaryFields {
  module: string;
  action: string;
  total_duration_ms: number;
  trace_id?: string;
  patient_id?: string;
  encounter_id?: string;
  payload_bytes?: number;
  [key: string]: unknown;
}

export const SLOW_WARN_THRESHOLD_MS = 500;
export const SLOW_ERROR_THRESHOLD_MS = 2000;
const REPEATED_LOG_SUPPRESSION_WINDOW_MS = Number(
  process.env.OBS_REPEAT_SUPPRESS_MS || 10000,
);
const REPEATED_LOG_MAX_CACHE_SIZE = 2000;

interface RepeatedLogState {
  lastEmittedAt: number;
  suppressedCount: number;
}

const repeatedLogState = new Map<string, RepeatedLogState>();

function getLevel(durationMs: number): ObservabilityLevel {
  if (durationMs >= SLOW_ERROR_THRESHOLD_MS) return 'error';
  if (durationMs >= SLOW_WARN_THRESHOLD_MS) return 'warn';
  return 'info';
}

function toRepeatedLogKey(
  level: ObservabilityLevel,
  payload: Record<string, unknown>,
): string {
  return [
    level,
    String(payload.module || ''),
    String(payload.action || ''),
    String(payload.step || ''),
    String(payload.endpoint || ''),
    String(payload.method || ''),
    String(payload.status || ''),
  ].join('|');
}

function pruneRepeatedLogState(now: number): void {
  if (repeatedLogState.size <= REPEATED_LOG_MAX_CACHE_SIZE) return;

  const staleAfterMs = REPEATED_LOG_SUPPRESSION_WINDOW_MS * 3;
  repeatedLogState.forEach((state, key) => {
    if (now - state.lastEmittedAt > staleAfterMs) {
      repeatedLogState.delete(key);
    }
  });
}

function shouldSuppressRepeatedLog(
  level: ObservabilityLevel,
  payload: Record<string, unknown>,
): { suppress: boolean; suppressedCount?: number } {
  if (REPEATED_LOG_SUPPRESSION_WINDOW_MS <= 0) {
    return { suppress: false };
  }

  if (level === 'info') {
    return { suppress: false };
  }

  const now = Date.now();
  pruneRepeatedLogState(now);
  const key = toRepeatedLogKey(level, payload);
  const existing = repeatedLogState.get(key);

  if (
    existing &&
    now - existing.lastEmittedAt < REPEATED_LOG_SUPPRESSION_WINDOW_MS
  ) {
    existing.suppressedCount += 1;
    repeatedLogState.set(key, existing);
    return { suppress: true };
  }

  const suppressedCount = existing?.suppressedCount;
  repeatedLogState.set(key, {
    lastEmittedAt: now,
    suppressedCount: 0,
  });

  return { suppress: false, suppressedCount };
}

function toConsoleFieldString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value == null) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatPayloadForConsole(payload: Record<string, unknown>): string {
  const primary = [
    payload.ts ? String(payload.ts) : null,
    payload.level ? `[${String(payload.level).toUpperCase()}]` : null,
    payload.module ? `[${String(payload.module)}]` : null,
    payload.action ? String(payload.action) : null,
    payload.step ? `step=${String(payload.step)}` : null,
    typeof payload.duration_ms === 'number'
      ? `duration_ms=${payload.duration_ms}`
      : null,
    typeof payload.total_duration_ms === 'number'
      ? `total_duration_ms=${payload.total_duration_ms}`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  const extras = Object.entries(payload)
    .filter(
      ([key]) =>
        ![
          'ts',
          'level',
          'module',
          'action',
          'step',
          'duration_ms',
          'total_duration_ms',
        ].includes(key),
    )
    .map(([key, value]) => {
      const rendered = toConsoleFieldString(value);
      return rendered ? `${key}=${rendered}` : null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(' ');

  return extras ? `${primary} ${extras}`.trim() : primary;
}

function emit(
  level: ObservabilityLevel,
  payload: Record<string, unknown>,
): void {
  const suppression = shouldSuppressRepeatedLog(level, payload);
  if (suppression.suppress) {
    return;
  }

  const emittedPayload =
    suppression.suppressedCount && suppression.suppressedCount > 0
      ? { ...payload, suppressed_count: suppression.suppressedCount }
      : payload;
  const formatted = formatPayloadForConsole(emittedPayload);

  if (level === 'error') {
    console.error(formatted);
    return;
  }

  if (level === 'warn') {
    console.warn(formatted);
    return;
  }

  console.info(formatted);
}

export function createTraceId(moduleName: string, action: string): string {
  const base = `${moduleName}-${action}`
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 40);
  const random = Math.random().toString(36).slice(2, 8);
  return `${base}-${Date.now()}-${random}`;
}

export function toMetricKey(step: string): string {
  const normalized = step
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${normalized || 'step'}_ms`;
}

export function estimatePayloadBytes(payload: unknown): number | undefined {
  if (payload == null) return 0;

  try {
    const json = JSON.stringify(payload);
    return new TextEncoder().encode(json).length;
  } catch {
    return undefined;
  }
}

export function logOperationDuration(fields: ObservabilityFields): void {
  const level = fields.level_override || getLevel(fields.duration_ms);
  const { level_override: _levelOverride, ...rest } = fields;
  emit(level, {
    ts: new Date().toISOString(),
    level,
    ...rest,
  });
}

export function logOperationSummary(fields: SummaryFields): void {
  const level = getLevel(fields.total_duration_ms);
  emit(level, {
    ts: new Date().toISOString(),
    level,
    ...fields,
  });
}
