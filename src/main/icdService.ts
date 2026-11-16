/**
 * ICD API Service - Main Process
 * Handles ICD code lookups with support for both:
 * - LOCAL mode: Uses Supabase database with ICD-10 codes (offline-capable)
 * - REMOTE mode: Uses WHO ICD-11 API (requires internet)
 *
 * Features:
 * - Provider switching via ICD_PROVIDER environment variable
 * - Automatic fallback from remote to local on failure
 * - OAuth2 token caching with automatic refresh (remote mode)
 * - Rate limiting to respect WHO API limits (remote mode)
 * - Clean error messages for frontend display
 * - Request queuing during token refresh
 *
 * Configuration:
 *   ICD_PROVIDER=local|remote|auto (default: auto)
 *   - local: Use only local Supabase ICD-10 database
 *   - remote: Use only WHO ICD-11 API (original behavior)
 *   - auto: Try remote first, fallback to local on failure
 */
import axios, { AxiosError } from 'axios';
import { ipcMain } from 'electron';
import log from 'electron-log';
import { z } from 'zod';
import {
  initLocalICDProvider,
  searchLocalICDCodes,
  getLocalICDCode,
  getLocalICDProviderStatus,
  checkLocalICDAvailability,
  LocalICDSearchItem,
  LocalICDCode,
} from './localICDProvider';

// =============================================================================
// Types
// =============================================================================

interface ICDToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

interface ICDSearchItem {
  code: string;
  title: string;
  chapter?: string;
  score?: number;
}

interface ICDErrorResponse {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
}

const icdKeywordSchema = z.string().trim().min(2).max(120);
const icdMaxResultsSchema = z.coerce.number().int().min(1).max(100).optional();
const icdCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^[A-Za-z0-9.-]+$/);
const icdSearchItemResponseSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  chapter: z.string().optional(),
  score: z.number().optional(),
});
const icdCodeResponseSchema = z
  .object({
    code: z.string().min(1),
    title: z.string().min(1),
    definition: z.string().optional(),
    parent: z.unknown().optional(),
    children: z.unknown().optional(),
    inclusions: z.array(z.string()).optional(),
    exclusions: z.array(z.string()).optional(),
    browserUrl: z.string().optional(),
  })
  .passthrough();
const icdErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1),
  errorCode: z.string().min(1),
  retryable: z.boolean(),
});
const icdSearchSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(icdSearchItemResponseSchema),
});
const icdCodeSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: icdCodeResponseSchema,
});
const icdStatusResponseSchema = z.object({
  providerMode: z.enum(['local', 'remote', 'auto']),
  localInitialized: z.boolean(),
  configured: z.boolean(),
  hasToken: z.boolean(),
  tokenValid: z.boolean(),
  rateLimited: z.boolean(),
  rateLimitResetTime: z.number().int().nullable(),
  requestsInWindow: z.number().int().nonnegative(),
  localAvailable: z.boolean(),
  localCodesCount: z.number().int().nonnegative(),
  localError: z.string().optional().nullable(),
  remoteFailureCount: z.number().int().nonnegative(),
});
const icdCheckLocalResponseSchema = z.object({
  available: z.boolean(),
  status: z.object({
    available: z.boolean(),
    codesCount: z.number().int().nonnegative(),
    error: z.string().optional().nullable(),
  }),
});

function parseIcdOutput<T>(
  schema: z.ZodType<T>,
  value: unknown,
  channel: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    log.error(
      `[ICD Main] ${channel} generated invalid response payload`,
      parsed.error.format(),
    );
    throw new Error(`Invalid ${channel} response payload`);
  }
  return parsed.data;
}

