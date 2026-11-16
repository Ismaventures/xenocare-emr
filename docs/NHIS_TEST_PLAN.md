# NHIS Module Test Plan

## Overview

This document outlines the comprehensive test plan for the NHIS (National Health Insurance Scheme) module, covering hospital workflow scenarios, edge cases, and compliance requirements.

---

## Test Categories

1. [Unit Tests](#1-unit-tests)
2. [Integration Tests](#2-integration-tests)
3. [End-to-End Workflow Tests](#3-end-to-end-workflow-tests)
4. [Edge Cases & Error Handling](#4-edge-cases--error-handling)
5. [Security & Compliance Tests](#5-security--compliance-tests)
6. [Performance Tests](#6-performance-tests)

---

## 1. Unit Tests

### 1.1 NHIS Profile Management

```typescript
describe('NhisProfile', () => {
  describe('createProfile', () => {
    it('should create profile for internal patient', async () => {
      const profile = await nhisApi.createProfile({
        patient_id: testPatient.id,
        nhis_number: 'NHIS-2024-001',
        patient_origin: 'internal',
        scheme_type: 'armed_forces',
        relationship: 'principal',
        enrollment_date: '2024-01-15',
      });
      
      expect(profile.id).toBeDefined();
      expect(profile.is_active).toBe(true);
    });

    it('should require referral fields for referred patients', async () => {
      await expect(nhisApi.createProfile({
        patient_id: testPatient.id,
        nhis_number: 'NHIS-2024-002',
        patient_origin: 'referred',  // Missing referral fields
        scheme_type: 'civil_service',
        relationship: 'principal',
        enrollment_date: '2024-01-15',
      })).rejects.toThrow('Referral code is required for referred patients');
    });

    it('should create profile for referred patient with all fields', async () => {
      const profile = await nhisApi.createProfile({
        patient_id: testPatient.id,
        nhis_number: 'NHIS-2024-003',
        patient_origin: 'referred',
        scheme_type: 'civil_service',
        relationship: 'principal',
        enrollment_date: '2024-01-15',
        referral_code: 'REF-2024-001',
        referring_facility_name: 'General Hospital Lagos',
        referral_expiry_date: futureDate(30),
      });
      
      expect(profile.referral_code).toBe('REF-2024-001');
    });

    it('should reject expired referral date', async () => {
      await expect(nhisApi.createProfile({
        // ... with past referral_expiry_date
        referral_expiry_date: '2023-01-01',
      })).rejects.toThrow('Referral has expired');
    });
  });
});
```

### 1.2 Authorization Validation

```typescript
describe('NhisAuthorization', () => {
  describe('createAuthorization', () => {
    it('should compute expiry based on policy config', async () => {
      // Policy has validity_days = 30
      const auth = await nhisApi.createAuthorization({
        profile_id: testProfile.id,
        auth_code: 'AUTH-2024-001',
        diagnosis_codes: ['J06.9'],
      });
      
      const expectedExpiry = addDays(new Date(), 30);
      expect(new Date(auth.expires_at).toDateString())
        .toBe(expectedExpiry.toDateString());
    });

    it('should allow custom validity_days override', async () => {
      const auth = await nhisApi.createAuthorization({
        profile_id: testProfile.id,
        auth_code: 'AUTH-2024-002',
        validity_days: 45,  // Override default
      });
      
      const expectedExpiry = addDays(new Date(), 45);
      expect(new Date(auth.expires_at).toDateString())
        .toBe(expectedExpiry.toDateString());
    });
  });

  describe('verifyAuthorization', () => {
    it('should transition pending to active', async () => {
      const result = await nhisApi.verifyAuthorization(
        pendingAuth.id,
        testStaff.id
      );
      
      expect(result.status).toBe('active');
      expect(result.verified_by).toBe(testStaff.id);
      expect(result.verified_at).toBeDefined();
    });

    it('should not verify expired authorization', async () => {
      await expect(nhisApi.verifyAuthorization(expiredAuth.id, testStaff.id))
        .rejects.toThrow('Authorization has expired');
    });
  });
});
```

### 1.3 Tariff Calculations

```typescript
describe('TariffCalculations', () => {
  describe('Personnel tariff group', () => {
    it('should apply 100% drug coverage for military personnel', () => {
      const result = calculateServiceCost({
        serviceType: 'prescription',
        tariffGroup: 'Personnel',
        baseCost: 5000,
        isMilitaryPersonnel: true,
      });
      
      expect(result.nhis_amount).toBe(5000);
      expect(result.patient_amount).toBe(0);
    });
  });

  describe('Civilian_HMO tariff group', () => {
    it('should apply standard NHIS coverage (70%)', () => {
      const result = calculateServiceCost({
        serviceType: 'prescription',
        tariffGroup: 'Civilian_HMO',
        baseCost: 5000,
      });
      
      expect(result.nhis_amount).toBe(3500);  // 70%
      expect(result.patient_amount).toBe(1500);  // 30% co-pay
    });
  });
});
```

---

## 2. Integration Tests

### 2.1 Encounter Verification Flow

```typescript
describe('EncounterVerification Integration', () => {
  let encounter: EncounterDTO;
  let nhisProfile: NhisProfile;
  let authorization: NhisAuthorization;

  beforeEach(async () => {
    nhisProfile = await createTestNhisProfile();
    authorization = await createTestAuthorization(nhisProfile.id);
    encounter = await createTestEncounter({
      patient_id: nhisProfile.patient_id,
      payment_category: 'NHIS',
    });
  });

  it('should verify encounter with valid authorization', async () => {
    const result = await nhisApi.verifyNhisEncounter({
      encounterId: encounter.id,
      authCode: authorization.auth_code,
      tariffGroup: 'Personnel',
      verifiedBy: testStaff.id,
    });
    
    expect(result.success).toBe(true);
    expect(result.verification_status).toBe('verified');
    
    // Check encounter was updated
    const updatedEncounter = await getEncounter(encounter.id);
    expect(updatedEncounter.nhis_verification_status).toBe('verified');
    expect(updatedEncounter.nhis_tariff_group).toBe('Personnel');
  });

  it('should block verification with wrong auth code', async () => {
    await expect(nhisApi.verifyNhisEncounter({
      encounterId: encounter.id,
      authCode: 'WRONG-CODE',
      tariffGroup: 'Personnel',
      verifiedBy: testStaff.id,
    })).rejects.toThrow('Authorization code is invalid');
  });
});
```

### 2.2 Service Approval Integration

```typescript
describe('ServiceApproval Integration', () => {
  let verifiedEncounter: EncounterDTO;
  let labRequest: LabRequestDTO;

  beforeEach(async () => {
    verifiedEncounter = await createVerifiedEncounter();
    labRequest = await createLabRequest({
      encounter_id: verifiedEncounter.id,
      requires_nhis_verification: true,
      nhis_approval_status: 'pending',
    });
  });

  it('should create pending approval for NHIS service', async () => {
    const approvals = await nhisApi.getPendingApprovals({
      encounterId: verifiedEncounter.id,
    });
    
    expect(approvals).toHaveLength(1);
    expect(approvals[0].service_id).toBe(labRequest.id);
    expect(approvals[0].status).toBe('pending');
  });

  it('should update service status on approval', async () => {
    const approval = await nhisApi.approveService({
      approvalId: pendingApproval.id,
      approvedBy: testStaff.id,
    });
    
    const updatedRequest = await getLabRequest(labRequest.id);
    expect(updatedRequest.nhis_approval_status).toBe('approved');
  });

  it('should release approved service to billing', async () => {
    await nhisApi.approveService({ approvalId: pendingApproval.id, approvedBy: testStaff.id });
    
    await nhisApi.releaseServiceToBilling('lab_request', labRequest.id, testStaff.id);
    
    const updatedRequest = await getLabRequest(labRequest.id);
    expect(updatedRequest.billing_release_status).toBe('released');
  });
});
```

---

## 3. End-to-End Workflow Tests

### 3.1 Scenario: Military Personnel Complete Workflow

```typescript
describe('E2E: Military Personnel NHIS Workflow', () => {
  it('should complete full workflow from registration to claims', async () => {
    // 1. Register military personnel with NHIS
    const patient = await registerPatient({
      patient_category: 'Military',
      patient_type: 'Armed Forces',
      insurance_type: 'NHIS-Armed Forces',
      nhis_number: 'NHIS-MIL-001',
    });

    // 2. Create NHIS profile
    const profile = await nhisApi.createProfile({
      patient_id: patient.id,
      nhis_number: patient.nhis_number,
      patient_origin: 'internal',
      scheme_type: 'armed_forces',
      relationship: 'principal',
      enrollment_date: new Date().toISOString(),
    });

    // 3. Create and verify authorization
    const auth = await nhisApi.createAuthorization({
      profile_id: profile.id,
      auth_code: generateAuthCode(),
      diagnosis_codes: ['J06.9'],
    });
    await nhisApi.verifyAuthorization(auth.id, testStaff.id);

    // 4. Create encounter
    const encounter = await createEncounter({
      patient_id: patient.id,
      payment_category: 'NHIS',
    });

    // 5. Verify encounter
    const verifyResult = await nhisApi.verifyNhisEncounter({
      encounterId: encounter.id,
      authCode: auth.auth_code,
      tariffGroup: 'Personnel',
      verifiedBy: testStaff.id,
    });
    expect(verifyResult.success).toBe(true);

    // 6. Order services (consultation, lab, prescription)
    const prescription = await createPrescription({
      encounter_id: encounter.id,
      drug_name: 'Amoxicillin 500mg',
      quantity: 21,
      is_military_personnel_free: true,  // Drugs are free
    });

    // 7. Approve service
    const approvals = await nhisApi.getPendingApprovals({ encounterId: encounter.id });
    for (const approval of approvals) {
      await nhisApi.approveService({ approvalId: approval.id, approvedBy: testStaff.id });
      await nhisApi.releaseServiceToBilling(approval.service_type, approval.service_id, testStaff.id);
    }

    // 8. Execute services
    await executePrescription(prescription.id);

    // 9. Generate claim
    const claim = await nhisApi.generateClaim({
      encounterId: encounter.id,
      createdBy: testStaff.id,
    });

    expect(claim).toBeDefined();
    expect(claim.nhis_amount).toBeGreaterThan(0);
    expect(claim.patient_amount).toBe(0);  // Military personnel pays nothing
  });
});
```

### 3.2 Scenario: Referred Patient Strict Workflow

```typescript
describe('E2E: Referred Patient NHIS Workflow', () => {
  it('should enforce strict rules for referred patients', async () => {
    // 1. Register referred patient
    const patient = await registerPatient({
      patient_category: 'Civilian',
      insurance_type: 'NHIS-Civil Service',
      nhis_number: 'NHIS-CIV-001',
      nhis_patient_source: 'referred',
      referral_code: 'REF-2024-001',
      referring_facility_name: 'General Hospital Lagos',
      referral_expiry_date: futureDate(30),
    });

    // 2. Create NHIS profile with referral details
    const profile = await nhisApi.createProfile({
      patient_id: patient.id,
      nhis_number: patient.nhis_number,
      patient_origin: 'referred',
      scheme_type: 'civil_service',
      referral_code: patient.referral_code,
      referring_facility_name: patient.referring_facility_name,
      referral_expiry_date: patient.referral_expiry_date,
      relationship: 'principal',
      enrollment_date: new Date().toISOString(),
    });

    // 3. Create encounter
    const encounter = await createEncounter({
      patient_id: patient.id,
      payment_category: 'NHIS',
    });

    // 4. Verify encounter - should validate referral
    const auth = await createAndVerifyAuthorization(profile.id);
    const verifyResult = await nhisApi.verifyNhisEncounter({
      encounterId: encounter.id,
      authCode: auth.auth_code,
      tariffGroup: 'Civilian_HMO',
      verifiedBy: testStaff.id,
    });
    expect(verifyResult.success).toBe(true);

    // 5. Emergency override should NOT be allowed for referred patients
    const encounter2 = await createEncounter({ patient_id: patient.id, payment_category: 'NHIS' });
    await expect(nhisApi.emergencyOverride({
      encounterId: encounter2.id,
      overrideReason: 'Emergency situation',
      staffId: testStaff.id,
    })).rejects.toThrow('Emergency override not permitted for referred patients');
  });

  it('should reject encounter if referral is expired', async () => {
    const expiredPatient = await registerPatient({
      nhis_patient_source: 'referred',
      referral_expiry_date: pastDate(1),  // Expired yesterday
    });

    const encounter = await createEncounter({
      patient_id: expiredPatient.id,
      payment_category: 'NHIS',
    });

    const auth = await createAndVerifyAuthorization(expiredPatient.nhis_profile_id);
    
    await expect(nhisApi.verifyNhisEncounter({
      encounterId: encounter.id,
      authCode: auth.auth_code,
      tariffGroup: 'Civilian_HMO',
      verifiedBy: testStaff.id,
    })).rejects.toThrow(/Referral has expired/);
  });
});
```

### 3.3 Scenario: Emergency Override Workflow

```typescript
describe('E2E: Emergency Override Workflow', () => {
  it('should allow emergency override and require post-authorization', async () => {
    // 1. Patient arrives in emergency
    const patient = await getExistingNhisPatient();
    const encounter = await createEncounter({
      patient_id: patient.id,
      payment_category: 'NHIS',
      priority: 'Emergency',
    });

    // 2. No time to verify - use emergency override
    const overrideResult = await nhisApi.emergencyOverride({
      encounterId: encounter.id,
      overrideReason: 'Patient arrived unconscious, immediate treatment required',
      staffId: testStaff.id,
    });
    expect(overrideResult.success).toBe(true);

    // 3. Check encounter state
    const state = await nhisApi.getEncounterNhisState(encounter.id);
    expect(state.verification_status).toBe('emergency_override');
    expect(state.requires_post_authorization).toBe(true);
    expect(state.can_proceed).toBe(true);

    // 4. Audit log should be created
    const auditLogs = await getAuditLogs({ entity_id: encounter.id, action: 'emergency_override' });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].new_values.override_reason).toBe('Patient arrived unconscious, immediate treatment required');

    // 5. Services can proceed
    const labRequest = await createLabRequest({ encounter_id: encounter.id });
    const canExecute = await nhisApi.canExecuteService(encounter.id, 'lab_request', labRequest.id);
    expect(canExecute.canExecute).toBe(true);

    // 6. Claim generation requires post-authorization
    await executeAllServices(encounter.id);
    
    // Without post-auth:
    await expect(nhisApi.generateClaim({
      encounterId: encounter.id,
      createdBy: testStaff.id,
    })).rejects.toThrow('Post-authorization required for emergency override encounters');

    // After obtaining post-auth:
    await obtainPostAuthorization(encounter.id);
    const claim = await nhisApi.generateClaim({
      encounterId: encounter.id,
      createdBy: testStaff.id,
    });
    expect(claim).toBeDefined();
  });
});
```

---

## 4. Edge Cases & Error Handling

### 4.1 Authorization Edge Cases

```typescript
describe('Authorization Edge Cases', () => {
  it('should handle concurrent verification attempts', async () => {
    const auth = await createPendingAuthorization();
    
    // Simulate concurrent calls
    const [result1, result2] = await Promise.allSettled([
      nhisApi.verifyAuthorization(auth.id, staff1.id),
      nhisApi.verifyAuthorization(auth.id, staff2.id),
    ]);
    
    // One should succeed, one should fail
    const succeeded = [result1, result2].filter(r => r.status === 'fulfilled');
    const failed = [result1, result2].filter(r => r.status === 'rejected');
    
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
  });

  it('should handle authorization expiry mid-encounter', async () => {
    // Auth expires in 1 minute
    const auth = await createAuthorizationExpiringSoon();
    const encounter = await createAndVerifyEncounter(auth);
    
    // Wait for auth to expire
    await sleep(65000);
    
    // Service creation should fail
    await expect(createLabRequest({ encounter_id: encounter.id }))
      .rejects.toThrow('Authorization has expired');
  });
});
```

### 4.2 Service Execution Edge Cases

```typescript
describe('Service Execution Edge Cases', () => {
  it('should block execution if approval is revoked', async () => {
    const { encounter, labRequest, approval } = await createApprovedService();
    
    // Revoke approval
    await nhisApi.revokeApproval(approval.id, testStaff.id, 'Error in approval');
    
    const result = await nhisApi.canExecuteService(encounter.id, 'lab_request', labRequest.id);
    expect(result.canExecute).toBe(false);
    expect(result.reason).toContain('Service approval was revoked');
  });

  it('should handle partial service execution', async () => {
    const encounter = await createVerifiedEncounterWithServices();
    
    // Execute some services but not all
    await executeSomeServices(encounter.id);
    
    // Claim generation should fail
    await expect(nhisApi.generateClaim({ encounterId: encounter.id, createdBy: testStaff.id }))
      .rejects.toThrow('Not all services have been executed');
  });
});
```

### 4.3 Profile & Enrollment Edge Cases

```typescript
describe('Profile Edge Cases', () => {
  it('should handle duplicate NHIS numbers', async () => {
    await nhisApi.createProfile({
      patient_id: patient1.id,
      nhis_number: 'NHIS-DUP-001',
      // ...
    });

    await expect(nhisApi.createProfile({
      patient_id: patient2.id,
      nhis_number: 'NHIS-DUP-001',  // Same number
      // ...
    })).rejects.toThrow('NHIS number already exists');
  });

  it('should handle deactivated profiles', async () => {
    const profile = await createActiveProfile();
    await nhisApi.updateProfile(profile.id, { is_active: false });

    const encounter = await createEncounter({ patient_id: profile.patient_id, payment_category: 'NHIS' });
    
    await expect(nhisApi.verifyNhisEncounter({ encounterId: encounter.id, /* ... */ }))
      .rejects.toThrow('Patient has no active NHIS enrollment');
  });
});
```

---

## 5. Security & Compliance Tests

### 5.1 Audit Trail Tests

```typescript
describe('Audit Trail Compliance', () => {
  it('should create immutable audit records', async () => {
    const encounter = await createEncounter();
    await nhisApi.emergencyOverride({
      encounterId: encounter.id,
      overrideReason: 'Test override',
      staffId: testStaff.id,
    });

    const logs = await getAuditLogs({ entity_id: encounter.id });
    expect(logs).toHaveLength(1);
    
    // Attempt to delete or modify should fail
    await expect(deleteAuditLog(logs[0].id)).rejects.toThrow('Audit logs cannot be modified');
    await expect(updateAuditLog(logs[0].id, { /* ... */ })).rejects.toThrow();
  });

  it('should log all NHIS operations', async () => {
    // Track operations
    const operations = ['verification', 'approval', 'rejection', 'claim_generation', 'status_change'];
    
    for (const op of operations) {
      await performOperation(op);
      const logs = await getAuditLogs({ action: op });
      expect(logs.length).toBeGreaterThan(0);
    }
  });
});
```

### 5.2 Authorization Tests

```typescript
describe('Role-Based Access Control', () => {
  it('should require NHIS_OFFICER role for verifications', async () => {
    const regularUser = await loginAsRole('NURSE');
    
    await expect(nhisApi.verifyNhisEncounter({ /* ... */ verifiedBy: regularUser.id }))
      .rejects.toThrow('Insufficient permissions');
  });

  it('should require NHIS_ADMIN role for policy changes', async () => {
    const officer = await loginAsRole('NHIS_OFFICER');
    
    await expect(nhisApi.updatePolicyConfig(configId, { validity_days: 60 }))
      .rejects.toThrow('Insufficient permissions');
  });

  it('should allow emergency override only for authorized roles', async () => {
    const receptionist = await loginAsRole('RECEPTIONIST');
    
    await expect(nhisApi.emergencyOverride({ /* ... */ staffId: receptionist.id }))
      .rejects.toThrow('Insufficient permissions');
  });
});
```

---

## 6. Performance Tests

### 6.1 Load Tests

```typescript
describe('Performance: High Load', () => {
  it('should handle 100 concurrent verifications', async () => {
    const encounters = await createMultipleEncounters(100);
    
    const startTime = Date.now();
    const results = await Promise.allSettled(
      encounters.map(e => nhisApi.verifyNhisEncounter({ encounterId: e.id, /* ... */ }))
    );
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBeGreaterThan(95);  // 95%+ success rate
    expect(duration).toBeLessThan(10000);    // Under 10 seconds
  });

  it('should retrieve dashboard stats quickly', async () => {
    // Seed with large dataset
    await seedLargeDataset({ profiles: 10000, claims: 50000 });
    
    const startTime = Date.now();
    const stats = await nhisApi.getDashboardStats();
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(2000);  // Under 2 seconds
    expect(stats).toBeDefined();
  });
});
```

### 6.2 Query Performance

```typescript
describe('Performance: Query Optimization', () => {
  it('should use indexes for common queries', async () => {
    const explainResult = await db.raw(`
      EXPLAIN ANALYZE SELECT * FROM nhis_profiles 
      WHERE patient_id = ? AND is_active = true
    `, [testPatient.id]);
    
    expect(explainResult).toContain('Index Scan');
    expect(explainResult).not.toContain('Seq Scan');
  });
});
```

---

## Test Data Requirements

### Fixture Data

```typescript
// test/fixtures/nhis.fixtures.ts

export const testPatients = {
  militaryPersonnel: {
    id: 'uuid-mil-001',
    patient_category: 'Military',
    patient_type: 'Armed Forces',
    insurance_type: 'NHIS-Armed Forces',
    nhis_number: 'NHIS-MIL-TEST-001',
  },
  civilianStaff: {
    id: 'uuid-civ-001',
    patient_category: 'Civilian',
    insurance_type: 'NHIS-Civil Service',
    nhis_number: 'NHIS-CIV-TEST-001',
  },
  referredPatient: {
    id: 'uuid-ref-001',
    patient_category: 'Civilian',
    insurance_type: 'NHIS-Civil Service',
    nhis_patient_source: 'referred',
    referral_code: 'REF-TEST-001',
    referring_facility_name: 'Test General Hospital',
    referral_expiry_date: futureDate(30),
  },
};

export const testAuthorizations = {
  activeAuth: {
    auth_code: 'AUTH-TEST-ACTIVE',
    status: 'active',
    expires_at: futureDate(30),
  },
  expiredAuth: {
    auth_code: 'AUTH-TEST-EXPIRED',
    status: 'expired',
    expires_at: pastDate(1),
  },
};
```

---

## CI/CD Integration

```yaml
# .github/workflows/nhis-tests.yml
name: NHIS Module Tests

on:
  push:
    paths:
      - 'src/renderer/modules/nhis/**'
      - 'migrations/*nhis*'
  pull_request:
    paths:
      - 'src/renderer/modules/nhis/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run NHIS unit tests
        run: npm run test:nhis:unit
        
      - name: Run NHIS integration tests
        run: npm run test:nhis:integration
        env:
          TEST_DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/nhis-lcov.info
```

---

## Test Coverage Requirements

| Module | Minimum Coverage |
|--------|-----------------|
| `nhis.api.ts` | 90% |
| `useNhis.ts` (hooks) | 85% |
| `nhis.types.ts` | 100% (type coverage) |
| Components | 80% |
| Database functions | 95% |

---

## Running Tests

```bash
# Run all NHIS tests
npm run test:nhis

# Run specific test suite
npm run test:nhis:unit
npm run test:nhis:integration
npm run test:nhis:e2e

# Run with coverage
npm run test:nhis -- --coverage

# Run specific file
npm run test -- src/renderer/modules/nhis/__tests__/nhis.api.test.ts
```
