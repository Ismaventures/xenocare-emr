# Patient Medical Records View - Execution Plan

## Overview
A comprehensive, problem-oriented medical records view for doctors to quickly navigate patient history during consultations.

---

## Phase 1: Data Layer & API (Priority: HIGH)

### 1.1 Enhance API Types & DTOs
**File:** `src/renderer/modules/clinical-consultation/api/medical-records.api.ts`

```typescript
// New types to create:
interface PatientProblem {
  id: string;
  name: string;
  icd_code?: string;
  status: 'Active' | 'Resolved' | 'Chronic' | 'Monitoring';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  onset_date: string;
  last_reviewed: string;
  related_encounters: string[];
  current_medications: MedicationSummary[];
}

interface EncounterSummary {
  encounter_id: string;
  encounter_number: string;
  encounter_date: string;
  visit_type: string;
  chief_complaint: string;
  diagnosis: string[];
  doctor: { name: string; specialty?: string };
  status: string;
  has_labs: boolean;
  has_imaging: boolean;
  has_prescriptions: boolean;
}

interface PatientMedicalRecordView {
  patient: PatientHeaderData;
  problems: PatientProblem[];
  encounters: EncounterSummary[];
  current_medications: MedicationSummary[];
  allergies: AllergyInfo[];
  vitals_trend: VitalsTrend[];
  stats: RecordStats;
}
```

### 1.2 API Functions
- `getPatientMedicalRecordView(patientId, filters)` - Main aggregated view
- `getPatientProblems(patientId)` - Problem list with status
- `getEncountersByProblem(patientId, problemId, pagination)` - Lazy loaded
- `getEncounterDetails(encounterId)` - Full encounter with tabs data
- `getPatientVitalsTrend(patientId, timeframe)` - For charts

---

## Phase 2: Component Architecture

### 2.1 Component Tree
```
PatientMedicalRecordsPage/
├── PatientStickyHeader/           (Phase 2.2)
│   ├── PatientIdentity
│   ├── CriticalAlerts (allergies, alerts)
│   └── QuickActions
│
├── ContentLayout/
│   ├── LeftSidebar/ (collapsible)    (Phase 2.3)
│   │   ├── PatientStorySummary
│   │   ├── TimeFilter
│   │   └── ProblemsList
│   │
│   └── MainPanel/                    (Phase 2.4)
│       ├── ProblemSummaryCard
│       ├── EncounterTimeline
│       └── EncounterDetailDrawer
│
└── FullHistoryModal/                 (Phase 2.5)
```

### 2.2 PatientStickyHeader Component
**File:** `src/renderer/modules/clinical-consultation/components/medical-records/PatientStickyHeader.tsx`

Features:
- Patient photo, name, age, gender, EMR number
- Blood group badge
- NHIS/Insurance status badge
- Allergies with red alert styling
- Critical info banner (if any)
- Sticky positioning on scroll

### 2.3 PatientStoryPanel Component  
**File:** `src/renderer/modules/clinical-consultation/components/medical-records/PatientStoryPanel.tsx`

Features:
- Patient summary narrative
- Active problems count
- Current medications count
- Last visit info
- Time filter (3m, 6m, 1y, All)
- ProblemsList with color coding:
  - Green: Stable/Resolved
  - Yellow: Monitoring/Caution
  - Red: Critical/Active high severity
- Click problem → filter main panel

### 2.4 MainRecordsPanel Component
**File:** `src/renderer/modules/clinical-consultation/components/medical-records/MainRecordsPanel.tsx`

Subcomponents:
- **ProblemSummaryCard**: Status, vitals snapshot, current meds, last review
- **EncounterTimeline**: Chronological list (lazy loaded, 10 at a time)
- **EncounterCard**: Collapsed view with expand capability

### 2.5 EncounterDetailDrawer Component
**File:** `src/renderer/modules/clinical-consultation/components/medical-records/EncounterDetailDrawer.tsx`

Tabs:
1. Clinical Notes (SOAP format)
2. Medications (with change highlights)
3. Lab Results (with abnormal flags)
4. Imaging (thumbnails + reports)
5. Plan & Follow-up

---

## Phase 3: State Management & Hooks

### 3.1 Custom Hooks
**File:** `src/renderer/modules/clinical-consultation/hooks/useMedicalRecords.ts`

