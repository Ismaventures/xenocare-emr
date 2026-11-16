-- SUPERSEDED by migration 237_clinical_text_templates.sql
-- The consultation_form_templates table is replaced by the unified clinical_text_templates table.
DROP TABLE IF EXISTS public.consultation_form_templates CASCADE;
DROP FUNCTION IF EXISTS public.search_consultation_templates CASCADE;
DROP FUNCTION IF EXISTS public.record_consultation_template_usage CASCADE;
