/**
 * React Query hooks for ICD code lookups
 * Includes proper error handling and retry logic
 */
import { useQuery } from '@tanstack/react-query';
import {
  searchICDCodes,
  getICDCode,
  getICDServiceStatus,
  ICDSearchItem,
  ICDCode,
  ICDServiceStatus,
  ICDError,
} from '../lib/icd';

// =============================================================================
// Query Keys
// =============================================================================

export const icdKeys = {
  all: ['icd'] as const,
  search: (keyword: string) => [...icdKeys.all, 'search', keyword] as const,
  code: (code: string) => [...icdKeys.all, 'code', code] as const,
  status: () => [...icdKeys.all, 'status'] as const,
};

// =============================================================================
// Custom retry logic for ICD errors
// =============================================================================

function shouldRetryICDError(failureCount: number, error: Error): boolean {
  // Don't retry more than 2 times
  if (failureCount >= 2) return false;

  // Check if error is retryable
  if (error instanceof ICDError) {
    return error.retryable;
  }

  // Default: retry network-like errors
  return true;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Search ICD codes by keyword
 * Only searches when keyword is at least 2 characters
 * Handles rate limiting and retries appropriately
 */
export function useICDSearch(keyword: string, options?: { enabled?: boolean }) {
  return useQuery<ICDSearchItem[], Error>({
    queryKey: icdKeys.search(keyword),
    queryFn: () => searchICDCodes(keyword, 30),
    enabled: options?.enabled !== false && keyword.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: shouldRetryICDError,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    // Don't throw errors to UI - they're handled in the hook
    throwOnError: false,
  });
}

/**
 * Get a specific ICD code details
 */
export function useICDCode(
  code: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery<ICDCode, Error>({
    queryKey: icdKeys.code(code || ''),
    queryFn: () => getICDCode(code!),
    enabled: options?.enabled !== false && !!code,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: shouldRetryICDError,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    throwOnError: false,
  });
}

/**
 * Get the current status of the ICD service
 * Useful for showing service health indicators
 */
export function useICDServiceStatus(options?: { enabled?: boolean }) {
  return useQuery<ICDServiceStatus, Error>({
    queryKey: icdKeys.status(),
    queryFn: getICDServiceStatus,
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // Refresh every 30 seconds
    gcTime: 60 * 1000,
    retry: false, // Don't retry status checks
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Poll every minute
  });
}

/**
 * Helper hook to get user-friendly error message from ICD errors
 */
export function useICDErrorMessage(error: Error | null): string | null {
  if (!error) return null;

  if (error instanceof ICDError) {
    return error.message; // This is already user-friendly
  }

  // Generic error message
  return 'An error occurred while searching. Please try again.';
}
