// =============================================================================
// ChiefComplaintsSection Component
// Structured chief complaints with duration capture
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Minus,
  X,
  Clock,
  Star,
  AlertCircle,
  Search,
  Check,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { DurationUnit, ComplaintCategory } from '../../../types/database.types';
import {
  CHIEF_COMPLAINTS,
  DURATION_UNITS,
  getComplaintCategoryColor,
  getComplaintCategoryLabel,
  ChiefComplaintOption,
} from '../constants/chiefComplaints';

// =============================================================================
// Types
// =============================================================================

export interface SelectedComplaint {
  complaint_id: string;
  complaint_code: string;
  complaint_name: string;
  category: ComplaintCategory;
  is_primary: boolean;
  duration_value: number;
  duration_unit: DurationUnit;
  notes?: string;
  is_custom?: boolean; // For custom complaints not in predefined list
}

interface ChiefComplaintsSectionProps {
  selectedComplaints: SelectedComplaint[];
  onComplaintsChange: (complaints: SelectedComplaint[]) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  error?: string;
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function ChiefComplaintsSection({
  selectedComplaints,
  onComplaintsChange,
  expanded = true,
  onExpandedChange,
  error,
  disabled = false,
}: ChiefComplaintsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    ComplaintCategory | 'All'
  >('All');

  // Duration popup state
  const [pendingComplaint, setPendingComplaint] =
    useState<ChiefComplaintOption | null>(null);
  const [pendingDurationValue, setPendingDurationValue] = useState(1);
  const [pendingDurationUnit, setPendingDurationUnit] =
    useState<DurationUnit>('Days');

  // Custom complaint state (for complaints not in predefined list)
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customComplaintCategory, setCustomComplaintCategory] =
    useState<ComplaintCategory>('General');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(CHIEF_COMPLAINTS.map((c) => c.category))];
    return cats;
  }, []);

  // Filter complaints based on search and category
  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) return []; // Only show when searching
    return CHIEF_COMPLAINTS.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === 'All' || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Check if search query is already selected
  const isSearchQuerySelected = useMemo(() => {
    if (!searchQuery.trim()) return false;
    return selectedComplaints.some(
      (c) =>
        c.complaint_name.toLowerCase() === searchQuery.toLowerCase().trim(),
    );
  }, [searchQuery, selectedComplaints]);

  // Group filtered complaints by category
  const groupedComplaints = useMemo(() => {
    const groups: Record<ComplaintCategory, ChiefComplaintOption[]> = {} as any;
    filteredComplaints.forEach((c) => {
      if (!groups[c.category]) {
        groups[c.category] = [];
      }
      groups[c.category].push(c);
    });
    return groups;
  }, [filteredComplaints]);

  // Check if a complaint is selected
  const isSelected = (complaintCode: string) =>
    selectedComplaints.some((c) => c.complaint_code === complaintCode);

  // Open duration popup for a complaint
  const openDurationPopup = (complaint: ChiefComplaintOption) => {
    if (isSelected(complaint.code)) return;
    setPendingComplaint(complaint);
    setPendingDurationValue(1);
    setPendingDurationUnit('Days');
  };

  // Confirm and add complaint with duration
  const confirmAddComplaint = () => {
    if (!pendingComplaint) return;

    const newComplaint: SelectedComplaint = {
      complaint_id: pendingComplaint.id,
      complaint_code: pendingComplaint.code,
      complaint_name: pendingComplaint.name,
      category: pendingComplaint.category,
      is_primary: selectedComplaints.length === 0, // First one is primary
      duration_value: pendingDurationValue,
      duration_unit: pendingDurationUnit,
    };

    onComplaintsChange([...selectedComplaints, newComplaint]);
    setPendingComplaint(null);
    setSearchQuery('');
  };

  // Cancel duration popup
  const cancelDurationPopup = () => {
    setPendingComplaint(null);
    setIsAddingCustom(false);
  };

  // Add a complaint (kept for removing - now just opens popup)
  const addComplaint = (complaint: ChiefComplaintOption) => {
    openDurationPopup(complaint);
  };

  // Open popup for adding custom complaint
  const openCustomComplaintPopup = () => {
    if (!searchQuery.trim() || isSearchQuerySelected) return;
    setIsAddingCustom(true);
    setPendingDurationValue(1);
    setPendingDurationUnit('Days');
    setCustomComplaintCategory('General');
  };

  // Confirm and add custom complaint
  const confirmAddCustomComplaint = () => {
    if (!searchQuery.trim()) return;

    // Generate a custom code
    const customCode = `CUSTOM-${Date.now()}`;

    const newComplaint: SelectedComplaint = {
      complaint_id: customCode, // Will need to create in DB on save
      complaint_code: customCode,
      complaint_name: searchQuery.trim(),
      category: customComplaintCategory,
      is_primary: selectedComplaints.length === 0,
      duration_value: pendingDurationValue,
      duration_unit: pendingDurationUnit,
      is_custom: true, // Mark as custom for saving to catalogue
    };

    onComplaintsChange([...selectedComplaints, newComplaint]);
    setIsAddingCustom(false);
    setSearchQuery('');
  };

  // Remove a complaint
  const removeComplaint = (complaintCode: string) => {
    const wasRemovalPrimary = selectedComplaints.find(
      (c) => c.complaint_code === complaintCode,
    )?.is_primary;

    let newComplaints = selectedComplaints.filter(
      (c) => c.complaint_code !== complaintCode,
    );

    // If we removed the primary and there are still complaints, make the first one primary
    if (wasRemovalPrimary && newComplaints.length > 0) {
      newComplaints = newComplaints.map((c, idx) => ({
        ...c,
        is_primary: idx === 0,
      }));
    }

    onComplaintsChange(newComplaints);
  };

  // Set as primary
  const setPrimary = (complaintCode: string) => {
    const newComplaints = selectedComplaints.map((c) => ({
      ...c,
      is_primary: c.complaint_code === complaintCode,
    }));
    onComplaintsChange(newComplaints);
  };

  // Update duration
  const updateDuration = (
    complaintCode: string,
    field: 'duration_value' | 'duration_unit',
    value: number | DurationUnit,
  ) => {
    const newComplaints = selectedComplaints.map((c) =>
      c.complaint_code === complaintCode ? { ...c, [field]: value } : c,
    );
    onComplaintsChange(newComplaints);
  };

  // Get primary complaint
  const primaryComplaint = selectedComplaints.find((c) => c.is_primary);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => onExpandedChange?.(!expanded)}
        className={`w-full px-5 py-3 flex items-center justify-between bg-gradient-to-r from-red-50 to-white hover:from-red-100 transition-colors ${
          error ? 'border-b-2 border-red-400' : ''
        }`}
        disabled={disabled}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${error ? 'bg-red-200' : 'bg-red-100'}`}
          >
            <MessageSquare
              className={`h-5 w-5 ${error ? 'text-red-700' : 'text-red-600'}`}
            />
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-gray-900">
              Chief Complaint (Presenting Complaint)
              <span className="text-red-500 ml-1">*</span>
            </h3>
            <p className="text-xs text-gray-500">
              {selectedComplaints.length > 0
                ? `${selectedComplaints.length} complaint${selectedComplaints.length > 1 ? 's' : ''} selected`
                : "Select the main reason for today's visit"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedComplaints.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
              {selectedComplaints.length}
            </span>
          )}
          <div
            className={`p-1.5 rounded-full transition-colors ${
              expanded ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {expanded ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Search and Category Filter */}
          <div className="space-y-3 mt-4">
            {/* Search Container with Chips */}
            <div className="flex gap-2">
              <div
                className={`flex-1 border-2 rounded-lg transition-colors cursor-text ${
                  isDropdownOpen && searchQuery
                    ? 'border-primary-700 ring-1 ring-primary-700/20'
                    : error
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  const input = document.getElementById(
                    'complaint-search-input',
                  );
                  input?.focus();
                }}
              >
                {/* Selected Chips Inside Search */}
                {selectedComplaints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 pb-0">
                    {selectedComplaints.map((complaint) => (
                      <span
                        key={complaint.complaint_code}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border group ${
                          complaint.is_primary
                            ? 'bg-primary-700 text-white border-primary-700'
                            : complaint.is_custom
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-primary-700/10 text-primary-700 border-primary-700/20'
                        }`}
                      >
                        {complaint.is_primary && (
                          <Star className="h-3 w-3" fill="currentColor" />
                        )}
                        {complaint.is_custom && !complaint.is_primary && (
                          <Plus className="h-3 w-3" />
                        )}
                        <span className="max-w-[120px] truncate">
                          {complaint.complaint_name}
                        </span>
                        <span className="text-xs opacity-70">
                          ({complaint.duration_value}
                          {complaint.duration_unit.charAt(0).toLowerCase()})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeComplaint(complaint.complaint_code);
                          }}
                          className={`ml-0.5 p-0.5 rounded transition-colors ${
                            complaint.is_primary
                              ? 'hover:bg-white/20'
                              : 'hover:bg-primary-700/20'
                          }`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search Input Row */}
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    id="complaint-search-input"
                    type="text"
                    placeholder={
                      selectedComplaints.length > 0
                        ? 'Type to search or add complaints...'
                        : 'Type to search complaints...'
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      const { value } = e.target;
                      setSearchQuery(value);
                      // Only open dropdown when there's text
                      setIsDropdownOpen(value.trim().length > 0);
                    }}
                    onBlur={() => {
                      // Delay closing to allow click on dropdown items
                      setTimeout(() => setIsDropdownOpen(false), 200);
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none bg-transparent ${
                      selectedComplaints.length > 0 ? 'pt-1.5' : ''
                    }`}
                    disabled={disabled}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-3 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="relative flex-shrink-0">
                <select
                  value={activeCategory}
                  onChange={(e) => {
                    setActiveCategory(
                      e.target.value as ComplaintCategory | 'All',
                    );
                    setIsDropdownOpen(true);
                  }}
                  className="appearance-none pl-3 pr-8 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-0 focus:border-primary-700 cursor-pointer min-w-[140px] h-full"
                  disabled={disabled}
                >
                  <option value="All">All Categories</option>
                  <option value="General">General</option>
                  <option value="Pain">Pain</option>
                  <option value="Respiratory">Respiratory</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Gastrointestinal">GI</option>
                  <option value="Neurological">Neurological</option>
                  <option value="Genitourinary">Genitourinary</option>
                  <option value="Obstetrics_Gynecology">OB/GYN</option>
                  <option value="Musculoskeletal">MSK</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Mental_Health">Mental Health</option>
                  <option value="Trauma_Emergency">Trauma</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Dropdown */}
            {isDropdownOpen && searchQuery.trim() && (
              <div className="border-2 border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white shadow-lg">
                {/* Show matching complaints */}
                {filteredComplaints.length > 0
                  ? Object.entries(groupedComplaints).map(
                      ([category, complaints]) => (
                        <div key={category}>
                          <div className="sticky top-0 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded ${getComplaintCategoryColor(category as ComplaintCategory)}`}
                            >
                              {getComplaintCategoryLabel(
                                category as ComplaintCategory,
                              )}
                            </span>
                          </div>
                          {complaints.map((complaint) => {
                            const selected = isSelected(complaint.code);
                            return (
                              <button
                                key={complaint.code}
                                type="button"
                                onClick={() => {
                                  if (selected) {
                                    removeComplaint(complaint.code);
                                  } else {
                                    addComplaint(complaint);
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                  selected ? 'bg-primary-700/5' : ''
                                }`}
                                disabled={disabled}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm ${selected ? 'text-primary-700 font-medium' : 'text-gray-900'}`}
                                  >
                                    {complaint.name}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    ({complaint.code})
                                  </span>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    selected
                                      ? 'bg-primary-700 border-primary-700'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {selected && (
                                    <Check
                                      className="w-3 h-3 text-white"
                                      strokeWidth={3}
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ),
                    )
                  : /* No matches - Show Add Custom Option */
                    !isSearchQuerySelected && (
                      <button
                        type="button"
                        onClick={openCustomComplaintPopup}
                        className="w-full text-left px-3 py-3 flex items-center gap-3 bg-amber-50 hover:bg-amber-100 transition-colors"
                        disabled={disabled}
                      >
                        <div className="p-1.5 bg-amber-200 rounded-lg">
                          <Plus className="h-4 w-4 text-amber-700" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-amber-800">
                            Add "{searchQuery.trim()}" as new complaint
                          </span>
                          <p className="text-xs text-amber-600">
                            Not found in list - click to add custom
                          </p>
                        </div>
                      </button>
                    )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {error}
              </p>
            )}

            {/* Duration Popup Modal */}
            {pendingComplaint && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                onClick={cancelDurationPopup}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-80 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary-700/10 rounded-lg">
                        <Clock className="h-4 w-4 text-primary-700" />
                      </div>
                      <h4 className="font-semibold text-gray-900">
                        Set Duration
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={cancelDurationPopup}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Complaint Info */}
                  <div className="p-3 bg-gray-50 rounded-lg mb-4">
                    <p className="font-medium text-gray-900">
                      {pendingComplaint.name}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${getComplaintCategoryColor(pendingComplaint.category)}`}
                    >
                      {getComplaintCategoryLabel(pendingComplaint.category)}
                    </span>
                  </div>

                  {/* Duration Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      How long has this been present?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={pendingDurationUnit === 'Hours' ? 72 : 999}
                        value={pendingDurationValue}
                        onChange={(e) =>
                          setPendingDurationValue(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                        className="flex-1 px-3 py-2.5 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-primary-700"
                        autoFocus
                      />
                      <select
                        value={pendingDurationUnit}
                        onChange={(e) =>
                          setPendingDurationUnit(e.target.value as DurationUnit)
                        }
                        className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-primary-700 bg-white font-medium"
                      >
                        {DURATION_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Duration Buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {[
                      {
                        value: 1,
                        unit: 'Days' as DurationUnit,
                        label: '1 Day',
                      },
                      {
                        value: 2,
                        unit: 'Days' as DurationUnit,
                        label: '2 Days',
                      },
                      {
                        value: 3,
                        unit: 'Days' as DurationUnit,
                        label: '3 Days',
                      },
                      {
                        value: 1,
                        unit: 'Weeks' as DurationUnit,
                        label: '1 Week',
                      },
                      {
                        value: 2,
                        unit: 'Weeks' as DurationUnit,
                        label: '2 Weeks',
                      },
                      {
                        value: 1,
                        unit: 'Months' as DurationUnit,
                        label: '1 Month',
                      },
                    ].map((quick) => (
                      <button
                        key={`${quick.value}-${quick.unit}`}
                        type="button"
                        onClick={() => {
                          setPendingDurationValue(quick.value);
                          setPendingDurationUnit(quick.unit);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                          pendingDurationValue === quick.value &&
                          pendingDurationUnit === quick.unit
                            ? 'bg-primary-700 text-white border-primary-700'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-700 hover:text-primary-700'
                        }`}
                      >
                        {quick.label}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelDurationPopup}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmAddComplaint}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Complaint
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Complaint Popup Modal */}
            {isAddingCustom && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                onClick={cancelDurationPopup}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-96 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Plus className="h-4 w-4 text-amber-700" />
                      </div>
                      <h4 className="font-semibold text-gray-900">
                        Add Custom Complaint
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={cancelDurationPopup}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Custom Complaint Name */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <p className="font-medium text-amber-900">
                      {searchQuery.trim()}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      This will be saved for future use
                    </p>
                  </div>

                  {/* Category Selection */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Select Category
                    </label>
                    <select
                      value={customComplaintCategory}
                      onChange={(e) =>
                        setCustomComplaintCategory(
                          e.target.value as ComplaintCategory,
                        )
                      }
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-primary-700 bg-white font-medium"
                    >
                      <option value="General">General</option>
                      <option value="Pain">Pain</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Gastrointestinal">Gastrointestinal</option>
                      <option value="Neurological">Neurological</option>
                      <option value="Genitourinary">Genitourinary</option>
                      <option value="Obstetrics_Gynecology">
                        Obstetrics & Gynecology
                      </option>
                      <option value="Musculoskeletal">Musculoskeletal</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Mental_Health">Mental Health</option>
                      <option value="Trauma_Emergency">
                        Trauma / Emergency
                      </option>
                    </select>
                  </div>

                  {/* Duration Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      How long has this been present?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={pendingDurationUnit === 'Hours' ? 72 : 999}
                        value={pendingDurationValue}
                        onChange={(e) =>
                          setPendingDurationValue(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                        className="flex-1 px-3 py-2.5 text-center text-lg font-semibold border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-primary-700"
                        autoFocus
                      />
                      <select
                        value={pendingDurationUnit}
                        onChange={(e) =>
                          setPendingDurationUnit(e.target.value as DurationUnit)
                        }
                        className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-0 focus:border-primary-700 bg-white font-medium"
                      >
                        {DURATION_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Duration Buttons */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {[
                      {
                        value: 1,
                        unit: 'Days' as DurationUnit,
                        label: '1 Day',
                      },
                      {
                        value: 2,
                        unit: 'Days' as DurationUnit,
                        label: '2 Days',
                      },
                      {
                        value: 3,
                        unit: 'Days' as DurationUnit,
                        label: '3 Days',
                      },
                      {
                        value: 1,
                        unit: 'Weeks' as DurationUnit,
                        label: '1 Week',
                      },
                      {
                        value: 2,
                        unit: 'Weeks' as DurationUnit,
                        label: '2 Weeks',
                      },
                      {
                        value: 1,
                        unit: 'Months' as DurationUnit,
                        label: '1 Month',
                      },
                    ].map((quick) => (
                      <button
                        key={`custom-${quick.value}-${quick.unit}`}
                        type="button"
                        onClick={() => {
                          setPendingDurationValue(quick.value);
                          setPendingDurationUnit(quick.unit);
                        }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                          pendingDurationValue === quick.value &&
                          pendingDurationUnit === quick.unit
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-500 hover:text-amber-600'
                        }`}
                      >
                        {quick.label}
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelDurationPopup}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmAddCustomComplaint}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Custom
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview Section - Show all selected complaints before submission */}
          {selectedComplaints.length > 0 && (
            <div className="mt-4 border-2 border-dashed border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Preview ({selectedComplaints.length} complaint
                    {selectedComplaints.length > 1 ? 's' : ''})
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Will be saved with consultation
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {selectedComplaints.map((complaint, index) => (
                  <div
                    key={complaint.complaint_code}
                    className={`px-3 py-2.5 flex items-center justify-between ${
                      complaint.is_primary ? 'bg-primary-700/5' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          {complaint.is_primary && (
                            <Star
                              className="h-3.5 w-3.5 text-primary-700"
                              fill="currentColor"
                            />
                          )}
                          <span className="font-medium text-gray-900">
                            {complaint.complaint_name}
                          </span>
                          {complaint.is_custom && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${getComplaintCategoryColor(complaint.category)}`}
                          >
                            {getComplaintCategoryLabel(complaint.category)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {complaint.duration_value}{' '}
                            {complaint.duration_unit.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!complaint.is_primary && (
                        <button
                          type="button"
                          onClick={() => setPrimary(complaint.complaint_code)}
                          className="p-1.5 text-gray-400 hover:text-primary-700 hover:bg-primary-700/10 rounded transition-colors"
                          title="Set as primary"
                          disabled={disabled}
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          removeComplaint(complaint.complaint_code)
                        }
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove"
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Primary Summary */}
              {primaryComplaint && (
                <div className="px-3 py-2 bg-primary-700/10 border-t border-primary-700/20">
                  <p className="text-sm text-primary-700 font-medium">
                    <Star
                      className="inline h-3.5 w-3.5 mr-1"
                      fill="currentColor"
                    />
                    Primary: {primaryComplaint.complaint_name} —{' '}
                    {primaryComplaint.duration_value}{' '}
                    {primaryComplaint.duration_unit.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
