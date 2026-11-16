/**
 * Physiotherapy Module Page
 * Main entry point for physical therapy assessments and sessions
 * Includes session management and billing workflow
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Activity,
  Calendar,
  FileText,
  Users,
  HeartPulse,
  Check,
  DollarSign,
  Eye,
  Clock,
  RefreshCw,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Dumbbell,
  ClipboardList,
  XCircle,
  Loader2,
  User,
  Plus,
  ChevronDown,
  Bot,
  X,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { Modal, StatsCard } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { ReferralDetailsModal } from '../../../components/shared';
import PatientMedicalRecordsPanel from '../../../components/shared/PatientMedicalRecordsPanel';
import { InlineGuidance } from '../../../components/guidance/InlineGuidance';
import {
  usePhysioSessions,
  usePhysioAssessments,
  useBillPhysioSession,
  useBillPhysioPlan,
  usePhysioStats,
  useCreatePhysioAssessment,
  useCreatePhysioPlan,
} from '../hooks/usePhysiotherapy';
import PhysioAssessmentWizard from '../components/PhysioAssessmentWizard';
import PhysioAssessmentViewModal from '../components/PhysioAssessmentViewModal';
import PhysioTreatmentPlanDashboard from '../components/PhysioTreatmentPlanDashboard';
import { PhysioExportPanel } from '../components/PhysioExportPanel';
import { AIChatPanel } from '../../ai-assistant/components/AIChatPanel';
import {
  submitSpecialtyOrdersAndReferrals,
  type SpecialtyOrdersPayload,
} from '../../specialty-common/utils/specialty-order-submission';
import type {
  CreatePhysioAssessmentDTO,
  PhysioAssessmentDTO,
  PhysioBillingType,
  PhysioSessionDTO,
} from '../types/physiotherapy.types';
import {
  useCompleteRequest,
  useSpecialtyReferrals,
} from '../../clinical-requests/hooks/useClinicalRequests';
import { useDepartmentQueue } from '../../queue/hooks/useQueue';
import type { ClinicalRequestWithDetailsDTO } from '../../clinical-requests/dtos/clinical-request.dto';
import type { QueueDTO } from '../../queue/dtos/queue.dto';
import { SkeletonDashboard } from '../../../components/ui/SkeletonLoader';
import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

type ViewTab = 'queue' | 'referrals' | 'assessments' | 'plans';
type StatusFilter = 'Attended' | 'Missed' | 'Cancelled' | 'Rescheduled' | '';

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: '', label: 'All Sessions' },
  { value: 'Attended', label: 'Attended' },
  { value: 'Missed', label: 'Missed' },
  { value: 'Rescheduled', label: 'Rescheduled' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function urgencyForClinicalAlerts(
  urgency: string | null | undefined,
): string | undefined {
  const u = (urgency || '').trim();
  if (u === 'Emergency' || u === 'Urgent' || u === 'Stat') return u;
  return undefined;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Attended: { bg: 'bg-green-100', text: 'text-green-800' },
  Missed: { bg: 'bg-red-100', text: 'text-red-800' },
  Rescheduled: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

function normalizeAssessmentStatus(
  rawStatus: string | null | undefined,
  hasClinicalData: boolean,
): 'Completed' | 'Active' {
  if (hasClinicalData) return 'Completed';
  const s = (rawStatus || '').toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('final'))
    return 'Completed';
  return 'Active';
}

// =============================================================================
// Component
// =============================================================================

export default function PhysiotherapyPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('queue');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // Confirmation dialogs
  const [billSession, setBillSession] = useState<PhysioSessionDTO | null>(null);
  const [sessionFee, setSessionFee] = useState<string>('5000');

  // Assessment modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [selectedPatientForAssessment, setSelectedPatientForAssessment] =
    useState<{
      patientId: string;
      emrNumber: string;
      encounterId: string;
      patientName: string;
      encounterNumber?: string;
      clinicalRequestId?: string;
      priority?: string | null;
    } | null>(null);

  const [queueRowFocusId, setQueueRowFocusId] = useState<string | null>(null);

  // View assessment modal state
  const [viewAssessmentModalOpen, setViewAssessmentModalOpen] = useState(false);
  const [selectedAssessmentForView, setSelectedAssessmentForView] =
    useState<PhysioAssessmentDTO | null>(null);

  // Referral details modal state
  const [selectedReferral, setSelectedReferral] =
    useState<ClinicalRequestWithDetailsDTO | null>(null);
  const [referralDetailsModalOpen, setReferralDetailsModalOpen] =
    useState(false);

  // Patient records modal state
  const [patientRecordsModalOpen, setPatientRecordsModalOpen] = useState(false);
  const [selectedPatientForRecords, setSelectedPatientForRecords] = useState<{
    patientId: string;
    patientName: string;
    emrNumber: string;
  } | null>(null);

  // Treatment Plan creation dialog - shown after assessment or from assessments tab
  const [planCreationDialogOpen, setPlanCreationDialogOpen] = useState(false);
  const [planCreationData, setPlanCreationData] = useState<{
    assessmentId: string;
    patientId: string;
    encounterId: string;
    patientName: string;
    estimatedSessions?: number;
    clinicalRequestId?: string;
  } | null>(null);
  const [planFormData, setPlanFormData] = useState({
    totalSessions: 10,
    frequency: '3x per week',
    sessionDuration: 45,
    billingType: 'per_session' as PhysioBillingType,
    instructions: '',
    startDate: new Date().toISOString().split('T')[0],
    planFee: '5000',
  });

  // NHIS detection for plan creation dialog
  const [isCreationPatientNhis, setIsCreationPatientNhis] = useState(false);
  useEffect(() => {
    if (!planCreationData?.encounterId) {
      setIsCreationPatientNhis(false);
      return;
    }
    supabase
      .from('visits')
      .select('insurance_type')
      .eq('encounter_id', planCreationData.encounterId)
      .single()
      .then(({ data }) => {
        const t = (data?.insurance_type || '').toLowerCase();
        setIsCreationPatientNhis(t.includes('nhis') || t === 'insurance');
      });
  }, [planCreationData?.encounterId]);

  const { showToast } = useToast();
  // AI Assistant Panel
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const { staff } = useAuth();

  // Create assessment mutation
  const createAssessmentMutation = useCreatePhysioAssessment();

  // Create plan mutation
  const createPlanMutation = useCreatePhysioPlan();
  const completeRequestMutation = useCompleteRequest();

  // Bill plan mutation
  const billPlanMutation = useBillPhysioPlan();

  // Queue Query - patients waiting in Physiotherapy queue after payment
  const queueQuery: any = useDepartmentQueue('Physiotherapy');
  const queueDataRaw = queueQuery?.data;
  const queueLoading = Boolean(queueQuery?.isLoading);
  const refetchQueue: () => Promise<unknown> =
    queueQuery?.refetch || (async () => undefined);

  // Specialty Referrals Query - patients referred to Physiotherapy
  const {
    data: referralsRaw,
    isLoading: referralsLoading,
    refetch: refetchReferrals,
  } = useSpecialtyReferrals('physiotherapy', [
    'Pending',
    'Approved',
    'In_Progress',
  ]);

  const queueData = useMemo<QueueDTO[]>(
    () => (Array.isArray(queueDataRaw) ? queueDataRaw : []),
    [queueDataRaw],
  );

  const referrals = useMemo<ClinicalRequestWithDetailsDTO[]>(
    () => (Array.isArray(referralsRaw) ? referralsRaw : []),
    [referralsRaw],
  );

  // Queries
  const {
    data: sessions,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = usePhysioSessions({
    limit: 50,
  });

  // Physio Assessments Query for Assessments tab
  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    refetch: refetchAssessments,
  } = usePhysioAssessments({ limit: 50 });

  const { data: stats } = usePhysioStats();

  // Mutations
  const billSessionMutation = useBillPhysioSession();

  // Handlers
  const handleBillSession = (session: PhysioSessionDTO) => {
    setBillSession(session);
    setSessionFee('5000'); // Default fee
  };

  const confirmBillSession = async () => {
    if (!billSession) return;

    const fee = parseFloat(sessionFee);
    if (isNaN(fee) || fee <= 0) {
      showToast({
        title: 'Invalid Fee',
        message: 'Please enter a valid session fee.',
        type: 'error',
      });
      return;
    }

    try {
      await billSessionMutation.mutateAsync({
        sessionId: billSession.session_id,
        sessionFee: fee,
      });
      showToast({
        title: 'Session Billed',
        message: 'Billing order has been created for this session.',
        type: 'success',
      });
      setBillSession(null);
      refetchSessions();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to bill session',
        type: 'error',
      });
    }
  };

  // Assessment modal handlers
  const handleStartAssessment = (
    patientId: string,
    emrNumber: string,
    encounterId: string,
    patientName: string,
    encounterNumber?: string,
    clinicalRequestId?: string,
    triagePriority?: string | null,
  ) => {
    setSelectedPatientForAssessment({
      patientId,
      emrNumber,
      encounterId,
      patientName,
      encounterNumber,
      clinicalRequestId,
      priority: triagePriority ?? undefined,
    });
    setAssessmentModalOpen(true);
  };

  const handleSaveAssessment = async (
    data: CreatePhysioAssessmentDTO,
    orders?: SpecialtyOrdersPayload,
  ): Promise<PhysioAssessmentDTO> => {
    const result = await createAssessmentMutation.mutateAsync(data);

    const orderSelectionCount = orders
      ? (orders.labOrders?.length || 0) +
        (orders.radiologyOrders?.length || 0) +
        (orders.prescriptions?.length || 0) +
        (orders.procedureOrders?.length || 0) +
        Object.values(orders.specialtyReferrals || {}).filter(
          (ref) => ref.selected,
        ).length
      : 0;

    if (orders) {
      if (orderSelectionCount > 0) {
        void submitSpecialtyOrdersAndReferrals({
          patientPublicId: result.patient_id,
          encounterId: result.encounter_id,
          orderedByStaffId: staff?.staff_id || '',
          orderedByStaffUuid: staff?.id,
          currentSpecialty: 'physiotherapy',
          orders,
          consultationId: (result as any).consultation_id,
          diagnosisText: result.physio_diagnosis || '',
          clinicalFindings: [
            result.chief_complaint,
            result.functional_status,
            result.physio_diagnosis,
            result.short_term_goals,
          ]
            .filter(Boolean)
            .join('; '),
          patientName: selectedPatientForAssessment?.patientName,
          patientEmrNumber: selectedPatientForAssessment?.emrNumber,
        }).catch((orderError) => {
          console.error(
            'Failed to submit physiotherapy orders/referrals:',
            orderError,
          );
          showToast({
            title: 'Orders Not Sent',
            message:
              'Assessment was saved, but one or more Orders & Services requests could not be sent.',
            type: 'warning',
          });
        });
      }
    }

    showToast({
      title: 'Assessment Saved',
      message:
        orderSelectionCount > 0
          ? 'Physiotherapy assessment saved. Orders & services are syncing in background.'
          : 'Physiotherapy assessment has been saved successfully.',
      type: 'success',
    });
    setAssessmentModalOpen(false);

    // Prompt to create a treatment plan from this assessment
    const patientInfo = selectedPatientForAssessment;
    setSelectedPatientForAssessment(null);
    refetchQueue();

    if (patientInfo?.clinicalRequestId) {
      completeRequestMutation.mutate(
        {
          id: patientInfo.clinicalRequestId,
          completion: { reviewed_by: staff?.id || '' },
        },
        {
          onSuccess: () => {
            refetchReferrals();
          },
          onError: (error) => {
            console.error('Failed to complete referral request:', error);
            showToast({
              title: 'Referral Update Failed',
              message:
                'Assessment saved, but the referral could not be marked complete.',
              type: 'warning',
            });
          },
        },
      );
    }

    // Pre-fill plan form from the assessment data
    const sessions = (data as any).estimated_sessions || 10;
    setPlanFormData((prev) => ({
      ...prev,
      totalSessions: sessions,
      startDate: new Date().toISOString().split('T')[0],
    }));
    setPlanCreationData({
      assessmentId: result.assessment_id,
      patientId: result.patient_id,
      encounterId: result.encounter_id,
      patientName: patientInfo?.patientName || 'Patient',
      clinicalRequestId: patientInfo?.clinicalRequestId,
      estimatedSessions: sessions,
    });
    setPlanCreationDialogOpen(true);

    return result;
  };

  const handleCloseAssessmentModal = () => {
    setAssessmentModalOpen(false);
    setSelectedPatientForAssessment(null);
    refetchAssessments();
    refetchReferrals();
  };

  // Treatment Plan creation handlers
  const handleCreatePlanFromAssessment = (assessment: PhysioAssessmentDTO) => {
    const sessions = assessment.estimated_sessions || 10;
    setPlanFormData((prev) => ({
      ...prev,
      totalSessions: sessions,
      startDate: new Date().toISOString().split('T')[0],
    }));
    setPlanCreationData({
      assessmentId: assessment.assessment_id,
      patientId: assessment.patient_id,
      encounterId: assessment.encounter_id,
      patientName: assessment.patient
        ? `${assessment.patient.first_name} ${assessment.patient.last_name}`
        : 'Patient',
    });
    setPlanCreationDialogOpen(true);
  };

  const handleConfirmCreatePlan = async () => {
    if (!planCreationData) return;

    const fee = parseFloat(planFormData.planFee);
    const isPerSessionBilling = planFormData.billingType === 'per_session';
    const billedTotal = isPerSessionBilling
      ? fee * planFormData.totalSessions
      : fee;
    if (isNaN(fee) || fee <= 0) {
      showToast({
        title: 'Invalid Fee',
        message: isPerSessionBilling
          ? 'Please enter a valid fee per session for billing.'
          : 'Please enter a valid package fee for billing.',
        type: 'error',
      });
      return;
    }

    try {
      const plan = await createPlanMutation.mutateAsync({
        assessment_id: planCreationData.assessmentId,
        patient_id: planCreationData.patientId,
        encounter_id: planCreationData.encounterId,
        total_sessions_planned: planFormData.totalSessions,
        frequency: planFormData.frequency,
        session_duration_minutes: planFormData.sessionDuration,
        billing_type: planFormData.billingType,
        instructions: planFormData.instructions || undefined,
        start_date: planFormData.startDate || undefined,
        clinical_request_id: planCreationData.clinicalRequestId,
      });

      // NHIS plans: NO billing order at creation. The plan goes to the NHIS
      // Service Approval Queue first. After NHIS approves:
      // - 100% coverage → payment waived, sessions unlock (no billing)
      // - < 100% coverage → billing order created for copay portion
      // Non-NHIS plans: billing order created immediately.
      if (isCreationPatientNhis) {
        showToast({
          title: 'Plan Created & Submitted to NHIS',
          message: `Created plan with ${planFormData.totalSessions} sessions. Routed to NHIS Service Approval Queue — sessions will unlock after the NHIS officer clears the request.`,
          type: 'success',
        });
      } else {
        try {
          await billPlanMutation.mutateAsync({
            planId: plan.plan_id,
            planFee: fee,
            description: `Physiotherapy Treatment Plan (${planFormData.totalSessions} sessions, ${planFormData.frequency}${isPerSessionBilling ? `, ₦${fee.toLocaleString()}/session` : `, package ₦${fee.toLocaleString()}`})`,
          });
          showToast({
            title: 'Treatment Plan Created & Billed',
            message: `Created plan with ${planFormData.totalSessions} sessions. Billing order for ₦${billedTotal.toLocaleString()} sent — sessions will unlock after payment verification.`,
            type: 'success',
          });
        } catch (billError) {
          console.error('Failed to auto-bill plan:', billError);
          showToast({
            title: 'Plan Created (Billing Failed)',
            message: `Plan created but billing order failed. Please bill manually from the Treatment Plans tab.`,
            type: 'warning',
          });
        }
      }

      setPlanCreationDialogOpen(false);
      setPlanCreationData(null);
      setActiveTab('plans');
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create treatment plan',
        type: 'error',
      });
    }
  };

  const handleSkipPlanCreation = () => {
    setPlanCreationDialogOpen(false);
    setPlanCreationData(null);
  };

  // Filter sessions by search term and status
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    let filtered = sessions;

    if (statusFilter) {
      filtered = filtered.filter((s) => s.attendance_status === statusFilter);
    }

    if (!searchTerm.trim()) return filtered;

    const query = searchTerm.toLowerCase();
    return filtered.filter((s) => {
      const patientName = s.patient
        ? `${s.patient.first_name} ${s.patient.surname}`.toLowerCase()
        : '';
      const treatmentDesc = (s.treatment_provided || '').toLowerCase();
      return patientName.includes(query) || treatmentDesc.includes(query);
    });
  }, [sessions, searchTerm, statusFilter]);

  // Counts for stats
  const attendedCount = useMemo(() => {
    return (
      sessions?.filter((s) => s.attendance_status === 'Attended').length || 0
    );
  }, [sessions]);

  const missedCount = useMemo(() => {
    return (
      sessions?.filter((s) => s.attendance_status === 'Missed').length || 0
    );
  }, [sessions]);

  // Referrals count for badge
  const referralsCount = referrals.length;

  // Queue count for badge
  const queueCount =
    queueData?.filter((q) => q.status === 'Waiting').length || 0;

  const parsedPlanFee = parseFloat(planFormData.planFee);
  const normalizedPlanFee =
    Number.isFinite(parsedPlanFee) && parsedPlanFee > 0 ? parsedPlanFee : 0;
  const isPerSessionPlanBilling = planFormData.billingType === 'per_session';
  const plannedBillingTotal = isPerSessionPlanBilling
    ? normalizedPlanFee * planFormData.totalSessions
    : normalizedPlanFee;

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderQueueRow = (queueEntry: QueueDTO) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      Waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      Called: { bg: 'bg-blue-100', text: 'text-blue-800' },
      Being_Served: { bg: 'bg-green-100', text: 'text-green-800' },
      Completed: { bg: 'bg-gray-100', text: 'text-gray-800' },
    };
    const statusColor = statusColors[queueEntry.status] || statusColors.Waiting;

    return (
      <tr
        key={queueEntry.id}
        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
          queueRowFocusId === queueEntry.id
            ? 'bg-purple-50 ring-1 ring-inset ring-purple-200'
            : ''
        }`}
        onClick={() => setQueueRowFocusId(queueEntry.id)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-700 font-semibold">
                {queueEntry.ticket_number}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {queueEntry.patient?.first_name} {queueEntry.patient?.surname}
              </span>
              <div className="text-xs text-gray-500">
                EMR: {queueEntry.patient?.emr_number}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${statusColor.bg} ${statusColor.text}`}
            >
              {queueEntry.status?.replace('_', ' ')}
            </span>
            {queueEntry.encounter?.encounter_number && (
              <span className="text-xs text-purple-600 font-medium">
                {queueEntry.encounter.encounter_number}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              queueEntry.priority === 'Emergency'
                ? 'bg-red-100 text-red-800'
                : queueEntry.priority === 'Urgent'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {queueEntry.priority}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            {formatDistanceToNow(new Date(queueEntry.created_at), {
              addSuffix: true,
            })}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (queueEntry.patient) {
                  setSelectedPatientForRecords({
                    patientId: queueEntry.patient.patient_id || '',
                    patientName: `${queueEntry.patient.first_name || ''} ${queueEntry.patient.surname || ''}`,
                    emrNumber: queueEntry.patient.emr_number || '',
                  });
                  setPatientRecordsModalOpen(true);
                }
              }}
              disabled={!queueEntry.patient?.patient_id}
              title="View patient medical records"
            >
              <User size={14} className="mr-1" />
              Records
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleStartAssessment(
                  queueEntry.patient?.patient_id || '',
                  queueEntry.patient?.emr_number || '',
                  queueEntry.visit_id,
                  `${queueEntry.patient?.first_name || ''} ${queueEntry.patient?.surname || ''}`,
                  queueEntry.encounter?.encounter_number,
                  undefined,
                  queueEntry.priority,
                );
              }}
              disabled={!queueEntry.patient?.patient_id || !queueEntry.visit_id}
              title={!queueEntry.visit_id ? 'Missing encounter ID' : ''}
            >
              <ArrowRight size={14} className="mr-1" />
              Session
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderQueueTab = () => (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-green-900">Waiting Queue</h4>
          <p className="text-sm text-green-700">
            These patients have completed payment verification and are waiting
            for physiotherapy session.
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Physiotherapy Waiting Queue
          </h3>
          <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>

        {queueLoading ? (
          <div className="p-8 text-center text-gray-500">Loading queue...</div>
        ) : queueData.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">
              No patients in the physiotherapy queue
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Patients will appear here after payment verification
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Wait Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queueData.map(renderQueueRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderReferralRow = (referral: ClinicalRequestWithDetailsDTO) => {
    const urgencyColors: Record<string, { bg: string; text: string }> = {
      Routine: { bg: 'bg-gray-100', text: 'text-gray-800' },
      Urgent: { bg: 'bg-orange-100', text: 'text-orange-800' },
      Stat: { bg: 'bg-red-100', text: 'text-red-800' },
      Emergency: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const urgency = referral.urgency || 'Routine';
    const urgencyColor = urgencyColors[urgency] || urgencyColors.Routine;

    return (
      <tr key={referral.id} className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">
              {referral.patient_name || 'Unknown Patient'}
            </span>
            <span className="text-xs text-gray-500">{referral.emr_number}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor.bg} ${urgencyColor.text}`}
          >
            {urgency}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-gray-600 text-sm">
            {referral.requesting_doctor_name || 'Unknown'}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-500 text-sm">
          {referral.created_at
            ? formatDistanceToNow(new Date(referral.created_at), {
                addSuffix: true,
              })
            : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedReferral(referral);
                setReferralDetailsModalOpen(true);
              }}
              title="View referral details and patient records"
            >
              <Eye size={14} className="mr-1" />
              Details
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                handleStartAssessment(
                  referral.patient_public_id || referral.patient_id,
                  referral.emr_number || '',
                  referral.encounter_id,
                  referral.patient_name || 'Unknown Patient',
                  referral.encounter_number,
                  referral.id,
                  urgencyForClinicalAlerts(referral.urgency),
                )
              }
              disabled={
                (!referral.patient_public_id && !referral.patient_id) ||
                !referral.encounter_id
              }
              title={!referral.encounter_id ? 'Missing encounter ID' : ''}
              className="bg-lime-600 hover:bg-lime-700"
            >
              <ArrowRight size={14} className="mr-1" />
              Assess
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderReferralsTab = () => (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-teal-900">Incoming Referrals</h4>
          <p className="text-sm text-teal-700">
            These are patients referred to the Physiotherapy department from
            GOPD or other clinics. Click "Start Assessment" to begin the
            physiotherapy assessment.
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Physiotherapy Referrals Queue
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchReferrals()}
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>

        {referralsLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading referrals...
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No pending physiotherapy referrals</p>
            <p className="text-sm text-gray-400 mt-1">
              Patients referred from consultations will appear here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Urgency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Referred By
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  When
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.map(renderReferralRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderSessionRow = (session: PhysioSessionDTO) => {
    const statusColor =
      STATUS_COLORS[session.attendance_status || 'Attended'] ||
      STATUS_COLORS.Attended;
    const canBill = session.attendance_status === 'Attended';

    return (
      <tr key={session.session_id} className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">
              {session.patient?.first_name} {session.patient?.surname}
            </span>
            {session.patient?.emr_number && (
              <span className="text-xs text-gray-500">
                EMR: {session.patient.emr_number}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-gray-900">
              Session #{session.session_number}
            </span>
            <span className="text-xs text-gray-500">
              {session.session_date
                ? format(new Date(session.session_date), 'MMM d, yyyy')
                : '—'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-gray-600 line-clamp-1">
            {session.treatment_provided || '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          {session.duration_minutes ? (
            <span className="text-gray-600">
              {session.duration_minutes} min
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
          >
            {session.attendance_status?.replace('_', ' ')}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {canBill && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBillSession(session)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <DollarSign size={14} className="mr-1" />
                Bill
              </Button>
            )}
            <Button size="sm" variant="ghost">
              <Eye size={14} />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderSessionsTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient name or treatment..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => refetchSessions()}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {sessionsLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center">
            <HeartPulse className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No physiotherapy sessions found</p>
            <p className="text-sm text-gray-400 mt-1">
              Sessions created from treatment plans will appear here
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Session
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Treatment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSessions.map(renderSessionRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderAssessmentsTab = () => {
    if (assessmentsLoading) {
      return <SkeletonDashboard />;
    }

    const assessments = assessmentsData || [];

    if (assessments.length === 0) {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No assessments found</p>
            <p className="text-sm text-gray-400 mt-1">
              Assessments will appear here after completing them from the queue
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium text-gray-900">
              Physiotherapy Assessment Records
            </h3>
            <p className="text-sm text-gray-500">
              View all physiotherapy assessments conducted
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assessments.map((assessment) => {
                  const hasClinicialData =
                    assessment.chief_complaint ||
                    assessment.physio_diagnosis ||
                    assessment.palpation_findings ||
                    assessment.pain_location ||
                    assessment.functional_status ||
                    assessment.rom_notes;
                  const displayStatus = normalizeAssessmentStatus(
                    assessment.status,
                    Boolean(hasClinicialData),
                  );
                  return (
                    <tr
                      key={assessment.assessment_id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {assessment.patient
                            ? `${assessment.patient.first_name} ${assessment.patient.last_name}`
                            : 'Unknown Patient'}
                        </div>
                        {assessment.patient?.emr_number && (
                          <div className="text-xs text-gray-500">
                            EMR: {assessment.patient.emr_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            displayStatus === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : displayStatus === 'Active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAssessmentForView(assessment);
                              setViewAssessmentModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCreatePlanFromAssessment(assessment)
                            }
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Create Plan
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-8 px-5 sm:px-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Physiotherapy Module
          </h1>
          <p className="text-gray-600">
            Manage therapy sessions and treatment plans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAIPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium transition-colors"
            title="AI Clinical Assistant"
          >
            <Bot size={16} />
            AI Assistant
          </button>
          <PhysioExportPanel data={filteredSessions} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-5">
        <StatsCard
          title="In Queue"
          value={queueData.length}
          icon={Clock}
          color="blue"
        />
        <StatsCard
          title="Referrals"
          value={referralsCount}
          icon={UserPlus}
          color="blue"
        />
        <StatsCard
          title="Attended"
          value={stats?.sessions_attended || attendedCount}
          icon={Check}
          color="green"
        />
        <StatsCard
          title="Missed"
          value={stats?.sessions_missed || missedCount}
          icon={XCircle}
          color="red"
        />
        <StatsCard
          title="Assessments"
          value={stats?.total_assessments || 0}
          icon={ClipboardList}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'queue'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Waiting Queue
            {queueCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                {queueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'referrals'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Referrals Queue
            {referralsCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">
                {referralsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'assessments'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Assessments
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'plans'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Treatment Plans
          </button>
        </nav>
      </div>

      <details className="group rounded-xl border border-gray-200 bg-white/90 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-800 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>Module tips &amp; guidance</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-3 sm:px-5">
          {activeTab === 'queue' && (
            <InlineGuidance
              module="physiotherapy"
              title="Therapy queue"
              message="Click a queue row to focus that patient. Alerts appear as on-screen notifications you can dismiss."
            />
          )}
          {activeTab === 'referrals' && (
            <InlineGuidance
              module="physiotherapy"
              title="Referrals"
              message="Incoming referrals from physicians for physical therapy."
            />
          )}
          {activeTab === 'assessments' && (
            <InlineGuidance
              module="physiotherapy"
              title="Assessments"
              message="Initial evaluations, progress notes, and discharge summaries."
            />
          )}
          {activeTab === 'plans' && (
            <InlineGuidance
              module="physiotherapy"
              title="Treatment plans"
              message="Active plans, sessions, and rehabilitation progress."
            />
          )}
        </div>
      </details>

      {/* Tab Content */}
      {activeTab === 'queue' && renderQueueTab()}
      {activeTab === 'referrals' && renderReferralsTab()}
      {activeTab === 'assessments' && renderAssessmentsTab()}
      {activeTab === 'plans' && <PhysioTreatmentPlanDashboard />}

      {/* Bill Session Dialog */}
      {billSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Bill Physiotherapy Session
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Create a billing order for Session #{billSession.session_number}{' '}
              for {billSession.patient?.first_name}{' '}
              {billSession.patient?.surname}.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Fee (₦)
              </label>
              <input
                type="number"
                value={sessionFee}
                onChange={(e) => setSessionFee(e.target.value)}
                placeholder="Enter session fee..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setBillSession(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmBillSession}
                disabled={billSessionMutation.isPending}
              >
                {billSessionMutation.isPending
                  ? 'Creating Bill...'
                  : 'Create Bill'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Physiotherapy Assessment Modal */}
      {assessmentModalOpen && selectedPatientForAssessment && (
        <Modal
          isOpen={assessmentModalOpen}
          onClose={handleCloseAssessmentModal}
          title="Physiotherapy Assessment"
          size="max"
          allowMaximize
          showCloseButton
          noPadding
        >
          <PhysioAssessmentWizard
            patientId={selectedPatientForAssessment.patientId}
            emrNumber={selectedPatientForAssessment.emrNumber}
            encounterId={selectedPatientForAssessment.encounterId}
            patientName={selectedPatientForAssessment.patientName}
            encounterNumber={selectedPatientForAssessment.encounterNumber}
            onSaveAssessment={handleSaveAssessment}
            onClose={handleCloseAssessmentModal}
          />
        </Modal>
      )}

      {/* Physio Assessment View Modal */}
      {selectedAssessmentForView && (
        <PhysioAssessmentViewModal
          assessment={selectedAssessmentForView}
          isOpen={viewAssessmentModalOpen}
          onClose={() => {
            setViewAssessmentModalOpen(false);
            setSelectedAssessmentForView(null);
          }}
        />
      )}

      {/* Referral Details Modal */}
      <ReferralDetailsModal
        isOpen={referralDetailsModalOpen}
        onClose={() => {
          setReferralDetailsModalOpen(false);
          setSelectedReferral(null);
        }}
        referral={selectedReferral}
        specialty="Physiotherapy"
        onStartExam={() => {
          if (selectedReferral) {
            handleStartAssessment(
              selectedReferral.patient_public_id || selectedReferral.patient_id,
              selectedReferral.emr_number || '',
              selectedReferral.encounter_id,
              selectedReferral.patient_name || 'Unknown Patient',
              selectedReferral.encounter_number,
              selectedReferral.id,
              urgencyForClinicalAlerts(selectedReferral.urgency),
            );
          }
        }}
      />

      {/* Treatment Plan Creation Dialog */}
      {planCreationDialogOpen && planCreationData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Create Treatment Plan
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Set up a treatment plan for{' '}
              <span className="font-medium">
                {planCreationData.patientName}
              </span>{' '}
              based on the completed assessment.
            </p>

            {isCreationPatientNhis && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-medium">
                  NHIS Patient — Plan requires NHIS pre-authorization
                </p>
                <p className="text-xs text-green-700 mt-1">
                  This plan will be routed to the NHIS Service Approval Queue
                  after creation. Sessions are capped at 6 for NHIS patients
                  and will remain locked until the NHIS desk approves and
                  enters an authorization code.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Sessions{isCreationPatientNhis ? ' (max 6 NHIS)' : ''}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={isCreationPatientNhis ? 6 : 100}
                    value={planFormData.totalSessions}
                    onChange={(e) =>
                      setPlanFormData((prev) => ({
                        ...prev,
                        totalSessions: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={planFormData.frequency}
                    onChange={(e) =>
                      setPlanFormData((prev) => ({
                        ...prev,
                        frequency: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="2x per week">2x per week</option>
                    <option value="3x per week">3x per week</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Duration (min)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    step={15}
                    value={planFormData.sessionDuration}
                    onChange={(e) =>
                      setPlanFormData((prev) => ({
                        ...prev,
                        sessionDuration: parseInt(e.target.value) || 45,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type
                  </label>
                  <select
                    value={planFormData.billingType}
                    onChange={(e) =>
                      setPlanFormData((prev) => ({
                        ...prev,
                        billingType: e.target.value as PhysioBillingType,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="per_session">Per Session</option>
                    <option value="package">Package</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isPerSessionPlanBilling
                      ? 'Fee Per Session (₦)'
                      : 'Package Fee (₦)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={planFormData.planFee}
                    onChange={(e) =>
                      setPlanFormData((prev) => ({
                        ...prev,
                        planFee: e.target.value,
                      }))
                    }
                    placeholder={
                      isPerSessionPlanBilling
                        ? 'Enter fee per session...'
                        : 'Enter package fee...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {isPerSessionPlanBilling
                      ? `Total billing preview: ₦${plannedBillingTotal.toLocaleString()} (${planFormData.totalSessions} sessions)`
                      : `Total billing preview: ₦${plannedBillingTotal.toLocaleString()} (package)`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={planFormData.startDate}
                    onChange={(e) =>
                      setPlanFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions (optional)
                </label>
                <textarea
                  value={planFormData.instructions}
                  onChange={(e) =>
                    setPlanFormData((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Additional treatment instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleSkipPlanCreation}>
                Skip for Now
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCreatePlan}
                disabled={createPlanMutation.isPending}
              >
                {createPlanMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{' '}
                    {isCreationPatientNhis ? 'Submitting to NHIS...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />{' '}
                    {isCreationPatientNhis ? 'Create Plan & Submit to NHIS' : 'Create Plan'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Medical Records Modal */}
      {patientRecordsModalOpen && selectedPatientForRecords && (
        <Modal
          isOpen={patientRecordsModalOpen}
          onClose={() => {
            setPatientRecordsModalOpen(false);
            setSelectedPatientForRecords(null);
          }}
          title={`Medical Records - ${selectedPatientForRecords.patientName}`}
          size="xl"
        >
          <PatientMedicalRecordsPanel
            patientId={selectedPatientForRecords.patientId}
            showHeader
            maxHeight="70vh"
          />
        </Modal>
      )}

      {/* AI Assistant Slide-over */}
      {isAIPanelOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setIsAIPanelOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[61] w-full max-w-4xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-purple-700 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-xl p-2 border border-white/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-sm font-semibold">XenoCare AI Assistants</span>
                  <span className="block text-[11px] text-white/80">Physiotherapy</span>
                </div>
              </div>
              <button
                onClick={() => setIsAIPanelOpen(false)}
                className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <AIChatPanel
                patientId={null}
                facilityId={staff?.facility_id ?? ''}
                userId={staff?.id ?? ''}
                department="Physiotherapy"
                variant="minimal"
                className="h-full"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
