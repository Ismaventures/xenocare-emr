/**
 * Clinical Export System - LOINC Service
 * NDC MEDICAL CENTRE EMR
 *
 * LOINC (Logical Observation Identifiers Names and Codes) mapping
 * for laboratory tests, vitals, and observations
 * Reference: https://loinc.org/
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type { VitalsRecord, LabResultRecord } from '../types';

// ==================== LOINC CODE DEFINITIONS ====================

/**
 * LOINC code structure
 */
export interface LOINCCode {
  code: string;
  longName: string;
  shortName: string;
  component: string;
  property: string;
  timeAspect: string;
  system: string;
  scale: string;
  method?: string;
  class: string;
  unit?: string;
  normalRangeLow?: number;
  normalRangeHigh?: number;
}

/**
 * LOINC panel structure
 */
export interface LOINCPanel {
  panelCode: string;
  panelName: string;
  components: LOINCCode[];
}

// ==================== VITAL SIGNS LOINC CODES ====================

/**
 * Vital Signs LOINC Codes
 * Reference: LOINC Vital Signs Panel (85353-1)
 */
export const VITAL_SIGNS_LOINC: Record<string, LOINCCode> = {
  // Body Temperature
  BODY_TEMPERATURE: {
    code: '8310-5',
    longName: 'Body temperature',
    shortName: 'Body Temp',
    component: 'Body temperature',
    property: 'Temp',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'Cel',
    normalRangeLow: 36.1,
    normalRangeHigh: 37.2,
  },
  BODY_TEMPERATURE_ORAL: {
    code: '8331-1',
    longName: 'Body temperature - Oral',
    shortName: 'Body Temp Oral',
    component: 'Body temperature',
    property: 'Temp',
    timeAspect: 'Pt',
    system: 'Oral',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'Cel',
    normalRangeLow: 36.1,
    normalRangeHigh: 37.2,
  },
  BODY_TEMPERATURE_AXILLARY: {
    code: '8328-7',
    longName: 'Body temperature - Axillary',
    shortName: 'Body Temp Axillary',
    component: 'Body temperature',
    property: 'Temp',
    timeAspect: 'Pt',
    system: 'Axilla',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'Cel',
    normalRangeLow: 35.5,
    normalRangeHigh: 37.0,
  },
  BODY_TEMPERATURE_TYMPANIC: {
    code: '8333-7',
    longName: 'Body temperature - Tympanic membrane',
    shortName: 'Body Temp Tympanic',
    component: 'Body temperature',
    property: 'Temp',
    timeAspect: 'Pt',
    system: 'Ear',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'Cel',
    normalRangeLow: 35.8,
    normalRangeHigh: 38.0,
  },

  // Blood Pressure
  BP_SYSTOLIC: {
    code: '8480-6',
    longName: 'Systolic blood pressure',
    shortName: 'SBP',
    component: 'Systolic blood pressure',
    property: 'Pres',
    timeAspect: 'Pt',
    system: 'Arterial system',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'mm[Hg]',
    normalRangeLow: 90,
    normalRangeHigh: 120,
  },
  BP_DIASTOLIC: {
    code: '8462-4',
    longName: 'Diastolic blood pressure',
    shortName: 'DBP',
    component: 'Diastolic blood pressure',
    property: 'Pres',
    timeAspect: 'Pt',
    system: 'Arterial system',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'mm[Hg]',
    normalRangeLow: 60,
    normalRangeHigh: 80,
  },
  BP_MEAN_ARTERIAL: {
    code: '8478-0',
    longName: 'Mean arterial pressure',
    shortName: 'MAP',
    component: 'Mean arterial pressure',
    property: 'Pres',
    timeAspect: 'Pt',
    system: 'Arterial system',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'mm[Hg]',
    normalRangeLow: 70,
    normalRangeHigh: 100,
  },

  // Heart Rate / Pulse
  HEART_RATE: {
    code: '8867-4',
    longName: 'Heart rate',
    shortName: 'HR',
    component: 'Heart rate',
    property: 'NRat',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: '/min',
    normalRangeLow: 60,
    normalRangeHigh: 100,
  },
  PULSE_RATE: {
    code: '8893-0',
    longName: 'Pulse rate - Palpation',
    shortName: 'Pulse',
    component: 'Heart rate',
    property: 'NRat',
    timeAspect: 'Pt',
    system: 'Arterial system',
    scale: 'Qn',
    method: 'Palpation',
    class: 'VITAL SIGNS',
    unit: '/min',
    normalRangeLow: 60,
    normalRangeHigh: 100,
  },

  // Respiratory Rate
  RESPIRATORY_RATE: {
    code: '9279-1',
    longName: 'Respiratory rate',
    shortName: 'RR',
    component: 'Respiratory rate',
    property: 'NRat',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: '/min',
    normalRangeLow: 12,
    normalRangeHigh: 20,
  },

  // Oxygen Saturation
  OXYGEN_SATURATION: {
    code: '2708-6',
    longName: 'Oxygen saturation in Arterial blood',
    shortName: 'SpO2',
    component: 'Oxygen saturation',
    property: 'SFr',
    timeAspect: 'Pt',
    system: 'Bld.arterial',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: '%',
    normalRangeLow: 95,
    normalRangeHigh: 100,
  },
  OXYGEN_SATURATION_PULSE_OX: {
    code: '59408-5',
    longName: 'Oxygen saturation in Arterial blood by Pulse oximetry',
    shortName: 'SpO2 PulseOx',
    component: 'Oxygen saturation',
    property: 'SFr',
    timeAspect: 'Pt',
    system: 'Bld.arterial',
    scale: 'Qn',
    method: 'Pulse oximetry',
    class: 'VITAL SIGNS',
    unit: '%',
    normalRangeLow: 95,
    normalRangeHigh: 100,
  },

  // Body Weight
  BODY_WEIGHT: {
    code: '29463-7',
    longName: 'Body weight',
    shortName: 'Wt',
    component: 'Body weight',
    property: 'Mass',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'kg',
  },
  BODY_WEIGHT_MEASURED: {
    code: '3141-9',
    longName: 'Body weight Measured',
    shortName: 'Wt Measured',
    component: 'Body weight',
    property: 'Mass',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    method: 'Measured',
    class: 'VITAL SIGNS',
    unit: 'kg',
  },

  // Body Height
  BODY_HEIGHT: {
    code: '8302-2',
    longName: 'Body height',
    shortName: 'Ht',
    component: 'Body height',
    property: 'Len',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'cm',
  },

  // BMI
  BMI: {
    code: '39156-5',
    longName: 'Body mass index (BMI)',
    shortName: 'BMI',
    component: 'Body mass index',
    property: 'Ratio',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'kg/m2',
    normalRangeLow: 18.5,
    normalRangeHigh: 24.9,
  },

  // Head Circumference
  HEAD_CIRCUMFERENCE: {
    code: '9843-4',
    longName: 'Head circumference',
    shortName: 'Head Circ',
    component: 'Head circumference',
    property: 'Len',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: 'cm',
  },

  // Blood Glucose
  BLOOD_GLUCOSE: {
    code: '2339-0',
    longName: 'Glucose [Mass/volume] in Blood',
    shortName: 'Glucose Bld',
    component: 'Glucose',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Bld',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 70,
    normalRangeHigh: 100,
  },
  BLOOD_GLUCOSE_FASTING: {
    code: '1558-6',
    longName: 'Fasting glucose [Mass/volume] in Serum or Plasma',
    shortName: 'Fasting Glucose',
    component: 'Glucose^fasting',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 70,
    normalRangeHigh: 100,
  },

  // Pain Score
  PAIN_SCORE: {
    code: '72514-3',
    longName: 'Pain severity - 0-10 verbal numeric rating',
    shortName: 'Pain Score',
    component: 'Pain severity',
    property: 'Score',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'VITAL SIGNS',
    unit: '{score}',
    normalRangeLow: 0,
    normalRangeHigh: 3,
  },

  // Glasgow Coma Scale
  GCS_TOTAL: {
    code: '9269-2',
    longName: 'Glasgow coma score total',
    shortName: 'GCS Total',
    component: 'Glasgow coma score total',
    property: 'Score',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'NEURO',
    unit: '{score}',
    normalRangeLow: 15,
    normalRangeHigh: 15,
  },
  GCS_EYE: {
    code: '9267-6',
    longName: 'Glasgow coma score eye opening',
    shortName: 'GCS Eye',
    component: 'Glasgow coma score eye opening',
    property: 'Score',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'NEURO',
    unit: '{score}',
  },
  GCS_VERBAL: {
    code: '9270-0',
    longName: 'Glasgow coma score verbal',
    shortName: 'GCS Verbal',
    component: 'Glasgow coma score verbal',
    property: 'Score',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'NEURO',
    unit: '{score}',
  },
  GCS_MOTOR: {
    code: '9268-4',
    longName: 'Glasgow coma score motor',
    shortName: 'GCS Motor',
    component: 'Glasgow coma score motor',
    property: 'Score',
    timeAspect: 'Pt',
    system: '^Patient',
    scale: 'Qn',
    class: 'NEURO',
    unit: '{score}',
  },
};

