-- =============================================================================
-- Migration: Specialty Template Versioning & Consultation Reference
-- =============================================================================
-- 
-- This migration adds:
-- 1. Version tracking to specialty_templates
-- 2. Template reference columns to consultations for audit stability
-- 3. Proper indexes for performance
-- 
-- Key principles:
-- - Old consultations preserve their original template version
-- - New consultations use latest active version
-- - Medico-legal: explicit storage on consultation, not derived
-- =============================================================================

-- =============================================================================
-- STEP 1: Add versioning to specialty_templates
-- =============================================================================

-- Add version column (default 1 for existing records)
ALTER TABLE specialty_templates 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Add published_at timestamp (when this version became active)
ALTER TABLE specialty_templates 
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Add deprecated_at timestamp (when this version was superseded)
ALTER TABLE specialty_templates 
ADD COLUMN IF NOT EXISTS deprecated_at timestamptz;

-- Add created_by reference
ALTER TABLE specialty_templates 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES staff(id);

-- Add change_notes for version history
ALTER TABLE specialty_templates 
ADD COLUMN IF NOT EXISTS change_notes text;

-- Create unique constraint: only one version number per specialty+opd_type
ALTER TABLE specialty_templates 
DROP CONSTRAINT IF EXISTS specialty_templates_version_unique;

ALTER TABLE specialty_templates 
ADD CONSTRAINT specialty_templates_version_unique 
UNIQUE (specialty_code, opd_type, version);

-- Create partial unique index: only one ACTIVE template per specialty+opd_type
DROP INDEX IF EXISTS idx_specialty_templates_active_unique;

CREATE UNIQUE INDEX idx_specialty_templates_active_unique 
ON specialty_templates (specialty_code, opd_type) 
WHERE is_active = true;

-- =============================================================================
-- STEP 2: Add template reference to consultations
-- =============================================================================

-- Add specialty_template_id (FK to template used at time of consultation)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS specialty_template_id uuid REFERENCES specialty_templates(id);

-- Add specialty_template_version (denormalized for quick reference)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS specialty_template_version integer;

-- Add specialty_code explicitly (for audit stability, not derived from clinic)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS specialty_code varchar(50);

-- Add specialty_data JSONB column (stores the filled examination data)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS specialty_data jsonb;

-- Optional: Add schema snapshot for ultra-stability (medico-legal rendering)
-- This stores a copy of the template schema at time of consultation
-- Uncomment if required for strict compliance
-- ALTER TABLE consultations 
-- ADD COLUMN IF NOT EXISTS specialty_schema_snapshot jsonb;

-- =============================================================================
-- STEP 3: Performance Indexes
-- =============================================================================

-- Index on specialty_templates for quick lookup of active template
DROP INDEX IF EXISTS idx_specialty_templates_lookup;
CREATE INDEX idx_specialty_templates_lookup 
ON specialty_templates (specialty_code, opd_type, is_active);

-- Index on specialty_template_sections for ordered fetching
DROP INDEX IF EXISTS idx_specialty_template_sections_order;
CREATE INDEX idx_specialty_template_sections_order 
ON specialty_template_sections (template_id, display_order);

-- Index on consultations for specialty queries
DROP INDEX IF EXISTS idx_consultations_specialty_code;
CREATE INDEX idx_consultations_specialty_code 
ON consultations (specialty_code) 
WHERE specialty_code IS NOT NULL;

DROP INDEX IF EXISTS idx_consultations_specialty_template;
CREATE INDEX idx_consultations_specialty_template 
ON consultations (specialty_template_id) 
WHERE specialty_template_id IS NOT NULL;

-- GIN index on specialty_data for searching inside JSONB
-- Only enable if you need to query specific field values
DROP INDEX IF EXISTS idx_consultations_specialty_data_gin;
CREATE INDEX idx_consultations_specialty_data_gin 
ON consultations USING GIN (specialty_data jsonb_path_ops)
WHERE specialty_data IS NOT NULL;

