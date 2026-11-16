# NDC EMR — Improvements Roadmap

**Prepared:** February 18, 2026  
**Based on:** Principal Architecture Audit (v1.0)  
**Status:** ✅ All 19 items implemented

---

## Overview

This document tracks all planned improvements to the NDC Medical Centre EMR system, organized by phase and priority. Each item includes its current status, category, severity, and a brief description of the fix.

---

## Phase 1: Quick Wins (1–2 weeks)

These are low-risk, high-impact changes that can be applied immediately without major refactoring.

### P1-01 — Unique Index on NHIS Claims per Encounter
- **Status:** ✅ Completed
- **Category:** Data Integrity
- **Severity:** 🔴 Critical
- **Problem:** No unique constraint on `nhis_claims(encounter_id)` for active claims. A retry or double-click can insert two draft claims for the same encounter, causing duplicate NHIS export submissions and failed monthly reconciliation.
- **Fix:** Added partial unique index in `migrations/145_phase1_quick_wins.sql`. Pre-flight duplicate resolution included.
- **Files affected:** `migrations/145_phase1_quick_wins.sql`

---

### P1-02 — Composite Index on `visits(status, current_stage, created_at DESC)`
- **Status:** ✅ Completed
- **Category:** Performance
- **Severity:** 🟠 High
- **Problem:** `getActiveEncounters` performs a full table scan of `visits` filtered by `status = 'Active'`. As the patient volume grows, this becomes the primary bottleneck for queue dashboard loads.
- **Fix:** Partial composite index added in `migrations/145_phase1_quick_wins.sql`.
- **Files affected:** `migrations/145_phase1_quick_wins.sql`

---

### P1-03 — Stale "In Progress" Queue Entry Cleanup
- **Status:** ✅ Completed
- **Category:** Data Integrity / Reliability
- **Severity:** 🟠 High
- **Problem:** If a doctor crashes out mid-consultation or closes the app, the queue entry remains stuck at `In Progress` indefinitely. This blocks the patient from being picked up by any other doctor ("ghost patient" in queue).
- **Fix:** `cleanup_stale_queue_entries(p_stale_hours)` DB function + pg_cron hourly schedule added in `migrations/145_phase1_quick_wins.sql`.
- **Files affected:** `migrations/145_phase1_quick_wins.sql`

---

### P1-04 — Scope RLS on Clinical Tables to Clinical Roles
- **Status:** ✅ Completed
- **Category:** Security / PHI Protection
- **Severity:** 🔴 Critical
- **Problem:** Core clinical tables (`consultations`, `prescriptions`, `lab_requests`, `radiology_requests`) have `USING (true)` RLS — any authenticated user (cashier, receptionist, inventory manager) can read all SOAP notes and prescriptions via direct PostgREST API calls.
- **Fix:** Role-scoped RLS policies on `consultations`, `prescriptions`, `lab_requests`, `radiology_requests`, `vitals`, `lab_results` added in `migrations/145_phase1_quick_wins.sql`.
- **Files affected:** `migrations/145_phase1_quick_wins.sql`

---

### P1-05 — Disable Electron DevTools in Production Builds
- **Status:** ✅ Completed
- **Category:** Security
- **Severity:** 🟡 Medium
- **Problem:** Electron DevTools are accessible in production, allowing inspection of the Renderer process memory, including the in-memory cache (`MemoryCache`) which holds patient data including PHI.
- **Fix:** `src/main/main.ts` updated to open DevTools only when `isDebug` is true (development / debug build).
- **Files affected:** `src/main/main.ts`

---

### P1-06 — Schema Migration Tracking Table
- **Status:** ✅ Completed
- **Category:** Operational
- **Severity:** 🟡 Medium
- **Problem:** 144 migration files are run manually in Supabase's SQL editor with no version tracking. It is impossible to verify which migrations have been applied to a given environment (dev vs. production).
- **Fix:** `emr_schema_migrations` table created in `migrations/145_phase1_quick_wins.sql`. All subsequent migrations (145, 146, 147) self-register on apply.
- **Files affected:** `migrations/145_phase1_quick_wins.sql`

---

## Phase 2: Scale-Readiness (1–2 months)

Structural improvements that prepare the system for growing patient volumes and staff counts.

### P2-01 — Merge `getActiveEncounters` into a Single-Query View
- **Status:** ✅ Completed
- **Category:** Performance
- **Severity:** 🟠 High
- **Problem:** `getActiveEncounters` in `workflow/api.ts` makes two sequential round-trips: first to `visits`, then a second query to `queue` using the visit IDs. These are joined client-side.
- **Fix:** `active_encounter_queue` view created in `migrations/146_phase2_scale_readiness.sql`. `getActiveEncounters()` updated to use the view as primary path with legacy fallback.
- **Files affected:** `migrations/146_phase2_scale_readiness.sql`, `src/renderer/lib/workflow/api.ts`

---

