/**
 * ICD-11 Service - Renderer Process
 * Uses IPC to communicate with main process for WHO ICD API calls
 * This avoids CORS issues by making requests from Node.js (main process)
 */

// =============================================================================
// Types
// =============================================================================

export interface ICDSearchItem {
  code: string;
  title: string;
  theCode?: string; // Original API field
  chapter?: string;
  score?: number;
  stemId?: string;
  isLeaf?: boolean;
  postcoordinationAvailability?: number;
  descendants?: ICDSearchItem[];
  matchingPVs?: Array<{
    propertyId: string;
    label: string;
    score: number;
    important: boolean;
    foundationUri?: string;
  }>;
}

export interface ICDSearchResult {
  destinationEntities: ICDSearchItem[];
  error: boolean;
  errorMessage?: string;
  resultChopped: boolean;
  wordSuggestionsChopped: boolean;
  guessType: number;
  uniqueSearchId: string;
  words?: Array<{
    label: string;
    dontChangeResult: boolean;
  }>;
}

export interface ICDCode {
  '@context'?: string;
  '@id'?: string;
  code: string;
  title: string;
  codeRange?: string;
  blockId?: string;
  definition?: string;
  longDefinition?: string;
  fullySpecifiedName?: string;
  codingNote?: string;
  source?: string;
  classKind?: string;
  children?: string[];
  parent?: string;
  browserUrl?: string;
  exclusions?: string[];
  inclusions?: string[];
  foundationChildElsewhere?: Array<{
    label: string;
    foundationReference: string;
  }>;
  indexTerm?: Array<{
    label: string;
    foundationReference?: string;
  }>;
}

// IPC response type from main process
interface ICDIPCResponse {
  success: boolean;
  data?: ICDSearchItem[] | ICDCode;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

// Service status response
export interface ICDServiceStatus {
  configured: boolean;
  hasToken: boolean;
  tokenValid: boolean;
  rateLimited: boolean;
  rateLimitResetTime: number | null;
  requestsInWindow: number;
}

// Custom error class for ICD errors
export class ICDError extends Error {
  code: string;

  retryable: boolean;

