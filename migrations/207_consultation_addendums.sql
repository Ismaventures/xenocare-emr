-- =============================================================================
-- MIGRATION 207: CONSULTATION ADDENDUMS
-- =============================================================================
-- Creates the consultation_addendums table for adding notes to existing
-- specialty consultations without overwriting original records.
--
-- This is the standard EMR pattern:
--   - Original consultation record is immutable (clinico-legal requirement)
--   - Addendums are append-only notes linked to the original record
--   - All addendums are timestamped and author-attributed
-- =============================================================================

CREATE TABLE IF NOT EXISTS consultation_addendums (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id  UUID NOT NULL,
  note_text        TEXT NOT NULL,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookup by consultation
CREATE INDEX IF NOT EXISTS idx_consultation_addendums_consultation
  ON consultation_addendums (consultation_id, created_at ASC);

-- Index for lookup by staff
CREATE INDEX IF NOT EXISTS idx_consultation_addendums_staff
  ON consultation_addendums (created_by);

-- Row Level Security
ALTER TABLE consultation_addendums ENABLE ROW LEVEL SECURITY;

-- Open access policy (consistent with other tables in this app).
-- Clinical data access is controlled at the application layer.
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

COMMENT ON TABLE consultation_addendums IS
  'Append-only addendum notes for specialty consultations. '
  'Original records are immutable; doctors use addendums to document '
  'subsequent findings, corrections, or follow-up notes.';
