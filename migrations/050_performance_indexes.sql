-- =============================================================================
-- Performance Optimization Indexes
-- =============================================================================
-- These indexes significantly improve query performance for common EMR operations
-- Run this migration to speed up encounter loading, patient searches, and more
-- =============================================================================

-- Visits table indexes (critical for encounter loading)
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_encounter_date ON visits(encounter_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_patient_status ON visits(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at DESC);

-- Consultations table indexes
CREATE INDEX IF NOT EXISTS idx_consultations_encounter_id ON consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);

-- Prescriptions table indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit_id ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

-- Lab requests table indexes
CREATE INDEX IF NOT EXISTS idx_lab_requests_encounter_id ON lab_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_visit_id ON lab_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient_id ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_lab_requests_created_at ON lab_requests(created_at DESC);

-- Radiology requests table indexes
CREATE INDEX IF NOT EXISTS idx_radiology_requests_encounter_id ON radiology_requests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_visit_id ON radiology_requests(visit_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_patient_id ON radiology_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_status ON radiology_requests(status);

-- Vitals table indexes (no visit_id column - only encounter_id)
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_vitals_date_recorded ON vitals(date_recorded DESC);

-- Nursing notes table indexes (no visit_id column)
CREATE INDEX IF NOT EXISTS idx_nursing_notes_encounter_id ON nursing_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient_id ON nursing_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_created_at ON nursing_notes(created_at DESC);

-- Daily progress notes table indexes (encounter_id is VARCHAR referencing visit_id)
CREATE INDEX IF NOT EXISTS idx_daily_progress_notes_encounter_id ON daily_progress_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_notes_patient_id ON daily_progress_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_notes_note_date ON daily_progress_notes(note_date DESC);

-- Treatment plans table indexes (no visit_id column)
CREATE INDEX IF NOT EXISTS idx_treatment_plans_encounter_id ON treatment_plans(encounter_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);

-- Patients table indexes (for search)
CREATE INDEX IF NOT EXISTS idx_patients_emr_number ON patients(emr_number);
CREATE INDEX IF NOT EXISTS idx_patients_surname ON patients(surname);
CREATE INDEX IF NOT EXISTS idx_patients_first_name ON patients(first_name);
CREATE INDEX IF NOT EXISTS idx_patients_contact_phone ON patients(contact_phone);

-- Billing tables indexes
CREATE INDEX IF NOT EXISTS idx_billing_orders_patient_id ON billing_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_encounter_id ON billing_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_status ON billing_orders(status);
CREATE INDEX IF NOT EXISTS idx_billing_orders_created_at ON billing_orders(created_at DESC);

-- Queue table indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_department_id ON queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_patient_id ON queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_location ON queue(location);

-- Staff table indexes
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);

-- =============================================================================
-- Composite indexes for common query patterns
-- =============================================================================

-- Patient encounters with status filter
CREATE INDEX IF NOT EXISTS idx_visits_patient_status_date 
  ON visits(patient_id, status, encounter_date DESC);

-- Lab requests by patient and status
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient_status 
  ON lab_requests(patient_id, status, created_at DESC);

-- Prescriptions by patient and status
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status 
  ON prescriptions(patient_id, status, created_at DESC);

-- =============================================================================
-- Analyze tables to update statistics for query planner
-- =============================================================================
ANALYZE visits;
ANALYZE consultations;
ANALYZE prescriptions;
ANALYZE lab_requests;
ANALYZE radiology_requests;
ANALYZE vitals;
ANALYZE nursing_notes;
ANALYZE daily_progress_notes;
ANALYZE treatment_plans;
ANALYZE patients;
ANALYZE billing_orders;
ANALYZE queue;
ANALYZE staff;
