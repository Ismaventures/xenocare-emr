/**
 * Clinical Export System - ATC Classification Service
 * XENOCARE EMR
 *
 * ATC (Anatomical Therapeutic Chemical) classification for medications
 * Reference: WHO Collaborating Centre for Drug Statistics Methodology
 * https://www.whocc.no/atc_ddd_index/
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type { ATCClassification, PrescriptionRecord } from '../types';

// ==================== ATC CLASSIFICATION STRUCTURE ====================

/**
 * ATC Level 1 - Anatomical Main Groups (14 groups)
 */
export interface ATCLevel1 {
  code: string;
  name: string;
  description: string;
}

/**
 * ATC Level 2 - Therapeutic Subgroups
 */
export interface ATCLevel2 {
  code: string;
  name: string;
  parentLevel1: string;
}

/**
 * ATC Code entry with full classification
 */
export interface ATCCodeEntry {
  code: string;
  name: string;
  level1: ATCLevel1;
  level2?: ATCLevel2;
  dddValue?: number;
  dddUnit?: string;
  adminRoute?: string;
}

// ==================== ATC LEVEL 1 - ANATOMICAL MAIN GROUPS ====================

/**
 * ATC Level 1 Main Groups
 */
export const ATC_LEVEL1: ATCLevel1[] = [
  {
    code: 'A',
    name: 'Alimentary tract and metabolism',
    description: 'Drugs for GI tract, diabetes, vitamins, minerals',
  },
  {
    code: 'B',
    name: 'Blood and blood forming organs',
    description: 'Antithrombotic, antianemic, blood substitutes',
  },
  {
    code: 'C',
    name: 'Cardiovascular system',
    description:
      'Cardiac therapy, antihypertensives, diuretics, lipid modifying',
  },
  {
    code: 'D',
    name: 'Dermatologicals',
    description: 'Antifungals, emollients, antiseptics for skin',
  },
  {
    code: 'G',
    name: 'Genito-urinary system and sex hormones',
    description: 'Gynecological, urologicals, sex hormones',
  },
  {
    code: 'H',
    name: 'Systemic hormonal preparations',
    description: 'Hormones excluding sex hormones and insulins',
  },
  {
    code: 'J',
    name: 'Antiinfectives for systemic use',
    description: 'Antibacterials, antimycotics, antivirals, vaccines',
  },
  {
    code: 'L',
    name: 'Antineoplastic and immunomodulating agents',
    description: 'Cytostatic, immunosuppressants, immunostimulants',
  },
  {
    code: 'M',
    name: 'Musculo-skeletal system',
    description: 'Anti-inflammatory, muscle relaxants, antigout',
  },
  {
    code: 'N',
    name: 'Nervous system',
    description: 'Anesthetics, analgesics, antiepileptics, psychotropics',
  },
  {
    code: 'P',
    name: 'Antiparasitic products, insecticides and repellents',
    description: 'Antiprotozoals, anthelmintics, ectoparasiticides',
  },
  {
    code: 'R',
    name: 'Respiratory system',
    description: 'Nasal, throat, antihistamines, antiasthmatics',
  },
  {
    code: 'S',
    name: 'Sensory organs',
    description: 'Ophthalmologicals, otologicals',
  },
  {
    code: 'V',
    name: 'Various',
    description: 'Allergens, contrast media, diagnostic agents, nutrients',
  },
];

// ==================== COMMON ATC CODES DATABASE ====================

/**
 * Common medication ATC codes
 * Subset for quick reference - full implementation would use database lookup
 */
