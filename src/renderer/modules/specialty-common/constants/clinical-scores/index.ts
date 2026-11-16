/**
 * =============================================================================
 * CLINICAL SCORES INDEX
 * =============================================================================
 * Central registry of all clinical scoring instruments.
 * =============================================================================
 */

import type { ClinicalScoreDefinition } from '../../dtos/specialty-clinic.dto';
import { CARDIOLOGY_SCORES } from './cardiology-scores';
import { GASTROENTEROLOGY_SCORES } from './gastroenterology-scores';
import { NEPHROLOGY_SCORES } from './nephrology-scores';
import { NEUROLOGY_SCORES } from './neurology-scores';
import { NEUROPSYCHIATRY_SCORES } from './neuropsychiatry-scores';
import { PULMONOLOGY_SCORES } from './pulmonology-scores';
import { UROLOGY_SCORES } from './urology-scores';

/** All clinical scores, keyed by specialty code */
export const CLINICAL_SCORES: Record<string, ClinicalScoreDefinition[]> = {
  CARDIOLOGY: CARDIOLOGY_SCORES,
  GASTROENTEROLOGY: GASTROENTEROLOGY_SCORES,
  NEPHROLOGY: NEPHROLOGY_SCORES,
  NEUROLOGY: NEUROLOGY_SCORES,
  NEUROSURGERY: NEUROLOGY_SCORES, // GCS + mRS apply equally to neurosurgery
  NEUROPSYCHIATRY: NEUROPSYCHIATRY_SCORES,
  PULMONOLOGY: PULMONOLOGY_SCORES,
  UROLOGY: UROLOGY_SCORES,
};

/** Get clinical scores for a specialty */
export function getScoresForSpecialty(
  specialtyCode: string,
): ClinicalScoreDefinition[] {
  return CLINICAL_SCORES[specialtyCode] || [];
}

/** Find a specific score by ID */
export function getScoreById(
  scoreId: string,
): ClinicalScoreDefinition | undefined {
  for (const scores of Object.values(CLINICAL_SCORES)) {
    const found = scores.find((s) => s.id === scoreId);
    if (found) return found;
  }
  return undefined;
}

export {
  CARDIOLOGY_SCORES,
  GASTROENTEROLOGY_SCORES,
  NEPHROLOGY_SCORES,
  NEUROLOGY_SCORES,
  NEUROPSYCHIATRY_SCORES,
  PULMONOLOGY_SCORES,
  UROLOGY_SCORES,
};
