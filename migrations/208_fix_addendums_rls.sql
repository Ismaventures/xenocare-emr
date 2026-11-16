-- =============================================================================
-- MIGRATION 208: FIX CONSULTATION ADDENDUMS RLS
-- =============================================================================
-- Migration 207 created the consultation_addendums table with policies scoped
-- to `TO authenticated` (Supabase Auth JWT role). This app uses the anon key
-- without Supabase Auth, which runs as the `anon` role and gets 403 Forbidden.
--
-- This migration replaces those restrictive policies with open access policies
-- consistent with every other table in this application.
-- =============================================================================

-- Ensure table exists (idempotent in case 207 was never applied)
CREATE TABLE IF NOT EXISTS consultation_addendums (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id  UUID NOT NULL,
  note_text        TEXT NOT NULL,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_addendums_consultation
  ON consultation_addendums (consultation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_consultation_addendums_staff
  ON consultation_addendums (created_by);

-- Enable RLS (safe to call multiple times)
ALTER TABLE consultation_addendums ENABLE ROW LEVEL SECURITY;

-- Drop the old restrictive policies if they were created by migration 207
DROP POLICY IF EXISTS "Staff can read addendums" ON consultation_addendums;
DROP POLICY IF EXISTS "Staff can add addendums" ON consultation_addendums;

-- Create open access policy (consistent with specialty_careplans, careplan_sessions, etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'consultation_addendums'
      AND policyname = 'consultation_addendums_all'
  ) THEN
    CREATE POLICY consultation_addendums_all
      ON consultation_addendums FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
