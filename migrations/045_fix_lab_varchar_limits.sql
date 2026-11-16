-- Migration: Fix lab tables varchar(255) limits for longer text fields
-- Date: 2026-01-30
-- Issue: "value too long for type character varying(255)" error when entering lab results

-- Change methodology from varchar(255) to TEXT in lab_requests
ALTER TABLE public.lab_requests 
  ALTER COLUMN methodology TYPE TEXT;

-- Change methodology from varchar(255) to TEXT in lab_results (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_results' 
    AND column_name = 'methodology'
  ) THEN
    ALTER TABLE public.lab_results ALTER COLUMN methodology TYPE TEXT;
  END IF;
END $$;

-- Verify lab_results.interpretation is TEXT (should already be, but ensure)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_results' 
    AND column_name = 'interpretation'
    AND data_type != 'text'
  ) THEN
    ALTER TABLE public.lab_results ALTER COLUMN interpretation TYPE TEXT;
  END IF;
END $$;

-- Verify lab_results.comments is TEXT (should already be)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_results' 
    AND column_name = 'comments'
    AND data_type != 'text'
  ) THEN
    ALTER TABLE public.lab_results ALTER COLUMN comments TYPE TEXT;
  END IF;
END $$;

-- Verify lab_requests.result_notes is TEXT (should already be)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_requests' 
    AND column_name = 'result_notes'
    AND data_type != 'text'
  ) THEN
    ALTER TABLE public.lab_requests ALTER COLUMN result_notes TYPE TEXT;
  END IF;
END $$;

-- Verify lab_requests.interpretation is TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_requests' 
    AND column_name = 'interpretation'
    AND data_type != 'text'
  ) THEN
    ALTER TABLE public.lab_requests ALTER COLUMN interpretation TYPE TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.lab_requests.methodology IS 'Test methodology - changed to TEXT to allow longer descriptions';
COMMENT ON COLUMN public.lab_results.methodology IS 'Test methodology - changed to TEXT to allow longer descriptions';
