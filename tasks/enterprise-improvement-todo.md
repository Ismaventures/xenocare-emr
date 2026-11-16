# Enterprise Improvement Todo

Generated: 2026-03-14
Scope: Comprehensive enterprise hardening backlog based on architecture and code analysis.

## 1) Critical Fixes (P0)

### Security boundaries and key handling
- [x] Remove renderer-side service role usage and delete all renderer imports/usages of supabaseAdmin.
- [ ] Move every privileged DB operation to main-process IPC handlers with explicit allowlists. (In progress: generic invoke bridge removed; admin IPC allowlists added.)
- [x] Remove SUPABASE_SERVICE_ROLE_KEY from renderer runtime/config exposure.
- [x] Replace generic IPC invoke bridge patterns with explicit typed methods only.
- [ ] Add strict schema validation for all IPC payloads and responses. (In progress: admin IPC payload schemas added.)
- [ ] Review and harden BrowserWindow security settings (sandbox, context isolation, navigation guards).
- [ ] Remove all hardcoded default API keys from source and setup pages.
- [ ] Rotate credentials and update deployment secrets after key cleanup.

### Database access control
- [ ] Eliminate all FOR ALL USING (true) policies in production migrations.
- [ ] Re-enable and enforce RLS where currently disabled for sensitive clinical/billing tables.
- [ ] Implement least-privilege RLS by role, facility, and encounter ownership.
- [ ] Add migration guardrails to prevent new permissive policies from being merged.
- [ ] Create a policy audit script that fails CI if permissive policies are detected.

### Transactional integrity and double-write prevention
- [ ] Convert all critical multi-table workflows to single DB transaction RPCs.
- [ ] Remove client-side multi-step fallback paths where atomic RPCs are available.
- [ ] Standardize idempotency keys for all create/verify/payment endpoints.
- [ ] Enforce DB unique constraints for idempotency key reuse detection on critical tables.
- [ ] Add compensation strategy for non-atomic legacy paths until migrated.

## 2) High Priority Improvements (P1)

### Architecture and layering
- [ ] Enforce architecture rule: UI components must not write directly to DB.
- [ ] Route all writes through module service layer, then repository layer.
- [ ] Centralize business invariants (billing gate, NHIS gate, queue transitions) in domain services.
- [ ] Create command handlers for high-risk actions (verify payment, approve referral, release service).
- [ ] Add anti-corruption layer around external integrations and RPC contracts.
- [ ] Define module boundary contracts and ban cross-module table writes from components.

### Identifier and schema consistency
- [ ] Standardize canonical relational keys to UUIDs across all workflow tables.
- [ ] Demote display IDs (visit_id, patient_id text) to non-relational presentation fields.
- [ ] Add compatibility views/mappers for legacy string-ID paths during migration.
- [ ] Audit and fix mixed-type join conditions in all module APIs.

### Reliability and concurrency
- [ ] Expand optimistic locking use to all high-contention update paths.
- [ ] Adopt version checks for queue status transitions and billing state changes.
- [ ] Add conflict-resolution UX for optimistic lock failures in critical modules.
- [ ] Introduce retry policies with bounded backoff for transient failures.
- [ ] Implement dead-letter strategy for failed background operations.

### Resilience patterns adoption
- [ ] Integrate circuit breaker execute wrappers into all external/DB heavy operations.
- [ ] Turn cache invalidation bootstrap on at app startup and verify teardown on logout.
- [ ] Add stale-while-revalidate for low-risk read models.
- [ ] Add graceful degradation behavior for service outages per module.

## 3) Performance and Scalability (P1/P2)

### Query and API efficiency
- [ ] Profile top 20 slowest queries by module and add missing indexes where needed.
- [ ] Reduce client chatty write patterns by batching and RPC composition.
- [ ] Add pagination and projection-only selects on all large lists.
- [ ] Add query budgets (max rows, timeout, retries) for dashboard endpoints.
- [ ] Introduce load/perf test baselines for billing, queue, lab, and radiology flows.

### Async processing and workload offloading
- [ ] Introduce worker pipeline for long-running jobs (claims, AI embedding, notifications).
- [ ] Move AI enrichment and heavy report generation off the UI request path.
- [ ] Add job status tracking, retries, and idempotent reprocessing.
- [ ] Add queue depth and processing lag metrics.

### Multi-facility growth readiness
- [ ] Formalize tenancy model (single shared, row-tenant, or per-facility stack).
- [ ] Enforce facility scoping in all queries and policies.
- [ ] Validate cross-facility data isolation with automated tests.

## 4) AI Integration Hardening (P1)