  constructor(
    message: string,
    code: string = 'ICD_UNKNOWN_ERROR',
    retryable: boolean = true,
  ) {
    super(message);
    this.name = 'ICDError';
    this.code = code;
    this.retryable = retryable;
  }
}

// =============================================================================
// ICD API Functions (via IPC)
// =============================================================================

/**
 * Search ICD codes via IPC to main process
 * @param keyword - Search term
 * @param maxResults - Maximum number of results (default: 25)
 * @returns Array of matching ICD codes
 * @throws ICDError with user-friendly message on failure
 */
export async function searchICDCodes(
  keyword: string,
  maxResults: number = 25,
): Promise<ICDSearchItem[]> {
  if (!keyword || keyword.trim().length < 2) {
    return [];
  }

  try {
    if (!window.electron?.icd) {
      throw new ICDError(
        'ICD service is not available. Please restart the application.',
        'ICD_UNAVAILABLE',
        false,
      );
    }
    console.log('[ICD Service] Searching via IPC:', keyword);
    const response = (await window.electron.icd.search(
      keyword.trim(),
      maxResults,
    )) as ICDIPCResponse;

    if (!response.success) {
      console.error('[ICD Service] Search failed:', response.error);
      throw new ICDError(
        response.error || 'ICD search failed',
        response.errorCode || 'ICD_SEARCH_FAILED',
        response.retryable ?? true,
      );
    }

    // Normalize the data - ensure code field is populated
    const results = ((response.data as ICDSearchItem[]) || []).map((item) => ({
      ...item,
      code: item.code || item.theCode || '',
      title: cleanTitle(item.title),
    }));

    console.log('[ICD Service] Search returned', results.length, 'results');
    return results;
  } catch (error) {
    // Re-throw ICDError as-is
    if (error instanceof ICDError) {
      throw error;
    }
    console.error('[ICD Service] Search error:', error);
    throw new ICDError(
      'Unable to search ICD codes. Please try again.',
      'ICD_SEARCH_FAILED',
      true,
    );
  }
}

/**
 * Search ICD codes with chapter filtering
 * @param keyword - Search term
 * @param chapterFilter - Optional chapter to filter by (not supported via IPC yet)
 * @param maxResults - Maximum number of results
 */
export async function searchICDCodesWithFilter(
  keyword: string,
  chapterFilter?: string,
  maxResults: number = 25,
): Promise<ICDSearchItem[]> {
  // For now, just use regular search - chapter filter can be added to main process later
  const results = await searchICDCodes(keyword, maxResults);

  if (chapterFilter) {
    return results.filter((item) => item.chapter === chapterFilter);
  }

  return results;
}

/**
 * Get detailed ICD code information via IPC to main process
 * @param code - The ICD code (e.g., "5A10")
 * @returns Detailed code information
 * @throws ICDError with user-friendly message on failure
 */
export async function getICDCode(code: string): Promise<ICDCode> {
  if (!code || code.trim().length === 0) {
    throw new ICDError('Code is required', 'ICD_INVALID_INPUT', false);
  }

  try {
    if (!window.electron?.icd) {
      throw new ICDError(
        'ICD service is not available. Please restart the application.',
        'ICD_UNAVAILABLE',
        false,
      );
    }
    console.log('[ICD Service] Getting code via IPC:', code);
    const response = (await window.electron.icd.getCode(
      code.trim(),
    )) as ICDIPCResponse;

    if (!response.success) {
      console.error('[ICD Service] Get code failed:', response.error);
      throw new ICDError(
        response.error || 'Failed to get ICD code',
        response.errorCode || 'ICD_FETCH_FAILED',
        response.retryable ?? true,
      );
    }

    return response.data as ICDCode;
  } catch (error) {
    // Re-throw ICDError as-is
    if (error instanceof ICDError) {
      throw error;
    }
    console.error('[ICD Service] Get code error:', error);
    throw new ICDError(
      'Unable to fetch ICD code details. Please try again.',
      'ICD_FETCH_FAILED',
      true,
    );
  }
}

/**
 * Get the current status of the ICD service
 * @returns Service status including token state and rate limit info
 */
export async function getICDServiceStatus(): Promise<ICDServiceStatus> {
  try {
    if (!window.electron?.icd) {
      return {
        configured: false,
        hasToken: false,
        tokenValid: false,
        rateLimited: false,
        rateLimitResetTime: null,
        requestsInWindow: 0,
      };
    }
    const status = await window.electron.icd.getStatus();
    return status as ICDServiceStatus;
  } catch (error) {
    console.error('[ICD Service] Status check failed:', error);
    return {
      configured: false,
      hasToken: false,
      tokenValid: false,
      rateLimited: false,
      rateLimitResetTime: null,
      requestsInWindow: 0,
    };
  }
}

/**
 * Check if the ICD service is available and ready
 * @returns true if service is configured and not rate limited
 */
export async function isICDServiceAvailable(): Promise<boolean> {
  try {
    const status = await getICDServiceStatus();
    return status.configured && !status.rateLimited;
  } catch {
    return false;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Clean HTML tags and formatting from title
 */
function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Validate if a string looks like an ICD-10 code
 * @param code - The string to validate
 * @returns True if it matches ICD-10 format
 */
export function isValidICDFormat(code: string): boolean {
  if (!code) return false;
  // ICD-10 codes: Letter followed by 2 digits, optionally a dot and more digits
  const icdPattern = /^[A-Z]\d{2}(\.\d{1,2})?$/i;
  return icdPattern.test(code.trim());
}

/**
 * Format ICD code for display
 * @param code - Raw ICD code
 * @returns Formatted code (e.g., "A010" -> "A01.0")
 */
export function formatICDCode(code: string): string {
  if (!code) return '';
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 4) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  }
  return cleaned;
}

/**
 * Format an ICD search result for display
 * @param item - The search result item
 * @returns Formatted string like "A01.0 - Typhoid fever"
 */
export function formatICDResult(item: ICDSearchItem): string {
  const code = item.code || item.theCode || '';
  return `${code} - ${item.title}`;
}

/**
 * Extract the code from a formatted result
 * @param formatted - The formatted string
 * @returns The ICD code portion
 */
export function extractCodeFromFormatted(formatted: string): string | null {
  const match = formatted.match(/^([A-Z]\d{2}(?:\.\d{1,2})?)/);
  return match ? match[1] : null;
}

/**
 * Get the chapter from an ICD-10 code
 * @param code - The ICD code
 * @returns The chapter letter
 */
export function getICDChapter(code: string): string {
  return code.charAt(0);
}

/**
 * Common ICD-10 chapter descriptions
 */
export const ICD_CHAPTERS: Record<string, string> = {
  A: 'Certain infectious and parasitic diseases',
  B: 'Certain infectious and parasitic diseases',
  C: 'Neoplasms',
  D: 'Neoplasms / Diseases of the blood',
  E: 'Endocrine, nutritional and metabolic diseases',
  F: 'Mental, behavioural and neurodevelopmental disorders',
  G: 'Diseases of the nervous system',
  H: 'Diseases of the eye / ear',
  I: 'Diseases of the circulatory system',
  J: 'Diseases of the respiratory system',
  K: 'Diseases of the digestive system',
  L: 'Diseases of the skin and subcutaneous tissue',
  M: 'Diseases of the musculoskeletal system',
  N: 'Diseases of the genitourinary system',
  O: 'Pregnancy, childbirth and the puerperium',
  P: 'Certain conditions originating in the perinatal period',
  Q: 'Congenital malformations, deformations and chromosomal abnormalities',
  R: 'Symptoms, signs and abnormal clinical and laboratory findings',
  S: 'Injury, poisoning and certain other consequences of external causes',
  T: 'Injury, poisoning and certain other consequences of external causes',
  U: 'Codes for special purposes',
  V: 'External causes of morbidity',
  W: 'External causes of morbidity',
  X: 'External causes of morbidity',
  Y: 'External causes of morbidity',
  Z: 'Factors influencing health status and contact with health services',
};

// =============================================================================
// Export Service Object
// =============================================================================

export const ICDService = {
  getCode: getICDCode,
  search: searchICDCodes,
  searchWithFilter: searchICDCodesWithFilter,
  isValidFormat: isValidICDFormat,
  formatCode: formatICDCode,
  formatResult: formatICDResult,
  extractCode: extractCodeFromFormatted,
  getChapter: getICDChapter,
  getStatus: getICDServiceStatus,
  isAvailable: isICDServiceAvailable,
  CHAPTERS: ICD_CHAPTERS,
  Error: ICDError,
};

export default ICDService;
