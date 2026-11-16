-- ============================================================================
-- Migration: Fix RLS Policies for Wards and Procedures
-- 
-- Issue: Doctors cannot see wards in the consultation form or create
-- procedures because RLS restricts to facility_id which may not be set.
--
-- Solution: Add permissive policies for all authenticated clinical staff
-- ============================================================================

-- ============================================================================
-- PART 1: FIX WARDS RLS
-- ============================================================================

-- Drop restrictive policy and add permissive one
DROP POLICY IF EXISTS "Users can view wards in their facility" ON wards;
DROP POLICY IF EXISTS "All authenticated can view wards" ON wards;

-- Allow all authenticated users to view wards (for selection in forms)
CREATE POLICY "All authenticated can view wards" ON wards
    FOR SELECT TO authenticated
    USING (true);

-- Keep the admin management policy
DROP POLICY IF EXISTS "Admins can manage wards" ON wards;
CREATE POLICY "Admins can manage wards" ON wards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Also ensure RLS is enabled
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

-- Grant select to authenticated users
GRANT SELECT ON wards TO authenticated;

-- ============================================================================
-- PART 2: FIX PROCEDURES RLS
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Clinical staff can view procedures" ON procedures;
DROP POLICY IF EXISTS "Doctors can manage procedures" ON procedures;
DROP POLICY IF EXISTS "All authenticated can view procedures" ON procedures;
DROP POLICY IF EXISTS "Clinical staff can manage procedures" ON procedures;

-- Allow all authenticated users to view procedures
CREATE POLICY "All authenticated can view procedures" ON procedures
    FOR SELECT TO authenticated
    USING (true);

-- Allow doctors and clinical staff to create/update procedures
CREATE POLICY "Clinical staff can manage procedures" ON procedures
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'doctor', 'nurse', 'medical_director')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'doctor', 'nurse', 'medical_director')
        )
    );

-- Ensure RLS is enabled
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON procedures TO authenticated;

-- ============================================================================
-- PART 3: FIX PROCEDURE_CONSUMABLES RLS
-- ============================================================================

DROP POLICY IF EXISTS "Clinical staff can view consumables" ON procedure_consumables;
DROP POLICY IF EXISTS "Clinical staff can manage consumables" ON procedure_consumables;
DROP POLICY IF EXISTS "All authenticated can view consumables" ON procedure_consumables;
DROP POLICY IF EXISTS "All authenticated can manage consumables" ON procedure_consumables;

-- Allow all authenticated users to view consumables
CREATE POLICY "All authenticated can view consumables" ON procedure_consumables
    FOR SELECT TO authenticated
    USING (true);

-- Allow clinical staff to manage consumables
CREATE POLICY "All authenticated can manage consumables" ON procedure_consumables
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'doctor', 'nurse', 'medical_director')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'doctor', 'nurse', 'medical_director')
        )
    );

-- Ensure RLS is enabled
ALTER TABLE procedure_consumables ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON procedure_consumables TO authenticated;

-- ============================================================================
-- PART 4: VERIFY WARDS HAVE DATA
-- ============================================================================

-- Check if wards exist and add default if empty
DO $$
DECLARE
    v_facility_id UUID;
    v_ward_count INTEGER;
BEGIN
    -- Count existing wards
    SELECT COUNT(*) INTO v_ward_count FROM wards;
    
    IF v_ward_count = 0 THEN
        -- Get or create a facility
        SELECT id INTO v_facility_id FROM facilities LIMIT 1;
        
        IF v_facility_id IS NULL THEN
            INSERT INTO facilities (code, name, facility_type, is_active)
            VALUES ('FAC001', 'Main Hospital', 'hospital', TRUE)
            RETURNING id INTO v_facility_id;
        END IF;
        
        -- Insert default wards
        INSERT INTO wards (facility_id, name, code, ward_type, total_beds, available_beds, is_active)
        VALUES 
            (v_facility_id, 'Male General Ward', 'MGW01', 'general', 20, 20, TRUE),
            (v_facility_id, 'Female General Ward', 'FGW01', 'general', 20, 20, TRUE),
            (v_facility_id, 'Pediatric Ward', 'PED01', 'pediatric', 15, 15, TRUE),
            (v_facility_id, 'Maternity Ward', 'MAT01', 'maternity', 10, 10, TRUE),
            (v_facility_id, 'Intensive Care Unit', 'ICU01', 'icu', 8, 8, TRUE),
            (v_facility_id, 'Surgical Ward', 'SUR01', 'surgical', 15, 15, TRUE),
            (v_facility_id, 'Emergency Ward', 'EMR01', 'emergency', 10, 10, TRUE)
        ON CONFLICT (code) DO NOTHING;
        
        RAISE NOTICE 'Added default wards for facility %', v_facility_id;
    ELSE
        RAISE NOTICE 'Wards already exist (count: %)', v_ward_count;
    END IF;
END $$;

-- Update any wards with NULL is_active to TRUE
UPDATE wards SET is_active = TRUE WHERE is_active IS NULL;

COMMIT;
