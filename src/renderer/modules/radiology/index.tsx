import React, { useEffect, useMemo, useState } from 'react';
import {
  Scan,
  Clock,
  Calendar,
  PlayCircle,
  Image,
  FileText,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  ClipboardList,
  CheckCircle,
  History,
  FileImage,
  AlertCircle,
} from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { ConfirmDialog } from '../../components/ui/Modal';
import {
  RejectionReasonSelect,
  validateRejection,
  getFormattedRejectionReason,
} from '../../components/ui/RejectionReasonSelect';
import { getPaymentStatusFromBillingOrder } from '../../components/workflow';
import RadiologyRequestList from './components/RadiologyRequestList';
import RadiologyReportForm from './components/RadiologyReportForm';
import RadiologyDetailModal from './components/RadiologyDetailModal';
import ScheduleImagingModal from './components/ScheduleImagingModal';
import ImageUploadModal from './components/ImageUploadModal';
import EncounterGroupList from './components/EncounterGroupList';
import EncounterApprovalModal, {
  EncounterGroup,
} from './components/EncounterApprovalModal';
import { ApprovedRequestsHistory } from '../billing/components/ApprovedRequestsHistory';
import ImagingReportsTab from './components/ImagingReportsTab';
import { ImagingExportPanel } from './components/ImagingExportPanel';
import {
  useRadiologyRequests,
  useRadiologyStats,
  useScheduleImaging,
  useStartImaging,
  useCompleteImaging,
  useSkipToAwaitingReport,
  useUploadRadiologyImages,
  useSubmitReport,
  useFinalizeReport,
  useRadiologySubscription,
  useRejectRadiologyRequest,
} from './hooks/useRadiology';
import {
  RadiologyRequestDTO,
  RadiologyRequestStatus,
  ImagingModality,
  CreateScanResultDTO,
  UploadScanImageDTO,
} from './dtos/radiology.dto';
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
import { CommandStatCard } from '../../components/dashboard';

const SCHEDULING_ALLOWED_PAYMENT_STATUSES = new Set([
  'Paid',
  'Paid_NHIS',
  'Paid_Retainership',
  'Waived',
]);

// =============================================================================
// Component
// =============================================================================

