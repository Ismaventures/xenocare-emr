-- Migration 190: Allow NULL encounter_id on clinical_requests
-- Direct appointment bookings (from encounter office) have no encounter_id yet.
-- The encounter is created later when the patient physically arrives and is checked in.
-- This relaxes the NOT NULL constraint so the direct booking insert can succeed.

ALTER TABLE public.clinical_requests
  ALTER COLUMN encounter_id DROP NOT NULL;
