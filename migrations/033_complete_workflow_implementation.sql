-- Migration: 033_complete_workflow_implementation.sql
-- Description: Complete implementation of EMR workflow system including queue, consultation, 
--              treatment plans, enhanced lab/radiology/pharmacy states, and billing rules
-- Date: December 22, 2025

-- =============================================================================
-- SECTION 1: QUEUE SYSTEM ENHANCEMENTS
-- =============================================================================

-- Drop and recreate queue_status_enum with all states from workflow reference
DO $$
BEGIN
    -- Check if we need to add new values to queue_status_enum
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Ready_For_Consultation' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'queue_status_enum')) THEN
        ALTER TYPE queue_status_enum ADD VALUE IF NOT EXISTS 'Ready_For_Consultation';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Skipped' 
                   AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'queue_status_enum')) THEN
        ALTER TYPE queue_status_enum ADD VALUE IF NOT EXISTS 'Skipped';
    END IF;
END $$;

-- Create queue_priority_enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_priority_enum') THEN
        CREATE TYPE queue_priority_enum AS ENUM ('Emergency', 'Urgent', 'Normal');
    END IF;
END $$;

-- Add priority/time-tracking columns to queue if not exists
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS priority queue_priority_enum DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS wait_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ready_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consultation_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consultation_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Create index for queue priority ordering
CREATE INDEX IF NOT EXISTS idx_queue_priority_order 
ON queue (clinic_id, status, priority DESC, wait_start_time ASC);

-- =============================================================================
-- SECTION 2: CONSULTATION WORKFLOW
-- =============================================================================

-- Create consultation_state_enum for sequential flow tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consultation_state_enum') THEN
        CREATE TYPE consultation_state_enum AS ENUM (
            'Patient_Called',
            'Complaints_Entered',
            'Clinical_Notes_Entered',
            'Diagnosis_Confirmed',
            'Treatment_Plan_Created',
            'Orders_Placed',
            'Completed'
        );
    END IF;
END $$;

-- Add consultation state tracking to consultations table
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS consultation_state consultation_state_enum DEFAULT 'Patient_Called',
ADD COLUMN IF NOT EXISTS state_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS patient_called_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS complaints_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS diagnosis_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS treatment_plan_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS orders_placed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Function to enforce sequential consultation flow
CREATE OR REPLACE FUNCTION enforce_consultation_sequence()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate state transitions
    IF NEW.consultation_state != OLD.consultation_state THEN
        CASE NEW.consultation_state
            WHEN 'Complaints_Entered' THEN
                IF OLD.consultation_state != 'Patient_Called' THEN
                    RAISE EXCEPTION 'Cannot enter complaints before patient is called';
                END IF;
                NEW.complaints_entered_at = NOW();
            WHEN 'Clinical_Notes_Entered' THEN
                IF OLD.consultation_state NOT IN ('Patient_Called', 'Complaints_Entered') THEN
                    RAISE EXCEPTION 'Cannot enter clinical notes before complaints';
                END IF;
                NEW.notes_entered_at = NOW();
            WHEN 'Diagnosis_Confirmed' THEN
                IF OLD.consultation_state NOT IN ('Complaints_Entered', 'Clinical_Notes_Entered') THEN
                    RAISE EXCEPTION 'Cannot confirm diagnosis before clinical notes';
                END IF;
                NEW.diagnosis_confirmed_at = NOW();
            WHEN 'Treatment_Plan_Created' THEN
                IF OLD.consultation_state != 'Diagnosis_Confirmed' THEN
                    RAISE EXCEPTION 'Cannot create treatment plan before diagnosis';
                END IF;
                NEW.treatment_plan_created_at = NOW();
            WHEN 'Orders_Placed' THEN
                IF OLD.consultation_state NOT IN ('Diagnosis_Confirmed', 'Treatment_Plan_Created') THEN
                    RAISE EXCEPTION 'Cannot place orders before diagnosis';
                END IF;
                NEW.orders_placed_at = NOW();
            WHEN 'Completed' THEN
                NEW.completed_at = NOW();
            ELSE
                -- Allow transition
        END CASE;
        
        -- Update state history
        NEW.state_history = OLD.state_history || jsonb_build_object(
            'from_state', OLD.consultation_state,
            'to_state', NEW.consultation_state,
            'changed_at', NOW(),
            'changed_by', current_setting('app.current_user_id', true)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for consultation state enforcement
DROP TRIGGER IF EXISTS trigger_consultation_sequence ON consultations;
CREATE TRIGGER trigger_consultation_sequence
    BEFORE UPDATE ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_consultation_sequence();

-- =============================================================================
-- SECTION 3: TREATMENT PLAN SYSTEM
-- =============================================================================

-- Create treatment_plan_status_enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_plan_status_enum') THEN
        CREATE TYPE treatment_plan_status_enum AS ENUM (
            'Created',
            'Viewed',
            'In_Progress',
            'Completed',
            'Cancelled'
        );
    END IF;
END $$;

-- Create treatment_task_status_enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_task_status_enum') THEN
        CREATE TYPE treatment_task_status_enum AS ENUM (
            'Pending',
            'In_Progress',
            'Completed',
            'Skipped',
            'Escalated'
        );
    END IF;
END $$;

-- Create treatment_task_type_enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'treatment_task_type_enum') THEN
        CREATE TYPE treatment_task_type_enum AS ENUM (
            'Administer_Medication',
            'Monitor_Vitals',
            'Procedure',
            'Observation',
            'Patient_Education',
            'Wound_Care',
            'Sample_Collection',
            'Other'
        );
    END IF;
