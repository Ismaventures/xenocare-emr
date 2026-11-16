import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const DERMATOLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'derm-os-biopsy',
    specialty_code: 'DERMATOLOGY',
    set_name: 'Dermatology Biopsy Workup',
    description:
      'Investigation panel for suspicious skin lesion requiring histological diagnosis',
    clinical_scenario:
      'Suspicious lesion, non-healing ulcer, or new pigmented lesion',
    orders: {
      lab_tests: [
        {
          name: 'Skin Biopsy (Punch / Excisional / Shave)',
          code: 'SKIN_BX',
          specimen_type: 'Skin tissue',
        },
        {
          name: 'KOH Preparation (Fungal Scraping)',
          code: 'KOH',
          specimen_type: 'Skin scraping',
        },
        { name: 'Wound Swab M&CS', code: 'WSWAB', specimen_type: 'Skin swab' },
      ],
      imaging: [],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'derm-os-fungal',
    specialty_code: 'DERMATOLOGY',
    set_name: 'Fungal Infection Workup',
    description: 'Standard panel for suspected tinea or other dermatophytosis',
    clinical_scenario: 'Pruritic scaling rash, tinea corporis/pedis/unguium',
    orders: {
      lab_tests: [
        {
          name: 'KOH Preparation',
          code: 'KOH',
          specimen_type: 'Skin scraping',
        },
        {
          name: 'Fungal Culture',
          code: 'FUNG_C',
          specimen_type: 'Skin scraping / nail',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
      ],
      imaging: [],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'derm-os-autoimmune',
    specialty_code: 'DERMATOLOGY',
    set_name: 'Autoimmune / Inflammatory Skin Screen',
    description:
      'Panel for suspected autoimmune skin conditions (SLE, pemphigus, vasculitis)',
    clinical_scenario:
      'Photosensitive rash, bullous lesions, or systemic skin involvement',
    orders: {
      lab_tests: [
        { name: 'ANA / ANCA Screen', code: 'ANA', specimen_type: 'Blood' },
        {
          name: 'Anti-dsDNA Antibodies',
          code: 'DSDNA',
          specimen_type: 'Blood',
        },
        { name: 'Complement (C3, C4)', code: 'COMP', specimen_type: 'Blood' },
        {
          name: 'Full Blood Count + Differential',
          code: 'FBC',
          specimen_type: 'Blood',
        },
        { name: 'ESR', code: 'ESR', specimen_type: 'Blood' },
        { name: 'CRP', code: 'CRP', specimen_type: 'Blood' },
        { name: 'Urinalysis', code: 'URIN', specimen_type: 'Urine' },
        {
          name: 'Skin Biopsy (Direct Immunofluorescence)',
          code: 'SKIN_DIF',
          specimen_type: 'Skin tissue',
        },
      ],
      imaging: [],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
