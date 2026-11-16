-- =============================================================================
-- Migration: Add Accident & Emergency to specialty_departments and clinics
-- Enables A&E doctors to be registered with specialty_code = 'EMERGENCY'
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Add A&E to specialty_departments
-- =============================================================================

INSERT INTO specialty_departments (
  specialty_code, specialty_name, queue_department, referral_key,
  icon_name, color_class, requires_dedicated_queue, display_order, feature_flags
) VALUES (
  'EMERGENCY',
  'Accident & Emergency',
  'Emergency',
  'emergency',
  'Siren',
  'text-red-700',
  true,
  0,
  '{"has_triage": true, "has_primary_survey": true, "has_fluid_chart": true, "has_timeline": true}'::jsonb
)
ON CONFLICT (specialty_code) DO UPDATE SET
  specialty_name = EXCLUDED.specialty_name,
  queue_department = EXCLUDED.queue_department,
  referral_key = EXCLUDED.referral_key,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class,
  requires_dedicated_queue = EXCLUDED.requires_dedicated_queue,
  display_order = EXCLUDED.display_order,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = now();

-- =============================================================================
-- 2. Add A&E clinic to clinics table
-- =============================================================================

INSERT INTO public.clinics (
    id, clinic_id, clinic_name, clinic_code, description,
    consultation_fee, follow_up_fee, emergency_fee,
    is_active, created_at, updated_at,
    nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee
) VALUES (
    extensions.uuid_generate_v4(), 'CLN-031', 'Accident & Emergency', 'A&E',
    'Accident and Emergency Department - 24/7 emergency medical services',
    3000.00, 1500.00, 6000.00,
    true, NOW(), NOW(),
    2100.00, 1050.00, 4200.00
) ON CONFLICT (clinic_id) DO NOTHING;

COMMIT;
