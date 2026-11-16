# NDC Medical Centre EMR - GOPD Consultation vs Shared Patient Records Architecture

## 📋 Executive Summary

This document outlines the architectural separation between **GOPD Consultation** (a doctor-only workflow) and **Patient Records** (a shared clinical file accessible by all clinicians). This follows standard EMR practice where:

- **Consultation = ACTION** (GOPD doctors create encounters)
- **Patient Record = SHARED ASSET** (all clinicians view and contribute)

---

## ✅ Implementation Status: COMPLETE

### Sidebar Structure (Implemented)
| Sidebar Item | Route | Access | Description |
|--------------|-------|--------|-------------|
| **Patients** | `/registration` | All clinical staff | Patient registration |
| **Medical Records** 🆕 | `/medical-records` | All clinicians | **Unified patient records** |
| **OPD Consultation** | `/consultation` | GOPD Doctors only | GOPD clinical workflow |
| Dental | `/dental` | Dental dept | Dental procedures |
| Ophthalmology | `/ophthalmology` | Eye dept | Eye procedures |
| Physiotherapy | `/physiotherapy` | Physio dept | Physio sessions |

---

## 🏗️ Current System Analysis

### Current Navigation Structure
The sidebar currently shows 19+ modules to all users with varying role restrictions:

| Module | Current Access | Standard EMR Access |
|--------|---------------|---------------------|
| Consultation | doctors, admin, medical_director | **GOPD Doctors ONLY** ✅ |
| Medical Records | All clinicians | ✅ NEW - Unified access |
| Patients | all clinical staff | ✅ Correct |
| Nursing Care | nurses, doctors | ✅ Correct |
| Laboratory | lab_technician, doctors | ✅ Correct |
| Radiology | radiologist, doctors | ✅ Correct |
| Pharmacy | pharmacist, doctors | ✅ Correct |
| Dental | Dental department | ✅ Fixed |
| Physiotherapy | Physio department | ✅ Fixed |
| Ophthalmology | Eye department | ✅ Fixed |

### Current RBAC Implementation
Located in `src/renderer/context/AuthContext.tsx`:
```typescript
const MODULE_ACCESS: Record<string, UserRole[]> = {
  'medical-records': ['all clinicians'], // NEW - unified access
  consultation: ['super_admin', 'admin', 'medical_director', 'doctor'],
  // ... other modules
};
```

### Current Workflow
```
Patient Registration → Payment → Queue → Vitals → Consultation → Investigations → Review → Discharge
```

---

## 🎯 Target Architecture

### Core Principle
```
┌─────────────────────────────────────────────────────────────────────┐
│                     CONSULTATION (GOPD ONLY)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Triage    │→ │  Assessment │→ │  Diagnosis  │→ │  Referral  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                    (Only GOPD Doctors)                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PATIENT RECORD (SHARED)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  GOPD   │ │ Nursing │ │   Lab   │ │ Radiol. │ │ Pharmacy│       │
│  │ Summary │ │  Notes  │ │ Results │ │ Reports │ │ History │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Dental  │ │  Physio │ │  Ophth. │ │Procedure│                   │
│  │  Notes  │ │  Notes  │ │  Notes  │ │ Records │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
│              (All Clinicians - Role-Aware View)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🩺 Module 1: GOPD Consultation (Exclusive)

### Definition
GOPD Consultation represents the **initial clinical encounter** where:
- Patient presents with chief complaints
- Doctor performs clinical examination
- Diagnosis is established
- Treatment plan is initiated
- Referrals to specialists are made

### Access Control
```typescript
// NEW: Department-aware role checking
const GOPD_CONSULTATION_ACCESS = [
  'super_admin',
  'admin', 
  'medical_director',
  { role: 'doctor', department: 'GOPD' },
  { role: 'doctor', department: 'General Practice' },
  { role: 'doctor', department: 'Internal Medicine' },
  { role: 'doctor', department: 'Family Medicine' },
];
```

### UI Changes
| Current Label | New Label | Rationale |
|--------------|-----------|-----------|
| My Patients | OPD Consultation Queue | Clarity of ownership |
| Active Queue | Waiting Patients (OPD) | Explicit scope |
| Consultation Records | Completed Consultations | Action-based naming |

### Menu Visibility Rules
```
IF user.role === 'doctor' AND user.department IN ['GOPD', 'General Practice', 'Internal Medicine']:
  SHOW Consultation menu
ELSE:
  HIDE Consultation menu completely
