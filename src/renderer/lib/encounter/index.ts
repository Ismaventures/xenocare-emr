/**
 * =============================================================================
 * XENOCARE EMR - ENCOUNTER MODULE
 * =============================================================================
 *
 * Central export for all encounter-related functionality including:
 * - Access control & ownership
 * - Care team management
 * - Audit logging
 * - Permission guards
 * - Validation & hooks
 */

// Validation & Hooks
export * from './validation';
export * from './hooks';
export * from './continuation';
export * from './helpers';
export { default as encounterValidation } from './validation';
export { default as encounterHooks } from './hooks';

// Access Control Service
export {
  // Types
  type EncounterRole,
  type EncounterAction,
  type EncounterCareTeamMember,
  type EncounterAccessLog,
  type EncounterTransfer,
  type PermissionCheckResult,

  // Constants
  ROLE_PERMISSIONS,

  // Functions
  getEncounterRole,
  canPerformAction,
  addToCareTeam,
  removeFromCareTeam,
  getEncounterCareTeam,
  transferEncounterOwnership,
  getEncounterTransferHistory,
  logEncounterAccess,
  getEncounterAccessLogs,
  grantOnCallAccess,
  getVisibleEncounters,
} from './access-control';

// React Hook & Components
export {
  // Hook
  useEncounterAccess,

  // Components
  EncounterPermissionGuard,

  // Query Keys
  encounterAccessKeys,

  // Types
  type UseEncounterAccessReturn,
  type UseEncounterAccessOptions,
  type EncounterPermissionGuardProps,
} from './useEncounterAccess';
