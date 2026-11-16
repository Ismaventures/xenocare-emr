# Nursing Module Encounter Integration

## 🎯 Fundamental Principle
> **"One encounter, many roles, different permissions."**

The Nursing Module is NOT a separate system — it is a **role-filtered VIEW** of the existing encounter-centric patient record.

---

## 📋 Integration Summary

| Aspect | Implementation |
|--------|----------------|
| **Encounter Model** | Single shared encounter (visits table) |
| **Data Linkage** | All nursing records reference same `encounter_id` |
| **State Control** | Encounters controlled by clinical workflow, not nursing |
| **Default Behavior** | Auto-select patient's active encounter |
| **Historical Access** | Read-only for completed/closed encounters |

---

## 👥 Role-Based Access Table

### Data Access Matrix

| Data Type | Consultant/Doctor | Nurse |
|-----------|-------------------|-------|
| Patient Demographics | Full Access | Full Access |
| Chief Complaint | Edit | View Only |
| **Vitals** | View + Order | **View + Record** |
| **Nursing Notes** | View | **View + Create** |
| Clinical Notes (SOAP) | Full Access | View Summary Only |
| Diagnosis | Full Access | View Only |
| Treatment Plan | Create + Edit | **View + Execute Tasks** |
| Lab Orders | Create + View | View + Acknowledge |
| Radiology Orders | Create + View | View + Acknowledge |
| Prescriptions | Create + Edit | View + Administer |
| Procedure Orders | Create + Edit | View + Assist |
| Progress Notes | Full Access | View Summary |
| Ward Round Notes | Create + Edit | View Only |
| **Shift Handover** | View | **Create + Edit** |
| **Medication Admin** | View | **Create + Edit** |
| Encounter Close | Yes | No |
| Encounter Reopen | Request | No |
| Historical Encounters | Full Access | **Read Only** |

### Write Permissions Summary

**Nurses CAN write:**
- ✅ Vitals
- ✅ Nursing Notes
- ✅ Medication Administration Records
- ✅ Shift Handover Notes
- ✅ Treatment Task Status Updates (execute/complete)

**Nurses CANNOT write:**
- ❌ Clinical Notes
- ❌ Diagnoses
- ❌ Orders (lab, radiology, prescriptions)
- ❌ Treatment Plans
- ❌ Doctor's Notes

---

## 🔄 Encounter-Scoped Data Flow

```
                    ┌─────────────────────────────────────────┐
                    │         ENCOUNTER (visits table)         │
                    │  id: UUID (encounter_id for all records) │
                    │  patient_id: FK to patients              │
                    │  status: Active | Completed | Closed     │
                    │  attending_doctor_id: FK to staff        │
                    └──────────────────┬──────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
 ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
 │   VITALS      │           │ NURSING_NOTES │           │ TREATMENT_    │
 │ encounter_id  │           │ encounter_id  │           │ PLANS         │
 │ patient_id    │           │ patient_id    │           │ encounter_id  │
 │ nurse_id      │           │ recorded_by   │           │ patient_id    │
 │               │           │               │           │ created_by    │
 │ NURSE: Write  │           │ NURSE: Write  │           │ NURSE: View   │
 │ DOCTOR: View  │           │ DOCTOR: View  │           │ DOCTOR: Full  │
 └───────────────┘           └───────────────┘           └───────────────┘
```

---

## 🖥️ UI Behavior Rules

### 1. Encounter Selection
- **Default**: Auto-select patient's ACTIVE encounter
- **Dropdown**: Shows all patient encounters for historical review
- **Indicators**:
  - 🟢 Green = Active encounter (full functionality)
  - 🔒 Gray = Closed encounter (read-only)
  - 🟡 Amber = Historical encounter (read-only)

### 2. Dynamic Filtering
- All displayed records filter by selected `encounter_id`
- Switching encounters refreshes all tabs
- No cross-encounter data mixing

### 3. Input State Management
```typescript
if (encounter.status === 'Active') {
  // Enable all nurse-writable fields
  enableVitalsForm();
  enableNursingNotesForm();
  enableMedicationAdminForm();
} else {
  // Disable all inputs, show read-only badge
  disableAllInputs();
  showReadOnlyBanner("This encounter is closed. View only.");
}
```

### 4. Visual Indicators
| State | Indicator |
|-------|-----------|
| Write-allowed | Normal styling |
| Read-only section | Muted colors, 🔒 icon |
| Historical encounter | Yellow warning banner |
| Closed encounter | Gray overlay, "READ ONLY" watermark |

---

## 🔒 Security Enforcement Layers

### 1. Query Level
- All nursing queries include `encounter_id` filter
- Historical queries marked as read-only
- No cross-encounter joins

### 2. API Level
- `validateNursingAction()` checks encounter status before write
- Returns 403 Forbidden for closed encounter writes
- All actions logged with encounter context

### 3. Database/RLS Level
- `is_encounter_writable()` function checks status
- INSERT/UPDATE policies enforce Active status
- Audit triggers log all changes

---

## 📁 Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/renderer/lib/encounter/nursing-integration.ts` | Core integration types and utilities |
| `src/renderer/modules/nursing/hooks/useNursingEncounter.ts` | Encounter state management hook |
| `src/renderer/modules/nursing/components/EncounterSelector.tsx` | UI for encounter switching |
| `src/renderer/modules/nursing/components/ReadOnlyBanner.tsx` | Visual indicator for read-only state |
| `migrations/054_nursing_role_based_access.sql` | RLS policies for nursing tables |

### Modified Files
| File | Changes |
|------|---------|
| `PatientCarePanel.tsx` | Added encounter selector, read-only enforcement |

---

## 🧪 Validation Checklist

- [x] Single encounter model serves all roles
- [x] Nurses have limited visibility (no clinical reasoning)
- [x] Write operations restricted to Active encounters
- [x] Historical encounters are read-only
- [x] Clear visual indicators for state
- [x] RLS policies enforce access control
- [x] Audit logging for all nursing actions

---

## 🏥 Clinical, Legal, and Audit Rationale

### Why One Encounter Model?
1. **Continuity of Care** - Single timeline for all providers
2. **Medico-Legal Compliance** - Single audit trail
3. **Billing Accuracy** - All services tied to one encounter

### Why Limited Nurse Visibility?
1. **Scope of Practice** - Nursing scope excludes diagnosis
2. **Clinical Integrity** - Unbiased nursing observations
3. **Legal Protection** - Clear separation of responsibilities

### Risks Prevented
1. ✅ Documentation contamination
2. ✅ Unauthorized modifications
3. ✅ Audit trail breaks
4. ✅ Workflow bypasses

---

## 🚀 Migration Instructions

Run migration 054 in Supabase SQL Editor:
```sql
-- See migrations/054_nursing_role_based_access.sql
```

This creates:
- RLS policies for vitals, nursing_notes, treatment_plans
- Helper functions: `is_encounter_writable()`, `nurse_has_encounter_access()`
- Audit logging table and triggers
- New tables: `shift_handover`, `medication_administration`
