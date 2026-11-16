/**
 * =============================================================================
 * XENOCARE EMR - PROFESSIONAL ENCOUNTER TIMELINE
 * Clinical-grade encounter history with visual timeline and comprehensive details
 * Designed for rapid clinical review and encounter navigation
 * =============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
} from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  TestTube,
  FileImage,
  Pill,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Lock,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  User,
  Heart,
} from 'lucide-react';
import {
  usePatientEncounter,
  EncounterSummary,
} from '../../contexts/PatientEncounterContext';
import { SkeletonEncounterList } from '../ui/SkeletonLoader';

// =============================================================================
// Configuration
// =============================================================================

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  dot: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Open: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: Activity,
    dot: 'bg-emerald-500',
  },
  Active: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Activity,
    dot: 'bg-blue-500',
  },
  Closed: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: CheckCircle,
    dot: 'bg-gray-400',
  },
  Completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: CheckCircle,
    dot: 'bg-green-500',
  },
  Cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircle,
    dot: 'bg-red-500',
  },
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  Checkin: { label: 'Check-In', color: 'text-slate-600' },
  Vitals: { label: 'Vitals', color: 'text-purple-600' },
  Triage: { label: 'Triage', color: 'text-orange-600' },
  Queue: { label: 'In Queue', color: 'text-amber-600' },
  Consultation: { label: 'Consultation', color: 'text-blue-600' },
  Lab: { label: 'Laboratory', color: 'text-cyan-600' },
  Radiology: { label: 'Radiology', color: 'text-indigo-600' },
  Pharmacy: { label: 'Pharmacy', color: 'text-green-600' },
  Billing: { label: 'Billing', color: 'text-emerald-600' },
  Discharge: { label: 'Discharged', color: 'text-gray-600' },
};

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  Urgent: { color: 'text-red-600', bg: 'bg-red-100', label: 'URGENT' },
  High: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'HIGH' },
  Normal: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'NORMAL' },
  Low: { color: 'text-gray-400', bg: 'bg-gray-50', label: 'LOW' },
};

const VISIT_TYPE_ICONS: Record<string, React.ReactNode> = {
  OPD: <Stethoscope size={12} />,
  Emergency: <AlertCircle size={12} />,
  'Follow-up': <Calendar size={12} />,
  Review: <Activity size={12} />,
};

// =============================================================================
// Helper Functions
// =============================================================================

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisWeek(date)) return 'This Week';
  if (isThisMonth(date)) return 'This Month';
  return format(date, 'MMMM yyyy');
}

function formatEncounterDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

// =============================================================================
// Encounter Card Component
// =============================================================================

interface EncounterCardProps {
  encounter: EncounterSummary;
  isSelected: boolean;
  onSelect: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  showDateHeader?: string | null;
}

function EncounterCard({
  encounter,
  isSelected,
  onSelect,
  isFirst,
  isLast,
  showDateHeader,
}: EncounterCardProps) {
  const statusConfig = STATUS_CONFIG[encounter.status] || STATUS_CONFIG.Open;
  const stageConfig = STAGE_CONFIG[encounter.current_stage] || {
    label: encounter.current_stage,
    color: 'text-gray-600',
  };
  const priorityConfig =
    PRIORITY_CONFIG[encounter.priority || 'Normal'] || PRIORITY_CONFIG.Normal;
  const isClosed =
    encounter.status === 'Closed' || encounter.status === 'Completed';
  const StatusIcon = statusConfig.icon;

  const totalRecords =
    (encounter.vitals_count || 0) +
    (encounter.consultation_count || 0) +
    (encounter.lab_count || 0) +
    (encounter.radiology_count || 0) +
    (encounter.prescription_count || 0);

  return (
    <div className="relative">
      {/* Date Header */}
      {showDateHeader && (
        <div className="pb-2 pt-1">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {showDateHeader}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>
      )}

      {/* Timeline Connection */}
      <div className="flex">
        {/* Timeline Track */}
        <div className="flex flex-col items-center mr-3">
          {/* Top Connector */}
          <div
            className={`w-0.5 h-3 ${isFirst && !showDateHeader ? 'bg-transparent' : 'bg-gray-200'}`}
          />

          {/* Dot */}
          <div
            className={`
            w-3 h-3 rounded-full border-2 flex-shrink-0 z-10
            ${
              isSelected
                ? 'bg-primary-700 border-primary-700 ring-2 ring-primary-700/20'
                : `${statusConfig.dot} border-white`
            }
          `}
          />

          {/* Bottom Connector */}
          <div
            className={`w-0.5 flex-1 ${isLast ? 'bg-transparent' : 'bg-gray-200'}`}
          />
        </div>

        {/* Card Content */}
        <button
          type="button"
          onClick={onSelect}
          className={`
            flex-1 text-left rounded-lg border transition-all duration-150 mb-2
            ${
              isSelected
                ? 'border-primary-700 bg-primary-700/5 shadow-md ring-1 ring-primary-700/10'
                : 'border-gray-200 bg-white hover:border-primary-700/40 hover:shadow-sm'
            }
            ${isClosed ? 'opacity-90' : ''}
          `}
        >
          {/* Card Header */}
          <div className="px-3 py-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Visit Number */}
                <span className="font-semibold text-gray-900 text-sm">
                  {encounter.encounter_number ||
                    encounter.visit_id?.slice(0, 8)}
                </span>

                {/* Priority Badge (only for non-normal) */}
                {encounter.priority && encounter.priority !== 'Normal' && (
                  <span
                    className={`px-1.5 py-0.5 text-xs font-bold uppercase rounded ${priorityConfig.bg} ${priorityConfig.color}`}
                  >
                    {priorityConfig.label}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                <StatusIcon size={12} className={statusConfig.text} />
                <span className={`text-xs font-medium ${statusConfig.text}`}>
                  {encounter.status}
                </span>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-3 py-2.5">
            {/* Visit Type & Stage Row */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1.5 text-xs">
                {VISIT_TYPE_ICONS[encounter.visit_type] || <User size={12} />}
                <span className="font-medium text-gray-700">
                  {encounter.visit_type}
                </span>
              </div>
              <div className="h-3 w-px bg-gray-200" />
              <span className={`text-xs font-semibold ${stageConfig.color}`}>
                {stageConfig.label}
              </span>
            </div>

            {/* Chief Complaint */}
            {encounter.chief_complaint && (
              <div className="mb-2 p-2 bg-gray-50 rounded text-xs text-gray-600 line-clamp-2">
                <span className="font-medium text-gray-700">CC:</span>{' '}
                {encounter.chief_complaint}
              </div>
            )}

            {/* Record Counts */}
            {totalRecords > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {encounter.vitals_count > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-100">
                    <Heart size={10} />
                    <span className="font-medium">
                      {encounter.vitals_count}
                    </span>
                  </div>
                )}
                {encounter.consultation_count > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-100">
                    <Stethoscope size={10} />
                    <span className="font-medium">
                      {encounter.consultation_count}
                    </span>
                  </div>
                )}
                {encounter.lab_count > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded border border-amber-100">
                    <TestTube size={10} />
                    <span className="font-medium">{encounter.lab_count}</span>
                  </div>
                )}
                {encounter.radiology_count > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-cyan-50 text-cyan-700 rounded border border-cyan-100">
                    <FileImage size={10} />
                    <span className="font-medium">
                      {encounter.radiology_count}
                    </span>
                  </div>
                )}
                {encounter.prescription_count > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-100">
                    <Pill size={10} />
                    <span className="font-medium">
                      {encounter.prescription_count}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Clinic */}
            {encounter.clinic && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <MapPin size={10} />
                <span>{encounter.clinic.clinic_name}</span>
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-lg">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={10} />
              <span>{formatEncounterDate(encounter.created_at)}</span>
            </div>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(encounter.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Locked Indicator */}
          {isClosed && (
            <div className="absolute top-2 right-2">
              <Lock size={12} className="text-gray-400" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Filter Controls Component
// =============================================================================

type StatusFilter = 'all' | 'open' | 'closed';
type SortOrder = 'newest' | 'oldest';

interface FilterControlsProps {
  statusFilter: StatusFilter;
  sortOrder: SortOrder;
  onStatusChange: (status: StatusFilter) => void;
  onSortChange: (sort: SortOrder) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function FilterControls({
  statusFilter,
  sortOrder,
  onStatusChange,
  onSortChange,
  searchQuery,
  onSearchChange,
}: FilterControlsProps) {
  return (
    <div className="space-y-2 mb-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search encounters..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-700 focus:border-primary-700"
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1">
        {[
          { value: 'all' as StatusFilter, label: 'All' },
          { value: 'open' as StatusFilter, label: 'Active' },
          { value: 'closed' as StatusFilter, label: 'Closed' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`
              px-2.5 py-1 text-xs font-medium rounded-full transition-colors
              ${
                statusFilter === opt.value
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {opt.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Sort Toggle */}
        <button
          onClick={() =>
            onSortChange(sortOrder === 'newest' ? 'oldest' : 'newest')
          }
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <Calendar size={12} />
          {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Timeline Component
// =============================================================================

interface EncounterTimelineProps {
  className?: string;
  compact?: boolean;
}

export function EncounterTimeline({
  className = '',
  compact = false,
}: EncounterTimelineProps) {
  const {
    selectedPatient,
    patientEncounters,
    isLoadingEncounters,
    encountersError,
    selectedEncounter,
    selectEncounter,
    canViewEncounterList,
  } = usePatientEncounter();

  // Local state for filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort encounters
  const filteredEncounters = useMemo(() => {
    let result = [...patientEncounters];

    // Status filter
    if (statusFilter === 'open') {
      result = result.filter(
        (e) => e.status === 'Open' || e.status === 'Active',
      );
    } else if (statusFilter === 'closed') {
      result = result.filter(
        (e) =>
          e.status === 'Closed' ||
          e.status === 'Completed' ||
          e.status === 'Cancelled',
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.encounter_number?.toLowerCase().includes(query) ||
          e.visit_id?.toLowerCase().includes(query) ||
          e.chief_complaint?.toLowerCase().includes(query) ||
          e.visit_type?.toLowerCase().includes(query),
      );
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [patientEncounters, statusFilter, sortOrder, searchQuery]);

  // Group by date for headers
  const encountersWithGroups = useMemo(() => {
    const groups: { encounter: EncounterSummary; dateHeader: string | null }[] =
      [];
    let lastGroup = '';

    filteredEncounters.forEach((enc) => {
      const group = getDateGroup(enc.created_at);
      groups.push({
        encounter: enc,
        dateHeader: group !== lastGroup ? group : null,
      });
      lastGroup = group;
    });

    return groups;
  }, [filteredEncounters]);

  // Not authorized to view
  if (!canViewEncounterList) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg ${className}`}
      >
        <Lock size={24} className="text-gray-400 mb-2" />
        <p className="text-gray-500 text-sm text-center">
          You do not have permission to view encounter history
        </p>
      </div>
    );
  }

  // No patient selected
  if (!selectedPatient) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg ${className}`}
      >
        <User size={24} className="text-gray-400 mb-2" />
        <p className="text-gray-500 text-sm text-center">
          Select a patient to view their encounter history
        </p>
      </div>
    );
  }

  // Loading
  if (isLoadingEncounters) {
    return (
      <div className={`p-4 ${className}`}>
        <SkeletonEncounterList count={4} />
      </div>
    );
  }

  // Error
  if (encountersError) {
    return (
      <div
        className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}
      >
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={16} />
          <p className="text-sm font-medium">Error loading encounters</p>
        </div>
        <p className="text-xs text-red-500 mt-1">{encountersError}</p>
      </div>
    );
  }

  // No encounters
  if (patientEncounters.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}
      >
        <Calendar size={32} className="text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm font-medium">No encounters found</p>
        <p className="text-gray-400 text-xs mt-1">
          This patient has no visit records
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 pb-3 border-b border-gray-200 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Encounter History
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {patientEncounters.length} total • {filteredEncounters.length}{' '}
              showing
            </p>
          </div>
          {selectedEncounter && (
            <button
              onClick={() => selectEncounter('')}
              className="text-xs text-primary-700 hover:text-primary-600 font-medium"
            >
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex-shrink-0">
        <FilterControls
          statusFilter={statusFilter}
          sortOrder={sortOrder}
          onStatusChange={setStatusFilter}
          onSortChange={setSortOrder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {filteredEncounters.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Filter size={20} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              No encounters match your filters
            </p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-primary-700 hover:underline mt-1"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="relative">
            {encountersWithGroups.map(({ encounter, dateHeader }, index) => (
              <EncounterCard
                key={encounter.visit_id}
                encounter={encounter}
                isSelected={selectedEncounter?.visit_id === encounter.visit_id}
                onSelect={() => selectEncounter(encounter.visit_id)}
                isFirst={index === 0}
                isLast={index === encountersWithGroups.length - 1}
                showDateHeader={dateHeader}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Encounter Indicator */}
      {selectedEncounter && (
        <div className="flex-shrink-0 mt-3 pt-3 border-t border-gray-200">
          <div
            className={`p-2.5 rounded-lg border ${
              selectedEncounter.status === 'Closed' ||
              selectedEncounter.status === 'Completed'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-primary-700/5 border-primary-700/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle
                size={14}
                className={
                  selectedEncounter.status === 'Closed' ||
                  selectedEncounter.status === 'Completed'
                    ? 'text-amber-600'
                    : 'text-primary-700'
                }
              />
              <span className="text-xs font-medium text-gray-700">
                Viewing:{' '}
                {selectedEncounter.encounter_number ||
                  selectedEncounter.visit_id?.slice(0, 8)}
              </span>
              {(selectedEncounter.status === 'Closed' ||
                selectedEncounter.status === 'Completed') && (
                <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
                  <Lock size={10} />
                  Read-only
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Timeline Variant (for sidebars)
// =============================================================================

const STAGE_LABELS: Record<string, string> = {
  Checkin: 'Check-In',
  Vitals: 'Vitals',
  Triage: 'Triage',
  Queue: 'In Queue',
  Consultation: 'Consultation',
  Lab: 'Laboratory',
  Radiology: 'Radiology',
  Pharmacy: 'Pharmacy',
  Billing: 'Billing',
  Discharge: 'Discharged',
};

export function EncounterTimelineCompact({
  className = '',
}: {
  className?: string;
}) {
  const {
    selectedPatient,
    patientEncounters,
    isLoadingEncounters,
    selectedEncounter,
    selectEncounter,
    canViewEncounterList,
  } = usePatientEncounter();

  if (!canViewEncounterList || !selectedPatient) {
    return null;
  }

  if (isLoadingEncounters) {
    return <div className="animate-pulse h-20 bg-gray-100 rounded" />;
  }

  // Sort by date descending
  const sortedEncounters = [...patientEncounters].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className={`${className}`}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        Select Encounter
      </label>
      <div className="relative">
        <select
          value={selectedEncounter?.visit_id || ''}
          onChange={(e) => e.target.value && selectEncounter(e.target.value)}
          className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 appearance-none cursor-pointer"
        >
          <option value="">All encounters</option>
          {sortedEncounters.map((enc) => {
            const isClosed =
              enc.status === 'Closed' || enc.status === 'Completed';
            return (
              <option key={enc.visit_id} value={enc.visit_id}>
                {format(new Date(enc.created_at), 'MMM d, yyyy')} -{' '}
                {enc.visit_type}
                {isClosed ? ' ✓' : ''}
              </option>
            );
          })}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {selectedEncounter && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            <span
              className={
                STAGE_CONFIG[selectedEncounter.current_stage]?.color ||
                'text-gray-600'
              }
            >
              {STAGE_LABELS[selectedEncounter.current_stage] ||
                selectedEncounter.current_stage}
            </span>
          </span>
          {(selectedEncounter.status === 'Closed' ||
            selectedEncounter.status === 'Completed') && (
            <span className="flex items-center gap-1 text-amber-600">
              <Lock size={10} />
              Read-only
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default EncounterTimeline;
