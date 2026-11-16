# Dynamic Specialty Clinic UI Implementation Plan

## Executive Summary

This document outlines the phased implementation plan for creating a **dynamic specialty clinic UI system** where doctors see specialty-specific dashboards based on their registered specialty. The system will replicate the functionality of existing specialty modules (Dental, Ophthalmology, Physiotherapy) while supporting all 18+ specialties with a single, configurable codebase.

### Quick Reference: Implementation Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| **SQL Migration** | `migrations/128_dynamic_specialty_dashboard.sql` | ✅ Implemented |
| **Security Functions** | `can_access_specialty()`, `get_specialty_dashboard()` | ✅ Implemented |
| **RLS Policies** | 4 policies on `specialty_departments`, `queue`, `clinical_requests`, `consultations` | ✅ Implemented |
| **TypeScript Types** | `modules/specialty-clinic/types/specialty-dashboard.types.ts` | ✅ Implemented |
| **API Wrapper** | `modules/specialty-clinic/api/specialty-dashboard.api.ts` | ✅ Implemented |
| **Hooks** | `modules/specialty-clinic/hooks/useSpecialtyDashboard.ts` | ✅ Implemented |
| **Dashboard Page** | `modules/specialty-clinic/pages/SpecialtyClinicPage.tsx` | ✅ Implemented |
| **Test Queries** | Access Control (5 tests), EXPLAIN ANALYZE (4 tests) | 📋 Specified |
| **Verification Checklist** | Pre-deployment, Backward Compat, Post-deployment | 📋 Specified |

---

## � Missing Pieces & Fixes (v2.2 Audit)

This section documents gaps, contradictions, and unsafe patterns discovered during code review, with exact patches to fix them.

### Priority 1: Critical Migration Fixes

| # | Issue | Severity | Fix Required |
|---|-------|----------|--------------|
| 1 | **Duplicate DDL block** in migration (lines 613-618 orphaned) | 🔴 Critical | Remove duplicate `is_active, display_order, created_at, updated_at` fragment |
| 2 | **Missing `UNIQUE(specialty_code, version)`** if versioning is kept | 🔴 Critical | Add constraint: `UNIQUE(specialty_code, version)` |
| 3 | **No CHECK for clinical roles requiring specialty_code** | 🔴 Critical | Add trigger or CHECK to enforce non-null specialty_code for clinical roles |
| 4 | **`can_access_specialty()` missing `SET search_path`** | 🔴 Critical | Add `SET search_path = public, pg_temp` to function definition |
| 5 | **`get_specialty_dashboard()` missing `SET search_path`** | 🔴 Critical | Add `SET search_path = public, pg_temp` to function definition |
| 6 | **RLS policies are SELECT-only** | 🟡 Medium | Add INSERT/UPDATE/DELETE policies where needed |
| 7 | **Queue specialty_code population undefined** | 🟡 Medium | Implement `set_queue_specialty_code()` trigger |
| 8 | **Missing staff.specialty_code FK** | 🔴 Critical | Add `staff.specialty_code` column with FK to specialty_departments |

### Priority 2: Referral & Session Actions

| # | Issue | Severity | Fix Required |
|---|-------|----------|--------------|
| 9 | **Accept referral endpoint incomplete** | 🟡 Medium | Add `accept_specialty_referral()` RPC with audit fields |
| 10 | **Reject referral endpoint incomplete** | 🟡 Medium | Add `reject_specialty_referral()` RPC with audit fields |
| 11 | **Start session endpoint undefined** | 🟡 Medium | Add `start_specialty_session()` RPC |
| 12 | **Complete session endpoint undefined** | 🟡 Medium | Add `complete_specialty_session()` RPC |

### Priority 3: Frontend Minimal Changes

| # | Issue | Severity | Fix Required |
|---|-------|----------|--------------|
| 13 | **Referral dropdown hardcoded** | 🟡 Medium | Replace hardcoded array with `useSpecialtyDepartments()` |
| 14 | **No route for dynamic specialty clinic** | 🟡 Medium | Add `/specialty-clinic/:code` route |
| 15 | **No sidebar menu item** | 🟢 Low | Add "My Specialty" nav item for specialist roles |

### Exact Patches

#### Patch 1: Remove Duplicate DDL (Lines 613-618)

The migration has an orphaned DDL fragment that must be removed:

```sql
-- DELETE THIS BLOCK (orphaned columns outside CREATE TABLE):
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Patch 2: Add Version Uniqueness Constraint

```sql
-- If versioning is kept, add this constraint:
ALTER TABLE specialty_departments
DROP CONSTRAINT IF EXISTS specialty_departments_specialty_code_unique;

ALTER TABLE specialty_departments
ADD CONSTRAINT specialty_departments_code_version_unique 
UNIQUE (specialty_code, version);
```

#### Patch 3: Clinical Role Specialty Enforcement

```sql
-- Trigger: Enforce specialty_code for clinical roles on staff INSERT/UPDATE
CREATE OR REPLACE FUNCTION enforce_clinical_staff_specialty()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clinical roles MUST have specialty_code (except admin roles)
  IF NEW.role IN ('doctor', 'dentist', 'ophthalmologist', 'physiotherapist', 'specialist')
     AND NEW.is_active = true
     AND NEW.specialty_code IS NULL
  THEN
    RAISE EXCEPTION 'Clinical staff role "%" requires a specialty_code assignment', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_clinical_specialty ON staff;
CREATE TRIGGER trg_enforce_clinical_specialty
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION enforce_clinical_staff_specialty();

-- Backfill existing specialty roles
UPDATE staff SET specialty_code = 'DENTAL' WHERE role = 'dentist' AND specialty_code IS NULL;
UPDATE staff SET specialty_code = 'OPHTHALMOLOGY' WHERE role = 'ophthalmologist' AND specialty_code IS NULL;
UPDATE staff SET specialty_code = 'PHYSIOTHERAPY' WHERE role = 'physiotherapist' AND specialty_code IS NULL;
```

#### Patch 4: Secure `can_access_specialty()` Function

```sql
-- CORRECTED: Includes SET search_path for security
CREATE OR REPLACE FUNCTION can_access_specialty(p_specialty_code varchar)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_role TEXT;
  v_user_specialty TEXT;
BEGIN
  SELECT role::TEXT, specialty_code INTO v_user_role, v_user_specialty
  FROM staff
  WHERE user_id = auth.uid();
  
  -- Admin roles can access all specialties
  IF v_user_role IN ('super_admin', 'admin', 'medical_director') THEN
    RETURN TRUE;
  END IF;
  
  -- Clinical staff can only access their assigned specialty
  RETURN v_user_specialty IS NOT NULL AND v_user_specialty = p_specialty_code;
END;
$$;
```

#### Patch 5: Queue Specialty Code Trigger

```sql
-- Trigger: Auto-populate queue.specialty_code from staff assignment
CREATE OR REPLACE FUNCTION set_queue_specialty_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If specialty_code not provided, derive from assigned_to staff
  IF NEW.specialty_code IS NULL AND NEW.assigned_to IS NOT NULL THEN
    SELECT specialty_code INTO NEW.specialty_code
    FROM staff WHERE id = NEW.assigned_to AND specialty_code IS NOT NULL;
  END IF;
  
  -- Fallback: derive from location if it's a dedicated specialty queue
  IF NEW.specialty_code IS NULL AND NEW.location IS NOT NULL THEN
    SELECT sd.specialty_code INTO NEW.specialty_code
    FROM specialty_departments sd
    WHERE sd.queue_department = NEW.location::TEXT
      AND sd.requires_dedicated_queue = true
      AND sd.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_queue_specialty ON queue;
CREATE TRIGGER trg_set_queue_specialty
  BEFORE INSERT OR UPDATE ON queue
  FOR EACH ROW
  EXECUTE FUNCTION set_queue_specialty_code();
```

#### Patch 6: Complete RLS Policies (INSERT/UPDATE/DELETE)

```sql
-- =============================================================================
-- RLS POLICIES: Complete CRUD Coverage
-- =============================================================================

-- specialty_departments: Read-only for all, admin-only writes
ALTER TABLE specialty_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS specialty_departments_read ON specialty_departments;
CREATE POLICY specialty_departments_read ON specialty_departments
  FOR SELECT USING (is_active = true OR auth.uid() IN (
    SELECT user_id FROM staff WHERE role IN ('super_admin', 'admin')
  ));

DROP POLICY IF EXISTS specialty_departments_admin_write ON specialty_departments;
CREATE POLICY specialty_departments_admin_write ON specialty_departments
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM staff WHERE role IN ('super_admin', 'admin')
  ));

-- queue: Specialty-filtered access for clinical staff
DROP POLICY IF EXISTS queue_specialty_select ON queue;
CREATE POLICY queue_specialty_select ON queue
  FOR SELECT USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

