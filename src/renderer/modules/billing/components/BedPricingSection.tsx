// =============================================================================
// Bed Pricing Section
// Manage prices for wards and beds
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  Bed,
  Building,
  Search,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui/FormElements';
import { StatusBadge, EmptyState } from '../../../components/ui/DataDisplay';
import { Modal } from '../../../components/ui/Modal';
import {
  useWardPrices,
  useUpdateWardPrice,
  useWardTypes,
} from '../hooks/useServicePricing';
import { WardType } from '../api/service-pricing.api';
import { formatCurrency } from '../dtos/billing.dto';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/AuthContext';

// Ward type display configuration
const WARD_TYPE_CONFIG: Record<WardType, { label: string; color: string }> = {
  general: { label: 'General Ward', color: 'bg-blue-100 text-blue-700' },
  icu: { label: 'Intensive Care Unit', color: 'bg-red-100 text-red-700' },
  pediatric: { label: 'Pediatric Ward', color: 'bg-pink-100 text-pink-700' },
  maternity: {
    label: 'Maternity Ward',
    color: 'bg-purple-100 text-purple-700',
  },
  surgical: { label: 'Surgical Ward', color: 'bg-orange-100 text-orange-700' },
  orthopedic: {
    label: 'Orthopedic Ward',
    color: 'bg-amber-100 text-amber-700',
  },
  cardiac: { label: 'Cardiac Care', color: 'bg-rose-100 text-rose-700' },
  emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700' },
  psychiatric: {
    label: 'Psychiatric Ward',
    color: 'bg-indigo-100 text-indigo-700',
  },
  isolation: {
    label: 'Isolation Ward',
    color: 'bg-yellow-100 text-yellow-700',
  },
};

interface EditingWard {
  id: string;
  name: string;
  code: string;
  ward_type: WardType;
  price: number;
  nhis_price: number;
  is_nhis_covered: boolean;
  total_beds: number;
}

