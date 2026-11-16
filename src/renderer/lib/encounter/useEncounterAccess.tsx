/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER ACCESS CONTROL HOOK
 * =============================================================================
 *
 * React hook for implementing encounter-based access control in UI components.
 * Enforces the single-owner principle and provides role-based permissions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  EncounterRole,
  EncounterAction,
  EncounterCareTeamMember,
  EncounterTransfer,
  PermissionCheckResult,
  getEncounterRole,
  canPerformAction,
  addToCareTeam,
  removeFromCareTeam,
  getEncounterCareTeam,
  transferEncounterOwnership,
  grantOnCallAccess,
  getEncounterAccessLogs,
  ROLE_PERMISSIONS,
} from './access-control';
import type { UserRole } from '../permissions';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const encounterAccessKeys = {
  all: ['encounter-access'] as const,
  role: (encounterId: string, userId: string) =>
    [...encounterAccessKeys.all, 'role', encounterId, userId] as const,
  careTeam: (encounterId: string) =>
    [...encounterAccessKeys.all, 'care-team', encounterId] as const,
  accessLogs: (encounterId: string) =>
    [...encounterAccessKeys.all, 'logs', encounterId] as const,
  permissions: (encounterId: string, userId: string, action: EncounterAction) =>
    [
      ...encounterAccessKeys.all,
      'permission',
      encounterId,
      userId,
      action,
    ] as const,
};

// =============================================================================
// MAIN HOOK
// =============================================================================

interface UseEncounterAccessOptions {
  encounterId: string;
  enabled?: boolean;
}

interface UseEncounterAccessReturn {
  // Role & Permissions
  encounterRole: EncounterRole | undefined;
  isLoading: boolean;
  isPrimaryDoctor: boolean;
  canEdit: boolean;
  canView: boolean;
  canClose: boolean;
  canTransfer: boolean;
  canAddToCareTeam: boolean;

  // Permission check function
  checkPermission: (action: EncounterAction) => Promise<PermissionCheckResult>;
  getAllowedActions: () => EncounterAction[];

  // Care Team
  careTeam: EncounterCareTeamMember[];
  careTeamLoading: boolean;
  addMemberToCareTeam: (
    staffId: string,
    role: EncounterRole,
    expiresAt?: string,
    notes?: string,
  ) => Promise<EncounterCareTeamMember>;
  removeMemberFromCareTeam: (staffId: string) => Promise<void>;

  // Ownership Transfer
  transferOwnership: (
    toDoctorId: string,
    transferType: EncounterTransfer['transfer_type'],
    reason: string,
  ) => Promise<EncounterTransfer>;
  requestConsultation: (
    doctorId: string,
    reason: string,
  ) => Promise<EncounterTransfer>;
  grantTemporaryAccess: (
    doctorId: string,
    hours?: number,
  ) => Promise<EncounterCareTeamMember>;

  // Audit
  accessLogs: any[];
  accessLogsLoading: boolean;

  // Utilities
  getAccessDeniedMessage: (action: EncounterAction) => string;
  refetch: () => void;
}

