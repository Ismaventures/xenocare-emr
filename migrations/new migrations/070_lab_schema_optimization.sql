-- ============================================================================
-- Lab Schema Optimization Migration
-- Implements best practices for laboratory information system
-- ============================================================================

-- ============================================================================
-- 1. ENSURE PROPER INDEXES EXIST
-- ============================================================================

-- Index for faster lab_results lookups by request
CREATE INDEX IF NOT EXISTS idx_lab_results_request_id ON lab_results(request_id);

-- Index for patient lab history
CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);

-- Composite index for workflow queries
CREATE INDEX IF NOT EXISTS idx_lab_results_workflow ON lab_results(workflow_status, created_at DESC);

-- Index for test-based queries
CREATE INDEX IF NOT EXISTS idx_lab_results_test_id ON lab_results(test_id);

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO lab_results FOR COMPLETE RESULT TRACKING
-- ============================================================================

-- Add encounter_id to lab_results for direct encounter linking (if encounters table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'encounters') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lab_results' AND column_name = 'encounter_id') THEN
            ALTER TABLE lab_results ADD COLUMN encounter_id uuid;
            ALTER TABLE lab_results ADD CONSTRAINT fk_lab_results_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id);
        END IF;
    END IF;
END $$;

-- Add interpretation and methodology fields (if not exists)
ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS interpretation text;

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS methodology varchar(255);

-- Add sample collection tracking
ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS sample_type varchar(100);

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS sample_collected_at timestamp with time zone;

ALTER TABLE lab_results 
ADD COLUMN IF NOT EXISTS sample_collected_by uuid REFERENCES staff(id);

-- ============================================================================
-- 3. CREATE VIEW FOR COMPREHENSIVE LAB RESULT REPORTING
-- ============================================================================

DROP VIEW IF EXISTS v_lab_results_complete;
CREATE VIEW v_lab_results_complete AS
SELECT 
    lr.id AS result_id,
    lr.request_id,
    lr.patient_id,
    lr.test_id,
    
    -- Test Information
    ltc.name AS test_name,
    ltc.category AS test_category,
    ltc.category_code,
    ltc.result_template_type AS template_type,
    ltc.specimen_type AS required_sample_type,
    
    -- Result Data
    lr.result_value,
    lr.unit,
    lr.reference_range,
    lr.structured_result,
    lr.result_template_type,
    lr.is_abnormal,
    lr.is_critical,
    lr.comments,
    
    -- Workflow Status
    lr.workflow_status,
    lr.collected_at,
    lr.reported_at,
    lr.verified_by,
    lr.verified_at,
    lr.approved_by,
    lr.approved_at,
    
    -- Staff Information (via separate joins in application)
    lr.technician_id,
    lr.last_modified_by,
    
    -- Timestamps
    lr.created_at,
    lr.updated_at,
    lr.version,
    
    -- Request Information
    lreq.status AS request_status,
    lreq.priority,
    lreq.clinical_notes,
    lreq.ordered_by,
    lreq.created_at AS requested_at,
    
    -- Patient Information (via join)
    p.emr_number,
    p.first_name AS patient_first_name,
    p.surname AS patient_surname,
    p.date_of_birth AS patient_dob,
    p.gender AS patient_gender

FROM lab_results lr
LEFT JOIN lab_requests lreq ON lr.request_id = lreq.request_id
LEFT JOIN lab_test_catalogue ltc ON lr.test_id = ltc.id
LEFT JOIN patients p ON lr.patient_id = p.id;

-- Grant access to the view
GRANT SELECT ON v_lab_results_complete TO authenticated;
GRANT SELECT ON v_lab_results_complete TO anon;

-- ============================================================================
-- 4. CREATE VIEW FOR LAB WORKFLOW DASHBOARD
-- ============================================================================

