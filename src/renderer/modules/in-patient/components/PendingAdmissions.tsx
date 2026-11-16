/**
 * Pending Admissions Component
 * ============================
 * Shows pending admission requests from doctors with bed selection for confirmation.
 * Simplified workflow: Doctor already selected ward, staff only needs to assign bed.
 */

import React, { useState, useMemo } from 'react';
import {
  Bed,
  User,
  Calendar,
  AlertTriangle,
  Clock,
  Stethoscope,
  X,
  Check,
  Loader2,
  Building2,
} from 'lucide-react';
import { SkeletonList, Skeleton } from '../../../components/ui/SkeletonLoader';
import { Button } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import {
  usePendingAdmissionRequests,
  useConfirmAdmissionRequest,
} from '../hooks/useAdmissions';
import { useAvailableBeds } from '../hooks/useBeds';
import type { PendingAdmissionRequest } from '../api/admissions.api';

// =============================================================================
// Types
// =============================================================================

interface BedSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PendingAdmissionRequest | null;
  onConfirm: (bedId: string) => void;
  isConfirming: boolean;
}

// =============================================================================
// Bed Selection Modal
// =============================================================================

function BedSelectionModal({
  isOpen,
  onClose,
  request,
  onConfirm,
  isConfirming,
}: BedSelectionModalProps) {
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const { data: beds = [], isLoading: bedsLoading } = useAvailableBeds(
    request?.target_ward_id || '',
  );

  const handleConfirm = () => {
    if (selectedBedId) {
      onConfirm(selectedBedId);
    }
  };

  const handleClose = () => {
    setSelectedBedId('');
    onClose();
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Bed className="w-6 h-6 text-blue-600" />
                Assign Bed for Admission
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select an available bed in{' '}
                {request.target_ward_name || 'the ward'}
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
              <span className="font-medium">{request.patient_name}</span>
              <span className="text-sm text-gray-500">
                ({request.emr_number})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {request.requesting_doctor_name}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
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
          <div className="mt-2 text-sm text-gray-600">
            <strong>Diagnosis:</strong> {request.clinical_reason}
          </div>
        </div>

        {/* Bed Selection */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Available Beds in {request.target_ward_name || 'Ward'}
          </h3>

          {bedsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200">
                  <Skeleton className="w-5 h-5 mx-auto mb-1" rounded="full" />
                  <Skeleton className="h-4 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-8 mx-auto" />
                </div>
              ))}
            </div>
          ) : beds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bed className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No available beds in this ward</p>
              <p className="text-sm mt-1">
                Please try a different ward or wait for a bed to become
                available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {beds.map((bed) => (
                <button
                  key={bed.id}
                  onClick={() => setSelectedBedId(bed.id)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all
                    ${
                      selectedBedId === bed.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }
                  `}
                >
                  <Bed className="w-5 h-5 mx-auto mb-1" />
                  <div className="font-medium text-sm">{bed.bed_number}</div>
                  <div className="text-xs text-gray-500">{bed.bed_type}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBedId || isConfirming}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Confirming...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Confirm Admission
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function PendingAdmissions() {
  const { staff } = useAuth();
  const { showToast } = useToast();
  const [selectedRequest, setSelectedRequest] =
    useState<PendingAdmissionRequest | null>(null);
  const [showBedModal, setShowBedModal] = useState(false);

  const { data: pendingRequests = [], isLoading } =
    usePendingAdmissionRequests();
  const confirmMutation = useConfirmAdmissionRequest();

  // Group by urgency
  const groupedRequests = useMemo(() => {
    const emergency = pendingRequests.filter((r) => r.urgency === 'Emergency');
    const urgent = pendingRequests.filter((r) => r.urgency === 'Urgent');
    const routine = pendingRequests.filter((r) => r.urgency === 'Routine');
    return { emergency, urgent, routine };
  }, [pendingRequests]);

  const handleSelectRequest = (request: PendingAdmissionRequest) => {
    setSelectedRequest(request);
    setShowBedModal(true);
  };

  const handleConfirmAdmission = async (bedId: string) => {
    if (!selectedRequest || !staff?.id) return;

    // Close modal immediately for instant feedback
    setShowBedModal(false);
    const request = selectedRequest;
    setSelectedRequest(null);

    try {
      await confirmMutation.mutateAsync({
        request_id: request.id,
        patient_id: request.patient_id,
        encounter_id: request.encounter_id,
        facility_id: staff.facility_id || '',
        ward_id: request.target_ward_id || '',
        bed_id: bedId,
        admission_type: (request.admission_type?.toLowerCase() ||
          'elective') as any,
        admitting_diagnosis: request.clinical_reason,
        level_of_care: request.level_of_care,
        special_requirements: request.special_requirements,
        notes: request.notes,
        confirmed_by: staff.id,
      });

      showToast({
        type: 'success',
        title: 'Admission Confirmed',
        message: `${request.patient_name} has been admitted successfully`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to confirm admission',
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const renderRequestCard = (request: PendingAdmissionRequest) => (
    <div
      key={request.id}
      onClick={() => handleSelectRequest(request)}
      className={`
        bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md
        ${
          request.urgency === 'Emergency'
            ? 'border-l-4 border-l-red-500 hover:border-red-300'
            : request.urgency === 'Urgent'
              ? 'border-l-4 border-l-orange-500 hover:border-orange-300'
              : 'border-gray-200 hover:border-blue-300'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              request.urgency === 'Emergency'
                ? 'bg-red-100'
                : request.urgency === 'Urgent'
                  ? 'bg-orange-100'
                  : 'bg-blue-100'
            }`}
          >
            <User
              className={`w-5 h-5 ${
                request.urgency === 'Emergency'
                  ? 'text-red-600'
                  : request.urgency === 'Urgent'
                    ? 'text-orange-600'
                    : 'text-blue-600'
              }`}
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">
              {request.patient_name}
            </h4>
            <p className="text-sm text-gray-500">{request.emr_number}</p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              request.urgency === 'Emergency'
                ? 'bg-red-100 text-red-700'
                : request.urgency === 'Urgent'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {request.urgency}
          </span>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeAgo(request.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-700 line-clamp-2">
          {request.clinical_reason}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Stethoscope className="w-3 h-3" />
            {request.requesting_doctor_name}
          </span>
          {request.target_ward_name && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {request.target_ward_name}
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
            {request.admission_type}
          </span>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <SkeletonList count={5} hasAction={false} />;
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-12">
        <Bed className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700">
          No Pending Admissions
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          All admission requests have been processed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Requests */}
      {groupedRequests.emergency.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
            <AlertTriangle className="w-4 h-4" />
            Emergency Admissions ({groupedRequests.emergency.length})
          </h3>
          <div className="grid gap-3">
            {groupedRequests.emergency.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* Urgent Requests */}
      {groupedRequests.urgent.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-700 mb-3">
            <Clock className="w-4 h-4" />
            Urgent Admissions ({groupedRequests.urgent.length})
          </h3>
          <div className="grid gap-3">
            {groupedRequests.urgent.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* Routine Requests */}
      {groupedRequests.routine.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Calendar className="w-4 h-4" />
            Routine Admissions ({groupedRequests.routine.length})
          </h3>
          <div className="grid gap-3">
            {groupedRequests.routine.map(renderRequestCard)}
          </div>
        </div>
      )}

      {/* Bed Selection Modal */}
      <BedSelectionModal
        isOpen={showBedModal}
        onClose={() => {
          setShowBedModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onConfirm={handleConfirmAdmission}
        isConfirming={confirmMutation.isPending}
      />
    </div>
  );
}
