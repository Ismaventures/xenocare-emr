/**
 * Clinical Export System - ICD-10 Service
 * NDC MEDICAL CENTRE EMR
 *
 * ICD-10 code validation, lookup, and statistics
 * Reference: WHO ICD-10 Classification
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import type { DiagnosisRecord, ICD10ChapterStats } from '../types';

// ==================== ICD-10 CHAPTER DEFINITIONS ====================

/**
 * ICD-10 Chapter structure
 */
export interface ICD10Chapter {
  chapter: string; // Roman numeral (I, II, etc.)
  code: string; // Code range (A00-B99)
  title: string;
  description: string;
  codeRangeStart: string;
  codeRangeEnd: string;
}

/**
 * ICD-10 Code structure
 */
export interface ICD10Code {
  code: string;
  description: string;
  chapter: string;
  block?: string;
  isHeader?: boolean;
  isBillable?: boolean;
}

/**
 * ICD-10 Chapters (International Classification of Diseases 10th Revision)
 */
export const ICD10_CHAPTERS: ICD10Chapter[] = [
  {
    chapter: 'I',
    code: 'A00-B99',
    title: 'Certain infectious and parasitic diseases',
    description:
      'Infectious and parasitic diseases including bacterial, viral, and parasitic infections',
    codeRangeStart: 'A00',
    codeRangeEnd: 'B99',
  },
  {
    chapter: 'II',
    code: 'C00-D49',
    title: 'Neoplasms',
    description:
      'Malignant and benign tumors, carcinomas, and neoplastic diseases',
    codeRangeStart: 'C00',
    codeRangeEnd: 'D49',
  },
  {
    chapter: 'III',
    code: 'D50-D89',
    title:
      'Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism',
    description:
      'Blood disorders including anemia, coagulation defects, and immunodeficiency',
    codeRangeStart: 'D50',
    codeRangeEnd: 'D89',
  },
  {
    chapter: 'IV',
    code: 'E00-E89',
    title: 'Endocrine, nutritional and metabolic diseases',
    description:
      'Thyroid disorders, diabetes mellitus, and metabolic disorders',
    codeRangeStart: 'E00',
    codeRangeEnd: 'E89',
  },
  {
    chapter: 'V',
    code: 'F01-F99',
    title: 'Mental, behavioral and neurodevelopmental disorders',
    description: 'Psychiatric and psychological disorders',
    codeRangeStart: 'F01',
    codeRangeEnd: 'F99',
  },
  {
    chapter: 'VI',
    code: 'G00-G99',
    title: 'Diseases of the nervous system',
    description: 'Neurological disorders including CNS and PNS diseases',
    codeRangeStart: 'G00',
    codeRangeEnd: 'G99',
  },
  {
    chapter: 'VII',
    code: 'H00-H59',
    title: 'Diseases of the eye and adnexa',
    description: 'Ophthalmic disorders and eye diseases',
    codeRangeStart: 'H00',
    codeRangeEnd: 'H59',
  },
  {
    chapter: 'VIII',
    code: 'H60-H95',
    title: 'Diseases of the ear and mastoid process',
    description: 'Otological disorders and hearing diseases',
    codeRangeStart: 'H60',
    codeRangeEnd: 'H95',
  },
  {
    chapter: 'IX',
    code: 'I00-I99',
    title: 'Diseases of the circulatory system',
    description:
      'Cardiovascular diseases including heart disease, hypertension, and stroke',
    codeRangeStart: 'I00',
    codeRangeEnd: 'I99',
  },
  {
    chapter: 'X',
    code: 'J00-J99',
    title: 'Diseases of the respiratory system',
    description: 'Respiratory diseases including asthma, pneumonia, and COPD',
    codeRangeStart: 'J00',
    codeRangeEnd: 'J99',
  },
  {
    chapter: 'XI',
    code: 'K00-K95',
    title: 'Diseases of the digestive system',
    description: 'Gastrointestinal disorders',
    codeRangeStart: 'K00',
    codeRangeEnd: 'K95',
  },
  {
    chapter: 'XII',
    code: 'L00-L99',
    title: 'Diseases of the skin and subcutaneous tissue',
    description: 'Dermatological disorders',
    codeRangeStart: 'L00',
    codeRangeEnd: 'L99',
  },
  {
    chapter: 'XIII',
    code: 'M00-M99',
    title: 'Diseases of the musculoskeletal system and connective tissue',
    description: 'Musculoskeletal and rheumatic disorders',
    codeRangeStart: 'M00',
    codeRangeEnd: 'M99',
  },
  {
    chapter: 'XIV',
    code: 'N00-N99',
    title: 'Diseases of the genitourinary system',
    description: 'Renal, urological, and reproductive system disorders',
    codeRangeStart: 'N00',
    codeRangeEnd: 'N99',
  },
  {
    chapter: 'XV',
    code: 'O00-O9A',
    title: 'Pregnancy, childbirth and the puerperium',
    description: 'Obstetric conditions and complications',
    codeRangeStart: 'O00',
    codeRangeEnd: 'O9A',
  },
  {
    chapter: 'XVI',
    code: 'P00-P96',
    title: 'Certain conditions originating in the perinatal period',
    description: 'Neonatal and perinatal conditions',
    codeRangeStart: 'P00',
    codeRangeEnd: 'P96',
  },
  {
    chapter: 'XVII',
    code: 'Q00-Q99',
    title:
      'Congenital malformations, deformations and chromosomal abnormalities',
    description: 'Birth defects and genetic disorders',
    codeRangeStart: 'Q00',
    codeRangeEnd: 'Q99',
  },
  {
    chapter: 'XVIII',
    code: 'R00-R99',
    title:
      'Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified',
    description: 'Signs and symptoms not classified elsewhere',
    codeRangeStart: 'R00',
    codeRangeEnd: 'R99',
  },
  {
    chapter: 'XIX',
    code: 'S00-T88',
    title:
      'Injury, poisoning and certain other consequences of external causes',
    description: 'Injuries, poisoning, and trauma',
    codeRangeStart: 'S00',
    codeRangeEnd: 'T88',
  },
  {
    chapter: 'XX',
    code: 'V00-Y99',
    title: 'External causes of morbidity',
    description: 'External causes of injury and disease',
    codeRangeStart: 'V00',
    codeRangeEnd: 'Y99',
  },
  {
    chapter: 'XXI',
    code: 'Z00-Z99',
    title: 'Factors influencing health status and contact with health services',
    description: 'Health status factors and encounters',
    codeRangeStart: 'Z00',
    codeRangeEnd: 'Z99',
  },
  {
    chapter: 'XXII',
    code: 'U00-U85',
    title: 'Codes for special purposes',
    description: 'Special codes including emergency use codes',
    codeRangeStart: 'U00',
    codeRangeEnd: 'U85',
  },
];

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate ICD-10 code format
 * Format: Letter followed by 2-7 characters (numbers and possibly more letters)
 * Examples: A00, A00.1, A00.11, J18.9
 */
