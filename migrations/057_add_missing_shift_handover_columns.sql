-- =============================================================================
-- Migration 057: Ensure shift_handovers has all required columns
-- =============================================================================
-- 
-- The shift_handovers table may be missing columns that the application expects.
-- This migration adds any missing columns.
-- =============================================================================

-- Add all columns that the application expects
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS handover_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS outgoing_shift VARCHAR(20);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS incoming_shift VARCHAR(20);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS patient_status TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS consciousness_level VARCHAR(50);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS mobility_status VARCHAR(50);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS pending_tasks JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS isolation_precautions TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS fall_risk_level VARCHAR(20);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS medication_due JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS investigations_pending JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS last_vitals JSONB;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS vitals_trend TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS iv_access JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS drains_catheters JSONB DEFAULT '[]';
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS diet_type VARCHAR(100);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS feeding_route VARCHAR(50);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS last_meal_time TIMESTAMPTZ;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS concerns TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS follow_up_actions TEXT;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS outgoing_nurse_id UUID REFERENCES staff(id);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS incoming_nurse_id UUID REFERENCES staff(id);
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS handover_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT FALSE;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE shift_handovers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure the primary key column exists with the correct name
-- The app expects 'handover_id' as the PK column name
DO $$
BEGIN
  -- Check if 'id' column exists but 'handover_id' doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'handover_id'
  ) THEN
    -- Rename id to handover_id
    ALTER TABLE shift_handovers RENAME COLUMN id TO handover_id;
    RAISE NOTICE 'Renamed id column to handover_id';
  END IF;
  
  -- If neither exists, add handover_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'handover_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shift_handovers' AND column_name = 'id'
  ) THEN
    ALTER TABLE shift_handovers ADD COLUMN handover_id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    RAISE NOTICE 'Added handover_id column';
  END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_handovers_outgoing_nurse ON shift_handovers(outgoing_nurse_id);
CREATE INDEX IF NOT EXISTS idx_handovers_incoming_nurse ON shift_handovers(incoming_nurse_id);
CREATE INDEX IF NOT EXISTS idx_handovers_date ON shift_handovers(handover_date DESC);
CREATE INDEX IF NOT EXISTS idx_handovers_unacknowledged ON shift_handovers(is_acknowledged) WHERE is_acknowledged = FALSE;

COMMENT ON TABLE shift_handovers IS 'Nursing shift handover documentation with all required columns';
