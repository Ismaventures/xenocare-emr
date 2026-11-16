/**
 * ICD API Integration
 * Exports service and types for WHO ICD-11 code lookups
 */

export {
  ICDService,
  getICDCode,
  searchICDCodes,
  searchICDCodesWithFilter,
  isValidICDFormat,
  formatICDCode,
  getICDServiceStatus,
  isICDServiceAvailable,
  ICDError,
} from './icdService';

export type {
  ICDCode,
  ICDSearchItem,
  ICDSearchResult,
  ICDServiceStatus,
} from './icdService';
