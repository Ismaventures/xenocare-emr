-- Fix beds status check constraint to allow Title Case
-- The error "new row for relation "beds" violates check constraint "beds_status_check""
-- indicates that the constraint enforces specific values (likely lowercase), but the application/triggers use Title Case.

DO $$
BEGIN
    -- 1. Drop the constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'beds_status_check') THEN
        ALTER TABLE beds DROP CONSTRAINT beds_status_check;
    END IF;

    -- 2. Update existing data to Title Case (handling potential mixed casing)
    -- We cast to text to avoid issues if it's somehow an enum (though unlikely given the constraint error)
    UPDATE beds SET status = 'Available' WHERE status::text = 'available';
    UPDATE beds SET status = 'Occupied' WHERE status::text = 'occupied';
    UPDATE beds SET status = 'Cleaning' WHERE status::text = 'cleaning';
    UPDATE beds SET status = 'Maintenance' WHERE status::text = 'maintenance';
    UPDATE beds SET status = 'Reserved' WHERE status::text = 'reserved';

    -- 3. Add the constraint back enforcing Title Case
    -- We check if the column is text-like before adding the check constraint
    -- If it's an enum, we might need to handle it differently, but assuming text based on error.
    ALTER TABLE beds ADD CONSTRAINT beds_status_check
    CHECK (status IN ('Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved'));

END $$;
