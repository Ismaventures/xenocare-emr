/**
 * Records History Module - React Query Hooks
 * NDC MEDICAL CENTRE EMR
 */

import { useQuery } from '@tanstack/react-query';
import { fetchRecordsHistory } from '../api/records-history.api';
import type { RecordsHistoryFilters } from '../types/records-history.types';

export const recordsHistoryKeys = {
  all: ['records-history'] as const,
  list: (filters: RecordsHistoryFilters) =>
    ['records-history', 'list', filters] as const,
};

export function useRecordsHistory(filters: RecordsHistoryFilters) {
  return useQuery({
    queryKey: recordsHistoryKeys.list(filters),
    queryFn: () => fetchRecordsHistory(filters),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}
