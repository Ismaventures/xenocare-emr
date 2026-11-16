/**
 * =============================================================================
 * Ophthalmology Clinical Dropdown Options
 * Clinically meaningful, descriptive options for smart consultant documentation
 * =============================================================================
 */

export interface ClinicalOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

// =============================================================================
// Symptom Options
// =============================================================================

export const SYMPTOM_OPTIONS: ClinicalOption[] = [
  {
    value: 'blurred_vision_distance',
    label: 'Blurred Vision (Distance)',
    category: 'Visual',
  },
  {
    value: 'blurred_vision_near',
    label: 'Blurred Vision (Near)',
    category: 'Visual',
  },
  {
    value: 'progressive_vision_loss',
    label: 'Progressive Vision Loss',
    category: 'Visual',
  },
  {
    value: 'sudden_vision_loss',
    label: 'Sudden Vision Loss',
    category: 'Visual',
  },
  {
    value: 'double_vision',
    label: 'Diplopia (Double Vision)',
    category: 'Visual',
  },
  { value: 'floaters', label: 'Floaters', category: 'Visual' },
  {
    value: 'flashes',
    label: 'Photopsia (Flashes of Light)',
    category: 'Visual',
  },
  { value: 'eye_pain', label: 'Eye Pain (Ocular)', category: 'Pain' },
  { value: 'periorbital_pain', label: 'Periorbital Pain', category: 'Pain' },
  {
    value: 'headache_eye',
    label: 'Headache (Associated with Eye Use)',
    category: 'Pain',
  },
  {
    value: 'photophobia',
    label: 'Photophobia (Light Sensitivity)',
    category: 'Sensitivity',
  },
  {
    value: 'glare',
    label: 'Glare / Haloes Around Lights',
    category: 'Sensitivity',
  },
  { value: 'redness', label: 'Redness / Injection', category: 'External' },
  {
    value: 'discharge',
    label: 'Discharge (Purulent / Watery / Mucoid)',
    category: 'External',
  },
  { value: 'itching', label: 'Itching / Pruritis', category: 'External' },
  {
    value: 'tearing',
    label: 'Epiphora (Excessive Tearing)',
    category: 'External',
  },
  {
    value: 'dryness',
    label: 'Dryness / Foreign Body Sensation',
    category: 'External',
  },
  {
    value: 'lid_swelling',
    label: 'Lid Swelling / Oedema',
    category: 'External',
  },
  { value: 'ptosis', label: 'Ptosis (Drooping Lid)', category: 'External' },
  { value: 'trauma', label: 'Ocular Trauma / Injury', category: 'Other' },
  {
    value: 'routine_checkup',
    label: 'Routine Eye Check-Up',
    category: 'Other',
  },
  {
    value: 'glasses_update',
    label: 'Glasses / Prescription Update',
    category: 'Other',
  },
];

// =============================================================================
// Diagnosis Options — Comprehensive Ophthalmic Diagnoses
// =============================================================================