END $$;

-- Create treatment_plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
    plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES visits(visit_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    
    -- Plan details
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Status tracking
    status treatment_plan_status_enum DEFAULT 'Created',
    
    -- Doctor who created
    created_by UUID NOT NULL REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Nurse who first viewed
    viewed_by UUID REFERENCES staff(staff_id),
    viewed_at TIMESTAMPTZ,
    
    -- Completion
    completed_by UUID REFERENCES staff(staff_id),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Audit
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create treatment_plan_tasks table
CREATE TABLE IF NOT EXISTS treatment_plan_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES treatment_plans(plan_id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES visits(visit_id),
    patient_id UUID NOT NULL REFERENCES patients(patient_id),
    
    -- Task details
    task_type treatment_task_type_enum NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Scheduling
    scheduled_time TIMESTAMPTZ,
    due_time TIMESTAMPTZ,
    frequency TEXT, -- e.g., "Every 4 hours", "Once daily"
    
    -- For medication tasks
    medication_name TEXT,
    dosage TEXT,
    route TEXT, -- Oral, IV, IM, etc.
    
    -- Status
    status treatment_task_status_enum DEFAULT 'Pending',
    priority queue_priority_enum DEFAULT 'Normal',
    
    -- Execution tracking
    started_at TIMESTAMPTZ,
    started_by UUID REFERENCES staff(staff_id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES staff(staff_id),
    
    -- Documentation
    execution_notes TEXT,
    patient_response TEXT,
    escalation_reason TEXT,
    escalated_to UUID REFERENCES staff(staff_id),
    
    -- Ordering
    sequence_order INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID NOT NULL REFERENCES staff(staff_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for treatment plans
CREATE INDEX IF NOT EXISTS idx_treatment_plans_encounter ON treatment_plans(encounter_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_tasks_plan ON treatment_plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_tasks_status ON treatment_plan_tasks(status);
CREATE INDEX IF NOT EXISTS idx_treatment_tasks_scheduled ON treatment_plan_tasks(scheduled_time) WHERE status = 'Pending';

-- Function to update treatment plan status based on tasks
CREATE OR REPLACE FUNCTION update_treatment_plan_status()
RETURNS TRIGGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    in_progress_tasks INTEGER;
BEGIN
    -- Count task statuses
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'Completed'),
        COUNT(*) FILTER (WHERE status = 'In_Progress')
    INTO total_tasks, completed_tasks, in_progress_tasks
    FROM treatment_plan_tasks
    WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id);
    
    -- Update plan status
    IF completed_tasks = total_tasks AND total_tasks > 0 THEN
        UPDATE treatment_plans 
        SET status = 'Completed', 
            completed_at = NOW(),
            updated_at = NOW()
        WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id)
        AND status != 'Completed';
    ELSIF in_progress_tasks > 0 OR completed_tasks > 0 THEN
        UPDATE treatment_plans 
        SET status = 'In_Progress',
            updated_at = NOW()
        WHERE plan_id = COALESCE(NEW.plan_id, OLD.plan_id)
        AND status NOT IN ('In_Progress', 'Completed', 'Cancelled');
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating plan status
DROP TRIGGER IF EXISTS trigger_treatment_task_status ON treatment_plan_tasks;
CREATE TRIGGER trigger_treatment_task_status
    AFTER INSERT OR UPDATE OF status ON treatment_plan_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_treatment_plan_status();

-- =============================================================================
-- SECTION 4: ENHANCED LAB WORKFLOW
-- =============================================================================

-- Create enhanced lab_request_status_enum
DO $$
BEGIN
    -- Add new status values to existing enum
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Accepted';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Rejected';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Awaiting_Payment';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Paid';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Waived';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Sample_Collected';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Processing';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Result_Ready';
    ALTER TYPE request_status_enum ADD VALUE IF NOT EXISTS 'Result_Viewed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add tracking columns to lab_requests
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sample_collected_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS sample_collected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS result_entered_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS result_entered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS result_viewed_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS result_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS critical_notified_at TIMESTAMPTZ;

-- =============================================================================
-- SECTION 5: ENHANCED RADIOLOGY WORKFLOW
-- =============================================================================

-- Add radiology-specific columns
ALTER TABLE radiology_requests
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS scan_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scan_completed_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS report_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS report_uploaded_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS report_viewed_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS report_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contrast_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contrast_type TEXT;

-- =============================================================================
-- SECTION 6: ENHANCED PHARMACY WORKFLOW
-- =============================================================================

-- Create prescription_status_enum if different from existing
DO $$
BEGIN
    ALTER TYPE dispense_status_enum ADD VALUE IF NOT EXISTS 'Verified';
    ALTER TYPE dispense_status_enum ADD VALUE IF NOT EXISTS 'Awaiting_Payment';
    ALTER TYPE dispense_status_enum ADD VALUE IF NOT EXISTS 'Paid';
    ALTER TYPE dispense_status_enum ADD VALUE IF NOT EXISTS 'Waived';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add pharmacy tracking columns
ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispensed_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS partial_dispense_reason TEXT,
ADD COLUMN IF NOT EXISTS backorder_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS drug_interaction_checked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allergy_checked BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- SECTION 7: BILLING WORKFLOW ENHANCEMENTS
-- =============================================================================

-- Create billing_coverage_type_enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_coverage_type_enum') THEN
        CREATE TYPE billing_coverage_type_enum AS ENUM (
            'Private',
            'Military_NHIS',
            'Civilian_NHIS',
            'DHML',
            'Retainership',
            'Waived'
        );
    END IF;
END $$;

-- Create billing_rules table for NHIS coverage logic
CREATE TABLE IF NOT EXISTS billing_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coverage_type billing_coverage_type_enum NOT NULL,
    service_category TEXT NOT NULL, -- 'Consultation', 'Lab', 'Radiology', 'Pharmacy', 'Procedure'
    is_covered BOOLEAN DEFAULT FALSE,
    patient_percentage DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    insurance_percentage DECIMAL(5,2) NOT NULL,
    requires_authorization BOOLEAN DEFAULT FALSE,
    max_coverage_amount DECIMAL(12,2),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_percentages CHECK (patient_percentage + insurance_percentage = 100.00)
);

-- Insert default billing rules from workflow reference
INSERT INTO billing_rules (coverage_type, service_category, is_covered, patient_percentage, insurance_percentage)
VALUES
    -- Private patients pay 100%
    ('Private', 'Consultation', false, 100.00, 0.00),
    ('Private', 'Lab', false, 100.00, 0.00),
    ('Private', 'Radiology', false, 100.00, 0.00),
    ('Private', 'Pharmacy', false, 100.00, 0.00),
    ('Private', 'Procedure', false, 100.00, 0.00),
    
    -- Military NHIS covered - 0% patient
    ('Military_NHIS', 'Consultation', true, 0.00, 100.00),
    ('Military_NHIS', 'Lab', true, 0.00, 100.00),
    ('Military_NHIS', 'Radiology', true, 0.00, 100.00),
    ('Military_NHIS', 'Pharmacy', true, 0.00, 100.00),
    ('Military_NHIS', 'Procedure', true, 0.00, 100.00),
    
    -- Military NHIS not covered - 100% patient
    ('DHML', 'Consultation', false, 100.00, 0.00),
    ('DHML', 'Lab', false, 100.00, 0.00),
    ('DHML', 'Radiology', false, 100.00, 0.00),
    ('DHML', 'Pharmacy', false, 100.00, 0.00),
    ('DHML', 'Procedure', false, 100.00, 0.00),
    
    -- Civilian NHIS covered - 10% patient, 90% insurance
    ('Civilian_NHIS', 'Consultation', true, 10.00, 90.00),
    ('Civilian_NHIS', 'Lab', true, 10.00, 90.00),
    ('Civilian_NHIS', 'Radiology', true, 10.00, 90.00),
    ('Civilian_NHIS', 'Pharmacy', true, 10.00, 90.00),
    ('Civilian_NHIS', 'Procedure', true, 10.00, 90.00)
ON CONFLICT DO NOTHING;

-- Add billing tracking columns to billing_orders
ALTER TABLE billing_orders
ADD COLUMN IF NOT EXISTS coverage_type billing_coverage_type_enum,
ADD COLUMN IF NOT EXISTS patient_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS coverage_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coverage_verified_by UUID REFERENCES staff(staff_id),
ADD COLUMN IF NOT EXISTS coverage_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS receipt_issued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_issued_by UUID REFERENCES staff(staff_id);

-- Function to calculate billing amounts based on coverage rules
CREATE OR REPLACE FUNCTION calculate_billing_coverage(
    p_coverage_type billing_coverage_type_enum,
    p_service_category TEXT,
    p_total_amount DECIMAL(12,2)
)
RETURNS TABLE(
    patient_amount DECIMAL(12,2),
    insurance_amount DECIMAL(12,2),
    is_covered BOOLEAN
) AS $$
DECLARE
    v_rule RECORD;
BEGIN
    -- Get the applicable billing rule
    SELECT br.* INTO v_rule
    FROM billing_rules br
    WHERE br.coverage_type = p_coverage_type
    AND br.service_category = p_service_category
    AND br.effective_from <= CURRENT_DATE
    AND (br.effective_to IS NULL OR br.effective_to >= CURRENT_DATE)
    LIMIT 1;
    
    IF v_rule IS NULL THEN
        -- Default to 100% patient payment if no rule found
        patient_amount := p_total_amount;
        insurance_amount := 0;
        is_covered := FALSE;
    ELSE
        patient_amount := ROUND(p_total_amount * v_rule.patient_percentage / 100, 2);
        insurance_amount := ROUND(p_total_amount * v_rule.insurance_percentage / 100, 2);
        is_covered := v_rule.is_covered;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 8: ROLE-BASED STATE CONTROL
-- =============================================================================

-- Create table for state transition permissions
CREATE TABLE IF NOT EXISTS state_transition_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'queue', 'lab', 'radiology', 'pharmacy', 'consultation', 'treatment_plan'
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    allowed_roles TEXT[] NOT NULL, -- Array of role names
    requires_reason BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_roles TEXT[], -- Roles that can approve
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, from_state, to_state)
);

