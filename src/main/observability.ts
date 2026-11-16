export type ObservabilityLevel = 'info' | 'warn' | 'error';

export interface ObservabilityFields {
  module: string;
  action: string;
  step?: string;
  duration_ms: number;
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

  if (level === 'error') {
    console.error(emittedPayload);
    return;
  }

  if (level === 'warn') {
    console.warn(emittedPayload);
    return;
  }

  console.info(emittedPayload);
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
    return Buffer.byteLength(json, 'utf8');
  } catch {
    return undefined;
  }
}

export function logOperationDuration(fields: ObservabilityFields): void {
  const level = getLevel(fields.duration_ms);
  emit(level, {
    ts: new Date().toISOString(),
    level,
    ...fields,
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
