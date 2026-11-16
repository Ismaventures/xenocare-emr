-- =============================================================================
-- Migration 127: Seed Specialty Templates
-- =============================================================================
-- Seeds all 17 specialty templates into the database
-- These templates match the TypeScript definitions in specialty-templates.ts
-- =============================================================================

-- =============================================================================
-- 1. Insert Specialty Templates Master Records
-- =============================================================================

INSERT INTO public.specialty_templates (specialty_code, specialty_name, description, opd_type, icon_name, color_class, is_active, display_order)
VALUES
  -- Core Specialty Templates (fully configured)
  ('CARDIOLOGY', 'Cardiology', 'Comprehensive cardiac examination including chest pain assessment, cardiac history, and cardiovascular system review', 'SOPD', 'Heart', 'red', true, 1),
  ('DERMATOLOGY', 'Dermatology', 'Skin examination including lesion assessment, dermatological history, and skin condition evaluation', 'SOPD', 'Scan', 'amber', true, 2),
  ('ORTHOPAEDICS', 'Orthopaedics', 'Musculoskeletal examination including joint assessment, bone evaluation, and mobility testing', 'SOPD', 'Bone', 'orange', true, 3),
  ('ENT', 'ENT (Ear, Nose, Throat)', 'Otolaryngological examination of ear, nose, throat, and related structures', 'SOPD', 'Ear', 'teal', true, 4),
  ('UROLOGY', 'Urology', 'Urological examination including kidney, bladder, and reproductive system assessment', 'SOPD', 'Droplet', 'yellow', true, 5),
  ('NEUROLOGY', 'Neurology', 'Neurological examination including cranial nerves, motor function, sensory testing, and reflexes', 'SOPD', 'Sparkles', 'indigo', true, 6),
  ('NEUROPSYCHIATRY', 'Neuropsychiatry', 'Combined neurological and psychiatric assessment for conditions affecting brain function and behavior', 'SOPD', 'HeartPulse', 'violet', true, 7),
  ('GASTROENTEROLOGY', 'Gastroenterology', 'Gastrointestinal examination including abdominal assessment, digestive system review', 'SOPD', 'Layers', 'orange', true, 8),
  ('NEPHROLOGY', 'Nephrology', 'Renal system examination including kidney function, fluid balance, and electrolyte assessment', 'SOPD', 'Filter', 'cyan', true, 9),
  ('PAEDIATRICS', 'Paediatrics', 'Pediatric examination including developmental assessment, growth monitoring, and age-appropriate evaluation', 'SOPD', 'Baby', 'pink', true, 10),
  ('NEUROSURGERY', 'Neurosurgery', 'Neurosurgical assessment for conditions requiring surgical intervention of the nervous system', 'SOPD', 'Brain', 'purple', true, 11),
  ('GENERAL_SURGERY', 'General Surgery', 'Surgical assessment including pre-operative evaluation, wound assessment, and surgical planning', 'SOPD', 'Scissors', 'slate', true, 12),
  ('GYNAECOLOGY', 'Gynaecology', 'Gynaecological examination including reproductive health, menstrual history, and pelvic assessment', 'SOPD', 'Users', 'rose', true, 13),
  ('ORAL_MAXILLOFACIAL', 'Oral & Maxillofacial Surgery', 'Examination of oral cavity, jaw, and facial structures for surgical intervention', 'SOPD', 'Smile', 'amber', true, 14),
  ('PULMONOLOGY', 'Pulmonology', 'Respiratory examination including lung function, breathing assessment, and pulmonary history', 'SOPD', 'Wind', 'sky', true, 15),
  ('ENDOCRINOLOGY', 'Endocrinology', 'Endocrine system examination including thyroid, diabetes, and hormonal assessment', 'SOPD', 'Activity', 'emerald', true, 16),
  ('PLASTIC_SURGERY', 'Plastic Surgery', 'Reconstructive and aesthetic surgery assessment including wound, scar, burn, and functional evaluation', 'SOPD', 'Fingerprint', 'fuchsia', true, 17)
ON CONFLICT (specialty_code) DO UPDATE SET
  specialty_name = EXCLUDED.specialty_name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================================================
-- 2. Add additional support templates (Ophthalmology, Physiotherapy)
-- =============================================================================

INSERT INTO public.specialty_templates (specialty_code, specialty_name, description, opd_type, icon_name, color_class, is_active, display_order)
VALUES
  ('OPHTHALMOLOGY', 'Ophthalmology', 'Eye examination including visual acuity, fundoscopy, and ocular assessment', 'SOPD', 'Eye', 'blue', true, 18),
  ('PHYSIOTHERAPY', 'Physiotherapy', 'Physical therapy assessment including mobility, strength, and rehabilitation planning', 'SOPD', 'Dumbbell', 'lime', true, 19),
  ('DENTAL', 'Dental', 'Dental examination including oral health, dental conditions, and treatment planning', 'SOPD', 'Smile', 'cyan', true, 20)
ON CONFLICT (specialty_code) DO UPDATE SET
  specialty_name = EXCLUDED.specialty_name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =============================================================================
-- 3. Create view for easy specialty template lookup
-- =============================================================================

CREATE OR REPLACE VIEW public.v_specialty_templates AS
SELECT 
  id,
  specialty_code,
  specialty_name,
  description,
  opd_type,
  icon_name,
  color_class,
  is_active,
  display_order,
  created_at,
  updated_at
FROM public.specialty_templates
WHERE is_active = true
ORDER BY display_order;

COMMENT ON VIEW public.v_specialty_templates IS 'Active specialty templates for consultation wizards';

-- Grant access to the view
GRANT SELECT ON public.v_specialty_templates TO authenticated;

-- =============================================================================
-- 4. Create function to get specialty template by code with department info
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_specialty_with_department(p_specialty_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'specialty', jsonb_build_object(
      'id', st.id,
      'specialty_code', st.specialty_code,
      'specialty_name', st.specialty_name,
      'description', st.description,
      'icon_name', st.icon_name,
      'color_class', st.color_class,
      'opd_type', st.opd_type
    ),
    'department', CASE 
      WHEN d.id IS NOT NULL THEN jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'code', d.code,
        'opd_type', d.opd_type
      )
      ELSE NULL
    END
  ) INTO v_result
  FROM public.specialty_templates st
  LEFT JOIN public.departments d ON UPPER(d.name) LIKE '%' || st.specialty_code || '%'
    OR st.specialty_code LIKE '%' || UPPER(d.code) || '%'
  WHERE st.specialty_code = p_specialty_code
  AND st.is_active = true
  LIMIT 1;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_specialty_with_department TO authenticated;

-- =============================================================================
-- 5. Add specialty_source to consultations for tracking template origin
-- =============================================================================

-- Add column to track if specialty data came from wizard or imported
ALTER TABLE public.consultations
ADD COLUMN IF NOT EXISTS specialty_source VARCHAR(20) DEFAULT 'wizard'
CHECK (specialty_source IN ('wizard', 'imported', 'migration', 'api'));

COMMENT ON COLUMN public.consultations.specialty_source IS 'Source of specialty data: wizard (UI), imported, migration, or api';

-- =============================================================================
-- 6. Index for specialty template queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_specialty_templates_active_order 
ON public.specialty_templates(is_active, display_order) 
WHERE is_active = true;

-- =============================================================================
-- 7. Summary count
-- =============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.specialty_templates WHERE is_active = true;
  RAISE NOTICE 'Specialty Templates seeded: % active templates', v_count;
END;
$$;
