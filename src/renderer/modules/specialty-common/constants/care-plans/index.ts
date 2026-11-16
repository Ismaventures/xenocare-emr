/**
 * =============================================================================
 * SPECIALTY CARE PLAN CONFIGS
 * =============================================================================
 * Config-driven care plan support per specialty.
 * The consultation wizard reads this to decide whether to show the care plan
 * form section and what options to render — no per-specialty if/else needed.
 *
 * Specialties listed here have "Secondary C" longitudinal workflow.
 * =============================================================================
 */

export interface CarePlanPlanType {
  value: string;
  label: string;
}

export interface CarePlanTherapyType {
  value: string;
  label: string;
}

export interface SpecialtyCarePlanConfig {
  /** Specialty code — must match SpecialtyCode enum */
  specialty_code: string;
  /** Section header shown in the wizard Diagnosis step */
  section_title: string;
  /** Short description shown under the toggle */
  section_description: string;
  /** Tailwind color prefix used for the section card (violet, blue, teal, etc.) */
  color:
    | 'violet'
    | 'blue'
    | 'teal'
    | 'emerald'
    | 'rose'
    | 'amber'
    | 'indigo'
    | 'cyan'
    | 'orange';
  /** Plan type dropdown options */
  plan_types: CarePlanPlanType[];
  /** Whether to include the therapy type dropdown */
  include_therapy_type: boolean;
  therapy_types?: CarePlanTherapyType[];
  /** Whether to include the safety plan text field */
  include_safety_plan: boolean;
  /** Whether to show a medications summary field */
  include_medications: boolean;
  /** Default follow-up frequency */
  default_frequency: string;
  /** Default expected duration */
  default_duration: string;
}

// =============================================================================
// NEUROPSYCHIATRY
// =============================================================================
export const NEUROPSYCHIATRY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'NEUROPSYCHIATRY',
  section_title: 'Psychiatric Care Plan',
  section_description:
    'Set up a longitudinal psychiatric treatment plan for this patient',
  color: 'violet',
  plan_types: [
    { value: 'major_depressive_disorder', label: 'Major Depressive Disorder' },
    { value: 'bipolar_disorder', label: 'Bipolar Disorder' },
    { value: 'anxiety_disorder', label: 'Anxiety Disorder' },
    { value: 'schizophrenia', label: 'Schizophrenia / Psychotic Disorder' },
    { value: 'ptsd', label: 'PTSD / Trauma-Related' },
    { value: 'ocd', label: 'OCD' },
    { value: 'substance_use', label: 'Substance Use Disorder' },
    { value: 'personality_disorder', label: 'Personality Disorder' },
    { value: 'neurocognitive', label: 'Neurocognitive Disorder / Dementia' },
    { value: 'other_psychiatric', label: 'Other Psychiatric Condition' },
  ],
  include_therapy_type: true,
  therapy_types: [
    { value: 'cbt', label: 'Cognitive Behavioural Therapy (CBT)' },
    { value: 'dbt', label: 'Dialectical Behaviour Therapy (DBT)' },
    { value: 'supportive', label: 'Supportive Therapy' },
    { value: 'psychodynamic', label: 'Psychodynamic Therapy' },
    { value: 'ect', label: 'Electroconvulsive Therapy (ECT)' },
    { value: 'group', label: 'Group Therapy' },
    { value: 'family', label: 'Family Therapy' },
    { value: 'other', label: 'Other' },
  ],
  include_safety_plan: true,
  include_medications: true,
  default_frequency: 'Monthly',
  default_duration: '6 months',
};

