import React, { useState, useMemo } from 'react';
import {
  Users,
  Phone,
  PlayCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Clock,
  Search,
  MoreVertical,
} from 'lucide-react';
import { Button, Select } from '../../../components/ui/FormElements';
import { StatusBadge } from '../../../components/ui/DataDisplay';
import { Modal } from '../../../components/ui/Modal';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';
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

interface QueueKanbanBoardProps {
  entries: QueueDTO[] | undefined;
  department: Department;
  isLoading?: boolean;
  onPatientSelect?: (patientId: string) => void;
  paymentStatusMap?: PaymentStatusMap;
}

export function QueueKanbanBoard({
  entries,
  department,
  isLoading,
  onPatientSelect,
  paymentStatusMap = {},
}: QueueKanbanBoardProps) {
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

  // Filter entries by search query
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

  // Group entries by status
  const columns = useMemo(() => {
    const cols: Record<QueueStatus, QueueDTO[]> = {
      Waiting: [],
      Called: [],
      'In Progress': [],
      Completed: [],
      'No Show': [],
      Ready_For_Consultation: [],
      Skipped: [],
      Cancelled: [],
      In_Consultation: [],
    };

    filteredEntries.forEach((entry) => {
      if (cols[entry.status]) {
        cols[entry.status].push(entry);
      }
    });

    return cols;
  }, [filteredEntries]);

  if (isLoading && !entries) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 min-h-[500px]">
            <SkeletonCard className="h-8 mb-4" />
            <div className="space-y-3">
              <SkeletonCard className="h-24" />
              <SkeletonCard className="h-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const renderCard = (entry: QueueDTO) => {
    const isEmergency = entry.priority === 'Emergency';
    const isUrgent = entry.priority === 'Urgent';

    return (
      <div
        key={entry.id}
        className={`bg-white rounded-lg p-3 shadow-sm border transition-all hover:shadow-md ${
          isEmergency
            ? 'border-danger-300 border-l-4 border-l-danger-500'
            : isUrgent
              ? 'border-warning-300 border-l-4 border-l-warning-500'
              : 'border-gray-200 border-l-4 border-l-info-500'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
            {formatQueueNumber(entry.ticket_number)}
          </span>
          {entry.visit_id && paymentStatusMap[entry.visit_id] && (
            <PaymentStatusDot
              status={getPaymentStatusFromBillingOrder(
                paymentStatusMap[entry.visit_id]?.payment_status,
              )}
            />
          )}
        </div>

        <button
          onClick={() => onPatientSelect?.(entry.patient_id)}
          className="text-sm font-semibold text-gray-900 hover:text-primary-600 text-left line-clamp-1 mb-1"
        >
          {entry.patient?.first_name} {entry.patient?.surname}
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Clock className="h-3 w-3" />
          <span>{formatWaitTime(entry.created_at)}</span>
        </div>

        {/* Actions based on status */}
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
          {entry.status === 'Waiting' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={() => {
                // We can't call a specific patient easily with the current hook,
                // but we can transfer or mark no show
                setTransferModal({ open: true, queueId: entry.id });
              }}
            >
              Transfer
            </Button>
          )}

          {entry.status === 'Called' && (
            <>
              <Button
                size="sm"
                variant="primary"
                className="flex-1 text-xs h-7"
                onClick={() => handleStartServing(entry.id)}
                disabled={startServing.isPending}
              >
                Start
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="flex-1 text-xs h-7"
                onClick={() => handleNoShow(entry.id)}
                disabled={markNoShow.isPending}
              >
                No Show
              </Button>
            </>
          )}

          {entry.status === 'In Progress' && (
            <>
              <Button
                size="sm"
                variant="primary"
                className="flex-1 text-xs h-7 bg-green-600 hover:bg-green-700 text-white border-transparent"
                onClick={() => handleComplete(entry.id)}
                disabled={completeServing.isPending}
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-7"
                onClick={() =>
                  setTransferModal({ open: true, queueId: entry.id })
                }
              >
                Transfer
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {columns.Waiting.length > 0 && (
          <Button
            variant="primary"
            onClick={handleCallNext}
            disabled={callNext.isPending}
            className="w-full sm:w-auto shadow-sm"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Next Patient
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4 pb-4">
        {/* Waiting Column */}
        <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-200 h-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning-500" />
              Waiting
            </h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {columns.Waiting.length}
            </span>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
            {columns.Waiting.map(renderCard)}
            {columns.Waiting.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                No patients waiting
              </div>
            )}
          </div>
        </div>

        {/* Called Column */}
        <div className="bg-info-50/50 rounded-xl p-3 border border-info-100 h-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-info-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-info-500" />
              Called
            </h3>
            <span className="bg-info-200 text-info-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {columns.Called.length}
            </span>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
            {columns.Called.map(renderCard)}
            {columns.Called.length === 0 && (
              <div className="text-center py-8 text-info-400/60 text-sm border-2 border-dashed border-info-200 rounded-lg">
                No patients called
              </div>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-primary-50/50 rounded-xl p-3 border border-primary-100 h-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-primary-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              In Progress
            </h3>
            <span className="bg-primary-200 text-primary-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {columns['In Progress'].length}
            </span>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
            {columns['In Progress'].map(renderCard)}
            {columns['In Progress'].length === 0 && (
              <div className="text-center py-8 text-primary-400/60 text-sm border-2 border-dashed border-primary-200 rounded-lg">
                No active sessions
              </div>
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="bg-success-50/50 rounded-xl p-3 border border-success-100 h-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-success-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success-500" />
              Completed
            </h3>
            <span className="bg-success-200 text-success-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {columns.Completed.length}
            </span>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
            {columns.Completed.map(renderCard)}
            {columns.Completed.length === 0 && (
              <div className="text-center py-8 text-success-400/60 text-sm border-2 border-dashed border-success-200 rounded-lg">
                No completed sessions
              </div>
            )}
          </div>
        </div>
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
