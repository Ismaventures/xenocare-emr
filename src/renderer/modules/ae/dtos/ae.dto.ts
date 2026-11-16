// =============================================================================
// A&E Module — Zod Validation Schemas & DTOs
// =============================================================================

import { z } from 'zod';

// =============================================================================
// Arrival Form
// =============================================================================

export const arrivalFormSchema = z.object({
  patient_id: z.string().uuid('Patient is required'),
  arrival_time: z.string().optional(),
  arrival_mode: z.enum([
    'walk_in',
    'ambulance',
    'transfer',
    'police',
    'military_escort',
    'other',
  ]),
  referral_source: z.enum([
    'self',
    'clinic',
    'hospital',
    'police',
    'military',
    'workplace',
    'other',
  ]),
  referral_source_detail: z.string().optional(),
  chief_complaint: z.string().min(1, 'Chief complaint is required'),
  incident_type: z
    .enum([
      'rta',
      'assault',
      'fall',
      'burn',
      'gunshot',
      'blast',
      'poisoning',
      'drowning',
      'medical',
      'obstetric',
      'pediatric',
      'other',
    ])
    .optional(),
  incident_time: z.string().optional(),
  incident_location: z.string().optional(),
  medico_legal_flag: z.boolean().default(false),
  medico_legal_notes: z.string().optional(),
  brought_by_name: z.string().optional(),
  brought_by_phone: z.string().optional(),
  brought_by_relationship: z.string().optional(),
  // Encounter creation fields
  priority: z.enum(['Normal', 'Urgent', 'Emergency']).default('Urgent'),
  payment_category: z.string().default('Cash'),
});

export type ArrivalFormDTO = z.infer<typeof arrivalFormSchema>;

// =============================================================================
// Triage Form
// =============================================================================

export const triageFormSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  // Vitals
  temperature: z.number().min(30).max(45).optional(),
  pulse_rate: z.number().min(20).max(300).optional(),
  respiratory_rate: z.number().min(4).max(80).optional(),
  bp_systolic: z.number().min(40).max(300).optional(),
  bp_diastolic: z.number().min(20).max(200).optional(),
  oxygen_saturation: z.number().min(0).max(100).optional(),
  blood_glucose: z.number().min(0).max(1000).optional(),
  weight: z.number().min(0.5).max(500).optional(),
  pain_score: z.number().min(0).max(10).optional(),
  // Triage
  triage_level: z.number().min(1).max(5) as z.ZodType<1 | 2 | 3 | 4 | 5>,
  consciousness: z
    .enum(['Alert', 'Verbal', 'Pain', 'Unresponsive'])
    .default('Alert'),
  gcs_eye: z.number().min(1).max(4).optional(),
  gcs_verbal: z.number().min(1).max(5).optional(),
  gcs_motor: z.number().min(1).max(6).optional(),
  allergies_noted: z.string().optional(),
  red_flags: z.array(z.string()).default([]),
  trauma_mechanism: z.string().optional(),
  triage_notes: z.string().optional(),
});

export type TriageFormDTO = z.infer<typeof triageFormSchema>;

// =============================================================================
// Primary Survey (ABCDE)
// =============================================================================

export const primarySurveyFormSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  // Airway
  airway_status: z
    .enum(['patent', 'compromised', 'obstructed', 'intubated'])
    .optional(),
  airway_interventions: z.array(z.string()).default([]),
  airway_notes: z.string().optional(),
  // Breathing
  breathing_status: z
    .enum(['normal', 'labored', 'absent', 'assisted'])
    .optional(),
  breathing_rate: z.number().min(0).max(80).optional(),
  spo2: z.number().min(0).max(100).optional(),
  chest_findings: z.string().optional(),
  breathing_interventions: z.array(z.string()).default([]),
  breathing_notes: z.string().optional(),
  // Circulation
  circulation_status: z
    .enum(['stable', 'compromised', 'shock', 'arrest'])
    .optional(),
  heart_rate: z.number().min(0).max(300).optional(),
  bp_systolic: z.number().min(0).max(300).optional(),
  bp_diastolic: z.number().min(0).max(200).optional(),
  capillary_refill: z.string().optional(),
  bleeding_sites: z
    .array(
      z.object({
        location: z.string(),
        severity: z.string().optional(),
      }),
    )
    .default([]),
  iv_access: z
    .array(
      z.object({
        site: z.string(),
        gauge: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .default([]),
  circulation_interventions: z.array(z.string()).default([]),
  circulation_notes: z.string().optional(),
  // Disability
  gcs_eye: z.number().min(1).max(4).optional(),
  gcs_verbal: z.number().min(1).max(5).optional(),
  gcs_motor: z.number().min(1).max(6).optional(),
  pupil_left: z.string().optional(),
  pupil_right: z.string().optional(),
  consciousness: z
    .enum(['Alert', 'Verbal', 'Pain', 'Unresponsive'])
    .default('Alert'),
  disability_notes: z.string().optional(),
  // Exposure
  exposure_findings: z.string().optional(),
  injuries: z
    .array(
      z.object({
        body_part: z.string(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  exposure_notes: z.string().optional(),
});

export type PrimarySurveyFormDTO = z.infer<typeof primarySurveyFormSchema>;

// =============================================================================
// Disposition Form
// =============================================================================

export const dispositionFormSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  disposition_type: z.enum([
    'discharge',
    'admit',
    'transfer',
    'refer',
    'death',
    'absconded',
    'left_against_advice',
  ]),
  final_diagnosis: z.string().min(1, 'Final diagnosis is required'),
  final_diagnosis_icd10: z.string().optional(),
  secondary_diagnoses: z
    .array(
      z.object({
        diagnosis: z.string(),
        icd10: z.string().optional(),
      }),
    )
    .default([]),
  condition_at_disposition: z.enum([
    'stable',
    'improved',
    'unchanged',
    'deteriorated',
    'critical',
    'deceased',
  ]),
  // Discharge
  discharge_instructions: z.string().optional(),
  return_precautions: z.string().optional(),
  follow_up_date: z.string().optional(),
  follow_up_clinic_id: z.string().optional(),
  medications_on_discharge: z
    .array(
      z.object({
        drug_name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
      }),
    )
    .default([]),
  // Admit
  admission_ward_id: z.string().optional(),
  admission_reason: z.string().optional(),
  // Transfer
  transfer_destination: z.string().optional(),
  transfer_reason: z.string().optional(),
});

export type DispositionFormDTO = z.infer<typeof dispositionFormSchema>;

// =============================================================================
// Fluid Chart Form
// =============================================================================

export const fluidChartFormSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  fluid_type: z.string().min(1, 'Fluid type is required'),
  route: z.string().min(1, 'Route is required'),
  rate_ml_hr: z.number().min(0).optional(),
  volume_ml: z.number().min(0).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  urine_output_ml: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type FluidChartFormDTO = z.infer<typeof fluidChartFormSchema>;

// =============================================================================
// A&E Procedure Form
// =============================================================================

export const aeProcedureFormSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  procedure_name: z.string().min(1, 'Procedure name is required'),
  procedure_catalogue_id: z.string().optional(),
  consent_obtained: z.boolean().default(false),
  consent_notes: z.string().optional(),
  indication: z.string().optional(),
  site: z.string().optional(),
  anaesthesia: z.string().optional(),
  technique: z.string().optional(),
  findings: z.string().optional(),
  outcome: z.string().optional(),
  complications: z.string().optional(),
  notes: z.string().optional(),
  assisted_by: z.array(z.string()).default([]),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

export type AeProcedureFormDTO = z.infer<typeof aeProcedureFormSchema>;
