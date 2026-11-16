-- Migration: Add 'provisional' status to NHIS approval workflow
-- Date: 2026-02-03 
-- 
-- NOTE: This migration ONLY updates CHECK constraints on TEXT columns.
-- The ENUM type update is in migration 104a which must be run FIRST and committed separately.

-- Update CHECK constraints on request tables
-- We use a DO block to safely drop existing check constraints regardless of their auto-generated names

-- lab_requests
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'lab_requests' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.lab_requests DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.lab_requests 
ADD CONSTRAINT lab_requests_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- radiology_requests
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'radiology_requests' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.radiology_requests DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.radiology_requests 
ADD CONSTRAINT radiology_requests_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- prescriptions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'prescriptions' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.prescriptions DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.prescriptions 
ADD CONSTRAINT prescriptions_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- procedure_requests
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'procedure_requests' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.procedure_requests DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.procedure_requests 
ADD CONSTRAINT procedure_requests_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- dental_procedures
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'dental_procedures' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.dental_procedures DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.dental_procedures 
ADD CONSTRAINT dental_procedures_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- dental_prescriptions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'dental_prescriptions' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.dental_prescriptions DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.dental_prescriptions 
ADD CONSTRAINT dental_prescriptions_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- eye_exams
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'eye_exams' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.eye_exams DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.eye_exams 
ADD CONSTRAINT eye_exams_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- eye_prescriptions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'eye_prescriptions' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.eye_prescriptions DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.eye_prescriptions 
ADD CONSTRAINT eye_prescriptions_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));


-- eye_procedures
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT constraint_name 
             FROM information_schema.constraint_column_usage 
             WHERE table_name = 'eye_procedures' AND column_name = 'nhis_approval_status'
             AND constraint_name LIKE '%check%'
    LOOP
        EXECUTE 'ALTER TABLE public.eye_procedures DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.eye_procedures 
ADD CONSTRAINT eye_procedures_nhis_approval_status_check 
CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));

