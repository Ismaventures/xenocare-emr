import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  FileText,
  Calendar,
  Stethoscope,
  Trash2,
  Edit,
  Clock,
} from 'lucide-react';
import {
  useConsultations,
  useDeleteConsultation,
} from '../hooks/useConsultation';
import {
  ConsultationWithRelations,
  isWithinEditWindow,
  getEditWindowRemaining,
} from '../dtos/consultation.dto';
import { RequestStatus } from '../../../types';
import {
  DataTable,
  StatusBadge,
  EmptyState,
  Button,
  Input,
  Select,
} from '../../../components/ui';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useTimeTheme } from '../../../hooks/useTimeTheme';

// =============================================================================
// Types
// =============================================================================

interface ConsultationListProps {
  onNewConsultation: () => void;
  onViewConsultation: (consultation: ConsultationWithRelations) => void;
  onEditConsultation?: (consultation: ConsultationWithRelations) => void;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// =============================================================================
// Component
// =============================================================================

export default function ConsultationList({
  onNewConsultation,
  onViewConsultation,
  onEditConsultation,
}: ConsultationListProps) {
  const { isNightMode } = useTimeTheme();
  const panelClass = isNightMode
    ? 'rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.45)]'
    : 'rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_-12px_rgba(15,80,72,0.12)]';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] =
    useState<ConsultationWithRelations | null>(null);

  // Hooks
  const { showToast } = useToast();
  const { staff } = useAuth();
  const deleteConsultation = useDeleteConsultation();

  // Check if user is a doctor (can edit consultations)
  const isDoctor =
    staff?.role === 'doctor' ||
    staff?.role === 'medical_director' ||
    staff?.role === 'super_admin';

  // Data
  const { data, isLoading, error } = useConsultations({
    query: searchQuery,
    status: statusFilter || undefined,
    page: currentPage,
    limit: 20,
  });

  // Get status variant
  const getStatusVariant = (status: RequestStatus) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'In Progress':
        return 'info';
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: 'patient' as const,
        header: 'Patient',
        render: (consultation: ConsultationWithRelations) => (
          <div>
            <div
              className={`font-medium ${isNightMode ? 'text-slate-100' : 'text-slate-900'}`}
            >
              {consultation.patient?.surname},{' '}
              {consultation.patient?.first_name}
            </div>
            <div
              className={`text-sm ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {consultation.patient?.contact_phone || 'No phone'}
            </div>
          </div>
        ),
      },
      {
        key: 'consultation_date' as const,
        header: 'Date',
        render: (consultation: ConsultationWithRelations) => (
          <div
            className={`flex items-center gap-2 ${isNightMode ? 'text-slate-300' : 'text-slate-600'}`}
          >
            <Calendar size={16} />
            {formatDate(consultation.consultation_date)}
          </div>
        ),
      },
      {
        key: 'doctor' as const,
        header: 'Doctor',
        render: (consultation: ConsultationWithRelations) => (
          <span className={isNightMode ? 'text-slate-300' : 'text-slate-600'}>
            Dr. {consultation.doctor?.last_name}
          </span>
        ),
      },
      {
        key: 'altered' as const,
        header: 'Alteration',
        render: (consultation: ConsultationWithRelations) => {
          const isAltered = Boolean(
            consultation.is_altered ||
            consultation.alteration_reason_label ||
            consultation.alteration_reason_details,
          );

          if (!isAltered) {
            return (
              <span
                className={`text-xs ${isNightMode ? 'text-slate-500' : 'text-slate-500'}`}
              >
                Original
              </span>
            );
          }

          return (
            <div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-950">
                Altered
              </span>
              <p
                className={`mt-1 max-w-[220px] truncate text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}
                title={
                  consultation.alteration_reason_details ||
                  consultation.alteration_reason_label ||
                  ''
                }
              >
                {consultation.alteration_reason_label ||
                  'Other clinical correction'}
                {consultation.alteration_reason_details
                  ? ` - ${consultation.alteration_reason_details}`
                  : ''}
              </p>
            </div>
          );
        },
      },
      {
        key: 'status' as const,
        header: 'Status',
        render: (consultation: ConsultationWithRelations) => (
          <StatusBadge
            status={consultation.status}
            variant={getStatusVariant(consultation.status)}
          />
        ),
      },
      {
        key: 'actions' as const,
        header: 'Actions',
        className: 'text-right',
        render: (consultation: ConsultationWithRelations) => {
          const canEdit =
            isDoctor && isWithinEditWindow(consultation.created_at);
          const timeRemaining = canEdit
            ? getEditWindowRemaining(consultation.created_at)
            : null;

          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewConsultation(consultation);
                }}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye size={18} />
              </button>
              {canEdit && onEditConsultation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditConsultation(consultation);
                  }}
                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors group relative"
                  title={`Edit (${timeRemaining} remaining)`}
                >
                  <Edit size={18} />
                  {timeRemaining && (
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      <Clock size={10} className="inline mr-1" />
                      {timeRemaining}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm(consultation);
                }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Consultation"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        },
      },
    ],
    [onViewConsultation, onEditConsultation, isDoctor, isNightMode],
  );

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteConsultation.mutateAsync(deleteConfirm.consultation_id);
      showToast({
        message: 'Consultation deleted successfully',
        type: 'success',
      });
      setDeleteConfirm(null);
    } catch (error) {
      showToast({ message: 'Failed to delete consultation', type: 'error' });
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading consultations: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className={`${panelClass} p-4 sm:p-5`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <Input
              leftIcon={Search}
              placeholder="Search by patient name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as RequestStatus | '');
                setCurrentPage(1);
              }}
              className="w-40"
            />
            <Button icon={Stethoscope} onClick={onNewConsultation}>
              New Consultation
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {data && (
        <div
          className={`text-sm ${isNightMode ? 'text-slate-400' : 'text-slate-600'}`}
        >
          Showing {data.consultations.length} of {data.total} consultations
        </div>
      )}

      {/* Table */}
      {data?.consultations.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="No consultations found"
          description="Start a new consultation to begin"
          action={
            <Button icon={Stethoscope} onClick={onNewConsultation}>
              Start Consultation
            </Button>
          }
        />
      ) : (
        <div className={`${panelClass} overflow-hidden`}>
          <DataTable
            data={data?.consultations || []}
            columns={columns}
            keyField="consultation_id"
            isLoading={isLoading}
            onRowClick={onViewConsultation}
            pagination={
              data
                ? {
                    currentPage: data.page,
                    totalPages: data.totalPages,
                    totalItems: data.total,
                    itemsPerPage: 20,
                    onPageChange: setCurrentPage,
                  }
                : undefined
            }
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Consultation"
        message={`Are you sure you want to delete the consultation for ${deleteConfirm?.patient?.first_name} ${deleteConfirm?.patient?.surname}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteConsultation.isPending}
      />
    </div>
  );
}
