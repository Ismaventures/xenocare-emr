-- Add Nutrition queue location for nutrition specialty routing.
-- Needed for [SPECIALTY_NEXT:Nutrition] handoff from Nursing queue.
DO $$
BEGIN
  ALTER TYPE queue_location ADD VALUE IF NOT EXISTS 'Nutrition';
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
