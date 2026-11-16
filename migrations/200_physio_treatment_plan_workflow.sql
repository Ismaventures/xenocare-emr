-- =============================================================================
-- Migration 200: Physiotherapy Treatment Plan & Session-Based Workflow
-- =============================================================================
-- Extends physio_plans with doctor-prescribed treatment plan fields and adds
-- automatic session generation support. This enables the workflow:
--   Consultation → Physiotherapy Treatment Plan → Multiple Therapy Sessions
--
-- New columns on physio_plans:
--   • prescribing_doctor_id  — the doctor who ordered the plan
--   • consultation_id        — links back to the originating consultation
--   • sessions_completed     — running count of completed sessions
--   • start_date             — when therapy should begin
--   • instructions           — doctor's therapy instructions/notes
--   • billing_type           — per_session | package
--   • clinical_request_id    — links to the referral/clinical_request that triggered this plan
--
-- New columns on physio_sessions:
--   • scheduled_date         — the pre-scheduled date for auto-generated sessions
--   • is_pre_generated       — flag indicating session was auto-generated from plan
--
-- New table:
--   • physio_plan_extensions — tracks plan extensions (adding sessions)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend physio_plans with treatment plan ordering fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE physio_plans
    ADD COLUMN IF NOT EXISTS prescribing_doctor_id UUID
        REFERENCES staff(id),
    ADD COLUMN IF NOT EXISTS consultation_id UUID,
    ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS instructions TEXT,
    ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) DEFAULT 'per_session'
        CHECK (billing_type IN ('per_session', 'package')),
    ADD COLUMN IF NOT EXISTS clinical_request_id UUID;

COMMENT ON COLUMN physio_plans.prescribing_doctor_id IS 'Doctor who prescribed/ordered the physiotherapy plan';
COMMENT ON COLUMN physio_plans.consultation_id IS 'Link to originating consultation record';
COMMENT ON COLUMN physio_plans.sessions_completed IS 'Running count of completed sessions (auto-updated)';
COMMENT ON COLUMN physio_plans.start_date IS 'Date therapy should begin';
COMMENT ON COLUMN physio_plans.instructions IS 'Doctor therapy instructions for the physiotherapist';
COMMENT ON COLUMN physio_plans.billing_type IS 'per_session = bill each session; package = bill entire plan once';
COMMENT ON COLUMN physio_plans.clinical_request_id IS 'Link to the clinical_request/referral that triggered this plan';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Extend physio_sessions with scheduling fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE physio_sessions
    ADD COLUMN IF NOT EXISTS scheduled_date DATE,
    ADD COLUMN IF NOT EXISTS is_pre_generated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN physio_sessions.scheduled_date IS 'Pre-scheduled date for this session (from plan generation)';
