// =============================================================================
// NDC MEDICAL CENTRE EMR - Procedure Module
// Central export file for the procedure management module
// =============================================================================

// API
export * from './api/procedures.api';
export * from './api/procedure-catalogue.api';
export * from './api/procedure-consumables.api';

// Hooks
export * from './hooks/useProcedures';
export * from './hooks/useProcedureCatalogue';

// Components
export { default as ProceduresPage } from './pages/ProceduresPage';
export { default as ProcedureSchedule } from './components/ProcedureSchedule';
export { default as ProcedureForm } from './components/ProcedureForm';
export { default as ProcedureDetails } from './components/ProcedureDetails';
export { default as ProcedureChecklist } from './components/ProcedureChecklist';
export { default as ProcedureNotes } from './components/ProcedureNotes';
export { default as ConsumablesTracker } from './components/ConsumablesTracker';
export { default as ProcedureHistoryList } from './components/ProcedureHistoryList';
