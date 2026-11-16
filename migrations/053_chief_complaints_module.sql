-- =============================================================================
-- Migration 046: Chief Complaints Module
-- Structured chief complaints capture with encounter-centric architecture
-- =============================================================================

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

-- Chief Complaint Categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_category') THEN
        CREATE TYPE complaint_category AS ENUM (
            'General',
            'Pain',
            'Respiratory',
            'Cardiovascular',
            'Gastrointestinal',
            'Neurological',
            'Genitourinary',
            'Obstetrics_Gynecology',
            'Musculoskeletal',
            'Dermatology',
            'Mental_Health',
            'Trauma_Emergency'
        );
    END IF;
END $$;

-- Duration Unit
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'duration_unit') THEN
        CREATE TYPE duration_unit AS ENUM (
            'Hours',
            'Days',
            'Weeks',
            'Months'
        );
    END IF;
END $$;

-- ============================================================================
-- PART 2: CHIEF COMPLAINTS CATALOGUE (Predefined Complaints)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chief_complaint_catalogue (
    complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_name VARCHAR(100) NOT NULL,
    complaint_code VARCHAR(20) UNIQUE NOT NULL,
    category complaint_category NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_complaint_category ON chief_complaint_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_complaint_active ON chief_complaint_catalogue(is_active);

-- ============================================================================
-- PART 3: PATIENT CHIEF COMPLAINTS (Encounter-linked)
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_chief_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient & Encounter Links (Mandatory)
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id),
    emr_number VARCHAR(50) NOT NULL,
    encounter_id UUID NOT NULL REFERENCES visits(id),
    consultation_id UUID REFERENCES consultations(consultation_id),
    
    -- Complaint Reference
    complaint_id UUID NOT NULL REFERENCES chief_complaint_catalogue(complaint_id),
    
    -- Primary Flag (Only one per encounter can be primary)
    is_primary BOOLEAN DEFAULT false,
    
    -- Duration
    duration_value INTEGER NOT NULL CHECK (duration_value > 0),
    duration_unit duration_unit NOT NULL DEFAULT 'Days',
    
    -- Additional Notes (optional)
    notes TEXT,
    
    -- Audit
    recorded_by UUID REFERENCES staff(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique complaint per encounter
    CONSTRAINT unique_complaint_per_encounter UNIQUE (encounter_id, complaint_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pcc_patient ON patient_chief_complaints(patient_id);
CREATE INDEX IF NOT EXISTS idx_pcc_emr ON patient_chief_complaints(emr_number);
CREATE INDEX IF NOT EXISTS idx_pcc_encounter ON patient_chief_complaints(encounter_id);
CREATE INDEX IF NOT EXISTS idx_pcc_consultation ON patient_chief_complaints(consultation_id);
CREATE INDEX IF NOT EXISTS idx_pcc_primary ON patient_chief_complaints(encounter_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- PART 4: ENSURE ONLY ONE PRIMARY PER ENCOUNTER (Trigger)
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_single_primary_complaint()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting as primary, unset others for this encounter
    IF NEW.is_primary = true THEN
        UPDATE patient_chief_complaints 
        SET is_primary = false, updated_at = NOW()
        WHERE encounter_id = NEW.encounter_id 
          AND id != NEW.id 
          AND is_primary = true;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_primary_complaint ON patient_chief_complaints;
CREATE TRIGGER trg_single_primary_complaint
    BEFORE INSERT OR UPDATE ON patient_chief_complaints
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_primary_complaint();

-- ============================================================================
-- PART 5: SEED STANDARD CHIEF COMPLAINTS
-- ============================================================================

INSERT INTO chief_complaint_catalogue (complaint_name, complaint_code, category, display_order) VALUES
    -- General
    ('Fever', 'GEN-001', 'General', 1),
    ('Weakness', 'GEN-002', 'General', 2),
    ('Fatigue', 'GEN-003', 'General', 3),
    ('Malaise', 'GEN-004', 'General', 4),
    ('Weight Loss', 'GEN-005', 'General', 5),
    ('Weight Gain', 'GEN-006', 'General', 6),
    ('Night Sweats', 'GEN-007', 'General', 7),
    ('Loss of Appetite', 'GEN-008', 'General', 8),
    
    -- Pain
    ('Headache', 'PAIN-001', 'Pain', 10),
    ('Chest Pain', 'PAIN-002', 'Pain', 11),
    ('Abdominal Pain', 'PAIN-003', 'Pain', 12),
    ('Back Pain', 'PAIN-004', 'Pain', 13),
    ('Neck Pain', 'PAIN-005', 'Pain', 14),
    ('Generalized Body Pain', 'PAIN-006', 'Pain', 15),
    ('Flank Pain', 'PAIN-007', 'Pain', 16),
    ('Pelvic Pain', 'PAIN-008', 'Pain', 17),
    
    -- Respiratory
    ('Cough', 'RESP-001', 'Respiratory', 20),
    ('Shortness of Breath', 'RESP-002', 'Respiratory', 21),
    ('Wheezing', 'RESP-003', 'Respiratory', 22),
    ('Sore Throat', 'RESP-004', 'Respiratory', 23),
    ('Runny Nose', 'RESP-005', 'Respiratory', 24),
    ('Nasal Congestion', 'RESP-006', 'Respiratory', 25),
    ('Coughing Blood', 'RESP-007', 'Respiratory', 26),
    ('Difficulty Breathing', 'RESP-008', 'Respiratory', 27),
    
    -- Cardiovascular
    ('Palpitations', 'CARD-001', 'Cardiovascular', 30),
    ('Leg Swelling', 'CARD-002', 'Cardiovascular', 31),
    ('Fainting', 'CARD-003', 'Cardiovascular', 32),
    ('Fast Heartbeat', 'CARD-004', 'Cardiovascular', 33),
    ('Slow Heartbeat', 'CARD-005', 'Cardiovascular', 34),
    ('Irregular Heartbeat', 'CARD-006', 'Cardiovascular', 35),
    
    -- Gastrointestinal
    ('Vomiting', 'GI-001', 'Gastrointestinal', 40),
    ('Nausea', 'GI-002', 'Gastrointestinal', 41),
    ('Diarrhea', 'GI-003', 'Gastrointestinal', 42),
    ('Constipation', 'GI-004', 'Gastrointestinal', 43),
    ('Bloating', 'GI-005', 'Gastrointestinal', 44),
    ('Heartburn', 'GI-006', 'Gastrointestinal', 45),
    ('Difficulty Swallowing', 'GI-007', 'Gastrointestinal', 46),
    ('Blood in Stool', 'GI-008', 'Gastrointestinal', 47),
    ('Black Stool', 'GI-009', 'Gastrointestinal', 48),
    ('Jaundice', 'GI-010', 'Gastrointestinal', 49),
    
    -- Neurological
    ('Dizziness', 'NEURO-001', 'Neurological', 50),
    ('Seizure', 'NEURO-002', 'Neurological', 51),
    ('Loss of Consciousness', 'NEURO-003', 'Neurological', 52),
    ('Numbness', 'NEURO-004', 'Neurological', 53),
    ('Tingling', 'NEURO-005', 'Neurological', 54),
    ('Tremors', 'NEURO-006', 'Neurological', 55),
    ('Memory Loss', 'NEURO-007', 'Neurological', 56),
    ('Confusion', 'NEURO-008', 'Neurological', 57),
    ('Vision Changes', 'NEURO-009', 'Neurological', 58),
    ('Speech Difficulty', 'NEURO-010', 'Neurological', 59),
    
    -- Genitourinary
    ('Painful Urination', 'GU-001', 'Genitourinary', 60),
    ('Frequent Urination', 'GU-002', 'Genitourinary', 61),
    ('Blood in Urine', 'GU-003', 'Genitourinary', 62),
    ('Urinary Incontinence', 'GU-004', 'Genitourinary', 63),
    ('Difficulty Urinating', 'GU-005', 'Genitourinary', 64),
    ('Genital Discharge', 'GU-006', 'Genitourinary', 65),
    ('Genital Sores', 'GU-007', 'Genitourinary', 66),
    
    -- Obstetrics & Gynecology
    ('Lower Abdominal Pain', 'OBG-001', 'Obstetrics_Gynecology', 70),
    ('Vaginal Bleeding', 'OBG-002', 'Obstetrics_Gynecology', 71),
    ('Missed Period', 'OBG-003', 'Obstetrics_Gynecology', 72),
    ('Vaginal Discharge', 'OBG-004', 'Obstetrics_Gynecology', 73),
    ('Breast Lump', 'OBG-005', 'Obstetrics_Gynecology', 74),
    ('Breast Pain', 'OBG-006', 'Obstetrics_Gynecology', 75),
    ('Menstrual Irregularity', 'OBG-007', 'Obstetrics_Gynecology', 76),
    ('Pregnancy Test Request', 'OBG-008', 'Obstetrics_Gynecology', 77),
    
    -- Musculoskeletal
    ('Joint Pain', 'MSK-001', 'Musculoskeletal', 80),
    ('Injury', 'MSK-002', 'Musculoskeletal', 81),
    ('Muscle Pain', 'MSK-003', 'Musculoskeletal', 82),
    ('Joint Swelling', 'MSK-004', 'Musculoskeletal', 83),
    ('Limited Range of Motion', 'MSK-005', 'Musculoskeletal', 84),
    ('Bone Pain', 'MSK-006', 'Musculoskeletal', 85),
    
    -- Dermatology
    ('Rash', 'DERM-001', 'Dermatology', 90),
    ('Itching', 'DERM-002', 'Dermatology', 91),
    ('Skin Lesion', 'DERM-003', 'Dermatology', 92),
    ('Hair Loss', 'DERM-004', 'Dermatology', 93),
    ('Skin Discoloration', 'DERM-005', 'Dermatology', 94),
    ('Wound', 'DERM-006', 'Dermatology', 95),
    ('Abscess', 'DERM-007', 'Dermatology', 96),
    
    -- Mental Health
    ('Anxiety', 'MH-001', 'Mental_Health', 100),
    ('Depression', 'MH-002', 'Mental_Health', 101),
    ('Insomnia', 'MH-003', 'Mental_Health', 102),
    ('Suicidal Thoughts', 'MH-004', 'Mental_Health', 103),
    ('Hallucinations', 'MH-005', 'Mental_Health', 104),
    ('Aggressive Behavior', 'MH-006', 'Mental_Health', 105),
    ('Substance Abuse', 'MH-007', 'Mental_Health', 106),
    
    -- Trauma / Emergency
    ('Road Traffic Accident', 'TRA-001', 'Trauma_Emergency', 110),
    ('Fall', 'TRA-002', 'Trauma_Emergency', 111),
    ('Assault', 'TRA-003', 'Trauma_Emergency', 112),
    ('Burns', 'TRA-004', 'Trauma_Emergency', 113),
    ('Drowning', 'TRA-005', 'Trauma_Emergency', 114),
    ('Electric Shock', 'TRA-006', 'Trauma_Emergency', 115),
    ('Poisoning', 'TRA-007', 'Trauma_Emergency', 116),
    ('Snake Bite', 'TRA-008', 'Trauma_Emergency', 117),
    ('Dog Bite', 'TRA-009', 'Trauma_Emergency', 118)
ON CONFLICT (complaint_code) DO UPDATE SET
    complaint_name = EXCLUDED.complaint_name,
    category = EXCLUDED.category,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- ============================================================================
-- PART 6: VIEW FOR EASY QUERYING
-- ============================================================================

CREATE OR REPLACE VIEW v_patient_complaints AS
SELECT 
    pcc.id,
    pcc.patient_id,
    pcc.emr_number,
    pcc.encounter_id,
    pcc.consultation_id,
    pcc.is_primary,
    pcc.duration_value,
    pcc.duration_unit,
    pcc.notes,
    pcc.created_at,
    ccc.complaint_id,
    ccc.complaint_name,
    ccc.complaint_code,
    ccc.category,
    p.first_name,
    p.surname,
    v.encounter_number,
    v.encounter_date
FROM patient_chief_complaints pcc
JOIN chief_complaint_catalogue ccc ON pcc.complaint_id = ccc.complaint_id
JOIN patients p ON pcc.patient_id = p.patient_id
JOIN visits v ON pcc.encounter_id = v.id;

-- ============================================================================
-- PART 7: RLS POLICIES
-- ============================================================================

ALTER TABLE chief_complaint_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_chief_complaints ENABLE ROW LEVEL SECURITY;

-- Catalogue: All authenticated users can read
DROP POLICY IF EXISTS catalogue_select_all ON chief_complaint_catalogue;
CREATE POLICY catalogue_select_all ON chief_complaint_catalogue
    FOR SELECT TO authenticated
    USING (true);

-- Catalogue: Only super admin can modify
DROP POLICY IF EXISTS catalogue_modify_super_admin ON chief_complaint_catalogue;
CREATE POLICY catalogue_modify_super_admin ON chief_complaint_catalogue
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM staff s WHERE s.user_id = auth.uid() AND s.role = 'super_admin')
    );

-- Patient Complaints: All authenticated can read
DROP POLICY IF EXISTS pcc_select_all ON patient_chief_complaints;
CREATE POLICY pcc_select_all ON patient_chief_complaints
    FOR SELECT TO authenticated
    USING (true);

-- Patient Complaints: All authenticated can insert (doctors recording complaints)
DROP POLICY IF EXISTS pcc_insert_all ON patient_chief_complaints;
CREATE POLICY pcc_insert_all ON patient_chief_complaints
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Patient Complaints: All authenticated can update
DROP POLICY IF EXISTS pcc_update_all ON patient_chief_complaints;
CREATE POLICY pcc_update_all ON patient_chief_complaints
    FOR UPDATE TO authenticated
    USING (true);

-- Patient Complaints: All authenticated can delete
DROP POLICY IF EXISTS pcc_delete_all ON patient_chief_complaints;
CREATE POLICY pcc_delete_all ON patient_chief_complaints
    FOR DELETE TO authenticated
    USING (true);

-- ============================================================================
-- PART 8: FUNCTION TO GET COMPLAINTS FOR ENCOUNTER
-- ============================================================================

CREATE OR REPLACE FUNCTION get_encounter_complaints(p_encounter_id UUID)
RETURNS TABLE (
    id UUID,
    complaint_id UUID,
    complaint_name VARCHAR(100),
    complaint_code VARCHAR(20),
    category complaint_category,
    is_primary BOOLEAN,
    duration_value INTEGER,
    duration_unit duration_unit,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pcc.id,
        ccc.complaint_id,
        ccc.complaint_name,
        ccc.complaint_code,
        ccc.category,
        pcc.is_primary,
        pcc.duration_value,
        pcc.duration_unit,
        pcc.notes
    FROM patient_chief_complaints pcc
    JOIN chief_complaint_catalogue ccc ON pcc.complaint_id = ccc.complaint_id
    WHERE pcc.encounter_id = p_encounter_id
    ORDER BY pcc.is_primary DESC, ccc.display_order;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE chief_complaint_catalogue IS 'Predefined standardized chief complaints for structured clinical documentation';
COMMENT ON TABLE patient_chief_complaints IS 'Patient chief complaints linked to encounters following encounter-centric architecture';
