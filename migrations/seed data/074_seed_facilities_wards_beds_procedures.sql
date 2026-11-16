-- Migration: 074_seed_facilities_wards_beds_procedures.sql
-- Description: Comprehensive seeding for facilities, wards, beds, and procedure catalogue
-- Based on schema constraints from 20260119093910_remote_schema.sql
--
-- Schema References:
-- - ward_type: 'general', 'icu', 'pediatric', 'maternity', 'surgical', 'orthopedic', 'cardiac', 'emergency', 'psychiatric', 'isolation'
-- - bed_type: 'standard', 'electric', 'icu', 'pediatric', 'bariatric', 'low', 'stretcher', 'crib', 'bassinet'
-- - bed_status: 'Available', 'Occupied', 'Cleaning', 'Maintenance', 'Reserved'
-- - gender_restriction: 'male', 'female', 'none'

-- =============================================================================
-- 1. SEED FACILITY
-- =============================================================================

INSERT INTO public.facilities (
    id,
    code,
    name,
    facility_type,
    address,
    city,
    state,
    country,
    phone,
    email,
    nhis_provider_id,
    bed_capacity,
    operating_hours,
    emergency_available,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'NDC-HOSP',
    'National Defence College Medical Centre',
    'hospital',
    'National Defence College, Abuja',
    'Abuja',
    'FCT',
    'Nigeria',
    '+234-9-123-4567',
    'hospital@ndc.gov.ng',
    'NHIS-NDC-001',
    200,
    '24/7',
    true,
    true
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Store facility ID for use in subsequent inserts
DO $$
DECLARE
    v_facility_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    -- Verify facility exists
    IF NOT EXISTS (SELECT 1 FROM facilities WHERE id = v_facility_id) THEN
        RAISE EXCEPTION 'Facility not found. Seed failed.';
    END IF;
END $$;

-- =============================================================================
-- 2. SEED WARDS
-- =============================================================================

-- Clear existing wards and beds for clean seed (optional - comment out if you want to preserve data)
-- DELETE FROM beds WHERE ward_id IN (SELECT id FROM wards WHERE facility_id = '00000000-0000-0000-0000-000000000001'::uuid);
-- DELETE FROM wards WHERE facility_id = '00000000-0000-0000-0000-000000000001'::uuid;

INSERT INTO public.wards (
    id, facility_id, name, code, ward_type, total_beds, available_beds, 
    description, floor_number, building, gender_restriction, 
    price, nhis_price, is_nhis_covered, nhis_percentage, is_active
) VALUES
    -- General Wards
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Male Medical Ward', 'MMW-01', 'general', 20, 20,
     'General medical ward for male patients', 1, 'Main Building', 'male',
     5000.00, 3500.00, true, 70, true),
    
    ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Female Medical Ward', 'FMW-01', 'general', 20, 20,
     'General medical ward for female patients', 1, 'Main Building', 'female',
     5000.00, 3500.00, true, 70, true),
    
    ('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'General Ward A', 'GWA-01', 'general', 16, 16,
     'Mixed general ward for stable patients', 2, 'Main Building', 'none',
     4500.00, 3000.00, true, 67, true),

    -- Intensive Care Unit (ICU)
    ('10000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Intensive Care Unit', 'ICU-01', 'icu', 10, 10,
     'Critical care unit with advanced monitoring', 2, 'ICU Block', 'none',
     25000.00, 17500.00, true, 70, true),
    
    ('10000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Coronary Care Unit', 'CCU-01', 'cardiac', 8, 8,
     'Specialized cardiac intensive care', 2, 'ICU Block', 'none',
     30000.00, 21000.00, true, 70, true),

    -- Pediatric Ward
    ('10000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Pediatric Ward', 'PED-01', 'pediatric', 15, 15,
     'Pediatric ward for children 0-16 years', 3, 'Pediatric Block', 'none',
     6000.00, 4200.00, true, 70, true),
    
    ('10000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Neonatal ICU', 'NICU-01', 'pediatric', 8, 8,
     'Neonatal intensive care for newborns', 3, 'Pediatric Block', 'none',
     35000.00, 24500.00, true, 70, true),

    -- Maternity Ward
    ('10000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Maternity Ward', 'MAT-01', 'maternity', 20, 20,
     'Ante-natal and post-natal care', 4, 'Maternity Block', 'female',
     8000.00, 5600.00, true, 70, true),
    
    ('10000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Labour Ward', 'LAB-01', 'maternity', 10, 10,
     'Labour and delivery suite', 4, 'Maternity Block', 'female',
     15000.00, 10500.00, true, 70, true),

    -- Surgical Wards
    ('10000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Male Surgical Ward', 'MSW-01', 'surgical', 16, 16,
     'Post-operative care for male patients', 5, 'Surgical Block', 'male',
     7000.00, 4900.00, true, 70, true),
    
    ('10000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Female Surgical Ward', 'FSW-01', 'surgical', 16, 16,
     'Post-operative care for female patients', 5, 'Surgical Block', 'female',
     7000.00, 4900.00, true, 70, true),

    -- Orthopedic Ward
    ('10000000-0000-0000-0000-000000000012'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Orthopedic Ward', 'ORT-01', 'orthopedic', 12, 12,
     'Orthopedic and trauma patients', 5, 'Surgical Block', 'none',
     7500.00, 5250.00, true, 70, true),

    -- Emergency Ward
    ('10000000-0000-0000-0000-000000000013'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Emergency Ward', 'EMR-01', 'emergency', 15, 15,
     'Emergency observation and short-stay', 1, 'Emergency Block', 'none',
     10000.00, 7000.00, true, 70, true),

    -- Psychiatric Ward
    ('10000000-0000-0000-0000-000000000014'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Psychiatric Ward', 'PSY-01', 'psychiatric', 10, 10,
     'Mental health inpatient care', 6, 'Psychiatric Block', 'none',
     8000.00, 5600.00, true, 70, true),

    -- Isolation Ward
    ('10000000-0000-0000-0000-000000000015'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Isolation Ward', 'ISO-01', 'isolation', 8, 8,
     'Infectious disease isolation', 6, 'Isolation Block', 'none',
     12000.00, 8400.00, true, 70, true)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    total_beds = EXCLUDED.total_beds,
    available_beds = EXCLUDED.available_beds,
    updated_at = NOW();

