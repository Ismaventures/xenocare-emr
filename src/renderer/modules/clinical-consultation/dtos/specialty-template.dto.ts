/**
 * =============================================================================
 * SPECIALTY CONSULTATION TEMPLATES - TYPE DEFINITIONS
 * =============================================================================
 * TypeScript types for the specialty consultation template system.
 * Templates drive dynamic form rendering without separate specialty modules.
 * =============================================================================
 */

// =============================================================================
// ENUMS & Constants
// =============================================================================

/**
 * Supported field types for template fields
 */
export type TemplateFieldType =
  | 'text' // Single line text input
  | 'textarea' // Multi-line text area
  | 'number' // Numeric input
  | 'select' // Single select dropdown
  | 'multiselect' // Multi-select
  | 'checkbox' // Single checkbox (boolean)
  | 'checkbox_group' // Group of checkboxes
  | 'radio' // Radio button group
  | 'date' // Date picker
  | 'scale' // Numeric scale (e.g., 1-10 pain scale)
  | 'measurement' // Measurement with unit
  | 'rich_text'; // Rich text editor

/**
 * Field width options for responsive layout
 */
export type FieldWidth = 'full' | 'half' | 'third' | 'quarter';

/**
 * OPD types matching department schema
 */
export type OpdType =
  | 'MOPD'
  | 'SOPD'
  | 'Support'
  | 'Diagnostic'
  | 'Administrative';

/**
 * Specialty codes for the 18 specialties
 */
export type SpecialtyCode =
  | 'CARDIOLOGY'
  | 'ORTHOPAEDICS'
  | 'DERMATOLOGY'
  | 'UROLOGY'
  | 'GASTROENTEROLOGY'
  | 'NEPHROLOGY'
  | 'PAEDIATRICS'
  | 'NEUROSURGERY'
  | 'NEUROLOGY'
  | 'NEUROPSYCHIATRY'
  | 'GENERAL_SURGERY'
  | 'GYNAECOLOGY'
  | 'ORAL_MAXILLOFACIAL'
  | 'PULMONOLOGY'
  | 'ENDOCRINOLOGY'
  | 'PLASTIC_SURGERY'
  | 'ENT'
  | 'OPHTHALMOLOGY';

// =============================================================================
// FIELD CONFIGURATION TYPES
// =============================================================================

/**
 * Option for select/radio/checkbox_group fields
 */
export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Number field configuration
 */
export interface NumberFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  precision?: number;
}

/**
 * Select/Radio field configuration
 */
export interface SelectFieldConfig {
  options: FieldOption[];
  allowOther?: boolean;
}

/**
 * Textarea field configuration
 */
export interface TextareaFieldConfig {
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

/**
 * Scale field configuration (e.g., pain scale 0-10)
 */
export interface ScaleFieldConfig {
  scale_min: number;
  scale_max: number;
  scale_step?: number;
  scale_labels?: string[]; // e.g., ["No Pain", "Mild", "Moderate", "Severe", "Worst Pain"]
  show_numeric?: boolean;
}

/**
 * Measurement field configuration (e.g., "120/80 mmHg")
 */
export interface MeasurementFieldConfig {
  unit: string;
  pattern?: string; // Regex pattern for validation
  format_hint?: string; // e.g., "systolic/diastolic"
}

/**
 * Checkbox group field configuration
 */
export interface CheckboxGroupFieldConfig {
  options: FieldOption[];
  minSelected?: number;
  maxSelected?: number;
  columns?: 1 | 2 | 3 | 4;
}

/**
 * Union type for all field configurations
 */
export type FieldConfig =
  | NumberFieldConfig
  | SelectFieldConfig
  | TextareaFieldConfig
  | ScaleFieldConfig
  | MeasurementFieldConfig
  | CheckboxGroupFieldConfig
  | Record<string, unknown>;

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation rules for a field
 */
export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
  pattern_message?: string;
  custom_validator?: string; // Function name for custom validation
}

/**
 * Conditional display rule
 */
export interface ConditionalDisplay {
  field: string; // Field code to check
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_empty'
    | 'greater_than'
    | 'less_than';
  value?: string | number | boolean | string[];
}

