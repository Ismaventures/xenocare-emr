// =============================================================================
// Chief Complaints Constants
// Standardized list of presenting complaints grouped by category
// =============================================================================

import { ComplaintCategory, DurationUnit } from '../../../types/database.types';

// =============================================================================
// COMPLAINT DEFINITIONS
// =============================================================================

export interface ChiefComplaintOption {
  id: string;
  name: string;
  code: string;
  category: ComplaintCategory;
}

// Category display names for UI
export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  General: 'General',
  Pain: 'Pain',
  Respiratory: 'Respiratory',
  Cardiovascular: 'Cardiovascular',
  Gastrointestinal: 'Gastrointestinal',
  Neurological: 'Neurological',
  Genitourinary: 'Genitourinary',
  Obstetrics_Gynecology: 'Obstetrics & Gynecology',
  Musculoskeletal: 'Musculoskeletal',
  Dermatology: 'Dermatology',
  Mental_Health: 'Mental Health',
  Trauma_Emergency: 'Trauma / Emergency',
};

// Category colors for UI badges
export const COMPLAINT_CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  General: 'bg-gray-100 text-gray-700',
  Pain: 'bg-red-100 text-red-700',
  Respiratory: 'bg-blue-100 text-blue-700',
  Cardiovascular: 'bg-pink-100 text-pink-700',
  Gastrointestinal: 'bg-amber-100 text-amber-700',
  Neurological: 'bg-purple-100 text-purple-700',
  Genitourinary: 'bg-yellow-100 text-yellow-700',
  Obstetrics_Gynecology: 'bg-rose-100 text-rose-700',
  Musculoskeletal: 'bg-orange-100 text-orange-700',
  Dermatology: 'bg-teal-100 text-teal-700',
  Mental_Health: 'bg-indigo-100 text-indigo-700',
  Trauma_Emergency: 'bg-red-200 text-red-800',
};

// Duration unit options
export const DURATION_UNITS: {
  value: DurationUnit;
  label: string;
  short: string;
}[] = [
  { value: 'Hours', label: 'Hours', short: 'Hrs' },
  { value: 'Days', label: 'Days', short: 'Days' },
  { value: 'Weeks', label: 'Weeks', short: 'Wks' },
  { value: 'Months', label: 'Months', short: 'Mos' },
];

// =============================================================================
// STANDARD CHIEF COMPLAINTS (matching database seed)
// =============================================================================

