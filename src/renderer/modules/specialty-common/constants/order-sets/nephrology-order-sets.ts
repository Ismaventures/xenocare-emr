import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const NEPHROLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'neph-os-renal-workup',
    specialty_code: 'NEPHROLOGY',
    set_name: 'Renal Workup',
    description:
      'Initial investigation panel for new or suspected renal disease',
    clinical_scenario:
      'Elevated creatinine, proteinuria, haematuria, or hypertension',
    orders: {
      lab_tests: [
        {
          name: 'Urea & Electrolytes (U&E)',
          code: 'UE',
          specimen_type: 'Blood',
        },
        { name: 'eGFR / Creatinine', code: 'EGFR', specimen_type: 'Blood' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Urinalysis (Dipstick + Microscopy)',
          code: 'URIN_MICRO',
          specimen_type: 'Urine (midstream)',
        },
        {
          name: 'Urine ACR (Albumin-Creatinine Ratio)',
          code: 'UACR',
          specimen_type: 'Urine (spot)',
        },
        {
          name: '24-Hour Urine Protein',
          code: '24H_PROT',
          specimen_type: '24-hour urine',
        },
        {
          name: 'Urine PCR (Protein-Creatinine Ratio)',
          code: 'UPCR',
          specimen_type: 'Urine (spot)',
        },
        { name: 'Complement (C3, C4)', code: 'COMP', specimen_type: 'Blood' },
        {
          name: 'ANA / ANCA Screen',
          code: 'VASCULITIS',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'Renal Ultrasound',
          code: 'RENAL_USS',
          modality: 'Ultrasound',
          body_part: 'Kidneys / Bladder',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'neph-os-ckd-monitoring',
    specialty_code: 'NEPHROLOGY',
    set_name: 'CKD Monitoring Panel',
    description: 'Routine monitoring panel for established CKD',
    clinical_scenario: 'Established CKD — quarterly or 6-monthly review',
    orders: {
      lab_tests: [
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        {
          name: 'Calcium & Phosphate',
          code: 'CA_PHOS',
          specimen_type: 'Blood',
        },
        {
          name: 'PTH (Parathyroid Hormone)',
          code: 'PTH',
          specimen_type: 'Blood',
        },
        { name: 'Albumin', code: 'ALB', specimen_type: 'Blood' },
        {
          name: 'Bicarbonate / Arterial Blood Gas',
          code: 'ABG',
          specimen_type: 'Blood',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'HbA1c (if diabetic)', code: 'HBA1C', specimen_type: 'Blood' },
        { name: 'Urine ACR', code: 'UACR', specimen_type: 'Urine' },
      ],
      imaging: [],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'neph-os-dialysis-pre-assessment',
    specialty_code: 'NEPHROLOGY',
    set_name: 'Dialysis Pre-Assessment',
    description:
      'Pre-initiation dialysis workup for patients approaching end-stage renal disease',
    clinical_scenario:
      'CKD G4-G5, eGFR <15 mL/min, preparing for renal replacement therapy',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        { name: 'LFTs', code: 'LFT', specimen_type: 'Blood' },
        { name: 'Coagulation Screen', code: 'COAG', specimen_type: 'Blood' },
        { name: 'Blood Group & Screen', code: 'GS', specimen_type: 'Blood' },
        {
          name: 'Hepatitis B Sag / Anti-HCV / HIV Screen',
          code: 'INFECT_SCREEN',
          specimen_type: 'Blood',
        },
        {
          name: 'Calcium, Phosphate, PTH',
          code: 'BONE_MIN',
          specimen_type: 'Blood',
        },
        {
          name: 'Ferritin / Iron Studies',
          code: 'IRON',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'Chest X-Ray',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        { name: 'ECG', code: 'ECG', modality: 'ECG', body_part: 'Chest' },
        {
          name: 'Echocardiogram',
          code: 'ECHO',
          modality: 'Ultrasound',
          body_part: 'Heart',
        },
        {
          name: 'Renal / Bladder Ultrasound',
          code: 'RENAL_USS',
          modality: 'Ultrasound',
          body_part: 'Renal tract',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