-- =============================================================================
-- STEP 4: Helper Functions
-- =============================================================================

-- Function to get the current active template for a specialty
CREATE OR REPLACE FUNCTION get_active_specialty_template(
  p_specialty_code varchar,
  p_opd_type varchar DEFAULT 'SOPD'
)
RETURNS TABLE (
  id uuid,
  specialty_code varchar,
  specialty_name varchar,
  version integer,
  opd_type varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.specialty_code,
    st.specialty_name,
    st.version,
    st.opd_type
  FROM specialty_templates st
  WHERE st.specialty_code = p_specialty_code
    AND st.opd_type = p_opd_type
    AND st.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create a new version of a template (copies sections/fields)
CREATE OR REPLACE FUNCTION create_template_version(
  p_template_id uuid,
  p_change_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_new_template_id uuid;
  v_old_template RECORD;
  v_new_version integer;
BEGIN
  -- Get the current template
  SELECT * INTO v_old_template 
  FROM specialty_templates 
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  -- Calculate new version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM specialty_templates
  WHERE specialty_code = v_old_template.specialty_code
    AND opd_type = v_old_template.opd_type;
  
  -- Deactivate current active template
  UPDATE specialty_templates 
  SET is_active = false, 
      deprecated_at = NOW()
  WHERE specialty_code = v_old_template.specialty_code
    AND opd_type = v_old_template.opd_type
    AND is_active = true;
  
  -- Create new template version
  INSERT INTO specialty_templates (
    specialty_code,
    specialty_name,
    description,
    opd_type,
    icon_name,
    color_class,
    is_active,
    display_order,
    version,
    published_at,
    created_by,
    change_notes
  )
  VALUES (
    v_old_template.specialty_code,
    v_old_template.specialty_name,
    v_old_template.description,
    v_old_template.opd_type,
    v_old_template.icon_name,
    v_old_template.color_class,
    true,
    v_old_template.display_order,
    v_new_version,
    NOW(),
    p_created_by,
    p_change_notes
  )
  RETURNING id INTO v_new_template_id;
  
  -- Copy sections with their fields
  INSERT INTO specialty_template_sections (
    template_id,
    section_code,
    section_name,
    description,
    display_order,
    is_required,
    is_collapsible,
    default_expanded,
    fields
  )
  SELECT 
    v_new_template_id,
    section_code,
    section_name,
    description,
    display_order,
    is_required,
    is_collapsible,
    default_expanded,
    fields
  FROM specialty_template_sections
  WHERE template_id = p_template_id;
  
  RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 5: Update existing templates to version 1
-- =============================================================================

-- Set version 1 and published_at for existing templates
UPDATE specialty_templates 
SET version = 1, 
    published_at = created_at
WHERE version IS NULL OR published_at IS NULL;

-- =============================================================================
-- STEP 6: Add comment documentation
-- =============================================================================

COMMENT ON COLUMN specialty_templates.version IS 
'Template version number. Increments when template structure changes.';

COMMENT ON COLUMN specialty_templates.published_at IS 
'Timestamp when this version became active.';

COMMENT ON COLUMN specialty_templates.deprecated_at IS 
'Timestamp when this version was superseded by a newer version.';

COMMENT ON COLUMN consultations.specialty_template_id IS 
'FK to the exact template version used for this consultation. Preserved for audit.';

COMMENT ON COLUMN consultations.specialty_template_version IS 
'Denormalized template version for quick reference without join.';

COMMENT ON COLUMN consultations.specialty_code IS 
'Explicit specialty code stored for audit stability (not derived from clinic).';

COMMENT ON COLUMN consultations.specialty_data IS 
'JSONB containing the filled specialty examination data keyed by field codes.';

COMMENT ON INDEX idx_consultations_specialty_data_gin IS 
'GIN index for searching specific values within specialty examination data.';
