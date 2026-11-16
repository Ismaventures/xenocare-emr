/**
 * useAIQuery — React hook for AI-assisted clinical queries.
 *
 * Wraps the AI query API with TanStack React Query for caching,
 * loading states, and error handling.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  queryAI,
  searchRecords,
  checkAIHealth,
  getAIConfig,
} from '../api/ai.api';
import type { AIQueryRequest, AIResponse } from '../types/ai.types';

/**
 * Mutation hook for asking the AI a question.
 * Use `mutate(request)` to trigger, returns loading/error/data states.
 */
export function useAIQuery() {
  return useMutation<AIResponse, Error, AIQueryRequest>({
    mutationFn: queryAI,
    mutationKey: ['ai', 'query'],
  });
}

/**
 * Mutation hook for raw search (no LLM).
 */
export function useAISearch() {
  return useMutation({
    mutationFn: searchRecords,
    mutationKey: ['ai', 'search'],
  });
}

/**
 * Query hook for AI provider health status.
 */
export function useAIHealth(enabled = true) {
  const hasElectronAI =
    typeof window !== 'undefined' &&
    !!(window as { electron?: { ai?: unknown } }).electron?.ai;

  return useQuery({
    queryKey: ['ai', 'health'],
    queryFn: checkAIHealth,
    enabled: enabled && hasElectronAI,
    staleTime: 60_000, // 1 minute
    retry: 1,
  });
}

/**
 * Query hook for AI configuration.
 */
export function useAIConfig(enabled = true) {
  return useQuery({
    queryKey: ['ai', 'config'],
    queryFn: getAIConfig,
    enabled,
    staleTime: 300_000, // 5 minutes
  });
}