function parseIcdSearchPayload(
  rawKeyword: unknown,
  rawMaxResults?: unknown,
): {
  keyword: string;
  maxResults?: number;
} {
  const keywordParsed = icdKeywordSchema.safeParse(rawKeyword);
  if (!keywordParsed.success) {
    throw new Error('Invalid keyword payload');
  }

  if (rawMaxResults === undefined) {
    return { keyword: keywordParsed.data };
  }

  const maxResultsParsed = icdMaxResultsSchema.safeParse(rawMaxResults);
  if (!maxResultsParsed.success) {
    throw new Error('Invalid maxResults payload');
  }

  return {
    keyword: keywordParsed.data,
    maxResults: maxResultsParsed.data,
  };
}

function parseIcdCodePayload(rawCode: unknown): string {
  const parsed = icdCodeSchema.safeParse(rawCode);
  if (!parsed.success) {
    throw new Error('Invalid code payload');
  }
  return parsed.data;
}

// =============================================================================
// Error Codes for Clean Frontend Display
// =============================================================================

const ICD_ERRORS = {
  NOT_CONFIGURED: {
    code: 'ICD_NOT_CONFIGURED',
    message: 'ICD API credentials not configured',
    userMessage:
      'ICD search is not configured. Please contact your administrator.',
    retryable: false,
  },
  AUTH_FAILED: {
    code: 'ICD_AUTH_FAILED',
    message: 'Authentication with WHO ICD API failed',
    userMessage:
      'Unable to authenticate with ICD service. Please try again later.',
    retryable: true,
  },
  RATE_LIMITED: {
    code: 'ICD_RATE_LIMITED',
    message: 'WHO ICD API rate limit exceeded',
    userMessage:
      'Too many requests. Please wait a moment before searching again.',
    retryable: true,
  },
  SERVICE_UNAVAILABLE: {
    code: 'ICD_SERVICE_UNAVAILABLE',
    message: 'WHO ICD API is temporarily unavailable',
    userMessage:
      'ICD service is temporarily unavailable. Please try again later.',
    retryable: true,
  },
  NETWORK_ERROR: {
    code: 'ICD_NETWORK_ERROR',
    message: 'Network error connecting to WHO ICD API',
    userMessage:
      'Unable to connect to ICD service. Check your internet connection.',
    retryable: true,
  },
  NOT_FOUND: {
    code: 'ICD_NOT_FOUND',
    message: 'ICD code not found',
    userMessage: 'The requested ICD code was not found.',
    retryable: false,
  },
  INVALID_RESPONSE: {
    code: 'ICD_INVALID_RESPONSE',
    message: 'Invalid response from WHO ICD API',
    userMessage: 'Received unexpected response from ICD service.',
    retryable: true,
  },
  SEARCH_FAILED: {
    code: 'ICD_SEARCH_FAILED',
    message: 'ICD search failed',
    userMessage: 'Search failed. Please try again.',
    retryable: true,
  },
  LOCAL_UNAVAILABLE: {
    code: 'ICD_LOCAL_UNAVAILABLE',
    message: 'Local ICD database is not available',
    userMessage:
      'Local ICD codes not available. Run seed script or check database connection.',
    retryable: false,
  },
};

// =============================================================================
// Provider Configuration
// =============================================================================

type ICDProviderMode = 'local' | 'remote' | 'auto';

const PROVIDER_CONFIG = {
  // Provider mode: 'local', 'remote', or 'auto'
  // - local: Only use local Supabase ICD-10 database
  // - remote: Only use WHO ICD-11 API
  // - auto: Try remote first, fallback to local on failure
  mode: (process.env.ICD_PROVIDER || 'auto').toLowerCase() as ICDProviderMode,
  // Whether local provider has been initialized
  localInitialized: false,
  // Track remote failures for auto mode
  remoteFailureCount: 0,
  remoteFailureThreshold: 3, // After this many failures, prefer local
  remoteFailureWindow: 60000, // Reset failure count after this time
  lastRemoteFailure: 0,
};

// =============================================================================
// Configuration
// =============================================================================

