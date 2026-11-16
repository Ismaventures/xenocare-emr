/**
 * Clinical Requests Page
 * ======================
 * Modern, interactive page for managing clinical requests.
 * Three-stage workflow: Needs Approval → Awaiting Payment → Ready to Execute
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Stethoscope,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  Users,
  ArrowRightLeft,
  LogOut,
  CreditCard,
  PlayCircle,
  Clock,
  Search,
  ChevronRight,
  Activity,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../contexts/AuthContext';
import { RequestDetailModal } from '../components/RequestDetailModal';
import { ProcedureSchedulingModal } from '../components/ProcedureSchedulingModal';
import {
  DischargeExecutionModal,
  DischargeExecutionModalData,
} from '../components/DischargeExecutionModal';
import ProcedureApprovalModal, {
  ProcedureEncounterGroup,
} from '../components/ProcedureApprovalModal';
import {
  useClinicalRequests,
  useApproveRequest,
  useRejectRequest,
  useScheduleRequest,
  useStartRequest,
  useCompleteRequest,
  useCancelRequest,
  useRequestSummary,
  useScheduleProcedure,
  useExecuteDischarge,
} from '../hooks/useClinicalRequests';
import {
  ClinicalRequestWithDetailsDTO,
  ClinicalRequestType,
  ClinicalRequestStatus,
  REQUEST_STATUS_CONFIG,
  URGENCY_CONFIG,
  isUrgent,
} from '../dtos/clinical-request.dto';

// Three workflow stages
type WorkflowTab = 'needs-approval' | 'awaiting-payment' | 'ready-to-execute';

// Request type filter
type RequestTypeFilter =
  | 'all'
  | 'procedures'
  | 'follow-ups'
  | 'referrals'
  | 'transfers'
  | 'discharges';

interface RequestTypeOption {
  key: RequestTypeFilter;
  label: string;
  icon: React.ReactNode;
  types?: ClinicalRequestType[];
}

const REQUEST_TYPES: RequestTypeOption[] = [
  {
    key: 'all',
    label: 'All Types',
    icon: <ClipboardList className="w-3.5 h-3.5" />,
  },
  {
    key: 'procedures',
    label: 'Procedures',
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    types: ['Procedure', 'Surgery'],
  },
  {
    key: 'follow-ups',
    label: 'Follow-ups',
    icon: <CalendarClock className="w-3.5 h-3.5" />,
    types: ['Follow-Up'],
  },
  {
    key: 'referrals',
    label: 'Referrals',
    icon: <Users className="w-3.5 h-3.5" />,
    types: ['Referral'],
  },
  {
    key: 'transfers',
    label: 'Transfers',
    icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
    types: ['Transfer'],
  },
  {
    key: 'discharges',
    label: 'Discharges',
    icon: <LogOut className="w-3.5 h-3.5" />,
    types: ['Discharge'],
  },
];

// --- Inline Compact Request Row ---
const RequestRow: React.FC<{
  request: ClinicalRequestWithDetailsDTO;
  onClick: (r: ClinicalRequestWithDetailsDTO) => void;
}> = ({ request, onClick }) => {
  const statusCfg = REQUEST_STATUS_CONFIG[request.status];
  const urgent = isUrgent(request);

  return (
    <div
      onClick={() => onClick(request)}
      className={`
        group flex items-center gap-3 px-4 py-3 bg-white rounded-xl border
        cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-blue-300 hover:-translate-y-[1px]
        ${
          urgent
            ? 'border-l-[3px] border-l-red-500 border-t border-r border-b border-gray-200'
            : 'border-gray-200'
        }
      `}
    >
      {/* Urgency Indicator */}
      <div
        className={`shrink-0 w-2 h-2 rounded-full ${
          request.urgency === 'Emergency'
            ? 'bg-red-500 animate-pulse'
            : request.urgency === 'Urgent'
              ? 'bg-orange-500'
              : 'bg-gray-300'
        }`}
      />

      {/* Type Badge */}
      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
        {request.request_type === 'Follow-Up'
          ? 'Follow-Up'
          : request.request_type === 'Surgery'
            ? 'Surgery'
            : request.request_type}
      </span>

      {/* Patient Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {request.patient_name}
          </span>
          <span className="text-xs text-gray-400 shrink-0">
            {request.emr_number}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {request.clinical_reason}
        </p>
      </div>

      {/* Doctor */}
      <div className="hidden lg:block shrink-0 text-xs text-gray-500 max-w-[140px] truncate">
        Dr. {request.requesting_doctor_name}
      </div>

      {/* Time */}
      <div className="shrink-0 text-xs text-gray-400 w-16 text-right">
        {formatDistanceToNow(new Date(request.created_at), {
          addSuffix: false,
        })}
      </div>

      {/* Status Badge */}
      <span
        className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${statusCfg.bgColor} ${statusCfg.color}`}
      >
        {statusCfg.label}
      </span>

      {/* Chevron */}
      <ChevronRight className="shrink-0 w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
    </div>
  );
};

export const ClinicalRequestsPage: React.FC = () => {
  const { user, staff } = useAuth();
  const facilityId = staff?.facility_id || '';

  // Workflow tab state
  const [workflowTab, setWorkflowTab] = useState<WorkflowTab>('needs-approval');
  const [requestTypeFilter, setRequestTypeFilter] =
    useState<RequestTypeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [selectedRequest, setSelectedRequest] =
    useState<ClinicalRequestWithDetailsDTO | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showProcedureApprovalModal, setShowProcedureApprovalModal] =
    useState(false);
  const [selectedProcedureEncounterGroup, setSelectedProcedureEncounterGroup] =
    useState<ProcedureEncounterGroup | null>(null);
  const [selectedAdmissionInfo, setSelectedAdmissionInfo] = useState<{
    id: string;
    admission_number: string;
    admission_date: string;
    ward_id: string;
    ward_name: string;
    bed_id: string;
    bed_number: string;
    admitting_diagnosis?: string;
    attending_physician_name?: string;
  } | null>(null);

  // Get current request type filter
  const currentTypeFilter = REQUEST_TYPES.find(
    (t) => t.key === requestTypeFilter,
  );

  // Build query filters - exclude Admission (handled by In-Patient module)
  const queryFilters = useMemo(() => {
    const typeOption = REQUEST_TYPES.find((t) => t.key === requestTypeFilter);

    const filters: {
      request_type?: ClinicalRequestType[];
      status?: ClinicalRequestStatus[];
    } = {};

    if (typeOption?.types) {
      filters.request_type = typeOption.types;
    } else {
      // For "All", exclude Admission requests
      filters.request_type = [
        'Procedure',
        'Surgery',
        'Follow-Up',
        'Referral',
        'Transfer',
        'Discharge',
      ];
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [requestTypeFilter]);

  // Query hooks - fetch all requests
  const {
    data: requests = [],
    isLoading,
    error: queryError,
    refetch,
  } = useClinicalRequests(queryFilters);

  // Log any query errors for debugging
  useEffect(() => {
    if (queryError) {
      console.error('[ClinicalRequestsPage] Query error:', queryError);
    }
  }, [queryError]);

  // Refetch when filters change
  useEffect(() => {
    refetch();
  }, [queryFilters, refetch]);

  const { data: summary } = useRequestSummary();

  // Separate requests into three workflow stages
  const { pendingApproval, awaitingPayment, readyToProcess } = useMemo(() => {
    const pending: ClinicalRequestWithDetailsDTO[] = [];
    const awaiting: ClinicalRequestWithDetailsDTO[] = [];
    const ready: ClinicalRequestWithDetailsDTO[] = [];

    requests.forEach((req) => {
      if (req.status === 'Pending' || req.status === 'Under_Review') {
        pending.push(req);
      } else if (req.status === 'Approved') {
        const billingStatus = req.billing_status;
        if (billingStatus === 'Paid' || billingStatus === 'Verified') {
          ready.push(req);
        } else {
          awaiting.push(req);
        }
      } else if (req.status === 'Scheduled' || req.status === 'In_Progress') {
        ready.push(req);
      }
    });

    return {
      pendingApproval: pending,
      awaitingPayment: awaiting,
      readyToProcess: ready,
    };
  }, [requests]);

  // Apply search + type filter to the active list
  const getFilteredList = useCallback(
    (list: ClinicalRequestWithDetailsDTO[]) => {
      let filtered = list;

      // Type filter
      if (currentTypeFilter?.types) {
        filtered = filtered.filter((r) =>
          currentTypeFilter.types!.includes(r.request_type),
        );
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.patient_name?.toLowerCase().includes(term) ||
            r.emr_number?.toLowerCase().includes(term) ||
            r.request_number?.toLowerCase().includes(term) ||
            r.clinical_reason?.toLowerCase().includes(term) ||
            r.requesting_doctor_name?.toLowerCase().includes(term),
        );
      }

      // Sort: Emergency first, then Urgent, then Routine; within each, newest first
      return filtered.sort((a, b) => {
        const urgOrder: Record<string, number> = {
          Emergency: 0,
          Urgent: 1,
          Routine: 2,
        };
        const diff = (urgOrder[a.urgency] ?? 2) - (urgOrder[b.urgency] ?? 2);
        if (diff !== 0) return diff;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    },
    [currentTypeFilter, searchTerm],
  );

  const activeList = useMemo(() => {
    switch (workflowTab) {
      case 'needs-approval':
        return getFilteredList(pendingApproval);
      case 'awaiting-payment':
        return getFilteredList(awaitingPayment);
      case 'ready-to-execute':
        return getFilteredList(readyToProcess);
      default:
        return [];
    }
  }, [
    workflowTab,
    pendingApproval,
    awaitingPayment,
    readyToProcess,
    getFilteredList,
  ]);

  // Group procedure requests by encounter for batch approval
  const procedureEncounterGroups = useMemo(() => {
    const procedureRequests = pendingApproval.filter(
      (r) => r.request_type === 'Procedure' || r.request_type === 'Surgery',
    );

    const groupMap = new Map<string, ProcedureEncounterGroup>();

    procedureRequests.forEach((req) => {
      const encounterId = req.encounter_id;
      if (!groupMap.has(encounterId)) {
        groupMap.set(encounterId, {
          encounter_id: encounterId,
          patient_name: req.patient_name || 'Unknown Patient',
          patient_id: req.patient_id,
          emr_number: req.emr_number || '',
          doctor_name: req.requesting_doctor_name || 'Unknown Doctor',
          encounter_date: req.created_at || new Date().toISOString(),
          requests: [],
          pending_count: 0,
          total_count: 0,
        });
      }

      const group = groupMap.get(encounterId)!;
      group.requests.push(req);
      group.total_count++;
      group.pending_count++;
    });

    return Array.from(groupMap.values()).sort(
      (a, b) =>
        new Date(b.encounter_date).getTime() -
        new Date(a.encounter_date).getTime(),
    );
  }, [pendingApproval]);

  // Mutation hooks
  const approveRequestMutation = useApproveRequest();
  const rejectRequestMutation = useRejectRequest();
  const scheduleRequestMutation = useScheduleRequest();
  const startRequestMutation = useStartRequest();
  const completeRequestMutation = useCompleteRequest();
  const cancelRequestMutation = useCancelRequest();
  const scheduleProcedureMutation = useScheduleProcedure();
  const executeDischargeMutation = useExecuteDischarge();

  // Handler for opening procedure approval modal
  const handleOpenProcedureApproval = (group: ProcedureEncounterGroup) => {
    setSelectedProcedureEncounterGroup(group);
    setShowProcedureApprovalModal(true);
  };

  // Handlers
  const handleRequestClick = (request: ClinicalRequestWithDetailsDTO) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  const handleApprove = async (
    request: ClinicalRequestWithDetailsDTO,
    notes?: string,
  ) => {
    try {
      await approveRequestMutation.mutateAsync({
        id: request.id,
        approval: { approved_by: staff?.id || '', review_notes: notes },
      });

      if (
        request.request_type === 'Procedure' ||
        request.request_type === 'Surgery'
      ) {
        const updatedRequest = {
          ...request,
          status: 'Approved' as ClinicalRequestStatus,
        };
        setSelectedRequest(updatedRequest);
        setShowModal(false);
        setShowProcedureModal(true);
      } else if (request.request_type === 'Discharge') {
        const updatedRequest = {
          ...request,
          status: 'Approved' as ClinicalRequestStatus,
        };
        handleOpenDischargeExecution(updatedRequest);
      } else {
        handleCloseModal();
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (
    request: ClinicalRequestWithDetailsDTO,
    reason: string,
  ) => {
    try {
      await rejectRequestMutation.mutateAsync({
        id: request.id,
        rejection: { reviewed_by: staff?.id || '', rejection_reason: reason },
      });
      handleCloseModal();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleSchedule = async (
    request: ClinicalRequestWithDetailsDTO,
    date: string,
    time?: string,
    notes?: string,
  ) => {
    try {
      await scheduleRequestMutation.mutateAsync({
        id: request.id,
        schedule: {
          scheduled_date: date,
          scheduled_time: time,
          scheduled_by: staff?.id || '',
          scheduling_notes: notes,
        },
      });
      handleCloseModal();
      setWorkflowTab('ready-to-execute');
    } catch (error) {
      console.error('Failed to schedule request:', error);
    }
  };

  const handleStart = async (request: ClinicalRequestWithDetailsDTO) => {
    try {
      await startRequestMutation.mutateAsync({
        id: request.id,
        staffId: staff?.id || '',
      });
      handleCloseModal();
    } catch (error) {
      console.error('Failed to start request:', error);
    }
  };

  const handleComplete = async (
    request: ClinicalRequestWithDetailsDTO,
    notes?: string,
  ) => {
    try {
      await completeRequestMutation.mutateAsync({
        id: request.id,
        completion: { reviewed_by: staff?.id || '', review_notes: notes },
      });
      handleCloseModal();
    } catch (error) {
      console.error('Failed to complete request:', error);
    }
  };

  const handleCancel = async (
    request: ClinicalRequestWithDetailsDTO,
    reason?: string,
  ) => {
    try {
      await cancelRequestMutation.mutateAsync({
        id: request.id,
        staffId: staff?.id || '',
        reason,
      });
      handleCloseModal();
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleOpenProcedureScheduling = (
    request: ClinicalRequestWithDetailsDTO,
  ) => {
    setSelectedRequest(request);
    setShowModal(false);
    setShowProcedureModal(true);
  };

  const handleScheduleProcedure = async (data: {
    request_id: string;
    patient_id: string;
    encounter_id: string;
    scheduled_date: string;
    scheduled_time: string;
    scheduled_duration_minutes?: number;
    theatre_room?: string;
    surgeon_id?: string;
    anesthesiologist_id?: string;
    pre_op_instructions?: string;
    special_equipment?: string;
    notes?: string;
  }) => {
    try {
      await scheduleProcedureMutation.mutateAsync({
        ...data,
        facility_id: facilityId,
        scheduled_by: staff?.id || '',
      });
      setShowProcedureModal(false);
      setSelectedRequest(null);
      setWorkflowTab('ready-to-execute');
    } catch (error) {
      console.error('Failed to schedule procedure:', error);
      throw error;
    }
  };

  const handleOpenDischargeExecution = async (
    request: ClinicalRequestWithDetailsDTO,
  ) => {
    const admissionInfo = {
      id: request.admission_id || '',
      admission_number: `ADM-${request.request_number?.replace('REQ-', '')}`,
      admission_date:
        request.created_at?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      ward_id: request.target_ward_id || '',
      ward_name: request.target_ward_name || 'Unknown Ward',
      bed_id: '',
      bed_number: '',
      admitting_diagnosis: request.clinical_reason,
      attending_physician_name: request.requesting_doctor_name,
    };

    setSelectedAdmissionInfo(admissionInfo);
    setSelectedRequest(request);
    setShowModal(false);
    setShowDischargeModal(true);
  };

  const handleExecuteDischarge = async (data: DischargeExecutionModalData) => {
    try {
      await executeDischargeMutation.mutateAsync({
        ...data,
        executed_by: staff?.id || '',
      });
      setShowDischargeModal(false);
      setSelectedRequest(null);
      setSelectedAdmissionInfo(null);
    } catch (error) {
      console.error('Failed to execute discharge:', error);
      throw error;
    }
  };

  // Count requests per type for filter badges
  const typeCounts = useMemo(() => {
    const sourceList =
      workflowTab === 'needs-approval'
        ? pendingApproval
        : workflowTab === 'awaiting-payment'
          ? awaitingPayment
          : readyToProcess;

    const counts: Record<RequestTypeFilter, number> = {
      all: sourceList.length,
      procedures: 0,
      'follow-ups': 0,
      referrals: 0,
      transfers: 0,
      discharges: 0,
    };

    sourceList.forEach((r) => {
      if (r.request_type === 'Procedure' || r.request_type === 'Surgery')
        counts.procedures++;
      else if (r.request_type === 'Follow-Up') counts['follow-ups']++;
      else if (r.request_type === 'Referral') counts.referrals++;
      else if (r.request_type === 'Transfer') counts.transfers++;
      else if (r.request_type === 'Discharge') counts.discharges++;
    });

    return counts;
  }, [workflowTab, pendingApproval, awaitingPayment, readyToProcess]);

  // Workflow tab config
  const workflowTabs: {
    key: WorkflowTab;
    label: string;
    icon: React.ReactNode;
    count: number;
    color: string;
    activeColor: string;
    badgeColor: string;
    description: string;
    statBg: string;
  }[] = [
    {
      key: 'needs-approval',
      label: 'Needs Approval',
      icon: <Clock className="w-4 h-4" />,
      count: pendingApproval.length,
      color: 'text-amber-600',
      activeColor: 'border-amber-500 bg-amber-50 text-amber-800',
      badgeColor: 'bg-amber-500 text-white',
      description: 'Requests awaiting clinical review and approval',
      statBg: 'bg-amber-100',
    },
    {
      key: 'awaiting-payment',
      label: 'Awaiting Payment',
      icon: <CreditCard className="w-4 h-4" />,
      count: awaitingPayment.length,
      color: 'text-orange-600',
      activeColor: 'border-orange-500 bg-orange-50 text-orange-800',
      badgeColor: 'bg-orange-500 text-white',
      description:
        'Approved requests pending payment verification from billing',
      statBg: 'bg-orange-100',
    },
    {
      key: 'ready-to-execute',
      label: 'Ready to Execute',
      icon: <PlayCircle className="w-4 h-4" />,
      count: readyToProcess.length,
      color: 'text-green-600',
      activeColor: 'border-green-500 bg-green-50 text-green-800',
      badgeColor: 'bg-green-600 text-white',
      description: 'Payment verified — schedule or execute these requests',
      statBg: 'bg-green-100',
    },
  ];

  const activeTabConfig = workflowTabs.find((t) => t.key === workflowTab)!;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100/50">
      {/* ─── Header ─── */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Clinical Requests
                </h1>
                <p className="text-xs text-gray-500">
                  Manage request workflow from approval to execution
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patient, EMR, doctor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ─── Summary Stats ─── */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {requests.length}
                </p>
                <p className="text-[11px] text-gray-500 font-medium">
                  Total Active
                </p>
              </div>
            </div>
            {workflowTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setWorkflowTab(tab.key)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  workflowTab === tab.key
                    ? 'ring-2 ring-offset-1 ring-blue-400 border-blue-300 bg-white shadow-sm'
                    : 'border-gray-100 bg-white/50 hover:bg-white hover:border-gray-200'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${tab.statBg}`}
                >
                  <span className={tab.color}>{tab.icon}</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{tab.count}</p>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {tab.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Workflow Pipeline Tabs ─── */}
      <div className="bg-white border-b">
        <div className="px-6">
          <div className="flex">
            {workflowTabs.map((tab, idx) => (
              <button
                key={tab.key}
                onClick={() => setWorkflowTab(tab.key)}
                className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  workflowTab === tab.key
                    ? tab.activeColor
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`ml-1.5 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-[11px] font-bold ${
                      workflowTab === tab.key
                        ? tab.badgeColor
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {/* Arrow connector between tabs */}
                {idx < workflowTabs.length - 1 && (
                  <ChevronRight className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Type Filter Pills + Context ─── */}
      <div className="bg-white/80 backdrop-blur-sm border-b px-6 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {REQUEST_TYPES.map((type) => {
              const count = typeCounts[type.key];
              return (
                <button
                  key={type.key}
                  onClick={() => setRequestTypeFilter(type.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    requestTypeFilter === type.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.icon}
                  <span>{type.label}</span>
                  {count > 0 && (
                    <span
                      className={`ml-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 rounded text-[10px] font-bold ${
                        requestTypeFilter === type.key
                          ? 'bg-white/25 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 italic">
            {activeTabConfig.description}
          </p>
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4 space-y-4">
          {/* Error State */}
          {queryError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <strong className="text-sm">Error loading requests</strong>
                <p className="text-xs mt-0.5">
                  {(queryError as Error).message}
                </p>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100"
                >
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                  <div className="w-16 h-5 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                  <div className="w-12 h-4 bg-gray-100 rounded" />
                  <div className="w-16 h-5 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* Procedure Encounter Groups (only in Needs Approval tab for procedures) */}
          {!isLoading &&
            workflowTab === 'needs-approval' &&
            (requestTypeFilter === 'all' ||
              requestTypeFilter === 'procedures') &&
            procedureEncounterGroups.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Procedure Batches by Encounter
                  </h3>
                </div>
                <div className="grid gap-2">
                  {procedureEncounterGroups.map((group) => (
                    <div
                      key={group.encounter_id}
                      onClick={() => handleOpenProcedureApproval(group)}
                      className="flex items-center gap-4 p-3.5 bg-white rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-gray-900">
                          {group.patient_name}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          EMR: {group.emr_number}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Dr. {group.doctor_name}
                        </p>
                      </div>
                      <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                        {group.pending_count} procedure
                        {group.pending_count > 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Review All
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Request Rows */}
          {!isLoading && !queryError && activeList.length > 0 && (
            <div className="space-y-2">
              {(() => {
                const emergencies = activeList.filter(
                  (r) => r.urgency === 'Emergency',
                );
                const urgents = activeList.filter(
                  (r) => r.urgency === 'Urgent',
                );
                const routines = activeList.filter(
                  (r) => r.urgency === 'Routine',
                );
                const sections: JSX.Element[] = [];

                if (emergencies.length > 0) {
                  sections.push(
                    <div key="emergency-section">
                      <div className="flex items-center gap-2 mb-2 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                          Emergency ({emergencies.length})
                        </span>
                        <div className="flex-1 h-px bg-red-200" />
                      </div>
                      <div className="space-y-2">
                        {emergencies.map((req) => (
                          <RequestRow
                            key={req.id}
                            request={req}
                            onClick={handleRequestClick}
                          />
                        ))}
                      </div>
                    </div>,
                  );
                }

                if (urgents.length > 0) {
                  sections.push(
                    <div key="urgent-section">
                      <div className="flex items-center gap-2 mb-2 mt-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">
                          Urgent ({urgents.length})
                        </span>
                        <div className="flex-1 h-px bg-orange-200" />
                      </div>
                      <div className="space-y-2">
                        {urgents.map((req) => (
                          <RequestRow
                            key={req.id}
                            request={req}
                            onClick={handleRequestClick}
                          />
                        ))}
                      </div>
                    </div>,
                  );
                }

                if (routines.length > 0) {
                  sections.push(
                    <div key="routine-section">
                      <div className="flex items-center gap-2 mb-2 mt-3">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Routine ({routines.length})
                        </span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="space-y-2">
                        {routines.map((req) => (
                          <RequestRow
                            key={req.id}
                            request={req}
                            onClick={handleRequestClick}
                          />
                        ))}
                      </div>
                    </div>,
                  );
                }

                return sections;
              })()}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !queryError && activeList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                {searchTerm ? (
                  <Search className="w-7 h-7 text-gray-400" />
                ) : (
                  <Inbox className="w-7 h-7 text-gray-400" />
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {searchTerm
                  ? 'No matching requests'
                  : workflowTab === 'needs-approval'
                    ? 'No requests pending approval'
                    : workflowTab === 'awaiting-payment'
                      ? 'No requests awaiting payment'
                      : 'No requests ready to execute'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm
                  ? `No results for "${searchTerm}". Try a different search term.`
                  : workflowTab === 'needs-approval'
                    ? 'All clinical requests have been reviewed.'
                    : workflowTab === 'awaiting-payment'
                      ? 'No approved requests are waiting for payment.'
                      : 'Process requests will appear here after payment verification.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear search
                </button>
              )}
              {!searchTerm && workflowTab !== 'needs-approval' && (
                <button
                  onClick={() => setWorkflowTab('needs-approval')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Go to Needs Approval
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      <ProcedureApprovalModal
        isOpen={showProcedureApprovalModal}
        onClose={() => {
          setShowProcedureApprovalModal(false);
          setSelectedProcedureEncounterGroup(null);
        }}
        encounterGroup={selectedProcedureEncounterGroup}
      />

      {selectedRequest && showModal && (
        <RequestDetailModal
          request={selectedRequest}
          isOpen={showModal}
          onClose={handleCloseModal}
          onApprove={handleApprove}
          onReject={handleReject}
          onSchedule={handleSchedule}
          onStart={handleStart}
          onComplete={handleComplete}
          onCancel={handleCancel}
          currentUserId={user?.id}
          canPerformActions
          onScheduleProcedure={
            (selectedRequest.request_type === 'Procedure' ||
              selectedRequest.request_type === 'Surgery') &&
            selectedRequest.status === 'Approved'
              ? () => handleOpenProcedureScheduling(selectedRequest)
              : undefined
          }
          onExecuteDischarge={
            selectedRequest.request_type === 'Discharge' &&
            selectedRequest.status === 'Approved'
              ? () => handleOpenDischargeExecution(selectedRequest)
              : undefined
          }
        />
      )}

      {selectedRequest && showProcedureModal && (
        <ProcedureSchedulingModal
          request={selectedRequest}
          isOpen={showProcedureModal}
          onClose={() => {
            setShowProcedureModal(false);
            setSelectedRequest(null);
          }}
          onSchedule={handleScheduleProcedure}
          facilityId={facilityId}
        />
      )}

      {selectedRequest && selectedAdmissionInfo && showDischargeModal && (
        <DischargeExecutionModal
          request={selectedRequest}
          admission={selectedAdmissionInfo}
          isOpen={showDischargeModal}
          onClose={() => {
            setShowDischargeModal(false);
            setSelectedRequest(null);
            setSelectedAdmissionInfo(null);
          }}
          onExecute={handleExecuteDischarge}
        />
      )}
    </div>
  );
};

export default ClinicalRequestsPage;
