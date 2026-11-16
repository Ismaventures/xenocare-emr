/**
 * =============================================================================
 * KEY FINDINGS CONFIGURATION
 * One‐tap abnormal finding chips per specialty.
 * Selecting a chip sets the corresponding field_code to the abnormal value.
 * Doctors only need to tap abnormal chips – normal is the default via Quick Normal.
 * =============================================================================
 */

export interface KeyFinding {
  /** Label shown on the chip */
  label: string;
  /** Template field_code to update */
  fieldCode: string;
  /** Value to write when the chip is active */
  abnormalValue: string;
  /** Value to write when the chip is deactivated (back to normal) */
  normalValue: string;
  /** Icon emoji (lightweight, no import needed) */
  icon?: string;
  /** Tailwind color for the active chip */
  color?: 'red' | 'amber' | 'orange' | 'violet' | 'blue' | 'cyan' | 'pink';
}

export type KeyFindingsMap = Record<string, KeyFinding[]>;

/** ============================================================
 * NEUROPSYCHIATRY / PSYCHIATRY
 * ============================================================ */
const NEUROPSYCHIATRY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Disheveled',
    fieldCode: 'appearance',
    abnormalValue: 'disheveled',
    normalValue: 'well_kempt',
    icon: '👤',
    color: 'amber',
  },
  {
    label: 'Agitated',
    fieldCode: 'psychomotor_activity',
    abnormalValue: 'agitated',
    normalValue: 'normal',
    icon: '⚡',
    color: 'orange',
  },
  {
    label: 'Depressed Mood',
    fieldCode: 'mood',
    abnormalValue: 'depressed',
    normalValue: 'euthymic',
    icon: '😞',
    color: 'blue',
  },
  {
    label: 'Elevated Mood',
    fieldCode: 'mood',
    abnormalValue: 'elevated',
    normalValue: 'euthymic',
    icon: '🔺',
    color: 'amber',
  },
  {
    label: 'Auditory Hallucinations',
    fieldCode: 'auditory_hallucinations',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '👂',
    color: 'violet',
  },
  {
    label: 'Visual Hallucinations',
    fieldCode: 'visual_hallucinations',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '👁️',
    color: 'violet',
  },
  {
    label: 'Delusions',
    fieldCode: 'delusion_type',
    abnormalValue: 'persecutory',
    normalValue: 'none',
    icon: '🧠',
    color: 'red',
  },
  {
    label: 'Suicidal Ideation',
    fieldCode: 'suicidal_ideation',
    abnormalValue: 'passive',
    normalValue: 'absent',
    icon: '⚠️',
    color: 'red',
  },
  {
    label: 'Poor Insight',
    fieldCode: 'insight',
    abnormalValue: 'absent',
    normalValue: 'full',
    icon: '💡',
    color: 'orange',
  },
  {
    label: 'Memory Impaired',
    fieldCode: 'memory',
    abnormalValue: 'impaired',
    normalValue: 'intact',
    icon: '🔵',
    color: 'blue',
  },
];

/** ============================================================
 * CARDIOLOGY
 * ============================================================ */
const CARDIOLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Chest Pain',
    fieldCode: 'chest_pain',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '💔',
    color: 'red',
  },
  {
    label: 'Dyspnoea',
    fieldCode: 'dyspnoea',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '💨',
    color: 'blue',
  },
  {
    label: 'Palpitations',
    fieldCode: 'palpitations',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '💓',
    color: 'orange',
  },
  {
    label: 'Murmur',
    fieldCode: 'heart_murmur',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔊',
    color: 'amber',
  },
  {
    label: 'Irregular Rhythm',
    fieldCode: 'heart_rhythm',
    abnormalValue: 'irregular',
    normalValue: 'regular',
    icon: '📈',
    color: 'red',
  },
  {
    label: 'Pedal Oedema',
    fieldCode: 'pedal_oedema',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🦶',
    color: 'blue',
  },
  {
    label: 'Raised JVP',
    fieldCode: 'jvp',
    abnormalValue: 'elevated',
    normalValue: 'normal',
    icon: '📊',
    color: 'amber',
  },
  {
    label: 'Cyanosis',
    fieldCode: 'cyanosis',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔵',
    color: 'blue',
  },
];

