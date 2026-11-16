// =============================================================================
// NHIS Coverage Configuration Section
// Comprehensive NHIS coverage management: category-level + service-level
// with bulk selection and individual override support.
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  CheckCircle,
  Info,
  Edit2,
  Save,
  X,
  Percent,
  TestTube,
  Scan,
  Stethoscope,
  Pill,
  Building2,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import { Button, Input } from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  useInsuranceTypePricing,
  useUpdateInsuranceTypePricing,
  useNhisServices,
  useBulkUpdateNhisPercentage,
  useUpdateServiceNhisConfig,
} from '../hooks/useServicePricing';
import type { NhisServiceCategory, NhisServiceItem } from '../api/service-pricing.api';
import { formatCurrency } from '../dtos/billing.dto';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// =============================================================================
// Constants
// =============================================================================

const INSURANCE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  Military_NHIS: { label: 'Military NHIS', color: 'bg-blue-600', icon: '🎖️' },
  DHML: { label: 'DHML (Military)', color: 'bg-blue-500', icon: '🏛️' },
  Civilian_NHIS: { label: 'Civilian NHIS', color: 'bg-green-600', icon: '🏥' },
  GIFSHIP: { label: 'GIFSHIP', color: 'bg-purple-600', icon: '🌟' },
  Security_Services_NHIS: { label: 'Security Services', color: 'bg-amber-600', icon: '🛡️' },
  Retainership: { label: 'Retainership', color: 'bg-teal-600', icon: '📋' },
  Private: { label: 'Private', color: 'bg-gray-600', icon: '💳' },
};

const CATEGORY_LABELS: Record<NhisServiceCategory, { label: string; icon: React.ReactNode }> = {
  lab: { label: 'Laboratory', icon: <TestTube className="h-4 w-4" /> },
  radiology: { label: 'Radiology', icon: <Scan className="h-4 w-4" /> },
  pharmacy: { label: 'Pharmacy', icon: <Pill className="h-4 w-4" /> },
  procedure: { label: 'Procedures', icon: <Stethoscope className="h-4 w-4" /> },
  consultation: { label: 'Consultation', icon: <Building2 className="h-4 w-4" /> },
};

const ALL_CATEGORIES: NhisServiceCategory[] = ['consultation', 'lab', 'radiology', 'pharmacy', 'procedure'];

// =============================================================================
// Category Config Editing
// =============================================================================

interface EditingCategoryConfig {
  id: string;
  payment_category: string;
  coverage_percentage: number;
  consultation_fully_covered: boolean;
  lab_coverage_percentage: number;
  radiology_coverage_percentage: number;
  pharmacy_coverage_percentage: number;
  procedure_coverage_percentage: number;
  bed_coverage_percentage: number;
  description: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function NhisCoverageConfigSection() {
  const { staff } = useAuth();
  const { showToast } = useToast();

  // ── State ──
  const [showCategoryConfig, setShowCategoryConfig] = useState(true);
  const [editingCategory, setEditingCategory] = useState<EditingCategoryConfig | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<NhisServiceCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [nhisOnly, setNhisOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPercentage, setBulkPercentage] = useState<number>(90);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingService, setEditingService] = useState<NhisServiceItem | null>(null);

  // ── Queries ──
  const { data: insuranceConfigs = [], isLoading: configLoading, refetch: refetchConfig } = useInsuranceTypePricing();
  const { data: services = [], isLoading: servicesLoading, refetch: refetchServices } = useNhisServices({
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    search: searchTerm || undefined,
    nhisOnly: nhisOnly || undefined,
  });

  // ── Mutations ──
  const updateInsurancePricing = useUpdateInsuranceTypePricing();
  const bulkUpdate = useBulkUpdateNhisPercentage();
  const updateServiceConfig = useUpdateServiceNhisConfig();

  // ── Computed ──
  const selectedItems = useMemo(() => {
    return services.filter((s) => selectedIds.has(s.id));
  }, [services, selectedIds]);

  const allSelected = services.length > 0 && services.every((s) => selectedIds.has(s.id));

