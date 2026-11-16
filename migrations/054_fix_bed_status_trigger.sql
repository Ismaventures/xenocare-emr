-- Fix bed status enum casing in triggers
-- The bed_status enum uses Title Case ('Available', 'Occupied', 'Cleaning', etc.)
-- but the triggers were using lowercase ('available', 'occupied', 'cleaning').
-- This caused the triggers to fail or not update the status correctly.

-- Function to update ward bed counts
CREATE OR REPLACE FUNCTION update_ward_bed_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the ward's available beds count
    UPDATE wards
    SET
        total_beds = (SELECT COUNT(*) FROM beds WHERE ward_id = COALESCE(NEW.ward_id, OLD.ward_id) AND is_active = TRUE),
        available_beds = (SELECT COUNT(*) FROM beds WHERE ward_id = COALESCE(NEW.ward_id, OLD.ward_id) AND is_active = TRUE AND status = 'Available'),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.ward_id, OLD.ward_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to handle bed assignment on admission
CREATE OR REPLACE FUNCTION assign_bed_on_admission()
RETURNS TRIGGER AS $$
BEGIN
    -- If a bed is being assigned
    IF NEW.current_bed_id IS NOT NULL AND (OLD.current_bed_id IS NULL OR NEW.current_bed_id != OLD.current_bed_id) THEN
        -- Release old bed if there was one
        IF OLD.current_bed_id IS NOT NULL THEN
            UPDATE beds
            SET status = 'Cleaning',
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
        SET status = 'Cleaning',
            current_patient_id = NULL,
            current_admission_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