// =============================================================================
// CARDIOLOGY — heart failure / hypertension management
// =============================================================================
export const CARDIOLOGY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'CARDIOLOGY',
  section_title: 'Cardiology Management Plan',
  section_description:
    'Set up a longitudinal cardiac follow-up plan (heart failure, AF management, etc.)',
  color: 'rose',
  plan_types: [
    { value: 'heart_failure', label: 'Heart Failure Management' },
    { value: 'af_management', label: 'Atrial Fibrillation Management' },
    { value: 'hypertension', label: 'Hypertension Management' },
    { value: 'ihd', label: 'Ischaemic Heart Disease Follow-up' },
    { value: 'post_mi', label: 'Post-MI Cardiac Rehabilitation' },
    { value: 'cardiomyopathy', label: 'Cardiomyopathy Follow-up' },
    { value: 'valve_disease', label: 'Valvular Heart Disease' },
    { value: 'other_cardiac', label: 'Other Cardiac Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 3 months',
  default_duration: '1 year',
};

// =============================================================================
// OPHTHALMOLOGY — glaucoma / post-surgical follow-up
// =============================================================================
export const OPHTHALMOLOGY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'OPHTHALMOLOGY',
  section_title: 'Ophthalmology Follow-up Plan',
  section_description:
    'Set up a longitudinal eye care plan (glaucoma, post-op, diabetic retinopathy)',
  color: 'cyan',
  plan_types: [
    { value: 'glaucoma', label: 'Glaucoma Management' },
    { value: 'diabetic_retinopathy', label: 'Diabetic Retinopathy Follow-up' },
    { value: 'post_cataract', label: 'Post-Cataract Surgery Follow-up' },
    { value: 'post_laser', label: 'Post-Laser Treatment Follow-up' },
    {
      value: 'macular_degeneration',
      label: 'Age-Related Macular Degeneration',
    },
    { value: 'amblyopia', label: 'Amblyopia (Lazy Eye) Treatment' },
    { value: 'intravitreal', label: 'Intravitreal Injection Programme' },
    { value: 'other_ophthalmic', label: 'Other Ophthalmic Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 3 months',
  default_duration: 'Ongoing',
};

// =============================================================================
// GYNAECOLOGY — cervical screening pathway
// =============================================================================
export const GYNAECOLOGY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'GYNAECOLOGY',
  section_title: 'Gynaecology Follow-up Plan',
  section_description: 'Set up a longitudinal gynaecological management plan',
  color: 'rose',
  plan_types: [
    { value: 'cervical_screening', label: 'Cervical Screening Pathway' },
    { value: 'fertility', label: 'Fertility / Subfertility Management' },
    { value: 'menorrhagia', label: 'Menorrhagia Management' },
    { value: 'endometriosis', label: 'Endometriosis Follow-up' },
    { value: 'fibroids', label: 'Uterine Fibroids Follow-up' },
    { value: 'pcos', label: 'PCOS Management' },
    { value: 'post_surgical', label: 'Post-Surgical Gynaecology Follow-up' },
    { value: 'other_gynae', label: 'Other Gynaecological Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 3 months',
  default_duration: '1 year',
};

// =============================================================================
// NEPHROLOGY — dialysis / CKD management
// =============================================================================
export const NEPHROLOGY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'NEPHROLOGY',
  section_title: 'Nephrology Management Plan',
  section_description:
    'Set up a longitudinal renal care plan (CKD, dialysis, post-transplant)',
  color: 'blue',
  plan_types: [
    { value: 'ckd_management', label: 'CKD Management (G1-G5)' },
    { value: 'haemodialysis', label: 'Haemodialysis Programme' },
    { value: 'peritoneal_dialysis', label: 'Peritoneal Dialysis Programme' },
    { value: 'post_transplant', label: 'Post-Transplant Follow-up' },
    { value: 'nephrotic_syndrome', label: 'Nephrotic Syndrome Management' },
    { value: 'glomerulonephritis', label: 'Glomerulonephritis Follow-up' },
    { value: 'other_renal', label: 'Other Renal Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Monthly',
  default_duration: 'Ongoing',
};

// =============================================================================
// ORTHOPAEDICS — fracture / joint management
// =============================================================================
export const ORTHOPAEDICS_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'ORTHOPAEDICS',
  section_title: 'Orthopaedic Management Plan',
  section_description: 'Set up a longitudinal musculoskeletal follow-up plan',
  color: 'amber',
  plan_types: [
    { value: 'fracture_management', label: 'Fracture Management' },
    { value: 'joint_replacement', label: 'Post Joint Replacement Follow-up' },
    { value: 'spinal', label: 'Spinal Condition Management' },
    { value: 'sports_injury', label: 'Sports Injury Rehabilitation' },
    { value: 'paediatric_ortho', label: 'Paediatric Orthopaedic Follow-up' },
    { value: 'degenerative_joint', label: 'Degenerative Joint Disease' },
    { value: 'other_ortho', label: 'Other Orthopaedic Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 6 weeks',
  default_duration: '6 months',
};

// =============================================================================
// PAEDIATRICS — growth / immunization plan
// =============================================================================
export const PAEDIATRICS_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'PAEDIATRICS',
  section_title: 'Paediatric Follow-up Plan',
  section_description:
    'Set up a longitudinal child health plan (growth monitoring, immunization, chronic disease)',
  color: 'emerald',
  plan_types: [
    { value: 'growth_monitoring', label: 'Growth Monitoring Programme' },
    { value: 'immunization', label: 'Immunization Catch-up Schedule' },
    { value: 'chronic_asthma', label: 'Childhood Asthma Management' },
    { value: 'febrile_seizures', label: 'Febrile Seizure Follow-up' },
    { value: 'malnutrition', label: 'Malnutrition / SAM Management' },
    { value: 'developmental_delay', label: 'Developmental Delay Follow-up' },
    { value: 'juvenile_diabetes', label: 'Type 1 Diabetes Management' },
    { value: 'other_paeds', label: 'Other Paediatric Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Monthly',
  default_duration: '6 months',
};

// =============================================================================
// NUTRITION - therapeutic meal plans and malnutrition follow-up
// =============================================================================
export const NUTRITION_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'NUTRITION',
  section_title: 'Nutrition Care Plan',
  section_description:
    'Set up a structured nutritional management plan with meal targets and follow-up',
  color: 'emerald',
  plan_types: [
    { value: 'weight_management', label: 'Weight Management' },
    { value: 'diabetes_nutrition', label: 'Diabetes Nutrition Therapy' },
    { value: 'hypertension_low_sodium', label: 'Hypertension Low-Sodium Plan' },
    { value: 'renal_nutrition', label: 'Renal Nutrition Support' },
    { value: 'pregnancy_nutrition', label: 'Pregnancy Nutrition Care' },
    { value: 'pediatric_nutrition', label: 'Paediatric Nutrition Care' },
    {
      value: 'malnutrition_rehabilitation',
      label: 'Malnutrition Rehabilitation',
    },
    {
      value: 'post_surgical_recovery',
      label: 'Post-Surgical Nutrition Recovery',
    },
    { value: 'general_wellness', label: 'General Wellness Nutrition Plan' },
    { value: 'other_nutrition', label: 'Other Nutrition Plan' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 2 weeks',
  default_duration: '3 months',
};

// =============================================================================
// ENDOCRINOLOGY — diabetes / thyroid annual review
// =============================================================================
export const ENDOCRINOLOGY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'ENDOCRINOLOGY',
  section_title: 'Endocrinology Management Plan',
  section_description: 'Set up a longitudinal metabolic / hormonal care plan',
  color: 'teal',
  plan_types: [
    { value: 'type2_diabetes', label: 'Type 2 Diabetes Management' },
    { value: 'type1_diabetes', label: 'Type 1 Diabetes Management' },
    { value: 'thyroid_disease', label: 'Thyroid Disease Follow-up' },
    { value: 'osteoporosis', label: 'Osteoporosis Management' },
    { value: 'adrenal_insufficiency', label: 'Adrenal Insufficiency' },
    { value: 'pituitary', label: 'Pituitary Disorder Follow-up' },
    { value: 'other_endo', label: 'Other Endocrine Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 3 months',
  default_duration: 'Ongoing',
};

// =============================================================================
// NEUROSURGERY — post-craniotomy / post-spinal follow-up
// =============================================================================
export const NEUROSURGERY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'NEUROSURGERY',
  section_title: 'Neurosurgery Follow-up Plan',
  section_description:
    'Set up a structured post-surgical neurological follow-up plan',
  color: 'indigo',
  plan_types: [
    { value: 'post_craniotomy', label: 'Post-Craniotomy Follow-up' },
    { value: 'post_spinal', label: 'Post-Spinal Surgery Follow-up' },
    { value: 'brain_tumour', label: 'Brain Tumour Management' },
    { value: 'hydrocephalus', label: 'Hydrocephalus (VP Shunt) Follow-up' },
    { value: 'post_aneurysm', label: 'Post-Aneurysm Repair Follow-up' },
    { value: 'other_neurosurgical', label: 'Other Neurosurgical Condition' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Every 6 weeks',
  default_duration: '1 year',
};

// =============================================================================
// PLASTIC SURGERY — chronic wound management
// =============================================================================
export const PLASTIC_SURGERY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'PLASTIC_SURGERY',
  section_title: 'Wound / Reconstruction Management Plan',
  section_description:
    'Set up a longitudinal wound care or post-reconstruction follow-up plan',
  color: 'orange',
  plan_types: [
    { value: 'chronic_wound', label: 'Chronic Wound Management' },
    { value: 'burns', label: 'Burns Rehabilitation' },
    {
      value: 'post_reconstruction',
      label: 'Post-Reconstructive Surgery Follow-up',
    },
    { value: 'scar_management', label: 'Scar Management Programme' },
    { value: 'other_plastic', label: 'Other Plastic Surgery Follow-up' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: true,
  default_frequency: 'Weekly',
  default_duration: '3 months',
};

// =============================================================================
// GENERAL SURGERY — post-operative wound tracking
// =============================================================================
export const GENERAL_SURGERY_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'GENERAL_SURGERY',
  section_title: 'Surgical Follow-up Plan',
  section_description:
    'Set up a structured post-operative or surgical disease follow-up plan',
  color: 'blue',
  plan_types: [
    { value: 'post_op_wound', label: 'Post-Operative Wound Follow-up' },
    { value: 'stoma_management', label: 'Stoma Management' },
    { value: 'hernia_post_repair', label: 'Post-Hernia Repair Follow-up' },
    { value: 'colorectal', label: 'Colorectal Conditions Management' },
    { value: 'other_surgical', label: 'Other Surgical Follow-up' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: false,
  default_frequency: 'Every 2 weeks',
  default_duration: '3 months',
};

// =============================================================================
// OMFS — surgical / dental oncology follow-up
// =============================================================================
export const OMFS_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'ORAL_AND_MAXILLOFACIAL_SURGERY',
  section_title: 'OMFS Follow-up Plan',
  section_description:
    'Set up a structured oral and maxillofacial surgical follow-up plan',
  color: 'amber',
  plan_types: [
    {
      value: 'post_orthognathic',
      label: 'Post-Orthognathic Surgery Follow-up',
    },
    { value: 'facial_fracture', label: 'Facial Fracture Management' },
    { value: 'post_oncology', label: 'Post-Oncology Resection Follow-up' },
    { value: 'tmj', label: 'TMJ Disorder Management' },
    { value: 'other_omfs', label: 'Other OMFS Follow-up' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: false,
  default_frequency: 'Every 4 weeks',
  default_duration: '6 months',
};

// =============================================================================
// DENTAL — treatment plan sessions
// =============================================================================
export const DENTAL_CARE_PLAN_CONFIG: SpecialtyCarePlanConfig = {
  specialty_code: 'DENTAL',
  section_title: 'Dental Treatment Plan',
  section_description: 'Set up a multi-visit dental treatment plan',
  color: 'teal',
  plan_types: [
    { value: 'orthodontics', label: 'Orthodontic Treatment' },
    { value: 'periodontal', label: 'Periodontal Disease Management' },
    { value: 'endodontic', label: 'Endodontic (Root Canal) Treatment' },
    { value: 'prosthetics', label: 'Prosthodontic Rehabilitation' },
    { value: 'implants', label: 'Dental Implant Programme' },
    {
      value: 'caries_rehabilitation',
      label: 'Extensive Caries Rehabilitation',
    },
    { value: 'other_dental', label: 'Other Dental Treatment Plan' },
  ],
  include_therapy_type: false,
  include_safety_plan: false,
  include_medications: false,
  default_frequency: 'Every 2 weeks',
  default_duration: '6 months',
};

// =============================================================================
// Central Registry
// =============================================================================

/** All care-plan-enabled specialty configs, keyed by specialty_code */
export const SPECIALTY_CARE_PLAN_CONFIGS: Record<
  string,
  SpecialtyCarePlanConfig
> = {
  NEUROPSYCHIATRY: NEUROPSYCHIATRY_CARE_PLAN_CONFIG,
  CARDIOLOGY: CARDIOLOGY_CARE_PLAN_CONFIG,
  OPHTHALMOLOGY: OPHTHALMOLOGY_CARE_PLAN_CONFIG,
  GYNAECOLOGY: GYNAECOLOGY_CARE_PLAN_CONFIG,
  NEPHROLOGY: NEPHROLOGY_CARE_PLAN_CONFIG,
  ORTHOPAEDICS: ORTHOPAEDICS_CARE_PLAN_CONFIG,
  PAEDIATRICS: PAEDIATRICS_CARE_PLAN_CONFIG,
  NUTRITION: NUTRITION_CARE_PLAN_CONFIG,
  ENDOCRINOLOGY: ENDOCRINOLOGY_CARE_PLAN_CONFIG,
  NEUROSURGERY: NEUROSURGERY_CARE_PLAN_CONFIG,
  PLASTIC_SURGERY: PLASTIC_SURGERY_CARE_PLAN_CONFIG,
  GENERAL_SURGERY: GENERAL_SURGERY_CARE_PLAN_CONFIG,
  ORAL_AND_MAXILLOFACIAL_SURGERY: OMFS_CARE_PLAN_CONFIG,
  DENTAL: DENTAL_CARE_PLAN_CONFIG,
};

/**
 * Get the care plan config for a specialty.
 * Returns null if the specialty does not support care plans.
 */
export function getCarePlanConfig(
  specialtyCode: string,
): SpecialtyCarePlanConfig | null {
  return SPECIALTY_CARE_PLAN_CONFIGS[specialtyCode] ?? null;
}

/**
 * Returns true when the specialty supports care plan creation.
 */
export function specialtyHasCarePlan(specialtyCode: string): boolean {
  return specialtyCode in SPECIALTY_CARE_PLAN_CONFIGS;
}