export const COMMON_ATC_CODES: ATCCodeEntry[] = [
  // A - Alimentary tract and metabolism
  {
    code: 'A02BC01',
    name: 'Omeprazole',
    level1: ATC_LEVEL1[0],
    dddValue: 20,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A02BC02',
    name: 'Pantoprazole',
    level1: ATC_LEVEL1[0],
    dddValue: 40,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A02BC03',
    name: 'Lansoprazole',
    level1: ATC_LEVEL1[0],
    dddValue: 30,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A02BC05',
    name: 'Esomeprazole',
    level1: ATC_LEVEL1[0],
    dddValue: 30,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A03FA01',
    name: 'Metoclopramide',
    level1: ATC_LEVEL1[0],
    dddValue: 30,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A07DA03',
    name: 'Loperamide',
    level1: ATC_LEVEL1[0],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A10BA02',
    name: 'Metformin',
    level1: ATC_LEVEL1[0],
    dddValue: 2000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A10BB01',
    name: 'Glibenclamide',
    level1: ATC_LEVEL1[0],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A10BB12',
    name: 'Glimepiride',
    level1: ATC_LEVEL1[0],
    dddValue: 2,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'A10BH01',
    name: 'Sitagliptin',
    level1: ATC_LEVEL1[0],
    dddValue: 100,
    dddUnit: 'mg',
    adminRoute: 'O',
  },

  // B - Blood and blood forming organs
  {
    code: 'B01AA03',
    name: 'Warfarin',
    level1: ATC_LEVEL1[1],
    dddValue: 7.5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'B01AC04',
    name: 'Clopidogrel',
    level1: ATC_LEVEL1[1],
    dddValue: 75,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'B01AC06',
    name: 'Aspirin (antithrombotic)',
    level1: ATC_LEVEL1[1],
    dddValue: 1000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'B01AF01',
    name: 'Rivaroxaban',
    level1: ATC_LEVEL1[1],
    dddValue: 20,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'B01AF02',
    name: 'Apixaban',
    level1: ATC_LEVEL1[1],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'B03AA07',
    name: 'Ferrous sulfate',
    level1: ATC_LEVEL1[1],
    dddValue: 200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'B03BA01',
    name: 'Cyanocobalamin',
    level1: ATC_LEVEL1[1],
    dddValue: 1,
    dddUnit: 'mg',
    adminRoute: 'P',
  },

  // C - Cardiovascular system
  {
    code: 'C01AA05',
    name: 'Digoxin',
    level1: ATC_LEVEL1[2],
    dddValue: 0.25,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C03CA01',
    name: 'Furosemide',
    level1: ATC_LEVEL1[2],
    dddValue: 40,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C03DA01',
    name: 'Spironolactone',
    level1: ATC_LEVEL1[2],
    dddValue: 75,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C07AB02',
    name: 'Metoprolol',
    level1: ATC_LEVEL1[2],
    dddValue: 150,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C07AB03',
    name: 'Atenolol',
    level1: ATC_LEVEL1[2],
    dddValue: 75,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C07AB07',
    name: 'Bisoprolol',
    level1: ATC_LEVEL1[2],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C07AG02',
    name: 'Carvedilol',
    level1: ATC_LEVEL1[2],
    dddValue: 37.5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C08CA01',
    name: 'Amlodipine',
    level1: ATC_LEVEL1[2],
    dddValue: 5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C08CA02',
    name: 'Felodipine',
    level1: ATC_LEVEL1[2],
    dddValue: 5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C08CA05',
    name: 'Nifedipine',
    level1: ATC_LEVEL1[2],
    dddValue: 30,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09AA01',
    name: 'Captopril',
    level1: ATC_LEVEL1[2],
    dddValue: 50,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09AA02',
    name: 'Enalapril',
    level1: ATC_LEVEL1[2],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09AA03',
    name: 'Lisinopril',
    level1: ATC_LEVEL1[2],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09AA05',
    name: 'Ramipril',
    level1: ATC_LEVEL1[2],
    dddValue: 2.5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09CA01',
    name: 'Losartan',
    level1: ATC_LEVEL1[2],
    dddValue: 50,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09CA03',
    name: 'Valsartan',
    level1: ATC_LEVEL1[2],
    dddValue: 80,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09CA04',
    name: 'Irbesartan',
    level1: ATC_LEVEL1[2],
    dddValue: 150,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C09CA06',
    name: 'Candesartan',
    level1: ATC_LEVEL1[2],
    dddValue: 8,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C10AA01',
    name: 'Simvastatin',
    level1: ATC_LEVEL1[2],
    dddValue: 30,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C10AA05',
    name: 'Atorvastatin',
    level1: ATC_LEVEL1[2],
    dddValue: 20,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'C10AA07',
    name: 'Rosuvastatin',
    level1: ATC_LEVEL1[2],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },

  // J - Antiinfectives for systemic use
  {
    code: 'J01CA04',
    name: 'Amoxicillin',
    level1: ATC_LEVEL1[6],
    dddValue: 1500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01CR02',
    name: 'Amoxicillin/Clavulanate',
    level1: ATC_LEVEL1[6],
    dddValue: 1500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01DB01',
    name: 'Cefalexin',
    level1: ATC_LEVEL1[6],
    dddValue: 2000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01DC02',
    name: 'Cefuroxime',
    level1: ATC_LEVEL1[6],
    dddValue: 500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01DD01',
    name: 'Cefotaxime',
    level1: ATC_LEVEL1[6],
    dddValue: 4000,
    dddUnit: 'mg',
    adminRoute: 'P',
  },
  {
    code: 'J01DD02',
    name: 'Ceftazidime',
    level1: ATC_LEVEL1[6],
    dddValue: 4000,
    dddUnit: 'mg',
    adminRoute: 'P',
  },
  {
    code: 'J01DD04',
    name: 'Ceftriaxone',
    level1: ATC_LEVEL1[6],
    dddValue: 2000,
    dddUnit: 'mg',
    adminRoute: 'P',
  },
  {
    code: 'J01FA01',
    name: 'Erythromycin',
    level1: ATC_LEVEL1[6],
    dddValue: 1000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01FA09',
    name: 'Clarithromycin',
    level1: ATC_LEVEL1[6],
    dddValue: 500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01FA10',
    name: 'Azithromycin',
    level1: ATC_LEVEL1[6],
    dddValue: 300,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01MA02',
    name: 'Ciprofloxacin',
    level1: ATC_LEVEL1[6],
    dddValue: 1000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01MA12',
    name: 'Levofloxacin',
    level1: ATC_LEVEL1[6],
    dddValue: 500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J01XD01',
    name: 'Metronidazole',
    level1: ATC_LEVEL1[6],
    dddValue: 1500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J02AC01',
    name: 'Fluconazole',
    level1: ATC_LEVEL1[6],
    dddValue: 200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'J05AB01',
    name: 'Acyclovir',
    level1: ATC_LEVEL1[6],
    dddValue: 4000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },

  // M - Musculo-skeletal system
  {
    code: 'M01AB05',
    name: 'Diclofenac',
    level1: ATC_LEVEL1[8],
    dddValue: 100,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'M01AE01',
    name: 'Ibuprofen',
    level1: ATC_LEVEL1[8],
    dddValue: 1200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'M01AE02',
    name: 'Naproxen',
    level1: ATC_LEVEL1[8],
    dddValue: 500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'M01AH01',
    name: 'Celecoxib',
    level1: ATC_LEVEL1[8],
    dddValue: 200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'M04AA01',
    name: 'Allopurinol',
    level1: ATC_LEVEL1[8],
    dddValue: 400,
    dddUnit: 'mg',
    adminRoute: 'O',
  },

  // N - Nervous system
  {
    code: 'N02AA01',
    name: 'Morphine',
    level1: ATC_LEVEL1[9],
    dddValue: 100,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N02AA05',
    name: 'Oxycodone',
    level1: ATC_LEVEL1[9],
    dddValue: 75,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N02AX02',
    name: 'Tramadol',
    level1: ATC_LEVEL1[9],
    dddValue: 300,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N02BE01',
    name: 'Paracetamol (Acetaminophen)',
    level1: ATC_LEVEL1[9],
    dddValue: 3000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N03AE01',
    name: 'Clonazepam',
    level1: ATC_LEVEL1[9],
    dddValue: 8,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N03AF01',
    name: 'Carbamazepine',
    level1: ATC_LEVEL1[9],
    dddValue: 1000,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N03AG01',
    name: 'Sodium valproate',
    level1: ATC_LEVEL1[9],
    dddValue: 1500,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N03AX09',
    name: 'Lamotrigine',
    level1: ATC_LEVEL1[9],
    dddValue: 300,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N03AX16',
    name: 'Pregabalin',
    level1: ATC_LEVEL1[9],
    dddValue: 300,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N05BA01',
    name: 'Diazepam',
    level1: ATC_LEVEL1[9],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N05BA06',
    name: 'Lorazepam',
    level1: ATC_LEVEL1[9],
    dddValue: 2.5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N05CD08',
    name: 'Midazolam',
    level1: ATC_LEVEL1[9],
    dddValue: 15,
    dddUnit: 'mg',
    adminRoute: 'P',
  },
  {
    code: 'N06AA09',
    name: 'Amitriptyline',
    level1: ATC_LEVEL1[9],
    dddValue: 75,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N06AB03',
    name: 'Fluoxetine',
    level1: ATC_LEVEL1[9],
    dddValue: 20,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N06AB04',
    name: 'Citalopram',
    level1: ATC_LEVEL1[9],
    dddValue: 20,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N06AB06',
    name: 'Sertraline',
    level1: ATC_LEVEL1[9],
    dddValue: 50,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'N06AB10',
    name: 'Escitalopram',
    level1: ATC_LEVEL1[9],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },

  // P - Antiparasitic products
  {
    code: 'P01BA03',
    name: 'Primaquine',
    level1: ATC_LEVEL1[10],
    dddValue: 15,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'P01BB01',
    name: 'Proguanil',
    level1: ATC_LEVEL1[10],
    dddValue: 200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'P01BD01',
    name: 'Pyrimethamine',
    level1: ATC_LEVEL1[10],
    dddValue: 3.6,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'P01BE03',
    name: 'Artesunate',
    level1: ATC_LEVEL1[10],
    dddValue: 200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'P01BF01',
    name: 'Artemether/Lumefantrine',
    level1: ATC_LEVEL1[10],
    dddValue: 80,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'P02CA01',
    name: 'Mebendazole',
    level1: ATC_LEVEL1[10],
    dddValue: 200,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'P02CA03',
    name: 'Albendazole',
    level1: ATC_LEVEL1[10],
    dddValue: 400,
    dddUnit: 'mg',
    adminRoute: 'O',
  },

  // R - Respiratory system
  {
    code: 'R01AD05',
    name: 'Budesonide (nasal)',
    level1: ATC_LEVEL1[11],
    dddValue: 0.2,
    dddUnit: 'mg',
    adminRoute: 'N',
  },
  {
    code: 'R03AC02',
    name: 'Salbutamol',
    level1: ATC_LEVEL1[11],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'Inhal',
  },
  {
    code: 'R03AK06',
    name: 'Salmeterol/Fluticasone',
    level1: ATC_LEVEL1[11],
    dddValue: 2,
    dddUnit: 'doses',
    adminRoute: 'Inhal',
  },
  {
    code: 'R03BA02',
    name: 'Budesonide (inhalation)',
    level1: ATC_LEVEL1[11],
    dddValue: 0.8,
    dddUnit: 'mg',
    adminRoute: 'Inhal',
  },
  {
    code: 'R03BA05',
    name: 'Fluticasone',
    level1: ATC_LEVEL1[11],
    dddValue: 0.6,
    dddUnit: 'mg',
    adminRoute: 'Inhal',
  },
  {
    code: 'R03BB04',
    name: 'Tiotropium',
    level1: ATC_LEVEL1[11],
    dddValue: 0.018,
    dddUnit: 'mg',
    adminRoute: 'Inhal',
  },
  {
    code: 'R05CB01',
    name: 'Acetylcysteine',
    level1: ATC_LEVEL1[11],
    dddValue: 600,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'R05DA04',
    name: 'Codeine',
    level1: ATC_LEVEL1[11],
    dddValue: 100,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'R06AE07',
    name: 'Cetirizine',
    level1: ATC_LEVEL1[11],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'R06AX13',
    name: 'Loratadine',
    level1: ATC_LEVEL1[11],
    dddValue: 10,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
  {
    code: 'R06AX27',
    name: 'Desloratadine',
    level1: ATC_LEVEL1[11],
    dddValue: 5,
    dddUnit: 'mg',
    adminRoute: 'O',
  },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate ATC code format
 * Format: 1 letter + 2 digits + 1 letter + 1 letter + 2 digits (7 characters)
 * e.g., A10BA02
 */
export function validateATCCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;

  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const atcPattern = /^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/;

  return atcPattern.test(normalized);
}

/**
 * Normalize ATC code
 */
export function normalizeATCCode(code: string): string {
  if (!code) return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Get ATC Level 1 (Anatomical main group) from code
 */
export function getATCLevel1(code: string): ATCLevel1 | undefined {
  const normalized = normalizeATCCode(code);
  if (!normalized) return undefined;

  const level1Code = normalized.charAt(0);
  return ATC_LEVEL1.find((l) => l.code === level1Code);
}

/**
 * Get ATC classification breakdown
 */
export function parseATCCode(code: string): ATCClassification | undefined {
  const normalized = normalizeATCCode(code);
  if (!normalized || normalized.length < 1) return undefined;

  return {
    code: normalized,
    level1: normalized.charAt(0),
    level2: normalized.length >= 3 ? normalized.substring(0, 3) : undefined,
    level3: normalized.length >= 4 ? normalized.substring(0, 4) : undefined,
    level4: normalized.length >= 5 ? normalized.substring(0, 5) : undefined,
    level5: normalized.length >= 7 ? normalized : undefined,
    description: getATCLevel1(normalized)?.name,
  };
}

/**
 * Look up ATC code entry
 */
export function lookupATCCode(code: string): ATCCodeEntry | undefined {
  const normalized = normalizeATCCode(code);
  return COMMON_ATC_CODES.find((entry) => entry.code === normalized);
}

/**
 * Search ATC codes by drug name
 */
export function searchATCByName(
  drugName: string,
  limit: number = 20,
): ATCCodeEntry[] {
  if (!drugName || drugName.length < 2) return [];

  const normalizedQuery = drugName.toLowerCase();

  return COMMON_ATC_CODES.filter((entry) =>
    entry.name.toLowerCase().includes(normalizedQuery),
  ).slice(0, limit);
}

/**
 * Get all drugs in an ATC category (Level 1)
 */
export function getDrugsByATCLevel1(level1Code: string): ATCCodeEntry[] {
  const normalized = level1Code.toUpperCase();
  return COMMON_ATC_CODES.filter((entry) => entry.code.startsWith(normalized));
}

/**
 * Enrich prescription with ATC classification
 */
export function enrichPrescriptionWithATC(
  prescription: Partial<PrescriptionRecord>,
): Partial<PrescriptionRecord> {
  if (!prescription.drug_name) return prescription;

  // Try to find ATC code by drug name
  const atcEntries = searchATCByName(prescription.drug_name, 1);

  if (atcEntries.length > 0) {
    const atcEntry = atcEntries[0];
    return {
      ...prescription,
      atc_code: atcEntry.code,
      atc_classification: parseATCCode(atcEntry.code),
    };
  }

  return prescription;
}

/**
 * Group prescriptions by ATC Level 1
 */
export function groupPrescriptionsByATCLevel1(
  prescriptions: PrescriptionRecord[],
): Map<string, { level1: ATCLevel1; prescriptions: PrescriptionRecord[] }> {
  const groups = new Map<
    string,
    { level1: ATCLevel1; prescriptions: PrescriptionRecord[] }
  >();

  // Initialize all Level 1 groups
  ATC_LEVEL1.forEach((level1) => {
    groups.set(level1.code, { level1, prescriptions: [] });
  });

  // Add 'Unknown' group
  groups.set('?', {
    level1: {
      code: '?',
      name: 'Unknown/Unclassified',
      description: 'Medications without ATC code',
    },
    prescriptions: [],
  });

  prescriptions.forEach((prescription) => {
    const level1 = prescription.atc_code
      ? getATCLevel1(prescription.atc_code)
      : undefined;
    const key = level1?.code || '?';

    const group = groups.get(key);
    if (group) {
      group.prescriptions.push(prescription);
    }
  });

  // Remove empty groups
  groups.forEach((value, key) => {
    if (value.prescriptions.length === 0) {
      groups.delete(key);
    }
  });

  return groups;
}

/**
 * Calculate ATC statistics from prescriptions
 */
export function calculateATCStats(prescriptions: PrescriptionRecord[]): {
  total: number;
  withATC: number;
  withoutATC: number;
  byLevel1: { level1: ATCLevel1; count: number; percentage: number }[];
  topDrugs: { name: string; atcCode?: string; count: number }[];
} {
  const withATC = prescriptions.filter((p) => p.atc_code).length;

  // Group by Level 1
  const level1Counts = new Map<string, number>();
  ATC_LEVEL1.forEach((l) => level1Counts.set(l.code, 0));

  // Count drug occurrences
  const drugCounts = new Map<
    string,
    { name: string; atcCode?: string; count: number }
  >();

  prescriptions.forEach((p) => {
    // Count by ATC Level 1
    if (p.atc_code) {
      const level1 = p.atc_code.charAt(0);
      level1Counts.set(level1, (level1Counts.get(level1) || 0) + 1);
    }

    // Count by drug name
    const drugKey = p.drug_name.toLowerCase();
    const existing = drugCounts.get(drugKey);
    if (existing) {
      existing.count++;
    } else {
      drugCounts.set(drugKey, {
        name: p.drug_name,
        atcCode: p.atc_code,
        count: 1,
      });
    }
  });

  // Build Level 1 stats
  const byLevel1 = ATC_LEVEL1.map((level1) => ({
    level1,
    count: level1Counts.get(level1.code) || 0,
    percentage:
      withATC > 0 ? ((level1Counts.get(level1.code) || 0) / withATC) * 100 : 0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  // Top drugs
  const topDrugs = Array.from(drugCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    total: prescriptions.length,
    withATC,
    withoutATC: prescriptions.length - withATC,
    byLevel1,
    topDrugs,
  };
}

/**
 * Get drug route description
 */
export function getRouteDescription(adminRoute: string): string {
  const routes: Record<string, string> = {
    O: 'Oral',
    P: 'Parenteral',
    R: 'Rectal',
    N: 'Nasal',
    Inhal: 'Inhalation',
    SL: 'Sublingual',
    TD: 'Transdermal',
    V: 'Vaginal',
    Implant: 'Implant',
  };
  return routes[adminRoute] || adminRoute;
}
