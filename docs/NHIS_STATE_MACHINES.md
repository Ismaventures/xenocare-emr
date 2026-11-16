# NHIS Module State Machines and Workflow Documentation

## Overview

The NHIS module enforces a **strict workflow gate** that controls patient eligibility verification, service authorization, and claims generation. This document describes the state machines governing the module's core workflows.

---

## 1. Authorization State Machine

Controls the lifecycle of NHIS authorization codes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AUTHORIZATION STATES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    ┌──────────┐                                                              │
│    │ PENDING  │ ←── Initial state when authorization requested               │
│    └────┬─────┘                                                              │
│         │                                                                     │
│         │ verify_authorization()                                              │
│         ▼                                                                     │
│    ┌──────────┐        ┌──────────┐                                         │
│    │ ACTIVE   │───────▶│ EXPIRED  │  ←── Automatic on expiry_date            │
│    └────┬─────┘        └──────────┘                                         │
│         │                                                                     │
│         │ use_all_services() OR manual_revoke()                              │
│         ▼                                                                     │
│    ┌──────────┐                                                              │
│    │  USED    │                                                              │
│    └──────────┘                                                              │
│                                                                               │
│    ┌──────────┐                                                              │
│    │ REJECTED │ ←── When authorization request is denied                     │
│    └──────────┘                                                              │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Definitions

| State | Description | Can Order Services | Transitions To |
|-------|-------------|-------------------|----------------|
| `pending` | Authorization requested, awaiting verification | ❌ | `active`, `rejected` |
| `active` | Authorization verified and valid | ✅ | `used`, `expired` |
| `used` | All authorized services completed | ❌ | (terminal) |
| `expired` | Authorization validity period ended | ❌ | (terminal) |
| `rejected` | Authorization request denied | ❌ | (terminal) |

### Validity Period

Authorization validity is **configurable per provider**, NOT hardcoded:

```sql
-- Policy configuration table
nhis_policy_config (
  provider_code,
  validity_days,        -- Default: 30, configurable
  requires_pre_auth,
  ...
)
```

---

## 2. Encounter Verification State Machine

Controls NHIS verification status at the encounter level.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENCOUNTER VERIFICATION STATES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    ┌───────────────┐                                                         │
│    │ NOT_VERIFIED  │ ←── Default state for NHIS encounters                   │
│    └───────┬───────┘                                                         │
│            │                                                                  │
│     ┌──────┴──────┐                                                          │
│     │             │                                                          │
│     ▼             ▼                                                          │
│ ┌──────────┐  ┌────────────────────┐                                        │
│ │ VERIFIED │  │ EMERGENCY_OVERRIDE │                                        │
│ └──────────┘  └─────────┬──────────┘                                        │
│       │                 │                                                    │
│       │                 │ Sets: requires_post_authorization = TRUE           │
│       │                 │                                                    │
│       ▼                 ▼                                                    │
│   Services can proceed with normal workflow                                  │
│                                                                               │
│    ┌──────────┐                                                              │
│    │  FAILED  │ ←── When verification check fails                           │
│    └──────────┘                                                              │
│                                                                               │
│    ┌──────────┐                                                              │
│    │ EXPIRED  │ ←── When authorization expires mid-encounter                 │
│    └──────────┘                                                              │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Emergency Override Rules

1. **Only available for valid NHIS patients** (existing enrollment required)
2. **Creates immutable audit record** with:
   - Override reason (required)
   - Staff ID who initiated
   - Timestamp
3. **Sets `requires_post_authorization = TRUE`** on the encounter
4. **Post-authorization must be obtained** before claims generation

---

## 3. Service Request Lifecycle

