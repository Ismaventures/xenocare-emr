-- =============================================================================
-- NDC Medical Centre EMR - COURSES AND ENCOUNTER REPORTS ENHANCEMENT
-- Description: Add courses management table and encounter report views
-- =============================================================================

-- =============================================================================
-- COURSES TABLE - For Managing Participant Courses
-- =============================================================================

-- Create courses table for admin to manage courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "Course 34", "Course 35"
    course_number INTEGER NOT NULL UNIQUE, -- e.g., 34, 35
    year INTEGER, -- Year the course started
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    facility_id UUID REFERENCES facilities(id)
);

-- Create index for courses
CREATE INDEX IF NOT EXISTS idx_courses_course_number ON courses(course_number);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);
CREATE INDEX IF NOT EXISTS idx_courses_facility ON courses(facility_id);

-- Insert default courses (Course 34 for current year 2025, Course 35 for next year)
INSERT INTO courses (course_name, course_number, year, description, is_active)
VALUES 
    ('Course 34', 34, 2025, 'Current active course for military and civilian participants', true),
    ('Course 35', 35, 2026, 'Upcoming course for military and civilian participants', false)
ON CONFLICT (course_name) DO NOTHING;

-- Add comment
COMMENT ON TABLE courses IS 'Manages courses for Military and Civilian Participants at NDC';

-- =============================================================================
-- ENCOUNTER REPORTING VIEWS
-- =============================================================================

-- Create a comprehensive encounter summary view for reporting
CREATE OR REPLACE VIEW encounter_summary_view AS
SELECT 
    e.id AS encounter_id,
    e.visit_id,
    e.encounter_number,
    e.encounter_date,
    e.start_time,
    e.end_time,
    e.status,
    e.visit_type,
    e.priority,
    e.chief_complaint,
    e.payment_category,
    e.current_stage,
    e.discharge_date,
    e.discharge_notes,
    e.created_at,
    e.updated_at,
    -- Patient info
    p.id AS patient_id,
    p.emr_number,
    p.first_name AS patient_first_name,
    p.surname AS patient_surname,
    p.first_name || ' ' || p.surname AS patient_full_name,
    p.date_of_birth AS patient_dob,
    p.gender AS patient_gender,
    p.patient_category,
    p.insurance_type,
    p.course AS patient_course,
    p.phone AS patient_phone,
    p.service_number,
    p.rank,
    -- Clinic info
    c.id AS clinic_id,
    c.clinic_name,
    c.clinic_code,
    -- Department info
    d.id AS department_id,
    d.name AS department_name,
    -- Attending doctor info
    doc.id AS doctor_id,
    doc.first_name AS doctor_first_name,
    doc.last_name AS doctor_last_name,
    doc.first_name || ' ' || doc.last_name AS doctor_full_name,
    doc.staff_number AS doctor_staff_number,
    doc.specialization AS doctor_specialization,
    -- Registrar info
    reg.id AS registrar_id,
    reg.first_name || ' ' || reg.last_name AS registrar_name,
    -- Facility info
    e.facility_id,
    f.name AS facility_name,
    -- Calculate duration
    CASE 
        WHEN e.end_time IS NOT NULL AND e.start_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (e.end_time::timestamp - e.start_time::timestamp)) / 60
        ELSE NULL 
    END AS duration_minutes,
    -- Count related records
    (SELECT COUNT(*) FROM vitals v WHERE v.encounter_id = e.id) AS vitals_count,
    (SELECT COUNT(*) FROM lab_orders lo WHERE lo.encounter_id = e.id) AS lab_orders_count,
    (SELECT COUNT(*) FROM imaging_orders io WHERE io.encounter_id = e.id) AS imaging_orders_count,
    (SELECT COUNT(*) FROM prescriptions pr WHERE pr.encounter_id = e.id) AS prescriptions_count,
    (SELECT COUNT(*) FROM billing_invoices bi WHERE bi.encounter_id = e.id) AS invoices_count,
    (SELECT COALESCE(SUM(bi.total_amount), 0) FROM billing_invoices bi WHERE bi.encounter_id = e.id) AS total_billed
FROM encounters e
LEFT JOIN patients p ON e.patient_id = p.id
LEFT JOIN clinics c ON e.clinic_id = c.id
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN staff doc ON e.attending_doctor_id = doc.id
LEFT JOIN staff reg ON e.registered_by = reg.id
LEFT JOIN facilities f ON e.facility_id = f.id
ORDER BY e.encounter_date DESC, e.created_at DESC;

-- Create an aggregate view for encounter statistics by department
CREATE OR REPLACE VIEW encounter_department_stats_view AS
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COUNT(DISTINCT e.id) AS total_encounters,
    COUNT(DISTINCT e.patient_id) AS unique_patients,
    COUNT(CASE WHEN e.status = 'Completed' THEN 1 END) AS completed_encounters,
    COUNT(CASE WHEN e.status = 'Cancelled' THEN 1 END) AS cancelled_encounters,
    COUNT(CASE WHEN e.status = 'In Progress' THEN 1 END) AS in_progress_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) = CURRENT_DATE THEN 1 END) AS today_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) AS this_week_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS this_month_encounters,
    AVG(EXTRACT(EPOCH FROM (e.end_time::timestamp - e.start_time::timestamp)) / 60) 
        FILTER (WHERE e.end_time IS NOT NULL AND e.start_time IS NOT NULL) AS avg_duration_minutes
