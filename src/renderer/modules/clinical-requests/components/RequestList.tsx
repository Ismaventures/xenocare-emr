/**
 * Request List Component
 * ======================
 * Displays a list of clinical requests with filtering and sorting
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import { RequestCard } from './RequestCard';
import { SkeletonRequestCard } from '../../../components/ui/SkeletonLoader';
import {
  ClinicalRequestWithDetailsDTO,
  ClinicalRequestType,
  ClinicalRequestStatus,
  ClinicalUrgency,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_CONFIG,
  URGENCY_CONFIG,
} from '../dtos/clinical-request.dto';

interface RequestListProps {
  requests: ClinicalRequestWithDetailsDTO[];
  isLoading?: boolean;
  onRequestClick?: (request: ClinicalRequestWithDetailsDTO) => void;
  onRefresh?: () => void;
  title?: string;
  showFilters?: boolean;
  emptyMessage?: string;
  compactCards?: boolean;
}

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  isLoading = false,
  onRequestClick,
  onRefresh,
  title,
  showFilters = true,
  emptyMessage = 'No requests found',
  compactCards = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    ClinicalRequestStatus | 'all'
  >('all');
  const [typeFilter, setTypeFilter] = useState<ClinicalRequestType | 'all'>(
    'all',
  );
  const [urgencyFilter, setUrgencyFilter] = useState<ClinicalUrgency | 'all'>(
    'all',
  );

  // Filter and search
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          request.patient_name?.toLowerCase().includes(search) ||
          request.emr_number?.toLowerCase().includes(search) ||
          request.request_number?.toLowerCase().includes(search) ||
          request.clinical_reason?.toLowerCase().includes(search) ||
          request.requesting_doctor_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && request.status !== statusFilter)
        return false;

      // Type filter
      if (typeFilter !== 'all' && request.request_type !== typeFilter)
        return false;

      // Urgency filter
      if (urgencyFilter !== 'all' && request.urgency !== urgencyFilter)
        return false;

      return true;
    });
  }, [requests, searchTerm, statusFilter, typeFilter, urgencyFilter]);

  // Group by urgency for priority display
  const groupedRequests = useMemo(() => {
    const emergency = filteredRequests.filter((r) => r.urgency === 'Emergency');
    const urgent = filteredRequests.filter((r) => r.urgency === 'Urgent');
    const routine = filteredRequests.filter((r) => r.urgency === 'Routine');
    return { emergency, urgent, routine };
  }, [filteredRequests]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setUrgencyFilter('all');
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    urgencyFilter !== 'all';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredRequests.length} of {requests.length} requests
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patient, EMR, request number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ClinicalRequestStatus | 'all')
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {Object.entries(REQUEST_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as ClinicalRequestType | 'all')
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.entries(REQUEST_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) =>
                setUrgencyFilter(e.target.value as ClinicalUrgency | 'all')
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Urgencies</option>
              {Object.entries(URGENCY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1"
              >
                <Filter className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading State - Skeleton Cards */}
      {isLoading && (
        <div className="flex-1 overflow-auto space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRequestCard key={index} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRequests.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">{emptyMessage}</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Request List */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="flex-1 overflow-auto space-y-4">
          {/* Emergency Section */}
          {groupedRequests.emergency.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">
                  Emergency ({groupedRequests.emergency.length})
                </span>
              </div>
              <div className={`space-y-${compactCards ? '2' : '3'}`}>
                {groupedRequests.emergency.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={onRequestClick}
                    compact={compactCards}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Urgent Section */}
          {groupedRequests.urgent.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-orange-200">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-sm font-semibold text-orange-700">
                  Urgent ({groupedRequests.urgent.length})
                </span>
              </div>
              <div className={`space-y-${compactCards ? '2' : '3'}`}>
                {groupedRequests.urgent.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={onRequestClick}
                    compact={compactCards}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Routine Section */}
          {groupedRequests.routine.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-200">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-sm font-semibold text-gray-700">
                  Routine ({groupedRequests.routine.length})
                </span>
              </div>
              <div className={`space-y-${compactCards ? '2' : '3'}`}>
                {groupedRequests.routine.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onClick={onRequestClick}
                    compact={compactCards}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestList;
