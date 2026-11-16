/**
 * Hygiene Module Exports
 * Central export point for Hygiene/Infection Control components, hooks, and types
 */

// Types
export * from './types/hygiene.types';

// Hooks
export * from './hooks/useHygiene';

// Module Router (main entry point)
export { default as HygieneModule } from './HygieneModule';

// Components
export { default as HygieneDashboard } from './components/HygieneDashboard';
export { default as HygieneWorklist } from './components/HygieneWorklist';
export { default as HygieneCareRecordsList } from './components/HygieneCareRecordsList';
export { default as PatientHygienePanel } from './components/PatientHygienePanel';
export { default as InfectionSurveillanceList } from './components/InfectionSurveillanceList';
export { default as HygieneCareForm } from './components/HygieneCareForm';

// Re-export commonly used types for convenience
export type {
  HygieneActivityCatalogue,
  HygieneCareRecord,
  HygieneCareSchedule,
  InfectionSurveillance,
  HygieneDashboardStats,
  InfectionDashboardStats,
  ShiftComplianceStats,
  HygieneWorklistItem,
  PatientHygieneProfile,
  HygieneActivityCategory,
  PatientTolerance,
  HygieneStatus,
  MissedCareReason,
  InfectionType,
  InfectionSeverity,
  InfectionOutcome,
  Shift,
} from './types/hygiene.types';
