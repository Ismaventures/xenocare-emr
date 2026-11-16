/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - PROBLEMS EXTRACTOR
 * Extract and deduplicate problems from consultation diagnoses
 * =============================================================================
 */

import type { PatientProblem, ProblemStatus, ProblemSeverity } from './types';
import { SEVERITY_ORDER } from './constants';
import { buildProblemIdStable, parseDiagnosisToArray } from './utils';

// =============================================================================
// Problem Extraction Types
// =============================================================================

export interface ConsultationDiagnosis {
  diagnosis: string;
  consultation_date: string;
  consultation_id: string;
}

// =============================================================================
// Severity Detection
// =============================================================================

const CRITICAL_KEYWORDS = ['severe', 'acute', 'emergency', 'critical'];
const MEDIUM_KEYWORDS = ['moderate', 'chronic'];
const LOW_KEYWORDS = ['mild', 'minor'];

function detectSeverity(diagnosis: string): ProblemSeverity {
  const lower = diagnosis.toLowerCase();

  if (CRITICAL_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'Critical';
  }
  if (MEDIUM_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'Medium';
  }
  if (LOW_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'Low';
  }

  return 'Low';
}

// =============================================================================
// Status Detection
// =============================================================================

const RESOLVED_KEYWORDS = ['resolved', 'healed', 'cured', 'recovered'];
const CHRONIC_KEYWORDS = [
  'chronic',
  'diabetes',
  'hypertension',
  'asthma',
  'arthritis',
  'copd',
  'epilepsy',
];

function detectStatus(diagnosis: string): ProblemStatus {
  const lower = diagnosis.toLowerCase();

  if (RESOLVED_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'Resolved';
  }
  if (CHRONIC_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'Chronic';
  }

  return 'Active';
}

// =============================================================================
// Problem Extraction
// =============================================================================

/**
 * Extract deduplicated problems from consultation diagnoses
 * Aggregates related encounters and determines severity/status from keywords
 */
export function extractProblemsFromDiagnoses(
  consultations: ConsultationDiagnosis[],
): PatientProblem[] {
  const problemMap = new Map<string, PatientProblem>();

  consultations.forEach((c, index) => {
    if (!c.diagnosis) return;

    // Split diagnosis by common delimiters
    const diagnoses = c.diagnosis
      .split(/[,;]/)
      .map((d) => d.trim())
      .filter(Boolean);

    diagnoses.forEach((diagnosis) => {
      const normalizedName = diagnosis.toLowerCase();

      if (problemMap.has(normalizedName)) {
        // Update existing problem
        const existing = problemMap.get(normalizedName)!;
        existing.related_encounter_count++;
        if (c.consultation_date > existing.last_reviewed) {
          existing.last_reviewed = c.consultation_date;
        }
      } else {
        // Create new problem
        const severity = detectSeverity(diagnosis);
        const status = detectStatus(diagnosis);

        problemMap.set(normalizedName, {
          id: buildProblemIdStable(diagnosis, c.consultation_date, index),
          name: diagnosis,
          status,
          severity,
          onset_date: c.consultation_date,
          last_reviewed: c.consultation_date,
          related_encounter_count: 1,
        });
      }
    });
  });

  // Sort by status (Active first) then by severity
  return Array.from(problemMap.values()).sort((a, b) => {
    // Active/Critical first
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (b.status === 'Active' && a.status !== 'Active') return 1;

    // Then by severity
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  });
}

/**
 * Extract diagnosis text from raw consultation data
 * Handles various formats: array, string, diagnosis_text field, differential
 */
export function extractDiagnosisFromConsultation(consultation: {
  diagnosis?: string | string[] | null;
  diagnosis_text?: string | null;
  differential_diagnosis?: string[] | null;
}): string {
  // Try main diagnosis field (array or string)
  if (
    Array.isArray(consultation.diagnosis) &&
    consultation.diagnosis.length > 0
  ) {
    return consultation.diagnosis.join(', ');
  }

  if (consultation.diagnosis) {
    return String(consultation.diagnosis);
  }

  // Try diagnosis_text
  if (consultation.diagnosis_text) {
    return consultation.diagnosis_text;
  }

  // Fall back to differential diagnosis
  if (
    Array.isArray(consultation.differential_diagnosis) &&
    consultation.differential_diagnosis.length > 0
  ) {
    return consultation.differential_diagnosis.join(', ');
  }

  return '';
}

/**
 * Map raw consultations to ConsultationDiagnosis format for problem extraction
 */
export function mapConsultationsForProblemExtraction(
  consultations: Array<{
    consultation_id: string;
    consultation_date?: string;
    diagnosis?: string | string[] | null;
    diagnosis_text?: string | null;
    differential_diagnosis?: string[] | null;
  }>,
): ConsultationDiagnosis[] {
  return consultations.map((c) => ({
    diagnosis: extractDiagnosisFromConsultation(c),
    consultation_date: c.consultation_date || '',
    consultation_id: c.consultation_id,
  }));
}
