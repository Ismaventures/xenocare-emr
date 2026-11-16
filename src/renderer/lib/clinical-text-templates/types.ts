/**
 * Types for the unified clinical text templates system.
 * Migration: 237_clinical_text_templates.sql
 */

export type TemplateModule =
  | 'radiology'
  | 'consultation'
  | 'nursing'
  | 'ae'
  | 'surgery'
  | 'inpatient'
  | 'lab'
  | 'anc'
  | 'dental'
  | 'ophthalmology'
  | 'physiotherapy';

export interface ClinicalTextTemplate {
  id: string;
  template_key: string;
  display_name: string;
  description: string | null;
  module: TemplateModule;
  category: string | null;
  template_data: Record<string, string>;
  search_keywords: string[] | null;
  is_shared: boolean;
  is_mine: boolean;
  usage_count: number;
  my_usage_count: number;
  priority: number;
}

export interface CreateClinicalTextTemplateInput {
  module: TemplateModule;
  category?: string;
  display_name: string;
  description?: string;
  template_data: Record<string, string>;
  search_keywords?: string[];
  is_shared: boolean;
  priority?: number;
}

export interface UpdateClinicalTextTemplateInput {
  display_name?: string;
  description?: string;
  template_data?: Record<string, string>;
  search_keywords?: string[];
  priority?: number;
  is_active?: boolean;
}
