import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Pill,
  CheckCircle,
  AlertCircle,
  CheckSquare,
  Square,
  Loader2,
  AlertTriangle,
  PackageX,
} from 'lucide-react';
import { Button, StatusBadge } from '../../../components/ui';
import {
  PrescriptionDTO,
  getPrescriptionStatusColor,
  PrescriptionStatus,
} from '../dtos/pharmacy.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import { DispenseEncounterGroup } from './ReadyToDispenseList';
import { PaymentStatusDot } from '../../../components/workflow';
import { PaymentStatusMap } from '../../billing/hooks/useBillingOrders';
import {
  checkBatchDrugStockStatuses,
  DrugStockStatus,
} from '../api/pharmacy.api';
import { useToast } from '../../../components/ui/Toast';

// =============================================================================
// Types
// =============================================================================

export interface DispenseItem {
  prescription: PrescriptionDTO;
  quantity: number;
}

interface EncounterDispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterGroup: DispenseEncounterGroup | null;
  onDispenseAll: (items: DispenseItem[]) => Promise<void>;
  isDispensing?: boolean;
  paymentStatusMap?: PaymentStatusMap;
}

// =============================================================================
// Component
// =============================================================================

export default function EncounterDispenseModal({
  isOpen,
  onClose,
  encounterGroup,
  onDispenseAll,
  isDispensing = false,
  paymentStatusMap = {},
}: EncounterDispenseModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stockStatuses, setStockStatuses] = useState<
    Map<string, DrugStockStatus>
  >(new Map());
  const [loadingStock, setLoadingStock] = useState(false);
  const { showToast } = useToast();

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

  // Get prescriptions that can be dispensed (Pending, Accepted, or Partial)
  const dispensablePrescriptions = useMemo(
    () =>
      encounterGroup?.prescriptions.filter(
        (p) =>
          p.status === 'Pending' ||
          p.status === 'Accepted' ||
          p.status === 'Partial',
      ) || [],
    [encounterGroup],
  );

  const dispensedPrescriptions = useMemo(
    () =>
      encounterGroup?.prescriptions.filter((p) => p.status === 'Dispensed') ||
      [],
    [encounterGroup],
  );

  // Check if all dispensable are selected
  const allSelected =
    dispensablePrescriptions.length > 0 &&
    dispensablePrescriptions.every((p) => selectedIds.has(p.prescription_id));

  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      // Skip out-of-stock and expired drugs
      const dispensableIds = dispensablePrescriptions
        .filter((p) => {
          if (!p.drug_id) return true;
          const status = stockStatuses.get(p.drug_id);
          return !status?.is_out_of_stock && !status?.is_expired;
        })
        .map((p) => p.prescription_id);
      if (dispensableIds.length === 0) {
        showToast({
          type: 'error',
          title: 'Cannot Dispense',
          message: 'All drugs are either out of stock or expired.',
        });
        return;
      }
      setSelectedIds(new Set(dispensableIds));
    }
  };

  const toggleSelect = (id: string) => {
    // Check stock/expiry status
    const prescription = dispensablePrescriptions.find(
      (p) => p.prescription_id === id,
    );
    if (prescription?.drug_id) {
      const status = stockStatuses.get(prescription.drug_id);
      if (status?.is_out_of_stock) {
        showToast({
          type: 'error',
          title: 'Out of Stock',
          message: `"${status.drug_name}" is out of stock. Cannot dispense.`,
        });
        return;
      }
      if (status?.is_expired) {
        showToast({
          type: 'error',
          title: 'Drug Expired',
          message: `"${status.drug_name}" has expired. Cannot dispense expired drugs.`,
        });
        return;
      }
    }
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Dispense ALL prescriptions at once (one-click) - skip out-of-stock/expired
  const handleDispenseAll = async () => {
    if (dispensablePrescriptions.length === 0) return;

    // Filter out blocked drugs
    const safeToDispense = dispensablePrescriptions.filter((p) => {
      if (!p.drug_id) return true;
      const status = stockStatuses.get(p.drug_id);
      return !status?.is_out_of_stock && !status?.is_expired;
    });

    if (safeToDispense.length === 0) {
      showToast({
        type: 'error',
        title: 'Cannot Dispense',
        message:
          'All drugs are either out of stock or expired. None can be dispensed.',
      });
      return;
    }

    const blockedCount =
      dispensablePrescriptions.length - safeToDispense.length;
    if (blockedCount > 0) {
      showToast({
        type: 'warning',
        title: 'Some Skipped',
        message: `${blockedCount} item(s) skipped due to out-of-stock or expiry.`,
      });
    }

    // Build dispense items with default quantities (remaining amount)
    const dispenseItems: DispenseItem[] = safeToDispense.map((p) => ({
      prescription: p,
      quantity: p.quantity_prescribed - (p.quantity_dispensed || 0),
    }));

    // Call parent to dispense all at once
    await onDispenseAll(dispenseItems);
  };

  // Dispense only selected prescriptions
  const handleDispenseSelected = async () => {
    const toDispense = dispensablePrescriptions.filter((p) =>
      selectedIds.has(p.prescription_id),
    );

    if (toDispense.length === 0) return;

    // Double-check: filter out any blocked drugs that slipped through
    const safeToDispense = toDispense.filter((p) => {
      if (!p.drug_id) return true;
      const status = stockStatuses.get(p.drug_id);
      return !status?.is_out_of_stock && !status?.is_expired;
    });

    if (safeToDispense.length === 0) {
      showToast({
        type: 'error',
        title: 'Cannot Dispense',
        message: 'Selected drugs are out of stock or expired.',
      });
      return;
    }

    // Build dispense items with default quantities (remaining amount)
    const dispenseItems: DispenseItem[] = safeToDispense.map((p) => ({
      prescription: p,
      quantity: p.quantity_prescribed - (p.quantity_dispensed || 0),
    }));

    // Call parent to dispense all at once
    await onDispenseAll(dispenseItems);

    // Clear selection after dispensing
    setSelectedIds(new Set());
  };

  if (!isOpen || !encounterGroup) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Pill size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Dispense Medications
                </h2>
                <p className="text-sm text-gray-500">
                  {encounterGroup.patient
                    ? formatPatientName(encounterGroup.patient)
                    : 'Unknown Patient'}
                  {encounterGroup.patient && (
                    <span className="ml-2">
                      • {encounterGroup.patient.gender} •{' '}
                      {formatDetailedAge(encounterGroup.patient.date_of_birth)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {/* Encounter Info */}
            <div className="flex items-center gap-4 text-sm mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                {new Date(encounterGroup.encounter_date).toLocaleDateString(
                  'en-GB',
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  },
                )}
              </div>
              {encounterGroup.doctor && (
                <div className="flex items-center gap-1 text-gray-600">
                  <User size={14} className="text-gray-400" />
                  Dr. {encounterGroup.doctor.first_name}{' '}
                  {encounterGroup.doctor.last_name}
                </div>
              )}
            </div>

            {/* Quick Dispense All Button */}
            {dispensablePrescriptions.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-green-900">
                      {dispensablePrescriptions.length} medication(s) ready to
                      dispense
                    </h3>
                    <p className="text-sm text-green-700">
                      Click to dispense all medications at once
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleDispenseAll}
                    disabled={isDispensing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isDispensing ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Dispensing All...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} className="mr-2" />
                        Dispense All ({dispensablePrescriptions.length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Select All for Dispensable (for partial selection) */}
            {dispensablePrescriptions.length > 1 && (
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors"
                  disabled={isDispensing}
                >
                  {allSelected ? (
                    <CheckSquare size={18} className="text-green-600" />
                  ) : (
                    <Square size={18} />
                  )}
                  <span>
                    {allSelected ? 'Deselect All' : 'Select individual items'}
                  </span>
                </button>
                {someSelected && !allSelected && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDispenseSelected}
                    disabled={isDispensing}
                  >
                    {isDispensing ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-1" />
                        Dispensing...
                      </>
                    ) : (
                      <>Dispense Selected ({selectedIds.size})</>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Dispensable Prescriptions */}
            {dispensablePrescriptions.length > 0 && (
              <div className="space-y-3 mb-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  Pending Dispense ({dispensablePrescriptions.length})
                </h3>
                {dispensablePrescriptions.map((prescription) => {
                  const paymentInfo =
                    paymentStatusMap[prescription.prescription_id];
                  const isSelected = selectedIds.has(
                    prescription.prescription_id,
                  );
                  const remainingQty =
                    prescription.quantity_prescribed -
                    (prescription.quantity_dispensed || 0);
                  const stockStatus = prescription.drug_id
                    ? stockStatuses.get(prescription.drug_id)
                    : null;
                  const isOutOfStock = stockStatus?.is_out_of_stock || false;
                  const isExpired = stockStatus?.is_expired || false;
                  const isNearExpiry = stockStatus?.is_near_expiry || false;
                  const isBlocked = isOutOfStock || isExpired;

                  return (
                    <div
                      key={prescription.prescription_id}
                      className={`border rounded-lg p-4 transition-all ${
                        isBlocked
                          ? 'border-red-300 bg-red-50 opacity-75'
                          : isSelected
                            ? 'border-green-300 bg-green-50'
                            : isNearExpiry
                              ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Stock/Expiry Warning Banner */}
                      {isOutOfStock && (
                        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm font-semibold">
                          <PackageX size={16} />
                          OUT OF STOCK — Cannot dispense this drug
                        </div>
                      )}
                      {isExpired && !isOutOfStock && (
                        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm font-semibold">
                          <AlertTriangle size={16} />
                          EXPIRED — Cannot dispense expired drugs
                        </div>
                      )}
                      {isNearExpiry &&
                        !isExpired &&
                        !isOutOfStock &&
                        stockStatus?.days_to_nearest_expiry != null && (
                          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-100 border border-amber-200 rounded-lg text-amber-700 text-sm font-medium">
                            <AlertCircle size={16} />
                            Near Expiry — Expires in{' '}
                            {stockStatus.days_to_nearest_expiry} day(s)
                          </div>
                        )}
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() =>
                              !isBlocked &&
                              toggleSelect(prescription.prescription_id)
                            }
                            className={`flex-shrink-0 mt-1 ${isBlocked ? 'cursor-not-allowed' : ''}`}
                            disabled={isBlocked}
                          >
                            {isBlocked ? (
                              <PackageX size={20} className="text-red-500" />
                            ) : isSelected ? (
                              <CheckSquare
                                size={20}
                                className="text-green-600"
                              />
                            ) : (
                              <Square size={20} className="text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Pill size={16} className="text-purple-500" />
                              <span className="font-semibold text-gray-900">
                                {prescription.drug?.drug_name ||
                                  (prescription as any).drug_name ||
                                  'Unknown Drug'}
                              </span>
                              {prescription.drug?.strength && (
                                <span className="text-sm text-purple-600 font-medium">
                                  {prescription.drug.strength}
                                </span>
                              )}
                            </div>
                            {prescription.drug?.brand_name && (
                              <div className="text-xs text-gray-500 ml-6">
                                Brand: {prescription.drug.brand_name}
                              </div>
                            )}
                            {stockStatus && !isBlocked && (
                              <div className="text-xs text-gray-500 ml-6">
                                Stock: {stockStatus.stock_quantity} available
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {paymentInfo && (
                            <PaymentStatusDot
                              status={
                                paymentInfo.payment_status === 'Paid'
                                  ? 'Paid'
                                  : paymentInfo.payment_status === 'Paid_NHIS'
                                    ? 'Paid_NHIS'
                                    : paymentInfo.payment_status ===
                                        'Paid_Retainership'
                                      ? 'Paid_Retainership'
                                      : paymentInfo.payment_status === 'Waived'
                                        ? 'Waived'
                                        : 'Pending'
                              }
                            />
                          )}
                          <StatusBadge
                            status={prescription.status}
                            variant={getPrescriptionStatusColor(
                              prescription.status as PrescriptionStatus,
                            )}
                          />
                        </div>
                      </div>

                      {/* Prescription Details Grid */}
                      <div className="ml-9 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Dosage:</span>
                          <span className="font-medium text-gray-800">
                            {prescription.dosage || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Frequency:</span>
                          <span className="font-medium text-gray-800">
                            {prescription.frequency || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium text-gray-800">
                            {prescription.duration
                              ? `${prescription.duration} days`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Route:</span>
                          <span className="font-medium text-gray-800">
                            {prescription.route || 'Oral'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Prescribed:</span>
                          <span className="font-medium text-gray-800">
                            {prescription.quantity_prescribed} units
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">To Dispense:</span>
                          <span className="font-semibold text-green-700">
                            {remainingQty} units
                          </span>
                        </div>
                      </div>

                      {/* Instructions */}
                      {(prescription.instructions ||
                        prescription.special_instructions) && (
                        <div className="ml-9 mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                          <span className="font-medium text-amber-800">
                            Instructions:{' '}
                          </span>
                          <span className="text-amber-700">
                            {prescription.instructions ||
                              prescription.special_instructions}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Already Dispensed */}
            {dispensedPrescriptions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  Already Dispensed ({dispensedPrescriptions.length})
                </h3>
                {dispensedPrescriptions.map((prescription) => (
                  <div
                    key={prescription.prescription_id}
                    className="border border-green-200 bg-green-50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {prescription.drug?.drug_name ||
                              (prescription as any).drug_name ||
                              'Unknown Drug'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {prescription.drug?.strength} •{' '}
                            {prescription.quantity_dispensed ||
                              prescription.quantity_prescribed}{' '}
                            dispensed
                          </div>
                        </div>
                      </div>
                      <StatusBadge status="Dispensed" variant="success" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {dispensablePrescriptions.length === 0 &&
              dispensedPrescriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No prescriptions in this encounter
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
