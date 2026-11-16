# NDC Medical Centre EMR - Surgery/Theatre & Hygiene/Infection Control Modules
## Product Requirements Document (PRD) v1.0

---

**Version:** 1.0  
**Date:** February 3, 2026  
**Author:** EMR Development Team  
**Status:** Draft for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Principles](#2-design-principles)
3. [Module 1: Surgery / Theatre Module](#3-module-1-surgery--theatre-module)
4. [Module 2: Hygiene & Infection Control Module](#4-module-2-hygiene--infection-control-module)
5. [Database Schema Design](#5-database-schema-design)
6. [Role-Permission Matrix](#6-role-permission-matrix)
7. [Cross-Module Integration](#7-cross-module-integration)
8. [Validation Rules & Edge Cases](#8-validation-rules--edge-cases)
9. [Workflow Diagrams](#9-workflow-diagrams)
10. [Reporting & Analytics](#10-reporting--analytics)
11. [UI/UX Requirements](#11-uiux-requirements)
12. [Implementation Plan](#12-implementation-plan)

---

## 1. Executive Summary

### 1.1 Purpose

This document defines the requirements for two new modules in the NDC Medical Centre EMR system:

| Module | Purpose |
|--------|---------|
| **Surgery/Theatre** | Manages major operative interventions in the operating theatre with full pre-op, intra-op, and post-op workflow tracking |
| **Hygiene/Infection Control** | Documents patient hygiene activities, infection prevention, and nursing care activities for inpatient encounters |

### 1.2 Scope

Both modules:
- Are **encounter-centric** (all records MUST reference an active encounter)
- Integrate with existing NHIS/HMO workflows
- Support role-based access control
- Maintain full audit trails for medico-legal compliance
- Connect to billing, nursing, pharmacy, and admission workflows

### 1.3 Relationship to Existing Modules

| Existing Module | Integration Point |
|----------------|-------------------|
| **Consultations** | Surgery requests originate from consultation clinical_requests |
| **Admissions** | Surgical patients are typically admitted; hygiene records link to admission |
| **Nursing** | Pre-op/post-op nursing care; hygiene activities by nurses |
| **Procedures** | Minor procedures use existing `procedures` table; major surgeries use new `surgeries` table |
| **NHIS/Billing** | Surgery requires pre-authorization; auto-billing on completion |
| **Pharmacy/Inventory** | Consumables and implants tracking |

### 1.4 Key Existing Tables We'll Leverage

```
- visits (encounter_id reference)
- admissions (admission context)
- patients (patient demographics)
- staff (care team)
- procedure_catalogue (procedure definitions)
- clinical_requests (surgery request workflow)
- nhis_approvals (NHIS authorization)
- nursing_notes (nursing documentation)
- nursing_interventions (intervention tracking)
- inventory_items (consumables tracking)
- billing_orders (auto-billing)
```

---

## 2. Design Principles

### 2.1 Encounter-Centric Architecture (NON-NEGOTIABLE)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENCOUNTER (visits)                        │
│  - Every surgery MUST reference encounter_id                    │
│  - Every hygiene record MUST reference encounter_id             │
│  - No free-floating clinical records                            │
│  - Encounter status gates clinical actions                      │
└─────────────────────────────────────────────────────────────────┘
```

**Enforcement Rules:**
- Surgery cannot start if encounter is `Closed` or `Cancelled`
- Hygiene records cannot be created for closed encounters
- All queries filter by encounter for patient safety

### 2.2 Role-Based Workflow Access

| Role | Surgery Module Access | Hygiene Module Access |
|------|----------------------|----------------------|
| **Surgeon** | Full surgical documentation | View only |
| **Anesthetist** | Anesthesia records only | View only |
| **Theatre Nurse** | Pre-op checklist, consumables | Full access |
| **Ward Nurse** | View surgical history | Full CRUD |
| **Infection Control Officer** | View all, audit reports | Full CRUD + Reports |
| **NHIS Desk** | Approval workflow | View only |
| **Superadmin** | Full access | Full access |

### 2.3 Audit-Ready Design

All tables include:
- `created_at`, `updated_at` timestamps
- `created_by`, `updated_by` staff references
- Immutable records after sign-off
- Legal defensibility with version tracking

### 2.4 NHIS/HMO Awareness

Surgery module specifically handles:
- Pre-authorization requirements
- Authorization codes and expiry dates
- Service classification for billing
- Capitation vs fee-for-service logic

---

## 3. Module 1: Surgery / Theatre Module

### 3.1 Overview

The Surgery/Theatre module manages **major operative interventions** requiring:
- Operating theatre environment
- Anesthesia (local, regional, or general)
- Sterile environment
- Multi-disciplinary surgical team
- Extended recovery period

> **Note:** Minor bedside procedures continue to use the existing `procedures` table. This module is specifically for theatre-based surgeries.

### 3.2 Workflow Phases

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SURGERY WORKFLOW PHASES                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   REQUEST   │───▶│   PRE-OP    │───▶│  INTRA-OP   │───▶│   POST-OP   │   │
│  │   PHASE     │    │   PHASE     │    │   PHASE     │    │   PHASE     │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘   │
│        │                  │                  │                  │           │
│        ▼                  ▼                  ▼                  ▼           │
│  • Clinical request   • Consent         • Theatre entry    • Recovery      │
│  • NHIS approval      • Pre-op assess   • Team assignment  • Post-op Dx    │
│  • Scheduling         • Checklist       • Anesthesia       • Complications │
│  • Theatre booking    • Lab results     • Procedure        • Ward transfer │
│                       • Site marking    • Findings         • Sign-off      │
│                                         • Complications                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Phase 1: Request Phase

**Trigger:** Surgeon creates surgery request via `clinical_requests` table

**Required Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| encounter_id | UUID | ✅ | Active encounter |
| patient_id | UUID | ✅ | Patient reference |
| requesting_doctor_id | UUID | ✅ | Requesting surgeon |
| request_type | ENUM | ✅ | 'Surgery' |
| procedure_catalogue_id | UUID | ✅ | Procedure from catalogue |
| procedure_name | VARCHAR | ✅ | Surgery name |
| clinical_reason | TEXT | ✅ | Surgical indication |
| urgency | ENUM | ✅ | Emergency/Urgent/Routine |
| pre_op_requirements | TEXT | ⬜ | Pre-operative prep needed |
| nhis_requires_approval | BOOLEAN | Auto | Based on patient insurance |

**NHIS Workflow:**
```
IF patient.insurance_type IN ('DHML', 'Civilian_NHIS') THEN
  IF procedure.requires_nhis_approval = TRUE THEN
    → Create nhis_approvals record
    → Block surgery until approved
    → Store authorization_code on approval
  END IF
END IF
```

### 3.4 Phase 2: Pre-Operative Phase

**Pre-Op Assessment Record:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| surgery_id | UUID | ✅ | Parent surgery |
| assessment_date | TIMESTAMPTZ | ✅ | When assessed |
| assessed_by | UUID | ✅ | Assessing doctor |
| asa_classification | ENUM | ✅ | ASA I-VI |
| airway_assessment | JSONB | ✅ | Mallampati, neck mobility |
| cardiac_risk | TEXT | ⬜ | Cardiac considerations |
| pulmonary_risk | TEXT | ⬜ | Respiratory considerations |
| allergies_verified | BOOLEAN | ✅ | Confirmed allergies |
| medications_reviewed | BOOLEAN | ✅ | Current meds reviewed |
| fasting_status | TEXT | ✅ | NPO compliance |
| consent_obtained | BOOLEAN | ✅ | Consent documented |
| consent_type | ENUM | ✅ | Written/Verbal/Emergency |
| consent_document_url | TEXT | ⬜ | Scanned consent |
| blood_products_ordered | BOOLEAN | ⬜ | Blood ready |
| investigations_reviewed | JSONB | ⬜ | Lab/imaging results |
| fit_for_surgery | BOOLEAN | ✅ | Final clearance |
| clearance_notes | TEXT | ⬜ | Any concerns |

**Pre-Op Checklist (WHO Safe Surgery):**
```json
{
  "sign_in": {
    "patient_identity_confirmed": false,
    "site_marked": false,
    "consent_form_complete": false,
    "allergies_known": false,
    "airway_assessed": false,
    "blood_loss_risk_assessed": false,
    "iv_access_established": false
  },
  "time_out": {
    "team_members_introduced": false,
    "patient_name_confirmed": false,
    "procedure_confirmed": false,
    "site_confirmed": false,
    "antibiotic_prophylaxis_given": false,
    "imaging_displayed": false
  },
  "sign_out": {
    "procedure_name_confirmed": false,
    "instrument_count_correct": false,
    "specimen_labeled": false,
    "equipment_problems_documented": false,
    "recovery_concerns_addressed": false
  }
}
```

**Consent Requirements:**
- Digital consent capture with patient/witness signatures
- Printable consent form generation
- Emergency consent pathway (2 doctors sign)
- Consent cannot be bypassed except for emergencies

### 3.5 Phase 3: Intra-Operative Phase

**Surgical Record:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| surgery_id | UUID | ✅ | Primary key |
| theatre_room | VARCHAR | ✅ | Operating room |
| theatre_entry_time | TIMESTAMPTZ | ✅ | Patient enters theatre |
| anesthesia_start_time | TIMESTAMPTZ | ✅ | Anesthesia induction |
| incision_time | TIMESTAMPTZ | ✅ | First incision |
| closure_time | TIMESTAMPTZ | ⬜ | Wound closure complete |
| anesthesia_end_time | TIMESTAMPTZ | ⬜ | Anesthesia reversal |
| theatre_exit_time | TIMESTAMPTZ | ⬜ | Patient leaves theatre |

**Surgical Team Assignment:**
```json
{
  "primary_surgeon_id": "uuid",
  "assistant_surgeons": ["uuid", "uuid"],
  "anesthetist_id": "uuid",
  "anesthesia_nurse_id": "uuid",
  "scrub_nurse_id": "uuid",
  "circulating_nurse_id": "uuid",
  "other_staff": [
    {"staff_id": "uuid", "role": "Perfusionist"}
  ]
}
```

**Anesthesia Record:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| anesthesia_type | ENUM | ✅ | General/Regional/Local/Sedation |
| anesthesia_technique | TEXT | ⬜ | Specific technique |
| airway_management | ENUM | ⬜ | ETT/LMA/Mask/Other |
| induction_agents | JSONB | ✅ | Drugs used |
| maintenance_agents | JSONB | ⬜ | Ongoing agents |
| reversal_agents | JSONB | ⬜ | Reversal drugs |
| vital_signs_log | JSONB | ⬜ | Periodic vitals |
| fluids_given | JSONB | ⬜ | IV fluids |
| complications | TEXT | ⬜ | Anesthesia issues |

**Operative Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| primary_procedure | VARCHAR | ✅ | Main procedure |
| secondary_procedures | JSONB | ⬜ | Additional procedures |
| laterality | ENUM | ✅ | Left/Right/Bilateral/NA |
| position | VARCHAR | ⬜ | Patient position |
| skin_prep | VARCHAR | ⬜ | Prep solution |
| draping | TEXT | ⬜ | Draping details |
| approach | TEXT | ⬜ | Surgical approach |
| incision | TEXT | ⬜ | Incision type/location |
| findings | TEXT | ✅ | Intra-op findings |
| procedure_details | TEXT | ✅ | Step-by-step narrative |
| specimens_collected | JSONB | ⬜ | Specimens for pathology |
| implants_used | JSONB | ⬜ | Implants/devices |
| estimated_blood_loss_ml | INTEGER | ✅ | Blood loss in mL |
| blood_products_given | JSONB | ⬜ | Transfusions |
| drain_placed | BOOLEAN | ⬜ | Drains inserted |
| drain_details | TEXT | ⬜ | Drain type/location |
| closure_technique | TEXT | ⬜ | Wound closure method |
| complications | TEXT | ⬜ | Intra-op complications |
| wound_classification | ENUM | ✅ | Clean/Clean-Contaminated/Contaminated/Dirty |

### 3.6 Phase 4: Post-Operative Phase

**Recovery Record:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recovery_start_time | TIMESTAMPTZ | ✅ | Enters recovery |
| recovery_end_time | TIMESTAMPTZ | ⬜ | Leaves recovery |
| pacu_nurse_id | UUID | ✅ | PACU nurse |
| aldrete_score_initial | INTEGER | ✅ | Initial Aldrete (0-10) |
| aldrete_score_discharge | INTEGER | ⬜ | Discharge Aldrete |
| recovery_vitals | JSONB | ✅ | Post-op vitals log |
| pain_score | INTEGER | ✅ | Pain level 0-10 |
| nausea_vomiting | BOOLEAN | ⬜ | PONV present |
| recovery_complications | TEXT | ⬜ | Recovery issues |
| disposition | ENUM | ✅ | Ward/ICU/Discharge/Morgue |
| transfer_ward_id | UUID | ⬜ | Destination ward |

**Post-Op Orders:**
- Links to `prescriptions` for post-op medications
- Links to `lab_requests` for post-op labs
- Links to `treatment_plans` for nursing care

**Post-Op Diagnosis:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| post_op_diagnosis | TEXT | ✅ | Final diagnosis |
| post_op_icd10_codes | JSONB | ⬜ | ICD-10 codes |
| pathology_pending | BOOLEAN | ⬜ | Awaiting pathology |

**Surgery Closure & Sign-Off:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| surgery_status | ENUM | ✅ | Planned/In_Progress/Completed/Cancelled |
| surgeon_signoff_at | TIMESTAMPTZ | ⬜ | Surgeon signs off |
| surgeon_signoff_by | UUID | ⬜ | Signing surgeon |
| anesthetist_signoff_at | TIMESTAMPTZ | ⬜ | Anesthetist signs off |
| anesthetist_signoff_by | UUID | ⬜ | Signing anesthetist |
| nurse_signoff_at | TIMESTAMPTZ | ⬜ | Nurse signs off |
| nurse_signoff_by | UUID | ⬜ | Signing nurse |
| is_locked | BOOLEAN | ⬜ | Record finalized |
| locked_at | TIMESTAMPTZ | ⬜ | Lock timestamp |

### 3.7 Surgery Status State Machine

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Planned  │────▶│  Pre-Op   │────▶│ In-Theatre│────▶│  Recovery │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
      │                 │                 │                 │
      │                 ▼                 ▼                 ▼
      │           ┌───────────┐     ┌───────────┐     ┌───────────┐
      └──────────▶│ Cancelled │     │Complicated│────▶│ Completed │
                  └───────────┘     └───────────┘     └───────────┘
                        ▲                                   │
                        │                                   ▼
                        │                             ┌───────────┐
                        └─────────────────────────────│  Locked   │
                                                      └───────────┘
```

### 3.8 Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| SUR-001 | Surgery cannot start without active encounter | DB constraint |
| SUR-002 | NHIS surgery requires approval before scheduling | Application logic |
| SUR-003 | Consent must be obtained before Pre-Op complete | Application logic |
| SUR-004 | Only surgeons can document operative notes | RLS policy |
| SUR-005 | Only anesthetists can document anesthesia records | RLS policy |
| SUR-006 | Once signed off, records become read-only | Trigger |
| SUR-007 | Emergency surgeries can bypass consent (2 doctors) | Business rule |
| SUR-008 | Cancelled surgeries require reason documentation | NOT NULL constraint |
| SUR-009 | Blood products require blood bank verification | Application logic |
| SUR-010 | Implants must be logged with serial numbers | Application logic |

---

## 4. Module 2: Hygiene & Infection Control Module

### 4.1 Overview

The Hygiene & Infection Control module documents:
- Patient hygiene activities (bathing, oral care, etc.)
- Infection prevention measures
- Device care (IV, catheter, wounds)
- Environmental hygiene
- Compliance tracking for nursing care

> **Note:** This is a **nursing-driven** module for inpatient encounters only.

### 4.2 Hygiene Activity Categories

| Category Code | Category Name | Activities |
|---------------|---------------|------------|
| `BATH` | Bathing/Personal Hygiene | Bed bath, Assisted shower, Sponge bath |
| `ORAL` | Oral Hygiene | Oral care, Denture care, Mouth wash |
| `WOUND` | Wound/Site Care | Dressing change, Wound cleaning, Surgical site care |
| `CATH` | Catheter Care | Urinary catheter care, Nephrostomy care |
| `LINE` | Line Care | IV site care, CVC dressing, PICC line care |
| `DRAIN` | Drain Care | Surgical drain care, Chest tube care |
| `SKIN` | Skin/Pressure Care | Turning schedule, Pressure relief, Skin assessment |
| `LINEN` | Linen/Environment | Bed linen change, Bedspace cleaning |
| `ISOL` | Isolation/Precautions | PPE compliance, Isolation protocols |
| `HAND` | Hand Hygiene | Hand hygiene compliance audit |
| `DEVICE` | Device Maintenance | NG tube care, Tracheostomy care |
| `OTHER` | Other Care | Custom/miscellaneous activities |

### 4.3 Hygiene Activity Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | ✅ | Primary key |
| encounter_id | UUID | ✅ | Active encounter |
| patient_id | UUID | ✅ | Patient reference |
| admission_id | UUID | ⬜ | Admission reference |
| ward_id | UUID | ⬜ | Ward location |
| bed_id | UUID | ⬜ | Bed location |
| activity_category | ENUM | ✅ | Category code |
| activity_code | VARCHAR | ✅ | Specific activity |
| activity_name | VARCHAR | ✅ | Activity display name |
| scheduled_time | TIMESTAMPTZ | ⬜ | When scheduled |
| performed_time | TIMESTAMPTZ | ✅ | When performed |
| performed_by | UUID | ✅ | Nurse performing |
| assisted_by | UUID | ⬜ | Second staff if needed |
| duration_minutes | INTEGER | ⬜ | Time taken |
| patient_tolerance | ENUM | ✅ | Good/Fair/Poor/Refused |
| patient_response | TEXT | ⬜ | Patient feedback |
| findings | TEXT | ⬜ | Observations |
| complications | TEXT | ⬜ | Issues encountered |
| requires_follow_up | BOOLEAN | ⬜ | Needs attention |
| follow_up_notes | TEXT | ⬜ | Follow-up details |
| infection_risk_flags | JSONB | ⬜ | Risk indicators |
| linked_device_id | UUID | ⬜ | Related device record |
| linked_wound_id | UUID | ⬜ | Related wound record |
| status | ENUM | ✅ | Completed/Refused/Missed/Deferred |
| missed_reason | TEXT | ⬜ | If missed, why |
| shift | ENUM | ⬜ | Morning/Afternoon/Night |
| supervisor_reviewed | BOOLEAN | ⬜ | Supervisor check |
| supervisor_id | UUID | ⬜ | Reviewing supervisor |
| supervisor_reviewed_at | TIMESTAMPTZ | ⬜ | Review time |
| notes | TEXT | ⬜ | Additional notes |
| created_at | TIMESTAMPTZ | ✅ | Record created |
| updated_at | TIMESTAMPTZ | ⬜ | Last updated |
| created_by | UUID | ✅ | Creating staff |

### 4.4 Configurable Activities List

```json
{
  "BATH": [
    {"code": "BATH_FULL", "name": "Full Bed Bath", "frequency": "daily"},
    {"code": "BATH_PARTIAL", "name": "Partial Bed Bath", "frequency": "as_needed"},
    {"code": "BATH_SHOWER", "name": "Assisted Shower", "frequency": "as_needed"},
    {"code": "BATH_SPONGE", "name": "Sponge Bath", "frequency": "daily"}
  ],
  "ORAL": [
    {"code": "ORAL_CARE", "name": "Oral Hygiene", "frequency": "twice_daily"},
    {"code": "ORAL_SUCTION", "name": "Oral Suctioning", "frequency": "as_needed"},
    {"code": "ORAL_DENTURE", "name": "Denture Care", "frequency": "twice_daily"}
  ],
  "WOUND": [
    {"code": "WOUND_DRESS", "name": "Wound Dressing Change", "frequency": "as_ordered"},
    {"code": "WOUND_CLEAN", "name": "Wound Cleaning", "frequency": "as_ordered"},
    {"code": "WOUND_SSI_CHECK", "name": "Surgical Site Inspection", "frequency": "twice_daily"}
  ],
  "CATH": [
    {"code": "CATH_CARE", "name": "Catheter Care", "frequency": "twice_daily"},
    {"code": "CATH_EMPTY", "name": "Empty Catheter Bag", "frequency": "as_needed"},
    {"code": "CATH_MEATAL", "name": "Meatal Care", "frequency": "twice_daily"}
  ],
  "LINE": [
    {"code": "LINE_IV_CARE", "name": "IV Site Care", "frequency": "daily"},
    {"code": "LINE_CVC_DRESS", "name": "CVC Dressing Change", "frequency": "per_protocol"},
    {"code": "LINE_FLUSH", "name": "Line Flushing", "frequency": "per_protocol"}
  ],
  "DRAIN": [
    {"code": "DRAIN_CARE", "name": "Drain Site Care", "frequency": "daily"},
    {"code": "DRAIN_EMPTY", "name": "Empty Drain", "frequency": "as_needed"},
    {"code": "DRAIN_MEASURE", "name": "Measure Drain Output", "frequency": "shift"}
  ],
  "SKIN": [
    {"code": "SKIN_TURN", "name": "Patient Turning/Repositioning", "frequency": "2_hourly"},
    {"code": "SKIN_ASSESS", "name": "Skin Assessment", "frequency": "shift"},
    {"code": "SKIN_PRESSURE", "name": "Pressure Relief", "frequency": "2_hourly"},
    {"code": "SKIN_MOISTURE", "name": "Moisture Barrier Application", "frequency": "as_needed"}
  ],
  "LINEN": [
    {"code": "LINEN_CHANGE", "name": "Bed Linen Change", "frequency": "daily"},
    {"code": "LINEN_SOILED", "name": "Soiled Linen Change", "frequency": "as_needed"},
    {"code": "ENV_CLEAN", "name": "Bedspace Cleaning", "frequency": "daily"}
  ],
  "ISOL": [
    {"code": "ISOL_PPE", "name": "PPE Compliance Check", "frequency": "each_entry"},
    {"code": "ISOL_CONTACT", "name": "Contact Precautions Maintained", "frequency": "shift"},
    {"code": "ISOL_DROPLET", "name": "Droplet Precautions Maintained", "frequency": "shift"},
    {"code": "ISOL_AIRBORNE", "name": "Airborne Precautions Maintained", "frequency": "shift"}
  ],
  "HAND": [
    {"code": "HAND_AUDIT", "name": "Hand Hygiene Audit", "frequency": "random"},
    {"code": "HAND_BEFORE", "name": "Hand Hygiene Before Patient Contact", "frequency": "each_contact"},
    {"code": "HAND_AFTER", "name": "Hand Hygiene After Patient Contact", "frequency": "each_contact"}
  ],
  "DEVICE": [
    {"code": "DEV_NG_CARE", "name": "NG Tube Care", "frequency": "shift"},
    {"code": "DEV_TRACH_CARE", "name": "Tracheostomy Care", "frequency": "per_protocol"},
    {"code": "DEV_VENT_CHECK", "name": "Ventilator Circuit Check", "frequency": "shift"}
  ]
}
```

### 4.5 Infection Risk Tracking

**Risk Indicators (stored in `infection_risk_flags`):**
```json
{
  "ssi_risk": false,           // Surgical site infection risk
  "cauti_risk": false,         // Catheter-associated UTI risk
  "clabsi_risk": false,        // Central line bloodstream infection
  "vap_risk": false,           // Ventilator-associated pneumonia
  "pressure_injury_risk": false,
  "mrsa_positive": false,
  "isolation_required": false,
  "isolation_type": null,
  "fever_present": false,
  "wound_infection_signs": false,
  "purulent_drainage": false,
  "elevated_wbc": false
}
```

**Automatic Alerts:**
| Trigger | Alert Type | Action |
|---------|------------|--------|
| Wound shows signs of infection | Critical | Notify doctor, flag for IC review |
| Catheter >3 days | Warning | Prompt for removal assessment |
| Central line >7 days | Warning | Prompt for line necessity review |
| Missed turning schedule | Warning | Pressure injury risk escalation |
| Fever + device in place | Critical | Device-related infection workup |

### 4.6 Missed Care Documentation

When care is missed, documentation is MANDATORY:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | ENUM | ✅ | 'Missed' |
| missed_reason | ENUM | ✅ | Staffing/Patient_Condition/Refused/Other |
| missed_reason_details | TEXT | ⬜ | Explanation |
| escalated | BOOLEAN | ⬜ | Escalated to supervisor |
| rescheduled_time | TIMESTAMPTZ | ⬜ | When rescheduled |

**Missed Care Reasons:**
- `PATIENT_REFUSED` - Patient declined care
- `PATIENT_UNSTABLE` - Clinical condition prevented care
- `OFF_WARD` - Patient away for procedure/test
- `STAFFING` - Insufficient staff
- `EMERGENCY` - Staff diverted to emergency
- `OTHER` - Other reason (must document)

### 4.7 Hygiene-to-Nursing Integration

Hygiene activities automatically populate:
- `nursing_interventions` table (for analytics)
- Shift handover summaries
- Patient care timeline

**Link to Surgical Site:**
```sql
-- When surgery is completed, auto-flag for SSI monitoring
INSERT INTO hygiene_care_schedules (
  patient_id, encounter_id, activity_code, 
  frequency, start_date, linked_surgery_id
)
SELECT 
  s.patient_id, s.encounter_id, 'WOUND_SSI_CHECK',
  'twice_daily', s.surgery_date, s.id
FROM surgeries s
WHERE s.status = 'Completed'
  AND s.wound_classification != 'clean';
```

### 4.8 Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| HYG-001 | Hygiene records require active inpatient encounter | DB constraint |
| HYG-002 | Missed care MUST have justification | NOT NULL constraint |
| HYG-003 | Infection risk flags auto-trigger alerts | Application trigger |
| HYG-004 | Surgical site care must link to surgery record | Application logic |
| HYG-005 | Device care must reference device duration | Application logic |
| HYG-006 | Hygiene data feeds nursing notes automatically | DB trigger |
| HYG-007 | Supervisor review required for critical findings | Workflow |
| HYG-008 | Only nurses can document hygiene activities | RLS policy |

---

## 5. Database Schema Design

### 5.1 New Tables

```sql
-- Migration: 103_surgery_hygiene_modules.sql

-- ============================================================================
-- SECTION 1: SURGERY ENUMS
-- ============================================================================

CREATE TYPE surgery_status AS ENUM (
  'Planned', 'Pre_Op', 'In_Theatre', 'Recovery', 
  'Completed', 'Cancelled', 'Complicated'
);

CREATE TYPE asa_classification AS ENUM (
  'ASA_I', 'ASA_II', 'ASA_III', 'ASA_IV', 'ASA_V', 'ASA_VI'
);

CREATE TYPE anesthesia_type AS ENUM (
  'General', 'Regional', 'Spinal', 'Epidural', 
  'Local', 'Sedation', 'Combined', 'None'
);

CREATE TYPE wound_classification AS ENUM (
  'Clean', 'Clean_Contaminated', 'Contaminated', 'Dirty_Infected'
);

CREATE TYPE consent_type AS ENUM (
  'Written', 'Verbal', 'Emergency', 'Guardian'
);

CREATE TYPE surgery_disposition AS ENUM (
  'Ward', 'ICU', 'HDU', 'PACU', 'Day_Case_Discharge', 'Morgue'
);

-- ============================================================================
-- SECTION 2: SURGERIES TABLE (Main Surgery Record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgeries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Core references (ENCOUNTER-CENTRIC)
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  admission_id UUID REFERENCES admissions(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  
  -- Procedure info
  procedure_catalogue_id UUID REFERENCES procedure_catalogue(id),
  primary_procedure VARCHAR(255) NOT NULL,
  secondary_procedures JSONB DEFAULT '[]',
  laterality VARCHAR(20) CHECK (laterality IN ('Left', 'Right', 'Bilateral', 'NA')),
  body_site TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time TIME,
  scheduled_duration_minutes INTEGER,
  theatre_room VARCHAR(50),
  priority VARCHAR(20) NOT NULL DEFAULT 'Routine' 
    CHECK (priority IN ('Emergency', 'Urgent', 'Routine', 'Elective')),
  
  -- Clinical request linkage
  clinical_request_id UUID REFERENCES clinical_requests(id),
  
  -- NHIS/Insurance
  requires_nhis_approval BOOLEAN DEFAULT FALSE,
  nhis_approval_id UUID REFERENCES nhis_approvals(id),
  nhis_authorization_code VARCHAR(100),
  nhis_authorization_expiry DATE,
  
  -- Surgical indication
  indication TEXT NOT NULL,
  pre_op_diagnosis TEXT,
  post_op_diagnosis TEXT,
  icd10_codes JSONB DEFAULT '[]',
  
  -- Status tracking
  status surgery_status NOT NULL DEFAULT 'Planned',
  
  -- Timeline
  theatre_entry_time TIMESTAMPTZ,
  anesthesia_start_time TIMESTAMPTZ,
  incision_time TIMESTAMPTZ,
  closure_time TIMESTAMPTZ,
  anesthesia_end_time TIMESTAMPTZ,
  theatre_exit_time TIMESTAMPTZ,
  
  -- Surgical team (stored as JSONB for flexibility)
  primary_surgeon_id UUID NOT NULL REFERENCES staff(id),
  surgical_team JSONB DEFAULT '{}',
  
  -- Consent
  consent_obtained BOOLEAN DEFAULT FALSE,
  consent_type consent_type,
  consent_date TIMESTAMPTZ,
  consent_obtained_by UUID REFERENCES staff(id),
  consent_witness_id UUID REFERENCES staff(id),
  consent_document_url TEXT,
  consent_notes TEXT,
  
  -- Pre-op checklist (WHO Safe Surgery Checklist)
  preop_checklist JSONB DEFAULT '{}',
  preop_checklist_completed BOOLEAN DEFAULT FALSE,
  preop_checklist_completed_at TIMESTAMPTZ,
  preop_checklist_completed_by UUID REFERENCES staff(id),
  
  -- Intra-operative
  position VARCHAR(100),
  skin_prep VARCHAR(100),
  approach TEXT,
  incision TEXT,
  findings TEXT,
  procedure_details TEXT,
  technique_description TEXT,
  estimated_blood_loss_ml INTEGER,
  blood_products_given JSONB DEFAULT '[]',
  specimens_collected JSONB DEFAULT '[]',
  implants_used JSONB DEFAULT '[]',
  drains_placed JSONB DEFAULT '[]',
  closure_technique TEXT,
  wound_classification wound_classification,
  intraop_complications TEXT,
  
  -- Post-operative
  recovery_location VARCHAR(100),
  recovery_start_time TIMESTAMPTZ,
  recovery_end_time TIMESTAMPTZ,
  disposition surgery_disposition,
  transfer_ward_id UUID REFERENCES wards(id),
  postop_instructions TEXT,
  postop_complications TEXT,
  
  -- Sign-off (once signed, record is locked)
  surgeon_signoff_by UUID REFERENCES staff(id),
  surgeon_signoff_at TIMESTAMPTZ,
  anesthetist_signoff_by UUID REFERENCES staff(id),
  anesthetist_signoff_at TIMESTAMPTZ,
  nurse_signoff_by UUID REFERENCES staff(id),
  nurse_signoff_at TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  
  -- Billing
  billable BOOLEAN DEFAULT TRUE,
  billing_order_id UUID REFERENCES billing_orders(id),
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES staff(id),
  cancellation_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 3: PRE-OP ASSESSMENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgery_preop_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
  
  -- Assessment details
  assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessed_by UUID NOT NULL REFERENCES staff(id),
  
  -- ASA Classification
  asa_classification asa_classification NOT NULL,
  asa_notes TEXT,
  
  -- Airway assessment
  airway_assessment JSONB DEFAULT '{}',
  mallampati_class VARCHAR(10),
  neck_mobility VARCHAR(50),
  mouth_opening VARCHAR(50),
  dentition_notes TEXT,
  
  -- Risk assessments
  cardiac_risk TEXT,
  pulmonary_risk TEXT,
  renal_risk TEXT,
  hepatic_risk TEXT,
  bleeding_risk TEXT,
  dvt_risk VARCHAR(20),
  
  -- Verification
  allergies_verified BOOLEAN DEFAULT FALSE,
  allergies_snapshot JSONB DEFAULT '[]',
  medications_reviewed BOOLEAN DEFAULT FALSE,
  current_medications JSONB DEFAULT '[]',
  fasting_status TEXT,
  fasting_hours INTEGER,
  
  -- Investigations
  investigations_reviewed JSONB DEFAULT '[]',
  pending_investigations TEXT,
  
  -- Blood
  blood_type VARCHAR(10),
  crossmatch_ordered BOOLEAN DEFAULT FALSE,
  blood_units_ordered INTEGER DEFAULT 0,
  
  -- Final clearance
  fit_for_surgery BOOLEAN,
  clearance_notes TEXT,
  special_considerations TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: ANESTHESIA RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgery_anesthesia_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
  
  -- Anesthetist
  anesthetist_id UUID NOT NULL REFERENCES staff(id),
  anesthesia_nurse_id UUID REFERENCES staff(id),
  
  -- Anesthesia type
  anesthesia_type anesthesia_type NOT NULL,
  anesthesia_technique TEXT,
  
  -- Airway
  airway_management VARCHAR(50),
  tube_size VARCHAR(20),
  intubation_attempts INTEGER,
  intubation_difficulty TEXT,
  
  -- Medications
  premedication JSONB DEFAULT '[]',
  induction_agents JSONB DEFAULT '[]',
  maintenance_agents JSONB DEFAULT '[]',
  muscle_relaxants JSONB DEFAULT '[]',
  reversal_agents JSONB DEFAULT '[]',
  other_medications JSONB DEFAULT '[]',
  
  -- Monitoring
  monitoring_used JSONB DEFAULT '[]',
  
  -- Intraoperative record
  vital_signs_log JSONB DEFAULT '[]',
  fluids_given JSONB DEFAULT '[]',
  urine_output_ml INTEGER,
  
  -- Events
  intraop_events TEXT,
  complications TEXT,
  
  -- Recovery (Aldrete scoring)
  aldrete_score_initial INTEGER CHECK (aldrete_score_initial BETWEEN 0 AND 10),
  aldrete_score_discharge INTEGER CHECK (aldrete_score_discharge BETWEEN 0 AND 10),
  recovery_notes TEXT,
  
  -- Sign-off
  signed_off BOOLEAN DEFAULT FALSE,
  signed_off_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 5: SURGERY CONSUMABLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS surgery_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID NOT NULL REFERENCES surgeries(id) ON DELETE CASCADE,
  
  -- Item
  inventory_item_id UUID REFERENCES inventory_items(id),
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(50),
  category VARCHAR(100),
  
  -- Quantity
  quantity_used DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50),
  
  -- Tracking
  batch_number VARCHAR(100),
  serial_number VARCHAR(100),
  expiry_date DATE,
  
  -- Pricing
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  billable BOOLEAN DEFAULT TRUE,
  
  -- For implants
  is_implant BOOLEAN DEFAULT FALSE,
  implant_details JSONB,
  
  -- Audit
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 6: THEATRE ROOMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS theatre_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  
  room_code VARCHAR(20) UNIQUE NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  room_type VARCHAR(50) NOT NULL CHECK (room_type IN (
    'General', 'Cardiac', 'Neuro', 'Orthopedic', 'Obstetric',
    'Ophthalmic', 'ENT', 'Minor', 'Emergency', 'Hybrid'
  )),
  
  -- Capacity
  capacity_level VARCHAR(20) DEFAULT 'Standard',
  
  -- Equipment
  standard_equipment JSONB DEFAULT '[]',
  special_equipment JSONB DEFAULT '[]',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  current_status VARCHAR(30) DEFAULT 'Available' CHECK (current_status IN (
    'Available', 'In_Use', 'Cleaning', 'Maintenance', 'Reserved'
  )),
  current_surgery_id UUID REFERENCES surgeries(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: THEATRE SCHEDULE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS theatre_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theatre_room_id UUID NOT NULL REFERENCES theatre_rooms(id),
  surgery_id UUID NOT NULL REFERENCES surgeries(id),
  
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Status
  status VARCHAR(30) DEFAULT 'Scheduled' CHECK (status IN (
    'Scheduled', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled', 'Delayed'
  )),
  
  -- Staff assignments for the slot
  primary_surgeon_id UUID REFERENCES staff(id),
  anesthetist_id UUID REFERENCES staff(id),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES staff(id),
  
  -- Prevent overlapping schedules
  EXCLUDE USING gist (
    theatre_room_id WITH =,
    tsrange(
      (scheduled_date + start_time)::timestamp,
      (scheduled_date + end_time)::timestamp
    ) WITH &&
  ) WHERE (status NOT IN ('Cancelled'))
);

-- ============================================================================
-- SECTION 8: HYGIENE ENUMS
-- ============================================================================

CREATE TYPE hygiene_activity_category AS ENUM (
  'BATH', 'ORAL', 'WOUND', 'CATH', 'LINE', 'DRAIN',
  'SKIN', 'LINEN', 'ISOL', 'HAND', 'DEVICE', 'OTHER'
);

CREATE TYPE patient_tolerance AS ENUM (
  'Good', 'Fair', 'Poor', 'Refused', 'Unable_To_Assess'
);

CREATE TYPE hygiene_status AS ENUM (
  'Completed', 'Refused', 'Missed', 'Deferred', 'In_Progress'
);

CREATE TYPE missed_care_reason AS ENUM (
  'Patient_Refused', 'Patient_Unstable', 'Off_Ward',
  'Staffing', 'Emergency', 'Equipment_Issue', 'Other'
);

-- ============================================================================
-- SECTION 9: HYGIENE ACTIVITIES CATALOGUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hygiene_activity_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  category hygiene_activity_category NOT NULL,
  activity_code VARCHAR(50) UNIQUE NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Scheduling
  default_frequency VARCHAR(50), -- daily, twice_daily, shift, as_needed
  frequency_hours INTEGER,       -- For scheduled reminders
  
  -- Requirements
  requires_two_staff BOOLEAN DEFAULT FALSE,
  requires_supplies JSONB DEFAULT '[]',
  
  -- Clinical
  triggers_infection_alert BOOLEAN DEFAULT FALSE,
  requires_documentation BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECTION 10: HYGIENE CARE RECORDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hygiene_care_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core references (ENCOUNTER-CENTRIC)
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  admission_id UUID REFERENCES admissions(id),
  
  -- Location
  ward_id UUID REFERENCES wards(id),
  bed_id UUID REFERENCES beds(id),
  
  -- Activity
  activity_catalogue_id UUID REFERENCES hygiene_activity_catalogue(id),
  activity_category hygiene_activity_category NOT NULL,
  activity_code VARCHAR(50) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  
  -- Timing
  scheduled_time TIMESTAMPTZ,
  performed_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER,
  shift VARCHAR(20) CHECK (shift IN ('Morning', 'Afternoon', 'Night')),
  
  -- Performers
  performed_by UUID NOT NULL REFERENCES staff(id),
  assisted_by UUID REFERENCES staff(id),
  
  -- Patient response
  patient_tolerance patient_tolerance NOT NULL DEFAULT 'Good',
  patient_response TEXT,
  
  -- Clinical findings
  findings TEXT,
  complications TEXT,
  requires_follow_up BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  
  -- Infection risk
  infection_risk_flags JSONB DEFAULT '{}',
  
  -- Linked records
  linked_surgery_id UUID REFERENCES surgeries(id),
  linked_wound_id UUID,
  linked_device_type VARCHAR(50),
  
  -- Status
  status hygiene_status NOT NULL DEFAULT 'Completed',
  missed_reason missed_care_reason,
  missed_reason_details TEXT,
  deferred_to TIMESTAMPTZ,
  
  -- Supervisor review
  supervisor_reviewed BOOLEAN DEFAULT FALSE,
  supervisor_id UUID REFERENCES staff(id),
  supervisor_reviewed_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 11: HYGIENE CARE SCHEDULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hygiene_care_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core references
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  admission_id UUID REFERENCES admissions(id),
  
  -- Activity
  activity_catalogue_id UUID REFERENCES hygiene_activity_catalogue(id),
  activity_code VARCHAR(50) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  
  -- Schedule
  frequency VARCHAR(50) NOT NULL, -- hourly, 2_hourly, daily, twice_daily, etc.
  frequency_hours INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  next_due TIMESTAMPTZ,
  
  -- Linked records
  linked_surgery_id UUID REFERENCES surgeries(id),
  linked_device_type VARCHAR(50),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  paused_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 12: INFECTION SURVEILLANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS infection_surveillance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core references
  encounter_id UUID NOT NULL REFERENCES visits(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  admission_id UUID REFERENCES admissions(id),
  
  -- Infection type
  infection_type VARCHAR(50) NOT NULL CHECK (infection_type IN (
    'SSI', 'CAUTI', 'CLABSI', 'VAP', 'CDI', 'MRSA', 'Other_HAI'
  )),
  
  -- Related records
  surgery_id UUID REFERENCES surgeries(id),
  hygiene_record_id UUID REFERENCES hygiene_care_records(id),
  
  -- Detection
  detected_date DATE NOT NULL,
  detected_by UUID NOT NULL REFERENCES staff(id),
  detection_method VARCHAR(100), -- Clinical, Laboratory, Surveillance
  
  -- Clinical details
  symptoms TEXT,
  culture_results TEXT,
  organism VARCHAR(255),
  sensitivity_pattern TEXT,
  
  -- Classification
  severity VARCHAR(20) CHECK (severity IN ('Mild', 'Moderate', 'Severe')),
  device_related BOOLEAN DEFAULT FALSE,
  device_type VARCHAR(100),
  device_days INTEGER,
  
  -- Action taken
  action_taken TEXT,
  treatment_initiated BOOLEAN DEFAULT FALSE,
  treatment_notes TEXT,
  
  -- Outcome
  outcome VARCHAR(50) CHECK (outcome IN (
    'Resolved', 'Ongoing', 'Worsened', 'Death_Related', 'Death_Unrelated'
  )),
  resolution_date DATE,
  
  -- Reporting
  reported_to_ic BOOLEAN DEFAULT FALSE,
  reported_date DATE,
  ic_officer_id UUID REFERENCES staff(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES staff(id)
);

-- ============================================================================
-- SECTION 13: INDEXES
-- ============================================================================

-- Surgeries indexes
CREATE INDEX idx_surgeries_encounter ON surgeries(encounter_id);
CREATE INDEX idx_surgeries_patient ON surgeries(patient_id);
CREATE INDEX idx_surgeries_admission ON surgeries(admission_id);
CREATE INDEX idx_surgeries_status ON surgeries(status);
CREATE INDEX idx_surgeries_scheduled ON surgeries(scheduled_date, scheduled_time);
CREATE INDEX idx_surgeries_surgeon ON surgeries(primary_surgeon_id);
CREATE INDEX idx_surgeries_number ON surgeries(surgery_number);
CREATE INDEX idx_surgeries_pending ON surgeries(status) WHERE status IN ('Planned', 'Pre_Op');
CREATE INDEX idx_surgeries_nhis ON surgeries(nhis_approval_id) WHERE requires_nhis_approval = TRUE;

-- Preop assessments indexes
CREATE INDEX idx_preop_surgery ON surgery_preop_assessments(surgery_id);
CREATE INDEX idx_preop_assessor ON surgery_preop_assessments(assessed_by);

-- Anesthesia records indexes
CREATE INDEX idx_anesthesia_surgery ON surgery_anesthesia_records(surgery_id);
CREATE INDEX idx_anesthesia_anesthetist ON surgery_anesthesia_records(anesthetist_id);

-- Surgery consumables indexes
CREATE INDEX idx_surgery_consumables_surgery ON surgery_consumables(surgery_id);
CREATE INDEX idx_surgery_consumables_item ON surgery_consumables(inventory_item_id);
CREATE INDEX idx_surgery_consumables_implant ON surgery_consumables(surgery_id) WHERE is_implant = TRUE;

-- Theatre schedules indexes
CREATE INDEX idx_theatre_schedules_room ON theatre_schedules(theatre_room_id);
CREATE INDEX idx_theatre_schedules_date ON theatre_schedules(scheduled_date);
CREATE INDEX idx_theatre_schedules_surgery ON theatre_schedules(surgery_id);

-- Hygiene records indexes
CREATE INDEX idx_hygiene_encounter ON hygiene_care_records(encounter_id);
CREATE INDEX idx_hygiene_patient ON hygiene_care_records(patient_id);
CREATE INDEX idx_hygiene_admission ON hygiene_care_records(admission_id);
CREATE INDEX idx_hygiene_category ON hygiene_care_records(activity_category);
CREATE INDEX idx_hygiene_status ON hygiene_care_records(status);
CREATE INDEX idx_hygiene_performed ON hygiene_care_records(performed_time);
CREATE INDEX idx_hygiene_nurse ON hygiene_care_records(performed_by);
CREATE INDEX idx_hygiene_surgery ON hygiene_care_records(linked_surgery_id);
CREATE INDEX idx_hygiene_missed ON hygiene_care_records(status) WHERE status = 'Missed';

-- Hygiene schedules indexes
CREATE INDEX idx_hygiene_sched_encounter ON hygiene_care_schedules(encounter_id);
CREATE INDEX idx_hygiene_sched_patient ON hygiene_care_schedules(patient_id);
CREATE INDEX idx_hygiene_sched_due ON hygiene_care_schedules(next_due) WHERE is_active = TRUE;

-- Infection surveillance indexes
CREATE INDEX idx_infection_encounter ON infection_surveillance(encounter_id);
CREATE INDEX idx_infection_patient ON infection_surveillance(patient_id);
CREATE INDEX idx_infection_surgery ON infection_surveillance(surgery_id);
CREATE INDEX idx_infection_type ON infection_surveillance(infection_type);
CREATE INDEX idx_infection_date ON infection_surveillance(detected_date);

-- ============================================================================
-- SECTION 14: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_preop_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_anesthesia_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE theatre_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE theatre_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_activity_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_care_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hygiene_care_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE infection_surveillance ENABLE ROW LEVEL SECURITY;

-- Basic select policies (all authenticated users can read)
CREATE POLICY surgeries_select ON surgeries FOR SELECT USING (true);
CREATE POLICY preop_select ON surgery_preop_assessments FOR SELECT USING (true);
CREATE POLICY anesthesia_select ON surgery_anesthesia_records FOR SELECT USING (true);
CREATE POLICY consumables_select ON surgery_consumables FOR SELECT USING (true);
CREATE POLICY theatre_rooms_select ON theatre_rooms FOR SELECT USING (true);
CREATE POLICY theatre_schedules_select ON theatre_schedules FOR SELECT USING (true);
CREATE POLICY hygiene_catalogue_select ON hygiene_activity_catalogue FOR SELECT USING (true);
CREATE POLICY hygiene_records_select ON hygiene_care_records FOR SELECT USING (true);
CREATE POLICY hygiene_schedules_select ON hygiene_care_schedules FOR SELECT USING (true);
CREATE POLICY infection_select ON infection_surveillance FOR SELECT USING (true);

-- Insert/Update policies (authenticated users)
CREATE POLICY surgeries_insert ON surgeries FOR INSERT WITH CHECK (true);
CREATE POLICY surgeries_update ON surgeries FOR UPDATE USING (NOT is_locked);
CREATE POLICY preop_insert ON surgery_preop_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY anesthesia_insert ON surgery_anesthesia_records FOR INSERT WITH CHECK (true);
CREATE POLICY anesthesia_update ON surgery_anesthesia_records FOR UPDATE USING (NOT signed_off);
CREATE POLICY consumables_insert ON surgery_consumables FOR INSERT WITH CHECK (true);
CREATE POLICY hygiene_records_insert ON hygiene_care_records FOR INSERT WITH CHECK (true);
CREATE POLICY hygiene_records_update ON hygiene_care_records FOR UPDATE USING (true);
CREATE POLICY hygiene_schedules_insert ON hygiene_care_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY infection_insert ON infection_surveillance FOR INSERT WITH CHECK (true);
CREATE POLICY infection_update ON infection_surveillance FOR UPDATE USING (true);

-- ============================================================================
-- SECTION 15: TRIGGERS
-- ============================================================================

-- Lock surgery record after all sign-offs
CREATE OR REPLACE FUNCTION lock_surgery_after_signoff()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.surgeon_signoff_at IS NOT NULL 
     AND NEW.anesthetist_signoff_at IS NOT NULL 
     AND NEW.nurse_signoff_at IS NOT NULL
     AND NEW.is_locked = FALSE THEN
    NEW.is_locked := TRUE;
    NEW.locked_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_lock_surgery_after_signoff
  BEFORE UPDATE ON surgeries
  FOR EACH ROW
  EXECUTE FUNCTION lock_surgery_after_signoff();

-- Auto-create SSI surveillance schedule after surgery
CREATE OR REPLACE FUNCTION create_ssi_surveillance_schedule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND NEW.wound_classification IS NOT NULL THEN
    INSERT INTO hygiene_care_schedules (
      encounter_id, patient_id, admission_id,
      activity_code, activity_name, frequency,
      start_date, linked_surgery_id, created_by
    )
    VALUES (
      NEW.encounter_id, NEW.patient_id, NEW.admission_id,
      'WOUND_SSI_CHECK', 'Surgical Site Inspection', 'twice_daily',
      CURRENT_DATE, NEW.id, NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_create_ssi_surveillance
  AFTER UPDATE ON surgeries
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Completed')
  EXECUTE FUNCTION create_ssi_surveillance_schedule();

-- Auto-insert hygiene activity to nursing_interventions for analytics
CREATE OR REPLACE FUNCTION sync_hygiene_to_interventions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nursing_interventions (
    encounter_id, patient_id, ward_id, bed_id,
    category_code, intervention_code, notes,
    performed_at, shift, nurse_id
  )
  VALUES (
    NEW.encounter_id, NEW.patient_id, NEW.ward_id, NEW.bed_id,
    NEW.activity_category::text, NEW.activity_code, NEW.notes,
    NEW.performed_time, NEW.shift, NEW.performed_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_hygiene_interventions
  AFTER INSERT ON hygiene_care_records
  FOR EACH ROW
  WHEN (NEW.status = 'Completed')
  EXECUTE FUNCTION sync_hygiene_to_interventions();

-- Update theatre room status when surgery starts/ends
CREATE OR REPLACE FUNCTION update_theatre_room_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Surgery starting
  IF NEW.status = 'In_Theatre' AND OLD.status != 'In_Theatre' THEN
    UPDATE theatre_rooms 
    SET current_status = 'In_Use', current_surgery_id = NEW.id, updated_at = NOW()
    WHERE room_code = NEW.theatre_room;
  END IF;
  
  -- Surgery ending
  IF NEW.status IN ('Completed', 'Recovery', 'Cancelled') 
     AND OLD.status = 'In_Theatre' THEN
    UPDATE theatre_rooms 
    SET current_status = 'Cleaning', current_surgery_id = NULL, updated_at = NOW()
    WHERE room_code = NEW.theatre_room;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_theatre_status
  AFTER UPDATE ON surgeries
  FOR EACH ROW
  EXECUTE FUNCTION update_theatre_room_status();
```

---

## 6. Role-Permission Matrix

### 6.1 Surgery Module Permissions

| Action | Surgeon | Anesthetist | Theatre Nurse | Ward Nurse | NHIS Desk | IC Officer | Admin |
|--------|---------|-------------|---------------|------------|-----------|------------|-------|
| View surgeries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create surgery request | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Schedule surgery | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Document pre-op | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Document anesthesia | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Document operative notes | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Document consumables | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sign off surgery | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve NHIS surgery | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Cancel surgery | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |

### 6.2 Hygiene Module Permissions

| Action | Surgeon | Anesthetist | Theatre Nurse | Ward Nurse | IC Officer | Admin |
|--------|---------|-------------|---------------|------------|------------|-------|
| View hygiene records | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create hygiene record | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update hygiene record | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Document missed care | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Supervisor review | ❌ | ❌ | ❌ | ✅* | ✅ | ✅ |
| Create infection report | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| View infection dashboard | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Configure activities | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

*Ward Nurse can supervise only if designated as shift supervisor

---

## 7. Cross-Module Integration

### 7.1 Integration Points Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CROSS-MODULE INTEGRATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐                          ┌──────────────┐               │
│   │ CONSULTATION │──────clinical_request────▶│   SURGERY    │               │
│   └──────────────┘                          └──────┬───────┘               │
│          │                                         │                        │
│          │                                         │ post_op_orders         │
│          ▼                                         ▼                        │
│   ┌──────────────┐                          ┌──────────────┐               │
│   │   NURSING    │◀───treatment_plans───────│  ADMISSIONS  │               │
│   └──────┬───────┘                          └──────────────┘               │
│          │                                         ▲                        │
│          │ nursing_interventions                   │                        │
│          ▼                                         │                        │
│   ┌──────────────┐      SSI_surveillance    ┌──────┴───────┐               │
│   │   HYGIENE    │─────────────────────────▶│  INFECTION   │               │
│   └──────────────┘                          │  CONTROL     │               │
│          │                                  └──────────────┘               │
│          │                                         ▲                        │
│          │                                         │                        │
│          ▼                                         │                        │
│   ┌──────────────┐                                 │                        │
│   │   BILLING    │◀────auto_billing────────────────┘                        │
│   └──────────────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────┐                                                          │
│   │    NHIS      │◀────approval_workflow                                    │
│   └──────────────┘                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Key Integration Functions

**1. Surgery → Admission:**
```sql
-- Surgery completion triggers admission update
UPDATE admissions 
SET care_team = care_team || surgery.surgical_team
WHERE id = surgery.admission_id;
```

**2. Surgery → Hygiene (SSI Monitoring):**
```sql
-- Auto-create wound care schedule after surgery
-- See trigger: tr_create_ssi_surveillance
```

**3. Hygiene → Nursing Interventions:**
```sql
-- Hygiene activities auto-log to nursing_interventions
-- See trigger: tr_sync_hygiene_interventions
```

**4. Hygiene → Infection Surveillance:**
```sql
-- When infection signs detected, create surveillance record
INSERT INTO infection_surveillance (...)
SELECT ... FROM hygiene_care_records
WHERE infection_risk_flags->>'wound_infection_signs' = 'true';
```

**5. Surgery → Billing:**
```sql
-- Auto-create billing order on surgery completion
INSERT INTO billing_orders (
  encounter_id, patient_id, service_type, service_id,
  amount, description, source_module
)
SELECT 
  surgery.encounter_id, surgery.patient_id, 'Surgery',
  surgery.id, procedure.base_price, surgery.primary_procedure, 'surgery'
FROM surgeries surgery
JOIN procedure_catalogue procedure ON surgery.procedure_catalogue_id = procedure.id
WHERE surgery.status = 'Completed' AND surgery.billable = TRUE;
```

---

## 8. Validation Rules & Edge Cases

### 8.1 Surgery Validation Rules

| Rule | Validation | Error Message |
|------|------------|---------------|
| Active encounter required | `encounter.status NOT IN ('Closed', 'Cancelled')` | "Surgery cannot be created for closed encounter" |
| NHIS requires approval | `IF patient.is_nhis AND procedure.requires_approval THEN nhis_approval.status = 'approved'` | "NHIS approval required before surgery" |
| Consent before Pre-Op | `consent_obtained = TRUE` before status = 'Pre_Op' | "Consent must be obtained before pre-op assessment" |
| Pre-op before Theatre | `preop_assessment EXISTS` before status = 'In_Theatre' | "Pre-op assessment required" |
| Valid theatre room | `theatre_room EXISTS AND theatre_room.is_active` | "Invalid theatre room" |
| No scheduling conflict | `EXCLUDE constraint on theatre_schedules` | "Theatre room already scheduled" |
| Surgeon required | `primary_surgeon_id IS NOT NULL` | "Primary surgeon required" |
| Blood loss documented | `estimated_blood_loss_ml IS NOT NULL` for completed | "Blood loss must be documented" |
| Post-op diagnosis required | `post_op_diagnosis IS NOT NULL` for completed | "Post-operative diagnosis required" |

### 8.2 Hygiene Validation Rules

| Rule | Validation | Error Message |
|------|------------|---------------|
| Inpatient encounter | `admission_id IS NOT NULL` | "Hygiene records require active admission" |
| Missed care justification | `IF status = 'Missed' THEN missed_reason IS NOT NULL` | "Missed care requires justification" |
| Valid activity code | `activity_code EXISTS IN hygiene_activity_catalogue` | "Invalid activity code" |
| Nurse performer | `performed_by.role IN ('nurse', 'theatre_nurse')` | "Only nurses can document hygiene care" |
| Future schedule valid | `next_due > NOW()` for active schedules | "Schedule must be in the future" |

### 8.3 Edge Cases

| Scenario | Handling |
|----------|----------|
| Emergency surgery without consent | Allow with `consent_type = 'Emergency'` and 2 doctor signatures |
| Surgery cancelled mid-procedure | Set status = 'Cancelled' with detailed cancellation_reason |
| Patient refuses hygiene care | Document as status = 'Refused' with patient_response |
| NHIS approval expires during surgery | Allow completion but flag for billing review |
| Multiple surgeries same day | Theatre schedule prevents overlaps; queue if needed |
| Theatre room breakdown | Mark room 'Maintenance'; auto-reassign scheduled surgeries |
| Infection detected post-discharge | Allow surveillance record creation with admission reference |

---

## 9. Workflow Diagrams

### 9.1 Surgery Workflow

```
                            ┌─────────────────┐
                            │  CONSULTATION   │
                            │  Creates Request│
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                  ┌────NO───│  NHIS Patient?  │───YES────┐
                  │         └─────────────────┘          │
                  │                                      ▼
                  │                             ┌─────────────────┐
                  │                             │  NHIS APPROVAL  │
                  │                             │    REQUIRED     │
                  │                             └────────┬────────┘
                  │                                      │
                  │                    ┌────REJECTED─────┼────APPROVED───┐
                  │                    │                 │               │
                  │                    ▼                 │               │
                  │         ┌─────────────────┐         │               │
                  │         │   END (Denied)  │         │               │
                  │         └─────────────────┘         │               │
                  │                                     │               │
                  ▼                                     ▼               │
         ┌─────────────────┐                            │               │
         │    SCHEDULE     │◀───────────────────────────┘               │
         │     SURGERY     │◀───────────────────────────────────────────┘
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   PRE-OP PHASE  │
         │  • Consent      │
         │  • Assessment   │
         │  • Checklist    │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  THEATRE ENTRY  │
         │  • Time In      │
         │  • Team Check   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    ANESTHESIA   │
         │  • Induction    │
         │  • Monitoring   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    PROCEDURE    │
         │  • Incision     │
         │  • Findings     │
         │  • Closure      │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    RECOVERY     │
         │  • PACU         │
         │  • Vitals       │
         │  • Aldrete      │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    SIGN-OFF     │
         │  • Surgeon      │
         │  • Anesthetist  │
         │  • Nurse        │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  BILLING/WARD   │
         │  • Auto-bill    │
         │  • SSI schedule │
         │  • Ward transfer│
         └─────────────────┘
```

### 9.2 Hygiene Workflow

```
         ┌─────────────────┐
         │  PATIENT ADMITS │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  CREATE HYGIENE │
         │    SCHEDULES    │
         │  (Auto + Manual)│
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   NURSE SHIFT   │
         │  Views Due List │
         └────────┬────────┘
                  │
         ┌────────┼────────────┐
         │        │            │
         ▼        ▼            ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │COMPLETE │ │ PATIENT │ │  UNABLE │
    │ CARE    │ │ REFUSES │ │TO PROVIDE│
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Document │ │Document │ │Document │
    │Completed│ │Refused  │ │ Missed  │
    │Findings │ │+Reason  │ │+Reason  │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         └─────┬─────┴─────┬─────┘
               │           │
               ▼           ▼
         ┌─────────┐ ┌─────────┐
         │ Check   │ │ ALERT   │
         │Infection│ │Supervisor│
         │ Flags   │ │if Missed│
         └────┬────┘ └─────────┘
              │
              ▼
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
┌─────────┐      ┌─────────┐
│NORMAL   │      │INFECTION│
│Continue │      │SUSPECTED│
└─────────┘      └────┬────┘
                      │
                      ▼
                ┌─────────┐
                │ CREATE  │
                │INFECTION│
                │ REPORT  │
                └────┬────┘
                     │
                     ▼
                ┌─────────┐
                │  IC     │
                │ REVIEW  │
                └─────────┘
```

---

## 10. Reporting & Analytics

### 10.1 Surgery Reports

| Report | Description | Metrics |
|--------|-------------|---------|
| **Surgical Volume** | Daily/weekly/monthly surgery counts | Total surgeries, by type, by surgeon |
| **Theatre Utilization** | OR efficiency metrics | Utilization %, turnover time, delays |
| **Surgical Outcomes** | Complication tracking | Complication rate, mortality, SSI rate |
| **NHIS Surgery Report** | Insurance billing report | Approved vs rejected, authorization times |
| **Anesthesia Report** | Anesthesia metrics | By type, complications, recovery times |
| **Cancellation Report** | Cancelled surgeries | Cancellation rate, reasons |
| **Surgeon Performance** | Individual metrics | Volume, outcomes, times |

### 10.2 Hygiene/Infection Reports

| Report | Description | Metrics |
|--------|-------------|---------|
| **Hygiene Compliance** | Care completion rates | Completion %, by activity type |
| **Missed Care Report** | Documentation of missed care | Frequency, reasons, by shift |
| **Infection Surveillance** | HAI tracking | SSI rate, CAUTI rate, CLABSI rate |
| **Device Days Report** | Catheter/line duration | Average days, infection per 1000 days |
| **Ward Hygiene Audit** | Ward-level compliance | By ward, by shift, trends |
| **Hand Hygiene Audit** | Compliance tracking | Compliance %, by department |

### 10.3 Dashboard Views

**Theatre Dashboard:**
```
┌───────────────────────────────────────────────────────────────┐
│                    THEATRE DASHBOARD                          │
├───────────────────────────────────────────────────────────────┤
│  Today's Schedule     │  Theatre Status      │  Stats Today   │
│  ┌─────────────────┐  │  ┌───────────────┐  │  ┌──────────┐  │
│  │ OR1: 08:00 Lap  │  │  │ OR1: In Use   │  │  │ Completed│  │
│  │ OR2: 09:00 THR  │  │  │ OR2: Cleaning │  │  │    5     │  │
│  │ OR3: 10:00 CABG │  │  │ OR3: Available│  │  └──────────┘  │
│  └─────────────────┘  │  └───────────────┘  │  ┌──────────┐  │
│                       │                      │  │ Scheduled│  │
│  ┌─────────────────┐  │  Pending Surgeries   │  │    8     │  │
│  │ Current Surgery │  │  ┌───────────────┐  │  └──────────┘  │
│  │ Pt: John Doe    │  │  │ Emergency: 2  │  │  ┌──────────┐  │
│  │ Proc: Lap Chole │  │  │ Urgent: 1     │  │  │Cancelled │  │
│  │ Surgeon: Dr. X  │  │  │ Routine: 5    │  │  │    1     │  │
│  │ Time: 45 min    │  │  └───────────────┘  │  └──────────┘  │
│  └─────────────────┘  │                      │               │
└───────────────────────────────────────────────────────────────┘
```

**Infection Control Dashboard:**
```
┌───────────────────────────────────────────────────────────────┐
│               INFECTION CONTROL DASHBOARD                      │
├───────────────────────────────────────────────────────────────┤
│  HAI Rates (This Month)    │  Active Surveillance             │
│  ┌─────────────────────┐   │  ┌─────────────────────────────┐│
│  │ SSI:  2.1% ▼        │   │  │ Post-Op Wound Monitoring: 15││
│  │ CAUTI: 1.8% ▲       │   │  │ Catheter Days >3:         8 ││
│  │ CLABSI: 0.5% ━      │   │  │ Central Line Days >7:     3 ││
│  │ VAP:   0.8% ▼       │   │  │ Isolation Patients:       4 ││
│  └─────────────────────┘   │  └─────────────────────────────┘│
│                            │                                  │
│  Hygiene Compliance        │  Alerts                          │
│  ┌─────────────────────┐   │  ┌─────────────────────────────┐│
│  │ Overall:  94%       │   │  │ ⚠️ SSI Suspected (Ward A)   ││
│  │ Wound Care: 98%     │   │  │ ⚠️ Missed Turn (ICU Bed 3) ││
│  │ Catheter:  92%      │   │  │ ✅ Hand Hygiene Audit Due  ││
│  │ Hand Hygiene: 87%   │   │  └─────────────────────────────┘│
│  └─────────────────────┘   │                                  │
└───────────────────────────────────────────────────────────────┘
```

---

## 11. UI/UX Requirements

### 11.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Clean, Professional** | Teal primary color, white backgrounds, clear typography |
| **Role-Specific Views** | Different dashboards for surgeon, nurse, IC officer |
| **Step-Based Workflows** | Wizard pattern for surgery documentation |
| **Mobile-Friendly** | Responsive hygiene forms for bedside tablets |
| **Clear Warnings** | Red blockers for missing requirements |
| **Quick Actions** | One-click common tasks (mark complete, escalate) |

### 11.2 Surgery Module UI Components

1. **Surgery Request Form** - Multi-step wizard
2. **Theatre Schedule Calendar** - Drag-drop scheduling
3. **Pre-Op Checklist** - Interactive checklist with sign-off
4. **Intra-Op Timer** - Real-time surgical phase tracking
5. **Operative Note Form** - Structured + free-text hybrid
6. **Sign-Off Panel** - Multi-signature completion

### 11.3 Hygiene Module UI Components

1. **Hygiene Due List** - Nurse's shift task list
2. **Quick Log Modal** - Fast activity logging
3. **Missed Care Form** - Mandatory reason selection
4. **Skin Assessment Chart** - Visual body map
5. **Infection Alert Card** - Priority warning display
6. **Compliance Dashboard** - Real-time metrics

### 11.4 Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode option
- Touch-friendly buttons (min 44px)

---

## 12. Implementation Plan

### 12.1 Phase 1: Database & Core API (Week 1-2)

| Task | Description | Owner |
|------|-------------|-------|
| Create migration 103 | All new tables and indexes | Backend |
| Seed hygiene catalogue | Default activity definitions | Backend |
| Seed theatre rooms | Initial room configuration | Backend |
| Surgery CRUD API | REST endpoints for surgeries | Backend |
| Hygiene CRUD API | REST endpoints for hygiene | Backend |
| Integration tests | API coverage | Backend |

### 12.2 Phase 2: Surgery Module UI (Week 3-4)

| Task | Description | Owner |
|------|-------------|-------|
| Surgery list page | View/filter surgeries | Frontend |
| Surgery wizard | Multi-step creation form | Frontend |
| Pre-op checklist | Interactive WHO checklist | Frontend |
| Operative note form | Structured documentation | Frontend |
| Theatre schedule | Calendar view | Frontend |
| Sign-off workflow | Multi-signature panel | Frontend |

### 12.3 Phase 3: Hygiene Module UI (Week 5-6)

| Task | Description | Owner |
|------|-------------|-------|
| Hygiene dashboard | Nurse's shift view | Frontend |
| Activity logging | Quick-log modal | Frontend |
| Missed care form | Reason documentation | Frontend |
| Infection alerts | Alert cards & notifications | Frontend |
| Schedule management | Activity scheduling | Frontend |
| Compliance reports | Analytics views | Frontend |

### 12.4 Phase 4: Integration & Polish (Week 7-8)

| Task | Description | Owner |
|------|-------------|-------|
| NHIS integration | Approval workflow | Full Stack |
| Billing integration | Auto-billing on completion | Full Stack |
| Notifications | Real-time alerts | Full Stack |
| Reporting | Dashboard development | Full Stack |
| UAT | User acceptance testing | QA |
| Documentation | User guides | All |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| ASA | American Society of Anesthesiologists physical status classification |
| CAUTI | Catheter-Associated Urinary Tract Infection |
| CLABSI | Central Line-Associated Bloodstream Infection |
| HAI | Healthcare-Associated Infection |
| OR | Operating Room |
| PACU | Post-Anesthesia Care Unit |
| SSI | Surgical Site Infection |
| VAP | Ventilator-Associated Pneumonia |
| WHO | World Health Organization (Safe Surgery Checklist) |

---

## Appendix B: References

- WHO Safe Surgery Checklist
- CDC/NHSN HAI Definitions
- AORN Perioperative Standards
- Hospital Infection Control Guidelines (HICPAC)
- NHIS Service Catalogue Standards

---

**Document Control:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-03 | EMR Team | Initial PRD |

---

*End of Document*
