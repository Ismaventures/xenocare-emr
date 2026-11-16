import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import { supabase } from '../../../api/supabaseClient';
import {
  getPrescriptions,
  getPrescription,
  dispenseMedication,
  cancelPrescription,
  deletePrescription,
  deletePrescriptionsBatch,
  getDrugs,
  getDrug,
  createDrug,
  updateDrug,
  restockDrug,
  getLowStockDrugs,
  getPharmacyStats,
  getPendingPrescriptions,
  // Batch-related APIs
  getDrugBatches,
  getBatch,
  createBatch,
  updateBatch,
  getDispensableBatches,
  getDrugAvailableStock,
  dispenseMedicationWithBatch,
  createStockMovement,
  getStockMovements,
  adjustBatchStock,
  getPharmacyInventoryStats,
  getNearExpiryDrugs,
  getExpiredDrugs,
  getDrugInventorySummary,
  writeOffBatch,
  returnDispensedMedication,
  createMultipleBatches,
  // Approval workflow APIs
  acceptPrescription,
  rejectPrescription,
  batchAcceptPrescriptions,
  batchRejectPrescriptions,
  AcceptPrescriptionDTO,
  RejectPrescriptionDTO,
  BatchAcceptPrescriptionsDTO,
  BatchRejectPrescriptionsDTO,
  getPharmacyFinancials,
  getPharmacyAuditTrail,
} from '../api/pharmacy.api';
import {
  PrescriptionFilters,
  DrugFilters,
  DispenseDTO,
  CreateDrugDTO,
  UpdateDrugDTO,
  // Batch-related DTOs
  BatchFilters,
  CreateBatchDTO,
  UpdateBatchDTO,
  BatchDispenseDTO,
  CreateStockMovementDTO,
} from '../dtos/pharmacy.dto';

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
    backgroundScope = 'pharmacy:write',
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

export const pharmacyKeys = {
  all: ['pharmacy'] as const,
  prescriptions: () => [...pharmacyKeys.all, 'prescriptions'] as const,
  prescriptionList: (filters: PrescriptionFilters) =>
    [...pharmacyKeys.prescriptions(), filters] as const,
  prescription: (id: string) => [...pharmacyKeys.prescriptions(), id] as const,
  drugs: () => [...pharmacyKeys.all, 'drugs'] as const,
  drugList: (filters: DrugFilters) =>
    [...pharmacyKeys.drugs(), filters] as const,
  drug: (id: string) => [...pharmacyKeys.drugs(), id] as const,
  lowStock: () => [...pharmacyKeys.all, 'low-stock'] as const,
  stats: () => [...pharmacyKeys.all, 'stats'] as const,
  pending: (patientId?: string) =>
    [...pharmacyKeys.all, 'pending', patientId] as const,
  // Batch-related keys
  batches: () => [...pharmacyKeys.all, 'batches'] as const,
  drugBatches: (drugId: string, filters?: BatchFilters) =>
    [...pharmacyKeys.batches(), drugId, filters] as const,
  batch: (batchId: string) => [...pharmacyKeys.batches(), batchId] as const,
  dispensableBatches: (drugId: string, quantity: number) =>
    [...pharmacyKeys.batches(), 'dispensable', drugId, quantity] as const,
  availableStock: (drugId: string) =>
    [...pharmacyKeys.drugs(), 'available-stock', drugId] as const,
  stockMovements: (filters: any) =>
    [...pharmacyKeys.all, 'movements', filters] as const,
  inventoryStats: () => [...pharmacyKeys.all, 'inventory-stats'] as const,
  nearExpiry: (days?: number) =>
    [...pharmacyKeys.all, 'near-expiry', days] as const,
  expired: () => [...pharmacyKeys.all, 'expired'] as const,
  inventorySummary: (filters: DrugFilters) =>
    [...pharmacyKeys.all, 'inventory-summary', filters] as const,
  financials: () => [...pharmacyKeys.all, 'financials'] as const,
  auditTrail: () => [...pharmacyKeys.all, 'audit-trail'] as const,
};

