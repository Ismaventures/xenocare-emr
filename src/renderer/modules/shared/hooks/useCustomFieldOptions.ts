/**
 * =============================================================================
 * useCustomFieldOptions — Hook for managing user-defined dropdown options
 * =============================================================================
 * Provides a React Query-backed interface for fetching and adding custom
 * "Other" options to any dropdown field. Options are persisted in the
 * custom_field_options table and cached for 10 minutes.
 * =============================================================================
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  fetchCustomFieldOptions,
  addCustomFieldOption,
  type CustomFieldOption,
} from '../api/custom-field-options.api';

const useMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<
    UseBackgroundMutationOptions<TData, TError, TVariables, TContext>,
    'backgroundScope' | 'maxRetries'
  > & {
    backgroundScope?: string;
    maxRetries?: number;
  },
) => {
  const {
    backgroundScope = 'custom-fields:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

const CACHE_KEY_PREFIX = 'custom-field-options';
const STALE_TIME = 10 * 60 * 1000; // 10 minutes

export function useCustomFieldOptions(fieldIdentifier: string) {
  const queryClient = useQueryClient();

  const { data: customOptions = [] } = useQuery<CustomFieldOption[]>({
    queryKey: [CACHE_KEY_PREFIX, fieldIdentifier],
    queryFn: () => fetchCustomFieldOptions(fieldIdentifier),
    staleTime: STALE_TIME,
    enabled: !!fieldIdentifier,
  });

  const addOptionMutation = useMutation({
    mutationFn: ({ label, clinicId }: { label: string; clinicId?: string }) =>
      addCustomFieldOption(fieldIdentifier, label, clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CACHE_KEY_PREFIX, fieldIdentifier],
      });
    },
  });

  return {
    /** Custom options previously added by users */
    customOptions,
    /** Add a new custom option for this field */
    addOption: (label: string, clinicId?: string) =>
      addOptionMutation.mutateAsync({ label, clinicId } as any),
    /** Whether an add operation is in progress */
    isAdding: addOptionMutation.isPending,
  };
}
