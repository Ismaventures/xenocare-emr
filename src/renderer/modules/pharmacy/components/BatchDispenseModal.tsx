import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Pill,
  Info,
} from 'lucide-react';
import { Button, StatusBadge, Card } from '../../../components/ui';
import { useTimeTheme } from '../../../hooks/useTimeTheme';
import { useDispensableBatches } from '../hooks/usePharmacy';
import { DispensableBatch } from '../dtos/pharmacy.dto';

// =============================================================================
// Types
// =============================================================================

interface BatchDispenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (batches: SelectedBatch[]) => void;
  onLegacyDispense?: () => void;
  drugId: string;
  drugName: string;
  quantityNeeded: number;
  isLoading?: boolean;
}

interface SelectedBatch {
  batch_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getExpiryBadge = (
  daysToExpiry: number,
): { label: string; variant: 'success' | 'warning' | 'danger' } => {
  if (daysToExpiry <= 30)
    return { label: `${daysToExpiry}d`, variant: 'danger' };
  if (daysToExpiry <= 60)
    return { label: `${daysToExpiry}d`, variant: 'warning' };
  return { label: `${daysToExpiry}d`, variant: 'success' };
};

// =============================================================================
// Component
// =============================================================================

export default function BatchDispenseModal({
  isOpen,
  onClose,
  onConfirm,
  onLegacyDispense,
  drugId,
  drugName,
  quantityNeeded,
  isLoading = false,
}: BatchDispenseModalProps) {
  const { isNightMode } = useTimeTheme();

  // Fetch dispensable batches in FEFO order
  const { data: dispensableBatches, isLoading: batchesLoading } =
    useDispensableBatches(drugId, quantityNeeded);

  // State for manual quantity adjustments
  const [manualQuantities, setManualQuantities] = useState<
    Record<string, number>
  >({});
  const [useAutoFEFO, setUseAutoFEFO] = useState(true);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setManualQuantities({});
      setUseAutoFEFO(true);
    }
  }, [isOpen]);

  // Calculate selected batches
  const selectedBatches = useMemo((): SelectedBatch[] => {
    if (!dispensableBatches) return [];

    if (useAutoFEFO) {
      // Use FEFO-calculated quantities
      return dispensableBatches
        .filter((b) => b.quantity_to_take > 0)
        .map((b) => ({
          batch_id: b.batch_id,
          batch_number: b.batch_number,
          quantity: b.quantity_to_take,
          expiry_date: b.expiry_date,
        }));
    }
    // Use manual quantities
    return dispensableBatches
      .filter((b) => (manualQuantities[b.batch_id] || 0) > 0)
      .map((b) => ({
        batch_id: b.batch_id,
        batch_number: b.batch_number,
        quantity: manualQuantities[b.batch_id] || 0,
        expiry_date: b.expiry_date,
      }));
  }, [dispensableBatches, useAutoFEFO, manualQuantities]);

  // Calculate totals
  const totalSelected = useMemo(() => {
    return selectedBatches.reduce((sum, b) => sum + b.quantity, 0);
  }, [selectedBatches]);

  const totalAvailable = useMemo(() => {
    return (dispensableBatches || []).reduce(
      (sum, b) => sum + b.quantity_available,
      0,
    );
  }, [dispensableBatches]);

  // Handle manual quantity change
  const handleQuantityChange = (
    batchId: string,
    quantity: number,
    maxAvailable: number,
  ) => {
    const validQty = Math.max(0, Math.min(quantity, maxAvailable));
    setManualQuantities((prev) => ({
      ...prev,
      [batchId]: validQty,
    }));
  };

  // Handle confirm
  const handleConfirm = () => {
    if (selectedBatches.length > 0) {
      onConfirm(selectedBatches);
    }
  };

  if (!isOpen) return null;

  const canConfirm = totalSelected > 0 && totalSelected <= quantityNeeded;
  const isPartialDispense = totalSelected < quantityNeeded && totalSelected > 0;
  const isInsufficientStock = totalAvailable < quantityNeeded;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={`relative ${isNightMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Select Batches (FEFO)
                </h2>
                <p className="text-sm text-purple-100">{drugName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Summary Bar */}
          <div
            className={`px-6 py-3 ${isNightMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'} border-b`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-gray-500">Needed:</span>
                  <span
                    className={`ml-1 font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                  >
                    {quantityNeeded}
                  </span>
                </div>
                <ChevronRight className="text-gray-400" size={16} />
                <div>
                  <span className="text-sm text-gray-500">Selected:</span>
                  <span
                    className={`ml-1 font-semibold ${
                      totalSelected === quantityNeeded
                        ? 'text-green-600'
                        : totalSelected > 0
                          ? 'text-yellow-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {totalSelected}
                  </span>
                </div>
                <ChevronRight className="text-gray-400" size={16} />
                <div>
                  <span className="text-sm text-gray-500">Available:</span>
                  <span
                    className={`ml-1 font-semibold ${
                      totalAvailable >= quantityNeeded
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {totalAvailable}
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAutoFEFO}
                  onChange={(e) => setUseAutoFEFO(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Auto FEFO</span>
              </label>
            </div>
          </div>

          {/* FEFO Info */}
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Info size={14} />
              <span>
                First-Expiry-First-Out: Batches expiring soonest are prioritized
              </span>
            </div>
          </div>

          {/* Batch List */}
          <div className="flex-1 overflow-y-auto p-6">
            {batchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse h-20 bg-gray-100 rounded-lg"
                  />
                ))}
              </div>
            ) : !dispensableBatches || dispensableBatches.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                <h3
                  className={`text-lg font-semibold ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                >
                  No Available Batches
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  There are no dispensable batches for this drug.
                </p>
                {onLegacyDispense && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">
                      Stock may exist in catalogue without batches.
                    </p>
                    <Button
                      variant="outline"
                      onClick={onLegacyDispense}
                      className="mx-auto"
                    >
                      Dispense from General Stock
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {dispensableBatches.map((batch, index) => {
                  const expiryBadge = getExpiryBadge(batch.days_to_expiry);
                  const isSelected = useAutoFEFO
                    ? batch.quantity_to_take > 0
                    : (manualQuantities[batch.batch_id] || 0) > 0;
                  const selectedQty = useAutoFEFO
                    ? batch.quantity_to_take
                    : manualQuantities[batch.batch_id] || 0;

                  return (
                    <div
                      key={batch.batch_id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Priority indicator */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? 'bg-red-100 text-red-600'
                                : index === 1
                                  ? 'bg-orange-100 text-orange-600'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-medium ${isNightMode ? 'text-slate-100' : 'text-gray-900'}`}
                              >
                                {batch.batch_number}
                              </span>
                              <StatusBadge
                                status={expiryBadge.label}
                                variant={expiryBadge.variant}
                              />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(batch.expiry_date)}
                              </span>
                              <span>•</span>
                              <span>Available: {batch.quantity_available}</span>
                              <span>•</span>
                              <span>
                                ₦{batch.selling_price?.toLocaleString()}/unit
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center gap-3">
                          {useAutoFEFO ? (
                            <div
                              className={`px-4 py-2 rounded-lg font-semibold ${
                                isSelected
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {selectedQty}
                            </div>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={batch.quantity_available}
                              value={manualQuantities[batch.batch_id] || 0}
                              onChange={(e) =>
                                handleQuantityChange(
                                  batch.batch_id,
                                  parseInt(e.target.value) || 0,
                                  batch.quantity_available,
                                )
                              }
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          )}

                          {isSelected && (
                            <CheckCircle className="text-green-500" size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Warnings */}
            {isInsufficientStock &&
              dispensableBatches &&
              dispensableBatches.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle size={16} />
                    <span className="font-medium">Insufficient Stock</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    Only {totalAvailable} units available, but {quantityNeeded}{' '}
                    needed. A partial dispense will be recorded.
                  </p>
                </div>
              )}

            {isPartialDispense && !isInsufficientStock && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle size={16} />
                  <span className="font-medium">Partial Dispense</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  Selected {totalSelected} of {quantityNeeded} units. Remaining
                  will be marked as partial.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-t ${isNightMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}
          >
            <div className="text-sm text-gray-500">
              {selectedBatches.length} batch
              {selectedBatches.length !== 1 ? 'es' : ''} selected
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || isLoading}
                isLoading={isLoading}
              >
                {isPartialDispense
                  ? `Dispense ${totalSelected} Units`
                  : 'Confirm & Dispense'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
