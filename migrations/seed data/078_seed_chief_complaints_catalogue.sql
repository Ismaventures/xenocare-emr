-- Migration: 078_seed_chief_complaints_catalogue.sql
-- Description: Seeds the chief_complaint_catalogue table with standard complaints
-- This ensures all complaint codes referenced by the frontend are present

-- =============================================================================
-- SEED STANDARD CHIEF COMPLAINTS
-- =============================================================================

INSERT INTO chief_complaint_catalogue (complaint_name, complaint_code, category, display_order, is_active) VALUES
    -- General
    ('Fever', 'GEN-001', 'General', 1, true),
    ('Weakness', 'GEN-002', 'General', 2, true),
    ('Fatigue', 'GEN-003', 'General', 3, true),
    ('Malaise', 'GEN-004', 'General', 4, true),
    ('Weight Loss', 'GEN-005', 'General', 5, true),
    ('Weight Gain', 'GEN-006', 'General', 6, true),
    ('Night Sweats', 'GEN-007', 'General', 7, true),
    ('Loss of Appetite', 'GEN-008', 'General', 8, true),
    
    -- Pain
    ('Headache', 'PAIN-001', 'Pain', 10, true),
    ('Chest Pain', 'PAIN-002', 'Pain', 11, true),
    ('Abdominal Pain', 'PAIN-003', 'Pain', 12, true),
    ('Back Pain', 'PAIN-004', 'Pain', 13, true),
    ('Neck Pain', 'PAIN-005', 'Pain', 14, true),
    ('Generalized Body Pain', 'PAIN-006', 'Pain', 15, true),
    ('Flank Pain', 'PAIN-007', 'Pain', 16, true),
    ('Pelvic Pain', 'PAIN-008', 'Pain', 17, true),
    
    -- Respiratory
    ('Cough', 'RESP-001', 'Respiratory', 20, true),
    ('Shortness of Breath', 'RESP-002', 'Respiratory', 21, true),
    ('Wheezing', 'RESP-003', 'Respiratory', 22, true),
    ('Sore Throat', 'RESP-004', 'Respiratory', 23, true),
    ('Runny Nose', 'RESP-005', 'Respiratory', 24, true),
    ('Nasal Congestion', 'RESP-006', 'Respiratory', 25, true),
    ('Coughing Blood', 'RESP-007', 'Respiratory', 26, true),
    ('Difficulty Breathing', 'RESP-008', 'Respiratory', 27, true),
    
    -- Cardiovascular
    ('Palpitations', 'CARD-001', 'Cardiovascular', 30, true),
    ('Leg Swelling', 'CARD-002', 'Cardiovascular', 31, true),
    ('Fainting', 'CARD-003', 'Cardiovascular', 32, true),
    ('Fast Heartbeat', 'CARD-004', 'Cardiovascular', 33, true),
    ('Slow Heartbeat', 'CARD-005', 'Cardiovascular', 34, true),
    ('Irregular Heartbeat', 'CARD-006', 'Cardiovascular', 35, true),
    
    -- Gastrointestinal
    ('Vomiting', 'GI-001', 'Gastrointestinal', 40, true),
    ('Nausea', 'GI-002', 'Gastrointestinal', 41, true),
    ('Diarrhea', 'GI-003', 'Gastrointestinal', 42, true),
    ('Constipation', 'GI-004', 'Gastrointestinal', 43, true),
    ('Bloating', 'GI-005', 'Gastrointestinal', 44, true),
    ('Heartburn', 'GI-006', 'Gastrointestinal', 45, true),
    ('Difficulty Swallowing', 'GI-007', 'Gastrointestinal', 46, true),
    ('Blood in Stool', 'GI-008', 'Gastrointestinal', 47, true),
    ('Black Stool', 'GI-009', 'Gastrointestinal', 48, true),
    ('Jaundice', 'GI-010', 'Gastrointestinal', 49, true),
    
    -- Neurological
    ('Dizziness', 'NEURO-001', 'Neurological', 50, true),
    ('Seizure', 'NEURO-002', 'Neurological', 51, true),
    ('Loss of Consciousness', 'NEURO-003', 'Neurological', 52, true),
    ('Numbness', 'NEURO-004', 'Neurological', 53, true),
    ('Tingling', 'NEURO-005', 'Neurological', 54, true),
    ('Tremors', 'NEURO-006', 'Neurological', 55, true),
    ('Memory Loss', 'NEURO-007', 'Neurological', 56, true),
    ('Confusion', 'NEURO-008', 'Neurological', 57, true),
    ('Vision Changes', 'NEURO-009', 'Neurological', 58, true),
    ('Speech Difficulty', 'NEURO-010', 'Neurological', 59, true),
    
    -- Genitourinary
    ('Painful Urination', 'GU-001', 'Genitourinary', 60, true),
    ('Frequent Urination', 'GU-002', 'Genitourinary', 61, true),
    ('Blood in Urine', 'GU-003', 'Genitourinary', 62, true),
    ('Urinary Incontinence', 'GU-004', 'Genitourinary', 63, true),
    ('Difficulty Urinating', 'GU-005', 'Genitourinary', 64, true),
    ('Genital Discharge', 'GU-006', 'Genitourinary', 65, true),
    ('Genital Sores', 'GU-007', 'Genitourinary', 66, true),
    
    -- Obstetrics & Gynecology
    ('Lower Abdominal Pain', 'OBG-001', 'Obstetrics_Gynecology', 70, true),
    ('Vaginal Bleeding', 'OBG-002', 'Obstetrics_Gynecology', 71, true),
    ('Missed Period', 'OBG-003', 'Obstetrics_Gynecology', 72, true),
    ('Vaginal Discharge', 'OBG-004', 'Obstetrics_Gynecology', 73, true),
    ('Breast Lump', 'OBG-005', 'Obstetrics_Gynecology', 74, true),
    ('Breast Pain', 'OBG-006', 'Obstetrics_Gynecology', 75, true),
    ('Menstrual Irregularity', 'OBG-007', 'Obstetrics_Gynecology', 76, true),
    ('Pregnancy Test Request', 'OBG-008', 'Obstetrics_Gynecology', 77, true),
    
    -- Musculoskeletal
    ('Joint Pain', 'MSK-001', 'Musculoskeletal', 80, true),
    ('Injury', 'MSK-002', 'Musculoskeletal', 81, true),
    ('Muscle Pain', 'MSK-003', 'Musculoskeletal', 82, true),
    ('Joint Swelling', 'MSK-004', 'Musculoskeletal', 83, true),
    ('Limited Range of Motion', 'MSK-005', 'Musculoskeletal', 84, true),
    ('Bone Pain', 'MSK-006', 'Musculoskeletal', 85, true),
    
    -- Dermatology
    ('Rash', 'DERM-001', 'Dermatology', 90, true),
    ('Itching', 'DERM-002', 'Dermatology', 91, true),
    ('Skin Lesion', 'DERM-003', 'Dermatology', 92, true),
    ('Hair Loss', 'DERM-004', 'Dermatology', 93, true),
    ('Skin Discoloration', 'DERM-005', 'Dermatology', 94, true),
    ('Wound', 'DERM-006', 'Dermatology', 95, true),
    ('Abscess', 'DERM-007', 'Dermatology', 96, true),
    
    -- Mental Health
    ('Anxiety', 'MH-001', 'Mental_Health', 100, true),
    ('Depression', 'MH-002', 'Mental_Health', 101, true),
    ('Insomnia', 'MH-003', 'Mental_Health', 102, true),
    ('Suicidal Thoughts', 'MH-004', 'Mental_Health', 103, true),
    ('Hallucinations', 'MH-005', 'Mental_Health', 104, true),
    ('Aggressive Behavior', 'MH-006', 'Mental_Health', 105, true),
    ('Substance Abuse', 'MH-007', 'Mental_Health', 106, true),
    
    -- Trauma / Emergency
    ('Road Traffic Accident', 'TRA-001', 'Trauma_Emergency', 110, true),
    ('Fall', 'TRA-002', 'Trauma_Emergency', 111, true),
    ('Assault', 'TRA-003', 'Trauma_Emergency', 112, true),
    ('Burns', 'TRA-004', 'Trauma_Emergency', 113, true),
    ('Drowning', 'TRA-005', 'Trauma_Emergency', 114, true),
    ('Electric Shock', 'TRA-006', 'Trauma_Emergency', 115, true),
    ('Poisoning', 'TRA-007', 'Trauma_Emergency', 116, true),
    ('Snake Bite', 'TRA-008', 'Trauma_Emergency', 117, true),
    ('Dog Bite', 'TRA-009', 'Trauma_Emergency', 118, true)
ON CONFLICT (complaint_code) DO UPDATE SET
    complaint_name = EXCLUDED.complaint_name,
    category = EXCLUDED.category,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM chief_complaint_catalogue WHERE is_active = true;
    RAISE NOTICE 'Chief Complaints seeded: % active entries', v_count;
END $$;
