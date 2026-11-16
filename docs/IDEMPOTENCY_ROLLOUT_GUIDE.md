# Idempotency System - Production Rollout Guide

## Overview

This guide documents the improved idempotency system for NDC Medical Centre EMR, including deployment steps and application integration patterns.

---

## A) What Changed and Why

### 1. Type Safety (`idempotency_key_t` DOMAIN)

**Before:** Unbounded `TEXT` column - could store 1GB of data per key  
**After:** `VARCHAR(128)` with validation - bounded, clean, efficient

**Why it matters:**
- Prevents accidental storage of massive strings
- Rejects blank/whitespace-only keys that could cause "invisible" duplicates
- Consistent validation across all 15+ tables

### 2. Removed Unsafe Function

**Before:** `check_idempotency(table_name TEXT, key TEXT)` used dynamic SQL  
**After:** Removed - use UPSERT patterns instead

**Why it matters:**
- Dynamic SQL with table names is a SQL injection vector
- Could be exploited if exposed to user input
- UPSERT is more efficient (single atomic operation)

### 3. Observability Columns

**Added:**
- `idempotency_created_at TIMESTAMPTZ` - When was this key first used?
- `idempotency_hash VARCHAR(64)` - SHA256 of request payload

**Why it matters:**
- Debug "why was my request rejected?" issues
- Detect client bugs where same key is reused with different data
- Audit trail for compliance

### 4. Type-Safe Check Functions

**Added:** `check_billing_order_idempotency()`, `check_receipt_idempotency()`, etc.

**Why it matters:**
- If you can't use UPSERT, these are safe alternatives
- No SQL injection risk (hardcoded table names)
- Return existing record ID + hash mismatch flag

---

## B) Deployment Steps (Rollout Checklist)

### Phase 1: Pre-Deployment Validation

- [ ] **Backup database** before running migration
- [ ] **Review existing data**: Run this query to check for problematic keys:
  ```sql
  -- Check for keys that will be modified
  SELECT 'billing_orders' as tbl, COUNT(*) 
  FROM billing_orders 
  WHERE idempotency_key IS NOT NULL 
    AND (LENGTH(idempotency_key) > 128 OR idempotency_key != TRIM(idempotency_key))
  UNION ALL
  SELECT 'receipts', COUNT(*) 
  FROM receipts 
  WHERE idempotency_key IS NOT NULL 
    AND (LENGTH(idempotency_key) > 128 OR idempotency_key != TRIM(idempotency_key));
  -- Add other tables as needed
  ```
- [ ] **Test migration** on staging/development first
- [ ] **Verify application** doesn't call `check_idempotency()` function

### Phase 2: Run Migration

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Direct SQL execution
psql $DATABASE_URL -f migrations/062_idempotency_improvements.sql

# Option 3: Via Supabase Dashboard
# SQL Editor → Paste migration → Run
```

### Phase 3: Post-Migration Validation

- [ ] **Verify DOMAIN exists:**
  ```sql
  SELECT typname, typtype FROM pg_type WHERE typname = 'idempotency_key_t';
  ```
- [ ] **Verify columns migrated:**
  ```sql
  SELECT table_name, column_name, data_type, udt_name
  FROM information_schema.columns 
  WHERE column_name = 'idempotency_key' 
    AND table_schema = 'public';
  -- Should show udt_name = 'idempotency_key_t' for all tables
  ```
- [ ] **Verify new columns added:**
  ```sql
  SELECT table_name, column_name 
  FROM information_schema.columns 
  WHERE column_name IN ('idempotency_created_at', 'idempotency_hash')
    AND table_schema = 'public';
  ```
- [ ] **Test constraint works:**
  ```sql
  -- Should fail with constraint violation
  INSERT INTO billing_orders (order_number, idempotency_key) 
  VALUES ('TEST-001', '   ');
  -- Error: value for domain idempotency_key_t violates check constraint
  ```

### Phase 4: Application Code Updates

See Section C below for code patterns.

---

## C) Application Integration Patterns

### Pattern 1: UPSERT with ON CONFLICT (Recommended)

This is the recommended pattern for all idempotent operations:

```typescript
// src/renderer/lib/idempotencyPatterns.ts

import { supabase } from '../supabase/client';
import { generateIdempotencyKey, hashPayload } from './idempotency';

/**
 * Create a billing order with idempotency protection
 * Returns existing record if duplicate key, creates new if not
 */
