import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const NEUROSURGERY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'nsurg-os-head-injury',
    specialty_code: 'NEUROSURGERY',
    set_name: 'Emergency Head Injury Protocol',
    description: 'Emergency investigation panel for traumatic head injury',
    clinical_scenario:
      'Head trauma, loss of consciousness, GCS < 15, or focal neurological deficit',
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
        {
          name: 'Arterial Blood Gas',
          code: 'ABG',
          specimen_type: 'Arterial blood',
        },
      ],
      imaging: [
        {
          name: 'CT Brain (Non-Contrast)',
          code: 'CT_BRAIN',
          modality: 'CT',
          body_part: 'Brain',
        },
        {
          name: 'CT Cervical Spine',
          code: 'CT_CSPINE',
          modality: 'CT',
          body_part: 'Cervical spine',
        },
        {
          name: 'Whole Body CT (Trauma)',
          code: 'CT_TRAUMA',
          modality: 'CT',
          body_part: 'Head, neck, chest, abdomen, pelvis',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },
  {
    id: 'nsurg-os-spinal',
    specialty_code: 'NEUROSURGERY',
    set_name: 'Spinal Assessment',
    description:
      'Investigation panel for spinal pathology requiring surgical evaluation',
    clinical_scenario:
      'Radiculopathy, myelopathy, cord compression, or spinal injury',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Calcium', code: 'CA', specimen_type: 'Blood' },
        {
          name: 'PSA (if metastatic disease suspected)',
          code: 'PSA',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'MRI Spine (C/T/L as appropriate)',
          code: 'MRI_SPINE',
          modality: 'MRI',
          body_part: 'Spine',
        },
        {
          name: 'CT Spine',
          code: 'CT_SPINE',
          modality: 'CT',
          body_part: 'Spine',
        },
        {
          name: 'X-Ray Spine (AP & Lateral)',
          code: 'XR_SPINE',
          modality: 'X-Ray',
          body_part: 'Spine',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'nsurg-os-brain-tumour',
    specialty_code: 'NEUROSURGERY',
    set_name: 'Brain Tumour Workup',
    description: 'Investigation panel for suspected intracranial mass lesion',
    clinical_scenario:
      'Headaches, seizures, focal deficit, or incidental brain lesion on imaging',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'LFTs', code: 'LFT', specimen_type: 'Blood' },
        {
          name: 'Blood Tumour Markers (CEA, AFP, Beta-hCG)',
          code: 'TUMOUR_MRK',
          specimen_type: 'Blood',
        },
        {
          name: 'Chest X-Ray / CT Chest (Metastasis screen)',
          code: 'MET_SCREEN',
          specimen_type: 'N/A',
        },
      ],
      imaging: [
        {
          name: 'MRI Brain (with / without contrast)',
          code: 'MRI_BRAIN',
          modality: 'MRI',
          body_part: 'Brain',
        },
        {
          name: 'CT Brain (Non-Contrast)',
          code: 'CT_BRAIN',
          modality: 'CT',
          body_part: 'Brain',
        },
        {
          name: 'PET Scan (staging)',
          code: 'PET_SCAN',
          modality: 'Nuclear Medicine',
          body_part: 'Whole body',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
