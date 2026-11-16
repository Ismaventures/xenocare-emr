// =============================================================================
// Lab Result Template Components - Barrel Export
// =============================================================================

// Template-specific forms
export { default as NumericTableForm } from './NumericTableForm';
export { default as CultureSensitivityForm } from './CultureSensitivityForm';
export { default as UrinalysisForm } from './UrinalysisForm';
export { default as QualitativeQuantitativeForm } from './QualitativeQuantitativeForm';
export { default as ParasiteReportForm } from './ParasiteReportForm';
export { default as NarrativeDiagnosticForm } from './NarrativeDiagnosticForm';
export { default as BinaryMetadataForm } from './BinaryMetadataForm';

// Main dynamic form that switches between templates
export {
  default as DynamicResultForm,
  getTemplateTypeLabel,
} from './DynamicResultForm';
export type { DynamicResultFormProps } from './DynamicResultForm';

// Re-export types from DTOs for convenience
export type {
  ResultTemplateType,
  LabCategoryCode,
  StructuredResult,
  NumericTableResult,
  PanelNumericResult,
  CultureSensitivityResult,
  ParasiteReportResult,
  QualitativeQuantitativeResult,
  UrinalysisResult,
  NarrativeDiagnosticResult,
  NumericTimingResult,
  BinaryMetadataResult,
} from '../../dtos/lab-templates.dto';

// Re-export helper functions
export {
  createEmptyStructuredResult,
  getTemplateTypeForCategory,
  getCategoryDefinition,
  calculateResultFlag,
  LAB_CATEGORIES,
} from '../../dtos/lab-templates.dto';
