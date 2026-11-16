-- =============================================================================
-- Migration: Enforce NHIS Pre-Authorization at Database Level
-- Prevents processing of services that require NHIS approval but haven't been approved
-- =============================================================================

-- =============================================================================
-- 1. Ensure nhis_approval_status column exists on all request tables
-- =============================================================================

-- Add to lab_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_requests' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.lab_requests 
    ADD COLUMN nhis_approval_status text DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.lab_requests.nhis_approval_status IS 
      'NHIS pre-authorization status: not_required, pending, approved, rejected, expired';
  END IF;
END $$;

-- Add to radiology_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'radiology_requests' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.radiology_requests 
    ADD COLUMN nhis_approval_status text DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.radiology_requests.nhis_approval_status IS 
      'NHIS pre-authorization status: not_required, pending, approved, rejected, expired';
  END IF;
END $$;

-- Add to prescriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prescriptions' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.prescriptions 
    ADD COLUMN nhis_approval_status text DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.prescriptions.nhis_approval_status IS 
      'NHIS pre-authorization status: not_required, pending, approved, rejected, expired';
  END IF;
END $$;

-- Add to procedure_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedure_requests' 
    AND column_name = 'nhis_approval_status'
  ) THEN
    ALTER TABLE public.procedure_requests 
    ADD COLUMN nhis_approval_status text DEFAULT 'not_required'
    CHECK (nhis_approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'expired'));
    
    COMMENT ON COLUMN public.procedure_requests.nhis_approval_status IS 
      'NHIS pre-authorization status: not_required, pending, approved, rejected, expired';
  END IF;
END $$;

-- =============================================================================
-- 2. Create function to check NHIS approval before allowing status transitions
-- =============================================================================

CREATE OR REPLACE FUNCTION check_nhis_approval_before_processing()
RETURNS TRIGGER AS $$
DECLARE
  blocked_statuses text[] := ARRAY['pending', 'rejected', 'expired'];
  processing_statuses text[];
BEGIN
  -- Define which statuses indicate "processing" for each table
  -- These are statuses that should be blocked if NHIS approval is pending/rejected/expired
  
  IF TG_TABLE_NAME = 'lab_requests' THEN
    processing_statuses := ARRAY['Sample Collected', 'Processing', 'Completed', 'Verified'];
  ELSIF TG_TABLE_NAME = 'radiology_requests' THEN
    processing_statuses := ARRAY['In Progress', 'Completed', 'Reported'];
  ELSIF TG_TABLE_NAME = 'prescriptions' THEN
    processing_statuses := ARRAY['Dispensed', 'Partially Dispensed'];
  ELSIF TG_TABLE_NAME = 'procedure_requests' THEN
    processing_statuses := ARRAY['In Progress', 'Completed'];
  ELSE
    -- Unknown table, allow the operation
    RETURN NEW;
  END IF;
  
  -- Check if trying to transition to a processing status
  -- Note: status might be an enum, cast to text for comparison
  IF NEW.status::text = ANY(processing_statuses) AND 
     (OLD.status IS NULL OR OLD.status::text <> NEW.status::text) THEN
    
    -- Check if NHIS approval is required but not granted
    -- Note: nhis_approval_status is an enum, cast to text for comparison
    IF NEW.nhis_approval_status::text = ANY(blocked_statuses) THEN
      RAISE EXCEPTION 'NHIS pre-authorization required: Cannot process this service. Current NHIS status: %. Please wait for NHIS desk approval.', 
        NEW.nhis_approval_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_nhis_approval_before_processing() IS 
  'Trigger function to enforce NHIS pre-authorization before allowing service processing';

-- =============================================================================
-- 3. Create triggers on each request table
-- =============================================================================

-- Lab Requests Trigger
DROP TRIGGER IF EXISTS enforce_nhis_approval_lab ON public.lab_requests;
CREATE TRIGGER enforce_nhis_approval_lab
  BEFORE UPDATE ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_nhis_approval_before_processing();

-- Radiology Requests Trigger
DROP TRIGGER IF EXISTS enforce_nhis_approval_radiology ON public.radiology_requests;
CREATE TRIGGER enforce_nhis_approval_radiology
  BEFORE UPDATE ON public.radiology_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_nhis_approval_before_processing();

-- Prescriptions Trigger
DROP TRIGGER IF EXISTS enforce_nhis_approval_pharmacy ON public.prescriptions;
CREATE TRIGGER enforce_nhis_approval_pharmacy
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_nhis_approval_before_processing();

-- Procedure Requests Trigger
DROP TRIGGER IF EXISTS enforce_nhis_approval_procedures ON public.procedure_requests;
CREATE TRIGGER enforce_nhis_approval_procedures
  BEFORE UPDATE ON public.procedure_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_nhis_approval_before_processing();