// =============================================================================
// Prescription Queries
// =============================================================================

/**
 * Get prescriptions with filters
 */
export function usePrescriptions(filters: PrescriptionFilters = {}) {
  return useQuery({
    queryKey: pharmacyKeys.prescriptionList(filters),
    queryFn: () => getPrescriptions(filters),
    refetchInterval: 30000, // Refresh every 30 seconds (reduced from 5s)
    staleTime: 15000, // Cache for 15 seconds
  });
}

/**
 * Get a single prescription
 */
export function usePrescription(prescriptionId: string | null) {
  return useQuery({
    queryKey: pharmacyKeys.prescription(prescriptionId || ''),
    queryFn: () => getPrescription(prescriptionId!),
    enabled: !!prescriptionId,
  });
}

/**
 * Get pending prescriptions
 */
export function usePendingPrescriptions(patientId?: string) {
  return useQuery({
    queryKey: pharmacyKeys.pending(patientId),
    queryFn: () => getPendingPrescriptions(patientId),
    refetchInterval: 30000, // Refresh every 30 seconds (reduced from 5s)
    staleTime: 15000, // Cache for 15 seconds
  });
}

// =============================================================================
// Drug Queries
// =============================================================================

/**
 * Get drugs with filters
 */
export function useDrugs(filters: DrugFilters = {}) {
  return useQuery({
    queryKey: pharmacyKeys.drugList(filters),
    queryFn: () => getDrugs(filters),
  });
}

/**
 * Get a single drug
 */
export function useDrug(drugId: string | null) {
  return useQuery({
    queryKey: pharmacyKeys.drug(drugId || ''),
    queryFn: () => getDrug(drugId!),
    enabled: !!drugId,
  });
}

/**
 * Get low stock drugs
 */
export function useLowStockDrugs() {
  return useQuery({
    queryKey: pharmacyKeys.lowStock(),
    queryFn: getLowStockDrugs,
    refetchInterval: 60000, // Refresh every 60 seconds (increased from 30s)
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Get pharmacy statistics
 */
export function usePharmacyStats() {
  return useQuery({
    queryKey: pharmacyKeys.stats(),
    queryFn: getPharmacyStats,
    refetchInterval: 30000, // Refresh every 30 seconds (reduced from 5s)
    staleTime: 15000, // Cache for 15 seconds
  });
}

// =============================================================================
// Drug Catalogue Mutations
// =============================================================================

/**
 * Create a new drug in the catalogue
 */
export function useCreateDrug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDrugDTO) => createDrug(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
    },
  });
}

/**
 * Update a drug in the catalogue
 */
export function useUpdateDrugCatalogue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDrugDTO) => updateDrug(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.drug(variables.drug_id),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
    },
  });
}

// =============================================================================
// Prescription Mutations - With Optimistic Updates for Instant UI
// =============================================================================

/**
 * Dispense medication - OPTIMISTIC UPDATE (status change is safe)
 */
export function useDispenseMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DispenseDTO) => dispenseMedication(data),
    onMutate: async (dispenseData) => {
      await queryClient.cancelQueries({
        queryKey: pharmacyKeys.prescriptions(),
      });
      await queryClient.cancelQueries({ queryKey: pharmacyKeys.stats() });

      const previousPrescriptions = queryClient.getQueryData(
        pharmacyKeys.prescriptions(),
      );
      const previousStats = queryClient.getQueryData(pharmacyKeys.stats());

      // Optimistically update prescription status to Dispensed
      queryClient.setQueriesData(
        { queryKey: pharmacyKeys.prescriptions() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((p: any) =>
              p.id === dispenseData.prescription_id
                ? {
                    ...p,
                    status: 'Dispensed',
                    dispensed_at: new Date().toISOString(),
                  }
                : p,
            );
          }
          return old;
        },
      );

      // Update stats optimistically
      queryClient.setQueryData(pharmacyKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pending: Math.max(0, (old.pending || 0) - 1),
          dispensed: (old.dispensed || 0) + 1,
        };
      });

      return { previousPrescriptions, previousStats };
    },
    onError: (_err, _data, context) => {
      if (context?.previousPrescriptions) {
        queryClient.setQueriesData(
          { queryKey: pharmacyKeys.prescriptions() },
          context.previousPrescriptions,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(pharmacyKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
    },
  });
}

