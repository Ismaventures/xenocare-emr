// =============================================================================
// Procedure Pricing Section
// Manage prices for procedures with category-based organization
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Search,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { StatusBadge, EmptyState } from '../../../components/ui/DataDisplay';
import { Modal } from '../../../components/ui/Modal';
import {
  useProcedurePrices,
  useUpdateProcedurePrice,
  useProcedureCategories,
} from '../hooks/useServicePricing';
import { ProcedureItem, ProcedureCategory } from '../api/service-pricing.api';
import { formatCurrency } from '../dtos/billing.dto';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// Category display configuration
const PROCEDURE_CATEGORY_CONFIG: Record<
  ProcedureCategory,
  { label: string; color: string }
> = {
  surgical: { label: 'Surgical', color: 'bg-red-100 text-red-700' },
  diagnostic: { label: 'Diagnostic', color: 'bg-blue-100 text-blue-700' },
  therapeutic: { label: 'Therapeutic', color: 'bg-green-100 text-green-700' },
  minor: { label: 'Minor Procedures', color: 'bg-gray-100 text-gray-700' },
  major: { label: 'Major Procedures', color: 'bg-purple-100 text-purple-700' },
  endoscopy: { label: 'Endoscopy', color: 'bg-indigo-100 text-indigo-700' },
  biopsy: { label: 'Biopsy', color: 'bg-pink-100 text-pink-700' },
  injection: { label: 'Injection', color: 'bg-cyan-100 text-cyan-700' },
  infusion: { label: 'Infusion', color: 'bg-teal-100 text-teal-700' },
  wound_care: { label: 'Wound Care', color: 'bg-orange-100 text-orange-700' },
  cardiovascular: {
    label: 'Cardiovascular',
    color: 'bg-rose-100 text-rose-700',
  },
  orthopedic: { label: 'Orthopedic', color: 'bg-amber-100 text-amber-700' },
  neurological: {
    label: 'Neurological',
    color: 'bg-violet-100 text-violet-700',
  },
  obstetric: { label: 'Obstetric', color: 'bg-fuchsia-100 text-fuchsia-700' },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700' },
};

interface EditingProcedure {
  id: string;
  name: string;
  code: string;
  category: ProcedureCategory;
  base_price: number;
  nhis_price: number;
  professional_fee: number;
  facility_fee: number;
  requires_nhis_authorization: boolean;
}

