/**
 * Dental Module Page
 * Main entry point for dental examinations and procedure management
 * Includes accept/reject workflow for procedure requests
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Smile,
  Check,
  X,
  Eye,
  Clock,
  RefreshCw,
  UserPlus,
  ArrowRight,
  AlertCircle,
  ClipboardList,
  Loader2,
  User,
  Heart,
  ChevronDown,
  Bot,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../../../components/ui/FormElements';
import { ConfirmDialog, Modal, StatsCard } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { ReferralDetailsModal } from '../../../components/shared';
import PatientMedicalRecordsPanel from '../../../components/shared/PatientMedicalRecordsPanel';
import { InlineGuidance } from '../../../components/guidance/InlineGuidance';
import {
  useDentalProcedures,
  useDentalExams,
  useAcceptDentalProcedure,
  useRejectDentalProcedure,
  useDentalStats,
  useCreateDentalExam,
  useCreateDentalChartEntry,
} from '../hooks/useDental';
import {
  useCompleteRequest,
  useSpecialtyReferrals,
} from '../../clinical-requests/hooks/useClinicalRequests';
import { useDepartmentQueue } from '../../queue/hooks/useQueue';
import DentalExamWizard from '../components/DentalExamWizard';
import DentalExamViewModal from '../components/DentalExamViewModal';
import SpecialtyConsultationTimeline from '../../specialty-clinic/components/SpecialtyConsultationTimeline';
import SpecialtyCarePlanDashboard from '../../specialty-common/components/SpecialtyCarePlanDashboard';
import { DentalExportPanel } from '../components/DentalExportPanel';
import { AIChatPanel } from '../../ai-assistant/components/AIChatPanel';
import {
  submitSpecialtyOrdersAndReferrals,
  type SpecialtyOrdersPayload,
} from '../../specialty-common/utils/specialty-order-submission';
import type {
  DentalProcedureDTO,
  CreateDentalExamDTO,
  DentalExamDTO,
  CreateDentalChartEntryDTO,
} from '../types/dental.types';
import type { ClinicalRequestWithDetailsDTO } from '../../clinical-requests/dtos/clinical-request.dto';
import type { QueueDTO } from '../../queue/dtos/queue.dto';
import type { SpecialtyConsultationHistory } from '../../specialty-clinic/types/specialty-dashboard.types';

// =============================================================================
// Types
// =============================================================================

type ViewTab =
  | 'queue'
  | 'referrals'
  | 'procedures'
  | 'exams'
  | 'history'
  | 'care_plans';
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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  Scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
  In_Progress: { bg: 'bg-orange-100', text: 'text-orange-800' },
  Completed: { bg: 'bg-green-100', text: 'text-green-800' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
};

/** Map referral / queue urgency to encounter priority for the clinical alerts strip */
function urgencyForClinicalAlerts(
  urgency: string | null | undefined,
): string | undefined {
  const u = (urgency || '').trim();
  if (u === 'Emergency' || u === 'Urgent' || u === 'Stat') return u;
  return undefined;
}

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

// =============================================================================
// Helpers
// =============================================================================

