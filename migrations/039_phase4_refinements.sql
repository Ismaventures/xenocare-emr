-- =============================================================================
-- NDC Medical Centre EMR - Phase 4 Refinements Migration
-- Migration: 039_phase4_refinements.sql
-- Description: OPD Classification, Enhanced Referrals, Analytics Support
-- =============================================================================

-- =============================================================================
-- 1. EXTERNAL REFERRALS TABLE
-- Supports referrals to/from external facilities
-- =============================================================================

CREATE TABLE IF NOT EXISTS external_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_number VARCHAR(50) UNIQUE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    
    -- Patient link
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- External facility info
    external_facility_name VARCHAR(255) NOT NULL,
    external_facility_address TEXT,
    external_facility_phone VARCHAR(50),
    external_physician_name VARCHAR(255),
    external_physician_contact VARCHAR(100),
    
    -- Internal department (receiving for incoming, sending for outgoing)
    internal_department_id UUID REFERENCES departments(id),
    internal_physician_id UUID REFERENCES staff(id),
    
    -- Referral details
    reason TEXT NOT NULL,
    clinical_summary TEXT,
    urgency VARCHAR(20) DEFAULT 'Routine' CHECK (urgency IN ('Routine', 'Urgent', 'Emergency')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'InProgress', 'Completed', 'Rejected', 'Cancelled')),
    
    -- Documents
    referral_letter_path TEXT,
    response_letter_path TEXT,
    
    -- Dates
    referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    completed_date DATE,
    
    -- Notes
    notes TEXT,
    outcome TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

-- External referral number sequence
CREATE SEQUENCE IF NOT EXISTS external_referral_seq START WITH 1001;

