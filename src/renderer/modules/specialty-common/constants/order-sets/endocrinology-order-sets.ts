import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const ENDOCRINOLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'endo-os-diabetes',
    specialty_code: 'ENDOCRINOLOGY',
    set_name: 'Diabetes Workup',
    description:
      'Comprehensive investigation panel for new or established diabetes',
    clinical_scenario: 'New diagnosis or annual review of diabetes mellitus',
    orders: {
      lab_tests: [
        { name: 'Fasting Blood Glucose', code: 'FBG', specimen_type: 'Blood' },
        { name: 'HbA1c', code: 'HBA1C', specimen_type: 'Blood' },
        {
          name: 'Lipid Panel (Total Chol, LDL, HDL, TG)',
          code: 'LIPID',
          specimen_type: 'Blood',
        },
        {
          name: 'Urea & Electrolytes (U&E)',
          code: 'UE',
          specimen_type: 'Blood',
        },
        { name: 'eGFR / Creatinine', code: 'EGFR', specimen_type: 'Blood' },
        {
          name: 'Urinary Albumin-Creatinine Ratio (ACR)',
          code: 'UACR',
          specimen_type: 'Urine (spot)',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Liver Function Tests', code: 'LFT', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (12-Lead)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'endo-os-thyroid',
    specialty_code: 'ENDOCRINOLOGY',
    set_name: 'Thyroid Workup',
    description:
      'Full thyroid function assessment including antibodies and imaging',
    clinical_scenario: 'Suspected thyroid disease, goitre, or thyroid lump',
    orders: {
      lab_tests: [
        { name: 'TSH', code: 'TSH', specimen_type: 'Blood' },
        { name: 'Free T4 (fT4)', code: 'FT4', specimen_type: 'Blood' },
        { name: 'Free T3 (fT3)', code: 'FT3', specimen_type: 'Blood' },
        { name: 'Anti-TPO Antibodies', code: 'ATPO', specimen_type: 'Blood' },
        {
          name: 'Anti-Thyroglobulin Antibodies',
          code: 'ANTITG',
          specimen_type: 'Blood',
        },
        {
          name: 'Thyroid-Stimulating Immunoglobulin (TSI)',
          code: 'TSI',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'Thyroid Ultrasound',
          code: 'THY_USS',
          modality: 'Ultrasound',
          body_part: 'Neck / Thyroid',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'endo-os-pituitary',
    specialty_code: 'ENDOCRINOLOGY',
    set_name: 'Pituitary / Adrenal Workup',
    description: 'Comprehensive pituitary-adrenal axis evaluation',
    clinical_scenario:
      'Suspected pituitary adenoma, hyperprolactinaemia, Cushings, or hypocortisolism',
    orders: {
      lab_tests: [
        { name: 'Prolactin', code: 'PRL', specimen_type: 'Blood' },
        { name: 'ACTH (AM)', code: 'ACTH', specimen_type: 'Blood (fasted AM)' },
        { name: 'Cortisol (AM & PM)', code: 'CORT', specimen_type: 'Blood' },
        { name: 'GH / IGF-1', code: 'GH_IGF1', specimen_type: 'Blood' },
        { name: 'FSH / LH', code: 'FSH_LH', specimen_type: 'Blood' },
        {
          name: 'Urine Free Cortisol (24h)',
          code: 'UFC',
          specimen_type: '24-hour urine',
        },
      ],
      imaging: [
        {
          name: 'MRI Pituitary (with contrast)',
          code: 'MRI_PIT',
          modality: 'MRI',
          body_part: 'Brain / Pituitary',
        },
        {
          name: 'Adrenal CT',
          code: 'CT_ADR',
          modality: 'CT',
          body_part: 'Abdomen / Adrenals',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
