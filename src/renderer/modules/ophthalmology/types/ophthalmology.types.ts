/**
 * Ophthalmology Module - Type Definitions
 *
 * All types and DTOs for the ophthalmology/eye care module.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type AffectedEye = 'Right' | 'Left' | 'Both';

export type VisualAcuityValue =
  | '6/6'
  | '6/9'
  | '6/12'
  | '6/18'
  | '6/24'
  | '6/36'
  | '6/60'
  | '3/60'
  | '1/60'
  | 'CF' // Counting Fingers
  | 'HM' // Hand Movement
  | 'PL' // Perception of Light
  | 'NPL'; // No Perception of Light

export type NearVisionValue =
  | 'N5'
  | 'N6'
  | 'N8'
  | 'N10'
  | 'N12'
  | 'N14'
  | 'N18'
  | 'N24'
  | 'N36'
  | 'N48';

export type IOPMethod = 'NCT' | 'Goldmann' | 'iCare' | 'Schiotz' | 'Palpation';

export type LensType =
  | 'Single_Vision'
  | 'Bifocal'
  | 'Progressive'
  | 'Photochromic'
  | 'Contact_Lens';

export type LensStatus =
  | 'Clear'
  | 'Early_Cataract'
  | 'Immature_Cataract'
  | 'Mature_Cataract'
  | 'Hypermature_Cataract'
  | 'Pseudophakia'
  | 'Aphakia';

export type ACDepth = 'Deep' | 'Normal' | 'Shallow' | 'Flat';

export type PupilReaction = 'Brisk' | 'Sluggish' | 'Fixed' | 'RAPD';

export type AngleStatus = 'Open' | 'Narrow' | 'Occludable' | 'Closed';

export type DiscColor = 'Pink' | 'Pale' | 'Hyperemic';

export type FovealReflex = 'Present' | 'Absent' | 'Dull';

export type ColorVisionStatus =
  | 'Normal'
  | 'Red_Green_Defect'
  | 'Blue_Yellow_Defect';

export type ColorVisionMethod = 'Ishihara' | 'Farnsworth_D15' | 'Anomaloscope';

export type EyeProcedureType =
  | 'Refraction'
  | 'Tonometry'
  | 'Fundoscopy'
  | 'Slit_Lamp'
  | 'Visual_Field'
  | 'OCT'
  | 'OCT_Macula'
  | 'OCT_RNFL'
  | 'OCT_Anterior'
  | 'Fundus_Photo'
  | 'Fluorescein_Angio'
  | 'ICG_Angio'
  | 'Gonioscopy'
  | 'Pachymetry'
  | 'A_Scan'
  | 'B_Scan'
  | 'Keratometry'
  | 'Topography'
  | 'Specular_Microscopy'
  | 'Biometry'
  | 'ERG'
  | 'VEP'
  | 'Minor_Surgery'
  | 'Chalazion_Excision'
  | 'Pterygium_Excision'
  | 'Intravitreal_Injection'
  | 'Subconjunctival_Injection'
  | 'Nasolacrimal_Probing'
  | 'Foreign_Body_Removal';

export type EyeProcedureCategory = 'Diagnostic' | 'Therapeutic' | 'Surgical';

export type EyePrescriptionType =
  | 'Glasses'
  | 'Contact_Lens'
  | 'Eye_Drops'
  | 'Ointment'
  | 'Oral_Medication';

export type LensMaterial =
  | 'CR39'
  | 'Polycarbonate'
  | 'High_Index_1.60'
  | 'High_Index_1.67'
  | 'High_Index_1.74'
  | 'Trivex'
  | 'Glass';

export type LensCoating =
  | 'Anti_Reflective'
  | 'Blue_Light_Filter'
  | 'Photochromic'
  | 'Scratch_Resistant'
  | 'UV_Protection'
  | 'Hydrophobic';

export type ContactLensType =
  | 'Daily'
  | 'Weekly'
  | 'Bi_Weekly'
  | 'Monthly'
  | 'Extended_Wear'
  | 'Rigid_Gas_Permeable';

// Common diagnoses
export type CommonEyeDiagnosis =
  | 'Myopia'
  | 'Hyperopia'
  | 'Astigmatism'
  | 'Presbyopia'
  | 'Cataract'
  | 'Glaucoma_POAG'
  | 'Glaucoma_PACG'
  | 'Glaucoma_Suspect'
  | 'Diabetic_Retinopathy_Mild'
  | 'Diabetic_Retinopathy_Moderate'
  | 'Diabetic_Retinopathy_Severe'
  | 'Diabetic_Retinopathy_PDR'
  | 'Diabetic_Macular_Edema'
  | 'AMD_Dry'
  | 'AMD_Wet'
  | 'Conjunctivitis_Allergic'
  | 'Conjunctivitis_Bacterial'
  | 'Conjunctivitis_Viral'
  | 'Blepharitis'
  | 'Chalazion'
  | 'Dry_Eye_Syndrome'
  | 'Pterygium'
  | 'Keratoconus'
  | 'Corneal_Ulcer'
  | 'Uveitis'
  | 'Retinal_Detachment';

// =============================================================================
// EYE EXAM DTOs
// =============================================================================

export interface EyeExamDTO {
  exam_id: string;
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  facility_id?: string;

  // Chief Complaint
  chief_complaint?: string;
  complaint_duration?: string;
  affected_eye?: AffectedEye;

  // History
  ocular_history?: string;
  ocular_surgery_history?: string;
  systemic_history?: string;
  family_history?: string;
  drug_allergy?: string;
  current_medications?: string;
  glasses_history?: string;
  contact_lens_history?: string;

  // Visual Acuity
  va_right_unaided?: string;
  va_left_unaided?: string;
  va_right_aided?: string;
  va_left_aided?: string;
  va_right_pinhole?: string;
  va_left_pinhole?: string;
  va_right_near?: string;
  va_left_near?: string;

  // Auto-Refraction
  ar_right_sphere?: number;
  ar_right_cylinder?: number;
  ar_right_axis?: number;
  ar_left_sphere?: number;
  ar_left_cylinder?: number;
  ar_left_axis?: number;

  // Subjective Refraction (Final Rx)
  rx_right_sphere?: number;
  rx_right_cylinder?: number;
  rx_right_axis?: number;
  rx_right_add?: number;
  rx_right_prism?: string;
  rx_left_sphere?: number;
  rx_left_cylinder?: number;
  rx_left_axis?: number;
  rx_left_add?: number;
  rx_left_prism?: string;
  rx_pd?: number;
  rx_pd_right?: number;
  rx_pd_left?: number;

  // BCVA
  bcva_right?: string;
  bcva_left?: string;

  // IOP
  iop_right?: number;
  iop_left?: number;
  iop_method?: IOPMethod;
  iop_time?: string;
  iop_classification?: string;
  cct_right?: number;
  cct_left?: number;

  // Pupil
  pupil_right_size?: number;
  pupil_left_size?: number;
  pupil_right_reaction?: PupilReaction;
  pupil_left_reaction?: PupilReaction;

  // Motility
  colour_vision?: string;
  cover_test?: string;
  ocular_motility?: string;
  convergence?: string;
  npc?: string;

  // Anterior Segment - Right Eye
  anterior_right_lids?: string;
  anterior_right_lacrimal?: string;
  anterior_right_conjunctiva?: string;
  anterior_right_sclera?: string;
  anterior_right_cornea?: string;
  anterior_right_ac?: string;
  anterior_right_ac_depth?: ACDepth;
  anterior_right_iris?: string;
  anterior_right_pupil?: string;
  anterior_right_lens?: string;
  anterior_right_lens_status?: LensStatus;

  // Anterior Segment - Left Eye
  anterior_left_lids?: string;
  anterior_left_lacrimal?: string;
  anterior_left_conjunctiva?: string;
  anterior_left_sclera?: string;
  anterior_left_cornea?: string;
  anterior_left_ac?: string;
  anterior_left_ac_depth?: ACDepth;
  anterior_left_iris?: string;
  anterior_left_pupil?: string;
  anterior_left_lens?: string;
  anterior_left_lens_status?: LensStatus;

  // Gonioscopy
  gonioscopy_right?: string;
  gonioscopy_left?: string;
  angle_right?: AngleStatus;
  angle_left?: AngleStatus;

  // Posterior Segment
  dilation_performed?: boolean;
  dilation_agent?: string;

  // Posterior Segment - Right Eye
  posterior_right_media?: string;
  posterior_right_disc?: string;
  posterior_right_disc_color?: DiscColor;
  posterior_right_cdr?: number;
  posterior_right_rim?: string;
  posterior_right_macula?: string;
  posterior_right_foveal_reflex?: FovealReflex;
  posterior_right_vessels?: string;
  posterior_right_av_ratio?: string;
  posterior_right_periphery?: string;
  posterior_right_dr_grading?: string;

  // Posterior Segment - Left Eye
  posterior_left_media?: string;
  posterior_left_disc?: string;
  posterior_left_disc_color?: DiscColor;
  posterior_left_cdr?: number;
  posterior_left_rim?: string;
  posterior_left_macula?: string;
  posterior_left_foveal_reflex?: FovealReflex;
  posterior_left_vessels?: string;
  posterior_left_av_ratio?: string;
  posterior_left_periphery?: string;
  posterior_left_dr_grading?: string;

  // Additional Tests
  color_vision?: string;
  color_vision_method?: ColorVisionMethod;
  contrast_sensitivity?: string;
  amsler_grid?: string;
  schirmer_test_right?: number;
  schirmer_test_left?: number;
  visual_field_notes?: string;
  visual_fields_confrontation?: string;

  // Diagnosis
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];

  // Treatment Plan
  treatment_plan?: string;
  glasses_prescribed?: boolean;
  spectacle_recommendation?: string;
  refractive_error_classification?: string;
  contact_lens_prescribed?: boolean;
  medications_prescribed?: boolean;
  surgery_recommended?: boolean;
  surgery_type?: string;

  // Referral
  referral_needed?: boolean;
  referral_to?: string;
  referral_reason?: string;

  // Follow-up
  follow_up_interval?: string;
  follow_up_date?: string;
  follow_up_notes?: string;

  // Audit
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
  finalized_by?: string;

  // Relations
  procedures?: EyeProcedureDTO[];
  prescriptions?: EyePrescriptionDTO[];
  patient?: {
    patient_id: string;
    first_name: string;
    surname: string;
    date_of_birth?: string;
    emr_number?: string;
  };
  encounter?: {
    id: string;
    encounter_number: string;
    visit_type?: string;
    created_at?: string;
  };
  provider?: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string;
  };
}

export interface CreateEyeExamDTO {
  patient_id: string;
  encounter_id: string;
  consultation_id?: string;
  facility_id?: string;

  // Chief Complaint
  chief_complaint?: string;
  complaint_duration?: string;
  affected_eye?: AffectedEye;

  // History
  ocular_history?: string;
  ocular_surgery_history?: string;
  systemic_history?: string;
  family_history?: string;
  drug_allergy?: string;
  current_medications?: string;
  glasses_history?: string;
  contact_lens_history?: string;

  // Visual Acuity
  va_right_unaided?: string;
  va_left_unaided?: string;
  va_right_aided?: string;
  va_left_aided?: string;
  va_right_pinhole?: string;
  va_left_pinhole?: string;
  va_right_near?: string;
  va_left_near?: string;

  // Auto-Refraction
  ar_right_sphere?: number;
  ar_right_cylinder?: number;
  ar_right_axis?: number;
  ar_left_sphere?: number;
  ar_left_cylinder?: number;
  ar_left_axis?: number;

  // Cycloplegic Refraction (Wet Refraction)
  cyclo_agent?: string;
  cyclo_instillation_time?: string;
  cyclo_right_sphere?: number;
  cyclo_right_cylinder?: number;
  cyclo_right_axis?: number;
  cyclo_left_sphere?: number;
  cyclo_left_cylinder?: number;
  cyclo_left_axis?: number;

  // Subjective Refraction (Final Rx)
  rx_right_sphere?: number;
  rx_right_cylinder?: number;
  rx_right_axis?: number;
  rx_right_add?: number;
  rx_right_prism?: string;
  rx_left_sphere?: number;
  rx_left_cylinder?: number;
  rx_left_axis?: number;
  rx_left_add?: number;
  rx_left_prism?: string;
  rx_pd?: number;
  rx_pd_right?: number;
  rx_pd_left?: number;

  // BCVA
  bcva_right?: string;
  bcva_left?: string;

  // IOP
  iop_right?: number;
  iop_left?: number;
  iop_method?: IOPMethod;
  iop_time?: string;
  iop_classification?: string;
  cct_right?: number;
  cct_left?: number;

  // Pupil
  pupil_right_size?: number;
  pupil_left_size?: number;
  pupil_right_reaction?: PupilReaction;
  pupil_left_reaction?: PupilReaction;

  // Motility
  colour_vision?: string;
  cover_test?: string;
  ocular_motility?: string;
  convergence?: string;
  npc?: string;
  visual_fields_confrontation?: string;

  // Anterior Segment - Right Eye
  anterior_right_lids?: string;
  anterior_right_lacrimal?: string;
  anterior_right_conjunctiva?: string;
  anterior_right_sclera?: string;
  anterior_right_cornea?: string;
  anterior_right_ac?: string;
  anterior_right_ac_depth?: ACDepth;
  anterior_right_iris?: string;
  anterior_right_pupil?: string;
  anterior_right_lens?: string;
  anterior_right_lens_status?: LensStatus;

  // Anterior Segment - Left Eye
  anterior_left_lids?: string;
  anterior_left_lacrimal?: string;
  anterior_left_conjunctiva?: string;
  anterior_left_sclera?: string;
  anterior_left_cornea?: string;
  anterior_left_ac?: string;
  anterior_left_ac_depth?: ACDepth;
  anterior_left_iris?: string;
  anterior_left_pupil?: string;
  anterior_left_lens?: string;
  anterior_left_lens_status?: LensStatus;

  // Gonioscopy
  gonioscopy_right?: string;
  gonioscopy_left?: string;
  angle_right?: AngleStatus;
  angle_left?: AngleStatus;

  // Posterior Segment
  dilation_performed?: boolean;
  dilation_agent?: string;

  // Posterior Segment - Right Eye
  posterior_right_media?: string;
  posterior_right_disc?: string;
  posterior_right_disc_color?: DiscColor;
  posterior_right_cdr?: number;
  posterior_right_rim?: string;
  posterior_right_macula?: string;
  posterior_right_foveal_reflex?: FovealReflex;
  posterior_right_vessels?: string;
  posterior_right_av_ratio?: string;
  posterior_right_periphery?: string;
  posterior_right_dr_grading?: string;

  // Posterior Segment - Left Eye
  posterior_left_media?: string;
  posterior_left_disc?: string;
  posterior_left_disc_color?: DiscColor;
  posterior_left_cdr?: number;
  posterior_left_rim?: string;
  posterior_left_macula?: string;
  posterior_left_foveal_reflex?: FovealReflex;
  posterior_left_vessels?: string;
  posterior_left_av_ratio?: string;
  posterior_left_periphery?: string;
  posterior_left_dr_grading?: string;

  // Additional Tests
  color_vision?: string;
  color_vision_method?: ColorVisionMethod;
  contrast_sensitivity?: string;
  amsler_grid?: string;
  schirmer_test_right?: number;
  schirmer_test_left?: number;
  visual_field_notes?: string;
  refractive_error_classification?: string;
  spectacle_recommendation?: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];

  // Treatment Plan
  treatment_plan?: string;
  glasses_prescribed?: boolean;
  contact_lens_prescribed?: boolean;
  medications_prescribed?: boolean;
  surgery_recommended?: boolean;
  surgery_type?: string;

  // Referral
  referral_needed?: boolean;
  referral_to?: string;
  referral_reason?: string;

  // Follow-up
  follow_up_interval?: string;
  follow_up_date?: string;
  follow_up_notes?: string;

  // Status
  status?: string;
}

export interface UpdateEyeExamDTO {
  // Visual Acuity
  va_right_unaided?: string;
  va_left_unaided?: string;
  va_right_aided?: string;
  va_left_aided?: string;
  va_right_pinhole?: string;
  va_left_pinhole?: string;
  va_right_near?: string;
  va_left_near?: string;

  // Auto-Refraction
  ar_right_sphere?: number;
  ar_right_cylinder?: number;
  ar_right_axis?: number;
  ar_left_sphere?: number;
  ar_left_cylinder?: number;
  ar_left_axis?: number;

  // Cycloplegic Refraction (Wet Refraction)
  cyclo_agent?: string;
  cyclo_instillation_time?: string;
  cyclo_right_sphere?: number;
  cyclo_right_cylinder?: number;
  cyclo_right_axis?: number;
  cyclo_left_sphere?: number;
  cyclo_left_cylinder?: number;
  cyclo_left_axis?: number;

  // Subjective Refraction
  rx_right_sphere?: number;
  rx_right_cylinder?: number;
  rx_right_axis?: number;
  rx_right_add?: number;
  rx_left_sphere?: number;
  rx_left_cylinder?: number;
  rx_left_axis?: number;
  rx_left_add?: number;
  rx_pd?: number;

  // IOP
  iop_right?: number;
  iop_left?: number;
  iop_method?: IOPMethod;

  // BCVA
  bcva_right?: string;
  bcva_left?: string;

  // Anterior Segment (both eyes)
  anterior_right_lids?: string;
  anterior_right_conjunctiva?: string;
  anterior_right_cornea?: string;
  anterior_right_ac?: string;
  anterior_right_lens?: string;
  anterior_right_lens_status?: LensStatus;
  anterior_left_lids?: string;
  anterior_left_conjunctiva?: string;
  anterior_left_cornea?: string;
  anterior_left_ac?: string;
  anterior_left_lens?: string;
  anterior_left_lens_status?: LensStatus;

  // Posterior Segment
  dilation_performed?: boolean;
  posterior_right_disc?: string;
  posterior_right_cdr?: number;
  posterior_right_macula?: string;
  posterior_left_disc?: string;
  posterior_left_cdr?: number;
  posterior_left_macula?: string;

  // Diagnosis
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  icd_codes?: string[];

  // Treatment Plan
  treatment_plan?: string;
  glasses_prescribed?: boolean;
  contact_lens_prescribed?: boolean;
  medications_prescribed?: boolean;
  surgery_recommended?: boolean;
  surgery_type?: string;

  // Referral
  referral_needed?: boolean;
  referral_to?: string;
  referral_reason?: string;

  // Follow-up
  follow_up_interval?: string;
  follow_up_date?: string;
  follow_up_notes?: string;

  // Any additional fields from full DTO
  [key: string]: unknown;
}

// =============================================================================
// EYE PROCEDURE DTOs
// =============================================================================

export interface EyeProcedureDTO {
  procedure_id: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  procedure_type: EyeProcedureType;
  procedure_category?: EyeProcedureCategory;
  affected_eye?: AffectedEye;
  procedure_notes?: string;
  findings?: string;
  interpretation?: string;

  machine_used?: string;
  parameters?: string;
  images_attached?: boolean;

  anesthesia_used?: string;
  materials_used?: string;
  complications?: string;

  fee?: number;

  status: string;
  performed_by?: string;
  performed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;

  performer?: {
    id: string;
    first_name: string;
    last_name: string;
  };

  // Patient (from join in list queries)
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    surname: string;
    emr_number?: string;
  };
}

export interface CreateEyeProcedureDTO {
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  procedure_type: string;
  procedure_category?: string;
  affected_eye?: AffectedEye;
  procedure_notes?: string;
  fee?: number;
}

export interface CompleteEyeProcedureDTO {
  procedure_id: string;
  findings?: string;
  interpretation?: string;
  machine_used?: string;
  parameters?: string;
  images_attached?: boolean;
  complications?: string;
  performed_by: string;
  performed_at: string;
}

// =============================================================================
// EYE PRESCRIPTION DTOs
// =============================================================================

export interface GlassesPrescriptionDTO {
  prescription_id: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  prescription_type: 'Glasses';

  right_sphere?: number;
  right_cylinder?: number;
  right_axis?: number;
  right_add?: number;
  right_prism?: string;

  left_sphere?: number;
  left_cylinder?: number;
  left_axis?: number;
  left_add?: number;
  left_prism?: string;

  pd?: number;
  pd_right?: number;
  pd_left?: number;

  lens_type?: LensType;
  lens_material?: LensMaterial;
  lens_coating?: LensCoating[];
  tint?: string;
  frame_recommendation?: string;

  prescribed_by?: string;
  prescribed_at: string;
  valid_until?: string;
  status: string;
}

export interface ContactLensPrescriptionDTO {
  prescription_id: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  prescription_type: 'Contact_Lens';

  right_sphere?: number;
  right_cylinder?: number;
  right_axis?: number;
  right_base_curve?: number;
  right_diameter?: number;

  left_sphere?: number;
  left_cylinder?: number;
  left_axis?: number;
  left_base_curve?: number;
  left_diameter?: number;

  contact_lens_brand?: string;
  contact_lens_type?: ContactLensType;
  wearing_schedule?: string;
  care_instructions?: string;

  prescribed_by?: string;
  prescribed_at: string;
  valid_until?: string;
  status: string;
}

export interface EyeMedicationPrescriptionDTO {
  prescription_id: string;
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  prescription_type: 'Eye_Drops' | 'Ointment' | 'Oral_Medication';

  medication_name: string;
  generic_name?: string;
  concentration?: string;
  dosage: string;
  frequency: string;
  duration: string;
  affected_eye: AffectedEye;
  special_instructions?: string;
  quantity?: number;
  refills_allowed?: number;

  prescribed_by?: string;
  prescribed_at: string;
  status: string;
}

export type EyePrescriptionDTO =
  | GlassesPrescriptionDTO
  | ContactLensPrescriptionDTO
  | EyeMedicationPrescriptionDTO;

export interface CreateGlassesPrescriptionDTO {
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  right_sphere?: number;
  right_cylinder?: number;
  right_axis?: number;
  right_add?: number;
  right_prism?: string;

  left_sphere?: number;
  left_cylinder?: number;
  left_axis?: number;
  left_add?: number;
  left_prism?: string;

  pd?: number;
  pd_right?: number;
  pd_left?: number;

  lens_type?: LensType;
  lens_material?: string;
  lens_coating?: string[];
  tint?: string;
  frame_recommendation?: string;

  valid_until?: string;
}

export interface CreateEyeMedicationDTO {
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;

  prescription_type: 'Eye_Drops' | 'Ointment' | 'Oral_Medication';
  medication_name: string;
  generic_name?: string;
  concentration?: string;
  dosage: string;
  frequency: string;
  duration: string;
  affected_eye: AffectedEye;
  special_instructions?: string;
  quantity?: number;
  refills_allowed?: number;
}

// =============================================================================
// QUERY PARAMS
// =============================================================================

export interface EyeExamQueryParams {
  patient_id?: string;
  encounter_id?: string;
  facility_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  created_by?: string;
  glasses_prescribed?: boolean;
  surgery_recommended?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface EyeExamFormState {
  activeTab:
    | 'history'
    | 'visual_acuity'
    | 'refraction'
    | 'iop'
    | 'anterior'
    | 'posterior'
    | 'diagnosis'
    | 'plan';
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  selectedEye: 'right' | 'left' | 'both';
}

// Helper for refraction display
export interface RefractionDisplay {
  sphere: string;
  cylinder: string;
  axis: string;
  add?: string;
  prism?: string;
}

export function formatRefraction(
  sphere?: number,
  cylinder?: number,
  axis?: number,
  add?: number,
): string {
  if (sphere === undefined && cylinder === undefined) return '-';

  let result = '';

  if (sphere !== undefined) {
    result += sphere >= 0 ? `+${sphere.toFixed(2)}` : sphere.toFixed(2);
  }

  if (cylinder !== undefined && cylinder !== 0) {
    result += '/';
    result += cylinder >= 0 ? `+${cylinder.toFixed(2)}` : cylinder.toFixed(2);
    if (axis !== undefined) {
      result += `x${axis}`;
    }
  }

  if (add !== undefined && add > 0) {
    result += ` Add +${add.toFixed(2)}`;
  }

  return result || '-';
}

// Spherical equivalent calculation
export function sphericalEquivalent(
  sphere?: number,
  cylinder?: number,
): number | undefined {
  if (sphere === undefined) return undefined;
  return sphere + (cylinder ?? 0) / 2;
}
