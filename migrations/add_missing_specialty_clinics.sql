-- ============================================================================
-- Migration: Add Missing Specialty Clinics
-- Date: 2025-01-22
-- Updated: 2026-03-03
-- Description: Adds commonly needed specialty clinics that were missing from
--              the initial seed data. Also includes clinics for specialties
--              that have consultation templates but no matching clinic record.
--              Now also includes CLN-021 to CLN-025 which were missing from
--              live database.
-- ============================================================================

-- Use ON CONFLICT to make this migration idempotent (safe to re-run)

-- ==========================================
-- CLN-021 to CLN-025 (Missing from live DB)
-- ==========================================

-- Gastroenterology Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-021', 'Gastroenterology Clinic', 'GAS',
  'Digestive system services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Endocrinology Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-022', 'Endocrinology Clinic', 'END',
  'Hormone and metabolic services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Rheumatology Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-023', 'Rheumatology Clinic', 'RHE',
  'Joint and autoimmune services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Pulmonology Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-024', 'Pulmonology Clinic', 'PUL',
  'Lung and respiratory services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Infectious Disease Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-025', 'Infectious Disease Clinic', 'INF',
  'Infectious disease management',
  1200.00, 600.00, 2500.00, 840.00, 420.00, 1750.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- ==========================================
-- CLN-031 to CLN-050 (New specialty clinics)
-- ==========================================

-- Haematology Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-031', 'Haematology Clinic', 'HAE',
  'Blood disorders and haematology services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Chest/TB Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-032', 'Chest Clinic', 'CHE',
  'Chest, TB, and respiratory infection services',
  1200.00, 600.00, 2500.00, 840.00, 420.00, 1750.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Retroviral/ART/HIV Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-033', 'Retroviral Clinic', 'ART',
  'HIV/AIDS antiretroviral therapy and management services',
  800.00, 400.00, 1500.00, 560.00, 280.00, 1050.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Paediatric Surgery Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-034', 'Paediatric Surgery Clinic', 'PDS',
  'Paediatric surgical consultation and outpatient services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Neonatology / SCBU Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-035', 'Neonatology Clinic', 'NEO',
  'Neonatal and Special Care Baby Unit outpatient services',
  1200.00, 600.00, 2500.00, 840.00, 420.00, 1750.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Cardiothoracic Surgery Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-036', 'Cardiothoracic Surgery Clinic', 'CTS',
  'Heart and thoracic surgical consultation services',
  2500.00, 1200.00, 5000.00, 1750.00, 840.00, 3500.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Well Baby / Child Welfare Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-037', 'Well Baby Clinic', 'WBC',
  'Child welfare and well-baby check-up services',
  300.00, 200.00, 500.00, 210.00, 140.00, 350.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Post-Natal Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-038', 'Post-Natal Clinic', 'PNC',
  'Post-natal care and follow-up services',
  800.00, 400.00, 1500.00, 560.00, 280.00, 1050.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Fertility / IVF Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-039', 'Fertility Clinic', 'FER',
  'Fertility, IVF, and reproductive medicine services',
  2000.00, 1000.00, 4000.00, 1400.00, 700.00, 2800.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Accident & Emergency (A&E) Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-040', 'Accident & Emergency', 'A&E',
  'Emergency and accident triage and treatment services',
  2000.00, 1000.00, 5000.00, 1400.00, 700.00, 3500.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Pain Management Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-041', 'Pain Management Clinic', 'PMC',
  'Pain management and anaesthesia outpatient services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Nutrition / Dietetics Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-042', 'Nutrition & Dietetics Clinic', 'NUT',
  'Nutrition counselling and dietetics services',
  500.00, 300.00, 800.00, 350.00, 210.00, 560.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Radiology Clinic (outpatient consultation)
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-043', 'Radiology Clinic', 'RAD',
  'Radiology consultation and interventional radiology services',
  1500.00, 750.00, 3000.00, 1050.00, 525.00, 2100.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Vascular Surgery Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-044', 'Vascular Surgery Clinic', 'VAS',
  'Vascular and peripheral vascular surgery services',
  2000.00, 1000.00, 4000.00, 1400.00, 700.00, 2800.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Occupational Therapy Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-045', 'Occupational Therapy Clinic', 'OCC',
  'Occupational therapy and rehabilitation services',
  1000.00, 500.00, 1500.00, 700.00, 350.00, 1050.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Speech Therapy Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-046', 'Speech Therapy Clinic', 'SPT',
  'Speech and language therapy services',
  1000.00, 500.00, 1500.00, 700.00, 350.00, 1050.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Geriatric Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-047', 'Geriatric Clinic', 'GER',
  'Elderly care and geriatric medicine services',
  1000.00, 500.00, 2000.00, 700.00, 350.00, 1400.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Oncology Surgery Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-048', 'Oncology Surgery Clinic', 'ONS',
  'Surgical oncology consultation services',
  2500.00, 1200.00, 5000.00, 1750.00, 840.00, 3500.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Burns & Trauma Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-049', 'Burns & Trauma Clinic', 'BNT',
  'Burns care and trauma outpatient services',
  2000.00, 1000.00, 4000.00, 1400.00, 700.00, 2800.00, true
) ON CONFLICT (clinic_id) DO NOTHING;

-- Nuclear Medicine Clinic
INSERT INTO public.clinics (id, clinic_id, clinic_name, clinic_code, description, consultation_fee, follow_up_fee, emergency_fee, nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee, is_active)
VALUES (
  extensions.uuid_generate_v4(), 'CLN-050', 'Nuclear Medicine Clinic', 'NUC',
  'Nuclear medicine diagnostic and therapy services',
  2500.00, 1200.00, 5000.00, 1750.00, 840.00, 3500.00, true
) ON CONFLICT (clinic_id) DO NOTHING;
