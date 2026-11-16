-- Migration 140: Update existing clinics and add missing specialty clinics
-- Cross-references specialty modules in getSpecialtyQueueLocation() with clinics table
--
-- EXISTING CLINICS (25):
--   CLN-001 General Out-Patient (GOP), CLN-002 Medical Out-Patient (MOP),
--   CLN-003 Surgical Out-Patient (SOP), CLN-004 Paediatrics (PED),
--   CLN-005 Obstetrics & Gynaecology (OBG), CLN-006 Dental Clinic (DEN),
--   CLN-007 Eye Clinic (EYE), CLN-008 ENT Clinic (ENT),
--   CLN-009 Orthopaedic Clinic (ORT), CLN-010 Psychiatry (PSY),
--   CLN-011 Antenatal Clinic (ANC), CLN-012 Immunization Clinic (IMM),
--   CLN-013 Family Planning (FPL), CLN-014 Physiotherapy (PHY),
--   CLN-015 Skin Clinic (SKN), CLN-016 Cardiology Clinic (CAR),
--   CLN-017 Neurology Clinic (NEU), CLN-018 Oncology Clinic (ONC),
--   CLN-019 Nephrology Clinic (NEP), CLN-020 Urology Clinic (URO),
--   CLN-021 Gastroenterology Clinic (GAS), CLN-022 Endocrinology Clinic (END),
--   CLN-023 Rheumatology Clinic (RHE), CLN-024 Pulmonology Clinic (PUL),
--   CLN-025 Infectious Disease Clinic (INF)
--
-- MISSING SPECIALTY CLINICS (from code getSpecialtyQueueLocation):
--   Neurosurgery, Neuropsychiatry, Oral & Maxillofacial,
--   Plastic Surgery, General Surgery
--
-- FIXES:
--   CLN-007 (Eye Clinic) NHIS fees are 0 → set proper fees
--   CLN-008 (ENT Clinic) NHIS fees are 0 → set proper fees

BEGIN;

-- ============================================================
-- 1. Fix NHIS fees for Eye Clinic (CLN-007) and ENT Clinic (CLN-008)
--    They currently have nhis fees = 0.00
-- ============================================================

UPDATE public.clinics
SET
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-007';

UPDATE public.clinics
SET
    nhis_consultation_fee = 700.00,
    nhis_follow_up_fee = 350.00,
    nhis_emergency_fee = 1400.00,
    updated_at = NOW()
WHERE clinic_id = 'CLN-008';

-- ============================================================
-- 2. Add missing specialty clinics
--    Using ON CONFLICT on clinic_id to be idempotent
-- ============================================================

-- CLN-026: Neurosurgery Clinic
INSERT INTO public.clinics (
    id, clinic_id, clinic_name, clinic_code, description,
    consultation_fee, follow_up_fee, emergency_fee,
    is_active, created_at, updated_at,
    nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee
) VALUES (
    extensions.uuid_generate_v4(), 'CLN-026', 'Neurosurgery Clinic', 'NSG',
    'Brain and spinal cord surgical services',
    2500.00, 1200.00, 5000.00,
    true, NOW(), NOW(),
    1750.00, 840.00, 3500.00
) ON CONFLICT (clinic_id) DO NOTHING;

-- CLN-027: Neuropsychiatry Clinic
INSERT INTO public.clinics (
    id, clinic_id, clinic_name, clinic_code, description,
    consultation_fee, follow_up_fee, emergency_fee,
    is_active, created_at, updated_at,
    nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee
) VALUES (
    extensions.uuid_generate_v4(), 'CLN-027', 'Neuropsychiatry Clinic', 'NPY',
    'Neurological and psychiatric disorders services',
    2000.00, 1000.00, 4000.00,
    true, NOW(), NOW(),
    1400.00, 700.00, 2800.00
) ON CONFLICT (clinic_id) DO NOTHING;

-- CLN-028: Oral & Maxillofacial Clinic
INSERT INTO public.clinics (
    id, clinic_id, clinic_name, clinic_code, description,
    consultation_fee, follow_up_fee, emergency_fee,
    is_active, created_at, updated_at,
    nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee
) VALUES (
    extensions.uuid_generate_v4(), 'CLN-028', 'Oral & Maxillofacial Clinic', 'OMF',
    'Oral and maxillofacial surgery and treatment services',
    2000.00, 1000.00, 4000.00,
    true, NOW(), NOW(),
    1400.00, 700.00, 2800.00
) ON CONFLICT (clinic_id) DO NOTHING;

-- CLN-029: Plastic Surgery Clinic
INSERT INTO public.clinics (
    id, clinic_id, clinic_name, clinic_code, description,
    consultation_fee, follow_up_fee, emergency_fee,
    is_active, created_at, updated_at,
    nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee
) VALUES (
    extensions.uuid_generate_v4(), 'CLN-029', 'Plastic Surgery Clinic', 'PLS',
    'Reconstructive and plastic surgery services',
    2500.00, 1200.00, 5000.00,
    true, NOW(), NOW(),
    1750.00, 840.00, 3500.00
) ON CONFLICT (clinic_id) DO NOTHING;

-- CLN-030: General Surgery Clinic
INSERT INTO public.clinics (
    id, clinic_id, clinic_name, clinic_code, description,
    consultation_fee, follow_up_fee, emergency_fee,
    is_active, created_at, updated_at,
    nhis_consultation_fee, nhis_follow_up_fee, nhis_emergency_fee
) VALUES (
    extensions.uuid_generate_v4(), 'CLN-030', 'General Surgery Clinic', 'GSG',
    'General surgical consultation and outpatient services',
    1500.00, 750.00, 3000.00,
    true, NOW(), NOW(),
    1050.00, 525.00, 2100.00
) ON CONFLICT (clinic_id) DO NOTHING;

-- NOTE: clinics_clinic_id_key UNIQUE constraint already exists on clinic_id
-- ON CONFLICT (clinic_id) DO NOTHING ensures idempotent execution

-- ============================================================
-- Summary of changes:
-- ============================================================
-- UPDATED:
--   CLN-007 Eye Clinic: NHIS fees 0→700/350/1400
--   CLN-008 ENT Clinic: NHIS fees 0→700/350/1400
--
-- ADDED:
--   CLN-026 Neurosurgery Clinic (NSG) - 2500/1200/5000
--   CLN-027 Neuropsychiatry Clinic (NPY) - 2000/1000/4000
--   CLN-028 Oral & Maxillofacial Clinic (OMF) - 2000/1000/4000
--   CLN-029 Plastic Surgery Clinic (PLS) - 2500/1200/5000
--   CLN-030 General Surgery Clinic (GSG) - 1500/750/3000
--
-- TOTAL: 30 clinics after migration
-- ============================================================

COMMIT;
