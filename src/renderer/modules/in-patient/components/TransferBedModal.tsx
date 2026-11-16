// =============================================================================
// NDC MEDICAL CENTRE EMR - Bed Transfer Modal
// Modal for transferring a patient to a different bed/ward
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Building2,
  Bed,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useWards } from '../hooks/useWards';
import { useBedsByWard } from '../hooks/useBeds';
import { useTransferPatient } from '../hooks/useTransfers';
import type {
  AdmissionWithDetails,
  Bed as BedType,
} from '../../../types/database.types';

interface TransferBedModalProps {
  admission: AdmissionWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

const TransferBedModal: React.FC<TransferBedModalProps> = ({
  admission,
  onClose,
  onSuccess,
}) => {
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: wards, isLoading: wardsLoading } = useWards();
  const { data: beds, isLoading: bedsLoading } = useBedsByWard(selectedWardId);
  const transferPatient = useTransferPatient();

  // Filter for available beds (case-insensitive check)
  const availableBeds = beds?.filter(
    (bed) => bed.status?.toLowerCase() === 'available',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWardId || !selectedBedId || !reason) return;

    try {
      await transferPatient.mutateAsync({
        admission_id: admission.id,
        from_ward_id: admission.current_ward_id || '',
        from_bed_id: admission.current_bed_id || '',
        to_ward_id: selectedWardId,
        to_bed_id: selectedBedId,
        reason: reason as any, // Type assertion needed as reasons might vary
        notes,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to transfer patient:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Transfer Patient
              </h2>
              <p className="text-sm text-gray-500">
                {admission.patient?.first_name} {admission.patient?.surname}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form
            id="transfer-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Current Location */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Current Location
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {admission.current_ward?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Bed className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {admission.current_bed?.bed_number || 'No Bed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Ward */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transfer to Ward
              </label>
              <select
                value={selectedWardId}
                onChange={(e) => {
                  setSelectedWardId(e.target.value);
                  setSelectedBedId(''); // Reset bed when ward changes
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Ward</option>
                {wards?.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name} ({ward.ward_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Bed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Bed
              </label>
              <select
                value={selectedBedId}
                onChange={(e) => setSelectedBedId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!selectedWardId}
              >
                <option value="">Select Bed</option>
                {availableBeds?.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.bed_number} ({bed.bed_type})
                  </option>
                ))}
              </select>
              {selectedWardId &&
                (!availableBeds || availableBeds.length === 0) &&
                !bedsLoading && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    No available beds in this ward
                  </p>
                )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Transfer
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Reason</option>
                <option value="clinical_upgrade">
                  Clinical Deterioration (Upgrade Care)
                </option>
                <option value="clinical_downgrade">
                  Clinical Improvement (Downgrade Care)
                </option>
                <option value="isolation_required">Isolation Required</option>
                <option value="patient_request">Patient Request</option>
                <option value="bed_availability">
                  Bed Availability / Ward Closure
                </option>
                <option value="procedure">Procedure / Surgery</option>
                <option value="discharge_preparation">
                  Discharge Preparation
                </option>
                <option value="other">Other / Administrative</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional details about the transfer..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="transfer-form"
            disabled={
              transferPatient.isPending ||
              !selectedWardId ||
              !selectedBedId ||
              !reason
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transferPatient.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                Confirm Transfer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferBedModal;
