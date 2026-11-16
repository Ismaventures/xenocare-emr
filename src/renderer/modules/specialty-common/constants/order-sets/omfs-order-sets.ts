import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const OMFS_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'omfs-os-jaw-imaging',
    specialty_code: 'ORAL_AND_MAXILLOFACIAL_SURGERY',
    set_name: 'Jaw & Facial Imaging',
    description:
      'Radiological imaging panel for jaw, facial bones, and dentoalveolar pathology',
    clinical_scenario:
      'Jaw swelling, suspected fracture, or pre-surgical assessment',
    orders: {
      lab_tests: [],
      imaging: [
        {
          name: 'OPG (Orthopantomogram)',
          code: 'OPG',
          modality: 'X-Ray (Panoramic)',
          body_part: 'Jaw / Teeth',
        },
        {
          name: 'CBCT (Cone Beam CT) — Maxillofacial',
          code: 'CBCT_MF',
          modality: 'CBCT',
          body_part: 'Maxillofacial',
        },
        {
          name: 'CT Face (Axial + Coronal)',
          code: 'CT_FACE',
          modality: 'CT',
          body_part: 'Face / Mandible / Maxilla',
        },
        {
          name: 'Periapical X-Ray',
          code: 'PA_XRAY',
          modality: 'X-Ray',
          body_part: 'Tooth / Alveolus',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'omfs-os-surgical-preop',
    specialty_code: 'ORAL_AND_MAXILLOFACIAL_SURGERY',
    set_name: 'OMFS Surgical Pre-Operative Assessment',
    description:
      'Pre-operative workup for oral and maxillofacial surgical procedures',
    clinical_scenario:
      'Patient scheduled for mandibular osteotomy, tumour resection, or major jaw surgery',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        {
          name: 'Coagulation Screen (PT/INR, APTT)',
          code: 'COAG',
          specimen_type: 'Blood',
        },
        { name: 'Group & Screen', code: 'GS', specimen_type: 'Blood' },
        { name: 'Random Blood Glucose', code: 'RBG', specimen_type: 'Blood' },
      ],
      imaging: [
        { name: 'OPG', code: 'OPG', modality: 'X-Ray', body_part: 'Jaw' },
        {
          name: 'Chest X-Ray',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        { name: 'ECG', code: 'ECG', modality: 'ECG', body_part: 'Chest' },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