State machine for lab tests, radiology, prescriptions, and procedures.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVICE REQUEST LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    ┌─────────────────────────────────────────────────────────────┐           │
│    │                    ORDER CREATION                            │           │
│    │                                                              │           │
│    │  Doctor orders service                                       │           │
│    │        │                                                     │           │
│    │        ▼                                                     │           │
│    │  ┌──────────────┐     requires_nhis_verification = TRUE      │           │
│    │  │ NHIS Patient │─────────────────────────────────┐          │           │
│    │  └──────────────┘                                 │          │           │
│    │        │                                          │          │           │
│    │        │ Non-NHIS                                 │          │           │
│    │        ▼                                          ▼          │           │
│    │  ┌─────────────┐                          ┌──────────────┐   │           │
│    │  │ Direct to   │                          │ PENDING      │   │           │
│    │  │ Billing     │                          │ APPROVAL     │   │           │
│    │  └─────────────┘                          └──────┬───────┘   │           │
│    └─────────────────────────────────────────────────────────────┘           │
│                                                        │                      │
│                                    ┌───────────────────┼───────────────────┐  │
│                                    │                   │                   │  │
│                                    ▼                   ▼                   ▼  │
│                              ┌──────────┐        ┌──────────┐        ┌──────┐│
│                              │ APPROVED │        │ REJECTED │        │WAIVER││
│                              └────┬─────┘        └──────────┘        └──────┘│
│                                   │                                          │
│                                   ▼                                          │
│                        ┌───────────────────┐                                 │
│                        │ RELEASED_TO_BILLING│                                │
│                        └─────────┬─────────┘                                 │
│                                  │                                           │
│                                  ▼                                           │
│                        ┌───────────────────┐                                 │
│                        │ billing_release_  │                                 │
│                        │ status = 'released'│                                │
│                        └─────────┬─────────┘                                 │
│                                  │                                           │
│                                  ▼                                           │
│                        ┌───────────────────┐                                 │
│                        │ EXECUTION READY   │                                 │
│                        │ (can_execute=true)│                                 │
│                        └─────────┬─────────┘                                 │
│                                  │                                           │
│                                  │ Staff performs service                    │
│                                  ▼                                           │
│                        ┌───────────────────┐                                 │
│                        │ execution_status  │                                 │
│                        │ = 'completed'     │                                 │
│                        └───────────────────┘                                 │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Execution Gate Check

Before any service can be executed, call:

```typescript
const { canExecute, reason } = await nhisApi.canExecuteService(
  encounterId,
  serviceType,
  serviceId
);

if (!canExecute) {
  showError(reason);
  return;
}
```

---

## 4. Claims Generation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAIMS WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    ┌───────────────────────────────────────────────────────────────┐         │
│    │                  PRE-REQUISITES CHECK                          │         │
│    │                                                                │         │
│    │  ✓ Encounter verification_status IN ('verified', 'emergency') │         │
│    │  ✓ All services have billing_release_status = 'released'      │         │
│    │  ✓ All services have execution_status = 'completed'           │         │
│    │  ✓ If emergency_override: post_authorization obtained         │         │
│    └───────────────────────────────────────────────────────────────┘         │
│                                    │                                          │
│                                    ▼                                          │
│                           ┌─────────────────┐                                │
│                           │ generate_claim()│                                │
│                           └────────┬────────┘                                │
│                                    │                                          │
│                                    ▼                                          │
│                           ┌─────────────────┐                                │
│                           │ CLAIM: DRAFT    │                                │
│                           └────────┬────────┘                                │
│                                    │ submit_for_review()                     │
│                                    ▼                                          │
│                           ┌─────────────────┐                                │
│                           │ CLAIM: PENDING  │                                │
│                           └────────┬────────┘                                │
│                                    │                                          │
│                    ┌───────────────┼───────────────┐                         │
│                    │               │               │                         │
│                    ▼               ▼               ▼                         │
│              ┌──────────┐   ┌──────────┐   ┌──────────┐                      │
│              │ APPROVED │   │ REJECTED │   │ QUERIED  │                      │
│              └────┬─────┘   └──────────┘   └────┬─────┘                      │
│                   │                             │                             │
│                   │                             │ respond_to_query()         │
│                   │                             ▼                             │
│                   │                        Back to PENDING                    │
│                   ▼                                                           │
│              ┌──────────┐                                                    │
│              │ EXPORTED │ ←── Added to DHQ export batch                      │
│              └────┬─────┘                                                    │
│                   │                                                           │
│                   ▼                                                           │
│              ┌──────────┐                                                    │
│              │ SETTLED  │ ←── Payment received from NHIS/HMO                 │
│              └──────────┘                                                    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tariff Group Rules

The system applies different tariff rules based on patient category:

| Tariff Group | Description | Drug Coverage | Consultation Fee |
|--------------|-------------|---------------|------------------|
| `Personnel` | Military personnel & dependents | 100% free | NHIS rate |
| `Civilian_HMO` | Civilian staff with HMO | Per HMO policy | NHIS rate |
| `Special` | Special cases (VIPs, etc.) | Per agreement | Special rate |
| `Private` | Non-NHIS patients | Patient pays | Standard rate |

### Military Personnel Drug Coverage

```sql
-- In nhis_policy_config
military_drug_coverage_percent = 100  -- Drugs free for military
civilian_drug_coverage_percent = 70   -- Per NHIS guidelines
```

---

## 6. Referred Patient Enforcement (STRICTEST RULES)

