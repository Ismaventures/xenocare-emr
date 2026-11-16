# NHIS Authorization & Referral Workflow - Gap Analysis & Implementation Plan

> **Document Created**: February 1, 2026  
> **Purpose**: Compare existing EMR NHIS implementation with ideal workflow, identify gaps, and create actionable implementation plan

---

## 📋 Executive Summary

The existing EMR has a **substantial NHIS infrastructure** already in place, including database tables, APIs, hooks, and UI components. However, several **critical enforcement points** and **workflow automation** features are missing or incomplete.

### Current State Score: **~70% Complete**

| Area | Status | Notes |
|------|--------|-------|
| Database Schema | ✅ 95% | Most tables exist, minor field additions needed |
| API Layer | ✅ 85% | Core functions exist, some RPC functions need updates |
| React Hooks | ✅ 80% | Hooks exist, need additional queries |
| UI Components | ⚠️ 70% | Components exist but not integrated into clinical workflows |
| Enforcement Logic | ⚠️ 40% | Gates exist but not enforced at service points |
| Automation | ❌ 20% | No background jobs, expiry handling incomplete |

---

## 🔍 Detailed Gap Analysis

### 1. Database Schema Comparison

#### ✅ Fields That Already Exist

| Ideal Field | Existing Equivalent | Table | Status |
|-------------|-------------------|-------|--------|
| `patient_id` | ✅ `patient_id` | `nhis_authorizations` | Complete |
| `encounter_id` | ✅ `encounter_id` (nullable) | `nhis_authorizations` | Complete |
| `service_code / clinic_code` | ⚠️ `service_category` | `nhis_authorizations` | Partial - needs expansion |
| `authorization_code` | ✅ `code` | `nhis_authorizations` | Complete |
| `authorization_type` | ⚠️ `auth_type` (referral/emergency/pre_auth) | `nhis_authorizations` | Needs `internal/external` addition |
| `status` | ✅ `status` (pending/active/expired/revoked/used) | `nhis_authorizations` | Complete |
| `issued_date` | ✅ `issued_at` | `nhis_authorizations` | Complete |
| `expiry_date` | ✅ `expires_at` | `nhis_authorizations` | Complete |
| `verified_by` | ✅ `issued_by` + encounter's `nhis_verified_by` | Mixed | Complete |
| `verified_at` | ✅ `nhis_verified_at` | `visits` | Complete |
| `is_provisional` | ❌ Missing | `nhis_authorizations` | **NEEDS ADDITION** |
| `provisional_reason` | ❌ Missing | `nhis_authorizations` | **NEEDS ADDITION** |

#### ❌ Missing Fields (To Be Added)

```sql
-- Add to nhis_authorizations table
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS is_provisional BOOLEAN DEFAULT FALSE;
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS provisional_reason TEXT;
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS provisional_approved_by UUID REFERENCES staff(id);
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS provisional_approved_at TIMESTAMPTZ;
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS actual_code_received_at TIMESTAMPTZ;
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS specific_clinic_code VARCHAR(50);
ALTER TABLE nhis_authorizations ADD COLUMN IF NOT EXISTS authorization_source VARCHAR(20) CHECK (authorization_source IN ('internal', 'external'));

-- Add index for provisional approval tracking
CREATE INDEX IF NOT EXISTS idx_nhis_auth_provisional ON nhis_authorizations(is_provisional, status) WHERE is_provisional = TRUE;
```

---

### 2. Workflow Logic Comparison

#### A. External NHIS Referral Patient Workflow

| Step | Ideal Workflow | Current Implementation | Gap |
|------|---------------|----------------------|-----|
| 1. Patient arrives | ✅ Registered with referral details | ✅ PatientForm captures `nhis_patient_source='Referral'` | None |
| 2. Encounter created | ✅ Routed to NHIS queue | ✅ EncounterForm detects referral, creates queue item | None |
| 3. NHIS desk verification | ✅ Validates code, 30-day expiry, service match | ⚠️ Validates expiry but **not service match** | **Service matching not enforced** |
| 4. Authorization linked to encounter | ✅ Encounter cannot proceed without auth | ⚠️ `nhis_auth_id` exists but **not enforced** | **Enforcement missing** |
| 5. Service-specific gate | ✅ Authorization tied to specific service | ❌ Authorization is patient-level, not service-specific | **Major gap** |
| 6. Auto-expire after 30 days | ✅ Automatic status update | ⚠️ Computed at query time only | **No background job** |