export function useEncounterAccess({
  encounterId,
  enabled = true,
}: UseEncounterAccessOptions): UseEncounterAccessReturn {
  const queryClient = useQueryClient();
  const { staff } = useAuth();

  const userId = staff?.id || '';
  const userRole = (staff?.role as UserRole) || 'receptionist';
  const userDepartment = staff?.department || null;

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  // Get user's role in this encounter
  const {
    data: roleData,
    isLoading: roleLoading,
    refetch: refetchRole,
  } = useQuery({
    queryKey: encounterAccessKeys.role(encounterId, userId),
    queryFn: () =>
      getEncounterRole(encounterId, userId, userRole, userDepartment),
    enabled: enabled && !!encounterId && !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Get care team
  const {
    data: careTeam = [],
    isLoading: careTeamLoading,
    refetch: refetchCareTeam,
  } = useQuery({
    queryKey: encounterAccessKeys.careTeam(encounterId),
    queryFn: () => getEncounterCareTeam(encounterId),
    enabled: enabled && !!encounterId,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Get access logs (only for admins/primary doctor)
  const { data: accessLogs = [], isLoading: accessLogsLoading } = useQuery({
    queryKey: encounterAccessKeys.accessLogs(encounterId),
    queryFn: () => getEncounterAccessLogs(encounterId, 50),
    enabled:
      enabled &&
      !!encounterId &&
      (roleData?.role === 'primary_doctor' ||
        ['super_admin', 'admin', 'medical_director'].includes(userRole)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const encounterRole = roleData?.role;
  const allowedActions = useMemo(
    () => (encounterRole ? ROLE_PERMISSIONS[encounterRole] || [] : []),
    [encounterRole],
  );

  const isPrimaryDoctor = encounterRole === 'primary_doctor';
  const canEdit = useMemo(
    () =>
      allowedActions.includes('edit_clinical_notes') ||
      allowedActions.includes('add_diagnosis') ||
      allowedActions.includes('prescribe'),
    [allowedActions],
  );
  const canView = useMemo(
    () => allowedActions.includes('view'),
    [allowedActions],
  );
  const canClose = useMemo(
    () => allowedActions.includes('close_encounter'),
    [allowedActions],
  );
  const canTransfer = useMemo(
    () => allowedActions.includes('transfer_ownership'),
    [allowedActions],
  );
  const canAddToCareTeam = useMemo(
    () => allowedActions.includes('add_to_care_team'),
    [allowedActions],
  );

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  const addCareTeamMutation = useMutation({
    mutationFn: ({
      staffId,
      role,
      expiresAt,
      notes,
    }: {
      staffId: string;
      role: EncounterRole;
      expiresAt?: string;
      notes?: string;
    }) => addToCareTeam(encounterId, staffId, role, userId, expiresAt, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: encounterAccessKeys.careTeam(encounterId),
      });
    },
  });

  const removeCareTeamMutation = useMutation({
    mutationFn: (staffId: string) =>
      removeFromCareTeam(encounterId, staffId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: encounterAccessKeys.careTeam(encounterId),
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({
      toDoctorId,
      transferType,
      reason,
    }: {
      toDoctorId: string;
      transferType: EncounterTransfer['transfer_type'];
      reason: string;
    }) =>
      transferEncounterOwnership(
        encounterId,
        userId,
        toDoctorId,
        transferType,
        reason,
        userId,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: encounterAccessKeys.all });
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: ({ doctorId, hours }: { doctorId: string; hours?: number }) =>
      grantOnCallAccess(encounterId, doctorId, userId, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: encounterAccessKeys.careTeam(encounterId),
      });
    },
  });

  // ==========================================================================
  // CALLBACK FUNCTIONS
  // ==========================================================================

  const checkPermission = useCallback(
    async (action: EncounterAction): Promise<PermissionCheckResult> => {
      return canPerformAction(
        encounterId,
        userId,
        userRole,
        userDepartment,
        action,
      );
    },
    [encounterId, userId, userRole, userDepartment],
  );

  const getAllowedActions = useCallback((): EncounterAction[] => {
    return allowedActions;
  }, [allowedActions]);

  const addMemberToCareTeam = useCallback(
    async (
      staffId: string,
      role: EncounterRole,
      expiresAt?: string,
      notes?: string,
    ): Promise<EncounterCareTeamMember> => {
      return addCareTeamMutation.mutateAsync({
        staffId,
        role,
        expiresAt,
        notes,
      });
    },
    [addCareTeamMutation],
  );

  const removeMemberFromCareTeam = useCallback(
    async (staffId: string): Promise<void> => {
      return removeCareTeamMutation.mutateAsync(staffId);
    },
    [removeCareTeamMutation],
  );

  const transferOwnership = useCallback(
    async (
      toDoctorId: string,
      transferType: EncounterTransfer['transfer_type'],
      reason: string,
    ): Promise<EncounterTransfer> => {
      return transferMutation.mutateAsync({ toDoctorId, transferType, reason });
    },
    [transferMutation],
  );

  const requestConsultation = useCallback(
    async (doctorId: string, reason: string): Promise<EncounterTransfer> => {
      return transferMutation.mutateAsync({
        toDoctorId: doctorId,
        transferType: 'consultation',
        reason,
      });
    },
    [transferMutation],
  );

  const grantTemporaryAccess = useCallback(
    async (
      doctorId: string,
      hours: number = 8,
    ): Promise<EncounterCareTeamMember> => {
      return grantAccessMutation.mutateAsync({ doctorId, hours });
    },
    [grantAccessMutation],
  );

  const getAccessDeniedMessage = useCallback(
    (action: EncounterAction): string => {
      switch (encounterRole) {
        case 'no_access':
          return 'You do not have access to this encounter. Contact the primary doctor or request a consultation.';
        case 'department_doctor':
          return `You have read-only access to this encounter. To ${action.replace(/_/g, ' ')}, request co-management or ownership transfer.`;
        case 'consulting_doctor':
          return `As a consultant, you can view and add notes but cannot ${action.replace(/_/g, ' ')}.`;
        case 'on_call_doctor':
          return `On-call access is temporary. For full permissions, request ownership transfer.`;
        case 'nurse':
          return 'Nursing access is limited to vitals and nursing documentation.';
        case 'lab_technician':
          return 'Lab access is limited to viewing and processing lab orders.';
        case 'radiologist':
          return 'Radiology access is limited to viewing and processing imaging orders.';
        case 'pharmacist':
          return 'Pharmacy access is limited to viewing and dispensing prescriptions.';
        default:
          return `You cannot ${action.replace(/_/g, ' ')} on this encounter.`;
      }
    },
    [encounterRole],
  );

  const refetch = useCallback(() => {
    refetchRole();
    refetchCareTeam();
  }, [refetchRole, refetchCareTeam]);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    encounterRole,
    isLoading: roleLoading,
    isPrimaryDoctor,
    canEdit,
    canView,
    canClose,
    canTransfer,
    canAddToCareTeam,

    checkPermission,
    getAllowedActions,

    careTeam,
    careTeamLoading,
    addMemberToCareTeam,
    removeMemberFromCareTeam,

    transferOwnership,
    requestConsultation,
    grantTemporaryAccess,

    accessLogs,
    accessLogsLoading,

    getAccessDeniedMessage,
    refetch,
  };
}

// =============================================================================
// PERMISSION GUARD COMPONENT
// =============================================================================

interface EncounterPermissionGuardProps {
  encounterId: string;
  action: EncounterAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDeniedMessage?: boolean;
}

/**
 * Component that only renders children if user has permission
 */
export function EncounterPermissionGuard({
  encounterId,
  action,
  children,
  fallback = null,
  showDeniedMessage = false,
}: EncounterPermissionGuardProps): JSX.Element | null {
  const { encounterRole, isLoading, getAccessDeniedMessage } =
    useEncounterAccess({
      encounterId,
    });

  if (isLoading) {
    return null;
  }

  const allowedActions = encounterRole
    ? ROLE_PERMISSIONS[encounterRole] || []
    : [];
  const hasPermission = allowedActions.includes(action);

  if (!hasPermission) {
    if (showDeniedMessage) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {getAccessDeniedMessage(action)}
        </div>
      ) as JSX.Element;
    }
    return fallback as JSX.Element | null;
  }

  return children as JSX.Element;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  UseEncounterAccessReturn,
  UseEncounterAccessOptions,
  EncounterPermissionGuardProps,
};