export function validateICD10Code(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Remove spaces and convert to uppercase
  const cleanCode = code.trim().toUpperCase();

  // ICD-10 format: Letter + 2 digits + optional decimal + up to 4 more characters
  // Examples: A00, A00.1, A00.11, J18.9, S72.001A
  const icd10Pattern = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;

  return icd10Pattern.test(cleanCode);
}

/**
 * Normalize ICD-10 code to standard format
 */
export function normalizeICD10Code(code: string): string {
  if (!code) return '';

  // Remove spaces, convert to uppercase
  let normalized = code.trim().toUpperCase();

  // Remove any non-alphanumeric characters except dots
  normalized = normalized.replace(/[^A-Z0-9.]/g, '');

  return normalized;
}

/**
 * Extract the category (first 3 characters) from ICD-10 code
 */
export function getICD10Category(code: string): string {
  const normalized = normalizeICD10Code(code);
  if (!normalized) return '';

  // Category is the first 3 characters (e.g., A00 from A00.1)
  return normalized.substring(0, 3);
}

/**
 * Get the chapter code (e.g., "I", "II") for an ICD-10 code
 */
export function getICD10ChapterCode(code: string): string | undefined {
  const chapter = getICD10Chapter(code);
  return chapter?.chapter;
}

/**
 * Get the chapter for an ICD-10 code
 */
