import React, { useState, useMemo } from 'react';
import {
  Search,
  User,
  Activity,
  UserCheck,
  RefreshCw,
  Phone,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMyPatients } from '../hooks/useConsultation';
import { PatientSummary } from '../api/consultation.api';
import { EmptyState, DataTable } from '../../../components/ui/DataDisplay';
import { Button, Input, Select } from '../../../components/ui/FormElements';

// =============================================================================
// Types
// =============================================================================

interface MyPatientsPanelProps {
  onSelectPatient: (patient: PatientSummary) => void;
  selectedPatientId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateAge(dateOfBirth: string): string {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prev = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years === 0 && months === 0) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (weeks > 0 && rem > 0) return `${weeks}w ${rem}d`;
    if (weeks > 0) return `${weeks}w`;
    return `${days}d`;
  }
  if (years === 0) {
    const parts = [`${months}m`];
    if (days > 0) parts.push(`${days}d`);
    return parts.join(' ');
  }
  const parts = [`${years}y`];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0) parts.push(`${days}d`);
  return parts.join(' ');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// =============================================================================
// Date Filter Options
// =============================================================================

const DATE_FILTER_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 3 Months' },
  { value: '180', label: 'Last 6 Months' },
  { value: '365', label: 'Last Year' },
];

// =============================================================================
// Main Component
// =============================================================================

export default function MyPatientsPanel({
  onSelectPatient,
  selectedPatientId,
}: MyPatientsPanelProps) {
  const navigate = useNavigate();
  // State
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate date range from filter
  const dateParams = useMemo(() => {
    if (!dateFilter) return {};

    const days = parseInt(dateFilter, 10);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return {
      dateFrom: dateFrom.toISOString(),
    };
  }, [dateFilter]);

  // Fetch data
  const { data, isLoading, error, refetch } = useMyPatients({
    search: search || undefined,
    page: currentPage,
    limit: 20,
    ...dateParams,
  });

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: 'patient' as const,
        header: 'Patient',
        render: (patient: PatientSummary) => {
          const initials =
            `${patient.first_name[0]}${patient.surname[0]}`.toUpperCase();
          const age = calculateAge(patient.date_of_birth);
          return (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-semibold text-sm text-indigo-600">
                {initials}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {patient.surname}, {patient.first_name}
                  {patient.middle_name ? ` ${patient.middle_name[0]}.` : ''}
                </div>
                <div className="text-sm text-gray-500">
                  {age} • {patient.gender === 'Male' ? 'Male' : 'Female'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'contact' as const,
        header: 'Contact',
        render: (patient: PatientSummary) => (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={14} />
            <span>{patient.contact_phone || 'No phone'}</span>
          </div>
        ),
      },
      {
        key: 'last_visit' as const,
        header: 'Last Visit',
        render: (patient: PatientSummary) => (
          <div>
            <div className="text-gray-900">
              {formatDate(patient.last_visit_date)}
            </div>
            <div className="text-xs text-gray-500">
              {getTimeAgo(patient.last_visit_date)}
            </div>
          </div>
        ),
      },
      {
        key: 'total_visits' as const,
        header: 'Total Visits',
        render: (patient: PatientSummary) => (
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-blue-500" />
            <span className="font-medium text-blue-600">
              {patient.total_visits} visit
              {patient.total_visits !== 1 ? 's' : ''}
            </span>
          </div>
        ),
      },
      {
        key: 'emr_number' as const,
        header: 'EMR No.',
        render: (patient: PatientSummary) => (
          <div className="font-medium text-gray-700">
            {patient.emr_number || patient.patient_id}
          </div>
        ),
      },
      {
        key: 'actions' as const,
        header: 'Actions',
        className: 'text-right',
        render: (patient: PatientSummary) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/medical-records/${patient.patient_id}`);
              }}
              className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-green-50 rounded-lg transition-colors"
              title="Medical Records"
            >
              <FileText size={18} />
            </button>
          </div>
        ),
      },
    ],
    [onSelectPatient],
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error loading patients: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-700/10 rounded-lg">
            <UserCheck className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">My Patients</h3>
            <p className="text-sm text-gray-500">
              {data?.total || 0} patient{(data?.total || 0) !== 1 ? 's' : ''}{' '}
              consulted
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <Input
              leftIcon={Search}
              placeholder="Search by patient name or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <Select
              options={DATE_FILTER_OPTIONS}
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      {data && (
        <div className="text-sm text-gray-500">
          Showing {data.patients.length} of {data.total} patients
        </div>
      )}

      {/* Table */}
      {data?.patients.length === 0 ? (
        <EmptyState
          icon={<User size={32} />}
          title="No patients found"
          description={
            search
              ? 'Try a different search term'
              : 'Patients you consult will appear here'
          }
        />
      ) : (
        <DataTable
          data={data?.patients || []}
          columns={columns}
          keyField="patient_id"
          isLoading={isLoading}
          onRowClick={(patient) => {
            // Navigate to encounter view when clicking anywhere on the row
            navigate(`/medical-records/${patient.patient_id}`);
          }}
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
      )}
    </div>
  );
}
