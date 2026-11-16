import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const GENERAL_SURGERY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'surg-os-preop',
    specialty_code: 'GENERAL_SURGERY',
    set_name: 'Surgical Pre-Operative Assessment',
    description:
      'Mandatory pre-operative investigation panel for elective surgery',
    clinical_scenario:
      'Patient scheduled for elective general surgical procedure',
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
        { name: 'Urinalysis', code: 'URIN', specimen_type: 'Urine' },
        { name: 'Random Blood Glucose', code: 'RBG', specimen_type: 'Blood' },
        { name: 'LFTs', code: 'LFT', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (if age ≥40 or cardiac risk)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
        {
          name: 'Chest X-Ray (if indicated)',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'surg-os-acute-abdomen',
    specialty_code: 'GENERAL_SURGERY',
    set_name: 'Acute Abdomen Panel',
    description:
      'Emergency investigation panel for acute abdominal presentation',
    clinical_scenario:
      'Acute abdominal pain, peritonism, or suspected surgical emergency',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Liver Function Tests', code: 'LFT', specimen_type: 'Blood' },
        { name: 'Serum Amylase', code: 'AMYL', specimen_type: 'Blood' },
        { name: 'CRP', code: 'CRP', specimen_type: 'Blood' },
        { name: 'Urinalysis + M&CS', code: 'URIN_MC', specimen_type: 'Urine' },
        { name: 'Group & Screen', code: 'GS', specimen_type: 'Blood' },
        { name: 'Coagulation Screen', code: 'COAG', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Abdominal X-Ray (Erect + Supine)',
          code: 'AXR',
          modality: 'X-Ray',
          body_part: 'Abdomen',
        },
        {
          name: 'Abdominal Ultrasound',
          code: 'USS_ABD',
          modality: 'Ultrasound',
          body_part: 'Abdomen',
        },
        {
          name: 'CT Abdomen & Pelvis (with contrast)',
          code: 'CT_ABD',
          modality: 'CT',
          body_part: 'Abdomen and Pelvis',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
