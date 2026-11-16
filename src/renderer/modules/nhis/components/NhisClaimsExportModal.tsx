/**
 * NHIS Claims Category Export Modal
 * NDC MEDICAL CENTRE EMR - NHIS Module
 *
 * Modal dialog allowing admin to:
 *  1. Select which financial categories to include in the report
 *  2. Choose export format (PDF Standard, PDF Patient Breakdown, Excel, CSV)
 *  3. Preview record counts per category
 *  4. Download the report
 *
 * @version 1.0.0
 * @date March 2, 2026
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Table2,
  CheckSquare,
  Square,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  AlertTriangle,
  TrendingUp,
  Banknote,
  CreditCard,
  Wallet,
  Receipt,
  Lock,
  Columns,
} from 'lucide-react';
import type { NhisComprehensiveClaimsSummary } from '../api/nhis.api';
import {
  type ReportCategory,
  type ReportExportOptions,
  type ExportColumnGroup,
  REPORT_CATEGORY_DEFS,
  buildCategoryReports,
  exportCategoryReport,
  EXPORT_COLUMNS,
  MANDATORY_COLUMN_KEYS,
  DEFAULT_SELECTED_COLUMNS,
  getColumnsByGroup,
} from '../utils/nhis-claims-report-export';

// ==================== TYPES ====================

interface NhisClaimsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimsData: NhisComprehensiveClaimsSummary;
  /** Currently applied filter description */
  filterDescription?: string;
  /** Date range filters */
  reportPeriod?: { start: string; end: string };
  /** Toast notification callback */
  onToast?: (msg: {
    type: 'success' | 'error' | 'warning';
    message: string;
  }) => void;
}

type ExportFormat = 'pdf_summary' | 'pdf_patient_breakdown' | 'excel' | 'csv';

// ==================== CATEGORY ICONS ====================

const CATEGORY_ICONS: Record<ReportCategory, React.ReactNode> = {
  total_claim_value: <TrendingUp size={16} />,
  net_nhis_payable: <Shield size={16} />,
  total_patient_pays: <Wallet size={16} />,
  pending_auth: <AlertTriangle size={16} />,
  cap_capitation: <Banknote size={16} />,
  ffs_fee_for_service: <CreditCard size={16} />,
  copayment: <Receipt size={16} />,
  private_oop: <Users size={16} />,
};

// ==================== FORMAT OPTIONS ====================

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'pdf_summary',
    label: 'PDF — Standard Summary',
    description: 'Claims grouped by authorization status per category',
    icon: <FileText size={18} className="text-red-500" />,
  },
  {
    value: 'pdf_patient_breakdown',
    label: 'PDF — Patient Breakdown',
    description: 'Detailed claims list per patient per category',
    icon: <FileText size={18} className="text-rose-600" />,
  },
  {
    value: 'excel',
    label: 'Excel (.xlsx)',
    description: 'Multi-sheet workbook with summary + per-category sheets',
    icon: <FileSpreadsheet size={18} className="text-green-600" />,
  },
  {
    value: 'csv',
    label: 'CSV (.csv)',
    description: 'Flat text file with all categories and service breakdowns',
    icon: <Table2 size={18} className="text-blue-600" />,
  },
];

// ==================== ALL CATEGORY KEYS ====================

const ALL_CATEGORIES: ReportCategory[] = [
  'total_claim_value',
  'net_nhis_payable',
  'total_patient_pays',
  'pending_auth',
  'cap_capitation',
  'ffs_fee_for_service',
  'copayment',
  'private_oop',
];

// ==================== COMPONENT ====================

