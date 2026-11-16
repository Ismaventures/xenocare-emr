# NHIS Module API Documentation

## Overview

The NHIS (National Health Insurance Scheme) module provides APIs for managing patient NHIS enrollment, authorization verification, service approvals, and claims generation.

**Base Path:** All APIs interact with Supabase directly via the TypeScript client.

---

## Table of Contents

1. [Profile Management](#1-profile-management)
2. [Authorization Management](#2-authorization-management)
3. [Encounter Verification](#3-encounter-verification)
4. [Service Approvals](#4-service-approvals)
5. [Claims Management](#5-claims-management)
6. [Dashboard & Statistics](#6-dashboard--statistics)
7. [Policy Configuration](#7-policy-configuration)

---

## 1. Profile Management

### Get NHIS Profiles

Retrieves NHIS enrollment profiles with optional filters.

```typescript
import { nhisApi } from '@/modules/nhis/api';

const profiles = await nhisApi.getProfiles({
  patientId?: string,
  patientOrigin?: 'internal' | 'referred',
  schemeType?: 'armed_forces' | 'civil_service' | 'private_hmo' | 'special',
  isActive?: boolean,
  search?: string,  // Searches name, NHIS number, service number
});
```

**Response:**
```typescript
interface NhisProfile {
  id: string;
  patient_id: string;
  nhis_number: string;
  patient_origin: 'internal' | 'referred';
  scheme_type: 'armed_forces' | 'civil_service' | 'private_hmo' | 'special';
  hmo_id?: string;
  relationship: 'principal' | 'spouse' | 'child' | 'parent' | 'other';
  primary_enrollee_nhis_number?: string;
  enrollment_date: string;
  is_active: boolean;
  referral_code?: string;
  referring_facility_name?: string;
  referral_expiry_date?: string;
  // Joined data
  patient?: PatientDTO;
  hmo?: NhisHmo;
}
```

### Create NHIS Profile

Creates a new NHIS enrollment profile for a patient.

```typescript
const profile = await nhisApi.createProfile({
  patient_id: 'uuid',
  nhis_number: 'NHIS-12345',
  patient_origin: 'internal',
  scheme_type: 'armed_forces',
  relationship: 'principal',
  enrollment_date: '2024-01-15',
  // For referred patients:
  referral_code?: 'REF-2024-001',
  referring_facility_name?: 'General Hospital Lagos',
  referral_expiry_date?: '2024-02-15',
});
```

**Validation Rules:**
- `nhis_number`: Required, alphanumeric, minimum 10 characters
- `patient_origin = 'referred'` requires: `referral_code`, `referring_facility_name`, `referral_expiry_date`
- `referral_expiry_date` must be a future date

### Update NHIS Profile

```typescript
const updated = await nhisApi.updateProfile('profile-id', {
  is_active: false,
  // ... other updatable fields
});
```

---

## 2. Authorization Management

### Get Authorizations

```typescript
const auths = await nhisApi.getAuthorizations({
  patientId?: string,
  status?: 'pending' | 'active' | 'used' | 'expired' | 'rejected',
  providerId?: string,
});
```

**Response:**
```typescript
interface NhisAuthorization {
  id: string;
  profile_id: string;
  auth_code: string;
  provider_id?: string;
  issued_at: string;
  expires_at: string;
  status: 'pending' | 'active' | 'used' | 'expired' | 'rejected';
  diagnosis_codes: string[];
  authorized_services: string[];
  verified_by?: string;
  verified_at?: string;
  validity_days: number;
}
```

### Create Authorization

```typescript
const auth = await nhisApi.createAuthorization({
  profile_id: 'profile-uuid',
  auth_code: 'AUTH-2024-0001',
  provider_id: 'facility-uuid',
  diagnosis_codes: ['J06.9', 'R50.9'],
  authorized_services: ['consultation', 'lab_basic'],
  validity_days: 30,  // Overrides policy default if provided
});
```

### Verify Authorization

Activates a pending authorization.

```typescript
const result = await nhisApi.verifyAuthorization('auth-id', 'staff-uuid');
// Sets status = 'active', verified_by, verified_at
```

---

## 3. Encounter Verification

### Verify Encounter

Primary API for verifying an encounter for NHIS services.

```typescript
const result = await nhisApi.verifyNhisEncounter({
  encounterId: 'encounter-uuid',
  authCode: 'AUTH-2024-0001',
  tariffGroup: 'Personnel',
  verifiedBy: 'staff-uuid',
});
```

**Response:**
```typescript
interface VerificationResult {
  success: boolean;
  message: string;
  verification_status: 'verified' | 'failed' | 'expired';
  authorization?: NhisAuthorization;
  tariff_group?: string;
}
```

**Validations Performed:**
1. Patient has active NHIS profile
2. Authorization code is valid and active
3. Authorization has not expired
4. For referred patients: referral has not expired
5. Authorization is for this facility

### Emergency Override

Use when services must proceed without proper verification (emergencies only).

```typescript
const result = await nhisApi.emergencyOverride({
  encounterId: 'encounter-uuid',
  overrideReason: 'Patient arrived unconscious, immediate treatment required',
  staffId: 'staff-uuid',
});
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  requires_post_authorization: true;  // Always true for overrides
}
```

**Side Effects:**
- Sets `nhis_verification_status = 'emergency_override'`
- Sets `requires_post_authorization = TRUE`
- Creates immutable audit log entry

**Restrictions:**
- Not available for referred patients (they must always have valid referral)

### Get Encounter NHIS State

Retrieves the current NHIS state of an encounter.

```typescript
const state = await nhisApi.getEncounterNhisState('encounter-uuid');
```

**Response:**
```typescript
interface EncounterNhisState {
  encounter_id: string;
  requires_nhis_verification: boolean;
  verification_status: 'not_verified' | 'verified' | 'failed' | 'expired' | 'emergency_override';
  tariff_group?: 'Personnel' | 'Civilian_HMO' | 'Special' | 'Private';
  authorization?: NhisAuthorization;
  can_proceed: boolean;  // Whether services can be ordered
  requires_post_authorization: boolean;
  override_reason?: string;
  policy_snapshot?: object;
}
```

---

## 4. Service Approvals

### Get Pending Approvals

```typescript
const approvals = await nhisApi.getPendingApprovals({
  encounterId?: string,
  serviceType?: 'lab_request' | 'radiology_request' | 'prescription' | 'procedure',
  status?: 'pending' | 'approved' | 'rejected' | 'waiver';
});
```

**Response:**
```typescript
interface NhisApproval {
  id: string;
  encounter_id: string;
  service_type: 'lab_request' | 'radiology_request' | 'prescription' | 'procedure';
  service_id: string;
  service_code: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiver';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  // Joined
  encounter?: EncounterDTO;
  patient?: PatientDTO;
}
```

### Approve Service

```typescript
const result = await nhisApi.approveService({
  approvalId: 'approval-uuid',
  approvedBy: 'staff-uuid',
  notes?: 'Approved per NHIS guidelines',
});
```

### Reject Service

```typescript
const result = await nhisApi.rejectService({
  approvalId: 'approval-uuid',
  rejectedBy: 'staff-uuid',
  reason: 'Service not covered under patient scheme',
});
```

### Release Service to Billing

After approval, releases the service to the billing workflow.

```typescript
const result = await nhisApi.releaseServiceToBilling(
  'lab_request',  // service type
  'service-uuid',
  'staff-uuid'
);
```

**Effect:** Sets `billing_release_status = 'released'` on the service record.

### Check Service Execution

Call before executing any service (sample collection, dispensing, etc.).

```typescript
const { canExecute, reason } = await nhisApi.canExecuteService(
  'encounter-uuid',
  'lab_request',
  'service-uuid'
);

if (!canExecute) {
  throw new Error(reason);
}
```

**Checks Performed:**
1. Encounter is verified (or has emergency override)
2. Service is approved (status = 'approved')
3. Service is released to billing
4. Service is not already executed

---

## 5. Claims Management

### Get Claims

```typescript
const claims = await nhisApi.getClaims({
  encounterId?: string,
  status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'queried' | 'exported' | 'settled',
  dateFrom?: string,
  dateTo?: string,
  exportBatchId?: string,
});
```

**Response:**
```typescript
interface NhisClaim {
  id: string;
  claim_number: string;
  encounter_id: string;
  patient_id: string;
  authorization_id?: string;
  service_lines: ClaimServiceLine[];
  total_amount: number;
  nhis_amount: number;      // Amount claimable from NHIS
  patient_amount: number;   // Patient co-pay amount
  status: ClaimStatus;
  submitted_at?: string;
  approved_at?: string;
  rejection_reason?: string;
  export_batch_id?: string;
  // Joined
  encounter?: EncounterDTO;
  patient?: PatientDTO;
  authorization?: NhisAuthorization;
}

interface ClaimServiceLine {
  service_type: string;
  service_id: string;
  service_code: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  nhis_covered: boolean;
  nhis_percentage: number;
  nhis_amount: number;
  patient_amount: number;
}
```

### Generate Claim

Creates a claim from completed encounter services.

```typescript
const claim = await nhisApi.generateClaim({
  encounterId: 'encounter-uuid',
  createdBy: 'staff-uuid',
});
```

**Prerequisites:**
- Encounter verification_status IN ('verified', 'emergency_override')
- All services have `execution_status = 'completed'`
- If emergency override: post-authorization obtained

### Update Claim Status

```typescript
// Submit for review
await nhisApi.updateClaimStatus('claim-uuid', 'pending', 'staff-uuid');

// Approve claim
await nhisApi.updateClaimStatus('claim-uuid', 'approved', 'staff-uuid');

// Reject claim
await nhisApi.updateClaimStatus('claim-uuid', 'rejected', 'staff-uuid', 'Reason for rejection');
```

### Create Export Batch

Creates a batch of claims for DHQ export.

```typescript
const batch = await nhisApi.createExportBatch({
  claimIds: ['claim-1', 'claim-2', 'claim-3'],
  exportFormat: 'nhis_standard',
  createdBy: 'staff-uuid',
});
```

**Response:**
```typescript
interface NhisExportBatch {
  id: string;
  batch_number: string;
  claim_count: number;
  total_amount: number;
  export_format: string;
  status: 'pending' | 'exported' | 'acknowledged' | 'failed';
  exported_at?: string;
  file_path?: string;
  created_by: string;
  created_at: string;
}
```

---

## 6. Dashboard & Statistics

### Get Dashboard Statistics

```typescript
const stats = await nhisApi.getDashboardStats({
  dateFrom?: string,
  dateTo?: string,
  facilityId?: string,
});
```

**Response:**
```typescript
interface NhisDashboardStats {
  // Verification stats
  encounters_pending_verification: number;
  encounters_verified_today: number;
  encounters_with_override: number;
  
  // Approval stats
  services_pending_approval: number;
  services_approved_today: number;
  services_rejected_today: number;
  
  // Claims stats
  claims_draft: number;
  claims_pending: number;
  claims_approved: number;
  claims_rejected: number;
  claims_total_amount: number;
  claims_settled_amount: number;
  
  // Profile stats
  total_active_profiles: number;
  internal_profiles: number;
  referred_profiles: number;
}
```

---

## 7. Policy Configuration

### Get Policy Configuration

```typescript
const config = await nhisApi.getPolicyConfig(providerCode?: string);
```

**Response:**
```typescript
interface NhisPolicyConfig {
  id: string;
  provider_code: string;  // 'default' or specific provider
  validity_days: number;  // Authorization validity (default: 30)
  requires_pre_auth: boolean;
  emergency_override_allowed: boolean;
  military_drug_coverage_percent: number;  // 100 for military
  civilian_drug_coverage_percent: number;  // 70 per NHIS
  consultation_fee_nhis_percent: number;
  max_services_per_auth: number;
  post_auth_deadline_days: number;  // Days to obtain post-auth after override
}
```

### Update Policy Configuration

```typescript
const updated = await nhisApi.updatePolicyConfig('config-id', {
  validity_days: 45,  // Increase validity period
  // ... other fields
});
```

**Note:** Policy changes are audited and require appropriate permissions.

---

## React Query Hooks

The module provides React Query hooks for easy integration:

```typescript
import {
  useNhisProfiles,
  useNhisAuthorizations,
  useEncounterNhisState,
  useVerifyEncounter,
  useEmergencyOverride,
  usePendingApprovals,
  useApproveService,
  useRejectService,
  useNhisClaims,
  useGenerateClaim,
  useNhisDashboardStats,
} from '@/modules/nhis/hooks';

// Example usage
function MyComponent({ encounterId }) {
  const { data: nhisState, isLoading } = useEncounterNhisState(encounterId);
  const verifyMutation = useVerifyEncounter();
  
  const handleVerify = async () => {
    await verifyMutation.mutateAsync({
      encounterId,
      authCode: 'AUTH-123',
      tariffGroup: 'Personnel',
      verifiedBy: currentUser.id,
    });
  };
}
```

---

## Error Handling

All API functions throw typed errors:

```typescript
try {
  await nhisApi.verifyNhisEncounter({ ... });
} catch (error) {
  if (error.code === 'NHIS_NO_PROFILE') {
    // Patient has no NHIS enrollment
  } else if (error.code === 'NHIS_AUTH_EXPIRED') {
    // Authorization has expired
  } else if (error.code === 'NHIS_REFERRAL_EXPIRED') {
    // Referral has expired (for referred patients)
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `NHIS_NO_PROFILE` | Patient has no active NHIS enrollment |
| `NHIS_AUTH_INVALID` | Authorization code is invalid |
| `NHIS_AUTH_EXPIRED` | Authorization has expired |
| `NHIS_AUTH_WRONG_FACILITY` | Authorization not valid for this facility |
| `NHIS_REFERRAL_EXPIRED` | Referral has expired |
| `NHIS_REFERRAL_REQUIRED` | Referral details required for referred patient |
| `NHIS_VERIFICATION_REQUIRED` | Encounter must be verified first |
| `NHIS_APPROVAL_REQUIRED` | Service must be approved first |
| `NHIS_BILLING_RELEASE_REQUIRED` | Service must be released to billing |
| `NHIS_SERVICE_NOT_COVERED` | Service not covered under NHIS tariff |
| `NHIS_OVERRIDE_NOT_ALLOWED` | Emergency override not permitted |
