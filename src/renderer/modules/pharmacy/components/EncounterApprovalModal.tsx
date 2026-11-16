import React, { useState, useMemo, useEffect } from 'react';
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
  AlertTriangle,
  PackageX,
} from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui';
import { PrescriptionDTO } from '../dtos/pharmacy.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import {
  useBatchAcceptPrescriptions,
  useBatchRejectPrescriptions,
} from '../hooks/usePharmacy';
import { useToast } from '../../../components/ui/Toast';
import {
  checkBatchDrugStockStatuses,
  DrugStockStatus,
} from '../api/pharmacy.api';

// =============================================================================
// Types
// =============================================================================

export interface EncounterGroup {
  encounter_id: string;
  patient: PrescriptionDTO['patient'];
  doctor: PrescriptionDTO['doctor'];
  encounter_date: string;
  prescriptions: PrescriptionDTO[];
  pending_count: number;
  total_count: number;
}

interface EncounterApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterGroup: EncounterGroup | null;
}

// =============================================================================
// Clinical Data Helpers
// =============================================================================

function parseDiagnosisList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Fall back to plain text handling.
    }

    return [trimmed];
  }

  return [];
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((v) => (v || '').trim()).filter(Boolean)),
  );
}

// =============================================================================
// Helper: Group Prescriptions by Encounter
// =============================================================================

