/**
 * =============================================================================
 * CUSTOM FIELD OPTIONS API
 * =============================================================================
 * Handles CRUD for user-defined "Other" dropdown options.
 * Options are persisted in the custom_field_options table so they appear
 * as regular options on subsequent use.
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';

export interface CustomFieldOption {
  id: string;
  field_identifier: string;
  option_value: string;
  option_label: string;
  clinic_id?: string | null;
  created_at?: string;
}

/**
 * Fetch all custom options for a given field identifier.
 */
export async function fetchCustomFieldOptions(
  fieldIdentifier: string,
): Promise<CustomFieldOption[]> {
  const { data, error } = await supabase
    .from('custom_field_options')
    .select(
      'id, field_identifier, option_value, option_label, clinic_id, created_at',
    )
    .eq('field_identifier', fieldIdentifier)
    .order('option_label', { ascending: true });

  if (error) {
    console.error('[CustomFieldOptions] fetch error:', error);
    return [];
  }
  return (data || []) as CustomFieldOption[];
}

/**
 * Add a new custom option for a field. Upserts (ignores if already exists).
 */
export async function addCustomFieldOption(
  fieldIdentifier: string,
  optionLabel: string,
  clinicId?: string,
): Promise<CustomFieldOption | null> {
  const trimmed = optionLabel.trim();
  if (!trimmed) return null;

  const optionValue = trimmed.toLowerCase().replace(/\s+/g, '_');

  const { data, error } = await supabase
    .from('custom_field_options')
    .upsert(
      {
        field_identifier: fieldIdentifier,
        option_value: `custom_${optionValue}`,
        option_label: trimmed,
        clinic_id: clinicId || null,
      },
      { onConflict: 'field_identifier,option_value' },
    )
    .select()
    .single();

  if (error) {
    console.error('[CustomFieldOptions] add error:', error);
    return null;
  }
  return data as CustomFieldOption;
}
