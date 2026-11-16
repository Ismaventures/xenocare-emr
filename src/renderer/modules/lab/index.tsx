import React, { useMemo, useState } from 'react';
import {
  FlaskConical,
  Clock,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  ClipboardList,
  History,
  FileText,
  Shield,
} from 'lucide-react';
import { Button, Card, Tabs } from '../../components/ui';
import { CommandStatCard } from '../../components/dashboard';
import { ConfirmDialog } from '../../components/ui/Modal';
import {
  RejectionReasonSelect,
  validateRejection,
  getFormattedRejectionReason,
} from '../../components/ui/RejectionReasonSelect';
import LabRequestList from './components/LabRequestList';
import EnhancedLabResultForm, {
  EnhancedCreateLabResultDTO,
} from './components/EnhancedLabResultForm';
import LabDetailModal from './components/LabDetailModal';
import EncounterGroupList from './components/EncounterGroupList';
import EncounterApprovalModal, {
  EncounterGroup,
} from './components/EncounterApprovalModal';
import { ApprovedRequestsHistory } from '../billing/components/ApprovedRequestsHistory';
import LabReportsTab from './components/LabReportsTab';
import { LabExportPanel } from './components/LabExportPanel';
import {
  useLabRequests,
  useLabStats,
  useCollectSample,
  useStartProcessing,
  useEnterResult,
  useLabSubscription,
  useAcceptLabRequest,
  useRejectLabRequest,
} from './hooks/useLab';
import {
  LabRequestDTO,
  LabRequestStatus,
  LabCategory,
  CreateLabResultDTO,
} from './dtos/lab.dto';
import {
  useTransitionEncounter,
  useActiveEncounters,
} from '../../lib/workflow';
import { checkServicePaymentStatus } from '../../lib/workflow/payment-gating';
import { usePaymentStatusForOrders } from '../billing/hooks/useBillingOrders';
import { useToast } from '../../components/ui/Toast';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { NhisApprovalStatus } from '../../types/database.types';
import { InlineGuidance } from '../../components/guidance/InlineGuidance';

// =============================================================================
// Component
// =============================================================================