/**
 * Cancel prescription - OPTIMISTIC UPDATE (status change is safe)
 */
export function useCancelPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prescriptionId: string) => cancelPrescription(prescriptionId),
    onMutate: async (prescriptionId) => {
      await queryClient.cancelQueries({
        queryKey: pharmacyKeys.prescriptions(),
      });
      await queryClient.cancelQueries({ queryKey: pharmacyKeys.stats() });

      const previousPrescriptions = queryClient.getQueryData(
        pharmacyKeys.prescriptions(),
      );
      const previousStats = queryClient.getQueryData(pharmacyKeys.stats());

      // Optimistically mark as cancelled
      queryClient.setQueriesData(
        { queryKey: pharmacyKeys.prescriptions() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((p: any) =>
              p.id === prescriptionId
                ? {
                    ...p,
                    status: 'Cancelled',
                    cancelled_at: new Date().toISOString(),
                  }
                : p,
            );
          }
          return old;
        },
      );

      // Update stats
      queryClient.setQueryData(pharmacyKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pending: Math.max(0, (old.pending || 0) - 1),
          cancelled: (old.cancelled || 0) + 1,
        };
      });

      return { previousPrescriptions, previousStats };
    },
    onError: (_err, _id, context) => {
      if (context?.previousPrescriptions) {
        queryClient.setQueriesData(
          { queryKey: pharmacyKeys.prescriptions() },
          context.previousPrescriptions,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(pharmacyKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
    },
  });
}

/**
 * Delete prescription permanently
 */
export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prescriptionId: string) => deletePrescription(prescriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
    },
  });
}

/**
 * Delete multiple prescriptions
 */
export function useDeletePrescriptionsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prescriptionIds: string[]) =>
      deletePrescriptionsBatch(prescriptionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
    },
  });
}

// =============================================================================
// Drug Mutations - With Optimistic Updates for Inventory
// =============================================================================

/**
 * Update drug - OPTIMISTIC UPDATE
 */
export function useUpdateDrug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDrugDTO) => updateDrug(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: pharmacyKeys.drugs() });

      const previousDrugs = queryClient.getQueryData(pharmacyKeys.drugs());
      const previousDrug = queryClient.getQueryData(
        pharmacyKeys.drug(updateData.drug_id),
      );

      // Optimistically update drug
      queryClient.setQueriesData(
        { queryKey: pharmacyKeys.drugs() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((d: any) =>
              d.id === updateData.drug_id ? { ...d, ...updateData } : d,
            );
          }
          return old;
        },
      );

      if (previousDrug) {
        queryClient.setQueryData(pharmacyKeys.drug(updateData.drug_id), {
          ...previousDrug,
          ...updateData,
        });
      }

      return { previousDrugs, previousDrug, drugId: updateData.drug_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousDrugs) {
        queryClient.setQueriesData(
          { queryKey: pharmacyKeys.drugs() },
          context.previousDrugs,
        );
      }
      if (context?.previousDrug && context?.drugId) {
        queryClient.setQueryData(
          pharmacyKeys.drug(context.drugId),
          context.previousDrug,
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
    },
  });
}

/**
 * Restock drug - OPTIMISTIC UPDATE
 */
