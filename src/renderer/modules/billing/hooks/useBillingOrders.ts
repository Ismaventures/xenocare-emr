// =============================================================================
// Billing Orders React Query Hooks
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { supabase } from '../../../api/supabaseClient';
import { getVisibilityAwareRefetchInterval } from '../../../lib/query/polling';
import { hashPayload } from '../../../lib/idempotency';
import {
  getBillingOrders,
  getPendingBillingOrders,
  getBillingQueue,
  getBillingOrderById,
  createBillingOrder,
  verifyPayment,
  batchVerifyPayments,
  waivePayment,
  cancelBillingOrder,
  getBillingOrderStats,
  getVisitBillingOrders,
  hasUnpaidBillingOrders,
  getVerifiedReceipts,
  getReceiptByNumber,
  getPaymentStatusBySourceRecords,
  getReceiptsGroupedByCategory,
  getEncounterReceiptsSummary,
  ReceiptFilters,
  PaymentStatusMap,
  ReceiptsByCategoryFilters,
} from '../api/billing-order.api';
import {
  CreateBillingOrderDTO,
  VerifyPaymentDTO,
  BatchVerifyPaymentDTO,
  BillingOrderFilters,
} from '../dtos/billing-order.dto';

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
    backgroundScope = 'billing:order:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// Query Keys
export const billingOrderKeys = {
  all: ['billing-orders'] as const,
  lists: () => [...billingOrderKeys.all, 'list'] as const,
  list: (filters: BillingOrderFilters) =>
    [...billingOrderKeys.lists(), filters] as const,
  pending: () => [...billingOrderKeys.all, 'pending'] as const,
  queue: () => [...billingOrderKeys.all, 'queue'] as const,
  details: () => [...billingOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...billingOrderKeys.details(), id] as const,
  visit: (visitId: string) =>
    [...billingOrderKeys.all, 'visit', visitId] as const,
  stats: () => [...billingOrderKeys.all, 'stats'] as const,
  receipts: () => [...billingOrderKeys.all, 'receipts'] as const,
  receiptsList: (filters: ReceiptFilters) =>
    [...billingOrderKeys.receipts(), filters] as const,
  receipt: (receiptNumber: string) =>
    [...billingOrderKeys.receipts(), receiptNumber] as const,
  receiptsByCategory: (filters: ReceiptsByCategoryFilters) =>
    [...billingOrderKeys.receipts(), 'by-category', filters] as const,
  encounterReceiptsSummary: (encounterId: string) =>
    [...billingOrderKeys.receipts(), 'encounter-summary', encounterId] as const,
};

// =============================================================================
// Queries
// =============================================================================

/**
 * Get billing orders with optional filters
 */
export function useBillingOrders(filters: BillingOrderFilters = {}) {
  return useQuery({
    queryKey: billingOrderKeys.list(filters),
    queryFn: () => getBillingOrders(filters),
    staleTime: 10000,
  });
}

/**
 * Get pending billing orders
 */
export function usePendingBillingOrders() {
  return useQuery({
    queryKey: billingOrderKeys.pending(),
    queryFn: getPendingBillingOrders,
    refetchInterval: () => getVisibilityAwareRefetchInterval(15000),
    staleTime: 10000, // Cache for 10 seconds
  });
}

/**
 * Get billing queue (grouped by patient/visit)
 */
export function useBillingQueue() {
  return useQuery({
    queryKey: billingOrderKeys.queue(),
    queryFn: getBillingQueue,
    refetchInterval: () => getVisibilityAwareRefetchInterval(15000),
    staleTime: 10000, // Cache for 10 seconds
  });
}

/**
 * Get single billing order by ID
 */
export function useBillingOrder(billingId: string) {
  return useQuery({
    queryKey: billingOrderKeys.detail(billingId),
    queryFn: () => getBillingOrderById(billingId),
    enabled: !!billingId,
  });
}

/**
 * Get billing orders for a specific visit
 */
export function useVisitBillingOrders(visitId: string) {
  return useQuery({
    queryKey: billingOrderKeys.visit(visitId),
    queryFn: () => getVisitBillingOrders(visitId),
    enabled: !!visitId,
    staleTime: 10000,
  });
}

/**
 * Check if visit has unpaid billing orders
 */
