-- =============================================================================
-- PATCH: Add assigned_nurse_id to medication_schedule
-- Run this in Supabase Dashboard SQL Editor if migration 110 was already applied
-- =============================================================================
ALTER TABLE medication_schedule ADD COLUMN IF NOT EXISTS assigned_nurse_id UUID REFERENCES staff(id);
CREATE INDEX IF NOT EXISTS idx_med_schedule_nurse ON medication_schedule(assigned_nurse_id);