export function useRestockDrug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ drugId, quantity }: { drugId: string; quantity: number }) =>
      restockDrug(drugId, quantity),
    onMutate: async ({ drugId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: pharmacyKeys.drugs() });

      const previousDrugs = queryClient.getQueryData(pharmacyKeys.drugs());
      const previousStats = queryClient.getQueryData(pharmacyKeys.stats());

      // Optimistically update stock quantity
      queryClient.setQueriesData(
        { queryKey: pharmacyKeys.drugs() },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((d: any) =>
              d.id === drugId
                ? { ...d, stock_quantity: (d.stock_quantity || 0) + quantity }
                : d,
            );
          }
          return old;
        },
      );

      return { previousDrugs, previousStats };
    },
    onError: (_err, _data, context) => {
      if (context?.previousDrugs) {
        queryClient.setQueriesData(
          { queryKey: pharmacyKeys.drugs() },
          context.previousDrugs,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(pharmacyKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
    },
  });
}

// =============================================================================
// BATCH-BASED INVENTORY QUERIES
// =============================================================================

/**
 * Get all batches for a drug, or ALL batches if drugId is null/undefined
 */
export function useDrugBatches(
  drugId: string | null,
  filters: BatchFilters = {},
) {
  return useQuery({
    queryKey: pharmacyKeys.drugBatches(drugId || '__all__', filters),
    queryFn: () => getDrugBatches(drugId, filters),
    enabled: true, // Always enabled — fetches all batches when drugId is null
  });
}

/**
 * Get a single batch
 */
export function useBatch(batchId: string | null) {
  return useQuery({
    queryKey: pharmacyKeys.batch(batchId || ''),
    queryFn: () => getBatch(batchId!),
    enabled: !!batchId,
  });
}

/**
 * Get dispensable batches in FEFO order
 */
export function useDispensableBatches(drugId: string | null, quantity: number) {
  return useQuery({
    queryKey: pharmacyKeys.dispensableBatches(drugId || '', quantity),
    queryFn: () => getDispensableBatches(drugId!, quantity),
    enabled: !!drugId && quantity > 0,
  });
}

/**
 * Get available stock for a drug (from active batches)
 */
export function useDrugAvailableStock(drugId: string | null) {
  return useQuery({
    queryKey: pharmacyKeys.availableStock(drugId || ''),
    queryFn: () => getDrugAvailableStock(drugId!),
    enabled: !!drugId,
  });
}

/**
 * Get stock movements
 */
export function useStockMovements(filters: {
  drug_id?: string;
  batch_id?: string;
  encounter_id?: string;
  patient_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: pharmacyKeys.stockMovements(filters),
    queryFn: () => getStockMovements(filters),
    enabled: !!(
      filters.drug_id ||
      filters.batch_id ||
      filters.encounter_id ||
      filters.patient_id
    ),
  });
}

/**
 * Get comprehensive pharmacy inventory statistics
 */
