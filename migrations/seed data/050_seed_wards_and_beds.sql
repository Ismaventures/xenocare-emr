-- Migration: Seed Wards and Beds
-- Version: 050
-- Date: 2026-01-03
-- Description: Fixes ward bed counting logic, adds gender restriction, and seeds data

-- 1. Add gender_restriction column to wards
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wards' AND column_name = 'gender_restriction') THEN
        ALTER TABLE wards ADD COLUMN gender_restriction VARCHAR(20) CHECK (gender_restriction IN ('male', 'female', 'none'));
    END IF;
END $$;

-- 2. Fix the trigger function to NOT overwrite total_beds (which should be the capacity)
CREATE OR REPLACE FUNCTION update_ward_bed_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update available_beds, leave total_beds as the capacity set by admin
    UPDATE wards
    SET
        available_beds = (
            SELECT COUNT(*) FROM beds
            WHERE ward_id = COALESCE(NEW.ward_id, OLD.ward_id)
            AND is_active = TRUE
            AND status = 'available'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.ward_id, OLD.ward_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3. Create helper function to generate beds (can be used by app later)
CREATE OR REPLACE FUNCTION generate_beds_for_ward(p_ward_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_ward_record RECORD;
    v_bed_count INTEGER;
    v_beds_created INTEGER := 0;
    v_i INTEGER;
BEGIN
    SELECT * INTO v_ward_record FROM wards WHERE id = p_ward_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Count existing beds
    SELECT COUNT(*) INTO v_bed_count FROM beds WHERE ward_id = p_ward_id;

    -- Create missing beds
    IF v_bed_count < v_ward_record.total_beds THEN
        FOR v_i IN (v_bed_count + 1)..v_ward_record.total_beds LOOP
            INSERT INTO beds (
                ward_id,
                bed_number,
                bed_type,
                status,
                daily_rate,
                features,
                is_active
            ) VALUES (
                p_ward_id,
                v_ward_record.code || '-' || LPAD(v_i::TEXT, 3, '0'),
                CASE
                    WHEN v_ward_record.ward_type = 'icu' THEN 'icu'
                    WHEN v_ward_record.ward_type = 'pediatric' THEN 'pediatric'
                    WHEN v_ward_record.ward_type = 'maternity' THEN 'standard'
                    ELSE 'standard'
                END,
                'available',
                CASE
                    WHEN v_ward_record.ward_type = 'icu' THEN 500.00
                    WHEN v_ward_record.ward_type = 'pediatric' THEN 150.00
                    WHEN v_ward_record.ward_type = 'maternity' THEN 200.00
                    ELSE 100.00
                END,
                CASE
                    WHEN v_ward_record.ward_type = 'icu' THEN '["oxygen", "suction", "cardiac_monitor", "ventilator"]'::jsonb
                    WHEN v_ward_record.ward_type = 'maternity' THEN '["fetal_monitor"]'::jsonb
                    ELSE '["oxygen", "call_bell"]'::jsonb
                END,
                TRUE
            ) ON CONFLICT (ward_id, bed_number) DO NOTHING;
            v_beds_created := v_beds_created + 1;
        END LOOP;
    END IF;

    RETURN v_beds_created;
END;
$$ LANGUAGE plpgsql;

-- 4. Seed Data
DO $$
DECLARE
    v_facility_id UUID;
    v_ward_record RECORD;
BEGIN
    -- Get or Create Facility
    SELECT id INTO v_facility_id FROM facilities LIMIT 1;

    IF v_facility_id IS NULL THEN
        INSERT INTO facilities (code, name, facility_type, is_active)
        VALUES ('FAC001', 'General Hospital', 'hospital', TRUE)
        RETURNING id INTO v_facility_id;
    END IF;

    -- Seed Wards
    -- Male Ward
    IF NOT EXISTS (SELECT 1 FROM wards WHERE code = 'MW01' AND facility_id = v_facility_id) THEN
        INSERT INTO wards (facility_id, name, code, ward_type, total_beds, gender_restriction)
        VALUES (v_facility_id, 'Male Ward', 'MW01', 'general', 20, 'male');
    END IF;

    -- Female Ward
    IF NOT EXISTS (SELECT 1 FROM wards WHERE code = 'FW01' AND facility_id = v_facility_id) THEN
        INSERT INTO wards (facility_id, name, code, ward_type, total_beds, gender_restriction)
        VALUES (v_facility_id, 'Female Ward', 'FW01', 'general', 20, 'female');
    END IF;

    -- Pediatric Ward
    IF NOT EXISTS (SELECT 1 FROM wards WHERE code = 'PW01' AND facility_id = v_facility_id) THEN
        INSERT INTO wards (facility_id, name, code, ward_type, total_beds, gender_restriction)
        VALUES (v_facility_id, 'Pediatric Ward', 'PW01', 'pediatric', 15, 'none');
    END IF;

    -- Maternity Ward
    IF NOT EXISTS (SELECT 1 FROM wards WHERE code = 'MAT01' AND facility_id = v_facility_id) THEN
        INSERT INTO wards (facility_id, name, code, ward_type, total_beds, gender_restriction)
        VALUES (v_facility_id, 'Maternity Ward', 'MAT01', 'maternity', 10, 'female');
    END IF;

    -- ICU
    IF NOT EXISTS (SELECT 1 FROM wards WHERE code = 'ICU01' AND facility_id = v_facility_id) THEN
        INSERT INTO wards (facility_id, name, code, ward_type, total_beds, gender_restriction)
        VALUES (v_facility_id, 'Intensive Care Unit', 'ICU01', 'icu', 5, 'none');
    END IF;

    -- Populate Beds for ALL Wards
    FOR v_ward_record IN SELECT * FROM wards WHERE facility_id = v_facility_id LOOP
        PERFORM generate_beds_for_ward(v_ward_record.id);
        RAISE NOTICE 'Checked/Generated beds for ward %', v_ward_record.name;
    END LOOP;

END $$;
