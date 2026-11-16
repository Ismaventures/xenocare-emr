/**
 * Supabase API for the unified clinical_text_templates system.
 * Migration: 237_clinical_text_templates.sql
 */

import { supabase } from '../../api/supabaseClient';
import type {
  ClinicalTextTemplate,
  CreateClinicalTextTemplateInput,
  TemplateModule,
  UpdateClinicalTextTemplateInput,
} from './types';

// ---------------------------------------------------------------------------
// Get the current staff ID for the logged-in user
// ---------------------------------------------------------------------------
async function getCurrentStaffId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Search templates (shared + personal) for a given module
// ---------------------------------------------------------------------------
export async function searchClinicalTextTemplates(
  module: TemplateModule,
  query: string = '',
  category?: string,
  limit: number = 30,
): Promise<ClinicalTextTemplate[]> {
  const staffId = await getCurrentStaffId();
  if (!staffId) return [];

  const { data, error } = await supabase.rpc('search_clinical_text_templates', {
    p_module: module,
    p_staff_id: staffId,
    p_query: query.trim(),
    p_category: category ?? null,
    p_limit: limit,
  });

  if (error) {
    console.error('[ClinicalTextTemplates] Search error:', error);
    return [];
  }

  return (data ?? []) as ClinicalTextTemplate[];
}

// ---------------------------------------------------------------------------
// Record that this staff member used a template
// ---------------------------------------------------------------------------
export async function recordTemplateUsage(templateId: string): Promise<void> {
  const staffId = await getCurrentStaffId();
  if (!staffId) return;

  const { error } = await supabase.rpc('record_clinical_template_usage', {
    p_template_id: templateId,
    p_staff_id: staffId,
  });

  if (error) {
    console.warn('[ClinicalTextTemplates] Usage record error:', error);
  }
}

// ---------------------------------------------------------------------------
// Create a new template (personal or shared)
// ---------------------------------------------------------------------------
export async function createClinicalTextTemplate(
  input: CreateClinicalTextTemplateInput,
): Promise<ClinicalTextTemplate> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Not authenticated');

  const templateKey = `${input.module}_${Date.now()}_${staffId.slice(0, 8)}`;

  const { data, error } = await supabase
    .from('clinical_text_templates')
    .insert({
      template_key: templateKey,
      module: input.module,
      category: input.category ?? null,
      display_name: input.display_name,
      description: input.description ?? null,
      template_data: input.template_data,
      search_keywords: input.search_keywords ?? [],
      is_shared: input.is_shared,
      priority: input.priority ?? 0,
      created_by: staffId,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return data as unknown as ClinicalTextTemplate;
}

// ---------------------------------------------------------------------------
// Update a template (only owner or admin can do this — enforced by RLS)
// ---------------------------------------------------------------------------
export async function updateClinicalTextTemplate(
  id: string,
  input: UpdateClinicalTextTemplateInput,
): Promise<void> {
  const { error } = await supabase
    .from('clinical_text_templates')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to update template: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Delete a template (only owner or admin — enforced by RLS)
// ---------------------------------------------------------------------------
export async function deleteClinicalTextTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('clinical_text_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to delete template: ${error.message}`);
}

// ---------------------------------------------------------------------------
// List all templates for admin management (all modules)
// ---------------------------------------------------------------------------
export async function listAllTemplatesForAdmin(): Promise<ClinicalTextTemplate[]> {
  const { data, error } = await supabase
    .from('clinical_text_templates')
    .select('*')
    .eq('is_active', true)
    .order('module')
    .order('priority', { ascending: false })
    .order('display_name');

  if (error) throw new Error(`Failed to list templates: ${error.message}`);
  return (data ?? []) as unknown as ClinicalTextTemplate[];
}