export function usePharmacyInventoryStats() {
  return useQuery({
    queryKey: pharmacyKeys.inventoryStats(),
    queryFn: getPharmacyInventoryStats,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get near-expiry drugs
 */
export function useNearExpiryDrugs(daysAhead: number = 90) {
  return useQuery({
    queryKey: pharmacyKeys.nearExpiry(daysAhead),
    queryFn: () => getNearExpiryDrugs(daysAhead),
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

/**
 * Get expired drugs
 */
export function useExpiredDrugs() {
  return useQuery({
    queryKey: pharmacyKeys.expired(),
    queryFn: getExpiredDrugs,
    refetchInterval: 300000,
  });
}

/**
 * Get drug inventory summary with batch aggregation
 */
export function useDrugInventorySummary(filters: DrugFilters = {}) {
  return useQuery({
    queryKey: pharmacyKeys.inventorySummary(filters),
    queryFn: () => getDrugInventorySummary(filters),
  });
}

/**
 * Get pharmacy financial summary (stock valuation, sales, purchases)
 */
export function usePharmacyFinancialSummary() {
  return useQuery({
    queryKey: pharmacyKeys.financials(),
    queryFn: getPharmacyFinancials,
    refetchInterval: 120000, // Refresh every 2 minutes
  });
}

/**
 * Get pharmacy audit trail (stock movements, price changes, batch updates)
 */
export function usePharmacyAuditTrail() {
  return useQuery({
    queryKey: pharmacyKeys.auditTrail(),
    queryFn: () => getPharmacyAuditTrail(300),
    refetchInterval: 60000, // Refresh every minute
  });
}

// =============================================================================
// BATCH MUTATIONS
// =============================================================================

/**
 * Create a new batch (receive stock)
 */
export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBatchDTO) => createBatch(data),
    onSuccess: (newBatch) => {
      // Invalidate all batch and drug queries
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.inventoryStats(),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
    },
  });
}

/**
 * Create multiple batches (multi-drug stock-in)
 */
export function useCreateMultipleBatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBatchDTO[]) => createMultipleBatches(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.inventoryStats(),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
    },
  });
}

/**
 * Update batch
 */
export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBatchDTO) => updateBatch(data),
    onMutate: async (updateData) => {
      await queryClient.cancelQueries({
        queryKey: pharmacyKeys.batch(updateData.batch_id),
      });

      const previousBatch = queryClient.getQueryData(
        pharmacyKeys.batch(updateData.batch_id),
      );

      // Optimistic update
      queryClient.setQueryData(
        pharmacyKeys.batch(updateData.batch_id),
        (old: any) => {
          if (!old) return old;
          return { ...old, ...updateData };
        },
      );

      return { previousBatch, batchId: updateData.batch_id };
    },
    onError: (_err, _data, context) => {
      if (context?.previousBatch && context?.batchId) {
        queryClient.setQueryData(
          pharmacyKeys.batch(context.batchId),
          context.previousBatch,
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
    },
  });
}

/**
 * Dispense medication with batch tracking (FEFO)
 */
export function useDispenseMedicationWithBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchDispenseDTO) => dispenseMedicationWithBatch(data),
    onMutate: async (dispenseData) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({
        queryKey: pharmacyKeys.prescriptions(),
      });
      await queryClient.cancelQueries({ queryKey: pharmacyKeys.batches() });
      await queryClient.cancelQueries({ queryKey: pharmacyKeys.stats() });

      const previousPrescriptions = queryClient.getQueryData(
        pharmacyKeys.prescriptions(),
      );
      const previousStats = queryClient.getQueryData(pharmacyKeys.stats());

      // Optimistically update prescription status
      if (dispenseData.prescription_id) {
        queryClient.setQueriesData(
          { queryKey: pharmacyKeys.prescriptions() },
          (old: any) => {
            if (!old) return old;
            if (Array.isArray(old)) {
              return old.map((p: any) =>
                p.prescription_id === dispenseData.prescription_id
                  ? {
                      ...p,
                      status: 'Dispensed',
                      dispensed_at: new Date().toISOString(),
                    }
                  : p,
              );
            }
            if (old.data && Array.isArray(old.data)) {
              return {
                ...old,
                data: old.data.map((p: any) =>
                  p.prescription_id === dispenseData.prescription_id
                    ? {
                        ...p,
                        status: 'Dispensed',
                        dispensed_at: new Date().toISOString(),
                      }
                    : p,
                ),
              };
            }
            return old;
          },
        );
      }

      // Update stats optimistically
      queryClient.setQueryData(pharmacyKeys.stats(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pending_prescriptions: Math.max(
            0,
            (old.pending_prescriptions || 0) - 1,
          ),
          dispensed_today: (old.dispensed_today || 0) + 1,
        };
      });

      return { previousPrescriptions, previousStats };
    },
    onError: (_err, _data, context) => {
      if (context?.previousPrescriptions) {
        queryClient.setQueriesData(
          { queryKey: pharmacyKeys.prescriptions() },
          context.previousPrescriptions,
        );
      }
      if (context?.previousStats) {
        queryClient.setQueryData(pharmacyKeys.stats(), context.previousStats);
      }
    },
    onSettled: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.inventoryStats(),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.nearExpiry() });
    },
  });
}

