/**
 * =============================================================================
 * GASTROENTEROLOGY CLINICAL SCORES
 * =============================================================================
 * Validated hepatology/GI scoring instruments:
 * - Child-Pugh : Liver disease severity (A / B / C)
 * - MELD       : Model for End-Stage Liver Disease (continuous score)
 * =============================================================================
 */

import type { ClinicalScoreDefinition } from '../../dtos/specialty-clinic.dto';

// -----------------------------------------------------------------------------
// Child-Pugh Score
// -----------------------------------------------------------------------------
export const CHILD_PUGH_SCORE: ClinicalScoreDefinition = {
  id: 'child-pugh',
  name: 'Child-Pugh',
  full_name: 'Child-Pugh Score (Liver Disease Severity)',
  specialty_codes: ['GASTROENTEROLOGY'],
  description:
    'Assesses prognosis of chronic liver disease, mainly cirrhosis. Five clinical measures, each scored 1–3. Total: 5–15.',
  items: [
    {
      id: 'cp_bilirubin',
      question: 'Total Bilirubin (µmol/L)',
      options: [
        { value: 1, label: '1 — < 34 µmol/L (< 2 mg/dL)' },
        { value: 2, label: '2 — 34–51 µmol/L (2–3 mg/dL)' },
        { value: 3, label: '3 — > 51 µmol/L (> 3 mg/dL)' },
      ],
    },
    {
      id: 'cp_albumin',
      question: 'Serum Albumin (g/L)',
      options: [
        { value: 1, label: '1 — > 35 g/L' },
        { value: 2, label: '2 — 28–35 g/L' },
        { value: 3, label: '3 — < 28 g/L' },
      ],
    },
    {
      id: 'cp_inr',
      question: 'Prothrombin Time / INR',
      options: [
        { value: 1, label: '1 — < 1.7 (PT < 4 s prolonged)' },
        { value: 2, label: '2 — 1.7–2.3 (PT 4–6 s prolonged)' },
        { value: 3, label: '3 — > 2.3 (PT > 6 s prolonged)' },
      ],
    },
    {
      id: 'cp_ascites',
      question: 'Ascites',
      options: [
        { value: 1, label: '1 — None' },
        { value: 2, label: '2 — Mild (controlled with diuretics)' },
        { value: 3, label: '3 — Moderate–Severe (poorly controlled)' },
      ],
    },
    {
      id: 'cp_encephalopathy',
      question: 'Hepatic Encephalopathy',
      options: [
        { value: 1, label: '1 — None' },
        { value: 2, label: '2 — Grade I–II (minimal)' },
        { value: 3, label: '3 — Grade III–IV (advanced)' },
      ],
    },
  ],
  max_score: 15,
  severity_ranges: [
    {
      min: 5,
      max: 6,
      label: 'Class A — Well-compensated',
      color: '#22c55e',
      clinical_action:
        '1-year survival ~100%. Elective surgery generally safe. Standard management.',
    },
    {
      min: 7,
      max: 9,
      label: 'Class B — Significant dysfunction',
      color: '#eab308',
      clinical_action:
        '1-year survival ~80%. Moderate operative risk. Consider portal hypertension management.',
    },
    {
      min: 10,
      max: 15,
      label: 'Class C — Decompensated',
      color: '#ef4444',
      clinical_action:
        '1-year survival ~45%. High operative risk. Referral for liver transplantation assessment.',
    },
  ],
  interpretation_notes:
    'Child-Pugh Class A = 5–6 points, Class B = 7–9, Class C = 10–15. Correlate with MELD for transplant listing.',
};

export const GASTROENTEROLOGY_SCORES: ClinicalScoreDefinition[] = [
  CHILD_PUGH_SCORE,
];
