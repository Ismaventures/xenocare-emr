/**
 * Nursing Interventions DTOs
 *
 * Types and interfaces for nursing interventions - structured records
 * of nursing actions taken for patient care.
 */

import { ShiftType } from './nursing-notes.dto';

// =============================================================================
// DTOs
// =============================================================================

/**
 * Full nursing intervention record from database
 */
export interface NursingInterventionDTO {
  id: string;

  // Relationships
  encounter_id: string;
  patient_id: string;
  ward_id?: string | null;
  bed_id?: string | null;

  // Intervention classification
  category_code: string;
  intervention_code: string;
  custom_description?: string | null;

  // Additional context
  notes?: string | null;

  // Timing
  performed_at: string;
  shift?: ShiftType | null;

  // Recording info
  nurse_id: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined relations
  patient?: {
    patient_id: string;
    first_name: string;
    surname: string;
    file_number?: string;
  } | null;

  nurse?: {
    staff_id: string;
    first_name: string;
    last_name: string;
  } | null;

  ward?: {
    id: string;
    name: string;
  } | null;

  bed?: {
    id: string;
    bed_number: string;
  } | null;
}

/**
 * DTO for creating a single nursing intervention
 */
export interface CreateNursingInterventionDTO {
  encounter_id: string;
  patient_id: string;
  ward_id?: string;
  bed_id?: string;

  category_code: string;
  intervention_code: string;
  custom_description?: string;

  notes?: string;

  performed_at?: string; // ISO string, defaults to server time
  shift?: ShiftType;
}

/**
 * DTO for creating multiple interventions at once (bulk save)
 */
export interface CreateMultipleInterventionsDTO {
  encounter_id: string;
  patient_id: string;
  ward_id?: string;
  bed_id?: string;

  interventions: Array<{
    category_code: string;
    intervention_code: string;
    custom_description?: string;
    notes?: string;
  }>;

  performed_at?: string;
  shift?: ShiftType;
}

/**
 * DTO for updating a nursing intervention
 */
export interface UpdateNursingInterventionDTO {
  id: string;
  notes?: string;
  custom_description?: string;
  performed_at?: string;
}

/**
 * Filters for querying nursing interventions
 */
export interface NursingInterventionFilters {
  encounter_id?: string;
  patient_id?: string;
  ward_id?: string;
  nurse_id?: string;
  category_code?: string;
  intervention_code?: string;
  shift?: ShiftType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response for nursing interventions
 */
export interface NursingInterventionsResponse {
  data: NursingInterventionDTO[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Analytics: Intervention count by category
 */
export interface InterventionCategoryStats {
  category_code: string;
  count: number;
}

/**
 * Analytics: Intervention count by ward
 */
export interface InterventionWardStats {
  ward_id: string;
  ward_name: string;
  category_code: string;
  intervention_code: string;
  count: number;
}

/**
 * Analytics: Intervention count by shift
 */
export interface InterventionShiftStats {
  shift: ShiftType;
  category_code: string;
  intervention_code: string;
  count: number;
}