-- Trigger for external referral number generation
CREATE OR REPLACE FUNCTION generate_external_referral_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_number IS NULL THEN
        NEW.referral_number := 'EXT-' || UPPER(SUBSTRING(NEW.direction, 1, 3)) || '-' || 
                               TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                               LPAD(nextval('external_referral_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_external_referral_number ON external_referrals;
CREATE TRIGGER trg_external_referral_number
    BEFORE INSERT ON external_referrals
    FOR EACH ROW
    EXECUTE FUNCTION generate_external_referral_number();

-- =============================================================================
-- 2. REFERRAL OUTCOMES TABLE
-- Track outcomes of referrals
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    external_referral_id UUID REFERENCES external_referrals(id) ON DELETE CASCADE,
    
    outcome_type VARCHAR(50) NOT NULL CHECK (outcome_type IN (
        'diagnosis_confirmed', 'diagnosis_changed', 'treatment_initiated',
        'procedure_performed', 'medication_changed', 'admission_required',
        'follow_up_scheduled', 'referred_further', 'discharged', 'other'
    )),
    outcome_description TEXT NOT NULL,
    
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    
    -- At least one referral ID must be set
    CONSTRAINT chk_referral_id CHECK (referral_id IS NOT NULL OR external_referral_id IS NOT NULL)
);

-- =============================================================================
-- 3. REFERRAL CHAIN SUPPORT
-- Add parent referral link for cascade tracking
-- =============================================================================

ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS parent_referral_id UUID REFERENCES referrals(id);

-- Index for chain queries
CREATE INDEX IF NOT EXISTS idx_referrals_parent ON referrals(parent_referral_id) WHERE parent_referral_id IS NOT NULL;

-- =============================================================================
-- 4. CLINICAL REQUEST SLA TRACKING
-- Add SLA-related fields to clinical requests
-- =============================================================================

ALTER TABLE clinical_requests
ADD COLUMN IF NOT EXISTS sla_hours INTEGER,
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_warning_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sla_breach_sent BOOLEAN DEFAULT FALSE;

-- Function to calculate SLA deadline on insert
CREATE OR REPLACE FUNCTION set_clinical_request_sla()
RETURNS TRIGGER AS $$
DECLARE
    sla_hours_val INTEGER;
BEGIN
    -- Set SLA based on urgency
    CASE NEW.urgency
        WHEN 'Emergency' THEN sla_hours_val := 1;
        WHEN 'Urgent' THEN sla_hours_val := 4;
        ELSE sla_hours_val := 24;
    END CASE;
    
    NEW.sla_hours := sla_hours_val;
    NEW.sla_deadline := NEW.created_at + (sla_hours_val || ' hours')::INTERVAL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clinical_request_sla ON clinical_requests;
CREATE TRIGGER trg_clinical_request_sla
    BEFORE INSERT ON clinical_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_clinical_request_sla();

-- =============================================================================
-- 5. NOTIFICATION ENHANCEMENTS
-- Add clinical request notification type
-- =============================================================================

-- Add notification_subtype column if not exists
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_subtype VARCHAR(50);

-- =============================================================================
-- 6. ANALYTICS VIEWS
-- =============================================================================

-- Daily request volume view
CREATE OR REPLACE VIEW clinical_request_daily_volume AS
SELECT 
    DATE(created_at) as request_date,
    request_type,
    urgency,
    COUNT(*) as request_count,
    COUNT(*) FILTER (WHERE status = 'Completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status IN ('Pending', 'Under_Review')) as pending_count,
    AVG(EXTRACT(EPOCH FROM (
        CASE WHEN status = 'Completed' THEN updated_at ELSE NOW() END - created_at
    )) / 3600)::NUMERIC(10,2) as avg_hours
FROM clinical_requests
GROUP BY DATE(created_at), request_type, urgency
ORDER BY request_date DESC, request_type;

-- Department workload view
CREATE OR REPLACE VIEW department_clinical_workload AS
SELECT 
    d.id as department_id,
    d.name as department_name,
    d.opd_type,
    COUNT(*) FILTER (WHERE cr.status IN ('Pending', 'Under_Review')) as pending_requests,
    COUNT(*) FILTER (WHERE cr.status IN ('Approved', 'Scheduled', 'In_Progress')) as active_requests,
    COUNT(*) FILTER (WHERE cr.status = 'Completed' AND DATE(cr.updated_at) = CURRENT_DATE) as completed_today,
    COUNT(*) FILTER (WHERE cr.status = 'Completed' AND cr.updated_at >= CURRENT_DATE - INTERVAL '7 days') as completed_week,
    AVG(EXTRACT(EPOCH FROM (
        CASE WHEN cr.status = 'Completed' THEN cr.updated_at ELSE NULL END - cr.created_at
    )) / 3600)::NUMERIC(10,2) as avg_turnaround_hours
FROM departments d
LEFT JOIN clinical_requests cr ON cr.target_department_id = d.id
WHERE d.status = 'Active'
GROUP BY d.id, d.name, d.opd_type
ORDER BY pending_requests DESC;

-- SLA compliance view
CREATE OR REPLACE VIEW clinical_request_sla_status AS
SELECT 
    cr.id,
    cr.request_number,
    cr.request_type,
    cr.urgency,
    cr.status,
    cr.created_at,
    cr.sla_deadline,
    cr.sla_hours,
    p.first_name || ' ' || p.surname as patient_name,
    d.name as target_department,
    CASE 
        WHEN cr.status IN ('Completed', 'Cancelled', 'Rejected') THEN 'N/A'
        WHEN NOW() > cr.sla_deadline THEN 'BREACHED'
        WHEN NOW() > cr.sla_deadline - (cr.sla_hours * 0.25 || ' hours')::INTERVAL THEN 'WARNING'
        ELSE 'ON_TRACK'
    END as sla_status,
    GREATEST(0, EXTRACT(EPOCH FROM (cr.sla_deadline - NOW())) / 3600)::NUMERIC(10,2) as hours_remaining
FROM clinical_requests cr
JOIN patients p ON cr.patient_id = p.id
LEFT JOIN departments d ON cr.target_department_id = d.id
WHERE cr.status IN ('Pending', 'Under_Review', 'Approved', 'Scheduled')
ORDER BY 
    CASE 
        WHEN NOW() > cr.sla_deadline THEN 1
        WHEN NOW() > cr.sla_deadline - (cr.sla_hours * 0.25 || ' hours')::INTERVAL THEN 2
        ELSE 3
    END,
    cr.sla_deadline ASC;

-- OPD Classification statistics view
CREATE OR REPLACE VIEW opd_classification_stats AS
SELECT 
    DATE(v.created_at) as visit_date,
    v.opd_classification,
    d.opd_type as department_type,
    COUNT(*) as visit_count,
    COUNT(DISTINCT v.patient_id) as unique_patients
FROM visits v
LEFT JOIN clinics c ON v.clinic_id = c.id
LEFT JOIN departments d ON c.department_id = d.id
WHERE v.opd_classification IS NOT NULL
GROUP BY DATE(v.created_at), v.opd_classification, d.opd_type
ORDER BY visit_date DESC;

-- =============================================================================
-- 7. INDEXES FOR ANALYTICS PERFORMANCE
-- =============================================================================

-- Index on created_at for date-based queries (without DATE() function which is not immutable)
CREATE INDEX IF NOT EXISTS idx_clinical_requests_created_at ON clinical_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_clinical_requests_sla_deadline ON clinical_requests(sla_deadline) WHERE status IN ('Pending', 'Under_Review');
CREATE INDEX IF NOT EXISTS idx_external_referrals_patient ON external_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_external_referrals_direction ON external_referrals(direction);
CREATE INDEX IF NOT EXISTS idx_external_referrals_status ON external_referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_outcomes_referral ON referral_outcomes(referral_id);
CREATE INDEX IF NOT EXISTS idx_visits_opd_class ON visits(opd_classification) WHERE opd_classification IS NOT NULL;

-- =============================================================================
-- 8. RLS POLICIES
-- =============================================================================

ALTER TABLE external_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_referrals_select ON external_referrals FOR SELECT USING (true);
CREATE POLICY external_referrals_insert ON external_referrals FOR INSERT WITH CHECK (true);
CREATE POLICY external_referrals_update ON external_referrals FOR UPDATE USING (true);

CREATE POLICY referral_outcomes_select ON referral_outcomes FOR SELECT USING (true);
CREATE POLICY referral_outcomes_insert ON referral_outcomes FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 9. GRANTS
-- =============================================================================

GRANT ALL ON external_referrals TO authenticated;
GRANT ALL ON referral_outcomes TO authenticated;
GRANT USAGE ON SEQUENCE external_referral_seq TO authenticated;

-- =============================================================================
-- 10. UPDATE TRIGGER FOR TIMESTAMPS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_external_referrals_updated_at ON external_referrals;
CREATE TRIGGER trg_external_referrals_updated_at
    BEFORE UPDATE ON external_referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE external_referrals IS 'Track referrals to/from external healthcare facilities';
COMMENT ON TABLE referral_outcomes IS 'Track outcomes and follow-up actions from referrals';
COMMENT ON VIEW clinical_request_daily_volume IS 'Daily volume statistics for clinical requests';
COMMENT ON VIEW department_clinical_workload IS 'Department workload metrics for clinical requests';
COMMENT ON VIEW clinical_request_sla_status IS 'SLA compliance monitoring for pending requests';
COMMENT ON VIEW opd_classification_stats IS 'OPD classification (MOPD/SOPD) statistics';
