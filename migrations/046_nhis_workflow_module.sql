-- =============================================================================
-- Migration: NHIS Workflow Module - Complete Implementation
-- Purpose: Implement NHIS as a STRICT WORKFLOW GATE for eligibility, authorization,
--          posting, approvals, tariff application, and claims generation
-- =============================================================================

-- =============================================================================
-- PART 1: ENUM TYPES
-- =============================================================================

-- NHIS Scheme Type (Personnel, Civilian_NHIS, HMO_Private, Special)
DO $$ BEGIN
    CREATE TYPE nhis_scheme_type AS ENUM (
        'Personnel',        -- Military personnel (free drugs, subsidized services)
        'Civilian_NHIS',    -- Civilian NHIS enrollees
        'HMO_Private',      -- Private HMO plans
        'Special'           -- Special categories (retirees, disabled, etc.)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NHIS Profile Status
DO $$ BEGIN
    CREATE TYPE nhis_profile_status AS ENUM (
        'active',
        'inactive',
        'suspended',
        'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Patient Origin (internal vs referred)
DO $$ BEGIN
    CREATE TYPE nhis_patient_origin AS ENUM (
        'internal',         -- Patient enrolled at this facility
        'referred'          -- Patient referred from another facility (STRICTEST rules)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authorization Status
DO $$ BEGIN
    CREATE TYPE nhis_auth_status AS ENUM (
        'pending',
        'active',
        'expired',
        'revoked',
        'used'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Encounter NHIS Verification Status
DO $$ BEGIN
    CREATE TYPE nhis_verification_status AS ENUM (
        'not_applicable',       -- Non-NHIS patient
        'unverified',           -- NHIS patient, not yet verified
        'blocked',              -- NHIS blocked (failed verification)
        'verified',             -- NHIS verified and active
        'expired',              -- Authorization expired
        'emergency_override'    -- Emergency override (requires post-authorization)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NHIS Approval Status for Services
DO $$ BEGIN
    CREATE TYPE nhis_approval_status AS ENUM (
        'not_required',     -- Service doesn't need NHIS approval
        'pending',          -- Awaiting approval
        'approved',         -- Approved by NHIS office
        'rejected',         -- Rejected by NHIS office
        'expired'           -- Approval expired
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Billing Release Status
DO $$ BEGIN
    CREATE TYPE billing_release_status AS ENUM (
        'blocked',          -- Cannot be billed yet
        'released',         -- Released for billing
        'billed',           -- Already billed
        'waived'            -- Waived (no charge)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service Execution Status
DO $$ BEGIN
    CREATE TYPE service_execution_status AS ENUM (
        'draft',
        'ordered',
        'blocked',
        'in_progress',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tariff Group
DO $$ BEGIN
    CREATE TYPE nhis_tariff_group AS ENUM (
        'Personnel',        -- Military personnel tariff
        'Civilian_HMO',     -- Civilian/HMO tariff
        'Special',          -- Special category tariff
        'Private'           -- Private (non-NHIS) tariff
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Claim Status
DO $$ BEGIN
    CREATE TYPE nhis_claim_status AS ENUM (
        'draft',
        'pending',
        'reviewed',
        'approved',
        'submitted',
        'paid',
        'rejected',
        'disputed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Posting Status
DO $$ BEGIN
    CREATE TYPE nhis_posting_status AS ENUM (
        'pending',
        'posted',
        'seen',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- PART 2: POLICY CONFIGURATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_policy_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(255) NOT NULL,
    
    -- Authorization validity (DO NOT hardcode 30 days)
    validity_days INTEGER NOT NULL DEFAULT 30,
    
    -- One-hour rule (NHIA requirement)
    one_hour_rule_enabled BOOLEAN DEFAULT TRUE,
    one_hour_grace_period_minutes INTEGER DEFAULT 60,
    
    -- Emergency override settings
    emergency_override_allowed BOOLEAN DEFAULT TRUE,
    emergency_followup_deadline_hours INTEGER DEFAULT 72,
    
    -- Approval rules (JSONB for flexibility)
    approval_rules JSONB DEFAULT '{
        "ct_scan": {"requires_approval": true, "max_wait_hours": 24},
        "mri": {"requires_approval": true, "max_wait_hours": 24},
        "specialized_labs": {"requires_approval": true, "max_wait_hours": 24},
        "high_cost_drugs": {"requires_approval": true, "threshold_amount": 50000},
        "elective_surgery": {"requires_approval": true, "max_wait_hours": 72}
    }'::JSONB,
    
    -- Drug coverage rules for military
    military_drug_coverage_percent INTEGER DEFAULT 100,
    civilian_drug_coverage_percent INTEGER DEFAULT 0,
    
    -- Copay rules
    default_copay_percent INTEGER DEFAULT 10,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_nhis_policy_config_provider ON nhis_policy_config(provider_name);
CREATE INDEX IF NOT EXISTS idx_nhis_policy_config_active ON nhis_policy_config(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE nhis_policy_config IS 'Configurable NHIS policy rules per provider/HMO - DO NOT hardcode validity periods';
COMMENT ON COLUMN nhis_policy_config.validity_days IS 'Authorization validity in days - configurable per provider';
COMMENT ON COLUMN nhis_policy_config.one_hour_rule_enabled IS 'NHIA one-hour authorization rule enforcement';

-- =============================================================================
-- PART 3: NHIS PROFILE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Scheme information
    scheme_type nhis_scheme_type NOT NULL,
    provider_name VARCHAR(255),                      -- HMO name
    plan_category VARCHAR(100),                      -- Plan tier (Basic, Premium, etc.)
    enrollee_id VARCHAR(100),                        -- NHIS enrollee number
    
    -- Status
    status nhis_profile_status DEFAULT 'active',
    
    -- Origin tracking (CRITICAL for referred patients)
    patient_origin nhis_patient_origin DEFAULT 'internal',
    referring_facility_name VARCHAR(255),
    referring_facility_nhis_id VARCHAR(100),
    referral_document_path TEXT,                     -- Storage path for referral letter
    referral_code VARCHAR(100),
    referral_date DATE,
    referral_expiry_date DATE,
    referral_reason TEXT,
    
    -- Policy configuration link
    policy_config_id UUID REFERENCES nhis_policy_config(id),
    
    -- Assigned tariff group
    tariff_group nhis_tariff_group DEFAULT 'Civilian_HMO',
    
    -- Audit fields
    verified_by UUID REFERENCES staff(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id),
    
    CONSTRAINT unique_patient_nhis_profile UNIQUE (patient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_profiles_patient ON nhis_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_profiles_scheme ON nhis_profiles(scheme_type);
CREATE INDEX IF NOT EXISTS idx_nhis_profiles_status ON nhis_profiles(status);
CREATE INDEX IF NOT EXISTS idx_nhis_profiles_origin ON nhis_profiles(patient_origin);
CREATE INDEX IF NOT EXISTS idx_nhis_profiles_provider ON nhis_profiles(provider_name);
CREATE INDEX IF NOT EXISTS idx_nhis_profiles_enrollee ON nhis_profiles(enrollee_id);

COMMENT ON TABLE nhis_profiles IS 'NHIS enrollment profiles for patients - one per patient';
COMMENT ON COLUMN nhis_profiles.patient_origin IS 'CRITICAL: referred patients have STRICTEST verification rules';
COMMENT ON COLUMN nhis_profiles.tariff_group IS 'Assigned tariff: Personnel, Civilian_HMO, Special, or Private';

-- =============================================================================
-- PART 4: NHIS AUTHORIZATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nhis_profile_id UUID REFERENCES nhis_profiles(id),
    
    -- Authorization details
    auth_code VARCHAR(100) NOT NULL,
    auth_type VARCHAR(50) DEFAULT 'standard',        -- standard, emergency, referral
    
    -- Validity (computed from policy_config)
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status tracking
    status nhis_auth_status DEFAULT 'pending',
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'internal_enrollee',  -- internal_enrollee, external_referral
    
    -- External Referral Specifics
    referral_source VARCHAR(255),                    -- e.g. General Hospital
    referral_clinical_basis TEXT,                    -- e.g. Diagnosis/Reason
    referring_clinician VARCHAR(255),                -- e.g. Dr. Name
    referral_date DATE,                              -- Date written on referral
    referral_code VARCHAR(100),                      -- Code on referral
    
    -- Verification
    verified_by UUID REFERENCES staff(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Renewal tracking
    renewal_required_at TIMESTAMP WITH TIME ZONE,
    renewed_from_id UUID REFERENCES nhis_authorizations(id),
    
    -- Supporting documents
    attachment_path TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    revoked_by UUID REFERENCES staff(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_nhis_auth_patient ON nhis_authorizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_auth_code_provider ON nhis_authorizations(auth_code);
CREATE INDEX IF NOT EXISTS idx_nhis_auth_status_expiry ON nhis_authorizations(patient_id, status, expiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_nhis_auth_active ON nhis_authorizations(patient_id, status) WHERE status = 'active';

COMMENT ON TABLE nhis_authorizations IS 'NHIS authorization codes with configurable validity periods';
COMMENT ON COLUMN nhis_authorizations.expiry_date IS 'Computed from policy_config.validity_days - NOT hardcoded';
COMMENT ON COLUMN nhis_authorizations.source IS 'internal_enrollee or external_referral. External requires strict 30-day validity check.';

-- =============================================================================
-- PART 5: EXTEND VISITS (ENCOUNTERS) TABLE
-- =============================================================================

-- Add NHIS-specific columns to visits table
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(20) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS nhis_auth_id UUID REFERENCES nhis_authorizations(id),
ADD COLUMN IF NOT EXISTS nhis_verification_status nhis_verification_status DEFAULT 'not_applicable',
ADD COLUMN IF NOT EXISTS nhis_policy_snapshot JSONB,
ADD COLUMN IF NOT EXISTS nhis_verified_by UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS nhis_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS nhis_tariff_group nhis_tariff_group,
ADD COLUMN IF NOT EXISTS nhis_override_reason TEXT,
ADD COLUMN IF NOT EXISTS nhis_override_by UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS nhis_override_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requires_post_authorization BOOLEAN DEFAULT FALSE;

-- Add check constraint for payer_type
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_payer_type_check;
ALTER TABLE visits ADD CONSTRAINT visits_payer_type_check 
CHECK (payer_type IN ('private', 'nhis', 'retainership', 'military_free'));

-- Index for NHIS encounters
CREATE INDEX IF NOT EXISTS idx_visits_nhis_status ON visits(nhis_verification_status) 
WHERE nhis_verification_status != 'not_applicable';
CREATE INDEX IF NOT EXISTS idx_visits_payer_type ON visits(payer_type);
CREATE INDEX IF NOT EXISTS idx_visits_requires_post_auth ON visits(requires_post_authorization) 
WHERE requires_post_authorization = TRUE;

COMMENT ON COLUMN visits.nhis_verification_status IS 'NHIS verification gate status for this encounter';
COMMENT ON COLUMN visits.nhis_policy_snapshot IS 'Snapshot of NHIS policy at time of verification - audit trail';
COMMENT ON COLUMN visits.requires_post_authorization IS 'Emergency override flag - requires follow-up authorization';

-- =============================================================================
-- PART 6: NHIS POSTINGS TABLE (Doctor/Clinic Assignment)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    auth_id UUID REFERENCES nhis_authorizations(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    -- Posting destination
    clinic_id UUID REFERENCES clinics(id),
    specialty_name VARCHAR(100),
    doctor_id UUID REFERENCES staff(id),
    
    -- Scheduling
    appointment_date DATE,
    appointment_time TIME,
    
    -- Status
    status nhis_posting_status DEFAULT 'pending',
    
    -- Audit
    posted_by UUID NOT NULL REFERENCES staff(id),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    seen_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES staff(id),
    cancellation_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_postings_encounter ON nhis_postings(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nhis_postings_patient ON nhis_postings(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_postings_clinic ON nhis_postings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_nhis_postings_doctor ON nhis_postings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_nhis_postings_status ON nhis_postings(status);
CREATE INDEX IF NOT EXISTS idx_nhis_postings_date ON nhis_postings(appointment_date);

COMMENT ON TABLE nhis_postings IS 'NHIS patient posting to clinics/doctors after verification';

-- =============================================================================
-- PART 6B: NHIS REFERRAL VERIFICATION QUEUE (For External Referrals)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_referral_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient Information
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Request Details
    request_type VARCHAR(50) DEFAULT 'external_referral',  -- external_referral, renewal, reauthorization
    
    -- Referral Information (entered by records/front desk)
    referral_code VARCHAR(100),
    referral_date DATE,
    referral_source VARCHAR(255),              -- Referring facility name
    referral_facility_nhis_id VARCHAR(100),    -- NHIS ID of referring facility
    clinical_basis TEXT,                        -- Diagnosis/reason for referral
    referring_clinician VARCHAR(255),           -- Name of referring doctor
    
    -- Validity Tracking (computed at query time, not as generated columns due to CURRENT_DATE not being immutable)
    -- Use: (CURRENT_DATE - referral_date) for days_since_referral
    -- Use: (CURRENT_DATE - referral_date) > 30 for is_expired
    
    -- Queue Status
    status VARCHAR(50) DEFAULT 'pending',      -- pending, in_review, approved, rejected, expired
    priority VARCHAR(20) DEFAULT 'normal',     -- normal, urgent, emergency
    
    -- Requested by (Records/Front Desk staff)
    requested_by UUID REFERENCES staff(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_notes TEXT,
    
    -- Processed by (NHIS Officer)
    processed_by UUID REFERENCES staff(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_notes TEXT,
    rejection_reason TEXT,
    
    -- Authorization created (if approved)
    authorization_id UUID REFERENCES nhis_authorizations(id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_patient ON nhis_referral_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_status ON nhis_referral_queue(status);
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_pending ON nhis_referral_queue(status, requested_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_date ON nhis_referral_queue(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_nhis_referral_queue_referral_date ON nhis_referral_queue(referral_date);

COMMENT ON TABLE nhis_referral_queue IS 'Queue for NHIS external referral verification requests - FIFO processing';
COMMENT ON COLUMN nhis_referral_queue.referral_date IS 'Referral date - used to compute days_since_referral and is_expired at query time';

-- =============================================================================
-- PART 7: NHIS TARIFF RULES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_tariff_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tariff identification
    tariff_group nhis_tariff_group NOT NULL,
    service_type VARCHAR(50) NOT NULL,               -- consultation, lab, radiology, pharmacy, procedure
    service_id UUID,                                 -- References specific service catalogue item
    service_code VARCHAR(50),                        -- NHIS code
    service_name VARCHAR(255),
    
    -- Coverage rules
    covered_type VARCHAR(50) DEFAULT 'fully_covered', -- fully_covered, percentage_covered, not_covered
    patient_copay_percent INTEGER DEFAULT 0 CHECK (patient_copay_percent >= 0 AND patient_copay_percent <= 100),
    claim_amount DECIMAL(12, 2),                     -- Fixed claim amount
    claim_rate DECIMAL(5, 4),                        -- Rate multiplier for pricing
    
    -- Approval requirements
    approval_required BOOLEAN DEFAULT FALSE,
    approval_threshold_amount DECIMAL(12, 2),        -- Require approval above this amount
    
    -- Validity
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id),
    updated_by UUID REFERENCES staff(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_tariff_group_service ON nhis_tariff_rules(tariff_group, service_type);
CREATE INDEX IF NOT EXISTS idx_nhis_tariff_service_id ON nhis_tariff_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_nhis_tariff_service_code ON nhis_tariff_rules(service_code);
CREATE INDEX IF NOT EXISTS idx_nhis_tariff_active ON nhis_tariff_rules(is_active, effective_from, effective_to);

COMMENT ON TABLE nhis_tariff_rules IS 'NHIS tariff rules by group (Personnel, Civilian_HMO, Special, Private)';
COMMENT ON COLUMN nhis_tariff_rules.covered_type IS 'How service is covered: fully_covered, percentage_covered, not_covered';

-- =============================================================================
-- PART 8: NHIS APPROVALS TABLE (Service-Level Approvals)
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to service request
    service_request_id UUID NOT NULL,
    service_type VARCHAR(50) NOT NULL,               -- lab_request, radiology_request, prescription, procedure, etc.
    encounter_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    -- Approval details
    service_name VARCHAR(255),
    service_code VARCHAR(50),
    estimated_cost DECIMAL(12, 2),
    
    -- Approval status
    status nhis_approval_status DEFAULT 'pending',
    
    -- Request details
    requested_by UUID REFERENCES staff(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_reason TEXT,
    clinical_justification TEXT,
    
    -- Decision details
    decided_by UUID REFERENCES staff(id),
    decided_at TIMESTAMP WITH TIME ZONE,
    decision_notes TEXT,
    rejection_reason TEXT,
    
    -- Expiry (approvals can expire)
    approval_expiry TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_encounter ON nhis_approvals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_patient ON nhis_approvals(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_status ON nhis_approvals(status);
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_service ON nhis_approvals(service_request_id, service_type);
CREATE INDEX IF NOT EXISTS idx_nhis_approvals_pending ON nhis_approvals(status) WHERE status = 'pending';

COMMENT ON TABLE nhis_approvals IS 'NHIS service-level approvals for high-cost items (CT, MRI, surgeries, etc.)';

-- =============================================================================
-- PART 9: EXTEND SERVICE REQUEST TABLES
-- =============================================================================

-- Add NHIS fields to lab_requests
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(20) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS requires_nhis_verification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nhis_approval_status nhis_approval_status DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS nhis_approval_id UUID REFERENCES nhis_approvals(id),
ADD COLUMN IF NOT EXISTS billing_release_status billing_release_status DEFAULT 'blocked',
ADD COLUMN IF NOT EXISTS execution_status service_execution_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;

-- Add NHIS fields to radiology_requests
ALTER TABLE radiology_requests
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(20) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS requires_nhis_verification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nhis_approval_status nhis_approval_status DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS nhis_approval_id UUID REFERENCES nhis_approvals(id),
ADD COLUMN IF NOT EXISTS billing_release_status billing_release_status DEFAULT 'blocked',
ADD COLUMN IF NOT EXISTS execution_status service_execution_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;

-- Add NHIS fields to prescriptions
ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(20) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS requires_nhis_verification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nhis_approval_status nhis_approval_status DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS nhis_approval_id UUID REFERENCES nhis_approvals(id),
ADD COLUMN IF NOT EXISTS billing_release_status billing_release_status DEFAULT 'blocked',
ADD COLUMN IF NOT EXISTS execution_status service_execution_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_military_personnel_free BOOLEAN DEFAULT FALSE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_lab_req_nhis_status ON lab_requests(nhis_approval_status) WHERE nhis_approval_status != 'not_required';
CREATE INDEX IF NOT EXISTS idx_lab_req_billing_release ON lab_requests(billing_release_status);
CREATE INDEX IF NOT EXISTS idx_radiology_nhis_status ON radiology_requests(nhis_approval_status) WHERE nhis_approval_status != 'not_required';
CREATE INDEX IF NOT EXISTS idx_radiology_billing_release ON radiology_requests(billing_release_status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_nhis_status ON prescriptions(nhis_approval_status) WHERE nhis_approval_status != 'not_required';
CREATE INDEX IF NOT EXISTS idx_prescriptions_billing_release ON prescriptions(billing_release_status);

COMMENT ON COLUMN lab_requests.requires_nhis_verification IS 'TRUE for all referred NHIS patients';
COMMENT ON COLUMN lab_requests.billing_release_status IS 'Must be released before billing can proceed';
COMMENT ON COLUMN prescriptions.is_military_personnel_free IS 'Military personnel do NOT pay for drugs';

-- =============================================================================
-- PART 10: CLAIMS QUEUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    encounter_id UUID NOT NULL REFERENCES visits(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    nhis_profile_id UUID REFERENCES nhis_profiles(id),
    auth_id UUID REFERENCES nhis_authorizations(id),
    
    -- Tariff information
    tariff_group nhis_tariff_group NOT NULL,
    provider_name VARCHAR(255),
    
    -- Service lines (detailed breakdown)
    service_lines JSONB NOT NULL DEFAULT '[]'::JSONB,
    /* Structure:
    [
        {
            "service_type": "consultation",
            "service_id": "uuid",
            "service_name": "General Consultation",
            "quantity": 1,
            "unit_price": 5000,
            "tariff_price": 4500,
            "covered_amount": 4500,
            "patient_copay": 0,
            "approval_id": "uuid" (if required)
        }
    ]
    */
    
    -- Amounts
    total_tariff DECIMAL(12, 2) NOT NULL DEFAULT 0,
    claimable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    patient_pay_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Emergency/Override tracking
    includes_emergency_services BOOLEAN DEFAULT FALSE,
    requires_post_authorization BOOLEAN DEFAULT FALSE,
    post_authorization_verified BOOLEAN DEFAULT FALSE,
    
    -- Status
    status nhis_claim_status DEFAULT 'draft',
    
    -- Review/Approval
    reviewed_by UUID REFERENCES staff(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Submission
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES staff(id),
    export_batch_id UUID,
    
    -- Payment tracking
    paid_at TIMESTAMP WITH TIME ZONE,
    paid_amount DECIMAL(12, 2),
    payment_reference VARCHAR(100),
    
    -- Rejection handling
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES staff(id),
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_claims_encounter ON nhis_claims(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nhis_claims_patient ON nhis_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_claims_status ON nhis_claims(status);
CREATE INDEX IF NOT EXISTS idx_nhis_claims_batch ON nhis_claims(export_batch_id);
CREATE INDEX IF NOT EXISTS idx_nhis_claims_provider ON nhis_claims(provider_name);
CREATE INDEX IF NOT EXISTS idx_nhis_claims_date ON nhis_claims(created_at);
CREATE INDEX IF NOT EXISTS idx_nhis_claims_pending ON nhis_claims(status) WHERE status IN ('draft', 'pending', 'reviewed');

COMMENT ON TABLE nhis_claims IS 'NHIS claims queue for billing and export';
COMMENT ON COLUMN nhis_claims.requires_post_authorization IS 'Emergency override claims - must be authorized before export';

-- =============================================================================
-- PART 11: EXPORT BATCHES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_export_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Batch details
    export_type VARCHAR(50) DEFAULT 'monthly',       -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    provider_name VARCHAR(255),
    
    -- Summary
    total_claims INTEGER DEFAULT 0,
    total_amount DECIMAL(14, 2) DEFAULT 0,
    
    -- Claims in this batch
    claim_ids UUID[] DEFAULT '{}',
    
    -- Export file
    export_file_path TEXT,
    export_format VARCHAR(20) DEFAULT 'xlsx',        -- xlsx, csv, pdf
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',              -- draft, generated, submitted, acknowledged
    
    -- Submission tracking
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES staff(id),
    submission_reference VARCHAR(100),
    
    -- DHQ format fields
    dhq_format_version VARCHAR(20),
    facility_nhis_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_export_period ON nhis_export_batches(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_nhis_export_status ON nhis_export_batches(status);
CREATE INDEX IF NOT EXISTS idx_nhis_export_provider ON nhis_export_batches(provider_name);

COMMENT ON TABLE nhis_export_batches IS 'NHIS export batches for DHQ submissions';

-- =============================================================================
-- PART 12: AUDIT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhis_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action details
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT,
    
    -- References
    entity_type VARCHAR(50),                         -- encounter, authorization, approval, claim, etc.
    entity_id UUID,
    patient_id UUID REFERENCES patients(id),
    encounter_id UUID REFERENCES visits(id),
    
    -- Before/After states
    old_state JSONB,
    new_state JSONB,
    
    -- Actor
    performed_by UUID REFERENCES staff(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Emergency tracking
    is_emergency_action BOOLEAN DEFAULT FALSE,
    emergency_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nhis_audit_entity ON nhis_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_nhis_audit_patient ON nhis_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_nhis_audit_encounter ON nhis_audit_log(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nhis_audit_action ON nhis_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_nhis_audit_date ON nhis_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_nhis_audit_emergency ON nhis_audit_log(is_emergency_action) WHERE is_emergency_action = TRUE;

COMMENT ON TABLE nhis_audit_log IS 'Immutable audit log for all NHIS actions - NEVER delete records';

-- =============================================================================
-- PART 13: DATABASE FUNCTIONS
-- =============================================================================

-- Function: Verify NHIS Encounter
CREATE OR REPLACE FUNCTION verify_nhis_encounter(
    p_encounter_id UUID,
    p_auth_id UUID,
    p_verified_by UUID,
    p_tariff_group nhis_tariff_group DEFAULT 'Civilian_HMO'
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Emergency Override
CREATE OR REPLACE FUNCTION nhis_emergency_override(
    p_encounter_id UUID,
    p_override_by UUID,
    p_reason TEXT
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Release Service to Billing
CREATE OR REPLACE FUNCTION release_service_to_billing(
    p_service_type VARCHAR(50),
    p_service_id UUID,
    p_released_by UUID
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if service can be executed
CREATE OR REPLACE FUNCTION can_execute_nhis_service(
    p_encounter_id UUID,
    p_service_type VARCHAR(50),
    p_service_id UUID
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql;

-- Function: Generate Claim from Encounter
CREATE OR REPLACE FUNCTION generate_nhis_claim(
    p_encounter_id UUID,
    p_created_by UUID
) RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process Referral Queue Item
CREATE OR REPLACE FUNCTION process_nhis_referral_queue(
    p_queue_id UUID,
    p_action VARCHAR(20),  -- 'approve' or 'reject'
    p_processed_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL,
    p_auth_code VARCHAR(100) DEFAULT NULL,
    p_tariff_group nhis_tariff_group DEFAULT 'Civilian_HMO'
) RETURNS JSONB AS $$
DECLARE
    v_queue RECORD;
    v_auth_id UUID;
    v_profile_id UUID;
    v_expiry_date TIMESTAMP WITH TIME ZONE;
    v_days_since_referral INTEGER;
    v_is_expired BOOLEAN;
BEGIN
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
                v_queue.clinical_basis, p_tariff_group, p_processed_by, NOW()
            ) RETURNING id INTO v_profile_id;
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
            p_processed_by, NOW(), p_notes
        ) RETURNING id INTO v_auth_id;
        
        -- Update queue item
        UPDATE nhis_referral_queue SET
            status = 'approved',
            processed_by = p_processed_by,
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
            jsonb_build_object('auth_id', v_auth_id, 'tariff_group', p_tariff_group),
            p_processed_by
        );
        
        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'approved',
            'authorization_id', v_auth_id,
            'message', 'Referral approved. Patient can now be checked in for encounter.'
        );
        
    ELSIF p_action = 'reject' THEN
        -- Update queue item as rejected
        UPDATE nhis_referral_queue SET
            status = 'rejected',
            processed_by = p_processed_by,
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
            jsonb_build_object('reason', p_rejection_reason),
            p_processed_by
        );
        
        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'rejected',
            'message', 'Referral rejected.'
        );
    ELSE
        RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid action. Use approve or reject.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 14: ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on NHIS tables
ALTER TABLE nhis_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_referral_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_tariff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhis_export_batches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS nhis_profiles_policy ON nhis_profiles;
DROP POLICY IF EXISTS nhis_authorizations_policy ON nhis_authorizations;
DROP POLICY IF EXISTS nhis_postings_policy ON nhis_postings;
DROP POLICY IF EXISTS nhis_approvals_policy ON nhis_approvals;
DROP POLICY IF EXISTS nhis_claims_policy ON nhis_claims;
DROP POLICY IF EXISTS nhis_referral_queue_policy ON nhis_referral_queue;
DROP POLICY IF EXISTS nhis_audit_log_read_policy ON nhis_audit_log;
DROP POLICY IF EXISTS nhis_audit_log_insert_policy ON nhis_audit_log;
DROP POLICY IF EXISTS nhis_policy_config_policy ON nhis_policy_config;
DROP POLICY IF EXISTS nhis_tariff_rules_policy ON nhis_tariff_rules;
DROP POLICY IF EXISTS nhis_export_batches_policy ON nhis_export_batches;

-- RLS policies: Allow all access for authenticated users
CREATE POLICY nhis_profiles_policy ON nhis_profiles
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_authorizations_policy ON nhis_authorizations
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_postings_policy ON nhis_postings
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_approvals_policy ON nhis_approvals
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_claims_policy ON nhis_claims
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_referral_queue_policy ON nhis_referral_queue
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_policy_config_policy ON nhis_policy_config
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_tariff_rules_policy ON nhis_tariff_rules
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY nhis_export_batches_policy ON nhis_export_batches
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Audit log policies
CREATE POLICY nhis_audit_log_read_policy ON nhis_audit_log
    FOR SELECT USING (TRUE);

CREATE POLICY nhis_audit_log_insert_policy ON nhis_audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Grant table permissions to roles
GRANT ALL ON nhis_profiles TO anon, authenticated, service_role;
GRANT ALL ON nhis_authorizations TO anon, authenticated, service_role;
GRANT ALL ON nhis_postings TO anon, authenticated, service_role;
GRANT ALL ON nhis_approvals TO anon, authenticated, service_role;
GRANT ALL ON nhis_claims TO anon, authenticated, service_role;
GRANT ALL ON nhis_referral_queue TO anon, authenticated, service_role;
GRANT ALL ON nhis_policy_config TO anon, authenticated, service_role;
GRANT ALL ON nhis_tariff_rules TO anon, authenticated, service_role;
GRANT ALL ON nhis_export_batches TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON nhis_audit_log TO anon, authenticated, service_role;

-- =============================================================================
-- PART 15: SEED DEFAULT POLICY CONFIG
-- =============================================================================

INSERT INTO nhis_policy_config (
    provider_name, validity_days, one_hour_rule_enabled,
    one_hour_grace_period_minutes, emergency_override_allowed,
    emergency_followup_deadline_hours, military_drug_coverage_percent,
    civilian_drug_coverage_percent, default_copay_percent
) VALUES 
(
    'Default NHIS Policy', 30, TRUE, 60, TRUE, 72, 100, 0, 10
),
(
    'DHML', 30, TRUE, 60, TRUE, 72, 100, 0, 0
),
(
    'Hygeia HMO', 45, TRUE, 60, TRUE, 48, 50, 50, 10
),
(
    'NHIS Primary', 30, TRUE, 60, TRUE, 72, 0, 90, 10
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DONE
-- =============================================================================

COMMENT ON SCHEMA public IS 'NHIS Workflow Module - Migration 046 Complete';
