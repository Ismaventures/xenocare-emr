/**
 * AI Service — Main Process IPC Handlers
 *
 * Registers all AI-related IPC handlers:
 *  - ai:query          — hybrid search + comprehensive context + LLM
 *  - ai:search         — raw hybrid / vector / fulltext search
 *  - ai:draftNote      — clinical note drafting via LLM
 *  - ai:patient-context — fetch full structured patient chart
 *  - ai:embedPatient   — force re-embed a patient's records
 *  - ai:health         — check embedding & LLM provider health
 *  - ai:config         — get current AI configuration
 *
 * Pattern follows the existing icdService.ts / registerICDHandlers() convention.
 */
import { ipcMain } from 'electron';
import log from 'electron-log';
import { z } from 'zod';
import { initAuditLogger, logAIInteraction } from './aiAuditLogger';
import {
  createTraceId,
  estimatePayloadBytes,
  logOperationDuration,
  logOperationSummary,
  toMetricKey,
} from './observability';

// =============================================================================
// Types
// =============================================================================

interface AIQueryRequest {
  query: string;
  patientId?: string;
  imageAttachments?: Array<{
    name: string;
    mimeType: string;
    dataUrl: string;
  }>;
  facilityId: string;
  userId: string;
  conversationHistory?: Array<{
    query: string;
    answer: string;
    timestamp?: string;
  }>;
  assistantScope?: 'clinical' | 'pharmacy';
  searchType?: 'hybrid' | 'vector' | 'fulltext';
  maxResults?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface AIDraftNoteRequest {
  patientId: string;
  facilityId: string;
  userId: string;
  noteType: 'soap' | 'discharge_summary' | 'referral_letter' | 'progress_note';
  context?: string;
  instructions?: string;
}

interface AIReviewConsultationRequest {
  patientId: string;
  facilityId?: string;
  userId?: string;
  consultationData: Record<string, unknown>;
}

interface LLMConfig {
  provider: 'openai' | 'gemini' | 'groq' | 'ollama';
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  groq: {
    apiKey: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    apiKey: string;
    chatModel: string;
    embeddingModel: string;
    dimensions: number;
  };
  supabaseUrl: string;
  supabaseKey: string;
}

// =============================================================================
// IPC Runtime Schemas
// =============================================================================

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(maxLength).optional());

const requiredTrimmedString = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength);

const aiConversationTurnSchema = z.object({
  query: requiredTrimmedString(2000),
  answer: requiredTrimmedString(6000),
  timestamp: optionalTrimmedString(80),
});

const aiImageAttachmentSchema = z.object({
  name: requiredTrimmedString(240),
  mimeType: requiredTrimmedString(80),
  dataUrl: z
    .string()
    .max(8_000_000)
    .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, 'Invalid image payload'),
});

const aiQueryRequestSchema = z.object({
  query: requiredTrimmedString(4000),
  patientId: optionalTrimmedString(120),
  imageAttachments: z.array(aiImageAttachmentSchema).max(4).optional(),
  facilityId: optionalTrimmedString(120),
  userId: optionalTrimmedString(120),
  conversationHistory: z.array(aiConversationTurnSchema).max(10).optional(),
  assistantScope: z.enum(['clinical', 'pharmacy']).optional(),
  searchType: z.enum(['hybrid', 'vector', 'fulltext']).optional(),
  maxResults: z.coerce.number().int().min(1).max(50).optional(),
  dateFrom: optionalTrimmedString(64),
  dateTo: optionalTrimmedString(64),
});

const aiDraftNoteRequestSchema = z.object({
  patientId: requiredTrimmedString(120),
  facilityId: optionalTrimmedString(120),
  userId: optionalTrimmedString(120),
  noteType: z.enum([
    'soap',
    'discharge_summary',
    'referral_letter',
    'progress_note',
  ]),
  context: optionalTrimmedString(8000),
  instructions: optionalTrimmedString(8000),
});

const aiReviewConsultationRequestSchema = z.object({
  patientId: requiredTrimmedString(120),
  facilityId: optionalTrimmedString(120),
  userId: optionalTrimmedString(120),
  consultationData: z.record(z.string(), z.unknown()),
});

const aiPatientIdSchema = requiredTrimmedString(120);

const aiQueryResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.record(z.string(), z.unknown())).default([]),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  searchType: z.string(),
  resultCount: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
});

const aiSearchResponseSchema = z.object({
  results: z.array(z.unknown()),
  searchType: z.string(),
  resultCount: z.number().int().nonnegative(),
});

const aiDraftNoteResponseSchema = z.object({
  draft: z.string(),
  sources: z.array(z.unknown()),
  tokensUsed: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
});

const aiPatientContextResponseSchema = z.object({
  context: z.string(),
  patientId: z.string(),
});

const aiReviewConsultationResponseSchema = z.object({
  review: z.string(),
  tokensUsed: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
});

const aiEmbedResponseSchema = z.object({
  message: z.string(),
});

const aiHealthResponseSchema = z.object({
  provider: z.string(),
  configured: z.boolean(),
  llmReachable: z.boolean(),
  embeddingReachable: z.boolean(),
  supabaseConfigured: z.boolean(),
});

const aiConfigResponseSchema = z.object({
  provider: z.string(),
  chatModel: z.string(),
  embeddingModel: z.string(),
  hasApiKey: z.boolean(),
  ollamaBaseUrl: z.string().optional(),
});

function formatValidationError(prefix: string, err: z.ZodError): Error {
  const details = err.issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');
  return new Error(`${prefix} ${details}`);
}

function parseAIQueryRequest(rawReq: unknown, channel: string): AIQueryRequest {
  const parsed = aiQueryRequestSchema.safeParse(rawReq);
  if (!parsed.success) {
    throw formatValidationError(`Invalid ${channel} payload:`, parsed.error);
  }

  return {
    ...parsed.data,
    facilityId: parsed.data.facilityId || 'unknown-facility',
    userId: parsed.data.userId || 'anonymous',
  };
}

function parseAIDraftNoteRequest(rawReq: unknown): AIDraftNoteRequest {
  const parsed = aiDraftNoteRequestSchema.safeParse(rawReq);
  if (!parsed.success) {
    throw formatValidationError('Invalid ai:draftNote payload:', parsed.error);
  }

  return {
    ...parsed.data,
    facilityId: parsed.data.facilityId || 'unknown-facility',
    userId: parsed.data.userId || 'anonymous',
  };
}

function parseAIReviewConsultationRequest(
  rawReq: unknown,
): AIReviewConsultationRequest {
  const parsed = aiReviewConsultationRequestSchema.safeParse(rawReq);
  if (!parsed.success) {
    throw formatValidationError(
      'Invalid ai:review-consultation payload:',
      parsed.error,
    );
  }

  return parsed.data;
}

function parsePatientId(
  rawPatientId: unknown,
  channel: 'ai:patient-context' | 'ai:embedPatient',
): string {
  const parsed = aiPatientIdSchema.safeParse(rawPatientId);
  if (!parsed.success) {
    throw formatValidationError(`Invalid ${channel} payload:`, parsed.error);
  }
  return parsed.data;
}

function validateResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  channel: string,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw formatValidationError(`Invalid ${channel} response:`, parsed.error);
  }
  return parsed.data;
}

// =============================================================================
// Configuration
// =============================================================================

function getAIConfig(): LLMConfig {
  const provider = (process.env.AI_PROVIDER ||
    'ollama') as LLMConfig['provider'];
  log.info(
    `[AI Config] Provider=${provider}, OLLAMA_CHAT_MODEL=${process.env.OLLAMA_CHAT_MODEL || 'gemma4:31b-cloud'}, OLLAMA_BASE_URL=${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`,
  );
  return {
    provider,
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      embeddingModel:
        process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash-lite',
      embeddingModel:
        process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      apiKey: process.env.OLLAMA_API_KEY || '',
      chatModel: process.env.OLLAMA_CHAT_MODEL || 'gemma4:31b-cloud',
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      dimensions: Number(process.env.OLLAMA_EMBEDDING_DIMENSIONS) || 768,
    },
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '',
  };
}

function endpointFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function hasConfiguredLLMProvider(config: LLMConfig): boolean {
  switch (config.provider) {
    case 'ollama':
      return Boolean(config.ollama.baseUrl);
    case 'groq':
      return Boolean(config.groq.apiKey);
    case 'gemini':
      return Boolean(config.gemini.apiKey);
    case 'openai':
    default:
      return Boolean(config.openai.apiKey);
  }
}

function getConfiguredChatModel(config: LLMConfig): string {
  switch (config.provider) {
    case 'ollama':
      return config.ollama.chatModel;
    case 'groq':
      return config.groq.model;
    case 'gemini':
      return config.gemini.model;
    case 'openai':
    default:
      return config.openai.model;
  }
}

function hasEmbeddingProviderConfigured(config: LLMConfig): boolean {
  return Boolean(config.ollama.baseUrl || config.gemini.apiKey);
}

async function fetchOllamaModelNames(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetchWithRetry(`${baseUrl}/api/tags`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .map((model) =>
      typeof model?.name === 'string' ? model.name.trim() : undefined,
    )
    .filter((name): name is string => Boolean(name));
}

async function isOllamaModelAvailable(
  baseUrl: string,
  modelName: string,
  apiKey: string,
): Promise<boolean> {
  const normalizedTarget = modelName.trim().toLowerCase();
  if (!normalizedTarget) return false;

  const installedModels = await fetchOllamaModelNames(baseUrl, apiKey);
  return installedModels.some((installedModel) => {
    const normalizedInstalled = installedModel.trim().toLowerCase();
    return (
      normalizedInstalled === normalizedTarget ||
      normalizedInstalled === `${normalizedTarget}:latest` ||
      `${normalizedInstalled}:latest` === normalizedTarget
    );
  });
}

const AI_FETCH_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.AI_FETCH_TIMEOUT_MS || 30000),
);
const AI_STREAM_IDLE_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.AI_STREAM_IDLE_TIMEOUT_MS || 45000),
);
const AI_CHAT_MAX_TOKENS = Math.max(
  64,
  Number(process.env.AI_CHAT_MAX_TOKENS || 2048),
);
const OLLAMA_CHAT_MAX_TOKENS = Math.max(
  64,
  Number(process.env.OLLAMA_CHAT_MAX_TOKENS || 384),
);
const OLLAMA_NUM_CTX = Math.max(
  256,
  Number(process.env.OLLAMA_NUM_CTX || 2048),
);
const LOCAL_OLLAMA_QUERY_MAX_RESULTS = Math.max(
  1,
  Number(process.env.OLLAMA_QUERY_MAX_RESULTS || 3),
);
const LOCAL_OLLAMA_PHARMACY_MAX_ROWS = Math.max(
  4,
  Number(process.env.OLLAMA_PHARMACY_MAX_ROWS || 12),
);
const LOCAL_OLLAMA_GLOBAL_MAX_ROWS = Math.max(
  6,
  Number(process.env.OLLAMA_GLOBAL_MAX_ROWS || 20),
);
const LOCAL_OLLAMA_GLOBAL_WIDE_MAX_ROWS = Math.max(
  8,
  Number(process.env.OLLAMA_GLOBAL_WIDE_MAX_ROWS || 40),
);
const LOCAL_OLLAMA_CHART_CONTEXT_CHARS = Math.max(
  600,
  Number(process.env.OLLAMA_CHART_CONTEXT_CHARS || 2200),
);
const LOCAL_OLLAMA_SEARCH_CONTEXT_CHARS = Math.max(
  400,
  Number(process.env.OLLAMA_SEARCH_CONTEXT_CHARS || 1400),
);
const LOCAL_OLLAMA_PHARMACY_CONTEXT_CHARS = Math.max(
  500,
  Number(process.env.OLLAMA_PHARMACY_CONTEXT_CHARS || 1800),
);
const LOCAL_OLLAMA_GLOBAL_CONTEXT_CHARS = Math.max(
  700,
  Number(process.env.OLLAMA_GLOBAL_CONTEXT_CHARS || 2600),
);
const LOCAL_OLLAMA_CONVERSATION_CHARS = Math.max(
  250,
  Number(process.env.OLLAMA_CONVERSATION_CHARS || 500),
);
const LOCAL_OLLAMA_QUERY_CHARS = Math.max(
  120,
  Number(process.env.OLLAMA_QUERY_CHARS || 600),
);

function getChatMaxTokens(provider: LLMConfig['provider']): number {
  return provider === 'ollama' ? OLLAMA_CHAT_MAX_TOKENS : AI_CHAT_MAX_TOKENS;
}

function getOllamaChatOptions() {
  return {
    num_ctx: OLLAMA_NUM_CTX,
    num_predict: OLLAMA_CHAT_MAX_TOKENS,
    temperature: 0.2,
  };
}

function isOllamaCloudModel(model: string): boolean {
  return /(?:^|:|-|\b)cloud$/i.test(model.trim());
}

function isConstrainedLocalOllama(config: LLMConfig): boolean {
  return (
    config.provider === 'ollama' &&
    !isOllamaCloudModel(config.ollama.chatModel) &&
    OLLAMA_NUM_CTX <= 4096
  );
}

function truncateForLocalModel(text: string, maxChars: number): string {
  if (!text) return text;
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars).trimEnd();
  return `${slice}\n\n[Context truncated for local Phi-3 runtime]`;
}

function buildLLMUserContent(
  config: LLMConfig,
  sections: {
    chartContext?: string;
    pharmacyContext?: string;
    globalClinicalContext?: string;
    searchContext?: string;
    searchResultCount?: number;
    conversationContext?: string;
    questionLabel: string;
    query: string;
  },
): string {
  const compactForLocalModel = isConstrainedLocalOllama(config);
  const queryText = compactForLocalModel
    ? truncateForLocalModel(sections.query, LOCAL_OLLAMA_QUERY_CHARS)
    : sections.query;

  const parts: string[] = [];

  if (compactForLocalModel) {
    parts.push(
      '## LOCAL OLLAMA MODE\nUse the compact context below only. If evidence is missing, say so explicitly rather than inferring beyond the supplied records.',
    );
  }

  if (sections.globalClinicalContext) {
    parts.push(
      `# GLOBAL CLINICAL CONTEXT\n\n${compactForLocalModel ? truncateForLocalModel(sections.globalClinicalContext, LOCAL_OLLAMA_GLOBAL_CONTEXT_CHARS) : sections.globalClinicalContext}`,
    );
  }

  if (sections.chartContext) {
    parts.push(
      `# COMPLETE PATIENT CHART\n\n${compactForLocalModel ? truncateForLocalModel(sections.chartContext, LOCAL_OLLAMA_CHART_CONTEXT_CHARS) : sections.chartContext}`,
    );
  }

  if (sections.pharmacyContext) {
    parts.push(
      `# PHARMACY OPERATIONAL CONTEXT\n\n${compactForLocalModel ? truncateForLocalModel(sections.pharmacyContext, LOCAL_OLLAMA_PHARMACY_CONTEXT_CHARS) : sections.pharmacyContext}`,
    );
  }

  if (sections.searchContext) {
    const searchHeading = `# SEARCH RESULTS (${sections.searchResultCount || 0} records matching "${queryText}")`;
    parts.push(
      `${searchHeading}\n\n${compactForLocalModel ? truncateForLocalModel(sections.searchContext, LOCAL_OLLAMA_SEARCH_CONTEXT_CHARS) : sections.searchContext}`,
    );
  }

  if (sections.conversationContext) {
    parts.push(
      compactForLocalModel
        ? truncateForLocalModel(
            sections.conversationContext,
            LOCAL_OLLAMA_CONVERSATION_CHARS,
          )
        : sections.conversationContext,
    );
  }

  parts.push(`---\n\n**${sections.questionLabel}**: ${queryText}`);
  return parts.filter(Boolean).join('\n\n');
}

// =============================================================================
// LLM Chat Completion
// =============================================================================