-- =============================================================================
-- 3. SEED BEDS FOR EACH WARD
-- =============================================================================

-- Function to generate beds for a ward
CREATE OR REPLACE FUNCTION seed_beds_for_ward(
    p_ward_id UUID,
    p_bed_type VARCHAR(50),
    p_features JSONB DEFAULT '[]'::jsonb
) RETURNS INTEGER AS $$
DECLARE
    v_ward RECORD;
    v_bed_count INTEGER := 0;
    v_bed_number VARCHAR(20);
    i INTEGER;
BEGIN
    SELECT * INTO v_ward FROM wards WHERE id = p_ward_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    FOR i IN 1..v_ward.total_beds LOOP
        v_bed_number := v_ward.code || '-B' || LPAD(i::TEXT, 2, '0');
        
        INSERT INTO beds (ward_id, bed_number, bed_type, status, features, is_active, daily_rate)
        VALUES (p_ward_id, v_bed_number, p_bed_type, 'Available', p_features, true, v_ward.price)
        ON CONFLICT (ward_id, bed_number) DO UPDATE SET
            bed_type = EXCLUDED.bed_type,
            status = 'Available',
            updated_at = NOW();
        
        v_bed_count := v_bed_count + 1;
    END LOOP;
    
    RETURN v_bed_count;
END;
$$ LANGUAGE plpgsql;

