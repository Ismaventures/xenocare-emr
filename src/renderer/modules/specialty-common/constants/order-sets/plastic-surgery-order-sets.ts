import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const PLASTIC_SURGERY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'plastic-os-wound',
    specialty_code: 'PLASTIC_SURGERY',
    set_name: 'Wound Assessment',
    description:
      'Investigation and documentation panel for complex wound requiring plastic surgical management',
    clinical_scenario:
      'Chronic wound, non-healing ulcer, burn, or post-surgical wound breakdown',
    orders: {
      lab_tests: [
        {
          name: 'Wound Swab M&CS',
          code: 'WOUND_MC',
          specimen_type: 'Wound swab',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'HbA1c (Diabetes screen)',
          code: 'HBA1C',
          specimen_type: 'Blood',
        },
        {
          name: 'Albumin (Nutrition status)',
          code: 'ALB',
          specimen_type: 'Blood',
        },
        { name: 'CRP / ESR', code: 'INFLAM', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Wound Photography (Documented)',
          code: 'WOUND_PHOTO',
          modality: 'Photography',
          body_part: 'Wound',
        },
        {
          name: 'X-Ray (if osteomyelitis suspected)',
          code: 'XR_OSTEO',
          modality: 'X-Ray',
          body_part: 'Underlying bone',
        },
        {
          name: 'MRI (if deep-tissue infection)',
          code: 'MRI_SOFT',
          modality: 'MRI',
          body_part: 'Affected region',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'plastic-os-biopsy',
    specialty_code: 'PLASTIC_SURGERY',
    set_name: 'Skin Biopsy / Lesion Removal',
    description:
      'Pre-procedure workup for skin biopsy or plastic surgical lesion excision',
    clinical_scenario:
      'Suspicious skin lesion, keloid, naevus, or soft-tissue mass requiring excision',
    orders: {
      lab_tests: [
        {
          name: 'Skin Biopsy (Punch / Excisional)',
          code: 'SKIN_BX',
          specimen_type: 'Skin / soft-tissue',
        },
        { name: 'Coagulation Screen', code: 'COAG', specimen_type: 'Blood' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Dermoscopy',
          code: 'DERM',
          modality: 'Dermoscopy',
          body_part: 'Skin lesion',
        },
        {
          name: 'Soft-Tissue Ultrasound (if deep component)',
          code: 'USS_ST',
          modality: 'Ultrasound',
          body_part: 'Soft tissue',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
