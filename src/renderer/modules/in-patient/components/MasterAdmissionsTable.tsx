// =============================================================================
// XENOCARE EMR - Master Admissions Table
// Unified table for all admissions with filtering and category-specific actions
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Search,
  User,
  Building2,
  Eye,
  LogOut,
  ArrowRightLeft,
  ClipboardList,
  UserCog,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Filter,
  CreditCard,
} from 'lucide-react';
import {
  useActiveAdmissions,
  useAdmissionHistory,
} from '../hooks/useAdmissions';
import { useWards } from '../hooks/useWards';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import {
  AdmissionFilterPanel,
  defaultAdmissionFilters,
  type AdmissionFilters,
} from './AdmissionFilterPanel';
import type {
  ActiveAdmissionView,
  AdmissionStatus,
} from '../../../types/database.types';

// Extended Admission type with joined relations from the API
interface AdmissionWithRelations {
  id: string;
  admission_number?: string | null;
  admission_date?: string | null;
  actual_discharge_date?: string | null;
  admission_type?: string | null;
  discharge_type?: string | null;
  admission_status?: string | null;
  admitting_diagnosis?: string | null;
  chief_complaint?: string | null;
  discharge_summary?: string | null;
  discharge_disposition?: string | null;
  discharge_instructions?: string | null;
  acuity_level?: string | null;
  patient?: {
    id: string;
    first_name?: string;
    surname?: string;
    emr_number?: string;
    date_of_birth?: string;
    gender?: string;
  } | null;
  current_ward?: {
    id: string;
    name?: string;
    ward_type?: string;
  } | null;
  current_bed?: {
    id: string;
    bed_number?: string;
    bed_type?: string;
  } | null;
  attending_physician?: {
    id: string;
    first_name?: string;
    last_name?: string;
  } | null;
  admitting_doctor?: {
    id: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

// Unified admission row type
interface UnifiedAdmission {
  id: string;
  admissionNumber: string;
  patientId: string;
  patientName: string;
  emrNumber: string;
  wardName: string;
  wardId: string;
  bedNumber: string;
  admissionDate: string;
  dischargeDate: string | null;
  admissionType: string;
  dischargeType: string | null;
  status: AdmissionStatus;
  acuityLevel: string | null;
  isActive: boolean;
  admittingDiagnosis: string | null;
  billingStatus?: string;
  billingAmount?: number;
  pendingBillsTotal?: number;
  pendingBillsCount?: number;
  originalData: ActiveAdmissionView | AdmissionWithRelations;
}

// Consolidated patient admission type (for grouping)
interface ConsolidatedPatientAdmission extends UnifiedAdmission {
  totalAdmissions: number;
  allAdmissions: UnifiedAdmission[];
}

interface MasterAdmissionsTableProps {
  onViewDetails: (admission: any) => void;
  onDischarge: (admission: any) => void;
  onTransfer: (admission: any) => void;
  onWardRound?: (admission: any) => void;
  onEditCareTeam?: (admission: any) => void;
}

const acuityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const statusConfig: Record<
  string,
  { bg: string; text: string; icon: React.FC<{ className?: string }> }
> = {
  admitted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  under_observation: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  critical: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  stable: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  improving: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  discharged: { bg: 'bg-gray-100', text: 'text-gray-700', icon: LogOut },
  transferred: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: ArrowRightLeft,
  },
  deceased: { bg: 'bg-gray-800', text: 'text-white', icon: XCircle },
  absconded: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: AlertTriangle,
  },
};

