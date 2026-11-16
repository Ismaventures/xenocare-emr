import React, { useMemo, useState } from 'react';
import {
  Eye,
  PlayCircle,
  Image,
  FileText,
  Search,
  Printer,
  Calendar,
  Images,
  Check,
  X,
  SkipForward,
} from 'lucide-react';
import { isNhisFeatureEnabled } from '../../../config/features';
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
  RadiologyRequestDTO,
  RADIOLOGY_REQUEST_STATUS,
  IMAGING_MODALITIES,
  RadiologyRequestStatus,
  ImagingModality,
  getRadiologyStatusColor,
  getModalityColor,
  SCAN_CATEGORIES,
} from '../dtos/radiology.dto';
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

interface RadiologyRequestListProps {
  requests: RadiologyRequestDTO[];
  isLoading?: boolean;
  onView: (request: RadiologyRequestDTO) => void;
  onAccept?: (request: RadiologyRequestDTO) => void;
  onReject?: (request: RadiologyRequestDTO) => void;
  onSchedule?: (request: RadiologyRequestDTO) => void;
  onStartImaging: (request: RadiologyRequestDTO) => void;
  onCompleteImaging: (request: RadiologyRequestDTO) => void;
  onUploadImages?: (request: RadiologyRequestDTO) => void;
  onSkipToReporting?: (request: RadiologyRequestDTO) => void;
  onReport: (request: RadiologyRequestDTO) => void;
  onFinalizeReport?: (request: RadiologyRequestDTO) => void;
  onPrintReport?: (request: RadiologyRequestDTO) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
  statusFilter: RadiologyRequestStatus | '';
  onStatusFilterChange: (status: RadiologyRequestStatus | '') => void;
  modalityFilter: ImagingModality | '';
  onModalityFilterChange: (modality: ImagingModality | '') => void;
  paymentStatusMap?: PaymentStatusMap;
  showNhisColumn?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function RadiologyRequestList({
  requests,
  isLoading = false,
  onView,
  onAccept,
  onReject,
  onSchedule,
  onStartImaging,
  onCompleteImaging,
  onUploadImages,
  onSkipToReporting,
  onReport,
  onFinalizeReport,
  onPrintReport,
  page,
  totalPages,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  modalityFilter,
  onModalityFilterChange,
  paymentStatusMap = {},
  showNhisColumn = true,
}: RadiologyRequestListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter requests client-side based on search query
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((request) => {
      const patientName = request.patient
        ? `${request.patient.first_name} ${request.patient.surname}`.toLowerCase()
        : '';
      const imagingName = request.imaging?.imaging_name?.toLowerCase() || '';
      const doctorName = request.doctor
        ? `${request.doctor.first_name} ${request.doctor.last_name}`.toLowerCase()
        : '';
      return (
        patientName.includes(query) ||
        imagingName.includes(query) ||
        doctorName.includes(query)
      );
    });
  }, [requests, searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const columns = useMemo(() => {
    const tableColumns = [
      {
        key: 'patient',
        header: 'Patient',
        render: (request: RadiologyRequestDTO) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-800">
              {request.patient?.first_name?.charAt(0)}
              {request.patient?.surname?.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {request.patient
                  ? formatPatientName(request.patient)
                  : 'Unknown'}
              </div>
              <div className="text-xs text-slate-500">
                {request.patient?.gender} •{' '}
                {request.patient
                  ? formatDetailedAge(request.patient.date_of_birth)
                  : '-'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'imaging',
        header: 'Imaging',
        render: (request: RadiologyRequestDTO) => (
          <div>
            <div className="font-semibold text-slate-900">
              {request.imaging?.imaging_name || 'Unknown'}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {request.imaging?.imaging_type && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getModalityColor(request.imaging.imaging_type as ImagingModality)}`}
                >
                  {request.imaging.imaging_type}
                </span>
              )}
              {request.imaging?.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  {request.imaging.category}
                </span>
              )}
            </div>
            {request.imaging?.body_part && (
              <div className="mt-1 text-xs text-slate-500">
                {request.imaging.body_part}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (request: RadiologyRequestDTO) => (
          <StatusBadge
            status={request.status}
            variant={getRadiologyStatusColor(
              request.status as RadiologyRequestStatus,
            )}
          />
        ),
      },
      {
        key: 'scheduled',
        header: 'Scheduled',
        render: (request: RadiologyRequestDTO) => (
          <div className="text-sm text-slate-600">
            {request.scheduled_date
              ? new Date(request.scheduled_date).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Not scheduled'}
          </div>
        ),
      },
      {
        key: 'imaging_completion',
        header: 'Imaging',
        render: (request: RadiologyRequestDTO) => (
          <div className="text-sm">
            {request.image_count && request.image_count > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {request.image_count} image{request.image_count > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                No images
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'nhis',
        header: 'NHIS',
        render: (request: RadiologyRequestDTO) => {
          const nhisStatus = (request as any).nhis_approval_status as
            | NhisApprovalStatus
            | undefined;
          const isNhisPatient =
            request.patient?.insurance_type?.toLowerCase().includes('nhis') ||
            request.patient?.patient_category?.toLowerCase().includes('nhis') ||
            (request as any).is_nhis_covered;

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
        render: (request: RadiologyRequestDTO) => {
          const paymentInfo = paymentStatusMap[request.request_id];
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
        key: 'actions',
        header: '',
        render: (request: RadiologyRequestDTO) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onView(request)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View details"
            >
              <Eye size={16} />
            </button>

            {request.status === 'Pending' && onAccept && (
              <button
                onClick={() => onAccept(request)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Accept request"
              >
                <Check size={16} />
              </button>
            )}

            {request.status === 'Pending' && onReject && (
              <button
                onClick={() => onReject(request)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject request"
              >
                <X size={16} />
              </button>
            )}

            {(request.status === 'Ordered' || request.status === 'Accepted') &&
              onSchedule && (
                <button
                  onClick={() => onSchedule(request)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Schedule imaging"
                >
                  <Calendar size={16} />
                </button>
              )}

            {request.status === 'Scheduled' && (
              <button
                onClick={() => onStartImaging(request)}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Start imaging"
              >
                <PlayCircle size={16} />
              </button>
            )}

            {request.status === 'In Progress' && (
              <button
                onClick={() => onCompleteImaging(request)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Complete imaging"
              >
                <Image size={16} />
              </button>
            )}

            {(request.status === 'Imaging Completed' ||
              request.status === 'Completed') &&
              onUploadImages && (
                <button
                  onClick={() => onUploadImages(request)}
                  className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Upload images"
                >
                  <Images size={16} />
                </button>
              )}

            {request.status === 'Imaging Completed' &&
              onSkipToReporting && (
                <button
                  onClick={() => onSkipToReporting(request)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Skip to reporting (no images)"
                >
                  <SkipForward size={16} />
                </button>
              )}

            {request.status === 'Awaiting Report' && (
              <button
                onClick={() => onReport(request)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Write report"
              >
                <FileText size={16} />
              </button>
            )}

            {request.status === 'Preliminary Report' && onFinalizeReport && (
              <button
                onClick={() => onFinalizeReport(request)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Finalize report"
              >
                <Check size={16} />
              </button>
            )}

            {(request.status === 'Final Report' ||
              request.status === 'Reported') &&
              onPrintReport && (
                <button
                  onClick={() => onPrintReport(request)}
                  className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Print report"
                >
                  <Printer size={16} />
                </button>
              )}
          </div>
        ),
      },
    ];

    return showNhisColumn && isNhisFeatureEnabled()
      ? tableColumns
      : tableColumns.filter((column) => column.key !== 'nhis');
  }, [
    onView,
    onAccept,
    onReject,
    onSchedule,
    onStartImaging,
    onCompleteImaging,
    onUploadImages,
    onReport,
    onFinalizeReport,
    onPrintReport,
    paymentStatusMap,
    showNhisColumn,
  ]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="min-w-[200px] flex-1">
          <Input
            leftIcon={Search}
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as RadiologyRequestStatus | '')
          }
          className="w-40"
        >
          <option value="">All Status</option>
          {RADIOLOGY_REQUEST_STATUS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select
          value={modalityFilter}
          onChange={(e) =>
            onModalityFilterChange(e.target.value as ImagingModality | '')
          }
          className="w-40"
        >
          <option value="">All Modalities</option>
          {IMAGING_MODALITIES.map((modality) => (
            <option key={modality} value={modality}>
              {modality}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <DataTable
        surface="command"
        columns={columns}
        data={filteredRequests}
        keyField="request_id"
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title="No radiology requests"
            description="Radiology requests will appear here when ordered"
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