/** ============================================================
 * OPHTHALMOLOGY
 * ============================================================ */
const OPHTHALMOLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Reduced VA (R)',
    fieldCode: 'va_right',
    abnormalValue: '6/60',
    normalValue: '6/6',
    icon: '👁️',
    color: 'amber',
  },
  {
    label: 'Reduced VA (L)',
    fieldCode: 'va_left',
    abnormalValue: '6/60',
    normalValue: '6/6',
    icon: '👁️',
    color: 'amber',
  },
  {
    label: 'Raised IOP (R)',
    fieldCode: 'iop_right',
    abnormalValue: '24',
    normalValue: '14',
    icon: '⬆️',
    color: 'red',
  },
  {
    label: 'Raised IOP (L)',
    fieldCode: 'iop_left',
    abnormalValue: '24',
    normalValue: '14',
    icon: '⬆️',
    color: 'red',
  },
  {
    label: 'Red Eye',
    fieldCode: 'conjunctiva',
    abnormalValue: 'injected',
    normalValue: 'clear',
    icon: '🔴',
    color: 'red',
  },
  {
    label: 'Corneal Opacity',
    fieldCode: 'cornea',
    abnormalValue: 'opacity_present',
    normalValue: 'clear',
    icon: '⚪',
    color: 'blue',
  },
  {
    label: 'Disc Pallor',
    fieldCode: 'optic_disc',
    abnormalValue: 'pale',
    normalValue: 'normal_disc',
    icon: '🟡',
    color: 'amber',
  },
  {
    label: 'Retinal Changes',
    fieldCode: 'retina',
    abnormalValue: 'abnormal',
    normalValue: 'normal_retina',
    icon: '🔎',
    color: 'orange',
  },
];

/** ============================================================
 * PHYSIOTHERAPY
 * ============================================================ */
const PHYSIOTHERAPY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Reduced ROM',
    fieldCode: 'range_of_motion',
    abnormalValue: 'reduced',
    normalValue: 'full',
    icon: '📐',
    color: 'amber',
  },
  {
    label: 'Muscle Weakness',
    fieldCode: 'muscle_strength',
    abnormalValue: 'reduced',
    normalValue: 'normal',
    icon: '💪',
    color: 'orange',
  },
  {
    label: 'Pain on Movement',
    fieldCode: 'pain_on_movement',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔥',
    color: 'red',
  },
  {
    label: 'Swelling',
    fieldCode: 'swelling',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔵',
    color: 'blue',
  },
  {
    label: 'Limping Gait',
    fieldCode: 'gait',
    abnormalValue: 'antalgic',
    normalValue: 'normal',
    icon: '🚶',
    color: 'amber',
  },
  {
    label: 'Spasm',
    fieldCode: 'muscle_spasm',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⚡',
    color: 'orange',
  },
];

/** ============================================================
 * ORTHOPAEDICS
 * ============================================================ */
const ORTHOPAEDICS_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Bony Tenderness',
    fieldCode: 'bony_tenderness',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🦴',
    color: 'red',
  },
  {
    label: 'Deformity',
    fieldCode: 'deformity',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '📐',
    color: 'orange',
  },
  {
    label: 'Limb Shortening',
    fieldCode: 'limb_shortening',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '📏',
    color: 'amber',
  },
  {
    label: 'Joint Instability',
    fieldCode: 'joint_stability',
    abnormalValue: 'unstable',
    normalValue: 'stable',
    icon: '⚡',
    color: 'red',
  },
  {
    label: 'Muscle Wasting',
    fieldCode: 'muscle_wasting',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '💪',
    color: 'blue',
  },
  {
    label: 'Neurovascular Deficit',
    fieldCode: 'neurovascular_status',
    abnormalValue: 'compromised',
    normalValue: 'intact',
    icon: '⚠️',
    color: 'red',
  },
];

/** ============================================================
 * NEUROLOGY
 * ============================================================ */
const NEUROLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Weakness',
    fieldCode: 'motor_power',
    abnormalValue: 'weakness_present',
    normalValue: 'normal_power',
    icon: '💪',
    color: 'red',
  },
  {
    label: 'Sensory Loss',
    fieldCode: 'sensation',
    abnormalValue: 'reduced',
    normalValue: 'intact',
    icon: '🖐️',
    color: 'amber',
  },
  {
    label: 'Abnormal Reflexes',
    fieldCode: 'deep_tendon_reflexes',
    abnormalValue: 'abnormal',
    normalValue: 'normal_reflexes',
    icon: '⚡',
    color: 'orange',
  },
  {
    label: 'Ataxia',
    fieldCode: 'coordination',
    abnormalValue: 'ataxic',
    normalValue: 'normal_coordination',
    icon: '🦶',
    color: 'blue',
  },
  {
    label: 'Cranial Nerve Palsy',
    fieldCode: 'cranial_nerves',
    abnormalValue: 'abnormal',
    normalValue: 'intact',
    icon: '🧠',
    color: 'violet',
  },
  {
    label: 'Papilloedema',
    fieldCode: 'fundoscopy',
    abnormalValue: 'papilloedema',
    normalValue: 'normal_discs',
    icon: '👁️',
    color: 'red',
  },
];

/** ============================================================
 * DERMATOLOGY
 * ============================================================ */
const DERMATOLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Erythema',
    fieldCode: 'skin_color',
    abnormalValue: 'erythematous',
    normalValue: 'normal',
    icon: '🔴',
    color: 'red',
  },
  {
    label: 'Scaling',
    fieldCode: 'surface',
    abnormalValue: 'scaly',
    normalValue: 'smooth',
    icon: '🌊',
    color: 'amber',
  },
  {
    label: 'Vesicles/Blisters',
    fieldCode: 'lesion_type',
    abnormalValue: 'vesicular',
    normalValue: 'none',
    icon: '💧',
    color: 'blue',
  },
  {
    label: 'Ulceration',
    fieldCode: 'ulceration',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⚠️',
    color: 'orange',
  },
  {
    label: 'Hyperpigmentation',
    fieldCode: 'pigmentation',
    abnormalValue: 'hyperpigmented',
    normalValue: 'normal_pigment',
    icon: '🌑',
    color: 'blue',
  },
  {
    label: 'Pruritus',
    fieldCode: 'pruritus',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🖐️',
    color: 'pink',
  },
];

/** ============================================================
 * GASTROENTEROLOGY
 * ============================================================ */
const GASTROENTEROLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Tenderness',
    fieldCode: 'abdominal_tenderness',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔥',
    color: 'red',
  },
  {
    label: 'Guarding',
    fieldCode: 'guarding',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⚠️',
    color: 'red',
  },
  {
    label: 'Organomegaly',
    fieldCode: 'organomegaly',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '📊',
    color: 'orange',
  },
  {
    label: 'Ascites',
    fieldCode: 'ascites',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🌊',
    color: 'blue',
  },
  {
    label: 'Bowel Sounds ↓',
    fieldCode: 'bowel_sounds',
    abnormalValue: 'reduced',
    normalValue: 'normal',
    icon: '🔊',
    color: 'amber',
  },
  {
    label: 'Jaundice',
    fieldCode: 'jaundice',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🟡',
    color: 'amber',
  },
];

/** ============================================================
 * ENT
 * ============================================================ */
const ENT_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Hearing Loss',
    fieldCode: 'hearing',
    abnormalValue: 'reduced',
    normalValue: 'normal',
    icon: '👂',
    color: 'amber',
  },
  {
    label: 'Tympanic Perforation',
    fieldCode: 'tympanic_membrane',
    abnormalValue: 'perforated',
    normalValue: 'intact',
    icon: '⭕',
    color: 'red',
  },
  {
    label: 'Nasal Polyp',
    fieldCode: 'nasal_cavity',
    abnormalValue: 'polyp',
    normalValue: 'clear',
    icon: '🔴',
    color: 'orange',
  },
  {
    label: 'Pharyngeal Erythema',
    fieldCode: 'pharynx',
    abnormalValue: 'erythematous',
    normalValue: 'normal',
    icon: '🔴',
    color: 'red',
  },
  {
    label: 'Tonsillar Hypertrophy',
    fieldCode: 'tonsils',
    abnormalValue: 'hypertrophied',
    normalValue: 'normal_size',
    icon: '⬆️',
    color: 'amber',
  },
  {
    label: 'Neck Node',
    fieldCode: 'cervical_lymph_nodes',
    abnormalValue: 'enlarged',
    normalValue: 'not_palpable',
    icon: '🔵',
    color: 'blue',
  },
];

