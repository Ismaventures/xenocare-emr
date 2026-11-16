/**
 * =============================================================================
 * OPHTHALMOLOGY ORDER SETS
 * =============================================================================
 * Pre-bundled investigation panels for common ophthalmology clinical scenarios.
 * These are "system" defaults shipped with the EMR. Facilities can supplement
 * with their own DB-stored order sets.
 *
 * Reference: SPECIALTY_CLINIC_ARCHITECTURE_REVIEW.md § 6.12
 * =============================================================================
 */

import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';

export const OPHTHALMOLOGY_ORDER_SETS: SpecialtyOrderSet[] = [
  // ── Glaucoma Assessment ────────────────────────────────────────────────────
  {
    id: 'ophthal-os-glaucoma',
    specialty_code: 'OPHTHALMOLOGY',
    set_name: 'Glaucoma Assessment',
    description:
      'Comprehensive workup for suspected or confirmed glaucoma — visual field, OCT RNFL, gonioscopy, pachymetry',
    clinical_scenario:
      'Patient with elevated IOP, optic disc cupping, family history of glaucoma, or glaucoma suspect',
    orders: {
      lab_tests: [],
      imaging: [
        {
          name: 'Visual Field Test (Humphrey / Octopus)',
          code: 'VFT',
          modality: 'Perimetry',
          body_part: 'Eyes',
        },
        {
          name: 'OCT — Retinal Nerve Fibre Layer (RNFL)',
          code: 'OCT_RNFL',
          modality: 'OCT',
          body_part: 'Eyes',
        },
        {
          name: 'Gonioscopy',
          code: 'GONIO',
          modality: 'Slit Lamp',
          body_part: 'Eyes',
        },
        {
          name: 'Pachymetry (Central Corneal Thickness)',
          code: 'PACHY',
          modality: 'Ultrasound',
          body_part: 'Eyes',
        },
      ],
    },
    is_default: true,
    is_system: true,
    is_active: true,
  },

  // ── Diabetic Eye Screening ─────────────────────────────────────────────────
  {
    id: 'ophthal-os-diabetic-eye',
    specialty_code: 'OPHTHALMOLOGY',
    set_name: 'Diabetic Eye Screening',
    description:
      'Screening and grading panel for diabetic retinopathy — fundal photo, OCT macula, FFA',
    clinical_scenario:
      'Diabetic patient due for annual eye screening, blurred vision, or known diabetic retinopathy',
    orders: {
      lab_tests: [
        { name: 'HbA1c', code: 'HBA1C', specimen_type: 'Blood' },
        { name: 'Random Blood Sugar', code: 'RBS', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        { name: 'Lipid Panel', code: 'LIPID', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Fundal Photography (Colour)',
          code: 'FUNDUS_PHOTO',
          modality: 'Photography',
          body_part: 'Eyes',
        },
        {
          name: 'OCT — Macula',
          code: 'OCT_MACULA',
          modality: 'OCT',
          body_part: 'Eyes',
        },
        {
          name: 'Fundus Fluorescein Angiography (FFA)',
          code: 'FFA',
          modality: 'Angiography',
          body_part: 'Eyes',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },

  // ── Cataract Pre-Op ────────────────────────────────────────────────────────
  {
    id: 'ophthal-os-cataract-preop',
    specialty_code: 'OPHTHALMOLOGY',
    set_name: 'Cataract Pre-Op Workup',
    description:
      'Pre-operative workup for cataract surgery — biometry, basic bloods, BP check',
    clinical_scenario:
      'Patient with visually significant cataract listed for phacoemulsification or ECCE',
    orders: {
      lab_tests: [
        { name: 'Full Blood Count', code: 'FBC', specimen_type: 'Blood' },
        { name: 'Random Blood Sugar', code: 'RBS', specimen_type: 'Blood' },
        { name: 'Urea & Electrolytes', code: 'UE', specimen_type: 'Blood' },
        {
          name: 'Coagulation Screen (PT, INR)',
          code: 'COAG',
          specimen_type: 'Blood',
        },
        { name: 'Hepatitis B & C Screen', code: 'HEP', specimen_type: 'Blood' },
        { name: 'HIV Screening', code: 'HIV', specimen_type: 'Blood' },
      ],
      imaging: [
        {
          name: 'Biometry (IOL Power Calculation)',
          code: 'BIOMETRY',
          modality: 'A-Scan / Optical',
          body_part: 'Eyes',
        },
        {
          name: 'Keratometry',
          code: 'KERATO',
          modality: 'Keratometer',
          body_part: 'Eyes',
        },
        {
          name: 'B-Scan Ultrasound (if dense cataract)',
          code: 'BSCAN',
          modality: 'Ultrasound',
          body_part: 'Eyes',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },

  // ── Retinal Assessment ─────────────────────────────────────────────────────
  {
    id: 'ophthal-os-retinal',
    specialty_code: 'OPHTHALMOLOGY',
    set_name: 'Retinal Assessment',
    description:
      'Investigation panel for retinal pathology — OCT, FFA, B-scan USS',
    clinical_scenario:
      'Patient with macular pathology, retinal detachment suspicion, vitreous opacity, or AMD',
    orders: {
      lab_tests: [],
      imaging: [
        {
          name: 'OCT — Macula',
          code: 'OCT_MACULA',
          modality: 'OCT',
          body_part: 'Eyes',
        },
        {
          name: 'Fundus Fluorescein Angiography (FFA)',
          code: 'FFA',
          modality: 'Angiography',
          body_part: 'Eyes',
        },
        {
          name: 'B-Scan Ultrasound',
          code: 'BSCAN',
          modality: 'Ultrasound',
          body_part: 'Eyes',
        },
        {
          name: 'Fundal Photography (Colour)',
          code: 'FUNDUS_PHOTO',
          modality: 'Photography',
          body_part: 'Eyes',
        },
      ],
    },
    is_default: false,
    is_system: true,
    is_active: true,
  },
];