/**
 * Adjust batch stock
 */
export function useAdjustBatchStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      newQuantity,
      reason,
      performedBy,
      approvedBy,
    }: {
      batchId: string;
      newQuantity: number;
      reason: string;
      performedBy: string;
      approvedBy?: string;
    }) =>
      adjustBatchStock(batchId, newQuantity, reason, performedBy, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.inventoryStats(),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
    },
  });
}

/**
 * Write off expired batch
 */
export function useWriteOffBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      reason,
      performedBy,
      approvedBy,
    }: {
      batchId: string;
      reason: string;
      performedBy: string;
      approvedBy: string;
    }) => writeOffBatch(batchId, reason, performedBy, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.inventoryStats(),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.expired() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.nearExpiry() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.lowStock() });
    },
  });
}

/**
 * Return dispensed medication
 */
export function useReturnDispensedMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dispenseId,
      quantityReturned,
      reason,
      performedBy,
    }: {
      dispenseId: string;
      quantityReturned: number;
      reason: string;
      performedBy: string;
    }) =>
      returnDispensedMedication(
        dispenseId,
        quantityReturned,
        reason,
        performedBy,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.inventoryStats(),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
    },
  });
}

/**
 * Create stock movement (for manual adjustments)
 */
export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockMovementDTO) => createStockMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pharmacyKeys.stockMovements({}),
      });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.batches() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.drugs() });
    },
  });
}

/**
 * Subscribe to pharmacy changes for real-time updates
 */
export function usePharmacySubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('pharmacy-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Accept a prescription and create billing
 */
export function useAcceptPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AcceptPrescriptionDTO) => acceptPrescription(dto),
    onSuccess: (updatedPrescription) => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
      if (updatedPrescription?.prescription_id) {
        queryClient.invalidateQueries({
          queryKey: pharmacyKeys.prescription(
            updatedPrescription.prescription_id,
          ),
        });
      }
    },
  });
}

/**
 * Reject a prescription
 */
export function useRejectPrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RejectPrescriptionDTO) => rejectPrescription(dto),
    onSuccess: (updatedPrescription) => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
      if (updatedPrescription?.prescription_id) {
        queryClient.invalidateQueries({
          queryKey: pharmacyKeys.prescription(
            updatedPrescription.prescription_id,
          ),
        });
      }
    },
  });
}

/**
 * Batch accept prescriptions - creates billing for all approved prescriptions
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchAcceptPrescriptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BatchAcceptPrescriptionsDTO) =>
      batchAcceptPrescriptions(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: pharmacyKeys.prescriptions(),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: pharmacyKeys.prescriptions(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: pharmacyKeys.prescriptions() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((prescription: any) =>
              dto.prescription_ids.includes(prescription.prescription_id)
                ? { ...prescription, status: 'Accepted' }
                : prescription,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _dto, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
    },
  });
}

/**
 * Batch reject prescriptions - no billing created
 * Uses optimistic updates for instant UI feedback
 */
export function useBatchRejectPrescriptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: BatchRejectPrescriptionsDTO) =>
      batchRejectPrescriptions(dto),
    onMutate: async (dto) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: pharmacyKeys.prescriptions(),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({
        queryKey: pharmacyKeys.prescriptions(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData(
        { queryKey: pharmacyKeys.prescriptions() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((prescription: any) =>
              dto.prescription_ids.includes(prescription.prescription_id)
                ? { ...prescription, status: 'Rejected' }
                : prescription,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (_err, _dto, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.stats() });
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.pending() });
    },
  });
}
