-- ===========================================================================
-- Migration: Add Missing NHIS Approval Fields to procedure_requests
-- 
-- The procedure_requests table is missing the standard NHIS approval fields
-- that other request tables (lab_requests, radiology_requests, prescriptions) have.
-- This migration adds: approved_by, approved_at, review_notes, nhis_approval_status
-- ===========================================================================

-- 1. Add approved_by column (references staff.id for who approved the NHIS request)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN approved_by uuid REFERENCES staff(id);
    
    COMMENT ON COLUMN public.procedure_requests.approved_by IS 
      'Staff member who approved the NHIS request';
  END IF;
END $$;

-- 2. Add approved_at column (timestamp of NHIS approval)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN approved_at timestamp with time zone;
    
    COMMENT ON COLUMN public.procedure_requests.approved_at IS 
      'Timestamp when NHIS approval was granted';
  END IF;
END $$;

-- 3. Add review_notes column (notes from NHIS reviewer including auth codes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN review_notes text;
    
    COMMENT ON COLUMN public.procedure_requests.review_notes IS 
      'NHIS review notes including authorization codes in format [AUTH CODE: xxx]';
  END IF;
END $$;

-- 4. Add nhis_approval_status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN nhis_approval_status character varying(20) DEFAULT 'not_required';
    
    COMMENT ON COLUMN public.procedure_requests.nhis_approval_status IS 
      'NHIS approval status: not_required, pending, approved, rejected, expired, provisional';
  END IF;
END $$;

-- 5. Add estimated_cost column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'estimated_cost'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN estimated_cost numeric(12,2) DEFAULT 0;
    
    COMMENT ON COLUMN public.procedure_requests.estimated_cost IS 
      'Estimated cost of the procedure';
  END IF;
END $$;

-- 6. Add id column as alias for request_id (for consistency with other tables)
-- Note: We can't add 'id' as it would conflict, so we'll use request_id in queries
-- But we need to ensure the API uses request_id for procedure_requests

-- 7. Create indexes for NHIS approval queries
CREATE INDEX IF NOT EXISTS idx_procedure_requests_approved_by 
  ON public.procedure_requests(approved_by) 
  WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_procedure_requests_approved_at 
  ON public.procedure_requests(approved_at) 
  WHERE approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_procedure_requests_nhis_status 
  ON public.procedure_requests(nhis_approval_status);

-- 8. Add check constraint for nhis_approval_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'procedure_requests_nhis_approval_status_check'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD CONSTRAINT procedure_requests_nhis_approval_status_check 
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired', 'provisional'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 9. Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 108: Added NHIS approval fields to procedure_requests table';
END $$;