const ICD_CONFIG = {
  clientId: process.env.ICD_CLIENT_ID || '',
  clientSecret: process.env.ICD_CLIENT_SECRET || '',
  tokenUrl:
    process.env.ICD_TOKEN_URL ||
    'https://icdaccessmanagement.who.int/connect/token',
  // Use ICD-11 MMS (Mortality and Morbidity Statistics) - ICD-10 doesn't have search endpoint
  apiBase: 'https://id.who.int/icd/release/11/2023-01/mms',
  searchBase: 'https://id.who.int/icd/release/11/2023-01/mms/search',
  // Rate limiting settings
  rateLimitRequests: 20, // Max requests per window
  rateLimitWindow: 60000, // Window size in ms (1 minute)
  // Token refresh buffer (refresh 5 minutes before expiry)
  tokenRefreshBuffer: 300000,
  // Request timeout
  requestTimeout: 15000,
};

log.info('[ICD Main] Service initialized');
log.debug('[ICD Main] Client ID configured:', !!ICD_CONFIG.clientId);

// =============================================================================
// Token Cache with Thread-Safe Refresh
// =============================================================================

let cachedToken: ICDToken | null = null;
let tokenRefreshPromise: Promise<ICDToken> | null = null;

function isTokenValid(): boolean {
  if (!cachedToken) return false;
  // Check if token expires within the refresh buffer
  return Date.now() < cachedToken.expires_at - ICD_CONFIG.tokenRefreshBuffer;
}

function isTokenUsable(): boolean {
  if (!cachedToken) return false;
  // Token is usable if not yet expired (even if within refresh buffer)
  return Date.now() < cachedToken.expires_at - 60000; // 1 minute buffer
}

async function fetchAccessToken(): Promise<ICDToken> {
  if (!ICD_CONFIG.clientId || !ICD_CONFIG.clientSecret) {
    throw createICDError(ICD_ERRORS.NOT_CONFIGURED);
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', ICD_CONFIG.clientId);
    params.append('client_secret', ICD_CONFIG.clientSecret);
    params.append('scope', 'icdapi_access');

    const response = await axios.post(ICD_CONFIG.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: ICD_CONFIG.requestTimeout,
    });

    const token: ICDToken = {
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in,
      expires_at: Date.now() + response.data.expires_in * 1000,
    };

    cachedToken = token;
    log.debug(
      '[ICD Main] Access token obtained, expires in',
      response.data.expires_in,
      'seconds',
    );
    return token;
  } catch (error) {
    log.error('[ICD Main] Token fetch failed:', error);
    throw handleAxiosError(error, ICD_ERRORS.AUTH_FAILED);
  }
}

/**
 * Get a valid access token with thread-safe refresh
 * Multiple concurrent requests will wait for a single token refresh
 */