export function ProcedurePricingSection() {
  const { staff } = useAuth();
  const { showToast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    ProcedureCategory | 'all'
  >('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [editingProcedure, setEditingProcedure] =
    useState<EditingProcedure | null>(null);

  // Queries
  const {
    data: procedures = [],
    isLoading,
    refetch,
  } = useProcedurePrices({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchTerm || undefined,
  });
  const { data: categories = [] } = useProcedureCategories();

  // Mutations
  const updateProcedurePrice = useUpdateProcedurePrice();

  // Group procedures by category
  const groupedProcedures = useMemo(() => {
    const groups: Record<string, ProcedureItem[]> = {};

    procedures.forEach((proc) => {
      const cat = proc.procedure_category || 'other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(proc);
    });

    // Sort each group alphabetically
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [procedures]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(groupedProcedures)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleEditProcedure = (proc: ProcedureItem) => {
    setEditingProcedure({
      id: proc.id,
      name: proc.name,
      code: proc.code,
      category: proc.procedure_category,
      base_price: proc.base_price,
      nhis_price: proc.nhis_price,
      professional_fee: proc.professional_fee || 0,
      facility_fee: proc.facility_fee || 0,
      requires_nhis_authorization: proc.requires_nhis_authorization || false,
    });
  };

  const handleSaveProcedure = async () => {
    if (!editingProcedure) return;

    try {
      await updateProcedurePrice.mutateAsync({
        procedureId: editingProcedure.id,
        updates: {
          base_price: editingProcedure.base_price,
          nhis_price: editingProcedure.nhis_price,
          professional_fee: editingProcedure.professional_fee,
          facility_fee: editingProcedure.facility_fee,
          requires_nhis_authorization:
            editingProcedure.requires_nhis_authorization,
          updated_by: (staff as any)?.id,
          reason: 'Procedure price update via Service Management',
        },
      });

      showToast({
        message: 'Procedure price updated successfully',
        type: 'success',
      });
      setEditingProcedure(null);
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to update procedure',
        type: 'error',
      });
    }
  };

  const getCategoryConfig = (cat: string) => {
    return (
      PROCEDURE_CATEGORY_CONFIG[cat as ProcedureCategory] ||
      PROCEDURE_CATEGORY_CONFIG.other
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search procedures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
          className="w-48"
        >
          <option value="all">All Categories</option>
          {categories.map((cat: ProcedureCategory) => (
            <option key={cat} value={cat}>
              {getCategoryConfig(cat).label}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Procedure Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Procedures</p>
          <p className="text-2xl font-bold text-gray-900">
            {procedures.length}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-blue-600">
            {Object.keys(groupedProcedures).length}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">NHIS Pre-Auth Required</p>
          <p className="text-2xl font-bold text-amber-600">
            {procedures.filter((p) => p.requires_nhis_authorization).length}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Active Procedures</p>
          <p className="text-2xl font-bold text-green-600">
            {procedures.filter((p) => p.is_active).length}
          </p>
        </div>
      </div>

      {/* Grouped Procedures */}
      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-500 mt-2">Loading procedures...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedProcedures).map(([category, procs]) => {
            const config = getCategoryConfig(category);
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        {config.label}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {procs.length} procedures
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {
                        procs.filter((p) => p.requires_nhis_authorization)
                          .length
                      }{' '}
                      require NHIS auth
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Procedures Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-t">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Procedure Name
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Base Price
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            NHIS Price
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Prof. Fee
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            NHIS Auth
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {procs.map((proc) => (
                          <tr key={proc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-gray-600">
                                {proc.code}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {proc.name}
                                </p>
                                {proc.body_system && (
                                  <p className="text-xs text-gray-500">
                                    {proc.body_system}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(proc.base_price)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-green-600">
                                {formatCurrency(proc.nhis_price)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-gray-600">
                                {formatCurrency(proc.professional_fee || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {proc.requires_nhis_authorization ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Required
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Not Required
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProcedure(proc)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(groupedProcedures).length === 0 && (
            <EmptyState
              icon={<Stethoscope className="h-12 w-12" />}
              title="No procedures found"
              description="Try adjusting your search or category filter"
            />
          )}
        </div>
      )}

      {/* Edit Procedure Modal */}
      {editingProcedure && (
        <Modal
          isOpen
          onClose={() => setEditingProcedure(null)}
          title="Edit Procedure Price"
          size="md"
        >
          <div className="space-y-4">
            {/* Procedure Info Header */}
            <div
              className={`p-4 rounded-lg border ${getCategoryConfig(editingProcedure.category).color} bg-opacity-50`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${getCategoryConfig(editingProcedure.category).color}`}
                >
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {editingProcedure.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Code: {editingProcedure.code} •{' '}
                    {getCategoryConfig(editingProcedure.category).label}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (₦)
                  </label>
                  <Input
                    type="number"
                    value={editingProcedure.base_price}
                    onChange={(e) =>
                      setEditingProcedure({
                        ...editingProcedure,
                        base_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard price for private patients
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    NHIS Price (₦)
                  </label>
                  <Input
                    type="number"
                    value={editingProcedure.nhis_price}
                    onChange={(e) =>
                      setEditingProcedure({
                        ...editingProcedure,
                        nhis_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-lg font-semibold border-green-300 focus:border-green-500"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    NHIS tariff price
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Professional Fee (₦)
                  </label>
                  <Input
                    type="number"
                    value={editingProcedure.professional_fee}
                    onChange={(e) =>
                      setEditingProcedure({
                        ...editingProcedure,
                        professional_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Doctor/Specialist fee
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facility Fee (₦)
                  </label>
                  <Input
                    type="number"
                    value={editingProcedure.facility_fee}
                    onChange={(e) =>
                      setEditingProcedure({
                        ...editingProcedure,
                        facility_fee: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Equipment/facility usage fee
                  </p>
                </div>
              </div>

              {/* NHIS Authorization Toggle */}
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProcedure.requires_nhis_authorization}
                    onChange={(e) =>
                      setEditingProcedure({
                        ...editingProcedure,
                        requires_nhis_authorization: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <p className="font-medium text-amber-800">
                      Requires NHIS Pre-Authorization
                    </p>
                    <p className="text-sm text-amber-600">
                      If enabled, this procedure will require NHIS desk approval
                      before being performed for NHIS patients
                    </p>
                  </div>
                </label>
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-lg bg-gray-100">
                <p className="text-sm font-medium text-gray-700">
                  Total Price Breakdown:
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Base Price:</span>
                    <span className="font-medium">
                      {formatCurrency(editingProcedure.base_price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Professional Fee:</span>
                    <span className="font-medium">
                      {formatCurrency(editingProcedure.professional_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Facility Fee:</span>
                    <span className="font-medium">
                      {formatCurrency(editingProcedure.facility_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(
                        editingProcedure.base_price +
                          editingProcedure.professional_fee +
                          editingProcedure.facility_fee,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingProcedure(null)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveProcedure}
                disabled={updateProcedurePrice.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProcedurePrice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
