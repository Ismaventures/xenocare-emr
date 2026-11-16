import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const ORTHOPAEDICS_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'ortho-os-fracture',
    specialty_code: 'ORTHOPAEDICS',
    set_name: 'Acute Fracture Assessment',
    description:
      'Standard investigation panel for suspected or confirmed fracture',
    clinical_scenario:
      'Trauma, fall, acute limb deformity, or high-impact mechanism',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Group & Screen', code: 'GS', specimen_type: 'Blood' },
        { name: 'Coagulation Screen', code: 'COAG', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'X-Ray (AP + Lateral) — Affected Limb',
          code: 'XR_LIMB',
          modality: 'X-Ray',
          body_part: 'Affected limb',
        },
        {
          name: 'CT (if complex fracture, e.g., pelvis / calcaneum)',
          code: 'CT_FRAC',
          modality: 'CT',
          body_part: 'Affected region',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'ortho-os-joint',
    specialty_code: 'ORTHOPAEDICS',
    set_name: 'Joint Assessment',
    description:
      'Investigation panel for joint pain, swelling, or suspected arthropathy',
    clinical_scenario:
      'Knee, hip, shoulder or other joint pain — possible OA, RA, or septic arthritis',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'ESR / CRP', code: 'INFLAM', specimen_type: 'Blood' },
        { name: 'Uric Acid (Gout)', code: 'URIC', specimen_type: 'Blood' },
        {
          name: 'Rheumatoid Factor / Anti-CCP',
          code: 'RF_ACCP',
          specimen_type: 'Blood',
        },
        {
          name: 'Joint Aspiration (M&CS + Crystal Analysis)',
          code: 'JOINT_ASP',
          specimen_type: 'Synovial fluid',
        },
      ],
      imaging: [
        {
          name: 'X-Ray Joint (AP + Lateral)',
          code: 'XR_JOINT',
          modality: 'X-Ray',
          body_part: 'Affected joint',
        },
        {
          name: 'Joint Ultrasound (Effusion / Bursae)',
          code: 'USS_JOINT',
          modality: 'Ultrasound',
          body_part: 'Affected joint',
        },
        {
          name: 'MRI Joint (if soft-tissue / ligament concern)',
          code: 'MRI_JOINT',
          modality: 'MRI',
          body_part: 'Affected joint',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'ortho-os-preop',
    specialty_code: 'ORTHOPAEDICS',
    set_name: 'Orthopaedic Pre-Operative Assessment',
    description:
      'Standard elective pre-operative panel for orthopaedic surgery',
    clinical_scenario:
      'Elective joint replacement, arthroscopy, or spinal surgery',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Coagulation Screen', code: 'COAG', specimen_type: 'Blood' },
        { name: 'Group & Screen', code: 'GS', specimen_type: 'Blood' },
        { name: 'Random Blood Glucose', code: 'RBG', specimen_type: 'Blood' },
        { name: 'Urinalysis', code: 'URIN', specimen_type: 'Urine' },
      ],
      imaging: [
        {
          name: 'X-Ray (Affected Area)',
          code: 'XR',
          modality: 'X-Ray',
          body_part: 'Affected area',
        },
        { name: 'ECG', code: 'ECG', modality: 'ECG', body_part: 'Chest' },
        {
          name: 'Chest X-Ray',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
