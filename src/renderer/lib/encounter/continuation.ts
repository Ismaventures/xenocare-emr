// =============================================================================
// Encounter Continuation Rules - Standard EMR Practice
// =============================================================================
// This module defines when and how an encounter can be continued with new orders.
// Following standard EMR practice to prevent manipulation while allowing legitimate
// clinical workflow continuity.
// =============================================================================

import { WorkflowStage } from '../workflow/types';

// =============================================================================
// Encounter Continuation Types
// =============================================================================

export interface EncounterContinuationContext {
  encounterId: string;
  patientId: string;
  currentStage: WorkflowStage;
  status: string;
  createdAt: string;
  lastActivityAt?: string;
  encounterType: 'OPD' | 'In-Patient' | 'Emergency';
  hasUnresolvedResults: boolean;
  consultationCount: number;
  /** When true, the patient has an active admission — bypasses OPD time limits */
  hasActiveAdmission?: boolean;
}

export interface ContinuationEligibility {
  canContinue: boolean;
  reason: string;
  requiresJustification: boolean;
  warningLevel: 'none' | 'info' | 'warning' | 'error';
  allowedActions: AllowedContinuationAction[];
}

export type AllowedContinuationAction =
  | 'add_lab_orders'
  | 'add_radiology_orders'
  | 'add_prescriptions'
  | 'add_procedures'
  | 'add_clinical_requests'
  | 'update_notes'
  | 'review_results'
  | 'none';

// =============================================================================
// Continuation Rules Configuration
// =============================================================================

/**
 * Maximum hours an OPD encounter can remain open for continuation
 * After this, a new encounter must be created
 */
export const OPD_ENCOUNTER_MAX_HOURS = 48;

/**
 * Hours after which justification is required to continue an OPD encounter
 */
export const OPD_JUSTIFICATION_THRESHOLD_HOURS = 24;

/**
 * Stages where encounter can be continued with new orders
 */
export const CONTINUABLE_STAGES: WorkflowStage[] = [
  'consultation',
  'lab_results',
  'radiology_results',
  'doctor_review',
  'pharmacy_pending',
  'procedure_pending',
];

/**
 * Stages where encounter is considered "closed" - no more orders allowed
 */
export const CLOSED_STAGES: WorkflowStage[] = ['completed', 'billing_final'];

/**
 * Stages where encounter is in service-pending state - can add related orders only
 */
export const SERVICE_PENDING_STAGES: WorkflowStage[] = [
  'lab_pending',
  'radiology_pending',
  'pharmacy_dispense',
];

// =============================================================================
// Core Continuation Logic
// =============================================================================

/**
 * Determines if an encounter can be continued and what actions are allowed.
 * This is the main entry point for encounter continuation validation.
 */
export function checkEncounterContinuation(
  context: EncounterContinuationContext,
): ContinuationEligibility {
  const {
    currentStage,
    status,
    createdAt,
    encounterType,
    hasUnresolvedResults,
  } = context;

  // Rule 1: Status check - must be Active
  if (status !== 'Active') {
    return {
      canContinue: false,
      reason: `Encounter is ${status}. Only active encounters can be continued.`,
      requiresJustification: false,
      warningLevel: 'error',
      allowedActions: ['none'],
    };
  }

  // Rule 2: Stage check - certain stages are closed
  if (CLOSED_STAGES.includes(currentStage)) {
    return {
      canContinue: false,
      reason:
        'Encounter has been completed. Please create a new encounter for additional services.',
      requiresJustification: false,
      warningLevel: 'error',
      allowedActions: ['none'],
    };
  }

  // Rule 3: Time-based rules for OPD encounters
  // Bypass: If patient has an active admission, treat as In-Patient regardless of visit_type
  if (encounterType === 'OPD' && !context.hasActiveAdmission) {
    const hoursSinceCreation = getHoursSince(createdAt);

    // Hard limit - cannot continue after max hours
    if (hoursSinceCreation > OPD_ENCOUNTER_MAX_HOURS) {
      return {
        canContinue: false,
        reason: `OPD encounter is over ${OPD_ENCOUNTER_MAX_HOURS} hours old. Please create a new encounter.`,
        requiresJustification: false,
        warningLevel: 'error',
        allowedActions: ['none'],
      };
    }

    // Soft limit - require justification after threshold
    if (hoursSinceCreation > OPD_JUSTIFICATION_THRESHOLD_HOURS) {
      return {
        canContinue: true,
        reason: `Encounter is ${Math.floor(hoursSinceCreation)} hours old. Justification required.`,
        requiresJustification: true,
        warningLevel: 'warning',
        allowedActions: getAllowedActionsForStage(
          currentStage,
          hasUnresolvedResults,
        ),
      };
    }
  }

  // Rule 3b: Patient has active admission with OPD encounter — allow like In-Patient
  if (encounterType === 'OPD' && context.hasActiveAdmission) {
    return {
      canContinue: true,
      reason:
        'Patient is currently admitted — encounter can be continued with additional orders.',
      requiresJustification: false,
      warningLevel: 'none',
      allowedActions: getAllowedActionsForStage(
        currentStage,
        hasUnresolvedResults,
      ),
    };
  }

  // Rule 4: In-Patient encounters have no time limit but stage restrictions apply
  if (encounterType === 'In-Patient') {
    return {
      canContinue: true,
      reason: 'In-patient encounter - can add orders as part of ongoing care.',
      requiresJustification: false,
      warningLevel: 'none',
      allowedActions: getAllowedActionsForStage(
        currentStage,
        hasUnresolvedResults,
      ),
    };
  }

  // Rule 5: Service-pending stages - limited actions
  if (SERVICE_PENDING_STAGES.includes(currentStage)) {
    return {
      canContinue: true,
      reason: 'Encounter has pending services. Additional orders can be added.',
      requiresJustification: false,
      warningLevel: 'info',
      allowedActions: getAllowedActionsForStage(
        currentStage,
        hasUnresolvedResults,
      ),
    };
  }

  // Rule 6: Normal continuable stages
  if (CONTINUABLE_STAGES.includes(currentStage)) {
    return {
      canContinue: true,
      reason: 'Encounter can be continued with additional orders.',
      requiresJustification: false,
      warningLevel: 'none',
      allowedActions: getAllowedActionsForStage(
        currentStage,
        hasUnresolvedResults,
      ),
    };
  }

  // Default: Allow with info warning
  return {
    canContinue: true,
    reason: 'Encounter is in progress.',
    requiresJustification: false,
    warningLevel: 'info',
    allowedActions: getAllowedActionsForStage(
      currentStage,
      hasUnresolvedResults,
    ),
  };
}