export function groupPrescriptionsByEncounter(
  prescriptions: PrescriptionDTO[],
): EncounterGroup[] {
  const groupMap = new Map<string, EncounterGroup>();

  for (const prescription of prescriptions) {
    const encounterId = prescription.encounter_id || 'no-encounter';

    if (!groupMap.has(encounterId)) {
      groupMap.set(encounterId, {
        encounter_id: encounterId,
        patient: prescription.patient,
        doctor: prescription.doctor,
        encounter_date: prescription.created_at || new Date().toISOString(),
        prescriptions: [],
        pending_count: 0,
        total_count: 0,
      });
    }

    const group = groupMap.get(encounterId)!;
    group.prescriptions.push(prescription);
    group.total_count += 1;
    if (prescription.status === 'Pending') {
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
  const [stockStatuses, setStockStatuses] = useState<
    Map<string, DrugStockStatus>
  >(new Map());
  const [loadingStock, setLoadingStock] = useState(false);
  const { showToast } = useToast();

  const batchAcceptMutation = useBatchAcceptPrescriptions();
  const batchRejectMutation = useBatchRejectPrescriptions();

  // Fetch stock statuses when modal opens
  useEffect(() => {
    if (!encounterGroup?.prescriptions?.length) return;
    const drugIds = [
      ...new Set(
        encounterGroup.prescriptions
          .map((p) => p.drug_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (drugIds.length === 0) return;

    setLoadingStock(true);
    checkBatchDrugStockStatuses(drugIds)
      .then((statuses) => setStockStatuses(statuses))
      .catch((err) => console.error('Failed to check stock statuses:', err))
      .finally(() => setLoadingStock(false));
  }, [encounterGroup]);

  // Get pending prescriptions only
  const pendingPrescriptions = useMemo(
    () =>
      encounterGroup?.prescriptions.filter((p) => p.status === 'Pending') || [],
    [encounterGroup],
  );

  const otherPrescriptions = useMemo(
    () =>
      encounterGroup?.prescriptions.filter((p) => p.status !== 'Pending') || [],
    [encounterGroup],
  );

  const encounterClinicalSummary = useMemo(() => {
    const prescriptions = encounterGroup?.prescriptions || [];
    const diagnosisSet = new Set<string>();

    for (const prescription of prescriptions) {
      parseDiagnosisList((prescription as any).diagnosis).forEach(
        (diagnosis) => {
          diagnosisSet.add(diagnosis);
        },
      );
    }

    return {
      diagnoses: Array.from(diagnosisSet),
      notes: uniqueNonEmpty(
        prescriptions.map(
          (p) => ((p as any).clinical_notes as string | undefined) || null,
        ),
      ),
      instructions: uniqueNonEmpty(
        prescriptions.flatMap((p) => [p.instructions, p.special_instructions]),
      ),
    };
  }, [encounterGroup]);

  // Check if all pending are selected
  const allSelected =
    pendingPrescriptions.length > 0 &&
    pendingPrescriptions.every((p) => selectedIds.has(p.prescription_id));

  const someSelected = selectedIds.size > 0;

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedIds(new Set());
    setRejectionReason('');
    setShowRejectDialog(false);
    onClose();
  };

  // Toggle single selection - block out-of-stock and expired drugs
  const toggleSelect = (prescriptionId: string) => {
    // Find the prescription and check stock status
    const prescription = pendingPrescriptions.find(
      (p) => p.prescription_id === prescriptionId,
    );
    if (prescription?.drug_id) {
      const stockStatus = stockStatuses.get(prescription.drug_id);
      if (stockStatus?.is_out_of_stock) {
        showToast({
          type: 'error',
          title: 'Out of Stock',
          message: `"${stockStatus.drug_name}" is out of stock. Cannot approve.`,
        });
        return;
      }
      if (stockStatus?.is_expired) {
        showToast({
          type: 'error',
          title: 'Drug Expired',
          message: `"${stockStatus.drug_name}" has expired. Cannot approve.`,
        });
        return;
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(prescriptionId)) {
        next.delete(prescriptionId);
      } else {
        next.add(prescriptionId);
      }
      return next;
    });
  };

  // Toggle select all - skip out-of-stock and expired drugs
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const approvableIds = pendingPrescriptions
        .filter((p) => {
          if (!p.drug_id) return true;
          const status = stockStatuses.get(p.drug_id);
          return !status?.is_out_of_stock && !status?.is_expired;
        })
        .map((p) => p.prescription_id);
      if (approvableIds.length === 0) {
        showToast({
          type: 'error',
          title: 'Cannot Approve',
          message: 'All drugs are either out of stock or expired.',
        });
        return;
      }
      setSelectedIds(new Set(approvableIds));
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
        prescription_ids: idsToApprove,
      });

      if (result.successful.length > 0) {
        showToast({
          type: 'success',
          title: 'Approved Successfully',
          message: `${result.successful.length} prescription(s) approved and billing created`,
        });
      }

      if (result.failed.length > 0) {
        showToast({
          type: 'error',
          title: 'Some Failed',
          message: `${result.failed.length} prescription(s) failed to approve`,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to approve prescriptions',
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
        prescription_ids: idsToReject,
        rejection_reason: reason,
      });

      if (result.successful.length > 0) {
        showToast({
          type: 'success',
          title: 'Rejected',
          message: `${result.successful.length} prescription(s) rejected`,
        });
      }

      if (result.failed.length > 0) {
        showToast({
          type: 'error',
          title: 'Some Failed',
          message: `${result.failed.length} prescription(s) failed to reject`,
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to reject prescriptions',
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
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Prescription Approval
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

          {(encounterClinicalSummary.diagnoses.length > 0 ||
            encounterClinicalSummary.notes.length > 0 ||
            encounterClinicalSummary.instructions.length > 0) && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Clinical Context For This Encounter
              </p>

              {encounterClinicalSummary.diagnoses.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-900">
                    Diagnosis
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {encounterClinicalSummary.diagnoses
                      .slice(0, 5)
                      .map((diagnosis) => (
                        <span
                          key={diagnosis}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-white text-emerald-900 text-xs border border-emerald-200"
                        >
                          {diagnosis}
                        </span>
                      ))}
                    {encounterClinicalSummary.diagnoses.length > 5 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white text-emerald-700 text-xs border border-emerald-200">
                        +{encounterClinicalSummary.diagnoses.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {encounterClinicalSummary.notes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-900">
                    Consultant Notes
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5 line-clamp-2">
                    {encounterClinicalSummary.notes[0]}
                  </p>
                </div>
              )}

              {encounterClinicalSummary.instructions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-900">
                    Instructions
                  </p>
                  <p className="text-xs text-emerald-800 mt-0.5 line-clamp-2">
                    {encounterClinicalSummary.instructions[0]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Pending Prescriptions with Checkboxes */}
          {pendingPrescriptions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Pending Approval ({pendingPrescriptions.length})
                </h3>
                {/* Select All */}
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 font-medium"
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
                {pendingPrescriptions.map((prescription) => {
                  const isSelected = selectedIds.has(
                    prescription.prescription_id,
                  );
                  const stockStatus = prescription.drug_id
                    ? stockStatuses.get(prescription.drug_id)
                    : null;
                  const isOutOfStock = stockStatus?.is_out_of_stock || false;
                  const isExpired = stockStatus?.is_expired || false;
                  const isNearExpiry = stockStatus?.is_near_expiry || false;
                  const isBlocked = isOutOfStock || isExpired;
                  const diagnosisList = parseDiagnosisList(
                    (prescription as any).diagnosis,
                  );
                  const clinicalNotes =
                    ((prescription as any).clinical_notes as
                      | string
                      | undefined) || '';
                  const instructionList = uniqueNonEmpty([
                    prescription.instructions,
                    prescription.special_instructions,
                  ]);
                  const drugName =
                    prescription.drug?.drug_name ||
                    (prescription as any).drug_name ||
                    'Unknown Drug';

                  const drugDetails = uniqueNonEmpty([
                    prescription.drug?.drug_code,
                    prescription.drug?.generic_name,
                    prescription.drug?.brand_name,
                    prescription.drug?.strength,
                    prescription.drug?.dosage_form ||
                      prescription.drug?.formulation,
                    prescription.drug?.category,
                    prescription.drug?.drug_type,
                  ]);

                  return (
                    <div
                      key={prescription.prescription_id}
                      onClick={() =>
                        !isProcessing &&
                        !isBlocked &&
                        toggleSelect(prescription.prescription_id)
                      }
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isBlocked
                          ? 'bg-red-50 border-red-300 cursor-not-allowed opacity-75'
                          : isSelected
                            ? 'bg-green-50 border-green-300 ring-1 ring-green-200 cursor-pointer'
                            : isNearExpiry
                              ? 'bg-amber-50 border-amber-200 hover:border-amber-300 cursor-pointer'
                              : 'bg-yellow-50 border-yellow-200 hover:border-yellow-300 cursor-pointer'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        {isBlocked ? (
                          <PackageX size={22} className="text-red-500" />
                        ) : isSelected ? (
                          <CheckSquare size={22} className="text-green-600" />
                        ) : (
                          <Square size={22} className="text-gray-400" />
                        )}
                      </div>

                      {/* Prescription Info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {drugName}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Rx ID:{' '}
                              {prescription.prescription_id
                                .slice(0, 8)
                                .toUpperCase()}
                            </div>
                          </div>
                          <StatusBadge status={prescription.status} />
                        </div>

                        {/* Stock/Expiry Warnings */}
                        {isOutOfStock && (
                          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded w-fit">
                            <AlertTriangle size={12} />
                            OUT OF STOCK — Cannot approve
                          </div>
                        )}
                        {isExpired && !isOutOfStock && (
                          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded w-fit">
                            <AlertTriangle size={12} />
                            EXPIRED — Cannot approve
                          </div>
                        )}
                        {isNearExpiry &&
                          !isExpired &&
                          !isOutOfStock &&
                          stockStatus?.days_to_nearest_expiry != null && (
                            <div className="flex items-center gap-1 mt-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded w-fit">
                              <AlertCircle size={12} />
                              Expires in {
                                stockStatus.days_to_nearest_expiry
                              }{' '}
                              day(s)
                            </div>
                          )}
                        {stockStatus && !isOutOfStock && !isExpired && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Stock: {stockStatus.stock_quantity} available
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="rounded-md border border-gray-200 bg-white/80 p-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                              Diagnosis / Indication
                            </p>
                            {diagnosisList.length > 0 ? (
                              <ul className="mt-1 text-xs text-gray-800 space-y-0.5 list-disc list-inside">
                                {diagnosisList.slice(0, 3).map((diagnosis) => (
                                  <li key={diagnosis}>{diagnosis}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-xs text-gray-500">
                                No diagnosis provided
                              </p>
                            )}
                            {clinicalNotes && (
                              <p className="mt-1.5 text-xs text-gray-700">
                                <span className="font-medium text-gray-800">
                                  Clinical notes:
                                </span>{' '}
                                {clinicalNotes}
                              </p>
                            )}
                          </div>

                          <div className="rounded-md border border-gray-200 bg-white/80 p-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                              Dosage & Duration
                            </p>
                            <div className="mt-1 text-xs text-gray-800 space-y-0.5">
                              <p>
                                <span className="font-medium">Dosage:</span>{' '}
                                {prescription.dosage || 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Frequency:</span>{' '}
                                {prescription.frequency || 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Duration:</span>{' '}
                                {prescription.duration || 'N/A'}
                              </p>
                              <p>
                                <span className="font-medium">Route:</span>{' '}
                                {prescription.route || 'Not specified'}
                              </p>
                              <p>
                                <span className="font-medium">
                                  Quantity requested:
                                </span>{' '}
                                {prescription.quantity_prescribed}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-md border border-gray-200 bg-white/80 p-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                              Consultant Instructions
                            </p>
                            {instructionList.length > 0 ? (
                              <ul className="mt-1 text-xs text-gray-800 space-y-0.5 list-disc list-inside">
                                {instructionList.map((instruction) => (
                                  <li key={instruction}>{instruction}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-xs text-gray-500">
                                No additional instructions
                              </p>
                            )}
                          </div>

                          <div className="rounded-md border border-gray-200 bg-white/80 p-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                              Drug Details
                            </p>
                            <p className="mt-1 text-xs text-gray-800 font-medium">
                              {drugName}
                            </p>
                            {drugDetails.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {drugDetails.map((detail) => (
                                  <span
                                    key={detail}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-[11px] text-gray-700"
                                  >
                                    {detail}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-gray-500">
                                No extra drug metadata
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Already Processed Prescriptions */}
          {otherPrescriptions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Already Processed ({otherPrescriptions.length})
              </h3>
              <div className="space-y-2">
                {otherPrescriptions.map((prescription) => (
                  <div
                    key={prescription.prescription_id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">
                        {prescription.drug?.drug_name ||
                          (prescription as any).drug_name ||
                          'Unknown Drug'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Qty: {prescription.quantity_prescribed}
                      </div>
                    </div>
                    <StatusBadge status={prescription.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {encounterGroup.prescriptions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No prescriptions found for this encounter.</p>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {someSelected && (
                <span className="font-medium text-green-600">
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
              Reject Selected Prescriptions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject {selectedIds.size} selected
              prescription(s)?
            </p>
            <label
              htmlFor="rejectReasonPharmacy"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejectReasonPharmacy"
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
                Reject {selectedIds.size} Prescription(s)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
