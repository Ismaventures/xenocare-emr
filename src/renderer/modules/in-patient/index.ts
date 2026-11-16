// =============================================================================
// NDC MEDICAL CENTRE EMR - In-Patient Module
// Central export file for the in-patient management module
// =============================================================================

// API
export * from './api/admissions.api';
export * from './api/wards.api';
export * from './api/beds.api';
export * from './api/ward-rounds.api';
export * from './api/transfers.api';

// Hooks
export * from './hooks/useAdmissions';
export * from './hooks/useWards';
export * from './hooks/useBeds';
export * from './hooks/useWardRounds';

// Components
export { default as InPatientPage } from './pages/InPatientPage';
export { default as WardDashboard } from './components/WardDashboard';
export { default as AdmissionForm } from './components/AdmissionForm';
export { default as BedManagement } from './components/BedManagement';
export { default as WardRoundNoteForm } from './components/WardRoundNoteForm';
export { default as DischargeForm } from './components/DischargeForm';
export { default as PatientAdmissionCard } from './components/PatientAdmissionCard';
export {
  DischargeChecklist,
  DEFAULT_CHECKLIST,
} from './components/DischargeChecklist';
export { DischargeSummary } from './components/DischargeSummary';
export type {
  ChecklistItem,
  ChecklistCategory,
} from './components/DischargeChecklist';
export type { DischargeSummaryData } from './components/DischargeSummary';
