import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const ENT_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'ent-os-infection',
    specialty_code: 'ENT',
    set_name: 'ENT Infection Panel',
    description: 'Investigation panel for ENT infections',
    clinical_scenario:
      'Acute or recurrent tonsillitis, otitis media, or sinusitis',
    orders: {
      lab_tests: [
        {
          name: 'Throat Swab (M&CS)',
          code: 'THROAT_MC',
          specimen_type: 'Throat swab',
        },
        { name: 'Ear Swab (M&CS)', code: 'EAR_MC', specimen_type: 'Ear swab' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'CRP', code: 'CRP', specimen_type: 'Blood' },
        { name: 'ESR', code: 'ESR', specimen_type: 'Blood' },
      ],
      imaging: [],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'ent-os-hearing',
    specialty_code: 'ENT',
    set_name: 'Hearing Assessment',
    description: 'Audiological assessment panel',
    clinical_scenario: 'Hearing loss, tinnitus, or ear fullness',
    orders: {
      lab_tests: [],
      imaging: [
        {
          name: 'Pure Tone Audiometry',
          code: 'PTA',
          modality: 'Audiometry',
          body_part: 'Ear',
        },
        {
          name: 'Tympanometry',
          code: 'TYMP',
          modality: 'Tympanometry',
          body_part: 'Ear',
        },
        {
          name: 'CT Temporal Bones',
          code: 'CT_TEMP',
          modality: 'CT',
          body_part: 'Temporal Bones',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'ent-os-sinus',
    specialty_code: 'ENT',
    set_name: 'Sinus / Nasal Workup',
    description:
      'Investigation panel for chronic rhinosinusitis or nasal polyps',
    clinical_scenario:
      'Chronic nasal congestion, facial pressure, or nasal polyps on examination',
    orders: {
      lab_tests: [
        {
          name: 'Nasal Swab M&CS',
          code: 'NASAL_MC',
          specimen_type: 'Nasal swab',
        },
        {
          name: 'Full Blood Count + Eosinophils',
          code: 'FBC_EOS',
          specimen_type: 'Blood',
        },
        {
          name: 'Total IgE / RAST Panel',
          code: 'ALLERGY',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'CT Sinuses (Coronal)',
          code: 'CT_SIN',
          modality: 'CT',
          body_part: 'Sinuses',
        },
        {
          name: 'Nasal Endoscopy',
          code: 'NASAL_END',
          modality: 'Endoscopy',
          body_part: 'Nasal cavity',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
