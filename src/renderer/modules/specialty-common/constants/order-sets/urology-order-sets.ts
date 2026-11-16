import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const UROLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'urol-os-prostate',
    specialty_code: 'UROLOGY',
    set_name: 'Prostate Assessment',
    description:
      'Investigation panel for lower urinary tract symptoms or suspected prostate disease',
    clinical_scenario:
      'LUTS (frequency, hesitancy, nocturia), elevated PSA, or suspected prostate cancer',
    orders: {
      lab_tests: [
        { name: 'PSA (Total + Free PSA)', code: 'PSA', specimen_type: 'Blood' },
        {
          name: 'Urinalysis + M&CS',
          code: 'URIN_MC',
          specimen_type: 'Urine (midstream)',
        },
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Prostate Ultrasound (TRUS)',
          code: 'TRUS',
          modality: 'Ultrasound',
          body_part: 'Prostate (transrectal)',
        },
        {
          name: 'MP-MRI Prostate',
          code: 'MPMRI_PROST',
          modality: 'MRI',
          body_part: 'Prostate',
        },
        {
          name: 'Prostate Biopsy (Systematic / Targeted)',
          code: 'PROST_BX',
          modality: 'Biopsy',
          body_part: 'Prostate',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'urol-os-stone',
    specialty_code: 'UROLOGY',
    set_name: 'Renal / Ureteric Stone Workup',
    description: 'Investigation panel for renal colic or urolithiasis',
    clinical_scenario:
      'Acute loin-to-groin pain, haematuria, or renal stone found incidentally',
    orders: {
      lab_tests: [
        {
          name: 'Urinalysis (Haematuria + pH)',
          code: 'URIN',
          specimen_type: 'Urine',
        },
        {
          name: 'Urine M&CS',
          code: 'URIN_MC',
          specimen_type: 'Urine (midstream)',
        },
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        {
          name: 'Calcium + Uric Acid + Oxalate',
          code: 'STONE_MET',
          specimen_type: 'Blood',
        },
        {
          name: '24-Hour Urine (Stone Risk Profile)',
          code: '24H_STONE',
          specimen_type: '24-hour urine',
        },
        {
          name: 'Stone Analysis (if passed)',
          code: 'STONE_ANAL',
          specimen_type: 'Passed stone',
        },
      ],
      imaging: [
        {
          name: 'CT KUB (Low-Dose, Non-Contrast)',
          code: 'CT_KUB',
          modality: 'CT',
          body_part: 'Kidney, Ureter, Bladder',
        },
        {
          name: 'Renal Ultrasound',
          code: 'RENAL_USS',
          modality: 'Ultrasound',
          body_part: 'Kidneys',
        },
        {
          name: 'X-Ray KUB',
          code: 'XR_KUB',
          modality: 'X-Ray',
          body_part: 'Kidney, Ureter, Bladder',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'urol-os-haematuria',
    specialty_code: 'UROLOGY',
    set_name: 'Haematuria Workup',
    description: 'Investigation panel for visible or non-visible haematuria',
    clinical_scenario:
      'Visible haematuria (frank blood in urine) or persistent non-visible haematuria',
    orders: {
      lab_tests: [
        {
          name: 'Urine M&CS + Cytology (×3)',
          code: 'URIN_CYTO',
          specimen_type: 'Urine (midstream)',
        },
        { name: 'PSA (Male, age >50)', code: 'PSA', specimen_type: 'Blood' },
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        {
          name: 'Full Blood Count + Coagulation',
          code: 'FBC_COAG',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'CT Urogram (Upper tract)',
          code: 'CTU',
          modality: 'CT',
          body_part: 'Kidneys, Ureter, Bladder',
        },
        {
          name: 'Flexible Cystoscopy (Lower tract)',
          code: 'CYSTO',
          modality: 'Endoscopy',
          body_part: 'Bladder / Urethra',
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
