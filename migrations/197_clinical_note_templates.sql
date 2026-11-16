-- =============================================================================
-- Migration 197: Clinical Note Templates â€” Specialty-Aware Notes Architecture
-- =============================================================================
-- Implements a 3-layer notes architecture:
--   Layer 1: Shared notes engine (clinical_notes table)
--   Layer 2: Universal note types (progress_note, result_review, etc.)
--   Layer 3: Specialty template layer (clinical_note_templates registry)
--
-- Preserves backward compatibility with existing daily_progress_notes
-- and consultations-based note storage.
-- =============================================================================

-- =============================================================================
-- 1. TABLE: clinical_note_templates â€” Template registry
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinical_note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Which universal note type this template belongs to
    note_type VARCHAR(50) NOT NULL,
    -- CHECK note_type IN ('progress_note','result_review','clinical_update','follow_up_note','addendum')

    -- Context matching columns (all nullable = generic fallback)
    specialty_clinic_id UUID REFERENCES public.clinics(id),
    specialty_code VARCHAR(50),
    department_id UUID REFERENCES public.departments(id),
    role VARCHAR(50),          -- e.g. 'Doctor', 'Nurse', 'Physiotherapist'
    encounter_type VARCHAR(50), -- e.g. 'New Visit', 'Follow-Up', 'A&E', 'ANC'
    patient_context VARCHAR(50), -- e.g. 'pregnancy', 'pediatric', 'post_surgical'

    -- Template form definition (JSON schema of sections & fields)
    -- Reuses the same field type system as specialty_template_fields
    schema_json JSONB NOT NULL DEFAULT '{"sections":[]}',
    -- Example: { "sections": [{ "section_code": "anc_monitoring", "section_name": "ANC Monitoring",
    --   "fields": [{ "field_code": "gestational_age", "field_label": "Gestational Age (weeks)",
    --     "field_type": "number", "config": {"min":4,"max":44,"unit":"weeks"}, ... }] }] }

    -- Base SOAP fields to render (subset of standard SOAP)
    base_fields JSONB NOT NULL DEFAULT '["subjective","objective","assessment","plan"]',
    -- Example: ["assessment","plan","notes"] for result_review

    -- UI configuration
    ui_config JSONB DEFAULT '{}',
    -- Example: { "icon": "Baby", "color": "pink", "banner_text": "ANC Follow-up Documentation" }

    -- Template precedence (higher = more specific, checked first)
    priority INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.staff(id)
);

COMMENT ON TABLE public.clinical_note_templates IS
  'Registry of note form templates. Each template defines the form rendered under a universal note type for a given specialty/role/context.';
COMMENT ON COLUMN public.clinical_note_templates.template_key IS
  'Unique key like generic_progress_doctor, anc_progress_nurse, cardiology_followup_doctor';
COMMENT ON COLUMN public.clinical_note_templates.schema_json IS
  'JSON schema defining specialty extension sections and fields, compatible with SpecialtyTemplateField types';
COMMENT ON COLUMN public.clinical_note_templates.base_fields IS
  'Which standard SOAP/note fields to render: subjective, objective, assessment, plan, notes, follow_up';
COMMENT ON COLUMN public.clinical_note_templates.priority IS
  'Higher priority templates are selected first when multiple match. Generic defaults = 0, specialty = 10, specialty+role = 20, etc.';

-- =============================================================================
-- 2. TABLE: clinical_notes â€” Unified clinical notes storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id),
    encounter_id UUID NOT NULL REFERENCES public.visits(id),

    -- Universal note type
    note_type VARCHAR(50) NOT NULL DEFAULT 'progress_note',
    -- Template used (NULL for legacy/generic notes)
    template_key VARCHAR(100) REFERENCES public.clinical_note_templates(template_key),

    -- Encounter context captured at note creation time (denormalized for auditability)
    specialty_clinic_id UUID REFERENCES public.clinics(id),
    department_id UUID REFERENCES public.departments(id),

    -- Author information
    author_id UUID NOT NULL REFERENCES public.staff(id),
    author_role VARCHAR(50) NOT NULL,

    -- Standard SOAP fields (universal across all note types)
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    notes TEXT,                    -- General notes / addendum text
    follow_up_date DATE,
    follow_up_notes TEXT,

    -- Specialty-specific structured data (keyed by field_code from template schema_json)
    specialty_data JSONB DEFAULT '{}',

    -- Note status and audit
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- CHECK status IN ('draft','final','signed','amended','addendum')
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES public.staff(id),
    amended_from UUID REFERENCES public.clinical_notes(id),

    -- Display metadata
    display_label VARCHAR(200),   -- e.g. "ANC Follow-up Note", "Cardiology Progress Note"

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.clinical_notes IS
  'Unified clinical notes table. Stores all note types (progress, result review, clinical update, follow-up, addendum) with optional specialty-specific structured data.';
COMMENT ON COLUMN public.clinical_notes.specialty_data IS
  'Structured specialty extension fields as JSONB. Keys match field_code from the template schema_json.';
COMMENT ON COLUMN public.clinical_notes.display_label IS
  'Human-friendly label like "ANC Follow-up Note" shown in the encounter timeline.';
COMMENT ON COLUMN public.clinical_notes.amended_from IS
  'If this note is an amendment, references the original note.';

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinical_notes_encounter
    ON public.clinical_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient
    ON public.clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type
    ON public.clinical_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_template
    ON public.clinical_notes(template_key) WHERE template_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinical_notes_author
    ON public.clinical_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_created
    ON public.clinical_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_specialty_data
    ON public.clinical_notes USING gin(specialty_data)
    WHERE specialty_data IS NOT NULL AND specialty_data != '{}';

CREATE INDEX IF NOT EXISTS idx_note_templates_note_type
    ON public.clinical_note_templates(note_type);
CREATE INDEX IF NOT EXISTS idx_note_templates_specialty
    ON public.clinical_note_templates(specialty_code) WHERE specialty_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_note_templates_active
    ON public.clinical_note_templates(is_active, note_type)
    WHERE is_active = true;

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.clinical_note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Templates: readable by all authenticated staff, writeable by admin
CREATE POLICY note_templates_read ON public.clinical_note_templates
    FOR SELECT USING (true);

CREATE POLICY note_templates_admin ON public.clinical_note_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('admin', 'super_admin', 'medical_director')
        )
    );

-- Notes: readable by staff, insertable by clinical staff, updatable by author
CREATE POLICY clinical_notes_read ON public.clinical_notes
    FOR SELECT USING (true);

CREATE POLICY clinical_notes_insert ON public.clinical_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.id = clinical_notes.author_id
        )
    );

CREATE POLICY clinical_notes_update ON public.clinical_notes
    FOR UPDATE USING (
        -- Author can update their own draft/final notes
        (
            EXISTS (
                SELECT 1 FROM public.staff s
                WHERE s.user_id = auth.uid()
                AND s.id = clinical_notes.author_id
            )
            AND status IN ('draft', 'final')
        )
        OR
        -- Admin/Medical Director can update any note
        EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('admin', 'super_admin', 'medical_director')
        )
    );

-- =============================================================================
-- 5. FUNCTION: Resolve best matching template for a given context
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_note_template(
    p_note_type VARCHAR,
    p_specialty_code VARCHAR DEFAULT NULL,
    p_clinic_id UUID DEFAULT NULL,
    p_role VARCHAR DEFAULT NULL,
    p_encounter_type VARCHAR DEFAULT NULL,
    p_patient_context VARCHAR DEFAULT NULL
)
RETURNS public.clinical_note_templates
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_template public.clinical_note_templates;
BEGIN
    -- Find the most specific matching active template
    -- Priority order: specialty+role+encounter+context > specialty+role > specialty > role > generic default
    SELECT * INTO v_template
    FROM public.clinical_note_templates
    WHERE is_active = true
      AND note_type = p_note_type
      AND (specialty_code IS NULL OR specialty_code = p_specialty_code)
      AND (specialty_clinic_id IS NULL OR specialty_clinic_id = p_clinic_id)
      AND (role IS NULL OR role = p_role)
      AND (encounter_type IS NULL OR encounter_type = p_encounter_type)
      AND (patient_context IS NULL OR patient_context = p_patient_context)
    ORDER BY priority DESC,
             -- Tiebreaker: most non-null matching columns = more specific
             (CASE WHEN specialty_code IS NOT NULL AND specialty_code = p_specialty_code THEN 1 ELSE 0 END
              + CASE WHEN role IS NOT NULL AND role = p_role THEN 1 ELSE 0 END
              + CASE WHEN encounter_type IS NOT NULL AND encounter_type = p_encounter_type THEN 1 ELSE 0 END
              + CASE WHEN patient_context IS NOT NULL AND patient_context = p_patient_context THEN 1 ELSE 0 END
             ) DESC
    LIMIT 1;

    RETURN v_template;
END;
$$;

COMMENT ON FUNCTION public.resolve_note_template IS
  'Resolves the most specific matching clinical note template for the given context. Falls through from most specific to generic default.';

