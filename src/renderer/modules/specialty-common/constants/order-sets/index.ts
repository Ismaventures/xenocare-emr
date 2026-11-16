/**
 * =============================================================================
 * ORDER SETS INDEX
 * =============================================================================
 * Central registry of all system-default specialty order sets.
 * Facility-customized sets are loaded from the DB at runtime.
 * =============================================================================
 */

import type { SpecialtyOrderSet } from '../../dtos/specialty-clinic.dto';
import { CARDIOLOGY_ORDER_SETS } from './cardiology-order-sets';
import { DENTAL_ORDER_SETS } from './dental-order-sets';
import { DERMATOLOGY_ORDER_SETS } from './dermatology-order-sets';
import { ENDOCRINOLOGY_ORDER_SETS } from './endocrinology-order-sets';
import { ENT_ORDER_SETS } from './ent-order-sets';
import { GASTROENTEROLOGY_ORDER_SETS } from './gastroenterology-order-sets';
import { GENERAL_SURGERY_ORDER_SETS } from './general-surgery-order-sets';
import { GYNAECOLOGY_ORDER_SETS } from './gynaecology-order-sets';
import { NEPHROLOGY_ORDER_SETS } from './nephrology-order-sets';
import { NEUROLOGY_ORDER_SETS } from './neurology-order-sets';
import { NEUROSURGERY_ORDER_SETS } from './neurosurgery-order-sets';
import { OMFS_ORDER_SETS } from './omfs-order-sets';
import { OPHTHALMOLOGY_ORDER_SETS } from './ophthalmology-order-sets';
import { ORTHOPAEDICS_ORDER_SETS } from './orthopaedics-order-sets';
import { PAEDIATRICS_ORDER_SETS } from './paediatrics-order-sets';
import { PLASTIC_SURGERY_ORDER_SETS } from './plastic-surgery-order-sets';
import { PULMONOLOGY_ORDER_SETS } from './pulmonology-order-sets';
import { UROLOGY_ORDER_SETS } from './urology-order-sets';

/** All system-default order sets, keyed by specialty code */
export const SYSTEM_ORDER_SETS: Record<string, SpecialtyOrderSet[]> = {
  CARDIOLOGY: CARDIOLOGY_ORDER_SETS,
  DENTAL: DENTAL_ORDER_SETS,
  DERMATOLOGY: DERMATOLOGY_ORDER_SETS,
  ENDOCRINOLOGY: ENDOCRINOLOGY_ORDER_SETS,
  ENT: ENT_ORDER_SETS,
  GASTROENTEROLOGY: GASTROENTEROLOGY_ORDER_SETS,
  GENERAL_SURGERY: GENERAL_SURGERY_ORDER_SETS,
  GYNAECOLOGY: GYNAECOLOGY_ORDER_SETS,
  NEPHROLOGY: NEPHROLOGY_ORDER_SETS,
  NEUROLOGY: NEUROLOGY_ORDER_SETS,
  NEUROSURGERY: NEUROSURGERY_ORDER_SETS,
  ORAL_AND_MAXILLOFACIAL_SURGERY: OMFS_ORDER_SETS,
  OPHTHALMOLOGY: OPHTHALMOLOGY_ORDER_SETS,
  ORTHOPAEDICS: ORTHOPAEDICS_ORDER_SETS,
  PAEDIATRICS: PAEDIATRICS_ORDER_SETS,
  PLASTIC_SURGERY: PLASTIC_SURGERY_ORDER_SETS,
  PULMONOLOGY: PULMONOLOGY_ORDER_SETS,
  UROLOGY: UROLOGY_ORDER_SETS,
};

/** Get order sets for a specialty (system defaults only) */
export function getSystemOrderSets(specialtyCode: string): SpecialtyOrderSet[] {
  return SYSTEM_ORDER_SETS[specialtyCode] || [];
}

export {
  CARDIOLOGY_ORDER_SETS,
  DENTAL_ORDER_SETS,
  DERMATOLOGY_ORDER_SETS,
  ENDOCRINOLOGY_ORDER_SETS,
  ENT_ORDER_SETS,
  GASTROENTEROLOGY_ORDER_SETS,
  GENERAL_SURGERY_ORDER_SETS,
  GYNAECOLOGY_ORDER_SETS,
  NEPHROLOGY_ORDER_SETS,
  NEUROLOGY_ORDER_SETS,
  NEUROSURGERY_ORDER_SETS,
  OMFS_ORDER_SETS,
  OPHTHALMOLOGY_ORDER_SETS,
  ORTHOPAEDICS_ORDER_SETS,
  PAEDIATRICS_ORDER_SETS,
  PLASTIC_SURGERY_ORDER_SETS,
  PULMONOLOGY_ORDER_SETS,
  UROLOGY_ORDER_SETS,
};