export async function createBillingOrderIdempotent(
  orderData: BillingOrderInput,
  userId: string
): Promise<{ data: BillingOrder; isNew: boolean }> {
  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(userId, 'CREATE_BILLING_ORDER');
  
  // Generate payload hash for mismatch detection
  const idempotencyHash = hashPayload(orderData);
  
  // Attempt insert with ON CONFLICT handling
  const { data, error } = await supabase
    .from('billing_orders')
    .upsert(
      {
        ...orderData,
        idempotency_key: idempotencyKey,
        idempotency_hash: idempotencyHash,
        // idempotency_created_at is set by trigger
      },
      {
        onConflict: 'idempotency_key',
        ignoreDuplicates: false, // Return existing row
      }
    )
    .select()
    .single();

  if (error) throw error;

  // Check if this was a new insert or existing return
  // If idempotency_hash differs, log warning
  if (data.idempotency_hash && data.idempotency_hash !== idempotencyHash) {
    console.warn('Idempotency key reused with different payload!', {
      key: idempotencyKey,
      originalHash: data.idempotency_hash,
      newHash: idempotencyHash,
    });
  }

  return {
    data,
    isNew: data.idempotency_created_at === null || 
           new Date(data.idempotency_created_at).getTime() > Date.now() - 1000,
  };
}
```

### Pattern 2: Check-Then-Insert (Legacy Support)

If you can't use UPSERT (e.g., complex business logic before insert):

```typescript
/**
 * Create patient with pre-check (use when UPSERT won't work)
 */
export async function createPatientWithCheck(
  patientData: PatientInput,
  userId: string
): Promise<{ data: Patient; isNew: boolean }> {
  const idempotencyKey = generateIdempotencyKey(userId, 'CREATE_PATIENT');
  const idempotencyHash = hashPayload(patientData);
  
  // Check for existing using type-safe function
  const { data: existing } = await supabase
    .rpc('check_patient_idempotency', {
      p_idempotency_key: idempotencyKey,
      p_idempotency_hash: idempotencyHash,
    })
    .single();

  if (existing?.existing_id) {
    // Record already exists
    if (existing.hash_mismatch) {
      // Log this - client is reusing keys incorrectly
      await logHashMismatch('patients', idempotencyKey, existing.existing_id, idempotencyHash);
    }
    
    // Fetch and return existing record
    const { data: patient } = await supabase
      .from('patients')
      .select('*')
      .eq('id', existing.existing_id)
      .single();
      
    return { data: patient!, isNew: false };
  }

  // No existing record, create new
  const { data: newPatient, error } = await supabase
    .from('patients')
    .insert({
      ...patientData,
      idempotency_key: idempotencyKey,
      idempotency_hash: idempotencyHash,
    })
    .select()
    .single();

  if (error) {
    // Race condition: another request inserted between check and insert
    if (error.code === '23505') { // Unique violation
      // Retry by fetching existing
      const { data: racePatient } = await supabase
        .from('patients')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .single();
        
      return { data: racePatient!, isNew: false };
    }
    throw error;
  }

  return { data: newPatient, isNew: true };
}
```

### Pattern 3: React Hook Integration

```typescript
// src/renderer/hooks/useIdempotentMutation.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateIdempotencyKey, hashPayload } from '../lib/idempotency';

interface IdempotentMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables & { 
    idempotency_key: string; 
    idempotency_hash: string 
  }) => Promise<TData>;
  action: string;
  queryKey?: string[];
}

export function useIdempotentMutation<TData, TVariables>(
  options: IdempotentMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  
  // Get current user ID from auth context
  const userId = useCurrentUserId();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const idempotencyKey = generateIdempotencyKey(userId, options.action);
      const idempotencyHash = hashPayload(variables);
      
      return options.mutationFn({
        ...variables,
        idempotency_key: idempotencyKey,
        idempotency_hash: idempotencyHash,
      });
    },
    onSuccess: () => {
      if (options.queryKey) {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }
    },
    onError: (error: any) => {
      // Handle unique constraint violation gracefully
      if (error?.code === '23505' && error?.constraint?.includes('idempotency')) {
        console.log('Duplicate request detected, original record returned');
        // Optionally show user-friendly message
      }
    },
  });
}
```

### Pattern 4: Payload Hash Helper

```typescript
// Add to src/renderer/lib/idempotency.ts

import { createHash } from 'crypto';

/**
 * Generate SHA256 hash of payload for mismatch detection
 */