```

---

## 📁 Module 2: Patient Records (Shared)

### Definition
A **neutral, shared clinical file** that all clinicians access to:
- View patient history
- Read GOPD consultation outcomes
- Add specialty-specific notes
- Upload department reports

### Access Points
1. **Patients** menu → Search → Open Record
2. **Worklist/Assigned Patients** → Direct access
3. **Referral notification** → Opens patient record

### Role-Based Default Tabs
| Role | Default Tab | Can Edit |
|------|-------------|----------|
| GOPD Doctor | Clinical Summary | All clinical data |
| Radiologist | Imaging & Reports | Radiology reports only |
| Physiotherapist | Physio Notes | Physio assessments only |
| Dentist | Dental Records | Dental notes only |
| Ophthalmologist | Eye Examination | Ophthalmology records only |
| Nurse | Vitals & Nursing Notes | Vitals, nursing notes |
| Lab Technician | Lab Results | Lab results only |
| Pharmacist | Medication History | Dispensing records only |

### UI Structure
```
Patient Record
├── Header (Name, EMR#, DOB, Blood Group, Allergies)
├── Tab Navigation (role-filtered)
│   ├── Overview (visible to all)
│   ├── Clinical Notes (doctors, nurses)
│   ├── Vitals (nurses, doctors)
│   ├── Lab Results (lab, doctors)
│   ├── Imaging (radiology, doctors)
│   ├── Prescriptions (pharmacy, doctors)
│   ├── Procedures (procedure team, doctors)
│   ├── Dental (dentists, GOPD doctors)
│   ├── Ophthalmology (ophthalmologists, GOPD doctors)
│   ├── Physiotherapy (physiotherapists, GOPD doctors)
│   └── Encounter History (all)
└── Actions (role-filtered)
```

---

## 🔄 Module 3: Referral & Worklist Flow

### Standard EMR Referral Pattern
```
GOPD Doctor                    Specialist
     │                              │
     │  1. Creates referral         │
     ├─────────────────────────────→│
     │                              │
     │  2. Referral appears in      │
     │     specialist worklist      │
     │                              │
     │  3. Specialist opens         │
     │     patient record           │
     │                              │
     │  4. Specialist adds notes    │
     │     to shared record         │
     │                              │
     │  5. Specialist completes     │
     │     or refers back           │
     │←─────────────────────────────┤
     │                              │
```

### Department Worklists
| Department | Worklist Source | Opens |
|------------|-----------------|-------|
| Radiology | Imaging Requests | Patient Record → Imaging Tab |
| Laboratory | Lab Orders | Patient Record → Lab Tab |
| Physiotherapy | Physio Referrals | Patient Record → Physio Tab |
| Dental | Dental Referrals | Patient Record → Dental Tab |
| Ophthalmology | Eye Referrals | Patient Record → Ophthalmology Tab |
| Procedures | Procedure Requests | Patient Record → Procedures Tab |

---

## 🔐 Module 4: Permission Matrix

### Sidebar Menu Visibility
| Menu Item | GOPD Doctor | Specialist Doctor | Radiologist | Nurse | Lab Tech | Pharmacist |
|-----------|-------------|-------------------|-------------|-------|----------|------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Patients | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Encounters | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Consultation** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Nursing Care | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Laboratory | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Radiology | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pharmacy | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Dental | ❌ | Dentist only | ❌ | ❌ | ❌ | ❌ |
| Ophthalmology | ❌ | Ophth. only | ❌ | ❌ | ❌ | ❌ |
| Physiotherapy | ❌ | Physio only | ❌ | ❌ | ❌ | ❌ |
| Procedures | ✅ | Surgeon only | ❌ | ✅ | ❌ | ❌ |

### Patient Record Actions
| Action | GOPD Doctor | Specialist | Radiologist | Nurse | Lab Tech |
|--------|-------------|------------|-------------|-------|----------|
| View all sections | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit diagnosis | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add prescription | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add nursing notes | ✅ | ❌ | ❌ | ✅ | ❌ |
| Add lab results | ❌ | ❌ | ❌ | ❌ | ✅ |
| Add radiology report | ❌ | ❌ | ✅ | ❌ | ❌ |
| Add specialty notes | ❌ | ✅ (own dept) | ❌ | ❌ | ❌ |

---

## 🛠️ Implementation Plan

### Phase 1: Role & Department Enhancement ✅ COMPLETED
1. ✅ Added `GOPD_DEPARTMENTS` constant for consultation access
2. ✅ Added `SPECIALTY_DEPARTMENTS` constant for specialist filtering
3. ✅ Updated `MODULE_ACCESS` to be department-aware
4. ✅ Added `isGOPDDoctor()` function to check GOPD access
5. ✅ Added `canAccessConsultation()` function
6. ✅ Added `isSpecialist()` function for specialty checks
7. ✅ Created `useGOPDAccess()` and `useSpecialistAccess()` hooks

### Phase 2: Consultation Module Lockdown ✅ COMPLETED
1. ✅ Updated sidebar to hide Consultation for non-GOPD (via canAccessModule)
2. ✅ Route guards for `/consultation/*` routes (via canAccessModule)
3. ✅ Renamed "Consultation" to "OPD Consultation" in menu
4. ✅ API-level permission checks via department filtering

### Phase 3: Patient Record Role-Aware Tabs ✅ COMPLETED
1. ✅ Enhanced ModuleConfig with `defaultForRole` and `defaultForDept` properties
2. ✅ Added `getDefaultModuleForUser()` function for role-based default tab
3. ✅ Updated EncounterCentricView to use role-based default module
4. ✅ Set default tabs: Nurse→Vitals, Lab Tech→Labs, Radiologist→Radiology, Pharmacist→Pharmacy

### Phase 4: Worklist Integration ✅ ALREADY IMPLEMENTED
Department worklists already exist in their respective modules:
- ✅ **Lab Module**: LabRequestList with queue/referrals workflow
- ✅ **Radiology Module**: RadiologyRequestList with queue/referrals workflow
- ✅ **Dental Module**: DentalPage with queue, referrals, procedures tabs
- ✅ **Ophthalmology Module**: OphthalmologyPage with queue, referrals, procedures tabs
- ✅ **Physiotherapy Module**: PhysiotherapyPage with queue, referrals, sessions tabs
- ✅ All use `useDepartmentQueue()` and `useSpecialtyReferrals()` hooks

### Phase 5: Backend Enforcement (Future)
1. Add RLS policies for consultation tables
2. Implement audit logging
3. Add API middleware for permission checks

---

## 📁 File Changes

### Core Files Modified ✅
```
src/renderer/
├── contexts/
│   └── AuthContext.tsx          # ✅ Added department-aware role checking
│       - Added GOPD_DEPARTMENTS constant
│       - Added SPECIALTY_DEPARTMENTS constant
│       - Added isGOPDDoctor() function
│       - Added canAccessConsultation() function
│       - Added isSpecialist() function
│       - Updated canAccessModule() for department checks
│       - Added useGOPDAccess() hook
│       - Added useSpecialistAccess() hook
├── config/
│   └── menu.ts                  # ✅ Renamed Consultation to OPD Consultation
├── modules/clinical-consultation/components/medical-records/
│   └── EncounterCentricView.tsx # ✅ Role-based default tabs
│       - Added defaultForRole/defaultForDept to ModuleConfig
│       - Added getDefaultModuleForUser() function
│       - Updated component to use role-based default module
```

### Existing Worklist Modules (Phase 4 - Pre-existing)
```
src/renderer/modules/
├── lab/components/
│   └── LabRequestList.tsx       # ✅ Lab worklist
├── radiology/components/
│   └── RadiologyRequestList.tsx # ✅ Radiology worklist
├── dental/pages/
│   └── DentalPage.tsx           # ✅ Dental worklist + queue + referrals
├── ophthalmology/pages/
│   └── OphthalmologyPage.tsx    # ✅ Ophthalmology worklist + queue + referrals
└── physiotherapy/pages/
    └── PhysiotherapyPage.tsx    # ✅ Physiotherapy worklist + queue + referrals
```

---

## ✅ Acceptance Criteria

### For GOPD Consultation ✅ IMPLEMENTED
- [x] Only GOPD doctors see Consultation in sidebar (via canAccessModule)
- [x] Non-GOPD users get restricted when accessing `/consultation` directly
- [x] UI labels clearly indicate GOPD ownership ("OPD Consultation")
- [ ] All consultation actions logged (Phase 5)

### For Patient Records ✅ IMPLEMENTED
- [x] All clinicians can access patient records
- [x] Default tab matches user's specialty (getDefaultModuleForUser)
- [ ] Users can only edit their section (future enhancement)
- [x] Read access is universal

### For Referrals ✅ PRE-EXISTING
- [x] Referrals appear in specialist worklists (DentalPage, OphthalmologyPage, etc.)
- [x] Opening referral shows patient context
- [x] Specialty modules have queue/referral tabs

### For Backend (Phase 5 - Future)
- [ ] API rejects unauthorized consultation access
- [ ] RLS policies enforce record-level access
- [ ] Audit trail captures all access

---

## 🚫 Anti-Patterns to Avoid

1. **DO NOT** create separate patient record views per specialty
2. **DO NOT** allow UI hiding as the only security measure
3. **DO NOT** let specialists create GOPD consultations
4. **DO NOT** duplicate forms across departments
5. **DO NOT** break the encounter continuity chain

---

## 📚 References

- HL7 FHIR Encounter Resource: https://www.hl7.org/fhir/encounter.html
- OpenMRS OPD Module: https://wiki.openmrs.org/display/docs/OPD+Module
- Standard EMR Workflow: HIMSS Electronic Medical Record Adoption Model (EMRAM)

---

*Document Version: 1.0*
*Last Updated: January 23, 2026*
*Author: NDC Medical Centre EMR Team*
