import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Shield } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface SearchableOption {
  id: string;
  name: string;
  code?: string;
  category?: string;
  subCategory?: string;
  price?: number | null;
  extraInfo?: string;
  /** If true, shows NHIS authorization required indicator */
  requiresNhisAuth?: boolean;
}

export interface SearchableMultiSelectProps {
  options: SearchableOption[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  placeholder?: string;
  categoryColorFn?: (category: string) => string;
  subCategoryColorFn?: (subCategory: string) => string;
  formatPrice?: (price: number | null | undefined) => string;
  emptyMessage?: string;
  noResultsMessage?: string;
  maxHeight?: string;
  /** Show selected items as chips inside the search area (default: true) */
  showSelectedChips?: boolean;
  /** Maximum chips to show before collapsing (default: 5) */
  maxChipsVisible?: number;
}

// =============================================================================
// Default Functions
// =============================================================================

const defaultCategoryColor = (category: string) => 'bg-gray-100 text-gray-700';
const defaultSubCategoryColor = (subCategory: string) =>
  'bg-gray-50 text-gray-600 border-gray-200';
const defaultFormatPrice = (price: number | null | undefined) =>
  price != null ? `₦${price.toLocaleString()}` : '';

// =============================================================================
// Component
// =============================================================================

export function SearchableMultiSelect({
  options,
  selectedIds,
  onToggleSelect,
  placeholder = 'Search...',
  categoryColorFn = defaultCategoryColor,
  subCategoryColorFn = defaultSubCategoryColor,
  formatPrice = defaultFormatPrice,
  emptyMessage = 'No options available',
  noResultsMessage = 'No results match your search',
  maxHeight = 'max-h-72',
  showSelectedChips = true,
  maxChipsVisible = 5,
}: SearchableMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected options with their full details
  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));
  const visibleChips = selectedOptions.slice(0, maxChipsVisible);
  const hiddenCount = selectedOptions.length - maxChipsVisible;

  // Filter options based on search query
  const filteredOptions = options.filter((option) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      option.name.toLowerCase().includes(query) ||
      option.code?.toLowerCase().includes(query) ||
      option.category?.toLowerCase().includes(query) ||
      option.subCategory?.toLowerCase().includes(query) ||
      option.extraInfo?.toLowerCase().includes(query)
    );
  });

  const isSelected = (id: string) => selectedIds.includes(id);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when clicking on container
  const handleContainerClick = () => {
    inputRef.current?.focus();
    setIsOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Search Input with Selected Chips */}
      <div
        className={`relative border-2 rounded-lg transition-colors cursor-text ${
          isOpen
            ? 'border-primary-700 ring-1 ring-primary-700/20'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={handleContainerClick}
      >
        {/* Selected Chips Area */}
        {showSelectedChips && selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 pb-0">
            {visibleChips.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-700/10 text-primary-700 text-xs font-medium rounded-md border border-primary-700/20 group"
              >
                <span className="max-w-[150px] truncate">{option.name}</span>
                {option.code && (
                  <span className="text-primary-700/60 text-xs">
                    ({option.code})
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(option.id);
                  }}
                  className="ml-0.5 p-0.5 hover:bg-primary-700/20 rounded transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                +{hiddenCount} more
              </span>
            )}
          </div>
        )}

        {/* Search Input Row */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              selectedOptions.length > 0 ? 'Add more...' : placeholder
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={`w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none bg-transparent ${
              showSelectedChips && selectedOptions.length > 0 ? 'pt-1.5' : ''
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Selected Count Badge (only if chips are hidden) */}
      {!showSelectedChips && selectedIds.length > 0 && (
        <div className="absolute -top-2 -right-2 bg-primary-700 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {selectedIds.length}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg ${maxHeight} overflow-y-auto`}
        >
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              {options.length === 0 ? emptyMessage : noResultsMessage}
            </div>
          ) : (
            <div className="py-1">
              {filteredOptions.map((option) => {
                const selected = isSelected(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onToggleSelect(option.id);
                      // Keep dropdown open for multiple selections
                    }}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      selected ? 'bg-primary-700/5' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium text-sm ${selected ? 'text-primary-700' : 'text-gray-900'}`}
                        >
                          {option.name}
                        </span>
                        {option.code && (
                          <span className="text-xs text-gray-400">
                            ({option.code})
                          </span>
                        )}
                        {/* NHIS Authorization Required Badge */}
                        {option.requiresNhisAuth && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded border border-amber-200"
                            title="Requires NHIS Desk Approval"
                          >
                            <Shield size={10} />
                            NHIS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {option.category && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${categoryColorFn(option.category)}`}
                          >
                            {option.category}
                          </span>
                        )}
                        {option.subCategory && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border ${subCategoryColorFn(option.subCategory)}`}
                          >
                            {option.subCategory}
                          </span>
                        )}
                        {option.extraInfo && (
                          <span className="text-xs text-gray-500">
                            {option.extraInfo}
                          </span>
                        )}
                        {option.price !== undefined && (
                          <span className="text-xs text-gray-500">
                            {formatPrice(option.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`ml-2 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selected
                          ? 'bg-primary-700 border-primary-700'
                          : 'border-gray-300'
                      }`}
                    >
                      {selected && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchableMultiSelect;