-- Generate beds for each ward with appropriate bed types
-- Based on bed_type CHECK: 'standard', 'electric', 'icu', 'pediatric', 'bariatric', 'low', 'stretcher', 'crib', 'bassinet'

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Male Medical Ward - standard beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000001'::uuid, 'standard', 
        '["call_button", "adjustable_height", "side_rails"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Male Medical Ward: % beds created', v_count;
    
    -- Female Medical Ward - standard beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000002'::uuid, 'standard',
        '["call_button", "adjustable_height", "side_rails"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Female Medical Ward: % beds created', v_count;
    
    -- General Ward A - standard beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000003'::uuid, 'standard',
        '["call_button", "side_rails"]'::jsonb) INTO v_count;
    RAISE NOTICE 'General Ward A: % beds created', v_count;
    
    -- ICU - ICU beds with full monitoring
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000004'::uuid, 'icu',
        '["ventilator_ready", "cardiac_monitor", "central_line_access", "isolation_capable", "electric_adjustment"]'::jsonb) INTO v_count;
    RAISE NOTICE 'ICU: % beds created', v_count;
    
    -- CCU - ICU beds for cardiac
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000005'::uuid, 'icu',
        '["cardiac_monitor", "defibrillator_ready", "central_line_access", "telemetry"]'::jsonb) INTO v_count;
    RAISE NOTICE 'CCU: % beds created', v_count;
    
    -- Pediatric Ward - pediatric beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000006'::uuid, 'pediatric',
        '["safety_rails", "parent_bed_nearby", "child_friendly"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Pediatric Ward: % beds created', v_count;
    
    -- NICU - bassinets/cribs
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000007'::uuid, 'bassinet',
        '["incubator_ready", "phototherapy", "monitoring", "warming"]'::jsonb) INTO v_count;
    RAISE NOTICE 'NICU: % beds created', v_count;
    
    -- Maternity Ward - electric beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000008'::uuid, 'electric',
        '["adjustable", "side_rails", "baby_crib_attached"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Maternity Ward: % beds created', v_count;
    
    -- Labour Ward - electric/stretcher
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000009'::uuid, 'electric',
        '["delivery_stirrups", "adjustable", "emergency_access", "fetal_monitor"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Labour Ward: % beds created', v_count;
    
    -- Male Surgical Ward - electric beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000010'::uuid, 'electric',
        '["post_op_monitoring", "iv_pole", "adjustable", "side_rails"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Male Surgical Ward: % beds created', v_count;
    
    -- Female Surgical Ward - electric beds
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000011'::uuid, 'electric',
        '["post_op_monitoring", "iv_pole", "adjustable", "side_rails"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Female Surgical Ward: % beds created', v_count;
    
    -- Orthopedic Ward - electric beds with traction
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000012'::uuid, 'electric',
        '["traction_capable", "trapeze_bar", "pressure_relief", "adjustable"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Orthopedic Ward: % beds created', v_count;
    
    -- Emergency Ward - stretchers
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000013'::uuid, 'stretcher',
        '["portable", "emergency_access", "monitoring_ready", "oxygen_port"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Emergency Ward: % beds created', v_count;
    
    -- Psychiatric Ward - low beds for safety
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000014'::uuid, 'low',
        '["fall_prevention", "secured", "observation_friendly"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Psychiatric Ward: % beds created', v_count;
    
    -- Isolation Ward - standard with negative pressure
    SELECT seed_beds_for_ward('10000000-0000-0000-0000-000000000015'::uuid, 'standard',
        '["negative_pressure_room", "hepa_filtration", "anteroom", "ppe_station"]'::jsonb) INTO v_count;
    RAISE NOTICE 'Isolation Ward: % beds created', v_count;
END $$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS seed_beds_for_ward(UUID, VARCHAR, JSONB);

-- =============================================================================
-- 4. SEED PROCEDURE CATALOGUE
-- =============================================================================

