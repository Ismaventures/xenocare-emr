// =============================================================================
// NDC MEDICAL CENTRE EMR - Procedure Catalogue API
// Supabase API functions for procedure catalogue management
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import type {
  ProcedureCatalogue,
  ProcedureCategory,
} from '../../../types/database.types';

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all active procedures in the catalogue
 */
export async function getProcedureCatalogue(facilityId?: string) {
  let query = supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  // Include facility-specific and global procedures
  if (facilityId) {
    query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
  } else {
    query = query.is('facility_id', null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ProcedureCatalogue[];
}

/**
 * Get a single procedure from catalogue
 */
export async function getProcedureFromCatalogue(procedureId: string) {
  const { data, error } = await supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('id', procedureId)
    .single();

  if (error) throw error;
  return data as ProcedureCatalogue;
}

/**
 * Get procedure by code
 */
export async function getProcedureByCode(code: string) {
  const { data, error } = await supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('code', code)
    .single();

  if (error) throw error;
  return data as ProcedureCatalogue;
}

/**
 * Get procedures by category
 */
export async function getProceduresByCategory(
  category: ProcedureCategory,
  facilityId?: string,
) {
  let query = supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('name');

  if (facilityId) {
    query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ProcedureCatalogue[];
}

/**
 * Search procedures in catalogue
 */
export async function searchProcedureCatalogue(
  searchTerm: string,
  facilityId?: string,
) {
  let query = supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('is_active', true)
    .or(
      `name.ilike.%${sanitizeFilterValue(searchTerm)}%,code.ilike.%${sanitizeFilterValue(searchTerm)}%,cpt_code.ilike.%${sanitizeFilterValue(searchTerm)}%`,
    )
    .order('name')
    .limit(50);

  if (facilityId) {
    query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ProcedureCatalogue[];
}

/**
 * Get procedures requiring anesthesia
 */
export async function getProceduresRequiringAnesthesia(facilityId?: string) {
  let query = supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('is_active', true)
    .eq('requires_anesthesia', true)
    .order('category')
    .order('name');

  if (facilityId) {
    query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ProcedureCatalogue[];
}

/**
 * Get procedures requiring admission
 */
export async function getProceduresRequiringAdmission(facilityId?: string) {
  let query = supabase
    .from('procedure_catalogue')
    .select('*')
    .eq('is_active', true)
    .eq('requires_admission', true)
    .order('category')
    .order('name');

  if (facilityId) {
    query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as ProcedureCatalogue[];
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new procedure in catalogue
 */
export async function createProcedureInCatalogue(
  procedureData: Omit<ProcedureCatalogue, 'id' | 'created_at' | 'updated_at'>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedure_catalogue')
    .insert({
      ...procedureData,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureCatalogue;
}

/**
 * Update a procedure in catalogue
 */
export async function updateProcedureInCatalogue(
  procedureId: string,
  updates: Partial<Omit<ProcedureCatalogue, 'id' | 'created_at' | 'code'>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedure_catalogue')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureCatalogue;
}

/**
 * Deactivate a procedure in catalogue
 */
export async function deactivateProcedureInCatalogue(
  procedureId: string,
  userId: string,
) {
  const { error } = await supabase
    .from('procedure_catalogue')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId);

  if (error) throw error;
}

/**
 * Update procedure pricing
 */
export async function updateProcedurePricing(
  procedureId: string,
  pricing: {
    base_price?: number;
    nhis_price?: number;
    professional_fee?: number;
    facility_fee?: number;
  },
  userId: string,
) {
  const { data, error } = await supabase
    .from('procedure_catalogue')
    .update({
      ...pricing,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', procedureId)
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureCatalogue;
}

/**
 * Get procedure categories with counts
 */
export async function getProcedureCategoryCounts(facilityId?: string) {
  const { data, error } = await supabase
    .from('procedure_catalogue')
    .select('category')
    .eq('is_active', true);

  if (error) throw error;

  const counts: Record<string, number> = {};
  data.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });

  return counts;
}
