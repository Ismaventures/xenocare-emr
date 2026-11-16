-- ============================================================================
-- Migration: 085_nursing_interventions.sql
-- Description: Create nursing_interventions table for structured intervention tracking
-- Date: 2026-01-25
-- 
-- This migration creates a table to store nursing interventions as separate rows
-- with category + code + timestamp + nurse_id for analytics support.
--
-- Analytics use-cases supported:
-- - "How many IV adjustments per ward?"
-- - "Which shifts perform most wound care?"
-- - "How often are doctors notified?"
-- ============================================================================

-- Nursing Interventions Table
-- Stores each intervention as a separate row for analytics and filtering
CREATE TABLE IF NOT EXISTS nursing_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core relationships (encounter-centric)
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Ward/Location context for analytics
    ward_id UUID REFERENCES wards(id),
    bed_id UUID REFERENCES beds(id),
    
    -- Intervention classification
    category_code VARCHAR(50) NOT NULL,     -- e.g., 'MED_THERAPY', 'IV_FLUIDS', 'WOUND_CARE'
    intervention_code VARCHAR(50) NOT NULL, -- e.g., 'MED_ADMINISTERED', 'IV_FLUIDS_ADJUSTED'
    
    -- For OTHER_CUSTOM interventions
    custom_description TEXT,
    
    -- Additional context
    notes TEXT,
    
    -- Timing
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    shift VARCHAR(20),  -- 'Morning', 'Afternoon', 'Night'
    
    -- Recording info
    nurse_id UUID NOT NULL REFERENCES staff(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Analytics & Performance
-- ============================================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_encounter 
    ON nursing_interventions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_patient 
    ON nursing_interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_nurse 
    ON nursing_interventions(nurse_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_ward 
    ON nursing_interventions(ward_id);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_category 
    ON nursing_interventions(category_code);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_code 
    ON nursing_interventions(intervention_code);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_shift 
    ON nursing_interventions(shift);

-- Time-based analytics
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_performed_at 
    ON nursing_interventions(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_created_at 
    ON nursing_interventions(created_at DESC);

-- Composite indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_ward_category 
    ON nursing_interventions(ward_id, category_code);
CREATE INDEX IF NOT EXISTS idx_nursing_interventions_shift_category 
    ON nursing_interventions(shift, category_code);
-- Note: For date-based category queries, use performed_at range queries with the existing index
-- The performed_at DESC index supports date range filtering efficiently

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE nursing_interventions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view interventions
CREATE POLICY nursing_interventions_select_policy 
    ON nursing_interventions FOR SELECT 
    USING (true);

-- Allow all authenticated users to insert interventions
CREATE POLICY nursing_interventions_insert_policy 
    ON nursing_interventions FOR INSERT 
    WITH CHECK (true);

-- Allow all authenticated users to update interventions
CREATE POLICY nursing_interventions_update_policy 
    ON nursing_interventions FOR UPDATE 
    USING (true);

-- Allow all authenticated users to delete interventions
CREATE POLICY nursing_interventions_delete_policy 
    ON nursing_interventions FOR DELETE 
    USING (true);

-- ============================================================================
-- Trigger for updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_nursing_interventions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_nursing_interventions_updated_at ON nursing_interventions;
CREATE TRIGGER tr_nursing_interventions_updated_at
    BEFORE UPDATE ON nursing_interventions
    FOR EACH ROW
    EXECUTE FUNCTION update_nursing_interventions_updated_at();

-- ============================================================================
-- Audit Trail Integration
-- ============================================================================

-- Trigger to log intervention creation to audit_logs
CREATE OR REPLACE FUNCTION audit_nursing_intervention_create()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        new_values,
        created_at
    ) VALUES (
        'CREATE',
        'nursing_intervention',
        NEW.id::TEXT,
        NEW.nurse_id::TEXT,
        jsonb_build_object(
            'encounter_id', NEW.encounter_id,
            'patient_id', NEW.patient_id,
            'ward_id', NEW.ward_id,
            'category_code', NEW.category_code,
            'intervention_code', NEW.intervention_code,
            'performed_at', NEW.performed_at,
            'shift', NEW.shift
        ),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the main operation if audit logging fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_nursing_intervention_create ON nursing_interventions;
CREATE TRIGGER tr_audit_nursing_intervention_create
    AFTER INSERT ON nursing_interventions
    FOR EACH ROW
    EXECUTE FUNCTION audit_nursing_intervention_create();

-- ============================================================================
-- Helper Views for Analytics
-- ============================================================================

-- View: Daily intervention summary by ward
CREATE OR REPLACE VIEW vw_daily_interventions_by_ward AS
SELECT 
    DATE(performed_at) as intervention_date,
    ward_id,
    w.name as ward_name,
    category_code,
    intervention_code,
    COUNT(*) as intervention_count,
    COUNT(DISTINCT nurse_id) as unique_nurses,
    COUNT(DISTINCT patient_id) as unique_patients
FROM nursing_interventions ni
LEFT JOIN wards w ON w.id = ni.ward_id
GROUP BY DATE(performed_at), ward_id, w.name, category_code, intervention_code
ORDER BY intervention_date DESC, ward_name, category_code;

-- View: Shift-based intervention summary
CREATE OR REPLACE VIEW vw_interventions_by_shift AS
SELECT 
    DATE(performed_at) as intervention_date,
    shift,
    category_code,
    intervention_code,
    COUNT(*) as intervention_count
FROM nursing_interventions
WHERE shift IS NOT NULL
GROUP BY DATE(performed_at), shift, category_code, intervention_code
ORDER BY intervention_date DESC, shift;

-- View: Doctor notification frequency
CREATE OR REPLACE VIEW vw_doctor_notifications AS
SELECT 
    DATE(performed_at) as notification_date,
    ward_id,
    w.name as ward_name,
    intervention_code,
    COUNT(*) as notification_count
FROM nursing_interventions ni
LEFT JOIN wards w ON w.id = ni.ward_id
WHERE category_code = 'COMMUNICATION'
  AND intervention_code IN ('DOCTOR_NOTIFIED_CHANGE_CONDITION', 'DOCTOR_NOTIFIED_CRITICAL')
GROUP BY DATE(performed_at), ward_id, w.name, intervention_code
ORDER BY notification_date DESC;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE nursing_interventions IS 'Stores individual nursing interventions with structured codes for analytics';
COMMENT ON COLUMN nursing_interventions.category_code IS 'Category slug e.g., MED_THERAPY, IV_FLUIDS, WOUND_CARE';
COMMENT ON COLUMN nursing_interventions.intervention_code IS 'Intervention slug e.g., MED_ADMINISTERED, IV_FLUIDS_ADJUSTED';
COMMENT ON COLUMN nursing_interventions.custom_description IS 'Free text description for OTHER_CUSTOM interventions';
COMMENT ON COLUMN nursing_interventions.performed_at IS 'When the intervention was actually performed (may differ from created_at)';
COMMENT ON COLUMN nursing_interventions.shift IS 'Shift when intervention was recorded: Morning, Afternoon, Night';
