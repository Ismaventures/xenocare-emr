import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  configurationsApi,
  ConfigurationFilters,
} from '../api/configurations.api';
import { UpdateSystemConfigurationDTO } from '../dtos/configurations.dto';

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
    backgroundScope = 'configurations:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

export const configurationKeys = {
  all: ['configurations'] as const,
  categories: () => [...configurationKeys.all, 'categories'] as const,
  list: (filters: ConfigurationFilters) =>
    [...configurationKeys.all, 'list', filters] as const,
};

export function useConfigCategories() {
  return useQuery({
    queryKey: configurationKeys.categories(),
    queryFn: () => configurationsApi.getCategories(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useSystemConfigurations(filters: ConfigurationFilters = {}) {
  return useQuery({
    queryKey: configurationKeys.list(filters),
    queryFn: () => configurationsApi.getConfigurations(filters),
  });
}

export function useUpdateSystemConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSystemConfigurationDTO) =>
      configurationsApi.updateConfiguration(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: configurationKeys.all }),
  });
}
