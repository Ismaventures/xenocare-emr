// =============================================================================
// PhysioTreatmentPlanDashboard
// Shows active treatment plans with session progress for physiotherapists
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  ClipboardList,
  Dumbbell,
  Plus,
  Lock,
  DollarSign,
  Edit3,
  Minus,
  Shield,
  TrendingDown,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { Modal, StatsCard } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import {
  useActivePhysioPlans,
  usePlanSessions,
  useExtendPhysioPlan,
  useBillPhysioPlan,
  useRescheduleSession,
  useAdjustPlanSessionCount,
  useUpdateSessionsApproved,
  usePatientPainTrend,
} from '../hooks/usePhysiotherapy';
import type {
  PhysioPlanSummary,
  PhysioPlanStatus,
  PhysioPlanPaymentStatus,
  PhysioSessionDTO,
} from '../types/physiotherapy.types';
import {
  canRecordPhysioPlanSessions,
  getPhysioPlanSessionCapLabel,
  getPhysioPlanSessionLockReason,
} from '../utils/session-access';
import PhysioSessionRecordModal from './PhysioSessionRecordModal';
import PhysioSessionTimeline from './PhysioSessionTimeline';

// =============================================================================
// Types
// =============================================================================

interface PhysioTreatmentPlanDashboardProps {
  onOpenAssessment?: (
    planId: string,
    patientId: string,
    encounterId: string,
  ) => void;
}

// =============================================================================
// Sub-components
// =============================================================================

function PlanProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          {completed}/{total} sessions
        </span>
        <span className="font-medium text-gray-900">{remaining} remaining</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${
            percentage >= 100
              ? 'bg-green-500'
              : percentage >= 50
                ? 'bg-blue-500'
                : 'bg-purple-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PhysioPlanStatus }) {
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    On_Hold: 'bg-yellow-100 text-yellow-800',
    Completed: 'bg-blue-100 text-blue-800',
    Discharged: 'bg-gray-100 text-gray-800',
    Transferred: 'bg-purple-100 text-purple-800',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}
    >
      {status?.replace('_', ' ')}
    </span>
  );
}

// =============================================================================
// Pain Trend Mini Chart — SVG-based inline sparkline
// =============================================================================