/**
 * Get allowed actions based on current workflow stage
 */
function getAllowedActionsForStage(
  stage: WorkflowStage,
  hasUnresolvedResults: boolean,
): AllowedContinuationAction[] {
  const baseActions: AllowedContinuationAction[] = ['update_notes'];

  switch (stage) {
    case 'consultation':
    case 'doctor_review':
      // Full access - doctor is actively working
      return [
        'add_lab_orders',
        'add_radiology_orders',
        'add_prescriptions',
        'add_procedures',
        'add_clinical_requests',
        'update_notes',
        'review_results',
      ];

    case 'lab_results':
    case 'radiology_results':
      // Results are in - doctor needs to review and potentially order more
      return [
        'add_lab_orders',
        'add_radiology_orders',
        'add_prescriptions',
        'add_procedures',
        'add_clinical_requests',
        'update_notes',
        'review_results',
      ];

    case 'lab_pending':
      // Lab tests pending - can add more lab tests or radiology
      return ['add_lab_orders', 'add_radiology_orders', 'update_notes'];

    case 'radiology_pending':
      // Imaging pending - can add more imaging or lab tests
      return ['add_lab_orders', 'add_radiology_orders', 'update_notes'];

    case 'pharmacy_pending':
      // Prescriptions pending - can add more prescriptions
      return ['add_prescriptions', 'update_notes'];

    case 'pharmacy_dispense':
      // Dispensing - very limited actions
      return ['update_notes'];

    case 'procedure_pending':
      // Procedure pending - can add related orders
      return ['add_lab_orders', 'add_prescriptions', 'update_notes'];

    default:
      return baseActions;
  }
}

// =============================================================================
// Patient's Recent Encounters Query Logic
// =============================================================================

/**
 * Get criteria for finding a patient's most recent continuable encounter.
 * This returns the SQL/filter conditions to use.
 */
export interface RecentEncounterCriteria {
  maxAgeHours: number;
  allowedStatuses: string[];
  excludedStages: WorkflowStage[];
  encounterTypes: ('OPD' | 'In-Patient' | 'Emergency')[];
}

export function getRecentEncounterCriteria(
  encounterType: 'OPD' | 'In-Patient' | 'Emergency' = 'OPD',
): RecentEncounterCriteria {
  if (encounterType === 'In-Patient') {
    // In-patient encounters don't have time limits
    return {
      maxAgeHours: 0, // 0 means no limit
      allowedStatuses: ['Active'],
      excludedStages: CLOSED_STAGES,
      encounterTypes: ['In-Patient'],
    };
  }

  // OPD and Emergency - time-bound
  return {
    maxAgeHours: OPD_ENCOUNTER_MAX_HOURS,
    allowedStatuses: ['Active'],
    excludedStages: CLOSED_STAGES,
    encounterTypes: [encounterType],
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function getHoursSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
}

/**
 * Format the continuation warning message for display
 */
export function formatContinuationMessage(
  eligibility: ContinuationEligibility,
): {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
} {
  switch (eligibility.warningLevel) {
    case 'error':
      return {
        title: 'Cannot Continue Encounter',
        message: eligibility.reason,
        type: 'error',
      };
    case 'warning':
      return {
        title: 'Justification Required',
        message: eligibility.reason,
        type: 'warning',
      };
    case 'info':
      return {
        title: 'Encounter Status',
        message: eligibility.reason,
        type: 'info',
      };
    default:
      return {
        title: 'Ready',
        message: eligibility.reason,
        type: 'success',
      };
  }
}

/**
 * Check if a specific action is allowed for the encounter
 */
export function isActionAllowed(
  eligibility: ContinuationEligibility,
  action: AllowedContinuationAction,
): boolean {
  return eligibility.canContinue && eligibility.allowedActions.includes(action);
}