#### B. Internal NHIS Patient - Special Services

| Step | Ideal Workflow | Current Implementation | Gap |
|------|---------------|----------------------|-----|
| 1. Doctor requests special service | ✅ Request auto-routed to NHIS desk | ⚠️ `nhis_approvals` table exists but **not integrated into specialty referral** | **Integration missing** |
| 2. NHIS desk obtains authorization | ✅ Sets status=pending, then approved | ⚠️ Manual process, no queue visibility | **Workflow incomplete** |
| 3. Provisional approval allowed | ✅ Marked with countdown, tracked | ❌ No provisional approval workflow | **Not implemented** |
| 4. Code arrives → Status updated | ✅ Retroactive code entry | ❌ No UI for retroactive code entry | **Not implemented** |

---

### 3. Enforcement Rules Comparison

| Rule | Ideal | Current | Status |
|------|-------|---------|--------|
| Clinic cannot proceed if no authorization | ✅ Hard stop | ❌ Warning only, can bypass | **NOT ENFORCED** |
| Clinic cannot proceed if authorization expired | ✅ Hard stop | ⚠️ Status shows "expired" but no block | **NOT ENFORCED** |
| Service must match authorization | ✅ Validated | ❌ No service-to-auth matching | **NOT IMPLEMENTED** |
| One authorization cannot be reused for another service | ✅ Strict | ❌ Authorization is patient-level | **NOT ENFORCED** |
| Authorization cannot span multiple encounters | ✅ Encounter-bound | ⚠️ `encounter_id` exists but nullable | **PARTIALLY ENFORCED** |
| Multiple authorizations per encounter allowed | ✅ For multiple services | ⚠️ Schema supports but UI doesn't | **UI MISSING** |

---

### 4. UI/UX Comparison

#### NHIS Desk Dashboard

| Feature | Ideal | Current | Gap |
|---------|-------|---------|-----|
| Pending approvals | ✅ | ✅ `NhisApprovalQueue` | None |
| Provisional approvals with countdown | ✅ | ❌ Not implemented | **MISSING** |
| Expiring authorizations (next 7 days) | ✅ | ❌ Not implemented | **MISSING** |
| Missing authorization codes | ✅ | ❌ Not implemented | **MISSING** |

#### Clinic Screen Banners

| Feature | Ideal | Current | Gap |
|---------|-------|---------|-----|
| 🟢 "NHIS Authorized" | ✅ | ⚠️ `NhisVerificationWidget` shows status | Exists but not in specialty modules |
| 🟡 "Provisionally Approved – Awaiting Code" | ✅ | ❌ Not implemented | **MISSING** |
| 🔴 "NHIS Authorization Required" | ✅ | ⚠️ Shows "unverified" but not blocking | **Enforcement missing** |

---

## 📊 Component/Module Integration Status

| Module | NHIS Integration | Status |
|--------|-----------------|--------|
| Patient Registration | ✅ Captures NHIS details | Complete |
| Encounter Office | ✅ Referral queue workflow | Complete |
| NHIS Module | ✅ Full dashboard | Complete |
| Clinical Consultation | ⚠️ Widget available but not blocking | Incomplete |
| Laboratory | ⚠️ `billing_release_status` not enforced | Incomplete |
| Radiology | ⚠️ `billing_release_status` not enforced | Incomplete |
| Pharmacy | ⚠️ `billing_release_status` not enforced | Incomplete |
| **Dental Clinic** | ❌ No NHIS integration | **Missing** |
| **Eye Clinic (Ophthalmology)** | ❌ No NHIS integration | **Missing** |
| **Physiotherapy** | ❌ No NHIS integration | **Missing** |
| Billing | ⚠️ NHIS tagging exists | Partial |

