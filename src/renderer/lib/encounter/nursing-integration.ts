/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - NURSING MODULE ENCOUNTER INTEGRATION
 * =============================================================================
 *
 * Clinical Informatics & EMR Access Control Architecture
 *
 * FUNDAMENTAL PRINCIPLE:
 * "One encounter, many roles, different permissions."
 *
 * The nursing module is NOT a separate system - it is a role-filtered VIEW
 * of the existing encounter-centric patient record.
 *
 * =============================================================================
 * INTEGRATION SUMMARY
 * =============================================================================
 *
 * 1. SINGLE ENCOUNTER MODEL
 *    - All nursing records (vitals, notes, medication admin, handover) reference
 *      the SAME encounter_id used by doctors
 *    - No parallel nursing encounters or nursing-specific visit records
 *    - The encounter lifecycle (Created → Active → Completed → Closed) is
 *      controlled by the clinical workflow, not the nursing module
 *
 * 2. ENCOUNTER STATE ENFORCEMENT
 *    - ACTIVE encounters: Full nurse write access (vitals, notes, med admin)
 *    - COMPLETED/CLOSED encounters: Read-only access for review
 *    - Write operations validate encounter status before execution
 *
 * 3. ROLE-BASED VISIBILITY
 *    - Nurses see a filtered subset of encounter data
 *    - Hidden: Doctor's clinical reasoning, diagnostic decision logic
 *    - Visible: Treatment plans (view-only), orders (execute/acknowledge)
 *
 * =============================================================================
 * ROLE-BASED ACCESS TABLE
 * =============================================================================
 *
 * | Data Type               | Consultant/Doctor | Nurse               |
 * |-------------------------|-------------------|---------------------|
 * | Patient Demographics    | Full Access       | Full Access         |
 * | Chief Complaint         | Edit              | View Only           |
 * | Vitals                  | View + Order      | View + Record       |
 * | Nursing Notes           | View              | View + Create       |
 * | Clinical Notes (SOAP)   | Full Access       | View Summary Only   |
 * | Diagnosis               | Full Access       | View Only           |
 * | Treatment Plan          | Create + Edit     | View + Execute Tasks|
 * | Lab Orders              | Create + View     | View + Acknowledge  |
 * | Radiology Orders        | Create + View     | View + Acknowledge  |
 * | Prescriptions           | Create + Edit     | View + Administer   |
 * | Procedure Orders        | Create + Edit     | View + Assist       |
 * | Progress Notes          | Full Access       | View Summary        |
 * | Ward Round Notes        | Create + Edit     | View Only           |
 * | Shift Handover          | View              | Create + Edit       |
 * | Medication Admin Record | View              | Create + Edit       |
 * | Encounter Close         | Yes               | No                  |
 * | Encounter Reopen        | Request           | No                  |
 * | Historical Encounters   | Full Access       | Read Only           |
 *
 * =============================================================================
 * ENCOUNTER-SCOPED DATA FLOW
 * =============================================================================
 *
 *                    ┌─────────────────────────────────────────┐
 *                    │         ENCOUNTER (visits table)         │
 *                    │  id: UUID (encounter_id for all records) │
 *                    │  patient_id: FK to patients              │
 *                    │  status: Active | Completed | Closed     │
 *                    │  attending_doctor_id: FK to staff        │
 *                    └──────────────────┬──────────────────────┘
 *                                       │
 *         ┌─────────────────────────────┼─────────────────────────────┐
 *         │                             │                             │
 *         ▼                             ▼                             ▼
 * ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
 * │   VITALS      │           │ NURSING_NOTES │           │ TREATMENT_    │
 * │ encounter_id  │           │ encounter_id  │           │ PLANS         │
 * │ patient_id    │           │ patient_id    │           │ encounter_id  │
 * │ nurse_id      │           │ recorded_by   │           │ patient_id    │
 * │               │           │               │           │ created_by    │
 * │ NURSE: Write  │           │ NURSE: Write  │           │ NURSE: View   │
 * │ DOCTOR: View  │           │ DOCTOR: View  │           │ DOCTOR: Full  │
 * └───────────────┘           └───────────────┘           └───────────────┘
 *         │                             │                             │
 *         └─────────────────────────────┼─────────────────────────────┘
 *                                       │
 *         ┌─────────────────────────────┼─────────────────────────────┐
 *         │                             │                             │
 *         ▼                             ▼                             ▼
 * ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
 * │ MEDICATION_   │           │ SHIFT_        │           │ LAB_REQUESTS  │
 * │ ADMIN         │           │ HANDOVER      │           │ encounter_id  │
 * │ encounter_id  │           │ encounter_id  │           │               │
 * │ administered_ │           │ from_nurse_id │           │ NURSE: View   │
 * │ by (nurse)    │           │ to_nurse_id   │           │ DOCTOR: Full  │
 * │               │           │               │           │               │
 * │ NURSE: Write  │           │ NURSE: Write  │           │ Acknowledge   │
 * │ DOCTOR: View  │           │ DOCTOR: View  │           │ only for nurse│
 * └───────────────┘           └───────────────┘           └───────────────┘
 *
 * =============================================================================
 * UI BEHAVIOR RULES
 * =============================================================================
 *
 * 1. ENCOUNTER SELECTION
 *    - Default to patient's ACTIVE encounter when opening nursing panel
 *    - Show encounter selector dropdown for historical review
 *    - Active encounter: Green indicator, full functionality
 *    - Closed encounter: Gray indicator, all inputs disabled
 *
 * 2. DYNAMIC FILTERING
 *    - All displayed records filter by selected encounter_id
 *    - Switching encounters refreshes all tabs (vitals, notes, etc.)
 *    - No cross-encounter data mixing in the UI
 *
 * 3. INPUT STATE MANAGEMENT
 *    ```
 *    if (encounter.status === 'Active') {
 *      // Enable all nurse-writable fields
 *      enableVitalsForm();
 *      enableNursingNotesForm();
 *      enableMedicationAdminForm();
 *    } else {
 *      // Disable all inputs, show read-only badge
 *      disableAllInputs();
 *      showReadOnlyBanner("This encounter is closed. View only.");
 *    }
 *    ```
 *
 * 4. RESTRICTED CONTENT
 *    - Doctor's clinical reasoning: Hidden completely from nurse view
 *    - Diagnosis details: Shown but non-editable
 *    - Treatment plan: Visible, task execution allowed
 *    - Orders: Visible, acknowledge/execute actions only
 *
 * 5. VISUAL INDICATORS
 *    - Write-allowed sections: Normal styling
 *    - Read-only sections: Muted colors, lock icon
 *    - Historical encounter: Yellow warning banner
 *    - Closed encounter: Gray overlay, "READ ONLY" watermark
 *
 * =============================================================================
 * CLINICAL, LEGAL, AND AUDIT RATIONALE
 * =============================================================================
 *
 * WHY ONE ENCOUNTER MODEL SERVES ALL ROLES:
 *
 * 1. CONTINUITY OF CARE
 *    - Single timeline ensures all providers see the same patient journey
 *    - No fragmented records that could lead to missed information
 *    - Nursing observations inform doctor decisions in real-time
 *
 * 2. MEDICO-LEGAL COMPLIANCE
 *    - Single audit trail for the entire patient encounter
 *    - Clear chain of custody for all clinical actions
 *    - Defensible record showing who did what, when, and why
 *
 * 3. BILLING ACCURACY
 *    - All services tied to one billable encounter
 *    - No duplicate billing from parallel records
 *    - Clear justification for charges
 *
 * WHY NURSES MUST HAVE LIMITED VISIBILITY:
 *
 * 1. SCOPE OF PRACTICE
 *    - Nursing scope does not include diagnostic decision-making
 *    - Viewing diagnostic reasoning could bias nursing observations
 *    - Nurses should document what they OBSERVE, not interpret diagnoses
 *
 * 2. CLINICAL WORKFLOW INTEGRITY
 *    - Doctor's preliminary hypotheses should not influence nursing notes
 *    - Nursing notes are INDEPENDENT observations used to validate/refute
 *    - Unbiased nursing documentation is clinically valuable
 *
 * 3. LEGAL PROTECTION
 *    - Nurses cannot be held responsible for diagnosis decisions
 *    - Clear separation protects against liability
 *    - Documentation reflects actual nursing scope
 *
 * RISKS THIS ARCHITECTURE PREVENTS:
 *
 * 1. DOCUMENTATION CONTAMINATION
 *    - Nurses cannot copy/paste doctor's clinical reasoning
 *    - Each discipline documents their own observations
 *    - Authenticity of nursing documentation preserved
 *
 * 2. UNAUTHORIZED MODIFICATIONS
 *    - Nurses cannot alter doctor's orders or diagnoses
 *    - Doctor's notes remain immutable to nursing staff
 *    - Clear accountability for all entries
 *
 * 3. AUDIT TRAIL BREAKS
 *    - All actions logged with encounter_id as anchor
 *    - No orphaned records without encounter context
 *    - Complete reconstruction possible for legal review
 *
 * 4. WORKFLOW BYPASSES
 *    - Cannot create nursing records for non-existent encounters
 *    - Cannot modify closed encounter records
 *    - Enforced linear workflow progression
 *
 * =============================================================================
 * IMPLEMENTATION CHECKLIST
 * =============================================================================
 *
 * [ ] 1. Encounter State Validation
 *     - Add useEncounterStatus hook to all nursing components
 *     - Disable forms when encounter is not Active
 *     - Show clear visual indicators for read-only state
 *
 * [ ] 2. API-Level Enforcement
 *     - Validate encounter status before INSERT/UPDATE
 *     - Return 403 Forbidden for closed encounter writes
 *     - Log all access attempts
 *
 * [ ] 3. RLS Policy Updates
 *     - Create nurse-specific policies on clinical tables
 *     - Enforce encounter_id scoping
 *     - Add status check to write policies
 *
 * [ ] 4. UI Component Updates
 *     - Add EncounterSelector to PatientCarePanel
 *     - Implement ReadOnlyBanner component
 *     - Add permission guards to action buttons
 *
 * [ ] 5. Audit Logging
 *     - Log all nursing write operations
 *     - Log encounter access (view events)
 *     - Include user role in all log entries
 *
 */