INSERT INTO public.procedure_catalogue (
    facility_id, code, name, description, category, subcategory,
    body_system, requires_anesthesia, anesthesia_type, typical_duration_minutes,
    recovery_time_hours, requires_consent, requires_fasting, fasting_hours,
    requires_sedation, requires_admission, base_price, nhis_price,
    professional_fee, facility_fee, is_active
) VALUES
    -- GENERAL SURGERY PROCEDURES (category: 'surgical')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'SURG-001', 'Appendectomy', 
     'Surgical removal of the appendix', 'surgical', 'Abdominal',
     'Digestive', true, 'General', 60, 24, true, true, 8, false, true,
     150000.00, 105000.00, 50000.00, 100000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'SURG-002', 'Cholecystectomy (Laparoscopic)',
     'Laparoscopic removal of gallbladder', 'surgical', 'Hepatobiliary',
     'Digestive', true, 'General', 90, 24, true, true, 8, false, true,
     200000.00, 140000.00, 70000.00, 130000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'SURG-003', 'Hernia Repair (Inguinal)',
     'Repair of inguinal hernia', 'surgical', 'Abdominal',
     'Musculoskeletal', true, 'Spinal/General', 60, 4, true, true, 6, false, false,
     120000.00, 84000.00, 40000.00, 80000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'SURG-004', 'Hernia Repair (Umbilical)',
     'Repair of umbilical hernia', 'surgical', 'Abdominal',
     'Musculoskeletal', true, 'Local/Spinal', 45, 4, true, true, 6, false, false,
     100000.00, 70000.00, 35000.00, 65000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'SURG-005', 'Mastectomy',
     'Surgical removal of breast tissue', 'major', 'Breast',
     'Integumentary', true, 'General', 120, 48, true, true, 8, false, true,
     250000.00, 175000.00, 80000.00, 170000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'SURG-006', 'Thyroidectomy',
     'Surgical removal of thyroid gland', 'surgical', 'Endocrine',
     'Endocrine', true, 'General', 120, 24, true, true, 8, false, true,
     200000.00, 140000.00, 70000.00, 130000.00, true),

    -- ORTHOPEDIC PROCEDURES (category: 'orthopedic')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ORTH-001', 'Fracture Reduction - Closed',
     'Non-surgical fracture alignment', 'orthopedic', 'Trauma',
     'Musculoskeletal', true, 'Local/Regional', 30, 2, true, false, 0, true, false,
     50000.00, 35000.00, 20000.00, 30000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ORTH-002', 'Fracture Fixation - ORIF',
     'Open reduction internal fixation', 'orthopedic', 'Trauma',
     'Musculoskeletal', true, 'General/Spinal', 120, 48, true, true, 8, false, true,
     300000.00, 210000.00, 100000.00, 200000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ORTH-003', 'Total Knee Replacement',
     'Knee joint replacement surgery', 'orthopedic', 'Arthroplasty',
     'Musculoskeletal', true, 'Spinal/General', 180, 72, true, true, 8, false, true,
     800000.00, 560000.00, 200000.00, 600000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ORTH-004', 'Total Hip Replacement',
     'Hip joint replacement surgery', 'orthopedic', 'Arthroplasty',
     'Musculoskeletal', true, 'Spinal/General', 180, 72, true, true, 8, false, true,
     850000.00, 595000.00, 220000.00, 630000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ORTH-005', 'Arthroscopy - Knee',
     'Minimally invasive knee joint examination/surgery', 'orthopedic', 'Arthroscopy',
     'Musculoskeletal', true, 'Spinal/General', 60, 6, true, true, 6, false, false,
     180000.00, 126000.00, 60000.00, 120000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ORTH-006', 'Cast Application',
     'Application of plaster/fiberglass cast', 'orthopedic', 'Immobilization',
     'Musculoskeletal', false, NULL, 30, 0, true, false, 0, false, false,
     15000.00, 10500.00, 5000.00, 10000.00, true),

    -- OBSTETRICS & GYNECOLOGY (category: 'obstetric' / 'surgical')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OBGYN-001', 'Caesarean Section',
     'Surgical delivery of baby', 'obstetric', 'Delivery',
     'Reproductive', true, 'Spinal', 60, 48, true, true, 6, false, true,
     180000.00, 126000.00, 60000.00, 120000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OBGYN-002', 'Hysterectomy - Abdominal',
     'Surgical removal of uterus', 'major', 'Major Surgery',
     'Reproductive', true, 'General/Spinal', 120, 72, true, true, 8, false, true,
     250000.00, 175000.00, 80000.00, 170000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OBGYN-003', 'Hysterectomy - Vaginal',
     'Vaginal removal of uterus', 'major', 'Major Surgery',
     'Reproductive', true, 'Spinal', 90, 48, true, true, 8, false, true,
     220000.00, 154000.00, 70000.00, 150000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OBGYN-004', 'Dilation and Curettage (D&C)',
     'Uterine scraping procedure', 'minor', 'Minor Surgery',
     'Reproductive', true, 'General/Local', 30, 4, true, true, 6, false, false,
     50000.00, 35000.00, 20000.00, 30000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OBGYN-005', 'Tubal Ligation',
     'Female sterilization procedure', 'surgical', 'Contraception',
     'Reproductive', true, 'Spinal/General', 45, 4, true, true, 6, false, false,
     80000.00, 56000.00, 30000.00, 50000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OBGYN-006', 'Myomectomy',
     'Surgical removal of uterine fibroids', 'surgical', 'Major Surgery',
     'Reproductive', true, 'General', 120, 48, true, true, 8, false, true,
     200000.00, 140000.00, 70000.00, 130000.00, true),

    -- UROLOGY (category: 'surgical' / 'minor' / 'diagnostic')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'URO-001', 'Circumcision',
     'Surgical removal of foreskin', 'minor', 'Minor Surgery',
     'Reproductive', true, 'Local', 30, 2, true, false, 0, false, false,
     30000.00, 21000.00, 10000.00, 20000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'URO-002', 'Prostatectomy - TURP',
     'Transurethral resection of prostate', 'major', 'Major Surgery',
     'Reproductive', true, 'Spinal', 90, 48, true, true, 8, false, true,
     250000.00, 175000.00, 80000.00, 170000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'URO-003', 'Nephrectomy',
     'Surgical removal of kidney', 'major', 'Major Surgery',
     'Urinary', true, 'General', 180, 72, true, true, 8, false, true,
     400000.00, 280000.00, 120000.00, 280000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'URO-004', 'Cystoscopy',
     'Bladder examination with scope', 'endoscopy', 'Diagnostic',
     'Urinary', true, 'Local/Spinal', 30, 2, true, false, 0, true, false,
     60000.00, 42000.00, 25000.00, 35000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'URO-005', 'Lithotripsy - ESWL',
     'Extracorporeal shock wave lithotripsy', 'therapeutic', 'Stone Treatment',
     'Urinary', true, 'Sedation', 60, 4, true, true, 6, true, false,
     150000.00, 105000.00, 50000.00, 100000.00, true),

    -- OPHTHALMOLOGY (category: 'surgical' / 'therapeutic')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OPH-001', 'Cataract Surgery - Phaco',
     'Phacoemulsification with IOL implant', 'surgical', 'Lens Surgery',
     'Eye', true, 'Local/Topical', 45, 4, true, true, 4, false, false,
     180000.00, 126000.00, 60000.00, 120000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OPH-002', 'Glaucoma Surgery - Trabeculectomy',
     'Surgical treatment for glaucoma', 'surgical', 'Glaucoma',
     'Eye', true, 'Local', 60, 4, true, false, 0, false, false,
     150000.00, 105000.00, 50000.00, 100000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OPH-003', 'Pterygium Excision',
     'Removal of pterygium from eye', 'minor', 'External Eye',
     'Eye', true, 'Local', 30, 2, true, false, 0, false, false,
     50000.00, 35000.00, 20000.00, 30000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'OPH-004', 'Laser Photocoagulation',
     'Retinal laser treatment', 'therapeutic', 'Retina',
     'Eye', false, NULL, 30, 1, true, false, 0, false, false,
     80000.00, 56000.00, 40000.00, 40000.00, true),

    -- ENT (Ear, Nose, Throat) (category: 'surgical')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ENT-001', 'Tonsillectomy',
     'Surgical removal of tonsils', 'surgical', 'Throat',
     'Respiratory', true, 'General', 45, 24, true, true, 8, false, true,
     80000.00, 56000.00, 30000.00, 50000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ENT-002', 'Adenoidectomy',
     'Surgical removal of adenoids', 'surgical', 'Throat',
     'Respiratory', true, 'General', 30, 24, true, true, 8, false, false,
     60000.00, 42000.00, 25000.00, 35000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ENT-003', 'Septoplasty',
     'Correction of deviated nasal septum', 'surgical', 'Nose',
     'Respiratory', true, 'General', 60, 24, true, true, 8, false, false,
     120000.00, 84000.00, 40000.00, 80000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ENT-004', 'Myringotomy with Tubes',
     'Ear tube placement for chronic otitis', 'minor', 'Ear',
     'Auditory', true, 'General', 30, 4, true, true, 6, false, false,
     50000.00, 35000.00, 20000.00, 30000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'ENT-005', 'FESS (Functional Endoscopic Sinus Surgery)',
     'Endoscopic sinus surgery', 'endoscopy', 'Nose',
     'Respiratory', true, 'General', 90, 24, true, true, 8, false, false,
     180000.00, 126000.00, 60000.00, 120000.00, true),

    -- DENTAL PROCEDURES (category: 'minor' / 'surgical')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'DENT-001', 'Tooth Extraction - Simple',
     'Simple tooth extraction', 'minor', 'Extraction',
     'Oral', true, 'Local', 20, 1, true, false, 0, false, false,
     10000.00, 7000.00, 5000.00, 5000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'DENT-002', 'Tooth Extraction - Surgical',
     'Surgical tooth extraction', 'surgical', 'Extraction',
     'Oral', true, 'Local', 45, 2, true, false, 0, false, false,
     30000.00, 21000.00, 15000.00, 15000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'DENT-003', 'Root Canal Treatment',
     'Endodontic treatment', 'therapeutic', 'Endodontics',
     'Oral', true, 'Local', 60, 1, true, false, 0, false, false,
     50000.00, 35000.00, 25000.00, 25000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'DENT-004', 'Dental Implant',
     'Tooth implant placement', 'surgical', 'Implantology',
     'Oral', true, 'Local', 60, 2, true, false, 0, false, false,
     200000.00, 140000.00, 80000.00, 120000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'DENT-005', 'Scaling and Polishing',
     'Professional teeth cleaning', 'other', 'Preventive',
     'Oral', false, NULL, 30, 0, false, false, 0, false, false,
     15000.00, 10500.00, 8000.00, 7000.00, true),

    -- CARDIOLOGY PROCEDURES (category: 'cardiovascular' / 'diagnostic')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'CARD-001', 'Coronary Angiography',
     'Cardiac catheterization and imaging', 'cardiovascular', 'Diagnostic',
     'Cardiovascular', true, 'Local/Sedation', 60, 24, true, true, 6, true, true,
     300000.00, 210000.00, 100000.00, 200000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'CARD-002', 'Percutaneous Coronary Intervention (PCI)',
     'Coronary artery stenting', 'cardiovascular', 'Interventional',
     'Cardiovascular', true, 'Local/Sedation', 120, 48, true, true, 6, true, true,
     800000.00, 560000.00, 200000.00, 600000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'CARD-003', 'Pacemaker Implantation',
     'Permanent pacemaker insertion', 'cardiovascular', 'Electrophysiology',
     'Cardiovascular', true, 'Local/Sedation', 90, 48, true, true, 6, true, true,
     500000.00, 350000.00, 150000.00, 350000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'CARD-004', 'Echocardiography',
     'Cardiac ultrasound examination', 'diagnostic', 'Diagnostic',
     'Cardiovascular', false, NULL, 30, 0, false, false, 0, false, false,
     30000.00, 21000.00, 15000.00, 15000.00, true),

    -- MINOR PROCEDURES / OUTPATIENT (category: 'minor' / 'wound_care' / 'diagnostic')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'MIN-001', 'Wound Suturing',
     'Closure of wound with sutures', 'wound_care', 'Wound Care',
     'Integumentary', true, 'Local', 30, 0, true, false, 0, false, false,
     15000.00, 10500.00, 8000.00, 7000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'MIN-002', 'Abscess Drainage',
     'Incision and drainage of abscess', 'wound_care', 'Wound Care',
     'Integumentary', true, 'Local', 30, 2, true, false, 0, false, false,
     25000.00, 17500.00, 12000.00, 13000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'MIN-003', 'Lipoma Excision',
     'Surgical removal of lipoma', 'minor', 'Soft Tissue',
     'Integumentary', true, 'Local', 45, 2, true, false, 0, false, false,
     40000.00, 28000.00, 18000.00, 22000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'MIN-004', 'Skin Biopsy',
     'Skin tissue sampling for diagnosis', 'biopsy', 'Diagnostic',
     'Integumentary', true, 'Local', 20, 0, true, false, 0, false, false,
     20000.00, 14000.00, 10000.00, 10000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'MIN-005', 'Joint Aspiration',
     'Fluid removal from joint', 'diagnostic', 'Diagnostic',
     'Musculoskeletal', true, 'Local', 20, 1, true, false, 0, false, false,
     25000.00, 17500.00, 12000.00, 13000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'MIN-006', 'Lumbar Puncture',
     'Spinal fluid sampling', 'diagnostic', 'Diagnostic',
     'Nervous', true, 'Local', 30, 4, true, false, 0, false, false,
     35000.00, 24500.00, 18000.00, 17000.00, true),

    -- PHYSIOTHERAPY PROCEDURES (category: 'therapeutic')
    ('00000000-0000-0000-0000-000000000001'::uuid, 'PHYS-001', 'Physiotherapy Session - Initial Assessment',
     'Initial physiotherapy evaluation', 'therapeutic', 'Assessment',
     'Musculoskeletal', false, NULL, 60, 0, false, false, 0, false, false,
     15000.00, 10500.00, 10000.00, 5000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'PHYS-002', 'Physiotherapy Session - Treatment',
     'Physiotherapy treatment session', 'therapeutic', 'Treatment',
     'Musculoskeletal', false, NULL, 45, 0, false, false, 0, false, false,
     10000.00, 7000.00, 6000.00, 4000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'PHYS-003', 'Electrotherapy',
     'Electrical stimulation therapy', 'therapeutic', 'Modalities',
     'Musculoskeletal', false, NULL, 30, 0, false, false, 0, false, false,
     8000.00, 5600.00, 5000.00, 3000.00, true),
    
    ('00000000-0000-0000-0000-000000000001'::uuid, 'PHYS-004', 'Hydrotherapy Session',
     'Water-based therapy', 'therapeutic', 'Modalities',
     'Musculoskeletal', false, NULL, 45, 0, false, false, 0, false, false,
     12000.00, 8400.00, 7000.00, 5000.00, true)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    base_price = EXCLUDED.base_price,
    nhis_price = EXCLUDED.nhis_price,
    updated_at = NOW();

