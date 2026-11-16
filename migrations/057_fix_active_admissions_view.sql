-- Fix active_admissions_view to include 'transferred' status
-- It seems that in some cases (possibly legacy data or specific workflows), internal transfers might be setting the status to 'transferred'.
-- Or, 'transferred' is being used for internal transfers in a way that conflicts with the view definition.
-- By removing 'transferred' from the exclusion list, we ensure these patients remain visible.
-- Patients who are truly transferred OUT should ideally be marked as 'discharged' with a disposition of 'transferred',
-- or we should rely on them not having an active bed assignment if we want to filter them.

CREATE OR REPLACE VIEW active_admissions_view AS
SELECT
    a.id AS admission_id,
    a.admission_number,
    a.admission_date,
    a.admission_type,
    a.admission_status,
    a.admitting_diagnosis,
    a.acuity_level,
    a.expected_discharge_date,
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.date_of_birth,
    p.gender,
    p.emr_number AS hospital_id,
    w.name AS ward_name,
    w.ward_type,
    b.bed_number,
    s.first_name AS physician_first_name,
    s.last_name AS physician_last_name,
    a.facility_id
FROM admissions a
JOIN patients p ON p.id = a.patient_id
LEFT JOIN wards w ON w.id = a.current_ward_id
LEFT JOIN beds b ON b.id = a.current_bed_id
LEFT JOIN staff s ON s.id = a.attending_physician_id
WHERE a.admission_status NOT IN ('discharged', 'deceased'); -- Removed 'transferred'
