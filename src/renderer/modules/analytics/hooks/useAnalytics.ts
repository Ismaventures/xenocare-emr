import { useQuery } from '@tanstack/react-query';
import { getVisibilityAwareRefetchInterval } from '../../../lib/query/polling';
import {
  getDashboardStats,
  getPatientTrends,
  getRevenueTrends,
  getDepartmentStats,
  getTopDiagnoses,
  getTopLabTests,
  getTopMedications,
  getSummaryStats,
  getRevenueByPaymentMethod,
  getOutstandingNHISClaims,
  getDepartmentWaitTimes,
  getBillingSummary,
} from '../api/analytics.api';

// Financial Analytics
import {
  getDebtAging,
  getGrossNetRevenue,
  getCollectionEfficiency,
  getDiscountAnalysis,
  getRevenueByServiceType,
  getMonthlyRevenueTrends,
  getRevenueByPaymentMethodRange,
  getNHISReconciliation,
  getDailyRevenue,
  type DateFilters,
} from '../api/financial.analytics.api';

// Clinical Analytics
import {
  getALOS,
  getBOR,
  getPatientVolume,
  getDoctorProductivity,
  getMonthlyPatientTrends,
  getQueueDistribution,
  getReadmissionRate,
  getMortalityRate,
} from '../api/clinical.analytics.api';

// Pharmacy Analytics
import {
  getDrugFinancials,
  getExpiryTracking,
  getStockVelocity,
  getTopDrugsByRevenue,
  getLowStockItems,
  getDrugDispensingTrends,
  getStockStatusSummary,
} from '../api/pharmacy.analytics.api';

// Lab Analytics
import {
  getLabRevenue,
  getLabTAT,
  getAbnormalResults,
  getLabTestVolume,
  getLabDailyTrends,
  getLabWorkload,
} from '../api/lab.analytics.api';

// =============================================================================
// P1 Analytics Hooks - Records/Documentation
// =============================================================================

import {
  getDocumentationCompleteness,
  getCodingCoverage,
  getMissingDocumentation,
  getEncounterBillingConsistency,
  getDocumentationByDoctor,
  getUnsignedDocuments,
  getDocumentationTrends,
} from '../api/records.analytics.api';

// =============================================================================
// Query Keys
// =============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  summaryStats: (year: number, month: number) =>
    [...analyticsKeys.all, 'summaryStats', year, month] as const,
  patientTrends: (days: number) =>
    [...analyticsKeys.all, 'patientTrends', days] as const,
  revenueTrends: (days: number) =>
    [...analyticsKeys.all, 'revenueTrends', days] as const,
  departmentStats: () => [...analyticsKeys.all, 'departmentStats'] as const,
  topDiagnoses: (limit: number) =>
    [...analyticsKeys.all, 'topDiagnoses', limit] as const,
  topLabTests: (limit: number) =>
    [...analyticsKeys.all, 'topLabTests', limit] as const,
  topMedications: (limit: number) =>
    [...analyticsKeys.all, 'topMedications', limit] as const,
  revenueByPaymentMethod: (date?: string) =>
    [...analyticsKeys.all, 'revenueByPaymentMethod', date] as const,
  outstandingNHIS: () => [...analyticsKeys.all, 'outstandingNHIS'] as const,
  departmentWaitTimes: () =>
    [...analyticsKeys.all, 'departmentWaitTimes'] as const,
  billingSummary: (start: string, end: string) =>
    [...analyticsKeys.all, 'billingSummary', start, end] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get comprehensive dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: getDashboardStats,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
    staleTime: 30000,
  });
}

/**
 * Get summary stats for a specific month
 */
