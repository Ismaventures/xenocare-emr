import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../../../api/supabaseClient';
import { inventoryApi, InventoryFilters } from '../api/inventory.api';
import {
  CreateInventoryItemDTO,
  UpdateInventoryItemDTO,
} from '../dtos/inventory.dto';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';

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
    backgroundScope = 'inventory:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

export const inventoryKeys = {
  all: ['inventory'] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  items: (filters: InventoryFilters) =>
    [...inventoryKeys.all, 'items', filters] as const,
};

export function useInventoryCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => inventoryApi.getCategories(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useInventoryItems(filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: inventoryKeys.items(filters),
    queryFn: () => inventoryApi.getItems(filters),
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryItemDTO) =>
      inventoryApi.createItem(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInventoryItemDTO) =>
      inventoryApi.updateItem(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: inventoryKeys.all }),
  });
}

/**
 * Subscribe to inventory changes for real-time updates
 */
export function useInventorySubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_categories',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
