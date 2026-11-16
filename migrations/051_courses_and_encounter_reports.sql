-- =============================================================================
-- NDC Medical Centre EMR - COURSES TABLE
-- Description: Add courses management table for participant courses
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
-- RLS POLICIES FOR COURSES
-- =============================================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read courses
DROP POLICY IF EXISTS "Allow read access to courses" ON courses;
CREATE POLICY "Allow read access to courses"
    ON courses FOR SELECT
    TO authenticated
    USING (true);

-- Allow admin/manager to manage courses
DROP POLICY IF EXISTS "Allow admin to manage courses" ON courses;
CREATE POLICY "Allow admin to manage courses"
    ON courses FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s 
            WHERE s.user_id = auth.uid() 
            AND s.role IN ('admin', 'super_admin', 'medical_director', 'config_admin')
        )
    );

-- Grant permissions
GRANT SELECT ON courses TO authenticated;
GRANT ALL ON courses TO authenticated;
