/**
 * Local ICD-10 Provider - Main Process
 *
 * This module provides local ICD-10 code lookup via Supabase database.
 * It's used as a fallback when the WHO ICD-11 API is unavailable,
 * or as the primary provider when configured.
 *
 * The local database should be seeded with ICD-10-CM codes using:
 *   node scripts/seed-icd10.js
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import log from 'electron-log';
import { getEffectiveConfig } from './serverConfig';

// =============================================================================
// Types
// =============================================================================

export interface LocalICDSearchItem {
  code: string;
  title: string;
  score?: number;
  chapter?: string;
}

export interface LocalICDCode {
  code: string;
  title: string;
  definition?: string;
}

export interface LocalICDStats {
  total_codes: number;
  chapters_count: number;
  last_updated: string | null;
}

export interface LocalProviderStatus {
  available: boolean;
  configured: boolean;
  codesCount: number;
  lastCheck: number;
  error?: string;
}

// =============================================================================
// Configuration (dynamic - supports runtime configuration)
// =============================================================================

function getLocalICDConfig() {
  // First try environment variables
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
      tableName: 'icd10_codes',
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
    };
  }

  // Try saved configuration
  const config = getEffectiveConfig();
  if (config) {
    return {
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseAnonKey,
      tableName: 'icd10_codes',
      cacheTimeout: 5 * 60 * 1000,
    };
  }

  // Fallback to localhost
  return {
    supabaseUrl: 'http://127.0.0.1:54321',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
    tableName: 'icd10_codes',
    cacheTimeout: 5 * 60 * 1000,
  };
}

// =============================================================================
// State
// =============================================================================

let supabaseClient: SupabaseClient | null = null;
let LOCAL_ICD_CONFIG = getLocalICDConfig();
const providerStatus: LocalProviderStatus = {
  available: false,
  configured: false,
  codesCount: 0,
  lastCheck: 0,
};

// Simple cache for recent searches
const searchCache = new Map<
  string,
  { results: LocalICDSearchItem[]; timestamp: number }
>();
const CACHE_TTL = 60 * 1000; // 1 minute

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the Supabase client for local ICD lookups
 */
export function initLocalICDProvider(): boolean {
  // Refresh configuration on each init
  LOCAL_ICD_CONFIG = getLocalICDConfig();

  if (!LOCAL_ICD_CONFIG.supabaseKey) {
    log.warn('[ICD Local] No Supabase key configured, local provider disabled');
    providerStatus.configured = false;
    providerStatus.available = false;
    return false;
  }

  try {
    supabaseClient = createClient(
      LOCAL_ICD_CONFIG.supabaseUrl,
      LOCAL_ICD_CONFIG.supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    providerStatus.configured = true;
    log.info('[ICD Local] Provider initialized');

    // Check availability asynchronously
    checkLocalICDAvailability().catch((err) => {
      log.warn('[ICD Local] Initial availability check failed:', err.message);
    });

    return true;
  } catch (error) {
    log.error('[ICD Local] Failed to initialize:', error);
    providerStatus.configured = false;
    providerStatus.available = false;
    providerStatus.error =
      error instanceof Error ? error.message : 'Initialization failed';
    return false;
  }
}

/**
 * Check if local ICD-10 data is available
 */
export async function checkLocalICDAvailability(): Promise<boolean> {
  if (!supabaseClient) {
    providerStatus.available = false;
    return false;
  }

  try {
    // Check if table exists and has data
    const { count, error } = await supabaseClient
      .from(LOCAL_ICD_CONFIG.tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        log.warn('[ICD Local] Table icd10_codes does not exist');
        providerStatus.available = false;
        providerStatus.error =
          'Table not found. Run migration 072_icd10_codes_table.sql';
      } else {
        log.warn('[ICD Local] Availability check error:', error.message);
        providerStatus.error = error.message;
        providerStatus.available = false;
      }
      return false;
    }

    providerStatus.codesCount = count || 0;
    providerStatus.available = (count || 0) > 0;
    providerStatus.lastCheck = Date.now();
    providerStatus.error = undefined;

    if (!providerStatus.available) {
      log.warn(
        '[ICD Local] Table exists but is empty. Run: node scripts/seed-icd10.js',
      );
    } else {
      log.info(`[ICD Local] Available with ${count} codes`);
    }

    return providerStatus.available;
  } catch (error) {
    log.error('[ICD Local] Availability check failed:', error);
    providerStatus.available = false;
    providerStatus.error =
      error instanceof Error ? error.message : 'Unknown error';
    return false;
  }
}

// =============================================================================
// Search Functions
// =============================================================================

/**
 * Search ICD-10 codes locally via Supabase
 */