export function useHasUnpaidOrders(visitId: string) {
  return useQuery({
    queryKey: [...billingOrderKeys.visit(visitId), 'unpaid'] as const,
    queryFn: () => hasUnpaidBillingOrders(visitId),
    enabled: !!visitId,
  });
}

/**
 * Get billing order statistics
 */
export function useBillingOrderStats() {
  return useQuery({
    queryKey: billingOrderKeys.stats(),
    queryFn: getBillingOrderStats,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
    staleTime: 30000,
  });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new billing order
 */
export function useCreateBillingOrder() {
  const queryClient = useQueryClient();

  return useBackgroundMutation({
    backgroundScope: 'billing:order:create',
    entityKey: (dto) => `visit:${dto.visit_id || 'none'}`,
    getIdempotencyKey: (dto) => {
      if (dto.idempotency_key) return dto.idempotency_key;

      const fingerprint = hashPayload({
        patient_id: dto.patient_id,
        visit_id: dto.visit_id,
        encounter_id: dto.encounter_id,
        source_module: dto.source_module,
        service_type: dto.service_type,
        service_reference_id: dto.service_reference_id,
        service_name: dto.service_name,
        unit_cost: dto.unit_cost,
        quantity: dto.quantity,
        gross_amount: dto.gross_amount,
        nhis_covered: dto.nhis_covered,
        nhis_percentage: dto.nhis_percentage,
        nhis_payable: dto.nhis_payable,
        patient_payable: dto.patient_payable,
      });

      return `billing-create:${fingerprint.slice(0, 48)}`;
    },
    attachIdempotencyKey: (dto, idempotencyKey) => ({
      ...dto,
      idempotency_key: dto.idempotency_key || idempotencyKey,
    }),
    maxRetries: 4,
    optimisticUpdates: (dto) => {
      const tempId = `temp-billing-${Date.now()}`;
      const optimistic = {
        id: tempId,
        billing_id: tempId,
        visit_id: dto.visit_id,
        patient_id: dto.patient_id,
        status: 'Pending',
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };

      return [
        {
          queryKey: billingOrderKeys.pending(),
          updater: (prev) =>
            Array.isArray(prev) ? [optimistic, ...prev] : prev,
        },
        {
          queryKey: billingOrderKeys.stats(),
          updater: (prev) => {
            if (!prev || typeof prev !== 'object') return prev;
            const row = prev as Record<string, unknown>;
            const pending =
              typeof row.pending === 'number' ? row.pending + 1 : row.pending;
            const total =
              typeof row.total === 'number' ? row.total + 1 : row.total;
            return {
              ...row,
              pending,
              total,
            };
          },
        },
      ];
    },
    mutationFn: (dto: CreateBillingOrderDTO) => createBillingOrder(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.pending() });
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.queue() });
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.stats() });
      if (data.visit_id) {
        queryClient.invalidateQueries({
          queryKey: billingOrderKeys.visit(data.visit_id),
        });
      }
    },
  });
}

/**
 * Verify payment for a single billing order - with OPTIMISTIC UPDATE
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: VerifyPaymentDTO) => verifyPayment(dto),

    // OPTIMISTIC UPDATE - Update UI instantly
    onMutate: async (dto: VerifyPaymentDTO) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.queue() });
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.pending() });

      // Snapshot for rollback
      const previousQueue = queryClient.getQueryData(billingOrderKeys.queue());
      const previousPending = queryClient.getQueryData(
        billingOrderKeys.pending(),
      );

      // Optimistically update queue - remove the verified item or mark as paid
      queryClient.setQueryData(billingOrderKeys.queue(), (old: any) => {
        if (!old) return old;
        return old
          .map((item: any) => ({
            ...item,
            orders: item.orders.map((order: any) =>
              order.id === dto.billing_id
                ? {
                    ...order,
                    status: 'Paid',
                    paid_amount: order.net_amount,
                    balance_amount: 0,
                  }
                : order,
            ),
          }))
          .filter((item: any) =>
            // Remove items where all orders are paid
            item.orders.some((o: any) => o.status !== 'Paid'),
          );
      });

      // Optimistically update pending orders
      queryClient.setQueryData(billingOrderKeys.pending(), (old: any) => {
        if (!old) return old;
        return old.filter((order: any) => order.id !== dto.billing_id);
      });

      return { previousQueue, previousPending };
    },

    // Rollback on error
    onError: (_err: unknown, _dto: VerifyPaymentDTO, context: any) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(
          billingOrderKeys.queue(),
          context.previousQueue,
        );
      }
      if (context?.previousPending) {
        queryClient.setQueryData(
          billingOrderKeys.pending(),
          context.previousPending,
        );
      }
    },

    // Background sync after completion
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/**
 * Batch verify payments - with OPTIMISTIC UPDATE
 * Returns verified orders which can be used for auto-receipt popup
 */
