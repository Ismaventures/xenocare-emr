// =============================================================================
// XENOCARE EMR - Add Ward Modal
// Modal form for creating new wards
// =============================================================================

import React, { useState } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import { useCreateWard } from '../hooks/useWards';
import type { WardType } from '../../../types/database.types';
import { isNhisFeatureEnabled } from '../../../config/features';

interface AddWardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const wardTypes: { value: WardType; label: string }[] = [
  { value: 'general', label: 'General Ward' },
  { value: 'icu', label: 'Intensive Care Unit (ICU)' },
  { value: 'pediatric', label: 'Pediatric Ward' },
  { value: 'maternity', label: 'Maternity Ward' },
  { value: 'surgical', label: 'Surgical Ward' },
  { value: 'orthopedic', label: 'Orthopedic Ward' },
  { value: 'cardiac', label: 'Cardiac Care Unit' },
  { value: 'emergency', label: 'Emergency Ward' },
  { value: 'psychiatric', label: 'Psychiatric Ward' },
  { value: 'isolation', label: 'Isolation Ward' },
];

const genderRestrictions = [
  { value: 'none', label: 'No Restriction (Mixed)' },
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
];

const AddWardModal: React.FC<AddWardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    ward_type: 'general' as WardType,
    description: '',
    floor_number: '',
    building: '',
    gender_restriction: 'none',
    nurse_station_phone: '',
    price: '',
    nhis_price: '',
    is_nhis_covered: isNhisFeatureEnabled(),
    nhis_percentage: isNhisFeatureEnabled() ? '70' : '0',
  });
  const [error, setError] = useState<string | null>(null);

  const createWard = useCreateWard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Ward name is required');
      return;
    }

    if (!formData.code.trim()) {
      setError('Ward code is required');
      return;
    }

    try {
      await createWard.mutateAsync({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        ward_type: formData.ward_type,
        description: formData.description.trim() || undefined,
        floor_number: formData.floor_number
          ? parseInt(formData.floor_number)
          : undefined,
        building: formData.building.trim() || undefined,
        nurse_station_phone: formData.nurse_station_phone.trim() || undefined,
      });

      // Reset form
      setFormData({
        name: '',
        code: '',
        ward_type: 'general',
        description: '',
        floor_number: '',
        building: '',
        gender_restriction: 'none',
        nurse_station_phone: '',
        price: '',
        nhis_price: '',
        is_nhis_covered: isNhisFeatureEnabled(),
        nhis_percentage: isNhisFeatureEnabled() ? '70' : '0',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ward');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Add New Ward
              </h2>
              <p className="text-sm text-gray-500">
                Create a new ward in the facility
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ward Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Male Medical Ward"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ward Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                placeholder="e.g., MMW-01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ward Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.ward_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ward_type: e.target.value as WardType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {wardTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender Restriction
            </label>
            <select
              value={formData.gender_restriction}
              onChange={(e) =>
                setFormData({ ...formData, gender_restriction: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {genderRestrictions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the ward"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor Number
              </label>
              <input
                type="number"
                value={formData.floor_number}
                onChange={(e) =>
                  setFormData({ ...formData, floor_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building
              </label>
              <input
                type="text"
                value={formData.building}
                onChange={(e) =>
                  setFormData({ ...formData, building: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Main Building"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nurse Station Phone
            </label>
            <input
              type="text"
              value={formData.nurse_station_phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nurse_station_phone: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., +234-9-123-4567 ext 101"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWard.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createWard.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  Create Ward
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWardModal;