export function getICD10Chapter(code: string): ICD10Chapter | undefined {
  const category = getICD10Category(code);
  if (!category) return undefined;

  const firstLetter = category.charAt(0);

  return ICD10_CHAPTERS.find((chapter) => {
    const startLetter = chapter.codeRangeStart.charAt(0);
    const endLetter = chapter.codeRangeEnd.charAt(0);
    const startNum = parseInt(chapter.codeRangeStart.substring(1), 10);
    const endNum = parseInt(chapter.codeRangeEnd.substring(1), 10);
    const codeNum = parseInt(category.substring(1), 10);

    // Check if the letter falls within the range
    if (firstLetter < startLetter || firstLetter > endLetter) {
      return false;
    }

    // If same letter as start and end
    if (startLetter === endLetter) {
      return (
        firstLetter === startLetter && codeNum >= startNum && codeNum <= endNum
      );
    }

    // If letter matches start
    if (firstLetter === startLetter) {
      return codeNum >= startNum;
    }

    // If letter matches end
    if (firstLetter === endLetter) {
      return codeNum <= endNum;
    }

    // Letter is between start and end
    return true;
  });
}

/**
 * Get chapter title for an ICD-10 code
 */
export function getICD10ChapterTitle(code: string): string {
  const chapter = getICD10Chapter(code);
  return chapter?.title || 'Unknown';
}

// ==================== STATISTICS FUNCTIONS ====================

/**
 * Calculate ICD-10 chapter statistics from diagnoses
 */
export function calculateICD10ChapterStats(
  diagnoses: DiagnosisRecord[],
): ICD10ChapterStats[] {
  if (!diagnoses || diagnoses.length === 0) {
    return [];
  }

  // Group diagnoses by chapter
  const chapterCounts = new Map<
    string,
    {
      chapter: ICD10Chapter;
      diagnoses: DiagnosisRecord[];
    }
  >();

  // Initialize all chapters with zero counts
  ICD10_CHAPTERS.forEach((chapter) => {
    chapterCounts.set(chapter.chapter, {
      chapter,
      diagnoses: [],
    });
  });

  // Count diagnoses by chapter
  diagnoses.forEach((diagnosis) => {
    if (!diagnosis.icd10_code) return;

    const chapter = getICD10Chapter(diagnosis.icd10_code);
    if (chapter) {
      const existing = chapterCounts.get(chapter.chapter);
      if (existing) {
        existing.diagnoses.push(diagnosis);
      }
    }
  });

  const totalDiagnoses = diagnoses.filter((d) => d.icd10_code).length;

  // Convert to stats array
  const stats: ICD10ChapterStats[] = [];

  chapterCounts.forEach((data, chapterNum) => {
    if (data.diagnoses.length === 0) return;

    // Count by specific ICD-10 code
    const codeCounts = new Map<
      string,
      { code: string; description: string; count: number }
    >();

    data.diagnoses.forEach((d) => {
      const code = normalizeICD10Code(d.icd10_code);
      const existing = codeCounts.get(code);
      if (existing) {
        existing.count++;
      } else {
        codeCounts.set(code, {
          code,
          description: d.icd10_description || d.diagnosis_text || code,
          count: 1,
        });
      }
    });

    // Get top diagnoses for this chapter
    const topDiagnoses = Array.from(codeCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    stats.push({
      chapter: `Chapter ${chapterNum}`,
      chapterCode: data.chapter.code,
      description: data.chapter.title,
      count: data.diagnoses.length,
      percentage:
        totalDiagnoses > 0 ? (data.diagnoses.length / totalDiagnoses) * 100 : 0,
      topDiagnoses,
    });
  });

  // Sort by count descending
  return stats.sort((a, b) => b.count - a.count);
}

/**
 * Get top N ICD-10 codes from diagnoses
 */
export function getTopICD10Codes(
  diagnoses: DiagnosisRecord[],
  limit: number = 20,
): {
  rank: number;
  code: string;
  description: string;
  count: number;
  percentage: number;
  chapter: string;
}[] {
  if (!diagnoses || diagnoses.length === 0) {
    return [];
  }

  // Count occurrences of each code
  const codeCounts = new Map<
    string,
    {
      code: string;
      description: string;
      count: number;
    }
  >();

  diagnoses.forEach((d) => {
    if (!d.icd10_code) return;

    const code = normalizeICD10Code(d.icd10_code);
    const existing = codeCounts.get(code);
    if (existing) {
      existing.count++;
    } else {
      codeCounts.set(code, {
        code,
        description: d.icd10_description || d.diagnosis_text || code,
        count: 1,
      });
    }
  });

  const totalWithCodes = diagnoses.filter((d) => d.icd10_code).length;

  // Sort and rank
  return Array.from(codeCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      code: item.code,
      description: item.description,
      count: item.count,
      percentage: totalWithCodes > 0 ? (item.count / totalWithCodes) * 100 : 0,
      chapter: getICD10ChapterTitle(item.code),
    }));
}