// =============================================================================
// TYPE DEFINITIONS FOR NURSING ENCOUNTER INTEGRATION
// =============================================================================

import {
  EncounterRole,
  EncounterAction,
  ROLE_PERMISSIONS,
} from './access-control';

/**
 * Encounter state for nursing context
 */
export interface NursingEncounterContext {
  encounterId: string;
  patientId: string;
  status: 'Active' | 'Completed' | 'Closed' | 'Cancelled';
  isWritable: boolean;
  nurseRole: EncounterRole;
  allowedActions: EncounterAction[];
  restrictions: string[];
}

/**
 * Check if encounter allows nursing write operations
 */
export function isEncounterWritable(status: string): boolean {
  return status === 'Active';
}

/**
 * Get allowed actions for nurse role
 */
export function getNurseAllowedActions(): EncounterAction[] {
  return ROLE_PERMISSIONS.nurse;
}

/**
 * Validate nursing action against encounter state
 */
export function validateNursingAction(
  action: EncounterAction,
  encounterStatus: string,
  nurseRole: EncounterRole = 'nurse',
): { allowed: boolean; reason: string } {
  // Check encounter status
  if (!isEncounterWritable(encounterStatus)) {
    return {
      allowed: false,
      reason: `Cannot perform ${action} on ${encounterStatus} encounter. Read-only access.`,
    };
  }

  // Check role permissions
  const allowedActions = ROLE_PERMISSIONS[nurseRole] || [];
  if (!allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: `Action '${action}' is not permitted for role '${nurseRole}'.`,
    };
  }

  return { allowed: true, reason: 'Action permitted' };
}