/** ============================================================
 * GYNAECOLOGY
 * ============================================================ */
const GYNAECOLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Adnexal Mass',
    fieldCode: 'adnexal_tenderness',
    abnormalValue: 'mass_present',
    normalValue: 'no_tenderness',
    icon: '⭕',
    color: 'red',
  },
  {
    label: 'Cervical Tenderness',
    fieldCode: 'cervical_motion_tenderness',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⚠️',
    color: 'orange',
  },
  {
    label: 'Uterine Enlargement',
    fieldCode: 'uterine_size',
    abnormalValue: 'enlarged',
    normalValue: 'normal_size',
    icon: '📊',
    color: 'amber',
  },
  {
    label: 'Abnormal Discharge',
    fieldCode: 'vaginal_discharge',
    abnormalValue: 'abnormal',
    normalValue: 'normal',
    icon: '⚠️',
    color: 'orange',
  },
  {
    label: 'PV Bleeding',
    fieldCode: 'bleeding',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔴',
    color: 'red',
  },
];

/** ============================================================
 * GENERAL SURGERY
 * ============================================================ */
const GENERAL_SURGERY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Mass/Lump',
    fieldCode: 'mass',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⭕',
    color: 'red',
  },
  {
    label: 'Tenderness',
    fieldCode: 'tenderness',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔥',
    color: 'red',
  },
  {
    label: 'Wound Breakdown',
    fieldCode: 'wound',
    abnormalValue: 'broken_down',
    normalValue: 'healing',
    icon: '⚠️',
    color: 'orange',
  },
  {
    label: 'Hernia',
    fieldCode: 'hernia',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔵',
    color: 'blue',
  },
  {
    label: 'Lymphadenopathy',
    fieldCode: 'lymphadenopathy',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔵',
    color: 'amber',
  },
];

/** ============================================================
 * NEPHROLOGY
 * ============================================================ */
const NEPHROLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Oedema',
    fieldCode: 'oedema',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '💧',
    color: 'blue',
  },
  {
    label: 'Renal Angle Tenderness',
    fieldCode: 'renal_angle_tenderness',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔥',
    color: 'red',
  },
  {
    label: 'Oliguria',
    fieldCode: 'urine_output',
    abnormalValue: 'oliguria',
    normalValue: 'normal_output',
    icon: '📉',
    color: 'amber',
  },
  {
    label: 'Hypertension',
    fieldCode: 'blood_pressure',
    abnormalValue: 'hypertensive',
    normalValue: 'normotensive',
    icon: '📈',
    color: 'red',
  },
  {
    label: 'Pallor',
    fieldCode: 'pallor',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⬜',
    color: 'blue',
  },
];

/** ============================================================
 * ENDOCRINOLOGY
 * ============================================================ */
const ENDOCRINOLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Goitre',
    fieldCode: 'thyroid_size',
    abnormalValue: 'goitre',
    normalValue: 'normal_thyroid',
    icon: '🔵',
    color: 'blue',
  },
  {
    label: 'Exophthalmos',
    fieldCode: 'eyes_thyroid',
    abnormalValue: 'exophthalmos',
    normalValue: 'normal',
    icon: '👁️',
    color: 'amber',
  },
  {
    label: 'Acanthosis',
    fieldCode: 'skin_changes',
    abnormalValue: 'acanthosis_nigricans',
    normalValue: 'normal',
    icon: '🌑',
    color: 'blue',
  },
  {
    label: 'Diabetic Foot',
    fieldCode: 'foot_exam',
    abnormalValue: 'diabetic_changes',
    normalValue: 'normal',
    icon: '🦶',
    color: 'red',
  },
  {
    label: 'Buffalo Hump',
    fieldCode: 'body_habitus',
    abnormalValue: 'cushinoid',
    normalValue: 'normal_habitus',
    icon: '📊',
    color: 'orange',
  },
];

/** ============================================================
 * PULMONOLOGY
 * ============================================================ */
const PULMONOLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Wheeze',
    fieldCode: 'breath_sounds',
    abnormalValue: 'wheeze',
    normalValue: 'clear',
    icon: '📣',
    color: 'amber',
  },
  {
    label: 'Crepitations',
    fieldCode: 'added_sounds',
    abnormalValue: 'crepitations',
    normalValue: 'none',
    icon: '🔊',
    color: 'blue',
  },
  {
    label: 'Reduced Air Entry',
    fieldCode: 'air_entry',
    abnormalValue: 'reduced',
    normalValue: 'equal_bilateral',
    icon: '📉',
    color: 'orange',
  },
  {
    label: 'Tracheal Deviation',
    fieldCode: 'trachea',
    abnormalValue: 'deviated',
    normalValue: 'central',
    icon: '↔️',
    color: 'red',
  },
  {
    label: 'Respiratory Distress',
    fieldCode: 'respiratory_pattern',
    abnormalValue: 'distressed',
    normalValue: 'unlaboured',
    icon: '💨',
    color: 'red',
  },
  {
    label: 'Clubbing',
    fieldCode: 'clubbing',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🖐️',
    color: 'amber',
  },
];

/** ============================================================
 * UROLOGY
 * ============================================================ */
const UROLOGY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Enlarged Prostate',
    fieldCode: 'prostate',
    abnormalValue: 'enlarged',
    normalValue: 'normal_size',
    icon: '📊',
    color: 'amber',
  },
  {
    label: 'Scrotal Swelling',
    fieldCode: 'scrotum',
    abnormalValue: 'swelling_present',
    normalValue: 'normal',
    icon: '⭕',
    color: 'orange',
  },
  {
    label: 'Loin Tenderness',
    fieldCode: 'loin_tenderness',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔥',
    color: 'red',
  },
  {
    label: 'Haematuria',
    fieldCode: 'urine_appearance',
    abnormalValue: 'haematuria',
    normalValue: 'clear',
    icon: '🔴',
    color: 'red',
  },
  {
    label: 'Retention Signs',
    fieldCode: 'bladder',
    abnormalValue: 'palpable_bladder',
    normalValue: 'not_palpable',
    icon: '💧',
    color: 'blue',
  },
];

/** ============================================================
 * PAEDIATRICS
 * ============================================================ */
const PAEDIATRICS_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Tachycardia',
    fieldCode: 'heart_rate',
    abnormalValue: 'tachycardia',
    normalValue: 'normal_rate',
    icon: '💓',
    color: 'red',
  },
  {
    label: 'Pallor',
    fieldCode: 'pallor',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⬜',
    color: 'blue',
  },
  {
    label: 'Jaundice',
    fieldCode: 'jaundice',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🟡',
    color: 'amber',
  },
  {
    label: 'Wasting',
    fieldCode: 'nutritional_status',
    abnormalValue: 'wasted',
    normalValue: 'well_nourished',
    icon: '📉',
    color: 'orange',
  },
  {
    label: 'Dehydration',
    fieldCode: 'hydration',
    abnormalValue: 'dehydrated',
    normalValue: 'well_hydrated',
    icon: '💧',
    color: 'amber',
  },
  {
    label: 'Fontanelle Bulging',
    fieldCode: 'fontanelle',
    abnormalValue: 'bulging',
    normalValue: 'flat',
    icon: '⬆️',
    color: 'red',
  },
];

/** ============================================================
 * ORAL & MAXILLOFACIAL
 * ============================================================ */
const ORAL_MAXILLOFACIAL_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Swelling',
    fieldCode: 'facial_swelling',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔵',
    color: 'blue',
  },
  {
    label: 'Trismus',
    fieldCode: 'mouth_opening',
    abnormalValue: 'trismus',
    normalValue: 'normal_opening',
    icon: '⚠️',
    color: 'orange',
  },
  {
    label: 'Dental Caries',
    fieldCode: 'dentition',
    abnormalValue: 'caries_present',
    normalValue: 'intact',
    icon: '🦷',
    color: 'amber',
  },
  {
    label: 'Pericoronitis',
    fieldCode: 'pericoronitis',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '🔥',
    color: 'red',
  },
  {
    label: 'Ulcer',
    fieldCode: 'oral_mucosa',
    abnormalValue: 'ulcerated',
    normalValue: 'normal',
    icon: '⭕',
    color: 'red',
  },
];