export function useBatchVerifyPayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BatchVerifyPaymentDTO) => batchVerifyPayments(dto),

    // OPTIMISTIC UPDATE - Update UI instantly
    onMutate: async (dto: BatchVerifyPaymentDTO) => {
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.queue() });
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.pending() });

      const previousQueue = queryClient.getQueryData(billingOrderKeys.queue());
      const previousPending = queryClient.getQueryData(
        billingOrderKeys.pending(),
      );

      const billingIds = new Set(dto.billing_ids);

      // Optimistically remove verified items from queue
      queryClient.setQueryData(billingOrderKeys.queue(), (old: any) => {
        if (!old) return old;
        return old
          .map((item: any) => ({
            ...item,
            orders: item.orders.map((order: any) =>
              billingIds.has(order.id)
                ? {
                    ...order,
                    status: 'Paid',
                    paid_amount: order.net_amount,
                    balance_amount: 0,
                  }
                : order,
            ),
          }))
          .filter((item: any) =>
            item.orders.some((o: any) => o.status !== 'Paid'),
          );
      });

      // Remove from pending
      queryClient.setQueryData(billingOrderKeys.pending(), (old: any) => {
        if (!old) return old;
        return old.filter((order: any) => !billingIds.has(order.id));
      });

      return { previousQueue, previousPending };
    },

    onError: (_err: unknown, _dto: BatchVerifyPaymentDTO, context: any) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(
          billingOrderKeys.queue(),
          context.previousQueue,
        );
      }
      if (context?.previousPending) {
        queryClient.setQueryData(
          billingOrderKeys.pending(),
          context.previousPending,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      // Also invalidate receipts so they refresh
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.receipts() });
    },
  });
}

/**
 * Waive payment - with OPTIMISTIC UPDATE
 */
