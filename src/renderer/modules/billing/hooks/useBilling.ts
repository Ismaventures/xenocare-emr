import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  cancelInvoice,
  deleteInvoice,
  deleteMultipleInvoices,
  getPayments,
  recordPayment,
  deletePayment,
  deleteMultiplePayments,
  getPriceList,
  createPriceItem,
  updatePriceItem,
  getBillingStats,
} from '../api/billing.api';
import {
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  CreatePaymentDTO,
  CreatePriceItemDTO,
  InvoiceFilters,
  PaymentFilters,
} from '../dtos/billing.dto';

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
    backgroundScope = 'billing:write',
    maxRetries = 4,
    ...restOptions
  } = options;

  return useBackgroundMutation<TData, TError, TVariables, TContext>({
    ...restOptions,
    backgroundScope,
    maxRetries,
  });
};

// =============================================================================
// Query Keys
// =============================================================================

export const billingKeys = {
  all: ['billing'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoicesList: (filters: InvoiceFilters) =>
    [...billingKeys.invoices(), filters] as const,
  invoice: (id: string) => [...billingKeys.invoices(), id] as const,
  payments: () => [...billingKeys.all, 'payments'] as const,
  paymentsList: (filters: PaymentFilters) =>
    [...billingKeys.payments(), filters] as const,
  priceList: (category?: string) =>
    [...billingKeys.all, 'priceList', category] as const,
  stats: (filters?: { dateFrom?: string; dateTo?: string }) =>
    [...billingKeys.all, 'stats', filters] as const,
};

// =============================================================================
// Invoice Hooks
// =============================================================================

/**
 * Get invoices with filters
 */
export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: billingKeys.invoicesList(filters),
    queryFn: () => getInvoices(filters),
  });
}

/**
 * Get single invoice by ID
 */
export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: billingKeys.invoice(invoiceId),
    queryFn: () => getInvoiceById(invoiceId),
    enabled: !!invoiceId,
  });
}

/**
 * Create invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceDTO) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

/**
 * Update invoice
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateInvoiceDTO) => updateInvoice(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({
        queryKey: billingKeys.invoice(data.invoice_id),
      });
    },
  });
}

/**
 * Cancel invoice
 */
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => cancelInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

/**
 * Delete invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      forceDelete,
    }: {
      invoiceId: string;
      forceDelete?: boolean;
    }) => deleteInvoice(invoiceId, forceDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

/**
 * Delete multiple invoices
 */
export function useDeleteMultipleInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceIds: string[]) => deleteMultipleInvoices(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

// =============================================================================
// Payment Hooks
// =============================================================================

/**
 * Get payments
 */
export function usePayments(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: billingKeys.paymentsList(filters),
    queryFn: () => getPayments(filters),
  });
}

/**
 * Record payment - with OPTIMISTIC UPDATE for instant UI response
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentDTO) => recordPayment(data),

    // OPTIMISTIC UPDATE - Update UI immediately before server responds
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: billingKeys.invoices() });
      await queryClient.cancelQueries({
        queryKey: billingKeys.invoice(variables.invoice_id),
      });

      // Snapshot previous values for rollback
      const previousInvoices = queryClient.getQueryData(billingKeys.invoices());
      const previousInvoice = queryClient.getQueryData(
        billingKeys.invoice(variables.invoice_id),
      );

      // Optimistically update the invoice in cache
      queryClient.setQueryData(
        billingKeys.invoice(variables.invoice_id),
        (old: any) => {
          if (!old) return old;
          const newAmountPaid = (old.amount_paid || 0) + variables.amount;
          const newBalance = Math.max(
            0,
            (old.total_amount || 0) - newAmountPaid,
          );
          const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
          return {
            ...old,
            amount_paid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
          };
        },
      );

      // Also update in the invoices list
      queryClient.setQueriesData(
        { queryKey: billingKeys.invoices() },
        (old: any) => {
          if (!old) return old;
          return old.map((inv: any) => {
            if (inv.invoice_id === variables.invoice_id) {
              const newAmountPaid = (inv.amount_paid || 0) + variables.amount;
              const newBalance = Math.max(
                0,
                (inv.total_amount || 0) - newAmountPaid,
              );
              const newStatus = newBalance <= 0 ? 'Paid' : 'Partial';
              return {
                ...inv,
                amount_paid: newAmountPaid,
                balance: newBalance,
                status: newStatus,
              };
            }
            return inv;
          });
        },
      );

      // Return context for rollback
      return { previousInvoices, previousInvoice };
    },

    // If mutation fails, rollback to previous state
    onError: (_err, variables, context) => {
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          billingKeys.invoice(variables.invoice_id),
          context.previousInvoice,
        );
      }
      if (context?.previousInvoices) {
        queryClient.setQueryData(
          billingKeys.invoices(),
          context.previousInvoices,
        );
      }
    },

    // After success or error, refetch to ensure sync with server
    onSettled: () => {
      // Background sync - don't await, let it happen in background
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

/**
 * Delete payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

/**
 * Delete multiple payments
 */
export function useDeleteMultiplePayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentIds: string[]) => deleteMultiplePayments(paymentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: billingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

// =============================================================================
// Price List Hooks
// =============================================================================

/**
 * Get price list
 */
export function usePriceList(category?: string) {
  return useQuery({
    queryKey: billingKeys.priceList(category),
    queryFn: () => getPriceList(category),
  });
}

/**
 * Create price item
 */
export function useCreatePriceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePriceItemDTO) => createPriceItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.priceList() });
    },
  });
}

/**
 * Update price item
 */
export function useUpdatePriceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      priceId,
      updates,
    }: {
      priceId: string;
      updates: Partial<CreatePriceItemDTO & { is_active: boolean }>;
    }) => updatePriceItem(priceId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.priceList() });
    },
  });
}

// =============================================================================
// Statistics Hooks
// =============================================================================

/**
 * Get billing statistics
 */
export function useBillingStats(filters?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: billingKeys.stats(filters),
    queryFn: () => getBillingStats(filters || {}),
    refetchInterval: 60000, // Refresh every minute
  });
}