async function getAccessToken(): Promise<string> {
  // If token is valid, return it immediately
  if (isTokenValid() && cachedToken) {
    return cachedToken.access_token;
  }

  // If a refresh is already in progress, wait for it
  if (tokenRefreshPromise) {
    try {
      const token = await tokenRefreshPromise;
      return token.access_token;
    } catch (error) {
      // If refresh failed but we have a usable token, use it
      if (isTokenUsable() && cachedToken) {
        return cachedToken.access_token;
      }
      throw error;
    }
  }

  // Start a new token refresh
  tokenRefreshPromise = fetchAccessToken();

  try {
    const token = await tokenRefreshPromise;
    return token.access_token;
  } finally {
    tokenRefreshPromise = null;
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitState {
  requests: number[];
  isLimited: boolean;
  limitResetTime: number | null;
}

const rateLimitState: RateLimitState = {
  requests: [],
  isLimited: false,
  limitResetTime: null,
};

function checkRateLimit(): void {
  const now = Date.now();

  // Check if we're in a rate-limited state from the API
  if (rateLimitState.isLimited && rateLimitState.limitResetTime) {
    if (now < rateLimitState.limitResetTime) {
      throw createICDError(ICD_ERRORS.RATE_LIMITED);
    }
    // Reset rate limit state
    rateLimitState.isLimited = false;
    rateLimitState.limitResetTime = null;
  }

  // Clean up old requests outside the window
  rateLimitState.requests = rateLimitState.requests.filter(
    (time) => now - time < ICD_CONFIG.rateLimitWindow,
  );

  // Check if we've exceeded our self-imposed limit
  if (rateLimitState.requests.length >= ICD_CONFIG.rateLimitRequests) {
    throw createICDError(ICD_ERRORS.RATE_LIMITED);
  }
}

function recordRequest(): void {
  rateLimitState.requests.push(Date.now());
}

function handleRateLimitResponse(retryAfter?: number): void {
  rateLimitState.isLimited = true;
  // Default to 60 seconds if Retry-After not provided
  const waitTime = retryAfter ? retryAfter * 1000 : 60000;
  rateLimitState.limitResetTime = Date.now() + waitTime;
  log.warn(
    '[ICD Main] Rate limited by API, waiting',
    waitTime / 1000,
    'seconds',
  );
}

// =============================================================================
// Error Handling
// =============================================================================

function createICDError(
  errorDef: (typeof ICD_ERRORS)[keyof typeof ICD_ERRORS],
  details?: string,
): ICDErrorResponse {
  return {
    ...errorDef,
    message: details ? `${errorDef.message}: ${details}` : errorDef.message,
  };
}

function handleAxiosError(
  error: unknown,
  defaultError: (typeof ICD_ERRORS)[keyof typeof ICD_ERRORS],
): ICDErrorResponse {
  if (!axios.isAxiosError(error)) {
    return createICDError(
      defaultError,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  const axiosError = error as AxiosError;

  // Network errors (no response)
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      return createICDError(ICD_ERRORS.NETWORK_ERROR);
    }
    if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
      return createICDError(
        ICD_ERRORS.SERVICE_UNAVAILABLE,
        'Request timed out',
      );
    }
    return createICDError(ICD_ERRORS.NETWORK_ERROR, axiosError.message);
  }

  const { status } = axiosError.response;

  switch (status) {
    case 401:
      // Clear cached token on auth failure
      cachedToken = null;
      return createICDError(ICD_ERRORS.AUTH_FAILED, 'Token expired or invalid');
    case 403:
      return createICDError(ICD_ERRORS.AUTH_FAILED, 'Access forbidden');
    case 404:
      return createICDError(ICD_ERRORS.NOT_FOUND);
    case 429:
      // Handle rate limiting from API
      const retryAfter = parseInt(
        axiosError.response.headers['retry-after'] || '60',
        10,
      );
      handleRateLimitResponse(retryAfter);
      return createICDError(ICD_ERRORS.RATE_LIMITED);
    case 500:
    case 502:
    case 503:
    case 504:
      return createICDError(ICD_ERRORS.SERVICE_UNAVAILABLE, `HTTP ${status}`);
    default:
      return createICDError(defaultError, `HTTP ${status}`);
  }
}

// =============================================================================
// API Functions
// =============================================================================

async function searchICDCodes(
  keyword: string,
  maxResults: number = 25,
): Promise<ICDSearchItem[]> {
  if (!keyword || keyword.trim().length < 2) {
    return [];
  }

  // Check rate limit before making request
  checkRateLimit();

  try {
    const token = await getAccessToken();
    const searchUrl = `${ICD_CONFIG.searchBase}?q=${encodeURIComponent(keyword.trim())}&useFlexisearch=true&flatResults=true&highlightingEnabled=false`;

    log.debug('[ICD Main] Search:', keyword);

    // Record this request for rate limiting
    recordRequest();

    const response = await axios.get(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Language': 'en',
        'API-Version': 'v2',
      },
      timeout: ICD_CONFIG.requestTimeout,
    });

    const { data } = response;
    if (data.error) {
      throw createICDError(ICD_ERRORS.SEARCH_FAILED, data.errorMessage);
    }

    const results: ICDSearchItem[] = (data.destinationEntities || [])
      .slice(0, maxResults)
      .map((entity: any) => ({
        code: entity.theCode || '',
        title: cleanTitle(entity.title),
        chapter: entity.chapter,
        score: entity.score,
      }))
      .filter((item: ICDSearchItem) => item.code && item.title);

    log.debug('[ICD Main] Search returned', results.length, 'results');
    return results;
  } catch (error) {
    // If it's already an ICD error, re-throw it
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'userMessage' in error
    ) {
      throw error;
    }
    log.error('[ICD Main] Search error:', error);
    throw handleAxiosError(error, ICD_ERRORS.SEARCH_FAILED);
  }
}

