import React, { useMemo, useState } from 'react';
import {
  Eye,
  TestTube,
  PlayCircle,
  CheckCircle,
  Search,
  Droplets,
  Check,
  X,
  Shield,
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
import {
  NhisApprovalBadge,
  NhisApprovalIndicator,
} from '../../../components/nhis/NhisApprovalComponents';
import {
  LabRequestDTO,
  LAB_REQUEST_STATUS,
  LAB_CATEGORIES,
  SAMPLE_TYPES,
  LabRequestStatus,
  LabCategory,
  SampleType,
  getLabStatusColor,
  getLabCategoryColor,
  getSampleTypeColor,
  getResultStatusColor,
} from '../dtos/lab.dto';
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

interface LabRequestListProps {
  requests: LabRequestDTO[];
  isLoading?: boolean;
  onView: (request: LabRequestDTO) => void;
  onCollectSample: (request: LabRequestDTO) => void;
  onStartProcessing: (request: LabRequestDTO) => void;
  onEnterResult: (request: LabRequestDTO) => void;
  onAccept?: (request: LabRequestDTO) => void;
  onReject?: (request: LabRequestDTO) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearch?: (query: string) => void;
  statusFilter: LabRequestStatus | '';
  onStatusFilterChange: (status: LabRequestStatus | '') => void;
  categoryFilter: LabCategory | '';
  onCategoryFilterChange: (category: LabCategory | '') => void;
  sampleTypeFilter?: SampleType | '';
  onSampleTypeFilterChange?: (sampleType: SampleType | '') => void;
  paymentStatusMap?: PaymentStatusMap;
}

// =============================================================================
// Component
// =============================================================================

export default function LabRequestList({
  requests,
  isLoading = false,
  onView,
  onCollectSample,
  onStartProcessing,
  onEnterResult,
  onAccept,
  onReject,
  page,
  totalPages,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sampleTypeFilter = '',
  onSampleTypeFilterChange,
  paymentStatusMap = {},
}: LabRequestListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter requests client-side based on search query
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter((request) => {
      const patientName = request.patient
        ? `${request.patient.first_name} ${request.patient.surname}`.toLowerCase()
        : '';
      const testName = (request.test?.test_name || '').toLowerCase();
      const doctorName = request.doctor
        ? `${request.doctor.first_name} ${request.doctor.last_name}`.toLowerCase()
        : '';
      return (
        patientName.includes(query) ||
        testName.includes(query) ||
        doctorName.includes(query)
      );
    });
  }, [requests, searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const columns = useMemo(
    () => [
      {
        key: 'patient',
        header: 'Patient',
        render: (request: LabRequestDTO) => (
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
        key: 'test',
        header: 'Test',
        render: (request: LabRequestDTO) => (
          <div>
            <div className="font-medium text-gray-900">
              {request.test?.test_name || 'Unknown'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {request.test?.category && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLabCategoryColor(request.test.category as LabCategory)}`}
                >
                  {request.test.category}
                </span>
              )}
              {request.test?.sample_type && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSampleTypeColor(request.test.sample_type as SampleType)}`}
                >
                  <Droplets className="h-3 w-3 mr-1" />
                  {request.test.sample_type}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (request: LabRequestDTO) => (
          <StatusBadge
            status={request.status}
            variant={getLabStatusColor(request.status as LabRequestStatus)}
          />
        ),
      },
      {
        key: 'nhis',
        header: 'NHIS',
        render: (request: LabRequestDTO) => {
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
        render: (request: LabRequestDTO) => {
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
        key: 'result',
        header: 'Result',
        render: (request: LabRequestDTO) => {
          const labResult = request.lab_result;
          return (
            <div className="text-sm">
              {labResult?.result || request.result ? (
                <div>
                  <span className="text-gray-900 font-medium">
                    {labResult?.result ||
                      (typeof request.result === 'string'
                        ? request.result
                        : 'View')}
                  </span>
                  {labResult?.result_status && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${getResultStatusColor(labResult.result_status)}`}
                    >
                      {labResult.result_status}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic">Pending</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        render: (request: LabRequestDTO) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onView(request)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View details"
            >
              <Eye size={16} />
            </button>

            {/* Accept/Reject buttons for pending requests */}
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

            {/* Collect sample for accepted requests */}
            {request.status === 'Accepted' && (
              <button
                onClick={() => onCollectSample(request)}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Collect sample"
              >
                <TestTube size={16} />
              </button>
            )}

            {request.status === 'Sample Collected' && (
              <button
                onClick={() => onStartProcessing(request)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Start processing"
              >
                <PlayCircle size={16} />
              </button>
            )}

            {(request.status === 'Sample Collected' ||
              request.status === 'In Progress') && (
              <button
                onClick={() => onEnterResult(request)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Enter result"
              >
                <CheckCircle size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [
      onView,
      onCollectSample,
      onStartProcessing,
      onEnterResult,
      onAccept,
      onReject,
      paymentStatusMap,
    ],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="flex-1">
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
            onStatusFilterChange(e.target.value as LabRequestStatus | '')
          }
          className="w-40"
        >
          <option value="">All Status</option>
          {LAB_REQUEST_STATUS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) =>
            onCategoryFilterChange(e.target.value as LabCategory | '')
          }
          className="w-40"
        >
          <option value="">All Categories</option>
          {LAB_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        {onSampleTypeFilterChange && (
          <Select
            value={sampleTypeFilter}
            onChange={(e) =>
              onSampleTypeFilterChange(e.target.value as SampleType | '')
            }
            className="w-36"
          >
            <option value="">All Samples</option>
            {SAMPLE_TYPES.map((sampleType) => (
              <option key={sampleType} value={sampleType}>
                {sampleType}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Table */}
      <DataTable
        surface="command"
        columns={columns}
        data={filteredRequests}
        keyField="request_id"
        isLoading={isLoading && (!requests || requests.length > 0)}
        emptyState={
          <EmptyState
            title="No lab requests"
            description="Lab requests will appear here when ordered"
            icon={TestTube}
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
