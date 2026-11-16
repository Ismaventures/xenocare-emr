import React, { useMemo, useState, useCallback } from 'react';
import {
  Eye,
  Pill,
  X,
  Search,
  Printer,
  Trash2,
  Loader2,
  CheckCircle,
  Filter,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  Input,
  Select,
  Button,
  DataTable,
  StatusBadge,
  EmptyState,
} from '../../../components/ui';
import {
  PaymentStatusDot,
  getPaymentStatusFromBillingOrder,
} from '../../../components/workflow';
import { NhisApprovalBadge } from '../../../components/nhis/NhisApprovalComponents';
import {
  PrescriptionDTO,
  PRESCRIPTION_STATUS,
  PrescriptionStatus,
  getPrescriptionStatusColor,
  formatPrescriptionDetails,
  getDrugCategoryColor,
  getDrugTypeColor,
  DrugCategory,
  DrugType,
} from '../dtos/pharmacy.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import { PaymentStatusMap } from '../../billing/hooks/useBillingOrders';
import { formatCurrency } from '../../billing/dtos/billing-order.dto';
import type { NhisApprovalStatus } from '../../../types/database.types';

// =============================================================================
// Types
// =============================================================================

interface PrescriptionListProps {
  prescriptions: PrescriptionDTO[];
  isLoading?: boolean;
  onView: (prescription: PrescriptionDTO) => void;
  onAccept?: (prescription: PrescriptionDTO) => void;
  onReject?: (prescription: PrescriptionDTO) => void;
  onDispense: (prescription: PrescriptionDTO) => void;
  onCancel?: (prescription: PrescriptionDTO) => void;
  onDelete?: (prescription: PrescriptionDTO) => void;
  onDeleteBatch?: (prescriptionIds: string[]) => void;
  onPrintLabel?: (prescription: PrescriptionDTO) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
  statusFilter: PrescriptionStatus | '';
  onStatusFilterChange: (status: PrescriptionStatus | '') => void;
  paymentStatusMap?: PaymentStatusMap;
}

// =============================================================================
// Component
// =============================================================================