export function useSummaryStats(year: number, month: number) {
  return useQuery({
    queryKey: analyticsKeys.summaryStats(year, month),
    queryFn: () => getSummaryStats(year, month),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get patient registration trends
 */
export function usePatientTrends(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.patientTrends(days),
    queryFn: () => getPatientTrends(days),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get revenue trends
 */
export function useRevenueTrends(days: number = 30) {
  return useQuery({
    queryKey: analyticsKeys.revenueTrends(days),
    queryFn: () => getRevenueTrends(days),
    staleTime: 300000,
  });
}

/**
 * Get department statistics
 */
export function useDepartmentStats() {
  return useQuery({
    queryKey: analyticsKeys.departmentStats(),
    queryFn: getDepartmentStats,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
  });
}

/**
 * Get top diagnoses
 */
export function useTopDiagnoses(limit: number = 10) {
  return useQuery({
    queryKey: analyticsKeys.topDiagnoses(limit),
    queryFn: () => getTopDiagnoses(limit),
    staleTime: 300000,
  });
}

/**
 * Get top lab tests
 */
export function useTopLabTests(limit: number = 10) {
  return useQuery({
    queryKey: analyticsKeys.topLabTests(limit),
    queryFn: () => getTopLabTests(limit),
    staleTime: 300000,
  });
}

/**
 * Get top medications
 */
export function useTopMedications(limit: number = 10) {
  return useQuery({
    queryKey: analyticsKeys.topMedications(limit),
    queryFn: () => getTopMedications(limit),
    staleTime: 300000,
  });
}

// =============================================================================
// Billing Analytics Hooks (New)
// =============================================================================

/**
 * Get revenue breakdown by payment method
 */
export function useRevenueByPaymentMethod(date?: string) {
  return useQuery({
    queryKey: analyticsKeys.revenueByPaymentMethod(date),
    queryFn: () => getRevenueByPaymentMethod(date),
    staleTime: 60000, // 1 minute
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
  });
}

/**
 * Get outstanding NHIS claims
 */
export function useOutstandingNHISClaims() {
  return useQuery({
    queryKey: analyticsKeys.outstandingNHIS(),
    queryFn: getOutstandingNHISClaims,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Get average wait times per department
 */
export function useDepartmentWaitTimes() {
  return useQuery({
    queryKey: analyticsKeys.departmentWaitTimes(),
    queryFn: getDepartmentWaitTimes,
    staleTime: 60000,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
  });
}

/**
 * Get billing summary for date range
 */
export function useBillingSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: analyticsKeys.billingSummary(startDate, endDate),
    queryFn: () => getBillingSummary(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 300000,
  });
}

// =============================================================================
// Financial Analytics Hooks
// =============================================================================

/**
 * Get debt aging report
 */
export function useDebtAging() {
  return useQuery({
    queryKey: ['analytics', 'debt-aging'],
    queryFn: getDebtAging,
    staleTime: 300000,
  });
}

/**
 * Get gross vs net revenue
 */
export function useGrossNetRevenue(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'gross-net', filters],
    queryFn: () => getGrossNetRevenue(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get collection efficiency
 */
export function useCollectionEfficiency(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'collection-efficiency', filters],
    queryFn: () => getCollectionEfficiency(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get discount analysis
 */
export function useDiscountAnalysis(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'discounts', filters],
    queryFn: () => getDiscountAnalysis(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get revenue by service type
 */
export function useRevenueByServiceType(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'revenue-by-service', filters],
    queryFn: () => getRevenueByServiceType(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get monthly revenue trends
 */
export function useMonthlyRevenueTrends(year: number) {
  return useQuery({
    queryKey: ['analytics', 'monthly-revenue', year],
    queryFn: () => getMonthlyRevenueTrends(year),
    staleTime: 300000,
  });
}

/**
 * Get revenue by payment method for date range
 */
export function useRevenueByPaymentMethodRange(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'revenue-payment-method-range', filters],
    queryFn: () => getRevenueByPaymentMethodRange(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get NHIS reconciliation
 */
export function useNHISReconciliation(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'nhis-reconciliation', filters],
    queryFn: () => getNHISReconciliation(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get daily revenue breakdown
 */
export function useDailyRevenue(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'daily-revenue', filters],
    queryFn: () => getDailyRevenue(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

// =============================================================================
// Clinical Analytics Hooks
// =============================================================================

/**
 * Get Average Length of Stay
 */
export function useALOS(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'alos', filters],
    queryFn: () => getALOS(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get Bed Occupancy Rate
 */
export function useBOR() {
  return useQuery({
    queryKey: ['analytics', 'bor'],
    queryFn: getBOR,
    staleTime: 60000,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
  });
}

/**
 * Get patient volume by type
 */
export function usePatientVolume(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'patient-volume', filters],
    queryFn: () => getPatientVolume(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get doctor productivity
 */
export function useDoctorProductivity(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'doctor-productivity', filters],
    queryFn: () => getDoctorProductivity(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get monthly patient trends
 */
export function useMonthlyPatientTrends(year: number) {
  return useQuery({
    queryKey: ['analytics', 'monthly-patients', year],
    queryFn: () => getMonthlyPatientTrends(year),
    staleTime: 300000,
  });
}

/**
 * Get queue distribution
 */
export function useQueueDistribution() {
  return useQuery({
    queryKey: ['analytics', 'queue-distribution'],
    queryFn: getQueueDistribution,
    staleTime: 30000,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30000),
  });
}

/**
 * Get readmission rate
 */
export function useReadmissionRate(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'readmission', filters],
    queryFn: () => getReadmissionRate(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get mortality rate
 */
export function useMortalityRate(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'mortality', filters],
    queryFn: () => getMortalityRate(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

// =============================================================================
// Pharmacy Analytics Hooks
// =============================================================================

/**
 * Get drug financials
 */
export function useDrugFinancials(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'drug-financials', filters],
    queryFn: () => getDrugFinancials(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get expiry tracking
 */
export function useExpiryTracking() {
  return useQuery({
    queryKey: ['analytics', 'expiry-tracking'],
    queryFn: getExpiryTracking,
    staleTime: 300000,
  });
}

/**
 * Get stock velocity
 */
export function useStockVelocity() {
  return useQuery({
    queryKey: ['analytics', 'stock-velocity'],
    queryFn: getStockVelocity,
    staleTime: 300000,
  });
}

/**
 * Get top drugs by revenue
 */
export function useTopDrugsByRevenue(filters: DateFilters, limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-drugs-revenue', filters, limit],
    queryFn: () => getTopDrugsByRevenue(filters, limit),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get low stock items
 */
export function useLowStockItems(threshold: number = 50) {
  return useQuery({
    queryKey: ['analytics', 'low-stock', threshold],
    queryFn: () => getLowStockItems(threshold),
    staleTime: 60000,
  });
}

/**
 * Get drug dispensing trends
 */
export function useDrugDispensingTrends(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'drug-dispensing-trends', days],
    queryFn: () => getDrugDispensingTrends(days),
    staleTime: 300000,
  });
}

/**
 * Get stock status summary
 */
export function useStockStatusSummary() {
  return useQuery({
    queryKey: ['analytics', 'stock-status'],
    queryFn: getStockStatusSummary,
    staleTime: 60000,
    refetchInterval: () => getVisibilityAwareRefetchInterval(60000),
  });
}

// =============================================================================
// Laboratory Analytics Hooks
// =============================================================================

/**
 * Get lab revenue
 */
export function useLabRevenue(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'lab-revenue', filters],
    queryFn: () => getLabRevenue(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get lab TAT
 */
export function useLabTAT(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'lab-tat', filters],
    queryFn: () => getLabTAT(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get abnormal results
 */
export function useAbnormalResults(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'abnormal-results', filters],
    queryFn: () => getAbnormalResults(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get lab test volume
 */
export function useLabTestVolume(filters: DateFilters, limit: number = 15) {
  return useQuery({
    queryKey: ['analytics', 'lab-test-volume', filters, limit],
    queryFn: () => getLabTestVolume(filters, limit),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get lab daily trends
 */
export function useLabDailyTrends(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'lab-daily-trends', days],
    queryFn: () => getLabDailyTrends(days),
    staleTime: 300000,
  });
}

/**
 * Get lab workload
 */
export function useLabWorkload() {
  return useQuery({
    queryKey: ['analytics', 'lab-workload'],
    queryFn: getLabWorkload,
    staleTime: 30000,
    refetchInterval: () => getVisibilityAwareRefetchInterval(30000),
  });
}

/**
 * Get documentation completeness score
 */
export function useDocumentationCompleteness(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'documentation-completeness', filters],
    queryFn: () => getDocumentationCompleteness(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get ICD coding coverage
 */
export function useCodingCoverage(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'coding-coverage', filters],
    queryFn: () => getCodingCoverage(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get encounters with missing documentation
 */
export function useMissingDocumentation(
  filters: DateFilters,
  limit: number = 50,
) {
  return useQuery({
    queryKey: ['analytics', 'missing-documentation', filters, limit],
    queryFn: () => getMissingDocumentation(filters, limit),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get encounter to billing consistency
 */
export function useEncounterBillingConsistency(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'billing-consistency', filters],
    queryFn: () => getEncounterBillingConsistency(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get documentation completeness by doctor
 */
export function useDocumentationByDoctor(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'documentation-by-doctor', filters],
    queryFn: () => getDocumentationByDoctor(filters),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get unsigned/incomplete documents
 */
export function useUnsignedDocuments(filters: DateFilters, limit: number = 50) {
  return useQuery({
    queryKey: ['analytics', 'unsigned-documents', filters, limit],
    queryFn: () => getUnsignedDocuments(filters, limit),
    enabled: !!filters.startDate && !!filters.endDate,
    staleTime: 300000,
  });
}

/**
 * Get documentation trends over time
 */
export function useDocumentationTrends(year: number) {
  return useQuery({
    queryKey: ['analytics', 'documentation-trends', year],
    queryFn: () => getDocumentationTrends(year),
    staleTime: 600000,
  });
}