/**
 * Content visibility rules for nurses
 */
export const NURSE_CONTENT_VISIBILITY = {
  // Full access (view + write)
  vitals: { view: true, write: true },
  nursing_notes: { view: true, write: true },
  medication_admin: { view: true, write: true },
  shift_handover: { view: true, write: true },

  // View only
  patient_demographics: { view: true, write: false },
  chief_complaint: { view: true, write: false },
  treatment_plan: { view: true, write: false, canExecuteTasks: true },
  lab_orders: { view: true, write: false, canAcknowledge: true },
  radiology_orders: { view: true, write: false, canAcknowledge: true },
  prescriptions: { view: true, write: false, canAdminister: true },
  diagnosis: { view: true, write: false },
  progress_notes: { view: true, write: false, summaryOnly: true },
  ward_round_notes: { view: true, write: false },

  // Hidden from nurses
  clinical_reasoning: { view: false, write: false },
  diagnostic_logic: { view: false, write: false },
  differential_diagnosis: { view: false, write: false },

  // Encounter management
  encounter_close: { view: false, write: false },
  encounter_reopen: { view: false, write: false },
} as const;

/**
 * Check if content type is visible to nurses
 */
export function isContentVisibleToNurse(
  contentType: keyof typeof NURSE_CONTENT_VISIBILITY,
): boolean {
  return NURSE_CONTENT_VISIBILITY[contentType]?.view ?? false;
}

/**
 * Check if content type is writable by nurses
 */
export function isContentWritableByNurse(
  contentType: keyof typeof NURSE_CONTENT_VISIBILITY,
): boolean {
  return NURSE_CONTENT_VISIBILITY[contentType]?.write ?? false;
}

// =============================================================================
// ENCOUNTER SELECTOR PROPS
// =============================================================================

export interface EncounterSelectorProps {
  patientId: string;
  currentEncounterId: string | null;
  onEncounterChange: (encounterId: string) => void;
  showHistorical?: boolean;
}

// =============================================================================
// READ-ONLY BANNER PROPS
// =============================================================================

export interface ReadOnlyBannerProps {
  encounterStatus: string;
  message?: string;
}

export default {
  isEncounterWritable,
  getNurseAllowedActions,
  validateNursingAction,
  isContentVisibleToNurse,
  isContentWritableByNurse,
  NURSE_CONTENT_VISIBILITY,
};