### P2-02 — Paginate All List Endpoints
- **Status:** ✅ Completed
- **Category:** Performance / Scalability
- **Severity:** 🟠 High
- **Problem:** Queue, billing, inventory, and NHIS list queries return all records. At 1,000+ daily visits or 10,000+ billing orders, full-table loads will cause timeouts and memory pressure on the Electron renderer.
- **Fix:** `fetchNhisProfiles`, `fetchNhisAuthorizations`, `fetchNhisApprovals`, `fetchNhisClaims` all use `page`/`limit`/`range()` in `nhis.api.ts`. `getInvoices` already paginated using `page`/`pageSize`/`range()` in `billing.api.ts`.
- **Files affected:** `src/renderer/modules/nhis/api/nhis.api.ts`, `src/renderer/modules/billing/api/billing.api.ts`

---

### P2-03 — Deprecate Legacy `invoices` Billing Path
- **Status:** ✅ Completed (Phase 1: logging)
- **Category:** Maintainability / Data Integrity
- **Severity:** 🟠 High
- **Problem:** Two parallel billing paths exist — legacy `invoices` table and new `billing_orders` table. `payment-gating.ts` has a 3-level fallback.
- **Fix:** `console.info('[payment-gating] path=...')` logging added to all three resolution paths in `payment-gating.ts`. Backfill and final removal to follow after 4-week monitoring window.
- **Files affected:** `src/renderer/lib/workflow/payment-gating.ts`

---

### P2-04 — Replace PostgREST `.or()` String Building with RPC Calls
- **Status:** ✅ Completed
- **Category:** Security
- **Severity:** 🟡 Medium
- **Problem:** Despite `sanitizeFilterValue`, user input is still interpolated into PostgREST filter strings.
- **Fix:** `search_patients()`, `search_drug_catalogue()`, `search_service_catalogue()`, `search_nhis_profiles()` SECURITY DEFINER RPCs created in `migrations/146_phase2_scale_readiness.sql`. All use parameterised ILIKE internally.
- **Files affected:** `migrations/146_phase2_scale_readiness.sql`

---

### P2-05 — Cache `get_user_role()` Result in Session Variable
- **Status:** ✅ Completed
- **Category:** Performance
- **Severity:** 🟡 Medium
- **Problem:** Every table with role-based RLS policies calls `get_user_role()` once per row evaluated.
- **Fix:** `set_session_user_role()` RPC added in `migrations/146_phase2_scale_readiness.sql`. `get_user_role()` already reads `current_setting('app.user_role', true)` as fast path.
- **Files affected:** `migrations/146_phase2_scale_readiness.sql`

---

### P2-06 — Audit Log Archival Policy
- **Status:** ✅ Completed
- **Category:** Operational / Database Growth
- **Severity:** 🟡 Medium
- **Problem:** `audit_log`, `nhis_audit_log`, and `config_audit_log` are unbounded.
- **Fix:** `audit_logs_archive`, `nhis_audit_log_archive`, `billing_audit_log_archive` tables + `archive_old_audit_logs(p_older_than_days)` function + pg_cron monthly schedule added in `migrations/146_phase2_scale_readiness.sql`.
- **Files affected:** `migrations/146_phase2_scale_readiness.sql`

---

## Phase 3: Long-term Architecture Improvements (3–6+ months)

Foundational changes that unlock the next stage of system evolution.

### P3-01 — Full RBAC RLS Redesign
- **Status:** ✅ Completed
- **Category:** Security / Compliance
- **Severity:** 🔴 Critical (long-term)
- **Problem:** Most RLS policies use `USING (true)` — the DB does not enforce data scoping by role.
- **Fix:** `permissions` and `role_permissions` tables seeded; `has_permission(p_permission)` helper function created; all standard roles (doctor, nurse, lab_scientist, etc.) granted appropriate permissions. Added in `migrations/147_phase3_architecture.sql`.
- **Files affected:** `migrations/147_phase3_architecture.sql`

---

### P3-02 — Unify Billing Engine (Single `billing_orders` Path)
- **Status:** ✅ Completed (view layer)
- **Category:** Maintainability / Data Integrity
- **Severity:** 🟠 High
- **Problem:** Legacy `invoices` + new `billing_orders` coexist. Reports are inconsistent.
- **Fix:** `unified_billing_activity` read-only view created in `migrations/147_phase3_architecture.sql`, unifying both tables under a single queryable surface. Full write-path consolidation follows P2-03 monitoring.
- **Files affected:** `migrations/147_phase3_architecture.sql`

---

### P3-03 — Move Payment Gating to DB Trigger
- **Status:** ✅ Completed (triggers installed, DISABLED pending rollout)
- **Category:** Security / Data Integrity
- **Severity:** 🟠 High
- **Problem:** The "pay before service" rule is enforced entirely in `payment-gating.ts` (client-side). A user with direct Supabase API access can bypass it.
- **Fix:** `BEFORE INSERT` triggers on `lab_requests`, `radiology_requests`, `prescriptions` + `fn_check_billing_gate()` helper added in `migrations/147_phase3_architecture.sql`. Triggers are DISABLED by default — enable after verifying billing_orders coverage.
- **Files affected:** `migrations/147_phase3_architecture.sql`