async function getICDCode(code: string): Promise<any> {
  if (!code) {
    throw createICDError(ICD_ERRORS.NOT_FOUND, 'No code provided');
  }

  // Check rate limit before making request
  checkRateLimit();

  try {
    const token = await getAccessToken();
    const formattedCode = code.trim().toUpperCase();
    const url = `${ICD_CONFIG.apiBase}/${formattedCode}`;

    log.debug('[ICD Main] Get code:', formattedCode);

    // Record this request for rate limiting
    recordRequest();

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Accept-Language': 'en',
        'API-Version': 'v2',
      },
      timeout: ICD_CONFIG.requestTimeout,
    });

    const { data } = response;
    return {
      code: data.code || data.theCode || formattedCode,
      title: extractTitle(data.title),
      definition: extractTitle(data.definition),
      parent: data.parent?.[0],
      children: data.child,
      inclusions: data.inclusion?.map((i: any) => extractTitle(i.label)),
      exclusions: data.exclusion?.map((e: any) => extractTitle(e.label)),
      browserUrl: data.browserUrl,
    };
  } catch (error) {
    // If it's already an ICD error, re-throw it
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'userMessage' in error
    ) {
      throw error;
    }
    log.error('[ICD Main] Get code error:', error);
    throw handleAxiosError(error, ICD_ERRORS.SEARCH_FAILED);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function extractTitle(titleObj: any): string {
  if (!titleObj) return '';
  if (typeof titleObj === 'string') return titleObj;
  if (titleObj['@value']) return titleObj['@value'];
  if (Array.isArray(titleObj)) {
    const englishTitle = titleObj.find((t: any) => t['@language'] === 'en');
    return englishTitle?.['@value'] || titleObj[0]?.['@value'] || '';
  }
  return '';
}

function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// =============================================================================
// Provider Switching Logic
// =============================================================================

/**
 * Determine which provider to use based on configuration and state
 */
function shouldUseLocalProvider(): boolean {
  if (PROVIDER_CONFIG.mode === 'local') {
    return true;
  }
  if (PROVIDER_CONFIG.mode === 'remote') {
    return false;
  }
  // Auto mode: check if remote has been failing
  const now = Date.now();
  if (
    now - PROVIDER_CONFIG.lastRemoteFailure >
    PROVIDER_CONFIG.remoteFailureWindow
  ) {
    PROVIDER_CONFIG.remoteFailureCount = 0;
  }
  return (
    PROVIDER_CONFIG.remoteFailureCount >= PROVIDER_CONFIG.remoteFailureThreshold
  );
}

/**
 * Record a remote provider failure for auto mode
 */
function recordRemoteFailure(): void {
  PROVIDER_CONFIG.lastRemoteFailure = Date.now();
  PROVIDER_CONFIG.remoteFailureCount++;
  log.debug(
    `[ICD Main] Remote failure count: ${PROVIDER_CONFIG.remoteFailureCount}`,
  );
}

/**
 * Reset remote failure count on success
 */
function resetRemoteFailures(): void {
  if (PROVIDER_CONFIG.remoteFailureCount > 0) {
    PROVIDER_CONFIG.remoteFailureCount = 0;
    log.debug('[ICD Main] Remote failure count reset');
  }
}

