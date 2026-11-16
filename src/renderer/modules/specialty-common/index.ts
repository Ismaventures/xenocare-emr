/**
 * =============================================================================
 * SPECIALTY COMMON MODULE
 * =============================================================================
 * Shared components and utilities for specialty clinic modules.
 * Includes triage, order sets, scoring calculators, and care plans.
 * =============================================================================
 */

// --- Existing ---
export { default as SpecialtyOrdersStep } from './components/SpecialtyOrdersStep';
export type {
  SpecialtyReferralState,
  SpecialtyReferralsState,
} from './components/SpecialtyOrdersStep';
export {
  createDefaultReferralState,
  createDefaultSpecialtyReferrals,
} from './components/SpecialtyOrdersStep';

// --- New: Triage ---
export { default as ClinicTriageForm } from './components/ClinicTriageForm';
export { default as ClinicTriageDisplay } from './components/ClinicTriageDisplay';

// --- New: Order Sets ---
export { default as OrderSetSelector } from './components/OrderSetSelector';

// --- New: Scoring ---
export { default as ClinicalScoreCalculator } from './components/ClinicalScoreCalculator';

// --- Universal Exam Shell ---
export { default as UniversalExamShell } from './components/UniversalExamShell';
export type { VisitMode, UniversalExamShellProps } from './components/UniversalExamShell';
export { default as ConsultationPatientContextBar } from './components/ConsultationPatientContextBar';
export { default as ConsultationPatientStoryPanel } from './components/ConsultationPatientStoryPanel';
export { default as ConsultationSupportDrawers } from './components/ConsultationSupportDrawers';
export { default as ConsultationVitalsRail } from './components/ConsultationVitalsRail';

// --- Key Findings Config ---
export { getKeyFindings, KEY_FINDINGS_MAP } from './constants/key-findings';
export type { KeyFinding, KeyFindingsMap } from './constants/key-findings';

// --- New: DTOs ---
export type {
  ClinicTriageConfig,
  ClinicTriageObservation,
  CreateTriageObservationDTO,
  SpecialtyOrderSet,
  OrderSetItem,
  SpecialtyCareplan,
  CreateCareplanDTO,
  CareplanSession,
  CreateSessionDTO,
  CompleteSessionDTO,
  ClinicalScoreDefinition,
  ScoreItem,
  SeverityRange,
  ScoreResult,
} from './dtos/specialty-clinic.dto';

// --- New: Hooks ---
export {
  useTriageConfigs,
  useTriageObservations,
  useTriageObservationsByClinic,
  useCreateTriageObservations,
  useOrderSets,
  usePatientCareplans,
  useCareplan,
  useCreateCareplan,
  useUpdateCareplanStatus,
  useCareplanSessions,
  useCreateSession,
  useCompleteSession,
  useUpdateSessionStatus,
} from './hooks/useSpecialtyClinic';

// --- New: Constants ---
export { getSystemOrderSets, CARDIOLOGY_ORDER_SETS, OPHTHALMOLOGY_ORDER_SETS } from './constants/order-sets';
export { getScoresForSpecialty, getScoreById, CARDIOLOGY_SCORES } from './constants/clinical-scores';
