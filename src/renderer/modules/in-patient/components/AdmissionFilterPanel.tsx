// =============================================================================
// XENOCARE EMR - Admission Filter Panel
// Slide-out filter panel for admissions (similar to billing module)
// =============================================================================

import React from 'react';
import {
  X,
  Calendar,
  CheckCircle,
  User,
  Building2,
  RefreshCcw,
  Filter,
  Activity,
  AlertTriangle,
  Bed,
  Stethoscope,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface AdmissionFilters {
  // Search
  searchQuery: string;

  // Status Filter
  admissionStatus: string;

  // Date Filters
  admissionDateFrom: string;
  admissionDateTo: string;
  dischargeDateFrom: string;
  dischargeDateTo: string;

  // Clinical Filters
  acuityLevel: string;
  admissionType: string;

  // Location Filters
  wardId: string;

  // Discharge Filters
  dischargeType: string;
}

export const defaultAdmissionFilters: AdmissionFilters = {
  searchQuery: '',
  admissionStatus: 'all',
  admissionDateFrom: '',
  admissionDateTo: '',
  dischargeDateFrom: '',
  dischargeDateTo: '',
  acuityLevel: 'all',
  admissionType: 'all',
  wardId: 'all',
  dischargeType: 'all',
};

interface AdmissionFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdmissionFilters;
  onFiltersChange: (filters: AdmissionFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  wardList?: Array<{ id: string; name: string }>;
}

// =============================================================================
// Component
// =============================================================================

export function AdmissionFilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  wardList = [],
}: AdmissionFilterPanelProps) {
  const updateFilter = <K extends keyof AdmissionFilters>(
    key: K,
    value: AdmissionFilters[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Get active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
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

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel - From Right */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Filter Admissions
            </h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Admission Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Admission Status
            </h3>
            <select
              value={filters.admissionStatus}
              onChange={(e) => updateFilter('admissionStatus', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="all">All Admissions</option>
              <option value="admitted">Currently Admitted</option>
              <option value="under_observation">Under Observation</option>
              <option value="critical">Critical</option>
              <option value="stable">Stable</option>
              <option value="improving">Improving</option>
              <option value="discharged">Discharged</option>
              <option value="transferred">Transferred</option>
              <option value="deceased">Deceased</option>
              <option value="absconded">Absconded</option>
            </select>
          </div>

          {/* Admission Date Range Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Admission Date
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.admissionDateFrom}
                  onChange={(e) =>
                    updateFilter('admissionDateFrom', e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.admissionDateTo}
                  onChange={(e) =>
                    updateFilter('admissionDateTo', e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
            </div>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Today', days: 0 },
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'This Month', days: -1 },
                { label: 'Last Month', days: -2 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const today = new Date();
                    let fromDate: Date;
                    let toDate = new Date();

                    if (preset.days === 0) {
                      fromDate = today;
                    } else if (preset.days === -1) {
                      fromDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1,
                      );
                    } else if (preset.days === -2) {
                      fromDate = new Date(
                        today.getFullYear(),
                        today.getMonth() - 1,
                        1,
                      );
                      toDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        0,
                      );
                    } else {
                      fromDate = new Date(today);
                      fromDate.setDate(today.getDate() - preset.days);
                    }

                    updateFilter(
                      'admissionDateFrom',
                      fromDate.toISOString().split('T')[0],
                    );
                    updateFilter(
                      'admissionDateTo',
                      toDate.toISOString().split('T')[0],
                    );
                  }}
                  className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discharge Date Range Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Discharge Date
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dischargeDateFrom}
                  onChange={(e) =>
                    updateFilter('dischargeDateFrom', e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dischargeDateTo}
                  onChange={(e) =>
                    updateFilter('dischargeDateTo', e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Acuity Level Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Acuity Level
            </h3>
            <select
              value={filters.acuityLevel}
              onChange={(e) => updateFilter('acuityLevel', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="all">All Acuity Levels</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Admission Type Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              Admission Type
            </h3>
            <select
              value={filters.admissionType}
              onChange={(e) => updateFilter('admissionType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="all">All Types</option>
              <option value="emergency">Emergency</option>
              <option value="elective">Elective</option>
              <option value="transfer">Transfer</option>
              <option value="observation">Observation</option>
              <option value="maternity">Maternity</option>
              <option value="surgical">Surgical</option>
            </select>
          </div>

          {/* Ward Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Ward
            </h3>
            <select
              value={filters.wardId}
              onChange={(e) => updateFilter('wardId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="all">All Wards</option>
              {wardList.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </div>

          {/* Discharge Type Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-green-500" />
              Discharge Type
            </h3>
            <select
              value={filters.dischargeType}
              onChange={(e) => updateFilter('dischargeType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="all">All Discharge Types</option>
              <option value="home">Home</option>
              <option value="transfer">Transfer to Another Facility</option>
              <option value="against_advice">Against Medical Advice</option>
              <option value="deceased">Deceased</option>
              <option value="absconded">Absconded</option>
            </select>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center gap-3">
          <button
            onClick={onClearFilters}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear All
          </button>
          <button
            onClick={() => {
              onApplyFilters();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

export default AdmissionFilterPanel;
