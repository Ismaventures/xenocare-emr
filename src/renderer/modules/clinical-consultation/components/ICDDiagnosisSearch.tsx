/**
 * ICD Diagnosis Search Component
 * Allows doctors to search and select ICD-10 codes for patient diagnoses
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Plus,
  AlertCircle,
  ExternalLink,
  Loader2,
  BookOpen,
  CheckCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useICDSearch, useICDCode } from '../../../hooks/useICD';
import { ICDSearchItem, formatICDCode } from '../../../lib/icd';

// =============================================================================
// Types
// =============================================================================

export interface SelectedDiagnosis {
  code: string;
  title: string;
  type: 'primary' | 'secondary' | 'differential';
  notes?: string;
}

interface ICDDiagnosisSearchProps {
  /** Currently selected diagnoses */
  selectedDiagnoses: SelectedDiagnosis[];
  /** Callback when diagnoses change */
  onDiagnosesChange: (diagnoses: SelectedDiagnosis[]) => void;
  /** Primary diagnosis (single text field for backward compatibility) */
  primaryDiagnosis?: string;
  /** Callback for primary diagnosis change */
  onPrimaryDiagnosisChange?: (diagnosis: string) => void;
  /** Differential diagnoses array */
  differentialDiagnoses?: string[];
  /** Callback for differential diagnoses change */
  onDifferentialDiagnosesChange?: (diagnoses: string[]) => void;
  /** Whether to show the differential diagnosis section */
  showDifferential?: boolean;
  /** Maximum number of diagnoses allowed */
  maxDiagnoses?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export default function ICDDiagnosisSearch({
  selectedDiagnoses = [],
  onDiagnosesChange,
  primaryDiagnosis = '',
  onPrimaryDiagnosisChange,
  differentialDiagnoses = [],
  onDifferentialDiagnosesChange,
  showDifferential = true,
  maxDiagnoses = 10,
  placeholder = 'Search ICD-10 codes or type diagnosis...',
  disabled = false,
  className = '',
}: ICDDiagnosisSearchProps) {
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingType, setAddingType] = useState<
    'primary' | 'secondary' | 'differential'
  >('primary');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [expandDifferential, setExpandDifferential] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ICD Search Query
  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = useICDSearch(debouncedSearch);

  // ICD Code Details Query (for showing details)
  const { data: codeDetails, isLoading: loadingDetails } =
    useICDCode(showDetails);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isDropdownOpen || !searchResults?.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, searchResults.length - 1),
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelectCode(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsDropdownOpen(false);
          break;
      }
    },
    [isDropdownOpen, searchResults, selectedIndex],
  );

  // Handle selecting a code
  const handleSelectCode = (item: ICDSearchItem) => {
    const formattedDiagnosis = `${item.code} - ${item.title}`;

    if (addingType === 'primary') {
      // Update primary diagnosis
      if (onPrimaryDiagnosisChange) {
        onPrimaryDiagnosisChange(formattedDiagnosis);
      }
      // Also add to selected diagnoses if using the structured approach
      const newDiagnosis: SelectedDiagnosis = {
        code: item.code,
        title: item.title,
        type: 'primary',
      };
      const filtered = selectedDiagnoses.filter((d) => d.type !== 'primary');
      onDiagnosesChange([newDiagnosis, ...filtered]);
    } else if (addingType === 'differential') {
      // Update differential diagnoses
      if (onDifferentialDiagnosesChange) {
        const newDifferentials = [...differentialDiagnoses, formattedDiagnosis];
        onDifferentialDiagnosesChange(newDifferentials);
      }
      // Also add to selected diagnoses
      const newDiagnosis: SelectedDiagnosis = {
        code: item.code,
        title: item.title,
        type: 'differential',
      };
      onDiagnosesChange([...selectedDiagnoses, newDiagnosis]);
    } else {
      // Secondary diagnosis
      const newDiagnosis: SelectedDiagnosis = {
        code: item.code,
        title: item.title,
        type: 'secondary',
      };
      onDiagnosesChange([...selectedDiagnoses, newDiagnosis]);
    }

    // Reset search
    setSearchTerm('');
    setIsDropdownOpen(false);
    setSelectedIndex(0);
  };

  // Handle removing a diagnosis
  const handleRemoveDiagnosis = (index: number) => {
    const diagnosis = selectedDiagnoses[index];

    if (diagnosis.type === 'primary' && onPrimaryDiagnosisChange) {
      onPrimaryDiagnosisChange('');
    } else if (
      diagnosis.type === 'differential' &&
      onDifferentialDiagnosesChange
    ) {
      const newDifferentials = differentialDiagnoses.filter(
        (d) => !d.includes(diagnosis.code),
      );
      onDifferentialDiagnosesChange(newDifferentials);
    }

    const newDiagnoses = [...selectedDiagnoses];
    newDiagnoses.splice(index, 1);
    onDiagnosesChange(newDiagnoses);
  };

  // Handle manual text entry (fallback for custom diagnoses)
  const handleAddCustomDiagnosis = () => {
    if (!searchTerm.trim()) return;

    const customDiagnosis: SelectedDiagnosis = {
      code: 'CUSTOM',
      title: searchTerm.trim(),
      type: addingType,
    };

    if (addingType === 'primary') {
      if (onPrimaryDiagnosisChange) {
        onPrimaryDiagnosisChange(searchTerm.trim());
      }
      const filtered = selectedDiagnoses.filter((d) => d.type !== 'primary');
      onDiagnosesChange([customDiagnosis, ...filtered]);
    } else if (addingType === 'differential') {
      if (onDifferentialDiagnosesChange) {
        onDifferentialDiagnosesChange([
          ...differentialDiagnoses,
          searchTerm.trim(),
        ]);
      }
      onDiagnosesChange([...selectedDiagnoses, customDiagnosis]);
    } else {
      onDiagnosesChange([...selectedDiagnoses, customDiagnosis]);
    }

    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  // Get primary diagnosis from selected
  const primaryDx = selectedDiagnoses.find((d) => d.type === 'primary');
  const secondaryDxs = selectedDiagnoses.filter((d) => d.type === 'secondary');
  const differentialDxs = selectedDiagnoses.filter(
    (d) => d.type === 'differential',
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Diagnosis Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Primary Diagnosis
          </label>
          {primaryDx && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              ICD-10 Coded
            </span>
          )}
        </div>

        {/* Current Primary Diagnosis Display */}
        {(primaryDiagnosis || primaryDx) && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-1">
              <span className="font-mono text-sm font-medium text-green-700">
                {primaryDx?.code || 'CUSTOM'}
              </span>
              <span className="text-sm text-gray-700 ml-2">
                {primaryDx?.title || primaryDiagnosis}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onPrimaryDiagnosisChange) onPrimaryDiagnosisChange('');
                onDiagnosesChange(
                  selectedDiagnoses.filter((d) => d.type !== 'primary'),
                );
              }}
              className="p-1 hover:bg-green-100 rounded"
              disabled={disabled}
            >
              <X className="h-4 w-4 text-green-600" />
            </button>
          </div>
        )}

        {/* Search Input */}
        {!primaryDiagnosis && !primaryDx && (
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  setAddingType('primary');
                }}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  setAddingType('primary');
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg hover:border-gray-300 focus:border-primary-700 focus:ring-0 transition-all text-sm"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {isDropdownOpen && searchTerm.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
                {searchError ? (
                  <div className="p-4 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Failed to search ICD codes. You can type a custom diagnosis.
                  </div>
                ) : isSearching ? (
                  <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching ICD-10 codes...
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <>
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500">
                      {searchResults.length} ICD-10 codes found
                    </div>
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.code}-${index}`}
                        type="button"
                        onClick={() => handleSelectCode(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-b-0 ${
                          selectedIndex === index ? 'bg-green-50' : ''
                        }`}
                      >
                        <span className="font-mono text-sm font-semibold text-primary-700 whitespace-nowrap">
                          {result.code}
                        </span>
                        <span className="text-sm text-gray-700 flex-1">
                          {result.title}
                        </span>
                      </button>
                    ))}
                  </>
                ) : searchTerm.length >= 2 ? (
                  <div className="p-4">
                    <p className="text-sm text-gray-500 mb-3">
                      No ICD-10 codes found for "{searchTerm}"
                    </p>
                    <button
                      type="button"
                      onClick={handleAddCustomDiagnosis}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center gap-2 text-primary-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add "{searchTerm}" as custom diagnosis
                    </button>
                  </div>
                ) : null}

                {/* Add custom option */}
                {searchResults && searchResults.length > 0 && searchTerm && (
                  <div className="px-3 py-2 bg-gray-50 border-t">
                    <button
                      type="button"
                      onClick={handleAddCustomDiagnosis}
                      className="text-xs text-gray-500 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Can't find it? Add "{searchTerm}" as custom
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Differential Diagnoses Section */}
      {showDifferential && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setExpandDifferential(!expandDifferential)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-800"
          >
            {expandDifferential ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            Differential Diagnoses (
            {differentialDxs.length + differentialDiagnoses.length})
          </button>

          {expandDifferential && (
            <div className="space-y-2 pl-2 border-l-2 border-gray-200">
              {/* Existing Differential Diagnoses */}
              {(differentialDiagnoses.length > 0 ||
                differentialDxs.length > 0) && (
                <div className="space-y-1">
                  {differentialDiagnoses.map((dx, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
                    >
                      <span className="flex-1">{dx}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onDifferentialDiagnosesChange) {
                            const newDiffs = [...differentialDiagnoses];
                            newDiffs.splice(index, 1);
                            onDifferentialDiagnosesChange(newDiffs);
                          }
                        }}
                        className="p-1 hover:bg-yellow-100 rounded"
                        disabled={disabled}
                      >
                        <X className="h-3 w-3 text-yellow-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Differential Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search to add differential diagnosis..."
                  value={addingType === 'differential' ? searchTerm : ''}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setAddingType('differential');
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setAddingType('differential');
                    setIsDropdownOpen(true);
                  }}
                  disabled={disabled}
                  className="w-full pl-3 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary-700 focus:ring-0"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ICD Code Details Modal/Popup */}
      {showDetails && codeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between bg-primary-700 text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="font-semibold">ICD-10 Code Details</span>
              </div>
              <button
                onClick={() => setShowDetails(null)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <span className="font-mono text-2xl font-bold text-primary-700">
                  {codeDetails.code}
                </span>
                <h3 className="text-lg font-medium mt-1">
                  {codeDetails.title}
                </h3>
              </div>

              {codeDetails.definition && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600">
                    Definition
                  </h4>
                  <p className="text-sm text-gray-700">
                    {codeDetails.definition}
                  </p>
                </div>
              )}

              {codeDetails.inclusions && codeDetails.inclusions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600">
                    Includes
                  </h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {codeDetails.inclusions.map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {codeDetails.exclusions && codeDetails.exclusions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600">
                    Excludes
                  </h4>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {codeDetails.exclusions.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {codeDetails.browserUrl && (
                <a
                  href={codeDetails.browserUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on WHO ICD Browser
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Multi-Select ICD Search Component (like Drug Search)
// =============================================================================

export interface ICDMultiSelectDiagnosis {
  code: string;
  title: string;
}

interface ICDMultiSelectProps {
  /** Selected diagnoses */
  selectedDiagnoses: ICDMultiSelectDiagnosis[];
  /** Callback when diagnoses change */
  onChange: (diagnoses: ICDMultiSelectDiagnosis[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum number of diagnoses */
  maxDiagnoses?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Label */
  label?: string;
}

/**
 * Multi-select ICD search - works like the drug search
 * Search and select multiple diagnoses with checkbox-style selection
 */
export function ICDMultiSelect({
  selectedDiagnoses = [],
  onChange,
  placeholder = 'Search ICD-10 codes...',
  maxDiagnoses = 20,
  disabled = false,
  className = '',
  label = 'Diagnoses',
}: ICDMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const {
    data: searchResults,
    isLoading,
    error: searchError,
  } = useICDSearch(debouncedSearch);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if a diagnosis is already selected
  const isSelected = (code: string) =>
    selectedDiagnoses.some((d) => d.code === code);

  // Toggle selection of a diagnosis
  const handleToggleSelect = (item: ICDSearchItem) => {
    if (isSelected(item.code)) {
      // Remove it
      onChange(selectedDiagnoses.filter((d) => d.code !== item.code));
    } else {
      // Add it (if under max)
      if (selectedDiagnoses.length < maxDiagnoses) {
        onChange([
          ...selectedDiagnoses,
          { code: item.code, title: item.title },
        ]);
      }
    }
  };

  // Remove a selected diagnosis
  const handleRemove = (code: string) => {
    onChange(selectedDiagnoses.filter((d) => d.code !== code));
  };

  // Add custom diagnosis
  const handleAddCustom = () => {
    if (!searchTerm.trim() || selectedDiagnoses.length >= maxDiagnoses) return;

    // Check if it's not already added
    const customCode = `CUSTOM-${Date.now()}`;
    if (
      !selectedDiagnoses.some(
        (d) => d.title.toLowerCase() === searchTerm.trim().toLowerCase(),
      )
    ) {
      onChange([
        ...selectedDiagnoses,
        { code: customCode, title: searchTerm.trim() },
      ]);
    }
    setSearchTerm('');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {label}
          </label>
          {selectedDiagnoses.length > 0 && (
            <span className="text-xs text-primary-700 font-medium">
              {selectedDiagnoses.length} selected
            </span>
          )}
        </div>
      )}

      {/* Selected Diagnoses Tags */}
      {selectedDiagnoses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDiagnoses.map((diagnosis) => (
            <div
              key={diagnosis.code}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-700/10 border border-primary-700/20 rounded-lg text-sm"
            >
              {!diagnosis.code.startsWith('CUSTOM') && (
                <span className="font-mono font-semibold text-primary-700">
                  {diagnosis.code}
                </span>
              )}
              <span
                className="text-gray-700 max-w-[200px] truncate"
                title={diagnosis.title}
              >
                {diagnosis.title}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(diagnosis.code)}
                disabled={disabled}
                className="p-0.5 hover:bg-primary-700/20 rounded-full transition-colors"
              >
                <X className="h-3.5 w-3.5 text-primary-700" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={placeholder}
            disabled={disabled || selectedDiagnoses.length >= maxDiagnoses}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:ring-0 focus:border-primary-700 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
          {searchTerm && !isLoading && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Selected count badge */}
        {selectedDiagnoses.length > 0 && (
          <div className="absolute -top-2 -right-2 bg-primary-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {selectedDiagnoses.length}
          </div>
        )}

        {/* Dropdown Results */}
        {isDropdownOpen && searchTerm.length >= 2 && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
            {searchError ? (
              <div className="p-4 space-y-3">
                <div className="text-sm text-amber-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  ICD-10 service unavailable — type a custom diagnosis below
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center gap-2 text-primary-700 border border-primary-700/20"
                >
                  <Plus className="h-4 w-4" />
                  Add "{searchTerm}" as custom diagnosis
                </button>
              </div>
            ) : isLoading ? (
              <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching ICD-10 codes...
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="py-1">
                <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500">
                  {searchResults.length} codes found - click to select
                </div>
                {searchResults.map((result, index) => {
                  const selected = isSelected(result.code);
                  return (
                    <button
                      key={`${result.code}-${index}`}
                      type="button"
                      onClick={() => handleToggleSelect(result)}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selected ? 'bg-primary-700/5' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm font-semibold ${selected ? 'text-primary-700' : 'text-gray-700'}`}
                          >
                            {result.code}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">
                          {result.title}
                        </p>
                      </div>
                      <div
                        className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selected
                            ? 'bg-primary-700 border-primary-700'
                            : 'border-gray-300'
                        }`}
                      >
                        {selected && (
                          <CheckCircle
                            className="w-3 h-3 text-white"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Add custom option */}
                <div className="px-3 py-2 bg-gray-50 border-t">
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="text-xs text-gray-500 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Can't find it? Add "{searchTerm}" as custom diagnosis
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-3">
                  No ICD-10 codes found for "{searchTerm}"
                </p>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 rounded flex items-center gap-2 text-primary-700 border border-primary-700/20"
                >
                  <Plus className="h-4 w-4" />
                  Add "{searchTerm}" as custom diagnosis
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper text */}
      {selectedDiagnoses.length >= maxDiagnoses && (
        <p className="text-xs text-amber-600">
          Maximum {maxDiagnoses} diagnoses allowed
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Simple Inline Search Component
// =============================================================================

interface ICDInlineSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Simple inline ICD search that outputs formatted "CODE - Title" string
 * Use this as a drop-in replacement for a textarea
 */
export function ICDInlineSearch({
  value,
  onChange,
  placeholder = 'Search ICD-10 codes or type diagnosis...',
  disabled = false,
  className = '',
}: ICDInlineSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: searchResults, isLoading } = useICDSearch(debouncedSearch);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: ICDSearchItem) => {
    onChange(`${item.code} - ${item.title}`);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || !searchResults?.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, searchResults.length - 1),
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        break;
    }
  };

  // If there's already a value, show it with option to clear/change
  if (value) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 p-2.5 border-2 border-gray-200 rounded-md bg-gray-50">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="flex-1 text-sm">{value}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 hover:bg-gray-200 rounded"
            disabled={disabled}
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-md hover:border-gray-300 focus:ring-0 focus:border-primary-700 transition-all text-sm"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {isDropdownOpen && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            searchResults.map((result, index) => (
              <button
                key={`${result.code}-${index}`}
                type="button"
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0 ${
                  selectedIndex === index ? 'bg-green-50' : ''
                }`}
              >
                <span className="font-mono text-sm font-semibold text-primary-700 whitespace-nowrap">
                  {result.code}
                </span>
                <span className="text-sm text-gray-700 flex-1">
                  {result.title}
                </span>
              </button>
            ))
          ) : (
            <div className="p-3">
              <p className="text-sm text-gray-500 mb-2">No ICD codes found</p>
              <button
                type="button"
                onClick={() => {
                  onChange(searchTerm);
                  setSearchTerm('');
                  setIsDropdownOpen(false);
                }}
                className="text-sm text-primary-700 hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Use "{searchTerm}" as custom diagnosis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