/** Simple retry helper with exponential back-off for transient / rate-limit errors. */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  const traceId = createTraceId('AIService', 'fetchWithRetry');
  const method = (init.method || 'GET').toUpperCase();
  const endpoint = endpointFromUrl(url);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStartedAt = Date.now();
    let resp: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();

    if (init.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener('abort', abortFromCaller, { once: true });
      }
    }

    try {
      resp = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      const durationMs = Date.now() - attemptStartedAt;
      const timedOut = controller.signal.aborted && !init.signal?.aborted;
      logOperationDuration({
        module: 'AIService',
        action: 'fetchWithRetry',
        step: `attempt_${attempt + 1}`,
        duration_ms: durationMs,
        trace_id: traceId,
        endpoint,
        method,
        attempt: attempt + 1,
        max_retries: maxRetries,
        timed_out: timedOut,
        error: error instanceof Error ? error.message : String(error),
      });

      if (timedOut && attempt < maxRetries) {
        const waitMs = Math.min(1000 * 2 ** attempt, 30_000);
        log.warn(
          `[AI Service] Request timeout on ${endpoint} — retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (init.signal) {
        init.signal.removeEventListener('abort', abortFromCaller);
      }
    }

    const durationMs = Date.now() - attemptStartedAt;
    const payloadBytesHeader = resp.headers.get('content-length');
    const payloadBytes = payloadBytesHeader
      ? Number(payloadBytesHeader)
      : undefined;

    if (resp.ok) {
      logOperationDuration({
        module: 'AIService',
        action: 'fetchWithRetry',
        step: `attempt_${attempt + 1}`,
        duration_ms: durationMs,
        trace_id: traceId,
        endpoint,
        method,
        status: resp.status,
        attempt: attempt + 1,
        max_retries: maxRetries,
        payload_bytes: Number.isFinite(payloadBytes) ? payloadBytes : undefined,
        retrying: false,
      });
      return resp;
    }

    logOperationDuration({
      module: 'AIService',
      action: 'fetchWithRetry',
      step: `attempt_${attempt + 1}`,
      duration_ms: durationMs,
      trace_id: traceId,
      endpoint,
      method,
      status: resp.status,
      attempt: attempt + 1,
      max_retries: maxRetries,
      payload_bytes: Number.isFinite(payloadBytes) ? payloadBytes : undefined,
      retrying: resp.status === 429 || resp.status >= 500,
    });

    // 429 = rate-limited, 500+ = transient server error → retry
    if ((resp.status === 429 || resp.status >= 500) && attempt < maxRetries) {
      const retryAfter = resp.headers.get('retry-after');
      const waitMs = retryAfter
        ? Number(retryAfter) * 1000
        : Math.min(1000 * 2 ** attempt, 30_000); // 1s, 2s, 4s …
      log.warn(
        `[AI Service] ${resp.status} on ${url} — retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error(`HTTP ${resp.status}`);
      continue;
    }

    // Non-retryable error — throw immediately
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body}`);
  }
  throw lastError ?? new Error('fetchWithRetry exhausted retries');
}

type ChatMessagePart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatMessagePart[];
}

interface ChatResult {
  content: string;
  tokensUsed: number;
  model: string;
}

function flattenMessageContent(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .map((part) => (part.type === 'text' ? part.text : '[Image attachment]'))
    .join('\n')
    .trim();
}

function parseImageDataUrl(
  dataUrl: string,
): { mimeType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

function providerSupportsImageAnalysis(
  provider: LLMConfig['provider'],
): boolean {
  return provider === 'openai' || provider === 'gemini';
}

function buildUserMessageWithAttachments(
  text: string,
  imageAttachments: AIQueryRequest['imageAttachments'] | undefined,
  provider: LLMConfig['provider'],
): ChatMessage {
  const attachments = imageAttachments || [];
  if (attachments.length === 0) {
    return { role: 'user', content: text };
  }

  if (providerSupportsImageAnalysis(provider)) {
    return {
      role: 'user',
      content: [
        { type: 'text', text },
        ...attachments.map((img) => ({
          type: 'image_url',
          image_url: { url: img.dataUrl } as { url: string },
        })),
      ],
    };
  }

  const fallback = [
    text,
    '',
    `Image attachments provided (${attachments.length}): ${attachments.map((img) => img.name).join(', ')}`,
    'Current model does not support direct image analysis. Use OpenAI/Gemini vision-capable provider for full image interpretation.',
  ].join('\n');

  return { role: 'user', content: fallback };
}

async function chatCompletion(messages: ChatMessage[]): Promise<ChatResult> {
  const startedAt = Date.now();
  const traceId = createTraceId('AIService', 'chatCompletion');
  const config = getAIConfig();

  try {
    let result: ChatResult;
    if (config.provider === 'ollama') {
      result = await chatOllama(messages, config);
    } else if (config.provider === 'groq') {
      result = await chatGroq(messages, config);
    } else if (config.provider === 'gemini') {
      result = await chatGemini(messages, config);
    } else {
      result = await chatOpenAI(messages, config);
    }

    logOperationDuration({
      module: 'AIService',
      action: 'chatCompletion',
      step: 'provider_completion',
      duration_ms: Date.now() - startedAt,
      trace_id: traceId,
      provider: config.provider,
      model: result.model,
      tokens_used: result.tokensUsed,
      message_count: messages.length,
      input_chars: messages.reduce((sum, m) => sum + m.content.length, 0),
      payload_bytes: estimatePayloadBytes(result.content),
    });

    return result;
  } catch (error) {
    logOperationDuration({
      module: 'AIService',
      action: 'chatCompletion',
      step: 'provider_completion',
      duration_ms: Date.now() - startedAt,
      trace_id: traceId,
      provider: config.provider,
      message_count: messages.length,
      input_chars: messages.reduce((sum, m) => sum + m.content.length, 0),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Streaming chat completion — sends delta text to `onChunk` as it arrives.
 * Works with any OpenAI-compatible provider (Ollama, Groq, OpenAI).
 * Falls back to non-streaming for Gemini.
 */
async function chatCompletionStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<ChatResult> {
  const startedAt = Date.now();
  const traceId = createTraceId('AIService', 'chatCompletionStream');
  const config = getAIConfig();

  let url: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let model: string;
  const maxTokens = getChatMaxTokens(config.provider);

  if (config.provider === 'ollama') {
    url = `${config.ollama.baseUrl}/api/chat`;
    if (config.ollama.apiKey)
      headers.Authorization = `Bearer ${config.ollama.apiKey}`;
    model = config.ollama.chatModel;
  } else if (config.provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers.Authorization = `Bearer ${config.groq.apiKey}`;
    model = config.groq.model;
  } else if (config.provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers.Authorization = `Bearer ${config.openai.apiKey}`;
    model = config.openai.model;
  } else {
    // Gemini does not support OpenAI-compatible streaming — fall back
    const result = await chatCompletion(messages);
    onChunk(result.content);
    logOperationDuration({
      module: 'AIService',
      action: 'chatCompletionStream',
      step: 'gemini_fallback_single_response',
      duration_ms: Date.now() - startedAt,
      trace_id: traceId,
      provider: config.provider,
      model: result.model,
      tokens_used: result.tokensUsed,
      message_count: messages.length,
      payload_bytes: estimatePayloadBytes(result.content),
    });
    return result;
  }

  const streamController = new AbortController();
  const requestBody =
    config.provider === 'ollama'
      ? {
          model,
          messages: messages.map((message) => ({
            ...message,
            content: flattenMessageContent(message.content),
          })),
          options: getOllamaChatOptions(),
          stream: true,
        }
      : {
          model,
          messages:
            config.provider === 'openai'
              ? messages
              : messages.map((message) => ({
                  ...message,
                  content: flattenMessageContent(message.content),
                })),
          temperature: 0.2,
          max_tokens: maxTokens,
          stream: true,
        };
  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers,
      signal: streamController.signal,
      body: JSON.stringify(requestBody),
    },
    0,
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`HTTP ${response.status}: ${errBody}`);
  }

  let fullContent = '';
  let tokensUsed = 0;
  let chunkCount = 0;
  const reader = (
    response.body as unknown as ReadableStream<Uint8Array>
  ).getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const readNextChunk = async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            streamController.abort();
            void reader.cancel().catch(() => undefined);
            reject(
              new Error(
                `AI stream stalled for more than ${AI_STREAM_IDLE_TIMEOUT_MS}ms`,
              ),
            );
          }, AI_STREAM_IDLE_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await readNextChunk();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (config.provider === 'ollama') {
        try {
          const json = JSON.parse(trimmed);
          const delta = json.message?.content;
          if (delta) {
            fullContent += delta;
            chunkCount += 1;
            onChunk(delta);
          }
          if (json.done) {
            const promptTokens =
              typeof json.prompt_eval_count === 'number'
                ? json.prompt_eval_count
                : 0;
            const completionTokens =
              typeof json.eval_count === 'number' ? json.eval_count : 0;
            tokensUsed = promptTokens + completionTokens;
          }
        } catch {
          /* skip malformed Ollama stream line */
        }
        continue;
      }

      if (trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            chunkCount += 1;
            onChunk(delta);
          }
          if (json.usage?.total_tokens) tokensUsed = json.usage.total_tokens;
        } catch {
          /* skip malformed SSE line */
        }
      }
    }
  }

  const result = { content: fullContent, tokensUsed, model };
  logOperationDuration({
    module: 'AIService',
    action: 'chatCompletionStream',
    step: 'stream_completion',
    duration_ms: Date.now() - startedAt,
    trace_id: traceId,
    provider: config.provider,
    model,
    tokens_used: tokensUsed,
    message_count: messages.length,
    stream_chunks: chunkCount,
    payload_bytes: estimatePayloadBytes(fullContent),
  });
  return result;
}

async function chatOpenAI(
  messages: ChatMessage[],
  config: LLMConfig,
): Promise<ChatResult> {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages,
        temperature: 0.2,
        max_tokens: getChatMaxTokens(config.provider),
      }),
    },
  );

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
    model: config.openai.model,
  };
}

async function chatOllama(
  messages: ChatMessage[],
  config: LLMConfig,
): Promise<ChatResult> {
  const url = `${config.ollama.baseUrl}/api/chat`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.ollama.apiKey) {
    headers.Authorization = `Bearer ${config.ollama.apiKey}`;
  }
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.ollama.chatModel,
      messages: messages.map((message) => ({
        ...message,
        content: flattenMessageContent(message.content),
      })),
      stream: false,
      options: getOllamaChatOptions(),
    }),
  });

  const data = await response.json();
  return {
    content: data.message?.content ?? '',
    tokensUsed: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    model: config.ollama.chatModel,
  };
}

async function chatGroq(
  messages: ChatMessage[],
  config: LLMConfig,
): Promise<ChatResult> {
  if (!config.groq.apiKey) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const response = await fetchWithRetry(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groq.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groq.model,
        messages: messages.map((message) => ({
          ...message,
          content: flattenMessageContent(message.content),
        })),
        temperature: 0.2,
        max_tokens: getChatMaxTokens(config.provider),
      }),
    },
  );

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
    model: config.groq.model,
  };
}

async function chatGemini(
  messages: ChatMessage[],
  config: LLMConfig,
): Promise<ChatResult> {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  // Convert OpenAI-style messages to Gemini format
  const systemInstruction = flattenMessageContent(
    messages.find((m) => m.role === 'system')?.content || '',
  );
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const parts =
        typeof m.content === 'string'
          ? [{ text: m.content }]
          : m.content
              .map((part) => {
                if (part.type === 'text') {
                  return { text: part.text };
                }
                const parsed = parseImageDataUrl(part.image_url.url);
                if (!parsed) return null;
                return {
                  inlineData: {
                    mimeType: parsed.mimeType,
                    data: parsed.base64Data,
                  },
                };
              })
              .filter(Boolean);

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: parts.length > 0 ? parts : [{ text: '' }],
      };
    });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const tokensUsed =
    (data.usageMetadata?.promptTokenCount ?? 0) +
    (data.usageMetadata?.candidatesTokenCount ?? 0);

  return {
    content: text,
    tokensUsed,
    model: config.gemini.model,
  };
}

// =============================================================================
// Hybrid Search via Supabase RPC
// =============================================================================

async function hybridSearch(
  patientId: string,
  queryText: string,
  queryEmbedding: number[],
  searchType: string,
  maxResults: number,
  config: LLMConfig,
): Promise<unknown[]> {
  const startedAt = Date.now();
  const traceId = createTraceId('AIService', 'hybridSearch');
  const rpcName =
    searchType === 'vector'
      ? 'search_patient_records_vector'
      : searchType === 'fulltext'
        ? 'search_patient_records_fulltext'
        : 'search_patient_records_hybrid';

  const body: Record<string, unknown> = {
    p_patient_id: patientId,
    p_limit: maxResults,
  };

  if (searchType === 'fulltext' || searchType === 'hybrid') {
    body.p_query = queryText;
  }
  if (searchType === 'vector' || searchType === 'hybrid') {
    body.p_query_embedding = `[${queryEmbedding.join(',')}]`;
  }
  if (searchType === 'hybrid') {
    body.p_fulltext_weight = 0.4;
    body.p_vector_weight = 0.6;
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();
  const payloadBytes = Buffer.byteLength(responseBody || '', 'utf8');
  if (!response.ok) {
    logOperationDuration({
      module: 'AIService',
      action: 'hybridSearch',
      step: 'rpc_request',
      duration_ms: Date.now() - startedAt,
      trace_id: traceId,
      patient_id: patientId,
      rpc_name: rpcName,
      search_type: searchType,
      status: response.status,
      payload_bytes: payloadBytes,
      max_results: maxResults,
    });
    throw new Error(
      `Supabase RPC ${rpcName} error ${response.status}: ${responseBody}`,
    );
  }

  let parsed: unknown[] = [];
  try {
    parsed = responseBody ? (JSON.parse(responseBody) as unknown[]) : [];
  } catch {
    parsed = [];
  }

  logOperationDuration({
    module: 'AIService',
    action: 'hybridSearch',
    step: 'rpc_request',
    duration_ms: Date.now() - startedAt,
    trace_id: traceId,
    patient_id: patientId,
    rpc_name: rpcName,
    search_type: searchType,
    status: response.status,
    payload_bytes: payloadBytes,
    max_results: maxResults,
    result_count: parsed.length,
  });

  return parsed;
}

// =============================================================================
// Embedding Generation (main-process side — mirrors embeddingClient.ts)
// =============================================================================

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const startedAt = Date.now();
  const traceId = createTraceId('AIService', 'generateQueryEmbedding');
  const config = getAIConfig();

  // Always use Ollama for embeddings (local, fast, no API quota issues)
  const ollamaUrl = `${config.ollama.baseUrl}/api/embed`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.ollama.apiKey) {
    headers.Authorization = `Bearer ${config.ollama.apiKey}`;
  }
  try {
    const resp = await fetch(ollamaUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.ollama.embeddingModel,
        input: text,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      logOperationDuration({
        module: 'AIService',
        action: 'generateQueryEmbedding',
        step: 'ollama_embedding_request',
        duration_ms: Date.now() - startedAt,
        trace_id: traceId,
        provider: 'ollama',
        endpoint: endpointFromUrl(ollamaUrl),
        status: resp.status,
        input_chars: text.length,
        payload_bytes: Buffer.byteLength(body || '', 'utf8'),
      });
      throw new Error(`Ollama embedding error ${resp.status}: ${body}`);
    }
    const data = await resp.json();
    const embedding = data.embeddings?.[0] ?? [];
    logOperationDuration({
      module: 'AIService',
      action: 'generateQueryEmbedding',
      step: 'ollama_embedding_request',
      duration_ms: Date.now() - startedAt,
      trace_id: traceId,
      provider: 'ollama',
      endpoint: endpointFromUrl(ollamaUrl),
      status: resp.status,
      input_chars: text.length,
      embedding_dimensions: Array.isArray(embedding) ? embedding.length : 0,
      payload_bytes: estimatePayloadBytes(embedding),
    });
    return embedding;
  } catch (err) {
    const allowCloudEmbeddingFallback =
      config.provider !== 'ollama' && Boolean(config.gemini.apiKey);

    if (!allowCloudEmbeddingFallback) {
      log.warn(
        '[AI Service] Ollama embedding failed in local-only mode. Install the configured Ollama embedding model and retry:',
        String(err),
      );
      logOperationDuration({
        module: 'AIService',
        action: 'generateQueryEmbedding',
        step: 'embedding_failed',
        duration_ms: Date.now() - startedAt,
        trace_id: traceId,
        provider: 'ollama',
        input_chars: text.length,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    log.warn(
      '[AI Service] Ollama embedding failed, falling back to Gemini:',
      String(err),
    );
    if (config.gemini.apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.embeddingModel}:embedContent?key=${config.gemini.apiKey}`;
      const geminiStartedAt = Date.now();
      const resp = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${config.gemini.embeddingModel}`,
          content: { parts: [{ text }] },
          outputDimensionality: config.ollama.dimensions,
        }),
      });
      const data = await resp.json();
      const embedding = data.embedding?.values ?? [];
      logOperationDuration({
        module: 'AIService',
        action: 'generateQueryEmbedding',
        step: 'gemini_embedding_fallback_request',
        duration_ms: Date.now() - geminiStartedAt,
        trace_id: traceId,
        provider: 'gemini',
        endpoint: endpointFromUrl(url),
        input_chars: text.length,
        embedding_dimensions: Array.isArray(embedding) ? embedding.length : 0,
        payload_bytes: estimatePayloadBytes(embedding),
      });
      return embedding;
    }
    throw err;
  }
}

// =============================================================================
// System Prompt — Enhanced for comprehensive clinical decision support
// =============================================================================

const CLINICAL_SYSTEM_PROMPT = `You are XenoCare Medical AI Assistant, a senior clinical decision-support AI embedded in a hospital EMR. You support clinicians with accurate, structured summaries of the CURRENT patient only. Never replace clinical judgement.

STRICT SCOPING:
- Use only data in the provided chart context.
- Do not invent records, values, dates, clinicians, or medications.
- If data is missing, state it clearly.

EXTERNAL STANDARDS MAPPING:
- If the user asks about global standards, interoperability, coding, compliance, or best-practice workflows, map the chart to relevant standards: HL7 FHIR, ICD-10, SNOMED CT, LOINC, RxNorm, and SOAP/POMR documentation style.
- Anchor each mapping to available EMR fields when present (for example: demographics, visits.current_stage, vitals.*, consultations.*, lab_results.*, prescriptions.*, admissions.*, referrals.*, billing_*).
- Clearly separate chart evidence from external-standard guidance.
- If required mapping data is missing, explicitly state: "Missing standard-mapping data: <field/module>".

RESPONSE MODE SELECTION:
1. Greeting or small-talk query (for example: "hi", "hello", "thanks"):
  - Reply in 1-2 short sentences.
  - Do NOT output clinical sections, tables, timelines, or recommendations.
2. Focused chart query (for example: "latest vitals", "last consultation plan"):
  - Answer only what was asked.
  - Keep output concise and relevant.
  - Include only the minimum sections/tables needed for that specific question.
3. Comprehensive summary/review query (for example: "full summary", "patient overview", "chart review"):
  - Use the structured format below.

STRUCTURED FORMAT (only for comprehensive summary/review queries):
## Patient Snapshot
- Name / EMR / Sex / Age
- Current encounter ID and stage (if available)
- Active problem focus and top risk flags

## Vitals (Table)
| Date | BP | HR | RR | Temp | SpO2 | Notes |

## Consultations (Table)
| Date | Encounter ID | Clinician | Key Assessment | Plan | Status |

## Lab Results (Table)
| Date | Test | Result | Reference Range | Status | Clinical Note |

## Patient Timeline
- Use chronological bullets with dates and concise events.
- Preferred style example:
  Feb 7 2026 - Vitals recorded
  Feb 5 - Feb 16 2026 - Consultations recorded
  Mar 8 2026 - Consultation recorded
  Mar 11 2026 - Vitals recorded

## Data Inconsistencies
- List contradictions, duplicates, missing links, impossible sequences, or missing encounter mappings.
- Use ⚠️ for caution and ❌ for clear inconsistency.

## Key Findings
- Clinician-friendly bullet summary of the most important clinical facts.

## Clinical Recommendation
- Provide concise, practical recommendations only when supported by chart data.
- If insufficient data, state: "📭 Insufficient evidence in chart for recommendation."

## Data Quality Notice
- Always include when records are incomplete, inconsistent, sparse, or partially linked.
- Use 📭 when data appears incomplete.

ADDITIONAL RULES:
- Convert raw timestamps to human-readable dates.
- Mention encounter IDs when discussing encounter-linked records.
- For no relevant results, return: "📭 No records found for this query."
- For chart-based clinical answers, end with: "⚕️ AI-generated summary - verify with clinical records before making clinical decisions."`;

const CLINICAL_GLOBAL_SYSTEM_PROMPT = `You are XenoCare Medical AI Assistant supporting cross-patient EMR analysis for authorized clinicians.

GLOBAL MODE RULES:
- Scope can include multiple patients and modules across the EMR.
- Use only supplied chart evidence. Do not invent identities, dates, values, diagnoses, medications, or outcomes.
- Keep reasoning internal; output only findings and actionable content.
- If records are incomplete, explicitly list missing data by module.

MODULE COVERAGE REQUIREMENT:
- When user requests complete/all-patient extraction, cover all available modules:
  demographics, encounters/visits, consultations/clinical notes, diagnoses, procedures,
  medications/prescriptions, pharmacy/dispensing, laboratory results, radiology/imaging,
  vital signs, allergies, immunizations, and documents/attachments where present.
- Do not skip modules that are present in context.

EMBEDDING PREPARATION MODE (trigger when user asks for embedding-ready data, chunking, structured records, or all records extraction):
- Do NOT generate embeddings. Prepare high-quality semantically rich input text only.
- Convert structured data into clinically meaningful human-readable statements.
- Every record/chunk must preserve context: what happened, when it happened, and clinical significance.
- Include dates, units, and relationships between records whenever available.
- Chunk logically so each chunk remains meaningful on its own.
- Link each record to identifiers: patient_id, encounter_id (if applicable), source_table, source_id.
- Include metadata fields where available: diagnosis, procedure_type, medication_class, lab_category, severity/status.
- Full coverage guarantee: process all available patient records and do not skip modules present in context.
- Update support: prioritize the latest record state and avoid stale duplicates.
- Consistency: keep phrasing and chunk structure standardized across modules.
- Avoid duplicate chunks unless there is material new information.

REQUIRED OUTPUT FORMAT FOR EMBEDDING PREPARATION MODE:
Return structured records (JSON array or markdown table) with fields:
- patient_id
- encounter_id
- source_table
- source_id
- chunk_text
- chunk_type
- record_date
- metadata

GLOBAL STANDARDS MAPPING:
- When asked, provide standards-aware analysis using HL7 FHIR, ICD-10, SNOMED CT, LOINC, RxNorm, and SOAP/POMR conventions.
- Relate standards explicitly to the existing EMR field set and module names found in context.
- Distinguish "Chart evidence" from "Standards guidance" in the response.
- If a standards element cannot be mapped from available data, call out the exact missing field/module.

RESPONSE STYLE:
- Start directly with data/findings; avoid process narration.
- Use structured markdown or JSON based on user request.
- Include identifiers only when present in provided context.
- For no relevant records, return: "📭 No records found for this query scope."

SAFETY:
- Do not provide definitive diagnosis without adequate supporting evidence.
- End clinical summaries with: "⚕️ AI-generated summary - verify with clinical records before making clinical decisions."`;

const PHARMACY_SYSTEM_PROMPT = `SYSTEM PROMPT: PHARMACY AI - PRECISE RESPONSE MODE

You are a Pharmacy AI assistant. Your role is to support pharmacists with medication management, dispensing, inventory, audits, and financial summaries.

IMPORTANT: When responding to user queries:

1. Only answer exactly what is asked.
2. Do not include extra tables, timelines, risk flags, recommendations, or narrative summaries unless explicitly requested.
3. If the question expects a numeric, list, or short answer, provide only that.
4. Keep answers concise and to the point.
5. Use one-line clarifications only if necessary (e.g., "5 active batches currently in stock").
6. Do not make assumptions beyond the data relevant to the query.
7. Do not include information from unrelated pharmacy modules or patient records.
8. Use structured tables only if the user explicitly asks for them.

EXAMPLES:

- Question: "How many active batches do we have?"
  Response: "5 active batches currently in stock."

- Question: "List drugs below minimum stock level."
  Response:
  | Drug | Stock | Minimum Level |
  |------|-------|---------------|
  | Paracetamol | 30 | 40 |
  | Insulin | 10 | 20 |

- Question: "What are the dispensing issues?"
  Response: Short bullets only, e.g.:
  - Payment unverified for 3 prescriptions
  - 2 medications out-of-stock

ALWAYS follow these rules unless explicitly instructed to provide full summaries or dashboards.

Your goal: precise, pharmacist-focused answers with no extra information.`;

function resolveSystemPrompt(
  scope?: AIQueryRequest['assistantScope'],
  options?: { isGlobalClinical?: boolean },
): string {
  if (scope === 'pharmacy') {
    return PHARMACY_SYSTEM_PROMPT;
  }
  if (options?.isGlobalClinical) {
    return CLINICAL_GLOBAL_SYSTEM_PROMPT;
  }
  return CLINICAL_SYSTEM_PROMPT;
}

// =============================================================================
// In-memory patient context cache (avoids re-fetching for consecutive queries)
// =============================================================================

const contextCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

const aiRequestRateLimit = new Map<
  string,
  { windowStart: number; count: number; lastRequestAt: number }
>();
const RATE_LIMIT_WINDOW_MS =
  Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX_REQUESTS =
  Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 12;
const RATE_LIMIT_MIN_INTERVAL_MS =
  Number(process.env.AI_RATE_LIMIT_MIN_INTERVAL_MS) || 1500;

function buildRateLimitKey(req: AIQueryRequest): string {
  const scope = req.assistantScope || 'clinical';
  const user = req.userId || 'anonymous';
  const facility = req.facilityId || 'unknown-facility';
  return `${facility}:${user}:${scope}`;
}

function enforceAIRequestRateLimit(req: AIQueryRequest): void {
  const now = Date.now();
  const key = buildRateLimitKey(req);
  const current = aiRequestRateLimit.get(key);

  if (!current) {
    aiRequestRateLimit.set(key, {
      windowStart: now,
      count: 1,
      lastRequestAt: now,
    });
    return;
  }

  const timeSinceLastRequest = now - current.lastRequestAt;
  if (timeSinceLastRequest < RATE_LIMIT_MIN_INTERVAL_MS) {
    const waitMs = RATE_LIMIT_MIN_INTERVAL_MS - timeSinceLastRequest;
    throw new Error(
      `Please wait ${Math.max(1, Math.ceil(waitMs / 1000))}s before sending another AI request.`,
    );
  }

  const inSameWindow = now - current.windowStart < RATE_LIMIT_WINDOW_MS;
  if (!inSameWindow) {
    aiRequestRateLimit.set(key, {
      windowStart: now,
      count: 1,
      lastRequestAt: now,
    });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - current.windowStart);
    throw new Error(
      `Rate limit reached (${RATE_LIMIT_MAX_REQUESTS} requests per minute). Try again in ${Math.max(1, Math.ceil(retryAfterMs / 1000))}s.`,
    );
  }

  current.count += 1;
  current.lastRequestAt = now;
  aiRequestRateLimit.set(key, current);
}

type AIShortcutIntent = 'greeting' | 'acknowledgement';

const GREETING_PHRASES = new Set([
  'hi',
  'hello',
  'hey',
  'yo',
  'sup',
  'good morning',
  'good afternoon',
  'good evening',
  'greetings',
]);

const ACKNOWLEDGEMENT_PHRASES = new Set([
  'thanks',
  'thank you',
  'ok',
  'okay',
  'alright',
]);

const GREETING_TOKENS = new Set([
  'hi',
  'hello',
  'hey',
  'yo',
  'sup',
  'good',
  'morning',
  'afternoon',
  'evening',
  'greetings',
]);

function normalizeIntentText(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectShortcutIntent(query: string): AIShortcutIntent | null {
  const normalized = normalizeIntentText(query);
  if (!normalized) return null;

  if (GREETING_PHRASES.has(normalized)) return 'greeting';
  if (ACKNOWLEDGEMENT_PHRASES.has(normalized)) return 'acknowledgement';

  const tokens = normalized.split(' ');
  if (
    tokens.length > 0 &&
    tokens.length <= 3 &&
    tokens.every((token) => GREETING_TOKENS.has(token))
  ) {
    return 'greeting';
  }

  return null;
}

const GLOBAL_CLINICAL_INTENT =
  /\b(all\s+patients?|every\s+patient|across\s+(all\s+)?patients?|hospital\s*[- ]?wide|entire\s+emr|whole\s+emr|all\s+(encounters?|visits?|charts?)|global\s+(clinical|summary|report)|population\s*[- ]?level|system\s*[- ]?wide|any\s+patients?\s+records?)\b/i;

function detectGlobalClinicalIntent(query: string): boolean {
  const normalized = normalizeIntentText(query);
  if (!normalized) return false;
  return GLOBAL_CLINICAL_INTENT.test(normalized);
}

function buildShortcutResponse(
  scope: AIQueryRequest['assistantScope'],
  intent: AIShortcutIntent,
): string {
  if (intent === 'acknowledgement') {
    return 'You are welcome. Ask another question anytime.';
  }

  if (scope === 'pharmacy') {
    return 'Hi. I can help with dispensing queues, stock levels, and pharmacy billing checks. Ask a specific pharmacy question.';
  }

  return 'Hi. I can help with patient chart review, vitals, consultations, labs, and timeline checks. Ask a focused question or request a full patient summary.';
}

function buildConversationHistoryContext(
  history: AIQueryRequest['conversationHistory'],
): string {
  if (!history || history.length === 0) return '';

  const recentTurns = history.slice(-6);
  const lines = recentTurns
    .map((turn, idx) => {
      const q = String(turn.query || '').trim();
      const a = String(turn.answer || '').trim();
      return `Turn ${idx + 1}\nDoctor: ${q}\nAssistant: ${a}`;
    })
    .filter((line) => line.includes('Doctor:') || line.includes('Assistant:'));

  if (lines.length === 0) return '';
  return `# PRIOR CONVERSATION CONTEXT\n\n${lines.join('\n\n')}`;
}

