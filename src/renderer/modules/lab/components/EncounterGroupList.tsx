import React, { useMemo, useState } from 'react';
import { User, Calendar, FileText, ChevronRight, Search } from 'lucide-react';
import { EmptyState } from '../../../components/ui';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import { LabRequestDTO } from '../dtos/lab.dto';
import {
  formatPatientName,
  formatDetailedAge,
} from '../../patient-registration/dtos/patient.dto';
import {
  EncounterGroup,
  groupLabRequestsByEncounter,
} from './EncounterApprovalModal';

// =============================================================================
// Types
// =============================================================================

interface EncounterGroupListProps {
  requests: LabRequestDTO[];
  isLoading?: boolean;
  onSelectEncounter: (group: EncounterGroup) => void;
  onSearch?: (query: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export default function EncounterGroupList({
  requests,
  isLoading = false,
  onSelectEncounter,
}: EncounterGroupListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Group requests by encounter
  const encounterGroups = useMemo(() => {
    return groupLabRequestsByEncounter(requests);
  }, [requests]);

  // Filter groups by search query (client-side)
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return encounterGroups;
    const query = searchQuery.toLowerCase();
    return encounterGroups.filter((group) => {
      const patientName = group.patient
        ? `${group.patient.first_name} ${group.patient.surname}`.toLowerCase()
        : '';
      return patientName.includes(query);
    });
  }, [encounterGroups, searchQuery]);

  // Filter groups that have pending requests (for approval queue)
  // Always show only groups with pending requests since this is the approval queue
  const pendingGroups = useMemo(() => {
    return filteredGroups.filter((g) => g.pending_count > 0);
  }, [filteredGroups]);

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors bg-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Encounter Groups List */}
      {pendingGroups.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="All lab requests have been approved. New requests will appear here when they require approval."
          icon={FileText}
        />
      ) : (
        <div className="space-y-3">
          {pendingGroups.map((group) => (
            <div
              key={group.encounter_id}
              onClick={() => onSelectEncounter(group)}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                {/* Patient & Encounter Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {group.patient?.first_name?.charAt(0) || '?'}
                      {group.patient?.surname?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {group.patient
                          ? formatPatientName(group.patient)
                          : 'Unknown Patient'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        {group.patient && (
                          <>
                            <span>{group.patient.gender}</span>
                            <span>•</span>
                            <span>
                              {formatDetailedAge(group.patient.date_of_birth)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tests Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar size={14} className="text-gray-400" />
                      {new Date(group.encounter_date).toLocaleDateString(
                        'en-GB',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
                    </div>
                    {group.doctor && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <User size={14} className="text-gray-400" />
                        Dr. {group.doctor.first_name} {group.doctor.last_name}
                      </div>
                    )}
                  </div>

                  {/* Test Names Preview */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.requests.slice(0, 3).map((req) => (
                      <span
                        key={req.request_id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {req.test?.test_name || 'Unknown'}
                      </span>
                    ))}
                    {group.requests.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                        +{group.requests.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side - Stats & Arrow */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {group.total_count} test
                      {group.total_count !== 1 ? 's' : ''}
                    </div>
                    {group.pending_count > 0 && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {group.pending_count} pending
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-gray-400 group-hover:text-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