// =============================================================================
// TEMPLATE DATA STRUCTURES
// =============================================================================

/**
 * Template field definition
 */
export interface SpecialtyTemplateField {
  id: string;
  section_id: string;
  field_code: string;
  field_label: string;
  field_type: TemplateFieldType;
  placeholder?: string;
  help_text?: string;
  config: FieldConfig;
  is_required: boolean;
  validation_rules: ValidationRules;
  display_order: number;
  width: FieldWidth;
  conditional_display?: ConditionalDisplay;
  /** Default value pre-filled on form load (smart default) */
  default_value?: unknown;
}

/**
 * Template section containing fields
 */
export interface SpecialtyTemplateSection {
  id: string;
  template_id: string;
  section_code: string;
  section_name: string;
  description?: string;
  display_order: number;
  is_required: boolean;
  is_collapsible: boolean;
  default_expanded: boolean;
  fields: SpecialtyTemplateField[];
}

/**
 * Specialty template definition
 */
export interface SpecialtyTemplate {
  id: string;
  specialty_code: SpecialtyCode | string;
  specialty_name: string;
  description?: string;
  opd_type: OpdType;
  icon_name?: string;
  color_class?: string;
  is_active: boolean;
  display_order: number;
  /** Template version number - increments when structure changes */
  version: number;
  /** When this version became active */
  published_at?: string;
  /** When this version was superseded */
  deprecated_at?: string;
  /** Staff who created this version */
  created_by?: string;
  /** Notes about changes in this version */
  change_notes?: string;
  created_at: string;
  updated_at: string;
  sections?: SpecialtyTemplateSection[];
  /**
   * Map of field_code → normal value for "Mark All Normal" button.
   * When clicked, all fields in this map get their normal values applied.
   */
  normal_values?: Record<string, unknown>;
}

/**
 * Template reference stored on consultation for audit stability
 */
export interface ConsultationTemplateReference {
  /** FK to the exact template version used */
  specialty_template_id: string;
  /** Denormalized version for quick reference */
  specialty_template_version: number;
  /** Explicit specialty code (not derived from clinic) */
  specialty_code: string;
  /** Template name at time of consultation */
  specialty_name?: string;
}

/**
 * Full template with all nested sections and fields (from RPC)
 */
export interface SpecialtyTemplateWithSections {
  template: SpecialtyTemplate;
  sections: SpecialtyTemplateSection[];
}

// =============================================================================
// API DTOs
// =============================================================================

/**
 * Create template DTO
 */
export interface CreateSpecialtyTemplateDTO {
  specialty_code: string;
  specialty_name: string;
  description?: string;
  opd_type?: OpdType;
  icon_name?: string;
  color_class?: string;
  is_active?: boolean;
  display_order?: number;
}

/**
 * Update template DTO
 */
export interface UpdateSpecialtyTemplateDTO extends Partial<CreateSpecialtyTemplateDTO> {
  id: string;
}

/**
 * Create section DTO
 */
export interface CreateTemplateSectionDTO {
  template_id: string;
  section_code: string;
  section_name: string;
  description?: string;
  display_order?: number;
  is_required?: boolean;
  is_collapsible?: boolean;
  default_expanded?: boolean;
}

/**
 * Create field DTO
 */
export interface CreateTemplateFieldDTO {
  section_id: string;
  field_code: string;
  field_label: string;
  field_type: TemplateFieldType;
  placeholder?: string;
  help_text?: string;
  config?: FieldConfig;
  is_required?: boolean;
  validation_rules?: ValidationRules;
  display_order?: number;
  width?: FieldWidth;
  conditional_display?: ConditionalDisplay;
}

// =============================================================================
// FORM STATE TYPES
// =============================================================================

/**
 * Specialty form data - stored in consultations.specialty_data
 *
 * IMPORTANT: Field keys MUST be namespaced to prevent collisions:
 * - Format: {specialty_code}.{field_code}
 * - Example: "cardio.nyha_class", "derm.lesion_type"
 *
 * This ensures:
 * - No key collisions across specialties
 * - Easier querying in JSONB
 * - Clear audit trail
 */
export type SpecialtyFormData = Record<string, unknown>;

