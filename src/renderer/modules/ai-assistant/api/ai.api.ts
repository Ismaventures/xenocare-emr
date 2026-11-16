/**
 * AI API — Renderer-side IPC wrapper
 *
 * All calls route through Electron IPC to the main process aiService handlers.
 */
import type {
  AIQueryRequest,
  AIResponse,
  NoteDraftRequest,
  NoteDraftResponse,
} from '../types/ai.types';
import {
  createTraceId,
  estimatePayloadBytes,
  logOperationDuration,
} from '../../../utils/observability';

// =============================================================================
// Helpers
// =============================================================================

function getElectron() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electron;
}

interface IPCResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

type AIMethod =
  | 'query'
  | 'search'
  | 'draftNote'
  | 'reviewConsultation'
  | 'embedPatient'
  | 'health'
  | 'config';

function extractEntityContext(arg?: unknown): {
  patientId?: string;
  encounterId?: string;
} {
  if (!arg || typeof arg !== 'object') return {};
  const payload = arg as Record<string, unknown>;
  const patientIdRaw = payload.patientId ?? payload.patient_id;
  const encounterIdRaw = payload.encounterId ?? payload.encounter_id;
  return {
    patientId: typeof patientIdRaw === 'string' ? patientIdRaw : undefined,
    encounterId:
      typeof encounterIdRaw === 'string' ? encounterIdRaw : undefined,
  };
}

