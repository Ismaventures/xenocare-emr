// =============================================================================
// Service Pricing Hooks
// React Query hooks for managing service prices
// =============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getAllServicePrices,
  getConsultationFees,
  updateServicePrice,
  updateConsultationFee,
  getServicePriceStats,
  getPriceAuditHistory,
  getNhisConfig,
  updateNhisConfig,
  createLabTest,
  createRadiologyExam,
  getLabTestCategories,
  getSpecimenTypes,
  getImagingModalities,
  // New imports
  getProcedurePrices,
  updateProcedurePrice,
  getBedPrices,
  getWardPrices,
  updateWardPrice,
  updateBedPrice,
  getNhisRequiredServices,
  searchAllServices,
  toggleNhisRequired,
  getInsuranceTypePricing,
  updateInsuranceTypePricing,
  getProcedureCategories,
  getWardTypes,
  getBedTypes,
  bulkEnableNhisPreauthorization,
  getServicesMissingNhisPreauth,
  selectiveEnableNhisPreauthorization,
  getNhisServices,
  bulkUpdateNhisPercentage,
  updateServiceNhisConfig,
  NhisServiceCategory,
  NhisServiceItem,
  ServiceCategory,
  ServicePriceFilters,
  UpdateServicePriceDTO,
  UpdateConsultationFeeDTO,
  CreateLabTestDTO,
  CreateRadiologyExamDTO,
  ProcedureCategory,
  WardType,
  BedType,
  BulkEnableNhisResult,
  ServicesMissingNhisCount,
  SelectiveEnableNhisRequest,
  SelectiveEnableNhisResult,
} from '../api/service-pricing.api';

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
    backgroundScope = 'billing:service-pricing:write',
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

export const servicePricingKeys = {
  all: ['service-pricing'] as const,
  services: (filters?: ServicePriceFilters) =>
    [...servicePricingKeys.all, 'services', filters] as const,
  consultations: () => [...servicePricingKeys.all, 'consultations'] as const,
  procedures: (filters?: any) =>
    [...servicePricingKeys.all, 'procedures', filters] as const,
  beds: (filters?: any) =>
    [...servicePricingKeys.all, 'beds', filters] as const,
  wards: () => [...servicePricingKeys.all, 'wards'] as const,
  nhisRequired: () => [...servicePricingKeys.all, 'nhis-required'] as const,
  insurancePricing: () =>
    [...servicePricingKeys.all, 'insurance-pricing'] as const,
  stats: () => [...servicePricingKeys.all, 'stats'] as const,
  audit: (filters?: any) =>
    [...servicePricingKeys.all, 'audit', filters] as const,
  nhisConfig: () => [...servicePricingKeys.all, 'nhis-config'] as const,
};

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all service prices (lab, radiology, pharmacy)
 */