DROP VIEW IF EXISTS v_lab_workflow_summary;
CREATE VIEW v_lab_workflow_summary AS
SELECT 
    lreq.request_id,
    lreq.status,
    lreq.priority,
    lreq.created_at AS requested_at,
    lreq.patient_id,
    
    -- Test info
    ltc.name AS test_name,
    ltc.category AS test_category,
    ltc.result_template_type,
    
    -- Result status
    CASE 
        WHEN lr.id IS NOT NULL THEN 'Result Entered'
        WHEN lreq.sample_collected_at IS NOT NULL THEN 'Sample Collected'
        WHEN lreq.accepted_at IS NOT NULL THEN 'Accepted'
        ELSE 'Pending'
    END AS workflow_stage,
    
    -- Result info
    lr.id AS result_id,
    lr.workflow_status AS result_workflow_status,
    lr.is_critical,
    lr.is_abnormal,
    
    -- Timing metrics
    lreq.accepted_at,
    lreq.sample_collected_at,
    lr.collected_at AS result_collected_at,
    lr.reported_at,
    lr.verified_at,
    lr.approved_at,
    
    -- Calculate turnaround times (in minutes)
    EXTRACT(EPOCH FROM (lreq.sample_collected_at - lreq.accepted_at))/60 AS acceptance_to_collection_mins,
    EXTRACT(EPOCH FROM (lr.reported_at - lreq.sample_collected_at))/60 AS collection_to_result_mins,
    EXTRACT(EPOCH FROM (lr.reported_at - lreq.created_at))/60 AS total_turnaround_mins

FROM lab_requests lreq
LEFT JOIN lab_test_catalogue ltc ON lreq.test_id = ltc.id
LEFT JOIN lab_results lr ON lreq.request_id = lr.request_id;

GRANT SELECT ON v_lab_workflow_summary TO authenticated;
GRANT SELECT ON v_lab_workflow_summary TO anon;

-- ============================================================================
-- 5. CREATE FUNCTION TO SYNC REQUEST STATUS WITH RESULT
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_lab_request_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a lab result is inserted or updated, sync key info to lab_requests
    UPDATE lab_requests
    SET 
        status = CASE 
            WHEN NEW.workflow_status = 'released' THEN 'Completed'::request_status
            WHEN NEW.workflow_status IN ('verified', 'approved') THEN 'Result_Ready'::request_status
            ELSE status
        END,
        result_entered_at = COALESCE(result_entered_at, NEW.created_at),
        result_entered_by = COALESCE(result_entered_by, NEW.technician_id),
        is_critical = COALESCE(NEW.is_critical, is_critical),
        updated_at = NOW()
    WHERE request_id = NEW.request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trigger_sync_lab_request_status ON lab_results;
CREATE TRIGGER trigger_sync_lab_request_status
    AFTER INSERT OR UPDATE ON lab_results
    FOR EACH ROW
    EXECUTE FUNCTION sync_lab_request_status();

-- ============================================================================
-- 6. CREATE FUNCTION FOR LAB RESULT HISTORY TRACKING
-- ============================================================================

