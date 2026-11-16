-- =============================================================================
-- Migration 130: Add missing foreign keys for lab_requests.test_id and
-- radiology_requests.imaging_id to their respective catalogue tables.
--
-- These FKs are required for Supabase PostgREST auto-joins to work.
-- Without them, queries like:
--   lab_requests?select=...,lab_test_catalogue(name)
--   radiology_requests?select=...,imaging_catalogue(modality)
-- return 400 errors.
-- =============================================================================

-- 1) lab_requests.test_id → lab_test_catalogue.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lab_requests_test_id_fkey'
      AND table_name = 'lab_requests'
  ) THEN
    ALTER TABLE public.lab_requests
      ADD CONSTRAINT lab_requests_test_id_fkey
      FOREIGN KEY (test_id) REFERENCES public.lab_test_catalogue(id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added FK lab_requests.test_id → lab_test_catalogue.id';
  ELSE
    RAISE NOTICE 'FK lab_requests_test_id_fkey already exists';
  END IF;
END $$;

-- 2) radiology_requests.imaging_id → imaging_catalogue.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'radiology_requests_imaging_id_fkey'
      AND table_name = 'radiology_requests'
  ) THEN
    ALTER TABLE public.radiology_requests
      ADD CONSTRAINT radiology_requests_imaging_id_fkey
      FOREIGN KEY (imaging_id) REFERENCES public.imaging_catalogue(id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added FK radiology_requests.imaging_id → imaging_catalogue.id';
  ELSE
    RAISE NOTICE 'FK radiology_requests_imaging_id_fkey already exists';
  END IF;
END $$;