export function useServicePrices(filters: ServicePriceFilters = {}) {
  return useQuery({
    queryKey: servicePricingKeys.services(filters),
    queryFn: () => getAllServicePrices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get consultation fees by clinic
 */
export function useConsultationFees() {
  return useQuery({
    queryKey: servicePricingKeys.consultations(),
    queryFn: getConsultationFees,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get service pricing stats
 */
export function useServicePriceStats() {
  return useQuery({
    queryKey: servicePricingKeys.stats(),
    queryFn: getServicePriceStats,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get price audit history
 */
export function usePriceAuditHistory(
  filters: {
    service_type?: ServiceCategory | string;
    service_id?: string;
    limit?: number;
  } = {},
) {
  return useQuery({
    queryKey: servicePricingKeys.audit(filters),
    queryFn: () => getPriceAuditHistory(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get NHIS configuration
 */
export function useNhisConfig() {
  return useQuery({
    queryKey: servicePricingKeys.nhisConfig(),
    queryFn: getNhisConfig,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update service price with optimistic update
 */
export function useUpdateServicePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      category,
      serviceId,
      updates,
    }: {
      category: ServiceCategory;
      serviceId: string;
      updates: UpdateServicePriceDTO;
    }) => updateServicePrice(category, serviceId, updates),

    // Optimistic update
    onMutate: async ({ category, serviceId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: servicePricingKeys.all });

      // Snapshot current data
      const previousServices = queryClient.getQueryData(
        servicePricingKeys.services({}),
      );

      // Optimistically update
      queryClient.setQueryData(servicePricingKeys.services({}), (old: any) => {
        if (!old) return old;
        return old.map((service: any) =>
          service.id === serviceId
            ? {
                ...service,
                price: updates.price ?? service.price,
                nhis_price: updates.nhis_price ?? service.nhis_price,
                nhis_code: updates.nhis_code ?? service.nhis_code,
                is_nhis_covered:
                  updates.is_nhis_covered ?? service.is_nhis_covered,
                nhis_percentage:
                  updates.nhis_percentage ?? service.nhis_percentage,
                is_active: updates.is_active ?? service.is_active,
              }
            : service,
        );
      });

      return { previousServices };
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(
          servicePricingKeys.services({}),
          context.previousServices,
        );
      }
    },

    // Refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.all });
    },
  });
}

/**
 * Update consultation fee with optimistic update
 */
export function useUpdateConsultationFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clinicId,
      updates,
    }: {
      clinicId: string;
      updates: UpdateConsultationFeeDTO;
    }) => updateConsultationFee(clinicId, updates),

    // Optimistic update
    onMutate: async ({ clinicId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: servicePricingKeys.consultations(),
      });

      const previousFees = queryClient.getQueryData(
        servicePricingKeys.consultations(),
      );

      queryClient.setQueryData(
        servicePricingKeys.consultations(),
        (old: any) => {
          if (!old) return old;
          return old.map((clinic: any) =>
            clinic.id === clinicId
              ? {
                  ...clinic,
                  consultation_fee:
                    updates.consultation_fee ?? clinic.consultation_fee,
                  follow_up_fee: updates.follow_up_fee ?? clinic.follow_up_fee,
                  emergency_fee: updates.emergency_fee ?? clinic.emergency_fee,
                  nhis_consultation_fee:
                    updates.nhis_consultation_fee ??
                    clinic.nhis_consultation_fee,
                  nhis_follow_up_fee:
                    updates.nhis_follow_up_fee ?? clinic.nhis_follow_up_fee,
                  nhis_emergency_fee:
                    updates.nhis_emergency_fee ?? clinic.nhis_emergency_fee,
                }
              : clinic,
          );
        },
      );

      return { previousFees };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousFees) {
        queryClient.setQueryData(
          servicePricingKeys.consultations(),
          context.previousFees,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.all });
    },
  });
}

/**
 * Update NHIS config
 */
export function useUpdateNhisConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        coverage_percentage?: number;
        consultation_fully_covered?: boolean;
        description?: string;
      };
    }) => updateNhisConfig(id, updates),

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({
        queryKey: servicePricingKeys.nhisConfig(),
      });

      const previousConfig = queryClient.getQueryData(
        servicePricingKeys.nhisConfig(),
      );

      queryClient.setQueryData(servicePricingKeys.nhisConfig(), (old: any) => {
        if (!old) return old;
        return old.map((config: any) =>
          config.id === id ? { ...config, ...updates } : config,
        );
      });

      return { previousConfig };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(
          servicePricingKeys.nhisConfig(),
          context.previousConfig,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.nhisConfig(),
      });
    },
  });
}

/**
 * Create new lab test
 */
export function useCreateLabTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateLabTestDTO) => createLabTest(dto),

    onSuccess: () => {
      // Invalidate and refetch services
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.all });
    },
  });
}

/**
 * Create new radiology exam
 */
export function useCreateRadiologyExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRadiologyExamDTO) => createRadiologyExam(dto),

    onSuccess: () => {
      // Invalidate and refetch services
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.all });
    },
  });
}

/**
 * Get lab test categories
 */
export function useLabTestCategories() {
  return useQuery({
    queryKey: [...servicePricingKeys.all, 'lab-categories'] as const,
    queryFn: getLabTestCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes - categories don't change often
  });
}

/**
 * Get specimen types
 */