export default function PrescriptionList({
  prescriptions,
  isLoading = false,
  onView,
  onAccept,
  onReject,
  onDispense,
  onCancel,
  onDelete,
  onDeleteBatch,
  onPrintLabel,
  page,
  totalPages,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  paymentStatusMap = {},
}: PrescriptionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Track which prescriptions are being actively dispensed (for instant UI feedback)
  const [dispensingIds, setDispensingIds] = useState<Set<string>>(new Set());
  // Track recently dispensed items for success animation
  const [recentlyDispensed, setRecentlyDispensed] = useState<Set<string>>(
    new Set(),
  );

  // Filter prescriptions client-side based on search query
  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return prescriptions;
    const query = searchQuery.toLowerCase();
    return prescriptions.filter((rx) => {
      const patientName = rx.patient
        ? `${rx.patient.first_name} ${rx.patient.surname}`.toLowerCase()
        : '';
      const drugName = rx.drug?.drug_name?.toLowerCase() || '';
      const prescriptionId = rx.prescription_id?.toLowerCase() || '';
      const doctorName = rx.doctor
        ? `${rx.doctor.first_name} ${rx.doctor.last_name}`.toLowerCase()
        : '';
      return (
        patientName.includes(query) ||
        drugName.includes(query) ||
        prescriptionId.includes(query) ||
        doctorName.includes(query)
      );
    });
  }, [prescriptions, searchQuery]);

  // Handle dispense click with instant visual feedback
  const handleDispenseClick = useCallback(
    (rx: PrescriptionDTO) => {
      // Add to dispensing set for loading state
      setDispensingIds((prev) => new Set(prev).add(rx.prescription_id));

      // Call parent handler
      onDispense(rx);

      // Remove loading state after a short delay (parent handles actual state)
      setTimeout(() => {
        setDispensingIds((prev) => {
          const next = new Set(prev);
          next.delete(rx.prescription_id);
          return next;
        });
      }, 500);
    },
    [onDispense],
  );

  // Get pending prescriptions for selection
  const pendingPrescriptions = useMemo(
    () => prescriptions.filter((rx) => rx.status === 'Pending'),
    [prescriptions],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(
        new Set(pendingPrescriptions.map((rx) => rx.prescription_id)),
      );
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0 && onDeleteBatch) {
      onDeleteBatch(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const isAllSelected =
    pendingPrescriptions.length > 0 &&
    pendingPrescriptions.every((rx) => selectedIds.has(rx.prescription_id));
  const isSomeSelected = selectedIds.size > 0;

  const columns = useMemo(
    () => [
      // Selection checkbox column
      {
        key: 'select',
        header: '',
        render: (rx: PrescriptionDTO) =>
          rx.status === 'Pending' ? (
            <input
              type="checkbox"
              checked={selectedIds.has(rx.prescription_id)}
              onChange={(e) =>
                handleSelectOne(rx.prescription_id, e.target.checked)
              }
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="w-4" />
          ),
      },
      {
        key: 'patient',
        header: 'Patient',
        render: (rx: PrescriptionDTO) => {
          // Defensive check for patient data
          if (!rx.patient || typeof rx.patient !== 'object') {
            return (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                  ?
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Unknown</div>
                  <div className="text-xs text-slate-500">-</div>
                </div>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium">
                {rx.patient.first_name?.charAt(0) || '?'}
                {rx.patient.surname?.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {formatPatientName(rx.patient)}
                </div>
                <div className="text-sm text-gray-500">
                  {rx.patient.gender || '-'} •{' '}
                  {formatDetailedAge(rx.patient.date_of_birth)}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'quantity',
        header: 'Quantity',
        render: (rx: PrescriptionDTO) => (
          <div className="text-sm">
            <span className="font-medium">{rx.quantity_dispensed || 0}</span>
            <span className="text-gray-400"> / </span>
            <span>{rx.quantity_prescribed}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (rx: PrescriptionDTO) => {
          const isBeingDispensed = dispensingIds.has(rx.prescription_id);

          return (
            <div
              className={`transition-all duration-300 ${isBeingDispensed ? 'scale-105' : ''}`}
            >
              <StatusBadge
                status={isBeingDispensed ? 'Dispensing...' : rx.status}
                variant={
                  isBeingDispensed
                    ? 'info'
                    : getPrescriptionStatusColor(
                        rx.status as PrescriptionStatus,
                      )
                }
              />
            </div>
          );
        },
      },
      {
        key: 'nhis',
        header: 'NHIS',
        render: (rx: PrescriptionDTO) => {
          const nhisStatus = (rx as any).nhis_approval_status as
            | NhisApprovalStatus
            | undefined;
          const isNhisPatient =
            rx.patient?.insurance_type?.toLowerCase().includes('nhis') ||
            rx.patient?.patient_category?.toLowerCase().includes('nhis') ||
            (rx as any).is_nhis_covered;

          if (!isNhisPatient) {
            return <span className="text-xs text-gray-400">—</span>;
          }

          return (
            <NhisApprovalBadge
              status={nhisStatus || 'pending'}
              size="sm"
              showLabel={false}
            />
          );
        },
      },
      {
        key: 'payment',
        header: 'Payment',
        render: (rx: PrescriptionDTO) => {
          const paymentInfo = paymentStatusMap[rx.prescription_id];
          const paymentStatus = getPaymentStatusFromBillingOrder(
            paymentInfo?.payment_status,
          );
          const balance = paymentInfo?.balance_amount ?? 0;
          const paid = paymentInfo?.paid_amount ?? 0;
          const amountDue =
            paymentInfo?.patient_payable ?? paymentInfo?.amount_due;
          const amountLabel =
            balance > 0
              ? `${formatCurrency(balance)} due`
              : paid > 0
                ? `${formatCurrency(paid)} paid`
                : amountDue
                  ? formatCurrency(amountDue)
                  : null;

          return (
            <div className="flex flex-col gap-0.5">
              <PaymentStatusDot status={paymentStatus} />
              {amountLabel && (
                <span className="text-xs text-gray-500">{amountLabel}</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'doctor',
        header: 'Prescribed By',
        render: (rx: PrescriptionDTO) => (
          <span className="text-sm text-gray-600">
            {rx.doctor
              ? `Dr. ${rx.doctor.first_name} ${rx.doctor.last_name}`
              : '-'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (rx: PrescriptionDTO) => {
          const isDispensing = dispensingIds.has(rx.prescription_id);
          const wasDispensed = recentlyDispensed.has(rx.prescription_id);

          return (
            <div className="flex items-center justify-end gap-2">
              {/* Accept/Reject buttons for Pending status */}
              {rx.status === 'Pending' && onAccept && (
                <button
                  onClick={() => onAccept(rx)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-150 active:scale-95"
                  title="Accept prescription"
                >
                  <Check size={16} />
                </button>
              )}

              {rx.status === 'Pending' && onReject && (
                <button
                  onClick={() => onReject(rx)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 active:scale-95"
                  title="Reject prescription"
                >
                  <X size={16} />
                </button>
              )}

              {/* Dispense button for Accepted/Partial status */}
              {(rx.status === 'Accepted' || rx.status === 'Partial') && (
                <button
                  onClick={() => handleDispenseClick(rx)}
                  disabled={isDispensing}
                  className={`p-1.5 rounded-lg transition-all duration-150 active:scale-95 ${
                    isDispensing
                      ? 'bg-green-100 text-green-600'
                      : wasDispensed
                        ? 'bg-green-500 text-white'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                  title={isDispensing ? 'Processing...' : 'Dispense'}
                >
                  {isDispensing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : wasDispensed ? (
                    <CheckCircle size={16} />
                  ) : (
                    <Pill size={16} />
                  )}
                </button>
              )}

              {rx.status === 'Pending' && onDelete && (
                <button
                  onClick={() => onDelete(rx)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150 active:scale-95"
                  title="Delete permanently"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {rx.status === 'Dispensed' && onPrintLabel && (
                <button
                  onClick={() => onPrintLabel(rx)}
                  className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-150 active:scale-95"
                  title="Print Label"
                >
                  <Printer size={16} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [
      onView,
      onAccept,
      onReject,
      handleDispenseClick,
      onCancel,
      onDelete,
      onPrintLabel,
      paymentStatusMap,
      selectedIds,
      isAllSelected,
      dispensingIds,
      recentlyDispensed,
    ],
  );

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        {/* Large Search Field with Filter Icon */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by patient name, drug name, or prescription ID..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-12 pr-4 text-base placeholder-slate-400 transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const nextStatus =
                statusFilter === ''
                  ? 'Pending'
                  : statusFilter === 'Pending'
                    ? 'Partial'
                    : statusFilter === 'Partial'
                      ? 'Dispensed'
                      : statusFilter === 'Dispensed'
                        ? 'Cancelled'
                        : '';
              onStatusFilterChange(nextStatus as PrescriptionStatus | '');
            }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
              statusFilter
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Filter className="h-5 w-5" />
            <span className="font-medium">{statusFilter || 'All Status'}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk Delete Button */}
        {isSomeSelected && onDeleteBatch && (
          <Button
            variant="danger"
            size="sm"
            onClick={handleBulkDelete}
            className="flex items-center gap-2 py-3"
          >
            <Trash2 size={16} />
            Delete ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        surface="command"
        columns={columns}
        data={filteredPrescriptions}
        keyField="prescription_id"
        isLoading={isLoading && (!prescriptions || prescriptions.length > 0)}
        emptyState={
          <EmptyState
            title="No prescriptions"
            description="Prescriptions will appear here when created"
            icon={Pill}
          />
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-900/[0.04]">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
