import React, { useState, useMemo } from 'react';
import {
  Users,
  Phone,
  PlayCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  CreditCard,
  Search,
} from 'lucide-react';
import { Button, Select } from '../../../components/ui/FormElements';
import { StatusBadge, EmptyState } from '../../../components/ui/DataDisplay';
import { Modal } from '../../../components/ui/Modal';
import { SkeletonCard, Skeleton } from '../../../components/ui/SkeletonLoader';
import {
  PaymentStatusDot,
  getPaymentStatusFromBillingOrder,
} from '../../../components/workflow';
import {
  QueueDTO,
  QueueStatus,
  Department,
  DEPARTMENTS,
  getQueueStatusColor,
  getPriorityColor,
  formatWaitTime,
  formatQueueNumber,
} from '../dtos/queue.dto';
import {
  useCallNext,
  useStartServing,
  useCompleteServing,
  useMarkNoShow,
  useTransferDepartment,
} from '../hooks/useQueue';
import { PaymentStatusMap } from '../../billing/hooks/useBillingOrders';
import { useToast } from '../../../components/ui/Toast';

interface QueueListProps {
  entries: QueueDTO[] | undefined;
  department: Department;
  isLoading?: boolean;
  onPatientSelect?: (patientId: string) => void;
  paymentStatusMap?: PaymentStatusMap;
}