export function useSpecimenTypes() {
  return useQuery({
    queryKey: [...servicePricingKeys.all, 'specimen-types'] as const,
    queryFn: getSpecimenTypes,
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get imaging modalities - static list, no API call needed
 */
export function useImagingModalities() {
  return {
    data: getImagingModalities(),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Procedure Pricing Hooks
// =============================================================================

/**
 * Get procedure prices with category filtering
 */
export function useProcedurePrices(
  filters: {
    category?: ProcedureCategory;
    search?: string;
    is_active?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: servicePricingKeys.procedures(filters),
    queryFn: () => getProcedurePrices(filters),
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });
}

/**
 * Update procedure price
 */
export function useUpdateProcedurePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      procedureId,
      updates,
    }: {
      procedureId: string;
      updates: {
        base_price?: number;
        nhis_price?: number;
        professional_fee?: number;
        facility_fee?: number;
        requires_nhis_authorization?: boolean;
        is_active?: boolean;
        updated_by?: string;
        reason?: string;
      };
    }) => updateProcedurePrice(procedureId, updates),

    // Optimistic update for procedure list
    onMutate: async ({ procedureId, updates }) => {
      await queryClient.cancelQueries({
        queryKey: servicePricingKeys.procedures(),
      });

      const previousProcedures = queryClient.getQueryData(
        servicePricingKeys.procedures(),
      );

      // Optimistically update the procedure in cache
      queryClient.setQueryData(
        servicePricingKeys.procedures(),
        (old: any[] | undefined) => {
          if (!old) return old;
          return old.map((p) =>
            p.id === procedureId ? { ...p, ...updates } : p,
          );
        },
      );

      return { previousProcedures };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousProcedures) {
        queryClient.setQueryData(
          servicePricingKeys.procedures(),
          context.previousProcedures,
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.procedures(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.nhisRequired(),
      });
    },
  });
}

/**
 * Get procedure categories - static list
 */
export function useProcedureCategories() {
  return {
    data: getProcedureCategories(),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Bed/Ward Pricing Hooks
// =============================================================================

/**
 * Get bed prices
 */
export function useBedPrices(
  filters: {
    ward_type?: WardType;
    bed_type?: BedType;
    search?: string;
  } = {},
) {
  return useQuery({
    queryKey: servicePricingKeys.beds(filters),
    queryFn: () => getBedPrices(filters),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get ward prices
 */
export function useWardPrices() {
  return useQuery({
    queryKey: servicePricingKeys.wards(),
    queryFn: getWardPrices,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update ward price
 */
export function useUpdateWardPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      wardId,
      updates,
    }: {
      wardId: string;
      updates: {
        price?: number;
        nhis_price?: number;
        is_nhis_covered?: boolean;
        updated_by?: string;
        reason?: string;
      };
    }) => updateWardPrice(wardId, updates),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.wards() });
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.beds() });
    },
  });
}

/**
 * Update bed daily rate
 */
export function useUpdateBedPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bedId,
      updates,
    }: {
      bedId: string;
      updates: {
        daily_rate?: number;
        updated_by?: string;
        reason?: string;
      };
    }) => updateBedPrice(bedId, updates),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: servicePricingKeys.beds() });
    },
  });
}

/**
 * Get ward types - static list
 */
export function useWardTypes() {
  return {
    data: getWardTypes(),
    isLoading: false,
    error: null,
  };
}

/**
 * Get bed types - static list
 */
export function useBedTypes() {
  return {
    data: getBedTypes(),
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// NHIS Required Services Hooks
// =============================================================================

/**
 * Get services that require NHIS pre-authorization
 */
export function useNhisRequiredServices() {
  return useQuery({
    queryKey: servicePricingKeys.nhisRequired(),
    queryFn: getNhisRequiredServices,
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });
}

/**
 * Search all services (for NHIS required selector)
 */
export function useSearchAllServices(search: string) {
  return useQuery({
    queryKey: [...servicePricingKeys.all, 'search', search],
    queryFn: () => searchAllServices(search),
    enabled: search.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Toggle NHIS required status for a service
 */
export function useToggleNhisRequired() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      category,
      required,
      updatedBy,
    }: {
      serviceId: string;
      category: ServiceCategory;
      required: boolean;
      updatedBy?: string;
    }) => toggleNhisRequired(serviceId, category, required, updatedBy),

    // Optimistic update for instant UI feedback
    onMutate: async ({ serviceId, category, required }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: servicePricingKeys.nhisRequired(),
      });

      // Snapshot previous value
      const previousServices = queryClient.getQueryData(
        servicePricingKeys.nhisRequired(),
      );

      // Optimistically update the cache
      if (required) {
        // Adding - will be properly populated on refetch
      } else {
        // Removing - filter out from cache immediately
        queryClient.setQueryData(
          servicePricingKeys.nhisRequired(),
          (old: any[] | undefined) =>
            old ? old.filter((s) => s.service_id !== serviceId) : [],
        );
      }

      return { previousServices };
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(
          servicePricingKeys.nhisRequired(),
          context.previousServices,
        );
      }
    },

    // Always refetch after success or error to ensure consistency
    onSuccess: () => {
      // Immediately invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.nhisRequired(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.services(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.procedures(),
      });
    },
  });
}