/** Map dental exams into the SpecialtyConsultationHistory format for the timeline */
function dentalExamsToTimeline(
  exams: DentalExamDTO[],
): SpecialtyConsultationHistory[] {
  return exams.map((exam) => {
    // Build specialty_data from dental-specific exam fields
    const specialtyData: Record<string, unknown> = {};
    if (exam.complaint_type)
      specialtyData['Complaint Category'] = exam.complaint_type;
    if (exam.complaint_description)
      specialtyData['Complaint Description'] = exam.complaint_description;
    if (exam.affected_area) specialtyData['Affected Area'] = exam.affected_area;
    if (exam.pain_level != null)
      specialtyData['Pain Level'] = `${exam.pain_level}/10`;
    if (exam.pain_character)
      specialtyData['Pain Character'] = exam.pain_character;
    if (exam.extraoral_findings)
      specialtyData['Extraoral Findings'] = exam.extraoral_findings;
    if (exam.intraoral_findings)
      specialtyData['Intraoral Findings'] = exam.intraoral_findings;
    if (exam.soft_tissue_exam)
      specialtyData['Soft Tissue'] = exam.soft_tissue_exam;
    if (exam.hard_tissue_exam)
      specialtyData['Hard Tissue'] = exam.hard_tissue_exam;
    if (exam.occlusion_class) specialtyData.Occlusion = exam.occlusion_class;
    if (exam.tmj_assessment)
      specialtyData['TMJ Assessment'] = exam.tmj_assessment;
    if (exam.gingival_status)
      specialtyData['Gingival Status'] = exam.gingival_status;
    if (exam.bleeding_on_probing != null)
      specialtyData['Bleeding on Probing'] = exam.bleeding_on_probing
        ? 'Present'
        : 'Absent';
    if (exam.calculus_type) specialtyData.Calculus = exam.calculus_type;
    if (exam.radiograph_type)
      specialtyData['Radiograph Type'] = exam.radiograph_type;
    if (exam.radiograph_findings)
      specialtyData['Radiograph Findings'] = exam.radiograph_findings;
    if (exam.urgency) specialtyData.Urgency = exam.urgency;

    // Build examination narrative from available fields
    const examParts: string[] = [];
    if (exam.extraoral_findings)
      examParts.push(`Extraoral: ${exam.extraoral_findings}`);
    if (exam.intraoral_findings)
      examParts.push(`Intraoral: ${exam.intraoral_findings}`);
    if (exam.gingival_status)
      examParts.push(`Gingival: ${exam.gingival_status}`);

    return {
      id: exam.exam_id,
      consultation_date: exam.created_at,
      chief_complaint: exam.chief_complaint || exam.complaint_type || null,
      complaints: exam.complaint_description || null,
      diagnosis: exam.final_diagnosis || exam.provisional_diagnosis || null,
      clinical_notes: exam.examination_notes || null,
      history_of_present_illness: exam.complaint_duration
        ? `Duration: ${exam.complaint_duration}`
        : null,
      past_medical_history: exam.medical_history || null,
      family_history: null,
      social_history:
        [
          exam.tobacco_use && exam.tobacco_use !== 'None'
            ? `Tobacco: ${exam.tobacco_use}`
            : null,
          exam.alcohol_use && exam.alcohol_use !== 'None'
            ? `Alcohol: ${exam.alcohol_use}`
            : null,
        ]
          .filter(Boolean)
          .join('; ') || null,
      review_of_systems: null,
      examination_findings: examParts.join('. ') || null,
      physical_examination: null,
      treatment_plan: exam.treatment_plan || null,
      specialty_data:
        Object.keys(specialtyData).length > 0 ? specialtyData : null,
      specialty_code: 'DENTAL',
      icd_codes: (exam.icd_codes || []).map((code) =>
        typeof code === 'string' ? { code, description: code } : code,
      ),
      status: normalizeConsultationStatus(
        exam.status,
        Boolean(
          exam.chief_complaint ||
          exam.provisional_diagnosis ||
          exam.final_diagnosis ||
          exam.intraoral_findings ||
          exam.extraoral_findings,
        ),
      ),
      first_name: exam.patient?.first_name || '',
      last_name: exam.patient?.last_name || '',
      emr_number: exam.patient?.emr_number || '',
      patient_id: exam.patient_id,
      doctor_first: exam.provider?.first_name || null,
      doctor_last: exam.provider?.last_name || null,
      visit_id: null,
      encounter_id: exam.encounter_id || null,
      created_at: exam.created_at,
      updated_at: exam.updated_at,
    };
  });
}

// =============================================================================
// Component
// =============================================================================

