# NDC Medical Centre EMR - Complete Workflow Reference

## 📋 Document Overview

This document serves as the authoritative reference for all clinical and administrative workflows in the NDC Medical Centre EMR system. Each workflow defines strict state transitions, role permissions, and business rules that must be enforced by the system.

---

## 🔄 Queue Workflow (Nursing → Doctor)

The queue system manages patient flow from nursing assessment to doctor consultation.

### Priority Hierarchy

```
┌─────────────────────────────────────────────┐
│              PRIORITY LEVELS                │
├─────────────────────────────────────────────┤
│                                             │
│   🔴 EMERGENCY    ←── Highest Priority      │
│         ↑                                   │
│   🟠 URGENT                                 │
│         ↑                                   │
│   🟢 NORMAL       ←── Default Priority      │
│                                             │
└─────────────────────────────────────────────┘
```

| Priority | Color | Description | Wait Time Target |
|----------|-------|-------------|------------------|
| EMERGENCY | Red | Life-threatening conditions | Immediate |
| URGENT | Orange | Serious but stable | < 30 minutes |
| NORMAL | Green | Routine consultations | Queue order |

### Queue State Transitions

```
                    ┌──────────────┐
                    │   WAITING    │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐  ┌────────────────┐  ┌───────────┐
    │ SKIPPED  │  │ READY FOR      │  │ CANCELLED │
    └──────────┘  │ CONSULTATION   │  └───────────┘
                  └───────┬────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │ IN CONSULTATION│
                  └───────┬────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │   COMPLETED    │
                  └────────────────┘
```

### State Definitions

| State | Description | Triggered By |
|-------|-------------|--------------|
| `WAITING` | Patient queued after vitals/triage | Nurse |
| `READY_FOR_CONSULTATION` | Patient called, waiting for doctor | System/Nurse |
| `IN_CONSULTATION` | Doctor actively seeing patient | Doctor |
| `COMPLETED` | Consultation finished | Doctor |
| `SKIPPED` | Patient not present when called | Nurse/Doctor |
| `CANCELLED` | Removed from queue | Nurse/Admin |

### Business Rules

1. **Priority Override**: Emergency patients always jump to front of queue
2. **Re-queue**: Skipped patients can be re-queued at nurse discretion
3. **Time Tracking**: System logs wait time at each state transition
4. **Notification**: Doctor notified when patient is `READY_FOR_CONSULTATION`

---

## 👨‍⚕️ Doctor Consultation Workflow

Strict sequential workflow ensuring complete clinical documentation.

### Consultation Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    DOCTOR CONSULTATION FLOW                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌──────────────────┐                                            │
│   │  PATIENT CALLED  │  ← Doctor initiates consultation           │
│   └────────┬─────────┘                                            │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                            │
│   │COMPLAINTS ENTERED│  ← Chief complaint, HPI                    │
│   └────────┬─────────┘                                            │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                            │
│   │CLINICAL NOTES    │  ← Physical exam, observations             │
│   │    ENTERED       │                                            │
│   └────────┬─────────┘                                            │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                            │
│   │DIAGNOSIS         │  ← ICD-10 codes, differential              │
│   │  CONFIRMED       │                                            │
│   └────────┬─────────┘                                            │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                            │
│   │TREATMENT PLAN    │  ← Care instructions, follow-up            │
│   │   CREATED        │                                            │
│   └────────┬─────────┘                                            │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                            │
│   │ ORDERS PLACED    │  ← Lab / Radiology / Prescription / Surgery│
│   └──────────────────┘                                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Visibility Matrix (Access Control)

| Data Element | Doctor | Nurse | Lab | Pharmacy | Cashier |
|--------------|--------|-------|-----|----------|---------|
| Complaints | ✅ Read/Write | ❌ | ❌ | ❌ | ❌ |
| Clinical Notes | ✅ Read/Write | ❌ | ❌ | ❌ | ❌ |
| Diagnosis | ✅ Read/Write | ❌ | ❌ | ❌ | ❌ |
| Treatment Plan | ✅ Read/Write | ✅ Read | ❌ | ❌ | ❌ |
| Orders | ✅ Read/Write | ✅ Read | ✅ Own Orders | ✅ Own Orders | ❌ |

