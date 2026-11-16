/**
 * Embedding Client — Ollama (local) / Gemini / OpenAI wrapper
 *
 * Generates vector embeddings for clinical text chunks.
 * Prefers Ollama (local, no quota issues), with Gemini/OpenAI as fallback.
 */
import log from 'electron-log';

// =============================================================================
// Configuration (loaded from process.env at module init)
// =============================================================================

function getConfig() {
  const provider = (process.env.AI_PROVIDER || 'groq') as
    | 'openai'
    | 'gemini'
    | 'groq';
  return {
    provider,
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      dimensions: Number(process.env.OLLAMA_EMBEDDING_DIMENSIONS) || 768,
    },
  };
}

// =============================================================================
// Retry Helper (handles 429 rate-limits and 5xx transient errors)
// =============================================================================

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, init);
    if (resp.ok) return resp;

    if ((resp.status === 429 || resp.status >= 500) && attempt < maxRetries) {
      const retryAfter = resp.headers.get('retry-after');
      const waitMs = retryAfter
        ? Number(retryAfter) * 1000
        : Math.min(1000 * 2 ** attempt, 30_000);
      log.warn(
        `[AI Embedding] ${resp.status} — retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error(`HTTP ${resp.status}`);
      continue;
    }

    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body}`);
  }
  throw lastError ?? new Error('fetchWithRetry exhausted retries');
}

// =============================================================================
// OpenAI Embeddings
// =============================================================================

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

async function generateOpenAIEmbedding(
  text: string,
): Promise<{ embedding: number[]; tokensUsed: number }> {
  const config = getConfig();
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Configure it in .env');
  }

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openai.model,
        input: text,
      }),
    },
  );

  const data = (await response.json()) as OpenAIEmbeddingResponse;
  return {
    embedding: data.data[0].embedding,
    tokensUsed: data.usage.prompt_tokens,
  };
}

async function generateOpenAIEmbeddingBatch(
  texts: string[],
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  const config = getConfig();
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Configure it in .env');
  }

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openai.model,
        input: texts,
      }),
    },
  );

  const data = (await response.json()) as OpenAIEmbeddingResponse;
  const sorted = data.data.sort((a, b) => a.index - b.index);
  return {
    embeddings: sorted.map((d) => d.embedding),
    tokensUsed: data.usage.prompt_tokens,
  };
}

// =============================================================================
// Ollama Embeddings (local — preferred)
// =============================================================================

async function generateOllamaEmbedding(
  text: string,
): Promise<{ embedding: number[]; tokensUsed: number }> {
  const config = getConfig();
  const url = `${config.ollama.baseUrl}/api/embed`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.model,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama embedding error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return {
    embedding: data.embeddings?.[0] ?? [],
    tokensUsed: Math.ceil(text.length / 4),
  };
}

async function generateOllamaEmbeddingBatch(
  texts: string[],
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  const config = getConfig();
  const url = `${config.ollama.baseUrl}/api/embed`;

  // Ollama /api/embed supports array input natively
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollama.model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama batch embedding error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return {
    embeddings: data.embeddings ?? [],
    tokensUsed: Math.ceil(texts.join('').length / 4),
  };
}

// =============================================================================
// Gemini Embeddings
// =============================================================================

async function generateGeminiEmbedding(
  text: string,
): Promise<{ embedding: number[]; tokensUsed: number }> {
  const config = getConfig();
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Configure it in .env');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:embedContent?key=${config.gemini.apiKey}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${config.gemini.model}`,
      content: { parts: [{ text }] },
      outputDimensionality: getConfig().ollama.dimensions,
    }),
  });

  const data = await response.json();
  return {
    embedding: data.embedding?.values ?? [],
    tokensUsed: Math.ceil(text.length / 4), // Gemini doesn't return token count for embeddings
  };
}

