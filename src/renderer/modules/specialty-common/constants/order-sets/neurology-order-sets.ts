import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const NEUROLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'neuro-os-stroke',
    specialty_code: 'NEUROLOGY',
    set_name: 'Acute Stroke / TIA Protocol',
    description:
      'Emergency investigation panel for suspected acute stroke or TIA',
    clinical_scenario:
      'Sudden onset focal neurological deficit, facial droop, limb weakness, speech difficulty',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Random Blood Glucose', code: 'RBG', specimen_type: 'Blood' },
        {
          name: 'Coagulation Screen (PT/INR, APTT)',
          code: 'COAG',
          specimen_type: 'Blood',
        },
        { name: 'Lipid Panel', code: 'LIPID', specimen_type: 'Blood' },
        { name: 'ECG', code: 'ECG_LAB', specimen_type: 'Blood' },
        { name: 'Troponin', code: 'TROP', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'CT Brain (Non-Contrast)',
          code: 'CT_BRAIN',
          modality: 'CT',
          body_part: 'Brain',
        },
        {
          name: 'CT Angiography (Head & Neck)',
          code: 'CTA_HN',
          modality: 'CT',
          body_part: 'Head and Neck',
        },
        {
          name: 'MRI Brain (DWI)',
          code: 'MRI_BRAIN_DWI',
          modality: 'MRI',
          body_part: 'Brain',
        },
        {
          name: 'Carotid Duplex Ultrasound',
          code: 'CAROT_USS',
          modality: 'Ultrasound',
          body_part: 'Carotid arteries',
        },
        {
          name: 'Echocardiogram',
          code: 'ECHO',
          modality: 'Ultrasound',
          body_part: 'Heart',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'neuro-os-seizure',
    specialty_code: 'NEUROLOGY',
    set_name: 'New Seizure Workup',
    description: 'Investigation panel for a new seizure or seizure disorder',
    clinical_scenario:
      'First presentation seizure, prolonged seizure, or sub-therapeutic anticonvulsant',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Calcium & Magnesium', code: 'CA_MG', specimen_type: 'Blood' },
        { name: 'Random Blood Glucose', code: 'RBG', specimen_type: 'Blood' },
        { name: 'LFTs', code: 'LFT', specimen_type: 'Blood' },
        {
          name: 'Anticonvulsant Drug Level (if applicable)',
          code: 'AED_LVL',
          specimen_type: 'Blood',
        },
        {
          name: 'Prolactin (post-ictal, within 60 min)',
          code: 'PRL_ICTAL',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'EEG',
          code: 'EEG',
          modality: 'Neurophysiology',
          body_part: 'Brain',
        },
        {
          name: 'MRI Brain (with contrast)',
          code: 'MRI_BRAIN',
          modality: 'MRI',
          body_part: 'Brain',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'neuro-os-headache',
    specialty_code: 'NEUROLOGY',
    set_name: 'Headache Workup',
    description: 'Investigation panel for new or worrying headache',
    clinical_scenario:
      '"Worst headache of life", new onset, progressive or associated neurological signs',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'ESR / CRP (Giant Cell Arteritis)',
          code: 'GCA_SCREEN',
          specimen_type: 'Blood',
        },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'CT Brain (Non-Contrast)',
          code: 'CT_BRAIN',
          modality: 'CT',
          body_part: 'Brain',
        },
        {
          name: 'MRI Brain (with contrast)',
          code: 'MRI_BRAIN',
          modality: 'MRI',
          body_part: 'Brain',
        },
        {
          name: 'Lumbar Puncture (if SAH suspected post-CT)',
          code: 'LP',
          modality: 'Procedure',
          body_part: 'Lumbar spine',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'neuro-os-neuropathy',
    specialty_code: 'NEUROLOGY',
    set_name: 'Peripheral Neuropathy Workup',
    description: 'Investigation panel for suspected peripheral neuropathy',
    clinical_scenario:
      'Distal numbness, tingling, weakness, or absent ankle reflexes',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Fasting Blood Glucose + HbA1c',
          code: 'DIAB_SCREEN',
          specimen_type: 'Blood',
        },
        { name: 'TSH', code: 'TSH', specimen_type: 'Blood' },
        {
          name: 'Vitamin B12 & Folate',
          code: 'B12_FOL',
          specimen_type: 'Blood',
        },
        {
          name: 'Urea & Electrolytes + eGFR',
          code: 'UE_EGFR',
          specimen_type: 'Blood',
        },
        {
          name: 'Serum Protein Electrophoresis',
          code: 'SPEP',
          specimen_type: 'Blood',
        },
        {
          name: 'ANA / ANCA (Vasculitis screen)',
          code: 'VASCULITIS',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'Nerve Conduction Study (NCS) / EMG',
          code: 'NCS_EMG',
          modality: 'Neurophysiology',
          body_part: 'Upper/Lower limbs',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
