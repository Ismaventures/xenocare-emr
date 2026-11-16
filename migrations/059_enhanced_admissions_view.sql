-- Migration 059: Enhanced Admissions View
-- Adds comprehensive admission details including who requested, who admitted, 
-- ward rounds, encounter links, and all relevant clinical data

-- ============================================================================
-- PART 1: Create enhanced active_admissions_view with all relevant details
-- ============================================================================

DROP VIEW IF EXISTS active_admissions_view CASCADE;

CREATE OR REPLACE VIEW active_admissions_view AS
SELECT
    -- Admission identifiers
    a.id AS admission_id,
    a.admission_number,
    a.encounter_id,
    v.encounter_number,
    
    -- Patient info
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.date_of_birth,
    p.gender,
    p.emr_number AS hospital_id,
    p.contact_phone AS patient_phone,
    
    -- Admission dates and status
    a.admission_date,
    a.expected_discharge_date,
    a.actual_discharge_date,
    a.admission_type,
    a.admission_source,
    a.admission_status,
    a.acuity_level,
    
    -- Clinical information
    a.admitting_diagnosis,
    a.admitting_diagnosis_icd10,
    a.secondary_diagnoses,
    a.chief_complaint,
    a.reason_for_admission,
    
    -- Patient condition flags
    a.code_status,
    a.isolation_required,
    a.isolation_type,
    a.fall_risk_level,
    a.pressure_ulcer_risk,
    
    -- Location
    a.current_ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.nurse_station_phone,
    a.current_bed_id,
    b.bed_number,
    b.bed_type,
    b.features AS bed_features,
    
    -- Care Team - Admitting Doctor (who requested/created admission)
    a.admitting_doctor_id,
    admitting_doc.first_name AS admitting_doctor_first_name,
    admitting_doc.last_name AS admitting_doctor_last_name,
    admitting_doc.staff_id AS admitting_doctor_staff_id,
    
    -- Care Team - Attending Physician (current)
    a.attending_physician_id,
    attending_doc.first_name AS physician_first_name,
    attending_doc.last_name AS physician_last_name,
    attending_doc.staff_id AS physician_staff_id,
    
    -- Care Team - Primary Nurse
    a.primary_nurse_id,
    nurse.first_name AS primary_nurse_first_name,
    nurse.last_name AS primary_nurse_last_name,
    
    -- Record creator (who created the admission record)
    a.created_by,
    creator.first_name AS created_by_first_name,
    creator.last_name AS created_by_last_name,
    a.created_at AS record_created_at,
    
    -- Discharge info (for discharged patients history)
    a.discharge_type,
    a.discharge_disposition,
    a.discharge_diagnosis,
    a.discharge_summary,
    a.discharged_by,
    discharged_doc.first_name AS discharged_by_first_name,
    discharged_doc.last_name AS discharged_by_last_name,
    
    -- Insurance
    a.insurance_verified,
    a.pre_authorization_number,
    a.estimated_cost,
    
    -- Additional data
    a.care_team,
    a.allergies_snapshot,
    a.alerts,
    a.diet_type,
    a.activity_level,
    a.mobility_status,
    a.notes,
    
    -- Facility
    a.facility_id,
    
    -- Calculated fields
    EXTRACT(DAY FROM (NOW() - a.admission_date))::INT AS length_of_stay_days,
    
    -- Ward round count
    (SELECT COUNT(*) FROM ward_round_notes wrn WHERE wrn.admission_id = a.id) AS ward_round_count,
    
    -- Latest ward round date
    (SELECT MAX(wrn.round_date) FROM ward_round_notes wrn WHERE wrn.admission_id = a.id) AS last_ward_round_date,
    
    -- Bed transfer count
    (SELECT COUNT(*) FROM bed_transfers bt WHERE bt.admission_id = a.id) AS transfer_count

FROM admissions a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN wards w ON w.id = a.current_ward_id
LEFT JOIN beds b ON b.id = a.current_bed_id
LEFT JOIN staff admitting_doc ON admitting_doc.id = a.admitting_doctor_id
LEFT JOIN staff attending_doc ON attending_doc.id = a.attending_physician_id
LEFT JOIN staff nurse ON nurse.id = a.primary_nurse_id
LEFT JOIN staff creator ON creator.id = a.created_by
LEFT JOIN staff discharged_doc ON discharged_doc.id = a.discharged_by
LEFT JOIN visits v ON v.id = a.encounter_id
WHERE a.admission_status NOT IN ('discharged', 'deceased');


-- ============================================================================
-- PART 2: Create view for admission history (includes all admissions)
-- ============================================================================

