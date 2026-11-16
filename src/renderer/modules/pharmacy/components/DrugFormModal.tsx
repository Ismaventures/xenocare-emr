import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Pill,
  DollarSign,
  Package,
  AlertCircle,
  Info,
  Building2,
  Tag,
  Hash,
  FileText,
  Shield,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, Select, Textarea, Card } from '../../../components/ui';
import { useTimeTheme } from '../../../hooks/useTimeTheme';
import {
  DrugDTO,
  DRUG_CATEGORIES,
  DRUG_TYPES,
  DrugCategory,
  DrugType,
} from '../dtos/pharmacy.dto';

// =============================================================================
// Types
// =============================================================================

interface DrugFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DrugFormData) => Promise<void>;
  drug?: DrugDTO | null; // If provided, we're editing
  isLoading?: boolean;
}

export interface DrugFormData {
  drug_id?: string;
  drug_code: string;
  drug_name: string;
  generic_name: string;
  brand_name: string;
  category: DrugCategory | '';
  drug_type: DrugType | '';
  strength: string;
  manufacturer: string;
  unit_of_measure: string;
  unit_cost: number;
  selling_price: number;
  reorder_level: number;
  nhis_eligible: boolean;
  nhis_price: number | null;
  nhis_percentage: number;
  requires_prescription: boolean;
  is_controlled: boolean;
  is_active: boolean;
  description?: string;
}

const UNITS_OF_MEASURE = [
  'Tablet',
  'Capsule',
  'Bottle',
  'Vial',
  'Ampoule',
  'Sachet',
  'Tube',
  'Pack',
  'Strip',
  'Box',
  'Unit',
  'ml',
  'mg',
  'g',
];

// =============================================================================
// Component
// =============================================================================

