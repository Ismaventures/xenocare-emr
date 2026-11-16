--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: affected_eye; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.affected_eye AS ENUM (
    'Right',
    'Left',
    'Both'
);


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_status AS ENUM (
    'Scheduled',
    'Confirmed',
    'Checked-in',
    'In Progress',
    'Completed',
    'Cancelled',
    'No Show'
);


--
-- Name: appointment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_type AS ENUM (
    'Consultation',
    'Follow-up',
    'Lab',
    'Radiology',
    'Procedure'
);


--
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status AS ENUM (
    'Attended',
    'Missed',
    'Cancelled',
    'Rescheduled'
);


--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT'
);


--
-- Name: bed_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bed_status AS ENUM (
    'Available',
    'Occupied',
    'Reserved',
    'Maintenance',
    'Cleaning'
);


--
-- Name: billing_audit_event; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_audit_event AS ENUM (
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


--
-- Name: billing_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_order_status AS ENUM (
    'Pending',
    'Awaiting_Payment',
    'Partially_Paid',
    'Paid',
    'Paid_NHIS',
    'Paid_Retainership',
    'Waived',
    'Cancelled'
);


--
-- Name: billing_release_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_release_status AS ENUM (
    'blocked',
    'released',
    'billed',
    'waived'
);


--
-- Name: civilian_coverage_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.civilian_coverage_type AS ENUM (
    'Civilian_NHIS',
    'Private'
);


--
-- Name: clinical_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clinical_request_status AS ENUM (
    'Pending',
    'Under_Review',
    'Approved',
    'Rejected',
    'Scheduled',
    'In_Progress',
    'Completed',
    'Cancelled'
);


--
-- Name: clinical_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clinical_request_type AS ENUM (
    'Follow-Up',
    'Procedure',
    'Surgery',
    'Admission',
    'Referral',
    'Transfer',
    'Discharge'
);


--
-- Name: clinical_urgency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clinical_urgency AS ENUM (
    'Routine',
    'Urgent',
    'Emergency'
);


--
-- Name: complaint_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.complaint_category AS ENUM (
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


--
-- Name: config_data_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.config_data_type AS ENUM (
    'string',
    'number',
    'boolean',
    'json'
);


--
-- Name: consciousness_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consciousness_level AS ENUM (
    'Alert',
    'Verbal',
    'Pain',
    'Unresponsive'
);


--
-- Name: dental_urgency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dental_urgency AS ENUM (
    'Routine',
    'Urgent',
    'Emergency'
);


--
-- Name: department_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.department_category AS ENUM (
    'Clinical',
    'Diagnostic',
    'Support',
    'Administrative'
);


--
-- Name: department_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.department_status AS ENUM (
    'Active',
    'Inactive',
    'Maintenance'
);


--
-- Name: dispense_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dispense_status AS ENUM (
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


--
-- Name: drug_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.drug_category AS ENUM (
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


--
-- Name: drug_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.drug_type AS ENUM (
    'Tablets',
    'Capsules',
    'Syrups',
    'Injections',
    'Creams/Ointments',
    'IV Infusions'
);


--
-- Name: duration_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.duration_unit AS ENUM (
    'Hours',
    'Days',
    'Weeks',
    'Months'
);


--
-- Name: evaluation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.evaluation_type AS ENUM (
    'Initial',
    'Progress',
    'Discharge',
    'Re_Evaluation'
);


--
-- Name: exception_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.exception_status AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'AutoApproved',
    'Executed'
);


--
-- Name: exception_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.exception_type AS ENUM (
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


--
-- Name: feedback_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_status AS ENUM (
    'Open',
    'In Progress',
    'Resolved',
    'Closed',
    'Escalated'
);


--
-- Name: feedback_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_type AS ENUM (
    'Complaint',
    'Suggestion',
    'Compliment',
    'Inquiry'
);


--
-- Name: gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender AS ENUM (
    'Male',
    'Female',
    'Other'
);


--
-- Name: gingival_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gingival_status AS ENUM (
    'Healthy',
    'Gingivitis',
    'Mild_Periodontitis',
    'Moderate_Periodontitis',
    'Severe_Periodontitis'
);


--
-- Name: idempotency_key_t; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN public.idempotency_key_t AS character varying(128)
	CONSTRAINT idempotency_key_not_blank CHECK (((VALUE IS NULL) OR ((length(TRIM(BOTH FROM VALUE)) > 0) AND ((VALUE)::text = TRIM(BOTH FROM VALUE)))));


--
-- Name: imaging_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.imaging_type AS ENUM (
    'X-Ray',
    'Ultrasound',
    'MRI',
    'CT',
    'Mammography',
    'Fluoroscopy',
    'Other'
);


--
-- Name: insurance_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.insurance_type AS ENUM (
    'Private',
    'DHML',
    'Civilian_NHIS',
    'Military_NHIS',
    'Retainership',
    'GIFSHIP'
);


--
-- Name: invoice_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_category AS ENUM (
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


--
-- Name: iop_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.iop_method AS ENUM (
    'NCT',
    'Goldmann',
    'iCare',
    'Schiotz',
    'Palpation'
);


--
-- Name: item_verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_verification_status AS ENUM (
    'pending',
    'verified',
    'adjusted',
    'rejected'
);


--
-- Name: lens_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lens_type AS ENUM (
    'Single_Vision',
    'Bifocal',
    'Progressive',
    'Photochromic',
    'Contact_Lens'
);


--
-- Name: military_branch; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.military_branch AS ENUM (
    'Army',
    'Navy',
    'Air Force'
);


--
-- Name: mobility_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mobility_status AS ENUM (
    'Independent',
    'Assisted',
    'Dependent',
    'Bed_Bound'
);


--
-- Name: nhis_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_approval_status AS ENUM (
    'not_required',
    'pending',
    'approved',
    'rejected',
    'expired'
);


--
-- Name: nhis_auth_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_auth_status AS ENUM (
    'pending',
    'active',
    'expired',
    'revoked',
    'used'
);


--
-- Name: nhis_claim_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_claim_status AS ENUM (
    'draft',
    'pending',
    'reviewed',
    'approved',
    'submitted',
    'paid',
    'rejected',
    'disputed'
);


--
-- Name: nhis_patient_origin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_patient_origin AS ENUM (
    'internal',
    'referred'
);


--
-- Name: nhis_patient_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_patient_source AS ENUM (
    'Internal',
    'Referral'
);


--
-- Name: nhis_posting_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_posting_status AS ENUM (
    'pending',
    'posted',
    'seen',
    'completed',
    'cancelled'
);


--
-- Name: nhis_profile_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_profile_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'expired'
);


--
-- Name: nhis_scheme_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_scheme_type AS ENUM (
    'Personnel',
    'Civilian_NHIS',
    'HMO_Private',
    'Special'
);


--
-- Name: nhis_tariff_group; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_tariff_group AS ENUM (
    'Personnel',
    'Civilian_HMO',
    'Special',
    'Private'
);


--
-- Name: nhis_verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nhis_verification_status AS ENUM (
    'not_applicable',
    'unverified',
    'blocked',
    'verified',
    'expired',
    'emergency_override'
);


--
-- Name: notification_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_priority AS ENUM (
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


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
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


--
-- Name: nursing_note_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nursing_note_type AS ENUM (
    'Progress_Note',
    'Observation',
    'Incident',
    'Handoff',
    'Assessment',
    'Medication_Note',
    'Procedure_Note',
    'Patient_Response'
);


--
-- Name: onset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.onset_type AS ENUM (
    'Sudden',
    'Gradual',
    'Traumatic',
    'Post_Surgical',
    'Unknown'
);


--
-- Name: opd_classification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.opd_classification AS ENUM (
    'MOPD',
    'SOPD'
);


--
-- Name: patient_acuity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_acuity AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'routine'
);


--
-- Name: patient_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_category AS ENUM (
    'Military',
    'Civilian',
    'Military Participant',
    'Civilian Participant'
);


--
-- Name: patient_condition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_condition AS ENUM (
    'Stable',
    'Improving',
    'Deteriorating',
    'Critical',
    'Unchanged'
);


--
-- Name: patient_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_status AS ENUM (
    'Active',
    'Inactive',
    'Deceased'
);


--
-- Name: patient_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.patient_type AS ENUM (
    'Principal',
    'Dependent',
    'Private'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'Cash',
    'POS',
    'NHIS',
    'Retainership',
    'DHML',
    'Military_Free',
    'Staff_Account',
    'Bank_Transfer'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'Paid',
    'Partially Paid',
    'Unpaid'
);


--
-- Name: physio_plan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.physio_plan_status AS ENUM (
    'Active',
    'On_Hold',
    'Completed',
    'Discharged',
    'Transferred'
);


--
-- Name: priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.priority AS ENUM (
    'Normal',
    'Urgent',
    'Emergency'
);


--
-- Name: queue_location; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_location AS ENUM (
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
    'Physiotherapy',
    'Encounter_Office'
);


--
-- Name: queue_priority_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_priority_enum AS ENUM (
    'Emergency',
    'Urgent',
    'Normal'
);


--
-- Name: queue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_status AS ENUM (
    'Waiting',
    'Called',
    'In Progress',
    'Completed',
    'Cancelled',
    'No Show',
    'Ready_For_Consultation',
    'Skipped'
);


--
-- Name: referral_module_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_module_status AS ENUM (
    'Pending',
    'Accepted',
    'Rejected',
    'InProgress',
    'Completed',
    'Cancelled'
);


--
-- Name: referral_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_priority AS ENUM (
    'Routine',
    'Urgent',
    'Emergent',
    'Stat'
);


--
-- Name: referral_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_status_enum AS ENUM (
    'Active',
    'Expired',
    'Used',
    'Cancelled'
);


--
-- Name: referral_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_type AS ENUM (
    'Consultation',
    'Transfer',
    'CoManagement',
    'Procedure'
);


--
-- Name: report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_status AS ENUM (
    'Draft',
    'Pending Approval',
    'Approved',
    'Issued',
    'Revoked'
);


--
-- Name: report_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_type AS ENUM (
    'Medical Certificate',
    'Sick Leave',
    'Fitness Report',
    'Referral Letter',
    'Discharge Summary',
    'Death Certificate',
    'Medical Report'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
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


--
-- Name: service_execution_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_execution_status AS ENUM (
    'draft',
    'ordered',
    'blocked',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
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


--
-- Name: shift; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift AS ENUM (
    'Morning',
    'Evening',
    'Night'
);


--
-- Name: shift_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_type AS ENUM (
    'Morning',
    'Afternoon',
    'Night'
);


--
-- Name: source_module; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_module AS ENUM (
    'registration',
    'consultation',
    'nursing',
    'lab',
    'radiology',
    'pharmacy',
    'procedure',
    'admission',
    'dental',
    'ophthalmology',
    'physiotherapy'
);


--
-- Name: staff_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.staff_category AS ENUM (
    'Military',
    'Civilian',
    'DS',
    'Guest Lecturer',
    'Military Participant',
    'Civilian Participant'
);


--
-- Name: tooth_condition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tooth_condition AS ENUM (
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


--
-- Name: tooth_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tooth_status AS ENUM (
    'Present',
    'Missing',
    'Impacted',
    'Deciduous',
    'Unerupted',
    'Partial_Eruption'
);


--
-- Name: treatment_plan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.treatment_plan_status AS ENUM (
    'Created',
    'Viewed',
    'In_Progress',
    'Completed',
    'Cancelled'
);


--
-- Name: treatment_task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.treatment_task_status AS ENUM (
    'Pending',
    'In_Progress',
    'Completed',
    'Skipped',
    'Escalated'
);


--
-- Name: treatment_task_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.treatment_task_type AS ENUM (
    'Administer_Medication',
    'Monitor_Vitals',
    'Procedure',
    'Observation',
    'Patient_Education',
    'Wound_Care',
    'Sample_Collection',
    'Other'
);


--
-- Name: triage_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.triage_status AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
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


--
-- Name: version_conflict_info; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.version_conflict_info AS (
	current_version integer,
	last_modified_by uuid,
	last_modified_at timestamp with time zone
);


--
-- Name: visit_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.visit_status AS ENUM (
    'Active',
    'Completed',
    'Cancelled',
    'Created',
    'Closed',
    'Discharged',
    'Registered'
);


--
-- Name: ward_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ward_type AS ENUM (
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


--
-- Name: assign_bed_on_admission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_bed_on_admission() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: audit_nursing_intervention_create(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_nursing_intervention_create() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    INSERT INTO audit_logs (

        action,

        entity_type,

        entity_id,

        user_id,

        new_values,

        created_at

    ) VALUES (

        'CREATE',

        'nursing_intervention',

        NEW.id::TEXT,

        NEW.nurse_id::TEXT,

        jsonb_build_object(

            'encounter_id', NEW.encounter_id,

            'patient_id', NEW.patient_id,

            'ward_id', NEW.ward_id,

            'category_code', NEW.category_code,

            'intervention_code', NEW.intervention_code,

            'performed_at', NEW.performed_at,

            'shift', NEW.shift

        ),

        NOW()

    );

    RETURN NEW;

EXCEPTION

    WHEN OTHERS THEN

        -- Don't fail the main operation if audit logging fails

        RETURN NEW;

END;

$$;


--
-- Name: auto_add_on_call_to_care_team(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_add_on_call_to_care_team() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: auto_assign_shift_to_note(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_shift_to_note() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: auto_deactivate_expired_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_deactivate_expired_access() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: book_referral_appointment(uuid, date, time without time zone, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.book_referral_appointment(p_referral_id uuid, p_appointment_date date, p_appointment_time time without time zone DEFAULT NULL::time without time zone, p_notes text DEFAULT NULL::text, p_booked_by uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE clinical_requests

    SET appointment_date = p_appointment_date,

        appointment_time = p_appointment_time,

        appointment_notes = p_notes,

        appointment_booked_by = p_booked_by,

        appointment_booked_at = NOW(),

        referral_workflow_status = 'Appointment_Booked',

        updated_at = NOW()

    WHERE id = p_referral_id

      AND request_type = 'Referral';

    

    IF NOT FOUND THEN

        RETURN FALSE;

    END IF;

    

    RETURN TRUE;

END;

$$;


--
-- Name: calculate_next_vitals_due(uuid, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_next_vitals_due(p_schedule_id uuid, p_from_time timestamp with time zone DEFAULT now()) RETURNS timestamp with time zone
    LANGUAGE plpgsql
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


--
-- Name: calculate_nhis_amounts(numeric, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_nhis_amounts(p_gross_amount numeric, p_insurance_type character varying, p_service_type character varying DEFAULT 'Other'::character varying) RETURNS TABLE(nhis_covered boolean, nhis_percentage integer, nhis_payable numeric, patient_payable numeric)
    LANGUAGE plpgsql
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


--
-- Name: can_execute_nhis_service(uuid, character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_execute_nhis_service(p_encounter_id uuid, p_service_type character varying, p_service_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_encounter RECORD;

    v_approval_status nhis_approval_status;

BEGIN

    -- Get encounter

    SELECT * INTO v_encounter FROM visits WHERE id = p_encounter_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('can_execute', FALSE, 'reason', 'Encounter not found');

    END IF;

    

    -- Non-NHIS encounters can always execute

    IF v_encounter.payer_type != 'nhis' OR v_encounter.nhis_verification_status = 'not_applicable' THEN

        RETURN jsonb_build_object('can_execute', TRUE, 'reason', 'Non-NHIS encounter');

    END IF;

    

    -- Check encounter verification status

    IF v_encounter.nhis_verification_status NOT IN ('verified', 'emergency_override') THEN

        RETURN jsonb_build_object(

            'can_execute', FALSE,

            'reason', 'NHIS encounter not verified',

            'status', v_encounter.nhis_verification_status

        );

    END IF;

    

    -- Check service-level approval if required

    CASE p_service_type

        WHEN 'lab_request' THEN

            SELECT nhis_approval_status INTO v_approval_status FROM lab_requests WHERE request_id = p_service_id;

        WHEN 'radiology_request' THEN

            SELECT nhis_approval_status INTO v_approval_status FROM radiology_requests WHERE request_id = p_service_id;

        WHEN 'prescription' THEN

            SELECT nhis_approval_status INTO v_approval_status FROM prescriptions WHERE prescription_id = p_service_id;

        ELSE

            RETURN jsonb_build_object('can_execute', FALSE, 'reason', 'Unknown service type');

    END CASE;

    

    -- Check approval

    IF v_approval_status = 'pending' THEN

        RETURN jsonb_build_object('can_execute', FALSE, 'reason', 'Awaiting NHIS approval');

    ELSIF v_approval_status = 'rejected' THEN

        RETURN jsonb_build_object('can_execute', FALSE, 'reason', 'NHIS approval rejected');

    END IF;

    

    RETURN jsonb_build_object('can_execute', TRUE, 'reason', 'Service approved for execution');

END;

$$;


--
-- Name: check_billing_order_idempotency(public.idempotency_key_t, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_billing_order_idempotency(p_idempotency_key public.idempotency_key_t, p_idempotency_hash character varying DEFAULT NULL::character varying) RETURNS TABLE(existing_id uuid, hash_mismatch boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$

BEGIN

  RETURN QUERY

  SELECT 

    bo.id AS existing_id,

    CASE 

      WHEN p_idempotency_hash IS NOT NULL AND bo.idempotency_hash IS NOT NULL 

           AND bo.idempotency_hash != p_idempotency_hash

      THEN TRUE 

      ELSE FALSE 

    END AS hash_mismatch

  FROM billing_orders bo

  WHERE bo.idempotency_key = p_idempotency_key

  LIMIT 1;

END;

$$;


--
-- Name: check_encounter_access(uuid, uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_encounter_access(p_encounter_id uuid, p_user_id uuid, p_user_role character varying, p_user_department character varying) RETURNS TABLE(has_access boolean, access_role character varying, access_reason text)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: check_overdue_vital_schedules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_overdue_vital_schedules() RETURNS TABLE(schedule_id uuid, patient_id character varying, patient_name text, encounter_id uuid, acuity_level public.patient_acuity, minutes_overdue integer, assigned_nurse_id uuid)
    LANGUAGE plpgsql
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


--
-- Name: check_patient_idempotency(public.idempotency_key_t, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_patient_idempotency(p_idempotency_key public.idempotency_key_t, p_idempotency_hash character varying DEFAULT NULL::character varying) RETURNS TABLE(existing_id uuid, hash_mismatch boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$

BEGIN

  RETURN QUERY

  SELECT 

    p.id AS existing_id,

    CASE 

      WHEN p_idempotency_hash IS NOT NULL AND p.idempotency_hash IS NOT NULL 

           AND p.idempotency_hash != p_idempotency_hash

      THEN TRUE 

      ELSE FALSE 

    END AS hash_mismatch

  FROM patients p

  WHERE p.idempotency_key = p_idempotency_key

  LIMIT 1;

END;

$$;


--
-- Name: check_receipt_idempotency(public.idempotency_key_t, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_receipt_idempotency(p_idempotency_key public.idempotency_key_t, p_idempotency_hash character varying DEFAULT NULL::character varying) RETURNS TABLE(existing_id uuid, hash_mismatch boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$

BEGIN

  RETURN QUERY

  SELECT 

    r.id AS existing_id,

    CASE 

      WHEN p_idempotency_hash IS NOT NULL AND r.idempotency_hash IS NOT NULL 

           AND r.idempotency_hash != p_idempotency_hash

      THEN TRUE 

      ELSE FALSE 

    END AS hash_mismatch

  FROM receipts r

  WHERE r.idempotency_key = p_idempotency_key

  LIMIT 1;

END;

$$;


--
-- Name: cleanup_expired_on_call_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_on_call_access() RETURNS TABLE(deactivated_count integer, affected_encounters integer)
    LANGUAGE plpgsql
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


--
-- Name: cleanup_old_queue_counters(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_queue_counters(days_to_keep integer DEFAULT 7) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

    v_deleted integer;

BEGIN

    DELETE FROM public.queue_daily_counters

    WHERE counter_date < (now() AT TIME ZONE 'Africa/Lagos')::date - days_to_keep;

    

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN v_deleted;

END;

$$;


--
-- Name: cleanup_past_on_call_schedules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_past_on_call_schedules() RETURNS integer
    LANGUAGE plpgsql
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


--
-- Name: create_enum_if_not_exists(text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_enum_if_not_exists(enum_name text, enum_values text[]) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = enum_name) THEN

        EXECUTE format('CREATE TYPE %I AS ENUM (%s)', enum_name, array_to_string(array(SELECT quote_literal(x) FROM unnest(enum_values) x), ', '));

    END IF;

END;

$$;


--
-- Name: create_notification(character varying, character varying, text, character varying, uuid, character varying, character varying, uuid, character varying, character varying, uuid, character varying, character varying, uuid, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_type character varying, p_title character varying, p_message text, p_priority character varying DEFAULT 'normal'::character varying, p_target_user_id uuid DEFAULT NULL::uuid, p_target_role character varying DEFAULT NULL::character varying, p_target_department character varying DEFAULT NULL::character varying, p_encounter_id uuid DEFAULT NULL::uuid, p_patient_id character varying DEFAULT NULL::character varying, p_reference_type character varying DEFAULT NULL::character varying, p_reference_id uuid DEFAULT NULL::uuid, p_action_url character varying DEFAULT NULL::character varying, p_action_label character varying DEFAULT NULL::character varying, p_created_by uuid DEFAULT NULL::uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql
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


--
-- Name: create_queue_ticket(text, uuid, uuid, uuid, uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_queue_ticket(p_dept text, p_patient_id uuid, p_visit_id uuid DEFAULT NULL::uuid, p_encounter_id uuid DEFAULT NULL::uuid, p_clinic_id uuid DEFAULT NULL::uuid, p_priority text DEFAULT 'Normal'::text, p_notes text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

    v_ticket_number integer;

    v_queue_id uuid;

    v_today_lagos date;

    v_result jsonb;

    v_location queue_location;

    v_priority priority;

BEGIN

    -- Get today's date in Africa/Lagos timezone

    v_today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;

    

    -- Cast text department to queue_location enum

    BEGIN

        v_location := p_dept::queue_location;

    EXCEPTION WHEN invalid_text_representation THEN

        v_location := 'Nursing'::queue_location;

    END;

    

    -- Cast text priority to priority enum

    BEGIN

        v_priority := COALESCE(p_priority, 'Normal')::priority;

    EXCEPTION WHEN invalid_text_representation THEN

        v_priority := 'Normal'::priority;

    END;

    

    -- Acquire advisory lock for this department+date combination to prevent race conditions

    PERFORM pg_advisory_xact_lock(hashtext('queue_counter_' || p_dept || '_' || v_today_lagos::text));

    

    -- Atomic upsert to get next ticket number

    INSERT INTO public.queue_daily_counters (department, counter_date, last_ticket_number)

    VALUES (p_dept, v_today_lagos, 1)

    ON CONFLICT (department, counter_date)

    DO UPDATE SET 

        last_ticket_number = queue_daily_counters.last_ticket_number + 1,

        updated_at = now()

    RETURNING last_ticket_number INTO v_ticket_number;

    

    -- Generate queue ID

    v_queue_id := extensions.uuid_generate_v4();

    

    -- Insert queue entry with the ticket number

    INSERT INTO public.queue (

        id,

        patient_id,

        visit_id,

        encounter_id,

        clinic_id,

        location,

        ticket_number,

        priority,

        status,

        notes,

        created_at

    ) VALUES (

        v_queue_id,

        p_patient_id,

        COALESCE(p_visit_id, p_encounter_id),

        p_encounter_id,

        p_clinic_id,

        v_location,

        v_ticket_number::text,

        v_priority,

        'Waiting',

        p_notes,

        now()

    );

    

    -- Build result JSON

    v_result := jsonb_build_object(

        'success', true,

        'queue_id', v_queue_id,

        'ticket_number', v_ticket_number,

        'department', p_dept,

        'patient_id', p_patient_id,

        'encounter_id', p_encounter_id,

        'status', 'Waiting',

        'created_at', now()

    );

    

    RETURN v_result;

    

EXCEPTION WHEN OTHERS THEN

    -- Return error info

    RETURN jsonb_build_object(

        'success', false,

        'error', SQLERRM,

        'error_detail', SQLSTATE

    );

END;

$$;


--
-- Name: create_referral_encounter(uuid, uuid, uuid, character varying, character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_referral_encounter(p_referral_id uuid, p_clinic_id uuid, p_attending_doctor_id uuid, p_visit_type character varying DEFAULT 'Follow-up'::character varying, p_priority character varying DEFAULT 'Normal'::character varying, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$

DECLARE

    v_referral RECORD;

    v_new_encounter_id UUID;

    v_encounter_number VARCHAR;

    v_patient_emr VARCHAR;

BEGIN

    -- Get referral details

    SELECT 

        cr.*,

        p.emr_number,

        rd.first_name AS ref_doc_first,

        rd.last_name AS ref_doc_last

    INTO v_referral

    FROM clinical_requests cr

    JOIN patients p ON cr.patient_id = p.id

    LEFT JOIN staff rd ON cr.requesting_doctor_id = rd.id

    WHERE cr.id = p_referral_id

      AND cr.request_type = 'Referral';

    

    IF NOT FOUND THEN

        RAISE EXCEPTION 'Referral not found: %', p_referral_id;

    END IF;

    

    -- Check referral hasn't already been converted

    IF v_referral.referral_encounter_id IS NOT NULL THEN

        RAISE EXCEPTION 'Referral has already been converted to encounter: %', v_referral.referral_encounter_id;

    END IF;

    

    -- Generate encounter number

    v_encounter_number := 'ENC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 

                          LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    

    -- Create the new encounter

    INSERT INTO visits (

        patient_id,

        clinic_id,

        attending_doctor_id,

        visit_type,

        priority,

        status,

        encounter_number,

        encounter_date,

        

        -- Referral-specific fields

        is_referral_encounter,

        source_referral_id,

        referring_doctor_id,

        referring_clinic_id,

        referral_reason,

        referral_clinical_notes,

        

        -- Initial notes

        chief_complaint,

        

        created_at,

        updated_at

    ) VALUES (

        v_referral.patient_id,

        p_clinic_id,

        p_attending_doctor_id,

        p_visit_type,

        p_priority,

        'Active',

        v_encounter_number,

        CURRENT_DATE,

        

        -- Referral fields

        TRUE,

        p_referral_id,

        v_referral.requesting_doctor_id,

        v_referral.source_clinic_id,

        v_referral.clinical_reason,

        v_referral.notes,

        

        -- Chief complaint from referral reason

        'Referral from ' || COALESCE(v_referral.ref_doc_first || ' ' || v_referral.ref_doc_last, 'Unknown') || 

        ': ' || COALESCE(v_referral.clinical_reason, 'See referral notes'),

        

        NOW(),

        NOW()

    )

    RETURNING id INTO v_new_encounter_id;

    

    -- Update the referral with the new encounter ID

    UPDATE clinical_requests

    SET referral_encounter_id = v_new_encounter_id,

        referral_workflow_status = 'Encounter_Created',

        status = 'Approved',

        approved_at = NOW(),

        approved_by = p_created_by,

        updated_at = NOW()

    WHERE id = p_referral_id;

    

    RETURN v_new_encounter_id;

END;

$$;


--
-- Name: create_staff_user(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_staff_user(email_address text, password text, first_name text, last_name text, user_role text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
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


--
-- Name: create_vital_schedule_on_admission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_vital_schedule_on_admission() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: dismiss_notification(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dismiss_notification(p_notification_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE notifications

    SET is_dismissed = TRUE, dismissed_at = NOW()

    WHERE id = p_notification_id

    AND (target_user_id = p_user_id OR target_user_id IS NULL);

    

    RETURN FOUND;

END;

$$;


--
-- Name: enforce_single_primary_complaint(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_single_primary_complaint() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: generate_admission_number(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_admission_number(facility_code character varying DEFAULT 'ADM'::character varying) RETURNS character varying
    LANGUAGE plpgsql
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


--
-- Name: generate_beds_for_ward(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_beds_for_ward(p_ward_id uuid) RETURNS integer
    LANGUAGE plpgsql
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


--
-- Name: generate_category_invoice_number(public.invoice_category); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_category_invoice_number(p_category public.invoice_category) RETURNS character varying
    LANGUAGE plpgsql
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


--
-- Name: generate_category_receipt_number(public.invoice_category); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_category_receipt_number(p_category public.invoice_category) RETURNS character varying
    LANGUAGE plpgsql
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


--
-- Name: generate_clinical_request_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_clinical_request_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF NEW.request_number IS NULL THEN

        NEW.request_number := 'REQ-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 

                              LPAD(nextval('clinical_request_seq')::TEXT, 4, '0');

    END IF;

    RETURN NEW;

END;

$$;


--
-- Name: generate_emr_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_emr_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF NEW.emr_number IS NULL OR NEW.emr_number = '' THEN

        NEW.emr_number := 'NDC-' || LPAD(nextval('emr_number_seq')::TEXT, 4, '0');

    END IF;

    RETURN NEW;

END;

$$;


--
-- Name: generate_encounter_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_encounter_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF NEW.encounter_number IS NULL OR NEW.encounter_number = '' THEN

        NEW.encounter_number := 'ENC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('encounter_number_seq')::TEXT, 4, '0');

    END IF;

    RETURN NEW;

END;

$$;


--
-- Name: generate_external_referral_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_external_referral_number() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: generate_nhis_claim(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_nhis_claim(p_encounter_id uuid, p_created_by uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_encounter RECORD;

    v_profile RECORD;

    v_claim_id UUID;

    v_claim_number VARCHAR(50);

    v_service_lines JSONB := '[]'::JSONB;

    v_total_tariff DECIMAL(12,2) := 0;

    v_claimable DECIMAL(12,2) := 0;

    v_patient_pay DECIMAL(12,2) := 0;

    v_line RECORD;

BEGIN

    -- Get encounter

    SELECT * INTO v_encounter FROM visits WHERE id = p_encounter_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not found');

    END IF;

    

    -- Check encounter is NHIS verified

    IF v_encounter.nhis_verification_status NOT IN ('verified', 'emergency_override') THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not verified for NHIS');

    END IF;

    

    -- Get NHIS profile

    SELECT * INTO v_profile FROM nhis_profiles WHERE patient_id = v_encounter.patient_id;

    

    -- Generate claim number

    v_claim_number := 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    

    -- Collect service lines from billing_items for this encounter

    FOR v_line IN 

        SELECT bi.* FROM billing_items bi

        JOIN billing_orders bo ON bi.billing_order_id = bo.id

        WHERE bo.encounter_id = p_encounter_id AND bi.nhis_covered = TRUE

    LOOP

        v_service_lines := v_service_lines || jsonb_build_object(

            'item_id', v_line.id,

            'service_name', v_line.service_name,

            'quantity', v_line.quantity,

            'unit_price', v_line.unit_cost,

            'tariff_price', v_line.nhis_payable,

            'covered_amount', v_line.nhis_payable,

            'patient_copay', v_line.patient_payable

        );

        v_total_tariff := v_total_tariff + COALESCE(v_line.gross_amount, 0);

        v_claimable := v_claimable + COALESCE(v_line.nhis_payable, 0);

        v_patient_pay := v_patient_pay + COALESCE(v_line.patient_payable, 0);

    END LOOP;

    

    -- Create claim

    INSERT INTO nhis_claims (

        claim_number, encounter_id, patient_id, nhis_profile_id, auth_id,

        tariff_group, provider_name, service_lines,

        total_tariff, claimable_amount, patient_pay_amount,

        includes_emergency_services, requires_post_authorization,

        status, created_by

    ) VALUES (

        v_claim_number, p_encounter_id, v_encounter.patient_id, v_profile.id, v_encounter.nhis_auth_id,

        v_encounter.nhis_tariff_group, v_profile.provider_name, v_service_lines,

        v_total_tariff, v_claimable, v_patient_pay,

        v_encounter.nhis_verification_status = 'emergency_override',

        v_encounter.requires_post_authorization,

        'pending', p_created_by

    ) RETURNING id INTO v_claim_id;

    

    -- Log audit

    INSERT INTO nhis_audit_log (

        action_type, action_description, entity_type, entity_id,

        patient_id, encounter_id, performed_by

    ) VALUES (

        'CLAIM_GENERATED', 'NHIS claim generated', 'claim', v_claim_id,

        v_encounter.patient_id, p_encounter_id, p_created_by

    );

    

    RETURN jsonb_build_object(

        'success', TRUE,

        'claim_id', v_claim_id,

        'claim_number', v_claim_number,

        'total_tariff', v_total_tariff,

        'claimable_amount', v_claimable,

        'patient_pay', v_patient_pay

    );

END;

$$;


--
-- Name: generate_procedure_number(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_procedure_number(facility_code character varying DEFAULT 'PRC'::character varying) RETURNS character varying
    LANGUAGE plpgsql
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


--
-- Name: generate_visit_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_visit_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    IF NEW.visit_id IS NULL OR NEW.visit_id = '' THEN

        NEW.visit_id := 'VIS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('visit_id_seq')::TEXT, 5, '0');

    END IF;

    RETURN NEW;

END;

$$;


--
-- Name: get_active_on_call_doctors(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_on_call_doctors(p_department character varying) RETURNS TABLE(staff_id uuid, staff_name character varying, start_time timestamp with time zone, end_time timestamp with time zone, hours_remaining numeric)
    LANGUAGE plpgsql
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


--
-- Name: get_current_shift(time without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_shift(p_time time without time zone DEFAULT CURRENT_TIME) RETURNS character varying
    LANGUAGE plpgsql IMMUTABLE
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


--
-- Name: get_current_staff_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_staff_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$

  SELECT id FROM public.staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1;

$$;


--
-- Name: get_current_user_department(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_department() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$

  SELECT department FROM public.staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1;

$$;


--
-- Name: get_current_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$

  SELECT role FROM public.staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1;

$$;


--
-- Name: get_dispensable_batches(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dispensable_batches(p_drug_id uuid, p_quantity integer) RETURNS TABLE(batch_id uuid, batch_number character varying, quantity_available integer, quantity_to_take integer, expiry_date date, days_to_expiry integer, cost_price numeric, selling_price numeric)
    LANGUAGE plpgsql STABLE
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


--
-- Name: get_drug_available_stock(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_drug_available_stock(p_drug_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE
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


--
-- Name: get_encounter_access_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_encounter_access_summary(p_encounter_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_encounter_complaints(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_encounter_complaints(p_encounter_id uuid) RETURNS TABLE(id uuid, complaint_id uuid, complaint_name character varying, complaint_code character varying, category public.complaint_category, is_primary boolean, duration_value integer, duration_unit public.duration_unit, notes text)
    LANGUAGE plpgsql
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


--
-- Name: get_icd10_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_icd10_code(p_code text) RETURNS TABLE(code text, description text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

BEGIN

    RETURN QUERY

    SELECT i.code, i.description

    FROM public.icd10_codes i

    WHERE UPPER(i.code) = UPPER(TRIM(p_code))

    LIMIT 1;

END;

$$;


--
-- Name: get_icd10_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_icd10_stats() RETURNS TABLE(total_codes bigint, chapters_count bigint, last_updated timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

BEGIN

    RETURN QUERY

    SELECT 

        COUNT(*)::BIGINT AS total_codes,

        COUNT(DISTINCT SUBSTRING(i.code FROM 1 FOR 1))::BIGINT AS chapters_count,

        MAX(i.created_at) AS last_updated

    FROM public.icd10_codes i;

END;

$$;


--
-- Name: get_lab_statistics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_lab_statistics(p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(total_requests bigint, total_completed bigint, total_pending bigint, total_critical bigint, avg_turnaround_hours numeric, requests_by_category jsonb, completion_rate numeric)
    LANGUAGE plpgsql
    AS $$

BEGIN

    RETURN QUERY

    SELECT 

        COUNT(*)::bigint AS total_requests,

        COUNT(*) FILTER (WHERE lreq.status = 'Completed')::bigint AS total_completed,

        COUNT(*) FILTER (WHERE lreq.status IN ('Pending', 'Accepted', 'Sample_Collected', 'Processing'))::bigint AS total_pending,

        COUNT(*) FILTER (WHERE lreq.is_critical = true)::bigint AS total_critical,

        ROUND(AVG(EXTRACT(EPOCH FROM (lr.reported_at - lreq.created_at))/3600)::numeric, 2) AS avg_turnaround_hours,

        jsonb_object_agg(

            COALESCE(ltc.category, 'Unknown'),

            cat_counts.cnt

        ) AS requests_by_category,

        ROUND((COUNT(*) FILTER (WHERE lreq.status = 'Completed')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 2) AS completion_rate

    FROM lab_requests lreq

    LEFT JOIN lab_results lr ON lreq.request_id = lr.request_id

    LEFT JOIN lab_test_catalogue ltc ON lreq.test_id = ltc.id

    LEFT JOIN LATERAL (

        SELECT ltc2.category, COUNT(*) AS cnt

        FROM lab_requests lreq2

        LEFT JOIN lab_test_catalogue ltc2 ON lreq2.test_id = ltc2.id

        WHERE lreq2.created_at BETWEEN p_start_date AND p_end_date

        GROUP BY ltc2.category

    ) cat_counts ON ltc.category = cat_counts.category

    WHERE lreq.created_at BETWEEN p_start_date AND p_end_date;

END;

$$;


--
-- Name: get_next_queue_number(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_queue_number(dept text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

    next_num integer;

    today_lagos date;

BEGIN

    -- Get today's date in Africa/Lagos timezone

    today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;

    

    -- Atomic upsert: insert new counter or increment existing

    -- Uses advisory lock to prevent race conditions

    PERFORM pg_advisory_xact_lock(hashtext('queue_counter_' || dept || '_' || today_lagos::text));

    

    INSERT INTO public.queue_daily_counters (department, counter_date, last_ticket_number)

    VALUES (dept, today_lagos, 1)

    ON CONFLICT (department, counter_date)

    DO UPDATE SET 

        last_ticket_number = queue_daily_counters.last_ticket_number + 1,

        updated_at = now()

    RETURNING last_ticket_number INTO next_num;

    

    RETURN next_num;

END;

$$;


--
-- Name: get_on_call_compliance_report(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_on_call_compliance_report(p_department character varying DEFAULT NULL::character varying, p_days_back integer DEFAULT 30) RETURNS TABLE(department character varying, total_hours_scheduled numeric, gaps_count integer, overlaps_count integer, coverage_percentage numeric)
    LANGUAGE plpgsql
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


--
-- Name: get_overdue_vitals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_overdue_vitals() RETURNS TABLE(schedule_id uuid, patient_id character varying, patient_name text, encounter_id uuid, ward_name character varying, bed_number character varying, acuity_level public.patient_acuity, acuity_display_name character varying, acuity_color character varying, last_vitals_at timestamp with time zone, next_vitals_due timestamp with time zone, minutes_overdue integer, assigned_nurse_id uuid, assigned_nurse_name text, alert_priority character varying)
    LANGUAGE plpgsql
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


--
-- Name: get_pharmacy_inventory_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pharmacy_inventory_stats() RETURNS json
    LANGUAGE plpgsql STABLE
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


--
-- Name: get_record_version(character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_record_version(p_table_name character varying, p_record_id uuid) RETURNS TABLE(current_version integer, last_modified_by uuid, last_modified_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $$

BEGIN

  CASE p_table_name

    WHEN 'patients' THEN

      RETURN QUERY SELECT p.version, p.last_modified_by, p.updated_at 

        FROM patients p WHERE p.id = p_record_id;

    WHEN 'encounters' THEN

      RETURN QUERY SELECT e.version, e.last_modified_by, e.updated_at 

        FROM encounters e WHERE e.id = p_record_id;

    WHEN 'consultations' THEN

      RETURN QUERY SELECT c.version, c.last_modified_by, c.updated_at 

        FROM consultations c WHERE c.id = p_record_id;

    WHEN 'billing_orders' THEN

      RETURN QUERY SELECT b.version, b.last_modified_by, b.updated_at 

        FROM billing_orders b WHERE b.id = p_record_id;

    WHEN 'prescriptions' THEN

      RETURN QUERY SELECT pr.version, pr.last_modified_by, pr.updated_at 

        FROM prescriptions pr WHERE pr.id = p_record_id;

    WHEN 'lab_requests' THEN

      RETURN QUERY SELECT lr.version, lr.last_modified_by, lr.updated_at 

        FROM lab_requests lr WHERE lr.id = p_record_id;

    WHEN 'radiology_requests' THEN

      RETURN QUERY SELECT rr.version, rr.last_modified_by, rr.updated_at 

        FROM radiology_requests rr WHERE rr.id = p_record_id;

    WHEN 'admissions' THEN

      RETURN QUERY SELECT a.version, a.last_modified_by, a.updated_at 

        FROM admissions a WHERE a.id = p_record_id;

    WHEN 'procedures' THEN

      RETURN QUERY SELECT proc.version, proc.last_modified_by, proc.updated_at 

        FROM procedures proc WHERE proc.id = p_record_id;

    WHEN 'vitals' THEN

      RETURN QUERY SELECT v.version, v.last_modified_by, v.updated_at 

        FROM vitals v WHERE v.id = p_record_id;

    WHEN 'nursing_notes' THEN

      RETURN QUERY SELECT nn.version, nn.last_modified_by, nn.updated_at 

        FROM nursing_notes nn WHERE nn.id = p_record_id;

    WHEN 'diagnoses' THEN

      RETURN QUERY SELECT d.version, d.last_modified_by, d.updated_at 

        FROM diagnoses d WHERE d.id = p_record_id;

    WHEN 'ward_rounds' THEN

      RETURN QUERY SELECT wr.version, wr.last_modified_by, wr.updated_at 

        FROM ward_rounds wr WHERE wr.id = p_record_id;

    ELSE

      RAISE EXCEPTION 'Unsupported table: %', p_table_name

        USING ERRCODE = 'P0001';

  END CASE;

END;

$$;


--
-- Name: get_shift_date(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_shift_date(p_timestamp timestamp with time zone DEFAULT now()) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
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


--
-- Name: get_unread_notification_count(uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_notification_count(p_user_id uuid, p_user_role character varying DEFAULT NULL::character varying, p_user_department character varying DEFAULT NULL::character varying) RETURNS integer
    LANGUAGE plpgsql
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


--
-- Name: get_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

BEGIN

    RETURN COALESCE(

        current_setting('app.user_role', true),

        (SELECT role::TEXT FROM staff WHERE user_id = auth.uid() LIMIT 1),

        'anonymous'

    );

END;

$$;


--
-- Name: has_clinical_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_clinical_access() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.staff 

    WHERE user_id = auth.uid() 

      AND is_active = true

      AND role IN ('doctor', 'nurse', 'lab_technician', 'radiologist', 'pharmacist', 'super_admin', 'admin')

  );

$$;


--
-- Name: increment_record_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_record_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- Increment version if not explicitly set

  IF NEW.version IS NULL OR NEW.version = OLD.version THEN

    NEW.version := COALESCE(OLD.version, 0) + 1;

  END IF;

  

  -- Always update timestamp

  NEW.updated_at := NOW();

  

  RETURN NEW;

END;

$$;


--
-- Name: is_encounter_writable(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_encounter_writable(encounter_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE enc_status TEXT; BEGIN IF encounter_uuid IS NULL THEN RETURN FALSE; END IF; SELECT status INTO enc_status FROM visits WHERE id = encounter_uuid; RETURN enc_status IN ('Active', 'In Progress', 'Checked In', 'Triage', 'Vitals', 'Consulting', 'Admitted', 'Waiting', 'In Treatment'); END;$$;


--
-- Name: is_nurse(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_nurse(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: is_on_care_team(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_on_care_team(p_encounter_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.encounter_care_team ect

    WHERE ect.encounter_id = p_encounter_id

      AND ect.staff_id = public.get_current_staff_id()

      AND ect.is_active = true

  );

$$;


--
-- Name: log_care_team_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_care_team_change() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: log_nursing_action(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_nursing_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: log_ownership_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_ownership_change() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: log_unauthorized_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_unauthorized_access() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: log_version_conflict(character varying, uuid, integer, integer, uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_version_conflict(p_table_name character varying, p_record_id uuid, p_expected_version integer, p_actual_version integer, p_attempted_by uuid, p_last_modified_by uuid, p_client_info jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$

DECLARE

  v_log_id UUID;

BEGIN

  INSERT INTO version_conflict_log (

    table_name, record_id, expected_version, actual_version,

    attempted_by, last_modified_by, client_info

  ) VALUES (

    p_table_name, p_record_id, p_expected_version, p_actual_version,

    p_attempted_by, p_last_modified_by, p_client_info

  )

  RETURNING id INTO v_log_id;

  

  RETURN v_log_id;

END;

$$;


--
-- Name: mark_notification_read(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notification_read(p_notification_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

BEGIN

    UPDATE notifications

    SET is_read = TRUE, read_at = NOW()

    WHERE id = p_notification_id

    AND (target_user_id = p_user_id OR target_user_id IS NULL);

    

    RETURN FOUND;

END;

$$;


--
-- Name: nhis_emergency_override(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nhis_emergency_override(p_encounter_id uuid, p_override_by uuid, p_reason text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_encounter RECORD;

BEGIN

    -- Get encounter

    SELECT * INTO v_encounter FROM visits WHERE id = p_encounter_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not found');

    END IF;

    

    -- Update encounter

    UPDATE visits SET

        nhis_verification_status = 'emergency_override',

        nhis_override_by = p_override_by,

        nhis_override_at = NOW(),

        nhis_override_reason = p_reason,

        requires_post_authorization = TRUE,

        updated_at = NOW()

    WHERE id = p_encounter_id;

    

    -- Log audit with emergency flag

    INSERT INTO nhis_audit_log (

        action_type, action_description, entity_type, entity_id,

        patient_id, encounter_id, new_state, performed_by,

        is_emergency_action, emergency_reason

    ) VALUES (

        'EMERGENCY_OVERRIDE', 'Emergency override activated - requires post-authorization',

        'encounter', p_encounter_id, v_encounter.patient_id, p_encounter_id,

        jsonb_build_object('reason', p_reason, 'override_at', NOW()),

        p_override_by, TRUE, p_reason

    );

    

    RETURN jsonb_build_object(

        'success', TRUE,

        'encounter_id', p_encounter_id,

        'status', 'emergency_override',

        'requires_post_authorization', TRUE

    );

END;

$$;


--
-- Name: notify_critical_result(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_critical_result() RETURNS trigger
    LANGUAGE plpgsql
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

            'CriticalValue'::notification_type,

            '=�ܿ CRITICAL Lab Result',

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


--
-- Name: notify_overdue_vitals(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_overdue_vitals(p_schedule_id uuid) RETURNS boolean
    LANGUAGE plpgsql
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

        'G��n+� Vitals Overdue - ' || v_config.display_name,

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


--
-- Name: notify_shift_handover(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_shift_handover() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: notify_treatment_plan_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_treatment_plan_created() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: nurse_has_encounter_access(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nurse_has_encounter_access(encounter_uuid uuid, user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: prevent_access_log_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_access_log_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are not allowed.';

END;

$$;


--
-- Name: prevent_encounter_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_encounter_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

DECLARE

  record_count INTEGER;

BEGIN

  -- Check daily_progress_notes

  SELECT COUNT(*) INTO record_count FROM daily_progress_notes WHERE encounter_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete encounter with % progress note(s).', record_count;

  END IF;

  

  -- Check consultations

  SELECT COUNT(*) INTO record_count FROM consultations WHERE encounter_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete encounter with % consultation(s).', record_count;

  END IF;

  

  -- Check vitals

  SELECT COUNT(*) INTO record_count FROM vitals WHERE encounter_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete encounter with % vital record(s).', record_count;

  END IF;

  

  -- Check lab_requests

  SELECT COUNT(*) INTO record_count FROM lab_requests WHERE encounter_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete encounter with % lab request(s).', record_count;

  END IF;

  

  -- Check prescriptions

  SELECT COUNT(*) INTO record_count FROM prescriptions WHERE encounter_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete encounter with % prescription(s).', record_count;

  END IF;

  

  RETURN OLD;

END;

$$;


--
-- Name: prevent_on_call_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_on_call_overlap() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: prevent_patient_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_patient_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

DECLARE

  record_count INTEGER;

BEGIN

  -- Check visits/encounters

  SELECT COUNT(*) INTO record_count FROM visits WHERE patient_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete patient with % encounter(s). Mark as Inactive instead.', record_count;

  END IF;

  

  -- Check consultations

  SELECT COUNT(*) INTO record_count FROM consultations WHERE patient_id::uuid = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete patient with % consultation(s). Mark as Inactive instead.', record_count;

  END IF;

  

  -- Check billing orders

  SELECT COUNT(*) INTO record_count FROM billing_orders WHERE patient_id = OLD.id;

  IF record_count > 0 THEN

    RAISE EXCEPTION 'Cannot delete patient with % billing record(s). Mark as Inactive instead.', record_count;

  END IF;

  

  RETURN OLD;

END;

$$;


--
-- Name: process_nhis_referral_queue(uuid, character varying, uuid, text, text, character varying, public.nhis_tariff_group); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_nhis_referral_queue(p_queue_id uuid, p_action character varying, p_processed_by uuid, p_notes text DEFAULT NULL::text, p_rejection_reason text DEFAULT NULL::text, p_auth_code character varying DEFAULT NULL::character varying, p_tariff_group public.nhis_tariff_group DEFAULT 'Civilian_HMO'::public.nhis_tariff_group) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_queue RECORD;

    v_auth_id UUID;

    v_profile_id UUID;

    v_staff_id UUID;

    v_expiry_date TIMESTAMP WITH TIME ZONE;

    v_days_since_referral INTEGER;

    v_is_expired BOOLEAN;

BEGIN

    -- Look up staff ID from user ID

    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;

    IF v_staff_id IS NULL THEN

        -- If no staff record, use the user ID directly (some tables may allow this)

        -- Or return an error if staff is required

        RETURN jsonb_build_object('success', FALSE, 'error', 'Staff record not found for this user. Please ensure you have a staff profile.');

    END IF;



    -- Get queue item

    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item not found');

    END IF;

    

    -- Compute days_since_referral and is_expired from referral_date

    IF v_queue.referral_date IS NOT NULL THEN

        v_days_since_referral := CURRENT_DATE - v_queue.referral_date;

        v_is_expired := v_days_since_referral > 30;

    ELSE

        v_days_since_referral := NULL;

        v_is_expired := FALSE;

    END IF;

    

    -- Check if already processed

    IF v_queue.status NOT IN ('pending', 'in_review') THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item already processed');

    END IF;

    

    -- Check 30-day expiry for approvals

    IF v_is_expired AND p_action = 'approve' THEN

        RETURN jsonb_build_object(

            'success', FALSE, 

            'error', 'Referral expired (' || v_days_since_referral || ' days). Cannot approve expired referrals.'

        );

    END IF;

    

    IF p_action = 'approve' THEN

        -- Get or create NHIS profile

        SELECT id INTO v_profile_id FROM nhis_profiles WHERE patient_id = v_queue.patient_id;

        

        IF v_profile_id IS NULL THEN

            INSERT INTO nhis_profiles (

                patient_id, scheme_type, patient_origin,

                referring_facility_name, referral_code, referral_date,

                referral_reason, tariff_group, verified_by, verified_at

            ) VALUES (

                v_queue.patient_id, 'Civilian_NHIS', 'referred',

                v_queue.referral_source, v_queue.referral_code, v_queue.referral_date,

                v_queue.clinical_basis, p_tariff_group, v_staff_id, NOW()

            ) RETURNING id INTO v_profile_id;

        ELSE

            -- Update existing profile with referral info

            UPDATE nhis_profiles SET

                patient_origin = 'referred',

                referring_facility_name = COALESCE(v_queue.referral_source, referring_facility_name),

                referral_code = COALESCE(v_queue.referral_code, referral_code),

                referral_date = COALESCE(v_queue.referral_date, referral_date),

                referral_reason = COALESCE(v_queue.clinical_basis, referral_reason),

                tariff_group = p_tariff_group,

                verified_by = v_staff_id,

                verified_at = NOW(),

                updated_at = NOW()

            WHERE id = v_profile_id;

        END IF;

        

        -- Calculate expiry (30 days from now)

        v_expiry_date := NOW() + INTERVAL '30 days';

        

        -- Create authorization

        INSERT INTO nhis_authorizations (

            patient_id, nhis_profile_id, auth_code, auth_type,

            start_date, expiry_date, status, source,

            referral_source, referral_clinical_basis, referring_clinician,

            referral_date, referral_code,

            verified_by, verified_at, verification_notes

        ) VALUES (

            v_queue.patient_id, v_profile_id, 

            COALESCE(p_auth_code, 'AUTH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),

            'referral', NOW(), v_expiry_date, 'active', 'external_referral',

            v_queue.referral_source, v_queue.clinical_basis, v_queue.referring_clinician,

            v_queue.referral_date, v_queue.referral_code,

            v_staff_id, NOW(), p_notes

        ) RETURNING id INTO v_auth_id;

        

        -- Update queue item

        UPDATE nhis_referral_queue SET

            status = 'approved',

            processed_by = v_staff_id,

            processed_at = NOW(),

            processing_notes = p_notes,

            authorization_id = v_auth_id,

            updated_at = NOW()

        WHERE id = p_queue_id;

        

        -- Log audit

        INSERT INTO nhis_audit_log (

            action_type, action_description, entity_type, entity_id,

            patient_id, new_state, performed_by

        ) VALUES (

            'REFERRAL_APPROVED', 'External referral approved and authorization created',

            'referral_queue', p_queue_id, v_queue.patient_id,

            jsonb_build_object(

                'auth_code', p_auth_code,

                'auth_id', v_auth_id,

                'profile_id', v_profile_id,

                'tariff_group', p_tariff_group

            ),

            v_staff_id

        );

        

        RETURN jsonb_build_object(

            'success', TRUE, 

            'message', 'Referral approved and authorization created',

            'authorization_id', v_auth_id,

            'profile_id', v_profile_id

        );

        

    ELSIF p_action = 'reject' THEN

        -- Rejection reason is required

        IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN

            RETURN jsonb_build_object('success', FALSE, 'error', 'Rejection reason is required');

        END IF;

        

        -- Update queue item

        UPDATE nhis_referral_queue SET

            status = 'rejected',

            processed_by = v_staff_id,

            processed_at = NOW(),

            processing_notes = p_notes,

            rejection_reason = p_rejection_reason,

            updated_at = NOW()

        WHERE id = p_queue_id;

        

        -- Log audit

        INSERT INTO nhis_audit_log (

            action_type, action_description, entity_type, entity_id,

            patient_id, new_state, performed_by

        ) VALUES (

            'REFERRAL_REJECTED', 'External referral rejected',

            'referral_queue', p_queue_id, v_queue.patient_id,

            jsonb_build_object(

                'rejection_reason', p_rejection_reason,

                'notes', p_notes

            ),

            v_staff_id

        );

        

        RETURN jsonb_build_object(

            'success', TRUE, 

            'message', 'Referral rejected'

        );

    ELSE

        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid action. Use "approve" or "reject".');

    END IF;

END;

$$;


--
-- Name: process_nhis_referral_queue(uuid, character varying, uuid, text, text, character varying, public.nhis_tariff_group, character varying, character varying, date, text, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_nhis_referral_queue(p_queue_id uuid, p_action character varying, p_processed_by uuid, p_notes text DEFAULT NULL::text, p_rejection_reason text DEFAULT NULL::text, p_auth_code character varying DEFAULT NULL::character varying, p_tariff_group public.nhis_tariff_group DEFAULT 'Civilian_HMO'::public.nhis_tariff_group, p_referral_source character varying DEFAULT NULL::character varying, p_referral_code character varying DEFAULT NULL::character varying, p_referral_date date DEFAULT NULL::date, p_referral_reason text DEFAULT NULL::text, p_referring_clinician character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_queue RECORD;

    v_auth_id UUID;

    v_profile_id UUID;

    v_staff_id UUID;

    v_expiry_date TIMESTAMP WITH TIME ZONE;

    v_days_since_referral INTEGER;

    v_is_expired BOOLEAN;

    

    -- Effective values (overrides OR queue values)

    v_eff_source VARCHAR(255);

    v_eff_code VARCHAR(100);

    v_eff_date DATE;

    v_eff_reason TEXT;

    v_eff_clinician VARCHAR(255);

BEGIN

    -- Look up staff ID from user ID

    SELECT id INTO v_staff_id FROM staff WHERE user_id = p_processed_by;

    IF v_staff_id IS NULL THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Staff record not found for this user.');

    END IF;



    -- Get queue item

    SELECT * INTO v_queue FROM nhis_referral_queue WHERE id = p_queue_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item not found');

    END IF;

    

    -- Set effective values

    v_eff_source := COALESCE(p_referral_source, v_queue.referral_source);

    v_eff_code := COALESCE(p_referral_code, v_queue.referral_code);

    v_eff_date := COALESCE(p_referral_date, v_queue.referral_date);

    v_eff_reason := COALESCE(p_referral_reason, v_queue.clinical_basis);

    v_eff_clinician := COALESCE(p_referring_clinician, v_queue.referring_clinician);

    

    -- Compute expiry from effective date

    IF v_eff_date IS NOT NULL THEN

        v_days_since_referral := CURRENT_DATE - v_eff_date;

        v_is_expired := v_days_since_referral > 30;

    ELSE

        v_days_since_referral := NULL;

        v_is_expired := FALSE;

    END IF;

    

    -- Check if already processed

    IF v_queue.status NOT IN ('pending', 'in_review') THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item already processed');

    END IF;

    

    -- Check 30-day expiry for approvals (using effective date)

    IF v_is_expired AND p_action = 'approve' THEN

        RETURN jsonb_build_object(

            'success', FALSE, 

            'error', 'Referral expired (' || v_days_since_referral || ' days). Cannot approve expired referrals.'

        );

    END IF;

    

    IF p_action = 'approve' THEN

        -- Get or create NHIS profile

        SELECT id INTO v_profile_id FROM nhis_profiles WHERE patient_id = v_queue.patient_id;

        

        IF v_profile_id IS NULL THEN

            INSERT INTO nhis_profiles (

                patient_id, scheme_type, patient_origin,

                referring_facility_name, referral_code, referral_date,

                referral_reason, tariff_group, verified_by, verified_at,

                verification_notes

            ) VALUES (

                v_queue.patient_id, 'Civilian_NHIS', 'referred',

                v_eff_source, v_eff_code, v_eff_date,

                v_eff_reason, p_tariff_group, v_staff_id, NOW(),

                p_notes

            ) RETURNING id INTO v_profile_id;

        ELSE

            -- Update existing profile with referral info

            UPDATE nhis_profiles SET

                patient_origin = 'referred',

                referring_facility_name = v_eff_source,

                referral_code = v_eff_code,

                referral_date = v_eff_date,

                referral_reason = v_eff_reason,

                tariff_group = p_tariff_group,

                verified_by = v_staff_id,

                verified_at = NOW(),

                verification_notes = p_notes,

                updated_at = NOW()

            WHERE id = v_profile_id;

        END IF;



        -- Update the queue record as well so it matches what was approved

        UPDATE nhis_referral_queue SET

            referral_source = v_eff_source,

            referral_code = v_eff_code,

            referral_date = v_eff_date,

            clinical_basis = v_eff_reason,

            referring_clinician = v_eff_clinician,

            status = 'approved',

            processed_by = v_staff_id,

            processed_at = NOW(),

            processing_notes = p_notes,

            updated_at = NOW()

        WHERE id = p_queue_id;

        

        -- Calculate expiry (30 days from now)

        v_expiry_date := NOW() + INTERVAL '30 days';

        

        -- Create authorization

        INSERT INTO nhis_authorizations (

            patient_id, nhis_profile_id, auth_code, auth_type,

            start_date, expiry_date, status, source,

            referral_source, referral_clinical_basis, referring_clinician,

            referral_date, referral_code,

            verified_by, verified_at, verification_notes

        ) VALUES (

            v_queue.patient_id, v_profile_id, 

            COALESCE(p_auth_code, 'AUTH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),

            'referral', NOW(), v_expiry_date, 'active', 'external_referral',

            v_eff_source, v_eff_reason, v_eff_clinician,

            v_eff_date, v_eff_code,

            v_staff_id, NOW(), p_notes

        ) RETURNING id INTO v_auth_id;

        

        -- Link auth back to queue

        UPDATE nhis_referral_queue SET authorization_id = v_auth_id WHERE id = p_queue_id;

        

        RETURN jsonb_build_object(

            'success', TRUE, 

            'message', 'Referral approved with verification notes',

            'authorization_id', v_auth_id,

            'profile_id', v_profile_id

        );

        

    ELSIF p_action = 'reject' THEN

        UPDATE nhis_referral_queue SET

            status = 'rejected',

            processed_by = v_staff_id,

            processed_at = NOW(),

            rejection_reason = p_rejection_reason,

            processing_notes = p_notes,

            updated_at = NOW()

        WHERE id = p_queue_id;

        

        RETURN jsonb_build_object('success', TRUE, 'message', 'Referral rejected');

    END IF;

END;

$$;


--
-- Name: release_service_to_billing(character varying, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_service_to_billing(p_service_type character varying, p_service_id uuid, p_released_by uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_encounter_id UUID;

    v_encounter RECORD;

BEGIN

    -- Get encounter based on service type

    CASE p_service_type

        WHEN 'lab_request' THEN

            SELECT encounter_id INTO v_encounter_id FROM lab_requests WHERE request_id = p_service_id;

            UPDATE lab_requests SET 

                billing_release_status = 'released',

                released_by = p_released_by,

                released_at = NOW()

            WHERE request_id = p_service_id;

        WHEN 'radiology_request' THEN

            SELECT encounter_id INTO v_encounter_id FROM radiology_requests WHERE request_id = p_service_id;

            UPDATE radiology_requests SET 

                billing_release_status = 'released',

                released_by = p_released_by,

                released_at = NOW()

            WHERE request_id = p_service_id;

        WHEN 'prescription' THEN

            SELECT encounter_id INTO v_encounter_id FROM prescriptions WHERE prescription_id = p_service_id;

            UPDATE prescriptions SET 

                billing_release_status = 'released',

                released_by = p_released_by,

                released_at = NOW()

            WHERE prescription_id = p_service_id;

        ELSE

            RETURN jsonb_build_object('success', FALSE, 'error', 'Unknown service type');

    END CASE;

    

    -- Get encounter for verification check

    SELECT * INTO v_encounter FROM visits WHERE id = v_encounter_id;

    

    -- Check encounter is verified or emergency_override

    IF v_encounter.nhis_verification_status NOT IN ('verified', 'emergency_override') THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not verified - cannot release to billing');

    END IF;

    

    -- Log audit

    INSERT INTO nhis_audit_log (

        action_type, action_description, entity_type, entity_id,

        encounter_id, performed_by

    ) VALUES (

        'SERVICE_RELEASED', 'Service released to billing',

        p_service_type, p_service_id, v_encounter_id, p_released_by

    );

    

    RETURN jsonb_build_object(

        'success', TRUE,

        'service_type', p_service_type,

        'service_id', p_service_id,

        'released_at', NOW()

    );

END;

$$;


--
-- Name: route_referral_to_encounter_office(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.route_referral_to_encounter_office() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Only process new Referral requests

    IF NEW.request_type = 'Referral' AND TG_OP = 'INSERT' THEN

        -- Set initial workflow status

        NEW.referral_workflow_status := 'Pending_Encounter_Office';

        

        -- Set status to Under_Review (awaiting Encounter Office action)

        NEW.status := 'Under_Review';

        

        -- Create notification for Encounter Office (optional, can be implemented)

        -- INSERT INTO notifications ...

    END IF;

    

    RETURN NEW;

END;

$$;


--
-- Name: route_to_specialty_queue(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.route_to_specialty_queue() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: route_visit_to_specialty(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.route_visit_to_specialty() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: search_icd10_codes(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_icd10_codes(p_keyword text, p_max_results integer DEFAULT 25) RETURNS TABLE(code text, description text, match_score double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_search_term TEXT;

    v_tsquery tsquery;

BEGIN

    -- Normalize search term

    v_search_term := TRIM(UPPER(p_keyword));

    

    IF v_search_term IS NULL OR LENGTH(v_search_term) < 2 THEN

        RETURN;

    END IF;

    

    -- Create tsquery for full-text search

    v_tsquery := plainto_tsquery('english', p_keyword);

    

    RETURN QUERY

    SELECT 

        i.code,

        i.description,

        CASE 

            -- Exact code match gets highest score

            WHEN UPPER(i.code) = v_search_term THEN 100.0

            -- Code prefix match gets high score

            WHEN UPPER(i.code) LIKE v_search_term || '%' THEN 80.0

            -- Code contains search term

            WHEN UPPER(i.code) LIKE '%' || v_search_term || '%' THEN 60.0

            -- Full-text match score

            WHEN v_tsquery @@ to_tsvector('english', i.description) THEN 

                ts_rank(to_tsvector('english', i.description), v_tsquery) * 50.0

            -- ILIKE match gets base score

            ELSE 10.0

        END AS match_score

    FROM public.icd10_codes i

    WHERE 

        -- Match by code (case-insensitive)

        UPPER(i.code) LIKE '%' || v_search_term || '%'

        OR

        -- Match by description (full-text or ILIKE)

        v_tsquery @@ to_tsvector('english', i.description)

        OR

        UPPER(i.description) LIKE '%' || v_search_term || '%'

    ORDER BY match_score DESC, i.code ASC

    LIMIT p_max_results;

END;

$$;


--
-- Name: set_clinical_request_sla(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_clinical_request_sla() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: set_idempotency_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_idempotency_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- Only set timestamp if idempotency_key is provided and timestamp is not already set

  IF NEW.idempotency_key IS NOT NULL AND NEW.idempotency_created_at IS NULL THEN

    NEW.idempotency_created_at := NOW();

  END IF;

  RETURN NEW;

END;

$$;


--
-- Name: sync_drug_stock_quantity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_drug_stock_quantity() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: sync_lab_request_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_lab_request_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- When a lab result is inserted or updated, sync key info to lab_requests

    UPDATE lab_requests

    SET 

        status = CASE 

            WHEN NEW.workflow_status = 'released' THEN 'Completed'::request_status

            WHEN NEW.workflow_status IN ('verified', 'approved') THEN 'Result_Ready'::request_status

            ELSE status

        END,

        result_entered_at = COALESCE(result_entered_at, NEW.created_at),

        result_entered_by = COALESCE(result_entered_by, NEW.technician_id),

        is_critical = COALESCE(NEW.is_critical, is_critical),

        updated_at = NOW()

    WHERE request_id = NEW.request_id;

    

    RETURN NEW;

END;

$$;


--
-- Name: sync_shift_handover_dates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_shift_handover_dates() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: track_clinical_request_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_clinical_request_status_change() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: track_lab_result_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_lab_result_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$

BEGIN

    -- Only track if there's an actual change to result data

    IF TG_OP = 'UPDATE' AND (

        OLD.result_value IS DISTINCT FROM NEW.result_value OR

        OLD.structured_result IS DISTINCT FROM NEW.structured_result OR

        OLD.workflow_status IS DISTINCT FROM NEW.workflow_status

    ) THEN

        INSERT INTO lab_result_history (

            lab_result_id,

            version,

            result,

            result_value,

            structured_result,

            result_status,

            modified_by,

            modification_type,

            modification_reason

        ) VALUES (

            NEW.id,

            NEW.version,

            NEW.result_value,

            CASE WHEN NEW.result_value ~ '^[0-9.]+$' THEN NEW.result_value::numeric ELSE NULL END,

            NEW.structured_result,

            NEW.workflow_status,

            NEW.last_modified_by,

            CASE 

                WHEN OLD.workflow_status != NEW.workflow_status THEN 'Status Change'

                WHEN OLD.result_value IS DISTINCT FROM NEW.result_value THEN 'Result Amendment'

                WHEN OLD.structured_result IS DISTINCT FROM NEW.structured_result THEN 'Data Update'

                ELSE 'Modification'

            END,

            'Automatic tracking on update'

        );

    END IF;

    

    RETURN NEW;

END;

$_$;


--
-- Name: transfer_queue_ticket(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_queue_ticket(p_current_queue_id uuid, p_new_dept text, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$

DECLARE

    v_current_queue RECORD;

    v_new_ticket integer;

    v_new_queue_id uuid;

    v_today_lagos date;

    v_result jsonb;

    v_location queue_location;

BEGIN

    -- Get today's date in Africa/Lagos timezone

    v_today_lagos := (now() AT TIME ZONE 'Africa/Lagos')::date;

    

    -- Cast text department to queue_location enum

    BEGIN

        v_location := p_new_dept::queue_location;

    EXCEPTION WHEN invalid_text_representation THEN

        -- Default to 'Nursing' if invalid location provided

        v_location := 'Nursing'::queue_location;

    END;

    

    -- Get current queue entry

    SELECT * INTO v_current_queue 

    FROM public.queue 

    WHERE id = p_current_queue_id;

    

    IF NOT FOUND THEN

        RETURN jsonb_build_object(

            'success', false,

            'error', 'Queue entry not found'

        );

    END IF;

    

    -- Acquire lock for new department

    PERFORM pg_advisory_xact_lock(hashtext('queue_counter_' || p_new_dept || '_' || v_today_lagos::text));

    

    -- Complete current queue entry

    UPDATE public.queue

    SET status = 'Completed',

        completed_at = now()

    WHERE id = p_current_queue_id;

    

    -- Get next ticket number for new department

    INSERT INTO public.queue_daily_counters (department, counter_date, last_ticket_number)

    VALUES (p_new_dept, v_today_lagos, 1)

    ON CONFLICT (department, counter_date)

    DO UPDATE SET 

        last_ticket_number = queue_daily_counters.last_ticket_number + 1,

        updated_at = now()

    RETURNING last_ticket_number INTO v_new_ticket;

    

    -- Generate new queue ID

    v_new_queue_id := extensions.uuid_generate_v4();

    

    -- Create new queue entry

    INSERT INTO public.queue (

        id,

        patient_id,

        visit_id,

        encounter_id,

        clinic_id,

        location,

        ticket_number,

        priority,

        status,

        notes,

        created_at

    ) VALUES (

        v_new_queue_id,

        v_current_queue.patient_id,

        v_current_queue.visit_id,

        v_current_queue.encounter_id,

        v_current_queue.clinic_id,

        v_location,  -- Use the casted enum value

        v_new_ticket::text,

        v_current_queue.priority,

        'Waiting',

        COALESCE(p_notes, 'Transferred from ' || v_current_queue.location),

        now()

    );

    

    -- Build result

    v_result := jsonb_build_object(

        'success', true,

        'previous_queue_id', p_current_queue_id,

        'previous_department', v_current_queue.location,

        'new_queue_id', v_new_queue_id,

        'new_ticket_number', v_new_ticket,

        'new_department', p_new_dept,

        'patient_id', v_current_queue.patient_id,

        'encounter_id', v_current_queue.encounter_id

    );

    

    RETURN v_result;

    

EXCEPTION WHEN OTHERS THEN

    RETURN jsonb_build_object(

        'success', false,

        'error', SQLERRM,

        'error_detail', SQLSTATE

    );

END;

$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: billing_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_number character varying(50) NOT NULL,
    visit_id uuid,
    patient_id uuid,
    total_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    net_amount numeric(10,2) DEFAULT 0,
    paid_amount numeric(10,2) DEFAULT 0,
    balance_amount numeric(10,2) DEFAULT 0,
    status public.billing_order_status DEFAULT 'Pending'::public.billing_order_status,
    payment_method public.payment_method,
    source_module public.source_module,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid,
    nhis_covered boolean DEFAULT false,
    nhis_percentage integer DEFAULT 0,
    nhis_payable numeric(10,2) DEFAULT 0,
    patient_payable numeric(10,2) DEFAULT 0,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64),
    last_modified_by uuid
);

ALTER TABLE ONLY public.billing_orders REPLICA IDENTITY FULL;


--
-- Name: update_billing_order_with_lock(uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_billing_order_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid) RETURNS SETOF public.billing_orders
    LANGUAGE plpgsql
    AS $$

DECLARE

  v_current_version INTEGER;

  v_last_modified_by UUID;

  v_updated_at TIMESTAMPTZ;

BEGIN

  SELECT version, last_modified_by, updated_at

  INTO v_current_version, v_last_modified_by, v_updated_at

  FROM billing_orders WHERE id = p_id FOR UPDATE;

  

  IF NOT FOUND THEN

    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';

  END IF;

  

  IF v_current_version != p_expected_version THEN

    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',

      p_expected_version, v_current_version, v_last_modified_by, v_updated_at

      USING ERRCODE = 'P0003';

  END IF;

  

  RETURN QUERY

  UPDATE billing_orders SET

    status = COALESCE((p_updates->>'status')::public.billing_order_status, status),

    paid_amount = COALESCE((p_updates->>'paid_amount')::NUMERIC, paid_amount),

    balance_amount = COALESCE((p_updates->>'balance_amount')::NUMERIC, balance_amount),

    discount_amount = COALESCE((p_updates->>'discount_amount')::NUMERIC, discount_amount),

    payment_method = COALESCE((p_updates->>'payment_method')::public.payment_method, payment_method),

    last_modified_by = p_modified_by,

    version = v_current_version

  WHERE id = p_id

  RETURNING *;

END;

$$;


--
-- Name: update_category_invoice_totals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_category_invoice_totals() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultations (
    consultation_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    subjective text,
    objective text,
    assessment text,
    plan text,
    diagnosis text[],
    notes text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    complaints text,
    history_of_present_illness text,
    past_medical_history text,
    examination_findings text,
    differential_diagnosis text[],
    treatment_plan text,
    follow_up_date timestamp with time zone,
    follow_up_notes text,
    clinical_notes text,
    consultation_date timestamp with time zone DEFAULT now(),
    status public.request_status DEFAULT 'Completed'::public.request_status,
    encounter_id uuid NOT NULL,
    diagnosis_text text,
    patient_id character varying(50),
    visit_id character varying(50),
    doctor_id character varying(50),
    clinic_id character varying(50),
    requires_nurse_followup boolean DEFAULT false,
    nurse_followup_instructions text,
    nurse_acknowledged_by uuid,
    nurse_acknowledged_at timestamp with time zone,
    family_history text,
    social_history text,
    review_of_systems text,
    physical_examination text,
    recommendations text,
    icd10_codes jsonb DEFAULT '[]'::jsonb,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    patient_uuid uuid,
    visit_uuid uuid,
    doctor_uuid uuid,
    clinic_uuid uuid
);

ALTER TABLE ONLY public.consultations REPLICA IDENTITY FULL;


--
-- Name: update_consultation_with_lock(uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_consultation_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid) RETURNS SETOF public.consultations
    LANGUAGE plpgsql
    AS $$

DECLARE

  v_current_version INTEGER;

  v_last_modified_by UUID;

  v_updated_at TIMESTAMPTZ;

BEGIN

  SELECT version, last_modified_by, updated_at

  INTO v_current_version, v_last_modified_by, v_updated_at

  FROM consultations WHERE id = p_id FOR UPDATE;

  

  IF NOT FOUND THEN

    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';

  END IF;

  

  IF v_current_version != p_expected_version THEN

    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',

      p_expected_version, v_current_version, v_last_modified_by, v_updated_at

      USING ERRCODE = 'P0003';

  END IF;

  

  RETURN QUERY

  UPDATE consultations SET

    history_of_presenting_illness = COALESCE(

      (p_updates->>'history_of_presenting_illness')::TEXT, 

      history_of_presenting_illness

    ),

    examination_findings = COALESCE(

      (p_updates->>'examination_findings')::TEXT, 

      examination_findings

    ),

    clinical_notes = COALESCE((p_updates->>'clinical_notes')::TEXT, clinical_notes),

    plan = COALESCE((p_updates->>'plan')::TEXT, plan),

    status = COALESCE((p_updates->>'status')::VARCHAR, status),

    last_modified_by = p_modified_by,

    version = v_current_version

  WHERE id = p_id

  RETURNING *;

END;

$$;


--
-- Name: update_doctor_orders_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_doctor_orders_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: lab_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_requests (
    request_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinical_notes text,
    priority public.priority DEFAULT 'Normal'::public.priority,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid NOT NULL,
    accepted_by uuid,
    accepted_at timestamp with time zone,
    rejection_reason text,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    payment_verified_at timestamp with time zone,
    sample_collected_by uuid,
    sample_collected_at timestamp with time zone,
    processing_started_at timestamp with time zone,
    result_entered_by uuid,
    result_entered_at timestamp with time zone,
    result_viewed_by uuid,
    result_viewed_at timestamp with time zone,
    is_critical boolean DEFAULT false,
    critical_notified_at timestamp with time zone,
    test_id uuid,
    consultation_id uuid,
    result jsonb,
    result_notes text,
    result_file_url text,
    patient_id character varying(50),
    visit_id character varying(50),
    ordered_by character varying(50),
    processed_by uuid,
    result_date timestamp with time zone,
    result_value numeric(15,4),
    result_unit character varying(50),
    result_status character varying(50),
    reference_range character varying(100),
    interpretation text,
    methodology text,
    diagnosis text[],
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64),
    last_modified_by uuid,
    payer_type character varying(20) DEFAULT 'private'::character varying,
    requires_nhis_verification boolean DEFAULT false,
    nhis_approval_status public.nhis_approval_status DEFAULT 'not_required'::public.nhis_approval_status,
    nhis_approval_id uuid,
    billing_release_status public.billing_release_status DEFAULT 'blocked'::public.billing_release_status,
    execution_status public.service_execution_status DEFAULT 'draft'::public.service_execution_status,
    released_by uuid,
    released_at timestamp with time zone,
    patient_uuid uuid,
    visit_uuid uuid,
    ordered_by_uuid uuid
);

ALTER TABLE ONLY public.lab_requests REPLICA IDENTITY FULL;


--
-- Name: update_lab_request_with_lock(uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_lab_request_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid) RETURNS SETOF public.lab_requests
    LANGUAGE plpgsql
    AS $$

DECLARE

  v_current_version INTEGER;

  v_last_modified_by UUID;

  v_updated_at TIMESTAMPTZ;

BEGIN

  SELECT version, last_modified_by, updated_at

  INTO v_current_version, v_last_modified_by, v_updated_at

  FROM lab_requests WHERE id = p_id FOR UPDATE;

  

  IF NOT FOUND THEN

    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';

  END IF;

  

  IF v_current_version != p_expected_version THEN

    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',

      p_expected_version, v_current_version, v_last_modified_by, v_updated_at

      USING ERRCODE = 'P0003';

  END IF;

  

  RETURN QUERY

  UPDATE lab_requests SET

    status = COALESCE((p_updates->>'status')::public.clinical_request_status, status),

    priority = COALESCE((p_updates->>'priority')::public.clinical_urgency, priority),

    notes = COALESCE((p_updates->>'notes')::TEXT, notes),

    last_modified_by = p_modified_by,

    version = v_current_version

  WHERE id = p_id

  RETURNING *;

END;

$$;


--
-- Name: update_nursing_interventions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_nursing_interventions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_nursing_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_nursing_notes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_patient_status_on_admission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_patient_status_on_admission() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: update_patient_status_on_discharge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_patient_status_on_discharge() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) DEFAULT gen_random_uuid() NOT NULL,
    emr_number character varying(50),
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    surname character varying(100) NOT NULL,
    gender public.gender NOT NULL,
    date_of_birth date,
    nationality character varying(100),
    state_of_origin character varying(100),
    lga character varying(100),
    contact_phone character varying(50),
    email character varying(255),
    residential_address text,
    nok_name character varying(100),
    nok_relationship character varying(100),
    nok_phone character varying(50),
    nok_address text,
    patient_category public.patient_category,
    insurance_type public.insurance_type,
    patient_type public.patient_type,
    principal_id uuid,
    relationship_to_principal character varying(50),
    staff_category public.staff_category,
    military_branch public.military_branch,
    rank character varying(100),
    service_number character varying(100),
    unit character varying(100),
    occupation character varying(100),
    employer character varying(100),
    nhis_number character varying(50),
    national_id character varying(50),
    nhis_patient_source public.nhis_patient_source,
    referral_code character varying(100),
    referring_facility_name character varying(255),
    referring_facility_nhis_id character varying(100),
    referral_date date,
    referral_reason text,
    referral_status public.referral_status_enum,
    referral_expiry_date date,
    clinical_summary text,
    blood_group character varying(10),
    known_allergies text[],
    registered_by uuid,
    registration_date timestamp with time zone DEFAULT now(),
    status public.patient_status DEFAULT 'Active'::public.patient_status,
    photo_url text,
    payer_info jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    arm_of_service text,
    current_status character varying(20) DEFAULT 'OPD'::character varying,
    course character varying(100) DEFAULT NULL::character varying,
    title character varying(50) DEFAULT NULL::character varying,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64),
    last_modified_by uuid,
    CONSTRAINT patients_current_status_check CHECK (((current_status)::text = ANY (ARRAY[('OPD'::character varying)::text, ('In-Patient'::character varying)::text, ('Discharged'::character varying)::text, ('Deceased'::character varying)::text])))
);

ALTER TABLE ONLY public.patients REPLICA IDENTITY FULL;


--
-- Name: update_patient_with_lock(uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_patient_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid) RETURNS SETOF public.patients
    LANGUAGE plpgsql
    AS $$

DECLARE

  v_current_version INTEGER;

  v_last_modified_by UUID;

  v_updated_at TIMESTAMPTZ;

BEGIN

  -- Get current version

  SELECT version, last_modified_by, updated_at

  INTO v_current_version, v_last_modified_by, v_updated_at

  FROM patients WHERE id = p_id FOR UPDATE;

  

  IF NOT FOUND THEN

    RAISE EXCEPTION 'Record not found: %', p_id

      USING ERRCODE = 'P0002'; -- no_data_found

  END IF;

  

  IF v_current_version != p_expected_version THEN

    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',

      p_expected_version, v_current_version, v_last_modified_by, v_updated_at

      USING ERRCODE = 'P0003'; -- Custom code for version conflict

  END IF;

  

  -- Perform update (trigger will increment version)

  RETURN QUERY

  UPDATE patients SET

    first_name = COALESCE((p_updates->>'first_name')::VARCHAR, first_name),

    middle_name = COALESCE((p_updates->>'middle_name')::VARCHAR, middle_name),

    surname = COALESCE((p_updates->>'surname')::VARCHAR, surname),

    date_of_birth = COALESCE((p_updates->>'date_of_birth')::DATE, date_of_birth),

    gender = COALESCE((p_updates->>'gender')::public.gender, gender),

    contact_phone = COALESCE((p_updates->>'contact_phone')::VARCHAR, contact_phone),

    email = COALESCE((p_updates->>'email')::VARCHAR, email),

    residential_address = COALESCE((p_updates->>'residential_address')::TEXT, residential_address),

    blood_group = COALESCE((p_updates->>'blood_group')::VARCHAR, blood_group),

    last_modified_by = p_modified_by,

    version = v_current_version -- Trigger will increment

  WHERE id = p_id

  RETURNING *;

END;

$$;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    prescription_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    notes text,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    verification_notes text,
    payment_verified_at timestamp with time zone,
    dispensed_by uuid,
    dispensed_at timestamp with time zone,
    partial_dispense_reason text,
    backorder_items jsonb DEFAULT '[]'::jsonb,
    drug_interaction_checked boolean DEFAULT false,
    allergy_checked boolean DEFAULT false,
    consultation_id uuid,
    drug_id uuid,
    dosage character varying(100),
    frequency character varying(50),
    duration character varying(50),
    route character varying(50),
    quantity_prescribed integer,
    quantity_dispensed integer DEFAULT 0,
    instructions text,
    patient_id character varying(50),
    visit_id character varying(50),
    doctor_id character varying(50),
    dispensed_date timestamp with time zone,
    drug_name character varying(255),
    diagnosis text[],
    clinical_notes text,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64),
    last_modified_by uuid,
    payer_type character varying(20) DEFAULT 'private'::character varying,
    requires_nhis_verification boolean DEFAULT false,
    nhis_approval_status public.nhis_approval_status DEFAULT 'not_required'::public.nhis_approval_status,
    nhis_approval_id uuid,
    billing_release_status public.billing_release_status DEFAULT 'blocked'::public.billing_release_status,
    execution_status public.service_execution_status DEFAULT 'draft'::public.service_execution_status,
    released_by uuid,
    released_at timestamp with time zone,
    is_military_personnel_free boolean DEFAULT false,
    patient_uuid uuid,
    visit_uuid uuid,
    doctor_uuid uuid
);

ALTER TABLE ONLY public.prescriptions REPLICA IDENTITY FULL;


--
-- Name: update_prescription_with_lock(uuid, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_prescription_with_lock(p_id uuid, p_expected_version integer, p_updates jsonb, p_modified_by uuid) RETURNS SETOF public.prescriptions
    LANGUAGE plpgsql
    AS $$

DECLARE

  v_current_version INTEGER;

  v_last_modified_by UUID;

  v_updated_at TIMESTAMPTZ;

BEGIN

  SELECT version, last_modified_by, updated_at

  INTO v_current_version, v_last_modified_by, v_updated_at

  FROM prescriptions WHERE id = p_id FOR UPDATE;

  

  IF NOT FOUND THEN

    RAISE EXCEPTION 'Record not found: %', p_id USING ERRCODE = 'P0002';

  END IF;

  

  IF v_current_version != p_expected_version THEN

    RAISE EXCEPTION 'Version conflict: expected %, found %. Last modified by % at %',

      p_expected_version, v_current_version, v_last_modified_by, v_updated_at

      USING ERRCODE = 'P0003';

  END IF;

  

  RETURN QUERY

  UPDATE prescriptions SET

    status = COALESCE((p_updates->>'status')::VARCHAR, status),

    quantity_dispensed = COALESCE((p_updates->>'quantity_dispensed')::INTEGER, quantity_dispensed),

    dispensed_by = COALESCE((p_updates->>'dispensed_by')::UUID, dispensed_by),

    dispensed_at = COALESCE((p_updates->>'dispensed_at')::TIMESTAMPTZ, dispensed_at),

    last_modified_by = p_modified_by,

    version = v_current_version

  WHERE id = p_id

  RETURNING *;

END;

$$;


--
-- Name: update_progress_notes_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_progress_notes_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_vital_schedule_on_record(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vital_schedule_on_record() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: update_ward_bed_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ward_bed_counts() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: validate_billing_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_billing_item() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: validate_encounter_active(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_encounter_active(p_encounter_id uuid) RETURNS boolean
    LANGUAGE plpgsql
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


--
-- Name: verify_encounter_action(uuid, uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_encounter_action(p_encounter_id uuid, p_user_id uuid, p_action character varying) RETURNS TABLE(can_perform boolean, reason text, encounter_role character varying)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: verify_nhis_encounter(uuid, uuid, uuid, public.nhis_tariff_group); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_nhis_encounter(p_encounter_id uuid, p_auth_id uuid, p_verified_by uuid, p_tariff_group public.nhis_tariff_group DEFAULT 'Civilian_HMO'::public.nhis_tariff_group) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$

DECLARE

    v_auth RECORD;

    v_encounter RECORD;

    v_policy RECORD;

    v_result JSONB;

BEGIN

    -- Get authorization

    SELECT * INTO v_auth FROM nhis_authorizations WHERE id = p_auth_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Authorization not found');

    END IF;

    

    -- Check authorization status

    IF v_auth.status != 'active' THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Authorization is not active');

    END IF;

    

    -- Check expiry

    IF v_auth.expiry_date < NOW() THEN

        UPDATE nhis_authorizations SET status = 'expired' WHERE id = p_auth_id;

        RETURN jsonb_build_object('success', FALSE, 'error', 'Authorization has expired');

    END IF;

    

    -- Get encounter

    SELECT * INTO v_encounter FROM visits WHERE id = p_encounter_id;

    IF NOT FOUND THEN

        RETURN jsonb_build_object('success', FALSE, 'error', 'Encounter not found');

    END IF;

    

    -- Get policy config

    SELECT * INTO v_policy FROM nhis_policy_config WHERE is_active = TRUE LIMIT 1;

    

    -- Update encounter

    UPDATE visits SET

        payer_type = 'nhis',

        nhis_auth_id = p_auth_id,

        nhis_verification_status = 'verified',

        nhis_verified_by = p_verified_by,

        nhis_verified_at = NOW(),

        nhis_tariff_group = p_tariff_group,

        nhis_policy_snapshot = jsonb_build_object(

            'auth_code', v_auth.auth_code,

            'auth_expiry', v_auth.expiry_date,

            'tariff_group', p_tariff_group,

            'verified_at', NOW()

        ),

        updated_at = NOW()

    WHERE id = p_encounter_id;

    

    -- Log audit

    INSERT INTO nhis_audit_log (

        action_type, action_description, entity_type, entity_id,

        patient_id, encounter_id, new_state, performed_by

    ) VALUES (

        'ENCOUNTER_VERIFIED', 'NHIS encounter verified', 'encounter', p_encounter_id,

        v_encounter.patient_id, p_encounter_id,

        jsonb_build_object('auth_id', p_auth_id, 'tariff_group', p_tariff_group),

        p_verified_by

    );

    

    RETURN jsonb_build_object(

        'success', TRUE,

        'encounter_id', p_encounter_id,

        'auth_id', p_auth_id,

        'tariff_group', p_tariff_group

    );

END;

$$;


--
-- Name: admissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    encounter_id uuid,
    admission_number character varying(50) NOT NULL,
    admission_date timestamp with time zone DEFAULT now() NOT NULL,
    expected_discharge_date date,
    actual_discharge_date timestamp with time zone,
    admission_type character varying(50) NOT NULL,
    admission_source character varying(50),
    current_ward_id uuid,
    current_bed_id uuid,
    admitting_diagnosis text NOT NULL,
    admitting_diagnosis_icd10 character varying(20),
    secondary_diagnoses jsonb DEFAULT '[]'::jsonb,
    chief_complaint text,
    reason_for_admission text,
    admitting_doctor_id uuid,
    attending_physician_id uuid,
    primary_nurse_id uuid,
    care_team jsonb DEFAULT '[]'::jsonb,
    admission_status character varying(30) DEFAULT 'admitted'::character varying NOT NULL,
    acuity_level character varying(20),
    code_status character varying(30) DEFAULT 'full_code'::character varying,
    isolation_required boolean DEFAULT false,
    isolation_type character varying(50),
    fall_risk_level character varying(20),
    pressure_ulcer_risk character varying(20),
    allergies_snapshot jsonb DEFAULT '[]'::jsonb,
    alerts jsonb DEFAULT '[]'::jsonb,
    diet_type character varying(50),
    diet_restrictions text,
    activity_level character varying(50),
    mobility_status character varying(50),
    discharge_type character varying(50),
    discharge_disposition text,
    discharge_diagnosis text,
    discharge_diagnosis_icd10 character varying(20),
    discharge_summary text,
    discharge_instructions text,
    follow_up_appointments jsonb DEFAULT '[]'::jsonb,
    discharge_medications jsonb DEFAULT '[]'::jsonb,
    discharged_by uuid,
    insurance_verified boolean DEFAULT false,
    pre_authorization_number character varying(100),
    estimated_cost numeric(12,2),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    clinical_request_id uuid,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64),
    last_modified_by uuid,
    CONSTRAINT admissions_acuity_level_check CHECK (((acuity_level)::text = ANY (ARRAY[('low'::character varying)::text, ('moderate'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT admissions_admission_source_check CHECK (((admission_source)::text = ANY (ARRAY[('emergency'::character varying)::text, ('outpatient'::character varying)::text, ('referral'::character varying)::text, ('transfer'::character varying)::text, ('direct'::character varying)::text]))),
    CONSTRAINT admissions_admission_status_check CHECK (((admission_status)::text = ANY (ARRAY[('admitted'::character varying)::text, ('under_observation'::character varying)::text, ('critical'::character varying)::text, ('stable'::character varying)::text, ('improving'::character varying)::text, ('discharged'::character varying)::text, ('transferred'::character varying)::text, ('deceased'::character varying)::text, ('absconded'::character varying)::text]))),
    CONSTRAINT admissions_admission_type_check CHECK (((admission_type)::text = ANY (ARRAY[('emergency'::character varying)::text, ('elective'::character varying)::text, ('transfer'::character varying)::text, ('observation'::character varying)::text, ('day_case'::character varying)::text]))),
    CONSTRAINT admissions_code_status_check CHECK (((code_status)::text = ANY (ARRAY[('full_code'::character varying)::text, ('dnr'::character varying)::text, ('dni'::character varying)::text, ('dnr_dni'::character varying)::text, ('comfort_care'::character varying)::text]))),
    CONSTRAINT admissions_discharge_type_check CHECK (((discharge_type)::text = ANY (ARRAY[('home'::character varying)::text, ('transfer'::character varying)::text, ('against_medical_advice'::character varying)::text, ('deceased'::character varying)::text, ('skilled_nursing'::character varying)::text, ('rehabilitation'::character varying)::text, ('hospice'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: beds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ward_id uuid NOT NULL,
    bed_number character varying(20) NOT NULL,
    bed_type character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'available'::character varying NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    daily_rate numeric(10,2),
    current_patient_id uuid,
    current_admission_id uuid,
    location_details text,
    is_active boolean DEFAULT true,
    last_cleaned_at timestamp with time zone,
    last_maintenance_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT beds_bed_type_check CHECK (((bed_type)::text = ANY (ARRAY[('standard'::character varying)::text, ('electric'::character varying)::text, ('icu'::character varying)::text, ('pediatric'::character varying)::text, ('bariatric'::character varying)::text, ('low'::character varying)::text, ('stretcher'::character varying)::text, ('crib'::character varying)::text, ('bassinet'::character varying)::text]))),
    CONSTRAINT beds_status_check CHECK (((status)::text = ANY (ARRAY[('Available'::character varying)::text, ('Occupied'::character varying)::text, ('Cleaning'::character varying)::text, ('Maintenance'::character varying)::text, ('Reserved'::character varying)::text])))
);


--
-- Name: billing_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    billing_order_id uuid,
    item_type public.service_type,
    item_id uuid,
    item_name character varying(255) NOT NULL,
    quantity integer DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    status public.payment_status DEFAULT 'Unpaid'::public.payment_status,
    created_at timestamp with time zone DEFAULT now(),
    nhis_covered boolean DEFAULT false,
    nhis_percentage integer DEFAULT 0,
    nhis_payable numeric(10,2) DEFAULT 0,
    patient_payable numeric(10,2) DEFAULT 0,
    service_reference_id uuid,
    service_name character varying(255),
    unit_cost numeric(10,2),
    gross_amount numeric(10,2),
    verification_status public.item_verification_status DEFAULT 'pending'::public.item_verification_status,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    adjusted_price numeric(10,2),
    adjusted_by uuid,
    adjusted_at timestamp with time zone,
    original_price numeric(10,2),
    stock_validated boolean DEFAULT false,
    stock_validated_at timestamp with time zone
);

ALTER TABLE ONLY public.billing_items REPLICA IDENTITY FULL;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id character varying(50),
    email character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role public.user_role NOT NULL,
    staff_category public.staff_category,
    military_branch public.military_branch,
    rank character varying(100),
    service_number character varying(100),
    department_id uuid,
    phone character varying(50),
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    department text,
    user_id uuid,
    facility_id uuid,
    last_activity timestamp with time zone,
    photo_url text
);


--
-- Name: wards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    ward_type character varying(50) NOT NULL,
    total_beds integer DEFAULT 0 NOT NULL,
    available_beds integer DEFAULT 0 NOT NULL,
    description text,
    floor_number integer,
    building character varying(100),
    nurse_station_phone character varying(20),
    head_nurse_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    gender_restriction character varying(20),
    price numeric(10,2) DEFAULT 0,
    nhis_price numeric(10,2) DEFAULT 0,
    is_nhis_covered boolean DEFAULT true,
    nhis_percentage integer DEFAULT 50,
    CONSTRAINT available_beds_check CHECK (((available_beds >= 0) AND (available_beds <= total_beds))),
    CONSTRAINT wards_gender_restriction_check CHECK (((gender_restriction)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text, ('none'::character varying)::text]))),
    CONSTRAINT wards_ward_type_check CHECK (((ward_type)::text = ANY (ARRAY[('general'::character varying)::text, ('icu'::character varying)::text, ('pediatric'::character varying)::text, ('maternity'::character varying)::text, ('surgical'::character varying)::text, ('orthopedic'::character varying)::text, ('cardiac'::character varying)::text, ('emergency'::character varying)::text, ('psychiatric'::character varying)::text, ('isolation'::character varying)::text])))
);


--
-- Name: active_admissions_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_admissions_view AS
 SELECT a.id AS admission_id,
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
  WHERE ((a.admission_status)::text <> ALL (ARRAY[('discharged'::character varying)::text, ('deceased'::character varying)::text]));


--
-- Name: bed_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bed_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    from_ward_id uuid,
    from_bed_id uuid,
    to_ward_id uuid NOT NULL,
    to_bed_id uuid NOT NULL,
    transfer_date timestamp with time zone DEFAULT now() NOT NULL,
    transfer_reason character varying(100) NOT NULL,
    transfer_reason_details text,
    clinical_status_at_transfer character varying(30),
    authorized_by uuid NOT NULL,
    performed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    CONSTRAINT bed_transfers_transfer_reason_check CHECK (((transfer_reason)::text = ANY (ARRAY[('clinical_upgrade'::character varying)::text, ('clinical_downgrade'::character varying)::text, ('bed_availability'::character varying)::text, ('patient_request'::character varying)::text, ('isolation_required'::character varying)::text, ('isolation_cleared'::character varying)::text, ('procedure'::character varying)::text, ('surgery'::character varying)::text, ('discharge_preparation'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visits (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    visit_id character varying(50) NOT NULL,
    patient_id uuid,
    clinic_id uuid,
    visit_type character varying(50),
    encounter_number character varying(50),
    encounter_date date,
    priority public.priority DEFAULT 'Normal'::public.priority,
    chief_complaint text,
    payment_category public.payment_method,
    status public.visit_status DEFAULT 'Active'::public.visit_status,
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    discharge_date timestamp with time zone,
    discharge_notes text,
    attending_doctor_id uuid,
    registered_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    current_stage text DEFAULT 'registered'::text,
    stage_updated_at timestamp with time zone DEFAULT now(),
    stage_history jsonb DEFAULT '[]'::jsonb,
    closed_by uuid,
    closed_reason text,
    insurance_type character varying(50),
    encounter_category character varying(20) DEFAULT 'outpatient'::character varying,
    expected_duration_days integer DEFAULT 1,
    admission_date timestamp with time zone,
    ward_location character varying(100),
    bed_number character varying(20),
    opd_classification public.opd_classification,
    is_referral_encounter boolean DEFAULT false,
    source_referral_id uuid,
    referring_doctor_id uuid,
    referring_clinic_id uuid,
    referral_reason text,
    referral_clinical_notes text,
    payer_type character varying(20) DEFAULT 'private'::character varying,
    nhis_auth_id uuid,
    nhis_verification_status public.nhis_verification_status DEFAULT 'not_applicable'::public.nhis_verification_status,
    nhis_policy_snapshot jsonb,
    nhis_verified_by uuid,
    nhis_verified_at timestamp with time zone,
    nhis_tariff_group public.nhis_tariff_group,
    nhis_override_reason text,
    nhis_override_by uuid,
    nhis_override_at timestamp with time zone,
    requires_post_authorization boolean DEFAULT false,
    CONSTRAINT visits_payer_type_check CHECK (((payer_type)::text = ANY ((ARRAY['private'::character varying, 'nhis'::character varying, 'retainership'::character varying, 'military_free'::character varying])::text[])))
);

ALTER TABLE ONLY public.visits REPLICA IDENTITY FULL;

ALTER TABLE ONLY public.visits FORCE ROW LEVEL SECURITY;


--
-- Name: ward_round_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ward_round_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admission_id uuid NOT NULL,
    encounter_id uuid NOT NULL,
    round_date date DEFAULT CURRENT_DATE NOT NULL,
    round_type character varying(50) NOT NULL,
    subjective_notes text,
    objective_findings text,
    vital_signs jsonb,
    assessment text,
    plan text,
    new_orders jsonb DEFAULT '[]'::jsonb,
    discontinued_orders jsonb DEFAULT '[]'::jsonb,
    nursing_instructions text,
    patient_condition character varying(30),
    estimated_discharge_date date,
    discharge_planning_notes text,
    attending_physician_id uuid,
    participants jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    CONSTRAINT ward_round_notes_round_type_check CHECK (((round_type)::text = ANY (ARRAY[('morning'::character varying)::text, ('evening'::character varying)::text, ('night'::character varying)::text, ('consultant'::character varying)::text, ('multidisciplinary'::character varying)::text, ('teaching'::character varying)::text])))
);


--
-- Name: admission_history_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.admission_history_view AS
 SELECT a.id AS admission_id,
    a.admission_number,
    a.encounter_id,
    v.encounter_number,
    p.id AS patient_id,
    p.first_name,
    p.surname AS last_name,
    p.emr_number AS hospital_id,
    a.admission_date,
    a.actual_discharge_date,
    a.admission_type,
    a.admission_status,
    a.acuity_level,
    a.admitting_diagnosis,
    a.discharge_diagnosis,
    a.discharge_type,
    a.discharge_summary,
    w.name AS ward_name,
    b.bed_number,
    (((admitting_doc.first_name)::text || ' '::text) || (admitting_doc.last_name)::text) AS admitting_doctor_name,
    (((attending_doc.first_name)::text || ' '::text) || (attending_doc.last_name)::text) AS attending_physician_name,
    (((discharged_doc.first_name)::text || ' '::text) || (discharged_doc.last_name)::text) AS discharged_by_name,
    (EXTRACT(day FROM (COALESCE(a.actual_discharge_date, now()) - a.admission_date)))::integer AS length_of_stay_days,
    ( SELECT count(*) AS count
           FROM public.ward_round_notes wrn
          WHERE (wrn.admission_id = a.id)) AS ward_round_count,
    ( SELECT count(*) AS count
           FROM public.bed_transfers bt
          WHERE (bt.admission_id = a.id)) AS transfer_count,
    a.facility_id
   FROM (((((((public.admissions a
     JOIN public.patients p ON ((p.id = a.patient_id)))
     LEFT JOIN public.wards w ON ((w.id = a.current_ward_id)))
     LEFT JOIN public.beds b ON ((b.id = a.current_bed_id)))
     LEFT JOIN public.staff admitting_doc ON ((admitting_doc.id = a.admitting_doctor_id)))
     LEFT JOIN public.staff attending_doc ON ((attending_doc.id = a.attending_physician_id)))
     LEFT JOIN public.staff discharged_doc ON ((discharged_doc.id = a.discharged_by)))
     LEFT JOIN public.visits v ON ((v.id = a.encounter_id)))
  ORDER BY a.admission_date DESC;


--
-- Name: clinical_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_number character varying(50),
    patient_id uuid NOT NULL,
    encounter_id uuid NOT NULL,
    requesting_doctor_id uuid NOT NULL,
    requesting_department_id uuid,
    request_type public.clinical_request_type NOT NULL,
    clinical_reason text NOT NULL,
    urgency public.clinical_urgency DEFAULT 'Routine'::public.clinical_urgency NOT NULL,
    suggested_timeframe character varying(100),
    notes text,
    target_department_id uuid,
    target_ward_id uuid,
    target_doctor_id uuid,
    admission_type character varying(20),
    suggested_ward_type character varying(50),
    level_of_care character varying(20),
    expected_duration character varying(50),
    special_requirements text,
    procedure_catalogue_id uuid,
    procedure_name character varying(255),
    procedure_notes text,
    pre_op_requirements text,
    follow_up_reason text,
    follow_up_instructions text,
    status public.clinical_request_status DEFAULT 'Pending'::public.clinical_request_status,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    admission_id uuid,
    procedure_id uuid,
    referral_id uuid,
    follow_up_visit_id uuid,
    scheduled_date date,
    scheduled_time time without time zone,
    scheduled_by uuid,
    scheduling_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    facility_id uuid,
    sla_hours integer,
    sla_deadline timestamp with time zone,
    sla_warning_sent boolean DEFAULT false,
    sla_breach_sent boolean DEFAULT false,
    specialty_module character varying(50),
    referral_workflow_status character varying(50) DEFAULT 'Pending_Encounter_Office'::character varying,
    appointment_date date,
    appointment_time time without time zone,
    appointment_notes text,
    appointment_booked_by uuid,
    appointment_booked_at timestamp with time zone,
    referral_encounter_id uuid,
    source_clinic_id uuid,
    CONSTRAINT clinical_requests_admission_type_check CHECK (((admission_type)::text = ANY (ARRAY[('Emergency'::character varying)::text, ('Elective'::character varying)::text]))),
    CONSTRAINT clinical_requests_level_of_care_check CHECK (((level_of_care)::text = ANY (ARRAY[('Ward'::character varying)::text, ('ICU'::character varying)::text, ('HDU'::character varying)::text, ('NICU'::character varying)::text])))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category public.department_category NOT NULL,
    building character varying(100),
    floor character varying(50),
    status public.department_status DEFAULT 'Active'::public.department_status,
    accepts_queue boolean DEFAULT true,
    accepts_referrals boolean DEFAULT true,
    requires_payment boolean DEFAULT false,
    default_priority integer DEFAULT 1,
    head_of_department uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    opd_type character varying(20),
    CONSTRAINT departments_opd_type_check CHECK (((opd_type)::text = ANY (ARRAY[('MOPD'::character varying)::text, ('SOPD'::character varying)::text, ('Support'::character varying)::text, ('Diagnostic'::character varying)::text, ('Administrative'::character varying)::text])))
);


--
-- Name: admission_requests_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.admission_requests_view AS
 SELECT cr.id,
    cr.request_number,
    cr.patient_id,
    cr.encounter_id,
    cr.requesting_doctor_id,
    cr.requesting_department_id,
    cr.request_type,
    cr.clinical_reason,
    cr.urgency,
    cr.suggested_timeframe,
    cr.notes,
    cr.target_department_id,
    cr.target_ward_id,
    cr.target_doctor_id,
    cr.admission_type,
    cr.suggested_ward_type,
    cr.level_of_care,
    cr.expected_duration,
    cr.special_requirements,
    cr.procedure_catalogue_id,
    cr.procedure_name,
    cr.procedure_notes,
    cr.pre_op_requirements,
    cr.follow_up_reason,
    cr.follow_up_instructions,
    cr.status,
    cr.reviewed_by,
    cr.reviewed_at,
    cr.review_notes,
    cr.approved_by,
    cr.approved_at,
    cr.rejection_reason,
    cr.admission_id,
    cr.procedure_id,
    cr.referral_id,
    cr.follow_up_visit_id,
    cr.scheduled_date,
    cr.scheduled_time,
    cr.scheduled_by,
    cr.scheduling_notes,
    cr.created_at,
    cr.updated_at,
    cr.created_by,
    cr.facility_id,
    (((p.first_name)::text || ' '::text) || (p.surname)::text) AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    p.patient_category,
    p.insurance_type,
    (((doc.first_name)::text || ' '::text) || (doc.last_name)::text) AS requesting_doctor_name,
    dept.name AS requesting_department_name,
    target_ward.name AS suggested_ward_name,
    target_ward.ward_type,
    target_ward.available_beds
   FROM ((((public.clinical_requests cr
     JOIN public.patients p ON ((cr.patient_id = p.id)))
     LEFT JOIN public.staff doc ON ((cr.requesting_doctor_id = doc.id)))
     LEFT JOIN public.departments dept ON ((cr.requesting_department_id = dept.id)))
     LEFT JOIN public.wards target_ward ON ((cr.target_ward_id = target_ward.id)))
  WHERE (cr.request_type = 'Admission'::public.clinical_request_type)
  ORDER BY
        CASE cr.urgency
            WHEN 'Emergency'::public.clinical_urgency THEN 1
            WHEN 'Urgent'::public.clinical_urgency THEN 2
            ELSE 3
        END, cr.created_at;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id uuid,
    doctor_id uuid,
    department_id uuid,
    appointment_date date NOT NULL,
    appointment_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 15,
    type public.appointment_type DEFAULT 'Consultation'::public.appointment_type,
    status public.appointment_status DEFAULT 'Scheduled'::public.appointment_status,
    reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bed_availability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.bed_availability AS
 SELECT w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    b.id AS bed_id,
    b.bed_number,
    b.bed_type,
    b.status,
    b.features,
    b.daily_rate,
        CASE
            WHEN ((b.status)::text = 'Available'::text) THEN NULL::text
            ELSE (((p.first_name)::text || ' '::text) || (p.surname)::text)
        END AS current_patient_name,
        CASE
            WHEN ((b.status)::text = 'Available'::text) THEN NULL::character varying
            ELSE p.emr_number
        END AS current_patient_emr,
        CASE
            WHEN ((b.status)::text = 'Available'::text) THEN NULL::character varying
            ELSE a.admission_number
        END AS admission_number,
    b.last_cleaned_at,
    b.last_maintenance_at,
    w.facility_id
   FROM (((public.beds b
     JOIN public.wards w ON ((w.id = b.ward_id)))
     LEFT JOIN public.patients p ON ((p.id = b.current_patient_id)))
     LEFT JOIN public.admissions a ON ((a.id = b.current_admission_id)))
  WHERE ((w.is_active = true) AND (b.is_active = true))
  ORDER BY w.name, b.bed_number;


--
-- Name: billing_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_audit_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_type public.billing_audit_event NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    encounter_id uuid,
    patient_id uuid,
    billing_order_id uuid,
    billing_item_id uuid,
    category_invoice_id uuid,
    category_receipt_id uuid,
    old_value jsonb,
    new_value jsonb,
    changes_summary text,
    performed_by uuid NOT NULL,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    user_agent text,
    notes text,
    metadata jsonb,
    CONSTRAINT billing_audit_log_entity_type_check CHECK (((entity_type)::text = ANY (ARRAY[('billing_item'::character varying)::text, ('billing_order'::character varying)::text, ('category_invoice'::character varying)::text, ('category_receipt'::character varying)::text, ('receipt'::character varying)::text, ('invoice'::character varying)::text])))
);


--
-- Name: billing_audit_trail; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.billing_audit_trail AS
 SELECT bal.id,
    bal.event_type,
    bal.entity_type,
    bal.entity_id,
    bal.encounter_id,
    bal.patient_id,
    bal.changes_summary,
    bal.performed_at,
    bal.notes,
    (((s.first_name)::text || ' '::text) || (s.last_name)::text) AS performed_by_name,
    (((p.first_name)::text || ' '::text) || (p.surname)::text) AS patient_name,
    bal.old_value,
    bal.new_value
   FROM ((public.billing_audit_log bal
     LEFT JOIN public.staff s ON ((bal.performed_by = s.id)))
     LEFT JOIN public.patients p ON ((bal.patient_id = p.id)))
  ORDER BY bal.performed_at DESC;


--
-- Name: chief_complaint_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_complaint_catalogue (
    complaint_id uuid DEFAULT gen_random_uuid() NOT NULL,
    complaint_name character varying(100) NOT NULL,
    complaint_code character varying(20) NOT NULL,
    category public.complaint_category NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinic_id character varying(50) NOT NULL,
    clinic_name character varying(100) NOT NULL,
    clinic_code character varying(50),
    description text,
    consultation_fee numeric(10,2) DEFAULT 0,
    follow_up_fee numeric(10,2) DEFAULT 0,
    emergency_fee numeric(10,2) DEFAULT 0,
    department_id uuid,
    location character varying(100),
    operating_hours character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nhis_consultation_fee numeric(10,2) DEFAULT 0,
    nhis_follow_up_fee numeric(10,2) DEFAULT 0,
    nhis_emergency_fee numeric(10,2) DEFAULT 0,
    updated_by uuid
);


--
-- Name: clinic_price_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clinic_price_summary AS
 SELECT clinic_id,
    clinic_name,
    clinic_code,
    consultation_fee AS private_consultation,
    follow_up_fee AS private_follow_up,
    emergency_fee AS private_emergency,
    nhis_consultation_fee AS nhis_consultation,
    nhis_follow_up_fee AS nhis_follow_up,
    nhis_emergency_fee AS nhis_emergency,
    is_active,
    updated_at,
    updated_by
   FROM public.clinics
  ORDER BY clinic_id;


--
-- Name: clinical_request_daily_volume; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clinical_request_daily_volume AS
 SELECT date(created_at) AS request_date,
    request_type,
    urgency,
    count(*) AS request_count,
    count(*) FILTER (WHERE (status = 'Completed'::public.clinical_request_status)) AS completed_count,
    count(*) FILTER (WHERE (status = 'Rejected'::public.clinical_request_status)) AS rejected_count,
    count(*) FILTER (WHERE (status = ANY (ARRAY['Pending'::public.clinical_request_status, 'Under_Review'::public.clinical_request_status]))) AS pending_count,
    (avg((EXTRACT(epoch FROM (
        CASE
            WHEN (status = 'Completed'::public.clinical_request_status) THEN updated_at
            ELSE now()
        END - created_at)) / (3600)::numeric)))::numeric(10,2) AS avg_hours
   FROM public.clinical_requests
  GROUP BY (date(created_at)), request_type, urgency
  ORDER BY (date(created_at)) DESC, request_type;


--
-- Name: clinical_request_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clinical_request_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clinical_request_sla_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clinical_request_sla_status AS
 SELECT cr.id,
    cr.request_number,
    cr.request_type,
    cr.urgency,
    cr.status,
    cr.created_at,
    cr.sla_deadline,
    cr.sla_hours,
    (((p.first_name)::text || ' '::text) || (p.surname)::text) AS patient_name,
    d.name AS target_department,
        CASE
            WHEN (cr.status = ANY (ARRAY['Completed'::public.clinical_request_status, 'Cancelled'::public.clinical_request_status, 'Rejected'::public.clinical_request_status])) THEN 'N/A'::text
            WHEN (now() > cr.sla_deadline) THEN 'BREACHED'::text
            WHEN (now() > (cr.sla_deadline - ((((cr.sla_hours)::numeric * 0.25) || ' hours'::text))::interval)) THEN 'WARNING'::text
            ELSE 'ON_TRACK'::text
        END AS sla_status,
    (GREATEST((0)::numeric, (EXTRACT(epoch FROM (cr.sla_deadline - now())) / (3600)::numeric)))::numeric(10,2) AS hours_remaining
   FROM ((public.clinical_requests cr
     JOIN public.patients p ON ((cr.patient_id = p.id)))
     LEFT JOIN public.departments d ON ((cr.target_department_id = d.id)))
  WHERE (cr.status = ANY (ARRAY['Pending'::public.clinical_request_status, 'Under_Review'::public.clinical_request_status, 'Approved'::public.clinical_request_status, 'Scheduled'::public.clinical_request_status]))
  ORDER BY
        CASE
            WHEN (now() > cr.sla_deadline) THEN 1
            WHEN (now() > (cr.sla_deadline - ((((cr.sla_hours)::numeric * 0.25) || ' hours'::text))::interval)) THEN 2
            ELSE 3
        END, cr.sla_deadline;


--
-- Name: clinical_request_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.clinical_request_stats AS
 SELECT request_type,
    status,
    urgency,
    count(*) AS count,
    date(created_at) AS request_date
   FROM public.clinical_requests
  GROUP BY request_type, status, urgency, (date(created_at));


--
-- Name: clinical_request_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_request_status_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    from_status public.clinical_request_status,
    to_status public.clinical_request_status NOT NULL,
    changed_by uuid,
    change_reason text,
    changed_at timestamp with time zone DEFAULT now()
);


--
-- Name: config_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    course_name character varying(100) NOT NULL,
    course_number integer NOT NULL,
    year integer,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    facility_id uuid
);


--
-- Name: customer_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id uuid,
    feedback_type public.feedback_type NOT NULL,
    subject character varying(255) NOT NULL,
    description text,
    contact_name character varying(100),
    contact_phone character varying(50),
    contact_email character varying(100),
    status public.feedback_status DEFAULT 'Open'::public.feedback_status,
    assigned_to uuid,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_progress_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_progress_notes (
    progress_id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_date date DEFAULT CURRENT_DATE NOT NULL,
    subjective text,
    objective text,
    assessment text,
    plan text,
    nursing_summary text,
    vital_signs_summary text,
    oral_intake_ml integer DEFAULT 0,
    iv_intake_ml integer DEFAULT 0,
    urine_output_ml integer DEFAULT 0,
    other_output_ml integer DEFAULT 0,
    io_notes text,
    patient_condition character varying(50) DEFAULT 'stable'::character varying,
    alert_level character varying(20) DEFAULT 'normal'::character varying,
    recorded_by uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid NOT NULL,
    patient_id uuid NOT NULL
);


--
-- Name: dental_chart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_chart (
    chart_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    exam_id uuid NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    tooth_number integer NOT NULL,
    tooth_status public.tooth_status DEFAULT 'Present'::public.tooth_status NOT NULL,
    condition public.tooth_condition DEFAULT 'Healthy'::public.tooth_condition,
    caries_classification character varying(20),
    mobility_grade integer,
    mesial boolean DEFAULT false,
    occlusal boolean DEFAULT false,
    distal boolean DEFAULT false,
    buccal boolean DEFAULT false,
    lingual boolean DEFAULT false,
    incisal boolean DEFAULT false,
    periapical_status character varying(50),
    restoration_material character varying(50),
    restoration_date date,
    prosthesis_type character varying(50),
    sensitivity character varying(20),
    notes text,
    recorded_by uuid,
    recorded_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    patient_uuid uuid,
    CONSTRAINT dental_chart_mobility_grade_check CHECK (((mobility_grade >= 0) AND (mobility_grade <= 3))),
    CONSTRAINT dental_chart_tooth_number_check CHECK ((((tooth_number >= 11) AND (tooth_number <= 18)) OR ((tooth_number >= 21) AND (tooth_number <= 28)) OR ((tooth_number >= 31) AND (tooth_number <= 38)) OR ((tooth_number >= 41) AND (tooth_number <= 48)) OR ((tooth_number >= 51) AND (tooth_number <= 55)) OR ((tooth_number >= 61) AND (tooth_number <= 65)) OR ((tooth_number >= 71) AND (tooth_number <= 75)) OR ((tooth_number >= 81) AND (tooth_number <= 85))))
);


--
-- Name: dental_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_exams (
    exam_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    consultation_id uuid,
    facility_id uuid,
    chief_complaint text,
    complaint_duration character varying(100),
    pain_level integer,
    pain_character character varying(50),
    dental_history text,
    medical_history text,
    allergies text,
    current_medications text,
    extraoral_findings text,
    intraoral_findings text,
    soft_tissue_exam text,
    hard_tissue_exam text,
    occlusion_notes text,
    occlusion_class character varying(20),
    tmj_assessment text,
    gingival_status public.gingival_status DEFAULT 'Healthy'::public.gingival_status,
    bleeding_on_probing boolean DEFAULT false,
    plaque_score integer,
    calculus_present boolean DEFAULT false,
    pocket_depth_notes text,
    radiograph_taken boolean DEFAULT false,
    radiograph_type character varying(50),
    radiograph_findings text,
    provisional_diagnosis text,
    final_diagnosis text,
    icd_codes text[],
    treatment_plan text,
    urgency public.dental_urgency DEFAULT 'Routine'::public.dental_urgency,
    estimated_sessions integer,
    estimated_cost numeric(10,2),
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    follow_up_notes text,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    finalized_at timestamp with time zone,
    finalized_by uuid,
    patient_uuid uuid,
    CONSTRAINT dental_exam_finalized_check CHECK (((finalized_at IS NULL) OR (finalized_by IS NOT NULL))),
    CONSTRAINT dental_exams_pain_level_check CHECK (((pain_level >= 0) AND (pain_level <= 10))),
    CONSTRAINT dental_exams_plaque_score_check CHECK (((plaque_score >= 0) AND (plaque_score <= 100)))
);


--
-- Name: dental_prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_prescriptions (
    prescription_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    exam_id uuid,
    procedure_id uuid,
    facility_id uuid,
    medication_name character varying(255) NOT NULL,
    medication_type character varying(50),
    generic_name character varying(255),
    dosage character varying(100) NOT NULL,
    dosage_form character varying(50),
    frequency character varying(100) NOT NULL,
    duration character varying(100) NOT NULL,
    route character varying(50) DEFAULT 'Oral'::character varying,
    quantity integer,
    refills_allowed integer DEFAULT 0,
    special_instructions text,
    warnings text,
    prescribed_by uuid,
    prescribed_at timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'Active'::character varying,
    dispensed_at timestamp with time zone,
    dispensed_by uuid,
    patient_uuid uuid
);


--
-- Name: dental_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_procedures (
    procedure_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    exam_id uuid,
    facility_id uuid,
    procedure_code character varying(50),
    procedure_type character varying(100) NOT NULL,
    procedure_category character varying(50),
    tooth_numbers integer[],
    surfaces text[],
    procedure_description text,
    anesthesia_type character varying(50),
    anesthesia_agent character varying(100),
    anesthesia_quantity character varying(50),
    anesthesia_site character varying(100),
    consent_obtained boolean DEFAULT false,
    consent_date timestamp with time zone,
    pre_procedure_notes text,
    procedure_date timestamp with time zone,
    duration_minutes integer,
    materials_used text,
    complications text,
    post_procedure_instructions text,
    medications_prescribed text,
    sutures_placed boolean DEFAULT false,
    suture_type character varying(50),
    suture_removal_date date,
    fee numeric(10,2),
    discount_percent integer DEFAULT 0,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    priority public.priority DEFAULT 'Normal'::public.priority,
    scheduled_date timestamp with time zone,
    performed_by uuid,
    assisted_by uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2)
);


--
-- Name: department_clinical_workload; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.department_clinical_workload AS
 SELECT d.id AS department_id,
    d.name AS department_name,
    d.opd_type,
    count(*) FILTER (WHERE (cr.status = ANY (ARRAY['Pending'::public.clinical_request_status, 'Under_Review'::public.clinical_request_status]))) AS pending_requests,
    count(*) FILTER (WHERE (cr.status = ANY (ARRAY['Approved'::public.clinical_request_status, 'Scheduled'::public.clinical_request_status, 'In_Progress'::public.clinical_request_status]))) AS active_requests,
    count(*) FILTER (WHERE ((cr.status = 'Completed'::public.clinical_request_status) AND (date(cr.updated_at) = CURRENT_DATE))) AS completed_today,
    count(*) FILTER (WHERE ((cr.status = 'Completed'::public.clinical_request_status) AND (cr.updated_at >= (CURRENT_DATE - '7 days'::interval)))) AS completed_week,
    (avg((EXTRACT(epoch FROM (
        CASE
            WHEN (cr.status = 'Completed'::public.clinical_request_status) THEN cr.updated_at
            ELSE NULL::timestamp with time zone
        END - cr.created_at)) / (3600)::numeric)))::numeric(10,2) AS avg_turnaround_hours
   FROM (public.departments d
     LEFT JOIN public.clinical_requests cr ON ((cr.target_department_id = d.id)))
  WHERE (d.status = 'Active'::public.department_status)
  GROUP BY d.id, d.name, d.opd_type
  ORDER BY (count(*) FILTER (WHERE (cr.status = ANY (ARRAY['Pending'::public.clinical_request_status, 'Under_Review'::public.clinical_request_status])))) DESC;


--
-- Name: dispense_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispense_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    dispense_id uuid,
    prescription_item_id uuid,
    drug_id uuid,
    quantity_dispensed integer NOT NULL,
    batch_number character varying(50),
    expiry_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: dispense_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispense_records (
    dispense_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    prescription_id uuid,
    patient_id character varying(50),
    encounter_id uuid,
    drug_id uuid NOT NULL,
    batch_id uuid,
    quantity_dispensed integer NOT NULL,
    pharmacist_id character varying(50),
    verified_by character varying(50),
    dispensed_at timestamp with time zone DEFAULT now(),
    is_substitution boolean DEFAULT false,
    original_drug_id uuid,
    substitution_reason text,
    nhis_claim_id uuid,
    nhis_amount numeric(10,2) DEFAULT 0,
    patient_copay numeric(10,2) DEFAULT 0,
    status character varying(20) DEFAULT 'dispensed'::character varying,
    counseling_provided boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dispense_records_status_check CHECK (((status)::text = ANY (ARRAY[('dispensed'::character varying)::text, ('returned'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: dispenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispenses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    prescription_id uuid,
    patient_id uuid,
    pharmacist_id uuid,
    status public.dispense_status DEFAULT 'Dispensed'::public.dispense_status,
    dispensed_at timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: doctor_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_orders (
    order_id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id character varying(50) NOT NULL,
    patient_id character varying(50) NOT NULL,
    order_type character varying(50) NOT NULL,
    order_category character varying(50),
    instruction text NOT NULL,
    frequency character varying(100),
    duration character varying(100),
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    priority character varying(20) DEFAULT 'routine'::character varying,
    status character varying(30) DEFAULT 'pending'::character varying,
    requires_nurse_action boolean DEFAULT true,
    assigned_nurse_id uuid,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    completed_by uuid,
    completed_at timestamp with time zone,
    completion_notes text,
    ordered_by uuid NOT NULL,
    ordered_at timestamp with time zone DEFAULT now(),
    cancelled_by uuid,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: drug_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drug_batches (
    batch_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    drug_id uuid NOT NULL,
    batch_number character varying(50) NOT NULL,
    barcode character varying(100),
    quantity_received integer DEFAULT 0 NOT NULL,
    quantity_remaining integer DEFAULT 0 NOT NULL,
    manufacture_date date,
    expiry_date date NOT NULL,
    received_date timestamp with time zone DEFAULT now(),
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    selling_price numeric(10,2),
    supplier_name character varying(100),
    supplier_batch_ref character varying(100),
    purchase_order_id uuid,
    received_by uuid,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT drug_batches_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('depleted'::character varying)::text, ('expired'::character varying)::text, ('recalled'::character varying)::text, ('quarantine'::character varying)::text])))
);


--
-- Name: drug_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drug_catalogue (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    stock_quantity integer DEFAULT 0,
    reorder_level integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nhis_coverage_percent integer DEFAULT 0,
    requires_prior_auth boolean DEFAULT false,
    is_nhis_covered boolean DEFAULT false,
    description text,
    updated_by uuid,
    dosage_form text,
    strengths text,
    presentation text,
    price numeric(10,2),
    category public.drug_category,
    drug_type text,
    is_controlled boolean DEFAULT false,
    nhis_eligible boolean DEFAULT false,
    nhis_percentage integer DEFAULT 0,
    requires_prescription boolean DEFAULT true,
    unit_cost numeric(10,2) DEFAULT 0,
    unit_of_measure character varying(50) DEFAULT 'Unit'::character varying,
    manufacturer character varying(100),
    brand_name character varying(100),
    selling_price numeric(10,2) DEFAULT 0,
    formulation character varying(100),
    unit_price numeric(10,2) DEFAULT 0,
    nhis_price numeric(10,2) DEFAULT 0,
    nhis_code character varying(50),
    CONSTRAINT drug_catalogue_nhis_percentage_check CHECK (((nhis_percentage >= 0) AND (nhis_percentage <= 100)))
);


--
-- Name: emr_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emr_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encounter_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounter_access_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_role character varying(50) NOT NULL,
    action character varying(100) NOT NULL,
    action_details text,
    ip_address inet,
    user_agent text,
    was_authorized boolean DEFAULT true NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: encounter_care_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounter_care_team (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    staff_name character varying(200) NOT NULL,
    role character varying(50) NOT NULL,
    department character varying(100),
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT encounter_care_team_role_check CHECK (((role)::text = ANY (ARRAY[('primary_doctor'::character varying)::text, ('co_managing_doctor'::character varying)::text, ('consulting_doctor'::character varying)::text, ('on_call_doctor'::character varying)::text, ('department_doctor'::character varying)::text, ('referred_doctor'::character varying)::text, ('nurse'::character varying)::text, ('lab_technician'::character varying)::text, ('radiologist'::character varying)::text, ('pharmacist'::character varying)::text])))
);


--
-- Name: encounter_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.encounter_number_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encounter_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounter_transfers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid NOT NULL,
    from_doctor_id uuid NOT NULL,
    to_doctor_id uuid NOT NULL,
    transfer_type character varying(20) NOT NULL,
    reason text NOT NULL,
    transferred_by uuid NOT NULL,
    transferred_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT encounter_transfers_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('accepted'::character varying)::text, ('declined'::character varying)::text]))),
    CONSTRAINT encounter_transfers_transfer_type_check CHECK (((transfer_type)::text = ANY (ARRAY[('reassignment'::character varying)::text, ('co_management'::character varying)::text, ('consultation'::character varying)::text, ('handoff'::character varying)::text])))
);


--
-- Name: encounter_ownership_history; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.encounter_ownership_history AS
 SELECT v.id AS encounter_id,
    v.visit_id AS encounter_number,
    v.attending_doctor_id AS current_primary_doctor,
    (((sd.first_name)::text || ' '::text) || (sd.last_name)::text) AS current_doctor_name,
    v.clinic_id,
    c.clinic_name,
    v.status AS encounter_status,
    v.created_at AS encounter_created,
    COALESCE(( SELECT json_agg(json_build_object('transfer_id', et.id, 'from_doctor', (((sf.first_name)::text || ' '::text) || (sf.last_name)::text), 'to_doctor', (((st.first_name)::text || ' '::text) || (st.last_name)::text), 'type', et.transfer_type, 'reason', et.reason, 'status', et.status, 'transferred_at', et.transferred_at, 'accepted_at', et.accepted_at) ORDER BY et.transferred_at DESC) AS json_agg
           FROM ((public.encounter_transfers et
             LEFT JOIN public.staff sf ON ((et.from_doctor_id = sf.id)))
             LEFT JOIN public.staff st ON ((et.to_doctor_id = st.id)))
          WHERE (et.encounter_id = v.id)), '[]'::json) AS transfer_history,
    COALESCE(( SELECT json_agg(json_build_object('staff_id', ect.staff_id, 'staff_name', ect.staff_name, 'role', ect.role, 'department', ect.department, 'assigned_at', ect.assigned_at, 'expires_at', ect.expires_at) ORDER BY ect.assigned_at DESC) AS json_agg
           FROM public.encounter_care_team ect
          WHERE ((ect.encounter_id = v.id) AND (ect.is_active = true))), '[]'::json) AS care_team
   FROM ((public.visits v
     LEFT JOIN public.staff sd ON ((v.attending_doctor_id = sd.id)))
     LEFT JOIN public.clinics c ON (((v.clinic_id)::text = (c.clinic_id)::text)));


--
-- Name: encounter_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.encounter_summary AS
 SELECT v.id AS encounter_id,
    v.visit_id,
    v.encounter_number,
    v.encounter_date,
    v.visit_type,
    v.status,
    v.current_stage,
    v.chief_complaint,
    v.payment_category,
    p.id AS patient_id,
    p.emr_number,
    p.first_name,
    p.surname,
    p.contact_phone,
    v.created_at,
    v.updated_at
   FROM (public.visits v
     JOIN public.patients p ON ((v.patient_id = p.id)));


--
-- Name: external_referral_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_referral_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_referrals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    referral_number character varying(50),
    direction character varying(10) NOT NULL,
    patient_id uuid NOT NULL,
    encounter_id uuid,
    external_facility_name character varying(255) NOT NULL,
    external_facility_address text,
    external_facility_phone character varying(50),
    external_physician_name character varying(255),
    external_physician_contact character varying(100),
    internal_department_id uuid,
    internal_physician_id uuid,
    reason text NOT NULL,
    clinical_summary text,
    urgency character varying(20) DEFAULT 'Routine'::character varying,
    status character varying(20) DEFAULT 'Pending'::character varying,
    referral_letter_path text,
    response_letter_path text,
    referral_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_date date,
    completed_date date,
    notes text,
    outcome text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT external_referrals_direction_check CHECK (((direction)::text = ANY (ARRAY[('incoming'::character varying)::text, ('outgoing'::character varying)::text]))),
    CONSTRAINT external_referrals_status_check CHECK (((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Accepted'::character varying)::text, ('InProgress'::character varying)::text, ('Completed'::character varying)::text, ('Rejected'::character varying)::text, ('Cancelled'::character varying)::text]))),
    CONSTRAINT external_referrals_urgency_check CHECK (((urgency)::text = ANY (ARRAY[('Routine'::character varying)::text, ('Urgent'::character varying)::text, ('Emergency'::character varying)::text])))
);


--
-- Name: eye_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eye_exams (
    exam_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    consultation_id uuid,
    facility_id uuid,
    chief_complaint text,
    complaint_duration character varying(100),
    affected_eye public.affected_eye,
    ocular_history text,
    ocular_surgery_history text,
    systemic_history text,
    family_history text,
    drug_allergy text,
    current_medications text,
    glasses_history text,
    contact_lens_history text,
    va_right_unaided character varying(20),
    va_left_unaided character varying(20),
    va_right_aided character varying(20),
    va_left_aided character varying(20),
    va_right_pinhole character varying(20),
    va_left_pinhole character varying(20),
    va_right_near character varying(20),
    va_left_near character varying(20),
    ar_right_sphere numeric(5,2),
    ar_right_cylinder numeric(5,2),
    ar_right_axis integer,
    ar_left_sphere numeric(5,2),
    ar_left_cylinder numeric(5,2),
    ar_left_axis integer,
    rx_right_sphere numeric(5,2),
    rx_right_cylinder numeric(5,2),
    rx_right_axis integer,
    rx_right_add numeric(5,2),
    rx_right_prism character varying(50),
    rx_left_sphere numeric(5,2),
    rx_left_cylinder numeric(5,2),
    rx_left_axis integer,
    rx_left_add numeric(5,2),
    rx_left_prism character varying(50),
    rx_pd integer,
    rx_pd_right integer,
    rx_pd_left integer,
    bcva_right character varying(20),
    bcva_left character varying(20),
    iop_right numeric(4,1),
    iop_left numeric(4,1),
    iop_method public.iop_method,
    iop_time time without time zone,
    cct_right integer,
    cct_left integer,
    pupil_right_size integer,
    pupil_left_size integer,
    pupil_right_reaction character varying(50),
    pupil_left_reaction character varying(50),
    cover_test text,
    ocular_motility text,
    convergence text,
    npc character varying(50),
    anterior_right_lids text,
    anterior_right_lacrimal text,
    anterior_right_conjunctiva text,
    anterior_right_sclera text,
    anterior_right_cornea text,
    anterior_right_ac text,
    anterior_right_ac_depth character varying(20),
    anterior_right_iris text,
    anterior_right_pupil text,
    anterior_right_lens text,
    anterior_right_lens_status character varying(50),
    anterior_left_lids text,
    anterior_left_lacrimal text,
    anterior_left_conjunctiva text,
    anterior_left_sclera text,
    anterior_left_cornea text,
    anterior_left_ac text,
    anterior_left_ac_depth character varying(20),
    anterior_left_iris text,
    anterior_left_pupil text,
    anterior_left_lens text,
    anterior_left_lens_status character varying(50),
    gonioscopy_right text,
    gonioscopy_left text,
    angle_right character varying(20),
    angle_left character varying(20),
    dilation_performed boolean DEFAULT false,
    dilation_agent character varying(100),
    posterior_right_media text,
    posterior_right_disc text,
    posterior_right_disc_color character varying(50),
    posterior_right_cdr numeric(3,2),
    posterior_right_rim text,
    posterior_right_macula text,
    posterior_right_foveal_reflex character varying(20),
    posterior_right_vessels text,
    posterior_right_av_ratio character varying(20),
    posterior_right_periphery text,
    posterior_left_media text,
    posterior_left_disc text,
    posterior_left_disc_color character varying(50),
    posterior_left_cdr numeric(3,2),
    posterior_left_rim text,
    posterior_left_macula text,
    posterior_left_foveal_reflex character varying(20),
    posterior_left_vessels text,
    posterior_left_av_ratio character varying(20),
    posterior_left_periphery text,
    color_vision character varying(100),
    color_vision_method character varying(50),
    contrast_sensitivity text,
    amsler_grid text,
    schirmer_test_right integer,
    schirmer_test_left integer,
    visual_field_notes text,
    provisional_diagnosis text,
    final_diagnosis text,
    icd_codes text[],
    treatment_plan text,
    glasses_prescribed boolean DEFAULT false,
    contact_lens_prescribed boolean DEFAULT false,
    medications_prescribed boolean DEFAULT false,
    surgery_recommended boolean DEFAULT false,
    surgery_type character varying(100),
    referral_needed boolean DEFAULT false,
    referral_to character varying(100),
    referral_reason text,
    follow_up_interval character varying(50),
    follow_up_date date,
    follow_up_notes text,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    finalized_at timestamp with time zone,
    finalized_by uuid,
    patient_uuid uuid,
    CONSTRAINT eye_exam_finalized_check CHECK (((finalized_at IS NULL) OR (finalized_by IS NOT NULL))),
    CONSTRAINT eye_exams_ar_left_axis_check CHECK (((ar_left_axis >= 0) AND (ar_left_axis <= 180))),
    CONSTRAINT eye_exams_ar_right_axis_check CHECK (((ar_right_axis >= 0) AND (ar_right_axis <= 180))),
    CONSTRAINT eye_exams_iop_left_check CHECK (((iop_left >= (0)::numeric) AND (iop_left <= (80)::numeric))),
    CONSTRAINT eye_exams_iop_right_check CHECK (((iop_right >= (0)::numeric) AND (iop_right <= (80)::numeric))),
    CONSTRAINT eye_exams_posterior_left_cdr_check CHECK (((posterior_left_cdr >= (0)::numeric) AND (posterior_left_cdr <= (1)::numeric))),
    CONSTRAINT eye_exams_posterior_right_cdr_check CHECK (((posterior_right_cdr >= (0)::numeric) AND (posterior_right_cdr <= (1)::numeric))),
    CONSTRAINT eye_exams_rx_left_axis_check CHECK (((rx_left_axis >= 0) AND (rx_left_axis <= 180))),
    CONSTRAINT eye_exams_rx_right_axis_check CHECK (((rx_right_axis >= 0) AND (rx_right_axis <= 180)))
);


--
-- Name: eye_prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eye_prescriptions (
    prescription_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    exam_id uuid,
    facility_id uuid,
    prescription_type character varying(50) NOT NULL,
    right_sphere numeric(5,2),
    right_cylinder numeric(5,2),
    right_axis integer,
    right_add numeric(5,2),
    right_prism character varying(50),
    right_base_curve numeric(4,2),
    right_diameter numeric(4,2),
    left_sphere numeric(5,2),
    left_cylinder numeric(5,2),
    left_axis integer,
    left_add numeric(5,2),
    left_prism character varying(50),
    left_base_curve numeric(4,2),
    left_diameter numeric(4,2),
    pd integer,
    pd_right integer,
    pd_left integer,
    lens_type public.lens_type,
    lens_material character varying(100),
    lens_coating text[],
    tint character varying(50),
    frame_recommendation text,
    contact_lens_brand character varying(100),
    contact_lens_type character varying(50),
    wearing_schedule text,
    care_instructions text,
    medication_name character varying(255),
    generic_name character varying(255),
    concentration character varying(50),
    dosage character varying(100),
    frequency character varying(100),
    duration character varying(100),
    affected_eye public.affected_eye,
    special_instructions text,
    quantity integer,
    refills_allowed integer DEFAULT 0,
    prescribed_by uuid,
    prescribed_at timestamp with time zone DEFAULT now(),
    valid_until date,
    status character varying(50) DEFAULT 'Active'::character varying,
    dispensed_at timestamp with time zone,
    dispensed_by uuid,
    patient_uuid uuid,
    CONSTRAINT eye_prescriptions_left_axis_check CHECK (((left_axis >= 0) AND (left_axis <= 180))),
    CONSTRAINT eye_prescriptions_right_axis_check CHECK (((right_axis >= 0) AND (right_axis <= 180)))
);


--
-- Name: eye_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eye_procedures (
    procedure_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    exam_id uuid,
    facility_id uuid,
    procedure_type character varying(100) NOT NULL,
    procedure_category character varying(50),
    affected_eye public.affected_eye,
    procedure_notes text,
    findings text,
    interpretation text,
    machine_used character varying(100),
    parameters text,
    images_attached boolean DEFAULT false,
    anesthesia_used character varying(100),
    materials_used text,
    complications text,
    fee numeric(10,2),
    status public.request_status DEFAULT 'Pending'::public.request_status,
    performed_by uuid,
    performed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    facility_type character varying(50) DEFAULT 'hospital'::character varying NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'Ghana'::character varying,
    postal_code character varying(20),
    phone character varying(50),
    email character varying(255),
    website character varying(255),
    license_number character varying(100),
    nhis_provider_id character varying(100),
    tax_id character varying(100),
    bed_capacity integer DEFAULT 0,
    operating_hours character varying(200),
    emergency_available boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT facilities_facility_type_check CHECK (((facility_type)::text = ANY (ARRAY[('hospital'::character varying)::text, ('clinic'::character varying)::text, ('laboratory'::character varying)::text, ('pharmacy'::character varying)::text, ('diagnostic_center'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: icd10_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icd10_codes (
    code text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: idempotency_hash_mismatches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_hash_mismatches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(64) NOT NULL,
    idempotency_key public.idempotency_key_t NOT NULL,
    original_hash character varying(64),
    attempted_hash character varying(64),
    original_record_id uuid,
    attempted_at timestamp with time zone DEFAULT now(),
    client_info jsonb
);


--
-- Name: imaging_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.imaging_catalogue (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    modality public.imaging_type NOT NULL,
    body_part character varying(100),
    price numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nhis_code character varying(50),
    nhis_price numeric(10,2),
    is_nhis_covered boolean DEFAULT true,
    nhis_percentage integer DEFAULT 0,
    description text,
    updated_by uuid,
    CONSTRAINT imaging_catalogue_nhis_percentage_check CHECK (((nhis_percentage >= 0) AND (nhis_percentage <= 100)))
);


--
-- Name: index_usage_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.index_usage_stats AS
 SELECT schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS times_used,
    idx_tup_read AS rows_read,
    pg_size_pretty(pg_relation_size((indexrelid)::regclass)) AS index_size,
        CASE
            WHEN (idx_scan = 0) THEN 'UNUSED - consider dropping'::text
            ELSE 'OK'::text
        END AS status
   FROM pg_stat_user_indexes
  ORDER BY idx_scan;


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_category_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    item_code character varying(50) NOT NULL,
    item_name character varying(100) NOT NULL,
    description text,
    category_id uuid,
    quantity_in_stock integer DEFAULT 0,
    reorder_level integer DEFAULT 10,
    unit_of_measure character varying(50),
    unit_cost numeric(10,2) DEFAULT 0,
    selling_price numeric(10,2) DEFAULT 0,
    supplier character varying(100),
    batch_number character varying(50),
    expiry_date date,
    is_active boolean DEFAULT true,
    is_consumable boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1 NOT NULL
);

ALTER TABLE ONLY public.inventory_items REPLICA IDENTITY FULL;


--
-- Name: inventory_stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_stock_movements (
    movement_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    item_id uuid,
    drug_id uuid,
    batch_id uuid,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    reference_number character varying(100),
    encounter_id uuid,
    patient_id character varying(50),
    dispense_id uuid,
    reason text,
    notes text,
    performed_by character varying(50),
    approved_by character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_stock_movements_movement_type_check CHECK (((movement_type)::text = ANY (ARRAY[('IN'::character varying)::text, ('OUT'::character varying)::text, ('ADJUSTMENT'::character varying)::text, ('TRANSFER'::character varying)::text, ('RETURN'::character varying)::text, ('EXPIRED'::character varying)::text, ('DAMAGED'::character varying)::text])))
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    item_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    category character varying(50) DEFAULT 'Other'::character varying NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0.00,
    discount_amount numeric(10,2) DEFAULT 0.00,
    total numeric(10,2) DEFAULT 0.00 NOT NULL,
    reference_id uuid,
    reference_type character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    invoice_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invoice_number character varying(50) NOT NULL,
    patient_id character varying(50) NOT NULL,
    consultation_id uuid,
    subtotal numeric(10,2) DEFAULT 0.00 NOT NULL,
    discount_total numeric(10,2) DEFAULT 0.00 NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0.00 NOT NULL,
    balance numeric(10,2) DEFAULT 0.00 NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying,
    due_date date,
    notes text,
    created_by character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid
);


--
-- Name: lab_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL,
    description text,
    result_template_type character varying(50) NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_critical_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_critical_notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lab_result_id uuid NOT NULL,
    patient_id character varying(50),
    parameter_name character varying(255),
    critical_value text,
    critical_type character varying(50),
    notified_to uuid,
    notification_method character varying(50),
    notification_status character varying(50) DEFAULT 'Pending'::character varying,
    notified_at timestamp with time zone DEFAULT now(),
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_request_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_id uuid,
    test_id uuid,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_result_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_result_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lab_result_id uuid NOT NULL,
    version integer NOT NULL,
    result text,
    result_value numeric(20,6),
    structured_result jsonb,
    result_status character varying(50),
    modified_by uuid,
    modification_type character varying(50) NOT NULL,
    modification_reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_result_template_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_result_template_types (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    ui_schema jsonb NOT NULL,
    default_fields jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_results (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_id uuid,
    test_id uuid,
    patient_id uuid,
    result_value text,
    unit character varying(50),
    reference_range character varying(100),
    is_abnormal boolean DEFAULT false,
    is_critical boolean DEFAULT false,
    technician_id uuid,
    verified_by uuid,
    verified_at timestamp with time zone,
    comments text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    structured_result jsonb,
    result_template_type character varying(50),
    collected_at timestamp with time zone,
    reported_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    workflow_status character varying(50) DEFAULT 'Pending'::character varying,
    critical_notified_at timestamp with time zone,
    interpretation text,
    methodology text,
    sample_type character varying(100),
    sample_collected_at timestamp with time zone,
    sample_collected_by uuid
);


--
-- Name: lab_test_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_catalogue (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50),
    specimen_type character varying(50),
    price numeric(10,2) DEFAULT 0,
    tat_minutes integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nhis_code character varying(50),
    nhis_price numeric(10,2),
    is_nhis_covered boolean DEFAULT true,
    nhis_percentage integer DEFAULT 0,
    description text,
    updated_by uuid,
    category_code character varying(50),
    result_template_type character varying(50),
    test_parameters jsonb,
    CONSTRAINT lab_test_catalogue_nhis_percentage_check CHECK (((nhis_percentage >= 0) AND (nhis_percentage <= 100)))
);


--
-- Name: lab_test_category_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lab_test_category_summary AS
 SELECT COALESCE(category_code, (
        CASE
            WHEN ((category)::text = 'Hematology'::text) THEN 'HEMATOLOGY'::text
            WHEN ((category)::text = ANY ((ARRAY['Clinical Chemistry'::character varying, 'Chemical Pathology'::character varying])::text[])) THEN 'CLINICAL_CHEMISTRY'::text
            WHEN ((category)::text = 'Microbiology'::text) THEN 'MICROBIOLOGY'::text
            WHEN ((category)::text = 'Parasitology'::text) THEN 'PARASITOLOGY'::text
            WHEN ((category)::text = 'Serology'::text) THEN 'SEROLOGY'::text
            WHEN ((category)::text = 'Urinalysis'::text) THEN 'URINALYSIS'::text
            WHEN ((category)::text = ANY ((ARRAY['Histopathology'::character varying, 'Histopathology & Cytology'::character varying])::text[])) THEN 'HISTOPATHOLOGY'::text
            WHEN ((category)::text = ANY ((ARRAY['Endocrinology'::character varying, 'Hormones'::character varying])::text[])) THEN 'ENDOCRINOLOGY'::text
            WHEN ((category)::text = ANY ((ARRAY['Molecular Diagnostics'::character varying, 'Molecular'::character varying])::text[])) THEN 'MOLECULAR'::text
            WHEN ((category)::text = 'Coagulation'::text) THEN 'COAGULATION'::text
            WHEN ((category)::text = 'Blood Bank'::text) THEN 'BLOOD_BANK'::text
            ELSE 'OTHER'::text
        END)::character varying) AS category_code,
    category AS category_name,
    result_template_type,
    count(*) AS test_count,
    count(*) FILTER (WHERE is_active) AS active_count
   FROM public.lab_test_catalogue
  GROUP BY category_code, category, result_template_type
  ORDER BY COALESCE(category_code, (
        CASE
            WHEN ((category)::text = 'Hematology'::text) THEN 'HEMATOLOGY'::text
            WHEN ((category)::text = ANY ((ARRAY['Clinical Chemistry'::character varying, 'Chemical Pathology'::character varying])::text[])) THEN 'CLINICAL_CHEMISTRY'::text
            WHEN ((category)::text = 'Microbiology'::text) THEN 'MICROBIOLOGY'::text
            WHEN ((category)::text = 'Parasitology'::text) THEN 'PARASITOLOGY'::text
            WHEN ((category)::text = 'Serology'::text) THEN 'SEROLOGY'::text
            WHEN ((category)::text = 'Urinalysis'::text) THEN 'URINALYSIS'::text
            WHEN ((category)::text = ANY ((ARRAY['Histopathology'::character varying, 'Histopathology & Cytology'::character varying])::text[])) THEN 'HISTOPATHOLOGY'::text
            WHEN ((category)::text = ANY ((ARRAY['Endocrinology'::character varying, 'Hormones'::character varying])::text[])) THEN 'ENDOCRINOLOGY'::text
            WHEN ((category)::text = ANY ((ARRAY['Molecular Diagnostics'::character varying, 'Molecular'::character varying])::text[])) THEN 'MOLECULAR'::text
            WHEN ((category)::text = 'Coagulation'::text) THEN 'COAGULATION'::text
            WHEN ((category)::text = 'Blood Bank'::text) THEN 'BLOOD_BANK'::text
            ELSE 'OTHER'::text
        END)::character varying);


--
-- Name: medical_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medical_reports (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id uuid,
    visit_id uuid,
    report_type public.report_type NOT NULL,
    report_title character varying(255) NOT NULL,
    report_content text,
    valid_from date,
    valid_to date,
    status public.report_status DEFAULT 'Draft'::public.report_status,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    issued_at timestamp with time zone,
    document_url text,
    document_number character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: medication_administration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_administration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    prescription_id uuid,
    medication_name character varying(255) NOT NULL,
    dose character varying(100),
    route character varying(50),
    scheduled_time timestamp with time zone,
    administered_at timestamp with time zone,
    administered_by uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    refusal_reason text,
    hold_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT medication_administration_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('given'::character varying)::text, ('refused'::character varying)::text, ('held'::character varying)::text, ('missed'::character varying)::text])))
);


--
-- Name: missing_indexes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.missing_indexes AS
 SELECT schemaname,
    relname AS tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    (seq_tup_read / NULLIF(seq_scan, 0)) AS avg_rows_per_scan,
    pg_size_pretty(pg_relation_size((relid)::regclass)) AS table_size
   FROM pg_stat_user_tables
  WHERE ((seq_scan > 100) AND ((seq_tup_read / NULLIF(seq_scan, 0)) > 1000))
  ORDER BY seq_tup_read DESC;


--
-- Name: nhis_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_request_id uuid NOT NULL,
    service_type character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    service_name character varying(255),
    service_code character varying(50),
    estimated_cost numeric(12,2),
    status public.nhis_approval_status DEFAULT 'pending'::public.nhis_approval_status,
    requested_by uuid,
    requested_at timestamp with time zone DEFAULT now(),
    request_reason text,
    clinical_justification text,
    decided_by uuid,
    decided_at timestamp with time zone,
    decision_notes text,
    rejection_reason text,
    approval_expiry timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nhis_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_type character varying(100) NOT NULL,
    action_description text,
    entity_type character varying(50),
    entity_id uuid,
    patient_id uuid,
    encounter_id uuid,
    old_state jsonb,
    new_state jsonb,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent text,
    session_id character varying(100),
    is_emergency_action boolean DEFAULT false,
    emergency_reason text
);


--
-- Name: nhis_authorizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_authorizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    nhis_profile_id uuid,
    auth_code character varying(100) NOT NULL,
    auth_type character varying(50) DEFAULT 'standard'::character varying,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    expiry_date timestamp with time zone NOT NULL,
    status public.nhis_auth_status DEFAULT 'pending'::public.nhis_auth_status,
    source character varying(50) DEFAULT 'internal_enrollee'::character varying,
    referral_source character varying(255),
    referral_clinical_basis text,
    referring_clinician character varying(255),
    referral_date date,
    referral_code character varying(100),
    verified_by uuid,
    verified_at timestamp with time zone,
    verification_notes text,
    renewal_required_at timestamp with time zone,
    renewed_from_id uuid,
    attachment_path text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    revoked_by uuid,
    revoked_at timestamp with time zone,
    revocation_reason text
);


--
-- Name: nhis_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    claim_number character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    nhis_profile_id uuid,
    auth_id uuid,
    tariff_group public.nhis_tariff_group NOT NULL,
    provider_name character varying(255),
    service_lines jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_tariff numeric(12,2) DEFAULT 0 NOT NULL,
    claimable_amount numeric(12,2) DEFAULT 0 NOT NULL,
    patient_pay_amount numeric(12,2) DEFAULT 0 NOT NULL,
    includes_emergency_services boolean DEFAULT false,
    requires_post_authorization boolean DEFAULT false,
    post_authorization_verified boolean DEFAULT false,
    status public.nhis_claim_status DEFAULT 'draft'::public.nhis_claim_status,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    submitted_at timestamp with time zone,
    submitted_by uuid,
    export_batch_id uuid,
    paid_at timestamp with time zone,
    paid_amount numeric(12,2),
    payment_reference character varying(100),
    rejected_at timestamp with time zone,
    rejected_by uuid,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: nhis_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_config (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    payment_category character varying(100) NOT NULL,
    coverage_percentage integer DEFAULT 0 NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    consultation_fully_covered boolean DEFAULT false,
    CONSTRAINT nhis_config_coverage_percentage_check CHECK (((coverage_percentage >= 0) AND (coverage_percentage <= 100)))
);


--
-- Name: nhis_export_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_export_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number character varying(50) NOT NULL,
    export_type character varying(50) DEFAULT 'monthly'::character varying,
    period_start date NOT NULL,
    period_end date NOT NULL,
    provider_name character varying(255),
    total_claims integer DEFAULT 0,
    total_amount numeric(14,2) DEFAULT 0,
    claim_ids uuid[] DEFAULT '{}'::uuid[],
    export_file_path text,
    export_format character varying(20) DEFAULT 'xlsx'::character varying,
    status character varying(50) DEFAULT 'draft'::character varying,
    submitted_at timestamp with time zone,
    submitted_by uuid,
    submission_reference character varying(100),
    dhq_format_version character varying(20),
    facility_nhis_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: nhis_hmos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_hmos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nhis_medicines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_medicines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    dosage_form text,
    strengths text,
    presentation text,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nhis_policy_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_policy_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_name character varying(255) NOT NULL,
    validity_days integer DEFAULT 30 NOT NULL,
    one_hour_rule_enabled boolean DEFAULT true,
    one_hour_grace_period_minutes integer DEFAULT 60,
    emergency_override_allowed boolean DEFAULT true,
    emergency_followup_deadline_hours integer DEFAULT 72,
    approval_rules jsonb DEFAULT '{"mri": {"max_wait_hours": 24, "requires_approval": true}, "ct_scan": {"max_wait_hours": 24, "requires_approval": true}, "high_cost_drugs": {"threshold_amount": 50000, "requires_approval": true}, "elective_surgery": {"max_wait_hours": 72, "requires_approval": true}, "specialized_labs": {"max_wait_hours": 24, "requires_approval": true}}'::jsonb,
    military_drug_coverage_percent integer DEFAULT 100,
    civilian_drug_coverage_percent integer DEFAULT 0,
    default_copay_percent integer DEFAULT 10,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);


--
-- Name: nhis_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid NOT NULL,
    auth_id uuid,
    patient_id uuid NOT NULL,
    clinic_id uuid,
    specialty_name character varying(100),
    doctor_id uuid,
    appointment_date date,
    appointment_time time without time zone,
    status public.nhis_posting_status DEFAULT 'pending'::public.nhis_posting_status,
    posted_by uuid NOT NULL,
    posted_at timestamp with time zone DEFAULT now(),
    seen_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nhis_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_procedures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type text
);


--
-- Name: nhis_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    scheme_type public.nhis_scheme_type NOT NULL,
    provider_name character varying(255),
    plan_category character varying(100),
    enrollee_id character varying(100),
    status public.nhis_profile_status DEFAULT 'active'::public.nhis_profile_status,
    patient_origin public.nhis_patient_origin DEFAULT 'internal'::public.nhis_patient_origin,
    referring_facility_name character varying(255),
    referring_facility_nhis_id character varying(100),
    referral_document_path text,
    referral_code character varying(100),
    referral_date date,
    referral_expiry_date date,
    referral_reason text,
    policy_config_id uuid,
    tariff_group public.nhis_tariff_group DEFAULT 'Civilian_HMO'::public.nhis_tariff_group,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    verification_notes text
);


--
-- Name: nhis_referral_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_referral_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    request_type character varying(50) DEFAULT 'external_referral'::character varying,
    referral_code character varying(100),
    referral_date date,
    referral_source character varying(255),
    referral_facility_nhis_id character varying(100),
    clinical_basis text,
    referring_clinician character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(20) DEFAULT 'normal'::character varying,
    requested_by uuid,
    requested_at timestamp with time zone DEFAULT now(),
    request_notes text,
    processed_by uuid,
    processed_at timestamp with time zone,
    processing_notes text,
    rejection_reason text,
    authorization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nhis_tariff_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nhis_tariff_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tariff_group public.nhis_tariff_group NOT NULL,
    service_type character varying(50) NOT NULL,
    service_id uuid,
    service_code character varying(50),
    service_name character varying(255),
    covered_type character varying(50) DEFAULT 'fully_covered'::character varying,
    patient_copay_percent integer DEFAULT 0,
    claim_amount numeric(12,2),
    claim_rate numeric(5,4),
    approval_required boolean DEFAULT false,
    approval_threshold_amount numeric(12,2),
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT nhis_tariff_rules_patient_copay_percent_check CHECK (((patient_copay_percent >= 0) AND (patient_copay_percent <= 100)))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type public.notification_type NOT NULL,
    enabled boolean DEFAULT true,
    show_popup boolean DEFAULT true,
    play_sound boolean DEFAULT false,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    department_id uuid,
    type public.notification_type NOT NULL,
    priority public.notification_priority DEFAULT 'Normal'::public.notification_priority,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    notification_subtype character varying(50),
    target_user_id uuid,
    target_role character varying(50),
    target_department character varying(100),
    encounter_id uuid,
    patient_id character varying(50),
    reference_type character varying(50),
    reference_id uuid,
    action_url character varying(500),
    action_label character varying(100),
    is_dismissed boolean DEFAULT false,
    dismissed_at timestamp with time zone,
    created_by uuid,
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: nursing_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid,
    patient_id uuid,
    user_id uuid,
    user_role character varying(50),
    action character varying(100) NOT NULL,
    table_name character varying(100),
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    was_successful boolean DEFAULT true,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nursing_interventions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_interventions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    ward_id uuid,
    bed_id uuid,
    category_code character varying(50) NOT NULL,
    intervention_code character varying(50) NOT NULL,
    custom_description text,
    notes text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    shift character varying(20),
    nurse_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nursing_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    treatment_plan_id uuid,
    treatment_task_id uuid,
    note_type character varying(30) DEFAULT 'Progress_Note'::character varying NOT NULL,
    title character varying(255),
    content text NOT NULL,
    patient_condition character varying(30),
    pain_level integer,
    interventions_performed text,
    patient_response text,
    follow_up_required boolean DEFAULT false,
    follow_up_notes text,
    recorded_by uuid NOT NULL,
    shift character varying(20),
    is_critical boolean DEFAULT false,
    requires_doctor_review boolean DEFAULT false,
    doctor_reviewed_by uuid,
    doctor_reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    shift_date date,
    is_handover_note boolean DEFAULT false,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    patient_uuid uuid,
    CONSTRAINT nursing_notes_pain_level_check CHECK (((pain_level >= 0) AND (pain_level <= 10)))
);


--
-- Name: on_call_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.on_call_schedule (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    department character varying(100) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: opd_classification_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.opd_classification_stats AS
 SELECT date(v.created_at) AS visit_date,
    v.opd_classification,
    d.opd_type AS department_type,
    count(*) AS visit_count,
    count(DISTINCT v.patient_id) AS unique_patients
   FROM ((public.visits v
     LEFT JOIN public.clinics c ON ((v.clinic_id = c.id)))
     LEFT JOIN public.departments d ON ((c.department_id = d.id)))
  WHERE (v.opd_classification IS NOT NULL)
  GROUP BY (date(v.created_at)), v.opd_classification, d.opd_type
  ORDER BY (date(v.created_at)) DESC;


--
-- Name: patient_admission_status_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_admission_status_view AS
 SELECT p.id AS patient_id,
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
     LEFT JOIN public.admissions curr_adm ON (((curr_adm.patient_id = p.id) AND ((curr_adm.admission_status)::text <> ALL (ARRAY[('discharged'::character varying)::text, ('deceased'::character varying)::text])))))
     LEFT JOIN public.wards curr_ward ON ((curr_ward.id = curr_adm.current_ward_id)))
     LEFT JOIN public.beds curr_bed ON ((curr_bed.id = curr_adm.current_bed_id)))
     LEFT JOIN public.staff attending ON ((attending.id = curr_adm.attending_physician_id)));


--
-- Name: patient_chief_complaints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_chief_complaints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying(50) NOT NULL,
    emr_number character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    consultation_id uuid,
    complaint_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    duration_value integer NOT NULL,
    duration_unit public.duration_unit DEFAULT 'Days'::public.duration_unit NOT NULL,
    notes text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patient_chief_complaints_duration_value_check CHECK ((duration_value > 0))
);


--
-- Name: patient_vital_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_vital_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    acuity_level public.patient_acuity DEFAULT 'medium'::public.patient_acuity NOT NULL,
    custom_frequency_minutes integer,
    last_vitals_at timestamp with time zone,
    next_vitals_due timestamp with time zone,
    is_overdue boolean DEFAULT false,
    overdue_since timestamp with time zone,
    alert_sent boolean DEFAULT false,
    alert_sent_at timestamp with time zone,
    assigned_nurse_id uuid,
    is_active boolean DEFAULT true,
    paused boolean DEFAULT false,
    pause_reason text,
    paused_at timestamp with time zone,
    paused_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    receipt_number character varying(50) NOT NULL,
    billing_order_id uuid,
    amount numeric(10,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    transaction_reference character varying(100),
    payment_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    invoice_id uuid,
    patient_id character varying(50),
    received_by character varying(50),
    notes text
);


--
-- Name: pending_clinical_requests; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pending_clinical_requests AS
 SELECT cr.id,
    cr.request_number,
    cr.request_type,
    cr.clinical_reason,
    cr.urgency,
    cr.status,
    cr.suggested_timeframe,
    cr.admission_type,
    cr.level_of_care,
    cr.procedure_name,
    cr.scheduled_date,
    cr.scheduled_time,
    cr.created_at,
    cr.notes,
    cr.patient_id,
    (((p.first_name)::text || ' '::text) || (p.surname)::text) AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    p.contact_phone AS patient_phone,
    cr.requesting_doctor_id,
    (((doc.first_name)::text || ' '::text) || (doc.last_name)::text) AS requesting_doctor_name,
    cr.requesting_department_id,
    dept.name AS requesting_department_name,
    cr.target_department_id,
    target_dept.name AS target_department_name,
    cr.target_ward_id,
    target_ward.name AS target_ward_name,
    cr.encounter_id,
    v.visit_id AS encounter_number
   FROM ((((((public.clinical_requests cr
     JOIN public.patients p ON ((cr.patient_id = p.id)))
     JOIN public.visits v ON ((cr.encounter_id = v.id)))
     LEFT JOIN public.staff doc ON ((cr.requesting_doctor_id = doc.id)))
     LEFT JOIN public.departments dept ON ((cr.requesting_department_id = dept.id)))
     LEFT JOIN public.departments target_dept ON ((cr.target_department_id = target_dept.id)))
     LEFT JOIN public.wards target_ward ON ((cr.target_ward_id = target_ward.id)))
  WHERE (cr.status = ANY (ARRAY['Pending'::public.clinical_request_status, 'Under_Review'::public.clinical_request_status]))
  ORDER BY
        CASE cr.urgency
            WHEN 'Emergency'::public.clinical_urgency THEN 1
            WHEN 'Urgent'::public.clinical_urgency THEN 2
            ELSE 3
        END, cr.created_at;


--
-- Name: pending_internal_referrals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pending_internal_referrals AS
 SELECT cr.id AS referral_id,
    cr.request_number AS referral_number,
    cr.created_at AS referral_date,
    cr.urgency,
    cr.specialty_module,
    cr.referral_workflow_status,
    cr.appointment_date,
    cr.appointment_time,
    cr.clinical_reason AS referral_reason,
    cr.notes AS referral_notes,
    p.id AS patient_id,
    p.emr_number,
    p.first_name AS patient_first_name,
    p.middle_name AS patient_middle_name,
    p.surname AS patient_surname,
    p.date_of_birth,
    p.gender,
    p.contact_phone AS patient_phone,
    p.patient_category,
    p.insurance_type,
    p.rank AS patient_rank,
    rd.id AS referring_doctor_id,
    rd.first_name AS referring_doctor_first_name,
    rd.last_name AS referring_doctor_last_name,
    rd.department AS referring_doctor_department,
    src_dept.name AS source_department_name,
    src_clinic.clinic_name AS source_clinic_name,
    tgt_dept.id AS target_department_id,
    tgt_dept.name AS target_department_name,
    tgt_dept.code AS target_department_code,
    v.encounter_number AS original_encounter_number,
    v.encounter_date AS original_encounter_date,
    v.chief_complaint AS original_chief_complaint,
    c.notes AS original_clinical_notes,
    c.diagnosis AS original_diagnosis,
    cr.referral_encounter_id,
    cr.appointment_booked_by,
    cr.appointment_booked_at,
    booked_by_staff.first_name AS booked_by_first_name,
    booked_by_staff.last_name AS booked_by_last_name
   FROM ((((((((public.clinical_requests cr
     JOIN public.patients p ON ((cr.patient_id = p.id)))
     LEFT JOIN public.visits v ON ((cr.encounter_id = v.id)))
     LEFT JOIN public.consultations c ON ((c.encounter_id = v.id)))
     LEFT JOIN public.staff rd ON ((cr.requesting_doctor_id = rd.id)))
     LEFT JOIN public.departments src_dept ON ((cr.requesting_department_id = src_dept.id)))
     LEFT JOIN public.clinics src_clinic ON ((cr.source_clinic_id = src_clinic.id)))
     LEFT JOIN public.departments tgt_dept ON ((cr.target_department_id = tgt_dept.id)))
     LEFT JOIN public.staff booked_by_staff ON ((cr.appointment_booked_by = booked_by_staff.id)))
  WHERE ((cr.request_type = 'Referral'::public.clinical_request_type) AND (cr.status <> ALL (ARRAY['Cancelled'::public.clinical_request_status, 'Rejected'::public.clinical_request_status])) AND ((cr.referral_workflow_status)::text = ANY ((ARRAY['Pending_Encounter_Office'::character varying, 'Appointment_Booked'::character varying])::text[])))
  ORDER BY
        CASE cr.urgency
            WHEN 'Emergency'::public.clinical_urgency THEN 1
            WHEN 'Urgent'::public.clinical_urgency THEN 2
            WHEN 'Routine'::public.clinical_urgency THEN 3
            ELSE 4
        END, cr.created_at;


--
-- Name: physio_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physio_assessments (
    assessment_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    consultation_id uuid,
    facility_id uuid,
    referral_source character varying(100),
    referral_doctor_id uuid,
    referral_diagnosis text,
    referral_date date,
    referral_reason text,
    chief_complaint text,
    complaint_duration character varying(100),
    onset_type public.onset_type,
    onset_date date,
    mechanism_of_injury text,
    pain_location text,
    pain_location_diagram text,
    pain_score integer,
    pain_at_rest integer,
    pain_on_activity integer,
    pain_worst integer,
    pain_best integer,
    pain_character character varying(100),
    pain_radiation text,
    aggravating_factors text,
    relieving_factors text,
    pain_pattern character varying(50),
    night_pain boolean DEFAULT false,
    medical_history text,
    surgical_history text,
    medications text,
    allergies text,
    occupation character varying(100),
    hobbies text,
    hand_dominance character varying(20),
    functional_status text,
    adl_status text,
    mobility_status public.mobility_status,
    gait_pattern character varying(100),
    gait_aids_used text[],
    balance_assessment text,
    fall_history text,
    posture_standing text,
    posture_sitting text,
    posture_deviations text,
    rom_joint character varying(100),
    rom_notes text,
    rom_flexion_active integer,
    rom_extension_active integer,
    rom_abduction_active integer,
    rom_adduction_active integer,
    rom_internal_rotation_active integer,
    rom_external_rotation_active integer,
    rom_flexion_passive integer,
    rom_extension_passive integer,
    rom_abduction_passive integer,
    rom_adduction_passive integer,
    rom_internal_rotation_passive integer,
    rom_external_rotation_passive integer,
    rom_end_feel text,
    rom_pain_arc text,
    muscle_groups_tested text[],
    muscle_strength_grades jsonb,
    muscle_strength_notes text,
    sensation_intact boolean DEFAULT true,
    sensation_notes text,
    dermatome_affected character varying(50),
    myotome_affected character varying(50),
    reflexes_tested text[],
    reflexes_normal boolean DEFAULT true,
    reflex_notes text,
    neural_tension_tests text,
    special_tests_performed text[],
    special_tests_findings jsonb,
    palpation_findings text,
    trigger_points text,
    tenderness_location text,
    swelling_present boolean DEFAULT false,
    swelling_notes text,
    previous_physio_treatment boolean DEFAULT false,
    previous_treatment_details text,
    previous_treatment_response text,
    physio_diagnosis text,
    icd_codes text[],
    problem_list text[],
    short_term_goals text,
    long_term_goals text,
    patient_goals text,
    expected_outcomes text,
    estimated_sessions integer,
    estimated_duration_weeks integer,
    red_flags text[],
    red_flags_present boolean DEFAULT false,
    yellow_flags text[],
    precautions text,
    contraindications text,
    prognosis character varying(50),
    prognosis_notes text,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    finalized_at timestamp with time zone,
    finalized_by uuid,
    CONSTRAINT physio_assessment_finalized_check CHECK (((finalized_at IS NULL) OR (finalized_by IS NOT NULL))),
    CONSTRAINT physio_assessments_pain_at_rest_check CHECK (((pain_at_rest >= 0) AND (pain_at_rest <= 10))),
    CONSTRAINT physio_assessments_pain_best_check CHECK (((pain_best >= 0) AND (pain_best <= 10))),
    CONSTRAINT physio_assessments_pain_on_activity_check CHECK (((pain_on_activity >= 0) AND (pain_on_activity <= 10))),
    CONSTRAINT physio_assessments_pain_score_check CHECK (((pain_score >= 0) AND (pain_score <= 10))),
    CONSTRAINT physio_assessments_pain_worst_check CHECK (((pain_worst >= 0) AND (pain_worst <= 10)))
);


--
-- Name: physio_discharge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physio_discharge (
    discharge_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    assessment_id uuid NOT NULL,
    plan_id uuid,
    patient_id character varying(50) NOT NULL,
    facility_id uuid,
    discharge_date date NOT NULL,
    discharge_reason character varying(100),
    initial_diagnosis text,
    initial_presentation text,
    total_sessions_attended integer,
    total_sessions_missed integer,
    duration_of_care character varying(50),
    initial_pain integer,
    final_pain integer,
    pain_improvement_percent integer,
    initial_rom jsonb,
    final_rom jsonb,
    initial_strength jsonb,
    final_strength jsonb,
    initial_functional_status text,
    final_functional_status text,
    goals_summary jsonb,
    discharge_instructions text,
    home_exercise_program text,
    activity_guidelines text,
    precautions text,
    follow_up_recommended boolean DEFAULT false,
    follow_up_interval character varying(50),
    return_criteria text,
    referred_to text,
    referral_reason text,
    patient_satisfaction integer,
    patient_feedback text,
    discharged_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT physio_discharge_patient_satisfaction_check CHECK (((patient_satisfaction >= 1) AND (patient_satisfaction <= 5)))
);


--
-- Name: physio_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physio_plans (
    plan_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    assessment_id uuid NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    facility_id uuid,
    treatment_approach text,
    manual_therapy boolean DEFAULT false,
    manual_therapy_techniques text[],
    manual_therapy_parameters text,
    therapeutic_exercise boolean DEFAULT false,
    exercises_prescribed text,
    exercise_parameters text,
    home_exercises text,
    exercise_progression_criteria text,
    electrotherapy boolean DEFAULT false,
    electro_modalities text[],
    electro_parameters jsonb,
    heat_therapy boolean DEFAULT false,
    heat_type character varying(50),
    cold_therapy boolean DEFAULT false,
    cold_type character varying(50),
    hydrotherapy boolean DEFAULT false,
    hydro_type character varying(50),
    traction boolean DEFAULT false,
    traction_type character varying(50),
    traction_parameters text,
    other_modalities text[],
    other_modality_details text,
    assistive_devices text[],
    assistive_device_instructions text,
    frequency character varying(50),
    session_duration_minutes integer,
    total_sessions_planned integer,
    patient_education text,
    activity_modifications text,
    ergonomic_advice text,
    treatment_precautions text,
    monitoring_parameters text,
    re_eval_interval character varying(50),
    status public.physio_plan_status DEFAULT 'Active'::public.physio_plan_status,
    status_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_by uuid,
    approved_at timestamp with time zone
);


--
-- Name: physio_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physio_progress (
    progress_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    assessment_id uuid NOT NULL,
    plan_id uuid,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid,
    facility_id uuid,
    evaluation_date date NOT NULL,
    evaluation_type public.evaluation_type NOT NULL,
    session_number_at_eval integer,
    pain_score integer,
    pain_change integer,
    rom_data jsonb,
    rom_improvement_percent integer,
    strength_data jsonb,
    functional_score integer,
    outcome_measure_used character varying(100),
    outcome_score integer,
    goals_achieved text[],
    goals_in_progress text[],
    goals_not_achieved text[],
    progress_summary text,
    clinical_reasoning text,
    complications text,
    barriers_to_progress text,
    plan_modified boolean DEFAULT false,
    modifications_made text,
    new_goals text,
    continue_therapy boolean,
    sessions_remaining integer,
    modify_plan boolean,
    ready_for_discharge boolean DEFAULT false,
    discharge_recommendations text,
    home_program_final text,
    follow_up_needed boolean DEFAULT false,
    follow_up_interval character varying(50),
    physician_updated boolean DEFAULT false,
    update_summary text,
    evaluated_by uuid,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT physio_progress_pain_score_check CHECK (((pain_score >= 0) AND (pain_score <= 10)))
);


--
-- Name: physio_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.physio_sessions (
    session_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    plan_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    patient_id character varying(50) NOT NULL,
    encounter_id uuid NOT NULL,
    facility_id uuid,
    session_number integer NOT NULL,
    session_date timestamp with time zone DEFAULT now(),
    pain_score_before integer,
    subjective_report text,
    interval_history text,
    objective_findings text,
    rom_changes text,
    strength_changes text,
    functional_changes text,
    treatment_provided text NOT NULL,
    modalities_used text[],
    modality_parameters jsonb,
    exercises_performed text,
    exercise_sets_reps text,
    manual_techniques_used text,
    patient_response text,
    pain_score_after integer,
    tolerance character varying(50),
    adverse_reactions text,
    progress_notes text,
    goals_addressed text[],
    next_session_plan text,
    home_program_modified boolean DEFAULT false,
    home_program_changes text,
    attendance_status public.attendance_status DEFAULT 'Attended'::public.attendance_status,
    missed_reason text,
    make_up_scheduled boolean DEFAULT false,
    duration_minutes integer,
    treated_by uuid,
    supervised_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    compliance_level character varying(50),
    plan_modifications text,
    next_session_focus text,
    outcome_measure_used character varying(100),
    outcome_measure_score numeric(10,2),
    treated_at timestamp with time zone,
    CONSTRAINT physio_sessions_pain_score_after_check CHECK (((pain_score_after >= 0) AND (pain_score_after <= 10))),
    CONSTRAINT physio_sessions_pain_score_before_check CHECK (((pain_score_before >= 0) AND (pain_score_before <= 10)))
);


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    prescription_id uuid,
    drug_id uuid,
    dosage character varying(100),
    frequency character varying(50),
    duration character varying(50),
    quantity integer NOT NULL,
    status public.dispense_status DEFAULT 'Pending'::public.dispense_status,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: price_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_list (
    price_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    item_code character varying(50) NOT NULL,
    item_name character varying(255) NOT NULL,
    category character varying(50) NOT NULL,
    unit_price numeric(10,2) DEFAULT 0.00 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: procedure_catalogue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_catalogue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    category character varying(100) NOT NULL,
    subcategory character varying(100),
    cpt_code character varying(20),
    icd10_pcs_code character varying(20),
    body_system character varying(100),
    requires_anesthesia boolean DEFAULT false,
    anesthesia_type character varying(50),
    typical_duration_minutes integer,
    recovery_time_hours integer,
    requires_consent boolean DEFAULT true,
    requires_fasting boolean DEFAULT false,
    fasting_hours integer,
    requires_sedation boolean DEFAULT false,
    requires_admission boolean DEFAULT false,
    pre_procedure_instructions text,
    post_procedure_instructions text,
    required_equipment jsonb DEFAULT '[]'::jsonb,
    required_supplies jsonb DEFAULT '[]'::jsonb,
    required_staff jsonb DEFAULT '[]'::jsonb,
    typical_location character varying(100),
    base_price numeric(12,2),
    nhis_price numeric(12,2),
    professional_fee numeric(12,2),
    facility_fee numeric(12,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT procedure_catalogue_category_check CHECK (((category)::text = ANY (ARRAY[('surgical'::character varying)::text, ('diagnostic'::character varying)::text, ('therapeutic'::character varying)::text, ('minor'::character varying)::text, ('major'::character varying)::text, ('endoscopy'::character varying)::text, ('biopsy'::character varying)::text, ('injection'::character varying)::text, ('infusion'::character varying)::text, ('wound_care'::character varying)::text, ('cardiovascular'::character varying)::text, ('orthopedic'::character varying)::text, ('neurological'::character varying)::text, ('obstetric'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: procedure_consumables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_consumables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    procedure_id uuid NOT NULL,
    item_id uuid,
    item_name character varying(200) NOT NULL,
    item_code character varying(50),
    category character varying(100),
    quantity_used numeric(10,3) NOT NULL,
    unit character varying(50) NOT NULL,
    unit_cost numeric(10,2),
    total_cost numeric(12,2),
    billable boolean DEFAULT true,
    batch_number character varying(100),
    serial_number character varying(100),
    expiry_date date,
    notes text,
    recorded_by uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: procedure_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedure_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_id character varying(50),
    patient_id character varying(50),
    consultation_id uuid,
    encounter_id uuid,
    procedure_id uuid,
    ordered_by character varying(50),
    procedure_name text,
    procedure_type text,
    clinical_notes text,
    priority text DEFAULT 'Normal'::text,
    status text DEFAULT 'Pending'::text,
    notes text,
    performed_at timestamp with time zone,
    performed_by character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: procedure_requests_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.procedure_requests_view AS
 SELECT cr.id,
    cr.request_number,
    cr.patient_id,
    cr.encounter_id,
    cr.requesting_doctor_id,
    cr.requesting_department_id,
    cr.request_type,
    cr.clinical_reason,
    cr.urgency,
    cr.suggested_timeframe,
    cr.notes,
    cr.target_department_id,
    cr.target_ward_id,
    cr.target_doctor_id,
    cr.admission_type,
    cr.suggested_ward_type,
    cr.level_of_care,
    cr.expected_duration,
    cr.special_requirements,
    cr.procedure_catalogue_id,
    cr.procedure_name,
    cr.procedure_notes,
    cr.pre_op_requirements,
    cr.follow_up_reason,
    cr.follow_up_instructions,
    cr.status,
    cr.reviewed_by,
    cr.reviewed_at,
    cr.review_notes,
    cr.approved_by,
    cr.approved_at,
    cr.rejection_reason,
    cr.admission_id,
    cr.procedure_id,
    cr.referral_id,
    cr.follow_up_visit_id,
    cr.scheduled_date,
    cr.scheduled_time,
    cr.scheduled_by,
    cr.scheduling_notes,
    cr.created_at,
    cr.updated_at,
    cr.created_by,
    cr.facility_id,
    (((p.first_name)::text || ' '::text) || (p.surname)::text) AS patient_name,
    p.emr_number,
    p.gender,
    p.date_of_birth,
    (((doc.first_name)::text || ' '::text) || (doc.last_name)::text) AS requesting_doctor_name,
    dept.name AS requesting_department_name,
    pc.name AS catalogue_procedure_name,
    pc.code AS procedure_code,
    pc.category AS procedure_category
   FROM ((((public.clinical_requests cr
     JOIN public.patients p ON ((cr.patient_id = p.id)))
     LEFT JOIN public.staff doc ON ((cr.requesting_doctor_id = doc.id)))
     LEFT JOIN public.departments dept ON ((cr.requesting_department_id = dept.id)))
     LEFT JOIN public.procedure_catalogue pc ON ((cr.procedure_catalogue_id = pc.id)))
  WHERE (cr.request_type = ANY (ARRAY['Procedure'::public.clinical_request_type, 'Surgery'::public.clinical_request_type]))
  ORDER BY
        CASE cr.urgency
            WHEN 'Emergency'::public.clinical_urgency THEN 1
            WHEN 'Urgent'::public.clinical_urgency THEN 2
            ELSE 3
        END, cr.scheduled_date, cr.created_at;


--
-- Name: procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    encounter_id uuid NOT NULL,
    admission_id uuid,
    procedure_number character varying(50) NOT NULL,
    catalogue_id uuid,
    procedure_name character varying(200) NOT NULL,
    procedure_code character varying(50),
    scheduled_date timestamp with time zone,
    scheduled_duration_minutes integer,
    priority character varying(20) DEFAULT 'routine'::character varying NOT NULL,
    status character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    actual_start_time timestamp with time zone,
    actual_end_time timestamp with time zone,
    actual_duration_minutes integer,
    location character varying(100),
    room_number character varying(50),
    indication text NOT NULL,
    pre_procedure_diagnosis text,
    post_procedure_diagnosis text,
    laterality character varying(20),
    body_site text,
    anesthesia_type character varying(50),
    anesthesiologist_id uuid,
    anesthesia_start_time timestamp with time zone,
    anesthesia_end_time timestamp with time zone,
    anesthesia_notes text,
    primary_surgeon_id uuid,
    assistant_surgeons jsonb DEFAULT '[]'::jsonb,
    scrub_nurse_id uuid,
    circulating_nurse_id uuid,
    other_staff jsonb DEFAULT '[]'::jsonb,
    consent_obtained boolean DEFAULT false,
    consent_date timestamp with time zone,
    consent_obtained_by uuid,
    consent_document_id uuid,
    consent_notes text,
    pre_op_checklist jsonb DEFAULT '{}'::jsonb,
    fasting_confirmed boolean,
    allergies_verified boolean,
    site_marked boolean,
    blood_products_available boolean,
    procedure_notes text,
    findings text,
    technique_description text,
    complications text,
    estimated_blood_loss_ml integer,
    specimens_collected jsonb DEFAULT '[]'::jsonb,
    implants_used jsonb DEFAULT '[]'::jsonb,
    post_op_instructions text,
    recovery_location character varying(100),
    recovery_start_time timestamp with time zone,
    recovery_end_time timestamp with time zone,
    discharge_criteria_met boolean,
    post_op_diagnosis text,
    billable boolean DEFAULT true,
    billed boolean DEFAULT false,
    billing_id uuid,
    cancellation_reason text,
    cancelled_by uuid,
    cancelled_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    clinical_request_id uuid,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    CONSTRAINT procedures_anesthesia_type_check CHECK (((anesthesia_type)::text = ANY (ARRAY[('none'::character varying)::text, ('local'::character varying)::text, ('regional'::character varying)::text, ('sedation'::character varying)::text, ('general'::character varying)::text, ('spinal'::character varying)::text, ('epidural'::character varying)::text]))),
    CONSTRAINT procedures_laterality_check CHECK (((laterality)::text = ANY (ARRAY[('left'::character varying)::text, ('right'::character varying)::text, ('bilateral'::character varying)::text, ('na'::character varying)::text]))),
    CONSTRAINT procedures_priority_check CHECK (((priority)::text = ANY (ARRAY[('emergency'::character varying)::text, ('urgent'::character varying)::text, ('routine'::character varying)::text, ('elective'::character varying)::text]))),
    CONSTRAINT procedures_status_check CHECK (((status)::text = ANY (ARRAY[('scheduled'::character varying)::text, ('pre_op'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('postponed'::character varying)::text, ('complications'::character varying)::text])))
);


--
-- Name: queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    visit_id uuid,
    patient_id uuid,
    department_id uuid,
    clinic_id uuid,
    ticket_number character varying(50),
    status public.queue_status DEFAULT 'Waiting'::public.queue_status,
    priority public.priority DEFAULT 'Normal'::public.priority,
    location public.queue_location NOT NULL,
    assigned_to uuid,
    called_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    wait_start_time timestamp with time zone,
    ready_time timestamp with time zone,
    consultation_start_time timestamp with time zone,
    consultation_end_time timestamp with time zone,
    skipped_count integer DEFAULT 0,
    skip_reason text,
    encounter_id uuid,
    idempotency_key public.idempotency_key_t
);

ALTER TABLE ONLY public.queue REPLICA IDENTITY FULL;


--
-- Name: queue_daily_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.queue_daily_counters (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    department text NOT NULL,
    counter_date date NOT NULL,
    last_ticket_number integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: radiology_request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radiology_request_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_id uuid,
    imaging_id uuid,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    price numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: radiology_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.radiology_requests (
    request_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    clinical_history text,
    priority public.priority DEFAULT 'Normal'::public.priority,
    status public.request_status DEFAULT 'Pending'::public.request_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid NOT NULL,
    accepted_by uuid,
    accepted_at timestamp with time zone,
    rejection_reason text,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    payment_verified_at timestamp with time zone,
    scheduled_time timestamp with time zone,
    scheduled_by uuid,
    scan_completed_at timestamp with time zone,
    scan_completed_by uuid,
    report_uploaded_at timestamp with time zone,
    report_uploaded_by uuid,
    report_viewed_by uuid,
    report_viewed_at timestamp with time zone,
    contrast_used boolean DEFAULT false,
    contrast_type text,
    imaging_id uuid,
    imaging_type character varying(50),
    consultation_id uuid,
    body_part text,
    clinical_indication text,
    scheduled_date timestamp with time zone,
    performed_at timestamp with time zone,
    performed_by character varying(50),
    findings text,
    impression text,
    result_file_url text,
    report text,
    patient_id character varying(50),
    visit_id character varying(50),
    ordered_by character varying(50),
    diagnosis text[],
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64),
    last_modified_by uuid,
    payer_type character varying(20) DEFAULT 'private'::character varying,
    requires_nhis_verification boolean DEFAULT false,
    nhis_approval_status public.nhis_approval_status DEFAULT 'not_required'::public.nhis_approval_status,
    nhis_approval_id uuid,
    billing_release_status public.billing_release_status DEFAULT 'blocked'::public.billing_release_status,
    execution_status public.service_execution_status DEFAULT 'draft'::public.service_execution_status,
    released_by uuid,
    released_at timestamp with time zone
);

ALTER TABLE ONLY public.radiology_requests REPLICA IDENTITY FULL;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    receipt_id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    receipt_number character varying(50) NOT NULL,
    billing_order_id uuid,
    invoice_id uuid,
    patient_id character varying(50) NOT NULL,
    visit_id character varying(50),
    amount_paid numeric(12,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    reference_number character varying(100),
    issued_by character varying(50),
    issue_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid,
    idempotency_key public.idempotency_key_t,
    idempotency_created_at timestamp with time zone,
    idempotency_hash character varying(64)
);

ALTER TABLE ONLY public.receipts REPLICA IDENTITY FULL;


--
-- Name: referral_encounters_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.referral_encounters_view AS
 SELECT v.id AS encounter_id,
    v.encounter_number,
    v.encounter_date,
    v.visit_type,
    v.status AS encounter_status,
    v.is_referral_encounter,
    v.referral_reason,
    v.referral_clinical_notes,
    p.id AS patient_id,
    p.emr_number,
    p.first_name AS patient_first_name,
    p.middle_name AS patient_middle_name,
    p.surname AS patient_surname,
    p.date_of_birth,
    p.gender,
    rd.id AS referring_doctor_id,
    rd.first_name AS referring_doctor_first_name,
    rd.last_name AS referring_doctor_last_name,
    rd.department AS referring_doctor_department,
    src_clinic.clinic_name AS source_clinic_name,
    src_clinic.clinic_code AS source_clinic_code,
    dst_clinic.id AS destination_clinic_id,
    dst_clinic.clinic_name AS destination_clinic_name,
    cr.id AS original_referral_id,
    cr.request_number AS original_referral_number,
    cr.created_at AS original_referral_date,
    cr.urgency AS referral_urgency,
    cr.specialty_module,
    cr.clinical_reason AS referral_clinical_reason,
    cr.notes AS referral_notes,
    orig_enc.encounter_number AS original_encounter_number,
    orig_enc.chief_complaint AS original_chief_complaint,
    orig_consult.notes AS original_consultation_notes,
    orig_consult.diagnosis AS original_diagnosis
   FROM (((((((public.visits v
     JOIN public.patients p ON ((v.patient_id = p.id)))
     LEFT JOIN public.staff rd ON ((v.referring_doctor_id = rd.id)))
     LEFT JOIN public.clinics src_clinic ON ((v.referring_clinic_id = src_clinic.id)))
     LEFT JOIN public.clinics dst_clinic ON ((v.clinic_id = dst_clinic.id)))
     LEFT JOIN public.clinical_requests cr ON ((v.source_referral_id = cr.id)))
     LEFT JOIN public.visits orig_enc ON ((cr.encounter_id = orig_enc.id)))
     LEFT JOIN public.consultations orig_consult ON ((orig_consult.encounter_id = orig_enc.id)))
  WHERE (v.is_referral_encounter = true)
  ORDER BY v.encounter_date DESC, v.created_at DESC;


--
-- Name: referral_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_outcomes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    referral_id uuid,
    external_referral_id uuid,
    outcome_type character varying(50) NOT NULL,
    outcome_description text NOT NULL,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT chk_referral_id CHECK (((referral_id IS NOT NULL) OR (external_referral_id IS NOT NULL))),
    CONSTRAINT referral_outcomes_outcome_type_check CHECK (((outcome_type)::text = ANY (ARRAY[('diagnosis_confirmed'::character varying)::text, ('diagnosis_changed'::character varying)::text, ('treatment_initiated'::character varying)::text, ('procedure_performed'::character varying)::text, ('medication_changed'::character varying)::text, ('admission_required'::character varying)::text, ('follow_up_scheduled'::character varying)::text, ('referred_further'::character varying)::text, ('discharged'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    referral_number character varying(50) NOT NULL,
    patient_id uuid,
    visit_id uuid,
    source_department_id uuid,
    target_department_id uuid,
    referring_physician_id uuid,
    receiving_physician_id uuid,
    referral_type public.referral_type NOT NULL,
    priority public.referral_priority DEFAULT 'Routine'::public.referral_priority,
    status public.referral_module_status DEFAULT 'Pending'::public.referral_module_status,
    reason_for_referral text,
    clinical_summary text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_referral_id uuid
);


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    report_type public.report_type NOT NULL,
    template_name character varying(100) NOT NULL,
    template_content text,
    placeholders jsonb,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: scan_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_results (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_id uuid,
    imaging_id uuid,
    patient_id uuid,
    findings text,
    impression text,
    recommendation text,
    radiologist_id uuid,
    report_date timestamp with time zone DEFAULT now(),
    image_urls text[],
    dicom_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encounter_id uuid
);


--
-- Name: service_price_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_price_audit (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    service_type character varying(50) NOT NULL,
    service_id uuid NOT NULL,
    service_name character varying(255),
    field_changed character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now(),
    reason text
);


--
-- Name: shift_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_name character varying(20) NOT NULL,
    display_name character varying(50) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    color character varying(20) DEFAULT '#6B7280'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: shift_handover; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_handover (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid,
    patient_id uuid,
    from_nurse_id uuid,
    to_nurse_id uuid,
    shift_date date DEFAULT CURRENT_DATE NOT NULL,
    shift_type character varying(20) NOT NULL,
    patient_condition text,
    key_observations text,
    pending_tasks text,
    special_instructions text,
    medications_due text,
    critical_alerts text,
    handover_notes text,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shift_handover_shift_type_check CHECK (((shift_type)::text = ANY (ARRAY[('day'::character varying)::text, ('evening'::character varying)::text, ('night'::character varying)::text])))
);


--
-- Name: shift_handovers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shift_handovers (
    handover_id uuid DEFAULT gen_random_uuid() NOT NULL,
    encounter_id uuid,
    shift_date date,
    outgoing_nurse_id uuid,
    incoming_nurse_id uuid,
    patient_status text,
    key_observations text,
    pending_tasks text,
    medications_given text,
    upcoming_medications text,
    special_instructions text,
    concerns text,
    status character varying(20) DEFAULT 'pending'::character varying,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    patient_id uuid,
    consciousness_level character varying(50),
    mobility_status character varying(50),
    isolation_precautions text,
    fall_risk_level character varying(20),
    medication_due jsonb DEFAULT '[]'::jsonb,
    investigations_pending jsonb DEFAULT '[]'::jsonb,
    last_vitals jsonb,
    vitals_trend text,
    iv_access jsonb DEFAULT '[]'::jsonb,
    drains_catheters jsonb DEFAULT '[]'::jsonb,
    diet_type character varying(100),
    feeding_route character varying(50),
    last_meal_time timestamp with time zone,
    follow_up_actions text,
    handover_date date DEFAULT CURRENT_DATE,
    outgoing_shift character varying(20),
    incoming_shift character varying(20),
    handover_time timestamp with time zone DEFAULT now(),
    is_acknowledged boolean DEFAULT false
);


--
-- Name: system_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configurations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    description text,
    category_id uuid,
    is_system boolean DEFAULT false,
    data_type public.config_data_type DEFAULT 'string'::public.config_data_type,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: todays_procedures; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.todays_procedures AS
 SELECT pr.id AS procedure_id,
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
  WHERE ((date(pr.scheduled_date) = CURRENT_DATE) AND ((pr.status)::text <> ALL (ARRAY[('cancelled'::character varying)::text, ('completed'::character varying)::text])))
  ORDER BY pr.scheduled_date;


--
-- Name: treatment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_plans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid,
    patient_id uuid,
    consultation_id uuid,
    title character varying(255) NOT NULL,
    description text,
    instructions text,
    status public.treatment_plan_status DEFAULT 'Created'::public.treatment_plan_status,
    created_by uuid,
    viewed_by uuid,
    viewed_at timestamp with time zone,
    completed_by uuid,
    completed_at timestamp with time zone,
    completion_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: treatment_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    plan_id uuid,
    encounter_id uuid,
    patient_id uuid,
    task_type public.treatment_task_type NOT NULL,
    description text,
    status public.treatment_task_status DEFAULT 'Pending'::public.treatment_task_status,
    scheduled_at timestamp with time zone,
    completed_at timestamp with time zone,
    completed_by uuid,
    notes text,
    result_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    started_by uuid,
    title text,
    instructions text,
    medication_name text,
    dosage text,
    route text,
    scheduled_time timestamp with time zone,
    sequence_order integer DEFAULT 0,
    priority text DEFAULT 'Normal'::text,
    execution_notes text
);


--
-- Name: triage_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.triage_assessments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    visit_id uuid,
    patient_id uuid,
    temperature numeric(4,1),
    pulse_rate integer,
    respiratory_rate integer,
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    oxygen_saturation integer,
    weight numeric(6,2),
    height numeric(6,2),
    bmi numeric(6,2),
    blood_glucose numeric(6,2),
    chief_complaint_text text,
    consciousness public.consciousness_level DEFAULT 'Alert'::public.consciousness_level,
    pain_score integer,
    triage_level integer,
    triage_color character varying(20),
    status public.triage_status DEFAULT 'Completed'::public.triage_status,
    triaged_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    patient_uuid uuid
);


--
-- Name: v_drug_inventory_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_drug_inventory_summary AS
 SELECT dc.id AS drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    dc.strengths AS strength,
    dc.price AS selling_price,
    dc.reorder_level,
    dc.is_active,
    COALESCE(batch_stats.total_quantity, (0)::bigint) AS total_stock,
    COALESCE(batch_stats.batch_count, (0)::bigint) AS batch_count,
    COALESCE(batch_stats.earliest_expiry, NULL::date) AS earliest_expiry,
    COALESCE(batch_stats.total_cost_value, (0)::numeric) AS stock_cost_value,
    COALESCE(batch_stats.expiring_soon, (0)::bigint) AS expiring_soon_qty,
    COALESCE(all_batch_stats.has_batch_history, false) AS has_batch_history,
        CASE
            WHEN ((COALESCE(batch_stats.total_quantity, (0)::bigint) = 0) AND ((dc.reorder_level > 0) OR COALESCE(all_batch_stats.has_batch_history, false))) THEN 'out_of_stock'::text
            WHEN (COALESCE(batch_stats.total_quantity, (0)::bigint) = 0) THEN 'not_stocked'::text
            WHEN (COALESCE(batch_stats.total_quantity, (0)::bigint) <= dc.reorder_level) THEN 'low_stock'::text
            ELSE 'in_stock'::text
        END AS stock_status
   FROM ((public.drug_catalogue dc
     LEFT JOIN ( SELECT drug_batches.drug_id,
            sum(drug_batches.quantity_remaining) AS total_quantity,
            count(*) AS batch_count,
            min(drug_batches.expiry_date) FILTER (WHERE (drug_batches.quantity_remaining > 0)) AS earliest_expiry,
            sum(((drug_batches.quantity_remaining)::numeric * drug_batches.cost_price)) AS total_cost_value,
            sum(drug_batches.quantity_remaining) FILTER (WHERE (drug_batches.expiry_date <= (CURRENT_DATE + '90 days'::interval))) AS expiring_soon
           FROM public.drug_batches
          WHERE (((drug_batches.status)::text = 'active'::text) AND (drug_batches.expiry_date > CURRENT_DATE))
          GROUP BY drug_batches.drug_id) batch_stats ON ((batch_stats.drug_id = dc.id)))
     LEFT JOIN ( SELECT drug_batches.drug_id,
            true AS has_batch_history
           FROM public.drug_batches
          GROUP BY drug_batches.drug_id) all_batch_stats ON ((all_batch_stats.drug_id = dc.id)))
  WHERE (dc.is_active = true);


--
-- Name: v_expired_drugs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_expired_drugs AS
 SELECT db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    db.batch_number,
    db.quantity_remaining,
    db.expiry_date,
    (CURRENT_DATE - db.expiry_date) AS days_expired,
    db.cost_price,
    ((db.quantity_remaining)::numeric * db.cost_price) AS loss_value,
    db.status
   FROM (public.drug_batches db
     JOIN public.drug_catalogue dc ON ((dc.id = db.drug_id)))
  WHERE ((db.expiry_date <= CURRENT_DATE) AND (db.quantity_remaining > 0))
  ORDER BY db.expiry_date DESC;


--
-- Name: v_lab_results_complete; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lab_results_complete AS
 SELECT lr.id AS result_id,
    lr.request_id,
    lr.patient_id,
    lr.test_id,
    ltc.name AS test_name,
    ltc.category AS test_category,
    ltc.category_code,
    ltc.result_template_type AS template_type,
    ltc.specimen_type AS required_sample_type,
    lr.result_value,
    lr.unit,
    lr.reference_range,
    lr.structured_result,
    lr.result_template_type,
    lr.is_abnormal,
    lr.is_critical,
    lr.comments,
    lr.workflow_status,
    lr.collected_at,
    lr.reported_at,
    lr.verified_by,
    lr.verified_at,
    lr.approved_by,
    lr.approved_at,
    lr.technician_id,
    lr.last_modified_by,
    lr.created_at,
    lr.updated_at,
    lr.version,
    lreq.status AS request_status,
    lreq.priority,
    lreq.clinical_notes,
    lreq.ordered_by,
    lreq.created_at AS requested_at,
    p.emr_number,
    p.first_name AS patient_first_name,
    p.surname AS patient_surname,
    p.date_of_birth AS patient_dob,
    p.gender AS patient_gender
   FROM (((public.lab_results lr
     LEFT JOIN public.lab_requests lreq ON ((lr.request_id = lreq.request_id)))
     LEFT JOIN public.lab_test_catalogue ltc ON ((lr.test_id = ltc.id)))
     LEFT JOIN public.patients p ON ((lr.patient_id = p.id)));


--
-- Name: v_lab_workflow_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lab_workflow_summary AS
 SELECT lreq.request_id,
    lreq.status,
    lreq.priority,
    lreq.created_at AS requested_at,
    lreq.patient_id,
    ltc.name AS test_name,
    ltc.category AS test_category,
    ltc.result_template_type,
        CASE
            WHEN (lr.id IS NOT NULL) THEN 'Result Entered'::text
            WHEN (lreq.sample_collected_at IS NOT NULL) THEN 'Sample Collected'::text
            WHEN (lreq.accepted_at IS NOT NULL) THEN 'Accepted'::text
            ELSE 'Pending'::text
        END AS workflow_stage,
    lr.id AS result_id,
    lr.workflow_status AS result_workflow_status,
    lr.is_critical,
    lr.is_abnormal,
    lreq.accepted_at,
    lreq.sample_collected_at,
    lr.collected_at AS result_collected_at,
    lr.reported_at,
    lr.verified_at,
    lr.approved_at,
    (EXTRACT(epoch FROM (lreq.sample_collected_at - lreq.accepted_at)) / (60)::numeric) AS acceptance_to_collection_mins,
    (EXTRACT(epoch FROM (lr.reported_at - lreq.sample_collected_at)) / (60)::numeric) AS collection_to_result_mins,
    (EXTRACT(epoch FROM (lr.reported_at - lreq.created_at)) / (60)::numeric) AS total_turnaround_mins
   FROM ((public.lab_requests lreq
     LEFT JOIN public.lab_test_catalogue ltc ON ((lreq.test_id = ltc.id)))
     LEFT JOIN public.lab_results lr ON ((lreq.request_id = lr.request_id)));


--
-- Name: v_near_expiry_drugs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_near_expiry_drugs AS
 SELECT db.batch_id,
    db.drug_id,
    dc.code AS drug_code,
    dc.name AS drug_name,
    db.batch_number,
    db.quantity_remaining,
    db.expiry_date,
    (db.expiry_date - CURRENT_DATE) AS days_to_expiry,
    db.cost_price,
    ((db.quantity_remaining)::numeric * db.cost_price) AS batch_value,
        CASE
            WHEN ((db.expiry_date - CURRENT_DATE) <= 30) THEN 'critical'::text
            WHEN ((db.expiry_date - CURRENT_DATE) <= 60) THEN 'warning'::text
            WHEN ((db.expiry_date - CURRENT_DATE) <= 90) THEN 'caution'::text
            ELSE NULL::text
        END AS urgency_level
   FROM (public.drug_batches db
     JOIN public.drug_catalogue dc ON ((dc.id = db.drug_id)))
  WHERE (((db.status)::text = 'active'::text) AND (db.quantity_remaining > 0) AND (db.expiry_date > CURRENT_DATE) AND (db.expiry_date <= (CURRENT_DATE + '90 days'::interval)))
  ORDER BY db.expiry_date;


--
-- Name: v_patient_complaints; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_patient_complaints AS
 SELECT pcc.id,
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
   FROM (((public.patient_chief_complaints pcc
     JOIN public.chief_complaint_catalogue ccc ON ((pcc.complaint_id = ccc.complaint_id)))
     JOIN public.patients p ON (((pcc.patient_id)::text = (p.patient_id)::text)))
     JOIN public.visits v ON ((pcc.encounter_id = v.id)));


--
-- Name: version_conflict_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.version_conflict_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(64) NOT NULL,
    record_id uuid NOT NULL,
    expected_version integer NOT NULL,
    actual_version integer NOT NULL,
    attempted_by uuid,
    last_modified_by uuid,
    attempted_at timestamp with time zone DEFAULT now(),
    client_info jsonb
);


--
-- Name: visit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visit_id_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vital_schedule_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vital_schedule_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    acuity_level public.patient_acuity NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    frequency_minutes integer NOT NULL,
    grace_period_minutes integer DEFAULT 15,
    alert_priority character varying(20) DEFAULT 'normal'::character varying,
    color character varying(20) DEFAULT '#6B7280'::character varying,
    icon character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vital_schedules_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vital_schedules_summary AS
 SELECT pvs.id,
    pvs.patient_id,
    concat(p.first_name, ' ', p.surname) AS patient_name,
    pvs.encounter_id,
    w.name AS ward_name,
    b.bed_number,
    pvs.acuity_level,
    vsc.display_name AS acuity_display_name,
    vsc.frequency_minutes,
    vsc.color AS acuity_color,
    pvs.last_vitals_at,
    pvs.next_vitals_due,
    pvs.is_overdue,
        CASE
            WHEN pvs.is_overdue THEN ((EXTRACT(epoch FROM (now() - pvs.next_vitals_due)))::integer / 60)
            ELSE NULL::integer
        END AS minutes_overdue,
        CASE
            WHEN ((NOT pvs.is_overdue) AND (pvs.next_vitals_due > now())) THEN ((EXTRACT(epoch FROM (pvs.next_vitals_due - now())))::integer / 60)
            ELSE NULL::integer
        END AS minutes_until_due,
    pvs.assigned_nurse_id,
    concat(s.first_name, ' ', s.last_name) AS assigned_nurse_name,
    pvs.paused,
    pvs.pause_reason,
    pvs.is_active
   FROM (((((((public.patient_vital_schedules pvs
     JOIN public.patients p ON (((p.patient_id)::text = (pvs.patient_id)::text)))
     JOIN public.visits v ON ((v.id = pvs.encounter_id)))
     JOIN public.vital_schedule_configs vsc ON ((vsc.acuity_level = pvs.acuity_level)))
     LEFT JOIN public.admissions a ON ((a.encounter_id = v.id)))
     LEFT JOIN public.beds b ON ((b.id = a.current_bed_id)))
     LEFT JOIN public.wards w ON ((w.id = b.ward_id)))
     LEFT JOIN public.staff s ON ((s.id = pvs.assigned_nurse_id)))
  WHERE (pvs.is_active = true);


--
-- Name: vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vitals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    encounter_id uuid NOT NULL,
    patient_id uuid,
    temperature numeric(4,1),
    blood_pressure character varying(20),
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    pulse integer,
    respiratory_rate integer,
    oxygen_saturation integer,
    weight numeric(6,2),
    height numeric(6,2),
    bmi numeric(6,2),
    blood_glucose numeric(6,2),
    pain_level integer,
    nurse_id uuid,
    date_recorded timestamp with time zone DEFAULT now(),
    notes text,
    is_critical boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    schedule_id uuid,
    was_overdue boolean DEFAULT false,
    minutes_overdue integer,
    idempotency_key public.idempotency_key_t,
    version integer DEFAULT 1 NOT NULL,
    last_modified_by uuid,
    patient_uuid uuid
);

ALTER TABLE ONLY public.vitals REPLICA IDENTITY FULL;


--
-- Name: vw_daily_interventions_by_ward; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_daily_interventions_by_ward AS
 SELECT date(ni.performed_at) AS intervention_date,
    ni.ward_id,
    w.name AS ward_name,
    ni.category_code,
    ni.intervention_code,
    count(*) AS intervention_count,
    count(DISTINCT ni.nurse_id) AS unique_nurses,
    count(DISTINCT ni.patient_id) AS unique_patients
   FROM (public.nursing_interventions ni
     LEFT JOIN public.wards w ON ((w.id = ni.ward_id)))
  GROUP BY (date(ni.performed_at)), ni.ward_id, w.name, ni.category_code, ni.intervention_code
  ORDER BY (date(ni.performed_at)) DESC, w.name, ni.category_code;


--
-- Name: vw_doctor_notifications; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_doctor_notifications AS
 SELECT date(ni.performed_at) AS notification_date,
    ni.ward_id,
    w.name AS ward_name,
    ni.intervention_code,
    count(*) AS notification_count
   FROM (public.nursing_interventions ni
     LEFT JOIN public.wards w ON ((w.id = ni.ward_id)))
  WHERE (((ni.category_code)::text = 'COMMUNICATION'::text) AND ((ni.intervention_code)::text = ANY ((ARRAY['DOCTOR_NOTIFIED_CHANGE_CONDITION'::character varying, 'DOCTOR_NOTIFIED_CRITICAL'::character varying])::text[])))
  GROUP BY (date(ni.performed_at)), ni.ward_id, w.name, ni.intervention_code
  ORDER BY (date(ni.performed_at)) DESC;


--
-- Name: vw_interventions_by_shift; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_interventions_by_shift AS
 SELECT date(performed_at) AS intervention_date,
    shift,
    category_code,
    intervention_code,
    count(*) AS intervention_count
   FROM public.nursing_interventions
  WHERE (shift IS NOT NULL)
  GROUP BY (date(performed_at)), shift, category_code, intervention_code
  ORDER BY (date(performed_at)) DESC, shift;


--
-- Name: ward_census; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ward_census AS
 WITH bed_counts AS (
         SELECT beds.ward_id,
            count(*) FILTER (WHERE ((beds.status)::text = 'Available'::text)) AS available_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'Occupied'::text)) AS occupied_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'Maintenance'::text)) AS maintenance_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'Cleaning'::text)) AS cleaning_count,
            count(*) FILTER (WHERE ((beds.status)::text = 'Reserved'::text)) AS reserved_count
           FROM public.beds
          WHERE (beds.is_active = true)
          GROUP BY beds.ward_id
        )
 SELECT w.id AS ward_id,
    w.name AS ward_name,
    w.ward_type,
    w.total_beds,
    (COALESCE(bc.available_count, (0)::bigint))::integer AS available_beds,
    (COALESCE(bc.occupied_count, (0)::bigint))::integer AS occupied_beds,
    (COALESCE(bc.maintenance_count, (0)::bigint))::integer AS maintenance_beds,
    (COALESCE(bc.cleaning_count, (0)::bigint))::integer AS cleaning_beds,
    (COALESCE(bc.reserved_count, (0)::bigint))::integer AS reserved_beds,
    round((((COALESCE(bc.occupied_count, (0)::bigint))::numeric / (NULLIF(w.total_beds, 0))::numeric) * (100)::numeric), 1) AS occupancy_rate,
    count(a.id) FILTER (WHERE ((a.admission_status)::text = 'critical'::text)) AS critical_patients,
    count(a.id) FILTER (WHERE (a.isolation_required = true)) AS isolation_patients,
    w.facility_id
   FROM ((public.wards w
     LEFT JOIN bed_counts bc ON ((w.id = bc.ward_id)))
     LEFT JOIN public.admissions a ON (((a.current_ward_id = w.id) AND ((a.admission_status)::text <> ALL ((ARRAY['discharged'::character varying, 'transferred'::character varying, 'deceased'::character varying])::text[])))))
  WHERE (w.is_active = true)
  GROUP BY w.id, w.name, w.ward_type, w.total_beds, bc.available_count, bc.occupied_count, bc.maintenance_count, bc.cleaning_count, bc.reserved_count, w.facility_id;


--
-- Name: ward_round_summary_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ward_round_summary_view AS
 SELECT wrn.id AS ward_round_id,
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
    wrn.attending_physician_id,
    (((doc.first_name)::text || ' '::text) || (doc.last_name)::text) AS attending_physician_name,
    doc.staff_id AS attending_physician_staff_id,
    wrn.created_by,
    (((creator.first_name)::text || ' '::text) || (creator.last_name)::text) AS created_by_name,
    wrn.created_at,
    wrn.participants,
    a.admission_number,
    p.emr_number AS hospital_id,
    (((p.first_name)::text || ' '::text) || (p.surname)::text) AS patient_name
   FROM ((((public.ward_round_notes wrn
     JOIN public.admissions a ON ((a.id = wrn.admission_id)))
     JOIN public.patients p ON ((p.id = a.patient_id)))
     LEFT JOIN public.staff doc ON ((doc.id = wrn.attending_physician_id)))
     LEFT JOIN public.staff creator ON ((creator.id = wrn.created_by)))
  ORDER BY wrn.round_date DESC, wrn.created_at DESC;


--
-- Name: workflow_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_exceptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    exception_number character varying(50) NOT NULL,
    exception_type public.exception_type NOT NULL,
    severity character varying(20) DEFAULT 'Normal'::character varying,
    entity_type character varying(50),
    entity_id uuid,
    reason text,
    status public.exception_status DEFAULT 'Pending'::public.exception_status,
    requested_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admissions admissions_admission_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_admission_number_key UNIQUE (admission_number);


--
-- Name: admissions admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: bed_transfers bed_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_pkey PRIMARY KEY (id);


--
-- Name: beds beds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_pkey PRIMARY KEY (id);


--
-- Name: beds beds_ward_id_bed_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_ward_id_bed_number_key UNIQUE (ward_id, bed_number);


--
-- Name: billing_audit_log billing_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_audit_log
    ADD CONSTRAINT billing_audit_log_pkey PRIMARY KEY (id);


--
-- Name: billing_items billing_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_pkey PRIMARY KEY (id);


--
-- Name: billing_orders billing_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_order_number_key UNIQUE (order_number);


--
-- Name: billing_orders billing_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_pkey PRIMARY KEY (id);


--
-- Name: chief_complaint_catalogue chief_complaint_catalogue_complaint_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_complaint_catalogue
    ADD CONSTRAINT chief_complaint_catalogue_complaint_code_key UNIQUE (complaint_code);


--
-- Name: chief_complaint_catalogue chief_complaint_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_complaint_catalogue
    ADD CONSTRAINT chief_complaint_catalogue_pkey PRIMARY KEY (complaint_id);


--
-- Name: clinical_request_status_history clinical_request_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_request_status_history
    ADD CONSTRAINT clinical_request_status_history_pkey PRIMARY KEY (id);


--
-- Name: clinical_requests clinical_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_pkey PRIMARY KEY (id);


--
-- Name: clinical_requests clinical_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_request_number_key UNIQUE (request_number);


--
-- Name: clinics clinics_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_clinic_id_key UNIQUE (clinic_id);


--
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- Name: config_categories config_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config_categories
    ADD CONSTRAINT config_categories_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (consultation_id);


--
-- Name: courses courses_course_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_name_key UNIQUE (course_name);


--
-- Name: courses courses_course_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_number_key UNIQUE (course_number);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: customer_feedback customer_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_feedback
    ADD CONSTRAINT customer_feedback_pkey PRIMARY KEY (id);


--
-- Name: daily_progress_notes daily_progress_notes_encounter_id_note_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_progress_notes
    ADD CONSTRAINT daily_progress_notes_encounter_id_note_date_key UNIQUE (encounter_id, note_date);


--
-- Name: daily_progress_notes daily_progress_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_progress_notes
    ADD CONSTRAINT daily_progress_notes_pkey PRIMARY KEY (progress_id);


--
-- Name: dental_chart dental_chart_exam_id_tooth_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_exam_id_tooth_number_key UNIQUE (exam_id, tooth_number);


--
-- Name: dental_chart dental_chart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_pkey PRIMARY KEY (chart_id);


--
-- Name: dental_exams dental_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_pkey PRIMARY KEY (exam_id);


--
-- Name: dental_prescriptions dental_prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_pkey PRIMARY KEY (prescription_id);


--
-- Name: dental_procedures dental_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_pkey PRIMARY KEY (procedure_id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: dispense_items dispense_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_items
    ADD CONSTRAINT dispense_items_pkey PRIMARY KEY (id);


--
-- Name: dispense_records dispense_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_records
    ADD CONSTRAINT dispense_records_pkey PRIMARY KEY (dispense_id);


--
-- Name: dispenses dispenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispenses
    ADD CONSTRAINT dispenses_pkey PRIMARY KEY (id);


--
-- Name: doctor_orders doctor_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_pkey PRIMARY KEY (order_id);


--
-- Name: drug_batches drug_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_batches
    ADD CONSTRAINT drug_batches_pkey PRIMARY KEY (batch_id);


--
-- Name: drug_catalogue drug_catalogue_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_catalogue
    ADD CONSTRAINT drug_catalogue_code_key UNIQUE (code);


--
-- Name: drug_catalogue drug_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_catalogue
    ADD CONSTRAINT drug_catalogue_pkey PRIMARY KEY (id);


--
-- Name: encounter_access_logs encounter_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_access_logs
    ADD CONSTRAINT encounter_access_logs_pkey PRIMARY KEY (id);


--
-- Name: encounter_care_team encounter_care_team_encounter_id_staff_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_care_team
    ADD CONSTRAINT encounter_care_team_encounter_id_staff_id_role_key UNIQUE (encounter_id, staff_id, role);


--
-- Name: encounter_care_team encounter_care_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_care_team
    ADD CONSTRAINT encounter_care_team_pkey PRIMARY KEY (id);


--
-- Name: encounter_transfers encounter_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_transfers
    ADD CONSTRAINT encounter_transfers_pkey PRIMARY KEY (id);


--
-- Name: external_referrals external_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_pkey PRIMARY KEY (id);


--
-- Name: external_referrals external_referrals_referral_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_referral_number_key UNIQUE (referral_number);


--
-- Name: eye_exams eye_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_pkey PRIMARY KEY (exam_id);


--
-- Name: eye_prescriptions eye_prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_pkey PRIMARY KEY (prescription_id);


--
-- Name: eye_procedures eye_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_pkey PRIMARY KEY (procedure_id);


--
-- Name: facilities facilities_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_code_key UNIQUE (code);


--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- Name: icd10_codes icd10_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icd10_codes
    ADD CONSTRAINT icd10_codes_pkey PRIMARY KEY (code);


--
-- Name: idempotency_hash_mismatches idempotency_hash_mismatches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_hash_mismatches
    ADD CONSTRAINT idempotency_hash_mismatches_pkey PRIMARY KEY (id);


--
-- Name: imaging_catalogue imaging_catalogue_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_catalogue
    ADD CONSTRAINT imaging_catalogue_code_key UNIQUE (code);


--
-- Name: imaging_catalogue imaging_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_catalogue
    ADD CONSTRAINT imaging_catalogue_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_item_code_key UNIQUE (item_code);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_stock_movements inventory_stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_pkey PRIMARY KEY (movement_id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (item_id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: lab_categories lab_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_categories
    ADD CONSTRAINT lab_categories_code_key UNIQUE (code);


--
-- Name: lab_categories lab_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_categories
    ADD CONSTRAINT lab_categories_pkey PRIMARY KEY (id);


--
-- Name: lab_critical_notifications lab_critical_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_critical_notifications
    ADD CONSTRAINT lab_critical_notifications_pkey PRIMARY KEY (id);


--
-- Name: lab_request_items lab_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_request_items
    ADD CONSTRAINT lab_request_items_pkey PRIMARY KEY (id);


--
-- Name: lab_requests lab_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_pkey PRIMARY KEY (request_id);


--
-- Name: lab_result_history lab_result_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_history
    ADD CONSTRAINT lab_result_history_pkey PRIMARY KEY (id);


--
-- Name: lab_result_template_types lab_result_template_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_template_types
    ADD CONSTRAINT lab_result_template_types_code_key UNIQUE (code);


--
-- Name: lab_result_template_types lab_result_template_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_template_types
    ADD CONSTRAINT lab_result_template_types_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_test_catalogue lab_test_catalogue_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalogue
    ADD CONSTRAINT lab_test_catalogue_code_key UNIQUE (code);


--
-- Name: lab_test_catalogue lab_test_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalogue
    ADD CONSTRAINT lab_test_catalogue_pkey PRIMARY KEY (id);


--
-- Name: medical_reports medical_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_reports
    ADD CONSTRAINT medical_reports_pkey PRIMARY KEY (id);


--
-- Name: medication_administration medication_administration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_pkey PRIMARY KEY (id);


--
-- Name: nhis_approvals nhis_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_approvals
    ADD CONSTRAINT nhis_approvals_pkey PRIMARY KEY (id);


--
-- Name: nhis_audit_log nhis_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_audit_log
    ADD CONSTRAINT nhis_audit_log_pkey PRIMARY KEY (id);


--
-- Name: nhis_authorizations nhis_authorizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_pkey PRIMARY KEY (id);


--
-- Name: nhis_claims nhis_claims_claim_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_claim_number_key UNIQUE (claim_number);


--
-- Name: nhis_claims nhis_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_pkey PRIMARY KEY (id);


--
-- Name: nhis_config nhis_config_payment_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_config
    ADD CONSTRAINT nhis_config_payment_category_key UNIQUE (payment_category);


--
-- Name: nhis_config nhis_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_config
    ADD CONSTRAINT nhis_config_pkey PRIMARY KEY (id);


--
-- Name: nhis_export_batches nhis_export_batches_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_export_batches
    ADD CONSTRAINT nhis_export_batches_batch_number_key UNIQUE (batch_number);


--
-- Name: nhis_export_batches nhis_export_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_export_batches
    ADD CONSTRAINT nhis_export_batches_pkey PRIMARY KEY (id);


--
-- Name: nhis_hmos nhis_hmos_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_hmos
    ADD CONSTRAINT nhis_hmos_name_key UNIQUE (name);


--
-- Name: nhis_hmos nhis_hmos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_hmos
    ADD CONSTRAINT nhis_hmos_pkey PRIMARY KEY (id);


--
-- Name: nhis_medicines nhis_medicines_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_medicines
    ADD CONSTRAINT nhis_medicines_code_key UNIQUE (code);


--
-- Name: nhis_medicines nhis_medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_medicines
    ADD CONSTRAINT nhis_medicines_pkey PRIMARY KEY (id);


--
-- Name: nhis_policy_config nhis_policy_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_policy_config
    ADD CONSTRAINT nhis_policy_config_pkey PRIMARY KEY (id);


--
-- Name: nhis_postings nhis_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_pkey PRIMARY KEY (id);


--
-- Name: nhis_procedures nhis_procedures_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_procedures
    ADD CONSTRAINT nhis_procedures_code_key UNIQUE (code);


--
-- Name: nhis_procedures nhis_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_procedures
    ADD CONSTRAINT nhis_procedures_pkey PRIMARY KEY (id);


--
-- Name: nhis_profiles nhis_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT nhis_profiles_pkey PRIMARY KEY (id);


--
-- Name: nhis_referral_queue nhis_referral_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_referral_queue
    ADD CONSTRAINT nhis_referral_queue_pkey PRIMARY KEY (id);


--
-- Name: nhis_tariff_rules nhis_tariff_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_tariff_rules
    ADD CONSTRAINT nhis_tariff_rules_pkey PRIMARY KEY (id);


--
-- Name: on_call_schedule no_overlap_schedule; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_call_schedule
    ADD CONSTRAINT no_overlap_schedule EXCLUDE USING gist (staff_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE ((is_active = true));


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nursing_audit_log nursing_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_audit_log
    ADD CONSTRAINT nursing_audit_log_pkey PRIMARY KEY (id);


--
-- Name: nursing_interventions nursing_interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_interventions
    ADD CONSTRAINT nursing_interventions_pkey PRIMARY KEY (id);


--
-- Name: nursing_notes nursing_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_pkey PRIMARY KEY (id);


--
-- Name: on_call_schedule on_call_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_call_schedule
    ADD CONSTRAINT on_call_schedule_pkey PRIMARY KEY (id);


--
-- Name: patient_chief_complaints patient_chief_complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT patient_chief_complaints_pkey PRIMARY KEY (id);


--
-- Name: patient_vital_schedules patient_vital_schedules_patient_id_encounter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_patient_id_encounter_id_key UNIQUE (patient_id, encounter_id);


--
-- Name: patient_vital_schedules patient_vital_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_pkey PRIMARY KEY (id);


--
-- Name: patients patients_emr_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_emr_number_key UNIQUE (emr_number);


--
-- Name: patients patients_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_patient_id_key UNIQUE (patient_id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: payments payments_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_receipt_number_key UNIQUE (receipt_number);


--
-- Name: physio_assessments physio_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_pkey PRIMARY KEY (assessment_id);


--
-- Name: physio_discharge physio_discharge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_discharge
    ADD CONSTRAINT physio_discharge_pkey PRIMARY KEY (discharge_id);


--
-- Name: physio_plans physio_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_pkey PRIMARY KEY (plan_id);


--
-- Name: physio_progress physio_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_pkey PRIMARY KEY (progress_id);


--
-- Name: physio_sessions physio_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (prescription_id);


--
-- Name: price_list price_list_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_list
    ADD CONSTRAINT price_list_item_code_key UNIQUE (item_code);


--
-- Name: price_list price_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_list
    ADD CONSTRAINT price_list_pkey PRIMARY KEY (price_id);


--
-- Name: procedure_catalogue procedure_catalogue_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_catalogue
    ADD CONSTRAINT procedure_catalogue_code_key UNIQUE (code);


--
-- Name: procedure_catalogue procedure_catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_catalogue
    ADD CONSTRAINT procedure_catalogue_pkey PRIMARY KEY (id);


--
-- Name: procedure_consumables procedure_consumables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumables
    ADD CONSTRAINT procedure_consumables_pkey PRIMARY KEY (id);


--
-- Name: procedure_requests procedure_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_requests
    ADD CONSTRAINT procedure_requests_pkey PRIMARY KEY (request_id);


--
-- Name: procedures procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);


--
-- Name: procedures procedures_procedure_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_procedure_number_key UNIQUE (procedure_number);


--
-- Name: queue_daily_counters queue_daily_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_daily_counters
    ADD CONSTRAINT queue_daily_counters_pkey PRIMARY KEY (id);


--
-- Name: queue_daily_counters queue_daily_counters_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue_daily_counters
    ADD CONSTRAINT queue_daily_counters_unique UNIQUE (department, counter_date);


--
-- Name: queue queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_pkey PRIMARY KEY (id);


--
-- Name: radiology_request_items radiology_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_request_items
    ADD CONSTRAINT radiology_request_items_pkey PRIMARY KEY (id);


--
-- Name: radiology_requests radiology_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT radiology_requests_pkey PRIMARY KEY (request_id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id);


--
-- Name: receipts receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: referral_outcomes referral_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_outcomes
    ADD CONSTRAINT referral_outcomes_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referral_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_number_key UNIQUE (referral_number);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: scan_results scan_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_results
    ADD CONSTRAINT scan_results_pkey PRIMARY KEY (id);


--
-- Name: service_price_audit service_price_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_price_audit
    ADD CONSTRAINT service_price_audit_pkey PRIMARY KEY (id);


--
-- Name: shift_configurations shift_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_configurations
    ADD CONSTRAINT shift_configurations_pkey PRIMARY KEY (id);


--
-- Name: shift_configurations shift_configurations_shift_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_configurations
    ADD CONSTRAINT shift_configurations_shift_name_key UNIQUE (shift_name);


--
-- Name: shift_handover shift_handover_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handover
    ADD CONSTRAINT shift_handover_pkey PRIMARY KEY (id);


--
-- Name: shift_handovers shift_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handovers
    ADD CONSTRAINT shift_handovers_pkey PRIMARY KEY (handover_id);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff staff_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_staff_id_key UNIQUE (staff_id);


--
-- Name: staff staff_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_key UNIQUE (user_id);


--
-- Name: system_configurations system_configurations_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_key_key UNIQUE (key);


--
-- Name: system_configurations system_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_pkey PRIMARY KEY (id);


--
-- Name: treatment_plans treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: treatment_tasks treatment_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_pkey PRIMARY KEY (id);


--
-- Name: triage_assessments triage_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT triage_assessments_pkey PRIMARY KEY (id);


--
-- Name: patient_chief_complaints unique_complaint_per_encounter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT unique_complaint_per_encounter UNIQUE (encounter_id, complaint_id);


--
-- Name: drug_batches unique_drug_batch; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_batches
    ADD CONSTRAINT unique_drug_batch UNIQUE (drug_id, batch_number);


--
-- Name: nhis_profiles unique_patient_nhis_profile; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT unique_patient_nhis_profile UNIQUE (patient_id);


--
-- Name: version_conflict_log version_conflict_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.version_conflict_log
    ADD CONSTRAINT version_conflict_log_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: visits visits_visit_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_visit_id_key UNIQUE (visit_id);


--
-- Name: vital_schedule_configs vital_schedule_configs_acuity_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_schedule_configs
    ADD CONSTRAINT vital_schedule_configs_acuity_level_key UNIQUE (acuity_level);


--
-- Name: vital_schedule_configs vital_schedule_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vital_schedule_configs
    ADD CONSTRAINT vital_schedule_configs_pkey PRIMARY KEY (id);


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- Name: ward_round_notes ward_round_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_pkey PRIMARY KEY (id);


--
-- Name: wards wards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_code_key UNIQUE (code);


--
-- Name: wards wards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_pkey PRIMARY KEY (id);


--
-- Name: workflow_exceptions workflow_exceptions_exception_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_exceptions
    ADD CONSTRAINT workflow_exceptions_exception_number_key UNIQUE (exception_number);


--
-- Name: workflow_exceptions workflow_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_exceptions
    ADD CONSTRAINT workflow_exceptions_pkey PRIMARY KEY (id);


--
-- Name: idx_access_logs_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_encounter ON public.encounter_access_logs USING btree (encounter_id);


--
-- Name: idx_access_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_timestamp ON public.encounter_access_logs USING btree ("timestamp" DESC);


--
-- Name: idx_access_logs_unauthorized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_unauthorized ON public.encounter_access_logs USING btree (encounter_id, "timestamp") WHERE (was_authorized = false);


--
-- Name: idx_access_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_logs_user ON public.encounter_access_logs USING btree (user_id);


--
-- Name: idx_admissions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_active ON public.admissions USING btree (admission_status) WHERE ((admission_status)::text <> ALL (ARRAY[('discharged'::character varying)::text, ('transferred'::character varying)::text, ('deceased'::character varying)::text]));


--
-- Name: idx_admissions_attending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_attending ON public.admissions USING btree (attending_physician_id);


--
-- Name: idx_admissions_bed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_bed ON public.admissions USING btree (current_bed_id);


--
-- Name: idx_admissions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_date ON public.admissions USING btree (admission_date);


--
-- Name: idx_admissions_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_encounter ON public.admissions USING btree (encounter_id);


--
-- Name: idx_admissions_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_facility ON public.admissions USING btree (facility_id);


--
-- Name: idx_admissions_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_admissions_idempotency_key ON public.admissions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_admissions_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_number ON public.admissions USING btree (admission_number);


--
-- Name: idx_admissions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_patient ON public.admissions USING btree (patient_id);


--
-- Name: idx_admissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_status ON public.admissions USING btree (admission_status);


--
-- Name: idx_admissions_ward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_ward ON public.admissions USING btree (current_ward_id);


--
-- Name: idx_admissions_ward_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admissions_ward_active ON public.admissions USING btree (current_ward_id, admission_status) WHERE ((admission_status)::text = ANY ((ARRAY['admitted'::character varying, 'under_observation'::character varying, 'critical'::character varying, 'stable'::character varying, 'improving'::character varying])::text[]));


--
-- Name: idx_beds_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beds_available ON public.beds USING btree (ward_id, status) WHERE ((status)::text = 'available'::text);


--
-- Name: idx_beds_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beds_patient ON public.beds USING btree (current_patient_id) WHERE (current_patient_id IS NOT NULL);


--
-- Name: idx_beds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beds_status ON public.beds USING btree (status);


--
-- Name: idx_beds_ward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beds_ward ON public.beds USING btree (ward_id);


--
-- Name: idx_beds_ward_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beds_ward_status ON public.beds USING btree (ward_id, status);


--
-- Name: idx_billing_audit_log_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_audit_log_encounter ON public.billing_audit_log USING btree (encounter_id);


--
-- Name: idx_billing_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_audit_log_entity ON public.billing_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_billing_audit_log_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_audit_log_event_type ON public.billing_audit_log USING btree (event_type);


--
-- Name: idx_billing_audit_log_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_audit_log_patient ON public.billing_audit_log USING btree (patient_id);


--
-- Name: idx_billing_audit_log_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_audit_log_performed_at ON public.billing_audit_log USING btree (performed_at DESC);


--
-- Name: idx_billing_audit_log_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_audit_log_performed_by ON public.billing_audit_log USING btree (performed_by);


--
-- Name: idx_billing_encounter_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_encounter_status ON public.billing_orders USING btree (encounter_id, status);


--
-- Name: idx_billing_items_nhis_covered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_items_nhis_covered ON public.billing_items USING btree (nhis_covered);


--
-- Name: idx_billing_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_items_order ON public.billing_items USING btree (billing_order_id);


--
-- Name: idx_billing_items_order_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_items_order_type ON public.billing_items USING btree (billing_order_id, item_type);


--
-- Name: idx_billing_items_service_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_items_service_reference ON public.billing_items USING btree (service_reference_id);


--
-- Name: idx_billing_nhis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_nhis ON public.billing_orders USING btree (nhis_covered, created_at DESC) WHERE (nhis_covered = true);


--
-- Name: idx_billing_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_order_number ON public.billing_orders USING btree (order_number);


--
-- Name: idx_billing_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_orders_created_at ON public.billing_orders USING btree (created_at DESC);


--
-- Name: idx_billing_orders_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_orders_encounter ON public.billing_orders USING btree (encounter_id);


--
-- Name: idx_billing_orders_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_billing_orders_idempotency_key ON public.billing_orders USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_billing_orders_nhis_covered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_orders_nhis_covered ON public.billing_orders USING btree (nhis_covered);


--
-- Name: idx_billing_orders_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_orders_patient_id ON public.billing_orders USING btree (patient_id);


--
-- Name: idx_billing_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_orders_status ON public.billing_orders USING btree (status);


--
-- Name: idx_billing_orders_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_orders_visit ON public.billing_orders USING btree (visit_id);


--
-- Name: idx_billing_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_patient_date ON public.billing_orders USING btree (patient_id, created_at DESC);


--
-- Name: idx_billing_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_pending ON public.billing_orders USING btree (created_at DESC) WHERE (status = 'Pending'::public.billing_order_status);


--
-- Name: idx_care_team_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_care_team_encounter ON public.encounter_care_team USING btree (encounter_id) WHERE (is_active = true);


--
-- Name: idx_care_team_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_care_team_expires ON public.encounter_care_team USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (is_active = true));


--
-- Name: idx_care_team_expiry_check; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_care_team_expiry_check ON public.encounter_care_team USING btree (expires_at, is_active) WHERE ((expires_at IS NOT NULL) AND (is_active = true));


--
-- Name: idx_care_team_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_care_team_lookup ON public.encounter_care_team USING btree (encounter_id, staff_id, is_active) WHERE (is_active = true);


--
-- Name: idx_care_team_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_care_team_role ON public.encounter_care_team USING btree (role);


--
-- Name: idx_care_team_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_care_team_staff ON public.encounter_care_team USING btree (staff_id) WHERE (is_active = true);


--
-- Name: idx_clinical_request_history_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_request_history_request ON public.clinical_request_status_history USING btree (request_id);


--
-- Name: idx_clinical_requests_appointment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_appointment_date ON public.clinical_requests USING btree (appointment_date) WHERE ((request_type = 'Referral'::public.clinical_request_type) AND (appointment_date IS NOT NULL));


--
-- Name: idx_clinical_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_created_at ON public.clinical_requests USING btree (created_at);


--
-- Name: idx_clinical_requests_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_date ON public.clinical_requests USING btree (created_at);


--
-- Name: idx_clinical_requests_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_encounter ON public.clinical_requests USING btree (encounter_id);


--
-- Name: idx_clinical_requests_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_patient ON public.clinical_requests USING btree (patient_id);


--
-- Name: idx_clinical_requests_referral_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_referral_workflow ON public.clinical_requests USING btree (referral_workflow_status) WHERE (request_type = 'Referral'::public.clinical_request_type);


--
-- Name: idx_clinical_requests_requesting_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_requesting_doctor ON public.clinical_requests USING btree (requesting_doctor_id);


--
-- Name: idx_clinical_requests_sla_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_sla_deadline ON public.clinical_requests USING btree (sla_deadline) WHERE (status = ANY (ARRAY['Pending'::public.clinical_request_status, 'Under_Review'::public.clinical_request_status]));


--
-- Name: idx_clinical_requests_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_specialty ON public.clinical_requests USING btree (specialty_module) WHERE (specialty_module IS NOT NULL);


--
-- Name: idx_clinical_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_status ON public.clinical_requests USING btree (status);


--
-- Name: idx_clinical_requests_target_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_target_dept ON public.clinical_requests USING btree (target_department_id);


--
-- Name: idx_clinical_requests_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_type ON public.clinical_requests USING btree (request_type);


--
-- Name: idx_clinical_requests_urgency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinical_requests_urgency ON public.clinical_requests USING btree (urgency);


--
-- Name: idx_clinics_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinics_code ON public.clinics USING btree (clinic_code);


--
-- Name: idx_complaint_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_complaint_active ON public.chief_complaint_catalogue USING btree (is_active);


--
-- Name: idx_complaint_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_complaint_category ON public.chief_complaint_catalogue USING btree (category);


--
-- Name: idx_consultations_doctor_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_doctor_date ON public.consultations USING btree (doctor_id, created_at DESC) WHERE (doctor_id IS NOT NULL);


--
-- Name: idx_consultations_doctor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_doctor_id ON public.consultations USING btree (doctor_id);


--
-- Name: idx_consultations_doctor_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_doctor_uuid ON public.consultations USING btree (doctor_uuid);


--
-- Name: idx_consultations_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_encounter ON public.consultations USING btree (encounter_id);


--
-- Name: idx_consultations_encounter_timeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_encounter_timeline ON public.consultations USING btree (encounter_id, created_at DESC);


--
-- Name: idx_consultations_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_consultations_idempotency_key ON public.consultations USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_consultations_nurse_followup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_nurse_followup ON public.consultations USING btree (requires_nurse_followup) WHERE (requires_nurse_followup = true);


--
-- Name: idx_consultations_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_patient_date ON public.consultations USING btree (patient_id, created_at DESC);


--
-- Name: idx_consultations_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_patient_id ON public.consultations USING btree (patient_id);


--
-- Name: idx_consultations_patient_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_patient_uuid ON public.consultations USING btree (patient_uuid);


--
-- Name: idx_consumables_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumables_item ON public.procedure_consumables USING btree (item_id);


--
-- Name: idx_consumables_procedure; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumables_procedure ON public.procedure_consumables USING btree (procedure_id);


--
-- Name: idx_courses_course_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_course_number ON public.courses USING btree (course_number);


--
-- Name: idx_courses_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_facility ON public.courses USING btree (facility_id);


--
-- Name: idx_courses_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_is_active ON public.courses USING btree (is_active);


--
-- Name: idx_critical_notifications_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_critical_notifications_patient ON public.lab_critical_notifications USING btree (patient_id);


--
-- Name: idx_critical_notifications_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_critical_notifications_result ON public.lab_critical_notifications USING btree (lab_result_id);


--
-- Name: idx_critical_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_critical_notifications_status ON public.lab_critical_notifications USING btree (notification_status);


--
-- Name: idx_daily_progress_notes_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_progress_notes_encounter ON public.daily_progress_notes USING btree (encounter_id);


--
-- Name: idx_daily_progress_notes_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_progress_notes_encounter_id ON public.daily_progress_notes USING btree (encounter_id);


--
-- Name: idx_daily_progress_notes_note_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_progress_notes_note_date ON public.daily_progress_notes USING btree (note_date DESC);


--
-- Name: idx_daily_progress_notes_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_progress_notes_patient_id ON public.daily_progress_notes USING btree (patient_id);


--
-- Name: idx_dental_chart_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_chart_exam ON public.dental_chart USING btree (exam_id);


--
-- Name: idx_dental_chart_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_chart_patient ON public.dental_chart USING btree (patient_id);


--
-- Name: idx_dental_chart_tooth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_chart_tooth ON public.dental_chart USING btree (tooth_number);


--
-- Name: idx_dental_exams_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_exams_created_at ON public.dental_exams USING btree (created_at);


--
-- Name: idx_dental_exams_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_exams_encounter ON public.dental_exams USING btree (encounter_id);


--
-- Name: idx_dental_exams_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_exams_facility ON public.dental_exams USING btree (facility_id);


--
-- Name: idx_dental_exams_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_exams_patient ON public.dental_exams USING btree (patient_id);


--
-- Name: idx_dental_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_exams_status ON public.dental_exams USING btree (status);


--
-- Name: idx_dental_prescriptions_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_prescriptions_encounter ON public.dental_prescriptions USING btree (encounter_id);


--
-- Name: idx_dental_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_prescriptions_patient ON public.dental_prescriptions USING btree (patient_id);


--
-- Name: idx_dental_procedures_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_procedures_date ON public.dental_procedures USING btree (procedure_date);


--
-- Name: idx_dental_procedures_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_procedures_encounter ON public.dental_procedures USING btree (encounter_id);


--
-- Name: idx_dental_procedures_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_procedures_patient ON public.dental_procedures USING btree (patient_id);


--
-- Name: idx_dental_procedures_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_procedures_status ON public.dental_procedures USING btree (status);


--
-- Name: idx_departments_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_code ON public.departments USING btree (code);


--
-- Name: idx_dispense_records_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispense_records_batch ON public.dispense_records USING btree (batch_id);


--
-- Name: idx_dispense_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispense_records_date ON public.dispense_records USING btree (dispensed_at);


--
-- Name: idx_dispense_records_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispense_records_encounter ON public.dispense_records USING btree (encounter_id);


--
-- Name: idx_dispense_records_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispense_records_patient ON public.dispense_records USING btree (patient_id);


--
-- Name: idx_dispense_records_prescription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dispense_records_prescription ON public.dispense_records USING btree (prescription_id);


--
-- Name: idx_doctor_orders_assigned_nurse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_assigned_nurse ON public.doctor_orders USING btree (assigned_nurse_id);


--
-- Name: idx_doctor_orders_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_encounter ON public.doctor_orders USING btree (encounter_id);


--
-- Name: idx_doctor_orders_nurse_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_nurse_action ON public.doctor_orders USING btree (requires_nurse_action) WHERE (requires_nurse_action = true);


--
-- Name: idx_doctor_orders_ordered_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_ordered_by ON public.doctor_orders USING btree (ordered_by);


--
-- Name: idx_doctor_orders_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_patient ON public.doctor_orders USING btree (patient_id);


--
-- Name: idx_doctor_orders_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_pending ON public.doctor_orders USING btree (status, requires_nurse_action) WHERE (((status)::text = 'pending'::text) AND (requires_nurse_action = true));


--
-- Name: idx_doctor_orders_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_priority ON public.doctor_orders USING btree (priority);


--
-- Name: idx_doctor_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_orders_status ON public.doctor_orders USING btree (status);


--
-- Name: idx_drug_batches_drug_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_batches_drug_id ON public.drug_batches USING btree (drug_id);


--
-- Name: idx_drug_batches_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_batches_expiry ON public.drug_batches USING btree (expiry_date);


--
-- Name: idx_drug_batches_remaining; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_batches_remaining ON public.drug_batches USING btree (quantity_remaining) WHERE (quantity_remaining > 0);


--
-- Name: idx_drug_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_batches_status ON public.drug_batches USING btree (status);


--
-- Name: idx_drug_catalogue_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_catalogue_category ON public.drug_catalogue USING btree (category);


--
-- Name: idx_drug_catalogue_drug_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_catalogue_drug_type ON public.drug_catalogue USING btree (drug_type);


--
-- Name: idx_drug_catalogue_is_controlled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_catalogue_is_controlled ON public.drug_catalogue USING btree (is_controlled) WHERE (is_controlled = true);


--
-- Name: idx_drug_catalogue_nhis_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_catalogue_nhis_code ON public.drug_catalogue USING btree (nhis_code);


--
-- Name: idx_drug_nhis_covered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drug_nhis_covered ON public.drug_catalogue USING btree (is_nhis_covered) WHERE (is_nhis_covered = true);


--
-- Name: idx_drugs_active_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drugs_active_category ON public.drug_catalogue USING btree (category) WHERE (is_active = true);


--
-- Name: idx_drugs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drugs_code ON public.drug_catalogue USING btree (code);


--
-- Name: idx_drugs_name_gin; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_external_referrals_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_referrals_direction ON public.external_referrals USING btree (direction);


--
-- Name: idx_external_referrals_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_referrals_patient ON public.external_referrals USING btree (patient_id);


--
-- Name: idx_external_referrals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_referrals_status ON public.external_referrals USING btree (status);


--
-- Name: idx_eye_exams_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_exams_created_at ON public.eye_exams USING btree (created_at);


--
-- Name: idx_eye_exams_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_exams_encounter ON public.eye_exams USING btree (encounter_id);


--
-- Name: idx_eye_exams_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_exams_facility ON public.eye_exams USING btree (facility_id);


--
-- Name: idx_eye_exams_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_exams_patient ON public.eye_exams USING btree (patient_id);


--
-- Name: idx_eye_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_exams_status ON public.eye_exams USING btree (status);


--
-- Name: idx_eye_prescriptions_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_prescriptions_encounter ON public.eye_prescriptions USING btree (encounter_id);


--
-- Name: idx_eye_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_prescriptions_patient ON public.eye_prescriptions USING btree (patient_id);


--
-- Name: idx_eye_prescriptions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_prescriptions_type ON public.eye_prescriptions USING btree (prescription_type);


--
-- Name: idx_eye_procedures_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_procedures_encounter ON public.eye_procedures USING btree (encounter_id);


--
-- Name: idx_eye_procedures_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_procedures_patient ON public.eye_procedures USING btree (patient_id);


--
-- Name: idx_eye_procedures_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eye_procedures_type ON public.eye_procedures USING btree (procedure_type);


--
-- Name: idx_facilities_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facilities_active ON public.facilities USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_facilities_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facilities_code ON public.facilities USING btree (code);


--
-- Name: idx_handovers_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handovers_encounter ON public.shift_handovers USING btree (encounter_id);


--
-- Name: idx_handovers_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handovers_patient ON public.shift_handovers USING btree (patient_id);


--
-- Name: idx_icd10_codes_code_btree; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icd10_codes_code_btree ON public.icd10_codes USING btree (code);


--
-- Name: idx_icd10_codes_description_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_icd10_codes_description_gin ON public.icd10_codes USING gin (to_tsvector('english'::regconfig, description));


--
-- Name: idx_idem_hash_mismatch_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idem_hash_mismatch_key ON public.idempotency_hash_mismatches USING btree (idempotency_key);


--
-- Name: idx_idem_hash_mismatch_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idem_hash_mismatch_time ON public.idempotency_hash_mismatches USING btree (attempted_at);


--
-- Name: idx_imaging_catalogue_body_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imaging_catalogue_body_part ON public.imaging_catalogue USING btree (body_part);


--
-- Name: idx_imaging_catalogue_modality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imaging_catalogue_modality ON public.imaging_catalogue USING btree (modality);


--
-- Name: idx_imaging_catalogue_nhis_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imaging_catalogue_nhis_code ON public.imaging_catalogue USING btree (nhis_code);


--
-- Name: idx_imaging_nhis_covered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_imaging_nhis_covered ON public.imaging_catalogue USING btree (is_nhis_covered) WHERE (is_nhis_covered = true);


--
-- Name: idx_invoices_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_encounter ON public.invoices USING btree (encounter_id);


--
-- Name: idx_lab_req_billing_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_req_billing_release ON public.lab_requests USING btree (billing_release_status);


--
-- Name: idx_lab_req_nhis_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_req_nhis_status ON public.lab_requests USING btree (nhis_approval_status) WHERE (nhis_approval_status <> 'not_required'::public.nhis_approval_status);


--
-- Name: idx_lab_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_created_at ON public.lab_requests USING btree (created_at DESC);


--
-- Name: idx_lab_requests_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_critical ON public.lab_requests USING btree (created_at DESC) WHERE (is_critical = true);


--
-- Name: idx_lab_requests_diagnosis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_diagnosis ON public.lab_requests USING gin (diagnosis);


--
-- Name: idx_lab_requests_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_encounter ON public.lab_requests USING btree (encounter_id);


--
-- Name: idx_lab_requests_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_encounter_id ON public.lab_requests USING btree (encounter_id);


--
-- Name: idx_lab_requests_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_lab_requests_idempotency_key ON public.lab_requests USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_lab_requests_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_patient ON public.lab_requests USING btree (patient_id, created_at DESC);


--
-- Name: idx_lab_requests_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_patient_id ON public.lab_requests USING btree (patient_id);


--
-- Name: idx_lab_requests_patient_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_patient_status ON public.lab_requests USING btree (patient_id, status, created_at DESC);


--
-- Name: idx_lab_requests_patient_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_patient_uuid ON public.lab_requests USING btree (patient_uuid);


--
-- Name: idx_lab_requests_pending_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_pending_queue ON public.lab_requests USING btree (status, priority, created_at) WHERE (status = ANY (ARRAY['Pending'::public.request_status, 'Accepted'::public.request_status, 'Sample_Collected'::public.request_status, 'Processing'::public.request_status]));


--
-- Name: idx_lab_requests_processed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_processed_by ON public.lab_requests USING btree (processed_by);


--
-- Name: idx_lab_requests_result_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_result_date ON public.lab_requests USING btree (result_date);


--
-- Name: idx_lab_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_status ON public.lab_requests USING btree (status);


--
-- Name: idx_lab_requests_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_visit_id ON public.lab_requests USING btree (visit_id);


--
-- Name: idx_lab_requests_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_requests_workflow ON public.lab_requests USING btree (status, priority, created_at DESC) WHERE (status = ANY (ARRAY['Pending'::public.request_status, 'Accepted'::public.request_status, 'Sample_Collected'::public.request_status, 'Processing'::public.request_status]));


--
-- Name: idx_lab_result_history_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_result_history_result ON public.lab_result_history USING btree (lab_result_id);


--
-- Name: idx_lab_result_history_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_result_history_version ON public.lab_result_history USING btree (lab_result_id, version);


--
-- Name: idx_lab_results_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_critical ON public.lab_results USING btree (is_critical) WHERE (is_critical = true);


--
-- Name: idx_lab_results_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_patient_id ON public.lab_results USING btree (patient_id);


--
-- Name: idx_lab_results_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_request_id ON public.lab_results USING btree (request_id);


--
-- Name: idx_lab_results_template_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_template_type ON public.lab_results USING btree (result_template_type);


--
-- Name: idx_lab_results_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_test_id ON public.lab_results USING btree (test_id);


--
-- Name: idx_lab_results_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_workflow ON public.lab_results USING btree (workflow_status, created_at DESC);


--
-- Name: idx_lab_results_workflow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_workflow_status ON public.lab_results USING btree (workflow_status);


--
-- Name: idx_lab_test_catalogue_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_catalogue_active ON public.lab_test_catalogue USING btree (category) WHERE (is_active = true);


--
-- Name: idx_lab_test_catalogue_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_catalogue_category ON public.lab_test_catalogue USING btree (category);


--
-- Name: idx_lab_test_catalogue_nhis_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_catalogue_nhis_code ON public.lab_test_catalogue USING btree (nhis_code);


--
-- Name: idx_lab_test_category_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_category_code ON public.lab_test_catalogue USING btree (category_code);


--
-- Name: idx_lab_test_nhis_covered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_nhis_covered ON public.lab_test_catalogue USING btree (is_nhis_covered) WHERE (is_nhis_covered = true);


--
-- Name: idx_lab_test_template_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_template_type ON public.lab_test_catalogue USING btree (result_template_type);


--
-- Name: idx_med_admin_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_med_admin_encounter ON public.medication_administration USING btree (encounter_id);


--
-- Name: idx_nhis_approvals_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_approvals_encounter ON public.nhis_approvals USING btree (encounter_id);


--
-- Name: idx_nhis_approvals_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_approvals_patient ON public.nhis_approvals USING btree (patient_id);


--
-- Name: idx_nhis_approvals_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_approvals_pending ON public.nhis_approvals USING btree (status) WHERE (status = 'pending'::public.nhis_approval_status);


--
-- Name: idx_nhis_approvals_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_approvals_service ON public.nhis_approvals USING btree (service_request_id, service_type);


--
-- Name: idx_nhis_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_approvals_status ON public.nhis_approvals USING btree (status);


--
-- Name: idx_nhis_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_audit_action ON public.nhis_audit_log USING btree (action_type);


--
-- Name: idx_nhis_audit_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_audit_date ON public.nhis_audit_log USING btree (performed_at);


--
-- Name: idx_nhis_audit_emergency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_audit_emergency ON public.nhis_audit_log USING btree (is_emergency_action) WHERE (is_emergency_action = true);


--
-- Name: idx_nhis_audit_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_audit_encounter ON public.nhis_audit_log USING btree (encounter_id);


--
-- Name: idx_nhis_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_audit_entity ON public.nhis_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_nhis_audit_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_audit_patient ON public.nhis_audit_log USING btree (patient_id);


--
-- Name: idx_nhis_auth_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_auth_active ON public.nhis_authorizations USING btree (patient_id, status) WHERE (status = 'active'::public.nhis_auth_status);


--
-- Name: idx_nhis_auth_code_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_auth_code_provider ON public.nhis_authorizations USING btree (auth_code);


--
-- Name: idx_nhis_auth_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_auth_patient ON public.nhis_authorizations USING btree (patient_id);


--
-- Name: idx_nhis_auth_status_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_auth_status_expiry ON public.nhis_authorizations USING btree (patient_id, status, expiry_date DESC);


--
-- Name: idx_nhis_claims_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_batch ON public.nhis_claims USING btree (export_batch_id);


--
-- Name: idx_nhis_claims_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_date ON public.nhis_claims USING btree (created_at);


--
-- Name: idx_nhis_claims_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_encounter ON public.nhis_claims USING btree (encounter_id);


--
-- Name: idx_nhis_claims_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_patient ON public.nhis_claims USING btree (patient_id);


--
-- Name: idx_nhis_claims_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_pending ON public.nhis_claims USING btree (status) WHERE (status = ANY (ARRAY['draft'::public.nhis_claim_status, 'pending'::public.nhis_claim_status, 'reviewed'::public.nhis_claim_status]));


--
-- Name: idx_nhis_claims_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_provider ON public.nhis_claims USING btree (provider_name);


--
-- Name: idx_nhis_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_claims_status ON public.nhis_claims USING btree (status);


--
-- Name: idx_nhis_config_payment_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_config_payment_category ON public.nhis_config USING btree (payment_category);


--
-- Name: idx_nhis_export_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_export_period ON public.nhis_export_batches USING btree (period_start, period_end);


--
-- Name: idx_nhis_export_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_export_provider ON public.nhis_export_batches USING btree (provider_name);


--
-- Name: idx_nhis_export_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_export_status ON public.nhis_export_batches USING btree (status);


--
-- Name: idx_nhis_hmos_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_hmos_name ON public.nhis_hmos USING btree (name);


--
-- Name: idx_nhis_medicines_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_medicines_code ON public.nhis_medicines USING btree (code);


--
-- Name: idx_nhis_medicines_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_medicines_name ON public.nhis_medicines USING btree (name);


--
-- Name: idx_nhis_policy_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_policy_config_active ON public.nhis_policy_config USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_nhis_policy_config_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_policy_config_provider ON public.nhis_policy_config USING btree (provider_name);


--
-- Name: idx_nhis_postings_clinic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_postings_clinic ON public.nhis_postings USING btree (clinic_id);


--
-- Name: idx_nhis_postings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_postings_date ON public.nhis_postings USING btree (appointment_date);


--
-- Name: idx_nhis_postings_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_postings_doctor ON public.nhis_postings USING btree (doctor_id);


--
-- Name: idx_nhis_postings_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_postings_encounter ON public.nhis_postings USING btree (encounter_id);


--
-- Name: idx_nhis_postings_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_postings_patient ON public.nhis_postings USING btree (patient_id);


--
-- Name: idx_nhis_postings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_postings_status ON public.nhis_postings USING btree (status);


--
-- Name: idx_nhis_procedures_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_procedures_code ON public.nhis_procedures USING btree (code);


--
-- Name: idx_nhis_procedures_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_procedures_name ON public.nhis_procedures USING btree (name);


--
-- Name: idx_nhis_procedures_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_procedures_type ON public.nhis_procedures USING btree (type);


--
-- Name: idx_nhis_profiles_enrollee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_profiles_enrollee ON public.nhis_profiles USING btree (enrollee_id);


--
-- Name: idx_nhis_profiles_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_profiles_origin ON public.nhis_profiles USING btree (patient_origin);


--
-- Name: idx_nhis_profiles_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_profiles_patient ON public.nhis_profiles USING btree (patient_id);


--
-- Name: idx_nhis_profiles_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_profiles_provider ON public.nhis_profiles USING btree (provider_name);


--
-- Name: idx_nhis_profiles_scheme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_profiles_scheme ON public.nhis_profiles USING btree (scheme_type);


--
-- Name: idx_nhis_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_profiles_status ON public.nhis_profiles USING btree (status);


--
-- Name: idx_nhis_referral_queue_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_referral_queue_date ON public.nhis_referral_queue USING btree (requested_at DESC);


--
-- Name: idx_nhis_referral_queue_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_referral_queue_patient ON public.nhis_referral_queue USING btree (patient_id);


--
-- Name: idx_nhis_referral_queue_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_referral_queue_pending ON public.nhis_referral_queue USING btree (status, requested_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_nhis_referral_queue_referral_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_referral_queue_referral_date ON public.nhis_referral_queue USING btree (referral_date);


--
-- Name: idx_nhis_referral_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_referral_queue_status ON public.nhis_referral_queue USING btree (status);


--
-- Name: idx_nhis_tariff_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_tariff_active ON public.nhis_tariff_rules USING btree (is_active, effective_from, effective_to);


--
-- Name: idx_nhis_tariff_group_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_tariff_group_service ON public.nhis_tariff_rules USING btree (tariff_group, service_type);


--
-- Name: idx_nhis_tariff_service_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_tariff_service_code ON public.nhis_tariff_rules USING btree (service_code);


--
-- Name: idx_nhis_tariff_service_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nhis_tariff_service_id ON public.nhis_tariff_rules USING btree (service_id);


--
-- Name: idx_notification_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_prefs_user ON public.notification_preferences USING btree (user_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_encounter ON public.notifications USING btree (encounter_id);


--
-- Name: idx_notifications_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_patient ON public.notifications USING btree (patient_id);


--
-- Name: idx_notifications_target_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_target_role ON public.notifications USING btree (target_role) WHERE (is_dismissed = false);


--
-- Name: idx_notifications_target_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_target_user ON public.notifications USING btree (target_user_id) WHERE (is_dismissed = false);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (target_user_id, is_read) WHERE (is_dismissed = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_nursing_audit_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_audit_encounter ON public.nursing_audit_log USING btree (encounter_id);


--
-- Name: idx_nursing_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_audit_user ON public.nursing_audit_log USING btree (user_id);


--
-- Name: idx_nursing_interventions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_category ON public.nursing_interventions USING btree (category_code);


--
-- Name: idx_nursing_interventions_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_code ON public.nursing_interventions USING btree (intervention_code);


--
-- Name: idx_nursing_interventions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_created_at ON public.nursing_interventions USING btree (created_at DESC);


--
-- Name: idx_nursing_interventions_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_encounter ON public.nursing_interventions USING btree (encounter_id);


--
-- Name: idx_nursing_interventions_nurse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_nurse ON public.nursing_interventions USING btree (nurse_id);


--
-- Name: idx_nursing_interventions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_patient ON public.nursing_interventions USING btree (patient_id);


--
-- Name: idx_nursing_interventions_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_performed_at ON public.nursing_interventions USING btree (performed_at DESC);


--
-- Name: idx_nursing_interventions_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_shift ON public.nursing_interventions USING btree (shift);


--
-- Name: idx_nursing_interventions_shift_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_shift_category ON public.nursing_interventions USING btree (shift, category_code);


--
-- Name: idx_nursing_interventions_ward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_ward ON public.nursing_interventions USING btree (ward_id);


--
-- Name: idx_nursing_interventions_ward_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_interventions_ward_category ON public.nursing_interventions USING btree (ward_id, category_code);


--
-- Name: idx_nursing_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_created_at ON public.nursing_notes USING btree (created_at DESC);


--
-- Name: idx_nursing_notes_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_critical ON public.nursing_notes USING btree (is_critical) WHERE (is_critical = true);


--
-- Name: idx_nursing_notes_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_encounter ON public.nursing_notes USING btree (encounter_id);


--
-- Name: idx_nursing_notes_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_encounter_id ON public.nursing_notes USING btree (encounter_id);


--
-- Name: idx_nursing_notes_encounter_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_encounter_time ON public.nursing_notes USING btree (encounter_id, created_at DESC);


--
-- Name: idx_nursing_notes_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_nursing_notes_idempotency_key ON public.nursing_notes USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_nursing_notes_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_patient ON public.nursing_notes USING btree (patient_id);


--
-- Name: idx_nursing_notes_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_patient_date ON public.nursing_notes USING btree (patient_id, created_at DESC);


--
-- Name: idx_nursing_notes_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_patient_id ON public.nursing_notes USING btree (patient_id);


--
-- Name: idx_nursing_notes_recorded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_recorded_by ON public.nursing_notes USING btree (recorded_by);


--
-- Name: idx_nursing_notes_requires_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_requires_review ON public.nursing_notes USING btree (requires_doctor_review) WHERE (requires_doctor_review = true);


--
-- Name: idx_nursing_notes_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_review ON public.nursing_notes USING btree (created_at DESC) WHERE ((requires_doctor_review = true) AND (doctor_reviewed_at IS NULL));


--
-- Name: idx_nursing_notes_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_shift ON public.nursing_notes USING btree (shift, shift_date);


--
-- Name: idx_nursing_notes_treatment_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nursing_notes_treatment_plan ON public.nursing_notes USING btree (treatment_plan_id);


--
-- Name: idx_on_call_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_call_active ON public.on_call_schedule USING btree (department, start_time, end_time) WHERE (is_active = true);


--
-- Name: idx_on_call_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_on_call_staff ON public.on_call_schedule USING btree (staff_id) WHERE (is_active = true);


--
-- Name: idx_patients_contact_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_contact_phone ON public.patients USING btree (contact_phone);


--
-- Name: idx_patients_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_course ON public.patients USING btree (course) WHERE (course IS NOT NULL);


--
-- Name: idx_patients_emr_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_emr_number ON public.patients USING btree (emr_number);


--
-- Name: idx_patients_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_first_name ON public.patients USING btree (first_name);


--
-- Name: idx_patients_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_patients_idempotency_key ON public.patients USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_patients_name_gin; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_patients_nhis_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_nhis_number ON public.patients USING btree (nhis_number) WHERE (nhis_number IS NOT NULL);


--
-- Name: idx_patients_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_patient_id ON public.patients USING btree (patient_id);


--
-- Name: idx_patients_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_search ON public.patients USING btree (surname, first_name, patient_id, emr_number, contact_phone);


--
-- Name: idx_patients_surname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_surname ON public.patients USING btree (surname);


--
-- Name: idx_pcc_consultation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcc_consultation ON public.patient_chief_complaints USING btree (consultation_id);


--
-- Name: idx_pcc_emr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcc_emr ON public.patient_chief_complaints USING btree (emr_number);


--
-- Name: idx_pcc_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcc_encounter ON public.patient_chief_complaints USING btree (encounter_id);


--
-- Name: idx_pcc_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcc_patient ON public.patient_chief_complaints USING btree (patient_id);


--
-- Name: idx_pcc_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcc_primary ON public.patient_chief_complaints USING btree (encounter_id, is_primary) WHERE (is_primary = true);


--
-- Name: idx_physio_assessments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_assessments_created_at ON public.physio_assessments USING btree (created_at);


--
-- Name: idx_physio_assessments_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_assessments_encounter ON public.physio_assessments USING btree (encounter_id);


--
-- Name: idx_physio_assessments_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_assessments_facility ON public.physio_assessments USING btree (facility_id);


--
-- Name: idx_physio_assessments_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_assessments_patient ON public.physio_assessments USING btree (patient_id);


--
-- Name: idx_physio_assessments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_assessments_status ON public.physio_assessments USING btree (status);


--
-- Name: idx_physio_discharge_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_discharge_date ON public.physio_discharge USING btree (discharge_date);


--
-- Name: idx_physio_discharge_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_discharge_patient ON public.physio_discharge USING btree (patient_id);


--
-- Name: idx_physio_plans_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_plans_assessment ON public.physio_plans USING btree (assessment_id);


--
-- Name: idx_physio_plans_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_plans_patient ON public.physio_plans USING btree (patient_id);


--
-- Name: idx_physio_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_plans_status ON public.physio_plans USING btree (status);


--
-- Name: idx_physio_progress_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_progress_assessment ON public.physio_progress USING btree (assessment_id);


--
-- Name: idx_physio_progress_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_progress_date ON public.physio_progress USING btree (evaluation_date);


--
-- Name: idx_physio_progress_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_progress_patient ON public.physio_progress USING btree (patient_id);


--
-- Name: idx_physio_sessions_attendance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_sessions_attendance ON public.physio_sessions USING btree (attendance_status);


--
-- Name: idx_physio_sessions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_sessions_date ON public.physio_sessions USING btree (session_date);


--
-- Name: idx_physio_sessions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_sessions_patient ON public.physio_sessions USING btree (patient_id);


--
-- Name: idx_physio_sessions_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_physio_sessions_plan ON public.physio_sessions USING btree (plan_id);


--
-- Name: idx_prescriptions_billing_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_billing_release ON public.prescriptions USING btree (billing_release_status);


--
-- Name: idx_prescriptions_diagnosis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_diagnosis ON public.prescriptions USING gin (diagnosis);


--
-- Name: idx_prescriptions_dispensed_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_dispensed_date ON public.prescriptions USING btree (dispensed_date) WHERE (dispensed_date IS NOT NULL);


--
-- Name: idx_prescriptions_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_encounter ON public.prescriptions USING btree (encounter_id);


--
-- Name: idx_prescriptions_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_encounter_id ON public.prescriptions USING btree (encounter_id);


--
-- Name: idx_prescriptions_encounter_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_encounter_status ON public.prescriptions USING btree (encounter_id, status);


--
-- Name: idx_prescriptions_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_prescriptions_idempotency_key ON public.prescriptions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_prescriptions_nhis_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_nhis_status ON public.prescriptions USING btree (nhis_approval_status) WHERE (nhis_approval_status <> 'not_required'::public.nhis_approval_status);


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id, created_at DESC);


--
-- Name: idx_prescriptions_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions USING btree (patient_id);


--
-- Name: idx_prescriptions_patient_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient_status ON public.prescriptions USING btree (patient_id, status, created_at DESC);


--
-- Name: idx_prescriptions_patient_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient_uuid ON public.prescriptions USING btree (patient_uuid);


--
-- Name: idx_prescriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_status ON public.prescriptions USING btree (status);


--
-- Name: idx_prescriptions_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_visit_id ON public.prescriptions USING btree (visit_id);


--
-- Name: idx_prescriptions_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_workflow ON public.prescriptions USING btree (status, created_at DESC) WHERE (status = ANY (ARRAY['Pending'::public.request_status, 'Accepted'::public.request_status, 'Processing'::public.request_status]));


--
-- Name: idx_proc_catalogue_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proc_catalogue_active ON public.procedure_catalogue USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_proc_catalogue_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proc_catalogue_category ON public.procedure_catalogue USING btree (category);


--
-- Name: idx_proc_catalogue_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proc_catalogue_code ON public.procedure_catalogue USING btree (code);


--
-- Name: idx_proc_catalogue_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proc_catalogue_facility ON public.procedure_catalogue USING btree (facility_id);


--
-- Name: idx_procedure_catalogue_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedure_catalogue_category ON public.procedure_catalogue USING btree (category);


--
-- Name: idx_procedure_catalogue_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedure_catalogue_code ON public.procedure_catalogue USING btree (code);


--
-- Name: idx_procedure_catalogue_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedure_catalogue_name ON public.procedure_catalogue USING btree (name);


--
-- Name: idx_procedure_requests_consultation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedure_requests_consultation_id ON public.procedure_requests USING btree (consultation_id);


--
-- Name: idx_procedure_requests_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedure_requests_encounter_id ON public.procedure_requests USING btree (encounter_id);


--
-- Name: idx_procedures_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_admission ON public.procedures USING btree (admission_id);


--
-- Name: idx_procedures_catalogue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_catalogue ON public.procedures USING btree (catalogue_id);


--
-- Name: idx_procedures_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_encounter ON public.procedures USING btree (encounter_id);


--
-- Name: idx_procedures_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_facility ON public.procedures USING btree (facility_id);


--
-- Name: idx_procedures_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_procedures_idempotency_key ON public.procedures USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_procedures_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_number ON public.procedures USING btree (procedure_number);


--
-- Name: idx_procedures_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_patient ON public.procedures USING btree (patient_id);


--
-- Name: idx_procedures_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_pending ON public.procedures USING btree (status, scheduled_date) WHERE ((status)::text = ANY (ARRAY[('scheduled'::character varying)::text, ('pre_op'::character varying)::text]));


--
-- Name: idx_procedures_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_scheduled ON public.procedures USING btree (scheduled_date);


--
-- Name: idx_procedures_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_status ON public.procedures USING btree (status);


--
-- Name: idx_procedures_surgeon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedures_surgeon ON public.procedures USING btree (primary_surgeon_id);


--
-- Name: idx_progress_notes_alert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_notes_alert ON public.daily_progress_notes USING btree (alert_level) WHERE ((alert_level)::text <> 'normal'::text);


--
-- Name: idx_progress_notes_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_progress_notes_date ON public.daily_progress_notes USING btree (note_date DESC);


--
-- Name: idx_queue_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_active ON public.queue USING btree (clinic_id, location, status, priority DESC, created_at) WHERE (status = ANY (ARRAY['Waiting'::public.queue_status, 'In Progress'::public.queue_status, 'Called'::public.queue_status, 'Ready_For_Consultation'::public.queue_status]));


--
-- Name: idx_queue_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_completed ON public.queue USING btree (clinic_id, completed_at DESC) WHERE (status = 'Completed'::public.queue_status);


--
-- Name: idx_queue_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_created_at ON public.queue USING btree (created_at DESC);


--
-- Name: idx_queue_daily_counters_dept_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_daily_counters_dept_date ON public.queue_daily_counters USING btree (department, counter_date);


--
-- Name: idx_queue_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_department_id ON public.queue USING btree (department_id);


--
-- Name: idx_queue_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_encounter ON public.queue USING btree (encounter_id);


--
-- Name: idx_queue_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_encounter_id ON public.queue USING btree (encounter_id);


--
-- Name: idx_queue_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_queue_idempotency_key ON public.queue USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_queue_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_location ON public.queue USING btree (location);


--
-- Name: idx_queue_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_patient_id ON public.queue USING btree (patient_id);


--
-- Name: idx_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_status ON public.queue USING btree (status);


--
-- Name: idx_queue_status_loc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_status_loc ON public.queue USING btree (status, location);


--
-- Name: idx_queue_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_visit ON public.queue USING btree (visit_id);


--
-- Name: idx_radiology_billing_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_billing_release ON public.radiology_requests USING btree (billing_release_status);


--
-- Name: idx_radiology_nhis_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_nhis_status ON public.radiology_requests USING btree (nhis_approval_status) WHERE (nhis_approval_status <> 'not_required'::public.nhis_approval_status);


--
-- Name: idx_radiology_requests_diagnosis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_diagnosis ON public.radiology_requests USING gin (diagnosis);


--
-- Name: idx_radiology_requests_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_encounter ON public.radiology_requests USING btree (encounter_id);


--
-- Name: idx_radiology_requests_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_encounter_id ON public.radiology_requests USING btree (encounter_id);


--
-- Name: idx_radiology_requests_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_radiology_requests_idempotency_key ON public.radiology_requests USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_radiology_requests_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_patient ON public.radiology_requests USING btree (patient_id, created_at DESC);


--
-- Name: idx_radiology_requests_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_patient_id ON public.radiology_requests USING btree (patient_id);


--
-- Name: idx_radiology_requests_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_pending ON public.radiology_requests USING btree (status, priority, created_at) WHERE (status = ANY (ARRAY['Pending'::public.request_status, 'Accepted'::public.request_status, 'Processing'::public.request_status]));


--
-- Name: idx_radiology_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_status ON public.radiology_requests USING btree (status);


--
-- Name: idx_radiology_requests_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_visit_id ON public.radiology_requests USING btree (visit_id);


--
-- Name: idx_radiology_requests_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_radiology_requests_workflow ON public.radiology_requests USING btree (status, priority, created_at DESC) WHERE (status = ANY (ARRAY['Pending'::public.request_status, 'Accepted'::public.request_status, 'Scheduled'::public.request_status]));


--
-- Name: idx_receipts_billing_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_billing_order ON public.receipts USING btree (billing_order_id);


--
-- Name: idx_receipts_billing_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_billing_order_id ON public.receipts USING btree (billing_order_id);


--
-- Name: idx_receipts_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_encounter_id ON public.receipts USING btree (encounter_id);


--
-- Name: idx_receipts_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_receipts_idempotency_key ON public.receipts USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_receipts_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_receipts_number ON public.receipts USING btree (receipt_number);


--
-- Name: idx_referral_outcomes_referral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_outcomes_referral ON public.referral_outcomes USING btree (referral_id);


--
-- Name: idx_referrals_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_parent ON public.referrals USING btree (parent_referral_id) WHERE (parent_referral_id IS NOT NULL);


--
-- Name: idx_referrals_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_patient ON public.referrals USING btree (patient_id, created_at DESC);


--
-- Name: idx_referrals_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_pending ON public.referrals USING btree (target_department_id, created_at DESC) WHERE (status = 'Pending'::public.referral_module_status);


--
-- Name: idx_referrals_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_visit ON public.referrals USING btree (visit_id);


--
-- Name: idx_scan_results_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_results_encounter ON public.scan_results USING btree (encounter_id);


--
-- Name: idx_service_price_audit_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_price_audit_changed_at ON public.service_price_audit USING btree (changed_at DESC);


--
-- Name: idx_service_price_audit_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_price_audit_service ON public.service_price_audit USING btree (service_type, service_id);


--
-- Name: idx_shift_handover_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_handover_encounter ON public.shift_handover USING btree (encounter_id);


--
-- Name: idx_shift_handovers_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_handovers_date ON public.shift_handovers USING btree (shift_date);


--
-- Name: idx_shift_handovers_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_handovers_encounter ON public.shift_handovers USING btree (encounter_id);


--
-- Name: idx_shift_handovers_incoming; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_handovers_incoming ON public.shift_handovers USING btree (incoming_nurse_id);


--
-- Name: idx_shift_handovers_outgoing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_handovers_outgoing ON public.shift_handovers USING btree (outgoing_nurse_id);


--
-- Name: idx_shift_handovers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_handovers_status ON public.shift_handovers USING btree (status);


--
-- Name: idx_staff_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_department ON public.staff USING btree (department);


--
-- Name: idx_staff_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_department_id ON public.staff USING btree (department_id);


--
-- Name: idx_staff_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_email ON public.staff USING btree (email);


--
-- Name: idx_staff_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_is_active ON public.staff USING btree (is_active);


--
-- Name: idx_staff_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_last_activity ON public.staff USING btree (last_activity) WHERE (role = 'doctor'::public.user_role);


--
-- Name: idx_staff_name_gin; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_staff_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_role ON public.staff USING btree (role);


--
-- Name: idx_staff_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_role_active ON public.staff USING btree (role, department_id) WHERE (is_active = true);


--
-- Name: idx_staff_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_staff_id ON public.staff USING btree (staff_id);


--
-- Name: idx_staff_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_user_id ON public.staff USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_staff_user_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_user_role_active ON public.staff USING btree (user_id, role) WHERE (is_active = true);


--
-- Name: idx_stock_movements_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_batch ON public.inventory_stock_movements USING btree (batch_id);


--
-- Name: idx_stock_movements_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_date ON public.inventory_stock_movements USING btree (created_at);


--
-- Name: idx_stock_movements_drug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_drug ON public.inventory_stock_movements USING btree (drug_id);


--
-- Name: idx_stock_movements_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_encounter ON public.inventory_stock_movements USING btree (encounter_id);


--
-- Name: idx_stock_movements_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_item ON public.inventory_stock_movements USING btree (item_id);


--
-- Name: idx_stock_movements_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_patient ON public.inventory_stock_movements USING btree (patient_id);


--
-- Name: idx_stock_movements_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_type ON public.inventory_stock_movements USING btree (movement_type);


--
-- Name: idx_transfers_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_admission ON public.bed_transfers USING btree (admission_id);


--
-- Name: idx_transfers_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_date ON public.bed_transfers USING btree (transfer_date);


--
-- Name: idx_transfers_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_encounter ON public.encounter_transfers USING btree (encounter_id);


--
-- Name: idx_transfers_from_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_from_doctor ON public.encounter_transfers USING btree (from_doctor_id);


--
-- Name: idx_transfers_from_ward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_from_ward ON public.bed_transfers USING btree (from_ward_id);


--
-- Name: idx_transfers_to_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_to_doctor ON public.encounter_transfers USING btree (to_doctor_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_transfers_to_ward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_to_ward ON public.bed_transfers USING btree (to_ward_id);


--
-- Name: idx_treatment_plans_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_plans_encounter ON public.treatment_plans USING btree (encounter_id);


--
-- Name: idx_treatment_plans_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_plans_encounter_id ON public.treatment_plans USING btree (encounter_id);


--
-- Name: idx_treatment_plans_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_plans_patient_id ON public.treatment_plans USING btree (patient_id);


--
-- Name: idx_treatment_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_plans_status ON public.treatment_plans USING btree (status);


--
-- Name: idx_treatment_tasks_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_tasks_encounter ON public.treatment_tasks USING btree (encounter_id);


--
-- Name: idx_treatment_tasks_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_tasks_started_at ON public.treatment_tasks USING btree (started_at) WHERE (started_at IS NOT NULL);


--
-- Name: idx_treatment_tasks_status_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatment_tasks_status_plan ON public.treatment_tasks USING btree (plan_id, status);


--
-- Name: idx_version_conflict_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_version_conflict_table ON public.version_conflict_log USING btree (table_name, record_id);


--
-- Name: idx_version_conflict_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_version_conflict_time ON public.version_conflict_log USING btree (attempted_at);


--
-- Name: idx_visits_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_active ON public.visits USING btree (clinic_id, encounter_date DESC, priority) WHERE (status = ANY (ARRAY['Created'::public.visit_status, 'Active'::public.visit_status, 'Registered'::public.visit_status]));


--
-- Name: idx_visits_admission_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_admission_date ON public.visits USING btree (admission_date);


--
-- Name: idx_visits_clinic_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_clinic_status ON public.visits USING btree (clinic_id, status) WHERE (status = 'Active'::public.visit_status);


--
-- Name: idx_visits_clinic_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_clinic_status_date ON public.visits USING btree (clinic_id, status, encounter_date DESC);


--
-- Name: idx_visits_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_created_at ON public.visits USING btree (created_at DESC);


--
-- Name: idx_visits_current_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_current_stage ON public.visits USING btree (current_stage);


--
-- Name: idx_visits_doctor_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_doctor_date ON public.visits USING btree (attending_doctor_id, encounter_date DESC) WHERE (attending_doctor_id IS NOT NULL);


--
-- Name: idx_visits_doctor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_doctor_status ON public.visits USING btree (attending_doctor_id, status) WHERE (status = 'Active'::public.visit_status);


--
-- Name: idx_visits_encounter_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_encounter_category ON public.visits USING btree (encounter_category);


--
-- Name: idx_visits_encounter_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_encounter_date ON public.visits USING btree (encounter_date DESC);


--
-- Name: idx_visits_insurance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_insurance_type ON public.visits USING btree (insurance_type);


--
-- Name: idx_visits_nhis_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_nhis_status ON public.visits USING btree (nhis_verification_status) WHERE (nhis_verification_status <> 'not_applicable'::public.nhis_verification_status);


--
-- Name: idx_visits_opd_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_opd_class ON public.visits USING btree (opd_classification) WHERE (opd_classification IS NOT NULL);


--
-- Name: idx_visits_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient ON public.visits USING btree (patient_id);


--
-- Name: idx_visits_patient_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient_active ON public.visits USING btree (patient_id, status, created_at DESC) WHERE (status = 'Active'::public.visit_status);


--
-- Name: idx_visits_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient_date ON public.visits USING btree (patient_id, encounter_date DESC);


--
-- Name: idx_visits_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient_id ON public.visits USING btree (patient_id);


--
-- Name: idx_visits_patient_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient_status ON public.visits USING btree (patient_id, status);


--
-- Name: idx_visits_patient_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient_status_date ON public.visits USING btree (patient_id, status, encounter_date DESC);


--
-- Name: idx_visits_payer_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_payer_type ON public.visits USING btree (payer_type);


--
-- Name: idx_visits_referral_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_referral_encounter ON public.visits USING btree (source_referral_id) WHERE (is_referral_encounter = true);


--
-- Name: idx_visits_referring_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_referring_doctor ON public.visits USING btree (referring_doctor_id) WHERE (referring_doctor_id IS NOT NULL);


--
-- Name: idx_visits_requires_post_auth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_requires_post_auth ON public.visits USING btree (requires_post_authorization) WHERE (requires_post_authorization = true);


--
-- Name: idx_visits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_status ON public.visits USING btree (status);


--
-- Name: idx_visits_status_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_status_stage ON public.visits USING btree (status, current_stage);


--
-- Name: idx_visits_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_visit_id ON public.visits USING btree (visit_id);


--
-- Name: idx_vital_schedules_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_schedules_encounter ON public.patient_vital_schedules USING btree (encounter_id);


--
-- Name: idx_vital_schedules_next_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_schedules_next_due ON public.patient_vital_schedules USING btree (next_vitals_due) WHERE ((is_active = true) AND (paused = false));


--
-- Name: idx_vital_schedules_nurse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_schedules_nurse ON public.patient_vital_schedules USING btree (assigned_nurse_id) WHERE (is_active = true);


--
-- Name: idx_vital_schedules_overdue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_schedules_overdue ON public.patient_vital_schedules USING btree (is_overdue, is_active) WHERE ((is_overdue = true) AND (is_active = true));


--
-- Name: idx_vital_schedules_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vital_schedules_patient ON public.patient_vital_schedules USING btree (patient_id);


--
-- Name: idx_vitals_critical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_critical ON public.vitals USING btree (date_recorded DESC) WHERE (is_critical = true);


--
-- Name: idx_vitals_date_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_date_recorded ON public.vitals USING btree (date_recorded DESC);


--
-- Name: idx_vitals_encounter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_encounter ON public.vitals USING btree (encounter_id);


--
-- Name: idx_vitals_encounter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_encounter_id ON public.vitals USING btree (encounter_id);


--
-- Name: idx_vitals_encounter_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_encounter_patient ON public.vitals USING btree (encounter_id, patient_id);


--
-- Name: idx_vitals_encounter_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_encounter_time ON public.vitals USING btree (encounter_id, date_recorded DESC);


--
-- Name: idx_vitals_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vitals_idempotency_key ON public.vitals USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_vitals_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_patient_date ON public.vitals USING btree (patient_id, date_recorded DESC);


--
-- Name: idx_vitals_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_patient_id ON public.vitals USING btree (patient_id);


--
-- Name: idx_vitals_patient_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vitals_patient_uuid ON public.vitals USING btree (patient_uuid);


--
-- Name: idx_ward_round_notes_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ward_round_notes_admission ON public.ward_round_notes USING btree (admission_id);


--
-- Name: idx_ward_rounds_admission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ward_rounds_admission ON public.ward_round_notes USING btree (admission_id);


--
-- Name: idx_ward_rounds_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ward_rounds_date ON public.ward_round_notes USING btree (round_date);


--
-- Name: idx_ward_rounds_physician; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ward_rounds_physician ON public.ward_round_notes USING btree (attending_physician_id);


--
-- Name: idx_wards_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wards_active ON public.wards USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_wards_facility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wards_facility ON public.wards USING btree (facility_id);


--
-- Name: idx_wards_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wards_type ON public.wards USING btree (ward_type);


--
-- Name: admissions admissions_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER admissions_version_trigger BEFORE UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: medication_administration audit_medication_administration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_medication_administration AFTER INSERT OR DELETE OR UPDATE ON public.medication_administration FOR EACH ROW EXECUTE FUNCTION public.log_nursing_action();


--
-- Name: nursing_notes audit_nursing_notes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_nursing_notes AFTER INSERT OR DELETE OR UPDATE ON public.nursing_notes FOR EACH ROW EXECUTE FUNCTION public.log_nursing_action();


--
-- Name: shift_handover audit_shift_handover; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_shift_handover AFTER INSERT OR DELETE OR UPDATE ON public.shift_handover FOR EACH ROW EXECUTE FUNCTION public.log_nursing_action();


--
-- Name: vitals audit_vitals; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_vitals AFTER INSERT OR DELETE OR UPDATE ON public.vitals FOR EACH ROW EXECUTE FUNCTION public.log_nursing_action();


--
-- Name: billing_orders billing_orders_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER billing_orders_version_trigger BEFORE UPDATE ON public.billing_orders FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: consultations consultations_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER consultations_version_trigger BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: inventory_items inventory_items_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inventory_items_version_trigger BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: lab_requests lab_requests_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lab_requests_version_trigger BEFORE UPDATE ON public.lab_requests FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: lab_results lab_results_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lab_results_version_trigger BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: nursing_notes nursing_notes_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER nursing_notes_version_trigger BEFORE UPDATE ON public.nursing_notes FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: patients patients_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER patients_version_trigger BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: prescriptions prescriptions_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prescriptions_version_trigger BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: encounter_access_logs prevent_access_log_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_access_log_update BEFORE DELETE OR UPDATE ON public.encounter_access_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_access_log_modification();


--
-- Name: visits prevent_encounter_deletion_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_encounter_deletion_trigger BEFORE DELETE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.prevent_encounter_deletion();


--
-- Name: patients prevent_patient_deletion_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_patient_deletion_trigger BEFORE DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.prevent_patient_deletion();


--
-- Name: procedures procedures_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER procedures_version_trigger BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: radiology_requests radiology_requests_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER radiology_requests_version_trigger BEFORE UPDATE ON public.radiology_requests FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: clinical_requests referral_to_encounter_office; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER referral_to_encounter_office BEFORE INSERT ON public.clinical_requests FOR EACH ROW WHEN ((new.request_type = 'Referral'::public.clinical_request_type)) EXECUTE FUNCTION public.route_referral_to_encounter_office();


--
-- Name: nursing_interventions tr_audit_nursing_intervention_create; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_audit_nursing_intervention_create AFTER INSERT ON public.nursing_interventions FOR EACH ROW EXECUTE FUNCTION public.audit_nursing_intervention_create();


--
-- Name: nursing_interventions tr_nursing_interventions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_nursing_interventions_updated_at BEFORE UPDATE ON public.nursing_interventions FOR EACH ROW EXECUTE FUNCTION public.update_nursing_interventions_updated_at();


--
-- Name: admissions trg_admission_patient_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admission_patient_status AFTER INSERT ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.update_patient_status_on_admission();


--
-- Name: clinical_requests trg_clinical_request_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clinical_request_number BEFORE INSERT ON public.clinical_requests FOR EACH ROW EXECUTE FUNCTION public.generate_clinical_request_number();


--
-- Name: clinical_requests trg_clinical_request_sla; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clinical_request_sla BEFORE INSERT ON public.clinical_requests FOR EACH ROW EXECUTE FUNCTION public.set_clinical_request_sla();


--
-- Name: clinical_requests trg_clinical_request_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clinical_request_status_change AFTER UPDATE ON public.clinical_requests FOR EACH ROW EXECUTE FUNCTION public.track_clinical_request_status_change();


--
-- Name: clinical_requests trg_clinical_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clinical_requests_updated_at BEFORE UPDATE ON public.clinical_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admissions trg_discharge_patient_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_discharge_patient_status AFTER UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.update_patient_status_on_discharge();


--
-- Name: external_referrals trg_external_referral_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_external_referral_number BEFORE INSERT ON public.external_referrals FOR EACH ROW EXECUTE FUNCTION public.generate_external_referral_number();


--
-- Name: external_referrals trg_external_referrals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_external_referrals_updated_at BEFORE UPDATE ON public.external_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patients trg_generate_emr_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_emr_number BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.generate_emr_number();


--
-- Name: visits trg_generate_encounter_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_encounter_number BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION public.generate_encounter_number();


--
-- Name: visits trg_generate_visit_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_visit_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION public.generate_visit_id();


--
-- Name: admissions trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: billing_orders trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.billing_orders FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: lab_requests trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.lab_requests FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: patients trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: prescriptions trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: radiology_requests trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.radiology_requests FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: receipts trg_set_idempotency_ts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_idempotency_ts BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.set_idempotency_timestamp();


--
-- Name: patient_chief_complaints trg_single_primary_complaint; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_single_primary_complaint BEFORE INSERT OR UPDATE ON public.patient_chief_complaints FOR EACH ROW EXECUTE FUNCTION public.enforce_single_primary_complaint();


--
-- Name: drug_batches trg_sync_drug_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_drug_stock AFTER INSERT OR DELETE OR UPDATE ON public.drug_batches FOR EACH ROW EXECUTE FUNCTION public.sync_drug_stock_quantity();


--
-- Name: billing_items trg_validate_billing_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_billing_item BEFORE INSERT OR UPDATE ON public.billing_items FOR EACH ROW EXECUTE FUNCTION public.validate_billing_item();


--
-- Name: admissions trigger_assign_bed_on_admission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_assign_bed_on_admission AFTER INSERT OR UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.assign_bed_on_admission();


--
-- Name: on_call_schedule trigger_auto_add_on_call; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_add_on_call AFTER INSERT OR UPDATE ON public.on_call_schedule FOR EACH ROW WHEN ((new.is_active = true)) EXECUTE FUNCTION public.auto_add_on_call_to_care_team();


--
-- Name: nursing_notes trigger_auto_assign_shift; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_assign_shift BEFORE INSERT ON public.nursing_notes FOR EACH ROW EXECUTE FUNCTION public.auto_assign_shift_to_note();


--
-- Name: encounter_care_team trigger_auto_deactivate_expired; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_deactivate_expired BEFORE UPDATE ON public.encounter_care_team FOR EACH ROW WHEN ((new.expires_at IS NOT NULL)) EXECUTE FUNCTION public.auto_deactivate_expired_access();


--
-- Name: visits trigger_create_vital_schedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_vital_schedule AFTER INSERT OR UPDATE OF visit_type, status ON public.visits FOR EACH ROW EXECUTE FUNCTION public.create_vital_schedule_on_admission();


--
-- Name: doctor_orders trigger_doctor_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_doctor_orders_updated_at BEFORE UPDATE ON public.doctor_orders FOR EACH ROW EXECUTE FUNCTION public.update_doctor_orders_timestamp();


--
-- Name: encounter_care_team trigger_log_care_team_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_care_team_change BEFORE INSERT OR UPDATE ON public.encounter_care_team FOR EACH ROW EXECUTE FUNCTION public.log_care_team_change();


--
-- Name: visits trigger_log_ownership_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_ownership_change AFTER UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.log_ownership_change();


--
-- Name: lab_requests trigger_notify_critical_result; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_critical_result AFTER UPDATE ON public.lab_requests FOR EACH ROW EXECUTE FUNCTION public.notify_critical_result();


--
-- Name: shift_handovers trigger_notify_shift_handover; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_shift_handover AFTER INSERT ON public.shift_handovers FOR EACH ROW EXECUTE FUNCTION public.notify_shift_handover();


--
-- Name: treatment_plans trigger_notify_treatment_plan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_treatment_plan AFTER INSERT ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.notify_treatment_plan_created();


--
-- Name: nursing_notes trigger_nursing_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_nursing_notes_updated_at BEFORE UPDATE ON public.nursing_notes FOR EACH ROW EXECUTE FUNCTION public.update_nursing_notes_updated_at();


--
-- Name: on_call_schedule trigger_prevent_on_call_overlap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_prevent_on_call_overlap BEFORE INSERT OR UPDATE ON public.on_call_schedule FOR EACH ROW EXECUTE FUNCTION public.prevent_on_call_overlap();


--
-- Name: daily_progress_notes trigger_progress_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_progress_notes_updated_at BEFORE UPDATE ON public.daily_progress_notes FOR EACH ROW EXECUTE FUNCTION public.update_progress_notes_timestamp();


--
-- Name: lab_results trigger_sync_lab_request_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_lab_request_status AFTER INSERT OR UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.sync_lab_request_status();


--
-- Name: shift_handovers trigger_sync_shift_dates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_shift_dates BEFORE INSERT OR UPDATE ON public.shift_handovers FOR EACH ROW EXECUTE FUNCTION public.sync_shift_handover_dates();


--
-- Name: lab_results trigger_track_lab_result_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_track_lab_result_changes AFTER UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.track_lab_result_changes();


--
-- Name: vitals trigger_update_vital_schedule; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_vital_schedule BEFORE INSERT ON public.vitals FOR EACH ROW EXECUTE FUNCTION public.update_vital_schedule_on_record();


--
-- Name: beds trigger_update_ward_bed_counts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_ward_bed_counts AFTER INSERT OR DELETE OR UPDATE ON public.beds FOR EACH ROW EXECUTE FUNCTION public.update_ward_bed_counts();


--
-- Name: dental_chart update_dental_chart_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dental_chart_updated_at BEFORE UPDATE ON public.dental_chart FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dental_exams update_dental_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dental_exams_updated_at BEFORE UPDATE ON public.dental_exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dental_procedures update_dental_procedures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dental_procedures_updated_at BEFORE UPDATE ON public.dental_procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: eye_exams update_eye_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_eye_exams_updated_at BEFORE UPDATE ON public.eye_exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: eye_procedures update_eye_procedures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_eye_procedures_updated_at BEFORE UPDATE ON public.eye_procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: physio_assessments update_physio_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_physio_assessments_updated_at BEFORE UPDATE ON public.physio_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: physio_plans update_physio_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_physio_plans_updated_at BEFORE UPDATE ON public.physio_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: physio_progress update_physio_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_physio_progress_updated_at BEFORE UPDATE ON public.physio_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: physio_sessions update_physio_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_physio_sessions_updated_at BEFORE UPDATE ON public.physio_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: appointments update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: billing_orders update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.billing_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clinics update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultations update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_feedback update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.customer_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dispenses update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.dispenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: drug_catalogue update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.drug_catalogue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: imaging_catalogue update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.imaging_catalogue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_categories update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_items update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lab_requests update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.lab_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lab_results update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lab_test_catalogue update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.lab_test_catalogue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: medical_reports update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.medical_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patients update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prescriptions update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: queue update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: radiology_requests update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.radiology_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: referrals update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_templates update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scan_results update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.scan_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_configurations update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.system_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: treatment_plans update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: treatment_tasks update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.treatment_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: triage_assessments update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.triage_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: visits update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vitals update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.vitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_exceptions update_updated_at_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_updated_at_timestamp BEFORE UPDATE ON public.workflow_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: visits visit_specialty_routing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER visit_specialty_routing AFTER INSERT OR UPDATE OF attending_doctor_id ON public.visits FOR EACH ROW EXECUTE FUNCTION public.route_visit_to_specialty();


--
-- Name: vitals vitals_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vitals_version_trigger BEFORE UPDATE ON public.vitals FOR EACH ROW EXECUTE FUNCTION public.increment_record_version();


--
-- Name: admissions admissions_admitting_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_admitting_doctor_id_fkey FOREIGN KEY (admitting_doctor_id) REFERENCES public.staff(id);


--
-- Name: admissions admissions_attending_physician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_attending_physician_id_fkey FOREIGN KEY (attending_physician_id) REFERENCES public.staff(id);


--
-- Name: admissions admissions_clinical_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_clinical_request_id_fkey FOREIGN KEY (clinical_request_id) REFERENCES public.clinical_requests(id);


--
-- Name: admissions admissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: admissions admissions_current_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_current_bed_id_fkey FOREIGN KEY (current_bed_id) REFERENCES public.beds(id);


--
-- Name: admissions admissions_current_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_current_ward_id_fkey FOREIGN KEY (current_ward_id) REFERENCES public.wards(id);


--
-- Name: admissions admissions_discharged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_discharged_by_fkey FOREIGN KEY (discharged_by) REFERENCES public.staff(id);


--
-- Name: admissions admissions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: admissions admissions_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: admissions admissions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: admissions admissions_primary_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_primary_nurse_id_fkey FOREIGN KEY (primary_nurse_id) REFERENCES public.staff(id);


--
-- Name: admissions admissions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admissions
    ADD CONSTRAINT admissions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: appointments appointments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: bed_transfers bed_transfers_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: bed_transfers bed_transfers_authorized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES public.staff(id);


--
-- Name: bed_transfers bed_transfers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: bed_transfers bed_transfers_from_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_from_bed_id_fkey FOREIGN KEY (from_bed_id) REFERENCES public.beds(id);


--
-- Name: bed_transfers bed_transfers_from_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_from_ward_id_fkey FOREIGN KEY (from_ward_id) REFERENCES public.wards(id);


--
-- Name: bed_transfers bed_transfers_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id);


--
-- Name: bed_transfers bed_transfers_to_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_to_bed_id_fkey FOREIGN KEY (to_bed_id) REFERENCES public.beds(id);


--
-- Name: bed_transfers bed_transfers_to_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bed_transfers
    ADD CONSTRAINT bed_transfers_to_ward_id_fkey FOREIGN KEY (to_ward_id) REFERENCES public.wards(id);


--
-- Name: beds beds_current_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_current_patient_id_fkey FOREIGN KEY (current_patient_id) REFERENCES public.patients(id);


--
-- Name: beds beds_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT beds_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id) ON DELETE CASCADE;


--
-- Name: billing_audit_log billing_audit_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_audit_log
    ADD CONSTRAINT billing_audit_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id);


--
-- Name: billing_items billing_items_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.staff(id);


--
-- Name: billing_items billing_items_billing_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_billing_order_id_fkey FOREIGN KEY (billing_order_id) REFERENCES public.billing_orders(id) ON DELETE CASCADE;


--
-- Name: billing_items billing_items_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.staff(id);


--
-- Name: billing_orders billing_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: billing_orders billing_orders_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: billing_orders billing_orders_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: billing_orders billing_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: billing_orders billing_orders_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_orders
    ADD CONSTRAINT billing_orders_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: clinical_request_status_history clinical_request_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_request_status_history
    ADD CONSTRAINT clinical_request_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.staff(id);


--
-- Name: clinical_request_status_history clinical_request_status_history_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_request_status_history
    ADD CONSTRAINT clinical_request_status_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.clinical_requests(id) ON DELETE CASCADE;


--
-- Name: clinical_requests clinical_requests_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admissions(id);


--
-- Name: clinical_requests clinical_requests_appointment_booked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_appointment_booked_by_fkey FOREIGN KEY (appointment_booked_by) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: clinical_requests clinical_requests_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: clinical_requests clinical_requests_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: clinical_requests clinical_requests_follow_up_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_follow_up_visit_id_fkey FOREIGN KEY (follow_up_visit_id) REFERENCES public.visits(id);


--
-- Name: clinical_requests clinical_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: clinical_requests clinical_requests_procedure_catalogue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_procedure_catalogue_id_fkey FOREIGN KEY (procedure_catalogue_id) REFERENCES public.procedure_catalogue(id);


--
-- Name: clinical_requests clinical_requests_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id);


--
-- Name: clinical_requests clinical_requests_referral_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_referral_encounter_id_fkey FOREIGN KEY (referral_encounter_id) REFERENCES public.visits(id);


--
-- Name: clinical_requests clinical_requests_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id);


--
-- Name: clinical_requests clinical_requests_requesting_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_requesting_department_id_fkey FOREIGN KEY (requesting_department_id) REFERENCES public.departments(id);


--
-- Name: clinical_requests clinical_requests_requesting_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_requesting_doctor_id_fkey FOREIGN KEY (requesting_doctor_id) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_source_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_source_clinic_id_fkey FOREIGN KEY (source_clinic_id) REFERENCES public.clinics(id);


--
-- Name: clinical_requests clinical_requests_target_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_target_department_id_fkey FOREIGN KEY (target_department_id) REFERENCES public.departments(id);


--
-- Name: clinical_requests clinical_requests_target_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_target_doctor_id_fkey FOREIGN KEY (target_doctor_id) REFERENCES public.staff(id);


--
-- Name: clinical_requests clinical_requests_target_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_requests
    ADD CONSTRAINT clinical_requests_target_ward_id_fkey FOREIGN KEY (target_ward_id) REFERENCES public.wards(id);


--
-- Name: clinics clinics_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: clinics clinics_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: consultations consultations_clinic_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_clinic_uuid_fkey FOREIGN KEY (clinic_uuid) REFERENCES public.clinics(id);


--
-- Name: consultations consultations_doctor_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_doctor_uuid_fkey FOREIGN KEY (doctor_uuid) REFERENCES public.staff(id);


--
-- Name: consultations consultations_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: consultations consultations_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: consultations consultations_nurse_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_nurse_acknowledged_by_fkey FOREIGN KEY (nurse_acknowledged_by) REFERENCES public.staff(id);


--
-- Name: consultations consultations_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: consultations consultations_visit_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_visit_uuid_fkey FOREIGN KEY (visit_uuid) REFERENCES public.visits(id);


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: courses courses_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: customer_feedback customer_feedback_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_feedback
    ADD CONSTRAINT customer_feedback_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);


--
-- Name: customer_feedback customer_feedback_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_feedback
    ADD CONSTRAINT customer_feedback_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: daily_progress_notes daily_progress_notes_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_progress_notes
    ADD CONSTRAINT daily_progress_notes_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: daily_progress_notes daily_progress_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_progress_notes
    ADD CONSTRAINT daily_progress_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: daily_progress_notes daily_progress_notes_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_progress_notes
    ADD CONSTRAINT daily_progress_notes_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: dental_chart dental_chart_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: dental_chart dental_chart_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.dental_exams(exam_id) ON DELETE CASCADE;


--
-- Name: dental_chart dental_chart_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: dental_chart dental_chart_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: dental_chart dental_chart_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_exams dental_exams_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id) ON DELETE SET NULL;


--
-- Name: dental_exams dental_exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_exams dental_exams_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: dental_exams dental_exams_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: dental_exams dental_exams_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_exams dental_exams_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: dental_exams dental_exams_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_exams
    ADD CONSTRAINT dental_exams_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: dental_prescriptions dental_prescriptions_dispensed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_dispensed_by_fkey FOREIGN KEY (dispensed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_prescriptions dental_prescriptions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: dental_prescriptions dental_prescriptions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.dental_exams(exam_id) ON DELETE SET NULL;


--
-- Name: dental_prescriptions dental_prescriptions_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: dental_prescriptions dental_prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: dental_prescriptions dental_prescriptions_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: dental_prescriptions dental_prescriptions_prescribed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_prescriptions dental_prescriptions_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_prescriptions
    ADD CONSTRAINT dental_prescriptions_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.dental_procedures(procedure_id) ON DELETE SET NULL;


--
-- Name: dental_procedures dental_procedures_assisted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_assisted_by_fkey FOREIGN KEY (assisted_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_procedures dental_procedures_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dental_procedures dental_procedures_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: dental_procedures dental_procedures_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.dental_exams(exam_id) ON DELETE SET NULL;


--
-- Name: dental_procedures dental_procedures_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: dental_procedures dental_procedures_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: dental_procedures dental_procedures_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_procedures
    ADD CONSTRAINT dental_procedures_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: dispense_items dispense_items_dispense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_items
    ADD CONSTRAINT dispense_items_dispense_id_fkey FOREIGN KEY (dispense_id) REFERENCES public.dispenses(id) ON DELETE CASCADE;


--
-- Name: dispense_items dispense_items_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_items
    ADD CONSTRAINT dispense_items_drug_id_fkey FOREIGN KEY (drug_id) REFERENCES public.drug_catalogue(id);


--
-- Name: dispense_items dispense_items_prescription_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_items
    ADD CONSTRAINT dispense_items_prescription_item_id_fkey FOREIGN KEY (prescription_item_id) REFERENCES public.prescription_items(id);


--
-- Name: dispense_records dispense_records_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_records
    ADD CONSTRAINT dispense_records_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.drug_batches(batch_id);


--
-- Name: dispense_records dispense_records_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_records
    ADD CONSTRAINT dispense_records_drug_id_fkey FOREIGN KEY (drug_id) REFERENCES public.drug_catalogue(id);


--
-- Name: dispense_records dispense_records_original_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispense_records
    ADD CONSTRAINT dispense_records_original_drug_id_fkey FOREIGN KEY (original_drug_id) REFERENCES public.drug_catalogue(id);


--
-- Name: dispenses dispenses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispenses
    ADD CONSTRAINT dispenses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: dispenses dispenses_pharmacist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispenses
    ADD CONSTRAINT dispenses_pharmacist_id_fkey FOREIGN KEY (pharmacist_id) REFERENCES public.staff(id);


--
-- Name: dispenses dispenses_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispenses
    ADD CONSTRAINT dispenses_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(prescription_id);


--
-- Name: doctor_orders doctor_orders_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.staff(id);


--
-- Name: doctor_orders doctor_orders_assigned_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_assigned_nurse_id_fkey FOREIGN KEY (assigned_nurse_id) REFERENCES public.staff(id);


--
-- Name: doctor_orders doctor_orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.staff(id);


--
-- Name: doctor_orders doctor_orders_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(id);


--
-- Name: doctor_orders doctor_orders_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(visit_id) ON DELETE CASCADE;


--
-- Name: doctor_orders doctor_orders_ordered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_ordered_by_fkey FOREIGN KEY (ordered_by) REFERENCES public.staff(id);


--
-- Name: doctor_orders doctor_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_orders
    ADD CONSTRAINT doctor_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: drug_batches drug_batches_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_batches
    ADD CONSTRAINT drug_batches_drug_id_fkey FOREIGN KEY (drug_id) REFERENCES public.drug_catalogue(id) ON DELETE CASCADE;


--
-- Name: drug_catalogue drug_catalogue_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drug_catalogue
    ADD CONSTRAINT drug_catalogue_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: encounter_access_logs encounter_access_logs_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_access_logs
    ADD CONSTRAINT encounter_access_logs_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: encounter_access_logs encounter_access_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_access_logs
    ADD CONSTRAINT encounter_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id);


--
-- Name: encounter_care_team encounter_care_team_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_care_team
    ADD CONSTRAINT encounter_care_team_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.staff(id);


--
-- Name: encounter_care_team encounter_care_team_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_care_team
    ADD CONSTRAINT encounter_care_team_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: encounter_care_team encounter_care_team_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_care_team
    ADD CONSTRAINT encounter_care_team_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: encounter_transfers encounter_transfers_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_transfers
    ADD CONSTRAINT encounter_transfers_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: encounter_transfers encounter_transfers_from_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_transfers
    ADD CONSTRAINT encounter_transfers_from_doctor_id_fkey FOREIGN KEY (from_doctor_id) REFERENCES public.staff(id);


--
-- Name: encounter_transfers encounter_transfers_to_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_transfers
    ADD CONSTRAINT encounter_transfers_to_doctor_id_fkey FOREIGN KEY (to_doctor_id) REFERENCES public.staff(id);


--
-- Name: encounter_transfers encounter_transfers_transferred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter_transfers
    ADD CONSTRAINT encounter_transfers_transferred_by_fkey FOREIGN KEY (transferred_by) REFERENCES public.staff(id);


--
-- Name: external_referrals external_referrals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: external_referrals external_referrals_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: external_referrals external_referrals_internal_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_internal_department_id_fkey FOREIGN KEY (internal_department_id) REFERENCES public.departments(id);


--
-- Name: external_referrals external_referrals_internal_physician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_internal_physician_id_fkey FOREIGN KEY (internal_physician_id) REFERENCES public.staff(id);


--
-- Name: external_referrals external_referrals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_referrals
    ADD CONSTRAINT external_referrals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: eye_exams eye_exams_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id) ON DELETE SET NULL;


--
-- Name: eye_exams eye_exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: eye_exams eye_exams_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: eye_exams eye_exams_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: eye_exams eye_exams_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: eye_exams eye_exams_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: eye_exams eye_exams_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_exams
    ADD CONSTRAINT eye_exams_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: eye_prescriptions eye_prescriptions_dispensed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_dispensed_by_fkey FOREIGN KEY (dispensed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: eye_prescriptions eye_prescriptions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: eye_prescriptions eye_prescriptions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.eye_exams(exam_id) ON DELETE SET NULL;


--
-- Name: eye_prescriptions eye_prescriptions_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: eye_prescriptions eye_prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: eye_prescriptions eye_prescriptions_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: eye_prescriptions eye_prescriptions_prescribed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_prescriptions
    ADD CONSTRAINT eye_prescriptions_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: eye_procedures eye_procedures_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: eye_procedures eye_procedures_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: eye_procedures eye_procedures_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.eye_exams(exam_id) ON DELETE SET NULL;


--
-- Name: eye_procedures eye_procedures_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: eye_procedures eye_procedures_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: eye_procedures eye_procedures_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eye_procedures
    ADD CONSTRAINT eye_procedures_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: beds fk_beds_current_admission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beds
    ADD CONSTRAINT fk_beds_current_admission FOREIGN KEY (current_admission_id) REFERENCES public.admissions(id);


--
-- Name: consultations fk_consultations_clinic; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT fk_consultations_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(clinic_id);


--
-- Name: consultations fk_consultations_doctor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT fk_consultations_doctor FOREIGN KEY (doctor_id) REFERENCES public.staff(staff_id);


--
-- Name: consultations fk_consultations_encounter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT fk_consultations_encounter FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: consultations fk_consultations_patient; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT fk_consultations_patient FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: consultations fk_consultations_visit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT fk_consultations_visit FOREIGN KEY (visit_id) REFERENCES public.visits(visit_id);


--
-- Name: departments fk_dept_head; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_of_department) REFERENCES public.staff(id);


--
-- Name: lab_requests fk_lab_requests_ordered_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT fk_lab_requests_ordered_by FOREIGN KEY (ordered_by) REFERENCES public.staff(staff_id);


--
-- Name: lab_requests fk_lab_requests_patient; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT fk_lab_requests_patient FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: lab_requests fk_lab_requests_visit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT fk_lab_requests_visit FOREIGN KEY (visit_id) REFERENCES public.visits(visit_id);


--
-- Name: payments fk_payments_invoice; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(invoice_id);


--
-- Name: payments fk_payments_patient; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_patient FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: payments fk_payments_received_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_received_by FOREIGN KEY (received_by) REFERENCES public.staff(staff_id);


--
-- Name: prescriptions fk_prescriptions_doctor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES public.staff(staff_id);


--
-- Name: prescriptions fk_prescriptions_patient; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: prescriptions fk_prescriptions_visit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT fk_prescriptions_visit FOREIGN KEY (visit_id) REFERENCES public.visits(visit_id);


--
-- Name: radiology_requests fk_radiology_requests_ordered_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT fk_radiology_requests_ordered_by FOREIGN KEY (ordered_by) REFERENCES public.staff(staff_id);


--
-- Name: radiology_requests fk_radiology_requests_patient; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT fk_radiology_requests_patient FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: radiology_requests fk_radiology_requests_performed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT fk_radiology_requests_performed_by FOREIGN KEY (performed_by) REFERENCES public.staff(staff_id);


--
-- Name: radiology_requests fk_radiology_requests_visit; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT fk_radiology_requests_visit FOREIGN KEY (visit_id) REFERENCES public.visits(visit_id);


--
-- Name: inventory_stock_movements fk_stock_movements_batch; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT fk_stock_movements_batch FOREIGN KEY (batch_id) REFERENCES public.drug_batches(batch_id);


--
-- Name: treatment_plans fk_treatment_plans_encounter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT fk_treatment_plans_encounter FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: treatment_tasks fk_treatment_tasks_encounter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT fk_treatment_tasks_encounter FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: vitals fk_vitals_encounter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT fk_vitals_encounter FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: imaging_catalogue imaging_catalogue_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.imaging_catalogue
    ADD CONSTRAINT imaging_catalogue_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: inventory_categories inventory_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.inventory_categories(id);


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.inventory_categories(id);


--
-- Name: inventory_stock_movements inventory_stock_movements_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_movements
    ADD CONSTRAINT inventory_stock_movements_drug_id_fkey FOREIGN KEY (drug_id) REFERENCES public.drug_catalogue(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(invoice_id) ON DELETE CASCADE;


--
-- Name: invoices invoices_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id) ON DELETE SET NULL;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(staff_id);


--
-- Name: invoices invoices_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE CASCADE;


--
-- Name: lab_critical_notifications lab_critical_notifications_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_critical_notifications
    ADD CONSTRAINT lab_critical_notifications_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.staff(id);


--
-- Name: lab_critical_notifications lab_critical_notifications_lab_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_critical_notifications
    ADD CONSTRAINT lab_critical_notifications_lab_result_id_fkey FOREIGN KEY (lab_result_id) REFERENCES public.lab_results(id) ON DELETE CASCADE;


--
-- Name: lab_critical_notifications lab_critical_notifications_notified_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_critical_notifications
    ADD CONSTRAINT lab_critical_notifications_notified_to_fkey FOREIGN KEY (notified_to) REFERENCES public.staff(id);


--
-- Name: lab_critical_notifications lab_critical_notifications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_critical_notifications
    ADD CONSTRAINT lab_critical_notifications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: lab_request_items lab_request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_request_items
    ADD CONSTRAINT lab_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.lab_requests(request_id) ON DELETE CASCADE;


--
-- Name: lab_request_items lab_request_items_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_request_items
    ADD CONSTRAINT lab_request_items_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_test_catalogue(id);


--
-- Name: lab_requests lab_requests_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id);


--
-- Name: lab_requests lab_requests_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: lab_requests lab_requests_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: lab_requests lab_requests_nhis_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_nhis_approval_id_fkey FOREIGN KEY (nhis_approval_id) REFERENCES public.nhis_approvals(id);


--
-- Name: lab_requests lab_requests_ordered_by_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_ordered_by_uuid_fkey FOREIGN KEY (ordered_by_uuid) REFERENCES public.staff(id);


--
-- Name: lab_requests lab_requests_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: lab_requests lab_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: lab_requests lab_requests_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.staff(id);


--
-- Name: lab_requests lab_requests_visit_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_visit_uuid_fkey FOREIGN KEY (visit_uuid) REFERENCES public.visits(id);


--
-- Name: lab_result_history lab_result_history_lab_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_history
    ADD CONSTRAINT lab_result_history_lab_result_id_fkey FOREIGN KEY (lab_result_id) REFERENCES public.lab_results(id) ON DELETE CASCADE;


--
-- Name: lab_result_history lab_result_history_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_history
    ADD CONSTRAINT lab_result_history_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.staff(id);


--
-- Name: lab_results lab_results_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: lab_results lab_results_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_results lab_results_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.lab_requests(request_id);


--
-- Name: lab_results lab_results_sample_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_sample_collected_by_fkey FOREIGN KEY (sample_collected_by) REFERENCES public.staff(id);


--
-- Name: lab_results lab_results_technician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_technician_id_fkey FOREIGN KEY (technician_id) REFERENCES public.staff(id);


--
-- Name: lab_results lab_results_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.lab_test_catalogue(id);


--
-- Name: lab_results lab_results_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.staff(id);


--
-- Name: lab_test_catalogue lab_test_catalogue_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_catalogue
    ADD CONSTRAINT lab_test_catalogue_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: medical_reports medical_reports_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_reports
    ADD CONSTRAINT medical_reports_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: medical_reports medical_reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_reports
    ADD CONSTRAINT medical_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: medical_reports medical_reports_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_reports
    ADD CONSTRAINT medical_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medical_reports medical_reports_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_reports
    ADD CONSTRAINT medical_reports_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: medication_administration medication_administration_administered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_administered_by_fkey FOREIGN KEY (administered_by) REFERENCES public.staff(id);


--
-- Name: medication_administration medication_administration_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: medication_administration medication_administration_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: medication_administration medication_administration_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: medication_administration medication_administration_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administration
    ADD CONSTRAINT medication_administration_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(prescription_id);


--
-- Name: nhis_approvals nhis_approvals_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_approvals
    ADD CONSTRAINT nhis_approvals_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.staff(id);


--
-- Name: nhis_approvals nhis_approvals_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_approvals
    ADD CONSTRAINT nhis_approvals_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: nhis_approvals nhis_approvals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_approvals
    ADD CONSTRAINT nhis_approvals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: nhis_approvals nhis_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_approvals
    ADD CONSTRAINT nhis_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.staff(id);


--
-- Name: nhis_audit_log nhis_audit_log_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_audit_log
    ADD CONSTRAINT nhis_audit_log_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: nhis_audit_log nhis_audit_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_audit_log
    ADD CONSTRAINT nhis_audit_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: nhis_audit_log nhis_audit_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_audit_log
    ADD CONSTRAINT nhis_audit_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id);


--
-- Name: nhis_authorizations nhis_authorizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: nhis_authorizations nhis_authorizations_nhis_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_nhis_profile_id_fkey FOREIGN KEY (nhis_profile_id) REFERENCES public.nhis_profiles(id);


--
-- Name: nhis_authorizations nhis_authorizations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: nhis_authorizations nhis_authorizations_renewed_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_renewed_from_id_fkey FOREIGN KEY (renewed_from_id) REFERENCES public.nhis_authorizations(id);


--
-- Name: nhis_authorizations nhis_authorizations_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.staff(id);


--
-- Name: nhis_authorizations nhis_authorizations_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_authorizations
    ADD CONSTRAINT nhis_authorizations_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.staff(id);


--
-- Name: nhis_claims nhis_claims_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: nhis_claims nhis_claims_auth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES public.nhis_authorizations(id);


--
-- Name: nhis_claims nhis_claims_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: nhis_claims nhis_claims_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: nhis_claims nhis_claims_nhis_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_nhis_profile_id_fkey FOREIGN KEY (nhis_profile_id) REFERENCES public.nhis_profiles(id);


--
-- Name: nhis_claims nhis_claims_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: nhis_claims nhis_claims_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.staff(id);


--
-- Name: nhis_claims nhis_claims_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id);


--
-- Name: nhis_claims nhis_claims_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_claims
    ADD CONSTRAINT nhis_claims_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.staff(id);


--
-- Name: nhis_export_batches nhis_export_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_export_batches
    ADD CONSTRAINT nhis_export_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: nhis_export_batches nhis_export_batches_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_export_batches
    ADD CONSTRAINT nhis_export_batches_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.staff(id);


--
-- Name: nhis_policy_config nhis_policy_config_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_policy_config
    ADD CONSTRAINT nhis_policy_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: nhis_policy_config nhis_policy_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_policy_config
    ADD CONSTRAINT nhis_policy_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: nhis_postings nhis_postings_auth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES public.nhis_authorizations(id);


--
-- Name: nhis_postings nhis_postings_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.staff(id);


--
-- Name: nhis_postings nhis_postings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: nhis_postings nhis_postings_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff(id);


--
-- Name: nhis_postings nhis_postings_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: nhis_postings nhis_postings_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: nhis_postings nhis_postings_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_postings
    ADD CONSTRAINT nhis_postings_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.staff(id);


--
-- Name: nhis_profiles nhis_profiles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT nhis_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: nhis_profiles nhis_profiles_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT nhis_profiles_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: nhis_profiles nhis_profiles_policy_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT nhis_profiles_policy_config_id_fkey FOREIGN KEY (policy_config_id) REFERENCES public.nhis_policy_config(id);


--
-- Name: nhis_profiles nhis_profiles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT nhis_profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: nhis_profiles nhis_profiles_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_profiles
    ADD CONSTRAINT nhis_profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.staff(id);


--
-- Name: nhis_referral_queue nhis_referral_queue_authorization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_referral_queue
    ADD CONSTRAINT nhis_referral_queue_authorization_id_fkey FOREIGN KEY (authorization_id) REFERENCES public.nhis_authorizations(id);


--
-- Name: nhis_referral_queue nhis_referral_queue_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_referral_queue
    ADD CONSTRAINT nhis_referral_queue_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: nhis_referral_queue nhis_referral_queue_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_referral_queue
    ADD CONSTRAINT nhis_referral_queue_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.staff(id);


--
-- Name: nhis_referral_queue nhis_referral_queue_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_referral_queue
    ADD CONSTRAINT nhis_referral_queue_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.staff(id);


--
-- Name: nhis_tariff_rules nhis_tariff_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_tariff_rules
    ADD CONSTRAINT nhis_tariff_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: nhis_tariff_rules nhis_tariff_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nhis_tariff_rules
    ADD CONSTRAINT nhis_tariff_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: notifications notifications_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: notifications notifications_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE SET NULL;


--
-- Name: notifications notifications_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff(id);


--
-- Name: nursing_audit_log nursing_audit_log_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_audit_log
    ADD CONSTRAINT nursing_audit_log_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: nursing_interventions nursing_interventions_bed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_interventions
    ADD CONSTRAINT nursing_interventions_bed_id_fkey FOREIGN KEY (bed_id) REFERENCES public.beds(id);


--
-- Name: nursing_interventions nursing_interventions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_interventions
    ADD CONSTRAINT nursing_interventions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: nursing_interventions nursing_interventions_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_interventions
    ADD CONSTRAINT nursing_interventions_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES public.staff(id);


--
-- Name: nursing_interventions nursing_interventions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_interventions
    ADD CONSTRAINT nursing_interventions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: nursing_interventions nursing_interventions_ward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_interventions
    ADD CONSTRAINT nursing_interventions_ward_id_fkey FOREIGN KEY (ward_id) REFERENCES public.wards(id);


--
-- Name: nursing_notes nursing_notes_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id);


--
-- Name: nursing_notes nursing_notes_doctor_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_doctor_reviewed_by_fkey FOREIGN KEY (doctor_reviewed_by) REFERENCES public.staff(id);


--
-- Name: nursing_notes nursing_notes_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: nursing_notes nursing_notes_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: nursing_notes nursing_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: nursing_notes nursing_notes_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: nursing_notes nursing_notes_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: nursing_notes nursing_notes_treatment_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_treatment_plan_id_fkey FOREIGN KEY (treatment_plan_id) REFERENCES public.treatment_plans(id);


--
-- Name: nursing_notes nursing_notes_treatment_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_notes
    ADD CONSTRAINT nursing_notes_treatment_task_id_fkey FOREIGN KEY (treatment_task_id) REFERENCES public.treatment_tasks(id);


--
-- Name: on_call_schedule on_call_schedule_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_call_schedule
    ADD CONSTRAINT on_call_schedule_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: on_call_schedule on_call_schedule_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_call_schedule
    ADD CONSTRAINT on_call_schedule_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: patient_chief_complaints patient_chief_complaints_complaint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT patient_chief_complaints_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES public.chief_complaint_catalogue(complaint_id);


--
-- Name: patient_chief_complaints patient_chief_complaints_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT patient_chief_complaints_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id);


--
-- Name: patient_chief_complaints patient_chief_complaints_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT patient_chief_complaints_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: patient_chief_complaints patient_chief_complaints_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT patient_chief_complaints_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id);


--
-- Name: patient_chief_complaints patient_chief_complaints_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_chief_complaints
    ADD CONSTRAINT patient_chief_complaints_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: patient_vital_schedules patient_vital_schedules_assigned_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_assigned_nurse_id_fkey FOREIGN KEY (assigned_nurse_id) REFERENCES public.staff(id);


--
-- Name: patient_vital_schedules patient_vital_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: patient_vital_schedules patient_vital_schedules_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: patient_vital_schedules patient_vital_schedules_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE CASCADE;


--
-- Name: patient_vital_schedules patient_vital_schedules_paused_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vital_schedules
    ADD CONSTRAINT patient_vital_schedules_paused_by_fkey FOREIGN KEY (paused_by) REFERENCES public.staff(id);


--
-- Name: patients patients_principal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_principal_id_fkey FOREIGN KEY (principal_id) REFERENCES public.patients(id);


--
-- Name: patients patients_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.staff(id);


--
-- Name: physio_assessments physio_assessments_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id) ON DELETE SET NULL;


--
-- Name: physio_assessments physio_assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_assessments physio_assessments_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: physio_assessments physio_assessments_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: physio_assessments physio_assessments_finalized_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_assessments physio_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: physio_assessments physio_assessments_referral_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_assessments
    ADD CONSTRAINT physio_assessments_referral_doctor_id_fkey FOREIGN KEY (referral_doctor_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_discharge physio_discharge_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_discharge
    ADD CONSTRAINT physio_discharge_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.physio_assessments(assessment_id) ON DELETE RESTRICT;


--
-- Name: physio_discharge physio_discharge_discharged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_discharge
    ADD CONSTRAINT physio_discharge_discharged_by_fkey FOREIGN KEY (discharged_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_discharge physio_discharge_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_discharge
    ADD CONSTRAINT physio_discharge_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: physio_discharge physio_discharge_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_discharge
    ADD CONSTRAINT physio_discharge_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: physio_discharge physio_discharge_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_discharge
    ADD CONSTRAINT physio_discharge_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.physio_plans(plan_id) ON DELETE SET NULL;


--
-- Name: physio_plans physio_plans_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_plans physio_plans_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.physio_assessments(assessment_id) ON DELETE RESTRICT;


--
-- Name: physio_plans physio_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_plans physio_plans_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: physio_plans physio_plans_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: physio_plans physio_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_plans
    ADD CONSTRAINT physio_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: physio_progress physio_progress_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.physio_assessments(assessment_id) ON DELETE RESTRICT;


--
-- Name: physio_progress physio_progress_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: physio_progress physio_progress_evaluated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_progress physio_progress_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: physio_progress physio_progress_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: physio_progress physio_progress_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.physio_plans(plan_id) ON DELETE SET NULL;


--
-- Name: physio_progress physio_progress_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_progress
    ADD CONSTRAINT physio_progress_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_sessions physio_sessions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.physio_assessments(assessment_id) ON DELETE RESTRICT;


--
-- Name: physio_sessions physio_sessions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: physio_sessions physio_sessions_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE SET NULL;


--
-- Name: physio_sessions physio_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE RESTRICT;


--
-- Name: physio_sessions physio_sessions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.physio_plans(plan_id) ON DELETE RESTRICT;


--
-- Name: physio_sessions physio_sessions_supervised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_supervised_by_fkey FOREIGN KEY (supervised_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: physio_sessions physio_sessions_treated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.physio_sessions
    ADD CONSTRAINT physio_sessions_treated_by_fkey FOREIGN KEY (treated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: prescription_items prescription_items_drug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_drug_id_fkey FOREIGN KEY (drug_id) REFERENCES public.drug_catalogue(id);


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(prescription_id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id);


--
-- Name: prescriptions prescriptions_doctor_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_doctor_uuid_fkey FOREIGN KEY (doctor_uuid) REFERENCES public.staff(id);


--
-- Name: prescriptions prescriptions_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: prescriptions prescriptions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: prescriptions prescriptions_nhis_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_nhis_approval_id_fkey FOREIGN KEY (nhis_approval_id) REFERENCES public.nhis_approvals(id);


--
-- Name: prescriptions prescriptions_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: prescriptions prescriptions_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.staff(id);


--
-- Name: prescriptions prescriptions_visit_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_visit_uuid_fkey FOREIGN KEY (visit_uuid) REFERENCES public.visits(id);


--
-- Name: procedure_catalogue procedure_catalogue_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_catalogue
    ADD CONSTRAINT procedure_catalogue_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: procedure_catalogue procedure_catalogue_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_catalogue
    ADD CONSTRAINT procedure_catalogue_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: procedure_catalogue procedure_catalogue_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_catalogue
    ADD CONSTRAINT procedure_catalogue_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: procedure_consumables procedure_consumables_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumables
    ADD CONSTRAINT procedure_consumables_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: procedure_consumables procedure_consumables_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumables
    ADD CONSTRAINT procedure_consumables_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id) ON DELETE CASCADE;


--
-- Name: procedure_consumables procedure_consumables_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_consumables
    ADD CONSTRAINT procedure_consumables_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff(id);


--
-- Name: procedure_requests procedure_requests_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_requests
    ADD CONSTRAINT procedure_requests_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id);


--
-- Name: procedure_requests procedure_requests_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedure_requests
    ADD CONSTRAINT procedure_requests_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: procedures procedures_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admissions(id);


--
-- Name: procedures procedures_anesthesiologist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_anesthesiologist_id_fkey FOREIGN KEY (anesthesiologist_id) REFERENCES public.staff(id);


--
-- Name: procedures procedures_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.staff(id);


--
-- Name: procedures procedures_catalogue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_catalogue_id_fkey FOREIGN KEY (catalogue_id) REFERENCES public.procedure_catalogue(id);


--
-- Name: procedures procedures_circulating_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_circulating_nurse_id_fkey FOREIGN KEY (circulating_nurse_id) REFERENCES public.staff(id);


--
-- Name: procedures procedures_clinical_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_clinical_request_id_fkey FOREIGN KEY (clinical_request_id) REFERENCES public.clinical_requests(id);


--
-- Name: procedures procedures_consent_obtained_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_consent_obtained_by_fkey FOREIGN KEY (consent_obtained_by) REFERENCES public.staff(id);


--
-- Name: procedures procedures_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: procedures procedures_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: procedures procedures_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: procedures procedures_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: procedures procedures_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: procedures procedures_primary_surgeon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_primary_surgeon_id_fkey FOREIGN KEY (primary_surgeon_id) REFERENCES public.staff(id);


--
-- Name: procedures procedures_scrub_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_scrub_nurse_id_fkey FOREIGN KEY (scrub_nurse_id) REFERENCES public.staff(id);


--
-- Name: procedures procedures_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: queue queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);


--
-- Name: queue queue_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: queue queue_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: queue queue_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: queue queue_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: queue queue_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.queue
    ADD CONSTRAINT queue_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: radiology_request_items radiology_request_items_imaging_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_request_items
    ADD CONSTRAINT radiology_request_items_imaging_id_fkey FOREIGN KEY (imaging_id) REFERENCES public.imaging_catalogue(id);


--
-- Name: radiology_request_items radiology_request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_request_items
    ADD CONSTRAINT radiology_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.radiology_requests(request_id) ON DELETE CASCADE;


--
-- Name: radiology_requests radiology_requests_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT radiology_requests_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id);


--
-- Name: radiology_requests radiology_requests_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT radiology_requests_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: radiology_requests radiology_requests_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT radiology_requests_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: radiology_requests radiology_requests_nhis_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT radiology_requests_nhis_approval_id_fkey FOREIGN KEY (nhis_approval_id) REFERENCES public.nhis_approvals(id);


--
-- Name: radiology_requests radiology_requests_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.radiology_requests
    ADD CONSTRAINT radiology_requests_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.staff(id);


--
-- Name: receipts receipts_billing_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_billing_order_id_fkey FOREIGN KEY (billing_order_id) REFERENCES public.billing_orders(id) ON DELETE SET NULL;


--
-- Name: receipts receipts_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: receipts receipts_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(invoice_id) ON DELETE SET NULL;


--
-- Name: receipts receipts_issued_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.staff(staff_id);


--
-- Name: receipts receipts_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE CASCADE;


--
-- Name: receipts receipts_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(visit_id) ON DELETE SET NULL;


--
-- Name: referral_outcomes referral_outcomes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_outcomes
    ADD CONSTRAINT referral_outcomes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: referral_outcomes referral_outcomes_external_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_outcomes
    ADD CONSTRAINT referral_outcomes_external_referral_id_fkey FOREIGN KEY (external_referral_id) REFERENCES public.external_referrals(id) ON DELETE CASCADE;


--
-- Name: referral_outcomes referral_outcomes_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_outcomes
    ADD CONSTRAINT referral_outcomes_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_parent_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_parent_referral_id_fkey FOREIGN KEY (parent_referral_id) REFERENCES public.referrals(id);


--
-- Name: referrals referrals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: referrals referrals_receiving_physician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_receiving_physician_id_fkey FOREIGN KEY (receiving_physician_id) REFERENCES public.staff(id);


--
-- Name: referrals referrals_referring_physician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referring_physician_id_fkey FOREIGN KEY (referring_physician_id) REFERENCES public.staff(id);


--
-- Name: referrals referrals_source_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_source_department_id_fkey FOREIGN KEY (source_department_id) REFERENCES public.departments(id);


--
-- Name: referrals referrals_target_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_target_department_id_fkey FOREIGN KEY (target_department_id) REFERENCES public.departments(id);


--
-- Name: referrals referrals_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: report_templates report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: scan_results scan_results_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_results
    ADD CONSTRAINT scan_results_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- Name: scan_results scan_results_imaging_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_results
    ADD CONSTRAINT scan_results_imaging_id_fkey FOREIGN KEY (imaging_id) REFERENCES public.imaging_catalogue(id);


--
-- Name: scan_results scan_results_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_results
    ADD CONSTRAINT scan_results_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: scan_results scan_results_radiologist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_results
    ADD CONSTRAINT scan_results_radiologist_id_fkey FOREIGN KEY (radiologist_id) REFERENCES public.staff(id);


--
-- Name: scan_results scan_results_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_results
    ADD CONSTRAINT scan_results_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.radiology_requests(request_id);


--
-- Name: service_price_audit service_price_audit_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_price_audit
    ADD CONSTRAINT service_price_audit_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.staff(id);


--
-- Name: shift_handover shift_handover_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handover
    ADD CONSTRAINT shift_handover_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: shift_handover shift_handover_from_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handover
    ADD CONSTRAINT shift_handover_from_nurse_id_fkey FOREIGN KEY (from_nurse_id) REFERENCES public.staff(id);


--
-- Name: shift_handover shift_handover_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handover
    ADD CONSTRAINT shift_handover_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: shift_handover shift_handover_to_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handover
    ADD CONSTRAINT shift_handover_to_nurse_id_fkey FOREIGN KEY (to_nurse_id) REFERENCES public.staff(id);


--
-- Name: shift_handovers shift_handovers_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handovers
    ADD CONSTRAINT shift_handovers_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: shift_handovers shift_handovers_incoming_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handovers
    ADD CONSTRAINT shift_handovers_incoming_nurse_id_fkey FOREIGN KEY (incoming_nurse_id) REFERENCES public.staff(id);


--
-- Name: shift_handovers shift_handovers_outgoing_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handovers
    ADD CONSTRAINT shift_handovers_outgoing_nurse_id_fkey FOREIGN KEY (outgoing_nurse_id) REFERENCES public.staff(id);


--
-- Name: shift_handovers shift_handovers_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_handovers
    ADD CONSTRAINT shift_handovers_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: staff staff_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: staff staff_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- Name: system_configurations system_configurations_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.config_categories(id);


--
-- Name: treatment_plans treatment_plans_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: treatment_plans treatment_plans_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(consultation_id) ON DELETE SET NULL;


--
-- Name: treatment_plans treatment_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: treatment_plans treatment_plans_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: treatment_plans treatment_plans_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: treatment_plans treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatment_plans treatment_plans_viewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_viewed_by_fkey FOREIGN KEY (viewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: treatment_tasks treatment_tasks_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: treatment_tasks treatment_tasks_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: treatment_tasks treatment_tasks_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: treatment_tasks treatment_tasks_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatment_tasks treatment_tasks_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: treatment_tasks treatment_tasks_started_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_tasks
    ADD CONSTRAINT treatment_tasks_started_by_fkey FOREIGN KEY (started_by) REFERENCES public.staff(id);


--
-- Name: triage_assessments triage_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT triage_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: triage_assessments triage_assessments_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT triage_assessments_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: triage_assessments triage_assessments_triaged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT triage_assessments_triaged_by_fkey FOREIGN KEY (triaged_by) REFERENCES public.staff(id);


--
-- Name: triage_assessments triage_assessments_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.triage_assessments
    ADD CONSTRAINT triage_assessments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE CASCADE;


--
-- Name: visits visits_attending_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_attending_doctor_id_fkey FOREIGN KEY (attending_doctor_id) REFERENCES public.staff(id);


--
-- Name: visits visits_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id);


--
-- Name: visits visits_nhis_auth_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_nhis_auth_id_fkey FOREIGN KEY (nhis_auth_id) REFERENCES public.nhis_authorizations(id);


--
-- Name: visits visits_nhis_override_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_nhis_override_by_fkey FOREIGN KEY (nhis_override_by) REFERENCES public.staff(id);


--
-- Name: visits visits_nhis_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_nhis_verified_by_fkey FOREIGN KEY (nhis_verified_by) REFERENCES public.staff(id);


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: visits visits_referring_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_referring_clinic_id_fkey FOREIGN KEY (referring_clinic_id) REFERENCES public.clinics(id);


--
-- Name: visits visits_referring_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_referring_doctor_id_fkey FOREIGN KEY (referring_doctor_id) REFERENCES public.staff(id);


--
-- Name: visits visits_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.staff(id);


--
-- Name: visits visits_source_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_source_referral_id_fkey FOREIGN KEY (source_referral_id) REFERENCES public.clinical_requests(id);


--
-- Name: vitals vitals_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: vitals vitals_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: vitals vitals_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES public.staff(id);


--
-- Name: vitals vitals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: vitals vitals_patient_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_patient_uuid_fkey FOREIGN KEY (patient_uuid) REFERENCES public.patients(id);


--
-- Name: vitals vitals_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.patient_vital_schedules(id);


--
-- Name: ward_round_notes ward_round_notes_admission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_admission_id_fkey FOREIGN KEY (admission_id) REFERENCES public.admissions(id) ON DELETE CASCADE;


--
-- Name: ward_round_notes ward_round_notes_attending_physician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_attending_physician_id_fkey FOREIGN KEY (attending_physician_id) REFERENCES public.staff(id);


--
-- Name: ward_round_notes ward_round_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: ward_round_notes ward_round_notes_encounter_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_encounter_fk FOREIGN KEY (encounter_id) REFERENCES public.visits(id) ON DELETE RESTRICT;


--
-- Name: ward_round_notes ward_round_notes_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.visits(id);


--
-- Name: ward_round_notes ward_round_notes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ward_round_notes
    ADD CONSTRAINT ward_round_notes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: wards wards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: wards wards_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;


--
-- Name: wards wards_head_nurse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_head_nurse_id_fkey FOREIGN KEY (head_nurse_id) REFERENCES public.staff(id);


--
-- Name: wards wards_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wards
    ADD CONSTRAINT wards_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: workflow_exceptions workflow_exceptions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_exceptions
    ADD CONSTRAINT workflow_exceptions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: workflow_exceptions workflow_exceptions_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_exceptions
    ADD CONSTRAINT workflow_exceptions_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.staff(id);


--
-- Name: facilities Admins can manage facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage facilities" ON public.facilities USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))));


--
-- Name: procedure_catalogue Admins can manage procedure catalogue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage procedure catalogue" ON public.procedure_catalogue USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))));


--
-- Name: wards Admins can manage wards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage wards" ON public.wards TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))));


--
-- Name: wards All authenticated can view wards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated can view wards" ON public.wards FOR SELECT TO authenticated USING (true);


--
-- Name: procedure_catalogue All staff can view procedure catalogue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view procedure catalogue" ON public.procedure_catalogue FOR SELECT USING (((facility_id IS NULL) OR (facility_id IN ( SELECT staff.facility_id
   FROM public.staff
  WHERE (staff.user_id = auth.uid())))));


--
-- Name: courses Allow admin to manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin to manage courses" ON public.courses TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'medical_director'::public.user_role, 'config_admin'::public.user_role]))))));


--
-- Name: appointments Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.appointments USING (true) WITH CHECK (true);


--
-- Name: billing_items Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.billing_items USING (true) WITH CHECK (true);


--
-- Name: billing_orders Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.billing_orders USING (true) WITH CHECK (true);


--
-- Name: clinics Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.clinics USING (true) WITH CHECK (true);


--
-- Name: config_categories Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.config_categories USING (true) WITH CHECK (true);


--
-- Name: consultations Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.consultations USING (true) WITH CHECK (true);


--
-- Name: customer_feedback Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.customer_feedback USING (true) WITH CHECK (true);


--
-- Name: departments Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.departments USING (true) WITH CHECK (true);


--
-- Name: dispense_items Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.dispense_items USING (true) WITH CHECK (true);


--
-- Name: dispenses Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.dispenses USING (true) WITH CHECK (true);


--
-- Name: drug_catalogue Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.drug_catalogue USING (true) WITH CHECK (true);


--
-- Name: imaging_catalogue Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.imaging_catalogue USING (true) WITH CHECK (true);


--
-- Name: inventory_categories Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.inventory_categories USING (true) WITH CHECK (true);


--
-- Name: inventory_items Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.inventory_items USING (true) WITH CHECK (true);


--
-- Name: lab_request_items Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.lab_request_items USING (true) WITH CHECK (true);


--
-- Name: lab_requests Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.lab_requests USING (true) WITH CHECK (true);


--
-- Name: lab_results Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.lab_results USING (true) WITH CHECK (true);


--
-- Name: lab_test_catalogue Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.lab_test_catalogue USING (true) WITH CHECK (true);


--
-- Name: medical_reports Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.medical_reports USING (true) WITH CHECK (true);


--
-- Name: notifications Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.notifications USING (true) WITH CHECK (true);


--
-- Name: patients Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.patients USING (true) WITH CHECK (true);


--
-- Name: payments Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.payments USING (true) WITH CHECK (true);


--
-- Name: prescription_items Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.prescription_items USING (true) WITH CHECK (true);


--
-- Name: prescriptions Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.prescriptions USING (true) WITH CHECK (true);


--
-- Name: queue Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.queue USING (true) WITH CHECK (true);


--
-- Name: radiology_request_items Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.radiology_request_items USING (true) WITH CHECK (true);


--
-- Name: radiology_requests Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.radiology_requests USING (true) WITH CHECK (true);


--
-- Name: referrals Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.referrals USING (true) WITH CHECK (true);


--
-- Name: report_templates Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.report_templates USING (true) WITH CHECK (true);


--
-- Name: scan_results Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.scan_results USING (true) WITH CHECK (true);


--
-- Name: staff Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.staff USING (true) WITH CHECK (true);


--
-- Name: system_configurations Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.system_configurations USING (true) WITH CHECK (true);


--
-- Name: triage_assessments Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.triage_assessments USING (true) WITH CHECK (true);


--
-- Name: visits Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.visits USING (true) WITH CHECK (true);


--
-- Name: workflow_exceptions Allow all access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access" ON public.workflow_exceptions USING (true) WITH CHECK (true);


--
-- Name: courses Allow read access to courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to courses" ON public.courses FOR SELECT TO authenticated USING (true);


--
-- Name: queue_daily_counters Authenticated users can insert queue counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert queue counters" ON public.queue_daily_counters FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: queue_daily_counters Authenticated users can read queue counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read queue counters" ON public.queue_daily_counters FOR SELECT TO authenticated USING (true);


--
-- Name: queue_daily_counters Authenticated users can update queue counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update queue counters" ON public.queue_daily_counters FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: facilities Authenticated users can view facilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view facilities" ON public.facilities FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: procedure_catalogue Authenticated users can view procedures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view procedures" ON public.procedure_catalogue FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: procedure_consumables Clinical staff can manage consumables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clinical staff can manage consumables" ON public.procedure_consumables USING ((EXISTS ( SELECT 1
   FROM (public.staff s
     JOIN public.procedures p ON ((p.facility_id = s.facility_id)))
  WHERE ((s.user_id = auth.uid()) AND (s.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'doctor'::public.user_role, 'nurse'::public.user_role])) AND (p.id = procedure_consumables.procedure_id)))));


--
-- Name: admissions Clinical staff can view admissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clinical staff can view admissions" ON public.admissions FOR SELECT USING ((facility_id IN ( SELECT staff.facility_id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: procedure_consumables Clinical staff can view consumables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clinical staff can view consumables" ON public.procedure_consumables FOR SELECT USING ((procedure_id IN ( SELECT procedures.id
   FROM public.procedures
  WHERE (procedures.facility_id IN ( SELECT staff.facility_id
           FROM public.staff
          WHERE (staff.user_id = auth.uid()))))));


--
-- Name: procedures Clinical staff can view procedures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clinical staff can view procedures" ON public.procedures FOR SELECT USING ((facility_id IN ( SELECT staff.facility_id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: bed_transfers Clinical staff can view transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clinical staff can view transfers" ON public.bed_transfers FOR SELECT USING ((admission_id IN ( SELECT admissions.id
   FROM public.admissions
  WHERE (admissions.facility_id IN ( SELECT staff.facility_id
           FROM public.staff
          WHERE (staff.user_id = auth.uid()))))));


--
-- Name: ward_round_notes Clinical staff can view ward round notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clinical staff can view ward round notes" ON public.ward_round_notes FOR SELECT USING ((admission_id IN ( SELECT admissions.id
   FROM public.admissions
  WHERE (admissions.facility_id IN ( SELECT staff.facility_id
           FROM public.staff
          WHERE (staff.user_id = auth.uid()))))));


--
-- Name: admissions Doctors and nurses can manage admissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors and nurses can manage admissions" ON public.admissions USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'doctor'::public.user_role, 'nurse'::public.user_role])) AND (staff.facility_id = admissions.facility_id)))));


--
-- Name: procedures Doctors can manage procedures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can manage procedures" ON public.procedures USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'doctor'::public.user_role])) AND (staff.facility_id = procedures.facility_id)))));


--
-- Name: ward_round_notes Doctors can manage ward round notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Doctors can manage ward round notes" ON public.ward_round_notes USING ((EXISTS ( SELECT 1
   FROM (public.staff s
     JOIN public.admissions a ON ((a.facility_id = s.facility_id)))
  WHERE ((s.user_id = auth.uid()) AND (s.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'doctor'::public.user_role])) AND (a.id = ward_round_notes.admission_id)))));


--
-- Name: beds Nurses and admins can manage beds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Nurses and admins can manage beds" ON public.beds USING ((EXISTS ( SELECT 1
   FROM (public.staff s
     JOIN public.wards w ON ((w.facility_id = s.facility_id)))
  WHERE ((s.user_id = auth.uid()) AND (s.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'nurse'::public.user_role])) AND (w.id = beds.ward_id)))));


--
-- Name: bed_transfers Nurses and admins can manage transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Nurses and admins can manage transfers" ON public.bed_transfers USING ((EXISTS ( SELECT 1
   FROM (public.staff s
     JOIN public.admissions a ON ((a.facility_id = s.facility_id)))
  WHERE ((s.user_id = auth.uid()) AND (s.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role, 'nurse'::public.user_role])) AND (a.id = bed_transfers.admission_id)))));


--
-- Name: procedure_catalogue Public can view active procedures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active procedures" ON public.procedure_catalogue FOR SELECT TO anon USING ((is_active = true));


--
-- Name: queue_daily_counters Service role can manage queue counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage queue counters" ON public.queue_daily_counters TO service_role USING (true) WITH CHECK (true);


--
-- Name: beds Users can view beds in their facility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view beds in their facility" ON public.beds FOR SELECT USING ((ward_id IN ( SELECT wards.id
   FROM public.wards
  WHERE (wards.facility_id IN ( SELECT staff.facility_id
           FROM public.staff
          WHERE (staff.user_id = auth.uid()))))));


--
-- Name: encounter_access_logs access_logs_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY access_logs_all_access ON public.encounter_access_logs USING (true) WITH CHECK (true);


--
-- Name: admissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

--
-- Name: beds anon_view_beds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_view_beds ON public.beds FOR SELECT TO anon USING ((is_active = true));


--
-- Name: wards anon_view_wards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_view_wards ON public.wards FOR SELECT TO anon USING ((is_active = true));


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: service_price_audit audit_insert_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert_super_admin ON public.service_price_audit FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: service_price_audit audit_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_select_all ON public.service_price_audit FOR SELECT TO authenticated USING (true);


--
-- Name: bed_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bed_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: beds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_audit_log billing_audit_log_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_audit_log_insert_policy ON public.billing_audit_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: billing_audit_log billing_audit_log_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_audit_log_select_policy ON public.billing_audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: billing_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: encounter_care_team care_team_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY care_team_all_access ON public.encounter_care_team USING (true) WITH CHECK (true);


--
-- Name: chief_complaint_catalogue catalogue_modify_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogue_modify_super_admin ON public.chief_complaint_catalogue TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: chief_complaint_catalogue catalogue_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY catalogue_select_all ON public.chief_complaint_catalogue FOR SELECT TO authenticated USING (true);


--
-- Name: chief_complaint_catalogue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chief_complaint_catalogue ENABLE ROW LEVEL SECURITY;

--
-- Name: clinical_request_status_history clinical_request_history_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinical_request_history_insert ON public.clinical_request_status_history FOR INSERT WITH CHECK (true);


--
-- Name: clinical_request_status_history clinical_request_history_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinical_request_history_select ON public.clinical_request_status_history FOR SELECT USING (true);


--
-- Name: clinical_request_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinical_request_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: clinical_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinical_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: clinical_requests clinical_requests_insert_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinical_requests_insert_v2 ON public.clinical_requests FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['doctor'::public.user_role, 'super_admin'::public.user_role])) AND (encounter_id IS NOT NULL)));


--
-- Name: clinical_requests clinical_requests_select_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinical_requests_select_v2 ON public.clinical_requests FOR SELECT TO authenticated USING (public.has_clinical_access());


--
-- Name: clinical_requests clinical_requests_update_v2; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinical_requests_update_v2 ON public.clinical_requests FOR UPDATE TO authenticated USING (((requesting_doctor_id = public.get_current_staff_id()) OR (target_doctor_id = public.get_current_staff_id()) OR (public.get_current_user_role() = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role]))));


--
-- Name: clinics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

--
-- Name: clinics clinics_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinics_select_all ON public.clinics FOR SELECT TO authenticated USING (true);


--
-- Name: clinics clinics_update_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clinics_update_super_admin ON public.clinics FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: config_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.config_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations consultations_insert_doctor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultations_insert_doctor ON public.consultations FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['doctor'::public.user_role, 'super_admin'::public.user_role])) AND (encounter_id IS NOT NULL)));


--
-- Name: consultations consultations_select_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultations_select_clinical ON public.consultations FOR SELECT TO authenticated USING ((public.has_clinical_access() OR public.is_on_care_team(encounter_id)));


--
-- Name: consultations consultations_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consultations_update_owner ON public.consultations FOR UPDATE TO authenticated USING (((doctor_uuid = public.get_current_staff_id()) OR (public.get_current_user_role() = 'super_admin'::public.user_role))) WITH CHECK (((doctor_uuid = public.get_current_staff_id()) OR (public.get_current_user_role() = 'super_admin'::public.user_role)));


--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_progress_notes daily_progress_notes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_progress_notes_insert ON public.daily_progress_notes FOR INSERT WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: daily_progress_notes daily_progress_notes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_progress_notes_select ON public.daily_progress_notes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: daily_progress_notes daily_progress_notes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_progress_notes_update ON public.daily_progress_notes FOR UPDATE USING (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id))) WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: dental_chart; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dental_chart ENABLE ROW LEVEL SECURITY;

--
-- Name: dental_chart dental_chart_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dental_chart_all_policy ON public.dental_chart USING ((auth.role() = 'authenticated'::text));


--
-- Name: dental_exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dental_exams ENABLE ROW LEVEL SECURITY;

--
-- Name: dental_exams dental_exams_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dental_exams_insert_policy ON public.dental_exams FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: dental_exams dental_exams_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dental_exams_select_policy ON public.dental_exams FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: dental_exams dental_exams_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dental_exams_update_policy ON public.dental_exams FOR UPDATE USING (((auth.role() = 'authenticated'::text) AND (finalized_at IS NULL)));


--
-- Name: dental_prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dental_prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: dental_prescriptions dental_prescriptions_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dental_prescriptions_all_policy ON public.dental_prescriptions USING ((auth.role() = 'authenticated'::text));


--
-- Name: dental_procedures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dental_procedures ENABLE ROW LEVEL SECURITY;

--
-- Name: dental_procedures dental_procedures_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dental_procedures_all_policy ON public.dental_procedures USING ((auth.role() = 'authenticated'::text));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: dispense_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dispense_items ENABLE ROW LEVEL SECURITY;

--
-- Name: dispenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dispenses ENABLE ROW LEVEL SECURITY;

--
-- Name: drug_catalogue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drug_catalogue ENABLE ROW LEVEL SECURITY;

--
-- Name: drug_catalogue drug_insert_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drug_insert_super_admin ON public.drug_catalogue FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: drug_catalogue drug_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drug_select_all ON public.drug_catalogue FOR SELECT TO authenticated USING (true);


--
-- Name: drug_catalogue drug_update_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY drug_update_super_admin ON public.drug_catalogue FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: encounter_access_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.encounter_access_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: encounter_care_team; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.encounter_care_team ENABLE ROW LEVEL SECURITY;

--
-- Name: encounter_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.encounter_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: external_referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: external_referrals external_referrals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY external_referrals_insert ON public.external_referrals FOR INSERT WITH CHECK (true);


--
-- Name: external_referrals external_referrals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY external_referrals_select ON public.external_referrals FOR SELECT USING (true);


--
-- Name: external_referrals external_referrals_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY external_referrals_update ON public.external_referrals FOR UPDATE USING (true);


--
-- Name: eye_exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eye_exams ENABLE ROW LEVEL SECURITY;

--
-- Name: eye_exams eye_exams_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eye_exams_insert_policy ON public.eye_exams FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: eye_exams eye_exams_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eye_exams_select_policy ON public.eye_exams FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: eye_exams eye_exams_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eye_exams_update_policy ON public.eye_exams FOR UPDATE USING (((auth.role() = 'authenticated'::text) AND (finalized_at IS NULL)));


--
-- Name: eye_prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eye_prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: eye_prescriptions eye_prescriptions_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eye_prescriptions_all_policy ON public.eye_prescriptions USING ((auth.role() = 'authenticated'::text));


--
-- Name: eye_procedures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eye_procedures ENABLE ROW LEVEL SECURITY;

--
-- Name: eye_procedures eye_procedures_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY eye_procedures_all_policy ON public.eye_procedures USING ((auth.role() = 'authenticated'::text));


--
-- Name: facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: icd10_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: icd10_codes icd10_codes_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY icd10_codes_read_all ON public.icd10_codes FOR SELECT TO authenticated USING (true);


--
-- Name: icd10_codes icd10_codes_service_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY icd10_codes_service_write ON public.icd10_codes TO service_role USING (true) WITH CHECK (true);


--
-- Name: imaging_catalogue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.imaging_catalogue ENABLE ROW LEVEL SECURITY;

--
-- Name: imaging_catalogue imaging_insert_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY imaging_insert_super_admin ON public.imaging_catalogue FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: imaging_catalogue imaging_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY imaging_select_all ON public.imaging_catalogue FOR SELECT TO authenticated USING (true);


--
-- Name: imaging_catalogue imaging_update_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY imaging_update_super_admin ON public.imaging_catalogue FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: inventory_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_test_catalogue lab_insert_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_insert_super_admin ON public.lab_test_catalogue FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: lab_request_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_request_items ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_request_items lab_request_items_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_request_items_all_access ON public.lab_request_items USING (true) WITH CHECK (true);


--
-- Name: lab_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_requests lab_requests_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_requests_all_access ON public.lab_requests USING (true) WITH CHECK (true);


--
-- Name: lab_requests lab_requests_insert_doctor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_requests_insert_doctor ON public.lab_requests FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['doctor'::public.user_role, 'super_admin'::public.user_role])) AND (encounter_id IS NOT NULL)));


--
-- Name: lab_requests lab_requests_select_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_requests_select_clinical ON public.lab_requests FOR SELECT TO authenticated USING ((public.has_clinical_access() OR public.is_on_care_team(encounter_id)));


--
-- Name: lab_requests lab_requests_update_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_requests_update_authorized ON public.lab_requests FOR UPDATE TO authenticated USING (((ordered_by_uuid = public.get_current_staff_id()) OR (public.get_current_user_role() = ANY (ARRAY['lab_technician'::public.user_role, 'super_admin'::public.user_role])))) WITH CHECK (((ordered_by_uuid = public.get_current_staff_id()) OR (public.get_current_user_role() = ANY (ARRAY['lab_technician'::public.user_role, 'super_admin'::public.user_role]))));


--
-- Name: lab_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_results lab_results_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_results_all_access ON public.lab_results USING (true) WITH CHECK (true);


--
-- Name: lab_test_catalogue lab_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_select_all ON public.lab_test_catalogue FOR SELECT TO authenticated USING (true);


--
-- Name: lab_test_catalogue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_test_catalogue ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_test_catalogue lab_test_catalogue_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_test_catalogue_all_access ON public.lab_test_catalogue USING (true) WITH CHECK (true);


--
-- Name: lab_test_catalogue lab_update_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_update_super_admin ON public.lab_test_catalogue FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.role = 'super_admin'::public.user_role)))));


--
-- Name: medication_administration med_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_admin_insert ON public.medication_administration FOR INSERT WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: medication_administration med_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_admin_select ON public.medication_administration FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: medication_administration med_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_admin_update ON public.medication_administration FOR UPDATE USING (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id))) WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: medical_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: medication_administration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medication_administration ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_approvals nhis_approvals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_approvals_insert ON public.nhis_approvals FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_approvals nhis_approvals_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_approvals_policy ON public.nhis_approvals TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_approvals nhis_approvals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_approvals_select ON public.nhis_approvals FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_approvals nhis_approvals_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_approvals_update ON public.nhis_approvals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_audit_log nhis_audit_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_audit_log_insert ON public.nhis_audit_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_audit_log nhis_audit_log_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_audit_log_insert_policy ON public.nhis_audit_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_audit_log nhis_audit_log_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_audit_log_read_policy ON public.nhis_audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_audit_log nhis_audit_log_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_audit_log_select ON public.nhis_audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_authorizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_authorizations ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_authorizations nhis_authorizations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_authorizations_insert ON public.nhis_authorizations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_authorizations nhis_authorizations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_authorizations_policy ON public.nhis_authorizations TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_authorizations nhis_authorizations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_authorizations_select ON public.nhis_authorizations FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_authorizations nhis_authorizations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_authorizations_update ON public.nhis_authorizations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_claims nhis_claims_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_claims_insert ON public.nhis_claims FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_claims nhis_claims_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_claims_policy ON public.nhis_claims TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_claims nhis_claims_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_claims_select ON public.nhis_claims FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_claims nhis_claims_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_claims_update ON public.nhis_claims FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_config ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_config nhis_config_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_config_admin_only ON public.nhis_config TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'billing_clerk'::public.user_role]))) WITH CHECK ((public.get_current_user_role() = 'super_admin'::public.user_role));


--
-- Name: nhis_policy_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_policy_config ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_policy_config nhis_policy_config_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_policy_config_insert ON public.nhis_policy_config FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_policy_config nhis_policy_config_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_policy_config_select ON public.nhis_policy_config FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_policy_config nhis_policy_config_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_policy_config_update ON public.nhis_policy_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_postings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_postings ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_postings nhis_postings_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_postings_policy ON public.nhis_postings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_profiles nhis_profiles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_profiles_insert ON public.nhis_profiles FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_profiles nhis_profiles_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_profiles_policy ON public.nhis_profiles TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_profiles nhis_profiles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_profiles_select ON public.nhis_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_profiles nhis_profiles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_profiles_update ON public.nhis_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_referral_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nhis_referral_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: nhis_referral_queue nhis_referral_queue_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_referral_queue_delete ON public.nhis_referral_queue FOR DELETE TO authenticated USING (true);


--
-- Name: nhis_referral_queue nhis_referral_queue_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_referral_queue_insert ON public.nhis_referral_queue FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nhis_referral_queue nhis_referral_queue_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_referral_queue_policy ON public.nhis_referral_queue TO authenticated USING (true) WITH CHECK (true);


--
-- Name: nhis_referral_queue nhis_referral_queue_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_referral_queue_select ON public.nhis_referral_queue FOR SELECT TO authenticated USING (true);


--
-- Name: nhis_referral_queue nhis_referral_queue_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nhis_referral_queue_update ON public.nhis_referral_queue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_policy ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: notifications notifications_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_policy ON public.notifications FOR SELECT USING (((target_user_id = auth.uid()) OR (target_user_id IS NULL)));


--
-- Name: notifications notifications_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_policy ON public.notifications FOR UPDATE USING (((target_user_id = auth.uid()) OR (target_user_id IS NULL)));


--
-- Name: nursing_audit_log nursing_audit_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_audit_admin_only ON public.nursing_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'medical_director'::public.user_role]))))));


--
-- Name: nursing_audit_log nursing_audit_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_audit_insert ON public.nursing_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: nursing_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nursing_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: nursing_interventions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nursing_interventions ENABLE ROW LEVEL SECURITY;

--
-- Name: nursing_interventions nursing_interventions_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_interventions_delete_policy ON public.nursing_interventions FOR DELETE USING (((nurse_id = ( SELECT staff.id
   FROM public.staff
  WHERE ((staff.email)::text = (auth.jwt() ->> 'email'::text)))) AND (created_at > (now() - '08:00:00'::interval))));


--
-- Name: nursing_interventions nursing_interventions_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_interventions_insert_policy ON public.nursing_interventions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.id = nursing_interventions.nurse_id) AND ((s.role)::text = ANY (ARRAY['nurse'::text, 'senior_nurse'::text, 'nurse_manager'::text, 'admin'::text, 'super_admin'::text, 'doctor'::text, 'medical_director'::text]))))));


--
-- Name: nursing_interventions nursing_interventions_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_interventions_select_policy ON public.nursing_interventions FOR SELECT USING (true);


--
-- Name: nursing_interventions nursing_interventions_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_interventions_update_policy ON public.nursing_interventions FOR UPDATE USING (((nurse_id = ( SELECT staff.id
   FROM public.staff
  WHERE ((staff.email)::text = (auth.jwt() ->> 'email'::text)))) AND (created_at > (now() - '08:00:00'::interval))));


--
-- Name: nursing_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nursing_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: nursing_notes nursing_notes_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_delete_policy ON public.nursing_notes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: nursing_notes nursing_notes_insert_nurse; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_insert_nurse ON public.nursing_notes FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['nurse'::public.user_role, 'doctor'::public.user_role, 'super_admin'::public.user_role])) AND (encounter_id IS NOT NULL)));


--
-- Name: nursing_notes nursing_notes_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_insert_policy ON public.nursing_notes FOR INSERT WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: nursing_notes nursing_notes_select_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_select_clinical ON public.nursing_notes FOR SELECT TO authenticated USING (public.has_clinical_access());


--
-- Name: nursing_notes nursing_notes_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_select_policy ON public.nursing_notes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: nursing_notes nursing_notes_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_update_owner ON public.nursing_notes FOR UPDATE TO authenticated USING ((((recorded_by = public.get_current_staff_id()) AND (created_at > (now() - '24:00:00'::interval))) OR (public.get_current_user_role() = 'super_admin'::public.user_role)));


--
-- Name: nursing_notes nursing_notes_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nursing_notes_update_policy ON public.nursing_notes FOR UPDATE USING (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id) AND ((recorded_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'medical_director'::public.user_role])))))))) WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: on_call_schedule on_call_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY on_call_all_access ON public.on_call_schedule USING (true) WITH CHECK (true);


--
-- Name: on_call_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.on_call_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_chief_complaints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_chief_complaints ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_vital_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_vital_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_chief_complaints pcc_delete_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pcc_delete_all ON public.patient_chief_complaints FOR DELETE TO authenticated USING (true);


--
-- Name: patient_chief_complaints pcc_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pcc_insert_all ON public.patient_chief_complaints FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: patient_chief_complaints pcc_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pcc_select_all ON public.patient_chief_complaints FOR SELECT TO authenticated USING (true);


--
-- Name: patient_chief_complaints pcc_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pcc_update_all ON public.patient_chief_complaints FOR UPDATE TO authenticated USING (true);


--
-- Name: physio_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.physio_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: physio_assessments physio_assessments_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_assessments_insert_policy ON public.physio_assessments FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: physio_assessments physio_assessments_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_assessments_select_policy ON public.physio_assessments FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: physio_assessments physio_assessments_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_assessments_update_policy ON public.physio_assessments FOR UPDATE USING (((auth.role() = 'authenticated'::text) AND (finalized_at IS NULL)));


--
-- Name: physio_discharge; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.physio_discharge ENABLE ROW LEVEL SECURITY;

--
-- Name: physio_discharge physio_discharge_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_discharge_all_policy ON public.physio_discharge USING ((auth.role() = 'authenticated'::text));


--
-- Name: physio_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.physio_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: physio_plans physio_plans_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_plans_all_policy ON public.physio_plans USING ((auth.role() = 'authenticated'::text));


--
-- Name: physio_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.physio_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: physio_progress physio_progress_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_progress_all_policy ON public.physio_progress USING ((auth.role() = 'authenticated'::text));


--
-- Name: physio_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.physio_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: physio_sessions physio_sessions_all_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY physio_sessions_all_policy ON public.physio_sessions USING ((auth.role() = 'authenticated'::text));


--
-- Name: prescription_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions prescriptions_insert_doctor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_insert_doctor ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['doctor'::public.user_role, 'super_admin'::public.user_role])) AND (encounter_id IS NOT NULL)));


--
-- Name: prescriptions prescriptions_select_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_select_clinical ON public.prescriptions FOR SELECT TO authenticated USING ((public.has_clinical_access() OR public.is_on_care_team(encounter_id)));


--
-- Name: prescriptions prescriptions_update_authorized; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_update_authorized ON public.prescriptions FOR UPDATE TO authenticated USING (((doctor_uuid = public.get_current_staff_id()) OR (public.get_current_user_role() = ANY (ARRAY['pharmacist'::public.user_role, 'super_admin'::public.user_role])))) WITH CHECK (((doctor_uuid = public.get_current_staff_id()) OR (public.get_current_user_role() = ANY (ARRAY['pharmacist'::public.user_role, 'super_admin'::public.user_role]))));


--
-- Name: procedure_catalogue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procedure_catalogue ENABLE ROW LEVEL SECURITY;

--
-- Name: procedure_consumables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procedure_consumables ENABLE ROW LEVEL SECURITY;

--
-- Name: procedures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

--
-- Name: queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.queue ENABLE ROW LEVEL SECURITY;

--
-- Name: queue_daily_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.queue_daily_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: radiology_request_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.radiology_request_items ENABLE ROW LEVEL SECURITY;

--
-- Name: radiology_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.radiology_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_outcomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_outcomes referral_outcomes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY referral_outcomes_insert ON public.referral_outcomes FOR INSERT WITH CHECK (true);


--
-- Name: referral_outcomes referral_outcomes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY referral_outcomes_select ON public.referral_outcomes FOR SELECT USING (true);


--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: report_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

--
-- Name: service_price_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_price_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_configurations shift_config_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_config_select_policy ON public.shift_configurations FOR SELECT USING (true);


--
-- Name: shift_configurations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_handover; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_handover ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_handover shift_handover_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handover_insert ON public.shift_handover FOR INSERT WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id) AND (EXISTS ( SELECT 1
   FROM public.staff
  WHERE (((staff.user_id = auth.uid()) OR (staff.id = auth.uid())) AND (staff.role = 'nurse'::public.user_role))))));


--
-- Name: shift_handover shift_handover_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handover_select ON public.shift_handover FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: shift_handover shift_handover_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handover_update ON public.shift_handover FOR UPDATE USING (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id))) WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: shift_handovers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

--
-- Name: shift_handovers shift_handovers_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handovers_insert ON public.shift_handovers FOR INSERT WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id) AND (EXISTS ( SELECT 1
   FROM public.staff
  WHERE (((staff.user_id = auth.uid()) OR (staff.id = auth.uid())) AND (staff.role = 'nurse'::public.user_role))))));


--
-- Name: shift_handovers shift_handovers_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handovers_insert_policy ON public.shift_handovers FOR INSERT WITH CHECK (true);


--
-- Name: shift_handovers shift_handovers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handovers_select ON public.shift_handovers FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: shift_handovers shift_handovers_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handovers_select_policy ON public.shift_handovers FOR SELECT USING (true);


--
-- Name: shift_handovers shift_handovers_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handovers_update ON public.shift_handovers FOR UPDATE USING (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id))) WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: shift_handovers shift_handovers_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shift_handovers_update_policy ON public.shift_handovers FOR UPDATE USING (true);


--
-- Name: staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

--
-- Name: system_configurations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: system_configurations system_configurations_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_configurations_admin_only ON public.system_configurations TO authenticated USING ((public.get_current_user_role() = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role]))) WITH CHECK ((public.get_current_user_role() = 'super_admin'::public.user_role));


--
-- Name: encounter_transfers transfers_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transfers_all_access ON public.encounter_transfers USING (true) WITH CHECK (true);


--
-- Name: treatment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_plans treatment_plans_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatment_plans_insert ON public.treatment_plans FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['doctor'::public.user_role, 'medical_director'::public.user_role, 'super_admin'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: treatment_plans treatment_plans_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatment_plans_select ON public.treatment_plans FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: treatment_plans treatment_plans_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatment_plans_update ON public.treatment_plans FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['doctor'::public.user_role, 'medical_director'::public.user_role, 'super_admin'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: treatment_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_tasks treatment_tasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatment_tasks_insert ON public.treatment_tasks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['doctor'::public.user_role, 'medical_director'::public.user_role, 'super_admin'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: treatment_tasks treatment_tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatment_tasks_select ON public.treatment_tasks FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: treatment_tasks treatment_tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatment_tasks_update ON public.treatment_tasks FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['doctor'::public.user_role, 'medical_director'::public.user_role, 'super_admin'::public.user_role, 'admin'::public.user_role]))))) OR ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = 'nurse'::public.user_role)))) AND (encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id))));


--
-- Name: triage_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: vital_schedule_configs vital_configs_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vital_configs_select_policy ON public.vital_schedule_configs FOR SELECT USING (true);


--
-- Name: vital_schedule_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vital_schedule_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_vital_schedules vital_schedules_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vital_schedules_insert_policy ON public.patient_vital_schedules FOR INSERT WITH CHECK (true);


--
-- Name: patient_vital_schedules vital_schedules_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vital_schedules_select_policy ON public.patient_vital_schedules FOR SELECT USING (true);


--
-- Name: patient_vital_schedules vital_schedules_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vital_schedules_update_policy ON public.patient_vital_schedules FOR UPDATE USING (true);


--
-- Name: vitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

--
-- Name: vitals vitals_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_admin_delete ON public.vitals FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: vitals vitals_insert_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_insert_clinical ON public.vitals FOR INSERT TO authenticated WITH CHECK (((public.get_current_user_role() = ANY (ARRAY['nurse'::public.user_role, 'doctor'::public.user_role, 'super_admin'::public.user_role])) AND (encounter_id IS NOT NULL)));


--
-- Name: vitals vitals_nurse_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_nurse_insert ON public.vitals FOR INSERT WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: vitals vitals_nurse_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_nurse_select ON public.vitals FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: vitals vitals_nurse_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_nurse_update ON public.vitals FOR UPDATE USING (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id))) WITH CHECK (((encounter_id IS NOT NULL) AND public.is_encounter_writable(encounter_id)));


--
-- Name: vitals vitals_select_clinical; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_select_clinical ON public.vitals FOR SELECT TO authenticated USING (public.has_clinical_access());


--
-- Name: vitals vitals_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vitals_update_owner ON public.vitals FOR UPDATE TO authenticated USING ((((nurse_id = public.get_current_staff_id()) AND (date_recorded > (now() - '24:00:00'::interval))) OR (public.get_current_user_role() = 'super_admin'::public.user_role)));


--
-- Name: ward_round_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ward_round_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: wards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_exceptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_exceptions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


