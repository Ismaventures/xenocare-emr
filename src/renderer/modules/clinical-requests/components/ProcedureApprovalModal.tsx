/**
 * Procedure Approval Modal
 * ========================
 * Modal for batch approving/rejecting procedure requests grouped by encounter.
 * Uses checklist UI with select all and optimistic updates for instant feedback.
 */

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
  Stethoscope,
} from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui';
import {
  RejectionReasonSelect,
  validateRejection,
  getFormattedRejectionReason,
} from '../../../components/ui/RejectionReasonSelect';
import { ClinicalRequestWithDetailsDTO } from '../dtos/clinical-request.dto';
import {
  useBatchApproveProcedureRequests,
  useBatchRejectProcedureRequests,
} from '../hooks/useClinicalRequests';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// =============================================================================
// Types
// =============================================================================

export interface ProcedureEncounterGroup {
  encounter_id: string;
  patient_name: string;
  patient_id: string;
  emr_number: string;
  doctor_name: string;
  encounter_date: string;
  requests: ClinicalRequestWithDetailsDTO[];
  pending_count: number;
  total_count: number;
}

interface ProcedureApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterGroup: ProcedureEncounterGroup | null;
}

// =============================================================================
// Component
// =============================================================================

export default function ProcedureApprovalModal({
  isOpen,
  onClose,
  encounterGroup,
}: ProcedureApprovalModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectionReasonCode, setRejectionReasonCode] = useState('');
  const [rejectionExplanation, setRejectionExplanation] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { showToast } = useToast();
  const { staff } = useAuth();

  const batchApproveMutation = useBatchApproveProcedureRequests();
  const batchRejectMutation = useBatchRejectProcedureRequests();

  // Get pending requests only (Pending or Under_Review)
  const pendingRequests = useMemo(
    () =>
      encounterGroup?.requests.filter(
        (r) => r.status === 'Pending' || r.status === 'Under_Review',
      ) || [],
    [encounterGroup],
  );

  const otherRequests = useMemo(
    () =>
      encounterGroup?.requests.filter(
        (r) => r.status !== 'Pending' && r.status !== 'Under_Review',
      ) || [],
    [encounterGroup],
  );

  // Check if all pending are selected
  const allSelected =
    pendingRequests.length > 0 &&
    pendingRequests.every((r) => selectedIds.has(r.id));

  const someSelected = selectedIds.size > 0;

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedIds(new Set());
    setRejectionReasonCode('');
    setRejectionExplanation('');
    setRejectionError('');
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
      setSelectedIds(new Set(pendingRequests.map((r) => r.id)));
    }
  };

  // Handle batch approve
  const handleApproveSelected = async () => {
    if (selectedIds.size === 0 || !staff?.id) return;

    const idsToApprove = Array.from(selectedIds);

    // Close immediately for instant feedback (optimistic update will handle the UI)
    handleClose();

    try {
      const result = await batchApproveMutation.mutateAsync({
        request_ids: idsToApprove,
        approved_by: staff.id,
      });

      if (result.successful.length > 0) {
        showToast({
          type: 'success',
          title: 'Approved Successfully',
          message: `${result.successful.length} procedure request(s) approved and billing created`,
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
    // Validate rejection reason
    const validationError = validateRejection(
      rejectionReasonCode,
      rejectionExplanation,
    );
    if (validationError) {
      setRejectionError(validationError);
      return;
    }

    if (selectedIds.size === 0 || !staff?.id) return;

    const idsToReject = Array.from(selectedIds);
    const formattedReason = getFormattedRejectionReason(
      rejectionReasonCode,
      rejectionExplanation,
    );

    // Close immediately for instant feedback (optimistic update will handle the UI)
    handleClose();

    try {
      const result = await batchRejectMutation.mutateAsync({
        request_ids: idsToReject,
        reviewed_by: staff.id,
        rejection_reason: formattedReason,
      });

      if (result.successful.length > 0) {
        showToast({
          type: 'success',
          title: 'Rejected',
          message: `${result.successful.length} procedure request(s) rejected`,
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
    batchApproveMutation.isPending || batchRejectMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-6 h-6 text-purple-600" />
                Procedure Approval
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve procedure requests for this encounter
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Patient Info */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{encounterGroup.patient_name}</span>
              <span className="text-sm text-gray-500">
                ({encounterGroup.emr_number})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {new Date(encounterGroup.encounter_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {encounterGroup.doctor_name}
              </span>
            </div>
          </div>
        </div>

        {/* Select All Header */}
        {pendingRequests.length > 0 && (
          <div className="px-6 py-3 border-b bg-purple-50 flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-900"
            >
              {allSelected ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              {allSelected ? 'Deselect All' : 'Select All'} (
              {pendingRequests.length} pending)
            </button>
            {someSelected && (
              <span className="text-sm text-purple-600">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        )}

        {/* Request List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Pending Requests */}
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => toggleSelect(request.id)}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all
                ${
                  selectedIds.has(request.id)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {selectedIds.has(request.id) ? (
                    <CheckSquare className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {request.procedure_name || request.request_type}
                    </span>
                    <StatusBadge status="Pending" variant="warning" />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {request.clinical_reason}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Request #: {request.request_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        request.urgency === 'Emergency'
                          ? 'bg-red-100 text-red-700'
                          : request.urgency === 'Urgent'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {request.urgency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Other (non-pending) Requests */}
          {otherRequests.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <h4 className="text-sm font-medium text-gray-500">
                  Previously Processed
                </h4>
              </div>
              {otherRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Check className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">
                          {request.procedure_name || request.request_type}
                        </span>
                        <StatusBadge
                          status={request.status}
                          variant={
                            request.status === 'Approved' ||
                            request.status === 'Completed'
                              ? 'success'
                              : request.status === 'Rejected'
                                ? 'danger'
                                : 'neutral'
                          }
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {request.clinical_reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {pendingRequests.length === 0 && otherRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No procedure requests found for this encounter</p>
            </div>
          )}
        </div>

        {/* Rejection Dialog */}
        {showRejectDialog && (
          <div className="px-6 py-4 border-t bg-red-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Rejection Reason <span className="text-red-500">*</span>
            </label>
            <RejectionReasonSelect
              value={rejectionReasonCode}
              explanation={rejectionExplanation}
              onChange={(code, explanation) => {
                setRejectionReasonCode(code);
                setRejectionExplanation(explanation);
                setRejectionError('');
              }}
              requestType="procedure"
              error={rejectionError}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReasonCode('');
                  setRejectionExplanation('');
                  setRejectionError('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRejectSelected}
                disabled={!rejectionReasonCode || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showRejectDialog && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                disabled={!someSelected || isProcessing}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Reject Selected
              </Button>
              <Button
                onClick={handleApproveSelected}
                disabled={!someSelected || isProcessing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Approve Selected ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