export function NhisClaimsExportModal({
  isOpen,
  onClose,
  claimsData,
  filterDescription,
  reportPeriod,
  onToast,
}: NhisClaimsExportModalProps) {
  // State
  const [selectedCategories, setSelectedCategories] = useState<
    Set<ReportCategory>
  >(() => new Set(ALL_CATEGORIES));
  const [selectedFormat, setSelectedFormat] =
    useState<ExportFormat>('pdf_summary');
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_SELECTED_COLUMNS),
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<ExportColumnGroup>>(
    () => new Set(),
  );

  // Column group data
  const columnGroups = useMemo(() => getColumnsByGroup(), []);

  // Format currency
  const fmtCurrency = (amt: number) =>
    `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  // Compute preview data (skip when modal not open to avoid HMR/mount issues)
  const previewData = useMemo(() => {
    if (!isOpen || !claimsData?.allItems?.length) return [];
    return buildCategoryReports(claimsData, Array.from(selectedCategories));
  }, [isOpen, claimsData, selectedCategories]);

  // Toggle category
  const toggleCategory = useCallback((cat: ReportCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  // Select all / none categories
  const selectAll = useCallback(() => {
    setSelectedCategories(new Set(ALL_CATEGORIES));
  }, []);

  const selectNone = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  // Column toggle helpers
  const toggleColumn = useCallback((colKey: string) => {
    // Don't allow deselecting mandatory columns
    if (MANDATORY_COLUMN_KEYS.includes(colKey)) return;
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        next.delete(colKey);
      } else {
        next.add(colKey);
      }
      return next;
    });
  }, []);

  const toggleColumnGroup = useCallback(
    (group: ExportColumnGroup) => {
      const groupCols = EXPORT_COLUMNS.filter(
        (c) => c.group === group && !c.mandatory,
      );
      const allSelected = groupCols.every((c) => selectedColumns.has(c.key));
      setSelectedColumns((prev) => {
        const next = new Set(prev);
        groupCols.forEach((c) => {
          if (allSelected) {
            next.delete(c.key);
          } else {
            next.add(c.key);
          }
        });
        return next;
      });
    },
    [selectedColumns],
  );

  const toggleGroupExpanded = useCallback((group: ExportColumnGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const selectAllColumns = useCallback(() => {
    setSelectedColumns(new Set(EXPORT_COLUMNS.map((c) => c.key)));
  }, []);

  const selectDefaultColumns = useCallback(() => {
    setSelectedColumns(new Set(DEFAULT_SELECTED_COLUMNS));
  }, []);

  // Computed: count of selected columns & mandatory count
  const mandatoryCount = MANDATORY_COLUMN_KEYS.length;
  const totalColumnCount = EXPORT_COLUMNS.length;
  const selectedColumnCount = selectedColumns.size;

  // Quick category stats from raw data
  const categoryStats = useMemo((): Partial<
    Record<ReportCategory, { amount: number; count: number }>
  > => {
    if (!isOpen || !claimsData?.allItems?.length) return {};
    const items = claimsData.allItems;
    return {
      total_claim_value: {
        amount: items.reduce((s, i) => s + i.totalAmount, 0),
        count: items.length,
      },
      net_nhis_payable: {
        amount: items.reduce((s, i) => s + i.netNhisPayable, 0),
        count: items.filter((i) => i.netNhisPayable > 0).length,
      },
      total_patient_pays: {
        amount: items.reduce((s, i) => s + i.copayAmount + i.privateAmount, 0),
        count: items.filter((i) => i.copayAmount + i.privateAmount > 0).length,
      },
      pending_auth: {
        amount: items
          .filter((i) => !i.hasAuthCode)
          .reduce((s, i) => s + i.totalAmount, 0),
        count: items.filter((i) => !i.hasAuthCode).length,
      },
      cap_capitation: {
        amount: items.reduce((s, i) => s + i.capAmount, 0),
        count: items.filter((i) => i.capAmount > 0).length,
      },
      ffs_fee_for_service: {
        amount: items.reduce((s, i) => s + i.ffsAmount, 0),
        count: items.filter((i) => i.ffsAmount > 0).length,
      },
      copayment: {
        amount: items.reduce((s, i) => s + i.copayAmount, 0),
        count: items.filter((i) => i.copayAmount > 0).length,
      },
      private_oop: {
        amount: items.reduce((s, i) => s + i.privateAmount, 0),
        count: items.filter((i) => i.privateAmount > 0).length,
      },
    };
  }, [isOpen, claimsData]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (selectedCategories.size === 0) {
      onToast?.({
        type: 'warning',
        message: 'Please select at least one category to export',
      });
      return;
    }

    setIsExporting(true);
    try {
      const exportOptions: ReportExportOptions = {
        selectedCategories: Array.from(selectedCategories),
        selectedColumns: Array.from(selectedColumns),
        format: selectedFormat,
        facilityName: 'NDC Medical Centre',
        facilityAddress: 'National Defence College, Abuja',
        facilityNhisId: 'NHIS-NDC-001',
        generatedBy: 'System',
        reportPeriod,
        filterDescription,
      };

      await exportCategoryReport(claimsData, exportOptions);

      const formatLabel =
        FORMAT_OPTIONS.find((f) => f.value === selectedFormat)?.label ||
        selectedFormat;
      onToast?.({
        type: 'success',
        message: `${formatLabel} report exported with ${selectedCategories.size} categories and ${selectedColumns.size} columns`,
      });
      onClose();
    } catch (error) {
      console.error('Category report export failed:', error);
      onToast?.({
        type: 'error',
        message: 'Failed to generate report. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedCategories,
    selectedColumns,
    selectedFormat,
    claimsData,
    reportPeriod,
    filterDescription,
    onToast,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Download size={20} />
              Export NHIS Category Reports
            </h2>
            <p className="text-green-100 text-sm mt-0.5">
              Select categories and format for detailed analysis export
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Category Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Info size={14} className="text-gray-400" />
                Select Report Categories
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={selectNone}
                  className="text-xs text-red-500 hover:text-red-600 font-medium hover:underline"
                >
                  Clear All
                </button>
                <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                  {selectedCategories.size}/{ALL_CATEGORIES.length} selected
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const def = REPORT_CATEGORY_DEFS[cat];
                const stats = categoryStats[cat];
                const isSelected = selectedCategories.has(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all duration-150 text-left ${
                      isSelected
                        ? 'border-green-500 bg-green-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isSelected ? (
                        <CheckSquare size={18} className="text-green-600" />
                      ) : (
                        <Square size={18} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`${isSelected ? 'text-green-700' : 'text-gray-400'}`}
                        >
                          {CATEGORY_ICONS[cat]}
                        </span>
                        <span
                          className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}
                        >
                          {def.label}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${def.colorClass}`}
                        >
                          {def.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {def.description}
                      </p>
                      {stats && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-bold text-gray-700">
                            {fmtCurrency(stats.amount)}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {stats.count} records
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Column Selection */}
          <div className="bg-gray-50 rounded-xl border border-gray-200">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:text-green-700"
            >
              <span className="flex items-center gap-2">
                <Columns size={14} />
                Select Export Columns
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  {selectedColumnCount}/{totalColumnCount} selected
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {mandatoryCount} mandatory
                </span>
              </span>
              {showColumnPicker ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {showColumnPicker && (
              <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                {/* Mandatory notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                  <Lock
                    size={12}
                    className="text-amber-500 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-[11px] text-amber-700">
                    <strong>Encounter Number</strong>, <strong>Age</strong>,{' '}
                    <strong>Diagnosis</strong>, and other NHIS-required fields
                    are <strong>mandatory</strong> and always included in every
                    export.
                  </p>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllColumns}
                    className="text-xs text-green-600 hover:text-green-700 font-medium hover:underline"
                  >
                    Select All Columns
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={selectDefaultColumns}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    Reset to Defaults
                  </button>
                </div>

                {/* Column groups */}
                <div className="space-y-1.5">
                  {columnGroups.map(
                    ({ group, label, description, columns }) => {
                      const isExpanded = expandedGroups.has(group);
                      const optionalCols = columns.filter((c) => !c.mandatory);
                      const selectedInGroup = columns.filter((c) =>
                        selectedColumns.has(c.key),
                      ).length;
                      const allOptionalSelected = optionalCols.every((c) =>
                        selectedColumns.has(c.key),
                      );
                      const mandatoryInGroup = columns.filter(
                        (c) => c.mandatory,
                      ).length;

                      return (
                        <div
                          key={group}
                          className="border border-gray-200 rounded-lg bg-white overflow-hidden"
                        >
                          {/* Group header */}
                          <div className="flex items-center gap-2 px-3 py-2">
                            <button
                              onClick={() => toggleGroupExpanded(group)}
                              className="flex-1 flex items-center gap-2 text-left"
                            >
                              {isExpanded ? (
                                <ChevronUp
                                  size={14}
                                  className="text-gray-400"
                                />
                              ) : (
                                <ChevronDown
                                  size={14}
                                  className="text-gray-400"
                                />
                              )}
                              <span className="text-xs font-bold text-gray-700">
                                {label}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {description}
                              </span>
                            </button>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {selectedInGroup}/{columns.length}
                            </span>
                            {optionalCols.length > 0 && (
                              <button
                                onClick={() => toggleColumnGroup(group)}
                                className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                                  allOptionalSelected
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                }`}
                              >
                                {allOptionalSelected
                                  ? 'Deselect optional'
                                  : 'Select all'}
                              </button>
                            )}
                          </div>

                          {/* Expanded columns */}
                          {isExpanded && (
                            <div className="px-3 pb-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                              {columns.map((col) => {
                                const isMandatory = col.mandatory;
                                const isSelected = selectedColumns.has(col.key);

                                return (
                                  <button
                                    key={col.key}
                                    onClick={() => toggleColumn(col.key)}
                                    disabled={isMandatory}
                                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all text-[11px] ${
                                      isMandatory
                                        ? 'bg-blue-50 border border-blue-200 text-blue-700 cursor-default'
                                        : isSelected
                                          ? 'bg-green-50 border border-green-300 text-green-700'
                                          : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                    title={
                                      isMandatory
                                        ? `Mandatory: ${col.mandatoryReason}`
                                        : col.label
                                    }
                                  >
                                    {isMandatory ? (
                                      <Lock
                                        size={11}
                                        className="text-blue-400 flex-shrink-0"
                                      />
                                    ) : isSelected ? (
                                      <CheckSquare
                                        size={12}
                                        className="text-green-500 flex-shrink-0"
                                      />
                                    ) : (
                                      <Square
                                        size={12}
                                        className="text-gray-300 flex-shrink-0"
                                      />
                                    )}
                                    <span className="truncate font-medium">
                                      {col.label}
                                    </span>
                                    {isMandatory && (
                                      <span className="text-[8px] bg-blue-100 text-blue-600 px-1 py-0 rounded ml-auto flex-shrink-0">
                                        REQ
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Export Format */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText size={14} className="text-gray-400" />
              Export Format
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt.value}
                  onClick={() => setSelectedFormat(fmt.value)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150 text-left ${
                    selectedFormat === fmt.value
                      ? 'border-green-500 bg-green-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex-shrink-0">{fmt.icon}</div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${selectedFormat === fmt.value ? 'text-gray-900' : 'text-gray-600'}`}
                    >
                      {fmt.label}
                    </p>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {fmt.description}
                    </p>
                  </div>
                  {selectedFormat === fmt.value && (
                    <div className="ml-auto flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Preview (collapsible) */}
          <div className="bg-gray-50 rounded-xl border border-gray-200">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:text-green-700"
            >
              <span className="flex items-center gap-2">
                <Info size={14} />
                Preview Selected Categories ({previewData.length})
              </span>
              {showPreview ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {showPreview && (
              <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                {previewData.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No categories selected
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">
                      <span>Category</span>
                      <span className="text-right">Amount</span>
                      <span className="text-center">Records</span>
                      <span className="text-center">Services</span>
                      <span>Badge</span>
                    </div>
                    {previewData.map((report) => (
                      <div
                        key={report.key}
                        className="grid grid-cols-5 gap-1 text-xs py-2 px-2 rounded-lg bg-white border border-gray-100"
                      >
                        <span className="font-medium text-gray-700 truncate">
                          {report.label}
                        </span>
                        <span className="text-right font-bold text-gray-800">
                          {fmtCurrency(report.totalAmount)}
                        </span>
                        <span className="text-center text-gray-500">
                          {report.recordCount}
                        </span>
                        <span className="text-center text-gray-500">
                          {report.serviceBreakdown.length} depts
                        </span>
                        <span className="text-gray-400">
                          {report.badgeText}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Info Banner */}
          {filterDescription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-700">
                  Active Filters Applied
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {filterDescription}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {selectedColumnCount} columns × {selectedCategories.size} categories
            — each with per-service breakdown
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selectedCategories.size === 0}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export ({selectedColumnCount} cols × {selectedCategories.size}{' '}
                  cats)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