export default function Laboratory() {
  // Enable real-time updates
  useLabSubscription();

  // State
  const [activeTab, setActiveTab] = useState('approval');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<LabRequestStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<LabCategory | ''>('');
  const [selectedRequest, setSelectedRequest] = useState<LabRequestDTO | null>(
    null,
  );
  const [isResultFormOpen, setIsResultFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEncounterGroup, setSelectedEncounterGroup] =
    useState<EncounterGroup | null>(null);
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'collect' | 'process' | 'accept' | null;
    request: LabRequestDTO | null;
  }>({ type: null, request: null });
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    request: LabRequestDTO | null;
    reasonCode: string;
    explanation: string;
    error: string;
  }>({
    isOpen: false,
    request: null,
    reasonCode: '',
    explanation: '',
    error: '',
  });
  const [nhisBlockingModal, setNhisBlockingModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'warning' | 'error';
  }>({ isOpen: false, title: '', message: '', variant: 'warning' });
  const { showToast } = useToast();

  // Queries
  const { data: requestsData, isLoading } = useLabRequests({
    page,
    limit: 10,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });

  // Separate query for reports tab - fetches all results regardless of status filter
  const { data: reportsData, isLoading: isReportsLoading } = useLabRequests({
    page: 1,
    limit: 500, // Fetch more for reports
    status: undefined, // No status filter for reports
    category: categoryFilter || undefined,
  });

  const { data: stats } = useLabStats();
  useActiveEncounters(); // Keep hook for caching purposes
  const labRequestIds = useMemo(
    () =>
      (requestsData?.data || []).map((req) => req.request_id).filter(Boolean),
    [requestsData],
  );
  const { data: paymentStatusData } = usePaymentStatusForOrders(
    labRequestIds,
    'lab',
  );
  const paymentStatusMap = useMemo(
    () => paymentStatusData || {},
    [paymentStatusData],
  );

  // Filter requests for "Ready to Process" tab
  // Only show requests that are processable AND have verified payment
  const readyToProcessRequests = useMemo(() => {
    const allRequests = requestsData?.data || [];
    return allRequests.filter((req) => {
      // Check if request is in a processable status
      const isProcessable =
        req.status === 'Accepted' ||
        req.status === 'Pending' ||
        req.status === 'Sample Collected' ||
        req.status === 'In Progress';

      if (!isProcessable) return false;

      // Check if payment is verified
      const paymentInfo = paymentStatusMap[req.request_id];
      const paymentStatus = paymentInfo?.payment_status;
      const isPaid =
        paymentStatus === 'Paid' ||
        paymentStatus === 'Paid_NHIS' ||
        paymentStatus === 'Paid_Retainership' ||
        paymentStatus === 'Waived';

      return isPaid;
    });
  }, [requestsData?.data, paymentStatusMap]);

  // Mutations
  const collectSample = useCollectSample();
  const startProcessing = useStartProcessing();
  const enterResult = useEnterResult();
  const transitionEncounter = useTransitionEncounter();
  const acceptLabRequest = useAcceptLabRequest();
  const rejectLabRequest = useRejectLabRequest();

  // Handlers
  const handleViewRequest = (request: LabRequestDTO) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleCollectSample = (request: LabRequestDTO) => {
    setConfirmAction({ type: 'collect', request });
  };

  const handleStartProcessing = (request: LabRequestDTO) => {
    setConfirmAction({ type: 'process', request });
  };

  // Accept/Reject handlers for approval workflow
  const handleAcceptRequest = (request: LabRequestDTO) => {
    setConfirmAction({ type: 'accept', request });
  };

  const handleRejectRequest = (request: LabRequestDTO) => {
    setRejectModal({
      isOpen: true,
      request,
      reasonCode: '',
      explanation: '',
      error: '',
    });
  };

  // Encounter group handlers
  const handleSelectEncounter = (group: EncounterGroup) => {
    setSelectedEncounterGroup(group);
    setIsEncounterModalOpen(true);
  };

  const confirmAcceptRequest = async () => {
    if (confirmAction.request && confirmAction.type === 'accept') {
      const requestId = confirmAction.request.request_id;
      setConfirmAction({ type: null, request: null });

      acceptLabRequest.mutate(
        { request_id: requestId },
        {
          onSuccess: () => {
            showToast({
              type: 'success',
              title: 'Request Accepted',
              message: 'Lab request has been accepted and sent to billing.',
            });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              title: 'Accept Failed',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to accept request',
            });
            console.error('Failed to accept lab request:', error);
          },
        },
      );
    }
  };

  const confirmRejectRequest = async () => {
    const validation = validateRejection(
      rejectModal.reasonCode,
      rejectModal.explanation,
    );
    if (!validation.isValid) {
      setRejectModal((prev) => ({ ...prev, error: validation.error }));
      return;
    }

    if (rejectModal.request) {
      const requestId = rejectModal.request.request_id;
      const formattedReason = getFormattedRejectionReason(
        rejectModal.reasonCode,
        rejectModal.explanation,
      );
      setRejectModal({
        isOpen: false,
        request: null,
        reasonCode: '',
        explanation: '',
        error: '',
      });

      rejectLabRequest.mutate(
        { request_id: requestId, rejection_reason: formattedReason },
        {
          onSuccess: () => {
            showToast({
              type: 'success',
              title: 'Request Rejected',
              message: 'Lab request has been rejected.',
            });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              title: 'Reject Failed',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to reject request',
            });
            console.error('Failed to reject lab request:', error);
          },
        },
      );
    }
  };

  const ensurePaymentBeforeAction = async (
    request: LabRequestDTO,
    actionLabel: string,
  ): Promise<boolean> => {
    // Use visit_id or encounter_id as fallback
    console.log(
      '[Lab] Payment check - visit_id:',
      request.visit_id,
      'encounter_id:',
      request.encounter_id,
    );
    const visitIdentifier = request.visit_id || request.encounter_id;

    // Even if visit_id is missing, we can still check payment by request_id
    // The billing order has source_record_id that links to request_id
    console.log(
      '[Lab] Using visit identifier:',
      visitIdentifier,
      'request_id:',
      request.request_id,
    );
    try {
      const result = await checkServicePaymentStatus(
        visitIdentifier || '', // Pass empty string if no visit - will check by record ID
        'Lab',
        request.request_id,
      );

      if (!result.canProceed) {
        showToast({
          type: 'error',
          title: 'Payment required',
          message:
            result.reason ||
            `Payment must be completed before you can ${actionLabel}.`,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to verify payment status:', error);
      showToast({
        type: 'error',
        title: 'Payment check failed',
        message: 'Unable to verify payment status. Please try again.',
      });
      return false;
    }
  };

  /**
   * NHIS Pre-Authorization Enforcement
   * Services marked with requires_nhis_authorization=true must be approved
   * by NHIS desk before they can be processed (sample collection, processing, result entry)
   *
   * Provisional approvals allow the patient to proceed to the next stage,
   * but actual result entry is BLOCKED until official authorization code is entered.
   */
  const ensureNhisApprovalBeforeAction = (
    request: LabRequestDTO,
    actionLabel: string,
  ): boolean => {
    const nhisStatus = (request as any).nhis_approval_status as
      | NhisApprovalStatus
      | undefined;

    // If no NHIS status field or status is 'not_required' or 'approved', allow action
    if (
      !nhisStatus ||
      nhisStatus === 'not_required' ||
      nhisStatus === 'approved'
    ) {
      return true;
    }

    if (nhisStatus === 'provisional') {
      setNhisBlockingModal({
        isOpen: true,
        title: 'NHIS Authorization Code Pending',
        message: `Cannot ${actionLabel} - This test has provisional NHIS approval but the official authorization code has not been entered yet. The NHIS desk must enter the official code before results can be recorded.`,
        variant: 'warning',
      });
      return false;
    }

    if (nhisStatus === 'pending') {
      showToast({
        type: 'warning',
        title: 'NHIS Approval Required',
        message: `This test requires NHIS desk approval before you can ${actionLabel}. The request is pending verification in the NHIS Specialty Referral Approvals queue.`,
      });
      return false;
    }

    if (nhisStatus === 'rejected') {
      showToast({
        type: 'error',
        title: 'NHIS Approval Rejected',
        message: `NHIS desk has rejected this test request. You cannot ${actionLabel}.`,
      });
      return false;
    }

    if (nhisStatus === 'expired') {
      showToast({
        type: 'error',
        title: 'NHIS Approval Expired',
        message: `The NHIS approval for this test has expired. Please request a new authorization before proceeding.`,
      });
      return false;
    }

    return true;
  };

  const handleEnterResult = async (request: LabRequestDTO) => {
    // Check NHIS approval first (synchronous check)
    if (!ensureNhisApprovalBeforeAction(request, 'enter results')) return;

    const canProceed = await ensurePaymentBeforeAction(
      request,
      'enter results',
    );
    if (!canProceed) return;
    setSelectedRequest(request);
    setIsResultFormOpen(true);
    setIsDetailModalOpen(false);
  };

  const confirmCollectSample = async () => {
    if (confirmAction.request) {
      // Check NHIS approval first (synchronous check)
      if (
        !ensureNhisApprovalBeforeAction(
          confirmAction.request,
          'collect samples',
        )
      ) {
        setConfirmAction({ type: null, request: null });
        return;
      }

      const canProceed = await ensurePaymentBeforeAction(
        confirmAction.request,
        'collect samples',
      );
      if (!canProceed) {
        setConfirmAction({ type: null, request: null });
        return;
      }
      // Close dialog IMMEDIATELY - optimistic update handles UI
      const requestId = confirmAction.request.request_id;
      setConfirmAction({ type: null, request: null });

      // Fire-and-forget
      collectSample.mutate(requestId, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Sample Collected',
            message: 'Sample has been collected',
          });
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Collection Failed',
            message: 'Failed to collect sample',
          });
          console.error('Failed to collect sample:', error);
        },
      });
    }
  };

  const confirmStartProcessing = async () => {
    if (confirmAction.request) {
      // Check NHIS approval first (synchronous check)
      if (
        !ensureNhisApprovalBeforeAction(
          confirmAction.request,
          'start processing',
        )
      ) {
        setConfirmAction({ type: null, request: null });
        return;
      }

      const canProceed = await ensurePaymentBeforeAction(
        confirmAction.request,
        'start processing',
      );
      if (!canProceed) {
        setConfirmAction({ type: null, request: null });
        return;
      }
      // Close dialog IMMEDIATELY - optimistic update handles UI
      const requestId = confirmAction.request.request_id;
      setConfirmAction({ type: null, request: null });

      // Fire-and-forget
      startProcessing.mutate(requestId, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Processing Started',
            message: 'Lab processing has begun',
          });
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Process Failed',
            message: 'Failed to start processing',
          });
          console.error('Failed to start processing:', error);
        },
      });
    }
  };

  const handleResultSubmit = async (data: EnhancedCreateLabResultDTO) => {
    if (selectedRequest) {
      const canProceed = await ensurePaymentBeforeAction(
        selectedRequest,
        'submit results',
      );
      if (!canProceed) return;

      // Ensure lab_request_id is set
      const resultData: EnhancedCreateLabResultDTO = {
        ...data,
        lab_request_id: selectedRequest.request_id,
      };

      // Close form IMMEDIATELY
      const requestToProcess = selectedRequest;
      setIsResultFormOpen(false);
      setSelectedRequest(null);

      try {
        await enterResult.mutateAsync(resultData);
        showToast({
          type: 'success',
          title: 'Results Saved',
          message: 'Lab results recorded successfully',
        });

        // Check if all lab requests for this visit are completed
        if (requestToProcess.visit_id) {
          const visitId = requestToProcess.visit_id;

          const otherPendingRequests = requestsData?.data.filter(
            (r) =>
              r.visit_id === visitId &&
              r.request_id !== requestToProcess.request_id &&
              r.status !== 'Completed',
          );

          if (!otherPendingRequests || otherPendingRequests.length === 0) {
            transitionEncounter.mutate({
              visit_id: visitId,
              next_stage: 'lab_results',
              notes: 'All lab results completed',
            });
          }
        }
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to save lab results',
        });
        console.error('Failed to enter result:', error);
      }
    }
  };

  const handleFilterChange = (status: LabRequestStatus | '') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCategoryChange = (category: LabCategory | '') => {
    setCategoryFilter(category);
    setPage(1);
  };

  // Get time-based theme
  const {
    timeOfDay,
    greeting,
    colors: themeColors,
    isNightMode,
  } = useTimeTheme();

  // Get time icon based on time of day
  const TimeIcon = useMemo(() => {
    switch (timeOfDay) {
      case 'morning':
        return Sunrise;
      case 'afternoon':
        return Sun;
      case 'evening':
        return Sunset;
      case 'night':
        return Moon;
      default:
        return Sun;
    }
  }, [timeOfDay]);

  // Dynamic header gradient based on time
  const headerGradient = useMemo(() => {
    return `bg-gradient-to-r ${themeColors.header.gradient}`;
  }, [themeColors]);

  return (
    <div
      className={`space-y-8 px-4 pb-10 sm:px-6 lg:px-8 ${isNightMode ? 'bg-slate-900' : 'bg-[#f9fafb]'}`}
    >
      {/* Header */}
      <div
        className={`${headerGradient} rounded-2xl p-7 text-white relative overflow-hidden sm:p-8`}
      >
        {/* Decorative elements */}
        <div
          className={`absolute top-0 right-0 w-48 h-48 ${themeColors.header.decorativeCircle} rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2`}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 ${themeColors.header.decorativeCircle} rounded-xl backdrop-blur-sm`}
            >
              <FlaskConical className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Laboratory
              </h1>
              <p
                className={`mt-1 text-sm ${themeColors.accent.muted} flex items-center gap-2`}
              >
                <TimeIcon className="h-4 w-4" />
                Process lab requests, collect samples, and enter results
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <CommandStatCard
          label="Pending"
          value={stats?.pending || 0}
          icon={Clock}
          tone="amber"
        />
        <CommandStatCard
          label="Sample collected"
          value={stats?.sample_collected || 0}
          icon={FlaskConical}
          tone="blue"
        />
        <CommandStatCard
          label="Processing"
          value={stats?.processing || 0}
          icon={PlayCircle}
          tone="indigo"
        />
        <CommandStatCard
          label="Completed today"
          value={stats?.completed_today || 0}
          icon={CheckCircle}
          tone="emerald"
        />
        <CommandStatCard
          label="Avg turnaround"
          value={stats?.average_turnaround ?? '—'}
          icon={AlertCircle}
          tone="slate"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          tabs={[
            {
              id: 'approval',
              label: 'Approval Queue',
              icon: <ClipboardList className="h-4 w-4" />,
              count: stats?.pending || 0,
            },
            {
              id: 'requests',
              label: 'Ready to Process',
              icon: <CheckCircle className="h-4 w-4" />,
              count: readyToProcessRequests.length,
            },
            {
              id: 'reports',
              label: 'Lab Reports',
              icon: <FileText className="h-4 w-4" />,
            },
            {
              id: 'history',
              label: 'History',
              icon: <History className="h-4 w-4" />,
            },
          ]}
        />
      </div>

      {/* Approval Queue Tab */}
      {activeTab === 'approval' && (
        <Card>
          <InlineGuidance
            module="lab"
            title="Incoming Requests Queue"
            message="All new lab requests appear here. You must review the billing/payment status before accepting the sample. Rejection is only allowed with a valid reason."
            className="mb-4"
          />
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Approvals
            </h2>
            <p className="text-sm text-gray-500">
              Review and approve/reject lab requests grouped by patient
              encounter
            </p>
          </div>
          <EncounterGroupList
            requests={requestsData?.data || []}
            isLoading={isLoading}
            onSelectEncounter={handleSelectEncounter}
          />
        </Card>
      )}

      {/* Ready to Process Tab */}
      {activeTab === 'requests' && (
        <>
          {/* Header */}
          <Card>
            <InlineGuidance
              module="lab"
              title="Active Workflow"
              message="Track requests from approval -> collection -> processing. Use the filters to find specific tests quickly."
              className="mb-4"
            />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ready to Process
                </h2>
                <p className="text-sm text-gray-500">
                  Lab requests with verified payment - ready for sample
                  collection and processing
                </p>
              </div>
            </div>
          </Card>

          {/* Requests List */}
          <Card>
            <LabRequestList
              requests={readyToProcessRequests}
              isLoading={isLoading}
              onView={handleViewRequest}
              onCollectSample={handleCollectSample}
              onStartProcessing={handleStartProcessing}
              onEnterResult={handleEnterResult}
              onAccept={handleAcceptRequest}
              onReject={handleRejectRequest}
              page={page}
              totalPages={requestsData?.totalPages || 1}
              onPageChange={setPage}
              statusFilter={statusFilter}
              onStatusFilterChange={handleFilterChange}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={handleCategoryChange}
              paymentStatusMap={paymentStatusMap}
            />
          </Card>
        </>
      )}

      {/* Lab Reports Tab */}
      {activeTab === 'reports' && (
        <Card>
          <div className="p-4 border-b border-gray-200 flex justify-end">
            <LabExportPanel data={reportsData?.data || []} />
          </div>
          <LabReportsTab
            requests={reportsData?.data || []}
            isLoading={isReportsLoading}
            onViewReport={handleViewRequest}
          />
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <ApprovedRequestsHistory
            sourceModule="lab"
            title="Lab Approved Requests History"
            showModuleFilter={false}
          />
        </Card>
      )}

      <LabDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onCollectSample={handleCollectSample}
        onEnterResult={handleEnterResult}
        paymentInfo={
          selectedRequest
            ? paymentStatusMap[selectedRequest.request_id]
            : undefined
        }
        hasNext={(() => {
          if (!selectedRequest) return false;
          const list =
            activeTab === 'requests'
              ? readyToProcessRequests
              : activeTab === 'reports'
                ? reportsData?.data || []
                : [];
          const idx = list.findIndex(
            (r) => r.request_id === selectedRequest.request_id,
          );
          return idx !== -1 && idx < list.length - 1;
        })()}
        hasPrev={(() => {
          if (!selectedRequest) return false;
          const list =
            activeTab === 'requests'
              ? readyToProcessRequests
              : activeTab === 'reports'
                ? reportsData?.data || []
                : [];
          const idx = list.findIndex(
            (r) => r.request_id === selectedRequest.request_id,
          );
          return idx > 0;
        })()}
        onNext={() => {
          if (!selectedRequest) return;
          const list =
            activeTab === 'requests'
              ? readyToProcessRequests
              : activeTab === 'reports'
                ? reportsData?.data || []
                : [];
          const idx = list.findIndex(
            (r) => r.request_id === selectedRequest.request_id,
          );
          if (idx !== -1 && idx < list.length - 1)
            setSelectedRequest(list[idx + 1]);
        }}
        onPrev={() => {
          if (!selectedRequest) return;
          const list =
            activeTab === 'requests'
              ? readyToProcessRequests
              : activeTab === 'reports'
                ? reportsData?.data || []
                : [];
          const idx = list.findIndex(
            (r) => r.request_id === selectedRequest.request_id,
          );
          if (idx > 0) setSelectedRequest(list[idx - 1]);
        }}
      />

      {/* Result Form Modal - Enhanced with Dynamic Templates */}
      <EnhancedLabResultForm
        isOpen={isResultFormOpen}
        onClose={() => {
          setIsResultFormOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleResultSubmit}
        isLoading={enterResult.isPending}
        request={selectedRequest}
      />

      {/* Confirm Collect Sample */}
      <ConfirmDialog
        isOpen={confirmAction.type === 'collect'}
        onClose={() => setConfirmAction({ type: null, request: null })}
        onConfirm={confirmCollectSample}
        title="Collect Sample"
        message={`Are you sure you want to mark the sample as collected for "${confirmAction.request?.test?.test_name}"?`}
        confirmText="Confirm Collection"
        isLoading={collectSample.isPending}
      />

      {/* Confirm Start Processing */}
      <ConfirmDialog
        isOpen={confirmAction.type === 'process'}
        onClose={() => setConfirmAction({ type: null, request: null })}
        onConfirm={confirmStartProcessing}
        title="Start Processing"
        message={`Are you sure you want to start processing "${confirmAction.request?.test?.test_name}"?`}
        confirmText="Start Processing"
        isLoading={startProcessing.isPending}
      />

      {/* Confirm Accept Request */}
      <ConfirmDialog
        isOpen={confirmAction.type === 'accept'}
        onClose={() => setConfirmAction({ type: null, request: null })}
        onConfirm={confirmAcceptRequest}
        title="Accept Lab Request"
        message={`Are you sure you want to accept "${confirmAction.request?.test?.test_name}"? This will create a billing order for the patient.`}
        confirmText="Accept & Bill"
        isLoading={acceptLabRequest.isPending}
      />

      {/* Reject Request Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() =>
              setRejectModal({
                isOpen: false,
                request: null,
                reasonCode: '',
                explanation: '',
                error: '',
              })
            }
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reject Lab Request
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Rejecting:{' '}
                <strong>
                  {rejectModal.request?.test?.test_name || 'Unknown Test'}
                </strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Rejection Reason{' '}
                  <span className="text-red-500">*</span>
                </label>
                <RejectionReasonSelect
                  value={rejectModal.reasonCode}
                  explanation={rejectModal.explanation}
                  onChange={(code, explanation) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      reasonCode: code,
                      explanation,
                      error: '',
                    }))
                  }
                  requestType="lab"
                  error={rejectModal.error}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setRejectModal({
                      isOpen: false,
                      request: null,
                      reasonCode: '',
                      explanation: '',
                      error: '',
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmRejectRequest}
                  disabled={
                    !rejectModal.reasonCode || rejectLabRequest.isPending
                  }
                >
                  {rejectLabRequest.isPending
                    ? 'Rejecting...'
                    : 'Reject Request'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NHIS Blocking Modal */}
      {nhisBlockingModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setNhisBlockingModal({
                isOpen: false,
                title: '',
                message: '',
                variant: 'warning',
              })
            }
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`p-3 rounded-full ${nhisBlockingModal.variant === 'warning' ? 'bg-yellow-100' : 'bg-red-100'}`}
                >
                  <AlertCircle
                    className={`w-6 h-6 ${nhisBlockingModal.variant === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {nhisBlockingModal.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {nhisBlockingModal.message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  variant="primary"
                  onClick={() =>
                    setNhisBlockingModal({
                      isOpen: false,
                      title: '',
                      message: '',
                      variant: 'warning',
                    })
                  }
                >
                  Understood
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encounter Approval Modal */}
      <EncounterApprovalModal
        isOpen={isEncounterModalOpen}
        onClose={() => {
          setIsEncounterModalOpen(false);
          setSelectedEncounterGroup(null);
        }}
        encounterGroup={selectedEncounterGroup}
      />
    </div>
  );
}