export const CHIEF_COMPLAINTS: ChiefComplaintOption[] = [
  // General
  { id: 'GEN-001', name: 'Fever', code: 'GEN-001', category: 'General' },
  { id: 'GEN-002', name: 'Weakness', code: 'GEN-002', category: 'General' },
  { id: 'GEN-003', name: 'Fatigue', code: 'GEN-003', category: 'General' },
  { id: 'GEN-004', name: 'Malaise', code: 'GEN-004', category: 'General' },
  { id: 'GEN-005', name: 'Weight Loss', code: 'GEN-005', category: 'General' },
  { id: 'GEN-006', name: 'Weight Gain', code: 'GEN-006', category: 'General' },
  { id: 'GEN-007', name: 'Night Sweats', code: 'GEN-007', category: 'General' },
  {
    id: 'GEN-008',
    name: 'Loss of Appetite',
    code: 'GEN-008',
    category: 'General',
  },

  // Pain
  { id: 'PAIN-001', name: 'Headache', code: 'PAIN-001', category: 'Pain' },
  { id: 'PAIN-002', name: 'Chest Pain', code: 'PAIN-002', category: 'Pain' },
  {
    id: 'PAIN-003',
    name: 'Abdominal Pain',
    code: 'PAIN-003',
    category: 'Pain',
  },
  { id: 'PAIN-004', name: 'Back Pain', code: 'PAIN-004', category: 'Pain' },
  { id: 'PAIN-005', name: 'Neck Pain', code: 'PAIN-005', category: 'Pain' },
  {
    id: 'PAIN-006',
    name: 'Generalized Body Pain',
    code: 'PAIN-006',
    category: 'Pain',
  },
  { id: 'PAIN-007', name: 'Flank Pain', code: 'PAIN-007', category: 'Pain' },
  { id: 'PAIN-008', name: 'Pelvic Pain', code: 'PAIN-008', category: 'Pain' },

  // Respiratory
  { id: 'RESP-001', name: 'Cough', code: 'RESP-001', category: 'Respiratory' },
  {
    id: 'RESP-002',
    name: 'Shortness of Breath',
    code: 'RESP-002',
    category: 'Respiratory',
  },
  {
    id: 'RESP-003',
    name: 'Wheezing',
    code: 'RESP-003',
    category: 'Respiratory',
  },
  {
    id: 'RESP-004',
    name: 'Sore Throat',
    code: 'RESP-004',
    category: 'Respiratory',
  },
  {
    id: 'RESP-005',
    name: 'Runny Nose',
    code: 'RESP-005',
    category: 'Respiratory',
  },
  {
    id: 'RESP-006',
    name: 'Nasal Congestion',
    code: 'RESP-006',
    category: 'Respiratory',
  },
  {
    id: 'RESP-007',
    name: 'Coughing Blood',
    code: 'RESP-007',
    category: 'Respiratory',
  },
  {
    id: 'RESP-008',
    name: 'Difficulty Breathing',
    code: 'RESP-008',
    category: 'Respiratory',
  },

  // Cardiovascular
  {
    id: 'CARD-001',
    name: 'Palpitations',
    code: 'CARD-001',
    category: 'Cardiovascular',
  },
  {
    id: 'CARD-002',
    name: 'Leg Swelling',
    code: 'CARD-002',
    category: 'Cardiovascular',
  },
  {
    id: 'CARD-003',
    name: 'Fainting',
    code: 'CARD-003',
    category: 'Cardiovascular',
  },
  {
    id: 'CARD-004',
    name: 'Fast Heartbeat',
    code: 'CARD-004',
    category: 'Cardiovascular',
  },
  {
    id: 'CARD-005',
    name: 'Slow Heartbeat',
    code: 'CARD-005',
    category: 'Cardiovascular',
  },
  {
    id: 'CARD-006',
    name: 'Irregular Heartbeat',
    code: 'CARD-006',
    category: 'Cardiovascular',
  },

  // Gastrointestinal
  {
    id: 'GI-001',
    name: 'Vomiting',
    code: 'GI-001',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-002',
    name: 'Nausea',
    code: 'GI-002',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-003',
    name: 'Diarrhea',
    code: 'GI-003',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-004',
    name: 'Constipation',
    code: 'GI-004',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-005',
    name: 'Bloating',
    code: 'GI-005',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-006',
    name: 'Heartburn',
    code: 'GI-006',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-007',
    name: 'Difficulty Swallowing',
    code: 'GI-007',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-008',
    name: 'Blood in Stool',
    code: 'GI-008',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-009',
    name: 'Black Stool',
    code: 'GI-009',
    category: 'Gastrointestinal',
  },
  {
    id: 'GI-010',
    name: 'Jaundice',
    code: 'GI-010',
    category: 'Gastrointestinal',
  },

  // Neurological
  {
    id: 'NEURO-001',
    name: 'Dizziness',
    code: 'NEURO-001',
    category: 'Neurological',
  },
  {
    id: 'NEURO-002',
    name: 'Seizure',
    code: 'NEURO-002',
    category: 'Neurological',
  },
  {
    id: 'NEURO-003',
    name: 'Loss of Consciousness',
    code: 'NEURO-003',
    category: 'Neurological',
  },
  {
    id: 'NEURO-004',
    name: 'Numbness',
    code: 'NEURO-004',
    category: 'Neurological',
  },
  {
    id: 'NEURO-005',
    name: 'Tingling',
    code: 'NEURO-005',
    category: 'Neurological',
  },
  {
    id: 'NEURO-006',
    name: 'Tremors',
    code: 'NEURO-006',
    category: 'Neurological',
  },
  {
    id: 'NEURO-007',
    name: 'Memory Loss',
    code: 'NEURO-007',
    category: 'Neurological',
  },
  {
    id: 'NEURO-008',
    name: 'Confusion',
    code: 'NEURO-008',
    category: 'Neurological',
  },
  {
    id: 'NEURO-009',
    name: 'Vision Changes',
    code: 'NEURO-009',
    category: 'Neurological',
  },
  {
    id: 'NEURO-010',
    name: 'Speech Difficulty',
    code: 'NEURO-010',
    category: 'Neurological',
  },

  // Genitourinary
  {
    id: 'GU-001',
    name: 'Painful Urination',
    code: 'GU-001',
    category: 'Genitourinary',
  },
  {
    id: 'GU-002',
    name: 'Frequent Urination',
    code: 'GU-002',
    category: 'Genitourinary',
  },
  {
    id: 'GU-003',
    name: 'Blood in Urine',
    code: 'GU-003',
    category: 'Genitourinary',
  },
  {
    id: 'GU-004',
    name: 'Urinary Incontinence',
    code: 'GU-004',
    category: 'Genitourinary',
  },
  {
    id: 'GU-005',
    name: 'Difficulty Urinating',
    code: 'GU-005',
    category: 'Genitourinary',
  },
  {
    id: 'GU-006',
    name: 'Genital Discharge',
    code: 'GU-006',
    category: 'Genitourinary',
  },
  {
    id: 'GU-007',
    name: 'Genital Sores',
    code: 'GU-007',
    category: 'Genitourinary',
  },

  // Obstetrics & Gynecology
  {
    id: 'OBG-001',
    name: 'Lower Abdominal Pain',
    code: 'OBG-001',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-002',
    name: 'Vaginal Bleeding',
    code: 'OBG-002',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-003',
    name: 'Missed Period',
    code: 'OBG-003',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-004',
    name: 'Vaginal Discharge',
    code: 'OBG-004',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-005',
    name: 'Breast Lump',
    code: 'OBG-005',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-006',
    name: 'Breast Pain',
    code: 'OBG-006',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-007',
    name: 'Menstrual Irregularity',
    code: 'OBG-007',
    category: 'Obstetrics_Gynecology',
  },
  {
    id: 'OBG-008',
    name: 'Pregnancy Test Request',
    code: 'OBG-008',
    category: 'Obstetrics_Gynecology',
  },

  // Musculoskeletal
  {
    id: 'MSK-001',
    name: 'Joint Pain',
    code: 'MSK-001',
    category: 'Musculoskeletal',
  },
  {
    id: 'MSK-002',
    name: 'Injury',
    code: 'MSK-002',
    category: 'Musculoskeletal',
  },
  {
    id: 'MSK-003',
    name: 'Muscle Pain',
    code: 'MSK-003',
    category: 'Musculoskeletal',
  },
  {
    id: 'MSK-004',
    name: 'Joint Swelling',
    code: 'MSK-004',
    category: 'Musculoskeletal',
  },
  {
    id: 'MSK-005',
    name: 'Limited Range of Motion',
    code: 'MSK-005',
    category: 'Musculoskeletal',
  },
  {
    id: 'MSK-006',
    name: 'Bone Pain',
    code: 'MSK-006',
    category: 'Musculoskeletal',
  },

  // Dermatology
  { id: 'DERM-001', name: 'Rash', code: 'DERM-001', category: 'Dermatology' },
  {
    id: 'DERM-002',
    name: 'Itching',
    code: 'DERM-002',
    category: 'Dermatology',
  },
  {
    id: 'DERM-003',
    name: 'Skin Lesion',
    code: 'DERM-003',
    category: 'Dermatology',
  },
  {
    id: 'DERM-004',
    name: 'Hair Loss',
    code: 'DERM-004',
    category: 'Dermatology',
  },
  {
    id: 'DERM-005',
    name: 'Skin Discoloration',
    code: 'DERM-005',
    category: 'Dermatology',
  },
  { id: 'DERM-006', name: 'Wound', code: 'DERM-006', category: 'Dermatology' },
  {
    id: 'DERM-007',
    name: 'Abscess',
    code: 'DERM-007',
    category: 'Dermatology',
  },

  // Mental Health
  { id: 'MH-001', name: 'Anxiety', code: 'MH-001', category: 'Mental_Health' },
  {
    id: 'MH-002',
    name: 'Depression',
    code: 'MH-002',
    category: 'Mental_Health',
  },
  { id: 'MH-003', name: 'Insomnia', code: 'MH-003', category: 'Mental_Health' },
  {
    id: 'MH-004',
    name: 'Suicidal Thoughts',
    code: 'MH-004',
    category: 'Mental_Health',
  },
  {
    id: 'MH-005',
    name: 'Hallucinations',
    code: 'MH-005',
    category: 'Mental_Health',
  },
  {
    id: 'MH-006',
    name: 'Aggressive Behavior',
    code: 'MH-006',
    category: 'Mental_Health',
  },
  {
    id: 'MH-007',
    name: 'Substance Abuse',
    code: 'MH-007',
    category: 'Mental_Health',
  },

  // Trauma / Emergency
  {
    id: 'TRA-001',
    name: 'Road Traffic Accident',
    code: 'TRA-001',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-002',
    name: 'Fall',
    code: 'TRA-002',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-003',
    name: 'Assault',
    code: 'TRA-003',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-004',
    name: 'Burns',
    code: 'TRA-004',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-005',
    name: 'Drowning',
    code: 'TRA-005',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-006',
    name: 'Electric Shock',
    code: 'TRA-006',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-007',
    name: 'Poisoning',
    code: 'TRA-007',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-008',
    name: 'Snake Bite',
    code: 'TRA-008',
    category: 'Trauma_Emergency',
  },
  {
    id: 'TRA-009',
    name: 'Dog Bite',
    code: 'TRA-009',
    category: 'Trauma_Emergency',
  },
];

// Get complaints by category
export const getComplaintsByCategory = (
  category: ComplaintCategory,
): ChiefComplaintOption[] => {
  return CHIEF_COMPLAINTS.filter((c) => c.category === category);
};

// Get all categories
export const getComplaintCategories = (): ComplaintCategory[] => {
  return Object.keys(COMPLAINT_CATEGORY_LABELS) as ComplaintCategory[];
};

// Get category color
export const getComplaintCategoryColor = (
  category: ComplaintCategory,
): string => {
  return COMPLAINT_CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700';
};

// Get category label
export const getComplaintCategoryLabel = (
  category: ComplaintCategory,
): string => {
  return COMPLAINT_CATEGORY_LABELS[category] || category;
};