COMMENT ON COLUMN physio_sessions.is_pre_generated IS 'True if session was auto-generated from treatment plan';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Create plan extensions table for tracking session additions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS physio_plan_extensions (
    extension_id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES physio_plans(plan_id) ON DELETE CASCADE,
    previous_sessions_planned INTEGER NOT NULL,
    additional_sessions INTEGER NOT NULL,
    new_total_sessions INTEGER NOT NULL,
    reason TEXT,
    extended_by UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE physio_plan_extensions IS 'Tracks extensions/additions to physiotherapy treatment plans';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Function: Auto-increment sessions_completed when a session is completed
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_physio_plan_sessions_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- When attendance_status changes to 'Attended' (session completed)
    IF NEW.attendance_status = 'Attended' AND
       (OLD.attendance_status IS NULL OR OLD.attendance_status != 'Attended') THEN

        UPDATE physio_plans
        SET sessions_completed = (
            SELECT COUNT(*)
            FROM physio_sessions
            WHERE plan_id = NEW.plan_id
              AND attendance_status = 'Attended'
        ),
        updated_at = now()
        WHERE plan_id = NEW.plan_id;

        -- Auto-complete plan if all sessions done
        UPDATE physio_plans
        SET status = 'Completed',
            status_reason = 'All prescribed sessions completed',
            updated_at = now()
        WHERE plan_id = NEW.plan_id
          AND total_sessions_planned IS NOT NULL
          AND sessions_completed >= total_sessions_planned
          AND status = 'Active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to allow re-run
DROP TRIGGER IF EXISTS trg_update_physio_sessions_completed ON physio_sessions;

CREATE TRIGGER trg_update_physio_sessions_completed
    AFTER INSERT OR UPDATE OF attendance_status ON physio_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_physio_plan_sessions_completed();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes for performance
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_physio_plans_prescribing_doctor
    ON physio_plans(prescribing_doctor_id)
    WHERE prescribing_doctor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_physio_plans_status_active
    ON physio_plans(status)
    WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_physio_plans_patient_status
    ON physio_plans(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_physio_sessions_plan_status
    ON physio_sessions(plan_id, attendance_status);

CREATE INDEX IF NOT EXISTS idx_physio_sessions_scheduled_date
    ON physio_sessions(scheduled_date)
    WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_physio_plan_extensions_plan
    ON physio_plan_extensions(plan_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Backfill sessions_completed for existing plans
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE physio_plans pp
SET sessions_completed = (
    SELECT COUNT(*)
    FROM physio_sessions ps
    WHERE ps.plan_id = pp.plan_id
      AND ps.attendance_status = 'Attended'
)
WHERE pp.sessions_completed IS NULL OR pp.sessions_completed = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Add payment_status column to physio_plans for DB-level billing enforcement
--    Values: pending_billing | awaiting_payment | paid | waived
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE physio_plans
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending_billing'
        CHECK (payment_status IN ('pending_billing', 'awaiting_payment', 'paid', 'waived'));

COMMENT ON COLUMN physio_plans.payment_status IS 'DB-level billing enforcement: pending_billing → awaiting_payment → paid. Sessions locked until paid/waived.';

-- Backfill existing plans: mark as "paid" if they have billing orders that are paid,
-- "awaiting_payment" if billed but not yet paid, else "pending_billing"
UPDATE physio_plans pp
SET payment_status = CASE
    WHEN EXISTS (
        SELECT 1 FROM billing_items bi
        JOIN billing_orders bo ON bo.id = bi.billing_order_id
        WHERE (bi.item_id = pp.plan_id OR bi.service_reference_id = pp.plan_id)
          AND bo.status IN ('Paid', 'Paid_NHIS', 'Paid_Retainership')
    ) THEN 'paid'
    WHEN EXISTS (
        SELECT 1 FROM billing_items bi
        WHERE bi.item_id = pp.plan_id OR bi.service_reference_id = pp.plan_id
    ) THEN 'awaiting_payment'
    ELSE 'pending_billing'
END
WHERE payment_status IS NULL OR payment_status = 'pending_billing';

CREATE INDEX IF NOT EXISTS idx_physio_plans_payment_status
    ON physio_plans(payment_status)
    WHERE payment_status IN ('pending_billing', 'awaiting_payment');

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Add sessions_approved for cleared/approved session count enforcement
--    NHIS patients default to 6 sessions, admin can adjust.
--    Therapists cannot record more sessions than sessions_approved.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE physio_plans
    ADD COLUMN IF NOT EXISTS sessions_approved INTEGER,
    ADD COLUMN IF NOT EXISTS is_nhis_plan BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN physio_plans.sessions_approved IS 'Number of sessions approved/cleared for use by paypoint or NHIS. NULL = unlimited (for cash/private).';
COMMENT ON COLUMN physio_plans.is_nhis_plan IS 'Whether this plan is for an NHIS patient (auto-set from encounter insurance type)';

-- Backfill: detect NHIS plans from encounter insurance_type
UPDATE physio_plans pp
SET is_nhis_plan = TRUE,
    sessions_approved = LEAST(COALESCE(pp.sessions_approved, 6), 6)
FROM visits v
WHERE v.id = pp.encounter_id
  AND (
    LOWER(v.insurance_type::text) LIKE '%nhis%'
    OR LOWER(v.insurance_type::text) = 'dhml'
    OR LOWER(v.insurance_type::text) = 'gifship'
    OR LOWER(v.payment_category::text) LIKE '%nhis%'
  )
  AND pp.is_nhis_plan IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_physio_plans_nhis
    ON physio_plans(is_nhis_plan)
    WHERE is_nhis_plan = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. NHIS Approval Queue Integration
--    NHIS physio plans must go through the nhis_approvals queue for
--    authorization code clearance before sessions can proceed.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE physio_plans
    ADD COLUMN IF NOT EXISTS nhis_approval_id UUID REFERENCES nhis_approvals(id),
    ADD COLUMN IF NOT EXISTS nhis_approval_status VARCHAR(20) DEFAULT NULL
        CHECK (nhis_approval_status IN ('pending', 'approved', 'rejected', 'expired', 'not_required')),
    ADD COLUMN IF NOT EXISTS nhis_authorization_code VARCHAR(100);

COMMENT ON COLUMN physio_plans.nhis_approval_id IS 'FK to nhis_approvals record for NHIS plans requiring pre-authorization';
COMMENT ON COLUMN physio_plans.nhis_approval_status IS 'Current NHIS approval status: pending, approved, rejected, expired, not_required';
COMMENT ON COLUMN physio_plans.nhis_authorization_code IS 'NHIS authorization code entered by NHIS admin upon approval';

-- Backfill: mark existing NHIS plans as needing approval if not yet set
UPDATE physio_plans
SET nhis_approval_status = 'not_required'
WHERE is_nhis_plan IS NOT TRUE
  AND nhis_approval_status IS NULL;

-- Existing NHIS plans that are already active get marked as approved (legacy)
UPDATE physio_plans
SET nhis_approval_status = 'approved'
WHERE is_nhis_plan = TRUE
  AND nhis_approval_status IS NULL
  AND status IN ('Active', 'Completed');

-- Existing NHIS plans that are pending get marked as pending approval
UPDATE physio_plans
SET nhis_approval_status = 'pending'
WHERE is_nhis_plan = TRUE
  AND nhis_approval_status IS NULL
  AND status NOT IN ('Active', 'Completed');

CREATE INDEX IF NOT EXISTS idx_physio_plans_nhis_approval
    ON physio_plans(nhis_approval_status)
    WHERE nhis_approval_status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Add 'Physiotherapy' to the service_type enum
--     The billing_items.item_type column uses service_type enum which lacks
--     'Physiotherapy'. Without this, billing fails with:
--     "invalid input value for enum service_type: 'Physiotherapy'"
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'public.service_type'::regtype
          AND enumlabel = 'Physiotherapy'
    ) THEN
        ALTER TYPE public.service_type ADD VALUE 'Physiotherapy';
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Auto-sync physio_plans.payment_status when billing_orders status changes
--     When a billing admin verifies payment (status → Paid/Paid_NHIS/etc.),
--     this trigger finds the linked physio_plan via billing_items and updates
--     its payment_status to 'paid' so sessions unlock automatically.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_physio_plan_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire when status changes to a paid state
    IF NEW.status IN ('Paid', 'Paid_NHIS', 'Paid_Retainership') AND
       (OLD.status IS NULL OR OLD.status NOT IN ('Paid', 'Paid_NHIS', 'Paid_Retainership')) AND
       NEW.source_module = 'physiotherapy' THEN

        -- Update physio_plans linked via billing_items.service_reference_id or item_id
        UPDATE physio_plans
        SET payment_status = 'paid',
            updated_at = now()
        WHERE plan_id IN (
            SELECT bi.service_reference_id
            FROM billing_items bi
            WHERE bi.billing_order_id = NEW.id
              AND bi.service_reference_id IS NOT NULL
              AND EXISTS (SELECT 1 FROM physio_plans pp WHERE pp.plan_id = bi.service_reference_id)
            UNION
            SELECT bi.item_id
            FROM billing_items bi
            WHERE bi.billing_order_id = NEW.id
              AND bi.item_id IS NOT NULL
              AND EXISTS (SELECT 1 FROM physio_plans pp WHERE pp.plan_id = bi.item_id)
        )
          AND payment_status != 'paid';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_physio_payment_on_billing ON billing_orders;

CREATE TRIGGER trg_sync_physio_payment_on_billing
    AFTER UPDATE OF status ON billing_orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_physio_plan_payment_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. SOAP Documentation — add structured objective/assessment/plan fields
--     to physio_sessions for international SOAP-based documentation.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE physio_sessions
    ADD COLUMN IF NOT EXISTS changes_since_last TEXT,
    ADD COLUMN IF NOT EXISTS swelling VARCHAR(20) DEFAULT NULL
        CHECK (swelling IN ('None', 'Mild', 'Moderate', 'Severe')),
    ADD COLUMN IF NOT EXISTS tenderness VARCHAR(20) DEFAULT NULL
        CHECK (tenderness IN ('None', 'Mild', 'Moderate', 'Severe')),
    ADD COLUMN IF NOT EXISTS functional_limitations TEXT,
    ADD COLUMN IF NOT EXISTS gait_assessment TEXT,
    ADD COLUMN IF NOT EXISTS progress_indicator VARCHAR(20) DEFAULT NULL
        CHECK (progress_indicator IN ('Improved', 'No_Change', 'Worse')),
    ADD COLUMN IF NOT EXISTS home_exercise_instructions TEXT,
    ADD COLUMN IF NOT EXISTS plan_for_next_visit TEXT;

COMMENT ON COLUMN physio_sessions.changes_since_last IS 'Subjective: changes patient reports since last session';
COMMENT ON COLUMN physio_sessions.swelling IS 'Objective: swelling assessment (None/Mild/Moderate/Severe)';
COMMENT ON COLUMN physio_sessions.tenderness IS 'Objective: tenderness assessment (None/Mild/Moderate/Severe)';
COMMENT ON COLUMN physio_sessions.functional_limitations IS 'Objective: functional limitations observed';
COMMENT ON COLUMN physio_sessions.gait_assessment IS 'Objective: gait assessment findings';
COMMENT ON COLUMN physio_sessions.progress_indicator IS 'Assessment: overall progress indicator (Improved/No_Change/Worse)';
COMMENT ON COLUMN physio_sessions.home_exercise_instructions IS 'Plan: home exercise programme instructions given';
COMMENT ON COLUMN physio_sessions.plan_for_next_visit IS 'Plan: planned approach for next visit';
