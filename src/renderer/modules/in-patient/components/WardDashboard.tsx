// =============================================================================
// XENOCARE EMR - Ward Dashboard Component
// Visual overview of all wards with occupancy and patient status
// =============================================================================

import React from 'react';
import {
  Building2,
  Bed,
  Users,
  AlertTriangle,
  Activity,
  ChevronRight,
  Plus,
  TrendingUp,
} from 'lucide-react';
import type { WardCensusView } from '../../../types/database.types';

import { SkeletonCard } from '../../../components/ui/SkeletonLoader';

interface WardDashboardProps {
  wardCensus: WardCensusView[];
  isLoading: boolean;
  onViewWard: (wardId: string) => void;
  onAdmitPatient: () => void;
  onAddWard: () => void;
  onAddBed: () => void;
}

const wardTypeColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  general: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  icu: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  pediatric: {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
  },
  maternity: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  surgical: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  orthopedic: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  cardiac: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  emergency: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  psychiatric: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  isolation: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
};

const WardDashboard: React.FC<WardDashboardProps> = ({
  wardCensus,
  isLoading,
  onViewWard,
  onAdmitPatient,
  onAddWard,
  onAddBed,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-6 border border-gray-100 h-48 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <SkeletonCard className="h-6 w-32 mb-2" />
                <SkeletonCard className="h-4 w-20" />
              </div>
              <SkeletonCard className="h-10 w-10 rounded-xl" />
            </div>
            <div className="space-y-2">
              <SkeletonCard className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <SkeletonCard className="h-4 w-16" />
                <SkeletonCard className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (wardCensus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border">
        <Building2 className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Wards Configured
        </h3>
        <p className="text-gray-500 mb-4">
          Set up wards to start managing in-patients
        </p>
        <button
          onClick={onAddWard}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Ward
        </button>
      </div>
    );
  }

  // Group wards by type
  const wardsByType = wardCensus.reduce(
    (acc, ward) => {
      const type = ward.ward_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(ward);
      return acc;
    },
    {} as Record<string, WardCensusView[]>,
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Wards</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {wardCensus.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Beds</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {wardCensus.reduce((sum, w) => sum + w.total_beds, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Bed className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Occupied</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {wardCensus.reduce((sum, w) => sum + w.occupied_beds, 0)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {wardCensus.reduce((sum, w) => sum + w.available_beds, 0)}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Ward Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {wardCensus.map((ward) => {
          const colors =
            wardTypeColors[ward.ward_type] || wardTypeColors.general;
          const occupancyPercent = ward.occupancy_rate || 0;

          return (
            <div
              key={ward.ward_id}
              className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              onClick={() => onViewWard(ward.ward_id)}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 ${colors.bg} border-b ${colors.border}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {ward.ward_name}
                    </h3>
                    <span
                      className={`text-xs font-medium ${colors.text} uppercase tracking-wide`}
                    >
                      {ward.ward_type.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                {/* Occupancy Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-500">Occupancy</span>
                    <span className="font-semibold text-gray-900">
                      {occupancyPercent}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPercent >= 90
                          ? 'bg-red-500'
                          : occupancyPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Bed Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-900">
                      {ward.total_beds}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">
                      {ward.occupied_beds}
                    </p>
                    <p className="text-xs text-blue-600">Occupied</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-600">
                      {ward.available_beds}
                    </p>
                    <p className="text-xs text-green-600">Available</p>
                  </div>
                </div>

                {/* Alerts Row */}
                {(ward.critical_patients > 0 ||
                  ward.isolation_patients > 0) && (
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    {ward.critical_patients > 0 && (
                      <div className="flex items-center gap-1.5 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {ward.critical_patients} Critical
                        </span>
                      </div>
                    )}
                    {ward.isolation_patients > 0 && (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {ward.isolation_patients} Isolation
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex gap-3">
          <button
            onClick={onAdmitPatient}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Admission
          </button>
          <button
            onClick={onAddWard}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Add Ward
          </button>
          <button
            onClick={onAddBed}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bed className="h-4 w-4" />
            Add Beds
          </button>
        </div>
      </div>
    </div>
  );
};

export default WardDashboard;
