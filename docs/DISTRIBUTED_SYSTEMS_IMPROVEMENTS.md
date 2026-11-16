# NDC Medical Centre EMR - Distributed Systems Improvements

**Version:** 1.0  
**Date:** January 24, 2026  
**Status:** Implementation in Progress

---

## Executive Summary

This document outlines the distributed systems improvements being implemented to enhance data integrity, reliability, performance, and scalability of the NDC Medical Centre EMR system.

---

## Table of Contents

1. [Current Architecture Assessment](#1-current-architecture-assessment)
2. [Implementation Roadmap](#2-implementation-roadmap)
3. [P0: Data Integrity Improvements](#3-p0-data-integrity-improvements)
4. [P1: Reliability Improvements](#4-p1-reliability-improvements)
5. [P2: Performance Improvements](#5-p2-performance-improvements)
6. [P3: Enterprise Scale Improvements](#6-p3-enterprise-scale-improvements)
7. [Migration Guide](#7-migration-guide)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Current Architecture Assessment

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     NDC Medical Centre EMR                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   React     │  │ React Query │  │  Supabase   │             │
│  │    UI       │◄─┤   Cache     │◄─┤   Client    │             │
│  │             │  │  (Memory)   │  │             │             │
│  └─────────────┘  └─────────────┘  └──────┬──────┘             │
│                                           │                     │
│  Electron Desktop Application             │ REST/WebSocket      │
└───────────────────────────────────────────┼─────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  PostgREST  │  │  Realtime   │  │    Auth     │             │
│  │    API      │  │  WebSocket  │  │   Service   │             │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘             │
│         │                │                                      │
│         ▼                ▼                                      │
│  ┌─────────────────────────────────────────────────┐           │
│  │              PostgreSQL + RLS                    │           │
│  │         (Row Level Security Enabled)             │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Gaps Identified

| Area | Current State | Gap | Risk |
|------|--------------|-----|------|
| **Delta Sync** | Full refetch only | No incremental updates | High bandwidth, slow recovery |
| **Idempotency** | None | Duplicate records possible | Data corruption |
| **Optimistic Locking** | Last-write-wins | Concurrent update conflicts | Data loss |
| **Offline Support** | None | App unusable offline | Clinical workflow disruption |
| **Caching** | Client memory only | No server-side cache | Database overload |
| **Conflict Resolution** | None | Silent overwrites | Lost clinical data |
| **Audit Trail** | Partial | No complete history | Compliance risk |
| **Circuit Breaker** | None | Cascading failures | System unavailability |

---

## 2. Implementation Roadmap

### Phase 1: P0 - Data Integrity (Week 1-2)
- [x] Add idempotency keys to create mutations
- [x] Add optimistic locking to critical tables
- [ ] Fix N+1 queries in billing/export APIs

### Phase 2: P1 - Reliability (Week 3-4)
- [x] Consolidate Realtime subscriptions (with scope filtering)
- [x] Implement retry with exponential backoff
- [ ] Add request deduplication to mutation hooks

### Phase 3: P2 - Performance (Week 5-8)
- [ ] Add IndexedDB for offline read access
- [x] Implement delta sync with watermarks (and soft delete support)
- [ ] Add pagination to all list queries

### Phase 4: P3 - Enterprise Scale (Week 9-12)
- [x] Add in-memory cache layer (Redis-like patterns for Electron)
- [x] Implement audit logging via triggers (migrations/032, 049)
- [x] Add circuit breaker pattern

---

## 3. P0: Data Integrity Improvements

### 3.1 Idempotency Keys

**Problem:** Network retries or double-clicks can create duplicate records.

**Solution:** Add client-generated idempotency keys to all create operations.

#### Database Schema Changes

```sql
-- Add idempotency_key column to tables that support creation
ALTER TABLE billing_orders ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE lab_requests ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE radiology_requests ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE prescriptions ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE encounters ADD COLUMN idempotency_key TEXT UNIQUE;
ALTER TABLE patients ADD COLUMN idempotency_key TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_billing_orders_idempotency ON billing_orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

#### Client-Side Implementation

```typescript
// src/renderer/lib/idempotency.ts
export function generateIdempotencyKey(userId: string, action: string): string {
  return `${userId}-${action}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

// Usage in API calls
const idempotencyKey = generateIdempotencyKey(userId, 'create-billing-order');
await supabase.from('billing_orders').insert({
  ...orderData,
  idempotency_key: idempotencyKey,
});
```

### 3.2 Optimistic Locking

**Problem:** Concurrent updates silently overwrite each other.

**Solution:** Add version column and check on update.

#### Database Schema Changes

```sql
-- Add version column to critical tables
ALTER TABLE patients ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE encounters ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE consultations ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE prescriptions ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

-- Create trigger to auto-increment version
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_version_trigger
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION increment_version();
```

#### Client-Side Implementation

```typescript
// src/renderer/lib/optimisticLocking.ts
export class OptimisticLockError extends Error {
  constructor(public tableName: string, public recordId: string) {
    super(`Record ${recordId} in ${tableName} was modified by another user`);
    this.name = 'OptimisticLockError';
  }
}

export async function updateWithLock<T>(
  table: string,
  id: string,
  data: Partial<T>,
  currentVersion: number
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .eq('version', currentVersion)
    .select()
    .single();

  if (error || !result) {
    throw new OptimisticLockError(table, id);
  }

  return result;
}
```

### 3.3 N+1 Query Fixes

**Problem:** Sequential queries for related data cause performance issues.

**Before:**
```typescript
for (const order of orders) {
  const items = await supabase.from('billing_items').select('*').eq('order_id', order.id);
  const payments = await supabase.from('receipts').select('*').eq('order_id', order.id);
}
```

**After:**
```typescript
const { data } = await supabase
  .from('billing_orders')
  .select(`
    *,
    billing_items (*),
    receipts (*)
  `)
  .in('encounter_id', encounterIds);
```

---

## 4. P1: Reliability Improvements

### 4.1 Consolidated Realtime Subscriptions

**Problem:** Multiple WebSocket subscriptions per view consume connection limits.

**Solution:** Use server-side triggers to consolidate notifications.

```sql
-- Create unified notification function
CREATE OR REPLACE FUNCTION notify_module_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'emr_changes',
    json_build_object(
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id, OLD.id),
      'encounter_id', COALESCE(NEW.encounter_id, OLD.encounter_id)
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Retry with Exponential Backoff

```typescript
// src/renderer/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * 0.1 * Math.random();
      await new Promise(r => setTimeout(r, delay + jitter));
    }
  }
  throw new Error('Unreachable');
}
```

### 4.3 Request Deduplication

```typescript
// src/renderer/lib/deduplication.ts
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  
  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}
```

---

## 5. P2: Performance Improvements

### 5.1 IndexedDB Offline Storage

```typescript
// src/renderer/lib/offlineStorage.ts
import { openDB, DBSchema } from 'idb';

interface EMRDatabase extends DBSchema {
  patients: {
    key: string;
    value: Patient;
    indexes: { 'by-emr': string };
  };
  encounters: {
    key: string;
    value: Encounter;
    indexes: { 'by-patient': string; 'by-date': string };
  };
}

export const db = openDB<EMRDatabase>('emr-offline', 1, {
  upgrade(db) {
    const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
    patientStore.createIndex('by-emr', 'emr_number');
    
    const encounterStore = db.createObjectStore('encounters', { keyPath: 'id' });
    encounterStore.createIndex('by-patient', 'patient_id');
    encounterStore.createIndex('by-date', 'encounter_date');
  },
});
```

### 5.2 Delta Sync with Watermarks

```typescript
// src/renderer/lib/deltaSync.ts
interface SyncState {
  tableName: string;
  lastSyncedAt: string;
  recordCount: number;
}

export async function deltaSync(
  table: string,
  lastSync: SyncState | null
): Promise<{ records: any[]; newSyncState: SyncState }> {
  const query = supabase
    .from(table)
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: true })
    .limit(1000);

  if (lastSync) {
    query.gt('updated_at', lastSync.lastSyncedAt);
  }

  const { data, count, error } = await query;
  
  if (error) throw error;
  
  const newSyncState: SyncState = {
    tableName: table,
    lastSyncedAt: data?.length 
      ? data[data.length - 1].updated_at 
      : lastSync?.lastSyncedAt || new Date().toISOString(),
    recordCount: count || 0,
  };

  return { records: data || [], newSyncState };
}
```

---

## 6. P3: Enterprise Scale Improvements

### 6.1 Audit Logging

```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_fields,
    performed_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'UPDATE' THEN 
      ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) 
            WHERE to_jsonb(NEW)->key != to_jsonb(OLD)->key)
    END,
    current_setting('app.current_user_id', true)::UUID
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Circuit Breaker

