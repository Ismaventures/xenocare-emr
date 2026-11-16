/**
 * Nursing Interventions API
 *
 * CRUD operations for nursing interventions - structured records
 * of nursing actions taken for patient care.
 *
 * Supports bulk creation for saving multiple interventions at once
 * and analytics queries for reporting.
 */

import { supabase } from '../../../api/supabaseClient';
import {
  NursingInterventionDTO,
  CreateNursingInterventionDTO,
  CreateMultipleInterventionsDTO,
  UpdateNursingInterventionDTO,
  NursingInterventionFilters,
  NursingInterventionsResponse,
  InterventionCategoryStats,
  InterventionWardStats,
  InterventionShiftStats,
} from '../dtos/nursing-interventions.dto';
import { getCurrentShift, ShiftType } from '../dtos/nursing-notes.dto';
import {
  isValidInterventionCode,
  getCategoryForIntervention,
} from '../config/intervention-codes.config';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get current user's staff ID
 */
async function getCurrentStaffId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: staffData, error } = await supabase
    .from('staff')
    .select('staff_id, id')
    .eq('email', user.email)
    .single();

  if (error || !staffData) throw new Error('Staff record not found');

  // Return UUID (id) for foreign key references
  return staffData.id || staffData.staff_id;
}

/**
 * Validate intervention code
 */
function validateInterventionCode(code: string): boolean {
  return isValidInterventionCode(code);
}

/**
 * Get category code for an intervention
 */