export function BedPricingSection() {
  const { staff } = useAuth();
  const { showToast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [wardTypeFilter, setWardTypeFilter] = useState<WardType | 'all'>('all');
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());
  const [editingWard, setEditingWard] = useState<EditingWard | null>(null);

  // Queries
  const { data: wards = [], isLoading, refetch } = useWardPrices();
  const { data: wardTypes = [] } = useWardTypes();

  // Mutations
  const updateWardPrice = useUpdateWardPrice();

  // Filter and group wards
  const filteredWards = useMemo(() => {
    let result = wards;

    if (wardTypeFilter !== 'all') {
      result = result.filter((w: any) => w.ward_type === wardTypeFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (w: any) =>
          w.name.toLowerCase().includes(search) ||
          w.code.toLowerCase().includes(search),
      );
    }

    return result;
  }, [wards, wardTypeFilter, searchTerm]);

  // Group by ward type
  const groupedWards = useMemo(() => {
    const groups: Record<string, any[]> = {};

    filteredWards.forEach((ward: any) => {
      const type = ward.ward_type || 'general';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(ward);
    });

    return groups;
  }, [filteredWards]);

  const toggleWardType = (type: string) => {
    setExpandedWards((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedWards(new Set(Object.keys(groupedWards)));
  };

  const collapseAll = () => {
    setExpandedWards(new Set());
  };

  const handleEditWard = (ward: any) => {
    setEditingWard({
      id: ward.id,
      name: ward.name,
      code: ward.code,
      ward_type: ward.ward_type,
      price: ward.price || 0,
      nhis_price: ward.nhis_price || 0,
      is_nhis_covered: ward.is_nhis_covered ?? true,
      total_beds: ward.total_beds || 0,
    });
  };

  const handleSaveWard = async () => {
    if (!editingWard) return;

    try {
      await updateWardPrice.mutateAsync({
        wardId: editingWard.id,
        updates: {
          price: editingWard.price,
          nhis_price: editingWard.nhis_price,
          is_nhis_covered: editingWard.is_nhis_covered,
          updated_by: (staff as any)?.id,
          reason: 'Ward price update via Service Management',
        },
      });

      showToast({
        message: 'Ward pricing updated successfully',
        type: 'success',
      });
      setEditingWard(null);
    } catch (error: any) {
      showToast({
        message: error.message || 'Failed to update ward',
        type: 'error',
      });
    }
  };

  const getWardTypeConfig = (type: string) => {
    return WARD_TYPE_CONFIG[type as WardType] || WARD_TYPE_CONFIG.general;
  };

  // Calculate totals
  const totalBeds = wards.reduce(
    (sum: number, w: any) => sum + (w.total_beds || 0),
    0,
  );
  const availableBeds = wards.reduce(
    (sum: number, w: any) => sum + (w.available_beds || 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search wards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={wardTypeFilter}
          onChange={(e) => setWardTypeFilter(e.target.value as any)}
          className="w-48"
        >
          <option value="all">All Ward Types</option>
          {wardTypes.map((type: WardType) => (
            <option key={type} value={type}>
              {getWardTypeConfig(type).label}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Wards</p>
          <p className="text-2xl font-bold text-gray-900">{wards.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Beds</p>
          <p className="text-2xl font-bold text-blue-600">{totalBeds}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Available Beds</p>
          <p className="text-2xl font-bold text-green-600">{availableBeds}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Ward Types</p>
          <p className="text-2xl font-bold text-purple-600">
            {Object.keys(groupedWards).length}
          </p>
        </div>
      </div>

      {/* Grouped Wards */}
      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="text-gray-500 mt-2">Loading wards...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedWards).map(([wardType, typeWards]) => {
            const config = getWardTypeConfig(wardType);
            const isExpanded = expandedWards.has(wardType);
            const typeTotalBeds = typeWards.reduce(
              (sum, w) => sum + (w.total_beds || 0),
              0,
            );

            return (
              <div key={wardType} className="border rounded-lg overflow-hidden">
                {/* Ward Type Header */}
                <button
                  onClick={() => toggleWardType(wardType)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        {config.label}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {typeWards.length} wards • {typeTotalBeds} beds
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {/* Wards Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-t">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Code
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Ward Name
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Beds
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Daily Rate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            NHIS Rate
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            NHIS Covered
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {typeWards.map((ward: any) => (
                          <tr key={ward.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-gray-600">
                                {ward.code}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Bed className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {ward.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-green-600 font-medium">
                                  {ward.available_beds}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-600">
                                  {ward.total_beds}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(ward.price || 0)}
                              </span>
                              <span className="text-xs text-gray-500">
                                /day
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-green-600">
                                {formatCurrency(ward.nhis_price || 0)}
                              </span>
                              <span className="text-xs text-gray-500">
                                /day
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {ward.is_nhis_covered ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge
                                status={ward.is_active ? 'Active' : 'Inactive'}
                                variant={ward.is_active ? 'success' : 'danger'}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditWard(ward)}
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

          {Object.keys(groupedWards).length === 0 && (
            <EmptyState
              icon={<Building className="h-12 w-12" />}
              title="No wards found"
              description="Try adjusting your search or filter"
            />
          )}
        </div>
      )}

      {/* Edit Ward Modal */}
      {editingWard && (
        <Modal
          isOpen
          onClose={() => setEditingWard(null)}
          title="Edit Ward Pricing"
          size="md"
        >
          <div className="space-y-4">
            {/* Ward Info Header */}
            <div
              className={`p-4 rounded-lg border ${getWardTypeConfig(editingWard.ward_type).color} bg-opacity-50`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${getWardTypeConfig(editingWard.ward_type).color}`}
                >
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {editingWard.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Code: {editingWard.code} •{' '}
                    {getWardTypeConfig(editingWard.ward_type).label} •{' '}
                    {editingWard.total_beds} beds
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Rate (₦)
                  </label>
                  <Input
                    type="number"
                    value={editingWard.price}
                    onChange={(e) =>
                      setEditingWard({
                        ...editingWard,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard daily rate for private patients
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    NHIS Daily Rate (₦)
                  </label>
                  <Input
                    type="number"
                    value={editingWard.nhis_price}
                    onChange={(e) =>
                      setEditingWard({
                        ...editingWard,
                        nhis_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-lg font-semibold border-green-300 focus:border-green-500"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    NHIS tariff daily rate
                  </p>
                </div>
              </div>

              {/* NHIS Coverage Toggle */}
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingWard.is_nhis_covered}
                    onChange={(e) =>
                      setEditingWard({
                        ...editingWard,
                        is_nhis_covered: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded border-green-400 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="font-medium text-green-800">NHIS Covered</p>
                    <p className="text-sm text-green-600">
                      When enabled, bed charges in this ward can be billed to
                      NHIS
                    </p>
                  </div>
                </label>
              </div>

              {/* Weekly/Monthly Summary */}
              <div className="p-4 rounded-lg bg-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Pricing Summary:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Private Patient</p>
                    <div className="space-y-1 mt-1">
                      <p className="text-sm">
                        Daily:{' '}
                        <strong>{formatCurrency(editingWard.price)}</strong>
                      </p>
                      <p className="text-sm">
                        Weekly:{' '}
                        <strong>{formatCurrency(editingWard.price * 7)}</strong>
                      </p>
                      <p className="text-sm">
                        30 Days:{' '}
                        <strong>
                          {formatCurrency(editingWard.price * 30)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">NHIS Patient</p>
                    <div className="space-y-1 mt-1">
                      <p className="text-sm text-green-700">
                        Daily:{' '}
                        <strong>
                          {formatCurrency(editingWard.nhis_price)}
                        </strong>
                      </p>
                      <p className="text-sm text-green-700">
                        Weekly:{' '}
                        <strong>
                          {formatCurrency(editingWard.nhis_price * 7)}
                        </strong>
                      </p>
                      <p className="text-sm text-green-700">
                        30 Days:{' '}
                        <strong>
                          {formatCurrency(editingWard.nhis_price * 30)}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingWard(null)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveWard}
                disabled={updateWardPrice.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateWardPrice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
