-- SUPERSEDED by migration 237_clinical_text_templates.sql
-- The radiology_report_templates table is replaced by the unified clinical_text_templates table.
DROP TABLE IF EXISTS public.radiology_report_templates CASCADE;
DROP FUNCTION IF EXISTS public.search_radiology_templates CASCADE;
DROP FUNCTION IF EXISTS public.record_radiology_template_usage CASCADE;
