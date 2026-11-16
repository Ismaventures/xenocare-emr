import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  AlertCircle,
  User,
  Calendar,
  FileText,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui';
import { RadiologyRequestDTO } from '../dtos/radiology.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import {
  useBatchAcceptRadiologyRequests,
  useBatchRejectRadiologyRequests,
} from '../hooks/useRadiology';
import { useToast } from '../../../components/ui/Toast';

// =============================================================================
// Types
// =============================================================================

export interface EncounterGroup {
  encounter_id: string;
  patient: RadiologyRequestDTO['patient'];
  doctor: RadiologyRequestDTO['doctor'];
  encounter_date: string;
  requests: RadiologyRequestDTO[];
  pending_count: number;
  total_count: number;
}

interface EncounterApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterGroup: EncounterGroup | null;
}

// =============================================================================
// Helper: Group Radiology Requests by Encounter
// =============================================================================

export function groupRadiologyRequestsByEncounter(
  requests: RadiologyRequestDTO[],
): EncounterGroup[] {
  const groupMap = new Map<string, EncounterGroup>();

  for (const request of requests) {
    const encounterId = request.encounter_id || 'no-encounter';

    if (!groupMap.has(encounterId)) {
      groupMap.set(encounterId, {
        encounter_id: encounterId,
        patient: request.patient,
        doctor: request.doctor,
        encounter_date: request.created_at || new Date().toISOString(),
        requests: [],
        pending_count: 0,
        total_count: 0,
      });
    }

    const group = groupMap.get(encounterId)!;
    group.requests.push(request);
    group.total_count += 1;
    if (request.status === 'Pending') {
      group.pending_count += 1;
    }
  }

  // Sort by encounter date descending (most recent first)
  return Array.from(groupMap.values()).sort(
    (a, b) =>
      new Date(b.encounter_date).getTime() -
      new Date(a.encounter_date).getTime(),
  );
}

// =============================================================================
// Component
// =============================================================================