DROP POLICY IF EXISTS queue_specialty_insert ON queue;
CREATE POLICY queue_specialty_insert ON queue
  FOR INSERT WITH CHECK (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

DROP POLICY IF EXISTS queue_specialty_update ON queue;
CREATE POLICY queue_specialty_update ON queue
  FOR UPDATE USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

-- clinical_requests: Target specialty filtered
DROP POLICY IF EXISTS referrals_specialty_select ON clinical_requests;
CREATE POLICY referrals_specialty_select ON clinical_requests
  FOR SELECT USING (
    request_type != 'Referral'
    OR target_specialty_code IS NULL
    OR can_access_specialty(target_specialty_code)
  );

DROP POLICY IF EXISTS referrals_specialty_update ON clinical_requests;
CREATE POLICY referrals_specialty_update ON clinical_requests
  FOR UPDATE USING (
    target_specialty_code IS NULL
    OR can_access_specialty(target_specialty_code)
  );
```

#### Patch 7: Referral Accept/Reject RPCs

```sql
-- Accept a specialty referral with audit trail
CREATE OR REPLACE FUNCTION accept_specialty_referral(
  p_request_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_specialty_code varchar(50);
BEGIN
  -- Get current staff
  SELECT id, specialty_code INTO v_staff_id, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found for current user';
  END IF;
  
  -- Update referral with audit fields
  UPDATE clinical_requests SET
    status = 'In_Progress',
    referral_accepted_at = now(),
    referral_accepted_by = v_staff_id,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_request_id
    AND request_type = 'Referral'
    AND target_specialty_code = v_specialty_code
    AND status IN ('Pending', 'Approved')
  RETURNING jsonb_build_object('id', id, 'status', status, 'accepted_at', referral_accepted_at)
  INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Referral not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Reject a specialty referral with reason
CREATE OR REPLACE FUNCTION reject_specialty_referral(
  p_request_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_specialty_code varchar(50);
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;
  
  SELECT id, specialty_code INTO v_staff_id, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  UPDATE clinical_requests SET
    status = 'Rejected',
    referral_rejected_at = now(),
    referral_rejected_by = v_staff_id,
    referral_rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id
    AND request_type = 'Referral'
    AND target_specialty_code = v_specialty_code
    AND status IN ('Pending', 'Approved')
  RETURNING jsonb_build_object('id', id, 'status', status, 'rejected_at', referral_rejected_at)
  INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Referral not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;
```

#### Patch 8: Session Start/Complete RPCs

```sql
-- Start a specialty session (queue → in-progress)
CREATE OR REPLACE FUNCTION start_specialty_session(
  p_queue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
  v_specialty_code varchar(50);
BEGIN
  SELECT id, specialty_code INTO v_staff_id, v_specialty_code
  FROM staff WHERE user_id = auth.uid();
  
  UPDATE queue SET
    status = 'In Progress',
    called_at = now(),
    assigned_to = v_staff_id,
    updated_at = now()
  WHERE id = p_queue_id
    AND (specialty_code = v_specialty_code OR specialty_code IS NULL)
    AND status IN ('Waiting', 'Called')
  RETURNING jsonb_build_object(
    'queue_id', id,
    'status', status,
    'patient_id', patient_id,
    'started_at', called_at
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found or access denied';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Complete a specialty session
CREATE OR REPLACE FUNCTION complete_specialty_session(
  p_queue_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_staff_id uuid;
BEGIN
  SELECT id INTO v_staff_id FROM staff WHERE user_id = auth.uid();
  
  UPDATE queue SET
    status = 'Completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_queue_id
    AND assigned_to = v_staff_id
    AND status = 'In Progress'
  RETURNING jsonb_build_object(
    'queue_id', id,
    'status', status,
    'completed_at', completed_at
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Queue entry not found, not assigned to you, or not in progress';
  END IF;
  
  RETURN v_result;
END;
$$;
```

---

## �🚫 Strict Constraints (Non-Negotiable)

| Constraint | Description |
|------------|-------------|
| **No New Specialty Modules** | No `modules/cardiology`, `modules/dermatology`, etc. One dynamic system only. |
| **No Duplicate Logic** | Use configuration and database-driven behavior. No switch-case by specialty. |
| **No Breaking Changes** | Dental, Ophthalmology, Physiotherapy must continue working. |
| **No New Workflows** | Follow existing consultation → specialty examination → referrals → treatment flow. |

---

## 🎯 Implementation Specification (v2.1)

This section provides the **exact implementation requirements** for the Dynamic Specialty Clinic system. All work must adhere to these specifications.

### Technology Stack
- **Backend**: Supabase (PostgreSQL 15+)
- **Frontend**: React 18+ with TanStack Query
- **Security**: Row Level Security (RLS) + SECURITY DEFINER functions

### Migration Requirements

#### Migration File: `060_specialty_departments.sql`

The migration must be **clean and idempotent** with the following requirements:

| Requirement | Implementation |
|-------------|----------------|
| **No Duplicate DDL** | Create `specialty_departments` table ONCE with all columns |
| **Versioning Enforcement** | `UNIQUE(specialty_code, version)` if versioning kept |
| **Active Record Uniqueness** | `UNIQUE(specialty_code) WHERE is_active = true` |
| **Staff FK** | `staff.specialty_code` FK to `specialty_departments(specialty_code)` |
| **Clinical Role Enforcement** | Clinical roles MUST have `specialty_code`; admins may be NULL |
| **Queue FK** | `queue.specialty_code` FK with indexes |
| **Referral FK** | `clinical_requests.target_specialty_code` FK with indexes |
| **Referral Audit Columns** | `referral_accepted_at`, `referral_accepted_by`, etc. |
| **Consultation Audit Columns** | `specialty_template_id`, `specialty_template_version`, `specialty_code`, `specialty_data` |
| **Template Lock Trigger** | Auto-populate template version on INSERT (never changes after) |

#### Security Functions (SECURITY DEFINER with search_path hardening)

```sql
-- Required function signatures
CREATE OR REPLACE FUNCTION can_access_specialty(p_specialty_code varchar)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$;

CREATE OR REPLACE FUNCTION get_specialty_dashboard(p_specialty_code varchar)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$;
```

#### Queue Specialty Assignment Strategy

**Decision Required**: How is `queue.specialty_code` set?

| Option | Implementation | Pros | Cons |
|--------|----------------|------|------|
| **A. Trigger** | `BEFORE INSERT` trigger copies from staff/encounter | Automatic, no frontend changes | Additional DB logic |
| **B. Backend Write** | API layer sets specialty_code on queue insert | Clear ownership, easier debugging | Requires API changes |

**Recommendation**: Option A (Trigger) for consistency and to prevent frontend bypass.

```sql
-- Example trigger implementation
CREATE OR REPLACE FUNCTION set_queue_specialty_code()
RETURNS TRIGGER AS $$
BEGIN
  -- If specialty_code not provided, derive from staff or encounter
  IF NEW.specialty_code IS NULL AND NEW.assigned_to IS NOT NULL THEN
    SELECT specialty_code INTO NEW.specialty_code
    FROM staff WHERE id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### RLS Policy Requirements

#### Policy Matrix

| Table | Policy Name | Roles Allowed | Condition |
|-------|-------------|---------------|-----------|
| `specialty_departments` | `read_active_specialties` | All authenticated | `is_active = true` |
| `queue` | `specialty_queue_access` | Doctor, Specialist | `specialty_code = staff.specialty_code OR role IN (admin...)` |
| `clinical_requests` | `specialty_referrals_access` | Doctor, Specialist | `target_specialty_code = staff.specialty_code OR role IN (admin...)` |
| `consultations` | `specialty_consultations_access` | Doctor, Specialist | `specialty_code = staff.specialty_code OR role IN (admin...)` |

#### Required RLS Policies

```sql
-- 1. Specialty Departments (public read for active)
CREATE POLICY specialty_departments_read ON specialty_departments
  FOR SELECT USING (is_active = true);

-- 2. Queue Access by Specialty
CREATE POLICY queue_specialty_access ON queue
  FOR ALL USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );

-- 3. Clinical Requests by Target Specialty
CREATE POLICY clinical_requests_specialty_access ON clinical_requests
  FOR ALL USING (
    request_type != 'Referral'
    OR target_specialty_code IS NULL
    OR can_access_specialty(target_specialty_code)
  );

-- 4. Consultations by Specialty
CREATE POLICY consultations_specialty_access ON consultations
  FOR SELECT USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );
```

### Frontend Implementation Requirements

#### SpecialtyClinicPage.tsx Specification

```typescript
// REQUIRED: Single dashboard hook, ONE RPC call
// FORBIDDEN: if (specialty === 'cardiology') or switch(specialty)
// ALLOWED: config.feature_flags.has_ecg && <ECGComponent />

interface SpecialtyClinicPageProps {
  specialtyCode?: string; // From route param or auto-detected
}

const SpecialtyClinicPage: React.FC<SpecialtyClinicPageProps> = ({ specialtyCode }) => {
  // 1. Auto-detect specialty if not provided
  const { data: userSpecialty } = useCurrentUserSpecialty();
  const activeSpecialty = specialtyCode || userSpecialty;
  
  // 2. Single dashboard call (aggregated data)
  const { data: dashboard, isLoading, error } = useSpecialtyDashboard(activeSpecialty);
  
  // 3. Render from configuration, not specialty name
  if (!dashboard) return <LoadingState />;
  
  return (
    <div>
      {/* Header from config */}
      <SpecialtyHeader 
        name={dashboard.config.specialty_name}
        icon={dashboard.config.icon_name}
        color={dashboard.config.color_class}
      />
      
      {/* Stats from aggregated response */}
      <SpecialtyStats stats={dashboard.stats} />
      
      {/* Tabs - same for all specialties */}
      <Tabs>
        <Tab label="Queue"><SpecialtyQueue data={dashboard.queue} /></Tab>
        <Tab label="Referrals"><SpecialtyReferrals data={dashboard.referrals} /></Tab>
        <Tab label="Sessions"><SpecialtySessions /></Tab>
        <Tab label="Assessments"><SpecialtyAssessments /></Tab>
      </Tabs>
      
      {/* Feature flags enable specialty-specific UI */}
      {dashboard.config.feature_flags.has_tooth_chart && <ToothChart />}
      {dashboard.config.feature_flags.has_vision_test && <VisionTest />}
      {dashboard.config.feature_flags.has_growth_chart && <GrowthChart />}
    </div>
  );
};
```

#### Referrals UI Update

```typescript
// BEFORE: Hardcoded specialty options
const SPECIALTY_OPTIONS = ['dental', 'ophthalmology', 'physiotherapy'];

// AFTER: Dynamic from specialty_departments
const ReferralSpecialtySelector: React.FC = () => {
  const { data: specialties } = useSpecialtyDepartments();
  
  return (
    <Select
      options={specialties?.map(s => ({
        value: s.specialty_code,
        label: s.specialty_name,
        icon: s.icon_name,
      }))}
      onChange={(code) => setSelectedSpecialty(code)}
    />
  );
};
```

### TypeScript Types Required

```typescript
// types/specialty-dashboard.types.ts

export interface SpecialtyDepartment {
  id: string;
  specialty_code: string;
  specialty_name: string;
  queue_department: string;
  referral_key: string;
  icon_name: string;
  color_class: string;
  requires_dedicated_queue: boolean;
  feature_flags: Record<string, boolean>;
  is_active: boolean;
  display_order: number;
}

export interface SpecialtyDashboardData {
  config: {
    specialty_code: string;
    specialty_name: string;
    icon_name: string;
    color_class: string;
    feature_flags: Record<string, boolean>;
  };
  stats: {
    waiting: number;
    in_progress: number;
    completed_today: number;
    pending_referrals: number;
  };
  queue: SpecialtyQueuePatient[];
  referrals: SpecialtyReferral[];
}

export interface SpecialtyQueuePatient {
  id: string;
  ticket_number: string;
  status: string;
  priority: string;
  created_at: string;
  first_name: string;
  last_name: string;
  emr_number: string;
  patient_id: string;
}

export interface SpecialtyReferral {
  id: string;
  request_number: string;
  status: string;
  urgency: string;
  clinical_notes: string;
  created_at: string;
  first_name: string;
  last_name: string;
  emr_number: string;
  requesting_doctor_first: string;
  requesting_doctor_last: string;
}
```

### API Wrapper + Hooks Skeleton

```typescript
// api/specialty-dashboard.api.ts
export const specialtyDashboardApi = {
  getDashboard: (code: string) => supabase.rpc('get_specialty_dashboard', { p_specialty_code: code }),
  getDepartments: () => supabase.from('specialty_departments').select('*').eq('is_active', true).order('display_order'),
  getUserSpecialty: () => supabase.from('staff').select('specialty_code, role').eq('user_id', currentUserId).single(),
};

// hooks/useSpecialtyDashboard.ts
export function useSpecialtyDashboard(specialtyCode: string | null) {
  return useQuery({
    queryKey: ['specialty-dashboard', specialtyCode],
    queryFn: () => specialtyDashboardApi.getDashboard(specialtyCode!),
    enabled: !!specialtyCode,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// hooks/useSpecialtyDepartments.ts
export function useSpecialtyDepartments() {
  return useQuery({
    queryKey: ['specialty-departments'],
    queryFn: specialtyDashboardApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });
}

// hooks/useCurrentUserSpecialty.ts
export function useCurrentUserSpecialty() {
  return useQuery({
    queryKey: ['user-specialty'],
    queryFn: specialtyDashboardApi.getUserSpecialty,
    staleTime: Infinity,
  });
}
```

### Test Queries for Verification

#### Access Control Tests

```sql
-- =============================================================================
-- ACCESS CONTROL VERIFICATION TESTS
-- =============================================================================

-- Test 1: Cardiologist cannot access Neurology
-- Setup: Login as user with specialty_code = 'CARDIOLOGY'
SELECT get_specialty_dashboard('NEUROLOGY');
-- Expected: ERROR 'Access denied to specialty: NEUROLOGY'

-- Test 2: Admin can access any specialty
-- Setup: Login as user with role = 'admin'
SELECT get_specialty_dashboard('CARDIOLOGY');
SELECT get_specialty_dashboard('NEUROLOGY');
-- Expected: Both succeed with dashboard data

-- Test 3: Medical Director can access all
-- Setup: Login as user with role = 'medical_director'
SELECT get_specialty_dashboard('DENTAL');
-- Expected: Success

-- Test 4: Doctor with NULL specialty cannot access any
-- Setup: Login as doctor with specialty_code IS NULL
SELECT get_specialty_dashboard('CARDIOLOGY');
-- Expected: ERROR 'Access denied'

-- Test 5: Verify RLS on queue table
-- As cardiologist, try to query neurology queue
SELECT * FROM queue WHERE specialty_code = 'NEUROLOGY';
-- Expected: 0 rows (RLS blocks)
```

#### Index Usage Verification (EXPLAIN ANALYZE)

```sql
-- =============================================================================
-- PERFORMANCE VERIFICATION - INDEX USAGE
-- =============================================================================

-- Test 1: Specialty departments lookup
EXPLAIN ANALYZE
SELECT * FROM specialty_departments 
WHERE specialty_code = 'CARDIOLOGY' AND is_active = true;
-- Expected: Index Scan on idx_specialty_departments_lookup

-- Test 2: Queue by specialty
EXPLAIN ANALYZE
SELECT * FROM queue 
WHERE specialty_code = 'CARDIOLOGY' 
  AND status IN ('Waiting', 'In Progress')
ORDER BY created_at;
-- Expected: Index Scan on idx_queue_specialty

-- Test 3: Referrals by target specialty
EXPLAIN ANALYZE
SELECT * FROM clinical_requests 
WHERE target_specialty_code = 'CARDIOLOGY' 
  AND request_type = 'Referral'
  AND status IN ('Pending', 'Approved');
-- Expected: Index Scan on idx_clinical_requests_target_specialty

-- Test 4: Full dashboard RPC
EXPLAIN ANALYZE
SELECT get_specialty_dashboard('CARDIOLOGY');
-- Expected: All sub-queries use Index Scans, total time < 100ms
```

### Staging Verification Checklist

#### Pre-Deployment (Staging)

- [ ] **Migration runs without errors** on fresh database
- [ ] **Migration is idempotent** (runs twice without error)
- [ ] **All 18+ specialties seeded** correctly
- [ ] **Existing specialty roles migrated** (dentist → DENTAL, etc.)
- [ ] **Existing referrals migrated** (specialty_module → target_specialty_code)
- [ ] **RLS policies active** and enforced
- [ ] **Access control tests pass** (all 5 tests above)
- [ ] **Index usage verified** (EXPLAIN ANALYZE shows Index Scan)
- [ ] **Dashboard RPC < 100ms** on test data

#### Backward Compatibility Tests

- [ ] **`/dental` route works** - existing Dental module functional
- [ ] **`/ophthalmology` route works** - existing Ophthalmology module functional
- [ ] **`/physiotherapy` route works** - existing Physiotherapy module functional
- [ ] **Old referrals visible** in specialty dashboards
- [ ] **Dentist users auto-assigned** `specialty_code = 'DENTAL'`
- [ ] **Ophthalmologist users auto-assigned** `specialty_code = 'OPHTHALMOLOGY'`
- [ ] **Physiotherapist users auto-assigned** `specialty_code = 'PHYSIOTHERAPY'`
- [ ] **Existing consultations** render with original template (not upgraded)
- [ ] **Queue management** works for existing specialty departments

#### Post-Deployment Verification

- [ ] **New specialty (Cardiology)** visible in referral dropdown
- [ ] **Cardiologist user** sees Cardiology dashboard only
- [ ] **Admin user** can switch between all specialties
- [ ] **Referral created** with new specialty_code FK
- [ ] **Referral appears** in target specialty dashboard
- [ ] **No console errors** in browser
- [ ] **No RLS errors** in Supabase logs

---

## Current State Analysis

### Existing Specialty Modules (Hardcoded)
| Module | Location | Queue Department | Referral Key |
|--------|----------|------------------|--------------|
| Dental | `modules/dental/` | `Dental` | `dental` |
| Ophthalmology | `modules/ophthalmology/` | `Ophthalmology` | `ophthalmology` |
| Physiotherapy | `modules/physiotherapy/` | `Physiotherapy` | `physiotherapy` |

### Specialty Clinic Module (Template-Driven)
- **Location**: `modules/specialty-clinic/index.tsx`
- **Supports**: 18 specialties via `specialty_templates` table
- **Missing**: Queue management, referral handling, assessment tracking

### Current Staff Specialty Roles
```typescript
// From database.types.ts - UserRole
| 'dentist'
| 'ophthalmologist'
| 'physiotherapist'
```
**Gap**: Only 3 specialty roles exist. Doctors for other specialties use `doctor` role + `department` field.

### Queue Department Support
```typescript
// From queue.dto.ts - DEPARTMENTS
'Dental' | 'Ophthalmology' | 'Physiotherapy'
```
**Gap**: Only 3 specialty departments in queue. Other specialties route to `Consultation`.

### Internal Referral Options
```typescript
// From SpecialtyOrdersStep.tsx - SpecialtyReferralsState
dental | ophthalmology | physiotherapy | surgery
```
**Gap**: Only 4 referral targets. Need to expand to all 18+ specialties.

---

## Proposed Architecture

### Design Principles
1. **DRY (Don't Repeat Yourself)**: Single dynamic component, not 18 separate modules
2. **Configuration-Driven**: Behavior determined by database/config, not code
3. **Backward Compatible**: Existing Dental/Ophthalmology/Physiotherapy continue working
4. **Extensible**: Adding new specialty = adding database records, not code changes
5. **Performance**: Efficient queries with proper indexing

### Component Structure
```
modules/specialty-clinic/
├── index.tsx                      # Current template-based consultation (keep)
├── pages/
│   └── SpecialtyClinicPage.tsx    # NEW: Dynamic specialty dashboard
├── components/
│   ├── SpecialtyDashboard.tsx     # NEW: Main dashboard container
│   ├── SpecialtyQueue.tsx         # NEW: Waiting queue for specialty
│   ├── SpecialtyReferrals.tsx     # NEW: Referral queue for specialty
│   ├── SpecialtySessions.tsx      # NEW: Active consultation sessions
│   ├── SpecialtyAssessments.tsx   # NEW: Completed assessments list
│   ├── SpecialtyStats.tsx         # NEW: Stats cards for specialty
│   └── SpecialtyTreatmentPlans.tsx# NEW: Treatment plans for specialty
├── hooks/
│   ├── useSpecialtyDashboard.ts   # NEW: Single-call dashboard aggregation
│   ├── useSpecialtyQueue.ts       # NEW: Specialty-specific queue
│   └── useSpecialtyConfig.ts      # NEW: Load specialty configuration
├── api/
│   └── specialty-dashboard.api.ts # NEW: API functions for dashboard
├── types/
│   └── specialty-dashboard.types.ts # NEW: Type definitions
└── config/
    └── specialty-config.ts        # NEW: Icon/color mapping from DB
```

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │               SpecialtyClinicPage.tsx (SINGLE COMPONENT)            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ StatsCards   │  │ TabNavigation│  │ TabContent   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │       ⬇                  ⬇                  ⬇                       │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │       useSpecialtyDashboard(specialtyCode)                 │    │   │
│  │  │       → ONE call to get_specialty_dashboard() RPC          │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
└────────────────────────────────────│────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE (PostgreSQL)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              get_specialty_dashboard(p_specialty_code)                │  │
│  │                                                                       │  │
│  │  1. can_access_specialty() ──────► Access Control Check              │  │
│  │  2. specialty_departments ───────► Config (icon, color, flags)       │  │
│  │  3. queue ───────────────────────► Waiting patients                  │  │
│  │  4. clinical_requests ───────────► Pending referrals                 │  │
│  │  5. Aggregate & return JSON ─────► Single response                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│  │specialty_       │  │staff            │  │clinical_requests        │    │
│  │departments      │  │.specialty_code  │  │.target_specialty_code   │    │
│  │(SINGLE SOURCE)  │  │(FK)             │  │(FK)                     │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

DATA FLOW:
1. User logs in → staff.specialty_code determines their specialty
2. Dashboard loads → ONE call to get_specialty_dashboard()
3. Access control → can_access_specialty() enforced server-side
4. Config from DB → specialty_departments provides all metadata
5. Feature flags → config.feature_flags enables specialty-specific UI
6. No switch/case → All specialties use SAME component with SAME logic
```

---

## Database Changes

### Phase 1: Extend Specialty Configuration

#### 1.1 Add `specialty_departments` Table
```sql
-- =============================================================================
-- SPECIALTY DEPARTMENTS CONFIGURATION TABLE
-- =============================================================================
-- This table is the SINGLE SOURCE OF TRUTH for all specialty configurations.
-- Adding a new specialty = inserting a row here. No code changes required.
-- =============================================================================

CREATE TABLE specialty_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_code varchar(50) NOT NULL,
  specialty_name varchar(100) NOT NULL,
  queue_department varchar(50) NOT NULL,      -- Maps to queue location
  referral_key varchar(50) NOT NULL,          -- Key for referral routing
  icon_name varchar(50),                      -- Lucide icon name
  color_class varchar(50),                    -- Tailwind color class
  requires_dedicated_queue boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 100,
  -- Versioning & Audit
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz DEFAULT now(),
  deprecated_at timestamptz,
  created_by uuid REFERENCES staff(id),
  change_notes text,
  -- Feature Flags (configuration-driven capabilities)
  feature_flags jsonb DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- CONSTRAINTS: Enforce data integrity
  CONSTRAINT specialty_departments_specialty_code_unique UNIQUE (specialty_code),
  CONSTRAINT specialty_departments_version_positive CHECK (version > 0),
  CONSTRAINT specialty_departments_active_deprecation_check 
    CHECK (NOT (is_active = true AND deprecated_at IS NOT NULL))
);

-- UNIQUE INDEX: Only ONE active record per specialty_code
-- Prevents duplicate dashboards for the same specialty
CREATE UNIQUE INDEX idx_specialty_departments_active_unique 
ON specialty_departments (specialty_code) 
WHERE is_active = true;

-- Performance indexes
CREATE INDEX idx_specialty_departments_lookup ON specialty_departments (specialty_code, is_active);
CREATE INDEX idx_specialty_departments_queue ON specialty_departments (queue_department) WHERE is_active = true;
CREATE INDEX idx_specialty_departments_display ON specialty_departments (display_order) WHERE is_active = true;

-- Seed with existing + new specialties
-- feature_flags enables future capabilities without code changes
INSERT INTO specialty_departments (specialty_code, specialty_name, queue_department, referral_key, icon_name, color_class, requires_dedicated_queue, display_order, feature_flags) VALUES
-- Existing (with dedicated queues - backward compatible)
('DENTAL', 'Dental', 'Dental', 'dental', 'Smile', 'text-amber-600', true, 1, '{"has_tooth_chart": true, "has_procedures": true}'::jsonb),
('OPHTHALMOLOGY', 'Ophthalmology', 'Ophthalmology', 'ophthalmology', 'Eye', 'text-blue-600', true, 2, '{"has_vision_test": true, "has_visual_acuity": true}'::jsonb),
('PHYSIOTHERAPY', 'Physiotherapy', 'Physiotherapy', 'physiotherapy', 'Dumbbell', 'text-green-600', true, 3, '{"has_exercises": true, "has_progress_tracking": true}'::jsonb),

-- New specialties (using Consultation queue - routed by specialty_code)
('CARDIOLOGY', 'Cardiology', 'Consultation', 'cardiology', 'Heart', 'text-red-600', false, 10, '{"has_ecg": true}'::jsonb),
('ORTHOPAEDICS', 'Orthopaedics', 'Consultation', 'orthopaedics', 'Bone', 'text-gray-600', false, 11, '{}'::jsonb),
('DERMATOLOGY', 'Dermatology', 'Consultation', 'dermatology', 'Hand', 'text-pink-600', false, 12, '{"has_skin_diagram": true}'::jsonb),
('UROLOGY', 'Urology', 'Consultation', 'urology', 'Activity', 'text-purple-600', false, 13, '{}'::jsonb),
('GASTROENTEROLOGY', 'Gastroenterology', 'Consultation', 'gastroenterology', 'Activity', 'text-orange-600', false, 14, '{}'::jsonb),
('NEPHROLOGY', 'Nephrology', 'Consultation', 'nephrology', 'Droplet', 'text-teal-600', false, 15, '{}'::jsonb),
('PAEDIATRICS', 'Paediatrics', 'Consultation', 'paediatrics', 'Baby', 'text-sky-600', false, 16, '{"has_growth_chart": true}'::jsonb),
('NEUROSURGERY', 'Neurosurgery', 'Consultation', 'neurosurgery', 'Brain', 'text-indigo-600', false, 17, '{}'::jsonb),
('NEUROLOGY', 'Neurology', 'Consultation', 'neurology', 'Brain', 'text-violet-600', false, 18, '{}'::jsonb),
('NEUROPSYCHIATRY', 'Neuropsychiatry', 'Consultation', 'neuropsychiatry', 'Brain', 'text-fuchsia-600', false, 19, '{}'::jsonb),
('GENERAL_SURGERY', 'General Surgery', 'Consultation', 'general_surgery', 'Scissors', 'text-slate-600', false, 20, '{}'::jsonb),
('GYNAECOLOGY', 'Gynaecology', 'Consultation', 'gynaecology', 'Heart', 'text-rose-600', false, 21, '{}'::jsonb),
('ORAL_MAXILLOFACIAL', 'Oral & Maxillofacial', 'Consultation', 'oral_maxillofacial', 'Smile', 'text-amber-700', false, 22, '{}'::jsonb),
('PULMONOLOGY', 'Pulmonology', 'Consultation', 'pulmonology', 'Wind', 'text-cyan-600', false, 23, '{}'::jsonb),
('ENDOCRINOLOGY', 'Endocrinology', 'Consultation', 'endocrinology', 'Activity', 'text-emerald-600', false, 24, '{}'::jsonb),
('PLASTIC_SURGERY', 'Plastic Surgery', 'Consultation', 'plastic_surgery', 'Sparkles', 'text-pink-500', false, 25, '{}'::jsonb),
('ENT', 'ENT (Ear, Nose, Throat)', 'Consultation', 'ent', 'Ear', 'text-yellow-600', false, 26, '{"has_audiogram": true}'::jsonb);
```

#### 1.2 Staff Specialty Assignment with Server-Side Enforcement
```sql
-- =============================================================================
-- STAFF SPECIALTY ENFORCEMENT
-- =============================================================================
-- A doctor can have ONLY ONE active specialty assignment.
-- Admin/super_admin users can access ALL specialties (enforced in RLS/API).
-- =============================================================================

-- Add specialty assignment to staff
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS specialty_code varchar(50) REFERENCES specialty_departments(specialty_code);

-- Index for quick lookups
CREATE INDEX idx_staff_specialty ON staff(specialty_code) WHERE specialty_code IS NOT NULL;

-- UNIQUE PARTIAL INDEX: Ensure one specialty per active clinical staff
-- (Allows admins to have NULL specialty and access all)
CREATE UNIQUE INDEX idx_staff_single_specialty 
ON staff (id) 
WHERE specialty_code IS NOT NULL AND is_active = true 
  AND role IN ('doctor', 'dentist', 'ophthalmologist', 'physiotherapist');

-- Auto-populate specialty_code for existing specialty roles (backward compat)
UPDATE staff SET specialty_code = 'DENTAL' WHERE role = 'dentist' AND specialty_code IS NULL;
UPDATE staff SET specialty_code = 'OPHTHALMOLOGY' WHERE role = 'ophthalmologist' AND specialty_code IS NULL;
UPDATE staff SET specialty_code = 'PHYSIOTHERAPY' WHERE role = 'physiotherapist' AND specialty_code IS NULL;

-- Helper function: Check if user can access a specialty
CREATE OR REPLACE FUNCTION can_access_specialty(p_specialty_code varchar)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_user_specialty TEXT;
BEGIN
  SELECT role::TEXT, specialty_code INTO v_user_role, v_user_specialty
  FROM staff
  WHERE user_id = auth.uid();
  
  -- Admins and medical directors can access all specialties
  IF v_user_role IN ('super_admin', 'admin', 'medical_director') THEN
    RETURN TRUE;
  END IF;
  
  -- Others can only access their assigned specialty
  RETURN v_user_specialty = p_specialty_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.3 Queue Routing Strategy (No Enum Expansion)
```sql
-- =============================================================================
-- QUEUE ROUTING STRATEGY
-- =============================================================================
-- DO NOT expand queue_location_enum per specialty.
-- Route by: queue_location + specialty_code combination.
-- Use requires_dedicated_queue flag in specialty_departments.
-- =============================================================================

-- Add specialty_code to queue table for routing
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS specialty_code varchar(50) REFERENCES specialty_departments(specialty_code);

-- Index for specialty-aware queue queries
CREATE INDEX idx_queue_specialty ON queue(specialty_code, location, status) 
WHERE specialty_code IS NOT NULL;

-- View for specialty queue (used by dashboard)
CREATE OR REPLACE VIEW specialty_queue_view AS
SELECT 
  q.*,
  sd.specialty_name,
  sd.icon_name,
  sd.color_class,
  p.first_name || ' ' || p.last_name AS patient_name,
  p.emr_number,
  p.patient_id AS display_patient_id
FROM queue q
JOIN specialty_departments sd ON sd.specialty_code = q.specialty_code
JOIN patients p ON p.id = q.patient_id
WHERE sd.is_active = true
  AND q.status IN ('Waiting', 'In Progress', 'Called');
```

#### 1.4 Extend Referral Routing (Dynamic, Not Enum-Based)
```sql
-- =============================================================================
-- REFERRAL ROUTING - DYNAMIC & AUDIT-SAFE
-- =============================================================================
-- Use target_specialty_code (FK to specialty_departments) instead of enums.
-- Supports unlimited specialties without code changes.
-- Maintains full audit history.
-- =============================================================================

-- Add specialty_department column to clinical_requests
ALTER TABLE clinical_requests 
ADD COLUMN IF NOT EXISTS target_specialty_code varchar(50) REFERENCES specialty_departments(specialty_code);

-- Index for referral queries by specialty
CREATE INDEX idx_clinical_requests_target_specialty 
ON clinical_requests(target_specialty_code, status) 
WHERE request_type = 'Referral';

-- Migration: Update existing referrals to use new column (backward compat)
UPDATE clinical_requests 
SET target_specialty_code = 'DENTAL' 
WHERE specialty_module = 'dental' AND target_specialty_code IS NULL;

UPDATE clinical_requests 
SET target_specialty_code = 'OPHTHALMOLOGY' 
WHERE specialty_module = 'ophthalmology' AND target_specialty_code IS NULL;

UPDATE clinical_requests 
SET target_specialty_code = 'PHYSIOTHERAPY' 
WHERE specialty_module = 'physiotherapy' AND target_specialty_code IS NULL;

-- Add referral audit columns
ALTER TABLE clinical_requests
ADD COLUMN IF NOT EXISTS referral_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS referral_accepted_by uuid REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS referral_rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS referral_rejected_by uuid REFERENCES staff(id),
ADD COLUMN IF NOT EXISTS referral_rejection_reason text;
```

#### 1.5 Medico-Legal Audit Safety for Consultations
```sql
-- =============================================================================
-- MEDICO-LEGAL AUDIT SAFETY
-- =============================================================================
-- Each consultation PERMANENTLY stores template information.
-- Old consultations NEVER upgrade to new templates.
-- Rendering old records always reflects the ORIGINAL template.
-- =============================================================================

-- Ensure consultation audit columns exist (from 047 migration)
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS specialty_template_id uuid REFERENCES specialty_templates(id),
ADD COLUMN IF NOT EXISTS specialty_template_version integer,
ADD COLUMN IF NOT EXISTS specialty_code varchar(50),
ADD COLUMN IF NOT EXISTS specialty_data jsonb;

-- Schema snapshot for long-term legal compliance (optional but recommended)
-- Stores a copy of the template schema at time of consultation
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS specialty_schema_snapshot jsonb;

-- Index for specialty consultation queries
CREATE INDEX idx_consultations_specialty_code ON consultations(specialty_code) 
WHERE specialty_code IS NOT NULL;

CREATE INDEX idx_consultations_specialty_template ON consultations(specialty_template_id) 
WHERE specialty_template_id IS NOT NULL;

-- GIN index for searching inside specialty_data JSONB
CREATE INDEX idx_consultations_specialty_data_gin 
ON consultations USING GIN (specialty_data jsonb_path_ops)
WHERE specialty_data IS NOT NULL;

-- Trigger: Auto-populate template info on consultation insert
CREATE OR REPLACE FUNCTION set_consultation_specialty_template()
RETURNS TRIGGER AS $$
DECLARE
  v_template RECORD;
BEGIN
  -- Only if specialty_code is set and template_id is not already set
  IF NEW.specialty_code IS NOT NULL AND NEW.specialty_template_id IS NULL THEN
    SELECT id, version INTO v_template
    FROM specialty_templates
    WHERE specialty_code = NEW.specialty_code AND is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      NEW.specialty_template_id := v_template.id;
      NEW.specialty_template_version := v_template.version;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultation_specialty_template ON consultations;
CREATE TRIGGER trg_consultation_specialty_template
  BEFORE INSERT ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION set_consultation_specialty_template();

-- RLS Policy: Specialty consultation access
CREATE POLICY specialty_consultations_access ON consultations
  FOR SELECT USING (
    specialty_code IS NULL 
    OR can_access_specialty(specialty_code)
  );
```

---

## Backend API Architecture

### Design Principles
1. **Single Aggregated Call**: Dashboard loads from ONE API call, not multiple frontend queries
2. **Server-Side Access Control**: Enforced via `can_access_specialty()` function
3. **Index-Friendly Queries**: All queries use proper indexes
4. **No Specialty-Specific Logic**: Same code handles all specialties

### Required API Endpoints

| Endpoint | Purpose | Access Control |
|----------|---------|----------------|
| `GET /api/specialty/:code/dashboard` | Aggregated dashboard data | `can_access_specialty(code)` |
| `GET /api/specialty/:code/queue` | Patients waiting for specialty | `can_access_specialty(code)` |
| `GET /api/specialty/:code/referrals` | Incoming referrals | `can_access_specialty(code)` |
| `GET /api/specialty/:code/sessions` | Active consultations | `can_access_specialty(code)` |
| `GET /api/specialty/:code/assessments` | Completed assessments | `can_access_specialty(code)` |
| `GET /api/specialty-departments` | All active specialties | Public (for navigation) |

### Aggregated Dashboard Endpoint (Server-Side)

```sql
-- =============================================================================
-- AGGREGATED DASHBOARD FUNCTION
-- =============================================================================
-- Returns all dashboard data in ONE call, avoiding N+1 frontend queries.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_specialty_dashboard(p_specialty_code varchar)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_config RECORD;
  v_stats jsonb;
  v_queue jsonb;
  v_referrals jsonb;
BEGIN
  -- Access control check
  IF NOT can_access_specialty(p_specialty_code) THEN
    RAISE EXCEPTION 'Access denied to specialty: %', p_specialty_code;
  END IF;

  -- Get specialty configuration
  SELECT * INTO v_config 
  FROM specialty_departments 
  WHERE specialty_code = p_specialty_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialty not found: %', p_specialty_code;
  END IF;

  -- Aggregate stats
  SELECT jsonb_build_object(
    'waiting', COUNT(*) FILTER (WHERE q.status = 'Waiting'),
    'in_progress', COUNT(*) FILTER (WHERE q.status = 'In Progress'),
    'completed_today', COUNT(*) FILTER (WHERE q.status = 'Completed' AND q.completed_at::date = CURRENT_DATE),
    'pending_referrals', (
      SELECT COUNT(*) FROM clinical_requests 
      WHERE target_specialty_code = p_specialty_code 
        AND request_type = 'Referral' 
        AND status IN ('Pending', 'Approved')
    )
  ) INTO v_stats
  FROM queue q
  WHERE q.specialty_code = p_specialty_code 
    OR (q.location = v_config.queue_department AND v_config.requires_dedicated_queue = true);

  -- Get queue (limited to 50 for performance)
  SELECT jsonb_agg(row_to_json(sq.*) ORDER BY sq.created_at) INTO v_queue
  FROM (
    SELECT q.id, q.ticket_number, q.status, q.priority, q.created_at,
           p.first_name, p.last_name, p.emr_number, p.patient_id
    FROM queue q
    JOIN patients p ON p.id = q.patient_id
    WHERE (q.specialty_code = p_specialty_code 
           OR (q.location = v_config.queue_department AND v_config.requires_dedicated_queue = true))
      AND q.status IN ('Waiting', 'Called', 'In Progress')
    ORDER BY q.created_at
    LIMIT 50
  ) sq;

  -- Get pending referrals (limited to 20)
  SELECT jsonb_agg(row_to_json(sr.*) ORDER BY sr.created_at DESC) INTO v_referrals
  FROM (
    SELECT cr.id, cr.request_number, cr.status, cr.urgency, cr.clinical_notes, cr.created_at,
           p.first_name, p.last_name, p.emr_number,
           s.first_name AS requesting_doctor_first, s.last_name AS requesting_doctor_last
    FROM clinical_requests cr
    JOIN patients p ON p.id = cr.patient_id
    LEFT JOIN staff s ON s.id = cr.requested_by
    WHERE cr.target_specialty_code = p_specialty_code 
      AND cr.request_type = 'Referral'
      AND cr.status IN ('Pending', 'Approved', 'In_Progress')
    ORDER BY cr.created_at DESC
    LIMIT 20
  ) sr;

  -- Build final result
  v_result := jsonb_build_object(
    'config', jsonb_build_object(
      'specialty_code', v_config.specialty_code,
      'specialty_name', v_config.specialty_name,
      'icon_name', v_config.icon_name,
      'color_class', v_config.color_class,
      'feature_flags', v_config.feature_flags
    ),
    'stats', v_stats,
    'queue', COALESCE(v_queue, '[]'::jsonb),
    'referrals', COALESCE(v_referrals, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### TypeScript API Implementation

```typescript
// specialty-dashboard.api.ts

import { supabase } from '@/api/supabaseClient';

export interface SpecialtyDashboardData {
  config: {
    specialty_code: string;
    specialty_name: string;
    icon_name: string;
    color_class: string;
    feature_flags: Record<string, boolean>;
  };
  stats: {
    waiting: number;
    in_progress: number;
    completed_today: number;
    pending_referrals: number;
  };
  queue: QueuePatient[];
  referrals: SpecialtyReferral[];
}

/**
 * Fetch aggregated dashboard data in ONE call
 * Access control enforced server-side
 */
export async function getSpecialtyDashboard(specialtyCode: string): Promise<SpecialtyDashboardData> {
  const { data, error } = await supabase.rpc('get_specialty_dashboard', {
    p_specialty_code: specialtyCode
  });

  if (error) throw error;
  return data as SpecialtyDashboardData;
}

/**
 * Fetch all active specialties (for navigation/referral dropdown)
 */
export async function getSpecialtyDepartments() {
  const { data, error } = await supabase
    .from('specialty_departments')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data;
}

/**
 * Get current user's assigned specialty
 */
export async function getCurrentUserSpecialty(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('staff')
    .select('specialty_code, role')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  
  // Admins don't have a specific specialty
  if (['super_admin', 'admin', 'medical_director'].includes(data.role)) {
    return null; // They can access all via dropdown
  }
  
  return data.specialty_code;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Database + Types)
**Duration**: 1-2 days

1. **Create Migration**: `060_specialty_departments.sql`
   - Create `specialty_departments` table
   - Seed all 18+ specialties
   - Add `specialty_code` to staff table
   - Add `target_specialty_code` to clinical_requests

2. **Update TypeScript Types**
   ```typescript
   // New file: types/specialty.types.ts
   export interface SpecialtyDepartment {
     id: string;
     specialty_code: string;
     specialty_name: string;
     queue_department: string;
     referral_key: string;
     icon_name: string;
     color_class: string;
     requires_dedicated_queue: boolean;
     is_active: boolean;
     display_order: number;
   }
   ```

3. **Create API Functions**
   - `getSpecialtyDepartments()` - Fetch all active specialties
   - `getSpecialtyByCode(code: string)` - Fetch single specialty
   - `getStaffSpecialty(staffId: string)` - Get logged-in user's specialty

### Phase 2: Dynamic Dashboard UI
**Duration**: 2-3 days

#### UI Architecture Principles (Non-Negotiable)
1. **Single API Call**: Dashboard loads from `get_specialty_dashboard()` RPC
2. **Dynamic Tabs**: Tabs rendered from configuration, not hardcoded
3. **No Specialty Checks**: Zero `if (specialty === 'cardiology')` in React components
4. **Feature Flags**: Specialty-specific UI enabled via `feature_flags` from DB
5. **Metadata from DB**: Icons, colors, labels all from `specialty_departments`

1. **Create `SpecialtyClinicPage.tsx`**
   - Detect current user's specialty from `staff.specialty_code`
   - Load specialty configuration from `specialty_departments`
   - Render tabs: Queue | Referrals | Sessions | Assessments | Treatment Plans

2. **Create Dashboard Components**
   
   | Component | Purpose | Data Source |
   |-----------|---------|-------------|
   | `SpecialtyStats.tsx` | Stats cards (waiting, in-progress, completed) | Aggregated queries |
   | `SpecialtyQueue.tsx` | Patients in queue for this specialty | `useDepartmentQueue(dept)` |
   | `SpecialtyReferrals.tsx` | Referrals to this specialty | Modified `useSpecialtyReferrals(code)` |
   | `SpecialtySessions.tsx` | Active consultations | Active encounters with this specialty |
   | `SpecialtyAssessments.tsx` | Completed assessments | Consultations with specialty_code |
   | `SpecialtyTreatmentPlans.tsx` | Treatment plans for specialty patients | Treatment plans linked to specialty |

3. **Create Hooks (Single-Call Architecture)**
   ```typescript
   // useSpecialtyDashboard.ts
   // Uses ONE aggregated RPC call - no multiple queries
   import { useQuery } from '@tanstack/react-query';
   import { getSpecialtyDashboard, SpecialtyDashboardData } from '../api/specialty-dashboard.api';

   export function useSpecialtyDashboard(specialtyCode: string | null) {
     return useQuery<SpecialtyDashboardData>({
       queryKey: ['specialty-dashboard', specialtyCode],
       queryFn: () => getSpecialtyDashboard(specialtyCode!),
       enabled: !!specialtyCode,
       staleTime: 30000, // 30 seconds
       refetchInterval: 60000, // 1 minute auto-refresh
     });
   }

   // useCurrentUserSpecialty.ts
   // Detects logged-in user's specialty for routing
   export function useCurrentUserSpecialty() {
     const { staff } = useAuth();
     return useQuery({
       queryKey: ['user-specialty'],
       queryFn: getCurrentUserSpecialty,
       enabled: !!staff,
       staleTime: Infinity, // Doesn't change during session
     });
   }

   // useSpecialtyDepartments.ts
   // Loads all specialties for referral dropdowns
   export function useSpecialtyDepartments() {
     return useQuery({
       queryKey: ['specialty-departments'],
       queryFn: getSpecialtyDepartments,
       staleTime: 5 * 60 * 1000, // 5 minutes cache
     });
   }
   ```

### Phase 3: Generalized Referral System
**Duration**: 1-2 days

#### Referral System Requirements
- Use `target_specialty_code` FK (not enum-based routing)
- Support UNLIMITED specialties without code changes
- Maintain full audit history
- Old referrals continue working (backward compat)

1. **Update `SpecialtyReferralsState`** in `SpecialtyOrdersStep.tsx`
   - Currently hardcoded to 4 options (dental, ophthalmology, physiotherapy, surgery)
   - Change to dynamic loading from `specialty_departments`
   
   ```typescript
   // BEFORE (hardcoded)
   interface SpecialtyReferralsState {
     dental: SpecialtyReferralState;
     ophthalmology: SpecialtyReferralState;
     physiotherapy: SpecialtyReferralState;
     surgery: SpecialtyReferralState;
   }
   
   // AFTER (dynamic)
   interface SpecialtyReferralsState {
     selectedSpecialties: string[]; // Array of specialty_codes
     referralDetails: Record<string, SpecialtyReferralState>;
   }
   ```

2. **Update `useSpecialtyReferrals` Hook**
   - Accept any specialty code, not just 3 hardcoded values
   - Query by `target_specialty_code` column
   
   ```typescript
   // hooks/useClinicalRequests.ts
   export function useSpecialtyReferrals(
     specialtyCode: string, // Now accepts ANY specialty code
     status?: ClinicalRequestStatus[]
   ) {
     return useQuery({
       queryKey: ['specialty-referrals', specialtyCode, status],
       queryFn: () => getClinicalRequests({
         request_type: 'Referral',
         target_specialty_code: specialtyCode, // Use FK, not enum
         status: status,
       }),
       refetchInterval: 30000,
     });
   }
   ```

3. **Update Referral Creation Flow**
   - When creating referral, set `target_specialty_code` from selected specialty
   
   ```typescript
   // Create referral with specialty_code
   const createReferral = async (referral: CreateReferralDTO) => {
     const { data, error } = await supabase
       .from('clinical_requests')
       .insert({
         request_type: 'Referral',
         target_specialty_code: referral.specialty_code, // Dynamic
         patient_id: referral.patient_id,
         encounter_id: referral.encounter_id,
         clinical_notes: referral.notes,
         urgency: referral.urgency,
         requested_by: currentUser.id,
       });
     
     if (error) throw error;
     return data;
   };
   ```

### Phase 4: Navigation Integration
**Duration**: 1 day

1. **Update Sidebar Navigation**
   - Add "My Specialty Clinic" menu item for specialty staff
   - Dynamic route based on user's `specialty_code`

2. **Update Routing**
   - Add route: `/specialty-clinic/:specialtyCode`
   - Validate user has access to their assigned specialty

3. **Access Control**
   - Doctors see only their assigned specialty dashboard
   - Admins/Medical Directors can see all

### Phase 5: Backward Compatibility
**Duration**: 1 day

1. **Keep Existing Modules Running**
   - `modules/dental/`, `modules/ophthalmology/`, `modules/physiotherapy/` remain
   - These can be deprecated gradually after testing

2. **Migration Path**
   - Update staff records to set `specialty_code` for existing specialty roles
   - Dentist role → `specialty_code = 'DENTAL'`
   - Ophthalmologist role → `specialty_code = 'OPHTHALMOLOGY'`
   - Physiotherapist role → `specialty_code = 'PHYSIOTHERAPY'`

3. **Feature Parity Check**
   - Ensure dynamic version has all features of hardcoded modules
   - Dental: Tooth chart, procedures, exams
   - Ophthalmology: Vision tests, Visual acuity
   - Physiotherapy: Exercises, sessions, progress tracking

---

## UI Design Specification

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Icon] Cardiology Clinic                               [Search] [Refresh] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Waiting  │  │ In Prog  │  │ Completed│  │ Referrals│                 │
│  │   12     │  │    3     │  │   45     │  │    5     │                 │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                 │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  [Queue] [Referrals] [Sessions] [Assessments] [Treatment Plans] [History]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Queue Tab Content:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ #001 | John Doe | REG-2024001 | Chest Pain | 15 min | [Start Exam]  │ │
│  │ #002 | Jane Smith | REG-2024002 | Palpitations | 10 min | [Start]   │ │
│  │ #003 | Mike Brown | REG-2024003 | Follow-up | 5 min | [Start]       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tab Definitions

| Tab | Content | Actions |
|-----|---------|---------|
| Queue | Patients waiting after payment | Start Exam, View Records, Skip |
| Referrals | Incoming referrals from other doctors | Accept, Reject, View Details |
| Sessions | Active consultations in progress | Continue, Complete |
| Assessments | Completed specialty exams | View, Print, Export |
| Treatment Plans | Active treatment plans | View Progress, Update |
| History | Past consultations | View, Print Report |

---

## API Endpoints (Production-Grade)

### Access Control Matrix

| Role | Own Specialty | Other Specialties | All Specialties |
|------|---------------|-------------------|-----------------|
| `doctor` with `specialty_code` | ✅ | ❌ | ❌ |
| `dentist` | ✅ (DENTAL) | ❌ | ❌ |
| `ophthalmologist` | ✅ (OPHTHALMOLOGY) | ❌ | ❌ |
| `physiotherapist` | ✅ (PHYSIOTHERAPY) | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ |
| `super_admin` | ✅ | ✅ | ✅ |
| `medical_director` | ✅ | ✅ | ✅ |

### Endpoint Specifications

```typescript
// specialty-dashboard.api.ts

// =============================================================================
// MAIN DASHBOARD ENDPOINT
// =============================================================================
// Returns ALL dashboard data in ONE call
// Access: can_access_specialty(code) enforced server-side

GET /api/specialty/:code/dashboard
Response: SpecialtyDashboardData {
  config: { specialty_code, specialty_name, icon_name, color_class, feature_flags }
  stats: { waiting, in_progress, completed_today, pending_referrals }
  queue: QueuePatient[]
  referrals: SpecialtyReferral[]
}

// =============================================================================
// PAGINATION ENDPOINTS (for large lists)
// =============================================================================

GET /api/specialty/:code/queue?page=1&limit=20
GET /api/specialty/:code/referrals?status=Pending&page=1&limit=20
GET /api/specialty/:code/sessions?page=1&limit=20
GET /api/specialty/:code/assessments?date_from=2026-01-01&page=1&limit=20

// =============================================================================
// ACTION ENDPOINTS
// =============================================================================

POST /api/specialty/:code/referrals/:id/accept
Body: { notes?: string }
Response: { success: true, referral: ClinicalRequest }

POST /api/specialty/:code/referrals/:id/reject
Body: { reason: string }
Response: { success: true }

POST /api/specialty/:code/queue/:id/start
Response: { success: true, encounter_id: string }

POST /api/specialty/:code/queue/:id/complete
Body: { notes?: string }
Response: { success: true }
```

### Query Examples (Index-Optimized)

```typescript
// Get specialty queue
const getSpecialtyQueue = async (specialtyCode: string, queueDepartment: string) => {
  const { data, error } = await supabase
    .from('queue')
    .select(`
      *,
      patient:patients!patient_id (
        id, patient_id, first_name, last_name, emr_number
      )
    `)
    .eq('location', queueDepartment)
    .eq('status', 'Waiting')
    .order('created_at', { ascending: true });
  
  return data;
};

// Get specialty referrals
const getSpecialtyReferrals = async (specialtyCode: string) => {
  const { data, error } = await supabase
    .from('clinical_requests')
    .select(`
      *,
      patient:patients!patient_id (*),
      encounter:patient_encounters!encounter_id (*),
      requesting_doctor:staff!requested_by (*)
    `)
    .eq('request_type', 'Referral')
    .eq('target_specialty_code', specialtyCode)
    .in('status', ['Pending', 'Approved', 'In_Progress']);
  
  return data;
};
```

---

## Configuration Mapping

### Icon Mapping
```typescript
// specialty-config.ts
import { Heart, Bone, Eye, Ear, Brain, Baby, Scissors, ... } from 'lucide-react';

const SPECIALTY_ICONS: Record<string, React.ComponentType> = {
  'CARDIOLOGY': Heart,
  'ORTHOPAEDICS': Bone,
  'OPHTHALMOLOGY': Eye,
  'ENT': Ear,
  'NEUROLOGY': Brain,
  'NEUROSURGERY': Brain,
  'PAEDIATRICS': Baby,
  'GENERAL_SURGERY': Scissors,
  'DENTAL': Smile,
  // ... etc
};
```

### Color Mapping
```typescript
const SPECIALTY_COLORS: Record<string, string> = {
  'CARDIOLOGY': 'bg-red-100 text-red-700 border-red-200',
  'ORTHOPAEDICS': 'bg-gray-100 text-gray-700 border-gray-200',
  'OPHTHALMOLOGY': 'bg-blue-100 text-blue-700 border-blue-200',
  // ... etc
};
```

---

## Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| Performance with 18+ specialties | Aggregated RPC, proper indexes, pagination | ✅ Designed |
| Breaking existing specialty modules | Keep existing modules, backward compat migration | ✅ Designed |
| User confusion | Clear navigation, role-based menu filtering | ✅ Designed |
| Missing specialty-specific features | Feature flags in DB, gradual rollout | ✅ Designed |
| Data migration errors | Run migration in transaction, staging tests | ⏳ TODO |
| Access control bypass | Server-side `can_access_specialty()` check | ✅ Designed |
| Old consultations breaking | Template version stored permanently | ✅ Designed |
| Referral routing failures | FK constraint to specialty_departments | ✅ Designed |

---

## Performance Considerations

### Index Strategy
```sql
-- All queries use these indexes (verify with EXPLAIN ANALYZE)
idx_specialty_departments_lookup (specialty_code, is_active)
idx_specialty_departments_queue (queue_department)
idx_staff_specialty (specialty_code)
idx_queue_specialty (specialty_code, location, status)
idx_clinical_requests_target_specialty (target_specialty_code, status)
idx_consultations_specialty_code (specialty_code)
```

### Query Performance Goals
| Query | Target | Index Used |
|-------|--------|------------|
| Get specialty config | < 5ms | idx_specialty_departments_lookup |
| Get queue (50 patients) | < 50ms | idx_queue_specialty |
| Get referrals (20 items) | < 30ms | idx_clinical_requests_target_specialty |
| Aggregated dashboard | < 100ms | All indexes |

### Caching Strategy
- Specialty config: 5 min client cache (rarely changes)
- Queue data: 15 sec refresh interval
- Stats: 30 sec refresh interval
- User specialty: Session cache (never changes mid-session)

---

## Validation Checklist (MUST PASS)

### Functional Requirements
- [ ] Adding a new specialty requires **ONLY database records** (no code changes)
- [ ] A cardiologist **CANNOT** see neurology dashboards
- [ ] Admins **CAN** see all specialties
- [ ] Old consultations render correctly after template updates
- [ ] System works with 30+ specialties without refactor

### Access Control Verification
```sql
-- Test: Doctor with CARDIOLOGY specialty tries to access NEUROLOGY
-- Expected: Access denied
SELECT get_specialty_dashboard('NEUROLOGY'); -- Should fail

-- Test: Admin user tries to access any specialty
-- Expected: Access granted
SELECT get_specialty_dashboard('CARDIOLOGY'); -- Should succeed
SELECT get_specialty_dashboard('NEUROLOGY'); -- Should succeed
```

### Performance Verification
```sql
-- Verify index usage for main dashboard query
EXPLAIN ANALYZE SELECT * FROM get_specialty_dashboard('CARDIOLOGY');

-- Should show Index Scan (not Seq Scan) on:
-- - specialty_departments
-- - queue
-- - clinical_requests
```

### Backward Compatibility Verification
- [ ] Existing `/dental` route still works
- [ ] Existing `/ophthalmology` route still works
- [ ] Existing `/physiotherapy` route still works
- [ ] Old referrals with `specialty_module` field still appear
- [ ] Dentist role users auto-get `specialty_code = 'DENTAL'`

---

## Success Criteria

### Core Functionality
- [ ] Any doctor with `specialty_code` sees their specialty dashboard
- [ ] Queue shows patients waiting for their specialty
- [ ] Referrals from other doctors appear in referral queue
- [ ] Can start, complete, and document specialty consultations
- [ ] Stats accurately reflect specialty workload
- [ ] All 18+ specialties configurable via database
- [ ] Existing Dental/Ophthalmology/Physiotherapy modules continue working
- [ ] Adding new specialty requires only database records, no code changes

### Security & Access Control
- [ ] Server-side `can_access_specialty()` enforced on all endpoints
- [ ] Doctors can only access their assigned specialty
- [ ] Admins/Medical Directors can access all specialties
- [ ] No client-side bypasses possible

### Medico-Legal & Audit
- [ ] Consultations permanently store `specialty_template_id`
- [ ] Consultations permanently store `specialty_template_version`
- [ ] Consultations permanently store `specialty_code`
- [ ] Old consultations render with their original template (never upgraded)
- [ ] Referral accept/reject actions are timestamped with actor

### Performance
- [ ] Dashboard loads in < 100ms (single RPC call)
- [ ] All queries use proper indexes (no Seq Scans)
- [ ] System handles 30+ specialties without degradation

---

## Timeline Summary

| Phase | Duration | Deliverables | Priority |
|-------|----------|--------------|----------|
| Phase 1: Foundation | 1-2 days | Migration, types, API, access control | P0 |
| Phase 2: Dashboard UI | 2-3 days | Components, hooks, single-call architecture | P0 |
| Phase 3: Referral System | 1-2 days | Dynamic referrals, unlimited specialties | P0 |
| Phase 4: Navigation | 1 day | Routes, sidebar, role-based filtering | P1 |
| Phase 5: Compatibility | 1 day | Migration, testing, backward compat | P0 |
| **Total** | **6-9 days** | Full implementation | |

---

## Migration Strategy

### Step 1: Run Database Migration
```bash
# Apply migration (idempotent)
psql -f migrations/060_specialty_departments.sql
```

### Step 2: Verify Data Integrity
```sql
-- Check all specialties are seeded
SELECT COUNT(*) FROM specialty_departments WHERE is_active = true;
-- Expected: 18+

-- Check staff specialty assignment
SELECT role, specialty_code, COUNT(*) 
FROM staff 
WHERE role IN ('dentist', 'ophthalmologist', 'physiotherapist')
GROUP BY role, specialty_code;
-- Expected: All have matching specialty_code

-- Check referral migration
SELECT specialty_module, target_specialty_code, COUNT(*)
FROM clinical_requests
WHERE request_type = 'Referral'
GROUP BY specialty_module, target_specialty_code;
-- Expected: target_specialty_code populated for all
```

### Step 3: Deploy Frontend
```bash
# No specialty-specific code changes needed
# Dashboard auto-detects user specialty
```

---

## Approval Checklist

Before proceeding with implementation, please confirm:

- [ ] Database schema changes are acceptable
- [ ] Phased approach is approved
- [ ] UI design aligns with expectations
- [ ] Timeline is feasible
- [ ] Any specific specialties to prioritize?
- [ ] Should existing modules (Dental, Ophthalmology, Physiotherapy) be deprecated after dynamic version is complete?

---

## Next Steps

Upon approval:
1. Create migration `060_specialty_departments.sql` with all hardening improvements
2. Update TypeScript types in `database.types.ts`
3. Create `SpecialtyClinicPage.tsx` with single-call dashboard hook
4. Implement dashboard components (no specialty-specific logic)
5. Update referral system to use `target_specialty_code`
6. Test with Cardiology as first new specialty
7. Verify backward compatibility with Dental/Ophthalmology/Physiotherapy
8. Run performance tests with 30+ specialties

---

## Appendix: Feature Flags Reference

Feature flags enable specialty-specific UI without code changes:

| Flag | Description | Used By |
|------|-------------|---------|
| `has_tooth_chart` | Show tooth chart component | Dental |
| `has_vision_test` | Show visual acuity test | Ophthalmology |
| `has_exercises` | Show exercise prescription | Physiotherapy |
| `has_ecg` | Show ECG integration | Cardiology |
| `has_skin_diagram` | Show body diagram | Dermatology |
| `has_growth_chart` | Show pediatric growth chart | Paediatrics |
| `has_audiogram` | Show audiogram integration | ENT |
| `has_progress_tracking` | Show session progress | Physiotherapy |

### Usage in React Component:
```typescript
// No if/switch by specialty name - use feature flags
const { config } = useSpecialtyDashboard(specialtyCode);

return (
  <div>
    {config.feature_flags.has_tooth_chart && <ToothChart />}
    {config.feature_flags.has_vision_test && <VisionTest />}
    {config.feature_flags.has_growth_chart && <GrowthChart />}
    {/* Generic components shown for all */}
    <SpecialtyQueue />
    <SpecialtyReferrals />
  </div>
);
```

---

*Document Version: 2.2.1 (Phase 1 Implementation Complete)*  
*Created: February 6, 2026*  
*Updated: February 7, 2026*  
*Author: Development Team*

---

## Changelog

### v2.2.1 (February 7, 2026) - Phase 1 Implementation Complete
- ✅ Created `migrations/128_dynamic_specialty_dashboard.sql`:
  - `specialty_departments` table with all 20 specialties seeded
  - `staff.specialty_code` FK with backfill trigger
  - `queue.specialty_code` FK with auto-populate trigger
  - `clinical_requests.target_specialty_code` FK with referral audit columns
  - All RLS policies (SELECT, INSERT, UPDATE) implemented
  - All secure RPCs implemented with `SET search_path`
- ✅ Created `modules/specialty-clinic/types/specialty-dashboard.types.ts`
- ✅ Created `modules/specialty-clinic/api/specialty-dashboard.api.ts`
- ✅ Created `modules/specialty-clinic/hooks/useSpecialtyDashboard.ts`
- ✅ Created `modules/specialty-clinic/pages/SpecialtyClinicPage.tsx`
- ✅ Created `modules/specialty-clinic/exports.ts`
- ⏳ Pending: Route registration in App.tsx
- ⏳ Pending: Sidebar navigation item for specialists

### v2.2 (February 7, 2026) - Missing Pieces & Fixes Audit
- Added comprehensive "Missing Pieces & Fixes" section with prioritized issue list
- Fixed duplicate DDL block in migration (removed orphaned columns fragment)
- Added Patch 1-8 with exact SQL corrections:
  - Patch 1: Duplicate DDL removal
  - Patch 2: `UNIQUE(specialty_code, version)` constraint
  - Patch 3: Clinical role specialty enforcement trigger + backfill
  - Patch 4: Secure `can_access_specialty()` with SET search_path
  - Patch 5: Queue specialty code auto-population trigger
  - Patch 6: Complete RLS policies (INSERT/UPDATE/DELETE)
  - Patch 7: Referral accept/reject RPCs with audit
  - Patch 8: Session start/complete RPCs with audit
- Added frontend minimal changes checklist

### v2.1 (February 7, 2026) - Implementation Specification
- Added detailed implementation specification section (v2.1)
- Added migration requirements with clean, idempotent structure
- Added security function signatures with `SECURITY DEFINER` + `SET search_path` hardening
- Added queue specialty assignment strategy decision matrix
- Added complete RLS policy requirements and examples
- Added SpecialtyClinicPage.tsx specification with forbidden patterns
- Added TypeScript types specification for all DTOs
- Added API wrapper and hooks skeleton code
- Added access control test queries (5 test cases)
- Added EXPLAIN ANALYZE performance verification queries
- Added staging verification checklist (pre-deployment + backward compat + post-deployment)

### v2.0 (February 7, 2026) - Production Hardening
- Added strict constraints section (no new modules, no duplicate logic)
- Added database hardening with constraints and unique indexes
- Added server-side access control via `can_access_specialty()` function
- Added aggregated dashboard RPC for single-call architecture
- Added queue routing strategy without enum expansion
- Added medico-legal audit safety for consultations
- Added referral system generalization with unlimited specialties
- Added performance considerations and index strategy
- Added validation checklist with specific test cases
- Added migration strategy with verification steps
- Added feature flags reference for specialty-specific UI