// =============================================================================
// Insurance Type Pricing Hooks
// =============================================================================

/**
 * Get insurance type pricing configuration
 */
export function useInsuranceTypePricing() {
  return useQuery({
    queryKey: servicePricingKeys.insurancePricing(),
    queryFn: getInsuranceTypePricing,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update insurance type pricing
 */
export function useUpdateInsuranceTypePricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        coverage_percentage?: number;
        consultation_fully_covered?: boolean;
        lab_coverage_percentage?: number;
        radiology_coverage_percentage?: number;
        pharmacy_coverage_percentage?: number;
        procedure_coverage_percentage?: number;
        bed_coverage_percentage?: number;
        description?: string;
        updated_by?: string;
      };
    }) => updateInsuranceTypePricing(id, updates),

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.insurancePricing(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.nhisConfig(),
      });
    },
  });
}

// =============================================================================
// Bulk NHIS Pre-Authorization Hooks
// =============================================================================

/**
 * Get count of services missing NHIS pre-authorization
 */
export function useServicesMissingNhisPreauth() {
  return useQuery({
    queryKey: [...servicePricingKeys.all, 'missing-nhis-preauth'],
    queryFn: getServicesMissingNhisPreauth,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Bulk enable NHIS pre-authorization for all services
 */
export function useBulkEnableNhisPreauth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedBy?: string) =>
      bulkEnableNhisPreauthorization(updatedBy),

    onSuccess: (result: BulkEnableNhisResult) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.nhisRequired(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.services(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.procedures(),
      });
      queryClient.invalidateQueries({
        queryKey: [...servicePricingKeys.all, 'missing-nhis-preauth'],
      });
    },
  });
}

/**
 * Selective enable NHIS pre-authorization for selected services
 */
export function useSelectiveEnableNhisPreauth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SelectiveEnableNhisRequest) =>
      selectiveEnableNhisPreauthorization(request),

    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.nhisRequired(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.services(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.procedures(),
      });
      queryClient.invalidateQueries({
        queryKey: [...servicePricingKeys.all, 'missing-nhis-preauth'],
      });
      queryClient.invalidateQueries({
        queryKey: [...servicePricingKeys.all, 'search'],
      });
    },
  });
}

// =============================================================================
// NHIS Coverage Management Hooks
// =============================================================================

/**
 * Get all NHIS-configurable services for coverage management
 */
export function useNhisServices(filters?: {
  category?: NhisServiceCategory;
  search?: string;
  nhisOnly?: boolean;
}) {
  return useQuery({
    queryKey: [...servicePricingKeys.all, 'nhis-services', filters],
    queryFn: () => getNhisServices(filters),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Bulk update NHIS percentage for selected services
 */
export function useBulkUpdateNhisPercentage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      items,
      nhisPercentage,
      isNhisCovered,
    }: {
      items: Array<{ id: string; category: NhisServiceCategory }>;
      nhisPercentage: number;
      isNhisCovered?: boolean;
    }) => bulkUpdateNhisPercentage(items, nhisPercentage, isNhisCovered),

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...servicePricingKeys.all, 'nhis-services'],
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.services(),
      });
    },
  });
}

/**
 * Update NHIS config for a single service
 */
export function useUpdateServiceNhisConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      category,
      updates,
    }: {
      id: string;
      category: NhisServiceCategory;
      updates: { nhis_price?: number; nhis_percentage?: number; is_nhis_covered?: boolean };
    }) => updateServiceNhisConfig(id, category, updates),

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...servicePricingKeys.all, 'nhis-services'],
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.services(),
      });
      queryClient.invalidateQueries({
        queryKey: servicePricingKeys.consultations(),
      });
    },
  });
}