### Safety, latency, and cost controls
- [ ] Add strict request validation for all AI IPC handlers.
- [ ] Introduce token budget controls by role/module/query type.
- [ ] Add structured fallback responses for model outages and timeout scenarios.
- [ ] Cache reusable patient context slices with deterministic invalidation.
- [ ] Split synchronous vs asynchronous AI operations by workflow criticality.

### AI audit and compliance
- [ ] Make AI audit logging durable with retry queue (not best-effort only).
- [ ] Add reconciliation job for missing AI audit records.
- [ ] Track per-request model, tokens, latency, and error category.
- [ ] Add policy checks for PHI redaction in logs and telemetry.

## 5) Security and Compliance Program (P1)

### Authentication, authorization, and session hardening
- [ ] Enforce role-to-permission checks server-side for sensitive operations.
- [ ] Validate role claims against DB state on privileged actions.
- [ ] Add session hardening controls (idle timeout, device/session revocation).
- [ ] Add step-up auth for exceptionally sensitive actions (overrides, reversals).

### Sensitive data protection
- [ ] Classify PHI/PII fields and define handling policy per data class.
- [ ] Implement encryption-at-rest verification and key-management controls.
- [ ] Ensure transport security for all server connections and integration paths.
- [ ] Add secure local storage policy for desktop-side cached sensitive data.

### Security testing and governance
- [ ] Add threat model for renderer compromise and IPC abuse.
- [ ] Add static checks for hardcoded secrets and unsafe IPC patterns.
- [ ] Add dependency vulnerability scanning and patch cadence policy.
- [ ] Add incident response playbook for data exposure and service compromise.

## 6) Database and Data Quality (P1/P2)

### Integrity and correctness
- [ ] Complete FK/index audit for high-write and high-join columns.
- [ ] Add check constraints for impossible state transitions.
- [ ] Add immutable audit tables for clinical and billing critical actions.
- [ ] Add referential integrity tests for all encounter-linked records.

### Migration safety
- [ ] Create migration quality gate: forward/backward safety, rollback scripts.
- [ ] Split legacy or experimental migration files from production migration path.
- [ ] Add migration smoke tests on staging clones before release.
- [ ] Add schema drift detection between environments.

## 7) Observability and Operations (P1/P2)

### Logs, metrics, and traces
- [ ] Add end-to-end trace IDs from UI action to DB RPC to external APIs.
- [ ] Standardize structured logging with redaction rules.
- [ ] Add service-level dashboards (latency, errors, saturation) per module.
- [ ] Add data-quality dashboards (orphan rows, failed transitions, stale statuses).

### SLOs and reliability engineering
- [ ] Define SLOs for critical workflows (billing verify, medication dispense, results publish).
- [ ] Define error budgets and escalation policy.
- [ ] Add synthetic checks for key business flows.
- [ ] Add runbooks for top operational incidents.

## 8) Testing and Quality Engineering (P1)

### Automated test coverage
- [ ] Build unit tests for service/domain layers in each core module.
- [ ] Add integration tests for RPC-backed transactional workflows.
- [ ] Add E2E tests for payment gating and NHIS approval routing.
- [ ] Add concurrency tests for queue transitions and billing verification.
- [ ] Add contract tests for IPC handlers and payload schemas.

### CI/CD gates
- [ ] Add architecture lint rules to block direct DB writes from UI components.
- [ ] Add policy/security lint checks for RLS and secrets.
- [ ] Add performance regression checks for critical API paths.
- [ ] Fail CI on missing migration safety checks and policy regressions.

## 9) Developer Experience and Standards (P2)

- [ ] Publish architecture decision records for trust boundaries and module contracts.
- [ ] Add coding standard for service-layer-only writes.
- [ ] Add playbook for adding new module APIs and DB migrations safely.
- [ ] Add documentation for failure modes and conflict handling patterns.
- [ ] Introduce typed shared error model across modules.

## 10) Suggested Execution Sequence

### Phase A (Immediate)
- [ ] Complete P0 security boundary and RLS hardening.
- [ ] Migrate top 5 critical workflows to atomic RPC transactions.
- [ ] Remove renderer service-role usage fully.

### Phase B (Stabilization)
- [ ] Enforce layering and architecture guardrails in CI.
- [ ] Add observability baseline and top-flow E2E tests.
- [ ] Introduce async workers for heavy/background jobs.

### Phase C (Scale)
- [ ] Finalize tenancy/facility isolation strategy.
- [ ] Expand reliability tests and chaos/concurrency drills.
- [ ] Implement full SLO/error-budget operations model.