-- =============================================================================
-- 6. SEED: Default generic templates (Tier 1)
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  -- Generic Progress Note (Doctor)
  ('generic_progress_doctor', 'Progress Note', 'progress_note',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[]}',
   0, true,
   '{"icon":"FileText","color":"blue"}',
   'Standard SOAP-based progress note for all clinics'),

  -- Generic Progress Note (Nurse)
  ('generic_progress_nurse', 'Nursing Progress Note', 'progress_note',
   '["objective","assessment","plan","notes"]',
   '{"sections":[]}',
   1, false,
   '{"icon":"ClipboardList","color":"green"}',
   'Standard nursing progress note'),

  -- Generic Result Review
  ('generic_result_review', 'Result Review', 'result_review',
   '["assessment","plan","notes"]',
   '{"sections":[]}',
   0, true,
   '{"icon":"Eye","color":"purple"}',
   'Standard result review note for lab/radiology results'),

  -- Generic Clinical Update
  ('generic_clinical_update', 'Clinical Update', 'clinical_update',
   '["objective","assessment","plan"]',
   '{"sections":[]}',
   0, true,
   '{"icon":"Stethoscope","color":"green"}',
   'Standard clinical update note'),

  -- Generic Follow-up Note
  ('generic_followup_doctor', 'Follow-up Note', 'follow_up_note',
   '["assessment","plan","follow_up"]',
   '{"sections":[]}',
   0, true,
   '{"icon":"Calendar","color":"amber"}',
   'Standard follow-up documentation'),

  -- Generic Addendum
  ('generic_addendum', 'Addendum', 'addendum',
   '["notes"]',
   '{"sections":[]}',
   0, true,
   '{"icon":"Plus","color":"gray"}',
   'Addition to existing documentation')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 7. SEED: ANC Templates (Tier 3 â€” High structure)
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, encounter_type, patient_context, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  -- ANC Progress Note (Doctor)
  ('anc_progress_doctor', 'ANC Doctor Progress Note', 'progress_note',
   'ANC', 'Doctor', 'ANC', 'pregnancy',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"anc_monitoring","section_name":"ANC Monitoring","display_order":1,"is_required":true,"is_collapsible":false,"default_expanded":true,"fields":[{"field_code":"gestational_age_weeks","field_label":"Gestational Age (weeks)","field_type":"number","config":{"min":4,"max":44,"unit":"weeks"},"is_required":true,"display_order":1,"width":"third"},{"field_code":"fundal_height","field_label":"Fundal Height (cm)","field_type":"number","config":{"min":5,"max":50,"unit":"cm"},"is_required":false,"display_order":2,"width":"third"},{"field_code":"fetal_heart_rate","field_label":"Fetal Heart Rate (bpm)","field_type":"number","config":{"min":80,"max":200,"unit":"bpm"},"is_required":false,"display_order":3,"width":"third"},{"field_code":"fetal_movement","field_label":"Fetal Movement","field_type":"select","config":{"options":[{"value":"active","label":"Active"},{"value":"reduced","label":"Reduced"},{"value":"absent","label":"Absent"},{"value":"not_applicable","label":"N/A (< 20 wks)"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"presentation","field_label":"Presentation","field_type":"select","config":{"options":[{"value":"cephalic","label":"Cephalic"},{"value":"breech","label":"Breech"},{"value":"transverse","label":"Transverse"},{"value":"oblique","label":"Oblique"},{"value":"unstable","label":"Unstable lie"},{"value":"not_applicable","label":"N/A (< 28 wks)"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"urine_protein","field_label":"Urine Protein","field_type":"select","config":{"options":[{"value":"nil","label":"Nil"},{"value":"trace","label":"Trace"},{"value":"1plus","label":"+"},{"value":"2plus","label":"++"},{"value":"3plus","label":"+++"},{"value":"not_done","label":"Not done"}]},"is_required":false,"display_order":6,"width":"third"},{"field_code":"urine_glucose","field_label":"Urine Glucose","field_type":"select","config":{"options":[{"value":"nil","label":"Nil"},{"value":"trace","label":"Trace"},{"value":"1plus","label":"+"},{"value":"2plus","label":"++"},{"value":"not_done","label":"Not done"}]},"is_required":false,"display_order":7,"width":"third"},{"field_code":"edema","field_label":"Edema","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"mild","label":"Mild (ankles)"},{"value":"moderate","label":"Moderate (legs)"},{"value":"severe","label":"Severe (generalized)"}]},"is_required":false,"display_order":8,"width":"third"},{"field_code":"maternal_complications","field_label":"Maternal Concerns / Complications","field_type":"checkbox_group","config":{"options":[{"value":"nausea_vomiting","label":"Nausea/Vomiting"},{"value":"headache","label":"Headache"},{"value":"visual_disturbance","label":"Visual disturbance"},{"value":"epigastric_pain","label":"Epigastric pain"},{"value":"vaginal_bleeding","label":"Vaginal bleeding"},{"value":"leaking_liquor","label":"Leaking liquor"},{"value":"reduced_fetal_movement","label":"Red. fetal movement"},{"value":"fever","label":"Fever"},{"value":"dysuria","label":"Dysuria"},{"value":"none","label":"None"}],"columns":3},"is_required":false,"display_order":9,"width":"full"}]}]}',
   20, false,
   '{"icon":"Baby","color":"pink","banner_text":"Antenatal Care â€” Doctor Documentation"}',
   'ANC-specific doctor progress note with obstetric monitoring fields'),

  -- ANC Progress Note (Nurse)
  ('anc_progress_nurse', 'ANC Nursing Note', 'progress_note',
   'ANC', 'Nurse', 'ANC', 'pregnancy',
   '["objective","notes"]',
   '{"sections":[{"section_code":"anc_nursing_assessment","section_name":"ANC Nursing Assessment","display_order":1,"is_required":true,"is_collapsible":false,"default_expanded":true,"fields":[{"field_code":"gestational_age_weeks","field_label":"Gestational Age (weeks)","field_type":"number","config":{"min":4,"max":44,"unit":"weeks"},"is_required":true,"display_order":1,"width":"third"},{"field_code":"fundal_height","field_label":"Fundal Height (cm)","field_type":"number","config":{"min":5,"max":50,"unit":"cm"},"is_required":false,"display_order":2,"width":"third"},{"field_code":"fetal_heart_rate","field_label":"Fetal Heart Rate (bpm)","field_type":"number","config":{"min":80,"max":200,"unit":"bpm"},"is_required":false,"display_order":3,"width":"third"},{"field_code":"urine_protein","field_label":"Urine Protein","field_type":"select","config":{"options":[{"value":"nil","label":"Nil"},{"value":"trace","label":"Trace"},{"value":"1plus","label":"+"},{"value":"2plus","label":"++"},{"value":"3plus","label":"+++"},{"value":"not_done","label":"Not done"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"urine_glucose","field_label":"Urine Glucose","field_type":"select","config":{"options":[{"value":"nil","label":"Nil"},{"value":"trace","label":"Trace"},{"value":"1plus","label":"+"},{"value":"2plus","label":"++"},{"value":"not_done","label":"Not done"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"patient_education","field_label":"Patient Education Given","field_type":"checkbox_group","config":{"options":[{"value":"nutrition","label":"Nutrition counselling"},{"value":"danger_signs","label":"Danger signs"},{"value":"birth_preparedness","label":"Birth preparedness"},{"value":"breastfeeding","label":"Breastfeeding"},{"value":"family_planning","label":"Family planning"},{"value":"exercise","label":"Exercise advice"}],"columns":3},"is_required":false,"display_order":6,"width":"full"}]}]}',
   20, false,
   '{"icon":"Baby","color":"pink","banner_text":"ANC Nursing Assessment"}',
   'ANC-specific nursing assessment with monitoring fields'),

  -- ANC Follow-up Note (Doctor)
  ('anc_followup_doctor', 'ANC Follow-up Note', 'follow_up_note',
   'ANC', 'Doctor', 'ANC', 'pregnancy',
   '["assessment","plan","follow_up"]',
   '{"sections":[{"section_code":"anc_followup","section_name":"ANC Follow-up Assessment","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"gestational_age_weeks","field_label":"Gestational Age (weeks)","field_type":"number","config":{"min":4,"max":44,"unit":"weeks"},"is_required":false,"display_order":1,"width":"third"},{"field_code":"fetal_heart_rate","field_label":"Fetal Heart Rate (bpm)","field_type":"number","config":{"min":80,"max":200,"unit":"bpm"},"is_required":false,"display_order":2,"width":"third"},{"field_code":"fetal_movement","field_label":"Fetal Movement","field_type":"select","config":{"options":[{"value":"active","label":"Active"},{"value":"reduced","label":"Reduced"},{"value":"absent","label":"Absent"}]},"is_required":false,"display_order":3,"width":"third"},{"field_code":"risk_assessment","field_label":"Risk Category","field_type":"radio","config":{"options":[{"value":"low","label":"Low Risk"},{"value":"moderate","label":"Moderate Risk"},{"value":"high","label":"High Risk"}]},"is_required":false,"display_order":4,"width":"full"}]}]}',
   20, false,
   '{"icon":"Calendar","color":"pink","banner_text":"ANC Follow-up Documentation"}',
   'ANC follow-up note with obstetric follow-up fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 8. SEED: Surgery Templates (Tier 3)
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('surgery_progress_doctor', 'Surgical Progress Note', 'progress_note',
   'GSG', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"post_op_review","section_name":"Post-Operative Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"wound_condition","field_label":"Wound Condition","field_type":"select","config":{"options":[{"value":"clean_dry","label":"Clean & Dry"},{"value":"mild_erythema","label":"Mild erythema"},{"value":"serous_discharge","label":"Serous discharge"},{"value":"purulent","label":"Purulent discharge"},{"value":"dehiscence","label":"Wound dehiscence"},{"value":"healing_well","label":"Healing well"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"drain_output_ml","field_label":"Drain Output (mL/24h)","field_type":"number","config":{"min":0,"max":5000,"unit":"mL"},"is_required":false,"display_order":2,"width":"half"},{"field_code":"pain_score","field_label":"Pain Score","field_type":"scale","config":{"scale_min":0,"scale_max":10,"scale_labels":["No Pain","Mild","Moderate","Severe","Worst"]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"dressing_status","field_label":"Dressing Status","field_type":"select","config":{"options":[{"value":"intact","label":"Intact"},{"value":"soaked","label":"Soaked through"},{"value":"changed","label":"Changed this shift"},{"value":"removed","label":"Removed"},{"value":"not_applicable","label":"N/A"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"mobility_status","field_label":"Mobility","field_type":"select","config":{"options":[{"value":"bedbound","label":"Bedbound"},{"value":"chair","label":"Sits in chair"},{"value":"assisted","label":"Ambulant with assistance"},{"value":"independent","label":"Ambulant independently"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"diet_tolerance","field_label":"Diet Tolerance","field_type":"select","config":{"options":[{"value":"nil_by_mouth","label":"Nil by mouth"},{"value":"sips","label":"Sips of water"},{"value":"clear_fluids","label":"Clear fluids"},{"value":"soft_diet","label":"Soft diet"},{"value":"normal_diet","label":"Normal diet"}]},"is_required":false,"display_order":6,"width":"half"}]}]}',
   10, false,
   '{"icon":"Scissors","color":"slate","banner_text":"Surgical Progress Documentation"}',
   'Post-operative/surgical progress note with wound and recovery monitoring')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 9. SEED: Cardiology Templates (Tier 3)
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('cardiology_progress_doctor', 'Cardiology Progress Note', 'progress_note',
   'CAR', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"cardiac_review","section_name":"Cardiac Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"chest_pain","field_label":"Chest Pain Status","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"stable","label":"Stable / Unchanged"},{"value":"improved","label":"Improved"},{"value":"worsened","label":"Worsened"},{"value":"new_onset","label":"New onset"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"dyspnea_class","field_label":"Dyspnea (NYHA Class)","field_type":"radio","config":{"options":[{"value":"I","label":"I â€” No limitation"},{"value":"II","label":"II â€” Slight limitation"},{"value":"III","label":"III â€” Marked limitation"},{"value":"IV","label":"IV â€” Symptoms at rest"}]},"is_required":false,"display_order":2,"width":"full"},{"field_code":"edema","field_label":"Peripheral Edema","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"trace","label":"Trace"},{"value":"1plus","label":"1+"},{"value":"2plus","label":"2+"},{"value":"3plus","label":"3+"},{"value":"4plus","label":"4+"}]},"is_required":false,"display_order":3,"width":"third"},{"field_code":"heart_rhythm","field_label":"Heart Rhythm","field_type":"select","config":{"options":[{"value":"regular","label":"Regular sinus"},{"value":"irregular","label":"Irregular"},{"value":"afib","label":"Atrial fibrillation"},{"value":"aflutter","label":"Atrial flutter"},{"value":"paced","label":"Pacemaker rhythm"}]},"is_required":false,"display_order":4,"width":"third"},{"field_code":"ecg_reviewed","field_label":"ECG Reviewed","field_type":"checkbox","config":{},"is_required":false,"display_order":5,"width":"third"},{"field_code":"bp_trend","field_label":"BP Trend","field_type":"select","config":{"options":[{"value":"controlled","label":"Well controlled"},{"value":"improving","label":"Improving"},{"value":"elevated","label":"Elevated"},{"value":"labile","label":"Labile"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"cardiac_medications_compliance","field_label":"Medication Compliance","field_type":"select","config":{"options":[{"value":"good","label":"Good compliance"},{"value":"partial","label":"Partial compliance"},{"value":"poor","label":"Poor compliance"},{"value":"unknown","label":"Unable to assess"}]},"is_required":false,"display_order":7,"width":"half"}]}]}',
   10, false,
   '{"icon":"Heart","color":"red","banner_text":"Cardiology Progress Documentation"}',
   'Cardiology progress note with cardiac-specific review fields'),

  ('cardiology_followup_doctor', 'Cardiology Follow-up Note', 'follow_up_note',
   'CAR', 'Doctor',
   '["assessment","plan","follow_up"]',
   '{"sections":[{"section_code":"cardiac_followup","section_name":"Cardiac Follow-up Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"chest_pain","field_label":"Chest Pain Since Last Visit","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"stable","label":"Stable"},{"value":"improved","label":"Improved"},{"value":"worsened","label":"Worsened"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"exercise_tolerance","field_label":"Exercise Tolerance","field_type":"select","config":{"options":[{"value":"improved","label":"Improved"},{"value":"unchanged","label":"Unchanged"},{"value":"decreased","label":"Decreased"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"bp_trend","field_label":"BP Trend","field_type":"select","config":{"options":[{"value":"controlled","label":"Well controlled"},{"value":"improving","label":"Improving"},{"value":"elevated","label":"Elevated"},{"value":"labile","label":"Labile"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"medication_changes","field_label":"Medication Changes","field_type":"textarea","config":{"rows":3},"is_required":false,"display_order":4,"width":"full"}]}]}',
   10, false,
   '{"icon":"Heart","color":"red","banner_text":"Cardiology Follow-up Documentation"}',
   'Cardiology follow-up note with cardiac review fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 10. SEED: Paediatrics Templates (Tier 3)
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('paediatrics_progress_doctor', 'Paediatrics Progress Note', 'progress_note',
   'PED', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"paediatric_review","section_name":"Paediatric Assessment","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"weight_kg","field_label":"Weight (kg)","field_type":"number","config":{"min":0.3,"max":150,"step":0.1,"unit":"kg"},"is_required":false,"display_order":1,"width":"third"},{"field_code":"height_cm","field_label":"Height/Length (cm)","field_type":"number","config":{"min":20,"max":200,"step":0.1,"unit":"cm"},"is_required":false,"display_order":2,"width":"third"},{"field_code":"head_circumference","field_label":"Head Circumference (cm)","field_type":"number","config":{"min":20,"max":60,"step":0.1,"unit":"cm"},"is_required":false,"display_order":3,"width":"third"},{"field_code":"feeding","field_label":"Feeding","field_type":"select","config":{"options":[{"value":"breastfeeding","label":"Breastfeeding"},{"value":"formula","label":"Formula feeding"},{"value":"mixed","label":"Mixed feeding"},{"value":"weaning","label":"Weaning/Complementary"},{"value":"normal_diet","label":"Normal diet"},{"value":"poor_feeding","label":"Poor feeding"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"activity_level","field_label":"Activity Level","field_type":"select","config":{"options":[{"value":"active_alert","label":"Active & Alert"},{"value":"irritable","label":"Irritable"},{"value":"lethargic","label":"Lethargic"},{"value":"inconsolable","label":"Inconsolable"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"developmental_concerns","field_label":"Developmental Concerns","field_type":"checkbox_group","config":{"options":[{"value":"motor_delay","label":"Motor delay"},{"value":"speech_delay","label":"Speech/language delay"},{"value":"social_concerns","label":"Social interaction concerns"},{"value":"cognitive_concerns","label":"Cognitive concerns"},{"value":"none","label":"None â€” age-appropriate"}],"columns":3},"is_required":false,"display_order":6,"width":"full"},{"field_code":"immunization_status","field_label":"Immunization Status","field_type":"select","config":{"options":[{"value":"up_to_date","label":"Up to date"},{"value":"behind","label":"Behind schedule"},{"value":"unknown","label":"Unknown"},{"value":"not_applicable","label":"N/A"}]},"is_required":false,"display_order":7,"width":"half"}]}]}',
   10, false,
   '{"icon":"Baby","color":"pink","banner_text":"Paediatrics Progress Documentation"}',
   'Paediatric progress note with growth, feeding, and developmental fields'),

  ('paediatrics_followup_doctor', 'Paediatrics Follow-up Note', 'follow_up_note',
   'PED', 'Doctor',
   '["assessment","plan","follow_up"]',
   '{"sections":[{"section_code":"paediatric_followup","section_name":"Paediatric Follow-up","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"weight_kg","field_label":"Weight (kg)","field_type":"number","config":{"min":0.3,"max":150,"step":0.1,"unit":"kg"},"is_required":false,"display_order":1,"width":"third"},{"field_code":"feeding","field_label":"Feeding","field_type":"select","config":{"options":[{"value":"breastfeeding","label":"Breastfeeding"},{"value":"formula","label":"Formula feeding"},{"value":"mixed","label":"Mixed"},{"value":"normal_diet","label":"Normal diet"},{"value":"poor_feeding","label":"Poor feeding"}]},"is_required":false,"display_order":2,"width":"third"},{"field_code":"activity_level","field_label":"Activity","field_type":"select","config":{"options":[{"value":"active_alert","label":"Active & Alert"},{"value":"irritable","label":"Irritable"},{"value":"lethargic","label":"Lethargic"}]},"is_required":false,"display_order":3,"width":"third"},{"field_code":"developmental_concerns","field_label":"Developmental Concerns","field_type":"textarea","config":{"rows":2},"is_required":false,"display_order":4,"width":"full"}]}]}',
   10, false,
   '{"icon":"Baby","color":"pink","banner_text":"Paediatrics Follow-up Documentation"}',
   'Paediatric follow-up note')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 11. SEED: Gynaecology Template (Tier 3)
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('gynaecology_progress_doctor', 'Gynaecology Progress Note', 'progress_note',
   'OBG', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"gynae_review","section_name":"Gynaecological Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"last_menstrual_period","field_label":"Last Menstrual Period","field_type":"date","config":{},"is_required":false,"display_order":1,"width":"half"},{"field_code":"menstrual_pattern","field_label":"Menstrual Pattern","field_type":"select","config":{"options":[{"value":"regular","label":"Regular"},{"value":"irregular","label":"Irregular"},{"value":"amenorrhea","label":"Amenorrhea"},{"value":"menorrhagia","label":"Menorrhagia"},{"value":"metrorrhagia","label":"Metrorrhagia"},{"value":"postmenopausal","label":"Postmenopausal"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"pelvic_exam","field_label":"Pelvic Examination Findings","field_type":"textarea","config":{"rows":3},"is_required":false,"display_order":3,"width":"full"},{"field_code":"cervical_findings","field_label":"Cervical Findings","field_type":"textarea","config":{"rows":2},"is_required":false,"display_order":4,"width":"full"}]}]}',
   10, false,
   '{"icon":"Users","color":"rose","banner_text":"Gynaecology Documentation"}',
   'Gynaecology progress note with reproductive health fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 12. SEED: Tier 2 Specialty Templates (moderate structure)
-- =============================================================================

-- Orthopaedics
INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('orthopaedics_progress_doctor', 'Orthopaedics Progress Note', 'progress_note',
   'ORT', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"msk_review","section_name":"Musculoskeletal Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"pain_score","field_label":"Pain Score","field_type":"scale","config":{"scale_min":0,"scale_max":10,"scale_labels":["No Pain","Mild","Moderate","Severe","Worst"]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"range_of_motion","field_label":"Range of Motion","field_type":"select","config":{"options":[{"value":"full","label":"Full ROM"},{"value":"mildly_restricted","label":"Mildly restricted"},{"value":"moderately_restricted","label":"Moderately restricted"},{"value":"severely_restricted","label":"Severely restricted"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"weight_bearing","field_label":"Weight Bearing Status","field_type":"select","config":{"options":[{"value":"full","label":"Full weight bearing"},{"value":"partial","label":"Partial weight bearing"},{"value":"non_weight_bearing","label":"Non-weight bearing"},{"value":"not_applicable","label":"N/A"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"splint_cast_status","field_label":"Splint/Cast Status","field_type":"select","config":{"options":[{"value":"intact","label":"Intact"},{"value":"removed","label":"Removed"},{"value":"changed","label":"Changed"},{"value":"none","label":"None in situ"}]},"is_required":false,"display_order":4,"width":"half"}]}]}',
   10, false,
   '{"icon":"Bone","color":"amber","banner_text":"Orthopaedics Documentation"}',
   'Orthopaedic progress note with MSK-specific review')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 13. SEED: Dermatology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('dermatology_progress_doctor', 'Dermatology Progress Note', 'progress_note',
   'SKN', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"skin_lesion_assessment","section_name":"Skin Lesion Assessment","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"lesion_type","field_label":"Lesion Type","field_type":"select","config":{"options":[{"value":"macule","label":"Macule"},{"value":"patch","label":"Patch"},{"value":"papule","label":"Papule"},{"value":"plaque","label":"Plaque"},{"value":"nodule","label":"Nodule"},{"value":"vesicle","label":"Vesicle"},{"value":"bulla","label":"Bulla"},{"value":"pustule","label":"Pustule"},{"value":"wheal","label":"Wheal"},{"value":"cyst","label":"Cyst"},{"value":"tumor","label":"Tumour"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"lesion_color","field_label":"Lesion Colour","field_type":"checkbox_group","config":{"options":[{"value":"erythematous","label":"Erythematous"},{"value":"hyperpigmented","label":"Hyperpigmented"},{"value":"hypopigmented","label":"Hypopigmented"},{"value":"violaceous","label":"Violaceous"},{"value":"yellow","label":"Yellow"},{"value":"skin_colored","label":"Skin-coloured"}],"columns":3},"is_required":false,"display_order":2,"width":"full"},{"field_code":"lesion_size","field_label":"Largest Diameter (cm)","field_type":"number","config":{"min":0.1,"max":50,"step":0.1,"unit":"cm"},"is_required":false,"display_order":3,"width":"third"},{"field_code":"lesion_number","field_label":"Lesion Count","field_type":"select","config":{"options":[{"value":"single","label":"Single"},{"value":"few","label":"Few (2-5)"},{"value":"multiple","label":"Multiple (6-20)"},{"value":"numerous","label":"Numerous (>20)"},{"value":"generalised","label":"Generalised"}]},"is_required":false,"display_order":4,"width":"third"},{"field_code":"lesion_distribution","field_label":"Distribution","field_type":"select","config":{"options":[{"value":"localised","label":"Localised"},{"value":"regional","label":"Regional"},{"value":"bilateral_symmetric","label":"Bilateral symmetric"},{"value":"unilateral","label":"Unilateral"},{"value":"dermatomal","label":"Dermatomal"},{"value":"generalised","label":"Generalised"}]},"is_required":false,"display_order":5,"width":"third"},{"field_code":"lesion_surface","field_label":"Surface Features","field_type":"checkbox_group","config":{"options":[{"value":"smooth","label":"Smooth"},{"value":"scaly","label":"Scaly"},{"value":"crusted","label":"Crusted"},{"value":"erosion","label":"Erosion"},{"value":"ulceration","label":"Ulceration"},{"value":"lichenification","label":"Lichenification"},{"value":"atrophy","label":"Atrophy"},{"value":"scarring","label":"Scarring"}],"columns":4},"is_required":false,"display_order":6,"width":"full"},{"field_code":"lesion_border","field_label":"Border","field_type":"select","config":{"options":[{"value":"well_defined","label":"Well-defined"},{"value":"sharp","label":"Sharp"},{"value":"blurred","label":"Blurred"},{"value":"irregular","label":"Irregular"}]},"is_required":false,"display_order":7,"width":"half"},{"field_code":"pruritus","field_label":"Pruritus","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]},"is_required":false,"display_order":8,"width":"half"}]}]}',
   10, false,
   '{"icon":"Scan","color":"pink","banner_text":"Dermatology Documentation"}',
   'Dermatology progress note with skin lesion assessment fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 14. SEED: ENT Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('ent_progress_doctor', 'ENT Progress Note', 'progress_note',
   'ENT', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"ear_examination","section_name":"Ear Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"external_ear_right","field_label":"External Ear (Right)","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"swelling","label":"Swelling/Inflammation"},{"value":"discharge","label":"Discharge"},{"value":"deformity","label":"Deformity"},{"value":"tenderness","label":"Tenderness"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"external_ear_left","field_label":"External Ear (Left)","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"swelling","label":"Swelling/Inflammation"},{"value":"discharge","label":"Discharge"},{"value":"deformity","label":"Deformity"},{"value":"tenderness","label":"Tenderness"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"tympanic_membrane_right","field_label":"Tympanic Membrane (Right)","field_type":"checkbox_group","config":{"options":[{"value":"intact","label":"Intact"},{"value":"perforation","label":"Perforation"},{"value":"retracted","label":"Retracted"},{"value":"bulging","label":"Bulging"},{"value":"dull","label":"Dull/Opaque"},{"value":"effusion","label":"Effusion"}],"columns":3},"is_required":false,"display_order":3,"width":"half"},{"field_code":"tympanic_membrane_left","field_label":"Tympanic Membrane (Left)","field_type":"checkbox_group","config":{"options":[{"value":"intact","label":"Intact"},{"value":"perforation","label":"Perforation"},{"value":"retracted","label":"Retracted"},{"value":"bulging","label":"Bulging"},{"value":"dull","label":"Dull/Opaque"},{"value":"effusion","label":"Effusion"}],"columns":3},"is_required":false,"display_order":4,"width":"half"},{"field_code":"hearing_subjective","field_label":"Hearing Assessment","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"mild_loss","label":"Mild loss"},{"value":"moderate_loss","label":"Moderate loss"},{"value":"severe_loss","label":"Severe/Profound loss"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"tuning_fork_rinne","field_label":"Rinne Test","field_type":"select","config":{"options":[{"value":"normal","label":"Normal (AC > BC)"},{"value":"abnormal","label":"Abnormal (BC > AC)"},{"value":"not_done","label":"Not done"}]},"is_required":false,"display_order":6,"width":"half"}]},{"section_code":"nose_throat_exam","section_name":"Nose & Throat Examination","display_order":2,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"nasal_mucosa","field_label":"Nasal Mucosa","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"congested","label":"Congested"},{"value":"pale","label":"Pale/Boggy"},{"value":"atrophic","label":"Atrophic"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"nasal_septum","field_label":"Nasal Septum","field_type":"select","config":{"options":[{"value":"midline","label":"Midline"},{"value":"deviated_left","label":"Deviated left"},{"value":"deviated_right","label":"Deviated right"},{"value":"perforation","label":"Perforation present"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"throat_exam","field_label":"Throat Findings","field_type":"checkbox_group","config":{"options":[{"value":"normal","label":"Normal"},{"value":"congested","label":"Congested pharynx"},{"value":"tonsillar_enlargement","label":"Tonsillar enlargement"},{"value":"exudate","label":"Exudate"},{"value":"post_nasal_drip","label":"Post-nasal drip"},{"value":"mass","label":"Mass/lesion"}],"columns":3},"is_required":false,"display_order":3,"width":"full"}]}]}',
   10, false,
   '{"icon":"Ear","color":"indigo","banner_text":"ENT Documentation"}',
   'ENT progress note with ear, nose, and throat examination fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 15. SEED: Urology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('urology_progress_doctor', 'Urology Progress Note', 'progress_note',
   'URO', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"urinary_symptoms","section_name":"Urinary Symptoms Assessment","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"storage_symptoms","field_label":"Storage Symptoms (LUTS)","field_type":"checkbox_group","config":{"options":[{"value":"frequency","label":"Frequency (>8/day)"},{"value":"urgency","label":"Urgency"},{"value":"urge_incontinence","label":"Urge incontinence"},{"value":"nocturia","label":"Nocturia"},{"value":"stress_incontinence","label":"Stress incontinence"},{"value":"none","label":"None"}],"columns":3},"is_required":false,"display_order":1,"width":"full"},{"field_code":"voiding_symptoms","field_label":"Voiding Symptoms","field_type":"checkbox_group","config":{"options":[{"value":"hesitancy","label":"Hesitancy"},{"value":"weak_stream","label":"Weak stream"},{"value":"intermittency","label":"Intermittency"},{"value":"straining","label":"Straining"},{"value":"incomplete_emptying","label":"Incomplete emptying"},{"value":"terminal_dribbling","label":"Terminal dribbling"},{"value":"none","label":"None"}],"columns":3},"is_required":false,"display_order":2,"width":"full"},{"field_code":"ipss_score","field_label":"IPSS Score (0-35)","field_type":"number","config":{"min":0,"max":35},"is_required":false,"display_order":3,"width":"third"},{"field_code":"hematuria","field_label":"Hematuria","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"microscopic","label":"Microscopic"},{"value":"gross_initial","label":"Gross â€” initial"},{"value":"gross_terminal","label":"Gross â€” terminal"},{"value":"gross_total","label":"Gross â€” total"},{"value":"with_clots","label":"With clots"}]},"is_required":false,"display_order":4,"width":"third"},{"field_code":"pain_location","field_label":"Pain Location","field_type":"checkbox_group","config":{"options":[{"value":"none","label":"None"},{"value":"suprapubic","label":"Suprapubic"},{"value":"loin_right","label":"Right loin"},{"value":"loin_left","label":"Left loin"},{"value":"perineal","label":"Perineal"},{"value":"scrotal","label":"Scrotal"},{"value":"penile","label":"Penile"}],"columns":3},"is_required":false,"display_order":5,"width":"full"},{"field_code":"catheter_status","field_label":"Catheter Status","field_type":"select","config":{"options":[{"value":"none","label":"No catheter"},{"value":"urethral","label":"Urethral catheter in situ"},{"value":"suprapubic","label":"Suprapubic catheter"},{"value":"nephrostomy","label":"Nephrostomy"},{"value":"ureteric_stent","label":"Ureteric stent"}]},"is_required":false,"display_order":6,"width":"half"}]}]}',
   10, false,
   '{"icon":"Droplets","color":"blue","banner_text":"Urology Documentation"}',
   'Urology progress note with urinary symptoms and examination fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 16. SEED: Neurology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('neurology_progress_doctor', 'Neurology Progress Note', 'progress_note',
   'NEU', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"neuro_exam","section_name":"Neurological Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"gcs_eye","field_label":"GCS â€” Eye Opening","field_type":"select","config":{"options":[{"value":"4","label":"E4 â€” Spontaneous"},{"value":"3","label":"E3 â€” To voice"},{"value":"2","label":"E2 â€” To pain"},{"value":"1","label":"E1 â€” None"}]},"is_required":false,"display_order":1,"width":"third"},{"field_code":"gcs_verbal","field_label":"GCS â€” Verbal","field_type":"select","config":{"options":[{"value":"5","label":"V5 â€” Oriented"},{"value":"4","label":"V4 â€” Confused"},{"value":"3","label":"V3 â€” Inappropriate words"},{"value":"2","label":"V2 â€” Incomprehensible"},{"value":"1","label":"V1 â€” None"}]},"is_required":false,"display_order":2,"width":"third"},{"field_code":"gcs_motor","field_label":"GCS â€” Motor","field_type":"select","config":{"options":[{"value":"6","label":"M6 â€” Obeys commands"},{"value":"5","label":"M5 â€” Localizes pain"},{"value":"4","label":"M4 â€” Withdraws"},{"value":"3","label":"M3 â€” Decorticate"},{"value":"2","label":"M2 â€” Decerebrate"},{"value":"1","label":"M1 â€” None"}]},"is_required":false,"display_order":3,"width":"third"},{"field_code":"orientation","field_label":"Orientation","field_type":"select","config":{"options":[{"value":"oriented","label":"Oriented (time, place, person)"},{"value":"confused","label":"Confused"},{"value":"disoriented","label":"Disoriented"},{"value":"not_testable","label":"Not testable"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"speech","field_label":"Speech","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"aphasia","label":"Aphasia"},{"value":"dysarthria","label":"Dysarthria"},{"value":"reduced","label":"Reduced/Minimal"},{"value":"mute","label":"Mute"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"motor_power_upper","field_label":"Motor Power â€” Upper Limbs","field_type":"select","config":{"options":[{"value":"5_5","label":"5/5 bilateral"},{"value":"reduced_right","label":"Reduced right"},{"value":"reduced_left","label":"Reduced left"},{"value":"reduced_bilateral","label":"Reduced bilateral"},{"value":"plegia_right","label":"Plegia right"},{"value":"plegia_left","label":"Plegia left"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"motor_power_lower","field_label":"Motor Power â€” Lower Limbs","field_type":"select","config":{"options":[{"value":"5_5","label":"5/5 bilateral"},{"value":"reduced_right","label":"Reduced right"},{"value":"reduced_left","label":"Reduced left"},{"value":"reduced_bilateral","label":"Reduced bilateral"},{"value":"plegia_right","label":"Plegia right"},{"value":"plegia_left","label":"Plegia left"}]},"is_required":false,"display_order":7,"width":"half"},{"field_code":"reflexes","field_label":"Deep Tendon Reflexes","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"hyperreflexic","label":"Hyperreflexic"},{"value":"hyporeflexic","label":"Hyporeflexic"},{"value":"areflexic","label":"Areflexic"},{"value":"asymmetric","label":"Asymmetric"}]},"is_required":false,"display_order":8,"width":"half"},{"field_code":"plantar_response","field_label":"Plantar Response","field_type":"select","config":{"options":[{"value":"flexor_bilateral","label":"Flexor bilateral"},{"value":"extensor_right","label":"Extensor right (Babinski +)"},{"value":"extensor_left","label":"Extensor left (Babinski +)"},{"value":"extensor_bilateral","label":"Extensor bilateral"},{"value":"mute","label":"Mute/Equivocal"}]},"is_required":false,"display_order":9,"width":"half"}]}]}',
   10, false,
   '{"icon":"Brain","color":"purple","banner_text":"Neurology Documentation"}',
   'Neurology progress note with neurological examination fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 17. SEED: Neuropsychiatry Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('neuropsychiatry_progress_doctor', 'Neuropsychiatry Progress Note', 'progress_note',
   'NPY', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"mse","section_name":"Mental Status Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"appearance","field_label":"Appearance","field_type":"select","config":{"options":[{"value":"well_kempt","label":"Well kempt"},{"value":"poorly_kempt","label":"Poorly kempt"},{"value":"disheveled","label":"Dishevelled"}]},"is_required":false,"display_order":1,"width":"third"},{"field_code":"psychomotor_activity","field_label":"Psychomotor Activity","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"retarded","label":"Retarded (slowed)"},{"value":"agitated","label":"Agitated"}]},"is_required":false,"display_order":2,"width":"third"},{"field_code":"eye_contact","field_label":"Eye Contact","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"reduced","label":"Reduced"},{"value":"avoidant","label":"Avoidant"}]},"is_required":false,"display_order":3,"width":"third"},{"field_code":"speech_rate","field_label":"Speech Rate","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"pressured","label":"Pressured (rapid)"},{"value":"slow","label":"Slow"}]},"is_required":false,"display_order":4,"width":"third"},{"field_code":"mood","field_label":"Mood (subjective)","field_type":"text","config":{},"placeholder":"Patient-reported mood","is_required":false,"display_order":5,"width":"half"},{"field_code":"affect","field_label":"Affect (observed)","field_type":"select","config":{"options":[{"value":"euthymic","label":"Euthymic"},{"value":"depressed","label":"Depressed"},{"value":"anxious","label":"Anxious"},{"value":"irritable","label":"Irritable"},{"value":"elated","label":"Elated"},{"value":"flat","label":"Flat"},{"value":"blunted","label":"Blunted"},{"value":"labile","label":"Labile"},{"value":"incongruent","label":"Incongruent"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"thought_form","field_label":"Thought Form","field_type":"select","config":{"options":[{"value":"normal","label":"Normal/Logical"},{"value":"circumstantial","label":"Circumstantial"},{"value":"tangential","label":"Tangential"},{"value":"loosening","label":"Loosening of associations"},{"value":"flight_of_ideas","label":"Flight of ideas"},{"value":"poverty","label":"Poverty of thought"},{"value":"perseveration","label":"Perseveration"}]},"is_required":false,"display_order":7,"width":"half"},{"field_code":"thought_content","field_label":"Thought Content","field_type":"checkbox_group","config":{"options":[{"value":"normal","label":"Normal"},{"value":"delusions","label":"Delusions"},{"value":"suicidal_ideation","label":"Suicidal ideation"},{"value":"homicidal_ideation","label":"Homicidal ideation"},{"value":"obsessions","label":"Obsessions"},{"value":"preoccupations","label":"Preoccupations"},{"value":"phobias","label":"Phobias"}],"columns":3},"is_required":false,"display_order":8,"width":"full"},{"field_code":"perception","field_label":"Perception","field_type":"checkbox_group","config":{"options":[{"value":"normal","label":"Normal"},{"value":"auditory_hallucinations","label":"Auditory hallucinations"},{"value":"visual_hallucinations","label":"Visual hallucinations"},{"value":"illusions","label":"Illusions"},{"value":"depersonalisation","label":"Depersonalisation"},{"value":"derealisation","label":"Derealisation"}],"columns":3},"is_required":false,"display_order":9,"width":"full"},{"field_code":"insight","field_label":"Insight","field_type":"select","config":{"options":[{"value":"good","label":"Good â€” recognises illness"},{"value":"partial","label":"Partial"},{"value":"poor","label":"Poor â€” denies illness"}]},"is_required":false,"display_order":10,"width":"half"},{"field_code":"judgement","field_label":"Judgement","field_type":"select","config":{"options":[{"value":"intact","label":"Intact"},{"value":"impaired","label":"Impaired"}]},"is_required":false,"display_order":11,"width":"half"}]}]}',
   10, false,
   '{"icon":"BrainCircuit","color":"violet","banner_text":"Neuropsychiatry â€” Mental Status Examination"}',
   'Neuropsychiatry progress note with MSE fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 18. SEED: Gastroenterology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('gastro_progress_doctor', 'Gastroenterology Progress Note', 'progress_note',
   'GAS', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"gi_examination","section_name":"GI & Abdominal Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"jaundice","field_label":"Jaundice","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild (sclerae)"},{"value":"moderate","label":"Moderate"},{"value":"deep","label":"Deep"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"pallor","field_label":"Pallor","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"abdominal_distension","field_label":"Abdominal Distension","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"tenderness","field_label":"Abdominal Tenderness","field_type":"checkbox_group","config":{"options":[{"value":"none","label":"None"},{"value":"rlq","label":"RLQ"},{"value":"llq","label":"LLQ"},{"value":"ruq","label":"RUQ"},{"value":"luq","label":"LUQ"},{"value":"epigastric","label":"Epigastric"},{"value":"periumbilical","label":"Periumbilical"},{"value":"suprapubic","label":"Suprapubic"},{"value":"generalised","label":"Generalised"}],"columns":3},"is_required":false,"display_order":4,"width":"full"},{"field_code":"hepatomegaly","field_label":"Hepatomegaly","field_type":"select","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mildly enlarged"},{"value":"moderate","label":"Moderately enlarged"},{"value":"massive","label":"Massive"}]},"is_required":false,"display_order":5,"width":"third"},{"field_code":"splenomegaly","field_label":"Splenomegaly","field_type":"select","config":{"options":[{"value":"absent","label":"Absent"},{"value":"present","label":"Present"},{"value":"massive","label":"Massive"}]},"is_required":false,"display_order":6,"width":"third"},{"field_code":"ascites","field_label":"Ascites","field_type":"select","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"tense","label":"Tense"}]},"is_required":false,"display_order":7,"width":"third"},{"field_code":"bowel_sounds","field_label":"Bowel Sounds","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"hyperactive","label":"Hyperactive"},{"value":"hypoactive","label":"Hypoactive"},{"value":"absent","label":"Absent"}]},"is_required":false,"display_order":8,"width":"half"}]}]}',
   10, false,
   '{"icon":"Stethoscope","color":"orange","banner_text":"Gastroenterology Documentation"}',
   'Gastroenterology progress note with GI examination fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 19. SEED: Nephrology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('nephrology_progress_doctor', 'Nephrology Progress Note', 'progress_note',
   'NEP', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"renal_review","section_name":"Renal & Volume Status Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"pallor","field_label":"Pallor","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"peripheral_edema","field_label":"Peripheral Oedema","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild (ankles)"},{"value":"moderate","label":"Moderate (to knees)"},{"value":"severe","label":"Severe / Anasarca"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"dehydration","field_label":"Dehydration","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"volume_status","field_label":"Volume Status","field_type":"select","config":{"options":[{"value":"euvolemic","label":"Euvolemic"},{"value":"hypervolemic","label":"Hypervolemic (fluid overload)"},{"value":"hypovolemic","label":"Hypovolemic (dry)"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"bp_status","field_label":"BP Status","field_type":"select","config":{"options":[{"value":"normotensive","label":"Normotensive"},{"value":"hypertensive","label":"Hypertensive"},{"value":"hypotensive","label":"Hypotensive"},{"value":"emergency","label":"Hypertensive emergency"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"urine_output","field_label":"Urine Output","field_type":"select","config":{"options":[{"value":"adequate","label":"Adequate (>0.5 mL/kg/h)"},{"value":"oliguria","label":"Oliguria (<400 mL/day)"},{"value":"anuria","label":"Anuria (<100 mL/day)"},{"value":"polyuria","label":"Polyuria (>3L/day)"},{"value":"not_measured","label":"Not measured"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"dialysis_access","field_label":"Dialysis Access","field_type":"select","config":{"options":[{"value":"none","label":"None / Not applicable"},{"value":"avf_functioning","label":"AVF â€” functioning"},{"value":"avf_not_functioning","label":"AVF â€” not functioning"},{"value":"permcath","label":"Permcath"},{"value":"temporary_catheter","label":"Temporary HD catheter"},{"value":"pd_catheter","label":"PD catheter"}]},"is_required":false,"display_order":7,"width":"half"},{"field_code":"ckd_stage","field_label":"CKD Stage","field_type":"select","config":{"options":[{"value":"1","label":"Stage 1 (GFR â‰¥90)"},{"value":"2","label":"Stage 2 (GFR 60-89)"},{"value":"3a","label":"Stage 3a (GFR 45-59)"},{"value":"3b","label":"Stage 3b (GFR 30-44)"},{"value":"4","label":"Stage 4 (GFR 15-29)"},{"value":"5","label":"Stage 5 (GFR <15)"},{"value":"5d","label":"Stage 5D (on dialysis)"},{"value":"aki","label":"AKI (acute)"}]},"is_required":false,"display_order":8,"width":"half"}]}]}',
   10, false,
   '{"icon":"Droplets","color":"teal","banner_text":"Nephrology Documentation"}',
   'Nephrology progress note with renal and volume status fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 20. SEED: Neurosurgery Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('neurosurgery_progress_doctor', 'Neurosurgery Progress Note', 'progress_note',
   'NSG', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"neuro_surg_exam","section_name":"Neurosurgical Assessment","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"consciousness_level","field_label":"Consciousness Level","field_type":"select","config":{"options":[{"value":"alert","label":"Alert"},{"value":"drowsy","label":"Drowsy"},{"value":"stuporous","label":"Stuporous"},{"value":"comatose","label":"Comatose"}]},"is_required":true,"display_order":1,"width":"half"},{"field_code":"gcs_eye","field_label":"GCS â€” Eye Opening","field_type":"select","config":{"options":[{"value":"4","label":"E4 â€” Spontaneous"},{"value":"3","label":"E3 â€” To voice"},{"value":"2","label":"E2 â€” To pain"},{"value":"1","label":"E1 â€” None"}]},"is_required":true,"display_order":2,"width":"third"},{"field_code":"gcs_verbal","field_label":"GCS â€” Verbal","field_type":"select","config":{"options":[{"value":"5","label":"V5 â€” Oriented"},{"value":"4","label":"V4 â€” Confused"},{"value":"3","label":"V3 â€” Inappropriate"},{"value":"2","label":"V2 â€” Incomprehensible"},{"value":"1","label":"V1 â€” None"},{"value":"T","label":"VT â€” Intubated"}]},"is_required":true,"display_order":3,"width":"third"},{"field_code":"gcs_motor","field_label":"GCS â€” Motor","field_type":"select","config":{"options":[{"value":"6","label":"M6 â€” Obeys"},{"value":"5","label":"M5 â€” Localizes"},{"value":"4","label":"M4 â€” Withdraws"},{"value":"3","label":"M3 â€” Decorticate"},{"value":"2","label":"M2 â€” Decerebrate"},{"value":"1","label":"M1 â€” None"}]},"is_required":true,"display_order":4,"width":"third"},{"field_code":"pupil_reaction_right","field_label":"Pupil (Right)","field_type":"select","config":{"options":[{"value":"normal","label":"Normal reactive"},{"value":"sluggish","label":"Sluggish"},{"value":"fixed_dilated","label":"Fixed & Dilated"},{"value":"fixed_constricted","label":"Fixed & Constricted"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"pupil_reaction_left","field_label":"Pupil (Left)","field_type":"select","config":{"options":[{"value":"normal","label":"Normal reactive"},{"value":"sluggish","label":"Sluggish"},{"value":"fixed_dilated","label":"Fixed & Dilated"},{"value":"fixed_constricted","label":"Fixed & Constricted"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"neuro_red_flags","field_label":"Neurological Red Flags","field_type":"checkbox_group","config":{"options":[{"value":"none","label":"None"},{"value":"raised_icp_signs","label":"Raised ICP signs"},{"value":"head_injury_signs","label":"Head injury signs"},{"value":"spinal_deformity","label":"Spinal deformity"},{"value":"neck_stiffness","label":"Neck stiffness"},{"value":"new_focal_deficit","label":"New focal deficit"}],"columns":3},"is_required":false,"display_order":7,"width":"full"},{"field_code":"wound_condition","field_label":"Surgical Wound","field_type":"select","config":{"options":[{"value":"not_applicable","label":"N/A â€” No surgery"},{"value":"clean_dry","label":"Clean & Dry"},{"value":"mild_erythema","label":"Mild erythema"},{"value":"discharge","label":"Discharge present"},{"value":"dehiscence","label":"Dehiscence"},{"value":"healing_well","label":"Healing well"}]},"is_required":false,"display_order":8,"width":"half"}]}]}',
   10, false,
   '{"icon":"Brain","color":"slate","banner_text":"Neurosurgery Documentation"}',
   'Neurosurgery progress note with GCS, pupil, and neuro assessment fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 21. SEED: Oral & Maxillofacial Surgery Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('omfs_progress_doctor', 'Oral & Maxillofacial Progress Note', 'progress_note',
   'OMF', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"facial_oral_exam","section_name":"Facial & Oral Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"facial_symmetry","field_label":"Facial Symmetry","field_type":"radio","config":{"options":[{"value":"symmetrical","label":"Symmetrical"},{"value":"asymmetrical","label":"Asymmetrical"}]},"is_required":true,"display_order":1,"width":"half"},{"field_code":"facial_swelling","field_label":"Facial Swelling","field_type":"select","config":{"options":[{"value":"none","label":"None"},{"value":"right","label":"Right side"},{"value":"left","label":"Left side"},{"value":"bilateral","label":"Bilateral"},{"value":"midline","label":"Midline"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"tmj_status","field_label":"TMJ Status","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"clicking","label":"Clicking"},{"value":"crepitus","label":"Crepitus"},{"value":"limited_opening","label":"Limited opening"},{"value":"deviation","label":"Deviation on opening"},{"value":"lock","label":"Lock"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"mouth_opening","field_label":"Mouth Opening (mm)","field_type":"number","config":{"min":0,"max":60,"unit":"mm"},"is_required":false,"display_order":4,"width":"half"},{"field_code":"oral_mucosa","field_label":"Oral Mucosa","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"erythema","label":"Erythema"},{"value":"ulceration","label":"Ulceration"},{"value":"leukoplakia","label":"Leukoplakia"},{"value":"mass","label":"Mass/Growth"},{"value":"infection","label":"Infection signs"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"dental_status","field_label":"Dental Status","field_type":"select","config":{"options":[{"value":"intact","label":"Intact dentition"},{"value":"caries","label":"Caries present"},{"value":"missing","label":"Missing teeth"},{"value":"fractured","label":"Fractured tooth"},{"value":"malocclusion","label":"Malocclusion"},{"value":"prosthesis","label":"Prosthesis in situ"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"nerve_status","field_label":"Nerve Status (CN V, VII)","field_type":"select","config":{"options":[{"value":"intact","label":"Intact"},{"value":"v_deficit","label":"Trigeminal (V) deficit"},{"value":"vii_deficit","label":"Facial (VII) deficit"},{"value":"both","label":"Both affected"}]},"is_required":false,"display_order":7,"width":"half"}]}]}',
   10, false,
   '{"icon":"Users","color":"amber","banner_text":"Oral & Maxillofacial Documentation"}',
   'OMFS progress note with facial and oral cavity examination fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 22. SEED: Pulmonology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('pulmonology_progress_doctor', 'Pulmonology Progress Note', 'progress_note',
   'PUL', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"respiratory_exam","section_name":"Respiratory Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"respiratory_distress","field_label":"Respiratory Status","field_type":"select","config":{"options":[{"value":"comfortable","label":"Comfortable at rest"},{"value":"mild_distress","label":"Mild distress"},{"value":"moderate_distress","label":"Moderate distress"},{"value":"severe_distress","label":"Severe distress"},{"value":"accessory_muscles","label":"Using accessory muscles"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"cyanosis","field_label":"Cyanosis","field_type":"select","config":{"options":[{"value":"absent","label":"Absent"},{"value":"peripheral","label":"Peripheral"},{"value":"central","label":"Central"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"clubbing","field_label":"Clubbing","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"present","label":"Present"}]},"is_required":false,"display_order":3,"width":"third"},{"field_code":"tracheal_position","field_label":"Trachea","field_type":"select","config":{"options":[{"value":"central","label":"Central"},{"value":"deviated_right","label":"Deviated right"},{"value":"deviated_left","label":"Deviated left"}]},"is_required":false,"display_order":4,"width":"third"},{"field_code":"chest_expansion","field_label":"Chest Expansion","field_type":"select","config":{"options":[{"value":"equal","label":"Equal bilateral"},{"value":"reduced_right","label":"Reduced right"},{"value":"reduced_left","label":"Reduced left"},{"value":"reduced_bilateral","label":"Reduced bilateral"}]},"is_required":false,"display_order":5,"width":"third"},{"field_code":"percussion_note","field_label":"Percussion","field_type":"select","config":{"options":[{"value":"resonant","label":"Resonant"},{"value":"dull_right","label":"Dull right"},{"value":"dull_left","label":"Dull left"},{"value":"dull_bilateral","label":"Dull bilateral"},{"value":"hyper_resonant","label":"Hyper-resonant"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"breath_sounds","field_label":"Breath Sounds","field_type":"select","config":{"options":[{"value":"vesicular","label":"Vesicular (normal)"},{"value":"bronchial","label":"Bronchial"},{"value":"reduced_right","label":"Reduced right"},{"value":"reduced_left","label":"Reduced left"},{"value":"reduced_bilateral","label":"Reduced bilateral"},{"value":"absent","label":"Absent"}]},"is_required":false,"display_order":7,"width":"half"},{"field_code":"adventitious_sounds","field_label":"Added Sounds","field_type":"checkbox_group","config":{"options":[{"value":"none","label":"None"},{"value":"crackles","label":"Crackles (crepitations)"},{"value":"wheeze","label":"Wheeze"},{"value":"rhonchi","label":"Rhonchi"},{"value":"stridor","label":"Stridor"},{"value":"pleural_rub","label":"Pleural rub"}],"columns":3},"is_required":false,"display_order":8,"width":"full"},{"field_code":"oxygen_therapy","field_label":"Oxygen Therapy","field_type":"select","config":{"options":[{"value":"none","label":"Room air"},{"value":"nasal_cannula","label":"Nasal cannula"},{"value":"face_mask","label":"Face mask"},{"value":"nrb","label":"Non-rebreather mask"},{"value":"niv","label":"NIV (CPAP/BiPAP)"},{"value":"ventilator","label":"Mechanical ventilation"}]},"is_required":false,"display_order":9,"width":"half"}]}]}',
   10, false,
   '{"icon":"Wind","color":"cyan","banner_text":"Pulmonology Documentation"}',
   'Pulmonology progress note with respiratory examination fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 23. SEED: Endocrinology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('endocrinology_progress_doctor', 'Endocrinology Progress Note', 'progress_note',
   'END', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"metabolic_review","section_name":"Metabolic & Endocrine Review","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"weight_status","field_label":"Weight Status","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"overweight","label":"Overweight"},{"value":"obese","label":"Obese"},{"value":"underweight","label":"Underweight"},{"value":"recent_loss","label":"Recent weight loss"},{"value":"recent_gain","label":"Recent weight gain"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"bmi_category","field_label":"BMI Category","field_type":"select","config":{"options":[{"value":"underweight","label":"Underweight (<18.5)"},{"value":"normal","label":"Normal (18.5-24.9)"},{"value":"overweight","label":"Overweight (25-29.9)"},{"value":"obese_i","label":"Obese Class I (30-34.9)"},{"value":"obese_ii","label":"Obese Class II (35-39.9)"},{"value":"obese_iii","label":"Obese Class III (â‰¥40)"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"thyroid_exam","field_label":"Thyroid Gland","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"diffuse_goitre","label":"Diffuse goitre"},{"value":"nodular","label":"Nodular"},{"value":"tender","label":"Tender"},{"value":"not_palpable","label":"Not palpable (post-surgery)"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"thyroid_signs","field_label":"Thyroid-related Signs","field_type":"checkbox_group","config":{"options":[{"value":"none","label":"None"},{"value":"tremor","label":"Fine tremor"},{"value":"exophthalmos","label":"Exophthalmos"},{"value":"lid_lag","label":"Lid lag"},{"value":"tachycardia","label":"Tachycardia"},{"value":"bradycardia","label":"Bradycardia"},{"value":"skin_changes","label":"Skin changes"},{"value":"hair_changes","label":"Hair changes"}],"columns":4},"is_required":false,"display_order":4,"width":"full"},{"field_code":"diabetic_status","field_label":"Diabetic Status","field_type":"select","config":{"options":[{"value":"not_applicable","label":"Not applicable"},{"value":"well_controlled","label":"Well controlled"},{"value":"poorly_controlled","label":"Poorly controlled"},{"value":"new_diagnosis","label":"New diagnosis"},{"value":"hypoglycemia","label":"Recurrent hypoglycaemia"},{"value":"dka_risk","label":"DKA risk"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"foot_exam","field_label":"Diabetic Foot Exam","field_type":"select","config":{"options":[{"value":"not_applicable","label":"Not applicable"},{"value":"normal","label":"Normal"},{"value":"neuropathy","label":"Neuropathy present"},{"value":"ulcer","label":"Ulcer present"},{"value":"pvd","label":"PVD signs"},{"value":"charcot","label":"Charcot changes"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"bp_status","field_label":"BP Status","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"hypertensive","label":"Hypertensive"},{"value":"hypotensive","label":"Hypotensive"}]},"is_required":false,"display_order":7,"width":"half"},{"field_code":"acanthosis_nigricans","field_label":"Acanthosis Nigricans","field_type":"radio","config":{"options":[{"value":"absent","label":"Absent"},{"value":"present","label":"Present"}]},"is_required":false,"display_order":8,"width":"half"}]}]}',
   10, false,
   '{"icon":"Activity","color":"lime","banner_text":"Endocrinology Documentation"}',
   'Endocrinology progress note with metabolic and thyroid review fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 24. SEED: Plastic Surgery Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('plastic_surgery_progress_doctor', 'Plastic Surgery Progress Note', 'progress_note',
   'PLS', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"wound_recon_assessment","section_name":"Wound & Reconstructive Assessment","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"affected_region","field_label":"Affected Region","field_type":"checkbox_group","config":{"options":[{"value":"face","label":"Face"},{"value":"scalp","label":"Scalp"},{"value":"neck","label":"Neck"},{"value":"upper_limb","label":"Upper limb"},{"value":"lower_limb","label":"Lower limb"},{"value":"hand","label":"Hand"},{"value":"trunk","label":"Trunk"},{"value":"breast","label":"Breast"},{"value":"perineum","label":"Perineum"}],"columns":3},"is_required":true,"display_order":1,"width":"full"},{"field_code":"side","field_label":"Side","field_type":"select","config":{"options":[{"value":"right","label":"Right"},{"value":"left","label":"Left"},{"value":"bilateral","label":"Bilateral"},{"value":"midline","label":"Midline"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"skin_condition","field_label":"Skin / Soft Tissue Condition","field_type":"checkbox_group","config":{"options":[{"value":"normal","label":"Normal"},{"value":"laceration","label":"Laceration"},{"value":"ulcer","label":"Ulcer"},{"value":"necrosis","label":"Necrosis"},{"value":"infection","label":"Infection"},{"value":"skin_loss","label":"Skin loss"},{"value":"contusion","label":"Contusion"},{"value":"burn","label":"Burn"}],"columns":4},"is_required":false,"display_order":3,"width":"full"},{"field_code":"wound_size","field_label":"Wound Size (cm)","field_type":"text","config":{},"placeholder":"L x W x D in cm","is_required":false,"display_order":4,"width":"half"},{"field_code":"wound_bed","field_label":"Wound Bed","field_type":"select","config":{"options":[{"value":"granulating","label":"Granulating"},{"value":"sloughy","label":"Sloughy"},{"value":"necrotic","label":"Necrotic"},{"value":"epithelialising","label":"Epithelialising"},{"value":"mixed","label":"Mixed"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"flap_graft_status","field_label":"Flap/Graft Status","field_type":"select","config":{"options":[{"value":"not_applicable","label":"N/A"},{"value":"viable","label":"Viable"},{"value":"congested","label":"Congested"},{"value":"pale","label":"Pale"},{"value":"partial_loss","label":"Partial loss"},{"value":"complete_loss","label":"Complete loss"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"pain_score","field_label":"Pain Score","field_type":"scale","config":{"scale_min":0,"scale_max":10,"scale_labels":["No Pain","Mild","Moderate","Severe","Worst"]},"is_required":false,"display_order":7,"width":"half"}]}]}',
   10, false,
   '{"icon":"Scissors","color":"rose","banner_text":"Plastic Surgery Documentation"}',
   'Plastic surgery progress note with wound and reconstructive assessment fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 25. SEED: Ophthalmology Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('ophthalmology_progress_doctor', 'Ophthalmology Progress Note', 'progress_note',
   'EYE', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"ocular_exam","section_name":"Ocular Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"visual_acuity_right","field_label":"Visual Acuity â€” Right (OD)","field_type":"text","config":{},"placeholder":"e.g. 6/6, 6/12, CF, HM, PL, NPL","is_required":false,"display_order":1,"width":"half"},{"field_code":"visual_acuity_left","field_label":"Visual Acuity â€” Left (OS)","field_type":"text","config":{},"placeholder":"e.g. 6/6, 6/12, CF, HM, PL, NPL","is_required":false,"display_order":2,"width":"half"},{"field_code":"iop_right","field_label":"IOP Right (mmHg)","field_type":"number","config":{"min":0,"max":80,"unit":"mmHg"},"is_required":false,"display_order":3,"width":"half"},{"field_code":"iop_left","field_label":"IOP Left (mmHg)","field_type":"number","config":{"min":0,"max":80,"unit":"mmHg"},"is_required":false,"display_order":4,"width":"half"},{"field_code":"pupil_right","field_label":"Pupil (Right)","field_type":"select","config":{"options":[{"value":"normal_reactive","label":"Normal, reactive"},{"value":"sluggish","label":"Sluggish"},{"value":"fixed","label":"Fixed"},{"value":"dilated","label":"Dilated"},{"value":"constricted","label":"Constricted"},{"value":"rapd","label":"RAPD positive"}]},"is_required":false,"display_order":5,"width":"half"},{"field_code":"pupil_left","field_label":"Pupil (Left)","field_type":"select","config":{"options":[{"value":"normal_reactive","label":"Normal, reactive"},{"value":"sluggish","label":"Sluggish"},{"value":"fixed","label":"Fixed"},{"value":"dilated","label":"Dilated"},{"value":"constricted","label":"Constricted"},{"value":"rapd","label":"RAPD positive"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"anterior_segment","field_label":"Anterior Segment","field_type":"checkbox_group","config":{"options":[{"value":"normal","label":"Normal"},{"value":"conjunctival_injection","label":"Conjunctival injection"},{"value":"corneal_opacity","label":"Corneal opacity"},{"value":"anterior_chamber_cells","label":"AC cells/flare"},{"value":"hyphaema","label":"Hyphaema"},{"value":"hypopyon","label":"Hypopyon"},{"value":"lens_opacity","label":"Lens opacity (cataract)"},{"value":"pseudophakia","label":"Pseudophakia (IOL)"},{"value":"aphakia","label":"Aphakia"}],"columns":3},"is_required":false,"display_order":7,"width":"full"},{"field_code":"fundus_exam","field_label":"Fundus Examination","field_type":"checkbox_group","config":{"options":[{"value":"normal","label":"Normal"},{"value":"not_visualised","label":"Not visualised"},{"value":"disc_swelling","label":"Disc swelling"},{"value":"disc_pallor","label":"Disc pallor"},{"value":"cupping","label":"Increased cupping"},{"value":"retinal_hemorrhage","label":"Retinal haemorrhage"},{"value":"macular_pathology","label":"Macular pathology"},{"value":"retinal_detachment","label":"Retinal detachment"},{"value":"diabetic_retinopathy","label":"Diabetic retinopathy"}],"columns":3},"is_required":false,"display_order":8,"width":"full"}]},{"section_code":"cycloplegic_refraction","section_name":"Cycloplegic Refraction (Wet Refraction)","display_order":2,"is_required":false,"is_collapsible":true,"default_expanded":false,"fields":[{"field_code":"cyclo_agent","field_label":"Cycloplegic Agent","field_type":"select","config":{"options":[{"value":"cyclopentolate_1","label":"Cyclopentolate 1%"},{"value":"atropine_1","label":"Atropine 1%"},{"value":"tropicamide_1","label":"Tropicamide 1%"},{"value":"homatropine_2","label":"Homatropine 2%"}]},"is_required":false,"display_order":1,"width":"half"},{"field_code":"cyclo_instillation_time","field_label":"Instillation Time","field_type":"text","config":{},"placeholder":"e.g. 10:30 AM","is_required":false,"display_order":2,"width":"half"},{"field_code":"cyclo_right_sphere","field_label":"OD Sphere","field_type":"number","config":{"step":0.25},"is_required":false,"display_order":3,"width":"third"},{"field_code":"cyclo_right_cylinder","field_label":"OD Cylinder","field_type":"number","config":{"step":0.25},"is_required":false,"display_order":4,"width":"third"},{"field_code":"cyclo_right_axis","field_label":"OD Axis","field_type":"number","config":{"min":0,"max":180},"is_required":false,"display_order":5,"width":"third"},{"field_code":"cyclo_left_sphere","field_label":"OS Sphere","field_type":"number","config":{"step":0.25},"is_required":false,"display_order":6,"width":"third"},{"field_code":"cyclo_left_cylinder","field_label":"OS Cylinder","field_type":"number","config":{"step":0.25},"is_required":false,"display_order":7,"width":"third"},{"field_code":"cyclo_left_axis","field_label":"OS Axis","field_type":"number","config":{"min":0,"max":180},"is_required":false,"display_order":8,"width":"third"}]}]}',
   10, false,
   '{"icon":"Eye","color":"blue","banner_text":"Ophthalmology Documentation"}',
   'Ophthalmology progress note with ocular examination and cycloplegic refraction fields')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- 26. SEED: Accident & Emergency (A&E) Template
