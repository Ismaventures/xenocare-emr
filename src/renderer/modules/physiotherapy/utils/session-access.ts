import type {
  PhysioNhisApprovalStatus,
  PhysioPlanPaymentStatus,
  PhysioPlanSummary,
} from '../types/physiotherapy.types';

type PhysioPlanAccessState = Pick<
  PhysioPlanSummary,
  'payment_status' | 'is_nhis_plan' | 'nhis_approval_status'
>;

type PhysioPlanSessionCapState = Pick<
  PhysioPlanSummary,
  'sessions_approved' | 'is_nhis_plan' | 'nhis_approval_status'
>;

export function isPhysioPaymentCleared(
  status?: PhysioPlanPaymentStatus,
): boolean {
  return status === 'paid' || status === 'waived';
}

export function isPhysioNhisCleared(
  isNhisPlan?: boolean,
  status?: PhysioNhisApprovalStatus | null,
): boolean {
  if (!isNhisPlan) return true;
  return status === 'approved' || status === 'not_required';
}

export function getPhysioPlanSessionLockReason(
  plan?: Partial<PhysioPlanAccessState> | null,
): string | null {
  if (!plan) return null;

  const nhisCleared = isPhysioNhisCleared(
    plan.is_nhis_plan,
    plan.nhis_approval_status ?? null,
  );

  if (plan.is_nhis_plan && !nhisCleared) {
    switch (plan.nhis_approval_status) {
      case 'rejected':
        return 'NHIS rejected this physiotherapy plan. Re-submit and obtain NHIS approval before recording sessions.';
      case 'provisional':
        return 'NHIS has only given provisional clearance. Sessions stay locked until a final authorization code is entered in NHIS.';
      case 'expired':
        return 'The NHIS authorization for this physiotherapy plan has expired. Renew approval before recording sessions.';
      default:
        return 'This NHIS physiotherapy plan is awaiting NHIS approval. Sessions stay locked until the NHIS desk clears it.';
    }
  }

  // After NHIS clearance (or for non-NHIS plans), check payment status.
  // For NHIS partial coverage: NHIS approved but patient copay must be billed.
  // For non-NHIS: billing must be created and payment verified.
  if (!isPhysioPaymentCleared(plan.payment_status)) {
    if (plan.payment_status === 'pending_billing') {
      return plan.is_nhis_plan
        ? 'NHIS has approved this plan but it has partial coverage. Use the "Bill" button to create a billing order for the patient copay, then verify payment.'
        : 'This physiotherapy plan has not been billed yet. Send it to billing before recording sessions.';
    }

    if (plan.payment_status === 'awaiting_payment') {
      return plan.is_nhis_plan
        ? 'NHIS has approved this plan but patient copay has not been verified yet. Sessions stay locked until billing clears the copay.'
        : 'Payment has not been verified yet. Sessions stay locked until billing clears the plan.';
    }
  }

  return null;
}

export function canRecordPhysioPlanSessions(
  plan?: Partial<PhysioPlanAccessState> | null,
): boolean {
  return getPhysioPlanSessionLockReason(plan) === null;
}

export function getPhysioPlanSessionCapLabel(
  plan?: Partial<PhysioPlanSessionCapState> | null,
): string | null {
  if (plan?.sessions_approved == null) return null;

  if (
    plan.is_nhis_plan &&
    !isPhysioNhisCleared(plan.is_nhis_plan, plan.nhis_approval_status ?? null)
  ) {
    return `Requested cap: ${plan.sessions_approved} sessions (locked until NHIS clears)`;
  }

  return `Cleared: ${plan.sessions_approved} sessions${plan.is_nhis_plan ? ' (NHIS max 6)' : ''}`;
}