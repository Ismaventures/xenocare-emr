/**
 * Clinical Export System - Standards Index
 * XENOCARE EMR
 *
 * Central export point for healthcare coding standards services
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

// ICD-10 Service
export type { ICD10Chapter, ICD10Code } from './icd10.service';
export {
  ICD10_CHAPTERS,
  COMMON_ICD10_CODES,
  validateICD10Code,
  normalizeICD10Code,
  getICD10Category,
  getICD10Chapter,
  getICD10ChapterCode,
  getICD10ChapterTitle,
  getICD10Description,
  calculateICD10ChapterStats,
  getTopICD10Codes,
  groupDiagnosesByChapter,
  searchICD10Codes,
} from './icd10.service';

// LOINC Service
export type { LOINCCode, LOINCPanel } from './loinc.service';
export {
  VITAL_SIGNS_LOINC,
  LABORATORY_LOINC,
  LOINC_PANELS,
  getVitalSignLOINC,
  getLabTestLOINC,
  lookupLOINCCode,
  validateLOINCCode,
  getLOINCNormalRange,
  isValueNormal,
  enrichVitalsWithLOINC,
  searchLOINCCodes,
} from './loinc.service';

// ATC Service
export type { ATCLevel1, ATCLevel2, ATCCodeEntry } from './atc.service';
export {
  ATC_LEVEL1,
  COMMON_ATC_CODES,
  validateATCCode,
  normalizeATCCode,
  getATCLevel1,
  parseATCCode,
  lookupATCCode,
  searchATCByName,
  getDrugsByATCLevel1,
  enrichPrescriptionWithATC,
  groupPrescriptionsByATCLevel1,
  calculateATCStats,
  getRouteDescription,
} from './atc.service';
