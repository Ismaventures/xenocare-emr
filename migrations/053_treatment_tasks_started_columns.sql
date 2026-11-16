-- Migration 053: Add started_at and started_by columns to treatment_tasks
-- Fixes PGRST204 error: "Could not find the 'started_at' column of 'treatment_tasks'"

-- Add started_at column for tracking when a task was started
ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Add started_by column for tracking who started the task
ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS started_by UUID REFERENCES staff(id);

-- Add additional task columns that might be expected by the application
ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS instructions TEXT;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS medication_name TEXT;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS dosage TEXT;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS route TEXT;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';

ALTER TABLE treatment_tasks
ADD COLUMN IF NOT EXISTS execution_notes TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_treatment_tasks_started_at 
ON treatment_tasks(started_at) 
WHERE started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_treatment_tasks_status_plan 
ON treatment_tasks(plan_id, status);

COMMENT ON COLUMN treatment_tasks.started_at IS 'Timestamp when the task was started';
COMMENT ON COLUMN treatment_tasks.started_by IS 'Staff member who started the task';
COMMENT ON COLUMN treatment_tasks.title IS 'Human-readable task title';
COMMENT ON COLUMN treatment_tasks.sequence_order IS 'Order in which tasks should be executed';