export const DIAGNOSIS_OPTIONS: ClinicalOption[] = [
  // Glaucoma
  {
    value: 'poag',
    label: 'Primary Open Angle Glaucoma (POAG)',
    category: 'Glaucoma',
  },
  {
    value: 'angle_closure',
    label: 'Angle Closure Glaucoma',
    category: 'Glaucoma',
  },
  {
    value: 'secondary_glaucoma',
    label: 'Secondary Glaucoma',
    category: 'Glaucoma',
  },
  { value: 'oht', label: 'Ocular Hypertension (OHT)', category: 'Glaucoma' },
  {
    value: 'glaucoma_suspect',
    label: 'Glaucoma Suspect',
    category: 'Glaucoma',
  },
  { value: 'nv_glaucoma', label: 'Neovascular Glaucoma', category: 'Glaucoma' },
  // Cataract
  {
    value: 'immature_cataract',
    label: 'Immature Cataract',
    category: 'Cataract',
  },
  { value: 'mature_cataract', label: 'Mature Cataract', category: 'Cataract' },
  {
    value: 'hypermature_cataract',
    label: 'Hypermature Cataract',
    category: 'Cataract',
  },
  {
    value: 'posterior_subcapsular',
    label: 'Posterior Subcapsular Cataract',
    category: 'Cataract',
  },
  {
    value: 'nuclear_sclerosis',
    label: 'Nuclear Sclerotic Cataract',
    category: 'Cataract',
  },
  {
    value: 'cortical_cataract',
    label: 'Cortical Cataract',
    category: 'Cataract',
  },
  {
    value: 'traumatic_cataract',
    label: 'Traumatic Cataract',
    category: 'Cataract',
  },
  // Retina
  {
    value: 'npdr',
    label: 'Non-Proliferative Diabetic Retinopathy (NPDR)',
    category: 'Retina',
  },
  {
    value: 'pdr',
    label: 'Proliferative Diabetic Retinopathy (PDR)',
    category: 'Retina',
  },
  { value: 'dme', label: 'Diabetic Macular Edema (DME)', category: 'Retina' },
  {
    value: 'amd_dry',
    label: 'Age-Related Macular Degeneration - Dry',
    category: 'Retina',
  },
  {
    value: 'amd_wet',
    label: 'Age-Related Macular Degeneration - Wet',
    category: 'Retina',
  },
  { value: 'rd', label: 'Retinal Detachment', category: 'Retina' },
  { value: 'rvo', label: 'Retinal Vein Occlusion (RVO)', category: 'Retina' },
  { value: 'rao', label: 'Retinal Artery Occlusion (RAO)', category: 'Retina' },
  { value: 'macular_hole', label: 'Macular Hole', category: 'Retina' },
  { value: 'erm', label: 'Epiretinal Membrane', category: 'Retina' },
  // Cornea
  { value: 'corneal_ulcer', label: 'Corneal Ulcer', category: 'Cornea' },
  {
    value: 'keratitis',
    label: 'Keratitis (Corneal Inflammation)',
    category: 'Cornea',
  },
  { value: 'keratoconus', label: 'Keratoconus', category: 'Cornea' },
  {
    value: 'corneal_scar',
    label: 'Corneal Scar / Opacity',
    category: 'Cornea',
  },
  { value: 'pterygium', label: 'Pterygium', category: 'Cornea' },
  { value: 'dry_eye_syndrome', label: 'Dry Eye Syndrome', category: 'Cornea' },
  // Refractive
  {
    value: 'myopia',
    label: 'Myopia (Short-Sightedness)',
    category: 'Refractive',
  },
  {
    value: 'hyperopia',
    label: 'Hyperopia (Long-Sightedness)',
    category: 'Refractive',
  },
  { value: 'astigmatism', label: 'Astigmatism', category: 'Refractive' },
  { value: 'presbyopia', label: 'Presbyopia', category: 'Refractive' },
  { value: 'amblyopia', label: 'Amblyopia (Lazy Eye)', category: 'Refractive' },
  // External / Anterior
  {
    value: 'allergic_conjunctivitis',
    label: 'Allergic Conjunctivitis',
    category: 'External',
  },
  {
    value: 'bacterial_conjunctivitis',
    label: 'Bacterial Conjunctivitis',
    category: 'External',
  },
  {
    value: 'viral_conjunctivitis',
    label: 'Viral Conjunctivitis',
    category: 'External',
  },
  { value: 'blepharitis', label: 'Blepharitis', category: 'External' },
  { value: 'chalazion', label: 'Chalazion', category: 'External' },
  { value: 'hordeolum', label: 'Hordeolum (Stye)', category: 'External' },
  { value: 'dacryocystitis', label: 'Dacryocystitis', category: 'External' },
  {
    value: 'uveitis',
    label: 'Uveitis (Anterior / Intermediate / Posterior)',
    category: 'Uvea',
  },
  { value: 'episcleritis', label: 'Episcleritis', category: 'External' },
  { value: 'scleritis', label: 'Scleritis', category: 'External' },
  // Neuro
  {
    value: 'optic_neuritis',
    label: 'Optic Neuritis',
    category: 'Neuro-Ophthalmology',
  },
  {
    value: 'papilledema',
    label: 'Papilledema',
    category: 'Neuro-Ophthalmology',
  },
  {
    value: 'optic_atrophy',
    label: 'Optic Atrophy',
    category: 'Neuro-Ophthalmology',
  },
  {
    value: 'cranial_nerve_palsy',
    label: 'Cranial Nerve Palsy (III, IV, VI)',
    category: 'Neuro-Ophthalmology',
  },
  // Orbit / Adnexa
  { value: 'proptosis', label: 'Proptosis / Exophthalmos', category: 'Orbit' },
  {
    value: 'orbital_cellulitis',
    label: 'Orbital Cellulitis',
    category: 'Orbit',
  },
  {
    value: 'thyroid_eye_disease',
    label: 'Thyroid Eye Disease',
    category: 'Orbit',
  },
  // Pediatric
  { value: 'strabismus', label: 'Strabismus (Squint)', category: 'Pediatric' },
  {
    value: 'congenital_cataract',
    label: 'Congenital Cataract',
    category: 'Pediatric',
  },
  {
    value: 'rop',
    label: 'Retinopathy of Prematurity (ROP)',
    category: 'Pediatric',
  },
];

// =============================================================================
// Slit-Lamp Findings
// =============================================================================

export const CORNEA_FINDINGS: ClinicalOption[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'corneal_ulcer', label: 'Corneal Ulcer' },
  { value: 'corneal_scar', label: 'Corneal Scar' },
  { value: 'keratitis', label: 'Keratitis' },
  { value: 'corneal_oedema', label: 'Corneal Oedema' },
  { value: 'arcus_senilis', label: 'Arcus Senilis' },
  { value: 'band_keratopathy', label: 'Band Keratopathy' },
  { value: 'krukenberg_spindle', label: 'Krukenberg Spindle' },
  { value: 'epithelial_defect', label: 'Epithelial Defect' },
  { value: 'stromal_infiltrate', label: 'Stromal Infiltrate' },
  { value: 'endothelial_guttae', label: 'Endothelial Guttae' },
  { value: 'kp', label: 'Keratic Precipitates (KP)' },
  { value: 'neovascularization', label: 'Corneal Neovascularization' },
];