/**
 * Group diagnoses by ICD-10 chapter
 */
export function groupDiagnosesByChapter(
  diagnoses: DiagnosisRecord[],
): Map<string, DiagnosisRecord[]> {
  const groups = new Map<string, DiagnosisRecord[]>();

  diagnoses.forEach((diagnosis) => {
    const chapter = getICD10Chapter(diagnosis.icd10_code);
    const chapterKey = chapter
      ? `${chapter.chapter}: ${chapter.title}`
      : 'Uncategorized';

    const existing = groups.get(chapterKey);
    if (existing) {
      existing.push(diagnosis);
    } else {
      groups.set(chapterKey, [diagnosis]);
    }
  });

  return groups;
}

// ==================== COMMON ICD-10 CODES ====================

/**
 * Common ICD-10 codes for quick lookup
 * This is a subset - full implementation would use a database lookup
 */
export const COMMON_ICD10_CODES: ICD10Code[] = [
  // Chapter I - Infectious diseases
  {
    code: 'A09',
    description: 'Infectious gastroenteritis and colitis, unspecified',
    chapter: 'I',
  },
  { code: 'A15.0', description: 'Tuberculosis of lung', chapter: 'I' },
  { code: 'A41.9', description: 'Sepsis, unspecified organism', chapter: 'I' },
  {
    code: 'B20',
    description: 'Human immunodeficiency virus [HIV] disease',
    chapter: 'I',
  },
  { code: 'B34.9', description: 'Viral infection, unspecified', chapter: 'I' },
  { code: 'B54', description: 'Unspecified malaria', chapter: 'I' },

  // Chapter IV - Endocrine
  { code: 'E10', description: 'Type 1 diabetes mellitus', chapter: 'IV' },
  { code: 'E11', description: 'Type 2 diabetes mellitus', chapter: 'IV' },
  {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    chapter: 'IV',
  },
  { code: 'E66.9', description: 'Obesity, unspecified', chapter: 'IV' },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', chapter: 'IV' },

  // Chapter IX - Circulatory
  {
    code: 'I10',
    description: 'Essential (primary) hypertension',
    chapter: 'IX',
  },
  { code: 'I20.9', description: 'Angina pectoris, unspecified', chapter: 'IX' },
  {
    code: 'I21.9',
    description: 'Acute myocardial infarction, unspecified',
    chapter: 'IX',
  },
  {
    code: 'I25.10',
    description: 'Atherosclerotic heart disease of native coronary artery',
    chapter: 'IX',
  },
  {
    code: 'I48.91',
    description: 'Atrial fibrillation, unspecified',
    chapter: 'IX',
  },
  { code: 'I50.9', description: 'Heart failure, unspecified', chapter: 'IX' },
  {
    code: 'I63.9',
    description: 'Cerebral infarction, unspecified',
    chapter: 'IX',
  },

  // Chapter X - Respiratory
  {
    code: 'J00',
    description: 'Acute nasopharyngitis [common cold]',
    chapter: 'X',
  },
  {
    code: 'J06.9',
    description: 'Acute upper respiratory infection, unspecified',
    chapter: 'X',
  },
  {
    code: 'J18.9',
    description: 'Pneumonia, unspecified organism',
    chapter: 'X',
  },
  {
    code: 'J44.1',
    description:
      'Chronic obstructive pulmonary disease with acute exacerbation',
    chapter: 'X',
  },
  {
    code: 'J45.909',
    description: 'Unspecified asthma, uncomplicated',
    chapter: 'X',
  },

  // Chapter XI - Digestive
  {
    code: 'K21.0',
    description: 'Gastro-esophageal reflux disease with esophagitis',
    chapter: 'XI',
  },
  {
    code: 'K29.70',
    description: 'Gastritis, unspecified, without bleeding',
    chapter: 'XI',
  },
  {
    code: 'K35.80',
    description: 'Unspecified acute appendicitis',
    chapter: 'XI',
  },
  {
    code: 'K40.90',
    description: 'Unilateral inguinal hernia, unspecified',
    chapter: 'XI',
  },
  {
    code: 'K80.20',
    description: 'Calculus of gallbladder without cholecystitis',
    chapter: 'XI',
  },

  // Chapter XIII - Musculoskeletal
  { code: 'M54.5', description: 'Low back pain', chapter: 'XIII' },
  { code: 'M79.3', description: 'Panniculitis, unspecified', chapter: 'XIII' },

  // Chapter XIV - Genitourinary
  {
    code: 'N18.9',
    description: 'Chronic kidney disease, unspecified',
    chapter: 'XIV',
  },
  {
    code: 'N39.0',
    description: 'Urinary tract infection, site not specified',
    chapter: 'XIV',
  },

  // Chapter XVIII - Symptoms
  {
    code: 'R10.9',
    description: 'Unspecified abdominal pain',
    chapter: 'XVIII',
  },
  { code: 'R50.9', description: 'Fever, unspecified', chapter: 'XVIII' },
  { code: 'R51', description: 'Headache', chapter: 'XVIII' },

  // Chapter XXI - Factors
  {
    code: 'Z00.00',
    description: 'Encounter for general adult medical examination',
    chapter: 'XXI',
  },
  { code: 'Z23', description: 'Encounter for immunization', chapter: 'XXI' },
  {
    code: 'Z96.1',
    description: 'Presence of intraocular lens',
    chapter: 'XXI',
  },
];

/**
 * Search ICD-10 codes by keyword
 */
export function searchICD10Codes(
  query: string,
  limit: number = 20,
): ICD10Code[] {
  if (!query || query.length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  return COMMON_ICD10_CODES.filter((code) => {
    const codeMatch = code.code.toLowerCase().includes(normalizedQuery);
    const descMatch = code.description.toLowerCase().includes(normalizedQuery);
    return codeMatch || descMatch;
  }).slice(0, limit);
}

/**
 * Get ICD-10 description from common codes
 */
export function getICD10Description(code: string): string {
  const normalizedCode = normalizeICD10Code(code);
  const found = COMMON_ICD10_CODES.find((c) => c.code === normalizedCode);
  return found?.description || '';
}