/** ============================================================
 * NEUROSURGERY
 * ============================================================ */
const NEUROSURGERY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'GCS Reduced',
    fieldCode: 'gcs_total',
    abnormalValue: '12',
    normalValue: '15',
    icon: '🧠',
    color: 'red',
  },
  {
    label: 'Hemiplegia',
    fieldCode: 'motor_deficit',
    abnormalValue: 'hemiplegia',
    normalValue: 'none',
    icon: '💪',
    color: 'red',
  },
  {
    label: 'Meningism',
    fieldCode: 'meningeal_signs',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '⚠️',
    color: 'red',
  },
  {
    label: 'Papilloedema',
    fieldCode: 'fundoscopy',
    abnormalValue: 'papilloedema',
    normalValue: 'normal',
    icon: '👁️',
    color: 'orange',
  },
  {
    label: 'Pupil Asymmetry',
    fieldCode: 'pupils',
    abnormalValue: 'unequal',
    normalValue: 'equal_reactive',
    icon: '👁️',
    color: 'red',
  },
];

/** ============================================================
 * PLASTIC SURGERY
 * ============================================================ */
const PLASTIC_SURGERY_KEY_FINDINGS: KeyFinding[] = [
  {
    label: 'Wound Infection',
    fieldCode: 'wound_condition',
    abnormalValue: 'infected',
    normalValue: 'clean',
    icon: '🔴',
    color: 'red',
  },
  {
    label: 'Scar Hypertrophy',
    fieldCode: 'scar',
    abnormalValue: 'hypertrophic',
    normalValue: 'flat',
    icon: '📈',
    color: 'orange',
  },
  {
    label: 'Flap Congestion',
    fieldCode: 'flap_vascularity',
    abnormalValue: 'congested',
    normalValue: 'viable',
    icon: '🔵',
    color: 'blue',
  },
  {
    label: 'Contracture',
    fieldCode: 'contracture',
    abnormalValue: 'present',
    normalValue: 'absent',
    icon: '📐',
    color: 'amber',
  },
  {
    label: 'Sensory Deficit',
    fieldCode: 'sensation',
    abnormalValue: 'reduced',
    normalValue: 'intact',
    icon: '🖐️',
    color: 'amber',
  },
];

/** ============================================================
 * MASTER MAP
 * ============================================================ */
export const KEY_FINDINGS_MAP: KeyFindingsMap = {
  NEUROPSYCHIATRY: NEUROPSYCHIATRY_KEY_FINDINGS,
  CARDIOLOGY: CARDIOLOGY_KEY_FINDINGS,
  OPHTHALMOLOGY: OPHTHALMOLOGY_KEY_FINDINGS,
  PHYSIOTHERAPY: PHYSIOTHERAPY_KEY_FINDINGS,
  ORTHOPAEDICS: ORTHOPAEDICS_KEY_FINDINGS,
  NEUROLOGY: NEUROLOGY_KEY_FINDINGS,
  DERMATOLOGY: DERMATOLOGY_KEY_FINDINGS,
  GASTROENTEROLOGY: GASTROENTEROLOGY_KEY_FINDINGS,
  ENT: ENT_KEY_FINDINGS,
  GYNAECOLOGY: GYNAECOLOGY_KEY_FINDINGS,
  GENERAL_SURGERY: GENERAL_SURGERY_KEY_FINDINGS,
  NEPHROLOGY: NEPHROLOGY_KEY_FINDINGS,
  ENDOCRINOLOGY: ENDOCRINOLOGY_KEY_FINDINGS,
  PULMONOLOGY: PULMONOLOGY_KEY_FINDINGS,
  UROLOGY: UROLOGY_KEY_FINDINGS,
  PAEDIATRICS: PAEDIATRICS_KEY_FINDINGS,
  ORAL_MAXILLOFACIAL: ORAL_MAXILLOFACIAL_KEY_FINDINGS,
  NEUROSURGERY: NEUROSURGERY_KEY_FINDINGS,
  PLASTIC_SURGERY: PLASTIC_SURGERY_KEY_FINDINGS,
};

export function getKeyFindings(specialtyCode: string): KeyFinding[] {
  return KEY_FINDINGS_MAP[specialtyCode] ?? [];
}
