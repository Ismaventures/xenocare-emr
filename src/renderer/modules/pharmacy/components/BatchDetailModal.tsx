import React from 'react';
import {
  X,
  Package,
  Calendar,
  Clock,
  DollarSign,
  Building2,
  Edit2,
  TrendingDown,
  CheckCircle,
  Activity,
  User,
} from 'lucide-react';
import { Button, StatusBadge, Card } from '../../../components/ui';
import { DrugBatchDTO, BatchStatus } from '../dtos/pharmacy.dto';

// =============================================================================
// Types
// =============================================================================

interface BatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: DrugBatchDTO | null;
  onEdit?: (batch: DrugBatchDTO) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDaysToExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getExpiryStatus = (
  expiryDate: string,
): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
  color: string;
} => {
  const days = getDaysToExpiry(expiryDate);

  if (days < 0)
    return { label: 'Expired', variant: 'danger', color: 'text-red-600' };
  if (days <= 30)
    return { label: 'Critical', variant: 'danger', color: 'text-red-600' };
  if (days <= 60)
    return { label: 'Warning', variant: 'warning', color: 'text-yellow-600' };
  if (days <= 90)
    return { label: 'Caution', variant: 'warning', color: 'text-orange-600' };
  return { label: 'Good', variant: 'success', color: 'text-green-600' };
};

const getBatchStatusColor = (status: BatchStatus): string => {
  const colors: Record<BatchStatus, string> = {
    active: 'green',
    depleted: 'gray',
    expired: 'red',
    quarantine: 'yellow',
    recalled: 'purple',
  };
  return colors[status] || 'gray';
};

// =============================================================================
// Component
// =============================================================================

export default function BatchDetailModal({
  isOpen,
  onClose,
  batch,
  onEdit,
}: BatchDetailModalProps) {
  if (!isOpen || !batch) return null;

  const days = getDaysToExpiry(batch.expiry_date);
  const expiryStatus = getExpiryStatus(batch.expiry_date);
  const stockUsed = batch.quantity_received - batch.quantity_remaining;
  const usagePercent =
    batch.quantity_received > 0
      ? (stockUsed / batch.quantity_received) * 100
      : 0;
  const stockValue = batch.quantity_remaining * (batch.cost_price || 0);

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
          className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Batch Details
                </h2>
                <p className="text-sm text-blue-100 font-mono">
                  {batch.batch_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(batch);
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <Edit2 size={16} className="mr-1" />
                  Edit
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Batch Info */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Batch #{batch.batch_number}
                </h3>
                <p className="text-sm text-gray-500">
                  Drug ID: {batch.drug_id}
                </p>
                {batch.barcode && (
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    Barcode: {batch.barcode}
                  </p>
                )}
              </div>
              <StatusBadge
                status={
                  batch.status.charAt(0).toUpperCase() + batch.status.slice(1)
                }
                color={getBatchStatusColor(batch.status)}
              />
            </div>

            {/* Stock Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Package size={16} />
                  <span className="text-xs font-medium uppercase">
                    Received
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {batch.quantity_received}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <CheckCircle size={16} />
                  <span className="text-xs font-medium uppercase">
                    Remaining
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {batch.quantity_remaining}
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <TrendingDown size={16} />
                  <span className="text-xs font-medium uppercase">
                    Dispensed
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {stockUsed}
                </div>
              </div>
            </div>

            {/* Usage Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Stock Usage
                </span>
                <span className="text-sm text-gray-500">
                  {usagePercent.toFixed(1)}% used
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Expiry Info */}
            <div
              className={`p-4 rounded-xl border ${
                days < 0
                  ? 'bg-red-50 border-red-200'
                  : days <= 30
                    ? 'bg-red-50 border-red-200'
                    : days <= 60
                      ? 'bg-yellow-50 border-yellow-200'
                      : days <= 90
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      days < 0
                        ? 'bg-red-100'
                        : days <= 30
                          ? 'bg-red-100'
                          : days <= 60
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                    }`}
                  >
                    <Calendar className={`h-5 w-5 ${expiryStatus.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Expiry Date
                    </p>
                    <p
                      className={`text-lg font-semibold ${expiryStatus.color}`}
                    >
                      {formatDate(batch.expiry_date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={expiryStatus.label}
                    variant={expiryStatus.variant}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {days < 0
                      ? `${Math.abs(days)} days ago`
                      : `${days} days left`}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <DollarSign size={14} />
                  <span className="text-xs font-medium uppercase">
                    Cost Price
                  </span>
                </div>
                <p className="font-semibold text-gray-900">
                  ₦{batch.cost_price?.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <DollarSign size={14} />
                  <span className="text-xs font-medium uppercase">
                    Selling Price
                  </span>
                </div>
                <p className="font-semibold text-green-600">
                  ₦{batch.selling_price?.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Activity size={14} />
                  <span className="text-xs font-medium uppercase">
                    Stock Value
                  </span>
                </div>
                <p className="font-semibold text-gray-900">
                  ₦{stockValue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Building2 size={14} />
                  <span className="text-xs font-medium uppercase">
                    Supplier
                  </span>
                </div>
                <p className="font-semibold text-gray-900">
                  {batch.supplier_name || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Timeline</h4>
              <div className="grid grid-cols-2 gap-4">
                {batch.manufacture_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Manufactured: {formatDate(batch.manufacture_date)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Received: {formatDateTime(batch.received_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    By: {batch.received_by || 'System'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {batch.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Notes
                </h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{batch.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
