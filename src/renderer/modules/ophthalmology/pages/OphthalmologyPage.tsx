/**
 * Ophthalmology Module Page
 * Main entry point for eye examinations and procedure management
 * Includes accept/reject workflow for procedure requests
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Eye,
  Check,
  X,
  Clock,
  RefreshCw,
  Activity,
  UserPlus,
  ArrowRight,
  AlertCircle,
  ClipboardList,
  Loader2,
  User,
  ChevronDown,
  Bot,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { ConfirmDialog, Modal } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { ReferralDetailsModal } from '../../../components/shared';
import PatientMedicalRecordsPanel from '../../../components/shared/PatientMedicalRecordsPanel';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { InlineGuidance } from '../../../components/guidance/InlineGuidance';
import {
  useEyeProcedures,
  useEyeExams,
  useAcceptEyeProcedure,
  useRejectEyeProcedure,
  useOphthalmologyStats,
  useCreateEyeExam,
  useUpdateEyeExam,
  useEncounterEyeExams,
} from '../hooks/useOphthalmology';
import EyeExamWizard from '../components/EyeExamWizard';
import type { EyeExamMode } from '../components/EyeExamWizard';
import EyeExamViewModal from '../components/EyeExamViewModal';
import OphthalmologyConsultantRecord from '../components/OphthalmologyConsultantRecord';
import { OphthalmologyExportPanel } from '../components/OphthalmologyExportPanel';
import { AIChatPanel } from '../../ai-assistant/components/AIChatPanel';
import {
  submitSpecialtyOrdersAndReferrals,
  type SpecialtyOrdersPayload,
} from '../../specialty-common/utils/specialty-order-submission';
import { useAuth } from '../../../contexts/AuthContext';
import type {
  CreateEyeExamDTO,
  UpdateEyeExamDTO,
  EyeExamDTO,
  EyeProcedureDTO,
} from '../types/ophthalmology.types';
import { useSpecialtyReferrals, useUpdateRequestStatus } from '../../clinical-requests/hooks/useClinicalRequests';
import { useDepartmentQueue } from '../../queue/hooks/useQueue';
import type { ClinicalRequestWithDetailsDTO } from '../../clinical-requests/dtos/clinical-request.dto';
import type { QueueDTO } from '../../queue/dtos/queue.dto';

// =============================================================================
// Types
// =============================================================================

type ViewTab = 'queue' | 'referrals' | 'procedures' | 'exams' | 'history';
type StatusFilter =
  | 'Pending'
  | 'Scheduled'
  | 'In_Progress'
  | 'Completed'
  | 'Cancelled'
  | '';

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending Approval' },
  { value: 'Scheduled', label: 'Scheduled' },
  { value: 'In_Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
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
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
  In_Progress: { bg: 'bg-orange-100', text: 'text-orange-800' },
  Completed: { bg: 'bg-green-100', text: 'text-green-800' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
};

function normalizeConsultationStatus(
  rawStatus: string | null | undefined,
  hasClinicalData: boolean,
): 'Completed' | 'Active' {
  if (hasClinicalData) return 'Completed';
  const s = (rawStatus || '').toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('final'))
    return 'Completed';
  return 'Active';
}

function isCompletedExamStatus(status: string | null | undefined): boolean {
  return (status || '').toLowerCase().replace(/_/g, ' ').includes('complete');
}

// =============================================================================
// Component
// =============================================================================

export default function OphthalmologyPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('queue');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: 'accept' | 'reject';
    procedure: EyeProcedureDTO | null;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Exam modal state
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [selectedPatientForExam, setSelectedPatientForExam] = useState<{
    patientId: string;
    emrNumber: string;
    encounterId: string;
    patientName: string;
    encounterNumber?: string;
    clinicalRequestId?: string;
  } | null>(null);

  // View exam modal state
  const [viewExamModalOpen, setViewExamModalOpen] = useState(false);
  const [selectedExamForView, setSelectedExamForView] =
    useState<EyeExamDTO | null>(null);

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

  // Consultant record view (full-page timeline view)
  const [consultantRecordPatient, setConsultantRecordPatient] = useState<{
    patientId: string;
    emrNumber: string;
    encounterId: string;
    patientName: string;
    encounterNumber?: string;
    clinicalRequestId?: string;
    triagePriority?: string | null;
  } | null>(null);

  const [queueRowFocusId, setQueueRowFocusId] = useState<string | null>(null);

  const { showToast } = useToast();
  // AI Assistant Panel
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  const { hasRole, staff } = useAuth();
  const isNurse = hasRole('nurse');
  const examMode: EyeExamMode = isNurse ? 'triage' : 'full';

  const updateRequestStatusMutation = useUpdateRequestStatus();

  // Create / Update exam mutations
  const createExamMutation = useCreateEyeExam();
  const updateExamMutation = useUpdateEyeExam();

  // Queue Query - patients waiting in Ophthalmology queue after payment
  const {
    data: queueDataRaw,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = useDepartmentQueue('Ophthalmology');

  // Specialty Referrals Query - patients referred to Ophthalmology
  const {
    data: referralsRaw,
    isLoading: referralsLoading,
    refetch: refetchReferrals,
  } = useSpecialtyReferrals('ophthalmology', [
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
    data: procedures,
    isLoading: proceduresLoading,
    refetch: refetchProcedures,
  } = useEyeProcedures({
    status: statusFilter || undefined,
    limit: 50,
  });

  // Eye Exams Query for Examinations tab
  const {
    data: examsData,
    isLoading: examsLoading,
    refetch: refetchExams,
  } = useEyeExams({ limit: 50 });

  const { data: stats } = useOphthalmologyStats();

  // Fetch existing eye exam for the selected encounter (for doctor continuing triaged exam)
  const { data: encounterExams } = useEncounterEyeExams(
    selectedPatientForExam?.encounterId || '',
  );
  const existingExamForEncounter = useMemo(() => {
    if (!encounterExams?.length) return undefined;
    // Continue only active encounter exams; completed exams should not be updated.
    return encounterExams.find((exam) => !isCompletedExamStatus(exam.status));
  }, [encounterExams]);

  // Mutations
  const acceptProcedure = useAcceptEyeProcedure();
  const rejectProcedure = useRejectEyeProcedure();

  // Handlers
  const handleAccept = (procedure: EyeProcedureDTO) => {
    setConfirmAction({ type: 'accept', procedure });
  };

  const handleReject = (procedure: EyeProcedureDTO) => {
    setConfirmAction({ type: 'reject', procedure });
    setRejectReason('');
  };

  const confirmAccept = async () => {
    if (!confirmAction?.procedure) return;

    try {
      await acceptProcedure.mutateAsync(confirmAction.procedure.procedure_id);
      showToast({
        title: 'Procedure Accepted',
        message: 'Billing order has been created for this procedure.',
        type: 'success',
      });
      setConfirmAction(null);
      refetchProcedures();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to accept procedure',
        type: 'error',
      });
    }
  };

  const confirmReject = async () => {
    if (!confirmAction?.procedure || !rejectReason.trim()) return;

    try {
      await rejectProcedure.mutateAsync({
        procedureId: confirmAction.procedure.procedure_id,
        reason: rejectReason,
      });
      showToast({
        title: 'Procedure Rejected',
        message: 'The procedure request has been rejected.',
        type: 'info',
      });
      setConfirmAction(null);
      setRejectReason('');
      refetchProcedures();
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to reject procedure',
        type: 'error',
      });
    }
  };

  // Exam modal handlers
  const handleStartExam = (
    patientId: string,
    emrNumber: string,
    encounterId: string,
    patientName: string,
    encounterNumber?: string,
    clinicalRequestId?: string,
    triagePriority?: string | null,
  ) => {
    setSelectedPatientForExam({
      patientId,
      emrNumber,
      encounterId,
      patientName,
      encounterNumber,
      clinicalRequestId,
    });
    setExamModalOpen(true);
  };

  const handleSaveExam = async (
    data: CreateEyeExamDTO | UpdateEyeExamDTO,
    orders?: SpecialtyOrdersPayload,
  ) => {
    try {
      let savedExam: EyeExamDTO;

      // If there's an existing exam (e.g., nurse triaged), update it; otherwise create new
      if (existingExamForEncounter?.exam_id) {
        savedExam = await updateExamMutation.mutateAsync({
          examId: existingExamForEncounter.exam_id,
          input: data as UpdateEyeExamDTO,
        });
      } else {
        savedExam = await createExamMutation.mutateAsync(
          data as CreateEyeExamDTO,
        );
      }

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
          const resolvedPatientId =
            savedExam.patient_id ||
            (data as CreateEyeExamDTO).patient_id ||
            selectedPatientForExam?.patientId;
          const resolvedEncounterId =
            savedExam.encounter_id ||
            (data as CreateEyeExamDTO).encounter_id ||
            selectedPatientForExam?.encounterId;

          if (resolvedPatientId && resolvedEncounterId && staff?.staff_id) {
            void submitSpecialtyOrdersAndReferrals({
              patientPublicId: resolvedPatientId,
              encounterId: resolvedEncounterId,
              orderedByStaffId: staff.staff_id,
              orderedByStaffUuid: staff.id,
              currentSpecialty: 'ophthalmology',
              orders,
              consultationId:
                (savedExam as any).consultation_id ||
                (data as any).consultation_id,
              diagnosisText:
                savedExam.final_diagnosis ||
                savedExam.provisional_diagnosis ||
                '',
              clinicalFindings: [
                savedExam.chief_complaint,
                savedExam.ocular_history,
                savedExam.treatment_plan,
              ]
                .filter(Boolean)
                .join('; '),
              patientName: selectedPatientForExam?.patientName,
              patientEmrNumber: selectedPatientForExam?.emrNumber,
            }).catch((orderError) => {
              console.error(
                'Failed to submit ophthalmology orders/referrals:',
                orderError,
              );
              showToast({
                title: 'Orders Not Sent',
                message:
                  'Examination was saved, but one or more Orders & Services requests could not be sent.',
                type: 'warning',
              });
            });
          } else {
            showToast({
              title: 'Orders Not Sent',
              message:
                'Examination was saved, but requests could not be sent due to missing staff or encounter identifiers.',
              type: 'warning',
            });
          }
        }
      }

      showToast({
        title: 'Exam Saved',
        message: isNurse
          ? 'Triage data saved. Patient is ready for doctor examination.'
          : orderSelectionCount > 0
            ? 'Eye examination saved. Orders & services are syncing in background.'
            : 'Eye examination has been saved successfully.',
        type: 'success',
      });
      setExamModalOpen(false);
      setSelectedPatientForExam(null);
      refetchQueue();
      refetchReferrals();

      // If started from a referral, mark the clinical_request as Completed
      if (selectedPatientForExam?.clinicalRequestId) {
        updateRequestStatusMutation.mutate(
          {
            id: selectedPatientForExam.clinicalRequestId,
            statusUpdate: {
              status: 'Completed',
              reviewed_by: staff?.id || '',
              review_notes: 'Eye examination completed',
            },
          },
          {
            onSuccess: () => refetchReferrals(),
          },
        );
      }
    } catch (error) {
      showToast({
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to save examination',
        type: 'error',
      });
    }
  };

  const handleCloseExamModal = () => {
    setExamModalOpen(false);
    setSelectedPatientForExam(null);
    refetchExams();
  };

  // Track which encounters already have triaged exams (status: 'In Progress')
  const triagedEncounterIds = useMemo(() => {
    if (!examsData?.length) return new Set<string>();
    return new Set(
      examsData
        .filter((e) => e.status === 'In Progress')
        .map((e) => e.encounter_id),
    );
  }, [examsData]);

  // Filter procedures by search term
  const filteredProcedures = useMemo(() => {
    if (!procedures) return [];
    if (!searchTerm.trim()) return procedures;

    const query = searchTerm.toLowerCase();
    return procedures.filter((p) => {
      const patientName = p.patient
        ? `${p.patient.first_name} ${p.patient.surname}`.toLowerCase()
        : '';
      const procedureType = (p.procedure_type || '').toLowerCase();
      return patientName.includes(query) || procedureType.includes(query);
    });
  }, [procedures, searchTerm]);

  // Pending count for badge
  const pendingCount = useMemo(() => {
    return procedures?.filter((p) => p.status === 'Pending').length || 0;
  }, [procedures]);

  // Referrals count for badge
  const referralsCount = referrals.length;

  // Queue count for badge
  const queueCount =
    queueData?.filter((q) => q.status === 'Waiting').length || 0;

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
            ? 'bg-teal-50 ring-1 ring-inset ring-teal-200'
            : ''
        }`}
        onClick={() => setQueueRowFocusId(queueEntry.id)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-700 font-semibold">
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
            {triagedEncounterIds.has(queueEntry.visit_id) && (
              <span className="px-2 py-1 rounded-full text-xs font-medium w-fit bg-green-100 text-green-700">
                Triaged ✓
              </span>
            )}
            {queueEntry.encounter?.encounter_number && (
              <span className="text-xs text-teal-600 font-medium">
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
                handleStartExam(
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
              {isNurse
                ? 'Triage'
                : triagedEncounterIds.has(queueEntry.visit_id)
                  ? 'Continue Exam'
                  : 'Exam'}
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
            for eye examination.
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Ophthalmology Waiting Queue
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
              No patients in the ophthalmology queue
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
                handleStartExam(
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
              className="bg-teal-600 hover:bg-teal-700"
            >
              <ArrowRight size={14} className="mr-1" />
              {isNurse ? 'Triage' : 'Exam'}
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderReferralsTab = () => (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-blue-900">Incoming Referrals</h4>
          <p className="text-sm text-blue-700">
            These are patients referred to the Eye Clinic from GOPD or other
            clinics. Click "Start Exam" to begin the eye examination.
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Ophthalmology Referrals Queue
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
            <p className="text-gray-500">No pending ophthalmology referrals</p>
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

  const renderProcedureRow = (procedure: EyeProcedureDTO) => {
    const statusColor =
      STATUS_COLORS[procedure.status || 'Pending'] || STATUS_COLORS.Pending;
    const isPending = procedure.status === 'Pending';

    return (
      <tr key={procedure.procedure_id} className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">
              {procedure.patient?.first_name} {procedure.patient?.surname}
            </span>
            <span className="text-xs text-gray-500">
              {procedure.patient?.patient_id}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-gray-900">{procedure.procedure_type}</span>
            <span className="text-xs text-gray-500">
              {procedure.procedure_category}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          {procedure.affected_eye ? (
            <span className="text-gray-600 capitalize">
              {procedure.affected_eye}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
          >
            {procedure.status?.replace('_', ' ')}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-500 text-sm">
          {procedure.created_at
            ? formatDistanceToNow(new Date(procedure.created_at), {
                addSuffix: true,
              })
            : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAccept(procedure)}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <Check size={14} className="mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(procedure)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X size={14} className="mr-1" />
                  Reject
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost">
              <Eye size={14} />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  const renderProceduresTab = () => (
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
            placeholder="Search by patient name or procedure..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => refetchProcedures()}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Procedures Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {proceduresLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading procedures...
          </div>
        ) : filteredProcedures.length === 0 ? (
          <div className="p-8 text-center">
            <Eye className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No eye procedures found</p>
            <p className="text-sm text-gray-400 mt-1">
              Procedure requests from consultations will appear here
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
                  Procedure
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Eye
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Requested
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProcedures.map(renderProcedureRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderExamsTab = () => {
    if (examsLoading) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <SkeletonTable rows={5} columns={7} hasHeader />
        </div>
      );
    }

    const exams = examsData || [];

    if (exams.length === 0) {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No eye examinations found</p>
            <p className="text-sm text-gray-400 mt-1">
              Examinations will appear here after completing them from the queue
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
              Eye Examination Records
            </h3>
            <p className="text-sm text-gray-500">
              View all eye examinations conducted
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
                    Encounter
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
                {exams.map((exam) => {
                  const hasClinicialData =
                    exam.chief_complaint ||
                    exam.provisional_diagnosis ||
                    exam.final_diagnosis ||
                    exam.va_right_unaided ||
                    exam.va_left_unaided ||
                    exam.anterior_right_cornea ||
                    exam.anterior_left_cornea ||
                    exam.iop_right != null ||
                    exam.iop_left != null;
                  const displayStatus = normalizeConsultationStatus(
                    exam.status,
                    Boolean(hasClinicialData),
                  );
                  return (
                    <tr key={exam.exam_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {exam.patient
                            ? `${exam.patient.first_name} ${exam.patient.surname}`
                            : 'Unknown Patient'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {exam.patient?.emr_number || exam.patient_id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">
                          {exam.encounter?.encounter_number || '—'}
                        </div>
                        {exam.encounter?.visit_type && (
                          <div className="text-xs text-gray-500">
                            {exam.encounter.visit_type}
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
                        {new Date(exam.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedExamForView(exam);
                              setViewExamModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const pName = exam.patient
                                ? `${exam.patient.first_name} ${exam.patient.surname}`
                                : 'Patient';
                              setConsultantRecordPatient({
                                patientId: exam.patient_id,
                                emrNumber: exam.patient?.emr_number || '',
                                encounterId: exam.encounter_id,
                                patientName: pName,
                                encounterNumber:
                                  exam.encounter?.encounter_number,
                              });
                            }}
                          >
                            <Activity className="h-4 w-4 mr-1" />
                            Timeline
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

  // =========================================================================
  // If consultant record view is active, render full-page timeline UI
  // =========================================================================
  if (consultantRecordPatient) {
    return (
      <div className="min-h-0 h-[calc(100vh-4rem)] overflow-hidden">
        <OphthalmologyConsultantRecord
          patientId={consultantRecordPatient.patientId}
          patientName={consultantRecordPatient.patientName}
          emrNumber={consultantRecordPatient.emrNumber}
          encounterId={consultantRecordPatient.encounterId}
          encounterNumber={consultantRecordPatient.encounterNumber}
          clinicalRequestId={consultantRecordPatient.clinicalRequestId}
          onBack={() => {
            setConsultantRecordPatient(null);
            refetchQueue();
            refetchExams();
            refetchReferrals();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-6 py-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Eye size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Eye Clinic
              </h1>
              <p className="text-teal-100 text-sm">
                Ophthalmology Department Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <OphthalmologyExportPanel data={filteredProcedures} />
            <button
              onClick={() => setIsAIPanelOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-lg transition-colors"
              title="AI Clinical Assistant"
            >
              <Bot size={14} />
              AI
            </button>
            <button
              onClick={() => {
                refetchQueue();
                refetchReferrals();
                refetchProcedures();
                refetchExams();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Refresh All
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 -mt-4 pb-10 space-y-7">
        {/* Stats Cards Row */}
        <div className="grid grid-cols-5 gap-4 sm:gap-5">
          {[
            {
              label: 'In Queue',
              value: queueData.length,
              icon: Clock,
              iconColor: 'text-amber-600',
              bgColor: 'bg-amber-50',
            },
            {
              label: 'Referrals',
              value: referralsCount,
              icon: UserPlus,
              iconColor: 'text-blue-600',
              bgColor: 'bg-blue-50',
            },
            {
              label: 'Pending',
              value: pendingCount,
              icon: AlertCircle,
              iconColor: 'text-orange-600',
              bgColor: 'bg-orange-50',
            },
            {
              label: 'Completed',
              value: stats?.procedures_by_type?.Completed || 0,
              icon: Check,
              iconColor: 'text-emerald-600',
              bgColor: 'bg-emerald-50',
            },
            {
              label: 'Total Exams',
              value: stats?.total_exams || 0,
              icon: ClipboardList,
              iconColor: 'text-teal-600',
              bgColor: 'bg-teal-50',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 flex items-center gap-3 min-w-0"
            >
              <div
                className={`w-9 h-9 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}
              >
                <card.icon size={18} className={card.iconColor} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-slate-900 leading-tight">
                  {card.value}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 pt-3 border-b border-slate-100">
            <nav className="flex gap-1">
              {[
                {
                  key: 'queue' as ViewTab,
                  label: 'Waiting Queue',
                  count: queueCount,
                  countColor: 'bg-amber-100 text-amber-800',
                },
                {
                  key: 'referrals' as ViewTab,
                  label: 'Referrals',
                  count: referralsCount,
                  countColor: 'bg-blue-100 text-blue-800',
                },
                {
                  key: 'procedures' as ViewTab,
                  label: 'Procedures',
                  count: pendingCount,
                  countColor: 'bg-orange-100 text-orange-800',
                },
                {
                  key: 'exams' as ViewTab,
                  label: 'Examinations',
                  count: 0,
                  countColor: '',
                },
                {
                  key: 'history' as ViewTab,
                  label: 'History',
                  count: 0,
                  countColor: '',
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 font-medium text-sm rounded-t-lg transition-colors relative ${
                    activeTab === tab.key
                      ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 text-xs font-bold rounded-full ${tab.countColor}`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content Area */}
          <div className="space-y-4 p-5 sm:p-7">
            <details className="group rounded-lg border border-slate-200 bg-slate-50/80">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                <span>Module tips &amp; guidance</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
                {activeTab === 'queue' && (
                  <InlineGuidance
                    module="ophthalmology"
                    title="Eye clinic queue"
                    message="Click a patient row to focus it. Alerts appear as on-screen notifications you can dismiss."
                  />
                )}
                {activeTab === 'referrals' && (
                  <InlineGuidance
                    module="ophthalmology"
                    title="Referrals"
                    message="Process incoming and outgoing eye clinic referrals."
                  />
                )}
                {activeTab === 'procedures' && (
                  <InlineGuidance
                    module="ophthalmology"
                    title="Procedures"
                    message="Surgeries, laser treatments, and other booked procedures."
                  />
                )}
                {activeTab === 'exams' && (
                  <InlineGuidance
                    module="ophthalmology"
                    title="Examinations"
                    message="Visual acuity, slit-lamp, refraction, and related tests."
                  />
                )}
                {activeTab === 'history' && (
                  <InlineGuidance
                    module="ophthalmology"
                    title="History"
                    message="Archive of previous eye exams and treatments."
                  />
                )}
              </div>
            </details>

            {/* Tab Content */}
            {activeTab === 'queue' && renderQueueTab()}
            {activeTab === 'referrals' && renderReferralsTab()}
            {activeTab === 'procedures' && renderProceduresTab()}
            {activeTab === 'exams' && renderExamsTab()}
            {activeTab === 'history' && (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500">
                  Historical records will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accept Confirmation Dialog */}
      {confirmAction?.type === 'accept' && (
        <ConfirmDialog
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmAccept}
          title="Accept Eye Procedure"
          message={`Are you sure you want to accept the "${confirmAction.procedure?.procedure_type}" procedure for ${confirmAction.procedure?.patient?.first_name} ${confirmAction.procedure?.patient?.surname}? This will create a billing order.`}
          confirmText="Accept & Bill"
          isLoading={acceptProcedure.isPending}
        />
      )}

      {/* Reject Dialog */}
      {confirmAction?.type === 'reject' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reject Procedure
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Please provide a reason for rejecting the "
              {confirmAction.procedure?.procedure_type}" procedure.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmReject}
                disabled={!rejectReason.trim() || rejectProcedure.isPending}
              >
                {rejectProcedure.isPending
                  ? 'Rejecting...'
                  : 'Reject Procedure'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Eye Exam Modal */}
      {examModalOpen && selectedPatientForExam && (
        <Modal
          isOpen={examModalOpen}
          onClose={handleCloseExamModal}
          title={isNurse ? 'Ophthalmic Triage' : 'Eye Examination'}
          size="max"
          allowMaximize
          showCloseButton
          noPadding
        >
          <EyeExamWizard
            patientId={selectedPatientForExam.patientId}
            emrNumber={selectedPatientForExam.emrNumber}
            encounterId={selectedPatientForExam.encounterId}
            patientName={selectedPatientForExam.patientName}
            encounterNumber={selectedPatientForExam.encounterNumber}
            mode={examMode}
            existingExam={existingExamForEncounter}
            onSave={handleSaveExam}
            onClose={handleCloseExamModal}
          />
        </Modal>
      )}

      {/* Eye Exam View Modal */}
      {selectedExamForView && (
        <EyeExamViewModal
          exam={selectedExamForView}
          isOpen={viewExamModalOpen}
          onClose={() => {
            setViewExamModalOpen(false);
            setSelectedExamForView(null);
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
        specialty="Ophthalmology"
        onStartExam={() => {
          if (selectedReferral) {
            handleStartExam(
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
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-teal-700 to-emerald-600 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-xl p-2 border border-white/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-sm font-semibold">XenoCare AI Assistants</span>
                  <span className="block text-[11px] text-white/80">Eye Clinic</span>
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
                department="Ophthalmology"
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