export const CONJUNCTIVA_FINDINGS: ClinicalOption[] = [
  { value: 'normal', label: 'Normal / Quiet' },
  { value: 'injection', label: 'Conjunctival Injection' },
  { value: 'chemosis', label: 'Chemosis' },
  { value: 'papillae', label: 'Papillae' },
  { value: 'follicles', label: 'Follicles' },
  {
    value: 'subconjunctival_haemorrhage',
    label: 'Subconjunctival Haemorrhage',
  },
  { value: 'pinguecula', label: 'Pinguecula' },
  { value: 'pterygium', label: 'Pterygium' },
  { value: 'discharge', label: 'Discharge Present' },
];

export const LENS_FINDINGS: ClinicalOption[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'nuclear_sclerosis', label: 'Nuclear Sclerosis' },
  { value: 'cortical_opacity', label: 'Cortical Opacity' },
  { value: 'posterior_subcapsular', label: 'Posterior Subcapsular Opacity' },
  { value: 'mature_cataract', label: 'Mature / White Cataract' },
  { value: 'subluxated', label: 'Subluxated Lens' },
  { value: 'iol_in_situ', label: 'IOL In Situ' },
  { value: 'aphakic', label: 'Aphakic (No Lens)' },
  { value: 'pco', label: 'Posterior Capsular Opacification (PCO)' },
];

// =============================================================================
// Fundoscopy / Posterior Segment
// =============================================================================

export const OPTIC_DISC_FINDINGS: ClinicalOption[] = [
  { value: 'normal', label: 'Normal' },
  {
    value: 'increased_cdr',
    label: 'Cup-Disc Ratio Increased',
    description: 'CDR > 0.5',
  },
  {
    value: 'papilledema',
    label: 'Papilledema',
    description: 'Disc swelling due to raised ICP',
  },
  {
    value: 'optic_atrophy',
    label: 'Optic Atrophy',
    description: 'Pale / white disc',
  },
  { value: 'disc_haemorrhage', label: 'Disc Haemorrhage' },
  { value: 'disc_pallor', label: 'Disc Pallor' },
  {
    value: 'neovascularization',
    label: 'Neovascularization of the Disc (NVD)',
  },
  { value: 'tilted_disc', label: 'Tilted Disc' },
  { value: 'disc_drusen', label: 'Optic Disc Drusen' },
];

export const MACULA_FINDINGS: ClinicalOption[] = [
  { value: 'normal', label: 'Normal – Foveal Reflex Present' },
  { value: 'macular_oedema', label: 'Macular Oedema' },
  { value: 'hard_exudates', label: 'Hard Exudates at Macula' },
  { value: 'drusen', label: 'Drusen' },
  { value: 'pigment_changes', label: 'Pigmentary Changes' },
  { value: 'macular_hole', label: 'Macular Hole' },
  { value: 'epiretinal_membrane', label: 'Epiretinal Membrane' },
  { value: 'csr', label: 'Central Serous Retinopathy (CSR)' },
  { value: 'macular_scar', label: 'Macular Scar' },
];

// =============================================================================
// Follow-Up Options
// =============================================================================

export const FOLLOW_UP_INTERVALS: ClinicalOption[] = [
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '6_weeks', label: '6 Weeks' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'prn', label: 'PRN (As Needed)' },
];

// =============================================================================
// Field Permission Map — Which role can edit which sections
// =============================================================================

export type FieldRole = 'nurse' | 'consultant' | 'both';

export interface FieldPermission {
  section: string;
  roles: FieldRole;
  description: string;
}

export const FIELD_PERMISSIONS: FieldPermission[] = [
  {
    section: 'chief_complaint',
    roles: 'both',
    description: 'Chief Complaint & History',
  },
  { section: 'visual_acuity', roles: 'both', description: 'Visual Acuity' },
  { section: 'iop', roles: 'both', description: 'Intraocular Pressure' },
  { section: 'refraction', roles: 'consultant', description: 'Refraction' },
  {
    section: 'anterior_segment',
    roles: 'consultant',
    description: 'Slit Lamp / Anterior Segment',
  },
  {
    section: 'posterior_segment',
    roles: 'consultant',
    description: 'Fundoscopy / Posterior Segment',
  },
  { section: 'diagnosis', roles: 'consultant', description: 'Diagnosis' },
  {
    section: 'treatment_plan',
    roles: 'consultant',
    description: 'Treatment Plan',
  },
  {
    section: 'orders',
    roles: 'consultant',
    description: 'Orders & Prescriptions',
  },
];

/**
 * Check if a given role can edit a specific section
 */
export function canEditSection(section: string, userRole: string): boolean {
  const perm = FIELD_PERMISSIONS.find((f) => f.section === section);
  if (!perm) return false;
  if (perm.roles === 'both') return true;
  if (perm.roles === 'consultant') {
    return ['doctor', 'medical_director', 'super_admin'].includes(userRole);
  }
  if (perm.roles === 'nurse') {
    return ['nurse', 'doctor', 'medical_director', 'super_admin'].includes(
      userRole,
    );
  }
  return false;
}
