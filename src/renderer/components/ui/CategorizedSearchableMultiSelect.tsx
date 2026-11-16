import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Check,
  ChevronDown,
  Layers,
  Filter,
  Shield,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface CategorizedOption {
  id: string;
  name: string;
  code?: string;
  category?: string;
  subCategory?: string;
  price?: number | null;
  extraInfo?: string;
  /** If true, shows NHIS authorization required badge */
  requiresNhisAuth?: boolean;
}

export interface CategoryConfig {
  name: string;
  color: string;
  bgColor: string;
  icon?: React.ReactNode;
}

export interface CategorizedSearchableMultiSelectProps {
  options: CategorizedOption[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  placeholder?: string;
  /** Custom category configuration for colors/icons */
  categoryConfig?: Record<string, CategoryConfig>;
  formatPrice?: (price: number | null | undefined) => string;
  emptyMessage?: string;
  noResultsMessage?: string;
  maxHeight?: string;
  /** Show selected items as chips inside the search area */
  showSelectedChips?: boolean;
  /** Maximum chips to show before collapsing */
  maxChipsVisible?: number;
  /** Label for all categories tab */
  allCategoriesLabel?: string;
  /** Enable category filter tabs (default: true) */
  showCategoryTabs?: boolean;
}

// =============================================================================
// Default Category Colors
// =============================================================================

const DEFAULT_CATEGORY_COLORS: Record<string, CategoryConfig> = {
  // Lab Categories
  Hematology: {
    name: 'Hematology',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  'Clinical Chemistry': {
    name: 'Clinical Chemistry',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  Microbiology: {
    name: 'Microbiology',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  Parasitology: {
    name: 'Parasitology',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  Serology: {
    name: 'Serology',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  Urinalysis: {
    name: 'Urinalysis',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  Histopathology: {
    name: 'Histopathology',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
  },
  Endocrinology: {
    name: 'Endocrinology',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  Molecular: {
    name: 'Molecular',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
  },
  Coagulation: {
    name: 'Coagulation',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  'Blood Bank': {
    name: 'Blood Bank',
    color: 'text-rose-700',
    bgColor: 'bg-rose-100',
  },
  Hormones: {
    name: 'Hormones',
    color: 'text-violet-700',
    bgColor: 'bg-violet-100',
  },
  // Imaging Categories (Modalities)
  'X-Ray': { name: 'X-Ray', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  Ultrasound: {
    name: 'Ultrasound',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  MRI: { name: 'MRI', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  CT: { name: 'CT', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  Mammography: {
    name: 'Mammography',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100',
  },
  Fluoroscopy: {
    name: 'Fluoroscopy',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
  },
  Other: { name: 'Other', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  // Drug Categories
  Analgesics: {
    name: 'Analgesics',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  Antibiotics: {
    name: 'Antibiotics',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  Antihypertensives: {
    name: 'Antihypertensives',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  Antidiabetics: {
    name: 'Antidiabetics',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  // Default fallback
  General: { name: 'General', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

const defaultFormatPrice = (price: number | null | undefined) =>
  price != null ? `₦${price.toLocaleString()}` : '';

// =============================================================================
// Component
// =============================================================================

export function CategorizedSearchableMultiSelect({
  options,
  selectedIds,
  onToggleSelect,
  placeholder = 'Search...',
  categoryConfig = DEFAULT_CATEGORY_COLORS,
  formatPrice = defaultFormatPrice,
  emptyMessage = 'No options available',
  noResultsMessage = 'No results match your search',
  maxHeight = 'max-h-80',
  showSelectedChips = true,
  maxChipsVisible = 5,
  allCategoriesLabel = 'All',
  showCategoryTabs = true,
}: CategorizedSearchableMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories from options
  const categories = useMemo(() => {
    const cats = new Set<string>();
    options.forEach((opt) => {
      if (opt.category) cats.add(opt.category);
    });
    return Array.from(cats).sort();
  }, [options]);

  // Get category config helper
  const getCategoryConfig = (category: string): CategoryConfig => {
    return (
      categoryConfig[category] ||
      DEFAULT_CATEGORY_COLORS[category] || {
        name: category,
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
      }
    );
  };

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    options.forEach((opt) => {
      const cat = opt.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [options]);

  // Get selected options with their full details
  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));
  const visibleChips = selectedOptions.slice(0, maxChipsVisible);
  const hiddenCount = selectedOptions.length - maxChipsVisible;

  // Filter options based on search query AND selected category
  const filteredOptions = useMemo(() => {
    return options.filter((option) => {
      // Category filter
      if (selectedCategory && option.category !== selectedCategory) {
        return false;
      }

      // Search filter
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
  }, [options, searchQuery, selectedCategory]);

  // Group filtered options by category for display
  const groupedOptions = useMemo(() => {
    const groups: Record<string, CategorizedOption[]> = {};
    filteredOptions.forEach((opt) => {
      const cat = opt.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(opt);
    });
    return groups;
  }, [filteredOptions]);

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
            {visibleChips.map((option) => {
              const config = getCategoryConfig(option.category || 'General');
              return (
                <span
                  key={option.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border group ${option.requiresNhisAuth ? 'bg-amber-50 text-amber-800 border-amber-200' : `${config.bgColor} ${config.color} border-current/20`}`}
                >
                  {option.requiresNhisAuth && (
                    <Shield size={10} className="text-amber-600" />
                  )}
                  <span className="max-w-[120px] truncate">{option.name}</span>
                  {option.code && (
                    <span className="opacity-60 text-xs">({option.code})</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(option.id);
                    }}
                    className="ml-0.5 p-0.5 hover:bg-black/10 rounded transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
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
          {(searchQuery || selectedCategory) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
              title="Clear filters"
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
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Category Filter Tabs */}
          {showCategoryTabs && categories.length > 1 && (
            <div className="border-b border-gray-200 bg-gray-50 p-2">
              <div className="flex items-center gap-1 mb-2">
                <Filter size={14} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-600">
                  Filter by category:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {/* All Categories Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(null);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedCategory === null
                      ? 'bg-primary-700 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {allCategoriesLabel} ({options.length})
                </button>

                {/* Category Buttons */}
                {categories.map((cat) => {
                  const config = getCategoryConfig(cat);
                  const count = categoryCounts[cat] || 0;
                  const isActive = selectedCategory === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(isActive ? null : cat);
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        isActive
                          ? `${config.bgColor} ${config.color} shadow-sm ring-1 ring-current/20`
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className={`${maxHeight} overflow-y-auto`}>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                {options.length === 0 ? emptyMessage : noResultsMessage}
              </div>
            ) : (
              <div className="py-1">
                {/* Render options grouped by category */}
                {Object.entries(groupedOptions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, categoryOptions]) => {
                    const config = getCategoryConfig(category);

                    return (
                      <div key={category}>
                        {/* Category Header (only show if not filtering by category) */}
                        {!selectedCategory && categories.length > 1 && (
                          <div
                            className={`sticky top-0 px-3 py-1.5 ${config.bgColor} border-y border-gray-100 flex items-center gap-2`}
                          >
                            <Layers size={12} className={config.color} />
                            <span
                              className={`text-xs font-semibold ${config.color}`}
                            >
                              {category}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({categoryOptions.length})
                            </span>
                          </div>
                        )}

                        {/* Category Options */}
                        {categoryOptions.map((option) => {
                          const selected = isSelected(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                onToggleSelect(option.id);
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
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {option.subCategory && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                      {option.subCategory}
                                    </span>
                                  )}
                                  {option.extraInfo && (
                                    <span className="text-xs text-gray-500">
                                      {option.extraInfo}
                                    </span>
                                  )}
                                  {option.price !== undefined &&
                                    option.price > 0 && (
                                      <span className="text-xs text-emerald-600 font-medium">
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
                    );
                  })}
              </div>
            )}
          </div>

          {/* Footer with count */}
          {filteredOptions.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between text-xs text-gray-500">
              <span>
                {selectedCategory
                  ? `Showing ${filteredOptions.length} in ${selectedCategory}`
                  : `${filteredOptions.length} items available`}
              </span>
              {selectedIds.length > 0 && (
                <span className="font-medium text-primary-700">
                  {selectedIds.length} selected
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CategorizedSearchableMultiSelect;