---

## 🚀 Implementation Plan

### Phase 1: Database Schema Updates (Priority: HIGH)

**Effort**: 1 day  
**Files**: New migration file

```
Migration: 065_nhis_provisional_authorization.sql
- Add is_provisional field to nhis_authorizations
- Add provisional_reason field
- Add provisional_approved_by/at fields
- Add actual_code_received_at field
- Add specific_clinic_code field
- Add authorization_source (internal/external) field
- Create indexes for provisional tracking
- Create database function for provisional approval workflow
```

### Phase 2: Service-Specific Authorization Enforcement (Priority: HIGH)

**Effort**: 2-3 days  
**Goal**: Link authorizations to specific services/clinics

**Tasks**:
1. Update `nhis_authorizations` to support service codes
2. Create mapping table `nhis_authorization_services` (auth_id, service_type, service_id)
3. Add validation function `check_nhis_authorization_for_service(encounter_id, service_type, service_id)`
4. Integrate into lab request, radiology request, prescription workflows

### Phase 3: Specialty Clinic NHIS Integration (Priority: HIGH)

**Effort**: 3-4 days  
**Goal**: Connect internal referrals to NHIS authorization workflow

**Tasks**:
1. When internal referral created → Auto-create `nhis_approvals` record
2. Route approval to NHIS desk queue
3. NHIS desk can:
   - Request authorization code
   - Mark as provisionally approved
   - Enter actual code when received
4. Specialty clinic sees authorization status banner
5. Block service if not approved

**Files to modify**:
- `ConsultationWizard.tsx` (internal referral submission)
- `NhisApprovalQueue.tsx` (add specialty referral handling)
- `DentalPage.tsx`, `OphthalmologyPage.tsx`, `PhysiotherapyPage.tsx` (add NHIS gates)

### Phase 4: Provisional Approval Workflow (Priority: MEDIUM)

**Effort**: 2 days  
**Goal**: Allow temporary approval pending official code

**Tasks**:
1. Add "Provisionally Approve" button on NHIS approval queue
2. Capture provisional reason
3. Mark authorization as `is_provisional = true`
4. Show countdown timer in NHIS dashboard
5. Add "Enter Official Code" action to update record
6. Audit log all provisional approvals

### Phase 5: Enforcement Gates (Priority: HIGH)

**Effort**: 2-3 days  
**Goal**: Hard stops at clinical service points

**Tasks**:
1. Create `useNhisServiceGate` hook
2. Integrate into:
   - Lab test ordering (prevent order if NHIS not approved)
   - Radiology ordering
   - Prescription creation
   - Procedure requests
3. Show modal requiring NHIS approval before proceeding
4. Allow emergency override with mandatory reason

### Phase 6: Dashboard Enhancements (Priority: MEDIUM)

**Effort**: 1-2 days  
**Goal**: Improve NHIS desk visibility

**Tasks**:
1. Add "Provisional Approvals" card with countdown timers
2. Add "Expiring Soon (7 days)" section
3. Add "Missing Codes" section for provisional approvals > 48 hours old
4. Real-time counters for queue lengths

### Phase 7: Clinic Banner Integration (Priority: MEDIUM)

**Effort**: 1 day  
**Goal**: Visual status in all clinical modules

**Tasks**:
1. Enhance `NhisVerificationWidget` with provisional state
2. Embed in Dental, Ophthalmology, Physiotherapy modules
3. Show blocking modal when authorization required

---