export async function searchLocalICDCodes(
  keyword: string,
  maxResults: number = 25,
): Promise<LocalICDSearchItem[]> {
  if (!keyword || keyword.trim().length < 2) {
    return [];
  }

  const searchTerm = keyword.trim();
  const cacheKey = `${searchTerm.toLowerCase()}:${maxResults}`;

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    log.debug('[ICD Local] Cache hit for:', searchTerm);
    return cached.results;
  }

  if (!supabaseClient) {
    throw new Error('Local ICD provider not initialized');
  }

  try {
    log.debug('[ICD Local] Searching:', searchTerm);

    // Try using the RPC function first (more sophisticated search)
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'search_icd10_codes',
      {
        p_keyword: searchTerm,
        p_max_results: maxResults,
      },
    );

    if (!rpcError && rpcData && rpcData.length > 0) {
      const results: LocalICDSearchItem[] = rpcData.map((row: any) => ({
        code: row.code,
        title: row.description,
        score: row.match_score,
        chapter: row.code?.charAt(0),
      }));

      // Cache results
      searchCache.set(cacheKey, { results, timestamp: Date.now() });
      log.debug('[ICD Local] RPC search returned', results.length, 'results');
      return results;
    }

    // Fallback to direct query if RPC fails or returns empty
    log.debug('[ICD Local] Falling back to direct query');

    const safeSearch = searchTerm.replace(/[,()]/g, '').trim();
    const searchPattern = `%${safeSearch}%`;
    const { data, error } = await supabaseClient
      .from(LOCAL_ICD_CONFIG.tableName)
      .select('code, description')
      .or(`code.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order('code')
      .limit(maxResults);

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    const results: LocalICDSearchItem[] = (data || []).map((row) => ({
      code: row.code,
      title: row.description,
      chapter: row.code?.charAt(0),
    }));

    // Sort by relevance (exact code match first, then code prefix, then alphabetically)
    results.sort((a, b) => {
      const aCodeUpper = a.code.toUpperCase();
      const bCodeUpper = b.code.toUpperCase();
      const termUpper = searchTerm.toUpperCase();

      // Exact code match
      if (aCodeUpper === termUpper) return -1;
      if (bCodeUpper === termUpper) return 1;

      // Code starts with search term
      const aStartsWith = aCodeUpper.startsWith(termUpper);
      const bStartsWith = bCodeUpper.startsWith(termUpper);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // Alphabetical
      return aCodeUpper.localeCompare(bCodeUpper);
    });

    // Cache results
    searchCache.set(cacheKey, { results, timestamp: Date.now() });
    log.debug('[ICD Local] Direct query returned', results.length, 'results');
    return results;
  } catch (error) {
    log.error('[ICD Local] Search error:', error);
    throw error;
  }
}

/**
 * Get a single ICD-10 code by exact code
 */
export async function getLocalICDCode(
  code: string,
): Promise<LocalICDCode | null> {
  if (!code || code.trim().length === 0) {
    return null;
  }

  if (!supabaseClient) {
    throw new Error('Local ICD provider not initialized');
  }

  const formattedCode = code.trim().toUpperCase();

  try {
    log.debug('[ICD Local] Getting code:', formattedCode);

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc(
      'get_icd10_code',
      { p_code: formattedCode },
    );

    if (!rpcError && rpcData && rpcData.length > 0) {
      return {
        code: rpcData[0].code,
        title: rpcData[0].description,
      };
    }

    // Fallback to direct query
    const { data, error } = await supabaseClient
      .from(LOCAL_ICD_CONFIG.tableName)
      .select('code, description')
      .eq('code', formattedCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        log.debug('[ICD Local] Code not found:', formattedCode);
        return null;
      }
      throw new Error(`Get code failed: ${error.message}`);
    }

    return {
      code: data.code,
      title: data.description,
    };
  } catch (error) {
    log.error('[ICD Local] Get code error:', error);
    throw error;
  }
}

// =============================================================================
// Status Functions
// =============================================================================

/**
 * Get the current status of the local ICD provider
 */
export function getLocalICDProviderStatus(): LocalProviderStatus {
  return { ...providerStatus };
}

/**
 * Clear the search cache
 */
export function clearLocalICDCache(): void {
  searchCache.clear();
  log.debug('[ICD Local] Cache cleared');
}

// =============================================================================
// ICD-10 Chapter Information
// =============================================================================

export const ICD10_CHAPTERS: Record<string, string> = {
  A: 'Certain infectious and parasitic diseases (A00-B99)',
  B: 'Certain infectious and parasitic diseases (A00-B99)',
  C: 'Neoplasms (C00-D49)',
  D: 'Neoplasms / Diseases of blood (C00-D89)',
  E: 'Endocrine, nutritional and metabolic diseases (E00-E89)',
  F: 'Mental, behavioral and neurodevelopmental disorders (F01-F99)',
  G: 'Diseases of the nervous system (G00-G99)',
  H: 'Diseases of the eye and adnexa / ear (H00-H95)',
  I: 'Diseases of the circulatory system (I00-I99)',
  J: 'Diseases of the respiratory system (J00-J99)',
  K: 'Diseases of the digestive system (K00-K95)',
  L: 'Diseases of the skin and subcutaneous tissue (L00-L99)',
  M: 'Diseases of the musculoskeletal system (M00-M99)',
  N: 'Diseases of the genitourinary system (N00-N99)',
  O: 'Pregnancy, childbirth and the puerperium (O00-O9A)',
  P: 'Certain conditions originating in perinatal period (P00-P96)',
  Q: 'Congenital malformations (Q00-Q99)',
  R: 'Symptoms, signs and abnormal findings (R00-R99)',
  S: 'Injury, poisoning and external causes (S00-T88)',
  T: 'Injury, poisoning and external causes (S00-T88)',
  U: 'Codes for special purposes (U00-U85)',
  V: 'External causes of morbidity (V00-Y99)',
  W: 'External causes of morbidity (V00-Y99)',
  X: 'External causes of morbidity (V00-Y99)',
  Y: 'External causes of morbidity (V00-Y99)',
  Z: 'Factors influencing health status (Z00-Z99)',
};

/**
 * Get the chapter name for an ICD-10 code
 */
export function getICD10ChapterName(code: string): string | null {
  if (!code) return null;
  const chapter = code.charAt(0).toUpperCase();
  return ICD10_CHAPTERS[chapter] || null;
}
