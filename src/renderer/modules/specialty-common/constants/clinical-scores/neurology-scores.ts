/**
 * =============================================================================
 * NEUROLOGY CLINICAL SCORES
 * =============================================================================
 * Validated neurological scoring instruments:
 * - GCS    : Glasgow Coma Scale (E + V + M)
 * - NIHSS  : NIH Stroke Scale (abridged key items)
 * - mRS    : modified Rankin Scale (functional outcome)
 * =============================================================================
 */

import type { ClinicalScoreDefinition } from '../../dtos/specialty-clinic.dto';

// -----------------------------------------------------------------------------
// GCS — Glasgow Coma Scale
// -----------------------------------------------------------------------------
export const GCS_SCORE: ClinicalScoreDefinition = {
  id: 'gcs',
  name: 'GCS',
  full_name: 'Glasgow Coma Scale',
  specialty_codes: ['NEUROLOGY', 'NEUROSURGERY'],
  description:
    'Assesses level of consciousness. Total = Eye (E) + Verbal (V) + Motor (M). Range: 3–15.',
  items: [
    {
      id: 'gcs_eye',
      question: 'Eye Opening (E)',
      options: [
        { value: 1, label: '1 — None' },
        { value: 2, label: '2 — To pain' },
        { value: 3, label: '3 — To voice' },
        { value: 4, label: '4 — Spontaneous' },
      ],
    },
    {
      id: 'gcs_verbal',
      question: 'Verbal Response (V)',
      options: [
        { value: 1, label: '1 — None' },
        { value: 2, label: '2 — Incomprehensible sounds' },
        { value: 3, label: '3 — Inappropriate words' },
        { value: 4, label: '4 — Confused' },
        { value: 5, label: '5 — Oriented / Normal' },
      ],
    },
    {
      id: 'gcs_motor',
      question: 'Motor Response (M)',
      options: [
        { value: 1, label: '1 — None' },
        { value: 2, label: '2 — Abnormal extension (decerebrate)' },
        { value: 3, label: '3 — Abnormal flexion (decorticate)' },
        { value: 4, label: '4 — Withdrawal from pain' },
        { value: 5, label: '5 — Localises to pain' },
        { value: 6, label: '6 — Obeys commands' },
      ],
    },
  ],
  max_score: 15,
  severity_ranges: [
    {
      min: 13,
      max: 15,
      label: 'Mild',
      color: '#22c55e',
      clinical_action: 'Observe. Monitor for deterioration.',
    },
    {
      min: 9,
      max: 12,
      label: 'Moderate',
      color: '#eab308',
      clinical_action:
        'Urgent CT brain. Neurosurgery review. Close monitoring.',
    },
    {
      min: 3,
      max: 8,
      label: 'Severe',
      color: '#ef4444',
      clinical_action:
        'Secure airway. Emergent ICU care. Immediate imaging. Neurosurgery consult.',
    },
  ],
  interpretation_notes:
    'GCS ≤8 indicates coma — intubation is usually required. Document best response per component.',
};

// -----------------------------------------------------------------------------
// mRS — modified Rankin Scale
// -----------------------------------------------------------------------------
export const MRS_SCORE: ClinicalScoreDefinition = {
  id: 'mrs',
  name: 'mRS',
  full_name: 'Modified Rankin Scale (Functional Outcome)',
  specialty_codes: ['NEUROLOGY', 'NEUROSURGERY'],
  description:
    'Grades functional disability/dependence following a stroke. Single question, 0–6.',
  items: [
    {
      id: 'mrs_grade',
      question:
        "Select the grade that best describes the patient's current level of disability:",
      options: [
        { value: 0, label: '0 — No symptoms at all' },
        {
          value: 1,
          label:
            '1 — No significant disability. Able to carry out all usual duties.',
        },
        {
          value: 2,
          label:
            '2 — Slight disability. Unable to carry out all previous activities, but able to look after own affairs.',
        },
        {
          value: 3,
          label:
            '3 — Moderate disability. Requires some help, but able to walk without assistance.',
        },
        {
          value: 4,
          label:
            '4 — Moderately severe disability. Unable to walk without assistance and unable to attend to own bodily needs.',
        },
        {
          value: 5,
          label:
            '5 — Severe disability. Bedridden, incontinent and requiring constant nursing care.',
        },
        { value: 6, label: '6 — Dead' },
      ],
    },
  ],
  max_score: 6,
  severity_ranges: [
    {
      min: 0,
      max: 1,
      label: 'No / No significant disability',
      color: '#22c55e',
      clinical_action: 'Outpatient follow-up. Stroke secondary prevention.',
    },
    {
      min: 2,
      max: 3,
      label: 'Slight to moderate disability',
      color: '#eab308',
      clinical_action: 'Rehabilitation. Stroke risk factor management.',
    },
    {
      min: 4,
      max: 5,
      label: 'Moderately severe / Severe disability',
      color: '#ef4444',
      clinical_action: 'Intensive rehabilitation. Social care assessment.',
    },
    {
      min: 6,
      max: 6,
      label: 'Fatal outcome',
      color: '#6b7280',
      clinical_action: 'N/A',
    },
  ],
};

export const NEUROLOGY_SCORES: ClinicalScoreDefinition[] = [
  GCS_SCORE,
  MRS_SCORE,
];