-- =============================================================================

INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('ae_progress_doctor', 'A&E Progress Note', 'progress_note',
   'A&E', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"emergency_assessment","section_name":"Emergency Assessment","display_order":1,"is_required":false,"is_collapsible":false,"default_expanded":true,"fields":[{"field_code":"triage_category","field_label":"Triage Category","field_type":"radio","config":{"options":[{"value":"red","label":"Red â€” Immediate/Resuscitation"},{"value":"orange","label":"Orange â€” Very Urgent"},{"value":"yellow","label":"Yellow â€” Urgent"},{"value":"green","label":"Green â€” Standard"},{"value":"blue","label":"Blue â€” Non-Urgent"}]},"is_required":true,"display_order":1,"width":"full"},{"field_code":"presenting_complaint","field_label":"Presenting Complaint","field_type":"text","config":{},"placeholder":"Chief complaint","is_required":true,"display_order":2,"width":"full"},{"field_code":"mechanism_of_injury","field_label":"Mechanism of Injury","field_type":"select","config":{"options":[{"value":"not_applicable","label":"Not applicable (medical)"},{"value":"rta","label":"Road traffic accident"},{"value":"fall","label":"Fall"},{"value":"assault","label":"Assault"},{"value":"burn","label":"Burn"},{"value":"poisoning","label":"Poisoning/Ingestion"},{"value":"penetrating","label":"Penetrating injury"},{"value":"other","label":"Other trauma"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"gcs_total","field_label":"GCS Total","field_type":"number","config":{"min":3,"max":15},"is_required":false,"display_order":4,"width":"half"},{"field_code":"airway","field_label":"Airway","field_type":"select","config":{"options":[{"value":"patent","label":"Patent"},{"value":"compromised","label":"Compromised"},{"value":"obstructed","label":"Obstructed"},{"value":"intubated","label":"Intubated"},{"value":"tracheostomy","label":"Tracheostomy"}]},"is_required":false,"display_order":5,"width":"third"},{"field_code":"breathing","field_label":"Breathing","field_type":"select","config":{"options":[{"value":"normal","label":"Normal"},{"value":"tachypnoea","label":"Tachypnoea"},{"value":"laboured","label":"Laboured"},{"value":"shallow","label":"Shallow"},{"value":"apnoeic","label":"Apnoeic"},{"value":"ventilated","label":"Mechanically ventilated"}]},"is_required":false,"display_order":6,"width":"third"},{"field_code":"circulation","field_label":"Circulation","field_type":"select","config":{"options":[{"value":"stable","label":"Haemodynamically stable"},{"value":"tachycardic","label":"Tachycardic"},{"value":"hypotensive","label":"Hypotensive"},{"value":"shock","label":"Shock"},{"value":"cardiac_arrest","label":"Cardiac arrest"}]},"is_required":false,"display_order":7,"width":"third"},{"field_code":"disability","field_label":"Disability (Neuro)","field_type":"select","config":{"options":[{"value":"alert","label":"Alert (A)"},{"value":"voice","label":"Responds to Voice (V)"},{"value":"pain","label":"Responds to Pain (P)"},{"value":"unresponsive","label":"Unresponsive (U)"}]},"is_required":false,"display_order":8,"width":"half"},{"field_code":"exposure_findings","field_label":"Exposure / Key Findings","field_type":"textarea","config":{"rows":3},"placeholder":"Additional findings on exposure, rashes, wounds, temperature...","is_required":false,"display_order":9,"width":"full"}]}]}',
   15, false,
   '{"icon":"AlertTriangle","color":"red","banner_text":"Accident & Emergency Assessment"}',
   'A&E progress note with triage, ABC, and emergency assessment fields'),

  ('ae_progress_nurse', 'A&E Nursing Assessment', 'progress_note',
   'A&E', 'Nurse',
   '["objective","notes"]',
   '{"sections":[{"section_code":"ae_nursing","section_name":"A&E Nursing Assessment","display_order":1,"is_required":false,"is_collapsible":false,"default_expanded":true,"fields":[{"field_code":"triage_category","field_label":"Triage Category","field_type":"radio","config":{"options":[{"value":"red","label":"Red â€” Immediate"},{"value":"orange","label":"Orange â€” Very Urgent"},{"value":"yellow","label":"Yellow â€” Urgent"},{"value":"green","label":"Green â€” Standard"},{"value":"blue","label":"Blue â€” Non-Urgent"}]},"is_required":true,"display_order":1,"width":"full"},{"field_code":"presenting_complaint","field_label":"Presenting Complaint","field_type":"text","config":{},"placeholder":"Chief complaint","is_required":true,"display_order":2,"width":"full"},{"field_code":"pain_score","field_label":"Pain Score","field_type":"scale","config":{"scale_min":0,"scale_max":10,"scale_labels":["No Pain","Mild","Moderate","Severe","Worst"]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"avpu","field_label":"AVPU Status","field_type":"radio","config":{"options":[{"value":"alert","label":"Alert"},{"value":"voice","label":"Voice"},{"value":"pain","label":"Pain"},{"value":"unresponsive","label":"Unresponsive"}]},"is_required":false,"display_order":4,"width":"half"},{"field_code":"interventions","field_label":"Nursing Interventions","field_type":"checkbox_group","config":{"options":[{"value":"iv_access","label":"IV access obtained"},{"value":"bloods_taken","label":"Bloods taken"},{"value":"ecg_done","label":"ECG done"},{"value":"catheter","label":"Catheter inserted"},{"value":"wound_care","label":"Wound care given"},{"value":"splint","label":"Splint applied"},{"value":"analgesia","label":"Analgesia given"},{"value":"oxygen","label":"Oxygen applied"}],"columns":4},"is_required":false,"display_order":5,"width":"full"}]}]}',
   15, false,
   '{"icon":"AlertTriangle","color":"red","banner_text":"A&E Nursing Triage & Assessment"}',
   'A&E nursing assessment with triage and initial interventions')