  // ── Category Config Handlers ──
  const handleEditCategory = useCallback((config: Record<string, unknown>) => {
    setEditingCategory({
      id: config.id as string,
      payment_category: config.payment_category as string,
      coverage_percentage: (config.coverage_percentage as number) || 0,
      consultation_fully_covered: (config.consultation_fully_covered as boolean) ?? true,
      lab_coverage_percentage: (config.lab_coverage_percentage as number) || (config.coverage_percentage as number) || 0,
      radiology_coverage_percentage: (config.radiology_coverage_percentage as number) || (config.coverage_percentage as number) || 0,
      pharmacy_coverage_percentage: (config.pharmacy_coverage_percentage as number) || (config.coverage_percentage as number) || 0,
      procedure_coverage_percentage: (config.procedure_coverage_percentage as number) || (config.coverage_percentage as number) || 0,
      bed_coverage_percentage: (config.bed_coverage_percentage as number) || (config.coverage_percentage as number) || 0,
      description: (config.description as string) || '',
    });
  }, []);

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    try {
      await updateInsurancePricing.mutateAsync({
        id: editingCategory.id,
        updates: {
          coverage_percentage: editingCategory.coverage_percentage,
          consultation_fully_covered: editingCategory.consultation_fully_covered,
          lab_coverage_percentage: editingCategory.lab_coverage_percentage,
          radiology_coverage_percentage: editingCategory.radiology_coverage_percentage,
          pharmacy_coverage_percentage: editingCategory.pharmacy_coverage_percentage,
          procedure_coverage_percentage: editingCategory.procedure_coverage_percentage,
          bed_coverage_percentage: editingCategory.bed_coverage_percentage,
          description: editingCategory.description,
          updated_by: (staff as Record<string, unknown>)?.id as string,
        },
      });
      showToast({ message: `${editingCategory.payment_category} coverage updated`, type: 'success' });
      setEditingCategory(null);
    } catch (err: unknown) {
      showToast({ message: (err as Error).message || 'Failed to update', type: 'error' });
    }
  };

  // ── Service Selection Handlers ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(services.map((s) => s.id)));
    }
  }, [allSelected, services]);

  // ── Bulk Update Handler ──
  const handleBulkApply = async () => {
    if (selectedItems.length === 0) return;
    try {
      const result = await bulkUpdate.mutateAsync({
        items: selectedItems.map((s) => ({ id: s.id, category: s.category })),
        nhisPercentage: bulkPercentage,
        isNhisCovered: true,
      });
      showToast({
        message: `Updated ${result.updated} services to ${bulkPercentage}% NHIS coverage`,
        type: 'success',
      });
      if (result.errors.length > 0) {
        showToast({ message: result.errors.join(', '), type: 'error' });
      }
      setShowBulkModal(false);
      setSelectedIds(new Set());
      refetchServices();
    } catch (err: unknown) {
      showToast({ message: (err as Error).message || 'Bulk update failed', type: 'error' });
    }
  };

  // ── Individual Service Update Handler ──
  const handleSaveService = async () => {
    if (!editingService) return;
    try {
      await updateServiceConfig.mutateAsync({
        id: editingService.id,
        category: editingService.category,
        updates: {
          nhis_price: editingService.nhis_price,
          nhis_percentage: editingService.nhis_percentage,
          is_nhis_covered: editingService.is_nhis_covered,
        },
      });
      showToast({ message: `${editingService.name} NHIS config updated`, type: 'success' });
      setEditingService(null);
      refetchServices();
    } catch (err: unknown) {
      showToast({ message: (err as Error).message || 'Update failed', type: 'error' });
    }
  };

  const getDisplayConfig = (category: string) =>
    INSURANCE_CONFIG[category] || { label: category, color: 'bg-gray-600', icon: '📄' };

  // ═════════════════════════════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Section 1: Category-Level NHIS Coverage ── */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => setShowCategoryConfig(!showCategoryConfig)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Insurance Category Coverage Rates</h3>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {insuranceConfigs.length} categories
            </span>
          </div>
          {showCategoryConfig ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showCategoryConfig && (
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  These define the default NHIS coverage % per insurance type, per service category.
                  Individual services can override with their own percentage below.
                  Consultation is always 100% free when the toggle is on.
                </p>
              </div>
            </div>

            {configLoading ? (
              <div className="text-center py-6">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {insuranceConfigs.map((config: Record<string, unknown>) => {
                  const dc = getDisplayConfig(config.payment_category as string);
                  return (
                    <div key={config.id as string} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                      <div className={`${dc.color} text-white px-4 py-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{dc.icon}</span>
                            <h4 className="font-semibold text-sm">{dc.label}</h4>
                          </div>
                          <span className="text-2xl font-bold">{config.coverage_percentage as number}%</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Consultation:</span>
                          {config.consultation_fully_covered ? (
                            <span className="inline-flex items-center text-green-600 font-medium">
                              <CheckCircle className="h-3 w-3 mr-1" />100% Free
                            </span>
                          ) : (
                            <span>{config.coverage_percentage as number}%</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                          <span>Lab: {(config.lab_coverage_percentage as number) || (config.coverage_percentage as number)}%</span>
                          <span>Radiology: {(config.radiology_coverage_percentage as number) || (config.coverage_percentage as number)}%</span>
                          <span>Pharmacy: {(config.pharmacy_coverage_percentage as number) || (config.coverage_percentage as number)}%</span>
                          <span>Procedures: {(config.procedure_coverage_percentage as number) || (config.coverage_percentage as number)}%</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleEditCategory(config)}>
                          <Edit2 className="h-3 w-3 mr-1" />Edit
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Service-Level NHIS Configuration ── */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Service-Level NHIS Configuration</h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button size="sm" onClick={() => setShowBulkModal(true)}>
                  <Percent className="h-4 w-4 mr-1" />
                  Set % for {selectedIds.size} selected
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => { refetchServices(); refetchConfig(); }}>
                <RefreshCw className="h-4 w-4 mr-1" />Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value as NhisServiceCategory | 'all'); setSelectedIds(new Set()); }}
              className="rounded-md border-gray-300 text-sm"
            >
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c].label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={nhisOnly} onChange={(e) => setNhisOnly(e.target.checked)} className="rounded border-gray-300 text-green-600" />
              NHIS Covered Only
            </label>
          </div>
        </div>

        {/* Service Table */}
        <div className="overflow-x-auto">
          {servicesLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No services found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-green-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Service</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Regular Price</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">NHIS Price</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Coverage %</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">NHIS</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((svc) => (
                  <tr key={svc.id} className={`hover:bg-gray-50 ${selectedIds.has(svc.id) ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(svc.id)}
                        onChange={() => toggleSelect(svc.id)}
                        className="rounded border-gray-300 text-green-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{svc.name}</div>
                      {svc.code && <div className="text-xs text-gray-400">{svc.code}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {CATEGORY_LABELS[svc.category]?.icon}
                        {CATEGORY_LABELS[svc.category]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(svc.regular_price)}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {svc.nhis_price > 0 ? formatCurrency(svc.nhis_price) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        svc.nhis_percentage >= 100
                          ? 'bg-green-100 text-green-800'
                          : svc.nhis_percentage > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {svc.nhis_percentage > 0 ? `${svc.nhis_percentage}%` : 'Default'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {svc.is_nhis_covered ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="outline" size="sm" onClick={() => setEditingService({ ...svc })}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {services.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500 flex justify-between items-center">
            <span>{services.length} services • {selectedIds.size} selected</span>
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="text-red-500 hover:text-red-700 text-xs">
                Clear selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Category Modal ── */}
      {editingCategory && (
        <Modal isOpen onClose={() => setEditingCategory(null)} title="Edit Insurance Coverage" size="lg">
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${getDisplayConfig(editingCategory.payment_category).color} text-white`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getDisplayConfig(editingCategory.payment_category).icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{getDisplayConfig(editingCategory.payment_category).label}</h3>
                  <p className="text-sm opacity-90">Configure coverage percentages for this insurance type</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Coverage %</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={editingCategory.coverage_percentage}
                  onChange={(e) => setEditingCategory({ ...editingCategory, coverage_percentage: parseInt(e.target.value) || 0 })}
                  className="w-32 text-lg font-semibold text-center"
                />
                <Percent className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCategory.consultation_fully_covered}
                  onChange={(e) => setEditingCategory({ ...editingCategory, consultation_fully_covered: e.target.checked })}
                  className="h-5 w-5 rounded border-green-400 text-green-600"
                />
                <div>
                  <p className="font-medium text-green-800">Consultation 100% Covered</p>
                  <p className="text-sm text-green-600">Consultation fees fully covered by insurance (no copay)</p>
                </div>
              </label>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Percent className="h-4 w-4" />Service Category Rates
              </h4>
              <p className="text-xs text-gray-500 mb-3">Set different rates per service category. 0 = use default.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'lab_coverage_percentage', label: 'Laboratory (%)' },
                  { key: 'radiology_coverage_percentage', label: 'Radiology (%)' },
                  { key: 'pharmacy_coverage_percentage', label: 'Pharmacy (%)' },
                  { key: 'procedure_coverage_percentage', label: 'Procedures (%)' },
                  { key: 'bed_coverage_percentage', label: 'Bed/Admission (%)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <Input
                      type="number" min={0} max={100}
                      value={(editingCategory as Record<string, unknown>)[key] as number}
                      onChange={(e) => setEditingCategory({ ...editingCategory, [key]: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingCategory.description}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                <X className="h-4 w-4 mr-1" />Cancel
              </Button>
              <Button onClick={handleSaveCategory} disabled={updateInsurancePricing.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateInsurancePricing.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Bulk Percentage Modal ── */}
      {showBulkModal && (
        <Modal isOpen onClose={() => setShowBulkModal(false)} title="Set NHIS Coverage for Selected Services" size="md">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                This will set the NHIS coverage percentage for <strong>{selectedItems.length}</strong> selected services.
                {selectedItems.some((s) => s.category === 'consultation') && (
                  <span className="block mt-1 text-amber-700">
                    Note: Consultation services are always 100% covered and will be skipped.
                  </span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Percentage</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(parseInt(e.target.value) || 0)}
                  className="w-32 text-lg font-semibold text-center"
                />
                <Percent className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            <div className="border rounded-lg max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Service</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-center">Current %</th>
                    <th className="px-3 py-2 text-center">New %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedItems.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 text-gray-500">{CATEGORY_LABELS[s.category]?.label}</td>
                      <td className="px-3 py-2 text-center">{s.nhis_percentage || 'Default'}</td>
                      <td className="px-3 py-2 text-center font-medium text-green-700">
                        {s.category === 'consultation' ? '100%' : `${bulkPercentage}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button>
              <Button onClick={handleBulkApply} disabled={bulkUpdate.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {bulkUpdate.isPending ? 'Applying...' : `Apply ${bulkPercentage}% to ${selectedItems.filter((s) => s.category !== 'consultation').length} Services`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Individual Service Modal ── */}
      {editingService && (
        <Modal isOpen onClose={() => setEditingService(null)} title="Edit Service NHIS Configuration" size="md">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900">{editingService.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {CATEGORY_LABELS[editingService.category]?.icon}
                  {CATEGORY_LABELS[editingService.category]?.label}
                </span>
                {editingService.code && <span className="text-xs text-gray-400">{editingService.code}</span>}
              </div>
              <p className="text-sm text-gray-500 mt-2">Regular Price: {formatCurrency(editingService.regular_price)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NHIS Price (₦)</label>
              <Input
                type="number" min={0} step={100}
                value={editingService.nhis_price}
                onChange={(e) => setEditingService({ ...editingService, nhis_price: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">The price NHIS pays. If 0, uses regular price.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Percentage Override</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={editingService.nhis_percentage}
                  onChange={(e) => setEditingService({ ...editingService, nhis_percentage: parseInt(e.target.value) || 0 })}
                  className="w-32"
                />
                <Percent className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Set 0 to use the category default. Set a value to override for this service only.</p>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingService.is_nhis_covered}
                  onChange={(e) => setEditingService({ ...editingService, is_nhis_covered: e.target.checked })}
                  className="h-5 w-5 rounded border-green-400 text-green-600"
                />
                <div>
                  <p className="font-medium text-green-800 text-sm">NHIS Covered</p>
                  <p className="text-xs text-green-600">Enable NHIS coverage for this service</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingService(null)}>
                <X className="h-4 w-4 mr-1" />Cancel
              </Button>
              <Button onClick={handleSaveService} disabled={updateServiceConfig.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateServiceConfig.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