export default function EncounterApprovalModal({
  isOpen,
  onClose,
  encounterGroup,
}: EncounterApprovalModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { showToast } = useToast();

  const batchAcceptMutation = useBatchAcceptRadiologyRequests();
  const batchRejectMutation = useBatchRejectRadiologyRequests();

  // Get pending requests only
  const pendingRequests = useMemo(
    () => encounterGroup?.requests.filter((r) => r.status === 'Pending') || [],
    [encounterGroup],
  );

  const otherRequests = useMemo(
    () => encounterGroup?.requests.filter((r) => r.status !== 'Pending') || [],
    [encounterGroup],
  );

  // Check if all pending are selected
  const allSelected =
    pendingRequests.length > 0 &&
    pendingRequests.every((r) => selectedIds.has(r.request_id));

  const someSelected = selectedIds.size > 0;

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedIds(new Set());
    setRejectionReason('');
    setShowRejectDialog(false);
    onClose();
  };

  // Toggle single selection
  const toggleSelect = (requestId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map((r) => r.request_id)));
    }
  };

  // Handle batch approve
  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;

    const idsToApprove = Array.from(selectedIds);

    // Close immediately for instant feedback (optimistic update will handle the UI)
    handleClose();

    try {
      const result = await batchAcceptMutation.mutateAsync({
        request_ids: idsToApprove,
      });

      if (result.successful.length > 0) {
        showToast({
          type: 'success',
          title: 'Approved Successfully',
          message: `${result.successful.length} imaging request(s) approved and billing created`,
        });
      }

      if (result.failed.length > 0) {
        showToast({
          type: 'error',
          title: 'Some Failed',
          message: `${result.failed.length} request(s) failed to approve`,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to approve requests',
      });
    }
  };

  // Handle batch reject
  const handleRejectSelected = async () => {
    if (selectedIds.size === 0 || !rejectionReason.trim()) return;

    const idsToReject = Array.from(selectedIds);
    const reason = rejectionReason;

    // Close immediately for instant feedback (optimistic update will handle the UI)
    handleClose();

    try {
      const result = await batchRejectMutation.mutateAsync({
        request_ids: idsToReject,
        rejection_reason: reason,
      });

      if (result.successful.length > 0) {
        showToast({
          type: 'success',
          title: 'Rejected',
          message: `${result.successful.length} imaging request(s) rejected`,
        });
      }

      if (result.failed.length > 0) {
        showToast({
          type: 'error',
          title: 'Some Failed',
          message: `${result.failed.length} request(s) failed to reject`,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to reject requests',
      });
    }
  };

  if (!isOpen || !encounterGroup) return null;

  const isProcessing =
    batchAcceptMutation.isPending || batchRejectMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Imaging Request Approval
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select items to approve or reject
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Patient Info */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <span className="font-medium text-gray-900">
                {encounterGroup.patient
                  ? formatPatientName(encounterGroup.patient)
                  : 'Unknown Patient'}
              </span>
              {encounterGroup.patient && (
                <span className="text-gray-500">
                  ({encounterGroup.patient.gender},{' '}
                  {formatDetailedAge(encounterGroup.patient.date_of_birth)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-600">
                {new Date(encounterGroup.encounter_date).toLocaleDateString(
                  'en-GB',
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  },
                )}
              </span>
            </div>
            {encounterGroup.doctor && (
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                <span className="text-gray-600">
                  Dr. {encounterGroup.doctor.first_name}{' '}
                  {encounterGroup.doctor.last_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Pending Requests with Checkboxes */}
          {pendingRequests.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Pending Approval ({pendingRequests.length})
                </h3>
                {/* Select All */}
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  disabled={isProcessing}
                >
                  {allSelected ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2">
                {pendingRequests.map((request) => {
                  const isSelected = selectedIds.has(request.request_id);
                  return (
                    <div
                      key={request.request_id}
                      onClick={() =>
                        !isProcessing && toggleSelect(request.request_id)
                      }
                      className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-200'
                          : 'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare size={22} className="text-purple-600" />
                        ) : (
                          <Square size={22} className="text-gray-400" />
                        )}
                      </div>

                      {/* Request Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {request.imaging?.imaging_name || 'Unknown Imaging'}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-2">
                          {request.imaging?.imaging_type && (
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {request.imaging.imaging_type}
                            </span>
                          )}
                          {request.body_part && (
                            <span className="text-gray-400">
                              Body Part: {request.body_part}
                            </span>
                          )}
                        </div>
                        {request.clinical_indication && (
                          <div className="text-sm text-gray-600 mt-1 italic truncate">
                            &quot;{request.clinical_indication}&quot;
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <StatusBadge status={request.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Already Processed Requests */}
          {otherRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Already Processed ({otherRequests.length})
              </h3>
              <div className="space-y-2">
                {otherRequests.map((request) => (
                  <div
                    key={request.request_id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">
                        {request.imaging?.imaging_name || 'Unknown Imaging'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.imaging?.imaging_type}
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {encounterGroup.requests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No imaging requests found for this encounter.</p>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {someSelected && (
                <span className="font-medium text-purple-600">
                  {selectedIds.size} item(s) selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Close
              </Button>
              {someSelected && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isProcessing}
                  >
                    <X size={16} className="mr-1" />
                    Reject Selected
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApproveSelected}
                    disabled={isProcessing}
                  >
                    {batchAcceptMutation.isPending ? (
                      <Loader2 size={16} className="mr-1 animate-spin" />
                    ) : (
                      <Check size={16} className="mr-1" />
                    )}
                    Approve Selected ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Reason Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Selected Imaging Requests
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject {selectedIds.size} selected
              request(s)?
            </p>
            <label
              htmlFor="rejectReasonRadiology"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejectReasonRadiology"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                disabled={batchRejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectSelected}
                disabled={
                  !rejectionReason.trim() || batchRejectMutation.isPending
                }
              >
                {batchRejectMutation.isPending ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : null}
                Reject {selectedIds.size} Request(s)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
