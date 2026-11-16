import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const PULMONOLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'pulm-os-copd',
    specialty_code: 'PULMONOLOGY',
    set_name: 'COPD Workup',
    description:
      'Comprehensive investigation panel for COPD diagnosis and staging',
    clinical_scenario:
      'Chronic productive cough, dyspnoea, barrel chest, or heavy smoking history',
    orders: {
      lab_tests: [
        {
          name: 'Full Blood Count (Polycythaemia)',
          code: 'FBC',
          specimen_type: 'Blood',
        },
        {
          name: 'Arterial Blood Gas',
          code: 'ABG',
          specimen_type: 'Arterial blood',
        },
        {
          name: 'Alpha-1 Antitrypsin Level',
          code: 'A1AT',
          specimen_type: 'Blood',
        },
        { name: 'Sputum M&CS', code: 'SPUTUM_MC', specimen_type: 'Sputum' },
      ],
      imaging: [
        {
          name: 'Spirometry (Pre & Post bronchodilator)',
          code: 'SPIROM',
          modality: 'Spirometry',
          body_part: 'Lungs',
        },
        {
          name: 'Chest X-Ray (PA)',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        {
          name: 'HRCT Chest',
          code: 'HRCT',
          modality: 'CT',
          body_part: 'Chest (HRCT)',
        },
        { name: 'ECG', code: 'ECG', modality: 'ECG', body_part: 'Chest' },
        {
          name: 'Echocardiogram (Pulmonary HTN screen)',
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
    id: 'pulm-os-asthma',
    specialty_code: 'PULMONOLOGY',
    set_name: 'Asthma Assessment',
    description:
      'Investigation panel for asthma diagnosis or severity assessment',
    clinical_scenario:
      'Episodic wheeze, cough, dyspnoea, or known asthma — uncontrolled',
    orders: {
      lab_tests: [
        {
          name: 'Full Blood Count + Eosinophils',
          code: 'FBC_EOS',
          specimen_type: 'Blood',
        },
        { name: 'Total IgE', code: 'IGE', specimen_type: 'Blood' },
        {
          name: 'Allergen Specific IgE / RAST',
          code: 'RAST',
          specimen_type: 'Blood',
        },
        {
          name: 'FeNO (Fractional Exhaled NO)',
          code: 'FENO',
          specimen_type: 'Exhaled air',
        },
      ],
      imaging: [
        {
          name: 'Spirometry + Bronchodilator Reversibility',
          code: 'SPIROM',
          modality: 'Spirometry',
          body_part: 'Lungs',
        },
        {
          name: 'Peak Flow Diary (Serial)',
          code: 'PEF_DIARY',
          modality: 'Peak Flow',
          body_part: 'Lungs',
        },
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
  {
    id: 'pulm-os-lung-mass',
    specialty_code: 'PULMONOLOGY',
    set_name: 'Lung Mass Workup',
    description:
      'Investigation panel for suspected lung cancer or incidental lung mass',
    clinical_scenario:
      'Haemoptysis, weight loss, incidental lung nodule/mass on X-Ray, or persistent cough',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'CEA / NSE / CYFRA 21-1 (Tumour Markers)',
          code: 'LUNG_MARKERS',
          specimen_type: 'Blood',
        },
        {
          name: 'LFTs (Liver metastases)',
          code: 'LFT',
          specimen_type: 'Blood',
        },
        { name: 'Calcium', code: 'CA', specimen_type: 'Blood' },
        {
          name: 'Sputum Cytology (×3 early morning)',
          code: 'SPUT_CYTO',
          specimen_type: 'Sputum',
        },
      ],
      imaging: [
        {
          name: 'CT Chest (with contrast)',
          code: 'CT_CHEST',
          modality: 'CT',
          body_part: 'Chest',
        },
        {
          name: 'PET-CT (Staging)',
          code: 'PET_CT',
          modality: 'Nuclear Medicine',
          body_part: 'Whole body',
        },
        {
          name: 'Bronchoscopy + BAL / Biopsy',
          code: 'BRONCH',
          modality: 'Endoscopy',
          body_part: 'Bronchi',
        },
        {
          name: 'CT-guided Biopsy (if peripheral mass)',
          code: 'CT_BX',
          modality: 'CT',
          body_part: 'Lung',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'pulm-os-tb',
    specialty_code: 'PULMONOLOGY',
    set_name: 'TB Workup',
    description: 'Investigation panel for suspected pulmonary tuberculosis',
    clinical_scenario:
      'Chronic cough (>3 weeks), night sweats, haemoptysis, weight loss, or TB contact',
    orders: {
      lab_tests: [
        {
          name: 'Sputum AFB Smear (×3: Spot-Morning-Spot)',
          code: 'AFB',
          specimen_type: 'Sputum',
        },
        {
          name: 'Sputum Xpert MTB/RIF (GeneXpert)',
          code: 'GENEXPERT',
          specimen_type: 'Sputum',
        },
        {
          name: 'Sputum Culture (Mycobacterial)',
          code: 'MYCOB_C',
          specimen_type: 'Sputum',
        },
        { name: 'HIV Test', code: 'HIV', specimen_type: 'Blood' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'LFTs (Baseline before ATT)',
          code: 'LFT',
          specimen_type: 'Blood',
        },
      ],
      imaging: [
        {
          name: 'Chest X-Ray (PA)',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        {
          name: 'CT Chest (if CXR equivocal)',
          code: 'CT_CHEST',
          modality: 'CT',
          body_part: 'Chest',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
