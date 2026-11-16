/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER COMPONENTS INDEX
 * Description: Export all encounter components
 * =============================================================================
 */

export { default as EncounterForm } from './EncounterForm';
export { default as EncounterTable } from './EncounterTable';
export { default as EncounterDetail } from './EncounterDetail';
export { default as ClinicList } from './ClinicList';
export {
  EncounterFilterPanel,
  EncounterFilterBadge,
  defaultEncounterFilters,
  type AdvancedEncounterFilters,
} from './EncounterFilterPanel';
export { EncounterReportTemplate } from './EncounterReportTemplate';
export { EncounterClinicalReport } from './EncounterClinicalReport';
export { EncounterClinicalReportWrapper } from './EncounterClinicalReportWrapper';

// Patient Encounter Summary - Consolidated view with expandable encounters
export { PatientEncounterSummary } from './PatientEncounterSummary';

// Comprehensive Filter Panel - Full-featured slide-out filter with all fields
export {
  ComprehensiveEncounterFilterPanel,
  defaultComprehensiveFilters,
  type ComprehensiveEncounterFilters,
} from './ComprehensiveEncounterFilterPanel';

// Export Modal - Multi-format export (CSV, Excel, PDF)
export { ExportModal } from './ExportModal';

// Internal Referral Queue for Encounter Office
export { InternalReferralQueue } from './InternalReferralQueue';

// External Referrals Tab - For NHIS Outgoing Referrals (Printing)
export { ExternalReferralsTab } from './ExternalReferralsTab';

// Encounter Settings Panel - Admin-configurable expiry durations
export { default as EncounterSettingsPanel } from './EncounterSettingsPanel';