async function invokeAI<T>(method: AIMethod, arg?: unknown): Promise<T> {
  const startedAt = performance.now();
  const traceId = createTraceId('AIAPI', method);
  const entityContext = extractEntityContext(arg);
  const electron = getElectron();
  if (!electron?.ai) {
    logOperationDuration({
      module: 'AIAPI',
      action: method,
      step: 'ipc_invoke',
      duration_ms: performance.now() - startedAt,
      trace_id: traceId,
      patient_id: entityContext.patientId,
      encounter_id: entityContext.encounterId,
      payload_bytes: estimatePayloadBytes(arg),
      error: 'Electron IPC not available',
    });
    throw new Error(
      'Electron IPC not available — are you running inside Electron?',
    );
  }

  let result: IPCResult<T>;

  switch (method) {
    case 'query':
      result = await electron.ai.query(arg);
      break;
    case 'search':
      result = await electron.ai.search(arg);
      break;
    case 'draftNote':
      result = await electron.ai.draftNote(arg);
      break;
    case 'reviewConsultation':
      result = await electron.ai.reviewConsultation(arg);
      break;
    case 'embedPatient':
      result = await electron.ai.embedPatient(arg as string);
      break;
    case 'health':
      result = await electron.ai.health();
      break;
    case 'config':
      result = await electron.ai.config();
      break;
    default:
      throw new Error(`Unsupported AI method: ${method}`);
  }

  if (!result.success) {
    logOperationDuration({
      module: 'AIAPI',
      action: method,
      step: 'ipc_invoke',
      duration_ms: performance.now() - startedAt,
      trace_id: traceId,
      patient_id: entityContext.patientId,
      encounter_id: entityContext.encounterId,
      request_payload_bytes: estimatePayloadBytes(arg),
      payload_bytes: estimatePayloadBytes(result),
      success: false,
      error: result.error || 'Unknown AI service error',
    });
    throw new Error(result.error || 'Unknown AI service error');
  }

  logOperationDuration({
    module: 'AIAPI',
    action: method,
    step: 'ipc_invoke',
    duration_ms: performance.now() - startedAt,
    trace_id: traceId,
    patient_id: entityContext.patientId,
    encounter_id: entityContext.encounterId,
    request_payload_bytes: estimatePayloadBytes(arg),
    payload_bytes: estimatePayloadBytes(result.data),
    success: true,
  });
  return result.data as T;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Ask the AI assistant a question with hybrid search + LLM summarisation.
 */
export async function queryAI(request: AIQueryRequest): Promise<AIResponse> {
  return invokeAI<AIResponse>('query', request);
}

/**
 * Streaming variant — sends query and returns metadata once LLM is done.
 * Subscribe to `onStreamChunk` BEFORE calling this to receive live tokens.
 */
export async function queryAIStream(
  request: AIQueryRequest,
): Promise<AIResponse> {
  const electron = getElectron();
  if (!electron?.ai?.queryStream) {
    // Fallback to non-streaming if preload doesn't expose it
    return queryAI(request);
  }
  const result: IPCResult<AIResponse> = await electron.ai.queryStream(request);
  if (!result.success) {
    throw new Error(result.error || 'Unknown AI stream error');
  }
  return result.data as AIResponse;
}

/**
 * Subscribe to live stream chunks from `ai:query-stream`.
 * Call BEFORE `queryAIStream`. Returns an unsubscribe function.
 */
export function onStreamChunk(
  callback: (data: { chunk: string; done: boolean; error?: string }) => void,
): () => void {
  const electron = getElectron();
  if (!electron?.ai?.onStreamChunk) {
    return () => {};
  }
  return electron.ai.onStreamChunk(callback);
}

/**
 * Raw search (no LLM) — returns matching records.
 */
export async function searchRecords(request: AIQueryRequest) {
  return invokeAI<{
    results: unknown[];
    searchType: string;
    resultCount: number;
  }>('search', request);
}

/**
 * Draft a clinical note using AI.
 */
export async function draftNote(
  request: NoteDraftRequest,
): Promise<NoteDraftResponse> {
  return invokeAI<NoteDraftResponse>('draftNote', request);
}

/**
 * Trigger re-embedding for a patient.
 */
export async function embedPatient(patientId: string) {
  return invokeAI<{ message: string }>('embedPatient', patientId);
}

/**
 * Check AI provider health.
 */
export async function checkAIHealth() {
  return invokeAI<{
    provider: string;
    configured: boolean;
    llmReachable: boolean;
    embeddingReachable: boolean;
    supabaseConfigured: boolean;
  }>('health');
}

/**
 * Get AI configuration (redacted — no secrets).
 */
export async function getAIConfig() {
  return invokeAI<{
    provider: string;
    chatModel: string;
    embeddingModel: string;
    hasApiKey: boolean;
    ollamaBaseUrl?: string;
  }>('config');
}

/**
 * Request AI clinical review of consultation entries before submission.
 * Compares against patient's existing medical records and flags issues.
 */
export interface ConsultationReviewRequest {
  patientId: string;
  facilityId?: string;
  userId?: string;
  consultationData: {
    complaints?: Array<{
      complaint_name?: string;
      complaint_code?: string;
      is_primary?: boolean;
      duration_value?: number;
      duration_unit?: string;
      notes?: string;
    }>;
    history_of_present_illness?: string;
    past_medical_history?: string;
    family_history?: string;
    social_history?: string;
    review_of_systems?: string;
    examination_findings?: string;
    physical_examination?: string;
    specialty_examination?: Record<string, unknown>;
    diagnoses?: Array<{ code?: string; title?: string }>;
    differential_diagnosis?: string;
    treatment_plan?: string;
    clinical_notes?: string;
    recommendations?: string;
    prescriptions?: Array<{
      drug_name?: string;
      dosage?: string;
      route?: string;
      frequency?: string;
      duration?: string;
      quantity_prescribed?: number;
      instructions?: string;
    }>;
    labOrders?: Array<{
      test_name?: string;
      test_code?: string;
      priority?: string;
      clinical_notes?: string;
    }>;
    radiologyOrders?: Array<{
      imaging_type?: string;
      body_part?: string;
      clinical_indication?: string;
      priority?: string;
    }>;
    procedureOrders?: Array<{
      procedure_name?: string;
      procedure_code?: string;
      priority?: string;
      indication?: string;
    }>;
    admissionOrder?: Record<string, unknown> | null;
    treatmentTasks?: Array<{
      task_type?: string;
      title?: string;
      priority?: string;
      medication_name?: string;
      dosage?: string;
      route?: string;
    }>;
    referrals?: Array<{
      specialty?: string;
      reason?: string;
      urgency?: string;
    }>;
    follow_up_date?: string;
    follow_up_notes?: string;
  };
}

export interface ConsultationReviewResponse {
  review: string;
  tokensUsed?: number;
  model?: string;
}

export async function reviewConsultation(
  request: ConsultationReviewRequest,
): Promise<ConsultationReviewResponse> {
  return invokeAI<ConsultationReviewResponse>('reviewConsultation', request);
}
