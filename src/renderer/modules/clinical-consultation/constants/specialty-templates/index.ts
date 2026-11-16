import {
  SpecialtyTemplate,
  SpecialtyTemplateSection,
  SpecialtyTemplateField,
} from '../../dtos/specialty-template.dto';

// Individual template imports
import { CARDIOLOGY_TEMPLATE } from './cardiology';
import { DERMATOLOGY_TEMPLATE } from './dermatology';
import { ORTHOPAEDICS_TEMPLATE } from './orthopaedics';
import { ENT_TEMPLATE } from './ent';
import { UROLOGY_TEMPLATE } from './urology';
import { NEUROLOGY_TEMPLATE } from './neurology';
import { NEUROPSYCHIATRY_TEMPLATE } from './neuropsychiatry';
import { GASTROENTEROLOGY_TEMPLATE } from './gastroenterology';
import { NEPHROLOGY_TEMPLATE } from './nephrology';
import { PAEDIATRICS_TEMPLATE } from './paediatrics';
import { NEUROSURGERY_TEMPLATE } from './neurosurgery';
import { GENERAL_SURGERY_TEMPLATE } from './general-surgery';
import { GYNAECOLOGY_TEMPLATE } from './gynaecology';
import { ORAL_MAXILLOFACIAL_TEMPLATE } from './oral-maxillofacial';
import { PULMONOLOGY_TEMPLATE } from './pulmonology';
import { ENDOCRINOLOGY_TEMPLATE } from './endocrinology';
import { PLASTIC_SURGERY_TEMPLATE } from './plastic-surgery';

// Re-export individual templates
// NOTE: Ophthalmology excluded — uses standalone ophthalmology/ module instead
export {
  CARDIOLOGY_TEMPLATE,
  DERMATOLOGY_TEMPLATE,
  ORTHOPAEDICS_TEMPLATE,
  ENT_TEMPLATE,
  UROLOGY_TEMPLATE,
  NEUROLOGY_TEMPLATE,
  NEUROPSYCHIATRY_TEMPLATE,
  GASTROENTEROLOGY_TEMPLATE,
  NEPHROLOGY_TEMPLATE,
  PAEDIATRICS_TEMPLATE,
  NEUROSURGERY_TEMPLATE,
  GENERAL_SURGERY_TEMPLATE,
  GYNAECOLOGY_TEMPLATE,
  ORAL_MAXILLOFACIAL_TEMPLATE,
  PULMONOLOGY_TEMPLATE,
  ENDOCRINOLOGY_TEMPLATE,
  PLASTIC_SURGERY_TEMPLATE,
};

export const SPECIALTY_TEMPLATES: Record<string, SpecialtyTemplate> = {
  CARDIOLOGY: CARDIOLOGY_TEMPLATE,
  DERMATOLOGY: DERMATOLOGY_TEMPLATE,
  ORTHOPAEDICS: ORTHOPAEDICS_TEMPLATE,
  ENT: ENT_TEMPLATE,
  UROLOGY: UROLOGY_TEMPLATE,
  NEUROLOGY: NEUROLOGY_TEMPLATE,
  NEUROPSYCHIATRY: NEUROPSYCHIATRY_TEMPLATE,
  GASTROENTEROLOGY: GASTROENTEROLOGY_TEMPLATE,
  NEPHROLOGY: NEPHROLOGY_TEMPLATE,
  PAEDIATRICS: PAEDIATRICS_TEMPLATE,
  NEUROSURGERY: NEUROSURGERY_TEMPLATE,
  GENERAL_SURGERY: GENERAL_SURGERY_TEMPLATE,
  GYNAECOLOGY: GYNAECOLOGY_TEMPLATE,
  ORAL_MAXILLOFACIAL: ORAL_MAXILLOFACIAL_TEMPLATE,
  PULMONOLOGY: PULMONOLOGY_TEMPLATE,
  ENDOCRINOLOGY: ENDOCRINOLOGY_TEMPLATE,
  PLASTIC_SURGERY: PLASTIC_SURGERY_TEMPLATE,
  // OPHTHALMOLOGY excluded — standalone ophthalmology/ module handles eye clinic
};

// Placeholder templates for remaining specialties - to be expanded with detailed fields
const PLACEHOLDER_SPECIALTIES = [
  { code: 'UROLOGY', name: 'Urology', icon: 'Droplet', color: 'yellow' },
  {
    code: 'GASTROENTEROLOGY',
    name: 'Gastroenterology',
    icon: 'Layers',
    color: 'orange',
  },
  { code: 'NEPHROLOGY', name: 'Nephrology', icon: 'Filter', color: 'cyan' },
  { code: 'PAEDIATRICS', name: 'Paediatrics', icon: 'Baby', color: 'pink' },
  {
    code: 'NEUROSURGERY',
    name: 'Neurosurgery',
    icon: 'Brain',
    color: 'purple',
  },
  { code: 'NEUROLOGY', name: 'Neurology', icon: 'Sparkles', color: 'indigo' },
  {
    code: 'NEUROPSYCHIATRY',
    name: 'Neuropsychiatry',
    icon: 'HeartPulse',
    color: 'violet',
  },
  {
    code: 'GENERAL_SURGERY',
    name: 'General Surgery',
    icon: 'Scissors',
    color: 'slate',
  },
  { code: 'GYNAECOLOGY', name: 'Gynaecology', icon: 'Users', color: 'rose' },
  {
    code: 'ORAL_MAXILLOFACIAL',
    name: 'Oral & Maxillofacial Surgery',
    icon: 'Smile',
    color: 'amber',
  },
  { code: 'PULMONOLOGY', name: 'Pulmonology', icon: 'Wind', color: 'sky' },
  {
    code: 'ENDOCRINOLOGY',
    name: 'Endocrinology',
    icon: 'Activity',
    color: 'emerald',
  },
  {
    code: 'PLASTIC_SURGERY',
    name: 'Plastic Surgery',
    icon: 'Fingerprint',
    color: 'fuchsia',
  },
  { code: 'ENT', name: 'ENT (Ear, Nose, Throat)', icon: 'Ear', color: 'teal' },
  // OPHTHALMOLOGY excluded — standalone module
];