### Business Rules

1. **Sequential Enforcement**: Cannot place orders without diagnosis
2. **Doctor-Only Access**: Clinical notes and diagnosis are strictly doctor-visible
3. **Audit Trail**: Every field change is logged with timestamp and user
4. **Co-signature**: Some actions may require senior doctor approval

---

## 📋 Treatment Plan Workflow (Doctor → Nurse)

Treatment plans bridge doctor orders to nursing execution.

### Treatment Plan Flow

```
┌─────────────────────────────────────────────────────────┐
│               TREATMENT PLAN WORKFLOW                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────┐                              │
│   │   CREATED (Doctor)  │  ← Doctor writes plan        │
│   └──────────┬──────────┘                              │
│              │                                          │
│              ▼                                          │
│   ┌─────────────────────┐                              │
│   │   VIEWED (Nurse)    │  ← Nurse acknowledges        │
│   └──────────┬──────────┘                              │
│              │                                          │
│              ▼                                          │
│   ┌─────────────────────┐                              │
│   │   TASKS EXECUTED    │  ← Individual tasks done     │
│   └──────────┬──────────┘                              │
│              │                                          │
│              ▼                                          │
│   ┌─────────────────────┐                              │
│   │     COMPLETED       │  ← All tasks finished        │
│   └─────────────────────┘                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Nurse Actions

| Action Type | Description | Documentation Required |
|-------------|-------------|----------------------|
| Administer Medication | Give prescribed drugs | Time, dose, route, response |
| Monitor Vitals | Record vital signs | All vitals with time |
| Carry Out Procedures | Wound care, injections, etc. | Procedure notes |
| Document Completion | Mark task as done | Signature, timestamp |

### Business Rules

1. **Read-Only for Nurses**: Nurses cannot modify treatment plan, only execute
2. **Task Tracking**: Each task has its own status and completion time
3. **Escalation**: Nurse can flag concerns back to doctor
4. **Partial Completion**: Plan can be partially complete with documented reasons

---

## 🧪 Laboratory Workflow

Complete test request lifecycle from order to result review.

### Lab Request Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     LABORATORY WORKFLOW                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────┐                                                  │
│   │  REQUESTED  │  ← Doctor initiates (ONLY doctors)               │
│   └──────┬──────┘                                                  │
│          │                                                         │
│          ├──────────────────────┐                                  │
│          ▼                      ▼                                  │
│   ┌─────────────┐        ┌─────────────┐                          │
│   │  ACCEPTED   │        │  REJECTED   │  ← Lab reviews request   │
│   └──────┬──────┘        └─────────────┘                          │
│          │                                                         │
│          ▼                                                         │
│   ┌─────────────────┐                                              │
│   │AWAITING PAYMENT │                                              │
│   └──────┬──────────┘                                              │
│          │                                                         │
│          ├──────────────────────┐                                  │
│          ▼                      ▼                                  │
│   ┌──────────┐           ┌───────────┐                            │
│   │   PAID   │           │ CANCELLED │  ← Payment not received    │
│   └────┬─────┘           └───────────┘                            │
│        │                                                           │
│        ├─────────┐                                                 │
│        ▼         ▼                                                 │
│   ┌──────────┐  ┌──────────┐                                      │
│   │   PAID   │  │  WAIVED  │  ← NHIS/DHML coverage                │
│   └────┬─────┘  └────┬─────┘                                      │
│        └──────┬──────┘                                             │
│               ▼                                                    │
│   ┌──────────────────┐                                             │
│   │ SAMPLE COLLECTED │  ← Phlebotomy/specimen collection          │
│   └────────┬─────────┘                                             │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                             │
│   │   PROCESSING     │  ← Lab running tests                       │
│   └────────┬─────────┘                                             │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                             │
│   │  RESULT READY    │  ← Results entered by lab tech             │
│   └────────┬─────────┘                                             │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                             │
│   │ RESULT VIEWED    │  ← Doctor reviews results                  │
│   │    (Doctor)      │                                             │
│   └──────────────────┘                                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | Owner | Description |
|--------|-------|-------------|
| `REQUESTED` | Doctor | Test ordered |
| `ACCEPTED` | Lab | Lab confirms can perform test |
| `REJECTED` | Lab | Lab cannot perform (reason required) |
| `AWAITING_PAYMENT` | Cashier | Waiting for payment |
| `PAID` | Cashier | Payment received |
| `WAIVED` | Cashier/NHIS | Covered by insurance |
| `CANCELLED` | Any | Request cancelled |
| `SAMPLE_COLLECTED` | Lab | Specimen obtained |
| `PROCESSING` | Lab | Analysis in progress |
| `RESULT_READY` | Lab | Results available |
| `RESULT_VIEWED` | Doctor | Doctor has seen results |

### Business Rules

1. **Doctor-Only Initiation**: Only doctors can request lab tests
2. **Payment Gate**: No sample collection before payment/waiver
3. **Critical Results**: Abnormal results trigger immediate notification
4. **Result Lock**: Results cannot be modified after `RESULT_VIEWED`

---

## 📡 Radiology Workflow

Imaging request lifecycle from order to report review.

### Radiology Request Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     RADIOLOGY WORKFLOW                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────┐                                                  │
│   │  REQUESTED  │  ← Doctor initiates (ONLY doctors)               │
│   └──────┬──────┘                                                  │
│          │                                                         │
│          ├──────────────────────┐                                  │
│          ▼                      ▼                                  │
│   ┌─────────────┐        ┌─────────────┐                          │
│   │  ACCEPTED   │        │  REJECTED   │  ← Radiology reviews     │
│   └──────┬──────┘        └─────────────┘                          │
│          │                                                         │
│          ▼                                                         │
│   ┌─────────────────┐                                              │
│   │AWAITING PAYMENT │                                              │
│   └──────┬──────────┘                                              │
│          │                                                         │
│          ├─────────┬────────────┐                                  │
│          ▼         ▼            ▼                                  │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐                         │
│   │   PAID   │ │  WAIVED  │ │ CANCELLED │                         │
│   └────┬─────┘ └────┬─────┘ └───────────┘                         │
│        └──────┬─────┘                                              │
│               ▼                                                    │
│   ┌──────────────────┐                                             │
│   │    SCHEDULED     │  ← Appointment booked                      │
│   └────────┬─────────┘                                             │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                             │
│   │  SCAN COMPLETED  │  ← Imaging performed                       │
│   └────────┬─────────┘                                             │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                             │
│   │ REPORT UPLOADED  │  ← Radiologist interpretation              │
│   └────────┬─────────┘                                             │
│            │                                                       │
│            ▼                                                       │
│   ┌──────────────────┐                                             │
│   │  REPORT VIEWED   │  ← Doctor reviews report                   │
│   │    (Doctor)      │                                             │
│   └──────────────────┘                                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Radiology-Specific Rules

1. **Scheduling Required**: Unlike lab, radiology requires appointment slot
2. **Imaging Storage**: DICOM images stored separately, linked to report
3. **Radiologist Sign-off**: Report requires radiologist approval
4. **Contrast Tracking**: Special documentation for contrast studies

---

## 💊 Pharmacy / Prescription Workflow

Medication dispensing from prescription to patient receipt.

### Prescription Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     PHARMACY WORKFLOW                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────┐                                                  │
│   │  PRESCRIBED │  ← Doctor writes prescription (ONLY doctors)    │
│   └──────┬──────┘                                                  │
│          │                                                         │
│          ├──────────────────────┐                                  │
│          ▼                      ▼                                  │
│   ┌─────────────┐        ┌─────────────┐                          │
│   │  VERIFIED   │        │  CANCELLED  │  ← Pharmacist review     │
│   └──────┬──────┘        └─────────────┘                          │
│          │                                                         │
│          ▼                                                         │
│   ┌─────────────────┐                                              │
│   │AWAITING PAYMENT │                                              │
│   └──────┬──────────┘                                              │
│          │                                                         │
│          ├─────────┬────────────┐                                  │
│          ▼         ▼            ▼                                  │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐                         │
│   │   PAID   │ │  WAIVED  │ │ CANCELLED │                         │
│   └────┬─────┘ └────┬─────┘ └───────────┘                         │
│        └──────┬─────┘                                              │
│               ▼                                                    │
│   ┌──────────────────┐                                             │
│   │    DISPENSED     │  ← Medication given to patient             │
│   └──────────────────┘                                             │
│               │                                                    │
│               ▼ (if stock insufficient)                            │
│   ┌────────────────────┐                                           │
│   │PARTIALLY DISPENSED │  ← Some items given, others backordered  │
│   └────────────────────┘                                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Pharmacy-Specific Features

| Feature | Description |
|---------|-------------|
| Drug Interaction Check | System flags potential interactions |
| Allergy Alert | Warning if patient has documented allergies |
| Stock Validation | Real-time inventory check |
| Dosage Verification | Pharmacist confirms appropriate dose |
| Substitution | Generic alternatives if brand unavailable |

### Business Rules

1. **Doctor-Only Prescribing**: Only licensed doctors can prescribe
2. **Pharmacist Verification**: All prescriptions reviewed before dispensing
3. **Controlled Substances**: Additional documentation and approval
4. **Partial Dispensing**: Track backorders and notify when stock arrives

---

## 💰 Billing Workflow (Service-Based)

**Key Principle**: Billing is PER SERVICE, not per encounter.

### Billing Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                     BILLING WORKFLOW                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌────────────────────┐                                           │
│   │ SERVICE IDENTIFIED │  ← Lab/Radiology/Pharmacy/Consultation   │
│   └─────────┬──────────┘                                           │
│             │                                                      │
│             ▼                                                      │
│   ┌────────────────────┐                                           │
│   │ NHIS COVERAGE      │  ← Check insurance eligibility           │
│   │     CHECK          │                                           │
│   └─────────┬──────────┘                                           │
│             │                                                      │
│             ▼                                                      │
│   ┌────────────────────┐                                           │
│   │  BILL GENERATED    │  ← Calculate patient portion             │
│   └─────────┬──────────┘                                           │
│             │                                                      │
│             ▼                                                      │
│   ┌────────────────────┐                                           │
│   │ AWAITING PAYMENT   │                                           │
│   └─────────┬──────────┘                                           │
│             │                                                      │
│             ├─────────┬─────────┐                                  │
│             ▼         ▼         ▼                                  │
│   ┌──────────┐ ┌──────────┐ ┌───────────┐                         │
│   │   PAID   │ │  WAIVED  │ │ CANCELLED │                         │
│   └────┬─────┘ └────┬─────┘ └───────────┘                         │
│        └──────┬─────┘                                              │
│               ▼                                                    │
│   ┌────────────────────┐                                           │
│   │  RECEIPT ISSUED    │  ← Always issued, even for NHIS          │
│   └────────────────────┘                                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Payment Category Matrix

| Patient Type | Service Coverage | Patient Pays | Insurance Pays |
|--------------|------------------|--------------|----------------|
| **Private** | Any | 100% | 0% |
| **Military NHIS** | Covered | 0% | 100% (DHML) |
| **Military NHIS** | Not Covered | 100% | 0% |
| **Civilian NHIS** | Covered | 10% | 90% (NHIS) |
| **Civilian NHIS** | Not Covered | 100% | 0% |

### Receipt Rules

✅ **Receipt issued in ALL cases**, including:
- Full cash payment
- NHIS covered (0% patient payment)
- DHML covered (military)
- Waived services
- Partial payment

### Billing Business Rules

1. **Service-Level Billing**: Each service billed independently
2. **Pre-Service Validation**: Insurance eligibility checked before service
3. **Real-Time Claims**: NHIS claims submitted automatically
4. **Audit Trail**: Complete payment history maintained
5. **Refund Tracking**: Reversals and refunds documented

---

## 🔐 Role-Based State Control Summary

### Permission Matrix

| Role | Allowed Actions |
|------|-----------------|
| **Medical Records** | Register patients, Create encounters, Update demographics |
| **Nurse** | Record vitals, Manage queue, View treatment plans, Execute nursing tasks |
| **Doctor** | Consult, Diagnose, Prescribe, Order tests/scans, Create treatment plans |
| **Lab** | Accept/reject tests, Collect samples, Enter results, Upload reports |
| **Radiology** | Accept/reject scans, Schedule appointments, Upload reports |
| **Pharmacy** | Verify prescriptions, Dispense medications, Manage stock |
| **Cashier** | Generate bills, Process payments, Issue receipts |
| **NHIS Admin** | Setup coverage rules, Manage claims, Approve waivers |

### State Transition Permissions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STATE OWNERSHIP BY ROLE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MEDICAL RECORDS                                                            │
│  ├── registered                                                             │
│  └── file_created                                                           │
│                                                                             │
│  CASHIER                                                                    │
│  ├── awaiting_payment                                                       │
│  ├── payment_complete                                                       │
│  └── awaiting_nhis_verification                                             │
│                                                                             │
│  NURSE                                                                      │
│  ├── triage                                                                 │
│  ├── vitals_taken                                                           │
│  ├── queued_for_consultation                                                │
│  └── nursing_care                                                           │
│                                                                             │
│  DOCTOR                                                                     │
│  ├── in_consultation                                                        │
│  ├── consultation_complete                                                  │
│  ├── pending_lab                                                            │
│  ├── pending_radiology                                                      │
│  └── pending_pharmacy                                                       │
│                                                                             │
│  LAB                                                                        │
│  └── lab_processing → lab_results_ready                                     │
│                                                                             │
│  RADIOLOGY                                                                  │
│  └── radiology_scheduled → radiology_complete                               │
│                                                                             │
│  PHARMACY                                                                   │
│  └── pharmacy_dispensing → medications_dispensed                            │
│                                                                             │
│  SYSTEM                                                                     │
│  ├── encounter_active                                                       │
│  └── encounter_closed                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Patient Journey Example

```
TIME    ROLE              STATE                      ACTION
─────────────────────────────────────────────────────────────────────────────
08:00   Medical Records   registered                 Patient arrives, registered
08:05   Medical Records   file_created               File number assigned
08:10   Cashier           awaiting_payment           Consultation fee required
08:15   Cashier           payment_complete           Payment received
08:20   Nurse             triage                     Initial assessment
08:30   Nurse             vitals_taken               BP, Temp, etc recorded
08:35   Nurse             queued_for_consultation    Added to doctor's queue
09:00   Doctor            in_consultation            Doctor calls patient
09:30   Doctor            pending_lab                Lab tests ordered
09:35   Cashier           awaiting_payment           Lab payment required
09:40   Cashier           payment_complete           Lab fee paid
09:45   Lab               lab_processing             Sample collected
10:30   Lab               lab_results_ready          Results uploaded
10:35   Doctor            consultation_complete      Doctor reviews, prescribes
10:40   Cashier           awaiting_payment           Pharmacy payment
10:45   Cashier           payment_complete           Medication paid
10:50   Pharmacy          medications_dispensed      Drugs given to patient
11:00   System            encounter_closed           Encounter complete
```

---

## ⚠️ Error States and Recovery

| Error State | Cause | Recovery Action |
|-------------|-------|-----------------|
| `STUCK_IN_QUEUE` | Patient not called for > 2 hours | Nurse reviews, re-prioritizes |
| `PAYMENT_TIMEOUT` | No payment within 24 hours | Auto-cancel order, notify |
| `SAMPLE_REJECTED` | Lab cannot process sample | Re-collection required |
| `STOCK_OUT` | Medication unavailable | Partial dispense or alternative |
| `EQUIPMENT_DOWN` | Radiology machine offline | Reschedule appointment |

---

## 📊 Workflow Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Average Wait Time (Queue) | < 30 min | > 60 min |
| Lab TAT (Order to Result) | < 4 hours | > 8 hours |
| Radiology TAT | < 24 hours | > 48 hours |
| Pharmacy Dispense Time | < 15 min | > 30 min |
| Encounter Completion Rate | > 95% | < 90% |
| Payment Collection Rate | > 98% | < 95% |

---

## ✅ Implementation Status

### Database Migration
| Component | Status | File |
|-----------|--------|------|
| Queue priority enum | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Queue new status values | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Consultation state enum | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Treatment plans table | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Treatment tasks table | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Lab workflow states | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Radiology workflow states | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Pharmacy workflow states | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Billing rules table | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| State transition permissions | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |
| Database functions | ✅ Done | `migrations/033_complete_workflow_implementation.sql` |

### Queue System
| Component | Status | File |
|-----------|--------|------|
| Queue DTOs (priority, new states) | ✅ Done | `src/renderer/modules/queue/dtos/queue.dto.ts` |
| Queue API (skip, requeue, stats) | ✅ Done | `src/renderer/modules/queue/api/queue.api.ts` |
| Priority helpers | ✅ Done | `src/renderer/modules/queue/dtos/queue.dto.ts` |

### Consultation Workflow
| Component | Status | File |
|-----------|--------|------|
| Consultation states enum | ✅ Done | `src/renderer/modules/clinical-consultation/dtos/consultation.dto.ts` |
| State progression helpers | ✅ Done | `src/renderer/modules/clinical-consultation/dtos/consultation.dto.ts` |
| Visibility matrix | ✅ Done | `src/renderer/modules/clinical-consultation/dtos/consultation.dto.ts` |

### Treatment Plan System
| Component | Status | File |
|-----------|--------|------|
| Treatment plan DTOs | ✅ Done | `src/renderer/modules/treatment-plan/dtos/treatment-plan.dto.ts` |
| Treatment task DTOs | ✅ Done | `src/renderer/modules/treatment-plan/dtos/treatment-plan.dto.ts` |
| Treatment plan API | ✅ Done | `src/renderer/modules/treatment-plan/api/treatment-plan.api.ts` |
| Task execution helpers | ✅ Done | `src/renderer/modules/treatment-plan/api/treatment-plan.api.ts` |

### Lab/Radiology/Pharmacy
| Component | Status | File |
|-----------|--------|------|
| Lab workflow status enum | ✅ Done | `src/renderer/modules/lab/dtos/lab.dto.ts` |
| Lab stats interface | ✅ Done | `src/renderer/modules/lab/dtos/lab.dto.ts` |
| Status color helpers | ✅ Done | `src/renderer/modules/lab/dtos/lab.dto.ts` |

### Billing System
| Component | Status | File |
|-----------|--------|------|
| Coverage types | ✅ Done | `src/renderer/modules/billing/utils/coverage.utils.ts` |
| NHIS coverage rules | ✅ Done | `src/renderer/modules/billing/utils/coverage.utils.ts` |
| Coverage calculation | ✅ Done | `src/renderer/modules/billing/utils/coverage.utils.ts` |
| Receipt generation | ✅ Done | `src/renderer/modules/billing/utils/coverage.utils.ts` |

### Role-Based Permissions
| Component | Status | File |
|-----------|--------|------|
| Role hierarchy | ✅ Done | `src/renderer/lib/permissions/permissions.ts` |
| State transition permissions | ✅ Done | `src/renderer/lib/permissions/permissions.ts` |
| Field-level permissions | ✅ Done | `src/renderer/lib/permissions/permissions.ts` |
| Module access control | ✅ Done | `src/renderer/lib/permissions/permissions.ts` |

### Remaining Work
| Task | Priority | Notes |
|------|----------|-------|
| Run migration 033 on database | High | Must be run before using new features |
| Update UI components to use new states | Medium | Queue, Lab, Pharmacy, Radiology pages |
| Add treatment plan UI | Medium | Doctor and Nurse views |
| Integration testing | High | Test all workflows end-to-end |
| Add real-time queue display | Low | WebSocket for queue updates |

---

## 📚 Related Documentation

- [Encounter-Centric Architecture](./ENCOUNTER_CENTRIC_ARCHITECTURE.md)
- [Billing Module PRD](./BILLING_MODULE_PRD.md)
- [EMR Integration Plan](./EMR_INTEGRATION_PLAN.md)
- [Workflow Types](../src/renderer/lib/workflow/types.ts)
- [Workflow API](../src/renderer/lib/workflow/api.ts)
- [Queue DTOs](../src/renderer/modules/queue/dtos/queue.dto.ts)
- [Treatment Plan Module](../src/renderer/modules/treatment-plan/index.ts)
- [Permissions Library](../src/renderer/lib/permissions/permissions.ts)
- [Coverage Utils](../src/renderer/modules/billing/utils/coverage.utils.ts)

---

*Document Version: 1.1*  
*Last Updated: December 22, 2025*  
*Maintained by: NDC EMR Development Team*