```typescript
// src/renderer/lib/circuitBreaker.ts
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailure: number | null = null;
  
  constructor(
    private options: {
      failureThreshold: number;
      resetTimeout: number;
      fallback?: () => any;
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailure || 0) > this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else if (this.options.fallback) {
        return this.options.fallback();
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

---

## 7. Migration Guide

### 7.1 Database Migrations

Run migrations in order:

```bash
# 1. Add idempotency columns
psql -f migrations/060_add_idempotency_keys.sql

# 2. Add version columns for optimistic locking
psql -f migrations/061_add_optimistic_locking.sql

# 3. Add audit logging
psql -f migrations/062_add_audit_logging.sql

# 4. Add consolidated realtime triggers
psql -f migrations/063_consolidated_realtime.sql
```

### 7.2 Code Changes

1. Update all `insert` calls to include idempotency keys
2. Update all `update` calls to use optimistic locking
3. Replace N+1 queries with nested selects
4. Add retry wrapper to critical operations

---

## 8. Testing Strategy

### 8.1 Idempotency Testing

```typescript
describe('Idempotency', () => {
  it('should reject duplicate idempotency keys', async () => {
    const key = generateIdempotencyKey('user1', 'create-order');
    
    await createBillingOrder({ ...data, idempotency_key: key });
    
    await expect(
      createBillingOrder({ ...data, idempotency_key: key })
    ).rejects.toThrow(/duplicate/i);
  });
});
```

### 8.2 Optimistic Locking Testing

```typescript
describe('Optimistic Locking', () => {
  it('should fail when version mismatch', async () => {
    const patient = await getPatient(id);
    
    // Simulate concurrent update
    await updatePatient(id, { name: 'Other' }, patient.version);
    
    // Our update should fail
    await expect(
      updatePatient(id, { name: 'Ours' }, patient.version)
    ).rejects.toThrow(OptimisticLockError);
  });
});
```

### 8.3 Circuit Breaker Testing

```typescript
describe('Circuit Breaker', () => {
  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
    const failingFn = () => Promise.reject(new Error('fail'));
    
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow();
    }
    
    await expect(breaker.execute(failingFn)).rejects.toThrow('Circuit breaker is OPEN');
  });
});
```

---

## Appendix A: Files Modified

| File | Changes |
|------|---------|
| `src/renderer/lib/idempotency.ts` | New - Idempotency key generation |
| `src/renderer/lib/optimisticLocking.ts` | New - Version-based locking |
| `src/renderer/lib/retry.ts` | New - Exponential backoff |
| `src/renderer/lib/circuitBreaker.ts` | New - Circuit breaker pattern |
| `src/renderer/lib/offlineStorage.ts` | New - IndexedDB wrapper |
| `src/renderer/lib/deltaSync.ts` | New - Incremental sync |
| `src/renderer/hooks/useOptimisticMutation.ts` | Modified - Add idempotency |
| `src/renderer/api/*.ts` | Modified - Add retry, fix N+1 |
| `migrations/060-063_*.sql` | New - Schema changes |

---

## Appendix B: Configuration

```typescript
// src/renderer/config/distributed.ts
export const distributedConfig = {
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
  },
  sync: {
    batchSize: 1000,
    syncInterval: 60000,
  },
  cache: {
    staleTime: 30000,
    gcTime: 600000,
  },
};
```

---

**Document Owner:** Engineering Team  
**Last Updated:** January 24, 2026  
**Next Review:** February 24, 2026