/**
 * Complete specialty submission data with template reference
 * This is what gets stored in the consultation record for medico-legal audit
 */
export interface SpecialtySubmissionData {
  /** FK to the exact template version used */
  specialty_template_id: string;
  /** Denormalized version for quick reference */
  specialty_template_version: number;
  /** Explicit specialty code (not derived from clinic) */
  specialty_code: string;
  /** Template name at time of consultation */
  specialty_name: string;
  /** The actual form data collected */
  form_data: SpecialtyFormData;
}

/**
 * Helper to create namespaced field key
 */
export function createFieldKey(
  specialtyCode: string,
  fieldCode: string,
): string {
  const prefix = specialtyCode.toLowerCase().slice(0, 5); // e.g., "cardio", "derm", "ortho"
  return `${prefix}.${fieldCode}`;
}

/**
 * Helper to parse namespaced field key
 */
export function parseFieldKey(
  key: string,
): { prefix: string; fieldCode: string } | null {
  const parts = key.split('.');
  if (parts.length !== 2) return null;
  return { prefix: parts[0], fieldCode: parts[1] };
}

/**
 * Field validation error
 */
export interface FieldValidationError {
  field: string;
  message: string;
}

/**
 * Validation result from server
 */
export interface SpecialtyValidationResult {
  is_valid: boolean;
  errors: FieldValidationError[];
}

// =============================================================================
// UI HELPER TYPES
// =============================================================================

/**
 * Field render props for the dynamic form renderer
 */
export interface FieldRenderProps {
  field: SpecialtyTemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Section render props
 */
export interface SectionRenderProps {
  section: SpecialtyTemplateSection;
  formData: SpecialtyFormData;
  onFieldChange: (fieldCode: string, value: unknown) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

/**
 * Specialty summary for list displays
 */
export interface SpecialtySummary {
  specialty_code: string;
  specialty_name: string;
  icon_name?: string;
  color_class?: string;
  field_count: number;
  section_count: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default field widths by type
 */
export const DEFAULT_FIELD_WIDTHS: Record<TemplateFieldType, FieldWidth> = {
  text: 'half',
  textarea: 'full',
  number: 'quarter',
  select: 'half',
  multiselect: 'half',
  checkbox: 'quarter',
  checkbox_group: 'full',
  radio: 'half',
  date: 'quarter',
  scale: 'half',
  measurement: 'third',
  rich_text: 'full',
};

/**
 * Specialty color themes
 */
export const SPECIALTY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  CARDIOLOGY: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  ORTHOPAEDICS: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  DERMATOLOGY: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  UROLOGY: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  GASTROENTEROLOGY: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  NEPHROLOGY: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  PAEDIATRICS: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  NEUROSURGERY: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  NEUROLOGY: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
  },
  NEUROPSYCHIATRY: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  GENERAL_SURGERY: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  GYNAECOLOGY: {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
  },
  ORAL_MAXILLOFACIAL: {
    bg: 'bg-lime-50',
    text: 'text-lime-700',
    border: 'border-lime-200',
  },
  PULMONOLOGY: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  ENDOCRINOLOGY: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  PLASTIC_SURGERY: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  ENT: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
  OPHTHALMOLOGY: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  PSYCHIATRY: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
  },
  ONCOLOGY: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  RHEUMATOLOGY: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  INFECTIOUS_DISEASE: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  HAEMATOLOGY: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
  },
  CARDIOTHORACIC_SURGERY: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
  },
  VASCULAR_SURGERY: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  PAEDIATRIC_SURGERY: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
  },
  NEONATOLOGY: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
  },
};

/**
 * Field type display labels
 */
export const FIELD_TYPE_LABELS: Record<TemplateFieldType, string> = {
  text: 'Text Input',
  textarea: 'Text Area',
  number: 'Number',
  select: 'Dropdown Select',
  multiselect: 'Multi-Select',
  checkbox: 'Checkbox',
  checkbox_group: 'Checkbox Group',
  radio: 'Radio Buttons',
  date: 'Date Picker',
  scale: 'Scale/Rating',
  measurement: 'Measurement',
  rich_text: 'Rich Text',
};
