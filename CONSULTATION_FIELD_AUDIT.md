# Consultation Wizard Field Audit Report
Generated: 2026-01-30

## ✅ FIELDS CORRECTLY MAPPED (Form → Database)

| Form Field | DB Column | Type | Status |
|------------|-----------|------|--------|
| `patient_id` | `patient_id` | VARCHAR(50) | ✅ Working |
| `visit_id` | `visit_id` | VARCHAR(50) | ✅ Resolved from encounter |
| `encounter_id` | `encounter_id` | UUID | ✅ Required, NOT NULL |
| `clinic_id` | `clinic_id` | VARCHAR(50) | ✅ **FIXED** - Now auto-populated from encounter |
| `complaints` | `complaints` | TEXT | ✅ Working |
| `clinical_notes` | `clinical_notes` | TEXT | ✅ Working |
| `history_of_present_illness` | `history_of_present_illness` | TEXT | ✅ Working |
| `past_medical_history` | `past_medical_history` | TEXT | ✅ Working |
| `family_history` | `family_history` | TEXT | ✅ Working |
| `social_history` | `social_history` | TEXT | ✅ Working |
| `review_of_systems` | `review_of_systems` | TEXT | ✅ Working |
| `examination_findings` | `examination_findings` | TEXT | ✅ Working |
| `physical_examination` | `physical_examination` | TEXT | ✅ Working |
| `diagnosis` | `diagnosis` | TEXT[] | ✅ Converted string→array |
| `differential_diagnosis` | `differential_diagnosis` | TEXT[] | ✅ Working |
| `treatment_plan` | `treatment_plan` | TEXT | ✅ Working |
| `recommendations` | `recommendations` | TEXT | ✅ Working |
| `follow_up_date` | `follow_up_date` | TIMESTAMP | ✅ Sanitized |
| `follow_up_notes` | `follow_up_notes` | TEXT | ✅ Working |
| `icd10_codes` | `icd10_codes` | JSONB | ✅ Working |

## 🔧 FIXES APPLIED

### Fix 1: `clinic_id` Now Auto-Populated
**Files Changed:**
- `src/renderer/modules/clinical-consultation/dtos/consultation.dto.ts` - Added `clinic_id` to DTO
- `src/renderer/modules/clinical-consultation/api/consultation.api.ts` - Added clinic_id resolution from encounter

**What Changed:**
The consultation API now automatically fetches `clinic_id` from the visits table when resolving the encounter. This ensures consultations are properly linked to the clinic they were performed in.

## ⚠️ INFORMATIONAL (Not Bugs)

### Legacy SOAP Fields Not Used
**Severity:** Low (informational)  
**Columns:** `subjective`, `objective`, `assessment`, `plan`, `notes`, `diagnosis_text`

These are legacy columns from an older SOAP-based schema. The new wizard uses more granular fields:
- `history_of_present_illness` + `complaints` → replaces `subjective`
- `examination_findings` + `physical_examination` → replaces `objective`
- `diagnosis` + `icd10_codes` → replaces `assessment`
- `treatment_plan` + `recommendations` → replaces `plan`

### Timing Fields Not Populated
**Severity:** Low  
**Columns:** `started_at`, `ended_at`

These could be useful for tracking consultation duration but are not currently used.

## ✅ SUMMARY

**All user-entered data IS being saved correctly to the database.**

The only fix applied was auto-populating `clinic_id` from the encounter, which was previously NULL.
