/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - CLINIC LIST COMPONENT
 * Description: Component for displaying and managing clinics
 * =============================================================================
 */

import React, { useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Clock,
  DollarSign,
} from 'lucide-react';
import { SkeletonList } from '../../../components/ui/SkeletonLoader';
import { Clinic } from '../dtos/encounter.dto';
import {
  useClinics,
  useToggleClinicStatus,
  useDeleteClinic,
} from '../hooks/useEncounter';

interface ClinicListProps {
  onAddClinic?: () => void;
  onEditClinic?: (clinic: Clinic) => void;
}

const ClinicList: React.FC<ClinicListProps> = ({
  onAddClinic,
  onEditClinic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: clinics = [], isLoading } = useClinics({
    query: searchQuery,
    is_active: showInactive ? undefined : true,
  });

  const toggleStatus = useToggleClinicStatus();
  const deleteClinic = useDeleteClinic();

  const handleToggleStatus = async (clinic: Clinic) => {
    try {
      await toggleStatus.mutateAsync({
        clinicId: clinic.clinic_id,
        isActive: !clinic.is_active,
      });
    } catch (error) {
      console.error('Error toggling clinic status:', error);
    }
  };

  const handleDeleteClinic = async (clinicId: string) => {
    if (!confirm('Are you sure you want to delete this clinic?')) return;

    try {
      await deleteClinic.mutateAsync(clinicId);
    } catch (error) {
      console.error('Error deleting clinic:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonList count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clinics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          {/* Show Inactive Toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-primary-700 focus:ring-primary-700"
            />
            Show Inactive
          </label>
        </div>

        {/* Add Button */}
        <button
          onClick={onAddClinic}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Clinic
        </button>
      </div>

      {/* Clinics Grid */}
      {clinics.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-gray-500">
          <Building2 className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium">No clinics found</p>
          <p className="text-sm">
            {searchQuery
              ? 'Try a different search term'
              : 'Add a clinic to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clinics.map((clinic) => (
            <div
              key={clinic.clinic_id}
              className={`rounded-xl border-2 bg-white p-5 transition-all hover:shadow-md ${
                clinic.is_active
                  ? 'border-gray-200'
                  : 'border-gray-100 bg-gray-50 opacity-75'
              }`}
            >
              {/* Clinic Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      clinic.is_active
                        ? 'bg-primary-700/10 text-primary-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {clinic.clinic_name}
                    </h3>
                    <p className="font-mono text-xs text-gray-500">
                      {clinic.clinic_code}
                    </p>
                  </div>
                </div>

                {/* Status Toggle */}
                <button
                  onClick={() => handleToggleStatus(clinic)}
                  className={`rounded p-1 transition-colors ${
                    clinic.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={clinic.is_active ? 'Deactivate' : 'Activate'}
                >
                  {clinic.is_active ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </button>
              </div>

              {/* Description */}
              {clinic.description && (
                <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                  {clinic.description}
                </p>
              )}

              {/* Details */}
              <div className="mb-4 space-y-2 text-sm">
                {clinic.location && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>{clinic.location}</span>
                  </div>
                )}
                {clinic.operating_hours && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{clinic.operating_hours}</span>
                  </div>
                )}
              </div>

              {/* Fees */}
              <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">New Visit</p>
                  <p className="font-semibold text-primary-700">
                    ₦{clinic.consultation_fee.toLocaleString()}
                  </p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-xs text-gray-500">Follow-Up</p>
                  <p className="font-semibold text-blue-600">
                    ₦{clinic.follow_up_fee.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Emergency</p>
                  <p className="font-semibold text-red-600">
                    ₦{clinic.emergency_fee.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onEditClinic?.(clinic)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClinic(clinic.clinic_id)}
                  className="flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClinicList;
