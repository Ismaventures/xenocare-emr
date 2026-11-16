// =============================================================================
// NHIS Postings List Component
// =============================================================================

import React, { useState } from 'react';
import {
  MapPin,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useNhisPostings, useUpdatePostingStatus } from '../hooks';
import type { NhisPostingStatus } from '../types';
import { useAuth } from '../../../contexts/AuthContext';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';

const STATUS_FILTERS: { value: NhisPostingStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'posted', label: 'Posted' },
  { value: 'seen', label: 'Seen' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusBadge(status: NhisPostingStatus) {
  const config: Record<
    NhisPostingStatus,
    { color: string; icon: React.ReactNode }
  > = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Clock size={12} />,
    },
    posted: { color: 'bg-blue-100 text-blue-800', icon: <MapPin size={12} /> },
    seen: { color: 'bg-purple-100 text-purple-800', icon: <User size={12} /> },
    completed: {
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle size={12} />,
    },
    cancelled: {
      color: 'bg-red-100 text-red-800',
      icon: <XCircle size={12} />,
    },
  };

  const { color, icon } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function NhisPostingsList() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<NhisPostingStatus | ''>('');
  const [dateFilter, setDateFilter] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  const {
    data: postings,
    isLoading,
    refetch,
  } = useNhisPostings({
    status: statusFilter || undefined,
    date: dateFilter || undefined,
  });

  const updateStatusMutation = useUpdatePostingStatus();

  const handleStatusUpdate = async (
    postingId: string,
    newStatus: NhisPostingStatus,
  ) => {
    await updateStatusMutation.mutateAsync({
      postingId,
      status: newStatus,
      staffId: user?.id,
    });
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">NHIS Postings</h2>
          <p className="text-sm text-gray-500">
            Patient posting to clinics and doctors
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2">
            {STATUS_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  setStatusFilter(opt.value as NhisPostingStatus | '')
                }
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Postings List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-4">
            <SkeletonList count={5} />
          </div>
        ) : !postings || postings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MapPin size={48} className="mb-4 opacity-50" />
            <p className="font-medium">No postings found</p>
            <p className="text-sm">
              Postings will appear here after patients are verified
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {postings.map((posting) => (
              <div key={posting.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {posting.patient?.first_name} {posting.patient?.surname}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {posting.clinic && (
                          <span className="flex items-center gap-1">
                            <Building2 size={14} />
                            {(posting.clinic as any).clinic_name ||
                              (posting.clinic as any).name}
                          </span>
                        )}
                        {posting.doctor && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            Dr. {posting.doctor.first_name}{' '}
                            {posting.doctor.last_name}
                          </span>
                        )}
                        {posting.appointment_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(
                              posting.appointment_date,
                            ).toLocaleDateString()}
                            {posting.appointment_time &&
                              ` at ${posting.appointment_time}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {getStatusBadge(posting.status)}

                    {/* Status Progression Buttons */}
                    {posting.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(posting.id, 'posted')}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                      >
                        Post
                        <ChevronRight size={16} />
                      </button>
                    )}
                    {posting.status === 'posted' && (
                      <button
                        onClick={() => handleStatusUpdate(posting.id, 'seen')}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50"
                      >
                        Mark Seen
                        <ChevronRight size={16} />
                      </button>
                    )}
                    {posting.status === 'seen' && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(posting.id, 'completed')
                        }
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                      >
                        Complete
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {posting.status !== 'completed' &&
                      posting.status !== 'cancelled' && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(posting.id, 'cancelled')
                          }
                          disabled={updateStatusMutation.isPending}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Cancel posting"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                  </div>
                </div>

                {/* Posted info */}
                <div className="mt-3 ml-14 text-xs text-gray-500">
                  Posted {new Date(posting.posted_at).toLocaleString()}
                  {posting.seen_at &&
                    ` • Seen ${new Date(posting.seen_at).toLocaleString()}`}
                  {posting.completed_at &&
                    ` • Completed ${new Date(posting.completed_at).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NhisPostingsList;
