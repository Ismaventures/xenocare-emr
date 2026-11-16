


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



-- Note: btree_gist should be in extensions schema for Supabase
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."affected_eye" AS ENUM (
    'Right',
    'Left',
    'Both'
);


ALTER TYPE "public"."affected_eye" OWNER TO "postgres";


CREATE TYPE "public"."appointment_status" AS ENUM (
    'Scheduled',
    'Confirmed',
    'Checked-in',
    'In Progress',
    'Completed',
    'Cancelled',
    'No Show'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."appointment_type" AS ENUM (
    'Consultation',
    'Follow-up',
    'Lab',
    'Radiology',
    'Procedure'
);


ALTER TYPE "public"."appointment_type" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status" AS ENUM (
    'Attended',
    'Missed',
    'Cancelled',
    'Rescheduled'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."audit_action" AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."bed_status" AS ENUM (
    'Available',
    'Occupied',
    'Reserved',
    'Maintenance',
    'Cleaning'
);


ALTER TYPE "public"."bed_status" OWNER TO "postgres";


CREATE TYPE "public"."billing_audit_event" AS ENUM (
    'ITEM_CREATED',
    'ITEM_VERIFIED',
    'ITEM_ADJUSTED',
    'ITEM_REJECTED',
    'PRICE_CHANGED',
    'CATEGORY_GROUPED',
    'INVOICE_GENERATED',
    'INVOICE_VOIDED',
    'RECEIPT_GENERATED',
    'RECEIPT_VOIDED',
    'PAYMENT_RECORDED',
    'PAYMENT_REVERSED',
    'STOCK_VALIDATED',
    'STOCK_VALIDATION_FAILED'
);


ALTER TYPE "public"."billing_audit_event" OWNER TO "postgres";


CREATE TYPE "public"."billing_order_status" AS ENUM (
    'Pending',
    'Awaiting_Payment',
    'Partially_Paid',
    'Paid',
    'Paid_NHIS',
    'Paid_Retainership',
    'Waived',
    'Cancelled'
);


ALTER TYPE "public"."billing_order_status" OWNER TO "postgres";


CREATE TYPE "public"."civilian_coverage_type" AS ENUM (
    'Civilian_NHIS',
    'Private'
);


ALTER TYPE "public"."civilian_coverage_type" OWNER TO "postgres";


CREATE TYPE "public"."clinical_request_status" AS ENUM (
    'Pending',
    'Under_Review',
    'Approved',
    'Rejected',
    'Scheduled',
    'In_Progress',
    'Completed',
    'Cancelled'
);


ALTER TYPE "public"."clinical_request_status" OWNER TO "postgres";


CREATE TYPE "public"."clinical_request_type" AS ENUM (
    'Follow-Up',
    'Procedure',
    'Surgery',
    'Admission',
    'Referral',
    'Transfer',
    'Discharge'
);


ALTER TYPE "public"."clinical_request_type" OWNER TO "postgres";


CREATE TYPE "public"."clinical_urgency" AS ENUM (
    'Routine',
    'Urgent',
    'Emergency'
);


ALTER TYPE "public"."clinical_urgency" OWNER TO "postgres";


CREATE TYPE "public"."complaint_category" AS ENUM (
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


ALTER TYPE "public"."complaint_category" OWNER TO "postgres";


CREATE TYPE "public"."config_data_type" AS ENUM (
    'string',
    'number',
    'boolean',
    'json'
);


ALTER TYPE "public"."config_data_type" OWNER TO "postgres";


CREATE TYPE "public"."consciousness_level" AS ENUM (
    'Alert',
    'Verbal',
    'Pain',
    'Unresponsive'
);


ALTER TYPE "public"."consciousness_level" OWNER TO "postgres";


CREATE TYPE "public"."dental_urgency" AS ENUM (
    'Routine',
    'Urgent',
    'Emergency'
);


ALTER TYPE "public"."dental_urgency" OWNER TO "postgres";


CREATE TYPE "public"."department_category" AS ENUM (
    'Clinical',
    'Diagnostic',
    'Support',
    'Administrative'
);


ALTER TYPE "public"."department_category" OWNER TO "postgres";


CREATE TYPE "public"."department_status" AS ENUM (
    'Active',
    'Inactive',
    'Maintenance'
);


ALTER TYPE "public"."department_status" OWNER TO "postgres";


CREATE TYPE "public"."dispense_status" AS ENUM (
    'Dispensed',
    'Pending',
    'Partial',
    'Out of Stock',
    'Cancelled',
    'Verified',
    'Awaiting_Payment',
    'Paid',
    'Waived'
);


ALTER TYPE "public"."dispense_status" OWNER TO "postgres";


CREATE TYPE "public"."drug_category" AS ENUM (
    'Antibiotics',
    'Analgesics',
    'Antimalarials',
    'Antihypertensives',
    'Antidiabetics',
    'Antivirals',
    'Antifungals',
    'Vaccines',
    'IV Fluids',
    'Vitamins and Supplements'
);


ALTER TYPE "public"."drug_category" OWNER TO "postgres";


CREATE TYPE "public"."drug_type" AS ENUM (
    'Tablets',
    'Capsules',
    'Syrups',
    'Injections',
    'Creams/Ointments',
    'IV Infusions'
);


ALTER TYPE "public"."drug_type" OWNER TO "postgres";


CREATE TYPE "public"."duration_unit" AS ENUM (
    'Hours',
    'Days',
    'Weeks',
    'Months'
);


ALTER TYPE "public"."duration_unit" OWNER TO "postgres";


CREATE TYPE "public"."evaluation_type" AS ENUM (
    'Initial',
    'Progress',
    'Discharge',
    'Re_Evaluation'
);


ALTER TYPE "public"."evaluation_type" OWNER TO "postgres";


CREATE TYPE "public"."exception_status" AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'AutoApproved',
    'Executed'
);


ALTER TYPE "public"."exception_status" OWNER TO "postgres";


CREATE TYPE "public"."exception_type" AS ENUM (
    'PaymentOverride',
    'QueueSkip',
    'PriorityChange',
    'TriageOverride',
    'AccessException',
    'ResultAmendment',
    'OrderCancellation',
    'DiscountApproval',
    'RefundApproval',
    'ScheduleOverride',
    'MedicationOverride',
    'PolicyException',
    'RoleElevation',
    'SystemOverride',
    'Other'
);


ALTER TYPE "public"."exception_type" OWNER TO "postgres";


CREATE TYPE "public"."feedback_status" AS ENUM (
    'Open',
    'In Progress',
    'Resolved',
    'Closed',
    'Escalated'
);


ALTER TYPE "public"."feedback_status" OWNER TO "postgres";


CREATE TYPE "public"."feedback_type" AS ENUM (
    'Complaint',
    'Suggestion',
    'Compliment',
    'Inquiry'
);


ALTER TYPE "public"."feedback_type" OWNER TO "postgres";


CREATE TYPE "public"."gender" AS ENUM (
    'Male',
    'Female',
    'Other'
);


ALTER TYPE "public"."gender" OWNER TO "postgres";


CREATE TYPE "public"."gingival_status" AS ENUM (
    'Healthy',
    'Gingivitis',
    'Mild_Periodontitis',
    'Moderate_Periodontitis',
    'Severe_Periodontitis'
);


ALTER TYPE "public"."gingival_status" OWNER TO "postgres";


CREATE TYPE "public"."imaging_type" AS ENUM (
    'X-Ray',
    'Ultrasound',
    'MRI',
    'CT',
    'Mammography',
    'Fluoroscopy',
    'Other'
);


ALTER TYPE "public"."imaging_type" OWNER TO "postgres";


CREATE TYPE "public"."insurance_type" AS ENUM (
    'Private',
    'DHML',
    'Civilian_NHIS'
);


ALTER TYPE "public"."insurance_type" OWNER TO "postgres";


CREATE TYPE "public"."invoice_category" AS ENUM (
    'Pharmacy',
    'Laboratory',
    'Radiology',
    'Procedures',
    'Consultation',
    'Nursing',
    'Admission',
    'Supplies',
    'Other'
);


ALTER TYPE "public"."invoice_category" OWNER TO "postgres";


CREATE TYPE "public"."iop_method" AS ENUM (
    'NCT',
    'Goldmann',
    'iCare',
    'Schiotz',
    'Palpation'
);


ALTER TYPE "public"."iop_method" OWNER TO "postgres";


CREATE TYPE "public"."item_verification_status" AS ENUM (
    'pending',
    'verified',
    'adjusted',
    'rejected'
);


ALTER TYPE "public"."item_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."lens_type" AS ENUM (
    'Single_Vision',
    'Bifocal',
    'Progressive',
    'Photochromic',
    'Contact_Lens'
);


ALTER TYPE "public"."lens_type" OWNER TO "postgres";


CREATE TYPE "public"."military_branch" AS ENUM (
    'Army',
    'Navy',
    'Air Force'
);


ALTER TYPE "public"."military_branch" OWNER TO "postgres";


CREATE TYPE "public"."mobility_status" AS ENUM (
    'Independent',
    'Assisted',
    'Dependent',
    'Bed_Bound'
);


ALTER TYPE "public"."mobility_status" OWNER TO "postgres";


CREATE TYPE "public"."nhis_patient_source" AS ENUM (
    'Internal',
    'Referral'
);


ALTER TYPE "public"."nhis_patient_source" OWNER TO "postgres";


CREATE TYPE "public"."notification_priority" AS ENUM (
    'Low',
    'Normal',
    'High',
    'Critical',
    'low',
    'normal',
    'high',
    'urgent',
    'critical'
);


ALTER TYPE "public"."notification_priority" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'Queue',
    'Payment',
    'LabResult',
    'RadiologyResult',
    'Prescription',
    'Referral',
    'Triage',
    'CriticalValue',
    'SystemAlert',
    'Reminder',
    'Message',
    'treatment_plan_created'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."nursing_note_type" AS ENUM (
    'Progress_Note',
    'Observation',
    'Incident',
    'Handoff',
    'Assessment',
    'Medication_Note',
    'Procedure_Note',
    'Patient_Response'
);


ALTER TYPE "public"."nursing_note_type" OWNER TO "postgres";


CREATE TYPE "public"."onset_type" AS ENUM (
    'Sudden',
    'Gradual',
    'Traumatic',
    'Post_Surgical',
    'Unknown'
);


ALTER TYPE "public"."onset_type" OWNER TO "postgres";


CREATE TYPE "public"."opd_classification" AS ENUM (
    'MOPD',
    'SOPD'
);


ALTER TYPE "public"."opd_classification" OWNER TO "postgres";


CREATE TYPE "public"."patient_acuity" AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'routine'
);


ALTER TYPE "public"."patient_acuity" OWNER TO "postgres";


CREATE TYPE "public"."patient_category" AS ENUM (
    'Military',
    'Civilian'
);


ALTER TYPE "public"."patient_category" OWNER TO "postgres";


CREATE TYPE "public"."patient_condition" AS ENUM (
    'Stable',
    'Improving',
    'Deteriorating',
    'Critical',
    'Unchanged'
);


ALTER TYPE "public"."patient_condition" OWNER TO "postgres";


CREATE TYPE "public"."patient_status" AS ENUM (
    'Active',
    'Inactive',
    'Deceased'
);


ALTER TYPE "public"."patient_status" OWNER TO "postgres";


CREATE TYPE "public"."patient_type" AS ENUM (
    'Principal',
    'Dependent',
    'Private'
);


ALTER TYPE "public"."patient_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'Cash',
    'POS',
    'NHIS',
    'Retainership',
    'DHML',
    'Military_Free',
    'Staff_Account',
    'Bank_Transfer'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'Paid',
    'Partially Paid',
    'Unpaid'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."physio_plan_status" AS ENUM (
    'Active',
    'On_Hold',
    'Completed',
    'Discharged',
    'Transferred'
);


ALTER TYPE "public"."physio_plan_status" OWNER TO "postgres";


CREATE TYPE "public"."priority" AS ENUM (
    'Normal',
    'Urgent',
    'Emergency'
);


ALTER TYPE "public"."priority" OWNER TO "postgres";


CREATE TYPE "public"."queue_location" AS ENUM (
    'Reception',
    'Registration',
    'Nursing',
    'Consultation',
    'Laboratory',
    'Lab',
    'Radiology',
    'Pharmacy',
    'Billing',
    'Cashier',
    'CustomerService',
    'Dental',
    'Ophthalmology',
    'Physiotherapy'
);


ALTER TYPE "public"."queue_location" OWNER TO "postgres";


CREATE TYPE "public"."queue_priority_enum" AS ENUM (
    'Emergency',
    'Urgent',
    'Normal'
);


ALTER TYPE "public"."queue_priority_enum" OWNER TO "postgres";


CREATE TYPE "public"."queue_status" AS ENUM (
    'Waiting',
    'Called',
    'In Progress',
    'Completed',
    'Cancelled',
    'No Show',
    'Ready_For_Consultation',
    'Skipped'
);


ALTER TYPE "public"."queue_status" OWNER TO "postgres";


CREATE TYPE "public"."referral_module_status" AS ENUM (
    'Pending',
    'Accepted',
    'Rejected',
    'InProgress',
    'Completed',
    'Cancelled'
);


ALTER TYPE "public"."referral_module_status" OWNER TO "postgres";


CREATE TYPE "public"."referral_priority" AS ENUM (
    'Routine',
    'Urgent',
    'Emergent',
    'Stat'
);


ALTER TYPE "public"."referral_priority" OWNER TO "postgres";


CREATE TYPE "public"."referral_status_enum" AS ENUM (
    'Active',
    'Expired',
    'Used',
    'Cancelled'
);


ALTER TYPE "public"."referral_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."referral_type" AS ENUM (
    'Consultation',
    'Transfer',
    'CoManagement',
    'Procedure'
);


ALTER TYPE "public"."referral_type" OWNER TO "postgres";


CREATE TYPE "public"."report_status" AS ENUM (
    'Draft',
    'Pending Approval',
    'Approved',
    'Issued',
    'Revoked'
);


ALTER TYPE "public"."report_status" OWNER TO "postgres";


CREATE TYPE "public"."report_type" AS ENUM (
    'Medical Certificate',
    'Sick Leave',
    'Fitness Report',
    'Referral Letter',
    'Discharge Summary',
    'Death Certificate',
    'Medical Report'
);


ALTER TYPE "public"."report_type" OWNER TO "postgres";


CREATE TYPE "public"."request_status" AS ENUM (
    'Pending',
    'In Progress',
    'Sample Collected',
    'Completed',
    'Reported',
    'Cancelled',
    'Accepted',
    'Rejected',
    'Awaiting_Payment',
    'Paid',
    'Waived',
    'Sample_Collected',
    'Processing',
    'Result_Ready',
    'Result_Viewed',
    'Scheduled',
    'Dispensed',
    'Partial',
    'Out of Stock'
);


ALTER TYPE "public"."request_status" OWNER TO "postgres";


CREATE TYPE "public"."service_type" AS ENUM (
    'Consultation',
    'Laboratory',
    'Radiology',
    'Pharmacy',
    'Surgery',
    'Procedure',
    'Nursing',
    'Admission',
    'Supplies',
    'Other'
);


ALTER TYPE "public"."service_type" OWNER TO "postgres";


CREATE TYPE "public"."shift" AS ENUM (
    'Morning',
    'Evening',
    'Night'
);


ALTER TYPE "public"."shift" OWNER TO "postgres";


CREATE TYPE "public"."shift_type" AS ENUM (
    'Morning',
    'Afternoon',
    'Night'
);


ALTER TYPE "public"."shift_type" OWNER TO "postgres";


CREATE TYPE "public"."source_module" AS ENUM (
    'registration',
    'consultation',
    'nursing',
    'lab',
    'radiology',
    'pharmacy',
    'procedure',
    'admission'
);


ALTER TYPE "public"."source_module" OWNER TO "postgres";


CREATE TYPE "public"."staff_category" AS ENUM (
    'Military',
    'Civilian',
    'DS',
    'Guest Lecturer'
);


ALTER TYPE "public"."staff_category" OWNER TO "postgres";


CREATE TYPE "public"."tooth_condition" AS ENUM (
    'Healthy',
    'Caries',
    'Filled',
    'Crown',
    'Bridge_Abutment',
    'Root_Canal_Treated',
    'Fractured',
    'Mobile',
    'Extracted'
);


ALTER TYPE "public"."tooth_condition" OWNER TO "postgres";


CREATE TYPE "public"."tooth_status" AS ENUM (
    'Present',
    'Missing',
    'Impacted',
    'Deciduous',
    'Unerupted',
    'Partial_Eruption'
);


ALTER TYPE "public"."tooth_status" OWNER TO "postgres";


CREATE TYPE "public"."treatment_plan_status" AS ENUM (
    'Created',
    'Viewed',
    'In_Progress',
    'Completed',
    'Cancelled'
);


ALTER TYPE "public"."treatment_plan_status" OWNER TO "postgres";


CREATE TYPE "public"."treatment_task_status" AS ENUM (
    'Pending',
    'In_Progress',
    'Completed',
    'Skipped',
    'Escalated'
);


ALTER TYPE "public"."treatment_task_status" OWNER TO "postgres";


CREATE TYPE "public"."treatment_task_type" AS ENUM (
    'Administer_Medication',
    'Monitor_Vitals',
    'Procedure',
    'Observation',
    'Patient_Education',
    'Wound_Care',
    'Sample_Collection',
    'Other'
);


ALTER TYPE "public"."treatment_task_type" OWNER TO "postgres";


CREATE TYPE "public"."triage_status" AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled'
);


ALTER TYPE "public"."triage_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'super_admin',
    'admin',
    'medical_director',
    'doctor',
    'nurse',
    'lab_technician',
    'radiologist',
    'pharmacist',
    'billing_clerk',
    'receptionist',
    'cashier',
    'customer_service',
    'inventory_manager',
    'config_admin',
    'patient'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."visit_status" AS ENUM (
    'Active',
    'Completed',
    'Cancelled',
    'Created',
    'Closed',
    'Discharged',
    'Registered'
);


ALTER TYPE "public"."visit_status" OWNER TO "postgres";


CREATE TYPE "public"."ward_type" AS ENUM (
    'General',
    'ICU',
    'Emergency',
    'Pediatric',
    'Maternity',
    'Surgical',
    'Psychiatric',
    'Isolation',
    'Outpatient'
);


ALTER TYPE "public"."ward_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_bed_on_admission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- If a bed is being assigned
    IF NEW.current_bed_id IS NOT NULL AND (OLD.current_bed_id IS NULL OR NEW.current_bed_id != OLD.current_bed_id) THEN
        -- Release old bed if there was one
        IF OLD.current_bed_id IS NOT NULL THEN
            UPDATE beds 
            SET status = 'Cleaning', 
                current_patient_id = NULL, 
                current_admission_id = NULL,
                updated_at = NOW()
            WHERE id = OLD.current_bed_id;
        END IF;
        
        -- Assign new bed
        UPDATE beds 
        SET status = 'Occupied', 
            current_patient_id = NEW.patient_id, 
            current_admission_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;
    
    -- If admission is being discharged, release the bed
    IF NEW.admission_status IN ('discharged', 'transferred', 'deceased') 
       AND OLD.admission_status NOT IN ('discharged', 'transferred', 'deceased') THEN
        UPDATE beds 
        SET status = 'Cleaning', 
            current_patient_id = NULL, 
            current_admission_id = NULL,
            updated_at = NOW()
        WHERE id = NEW.current_bed_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_bed_on_admission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_add_on_call_to_care_team"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_staff_record RECORD;
    v_encounter_record RECORD;
BEGIN
    -- When on-call schedule is activated, add doctor to active encounters in that department
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true) THEN
        
        -- Get staff details
        SELECT * INTO v_staff_record
        FROM staff
        WHERE id = NEW.staff_id;
        
        -- Add to active encounters in the department
        FOR v_encounter_record IN 
            SELECT v.id as encounter_id
            FROM visits v
            JOIN clinics c ON c.clinic_id = v.clinic_id::text
            WHERE c.clinic_name = NEW.department
              AND v.status = 'Active'
              AND NOT EXISTS (
                  SELECT 1 FROM encounter_care_team ect
                  WHERE ect.encounter_id = v.id
                    AND ect.staff_id = NEW.staff_id
                    AND ect.is_active = true
              )
        LOOP
            INSERT INTO encounter_care_team (
                encounter_id,
                staff_id,
                staff_name,
                role,
                department,
                assigned_by,
                expires_at,
                is_active,
                notes
            ) VALUES (
                v_encounter_record.encounter_id,
                NEW.staff_id,
                v_staff_record.first_name || ' ' || v_staff_record.last_name,
                'on_call_doctor',
                NEW.department,
                NEW.created_by,
                NEW.end_time,
                true,
                'Auto-added via on-call schedule'
            )
            ON CONFLICT (encounter_id, staff_id, role) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_on_call_to_care_team"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_shift_to_note"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Auto-assign shift if not provided
    IF NEW.shift IS NULL THEN
        NEW.shift := get_current_shift(NEW.created_at::TIME);
    END IF;
    
    -- Auto-assign shift date if not provided
    IF NEW.shift_date IS NULL THEN
        NEW.shift_date := get_shift_date(NEW.created_at);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_shift_to_note"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_deactivate_expired_access"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if access has expired
    IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.is_active = true THEN
        NEW.is_active = false;
        NEW.updated_at = NOW();
        
        -- Log the expiration
        INSERT INTO encounter_access_logs (
            encounter_id, 
            user_id, 
            user_role, 
            action, 
            action_details, 
            was_authorized
        )
        VALUES (
            NEW.encounter_id,
            NEW.staff_id,
            NEW.role,
            'access_expired',
            'Temporary access expired for ' || NEW.staff_name,
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_deactivate_expired_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_vitals_due"("p_schedule_id" "uuid", "p_from_time" timestamp with time zone DEFAULT "now"()) RETURNS timestamp with time zone
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_frequency INTEGER;
    v_custom_frequency INTEGER;
    v_acuity patient_acuity;
BEGIN
    -- Get the schedule's frequency
    SELECT 
        pvs.acuity_level,
        pvs.custom_frequency_minutes,
        vsc.frequency_minutes
    INTO v_acuity, v_custom_frequency, v_frequency
    FROM patient_vital_schedules pvs
    JOIN vital_schedule_configs vsc ON vsc.acuity_level = pvs.acuity_level
    WHERE pvs.id = p_schedule_id;
    
    -- Use custom frequency if set, otherwise default
    IF v_custom_frequency IS NOT NULL THEN
        v_frequency := v_custom_frequency;
    END IF;
    
    RETURN p_from_time + (v_frequency || ' minutes')::INTERVAL;
END;
$$;


ALTER FUNCTION "public"."calculate_next_vitals_due"("p_schedule_id" "uuid", "p_from_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_nhis_amounts"("p_gross_amount" numeric, "p_insurance_type" character varying, "p_service_type" character varying DEFAULT 'Other'::character varying) RETURNS TABLE("nhis_covered" boolean, "nhis_percentage" integer, "nhis_payable" numeric, "patient_payable" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_coverage_pct INTEGER := 0;
    v_is_nhis BOOLEAN := FALSE;
    v_consultation_free BOOLEAN := FALSE;
BEGIN
    -- Normalize insurance type
    p_insurance_type := LOWER(REPLACE(COALESCE(p_insurance_type, ''), '_', ' '));
    
    -- Check if NHIS patient
    IF p_insurance_type IN ('military nhis', 'dhml', 'civilian nhis') THEN
        v_is_nhis := TRUE;
        
        -- Get coverage from config
        SELECT nc.coverage_percentage, nc.consultation_fully_covered
        INTO v_coverage_pct, v_consultation_free
        FROM nhis_config nc
        WHERE LOWER(REPLACE(nc.payment_category, '_', ' ')) = p_insurance_type
        LIMIT 1;
        
        -- Default coverage if not in config
        IF v_coverage_pct IS NULL THEN
            IF p_insurance_type IN ('military nhis', 'dhml') THEN
                v_coverage_pct := 100;
                v_consultation_free := TRUE;
            ELSE
                v_coverage_pct := 90;
                v_consultation_free := TRUE;
            END IF;
        END IF;
        
        -- Special rule: Consultation is 100% free for ALL NHIS patients
        IF LOWER(p_service_type) = 'consultation' AND v_consultation_free THEN
            v_coverage_pct := 100;
        END IF;
    END IF;
    
    -- Return calculated values
    nhis_covered := v_is_nhis;
    nhis_percentage := v_coverage_pct;
    nhis_payable := ROUND(p_gross_amount * v_coverage_pct / 100, 2);
    patient_payable := p_gross_amount - nhis_payable;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."calculate_nhis_amounts"("p_gross_amount" numeric, "p_insurance_type" character varying, "p_service_type" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_encounter_access"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) RETURNS TABLE("has_access" boolean, "access_role" character varying, "access_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_attending_doctor_id UUID;
    v_clinic_name VARCHAR(100);
    v_care_team_role VARCHAR(50);
    v_encounter_status VARCHAR(50);
BEGIN
    -- Get encounter details
    SELECT 
        v.attending_doctor_id,
        c.clinic_name,
        v.status
    INTO v_attending_doctor_id, v_clinic_name, v_encounter_status
    FROM visits v
    LEFT JOIN clinics c ON v.clinic_id::text = c.clinic_id
    WHERE v.id = p_encounter_id;
    
    -- Not found
    IF v_attending_doctor_id IS NULL AND v_clinic_name IS NULL THEN
        RETURN QUERY SELECT false, 'no_access'::VARCHAR, 'Encounter not found';
        RETURN;
    END IF;
    
    -- Super admin always has access
    IF p_user_role = 'super_admin' THEN
        RETURN QUERY SELECT true, 'super_admin'::VARCHAR, 'Super admin access';
        RETURN;
    END IF;
    
    -- Primary doctor
    IF v_attending_doctor_id = p_user_id THEN
        RETURN QUERY SELECT true, 'primary_doctor'::VARCHAR, 'Primary assigned doctor';
        RETURN;
    END IF;
    
    -- Check care team
    SELECT role INTO v_care_team_role
    FROM encounter_care_team
    WHERE encounter_id = p_encounter_id 
      AND staff_id = p_user_id 
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF v_care_team_role IS NOT NULL THEN
        RETURN QUERY SELECT true, v_care_team_role::VARCHAR, 'Care team member';
        RETURN;
    END IF;
    
    -- Same department doctors (read-only)
    IF p_user_role IN ('doctor', 'medical_director') AND v_clinic_name = p_user_department THEN
        RETURN QUERY SELECT true, 'department_doctor'::VARCHAR, 'Same department - read only';
        RETURN;
    END IF;
    
    -- Medical director can view all
    IF p_user_role = 'medical_director' THEN
        RETURN QUERY SELECT true, 'department_doctor'::VARCHAR, 'Medical director oversight';
        RETURN;
    END IF;
    
    -- Service departments with pending orders
    IF p_user_role = 'lab_technician' THEN
        IF EXISTS (SELECT 1 FROM lab_requests WHERE encounter_id = p_encounter_id) THEN
            RETURN QUERY SELECT true, 'lab_technician'::VARCHAR, 'Has pending lab orders';
            RETURN;
        END IF;
    END IF;
    
    IF p_user_role = 'radiologist' THEN
        IF EXISTS (SELECT 1 FROM radiology_requests WHERE encounter_id = p_encounter_id) THEN
            RETURN QUERY SELECT true, 'radiologist'::VARCHAR, 'Has pending radiology orders';
            RETURN;
        END IF;
    END IF;
    
    IF p_user_role = 'pharmacist' THEN
        IF EXISTS (SELECT 1 FROM prescriptions WHERE encounter_id = p_encounter_id) THEN
            RETURN QUERY SELECT true, 'pharmacist'::VARCHAR, 'Has prescriptions';
            RETURN;
        END IF;
    END IF;
    
    -- Nurses on active encounters
    IF p_user_role = 'nurse' AND v_encounter_status = 'Active' THEN
        RETURN QUERY SELECT true, 'nurse'::VARCHAR, 'Nurse on active encounter';
        RETURN;
    END IF;
    
    -- No access
    RETURN QUERY SELECT false, 'no_access'::VARCHAR, 'No access rights';
END;
$$;


ALTER FUNCTION "public"."check_encounter_access"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_encounter_access"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) IS 'Determines user access role for an encounter based on ownership, care team, and department';



CREATE OR REPLACE FUNCTION "public"."check_overdue_vital_schedules"() RETURNS TABLE("schedule_id" "uuid", "patient_id" character varying, "patient_name" "text", "encounter_id" "uuid", "acuity_level" "public"."patient_acuity", "minutes_overdue" integer, "assigned_nurse_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH overdue_schedules AS (
        UPDATE patient_vital_schedules pvs
        SET 
            is_overdue = TRUE,
            overdue_since = COALESCE(overdue_since, next_vitals_due),
            updated_at = NOW()
        FROM vital_schedule_configs vsc
        WHERE pvs.acuity_level = vsc.acuity_level
        AND pvs.is_active = TRUE
        AND pvs.paused = FALSE
        AND pvs.next_vitals_due IS NOT NULL
        AND NOW() > (pvs.next_vitals_due + (vsc.grace_period_minutes || ' minutes')::INTERVAL)
        AND pvs.is_overdue = FALSE
        RETURNING pvs.*
    )
    SELECT 
        os.id,
        os.patient_id,
        CONCAT(p.first_name, ' ', p.surname)::TEXT,
        os.encounter_id,
        os.acuity_level,
        EXTRACT(EPOCH FROM (NOW() - os.next_vitals_due))::INTEGER / 60,
        os.assigned_nurse_id
    FROM overdue_schedules os
    JOIN patients p ON p.patient_id = os.patient_id;
END;
$$;


ALTER FUNCTION "public"."check_overdue_vital_schedules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_on_call_access"() RETURNS TABLE("deactivated_count" integer, "affected_encounters" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_deactivated_count INTEGER := 0;
    v_affected_encounters INTEGER := 0;
BEGIN
    -- Deactivate expired care team members
    WITH deactivated AS (
        UPDATE encounter_care_team
        SET is_active = false, updated_at = NOW()
        WHERE expires_at < NOW() 
          AND is_active = true
        RETURNING encounter_id
    )
    SELECT COUNT(*), COUNT(DISTINCT encounter_id)
    INTO v_deactivated_count, v_affected_encounters
    FROM deactivated;
    
    -- Log the cleanup action
    IF v_deactivated_count > 0 THEN
        INSERT INTO encounter_access_logs (
            encounter_id,
            user_id,
            user_role,
            action,
            action_details,
            was_authorized
        )
        SELECT 
            DISTINCT encounter_id,
            staff_id,
            'system',
            'cleanup_expired_access',
            'Deactivated ' || v_deactivated_count || ' expired access grants',
            true
        FROM encounter_care_team
        WHERE expires_at < NOW() AND is_active = false
        LIMIT 1;
    END IF;
    
    RETURN QUERY SELECT v_deactivated_count, v_affected_encounters;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_on_call_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_on_call_access"() IS 'Deactivates expired care team members and returns cleanup statistics';



CREATE OR REPLACE FUNCTION "public"."cleanup_past_on_call_schedules"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE on_call_schedule
    SET is_active = false, updated_at = NOW()
    WHERE end_time < NOW() 
      AND is_active = true;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_past_on_call_schedules"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_past_on_call_schedules"() IS 'Deactivates past on-call schedules';



CREATE OR REPLACE FUNCTION "public"."create_enum_if_not_exists"("enum_name" "text", "enum_values" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name) THEN
        EXECUTE format('CREATE TYPE %I AS ENUM (%s)', enum_name, array_to_string(array(SELECT quote_literal(x) FROM unnest(enum_values) x), ', '));
    END IF;
END;
$$;


ALTER FUNCTION "public"."create_enum_if_not_exists"("enum_name" "text", "enum_values" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_type" character varying, "p_title" character varying, "p_message" "text", "p_priority" character varying DEFAULT 'normal'::character varying, "p_target_user_id" "uuid" DEFAULT NULL::"uuid", "p_target_role" character varying DEFAULT NULL::character varying, "p_target_department" character varying DEFAULT NULL::character varying, "p_encounter_id" "uuid" DEFAULT NULL::"uuid", "p_patient_id" character varying DEFAULT NULL::character varying, "p_reference_type" character varying DEFAULT NULL::character varying, "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_action_url" character varying DEFAULT NULL::character varying, "p_action_label" character varying DEFAULT NULL::character varying, "p_created_by" "uuid" DEFAULT NULL::"uuid", "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        type, title, message, priority,
        target_user_id, target_role, target_department,
        encounter_id, patient_id,
        reference_type, reference_id,
        action_url, action_label,
        created_by, expires_at, metadata
    ) VALUES (
        p_type::notification_type, p_title, p_message, p_priority::notification_priority,
        p_target_user_id, p_target_role, p_target_department,
        p_encounter_id, p_patient_id,
        p_reference_type, p_reference_id,
        p_action_url, p_action_label,
        p_created_by, p_expires_at, p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_type" character varying, "p_title" character varying, "p_message" "text", "p_priority" character varying, "p_target_user_id" "uuid", "p_target_role" character varying, "p_target_department" character varying, "p_encounter_id" "uuid", "p_patient_id" character varying, "p_reference_type" character varying, "p_reference_id" "uuid", "p_action_url" character varying, "p_action_label" character varying, "p_created_by" "uuid", "p_expires_at" timestamp with time zone, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_staff_user"("email_address" "text", "password" "text", "first_name" "text", "last_name" "text", "user_role" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
    new_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- 1. Check if the executing user is an admin
    SELECT role INTO current_user_role
    FROM staff
    WHERE user_id = auth.uid();

    IF current_user_role NOT IN ('super_admin', 'admin', 'medical_director', 'config_admin') THEN
        RAISE EXCEPTION 'Access Denied: Only admins can create new users.';
    END IF;

    -- 2. Generate new UUID using gen_random_uuid()
    new_user_id := gen_random_uuid();

    -- 3. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        email_address,
        crypt(password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
            'full_name', first_name || ' ' || last_name,
            'role', user_role
        ),
        NOW(),
        NOW(),
        '',
        '',
        FALSE
    );

    -- 4. Insert into auth.identities (Required for Supabase Auth to work correctly with email provider)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object(
            'sub', new_user_id,
            'email', email_address,
            'email_verified', true,
            'phone_verified', false
        ),
        'email',
        new_user_id::text,
        NOW(),
        NOW(),
        NOW()
    );

    RETURN new_user_id;
END;
$$;


ALTER FUNCTION "public"."create_staff_user"("email_address" "text", "password" "text", "first_name" "text", "last_name" "text", "user_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_vital_schedule_on_admission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only create schedule for inpatient/emergency encounters
    -- visit_type values: 'New Visit', 'Follow-Up', 'Emergency', 'Inpatient', etc.
    IF NEW.visit_type IN ('Inpatient', 'Emergency', 'Admission') AND NEW.status = 'Active' THEN
        INSERT INTO patient_vital_schedules (
            patient_id,
            encounter_id,
            acuity_level,
            next_vitals_due,
            created_by
        ) VALUES (
            NEW.patient_id,
            NEW.id,
            CASE 
                WHEN NEW.visit_type = 'Emergency' THEN 'high'::patient_acuity
                ELSE 'medium'::patient_acuity
            END,
            NOW() + INTERVAL '30 minutes',  -- First vitals due in 30 min
            NEW.attending_doctor_id
        )
        ON CONFLICT (patient_id, encounter_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_vital_schedule_on_admission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE notifications
    SET is_dismissed = TRUE, dismissed_at = NOW()
    WHERE id = p_notification_id
    AND (target_user_id = p_user_id OR target_user_id IS NULL);
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_single_primary_complaint"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."enforce_single_primary_complaint"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_admission_number"("facility_code" character varying DEFAULT 'ADM'::character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_number VARCHAR(50);
    prefix_length INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    -- 'ADM-2026-' has length: len(ADM) + 1 + 4 + 1 = len(ADM) + 6
    -- So the sequence starts at: len(ADM) + 7
    prefix_length := LENGTH(facility_code) + 6;
    
    SELECT COALESCE(MAX(
        -- Start substring from the character AFTER the prefix (prefix_length + 1)
        CAST(SUBSTRING(admission_number FROM prefix_length + 1) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM admissions
    WHERE admission_number LIKE facility_code || '-' || year_part || '-%';
    
    new_number := facility_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$;


ALTER FUNCTION "public"."generate_admission_number"("facility_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_beds_for_ward"("p_ward_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_beds_for_ward"("p_ward_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_category_invoice_number"("p_category" "public"."invoice_category") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_prefix character varying(4);
    v_year character varying(2);
    v_month character varying(2);
    v_sequence integer;
    v_invoice_number character varying(50);
BEGIN
    -- Get category prefix
    v_prefix := CASE p_category
        WHEN 'Pharmacy' THEN 'PH'
        WHEN 'Laboratory' THEN 'LB'
        WHEN 'Radiology' THEN 'RD'
        WHEN 'Procedures' THEN 'PR'
        WHEN 'Consultation' THEN 'CN'
        WHEN 'Nursing' THEN 'NR'
        WHEN 'Admission' THEN 'AD'
        WHEN 'Supplies' THEN 'SP'
        ELSE 'OT'
    END;
    
    -- Get current year and month
    v_year := to_char(CURRENT_DATE, 'YY');
    v_month := to_char(CURRENT_DATE, 'MM');
    
    -- Get next sequence number for this category this month
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(invoice_number, '^INV-' || v_prefix || '-' || v_year || v_month || '-', ''), '')::integer
    ), 0) + 1
    INTO v_sequence
    FROM "public"."category_invoices"
    WHERE invoice_number LIKE 'INV-' || v_prefix || '-' || v_year || v_month || '-%';
    
    -- Generate invoice number: INV-PH-2601-00001
    v_invoice_number := 'INV-' || v_prefix || '-' || v_year || v_month || '-' || lpad(v_sequence::text, 5, '0');
    
    RETURN v_invoice_number;
END;
$$;


ALTER FUNCTION "public"."generate_category_invoice_number"("p_category" "public"."invoice_category") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_category_receipt_number"("p_category" "public"."invoice_category") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_prefix character varying(4);
    v_year character varying(2);
    v_month character varying(2);
    v_sequence integer;
    v_receipt_number character varying(50);
BEGIN
    -- Get category prefix
    v_prefix := CASE p_category
        WHEN 'Pharmacy' THEN 'PH'
        WHEN 'Laboratory' THEN 'LB'
        WHEN 'Radiology' THEN 'RD'
        WHEN 'Procedures' THEN 'PR'
        WHEN 'Consultation' THEN 'CN'
        WHEN 'Nursing' THEN 'NR'
        WHEN 'Admission' THEN 'AD'
        WHEN 'Supplies' THEN 'SP'
        ELSE 'OT'
    END;
    
    -- Get current year and month
    v_year := to_char(CURRENT_DATE, 'YY');
    v_month := to_char(CURRENT_DATE, 'MM');
    
    -- Get next sequence number
    SELECT COALESCE(MAX(
        NULLIF(regexp_replace(receipt_number, '^RCP-' || v_prefix || '-' || v_year || v_month || '-', ''), '')::integer
    ), 0) + 1
    INTO v_sequence
    FROM "public"."category_receipts"
    WHERE receipt_number LIKE 'RCP-' || v_prefix || '-' || v_year || v_month || '-%';
    
    -- Generate receipt number: RCP-PH-2601-00001
    v_receipt_number := 'RCP-' || v_prefix || '-' || v_year || v_month || '-' || lpad(v_sequence::text, 5, '0');
    
    RETURN v_receipt_number;
END;
$$;


ALTER FUNCTION "public"."generate_category_receipt_number"("p_category" "public"."invoice_category") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_clinical_request_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                              LPAD(nextval('clinical_request_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_clinical_request_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_emr_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.emr_number IS NULL OR NEW.emr_number = '' THEN
        NEW.emr_number := 'NDC-' || LPAD(nextval('emr_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_emr_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_encounter_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.encounter_number IS NULL OR NEW.encounter_number = '' THEN
        NEW.encounter_number := 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('encounter_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_encounter_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_external_referral_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.referral_number IS NULL THEN
        NEW.referral_number := 'EXT-' || UPPER(SUBSTRING(NEW.direction, 1, 3)) || '-' || 
                               TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                               LPAD(nextval('external_referral_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_external_referral_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_procedure_number"("facility_code" character varying DEFAULT 'PRC'::character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_number VARCHAR(50);
    prefix_length INTEGER;
BEGIN
    year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
    prefix_length := LENGTH(facility_code) + 6;
    
    SELECT COALESCE(MAX(
        -- Start substring from the character AFTER the prefix (prefix_length + 1)
        CAST(SUBSTRING(procedure_number FROM prefix_length + 1) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM procedures
    WHERE procedure_number LIKE facility_code || '-' || year_part || '-%';
    
    new_number := facility_code || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    RETURN new_number;
END;
$$;


ALTER FUNCTION "public"."generate_procedure_number"("facility_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_visit_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.visit_id IS NULL OR NEW.visit_id = '' THEN
        NEW.visit_id := 'VIS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('visit_id_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_visit_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_on_call_doctors"("p_department" character varying) RETURNS TABLE("staff_id" "uuid", "staff_name" character varying, "start_time" timestamp with time zone, "end_time" timestamp with time zone, "hours_remaining" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ocs.staff_id,
        s.first_name || ' ' || s.last_name as staff_name,
        ocs.start_time,
        ocs.end_time,
        ROUND(EXTRACT(EPOCH FROM (ocs.end_time - NOW())) / 3600, 1) as hours_remaining
    FROM on_call_schedule ocs
    JOIN staff s ON s.id = ocs.staff_id
    WHERE ocs.department = p_department
      AND ocs.is_active = true
      AND NOW() BETWEEN ocs.start_time AND ocs.end_time
    ORDER BY ocs.end_time;
END;
$$;


ALTER FUNCTION "public"."get_active_on_call_doctors"("p_department" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_on_call_doctors"("p_department" character varying) IS 'Returns currently on-call doctors for a department';



CREATE OR REPLACE FUNCTION "public"."get_current_shift"("p_time" time without time zone DEFAULT CURRENT_TIME) RETURNS character varying
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Day shift: 7:00 AM - 3:00 PM
    IF p_time >= '07:00'::TIME AND p_time < '15:00'::TIME THEN
        RETURN 'day';
    -- Evening shift: 3:00 PM - 11:00 PM
    ELSIF p_time >= '15:00'::TIME AND p_time < '23:00'::TIME THEN
        RETURN 'evening';
    -- Night shift: 11:00 PM - 7:00 AM
    ELSE
        RETURN 'night';
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_current_shift"("p_time" time without time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_shift"("p_time" time without time zone) IS 'Returns the current shift type based on time';



CREATE OR REPLACE FUNCTION "public"."get_dispensable_batches"("p_drug_id" "uuid", "p_quantity" integer) RETURNS TABLE("batch_id" "uuid", "batch_number" character varying, "quantity_available" integer, "quantity_to_take" integer, "expiry_date" "date", "days_to_expiry" integer, "cost_price" numeric, "selling_price" numeric)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN QUERY
    WITH ranked_batches AS (
        SELECT 
            db.batch_id,
            db.batch_number,
            db.quantity_remaining AS quantity_available,
            db.expiry_date,
            (db.expiry_date - CURRENT_DATE)::INTEGER AS days_to_expiry,
            db.cost_price,
            db.selling_price,
            ROW_NUMBER() OVER (ORDER BY db.expiry_date ASC, db.received_date ASC) AS rn
        FROM drug_batches db
        WHERE db.drug_id = p_drug_id
          AND db.quantity_remaining > 0
          AND db.expiry_date > CURRENT_DATE  -- Not expired
          AND db.status = 'active'
    ),
    cumulative AS (
        SELECT 
            rb.*,
            SUM(rb.quantity_available) OVER (ORDER BY rb.rn) AS running_total
        FROM ranked_batches rb
    )
    SELECT 
        c.batch_id,
        c.batch_number,
        c.quantity_available,
        LEAST(
            c.quantity_available, 
            GREATEST(0, p_quantity - COALESCE(
                (SELECT SUM(c2.quantity_available) FROM cumulative c2 WHERE c2.rn < c.rn), 
                0
            ))
        )::INTEGER AS quantity_to_take,
        c.expiry_date,
        c.days_to_expiry,
        c.cost_price,
        c.selling_price
    FROM cumulative c
    WHERE c.running_total - c.quantity_available < p_quantity
    ORDER BY c.expiry_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_dispensable_batches"("p_drug_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dispensable_batches"("p_drug_id" "uuid", "p_quantity" integer) IS 'Returns batches in FEFO order for dispensing a given quantity';



CREATE OR REPLACE FUNCTION "public"."get_drug_available_stock"("p_drug_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_total INTEGER;
BEGIN
    SELECT COALESCE(SUM(quantity_remaining), 0)
    INTO v_total
    FROM drug_batches
    WHERE drug_id = p_drug_id
      AND status = 'active'
      AND expiry_date > CURRENT_DATE;
    
    RETURN v_total;
END;
$$;


ALTER FUNCTION "public"."get_drug_available_stock"("p_drug_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_drug_available_stock"("p_drug_id" "uuid") IS 'Returns total available (non-expired, active) stock for a drug';



CREATE OR REPLACE FUNCTION "public"."get_encounter_access_summary"("p_encounter_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_build_object(
        'encounter_id', p_encounter_id,
        'primary_doctor', (
            SELECT json_build_object(
                'id', v.attending_doctor_id,
                'name', s.first_name || ' ' || s.last_name,
                'department', s.department
            )
            FROM visits v
            JOIN staff s ON s.id = v.attending_doctor_id
            WHERE v.id = p_encounter_id
        ),
        'care_team', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'staff_id', ect.staff_id,
                    'staff_name', ect.staff_name,
                    'role', ect.role,
                    'department', ect.department,
                    'assigned_at', ect.assigned_at,
                    'expires_at', ect.expires_at,
                    'is_active', ect.is_active
                )
                ORDER BY ect.assigned_at DESC
            ), '[]'::json)
            FROM encounter_care_team ect
            WHERE ect.encounter_id = p_encounter_id
        ),
        'recent_access', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'user_id', eal.user_id,
                    'user_name', s.first_name || ' ' || s.last_name,
                    'action', eal.action,
                    'timestamp', eal.timestamp,
                    'was_authorized', eal.was_authorized
                )
                ORDER BY eal.timestamp DESC
            ), '[]'::json)
            FROM encounter_access_logs eal
            JOIN staff s ON s.id = eal.user_id
            WHERE eal.encounter_id = p_encounter_id
            LIMIT 20
        ),
        'transfer_history', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'from_doctor', sf.first_name || ' ' || sf.last_name,
                    'to_doctor', st.first_name || ' ' || st.last_name,
                    'type', et.transfer_type,
                    'status', et.status,
                    'transferred_at', et.transferred_at
                )
                ORDER BY et.transferred_at DESC
            ), '[]'::json)
            FROM encounter_transfers et
            JOIN staff sf ON sf.id = et.from_doctor_id
            JOIN staff st ON st.id = et.to_doctor_id
            WHERE et.encounter_id = p_encounter_id
        )
    ) INTO v_summary;
    
    RETURN v_summary;
END;
$$;


ALTER FUNCTION "public"."get_encounter_access_summary"("p_encounter_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_encounter_access_summary"("p_encounter_id" "uuid") IS 'Returns complete access summary for an encounter as JSON';



CREATE OR REPLACE FUNCTION "public"."get_encounter_complaints"("p_encounter_id" "uuid") RETURNS TABLE("id" "uuid", "complaint_id" "uuid", "complaint_name" character varying, "complaint_code" character varying, "category" "public"."complaint_category", "is_primary" boolean, "duration_value" integer, "duration_unit" "public"."duration_unit", "notes" "text")
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."get_encounter_complaints"("p_encounter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_on_call_compliance_report"("p_department" character varying DEFAULT NULL::character varying, "p_days_back" integer DEFAULT 30) RETURNS TABLE("department" character varying, "total_hours_scheduled" numeric, "gaps_count" integer, "overlaps_count" integer, "coverage_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH schedule_stats AS (
        SELECT 
            ocs.department,
            SUM(EXTRACT(EPOCH FROM (ocs.end_time - ocs.start_time)) / 3600) as hours_scheduled,
            COUNT(*) FILTER (WHERE ocs.is_active) as active_schedules
        FROM on_call_schedule ocs
        WHERE ocs.start_time >= NOW() - (p_days_back || ' days')::INTERVAL
          AND (p_department IS NULL OR ocs.department = p_department)
        GROUP BY ocs.department
    )
    SELECT 
        ss.department,
        ROUND(ss.hours_scheduled, 2) as total_hours_scheduled,
        0 as gaps_count, -- Placeholder for gap detection
        0 as overlaps_count, -- Already prevented by constraint
        ROUND((ss.hours_scheduled / (p_days_back * 24.0)) * 100, 2) as coverage_percentage
    FROM schedule_stats ss
    ORDER BY ss.department;
END;
$$;


ALTER FUNCTION "public"."get_on_call_compliance_report"("p_department" character varying, "p_days_back" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_on_call_compliance_report"("p_department" character varying, "p_days_back" integer) IS 'Generates on-call coverage compliance report';



CREATE OR REPLACE FUNCTION "public"."get_overdue_vitals"() RETURNS TABLE("schedule_id" "uuid", "patient_id" character varying, "patient_name" "text", "encounter_id" "uuid", "ward_name" character varying, "bed_number" character varying, "acuity_level" "public"."patient_acuity", "acuity_display_name" character varying, "acuity_color" character varying, "last_vitals_at" timestamp with time zone, "next_vitals_due" timestamp with time zone, "minutes_overdue" integer, "assigned_nurse_id" "uuid", "assigned_nurse_name" "text", "alert_priority" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pvs.id,
        pvs.patient_id,
        CONCAT(p.first_name, ' ', p.surname)::TEXT,
        pvs.encounter_id,
        w.name,
        b.bed_number,
        pvs.acuity_level,
        vsc.display_name,
        vsc.color,
        pvs.last_vitals_at,
        pvs.next_vitals_due,
        EXTRACT(EPOCH FROM (NOW() - pvs.next_vitals_due))::INTEGER / 60,
        pvs.assigned_nurse_id,
        CONCAT(s.first_name, ' ', s.last_name)::TEXT,
        vsc.alert_priority
    FROM patient_vital_schedules pvs
    JOIN patients p ON p.patient_id = pvs.patient_id
    JOIN visits v ON v.id = pvs.encounter_id
    JOIN vital_schedule_configs vsc ON vsc.acuity_level = pvs.acuity_level
    LEFT JOIN admissions a ON a.encounter_id = v.id
    LEFT JOIN beds b ON b.id = a.current_bed_id
    LEFT JOIN wards w ON w.id = b.ward_id
    LEFT JOIN staff s ON s.id = pvs.assigned_nurse_id
    WHERE pvs.is_active = TRUE
    AND pvs.paused = FALSE
    AND pvs.is_overdue = TRUE
    ORDER BY 
        CASE pvs.acuity_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
            WHEN 'routine' THEN 5 
        END,
        pvs.next_vitals_due ASC;
END;
$$;


ALTER FUNCTION "public"."get_overdue_vitals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pharmacy_inventory_stats"() RETURNS json
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_drugs', (SELECT COUNT(*) FROM drug_catalogue WHERE is_active = true),
        'total_batches', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' AND quantity_remaining > 0 AND expiry_date > CURRENT_DATE
        ),
        'low_stock_count', (
            SELECT COUNT(DISTINCT drug_id) 
            FROM v_drug_inventory_summary 
            WHERE stock_status = 'low_stock'
        ),
        'out_of_stock_count', (
            -- Only count drugs that should be tracked (not 'not_stocked')
            SELECT COUNT(DISTINCT drug_id) 
            FROM v_drug_inventory_summary 
            WHERE stock_status = 'out_of_stock'
        ),
        'expiring_30_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE 
              AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        ),
        'expiring_60_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE + INTERVAL '30 days'
              AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        ),
        'expiring_90_days', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE status = 'active' 
              AND quantity_remaining > 0 
              AND expiry_date > CURRENT_DATE + INTERVAL '60 days'
              AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'
        ),
        'expired_batches', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE quantity_remaining > 0 
              AND expiry_date <= CURRENT_DATE
        ),
        'total_stock_value_cost', (
            SELECT COALESCE(SUM(quantity_remaining * cost_price), 0) 
            FROM drug_batches 
            WHERE status = 'active' AND expiry_date > CURRENT_DATE
        ),
        'total_stock_value_selling', (
            SELECT COALESCE(SUM(db.quantity_remaining * dc.price), 0) 
            FROM drug_batches db
            JOIN drug_catalogue dc ON dc.id = db.drug_id
            WHERE db.status = 'active' AND db.expiry_date > CURRENT_DATE
        ),
        'dispensed_today_count', (
            SELECT COUNT(*) FROM dispense_records 
            WHERE DATE(dispensed_at) = CURRENT_DATE
        ),
        'received_today_count', (
            SELECT COUNT(*) FROM drug_batches 
            WHERE DATE(received_date) = CURRENT_DATE
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_pharmacy_inventory_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shift_date"("p_timestamp" timestamp with time zone DEFAULT "now"()) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_time TIME;
    v_date DATE;
BEGIN
    v_time := p_timestamp::TIME;
    v_date := p_timestamp::DATE;
    
    -- For night shift after midnight (00:00-07:00), 
    -- the shift date is the previous day
    IF v_time >= '00:00'::TIME AND v_time < '07:00'::TIME THEN
        RETURN v_date - INTERVAL '1 day';
    ELSE
        RETURN v_date;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_shift_date"("p_timestamp" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_shift_date"("p_timestamp" timestamp with time zone) IS 'Returns the shift date, handling overnight shifts';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid", "p_user_role" character varying DEFAULT NULL::character varying, "p_user_department" character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE is_dismissed = FALSE
    AND is_read = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (
        target_user_id = p_user_id
        OR (target_user_id IS NULL AND target_role = p_user_role)
        OR (target_user_id IS NULL AND target_role IS NULL AND target_department = p_user_department)
        OR (target_user_id IS NULL AND target_role IS NULL AND target_department IS NULL)
    );
    
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.user_role', true),
        (SELECT role::TEXT FROM staff WHERE user_id = auth.uid() LIMIT 1),
        'anonymous'
    );
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_encounter_writable"("encounter_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  enc_status TEXT;
BEGIN
  IF encounter_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT status INTO enc_status
  FROM visits
  WHERE id = encounter_uuid;
  
  RETURN enc_status = 'Active';
END;
$$;


ALTER FUNCTION "public"."is_encounter_writable"("encounter_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_encounter_writable"("encounter_uuid" "uuid") IS 'Check if encounter status allows write operations (Active only)';



CREATE OR REPLACE FUNCTION "public"."is_nurse"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role
  FROM staff
  WHERE staff.user_id = $1 OR staff.id = $1;
  
  RETURN user_role = 'nurse';
END;
$_$;


ALTER FUNCTION "public"."is_nurse"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_care_team_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO encounter_access_logs (
            encounter_id, 
            user_id, 
            user_role, 
            action, 
            action_details, 
            was_authorized
        )
        VALUES (
            NEW.encounter_id, 
            COALESCE(NEW.assigned_by, NEW.staff_id), 
            'doctor', 
            'add_to_care_team', 
            'Added ' || NEW.staff_name || ' as ' || NEW.role, 
            true
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
        INSERT INTO encounter_access_logs (
            encounter_id, 
            user_id, 
            user_role, 
            action, 
            action_details, 
            was_authorized
        )
        VALUES (
            NEW.encounter_id, 
            NEW.staff_id, 
            'doctor', 
            'remove_from_care_team', 
            'Removed ' || NEW.staff_name || ' from care team', 
            true
        );
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_care_team_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_nursing_action"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user info
  SELECT id, role::TEXT INTO current_user_id, current_user_role
  FROM staff
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO nursing_audit_log (
    encounter_id,
    patient_id,
    user_id,
    user_role,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.encounter_id, OLD.encounter_id),
    COALESCE(NEW.patient_id, OLD.patient_id),
    current_user_id,
    current_user_role,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_nursing_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_ownership_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.attending_doctor_id IS DISTINCT FROM NEW.attending_doctor_id THEN
        INSERT INTO encounter_access_logs (
            encounter_id, 
            user_id, 
            user_role, 
            action, 
            action_details, 
            was_authorized
        )
        VALUES (
            NEW.id, 
            COALESCE(NEW.attending_doctor_id, OLD.attending_doctor_id), 
            'doctor', 
            'transfer_ownership',
            'Ownership changed from ' || COALESCE(OLD.attending_doctor_id::text, 'none') || 
            ' to ' || COALESCE(NEW.attending_doctor_id::text, 'none'), 
            true
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_ownership_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_unauthorized_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_user_role VARCHAR(50);
BEGIN
    -- Get current user
    SELECT id, role INTO v_user_id, v_user_role
    FROM staff
    WHERE user_id = auth.uid();
    
    -- Log failed access attempt
    IF v_user_id IS NOT NULL THEN
        INSERT INTO encounter_access_logs (
            encounter_id,
            user_id,
            user_role,
            action,
            action_details,
            was_authorized
        ) VALUES (
            NEW.id,
            v_user_id,
            v_user_role,
            'unauthorized_access_attempt',
            'Attempted to access encounter without authorization',
            false
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently fail to not block legitimate operations
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_unauthorized_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id
    AND (target_user_id = p_user_id OR target_user_id IS NULL);
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_critical_result"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_patient_name TEXT;
    v_test_name TEXT;
BEGIN
    -- Only notify if result is marked as critical
    IF NEW.is_critical = TRUE AND (OLD IS NULL OR OLD.is_critical = FALSE) THEN
        -- Get patient name
        SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
        FROM patients WHERE patient_id = NEW.patient_id;
        
        -- Get test name
        SELECT name INTO v_test_name
        FROM lab_test_catalogue WHERE id = NEW.test_id;
        
        -- Create urgent notification for ordering doctor
        PERFORM create_notification(
            'result_critical'::notification_type,
            '🚨 CRITICAL Lab Result',
            'CRITICAL: ' || COALESCE(v_test_name, 'Lab test') || ' result for ' || COALESCE(v_patient_name, 'Patient') || ' requires immediate attention',
            'critical'::notification_priority,
            NULL,  -- Will need to resolve ordered_by to UUID
            'doctor',  -- Fallback to all doctors
            NULL,
            NEW.encounter_id,
            NEW.patient_id,
            'lab_request',
            NEW.request_id,
            '/lab?request=' || NEW.request_id,
            'View Result',
            NEW.result_entered_by,
            NULL,
            jsonb_build_object('test_name', v_test_name, 'is_critical', true)
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_critical_result"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_overdue_vitals"("p_schedule_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_schedule patient_vital_schedules%ROWTYPE;
    v_config vital_schedule_configs%ROWTYPE;
    v_patient_name TEXT;
    v_minutes_overdue INTEGER;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM patient_vital_schedules
    WHERE id = p_schedule_id AND is_active = TRUE AND is_overdue = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if alert already sent
    IF v_schedule.alert_sent = TRUE THEN
        RETURN FALSE;
    END IF;
    
    -- Get config
    SELECT * INTO v_config
    FROM vital_schedule_configs
    WHERE acuity_level = v_schedule.acuity_level;
    
    -- Get patient name
    SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
    FROM patients WHERE patient_id = v_schedule.patient_id;
    
    -- Calculate minutes overdue
    v_minutes_overdue := EXTRACT(EPOCH FROM (NOW() - v_schedule.next_vitals_due))::INTEGER / 60;
    
    -- Create notification
    PERFORM create_notification(
        'vitals_overdue'::notification_type,
        '⚠️ Vitals Overdue - ' || v_config.display_name,
        'Vital signs for ' || COALESCE(v_patient_name, 'Patient') || ' are ' || v_minutes_overdue || ' minutes overdue (' || v_config.display_name || ' patient)',
        v_config.alert_priority,
        v_schedule.assigned_nurse_id,  -- Target assigned nurse
        'nurse',  -- Also target all nurses
        NULL,
        v_schedule.encounter_id,
        v_schedule.patient_id,
        'vital_schedule',
        v_schedule.id,
        '/nursing?patient=' || v_schedule.patient_id || '&tab=vitals',
        'Record Vitals',
        NULL,
        NOW() + INTERVAL '1 hour',  -- Expires after 1 hour
        jsonb_build_object(
            'acuity_level', v_schedule.acuity_level,
            'minutes_overdue', v_minutes_overdue,
            'patient_name', v_patient_name
        )
    );
    
    -- Mark alert as sent
    UPDATE patient_vital_schedules
    SET alert_sent = TRUE, alert_sent_at = NOW()
    WHERE id = p_schedule_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."notify_overdue_vitals"("p_schedule_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_shift_handover"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_patient_name TEXT;
    v_nurse_name TEXT;
BEGIN
    -- Get patient name using UUID
    SELECT CONCAT(first_name, ' ', surname) INTO v_patient_name
    FROM patients WHERE id = NEW.patient_id;
    
    -- Get outgoing nurse name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_nurse_name
    FROM staff WHERE id = NEW.outgoing_nurse_id;
    
    -- Create notification for incoming shift nurses
    -- Note: create_notification may not exist yet, wrap in exception handler
    BEGIN
        PERFORM create_notification(
            'shift_handover',
            'Shift Handover Available',
            'Nurse ' || COALESCE(v_nurse_name, 'Unknown') || ' has prepared handover notes for ' || COALESCE(v_patient_name, 'Patient'),
            'high',
            NULL,
            'nurse',
            NULL,
            NEW.encounter_id,
            NEW.patient_id::TEXT,
            'shift_handover',
            NEW.handover_id,
            '/nursing?encounter=' || NEW.encounter_id || '&tab=handover',
            'View Handover',
            NEW.outgoing_nurse_id,
            COALESCE(NEW.handover_date, CURRENT_DATE) + INTERVAL '8 hours',
            jsonb_build_object(
                'outgoing_shift', NEW.outgoing_shift,
                'incoming_shift', NEW.incoming_shift,
                'patient_name', v_patient_name
            )
        );
    EXCEPTION
        WHEN undefined_function THEN
            NULL;
        WHEN others THEN
            -- Ignore any other errors from notification
            NULL;
    END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_shift_handover"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_treatment_plan_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_patient_name TEXT;
    v_patient_external_id VARCHAR(50);
    v_creator_name TEXT;
BEGIN
    -- Get patient name and external patient_id (VARCHAR)
    SELECT CONCAT(first_name, ' ', surname), patient_id 
    INTO v_patient_name, v_patient_external_id
    FROM patients WHERE id = NEW.patient_id;
    
    SELECT CONCAT(first_name, ' ', last_name) INTO v_creator_name
    FROM staff WHERE id = NEW.created_by;
    
    PERFORM create_notification(
        'treatment_plan_created',
        'New Treatment Plan',
        'Dr. ' || COALESCE(v_creator_name, 'Unknown') || ' created a treatment plan for ' || COALESCE(v_patient_name, 'Patient'),
        'high',
        NULL,
        'nurse',
        NULL,
        NEW.encounter_id,
        v_patient_external_id,  -- Use VARCHAR patient_id for FK
        'treatment_plan',
        NEW.id,
        '/medical-records?patient=' || COALESCE(v_patient_external_id, NEW.patient_id::TEXT) || '&tab=treatment-plan',
        'View Plan',
        NEW.created_by,
        NULL,
        jsonb_build_object('plan_title', NEW.title, 'plan_id', NEW.id)
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_treatment_plan_created"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_treatment_plan_created"() IS 'Fixed: uses patients.id (UUID) instead of patients.patient_id (VARCHAR)';



CREATE OR REPLACE FUNCTION "public"."nurse_has_encounter_access"("encounter_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  enc_exists BOOLEAN;
  in_care_team BOOLEAN;
  same_facility BOOLEAN;
BEGIN
  -- Check encounter exists
  SELECT EXISTS(SELECT 1 FROM visits WHERE id = encounter_uuid) INTO enc_exists;
  IF NOT enc_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check if nurse is in care team for this encounter
  SELECT EXISTS(
    SELECT 1 FROM encounter_care_team
    WHERE encounter_id = encounter_uuid
    AND staff_id = user_uuid
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO in_care_team;
  
  IF in_care_team THEN
    RETURN TRUE;
  END IF;
  
  -- Check if nurse is in same facility as the encounter
  SELECT EXISTS(
    SELECT 1 FROM visits v
    JOIN patients p ON v.patient_id = p.id
    JOIN staff s ON s.facility_id = p.facility_id
    WHERE v.id = encounter_uuid
    AND s.id = user_uuid
  ) INTO same_facility;
  
  -- For now, allow same-facility access (can be tightened later)
  RETURN same_facility;
END;
$$;


ALTER FUNCTION "public"."nurse_has_encounter_access"("encounter_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."nurse_has_encounter_access"("encounter_uuid" "uuid", "user_uuid" "uuid") IS 'Verify nurse has access to specific encounter';



CREATE OR REPLACE FUNCTION "public"."prevent_access_log_modification"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are not allowed.';
END;
$$;


ALTER FUNCTION "public"."prevent_access_log_modification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_on_call_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_overlap_count INTEGER;
BEGIN
    -- Check for overlapping active schedules for same staff
    SELECT COUNT(*) INTO v_overlap_count
    FROM on_call_schedule
    WHERE staff_id = NEW.staff_id
      AND is_active = true
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND tstzrange(start_time, end_time) && tstzrange(NEW.start_time, NEW.end_time);
    
    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Staff member already has an overlapping on-call schedule';
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_on_call_overlap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."route_to_specialty_queue"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_dept_code VARCHAR(50);
    v_queue_location VARCHAR(50);
BEGIN
    -- Only process when status changes to Approved and it's a Referral
    IF NEW.status = 'Approved' AND NEW.request_type = 'Referral' AND OLD.status != 'Approved' THEN
        -- Get target department code
        SELECT code INTO v_dept_code 
        FROM departments 
        WHERE id = NEW.target_department_id;
        
        -- Map department to queue location
        CASE v_dept_code
            WHEN 'DEPT013' THEN v_queue_location := 'Dental';
            WHEN 'DEPT014' THEN v_queue_location := 'Ophthalmology';
            WHEN 'DEPT015' THEN v_queue_location := 'Physiotherapy';
            ELSE v_queue_location := NULL;
        END CASE;
        
        -- If it's a specialty referral, update the queue
        IF v_queue_location IS NOT NULL THEN
            -- Update the queue entry for this encounter
            UPDATE queue SET 
                location = v_queue_location::queue_location,
                status = 'Waiting',
                updated_at = NOW()
            WHERE visit_id = NEW.encounter_id
            AND status NOT IN ('Completed', 'Cancelled', 'No_Show');
            
            -- Also update specialty_module column
            NEW.specialty_module := LOWER(v_queue_location);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."route_to_specialty_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."route_visit_to_specialty"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_doctor_dept_code VARCHAR(50);
    v_queue_location VARCHAR(50);
BEGIN
    -- Get the attending doctor's department
    IF NEW.attending_doctor_id IS NOT NULL THEN
        SELECT d.code INTO v_doctor_dept_code
        FROM staff s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = NEW.attending_doctor_id;
        
        -- Map department to queue location
        CASE v_doctor_dept_code
            WHEN 'DEPT013' THEN v_queue_location := 'Dental';
            WHEN 'DEPT014' THEN v_queue_location := 'Ophthalmology';
            WHEN 'DEPT015' THEN v_queue_location := 'Physiotherapy';
            ELSE v_queue_location := NULL;
        END CASE;
        
        -- If specialty doctor, update the queue immediately
        IF v_queue_location IS NOT NULL THEN
            -- Update queue for this visit
            UPDATE queue SET 
                location = v_queue_location::queue_location,
                status = 'Waiting',
                updated_at = NOW()
            WHERE visit_id = NEW.id
            AND status NOT IN ('Completed', 'Cancelled', 'No_Show');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."route_visit_to_specialty"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_clinical_request_sla"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    sla_hours_val INTEGER;
BEGIN
    -- Set SLA based on urgency
    CASE NEW.urgency
        WHEN 'Emergency' THEN sla_hours_val := 1;
        WHEN 'Urgent' THEN sla_hours_val := 4;
        ELSE sla_hours_val := 24;
    END CASE;
    
    NEW.sla_hours := sla_hours_val;
    NEW.sla_deadline := NEW.created_at + (sla_hours_val || ' hours')::INTERVAL;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_clinical_request_sla"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_drug_stock_quantity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the drug_catalogue stock_quantity to match sum of active batches
    UPDATE drug_catalogue
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity_remaining), 0)
        FROM drug_batches
        WHERE drug_id = COALESCE(NEW.drug_id, OLD.drug_id)
          AND status = 'active'
          AND expiry_date > CURRENT_DATE
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.drug_id, OLD.drug_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_drug_stock_quantity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_shift_handover_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If shift_date is null but handover_date is set, copy it
  IF NEW.shift_date IS NULL AND NEW.handover_date IS NOT NULL THEN
    NEW.shift_date := NEW.handover_date;
  END IF;
  -- If handover_date is null but shift_date is set, copy it
  IF NEW.handover_date IS NULL AND NEW.shift_date IS NOT NULL THEN
    NEW.handover_date := NEW.shift_date;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_shift_handover_dates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_clinical_request_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO clinical_request_status_history (
            request_id,
            from_status,
            to_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.reviewed_by,
            NEW.review_notes
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_clinical_request_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_subtotal numeric(12,2);
    v_nhis_payable numeric(12,2);
    v_patient_payable numeric(12,2);
    v_item_count integer;
    v_verified_count integer;
    v_rejected_count integer;
BEGIN
    -- Calculate totals from verified/adjusted items only
    SELECT 
        COALESCE(SUM(CASE WHEN verification_status IN ('verified', 'adjusted') THEN total_price ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN verification_status IN ('verified', 'adjusted') THEN nhis_payable ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN verification_status IN ('verified', 'adjusted') THEN patient_payable ELSE 0 END), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE verification_status IN ('verified', 'adjusted')),
        COUNT(*) FILTER (WHERE verification_status = 'rejected')
    INTO v_subtotal, v_nhis_payable, v_patient_payable, v_item_count, v_verified_count, v_rejected_count
    FROM "public"."category_invoice_items"
    WHERE category_invoice_id = COALESCE(NEW.category_invoice_id, OLD.category_invoice_id);
    
    -- Update the category invoice
    UPDATE "public"."category_invoices"
    SET 
        subtotal = v_subtotal,
        nhis_payable = v_nhis_payable,
        patient_payable = v_patient_payable,
        total_amount = v_subtotal - discount_amount + tax_amount,
        balance = v_subtotal - discount_amount + tax_amount - amount_paid,
        item_count = v_item_count,
        verified_item_count = v_verified_count,
        rejected_item_count = v_rejected_count,
        verification_complete = (v_verified_count + v_rejected_count = v_item_count AND v_item_count > 0),
        all_items_verified = (v_verified_count = v_item_count AND v_item_count > 0),
        updated_at = now()
    WHERE id = COALESCE(NEW.category_invoice_id, OLD.category_invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_category_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_doctor_orders_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_doctor_orders_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_nursing_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_nursing_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_patient_status_on_admission"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- When admission is created, update patient status to In-Patient
    IF TG_OP = 'INSERT' THEN
        UPDATE patients 
        SET current_status = 'In-Patient',
            updated_at = NOW()
        WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_patient_status_on_admission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_patient_status_on_discharge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- When admission status changes to Discharged, update patient
    IF NEW.admission_status = 'Discharged' AND (OLD.admission_status IS NULL OR OLD.admission_status != 'Discharged') THEN
        UPDATE patients 
        SET current_status = 'Discharged',
            updated_at = NOW()
        WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_patient_status_on_discharge"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_progress_notes_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_progress_notes_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_vital_schedule_on_record"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_schedule_id UUID;
    v_was_overdue BOOLEAN;
    v_overdue_minutes INTEGER;
    v_patient_varchar VARCHAR(50);
BEGIN
    -- vitals.patient_id is UUID, patient_vital_schedules.patient_id is VARCHAR
    SELECT patient_id INTO v_patient_varchar
    FROM patients WHERE id = NEW.patient_id;
    
    IF v_patient_varchar IS NULL THEN
        RETURN NEW;
    END IF;
    
    SELECT id, is_overdue, 
           CASE WHEN is_overdue AND overdue_since IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NOW() - overdue_since)) / 60 
                ELSE 0 END
    INTO v_schedule_id, v_was_overdue, v_overdue_minutes
    FROM patient_vital_schedules
    WHERE patient_id = v_patient_varchar
    AND encounter_id = NEW.encounter_id
    AND is_active = TRUE
    LIMIT 1;
    
    IF v_schedule_id IS NOT NULL THEN
        NEW.schedule_id := v_schedule_id;
        NEW.was_overdue := v_was_overdue;
        NEW.minutes_overdue := v_overdue_minutes::INTEGER;
        
        UPDATE patient_vital_schedules
        SET 
            last_vitals_at = NEW.date_recorded,
            next_vitals_due = calculate_next_vitals_due(v_schedule_id, NEW.date_recorded),
            is_overdue = FALSE,
            overdue_since = NULL,
            alert_sent = FALSE,
            alert_sent_at = NULL,
            updated_at = NOW()
        WHERE id = v_schedule_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Vital schedule update failed: %', SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_vital_schedule_on_record"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ward_bed_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_ward_bed_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_billing_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure all mandatory audit fields are present
    IF NEW.service_name IS NULL OR NEW.service_name = '' THEN
        RAISE EXCEPTION 'service_name is required for billing items';
    END IF;
    
    IF NEW.unit_cost IS NULL THEN
        RAISE EXCEPTION 'unit_cost is required for billing items';
    END IF;
    
    IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
        RAISE EXCEPTION 'quantity must be at least 1 for billing items';
    END IF;
    
    IF NEW.gross_amount IS NULL THEN
        -- Auto-calculate if not provided
        NEW.gross_amount := NEW.quantity * NEW.unit_cost;
    END IF;
    
    -- Ensure NHIS fields are set (defaults to 0/false if not provided)
    IF NEW.nhis_covered IS NULL THEN
        NEW.nhis_covered := FALSE;
    END IF;
    
    IF NEW.nhis_percentage IS NULL THEN
        NEW.nhis_percentage := 0;
    END IF;
    
    IF NEW.nhis_payable IS NULL THEN
        NEW.nhis_payable := 0;
    END IF;
    
    IF NEW.patient_payable IS NULL THEN
        -- Default to gross_amount if not set (patient pays all)
        NEW.patient_payable := COALESCE(NEW.gross_amount, NEW.quantity * NEW.unit_cost);
    END IF;
    
    -- Sync legacy fields for backward compatibility
    IF NEW.item_name IS NULL THEN
        NEW.item_name := NEW.service_name;
    END IF;
    
    IF NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.unit_cost;
    END IF;
    
    IF NEW.total_price IS NULL THEN
        NEW.total_price := NEW.gross_amount;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_billing_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_encounter_active"("p_encounter_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status::TEXT INTO v_status
    FROM visits
    WHERE id = p_encounter_id;
    
    IF v_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF v_status IN ('Completed', 'Closed', 'Cancelled') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_encounter_active"("p_encounter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_encounter_action"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_action" character varying) RETURNS TABLE("can_perform" boolean, "reason" "text", "encounter_role" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_access_info RECORD;
    v_role_actions TEXT[];
BEGIN
    -- Get user's access role for this encounter
    SELECT * INTO v_access_info
    FROM check_encounter_access(
        p_encounter_id,
        p_user_id,
        (SELECT role FROM staff WHERE id = p_user_id),
        (SELECT department FROM staff WHERE id = p_user_id)
    );
    
    IF NOT v_access_info.has_access THEN
        RETURN QUERY SELECT false, 'No access to this encounter', 'no_access'::VARCHAR;
        RETURN;
    END IF;
    
    -- Define action permissions per role
    v_role_actions := CASE v_access_info.access_role
        WHEN 'primary_doctor' THEN ARRAY['view','edit','prescribe','order_lab','order_radiology','order_procedure','close','transfer','add_team']
        WHEN 'co_managing_doctor' THEN ARRAY['view','edit','prescribe','order_lab','order_radiology','order_procedure','add_team']
        WHEN 'consulting_doctor' THEN ARRAY['view','edit','prescribe','order_lab','order_radiology']
        WHEN 'on_call_doctor' THEN ARRAY['view','edit','prescribe','order_lab','order_radiology','order_procedure']
        WHEN 'department_doctor' THEN ARRAY['view']
        WHEN 'nurse' THEN ARRAY['view','add_vitals','add_nursing_notes']
        WHEN 'lab_technician' THEN ARRAY['view','process_lab']
        WHEN 'radiologist' THEN ARRAY['view','process_radiology']
        WHEN 'pharmacist' THEN ARRAY['view','dispense']
        ELSE ARRAY[]::TEXT[]
    END;
    
    IF p_action = ANY(v_role_actions) THEN
        RETURN QUERY SELECT true, 'Action authorized for role: ' || v_access_info.access_role, v_access_info.access_role;
    ELSE
        RETURN QUERY SELECT false, 'Action not permitted for role: ' || v_access_info.access_role, v_access_info.access_role;
    END IF;
END;
$$;


ALTER FUNCTION "public"."verify_encounter_action"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_action" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_encounter_action"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_action" character varying) IS 'Verifies if a user can perform a specific action on an encounter';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    "admission_number" character varying(50) NOT NULL,
    "admission_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expected_discharge_date" "date",
    "actual_discharge_date" timestamp with time zone,
    "admission_type" character varying(50) NOT NULL,
    "admission_source" character varying(50),
    "current_ward_id" "uuid",
    "current_bed_id" "uuid",
    "admitting_diagnosis" "text" NOT NULL,
    "admitting_diagnosis_icd10" character varying(20),
    "secondary_diagnoses" "jsonb" DEFAULT '[]'::"jsonb",
    "chief_complaint" "text",
    "reason_for_admission" "text",
    "admitting_doctor_id" "uuid",
    "attending_physician_id" "uuid",
    "primary_nurse_id" "uuid",
    "care_team" "jsonb" DEFAULT '[]'::"jsonb",
    "admission_status" character varying(30) DEFAULT 'admitted'::character varying NOT NULL,
    "acuity_level" character varying(20),
    "code_status" character varying(30) DEFAULT 'full_code'::character varying,
    "isolation_required" boolean DEFAULT false,
    "isolation_type" character varying(50),
    "fall_risk_level" character varying(20),
    "pressure_ulcer_risk" character varying(20),
    "allergies_snapshot" "jsonb" DEFAULT '[]'::"jsonb",
    "alerts" "jsonb" DEFAULT '[]'::"jsonb",
    "diet_type" character varying(50),
    "diet_restrictions" "text",
    "activity_level" character varying(50),
    "mobility_status" character varying(50),
    "discharge_type" character varying(50),
    "discharge_disposition" "text",
    "discharge_diagnosis" "text",
    "discharge_diagnosis_icd10" character varying(20),
    "discharge_summary" "text",
    "discharge_instructions" "text",
    "follow_up_appointments" "jsonb" DEFAULT '[]'::"jsonb",
    "discharge_medications" "jsonb" DEFAULT '[]'::"jsonb",
    "discharged_by" "uuid",
    "insurance_verified" boolean DEFAULT false,
    "pre_authorization_number" character varying(100),
    "estimated_cost" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "clinical_request_id" "uuid",
    CONSTRAINT "admissions_acuity_level_check" CHECK ((("acuity_level")::"text" = ANY ((ARRAY['low'::character varying, 'moderate'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "admissions_admission_source_check" CHECK ((("admission_source")::"text" = ANY ((ARRAY['emergency'::character varying, 'outpatient'::character varying, 'referral'::character varying, 'transfer'::character varying, 'direct'::character varying])::"text"[]))),
    CONSTRAINT "admissions_admission_status_check" CHECK ((("admission_status")::"text" = ANY ((ARRAY['admitted'::character varying, 'under_observation'::character varying, 'critical'::character varying, 'stable'::character varying, 'improving'::character varying, 'discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying, 'absconded'::character varying])::"text"[]))),
    CONSTRAINT "admissions_admission_type_check" CHECK ((("admission_type")::"text" = ANY ((ARRAY['emergency'::character varying, 'elective'::character varying, 'transfer'::character varying, 'observation'::character varying, 'day_case'::character varying])::"text"[]))),
    CONSTRAINT "admissions_code_status_check" CHECK ((("code_status")::"text" = ANY ((ARRAY['full_code'::character varying, 'dnr'::character varying, 'dni'::character varying, 'dnr_dni'::character varying, 'comfort_care'::character varying])::"text"[]))),
    CONSTRAINT "admissions_discharge_type_check" CHECK ((("discharge_type")::"text" = ANY ((ARRAY['home'::character varying, 'transfer'::character varying, 'against_medical_advice'::character varying, 'deceased'::character varying, 'skilled_nursing'::character varying, 'rehabilitation'::character varying, 'hospice'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."admissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."admissions" IS 'Patient hospital admissions tracking';



COMMENT ON COLUMN "public"."admissions"."admission_status" IS 'Current status: admitted, under_observation, critical, stable, improving, discharged, transferred, deceased, absconded';



COMMENT ON COLUMN "public"."admissions"."code_status" IS 'Resuscitation preference: full_code, dnr, dni, dnr_dni, comfort_care';



CREATE TABLE IF NOT EXISTS "public"."beds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ward_id" "uuid" NOT NULL,
    "bed_number" character varying(20) NOT NULL,
    "bed_type" character varying(50) NOT NULL,
    "status" character varying(30) DEFAULT 'available'::character varying NOT NULL,
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "daily_rate" numeric(10,2),
    "current_patient_id" "uuid",
    "current_admission_id" "uuid",
    "location_details" "text",
    "is_active" boolean DEFAULT true,
    "last_cleaned_at" timestamp with time zone,
    "last_maintenance_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "beds_bed_type_check" CHECK ((("bed_type")::"text" = ANY ((ARRAY['standard'::character varying, 'electric'::character varying, 'icu'::character varying, 'pediatric'::character varying, 'bariatric'::character varying, 'low'::character varying, 'stretcher'::character varying, 'crib'::character varying, 'bassinet'::character varying])::"text"[]))),
    CONSTRAINT "beds_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['Available'::character varying, 'Occupied'::character varying, 'Cleaning'::character varying, 'Maintenance'::character varying, 'Reserved'::character varying])::"text"[])))
);


ALTER TABLE "public"."beds" OWNER TO "postgres";


COMMENT ON TABLE "public"."beds" IS 'Individual beds within hospital wards';



CREATE TABLE IF NOT EXISTS "public"."billing_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "billing_order_id" "uuid",
    "item_type" "public"."service_type",
    "item_id" "uuid",
    "item_name" character varying(255) NOT NULL,
    "quantity" integer DEFAULT 1,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "status" "public"."payment_status" DEFAULT 'Unpaid'::"public"."payment_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nhis_covered" boolean DEFAULT false,
    "nhis_percentage" integer DEFAULT 0,
    "nhis_payable" numeric(10,2) DEFAULT 0,
    "patient_payable" numeric(10,2) DEFAULT 0,
    "service_reference_id" "uuid",
    "service_name" character varying(255),
    "unit_cost" numeric(10,2),
    "gross_amount" numeric(10,2),
    "verification_status" "public"."item_verification_status" DEFAULT 'pending'::"public"."item_verification_status",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "rejection_reason" "text",
    "adjusted_price" numeric(10,2),
    "adjusted_by" "uuid",
    "adjusted_at" timestamp with time zone,
    "original_price" numeric(10,2),
    "stock_validated" boolean DEFAULT false,
    "stock_validated_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."billing_items" REPLICA IDENTITY FULL;


ALTER TABLE "public"."billing_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."billing_items"."nhis_covered" IS 'Whether this line item is covered by NHIS';



COMMENT ON COLUMN "public"."billing_items"."nhis_percentage" IS 'Percentage of this item covered by NHIS (0-100) - snapshot at billing time';



COMMENT ON COLUMN "public"."billing_items"."nhis_payable" IS 'Amount of this item payable by NHIS - snapshot at billing time';



COMMENT ON COLUMN "public"."billing_items"."patient_payable" IS 'Amount of this item payable by patient - snapshot at billing time';



COMMENT ON COLUMN "public"."billing_items"."service_reference_id" IS 'UUID reference to source record (lab_requests.id, imaging_requests.id, prescriptions.id, etc.) - immutable audit link';



COMMENT ON COLUMN "public"."billing_items"."service_name" IS 'Snapshot of service/item name at billing time - does not change if catalogue is updated';



COMMENT ON COLUMN "public"."billing_items"."unit_cost" IS 'Snapshot of unit cost at billing time - does not change if price list is updated';



COMMENT ON COLUMN "public"."billing_items"."gross_amount" IS 'Snapshot of gross amount (quantity * unit_cost) - stored, never recalculated';



COMMENT ON COLUMN "public"."billing_items"."verification_status" IS 'Status of item verification: pending, verified, adjusted, or rejected';



COMMENT ON COLUMN "public"."billing_items"."verified_by" IS 'Staff UUID who verified this item';



COMMENT ON COLUMN "public"."billing_items"."verified_at" IS 'Timestamp when item was verified';



COMMENT ON COLUMN "public"."billing_items"."rejection_reason" IS 'Reason for rejection if item was rejected';



COMMENT ON COLUMN "public"."billing_items"."adjusted_price" IS 'New price if item price was adjusted during verification';



COMMENT ON COLUMN "public"."billing_items"."adjusted_by" IS 'Staff UUID who adjusted the price';



COMMENT ON COLUMN "public"."billing_items"."adjusted_at" IS 'Timestamp when price was adjusted';



COMMENT ON COLUMN "public"."billing_items"."original_price" IS 'Original price before any adjustment - preserved for audit';



COMMENT ON COLUMN "public"."billing_items"."stock_validated" IS 'Whether stock availability was validated (for drugs)';



COMMENT ON COLUMN "public"."billing_items"."stock_validated_at" IS 'Timestamp when stock was validated';



CREATE TABLE IF NOT EXISTS "public"."billing_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "visit_id" "uuid",
    "patient_id" "uuid",
    "total_amount" numeric(10,2) DEFAULT 0,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "net_amount" numeric(10,2) DEFAULT 0,
    "paid_amount" numeric(10,2) DEFAULT 0,
    "balance_amount" numeric(10,2) DEFAULT 0,
    "status" "public"."billing_order_status" DEFAULT 'Pending'::"public"."billing_order_status",
    "payment_method" "public"."payment_method",
    "source_module" "public"."source_module",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid",
    "nhis_covered" boolean DEFAULT false,
    "nhis_percentage" integer DEFAULT 0,
    "nhis_payable" numeric(10,2) DEFAULT 0,
    "patient_payable" numeric(10,2) DEFAULT 0
);

ALTER TABLE ONLY "public"."billing_orders" REPLICA IDENTITY FULL;


ALTER TABLE "public"."billing_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."billing_orders"."nhis_covered" IS 'Whether this billing order is covered by NHIS';



COMMENT ON COLUMN "public"."billing_orders"."nhis_percentage" IS 'Percentage of the total bill covered by NHIS (0-100)';



COMMENT ON COLUMN "public"."billing_orders"."nhis_payable" IS 'Total amount payable by NHIS for this order';



COMMENT ON COLUMN "public"."billing_orders"."patient_payable" IS 'Total amount payable by the patient (after NHIS deduction)';



CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) DEFAULT "gen_random_uuid"() NOT NULL,
    "emr_number" character varying(50),
    "first_name" character varying(100) NOT NULL,
    "middle_name" character varying(100),
    "surname" character varying(100) NOT NULL,
    "gender" "public"."gender" NOT NULL,
    "date_of_birth" "date",
    "nationality" character varying(100),
    "state_of_origin" character varying(100),
    "lga" character varying(100),
    "contact_phone" character varying(50),
    "email" character varying(255),
    "residential_address" "text",
    "nok_name" character varying(100),
    "nok_relationship" character varying(100),
    "nok_phone" character varying(50),
    "nok_address" "text",
    "patient_category" "public"."patient_category",
    "insurance_type" "public"."insurance_type",
    "patient_type" "public"."patient_type",
    "principal_id" "uuid",
    "relationship_to_principal" character varying(50),
    "staff_category" "public"."staff_category",
    "military_branch" "public"."military_branch",
    "rank" character varying(100),
    "service_number" character varying(100),
    "unit" character varying(100),
    "occupation" character varying(100),
    "employer" character varying(100),
    "nhis_number" character varying(50),
    "national_id" character varying(50),
    "nhis_patient_source" "public"."nhis_patient_source",
    "referral_code" character varying(100),
    "referring_facility_name" character varying(255),
    "referring_facility_nhis_id" character varying(100),
    "referral_date" "date",
    "referral_reason" "text",
    "referral_status" "public"."referral_status_enum",
    "referral_expiry_date" "date",
    "clinical_summary" "text",
    "blood_group" character varying(10),
    "known_allergies" "text"[],
    "registered_by" "uuid",
    "registration_date" timestamp with time zone DEFAULT "now"(),
    "status" "public"."patient_status" DEFAULT 'Active'::"public"."patient_status",
    "photo_url" "text",
    "payer_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "arm_of_service" "text",
    "current_status" character varying(20) DEFAULT 'OPD'::character varying,
    "course" character varying(100) DEFAULT NULL::character varying,
    "title" character varying(50) DEFAULT NULL::character varying,
    CONSTRAINT "patients_current_status_check" CHECK ((("current_status")::"text" = ANY ((ARRAY['OPD'::character varying, 'In-Patient'::character varying, 'Discharged'::character varying, 'Deceased'::character varying])::"text"[])))
);

ALTER TABLE ONLY "public"."patients" REPLICA IDENTITY FULL;


ALTER TABLE "public"."patients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."patients"."emr_number" IS 'Unique EMR identifier (auto-generated). Simple 4-digit format: 0001, 0002, etc.';



COMMENT ON COLUMN "public"."patients"."course" IS 'Course name for Military/Civilian Participants (e.g., Course 34)';



COMMENT ON COLUMN "public"."patients"."title" IS 'Title/Rank for Civilian and Civilian Participant (e.g., Dr., Prof., Engr., Chief)';



CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" character varying(50),
    "email" character varying(255) NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "staff_category" "public"."staff_category",
    "military_branch" "public"."military_branch",
    "rank" character varying(100),
    "service_number" character varying(100),
    "department_id" "uuid",
    "phone" character varying(50),
    "is_active" boolean DEFAULT true,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "department" "text",
    "user_id" "uuid",
    "facility_id" "uuid",
    "last_activity" timestamp with time zone,
    "photo_url" "text"
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(20) NOT NULL,
    "ward_type" character varying(50) NOT NULL,
    "total_beds" integer DEFAULT 0 NOT NULL,
    "available_beds" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "floor_number" integer,
    "building" character varying(100),
    "nurse_station_phone" character varying(20),
    "head_nurse_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "gender_restriction" character varying(20),
    "price" numeric(10,2) DEFAULT 0,
    "nhis_price" numeric(10,2) DEFAULT 0,
    "is_nhis_covered" boolean DEFAULT true,
    "nhis_percentage" integer DEFAULT 50,
    CONSTRAINT "available_beds_check" CHECK ((("available_beds" >= 0) AND ("available_beds" <= "total_beds"))),
    CONSTRAINT "wards_gender_restriction_check" CHECK ((("gender_restriction")::"text" = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'none'::character varying])::"text"[]))),
    CONSTRAINT "wards_ward_type_check" CHECK ((("ward_type")::"text" = ANY ((ARRAY['general'::character varying, 'icu'::character varying, 'pediatric'::character varying, 'maternity'::character varying, 'surgical'::character varying, 'orthopedic'::character varying, 'cardiac'::character varying, 'emergency'::character varying, 'psychiatric'::character varying, 'isolation'::character varying])::"text"[])))
);


ALTER TABLE "public"."wards" OWNER TO "postgres";


COMMENT ON TABLE "public"."wards" IS 'Hospital wards/units for in-patient care';



CREATE OR REPLACE VIEW "public"."active_admissions_view" AS
 SELECT "a"."id" AS "admission_id",
    "a"."admission_number",
    "a"."admission_date",
    "a"."admission_type",
    "a"."admission_status",
    "a"."admitting_diagnosis",
    "a"."acuity_level",
    "a"."expected_discharge_date",
    "p"."id" AS "patient_id",
    "p"."first_name",
    "p"."surname" AS "last_name",
    "p"."date_of_birth",
    "p"."gender",
    "p"."emr_number" AS "hospital_id",
    "w"."name" AS "ward_name",
    "w"."ward_type",
    "b"."bed_number",
    "s"."first_name" AS "physician_first_name",
    "s"."last_name" AS "physician_last_name",
    "a"."facility_id",
    "a"."current_ward_id",
    "a"."current_bed_id",
    "a"."encounter_id",
    COALESCE(("bo"."status")::"text", 'Pending'::"text") AS "billing_status",
    "bo"."id" AS "billing_order_id",
    "bo"."total_amount" AS "billing_amount"
   FROM ((((("public"."admissions" "a"
     JOIN "public"."patients" "p" ON (("p"."id" = "a"."patient_id")))
     LEFT JOIN "public"."wards" "w" ON (("w"."id" = "a"."current_ward_id")))
     LEFT JOIN "public"."beds" "b" ON (("b"."id" = "a"."current_bed_id")))
     LEFT JOIN "public"."staff" "s" ON (("s"."id" = "a"."attending_physician_id")))
     LEFT JOIN LATERAL ( SELECT "orders"."id",
            "orders"."status",
            "orders"."total_amount"
           FROM "public"."billing_orders" "orders"
          WHERE (((("a"."encounter_id" IS NOT NULL) AND ("orders"."encounter_id" = "a"."encounter_id")) OR ("orders"."encounter_id" = "a"."id") OR (("orders"."patient_id" = "a"."patient_id") AND ("date"("orders"."created_at") = "date"("a"."admission_date")))) AND (EXISTS ( SELECT 1
                   FROM "public"."billing_items" "bi"
                  WHERE (("bi"."billing_order_id" = "orders"."id") AND ("bi"."item_type" = 'Admission'::"public"."service_type")))))
          ORDER BY "orders"."created_at" DESC
         LIMIT 1) "bo" ON (true))
  WHERE (("a"."admission_status")::"text" <> ALL ((ARRAY['discharged'::character varying, 'deceased'::character varying])::"text"[]));


ALTER VIEW "public"."active_admissions_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bed_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admission_id" "uuid" NOT NULL,
    "from_ward_id" "uuid",
    "from_bed_id" "uuid",
    "to_ward_id" "uuid" NOT NULL,
    "to_bed_id" "uuid" NOT NULL,
    "transfer_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transfer_reason" character varying(100) NOT NULL,
    "transfer_reason_details" "text",
    "clinical_status_at_transfer" character varying(30),
    "authorized_by" "uuid" NOT NULL,
    "performed_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "bed_transfers_transfer_reason_check" CHECK ((("transfer_reason")::"text" = ANY ((ARRAY['clinical_upgrade'::character varying, 'clinical_downgrade'::character varying, 'bed_availability'::character varying, 'patient_request'::character varying, 'isolation_required'::character varying, 'isolation_cleared'::character varying, 'procedure'::character varying, 'surgery'::character varying, 'discharge_preparation'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."bed_transfers" OWNER TO "postgres";


COMMENT ON TABLE "public"."bed_transfers" IS 'Patient bed/ward transfer history';



CREATE TABLE IF NOT EXISTS "public"."visits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "visit_id" character varying(50) NOT NULL,
    "patient_id" "uuid",
    "clinic_id" "uuid",
    "visit_type" character varying(50),
    "encounter_number" character varying(50),
    "encounter_date" "date",
    "priority" "public"."priority" DEFAULT 'Normal'::"public"."priority",
    "chief_complaint" "text",
    "payment_category" "public"."payment_method",
    "status" "public"."visit_status" DEFAULT 'Active'::"public"."visit_status",
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone,
    "discharge_date" timestamp with time zone,
    "discharge_notes" "text",
    "attending_doctor_id" "uuid",
    "registered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_stage" "text" DEFAULT 'registered'::"text",
    "stage_updated_at" timestamp with time zone DEFAULT "now"(),
    "stage_history" "jsonb" DEFAULT '[]'::"jsonb",
    "closed_by" "uuid",
    "closed_reason" "text",
    "insurance_type" character varying(50),
    "encounter_category" character varying(20) DEFAULT 'outpatient'::character varying,
    "expected_duration_days" integer DEFAULT 1,
    "admission_date" timestamp with time zone,
    "ward_location" character varying(100),
    "bed_number" character varying(20),
    "opd_classification" "public"."opd_classification"
);

ALTER TABLE ONLY "public"."visits" REPLICA IDENTITY FULL;

ALTER TABLE ONLY "public"."visits" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."visits" OWNER TO "postgres";


COMMENT ON COLUMN "public"."visits"."id" IS 'PRIMARY encounter identifier (UUID). Use this for all FK references.';



COMMENT ON COLUMN "public"."visits"."visit_id" IS 'Human-readable visit ID (V-XXXXX). Display only, do not use for FKs.';



COMMENT ON COLUMN "public"."visits"."encounter_number" IS 'Human-readable encounter number (ENC-YYYYMMDD-XXXX). Display only.';



COMMENT ON COLUMN "public"."visits"."insurance_type" IS 'Patient insurance type at time of visit (DHML, Civilian_NHIS, Private) - snapshot for audit';



COMMENT ON COLUMN "public"."visits"."encounter_category" IS 'Type of encounter: outpatient, inpatient, emergency, day_case';



COMMENT ON COLUMN "public"."visits"."expected_duration_days" IS 'Expected duration of stay in days (1 for outpatient)';



CREATE TABLE IF NOT EXISTS "public"."ward_round_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admission_id" "uuid" NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "round_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "round_type" character varying(50) NOT NULL,
    "subjective_notes" "text",
    "objective_findings" "text",
    "vital_signs" "jsonb",
    "assessment" "text",
    "plan" "text",
    "new_orders" "jsonb" DEFAULT '[]'::"jsonb",
    "discontinued_orders" "jsonb" DEFAULT '[]'::"jsonb",
    "nursing_instructions" "text",
    "patient_condition" character varying(30),
    "estimated_discharge_date" "date",
    "discharge_planning_notes" "text",
    "attending_physician_id" "uuid",
    "participants" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "ward_round_notes_round_type_check" CHECK ((("round_type")::"text" = ANY ((ARRAY['morning'::character varying, 'evening'::character varying, 'night'::character varying, 'consultant'::character varying, 'multidisciplinary'::character varying, 'teaching'::character varying])::"text"[])))
);


ALTER TABLE "public"."ward_round_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."ward_round_notes" IS 'Documentation from daily ward rounds';



CREATE OR REPLACE VIEW "public"."admission_history_view" AS
 SELECT "a"."id" AS "admission_id",
    "a"."admission_number",
    "a"."encounter_id",
    "v"."encounter_number",
    "p"."id" AS "patient_id",
    "p"."first_name",
    "p"."surname" AS "last_name",
    "p"."emr_number" AS "hospital_id",
    "a"."admission_date",
    "a"."actual_discharge_date",
    "a"."admission_type",
    "a"."admission_status",
    "a"."acuity_level",
    "a"."admitting_diagnosis",
    "a"."discharge_diagnosis",
    "a"."discharge_type",
    "a"."discharge_summary",
    "w"."name" AS "ward_name",
    "b"."bed_number",
    ((("admitting_doc"."first_name")::"text" || ' '::"text") || ("admitting_doc"."last_name")::"text") AS "admitting_doctor_name",
    ((("attending_doc"."first_name")::"text" || ' '::"text") || ("attending_doc"."last_name")::"text") AS "attending_physician_name",
    ((("discharged_doc"."first_name")::"text" || ' '::"text") || ("discharged_doc"."last_name")::"text") AS "discharged_by_name",
    (EXTRACT(day FROM (COALESCE("a"."actual_discharge_date", "now"()) - "a"."admission_date")))::integer AS "length_of_stay_days",
    ( SELECT "count"(*) AS "count"
           FROM "public"."ward_round_notes" "wrn"
          WHERE ("wrn"."admission_id" = "a"."id")) AS "ward_round_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."bed_transfers" "bt"
          WHERE ("bt"."admission_id" = "a"."id")) AS "transfer_count",
    "a"."facility_id"
   FROM ((((((("public"."admissions" "a"
     JOIN "public"."patients" "p" ON (("p"."id" = "a"."patient_id")))
     LEFT JOIN "public"."wards" "w" ON (("w"."id" = "a"."current_ward_id")))
     LEFT JOIN "public"."beds" "b" ON (("b"."id" = "a"."current_bed_id")))
     LEFT JOIN "public"."staff" "admitting_doc" ON (("admitting_doc"."id" = "a"."admitting_doctor_id")))
     LEFT JOIN "public"."staff" "attending_doc" ON (("attending_doc"."id" = "a"."attending_physician_id")))
     LEFT JOIN "public"."staff" "discharged_doc" ON (("discharged_doc"."id" = "a"."discharged_by")))
     LEFT JOIN "public"."visits" "v" ON (("v"."id" = "a"."encounter_id")))
  ORDER BY "a"."admission_date" DESC;


ALTER VIEW "public"."admission_history_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinical_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "request_number" character varying(50),
    "patient_id" "uuid" NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "requesting_doctor_id" "uuid" NOT NULL,
    "requesting_department_id" "uuid",
    "request_type" "public"."clinical_request_type" NOT NULL,
    "clinical_reason" "text" NOT NULL,
    "urgency" "public"."clinical_urgency" DEFAULT 'Routine'::"public"."clinical_urgency" NOT NULL,
    "suggested_timeframe" character varying(100),
    "notes" "text",
    "target_department_id" "uuid",
    "target_ward_id" "uuid",
    "target_doctor_id" "uuid",
    "admission_type" character varying(20),
    "suggested_ward_type" character varying(50),
    "level_of_care" character varying(20),
    "expected_duration" character varying(50),
    "special_requirements" "text",
    "procedure_catalogue_id" "uuid",
    "procedure_name" character varying(255),
    "procedure_notes" "text",
    "pre_op_requirements" "text",
    "follow_up_reason" "text",
    "follow_up_instructions" "text",
    "status" "public"."clinical_request_status" DEFAULT 'Pending'::"public"."clinical_request_status",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "admission_id" "uuid",
    "procedure_id" "uuid",
    "referral_id" "uuid",
    "follow_up_visit_id" "uuid",
    "scheduled_date" "date",
    "scheduled_time" time without time zone,
    "scheduled_by" "uuid",
    "scheduling_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "facility_id" "uuid",
    "sla_hours" integer,
    "sla_deadline" timestamp with time zone,
    "sla_warning_sent" boolean DEFAULT false,
    "sla_breach_sent" boolean DEFAULT false,
    "specialty_module" character varying(50),
    CONSTRAINT "clinical_requests_admission_type_check" CHECK ((("admission_type")::"text" = ANY ((ARRAY['Emergency'::character varying, 'Elective'::character varying])::"text"[]))),
    CONSTRAINT "clinical_requests_level_of_care_check" CHECK ((("level_of_care")::"text" = ANY ((ARRAY['Ward'::character varying, 'ICU'::character varying, 'HDU'::character varying, 'NICU'::character varying])::"text"[])))
);


ALTER TABLE "public"."clinical_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."clinical_requests" IS 'Central table for all clinical requests - Admission, Procedure, Surgery, Referral, Follow-up, Discharge';



COMMENT ON COLUMN "public"."clinical_requests"."specialty_module" IS 'Target specialty module: dental, ophthalmology, physiotherapy';



CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "category" "public"."department_category" NOT NULL,
    "building" character varying(100),
    "floor" character varying(50),
    "status" "public"."department_status" DEFAULT 'Active'::"public"."department_status",
    "accepts_queue" boolean DEFAULT true,
    "accepts_referrals" boolean DEFAULT true,
    "requires_payment" boolean DEFAULT false,
    "default_priority" integer DEFAULT 1,
    "head_of_department" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "opd_type" character varying(20),
    CONSTRAINT "departments_opd_type_check" CHECK ((("opd_type")::"text" = ANY ((ARRAY['MOPD'::character varying, 'SOPD'::character varying, 'Support'::character varying, 'Diagnostic'::character varying, 'Administrative'::character varying])::"text"[])))
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admission_requests_view" AS
 SELECT "cr"."id",
    "cr"."request_number",
    "cr"."patient_id",
    "cr"."encounter_id",
    "cr"."requesting_doctor_id",
    "cr"."requesting_department_id",
    "cr"."request_type",
    "cr"."clinical_reason",
    "cr"."urgency",
    "cr"."suggested_timeframe",
    "cr"."notes",
    "cr"."target_department_id",
    "cr"."target_ward_id",
    "cr"."target_doctor_id",
    "cr"."admission_type",
    "cr"."suggested_ward_type",
    "cr"."level_of_care",
    "cr"."expected_duration",
    "cr"."special_requirements",
    "cr"."procedure_catalogue_id",
    "cr"."procedure_name",
    "cr"."procedure_notes",
    "cr"."pre_op_requirements",
    "cr"."follow_up_reason",
    "cr"."follow_up_instructions",
    "cr"."status",
    "cr"."reviewed_by",
    "cr"."reviewed_at",
    "cr"."review_notes",
    "cr"."approved_by",
    "cr"."approved_at",
    "cr"."rejection_reason",
    "cr"."admission_id",
    "cr"."procedure_id",
    "cr"."referral_id",
    "cr"."follow_up_visit_id",
    "cr"."scheduled_date",
    "cr"."scheduled_time",
    "cr"."scheduled_by",
    "cr"."scheduling_notes",
    "cr"."created_at",
    "cr"."updated_at",
    "cr"."created_by",
    "cr"."facility_id",
    ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text") AS "patient_name",
    "p"."emr_number",
    "p"."gender",
    "p"."date_of_birth",
    "p"."patient_category",
    "p"."insurance_type",
    ((("doc"."first_name")::"text" || ' '::"text") || ("doc"."last_name")::"text") AS "requesting_doctor_name",
    "dept"."name" AS "requesting_department_name",
    "target_ward"."name" AS "suggested_ward_name",
    "target_ward"."ward_type",
    "target_ward"."available_beds"
   FROM (((("public"."clinical_requests" "cr"
     JOIN "public"."patients" "p" ON (("cr"."patient_id" = "p"."id")))
     LEFT JOIN "public"."staff" "doc" ON (("cr"."requesting_doctor_id" = "doc"."id")))
     LEFT JOIN "public"."departments" "dept" ON (("cr"."requesting_department_id" = "dept"."id")))
     LEFT JOIN "public"."wards" "target_ward" ON (("cr"."target_ward_id" = "target_ward"."id")))
  WHERE ("cr"."request_type" = 'Admission'::"public"."clinical_request_type")
  ORDER BY
        CASE "cr"."urgency"
            WHEN 'Emergency'::"public"."clinical_urgency" THEN 1
            WHEN 'Urgent'::"public"."clinical_urgency" THEN 2
            ELSE 3
        END, "cr"."created_at";


ALTER VIEW "public"."admission_requests_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid",
    "doctor_id" "uuid",
    "department_id" "uuid",
    "appointment_date" "date" NOT NULL,
    "appointment_time" time without time zone NOT NULL,
    "duration_minutes" integer DEFAULT 15,
    "type" "public"."appointment_type" DEFAULT 'Consultation'::"public"."appointment_type",
    "status" "public"."appointment_status" DEFAULT 'Scheduled'::"public"."appointment_status",
    "reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."bed_availability" AS
 SELECT "w"."id" AS "ward_id",
    "w"."name" AS "ward_name",
    "w"."ward_type",
    "b"."id" AS "bed_id",
    "b"."bed_number",
    "b"."bed_type",
    "b"."status",
    "b"."features",
    "b"."daily_rate",
        CASE
            WHEN (("b"."status")::"text" = 'available'::"text") THEN NULL::"text"
            ELSE ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text")
        END AS "current_patient_name",
        CASE
            WHEN (("b"."status")::"text" = 'available'::"text") THEN NULL::character varying
            ELSE "a"."admission_number"
        END AS "admission_number",
    "w"."facility_id"
   FROM ((("public"."beds" "b"
     JOIN "public"."wards" "w" ON (("w"."id" = "b"."ward_id")))
     LEFT JOIN "public"."patients" "p" ON (("p"."id" = "b"."current_patient_id")))
     LEFT JOIN "public"."admissions" "a" ON (("a"."id" = "b"."current_admission_id")))
  WHERE (("w"."is_active" = true) AND ("b"."is_active" = true))
  ORDER BY "w"."name", "b"."bed_number";


ALTER VIEW "public"."bed_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_type" "public"."billing_audit_event" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "billing_order_id" "uuid",
    "billing_item_id" "uuid",
    "category_invoice_id" "uuid",
    "category_receipt_id" "uuid",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "changes_summary" "text",
    "performed_by" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "notes" "text",
    "metadata" "jsonb",
    CONSTRAINT "billing_audit_log_entity_type_check" CHECK ((("entity_type")::"text" = ANY ((ARRAY['billing_item'::character varying, 'billing_order'::character varying, 'category_invoice'::character varying, 'category_receipt'::character varying, 'receipt'::character varying, 'invoice'::character varying])::"text"[])))
);


ALTER TABLE "public"."billing_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_audit_log" IS 'Comprehensive audit log for all billing operations';



COMMENT ON COLUMN "public"."billing_audit_log"."old_value" IS 'Previous state of the entity (JSON snapshot)';



COMMENT ON COLUMN "public"."billing_audit_log"."new_value" IS 'New state of the entity (JSON snapshot)';



COMMENT ON COLUMN "public"."billing_audit_log"."changes_summary" IS 'Human-readable summary of changes';



CREATE OR REPLACE VIEW "public"."billing_audit_trail" AS
 SELECT "bal"."id",
    "bal"."event_type",
    "bal"."entity_type",
    "bal"."entity_id",
    "bal"."encounter_id",
    "bal"."patient_id",
    "bal"."changes_summary",
    "bal"."performed_at",
    "bal"."notes",
    ((("s"."first_name")::"text" || ' '::"text") || ("s"."last_name")::"text") AS "performed_by_name",
    ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text") AS "patient_name",
    "bal"."old_value",
    "bal"."new_value"
   FROM (("public"."billing_audit_log" "bal"
     LEFT JOIN "public"."staff" "s" ON (("bal"."performed_by" = "s"."id")))
     LEFT JOIN "public"."patients" "p" ON (("bal"."patient_id" = "p"."id")))
  ORDER BY "bal"."performed_at" DESC;


ALTER VIEW "public"."billing_audit_trail" OWNER TO "postgres";


COMMENT ON VIEW "public"."billing_audit_trail" IS 'Human-readable audit trail for billing operations';



CREATE TABLE IF NOT EXISTS "public"."chief_complaint_catalogue" (
    "complaint_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "complaint_name" character varying(100) NOT NULL,
    "complaint_code" character varying(20) NOT NULL,
    "category" "public"."complaint_category" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chief_complaint_catalogue" OWNER TO "postgres";


COMMENT ON TABLE "public"."chief_complaint_catalogue" IS 'Predefined standardized chief complaints for structured clinical documentation';



CREATE OR REPLACE VIEW "public"."clinical_request_daily_volume" AS
 SELECT "date"("created_at") AS "request_date",
    "request_type",
    "urgency",
    "count"(*) AS "request_count",
    "count"(*) FILTER (WHERE ("status" = 'Completed'::"public"."clinical_request_status")) AS "completed_count",
    "count"(*) FILTER (WHERE ("status" = 'Rejected'::"public"."clinical_request_status")) AS "rejected_count",
    "count"(*) FILTER (WHERE ("status" = ANY (ARRAY['Pending'::"public"."clinical_request_status", 'Under_Review'::"public"."clinical_request_status"]))) AS "pending_count",
    ("avg"((EXTRACT(epoch FROM (
        CASE
            WHEN ("status" = 'Completed'::"public"."clinical_request_status") THEN "updated_at"
            ELSE "now"()
        END - "created_at")) / (3600)::numeric)))::numeric(10,2) AS "avg_hours"
   FROM "public"."clinical_requests"
  GROUP BY ("date"("created_at")), "request_type", "urgency"
  ORDER BY ("date"("created_at")) DESC, "request_type";


ALTER VIEW "public"."clinical_request_daily_volume" OWNER TO "postgres";


COMMENT ON VIEW "public"."clinical_request_daily_volume" IS 'Daily volume statistics for clinical requests';



CREATE SEQUENCE IF NOT EXISTS "public"."clinical_request_seq"
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clinical_request_seq" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."clinical_request_sla_status" AS
 SELECT "cr"."id",
    "cr"."request_number",
    "cr"."request_type",
    "cr"."urgency",
    "cr"."status",
    "cr"."created_at",
    "cr"."sla_deadline",
    "cr"."sla_hours",
    ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text") AS "patient_name",
    "d"."name" AS "target_department",
        CASE
            WHEN ("cr"."status" = ANY (ARRAY['Completed'::"public"."clinical_request_status", 'Cancelled'::"public"."clinical_request_status", 'Rejected'::"public"."clinical_request_status"])) THEN 'N/A'::"text"
            WHEN ("now"() > "cr"."sla_deadline") THEN 'BREACHED'::"text"
            WHEN ("now"() > ("cr"."sla_deadline" - (((("cr"."sla_hours")::numeric * 0.25) || ' hours'::"text"))::interval)) THEN 'WARNING'::"text"
            ELSE 'ON_TRACK'::"text"
        END AS "sla_status",
    (GREATEST((0)::numeric, (EXTRACT(epoch FROM ("cr"."sla_deadline" - "now"())) / (3600)::numeric)))::numeric(10,2) AS "hours_remaining"
   FROM (("public"."clinical_requests" "cr"
     JOIN "public"."patients" "p" ON (("cr"."patient_id" = "p"."id")))
     LEFT JOIN "public"."departments" "d" ON (("cr"."target_department_id" = "d"."id")))
  WHERE ("cr"."status" = ANY (ARRAY['Pending'::"public"."clinical_request_status", 'Under_Review'::"public"."clinical_request_status", 'Approved'::"public"."clinical_request_status", 'Scheduled'::"public"."clinical_request_status"]))
  ORDER BY
        CASE
            WHEN ("now"() > "cr"."sla_deadline") THEN 1
            WHEN ("now"() > ("cr"."sla_deadline" - (((("cr"."sla_hours")::numeric * 0.25) || ' hours'::"text"))::interval)) THEN 2
            ELSE 3
        END, "cr"."sla_deadline";


ALTER VIEW "public"."clinical_request_sla_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."clinical_request_sla_status" IS 'SLA compliance monitoring for pending requests';



CREATE OR REPLACE VIEW "public"."clinical_request_stats" AS
 SELECT "request_type",
    "status",
    "urgency",
    "count"(*) AS "count",
    "date"("created_at") AS "request_date"
   FROM "public"."clinical_requests"
  GROUP BY "request_type", "status", "urgency", ("date"("created_at"));


ALTER VIEW "public"."clinical_request_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clinical_request_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "from_status" "public"."clinical_request_status",
    "to_status" "public"."clinical_request_status" NOT NULL,
    "changed_by" "uuid",
    "change_reason" "text",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clinical_request_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."clinical_request_status_history" IS 'Audit trail for clinical request status changes';



CREATE TABLE IF NOT EXISTS "public"."clinics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "clinic_id" character varying(50) NOT NULL,
    "clinic_name" character varying(100) NOT NULL,
    "clinic_code" character varying(50),
    "description" "text",
    "consultation_fee" numeric(10,2) DEFAULT 0,
    "follow_up_fee" numeric(10,2) DEFAULT 0,
    "emergency_fee" numeric(10,2) DEFAULT 0,
    "department_id" "uuid",
    "location" character varying(100),
    "operating_hours" character varying(100),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nhis_consultation_fee" numeric(10,2) DEFAULT 0,
    "nhis_follow_up_fee" numeric(10,2) DEFAULT 0,
    "nhis_emergency_fee" numeric(10,2) DEFAULT 0,
    "updated_by" "uuid"
);


ALTER TABLE "public"."clinics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clinics"."nhis_consultation_fee" IS 'NHIS-approved consultation fee for this clinic';



COMMENT ON COLUMN "public"."clinics"."nhis_follow_up_fee" IS 'NHIS-approved follow-up fee for this clinic';



COMMENT ON COLUMN "public"."clinics"."nhis_emergency_fee" IS 'NHIS-approved emergency fee for this clinic';



CREATE TABLE IF NOT EXISTS "public"."config_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."config_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultations" (
    "consultation_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "subjective" "text",
    "objective" "text",
    "assessment" "text",
    "plan" "text",
    "diagnosis" "text"[],
    "notes" "text",
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "complaints" "text",
    "history_of_present_illness" "text",
    "past_medical_history" "text",
    "examination_findings" "text",
    "differential_diagnosis" "text"[],
    "treatment_plan" "text",
    "follow_up_date" timestamp with time zone,
    "follow_up_notes" "text",
    "clinical_notes" "text",
    "consultation_date" timestamp with time zone DEFAULT "now"(),
    "status" "public"."request_status" DEFAULT 'Completed'::"public"."request_status",
    "encounter_id" "uuid",
    "diagnosis_text" "text",
    "patient_id" character varying(50),
    "visit_id" character varying(50),
    "doctor_id" character varying(50),
    "clinic_id" character varying(50),
    "requires_nurse_followup" boolean DEFAULT false,
    "nurse_followup_instructions" "text",
    "nurse_acknowledged_by" "uuid",
    "nurse_acknowledged_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."consultations" REPLICA IDENTITY FULL;


ALTER TABLE "public"."consultations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_name" character varying(100) NOT NULL,
    "course_number" integer NOT NULL,
    "year" integer,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "facility_id" "uuid"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses" IS 'Manages courses for Military and Civilian Participants at NDC';



CREATE TABLE IF NOT EXISTS "public"."customer_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid",
    "feedback_type" "public"."feedback_type" NOT NULL,
    "subject" character varying(255) NOT NULL,
    "description" "text",
    "contact_name" character varying(100),
    "contact_phone" character varying(50),
    "contact_email" character varying(100),
    "status" "public"."feedback_status" DEFAULT 'Open'::"public"."feedback_status",
    "assigned_to" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_progress_notes" (
    "progress_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "note_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "subjective" "text",
    "objective" "text",
    "assessment" "text",
    "plan" "text",
    "nursing_summary" "text",
    "vital_signs_summary" "text",
    "oral_intake_ml" integer DEFAULT 0,
    "iv_intake_ml" integer DEFAULT 0,
    "urine_output_ml" integer DEFAULT 0,
    "other_output_ml" integer DEFAULT 0,
    "io_notes" "text",
    "patient_condition" character varying(50) DEFAULT 'stable'::character varying,
    "alert_level" character varying(20) DEFAULT 'normal'::character varying,
    "recorded_by" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL
);


ALTER TABLE "public"."daily_progress_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."daily_progress_notes" IS 'Daily progress notes - encounter_id now references visits.id (UUID)';



CREATE TABLE IF NOT EXISTS "public"."dental_chart" (
    "chart_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "tooth_number" integer NOT NULL,
    "tooth_status" "public"."tooth_status" DEFAULT 'Present'::"public"."tooth_status" NOT NULL,
    "condition" "public"."tooth_condition" DEFAULT 'Healthy'::"public"."tooth_condition",
    "caries_classification" character varying(20),
    "mobility_grade" integer,
    "mesial" boolean DEFAULT false,
    "occlusal" boolean DEFAULT false,
    "distal" boolean DEFAULT false,
    "buccal" boolean DEFAULT false,
    "lingual" boolean DEFAULT false,
    "incisal" boolean DEFAULT false,
    "periapical_status" character varying(50),
    "restoration_material" character varying(50),
    "restoration_date" "date",
    "prosthesis_type" character varying(50),
    "sensitivity" character varying(20),
    "notes" "text",
    "recorded_by" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dental_chart_mobility_grade_check" CHECK ((("mobility_grade" >= 0) AND ("mobility_grade" <= 3))),
    CONSTRAINT "dental_chart_tooth_number_check" CHECK (((("tooth_number" >= 11) AND ("tooth_number" <= 18)) OR (("tooth_number" >= 21) AND ("tooth_number" <= 28)) OR (("tooth_number" >= 31) AND ("tooth_number" <= 38)) OR (("tooth_number" >= 41) AND ("tooth_number" <= 48)) OR (("tooth_number" >= 51) AND ("tooth_number" <= 55)) OR (("tooth_number" >= 61) AND ("tooth_number" <= 65)) OR (("tooth_number" >= 71) AND ("tooth_number" <= 75)) OR (("tooth_number" >= 81) AND ("tooth_number" <= 85))))
);


ALTER TABLE "public"."dental_chart" OWNER TO "postgres";


COMMENT ON TABLE "public"."dental_chart" IS 'Tooth-by-tooth condition documentation (FDI system)';



CREATE TABLE IF NOT EXISTS "public"."dental_exams" (
    "exam_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "facility_id" "uuid",
    "chief_complaint" "text",
    "complaint_duration" character varying(100),
    "pain_level" integer,
    "pain_character" character varying(50),
    "dental_history" "text",
    "medical_history" "text",
    "allergies" "text",
    "current_medications" "text",
    "extraoral_findings" "text",
    "intraoral_findings" "text",
    "soft_tissue_exam" "text",
    "hard_tissue_exam" "text",
    "occlusion_notes" "text",
    "occlusion_class" character varying(20),
    "tmj_assessment" "text",
    "gingival_status" "public"."gingival_status" DEFAULT 'Healthy'::"public"."gingival_status",
    "bleeding_on_probing" boolean DEFAULT false,
    "plaque_score" integer,
    "calculus_present" boolean DEFAULT false,
    "pocket_depth_notes" "text",
    "radiograph_taken" boolean DEFAULT false,
    "radiograph_type" character varying(50),
    "radiograph_findings" "text",
    "provisional_diagnosis" "text",
    "final_diagnosis" "text",
    "icd_codes" "text"[],
    "treatment_plan" "text",
    "urgency" "public"."dental_urgency" DEFAULT 'Routine'::"public"."dental_urgency",
    "estimated_sessions" integer,
    "estimated_cost" numeric(10,2),
    "follow_up_required" boolean DEFAULT false,
    "follow_up_date" "date",
    "follow_up_notes" "text",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "finalized_at" timestamp with time zone,
    "finalized_by" "uuid",
    CONSTRAINT "dental_exam_finalized_check" CHECK ((("finalized_at" IS NULL) OR ("finalized_by" IS NOT NULL))),
    CONSTRAINT "dental_exams_pain_level_check" CHECK ((("pain_level" >= 0) AND ("pain_level" <= 10))),
    CONSTRAINT "dental_exams_plaque_score_check" CHECK ((("plaque_score" >= 0) AND ("plaque_score" <= 100)))
);


ALTER TABLE "public"."dental_exams" OWNER TO "postgres";


COMMENT ON TABLE "public"."dental_exams" IS 'Main dental examination record, encounter-linked';



CREATE TABLE IF NOT EXISTS "public"."dental_prescriptions" (
    "prescription_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "exam_id" "uuid",
    "procedure_id" "uuid",
    "facility_id" "uuid",
    "medication_name" character varying(255) NOT NULL,
    "medication_type" character varying(50),
    "generic_name" character varying(255),
    "dosage" character varying(100) NOT NULL,
    "dosage_form" character varying(50),
    "frequency" character varying(100) NOT NULL,
    "duration" character varying(100) NOT NULL,
    "route" character varying(50) DEFAULT 'Oral'::character varying,
    "quantity" integer,
    "refills_allowed" integer DEFAULT 0,
    "special_instructions" "text",
    "warnings" "text",
    "prescribed_by" "uuid",
    "prescribed_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'Active'::character varying,
    "dispensed_at" timestamp with time zone,
    "dispensed_by" "uuid"
);


ALTER TABLE "public"."dental_prescriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."dental_prescriptions" IS 'Dental-specific prescriptions';



CREATE TABLE IF NOT EXISTS "public"."dental_procedures" (
    "procedure_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "exam_id" "uuid",
    "facility_id" "uuid",
    "procedure_code" character varying(50),
    "procedure_type" character varying(100) NOT NULL,
    "procedure_category" character varying(50),
    "tooth_numbers" integer[],
    "surfaces" "text"[],
    "procedure_description" "text",
    "anesthesia_type" character varying(50),
    "anesthesia_agent" character varying(100),
    "anesthesia_quantity" character varying(50),
    "anesthesia_site" character varying(100),
    "consent_obtained" boolean DEFAULT false,
    "consent_date" timestamp with time zone,
    "pre_procedure_notes" "text",
    "procedure_date" timestamp with time zone,
    "duration_minutes" integer,
    "materials_used" "text",
    "complications" "text",
    "post_procedure_instructions" "text",
    "medications_prescribed" "text",
    "sutures_placed" boolean DEFAULT false,
    "suture_type" character varying(50),
    "suture_removal_date" "date",
    "fee" numeric(10,2),
    "discount_percent" integer DEFAULT 0,
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "priority" "public"."priority" DEFAULT 'Normal'::"public"."priority",
    "scheduled_date" timestamp with time zone,
    "performed_by" "uuid",
    "assisted_by" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "follow_up_required" boolean DEFAULT false,
    "follow_up_date" "date",
    "estimated_cost" numeric(10,2),
    "actual_cost" numeric(10,2)
);


ALTER TABLE "public"."dental_procedures" OWNER TO "postgres";


COMMENT ON TABLE "public"."dental_procedures" IS 'Dental procedures and treatments performed';



COMMENT ON COLUMN "public"."dental_procedures"."follow_up_required" IS 'Whether follow-up is required after procedure';



COMMENT ON COLUMN "public"."dental_procedures"."follow_up_date" IS 'Scheduled follow-up date';



COMMENT ON COLUMN "public"."dental_procedures"."estimated_cost" IS 'Estimated cost of the procedure';



COMMENT ON COLUMN "public"."dental_procedures"."actual_cost" IS 'Actual cost after procedure completion';



CREATE OR REPLACE VIEW "public"."department_clinical_workload" AS
 SELECT "d"."id" AS "department_id",
    "d"."name" AS "department_name",
    "d"."opd_type",
    "count"(*) FILTER (WHERE ("cr"."status" = ANY (ARRAY['Pending'::"public"."clinical_request_status", 'Under_Review'::"public"."clinical_request_status"]))) AS "pending_requests",
    "count"(*) FILTER (WHERE ("cr"."status" = ANY (ARRAY['Approved'::"public"."clinical_request_status", 'Scheduled'::"public"."clinical_request_status", 'In_Progress'::"public"."clinical_request_status"]))) AS "active_requests",
    "count"(*) FILTER (WHERE (("cr"."status" = 'Completed'::"public"."clinical_request_status") AND ("date"("cr"."updated_at") = CURRENT_DATE))) AS "completed_today",
    "count"(*) FILTER (WHERE (("cr"."status" = 'Completed'::"public"."clinical_request_status") AND ("cr"."updated_at" >= (CURRENT_DATE - '7 days'::interval)))) AS "completed_week",
    ("avg"((EXTRACT(epoch FROM (
        CASE
            WHEN ("cr"."status" = 'Completed'::"public"."clinical_request_status") THEN "cr"."updated_at"
            ELSE NULL::timestamp with time zone
        END - "cr"."created_at")) / (3600)::numeric)))::numeric(10,2) AS "avg_turnaround_hours"
   FROM ("public"."departments" "d"
     LEFT JOIN "public"."clinical_requests" "cr" ON (("cr"."target_department_id" = "d"."id")))
  WHERE ("d"."status" = 'Active'::"public"."department_status")
  GROUP BY "d"."id", "d"."name", "d"."opd_type"
  ORDER BY ("count"(*) FILTER (WHERE ("cr"."status" = ANY (ARRAY['Pending'::"public"."clinical_request_status", 'Under_Review'::"public"."clinical_request_status"])))) DESC;


ALTER VIEW "public"."department_clinical_workload" OWNER TO "postgres";


COMMENT ON VIEW "public"."department_clinical_workload" IS 'Department workload metrics for clinical requests';



CREATE TABLE IF NOT EXISTS "public"."dispense_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "dispense_id" "uuid",
    "prescription_item_id" "uuid",
    "drug_id" "uuid",
    "quantity_dispensed" integer NOT NULL,
    "batch_number" character varying(50),
    "expiry_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispense_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dispense_records" (
    "dispense_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "prescription_id" "uuid",
    "patient_id" character varying(50),
    "encounter_id" "uuid",
    "drug_id" "uuid" NOT NULL,
    "batch_id" "uuid",
    "quantity_dispensed" integer NOT NULL,
    "pharmacist_id" character varying(50),
    "verified_by" character varying(50),
    "dispensed_at" timestamp with time zone DEFAULT "now"(),
    "is_substitution" boolean DEFAULT false,
    "original_drug_id" "uuid",
    "substitution_reason" "text",
    "nhis_claim_id" "uuid",
    "nhis_amount" numeric(10,2) DEFAULT 0,
    "patient_copay" numeric(10,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'dispensed'::character varying,
    "counseling_provided" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dispense_records_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['dispensed'::character varying, 'returned'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."dispense_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."dispense_records" IS 'Records each dispensing event with full traceability to encounter/patient/batch';



CREATE TABLE IF NOT EXISTS "public"."dispenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "prescription_id" "uuid",
    "patient_id" "uuid",
    "pharmacist_id" "uuid",
    "status" "public"."dispense_status" DEFAULT 'Dispensed'::"public"."dispense_status",
    "dispensed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dispenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctor_orders" (
    "order_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "encounter_id" character varying(50) NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "order_type" character varying(50) NOT NULL,
    "order_category" character varying(50),
    "instruction" "text" NOT NULL,
    "frequency" character varying(100),
    "duration" character varying(100),
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone,
    "priority" character varying(20) DEFAULT 'routine'::character varying,
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "requires_nurse_action" boolean DEFAULT true,
    "assigned_nurse_id" "uuid",
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "completed_by" "uuid",
    "completed_at" timestamp with time zone,
    "completion_notes" "text",
    "ordered_by" "uuid" NOT NULL,
    "ordered_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."doctor_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."doctor_orders" IS 'Doctor orders that require nursing action or acknowledgment';



CREATE TABLE IF NOT EXISTS "public"."drug_batches" (
    "batch_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "drug_id" "uuid" NOT NULL,
    "batch_number" character varying(50) NOT NULL,
    "barcode" character varying(100),
    "quantity_received" integer DEFAULT 0 NOT NULL,
    "quantity_remaining" integer DEFAULT 0 NOT NULL,
    "manufacture_date" "date",
    "expiry_date" "date" NOT NULL,
    "received_date" timestamp with time zone DEFAULT "now"(),
    "cost_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "selling_price" numeric(10,2),
    "supplier_name" character varying(100),
    "supplier_batch_ref" character varying(100),
    "purchase_order_id" "uuid",
    "received_by" "uuid",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "drug_batches_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'depleted'::character varying, 'expired'::character varying, 'recalled'::character varying, 'quarantine'::character varying])::"text"[])))
);


ALTER TABLE "public"."drug_batches" OWNER TO "postgres";


COMMENT ON TABLE "public"."drug_batches" IS 'Tracks drug inventory by batch with expiry dates for FEFO dispensing';



CREATE TABLE IF NOT EXISTS "public"."drug_catalogue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "stock_quantity" integer DEFAULT 0,
    "reorder_level" integer DEFAULT 10,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nhis_coverage_percent" integer DEFAULT 0,
    "requires_prior_auth" boolean DEFAULT false,
    "is_nhis_covered" boolean DEFAULT false,
    "description" "text",
    "updated_by" "uuid",
    "dosage_form" "text",
    "strengths" "text",
    "presentation" "text",
    "price" numeric(10,2),
    "category" "public"."drug_category",
    "drug_type" "text",
    "is_controlled" boolean DEFAULT false,
    "nhis_eligible" boolean DEFAULT false,
    "nhis_percentage" integer DEFAULT 0,
    "requires_prescription" boolean DEFAULT true,
    "unit_cost" numeric(10,2) DEFAULT 0,
    "unit_of_measure" character varying(50) DEFAULT 'Unit'::character varying,
    "manufacturer" character varying(100),
    "brand_name" character varying(100),
    "selling_price" numeric(10,2) DEFAULT 0,
    "formulation" character varying(100),
    "unit_price" numeric(10,2) DEFAULT 0,
    "nhis_price" numeric(10,2) DEFAULT 0,
    "nhis_code" character varying(50),
    CONSTRAINT "drug_catalogue_nhis_percentage_check" CHECK ((("nhis_percentage" >= 0) AND ("nhis_percentage" <= 100)))
);


ALTER TABLE "public"."drug_catalogue" OWNER TO "postgres";


COMMENT ON COLUMN "public"."drug_catalogue"."is_controlled" IS 'Whether this is a controlled substance requiring special handling';



COMMENT ON COLUMN "public"."drug_catalogue"."nhis_eligible" IS 'Whether this drug is eligible for NHIS coverage';



COMMENT ON COLUMN "public"."drug_catalogue"."nhis_percentage" IS 'Percentage NHIS covers (0-100). E.g., 50 means NHIS pays 50%, patient pays 50%';



COMMENT ON COLUMN "public"."drug_catalogue"."requires_prescription" IS 'Whether this drug requires a prescription to dispense';



CREATE SEQUENCE IF NOT EXISTS "public"."emr_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."emr_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."encounter_access_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" character varying(50) NOT NULL,
    "action" character varying(100) NOT NULL,
    "action_details" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "was_authorized" boolean DEFAULT true NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."encounter_access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."encounter_access_logs" IS 'Immutable audit trail of all encounter access attempts and actions';



CREATE TABLE IF NOT EXISTS "public"."encounter_care_team" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "staff_name" character varying(200) NOT NULL,
    "role" character varying(50) NOT NULL,
    "department" character varying(100),
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "encounter_care_team_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['primary_doctor'::character varying, 'co_managing_doctor'::character varying, 'consulting_doctor'::character varying, 'on_call_doctor'::character varying, 'department_doctor'::character varying, 'referred_doctor'::character varying, 'nurse'::character varying, 'lab_technician'::character varying, 'radiologist'::character varying, 'pharmacist'::character varying])::"text"[])))
);


ALTER TABLE "public"."encounter_care_team" OWNER TO "postgres";


COMMENT ON TABLE "public"."encounter_care_team" IS 'Tracks all staff with access to encounters - enforces mapped doctor only access';



CREATE SEQUENCE IF NOT EXISTS "public"."encounter_number_seq"
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."encounter_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."encounter_transfers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "from_doctor_id" "uuid" NOT NULL,
    "to_doctor_id" "uuid" NOT NULL,
    "transfer_type" character varying(20) NOT NULL,
    "reason" "text" NOT NULL,
    "transferred_by" "uuid" NOT NULL,
    "transferred_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "encounter_transfers_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::"text"[]))),
    CONSTRAINT "encounter_transfers_transfer_type_check" CHECK ((("transfer_type")::"text" = ANY ((ARRAY['reassignment'::character varying, 'co_management'::character varying, 'consultation'::character varying, 'handoff'::character varying])::"text"[])))
);


ALTER TABLE "public"."encounter_transfers" OWNER TO "postgres";


COMMENT ON TABLE "public"."encounter_transfers" IS 'History of encounter ownership transfers, consultations, and handoffs';



CREATE OR REPLACE VIEW "public"."encounter_ownership_history" AS
 SELECT "v"."id" AS "encounter_id",
    "v"."visit_id" AS "encounter_number",
    "v"."attending_doctor_id" AS "current_primary_doctor",
    ((("sd"."first_name")::"text" || ' '::"text") || ("sd"."last_name")::"text") AS "current_doctor_name",
    "v"."clinic_id",
    "c"."clinic_name",
    "v"."status" AS "encounter_status",
    "v"."created_at" AS "encounter_created",
    COALESCE(( SELECT "json_agg"("json_build_object"('transfer_id', "et"."id", 'from_doctor', ((("sf"."first_name")::"text" || ' '::"text") || ("sf"."last_name")::"text"), 'to_doctor', ((("st"."first_name")::"text" || ' '::"text") || ("st"."last_name")::"text"), 'type', "et"."transfer_type", 'reason', "et"."reason", 'status', "et"."status", 'transferred_at', "et"."transferred_at", 'accepted_at', "et"."accepted_at") ORDER BY "et"."transferred_at" DESC) AS "json_agg"
           FROM (("public"."encounter_transfers" "et"
             LEFT JOIN "public"."staff" "sf" ON (("et"."from_doctor_id" = "sf"."id")))
             LEFT JOIN "public"."staff" "st" ON (("et"."to_doctor_id" = "st"."id")))
          WHERE ("et"."encounter_id" = "v"."id")), '[]'::json) AS "transfer_history",
    COALESCE(( SELECT "json_agg"("json_build_object"('staff_id', "ect"."staff_id", 'staff_name', "ect"."staff_name", 'role', "ect"."role", 'department', "ect"."department", 'assigned_at', "ect"."assigned_at", 'expires_at', "ect"."expires_at") ORDER BY "ect"."assigned_at" DESC) AS "json_agg"
           FROM "public"."encounter_care_team" "ect"
          WHERE (("ect"."encounter_id" = "v"."id") AND ("ect"."is_active" = true))), '[]'::json) AS "care_team"
   FROM (("public"."visits" "v"
     LEFT JOIN "public"."staff" "sd" ON (("v"."attending_doctor_id" = "sd"."id")))
     LEFT JOIN "public"."clinics" "c" ON ((("v"."clinic_id")::"text" = ("c"."clinic_id")::"text")));


ALTER VIEW "public"."encounter_ownership_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."encounter_summary" AS
 SELECT "v"."id" AS "encounter_id",
    "v"."visit_id",
    "v"."encounter_number",
    "v"."encounter_date",
    "v"."visit_type",
    "v"."status",
    "v"."current_stage",
    "v"."chief_complaint",
    "v"."payment_category",
    "p"."id" AS "patient_id",
    "p"."emr_number",
    "p"."first_name",
    "p"."surname",
    "p"."contact_phone",
    "v"."created_at",
    "v"."updated_at"
   FROM ("public"."visits" "v"
     JOIN "public"."patients" "p" ON (("v"."patient_id" = "p"."id")));


ALTER VIEW "public"."encounter_summary" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."external_referral_seq"
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."external_referral_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_referrals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "referral_number" character varying(50),
    "direction" character varying(10) NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "encounter_id" "uuid",
    "external_facility_name" character varying(255) NOT NULL,
    "external_facility_address" "text",
    "external_facility_phone" character varying(50),
    "external_physician_name" character varying(255),
    "external_physician_contact" character varying(100),
    "internal_department_id" "uuid",
    "internal_physician_id" "uuid",
    "reason" "text" NOT NULL,
    "clinical_summary" "text",
    "urgency" character varying(20) DEFAULT 'Routine'::character varying,
    "status" character varying(20) DEFAULT 'Pending'::character varying,
    "referral_letter_path" "text",
    "response_letter_path" "text",
    "referral_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expected_date" "date",
    "completed_date" "date",
    "notes" "text",
    "outcome" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "external_referrals_direction_check" CHECK ((("direction")::"text" = ANY ((ARRAY['incoming'::character varying, 'outgoing'::character varying])::"text"[]))),
    CONSTRAINT "external_referrals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['Pending'::character varying, 'Accepted'::character varying, 'InProgress'::character varying, 'Completed'::character varying, 'Rejected'::character varying, 'Cancelled'::character varying])::"text"[]))),
    CONSTRAINT "external_referrals_urgency_check" CHECK ((("urgency")::"text" = ANY ((ARRAY['Routine'::character varying, 'Urgent'::character varying, 'Emergency'::character varying])::"text"[])))
);


ALTER TABLE "public"."external_referrals" OWNER TO "postgres";


COMMENT ON TABLE "public"."external_referrals" IS 'Track referrals to/from external healthcare facilities';



CREATE TABLE IF NOT EXISTS "public"."eye_exams" (
    "exam_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "facility_id" "uuid",
    "chief_complaint" "text",
    "complaint_duration" character varying(100),
    "affected_eye" "public"."affected_eye",
    "ocular_history" "text",
    "ocular_surgery_history" "text",
    "systemic_history" "text",
    "family_history" "text",
    "drug_allergy" "text",
    "current_medications" "text",
    "glasses_history" "text",
    "contact_lens_history" "text",
    "va_right_unaided" character varying(20),
    "va_left_unaided" character varying(20),
    "va_right_aided" character varying(20),
    "va_left_aided" character varying(20),
    "va_right_pinhole" character varying(20),
    "va_left_pinhole" character varying(20),
    "va_right_near" character varying(20),
    "va_left_near" character varying(20),
    "ar_right_sphere" numeric(5,2),
    "ar_right_cylinder" numeric(5,2),
    "ar_right_axis" integer,
    "ar_left_sphere" numeric(5,2),
    "ar_left_cylinder" numeric(5,2),
    "ar_left_axis" integer,
    "rx_right_sphere" numeric(5,2),
    "rx_right_cylinder" numeric(5,2),
    "rx_right_axis" integer,
    "rx_right_add" numeric(5,2),
    "rx_right_prism" character varying(50),
    "rx_left_sphere" numeric(5,2),
    "rx_left_cylinder" numeric(5,2),
    "rx_left_axis" integer,
    "rx_left_add" numeric(5,2),
    "rx_left_prism" character varying(50),
    "rx_pd" integer,
    "rx_pd_right" integer,
    "rx_pd_left" integer,
    "bcva_right" character varying(20),
    "bcva_left" character varying(20),
    "iop_right" numeric(4,1),
    "iop_left" numeric(4,1),
    "iop_method" "public"."iop_method",
    "iop_time" time without time zone,
    "ccт_right" integer,
    "cct_left" integer,
    "pupil_right_size" integer,
    "pupil_left_size" integer,
    "pupil_right_reaction" character varying(50),
    "pupil_left_reaction" character varying(50),
    "cover_test" "text",
    "ocular_motility" "text",
    "convergence" "text",
    "npc" character varying(50),
    "anterior_right_lids" "text",
    "anterior_right_lacrimal" "text",
    "anterior_right_conjunctiva" "text",
    "anterior_right_sclera" "text",
    "anterior_right_cornea" "text",
    "anterior_right_ac" "text",
    "anterior_right_ac_depth" character varying(20),
    "anterior_right_iris" "text",
    "anterior_right_pupil" "text",
    "anterior_right_lens" "text",
    "anterior_right_lens_status" character varying(50),
    "anterior_left_lids" "text",
    "anterior_left_lacrimal" "text",
    "anterior_left_conjunctiva" "text",
    "anterior_left_sclera" "text",
    "anterior_left_cornea" "text",
    "anterior_left_ac" "text",
    "anterior_left_ac_depth" character varying(20),
    "anterior_left_iris" "text",
    "anterior_left_pupil" "text",
    "anterior_left_lens" "text",
    "anterior_left_lens_status" character varying(50),
    "gonioscopy_right" "text",
    "gonioscopy_left" "text",
    "angle_right" character varying(20),
    "angle_left" character varying(20),
    "dilation_performed" boolean DEFAULT false,
    "dilation_agent" character varying(100),
    "posterior_right_media" "text",
    "posterior_right_disc" "text",
    "posterior_right_disc_color" character varying(50),
    "posterior_right_cdr" numeric(3,2),
    "posterior_right_rim" "text",
    "posterior_right_macula" "text",
    "posterior_right_foveal_reflex" character varying(20),
    "posterior_right_vessels" "text",
    "posterior_right_av_ratio" character varying(20),
    "posterior_right_periphery" "text",
    "posterior_left_media" "text",
    "posterior_left_disc" "text",
    "posterior_left_disc_color" character varying(50),
    "posterior_left_cdr" numeric(3,2),
    "posterior_left_rim" "text",
    "posterior_left_macula" "text",
    "posterior_left_foveal_reflex" character varying(20),
    "posterior_left_vessels" "text",
    "posterior_left_av_ratio" character varying(20),
    "posterior_left_periphery" "text",
    "color_vision" character varying(100),
    "color_vision_method" character varying(50),
    "contrast_sensitivity" "text",
    "amsler_grid" "text",
    "schirmer_test_right" integer,
    "schirmer_test_left" integer,
    "visual_field_notes" "text",
    "provisional_diagnosis" "text",
    "final_diagnosis" "text",
    "icd_codes" "text"[],
    "treatment_plan" "text",
    "glasses_prescribed" boolean DEFAULT false,
    "contact_lens_prescribed" boolean DEFAULT false,
    "medications_prescribed" boolean DEFAULT false,
    "surgery_recommended" boolean DEFAULT false,
    "surgery_type" character varying(100),
    "referral_needed" boolean DEFAULT false,
    "referral_to" character varying(100),
    "referral_reason" "text",
    "follow_up_interval" character varying(50),
    "follow_up_date" "date",
    "follow_up_notes" "text",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "finalized_at" timestamp with time zone,
    "finalized_by" "uuid",
    CONSTRAINT "eye_exam_finalized_check" CHECK ((("finalized_at" IS NULL) OR ("finalized_by" IS NOT NULL))),
    CONSTRAINT "eye_exams_ar_left_axis_check" CHECK ((("ar_left_axis" >= 0) AND ("ar_left_axis" <= 180))),
    CONSTRAINT "eye_exams_ar_right_axis_check" CHECK ((("ar_right_axis" >= 0) AND ("ar_right_axis" <= 180))),
    CONSTRAINT "eye_exams_iop_left_check" CHECK ((("iop_left" >= (0)::numeric) AND ("iop_left" <= (80)::numeric))),
    CONSTRAINT "eye_exams_iop_right_check" CHECK ((("iop_right" >= (0)::numeric) AND ("iop_right" <= (80)::numeric))),
    CONSTRAINT "eye_exams_posterior_left_cdr_check" CHECK ((("posterior_left_cdr" >= (0)::numeric) AND ("posterior_left_cdr" <= (1)::numeric))),
    CONSTRAINT "eye_exams_posterior_right_cdr_check" CHECK ((("posterior_right_cdr" >= (0)::numeric) AND ("posterior_right_cdr" <= (1)::numeric))),
    CONSTRAINT "eye_exams_rx_left_axis_check" CHECK ((("rx_left_axis" >= 0) AND ("rx_left_axis" <= 180))),
    CONSTRAINT "eye_exams_rx_right_axis_check" CHECK ((("rx_right_axis" >= 0) AND ("rx_right_axis" <= 180)))
);


ALTER TABLE "public"."eye_exams" OWNER TO "postgres";


COMMENT ON TABLE "public"."eye_exams" IS 'Comprehensive eye examination record';



CREATE TABLE IF NOT EXISTS "public"."eye_prescriptions" (
    "prescription_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "exam_id" "uuid",
    "facility_id" "uuid",
    "prescription_type" character varying(50) NOT NULL,
    "right_sphere" numeric(5,2),
    "right_cylinder" numeric(5,2),
    "right_axis" integer,
    "right_add" numeric(5,2),
    "right_prism" character varying(50),
    "right_base_curve" numeric(4,2),
    "right_diameter" numeric(4,2),
    "left_sphere" numeric(5,2),
    "left_cylinder" numeric(5,2),
    "left_axis" integer,
    "left_add" numeric(5,2),
    "left_prism" character varying(50),
    "left_base_curve" numeric(4,2),
    "left_diameter" numeric(4,2),
    "pd" integer,
    "pd_right" integer,
    "pd_left" integer,
    "lens_type" "public"."lens_type",
    "lens_material" character varying(100),
    "lens_coating" "text"[],
    "tint" character varying(50),
    "frame_recommendation" "text",
    "contact_lens_brand" character varying(100),
    "contact_lens_type" character varying(50),
    "wearing_schedule" "text",
    "care_instructions" "text",
    "medication_name" character varying(255),
    "generic_name" character varying(255),
    "concentration" character varying(50),
    "dosage" character varying(100),
    "frequency" character varying(100),
    "duration" character varying(100),
    "affected_eye" "public"."affected_eye",
    "special_instructions" "text",
    "quantity" integer,
    "refills_allowed" integer DEFAULT 0,
    "prescribed_by" "uuid",
    "prescribed_at" timestamp with time zone DEFAULT "now"(),
    "valid_until" "date",
    "status" character varying(50) DEFAULT 'Active'::character varying,
    "dispensed_at" timestamp with time zone,
    "dispensed_by" "uuid",
    CONSTRAINT "eye_prescriptions_left_axis_check" CHECK ((("left_axis" >= 0) AND ("left_axis" <= 180))),
    CONSTRAINT "eye_prescriptions_right_axis_check" CHECK ((("right_axis" >= 0) AND ("right_axis" <= 180)))
);


ALTER TABLE "public"."eye_prescriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."eye_prescriptions" IS 'Glasses, contact lens, and eye medication prescriptions';



CREATE TABLE IF NOT EXISTS "public"."eye_procedures" (
    "procedure_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "exam_id" "uuid",
    "facility_id" "uuid",
    "procedure_type" character varying(100) NOT NULL,
    "procedure_category" character varying(50),
    "affected_eye" "public"."affected_eye",
    "procedure_notes" "text",
    "findings" "text",
    "interpretation" "text",
    "machine_used" character varying(100),
    "parameters" "text",
    "images_attached" boolean DEFAULT false,
    "anesthesia_used" character varying(100),
    "materials_used" "text",
    "complications" "text",
    "fee" numeric(10,2),
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "performed_by" "uuid",
    "performed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."eye_procedures" OWNER TO "postgres";


COMMENT ON TABLE "public"."eye_procedures" IS 'Eye procedures and diagnostic tests';



CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(200) NOT NULL,
    "facility_type" character varying(50) DEFAULT 'hospital'::character varying NOT NULL,
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "country" character varying(100) DEFAULT 'Ghana'::character varying,
    "postal_code" character varying(20),
    "phone" character varying(50),
    "email" character varying(255),
    "website" character varying(255),
    "license_number" character varying(100),
    "nhis_provider_id" character varying(100),
    "tax_id" character varying(100),
    "bed_capacity" integer DEFAULT 0,
    "operating_hours" character varying(200),
    "emergency_available" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "facilities_facility_type_check" CHECK ((("facility_type")::"text" = ANY ((ARRAY['hospital'::character varying, 'clinic'::character varying, 'laboratory'::character varying, 'pharmacy'::character varying, 'diagnostic_center'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."facilities" IS 'Hospital and clinic facilities for multi-facility support';



CREATE TABLE IF NOT EXISTS "public"."imaging_catalogue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "modality" "public"."imaging_type" NOT NULL,
    "body_part" character varying(100),
    "price" numeric(10,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nhis_code" character varying(50),
    "nhis_price" numeric(10,2),
    "is_nhis_covered" boolean DEFAULT true,
    "nhis_percentage" integer DEFAULT 0,
    "description" "text",
    "updated_by" "uuid",
    CONSTRAINT "imaging_catalogue_nhis_percentage_check" CHECK ((("nhis_percentage" >= 0) AND ("nhis_percentage" <= 100)))
);


ALTER TABLE "public"."imaging_catalogue" OWNER TO "postgres";


COMMENT ON COLUMN "public"."imaging_catalogue"."nhis_code" IS 'NHIS tariff code for this imaging exam';



COMMENT ON COLUMN "public"."imaging_catalogue"."nhis_price" IS 'NHIS approved price for this exam (what NHIS pays)';



COMMENT ON COLUMN "public"."imaging_catalogue"."is_nhis_covered" IS 'Whether this exam is covered under NHIS';



COMMENT ON COLUMN "public"."imaging_catalogue"."nhis_percentage" IS 'Override percentage for NHIS coverage (0 = use default category rate)';



CREATE TABLE IF NOT EXISTS "public"."inventory_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "parent_category_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_code" character varying(50) NOT NULL,
    "item_name" character varying(100) NOT NULL,
    "description" "text",
    "category_id" "uuid",
    "quantity_in_stock" integer DEFAULT 0,
    "reorder_level" integer DEFAULT 10,
    "unit_of_measure" character varying(50),
    "unit_cost" numeric(10,2) DEFAULT 0,
    "selling_price" numeric(10,2) DEFAULT 0,
    "supplier" character varying(100),
    "batch_number" character varying(50),
    "expiry_date" "date",
    "is_active" boolean DEFAULT true,
    "is_consumable" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."inventory_items" REPLICA IDENTITY FULL;


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_stock_movements" (
    "movement_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_id" "uuid",
    "drug_id" "uuid",
    "batch_id" "uuid",
    "movement_type" character varying(20) NOT NULL,
    "quantity" integer NOT NULL,
    "reference_number" character varying(100),
    "encounter_id" "uuid",
    "patient_id" character varying(50),
    "dispense_id" "uuid",
    "reason" "text",
    "notes" "text",
    "performed_by" character varying(50),
    "approved_by" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "inventory_stock_movements_movement_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUSTMENT'::character varying, 'TRANSFER'::character varying, 'RETURN'::character varying, 'EXPIRED'::character varying, 'DAMAGED'::character varying])::"text"[])))
);


ALTER TABLE "public"."inventory_stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "item_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "category" character varying(50) DEFAULT 'Other'::character varying NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0.00,
    "discount_amount" numeric(10,2) DEFAULT 0.00,
    "total" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "reference_id" "uuid",
    "reference_type" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "invoice_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "consultation_id" "uuid",
    "subtotal" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "discount_total" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "tax_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_amount" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "amount_paid" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "status" character varying(50) DEFAULT 'Pending'::character varying,
    "due_date" "date",
    "notes" "text",
    "created_by" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid"
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_request_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "request_id" "uuid",
    "test_id" "uuid",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_request_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_requests" (
    "request_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "clinical_notes" "text",
    "priority" "public"."priority" DEFAULT 'Normal'::"public"."priority",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid",
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "rejection_reason" "text",
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "payment_verified_at" timestamp with time zone,
    "sample_collected_by" "uuid",
    "sample_collected_at" timestamp with time zone,
    "processing_started_at" timestamp with time zone,
    "result_entered_by" "uuid",
    "result_entered_at" timestamp with time zone,
    "result_viewed_by" "uuid",
    "result_viewed_at" timestamp with time zone,
    "is_critical" boolean DEFAULT false,
    "critical_notified_at" timestamp with time zone,
    "test_id" "uuid",
    "consultation_id" "uuid",
    "result" "jsonb",
    "result_notes" "text",
    "result_file_url" "text",
    "patient_id" character varying(50),
    "visit_id" character varying(50),
    "ordered_by" character varying(50),
    "processed_by" "uuid",
    "result_date" timestamp with time zone,
    "result_value" numeric(15,4),
    "result_unit" character varying(50),
    "result_status" character varying(50),
    "reference_range" character varying(100),
    "interpretation" "text",
    "methodology" character varying(255),
    "diagnosis" "text"[]
);

ALTER TABLE ONLY "public"."lab_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."lab_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lab_requests"."processed_by" IS 'Staff member who processed/ran the lab test';



COMMENT ON COLUMN "public"."lab_requests"."result_date" IS 'Date and time when the lab result was entered';



COMMENT ON COLUMN "public"."lab_requests"."result_value" IS 'Numeric result value for quantitative tests';



COMMENT ON COLUMN "public"."lab_requests"."result_unit" IS 'Unit of measurement for the result (e.g., mg/dL, mmol/L)';



COMMENT ON COLUMN "public"."lab_requests"."result_status" IS 'Result interpretation status: Normal, Abnormal, Critical';



COMMENT ON COLUMN "public"."lab_requests"."reference_range" IS 'Normal reference range for the test';



COMMENT ON COLUMN "public"."lab_requests"."interpretation" IS 'Clinical interpretation of the result';



COMMENT ON COLUMN "public"."lab_requests"."methodology" IS 'Method used to perform the test';



COMMENT ON COLUMN "public"."lab_requests"."diagnosis" IS 'Array of diagnosis/indication codes or text for why this lab test was ordered';



CREATE TABLE IF NOT EXISTS "public"."lab_results" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "request_id" "uuid",
    "test_id" "uuid",
    "patient_id" "uuid",
    "result_value" "text",
    "unit" character varying(50),
    "reference_range" character varying(100),
    "is_abnormal" boolean DEFAULT false,
    "is_critical" boolean DEFAULT false,
    "technician_id" "uuid",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_test_catalogue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "category" character varying(50),
    "specimen_type" character varying(50),
    "price" numeric(10,2) DEFAULT 0,
    "tat_minutes" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nhis_code" character varying(50),
    "nhis_price" numeric(10,2),
    "is_nhis_covered" boolean DEFAULT true,
    "nhis_percentage" integer DEFAULT 0,
    "description" "text",
    "updated_by" "uuid",
    CONSTRAINT "lab_test_catalogue_nhis_percentage_check" CHECK ((("nhis_percentage" >= 0) AND ("nhis_percentage" <= 100)))
);


ALTER TABLE "public"."lab_test_catalogue" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lab_test_catalogue"."nhis_code" IS 'NHIS tariff code for this lab test';



COMMENT ON COLUMN "public"."lab_test_catalogue"."nhis_price" IS 'NHIS approved price for this test (what NHIS pays)';



COMMENT ON COLUMN "public"."lab_test_catalogue"."is_nhis_covered" IS 'Whether this test is covered under NHIS';



COMMENT ON COLUMN "public"."lab_test_catalogue"."nhis_percentage" IS 'Override percentage for NHIS coverage (0 = use default category rate)';



CREATE TABLE IF NOT EXISTS "public"."medical_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid",
    "visit_id" "uuid",
    "report_type" "public"."report_type" NOT NULL,
    "report_title" character varying(255) NOT NULL,
    "report_content" "text",
    "valid_from" "date",
    "valid_to" "date",
    "status" "public"."report_status" DEFAULT 'Draft'::"public"."report_status",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "issued_at" timestamp with time zone,
    "document_url" "text",
    "document_number" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."medical_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."medication_administration" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "prescription_id" "uuid",
    "medication_name" character varying(255) NOT NULL,
    "dose" character varying(100),
    "route" character varying(50),
    "scheduled_time" timestamp with time zone,
    "administered_at" timestamp with time zone,
    "administered_by" "uuid",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "refusal_reason" "text",
    "hold_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medication_administration_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'given'::character varying, 'refused'::character varying, 'held'::character varying, 'missed'::character varying])::"text"[])))
);


ALTER TABLE "public"."medication_administration" OWNER TO "postgres";


COMMENT ON TABLE "public"."medication_administration" IS 'Medication administration records (MAR)';



CREATE TABLE IF NOT EXISTS "public"."nhis_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "payment_category" character varying(100) NOT NULL,
    "coverage_percentage" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "consultation_fully_covered" boolean DEFAULT false,
    CONSTRAINT "nhis_config_coverage_percentage_check" CHECK ((("coverage_percentage" >= 0) AND ("coverage_percentage" <= 100)))
);


ALTER TABLE "public"."nhis_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."nhis_config" IS 'Configuration table for NHIS coverage rates by payment category - admin editable';



COMMENT ON COLUMN "public"."nhis_config"."consultation_fully_covered" IS 'If TRUE, consultation is 100% free regardless of general coverage_percentage';



CREATE TABLE IF NOT EXISTS "public"."nhis_hmos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nhis_hmos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nhis_medicines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "dosage_form" "text",
    "strengths" "text",
    "presentation" "text",
    "price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nhis_medicines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nhis_procedures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text"
);


ALTER TABLE "public"."nhis_procedures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "public"."notification_type" NOT NULL,
    "enabled" boolean DEFAULT true,
    "show_popup" boolean DEFAULT true,
    "play_sound" boolean DEFAULT false,
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "department_id" "uuid",
    "type" "public"."notification_type" NOT NULL,
    "priority" "public"."notification_priority" DEFAULT 'Normal'::"public"."notification_priority",
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "entity_type" character varying(50),
    "entity_id" "uuid",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notification_subtype" character varying(50),
    "target_user_id" "uuid",
    "target_role" character varying(50),
    "target_department" character varying(100),
    "encounter_id" "uuid",
    "patient_id" character varying(50),
    "reference_type" character varying(50),
    "reference_id" "uuid",
    "action_url" character varying(500),
    "action_label" character varying(100),
    "is_dismissed" boolean DEFAULT false,
    "dismissed_at" timestamp with time zone,
    "created_by" "uuid",
    "expires_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Clinical and workflow notifications for staff';



COMMENT ON COLUMN "public"."notifications"."target_user_id" IS 'Specific user to notify (if null, uses role/department targeting)';



COMMENT ON COLUMN "public"."notifications"."target_role" IS 'Target all users with this role';



COMMENT ON COLUMN "public"."notifications"."reference_type" IS 'Type of related entity (treatment_plan, lab_request, etc.)';



COMMENT ON COLUMN "public"."notifications"."reference_id" IS 'ID of the related entity';



CREATE TABLE IF NOT EXISTS "public"."nursing_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "user_id" "uuid",
    "user_role" character varying(50),
    "action" character varying(100) NOT NULL,
    "table_name" character varying(100),
    "record_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "was_successful" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nursing_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."nursing_audit_log" IS 'Audit trail for all nursing module actions';



CREATE TABLE IF NOT EXISTS "public"."nursing_notes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "treatment_plan_id" "uuid",
    "treatment_task_id" "uuid",
    "note_type" character varying(30) DEFAULT 'Progress_Note'::character varying NOT NULL,
    "title" character varying(255),
    "content" "text" NOT NULL,
    "patient_condition" character varying(30),
    "pain_level" integer,
    "interventions_performed" "text",
    "patient_response" "text",
    "follow_up_required" boolean DEFAULT false,
    "follow_up_notes" "text",
    "recorded_by" "uuid" NOT NULL,
    "shift" character varying(20),
    "is_critical" boolean DEFAULT false,
    "requires_doctor_review" boolean DEFAULT false,
    "doctor_reviewed_by" "uuid",
    "doctor_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "shift_date" "date",
    "is_handover_note" boolean DEFAULT false,
    CONSTRAINT "nursing_notes_pain_level_check" CHECK ((("pain_level" >= 0) AND ("pain_level" <= 10)))
);


ALTER TABLE "public"."nursing_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."nursing_notes" IS 'Nursing observations, progress notes, and reports for patient encounters';



COMMENT ON COLUMN "public"."nursing_notes"."note_type" IS 'Type of nursing note: Progress_Note, Observation, Incident, Handoff, Assessment, etc.';



COMMENT ON COLUMN "public"."nursing_notes"."patient_condition" IS 'Current patient condition assessment: Stable, Improving, Deteriorating, Critical, Unchanged';



COMMENT ON COLUMN "public"."nursing_notes"."shift" IS 'The shift during which this note was created';



COMMENT ON COLUMN "public"."nursing_notes"."is_critical" IS 'Flag for critical observations that need immediate attention';



COMMENT ON COLUMN "public"."nursing_notes"."requires_doctor_review" IS 'Flag indicating this note needs doctor review';



COMMENT ON COLUMN "public"."nursing_notes"."shift_date" IS 'The calendar date of the shift (handles overnight)';



COMMENT ON COLUMN "public"."nursing_notes"."is_handover_note" IS 'Flag for notes specifically created for handover';



CREATE TABLE IF NOT EXISTS "public"."on_call_schedule" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "department" character varying(100) NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."on_call_schedule" OWNER TO "postgres";


COMMENT ON TABLE "public"."on_call_schedule" IS 'On-call schedule for automatic temporary access grants with overlap prevention';



CREATE OR REPLACE VIEW "public"."opd_classification_stats" AS
 SELECT "date"("v"."created_at") AS "visit_date",
    "v"."opd_classification",
    "d"."opd_type" AS "department_type",
    "count"(*) AS "visit_count",
    "count"(DISTINCT "v"."patient_id") AS "unique_patients"
   FROM (("public"."visits" "v"
     LEFT JOIN "public"."clinics" "c" ON (("v"."clinic_id" = "c"."id")))
     LEFT JOIN "public"."departments" "d" ON (("c"."department_id" = "d"."id")))
  WHERE ("v"."opd_classification" IS NOT NULL)
  GROUP BY ("date"("v"."created_at")), "v"."opd_classification", "d"."opd_type"
  ORDER BY ("date"("v"."created_at")) DESC;


ALTER VIEW "public"."opd_classification_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."opd_classification_stats" IS 'OPD classification (MOPD/SOPD) statistics';



CREATE OR REPLACE VIEW "public"."patient_admission_status_view" AS
 SELECT "p"."id" AS "patient_id",
    "p"."emr_number",
    "p"."first_name",
    "p"."surname" AS "last_name",
    "curr_adm"."id" AS "current_admission_id",
    "curr_adm"."admission_number" AS "current_admission_number",
    "curr_adm"."admission_status" AS "current_status",
    "curr_adm"."admission_date" AS "current_admission_date",
    "curr_ward"."name" AS "current_ward",
    "curr_bed"."bed_number" AS "current_bed",
    "curr_adm"."acuity_level" AS "current_acuity",
    "curr_adm"."attending_physician_id",
    ((("attending"."first_name")::"text" || ' '::"text") || ("attending"."last_name")::"text") AS "attending_physician_name",
    ( SELECT "count"(*) AS "count"
           FROM "public"."admissions" "a"
          WHERE ("a"."patient_id" = "p"."id")) AS "total_admissions",
    ( SELECT "count"(*) AS "count"
           FROM "public"."admissions" "a"
          WHERE (("a"."patient_id" = "p"."id") AND (("a"."admission_status")::"text" = 'discharged'::"text"))) AS "total_discharges",
    ( SELECT "max"("a"."admission_date") AS "max"
           FROM "public"."admissions" "a"
          WHERE (("a"."patient_id" = "p"."id") AND (("a"."admission_status")::"text" = 'discharged'::"text"))) AS "last_discharge_date",
        CASE
            WHEN ("curr_adm"."id" IS NOT NULL) THEN true
            ELSE false
        END AS "is_currently_admitted"
   FROM (((("public"."patients" "p"
     LEFT JOIN "public"."admissions" "curr_adm" ON ((("curr_adm"."patient_id" = "p"."id") AND (("curr_adm"."admission_status")::"text" <> ALL ((ARRAY['discharged'::character varying, 'deceased'::character varying])::"text"[])))))
     LEFT JOIN "public"."wards" "curr_ward" ON (("curr_ward"."id" = "curr_adm"."current_ward_id")))
     LEFT JOIN "public"."beds" "curr_bed" ON (("curr_bed"."id" = "curr_adm"."current_bed_id")))
     LEFT JOIN "public"."staff" "attending" ON (("attending"."id" = "curr_adm"."attending_physician_id")));


ALTER VIEW "public"."patient_admission_status_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_chief_complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "emr_number" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "complaint_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "duration_value" integer NOT NULL,
    "duration_unit" "public"."duration_unit" DEFAULT 'Days'::"public"."duration_unit" NOT NULL,
    "notes" "text",
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "patient_chief_complaints_duration_value_check" CHECK (("duration_value" > 0))
);


ALTER TABLE "public"."patient_chief_complaints" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_chief_complaints" IS 'Patient chief complaints linked to encounters following encounter-centric architecture';



CREATE TABLE IF NOT EXISTS "public"."patient_vital_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "acuity_level" "public"."patient_acuity" DEFAULT 'medium'::"public"."patient_acuity" NOT NULL,
    "custom_frequency_minutes" integer,
    "last_vitals_at" timestamp with time zone,
    "next_vitals_due" timestamp with time zone,
    "is_overdue" boolean DEFAULT false,
    "overdue_since" timestamp with time zone,
    "alert_sent" boolean DEFAULT false,
    "alert_sent_at" timestamp with time zone,
    "assigned_nurse_id" "uuid",
    "is_active" boolean DEFAULT true,
    "paused" boolean DEFAULT false,
    "pause_reason" "text",
    "paused_at" timestamp with time zone,
    "paused_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."patient_vital_schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_vital_schedules" IS 'Active vital sign schedules for admitted patients';



COMMENT ON COLUMN "public"."patient_vital_schedules"."acuity_level" IS 'Patient acuity determines monitoring frequency';



COMMENT ON COLUMN "public"."patient_vital_schedules"."custom_frequency_minutes" IS 'Override default frequency if needed';



COMMENT ON COLUMN "public"."patient_vital_schedules"."paused" IS 'Temporarily pause monitoring (e.g., during surgery)';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "payment_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "receipt_number" character varying(50) NOT NULL,
    "billing_order_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "transaction_reference" character varying(100),
    "payment_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "invoice_id" "uuid",
    "patient_id" character varying(50),
    "received_by" character varying(50),
    "notes" "text"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pending_clinical_requests" AS
 SELECT "cr"."id",
    "cr"."request_number",
    "cr"."request_type",
    "cr"."clinical_reason",
    "cr"."urgency",
    "cr"."status",
    "cr"."suggested_timeframe",
    "cr"."admission_type",
    "cr"."level_of_care",
    "cr"."procedure_name",
    "cr"."scheduled_date",
    "cr"."scheduled_time",
    "cr"."created_at",
    "cr"."notes",
    "cr"."patient_id",
    ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text") AS "patient_name",
    "p"."emr_number",
    "p"."gender",
    "p"."date_of_birth",
    "p"."contact_phone" AS "patient_phone",
    "cr"."requesting_doctor_id",
    ((("doc"."first_name")::"text" || ' '::"text") || ("doc"."last_name")::"text") AS "requesting_doctor_name",
    "cr"."requesting_department_id",
    "dept"."name" AS "requesting_department_name",
    "cr"."target_department_id",
    "target_dept"."name" AS "target_department_name",
    "cr"."target_ward_id",
    "target_ward"."name" AS "target_ward_name",
    "cr"."encounter_id",
    "v"."visit_id" AS "encounter_number"
   FROM (((((("public"."clinical_requests" "cr"
     JOIN "public"."patients" "p" ON (("cr"."patient_id" = "p"."id")))
     JOIN "public"."visits" "v" ON (("cr"."encounter_id" = "v"."id")))
     LEFT JOIN "public"."staff" "doc" ON (("cr"."requesting_doctor_id" = "doc"."id")))
     LEFT JOIN "public"."departments" "dept" ON (("cr"."requesting_department_id" = "dept"."id")))
     LEFT JOIN "public"."departments" "target_dept" ON (("cr"."target_department_id" = "target_dept"."id")))
     LEFT JOIN "public"."wards" "target_ward" ON (("cr"."target_ward_id" = "target_ward"."id")))
  WHERE ("cr"."status" = ANY (ARRAY['Pending'::"public"."clinical_request_status", 'Under_Review'::"public"."clinical_request_status"]))
  ORDER BY
        CASE "cr"."urgency"
            WHEN 'Emergency'::"public"."clinical_urgency" THEN 1
            WHEN 'Urgent'::"public"."clinical_urgency" THEN 2
            ELSE 3
        END, "cr"."created_at";


ALTER VIEW "public"."pending_clinical_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physio_assessments" (
    "assessment_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "consultation_id" "uuid",
    "facility_id" "uuid",
    "referral_source" character varying(100),
    "referral_doctor_id" "uuid",
    "referral_diagnosis" "text",
    "referral_date" "date",
    "referral_reason" "text",
    "chief_complaint" "text",
    "complaint_duration" character varying(100),
    "onset_type" "public"."onset_type",
    "onset_date" "date",
    "mechanism_of_injury" "text",
    "pain_location" "text",
    "pain_location_diagram" "text",
    "pain_score" integer,
    "pain_at_rest" integer,
    "pain_on_activity" integer,
    "pain_worst" integer,
    "pain_best" integer,
    "pain_character" character varying(100),
    "pain_radiation" "text",
    "aggravating_factors" "text",
    "relieving_factors" "text",
    "pain_pattern" character varying(50),
    "night_pain" boolean DEFAULT false,
    "medical_history" "text",
    "surgical_history" "text",
    "medications" "text",
    "allergies" "text",
    "occupation" character varying(100),
    "hobbies" "text",
    "hand_dominance" character varying(20),
    "functional_status" "text",
    "adl_status" "text",
    "mobility_status" "public"."mobility_status",
    "gait_pattern" character varying(100),
    "gait_aids_used" "text"[],
    "balance_assessment" "text",
    "fall_history" "text",
    "posture_standing" "text",
    "posture_sitting" "text",
    "posture_deviations" "text",
    "rom_joint" character varying(100),
    "rom_notes" "text",
    "rom_flexion_active" integer,
    "rom_extension_active" integer,
    "rom_abduction_active" integer,
    "rom_adduction_active" integer,
    "rom_internal_rotation_active" integer,
    "rom_external_rotation_active" integer,
    "rom_flexion_passive" integer,
    "rom_extension_passive" integer,
    "rom_abduction_passive" integer,
    "rom_adduction_passive" integer,
    "rom_internal_rotation_passive" integer,
    "rom_external_rotation_passive" integer,
    "rom_end_feel" "text",
    "rom_pain_arc" "text",
    "muscle_groups_tested" "text"[],
    "muscle_strength_grades" "jsonb",
    "muscle_strength_notes" "text",
    "sensation_intact" boolean DEFAULT true,
    "sensation_notes" "text",
    "dermatome_affected" character varying(50),
    "myotome_affected" character varying(50),
    "reflexes_tested" "text"[],
    "reflexes_normal" boolean DEFAULT true,
    "reflex_notes" "text",
    "neural_tension_tests" "text",
    "special_tests_performed" "text"[],
    "special_tests_findings" "jsonb",
    "palpation_findings" "text",
    "trigger_points" "text",
    "tenderness_location" "text",
    "swelling_present" boolean DEFAULT false,
    "swelling_notes" "text",
    "previous_physio_treatment" boolean DEFAULT false,
    "previous_treatment_details" "text",
    "previous_treatment_response" "text",
    "physio_diagnosis" "text",
    "icd_codes" "text"[],
    "problem_list" "text"[],
    "short_term_goals" "text",
    "long_term_goals" "text",
    "patient_goals" "text",
    "expected_outcomes" "text",
    "estimated_sessions" integer,
    "estimated_duration_weeks" integer,
    "red_flags" "text"[],
    "red_flags_present" boolean DEFAULT false,
    "yellow_flags" "text"[],
    "precautions" "text",
    "contraindications" "text",
    "prognosis" character varying(50),
    "prognosis_notes" "text",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "finalized_at" timestamp with time zone,
    "finalized_by" "uuid",
    CONSTRAINT "physio_assessment_finalized_check" CHECK ((("finalized_at" IS NULL) OR ("finalized_by" IS NOT NULL))),
    CONSTRAINT "physio_assessments_pain_at_rest_check" CHECK ((("pain_at_rest" >= 0) AND ("pain_at_rest" <= 10))),
    CONSTRAINT "physio_assessments_pain_best_check" CHECK ((("pain_best" >= 0) AND ("pain_best" <= 10))),
    CONSTRAINT "physio_assessments_pain_on_activity_check" CHECK ((("pain_on_activity" >= 0) AND ("pain_on_activity" <= 10))),
    CONSTRAINT "physio_assessments_pain_score_check" CHECK ((("pain_score" >= 0) AND ("pain_score" <= 10))),
    CONSTRAINT "physio_assessments_pain_worst_check" CHECK ((("pain_worst" >= 0) AND ("pain_worst" <= 10)))
);


ALTER TABLE "public"."physio_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."physio_assessments" IS 'Initial physiotherapy assessment/evaluation';



CREATE TABLE IF NOT EXISTS "public"."physio_discharge" (
    "discharge_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "patient_id" character varying(50) NOT NULL,
    "facility_id" "uuid",
    "discharge_date" "date" NOT NULL,
    "discharge_reason" character varying(100),
    "initial_diagnosis" "text",
    "initial_presentation" "text",
    "total_sessions_attended" integer,
    "total_sessions_missed" integer,
    "duration_of_care" character varying(50),
    "initial_pain" integer,
    "final_pain" integer,
    "pain_improvement_percent" integer,
    "initial_rom" "jsonb",
    "final_rom" "jsonb",
    "initial_strength" "jsonb",
    "final_strength" "jsonb",
    "initial_functional_status" "text",
    "final_functional_status" "text",
    "goals_summary" "jsonb",
    "discharge_instructions" "text",
    "home_exercise_program" "text",
    "activity_guidelines" "text",
    "precautions" "text",
    "follow_up_recommended" boolean DEFAULT false,
    "follow_up_interval" character varying(50),
    "return_criteria" "text",
    "referred_to" "text",
    "referral_reason" "text",
    "patient_satisfaction" integer,
    "patient_feedback" "text",
    "discharged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "physio_discharge_patient_satisfaction_check" CHECK ((("patient_satisfaction" >= 1) AND ("patient_satisfaction" <= 5)))
);


ALTER TABLE "public"."physio_discharge" OWNER TO "postgres";


COMMENT ON TABLE "public"."physio_discharge" IS 'Discharge summary with outcomes';



CREATE TABLE IF NOT EXISTS "public"."physio_plans" (
    "plan_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "facility_id" "uuid",
    "treatment_approach" "text",
    "manual_therapy" boolean DEFAULT false,
    "manual_therapy_techniques" "text"[],
    "manual_therapy_parameters" "text",
    "therapeutic_exercise" boolean DEFAULT false,
    "exercises_prescribed" "text",
    "exercise_parameters" "text",
    "home_exercises" "text",
    "exercise_progression_criteria" "text",
    "electrotherapy" boolean DEFAULT false,
    "electro_modalities" "text"[],
    "electro_parameters" "jsonb",
    "heat_therapy" boolean DEFAULT false,
    "heat_type" character varying(50),
    "cold_therapy" boolean DEFAULT false,
    "cold_type" character varying(50),
    "hydrotherapy" boolean DEFAULT false,
    "hydro_type" character varying(50),
    "traction" boolean DEFAULT false,
    "traction_type" character varying(50),
    "traction_parameters" "text",
    "other_modalities" "text"[],
    "other_modality_details" "text",
    "assistive_devices" "text"[],
    "assistive_device_instructions" "text",
    "frequency" character varying(50),
    "session_duration_minutes" integer,
    "total_sessions_planned" integer,
    "patient_education" "text",
    "activity_modifications" "text",
    "ergonomic_advice" "text",
    "treatment_precautions" "text",
    "monitoring_parameters" "text",
    "re_eval_interval" character varying(50),
    "status" "public"."physio_plan_status" DEFAULT 'Active'::"public"."physio_plan_status",
    "status_reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone
);


ALTER TABLE "public"."physio_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."physio_plans" IS 'Physiotherapy treatment plan with modalities';



CREATE TABLE IF NOT EXISTS "public"."physio_progress" (
    "progress_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "plan_id" "uuid",
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid",
    "facility_id" "uuid",
    "evaluation_date" "date" NOT NULL,
    "evaluation_type" "public"."evaluation_type" NOT NULL,
    "session_number_at_eval" integer,
    "pain_score" integer,
    "pain_change" integer,
    "rom_data" "jsonb",
    "rom_improvement_percent" integer,
    "strength_data" "jsonb",
    "functional_score" integer,
    "outcome_measure_used" character varying(100),
    "outcome_score" integer,
    "goals_achieved" "text"[],
    "goals_in_progress" "text"[],
    "goals_not_achieved" "text"[],
    "progress_summary" "text",
    "clinical_reasoning" "text",
    "complications" "text",
    "barriers_to_progress" "text",
    "plan_modified" boolean DEFAULT false,
    "modifications_made" "text",
    "new_goals" "text",
    "continue_therapy" boolean,
    "sessions_remaining" integer,
    "modify_plan" boolean,
    "ready_for_discharge" boolean DEFAULT false,
    "discharge_recommendations" "text",
    "home_program_final" "text",
    "follow_up_needed" boolean DEFAULT false,
    "follow_up_interval" character varying(50),
    "physician_updated" boolean DEFAULT false,
    "update_summary" "text",
    "evaluated_by" "uuid",
    "reviewed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "physio_progress_pain_score_check" CHECK ((("pain_score" >= 0) AND ("pain_score" <= 10)))
);


ALTER TABLE "public"."physio_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."physio_progress" IS 'Periodic progress evaluation and outcome tracking';



CREATE TABLE IF NOT EXISTS "public"."physio_sessions" (
    "session_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "patient_id" character varying(50) NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "facility_id" "uuid",
    "session_number" integer NOT NULL,
    "session_date" timestamp with time zone DEFAULT "now"(),
    "pain_score_before" integer,
    "subjective_report" "text",
    "interval_history" "text",
    "objective_findings" "text",
    "rom_changes" "text",
    "strength_changes" "text",
    "functional_changes" "text",
    "treatment_provided" "text" NOT NULL,
    "modalities_used" "text"[],
    "modality_parameters" "jsonb",
    "exercises_performed" "text",
    "exercise_sets_reps" "text",
    "manual_techniques_used" "text",
    "patient_response" "text",
    "pain_score_after" integer,
    "tolerance" character varying(50),
    "adverse_reactions" "text",
    "progress_notes" "text",
    "goals_addressed" "text"[],
    "next_session_plan" "text",
    "home_program_modified" boolean DEFAULT false,
    "home_program_changes" "text",
    "attendance_status" "public"."attendance_status" DEFAULT 'Attended'::"public"."attendance_status",
    "missed_reason" "text",
    "make_up_scheduled" boolean DEFAULT false,
    "duration_minutes" integer,
    "treated_by" "uuid",
    "supervised_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "compliance_level" character varying(50),
    "plan_modifications" "text",
    "next_session_focus" "text",
    "outcome_measure_used" character varying(100),
    "outcome_measure_score" numeric(10,2),
    "treated_at" timestamp with time zone,
    CONSTRAINT "physio_sessions_pain_score_after_check" CHECK ((("pain_score_after" >= 0) AND ("pain_score_after" <= 10))),
    CONSTRAINT "physio_sessions_pain_score_before_check" CHECK ((("pain_score_before" >= 0) AND ("pain_score_before" <= 10)))
);


ALTER TABLE "public"."physio_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."physio_sessions" IS 'Per-visit session documentation (SOAP format)';



COMMENT ON COLUMN "public"."physio_sessions"."compliance_level" IS 'Patient compliance level (Good, Fair, Poor)';



COMMENT ON COLUMN "public"."physio_sessions"."plan_modifications" IS 'Any modifications made to the treatment plan during this session';



COMMENT ON COLUMN "public"."physio_sessions"."next_session_focus" IS 'Focus areas for the next session';



COMMENT ON COLUMN "public"."physio_sessions"."outcome_measure_used" IS 'Outcome measure instrument used (ODI, NDI, DASH, KOOS, WOMAC)';



COMMENT ON COLUMN "public"."physio_sessions"."outcome_measure_score" IS 'Score from the outcome measure assessment';



COMMENT ON COLUMN "public"."physio_sessions"."treated_at" IS 'Timestamp when treatment was actually provided';



CREATE TABLE IF NOT EXISTS "public"."prescription_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "prescription_id" "uuid",
    "drug_id" "uuid",
    "dosage" character varying(100),
    "frequency" character varying(50),
    "duration" character varying(50),
    "quantity" integer NOT NULL,
    "status" "public"."dispense_status" DEFAULT 'Pending'::"public"."dispense_status",
    "price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."prescription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescriptions" (
    "prescription_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "notes" "text",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "verification_notes" "text",
    "payment_verified_at" timestamp with time zone,
    "dispensed_by" "uuid",
    "dispensed_at" timestamp with time zone,
    "partial_dispense_reason" "text",
    "backorder_items" "jsonb" DEFAULT '[]'::"jsonb",
    "drug_interaction_checked" boolean DEFAULT false,
    "allergy_checked" boolean DEFAULT false,
    "consultation_id" "uuid",
    "drug_id" "uuid",
    "dosage" character varying(100),
    "frequency" character varying(50),
    "duration" character varying(50),
    "route" character varying(50),
    "quantity_prescribed" integer,
    "quantity_dispensed" integer DEFAULT 0,
    "instructions" "text",
    "patient_id" character varying(50),
    "visit_id" character varying(50),
    "doctor_id" character varying(50),
    "dispensed_date" timestamp with time zone,
    "drug_name" character varying(255),
    "diagnosis" "text"[],
    "clinical_notes" "text"
);

ALTER TABLE ONLY "public"."prescriptions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."prescriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."prescriptions"."diagnosis" IS 'Array of diagnosis/indication codes or text for why this medication was prescribed';



COMMENT ON COLUMN "public"."prescriptions"."clinical_notes" IS 'Clinical notes/indication explaining why this medication was prescribed';



CREATE TABLE IF NOT EXISTS "public"."price_list" (
    "price_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_code" character varying(50) NOT NULL,
    "item_name" character varying(255) NOT NULL,
    "category" character varying(50) NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."price_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedure_catalogue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid",
    "code" character varying(50) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "category" character varying(100) NOT NULL,
    "subcategory" character varying(100),
    "cpt_code" character varying(20),
    "icd10_pcs_code" character varying(20),
    "body_system" character varying(100),
    "requires_anesthesia" boolean DEFAULT false,
    "anesthesia_type" character varying(50),
    "typical_duration_minutes" integer,
    "recovery_time_hours" integer,
    "requires_consent" boolean DEFAULT true,
    "requires_fasting" boolean DEFAULT false,
    "fasting_hours" integer,
    "requires_sedation" boolean DEFAULT false,
    "requires_admission" boolean DEFAULT false,
    "pre_procedure_instructions" "text",
    "post_procedure_instructions" "text",
    "required_equipment" "jsonb" DEFAULT '[]'::"jsonb",
    "required_supplies" "jsonb" DEFAULT '[]'::"jsonb",
    "required_staff" "jsonb" DEFAULT '[]'::"jsonb",
    "typical_location" character varying(100),
    "base_price" numeric(12,2),
    "nhis_price" numeric(12,2),
    "professional_fee" numeric(12,2),
    "facility_fee" numeric(12,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "procedure_catalogue_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['surgical'::character varying, 'diagnostic'::character varying, 'therapeutic'::character varying, 'minor'::character varying, 'major'::character varying, 'endoscopy'::character varying, 'biopsy'::character varying, 'injection'::character varying, 'infusion'::character varying, 'wound_care'::character varying, 'cardiovascular'::character varying, 'orthopedic'::character varying, 'neurological'::character varying, 'obstetric'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."procedure_catalogue" OWNER TO "postgres";


COMMENT ON TABLE "public"."procedure_catalogue" IS 'Procedure catalogue seeded from NHIS procedures. IDs match nhis_procedures for referential integrity.';



CREATE TABLE IF NOT EXISTS "public"."procedure_consumables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "procedure_id" "uuid" NOT NULL,
    "item_id" "uuid",
    "item_name" character varying(200) NOT NULL,
    "item_code" character varying(50),
    "category" character varying(100),
    "quantity_used" numeric(10,3) NOT NULL,
    "unit" character varying(50) NOT NULL,
    "unit_cost" numeric(10,2),
    "total_cost" numeric(12,2),
    "billable" boolean DEFAULT true,
    "batch_number" character varying(100),
    "serial_number" character varying(100),
    "expiry_date" "date",
    "notes" "text",
    "recorded_by" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."procedure_consumables" OWNER TO "postgres";


COMMENT ON TABLE "public"."procedure_consumables" IS 'Items used during procedures';



CREATE TABLE IF NOT EXISTS "public"."procedure_requests" (
    "request_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_id" character varying(50),
    "patient_id" character varying(50),
    "consultation_id" "uuid",
    "encounter_id" "uuid",
    "procedure_id" "uuid",
    "ordered_by" character varying(50),
    "procedure_name" "text",
    "procedure_type" "text",
    "clinical_notes" "text",
    "priority" "text" DEFAULT 'Normal'::"text",
    "status" "text" DEFAULT 'Pending'::"text",
    "notes" "text",
    "performed_at" timestamp with time zone,
    "performed_by" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."procedure_requests" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."procedure_requests_view" AS
 SELECT "cr"."id",
    "cr"."request_number",
    "cr"."patient_id",
    "cr"."encounter_id",
    "cr"."requesting_doctor_id",
    "cr"."requesting_department_id",
    "cr"."request_type",
    "cr"."clinical_reason",
    "cr"."urgency",
    "cr"."suggested_timeframe",
    "cr"."notes",
    "cr"."target_department_id",
    "cr"."target_ward_id",
    "cr"."target_doctor_id",
    "cr"."admission_type",
    "cr"."suggested_ward_type",
    "cr"."level_of_care",
    "cr"."expected_duration",
    "cr"."special_requirements",
    "cr"."procedure_catalogue_id",
    "cr"."procedure_name",
    "cr"."procedure_notes",
    "cr"."pre_op_requirements",
    "cr"."follow_up_reason",
    "cr"."follow_up_instructions",
    "cr"."status",
    "cr"."reviewed_by",
    "cr"."reviewed_at",
    "cr"."review_notes",
    "cr"."approved_by",
    "cr"."approved_at",
    "cr"."rejection_reason",
    "cr"."admission_id",
    "cr"."procedure_id",
    "cr"."referral_id",
    "cr"."follow_up_visit_id",
    "cr"."scheduled_date",
    "cr"."scheduled_time",
    "cr"."scheduled_by",
    "cr"."scheduling_notes",
    "cr"."created_at",
    "cr"."updated_at",
    "cr"."created_by",
    "cr"."facility_id",
    ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text") AS "patient_name",
    "p"."emr_number",
    "p"."gender",
    "p"."date_of_birth",
    ((("doc"."first_name")::"text" || ' '::"text") || ("doc"."last_name")::"text") AS "requesting_doctor_name",
    "dept"."name" AS "requesting_department_name",
    "pc"."name" AS "catalogue_procedure_name",
    "pc"."code" AS "procedure_code",
    "pc"."category" AS "procedure_category"
   FROM (((("public"."clinical_requests" "cr"
     JOIN "public"."patients" "p" ON (("cr"."patient_id" = "p"."id")))
     LEFT JOIN "public"."staff" "doc" ON (("cr"."requesting_doctor_id" = "doc"."id")))
     LEFT JOIN "public"."departments" "dept" ON (("cr"."requesting_department_id" = "dept"."id")))
     LEFT JOIN "public"."procedure_catalogue" "pc" ON (("cr"."procedure_catalogue_id" = "pc"."id")))
  WHERE ("cr"."request_type" = ANY (ARRAY['Procedure'::"public"."clinical_request_type", 'Surgery'::"public"."clinical_request_type"]))
  ORDER BY
        CASE "cr"."urgency"
            WHEN 'Emergency'::"public"."clinical_urgency" THEN 1
            WHEN 'Urgent'::"public"."clinical_urgency" THEN 2
            ELSE 3
        END, "cr"."scheduled_date", "cr"."created_at";


ALTER VIEW "public"."procedure_requests_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "encounter_id" "uuid" NOT NULL,
    "admission_id" "uuid",
    "procedure_number" character varying(50) NOT NULL,
    "catalogue_id" "uuid",
    "procedure_name" character varying(200) NOT NULL,
    "procedure_code" character varying(50),
    "scheduled_date" timestamp with time zone,
    "scheduled_duration_minutes" integer,
    "priority" character varying(20) DEFAULT 'routine'::character varying NOT NULL,
    "status" character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    "actual_start_time" timestamp with time zone,
    "actual_end_time" timestamp with time zone,
    "actual_duration_minutes" integer,
    "location" character varying(100),
    "room_number" character varying(50),
    "indication" "text" NOT NULL,
    "pre_procedure_diagnosis" "text",
    "post_procedure_diagnosis" "text",
    "laterality" character varying(20),
    "body_site" "text",
    "anesthesia_type" character varying(50),
    "anesthesiologist_id" "uuid",
    "anesthesia_start_time" timestamp with time zone,
    "anesthesia_end_time" timestamp with time zone,
    "anesthesia_notes" "text",
    "primary_surgeon_id" "uuid",
    "assistant_surgeons" "jsonb" DEFAULT '[]'::"jsonb",
    "scrub_nurse_id" "uuid",
    "circulating_nurse_id" "uuid",
    "other_staff" "jsonb" DEFAULT '[]'::"jsonb",
    "consent_obtained" boolean DEFAULT false,
    "consent_date" timestamp with time zone,
    "consent_obtained_by" "uuid",
    "consent_document_id" "uuid",
    "consent_notes" "text",
    "pre_op_checklist" "jsonb" DEFAULT '{}'::"jsonb",
    "fasting_confirmed" boolean,
    "allergies_verified" boolean,
    "site_marked" boolean,
    "blood_products_available" boolean,
    "procedure_notes" "text",
    "findings" "text",
    "technique_description" "text",
    "complications" "text",
    "estimated_blood_loss_ml" integer,
    "specimens_collected" "jsonb" DEFAULT '[]'::"jsonb",
    "implants_used" "jsonb" DEFAULT '[]'::"jsonb",
    "post_op_instructions" "text",
    "recovery_location" character varying(100),
    "recovery_start_time" timestamp with time zone,
    "recovery_end_time" timestamp with time zone,
    "discharge_criteria_met" boolean,
    "post_op_diagnosis" "text",
    "billable" boolean DEFAULT true,
    "billed" boolean DEFAULT false,
    "billing_id" "uuid",
    "cancellation_reason" "text",
    "cancelled_by" "uuid",
    "cancelled_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "clinical_request_id" "uuid",
    CONSTRAINT "procedures_anesthesia_type_check" CHECK ((("anesthesia_type")::"text" = ANY ((ARRAY['none'::character varying, 'local'::character varying, 'regional'::character varying, 'sedation'::character varying, 'general'::character varying, 'spinal'::character varying, 'epidural'::character varying])::"text"[]))),
    CONSTRAINT "procedures_laterality_check" CHECK ((("laterality")::"text" = ANY ((ARRAY['left'::character varying, 'right'::character varying, 'bilateral'::character varying, 'na'::character varying])::"text"[]))),
    CONSTRAINT "procedures_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['emergency'::character varying, 'urgent'::character varying, 'routine'::character varying, 'elective'::character varying])::"text"[]))),
    CONSTRAINT "procedures_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'pre_op'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'postponed'::character varying, 'complications'::character varying])::"text"[])))
);


ALTER TABLE "public"."procedures" OWNER TO "postgres";


COMMENT ON TABLE "public"."procedures" IS 'Procedures performed on patients';



COMMENT ON COLUMN "public"."procedures"."priority" IS 'Urgency: emergency, urgent, routine, elective';



COMMENT ON COLUMN "public"."procedures"."status" IS 'Procedure status: scheduled, pre_op, in_progress, completed, cancelled, postponed, complications';



CREATE TABLE IF NOT EXISTS "public"."queue" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "visit_id" "uuid",
    "patient_id" "uuid",
    "department_id" "uuid",
    "clinic_id" "uuid",
    "ticket_number" character varying(50),
    "status" "public"."queue_status" DEFAULT 'Waiting'::"public"."queue_status",
    "priority" "public"."priority" DEFAULT 'Normal'::"public"."priority",
    "location" "public"."queue_location" NOT NULL,
    "assigned_to" "uuid",
    "called_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "wait_start_time" timestamp with time zone,
    "ready_time" timestamp with time zone,
    "consultation_start_time" timestamp with time zone,
    "consultation_end_time" timestamp with time zone,
    "skipped_count" integer DEFAULT 0,
    "skip_reason" "text",
    "encounter_id" "uuid"
);

ALTER TABLE ONLY "public"."queue" REPLICA IDENTITY FULL;


ALTER TABLE "public"."queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."radiology_request_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "request_id" "uuid",
    "imaging_id" "uuid",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "price" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."radiology_request_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."radiology_requests" (
    "request_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "clinical_history" "text",
    "priority" "public"."priority" DEFAULT 'Normal'::"public"."priority",
    "status" "public"."request_status" DEFAULT 'Pending'::"public"."request_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid",
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "rejection_reason" "text",
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "payment_verified_at" timestamp with time zone,
    "scheduled_time" timestamp with time zone,
    "scheduled_by" "uuid",
    "scan_completed_at" timestamp with time zone,
    "scan_completed_by" "uuid",
    "report_uploaded_at" timestamp with time zone,
    "report_uploaded_by" "uuid",
    "report_viewed_by" "uuid",
    "report_viewed_at" timestamp with time zone,
    "contrast_used" boolean DEFAULT false,
    "contrast_type" "text",
    "imaging_id" "uuid",
    "imaging_type" character varying(50),
    "consultation_id" "uuid",
    "body_part" "text",
    "clinical_indication" "text",
    "scheduled_date" timestamp with time zone,
    "performed_at" timestamp with time zone,
    "performed_by" character varying(50),
    "findings" "text",
    "impression" "text",
    "result_file_url" "text",
    "report" "text",
    "patient_id" character varying(50),
    "visit_id" character varying(50),
    "ordered_by" character varying(50),
    "diagnosis" "text"[]
);

ALTER TABLE ONLY "public"."radiology_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."radiology_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."radiology_requests"."diagnosis" IS 'Array of diagnosis/indication codes or text for why this imaging was ordered';



CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "receipt_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "receipt_number" character varying(50) NOT NULL,
    "billing_order_id" "uuid",
    "invoice_id" "uuid",
    "patient_id" character varying(50) NOT NULL,
    "visit_id" character varying(50),
    "amount_paid" numeric(12,2) NOT NULL,
    "payment_method" "public"."payment_method" NOT NULL,
    "reference_number" character varying(100),
    "issued_by" character varying(50),
    "issue_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid"
);

ALTER TABLE ONLY "public"."receipts" REPLICA IDENTITY FULL;


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_outcomes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "referral_id" "uuid",
    "external_referral_id" "uuid",
    "outcome_type" character varying(50) NOT NULL,
    "outcome_description" "text" NOT NULL,
    "follow_up_required" boolean DEFAULT false,
    "follow_up_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "chk_referral_id" CHECK ((("referral_id" IS NOT NULL) OR ("external_referral_id" IS NOT NULL))),
    CONSTRAINT "referral_outcomes_outcome_type_check" CHECK ((("outcome_type")::"text" = ANY ((ARRAY['diagnosis_confirmed'::character varying, 'diagnosis_changed'::character varying, 'treatment_initiated'::character varying, 'procedure_performed'::character varying, 'medication_changed'::character varying, 'admission_required'::character varying, 'follow_up_scheduled'::character varying, 'referred_further'::character varying, 'discharged'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."referral_outcomes" OWNER TO "postgres";


COMMENT ON TABLE "public"."referral_outcomes" IS 'Track outcomes and follow-up actions from referrals';



CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "referral_number" character varying(50) NOT NULL,
    "patient_id" "uuid",
    "visit_id" "uuid",
    "source_department_id" "uuid",
    "target_department_id" "uuid",
    "referring_physician_id" "uuid",
    "receiving_physician_id" "uuid",
    "referral_type" "public"."referral_type" NOT NULL,
    "priority" "public"."referral_priority" DEFAULT 'Routine'::"public"."referral_priority",
    "status" "public"."referral_module_status" DEFAULT 'Pending'::"public"."referral_module_status",
    "reason_for_referral" "text",
    "clinical_summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_referral_id" "uuid"
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "report_type" "public"."report_type" NOT NULL,
    "template_name" character varying(100) NOT NULL,
    "template_content" "text",
    "placeholders" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."report_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scan_results" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "request_id" "uuid",
    "imaging_id" "uuid",
    "patient_id" "uuid",
    "findings" "text",
    "impression" "text",
    "recommendation" "text",
    "radiologist_id" "uuid",
    "report_date" timestamp with time zone DEFAULT "now"(),
    "image_urls" "text"[],
    "dicom_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "encounter_id" "uuid"
);


ALTER TABLE "public"."scan_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_price_audit" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "service_type" character varying(50) NOT NULL,
    "service_id" "uuid" NOT NULL,
    "service_name" character varying(255),
    "field_changed" character varying(100) NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text"
);


ALTER TABLE "public"."service_price_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_price_audit" IS 'Audit trail for all service price changes';



CREATE TABLE IF NOT EXISTS "public"."shift_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shift_name" character varying(20) NOT NULL,
    "display_name" character varying(50) NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "color" character varying(20) DEFAULT '#6B7280'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shift_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."shift_configurations" IS 'Hospital shift definitions (Day/Evening/Night)';



CREATE TABLE IF NOT EXISTS "public"."shift_handover" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "from_nurse_id" "uuid",
    "to_nurse_id" "uuid",
    "shift_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "shift_type" character varying(20) NOT NULL,
    "patient_condition" "text",
    "key_observations" "text",
    "pending_tasks" "text",
    "special_instructions" "text",
    "medications_due" "text",
    "critical_alerts" "text",
    "handover_notes" "text",
    "acknowledged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shift_handover_shift_type_check" CHECK ((("shift_type")::"text" = ANY ((ARRAY['day'::character varying, 'evening'::character varying, 'night'::character varying])::"text"[])))
);


ALTER TABLE "public"."shift_handover" OWNER TO "postgres";


COMMENT ON TABLE "public"."shift_handover" IS 'Nursing shift handover documentation';



CREATE TABLE IF NOT EXISTS "public"."shift_handovers" (
    "handover_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "encounter_id" "uuid",
    "shift_date" "date",
    "outgoing_nurse_id" "uuid",
    "incoming_nurse_id" "uuid",
    "patient_status" "text",
    "key_observations" "text",
    "pending_tasks" "text",
    "medications_given" "text",
    "upcoming_medications" "text",
    "special_instructions" "text",
    "concerns" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "acknowledged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "patient_id" "uuid",
    "consciousness_level" character varying(50),
    "mobility_status" character varying(50),
    "isolation_precautions" "text",
    "fall_risk_level" character varying(20),
    "medication_due" "jsonb" DEFAULT '[]'::"jsonb",
    "investigations_pending" "jsonb" DEFAULT '[]'::"jsonb",
    "last_vitals" "jsonb",
    "vitals_trend" "text",
    "iv_access" "jsonb" DEFAULT '[]'::"jsonb",
    "drains_catheters" "jsonb" DEFAULT '[]'::"jsonb",
    "diet_type" character varying(100),
    "feeding_route" character varying(50),
    "last_meal_time" timestamp with time zone,
    "follow_up_actions" "text",
    "handover_date" "date" DEFAULT CURRENT_DATE,
    "outgoing_shift" character varying(20),
    "incoming_shift" character varying(20),
    "handover_time" timestamp with time zone DEFAULT "now"(),
    "is_acknowledged" boolean DEFAULT false
);


ALTER TABLE "public"."shift_handovers" OWNER TO "postgres";


COMMENT ON TABLE "public"."shift_handovers" IS 'Nursing shift handover - columns renamed to match app expectations';



CREATE TABLE IF NOT EXISTS "public"."system_configurations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" character varying(100) NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "category_id" "uuid",
    "is_system" boolean DEFAULT false,
    "data_type" "public"."config_data_type" DEFAULT 'string'::"public"."config_data_type",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_configurations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."todays_procedures" AS
 SELECT "pr"."id" AS "procedure_id",
    "pr"."procedure_number",
    "pr"."procedure_name",
    "pr"."scheduled_date",
    "pr"."scheduled_duration_minutes",
    "pr"."priority",
    "pr"."status",
    "pr"."location",
    "pr"."room_number",
    "pr"."anesthesia_type",
    "p"."id" AS "patient_id",
    "p"."first_name",
    "p"."surname" AS "last_name",
    "p"."emr_number" AS "hospital_id",
    "s"."first_name" AS "surgeon_first_name",
    "s"."last_name" AS "surgeon_last_name",
    "pr"."facility_id"
   FROM (("public"."procedures" "pr"
     JOIN "public"."patients" "p" ON (("p"."id" = "pr"."patient_id")))
     LEFT JOIN "public"."staff" "s" ON (("s"."id" = "pr"."primary_surgeon_id")))
  WHERE (("date"("pr"."scheduled_date") = CURRENT_DATE) AND (("pr"."status")::"text" <> ALL ((ARRAY['cancelled'::character varying, 'completed'::character varying])::"text"[])))
  ORDER BY "pr"."scheduled_date";


ALTER VIEW "public"."todays_procedures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."treatment_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "consultation_id" "uuid",
    "title" character varying(255) NOT NULL,
    "description" "text",
    "instructions" "text",
    "status" "public"."treatment_plan_status" DEFAULT 'Created'::"public"."treatment_plan_status",
    "created_by" "uuid",
    "viewed_by" "uuid",
    "viewed_at" timestamp with time zone,
    "completed_by" "uuid",
    "completed_at" timestamp with time zone,
    "completion_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."treatment_plans" OWNER TO "postgres";


COMMENT ON TABLE "public"."treatment_plans" IS 'Treatment plans - FK constraints fixed to reference UUID primary keys';



CREATE TABLE IF NOT EXISTS "public"."treatment_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "plan_id" "uuid",
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "task_type" "public"."treatment_task_type" NOT NULL,
    "description" "text",
    "status" "public"."treatment_task_status" DEFAULT 'Pending'::"public"."treatment_task_status",
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "notes" "text",
    "result_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "started_by" "uuid",
    "title" "text",
    "instructions" "text",
    "medication_name" "text",
    "dosage" "text",
    "route" "text",
    "scheduled_time" timestamp with time zone,
    "sequence_order" integer DEFAULT 0,
    "priority" "text" DEFAULT 'Normal'::"text",
    "execution_notes" "text"
);


ALTER TABLE "public"."treatment_tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."treatment_tasks"."started_at" IS 'Timestamp when the task was started';



COMMENT ON COLUMN "public"."treatment_tasks"."started_by" IS 'Staff member who started the task';



COMMENT ON COLUMN "public"."treatment_tasks"."title" IS 'Human-readable task title';



COMMENT ON COLUMN "public"."treatment_tasks"."sequence_order" IS 'Order in which tasks should be executed';



CREATE TABLE IF NOT EXISTS "public"."triage_assessments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "visit_id" "uuid",
    "patient_id" "uuid",
    "temperature" numeric(4,1),
    "pulse_rate" integer,
    "respiratory_rate" integer,
    "blood_pressure_systolic" integer,
    "blood_pressure_diastolic" integer,
    "oxygen_saturation" integer,
    "weight" numeric(6,2),
    "height" numeric(6,2),
    "bmi" numeric(6,2),
    "blood_glucose" numeric(6,2),
    "chief_complaint_text" "text",
    "consciousness" "public"."consciousness_level" DEFAULT 'Alert'::"public"."consciousness_level",
    "pain_score" integer,
    "triage_level" integer,
    "triage_color" character varying(20),
    "status" "public"."triage_status" DEFAULT 'Completed'::"public"."triage_status",
    "triaged_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."triage_assessments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_drug_inventory_summary" AS
 SELECT "dc"."id" AS "drug_id",
    "dc"."code" AS "drug_code",
    "dc"."name" AS "drug_name",
    "dc"."strengths" AS "strength",
    "dc"."price" AS "selling_price",
    "dc"."reorder_level",
    "dc"."is_active",
    COALESCE("batch_stats"."total_quantity", (0)::bigint) AS "total_stock",
    COALESCE("batch_stats"."batch_count", (0)::bigint) AS "batch_count",
    COALESCE("batch_stats"."earliest_expiry", NULL::"date") AS "earliest_expiry",
    COALESCE("batch_stats"."total_cost_value", (0)::numeric) AS "stock_cost_value",
    COALESCE("batch_stats"."expiring_soon", (0)::bigint) AS "expiring_soon_qty",
    COALESCE("all_batch_stats"."has_batch_history", false) AS "has_batch_history",
        CASE
            WHEN ((COALESCE("batch_stats"."total_quantity", (0)::bigint) = 0) AND (("dc"."reorder_level" > 0) OR COALESCE("all_batch_stats"."has_batch_history", false))) THEN 'out_of_stock'::"text"
            WHEN (COALESCE("batch_stats"."total_quantity", (0)::bigint) = 0) THEN 'not_stocked'::"text"
            WHEN (COALESCE("batch_stats"."total_quantity", (0)::bigint) <= "dc"."reorder_level") THEN 'low_stock'::"text"
            ELSE 'in_stock'::"text"
        END AS "stock_status"
   FROM (("public"."drug_catalogue" "dc"
     LEFT JOIN ( SELECT "drug_batches"."drug_id",
            "sum"("drug_batches"."quantity_remaining") AS "total_quantity",
            "count"(*) AS "batch_count",
            "min"("drug_batches"."expiry_date") FILTER (WHERE ("drug_batches"."quantity_remaining" > 0)) AS "earliest_expiry",
            "sum"((("drug_batches"."quantity_remaining")::numeric * "drug_batches"."cost_price")) AS "total_cost_value",
            "sum"("drug_batches"."quantity_remaining") FILTER (WHERE ("drug_batches"."expiry_date" <= (CURRENT_DATE + '90 days'::interval))) AS "expiring_soon"
           FROM "public"."drug_batches"
          WHERE ((("drug_batches"."status")::"text" = 'active'::"text") AND ("drug_batches"."expiry_date" > CURRENT_DATE))
          GROUP BY "drug_batches"."drug_id") "batch_stats" ON (("batch_stats"."drug_id" = "dc"."id")))
     LEFT JOIN ( SELECT "drug_batches"."drug_id",
            true AS "has_batch_history"
           FROM "public"."drug_batches"
          GROUP BY "drug_batches"."drug_id") "all_batch_stats" ON (("all_batch_stats"."drug_id" = "dc"."id")))
  WHERE ("dc"."is_active" = true);


ALTER VIEW "public"."v_drug_inventory_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_drug_inventory_summary" IS 'Drug inventory summary with stock status. Only drugs with reorder_level > 0 or batch history are marked as out_of_stock when empty.';



CREATE OR REPLACE VIEW "public"."v_expired_drugs" AS
 SELECT "db"."batch_id",
    "db"."drug_id",
    "dc"."code" AS "drug_code",
    "dc"."name" AS "drug_name",
    "db"."batch_number",
    "db"."quantity_remaining",
    "db"."expiry_date",
    (CURRENT_DATE - "db"."expiry_date") AS "days_expired",
    "db"."cost_price",
    (("db"."quantity_remaining")::numeric * "db"."cost_price") AS "loss_value",
    "db"."status"
   FROM ("public"."drug_batches" "db"
     JOIN "public"."drug_catalogue" "dc" ON (("dc"."id" = "db"."drug_id")))
  WHERE (("db"."expiry_date" <= CURRENT_DATE) AND ("db"."quantity_remaining" > 0))
  ORDER BY "db"."expiry_date" DESC;


ALTER VIEW "public"."v_expired_drugs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_near_expiry_drugs" AS
 SELECT "db"."batch_id",
    "db"."drug_id",
    "dc"."code" AS "drug_code",
    "dc"."name" AS "drug_name",
    "db"."batch_number",
    "db"."quantity_remaining",
    "db"."expiry_date",
    ("db"."expiry_date" - CURRENT_DATE) AS "days_to_expiry",
    "db"."cost_price",
    (("db"."quantity_remaining")::numeric * "db"."cost_price") AS "batch_value",
        CASE
            WHEN (("db"."expiry_date" - CURRENT_DATE) <= 30) THEN 'critical'::"text"
            WHEN (("db"."expiry_date" - CURRENT_DATE) <= 60) THEN 'warning'::"text"
            WHEN (("db"."expiry_date" - CURRENT_DATE) <= 90) THEN 'caution'::"text"
            ELSE NULL::"text"
        END AS "urgency_level"
   FROM ("public"."drug_batches" "db"
     JOIN "public"."drug_catalogue" "dc" ON (("dc"."id" = "db"."drug_id")))
  WHERE ((("db"."status")::"text" = 'active'::"text") AND ("db"."quantity_remaining" > 0) AND ("db"."expiry_date" > CURRENT_DATE) AND ("db"."expiry_date" <= (CURRENT_DATE + '90 days'::interval)))
  ORDER BY "db"."expiry_date";


ALTER VIEW "public"."v_near_expiry_drugs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_patient_complaints" AS
 SELECT "pcc"."id",
    "pcc"."patient_id",
    "pcc"."emr_number",
    "pcc"."encounter_id",
    "pcc"."consultation_id",
    "pcc"."is_primary",
    "pcc"."duration_value",
    "pcc"."duration_unit",
    "pcc"."notes",
    "pcc"."created_at",
    "ccc"."complaint_id",
    "ccc"."complaint_name",
    "ccc"."complaint_code",
    "ccc"."category",
    "p"."first_name",
    "p"."surname",
    "v"."encounter_number",
    "v"."encounter_date"
   FROM ((("public"."patient_chief_complaints" "pcc"
     JOIN "public"."chief_complaint_catalogue" "ccc" ON (("pcc"."complaint_id" = "ccc"."complaint_id")))
     JOIN "public"."patients" "p" ON ((("pcc"."patient_id")::"text" = ("p"."patient_id")::"text")))
     JOIN "public"."visits" "v" ON (("pcc"."encounter_id" = "v"."id")));


ALTER VIEW "public"."v_patient_complaints" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."visit_id_seq"
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."visit_id_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vital_schedule_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "acuity_level" "public"."patient_acuity" NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "description" "text",
    "frequency_minutes" integer NOT NULL,
    "grace_period_minutes" integer DEFAULT 15,
    "alert_priority" character varying(20) DEFAULT 'normal'::character varying,
    "color" character varying(20) DEFAULT '#6B7280'::character varying,
    "icon" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vital_schedule_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."vital_schedule_configs" IS 'Configuration for vital sign frequency by patient acuity level';



CREATE OR REPLACE VIEW "public"."vital_schedules_summary" AS
 SELECT "pvs"."id",
    "pvs"."patient_id",
    "concat"("p"."first_name", ' ', "p"."surname") AS "patient_name",
    "pvs"."encounter_id",
    "w"."name" AS "ward_name",
    "b"."bed_number",
    "pvs"."acuity_level",
    "vsc"."display_name" AS "acuity_display_name",
    "vsc"."frequency_minutes",
    "vsc"."color" AS "acuity_color",
    "pvs"."last_vitals_at",
    "pvs"."next_vitals_due",
    "pvs"."is_overdue",
        CASE
            WHEN "pvs"."is_overdue" THEN ((EXTRACT(epoch FROM ("now"() - "pvs"."next_vitals_due")))::integer / 60)
            ELSE NULL::integer
        END AS "minutes_overdue",
        CASE
            WHEN ((NOT "pvs"."is_overdue") AND ("pvs"."next_vitals_due" > "now"())) THEN ((EXTRACT(epoch FROM ("pvs"."next_vitals_due" - "now"())))::integer / 60)
            ELSE NULL::integer
        END AS "minutes_until_due",
    "pvs"."assigned_nurse_id",
    "concat"("s"."first_name", ' ', "s"."last_name") AS "assigned_nurse_name",
    "pvs"."paused",
    "pvs"."pause_reason",
    "pvs"."is_active"
   FROM ((((((("public"."patient_vital_schedules" "pvs"
     JOIN "public"."patients" "p" ON ((("p"."patient_id")::"text" = ("pvs"."patient_id")::"text")))
     JOIN "public"."visits" "v" ON (("v"."id" = "pvs"."encounter_id")))
     JOIN "public"."vital_schedule_configs" "vsc" ON (("vsc"."acuity_level" = "pvs"."acuity_level")))
     LEFT JOIN "public"."admissions" "a" ON (("a"."encounter_id" = "v"."id")))
     LEFT JOIN "public"."beds" "b" ON (("b"."id" = "a"."current_bed_id")))
     LEFT JOIN "public"."wards" "w" ON (("w"."id" = "b"."ward_id")))
     LEFT JOIN "public"."staff" "s" ON (("s"."id" = "pvs"."assigned_nurse_id")))
  WHERE ("pvs"."is_active" = true);


ALTER VIEW "public"."vital_schedules_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."vital_schedules_summary" IS 'Summary view of all active vital schedules with patient details';



CREATE TABLE IF NOT EXISTS "public"."vitals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_id" "uuid",
    "patient_id" "uuid",
    "temperature" numeric(4,1),
    "blood_pressure" character varying(20),
    "blood_pressure_systolic" integer,
    "blood_pressure_diastolic" integer,
    "pulse" integer,
    "respiratory_rate" integer,
    "oxygen_saturation" integer,
    "weight" numeric(6,2),
    "height" numeric(6,2),
    "bmi" numeric(6,2),
    "blood_glucose" numeric(6,2),
    "pain_level" integer,
    "nurse_id" "uuid",
    "date_recorded" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "is_critical" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "schedule_id" "uuid",
    "was_overdue" boolean DEFAULT false,
    "minutes_overdue" integer
);

ALTER TABLE ONLY "public"."vitals" REPLICA IDENTITY FULL;


ALTER TABLE "public"."vitals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ward_census" AS
 WITH "bed_counts" AS (
         SELECT "beds"."ward_id",
            "count"(*) FILTER (WHERE (("beds"."status")::"text" = 'available'::"text")) AS "available_count",
            "count"(*) FILTER (WHERE (("beds"."status")::"text" = 'occupied'::"text")) AS "occupied_count",
            "count"(*) FILTER (WHERE (("beds"."status")::"text" = 'maintenance'::"text")) AS "maintenance_count",
            "count"(*) FILTER (WHERE (("beds"."status")::"text" = 'cleaning'::"text")) AS "cleaning_count",
            "count"(*) FILTER (WHERE (("beds"."status")::"text" = 'reserved'::"text")) AS "reserved_count"
           FROM "public"."beds"
          WHERE ("beds"."is_active" = true)
          GROUP BY "beds"."ward_id"
        )
 SELECT "w"."id" AS "ward_id",
    "w"."name" AS "ward_name",
    "w"."ward_type",
    "w"."total_beds",
    COALESCE("bc"."available_count", (0)::bigint) AS "available_beds",
    COALESCE("bc"."occupied_count", (0)::bigint) AS "occupied_beds",
    "round"((((COALESCE("bc"."occupied_count", (0)::bigint))::numeric / (NULLIF("w"."total_beds", 0))::numeric) * (100)::numeric), 1) AS "occupancy_rate",
    "count"("a"."id") FILTER (WHERE (("a"."admission_status")::"text" = 'critical'::"text")) AS "critical_patients",
    "count"("a"."id") FILTER (WHERE ("a"."isolation_required" = true)) AS "isolation_patients",
    "w"."facility_id"
   FROM (("public"."wards" "w"
     LEFT JOIN "bed_counts" "bc" ON (("w"."id" = "bc"."ward_id")))
     LEFT JOIN "public"."admissions" "a" ON ((("a"."current_ward_id" = "w"."id") AND (("a"."admission_status")::"text" <> ALL ((ARRAY['discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying])::"text"[])))))
  WHERE ("w"."is_active" = true)
  GROUP BY "w"."id", "w"."name", "w"."ward_type", "w"."total_beds", "bc"."available_count", "bc"."occupied_count", "w"."facility_id";


ALTER VIEW "public"."ward_census" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ward_round_summary_view" AS
 SELECT "wrn"."id" AS "ward_round_id",
    "wrn"."admission_id",
    "wrn"."encounter_id",
    "wrn"."round_date",
    "wrn"."round_type",
    "wrn"."subjective_notes",
    "wrn"."objective_findings",
    "wrn"."assessment",
    "wrn"."plan",
    "wrn"."vital_signs",
    "wrn"."patient_condition",
    "wrn"."nursing_instructions",
    "wrn"."estimated_discharge_date" AS "updated_discharge_date",
    "wrn"."discharge_planning_notes",
    "wrn"."new_orders",
    "wrn"."discontinued_orders",
    "wrn"."attending_physician_id",
    ((("doc"."first_name")::"text" || ' '::"text") || ("doc"."last_name")::"text") AS "attending_physician_name",
    "doc"."staff_id" AS "attending_physician_staff_id",
    "wrn"."created_by",
    ((("creator"."first_name")::"text" || ' '::"text") || ("creator"."last_name")::"text") AS "created_by_name",
    "wrn"."created_at",
    "wrn"."participants",
    "a"."admission_number",
    "p"."emr_number" AS "hospital_id",
    ((("p"."first_name")::"text" || ' '::"text") || ("p"."surname")::"text") AS "patient_name"
   FROM (((("public"."ward_round_notes" "wrn"
     JOIN "public"."admissions" "a" ON (("a"."id" = "wrn"."admission_id")))
     JOIN "public"."patients" "p" ON (("p"."id" = "a"."patient_id")))
     LEFT JOIN "public"."staff" "doc" ON (("doc"."id" = "wrn"."attending_physician_id")))
     LEFT JOIN "public"."staff" "creator" ON (("creator"."id" = "wrn"."created_by")))
  ORDER BY "wrn"."round_date" DESC, "wrn"."created_at" DESC;


ALTER VIEW "public"."ward_round_summary_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_exceptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "exception_number" character varying(50) NOT NULL,
    "exception_type" "public"."exception_type" NOT NULL,
    "severity" character varying(20) DEFAULT 'Normal'::character varying,
    "entity_type" character varying(50),
    "entity_id" "uuid",
    "reason" "text",
    "status" "public"."exception_status" DEFAULT 'Pending'::"public"."exception_status",
    "requested_by" "uuid",
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_exceptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_admission_number_key" UNIQUE ("admission_number");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "beds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "beds_ward_id_bed_number_key" UNIQUE ("ward_id", "bed_number");



ALTER TABLE ONLY "public"."billing_audit_log"
    ADD CONSTRAINT "billing_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_items"
    ADD CONSTRAINT "billing_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_orders"
    ADD CONSTRAINT "billing_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."billing_orders"
    ADD CONSTRAINT "billing_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chief_complaint_catalogue"
    ADD CONSTRAINT "chief_complaint_catalogue_complaint_code_key" UNIQUE ("complaint_code");



ALTER TABLE ONLY "public"."chief_complaint_catalogue"
    ADD CONSTRAINT "chief_complaint_catalogue_pkey" PRIMARY KEY ("complaint_id");



ALTER TABLE ONLY "public"."clinical_request_status_history"
    ADD CONSTRAINT "clinical_request_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_request_number_key" UNIQUE ("request_number");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_clinic_id_key" UNIQUE ("clinic_id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."config_categories"
    ADD CONSTRAINT "config_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_pkey" PRIMARY KEY ("consultation_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_course_name_key" UNIQUE ("course_name");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_course_number_key" UNIQUE ("course_number");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_feedback"
    ADD CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_progress_notes"
    ADD CONSTRAINT "daily_progress_notes_encounter_id_note_date_key" UNIQUE ("encounter_id", "note_date");



ALTER TABLE ONLY "public"."daily_progress_notes"
    ADD CONSTRAINT "daily_progress_notes_pkey" PRIMARY KEY ("progress_id");



ALTER TABLE ONLY "public"."dental_chart"
    ADD CONSTRAINT "dental_chart_exam_id_tooth_number_key" UNIQUE ("exam_id", "tooth_number");



ALTER TABLE ONLY "public"."dental_chart"
    ADD CONSTRAINT "dental_chart_pkey" PRIMARY KEY ("chart_id");



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_pkey" PRIMARY KEY ("exam_id");



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_pkey" PRIMARY KEY ("prescription_id");



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_pkey" PRIMARY KEY ("procedure_id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispense_items"
    ADD CONSTRAINT "dispense_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dispense_records"
    ADD CONSTRAINT "dispense_records_pkey" PRIMARY KEY ("dispense_id");



ALTER TABLE ONLY "public"."dispenses"
    ADD CONSTRAINT "dispenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."drug_batches"
    ADD CONSTRAINT "drug_batches_pkey" PRIMARY KEY ("batch_id");



ALTER TABLE ONLY "public"."drug_catalogue"
    ADD CONSTRAINT "drug_catalogue_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."drug_catalogue"
    ADD CONSTRAINT "drug_catalogue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encounter_access_logs"
    ADD CONSTRAINT "encounter_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encounter_care_team"
    ADD CONSTRAINT "encounter_care_team_encounter_id_staff_id_role_key" UNIQUE ("encounter_id", "staff_id", "role");



ALTER TABLE ONLY "public"."encounter_care_team"
    ADD CONSTRAINT "encounter_care_team_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encounter_transfers"
    ADD CONSTRAINT "encounter_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_referral_number_key" UNIQUE ("referral_number");



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_pkey" PRIMARY KEY ("exam_id");



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_pkey" PRIMARY KEY ("prescription_id");



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_pkey" PRIMARY KEY ("procedure_id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."imaging_catalogue"
    ADD CONSTRAINT "imaging_catalogue_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."imaging_catalogue"
    ADD CONSTRAINT "imaging_catalogue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_item_code_key" UNIQUE ("item_code");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_pkey" PRIMARY KEY ("movement_id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("item_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id");



ALTER TABLE ONLY "public"."lab_request_items"
    ADD CONSTRAINT "lab_request_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "lab_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_test_catalogue"
    ADD CONSTRAINT "lab_test_catalogue_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."lab_test_catalogue"
    ADD CONSTRAINT "lab_test_catalogue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medical_reports"
    ADD CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_administration"
    ADD CONSTRAINT "medication_administration_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nhis_config"
    ADD CONSTRAINT "nhis_config_payment_category_key" UNIQUE ("payment_category");



ALTER TABLE ONLY "public"."nhis_config"
    ADD CONSTRAINT "nhis_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nhis_hmos"
    ADD CONSTRAINT "nhis_hmos_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."nhis_hmos"
    ADD CONSTRAINT "nhis_hmos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nhis_medicines"
    ADD CONSTRAINT "nhis_medicines_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."nhis_medicines"
    ADD CONSTRAINT "nhis_medicines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nhis_procedures"
    ADD CONSTRAINT "nhis_procedures_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."nhis_procedures"
    ADD CONSTRAINT "nhis_procedures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."on_call_schedule"
    ADD CONSTRAINT "no_overlap_schedule" EXCLUDE USING "gist" ("staff_id" WITH =, "tstzrange"("start_time", "end_time") WITH &&) WHERE (("is_active" = true));



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nursing_audit_log"
    ADD CONSTRAINT "nursing_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."on_call_schedule"
    ADD CONSTRAINT "on_call_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "patient_chief_complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_patient_id_encounter_id_key" UNIQUE ("patient_id", "encounter_id");



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_emr_number_key" UNIQUE ("emr_number");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_patient_id_key" UNIQUE ("patient_id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_receipt_number_key" UNIQUE ("receipt_number");



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_pkey" PRIMARY KEY ("assessment_id");



ALTER TABLE ONLY "public"."physio_discharge"
    ADD CONSTRAINT "physio_discharge_pkey" PRIMARY KEY ("discharge_id");



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_pkey" PRIMARY KEY ("plan_id");



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_pkey" PRIMARY KEY ("progress_id");



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id");



ALTER TABLE ONLY "public"."price_list"
    ADD CONSTRAINT "price_list_item_code_key" UNIQUE ("item_code");



ALTER TABLE ONLY "public"."price_list"
    ADD CONSTRAINT "price_list_pkey" PRIMARY KEY ("price_id");



ALTER TABLE ONLY "public"."procedure_catalogue"
    ADD CONSTRAINT "procedure_catalogue_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."procedure_catalogue"
    ADD CONSTRAINT "procedure_catalogue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedure_consumables"
    ADD CONSTRAINT "procedure_consumables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedure_requests"
    ADD CONSTRAINT "procedure_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_procedure_number_key" UNIQUE ("procedure_number");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."radiology_request_items"
    ADD CONSTRAINT "radiology_request_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "radiology_requests_pkey" PRIMARY KEY ("request_id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("receipt_id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_receipt_number_key" UNIQUE ("receipt_number");



ALTER TABLE ONLY "public"."referral_outcomes"
    ADD CONSTRAINT "referral_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referral_number_key" UNIQUE ("referral_number");



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scan_results"
    ADD CONSTRAINT "scan_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_price_audit"
    ADD CONSTRAINT "service_price_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_configurations"
    ADD CONSTRAINT "shift_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_configurations"
    ADD CONSTRAINT "shift_configurations_shift_name_key" UNIQUE ("shift_name");



ALTER TABLE ONLY "public"."shift_handover"
    ADD CONSTRAINT "shift_handover_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shift_handovers"
    ADD CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("handover_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_staff_id_key" UNIQUE ("staff_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "treatment_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."triage_assessments"
    ADD CONSTRAINT "triage_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "unique_complaint_per_encounter" UNIQUE ("encounter_id", "complaint_id");



ALTER TABLE ONLY "public"."drug_batches"
    ADD CONSTRAINT "unique_drug_batch" UNIQUE ("drug_id", "batch_number");



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_visit_id_key" UNIQUE ("visit_id");



ALTER TABLE ONLY "public"."vital_schedule_configs"
    ADD CONSTRAINT "vital_schedule_configs_acuity_level_key" UNIQUE ("acuity_level");



ALTER TABLE ONLY "public"."vital_schedule_configs"
    ADD CONSTRAINT "vital_schedule_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ward_round_notes"
    ADD CONSTRAINT "ward_round_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wards"
    ADD CONSTRAINT "wards_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."wards"
    ADD CONSTRAINT "wards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_exceptions"
    ADD CONSTRAINT "workflow_exceptions_exception_number_key" UNIQUE ("exception_number");



ALTER TABLE ONLY "public"."workflow_exceptions"
    ADD CONSTRAINT "workflow_exceptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_access_logs_encounter" ON "public"."encounter_access_logs" USING "btree" ("encounter_id");



CREATE INDEX "idx_access_logs_timestamp" ON "public"."encounter_access_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_access_logs_unauthorized" ON "public"."encounter_access_logs" USING "btree" ("encounter_id", "timestamp") WHERE ("was_authorized" = false);



CREATE INDEX "idx_access_logs_user" ON "public"."encounter_access_logs" USING "btree" ("user_id");



CREATE INDEX "idx_admissions_active" ON "public"."admissions" USING "btree" ("admission_status") WHERE (("admission_status")::"text" <> ALL ((ARRAY['discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying])::"text"[]));



CREATE INDEX "idx_admissions_attending" ON "public"."admissions" USING "btree" ("attending_physician_id");



CREATE INDEX "idx_admissions_bed" ON "public"."admissions" USING "btree" ("current_bed_id");



CREATE INDEX "idx_admissions_date" ON "public"."admissions" USING "btree" ("admission_date");



CREATE INDEX "idx_admissions_encounter" ON "public"."admissions" USING "btree" ("encounter_id");



CREATE INDEX "idx_admissions_facility" ON "public"."admissions" USING "btree" ("facility_id");



CREATE INDEX "idx_admissions_number" ON "public"."admissions" USING "btree" ("admission_number");



CREATE INDEX "idx_admissions_patient" ON "public"."admissions" USING "btree" ("patient_id");



CREATE INDEX "idx_admissions_status" ON "public"."admissions" USING "btree" ("admission_status");



CREATE INDEX "idx_admissions_ward" ON "public"."admissions" USING "btree" ("current_ward_id");



CREATE INDEX "idx_beds_available" ON "public"."beds" USING "btree" ("ward_id", "status") WHERE (("status")::"text" = 'available'::"text");



CREATE INDEX "idx_beds_patient" ON "public"."beds" USING "btree" ("current_patient_id") WHERE ("current_patient_id" IS NOT NULL);



CREATE INDEX "idx_beds_status" ON "public"."beds" USING "btree" ("status");



CREATE INDEX "idx_beds_ward" ON "public"."beds" USING "btree" ("ward_id");



CREATE INDEX "idx_billing_audit_log_encounter" ON "public"."billing_audit_log" USING "btree" ("encounter_id");



CREATE INDEX "idx_billing_audit_log_entity" ON "public"."billing_audit_log" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_billing_audit_log_event_type" ON "public"."billing_audit_log" USING "btree" ("event_type");



CREATE INDEX "idx_billing_audit_log_patient" ON "public"."billing_audit_log" USING "btree" ("patient_id");



CREATE INDEX "idx_billing_audit_log_performed_at" ON "public"."billing_audit_log" USING "btree" ("performed_at" DESC);



CREATE INDEX "idx_billing_audit_log_performed_by" ON "public"."billing_audit_log" USING "btree" ("performed_by");



CREATE INDEX "idx_billing_items_nhis_covered" ON "public"."billing_items" USING "btree" ("nhis_covered");



CREATE INDEX "idx_billing_items_service_reference" ON "public"."billing_items" USING "btree" ("service_reference_id");



CREATE INDEX "idx_billing_orders_created_at" ON "public"."billing_orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_billing_orders_encounter" ON "public"."billing_orders" USING "btree" ("encounter_id");



CREATE INDEX "idx_billing_orders_encounter_id" ON "public"."billing_orders" USING "btree" ("encounter_id");



CREATE INDEX "idx_billing_orders_nhis_covered" ON "public"."billing_orders" USING "btree" ("nhis_covered");



CREATE INDEX "idx_billing_orders_patient_id" ON "public"."billing_orders" USING "btree" ("patient_id");



CREATE INDEX "idx_billing_orders_status" ON "public"."billing_orders" USING "btree" ("status");



CREATE INDEX "idx_billing_orders_visit" ON "public"."billing_orders" USING "btree" ("visit_id");



CREATE INDEX "idx_care_team_encounter" ON "public"."encounter_care_team" USING "btree" ("encounter_id") WHERE ("is_active" = true);



CREATE INDEX "idx_care_team_expires" ON "public"."encounter_care_team" USING "btree" ("expires_at") WHERE (("expires_at" IS NOT NULL) AND ("is_active" = true));



CREATE INDEX "idx_care_team_expiry_check" ON "public"."encounter_care_team" USING "btree" ("expires_at", "is_active") WHERE (("expires_at" IS NOT NULL) AND ("is_active" = true));



CREATE INDEX "idx_care_team_lookup" ON "public"."encounter_care_team" USING "btree" ("encounter_id", "staff_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_care_team_role" ON "public"."encounter_care_team" USING "btree" ("role");



CREATE INDEX "idx_care_team_staff" ON "public"."encounter_care_team" USING "btree" ("staff_id") WHERE ("is_active" = true);



CREATE INDEX "idx_clinical_request_history_request" ON "public"."clinical_request_status_history" USING "btree" ("request_id");



CREATE INDEX "idx_clinical_requests_created_at" ON "public"."clinical_requests" USING "btree" ("created_at");



CREATE INDEX "idx_clinical_requests_date" ON "public"."clinical_requests" USING "btree" ("created_at");



CREATE INDEX "idx_clinical_requests_encounter" ON "public"."clinical_requests" USING "btree" ("encounter_id");



CREATE INDEX "idx_clinical_requests_patient" ON "public"."clinical_requests" USING "btree" ("patient_id");



CREATE INDEX "idx_clinical_requests_requesting_doctor" ON "public"."clinical_requests" USING "btree" ("requesting_doctor_id");



CREATE INDEX "idx_clinical_requests_sla_deadline" ON "public"."clinical_requests" USING "btree" ("sla_deadline") WHERE ("status" = ANY (ARRAY['Pending'::"public"."clinical_request_status", 'Under_Review'::"public"."clinical_request_status"]));



CREATE INDEX "idx_clinical_requests_specialty" ON "public"."clinical_requests" USING "btree" ("specialty_module") WHERE ("specialty_module" IS NOT NULL);



CREATE INDEX "idx_clinical_requests_status" ON "public"."clinical_requests" USING "btree" ("status");



CREATE INDEX "idx_clinical_requests_target_dept" ON "public"."clinical_requests" USING "btree" ("target_department_id");



CREATE INDEX "idx_clinical_requests_type" ON "public"."clinical_requests" USING "btree" ("request_type");



CREATE INDEX "idx_clinical_requests_urgency" ON "public"."clinical_requests" USING "btree" ("urgency");



CREATE INDEX "idx_complaint_active" ON "public"."chief_complaint_catalogue" USING "btree" ("is_active");



CREATE INDEX "idx_complaint_category" ON "public"."chief_complaint_catalogue" USING "btree" ("category");



CREATE INDEX "idx_consultations_doctor_id" ON "public"."consultations" USING "btree" ("doctor_id");



CREATE INDEX "idx_consultations_encounter" ON "public"."consultations" USING "btree" ("encounter_id");



CREATE INDEX "idx_consultations_encounter_id" ON "public"."consultations" USING "btree" ("encounter_id");



CREATE INDEX "idx_consultations_nurse_followup" ON "public"."consultations" USING "btree" ("requires_nurse_followup") WHERE ("requires_nurse_followup" = true);



CREATE INDEX "idx_consultations_patient_id" ON "public"."consultations" USING "btree" ("patient_id");



CREATE INDEX "idx_consumables_item" ON "public"."procedure_consumables" USING "btree" ("item_id");



CREATE INDEX "idx_consumables_procedure" ON "public"."procedure_consumables" USING "btree" ("procedure_id");



CREATE INDEX "idx_courses_course_number" ON "public"."courses" USING "btree" ("course_number");



CREATE INDEX "idx_courses_facility" ON "public"."courses" USING "btree" ("facility_id");



CREATE INDEX "idx_courses_is_active" ON "public"."courses" USING "btree" ("is_active");



CREATE INDEX "idx_daily_progress_notes_encounter" ON "public"."daily_progress_notes" USING "btree" ("encounter_id");



CREATE INDEX "idx_daily_progress_notes_encounter_id" ON "public"."daily_progress_notes" USING "btree" ("encounter_id");



CREATE INDEX "idx_daily_progress_notes_note_date" ON "public"."daily_progress_notes" USING "btree" ("note_date" DESC);



CREATE INDEX "idx_daily_progress_notes_patient_id" ON "public"."daily_progress_notes" USING "btree" ("patient_id");



CREATE INDEX "idx_dental_chart_exam" ON "public"."dental_chart" USING "btree" ("exam_id");



CREATE INDEX "idx_dental_chart_patient" ON "public"."dental_chart" USING "btree" ("patient_id");



CREATE INDEX "idx_dental_chart_tooth" ON "public"."dental_chart" USING "btree" ("tooth_number");



CREATE INDEX "idx_dental_exams_created_at" ON "public"."dental_exams" USING "btree" ("created_at");



CREATE INDEX "idx_dental_exams_encounter" ON "public"."dental_exams" USING "btree" ("encounter_id");



CREATE INDEX "idx_dental_exams_facility" ON "public"."dental_exams" USING "btree" ("facility_id");



CREATE INDEX "idx_dental_exams_patient" ON "public"."dental_exams" USING "btree" ("patient_id");



CREATE INDEX "idx_dental_exams_status" ON "public"."dental_exams" USING "btree" ("status");



CREATE INDEX "idx_dental_prescriptions_encounter" ON "public"."dental_prescriptions" USING "btree" ("encounter_id");



CREATE INDEX "idx_dental_prescriptions_patient" ON "public"."dental_prescriptions" USING "btree" ("patient_id");



CREATE INDEX "idx_dental_procedures_date" ON "public"."dental_procedures" USING "btree" ("procedure_date");



CREATE INDEX "idx_dental_procedures_encounter" ON "public"."dental_procedures" USING "btree" ("encounter_id");



CREATE INDEX "idx_dental_procedures_patient" ON "public"."dental_procedures" USING "btree" ("patient_id");



CREATE INDEX "idx_dental_procedures_status" ON "public"."dental_procedures" USING "btree" ("status");



CREATE INDEX "idx_dispense_records_batch" ON "public"."dispense_records" USING "btree" ("batch_id");



CREATE INDEX "idx_dispense_records_date" ON "public"."dispense_records" USING "btree" ("dispensed_at");



CREATE INDEX "idx_dispense_records_encounter" ON "public"."dispense_records" USING "btree" ("encounter_id");



CREATE INDEX "idx_dispense_records_patient" ON "public"."dispense_records" USING "btree" ("patient_id");



CREATE INDEX "idx_dispense_records_prescription" ON "public"."dispense_records" USING "btree" ("prescription_id");



CREATE INDEX "idx_doctor_orders_assigned_nurse" ON "public"."doctor_orders" USING "btree" ("assigned_nurse_id");



CREATE INDEX "idx_doctor_orders_encounter" ON "public"."doctor_orders" USING "btree" ("encounter_id");



CREATE INDEX "idx_doctor_orders_nurse_action" ON "public"."doctor_orders" USING "btree" ("requires_nurse_action") WHERE ("requires_nurse_action" = true);



CREATE INDEX "idx_doctor_orders_ordered_by" ON "public"."doctor_orders" USING "btree" ("ordered_by");



CREATE INDEX "idx_doctor_orders_patient" ON "public"."doctor_orders" USING "btree" ("patient_id");



CREATE INDEX "idx_doctor_orders_pending" ON "public"."doctor_orders" USING "btree" ("status", "requires_nurse_action") WHERE ((("status")::"text" = 'pending'::"text") AND ("requires_nurse_action" = true));



CREATE INDEX "idx_doctor_orders_priority" ON "public"."doctor_orders" USING "btree" ("priority");



CREATE INDEX "idx_doctor_orders_status" ON "public"."doctor_orders" USING "btree" ("status");



CREATE INDEX "idx_drug_batches_drug_id" ON "public"."drug_batches" USING "btree" ("drug_id");



CREATE INDEX "idx_drug_batches_expiry" ON "public"."drug_batches" USING "btree" ("expiry_date");



CREATE INDEX "idx_drug_batches_remaining" ON "public"."drug_batches" USING "btree" ("quantity_remaining") WHERE ("quantity_remaining" > 0);



CREATE INDEX "idx_drug_batches_status" ON "public"."drug_batches" USING "btree" ("status");



CREATE INDEX "idx_drug_nhis_covered" ON "public"."drug_catalogue" USING "btree" ("is_nhis_covered") WHERE ("is_nhis_covered" = true);



CREATE INDEX "idx_external_referrals_direction" ON "public"."external_referrals" USING "btree" ("direction");



CREATE INDEX "idx_external_referrals_patient" ON "public"."external_referrals" USING "btree" ("patient_id");



CREATE INDEX "idx_external_referrals_status" ON "public"."external_referrals" USING "btree" ("status");



CREATE INDEX "idx_eye_exams_created_at" ON "public"."eye_exams" USING "btree" ("created_at");



CREATE INDEX "idx_eye_exams_encounter" ON "public"."eye_exams" USING "btree" ("encounter_id");



CREATE INDEX "idx_eye_exams_facility" ON "public"."eye_exams" USING "btree" ("facility_id");



CREATE INDEX "idx_eye_exams_patient" ON "public"."eye_exams" USING "btree" ("patient_id");



CREATE INDEX "idx_eye_exams_status" ON "public"."eye_exams" USING "btree" ("status");



CREATE INDEX "idx_eye_prescriptions_encounter" ON "public"."eye_prescriptions" USING "btree" ("encounter_id");



CREATE INDEX "idx_eye_prescriptions_patient" ON "public"."eye_prescriptions" USING "btree" ("patient_id");



CREATE INDEX "idx_eye_prescriptions_type" ON "public"."eye_prescriptions" USING "btree" ("prescription_type");



CREATE INDEX "idx_eye_procedures_encounter" ON "public"."eye_procedures" USING "btree" ("encounter_id");



CREATE INDEX "idx_eye_procedures_patient" ON "public"."eye_procedures" USING "btree" ("patient_id");



CREATE INDEX "idx_eye_procedures_type" ON "public"."eye_procedures" USING "btree" ("procedure_type");



CREATE INDEX "idx_facilities_active" ON "public"."facilities" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_facilities_code" ON "public"."facilities" USING "btree" ("code");



CREATE INDEX "idx_handovers_encounter" ON "public"."shift_handovers" USING "btree" ("encounter_id");



CREATE INDEX "idx_handovers_patient" ON "public"."shift_handovers" USING "btree" ("patient_id");



CREATE INDEX "idx_imaging_nhis_covered" ON "public"."imaging_catalogue" USING "btree" ("is_nhis_covered") WHERE ("is_nhis_covered" = true);



CREATE INDEX "idx_invoices_encounter" ON "public"."invoices" USING "btree" ("encounter_id");



CREATE INDEX "idx_lab_requests_created_at" ON "public"."lab_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lab_requests_diagnosis" ON "public"."lab_requests" USING "gin" ("diagnosis");



CREATE INDEX "idx_lab_requests_encounter" ON "public"."lab_requests" USING "btree" ("encounter_id");



CREATE INDEX "idx_lab_requests_encounter_id" ON "public"."lab_requests" USING "btree" ("encounter_id");



CREATE INDEX "idx_lab_requests_patient_id" ON "public"."lab_requests" USING "btree" ("patient_id");



CREATE INDEX "idx_lab_requests_patient_status" ON "public"."lab_requests" USING "btree" ("patient_id", "status", "created_at" DESC);



CREATE INDEX "idx_lab_requests_processed_by" ON "public"."lab_requests" USING "btree" ("processed_by");



CREATE INDEX "idx_lab_requests_result_date" ON "public"."lab_requests" USING "btree" ("result_date");



CREATE INDEX "idx_lab_requests_status" ON "public"."lab_requests" USING "btree" ("status");



CREATE INDEX "idx_lab_requests_visit_id" ON "public"."lab_requests" USING "btree" ("visit_id");



CREATE INDEX "idx_lab_test_nhis_covered" ON "public"."lab_test_catalogue" USING "btree" ("is_nhis_covered") WHERE ("is_nhis_covered" = true);



CREATE INDEX "idx_med_admin_encounter" ON "public"."medication_administration" USING "btree" ("encounter_id");



CREATE INDEX "idx_nhis_config_payment_category" ON "public"."nhis_config" USING "btree" ("payment_category");



CREATE INDEX "idx_nhis_hmos_name" ON "public"."nhis_hmos" USING "btree" ("name");



CREATE INDEX "idx_nhis_medicines_code" ON "public"."nhis_medicines" USING "btree" ("code");



CREATE INDEX "idx_nhis_medicines_name" ON "public"."nhis_medicines" USING "btree" ("name");



CREATE INDEX "idx_nhis_procedures_code" ON "public"."nhis_procedures" USING "btree" ("code");



CREATE INDEX "idx_nhis_procedures_name" ON "public"."nhis_procedures" USING "btree" ("name");



CREATE INDEX "idx_nhis_procedures_type" ON "public"."nhis_procedures" USING "btree" ("type");



CREATE INDEX "idx_notification_prefs_user" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_encounter" ON "public"."notifications" USING "btree" ("encounter_id");



CREATE INDEX "idx_notifications_patient" ON "public"."notifications" USING "btree" ("patient_id");



CREATE INDEX "idx_notifications_target_role" ON "public"."notifications" USING "btree" ("target_role") WHERE ("is_dismissed" = false);



CREATE INDEX "idx_notifications_target_user" ON "public"."notifications" USING "btree" ("target_user_id") WHERE ("is_dismissed" = false);



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("target_user_id", "is_read") WHERE ("is_dismissed" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_nursing_audit_encounter" ON "public"."nursing_audit_log" USING "btree" ("encounter_id");



CREATE INDEX "idx_nursing_audit_user" ON "public"."nursing_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_nursing_notes_created_at" ON "public"."nursing_notes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_nursing_notes_critical" ON "public"."nursing_notes" USING "btree" ("is_critical") WHERE ("is_critical" = true);



CREATE INDEX "idx_nursing_notes_encounter" ON "public"."nursing_notes" USING "btree" ("encounter_id");



CREATE INDEX "idx_nursing_notes_encounter_id" ON "public"."nursing_notes" USING "btree" ("encounter_id");



CREATE INDEX "idx_nursing_notes_patient" ON "public"."nursing_notes" USING "btree" ("patient_id");



CREATE INDEX "idx_nursing_notes_patient_id" ON "public"."nursing_notes" USING "btree" ("patient_id");



CREATE INDEX "idx_nursing_notes_recorded_by" ON "public"."nursing_notes" USING "btree" ("recorded_by");



CREATE INDEX "idx_nursing_notes_requires_review" ON "public"."nursing_notes" USING "btree" ("requires_doctor_review") WHERE ("requires_doctor_review" = true);



CREATE INDEX "idx_nursing_notes_shift" ON "public"."nursing_notes" USING "btree" ("shift", "shift_date");



CREATE INDEX "idx_nursing_notes_treatment_plan" ON "public"."nursing_notes" USING "btree" ("treatment_plan_id");



CREATE INDEX "idx_on_call_active" ON "public"."on_call_schedule" USING "btree" ("department", "start_time", "end_time") WHERE ("is_active" = true);



CREATE INDEX "idx_on_call_staff" ON "public"."on_call_schedule" USING "btree" ("staff_id") WHERE ("is_active" = true);



CREATE INDEX "idx_patients_contact_phone" ON "public"."patients" USING "btree" ("contact_phone");



CREATE INDEX "idx_patients_course" ON "public"."patients" USING "btree" ("course") WHERE ("course" IS NOT NULL);



CREATE INDEX "idx_patients_emr_number" ON "public"."patients" USING "btree" ("emr_number");



CREATE INDEX "idx_patients_first_name" ON "public"."patients" USING "btree" ("first_name");



CREATE INDEX "idx_patients_search" ON "public"."patients" USING "btree" ("surname", "first_name", "patient_id", "emr_number", "contact_phone");



CREATE INDEX "idx_patients_surname" ON "public"."patients" USING "btree" ("surname");



CREATE INDEX "idx_pcc_consultation" ON "public"."patient_chief_complaints" USING "btree" ("consultation_id");



CREATE INDEX "idx_pcc_emr" ON "public"."patient_chief_complaints" USING "btree" ("emr_number");



CREATE INDEX "idx_pcc_encounter" ON "public"."patient_chief_complaints" USING "btree" ("encounter_id");



CREATE INDEX "idx_pcc_patient" ON "public"."patient_chief_complaints" USING "btree" ("patient_id");



CREATE INDEX "idx_pcc_primary" ON "public"."patient_chief_complaints" USING "btree" ("encounter_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_physio_assessments_created_at" ON "public"."physio_assessments" USING "btree" ("created_at");



CREATE INDEX "idx_physio_assessments_encounter" ON "public"."physio_assessments" USING "btree" ("encounter_id");



CREATE INDEX "idx_physio_assessments_facility" ON "public"."physio_assessments" USING "btree" ("facility_id");



CREATE INDEX "idx_physio_assessments_patient" ON "public"."physio_assessments" USING "btree" ("patient_id");



CREATE INDEX "idx_physio_assessments_status" ON "public"."physio_assessments" USING "btree" ("status");



CREATE INDEX "idx_physio_discharge_date" ON "public"."physio_discharge" USING "btree" ("discharge_date");



CREATE INDEX "idx_physio_discharge_patient" ON "public"."physio_discharge" USING "btree" ("patient_id");



CREATE INDEX "idx_physio_plans_assessment" ON "public"."physio_plans" USING "btree" ("assessment_id");



CREATE INDEX "idx_physio_plans_patient" ON "public"."physio_plans" USING "btree" ("patient_id");



CREATE INDEX "idx_physio_plans_status" ON "public"."physio_plans" USING "btree" ("status");



CREATE INDEX "idx_physio_progress_assessment" ON "public"."physio_progress" USING "btree" ("assessment_id");



CREATE INDEX "idx_physio_progress_date" ON "public"."physio_progress" USING "btree" ("evaluation_date");



CREATE INDEX "idx_physio_progress_patient" ON "public"."physio_progress" USING "btree" ("patient_id");



CREATE INDEX "idx_physio_sessions_attendance" ON "public"."physio_sessions" USING "btree" ("attendance_status");



CREATE INDEX "idx_physio_sessions_date" ON "public"."physio_sessions" USING "btree" ("session_date");



CREATE INDEX "idx_physio_sessions_patient" ON "public"."physio_sessions" USING "btree" ("patient_id");



CREATE INDEX "idx_physio_sessions_plan" ON "public"."physio_sessions" USING "btree" ("plan_id");



CREATE INDEX "idx_prescriptions_diagnosis" ON "public"."prescriptions" USING "gin" ("diagnosis");



CREATE INDEX "idx_prescriptions_dispensed_date" ON "public"."prescriptions" USING "btree" ("dispensed_date") WHERE ("dispensed_date" IS NOT NULL);



CREATE INDEX "idx_prescriptions_encounter" ON "public"."prescriptions" USING "btree" ("encounter_id");



CREATE INDEX "idx_prescriptions_encounter_id" ON "public"."prescriptions" USING "btree" ("encounter_id");



CREATE INDEX "idx_prescriptions_patient_id" ON "public"."prescriptions" USING "btree" ("patient_id");



CREATE INDEX "idx_prescriptions_patient_status" ON "public"."prescriptions" USING "btree" ("patient_id", "status", "created_at" DESC);



CREATE INDEX "idx_prescriptions_status" ON "public"."prescriptions" USING "btree" ("status");



CREATE INDEX "idx_prescriptions_visit_id" ON "public"."prescriptions" USING "btree" ("visit_id");



CREATE INDEX "idx_proc_catalogue_active" ON "public"."procedure_catalogue" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_proc_catalogue_category" ON "public"."procedure_catalogue" USING "btree" ("category");



CREATE INDEX "idx_proc_catalogue_code" ON "public"."procedure_catalogue" USING "btree" ("code");



CREATE INDEX "idx_proc_catalogue_facility" ON "public"."procedure_catalogue" USING "btree" ("facility_id");



CREATE INDEX "idx_procedure_catalogue_category" ON "public"."procedure_catalogue" USING "btree" ("category");



CREATE INDEX "idx_procedure_catalogue_code" ON "public"."procedure_catalogue" USING "btree" ("code");



CREATE INDEX "idx_procedure_catalogue_name" ON "public"."procedure_catalogue" USING "btree" ("name");



CREATE INDEX "idx_procedure_requests_consultation_id" ON "public"."procedure_requests" USING "btree" ("consultation_id");



CREATE INDEX "idx_procedure_requests_encounter_id" ON "public"."procedure_requests" USING "btree" ("encounter_id");



CREATE INDEX "idx_procedures_admission" ON "public"."procedures" USING "btree" ("admission_id");



CREATE INDEX "idx_procedures_catalogue" ON "public"."procedures" USING "btree" ("catalogue_id");



CREATE INDEX "idx_procedures_encounter" ON "public"."procedures" USING "btree" ("encounter_id");



CREATE INDEX "idx_procedures_facility" ON "public"."procedures" USING "btree" ("facility_id");



CREATE INDEX "idx_procedures_number" ON "public"."procedures" USING "btree" ("procedure_number");



CREATE INDEX "idx_procedures_patient" ON "public"."procedures" USING "btree" ("patient_id");



CREATE INDEX "idx_procedures_pending" ON "public"."procedures" USING "btree" ("status", "scheduled_date") WHERE (("status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'pre_op'::character varying])::"text"[]));



CREATE INDEX "idx_procedures_scheduled" ON "public"."procedures" USING "btree" ("scheduled_date");



CREATE INDEX "idx_procedures_status" ON "public"."procedures" USING "btree" ("status");



CREATE INDEX "idx_procedures_surgeon" ON "public"."procedures" USING "btree" ("primary_surgeon_id");



CREATE INDEX "idx_progress_notes_alert" ON "public"."daily_progress_notes" USING "btree" ("alert_level") WHERE (("alert_level")::"text" <> 'normal'::"text");



CREATE INDEX "idx_progress_notes_date" ON "public"."daily_progress_notes" USING "btree" ("note_date" DESC);



CREATE INDEX "idx_queue_created_at" ON "public"."queue" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_queue_department_id" ON "public"."queue" USING "btree" ("department_id");



CREATE INDEX "idx_queue_encounter_id" ON "public"."queue" USING "btree" ("encounter_id");



CREATE INDEX "idx_queue_location" ON "public"."queue" USING "btree" ("location");



COMMENT ON INDEX "public"."idx_queue_location" IS 'Index for queue location lookups including specialty departments';



CREATE INDEX "idx_queue_patient_id" ON "public"."queue" USING "btree" ("patient_id");



CREATE INDEX "idx_queue_status" ON "public"."queue" USING "btree" ("status");



CREATE INDEX "idx_queue_status_loc" ON "public"."queue" USING "btree" ("status", "location");



CREATE INDEX "idx_radiology_requests_diagnosis" ON "public"."radiology_requests" USING "gin" ("diagnosis");



CREATE INDEX "idx_radiology_requests_encounter" ON "public"."radiology_requests" USING "btree" ("encounter_id");



CREATE INDEX "idx_radiology_requests_encounter_id" ON "public"."radiology_requests" USING "btree" ("encounter_id");



CREATE INDEX "idx_radiology_requests_patient_id" ON "public"."radiology_requests" USING "btree" ("patient_id");



CREATE INDEX "idx_radiology_requests_status" ON "public"."radiology_requests" USING "btree" ("status");



CREATE INDEX "idx_radiology_requests_visit_id" ON "public"."radiology_requests" USING "btree" ("visit_id");



CREATE INDEX "idx_receipts_billing_order_id" ON "public"."receipts" USING "btree" ("billing_order_id");



CREATE INDEX "idx_receipts_encounter_id" ON "public"."receipts" USING "btree" ("encounter_id");



CREATE INDEX "idx_referral_outcomes_referral" ON "public"."referral_outcomes" USING "btree" ("referral_id");



CREATE INDEX "idx_referrals_parent" ON "public"."referrals" USING "btree" ("parent_referral_id") WHERE ("parent_referral_id" IS NOT NULL);



CREATE INDEX "idx_scan_results_encounter" ON "public"."scan_results" USING "btree" ("encounter_id");



CREATE INDEX "idx_service_price_audit_changed_at" ON "public"."service_price_audit" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_service_price_audit_service" ON "public"."service_price_audit" USING "btree" ("service_type", "service_id");



CREATE INDEX "idx_shift_handover_encounter" ON "public"."shift_handover" USING "btree" ("encounter_id");



CREATE INDEX "idx_shift_handovers_date" ON "public"."shift_handovers" USING "btree" ("shift_date");



CREATE INDEX "idx_shift_handovers_encounter" ON "public"."shift_handovers" USING "btree" ("encounter_id");



CREATE INDEX "idx_shift_handovers_incoming" ON "public"."shift_handovers" USING "btree" ("incoming_nurse_id");



CREATE INDEX "idx_shift_handovers_outgoing" ON "public"."shift_handovers" USING "btree" ("outgoing_nurse_id");



CREATE INDEX "idx_shift_handovers_status" ON "public"."shift_handovers" USING "btree" ("status");



CREATE INDEX "idx_staff_department" ON "public"."staff" USING "btree" ("department");



CREATE INDEX "idx_staff_department_id" ON "public"."staff" USING "btree" ("department_id");



CREATE INDEX "idx_staff_is_active" ON "public"."staff" USING "btree" ("is_active");



CREATE INDEX "idx_staff_last_activity" ON "public"."staff" USING "btree" ("last_activity") WHERE ("role" = 'doctor'::"public"."user_role");



CREATE INDEX "idx_staff_role" ON "public"."staff" USING "btree" ("role");



CREATE INDEX "idx_stock_movements_batch" ON "public"."inventory_stock_movements" USING "btree" ("batch_id");



CREATE INDEX "idx_stock_movements_date" ON "public"."inventory_stock_movements" USING "btree" ("created_at");



CREATE INDEX "idx_stock_movements_drug" ON "public"."inventory_stock_movements" USING "btree" ("drug_id");



CREATE INDEX "idx_stock_movements_encounter" ON "public"."inventory_stock_movements" USING "btree" ("encounter_id");



CREATE INDEX "idx_stock_movements_item" ON "public"."inventory_stock_movements" USING "btree" ("item_id");



CREATE INDEX "idx_stock_movements_patient" ON "public"."inventory_stock_movements" USING "btree" ("patient_id");



CREATE INDEX "idx_stock_movements_type" ON "public"."inventory_stock_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_transfers_admission" ON "public"."bed_transfers" USING "btree" ("admission_id");



CREATE INDEX "idx_transfers_date" ON "public"."bed_transfers" USING "btree" ("transfer_date");



CREATE INDEX "idx_transfers_encounter" ON "public"."encounter_transfers" USING "btree" ("encounter_id");



CREATE INDEX "idx_transfers_from_doctor" ON "public"."encounter_transfers" USING "btree" ("from_doctor_id");



CREATE INDEX "idx_transfers_from_ward" ON "public"."bed_transfers" USING "btree" ("from_ward_id");



CREATE INDEX "idx_transfers_to_doctor" ON "public"."encounter_transfers" USING "btree" ("to_doctor_id") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_transfers_to_ward" ON "public"."bed_transfers" USING "btree" ("to_ward_id");



CREATE INDEX "idx_treatment_plans_encounter" ON "public"."treatment_plans" USING "btree" ("encounter_id");



CREATE INDEX "idx_treatment_plans_encounter_id" ON "public"."treatment_plans" USING "btree" ("encounter_id");



CREATE INDEX "idx_treatment_plans_patient_id" ON "public"."treatment_plans" USING "btree" ("patient_id");



CREATE INDEX "idx_treatment_plans_status" ON "public"."treatment_plans" USING "btree" ("status");



CREATE INDEX "idx_treatment_tasks_encounter" ON "public"."treatment_tasks" USING "btree" ("encounter_id");



CREATE INDEX "idx_treatment_tasks_started_at" ON "public"."treatment_tasks" USING "btree" ("started_at") WHERE ("started_at" IS NOT NULL);



CREATE INDEX "idx_treatment_tasks_status_plan" ON "public"."treatment_tasks" USING "btree" ("plan_id", "status");



CREATE INDEX "idx_visits_admission_date" ON "public"."visits" USING "btree" ("admission_date");



CREATE INDEX "idx_visits_clinic_status" ON "public"."visits" USING "btree" ("clinic_id", "status") WHERE ("status" = 'Active'::"public"."visit_status");



CREATE INDEX "idx_visits_created_at" ON "public"."visits" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_visits_current_stage" ON "public"."visits" USING "btree" ("current_stage");



CREATE INDEX "idx_visits_doctor_status" ON "public"."visits" USING "btree" ("attending_doctor_id", "status") WHERE ("status" = 'Active'::"public"."visit_status");



CREATE INDEX "idx_visits_encounter_category" ON "public"."visits" USING "btree" ("encounter_category");



CREATE INDEX "idx_visits_encounter_date" ON "public"."visits" USING "btree" ("encounter_date" DESC);



CREATE INDEX "idx_visits_insurance_type" ON "public"."visits" USING "btree" ("insurance_type");



CREATE INDEX "idx_visits_opd_class" ON "public"."visits" USING "btree" ("opd_classification") WHERE ("opd_classification" IS NOT NULL);



CREATE INDEX "idx_visits_patient" ON "public"."visits" USING "btree" ("patient_id");



CREATE INDEX "idx_visits_patient_id" ON "public"."visits" USING "btree" ("patient_id");



CREATE INDEX "idx_visits_patient_status" ON "public"."visits" USING "btree" ("patient_id", "status");



CREATE INDEX "idx_visits_patient_status_date" ON "public"."visits" USING "btree" ("patient_id", "status", "encounter_date" DESC);



CREATE INDEX "idx_visits_status" ON "public"."visits" USING "btree" ("status");



CREATE INDEX "idx_visits_status_stage" ON "public"."visits" USING "btree" ("status", "current_stage");



CREATE INDEX "idx_vital_schedules_encounter" ON "public"."patient_vital_schedules" USING "btree" ("encounter_id");



CREATE INDEX "idx_vital_schedules_next_due" ON "public"."patient_vital_schedules" USING "btree" ("next_vitals_due") WHERE (("is_active" = true) AND ("paused" = false));



CREATE INDEX "idx_vital_schedules_nurse" ON "public"."patient_vital_schedules" USING "btree" ("assigned_nurse_id") WHERE ("is_active" = true);



CREATE INDEX "idx_vital_schedules_overdue" ON "public"."patient_vital_schedules" USING "btree" ("is_overdue", "is_active") WHERE (("is_overdue" = true) AND ("is_active" = true));



CREATE INDEX "idx_vital_schedules_patient" ON "public"."patient_vital_schedules" USING "btree" ("patient_id");



CREATE INDEX "idx_vitals_date_recorded" ON "public"."vitals" USING "btree" ("date_recorded" DESC);



CREATE INDEX "idx_vitals_encounter" ON "public"."vitals" USING "btree" ("encounter_id");



CREATE INDEX "idx_vitals_encounter_id" ON "public"."vitals" USING "btree" ("encounter_id");



CREATE INDEX "idx_vitals_encounter_patient" ON "public"."vitals" USING "btree" ("encounter_id", "patient_id");



CREATE INDEX "idx_vitals_patient_id" ON "public"."vitals" USING "btree" ("patient_id");



CREATE INDEX "idx_ward_rounds_admission" ON "public"."ward_round_notes" USING "btree" ("admission_id");



CREATE INDEX "idx_ward_rounds_date" ON "public"."ward_round_notes" USING "btree" ("round_date");



CREATE INDEX "idx_ward_rounds_physician" ON "public"."ward_round_notes" USING "btree" ("attending_physician_id");



CREATE INDEX "idx_wards_active" ON "public"."wards" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_wards_facility" ON "public"."wards" USING "btree" ("facility_id");



CREATE INDEX "idx_wards_type" ON "public"."wards" USING "btree" ("ward_type");



CREATE OR REPLACE TRIGGER "audit_medication_administration" AFTER INSERT OR DELETE OR UPDATE ON "public"."medication_administration" FOR EACH ROW EXECUTE FUNCTION "public"."log_nursing_action"();



CREATE OR REPLACE TRIGGER "audit_nursing_notes" AFTER INSERT OR DELETE OR UPDATE ON "public"."nursing_notes" FOR EACH ROW EXECUTE FUNCTION "public"."log_nursing_action"();



CREATE OR REPLACE TRIGGER "audit_shift_handover" AFTER INSERT OR DELETE OR UPDATE ON "public"."shift_handover" FOR EACH ROW EXECUTE FUNCTION "public"."log_nursing_action"();



CREATE OR REPLACE TRIGGER "audit_vitals" AFTER INSERT OR DELETE OR UPDATE ON "public"."vitals" FOR EACH ROW EXECUTE FUNCTION "public"."log_nursing_action"();



CREATE OR REPLACE TRIGGER "prevent_access_log_update" BEFORE DELETE OR UPDATE ON "public"."encounter_access_logs" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_access_log_modification"();



CREATE OR REPLACE TRIGGER "specialty_referral_routing" BEFORE UPDATE ON "public"."clinical_requests" FOR EACH ROW EXECUTE FUNCTION "public"."route_to_specialty_queue"();



CREATE OR REPLACE TRIGGER "trg_admission_patient_status" AFTER INSERT ON "public"."admissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_patient_status_on_admission"();



CREATE OR REPLACE TRIGGER "trg_clinical_request_number" BEFORE INSERT ON "public"."clinical_requests" FOR EACH ROW EXECUTE FUNCTION "public"."generate_clinical_request_number"();



CREATE OR REPLACE TRIGGER "trg_clinical_request_sla" BEFORE INSERT ON "public"."clinical_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_clinical_request_sla"();



CREATE OR REPLACE TRIGGER "trg_clinical_request_status_change" AFTER UPDATE ON "public"."clinical_requests" FOR EACH ROW EXECUTE FUNCTION "public"."track_clinical_request_status_change"();



CREATE OR REPLACE TRIGGER "trg_clinical_requests_updated_at" BEFORE UPDATE ON "public"."clinical_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_discharge_patient_status" AFTER UPDATE ON "public"."admissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_patient_status_on_discharge"();



CREATE OR REPLACE TRIGGER "trg_external_referral_number" BEFORE INSERT ON "public"."external_referrals" FOR EACH ROW EXECUTE FUNCTION "public"."generate_external_referral_number"();



CREATE OR REPLACE TRIGGER "trg_external_referrals_updated_at" BEFORE UPDATE ON "public"."external_referrals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_generate_emr_number" BEFORE INSERT ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."generate_emr_number"();



CREATE OR REPLACE TRIGGER "trg_generate_encounter_number" BEFORE INSERT ON "public"."visits" FOR EACH ROW EXECUTE FUNCTION "public"."generate_encounter_number"();



CREATE OR REPLACE TRIGGER "trg_generate_visit_id" BEFORE INSERT ON "public"."visits" FOR EACH ROW EXECUTE FUNCTION "public"."generate_visit_id"();



CREATE OR REPLACE TRIGGER "trg_single_primary_complaint" BEFORE INSERT OR UPDATE ON "public"."patient_chief_complaints" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_single_primary_complaint"();



CREATE OR REPLACE TRIGGER "trg_sync_drug_stock" AFTER INSERT OR DELETE OR UPDATE ON "public"."drug_batches" FOR EACH ROW EXECUTE FUNCTION "public"."sync_drug_stock_quantity"();



CREATE OR REPLACE TRIGGER "trg_validate_billing_item" BEFORE INSERT OR UPDATE ON "public"."billing_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_billing_item"();



CREATE OR REPLACE TRIGGER "trigger_assign_bed_on_admission" AFTER INSERT OR UPDATE ON "public"."admissions" FOR EACH ROW EXECUTE FUNCTION "public"."assign_bed_on_admission"();



CREATE OR REPLACE TRIGGER "trigger_auto_add_on_call" AFTER INSERT OR UPDATE ON "public"."on_call_schedule" FOR EACH ROW WHEN (("new"."is_active" = true)) EXECUTE FUNCTION "public"."auto_add_on_call_to_care_team"();



CREATE OR REPLACE TRIGGER "trigger_auto_assign_shift" BEFORE INSERT ON "public"."nursing_notes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_shift_to_note"();



CREATE OR REPLACE TRIGGER "trigger_auto_deactivate_expired" BEFORE UPDATE ON "public"."encounter_care_team" FOR EACH ROW WHEN (("new"."expires_at" IS NOT NULL)) EXECUTE FUNCTION "public"."auto_deactivate_expired_access"();



CREATE OR REPLACE TRIGGER "trigger_create_vital_schedule" AFTER INSERT OR UPDATE OF "visit_type", "status" ON "public"."visits" FOR EACH ROW EXECUTE FUNCTION "public"."create_vital_schedule_on_admission"();



CREATE OR REPLACE TRIGGER "trigger_doctor_orders_updated_at" BEFORE UPDATE ON "public"."doctor_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_doctor_orders_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_log_care_team_change" BEFORE INSERT OR UPDATE ON "public"."encounter_care_team" FOR EACH ROW EXECUTE FUNCTION "public"."log_care_team_change"();



CREATE OR REPLACE TRIGGER "trigger_log_ownership_change" AFTER UPDATE ON "public"."visits" FOR EACH ROW EXECUTE FUNCTION "public"."log_ownership_change"();



CREATE OR REPLACE TRIGGER "trigger_notify_critical_result" AFTER UPDATE ON "public"."lab_requests" FOR EACH ROW EXECUTE FUNCTION "public"."notify_critical_result"();



CREATE OR REPLACE TRIGGER "trigger_notify_shift_handover" AFTER INSERT ON "public"."shift_handovers" FOR EACH ROW EXECUTE FUNCTION "public"."notify_shift_handover"();



CREATE OR REPLACE TRIGGER "trigger_notify_treatment_plan" AFTER INSERT ON "public"."treatment_plans" FOR EACH ROW EXECUTE FUNCTION "public"."notify_treatment_plan_created"();



CREATE OR REPLACE TRIGGER "trigger_nursing_notes_updated_at" BEFORE UPDATE ON "public"."nursing_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_nursing_notes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_prevent_on_call_overlap" BEFORE INSERT OR UPDATE ON "public"."on_call_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_on_call_overlap"();



CREATE OR REPLACE TRIGGER "trigger_progress_notes_updated_at" BEFORE UPDATE ON "public"."daily_progress_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_progress_notes_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_sync_shift_dates" BEFORE INSERT OR UPDATE ON "public"."shift_handovers" FOR EACH ROW EXECUTE FUNCTION "public"."sync_shift_handover_dates"();



CREATE OR REPLACE TRIGGER "trigger_update_vital_schedule" BEFORE INSERT ON "public"."vitals" FOR EACH ROW EXECUTE FUNCTION "public"."update_vital_schedule_on_record"();



CREATE OR REPLACE TRIGGER "trigger_update_ward_bed_counts" AFTER INSERT OR DELETE OR UPDATE ON "public"."beds" FOR EACH ROW EXECUTE FUNCTION "public"."update_ward_bed_counts"();



CREATE OR REPLACE TRIGGER "update_dental_chart_updated_at" BEFORE UPDATE ON "public"."dental_chart" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dental_exams_updated_at" BEFORE UPDATE ON "public"."dental_exams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dental_procedures_updated_at" BEFORE UPDATE ON "public"."dental_procedures" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_eye_exams_updated_at" BEFORE UPDATE ON "public"."eye_exams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_eye_procedures_updated_at" BEFORE UPDATE ON "public"."eye_procedures" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_physio_assessments_updated_at" BEFORE UPDATE ON "public"."physio_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_physio_plans_updated_at" BEFORE UPDATE ON "public"."physio_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_physio_progress_updated_at" BEFORE UPDATE ON "public"."physio_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_physio_sessions_updated_at" BEFORE UPDATE ON "public"."physio_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."billing_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."clinics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."consultations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."customer_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."dispenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."drug_catalogue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."imaging_catalogue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."inventory_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."lab_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."lab_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."lab_test_catalogue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."medical_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."prescriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."queue" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."radiology_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."referrals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."report_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."scan_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."system_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."treatment_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."treatment_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."triage_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."visits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."vitals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_updated_at_timestamp" BEFORE UPDATE ON "public"."workflow_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "visit_specialty_routing" AFTER INSERT OR UPDATE OF "attending_doctor_id" ON "public"."visits" FOR EACH ROW EXECUTE FUNCTION "public"."route_visit_to_specialty"();



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_admitting_doctor_id_fkey" FOREIGN KEY ("admitting_doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_attending_physician_id_fkey" FOREIGN KEY ("attending_physician_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_clinical_request_id_fkey" FOREIGN KEY ("clinical_request_id") REFERENCES "public"."clinical_requests"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_current_bed_id_fkey" FOREIGN KEY ("current_bed_id") REFERENCES "public"."beds"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_current_ward_id_fkey" FOREIGN KEY ("current_ward_id") REFERENCES "public"."wards"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_discharged_by_fkey" FOREIGN KEY ("discharged_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_primary_nurse_id_fkey" FOREIGN KEY ("primary_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."admissions"
    ADD CONSTRAINT "admissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_authorized_by_fkey" FOREIGN KEY ("authorized_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_from_bed_id_fkey" FOREIGN KEY ("from_bed_id") REFERENCES "public"."beds"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_from_ward_id_fkey" FOREIGN KEY ("from_ward_id") REFERENCES "public"."wards"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_to_bed_id_fkey" FOREIGN KEY ("to_bed_id") REFERENCES "public"."beds"("id");



ALTER TABLE ONLY "public"."bed_transfers"
    ADD CONSTRAINT "bed_transfers_to_ward_id_fkey" FOREIGN KEY ("to_ward_id") REFERENCES "public"."wards"("id");



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "beds_current_patient_id_fkey" FOREIGN KEY ("current_patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "beds_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_audit_log"
    ADD CONSTRAINT "billing_audit_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."billing_items"
    ADD CONSTRAINT "billing_items_adjusted_by_fkey" FOREIGN KEY ("adjusted_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."billing_items"
    ADD CONSTRAINT "billing_items_billing_order_id_fkey" FOREIGN KEY ("billing_order_id") REFERENCES "public"."billing_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_items"
    ADD CONSTRAINT "billing_items_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."billing_orders"
    ADD CONSTRAINT "billing_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."billing_orders"
    ADD CONSTRAINT "billing_orders_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."billing_orders"
    ADD CONSTRAINT "billing_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."billing_orders"
    ADD CONSTRAINT "billing_orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."clinical_request_status_history"
    ADD CONSTRAINT "clinical_request_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_request_status_history"
    ADD CONSTRAINT "clinical_request_status_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."clinical_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_follow_up_visit_id_fkey" FOREIGN KEY ("follow_up_visit_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_procedure_catalogue_id_fkey" FOREIGN KEY ("procedure_catalogue_id") REFERENCES "public"."procedure_catalogue"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_requesting_department_id_fkey" FOREIGN KEY ("requesting_department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_requesting_doctor_id_fkey" FOREIGN KEY ("requesting_doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_target_doctor_id_fkey" FOREIGN KEY ("target_doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."clinical_requests"
    ADD CONSTRAINT "clinical_requests_target_ward_id_fkey" FOREIGN KEY ("target_ward_id") REFERENCES "public"."wards"("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."clinics"
    ADD CONSTRAINT "clinics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_nurse_acknowledged_by_fkey" FOREIGN KEY ("nurse_acknowledged_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."customer_feedback"
    ADD CONSTRAINT "customer_feedback_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."customer_feedback"
    ADD CONSTRAINT "customer_feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."daily_progress_notes"
    ADD CONSTRAINT "daily_progress_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_progress_notes"
    ADD CONSTRAINT "daily_progress_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_progress_notes"
    ADD CONSTRAINT "daily_progress_notes_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."dental_chart"
    ADD CONSTRAINT "dental_chart_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_chart"
    ADD CONSTRAINT "dental_chart_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."dental_exams"("exam_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dental_chart"
    ADD CONSTRAINT "dental_chart_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_chart"
    ADD CONSTRAINT "dental_chart_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_exams"
    ADD CONSTRAINT "dental_exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_dispensed_by_fkey" FOREIGN KEY ("dispensed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."dental_exams"("exam_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_prescriptions"
    ADD CONSTRAINT "dental_prescriptions_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."dental_procedures"("procedure_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_assisted_by_fkey" FOREIGN KEY ("assisted_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."dental_exams"("exam_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."dental_procedures"
    ADD CONSTRAINT "dental_procedures_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dispense_items"
    ADD CONSTRAINT "dispense_items_dispense_id_fkey" FOREIGN KEY ("dispense_id") REFERENCES "public"."dispenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dispense_items"
    ADD CONSTRAINT "dispense_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "public"."drug_catalogue"("id");



ALTER TABLE ONLY "public"."dispense_items"
    ADD CONSTRAINT "dispense_items_prescription_item_id_fkey" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id");



ALTER TABLE ONLY "public"."dispense_records"
    ADD CONSTRAINT "dispense_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."drug_batches"("batch_id");



ALTER TABLE ONLY "public"."dispense_records"
    ADD CONSTRAINT "dispense_records_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "public"."drug_catalogue"("id");



ALTER TABLE ONLY "public"."dispense_records"
    ADD CONSTRAINT "dispense_records_original_drug_id_fkey" FOREIGN KEY ("original_drug_id") REFERENCES "public"."drug_catalogue"("id");



ALTER TABLE ONLY "public"."dispenses"
    ADD CONSTRAINT "dispenses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."dispenses"
    ADD CONSTRAINT "dispenses_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."dispenses"
    ADD CONSTRAINT "dispenses_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("prescription_id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_assigned_nurse_id_fkey" FOREIGN KEY ("assigned_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("visit_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."doctor_orders"
    ADD CONSTRAINT "doctor_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."drug_batches"
    ADD CONSTRAINT "drug_batches_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "public"."drug_catalogue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drug_catalogue"
    ADD CONSTRAINT "drug_catalogue_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."encounter_access_logs"
    ADD CONSTRAINT "encounter_access_logs_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."encounter_access_logs"
    ADD CONSTRAINT "encounter_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."encounter_care_team"
    ADD CONSTRAINT "encounter_care_team_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."encounter_care_team"
    ADD CONSTRAINT "encounter_care_team_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."encounter_care_team"
    ADD CONSTRAINT "encounter_care_team_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."encounter_transfers"
    ADD CONSTRAINT "encounter_transfers_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."encounter_transfers"
    ADD CONSTRAINT "encounter_transfers_from_doctor_id_fkey" FOREIGN KEY ("from_doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."encounter_transfers"
    ADD CONSTRAINT "encounter_transfers_to_doctor_id_fkey" FOREIGN KEY ("to_doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."encounter_transfers"
    ADD CONSTRAINT "encounter_transfers_transferred_by_fkey" FOREIGN KEY ("transferred_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_internal_department_id_fkey" FOREIGN KEY ("internal_department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_internal_physician_id_fkey" FOREIGN KEY ("internal_physician_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."external_referrals"
    ADD CONSTRAINT "external_referrals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_exams"
    ADD CONSTRAINT "eye_exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_dispensed_by_fkey" FOREIGN KEY ("dispensed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."eye_exams"("exam_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."eye_prescriptions"
    ADD CONSTRAINT "eye_prescriptions_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."eye_exams"("exam_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."eye_procedures"
    ADD CONSTRAINT "eye_procedures_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."beds"
    ADD CONSTRAINT "fk_beds_current_admission" FOREIGN KEY ("current_admission_id") REFERENCES "public"."admissions"("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "fk_consultations_clinic" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("clinic_id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "fk_consultations_doctor" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "fk_consultations_encounter" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "fk_consultations_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "fk_consultations_visit" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("visit_id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "fk_dept_head" FOREIGN KEY ("head_of_department") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "fk_lab_requests_ordered_by" FOREIGN KEY ("ordered_by") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "fk_lab_requests_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "fk_lab_requests_visit" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("visit_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_invoice" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("invoice_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_received_by" FOREIGN KEY ("received_by") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "fk_prescriptions_doctor" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "fk_prescriptions_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "fk_prescriptions_visit" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("visit_id");



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "fk_radiology_requests_ordered_by" FOREIGN KEY ("ordered_by") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "fk_radiology_requests_patient" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "fk_radiology_requests_performed_by" FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "fk_radiology_requests_visit" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("visit_id");



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "fk_stock_movements_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."drug_batches"("batch_id");



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "fk_treatment_plans_encounter" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "fk_treatment_tasks_encounter" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "fk_vitals_encounter" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."imaging_catalogue"
    ADD CONSTRAINT "imaging_catalogue_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."inventory_categories"
    ADD CONSTRAINT "inventory_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."inventory_categories"("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."inventory_categories"("id");



ALTER TABLE ONLY "public"."inventory_stock_movements"
    ADD CONSTRAINT "inventory_stock_movements_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "public"."drug_catalogue"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("invoice_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_request_items"
    ADD CONSTRAINT "lab_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."lab_requests"("request_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_request_items"
    ADD CONSTRAINT "lab_request_items_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."lab_test_catalogue"("id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "lab_requests_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "lab_requests_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."lab_requests"
    ADD CONSTRAINT "lab_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."lab_requests"("request_id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."lab_test_catalogue"("id");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."lab_test_catalogue"
    ADD CONSTRAINT "lab_test_catalogue_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."medical_reports"
    ADD CONSTRAINT "medical_reports_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."medical_reports"
    ADD CONSTRAINT "medical_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."medical_reports"
    ADD CONSTRAINT "medical_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."medical_reports"
    ADD CONSTRAINT "medical_reports_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."medication_administration"
    ADD CONSTRAINT "medication_administration_administered_by_fkey" FOREIGN KEY ("administered_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."medication_administration"
    ADD CONSTRAINT "medication_administration_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."medication_administration"
    ADD CONSTRAINT "medication_administration_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."medication_administration"
    ADD CONSTRAINT "medication_administration_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("prescription_id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."nursing_audit_log"
    ADD CONSTRAINT "nursing_audit_log_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id");



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_doctor_reviewed_by_fkey" FOREIGN KEY ("doctor_reviewed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_treatment_plan_id_fkey" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id");



ALTER TABLE ONLY "public"."nursing_notes"
    ADD CONSTRAINT "nursing_notes_treatment_task_id_fkey" FOREIGN KEY ("treatment_task_id") REFERENCES "public"."treatment_tasks"("id");



ALTER TABLE ONLY "public"."on_call_schedule"
    ADD CONSTRAINT "on_call_schedule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."on_call_schedule"
    ADD CONSTRAINT "on_call_schedule_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "patient_chief_complaints_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "public"."chief_complaint_catalogue"("complaint_id");



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "patient_chief_complaints_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id");



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "patient_chief_complaints_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "patient_chief_complaints_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id");



ALTER TABLE ONLY "public"."patient_chief_complaints"
    ADD CONSTRAINT "patient_chief_complaints_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_assigned_nurse_id_fkey" FOREIGN KEY ("assigned_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_vital_schedules"
    ADD CONSTRAINT "patient_vital_schedules_paused_by_fkey" FOREIGN KEY ("paused_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_principal_id_fkey" FOREIGN KEY ("principal_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_assessments"
    ADD CONSTRAINT "physio_assessments_referral_doctor_id_fkey" FOREIGN KEY ("referral_doctor_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_discharge"
    ADD CONSTRAINT "physio_discharge_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."physio_assessments"("assessment_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_discharge"
    ADD CONSTRAINT "physio_discharge_discharged_by_fkey" FOREIGN KEY ("discharged_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_discharge"
    ADD CONSTRAINT "physio_discharge_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_discharge"
    ADD CONSTRAINT "physio_discharge_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_discharge"
    ADD CONSTRAINT "physio_discharge_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."physio_plans"("plan_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."physio_assessments"("assessment_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_plans"
    ADD CONSTRAINT "physio_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."physio_assessments"("assessment_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."physio_plans"("plan_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_progress"
    ADD CONSTRAINT "physio_progress_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."physio_assessments"("assessment_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."physio_plans"("plan_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_supervised_by_fkey" FOREIGN KEY ("supervised_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."physio_sessions"
    ADD CONSTRAINT "physio_sessions_treated_by_fkey" FOREIGN KEY ("treated_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "public"."drug_catalogue"("id");



ALTER TABLE ONLY "public"."prescription_items"
    ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("prescription_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id");



ALTER TABLE ONLY "public"."prescriptions"
    ADD CONSTRAINT "prescriptions_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."procedure_catalogue"
    ADD CONSTRAINT "procedure_catalogue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedure_catalogue"
    ADD CONSTRAINT "procedure_catalogue_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."procedure_catalogue"
    ADD CONSTRAINT "procedure_catalogue_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedure_consumables"
    ADD CONSTRAINT "procedure_consumables_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id");



ALTER TABLE ONLY "public"."procedure_consumables"
    ADD CONSTRAINT "procedure_consumables_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_consumables"
    ADD CONSTRAINT "procedure_consumables_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedure_requests"
    ADD CONSTRAINT "procedure_requests_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id");



ALTER TABLE ONLY "public"."procedure_requests"
    ADD CONSTRAINT "procedure_requests_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_anesthesiologist_id_fkey" FOREIGN KEY ("anesthesiologist_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_catalogue_id_fkey" FOREIGN KEY ("catalogue_id") REFERENCES "public"."procedure_catalogue"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_circulating_nurse_id_fkey" FOREIGN KEY ("circulating_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_clinical_request_id_fkey" FOREIGN KEY ("clinical_request_id") REFERENCES "public"."clinical_requests"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_consent_obtained_by_fkey" FOREIGN KEY ("consent_obtained_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_primary_surgeon_id_fkey" FOREIGN KEY ("primary_surgeon_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_scrub_nurse_id_fkey" FOREIGN KEY ("scrub_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."queue"
    ADD CONSTRAINT "queue_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."radiology_request_items"
    ADD CONSTRAINT "radiology_request_items_imaging_id_fkey" FOREIGN KEY ("imaging_id") REFERENCES "public"."imaging_catalogue"("id");



ALTER TABLE ONLY "public"."radiology_request_items"
    ADD CONSTRAINT "radiology_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."radiology_requests"("request_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "radiology_requests_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id");



ALTER TABLE ONLY "public"."radiology_requests"
    ADD CONSTRAINT "radiology_requests_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_billing_order_id_fkey" FOREIGN KEY ("billing_order_id") REFERENCES "public"."billing_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("invoice_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."staff"("staff_id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("patient_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("visit_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."referral_outcomes"
    ADD CONSTRAINT "referral_outcomes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."referral_outcomes"
    ADD CONSTRAINT "referral_outcomes_external_referral_id_fkey" FOREIGN KEY ("external_referral_id") REFERENCES "public"."external_referrals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_outcomes"
    ADD CONSTRAINT "referral_outcomes_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_parent_referral_id_fkey" FOREIGN KEY ("parent_referral_id") REFERENCES "public"."referrals"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_receiving_physician_id_fkey" FOREIGN KEY ("receiving_physician_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referring_physician_id_fkey" FOREIGN KEY ("referring_physician_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_source_department_id_fkey" FOREIGN KEY ("source_department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_target_department_id_fkey" FOREIGN KEY ("target_department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."scan_results"
    ADD CONSTRAINT "scan_results_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_results"
    ADD CONSTRAINT "scan_results_imaging_id_fkey" FOREIGN KEY ("imaging_id") REFERENCES "public"."imaging_catalogue"("id");



ALTER TABLE ONLY "public"."scan_results"
    ADD CONSTRAINT "scan_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."scan_results"
    ADD CONSTRAINT "scan_results_radiologist_id_fkey" FOREIGN KEY ("radiologist_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."scan_results"
    ADD CONSTRAINT "scan_results_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."radiology_requests"("request_id");



ALTER TABLE ONLY "public"."service_price_audit"
    ADD CONSTRAINT "service_price_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."shift_handover"
    ADD CONSTRAINT "shift_handover_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."shift_handover"
    ADD CONSTRAINT "shift_handover_from_nurse_id_fkey" FOREIGN KEY ("from_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."shift_handover"
    ADD CONSTRAINT "shift_handover_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."shift_handover"
    ADD CONSTRAINT "shift_handover_to_nurse_id_fkey" FOREIGN KEY ("to_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."shift_handovers"
    ADD CONSTRAINT "shift_handovers_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shift_handovers"
    ADD CONSTRAINT "shift_handovers_incoming_nurse_id_fkey" FOREIGN KEY ("incoming_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."shift_handovers"
    ADD CONSTRAINT "shift_handovers_outgoing_nurse_id_fkey" FOREIGN KEY ("outgoing_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."shift_handovers"
    ADD CONSTRAINT "shift_handovers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."system_configurations"
    ADD CONSTRAINT "system_configurations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."config_categories"("id");



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("consultation_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatment_plans"
    ADD CONSTRAINT "treatment_plans_viewed_by_fkey" FOREIGN KEY ("viewed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "treatment_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "treatment_tasks_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "treatment_tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "treatment_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."treatment_tasks"
    ADD CONSTRAINT "treatment_tasks_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."triage_assessments"
    ADD CONSTRAINT "triage_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."triage_assessments"
    ADD CONSTRAINT "triage_assessments_triaged_by_fkey" FOREIGN KEY ("triaged_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."triage_assessments"
    ADD CONSTRAINT "triage_assessments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_attending_doctor_id_fkey" FOREIGN KEY ("attending_doctor_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id");



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visits"
    ADD CONSTRAINT "visits_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id");



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."patient_vital_schedules"("id");



ALTER TABLE ONLY "public"."ward_round_notes"
    ADD CONSTRAINT "ward_round_notes_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ward_round_notes"
    ADD CONSTRAINT "ward_round_notes_attending_physician_id_fkey" FOREIGN KEY ("attending_physician_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."ward_round_notes"
    ADD CONSTRAINT "ward_round_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."ward_round_notes"
    ADD CONSTRAINT "ward_round_notes_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "public"."visits"("id");



ALTER TABLE ONLY "public"."ward_round_notes"
    ADD CONSTRAINT "ward_round_notes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."wards"
    ADD CONSTRAINT "wards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."wards"
    ADD CONSTRAINT "wards_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wards"
    ADD CONSTRAINT "wards_head_nurse_id_fkey" FOREIGN KEY ("head_nurse_id") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."wards"
    ADD CONSTRAINT "wards_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."workflow_exceptions"
    ADD CONSTRAINT "workflow_exceptions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."staff"("id");



ALTER TABLE ONLY "public"."workflow_exceptions"
    ADD CONSTRAINT "workflow_exceptions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."staff"("id");



CREATE POLICY "Admins can manage facilities" ON "public"."facilities" USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));



CREATE POLICY "Admins can manage procedure catalogue" ON "public"."procedure_catalogue" USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));



CREATE POLICY "Admins can manage wards" ON "public"."wards" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));



CREATE POLICY "All authenticated can view wards" ON "public"."wards" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "All staff can view procedure catalogue" ON "public"."procedure_catalogue" FOR SELECT USING ((("facility_id" IS NULL) OR ("facility_id" IN ( SELECT "staff"."facility_id"
   FROM "public"."staff"
  WHERE ("staff"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow admin to manage courses" ON "public"."courses" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'medical_director'::"public"."user_role", 'config_admin'::"public"."user_role"]))))));



CREATE POLICY "Allow all access" ON "public"."appointments" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."billing_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."billing_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."clinics" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."config_categories" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."consultations" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."customer_feedback" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."departments" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."dispense_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."dispenses" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."drug_catalogue" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."imaging_catalogue" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."inventory_categories" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."inventory_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."lab_request_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."lab_requests" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."lab_results" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."lab_test_catalogue" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."medical_reports" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."notifications" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."patients" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."payments" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."prescription_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."prescriptions" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."queue" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."radiology_request_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."radiology_requests" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."referrals" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."report_templates" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."scan_results" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."staff" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."system_configurations" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."triage_assessments" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."visits" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access" ON "public"."workflow_exceptions" USING (true) WITH CHECK (true);



CREATE POLICY "Allow read access to courses" ON "public"."courses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view facilities" ON "public"."facilities" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Clinical staff can manage consumables" ON "public"."procedure_consumables" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff" "s"
     JOIN "public"."procedures" "p" ON (("p"."facility_id" = "s"."facility_id")))
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'doctor'::"public"."user_role", 'nurse'::"public"."user_role"])) AND ("p"."id" = "procedure_consumables"."procedure_id")))));



CREATE POLICY "Clinical staff can view admissions" ON "public"."admissions" FOR SELECT USING (("facility_id" IN ( SELECT "staff"."facility_id"
   FROM "public"."staff"
  WHERE ("staff"."user_id" = "auth"."uid"()))));



CREATE POLICY "Clinical staff can view consumables" ON "public"."procedure_consumables" FOR SELECT USING (("procedure_id" IN ( SELECT "procedures"."id"
   FROM "public"."procedures"
  WHERE ("procedures"."facility_id" IN ( SELECT "staff"."facility_id"
           FROM "public"."staff"
          WHERE ("staff"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Clinical staff can view procedures" ON "public"."procedures" FOR SELECT USING (("facility_id" IN ( SELECT "staff"."facility_id"
   FROM "public"."staff"
  WHERE ("staff"."user_id" = "auth"."uid"()))));



CREATE POLICY "Clinical staff can view transfers" ON "public"."bed_transfers" FOR SELECT USING (("admission_id" IN ( SELECT "admissions"."id"
   FROM "public"."admissions"
  WHERE ("admissions"."facility_id" IN ( SELECT "staff"."facility_id"
           FROM "public"."staff"
          WHERE ("staff"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Clinical staff can view ward round notes" ON "public"."ward_round_notes" FOR SELECT USING (("admission_id" IN ( SELECT "admissions"."id"
   FROM "public"."admissions"
  WHERE ("admissions"."facility_id" IN ( SELECT "staff"."facility_id"
           FROM "public"."staff"
          WHERE ("staff"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Doctors and nurses can manage admissions" ON "public"."admissions" USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'doctor'::"public"."user_role", 'nurse'::"public"."user_role"])) AND ("staff"."facility_id" = "admissions"."facility_id")))));



CREATE POLICY "Doctors can manage procedures" ON "public"."procedures" USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'doctor'::"public"."user_role"])) AND ("staff"."facility_id" = "procedures"."facility_id")))));



CREATE POLICY "Doctors can manage ward round notes" ON "public"."ward_round_notes" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff" "s"
     JOIN "public"."admissions" "a" ON (("a"."facility_id" = "s"."facility_id")))
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'doctor'::"public"."user_role"])) AND ("a"."id" = "ward_round_notes"."admission_id")))));



CREATE POLICY "Nurses and admins can manage beds" ON "public"."beds" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff" "s"
     JOIN "public"."wards" "w" ON (("w"."facility_id" = "s"."facility_id")))
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'nurse'::"public"."user_role"])) AND ("w"."id" = "beds"."ward_id")))));



CREATE POLICY "Nurses and admins can manage transfers" ON "public"."bed_transfers" USING ((EXISTS ( SELECT 1
   FROM ("public"."staff" "s"
     JOIN "public"."admissions" "a" ON (("a"."facility_id" = "s"."facility_id")))
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role", 'nurse'::"public"."user_role"])) AND ("a"."id" = "bed_transfers"."admission_id")))));



CREATE POLICY "Users can view beds in their facility" ON "public"."beds" FOR SELECT USING (("ward_id" IN ( SELECT "wards"."id"
   FROM "public"."wards"
  WHERE ("wards"."facility_id" IN ( SELECT "staff"."facility_id"
           FROM "public"."staff"
          WHERE ("staff"."user_id" = "auth"."uid"()))))));



CREATE POLICY "access_logs_all_access" ON "public"."encounter_access_logs" USING (true) WITH CHECK (true);



ALTER TABLE "public"."admissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_insert_super_admin" ON "public"."service_price_audit" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "audit_select_all" ON "public"."service_price_audit" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."bed_transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_audit_log_insert_policy" ON "public"."billing_audit_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "billing_audit_log_select_policy" ON "public"."billing_audit_log" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."billing_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "care_team_all_access" ON "public"."encounter_care_team" USING (true) WITH CHECK (true);



CREATE POLICY "catalogue_modify_super_admin" ON "public"."chief_complaint_catalogue" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "catalogue_select_all" ON "public"."chief_complaint_catalogue" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."chief_complaint_catalogue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clinical_request_history_insert" ON "public"."clinical_request_status_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "clinical_request_history_select" ON "public"."clinical_request_status_history" FOR SELECT USING (true);



ALTER TABLE "public"."clinical_request_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clinical_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clinical_requests_insert" ON "public"."clinical_requests" FOR INSERT WITH CHECK (true);



CREATE POLICY "clinical_requests_select" ON "public"."clinical_requests" FOR SELECT USING (true);



CREATE POLICY "clinical_requests_update" ON "public"."clinical_requests" FOR UPDATE USING (true);



ALTER TABLE "public"."clinics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clinics_select_all" ON "public"."clinics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "clinics_update_super_admin" ON "public"."clinics" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."config_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_progress_notes_insert" ON "public"."daily_progress_notes" FOR INSERT WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



CREATE POLICY "daily_progress_notes_select" ON "public"."daily_progress_notes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "daily_progress_notes_update" ON "public"."daily_progress_notes" FOR UPDATE USING ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id"))) WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



ALTER TABLE "public"."dental_chart" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dental_chart_all_policy" ON "public"."dental_chart" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."dental_exams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dental_exams_insert_policy" ON "public"."dental_exams" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "dental_exams_select_policy" ON "public"."dental_exams" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "dental_exams_update_policy" ON "public"."dental_exams" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND ("finalized_at" IS NULL)));



ALTER TABLE "public"."dental_prescriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dental_prescriptions_all_policy" ON "public"."dental_prescriptions" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."dental_procedures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dental_procedures_all_policy" ON "public"."dental_procedures" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispense_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dispenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drug_catalogue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "drug_insert_super_admin" ON "public"."drug_catalogue" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "drug_select_all" ON "public"."drug_catalogue" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "drug_update_super_admin" ON "public"."drug_catalogue" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."encounter_access_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."encounter_care_team" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."encounter_transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."external_referrals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "external_referrals_insert" ON "public"."external_referrals" FOR INSERT WITH CHECK (true);



CREATE POLICY "external_referrals_select" ON "public"."external_referrals" FOR SELECT USING (true);



CREATE POLICY "external_referrals_update" ON "public"."external_referrals" FOR UPDATE USING (true);



ALTER TABLE "public"."eye_exams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eye_exams_insert_policy" ON "public"."eye_exams" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "eye_exams_select_policy" ON "public"."eye_exams" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "eye_exams_update_policy" ON "public"."eye_exams" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND ("finalized_at" IS NULL)));



ALTER TABLE "public"."eye_prescriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eye_prescriptions_all_policy" ON "public"."eye_prescriptions" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."eye_procedures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "eye_procedures_all_policy" ON "public"."eye_procedures" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."imaging_catalogue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "imaging_insert_super_admin" ON "public"."imaging_catalogue" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "imaging_select_all" ON "public"."imaging_catalogue" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "imaging_update_super_admin" ON "public"."imaging_catalogue" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."inventory_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_insert_super_admin" ON "public"."lab_test_catalogue" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."lab_request_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_select_all" ON "public"."lab_test_catalogue" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."lab_test_catalogue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_update_super_admin" ON "public"."lab_test_catalogue" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff" "s"
  WHERE (("s"."user_id" = "auth"."uid"()) AND ("s"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "med_admin_insert" ON "public"."medication_administration" FOR INSERT WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



CREATE POLICY "med_admin_select" ON "public"."medication_administration" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "med_admin_update" ON "public"."medication_administration" FOR UPDATE USING ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id"))) WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



ALTER TABLE "public"."medical_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."medication_administration" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_policy" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "notifications_select_policy" ON "public"."notifications" FOR SELECT USING ((("target_user_id" = "auth"."uid"()) OR ("target_user_id" IS NULL)));



CREATE POLICY "notifications_update_policy" ON "public"."notifications" FOR UPDATE USING ((("target_user_id" = "auth"."uid"()) OR ("target_user_id" IS NULL)));



CREATE POLICY "nursing_audit_admin_only" ON "public"."nursing_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'medical_director'::"public"."user_role"]))))));



CREATE POLICY "nursing_audit_insert" ON "public"."nursing_audit_log" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."nursing_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nursing_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nursing_notes_delete_policy" ON "public"."nursing_notes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "nursing_notes_insert_policy" ON "public"."nursing_notes" FOR INSERT WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



CREATE POLICY "nursing_notes_select_policy" ON "public"."nursing_notes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "nursing_notes_update_policy" ON "public"."nursing_notes" FOR UPDATE USING ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id") AND (("recorded_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'medical_director'::"public"."user_role"])))))))) WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



CREATE POLICY "on_call_all_access" ON "public"."on_call_schedule" USING (true) WITH CHECK (true);



ALTER TABLE "public"."on_call_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_chief_complaints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_vital_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pcc_delete_all" ON "public"."patient_chief_complaints" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "pcc_insert_all" ON "public"."patient_chief_complaints" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "pcc_select_all" ON "public"."patient_chief_complaints" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "pcc_update_all" ON "public"."patient_chief_complaints" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."physio_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_assessments_insert_policy" ON "public"."physio_assessments" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "physio_assessments_select_policy" ON "public"."physio_assessments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "physio_assessments_update_policy" ON "public"."physio_assessments" FOR UPDATE USING ((("auth"."role"() = 'authenticated'::"text") AND ("finalized_at" IS NULL)));



ALTER TABLE "public"."physio_discharge" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_discharge_all_policy" ON "public"."physio_discharge" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."physio_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_plans_all_policy" ON "public"."physio_plans" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."physio_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_progress_all_policy" ON "public"."physio_progress" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."physio_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "physio_sessions_all_policy" ON "public"."physio_sessions" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."prescription_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."procedure_catalogue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."procedure_consumables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."procedures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."radiology_request_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."radiology_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_outcomes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "referral_outcomes_insert" ON "public"."referral_outcomes" FOR INSERT WITH CHECK (true);



CREATE POLICY "referral_outcomes_select" ON "public"."referral_outcomes" FOR SELECT USING (true);



ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scan_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_price_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shift_config_select_policy" ON "public"."shift_configurations" FOR SELECT USING (true);



ALTER TABLE "public"."shift_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shift_handover" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shift_handover_insert" ON "public"."shift_handover" FOR INSERT WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id") AND (EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE ((("staff"."user_id" = "auth"."uid"()) OR ("staff"."id" = "auth"."uid"())) AND ("staff"."role" = 'nurse'::"public"."user_role"))))));



CREATE POLICY "shift_handover_select" ON "public"."shift_handover" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "shift_handover_update" ON "public"."shift_handover" FOR UPDATE USING ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id"))) WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



ALTER TABLE "public"."shift_handovers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shift_handovers_insert" ON "public"."shift_handovers" FOR INSERT WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id") AND (EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE ((("staff"."user_id" = "auth"."uid"()) OR ("staff"."id" = "auth"."uid"())) AND ("staff"."role" = 'nurse'::"public"."user_role"))))));



CREATE POLICY "shift_handovers_insert_policy" ON "public"."shift_handovers" FOR INSERT WITH CHECK (true);



CREATE POLICY "shift_handovers_select" ON "public"."shift_handovers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "shift_handovers_select_policy" ON "public"."shift_handovers" FOR SELECT USING (true);



CREATE POLICY "shift_handovers_update" ON "public"."shift_handovers" FOR UPDATE USING ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id"))) WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



CREATE POLICY "shift_handovers_update_policy" ON "public"."shift_handovers" FOR UPDATE USING (true);



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_configurations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transfers_all_access" ON "public"."encounter_transfers" USING (true) WITH CHECK (true);



ALTER TABLE "public"."treatment_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "treatment_plans_insert" ON "public"."treatment_plans" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['doctor'::"public"."user_role", 'medical_director'::"public"."user_role", 'super_admin'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "treatment_plans_select" ON "public"."treatment_plans" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "treatment_plans_update" ON "public"."treatment_plans" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['doctor'::"public"."user_role", 'medical_director'::"public"."user_role", 'super_admin'::"public"."user_role", 'admin'::"public"."user_role"]))))));



ALTER TABLE "public"."treatment_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "treatment_tasks_insert" ON "public"."treatment_tasks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['doctor'::"public"."user_role", 'medical_director'::"public"."user_role", 'super_admin'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "treatment_tasks_select" ON "public"."treatment_tasks" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "treatment_tasks_update" ON "public"."treatment_tasks" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['doctor'::"public"."user_role", 'medical_director'::"public"."user_role", 'super_admin'::"public"."user_role", 'admin'::"public"."user_role"]))))) OR ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = 'nurse'::"public"."user_role")))) AND ("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id"))));



ALTER TABLE "public"."triage_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vital_configs_select_policy" ON "public"."vital_schedule_configs" FOR SELECT USING (true);



ALTER TABLE "public"."vital_schedule_configs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vital_schedules_insert_policy" ON "public"."patient_vital_schedules" FOR INSERT WITH CHECK (true);



CREATE POLICY "vital_schedules_select_policy" ON "public"."patient_vital_schedules" FOR SELECT USING (true);



CREATE POLICY "vital_schedules_update_policy" ON "public"."patient_vital_schedules" FOR UPDATE USING (true);



ALTER TABLE "public"."vitals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vitals_admin_delete" ON "public"."vitals" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."staff"
  WHERE (("staff"."user_id" = "auth"."uid"()) AND ("staff"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "vitals_nurse_insert" ON "public"."vitals" FOR INSERT WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



CREATE POLICY "vitals_nurse_select" ON "public"."vitals" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "vitals_nurse_update" ON "public"."vitals" FOR UPDATE USING ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id"))) WITH CHECK ((("encounter_id" IS NOT NULL) AND "public"."is_encounter_writable"("encounter_id")));



ALTER TABLE "public"."ward_round_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_exceptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."billing_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."billing_orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."consultations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."inventory_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lab_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."patients";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."prescriptions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."queue";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."radiology_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."receipts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."visits";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."vitals";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."assign_bed_on_admission"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_bed_on_admission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_bed_on_admission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_on_call_to_care_team"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_on_call_to_care_team"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_on_call_to_care_team"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_shift_to_note"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_shift_to_note"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_shift_to_note"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_deactivate_expired_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_deactivate_expired_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_deactivate_expired_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_vitals_due"("p_schedule_id" "uuid", "p_from_time" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_vitals_due"("p_schedule_id" "uuid", "p_from_time" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_vitals_due"("p_schedule_id" "uuid", "p_from_time" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_nhis_amounts"("p_gross_amount" numeric, "p_insurance_type" character varying, "p_service_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_nhis_amounts"("p_gross_amount" numeric, "p_insurance_type" character varying, "p_service_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_nhis_amounts"("p_gross_amount" numeric, "p_insurance_type" character varying, "p_service_type" character varying) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
-- GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_encounter_access"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."check_encounter_access"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_encounter_access"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_overdue_vital_schedules"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_overdue_vital_schedules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_overdue_vital_schedules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_on_call_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_on_call_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_on_call_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_past_on_call_schedules"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_past_on_call_schedules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_past_on_call_schedules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_enum_if_not_exists"("enum_name" "text", "enum_values" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_enum_if_not_exists"("enum_name" "text", "enum_values" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_enum_if_not_exists"("enum_name" "text", "enum_values" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_type" character varying, "p_title" character varying, "p_message" "text", "p_priority" character varying, "p_target_user_id" "uuid", "p_target_role" character varying, "p_target_department" character varying, "p_encounter_id" "uuid", "p_patient_id" character varying, "p_reference_type" character varying, "p_reference_id" "uuid", "p_action_url" character varying, "p_action_label" character varying, "p_created_by" "uuid", "p_expires_at" timestamp with time zone, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_type" character varying, "p_title" character varying, "p_message" "text", "p_priority" character varying, "p_target_user_id" "uuid", "p_target_role" character varying, "p_target_department" character varying, "p_encounter_id" "uuid", "p_patient_id" character varying, "p_reference_type" character varying, "p_reference_id" "uuid", "p_action_url" character varying, "p_action_label" character varying, "p_created_by" "uuid", "p_expires_at" timestamp with time zone, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_type" character varying, "p_title" character varying, "p_message" "text", "p_priority" character varying, "p_target_user_id" "uuid", "p_target_role" character varying, "p_target_department" character varying, "p_encounter_id" "uuid", "p_patient_id" character varying, "p_reference_type" character varying, "p_reference_id" "uuid", "p_action_url" character varying, "p_action_label" character varying, "p_created_by" "uuid", "p_expires_at" timestamp with time zone, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_staff_user"("email_address" "text", "password" "text", "first_name" "text", "last_name" "text", "user_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_staff_user"("email_address" "text", "password" "text", "first_name" "text", "last_name" "text", "user_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_staff_user"("email_address" "text", "password" "text", "first_name" "text", "last_name" "text", "user_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_vital_schedule_on_admission"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_vital_schedule_on_admission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_vital_schedule_on_admission"() TO "service_role";



-- GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
-- GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_single_primary_complaint"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_single_primary_complaint"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_single_primary_complaint"() TO "service_role";



-- GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
-- GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
-- GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
-- GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_admission_number"("facility_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_admission_number"("facility_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_admission_number"("facility_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_beds_for_ward"("p_ward_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_beds_for_ward"("p_ward_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_beds_for_ward"("p_ward_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_category_invoice_number"("p_category" "public"."invoice_category") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_category_invoice_number"("p_category" "public"."invoice_category") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_category_invoice_number"("p_category" "public"."invoice_category") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_category_receipt_number"("p_category" "public"."invoice_category") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_category_receipt_number"("p_category" "public"."invoice_category") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_category_receipt_number"("p_category" "public"."invoice_category") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_clinical_request_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_clinical_request_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_clinical_request_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_emr_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_emr_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_emr_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_encounter_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_encounter_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_encounter_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_external_referral_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_external_referral_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_external_referral_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_procedure_number"("facility_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_procedure_number"("facility_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_procedure_number"("facility_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_visit_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_visit_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_visit_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_on_call_doctors"("p_department" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_on_call_doctors"("p_department" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_on_call_doctors"("p_department" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_shift"("p_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_shift"("p_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_shift"("p_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dispensable_batches"("p_drug_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dispensable_batches"("p_drug_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dispensable_batches"("p_drug_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_drug_available_stock"("p_drug_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_drug_available_stock"("p_drug_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_drug_available_stock"("p_drug_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_encounter_access_summary"("p_encounter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_encounter_access_summary"("p_encounter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_encounter_access_summary"("p_encounter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_encounter_complaints"("p_encounter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_encounter_complaints"("p_encounter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_encounter_complaints"("p_encounter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_on_call_compliance_report"("p_department" character varying, "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_on_call_compliance_report"("p_department" character varying, "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_on_call_compliance_report"("p_department" character varying, "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_overdue_vitals"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_overdue_vitals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_overdue_vitals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pharmacy_inventory_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pharmacy_inventory_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pharmacy_inventory_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shift_date"("p_timestamp" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_shift_date"("p_timestamp" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shift_date"("p_timestamp" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid", "p_user_role" character varying, "p_user_department" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



-- GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
-- GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
-- GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
-- GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
-- GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_encounter_writable"("encounter_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_encounter_writable"("encounter_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_encounter_writable"("encounter_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_nurse"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_nurse"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_nurse"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_care_team_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_care_team_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_care_team_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_nursing_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_nursing_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_nursing_action"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_ownership_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_ownership_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_ownership_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_unauthorized_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_unauthorized_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_unauthorized_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_critical_result"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_critical_result"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_critical_result"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_overdue_vitals"("p_schedule_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_overdue_vitals"("p_schedule_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_overdue_vitals"("p_schedule_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_shift_handover"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_shift_handover"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_shift_handover"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_treatment_plan_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_treatment_plan_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_treatment_plan_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."nurse_has_encounter_access"("encounter_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."nurse_has_encounter_access"("encounter_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."nurse_has_encounter_access"("encounter_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



-- GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
-- GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
-- GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_access_log_modification"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_access_log_modification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_access_log_modification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_on_call_overlap"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_on_call_overlap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_on_call_overlap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."route_to_specialty_queue"() TO "anon";
GRANT ALL ON FUNCTION "public"."route_to_specialty_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."route_to_specialty_queue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."route_visit_to_specialty"() TO "anon";
GRANT ALL ON FUNCTION "public"."route_visit_to_specialty"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."route_visit_to_specialty"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_clinical_request_sla"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_clinical_request_sla"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_clinical_request_sla"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_drug_stock_quantity"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_drug_stock_quantity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_drug_stock_quantity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_shift_handover_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_shift_handover_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_shift_handover_dates"() TO "service_role";



-- GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
-- GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_clinical_request_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_clinical_request_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_clinical_request_status_change"() TO "service_role";



-- GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
-- GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



-- GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
-- GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
-- GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
-- GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_category_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_category_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_category_invoice_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_doctor_orders_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_doctor_orders_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_doctor_orders_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_nursing_notes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_nursing_notes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_nursing_notes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_patient_status_on_admission"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_patient_status_on_admission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_patient_status_on_admission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_patient_status_on_discharge"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_patient_status_on_discharge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_patient_status_on_discharge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_progress_notes_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_progress_notes_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_progress_notes_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_vital_schedule_on_record"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_vital_schedule_on_record"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_vital_schedule_on_record"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ward_bed_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ward_bed_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ward_bed_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_billing_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_billing_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_billing_item"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_encounter_active"("p_encounter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_encounter_active"("p_encounter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_encounter_active"("p_encounter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_encounter_action"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_action" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_encounter_action"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_action" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_encounter_action"("p_encounter_id" "uuid", "p_user_id" "uuid", "p_action" character varying) TO "service_role";


















GRANT ALL ON TABLE "public"."admissions" TO "anon";
GRANT ALL ON TABLE "public"."admissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admissions" TO "service_role";



GRANT ALL ON TABLE "public"."beds" TO "anon";
GRANT ALL ON TABLE "public"."beds" TO "authenticated";
GRANT ALL ON TABLE "public"."beds" TO "service_role";



GRANT ALL ON TABLE "public"."billing_items" TO "anon";
GRANT ALL ON TABLE "public"."billing_items" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_items" TO "service_role";



GRANT ALL ON TABLE "public"."billing_orders" TO "anon";
GRANT ALL ON TABLE "public"."billing_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_orders" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."wards" TO "anon";
GRANT ALL ON TABLE "public"."wards" TO "authenticated";
GRANT ALL ON TABLE "public"."wards" TO "service_role";



GRANT ALL ON TABLE "public"."active_admissions_view" TO "anon";
GRANT ALL ON TABLE "public"."active_admissions_view" TO "authenticated";
GRANT ALL ON TABLE "public"."active_admissions_view" TO "service_role";



GRANT ALL ON TABLE "public"."bed_transfers" TO "anon";
GRANT ALL ON TABLE "public"."bed_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."bed_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."visits" TO "anon";
GRANT ALL ON TABLE "public"."visits" TO "authenticated";
GRANT ALL ON TABLE "public"."visits" TO "service_role";



GRANT ALL ON TABLE "public"."ward_round_notes" TO "anon";
GRANT ALL ON TABLE "public"."ward_round_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."ward_round_notes" TO "service_role";



GRANT ALL ON TABLE "public"."admission_history_view" TO "anon";
GRANT ALL ON TABLE "public"."admission_history_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admission_history_view" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_requests" TO "anon";
GRANT ALL ON TABLE "public"."clinical_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_requests" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."admission_requests_view" TO "anon";
GRANT ALL ON TABLE "public"."admission_requests_view" TO "authenticated";
GRANT ALL ON TABLE "public"."admission_requests_view" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."bed_availability" TO "anon";
GRANT ALL ON TABLE "public"."bed_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."bed_availability" TO "service_role";



GRANT ALL ON TABLE "public"."billing_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."billing_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."billing_audit_trail" TO "anon";
GRANT ALL ON TABLE "public"."billing_audit_trail" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_audit_trail" TO "service_role";



GRANT ALL ON TABLE "public"."chief_complaint_catalogue" TO "anon";
GRANT ALL ON TABLE "public"."chief_complaint_catalogue" TO "authenticated";
GRANT ALL ON TABLE "public"."chief_complaint_catalogue" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_request_daily_volume" TO "anon";
GRANT ALL ON TABLE "public"."clinical_request_daily_volume" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_request_daily_volume" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clinical_request_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clinical_request_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clinical_request_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_request_sla_status" TO "anon";
GRANT ALL ON TABLE "public"."clinical_request_sla_status" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_request_sla_status" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_request_stats" TO "anon";
GRANT ALL ON TABLE "public"."clinical_request_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_request_stats" TO "service_role";



GRANT ALL ON TABLE "public"."clinical_request_status_history" TO "anon";
GRANT ALL ON TABLE "public"."clinical_request_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."clinical_request_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."clinics" TO "anon";
GRANT ALL ON TABLE "public"."clinics" TO "authenticated";
GRANT ALL ON TABLE "public"."clinics" TO "service_role";



GRANT ALL ON TABLE "public"."config_categories" TO "anon";
GRANT ALL ON TABLE "public"."config_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."config_categories" TO "service_role";



GRANT ALL ON TABLE "public"."consultations" TO "anon";
GRANT ALL ON TABLE "public"."consultations" TO "authenticated";
GRANT ALL ON TABLE "public"."consultations" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."customer_feedback" TO "anon";
GRANT ALL ON TABLE "public"."customer_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."daily_progress_notes" TO "anon";
GRANT ALL ON TABLE "public"."daily_progress_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_progress_notes" TO "service_role";



GRANT ALL ON TABLE "public"."dental_chart" TO "anon";
GRANT ALL ON TABLE "public"."dental_chart" TO "authenticated";
GRANT ALL ON TABLE "public"."dental_chart" TO "service_role";



GRANT ALL ON TABLE "public"."dental_exams" TO "anon";
GRANT ALL ON TABLE "public"."dental_exams" TO "authenticated";
GRANT ALL ON TABLE "public"."dental_exams" TO "service_role";



GRANT ALL ON TABLE "public"."dental_prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."dental_prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."dental_prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."dental_procedures" TO "anon";
GRANT ALL ON TABLE "public"."dental_procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."dental_procedures" TO "service_role";



GRANT ALL ON TABLE "public"."department_clinical_workload" TO "anon";
GRANT ALL ON TABLE "public"."department_clinical_workload" TO "authenticated";
GRANT ALL ON TABLE "public"."department_clinical_workload" TO "service_role";



GRANT ALL ON TABLE "public"."dispense_items" TO "anon";
GRANT ALL ON TABLE "public"."dispense_items" TO "authenticated";
GRANT ALL ON TABLE "public"."dispense_items" TO "service_role";



GRANT ALL ON TABLE "public"."dispense_records" TO "anon";
GRANT ALL ON TABLE "public"."dispense_records" TO "authenticated";
GRANT ALL ON TABLE "public"."dispense_records" TO "service_role";



GRANT ALL ON TABLE "public"."dispenses" TO "anon";
GRANT ALL ON TABLE "public"."dispenses" TO "authenticated";
GRANT ALL ON TABLE "public"."dispenses" TO "service_role";



GRANT ALL ON TABLE "public"."doctor_orders" TO "anon";
GRANT ALL ON TABLE "public"."doctor_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_orders" TO "service_role";



GRANT ALL ON TABLE "public"."drug_batches" TO "anon";
GRANT ALL ON TABLE "public"."drug_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."drug_batches" TO "service_role";



GRANT ALL ON TABLE "public"."drug_catalogue" TO "anon";
GRANT ALL ON TABLE "public"."drug_catalogue" TO "authenticated";
GRANT ALL ON TABLE "public"."drug_catalogue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."emr_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."emr_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."emr_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."encounter_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_care_team" TO "anon";
GRANT ALL ON TABLE "public"."encounter_care_team" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_care_team" TO "service_role";



GRANT ALL ON SEQUENCE "public"."encounter_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."encounter_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."encounter_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_transfers" TO "anon";
GRANT ALL ON TABLE "public"."encounter_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_ownership_history" TO "anon";
GRANT ALL ON TABLE "public"."encounter_ownership_history" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_ownership_history" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_summary" TO "anon";
GRANT ALL ON TABLE "public"."encounter_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_summary" TO "service_role";



GRANT ALL ON SEQUENCE "public"."external_referral_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."external_referral_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."external_referral_seq" TO "service_role";



GRANT ALL ON TABLE "public"."external_referrals" TO "anon";
GRANT ALL ON TABLE "public"."external_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."external_referrals" TO "service_role";



GRANT ALL ON TABLE "public"."eye_exams" TO "anon";
GRANT ALL ON TABLE "public"."eye_exams" TO "authenticated";
GRANT ALL ON TABLE "public"."eye_exams" TO "service_role";



GRANT ALL ON TABLE "public"."eye_prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."eye_prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."eye_prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."eye_procedures" TO "anon";
GRANT ALL ON TABLE "public"."eye_procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."eye_procedures" TO "service_role";



GRANT ALL ON TABLE "public"."facilities" TO "anon";
GRANT ALL ON TABLE "public"."facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."facilities" TO "service_role";



GRANT ALL ON TABLE "public"."imaging_catalogue" TO "anon";
GRANT ALL ON TABLE "public"."imaging_catalogue" TO "authenticated";
GRANT ALL ON TABLE "public"."imaging_catalogue" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_categories" TO "anon";
GRANT ALL ON TABLE "public"."inventory_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_categories" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."lab_request_items" TO "anon";
GRANT ALL ON TABLE "public"."lab_request_items" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_request_items" TO "service_role";



GRANT ALL ON TABLE "public"."lab_requests" TO "anon";
GRANT ALL ON TABLE "public"."lab_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_requests" TO "service_role";



GRANT ALL ON TABLE "public"."lab_results" TO "anon";
GRANT ALL ON TABLE "public"."lab_results" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_results" TO "service_role";



GRANT ALL ON TABLE "public"."lab_test_catalogue" TO "anon";
GRANT ALL ON TABLE "public"."lab_test_catalogue" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_test_catalogue" TO "service_role";



GRANT ALL ON TABLE "public"."medical_reports" TO "anon";
GRANT ALL ON TABLE "public"."medical_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."medical_reports" TO "service_role";



GRANT ALL ON TABLE "public"."medication_administration" TO "anon";
GRANT ALL ON TABLE "public"."medication_administration" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_administration" TO "service_role";



GRANT ALL ON TABLE "public"."nhis_config" TO "anon";
GRANT ALL ON TABLE "public"."nhis_config" TO "authenticated";
GRANT ALL ON TABLE "public"."nhis_config" TO "service_role";



GRANT ALL ON TABLE "public"."nhis_hmos" TO "anon";
GRANT ALL ON TABLE "public"."nhis_hmos" TO "authenticated";
GRANT ALL ON TABLE "public"."nhis_hmos" TO "service_role";



GRANT ALL ON TABLE "public"."nhis_medicines" TO "anon";
GRANT ALL ON TABLE "public"."nhis_medicines" TO "authenticated";
GRANT ALL ON TABLE "public"."nhis_medicines" TO "service_role";



GRANT ALL ON TABLE "public"."nhis_procedures" TO "anon";
GRANT ALL ON TABLE "public"."nhis_procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."nhis_procedures" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."nursing_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."nursing_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."nursing_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."nursing_notes" TO "anon";
GRANT ALL ON TABLE "public"."nursing_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."nursing_notes" TO "service_role";



GRANT ALL ON TABLE "public"."on_call_schedule" TO "anon";
GRANT ALL ON TABLE "public"."on_call_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."on_call_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."opd_classification_stats" TO "anon";
GRANT ALL ON TABLE "public"."opd_classification_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."opd_classification_stats" TO "service_role";



GRANT ALL ON TABLE "public"."patient_admission_status_view" TO "anon";
GRANT ALL ON TABLE "public"."patient_admission_status_view" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_admission_status_view" TO "service_role";



GRANT ALL ON TABLE "public"."patient_chief_complaints" TO "anon";
GRANT ALL ON TABLE "public"."patient_chief_complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_chief_complaints" TO "service_role";



GRANT ALL ON TABLE "public"."patient_vital_schedules" TO "anon";
GRANT ALL ON TABLE "public"."patient_vital_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_vital_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."pending_clinical_requests" TO "anon";
GRANT ALL ON TABLE "public"."pending_clinical_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_clinical_requests" TO "service_role";



GRANT ALL ON TABLE "public"."physio_assessments" TO "anon";
GRANT ALL ON TABLE "public"."physio_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."physio_discharge" TO "anon";
GRANT ALL ON TABLE "public"."physio_discharge" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_discharge" TO "service_role";



GRANT ALL ON TABLE "public"."physio_plans" TO "anon";
GRANT ALL ON TABLE "public"."physio_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_plans" TO "service_role";



GRANT ALL ON TABLE "public"."physio_progress" TO "anon";
GRANT ALL ON TABLE "public"."physio_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_progress" TO "service_role";



GRANT ALL ON TABLE "public"."physio_sessions" TO "anon";
GRANT ALL ON TABLE "public"."physio_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."physio_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."prescription_items" TO "anon";
GRANT ALL ON TABLE "public"."prescription_items" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_items" TO "service_role";



GRANT ALL ON TABLE "public"."prescriptions" TO "anon";
GRANT ALL ON TABLE "public"."prescriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."prescriptions" TO "service_role";



GRANT ALL ON TABLE "public"."price_list" TO "anon";
GRANT ALL ON TABLE "public"."price_list" TO "authenticated";
GRANT ALL ON TABLE "public"."price_list" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_catalogue" TO "anon";
GRANT ALL ON TABLE "public"."procedure_catalogue" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_catalogue" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_consumables" TO "anon";
GRANT ALL ON TABLE "public"."procedure_consumables" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_consumables" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_requests" TO "anon";
GRANT ALL ON TABLE "public"."procedure_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_requests" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_requests_view" TO "anon";
GRANT ALL ON TABLE "public"."procedure_requests_view" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_requests_view" TO "service_role";



GRANT ALL ON TABLE "public"."procedures" TO "anon";
GRANT ALL ON TABLE "public"."procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."procedures" TO "service_role";



GRANT ALL ON TABLE "public"."queue" TO "anon";
GRANT ALL ON TABLE "public"."queue" TO "authenticated";
GRANT ALL ON TABLE "public"."queue" TO "service_role";



GRANT ALL ON TABLE "public"."radiology_request_items" TO "anon";
GRANT ALL ON TABLE "public"."radiology_request_items" TO "authenticated";
GRANT ALL ON TABLE "public"."radiology_request_items" TO "service_role";



GRANT ALL ON TABLE "public"."radiology_requests" TO "anon";
GRANT ALL ON TABLE "public"."radiology_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."radiology_requests" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."referral_outcomes" TO "anon";
GRANT ALL ON TABLE "public"."referral_outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."report_templates" TO "anon";
GRANT ALL ON TABLE "public"."report_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."report_templates" TO "service_role";



GRANT ALL ON TABLE "public"."scan_results" TO "anon";
GRANT ALL ON TABLE "public"."scan_results" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_results" TO "service_role";



GRANT ALL ON TABLE "public"."service_price_audit" TO "anon";
GRANT ALL ON TABLE "public"."service_price_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."service_price_audit" TO "service_role";



GRANT ALL ON TABLE "public"."shift_configurations" TO "anon";
GRANT ALL ON TABLE "public"."shift_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."shift_handover" TO "anon";
GRANT ALL ON TABLE "public"."shift_handover" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_handover" TO "service_role";



GRANT ALL ON TABLE "public"."shift_handovers" TO "anon";
GRANT ALL ON TABLE "public"."shift_handovers" TO "authenticated";
GRANT ALL ON TABLE "public"."shift_handovers" TO "service_role";



GRANT ALL ON TABLE "public"."system_configurations" TO "anon";
GRANT ALL ON TABLE "public"."system_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."system_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."todays_procedures" TO "anon";
GRANT ALL ON TABLE "public"."todays_procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."todays_procedures" TO "service_role";



GRANT ALL ON TABLE "public"."treatment_plans" TO "anon";
GRANT ALL ON TABLE "public"."treatment_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."treatment_plans" TO "service_role";



GRANT ALL ON TABLE "public"."treatment_tasks" TO "anon";
GRANT ALL ON TABLE "public"."treatment_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."treatment_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."triage_assessments" TO "anon";
GRANT ALL ON TABLE "public"."triage_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."triage_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."v_drug_inventory_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_drug_inventory_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_drug_inventory_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_expired_drugs" TO "anon";
GRANT ALL ON TABLE "public"."v_expired_drugs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_expired_drugs" TO "service_role";



GRANT ALL ON TABLE "public"."v_near_expiry_drugs" TO "anon";
GRANT ALL ON TABLE "public"."v_near_expiry_drugs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_near_expiry_drugs" TO "service_role";



GRANT ALL ON TABLE "public"."v_patient_complaints" TO "anon";
GRANT ALL ON TABLE "public"."v_patient_complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."v_patient_complaints" TO "service_role";



GRANT ALL ON SEQUENCE "public"."visit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."visit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."visit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vital_schedule_configs" TO "anon";
GRANT ALL ON TABLE "public"."vital_schedule_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."vital_schedule_configs" TO "service_role";



GRANT ALL ON TABLE "public"."vital_schedules_summary" TO "anon";
GRANT ALL ON TABLE "public"."vital_schedules_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."vital_schedules_summary" TO "service_role";



GRANT ALL ON TABLE "public"."vitals" TO "anon";
GRANT ALL ON TABLE "public"."vitals" TO "authenticated";
GRANT ALL ON TABLE "public"."vitals" TO "service_role";



GRANT ALL ON TABLE "public"."ward_census" TO "anon";
GRANT ALL ON TABLE "public"."ward_census" TO "authenticated";
GRANT ALL ON TABLE "public"."ward_census" TO "service_role";



GRANT ALL ON TABLE "public"."ward_round_summary_view" TO "anon";
GRANT ALL ON TABLE "public"."ward_round_summary_view" TO "authenticated";
GRANT ALL ON TABLE "public"."ward_round_summary_view" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."workflow_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_exceptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."admissions" drop constraint "admissions_acuity_level_check";

alter table "public"."admissions" drop constraint "admissions_admission_source_check";

alter table "public"."admissions" drop constraint "admissions_admission_status_check";

alter table "public"."admissions" drop constraint "admissions_admission_type_check";

alter table "public"."admissions" drop constraint "admissions_code_status_check";

alter table "public"."admissions" drop constraint "admissions_discharge_type_check";

alter table "public"."bed_transfers" drop constraint "bed_transfers_transfer_reason_check";

alter table "public"."beds" drop constraint "beds_bed_type_check";

alter table "public"."beds" drop constraint "beds_status_check";

alter table "public"."billing_audit_log" drop constraint "billing_audit_log_entity_type_check";

alter table "public"."clinical_requests" drop constraint "clinical_requests_admission_type_check";

alter table "public"."clinical_requests" drop constraint "clinical_requests_level_of_care_check";

alter table "public"."departments" drop constraint "departments_opd_type_check";

alter table "public"."dispense_records" drop constraint "dispense_records_status_check";

alter table "public"."drug_batches" drop constraint "drug_batches_status_check";

alter table "public"."encounter_care_team" drop constraint "encounter_care_team_role_check";

alter table "public"."encounter_transfers" drop constraint "encounter_transfers_status_check";

alter table "public"."encounter_transfers" drop constraint "encounter_transfers_transfer_type_check";

alter table "public"."external_referrals" drop constraint "external_referrals_direction_check";

alter table "public"."external_referrals" drop constraint "external_referrals_status_check";

alter table "public"."external_referrals" drop constraint "external_referrals_urgency_check";

alter table "public"."facilities" drop constraint "facilities_facility_type_check";

alter table "public"."inventory_stock_movements" drop constraint "inventory_stock_movements_movement_type_check";

alter table "public"."medication_administration" drop constraint "medication_administration_status_check";

alter table "public"."patients" drop constraint "patients_current_status_check";

alter table "public"."procedure_catalogue" drop constraint "procedure_catalogue_category_check";

alter table "public"."procedures" drop constraint "procedures_anesthesia_type_check";

alter table "public"."procedures" drop constraint "procedures_laterality_check";

alter table "public"."procedures" drop constraint "procedures_priority_check";

alter table "public"."procedures" drop constraint "procedures_status_check";

alter table "public"."referral_outcomes" drop constraint "referral_outcomes_outcome_type_check";

alter table "public"."shift_handover" drop constraint "shift_handover_shift_type_check";

alter table "public"."ward_round_notes" drop constraint "ward_round_notes_round_type_check";

alter table "public"."wards" drop constraint "wards_gender_restriction_check";

alter table "public"."wards" drop constraint "wards_ward_type_check";

drop index if exists "public"."idx_admissions_active";

drop index if exists "public"."idx_procedures_pending";

CREATE INDEX idx_admissions_active ON public.admissions USING btree (admission_status) WHERE ((admission_status)::text <> ALL ((ARRAY['discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying])::text[]));

CREATE INDEX idx_procedures_pending ON public.procedures USING btree (status, scheduled_date) WHERE ((status)::text = ANY ((ARRAY['scheduled'::character varying, 'pre_op'::character varying])::text[]));

alter table "public"."admissions" add constraint "admissions_acuity_level_check" CHECK (((acuity_level)::text = ANY ((ARRAY['low'::character varying, 'moderate'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))) not valid;

alter table "public"."admissions" validate constraint "admissions_acuity_level_check";

alter table "public"."admissions" add constraint "admissions_admission_source_check" CHECK (((admission_source)::text = ANY ((ARRAY['emergency'::character varying, 'outpatient'::character varying, 'referral'::character varying, 'transfer'::character varying, 'direct'::character varying])::text[]))) not valid;

alter table "public"."admissions" validate constraint "admissions_admission_source_check";

alter table "public"."admissions" add constraint "admissions_admission_status_check" CHECK (((admission_status)::text = ANY ((ARRAY['admitted'::character varying, 'under_observation'::character varying, 'critical'::character varying, 'stable'::character varying, 'improving'::character varying, 'discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying, 'absconded'::character varying])::text[]))) not valid;

alter table "public"."admissions" validate constraint "admissions_admission_status_check";

alter table "public"."admissions" add constraint "admissions_admission_type_check" CHECK (((admission_type)::text = ANY ((ARRAY['emergency'::character varying, 'elective'::character varying, 'transfer'::character varying, 'observation'::character varying, 'day_case'::character varying])::text[]))) not valid;

alter table "public"."admissions" validate constraint "admissions_admission_type_check";

alter table "public"."admissions" add constraint "admissions_code_status_check" CHECK (((code_status)::text = ANY ((ARRAY['full_code'::character varying, 'dnr'::character varying, 'dni'::character varying, 'dnr_dni'::character varying, 'comfort_care'::character varying])::text[]))) not valid;

alter table "public"."admissions" validate constraint "admissions_code_status_check";

alter table "public"."admissions" add constraint "admissions_discharge_type_check" CHECK (((discharge_type)::text = ANY ((ARRAY['home'::character varying, 'transfer'::character varying, 'against_medical_advice'::character varying, 'deceased'::character varying, 'skilled_nursing'::character varying, 'rehabilitation'::character varying, 'hospice'::character varying, 'other'::character varying])::text[]))) not valid;

alter table "public"."admissions" validate constraint "admissions_discharge_type_check";

alter table "public"."bed_transfers" add constraint "bed_transfers_transfer_reason_check" CHECK (((transfer_reason)::text = ANY ((ARRAY['clinical_upgrade'::character varying, 'clinical_downgrade'::character varying, 'bed_availability'::character varying, 'patient_request'::character varying, 'isolation_required'::character varying, 'isolation_cleared'::character varying, 'procedure'::character varying, 'surgery'::character varying, 'discharge_preparation'::character varying, 'other'::character varying])::text[]))) not valid;

alter table "public"."bed_transfers" validate constraint "bed_transfers_transfer_reason_check";

alter table "public"."beds" add constraint "beds_bed_type_check" CHECK (((bed_type)::text = ANY ((ARRAY['standard'::character varying, 'electric'::character varying, 'icu'::character varying, 'pediatric'::character varying, 'bariatric'::character varying, 'low'::character varying, 'stretcher'::character varying, 'crib'::character varying, 'bassinet'::character varying])::text[]))) not valid;

alter table "public"."beds" validate constraint "beds_bed_type_check";

alter table "public"."beds" add constraint "beds_status_check" CHECK (((status)::text = ANY ((ARRAY['Available'::character varying, 'Occupied'::character varying, 'Cleaning'::character varying, 'Maintenance'::character varying, 'Reserved'::character varying])::text[]))) not valid;

alter table "public"."beds" validate constraint "beds_status_check";

alter table "public"."billing_audit_log" add constraint "billing_audit_log_entity_type_check" CHECK (((entity_type)::text = ANY ((ARRAY['billing_item'::character varying, 'billing_order'::character varying, 'category_invoice'::character varying, 'category_receipt'::character varying, 'receipt'::character varying, 'invoice'::character varying])::text[]))) not valid;

alter table "public"."billing_audit_log" validate constraint "billing_audit_log_entity_type_check";

alter table "public"."clinical_requests" add constraint "clinical_requests_admission_type_check" CHECK (((admission_type)::text = ANY ((ARRAY['Emergency'::character varying, 'Elective'::character varying])::text[]))) not valid;

alter table "public"."clinical_requests" validate constraint "clinical_requests_admission_type_check";

alter table "public"."clinical_requests" add constraint "clinical_requests_level_of_care_check" CHECK (((level_of_care)::text = ANY ((ARRAY['Ward'::character varying, 'ICU'::character varying, 'HDU'::character varying, 'NICU'::character varying])::text[]))) not valid;

alter table "public"."clinical_requests" validate constraint "clinical_requests_level_of_care_check";

alter table "public"."departments" add constraint "departments_opd_type_check" CHECK (((opd_type)::text = ANY ((ARRAY['MOPD'::character varying, 'SOPD'::character varying, 'Support'::character varying, 'Diagnostic'::character varying, 'Administrative'::character varying])::text[]))) not valid;

alter table "public"."departments" validate constraint "departments_opd_type_check";

alter table "public"."dispense_records" add constraint "dispense_records_status_check" CHECK (((status)::text = ANY ((ARRAY['dispensed'::character varying, 'returned'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."dispense_records" validate constraint "dispense_records_status_check";

alter table "public"."drug_batches" add constraint "drug_batches_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'depleted'::character varying, 'expired'::character varying, 'recalled'::character varying, 'quarantine'::character varying])::text[]))) not valid;

alter table "public"."drug_batches" validate constraint "drug_batches_status_check";

alter table "public"."encounter_care_team" add constraint "encounter_care_team_role_check" CHECK (((role)::text = ANY ((ARRAY['primary_doctor'::character varying, 'co_managing_doctor'::character varying, 'consulting_doctor'::character varying, 'on_call_doctor'::character varying, 'department_doctor'::character varying, 'referred_doctor'::character varying, 'nurse'::character varying, 'lab_technician'::character varying, 'radiologist'::character varying, 'pharmacist'::character varying])::text[]))) not valid;

alter table "public"."encounter_care_team" validate constraint "encounter_care_team_role_check";

alter table "public"."encounter_transfers" add constraint "encounter_transfers_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[]))) not valid;

alter table "public"."encounter_transfers" validate constraint "encounter_transfers_status_check";

alter table "public"."encounter_transfers" add constraint "encounter_transfers_transfer_type_check" CHECK (((transfer_type)::text = ANY ((ARRAY['reassignment'::character varying, 'co_management'::character varying, 'consultation'::character varying, 'handoff'::character varying])::text[]))) not valid;

alter table "public"."encounter_transfers" validate constraint "encounter_transfers_transfer_type_check";

alter table "public"."external_referrals" add constraint "external_referrals_direction_check" CHECK (((direction)::text = ANY ((ARRAY['incoming'::character varying, 'outgoing'::character varying])::text[]))) not valid;

alter table "public"."external_referrals" validate constraint "external_referrals_direction_check";

alter table "public"."external_referrals" add constraint "external_referrals_status_check" CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Accepted'::character varying, 'InProgress'::character varying, 'Completed'::character varying, 'Rejected'::character varying, 'Cancelled'::character varying])::text[]))) not valid;

alter table "public"."external_referrals" validate constraint "external_referrals_status_check";

alter table "public"."external_referrals" add constraint "external_referrals_urgency_check" CHECK (((urgency)::text = ANY ((ARRAY['Routine'::character varying, 'Urgent'::character varying, 'Emergency'::character varying])::text[]))) not valid;

alter table "public"."external_referrals" validate constraint "external_referrals_urgency_check";

alter table "public"."facilities" add constraint "facilities_facility_type_check" CHECK (((facility_type)::text = ANY ((ARRAY['hospital'::character varying, 'clinic'::character varying, 'laboratory'::character varying, 'pharmacy'::character varying, 'diagnostic_center'::character varying, 'other'::character varying])::text[]))) not valid;

alter table "public"."facilities" validate constraint "facilities_facility_type_check";

alter table "public"."inventory_stock_movements" add constraint "inventory_stock_movements_movement_type_check" CHECK (((movement_type)::text = ANY ((ARRAY['IN'::character varying, 'OUT'::character varying, 'ADJUSTMENT'::character varying, 'TRANSFER'::character varying, 'RETURN'::character varying, 'EXPIRED'::character varying, 'DAMAGED'::character varying])::text[]))) not valid;

alter table "public"."inventory_stock_movements" validate constraint "inventory_stock_movements_movement_type_check";

alter table "public"."medication_administration" add constraint "medication_administration_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'given'::character varying, 'refused'::character varying, 'held'::character varying, 'missed'::character varying])::text[]))) not valid;

alter table "public"."medication_administration" validate constraint "medication_administration_status_check";

alter table "public"."patients" add constraint "patients_current_status_check" CHECK (((current_status)::text = ANY ((ARRAY['OPD'::character varying, 'In-Patient'::character varying, 'Discharged'::character varying, 'Deceased'::character varying])::text[]))) not valid;

alter table "public"."patients" validate constraint "patients_current_status_check";

alter table "public"."procedure_catalogue" add constraint "procedure_catalogue_category_check" CHECK (((category)::text = ANY ((ARRAY['surgical'::character varying, 'diagnostic'::character varying, 'therapeutic'::character varying, 'minor'::character varying, 'major'::character varying, 'endoscopy'::character varying, 'biopsy'::character varying, 'injection'::character varying, 'infusion'::character varying, 'wound_care'::character varying, 'cardiovascular'::character varying, 'orthopedic'::character varying, 'neurological'::character varying, 'obstetric'::character varying, 'other'::character varying])::text[]))) not valid;

alter table "public"."procedure_catalogue" validate constraint "procedure_catalogue_category_check";

alter table "public"."procedures" add constraint "procedures_anesthesia_type_check" CHECK (((anesthesia_type)::text = ANY ((ARRAY['none'::character varying, 'local'::character varying, 'regional'::character varying, 'sedation'::character varying, 'general'::character varying, 'spinal'::character varying, 'epidural'::character varying])::text[]))) not valid;

alter table "public"."procedures" validate constraint "procedures_anesthesia_type_check";

alter table "public"."procedures" add constraint "procedures_laterality_check" CHECK (((laterality)::text = ANY ((ARRAY['left'::character varying, 'right'::character varying, 'bilateral'::character varying, 'na'::character varying])::text[]))) not valid;

alter table "public"."procedures" validate constraint "procedures_laterality_check";

alter table "public"."procedures" add constraint "procedures_priority_check" CHECK (((priority)::text = ANY ((ARRAY['emergency'::character varying, 'urgent'::character varying, 'routine'::character varying, 'elective'::character varying])::text[]))) not valid;

alter table "public"."procedures" validate constraint "procedures_priority_check";

alter table "public"."procedures" add constraint "procedures_status_check" CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'pre_op'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'postponed'::character varying, 'complications'::character varying])::text[]))) not valid;

alter table "public"."procedures" validate constraint "procedures_status_check";

alter table "public"."referral_outcomes" add constraint "referral_outcomes_outcome_type_check" CHECK (((outcome_type)::text = ANY ((ARRAY['diagnosis_confirmed'::character varying, 'diagnosis_changed'::character varying, 'treatment_initiated'::character varying, 'procedure_performed'::character varying, 'medication_changed'::character varying, 'admission_required'::character varying, 'follow_up_scheduled'::character varying, 'referred_further'::character varying, 'discharged'::character varying, 'other'::character varying])::text[]))) not valid;

alter table "public"."referral_outcomes" validate constraint "referral_outcomes_outcome_type_check";

alter table "public"."shift_handover" add constraint "shift_handover_shift_type_check" CHECK (((shift_type)::text = ANY ((ARRAY['day'::character varying, 'evening'::character varying, 'night'::character varying])::text[]))) not valid;

alter table "public"."shift_handover" validate constraint "shift_handover_shift_type_check";

alter table "public"."ward_round_notes" add constraint "ward_round_notes_round_type_check" CHECK (((round_type)::text = ANY ((ARRAY['morning'::character varying, 'evening'::character varying, 'night'::character varying, 'consultant'::character varying, 'multidisciplinary'::character varying, 'teaching'::character varying])::text[]))) not valid;

alter table "public"."ward_round_notes" validate constraint "ward_round_notes_round_type_check";

alter table "public"."wards" add constraint "wards_gender_restriction_check" CHECK (((gender_restriction)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying, 'none'::character varying])::text[]))) not valid;

alter table "public"."wards" validate constraint "wards_gender_restriction_check";

alter table "public"."wards" add constraint "wards_ward_type_check" CHECK (((ward_type)::text = ANY ((ARRAY['general'::character varying, 'icu'::character varying, 'pediatric'::character varying, 'maternity'::character varying, 'surgical'::character varying, 'orthopedic'::character varying, 'cardiac'::character varying, 'emergency'::character varying, 'psychiatric'::character varying, 'isolation'::character varying])::text[]))) not valid;

alter table "public"."wards" validate constraint "wards_ward_type_check";

create or replace view "public"."active_admissions_view" as  SELECT a.id AS admission_id,
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
    a.facility_id,
    a.current_ward_id,
    a.current_bed_id,
    a.encounter_id,
    COALESCE((bo.status)::text, 'Pending'::text) AS billing_status,
    bo.id AS billing_order_id,
    bo.total_amount AS billing_amount
   FROM (((((public.admissions a
     JOIN public.patients p ON ((p.id = a.patient_id)))
     LEFT JOIN public.wards w ON ((w.id = a.current_ward_id)))
     LEFT JOIN public.beds b ON ((b.id = a.current_bed_id)))
     LEFT JOIN public.staff s ON ((s.id = a.attending_physician_id)))
     LEFT JOIN LATERAL ( SELECT orders.id,
            orders.status,
            orders.total_amount
           FROM public.billing_orders orders
          WHERE ((((a.encounter_id IS NOT NULL) AND (orders.encounter_id = a.encounter_id)) OR (orders.encounter_id = a.id) OR ((orders.patient_id = a.patient_id) AND (date(orders.created_at) = date(a.admission_date)))) AND (EXISTS ( SELECT 1
                   FROM public.billing_items bi
                  WHERE ((bi.billing_order_id = orders.id) AND (bi.item_type = 'Admission'::public.service_type)))))
          ORDER BY orders.created_at DESC
         LIMIT 1) bo ON (true))
  WHERE ((a.admission_status)::text <> ALL ((ARRAY['discharged'::character varying, 'deceased'::character varying])::text[]));


create or replace view "public"."patient_admission_status_view" as  SELECT p.id AS patient_id,
    p.emr_number,
    p.first_name,
    p.surname AS last_name,
    curr_adm.id AS current_admission_id,
    curr_adm.admission_number AS current_admission_number,
    curr_adm.admission_status AS current_status,
    curr_adm.admission_date AS current_admission_date,
    curr_ward.name AS current_ward,
    curr_bed.bed_number AS current_bed,
    curr_adm.acuity_level AS current_acuity,
    curr_adm.attending_physician_id,
    (((attending.first_name)::text || ' '::text) || (attending.last_name)::text) AS attending_physician_name,
    ( SELECT count(*) AS count
           FROM public.admissions a
          WHERE (a.patient_id = p.id)) AS total_admissions,
    ( SELECT count(*) AS count
           FROM public.admissions a
          WHERE ((a.patient_id = p.id) AND ((a.admission_status)::text = 'discharged'::text))) AS total_discharges,
    ( SELECT max(a.admission_date) AS max
           FROM public.admissions a
          WHERE ((a.patient_id = p.id) AND ((a.admission_status)::text = 'discharged'::text))) AS last_discharge_date,
        CASE
            WHEN (curr_adm.id IS NOT NULL) THEN true
            ELSE false
        END AS is_currently_admitted
   FROM ((((public.patients p
     LEFT JOIN public.admissions curr_adm ON (((curr_adm.patient_id = p.id) AND ((curr_adm.admission_status)::text <> ALL ((ARRAY['discharged'::character varying, 'deceased'::character varying])::text[])))))
     LEFT JOIN public.wards curr_ward ON ((curr_ward.id = curr_adm.current_ward_id)))
     LEFT JOIN public.beds curr_bed ON ((curr_bed.id = curr_adm.current_bed_id)))
     LEFT JOIN public.staff attending ON ((attending.id = curr_adm.attending_physician_id)));


create or replace view "public"."todays_procedures" as  SELECT pr.id AS procedure_id,
    pr.procedure_number,
    pr.procedure_name,
    pr.scheduled_date,
    pr.scheduled_duration_minutes,
    pr.priority,
    pr.status,
    pr.location,
    pr.room_number,
    pr.anesthesia_type,
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.emr_number AS hospital_id,
    s.first_name AS surgeon_first_name,
    s.last_name AS surgeon_last_name,
    pr.facility_id
   FROM ((public.procedures pr
     JOIN public.patients p ON ((p.id = pr.patient_id)))
     LEFT JOIN public.staff s ON ((s.id = pr.primary_surgeon_id)))
  WHERE ((date(pr.scheduled_date) = CURRENT_DATE) AND ((pr.status)::text <> ALL ((ARRAY['cancelled'::character varying, 'completed'::character varying])::text[])))
  ORDER BY pr.scheduled_date;


create or replace view "public"."ward_census" as  WITH bed_counts AS (
         SELECT beds.ward_id,
            count(*) FILTER (WHERE ((beds.status)::text = 'available'::text)) AS available_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'occupied'::text)) AS occupied_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'maintenance'::text)) AS maintenance_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'cleaning'::text)) AS cleaning_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'reserved'::text)) AS reserved_count
           FROM public.beds
          WHERE (beds.is_active = true)
          GROUP BY beds.ward_id
        )
 SELECT w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.total_beds,
    COALESCE(bc.available_count, (0)::bigint) AS available_beds,
    COALESCE(bc.occupied_count, (0)::bigint) AS occupied_beds,
    round((((COALESCE(bc.occupied_count, (0)::bigint))::numeric / (NULLIF(w.total_beds, 0))::numeric) * (100)::numeric), 1) AS occupancy_rate,
    count(a.id) FILTER (WHERE ((a.admission_status)::text = 'critical'::text)) AS critical_patients,
    count(a.id) FILTER (WHERE (a.isolation_required = true)) AS isolation_patients,
    w.facility_id
   FROM ((public.wards w
     LEFT JOIN bed_counts bc ON ((w.id = bc.ward_id)))
     LEFT JOIN public.admissions a ON (((a.current_ward_id = w.id) AND ((a.admission_status)::text <> ALL ((ARRAY['discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying])::text[])))))
  WHERE (w.is_active = true)
  GROUP BY w.id, w.name, w.ward_type, w.total_beds, bc.available_count, bc.occupied_count, w.facility_id;



  create policy "Allow authenticated delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'radiology-images'::text));



  create policy "Allow authenticated select"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'radiology-images'::text));



  create policy "Allow authenticated updates"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'radiology-images'::text));



  create policy "Allow authenticated uploads"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'radiology-images'::text));




