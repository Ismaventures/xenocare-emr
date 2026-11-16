-- =============================================================================
-- Migration 208: Extend request_status_enum for radiology workflow
-- =============================================================================

DO $$
BEGIN
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Ordered';
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Scheduled';
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Imaging Completed';
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Awaiting Report';
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Preliminary Report';
  ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'Final Report';
END $$;
