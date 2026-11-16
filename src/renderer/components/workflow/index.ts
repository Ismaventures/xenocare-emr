// =============================================================================
// Workflow Components - Central Export
// =============================================================================

export * from './PatientJourneyTracker';
export * from './TodaysEncountersWidget';
export { default as PaymentStatusBadge } from './PaymentStatusBadge';
export {
  PaymentStatusDot,
  getPaymentStatusFromBillingOrder,
  isPaymentBlocking,
} from './PaymentStatusBadge';
export type { PaymentStatus } from './PaymentStatusBadge';
export { default as PatientJourneyDashboard } from './PatientJourneyDashboard';

// Encounter-centric components
export { default as EncounterHeader } from './EncounterHeader';
export {
  default as WorkflowProgress,
  StageBadge,
  ProgressPercentage,
} from './WorkflowProgress';

// Patient-Encounter Selection with Role-Based Access
export {
  EncounterTimeline,
  EncounterTimelineCompact,
} from './EncounterTimeline';
export { EncounterScopedPatientView } from './EncounterScopedPatientView';
