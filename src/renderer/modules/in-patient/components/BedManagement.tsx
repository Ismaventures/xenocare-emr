// =============================================================================
// NDC MEDICAL CENTRE EMR - Bed Management Component
// Visual bed layout and status management for wards
// =============================================================================

import React, { useState } from 'react';
import {
  Bed,
  User,
  Wrench,
  Sparkles,
  Clock,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Filter,
  Plus,
} from 'lucide-react';
import { useWards, useWardCensus } from '../hooks/useWards';
import { useBedsByWard, useUpdateBedStatus } from '../hooks/useBeds';
import type {
  Bed as BedType,
  BedStatus,
  Ward,
} from '../../../types/database.types';

interface BedManagementProps {
  wardId: string | null;
  onWardChange: (wardId: string | null) => void;
  onAdmitToBed: (bedId: string) => void;
  onAddBed: () => void;
}

const statusConfig: Record<
  BedStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  Available: {
    icon: Bed,
    color: 'text-green-600',
    bgColor: 'bg-green-100 border-green-200',
    label: 'Available',
  },
  Occupied: {
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 border-blue-200',
    label: 'Occupied',
  },
  Reserved: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 border-amber-200',
    label: 'Reserved',
  },
  Maintenance: {
    icon: Wrench,
    color: 'text-red-600',
    bgColor: 'bg-red-100 border-red-200',
    label: 'Maintenance',
  },
  Cleaning: {
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 border-purple-200',
    label: 'Cleaning',
  },
};

const BedManagement: React.FC<BedManagementProps> = ({
  wardId,
  onWardChange,
  onAdmitToBed,
  onAddBed,
}) => {
  const [statusFilter, setStatusFilter] = useState<BedStatus | 'all'>('all');
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null);

  const { data: wards, isLoading: wardsLoading } = useWards();
  const { data: census } = useWardCensus();
  const {
    data: beds,
    isLoading: bedsLoading,
    refetch,
  } = useBedsByWard(wardId || '');
  const updateBedStatus = useUpdateBedStatus();

  const selectedWard = wards?.find((w) => w.id === wardId);
  const selectedWardCensus = census?.find((c) => c.ward_id === wardId);

  const filteredBeds = beds?.filter(
    (b) => statusFilter === 'all' || b.status === statusFilter,
  );

  const handleStatusChange = async (bedId: string, newStatus: BedStatus) => {
    try {
      await updateBedStatus.mutateAsync({ bedId, status: newStatus });
      setSelectedBed(null);
    } catch (error) {
      console.error('Failed to update bed status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Ward Selector and Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Ward Dropdown */}
            <div className="relative">
              <select
                value={wardId || ''}
                onChange={(e) => onWardChange(e.target.value || null)}
                className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a Ward</option>
                {wards?.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name} ({ward.ward_type})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            {wardId && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <div className="flex gap-1">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {(Object.keys(statusConfig) as BedStatus[]).map((status) => {
                    const config = statusConfig[status];
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          statusFilter === status
                            ? `${config.bgColor} ${config.color}`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddBed}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Bed
            </button>
            {wardId && (
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ward Info */}
      {selectedWard && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedWard.name}
              </h2>
              <p className="text-sm text-gray-500 capitalize">
                {selectedWard.ward_type.replace('_', ' ')} Ward
                {selectedWard.floor_number &&
                  ` • Floor ${selectedWard.floor_number}`}
                {selectedWard.building && ` • ${selectedWard.building}`}
              </p>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedWard.total_beds}
                </p>
                <p className="text-xs text-gray-500">Total Beds</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {selectedWard.available_beds}
                </p>
                <p className="text-xs text-gray-500">Available</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedWardCensus?.occupied_beds ??
                    selectedWard.total_beds - selectedWard.available_beds}
                </p>
                <p className="text-xs text-gray-500">Occupied</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Ward Selected */}
      {!wardId && (
        <div className="bg-white rounded-xl border p-16 text-center">
          <Bed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a Ward
          </h3>
          <p className="text-gray-500">
            Choose a ward from the dropdown to view and manage beds
          </p>
        </div>
      )}

      {/* Bed Grid */}
      {wardId && bedsLoading && (
        <div className="grid grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl aspect-square" />
            </div>
          ))}
        </div>
      )}

      {wardId && !bedsLoading && filteredBeds && (
        <div className="grid grid-cols-6 gap-4">
          {filteredBeds.map((bed) => {
            const config = statusConfig[bed.status] || statusConfig.Available;
            const Icon = config.icon;

            return (
              <div
                key={bed.id}
                onClick={() => setSelectedBed(bed)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${config.bgColor}
                  ${selectedBed?.id === bed.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  hover:shadow-md
                `}
              >
                <div className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${config.color}`} />
                  <p className="font-bold text-gray-900">{bed.bed_number}</p>
                  <p className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </p>
                </div>

                {/* Patient name if occupied */}
                {bed.status === 'Occupied' && bed.current_patient && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs font-medium text-blue-900 truncate">
                      {bed.current_patient.first_name}{' '}
                      {bed.current_patient.surname}
                    </p>
                    <p className="text-xs text-blue-600 truncate">
                      {bed.current_patient.patient_id}
                    </p>
                  </div>
                )}

                {/* Bed features badges */}
                {bed.features && bed.features.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {bed.features.slice(0, 2).map((feature, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-white/50 text-xs rounded text-gray-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredBeds.length === 0 && (
            <div className="col-span-6 py-12 text-center text-gray-500">
              No beds match the selected filter
            </div>
          )}
        </div>
      )}

      {/* Bed Details Panel */}
      {selectedBed && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l z-50 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                Bed {selectedBed.bed_number}
              </h3>
              <button
                onClick={() => setSelectedBed(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.keys(statusConfig) as BedStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    return (
                      <button
                        key={status}
                        onClick={() =>
                          handleStatusChange(selectedBed.id, status)
                        }
                        disabled={
                          (status === 'Occupied' &&
                            selectedBed.status !== 'Occupied') ||
                          updateBedStatus.isPending
                        }
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                          ${
                            selectedBed.status === status
                              ? `${config.bgColor} ${config.color} border-current`
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bed Type */}
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Bed Type
                </label>
                <p className="mt-1 text-gray-900 capitalize">
                  {selectedBed.bed_type}
                </p>
              </div>

              {/* Daily Rate */}
              {selectedBed.daily_rate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Daily Rate
                  </label>
                  <p className="mt-1 text-gray-900">
                    ₦ {selectedBed.daily_rate.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Features */}
              {selectedBed.features && selectedBed.features.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Features
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedBed.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-sm text-gray-700 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t space-y-2">
                {selectedBed.status === 'Available' && (
                  <button
                    onClick={() => {
                      onAdmitToBed(selectedBed.id);
                      setSelectedBed(null);
                    }}
                    className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Admit Patient to Bed
                  </button>
                )}
                {selectedBed.status === 'Cleaning' && (
                  <button
                    onClick={() =>
                      handleStatusChange(selectedBed.id, 'Available')
                    }
                    className="w-full py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark as Ready
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Legend */}
      <div className="bg-white rounded-xl border p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Bed Status Legend
        </h4>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(statusConfig) as BedStatus[]).map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <div key={status} className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${config.bgColor}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <span className="text-sm text-gray-600">{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BedManagement;
