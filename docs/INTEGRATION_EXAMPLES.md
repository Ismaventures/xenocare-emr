# Integration Examples

This document shows how to integrate the new gap-closing features into existing modules.

## 1. NotificationBell in Layout

The `NotificationBell` component has been added to the main Layout header. It shows:
- Unread notification count badge
- Dropdown panel with notification list
- Real-time updates via Supabase subscription
- Click-to-mark-as-read functionality

**File:** `src/renderer/shared/Layout.tsx`

```tsx
import { NotificationBell } from '../components/ui/NotificationBell';

// In the header section:
<div className="flex items-center space-x-4">
  <NotificationBell />
</div>
```

---

## 2. Payment Override Logging in Billing

When a user overrides a payment amount (discount, waiver, adjustment), log it as an exception.

**File:** `src/renderer/modules/billing/components/PaymentOverrideModal.tsx`

```tsx
import { useLogPaymentOverride } from '../../../lib/exceptions';

function PaymentOverrideModal({ visit, originalAmount, onComplete }) {
  const [overrideAmount, setOverrideAmount] = useState(originalAmount);
  const [reason, setReason] = useState('');
  const logPaymentOverride = useLogPaymentOverride();

  const handleSubmit = async () => {
    // Log the exception before applying the override
    await logPaymentOverride.mutateAsync({
      visitId: visit.id,
      originalAmount,
      overrideAmount,
      reason,
    });

    // Proceed with the payment adjustment
    await applyPaymentAdjustment(visit.id, overrideAmount);
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## 3. Triage Form in Nursing Queue

Add triage functionality to the nursing module when receiving patients from the front desk.

**File:** `src/renderer/modules/nursing/components/PatientCard.tsx`

```tsx
import { TriageForm } from '../components/TriageForm';
import { useTriageByVisit } from '../hooks/useTriage';

