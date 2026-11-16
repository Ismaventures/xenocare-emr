-- Fix bed status on discharge to be 'Available' instead of 'Cleaning'
-- The user expects the bed to be immediately available for assignment after discharge.

CREATE OR REPLACE FUNCTION assign_bed_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    -- If a bed is being assigned
    IF NEW.current_bed_id IS NOT NULL AND (OLD.current_bed_id IS NULL OR NEW.current_bed_id != OLD.current_bed_id) THEN
        -- Release old bed if there was one
        IF OLD.current_bed_id IS NOT NULL THEN
            UPDATE beds
            SET status = 'Available', -- Changed from 'Cleaning' to 'Available'
                current_patient_id = NULL,
                current_admission_id = NULL,
                updated_at = NOW()
            WHERE id = OLD.current_bed_id;
        END IF;

        -- Assign new bed
        UPDATE beds
        SET status = 'Occupied',
            current_patient_id = NEW.patient_id,
            current_admission_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;

    -- If admission is being discharged, release the bed
    IF NEW.admission_status IN ('discharged', 'transferred', 'deceased')
       AND OLD.admission_status NOT IN ('discharged', 'transferred', 'deceased') THEN
        UPDATE beds
        SET status = 'Available', -- Changed from 'Cleaning' to 'Available'
            current_patient_id = NULL,
            current_admission_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
