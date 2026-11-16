# EMR Gap Integration Plan

## Executive Summary

This document outlines the comprehensive plan to address all identified gaps in the EMR system when compared against military teaching hospital requirements. The integration follows a phased approach to minimize disruption while maximizing clinical safety and operational efficiency.

---

## Gap Analysis Summary

### Critical Gaps (🔴 High Priority)

| Gap | Current State | Required State | Risk |
|-----|---------------|----------------|------|
| **Triage Scoring** | Basic vitals only | Full triage with ESI scoring + auto-routing | Clinical Safety |
| **Dynamic Departments** | Hard-coded enum (`queue_location_enum`) | Database-driven department/ward management | Scalability |
| **Notification System** | Not implemented | Real-time alerts for queue, results, payments | Operational Efficiency |

### Important Gaps (🟠 Medium Priority)

| Gap | Current State | Required State | Risk |
|-----|---------------|----------------|------|
| **Referral System** | Not implemented | Inter-department referrals with approval workflow | Patient Care Continuity |
| **Exception Logging** | Not implemented | Track all workflow overrides and bypasses | Audit Compliance |
| **Audit Viewer UI** | Tables exist, no UI | Dashboard to view audit trails | Governance |

### Enhancement Gaps (🟡 Low Priority)

| Gap | Current State | Required State | Risk |
|-----|---------------|----------------|------|
| **Unified Service Catalog** | 4 separate catalogs | Optional consolidation with category system | Maintenance |
| **Shift/Handover Management** | Not implemented | Staff shift tracking and handover notes | Operational |

---

## Integration Architecture

### New Database Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW SCHEMA ADDITIONS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  departments │───▶│    wards     │───▶│    beds      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              triage_assessments                       │      │
│  │  - ESI scoring (1-5)                                  │      │
│  │  - Chief complaint                                    │      │
│  │  - Vital signs snapshot                              │      │
│  │  - Auto-routing rules                                │      │
│  │  - Target department assignment                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                  notifications                        │      │
│  │  - User-targeted alerts                              │      │
│  │  - Role-based broadcasts                             │      │
│  │  - Read/unread tracking                              │      │
│  │  - Action links                                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                    referrals                          │      │
│  │  - Source/target department                          │      │
│  │  - Referring/receiving physician                     │      │
│  │  - Clinical notes                                    │      │
│  │  - Status workflow                                   │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │               workflow_exceptions                     │      │
│  │  - Override type                                     │      │
│  │  - Reason/justification                              │      │
│  │  - Authorizing user                                  │      │
│  │  - Original vs new state                             │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Module Integration Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING MODULES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │ Patient         │──── Add: Triage assessment link           │
│  │ Registration    │──── Add: Emergency flag                   │
│  └─────────────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Customer        │──── NEW: Triage module integration        │
│  │ Service         │──── Add: Priority queue based on ESI      │
│  └─────────────────┘──── Add: Department routing               │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Billing         │──── Add: Exception logging for overrides  │
│  │                 │──── Add: Notification on payment verified │
│  └─────────────────┘                                            │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Nursing         │──── Add: Triage form with scoring         │
│  │                 │──── Add: Department-specific queue view   │
│  └─────────────────┘──── Add: Notifications for new patients   │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Clinical        │──── Add: Referral creation                │
│  │ Consultation    │──── Add: View/accept referrals            │
│  └─────────────────┘──── Add: Department-based assignment      │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                            │
│  │ Lab/Radiology   │──── Add: Result notifications             │
│  │ Pharmacy        │──── Add: Department-aware queues          │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Schema (Week 1)
**Focus:** Create all new tables and relationships

**Deliverables:**
- [ ] Migration 015: departments, wards, beds tables
- [ ] Migration 016: triage_assessments table with scoring
- [ ] Migration 017: notifications table with RLS
- [ ] Migration 018: referrals table with workflow
- [ ] Migration 019: workflow_exceptions table
- [ ] Seed data for default departments

**Files Created:**
- `migrations/015_create_departments.sql`
- `migrations/016_create_triage.sql`
- `migrations/017_create_notifications.sql`
- `migrations/018_create_referrals.sql`
- `migrations/019_create_exceptions.sql`

---

### Phase 2: Department & Triage System (Week 2)
**Focus:** Dynamic department management and triage scoring

**Deliverables:**
- [ ] TypeScript types for departments, wards, triage
- [ ] API functions for CRUD operations
- [ ] Triage form component with ESI scoring
- [ ] Auto-routing logic based on triage level
- [ ] Department configuration UI in admin settings

**Files Created/Modified:**
- `src/renderer/types/departments.types.ts`
- `src/renderer/modules/configurations/api/departments.api.ts`
- `src/renderer/modules/configurations/components/DepartmentManager.tsx`
- `src/renderer/modules/nursing/components/TriageForm.tsx`
- `src/renderer/modules/nursing/hooks/useTriage.ts`

