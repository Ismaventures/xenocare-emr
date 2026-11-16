-- =============================================================================
-- Migration 126: Specialty Consultation Templates System
-- =============================================================================
-- Implements template-driven specialty consultations WITHOUT separate modules
-- All specialties use the same consultation system with dynamic forms
-- =============================================================================

-- =============================================================================
-- 1. ENUM: Field types for template fields
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE public.template_field_type AS ENUM (
        'text',           -- Single line text input
        'textarea',       -- Multi-line text area
        'number',         -- Numeric input
        'select',         -- Single select dropdown
        'multiselect',    -- Multi-select
        'checkbox',       -- Single checkbox (boolean)
        'checkbox_group', -- Group of checkboxes
        'radio',          -- Radio button group
        'date',           -- Date picker
        'scale',          -- Numeric scale (e.g., 1-10 pain scale)
        'measurement',    -- Measurement with unit (e.g., "120/80 mmHg")
        'rich_text'       -- Rich text editor
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. TABLE: specialty_templates - Master template definitions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.specialty_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty_code VARCHAR(50) NOT NULL UNIQUE,
    specialty_name VARCHAR(100) NOT NULL,
    description TEXT,
    opd_type VARCHAR(20) DEFAULT 'SOPD',
    icon_name VARCHAR(50),           -- Lucide icon name for UI
    color_class VARCHAR(100),        -- Tailwind color classes
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT valid_opd_type CHECK (opd_type IN ('MOPD', 'SOPD', 'Support', 'Diagnostic', 'Administrative'))
);

COMMENT ON TABLE public.specialty_templates IS 'Master table for specialty consultation templates';
COMMENT ON COLUMN public.specialty_templates.specialty_code IS 'Unique code: CARDIOLOGY, DERMATOLOGY, etc.';
COMMENT ON COLUMN public.specialty_templates.opd_type IS 'Maps to department OPD type';

-- =============================================================================
-- 3. TABLE: specialty_template_sections - Template form sections
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.specialty_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.specialty_templates(id) ON DELETE CASCADE,
    section_code VARCHAR(50) NOT NULL,
    section_name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    is_collapsible BOOLEAN DEFAULT true,
    default_expanded BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, section_code)
);

COMMENT ON TABLE public.specialty_template_sections IS 'Sections within a specialty template (e.g., Cardiac History, ECG Findings)';

-- =============================================================================
-- 4. TABLE: specialty_template_fields - Individual form fields
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.specialty_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.specialty_template_sections(id) ON DELETE CASCADE,
    field_code VARCHAR(50) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    field_type public.template_field_type NOT NULL DEFAULT 'text',
    placeholder TEXT,
    help_text TEXT,
    
    -- Field configuration (JSONB for flexibility)
    config JSONB DEFAULT '{}',
    -- Examples of config:
    -- { "min": 0, "max": 200, "step": 1 } for number
    -- { "options": [{"value": "mild", "label": "Mild"}, ...] } for select/radio
    -- { "rows": 4 } for textarea
    -- { "scale_min": 0, "scale_max": 10, "scale_labels": ["No Pain", "Worst Pain"] } for scale
    -- { "unit": "mmHg", "pattern": "\\d+/\\d+" } for measurement
    
    -- Validation rules
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}',
    -- Examples: { "min_length": 10, "max_length": 500, "pattern": "^[A-Z].*" }
    
    -- Display settings
    display_order INT DEFAULT 0,
    width VARCHAR(20) DEFAULT 'full',    -- 'full', 'half', 'third', 'quarter'
    conditional_display JSONB,           -- Show/hide based on other field values
    -- Example: { "field": "has_chest_pain", "operator": "equals", "value": true }
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id, field_code)
);

COMMENT ON TABLE public.specialty_template_fields IS 'Individual form fields within a template section';
COMMENT ON COLUMN public.specialty_template_fields.config IS 'Field-type specific configuration (options, min/max, etc.)';
COMMENT ON COLUMN public.specialty_template_fields.conditional_display IS 'Rules for conditional field visibility';

-- =============================================================================
-- 5. ALTER consultations TABLE: Add specialty data storage
-- =============================================================================

-- Add specialty_code to identify which template was used
ALTER TABLE public.consultations 
    ADD COLUMN IF NOT EXISTS specialty_code VARCHAR(50);

-- Add JSONB column for specialty-specific form data
ALTER TABLE public.consultations 
    ADD COLUMN IF NOT EXISTS specialty_data JSONB DEFAULT '{}';

-- Add template version reference (for audit trail)
ALTER TABLE public.consultations 
    ADD COLUMN IF NOT EXISTS specialty_template_id UUID REFERENCES public.specialty_templates(id);

COMMENT ON COLUMN public.consultations.specialty_code IS 'Specialty template code used (CARDIOLOGY, DERMATOLOGY, etc.)';
COMMENT ON COLUMN public.consultations.specialty_data IS 'Specialty-specific form data in JSON format';

-- =============================================================================
-- 6. INDEX: Performance indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_specialty_templates_code ON public.specialty_templates(specialty_code);
CREATE INDEX IF NOT EXISTS idx_specialty_templates_active ON public.specialty_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_template_sections_template ON public.specialty_template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_section ON public.specialty_template_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_consultations_specialty ON public.consultations(specialty_code) WHERE specialty_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consultations_specialty_data ON public.consultations USING gin(specialty_data) WHERE specialty_data IS NOT NULL AND specialty_data != '{}';