// Generate placeholder templates for specialties not yet fully configured
// Only add placeholders for specialties that don't already have real templates
PLACEHOLDER_SPECIALTIES.forEach((specialty) => {
  // Skip if a real template already exists for this specialty
  if (SPECIALTY_TEMPLATES[specialty.code]) {
    return;
  }
  SPECIALTY_TEMPLATES[specialty.code] = {
    id: `tpl-${specialty.code.toLowerCase()}-001`,
    specialty_code: specialty.code,
    specialty_name: specialty.name,
    description: `${specialty.name} examination template`,
    opd_type: 'SOPD',
    icon_name: specialty.icon,
    color_class: specialty.color,
    is_active: true,
    display_order: 99,
    version: 1,
    published_at: '2026-02-06T00:00:00.000Z',
    change_notes:
      'Initial placeholder template - to be expanded with detailed fields',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: `sec-${specialty.code.toLowerCase()}-general`,
        template_id: `tpl-${specialty.code.toLowerCase()}-001`,
        section_code: 'general_examination',
        section_name: 'General Examination',
        description: `General ${specialty.name.toLowerCase()} examination findings`,
        display_order: 1,
        is_required: true,
        is_collapsible: true,
        default_expanded: true,
        fields: [
          {
            id: `fld-${specialty.code.toLowerCase()}-001`,
            section_id: `sec-${specialty.code.toLowerCase()}-general`,
            field_code: 'general_findings',
            field_label: 'General Examination Findings',
            field_type: 'textarea',
            placeholder: 'Document general examination findings...',
            help_text: 'Include pertinent positive and negative findings',
            config: {
              rows: 4,
              maxLength: 1000,
            },
            is_required: true,
            validation_rules: {},
            display_order: 1,
            width: 'full',
          },
          {
            id: `fld-${specialty.code.toLowerCase()}-002`,
            section_id: `sec-${specialty.code.toLowerCase()}-general`,
            field_code: 'specific_findings',
            field_label: 'Specific Clinical Findings',
            field_type: 'textarea',
            placeholder: 'Document specialty-specific clinical findings...',
            help_text: 'Include detailed observations and measurements',
            config: {
              rows: 4,
              maxLength: 1000,
            },
            is_required: false,
            validation_rules: {},
            display_order: 2,
            width: 'full',
          },
        ],
      },
      {
        id: `sec-${specialty.code.toLowerCase()}-investigations`,
        template_id: `tpl-${specialty.code.toLowerCase()}-001`,
        section_code: 'investigation_review',
        section_name: 'Investigation Review',
        description: 'Review of relevant investigations',
        display_order: 2,
        is_required: false,
        is_collapsible: true,
        default_expanded: true,
        fields: [
          {
            id: `fld-${specialty.code.toLowerCase()}-010`,
            section_id: `sec-${specialty.code.toLowerCase()}-investigations`,
            field_code: 'investigation_summary',
            field_label: 'Investigation Summary',
            field_type: 'textarea',
            placeholder: 'Summarize relevant investigation results...',
            help_text: 'Include lab results, imaging findings, etc.',
            config: {
              rows: 3,
              maxLength: 800,
            },
            is_required: false,
            validation_rules: {},
            display_order: 1,
            width: 'full',
          },
        ],
      },
      {
        id: `sec-${specialty.code.toLowerCase()}-impression`,
        template_id: `tpl-${specialty.code.toLowerCase()}-001`,
        section_code: 'clinical_impression',
        section_name: 'Clinical Impression',
        description: 'Clinical impression and provisional assessment',
        display_order: 3,
        is_required: true,
        is_collapsible: true,
        default_expanded: true,
        fields: [
          {
            id: `fld-${specialty.code.toLowerCase()}-020`,
            section_id: `sec-${specialty.code.toLowerCase()}-impression`,
            field_code: 'clinical_impression',
            field_label: 'Clinical Impression',
            field_type: 'textarea',
            placeholder: 'Document your clinical impression...',
            help_text:
              'Provisional assessment based on history and examination',
            config: {
              rows: 3,
              maxLength: 500,
            },
            is_required: true,
            validation_rules: {},
            display_order: 1,
            width: 'full',
          },
        ],
      },
    ],
  };
});

// =============================================================================
// TEMPLATE GETTER FUNCTION
// =============================================================================

export function getSpecialtyTemplate(
  specialtyCode: string,
): SpecialtyTemplate | null {
  return SPECIALTY_TEMPLATES[specialtyCode.toUpperCase()] || null;
}

/**
 * Get all available templates as a list
 */
export function getAllSpecialtyTemplates(): SpecialtyTemplate[] {
  return Object.values(SPECIALTY_TEMPLATES).filter((t) => t.is_active);
}

/**
 * Get template sections for a specialty
 */
export function getTemplateSections(
  specialtyCode: string,
): SpecialtyTemplateSection[] {
  const template = getSpecialtyTemplate(specialtyCode);
  return template?.sections || [];
}