---

### Phase 3: Notification System (Week 3)
**Focus:** Real-time notifications across all modules

**Deliverables:**
- [ ] Notification service with Supabase Realtime
- [ ] Notification bell component with badge
- [ ] Notification dropdown/panel
- [ ] Notification preferences per user
- [ ] Integration points in all modules

**Files Created/Modified:**
- `src/renderer/lib/notifications/service.ts`
- `src/renderer/lib/notifications/hooks.ts`
- `src/renderer/components/ui/NotificationBell.tsx`
- `src/renderer/components/ui/NotificationPanel.tsx`
- Update: All existing modules to emit notifications

---

### Phase 4: Referral System (Week 4)
**Focus:** Inter-department referral workflow

**Deliverables:**
- [ ] Referral creation form in consultation module
- [ ] Pending referrals queue per department
- [ ] Referral acceptance/rejection workflow
- [ ] Referral tracking in patient journey
- [ ] Notification integration for referral status

**Files Created/Modified:**
- `src/renderer/modules/referrals/` (new module)
- `src/renderer/modules/clinical-consultation/components/ReferralForm.tsx`
- Update: PatientJourneyTracker to show referrals

---

### Phase 5: Exception Logging & Audit Viewer (Week 5)
**Focus:** Compliance and governance tools

**Deliverables:**
- [ ] Exception logging service
- [ ] Override reason modal component
- [ ] Audit trail viewer dashboard
- [ ] Exception report generation
- [ ] Integration in billing overrides, queue skips, etc.

**Files Created/Modified:**
- `src/renderer/lib/exceptions/service.ts`
- `src/renderer/components/workflow/OverrideModal.tsx`
- `src/renderer/modules/analytics/components/AuditViewer.tsx`
- `src/renderer/modules/analytics/components/ExceptionReport.tsx`

---

## ESI Triage Scoring System

### Emergency Severity Index (ESI) Levels

| Level | Name | Response Time | Routing | Examples |
|-------|------|---------------|---------|----------|
| **1** | Resuscitation | Immediate | Emergency/Resus | Cardiac arrest, severe trauma |
| **2** | Emergent | < 10 mins | Emergency | Chest pain, stroke symptoms |
| **3** | Urgent | < 30 mins | Urgent Care | Moderate pain, minor fractures |
| **4** | Less Urgent | < 60 mins | General Clinic | Minor infections, rashes |
| **5** | Non-Urgent | < 120 mins | Outpatient | Prescription refills, minor complaints |

### Triage Decision Tree

```
START
  │
  ├── Is patient dying or requires immediate life-saving intervention?
  │   └── YES → ESI Level 1 → RESUSCITATION BAY
  │
  ├── Is this a high-risk situation?
  │   └── YES → ESI Level 2 → EMERGENCY DEPARTMENT
  │
  ├── How many resources will this patient need?
  │   ├── Many (≥2 resources) → ESI Level 3 → URGENT CARE
  │   ├── One resource → ESI Level 4 → GENERAL CLINIC
  │   └── No resources → ESI Level 5 → OUTPATIENT
  │
  └── Consider vital signs as modifiers
      └── Abnormal vitals may upgrade ESI level
```

### Vital Signs Thresholds for ESI Modification

| Vital Sign | Critical (Upgrade to ESI 2) | Abnormal (Consider upgrade) |
|------------|-----------------------------|-----------------------------|
| Heart Rate | < 40 or > 150 bpm | < 50 or > 100 bpm |
| Respiratory Rate | < 8 or > 30/min | < 12 or > 20/min |
| SpO2 | < 90% | < 94% |
| Systolic BP | < 80 or > 200 mmHg | < 100 or > 160 mmHg |
| Temperature | < 35°C or > 40°C | < 36°C or > 38°C |
| GCS | < 14 | N/A |

---

## Notification Types

### System-Generated Notifications

| Event | Recipients | Priority | Action |
|-------|------------|----------|--------|
| New patient in queue | Department staff | Normal | View queue |
| Payment verified | Nursing staff | Normal | View patient |
| Lab results ready | Ordering physician | High | View results |
| Critical lab value | Physician + Nursing | Critical | Acknowledge |
| Prescription ready | Patient (via display) | Normal | Collect |
| Referral received | Target department | High | Accept/Reject |
| Referral accepted | Referring physician | Normal | View status |
| Queue wait time exceeded | Supervisor | High | Review queue |
| Billing override used | Admin | Normal | Audit log |

### Notification Preferences

Users can configure:
- Email notifications (future)
- In-app sound alerts
- Desktop notifications
- Notification grouping
- Quiet hours

---

## Referral Workflow

