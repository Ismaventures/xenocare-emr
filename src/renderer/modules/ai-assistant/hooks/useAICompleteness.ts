/**
 * useAICompleteness — React hook for clinical documentation completeness scoring.
 *
 * Analyses a consultation record to score documentation quality.
 * Pure client-side analysis — no LLM call needed.
 */
import { useMemo } from 'react';
import type { CompletenessScore } from '../types/ai.types';

interface ConsultationData {
  chief_complaint?: string;
  history_of_presenting_illness?: string;
  review_of_systems?: string;
  physical_examination?: string;
  assessment?: string;
  plan?: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd10_codes?: string[];
  vitals_recorded?: boolean;
  allergies_documented?: boolean;
}

interface CompletenessField {
  key: keyof ConsultationData;
  label: string;
  weight: number;
  required: boolean;
}

const FIELD_DEFINITIONS: CompletenessField[] = [
  {
    key: 'chief_complaint',
    label: 'Chief Complaint',
    weight: 15,
    required: true,
  },
  {
    key: 'history_of_presenting_illness',
    label: 'HPI',
    weight: 15,
    required: true,
  },
  {
    key: 'review_of_systems',
    label: 'Review of Systems',
    weight: 10,
    required: false,
  },
  {
    key: 'physical_examination',
    label: 'Physical Examination',
    weight: 15,
    required: true,
  },
  { key: 'assessment', label: 'Assessment', weight: 15, required: true },
  { key: 'plan', label: 'Plan', weight: 15, required: true },
  {
    key: 'provisional_diagnosis',
    label: 'Provisional Diagnosis',
    weight: 5,
    required: false,
  },
  {
    key: 'final_diagnosis',
    label: 'Final Diagnosis',
    weight: 5,
    required: false,
  },
  { key: 'icd10_codes', label: 'ICD-10 Codes', weight: 5, required: false },
];

/**
 * Calculate completeness score for a consultation.
 * Returns memoised result that updates when consultation data changes.
 */
export function useAICompleteness(
  consultation: ConsultationData | null,
): CompletenessScore | null {
  return useMemo(() => {
    if (!consultation) return null;
    return calculateCompleteness(consultation);
  }, [consultation]);
}

export function calculateCompleteness(
  consultation: ConsultationData,
): CompletenessScore {
  let totalScore = 0;
  const missingFields: string[] = [];
  const presentFields: string[] = [];
  const suggestions: string[] = [];

  for (const field of FIELD_DEFINITIONS) {
    const value = consultation[field.key];
    const hasValue = Array.isArray(value)
      ? value.length > 0
      : typeof value === 'boolean'
        ? value
        : !!value && String(value).trim().length > 0;

    if (hasValue) {
      totalScore += field.weight;
      presentFields.push(field.label);

      // Check quality (minimum length for text fields)
      if (
        typeof value === 'string' &&
        value.trim().length < 20 &&
        field.weight >= 10
      ) {
        suggestions.push(
          `${field.label} is very brief — consider adding more detail.`,
        );
        totalScore -= Math.floor(field.weight * 0.3); // Penalty for low-quality entry
      }
    } else {
      missingFields.push(field.label);
      if (field.required) {
        suggestions.push(`⚠️ ${field.label} is required but missing.`);
      } else {
        suggestions.push(
          `Consider adding ${field.label} for a more complete record.`,
        );
      }
    }
  }

  // Clamp score
  const score = Math.max(0, Math.min(100, totalScore));

  // Determine grade
  let grade: CompletenessScore['grade'];
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    missingFields,
    presentFields,
    suggestions: suggestions.slice(0, 6), // Limit suggestions
  };
}