const MasterAdmissionsTable: React.FC<MasterAdmissionsTableProps> = ({
  onViewDetails,
  onDischarge,
  onTransfer,
  onWardRound,
  onEditCareTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<AdmissionFilters>(
    defaultAdmissionFilters,
  );

  // Fetch active admissions
  const {
    data: activeAdmissions,
    isLoading: loadingActive,
    refetch: refetchActive,
  } = useActiveAdmissions();

  // Fetch wards for filter panel
  const { data: wardsData } = useWards();
  const wardsList = useMemo(() => {
    return (
      wardsData?.map((ward: { id: string; name: string }) => ({
        id: ward.id,
        name: ward.name,
      })) || []
    );
  }, [wardsData]);

  // Determine status filter for history query
  const statusFilter = filters.admissionStatus;
  const historyStatus =
    statusFilter === 'all'
      ? 'all'
      : statusFilter === 'admitted'
        ? undefined
        : (statusFilter as AdmissionStatus);

  const {
    data: historyAdmissions,
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useAdmissionHistory({
    status: historyStatus || 'all',
    startDate: filters.admissionDateFrom || undefined,
    endDate: filters.admissionDateTo || undefined,
    limit: 500,
  });

  const isLoading = loadingActive || loadingHistory;

  // Get active filter count for badge
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (
        [
          'admissionDateFrom',
          'admissionDateTo',
          'dischargeDateFrom',
          'dischargeDateTo',
          'searchQuery',
        ].includes(key)
      ) {
        return value !== '';
      }
      return value !== 'all' && value !== '';
    }).length;
  }, [filters]);

  // Transform and unify data
  const unifiedAdmissions = useMemo((): UnifiedAdmission[] => {
    const unified: UnifiedAdmission[] = [];

    // Add active admissions (only if viewing 'all' or 'admitted' or active statuses)
    const activeStatuses = [
      'all',
      'admitted',
      'under_observation',
      'critical',
      'stable',
      'improving',
    ];
    if (activeStatuses.includes(statusFilter)) {
      const activeData = activeAdmissions as ActiveAdmissionView[] | undefined;
      activeData?.forEach((admission) => {
        unified.push({
          id: admission.admission_id,
          admissionNumber: admission.admission_number || 'N/A',
          patientId: admission.patient_id,
          patientName: `${admission.first_name} ${admission.last_name}`,
          emrNumber: admission.hospital_id || 'N/A',
          wardName: admission.ward_name || 'Unassigned',
          wardId: '', // Active view doesn't have ward ID
          bedNumber: admission.bed_number || 'N/A',
          admissionDate: admission.admission_date,
          dischargeDate: null,
          admissionType: admission.admission_type || 'N/A',
          dischargeType: null,
          status: (admission.admission_status as AdmissionStatus) || 'admitted',
          acuityLevel: admission.acuity_level,
          isActive: true,
          admittingDiagnosis: admission.admitting_diagnosis || null,
          // Use raw value from API, ensuring case-insensitivity in UI display
          billingStatus: admission.billing_status,
          billingAmount: admission.billing_amount || 0,
          pendingBillsTotal: admission.pending_bills_total || 0,
          pendingBillsCount: admission.pending_bills_count || 0,
          originalData: admission,
        });
      });
    }

    // Add history admissions (for non-active statuses or 'all')
    if (statusFilter !== 'admitted') {
      const historyData = historyAdmissions as unknown as
        | AdmissionWithRelations[]
        | undefined;
      historyData?.forEach((admission) => {
        // Skip if already in active list and we're showing 'all'
        if (statusFilter === 'all') {
          const skipStatuses = [
            'admitted',
            'under_observation',
            'critical',
            'stable',
            'improving',
          ];
          if (skipStatuses.includes(admission.admission_status || '')) {
            return; // Skip active statuses from history when showing all
          }
        }

        unified.push({
          id: admission.id,
          admissionNumber: admission.admission_number || 'N/A',
          patientId: admission.patient?.id || '',
          patientName:
            `${admission.patient?.first_name || ''} ${admission.patient?.surname || ''}`.trim() ||
            'Unknown',
          emrNumber: admission.patient?.emr_number || 'N/A',
          wardName: admission.current_ward?.name || 'N/A',
          wardId: admission.current_ward?.id || '',
          bedNumber: admission.current_bed?.bed_number || 'N/A',
          admissionDate: admission.admission_date || '',
          dischargeDate: admission.actual_discharge_date || null,
          admissionType: admission.admission_type || 'N/A',
          dischargeType: admission.discharge_type || null,
          status:
            (admission.admission_status as AdmissionStatus) || 'discharged',
          acuityLevel: admission.acuity_level || null,
          isActive: false,
          admittingDiagnosis: admission.admitting_diagnosis || null,
          originalData: admission,
        });
      });
    }

    return unified;
  }, [activeAdmissions, historyAdmissions, statusFilter]);

  // Filter admissions
  const filteredAdmissions = useMemo(() => {
    return unifiedAdmissions
      .filter((admission) => {
        // Search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          if (
            !admission.admissionNumber.toLowerCase().includes(search) &&
            !admission.patientName.toLowerCase().includes(search) &&
            !admission.emrNumber.toLowerCase().includes(search)
          ) {
            return false;
          }
        }

        // Acuity filter
        if (
          filters.acuityLevel !== 'all' &&
          admission.acuityLevel !== filters.acuityLevel
        ) {
          return false;
        }

        // Admission type filter
        if (
          filters.admissionType !== 'all' &&
          admission.admissionType.toLowerCase() !==
            filters.admissionType.toLowerCase()
        ) {
          return false;
        }

        // Discharge type filter
        if (
          filters.dischargeType !== 'all' &&
          admission.dischargeType !== filters.dischargeType
        ) {
          return false;
        }

        // Ward filter
        if (
          filters.wardId !== 'all' &&
          admission.wardId !== filters.wardId &&
          admission.wardName !== filters.wardId
        ) {
          return false;
        }

        // Discharge date range filter
        if (filters.dischargeDateFrom && admission.dischargeDate) {
          if (
            new Date(admission.dischargeDate) <
            new Date(filters.dischargeDateFrom)
          ) {
            return false;
          }
        }
        if (filters.dischargeDateTo && admission.dischargeDate) {
          if (
            new Date(admission.dischargeDate) >
            new Date(filters.dischargeDateTo)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by admission date, most recent first
        return (
          new Date(b.admissionDate || 0).getTime() -
          new Date(a.admissionDate || 0).getTime()
        );
      });
  }, [unifiedAdmissions, searchTerm, filters]);

  // Consolidate by patient - show one row per patient with most recent admission
  const consolidatedAdmissions = useMemo((): ConsolidatedPatientAdmission[] => {
    const patientMap = new Map<string, UnifiedAdmission[]>();

    // Group all admissions by patient (using patientId or emrNumber as fallback)
    filteredAdmissions.forEach((admission) => {
      const key = admission.patientId || admission.emrNumber;
      if (!patientMap.has(key)) {
        patientMap.set(key, []);
      }
      patientMap.get(key)!.push(admission);
    });

    // Create consolidated entries - most recent admission for each patient
    const consolidated: ConsolidatedPatientAdmission[] = [];
    patientMap.forEach((admissions) => {
      // Sort by date (most recent first) and pick the first one
      admissions.sort(
        (a, b) =>
          new Date(b.admissionDate || 0).getTime() -
          new Date(a.admissionDate || 0).getTime(),
      );
      const mostRecent = admissions[0];
      consolidated.push({
        ...mostRecent,
        totalAdmissions: admissions.length,
        allAdmissions: admissions,
      });
    });

    // Sort consolidated list by date (most recent first)
    return consolidated.sort(
      (a, b) =>
        new Date(b.admissionDate || 0).getTime() -
        new Date(a.admissionDate || 0).getTime(),
    );
  }, [filteredAdmissions]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleRefresh = () => {
    refetchActive();
    refetchHistory();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters(defaultAdmissionFilters);
  };

  // Render action buttons based on admission status
  const renderActions = (admission: UnifiedAdmission) => {
    const { isActive } = admission;

    return (
      <div className="flex items-center gap-1">
        {/* View - Always available */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(admission.originalData);
          }}
          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Active admission actions */}
        {isActive && (
          <>
            {onWardRound && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWardRound(admission.originalData);
                }}
                className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Ward Round"
              >
                <ClipboardList className="h-4 w-4" />
              </button>
            )}
            {onEditCareTeam && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCareTeam(admission.originalData);
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                title="Edit Care Team"
              >
                <UserCog className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(admission.originalData);
              }}
              className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
              title="Transfer Bed"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDischarge(admission.originalData);
              }}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Discharge"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px] h-10 bg-gray-200 animate-pulse rounded-lg" />
          <div className="w-12 h-10 bg-gray-200 animate-pulse rounded-lg" />
        </div>
        <SkeletonTable rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar with Filter Button */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex gap-3 items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by admission #, patient name, or EMR #..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterPanel(true)}
            className={`
              flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors relative
              ${
                activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Results count */}
          <div className="text-sm text-gray-500 ml-auto">
            {consolidatedAdmissions.length} patient
            {consolidatedAdmissions.length !== 1 ? 's' : ''}
            <span className="text-gray-400 ml-1">
              ({filteredAdmissions.length} admission
              {filteredAdmissions.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Admission
                </th>
                {[
                  'discharged',
                  'transferred',
                  'deceased',
                  'absconded',
                ].includes(filters.admissionStatus) && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Discharge Date
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Ward / Bed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {consolidatedAdmissions.map((admission) => {
                const statusStyle =
                  statusConfig[admission.status] || statusConfig.admitted;
                const StatusIcon = statusStyle.icon;

                return (
                  <tr
                    key={admission.id}
                    className={`hover:bg-gray-50 transition-colors ${admission.isActive ? '' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative h-10 w-10 rounded-full flex items-center justify-center ${admission.isActive ? 'bg-blue-100' : 'bg-gray-100'}`}
                        >
                          <User
                            className={`h-5 w-5 ${admission.isActive ? 'text-blue-600' : 'text-gray-500'}`}
                          />
                          {/* Admission count badge */}
                          {admission.totalAdmissions > 1 && (
                            <span
                              className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white"
                              title={`${admission.totalAdmissions} total admissions`}
                            >
                              {admission.totalAdmissions}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {admission.patientName}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-blue-600 font-medium">
                              {admission.emrNumber}
                            </p>
                            {admission.totalAdmissions > 1 && (
                              <span className="text-xs text-amber-600 font-medium">
                                • {admission.totalAdmissions} admissions
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        {formatDate(admission.admissionDate)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {admission.admissionType.replace(/_/g, ' ')}
                      </p>
                    </td>
                    {[
                      'discharged',
                      'transferred',
                      'deceased',
                      'absconded',
                    ].includes(filters.admissionStatus) && (
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">
                          {admission.dischargeDate
                            ? formatDate(admission.dischargeDate)
                            : '-'}
                        </p>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {admission.wardName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Bed {admission.bedNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {admission.billingStatus ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium w-fit ${
                              [
                                'paid',
                                'Paid',
                                'paid_nhis',
                                'Paid_NHIS',
                                'paid_retainership',
                                'Paid_Retainership',
                              ].includes(admission.billingStatus)
                                ? 'bg-green-100 text-green-700'
                                : ['partially_paid', 'Partially_Paid'].includes(
                                      admission.billingStatus,
                                    )
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <CreditCard className="h-3 w-3" />
                            <span className="capitalize">
                              {admission.billingStatus.replace(/_/g, ' ')}
                            </span>
                          </span>
                        ) : admission.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium w-fit bg-gray-100 text-gray-700">
                            <CreditCard className="h-3 w-3" />
                            <span className="capitalize">Pending</span>
                          </span>
                        ) : null}
                        {/* Show price if available, regardless of status */}
                        {admission.billingAmount !== undefined &&
                          admission.billingAmount > 0 && (
                            <span className="text-xs text-gray-600 font-medium ml-1">
                              {new Intl.NumberFormat('en-NG', {
                                style: 'currency',
                                currency: 'NGN',
                              }).format(admission.billingAmount)}
                            </span>
                          )}
                        {admission.isActive &&
                          admission.pendingBillsTotal !== undefined && (
                            <div className="mt-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs">
                              <p className="font-medium text-red-700">
                                Pending bills:{' '}
                                {new Intl.NumberFormat('en-NG', {
                                  style: 'currency',
                                  currency: 'NGN',
                                }).format(admission.pendingBillsTotal || 0)}
                              </p>
                              <p className="text-red-600">
                                {(admission.pendingBillsCount || 0) > 0
                                  ? `${admission.pendingBillsCount} open bill${admission.pendingBillsCount === 1 ? '' : 's'}`
                                  : 'No open bills'}
                              </p>
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {admission.status.replace(/_/g, ' ')}
                        </span>
                        {admission.acuityLevel && admission.isActive && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${acuityColors[admission.acuityLevel] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {admission.acuityLevel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderActions(admission)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty state */}
          {consolidatedAdmissions.length === 0 && (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="mt-4 text-lg font-medium text-gray-900">
                No admissions found
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {activeFilterCount > 0
                  ? 'Try adjusting your search or filters'
                  : filters.admissionStatus === 'admitted'
                    ? 'No patients are currently admitted'
                    : `No ${filters.admissionStatus || 'matching'} patients found`}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      <AdmissionFilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={() => setShowFilterPanel(false)}
        onClearFilters={handleClearFilters}
        wardList={wardsList}
      />
    </div>
  );
};

export default MasterAdmissionsTable;
