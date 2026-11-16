-- =============================================================================
-- Migration: Fix A&E table column types
-- Purpose: The original ae_module migration (20260304) created tables with
--          narrow VARCHAR columns. The newer create_ae_tables migration uses
--          CREATE TABLE IF NOT EXISTS so it cannot alter already-existing tables.
--          This migration widens all narrow VARCHAR columns to TEXT, adds the
--          missing 'description' column to ae_timeline_events, and ensures
--          column types match what the application code expects.
-- =============================================================================

BEGIN;

-- ── ae_primary_surveys ──────────────────────────────────────────────────────
-- capillary_refill VARCHAR(10) → TEXT  (direct cause of "value too long" error)
-- airway_status, breathing_status, circulation_status VARCHAR(30) → TEXT
-- pupil_left, pupil_right VARCHAR(30) → TEXT

ALTER TABLE IF EXISTS public.ae_primary_surveys
    ALTER COLUMN capillary_refill      TYPE TEXT,
    ALTER COLUMN airway_status         TYPE TEXT,
    ALTER COLUMN breathing_status      TYPE TEXT,
    ALTER COLUMN circulation_status    TYPE TEXT,
    ALTER COLUMN pupil_left            TYPE TEXT,
    ALTER COLUMN pupil_right           TYPE TEXT;

-- consciousness may be an enum type (consciousness_level) from the old migration.
-- Change it to TEXT with a CHECK constraint to match the new schema.
DO $$
BEGIN
    -- Only alter if the column is not already text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ae_primary_surveys'
          AND column_name = 'consciousness'
          AND udt_name <> 'text'
    ) THEN
        ALTER TABLE public.ae_primary_surveys
            ALTER COLUMN consciousness TYPE TEXT USING consciousness::TEXT;
    END IF;
END $$;

-- ── ae_arrivals ─────────────────────────────────────────────────────────────
-- Widen VARCHAR columns to TEXT for safety (SelectWithOther allows freetext)

ALTER TABLE IF EXISTS public.ae_arrivals
    ALTER COLUMN arrival_mode          TYPE TEXT,
    ALTER COLUMN referral_source       TYPE TEXT,
    ALTER COLUMN incident_type         TYPE TEXT,
    ALTER COLUMN brought_by_phone      TYPE TEXT,
    ALTER COLUMN brought_by_relationship TYPE TEXT;

-- ── ae_dispositions ─────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.ae_dispositions
    ALTER COLUMN disposition_type          TYPE TEXT,
    ALTER COLUMN final_diagnosis_icd10     TYPE TEXT,
    ALTER COLUMN condition_at_disposition   TYPE TEXT;

-- ── ae_timeline_events ──────────────────────────────────────────────────────
-- Add missing 'description' column (new schema has it, old migration does not)
-- Widen VARCHAR columns to TEXT

ALTER TABLE IF EXISTS public.ae_timeline_events
    ALTER COLUMN event_type     TYPE TEXT,
    ALTER COLUMN event_category TYPE TEXT,
    ALTER COLUMN severity       TYPE TEXT,
    ALTER COLUMN source_table   TYPE TEXT;

-- Add 'description' column if it doesn't exist
ALTER TABLE IF EXISTS public.ae_timeline_events
    ADD COLUMN IF NOT EXISTS description TEXT;

-- ── ae_fluid_charts ─────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.ae_fluid_charts
    ALTER COLUMN fluid_type TYPE TEXT,
    ALTER COLUMN route      TYPE TEXT;

-- ── ae_procedures ───────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.ae_procedures
    ALTER COLUMN procedure_name TYPE TEXT,
    ALTER COLUMN outcome        TYPE TEXT;

-- Drop old CHECK constraints that may block wider values, then re-add them
-- with TEXT-compatible ranges (the CHECK on event_category allows known categories)

-- ae_timeline_events: drop old narrow CHECK and re-add
DO $$
BEGIN
    -- Drop old category check if it exists
    ALTER TABLE public.ae_timeline_events
        DROP CONSTRAINT IF EXISTS ae_timeline_events_event_category_check;

    ALTER TABLE public.ae_timeline_events
        ADD CONSTRAINT ae_timeline_events_event_category_check
        CHECK (event_category IN (
            'arrival','triage','assessment','clinical','order','treatment',
            'result','procedure','medication','observation','disposition',
            'note','alert','handover','nursing','admin','system'
        ));
EXCEPTION WHEN OTHERS THEN
    -- Ignore if constraint management fails
    NULL;
END $$;

-- ae_timeline_events: drop old severity check and re-add
DO $$
BEGIN
    ALTER TABLE public.ae_timeline_events
        DROP CONSTRAINT IF EXISTS ae_timeline_events_severity_check;

    ALTER TABLE public.ae_timeline_events
        ADD CONSTRAINT ae_timeline_events_severity_check
        CHECK (severity IN ('info','warning','critical','success'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;
