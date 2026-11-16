/**
 * Dynamic Specialty Dashboard - React Query Hooks
 *
 * Hooks for fetching and mutating specialty dashboard data.
 * All access control is enforced server-side via SECURITY DEFINER functions.
 *
 * @module useSpecialtyDashboard
 * @version 2.2
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBackgroundMutation,
  type UseBackgroundMutationOptions,
} from '../../../hooks/useBackgroundMutation';
import {
  getSpecialtyDepartments,
  getSpecialtyByCode,
  getSpecialtyDashboard,
  getCurrentUserSpecialty,
  acceptSpecialtyReferral,
  rejectSpecialtyReferral,
  startSpecialtySession,
  completeSpecialtySession,
  resumeSpecialtySession,
  abandonSpecialtySession,
  ResumeSessionResponse,
  AbandonSessionResponse,
} from '../api/specialty-dashboard.api';
import type {
  SpecialtyDepartment,
  SpecialtyDashboardData,
  AcceptReferralResponse,
  RejectReferralResponse,
  StartSessionResponse,
  CompleteSessionResponse,
} from '../types/specialty-dashboard.types';

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
    backgroundScope = 'specialty-dashboard:write',
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
// QUERY KEYS
// =============================================================================

export const specialtyDashboardKeys = {
  all: ['specialty-dashboard'] as const,

  // Departments
  departments: () => [...specialtyDashboardKeys.all, 'departments'] as const,
  departmentByCode: (code: string) =>
    [...specialtyDashboardKeys.departments(), code] as const,

  // Dashboard data (aggregated)
  dashboard: (specialtyCode: string) =>
    [...specialtyDashboardKeys.all, 'dashboard', specialtyCode] as const,

  // User specialty
  userSpecialty: () =>
    [...specialtyDashboardKeys.all, 'user-specialty'] as const,
};

// =============================================================================
// SPECIALTY DEPARTMENTS HOOKS
// =============================================================================

/**
 * Fetch all active specialty departments.
 * Used for navigation menus and referral dropdowns.
 *
 * Cache: 5 minutes (specialties rarely change)
 */