/**
 * Search with provider fallback
 */
async function searchWithFallback(
  keyword: string,
  maxResults: number = 25,
): Promise<ICDSearchItem[]> {
  const useLocal = shouldUseLocalProvider();

  if (PROVIDER_CONFIG.mode === 'local' || useLocal) {
    // Local only or auto mode preferring local
    try {
      log.debug('[ICD Main] Using local provider');
      const localResults = await searchLocalICDCodes(keyword, maxResults);
      return localResults.map((item: LocalICDSearchItem) => ({
        code: item.code,
        title: item.title,
        chapter: item.chapter,
        score: item.score,
      }));
    } catch (error) {
      if (PROVIDER_CONFIG.mode === 'local') {
        // Local only mode - throw the error
        log.error('[ICD Main] Local search failed:', error);
        throw createICDError(ICD_ERRORS.LOCAL_UNAVAILABLE);
      }
      // Auto mode - try remote
      log.warn('[ICD Main] Local search failed, trying remote:', error);
    }
  }

  // Try remote
  try {
    log.debug('[ICD Main] Using remote provider');
    const results = await searchICDCodes(keyword, maxResults);
    resetRemoteFailures();
    return results;
  } catch (error) {
    recordRemoteFailure();

    if (PROVIDER_CONFIG.mode === 'remote') {
      // Remote only mode - throw the error
      throw error;
    }

    // Auto mode - try local fallback
    log.warn('[ICD Main] Remote search failed, trying local fallback');
    try {
      const localResults = await searchLocalICDCodes(keyword, maxResults);
      return localResults.map((item: LocalICDSearchItem) => ({
        code: item.code,
        title: item.title,
        chapter: item.chapter,
        score: item.score,
      }));
    } catch (localError) {
      log.error('[ICD Main] Both providers failed');
      // Throw the original remote error as it's more informative
      throw error;
    }
  }
}

/**
 * Get code with provider fallback
 */
async function getCodeWithFallback(code: string): Promise<any> {
  const useLocal = shouldUseLocalProvider();

  if (PROVIDER_CONFIG.mode === 'local' || useLocal) {
    // Local only or auto mode preferring local
    try {
      log.debug('[ICD Main] Getting code from local provider');
      const localResult = await getLocalICDCode(code);
      if (localResult) {
        return {
          code: localResult.code,
          title: localResult.title,
          definition: localResult.definition || '',
        };
      }
      if (PROVIDER_CONFIG.mode === 'local') {
        throw createICDError(ICD_ERRORS.NOT_FOUND);
      }
      // Not found locally in auto mode - try remote
      log.debug('[ICD Main] Code not found locally, trying remote');
    } catch (error) {
      if (PROVIDER_CONFIG.mode === 'local') {
        throw error;
      }
      log.warn('[ICD Main] Local get code failed, trying remote:', error);
    }
  }

  // Try remote
  try {
    log.debug('[ICD Main] Getting code from remote provider');
    const result = await getICDCode(code);
    resetRemoteFailures();
    return result;
  } catch (error) {
    recordRemoteFailure();

    if (PROVIDER_CONFIG.mode === 'remote') {
      throw error;
    }

    // Auto mode - try local fallback
    log.warn('[ICD Main] Remote get code failed, trying local fallback');
    try {
      const localResult = await getLocalICDCode(code);
      if (localResult) {
        return {
          code: localResult.code,
          title: localResult.title,
          definition: localResult.definition || '',
        };
      }
      throw createICDError(ICD_ERRORS.NOT_FOUND);
    } catch (localError) {
      throw error;
    }
  }
}

// =============================================================================
// IPC Handlers
// =============================================================================

