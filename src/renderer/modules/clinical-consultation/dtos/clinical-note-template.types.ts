/**
 * =============================================================================
 * CLINICAL NOTE TEMPLATE TYPES
 * =============================================================================
 * Types for the specialty-aware clinical notes template system.
 * Templates drive dynamic form rendering within the universal note types.
 * Reuses SpecialtyTemplateField infrastructure for field definitions.
 * =============================================================================
 */

import type {
  TemplateFieldType,
  FieldWidth,
  FieldConfig,
} from './specialty-template.dto';

// =============================================================================
// Clinical Note Types (universal categories)
// =============================================================================

export type ClinicalNoteType =
  | 'progress_note'
  | 'result_review'
  | 'clinical_update'
  | 'follow_up_note'
  | 'addendum';

// =============================================================================
// Template Schema — JSON structure stored in clinical_note_templates.schema_json
// =============================================================================

/** A field within a template section (compatible with SpecialtyTemplateField) */
export interface NoteTemplateField {
  field_code: string;
  field_label: string;
  field_type: TemplateFieldType;
  placeholder?: string;
  help_text?: string;
  config: FieldConfig;
  is_required?: boolean;
  display_order: number;
  width: FieldWidth;
  default_value?: unknown;
}

/** A section containing multiple fields */
export interface NoteTemplateSection {
  section_code: string;
  section_name: string;
  description?: string;
  display_order: number;
  is_required?: boolean;
  is_collapsible?: boolean;
  default_expanded?: boolean;
  fields: NoteTemplateField[];
}

/** Top-level schema stored in schema_json */
export interface NoteTemplateSchema {
  sections: NoteTemplateSection[];
}

// =============================================================================
// Template UI Config
// =============================================================================

export interface NoteTemplateUiConfig {
  icon?: string; // Lucide icon name
  color?: string; // Tailwind color
  banner_text?: string; // Optional banner shown above the form
}

// =============================================================================
// Template Record (from clinical_note_templates table)
// =============================================================================

export interface ClinicalNoteTemplate {
  id: string;
  template_key: string;
  display_name: string;
  description?: string;
  note_type: ClinicalNoteType;

  // Context matching
  specialty_clinic_id?: string | null;
  specialty_code?: string | null;
  department_id?: string | null;
  role?: string | null;
  encounter_type?: string | null;
  patient_context?: string | null;

  // Form definition
  schema_json: NoteTemplateSchema;
  base_fields: string[]; // e.g. ['subjective','objective','assessment','plan']

  // UI
  ui_config: NoteTemplateUiConfig;

  // Precedence
  priority: number;
  is_default: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

// =============================================================================
// Template Resolution Context — passed to the resolver
// =============================================================================

export interface NoteTemplateContext {
  note_type: ClinicalNoteType;
  specialty_code?: string | null;
  clinic_id?: string | null;
  user_role?: string | null;
  encounter_type?: string | null;
  patient_context?: string | null;
}

// =============================================================================
// Clinical Note Record (from clinical_notes table)
// =============================================================================

export interface ClinicalNoteRecord {
  id: string;
  patient_id: string;
  encounter_id: string;
  note_type: ClinicalNoteType;
  template_key?: string | null;

  specialty_clinic_id?: string | null;
  department_id?: string | null;

  author_id: string;
  author_role: string;

  // Standard SOAP fields
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  notes?: string | null;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;

  // Specialty structured data
  specialty_data: Record<string, unknown>;

  // Status & audit
  status: 'draft' | 'final' | 'signed' | 'amended' | 'addendum';
  signed_at?: string | null;
  signed_by?: string | null;
  amended_from?: string | null;
  display_label?: string | null;

  created_at: string;
  updated_at: string;
}
