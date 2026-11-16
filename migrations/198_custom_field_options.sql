-- =============================================================================
-- Migration 198: Custom Field Options — User-Defined Dropdown Options
-- =============================================================================
-- Allows users to add "Other" values to any dropdown field.
-- Custom options are persisted and appear as regular options on next use.
-- Supports both specialty template fields and ophthalmology form fields.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.custom_field_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifies which dropdown this option belongs to
    -- Format: "form_type:field_code" e.g. "template:chest_pain", "eye:iop_method"
    field_identifier VARCHAR(250) NOT NULL,

    -- The stored value (lowercase, trimmed)
    option_value VARCHAR(250) NOT NULL,

    -- The display label (original case)
    option_label VARCHAR(250) NOT NULL,

    -- Optional: scope to a specific clinic
    clinic_id UUID REFERENCES public.clinics(id),

    -- Audit
    created_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicates per field
    UNIQUE(field_identifier, option_value)
);

COMMENT ON TABLE public.custom_field_options IS
  'User-defined dropdown options created when selecting "Other". Persistent custom options appear alongside hardcoded options on subsequent use.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_options_field
    ON public.custom_field_options(field_identifier);
CREATE INDEX IF NOT EXISTS idx_custom_field_options_clinic
    ON public.custom_field_options(clinic_id)
    WHERE clinic_id IS NOT NULL;

-- RLS
ALTER TABLE public.custom_field_options ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read custom options
CREATE POLICY custom_field_options_read ON public.custom_field_options
    FOR SELECT USING (true);

-- Any authenticated staff can insert custom options
CREATE POLICY custom_field_options_insert ON public.custom_field_options
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()
        )
    );

-- Admin can manage (update/delete) custom options
CREATE POLICY custom_field_options_admin ON public.custom_field_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('admin', 'super_admin', 'medical_director')
        )
    );
