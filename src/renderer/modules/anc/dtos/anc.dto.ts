// =============================================================================
// ANC Module — Form DTOs with Zod Validation
// =============================================================================

import { z } from 'zod';

// ─── Pregnancy Episode ─────────────────────────────────────────────────────

export const pregnancyEpisodeSchema = z.object({
  patient_id: z.string().min(1, 'Please select a patient'),
  lmp: z.string().optional(),
  edd: z.string().optional(),
  gestational_age_at_booking: z.number().int().min(0).max(45).optional(),
  gravida: z.number().int().min(1),
  parity: z.number().int().min(0),
  abortions: z.number().int().min(0),
  living_children: z.number().int().min(0),
  blood_group: z.string().optional(),
  rhesus_factor: z.string().optional(),
  genotype: z.string().optional(),
  risk_level: z.enum(['low', 'moderate', 'high']),
  primary_doctor_id: z.string().optional(),
  primary_midwife_id: z.string().optional(),
  clinic_id: z.string().optional(),
  medical_history: z.string().optional(),
  surgical_history: z.string().optional(),
  family_history: z.string().optional(),
  allergy_history: z.string().optional(),
  obstetric_history: z.array(z.any()),
});

export type PregnancyEpisodeFormDTO = z.input<typeof pregnancyEpisodeSchema>;

// ─── ANC Observations (Nursing Form) ──────────────────────────────────────

export const ancObservationSchema = z.object({
  anc_visit_id: z.string().uuid(),
  pregnancy_episode_id: z.string().uuid(),
  systolic_bp: z.number().int().min(50).max(300).optional(),
  diastolic_bp: z.number().int().min(30).max(200).optional(),
  weight_kg: z.number().min(20).max(300).optional(),
  height_cm: z.number().min(50).max(250).optional(),
  temperature: z.number().min(30).max(45).optional(),
  pulse: z.number().int().min(30).max(250).optional(),
  respiratory_rate: z.number().int().min(5).max(60).optional(),
  urine_protein: z.enum(['nil', 'trace', '+', '++', '+++']).optional(),
  urine_glucose: z.enum(['nil', 'trace', '+', '++', '+++']).optional(),
  edema: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
  pallor: z.enum(['none', 'mild', 'moderate', 'severe']).optional(),
  fundal_height_cm: z.number().min(0).max(50).optional(),
  fetal_heart_rate: z.number().int().min(60).max(220).optional(),
  fetal_movement: z.enum(['present', 'reduced', 'absent']).optional(),
  fetal_presentation: z
    .enum(['cephalic', 'breech', 'transverse', 'unstable'])
    .optional(),
  fetal_lie: z.enum(['longitudinal', 'oblique', 'transverse']).optional(),
  breast_exam: z.string().optional(),
  number_of_fetuses: z.number().int().min(1).max(5),
  vaginal_bleeding: z.boolean(),
  liquor_status: z.enum(['adequate', 'reduced', 'excessive']).optional(),
  cervix_status: z.string().optional(),
  contractions: z.boolean(),
  maternal_complaints: z.string().optional(),
  danger_signs: z.array(z.string()),
  interventions: z.string().optional(),
  counseling_notes: z.string().optional(),
  notes: z.string().optional(),
});

export type AncObservationFormDTO = z.input<typeof ancObservationSchema>;

// ─── Doctor Review ─────────────────────────────────────────────────────────

export const ancDoctorReviewSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  pregnancy_episode_id: z.string().uuid(),
  anc_visit_id: z.string().uuid(),
  // SOAP
  subjective: z.string().min(1, 'Subjective notes are required'),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  // ANC-specific
  risk_classification: z.enum(['low', 'moderate', 'high']),
  delivery_plan: z.string().optional(),
  next_visit_date: z.string().optional(),
  follow_up_notes: z.string().optional(),
});

export type AncDoctorReviewFormDTO = z.input<typeof ancDoctorReviewSchema>;

// ─── Delivery Outcome ──────────────────────────────────────────────────────

export const deliveryOutcomeSchema = z.object({
  pregnancy_episode_id: z.string().uuid(),
  delivery_date: z.string().min(1, 'Delivery date is required'),
  gestational_age_at_delivery: z.number().int().min(20).max(45).optional(),
  place_of_delivery: z
    .enum(['this_facility', 'other_hospital', 'home', 'en_route'])
    .optional(),
  delivery_mode: z
    .enum([
      'svd',
      'elective_cs',
      'emergency_cs',
      'instrumental',
      'vacuum',
      'forceps',
    ])
    .optional(),
  maternal_outcome: z.enum(['alive', 'deceased']),
  maternal_complications: z.array(z.string()),
  baby_weight_grams: z.number().int().min(200).max(7000).optional(),
  baby_sex: z.enum(['male', 'female', 'ambiguous']).optional(),
  apgar_1: z.number().int().min(0).max(10).optional(),
  apgar_5: z.number().int().min(0).max(10).optional(),
  neonatal_outcome: z.enum(['alive', 'stillbirth', 'neonatal_death']),
  neonatal_complications: z.array(z.string()),
  blood_loss_ml: z.number().int().min(0).optional(),
  placenta_complete: z.boolean().optional(),
  notes: z.string().optional(),
});

export type DeliveryOutcomeFormDTO = z.input<typeof deliveryOutcomeSchema>;

// ─── Risk Flag ─────────────────────────────────────────────────────────────

export const ancRiskFlagSchema = z.object({
  pregnancy_episode_id: z.string().uuid(),
  anc_visit_id: z.string().uuid().optional(),
  risk_code: z.string().min(1),
  risk_name: z.string().min(1),
  severity: z.enum(['low', 'moderate', 'high', 'critical']),
  notes: z.string().optional(),
});

export type AncRiskFlagFormDTO = z.input<typeof ancRiskFlagSchema>;