// =============================================================================
// Comprehensive Patient Context Fetcher (REST-based, PARALLEL)
// =============================================================================

/**
 * Fetches ALL clinical data for a patient via Supabase REST API and returns
 * a structured text "chart" for inclusion in the LLM system prompt.
 *
 * Uses two parallel batches:
 *   Phase 1 — demographics + encounters + all patient_id-based queries
 *   Phase 2 — all encounter_id-based queries (needs encounter IDs from phase 1)
 *
 * Includes staff attribution (doctor/nurse names) via FK joins.
 */
async function fetchComprehensivePatientContext(
  patientId: string,
  config: LLMConfig,
): Promise<string> {
  const traceId = createTraceId(
    'AIContext',
    'fetchComprehensivePatientContext',
  );
  const stepMetrics: Record<string, number> = {};

  const trackStep = (
    step: string,
    durationMs: number,
    payload: unknown,
    extra: Record<string, unknown> = {},
  ): void => {
    stepMetrics[toMetricKey(step)] = Math.round(durationMs);
    logOperationDuration({
      module: 'AIContext',
      action: 'fetchComprehensivePatientContext',
      step,
      duration_ms: durationMs,
      trace_id: traceId,
      patient_id: patientId,
      payload_bytes: estimatePayloadBytes(payload),
      ...extra,
    });
  };

  // ── Cache check ──
  const cached = contextCache.get(patientId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    trackStep('cache_hit', 0, cached.text, {
      cache_age_seconds: Math.round((Date.now() - cached.ts) / 1000),
    });
    return cached.text;
  }

  const t0 = Date.now();

  const headers = {
    'Content-Type': 'application/json',
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
  };
  const base = config.supabaseUrl;
  const sections: string[] = [];

  function getEndpoint(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  // Helper: safe fetch a URL, return parsed JSON or empty array
  async function safeFetch<T = Record<string, unknown>[]>(
    url: string,
    step: string,
    extra: Record<string, unknown> = {},
  ): Promise<T> {
    const stepStartedAt = Date.now();
    try {
      const resp = await fetch(url, { headers });
      const responseBody = await resp.text();
      const payloadBytes = Buffer.byteLength(responseBody || '', 'utf8');
      const durationMs = Date.now() - stepStartedAt;

      if (!resp.ok) {
        trackStep(step, durationMs, [], {
          ...extra,
          endpoint: getEndpoint(url),
          status: resp.status,
          payload_bytes: payloadBytes,
        });
        return [] as unknown as T;
      }

      let parsed: unknown = [];
      if (responseBody) {
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = [];
        }
      }

      trackStep(step, durationMs, parsed, {
        ...extra,
        endpoint: getEndpoint(url),
        status: resp.status,
        payload_bytes: payloadBytes,
      });

      return parsed as T;
    } catch (error) {
      const durationMs = Date.now() - stepStartedAt;
      trackStep(step, durationMs, [], {
        ...extra,
        endpoint: getEndpoint(url),
        error: error instanceof Error ? error.message : String(error),
      });
      return [] as unknown as T;
    }
  }

  // Helper: truncate text
  function trunc(text: unknown, max = 300): string {
    if (!text) return '';
    const s = String(text);
    return s.length > max ? `${s.substring(0, max)}…` : s;
  }

  // Helper: format ISO date/timestamp to human-readable form
  // e.g. "2026-02-08T23:41:20.529+00:00" → "Saturday, Feb 8, 2026 at 11:41 PM"
  // e.g. "2026-02-08" → "Saturday, Feb 8, 2026"
  function fmtDate(value: unknown): string {
    if (!value) return 'Unknown date';
    try {
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return String(value);
      const str = String(value);
      // Date-only (no time component): "Saturday, Feb 8, 2026"
      if (str.length <= 10 || /^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      // Full timestamp: "Saturday, Feb 8, 2026 at 11:41 PM"
      return `${d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })} at ${d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`;
    } catch {
      return String(value);
    }
  }

  // Mapping: encounter uuid → human-readable visit_id (ENC-YYYYMMDD-XXXX)
  const encounterIdToVisitId: Record<string, string> = {};

  // ============================================================================
  // PHASE 1 — Parallel: demographics + encounters + patient_id-based queries
  // ============================================================================

  const [
    patients,
    encounters,
    vitals,
    admissions,
    nursingNotes,
    procedures,
    referrals,
    triage,
    dpn,
  ] = await Promise.all([
    // 1. Demographics
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/patients?id=eq.${patientId}&select=first_name,middle_name,surname,emr_number,gender,date_of_birth,blood_group,known_allergies,contact_phone,patient_category,insurance_type,nhis_number,occupation,clinical_summary,current_status,nok_name,nok_phone,nok_relationship`,
      'phase1_patients_query',
      { phase: 'phase_1' },
    ),
    // 2. Encounters
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/visits?patient_id=eq.${patientId}&select=id,visit_id,encounter_date,visit_type,chief_complaint,status,encounter_category,current_stage,ward_location,bed_number,discharge_date,discharge_notes,attending_doctor:staff!attending_doctor_id(first_name,last_name),clinic:clinics!clinic_id(name)&order=encounter_date.desc.nullsfirst&limit=25`,
      'phase1_encounters_query',
      { phase: 'phase_1' },
    ),
    // 3. Vitals (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/vitals?patient_id=eq.${patientId}&select=date_recorded,temperature,blood_pressure,blood_pressure_systolic,blood_pressure_diastolic,pulse,respiratory_rate,oxygen_saturation,weight,height,bmi,blood_glucose,pain_level,is_critical,notes,nurse:staff!nurse_id(first_name,last_name)&order=date_recorded.desc.nullsfirst&limit=20`,
      'phase1_vitals_query',
      { phase: 'phase_1' },
    ),
    // 4. Admissions (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/admissions?patient_id=eq.${patientId}&select=id,admission_number,admission_date,actual_discharge_date,admission_type,admission_status,acuity_level,chief_complaint,reason_for_admission,admitting_diagnosis,admitting_diagnosis_icd10,secondary_diagnoses,discharge_diagnosis,discharge_summary,discharge_instructions,discharge_medications,code_status,diet_type,activity_level,isolation_required,notes,admitting_doctor:staff!admitting_doctor_id(first_name,last_name),attending_physician:staff!attending_physician_id(first_name,last_name),primary_nurse:staff!primary_nurse_id(first_name,last_name),ward:wards!current_ward_id(name)&order=admission_date.desc&limit=10`,
      'phase1_admissions_query',
      { phase: 'phase_1' },
    ),
    // 5. Nursing Notes (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/nursing_notes?patient_id=eq.${patientId}&select=id,encounter_id,note_type,title,content,patient_condition,pain_level,interventions_performed,patient_response,is_critical,shift,created_at,nurse:staff!recorded_by(first_name,last_name),reviewer:staff!doctor_reviewed_by(first_name,last_name),doctor_reviewed_at&order=created_at.desc&limit=15`,
      'phase1_nursing_notes_query',
      { phase: 'phase_1' },
    ),
    // 6. Procedures (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/procedures?patient_id=eq.${patientId}&select=procedure_number,procedure_name,procedure_code,scheduled_date,actual_start_time,actual_end_time,status,priority,indication,pre_procedure_diagnosis,post_procedure_diagnosis,anesthesia_type,procedure_notes,findings,complications,estimated_blood_loss_ml,post_op_instructions,surgeon:staff!primary_surgeon_id(first_name,last_name),anesthesiologist:staff!anesthesiologist_id(first_name,last_name)&order=scheduled_date.desc.nullsfirst&limit=10`,
      'phase1_procedures_query',
      { phase: 'phase_1' },
    ),
    // 7. Referrals (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/referrals?patient_id=eq.${patientId}&select=referral_number,referral_type,priority,status,reason_for_referral,clinical_summary,created_at,referring:staff!referring_physician_id(first_name,last_name),receiving:staff!receiving_physician_id(first_name,last_name),source_dept:departments!source_department_id(name),target_dept:departments!target_department_id(name)&order=created_at.desc&limit=10`,
      'phase1_referrals_query',
      { phase: 'phase_1' },
    ),
    // 8. Triage (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/triage_assessments?patient_id=eq.${patientId}&select=created_at,chief_complaint_text,triage_level,triage_color,temperature,blood_pressure_systolic,blood_pressure_diastolic,pulse_rate,respiratory_rate,oxygen_saturation,weight,pain_score,consciousness,triaged_by_staff:staff!triaged_by(first_name,last_name)&order=created_at.desc&limit=10`,
      'phase1_triage_query',
      { phase: 'phase_1' },
    ),
    // 9. Daily Progress Notes (patient_id)
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/daily_progress_notes?patient_id=eq.${patientId}&select=note_date,subjective,objective,assessment,plan,nursing_summary,vital_signs_summary,patient_condition,alert_level,oral_intake_ml,iv_intake_ml,urine_output_ml,recorded_by_staff:staff!recorded_by(first_name,last_name)&order=note_date.desc&limit=10`,
      'phase1_daily_progress_notes_query',
      { phase: 'phase_1' },
    ),
  ]);

  const phase1Ms = Date.now() - t0;
  trackStep('phase1_parallel_total', phase1Ms, encounters, {
    phase: 'phase_1',
    encounter_count: encounters.length,
  });
  const phase1AssemblyStartedAt = Date.now();

  // ── Build demographics section ──
  const p = patients[0];
  if (p) {
    const dob = p.date_of_birth ? new Date(String(p.date_of_birth)) : null;
    const age = dob
      ? Math.floor((Date.now() - dob.getTime()) / 31557600000)
      : 'Unknown';
    const allergies =
      Array.isArray(p.known_allergies) && p.known_allergies.length > 0
        ? (p.known_allergies as string[]).join(', ')
        : 'NKDA (No Known Drug Allergies)';
    sections.push(
      `## PATIENT DEMOGRAPHICS\n` +
        `- **Name**: ${p.first_name || ''} ${p.middle_name || ''} ${p.surname || ''}\n` +
        `- **EMR**: ${p.emr_number || 'N/A'} | **Gender**: ${p.gender || 'N/A'} | **Age**: ${age} years | **DOB**: ${p.date_of_birth || 'N/A'}\n` +
        `- **Blood Group**: ${p.blood_group || 'Not recorded'}\n` +
        `- **Allergies**: ⚠️ ${allergies}\n` +
        `- **Status**: ${p.current_status || 'N/A'} | **Category**: ${p.patient_category || 'N/A'} | **Insurance**: ${p.insurance_type || 'N/A'}\n${
          p.clinical_summary
            ? `- **Clinical Summary**: ${trunc(p.clinical_summary)}\n`
            : ''
        }- **NOK**: ${p.nok_name || 'N/A'} (${p.nok_relationship || 'N/A'}) — ${p.nok_phone || 'N/A'}`,
    );
  }

  // ── Build encounters section + extract encounter IDs ──
  const encounterIds: string[] = [];
  if (encounters.length > 0) {
    encounters.forEach((e) => {
      if (e.id) encounterIds.push(String(e.id));
      if (e.id && e.visit_id)
        encounterIdToVisitId[String(e.id)] = String(e.visit_id);
    });
    const lines = encounters.map((e, i) => {
      const doc = e.attending_doctor as Record<string, string> | null;
      const clinic = e.clinic as Record<string, string> | null;
      const docName = doc ? `${doc.first_name} ${doc.last_name}` : 'Unassigned';
      return `${i + 1}. **Encounter ${e.visit_id || 'N/A'}** — ${fmtDate(e.encounter_date)} | ${e.visit_type || e.encounter_category || 'Visit'} | Dr. ${docName}${clinic?.name ? ` | ${clinic.name}` : ''} | Complaint: ${e.chief_complaint || 'N/A'} | Stage: ${e.current_stage || e.status || 'N/A'}${e.discharge_date ? ` | Discharged: ${fmtDate(e.discharge_date)}` : ''}`;
    });
    sections.push(
      `## ENCOUNTERS (${encounters.length} total)\n${lines.join('\n')}`,
    );
  }

  // ── Build vitals section ──
  if (vitals.length > 0) {
    const rows = vitals.map((v) => {
      const nurse = v.nurse as Record<string, string> | null;
      const bp =
        v.blood_pressure ||
        (v.blood_pressure_systolic
          ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
          : '');
      return `| ${fmtDate(v.date_recorded)} | ${v.temperature || '-'} | ${bp || '-'} | ${v.pulse || '-'} | ${v.respiratory_rate || '-'} | ${v.oxygen_saturation || '-'} | ${v.blood_glucose || '-'} | ${v.pain_level ?? '-'} | ${nurse ? `${nurse.first_name} ${nurse.last_name}` : '?'} |${v.is_critical ? ' ⚠️ CRITICAL' : ''}`;
    });
    sections.push(
      `## VITALS (${vitals.length} readings)\n` +
        `| Date | Temp(°C) | BP(mmHg) | HR(bpm) | RR(/min) | SpO2(%) | Glu | Pain | Nurse |\n` +
        `|------|----------|----------|---------|----------|---------|-----|------|-------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  // ── Build admissions section ──
  if (admissions.length > 0) {
    const blocks = admissions.map((a) => {
      const admDoc = a.admitting_doctor as Record<string, string> | null;
      const attDoc = a.attending_physician as Record<string, string> | null;
      const nurse = a.primary_nurse as Record<string, string> | null;
      const ward = a.ward as Record<string, string> | null;
      const parts = [
        `### Admission ${a.admission_number || ''} — ${fmtDate(a.admission_date)} — ${a.admission_status || '?'}`,
        `- **Type**: ${a.admission_type || '?'} | **Acuity**: ${a.acuity_level || '?'} | **Ward**: ${ward?.name || 'N/A'}`,
        `- **Admitting Doctor**: ${admDoc ? `Dr. ${admDoc.first_name} ${admDoc.last_name}` : 'Unknown'}`,
      ];
      if (attDoc)
        parts.push(
          `- **Attending Physician**: Dr. ${attDoc.first_name} ${attDoc.last_name}`,
        );
      if (nurse)
        parts.push(
          `- **Primary Nurse**: ${nurse.first_name} ${nurse.last_name}`,
        );
      if (a.chief_complaint || a.reason_for_admission)
        parts.push(
          `- **Reason**: ${a.chief_complaint || a.reason_for_admission}`,
        );
      parts.push(
        `- **Admitting Dx**: ${a.admitting_diagnosis || 'N/A'}${a.admitting_diagnosis_icd10 ? ` (${a.admitting_diagnosis_icd10})` : ''}`,
      );
      if (a.discharge_diagnosis)
        parts.push(`- **Discharge Dx**: ${a.discharge_diagnosis}`);
      if (a.discharge_summary)
        parts.push(
          `- **Discharge Summary**: ${trunc(a.discharge_summary, 400)}`,
        );
      if (a.code_status) parts.push(`- **Code Status**: ${a.code_status}`);
      if (a.isolation_required) parts.push(`- ⚠️ **ISOLATION REQUIRED**`);
      if (a.actual_discharge_date)
        parts.push(`- **Discharged**: ${fmtDate(a.actual_discharge_date)}`);
      return parts.join('\n');
    });
    sections.push(
      `## ADMISSIONS (${admissions.length})\n${blocks.join('\n\n')}`,
    );
  }

  // ── Build nursing notes section ──
  if (nursingNotes.length > 0) {
    const blocks = nursingNotes.map((n) => {
      const nurse = n.nurse as Record<string, string> | null;
      const reviewer = n.reviewer as Record<string, string> | null;
      const encLabel = n.encounter_id
        ? encounterIdToVisitId[String(n.encounter_id)] || ''
        : '';
      const parts = [
        `**[${fmtDate(n.created_at)}]** ${n.note_type || 'Note'} — Nurse: ${nurse ? `${nurse.first_name} ${nurse.last_name}` : 'Unknown'}${n.shift ? ` (${n.shift} shift)` : ''}${encLabel ? ` — Encounter: ${encLabel}` : ''}${n.is_critical ? ' ⚠️ CRITICAL' : ''}`,
      ];
      if (n.title) parts.push(`  Title: ${n.title}`);
      if (n.content) parts.push(`  ${trunc(n.content, 250)}`);
      if (n.patient_condition)
        parts.push(
          `  Condition: ${n.patient_condition}${n.pain_level != null ? `, Pain: ${n.pain_level}/10` : ''}`,
        );
      if (n.interventions_performed)
        parts.push(`  Interventions: ${trunc(n.interventions_performed, 200)}`);
      if (n.patient_response)
        parts.push(`  Response: ${trunc(n.patient_response, 200)}`);
      if (reviewer)
        parts.push(
          `  Reviewed by Dr. ${reviewer.first_name} ${reviewer.last_name} at ${fmtDate(n.doctor_reviewed_at)}`,
        );
      return parts.join('\n');
    });
    sections.push(
      `## NURSING NOTES (${nursingNotes.length})\n${blocks.join('\n')}`,
    );
  }

  // ── Build procedures section ──
  if (procedures.length > 0) {
    const blocks = procedures.map((proc) => {
      const surgeon = proc.surgeon as Record<string, string> | null;
      const anesth = proc.anesthesiologist as Record<string, string> | null;
      const parts = [
        `### ${proc.procedure_name || 'Procedure'} — ${fmtDate(proc.scheduled_date || proc.actual_start_time)} — ${proc.status || '?'}`,
      ];
      parts.push(
        `- **Surgeon**: ${surgeon ? `Dr. ${surgeon.first_name} ${surgeon.last_name}` : 'Unknown'}${anesth ? ` | **Anaesthesia**: Dr. ${anesth.first_name} ${anesth.last_name} (${proc.anesthesia_type || 'N/A'})` : ''}`,
      );
      if (proc.indication)
        parts.push(`- **Indication**: ${trunc(proc.indication)}`);
      if (proc.findings) parts.push(`- **Findings**: ${trunc(proc.findings)}`);
      if (proc.procedure_notes)
        parts.push(`- **Notes**: ${trunc(proc.procedure_notes)}`);
      if (proc.complications)
        parts.push(`- ⚠️ **Complications**: ${trunc(proc.complications)}`);
      if (proc.estimated_blood_loss_ml)
        parts.push(`- **EBL**: ${proc.estimated_blood_loss_ml}ml`);
      if (proc.post_op_instructions)
        parts.push(`- **Post-op**: ${trunc(proc.post_op_instructions)}`);
      return parts.join('\n');
    });
    sections.push(
      `## PROCEDURES (${procedures.length})\n${blocks.join('\n\n')}`,
    );
  }

  // ── Build referrals section ──
  if (referrals.length > 0) {
    const lines = referrals.map((r) => {
      const ref = r.referring as Record<string, string> | null;
      const rec = r.receiving as Record<string, string> | null;
      const srcDept = r.source_dept as Record<string, string> | null;
      const tgtDept = r.target_dept as Record<string, string> | null;
      return `- **[${fmtDate(r.created_at)}]** ${r.referral_type || 'Referral'} (${r.priority || 'Routine'}) — ${r.status || '?'}\n  From: ${ref ? `Dr. ${ref.first_name} ${ref.last_name}` : '?'}${srcDept?.name ? ` (${srcDept.name})` : ''} → To: ${rec ? `Dr. ${rec.first_name} ${rec.last_name}` : '?'}${tgtDept?.name ? ` (${tgtDept.name})` : ''}\n  Reason: ${trunc(r.reason_for_referral, 200)}`;
    });
    sections.push(`## REFERRALS (${referrals.length})\n${lines.join('\n')}`);
  }

  // ── Build triage section ──
  if (triage.length > 0) {
    const lines = triage.map((t) => {
      const triager = t.triaged_by_staff as Record<string, string> | null;
      return `- **[${fmtDate(t.created_at)}]** Level ${t.triage_level || '?'} (${t.triage_color || '?'}) — Complaint: ${t.chief_complaint_text || 'N/A'} | BP: ${t.blood_pressure_systolic || '-'}/${t.blood_pressure_diastolic || '-'} | HR: ${t.pulse_rate || '-'} | SpO2: ${t.oxygen_saturation || '-'}% | Pain: ${t.pain_score ?? '-'}/10 | By: ${triager ? `${triager.first_name} ${triager.last_name}` : '?'}`;
    });
    sections.push(
      `## TRIAGE ASSESSMENTS (${triage.length})\n${lines.join('\n')}`,
    );
  }

  // ── Build daily progress notes section ──
  if (dpn.length > 0) {
    const blocks = dpn.map((d) => {
      const recorder = d.recorded_by_staff as Record<string, string> | null;
      const parts = [
        `### ${fmtDate(d.note_date)} — ${recorder ? `${recorder.first_name} ${recorder.last_name}` : 'Unknown'} — Condition: ${d.patient_condition || 'N/A'}${d.alert_level && d.alert_level !== 'normal' ? ` ⚠️ Alert: ${d.alert_level}` : ''}`,
      ];
      if (d.subjective) parts.push(`- **S**: ${trunc(d.subjective)}`);
      if (d.objective) parts.push(`- **O**: ${trunc(d.objective)}`);
      if (d.assessment) parts.push(`- **A**: ${trunc(d.assessment)}`);
      if (d.plan) parts.push(`- **P**: ${trunc(d.plan)}`);
      if (d.nursing_summary)
        parts.push(`- **Nursing**: ${trunc(d.nursing_summary)}`);
      const ioTotal =
        (Number(d.oral_intake_ml) || 0) + (Number(d.iv_intake_ml) || 0);
      if (ioTotal > 0 || Number(d.urine_output_ml) > 0)
        parts.push(
          `- **I/O**: Intake ${ioTotal}ml (Oral: ${d.oral_intake_ml || 0}, IV: ${d.iv_intake_ml || 0}) | Output: ${d.urine_output_ml || 0}ml`,
        );
      return parts.join('\n');
    });
    sections.push(
      `## DAILY PROGRESS NOTES (${dpn.length})\n${blocks.join('\n\n')}`,
    );
  }

  trackStep(
    'phase1_context_assembly',
    Date.now() - phase1AssemblyStartedAt,
    sections,
    {
      phase: 'phase_1',
      section_count: sections.length,
    },
  );

  // ============================================================================
  // PHASE 2 — Parallel: encounter_id-based queries (needs encounter IDs)
  // ============================================================================

  if (encounterIds.length === 0) {
    sections.push('\n_No encounters found — limited clinical data available._');
    const result = sections.join('\n\n');
    contextCache.set(patientId, { text: result, ts: Date.now() });
    const totalMs = Date.now() - t0;
    logOperationSummary({
      module: 'AIContext',
      action: 'fetchComprehensivePatientContext',
      total_duration_ms: totalMs,
      trace_id: traceId,
      patient_id: patientId,
      payload_bytes: estimatePayloadBytes(result),
      phase_1_ms: phase1Ms,
      phase_2_skipped: true,
      ...stepMetrics,
    });
    return result;
  }

  const encFilter = `encounter_id=in.(${encounterIds.join(',')})`;
  const t1 = Date.now();

  const [consultations, labs, rads, meds, wrNotes] = await Promise.all([
    // Consultations
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/consultations?${encFilter}&select=consultation_id,encounter_id,consultation_date,complaints,history_of_present_illness,past_medical_history,family_history,social_history,review_of_systems,examination_findings,physical_examination,assessment,plan,treatment_plan,diagnosis,diagnosis_text,differential_diagnosis,icd10_codes,clinical_notes,recommendations,follow_up_date,follow_up_notes,status,doctor:staff!doctor_id(first_name,last_name)&order=consultation_date.desc.nullsfirst&limit=20`,
      'phase2_consultations_query',
      { phase: 'phase_2', encounter_count: encounterIds.length },
    ),
    // Labs
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/lab_requests?${encFilter}&select=request_id,encounter_id,created_at,status,priority,is_critical,clinical_notes,result_value,result_unit,reference_range,interpretation,result_notes,result_date,test:lab_test_catalogue!test_id(name),ordered_by_staff:staff!ordered_by(first_name,last_name)&order=created_at.desc&limit=30`,
      'phase2_labs_query',
      { phase: 'phase_2', encounter_count: encounterIds.length },
    ),
    // Radiology
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/radiology_requests?${encFilter}&select=request_id,encounter_id,created_at,imaging_type,body_part,clinical_indication,clinical_history,status,priority,findings,impression,report,ordered_by_staff:staff!ordered_by(first_name,last_name)&order=created_at.desc&limit=20`,
      'phase2_radiology_query',
      { phase: 'phase_2', encounter_count: encounterIds.length },
    ),
    // Prescriptions
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/prescriptions?${encFilter}&select=prescription_id,encounter_id,created_at,drug_name,dosage,frequency,duration,route,quantity_prescribed,quantity_dispensed,instructions,status,clinical_notes,drug:drug_catalogue!drug_id(name),doctor:staff!doctor_id(first_name,last_name)&order=created_at.desc&limit=30`,
      'phase2_prescriptions_query',
      { phase: 'phase_2', encounter_count: encounterIds.length },
    ),
    // Ward Round Notes
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/ward_round_notes?encounter_id=in.(${encounterIds.join(',')})&select=id,round_date,round_type,subjective_notes,objective_findings,assessment,plan,nursing_instructions,patient_condition,estimated_discharge_date,physician:staff!attending_physician_id(first_name,last_name),created_by_staff:staff!created_by(first_name,last_name),participants&order=round_date.desc&limit=15`,
      'phase2_ward_round_notes_query',
      { phase: 'phase_2', encounter_count: encounterIds.length },
    ),
  ]);

  const phase2Ms = Date.now() - t1;
  trackStep(
    'phase2_parallel_total',
    phase2Ms,
    {
      consultations,
      labs,
      rads,
      meds,
      wrNotes,
    },
    {
      phase: 'phase_2',
      consultations_count: consultations.length,
      labs_count: labs.length,
      radiology_count: rads.length,
      prescriptions_count: meds.length,
      ward_round_notes_count: wrNotes.length,
    },
  );
  const phase2AssemblyStartedAt = Date.now();

  // ── Build consultations section ──
  if (consultations.length > 0) {
    const blocks = consultations.map((c) => {
      const doc = c.doctor as Record<string, string> | null;
      const docName = doc
        ? `Dr. ${doc.first_name} ${doc.last_name}`
        : 'Unknown Doctor';
      const encLabel = c.encounter_id
        ? encounterIdToVisitId[String(c.encounter_id)] || ''
        : '';
      const parts = [
        `### Consultation — ${fmtDate(c.consultation_date)} — ${docName}${encLabel ? ` — Encounter: ${encLabel}` : ''}`,
      ];
      if (c.complaints) parts.push(`- **Complaints**: ${trunc(c.complaints)}`);
      if (c.history_of_present_illness)
        parts.push(`- **HPI**: ${trunc(c.history_of_present_illness)}`);
      if (c.past_medical_history)
        parts.push(`- **PMH**: ${trunc(c.past_medical_history)}`);
      if (c.family_history)
        parts.push(`- **Family Hx**: ${trunc(c.family_history)}`);
      if (c.social_history)
        parts.push(`- **Social Hx**: ${trunc(c.social_history)}`);
      if (c.review_of_systems)
        parts.push(`- **ROS**: ${trunc(c.review_of_systems)}`);
      if (c.examination_findings || c.physical_examination)
        parts.push(
          `- **Examination**: ${trunc(c.examination_findings || c.physical_examination)}`,
        );
      if (c.assessment) parts.push(`- **Assessment**: ${trunc(c.assessment)}`);
      if (c.plan || c.treatment_plan)
        parts.push(`- **Plan**: ${trunc(c.plan || c.treatment_plan)}`);
      if (c.diagnosis_text || c.diagnosis)
        parts.push(
          `- **Diagnosis**: ${c.diagnosis_text || (Array.isArray(c.diagnosis) ? (c.diagnosis as string[]).join(', ') : c.diagnosis)}`,
        );
      if (
        c.icd10_codes &&
        Array.isArray(c.icd10_codes) &&
        (c.icd10_codes as unknown[]).length > 0
      )
        parts.push(`- **ICD-10**: ${JSON.stringify(c.icd10_codes)}`);
      if (c.clinical_notes)
        parts.push(`- **Notes**: ${trunc(c.clinical_notes)}`);
      if (c.recommendations)
        parts.push(`- **Recommendations**: ${trunc(c.recommendations)}`);
      if (c.follow_up_date)
        parts.push(
          `- **Follow-up**: ${fmtDate(c.follow_up_date)}${c.follow_up_notes ? ` — ${trunc(c.follow_up_notes, 100)}` : ''}`,
        );
      return parts.join('\n');
    });
    sections.push(
      `## CONSULTATIONS (${consultations.length})\n${blocks.join('\n\n')}`,
    );
  }

  // ── Build labs section ──
  if (labs.length > 0) {
    const rows = labs.map((l) => {
      const test = l.test as Record<string, string> | null;
      const doc = l.ordered_by_staff as Record<string, string> | null;
      const val = l.result_value != null ? String(l.result_value) : 'Pending';
      const encLabel = l.encounter_id
        ? encounterIdToVisitId[String(l.encounter_id)] || ''
        : '';
      return `| ${fmtDate(l.created_at)} | ${test?.name || 'Unknown'} | ${val}${l.result_unit ? ` ${l.result_unit}` : ''} | ${l.reference_range || '-'} | ${l.status || '?'} | ${l.interpretation || '-'} | ${doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '?'} | ${encLabel} |${l.is_critical ? ' ⚠️' : ''}`;
    });
    sections.push(
      `## LAB RESULTS (${labs.length})\n` +
        `| Date | Test | Result | Ref Range | Status | Interpretation | Ordered By | Encounter |\n` +
        `|------|------|--------|-----------|--------|----------------|------------|-----------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  // ── Build radiology section ──
  if (rads.length > 0) {
    const blocks = rads.map((r) => {
      const doc = r.ordered_by_staff as Record<string, string> | null;
      const encLabel = r.encounter_id
        ? encounterIdToVisitId[String(r.encounter_id)] || ''
        : '';
      const parts = [
        `### ${r.imaging_type || 'Imaging'} — ${r.body_part || ''} — ${fmtDate(r.created_at)} — Ordered by ${doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Unknown'}${encLabel ? ` — Encounter: ${encLabel}` : ''}`,
      ];
      parts.push(
        `- **Status**: ${r.status || '?'} | **Priority**: ${r.priority || 'Normal'}`,
      );
      if (r.clinical_indication)
        parts.push(`- **Indication**: ${trunc(r.clinical_indication)}`);
      if (r.findings) parts.push(`- **Findings**: ${trunc(r.findings)}`);
      if (r.impression) parts.push(`- **Impression**: ${trunc(r.impression)}`);
      if (r.report) parts.push(`- **Report**: ${trunc(r.report, 400)}`);
      return parts.join('\n');
    });
    sections.push(
      `## RADIOLOGY / IMAGING (${rads.length})\n${blocks.join('\n\n')}`,
    );
  }

  // ── Build medications section ──
  if (meds.length > 0) {
    const rows = meds.map((m) => {
      const drugCat = m.drug as Record<string, string> | null;
      const doc = m.doctor as Record<string, string> | null;
      const name = m.drug_name || drugCat?.name || 'Unknown';
      const encLabel = m.encounter_id
        ? encounterIdToVisitId[String(m.encounter_id)] || ''
        : '';
      return `| ${fmtDate(m.created_at)} | ${name} | ${m.dosage || '-'} | ${m.route || '-'} | ${m.frequency || '-'} | ${m.duration || '-'} | ${m.status || '?'} | ${doc ? `Dr. ${doc.first_name} ${doc.last_name}` : '?'} | ${encLabel} |`;
    });
    sections.push(
      `## MEDICATIONS / PRESCRIPTIONS (${meds.length})\n` +
        `| Date | Drug | Dose | Route | Frequency | Duration | Status | Prescribed By | Encounter |\n` +
        `|------|------|------|-------|-----------|----------|--------|---------------|-----------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  // ── Build ward round notes section ──
  if (wrNotes.length > 0) {
    const blocks = wrNotes.map((w) => {
      const physician = w.physician as Record<string, string> | null;
      const creator = w.created_by_staff as Record<string, string> | null;
      const parts = [
        `### Ward Round — ${fmtDate(w.round_date)} — ${w.round_type || 'Morning round'} — ${physician ? `Dr. ${physician.first_name} ${physician.last_name}` : creator ? `Dr. ${creator.first_name} ${creator.last_name}` : 'Unknown'}`,
      ];
      if (w.subjective_notes)
        parts.push(`- **S**: ${trunc(w.subjective_notes)}`);
      if (w.objective_findings)
        parts.push(`- **O**: ${trunc(w.objective_findings)}`);
      if (w.assessment) parts.push(`- **A**: ${trunc(w.assessment)}`);
      if (w.plan) parts.push(`- **P**: ${trunc(w.plan)}`);
      if (w.nursing_instructions)
        parts.push(
          `- **Nursing Instructions**: ${trunc(w.nursing_instructions)}`,
        );
      if (w.patient_condition)
        parts.push(`- **Condition**: ${w.patient_condition}`);
      return parts.join('\n');
    });
    sections.push(
      `## WARD ROUND NOTES (${wrNotes.length})\n${blocks.join('\n\n')}`,
    );
  }

  trackStep(
    'phase2_context_assembly',
    Date.now() - phase2AssemblyStartedAt,
    sections,
    {
      phase: 'phase_2',
      section_count: sections.length,
    },
  );

  const totalMs = Date.now() - t0;
  const result = sections.join('\n\n');
  contextCache.set(patientId, { text: result, ts: Date.now() });
  logOperationSummary({
    module: 'AIContext',
    action: 'fetchComprehensivePatientContext',
    total_duration_ms: totalMs,
    trace_id: traceId,
    patient_id: patientId,
    payload_bytes: estimatePayloadBytes(result),
    phase_1_ms: phase1Ms,
    phase_2_ms: phase2Ms,
    context_chars: result.length,
    ...stepMetrics,
  });
  return result;
}