export default function DrugFormModal({
  isOpen,
  onClose,
  onSubmit,
  drug,
  isLoading = false,
}: DrugFormModalProps) {
  const { isNightMode } = useTimeTheme();
  const isEditing = !!drug;

  // Form state
  const [formData, setFormData] = useState<DrugFormData>({
    drug_code: '',
    drug_name: '',
    generic_name: '',
    brand_name: '',
    category: '',
    drug_type: '',
    strength: '',
    manufacturer: '',
    unit_of_measure: 'Tablet',
    unit_cost: 0,
    selling_price: 0,
    reorder_level: 10,
    nhis_eligible: false,
    nhis_price: null,
    nhis_percentage: 0,
    requires_prescription: false,
    is_controlled: false,
    is_active: true,
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (isOpen && drug) {
      setFormData({
        drug_id: drug.drug_id,
        drug_code: drug.drug_code || '',
        drug_name: drug.drug_name || '',
        generic_name: drug.generic_name || '',
        brand_name: drug.brand_name || '',
        category: (drug.category as DrugCategory) || '',
        drug_type: (drug.drug_type as DrugType) || '',
        strength: drug.strength || '',
        manufacturer: drug.manufacturer || '',
        unit_of_measure: drug.unit_of_measure || 'Tablet',
        unit_cost: drug.unit_cost || 0,
        selling_price: drug.selling_price || 0,
        reorder_level: drug.reorder_level || 10,
        nhis_eligible: drug.nhis_eligible || false,
        nhis_price: drug.nhis_price || null,
        nhis_percentage: drug.nhis_percentage || 0,
        requires_prescription: drug.requires_prescription || false,
        is_controlled: drug.is_controlled || false,
        is_active: drug.is_active ?? true,
        description: '',
      });
      setErrors({});
    } else if (isOpen && !drug) {
      // Reset for new drug
      setFormData({
        drug_code: '',
        drug_name: '',
        generic_name: '',
        brand_name: '',
        category: '',
        drug_type: '',
        strength: '',
        manufacturer: '',
        unit_of_measure: 'Tablet',
        unit_cost: 0,
        selling_price: 0,
        reorder_level: 10,
        nhis_eligible: false,
        nhis_price: null,
        nhis_percentage: 0,
        requires_prescription: false,
        is_controlled: false,
        is_active: true,
        description: '',
      });
      setErrors({});
    }
  }, [isOpen, drug]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.drug_name.trim()) {
      newErrors.drug_name = 'Drug name is required';
    }
    if (!formData.drug_code.trim()) {
      newErrors.drug_code = 'Drug code is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.drug_type) {
      newErrors.drug_type = 'Drug type is required';
    }
    if (formData.selling_price <= 0) {
      newErrors.selling_price = 'Selling price must be greater than 0';
    }
    if (
      formData.nhis_eligible &&
      (!formData.nhis_price || formData.nhis_price <= 0)
    ) {
      newErrors.nhis_price = 'NHIS price is required when NHIS eligible';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  // Calculate margin
  const margin =
    formData.selling_price > 0 && formData.unit_cost > 0
      ? (
          ((formData.selling_price - formData.unit_cost) / formData.unit_cost) *
          100
        ).toFixed(1)
      : '0';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={`relative ${isNightMode ? 'bg-slate-800' : 'bg-white'} rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isEditing ? 'Edit Drug' : 'Add New Drug'}
                </h2>
                <p className="text-sm text-green-100">
                  {isEditing
                    ? 'Update drug details and pricing'
                    : 'Add a new drug to your catalogue'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <Card className="p-4">
                <h3
                  className={`text-sm font-semibold ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-4 flex items-center gap-2`}
                >
                  <Info size={16} className="text-blue-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Drug Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="drug_code"
                        value={formData.drug_code}
                        onChange={handleChange}
                        placeholder="e.g., DRG-001"
                        className="pl-10"
                        error={errors.drug_code}
                      />
                    </div>
                    {errors.drug_code && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.drug_code}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Drug Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="drug_name"
                      value={formData.drug_name}
                      onChange={handleChange}
                      placeholder="e.g., Paracetamol"
                      error={errors.drug_name}
                    />
                    {errors.drug_name && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.drug_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Generic Name
                    </label>
                    <Input
                      name="generic_name"
                      value={formData.generic_name}
                      onChange={handleChange}
                      placeholder="e.g., Acetaminophen"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Brand Name
                    </label>
                    <Input
                      name="brand_name"
                      value={formData.brand_name}
                      onChange={handleChange}
                      placeholder="e.g., Tylenol"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      error={errors.category}
                    >
                      <option value="">Select Category</option>
                      {DRUG_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                    {errors.category && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Drug Type/Form <span className="text-red-500">*</span>
                    </label>
                    <Select
                      name="drug_type"
                      value={formData.drug_type}
                      onChange={handleChange}
                      error={errors.drug_type}
                    >
                      <option value="">Select Type</option>
                      {DRUG_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    {errors.drug_type && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.drug_type}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Strength
                    </label>
                    <Input
                      name="strength"
                      value={formData.strength}
                      onChange={handleChange}
                      placeholder="e.g., 500mg, 10mg/5ml"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Manufacturer
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="manufacturer"
                        value={formData.manufacturer}
                        onChange={handleChange}
                        placeholder="e.g., Emzor Pharma"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Unit of Measure
                    </label>
                    <Select
                      name="unit_of_measure"
                      value={formData.unit_of_measure}
                      onChange={handleChange}
                    >
                      {UNITS_OF_MEASURE.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Pricing Section */}
              <Card className="p-4">
                <h3
                  className={`text-sm font-semibold ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-4 flex items-center gap-2`}
                >
                  <DollarSign size={16} className="text-green-500" />
                  Pricing & Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Cost Price (₦)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ₦
                      </span>
                      <Input
                        type="number"
                        name="unit_cost"
                        value={formData.unit_cost}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="pl-8"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Selling Price (₦) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ₦
                      </span>
                      <Input
                        type="number"
                        name="selling_price"
                        value={formData.selling_price}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="pl-8"
                        min={0}
                        step={0.01}
                        error={errors.selling_price}
                      />
                    </div>
                    {errors.selling_price && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.selling_price}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Margin
                    </label>
                    <div
                      className={`flex items-center h-10 px-3 ${isNightMode ? 'bg-slate-700' : 'bg-gray-100'} rounded-lg`}
                    >
                      <Percent size={16} className="text-gray-400 mr-2" />
                      <span
                        className={`font-medium ${parseFloat(margin) > 0 ? 'text-green-600' : 'text-gray-500'}`}
                      >
                        {margin}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                    >
                      Reorder Level
                    </label>
                    <div className="relative">
                      <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        name="reorder_level"
                        value={formData.reorder_level}
                        onChange={handleChange}
                        placeholder="10"
                        className="pl-10"
                        min={0}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when stock falls below this level
                    </p>
                  </div>
                </div>
              </Card>

              {/* NHIS Section */}
              <Card className="p-4">
                <h3
                  className={`text-sm font-semibold ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-4 flex items-center gap-2`}
                >
                  <Shield size={16} className="text-blue-500" />
                  NHIS Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="nhis_eligible"
                      name="nhis_eligible"
                      checked={formData.nhis_eligible}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor="nhis_eligible"
                      className={`text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'}`}
                    >
                      NHIS Eligible
                    </label>
                  </div>

                  {formData.nhis_eligible && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div>
                        <label
                          className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                        >
                          NHIS Price (₦) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            ₦
                          </span>
                          <Input
                            type="number"
                            name="nhis_price"
                            value={formData.nhis_price || ''}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="pl-8"
                            min={0}
                            step={0.01}
                            error={errors.nhis_price}
                          />
                        </div>
                        {errors.nhis_price && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.nhis_price}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          className={`block text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-1`}
                        >
                          NHIS Coverage (%)
                        </label>
                        <div className="relative">
                          <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            name="nhis_percentage"
                            value={formData.nhis_percentage}
                            onChange={handleChange}
                            placeholder="0"
                            className="pl-10"
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Regulatory Settings */}
              <Card className="p-4">
                <h3
                  className={`text-sm font-semibold ${isNightMode ? 'text-slate-300' : 'text-gray-700'} mb-4 flex items-center gap-2`}
                >
                  <FileText size={16} className="text-orange-500" />
                  Regulatory Settings
                </h3>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requires_prescription"
                      name="requires_prescription"
                      checked={formData.requires_prescription}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor="requires_prescription"
                      className={`text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'}`}
                    >
                      Requires Prescription
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_controlled"
                      name="is_controlled"
                      checked={formData.is_controlled}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label
                      htmlFor="is_controlled"
                      className={`text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'}`}
                    >
                      Controlled Substance
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label
                      htmlFor="is_active"
                      className={`text-sm font-medium ${isNightMode ? 'text-slate-300' : 'text-gray-700'}`}
                    >
                      Active (Available for prescribing)
                    </label>
                  </div>
                </div>
              </Card>
            </div>

            {/* Footer */}
            <div
              className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${isNightMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    {isEditing ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {isEditing ? 'Update Drug' : 'Add Drug'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