export function hashPayload(payload: unknown): string {
  const normalized = JSON.stringify(payload, Object.keys(payload as object).sort());
  return createHash('sha256').update(normalized).digest('hex').slice(0, 64);
}
```

---

## D) Handling Duplicate Key Conflicts Gracefully

### Option 1: Return Existing (Preferred for Creates)

```typescript
// In your API layer
try {
  const result = await createBillingOrderIdempotent(data, userId);
  
  if (result.isNew) {
    return { success: true, data: result.data, message: 'Order created' };
  } else {
    return { success: true, data: result.data, message: 'Existing order returned' };
  }
} catch (error) {
  // Only true errors reach here (not duplicates)
  throw error;
}
```

### Option 2: Throw Specific Error (For Strict Workflows)

```typescript
// When you want to explicitly notify caller of duplicate
if (!result.isNew) {
  throw new IdempotencyError(
    'Request already processed',
    result.data.id,
    result.data.idempotency_key
  );
}
```

### Option 3: Silent Return (Fire-and-Forget Operations)

```typescript
// For operations where caller doesn't care if duplicate
const { data } = await supabase
  .from('audit_logs')
  .upsert(
    { ...logData, idempotency_key: key },
    { onConflict: 'idempotency_key', ignoreDuplicates: true }
  );
// No error thrown for duplicates, just silently ignored
```

---

## E) Monitoring & Debugging

### Query: Find Duplicate Attempts

```sql
-- See hash mismatches (indicates client bugs)
SELECT * FROM idempotency_hash_mismatches 
ORDER BY attempted_at DESC 
LIMIT 100;
```

### Query: Idempotency Key Usage by Table

```sql
SELECT 
  'billing_orders' as table_name,
  COUNT(*) FILTER (WHERE idempotency_key IS NOT NULL) as keys_used,
  COUNT(*) as total_records,
  MIN(idempotency_created_at) as first_key_used,
  MAX(idempotency_created_at) as last_key_used
FROM billing_orders
UNION ALL
SELECT 'receipts', 
  COUNT(*) FILTER (WHERE idempotency_key IS NOT NULL),
  COUNT(*),
  MIN(idempotency_created_at),
  MAX(idempotency_created_at)
FROM receipts;
-- Add other tables as needed
```

### Alert: High Duplicate Rate

```sql
-- If this returns high numbers, clients may be retrying too aggressively
SELECT 
  date_trunc('hour', attempted_at) as hour,
  COUNT(*) as duplicate_attempts
FROM idempotency_hash_mismatches
WHERE attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## F) Rollback Procedure (If Needed)

If you need to rollback this migration:

```sql
-- Revert to TEXT type (loses validation)
ALTER TABLE billing_orders ALTER COLUMN idempotency_key TYPE TEXT;
ALTER TABLE receipts ALTER COLUMN idempotency_key TYPE TEXT;
-- ... repeat for other tables

-- Drop observability columns (loses data)
ALTER TABLE billing_orders DROP COLUMN IF EXISTS idempotency_created_at;
ALTER TABLE billing_orders DROP COLUMN IF EXISTS idempotency_hash;
-- ... repeat for other tables

-- Drop new functions
DROP FUNCTION IF EXISTS check_billing_order_idempotency;
DROP FUNCTION IF EXISTS check_receipt_idempotency;
DROP FUNCTION IF EXISTS check_patient_idempotency;
DROP FUNCTION IF EXISTS set_idempotency_timestamp;

-- Drop mismatch logging table
DROP TABLE IF EXISTS idempotency_hash_mismatches;

-- Drop domain (must be last, after columns converted)
DROP DOMAIN IF EXISTS idempotency_key_t;

-- Recreate old function if needed (NOT RECOMMENDED)
-- See migration 060 for original definition
```

---

## G) FAQ

**Q: Why 128 characters for idempotency key?**  
A: Our format `{userId}-{action}-{timestamp}-{random}` typically produces ~80 chars. 128 gives headroom for longer user IDs or actions while preventing abuse.

**Q: Should I always use idempotency keys?**  
A: Yes for CREATE operations on critical data (billing, patients, clinical orders). Optional for UPDATE operations and non-critical data (logs, queue entries).

**Q: What if I need facility-scoped uniqueness?**  
A: For tables with `facility_id`, you can create a composite unique index:
```sql
CREATE UNIQUE INDEX idx_admissions_facility_idempotency 
ON admissions(facility_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```
But we recommend global uniqueness for simplicity.

**Q: How long should idempotency keys be valid?**  
A: Keys are permanent by design. If you need expiration, add application logic:
```typescript
// Client-side: Include timestamp in key, reject if too old
const keyParts = idempotencyKey.split('-');
const timestamp = parseInt(keyParts[2], 10);
if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
  throw new Error('Idempotency key expired');
}
```