-- Insert state transition permissions
INSERT INTO state_transition_permissions (entity_type, from_state, to_state, allowed_roles, requires_reason)
VALUES
    -- Queue transitions
    ('queue', 'Waiting', 'Ready_For_Consultation', ARRAY['nurse', 'doctor', 'admin'], false),
    ('queue', 'Ready_For_Consultation', 'In_Consultation', ARRAY['doctor', 'admin'], false),
    ('queue', 'In_Consultation', 'Completed', ARRAY['doctor', 'admin'], false),
    ('queue', 'Waiting', 'Skipped', ARRAY['nurse', 'doctor', 'admin'], true),
    ('queue', 'Waiting', 'Cancelled', ARRAY['nurse', 'receptionist', 'admin'], true),
    ('queue', 'Skipped', 'Waiting', ARRAY['nurse', 'admin'], false),
    
    -- Lab transitions
    ('lab', 'Pending', 'Accepted', ARRAY['lab_technician', 'admin'], false),
    ('lab', 'Pending', 'Rejected', ARRAY['lab_technician', 'admin'], true),
    ('lab', 'Accepted', 'Awaiting_Payment', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('lab', 'Awaiting_Payment', 'Paid', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('lab', 'Awaiting_Payment', 'Waived', ARRAY['cashier', 'admin', 'billing_clerk'], true),
    ('lab', 'Awaiting_Payment', 'Cancelled', ARRAY['cashier', 'admin'], true),
    ('lab', 'Paid', 'Sample_Collected', ARRAY['lab_technician', 'nurse', 'admin'], false),
    ('lab', 'Waived', 'Sample_Collected', ARRAY['lab_technician', 'nurse', 'admin'], false),
    ('lab', 'Sample_Collected', 'Processing', ARRAY['lab_technician', 'admin'], false),
    ('lab', 'Processing', 'Result_Ready', ARRAY['lab_technician', 'admin'], false),
    ('lab', 'Result_Ready', 'Result_Viewed', ARRAY['doctor', 'medical_director', 'admin'], false),
    
    -- Radiology transitions
    ('radiology', 'Pending', 'Accepted', ARRAY['radiologist', 'admin'], false),
    ('radiology', 'Pending', 'Rejected', ARRAY['radiologist', 'admin'], true),
    ('radiology', 'Accepted', 'Awaiting_Payment', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('radiology', 'Awaiting_Payment', 'Paid', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('radiology', 'Awaiting_Payment', 'Waived', ARRAY['cashier', 'admin'], true),
    ('radiology', 'Paid', 'Scheduled', ARRAY['radiologist', 'receptionist', 'admin'], false),
    ('radiology', 'Waived', 'Scheduled', ARRAY['radiologist', 'receptionist', 'admin'], false),
    ('radiology', 'Scheduled', 'Scan_Completed', ARRAY['radiologist', 'admin'], false),
    ('radiology', 'Scan_Completed', 'Report_Uploaded', ARRAY['radiologist', 'admin'], false),
    ('radiology', 'Report_Uploaded', 'Report_Viewed', ARRAY['doctor', 'medical_director', 'admin'], false),
    
    -- Pharmacy transitions
    ('pharmacy', 'Pending', 'Verified', ARRAY['pharmacist', 'admin'], false),
    ('pharmacy', 'Pending', 'Cancelled', ARRAY['pharmacist', 'doctor', 'admin'], true),
    ('pharmacy', 'Verified', 'Awaiting_Payment', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('pharmacy', 'Awaiting_Payment', 'Paid', ARRAY['cashier', 'billing_clerk', 'admin'], false),
    ('pharmacy', 'Awaiting_Payment', 'Waived', ARRAY['cashier', 'admin'], true),
    ('pharmacy', 'Paid', 'Dispensed', ARRAY['pharmacist', 'admin'], false),
    ('pharmacy', 'Waived', 'Dispensed', ARRAY['pharmacist', 'admin'], false),
    ('pharmacy', 'Paid', 'Partially_Dispensed', ARRAY['pharmacist', 'admin'], true),
    
    -- Treatment plan transitions
    ('treatment_plan', 'Created', 'Viewed', ARRAY['nurse', 'doctor', 'admin'], false),
    ('treatment_plan', 'Viewed', 'In_Progress', ARRAY['nurse', 'admin'], false),
    ('treatment_plan', 'In_Progress', 'Completed', ARRAY['nurse', 'admin'], false),
    ('treatment_plan', 'Created', 'Cancelled', ARRAY['doctor', 'admin'], true)
ON CONFLICT (entity_type, from_state, to_state) DO NOTHING;

-- Function to check if state transition is allowed
CREATE OR REPLACE FUNCTION can_transition_state(
    p_entity_type TEXT,
    p_from_state TEXT,
    p_to_state TEXT,
    p_user_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_allowed BOOLEAN;
BEGIN
    SELECT TRUE INTO v_allowed
    FROM state_transition_permissions
    WHERE entity_type = p_entity_type
    AND from_state = p_from_state
    AND to_state = p_to_state
    AND p_user_role = ANY(allowed_roles);
    
    RETURN COALESCE(v_allowed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 9: AUDIT ENHANCEMENTS
-- =============================================================================

-- Add workflow-specific columns to clinical_audit_log if not exists
ALTER TABLE clinical_audit_log
ADD COLUMN IF NOT EXISTS from_state TEXT,
ADD COLUMN IF NOT EXISTS to_state TEXT,
ADD COLUMN IF NOT EXISTS role_at_action TEXT;

-- Create index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_clinical_audit_encounter_action 
ON clinical_audit_log(encounter_id, action);

-- =============================================================================
-- SECTION 10: QUEUE HELPER FUNCTIONS
-- =============================================================================

-- Function to get next patient in queue based on priority
CREATE OR REPLACE FUNCTION get_next_queue_patient(p_clinic_id UUID)
RETURNS TABLE(
    queue_entry_id UUID,
    patient_id UUID,
    patient_name TEXT,
    priority queue_priority_enum,
    wait_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qe.id,
        qe.patient_id,
        CONCAT(p.first_name, ' ', p.surname) as patient_name,
        qe.priority,
        NOW() - qe.wait_start_time as wait_time
    FROM queue qe
    JOIN patients p ON p.patient_id = qe.patient_id
    WHERE qe.clinic_id = p_clinic_id
    AND qe.status = 'Waiting'
    ORDER BY 
        CASE qe.priority 
            WHEN 'Emergency' THEN 1 
            WHEN 'Urgent' THEN 2 
            ELSE 3 
        END,
        qe.wait_start_time ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate queue statistics
CREATE OR REPLACE FUNCTION get_queue_statistics(p_clinic_id UUID)
RETURNS TABLE(
    total_waiting INTEGER,
    emergency_count INTEGER,
    urgent_count INTEGER,
    normal_count INTEGER,
    avg_wait_time INTERVAL,
    longest_wait INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_waiting,
        COUNT(*) FILTER (WHERE priority = 'Emergency')::INTEGER as emergency_count,
        COUNT(*) FILTER (WHERE priority = 'Urgent')::INTEGER as urgent_count,
        COUNT(*) FILTER (WHERE priority = 'Normal')::INTEGER as normal_count,
        AVG(NOW() - wait_start_time) as avg_wait_time,
        MAX(NOW() - wait_start_time) as longest_wait
    FROM queue
    WHERE clinic_id = p_clinic_id
    AND status = 'Waiting';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 11: RLS POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_transition_permissions ENABLE ROW LEVEL SECURITY;

-- Treatment plans - all authenticated users can read
CREATE POLICY "treatment_plans_select" ON treatment_plans
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "treatment_plans_insert" ON treatment_plans
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "treatment_plans_update" ON treatment_plans
    FOR UPDATE TO authenticated USING (true);

-- Treatment tasks - all authenticated users can read and update
CREATE POLICY "treatment_tasks_select" ON treatment_plan_tasks
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "treatment_tasks_insert" ON treatment_plan_tasks
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "treatment_tasks_update" ON treatment_plan_tasks
    FOR UPDATE TO authenticated USING (true);

-- Billing rules - all can read, admins can modify
CREATE POLICY "billing_rules_select" ON billing_rules
    FOR SELECT TO authenticated USING (true);

-- State transition permissions - all can read
CREATE POLICY "state_permissions_select" ON state_transition_permissions
    FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- SECTION 12: GRANTS
-- =============================================================================

GRANT ALL ON treatment_plans TO authenticated;
GRANT ALL ON treatment_plan_tasks TO authenticated;
GRANT SELECT ON billing_rules TO authenticated;
GRANT SELECT ON state_transition_permissions TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_billing_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION can_transition_state TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_queue_patient TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_statistics TO authenticated;

COMMENT ON TABLE treatment_plans IS 'Treatment plans created by doctors for nurse execution';
COMMENT ON TABLE treatment_plan_tasks IS 'Individual tasks within a treatment plan';
COMMENT ON TABLE billing_rules IS 'NHIS/Insurance coverage rules for billing calculations';
COMMENT ON TABLE state_transition_permissions IS 'Role-based permissions for state transitions';