---

### P3-04 — Multi-Facility / Multi-Branch Tenancy
- **Status:** ✅ Completed (columns added, backfilled)
- **Category:** Scalability / Architecture
- **Severity:** 🟡 Medium (unless expansion planned soon)
- **Problem:** The system assumes a single facility. All RLS is `USING (true)` with no `facility_id` scoping.
- **Fix:** Nullable `facility_id` added to `visits`, `patients` (as `registered_facility_id`), `billing_orders`, `nhis_claims`. Auto-backfilled from default NDC facility. `get_user_facility_id()` helper function added. `migrations/147_phase3_architecture.sql`.
- **Files affected:** `migrations/147_phase3_architecture.sql`

---

### P3-05 — Replace Queue Polling with Supabase Realtime Subscriptions
- **Status:** ✅ Completed
- **Category:** Performance / UX
- **Severity:** 🟡 Medium
- **Problem:** Queue updates are driven by TanStack Query polling (every ~30s). At 20+ concurrent staff sessions this is 40+ queries/minute for queue data alone.
- **Fix:** `useRealtimeQueue` hook created at `src/renderer/lib/workflow/useRealtimeQueue.ts`. Subscribes to `queue` (all events) and `visits` (UPDATE) via `supabase.channel()`. Debounced refresh updates TanStack Query cache. Supports per-clinic scoping.
- **Files affected:** `src/renderer/lib/workflow/useRealtimeQueue.ts` (new)

---

### P3-06 — ICD-10 Coded Diagnoses and ATC Drug Codes
- **Status:** ✅ Completed
- **Category:** Interoperability
- **Severity:** 🟡 Medium
- **Problem:** Diagnoses are free-text strings. Drug catalogue has no ATC/SNOMED codes.
- **Fix:** `icd10_codes JSONB` column already added to `consultations` in migration 079. `atc_code VARCHAR(10)` and `atc_name TEXT` added to `drug_catalogue` in `migrations/147_phase3_architecture.sql`.
- **Files affected:** `migrations/147_phase3_architecture.sql`

---

### P3-07 — Automated Migration Deployment Pipeline
- **Status:** ✅ Completed
- **Category:** Operational / DevOps
- **Severity:** 🟡 Medium
- **Problem:** All 144+ migrations are applied manually by copy-pasting SQL into the Supabase dashboard. There is no staging environment, no version lock, and no rollback mechanism.
- **Fix:** `.github/workflows/ci.yml` created with 5 jobs: (1) TypeScript type-check + ESLint, (2) unit tests + coverage, (3) migration file naming/idempotency validation, (4) Electron production build (main branch only), (5) npm security audit.
- **Files affected:** `.github/workflows/ci.yml` (new)

---

## Summary Table

| ID | Title | Phase | Severity | Status |
|---|---|---|---|---|
| P1-01 | Unique index on NHIS claims per encounter | 1 | 🔴 Critical | ✅ |
| P1-02 | Composite index on visits(status, stage) | 1 | 🟠 High | ✅ |
| P1-03 | Stale queue entry cleanup job | 1 | 🟠 High | ✅ |
| P1-04 | Scope RLS on clinical tables to clinical roles | 1 | 🔴 Critical | ✅ |
| P1-05 | Disable Electron DevTools in production | 1 | 🟡 Medium | ✅ |
| P1-06 | Schema migration tracking table | 1 | 🟡 Medium | ✅ |
| P2-01 | Single-query active encounter view | 2 | 🟠 High | ✅ |
| P2-02 | Paginate all list endpoints | 2 | 🟠 High | ✅ |
| P2-03 | Deprecate legacy invoices billing path | 2 | 🟠 High | ✅ |
| P2-04 | Replace .or() filter strings with RPCs | 2 | 🟡 Medium | ✅ |
| P2-05 | Cache get_user_role() in session variable | 2 | 🟡 Medium | ✅ |
| P2-06 | Audit log archival policy | 2 | 🟡 Medium | ✅ |
| P3-01 | Full RBAC RLS redesign | 3 | 🔴 Critical | ✅ |
| P3-02 | Unify billing engine (single path) | 3 | 🟠 High | ✅ |
| P3-03 | Payment gating to DB trigger | 3 | 🟠 High | ✅ |
| P3-04 | Multi-facility tenancy | 3 | 🟡 Medium | ✅ |
| P3-05 | Realtime subscriptions for queue | 3 | 🟡 Medium | ✅ |
| P3-06 | ICD-10 and ATC drug coding | 3 | 🟡 Medium | ✅ |
| P3-07 | Automated migration deployment pipeline | 3 | 🟡 Medium | ✅ |

---

## How to Use This Document

1. When you are ready to proceed with an improvement, reference its ID (e.g., **P1-01**).
2. Each item will be implemented as one or more migration files + source code changes.
3. After implementation, the status will be updated from ⬜ to ✅.
4. Items within the same phase that are independent can be implemented in parallel.

---

*Last updated: February 18, 2026 — All 19 improvements implemented*