export function QueueList({
  entries,
  department,
  isLoading,
  onPatientSelect,
  paymentStatusMap = {},
}: QueueListProps) {
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    queueId: string | null;
  }>({ open: false, queueId: null });
  const [targetDepartment, setTargetDepartment] =
    useState<Department>('Consultation');
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();
  const callNext = useCallNext();
  const startServing = useStartServing();
  const completeServing = useCompleteServing();
  const markNoShow = useMarkNoShow();
  const transferDepartment = useTransferDepartment();

  const getLabTestsSummary = (entry: QueueDTO) =>
    entry.lab_requests
      ?.map((req) => req.test?.name || req.test_id)
      .filter((name): name is string => Boolean(name))
      .join(', ');

  const handleCallNext = () => {
    callNext.mutate(department, {
      onSuccess: () =>
        showToast({
          type: 'success',
          title: 'Patient Called',
          message: 'Next patient has been called',
        }),
      onError: () =>
        showToast({
          type: 'error',
          title: 'Call Failed',
          message: 'Failed to call next patient',
        }),
    });
  };

  const handleStartServing = (queueId: string) => {
    startServing.mutate(queueId, {
      onSuccess: () =>
        showToast({
          type: 'success',
          title: 'Service Started',
          message: 'Now serving patient',
        }),
      onError: () =>
        showToast({
          type: 'error',
          title: 'Start Failed',
          message: 'Failed to start service',
        }),
    });
  };

  const handleComplete = (queueId: string) => {
    completeServing.mutate(queueId, {
      onSuccess: () =>
        showToast({
          type: 'success',
          title: 'Completed',
          message: 'Service completed',
        }),
      onError: () =>
        showToast({
          type: 'error',
          title: 'Complete Failed',
          message: 'Failed to complete service',
        }),
    });
  };

  const handleNoShow = (queueId: string) => {
    markNoShow.mutate(queueId, {
      onSuccess: () =>
        showToast({
          type: 'success',
          title: 'Marked No-Show',
          message: 'Patient marked as no-show',
        }),
      onError: () =>
        showToast({
          type: 'error',
          title: 'Mark Failed',
          message: 'Failed to mark no-show',
        }),
    });
  };

  const handleTransfer = () => {
    if (transferModal.queueId) {
      transferDepartment.mutate(
        {
          queueId: transferModal.queueId,
          department: targetDepartment,
        },
        {
          onSuccess: () =>
            showToast({
              type: 'success',
              title: 'Transferred',
              message: `Patient transferred to ${targetDepartment}`,
            }),
          onError: () =>
            showToast({
              type: 'error',
              title: 'Transfer Failed',
              message: 'Failed to transfer patient',
            }),
        },
      );
      setTransferModal({ open: false, queueId: null });
    }
  };

  // Filter entries by search query (client-side)
  const filteredEntries = useMemo(() => {
    const safeEntries = entries || [];
    if (!searchQuery.trim()) return safeEntries;
    const query = searchQuery.toLowerCase();
    return safeEntries.filter((entry) => {
      const patientName = entry.patient
        ? `${entry.patient.first_name} ${entry.patient.surname}`.toLowerCase()
        : '';
      const ticketNumber = entry.ticket_number?.toLowerCase() || '';
      return patientName.includes(query) || ticketNumber.includes(query);
    });
  }, [entries, searchQuery]);

  const currentPatient = filteredEntries.find(
    (e) => e.status === 'Called' || e.status === 'In Progress',
  );
  const waitingPatients = filteredEntries.filter((e) => e.status === 'Waiting');
  const currentLabTests =
    department === 'Laboratory' && currentPatient
      ? getLabTestsSummary(currentPatient)
      : undefined;

  if (isLoading && !entries) {
    return (
      <div className="space-y-6">
        {/* Current Patient Skeleton */}
        <SkeletonCard className="h-36" />

        {/* Waiting Patients Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Queue Item Skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-16 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Patient Card */}
      {currentPatient && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">
                Now Serving
              </p>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-blue-700">
                  {formatQueueNumber(currentPatient.ticket_number)}
                </span>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {currentPatient.patient?.first_name}{' '}
                    {currentPatient.patient?.surname}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge
                      status={currentPatient.status}
                      color={getQueueStatusColor(currentPatient.status)}
                    />
                    {currentPatient.priority !== 'Normal' && (
                      <StatusBadge
                        status={currentPatient.priority}
                        color={getPriorityColor(currentPatient.priority)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {currentPatient.status === 'Called' && (
                <Button
                  variant="primary"
                  onClick={() => handleStartServing(currentPatient.id)}
                  disabled={startServing.isPending}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
              {currentPatient.status === 'In Progress' && (
                <>
                  <Button
                    variant="success"
                    onClick={() => handleComplete(currentPatient.id)}
                    disabled={completeServing.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setTransferModal({
                        open: true,
                        queueId: currentPatient.id,
                      })
                    }
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Transfer
                  </Button>
                </>
              )}
              <Button
                variant="danger"
                onClick={() => handleNoShow(currentPatient.id)}
                disabled={markNoShow.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                No Show
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Call Next Button */}
      {!currentPatient && waitingPatients.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCallNext}
            disabled={callNext.isPending}
          >
            <Phone className="h-5 w-5 mr-2" />
            Call Next Patient
          </Button>
        </div>
      )}

      {/* Waiting List */}
      <div>
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Waiting List ({waitingPatients.length})
        </h3>

        {waitingPatients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients waiting"
            description="The queue is empty for this department"
          />
        ) : (
          <div className="space-y-2">
            {waitingPatients.map((entry, index) => {
              const labTestsSummary =
                department === 'Laboratory'
                  ? getLabTestsSummary(entry)
                  : undefined;

              return (
                <div
                  key={entry.id}
                  className={`bg-white border rounded-lg p-4 flex items-center justify-between ${
                    entry.priority === 'Emergency'
                      ? 'border-red-300 bg-red-50'
                      : entry.priority === 'Urgent'
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <span className="text-2xl font-bold text-gray-700">
                        {formatQueueNumber(entry.ticket_number)}
                      </span>
                    </div>
                    <div>
                      <button
                        onClick={() => onPatientSelect?.(entry.patient_id)}
                        className="text-base font-medium text-gray-900 hover:text-blue-600"
                      >
                        {entry.patient?.first_name} {entry.patient?.surname}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.priority !== 'Normal' && (
                          <span className="flex items-center text-sm">
                            <AlertTriangle
                              className={`h-4 w-4 mr-1 ${
                                entry.priority === 'Emergency'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                              }`}
                            />
                            {entry.priority}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          Waiting: {formatWaitTime(entry.created_at)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          {entry.notes}
                        </p>
                      )}
                      {labTestsSummary && (
                        <p className="text-sm text-gray-600 mt-1">
                          Lab Tests: {labTestsSummary}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Payment Status */}
                    {entry.visit_id && paymentStatusMap[entry.visit_id] && (
                      <PaymentStatusDot
                        status={getPaymentStatusFromBillingOrder(
                          paymentStatusMap[entry.visit_id]?.payment_status,
                        )}
                      />
                    )}
                    <span className="text-sm text-gray-400">#{index + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      <Modal
        isOpen={transferModal.open}
        onClose={() => setTransferModal({ open: false, queueId: null })}
        title="Transfer Patient"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Transfer to Department"
            value={targetDepartment}
            onChange={(e) => setTargetDepartment(e.target.value as Department)}
            options={DEPARTMENTS.filter((d) => d !== department).map((d) => ({
              value: d,
              label: d,
            }))}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setTransferModal({ open: false, queueId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleTransfer}
              disabled={transferDepartment.isPending}
            >
              Transfer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