export default function Radiology() {
  // Enable real-time updates
  useRadiologySubscription();

  // State
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RadiologyRequestStatus | ''>(
    '',
  );
  const [modalityFilter, setModalityFilter] = useState<ImagingModality | ''>(
    '',
  );
  const [selectedRequest, setSelectedRequest] =
    useState<RadiologyRequestDTO | null>(null);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
    request: RadiologyRequestDTO | null;
  }>({ isOpen: false, request: null });
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    request: RadiologyRequestDTO | null;
  }>({ isOpen: false, request: null });
  const [finalizeModal, setFinalizeModal] = useState<{
    isOpen: boolean;
    request: RadiologyRequestDTO | null;
  }>({ isOpen: false, request: null });
  const [confirmAction, setConfirmAction] = useState<{
    type: 'start' | 'complete' | null;
    request: RadiologyRequestDTO | null;
  }>({ type: null, request: null });
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    request: RadiologyRequestDTO | null;
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'approval' | 'scheduling' | 'imaging' | 'reporting' | 'reports' | 'history'
  >('approval');
  const [selectedEncounterGroup, setSelectedEncounterGroup] =
    useState<EncounterGroup | null>(null);
  const [isEncounterModalOpen, setIsEncounterModalOpen] = useState(false);
  const { showToast } = useToast();
  const [nhisBlockingModal, setNhisBlockingModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'warning' | 'error';
  }>({ isOpen: false, title: '', message: '', variant: 'warning' });

  useEffect(() => {
    setPage(1);
    setStatusFilter('');
  }, [activeTab]);

  const tabStatuses = useMemo<RadiologyRequestStatus[] | undefined>(() => {
    switch (activeTab) {
      case 'approval':
        return ['Pending'];
      case 'scheduling':
        return ['Ordered', 'Accepted'];
      case 'imaging':
        return ['Scheduled', 'In Progress', 'Imaging Completed', 'Completed'];
      case 'reporting':
        return ['Awaiting Report', 'Preliminary Report'];
      case 'reports':
        return ['Final Report', 'Reported', 'Completed'];
      default:
        return undefined;
    }
  }, [activeTab]);

  const pageLimit = activeTab === 'reports' ? 200 : 10;

  // Queries
  const { data: requestsData, isLoading } = useRadiologyRequests({
    page,
    limit: pageLimit,
    statuses: statusFilter ? [statusFilter] : tabStatuses,
    modality: modalityFilter || undefined,
  });

  const { data: stats } = useRadiologyStats();
  useActiveEncounters(); // Keep hook for caching purposes
  const radiologyRequestIds = useMemo(
    () =>
      (requestsData?.data || []).map((req) => req.request_id).filter(Boolean),
    [requestsData],
  );
  const { data: paymentStatusData } = usePaymentStatusForOrders(
    radiologyRequestIds,
    'radiology',
  );
  const paymentStatusMap = useMemo(
    () => paymentStatusData || {},
    [paymentStatusData],
  );

  const queueRequests = useMemo(() => {
    const rows = requestsData?.data || [];
    if (activeTab !== 'scheduling' && activeTab !== 'imaging') {
      return rows;
    }

    return rows.filter((request) => {
      const paymentInfo = paymentStatusMap[request.request_id];
      const paymentStatus = getPaymentStatusFromBillingOrder(
        paymentInfo?.payment_status,
      );
      return SCHEDULING_ALLOWED_PAYMENT_STATUSES.has(paymentStatus);
    });
  }, [requestsData, activeTab, paymentStatusMap]);

  const imagingQueueCount = useMemo(() => {
    return (
      (stats?.scheduled || 0) +
      (stats?.in_progress || 0) +
      (stats?.imaging_completed || 0)
    );
  }, [stats]);

  const reportingQueueCount = useMemo(() => {
    return (stats?.awaiting_report || 0) + (stats?.preliminary_report || 0);
  }, [stats]);

  // Mutations
  const scheduleImaging = useScheduleImaging();
  const startImaging = useStartImaging();
  const completeImaging = useCompleteImaging();
  const skipToReporting = useSkipToAwaitingReport();
  const uploadImages = useUploadRadiologyImages();
  const submitReport = useSubmitReport();
  const finalizeReport = useFinalizeReport();
  const transitionEncounter = useTransitionEncounter();
  const rejectRadiologyRequest = useRejectRadiologyRequest();

  // Handlers
  const handleViewRequest = (request: RadiologyRequestDTO) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  const handleSchedule = (request: RadiologyRequestDTO) => {
    setScheduleModal({ isOpen: true, request });
  };

  const handleUploadImages = (request: RadiologyRequestDTO) => {
    setUploadModal({ isOpen: true, request });
  };

  const handleFinalize = (request: RadiologyRequestDTO) => {
    setFinalizeModal({ isOpen: true, request });
  };

  const handleStartImaging = (request: RadiologyRequestDTO) => {
    setConfirmAction({ type: 'start', request });
  };

  const handleCompleteImaging = (request: RadiologyRequestDTO) => {
    setConfirmAction({ type: 'complete', request });
  };

  const handleSkipToReporting = (request: RadiologyRequestDTO) => {
    skipToReporting.mutate(
      { requestId: request.request_id },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Moved to Reporting',
            message: 'Request is now awaiting report. Images can be uploaded later.',
          });
        },
        onError: (error: any) => {
          const msg = error?.message || 'Could not skip to reporting';
          showToast({
            type: 'error',
            title: 'Failed',
            message: msg,
          });
        },
      },
    );
  };

  const handleRejectRequest = (request: RadiologyRequestDTO) => {
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

  const confirmRejectRequest = async () => {
    // Validate rejection reason
    const validationError = validateRejection(
      rejectModal.reasonCode,
      rejectModal.explanation,
    );
    if (validationError) {
      setRejectModal((prev) => ({ ...prev, error: validationError }));
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

      rejectRadiologyRequest.mutate(
        { request_id: requestId, rejection_reason: formattedReason },
        {
          onSuccess: () => {
            showToast({
              type: 'success',
              title: 'Request Rejected',
              message: 'Radiology request has been rejected.',
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
            console.error('Failed to reject radiology request:', error);
          },
        },
      );
    }
  };

  const ensurePaymentBeforeAction = async (
    request: RadiologyRequestDTO,
    actionLabel: string,
  ): Promise<boolean> => {
    // Use visit_id or encounter_id as fallback
    const visitIdentifier = request.visit_id || request.encounter_id;

    // Even if visit_id is missing, we can still check payment by request_id
    console.log(
      '[Radiology] Payment check - visit:',
      visitIdentifier,
      'request_id:',
      request.request_id,
    );
    try {
      const result = await checkServicePaymentStatus(
        visitIdentifier || '', // Pass empty string if no visit - will check by record ID
        'Radiology',
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
        message: 'Unable to verify billing order. Please try again.',
      });
      return false;
    }
  };

  /**
   * NHIS Pre-Authorization Enforcement
   * Services marked with requires_nhis_authorization=true must be approved
   * by NHIS desk before they can be processed (imaging, report submission)
   *
   * Provisional approvals allow the patient to proceed to the next stage,
   * but actual report submission is BLOCKED until official authorization code is entered.
   */
  const ensureNhisApprovalBeforeAction = (
    request: RadiologyRequestDTO,
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
        message: `Cannot ${actionLabel} - This scan has provisional NHIS approval but the official authorization code has not been entered yet. The NHIS desk must enter the official code before reports can be submitted.`,
        variant: 'warning',
      });
      return false;
    }

    if (nhisStatus === 'pending') {
      showToast({
        type: 'warning',
        title: 'NHIS Approval Required',
        message: `This scan requires NHIS desk approval before you can ${actionLabel}. The request is pending verification in the NHIS Specialty Referral Approvals queue.`,
      });
      return false;
    }

    if (nhisStatus === 'rejected') {
      showToast({
        type: 'error',
        title: 'NHIS Approval Rejected',
        message: `NHIS desk has rejected this scan request. You cannot ${actionLabel}.`,
      });
      return false;
    }

    if (nhisStatus === 'expired') {
      showToast({
        type: 'error',
        title: 'NHIS Approval Expired',
        message: `The NHIS approval for this scan has expired. Please request a new authorization before proceeding.`,
      });
      return false;
    }

    return true;
  };

  const handleReport = async (request: RadiologyRequestDTO) => {
    // Check NHIS approval first (synchronous check)
    if (!ensureNhisApprovalBeforeAction(request, 'submit a report')) return;

    if (
      request.status !== 'Awaiting Report' &&
      request.status !== 'Preliminary Report'
    ) {
      showToast({
        type: 'warning',
        title: 'Reporting not ready',
        message: 'Complete imaging and proceed to reporting first.',
      });
      return;
    }

    const canProceed = await ensurePaymentBeforeAction(
      request,
      'submit a report',
    );
    if (!canProceed) return;
    setSelectedRequest(request);
    setIsReportFormOpen(true);
  };

  const handleScheduleSubmit = async (scheduledDate: string) => {
    if (!scheduleModal.request) return;
    const requestId = scheduleModal.request.request_id;

    scheduleImaging.mutate(
      { requestId, scheduledDate },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Imaging Scheduled',
            message: 'Imaging appointment has been scheduled.',
          });
          setScheduleModal({ isOpen: false, request: null });
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Scheduling Failed',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to schedule imaging.',
          });
          console.error('Failed to schedule imaging:', error);
        },
      },
    );
  };

  const handleUploadImagesSubmit = async (images: UploadScanImageDTO[]) => {
    if (!uploadModal.request) return;
    const requestId = uploadModal.request.request_id;

    uploadImages.mutate(
      { requestId, images },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Images Uploaded',
            message: 'Imaging files uploaded and ready for reporting.',
          });
          setUploadModal({ isOpen: false, request: null });
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Upload Failed',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to upload images.',
          });
          console.error('Failed to upload images:', error);
        },
      },
    );
  };

  const confirmFinalizeReport = async () => {
    if (!finalizeModal.request) return;
    const requestId = finalizeModal.request.request_id;
    finalizeReport.mutate(requestId, {
      onSuccess: () => {
        showToast({
          type: 'success',
          title: 'Report Finalized',
          message: 'The report has been finalized successfully.',
        });
        setFinalizeModal({ isOpen: false, request: null });
      },
      onError: (error) => {
        showToast({
          type: 'error',
          title: 'Finalize Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to finalize report.',
        });
        console.error('Failed to finalize report:', error);
      },
    });
  };

  const confirmStartImaging = async () => {
    if (confirmAction.request) {
      // Check NHIS approval first (synchronous check)
      if (
        !ensureNhisApprovalBeforeAction(confirmAction.request, 'start imaging')
      ) {
        setConfirmAction({ type: null, request: null });
        return;
      }

      const canProceed = await ensurePaymentBeforeAction(
        confirmAction.request,
        'start imaging',
      );
      if (!canProceed) {
        setConfirmAction({ type: null, request: null });
        return;
      }
      // Close dialog IMMEDIATELY - optimistic update handles UI
      const requestId = confirmAction.request.request_id;
      setConfirmAction({ type: null, request: null });

      // Fire-and-forget
      startImaging.mutate(requestId, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Imaging Started',
            message: 'Imaging procedure has been started',
          });
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Start Failed',
            message: 'Failed to start imaging',
          });
          console.error('Failed to start imaging:', error);
        },
      });
    }
  };

  const confirmCompleteImaging = async () => {
    if (confirmAction.request) {
      // Check NHIS approval first (synchronous check)
      if (
        !ensureNhisApprovalBeforeAction(
          confirmAction.request,
          'complete imaging',
        )
      ) {
        setConfirmAction({ type: null, request: null });
        return;
      }

      const canProceed = await ensurePaymentBeforeAction(
        confirmAction.request,
        'complete imaging',
      );
      if (!canProceed) {
        setConfirmAction({ type: null, request: null });
        return;
      }
      // Close dialog IMMEDIATELY - optimistic update handles UI
      const requestId = confirmAction.request.request_id;
      setConfirmAction({ type: null, request: null });

      // Fire-and-forget
      completeImaging.mutate(
        { requestId },
        {
          onSuccess: () => {
            showToast({
              type: 'success',
              title: 'Imaging Complete',
              message: 'Imaging has been completed',
            });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              title: 'Complete Failed',
              message: 'Failed to complete imaging',
            });
            console.error('Failed to complete imaging:', error);
          },
        },
      );
    }
  };

  const handleReportSubmit = async (data: CreateScanResultDTO) => {
    if (selectedRequest) {
      // Check NHIS approval first (synchronous check)
      if (!ensureNhisApprovalBeforeAction(selectedRequest, 'submit a report'))
        return;

      const canProceed = await ensurePaymentBeforeAction(
        selectedRequest,
        'submit a report',
      );
      if (!canProceed) return;

      // Close form IMMEDIATELY
      const requestToReport = selectedRequest;
      setIsReportFormOpen(false);
      setSelectedRequest(null);

      try {
        await submitReport.mutateAsync({
          requestId: requestToReport.request_id,
          patientId: requestToReport.patient_id,
          reportData: {
            scan_request_id: requestToReport.request_id,
            findings: data.findings,
            impression: data.impression,
            technique: data.technique,
            comparison: data.comparison,
            urgency: data.urgency || 'Normal',
            is_preliminary: data.is_preliminary || false,
            notes: data.notes,
            images: data.images || [],
          },
        });
        showToast({
          type: 'success',
          title: 'Report Submitted',
          message: 'Radiology report saved successfully',
        });

        // Check if all radiology requests for this visit are completed
        if (requestToReport.visit_id) {
          const visitId = requestToReport.visit_id;

          // Check for other pending requests
          const otherPendingRequests = requestsData?.data.filter(
            (r) =>
              r.visit_id === visitId &&
              r.request_id !== requestToReport.request_id &&
              !['Final Report', 'Reported', 'Cancelled', 'Rejected'].includes(
                r.status,
              ),
          );

          if (!otherPendingRequests || otherPendingRequests.length === 0) {
            // Transition workflow
            transitionEncounter.mutate({
              visit_id: visitId,
              next_stage: 'radiology_results',
              notes: 'All radiology reports completed',
            });
          }
        }
      } catch (error) {
        showToast({
          type: 'error',
          title: 'Submit Failed',
          message: 'Failed to submit report',
        });
        console.error('Failed to submit report:', error);
      }
    }
  };

  const handleFilterChange = (status: RadiologyRequestStatus | '') => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleModalityChange = (modality: ImagingModality | '') => {
    setModalityFilter(modality);
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
              <Scan className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Radiology
              </h1>
              <p
                className={`mt-1 text-sm ${themeColors.accent.muted} flex items-center gap-2`}
              >
                <TimeIcon className="h-4 w-4" />
                Manage imaging requests, capture images, and submit reports
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary metrics — command-center style */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <CommandStatCard
          label="Ordered"
          value={stats?.ordered || 0}
          icon={Clock}
          tone="amber"
        />
        <CommandStatCard
          label="Scheduled"
          value={stats?.scheduled || 0}
          icon={Calendar}
          tone="indigo"
        />
        <CommandStatCard
          label="In Progress"
          value={stats?.in_progress || 0}
          icon={PlayCircle}
          tone="blue"
        />
        <CommandStatCard
          label="Imaging completed"
          value={stats?.imaging_completed || 0}
          icon={Image}
          tone="violet"
        />
        <CommandStatCard
          label="Awaiting report"
          value={stats?.awaiting_report || 0}
          icon={FileText}
          tone="orange"
        />
        <CommandStatCard
          label="Reported today"
          value={stats?.reported_today || 0}
          icon={CheckCircle}
          tone="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-1 shadow-sm ring-1 ring-slate-900/[0.04]">
        <nav className="-mb-px flex flex-wrap gap-1 sm:gap-6">
          <button
            onClick={() => setActiveTab('approval')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'approval'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList size={18} />
            Approval Queue
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'scheduling'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar size={18} />
            Scheduling
            {(stats?.ordered || 0) > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {stats?.ordered || 0}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('imaging')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'imaging'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlayCircle size={18} />
            Imaging
            {imagingQueueCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {imagingQueueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reporting')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'reporting'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={18} />
            Reporting
            {reportingQueueCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {reportingQueueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileImage size={18} />
            Reports
            {(stats?.final_report || 0) > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {stats?.final_report || 0}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={18} />
            History
          </button>
        </nav>
      </div>

      {activeTab === 'approval' && (
        <InlineGuidance
          module="radiology"
          title="Request Vetting"
          message="Review incoming imaging requests here. Approve valid requests to proceed to billing and scheduling."
        />
      )}

      {activeTab === 'scheduling' && (
        <InlineGuidance
          module="radiology"
          title="Scheduling"
          message="Assign imaging times for accepted requests and keep the schedule aligned with radiologist availability."
        />
      )}

      {activeTab === 'imaging' && (
        <InlineGuidance
          module="radiology"
          title="Imaging"
          message="Start scans, complete imaging, and upload files for radiologist review."
        />
      )}

      {activeTab === 'reporting' && (
        <InlineGuidance
          module="radiology"
          title="Reporting"
          message="Review uploaded images, draft reports, and finalize results with radiologist sign-off."
        />
      )}

      {activeTab === 'reports' && (
        <InlineGuidance
          module="radiology"
          title="Reports"
          message="Browse completed reports and access patient imaging history."
        />
      )}

      {activeTab === 'history' && (
        <InlineGuidance
          module="radiology"
          title="Request History"
          message="View a comprehensive log of all past radiology requests and their approval status."
        />
      )}

      {/* Approval Queue Tab */}
      {activeTab === 'approval' && (
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Approvals
            </h2>
            <p className="text-sm text-gray-500">
              Review and approve/reject imaging requests grouped by patient
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

      {/* Scheduling Tab */}
      {activeTab === 'scheduling' && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`text-lg font-semibold ${isNightMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Scheduling Queue
                </h2>
                <p className="text-sm text-gray-500">
                  Set imaging times for accepted requests before scanning begins
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <RadiologyRequestList
              requests={queueRequests}
              isLoading={isLoading}
              onView={handleViewRequest}
              onReject={handleRejectRequest}
              onSchedule={handleSchedule}
              onStartImaging={handleStartImaging}
              onCompleteImaging={handleCompleteImaging}
              onReport={handleReport}
              page={page}
              totalPages={requestsData?.totalPages || 1}
              onPageChange={setPage}
              statusFilter={statusFilter}
              onStatusFilterChange={handleFilterChange}
              modalityFilter={modalityFilter}
              onModalityFilterChange={handleModalityChange}
              paymentStatusMap={paymentStatusMap}
              showNhisColumn={false}
            />
          </Card>
        </>
      )}

      {/* Imaging Tab */}
      {activeTab === 'imaging' && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`text-lg font-semibold ${isNightMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Imaging Queue
                </h2>
                <p className="text-sm text-gray-500">
                  Track scheduled scans, start imaging, and upload completed
                  files
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <RadiologyRequestList
              requests={queueRequests}
              isLoading={isLoading}
              onView={handleViewRequest}
              onStartImaging={handleStartImaging}
              onCompleteImaging={handleCompleteImaging}
              onUploadImages={handleUploadImages}
              onSkipToReporting={handleSkipToReporting}
              onReport={handleReport}
              page={page}
              totalPages={requestsData?.totalPages || 1}
              onPageChange={setPage}
              statusFilter={statusFilter}
              onStatusFilterChange={handleFilterChange}
              modalityFilter={modalityFilter}
              onModalityFilterChange={handleModalityChange}
              paymentStatusMap={paymentStatusMap}
              showNhisColumn={false}
            />
          </Card>
        </>
      )}

      {/* Reporting Tab */}
      {activeTab === 'reporting' && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`text-lg font-semibold ${isNightMode ? 'text-white' : 'text-gray-900'}`}
                >
                  Reporting Queue
                </h2>
                <p className="text-sm text-gray-500">
                  Create reports for completed scans and finalize preliminary
                  results
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <RadiologyRequestList
              requests={requestsData?.data || []}
              isLoading={isLoading}
              onView={handleViewRequest}
              onReport={handleReport}
              onFinalizeReport={handleFinalize}
              page={page}
              totalPages={requestsData?.totalPages || 1}
              onPageChange={setPage}
              statusFilter={statusFilter}
              onStatusFilterChange={handleFilterChange}
              modalityFilter={modalityFilter}
              onModalityFilterChange={handleModalityChange}
              paymentStatusMap={paymentStatusMap}
              showNhisColumn={false}
            />
          </Card>
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <Card>
          <div className="p-4 border-b border-gray-200 flex justify-end">
            <ImagingExportPanel data={requestsData?.data || []} />
          </div>
          <ImagingReportsTab
            requests={requestsData?.data || []}
            isLoading={isLoading}
            onViewReport={handleViewRequest}
          />
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <ApprovedRequestsHistory
            sourceModule="radiology"
            title="Radiology Approved Requests History"
            showModuleFilter={false}
          />
        </Card>
      )}

      {/* Detail Modal */}
      <RadiologyDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onStartProcedure={(request) => {
          setIsDetailModalOpen(false);
          handleStartImaging(request);
        }}
        onUploadImage={(request) => {
          setIsDetailModalOpen(false);
          handleUploadImages(request);
        }}
        onWriteReport={(request) => {
          setIsDetailModalOpen(false);
          handleReport(request);
        }}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
        }}
      />

      {/* Report Form Modal */}
      <RadiologyReportForm
        isOpen={isReportFormOpen}
        onClose={() => {
          setIsReportFormOpen(false);
          setSelectedRequest(null);
        }}
        onSubmit={handleReportSubmit}
        isLoading={submitReport.isPending}
        request={selectedRequest}
      />

      {/* Schedule Imaging Modal */}
      <ScheduleImagingModal
        isOpen={scheduleModal.isOpen}
        onClose={() => setScheduleModal({ isOpen: false, request: null })}
        onSubmit={handleScheduleSubmit}
        request={scheduleModal.request}
        isLoading={scheduleImaging.isPending}
      />

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false, request: null })}
        onSubmit={handleUploadImagesSubmit}
        request={uploadModal.request}
        isLoading={uploadImages.isPending}
      />

      {/* Finalize Report */}
      <ConfirmDialog
        isOpen={finalizeModal.isOpen}
        onClose={() => setFinalizeModal({ isOpen: false, request: null })}
        onConfirm={confirmFinalizeReport}
        title="Finalize Report"
        message={`Finalize report for "${finalizeModal.request?.imaging?.imaging_name}"? This will lock the report.`}
        confirmText="Finalize"
        isLoading={finalizeReport.isPending}
      />

      {/* Confirm Start Imaging */}
      <ConfirmDialog
        isOpen={confirmAction.type === 'start'}
        onClose={() => setConfirmAction({ type: null, request: null })}
        onConfirm={confirmStartImaging}
        title="Start Imaging"
        message={`Are you sure you want to start the imaging procedure for "${confirmAction.request?.imaging?.imaging_name}"?`}
        confirmText="Start Imaging"
        isLoading={startImaging.isPending}
      />

      {/* Confirm Complete Imaging */}
      <ConfirmDialog
        isOpen={confirmAction.type === 'complete'}
        onClose={() => setConfirmAction({ type: null, request: null })}
        onConfirm={confirmCompleteImaging}
        title="Complete Imaging"
        message={`Are you sure you want to mark "${confirmAction.request?.imaging?.imaging_name}" as completed?`}
        confirmText="Complete"
        isLoading={completeImaging.isPending}
      />

      {/* Confirm Accept Request */}
      {/* Reject Request Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Radiology Request
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject the request for &quot;
              {rejectModal.request?.imaging?.imaging_name}&quot;?
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Rejection Reason <span className="text-red-500">*</span>
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
              requestType="radiology"
              error={rejectModal.error}
            />
            <div className="flex justify-end gap-3 mt-4">
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
                  !rejectModal.reasonCode || rejectRadiologyRequest.isPending
                }
              >
                {rejectRadiologyRequest.isPending
                  ? 'Rejecting...'
                  : 'Reject Request'}
              </Button>
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