ON CONFLICT (template_key) DO NOTHING;

-- Psychiatry (PSY)
INSERT INTO public.clinical_note_templates (template_key, display_name, note_type, specialty_code, role, base_fields, schema_json, priority, is_default, ui_config, description)
VALUES
  ('psychiatry_progress_doctor', 'Psychiatry Progress Note', 'progress_note',
   'PSY', 'Doctor',
   '["subjective","objective","assessment","plan"]',
   '{"sections":[{"section_code":"mental_status","section_name":"Mental Status Examination","display_order":1,"is_required":false,"is_collapsible":true,"default_expanded":true,"fields":[{"field_code":"appearance","field_label":"Appearance & Behaviour","field_type":"textarea","config":{"rows":2},"is_required":false,"display_order":1,"width":"full"},{"field_code":"mood","field_label":"Mood","field_type":"select","config":{"options":[{"value":"euthymic","label":"Euthymic"},{"value":"depressed","label":"Depressed"},{"value":"anxious","label":"Anxious"},{"value":"irritable","label":"Irritable"},{"value":"elated","label":"Elated"},{"value":"labile","label":"Labile"}]},"is_required":false,"display_order":2,"width":"half"},{"field_code":"affect","field_label":"Affect","field_type":"select","config":{"options":[{"value":"congruent","label":"Congruent"},{"value":"flat","label":"Flat"},{"value":"blunted","label":"Blunted"},{"value":"restricted","label":"Restricted"},{"value":"inappropriate","label":"Inappropriate"}]},"is_required":false,"display_order":3,"width":"half"},{"field_code":"thought_content","field_label":"Thought Content","field_type":"textarea","config":{"rows":2},"is_required":false,"display_order":4,"width":"full"},{"field_code":"suicidal_ideation","field_label":"Suicidal / Self-harm Ideation","field_type":"radio","config":{"options":[{"value":"none","label":"None"},{"value":"passive","label":"Passive ideation"},{"value":"active_no_plan","label":"Active â€” no plan"},{"value":"active_with_plan","label":"Active â€” with plan"}]},"is_required":true,"display_order":5,"width":"full"},{"field_code":"insight_judgment","field_label":"Insight & Judgment","field_type":"select","config":{"options":[{"value":"good","label":"Good"},{"value":"fair","label":"Fair"},{"value":"poor","label":"Poor"}]},"is_required":false,"display_order":6,"width":"half"},{"field_code":"medication_compliance","field_label":"Medication Compliance","field_type":"select","config":{"options":[{"value":"good","label":"Good"},{"value":"partial","label":"Partial"},{"value":"poor","label":"Poor"},{"value":"unknown","label":"Unknown"}]},"is_required":false,"display_order":7,"width":"half"}]}]}',
   10, false,
   '{"icon":"Brain","color":"violet","banner_text":"Psychiatry/Neuropsychiatry Documentation"}',
   'Psychiatry progress note with mental status examination')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- Done. All specialty templates seeded.
-- The architecture supports infinite extensibility without schema changes.
-- =============================================================================
