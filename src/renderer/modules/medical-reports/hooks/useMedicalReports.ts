import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  medicalReportsApi,
  MedicalReportFilters,
} from '../api/medical-reports.api';
import {
  CreateMedicalReportDTO,
  UpdateMedicalReportDTO,
} from '../dtos/medical-reports.dto';
import { useAuth } from '../../../contexts/AuthContext';

function resolveStaffUuidOrThrow(staff: { id?: string | null } | null): string {
  const uuid = staff?.id;
  if (!uuid) {
    throw new Error(
      'Staff UUID is missing. Please refresh session and try again.',
    );
  }
  return uuid;
}

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
    backgroundScope = 'medical-reports:write',
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
// Medical Reports Hooks
// =============================================================================

// Query keys
export const medicalReportKeys = {
  all: ['medical-reports'] as const,
  lists: () => [...medicalReportKeys.all, 'list'] as const,
  list: (filters: MedicalReportFilters) =>
    [...medicalReportKeys.lists(), filters] as const,
  details: () => [...medicalReportKeys.all, 'detail'] as const,
  detail: (id: string) => [...medicalReportKeys.details(), id] as const,
  stats: () => [...medicalReportKeys.all, 'stats'] as const,
  templates: () => [...medicalReportKeys.all, 'templates'] as const,
};

// Get medical reports with filters
export function useMedicalReports(filters: MedicalReportFilters = {}) {
  return useQuery({
    queryKey: medicalReportKeys.list(filters),
    queryFn: () => medicalReportsApi.getReports(filters),
  });
}

// Get single report
export function useMedicalReport(reportId: string) {
  const normalizedReportId =
    reportId && reportId !== 'undefined' && reportId !== 'null' ? reportId : '';

  return useQuery({
    queryKey: medicalReportKeys.detail(normalizedReportId),
    queryFn: () => medicalReportsApi.getReportById(normalizedReportId),
    enabled: !!normalizedReportId,
  });
}

// Get report statistics
export function useMedicalReportStats() {
  return useQuery({
    queryKey: medicalReportKeys.stats(),
    queryFn: () => medicalReportsApi.getStats(),
  });
}

// Get report templates
export function useReportTemplates() {
  return useQuery({
    queryKey: medicalReportKeys.templates(),
    queryFn: () => medicalReportsApi.getTemplates(),
  });
}

// Create report mutation
export function useCreateMedicalReport() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (data: CreateMedicalReportDTO) =>
      medicalReportsApi.createReport(data, resolveStaffUuidOrThrow(staff)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.stats() });
    },
  });
}

// Update report mutation
export function useUpdateMedicalReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      data,
    }: {
      reportId: string;
      data: UpdateMedicalReportDTO;
    }) => medicalReportsApi.updateReport(reportId, data),
    onSuccess: (_, { reportId }) => {
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: medicalReportKeys.detail(reportId),
      });
    },
  });
}

// Submit for approval mutation
export function useSubmitForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) =>
      medicalReportsApi.submitForApproval(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.stats() });
    },
  });
}

// Approve report mutation
export function useApproveReport() {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: (reportId: string) =>
      medicalReportsApi.approveReport(reportId, resolveStaffUuidOrThrow(staff)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.stats() });
    },
  });
}

// Issue report mutation
export function useIssueReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => medicalReportsApi.issueReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.stats() });
    },
  });
}

// Revoke report mutation
export function useRevokeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => medicalReportsApi.revokeReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: medicalReportKeys.stats() });
    },
  });
}
