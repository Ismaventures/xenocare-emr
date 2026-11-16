-- Add Nutrition to queue_location if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'queue_location' AND e.enumlabel = 'Nutrition') THEN
        ALTER TYPE "public"."queue_location" ADD VALUE 'Nutrition';
    END IF;
END $$;
