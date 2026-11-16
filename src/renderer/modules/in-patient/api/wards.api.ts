// =============================================================================
// NDC MEDICAL CENTRE EMR - Wards API
// Supabase API functions for ward management
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  Ward,
  WardCensusView,
  WardType,
} from '../../../types/database.types';

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all active wards for a facility
 */
export async function getWards(facilityId: string) {
  const { data, error } = await supabase
    .from('wards')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Ward[];
}

/**
 * Get a single ward by ID
 */
export async function getWardById(wardId: string) {
  const { data, error } = await supabase
    .from('wards')
    .select(
      `
      *,
      head_nurse:staff!wards_head_nurse_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('id', wardId)
    .single();

  if (error) throw error;
  return data as Ward;
}

/**
 * Get wards by type
 */
export async function getWardsByType(facilityId: string, wardType: WardType) {
  const { data, error } = await supabase
    .from('wards')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('ward_type', wardType)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Ward[];
}

/**
 * Get ward census (occupancy data)
 */
export async function getWardCensus(facilityId: string) {
  const { data, error } = await supabase
    .from('ward_census')
    .select('*')
    .eq('facility_id', facilityId);

  if (error) throw error;
  return data as WardCensusView[];
}

/**
 * Get wards with available beds
 * Returns all active wards, not just those with available beds
 * The UI will show availability status for each ward
 */
export async function getWardsWithAvailability(facilityId: string) {
  const { data, error } = await supabase
    .from('wards')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Ward[];
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new ward
 */
export async function createWard(wardData: {
  facility_id: string;
  name: string;
  code: string;
  ward_type: WardType;
  description?: string;
  floor_number?: number;
  building?: string;
  nurse_station_phone?: string;
  head_nurse_id?: string;
}) {
  const { data, error } = await supabase
    .from('wards')
    .insert({
      ...wardData,
      total_beds: 0,
      available_beds: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Ward;
}

/**
 * Update a ward
 */
export async function updateWard(
  wardId: string,
  updates: Partial<Omit<Ward, 'id' | 'created_at' | 'facility_id'>>,
) {
  const { data, error } = await supabase
    .from('wards')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wardId)
    .select()
    .single();

  if (error) throw error;
  return data as Ward;
}

/**
 * Deactivate a ward (soft delete)
 */
export async function deactivateWard(wardId: string) {
  const { error } = await supabase
    .from('wards')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wardId);

  if (error) throw error;
}

/**
 * Assign head nurse to ward
 */
export async function assignHeadNurse(wardId: string, nurseId: string) {
  const { data, error } = await supabase
    .from('wards')
    .update({
      head_nurse_id: nurseId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', wardId)
    .select()
    .single();

  if (error) throw error;
  return data as Ward;
}