export default function DentalPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('queue');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page] = useState(1);

  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    type: 'accept' | 'reject';
    procedure: DentalProcedureDTO | null;
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
    /** Queue / referral triage for clinical alerts */
    priority?: string | null;
  } | null>(null);

  /** Queue row selected for patient-safety alerts (click row; action buttons use stopPropagation) */
  const [queueRowFocusId, setQueueRowFocusId] = useState<string | null>(null);

  // View exam modal state
  const [viewExamModalOpen, setViewExamModalOpen] = useState(false);
  const [selectedExamForView, setSelectedExamForView] =
    useState<DentalExamDTO | null>(null);

  // Referral details modal state
  const [selectedReferral, setSelectedReferral] =
    useState<ClinicalRequestWithDetailsDTO | null>(null);
  const [referralDetailsModalOpen, setReferralDetailsModalOpen] =
    useState(false);

  // AI Assistant Panel
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  // Auto-open encounter detail for a specific exam from the exams table
  const [timelineSelectedExamId, setTimelineSelectedExamId] = useState<string | null>(null);

  // Patient records modal state
  const [patientRecordsModalOpen, setPatientRecordsModalOpen] = useState(false);
  const [selectedPatientForRecords, setSelectedPatientForRecords] = useState<{
    patientId: string;
    patientName: string;
    emrNumber: string;
  } | null>(null);

  const { showToast } = useToast();
  const { staff } = useAuth();

  // Queue Query - patients waiting in Dental queue after payment
  const {
    data: queueDataRaw,
    isLoading: queueLoading,
    refetch: refetchQueue,
  } = useDepartmentQueue('Dental');

  // Specialty Referrals Query - patients referred to Dental
  const {
    data: referralsRaw,
    isLoading: referralsLoading,
    refetch: refetchReferrals,
  } = useSpecialtyReferrals('dental', ['Pending', 'Approved', 'In_Progress']);

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
    data: proceduresData,
    isLoading: proceduresLoading,
    refetch: refetchProcedures,
  } = useDentalProcedures({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  // Dental Exams Query - shows all completed/pending exams
  const {
    data: examsData,
    isLoading: examsLoading,
    refetch: refetchExams,
  } = useDentalExams({
    page: 1,
    limit: 50,
  });

  const { data: stats } = useDentalStats();

  // Mutations
  const acceptProcedure = useAcceptDentalProcedure();
  const rejectProcedure = useRejectDentalProcedure();
  const createExamMutation = useCreateDentalExam();
  const createChartEntryMutation = useCreateDentalChartEntry();
  const completeRequestMutation = useCompleteRequest();

  // Handlers
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
      priority: triagePriority ?? undefined,
    });
    setExamModalOpen(true);
  };

  const handleSaveExam = async (
    exam: CreateDentalExamDTO,
    orders?: SpecialtyOrdersPayload,
  ): Promise<DentalExamDTO> => {
    const result = await createExamMutation.mutateAsync(exam);

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
          currentSpecialty: 'dental',
          orders,
          consultationId: result.consultation_id,
          diagnosisText:
            result.final_diagnosis || result.provisional_diagnosis || '',
          clinicalFindings: [
            result.chief_complaint,
            result.intraoral_findings,
            result.extraoral_findings,
            result.treatment_plan,
          ]
            .filter(Boolean)
            .join('; '),
          patientName: selectedPatientForExam?.patientName,
          patientEmrNumber: selectedPatientForExam?.emrNumber,
        }).catch((orderError) => {
          console.error(
            'Failed to submit dental orders/referrals:',
            orderError,
          );
          showToast({
            title: 'Orders Not Sent',
            message:
              'Exam was saved, but one or more Orders & Services requests could not be sent.',
            type: 'warning',
          });
        });
      }
    }

    showToast({
      title: 'Exam Saved',
      message:
        orderSelectionCount > 0
          ? 'Dental examination saved. Orders & services are syncing in background.'
          : 'Dental examination has been saved successfully.',
      type: 'success',
    });

    const referralId = selectedPatientForExam?.clinicalRequestId;
    if (referralId) {
      completeRequestMutation.mutate(
        {
          id: referralId,
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
                'Exam saved, but the referral could not be marked complete.',
              type: 'warning',
            });
          },
        },
      );
    }

    return result;
  };

  const handleSaveChartEntry = async (
    entry: CreateDentalChartEntryDTO,
  ): Promise<void> => {
    await createChartEntryMutation.mutateAsync(entry);
  };

  const handleCloseExamModal = () => {
    setExamModalOpen(false);
    setSelectedPatientForExam(null);
    refetchQueue();
    refetchExams();
    refetchReferrals();
  };

  const handleAccept = (procedure: DentalProcedureDTO) => {
    setConfirmAction({ type: 'accept', procedure });
  };

  const handleReject = (procedure: DentalProcedureDTO) => {
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

  // Filter procedures by search term
  const filteredProcedures = useMemo(() => {
    if (!proceduresData?.data) return [];
    if (!searchTerm.trim()) return proceduresData.data;

    const query = searchTerm.toLowerCase();
    return proceduresData.data.filter((p) => {
      const patientName = p.patient
        ? `${p.patient.first_name} ${p.patient.surname}`.toLowerCase()
        : '';
      const procedureType = (p.procedure_type || '').toLowerCase();
      return patientName.includes(query) || procedureType.includes(query);
    });
  }, [proceduresData?.data, searchTerm]);

  // Pending count for badge
  const pendingCount = useMemo(() => {
    return (
      proceduresData?.data?.filter((p) => p.status === 'Pending').length || 0
    );
  }, [proceduresData?.data]);

  // Referrals count for badge
  const referralsCount = referrals.length;

  // Queue count for badge
  const queueCount =
    queueData?.filter((q) => q.status === 'Waiting').length || 0;

  // Map dental exams to timeline format for the History tab
  const timelineHistory = useMemo(() => {
    const exams = examsData?.data || [];
    return dentalExamsToTimeline(exams);
  }, [examsData?.data]);

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
            ? 'bg-violet-50 ring-1 ring-inset ring-violet-200'
            : ''
        }`}
        onClick={() => setQueueRowFocusId(queueEntry.id)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <span className="text-violet-700 font-semibold">
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
              <span className="text-xs text-violet-600 font-medium">
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
              Exam
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
            for dental examination.
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Dental Waiting Queue</h3>
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
            <p className="text-gray-500">No patients in the dental queue</p>
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
              className="bg-violet-600 hover:bg-violet-700"
            >
              <ArrowRight size={14} className="mr-1" />
              Exam
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
            These are patients referred to the Dental department from GOPD or
            other clinics. Click "Start Exam" to begin the dental examination.
          </p>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Dental Referrals Queue
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
            <p className="text-gray-500">No pending dental referrals</p>
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

  const renderProcedureRow = (procedure: DentalProcedureDTO) => {
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
          {procedure.tooth_numbers?.length ? (
            <span className="text-gray-600">
              {procedure.tooth_numbers.join(', ')}
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
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
            <Smile className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No dental procedures found</p>
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
                  Teeth
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
    const exams = examsData?.data || [];

    return (
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 flex items-start gap-3">
          <FileText className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-violet-900">Dental Examinations</h4>
            <p className="text-sm text-violet-700">
              View completed dental examinations and their associated
              procedures.
            </p>
          </div>
        </div>

        {/* Exams Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {examsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-600" />
              <p className="mt-2 text-gray-500">Loading examinations...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No dental examinations found</p>
              <p className="text-sm text-gray-400 mt-1">
                Examinations will appear here after you complete patient exams
                from the queue.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chief Complaint
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exams.map((exam) => {
                  // Determine effective status: if exam has clinical data, show Completed
                  const hasClinicialData =
                    exam.chief_complaint ||
                    exam.provisional_diagnosis ||
                    exam.final_diagnosis ||
                    exam.intraoral_findings ||
                    exam.extraoral_findings;
                  const displayStatus = normalizeConsultationStatus(
                    exam.status,
                    Boolean(hasClinicialData),
                  );
                  return (
                    <tr key={exam.exam_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-900">
                            {exam.patient?.first_name} {exam.patient?.last_name}
                          </span>
                          <div className="text-xs text-gray-500">
                            EMR: {exam.patient?.emr_number || exam.patient_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 line-clamp-2">
                          {exam.chief_complaint || exam.complaint_type || <span className="text-gray-400 italic">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {exam.created_at
                          ? formatDistanceToNow(new Date(exam.created_at), {
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
                              setSelectedExamForView(exam);
                              setViewExamModalOpen(true);
                            }}
                          >
                            <Eye size={14} className="mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setTimelineSelectedExamId(exam.exam_id);
                              setActiveTab('history');
                            }}
                            title="View encounter timeline with orders"
                          >
                            <Activity size={14} className="mr-1" />
                            Timeline
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="py-8 px-5 sm:px-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dental Module</h1>
          <p className="text-gray-600">
            Manage dental procedures and examinations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAIPanelOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-sm font-medium transition-colors"
            title="AI Clinical Assistant"
          >
            <Bot size={16} />
            AI Assistant
          </button>
          <DentalExportPanel data={filteredProcedures} />
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
          title="Pending"
          value={pendingCount}
          icon={AlertCircle}
          color="yellow"
        />
        <StatsCard
          title="Completed"
          value={stats?.completedProcedures || 0}
          icon={Check}
          color="green"
        />
        <StatsCard
          title="Total Exams"
          value={stats?.totalExams || 0}
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
                ? 'border-violet-600 text-violet-600'
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
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Referrals Queue
            {referralsCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                {referralsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('procedures')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'procedures'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Procedure Requests
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'exams'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Examinations
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
            {timelineHistory.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {timelineHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('care_plans')}
            className={`py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'care_plans'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-1">
              <Heart size={14} />
              Care Plans
            </span>
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
              module="dental"
              title="Patient queue"
              message="Select a queue row to focus that patient. Clinical items arrive as on-screen notifications. Patients here have paid for dental services."
            />
          )}
          {activeTab === 'referrals' && (
            <InlineGuidance
              module="dental"
              title="Specialty referrals"
              message="Patients referred from general consultation for specialist dental care."
            />
          )}
          {activeTab === 'procedures' && (
            <InlineGuidance
              module="dental"
              title="Procedure management"
              message="Track and document dental procedures, surgeries, and treatments."
            />
          )}
          {activeTab === 'exams' && (
            <InlineGuidance
              module="dental"
              title="Dental examinations"
              message="Record dental charts, findings, and treatment plans."
            />
          )}
          {activeTab === 'history' && (
            <InlineGuidance
              module="dental"
              title="Patient history"
              message="Past visits and treatment records in chronological order."
            />
          )}
          {activeTab === 'care_plans' && (
            <InlineGuidance
              module="dental"
              title="Dental care plans"
              message="Multi-visit plans such as orthodontics, periodontal maintenance, and implant programmes."
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
        <SpecialtyConsultationTimeline
          history={timelineHistory}
          specialtyName="Dental"
          initialSelectedEncounterId={timelineSelectedExamId}
          onInitialSelectionClosed={() => setTimelineSelectedExamId(null)}
        />
      )}
      {activeTab === 'care_plans' && (
        <SpecialtyCarePlanDashboard specialtyCode="DENTAL" />
      )}

      {/* Accept Confirmation Dialog */}
      {confirmAction?.type === 'accept' && (
        <ConfirmDialog
          isOpen
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmAccept}
          title="Accept Dental Procedure"
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

      {/* Dental Exam Modal */}
      {examModalOpen && selectedPatientForExam && (
        <Modal
          isOpen={examModalOpen}
          onClose={handleCloseExamModal}
          title="Dental Examination"
          size="max"
          allowMaximize
          showCloseButton
          noPadding
        >
          <DentalExamWizard
            patientId={selectedPatientForExam.patientId}
            emrNumber={selectedPatientForExam.emrNumber}
            encounterId={selectedPatientForExam.encounterId}
            patientName={selectedPatientForExam.patientName}
            encounterNumber={selectedPatientForExam.encounterNumber}
            onSaveExam={handleSaveExam}
            onSaveChartEntry={handleSaveChartEntry}
            onClose={handleCloseExamModal}
          />
        </Modal>
      )}

      {/* Dental Exam View Modal */}
      {selectedExamForView && (
        <DentalExamViewModal
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
        specialty="Dental"
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
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-violet-700 to-violet-600 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-xl p-2 border border-white/20">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-sm font-semibold">XenoCare AI Assistants</span>
                  <span className="block text-[11px] text-white/80">Dental Department</span>
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
                department="Dental"
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