-- =============================================================================
-- 4. Create function to auto-set nhis_approval_status on INSERT
--    Based on whether the service requires NHIS pre-authorization
-- =============================================================================

CREATE OR REPLACE FUNCTION set_nhis_approval_status_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  requires_auth boolean := false;
  patient_is_nhis boolean := false;
  catalogue_table text;
  catalogue_id_field text;
  service_id uuid;
BEGIN
  -- Determine the catalogue table and ID field based on request table
  IF TG_TABLE_NAME = 'lab_requests' THEN
    catalogue_table := 'lab_test_catalogue';
    catalogue_id_field := 'id';
    service_id := NEW.test_id;
  ELSIF TG_TABLE_NAME = 'radiology_requests' THEN
    catalogue_table := 'imaging_catalogue';
    catalogue_id_field := 'id';
    service_id := NEW.imaging_id;
  ELSIF TG_TABLE_NAME = 'prescriptions' THEN
    catalogue_table := 'drug_catalogue';
    catalogue_id_field := 'id';
    service_id := NEW.drug_id;
  ELSIF TG_TABLE_NAME = 'procedure_requests' THEN
    catalogue_table := 'procedure_catalogue';
    catalogue_id_field := 'id';
    service_id := NEW.procedure_id;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Check if service requires NHIS authorization
  EXECUTE format(
    'SELECT COALESCE(requires_nhis_authorization, false) FROM %I WHERE %I = $1',
    catalogue_table, catalogue_id_field
  ) INTO requires_auth USING service_id;
  
  -- Check if patient is NHIS (has insurance_type containing 'nhis' or 'NHIS')
  -- Note: insurance_type is an ENUM, must cast to text for LIKE comparison
  IF NEW.patient_id IS NOT NULL THEN
    SELECT LOWER(COALESCE(insurance_type::text, '')) LIKE '%nhis%'
    INTO patient_is_nhis
    FROM patients
    WHERE patient_id = NEW.patient_id;
  END IF;
  
  -- Set nhis_approval_status based on requirements (cast to enum type)
  IF requires_auth AND COALESCE(patient_is_nhis, false) THEN
    NEW.nhis_approval_status := 'pending'::nhis_approval_status;
  ELSE
    NEW.nhis_approval_status := 'not_required'::nhis_approval_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_nhis_approval_status_on_insert() IS 
  'Automatically sets nhis_approval_status to pending for NHIS patients when service requires pre-auth';

-- =============================================================================
-- 5. Create INSERT triggers to auto-set status
-- =============================================================================

-- Lab Requests INSERT Trigger
DROP TRIGGER IF EXISTS set_nhis_status_lab_insert ON public.lab_requests;
CREATE TRIGGER set_nhis_status_lab_insert
  BEFORE INSERT ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_nhis_approval_status_on_insert();

-- Radiology Requests INSERT Trigger
DROP TRIGGER IF EXISTS set_nhis_status_radiology_insert ON public.radiology_requests;
CREATE TRIGGER set_nhis_status_radiology_insert
  BEFORE INSERT ON public.radiology_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_nhis_approval_status_on_insert();

-- Prescriptions INSERT Trigger
DROP TRIGGER IF EXISTS set_nhis_status_pharmacy_insert ON public.prescriptions;
CREATE TRIGGER set_nhis_status_pharmacy_insert
  BEFORE INSERT ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_nhis_approval_status_on_insert();

-- Procedure Requests INSERT Trigger
DROP TRIGGER IF EXISTS set_nhis_status_procedures_insert ON public.procedure_requests;
CREATE TRIGGER set_nhis_status_procedures_insert
  BEFORE INSERT ON public.procedure_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_nhis_approval_status_on_insert();