CREATE OR REPLACE FUNCTION track_lab_result_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if there's an actual change to result data
    IF TG_OP = 'UPDATE' AND (
        OLD.result_value IS DISTINCT FROM NEW.result_value OR
        OLD.structured_result IS DISTINCT FROM NEW.structured_result OR
        OLD.workflow_status IS DISTINCT FROM NEW.workflow_status
    ) THEN
        INSERT INTO lab_result_history (
            lab_result_id,
            version,
            result,
            result_value,
            structured_result,
            result_status,
            modified_by,
            modification_type,
            modification_reason
        ) VALUES (
            NEW.id,
            NEW.version,
            NEW.result_value,
            CASE WHEN NEW.result_value ~ '^[0-9.]+$' THEN NEW.result_value::numeric ELSE NULL END,
            NEW.structured_result,
            NEW.workflow_status,
            NEW.last_modified_by,
            CASE 
                WHEN OLD.workflow_status != NEW.workflow_status THEN 'Status Change'
                WHEN OLD.result_value IS DISTINCT FROM NEW.result_value THEN 'Result Amendment'
                WHEN OLD.structured_result IS DISTINCT FROM NEW.structured_result THEN 'Data Update'
                ELSE 'Modification'
            END,
            'Automatic tracking on update'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic history tracking
DROP TRIGGER IF EXISTS trigger_track_lab_result_changes ON lab_results;
CREATE TRIGGER trigger_track_lab_result_changes
    AFTER UPDATE ON lab_results
    FOR EACH ROW
    EXECUTE FUNCTION track_lab_result_changes();

-- ============================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION (only on tables/columns we own)
-- ============================================================================

-- Comments on tables we created or own
DO $$
BEGIN
    -- lab_requests
    EXECUTE 'COMMENT ON TABLE lab_requests IS ''Lab test orders/requests from clinical encounters. Primary workflow tracking table.''';
    EXECUTE 'COMMENT ON TABLE lab_results IS ''Actual lab test results with structured data. One result per request.''';
    EXECUTE 'COMMENT ON TABLE lab_test_catalogue IS ''Master catalog of available lab tests with pricing and template info.''';
    EXECUTE 'COMMENT ON TABLE lab_request_items IS ''Individual test items within a panel request. Used for multi-test orders.''';
    
    -- Column comments on lab_results
    EXECUTE 'COMMENT ON COLUMN lab_results.structured_result IS ''JSONB storage for template-specific result data''';
    EXECUTE 'COMMENT ON COLUMN lab_results.result_template_type IS ''Template type used for result entry''';
    EXECUTE 'COMMENT ON COLUMN lab_results.workflow_status IS ''Result workflow: pending → verified → approved → released''';
    EXECUTE 'COMMENT ON COLUMN lab_results.version IS ''Auto-incremented version for optimistic locking and history tracking''';
    
    -- View comments
    EXECUTE 'COMMENT ON VIEW v_lab_results_complete IS ''Comprehensive view joining lab results with test catalog, request, and patient data''';
    EXECUTE 'COMMENT ON VIEW v_lab_workflow_summary IS ''Dashboard view for lab workflow monitoring with turnaround time metrics''';
EXCEPTION WHEN OTHERS THEN
    -- Ignore permission errors on comments
    NULL;
END $$;

-- ============================================================================
-- 8. ENSURE RLS POLICIES ARE PROPERLY SET
-- ============================================================================

-- Enable RLS on tables we own (skip tables with ownership issues)
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_request_items ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users (only on tables we own)
DO $$
BEGIN
    -- lab_results policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_results' AND policyname = 'lab_results_all_access') THEN
        CREATE POLICY lab_results_all_access ON lab_results FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- lab_requests policies  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_requests' AND policyname = 'lab_requests_all_access') THEN
        CREATE POLICY lab_requests_all_access ON lab_requests FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- lab_test_catalogue policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_test_catalogue' AND policyname = 'lab_test_catalogue_all_access') THEN
        CREATE POLICY lab_test_catalogue_all_access ON lab_test_catalogue FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    -- lab_request_items policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_request_items' AND policyname = 'lab_request_items_all_access') THEN
        CREATE POLICY lab_request_items_all_access ON lab_request_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore permission errors
    NULL;
END $$;

-- ============================================================================
-- 9. CREATE STATISTICS FUNCTION FOR LAB ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lab_statistics(
    p_start_date timestamp with time zone DEFAULT NOW() - INTERVAL '30 days',
    p_end_date timestamp with time zone DEFAULT NOW()
)
RETURNS TABLE (
    total_requests bigint,
    total_completed bigint,
    total_pending bigint,
    total_critical bigint,
    avg_turnaround_hours numeric,
    requests_by_category jsonb,
    completion_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint AS total_requests,
        COUNT(*) FILTER (WHERE lreq.status = 'Completed')::bigint AS total_completed,
        COUNT(*) FILTER (WHERE lreq.status IN ('Pending', 'Accepted', 'Sample_Collected', 'Processing'))::bigint AS total_pending,
        COUNT(*) FILTER (WHERE lreq.is_critical = true)::bigint AS total_critical,
        ROUND(AVG(EXTRACT(EPOCH FROM (lr.reported_at - lreq.created_at))/3600)::numeric, 2) AS avg_turnaround_hours,
        jsonb_object_agg(
            COALESCE(ltc.category, 'Unknown'),
            cat_counts.cnt
        ) AS requests_by_category,
        ROUND((COUNT(*) FILTER (WHERE lreq.status = 'Completed')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) AS completion_rate
    FROM lab_requests lreq
    LEFT JOIN lab_results lr ON lreq.request_id = lr.request_id
    LEFT JOIN lab_test_catalogue ltc ON lreq.test_id = ltc.id
    LEFT JOIN LATERAL (
        SELECT ltc2.category, COUNT(*) AS cnt
        FROM lab_requests lreq2
        LEFT JOIN lab_test_catalogue ltc2 ON lreq2.test_id = ltc2.id
        WHERE lreq2.created_at BETWEEN p_start_date AND p_end_date
        GROUP BY ltc2.category
    ) cat_counts ON ltc.category = cat_counts.category
    WHERE lreq.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
