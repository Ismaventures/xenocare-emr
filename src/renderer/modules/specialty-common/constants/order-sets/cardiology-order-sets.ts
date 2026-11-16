/**
 * =============================================================================
 * CARDIOLOGY ORDER SETS
 * =============================================================================
 * Pre-bundled investigation panels for common cardiology clinical scenarios.
 * These are "system" defaults shipped with the EMR. Facilities can supplement
 * with their own DB-stored order sets.
 * =============================================================================
 */

import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const CARDIOLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  {
    id: 'cardio-os-chest-pain',
    specialty_code: 'CARDIOLOGY',
    set_name: 'Chest Pain Workup',
    description: 'Initial investigation panel for new-onset chest pain',
    clinical_scenario: 'Patient presents with acute or subacute chest pain',
    orders: {
      lab_tests: [
        { name: 'Troponin I', code: 'TROP', specimen_type: 'Blood' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Lipid Panel (Total Cholesterol, LDL, HDL, Triglycerides)',
          code: 'LIPID',
          specimen_type: 'Blood',
        },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Random Blood Sugar', code: 'RBS', specimen_type: 'Blood' },
        { name: 'D-Dimer', code: 'DDIM', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (12-Lead)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
        {
          name: 'Chest X-Ray (PA)',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        {
          name: 'Echocardiogram (TTE)',
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
    id: 'cardio-os-heart-failure',
    specialty_code: 'CARDIOLOGY',
    set_name: 'Heart Failure Workup',
    description: 'Investigation panel for suspected or known heart failure',
    clinical_scenario:
      'Patient with dyspnoea, orthopnoea, bilateral pedal oedema',
    orders: {
      lab_tests: [
        { name: 'BNP / NT-proBNP', code: 'BNP', specimen_type: 'Blood' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Liver Function Tests', code: 'LFT', specimen_type: 'Blood' },
        {
          name: 'Thyroid Function (TSH, fT4)',
          code: 'TFT',
          specimen_type: 'Blood',
        },
        { name: 'HbA1c', code: 'HBA1C', specimen_type: 'Blood' },
        { name: 'Iron Studies', code: 'IRON', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (12-Lead)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
        {
          name: 'Chest X-Ray (PA)',
          code: 'CXR',
          modality: 'X-Ray',
          body_part: 'Chest',
        },
        {
          name: 'Echocardiogram (TTE)',
          code: 'ECHO',
          modality: 'Ultrasound',
          body_part: 'Heart',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'cardio-os-af',
    specialty_code: 'CARDIOLOGY',
    set_name: 'Atrial Fibrillation Assessment',
    description:
      'Investigation panel for new AF or AF with rapid ventricular response',
    clinical_scenario:
      'Patient with irregular pulse, palpitations, or incidental AF on ECG',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        {
          name: 'Thyroid Function (TSH, fT4)',
          code: 'TFT',
          specimen_type: 'Blood',
        },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        {
          name: 'Coagulation Screen (PT, INR, APTT)',
          code: 'COAG',
          specimen_type: 'Blood',
        },
        { name: 'Liver Function Tests', code: 'LFT', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (12-Lead)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
        {
          name: 'Echocardiogram (TTE)',
          code: 'ECHO',
          modality: 'Ultrasound',
          body_part: 'Heart',
        },
        {
          name: '24h Holter Monitor',
          code: 'HOLTER',
          modality: 'ECG',
          body_part: 'Chest',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'cardio-os-hypertension',
    specialty_code: 'CARDIOLOGY',
    set_name: 'Hypertension Evaluation',
    description: 'Target organ damage screen + secondary cause exclusion',
    clinical_scenario:
      'New or resistant hypertension, end-organ damage assessment',
    orders: {
      lab_tests: [
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'eGFR / Creatinine', code: 'EGFR', specimen_type: 'Blood' },
        { name: 'Lipid Panel', code: 'LIPID', specimen_type: 'Blood' },
        { name: 'HbA1c', code: 'HBA1C', specimen_type: 'Blood' },
        { name: 'Urinalysis + ACR', code: 'UACR', specimen_type: 'Urine' },
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Uric Acid', code: 'URIC', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (12-Lead)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
        {
          name: 'Echocardiogram (TTE)',
          code: 'ECHO',
          modality: 'Ultrasound',
          body_part: 'Heart',
        },
        {
          name: 'Renal Ultrasound',
          code: 'RUSS',
          modality: 'Ultrasound',
          body_part: 'Kidneys',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
  {
    id: 'cardio-os-cath-preop',
    specialty_code: 'CARDIOLOGY',
    set_name: 'Cardiac Catheterization Pre-Op',
    description: 'Pre-procedural workup for cardiac catheterization or PCI',
    clinical_scenario:
      'Patient scheduled for coronary angiography or intervention',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        {
          name: 'Coagulation Screen (PT, INR, APTT)',
          code: 'COAG',
          specimen_type: 'Blood',
        },
        { name: 'Group & Save', code: 'GS', specimen_type: 'Blood' },
        { name: 'Liver Function Tests', code: 'LFT', specimen_type: 'Blood' },
        { name: 'Hepatitis B & C Screen', code: 'HEP', specimen_type: 'Blood' },
        { name: 'HIV Screening', code: 'HIV', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'ECG (12-Lead)',
          code: 'ECG',
          modality: 'ECG',
          body_part: 'Chest',
        },
        {
          name: 'Echocardiogram (TTE)',
          code: 'ECHO',
          modality: 'Ultrasound',
          body_part: 'Heart',
        },
        {
          name: 'Chest X-Ray (PA)',
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