For patients referred from another hospital:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REFERRED PATIENT WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│    Patient Registration                                                       │
│    ├── nhis_patient_source = 'referred'                                      │
│    ├── referral_code (REQUIRED - cannot be empty)                            │
│    ├── referring_facility_name (REQUIRED)                                    │
│    └── referral_expiry_date (REQUIRED)                                       │
│                                                                               │
│    Encounter Creation                                                         │
│    ├── MANDATORY verification before ANY service                             │
│    ├── referral_code must match patient record                               │
│    ├── referral must NOT be expired                                          │
│    └── Services limited to referral reason                                   │
│                                                                               │
│    Service Ordering                                                           │
│    ├── ALL services require pre-authorization                                │
│    ├── No emergency override available for referred patients                 │
│    └── Services must align with referral diagnosis                           │
│                                                                               │
│    Claims Generation                                                          │
│    ├── Referral code included in claim                                       │
│    ├── referring_facility_code included                                      │
│    └── Special validation for referred claims                                │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Validation Rules and Error Messages

### Registration Validation

| Field | Rule | Error Message |
|-------|------|---------------|
| `nhis_number` | Required for NHIS patients | "NHIS number is required for insurance patients" |
| `nhis_number` | Format: alphanumeric, 10+ chars | "Invalid NHIS number format" |
| `referral_code` | Required if `nhis_patient_source = 'referred'` | "Referral code is required for referred patients" |
| `referral_expiry_date` | Must be future date | "Referral has expired" |

### Encounter Verification Validation

| Check | Rule | Error Message |
|-------|------|---------------|
| NHIS Profile | Must exist and be active | "Patient has no active NHIS enrollment" |
| Authorization | Must have active authorization | "No valid authorization found" |
| Referral Expiry | For referred: not expired | "Referral has expired on {date}" |
| Provider Match | Auth must be for this facility | "Authorization not valid for this facility" |

### Service Approval Validation

| Check | Rule | Error Message |
|-------|------|---------------|
| Encounter Verified | Encounter must be verified | "Cannot order services: NHIS not verified" |
| Service in Tariff | Service must exist in NHIS tariff | "Service not covered under NHIS" |
| Quantity Limit | Within NHIS quantity limits | "Exceeds NHIS quantity limit for this service" |

---

## 8. Integration Points

### Module Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODULE INTEGRATIONS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   PATIENT REGISTRATION                                                        │
│   └── Capture NHIS profile on registration                                   │
│   └── Validate referral info for referred patients                           │
│   └── Link to nhis_profiles table                                            │
│                                                                               │
│   ENCOUNTER MODULE                                                            │
│   └── Check NHIS verification before status transitions                      │
│   └── Block 'consultation' stage if not verified (NHIS patients)             │
│   └── Store nhis_verification_status, nhis_tariff_group                      │
│                                                                               │
│   CLINICAL CONSULTATION (GOPD)                                               │
│   └── Display NhisVerificationWidget in patient header                       │
│   └── Block order creation if encounter not verified                         │
│   └── Show tariff prices when ordering                                       │
│                                                                               │
│   LAB / RADIOLOGY / PHARMACY                                                 │
│   └── Check can_execute_nhis_service() before execution                      │
│   └── Show NHIS approval status in work lists                                │
│   └── Block sample collection / dispensing if not approved                   │
│                                                                               │
│   BILLING                                                                     │
│   └── Only show released services (billing_release_status = 'released')      │
│   └── Apply tariff rates based on nhis_tariff_group                          │
│   └── Split: NHIS claimable vs patient co-pay                                │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Database Functions

### verify_nhis_encounter(p_encounter_id, p_auth_code, p_tariff_group, p_verified_by)

Verifies an encounter for NHIS services.

**Returns:** `{ success: boolean, message: string, verification_status: string }`

### nhis_emergency_override(p_encounter_id, p_override_reason, p_staff_id)

Applies emergency override to an encounter.

**Returns:** `{ success: boolean, message: string }`

**Side Effects:**
- Sets `nhis_verification_status = 'emergency_override'`
- Sets `requires_post_authorization = TRUE`
- Creates audit log entry

### release_service_to_billing(p_service_type, p_service_id, p_approved_by)

Releases an approved service to the billing workflow.

**Returns:** `{ success: boolean, message: string }`

### can_execute_nhis_service(p_encounter_id, p_service_type, p_service_id)

Checks if a service can be executed.

**Returns:** `{ can_execute: boolean, reason: string }`

### generate_nhis_claim(p_encounter_id, p_created_by)

Generates a claim for a completed encounter.

**Returns:** `{ claim_id: uuid, claim_number: string }`

---

## 10. Audit Trail

All NHIS operations are logged to `nhis_audit_log`:

```sql
nhis_audit_log (
  id UUID PRIMARY KEY,
  action TEXT NOT NULL,         -- 'verification', 'emergency_override', 'approval', etc.
  entity_type TEXT NOT NULL,    -- 'encounter', 'authorization', 'claim', etc.
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
)
```

**Retention:** Audit logs are IMMUTABLE and retained for minimum 7 years per NHIS compliance requirements.