export function useWaivePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billingId,
      reason,
    }: {
      billingId: string;
      reason: string;
    }) => waivePayment(billingId, reason),

    // OPTIMISTIC UPDATE - Update UI instantly
    onMutate: async ({ billingId }: { billingId: string; reason: string }) => {
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.queue() });
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.pending() });

      const previousQueue = queryClient.getQueryData(billingOrderKeys.queue());
      const previousPending = queryClient.getQueryData(
        billingOrderKeys.pending(),
      );

      // Optimistically mark the order as waived and remove from queue
      queryClient.setQueryData(billingOrderKeys.queue(), (old: any) => {
        if (!old) return old;
        return old
          .map((item: any) => ({
            ...item,
            orders: item.orders.map((order: any) =>
              order.id === billingId || order.billing_id === billingId
                ? { ...order, status: 'Waived', payment_status: 'Waived' }
                : order,
            ),
          }))
          .filter((item: any) =>
            item.orders.some(
              (o: any) =>
                o.status !== 'Paid' &&
                o.status !== 'Waived' &&
                o.status !== 'Cancelled',
            ),
          );
      });

      queryClient.setQueryData(billingOrderKeys.pending(), (old: any) => {
        if (!old) return old;
        return old.filter(
          (order: any) =>
            order.id !== billingId && order.billing_id !== billingId,
        );
      });

      return { previousQueue, previousPending };
    },

    onError: (
      _err: unknown,
      _dto: { billingId: string; reason: string },
      context: any,
    ) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(
          billingOrderKeys.queue(),
          context.previousQueue,
        );
      }
      if (context?.previousPending) {
        queryClient.setQueryData(
          billingOrderKeys.pending(),
          context.previousPending,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/**
 * Cancel billing order - with OPTIMISTIC UPDATE
 */
export function useCancelBillingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      billingId,
      reason,
    }: {
      billingId: string;
      reason: string;
    }) => cancelBillingOrder(billingId, reason),

    // OPTIMISTIC UPDATE - Update UI instantly
    onMutate: async ({ billingId }: { billingId: string; reason: string }) => {
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.queue() });
      await queryClient.cancelQueries({ queryKey: billingOrderKeys.pending() });

      const previousQueue = queryClient.getQueryData(billingOrderKeys.queue());
      const previousPending = queryClient.getQueryData(
        billingOrderKeys.pending(),
      );

      // Optimistically mark the order as cancelled and remove from queue
      queryClient.setQueryData(billingOrderKeys.queue(), (old: any) => {
        if (!old) return old;
        return old
          .map((item: any) => ({
            ...item,
            orders: item.orders.map((order: any) =>
              order.id === billingId || order.billing_id === billingId
                ? { ...order, status: 'Cancelled', payment_status: 'Cancelled' }
                : order,
            ),
          }))
          .filter((item: any) =>
            item.orders.some(
              (o: any) =>
                o.status !== 'Paid' &&
                o.status !== 'Waived' &&
                o.status !== 'Cancelled',
            ),
          );
      });

      queryClient.setQueryData(billingOrderKeys.pending(), (old: any) => {
        if (!old) return old;
        return old.filter(
          (order: any) =>
            order.id !== billingId && order.billing_id !== billingId,
        );
      });

      return { previousQueue, previousPending };
    },

    onError: (
      _err: unknown,
      _dto: { billingId: string; reason: string },
      context: any,
    ) => {
      if (context?.previousQueue) {
        queryClient.setQueryData(
          billingOrderKeys.queue(),
          context.previousQueue,
        );
      }
      if (context?.previousPending) {
        queryClient.setQueryData(
          billingOrderKeys.pending(),
          context.previousPending,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: billingOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

// =============================================================================
// Receipt Queries
// =============================================================================

/**
 * Get verified receipts with filters
 */
export function useVerifiedReceipts(filters: ReceiptFilters = {}) {
  return useQuery({
    queryKey: billingOrderKeys.receiptsList(filters),
    queryFn: () => getVerifiedReceipts(filters),
  });
}

/**
 * Get receipt by receipt number
 */
export function useReceiptByNumber(receiptNumber: string) {
  return useQuery({
    queryKey: billingOrderKeys.receipt(receiptNumber),
    queryFn: () => getReceiptByNumber(receiptNumber),
    enabled: !!receiptNumber,
  });
}

/**
 * Get receipts grouped by service category
 * Uses existing tables - groups billing_items by item_type
 */
export function useReceiptsGroupedByCategory(
  filters: ReceiptsByCategoryFilters = {},
) {
  return useQuery({
    queryKey: billingOrderKeys.receiptsByCategory(filters),
    queryFn: () => getReceiptsGroupedByCategory(filters),
  });
}

/**
 * Get encounter receipts summary with category breakdown
 */
export function useEncounterReceiptsSummary(encounterId: string) {
  return useQuery({
    queryKey: billingOrderKeys.encounterReceiptsSummary(encounterId),
    queryFn: () => getEncounterReceiptsSummary(encounterId),
    enabled: !!encounterId,
  });
}

// =============================================================================
// Payment Status for Orders
// =============================================================================

/**
 * Get payment status for multiple source records (lab/radiology/pharmacy orders)
 * This allows modules to display payment status badges on their order lists
 */
export function usePaymentStatusForOrders(
  sourceRecordIds: string[],
  sourceModule: 'lab' | 'radiology' | 'pharmacy',
) {
  return useQuery({
    queryKey: [
      ...billingOrderKeys.all,
      'payment-status',
      sourceModule,
      sourceRecordIds,
    ] as const,
    queryFn: () =>
      getPaymentStatusBySourceRecords(sourceRecordIds, sourceModule),
    enabled: sourceRecordIds.length > 0,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Subscribe to billing order changes for real-time updates
 */
export function useBillingSubscription() {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleInvalidate = () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
      }

      invalidateTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: billingOrderKeys.all });
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        invalidateTimerRef.current = null;
      }, 400);
    };

    const channel = supabase
      .channel('billing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_orders',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_items',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_requests',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radiology_requests',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
        },
        () => {
          scheduleInvalidate();
        },
      )
      .subscribe();

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
        invalidateTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export type { PaymentStatusMap };