```
CONSULTATION MODULE                    TARGET DEPARTMENT
       │                                      │
       ▼                                      │
┌──────────────────┐                         │
│ Create Referral  │                         │
│ - Select dept    │                         │
│ - Add notes      │                         │
│ - Attach files   │                         │
└────────┬─────────┘                         │
         │                                    │
         ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐
│ Referral Created │────────────────▶│ Notification     │
│ Status: Pending  │                 │ "New referral    │
└────────┬─────────┘                 │  received"       │
         │                           └────────┬─────────┘
         │                                    │
         │                                    ▼
         │                           ┌──────────────────┐
         │                           │ Review Referral  │
         │                           │ - View history   │
         │                           │ - Accept/Reject  │
         │                           └────────┬─────────┘
         │                                    │
         │           ┌────────────────────────┼────────────────────────┐
         │           │                        │                        │
         ▼           ▼                        ▼                        ▼
┌──────────────────┐              ┌──────────────────┐    ┌──────────────────┐
│ Notify: Accepted │              │ Referral Accepted│    │ Referral Rejected│
│ Status: Accepted │◀─────────────│ Patient added to │    │ Notify physician │
└──────────────────┘              │ department queue │    │ with reason      │
                                  └──────────────────┘    └──────────────────┘
```

---

## Exception Logging Requirements

### Logged Events

| Exception Type | Trigger | Required Fields |
|----------------|---------|-----------------|
| `PAYMENT_OVERRIDE` | Bypass payment verification | Reason, authorizer, amount |
| `QUEUE_SKIP` | Move patient ahead in queue | Reason, original position |
| `PRIORITY_CHANGE` | Upgrade/downgrade priority | Reason, old/new priority |
| `TRIAGE_OVERRIDE` | Manual ESI level change | Reason, calculated vs assigned |
| `ACCESS_EXCEPTION` | Access patient outside assignment | Reason, relationship |
| `RESULT_AMENDMENT` | Modify finalized results | Reason, old/new value |

### Exception Log Entry Structure

```typescript
interface WorkflowException {
  id: string;
  exception_type: ExceptionType;
  entity_type: 'visit' | 'patient' | 'order' | 'result';
  entity_id: string;
  original_state: Record<string, any>;
  new_state: Record<string, any>;
  reason: string;
  authorized_by: string;  // User who performed the override
  approved_by?: string;   // Supervisor who approved (if required)
  created_at: Date;
  ip_address?: string;
  user_agent?: string;
}
```

---

## Testing Strategy

### Unit Tests
- Triage scoring algorithm
- ESI level calculation
- Notification filtering
- Permission checks

### Integration Tests
- Department routing flows
- Referral acceptance workflow
- Queue priority ordering
- Notification delivery

### E2E Tests
- Complete patient journey with triage
- Referral round-trip
- Override with exception logging

---

## Rollback Plan

Each phase includes rollback scripts:

1. **Schema Rollback:** `migrations/xxx_rollback.sql` for each migration
2. **Feature Flags:** All new features gated behind configuration
3. **Parallel Run:** Old enum-based routing remains functional during transition
4. **Data Migration:** Existing data preserved, new fields optional initially

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Patient routing accuracy | Manual | 95% auto-routed |
| Average triage time | N/A | < 5 minutes |
| Notification delivery | N/A | < 3 seconds |
| Referral acceptance time | N/A | < 30 minutes |
| Exception audit coverage | 0% | 100% |

---

## File Structure After Integration

```
src/renderer/
├── lib/
│   ├── workflow/           # Existing
│   ├── notifications/      # NEW
│   │   ├── service.ts
│   │   ├── hooks.ts
│   │   ├── types.ts
│   │   └── index.ts
│   └── exceptions/         # NEW
│       ├── service.ts
│       ├── hooks.ts
│       ├── types.ts
│       └── index.ts
├── modules/
│   ├── nursing/
│   │   ├── components/
│   │   │   ├── TriageForm.tsx       # NEW
│   │   │   └── TriageHistory.tsx    # NEW
│   │   └── hooks/
│   │       └── useTriage.ts         # NEW
│   ├── referrals/                   # NEW MODULE
│   │   ├── index.tsx
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── dtos/
│   └── configurations/
│       └── components/
│           ├── DepartmentManager.tsx    # NEW
│           └── NotificationSettings.tsx # NEW
└── components/
    └── ui/
        ├── NotificationBell.tsx     # NEW
        └── NotificationPanel.tsx    # NEW
```

---

## Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Database Schema | All migrations, seed data |
| 2 | Departments + Triage | Dynamic departments, ESI scoring |
| 3 | Notifications | Real-time alerts, UI components |
| 4 | Referrals | Complete referral workflow |
| 5 | Exceptions + Audit | Override logging, audit viewer |

---

## Next Steps

1. Review and approve this plan
2. Run database migrations (Phase 1)
3. Begin department/triage implementation (Phase 2)
4. Iterate based on testing feedback

---

*Document Version: 1.0*
*Created: December 20, 2025*
*Author: EMR Integration Team*