export function useSpecialtyDepartments() {
  return useQuery<SpecialtyDepartment[], Error>({
    queryKey: specialtyDashboardKeys.departments(),
    queryFn: getSpecialtyDepartments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single specialty department by code.
 */
export function useSpecialtyDepartment(
  specialtyCode: string | null | undefined,
) {
  return useQuery<SpecialtyDepartment | null, Error>({
    queryKey: specialtyDashboardKeys.departmentByCode(specialtyCode || ''),
    queryFn: () => getSpecialtyByCode(specialtyCode!),
    enabled: !!specialtyCode,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// USER SPECIALTY HOOK
// =============================================================================

/**
 * Get the current user's specialty assignment.
 * Returns specialty_code (null for admins who can access all).
 *
 * Cache: Infinite (doesn't change during session)
 */
export function useCurrentUserSpecialty() {
  return useQuery({
    queryKey: specialtyDashboardKeys.userSpecialty(),
    queryFn: getCurrentUserSpecialty,
    staleTime: Infinity, // Doesn't change during session
    retry: 3, // Retry on network failures before showing error
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

/**
 * Hook to determine if the current user is an admin who can access all specialties.
 */
export function useIsAdminUser() {
  const { data, isLoading } = useCurrentUserSpecialty();

  const adminRoles = ['super_admin', 'admin', 'medical_director'];
  const isAdmin = data?.role && adminRoles.includes(data.role);

  return { isAdmin: !!isAdmin, isLoading };
}

// =============================================================================
// DASHBOARD DATA HOOK (SINGLE AGGREGATED CALL)
// =============================================================================

/**
 * Fetch aggregated specialty dashboard data in ONE call.
 * Returns config, stats, queue, and referrals.
 *
 * Auto-refresh: Every 60 seconds
 * Stale time: 30 seconds
 *
 * @param specialtyCode - Specialty code (e.g., 'CARDIOLOGY')
 */
export function useSpecialtyDashboard(
  specialtyCode: string | null | undefined,
) {
  return useQuery<SpecialtyDashboardData, Error>({
    queryKey: specialtyDashboardKeys.dashboard(specialtyCode || ''),
    queryFn: () => getSpecialtyDashboard(specialtyCode!),
    enabled: !!specialtyCode,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// =============================================================================
// REFERRAL MUTATION HOOKS
// =============================================================================

/**
 * Accept a specialty referral.
 * Invalidates dashboard data on success.
 */
export function useAcceptReferral(specialtyCode: string) {
  const queryClient = useQueryClient();

  return useMutation<
    AcceptReferralResponse,
    Error,
    { requestId: string; notes?: string }
  >({
    mutationFn: ({ requestId, notes }) =>
      acceptSpecialtyReferral({ p_request_id: requestId, p_notes: notes }),
    onSuccess: () => {
      // Invalidate dashboard to refresh referral list
      queryClient.invalidateQueries({
        queryKey: specialtyDashboardKeys.dashboard(specialtyCode),
      });
    },
  });
}

/**
 * Reject a specialty referral.
 * Invalidates dashboard data on success.
 */
export function useRejectReferral(specialtyCode: string) {
  const queryClient = useQueryClient();

  return useMutation<
    RejectReferralResponse,
    Error,
    { requestId: string; reason: string }
  >({
    mutationFn: ({ requestId, reason }) =>
      rejectSpecialtyReferral({ p_request_id: requestId, p_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: specialtyDashboardKeys.dashboard(specialtyCode),
      });
    },
  });
}

// =============================================================================
// SESSION MUTATION HOOKS
// =============================================================================

/**
 * Start a specialty session (queue entry → In Progress).
 * Invalidates dashboard data on success.
 */
export function useStartSession(specialtyCode: string) {
  const queryClient = useQueryClient();

  return useMutation<StartSessionResponse, Error, { queueId: string }>({
    mutationFn: ({ queueId }) => startSpecialtySession({ p_queue_id: queueId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: specialtyDashboardKeys.dashboard(specialtyCode),
      });
    },
  });
}

/**
 * Complete a specialty session.
 * Invalidates dashboard data on success.
 */
export function useCompleteSession(specialtyCode: string) {
  const queryClient = useQueryClient();

  return useMutation<
    CompleteSessionResponse,
    Error,
    { queueId: string; notes?: string }
  >({
    mutationFn: ({ queueId, notes }) =>
      completeSpecialtySession({ p_queue_id: queueId, p_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: specialtyDashboardKeys.dashboard(specialtyCode),
      });
    },
  });
}

/**
 * Resume an in-progress session.
 * Returns patient and session data for re-opening the wizard.
 */
export function useResumeSession(specialtyCode: string) {
  const queryClient = useQueryClient();

  return useMutation<ResumeSessionResponse, Error, { queueId: string }>({
    mutationFn: ({ queueId }) => resumeSpecialtySession(queueId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: specialtyDashboardKeys.dashboard(specialtyCode),
      });
    },
  });
}

/**
 * Abandon an in-progress session.
 * Returns patient to waiting queue.
 */
export function useAbandonSession(specialtyCode: string) {
  const queryClient = useQueryClient();

  return useMutation<AbandonSessionResponse, Error, { queueId: string }>({
    mutationFn: ({ queueId }) => abandonSpecialtySession(queueId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: specialtyDashboardKeys.dashboard(specialtyCode),
      });
    },
  });
}

// =============================================================================
// COMBINED DASHBOARD HOOK (for SpecialtyClinicPage)
// =============================================================================

/**
 * Combined hook for the specialty clinic page.
 * Auto-detects user specialty if not provided.
 *
 * Usage:
 * ```tsx
 * const { dashboard, isLoading, error, actions } = useSpecialtyClinic('CARDIOLOGY');
 * // or auto-detect:
 * const { dashboard, isLoading, error, actions } = useSpecialtyClinic();
 * ```
 */
export function useSpecialtyClinic(providedSpecialtyCode?: string) {
  const { data: userSpecialty, isLoading: isLoadingUser } =
    useCurrentUserSpecialty();

  // Use provided specialty code, or fall back to user's specialty
  const activeSpecialtyCode =
    providedSpecialtyCode || userSpecialty?.specialty_code || null;

  const dashboard = useSpecialtyDashboard(activeSpecialtyCode);

  // Create mutation hooks with the active specialty code
  const acceptReferral = useAcceptReferral(activeSpecialtyCode || '');
  const rejectReferral = useRejectReferral(activeSpecialtyCode || '');
  const startSession = useStartSession(activeSpecialtyCode || '');
  const completeSession = useCompleteSession(activeSpecialtyCode || '');
  const resumeSession = useResumeSession(activeSpecialtyCode || '');
  const abandonSession = useAbandonSession(activeSpecialtyCode || '');

  return {
    // Resolved specialty code
    specialtyCode: activeSpecialtyCode,

    // Dashboard data
    dashboard: dashboard.data,
    isLoading: isLoadingUser || dashboard.isLoading,
    isError: dashboard.isError,
    error: dashboard.error,
    refetch: dashboard.refetch,

    // User info
    userSpecialty: userSpecialty?.specialty_code,
    userRole: userSpecialty?.role,

    // Actions
    actions: {
      acceptReferral,
      rejectReferral,
      startSession,
      completeSession,
      resumeSession,
      abandonSession,
    },
  };
}
