-- ============================================================================
-- PERFORMANCE OPTIMIZATION: Indexes for 1M+ Records
-- Apply via Supabase SQL Editor when needed
-- ============================================================================

-- =============================================================================
-- 1. PATIENTS TABLE - High volume table, needs better search performance
-- =============================================================================

-- Primary lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_emr_number 
    ON patients(emr_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_patient_id 
    ON patients(patient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_phone 
    ON patients(contact_phone) WHERE contact_phone IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_nhis_number 
    ON patients(nhis_number) WHERE nhis_number IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_service_number 
    ON patients(service_number) WHERE service_number IS NOT NULL;

-- Status and category filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_status 
    ON patients(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_category_insurance 
    ON patients(patient_category, insurance_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_active_nhis 
    ON patients(id) 
    WHERE status = 'Active' AND insurance_type IN ('DHML', 'Civilian_NHIS', 'Military_NHIS');

-- =============================================================================
-- 2. QUEUE TABLE - Very high traffic, needs fast lookups
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_patient 
    ON queue(patient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_visit 
    ON queue(visit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_clinic 
    ON queue(clinic_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_location_waiting 
    ON queue(location, status, created_at) 
    WHERE status = 'Waiting';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_today_active 
    ON queue(created_at, status) 
    WHERE status IN ('Waiting', 'Called', 'In Progress');

-- =============================================================================
-- 3. BILLING_ORDERS TABLE - Financial queries
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_orders_patient 
    ON billing_orders(patient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_orders_status_date 
    ON billing_orders(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_orders_pending 
    ON billing_orders(patient_id, status) 
    WHERE status IN ('Pending', 'Awaiting_Payment');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_orders_nhis_pending 
    ON billing_orders(nhis_covered, status) 
    WHERE nhis_covered = TRUE AND status = 'Pending';

-- =============================================================================
-- 4. BILLING_ITEMS TABLE - Line items lookups
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_items_order 
    ON billing_items(billing_order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_billing_items_status 
    ON billing_items(status);

-- =============================================================================
-- 5. NHIS_REFERRAL_QUEUE - Workflow processing
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nhis_referral_queue_patient 
    ON nhis_referral_queue(patient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nhis_referral_queue_pending 
    ON nhis_referral_queue(status, request_type) 
    WHERE status IN ('pending', 'in_review');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nhis_referral_queue_clinical 
    ON nhis_referral_queue(clinical_request_id) 
    WHERE clinical_request_id IS NOT NULL;

-- =============================================================================
-- 6. CLINICAL_REQUESTS TABLE - Referral workflow
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinical_requests_specialty 
    ON clinical_requests(specialty_module, referral_workflow_status) 
    WHERE request_type = 'Referral';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinical_requests_nhis_pending 
    ON clinical_requests(nhis_approval_status) 
    WHERE nhis_approval_status = 'pending';

-- =============================================================================
-- 7. PRESCRIPTIONS TABLE - Pharmacy workload
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prescriptions_encounter 
    ON prescriptions(encounter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prescriptions_pending 
    ON prescriptions(status) 
    WHERE status IN ('Pending', 'Partial');

-- =============================================================================
-- 8. LAB_REQUESTS TABLE - Lab workload
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_requests_pending 
    ON lab_requests(status) 
    WHERE status IN ('Pending', 'Sample Collected');

-- =============================================================================
-- 9. CONSULTATIONS - Clinical history
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultations_patient 
    ON consultations(patient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultations_date 
    ON consultations(created_at DESC);

-- =============================================================================
-- 10. AUDIT LOGS - Large volume table
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_date_range 
    ON audit_logs(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action 
    ON audit_logs(user_id, action);

-- =============================================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- =============================================================================

ANALYZE patients;
ANALYZE visits;
ANALYZE queue;
ANALYZE billing_orders;
ANALYZE billing_items;
ANALYZE clinical_requests;
ANALYZE nhis_referral_queue;
ANALYZE prescriptions;
ANALYZE lab_requests;
ANALYZE consultations;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
SELECT 'Performance indexes created successfully!' as result;