CREATE OR REPLACE VIEW admission_history_view AS
SELECT
    -- Admission identifiers
    a.id AS admission_id,
    a.admission_number,
    a.encounter_id,
    v.encounter_number,
    
    -- Patient info
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.emr_number AS hospital_id,
    
    -- Admission dates and status
    a.admission_date,
    a.actual_discharge_date,
    a.admission_type,
    a.admission_status,
    a.acuity_level,
    
    -- Clinical
    a.admitting_diagnosis,
    a.discharge_diagnosis,
    a.discharge_type,
    a.discharge_summary,
    
    -- Location
    w.name AS ward_name,
    b.bed_number,
    
    -- Care Team
    admitting_doc.first_name || ' ' || admitting_doc.last_name AS admitting_doctor_name,
    attending_doc.first_name || ' ' || attending_doc.last_name AS attending_physician_name,
    discharged_doc.first_name || ' ' || discharged_doc.last_name AS discharged_by_name,
    
    -- Metrics
    EXTRACT(DAY FROM (COALESCE(a.actual_discharge_date, NOW()) - a.admission_date))::INT AS length_of_stay_days,
    (SELECT COUNT(*) FROM ward_round_notes wrn WHERE wrn.admission_id = a.id) AS ward_round_count,
    (SELECT COUNT(*) FROM bed_transfers bt WHERE bt.admission_id = a.id) AS transfer_count,
    
    a.facility_id

FROM admissions a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN wards w ON w.id = a.current_ward_id
LEFT JOIN beds b ON b.id = a.current_bed_id
LEFT JOIN staff admitting_doc ON admitting_doc.id = a.admitting_doctor_id
LEFT JOIN staff attending_doc ON attending_doc.id = a.attending_physician_id
LEFT JOIN staff discharged_doc ON discharged_doc.id = a.discharged_by
LEFT JOIN visits v ON v.id = a.encounter_id
ORDER BY a.admission_date DESC;


-- ============================================================================
-- PART 3: Create view for ward round summary per admission
-- ============================================================================

CREATE OR REPLACE VIEW ward_round_summary_view AS
SELECT
    wrn.id AS ward_round_id,
    wrn.admission_id,
    wrn.encounter_id,
    wrn.round_date,
    wrn.round_type,
    wrn.subjective_notes,
    wrn.objective_findings,
    wrn.assessment,
    wrn.plan,
    wrn.vital_signs,
    wrn.patient_condition,
    wrn.nursing_instructions,
    wrn.estimated_discharge_date AS updated_discharge_date,
    wrn.discharge_planning_notes,
    wrn.new_orders,
    wrn.discontinued_orders,
    
    -- Attending physician
    wrn.attending_physician_id,
    doc.first_name || ' ' || doc.last_name AS attending_physician_name,
    doc.staff_id AS attending_physician_staff_id,
    
    -- Creator
    wrn.created_by,
    creator.first_name || ' ' || creator.last_name AS created_by_name,
    wrn.created_at,
    
    -- Participants
    wrn.participants,
    
    -- Parent admission info
    a.admission_number,
    p.emr_number AS hospital_id,
    p.first_name || ' ' || p.surname AS patient_name

FROM ward_round_notes wrn
JOIN admissions a ON a.id = wrn.admission_id
JOIN patients p ON p.id = a.patient_id
LEFT JOIN staff doc ON doc.id = wrn.attending_physician_id
LEFT JOIN staff creator ON creator.id = wrn.created_by
ORDER BY wrn.round_date DESC, wrn.created_at DESC;


-- ============================================================================
-- PART 4: Create view for patient admission status (for medical records)
-- ============================================================================

CREATE OR REPLACE VIEW patient_admission_status_view AS
SELECT
    p.id AS patient_id,
    p.emr_number,
    p.first_name,
    p.surname AS last_name,
    
    -- Current admission (if any)
    curr_adm.id AS current_admission_id,
    curr_adm.admission_number AS current_admission_number,
    curr_adm.admission_status AS current_status,
    curr_adm.admission_date AS current_admission_date,
    curr_ward.name AS current_ward,
    curr_bed.bed_number AS current_bed,
    curr_adm.acuity_level AS current_acuity,
    curr_adm.attending_physician_id,
    attending.first_name || ' ' || attending.last_name AS attending_physician_name,
    
    -- Admission history summary
    (SELECT COUNT(*) FROM admissions a WHERE a.patient_id = p.id) AS total_admissions,
    (SELECT COUNT(*) FROM admissions a WHERE a.patient_id = p.id AND a.admission_status = 'discharged') AS total_discharges,
    (SELECT MAX(a.admission_date) FROM admissions a WHERE a.patient_id = p.id AND a.admission_status = 'discharged') AS last_discharge_date,
    
    -- Is currently admitted?
    CASE WHEN curr_adm.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_currently_admitted

FROM patients p
LEFT JOIN admissions curr_adm ON curr_adm.patient_id = p.id 
    AND curr_adm.admission_status NOT IN ('discharged', 'deceased')
LEFT JOIN wards curr_ward ON curr_ward.id = curr_adm.current_ward_id
LEFT JOIN beds curr_bed ON curr_bed.id = curr_adm.current_bed_id
LEFT JOIN staff attending ON attending.id = curr_adm.attending_physician_id;


-- ============================================================================
-- PART 5: Grant permissions
-- ============================================================================

-- Allow authenticated users to read these views
GRANT SELECT ON active_admissions_view TO authenticated;
GRANT SELECT ON admission_history_view TO authenticated;
GRANT SELECT ON ward_round_summary_view TO authenticated;
GRANT SELECT ON patient_admission_status_view TO authenticated;