```typescript
// Hooks to create:
usePatientMedicalRecords(patientId)
usePatientProblems(patientId)
useEncountersByProblem(patientId, problemId, options)
useEncounterDetails(encounterId)
useVitalsTrend(patientId, timeframe)
```

### 3.2 Context (Optional)
**File:** `src/renderer/modules/clinical-consultation/contexts/MedicalRecordsContext.tsx`

For sharing:
- Selected problem
- Time filter
- Active encounter
- Panel visibility states

---

## Phase 4: Integration & Routing

### 4.1 Add Route
**File:** `src/renderer/config/menu.ts` (update)

Add menu item: "Medical Records" under Clinical section

### 4.2 Entry Point
**File:** `src/renderer/modules/clinical-consultation/pages/MedicalRecordsPage.tsx`

- Receives patientId from URL or context
- Orchestrates all components
- Handles responsive layout

---

## Phase 5: Mobile Responsiveness

### 5.1 Responsive Behaviors
- **Desktop (>1024px)**: 3-column layout (sidebar + main + drawer)
- **Tablet (768-1024px)**: 2-column (sidebar accordion + main)
- **Mobile (<768px)**: Single column, stacked sections, full-screen modals

### 5.2 Mobile Components
- Collapsible accordion for sidebar
- Bottom sheet for encounter details
- Swipeable tabs

---

## Phase 6: Performance Optimization

### 6.1 Lazy Loading Strategy
- Initial load: Patient header + problems + last 10 encounters
- Scroll pagination: Load 10 more encounters on scroll
- Problem filter: Re-fetch filtered encounters
- Encounter details: Load on expand

### 6.2 Caching Strategy
- Cache patient header for session
- Cache problem list (invalidate on new consultation)
- Don't cache encounter list (always fresh)

---

## Phase 7: Testing

### 7.1 Unit Tests
- PatientStickyHeader rendering
- ProblemsList filtering
- EncounterCard expansion
- TimeFilter state changes

### 7.2 Integration Tests  
- Full page load with mock data
- Problem → Encounter filtering
- Lazy loading behavior
- Mobile responsive behavior

---

## Implementation Order

| Phase | Priority | Estimated Time | Dependencies |
|-------|----------|----------------|--------------|
| 1.1 Types/DTOs | HIGH | 1 hour | None |
| 1.2 API Functions | HIGH | 2 hours | 1.1 |
| 2.2 PatientStickyHeader | HIGH | 1.5 hours | 1.1 |
| 2.3 PatientStoryPanel | HIGH | 2 hours | 1.2 |
| 2.4 MainRecordsPanel | HIGH | 3 hours | 1.2, 2.3 |
| 2.5 EncounterDetailDrawer | MEDIUM | 2 hours | 2.4 |
| 3.1 Hooks | HIGH | 1 hour | 1.2 |
| 4.1-4.2 Integration | MEDIUM | 1 hour | All above |
| 5.x Mobile | MEDIUM | 2 hours | 4.x |
| 6.x Performance | LOW | 1 hour | 5.x |
| 7.x Testing | LOW | 2 hours | All |

**Total Estimated Time:** ~18 hours

---

## Data Mapping to Existing Tables

| UI Field | Database Table | Column(s) |
|----------|---------------|-----------|
| Patient Name | patients | first_name, middle_name, surname |
| Age | patients | date_of_birth (calculated) |
| EMR Number | patients | emr_number |
| Blood Group | patients | blood_group |
| NHIS Status | patients | patient_category, insurance_type |
| Allergies | patients | known_allergies |
| Problems | consultations | diagnosis (needs problem extraction) |
| Encounters | visits | All encounter data |
| Vitals | nursing_care | vital_signs |
| Labs | lab_requests, lab_results | * |
| Imaging | radiology_requests, scan_results | * |
| Medications | prescriptions | * |

---

## Ready to Execute?

Reply with "PROCEED" to start implementation in the following order:
1. API types and functions
2. PatientStickyHeader component
3. PatientStoryPanel with ProblemsList
4. MainRecordsPanel with EncounterTimeline
5. EncounterDetailDrawer
6. Integration and routing
7. Mobile responsiveness
8. Performance optimizations