interface PharmacyContextResult {
  contextText: string;
  sources: Record<string, unknown>[];
  hasData: boolean;
}

interface ClinicalGlobalContextResult {
  contextText: string;
  sources: Record<string, unknown>[];
  hasData: boolean;
}

function extractQueryKeywords(queryText: string): string[] {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'that',
    'this',
    'what',
    'which',
    'show',
    'list',
    'give',
    'about',
    'drug',
    'drugs',
    'medication',
    'medications',
    'pharmacy',
    'patient',
    'records',
    'record',
    'status',
    'check',
    'find',
    'all',
    'recent',
  ]);

  return queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .slice(0, 8);
}

function textMatchesKeywords(value: unknown, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const text = String(value || '').toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

function formatDisplayDate(value: unknown): string {
  if (!value) return '-';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchPharmacyOperationalContext(
  config: LLMConfig,
  queryText: string,
  options: { patientId?: string; maxRows?: number } = {},
): Promise<PharmacyContextResult> {
  const startedAt = Date.now();
  const traceId = createTraceId('AIContext', 'fetchPharmacyOperationalContext');
  const stepMetrics: Record<string, number> = {};
  const { patientId } = options;
  const maxRows = Math.max(10, options.maxRows || 30);
  const keywords = extractQueryKeywords(queryText);

  const trackStep = (
    step: string,
    durationMs: number,
    payload: unknown,
    extra: Record<string, unknown> = {},
  ): void => {
    stepMetrics[toMetricKey(step)] = Math.round(durationMs);
    logOperationDuration({
      module: 'AIContext',
      action: 'fetchPharmacyOperationalContext',
      step,
      duration_ms: durationMs,
      trace_id: traceId,
      patient_id: patientId,
      payload_bytes: estimatePayloadBytes(payload),
      ...extra,
    });
  };

  const headers = {
    'Content-Type': 'application/json',
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
  };
  const base = config.supabaseUrl;

  async function safeFetchWithMeta<T = Record<string, unknown>[]>(
    url: string,
  ): Promise<{ ok: boolean; data: T }> {
    const stepStartedAt = Date.now();
    const endpoint = endpointFromUrl(url);
    try {
      const resp = await fetch(url, { headers });
      const bodyText = await resp.text();
      const payloadBytes = Buffer.byteLength(bodyText || '', 'utf8');
      if (!resp.ok) {
        trackStep('pharmacy_context_request', Date.now() - stepStartedAt, [], {
          endpoint,
          status: resp.status,
          payload_bytes: payloadBytes,
        });
        return { ok: false, data: [] as unknown as T };
      }

      let parsed: unknown = [];
      if (bodyText) {
        try {
          parsed = JSON.parse(bodyText);
        } catch {
          parsed = [];
        }
      }

      trackStep(
        'pharmacy_context_request',
        Date.now() - stepStartedAt,
        parsed,
        {
          endpoint,
          status: resp.status,
          payload_bytes: payloadBytes,
        },
      );
      return { ok: true, data: parsed as T };
    } catch {
      trackStep('pharmacy_context_request', Date.now() - stepStartedAt, [], {
        endpoint,
        error: 'request_failed',
      });
      return { ok: false, data: [] as unknown as T };
    }
  }

  async function safeFetch<T = Record<string, unknown>[]>(
    url: string,
  ): Promise<T> {
    const result = await safeFetchWithMeta<T>(url);
    return result.data;
  }

  async function safeFetchWithFallback<T = Record<string, unknown>[]>(
    primaryUrl: string,
    fallbackUrl: string,
    label: string,
  ): Promise<T> {
    const fallbackStartedAt = Date.now();
    const primary = await safeFetchWithMeta<T>(primaryUrl);
    if (primary.ok) {
      trackStep(
        'pharmacy_context_fallback_resolution',
        Date.now() - fallbackStartedAt,
        primary.data,
        {
          fallback_used: false,
          label,
        },
      );
      return primary.data;
    }

    log.warn(
      `[AI Service] ${label} query failed with extended schema; retrying with fallback columns.`,
    );
    const fallbackResult = await safeFetch<T>(fallbackUrl);
    trackStep(
      'pharmacy_context_fallback_resolution',
      Date.now() - fallbackStartedAt,
      fallbackResult,
      {
        fallback_used: true,
        label,
      },
    );
    return fallbackResult;
  }

  function buildInFilter(values: string[]): string {
    return values.map((value) => encodeURIComponent(value)).join(',');
  }

  const patientFilter = patientId
    ? `&patient_id=eq.${encodeURIComponent(patientId)}`
    : '';
  const pharmacyRowsLimit = Math.max(40, maxRows * 2);

  const prescriptionSelectExtended =
    'prescription_id,patient_id,encounter_id,created_at,drug_id,drug_name,dosage,frequency,route,quantity_prescribed,quantity_dispensed,status,nhis_approval_status,payment_verified_at,billing_release_status,execution_status,clinical_notes,notes';
  const prescriptionSelectFallback =
    'prescription_id,patient_id,encounter_id,created_at,drug_id,drug_name,dosage,frequency,route,quantity_prescribed,quantity_dispensed,status,payment_verified_at,notes';
  const billingSelectExtended =
    'billing_order_id,service_reference_id,status,verification_status,patient_payable,nhis_payable,created_at';
  const billingSelectFallback =
    'billing_order_id,service_reference_id,status,patient_payable,nhis_payable,created_at';
  const financialLookbackDays = 7;
  const financialRangeStartIso = new Date(
    Date.now() - financialLookbackDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    prescriptions,
    dispenses,
    inventorySummary,
    nearExpiryRows,
    stockMovements,
    pharmacyBillingItemsRecent,
  ] = await Promise.all([
    safeFetchWithFallback<Record<string, unknown>[]>(
      `${base}/rest/v1/prescriptions?select=${prescriptionSelectExtended}&order=created_at.desc&limit=${pharmacyRowsLimit}${patientFilter}`,
      `${base}/rest/v1/prescriptions?select=${prescriptionSelectFallback}&order=created_at.desc&limit=${pharmacyRowsLimit}${patientFilter}`,
      'Prescriptions',
    ),
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/dispense_records?select=dispense_id,prescription_id,patient_id,drug_id,batch_id,quantity_dispensed,dispensed_at,status,is_substitution,substitution_reason,notes&order=dispensed_at.desc&limit=${pharmacyRowsLimit}${patientFilter}`,
    ),
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/v_drug_inventory_summary?select=drug_id,drug_code,drug_name,total_stock,reorder_level,stock_status,batch_count,earliest_expiry,expiring_soon_qty,selling_price&order=total_stock.asc&limit=400`,
    ),
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/v_near_expiry_drugs?select=batch_id,drug_id,drug_code,drug_name,batch_number,quantity_remaining,expiry_date,days_to_expiry,urgency_level&order=expiry_date.asc&limit=120`,
    ),
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/inventory_stock_movements?select=movement_id,drug_id,patient_id,movement_type,quantity,reference_number,created_at,reason,notes&order=created_at.desc&limit=${pharmacyRowsLimit}${patientFilter}`,
    ),
    safeFetch<Record<string, unknown>[]>(
      `${base}/rest/v1/billing_items?select=id,billing_order_id,item_type,item_name,total_price,patient_payable,nhis_payable,status,created_at&item_type=eq.Pharmacy&created_at=gte.${encodeURIComponent(financialRangeStartIso)}&order=created_at.desc&limit=2000`,
    ),
  ]);

  const patientIds = Array.from(
    new Set(
      [...prescriptions, ...dispenses]
        .map((row) => row.patient_id)
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0,
        ),
    ),
  ).slice(0, 120);

  const patients =
    patientIds.length > 0
      ? await safeFetch<Record<string, unknown>[]>(
          `${base}/rest/v1/patients?select=patient_id,first_name,surname,emr_number&patient_id=in.(${buildInFilter(patientIds)})`,
        )
      : [];
  const patientMap = new Map<string, Record<string, unknown>>();
  patients.forEach((patient) => {
    const id = patient.patient_id;
    if (typeof id === 'string') patientMap.set(id, patient);
  });

  const drugIds = Array.from(
    new Set(
      [...prescriptions, ...dispenses, ...stockMovements]
        .map((row) => row.drug_id)
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0,
        ),
    ),
  ).slice(0, 200);

  const catalogueRows =
    drugIds.length > 0
      ? await safeFetch<Record<string, unknown>[]>(
          `${base}/rest/v1/drug_catalogue?select=id,name,code&id=in.(${buildInFilter(drugIds)})`,
        )
      : [];
  const drugMap = new Map<string, Record<string, unknown>>();
  catalogueRows.forEach((drug) => {
    const { id } = drug;
    if (typeof id === 'string') drugMap.set(id, drug);
  });

  const prescriptionIds = prescriptions
    .map((row) => row.prescription_id)
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .slice(0, 120);

  const billingItems =
    prescriptionIds.length > 0
      ? await safeFetchWithFallback<Record<string, unknown>[]>(
          `${base}/rest/v1/billing_items?select=${billingSelectExtended}&service_reference_id=in.(${buildInFilter(prescriptionIds)})&limit=500`,
          `${base}/rest/v1/billing_items?select=${billingSelectFallback}&service_reference_id=in.(${buildInFilter(prescriptionIds)})&limit=500`,
          'Billing items',
        )
      : [];

  const billingOrderIds = Array.from(
    new Set(
      [...billingItems, ...pharmacyBillingItemsRecent]
        .map((item) => item.billing_order_id)
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0,
        ),
    ),
  );

  const billingOrders =
    billingOrderIds.length > 0
      ? await safeFetch<Record<string, unknown>[]>(
          `${base}/rest/v1/billing_orders?select=id,patient_id,status,payment_method,source_module,net_amount,paid_amount,balance_amount,nhis_covered,patient_payable,nhis_payable,created_at,updated_at&id=in.(${buildInFilter(billingOrderIds)})`,
        )
      : [];

  const billingOrderMap = new Map<string, Record<string, unknown>>();
  billingOrders.forEach((order) => {
    const { id } = order;
    if (typeof id === 'string') billingOrderMap.set(id, order);
  });
  const billingByPrescription = new Map<string, Record<string, unknown>>();
  billingItems.forEach((item) => {
    const ref = item.service_reference_id;
    if (typeof ref === 'string') billingByPrescription.set(ref, item);
  });

  const pharmacyFinancialRows = pharmacyBillingItemsRecent
    .filter((item) => {
      const orderId = item.billing_order_id;
      const order =
        typeof orderId === 'string' ? billingOrderMap.get(orderId) : undefined;
      if (!patientId) return true;
      if (!order?.patient_id) return false;
      return String(order.patient_id) === patientId;
    })
    .slice(0, 200);

  const focusedInventory = inventorySummary
    .filter((row) => {
      const name = row.drug_name || '';
      const code = row.drug_code || '';
      return textMatchesKeywords(`${name} ${code}`, keywords);
    })
    .slice(0, 40);
  const inventoryRows = (
    focusedInventory.length > 0
      ? focusedInventory
      : inventorySummary.filter((row) => {
          const status = String(row.stock_status || '');
          return (
            status === 'out_of_stock' ||
            status === 'low_stock' ||
            asNumber(row.expiring_soon_qty) > 0
          );
        })
  ).slice(0, 40);

  const focusedNearExpiry = nearExpiryRows
    .filter((row) =>
      textMatchesKeywords(
        `${row.drug_name || ''} ${row.drug_code || ''}`,
        keywords,
      ),
    )
    .slice(0, 20);
  const nearExpiry = (
    focusedNearExpiry.length > 0 ? focusedNearExpiry : nearExpiryRows
  ).slice(0, 20);

  const focusedPrescriptions = prescriptions
    .filter((row) =>
      textMatchesKeywords(
        `${row.drug_name || ''} ${row.clinical_notes || row.notes || ''} ${row.status || ''} ${row.nhis_approval_status || ''}`,
        keywords,
      ),
    )
    .slice(0, 40);
  const prescriptionRows = (
    focusedPrescriptions.length > 0 ? focusedPrescriptions : prescriptions
  ).slice(0, 40);

  const focusedDispenses = dispenses
    .filter((row) => {
      const drug = drugMap.get(String(row.drug_id || ''));
      const drugName = drug?.name || '';
      return textMatchesKeywords(
        `${drugName} ${row.status || ''} ${row.substitution_reason || ''}`,
        keywords,
      );
    })
    .slice(0, 30);
  const dispenseRows = (
    focusedDispenses.length > 0 ? focusedDispenses : dispenses
  ).slice(0, 30);

  const focusedMovements = stockMovements
    .filter((row) => {
      const drug = drugMap.get(String(row.drug_id || ''));
      const drugName = drug?.name || '';
      return textMatchesKeywords(
        `${drugName} ${row.movement_type || ''} ${row.reason || ''}`,
        keywords,
      );
    })
    .slice(0, 25);
  const movementRows = (
    focusedMovements.length > 0 ? focusedMovements : stockMovements
  ).slice(0, 25);

  const sections: string[] = [];
  const sources: Record<string, unknown>[] = [];

  const focusedPatient = patientId ? patientMap.get(patientId) : undefined;
  sections.push(
    `## PHARMACY QUERY SCOPE\n` +
      `- Mode: ${patientId ? 'Patient-narrowed pharmacy view' : 'Global pharmacy view'}\n` +
      `- Query focus keywords: ${keywords.length > 0 ? keywords.join(', ') : 'none extracted'}\n${
        focusedPatient
          ? `- Selected patient: ${focusedPatient.first_name || ''} ${focusedPatient.surname || ''} (${focusedPatient.emr_number || 'N/A'})`
          : '- Selected patient: None (all pharmacy records)'
      }`,
  );

  if (pharmacyFinancialRows.length > 0) {
    const financialTotals = pharmacyFinancialRows.reduce(
      (acc, item) => {
        const gross = asNumber(item.total_price);
        const patientPayable = asNumber(item.patient_payable);
        const nhisPayable = asNumber(item.nhis_payable);
        const statusText = String(item.status || '').toLowerCase();
        const paid =
          statusText === 'paid' ||
          statusText === 'completed' ||
          statusText === 'cleared' ||
          statusText === 'settled';

        acc.gross += gross;
        acc.patientPayable += patientPayable;
        acc.nhisPayable += nhisPayable;
        acc.transactions += 1;
        if (paid) acc.paid += gross;
        return acc;
      },
      { gross: 0, patientPayable: 0, nhisPayable: 0, paid: 0, transactions: 0 },
    );

    sections.push(
      `## Pharmacy Financial Summary (${financialLookbackDays} Days)\n` +
        `- Window start: ${formatDisplayDate(financialRangeStartIso)}\n` +
        `- Transactions: ${financialTotals.transactions}\n` +
        `- Gross billed amount: ${financialTotals.gross.toFixed(2)}\n` +
        `- Paid amount: ${financialTotals.paid.toFixed(2)}\n` +
        `- Patient payable: ${financialTotals.patientPayable.toFixed(2)}\n` +
        `- NHIS payable: ${financialTotals.nhisPayable.toFixed(2)}`,
    );

    const transactionRows = pharmacyFinancialRows.slice(0, 25).map((item) => {
      const orderId = item.billing_order_id;
      const order =
        typeof orderId === 'string' ? billingOrderMap.get(orderId) : undefined;
      const orderStatus = String(order?.status || '-');
      const paymentMethod = String(order?.payment_method || '-');

      sources.push({
        source_table: 'billing_items',
        source_id: item.id || item.billing_order_id || item.item_name,
        record_date: item.created_at || order?.updated_at || order?.created_at,
        content_snippet:
          `${item.item_name || '-'} gross=${asNumber(item.total_price).toFixed(2)} ` +
          `patient=${asNumber(item.patient_payable).toFixed(2)} nhis=${asNumber(item.nhis_payable).toFixed(2)} ` +
          `item_status=${item.status || '-'} order_status=${orderStatus}`,
      });

      return `| ${formatDisplayDate(item.created_at)} | ${item.item_name || '-'} | ${asNumber(item.total_price).toFixed(2)} | ${asNumber(item.patient_payable).toFixed(2)} | ${asNumber(item.nhis_payable).toFixed(2)} | ${item.status || '-'} | ${orderStatus} | ${paymentMethod} |`;
    });

    sections.push(
      `## Recent Pharmacy Billing Transactions\n` +
        `| Date | Item | Gross | Patient Payable | NHIS Payable | Item Status | Order Status | Method |\n` +
        `|------|------|-------|-----------------|--------------|-------------|--------------|--------|\n${transactionRows.join(
          '\n',
        )}`,
    );
  }

  if (inventoryRows.length > 0) {
    const rows = inventoryRows.map((item) => {
      const stock = asNumber(item.total_stock);
      const expiringSoon = asNumber(item.expiring_soon_qty);
      sources.push({
        source_table: 'v_drug_inventory_summary',
        source_id: item.drug_id || item.drug_code || item.drug_name,
        record_date: item.earliest_expiry || new Date().toISOString(),
        content_snippet: `${item.drug_name || 'Unknown'} stock=${stock} status=${item.stock_status || 'unknown'} expiring_soon=${expiringSoon}`,
      });
      return `| ${item.drug_name || '-'} | ${item.drug_code || '-'} | ${stock} | ${item.reorder_level || 0} | ${item.stock_status || '-'} | ${expiringSoon} | ${item.earliest_expiry || '-'} |`;
    });
    sections.push(
      `## Inventory Snapshot\n` +
        `| Drug | Code | Stock | Reorder | Status | Expiring <=90d | Earliest Expiry |\n` +
        `|------|------|-------|---------|--------|----------------|-----------------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  if (nearExpiry.length > 0) {
    const rows = nearExpiry.map((item) => {
      sources.push({
        source_table: 'v_near_expiry_drugs',
        source_id: item.batch_id,
        record_date: item.expiry_date,
        content_snippet: `${item.drug_name || 'Unknown'} batch ${item.batch_number || '-'} expires ${item.expiry_date || '-'}`,
      });
      return `| ${item.drug_name || '-'} | ${item.batch_number || '-'} | ${item.quantity_remaining || 0} | ${item.expiry_date || '-'} | ${item.days_to_expiry || '-'} | ${item.urgency_level || '-'} |`;
    });
    sections.push(
      `## Near Expiry Batches\n` +
        `| Drug | Batch | Qty Remaining | Expiry Date | Days To Expiry | Urgency |\n` +
        `|------|-------|---------------|-------------|----------------|---------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  if (prescriptionRows.length > 0) {
    const rows = prescriptionRows.map((rx) => {
      const patient = patientMap.get(String(rx.patient_id || ''));
      const patientLabel = patient
        ? `${patient.first_name || ''} ${patient.surname || ''}`.trim() ||
          'Unknown'
        : String(rx.patient_id || '-');
      const billingItem = billingByPrescription.get(
        String(rx.prescription_id || ''),
      );
      const billingOrder = billingItem?.billing_order_id
        ? billingOrderMap.get(String(billingItem.billing_order_id))
        : undefined;
      const billingStatus = billingOrder?.status || billingItem?.status || '-';

      sources.push({
        source_table: 'prescriptions',
        source_id: rx.prescription_id,
        encounter_id: rx.encounter_id,
        record_date: rx.created_at,
        content_snippet:
          `${rx.drug_name || 'Unknown'} prescribed=${rx.quantity_prescribed || 0} ` +
          `dispensed=${rx.quantity_dispensed || 0} status=${rx.status || '-'} ` +
          `nhis=${rx.nhis_approval_status || '-'} billing=${billingStatus}`,
      });

      return `| ${formatDisplayDate(rx.created_at)} | ${patientLabel} | ${rx.drug_name || '-'} | ${rx.quantity_prescribed || 0} / ${rx.quantity_dispensed || 0} | ${rx.status || '-'} | ${rx.nhis_approval_status || '-'} | ${rx.payment_verified_at ? 'verified' : 'unverified'} | ${billingStatus} |`;
    });

    sections.push(
      `## Prescription & Verification Status\n` +
        `| Date | Patient | Drug | Qty (P/D) | Rx Status | NHIS | Payment | Billing |\n` +
        `|------|---------|------|-----------|-----------|------|---------|---------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  if (dispenseRows.length > 0) {
    const rows = dispenseRows.map((dispense) => {
      const patient = patientMap.get(String(dispense.patient_id || ''));
      const patientLabel = patient
        ? `${patient.first_name || ''} ${patient.surname || ''}`.trim() ||
          'Unknown'
        : String(dispense.patient_id || '-');
      const drug = drugMap.get(String(dispense.drug_id || ''));
      const drugName = String(drug?.name || '-');

      sources.push({
        source_table: 'dispense_records',
        source_id: dispense.dispense_id,
        record_date: dispense.dispensed_at,
        content_snippet:
          `${drugName} qty=${dispense.quantity_dispensed || 0} status=${dispense.status || '-'} ` +
          `substitution=${dispense.is_substitution ? 'yes' : 'no'}`,
      });

      return `| ${formatDisplayDate(dispense.dispensed_at)} | ${patientLabel} | ${drugName} | ${dispense.quantity_dispensed || 0} | ${dispense.status || '-'} | ${dispense.batch_id || '-'} | ${dispense.is_substitution ? 'Yes' : 'No'} |`;
    });

    sections.push(
      `## Dispense Transactions\n` +
        `| Date | Patient | Drug | Qty | Dispense Status | Batch | Substitution |\n` +
        `|------|---------|------|-----|-----------------|-------|--------------|\n${rows.join(
          '\n',
        )}`,
    );
  }

  if (movementRows.length > 0) {
    const lines = movementRows.map((movement) => {
      const drug = drugMap.get(String(movement.drug_id || ''));
      const drugName = String(drug?.name || movement.drug_id || 'Unknown drug');
      sources.push({
        source_table: 'inventory_stock_movements',
        source_id: movement.movement_id,
        record_date: movement.created_at,
        content_snippet:
          `${movement.movement_type || '-'} ${movement.quantity || 0} for ${drugName} ` +
          `${movement.reason ? `reason=${movement.reason}` : ''}`,
      });
      return `- ${formatDisplayDate(movement.created_at)} | ${movement.movement_type || '-'} ${movement.quantity || 0} | ${drugName} | ${movement.reason || movement.notes || 'No reason provided'}`;
    });
    sections.push(`## Stock Movement Timeline\n${lines.join('\n')}`);
  }

  const hasData =
    inventoryRows.length > 0 ||
    nearExpiry.length > 0 ||
    prescriptionRows.length > 0 ||
    dispenseRows.length > 0 ||
    movementRows.length > 0 ||
    pharmacyFinancialRows.length > 0;

  if (!hasData) {
    sections.push(
      '## Data Availability\n- 📭 No pharmacy records were found for this scope and query focus.',
    );
  }

  const contextText = sections.join('\n\n');
  logOperationSummary({
    module: 'AIContext',
    action: 'fetchPharmacyOperationalContext',
    total_duration_ms: Date.now() - startedAt,
    trace_id: traceId,
    patient_id: patientId,
    payload_bytes: estimatePayloadBytes(contextText),
    has_data: hasData,
    source_count: sources.length,
    keyword_count: keywords.length,
    ...stepMetrics,
  });

  return {
    contextText,
    sources: sources.slice(0, 120),
    hasData,
  };
}