FROM departments d
LEFT JOIN clinics c ON c.department_id = d.id
LEFT JOIN encounters e ON e.clinic_id = c.id
GROUP BY d.id, d.name
ORDER BY total_encounters DESC;

-- Create an aggregate view for encounter statistics by doctor
CREATE OR REPLACE VIEW encounter_doctor_stats_view AS
SELECT 
    s.id AS doctor_id,
    s.first_name || ' ' || s.last_name AS doctor_name,
    s.staff_number,
    s.specialization,
    d.name AS department_name,
    COUNT(DISTINCT e.id) AS total_encounters,
    COUNT(DISTINCT e.patient_id) AS unique_patients,
    COUNT(CASE WHEN e.status = 'Completed' THEN 1 END) AS completed_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) = CURRENT_DATE THEN 1 END) AS today_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) >= DATE_TRUNC('week', CURRENT_DATE) THEN 1 END) AS this_week_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS this_month_encounters,
    AVG(EXTRACT(EPOCH FROM (e.end_time::timestamp - e.start_time::timestamp)) / 60) 
        FILTER (WHERE e.end_time IS NOT NULL AND e.start_time IS NOT NULL) AS avg_duration_minutes
FROM staff s
INNER JOIN encounters e ON e.attending_doctor_id = s.id
LEFT JOIN clinics c ON e.clinic_id = c.id
LEFT JOIN departments d ON c.department_id = d.id
WHERE s.role IN ('doctor', 'consultant', 'physician')
GROUP BY s.id, s.first_name, s.last_name, s.staff_number, s.specialization, d.name
ORDER BY total_encounters DESC;

-- Create view for encounter stats by patient category
CREATE OR REPLACE VIEW encounter_patient_category_stats_view AS
SELECT 
    p.patient_category,
    p.insurance_type,
    COUNT(DISTINCT e.id) AS total_encounters,
    COUNT(DISTINCT p.id) AS unique_patients,
    COUNT(CASE WHEN e.status = 'Completed' THEN 1 END) AS completed_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) = CURRENT_DATE THEN 1 END) AS today_encounters,
    COUNT(CASE WHEN DATE(e.encounter_date) >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) AS this_month_encounters,
    COALESCE(SUM(
        (SELECT COALESCE(SUM(bi.total_amount), 0) FROM billing_invoices bi WHERE bi.encounter_id = e.id)
    ), 0) AS total_billed
FROM patients p
INNER JOIN encounters e ON e.patient_id = p.id
GROUP BY p.patient_category, p.insurance_type
ORDER BY total_encounters DESC;

-- Create view for daily encounter summary
CREATE OR REPLACE VIEW daily_encounter_summary_view AS
SELECT 
    DATE(e.encounter_date) AS encounter_day,
    COUNT(*) AS total_encounters,
    COUNT(DISTINCT e.patient_id) AS unique_patients,
    COUNT(CASE WHEN e.visit_type = 'New Visit' THEN 1 END) AS new_visits,
    COUNT(CASE WHEN e.visit_type = 'Follow-Up' THEN 1 END) AS follow_ups,
    COUNT(CASE WHEN e.visit_type = 'Emergency' THEN 1 END) AS emergencies,
    COUNT(CASE WHEN e.status = 'Completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN e.status = 'Cancelled' THEN 1 END) AS cancelled,
    COUNT(CASE WHEN e.priority = 'Emergency' THEN 1 END) AS priority_emergency,
    COUNT(CASE WHEN e.priority = 'Urgent' THEN 1 END) AS priority_urgent
FROM encounters e
WHERE e.encounter_date IS NOT NULL
GROUP BY DATE(e.encounter_date)
ORDER BY encounter_day DESC;

-- =============================================================================
-- RLS POLICIES FOR COURSES
-- =============================================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read courses
CREATE POLICY "Allow read access to courses"
    ON courses FOR SELECT
    TO authenticated
    USING (true);

-- Allow admin/manager to manage courses
CREATE POLICY "Allow admin to manage courses"
    ON courses FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s 
            WHERE s.user_id = auth.uid() 
            AND s.role IN ('admin', 'super_admin', 'manager')
        )
    );

-- Grant permissions
GRANT SELECT ON courses TO authenticated;
GRANT ALL ON courses TO authenticated;
GRANT SELECT ON encounter_summary_view TO authenticated;
GRANT SELECT ON encounter_department_stats_view TO authenticated;
GRANT SELECT ON encounter_doctor_stats_view TO authenticated;
GRANT SELECT ON encounter_patient_category_stats_view TO authenticated;
GRANT SELECT ON daily_encounter_summary_view TO authenticated;

COMMENT ON VIEW encounter_summary_view IS 'Comprehensive encounter view for medical records reporting';
COMMENT ON VIEW encounter_department_stats_view IS 'Encounter statistics aggregated by department';
COMMENT ON VIEW encounter_doctor_stats_view IS 'Encounter statistics aggregated by attending doctor';
COMMENT ON VIEW encounter_patient_category_stats_view IS 'Encounter statistics by patient category and insurance';
COMMENT ON VIEW daily_encounter_summary_view IS 'Daily encounter summary for trend analysis';
