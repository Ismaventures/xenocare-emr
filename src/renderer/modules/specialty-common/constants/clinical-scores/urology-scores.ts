/**
 * =============================================================================
 * UROLOGY CLINICAL SCORES
 * =============================================================================
 * Validated urological scoring instruments:
 * - IPSS : International Prostate Symptom Score (LUTS severity)
 * =============================================================================
 */

import type { ClinicalScoreDefinition } from '../../dtos/specialty-clinic.dto';

// -----------------------------------------------------------------------------
// IPSS — International Prostate Symptom Score
// -----------------------------------------------------------------------------
export const IPSS_SCORE: ClinicalScoreDefinition = {
  id: 'ipss',
  name: 'IPSS',
  full_name: 'International Prostate Symptom Score',
  specialty_codes: ['UROLOGY'],
  description:
    'Quantifies lower urinary tract symptoms (LUTS). Seven questions, each 0–5. Total: 0–35.',
  items: [
    {
      id: 'ipss_incomplete',
      question:
        'Q1 — Incomplete emptying: Over the last month, how often have you had a sensation of not emptying your bladder completely after urinating?',
      options: [
        { value: 0, label: '0 — Not at all' },
        { value: 1, label: '1 — Less than 1 in 5 times' },
        { value: 2, label: '2 — Less than half the time' },
        { value: 3, label: '3 — About half the time' },
        { value: 4, label: '4 — More than half the time' },
        { value: 5, label: '5 — Almost always' },
      ],
    },
    {
      id: 'ipss_frequency',
      question:
        'Q2 — Frequency: How often have you had to urinate again less than 2 hours after you finished urinating?',
      options: [
        { value: 0, label: '0 — Not at all' },
        { value: 1, label: '1 — Less than 1 in 5 times' },
        { value: 2, label: '2 — Less than half the time' },
        { value: 3, label: '3 — About half the time' },
        { value: 4, label: '4 — More than half the time' },
        { value: 5, label: '5 — Almost always' },
      ],
    },
    {
      id: 'ipss_intermittency',
      question:
        'Q3 — Intermittency: How often have you found you stopped and started again several times when you urinated?',
      options: [
        { value: 0, label: '0 — Not at all' },
        { value: 1, label: '1 — Less than 1 in 5 times' },
        { value: 2, label: '2 — Less than half the time' },
        { value: 3, label: '3 — About half the time' },
        { value: 4, label: '4 — More than half the time' },
        { value: 5, label: '5 — Almost always' },
      ],
    },
    {
      id: 'ipss_urgency',
      question:
        'Q4 — Urgency: How often have you found it difficult to postpone urination?',
      options: [
        { value: 0, label: '0 — Not at all' },
        { value: 1, label: '1 — Less than 1 in 5 times' },
        { value: 2, label: '2 — Less than half the time' },
        { value: 3, label: '3 — About half the time' },
        { value: 4, label: '4 — More than half the time' },
        { value: 5, label: '5 — Almost always' },
      ],
    },
    {
      id: 'ipss_weak_stream',
      question:
        'Q5 — Weak stream: How often have you had a weak urinary stream?',
      options: [
        { value: 0, label: '0 — Not at all' },
        { value: 1, label: '1 — Less than 1 in 5 times' },
        { value: 2, label: '2 — Less than half the time' },
        { value: 3, label: '3 — About half the time' },
        { value: 4, label: '4 — More than half the time' },
        { value: 5, label: '5 — Almost always' },
      ],
    },
    {
      id: 'ipss_straining',
      question:
        'Q6 — Straining: How often have you had to push or strain to begin urination?',
      options: [
        { value: 0, label: '0 — Not at all' },
        { value: 1, label: '1 — Less than 1 in 5 times' },
        { value: 2, label: '2 — Less than half the time' },
        { value: 3, label: '3 — About half the time' },
        { value: 4, label: '4 — More than half the time' },
        { value: 5, label: '5 — Almost always' },
      ],
    },
    {
      id: 'ipss_nocturia',
      question:
        'Q7 — Nocturia: How many times do you typically get up at night to urinate?',
      options: [
        { value: 0, label: '0 — None' },
        { value: 1, label: '1 — Once' },
        { value: 2, label: '2 — Twice' },
        { value: 3, label: '3 — Three times' },
        { value: 4, label: '4 — Four times' },
        { value: 5, label: '5 — Five or more times' },
      ],
    },
  ],
  max_score: 35,
  severity_ranges: [
    {
      min: 0,
      max: 7,
      label: 'Mild',
      color: '#22c55e',
      clinical_action:
        'Watchful waiting. Lifestyle modifications (fluid intake, caffeine reduction). Annual review.',
    },
    {
      min: 8,
      max: 19,
      label: 'Moderate',
      color: '#eab308',
      clinical_action:
        'Consider alpha-blocker therapy (tamsulosin) or 5-alpha reductase inhibitor. Uroflowmetry and post-void residual.',
    },
    {
      min: 20,
      max: 35,
      label: 'Severe',
      color: '#ef4444',
      clinical_action:
        'Urological review. Cystoscopy. Consider surgical intervention (TURP or laser prostatectomy).',
    },
  ],
  interpretation_notes:
    'IPSS is validated for benign prostatic hyperplasia (BPH) symptom assessment. Also score quality of life (QoL) question (0–6) separately.',
};

export const UROLOGY_SCORES: ClinicalScoreDefinition[] = [IPSS_SCORE];