// ==================== LABORATORY LOINC CODES ====================

/**
 * Common Laboratory Test LOINC Codes
 */
export const LABORATORY_LOINC: Record<string, LOINCCode> = {
  // Complete Blood Count (CBC)
  WBC: {
    code: '6690-2',
    longName: 'Leukocytes [#/volume] in Blood by Automated count',
    shortName: 'WBC',
    component: 'Leukocytes',
    property: 'NCnc',
    timeAspect: 'Pt',
    system: 'Bld',
    scale: 'Qn',
    class: 'HEM/BC',
    unit: '10*3/uL',
    normalRangeLow: 4.5,
    normalRangeHigh: 11.0,
  },
  RBC: {
    code: '789-8',
    longName: 'Erythrocytes [#/volume] in Blood by Automated count',
    shortName: 'RBC',
    component: 'Erythrocytes',
    property: 'NCnc',
    timeAspect: 'Pt',
    system: 'Bld',
    scale: 'Qn',
    class: 'HEM/BC',
    unit: '10*6/uL',
    normalRangeLow: 4.5,
    normalRangeHigh: 5.5,
  },
  HEMOGLOBIN: {
    code: '718-7',
    longName: 'Hemoglobin [Mass/volume] in Blood',
    shortName: 'Hgb',
    component: 'Hemoglobin',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Bld',
    scale: 'Qn',
    class: 'HEM/BC',
    unit: 'g/dL',
    normalRangeLow: 12.0,
    normalRangeHigh: 17.0,
  },
  HEMATOCRIT: {
    code: '4544-3',
    longName: 'Hematocrit [Volume Fraction] of Blood by Automated count',
    shortName: 'Hct',
    component: 'Hematocrit',
    property: 'VFr',
    timeAspect: 'Pt',
    system: 'Bld',
    scale: 'Qn',
    class: 'HEM/BC',
    unit: '%',
    normalRangeLow: 36,
    normalRangeHigh: 50,
  },
  PLATELETS: {
    code: '777-3',
    longName: 'Platelets [#/volume] in Blood by Automated count',
    shortName: 'Plt',
    component: 'Platelets',
    property: 'NCnc',
    timeAspect: 'Pt',
    system: 'Bld',
    scale: 'Qn',
    class: 'HEM/BC',
    unit: '10*3/uL',
    normalRangeLow: 150,
    normalRangeHigh: 400,
  },
  MCV: {
    code: '787-2',
    longName:
      'Erythrocyte mean corpuscular volume [Entitic volume] by Automated count',
    shortName: 'MCV',
    component: 'Erythrocyte mean corpuscular volume',
    property: 'EntVol',
    timeAspect: 'Pt',
    system: 'RBC',
    scale: 'Qn',
    class: 'HEM/BC',
    unit: 'fL',
    normalRangeLow: 80,
    normalRangeHigh: 100,
  },

  // Basic Metabolic Panel
  SODIUM: {
    code: '2951-2',
    longName: 'Sodium [Moles/volume] in Serum or Plasma',
    shortName: 'Na',
    component: 'Sodium',
    property: 'SCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mmol/L',
    normalRangeLow: 136,
    normalRangeHigh: 145,
  },
  POTASSIUM: {
    code: '2823-3',
    longName: 'Potassium [Moles/volume] in Serum or Plasma',
    shortName: 'K',
    component: 'Potassium',
    property: 'SCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mmol/L',
    normalRangeLow: 3.5,
    normalRangeHigh: 5.0,
  },
  CHLORIDE: {
    code: '2075-0',
    longName: 'Chloride [Moles/volume] in Serum or Plasma',
    shortName: 'Cl',
    component: 'Chloride',
    property: 'SCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mmol/L',
    normalRangeLow: 98,
    normalRangeHigh: 106,
  },
  BICARBONATE: {
    code: '1963-8',
    longName: 'Bicarbonate [Moles/volume] in Serum or Plasma',
    shortName: 'HCO3',
    component: 'Bicarbonate',
    property: 'SCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mmol/L',
    normalRangeLow: 22,
    normalRangeHigh: 29,
  },
  BUN: {
    code: '3094-0',
    longName: 'Urea nitrogen [Mass/volume] in Serum or Plasma',
    shortName: 'BUN',
    component: 'Urea nitrogen',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 7,
    normalRangeHigh: 20,
  },
  CREATININE: {
    code: '2160-0',
    longName: 'Creatinine [Mass/volume] in Serum or Plasma',
    shortName: 'Creat',
    component: 'Creatinine',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 0.7,
    normalRangeHigh: 1.3,
  },

  // Liver Function Tests
  ALT: {
    code: '1742-6',
    longName:
      'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
    shortName: 'ALT',
    component: 'Alanine aminotransferase',
    property: 'CCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'U/L',
    normalRangeLow: 7,
    normalRangeHigh: 56,
  },
  AST: {
    code: '1920-8',
    longName:
      'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
    shortName: 'AST',
    component: 'Aspartate aminotransferase',
    property: 'CCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'U/L',
    normalRangeLow: 10,
    normalRangeHigh: 40,
  },
  ALP: {
    code: '6768-6',
    longName:
      'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma',
    shortName: 'ALP',
    component: 'Alkaline phosphatase',
    property: 'CCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'U/L',
    normalRangeLow: 44,
    normalRangeHigh: 147,
  },
  TOTAL_BILIRUBIN: {
    code: '1975-2',
    longName: 'Bilirubin.total [Mass/volume] in Serum or Plasma',
    shortName: 'T.Bili',
    component: 'Bilirubin.total',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 0.1,
    normalRangeHigh: 1.2,
  },
  ALBUMIN: {
    code: '1751-7',
    longName: 'Albumin [Mass/volume] in Serum or Plasma',
    shortName: 'Albumin',
    component: 'Albumin',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'g/dL',
    normalRangeLow: 3.5,
    normalRangeHigh: 5.0,
  },

  // Lipid Panel
  TOTAL_CHOLESTEROL: {
    code: '2093-3',
    longName: 'Cholesterol [Mass/volume] in Serum or Plasma',
    shortName: 'Chol',
    component: 'Cholesterol',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 0,
    normalRangeHigh: 200,
  },
  HDL: {
    code: '2085-9',
    longName: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma',
    shortName: 'HDL-C',
    component: 'Cholesterol.in HDL',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 40,
    normalRangeHigh: 60,
  },
  LDL: {
    code: '13457-7',
    longName:
      'Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation',
    shortName: 'LDL-C',
    component: 'Cholesterol.in LDL',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    method: 'Calculated',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 0,
    normalRangeHigh: 100,
  },
  TRIGLYCERIDES: {
    code: '2571-8',
    longName: 'Triglyceride [Mass/volume] in Serum or Plasma',
    shortName: 'Trig',
    component: 'Triglyceride',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mg/dL',
    normalRangeLow: 0,
    normalRangeHigh: 150,
  },

  // Urinalysis
  URINE_PROTEIN: {
    code: '5804-0',
    longName: 'Protein [Mass/volume] in Urine by Test strip',
    shortName: 'Urine Protein',
    component: 'Protein',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Urine',
    scale: 'Qn',
    class: 'UA',
    unit: 'mg/dL',
  },
  URINE_GLUCOSE: {
    code: '5792-7',
    longName: 'Glucose [Mass/volume] in Urine by Test strip',
    shortName: 'Urine Glucose',
    component: 'Glucose',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Urine',
    scale: 'Qn',
    class: 'UA',
    unit: 'mg/dL',
  },
  URINE_PH: {
    code: '5803-2',
    longName: 'pH of Urine by Test strip',
    shortName: 'Urine pH',
    component: 'pH',
    property: 'ACnc',
    timeAspect: 'Pt',
    system: 'Urine',
    scale: 'Qn',
    class: 'UA',
    unit: '[pH]',
    normalRangeLow: 5.0,
    normalRangeHigh: 8.0,
  },

  // Cardiac Markers
  TROPONIN_I: {
    code: '10839-9',
    longName: 'Troponin I.cardiac [Mass/volume] in Serum or Plasma',
    shortName: 'Troponin I',
    component: 'Troponin I.cardiac',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CARDIAC',
    unit: 'ng/mL',
    normalRangeLow: 0,
    normalRangeHigh: 0.04,
  },
  BNP: {
    code: '30934-4',
    longName: 'Natriuretic peptide B [Mass/volume] in Serum or Plasma',
    shortName: 'BNP',
    component: 'Natriuretic peptide B',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CARDIAC',
    unit: 'pg/mL',
    normalRangeLow: 0,
    normalRangeHigh: 100,
  },

  // Thyroid
  TSH: {
    code: '3016-3',
    longName: 'Thyrotropin [Units/volume] in Serum or Plasma',
    shortName: 'TSH',
    component: 'Thyrotropin',
    property: 'ACnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'mU/L',
    normalRangeLow: 0.4,
    normalRangeHigh: 4.0,
  },
  FREE_T4: {
    code: '3024-7',
    longName: 'Thyroxine (T4) free [Mass/volume] in Serum or Plasma',
    shortName: 'Free T4',
    component: 'Thyroxine.free',
    property: 'MCnc',
    timeAspect: 'Pt',
    system: 'Ser/Plas',
    scale: 'Qn',
    class: 'CHEM',
    unit: 'ng/dL',
    normalRangeLow: 0.8,
    normalRangeHigh: 1.8,
  },

  // Coagulation
  PT: {
    code: '5902-2',
    longName: 'Prothrombin time (PT)',
    shortName: 'PT',
    component: 'Coagulation surface induced',
    property: 'Time',
    timeAspect: 'Pt',
    system: 'PPP',
    scale: 'Qn',
    class: 'COAG',
    unit: 's',
    normalRangeLow: 11,
    normalRangeHigh: 13.5,
  },
  INR: {
    code: '6301-6',
    longName: 'INR in Platelet poor plasma by Coagulation assay',
    shortName: 'INR',
    component: 'Coagulation surface induced',
    property: 'Rto',
    timeAspect: 'Pt',
    system: 'PPP',
    scale: 'Qn',
    class: 'COAG',
    unit: '{INR}',
    normalRangeLow: 0.9,
    normalRangeHigh: 1.1,
  },
  APTT: {
    code: '3173-2',
    longName:
      'Activated partial thromboplastin time (aPTT) in Platelet poor plasma',
    shortName: 'aPTT',
    component: 'Coagulation surface induced',
    property: 'Time',
    timeAspect: 'Pt',
    system: 'PPP',
    scale: 'Qn',
    class: 'COAG',
    unit: 's',
    normalRangeLow: 25,
    normalRangeHigh: 35,
  },
};