async function fetchGlobalClinicalOperationalContext(
  config: LLMConfig,
  queryText: string,
  options: { maxRows?: number } = {},
): Promise<ClinicalGlobalContextResult> {
  const maxRows = Math.max(20, options.maxRows || 40);
  const normalizedQuery = queryText.toLowerCase();
  const isAllPatientsSummaryQuery =
    /\b(all\s+patients?|every\s+patient|across\s+all\s+patients|all\s+medical\s+records?|full\s+detailed\s+clinical\s+records?|entire\s+medical\s+summary|full\s+medical\s+summary|complete\s+medical\s+summary|entire\s+emr|whole\s+emr|hospital\s*[- ]?wide\s+(summary|analysis|report)|global\s+clinical\s+summary|all\s+at\s+once)\b/i.test(
      normalizedQuery,
    );
  const effectiveMaxRows = isAllPatientsSummaryQuery
    ? Math.max(120, maxRows * 4)
    : maxRows;
  const keywords = isAllPatientsSummaryQuery
    ? []
    : extractQueryKeywords(queryText);
  const headers = {
    'Content-Type': 'application/json',
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
  };
  const base = config.supabaseUrl;

  async function safeFetch<T = Record<string, unknown>[]>(
    url: string,
  ): Promise<T> {
    try {
      const resp = await fetch(url, { headers });
      const body = await resp.text();
      if (!resp.ok) {
        return [] as unknown as T;
      }
      return body ? (JSON.parse(body) as T) : ([] as unknown as T);
    } catch {
      return [] as unknown as T;
    }
  }

  async function safeFetchPaged(
    buildUrl: (offset: number, limit: number) => string,
    options: { pageSize?: number; maxTotalRows?: number } = {},
  ): Promise<Record<string, unknown>[]> {
    const pageSize = Math.max(50, options.pageSize || 200);
    const maxTotalRows = Math.max(pageSize, options.maxTotalRows || 1200);
    const rows: Record<string, unknown>[] = [];
    let offset = 0;

    while (rows.length < maxTotalRows) {
      const remaining = maxTotalRows - rows.length;
      const limit = Math.min(pageSize, remaining);
      const batch = await safeFetch<Record<string, unknown>[]>(
        buildUrl(offset, limit),
      );
      if (!Array.isArray(batch) || batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }

    return rows;
  }

  const pagedPageSize = isAllPatientsSummaryQuery ? 250 : effectiveMaxRows;
  const pagedMaxTotal = isAllPatientsSummaryQuery
    ? Math.max(1200, effectiveMaxRows * 8)
    : effectiveMaxRows;

  const [
    rawVisits,
    consultations,
    labs,
    radiology,
    procedures,
    prescriptions,
    billingOrders,
  ] = await Promise.all([
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/visits?select=id,visit_id,patient_id,encounter_date,created_at,visit_type,chief_complaint,status,current_stage,attending_doctor:staff!attending_doctor_id(first_name,last_name,staff_id)&order=encounter_date.desc.nullsfirst&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/consultations?select=consultation_id,encounter_id,consultation_date,diagnosis_text,assessment,plan,clinical_notes,status,doctor:staff!doctor_id(first_name,last_name,staff_id)&order=consultation_date.desc.nullsfirst&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/lab_requests?select=request_id,encounter_id,created_at,status,priority,result_value,result_unit,interpretation,clinical_notes&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/radiology_requests?select=request_id,encounter_id,created_at,imaging_type,body_part,status,priority,findings,impression,clinical_indication&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/procedures?select=procedure_number,patient_id,encounter_id,scheduled_date,status,priority,procedure_name,procedure_code,findings,post_procedure_diagnosis,surgeon:staff!primary_surgeon_id(first_name,last_name,staff_id)&order=scheduled_date.desc.nullsfirst&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/prescriptions?select=prescription_id,encounter_id,patient_id,created_at,drug_name,dosage,route,frequency,quantity_prescribed,quantity_dispensed,status,nhis_approval_status,doctor:staff!doctor_id(first_name,last_name,staff_id)&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
    safeFetchPaged(
      (offset, limit) =>
        `${base}/rest/v1/billing_orders?select=id,patient_id,created_at,status,source_module,net_amount,paid_amount,balance_amount,nhis_covered,patient_payable,nhis_payable&order=created_at.desc&limit=${limit}&offset=${offset}`,
      { pageSize: pagedPageSize, maxTotalRows: pagedMaxTotal },
    ),
  ]);

  const rawVisitMap = new Map<string, Record<string, unknown>>();
  rawVisits.forEach((visit) => {
    if (typeof visit.id === 'string') rawVisitMap.set(visit.id, visit);
  });

  const encounterIdsFromModules = Array.from(
    new Set(
      [
        ...consultations.map((row) => row.encounter_id),
        ...labs.map((row) => row.encounter_id),
        ...radiology.map((row) => row.encounter_id),
        ...procedures.map((row) => row.encounter_id),
        ...prescriptions.map((row) => row.encounter_id),
      ].filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );

  const missingEncounterIds = encounterIdsFromModules
    .filter((encounterId) => !rawVisitMap.has(encounterId))
    .slice(0, 300);

  const supplementalVisits =
    missingEncounterIds.length > 0
      ? await safeFetch<Record<string, unknown>[]>(
          `${base}/rest/v1/visits?select=id,visit_id,patient_id,encounter_date,created_at,visit_type,chief_complaint,status,current_stage,attending_doctor:staff!attending_doctor_id(first_name,last_name,staff_id)&id=in.(${missingEncounterIds.map((id) => encodeURIComponent(id)).join(',')})&limit=${missingEncounterIds.length}`,
        )
      : [];

  const visitsById = new Map<string, Record<string, unknown>>();
  rawVisits.forEach((visit) => {
    if (typeof visit.id === 'string') visitsById.set(visit.id, visit);
  });
  supplementalVisits.forEach((visit) => {
    if (typeof visit.id === 'string') visitsById.set(visit.id, visit);
  });
  const visits = Array.from(visitsById.values());

  const patientIds = Array.from(
    new Set(
      [
        ...visits.map((row) => row.patient_id),
        ...procedures.map((row) => row.patient_id),
        ...prescriptions.map((row) => row.patient_id),
        ...billingOrders.map((row) => row.patient_id),
      ].filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ).slice(0, 200);

  const patientsById =
    patientIds.length > 0
      ? await safeFetch<Record<string, unknown>[]>(
          `${base}/rest/v1/patients?select=id,patient_id,first_name,surname,emr_number,gender,date_of_birth,insurance_type,nhis_number&id=in.(${patientIds.map((id) => encodeURIComponent(id)).join(',')})`,
        )
      : [];
  const patientsByPatientId =
    patientIds.length > 0
      ? await safeFetch<Record<string, unknown>[]>(
          `${base}/rest/v1/patients?select=id,patient_id,first_name,surname,emr_number,gender,date_of_birth,insurance_type,nhis_number&patient_id=in.(${patientIds.map((id) => encodeURIComponent(id)).join(',')})`,
        )
      : [];
  const patients = Array.from(
    new Map(
      [...patientsById, ...patientsByPatientId].map((row, index) => [
        String(row.id || row.patient_id || `row-${index}`),
        row,
      ]),
    ).values(),
  );

  const patientMap = new Map<string, Record<string, unknown>>();
  patients.forEach((patient) => {
    if (typeof patient.id === 'string') {
      patientMap.set(patient.id, patient);
    }
    if (typeof patient.patient_id === 'string') {
      patientMap.set(patient.patient_id, patient);
    }
  });

  const visitMap = new Map<string, Record<string, unknown>>();
  visits.forEach((visit) => {
    if (typeof visit.id === 'string') visitMap.set(visit.id, visit);
  });

  const getPatientLabel = (patientId: unknown): string => {
    if (!patientId || typeof patientId !== 'string') return 'Unknown patient';
    const patient = patientMap.get(patientId);
    if (!patient) return patientId;
    const name = [patient.first_name, patient.surname]
      .filter(Boolean)
      .join(' ')
      .trim();
    const emr = patient.emr_number ? ` (${patient.emr_number})` : '';
    return `${name || 'Unknown'}${emr}`;
  };

  const getPatientAge = (patientId: unknown): string => {
    if (!patientId || typeof patientId !== 'string') return 'Unknown';
    const patient = patientMap.get(patientId);
    const dobRaw = patient?.date_of_birth;
    if (!dobRaw) return 'Unknown';
    const dob = new Date(String(dobRaw));
    if (Number.isNaN(dob.getTime())) return 'Unknown';
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const beforeBirthday =
      now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
    if (beforeBirthday) years -= 1;
    return `${Math.max(0, years)}y`;
  };

  const getDoctorLabel = (doctor: unknown): string => {
    if (!doctor || typeof doctor !== 'object') return 'Unassigned';
    const row = doctor as Record<string, unknown>;
    const name = [row.first_name, row.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const staffCode =
      typeof row.staff_id === 'string' && row.staff_id
        ? ` (${row.staff_id})`
        : '';
    return `${name || 'Unassigned'}${staffCode}`;
  };

  const matchAny = (row: Record<string, unknown>, fields: string[]) => {
    if (keywords.length === 0) return true;
    return fields.some((field) => textMatchesKeywords(row[field], keywords));
  };

  const filteredVisits = visits.filter((row) =>
    matchAny(row, [
      'visit_id',
      'visit_type',
      'chief_complaint',
      'status',
      'current_stage',
    ]),
  );
  const filteredConsultations = consultations.filter((row) =>
    matchAny(row, [
      'diagnosis_text',
      'assessment',
      'plan',
      'clinical_notes',
      'status',
    ]),
  );
  const filteredLabs = labs.filter((row) =>
    matchAny(row, [
      'status',
      'priority',
      'interpretation',
      'clinical_notes',
      'result_value',
    ]),
  );
  const filteredRadiology = radiology.filter((row) =>
    matchAny(row, [
      'imaging_type',
      'body_part',
      'status',
      'findings',
      'impression',
      'clinical_indication',
    ]),
  );
  const filteredProcedures = procedures.filter((row) =>
    matchAny(row, [
      'procedure_name',
      'procedure_code',
      'status',
      'priority',
      'findings',
      'post_procedure_diagnosis',
    ]),
  );
  const filteredPrescriptions = prescriptions.filter((row) =>
    matchAny(row, [
      'drug_name',
      'status',
      'dosage',
      'route',
      'frequency',
      'nhis_approval_status',
    ]),
  );
  const filteredBilling = billingOrders.filter((row) =>
    matchAny(row, [
      'status',
      'source_module',
      'net_amount',
      'balance_amount',
      'nhis_covered',
    ]),
  );

  const detailRowsLimit = isAllPatientsSummaryQuery ? 120 : 20;
  const summaryRowsLimit = isAllPatientsSummaryQuery ? 200 : 30;
  const activityRowsLimit = isAllPatientsSummaryQuery ? 120 : 20;
  const sourceRowsLimit = isAllPatientsSummaryQuery ? 500 : 40;

  const sections: string[] = [];
  const sources: Record<string, unknown>[] = [];

  const consultationsByEncounter = new Map<string, Record<string, unknown>[]>();
  filteredConsultations.forEach((row) => {
    if (typeof row.encounter_id !== 'string') return;
    const list = consultationsByEncounter.get(row.encounter_id) || [];
    list.push(row);
    consultationsByEncounter.set(row.encounter_id, list);
  });

  const proceduresByEncounter = new Map<string, Record<string, unknown>[]>();
  filteredProcedures.forEach((row) => {
    if (typeof row.encounter_id !== 'string') return;
    const list = proceduresByEncounter.get(row.encounter_id) || [];
    list.push(row);
    proceduresByEncounter.set(row.encounter_id, list);
  });

  const prescriptionsByEncounter = new Map<string, Record<string, unknown>[]>();
  filteredPrescriptions.forEach((row) => {
    if (typeof row.encounter_id !== 'string') return;
    const list = prescriptionsByEncounter.get(row.encounter_id) || [];
    list.push(row);
    prescriptionsByEncounter.set(row.encounter_id, list);
  });

  const billingByPatient = new Map<string, Record<string, unknown>[]>();
  filteredBilling.forEach((row) => {
    if (typeof row.patient_id !== 'string') return;
    const list = billingByPatient.get(row.patient_id) || [];
    list.push(row);
    billingByPatient.set(row.patient_id, list);
  });

  if (filteredVisits.length > 0) {
    const summaryRows = filteredVisits
      .slice(0, summaryRowsLimit)
      .map((visit) => {
        const encounterId = typeof visit.id === 'string' ? visit.id : '';
        const encounterConsultations = encounterId
          ? consultationsByEncounter.get(encounterId) || []
          : [];
        const encounterProcedures = encounterId
          ? proceduresByEncounter.get(encounterId) || []
          : [];
        const encounterPrescriptions = encounterId
          ? prescriptionsByEncounter.get(encounterId) || []
          : [];
        const patientBilling =
          typeof visit.patient_id === 'string'
            ? billingByPatient.get(visit.patient_id) || []
            : [];
        const patientRecord = patientMap.get(String(visit.patient_id || ''));

        const dx =
          encounterConsultations
            .map((row) => String(row.diagnosis_text || '').trim())
            .find(Boolean) || 'N/A';
        const procedure =
          encounterProcedures
            .map((row) =>
              String(row.procedure_name || row.procedure_code || '').trim(),
            )
            .find(Boolean) || 'N/A';
        const meds =
          encounterPrescriptions
            .map((row) => String(row.drug_name || '').trim())
            .filter(Boolean)
            .slice(0, 3)
            .join(', ') || 'Not specified';

        const attendingFromVisit = getDoctorLabel(visit.attending_doctor);
        const attendingFromConsultation = getDoctorLabel(
          encounterConsultations[0]?.doctor,
        );
        const doctor =
          attendingFromVisit !== 'Unassigned'
            ? attendingFromVisit
            : attendingFromConsultation;

        const nhisCovered = patientBilling.some(
          (row) => row.nhis_covered === true,
        );
        const insuranceType = String(
          patientRecord?.insurance_type || '',
        ).toLowerCase();
        const hasInsuranceNhisMarker =
          insuranceType.includes('nhis') || Boolean(patientRecord?.nhis_number);
        const nhisStatus =
          nhisCovered || hasInsuranceNhisMarker
            ? 'NHIS Covered'
            : 'Non-NHIS/Unknown';

        return `| ${getPatientLabel(visit.patient_id)} | ${getPatientAge(visit.patient_id)} | ${patientRecord?.gender || 'Unknown'} | ${visit.visit_id || visit.id || '-'} | ${formatDisplayDate(visit.encounter_date || visit.created_at)} | ${doctor} | ${dx} | ${procedure} | ${meds} | ${nhisStatus} |`;
      });

    sections.push(
      `## Patient Encounter Summary\n` +
        `| Patient Name | Age | Gender | Encounter ID | Date | Doctor | Diagnosis | Procedure | Medication Administered | NHIS Status |\n` +
        `|--------------|-----|--------|--------------|------|--------|-----------|-----------|--------------------------|-------------|\n${summaryRows.join(
          '\n',
        )}`,
    );
  }

  if (filteredVisits.length > 0) {
    sections.push(
      `## Encounter Activity (${filteredVisits.length})\n${filteredVisits
        .slice(0, activityRowsLimit)
        .map((visit) => {
          const patientLabel = getPatientLabel(visit.patient_id);
          return `- ${formatDisplayDate(visit.encounter_date || visit.created_at)} | ${patientLabel} | Visit ${visit.visit_id || visit.id || '-'} | ${visit.visit_type || 'Visit'} | ${visit.current_stage || visit.status || '-'} | Complaint: ${visit.chief_complaint || 'N/A'}`;
        })
        .join('\n')}`,
    );
    filteredVisits.slice(0, sourceRowsLimit).forEach((visit) => {
      sources.push({
        source_table: 'visits',
        source_id: visit.id || visit.visit_id || 'unknown',
        record_date: visit.encounter_date || visit.created_at || null,
        snippet: `${visit.visit_type || 'Visit'} | ${visit.chief_complaint || 'No complaint'}`,
      });
    });
  }

  if (filteredConsultations.length > 0) {
    sections.push(
      `## Consultations (${filteredConsultations.length})\n${filteredConsultations
        .slice(0, detailRowsLimit)
        .map((row) => {
          const encounter =
            typeof row.encounter_id === 'string'
              ? visitMap.get(row.encounter_id)
              : null;
          const patientLabel = getPatientLabel(encounter?.patient_id);
          const doctor = getDoctorLabel(row.doctor);
          return `- ${formatDisplayDate(row.consultation_date)} | ${patientLabel} | ${doctor} | Dx: ${row.diagnosis_text || 'N/A'} | Assessment: ${String(row.assessment || '').slice(0, 120) || 'N/A'} | Plan: ${String(row.plan || '').slice(0, 120) || 'N/A'}`;
        })
        .join('\n')}`,
    );
    filteredConsultations.slice(0, sourceRowsLimit).forEach((row) => {
      sources.push({
        source_table: 'consultations',
        source_id: row.consultation_id || 'unknown',
        encounter_id: row.encounter_id || null,
        record_date: row.consultation_date || null,
        snippet: `${row.diagnosis_text || 'No diagnosis'} | ${String(row.assessment || '').slice(0, 180)}`,
      });
    });
  }

  if (filteredLabs.length > 0) {
    sections.push(
      `## Lab Records (${filteredLabs.length})\n${filteredLabs
        .slice(0, detailRowsLimit)
        .map((row) => {
          const encounter =
            typeof row.encounter_id === 'string'
              ? visitMap.get(row.encounter_id)
              : null;
          const patientLabel = getPatientLabel(encounter?.patient_id);
          return `- ${formatDisplayDate(row.created_at)} | ${patientLabel} | Status: ${row.status || '-'} | Priority: ${row.priority || '-'} | Result: ${row.result_value ?? 'Pending'}${row.result_unit ? ` ${row.result_unit}` : ''} | Interpretation: ${row.interpretation || 'N/A'}`;
        })
        .join('\n')}`,
    );
    filteredLabs.slice(0, sourceRowsLimit).forEach((row) => {
      sources.push({
        source_table: 'lab_requests',
        source_id: row.request_id || 'unknown',
        encounter_id: row.encounter_id || null,
        record_date: row.created_at || null,
        snippet: `${row.status || '-'} | ${row.interpretation || 'No interpretation'}`,
      });
    });
  }

  if (filteredRadiology.length > 0) {
    sections.push(
      `## Radiology Records (${filteredRadiology.length})\n${filteredRadiology
        .slice(0, detailRowsLimit)
        .map((row) => {
          const encounter =
            typeof row.encounter_id === 'string'
              ? visitMap.get(row.encounter_id)
              : null;
          const patientLabel = getPatientLabel(encounter?.patient_id);
          return `- ${formatDisplayDate(row.created_at)} | ${patientLabel} | ${row.imaging_type || 'Imaging'} ${row.body_part || ''} | ${row.status || '-'} | Impression: ${String(row.impression || '').slice(0, 140) || 'N/A'}`;
        })
        .join('\n')}`,
    );
    filteredRadiology.slice(0, sourceRowsLimit).forEach((row) => {
      sources.push({
        source_table: 'radiology_requests',
        source_id: row.request_id || 'unknown',
        encounter_id: row.encounter_id || null,
        record_date: row.created_at || null,
        snippet: `${row.imaging_type || 'Imaging'} | ${String(row.impression || '').slice(0, 180)}`,
      });
    });
  }

  if (filteredProcedures.length > 0) {
    sections.push(
      `## Procedures (${filteredProcedures.length})\n${filteredProcedures
        .slice(0, detailRowsLimit)
        .map((row) => {
          const patientLabel = getPatientLabel(row.patient_id);
          const surgeon = getDoctorLabel(row.surgeon);
          return `- ${formatDisplayDate(row.scheduled_date)} | ${patientLabel} | ${row.procedure_name || row.procedure_code || 'Procedure'} | ${surgeon} | ${row.status || '-'} | Priority: ${row.priority || '-'} | Findings: ${String(row.findings || '').slice(0, 120) || 'N/A'}`;
        })
        .join('\n')}`,
    );
    filteredProcedures.slice(0, sourceRowsLimit).forEach((row) => {
      sources.push({
        source_table: 'procedures',
        source_id: row.procedure_number || 'unknown',
        encounter_id: row.encounter_id || null,
        record_date: row.scheduled_date || null,
        snippet: `${row.procedure_name || row.procedure_code || 'Procedure'} | ${row.status || '-'}`,
      });
    });
  }

  if (filteredPrescriptions.length > 0) {
    sections.push(
      `## Medication Records (${filteredPrescriptions.length})\n${filteredPrescriptions
        .slice(0, detailRowsLimit)
        .map((row) => {
          const patientLabel = getPatientLabel(row.patient_id);
          const doctor = getDoctorLabel(row.doctor);
          return `- ${formatDisplayDate(row.created_at)} | ${patientLabel} | ${row.drug_name || 'Unknown drug'} | Dose: ${row.dosage || '-'} | Route: ${row.route || '-'} | Frequency: ${row.frequency || '-'} | Status: ${row.status || '-'} | NHIS: ${row.nhis_approval_status || 'Unknown'} | Prescriber: ${doctor}`;
        })
        .join('\n')}`,
    );

    filteredPrescriptions.slice(0, sourceRowsLimit).forEach((row) => {
      sources.push({
        source_table: 'prescriptions',
        source_id: row.prescription_id || 'unknown',
        encounter_id: row.encounter_id || null,
        record_date: row.created_at || null,
        snippet: `${row.drug_name || 'Unknown'} | ${row.status || '-'} | NHIS: ${row.nhis_approval_status || 'Unknown'}`,
      });
    });
  }

  if (filteredBilling.length > 0) {
    sections.push(
      `## Billing Records (${filteredBilling.length})\n${filteredBilling
        .slice(0, detailRowsLimit)
        .map((row) => {
          const patientLabel = getPatientLabel(row.patient_id);
          return `- ${formatDisplayDate(row.created_at)} | ${patientLabel} | ${row.source_module || 'Billing'} | Status: ${row.status || '-'} | Net: ${asNumber(row.net_amount, 0).toFixed(2)} | Paid: ${asNumber(row.paid_amount, 0).toFixed(2)} | Balance: ${asNumber(row.balance_amount, 0).toFixed(2)}`;
        })
        .join('\n')}`,
    );
    filteredBilling.slice(0, sourceRowsLimit).forEach((row) => {
      sources.push({
        source_table: 'billing_orders',
        source_id: row.id || 'unknown',
        record_date: row.created_at || null,
        snippet: `${row.source_module || 'Billing'} | ${row.status || '-'} | Balance: ${row.balance_amount ?? '-'}`,
      });
    });
  }

  if (sections.length === 0) {
    sections.push(
      '## Data Availability\n- 📭 No clinical records found for this global query scope.',
    );
  }

  return {
    contextText: sections.join('\n\n'),
    sources: sources.slice(0, isAllPatientsSummaryQuery ? 1200 : 240),
    hasData:
      sections.length > 0 && !sections[0].includes('No clinical records found'),
  };
}

// =============================================================================
// Handler Helpers
// =============================================================================

function wrapSuccess(data: unknown) {
  return { success: true, data };
}

function formatAIErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /operation was aborted|stream stalled|abort/i.test(message)
  ) {
    return 'Local Ollama request timed out before Phi-3 finished. Try a shorter, more specific question.';
  }
  return message;
}

function wrapError(error: unknown) {
  const message = formatAIErrorMessage(error);
  log.error('[AI Service]', message);
  return { success: false, error: message };
}

// =============================================================================
// Register IPC Handlers
// =============================================================================

export function registerAIHandlers(): void {
  log.info('[AI Service] Registering IPC handlers');

  const config = getAIConfig();

  // Initialise audit logger
  if (config.supabaseUrl && config.supabaseKey) {
    initAuditLogger(config.supabaseUrl, config.supabaseKey);
  }

  // ─── ai:query — hybrid search + LLM summarisation ────────────────────────
  ipcMain.handle('ai:query', async (_event, rawReq: unknown) => {
    const queryT0 = Date.now();
    const queryTraceId = createTraceId('AIQuery', 'ipc_query');
    let patientIdForLogs: string | undefined;
    try {
      const req = parseAIQueryRequest(rawReq, 'ai:query');
      patientIdForLogs = req.patientId;
      enforceAIRequestRateLimit(req);
      const shortcutIntent = detectShortcutIntent(req.query);
      if (shortcutIntent) {
        logOperationSummary({
          module: 'AIQuery',
          action: 'ipc_query',
          total_duration_ms: Date.now() - queryT0,
          trace_id: queryTraceId,
          patient_id: patientIdForLogs,
          status: 'shortcut',
        });
        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer: buildShortcutResponse(req.assistantScope, shortcutIntent),
              sources: [],
              confidence: 'HIGH',
              searchType: 'intent-shortcut',
              resultCount: 0,
            },
            'ai:query',
          ),
        );
      }

      const searchType = req.searchType || 'hybrid';
      const maxResults = req.maxResults || 10;
      const effectiveMaxResults = isConstrainedLocalOllama(config)
        ? Math.min(maxResults, LOCAL_OLLAMA_QUERY_MAX_RESULTS)
        : maxResults;
      const conversationContext = buildConversationHistoryContext(
        req.conversationHistory,
      );
      const isPharmacyScope = req.assistantScope === 'pharmacy';
      const isGlobalPharmacyQuery = isPharmacyScope && !req.patientId;
      const hasGlobalClinicalIntent =
        !isPharmacyScope && detectGlobalClinicalIntent(req.query);
      const isGlobalClinicalQuery =
        !isPharmacyScope && (!req.patientId || hasGlobalClinicalIntent);
      const globalClinicalMaxRows = isConstrainedLocalOllama(config)
        ? hasGlobalClinicalIntent
          ? LOCAL_OLLAMA_GLOBAL_WIDE_MAX_ROWS
          : LOCAL_OLLAMA_GLOBAL_MAX_ROWS
        : hasGlobalClinicalIntent
          ? Math.max(300, maxResults * 30)
          : Math.max(80, maxResults * 8);
      const systemPrompt = resolveSystemPrompt(req.assistantScope, {
        isGlobalClinical: isGlobalClinicalQuery,
      });

      let pharmacyContextResult: PharmacyContextResult | null = null;
      let globalClinicalContextResult: ClinicalGlobalContextResult | null =
        null;
      if (isPharmacyScope) {
        try {
          pharmacyContextResult = await fetchPharmacyOperationalContext(
            config,
            req.query,
            {
              patientId: req.patientId,
              maxRows: isConstrainedLocalOllama(config)
                ? LOCAL_OLLAMA_PHARMACY_MAX_ROWS
                : Math.max(30, maxResults * 3),
            },
          );
        } catch (pharmErr) {
          log.warn(
            '[AI Service] Pharmacy context fetch failed:',
            String(pharmErr),
          );
        }
      }

      if (isGlobalClinicalQuery) {
        try {
          globalClinicalContextResult =
            await fetchGlobalClinicalOperationalContext(config, req.query, {
              maxRows: globalClinicalMaxRows,
            });
        } catch (clinicalErr) {
          log.warn(
            '[AI Service] Global clinical context fetch failed:',
            String(clinicalErr),
          );
        }
      }

      if (isGlobalPharmacyQuery) {
        if (!pharmacyContextResult?.hasData) {
          logOperationSummary({
            module: 'AIQuery',
            action: 'ipc_query',
            total_duration_ms: Date.now() - queryT0,
            trace_id: queryTraceId,
            patient_id: patientIdForLogs,
            scope: 'pharmacy',
            status: 'no_data',
          });
          return wrapSuccess(
            validateResponse(
              aiQueryResponseSchema,
              {
                answer:
                  'No relevant pharmacy records were found for this query. Try refining the drug name, date, or transaction term.',
                sources: [],
                confidence: 'LOW',
                searchType: 'pharmacy-context',
                resultCount: 0,
              },
              'ai:query',
            ),
          );
        }

        const userContent = buildLLMUserContent(config, {
          pharmacyContext: pharmacyContextResult.contextText,
          conversationContext,
          questionLabel: "Pharmacist's Question",
          query: req.query,
        });

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          buildUserMessageWithAttachments(
            userContent,
            req.imageAttachments,
            config.provider,
          ),
        ];

        const llmT0 = Date.now();
        const llmResult = await chatCompletion(messages);
        const llmMs = Date.now() - llmT0;

        logAIInteraction({
          user_id: req.userId,
          patient_id: 'GLOBAL_PHARMACY',
          facility_id: req.facilityId,
          action_type: 'query',
          query_text: req.query,
          response_summary: llmResult.content.substring(0, 500),
          model_used: llmResult.model,
          tokens_used: llmResult.tokensUsed,
          search_type: 'pharmacy-context',
          result_count: pharmacyContextResult.sources.length,
        }).catch(() => {
          /* non-blocking */
        });

        logOperationSummary({
          module: 'AIQuery',
          action: 'ipc_query',
          total_duration_ms: Date.now() - queryT0,
          trace_id: queryTraceId,
          patient_id: patientIdForLogs,
          scope: 'pharmacy',
          llm_response_ms: llmMs,
          tokens_used: llmResult.tokensUsed,
          result_count: pharmacyContextResult.sources.length,
          payload_bytes: estimatePayloadBytes(llmResult.content),
        });

        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer: llmResult.content,
              sources: pharmacyContextResult.sources,
              confidence: pharmacyContextResult.hasData ? 'MEDIUM' : 'LOW',
              searchType: 'pharmacy-context',
              resultCount: pharmacyContextResult.sources.length,
              tokensUsed: llmResult.tokensUsed,
              model: llmResult.model,
            },
            'ai:query',
          ),
        );
      }

      if (isGlobalClinicalQuery) {
        if (
          !globalClinicalContextResult?.hasData &&
          (!req.imageAttachments || req.imageAttachments.length === 0)
        ) {
          logOperationSummary({
            module: 'AIQuery',
            action: 'ipc_query',
            total_duration_ms: Date.now() - queryT0,
            trace_id: queryTraceId,
            patient_id: patientIdForLogs,
            scope: 'clinical_global',
            status: 'no_data',
          });
          return wrapSuccess(
            validateResponse(
              aiQueryResponseSchema,
              {
                answer:
                  'No relevant clinical records were found for this global query. Try adding a date range, module name, or diagnosis keyword.',
                sources: [],
                confidence: 'LOW',
                searchType: 'clinical-global-context',
                resultCount: 0,
              },
              'ai:query',
            ),
          );
        }

        const userContent = buildLLMUserContent(config, {
          globalClinicalContext:
            globalClinicalContextResult?.contextText ||
            'No global records matched this query scope.',
          conversationContext,
          questionLabel: "Clinician's Question",
          query: req.query,
        });

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          buildUserMessageWithAttachments(
            userContent,
            req.imageAttachments,
            config.provider,
          ),
        ];

        const llmT0 = Date.now();
        const llmResult = await chatCompletion(messages);
        const llmMs = Date.now() - llmT0;

        logAIInteraction({
          user_id: req.userId,
          patient_id: 'GLOBAL_CLINICAL',
          facility_id: req.facilityId,
          action_type: 'query',
          query_text: req.query,
          response_summary: llmResult.content.substring(0, 500),
          model_used: llmResult.model,
          tokens_used: llmResult.tokensUsed,
          search_type: 'clinical-global-context',
          result_count: globalClinicalContextResult?.sources.length || 0,
        }).catch(() => {
          /* non-blocking */
        });

        logOperationSummary({
          module: 'AIQuery',
          action: 'ipc_query',
          total_duration_ms: Date.now() - queryT0,
          trace_id: queryTraceId,
          patient_id: patientIdForLogs,
          scope: 'clinical_global',
          llm_response_ms: llmMs,
          tokens_used: llmResult.tokensUsed,
          result_count: globalClinicalContextResult?.sources.length || 0,
          payload_bytes: estimatePayloadBytes(llmResult.content),
        });

        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer: llmResult.content,
              sources: globalClinicalContextResult?.sources || [],
              confidence: globalClinicalContextResult?.hasData
                ? 'MEDIUM'
                : 'LOW',
              searchType: 'clinical-global-context',
              resultCount: globalClinicalContextResult?.sources.length || 0,
              tokensUsed: llmResult.tokensUsed,
              model: llmResult.model,
            },
            'ai:query',
          ),
        );
      }

      const patientId = req.patientId as string;

      // 1. Fetch comprehensive patient context (runs in parallel with embedding)
      const contextPromise = fetchComprehensivePatientContext(
        patientId,
        config,
      );

      // 2. Generate embedding for the query (fall back to fulltext if embedding fails)
      let queryEmbedding: number[] = [];
      let effectiveSearchType = searchType;
      if (searchType !== 'fulltext') {
        try {
          queryEmbedding = await generateQueryEmbedding(req.query);
        } catch (embErr) {
          log.warn(
            '[AI Service] Embedding generation failed, falling back to fulltext:',
            String(embErr),
          );
          effectiveSearchType = 'fulltext';
        }
      }

      // 3. Search patient records (focused results for the specific query)
      const searchResults = await hybridSearch(
        patientId,
        req.query,
        queryEmbedding,
        effectiveSearchType,
        effectiveMaxResults,
        config,
      );

      // 4. Wait for comprehensive context
      let comprehensiveContext = '';
      try {
        comprehensiveContext = await contextPromise;
      } catch (ctxErr) {
        log.warn(
          '[AI Service] Comprehensive context fetch failed:',
          String(ctxErr),
        );
      }

      // 4b. If search returned nothing and we have no comprehensive context, try direct fallback
      if (
        (!searchResults || searchResults.length === 0) &&
        !comprehensiveContext &&
        !pharmacyContextResult?.hasData &&
        (!req.imageAttachments || req.imageAttachments.length === 0)
      ) {
        log.info('[AI Service] No results and no context — cannot answer');
        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer:
                'No relevant records were found for this query. The patient may not have records matching your search criteria, or the database may not be accessible.',
              sources: [],
              confidence: 'LOW',
              searchType,
              resultCount: 0,
            },
            'ai:query',
          ),
        );
      }

      // 5. Build context for LLM
      const searchContext =
        searchResults && searchResults.length > 0
          ? (searchResults as Record<string, unknown>[])
              .map(
                (r, i) =>
                  `[Search Result ${i + 1}] (table: ${r.source_table}, date: ${r.record_date || 'unknown'})\n${r.content_snippet || r.chunk_text || r.snippet || ''}`,
              )
              .join('\n\n---\n\n')
          : '';

      // 6. Build message with comprehensive context + search-specific results
      const userContent = buildLLMUserContent(config, {
        chartContext: comprehensiveContext,
        pharmacyContext: pharmacyContextResult?.hasData
          ? pharmacyContextResult.contextText
          : undefined,
        searchContext,
        searchResultCount: (searchResults || []).length,
        conversationContext,
        questionLabel: `${isPharmacyScope ? "Pharmacist's" : "Doctor's"} Question`,
        query: req.query,
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        buildUserMessageWithAttachments(
          userContent,
          req.imageAttachments,
          config.provider,
        ),
      ];

      const llmT0 = Date.now();
      const llmResult = await chatCompletion(messages);
      const llmMs = Date.now() - llmT0;
      logOperationSummary({
        module: 'AIQuery',
        action: 'ipc_query',
        total_duration_ms: Date.now() - queryT0,
        trace_id: queryTraceId,
        patient_id: patientId,
        llm_response_ms: llmMs,
        model: llmResult.model,
        tokens_used: llmResult.tokensUsed,
        search_result_count: (searchResults || []).length,
        context_chars: comprehensiveContext.length,
        payload_bytes: estimatePayloadBytes(llmResult.content),
      });

      // 7. Audit log (non-blocking)
      logAIInteraction({
        user_id: req.userId,
        patient_id: patientId,
        facility_id: req.facilityId,
        action_type: 'query',
        query_text: req.query,
        response_summary: llmResult.content.substring(0, 500),
        model_used: llmResult.model,
        tokens_used: llmResult.tokensUsed,
        search_type: searchType,
        result_count:
          (searchResults || []).length +
          (pharmacyContextResult?.sources.length || 0),
      }).catch(() => {
        /* non-blocking */
      });

      const combinedSources = [
        ...(searchResults || []),
        ...(pharmacyContextResult?.sources || []),
      ];

      return wrapSuccess(
        validateResponse(
          aiQueryResponseSchema,
          {
            answer: llmResult.content,
            sources: combinedSources,
            confidence:
              comprehensiveContext && (searchResults || []).length >= 3
                ? 'HIGH'
                : comprehensiveContext ||
                    (searchResults || []).length >= 1 ||
                    pharmacyContextResult?.hasData
                  ? 'MEDIUM'
                  : 'LOW',
            searchType,
            resultCount: combinedSources.length,
            tokensUsed: llmResult.tokensUsed,
            model: llmResult.model,
          },
          'ai:query',
        ),
      );
    } catch (error) {
      logOperationSummary({
        module: 'AIQuery',
        action: 'ipc_query',
        total_duration_ms: Date.now() - queryT0,
        trace_id: queryTraceId,
        patient_id: patientIdForLogs,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return wrapError(error);
    }
  });

  // ─── ai:query-stream — same as ai:query but streams LLM tokens ───────────
  ipcMain.handle('ai:query-stream', async (event, rawReq: unknown) => {
    const queryT0 = Date.now();
    const queryTraceId = createTraceId('AIQuery', 'ipc_query_stream');
    let patientIdForLogs: string | undefined;
    try {
      const req = parseAIQueryRequest(rawReq, 'ai:query-stream');
      patientIdForLogs = req.patientId;
      enforceAIRequestRateLimit(req);
      const shortcutIntent = detectShortcutIntent(req.query);
      if (shortcutIntent) {
        const answer = buildShortcutResponse(
          req.assistantScope,
          shortcutIntent,
        );
        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:stream-chunk', { chunk: answer, done: false });
          event.sender.send('ai:stream-chunk', { chunk: '', done: true });
        }
        logOperationSummary({
          module: 'AIQuery',
          action: 'ipc_query_stream',
          total_duration_ms: Date.now() - queryT0,
          trace_id: queryTraceId,
          patient_id: patientIdForLogs,
          status: 'shortcut',
        });
        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer,
              sources: [],
              confidence: 'HIGH',
              searchType: 'intent-shortcut',
              resultCount: 0,
            },
            'ai:query-stream',
          ),
        );
      }

      const searchType = req.searchType || 'hybrid';
      const maxResults = req.maxResults || 10;
      const effectiveMaxResults = isConstrainedLocalOllama(config)
        ? Math.min(maxResults, LOCAL_OLLAMA_QUERY_MAX_RESULTS)
        : maxResults;
      const conversationContext = buildConversationHistoryContext(
        req.conversationHistory,
      );
      const { sender } = event;
      const isPharmacyScope = req.assistantScope === 'pharmacy';
      const isGlobalPharmacyQuery = isPharmacyScope && !req.patientId;
      const hasGlobalClinicalIntent =
        !isPharmacyScope && detectGlobalClinicalIntent(req.query);
      const isGlobalClinicalQuery =
        !isPharmacyScope && (!req.patientId || hasGlobalClinicalIntent);
      const globalClinicalMaxRows = isConstrainedLocalOllama(config)
        ? hasGlobalClinicalIntent
          ? LOCAL_OLLAMA_GLOBAL_WIDE_MAX_ROWS
          : LOCAL_OLLAMA_GLOBAL_MAX_ROWS
        : hasGlobalClinicalIntent
          ? Math.max(300, maxResults * 30)
          : Math.max(80, maxResults * 8);
      const systemPrompt = resolveSystemPrompt(req.assistantScope, {
        isGlobalClinical: isGlobalClinicalQuery,
      });

      let pharmacyContextResult: PharmacyContextResult | null = null;
      let globalClinicalContextResult: ClinicalGlobalContextResult | null =
        null;
      if (isPharmacyScope) {
        try {
          pharmacyContextResult = await fetchPharmacyOperationalContext(
            config,
            req.query,
            {
              patientId: req.patientId,
              maxRows: isConstrainedLocalOllama(config)
                ? LOCAL_OLLAMA_PHARMACY_MAX_ROWS
                : Math.max(30, maxResults * 3),
            },
          );
        } catch (pharmErr) {
          log.warn(
            '[AI Service] Pharmacy context fetch failed:',
            String(pharmErr),
          );
        }
      }

      if (isGlobalClinicalQuery) {
        try {
          globalClinicalContextResult =
            await fetchGlobalClinicalOperationalContext(config, req.query, {
              maxRows: globalClinicalMaxRows,
            });
        } catch (clinicalErr) {
          log.warn(
            '[AI Service] Global clinical context fetch failed:',
            String(clinicalErr),
          );
        }
      }

      if (isGlobalPharmacyQuery) {
        if (!pharmacyContextResult?.hasData) {
          sender.send('ai:stream-chunk', {
            chunk: 'No relevant pharmacy records were found for this query.',
            done: true,
          });
          logOperationSummary({
            module: 'AIQuery',
            action: 'ipc_query_stream',
            total_duration_ms: Date.now() - queryT0,
            trace_id: queryTraceId,
            patient_id: patientIdForLogs,
            scope: 'pharmacy',
            status: 'no_data',
          });
          return wrapSuccess(
            validateResponse(
              aiQueryResponseSchema,
              {
                answer:
                  'No relevant pharmacy records were found for this query.',
                sources: [],
                confidence: 'LOW',
                searchType: 'pharmacy-context',
                resultCount: 0,
              },
              'ai:query-stream',
            ),
          );
        }

        const userContent = buildLLMUserContent(config, {
          pharmacyContext: pharmacyContextResult.contextText,
          conversationContext,
          questionLabel: "Pharmacist's Question",
          query: req.query,
        });

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          buildUserMessageWithAttachments(
            userContent,
            req.imageAttachments,
            config.provider,
          ),
        ];

        const llmResult = await chatCompletionStream(messages, (chunk) => {
          if (!sender.isDestroyed()) {
            sender.send('ai:stream-chunk', { chunk, done: false });
          }
        });

        if (!sender.isDestroyed()) {
          sender.send('ai:stream-chunk', { chunk: '', done: true });
        }

        logOperationSummary({
          module: 'AIQuery',
          action: 'ipc_query_stream',
          total_duration_ms: Date.now() - queryT0,
          trace_id: queryTraceId,
          patient_id: patientIdForLogs,
          scope: 'pharmacy',
          model: llmResult.model,
          tokens_used: llmResult.tokensUsed,
          result_count: pharmacyContextResult.sources.length,
          payload_bytes: estimatePayloadBytes(llmResult.content),
        });

        logAIInteraction({
          user_id: req.userId,
          patient_id: 'GLOBAL_PHARMACY',
          facility_id: req.facilityId,
          action_type: 'query',
          query_text: req.query,
          response_summary: llmResult.content.substring(0, 500),
          model_used: llmResult.model,
          tokens_used: llmResult.tokensUsed,
          search_type: 'pharmacy-context',
          result_count: pharmacyContextResult.sources.length,
        }).catch(() => {});

        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer: llmResult.content,
              sources: pharmacyContextResult.sources,
              confidence: pharmacyContextResult.hasData ? 'MEDIUM' : 'LOW',
              searchType: 'pharmacy-context',
              resultCount: pharmacyContextResult.sources.length,
              tokensUsed: llmResult.tokensUsed,
              model: llmResult.model,
            },
            'ai:query-stream',
          ),
        );
      }

      if (isGlobalClinicalQuery) {
        if (
          !globalClinicalContextResult?.hasData &&
          (!req.imageAttachments || req.imageAttachments.length === 0)
        ) {
          sender.send('ai:stream-chunk', {
            chunk:
              'No relevant clinical records were found for this global query.',
            done: true,
          });
          return wrapSuccess(
            validateResponse(
              aiQueryResponseSchema,
              {
                answer:
                  'No relevant clinical records were found for this global query.',
                sources: [],
                confidence: 'LOW',
                searchType: 'clinical-global-context',
                resultCount: 0,
              },
              'ai:query-stream',
            ),
          );
        }

        const userContent = buildLLMUserContent(config, {
          globalClinicalContext:
            globalClinicalContextResult?.contextText ||
            'No global records matched this query scope.',
          conversationContext,
          questionLabel: "Clinician's Question",
          query: req.query,
        });

        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          buildUserMessageWithAttachments(
            userContent,
            req.imageAttachments,
            config.provider,
          ),
        ];

        const llmResult = await chatCompletionStream(messages, (chunk) => {
          if (!sender.isDestroyed()) {
            sender.send('ai:stream-chunk', { chunk, done: false });
          }
        });

        if (!sender.isDestroyed()) {
          sender.send('ai:stream-chunk', { chunk: '', done: true });
        }

        logAIInteraction({
          user_id: req.userId,
          patient_id: 'GLOBAL_CLINICAL',
          facility_id: req.facilityId,
          action_type: 'query',
          query_text: req.query,
          response_summary: llmResult.content.substring(0, 500),
          model_used: llmResult.model,
          tokens_used: llmResult.tokensUsed,
          search_type: 'clinical-global-context',
          result_count: globalClinicalContextResult?.sources.length || 0,
        }).catch(() => {});

        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer: llmResult.content,
              sources: globalClinicalContextResult?.sources || [],
              confidence: globalClinicalContextResult?.hasData
                ? 'MEDIUM'
                : 'LOW',
              searchType: 'clinical-global-context',
              resultCount: globalClinicalContextResult?.sources.length || 0,
              tokensUsed: llmResult.tokensUsed,
              model: llmResult.model,
            },
            'ai:query-stream',
          ),
        );
      }

      const patientId = req.patientId as string;

      // 1–4: Reuse same context + search pipeline
      const contextPromise = fetchComprehensivePatientContext(
        patientId,
        config,
      );

      let queryEmbedding: number[] = [];
      let effectiveSearchType = searchType;
      if (searchType !== 'fulltext') {
        try {
          queryEmbedding = await generateQueryEmbedding(req.query);
        } catch {
          effectiveSearchType = 'fulltext';
        }
      }

      const searchResults = await hybridSearch(
        patientId,
        req.query,
        queryEmbedding,
        effectiveSearchType,
        effectiveMaxResults,
        config,
      );

      let comprehensiveContext = '';
      try {
        comprehensiveContext = await contextPromise;
      } catch {
        /* swallow */
      }

      if (
        (!searchResults || searchResults.length === 0) &&
        !comprehensiveContext &&
        !pharmacyContextResult?.hasData &&
        (!req.imageAttachments || req.imageAttachments.length === 0)
      ) {
        sender.send('ai:stream-chunk', {
          chunk: 'No relevant records were found for this query.',
          done: true,
        });
        return wrapSuccess(
          validateResponse(
            aiQueryResponseSchema,
            {
              answer: 'No relevant records were found for this query.',
              sources: [],
              confidence: 'LOW',
              searchType,
              resultCount: 0,
            },
            'ai:query-stream',
          ),
        );
      }

      // 5–6: Build messages
      const searchContext =
        searchResults && searchResults.length > 0
          ? (searchResults as Record<string, unknown>[])
              .map(
                (r, i) =>
                  `[Search Result ${i + 1}] (table: ${r.source_table}, date: ${r.record_date || 'unknown'})\n${r.content_snippet || r.chunk_text || r.snippet || ''}`,
              )
              .join('\n\n---\n\n')
          : '';

      const userContent = buildLLMUserContent(config, {
        chartContext: comprehensiveContext,
        pharmacyContext: pharmacyContextResult?.hasData
          ? pharmacyContextResult.contextText
          : undefined,
        searchContext,
        searchResultCount: (searchResults || []).length,
        conversationContext,
        questionLabel: `${isPharmacyScope ? "Pharmacist's" : "Doctor's"} Question`,
        query: req.query,
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        buildUserMessageWithAttachments(
          userContent,
          req.imageAttachments,
          config.provider,
        ),
      ];

      // 7: Stream LLM response
      const llmT0 = Date.now();
      const llmResult = await chatCompletionStream(messages, (chunk) => {
        if (!sender.isDestroyed()) {
          sender.send('ai:stream-chunk', { chunk, done: false });
        }
      });

      // Send done signal
      if (!sender.isDestroyed()) {
        sender.send('ai:stream-chunk', { chunk: '', done: true });
      }

      const llmMs = Date.now() - llmT0;
      logOperationSummary({
        module: 'AIQuery',
        action: 'ipc_query_stream',
        total_duration_ms: Date.now() - queryT0,
        trace_id: queryTraceId,
        patient_id: patientId,
        llm_stream_ms: llmMs,
        model: llmResult.model,
        tokens_used: llmResult.tokensUsed,
        search_result_count: (searchResults || []).length,
        context_chars: comprehensiveContext.length,
        payload_bytes: estimatePayloadBytes(llmResult.content),
      });

      // Audit log (non-blocking)
      logAIInteraction({
        user_id: req.userId,
        patient_id: patientId,
        facility_id: req.facilityId,
        action_type: 'query',
        query_text: req.query,
        response_summary: llmResult.content.substring(0, 500),
        model_used: llmResult.model,
        tokens_used: llmResult.tokensUsed,
        search_type: searchType,
        result_count:
          (searchResults || []).length +
          (pharmacyContextResult?.sources.length || 0),
      }).catch(() => {});

      const combinedSources = [
        ...(searchResults || []),
        ...(pharmacyContextResult?.sources || []),
      ];

      return wrapSuccess(
        validateResponse(
          aiQueryResponseSchema,
          {
            answer: llmResult.content,
            sources: combinedSources,
            confidence:
              comprehensiveContext && (searchResults || []).length >= 3
                ? 'HIGH'
                : comprehensiveContext ||
                    (searchResults || []).length >= 1 ||
                    pharmacyContextResult?.hasData
                  ? 'MEDIUM'
                  : 'LOW',
            searchType,
            resultCount: combinedSources.length,
            tokensUsed: llmResult.tokensUsed,
            model: llmResult.model,
          },
          'ai:query-stream',
        ),
      );
    } catch (error) {
      // Send error to stream listener so UI can react
      if (!event.sender.isDestroyed()) {
        event.sender.send('ai:stream-chunk', {
          chunk: '',
          done: true,
          error: String(error),
        });
      }
      logOperationSummary({
        module: 'AIQuery',
        action: 'ipc_query_stream',
        total_duration_ms: Date.now() - queryT0,
        trace_id: queryTraceId,
        patient_id: patientIdForLogs,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      return wrapError(error);
    }
  });

  // ─── ai:search — raw search (no LLM) ─────────────────────────────────────
  ipcMain.handle('ai:search', async (_event, rawReq: unknown) => {
    try {
      const req = parseAIQueryRequest(rawReq, 'ai:search');
      const isGlobalPharmacyQuery =
        req.assistantScope === 'pharmacy' && !req.patientId;
      const hasGlobalClinicalIntent =
        (req.assistantScope || 'clinical') === 'clinical' &&
        detectGlobalClinicalIntent(req.query);
      const isGlobalClinicalQuery =
        (req.assistantScope || 'clinical') === 'clinical' &&
        (!req.patientId || hasGlobalClinicalIntent);
      const globalClinicalMaxRows = hasGlobalClinicalIntent
        ? Math.max(300, (req.maxResults || 30) * 20)
        : Math.max(80, req.maxResults || 30);
      if (isGlobalPharmacyQuery) {
        const pharmacyContextResult = await fetchPharmacyOperationalContext(
          config,
          req.query,
          {
            maxRows: Math.max(30, req.maxResults || 20),
          },
        );
        return wrapSuccess(
          validateResponse(
            aiSearchResponseSchema,
            {
              results: pharmacyContextResult.sources,
              searchType: 'pharmacy-context',
              resultCount: pharmacyContextResult.sources.length,
            },
            'ai:search',
          ),
        );
      }

      if (isGlobalClinicalQuery) {
        const clinicalContextResult =
          await fetchGlobalClinicalOperationalContext(config, req.query, {
            maxRows: globalClinicalMaxRows,
          });
        return wrapSuccess(
          validateResponse(
            aiSearchResponseSchema,
            {
              results: clinicalContextResult.sources,
              searchType: 'clinical-global-context',
              resultCount: clinicalContextResult.sources.length,
            },
            'ai:search',
          ),
        );
      }

      if (!req.patientId) {
        throw new Error('Patient ID is required for this search mode');
      }

      const searchType = req.searchType || 'hybrid';
      const maxResults = req.maxResults || 20;

      let queryEmbedding: number[] = [];
      let effectiveSearchType = searchType;
      if (searchType !== 'fulltext') {
        try {
          queryEmbedding = await generateQueryEmbedding(req.query);
        } catch (embErr) {
          log.warn(
            '[AI Service] Search embedding failed, falling back to fulltext:',
            String(embErr),
          );
          effectiveSearchType = 'fulltext';
        }
      }

      const results = await hybridSearch(
        req.patientId,
        req.query,
        queryEmbedding,
        effectiveSearchType,
        maxResults,
        config,
      );

      return wrapSuccess(
        validateResponse(
          aiSearchResponseSchema,
          {
            results,
            searchType,
            resultCount: (results || []).length,
          },
          'ai:search',
        ),
      );
    } catch (error) {
      return wrapError(error);
    }
  });

  // ─── ai:draftNote — clinical note drafting ────────────────────────────────
  ipcMain.handle('ai:draftNote', async (_event, rawReq: unknown) => {
    try {
      const req = parseAIDraftNoteRequest(rawReq);
      const noteTemplates: Record<string, string> = {
        soap: `Generate a SOAP note for this patient based on the provided context.
Format:
**Subjective:** ...
**Objective:** ...
**Assessment:** ...
**Plan:** ...`,
        discharge_summary: `Generate a discharge summary based on the patient's hospital records.
Include: admission diagnosis, hospital course, procedures, discharge diagnosis, discharge medications, follow-up instructions.`,
        referral_letter: `Draft a referral letter based on the patient's recent clinical data.
Include: reason for referral, relevant history, current medications, investigation results, specific questions for the specialist.`,
        progress_note: `Write a daily progress note for this patient.
Format as SOAP: Subjective, Objective, Assessment, Plan.`,
      };

      // Fetch comprehensive context + search results in parallel
      const contextPromise = fetchComprehensivePatientContext(
        req.patientId,
        config,
      );

      let queryEmbedding: number[] = [];
      let draftSearchType = 'hybrid';
      try {
        queryEmbedding = await generateQueryEmbedding(
          `${req.noteType} ${req.context || 'recent clinical records'}`,
        );
      } catch (embErr) {
        log.warn(
          '[AI Service] Embedding generation failed for draft, falling back to fulltext:',
          String(embErr),
        );
        draftSearchType = 'fulltext';
      }

      const results = await hybridSearch(
        req.patientId,
        req.noteType,
        queryEmbedding,
        draftSearchType,
        15,
        config,
      );

      let comprehensiveContext = '';
      try {
        comprehensiveContext = await contextPromise;
      } catch {
        /* ignore */
      }

      const searchContext = (results as Record<string, unknown>[])
        .map(
          (r, i) =>
            `[Record ${i + 1}] (${r.source_table}, ${r.record_date || 'unknown'})\n${r.content_snippet || r.chunk_text || r.snippet || ''}`,
        )
        .join('\n\n---\n\n');

      const userContent = [
        comprehensiveContext
          ? `# COMPLETE PATIENT CHART\n\n${comprehensiveContext}`
          : '',
        searchContext
          ? `\n\n# ADDITIONAL SEARCH CONTEXT\n\n${searchContext}`
          : '',
        `\n\n---\n\n${noteTemplates[req.noteType] || noteTemplates.soap}`,
        req.instructions
          ? `\nAdditional instructions: ${req.instructions}`
          : '',
      ]
        .filter(Boolean)
        .join('');

      const messages: ChatMessage[] = [
        { role: 'system', content: CLINICAL_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];

      const llmResult = await chatCompletion(messages);

      // Audit
      logAIInteraction({
        user_id: req.userId,
        patient_id: req.patientId,
        facility_id: req.facilityId,
        action_type: 'draft_note',
        query_text: req.noteType,
        response_summary: llmResult.content.substring(0, 500),
        model_used: llmResult.model,
        tokens_used: llmResult.tokensUsed,
        search_type: 'hybrid',
        result_count: results.length,
      }).catch(() => {});

      return wrapSuccess(
        validateResponse(
          aiDraftNoteResponseSchema,
          {
            draft: llmResult.content,
            sources: results,
            tokensUsed: llmResult.tokensUsed,
            model: llmResult.model,
          },
          'ai:draftNote',
        ),
      );
    } catch (error) {
      return wrapError(error);
    }
  });

  // ─── ai:patient-context — fetch comprehensive patient chart ──────────────
  ipcMain.handle(
    'ai:patient-context',
    async (_event, rawPatientId: unknown) => {
      try {
        const patientId = parsePatientId(rawPatientId, 'ai:patient-context');
        const context = await fetchComprehensivePatientContext(
          patientId,
          config,
        );
        return wrapSuccess(
          validateResponse(
            aiPatientContextResponseSchema,
            { context, patientId },
            'ai:patient-context',
          ),
        );
      } catch (error) {
        return wrapError(error);
      }
    },
  );

  // ─── ai:review-consultation — AI clinical review before submission ───────
  ipcMain.handle('ai:review-consultation', async (_event, rawReq: unknown) => {
    try {
      const req = parseAIReviewConsultationRequest(rawReq);

      // 1. Fetch comprehensive patient history for comparison
      let patientChart = '';
      try {
        patientChart = await fetchComprehensivePatientContext(
          req.patientId,
          config,
        );
      } catch (ctxErr) {
        log.warn(
          '[AI Service] Patient context fetch failed for review:',
          String(ctxErr),
        );
      }

      // 2. Build structured summary of the doctor's current entries
      const cd = req.consultationData;
      const entryParts: string[] = [
        "# CURRENT CONSULTATION ENTRIES (Doctor's Input — Under Review)",
      ];

      // Complaints
      if (
        cd.complaints &&
        Array.isArray(cd.complaints) &&
        (cd.complaints as unknown[]).length > 0
      ) {
        const complaints = (cd.complaints as Record<string, unknown>[])
          .map(
            (c) =>
              `- ${c.complaint_name || c.complaint_code || 'Unknown'}${c.is_primary ? ' ★ PRIMARY' : ''}${c.duration_value ? ` (${c.duration_value} ${c.duration_unit || ''})` : ''}${c.notes ? ` — ${c.notes}` : ''}`,
          )
          .join('\n');
        entryParts.push(`## CHIEF COMPLAINTS\n${complaints}`);
      }

      // History
      if (cd.history_of_present_illness)
        entryParts.push(
          `## HISTORY OF PRESENT ILLNESS\n${cd.history_of_present_illness}`,
        );
      if (cd.past_medical_history)
        entryParts.push(`## PAST MEDICAL HISTORY\n${cd.past_medical_history}`);
      if (cd.family_history)
        entryParts.push(`## FAMILY HISTORY\n${cd.family_history}`);
      if (cd.social_history)
        entryParts.push(`## SOCIAL HISTORY\n${cd.social_history}`);
      if (cd.review_of_systems)
        entryParts.push(`## REVIEW OF SYSTEMS\n${cd.review_of_systems}`);

      // Examination
      if (cd.examination_findings)
        entryParts.push(`## EXAMINATION FINDINGS\n${cd.examination_findings}`);
      if (cd.physical_examination)
        entryParts.push(`## PHYSICAL EXAMINATION\n${cd.physical_examination}`);
      if (cd.specialty_examination)
        entryParts.push(
          `## SPECIALTY EXAMINATION\n${JSON.stringify(cd.specialty_examination, null, 2)}`,
        );

      // Diagnosis
      if (
        cd.diagnoses &&
        Array.isArray(cd.diagnoses) &&
        (cd.diagnoses as unknown[]).length > 0
      ) {
        const diags = (cd.diagnoses as Record<string, string>[])
          .map(
            (d, i) =>
              `${i + 1}. **${d.title || d.code || 'Unknown'}**${d.code ? ` (ICD-10: ${d.code})` : ''}${i === 0 ? ' — PRIMARY' : ''}`,
          )
          .join('\n');
        entryParts.push(`## DIAGNOSES\n${diags}`);
      }
      if (cd.differential_diagnosis)
        entryParts.push(
          `## DIFFERENTIAL DIAGNOSIS\n${cd.differential_diagnosis}`,
        );

      // Treatment Plan
      if (cd.treatment_plan)
        entryParts.push(`## TREATMENT PLAN\n${cd.treatment_plan}`);
      if (cd.clinical_notes)
        entryParts.push(`## CLINICAL NOTES\n${cd.clinical_notes}`);
      if (cd.recommendations)
        entryParts.push(`## RECOMMENDATIONS\n${cd.recommendations}`);

      // Prescriptions / Medications
      if (
        cd.prescriptions &&
        Array.isArray(cd.prescriptions) &&
        (cd.prescriptions as unknown[]).length > 0
      ) {
        const meds = (cd.prescriptions as Record<string, unknown>[])
          .map(
            (m) =>
              `| ${m.drug_name || 'Unknown'} | ${m.dosage || '-'} | ${m.route || '-'} | ${m.frequency || '-'} | ${m.duration || '-'} | ${m.quantity_prescribed || '-'} | ${m.instructions || '-'} |`,
          )
          .join('\n');
        entryParts.push(
          `## PRESCRIBED MEDICATIONS (${(cd.prescriptions as unknown[]).length})\n` +
            `| Drug | Dosage | Route | Frequency | Duration | Qty | Instructions |\n` +
            `|------|--------|-------|-----------|----------|-----|----------------------|\n${
              meds
            }`,
        );
      }

      // Lab Orders
      if (
        cd.labOrders &&
        Array.isArray(cd.labOrders) &&
        (cd.labOrders as unknown[]).length > 0
      ) {
        const labs = (cd.labOrders as Record<string, unknown>[])
          .map(
            (l) =>
              `- ${l.test_name || l.test_code || 'Unknown test'}${l.priority ? ` (${l.priority})` : ''}${l.clinical_notes ? ` — ${l.clinical_notes}` : ''}`,
          )
          .join('\n');
        entryParts.push(
          `## LAB ORDERS (${(cd.labOrders as unknown[]).length})\n${labs}`,
        );
      }

      // Radiology Orders
      if (
        cd.radiologyOrders &&
        Array.isArray(cd.radiologyOrders) &&
        (cd.radiologyOrders as unknown[]).length > 0
      ) {
        const rads = (cd.radiologyOrders as Record<string, unknown>[])
          .map(
            (r) =>
              `- ${r.imaging_type || 'Unknown'} — ${r.body_part || 'N/A'}${r.clinical_indication ? ` (${r.clinical_indication})` : ''}${r.priority ? ` [${r.priority}]` : ''}`,
          )
          .join('\n');
        entryParts.push(
          `## RADIOLOGY ORDERS (${(cd.radiologyOrders as unknown[]).length})\n${rads}`,
        );
      }

      // Procedure Orders
      if (
        cd.procedureOrders &&
        Array.isArray(cd.procedureOrders) &&
        (cd.procedureOrders as unknown[]).length > 0
      ) {
        const procs = (cd.procedureOrders as Record<string, unknown>[])
          .map(
            (p) =>
              `- ${p.procedure_name || p.procedure_code || 'Unknown'}${p.priority ? ` [${p.priority}]` : ''}${p.indication ? ` — ${p.indication}` : ''}`,
          )
          .join('\n');
        entryParts.push(
          `## PROCEDURE ORDERS (${(cd.procedureOrders as unknown[]).length})\n${procs}`,
        );
      }

      // Admission Order
      if (cd.admissionOrder && typeof cd.admissionOrder === 'object') {
        const adm = cd.admissionOrder as Record<string, unknown>;
        entryParts.push(
          `## ADMISSION ORDER\n` +
            `- **Type**: ${adm.admission_type || 'N/A'} | **Acuity**: ${adm.acuity_level || 'N/A'}\n` +
            `- **Reason**: ${adm.reason_for_admission || adm.chief_complaint || 'N/A'}\n` +
            `- **Diagnosis**: ${adm.admitting_diagnosis || 'N/A'}\n${
              adm.diet_type ? `- **Diet**: ${adm.diet_type}\n` : ''
            }${adm.code_status ? `- **Code Status**: ${adm.code_status}\n` : ''}`,
        );
      }

      // Treatment Tasks
      if (
        cd.treatmentTasks &&
        Array.isArray(cd.treatmentTasks) &&
        (cd.treatmentTasks as unknown[]).length > 0
      ) {
        const tasks = (cd.treatmentTasks as Record<string, unknown>[])
          .map(
            (t) =>
              `- [${t.task_type}] ${t.title || 'Untitled'}${t.priority ? ` (${t.priority})` : ''}${t.medication_name ? ` — 💊 ${t.medication_name} ${t.dosage || ''} ${t.route || ''}` : ''}`,
          )
          .join('\n');
        entryParts.push(
          `## TREATMENT TASKS (${(cd.treatmentTasks as unknown[]).length})\n${tasks}`,
        );
      }

      // Referrals
      if (
        cd.referrals &&
        Array.isArray(cd.referrals) &&
        (cd.referrals as unknown[]).length > 0
      ) {
        const refs = (cd.referrals as Record<string, unknown>[])
          .map(
            (r) =>
              `- ${r.specialty || 'Unknown'} — ${r.reason || 'N/A'} (${r.urgency || 'Routine'})`,
          )
          .join('\n');
        entryParts.push(
          `## REFERRALS (${(cd.referrals as unknown[]).length})\n${refs}`,
        );
      }

      // Follow-up
      if (cd.follow_up_date)
        entryParts.push(
          `## FOLLOW-UP\n- **Date**: ${cd.follow_up_date}${cd.follow_up_notes ? `\n- **Notes**: ${cd.follow_up_notes}` : ''}`,
        );

      const entryText = entryParts.join('\n\n');

      // 3. Build the review prompt
      const reviewSystemPrompt = `You are a senior clinical review AI embedded in an Electronic Medical Records (EMR) system. Your role is to perform a comprehensive pre-submission clinical review of a doctor's consultation entries.

REVIEW OBJECTIVES:
1. **Clinical Accuracy** — Review all entries against the patient's existing medical history for consistency and completeness.
2. **Drug Safety** — Check prescribed medications for:
   - Drug-drug interactions with current and past medications
   - Drug-allergy conflicts (check patient's known allergies)
   - Contraindications based on patient's medical history, age, gender, and conditions
   - Dosage appropriateness (standard practice guidelines)
   - Route and frequency correctness
   - Duplicate therapy detection
3. **Diagnostic Consistency** — Verify diagnosis aligns with presenting complaints, examination findings, and history.
4. **Investigation Appropriateness** — Review ordered labs and imaging for:
   - Relevance to the presenting condition
   - Potential missing investigations that should be considered
   - Duplicate or redundant tests
5. **Treatment Plan Completeness** — Check if the plan adequately addresses all diagnoses and complaints.
6. **Standard of Care** — Compare entries against established clinical guidelines and best practices worldwide.
7. **Missing Information** — Flag any critical missing elements (e.g., allergy documentation, vital signs context, incomplete history).
8. **Suggestions** — Proactively suggest:
   - Additional differential diagnoses to consider
   - Additional investigations that might be warranted
   - Alternative or adjunct medications
   - Possible side effects the patient should be counselled about
   - Follow-up recommendations

RESPONSE FORMAT:
Structure your response using the following sections with clear Markdown. Use ⚠️ for warnings, ✅ for confirmations, 💡 for suggestions, and 🚨 for critical alerts.

## 🏥 Clinical Review Summary
Brief overall assessment of the consultation quality and completeness.

## ✅ What Looks Good
Items that are clinically appropriate and well-documented.

## 🚨 Critical Alerts
Drug interactions, allergy conflicts, contraindications, or dangerous errors. These MUST be addressed before submission.

## ⚠️ Warnings
Issues that should be reviewed but may not be blocking (e.g., incomplete documentation, unusual dosing).

## 💊 Medication Review
For each prescribed drug:
- Appropriateness for the diagnosis
- Dosage/route/frequency check
- Known side effects to counsel patient about
- Interactions with other prescribed or existing medications
- Allergy cross-check

## 🔬 Investigation Review
For each ordered lab/imaging:
- Relevance to diagnosis
- Any missing investigations to consider

## 💡 Clinical Suggestions
- Additional differential diagnoses
- Additional treatments or medications to consider
- Lifestyle/counselling recommendations
- Follow-up recommendations

## 📋 Completeness Checklist
Rate each area: ✅ Complete | ⚠️ Incomplete | ❌ Missing
- [ ] Chief Complaints documented
- [ ] History of Present Illness
- [ ] Past Medical History reviewed
- [ ] Family/Social History
- [ ] Review of Systems
- [ ] Physical Examination
- [ ] Diagnosis with ICD-10 codes
- [ ] Treatment Plan
- [ ] Medications prescribed
- [ ] Investigations ordered
- [ ] Follow-up plan

SAFETY RULES:
- Always cross-reference prescribed drugs against the patient's known ALLERGIES. This is CRITICAL.
- Flag ALL potential drug-drug interactions, even minor ones.
- If a prescribed drug is contraindicated for the patient's condition, mark it as 🚨 CRITICAL.
- Never approve dosages that exceed standard clinical guidelines without flagging.
- If the patient's medical history suggests a drug should be avoided, flag it explicitly.
- If diagnosis does not match the symptoms/complaints, flag the inconsistency.

Finally, end with:
---
⚕️ **AI Clinical Review Disclaimer**: This review is generated by an AI assistant and is intended as a clinical decision support tool only. It does not replace clinical judgement. The treating physician bears full responsibility for all clinical decisions. Always verify suggestions against current institutional protocols and clinical guidelines before acting.`;

      const userContent = [
        patientChart
          ? `# EXISTING PATIENT MEDICAL RECORD\n\n${patientChart}`
          : '# No existing patient medical records available.',
        `\n\n---\n\n${entryText}`,
        `\n\n---\n\n**TASK**: Perform a comprehensive clinical review of the above consultation entries against the patient's existing medical records. Flag any safety concerns, drug interactions, missing information, and provide intelligent clinical suggestions. Be thorough but concise.`,
      ].join('');

      const messages: ChatMessage[] = [
        { role: 'system', content: reviewSystemPrompt },
        { role: 'user', content: userContent },
      ];

      const llmResult = await chatCompletion(messages);

      // Audit
      logAIInteraction({
        user_id: req.userId || 'unknown',
        patient_id: req.patientId,
        facility_id: req.facilityId || 'unknown',
        action_type: 'review_consultation',
        query_text: 'Pre-submission clinical review',
        response_summary: llmResult.content.substring(0, 500),
        model_used: llmResult.model,
        tokens_used: llmResult.tokensUsed,
        search_type: 'context',
        result_count: 0,
      }).catch(() => {});

      return wrapSuccess(
        validateResponse(
          aiReviewConsultationResponseSchema,
          {
            review: llmResult.content,
            tokensUsed: llmResult.tokensUsed,
            model: llmResult.model,
          },
          'ai:review-consultation',
        ),
      );
    } catch (error) {
      return wrapError(error);
    }
  });

  // ─── ai:embedPatient — force re-embed ────────────────────────────────────
  ipcMain.handle('ai:embedPatient', async (_event, rawPatientId: unknown) => {
    try {
      parsePatientId(rawPatientId, 'ai:embedPatient');
      // This is handled in the renderer process via embeddingSync.
      // The main process just acknowledges the request — actual sync
      // is triggered from the renderer.
      return wrapSuccess(
        validateResponse(
          aiEmbedResponseSchema,
          {
            message: 'Embed request acknowledged. Sync handled in renderer.',
          },
          'ai:embedPatient',
        ),
      );
    } catch (error) {
      return wrapError(error);
    }
  });

  // ─── ai:health — provider health check ───────────────────────────────────
  ipcMain.handle('ai:health', async () => {
    try {
      const health: Record<string, unknown> = {
        provider: config.provider,
        configured: hasConfiguredLLMProvider(config),
        llmReachable: false,
        embeddingReachable: false,
        supabaseConfigured: !!config.supabaseUrl && !!config.supabaseKey,
      };

      if (health.configured) {
        if (config.provider === 'ollama') {
          try {
            health.llmReachable = await isOllamaModelAvailable(
              config.ollama.baseUrl,
              config.ollama.chatModel,
              config.ollama.apiKey,
            );
          } catch {
            health.llmReachable = false;
          }
        } else {
          try {
            await chatCompletion([{ role: 'user', content: 'Hi' }]);
            health.llmReachable = true;
          } catch {
            health.llmReachable = false;
          }
        }
      }

      if (hasEmbeddingProviderConfigured(config)) {
        if (config.provider === 'ollama') {
          try {
            health.embeddingReachable = await isOllamaModelAvailable(
              config.ollama.baseUrl,
              config.ollama.embeddingModel,
              config.ollama.apiKey,
            );
          } catch {
            health.embeddingReachable = false;
          }
        } else {
          try {
            await generateQueryEmbedding('health check');
            health.embeddingReachable = true;
          } catch {
            health.embeddingReachable = false;
          }
        }
      }

      return wrapSuccess(
        validateResponse(aiHealthResponseSchema, health, 'ai:health'),
      );
    } catch (error) {
      return wrapError(error);
    }
  });

  // ─── ai:config — get AI configuration (redacted) ─────────────────────────
  ipcMain.handle('ai:config', async () => {
    const chatModel = getConfiguredChatModel(config);
    const embeddingModel = `ollama/${config.ollama.embeddingModel} (${config.ollama.dimensions}d)`;
    const hasApiKey =
      config.provider === 'ollama'
        ? !!config.ollama.apiKey
        : config.provider === 'groq'
          ? !!config.groq.apiKey
          : config.provider === 'gemini'
            ? !!config.gemini.apiKey
            : !!config.openai.apiKey;

    return wrapSuccess(
      validateResponse(
        aiConfigResponseSchema,
        {
          provider: config.provider,
          chatModel,
          embeddingModel,
          hasApiKey,
          ollamaBaseUrl: config.provider === 'ollama' ? config.ollama.baseUrl : undefined,
        },
        'ai:config',
      ),
    );
  });

  log.info('[AI Service] IPC handlers registered');
}