-- =============================================================================
-- 6. Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_lab_requests_nhis_status 
  ON public.lab_requests(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_radiology_requests_nhis_status 
  ON public.radiology_requests(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_prescriptions_nhis_status 
  ON public.prescriptions(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_procedure_requests_nhis_status 
  ON public.procedure_requests(nhis_approval_status) 
  WHERE nhis_approval_status = 'pending';

-- =============================================================================
-- 7. Create view for pending NHIS approvals (for NHIS desk queue)
-- =============================================================================

CREATE OR REPLACE VIEW nhis_pending_approvals AS
SELECT 
  'lab' as service_type,
  lr.request_id as service_id,
  lr.encounter_id,
  lr.patient_id,
  p.emr_number,
  p.first_name || ' ' || p.surname as patient_name,
  ltc.name as service_name,
  ltc.code as service_code,
  lr.nhis_approval_status::text as nhis_approval_status,
  lr.created_at as requested_at,
  lr.status::text as current_status
FROM lab_requests lr
JOIN patients p ON lr.patient_id = p.patient_id
LEFT JOIN lab_test_catalogue ltc ON lr.test_id = ltc.id
WHERE lr.nhis_approval_status::text = 'pending'

UNION ALL

SELECT 
  'radiology' as service_type,
  rr.request_id as service_id,
  rr.encounter_id,
  rr.patient_id,
  p.emr_number,
  p.first_name || ' ' || p.surname as patient_name,
  ic.name as service_name,
  ic.code as service_code,
  rr.nhis_approval_status::text as nhis_approval_status,
  rr.created_at as requested_at,
  rr.status::text as current_status
FROM radiology_requests rr
JOIN patients p ON rr.patient_id = p.patient_id
LEFT JOIN imaging_catalogue ic ON rr.imaging_id = ic.id
WHERE rr.nhis_approval_status::text = 'pending'

UNION ALL

SELECT 
  'pharmacy' as service_type,
  rx.prescription_id as service_id,
  rx.encounter_id,
  rx.patient_id,
  p.emr_number,
  p.first_name || ' ' || p.surname as patient_name,
  dc.name as service_name,
  dc.code as service_code,
  rx.nhis_approval_status::text as nhis_approval_status,
  rx.created_at as requested_at,
  rx.status::text as current_status
FROM prescriptions rx
JOIN patients p ON rx.patient_id = p.patient_id
LEFT JOIN drug_catalogue dc ON rx.drug_id = dc.id
WHERE rx.nhis_approval_status::text = 'pending'

UNION ALL

SELECT 
  'procedure' as service_type,
  pr.request_id as service_id,
  pr.encounter_id,
  pr.patient_id,
  p.emr_number,
  p.first_name || ' ' || p.surname as patient_name,
  pc.name as service_name,
  pc.code as service_code,
  pr.nhis_approval_status::text as nhis_approval_status,
  pr.created_at as requested_at,
  pr.status::text as current_status
FROM procedure_requests pr
JOIN patients p ON pr.patient_id = p.patient_id
LEFT JOIN procedure_catalogue pc ON pr.procedure_id = pc.id
WHERE pr.nhis_approval_status::text = 'pending'

ORDER BY requested_at ASC;

COMMENT ON VIEW nhis_pending_approvals IS 
  'View showing all services pending NHIS desk approval - used for NHIS module queue';

-- Grant access to the view
GRANT SELECT ON nhis_pending_approvals TO authenticated;

-- =============================================================================
-- 8. Create function to approve/reject NHIS requests
-- =============================================================================

CREATE OR REPLACE FUNCTION update_nhis_approval_status(
  p_service_type text,
  p_service_id uuid,
  p_new_status text,
  p_approved_by uuid DEFAULT NULL,
  p_approval_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  target_table text;
  id_field text;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('approved', 'rejected', 'expired', 'pending', 'not_required') THEN
    RAISE EXCEPTION 'Invalid NHIS approval status: %', p_new_status;
  END IF;
  
  -- Determine target table and ID field
  CASE p_service_type
    WHEN 'lab' THEN
      target_table := 'lab_requests';
      id_field := 'request_id';
    WHEN 'radiology' THEN
      target_table := 'radiology_requests';
      id_field := 'request_id';
    WHEN 'pharmacy' THEN
      target_table := 'prescriptions';
      id_field := 'prescription_id';
    WHEN 'procedure' THEN
      target_table := 'procedure_requests';
      id_field := 'request_id';
    ELSE
      RAISE EXCEPTION 'Unknown service type: %', p_service_type;
  END CASE;
  
  -- Update the status (cast text to nhis_approval_status enum)
  EXECUTE format(
    'UPDATE %I SET 
      nhis_approval_status = $1::nhis_approval_status,
      updated_at = NOW()
    WHERE %I = $2',
    target_table, id_field
  ) USING p_new_status, p_service_id;
  
  -- Log to audit trail
  INSERT INTO service_price_audit (
    service_type,
    service_id,
    service_name,
    field_changed,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    p_service_type,
    p_service_id,
    'NHIS Approval Update',
    'nhis_approval_status',
    'pending',
    p_new_status,
    p_approved_by,
    COALESCE(p_approval_notes, 'Status updated via NHIS desk')
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_nhis_approval_status IS 
  'Function to approve/reject NHIS pre-authorization requests';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_nhis_approval_status TO authenticated;

SELECT 'Migration 099 complete: NHIS pre-authorization enforcement at database level' AS status;