async function generateGeminiEmbeddingBatch(
  texts: string[],
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  const config = getConfig();
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Configure it in .env');
  }

  // Gemini batchEmbedContents supports up to 100 texts per call
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:batchEmbedContents?key=${config.gemini.apiKey}`;
  const requests = texts.map((text) => ({
    model: `models/${config.gemini.model}`,
    content: { parts: [{ text }] },
    outputDimensionality: getConfig().ollama.dimensions,
  }));

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  const data = await response.json();
  const embeddings: number[][] = (data.embeddings ?? []).map(
    (e: { values: number[] }) => e.values,
  );
  return {
    embeddings,
    tokensUsed: Math.ceil(texts.join('').length / 4),
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a single embedding for clinical text
 */
export async function generateEmbedding(
  text: string,
): Promise<{ embedding: number[]; tokensUsed: number }> {
  const config = getConfig();
  const start = Date.now();

  try {
    // Prefer Ollama (local, fast, no quota limits)
    try {
      const result = await generateOllamaEmbedding(text);
      log.debug(
        `[AI Embedding] Ollama generated in ${Date.now() - start}ms (${result.embedding.length}d)`,
      );
      return result;
    } catch (ollamaErr) {
      log.warn(
        '[AI Embedding] Ollama failed, falling back to cloud:',
        String(ollamaErr),
      );
    }

    // Fallback to cloud provider — skip silently if no key is configured
    if (config.provider === 'openai') {
      if (!config.openai.apiKey) {
        log.warn('[AI Embedding] OPENAI_API_KEY not configured; skipping embedding.');
        return { embedding: [], tokensUsed: 0 };
      }
      const result = await generateOpenAIEmbedding(text);
      log.debug(
        `[AI Embedding] OpenAI generated in ${Date.now() - start}ms (${result.tokensUsed} tokens)`,
      );
      return result;
    }

    if (!config.gemini.apiKey) {
      log.warn('[AI Embedding] GEMINI_API_KEY not configured; skipping embedding.');
      return { embedding: [], tokensUsed: 0 };
    }
    const result = await generateGeminiEmbedding(text);
    log.debug(
      `[AI Embedding] Gemini generated in ${Date.now() - start}ms (${result.tokensUsed} tokens)`,
    );
    return result;
  } catch (error) {
    log.error('[AI Embedding] Failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings for a batch of texts (OpenAI uses native batch; HF & Ollama do sequential)
 */
export async function generateEmbeddingBatch(
  texts: string[],
): Promise<{ embeddings: number[][]; tokensUsed: number }> {
  const config = getConfig();
  const start = Date.now();

  try {
    // Prefer Ollama (local, fast, native batch support)
    try {
      const result = await generateOllamaEmbeddingBatch(texts);
      log.debug(
        `[AI Embedding] Ollama batch of ${texts.length} in ${Date.now() - start}ms`,
      );
      return result;
    } catch (ollamaErr) {
      log.warn(
        '[AI Embedding] Ollama batch failed, falling back to cloud:',
        String(ollamaErr),
      );
    }

    // Fallback to cloud — skip silently if no key is configured
    if (config.provider === 'openai') {
      if (!config.openai.apiKey) {
        log.warn('[AI Embedding] OPENAI_API_KEY not configured; skipping batch.');
        return { embeddings: [], tokensUsed: 0 };
      }
      const result = await generateOpenAIEmbeddingBatch(texts);
      log.debug(
        `[AI Embedding] OpenAI batch of ${texts.length} in ${Date.now() - start}ms (${result.tokensUsed} tokens)`,
      );
      return result;
    }

    if (!config.gemini.apiKey) {
      log.warn('[AI Embedding] GEMINI_API_KEY not configured; skipping batch.');
      return { embeddings: [], tokensUsed: 0 };
    }
    // Gemini batch
    const result = await generateGeminiEmbeddingBatch(texts);
    log.debug(
      `[AI Embedding] Gemini batch of ${texts.length} in ${Date.now() - start}ms (${result.tokensUsed} tokens)`,
    );
    return result;
  } catch (error) {
    log.error('[AI Embedding] Batch failed:', error);
    throw error;
  }
}

/**
 * Check if embedding provider is configured and reachable
 */
export async function checkEmbeddingHealth(): Promise<{
  ok: boolean;
  provider: string;
  error?: string;
}> {
  try {
    // Check Ollama first (preferred)
    try {
      await generateOllamaEmbedding('health check');
      return { ok: true, provider: 'ollama' };
    } catch (ollamaErr) {
      log.warn('[AI Embedding] Ollama health check failed:', String(ollamaErr));
    }

    // Fallback cloud providers
    const config = getConfig();
    if (config.provider === 'openai') {
      if (!config.openai.apiKey)
        return {
          ok: false,
          provider: 'openai',
          error: 'OPENAI_API_KEY not set',
        };
      await generateOpenAIEmbedding('health check');
      return { ok: true, provider: 'openai' };
    }
    if (!config.gemini.apiKey)
      return { ok: false, provider: 'gemini', error: 'GEMINI_API_KEY not set' };
    await generateGeminiEmbedding('health check');
    return { ok: true, provider: 'gemini' };
  } catch (error) {
    return { ok: false, provider: 'ollama', error: String(error) };
  }
}