function PatientCard({ patient, visit }) {
  const [showTriageForm, setShowTriageForm] = useState(false);
  const { data: existingTriage } = useTriageByVisit(visit.id);

  return (
    <div className="patient-card">
      <PatientInfo patient={patient} />
      
      {/* Show ESI badge if triage exists */}
      {existingTriage && (
        <ESIBadge level={existingTriage.esi_level} />
      )}

      {/* Triage button for new patients */}
      {!existingTriage && (
        <button onClick={() => setShowTriageForm(true)}>
          Start Triage
        </button>
      )}

      {/* Triage Modal */}
      {showTriageForm && (
        <Modal onClose={() => setShowTriageForm(false)}>
          <TriageForm
            patientId={patient.id}
            visitId={visit.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
            onComplete={(triageId) => {
              setShowTriageForm(false);
              // Optionally refresh the patient list
            }}
            onCancel={() => setShowTriageForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
```

---

## 4. ESI Badge Component

Create a reusable ESI level badge component.

**File:** `src/renderer/components/ui/ESIBadge.tsx`

```tsx
import type { ESILevel } from '../../types/triage.types';
import { ESI_DESCRIPTIONS } from '../../types/triage.types';

const esiColors: Record<ESILevel, string> = {
  1: 'bg-red-600 text-white',
  2: 'bg-orange-500 text-white',
  3: 'bg-yellow-500 text-black',
  4: 'bg-green-500 text-white',
  5: 'bg-blue-500 text-white',
};

export function ESIBadge({ level }: { level: ESILevel }) {
  const desc = ESI_DESCRIPTIONS[level];
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${esiColors[level]}`}
      title={desc.description}
    >
      ESI {level}: {desc.name}
    </span>
  );
}
```

---

## 5. Referral Creation in Clinical Consultation

Add a referral button to the consultation module.

**File:** `src/renderer/modules/clinical-consultation/components/ReferralButton.tsx`

```tsx
import { ReferralForm } from '../../../lib/referrals/components/ReferralForm';
import { useAuth } from '../../../contexts/AuthContext';
import { useDepartmentByCode } from '../../../modules/configurations/hooks/useDepartments';

function ReferralButton({ patient, visit }) {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  
  // Get the current user's department
  const { data: currentDept } = useDepartmentByCode(user?.user_metadata?.department || 'OPD');

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="btn btn-secondary"
      >
        Create Referral
      </button>

      {showForm && currentDept && (
        <Modal onClose={() => setShowForm(false)} title="New Referral">
          <ReferralForm
            patientId={patient.id}
            visitId={visit.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
            fromDepartmentId={currentDept.id}
            onComplete={(referralId) => {
              setShowForm(false);
              toast.success('Referral created successfully');
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </>
  );
}
```

---

## 6. Incoming Referrals Panel

Show pending referrals for a department.

**File:** `src/renderer/modules/clinical-consultation/components/IncomingReferrals.tsx`

```tsx
import { useIncomingReferrals, useAcceptReferral } from '../../../lib/referrals';

function IncomingReferrals({ departmentId }) {
  const { data: referrals = [], isLoading } = useIncomingReferrals(departmentId);
  const acceptReferral = useAcceptReferral();

  const pendingReferrals = referrals.filter(r => r.status === 'pending');

  if (pendingReferrals.length === 0) return null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <h3 className="font-semibold text-purple-900 mb-3">
        Pending Referrals ({pendingReferrals.length})
      </h3>
      
      <div className="space-y-2">
        {pendingReferrals.map(referral => (
          <div key={referral.id} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">
                  {referral.patient?.first_name} {referral.patient?.last_name}
                </p>
                <p className="text-sm text-gray-600">
                  From: {referral.from_department?.name}
                </p>
                <p className="text-sm text-gray-600">
                  Reason: {referral.reason}
                </p>
              </div>
              <button
                onClick={() => acceptReferral.mutate({ id: referral.id })}
                className="btn btn-primary btn-sm"
              >
                Accept
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Audit Viewer in Admin Module

Add the audit/exception viewer to the admin/configurations module.

**File:** `src/renderer/modules/configurations/pages/AuditPage.tsx`

```tsx
import { AuditViewer } from '../../../lib/exceptions/components/AuditViewer';

export function AuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workflow Audit Log</h1>
      <AuditViewer showApprovalActions={true} />
    </div>
  );
}
```

---

## 8. Queue Skip Logging

When a staff member moves a patient up in the queue, log the exception.

**File:** `src/renderer/modules/queue/components/QueueList.tsx`

```tsx
import { useLogQueueSkip } from '../../../lib/exceptions';

function QueueList({ queueItems }) {
  const logQueueSkip = useLogQueueSkip();

  const handleMoveToFront = async (item, originalPosition) => {
    // Log the exception
    await logQueueSkip.mutateAsync({
      queueId: item.id,
      patientId: item.patient_id,
      originalPosition,
      newPosition: 1,
      reason: 'Emergency priority override',
    });

    // Move the patient
    await movePatientToFront(item.id);
  };

  return (
    <ul>
      {queueItems.map((item, index) => (
        <li key={item.id}>
          <span>{item.patient_name}</span>
          <button onClick={() => handleMoveToFront(item, index + 1)}>
            Move to Front
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## 9. Department Selection in Queue

Replace hardcoded queue locations with dynamic departments.

**File:** `src/renderer/modules/queue/components/QueueFilters.tsx`

```tsx
import { useQueueDepartments } from '../../../modules/configurations/hooks/useDepartments';

function QueueFilters({ selectedDepartment, onDepartmentChange }) {
  const { data: departments = [] } = useQueueDepartments();

  return (
    <select
      value={selectedDepartment}
      onChange={(e) => onDepartmentChange(e.target.value)}
      className="form-select"
    >
      <option value="">All Departments</option>
      {departments.map(dept => (
        <option key={dept.id} value={dept.id}>
          {dept.name}
        </option>
      ))}
    </select>
  );
}
```

---

## Running Migrations

Before using these features, run the database migrations:

```bash
# Option 1: Run all migrations individually
supabase db push

# Option 2: Run the combined migration
supabase migration up 020_master_gap_integration.sql
```

## Required Dependencies

Make sure these are installed:

```bash
npm install date-fns @tanstack/react-query
```

## Module Summary

| Feature | API File | Hooks File | Component |
|---------|----------|------------|-----------|
| Departments | `configurations/api/departments.api.ts` | `configurations/hooks/useDepartments.ts` | - |
| Triage | `nursing/api/triage.api.ts` | `nursing/hooks/useTriage.ts` | `nursing/components/TriageForm.tsx` |
| Notifications | `lib/notifications/api.ts` | `lib/notifications/hooks.ts` | `components/ui/NotificationBell.tsx` |
| Referrals | `lib/referrals/api.ts` | `lib/referrals/hooks.ts` | `lib/referrals/components/ReferralForm.tsx` |
| Exceptions | `lib/exceptions/api.ts` | `lib/exceptions/hooks.ts` | `lib/exceptions/components/AuditViewer.tsx` |
