/**
 * Clinical Export System - Export Modal Component
 * NDC MEDICAL CENTRE EMR
 *
 * Comprehensive UI for configuring and executing clinical data exports
 * Uses the project's existing UI components.
 *
 * @version 1.0.0
 * @date January 24, 2026
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileType,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button, Input, Select } from '../../../components/ui/FormElements';

import type {
  ExportModule,
  ExportModules,
  ExportFilters,
  PDFExportOptions,
  ExcelExportOptions,
  CSVExportOptions,
  JSONExportOptions,
  ExportProgress,
  DateRangePreset,
} from '../types';
import {
  getDefaultExportFilters,
  getDefaultPDFOptions,
  getDefaultExcelOptions,
  getDefaultCSVOptions,
  getDefaultJSONOptions,
  getDateRangeFromPreset,
} from '../types';
import { fetchPatientJourney, fetchMultiPatientJourneys } from '../api';
import { downloadClinicalExportPDF } from '../exporters/pdf-exporter';
import {
  downloadClinicalExportExcel,
  downloadMultiPatientExportExcel,
} from '../exporters/excel-exporter';
import { downloadClinicalExportJSON } from '../exporters/json-exporter';
import { downloadClinicalExportCSV } from '../exporters/csv-exporter';

// ==================== TYPES ====================

interface ClinicalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  emrNumber?: string;
  encounterId?: string;
  admissionId?: string;
  facilityId?: string;
  userId: string;
  userName: string;
  userRole?: string;
}

type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

// ==================== MODULE DEFINITIONS ====================

const MODULE_OPTIONS: {
  id: ExportModule;
  label: string;
  description: string;
  category: string;
}[] = [
  {
    id: 'demographics',
    label: 'Demographics',
    description: 'Patient personal and contact information',
    category: 'Patient',
  },
  {
    id: 'encounters',
    label: 'Encounters',
    description: 'All clinical visits and consultations',
    category: 'Clinical',
  },
  {
    id: 'diagnoses',
    label: 'Diagnoses',
    description: 'All diagnoses with ICD-10 codes',
    category: 'Clinical',
  },
  {
    id: 'vitals',
    label: 'Vital Signs',
    description: 'All vital sign measurements with LOINC codes',
    category: 'Clinical',
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    description: 'Medication orders with ATC codes',
    category: 'Pharmacy',
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    description: 'Lab requests and results with LOINC codes',
    category: 'Diagnostics',
  },
  {
    id: 'radiology',
    label: 'Radiology',
    description: 'Imaging requests and reports',
    category: 'Diagnostics',
  },
  {
    id: 'procedures',
    label: 'Procedures',
    description: 'Surgical and non-surgical procedures with CPT codes',
    category: 'Clinical',
  },
  {
    id: 'admissions',
    label: 'Admissions',
    description: 'Inpatient admission records',
    category: 'Inpatient',
  },
  {
    id: 'wardRounds',
    label: 'Ward Rounds',
    description: 'Daily ward round notes',
    category: 'Inpatient',
  },
  {
    id: 'nursing',
    label: 'Nursing Notes',
    description: 'Nursing assessments and care notes',
    category: 'Nursing',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Financial records and invoices',
    category: 'Finance',
  },
];

const DATE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'all_time', label: 'All Time' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'today', label: 'Today' },
  { id: 'custom', label: 'Custom Range' },
];

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    id: 'pdf',
    label: 'PDF',
    icon: FileText,
    description: 'Professional document format',
  },
  {
    id: 'excel',
    label: 'Excel',
    icon: FileSpreadsheet,
    description: 'Spreadsheet with multiple sheets',
  },
  {
    id: 'csv',
    label: 'CSV',
    icon: FileType,
    description: 'Simple data format',
  },
  {
    id: 'json',
    label: 'JSON',
    icon: FileJson,
    description: 'Structured data (FHIR compatible)',
  },
];

// ==================== COMPONENT ====================

export function ClinicalExportModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  emrNumber,
  encounterId,
  admissionId,
  facilityId,
  userId,
  userName,
  userRole,
}: ClinicalExportModalProps) {
  // State
  const [activeTab, setActiveTab] = useState<'modules' | 'format' | 'options'>(
    'modules',
  );
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [selectedModules, setSelectedModules] = useState<ExportModule[]>([
    'demographics',
    'encounters',
    'diagnoses',
    'vitals',
    'prescriptions',
    'laboratory',
    'radiology',
    'procedures',
    'admissions',
    'billing',
  ]);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all_time');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Format options
  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>(
    getDefaultPDFOptions(),
  );
  const [excelOptions, setExcelOptions] = useState<ExcelExportOptions>(
    getDefaultExcelOptions(),
  );
  const [csvOptions, setCsvOptions] = useState<CSVExportOptions>(
    getDefaultCSVOptions(),
  );
  const [jsonOptions, setJsonOptions] = useState<JSONExportOptions>(
    getDefaultJSONOptions(),
  );

  // Expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Patient', 'Clinical', 'Diagnostics']),
  );

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('modules');
      setError(null);
      setSuccess(false);
      setExportProgress(null);
    }
  }, [isOpen]);

  // Get date range
  const getDateRange = useCallback((): { from: string; to: string } => {
    if (datePreset === 'custom') {
      return {
        from: customDateFrom || '',
        to: customDateTo || '',
      };
    }
    const presetRange = getDateRangeFromPreset(datePreset);
    return {
      from: presetRange.from,
      to: presetRange.to,
    };
  }, [datePreset, customDateFrom, customDateTo]);

  // Toggle module selection
  const toggleModule = useCallback((moduleId: ExportModule) => {
    setSelectedModules((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((m) => m !== moduleId);
      }
      return [...prev, moduleId];
    });
  }, []);

  // Select all modules
  const selectAllModules = useCallback(() => {
    setSelectedModules(MODULE_OPTIONS.map((m) => m.id));
  }, []);

  // Clear all modules
  const clearAllModules = useCallback(() => {
    setSelectedModules([]);
  }, []);

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Get modules by category
  const getModulesByCategory = useCallback(() => {
    const categories: Record<string, typeof MODULE_OPTIONS> = {};
    MODULE_OPTIONS.forEach((module) => {
      if (!categories[module.category]) {
        categories[module.category] = [];
      }
      categories[module.category].push(module);
    });
    return categories;
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!patientId) {
      setError('No patient selected for export');
      return;
    }

    if (selectedModules.length === 0) {
      setError('Please select at least one module to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      // Start progress
      setExportProgress({
        status: 'in-progress',
        stage: 'fetching',
        message: 'Fetching patient data...',
        progress: 10,
      });

      const dateRange = getDateRange();
      const defaultFilters = getDefaultExportFilters();
      const filters: ExportFilters = {
        ...defaultFilters,
        patientIds: [patientId],
        dateRange: {
          preset: datePreset,
          from: dateRange.from,
          to: dateRange.to,
        },
        includeModules: selectedModules.reduce(
          (acc, m) => ({ ...acc, [m]: true }),
          { ...defaultFilters.includeModules } as ExportModules,
        ),
      };

      // Fetch data
      const journeyData = await fetchPatientJourney(patientId, filters, {
        id: userId,
        name: userName,
        role: userRole || 'User',
      });

      if (!journeyData) {
        throw new Error('No data returned from patient journey fetch');
      }

      setExportProgress({
        status: 'in-progress',
        stage: 'processing',
        message: 'Processing data...',
        progress: 50,
      });

      // Generate export based on format
      setExportProgress({
        status: 'in-progress',
        stage: 'generating',
        message: `Generating ${selectedFormat.toUpperCase()} file...`,
        progress: 70,
      });

      const filename = `${emrNumber || patientId}_clinical_export_${new Date().toISOString().split('T')[0]}`;

      switch (selectedFormat) {
        case 'pdf':
          await downloadClinicalExportPDF(
            journeyData,
            pdfOptions,
            `${filename}.pdf`,
          );
          break;
        case 'excel':
          await downloadClinicalExportExcel(
            journeyData,
            excelOptions,
            `${filename}.xlsx`,
          );
          break;
        case 'csv':
          await downloadClinicalExportCSV(
            journeyData,
            csvOptions,
            `${filename}.csv`,
          );
          break;
        case 'json':
          await downloadClinicalExportJSON(
            journeyData,
            jsonOptions,
            `${filename}.json`,
          );
          break;
      }

      setExportProgress({
        status: 'complete',
        stage: 'complete',
        message: 'Export completed successfully!',
        progress: 100,
      });

      setSuccess(true);

      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      setError(
        err instanceof Error ? err.message : 'An error occurred during export',
      );
      setExportProgress(null);
    } finally {
      setIsExporting(false);
    }
  }, [
    patientId,
    selectedModules,
    selectedFormat,
    datePreset,
    getDateRange,
    pdfOptions,
    excelOptions,
    csvOptions,
    jsonOptions,
    emrNumber,
    userId,
    userName,
    userRole,
    onClose,
  ]);

  // Group modules by category
  const modulesByCategory = getModulesByCategory();

  // Render content
  const renderContent = () => {
    if (success) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Export Successful!
          </h3>
          <p className="text-gray-500">Your file has been downloaded.</p>
        </div>
      );
    }

    if (isExporting && exportProgress) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {exportProgress.message}
          </h3>
          <div className="w-64 bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress.progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {exportProgress.progress}% complete
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Patient Info Header */}
        {patientName && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold">
                  {patientName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{patientName}</h3>
                {emrNumber && (
                  <p className="text-sm text-gray-500">EMR: {emrNumber}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {(['modules', 'format', 'options'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'modules' && 'Data Modules'}
                {tab === 'format' && 'Export Format'}
                {tab === 'options' && 'Options'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'modules' && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllModules}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAllModules}>
                Clear All
              </Button>
              <span className="ml-auto text-sm text-gray-500">
                {selectedModules.length} of {MODULE_OPTIONS.length} selected
              </span>
            </div>

            {/* Module Categories */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {Object.entries(modulesByCategory).map(([category, modules]) => (
                <div
                  key={category}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">
                      {category}
                    </span>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {expandedCategories.has(category) && (
                    <div className="p-3 space-y-2 bg-white">
                      {modules.map((module) => (
                        <label
                          key={module.id}
                          className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 mt-0.5"
                            checked={selectedModules.includes(module.id)}
                            onChange={() => toggleModule(module.id)}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">
                              {module.label}
                            </span>
                            <p className="text-xs text-gray-500">
                              {module.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'format' && (
          <div className="space-y-4">
            {/* Format Selection */}
            <div className="grid grid-cols-2 gap-3">
              {FORMAT_OPTIONS.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-6 h-6 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}
                      />
                      <div>
                        <span
                          className={`font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}
                        >
                          {format.label}
                        </span>
                        <p className="text-xs text-gray-500">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </h4>
              <Select
                value={datePreset}
                onChange={(e) =>
                  setDatePreset(e.target.value as DateRangePreset)
                }
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </Select>

              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">
                      From
                    </label>
                    <Input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">
                      To
                    </label>
                    <Input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'options' && (
          <div className="space-y-4">
            {selectedFormat === 'pdf' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">PDF Options</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={pdfOptions.includeCoverPage}
                    onChange={(e) =>
                      setPdfOptions({
                        ...pdfOptions,
                        includeCoverPage: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Include Cover Page
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={pdfOptions.includeTOC}
                    onChange={(e) =>
                      setPdfOptions({
                        ...pdfOptions,
                        includeTOC: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Include Table of Contents
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={pdfOptions.includeCharts}
                    onChange={(e) =>
                      setPdfOptions({
                        ...pdfOptions,
                        includeCharts: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Include Charts & Visualizations
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={pdfOptions.confidentialityNotice}
                    onChange={(e) =>
                      setPdfOptions({
                        ...pdfOptions,
                        confidentialityNotice: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Add Confidentiality Notice
                  </span>
                </label>
              </div>
            )}

            {selectedFormat === 'excel' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Excel Options</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={excelOptions.separateSheets}
                    onChange={(e) =>
                      setExcelOptions({
                        ...excelOptions,
                        separateSheets: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Separate Sheet per Module
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={excelOptions.includeSummarySheet}
                    onChange={(e) =>
                      setExcelOptions({
                        ...excelOptions,
                        includeSummarySheet: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Include Summary Sheet
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={excelOptions.freezeHeaders}
                    onChange={(e) =>
                      setExcelOptions({
                        ...excelOptions,
                        freezeHeaders: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Freeze Header Rows
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={excelOptions.includeFilters}
                    onChange={(e) =>
                      setExcelOptions({
                        ...excelOptions,
                        includeFilters: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Enable Column Filters
                  </span>
                </label>
              </div>
            )}

            {selectedFormat === 'csv' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">CSV Options</h4>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Delimiter
                  </label>
                  <Select
                    value={csvOptions.delimiter}
                    onChange={(e) =>
                      setCsvOptions({
                        ...csvOptions,
                        delimiter: e.target.value as ',' | ';' | '\t',
                      })
                    }
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="	">Tab</option>
                  </Select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={csvOptions.includeHeaders}
                    onChange={(e) =>
                      setCsvOptions({
                        ...csvOptions,
                        includeHeaders: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">Include Headers</span>
                </label>
              </div>
            )}

            {selectedFormat === 'json' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">JSON Options</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={
                      jsonOptions.includeFHIRFormat || jsonOptions.fhirCompliant
                    }
                    onChange={(e) =>
                      setJsonOptions({
                        ...jsonOptions,
                        includeFHIRFormat: e.target.checked,
                        fhirCompliant: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    FHIR R4 Compliant Output
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={jsonOptions.pretty || jsonOptions.prettyPrint}
                    onChange={(e) =>
                      setJsonOptions({
                        ...jsonOptions,
                        pretty: e.target.checked,
                        prettyPrint: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Pretty Print (Formatted)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    checked={jsonOptions.includeMetadata}
                    onChange={(e) =>
                      setJsonOptions({
                        ...jsonOptions,
                        includeMetadata: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-gray-700">
                    Include Export Metadata
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  };

  // Modal Footer
  const renderFooter = () => {
    if (success || isExporting) return null;

    return (
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={selectedModules.length === 0}
          icon={Download}
        >
          Export {selectedFormat.toUpperCase()}
        </Button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Clinical Data"
      size="lg"
      footer={renderFooter()}
    >
      {renderContent()}
    </Modal>
  );
}

export default ClinicalExportModal;