function PainTrendChart({ assessmentId }: { assessmentId: string }) {
  const { data: trend, isLoading } = usePatientPainTrend(assessmentId);

  if (isLoading || !trend || trend.length < 2) return null;

  const maxPain = 10;
  const width = 240;
  const height = 56;
  const padding = { top: 4, right: 8, bottom: 14, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = chartW / (trend.length - 1);
  const toY = (v: number | null) =>
    v != null ? padding.top + chartH - (v / maxPain) * chartH : null;

  const beforeLine = trend
    .map((p, i) => {
      const y = toY(p.pain_before ?? null);
      return y != null
        ? `${i === 0 ? 'M' : 'L'}${padding.left + i * xStep},${y}`
        : '';
    })
    .filter(Boolean)
    .join(' ');

  const afterLine = trend
    .map((p, i) => {
      const y = toY(p.pain_after ?? null);
      return y != null
        ? `${i === 0 ? 'M' : 'L'}${padding.left + i * xStep},${y}`
        : '';
    })
    .filter(Boolean)
    .join(' ');

  const firstPain = trend[0].pain_before ?? trend[0].pain_after;
  const lastPain =
    trend[trend.length - 1].pain_after ?? trend[trend.length - 1].pain_before;
  const improving =
    firstPain != null && lastPain != null && lastPain < firstPain;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-gray-600 flex items-center gap-1">
          {improving ? (
            <TrendingDown size={10} className="text-green-600" />
          ) : (
            <TrendingUp size={10} className="text-red-500" />
          )}
          Pain Trend ({trend.length} sessions)
        </span>
        <div className="flex items-center gap-2 text-[9px] text-gray-500">
          <span className="flex items-center gap-0.5">
            <span className="w-2 h-0.5 bg-red-400 inline-block rounded" />{' '}
            Before
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-2 h-0.5 bg-green-500 inline-block rounded" />{' '}
            After
          </span>
        </div>
      </div>
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={toY(v)!}
              y2={toY(v)!}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text x={2} y={toY(v)! + 3} fontSize={7} fill="#9ca3af">
              {v}
            </text>
          </g>
        ))}
        {/* Session labels */}
        {trend.map((p, i) => (
          <text
            key={i}
            x={padding.left + i * xStep}
            y={height - 2}
            fontSize={7}
            fill="#9ca3af"
            textAnchor="middle"
          >
            S{p.session_number}
          </text>
        ))}
        {/* Before line */}
        {beforeLine && (
          <path
            d={beforeLine}
            fill="none"
            stroke="#f87171"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* After line */}
        {afterLine && (
          <path
            d={afterLine}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {/* Dots */}
        {trend.map((p, i) => {
          const yB = toY(p.pain_before ?? null);
          const yA = toY(p.pain_after ?? null);
          return (
            <g key={i}>
              {yB != null && (
                <circle
                  cx={padding.left + i * xStep}
                  cy={yB}
                  r={2}
                  fill="#f87171"
                />
              )}
              {yA != null && (
                <circle
                  cx={padding.left + i * xStep}
                  cy={yA}
                  r={2}
                  fill="#22c55e"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =============================================================================
// Plan Detail Panel — shows sessions for selected plan
// =============================================================================

function PlanSessionsList({
  planId,
  plan,
  planEncounterId,
  planPatientId,
  planAssessmentId,
  paymentStatus,
  onRecordSession,
  onRescheduleSession,
}: {
  planId: string;
  plan?: Pick<
    PhysioPlanSummary,
    'payment_status' | 'is_nhis_plan' | 'nhis_approval_status'
  >;
  planEncounterId: string;
  planPatientId: string;
  planAssessmentId: string;
  paymentStatus?: PhysioPlanPaymentStatus;
  onRecordSession: (session: PhysioSessionDTO) => void;
  onRescheduleSession: (session: PhysioSessionDTO) => void;
}) {
  const { data: sessions = [], isLoading } = usePlanSessions(planId);
  const lockReason = getPhysioPlanSessionLockReason({
    payment_status: paymentStatus,
    is_nhis_plan: plan?.is_nhis_plan,
    nhis_approval_status: plan?.nhis_approval_status,
  });
  const canRecord = canRecordPhysioPlanSessions({
    payment_status: paymentStatus,
    is_nhis_plan: plan?.is_nhis_plan,
    nhis_approval_status: plan?.nhis_approval_status,
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading sessions...</div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="p-6 text-center">
        <Dumbbell className="mx-auto h-10 w-10 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">No sessions generated yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {lockReason && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Sessions Locked
            </p>
            <p className="text-xs text-amber-600">{lockReason}</p>
          </div>
        </div>
      )}
      {sessions.map((session) => {
        const isCompleted = session.attendance_status === 'Attended';
        const isMissed = session.attendance_status === 'Missed';
        const isPending =
          session.attendance_status === 'Rescheduled' ||
          (!isCompleted && !isMissed);

        return (
          <div
            key={session.session_id}
            className={`p-3 flex items-center justify-between hover:bg-gray-50 ${
              isCompleted ? 'bg-green-50/30' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCompleted
                    ? 'bg-green-100 text-green-700'
                    : isMissed
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {session.session_number}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Session {session.session_number}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                      isCompleted
                        ? 'bg-green-100 text-green-700'
                        : isMissed
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {isCompleted
                      ? 'Completed'
                      : isMissed
                        ? 'Missed'
                        : 'Pending'}
                  </span>
                </div>
                {isCompleted &&
                  session.treatment_provided &&
                  session.treatment_provided !== 'Pending' && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                      {session.treatment_provided}
                    </p>
                  )}
                {session.scheduled_date && !isCompleted && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Scheduled:{' '}
                    {format(new Date(session.scheduled_date), 'dd MMM yyyy')}
                  </p>
                )}
                {isCompleted && session.session_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(
                      new Date(session.session_date),
                      'dd MMM yyyy, HH:mm',
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isPending && canRecord && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onRecordSession(session)}
                >
                  Record
                </Button>
              )}
              {(isPending || isMissed) && (
                <button
                  className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                  title="Reschedule session date"
                  onClick={() => onRescheduleSession(session)}
                >
                  <Edit3 size={14} />
                </button>
              )}
              {isPending && !canRecord && (
                <div
                  className="flex items-center gap-1 text-amber-600"
                  title={lockReason || 'This session is locked'}
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-xs font-medium">Locked</span>
                </div>
              )}
              {isCompleted && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {isMissed && !isPending && (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Main Dashboard Component
// =============================================================================

export default function PhysioTreatmentPlanDashboard({
  onOpenAssessment,
}: PhysioTreatmentPlanDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PhysioPlanStatus | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [sessionRecordModal, setSessionRecordModal] =
    useState<PhysioSessionDTO | null>(null);
  const [extendModal, setExtendModal] = useState<PhysioPlanSummary | null>(
    null,
  );
  const [extensionSessions, setExtensionSessions] = useState('5');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionFee, setExtensionFee] = useState('5000');
  const [billPlanModal, setBillPlanModal] = useState<PhysioPlanSummary | null>(
    null,
  );
  const [billPlanFee, setBillPlanFee] = useState('5000');
  const [rescheduleModal, setRescheduleModal] =
    useState<PhysioSessionDTO | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [adjustModal, setAdjustModal] = useState<PhysioPlanSummary | null>(
    null,
  );
  const [adjustCount, setAdjustCount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [approveModal, setApproveModal] = useState<PhysioPlanSummary | null>(
    null,
  );
  const [approvedCount, setApprovedCount] = useState('');
  const [timelineModalPlan, setTimelineModalPlan] =
    useState<PhysioPlanSummary | null>(null);

  const { showToast } = useToast();

  // Queries
  const {
    data: plans = [] as PhysioPlanSummary[],
    isLoading,
    refetch,
  } = useActivePhysioPlans({
    status: statusFilter || undefined,
    limit: 100,
  });

  const extendPlanMutation = useExtendPhysioPlan();
  const billPlanMutation = useBillPhysioPlan();
  const rescheduleMutation = useRescheduleSession();
  const adjustCountMutation = useAdjustPlanSessionCount();
  const approveSessionsMutation = useUpdateSessionsApproved();

  // Filter plans by search
  const filteredPlans = useMemo(() => {
    if (!searchTerm.trim()) return plans;
    const q = searchTerm.toLowerCase();
    return plans.filter((p) => {
      const name = p.patient
        ? `${p.patient.first_name} ${p.patient.last_name}`.toLowerCase()
        : '';
      const emr = p.patient?.emr_number?.toLowerCase() || '';
      return name.includes(q) || emr.includes(q);
    });
  }, [plans, searchTerm]);

  // Stats
  const activePlans = plans.filter((p) => p.status === 'Active').length;
  const totalSessions = plans.reduce(
    (sum: number, p: PhysioPlanSummary) =>
      sum + (p.total_sessions_planned || 0),
    0,
  );
  const completedSessions = plans.reduce(
    (sum: number, p: PhysioPlanSummary) => sum + (p.sessions_completed || 0),
    0,
  );
  const pendingSessions = totalSessions - completedSessions;

  const selectedPlan = filteredPlans.find((p) => p.plan_id === selectedPlanId);
  const selectedPlanLockReason = getPhysioPlanSessionLockReason(selectedPlan);
  const billPlanSessions = billPlanModal?.total_sessions_planned || 0;
  const isBillPlanPerSession = billPlanModal?.billing_type === 'per_session';
  const parsedBillPlanFee = parseFloat(billPlanFee);
  const normalizedBillPlanFee =
    Number.isFinite(parsedBillPlanFee) && parsedBillPlanFee > 0
      ? parsedBillPlanFee
      : 0;
  const billPlanTotal = isBillPlanPerSession
    ? normalizedBillPlanFee * billPlanSessions
    : normalizedBillPlanFee;

  const handleExtendPlan = async () => {
    if (!extendModal) return;
    const sessions = parseInt(extensionSessions, 10);
    if (isNaN(sessions) || sessions <= 0 || sessions > 50) {
      showToast({
        title: 'Invalid',
        message: 'Enter 1-50 sessions',
        type: 'error',
      });
      return;
    }

    const fee = parseFloat(extensionFee);
    if (isNaN(fee) || fee <= 0) {
      showToast({
        title: 'Invalid Fee',
        message: 'Enter a valid session fee for billing.',
        type: 'error',
      });
      return;
    }

    try {
      await extendPlanMutation.mutateAsync({
        plan_id: extendModal.plan_id,
        additional_sessions: sessions,
        reason: extensionReason || undefined,
        session_fee: fee,
      });
      showToast({
        title: extendModal.is_nhis_plan
          ? 'Extension Submitted to NHIS'
          : 'Plan Extended & Billed',
        message: extendModal.is_nhis_plan
          ? `Added ${sessions} sessions — routed to NHIS Service Approval Queue. Sessions will unlock after the NHIS officer clears the request.`
          : `Added ${sessions} sessions (₦${(fee * sessions).toLocaleString()} billed). Sessions will unlock after payment is verified.`,
        type: 'success',
      });
      setExtendModal(null);
      setExtensionSessions('5');
      setExtensionReason('');
      setExtensionFee('5000');
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to extend plan',
        type: 'error',
      });
    }
  };

  const handleBillPlan = async () => {
    if (!billPlanModal) return;
    const fee = parseFloat(billPlanFee);
    const isPerSessionBilling = billPlanModal.billing_type === 'per_session';
    const billedTotal = isPerSessionBilling
      ? fee * (billPlanModal.total_sessions_planned || 0)
      : fee;
    if (isNaN(fee) || fee <= 0) {
      showToast({
        title: 'Invalid Fee',
        message: isPerSessionBilling
          ? 'Enter a valid fee per session.'
          : 'Enter a valid package fee.',
        type: 'error',
      });
      return;
    }

    try {
      await billPlanMutation.mutateAsync({
        planId: billPlanModal.plan_id,
        planFee: fee,
        description: `Physiotherapy Plan (${billPlanModal.total_sessions_planned} sessions, ${billPlanModal.frequency || 'standard'}${isPerSessionBilling ? `, ₦${fee.toLocaleString()}/session` : `, package ₦${fee.toLocaleString()}`})`,
      });
      showToast({
        title: 'Billing Order Created',
        message: `Plan billed successfully for ₦${billedTotal.toLocaleString()}. Sessions will unlock after admin verifies payment.`,
        type: 'success',
      });
      setBillPlanModal(null);
      setBillPlanFee('5000');
      refetch();
    } catch (error) {
      showToast({
        title: 'Billing Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create billing order',
        type: 'error',
      });
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleModal || !rescheduleDate) return;
    try {
      await rescheduleMutation.mutateAsync({
        sessionId: rescheduleModal.session_id,
        newDate: rescheduleDate,
        reason: rescheduleReason || undefined,
      });
      showToast({
        title: 'Rescheduled',
        message: `Session ${rescheduleModal.session_number} moved to ${rescheduleDate}`,
        type: 'success',
      });
      setRescheduleModal(null);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to reschedule',
        type: 'error',
      });
    }
  };

  const handleAdjustCount = async () => {
    if (!adjustModal) return;
    const count = parseInt(adjustCount, 10);
    if (isNaN(count) || count < 0) {
      showToast({
        title: 'Invalid',
        message: 'Enter a valid session count',
        type: 'error',
      });
      return;
    }
    try {
      const result = await adjustCountMutation.mutateAsync({
        planId: adjustModal.plan_id,
        newTotalSessions: count,
        reason: adjustReason || undefined,
      });
      const msg =
        result.sessionsAdded > 0
          ? `Added ${result.sessionsAdded} sessions`
          : `Removed ${result.sessionsRemoved} sessions`;
      showToast({
        title: 'Sessions Adjusted',
        message: `${msg}. New total: ${count}`,
        type: 'success',
      });
      setAdjustModal(null);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to adjust sessions',
        type: 'error',
      });
    }
  };

  const handleApproveSessionCount = async () => {
    if (!approveModal) return;
    if (approveModal.is_nhis_plan) {
      showToast({
        title: 'Use NHIS Approval Queue',
        message:
          'NHIS physiotherapy sessions are unlocked only after NHIS clears the plan. Approve them from the NHIS module, not inside Physiotherapy.',
        type: 'error',
      });
      return;
    }
    const count = parseInt(approvedCount, 10);
    if (isNaN(count) || count < 0) {
      showToast({
        title: 'Invalid',
        message: 'Enter a valid approved count',
        type: 'error',
      });
      return;
    }
    try {
      await approveSessionsMutation.mutateAsync({
        planId: approveModal.plan_id,
        approvedCount: count,
      });
      showToast({
        title: 'Sessions Approved',
        message: `${count} sessions cleared for use`,
        type: 'success',
      });
      setApproveModal(null);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to update approval',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Active Plans"
          value={activePlans}
          icon={<ClipboardList className="h-5 w-5" />}
          color="purple"
        />
        <StatsCard
          title="Total Sessions"
          value={totalSessions}
          icon={<Dumbbell className="h-5 w-5" />}
          color="blue"
        />
        <StatsCard
          title="Completed"
          value={completedSessions}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatsCard
          title="Pending"
          value={pendingSessions}
          icon={<Clock className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name or EMR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PhysioPlanStatus | '')
          }
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Active Plans</option>
          <option value="Active">Active</option>
          <option value="On_Hold">On Hold</option>
          <option value="Completed">Completed</option>
          <option value="Discharged">Discharged</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw size={14} className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-5 gap-4">
        {/* Plans List (3 cols) */}
        <div className="col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-3 bg-purple-50 border-b border-gray-200">
            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Treatment Plans ({filteredPlans.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              Loading plans...
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No treatment plans found</p>
              <p className="text-sm text-gray-400 mt-1">
                Plans are created when doctors order physiotherapy during
                consultation
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.plan_id}
                  onClick={() => setSelectedPlanId(plan.plan_id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-purple-50/50 ${
                    selectedPlanId === plan.plan_id
                      ? 'bg-purple-50 border-l-4 border-purple-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 truncate">
                          {plan.patient
                            ? `${plan.patient.first_name} ${plan.patient.last_name}`
                            : 'Unknown Patient'}
                        </span>
                        <StatusBadge status={plan.status} />
                        {plan.payment_status &&
                          plan.payment_status !== 'paid' && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                plan.payment_status === 'pending_billing'
                                  ? 'bg-red-100 text-red-700'
                                  : plan.payment_status === 'awaiting_payment'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {plan.payment_status === 'pending_billing'
                                ? 'Unbilled'
                                : plan.payment_status === 'awaiting_payment'
                                  ? 'Awaiting Payment'
                                  : 'Waived'}
                            </span>
                          )}
                        {plan.is_nhis_plan && (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              plan.nhis_approval_status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : plan.nhis_approval_status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : plan.nhis_approval_status ===
                                      'provisional'
                                    ? 'bg-amber-100 text-amber-700'
                                  : plan.nhis_approval_status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            <Shield size={10} className="mr-0.5" />
                            {plan.nhis_approval_status === 'approved'
                              ? 'NHIS Approved'
                              : plan.nhis_approval_status === 'rejected'
                                ? 'NHIS Rejected'
                                : plan.nhis_approval_status === 'provisional'
                                  ? 'NHIS Provisional'
                                : plan.nhis_approval_status === 'pending'
                                  ? 'NHIS Pending'
                                  : 'NHIS'}
                          </span>
                        )}
                      </div>
                      {getPhysioPlanSessionCapLabel(plan) && (
                        <p className="text-xs text-gray-500 ml-6">
                          {getPhysioPlanSessionCapLabel(plan)}
                        </p>
                      )}
                      {plan.patient?.emr_number && (
                        <p className="text-xs text-gray-500 ml-6">
                          EMR: {plan.patient.emr_number}
                        </p>
                      )}
                      {plan.instructions && (
                        <p className="text-xs text-gray-600 ml-6 mt-1 truncate max-w-md">
                          {plan.instructions}
                        </p>
                      )}
                      {plan.prescribing_doctor && (
                        <p className="text-xs text-blue-600 ml-6 mt-0.5">
                          Ordered by: {plan.prescribing_doctor.title || 'Dr.'}{' '}
                          {plan.prescribing_doctor.first_name}{' '}
                          {plan.prescribing_doctor.last_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {plan.frequency && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {plan.frequency}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="mt-2 ml-6">
                    <PlanProgressBar
                      completed={plan.sessions_completed}
                      total={plan.total_sessions_planned}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-gray-400">
                    {plan.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Started{' '}
                        {format(new Date(plan.start_date), 'dd MMM yyyy')}
                      </span>
                    )}
                    <span>
                      Created{' '}
                      {formatDistanceToNow(new Date(plan.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Detail Panel (2 cols) */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          {selectedPlan ? (
            <>
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Sessions — {selectedPlan.patient?.first_name}{' '}
                    {selectedPlan.patient?.last_name}
                  </h3>
                  <div className="flex gap-1 flex-wrap">
                    {selectedPlan.payment_status === 'pending_billing' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={() => {
                          setBillPlanModal(selectedPlan);
                          setBillPlanFee('5000');
                        }}
                      >
                        <DollarSign size={12} className="mr-1" />
                        Bill
                      </Button>
                    )}
                    {selectedPlan.status === 'Active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdjustModal(selectedPlan);
                          setAdjustCount(
                            String(selectedPlan.total_sessions_planned || 0),
                          );
                          setAdjustReason('');
                        }}
                      >
                        <Edit3 size={12} className="mr-1" />
                        Adjust
                      </Button>
                    )}
                    {!selectedPlan.is_nhis_plan && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setApproveModal(selectedPlan);
                          setApprovedCount(
                            String(
                              selectedPlan.sessions_approved ??
                                selectedPlan.total_sessions_planned ??
                                0,
                            ),
                          );
                        }}
                      >
                        <Shield size={12} className="mr-1" />
                        Approve
                      </Button>
                    )}
                    {selectedPlan.status === 'Active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExtendModal(selectedPlan);
                          setExtensionSessions('5');
                          setExtensionReason('');
                          setExtensionFee('5000');
                        }}
                      >
                        <Plus size={12} className="mr-1" />
                        Extend
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <PlanProgressBar
                    completed={selectedPlan.sessions_completed}
                    total={selectedPlan.total_sessions_planned}
                  />
                </div>
                {(selectedPlan.is_nhis_plan ||
                  selectedPlan.sessions_approved != null) && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-3 text-xs">
                      {selectedPlan.is_nhis_plan && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                            selectedPlan.nhis_approval_status === 'approved'
                              ? 'bg-green-50 text-green-700'
                              : selectedPlan.nhis_approval_status === 'rejected'
                                ? 'bg-red-50 text-red-700'
                                : selectedPlan.nhis_approval_status ===
                                    'provisional'
                                  ? 'bg-amber-50 text-amber-700'
                                : selectedPlan.nhis_approval_status ===
                                    'pending'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <Shield size={10} />
                          {selectedPlan.nhis_approval_status === 'approved'
                            ? 'NHIS Approved'
                            : selectedPlan.nhis_approval_status === 'rejected'
                              ? 'NHIS Rejected'
                              : selectedPlan.nhis_approval_status ===
                                  'provisional'
                                ? 'NHIS Provisional'
                              : selectedPlan.nhis_approval_status === 'pending'
                                ? 'Awaiting NHIS Approval'
                                : 'NHIS Plan'}{' '}
                          (max 6 sessions)
                        </span>
                      )}
                      {selectedPlan.nhis_authorization_code && (
                        <span className="text-green-700 font-mono text-[11px]">
                          Auth: {selectedPlan.nhis_authorization_code}
                        </span>
                      )}
                      {getPhysioPlanSessionCapLabel(selectedPlan) && (
                        <span className="text-gray-600">
                          {getPhysioPlanSessionCapLabel(selectedPlan)}
                        </span>
                      )}
                    </div>
                    {selectedPlanLockReason && (
                      <p className="text-[10px] text-yellow-700">
                        Sessions locked — {selectedPlanLockReason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline button + Sessions */}
              <div className="px-3 pt-2 pb-1 bg-gray-50/50 border-b border-gray-100">
                <button
                  onClick={() => setTimelineModalPlan(selectedPlan)}
                  className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all p-3 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                      <Dumbbell size={18} className="text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">
                        Physiotherapy Treatment Sessions
                      </span>
                      <span className="text-[10px] text-white/80">
                        Completed: {selectedPlan.sessions_completed} /{' '}
                        {selectedPlan.total_sessions_planned}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-9 h-9">
                      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeDasharray={`${selectedPlan.total_sessions_planned > 0 ? Math.min(100, Math.round((selectedPlan.sessions_completed / selectedPlan.total_sessions_planned) * 100)) : 0}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                        {selectedPlan.total_sessions_planned > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (selectedPlan.sessions_completed /
                                  selectedPlan.total_sessions_planned) *
                                  100,
                              ),
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <BarChart3
                      size={16}
                      className="text-white/80 group-hover:text-white transition-colors"
                    />
                  </div>
                </button>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                <PainTrendChart assessmentId={selectedPlan.assessment_id} />
                <PlanSessionsList
                  planId={selectedPlan.plan_id}
                  plan={selectedPlan}
                  planEncounterId={selectedPlan.encounter_id}
                  planPatientId={selectedPlan.patient_id}
                  planAssessmentId={selectedPlan.assessment_id}
                  paymentStatus={selectedPlan.payment_status}
                  onRecordSession={(session) => setSessionRecordModal(session)}
                  onRescheduleSession={(session) => {
                    setRescheduleModal(session);
                    setRescheduleDate(session.scheduled_date || '');
                    setRescheduleReason('');
                  }}
                />
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Select a treatment plan</p>
              <p className="text-sm text-gray-400 mt-1">
                Click a plan to view and manage its sessions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Timeline Modal */}
      {timelineModalPlan && (
        <PhysioSessionTimeline
          plan={timelineModalPlan}
          isOpen={!!timelineModalPlan}
          onClose={() => {
            setTimelineModalPlan(null);
            refetch();
          }}
        />
      )}

      {/* Session Recording Modal */}
      {sessionRecordModal && (
        <PhysioSessionRecordModal
          session={sessionRecordModal}
          plan={selectedPlan}
          planPaymentStatus={selectedPlan?.payment_status}
          onClose={() => {
            setSessionRecordModal(null);
            refetch();
          }}
        />
      )}

      {/* Extend Plan Modal */}
      {extendModal && (
        <Modal
          isOpen={!!extendModal}
          onClose={() => setExtendModal(null)}
          title={`Extend Treatment Plan — ${extendModal.patient?.first_name} ${extendModal.patient?.last_name}`}
        >
          <div className="space-y-4 p-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Current plan:{' '}
                <strong>{extendModal.total_sessions_planned}</strong> sessions
                prescribed, <strong>{extendModal.sessions_completed}</strong>{' '}
                completed
              </p>
            </div>
            {extendModal.is_nhis_plan && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">
                  NHIS Patient — Extension requires NHIS clearance
                </p>
                <p className="text-xs text-green-700 mt-1">
                  This extension will be routed to the NHIS Service Approval
                  Queue. Sessions will remain locked until the NHIS desk
                  approves and enters an authorization code. Billing is deferred
                  until after NHIS clearance.
                  {extendModal.total_sessions_planned >= 6 && (
                    <span className="font-semibold">
                      {' '}Standard NHIS cap is 6 sessions — this extension
                      exceeds that and requires explicit NHIS authorization.
                    </span>
                  )}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Sessions to Add
              </label>
              <input
                type="number"
                min="1"
                max={50}
                value={extensionSessions}
                onChange={(e) => setExtensionSessions(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Per Session (₦)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={extensionFee}
                onChange={(e) => setExtensionFee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {extensionSessions && extensionFee && (
                <p className="mt-1 text-xs text-gray-500">
                  Total: ₦
                  {(
                    parseInt(extensionSessions, 10) *
                      parseFloat(extensionFee) || 0
                  ).toLocaleString()}
                  {extendModal.is_nhis_plan
                    ? ' — billing deferred until NHIS clears the extension'
                    : ' — billing order will be created automatically'}
                </p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> New sessions will be locked until{' '}
                {extendModal.is_nhis_plan
                  ? 'the NHIS officer grants clearance.'
                  : 'the billing admin verifies payment.'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Extension{extendModal.is_nhis_plan ? '' : ' (optional)'}
              </label>
              <textarea
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder={
                  extendModal.is_nhis_plan
                    ? 'Clinical justification for additional sessions (sent to NHIS desk)'
                    : 'e.g. Patient requires continued rehabilitation'
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExtendModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExtendPlan}
                disabled={extendPlanMutation.isPending}
              >
                {extendPlanMutation.isPending
                  ? extendModal.is_nhis_plan
                    ? 'Submitting to NHIS...'
                    : 'Extending & Billing...'
                  : extendModal.is_nhis_plan
                    ? `Add ${extensionSessions} Sessions & Submit to NHIS`
                    : `Add ${extensionSessions} Sessions & Bill`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bill Plan Modal */}
      {billPlanModal && (
        <Modal
          isOpen={!!billPlanModal}
          onClose={() => setBillPlanModal(null)}
          title={`Bill Treatment Plan — ${billPlanModal.patient?.first_name} ${billPlanModal.patient?.last_name}`}
        >
          <div className="space-y-4 p-4">
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                This plan has{' '}
                <strong>{billPlanModal.total_sessions_planned}</strong> sessions
                prescribed. A billing order will be created for administrator
                approval.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isBillPlanPerSession
                  ? 'Fee Per Session (₦)'
                  : 'Package Fee (₦)'}
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={billPlanFee}
                onChange={(e) => setBillPlanFee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {isBillPlanPerSession
                  ? `Total billing preview: ₦${billPlanTotal.toLocaleString()} (${billPlanSessions} sessions)`
                  : `Total billing preview: ₦${billPlanTotal.toLocaleString()} (package)`}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBillPlanModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBillPlan}
                disabled={billPlanMutation.isPending}
              >
                {billPlanMutation.isPending
                  ? 'Creating Bill...'
                  : 'Create Billing Order'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Session Modal */}
      {rescheduleModal && (
        <Modal
          isOpen={!!rescheduleModal}
          onClose={() => setRescheduleModal(null)}
          title={`Reschedule Session ${rescheduleModal.session_number}`}
        >
          <div className="space-y-4 p-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Current scheduled date:{' '}
                <strong>
                  {rescheduleModal.scheduled_date
                    ? format(
                        new Date(rescheduleModal.scheduled_date),
                        'dd MMM yyyy',
                      )
                    : 'Not set'}
                </strong>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Date
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="e.g. Patient unavailable, clinic holiday"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRescheduleModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReschedule}
                disabled={rescheduleMutation.isPending || !rescheduleDate}
              >
                {rescheduleMutation.isPending ? 'Saving...' : 'Reschedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Session Count Modal */}
      {adjustModal && (
        <Modal
          isOpen={!!adjustModal}
          onClose={() => setAdjustModal(null)}
          title={`Adjust Sessions — ${adjustModal.patient?.first_name} ${adjustModal.patient?.last_name}`}
        >
          <div className="space-y-4 p-4">
            <div
              className={`rounded-lg p-3 ${adjustModal.is_nhis_plan ? 'bg-blue-50' : 'bg-gray-50'}`}
            >
              <p className="text-sm text-gray-800">
                Current: <strong>{adjustModal.total_sessions_planned}</strong>{' '}
                sessions planned,{' '}
                <strong>{adjustModal.sessions_completed}</strong> completed
              </p>
              {adjustModal.is_nhis_plan && (
                <p className="text-sm text-blue-700 mt-1 font-medium">
                  ⚠ NHIS plan — maximum 6 sessions allowed
                </p>
              )}
              {adjustModal.sessions_approved != null && (
                <p className="text-sm text-gray-600 mt-1">
                  Approved/Cleared:{' '}
                  <strong>{adjustModal.sessions_approved}</strong> sessions
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Total Sessions
              </label>
              <input
                type="number"
                min={adjustModal.sessions_completed || 0}
                max={
                  adjustModal.is_nhis_plan
                    ? 6
                    : adjustModal.sessions_approved || 100
                }
                value={adjustCount}
                onChange={(e) => setAdjustCount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Min: {adjustModal.sessions_completed || 0} (completed).
                {adjustModal.is_nhis_plan
                  ? ' Max: 6 (NHIS).'
                  : adjustModal.sessions_approved != null
                    ? ` Max: ${adjustModal.sessions_approved} (approved).`
                    : ''}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Doctor recommendation, patient progress"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAdjustCount}
                disabled={adjustCountMutation.isPending}
              >
                {adjustCountMutation.isPending
                  ? 'Adjusting...'
                  : 'Adjust Sessions'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Sessions Modal (Paypoint/NHIS Clearance) */}
      {approveModal && (
        <Modal
          isOpen={!!approveModal}
          onClose={() => setApproveModal(null)}
          title={`Approve Sessions — ${approveModal.patient?.first_name} ${approveModal.patient?.last_name}`}
        >
          <div className="space-y-4 p-4">
            <div
              className={`rounded-lg p-3 ${approveModal.is_nhis_plan ? 'bg-blue-50' : 'bg-green-50'}`}
            >
              <p className="text-sm text-gray-800">
                Set the number of sessions cleared/approved by paypoint or NHIS.
                Therapists cannot record more sessions than this number.
              </p>
              {approveModal.is_nhis_plan && (
                <p className="text-sm text-blue-700 mt-1 font-medium">
                  ⚠ NHIS plan — maximum 6 sessions can be approved
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                Planned: <strong>{approveModal.total_sessions_planned}</strong>{' '}
                | Completed: <strong>{approveModal.sessions_completed}</strong>{' '}
                | Currently approved:{' '}
                <strong>{approveModal.sessions_approved ?? 'Not set'}</strong>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved Session Count
              </label>
              <input
                type="number"
                min="0"
                max={approveModal.is_nhis_plan ? 6 : 100}
                value={approvedCount}
                onChange={(e) => setApprovedCount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {approveModal.is_nhis_plan && (
                <p className="text-xs text-blue-600 mt-1">
                  NHIS maximum: 6 sessions
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleApproveSessionCount}
                disabled={approveSessionsMutation.isPending}
              >
                {approveSessionsMutation.isPending
                  ? 'Saving...'
                  : 'Save Approval'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
