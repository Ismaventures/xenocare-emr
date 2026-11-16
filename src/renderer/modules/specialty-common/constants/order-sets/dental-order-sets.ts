import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const DENTAL_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'dental-os-periapical-infection',
    specialty_code: 'DENTAL',
    set_name: 'Periapical Infection / Abscess',
    description:
      'Investigation panel for dental abscess or periapical infection',
    clinical_scenario:
      'Toothache, facial swelling, or draining sinus suggesting dental infection',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'CRP', code: 'CRP', specimen_type: 'Blood' },
        {
          name: 'Pus / Swab M&CS',
          code: 'PUS_MC',
          specimen_type: 'Pus / swab',
        },
      ],
      imaging: [
        {
          name: 'Periapical X-Ray (Affected Tooth)',
          code: 'PA_XRAY',
          modality: 'X-Ray',
          body_part: 'Periapical',
        },
        {
          name: 'OPG (Orthopantomogram)',
          code: 'OPG',
          modality: 'X-Ray (Panoramic)',
          body_part: 'Full dentition',
        },
        {
          name: 'CT Soft Tissue Neck (if spread suspected)',
          code: 'CT_NECK',
          modality: 'CT',
          body_part: 'Neck / face',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'dental-os-treatment-plan',
    specialty_code: 'DENTAL',
    set_name: 'Comprehensive Dental Treatment Planning',
    description:
      'Full dental assessment and baseline imaging for treatment planning',
    clinical_scenario:
      'New patient or patient requiring full oral rehabilitation',
    orders: {
      lab_tests: [],
      imaging: [
        {
          name: 'OPG (Orthopantomogram)',
          code: 'OPG',
          modality: 'X-Ray (Panoramic)',
          body_part: 'Full dentition / jaws',
        },
        {
          name: 'Bitewing X-Rays (Posterior)',
          code: 'BW_XR',
          modality: 'X-Ray',
          body_part: 'Posterior teeth (bitewing)',
        },
        {
          name: 'CBCT (if implant planning or complex anatomy)',
          code: 'CBCT',
          modality: 'CBCT',
          body_part: 'Jaw / Alveolus',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