-- =============================================================================
-- 7. RLS Policies
-- =============================================================================

ALTER TABLE public.specialty_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialty_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialty_template_fields ENABLE ROW LEVEL SECURITY;

-- Templates are read-only for most users, admin-writable
CREATE POLICY specialty_templates_read ON public.specialty_templates
    FOR SELECT USING (true);

CREATE POLICY specialty_templates_admin ON public.specialty_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('Admin', 'System_Admin', 'Medical_Director')
        )
    );

-- Sections inherit template access
CREATE POLICY specialty_sections_read ON public.specialty_template_sections
    FOR SELECT USING (true);

CREATE POLICY specialty_sections_admin ON public.specialty_template_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('Admin', 'System_Admin', 'Medical_Director')
        )
    );

-- Fields inherit section access
CREATE POLICY specialty_fields_read ON public.specialty_template_fields
    FOR SELECT USING (true);

CREATE POLICY specialty_fields_admin ON public.specialty_template_fields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('Admin', 'System_Admin', 'Medical_Director')
        )
    );

-- =============================================================================
-- 8. FUNCTION: Get template with all sections and fields
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_specialty_template(p_specialty_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'template', jsonb_build_object(
            'id', t.id,
            'specialty_code', t.specialty_code,
            'specialty_name', t.specialty_name,
            'description', t.description,
            'opd_type', t.opd_type,
            'icon_name', t.icon_name,
            'color_class', t.color_class
        ),
        'sections', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'section_code', s.section_code,
                    'section_name', s.section_name,
                    'description', s.description,
                    'display_order', s.display_order,
                    'is_required', s.is_required,
                    'is_collapsible', s.is_collapsible,
                    'default_expanded', s.default_expanded,
                    'fields', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', f.id,
                                'field_code', f.field_code,
                                'field_label', f.field_label,
                                'field_type', f.field_type,
                                'placeholder', f.placeholder,
                                'help_text', f.help_text,
                                'config', f.config,
                                'is_required', f.is_required,
                                'validation_rules', f.validation_rules,
                                'display_order', f.display_order,
                                'width', f.width,
                                'conditional_display', f.conditional_display
                            )
                            ORDER BY f.display_order
                        )
                        FROM public.specialty_template_fields f
                        WHERE f.section_id = s.id
                    ), '[]'::jsonb)
                )
                ORDER BY s.display_order
            )
            FROM public.specialty_template_sections s
            WHERE s.template_id = t.id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM public.specialty_templates t
    WHERE t.specialty_code = p_specialty_code
    AND t.is_active = true;
    
    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- =============================================================================
-- 9. FUNCTION: Validate specialty data against template
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_specialty_data(
    p_specialty_code VARCHAR,
    p_specialty_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_errors JSONB := '[]'::jsonb;
    v_field RECORD;
    v_field_value JSONB;
    v_is_valid BOOLEAN := true;
BEGIN
    -- Check each required field
    FOR v_field IN 
        SELECT f.field_code, f.field_label, f.is_required, f.field_type, f.validation_rules
        FROM public.specialty_template_fields f
        JOIN public.specialty_template_sections s ON s.id = f.section_id
        JOIN public.specialty_templates t ON t.id = s.template_id
        WHERE t.specialty_code = p_specialty_code
        AND t.is_active = true
        AND f.is_required = true
    LOOP
        v_field_value := p_specialty_data -> v_field.field_code;
        
        -- Check if required field is missing or empty
        IF v_field_value IS NULL OR v_field_value = 'null'::jsonb OR 
           (jsonb_typeof(v_field_value) = 'string' AND v_field_value #>> '{}' = '') THEN
            v_errors := v_errors || jsonb_build_object(
                'field', v_field.field_code,
                'message', v_field.field_label || ' is required'
            );
            v_is_valid := false;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'is_valid', v_is_valid,
        'errors', v_errors
    );
END;
$$;

-- =============================================================================
-- 10. Updated timestamp trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_specialty_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_specialty_templates_updated ON public.specialty_templates;
CREATE TRIGGER trg_specialty_templates_updated
    BEFORE UPDATE ON public.specialty_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_specialty_template_timestamp();

DROP TRIGGER IF EXISTS trg_specialty_sections_updated ON public.specialty_template_sections;
CREATE TRIGGER trg_specialty_sections_updated
    BEFORE UPDATE ON public.specialty_template_sections
    FOR EACH ROW EXECUTE FUNCTION public.update_specialty_template_timestamp();

DROP TRIGGER IF EXISTS trg_specialty_fields_updated ON public.specialty_template_fields;
CREATE TRIGGER trg_specialty_fields_updated
    BEFORE UPDATE ON public.specialty_template_fields
    FOR EACH ROW EXECUTE FUNCTION public.update_specialty_template_timestamp();

-- =============================================================================
-- 11. Grant permissions
-- =============================================================================

GRANT SELECT ON public.specialty_templates TO authenticated;
GRANT SELECT ON public.specialty_template_sections TO authenticated;
GRANT SELECT ON public.specialty_template_fields TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_specialty_template TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_specialty_data TO authenticated;