function getCategoryCode(interventionCode: string): string {
  const category = getCategoryForIntervention(interventionCode);
  return category?.categoryCode || 'OTHER';
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get nursing interventions with filters
 */
export async function getNursingInterventions(
  filters: NursingInterventionFilters = {},
): Promise<NursingInterventionsResponse> {
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  let query = supabase
    .from('nursing_interventions')
    .select(
      `
      *,
      patient:patients(patient_id, first_name, surname, emr_number),
      nurse:staff!nursing_interventions_nurse_id_fkey(staff_id, first_name, last_name),
      ward:wards(id, name),
      bed:beds(id, bed_number)
    `,
      { count: 'exact' },
    )
    .order('performed_at', { ascending: false });

  // Apply filters
  if (filters.encounter_id) {
    query = query.eq('encounter_id', filters.encounter_id);
  }

  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }

  if (filters.ward_id) {
    query = query.eq('ward_id', filters.ward_id);
  }

  if (filters.nurse_id) {
    query = query.eq('nurse_id', filters.nurse_id);
  }

  if (filters.category_code) {
    query = query.eq('category_code', filters.category_code);
  }

  if (filters.intervention_code) {
    query = query.eq('intervention_code', filters.intervention_code);
  }

  if (filters.shift) {
    query = query.eq('shift', filters.shift);
  }

  if (filters.date_from) {
    query = query.gte('performed_at', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('performed_at', filters.date_to);
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching nursing interventions:', error);
    throw error;
  }

  return {
    data: data || [],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get nursing interventions for a specific encounter
 */
export async function getInterventionsByEncounter(
  encounterId: string,
): Promise<NursingInterventionDTO[]> {
  const { data, error } = await supabase
    .from('nursing_interventions')
    .select(
      `
      *,
      nurse:staff!nursing_interventions_nurse_id_fkey(staff_id, first_name, last_name),
      ward:wards(id, name),
      bed:beds(id, bed_number)
    `,
    )
    .eq('encounter_id', encounterId)
    .order('performed_at', { ascending: false });

  if (error) {
    console.error('Error fetching interventions by encounter:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a single nursing intervention
 */
export async function createNursingIntervention(
  intervention: CreateNursingInterventionDTO,
): Promise<NursingInterventionDTO> {
  // Validate required fields
  if (!intervention.encounter_id) throw new Error('encounter_id is required');
  if (!intervention.patient_id) throw new Error('patient_id is required');
  if (!intervention.intervention_code)
    throw new Error('intervention_code is required');

  // Validate intervention code
  if (!validateInterventionCode(intervention.intervention_code)) {
    throw new Error(
      `Invalid intervention code: ${intervention.intervention_code}`,
    );
  }

  // For OTHER_CUSTOM, require custom_description
  if (
    intervention.intervention_code === 'OTHER_CUSTOM' &&
    !intervention.custom_description
  ) {
    throw new Error(
      'custom_description is required for OTHER_CUSTOM interventions',
    );
  }

  const nurseId = await getCurrentStaffId();
  const categoryCode =
    intervention.category_code ||
    getCategoryCode(intervention.intervention_code);
  const shift = intervention.shift || getCurrentShift();

  const { data, error } = await supabase
    .from('nursing_interventions')
    .insert({
      encounter_id: intervention.encounter_id,
      patient_id: intervention.patient_id,
      ward_id: intervention.ward_id || null,
      bed_id: intervention.bed_id || null,
      category_code: categoryCode,
      intervention_code: intervention.intervention_code,
      custom_description: intervention.custom_description || null,
      notes: intervention.notes || null,
      performed_at: intervention.performed_at || new Date().toISOString(),
      shift,
      nurse_id: nurseId,
    })
    .select(
      `
      *,
      nurse:staff!nursing_interventions_nurse_id_fkey(staff_id, first_name, last_name),
      ward:wards(id, name),
      bed:beds(id, bed_number)
    `,
    )
    .single();

  if (error) {
    console.error('Error creating nursing intervention:', error);
    throw error;
  }

  return data;
}

/**
 * Create multiple nursing interventions at once (bulk save)
 */
export async function createMultipleInterventions(
  dto: CreateMultipleInterventionsDTO,
): Promise<NursingInterventionDTO[]> {
  // Validate required fields
  if (!dto.encounter_id) throw new Error('encounter_id is required');
  if (!dto.patient_id) throw new Error('patient_id is required');
  if (!dto.interventions || dto.interventions.length === 0) {
    throw new Error('At least one intervention is required');
  }

  const nurseId = await getCurrentStaffId();
  const shift = dto.shift || getCurrentShift();
  const performedAt = dto.performed_at || new Date().toISOString();

  // Validate all intervention codes
  for (const intervention of dto.interventions) {
    if (!validateInterventionCode(intervention.intervention_code)) {
      throw new Error(
        `Invalid intervention code: ${intervention.intervention_code}`,
      );
    }
    if (
      intervention.intervention_code === 'OTHER_CUSTOM' &&
      !intervention.custom_description
    ) {
      throw new Error(
        'custom_description is required for OTHER_CUSTOM interventions',
      );
    }
  }

  // Build records to insert
  const records = dto.interventions.map((intervention) => ({
    encounter_id: dto.encounter_id,
    patient_id: dto.patient_id,
    ward_id: dto.ward_id || null,
    bed_id: dto.bed_id || null,
    category_code:
      intervention.category_code ||
      getCategoryCode(intervention.intervention_code),
    intervention_code: intervention.intervention_code,
    custom_description: intervention.custom_description || null,
    notes: intervention.notes || null,
    performed_at: performedAt,
    shift,
    nurse_id: nurseId,
  }));

  const { data, error } = await supabase
    .from('nursing_interventions')
    .insert(records)
    .select(
      `
      *,
      nurse:staff!nursing_interventions_nurse_id_fkey(staff_id, first_name, last_name),
      ward:wards(id, name),
      bed:beds(id, bed_number)
    `,
    );

  if (error) {
    console.error('Error creating multiple interventions:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update a nursing intervention
 */
export async function updateNursingIntervention(
  dto: UpdateNursingInterventionDTO,
): Promise<NursingInterventionDTO> {
  const { id, ...updates } = dto;

  const { data, error } = await supabase
    .from('nursing_interventions')
    .update({
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.custom_description !== undefined && {
        custom_description: updates.custom_description,
      }),
      ...(updates.performed_at !== undefined && {
        performed_at: updates.performed_at,
      }),
    })
    .eq('id', id)
    .select(
      `
      *,
      nurse:staff!nursing_interventions_nurse_id_fkey(staff_id, first_name, last_name),
      ward:wards(id, name),
      bed:beds(id, bed_number)
    `,
    )
    .single();

  if (error) {
    console.error('Error updating nursing intervention:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a nursing intervention
 */
export async function deleteNursingIntervention(id: string): Promise<void> {
  const { error } = await supabase
    .from('nursing_interventions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting nursing intervention:', error);
    throw error;
  }
}

// =============================================================================
// Analytics Queries
// =============================================================================

/**
 * Get intervention counts by category
 */
export async function getInterventionStatsByCategory(
  filters: {
    ward_id?: string;
    date_from?: string;
    date_to?: string;
  } = {},
): Promise<InterventionCategoryStats[]> {
  let query = supabase.from('nursing_interventions').select('category_code');

  if (filters.ward_id) {
    query = query.eq('ward_id', filters.ward_id);
  }
  if (filters.date_from) {
    query = query.gte('performed_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('performed_at', filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching category stats:', error);
    throw error;
  }

  // Aggregate counts
  const counts: Record<string, number> = {};
  (data || []).forEach((row) => {
    counts[row.category_code] = (counts[row.category_code] || 0) + 1;
  });

  return Object.entries(counts).map(([category_code, count]) => ({
    category_code,
    count,
  }));
}

/**
 * Get intervention counts by ward
 */
export async function getInterventionStatsByWard(
  filters: {
    category_code?: string;
    intervention_code?: string;
    date_from?: string;
    date_to?: string;
  } = {},
): Promise<InterventionWardStats[]> {
  let query = supabase.from('nursing_interventions').select(
    `
      ward_id,
      category_code,
      intervention_code,
      ward:wards(name)
    `,
  );

  if (filters.category_code) {
    query = query.eq('category_code', filters.category_code);
  }
  if (filters.intervention_code) {
    query = query.eq('intervention_code', filters.intervention_code);
  }
  if (filters.date_from) {
    query = query.gte('performed_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('performed_at', filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching ward stats:', error);
    throw error;
  }

  // Aggregate counts by ward + category + code
  const counts: Record<string, InterventionWardStats> = {};
  (data || []).forEach((row: any) => {
    const key = `${row.ward_id}-${row.category_code}-${row.intervention_code}`;
    if (!counts[key]) {
      counts[key] = {
        ward_id: row.ward_id,
        ward_name: row.ward?.name || 'Unknown',
        category_code: row.category_code,
        intervention_code: row.intervention_code,
        count: 0,
      };
    }
    counts[key].count++;
  });

  return Object.values(counts);
}

/**
 * Get intervention counts by shift
 */
export async function getInterventionStatsByShift(
  filters: {
    ward_id?: string;
    category_code?: string;
    date_from?: string;
    date_to?: string;
  } = {},
): Promise<InterventionShiftStats[]> {
  let query = supabase
    .from('nursing_interventions')
    .select('shift, category_code, intervention_code')
    .not('shift', 'is', null);

  if (filters.ward_id) {
    query = query.eq('ward_id', filters.ward_id);
  }
  if (filters.category_code) {
    query = query.eq('category_code', filters.category_code);
  }
  if (filters.date_from) {
    query = query.gte('performed_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('performed_at', filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching shift stats:', error);
    throw error;
  }

  // Aggregate counts by shift + category + code
  const counts: Record<string, InterventionShiftStats> = {};
  (data || []).forEach((row) => {
    const key = `${row.shift}-${row.category_code}-${row.intervention_code}`;
    if (!counts[key]) {
      counts[key] = {
        shift: row.shift as ShiftType,
        category_code: row.category_code,
        intervention_code: row.intervention_code,
        count: 0,
      };
    }
    counts[key].count++;
  });

  return Object.values(counts);
}
