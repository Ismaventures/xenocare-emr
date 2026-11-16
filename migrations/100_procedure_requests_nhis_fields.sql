-- =============================================================================
-- Migration: Add Missing NHIS Fields to procedure_requests
-- Ensures procedure_requests has the same NHIS workflow fields as other request tables
-- =============================================================================

-- Add payer_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'payer_type'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN payer_type character varying(20) DEFAULT 'private'::character varying;
    
    -- Add check constraint
    ALTER TABLE public.procedure_requests 
    ADD CONSTRAINT procedure_requests_payer_type_check 
    CHECK (payer_type IN ('private', 'nhis', 'retainership', 'military_free'));
    
    COMMENT ON COLUMN public.procedure_requests.payer_type IS 
      'Payment type: private, nhis, retainership, military_free';
  END IF;
END $$;

-- Add requires_nhis_verification column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'requires_nhis_verification'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN requires_nhis_verification boolean DEFAULT false;
    
    COMMENT ON COLUMN public.procedure_requests.requires_nhis_verification IS 
      'Whether this procedure requires NHIS verification before processing';
  END IF;
END $$;

-- Add nhis_approval_id column (for linking to nhis_authorizations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'nhis_approval_id'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN nhis_approval_id uuid;
    
    COMMENT ON COLUMN public.procedure_requests.nhis_approval_id IS 
      'Reference to nhis_authorizations table for approved requests';
  END IF;
END $$;

-- Add billing_release_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'billing_release_status'
  ) THEN
    -- Check if enum type exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_release_status') THEN
      CREATE TYPE public.billing_release_status AS ENUM ('blocked', 'released', 'pending_verification');
    END IF;
    
    ALTER TABLE public.procedure_requests 
    ADD COLUMN billing_release_status public.billing_release_status DEFAULT 'blocked'::public.billing_release_status;
    
    COMMENT ON COLUMN public.procedure_requests.billing_release_status IS 
      'Billing release status: blocked, released, pending_verification';
  END IF;
END $$;

-- Add execution_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'execution_status'
  ) THEN
    -- Check if enum type exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_execution_status') THEN
      CREATE TYPE public.service_execution_status AS ENUM ('draft', 'ordered', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    ALTER TABLE public.procedure_requests 
    ADD COLUMN execution_status public.service_execution_status DEFAULT 'draft'::public.service_execution_status;
    
    COMMENT ON COLUMN public.procedure_requests.execution_status IS 
      'Execution status: draft, ordered, in_progress, completed, cancelled';
  END IF;
END $$;

-- Add released_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'released_by'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN released_by uuid;
    
    COMMENT ON COLUMN public.procedure_requests.released_by IS 
      'User who released this request for billing/processing';
  END IF;
END $$;

-- Add released_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'released_at'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN released_at timestamp with time zone;
    
    COMMENT ON COLUMN public.procedure_requests.released_at IS 
      'Timestamp when request was released for billing/processing';
  END IF;
END $$;

-- Add patient_uuid column (for UUID-based joins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'patient_uuid'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN patient_uuid uuid;
    
    COMMENT ON COLUMN public.procedure_requests.patient_uuid IS 
      'Patient UUID for direct joins to patients.id';
  END IF;
END $$;

-- Add visit_uuid column (for UUID-based joins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'visit_uuid'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN visit_uuid uuid;
    
    COMMENT ON COLUMN public.procedure_requests.visit_uuid IS 
      'Visit UUID for direct joins to visits.id';
  END IF;
END $$;

-- Add ordered_by_uuid column (for UUID-based joins)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'ordered_by_uuid'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN ordered_by_uuid uuid;
    
    COMMENT ON COLUMN public.procedure_requests.ordered_by_uuid IS 
      'Ordering staff UUID for direct joins to staff.id';
  END IF;
END $$;

-- Add idempotency fields if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN idempotency_key character varying(255);
    
    ALTER TABLE public.procedure_requests 
    ADD COLUMN version integer DEFAULT 1 NOT NULL;
    
    ALTER TABLE public.procedure_requests 
    ADD COLUMN idempotency_created_at timestamp with time zone;
    
    ALTER TABLE public.procedure_requests 
    ADD COLUMN idempotency_hash character varying(64);
    
    ALTER TABLE public.procedure_requests 
    ADD COLUMN last_modified_by uuid;
  END IF;
END $$;

-- Create index for NHIS pending status
CREATE INDEX IF NOT EXISTS idx_procedure_requests_nhis_pending 
  ON public.procedure_requests(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

-- Create index for payer_type
CREATE INDEX IF NOT EXISTS idx_procedure_requests_payer_type 
  ON public.procedure_requests(payer_type);

-- Update existing procedure_requests to set payer_type based on patient insurance
-- This is a one-time backfill
DO $$
BEGIN
  UPDATE procedure_requests pr
  SET payer_type = CASE 
    WHEN LOWER(COALESCE(p.insurance_type::text, '')) LIKE '%nhis%' THEN 'nhis'
    ELSE 'private'
  END
  FROM patients p
  WHERE pr.patient_id = p.patient_id
  AND pr.payer_type IS NULL;
END $$;

SELECT 'Migration complete: Added missing NHIS workflow fields to procedure_requests' AS status;
