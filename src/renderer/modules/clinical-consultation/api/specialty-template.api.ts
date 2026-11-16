/**
 * =============================================================================
 * SPECIALTY TEMPLATES API
 * =============================================================================
 * API functions for managing specialty consultation templates.
 * Templates drive dynamic form rendering in the consultation wizard.
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';
import {
  SpecialtyTemplate,
  SpecialtyTemplateSection,
  SpecialtyTemplateField,
  SpecialtyTemplateWithSections,
  CreateSpecialtyTemplateDTO,
  UpdateSpecialtyTemplateDTO,
  CreateTemplateSectionDTO,
  CreateTemplateFieldDTO,
  SpecialtyFormData,
  SpecialtyValidationResult,
  SpecialtySummary,
} from '../dtos/specialty-template.dto';
import { getSpecialtyTemplate as getLocalSpecialtyTemplate } from '../constants/specialty-templates';

// =============================================================================
// TEMPLATE CRUD
// =============================================================================

/**
 * Get all active specialty templates (summary view)
 */
export async function getSpecialtyTemplates(): Promise<SpecialtyTemplate[]> {
  const { data, error } = await supabase
    .from('specialty_templates')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get all specialty templates including inactive (for admin)
 */
export async function getAllSpecialtyTemplates(): Promise<SpecialtyTemplate[]> {
  const { data, error } = await supabase
    .from('specialty_templates')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specialty template by code (summary only)
 */
export async function getSpecialtyTemplateByCode(
  specialtyCode: string,
): Promise<SpecialtyTemplate | null> {
  const { data, error } = await supabase
    .from('specialty_templates')
    .select('*')
    .eq('specialty_code', specialtyCode)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Get full template with sections and fields.
 * Uses local TypeScript constants first (always available), falls back to DB RPC if needed.
 */
export async function getFullSpecialtyTemplate(
  specialtyCode: string,
): Promise<SpecialtyTemplateWithSections | null> {
  // Try local constants first - they're always available and avoid network calls
  const localResult = getLocalTemplateAsWithSections(specialtyCode);
  if (localResult && localResult.sections && localResult.sections.length > 0) {
    return localResult;
  }

  // No local template - try DB RPC as fallback
  try {
    const { data, error } = await supabase.rpc('get_specialty_template', {
      p_specialty_code: specialtyCode,
    });

    if (error) {
      console.warn(
        `[specialty-template.api] RPC error for ${specialtyCode}, no local template available:`,
        error.message,
      );
      return null;
    }

    // Check if we got a valid template with sections
    if (
      data &&
      data.template &&
      Array.isArray(data.sections) &&
      data.sections.length > 0
    ) {
      return {
        ...data,
        template: {
          ...data.template,
          sections: data.sections,
        },
      } as SpecialtyTemplateWithSections;
    }

    return null;
  } catch (err) {
    console.warn(
      `[specialty-template.api] Exception for ${specialtyCode}:`,
      err,
    );
    return null;
  }
}

/**
 * Helper: Get local TypeScript template and convert to SpecialtyTemplateWithSections format
 */
function getLocalTemplateAsWithSections(
  specialtyCode: string,
): SpecialtyTemplateWithSections | null {
  const localTemplate = getLocalSpecialtyTemplate(specialtyCode);
  if (!localTemplate) {
    return null;
  }

  return {
    template: localTemplate,
    sections: localTemplate.sections || [],
  };
}

/**
 * Get template with sections and fields by ID
 */
export async function getSpecialtyTemplateById(
  templateId: string,
): Promise<SpecialtyTemplate | null> {
  const { data: template, error: templateError } = await supabase
    .from('specialty_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError && templateError.code !== 'PGRST116') throw templateError;
  if (!template) return null;

  // Fetch sections
  const { data: sections, error: sectionsError } = await supabase
    .from('specialty_template_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order', { ascending: true });

  if (sectionsError) throw sectionsError;

  // Fetch fields for all sections
  const sectionIds = (sections || []).map((s) => s.id);
  let fields: SpecialtyTemplateField[] = [];

  if (sectionIds.length > 0) {
    const { data: fieldData, error: fieldsError } = await supabase
      .from('specialty_template_fields')
      .select('*')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true });

    if (fieldsError) throw fieldsError;
    fields = fieldData || [];
  }

  // Assemble sections with their fields
  const sectionsWithFields = (sections || []).map((section) => ({
    ...section,
    fields: fields.filter((f) => f.section_id === section.id),
  }));

  return {
    ...template,
    sections: sectionsWithFields,
  };
}

/**
 * Create a new specialty template
 */
export async function createSpecialtyTemplate(
  dto: CreateSpecialtyTemplateDTO,
): Promise<SpecialtyTemplate> {
  const { data, error } = await supabase
    .from('specialty_templates')
    .insert([dto])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a specialty template
 */
export async function updateSpecialtyTemplate(
  dto: UpdateSpecialtyTemplateDTO,
): Promise<SpecialtyTemplate> {
  const { id, ...updates } = dto;
  const { data, error } = await supabase
    .from('specialty_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a specialty template (soft delete by setting is_active = false)
 */
export async function deleteSpecialtyTemplate(
  templateId: string,
): Promise<void> {
  const { error } = await supabase
    .from('specialty_templates')
    .update({ is_active: false })
    .eq('id', templateId);

  if (error) throw error;
}

// =============================================================================
// SECTION CRUD
// =============================================================================

/**
 * Get sections for a template
 */
export async function getTemplateSections(
  templateId: string,
): Promise<SpecialtyTemplateSection[]> {
  const { data, error } = await supabase
    .from('specialty_template_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a template section
 */
export async function createTemplateSection(
  dto: CreateTemplateSectionDTO,
): Promise<SpecialtyTemplateSection> {
  const { data, error } = await supabase
    .from('specialty_template_sections')
    .insert([dto])
    .select()
    .single();

  if (error) throw error;
  return { ...data, fields: [] };
}

/**
 * Update a template section
 */
export async function updateTemplateSection(
  sectionId: string,
  updates: Partial<CreateTemplateSectionDTO>,
): Promise<SpecialtyTemplateSection> {
  const { data, error } = await supabase
    .from('specialty_template_sections')
    .update(updates)
    .eq('id', sectionId)
    .select()
    .single();

  if (error) throw error;
  return { ...data, fields: [] };
}

/**
 * Delete a template section (cascades to fields)
 */
export async function deleteTemplateSection(sectionId: string): Promise<void> {
  const { error } = await supabase
    .from('specialty_template_sections')
    .delete()
    .eq('id', sectionId);

  if (error) throw error;
}

/**
 * Reorder sections
 */
export async function reorderTemplateSections(
  sectionOrders: { id: string; display_order: number }[],
): Promise<void> {
  const updates = sectionOrders.map(({ id, display_order }) =>
    supabase
      .from('specialty_template_sections')
      .update({ display_order })
      .eq('id', id),
  );

  const results = await Promise.all(updates);
  const error = results.find((r) => r.error)?.error;
  if (error) throw error;
}

// =============================================================================
// FIELD CRUD
// =============================================================================

/**
 * Get fields for a section
 */
export async function getSectionFields(
  sectionId: string,
): Promise<SpecialtyTemplateField[]> {
  const { data, error } = await supabase
    .from('specialty_template_fields')
    .select('*')
    .eq('section_id', sectionId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a template field
 */
export async function createTemplateField(
  dto: CreateTemplateFieldDTO,
): Promise<SpecialtyTemplateField> {
  const { data, error } = await supabase
    .from('specialty_template_fields')
    .insert([dto])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a template field
 */
export async function updateTemplateField(
  fieldId: string,
  updates: Partial<CreateTemplateFieldDTO>,
): Promise<SpecialtyTemplateField> {
  const { data, error } = await supabase
    .from('specialty_template_fields')
    .update(updates)
    .eq('id', fieldId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a template field
 */
export async function deleteTemplateField(fieldId: string): Promise<void> {
  const { error } = await supabase
    .from('specialty_template_fields')
    .delete()
    .eq('id', fieldId);

  if (error) throw error;
}

/**
 * Reorder fields within a section
 */
export async function reorderSectionFields(
  fieldOrders: { id: string; display_order: number }[],
): Promise<void> {
  const updates = fieldOrders.map(({ id, display_order }) =>
    supabase
      .from('specialty_template_fields')
      .update({ display_order })
      .eq('id', id),
  );

  const results = await Promise.all(updates);
  const error = results.find((r) => r.error)?.error;
  if (error) throw error;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate specialty form data against template rules
 */
export async function validateSpecialtyData(
  specialtyCode: string,
  formData: SpecialtyFormData,
): Promise<SpecialtyValidationResult> {
  const { data, error } = await supabase.rpc('validate_specialty_data', {
    p_specialty_code: specialtyCode,
    p_specialty_data: formData,
  });

  if (error) throw error;
  return data as SpecialtyValidationResult;
}

/**
 * Client-side validation helper
 */
export function validateFieldValue(
  field: SpecialtyTemplateField,
  value: unknown,
): string | null {
  const { is_required, validation_rules, field_type } = field;

  // Check required
  if (is_required) {
    if (value === null || value === undefined || value === '') {
      return `${field.field_label} is required`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `${field.field_label} is required`;
    }
  }

  // Skip further validation if empty and not required
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Type-specific validation
  if (field_type === 'number' && typeof value === 'number') {
    if (
      validation_rules?.min_value !== undefined &&
      value < validation_rules.min_value
    ) {
      return `${field.field_label} must be at least ${validation_rules.min_value}`;
    }
    if (
      validation_rules?.max_value !== undefined &&
      value > validation_rules.max_value
    ) {
      return `${field.field_label} must be at most ${validation_rules.max_value}`;
    }
  }

  if (typeof value === 'string') {
    if (
      validation_rules?.min_length !== undefined &&
      value.length < validation_rules.min_length
    ) {
      return `${field.field_label} must be at least ${validation_rules.min_length} characters`;
    }
    if (
      validation_rules?.max_length !== undefined &&
      value.length > validation_rules.max_length
    ) {
      return `${field.field_label} must be at most ${validation_rules.max_length} characters`;
    }
    if (validation_rules?.pattern) {
      const regex = new RegExp(validation_rules.pattern);
      if (!regex.test(value)) {
        return (
          validation_rules.pattern_message ||
          `${field.field_label} format is invalid`
        );
      }
    }
  }

  return null;
}

/**
 * Validate all fields in a section
 */
export function validateSectionData(
  section: SpecialtyTemplateSection,
  formData: SpecialtyFormData,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of section.fields) {
    const error = validateFieldValue(field, formData[field.field_code]);
    if (error) {
      errors[field.field_code] = error;
    }
  }

  return errors;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get specialty summaries with counts
 */
export async function getSpecialtySummaries(): Promise<SpecialtySummary[]> {
  const templates = await getSpecialtyTemplates();

  const summaries: SpecialtySummary[] = [];

  for (const template of templates) {
    const { data: sections } = await supabase
      .from('specialty_template_sections')
      .select('id')
      .eq('template_id', template.id);

    const sectionIds = (sections || []).map((s) => s.id);
    let fieldCount = 0;

    if (sectionIds.length > 0) {
      const { count } = await supabase
        .from('specialty_template_fields')
        .select('id', { count: 'exact', head: true })
        .in('section_id', sectionIds);

      fieldCount = count || 0;
    }

    summaries.push({
      specialty_code: template.specialty_code,
      specialty_name: template.specialty_name,
      icon_name: template.icon_name,
      color_class: template.color_class,
      section_count: sectionIds.length,
      field_count: fieldCount,
    });
  }

  return summaries;
}

/**
 * Check if a specialty has a template (DB or local constants)
 */
export async function hasSpecialtyTemplate(
  specialtyCode: string,
): Promise<boolean> {
  // First check local constants - always available
  const localTemplate = getLocalSpecialtyTemplate(specialtyCode);
  if (
    localTemplate &&
    localTemplate.sections &&
    localTemplate.sections.length > 0
  ) {
    return true;
  }

  // Then check database
  try {
    const { count, error } = await supabase
      .from('specialty_templates')
      .select('id', { count: 'exact', head: true })
      .eq('specialty_code', specialtyCode)
      .eq('is_active', true);

    if (error) {
      console.warn(
        `[specialty-template.api] hasSpecialtyTemplate DB check failed:`,
        error.message,
      );
      // Still return true if we have local template
      return !!localTemplate;
    }
    return (count || 0) > 0 || !!localTemplate;
  } catch {
    // If DB fails, fallback to local template check
    return !!localTemplate;
  }
}

/**
 * Get specialty code from clinic
 */
export async function getSpecialtyCodeFromClinic(
  clinicId: string,
): Promise<string | null> {
  // First, get the clinic's department
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('clinic_name, department_id')
    .or(`id.eq.${clinicId},clinic_id.eq.${clinicId}`)
    .single();

  if (clinicError || !clinic) return null;

  // Map common clinic names to specialty codes
  const clinicNameMap: Record<string, string> = {
    cardiology: 'CARDIOLOGY',
    orthopaedics: 'ORTHOPAEDICS',
    orthopedics: 'ORTHOPAEDICS',
    dermatology: 'DERMATOLOGY',
    urology: 'UROLOGY',
    gastroenterology: 'GASTROENTEROLOGY',
    nephrology: 'NEPHROLOGY',
    paediatrics: 'PAEDIATRICS',
    pediatrics: 'PAEDIATRICS',
    neurosurgery: 'NEUROSURGERY',
    neurology: 'NEUROLOGY',
    neuropsychiatry: 'NEUROPSYCHIATRY',
    'general surgery': 'GENERAL_SURGERY',
    surgery: 'GENERAL_SURGERY',
    gynaecology: 'GYNAECOLOGY',
    gynecology: 'GYNAECOLOGY',
    'oral maxillofacial': 'ORAL_MAXILLOFACIAL',
    maxillofacial: 'ORAL_MAXILLOFACIAL',
    pulmonology: 'PULMONOLOGY',
    respiratory: 'PULMONOLOGY',
    endocrinology: 'ENDOCRINOLOGY',
    'plastic surgery': 'PLASTIC_SURGERY',
    plastics: 'PLASTIC_SURGERY',
    ent: 'ENT',
    'ear nose throat': 'ENT',
    ophthalmology: 'OPHTHALMOLOGY',
    eye: 'OPHTHALMOLOGY',
  };

  const normalizedName = clinic.clinic_name?.toLowerCase().trim() || '';

  for (const [key, code] of Object.entries(clinicNameMap)) {
    if (normalizedName.includes(key)) {
      return code;
    }
  }

  return null;
}

/**
 * Duplicate a template (for creating variations)
 */
export async function duplicateTemplate(
  sourceTemplateId: string,
  newSpecialtyCode: string,
  newSpecialtyName: string,
): Promise<SpecialtyTemplate> {
  // Get source template with all data
  const source = await getSpecialtyTemplateById(sourceTemplateId);
  if (!source) throw new Error('Source template not found');

  // Create new template
  const newTemplate = await createSpecialtyTemplate({
    specialty_code: newSpecialtyCode,
    specialty_name: newSpecialtyName,
    description: source.description,
    opd_type: source.opd_type,
    icon_name: source.icon_name,
    color_class: source.color_class,
    is_active: false, // Start as inactive
    display_order: source.display_order + 1,
  });

  // Copy sections and fields
  if (source.sections) {
    for (const section of source.sections) {
      const newSection = await createTemplateSection({
        template_id: newTemplate.id,
        section_code: section.section_code,
        section_name: section.section_name,
        description: section.description,
        display_order: section.display_order,
        is_required: section.is_required,
        is_collapsible: section.is_collapsible,
        default_expanded: section.default_expanded,
      });

      for (const field of section.fields) {
        await createTemplateField({
          section_id: newSection.id,
          field_code: field.field_code,
          field_label: field.field_label,
          field_type: field.field_type,
          placeholder: field.placeholder,
          help_text: field.help_text,
          config: field.config,
          is_required: field.is_required,
          validation_rules: field.validation_rules,
          display_order: field.display_order,
          width: field.width,
          conditional_display: field.conditional_display,
        });
      }
    }
  }

  return newTemplate;
}