## 📁 File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `migrations/065_nhis_provisional_authorization.sql` | Schema updates |
| `src/renderer/lib/nhis/useNhisServiceGate.ts` | Enforcement hook |
| `src/renderer/modules/nhis/components/ProvisionalApprovalsCard.tsx` | Dashboard widget |
| `src/renderer/modules/nhis/components/ExpiringSoonCard.tsx` | Dashboard widget |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/modules/nhis/api/nhis.api.ts` | Add provisional approval functions |
| `src/renderer/modules/nhis/hooks/useNhis.ts` | Add provisional hooks |
| `src/renderer/modules/nhis/components/NhisApprovalQueue.tsx` | Add specialty referral handling |
| `src/renderer/modules/nhis/components/NhisDashboard.tsx` | Add new cards |
| `src/renderer/modules/nhis/components/NhisVerificationWidget.tsx` | Add provisional state |
| `src/renderer/modules/clinical-consultation/components/ConsultationWizard.tsx` | Integrate NHIS approval on referral |
| `src/renderer/modules/dental/pages/DentalPage.tsx` | Add NHIS gate |
| `src/renderer/modules/ophthalmology/pages/OphthalmologyPage.tsx` | Add NHIS gate |
| `src/renderer/modules/physiotherapy/pages/PhysiotherapyPage.tsx` | Add NHIS gate |

---

## ✅ Implementation Checklist

### Phase 1: Schema ✅ COMPLETED (Feb 1, 2026)
- [x] Create migration file for provisional fields (`086_nhis_provisional_authorization.sql`)
- [x] Add `authorization_source` field with constraint
- [x] Add indexes for performance
- [x] Add `specific_service_type` field with constraint
- [x] Add `nhis_authorization_services` mapping table
- [x] Add database functions (`nhis_provisional_approve`, `nhis_enter_official_code`, `nhis_check_service_authorization`)
- [x] Add dashboard views (`nhis_provisional_awaiting_code`, `nhis_authorizations_expiring_soon`, `nhis_authorization_service_summary`)
- [x] Update TypeScript types (`NhisAuthorization`, `NhisServiceType`, new DTOs)
- [x] Add API functions (`createProvisionalAuthorization`, `enterOfficialCode`, `checkServiceAuthorization`, etc.)
- [x] Add React hooks (`useProvisionalAuthorizationsAwaitingCode`, `useCreateProvisionalAuthorization`, etc.)
- [ ] Test migration on development

### Phase 2: Service-Specific Authorization
- [ ] Create authorization-service mapping
- [ ] Update authorization API
- [ ] Update authorization hooks
- [ ] Add validation function

### Phase 3: Specialty Clinic Integration
- [ ] Link internal referral to NHIS approval
- [ ] Add specialty referral to approval queue
- [ ] Add NHIS status to specialty pages
- [ ] Test end-to-end workflow

### Phase 4: Provisional Workflow
- [ ] Add provisional approve action
- [ ] Track provisional reason
- [ ] Add code entry action
- [ ] Add countdown timers

### Phase 5: Enforcement Gates
- [ ] Create `useNhisServiceGate` hook
- [ ] Integrate into lab ordering
- [ ] Integrate into radiology ordering
- [ ] Integrate into prescription
- [ ] Test enforcement

### Phase 6: Dashboard
- [ ] Add provisional approvals card
- [ ] Add expiring soon section
- [ ] Add missing codes section
- [ ] Test real-time updates

### Phase 7: Banners
- [ ] Update verification widget
- [ ] Embed in specialty modules
- [ ] Test visual states

---

## 📌 Priority Order

1. **Phase 1** - Schema Updates (Foundation)
2. **Phase 3** - Specialty Clinic Integration (Immediate user need)
3. **Phase 4** - Provisional Workflow (Operational flexibility)
4. **Phase 5** - Enforcement Gates (Compliance)
5. **Phase 2** - Service-Specific Authorization (Complete linkage)
6. **Phase 6** - Dashboard Enhancements (Visibility)
7. **Phase 7** - Clinic Banners (UX polish)

---

## 🎯 Quick Wins (Can Do Today)

1. Add NHIS verification widget to specialty clinic pages
2. Show authorization status in internal referral confirmation
3. Add "Pending NHIS Approval" filter to specialty queues

---

## 📞 Next Steps

1. Review this gap analysis with stakeholders
2. Confirm priority order
3. Begin Phase 1 migration file creation
4. Proceed with implementation in priority order

---

**Document Author**: GitHub Copilot  
**Review Status**: Pending stakeholder review