export function registerICDHandlers(): void {
  log.info('[ICD Main] Registering IPC handlers');
  log.info(`[ICD Main] Provider mode: ${PROVIDER_CONFIG.mode}`);

  // Initialize local provider for local or auto modes
  if (PROVIDER_CONFIG.mode !== 'remote') {
    PROVIDER_CONFIG.localInitialized = initLocalICDProvider();
    if (PROVIDER_CONFIG.localInitialized) {
      log.info('[ICD Main] Local ICD provider initialized');
    } else {
      log.warn('[ICD Main] Local ICD provider not available');
    }
  }

  // Search handler with provider switching
  ipcMain.handle(
    'icd:search',
    async (_event, rawKeyword: unknown, rawMaxResults?: unknown) => {
      try {
        const { keyword, maxResults } = parseIcdSearchPayload(
          rawKeyword,
          rawMaxResults,
        );
        const results = await searchWithFallback(keyword, maxResults);
        return parseIcdOutput(
          icdSearchSuccessResponseSchema,
          { success: true, data: results },
          'icd:search',
        );
      } catch (error: any) {
        // Return structured error for frontend
        if (error && typeof error === 'object' && 'userMessage' in error) {
          return parseIcdOutput(
            icdErrorResponseSchema,
            {
              success: false,
              error: error.userMessage,
              errorCode: error.code,
              retryable: error.retryable,
            },
            'icd:search',
          );
        }
        return parseIcdOutput(
          icdErrorResponseSchema,
          {
            success: false,
            error: error?.message || 'Search failed',
            errorCode: 'ICD_UNKNOWN_ERROR',
            retryable: true,
          },
          'icd:search',
        );
      }
    },
  );

  // Get code handler with provider switching
  ipcMain.handle('icd:getCode', async (_event, rawCode: unknown) => {
    try {
      const code = parseIcdCodePayload(rawCode);
      const result = await getCodeWithFallback(code);
      return parseIcdOutput(
        icdCodeSuccessResponseSchema,
        { success: true, data: result },
        'icd:getCode',
      );
    } catch (error: any) {
      // Return structured error for frontend
      if (error && typeof error === 'object' && 'userMessage' in error) {
        return parseIcdOutput(
          icdErrorResponseSchema,
          {
            success: false,
            error: error.userMessage,
            errorCode: error.code,
            retryable: error.retryable,
          },
          'icd:getCode',
        );
      }
      return parseIcdOutput(
        icdErrorResponseSchema,
        {
          success: false,
          error: error?.message || 'Failed to get code',
          errorCode: 'ICD_UNKNOWN_ERROR',
          retryable: true,
        },
        'icd:getCode',
      );
    }
  });

  // Enhanced status handler with provider info
  ipcMain.handle('icd:status', async () => {
    const localStatus = getLocalICDProviderStatus();

    return parseIcdOutput(
      icdStatusResponseSchema,
      {
        // Provider configuration
        providerMode: PROVIDER_CONFIG.mode,
        localInitialized: PROVIDER_CONFIG.localInitialized,
        // Remote provider status
        configured: !!ICD_CONFIG.clientId && !!ICD_CONFIG.clientSecret,
        hasToken: !!cachedToken,
        tokenValid: isTokenValid(),
        rateLimited: rateLimitState.isLimited,
        rateLimitResetTime: rateLimitState.limitResetTime,
        requestsInWindow: rateLimitState.requests.length,
        // Local provider status
        localAvailable: localStatus.available,
        localCodesCount: localStatus.codesCount,
        localError: localStatus.error,
        // Auto mode status
        remoteFailureCount: PROVIDER_CONFIG.remoteFailureCount,
      },
      'icd:status',
    );
  });

  // New handler to check local provider availability
  ipcMain.handle('icd:checkLocal', async () => {
    const available = await checkLocalICDAvailability();
    return parseIcdOutput(
      icdCheckLocalResponseSchema,
      { available, status: getLocalICDProviderStatus() },
      'icd:checkLocal',
    );
  });

  log.info('[ICD Main] IPC handlers registered');
}