-- =============================================================================
-- 5. VERIFICATION QUERIES
-- =============================================================================

-- Verify seeding results
DO $$
DECLARE
    v_facility_count INTEGER;
    v_ward_count INTEGER;
    v_bed_count INTEGER;
    v_procedure_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_facility_count FROM facilities WHERE is_active = true;
    SELECT COUNT(*) INTO v_ward_count FROM wards WHERE is_active = true;
    SELECT COUNT(*) INTO v_bed_count FROM beds WHERE is_active = true;
    SELECT COUNT(*) INTO v_procedure_count FROM procedure_catalogue WHERE is_active = true;
    
    RAISE NOTICE '=== SEEDING VERIFICATION ===';
    RAISE NOTICE 'Active Facilities: %', v_facility_count;
    RAISE NOTICE 'Active Wards: %', v_ward_count;
    RAISE NOTICE 'Active Beds: %', v_bed_count;
    RAISE NOTICE 'Active Procedures: %', v_procedure_count;
    RAISE NOTICE '============================';
END $$;

-- Summary view
SELECT 'Facilities' as entity, COUNT(*) as count FROM facilities WHERE is_active = true
UNION ALL
SELECT 'Wards', COUNT(*) FROM wards WHERE is_active = true
UNION ALL
SELECT 'Beds', COUNT(*) FROM beds WHERE is_active = true
UNION ALL
SELECT 'Procedures', COUNT(*) FROM procedure_catalogue WHERE is_active = true;
