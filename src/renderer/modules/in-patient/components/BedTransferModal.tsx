// =============================================================================
// XENOCARE EMR - Bed Transfer Modal
// Transfer a patient to a different bed/ward
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Building2,
  Bed,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { WardBedSelector } from '../../clinical-requests/components/WardBedSelector';
import { useTransferPatient } from '../hooks/useTransfers';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import type {
  AdmissionWithDetails,
  ActiveAdmissionView,
} from '../../../types/database.types';

interface BedTransferModalProps {
  admission: AdmissionWithDetails | ActiveAdmissionView | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Helper to check if admission is ActiveAdmissionView type
const isActiveAdmissionView = (
  admission: AdmissionWithDetails | ActiveAdmissionView,
): admission is ActiveAdmissionView => {
  return 'admission_id' in admission;
};

export const BedTransferModal: React.FC<BedTransferModalProps> = ({
  admission,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [transferReason, setTransferReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const transferMutation = useTransferPatient();
  const { showToast } = useToast();
  const { staff } = useAuth();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedWardId('');
      setSelectedBedId('');
      setSelectedBed(null);
      setSelectedWard(null);
      setTransferReason('');
      setNotes('');
    }
  }, [isOpen]);

  if (!admission) return null;

  const isView = isActiveAdmissionView(admission);

  // Handle both AdmissionWithDetails and ActiveAdmissionView types
  const patientName = isView
    ? `${admission.first_name} ${admission.last_name}`
    : admission.patient
      ? `${admission.patient.first_name} ${admission.patient.surname}`
      : 'Unknown Patient';

  const currentWardName = isView
    ? admission.ward_name || 'N/A'
    : admission.current_ward?.name || 'N/A';

  const currentBedNumber = isView
    ? admission.bed_number || 'N/A'
    : admission.current_bed?.bed_number || 'N/A';

  const admissionId = isView ? admission.admission_id : admission.id;

  // Get current ward ID for comparison (to detect inter-ward transfers)
  const currentWardId = isView
    ? (admission as any).ward_id || ''
    : admission.current_ward_id || '';

  // Get facility ID from auth context
  const facilityId = staff?.facility_id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWardId || !selectedBedId) {
      showToast({
        type: 'error',
        title: 'Selection Required',
        message: 'Please select a ward and bed for the transfer',
      });
      return;
    }

    if (!transferReason) {
      showToast({
        type: 'error',
        title: 'Reason Required',
        message: 'Please provide a reason for the transfer',
      });
      return;
    }

    try {
      // Note: createBedTransfer fetches the current ward/bed from the admission record
      await transferMutation.mutateAsync({
        admission_id: admissionId,
        to_ward_id: selectedWardId,
        to_bed_id: selectedBedId,
        transfer_reason: transferReason,
        notes: notes || undefined,
      });

      showToast({
        type: 'success',
        title: 'Transfer Successful',
        message: `Patient transferred to ${selectedWard?.name || 'new ward'}, Bed ${selectedBed?.bed_number || 'new bed'}`,
      });

      onClose();
      onSuccess?.();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Transfer Failed',
        message: error.message || 'Failed to transfer patient',
      });
    }
  };

  const transferReasons = [
    'clinical_upgrade',
    'clinical_downgrade',
    'bed_availability',
    'patient_request',
    'isolation_required',
    'isolation_cleared',
    'procedure',
    'surgery',
    'discharge_preparation',
    'other',
  ];

  const formatReasonLabel = (reason: string) => {
    return reason
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Transfer Patient
              </h2>
              <p className="text-sm text-gray-500">{patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Location */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Current Location
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Ward</p>
                  <p className="text-sm font-medium text-gray-900">
                    {currentWardName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Bed</p>
                  <p className="text-sm font-medium text-gray-900">
                    {currentBedNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          {/* New Location Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-600" />
              Select New Location
            </h3>
            <WardBedSelector
              facilityId={facilityId}
              selectedWardId={selectedWardId}
              selectedBedId={selectedBedId}
              onWardSelect={(wardId, ward) => {
                setSelectedWardId(wardId);
                setSelectedWard(ward);
                setSelectedBedId('');
                setSelectedBed(null);
              }}
              onBedSelect={(bedId, bed) => {
                setSelectedBedId(bedId);
                setSelectedBed(bed);
              }}
              required
            />
          </div>

          {/* Transfer Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Transfer <span className="text-red-500">*</span>
            </label>
            <select
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select reason...</option>
              {transferReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {formatReasonLabel(reason)}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information about this transfer..."
            />
          </div>

          {/* Warning */}
          {selectedBedId && selectedWardId !== currentWardId && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Inter-ward Transfer
                </p>
                <p className="text-xs text-amber-600">
                  This patient will be transferred to a different ward. Ensure
                  all care handover procedures are followed.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={transferMutation.isPending}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                transferMutation.isPending ||
                !selectedWardId ||
                !selectedBedId ||
                !transferReason
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Transfer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default BedTransferModal;