// ==================== LOINC PANELS ====================

/**
 * Common laboratory panels with their component LOINC codes
 */
export const LOINC_PANELS: LOINCPanel[] = [
  {
    panelCode: '85353-1',
    panelName:
      'Vital signs, weight, height, head circumference, oxygen saturation and BMI panel',
    components: [
      VITAL_SIGNS_LOINC.BODY_TEMPERATURE,
      VITAL_SIGNS_LOINC.BP_SYSTOLIC,
      VITAL_SIGNS_LOINC.BP_DIASTOLIC,
      VITAL_SIGNS_LOINC.HEART_RATE,
      VITAL_SIGNS_LOINC.RESPIRATORY_RATE,
      VITAL_SIGNS_LOINC.OXYGEN_SATURATION,
      VITAL_SIGNS_LOINC.BODY_WEIGHT,
      VITAL_SIGNS_LOINC.BODY_HEIGHT,
      VITAL_SIGNS_LOINC.BMI,
    ],
  },
  {
    panelCode: '57021-8',
    panelName: 'CBC W Auto Differential panel - Blood',
    components: [
      LABORATORY_LOINC.WBC,
      LABORATORY_LOINC.RBC,
      LABORATORY_LOINC.HEMOGLOBIN,
      LABORATORY_LOINC.HEMATOCRIT,
      LABORATORY_LOINC.MCV,
      LABORATORY_LOINC.PLATELETS,
    ],
  },
  {
    panelCode: '51990-0',
    panelName: 'Basic metabolic panel - Blood',
    components: [
      VITAL_SIGNS_LOINC.BLOOD_GLUCOSE,
      LABORATORY_LOINC.BUN,
      LABORATORY_LOINC.CREATININE,
      LABORATORY_LOINC.SODIUM,
      LABORATORY_LOINC.POTASSIUM,
      LABORATORY_LOINC.CHLORIDE,
      LABORATORY_LOINC.BICARBONATE,
    ],
  },
  {
    panelCode: '24323-8',
    panelName: 'Comprehensive metabolic panel - Serum or Plasma',
    components: [
      VITAL_SIGNS_LOINC.BLOOD_GLUCOSE,
      LABORATORY_LOINC.BUN,
      LABORATORY_LOINC.CREATININE,
      LABORATORY_LOINC.SODIUM,
      LABORATORY_LOINC.POTASSIUM,
      LABORATORY_LOINC.CHLORIDE,
      LABORATORY_LOINC.BICARBONATE,
      LABORATORY_LOINC.ALBUMIN,
      LABORATORY_LOINC.TOTAL_BILIRUBIN,
      LABORATORY_LOINC.ALP,
      LABORATORY_LOINC.ALT,
      LABORATORY_LOINC.AST,
    ],
  },
  {
    panelCode: '57698-3',
    panelName: 'Lipid panel with direct LDL - Serum or Plasma',
    components: [
      LABORATORY_LOINC.TOTAL_CHOLESTEROL,
      LABORATORY_LOINC.HDL,
      LABORATORY_LOINC.LDL,
      LABORATORY_LOINC.TRIGLYCERIDES,
    ],
  },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get LOINC code for a vital sign parameter
 */
export function getVitalSignLOINC(parameter: string): LOINCCode | undefined {
  const normalizedParam = parameter.toUpperCase().replace(/[^A-Z]/g, '_');
  return VITAL_SIGNS_LOINC[normalizedParam];
}

/**
 * Get LOINC code for a lab test
 */
export function getLabTestLOINC(testName: string): LOINCCode | undefined {
  const normalizedName = testName.toUpperCase().replace(/[^A-Z]/g, '_');
  return LABORATORY_LOINC[normalizedName];
}

/**
 * Lookup LOINC code by code string
 */
export function lookupLOINCCode(code: string): LOINCCode | undefined {
  // Check vital signs
  const vitalSign = Object.values(VITAL_SIGNS_LOINC).find(
    (l) => l.code === code,
  );
  if (vitalSign) return vitalSign;

  // Check laboratory
  const labTest = Object.values(LABORATORY_LOINC).find((l) => l.code === code);
  if (labTest) return labTest;

  return undefined;
}

/**
 * Validate LOINC code format
 * LOINC codes follow pattern: NNNNN-N (5 digits, dash, check digit)
 */
export function validateLOINCCode(code: string): boolean {
  if (!code) return false;
  const loincPattern = /^\d{1,5}-\d$/;
  return loincPattern.test(code);
}

/**
 * Get normal range for a LOINC code
 */
export function getLOINCNormalRange(
  code: string,
): { low?: number; high?: number; unit?: string } | undefined {
  const loincCode = lookupLOINCCode(code);
  if (!loincCode) return undefined;

  return {
    low: loincCode.normalRangeLow,
    high: loincCode.normalRangeHigh,
    unit: loincCode.unit,
  };
}

/**
 * Check if a value is within normal range for a LOINC code
 */
export function isValueNormal(
  code: string,
  value: number,
): boolean | undefined {
  const range = getLOINCNormalRange(code);
  if (!range || range.low === undefined || range.high === undefined) {
    return undefined;
  }
  return value >= range.low && value <= range.high;
}

/**
 * Enrich vitals record with LOINC codes
 */
export function enrichVitalsWithLOINC(
  vitals: Partial<VitalsRecord>,
): Partial<VitalsRecord> {
  return {
    ...vitals,
    temperature_loinc:
      vitals.temperature !== undefined
        ? VITAL_SIGNS_LOINC.BODY_TEMPERATURE.code
        : undefined,
    bp_systolic_loinc:
      vitals.blood_pressure_systolic !== undefined
        ? VITAL_SIGNS_LOINC.BP_SYSTOLIC.code
        : undefined,
    bp_diastolic_loinc:
      vitals.blood_pressure_diastolic !== undefined
        ? VITAL_SIGNS_LOINC.BP_DIASTOLIC.code
        : undefined,
    pulse_loinc:
      vitals.pulse_rate !== undefined
        ? VITAL_SIGNS_LOINC.HEART_RATE.code
        : undefined,
    respiratory_loinc:
      vitals.respiratory_rate !== undefined
        ? VITAL_SIGNS_LOINC.RESPIRATORY_RATE.code
        : undefined,
    oxygen_loinc:
      vitals.oxygen_saturation !== undefined
        ? VITAL_SIGNS_LOINC.OXYGEN_SATURATION.code
        : undefined,
    weight_loinc:
      vitals.weight !== undefined
        ? VITAL_SIGNS_LOINC.BODY_WEIGHT.code
        : undefined,
    height_loinc:
      vitals.height !== undefined
        ? VITAL_SIGNS_LOINC.BODY_HEIGHT.code
        : undefined,
    bmi_loinc:
      vitals.bmi !== undefined ? VITAL_SIGNS_LOINC.BMI.code : undefined,
    blood_glucose_loinc:
      vitals.blood_glucose !== undefined
        ? VITAL_SIGNS_LOINC.BLOOD_GLUCOSE.code
        : undefined,
    pain_loinc:
      vitals.pain_score !== undefined
        ? VITAL_SIGNS_LOINC.PAIN_SCORE.code
        : undefined,
  };
}

/**
 * Search LOINC codes by keyword
 */
export function searchLOINCCodes(
  query: string,
  limit: number = 20,
): LOINCCode[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase();
  const results: LOINCCode[] = [];

  // Search vital signs
  Object.values(VITAL_SIGNS_LOINC).forEach((code) => {
    if (
      code.code.includes(normalizedQuery) ||
      code.longName.toLowerCase().includes(normalizedQuery) ||
      code.shortName.toLowerCase().includes(normalizedQuery) ||
      code.component.toLowerCase().includes(normalizedQuery)
    ) {
      results.push(code);
    }
  });

  // Search laboratory
  Object.values(LABORATORY_LOINC).forEach((code) => {
    if (
      code.code.includes(normalizedQuery) ||
      code.longName.toLowerCase().includes(normalizedQuery) ||
      code.shortName.toLowerCase().includes(normalizedQuery) ||
      code.component.toLowerCase().includes(normalizedQuery)
    ) {
      results.push(code);
    }
  });

  return results.slice(0, limit);
}
