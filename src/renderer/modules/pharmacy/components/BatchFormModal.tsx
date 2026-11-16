import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  X,
  Package,
  Calendar,
  DollarSign,
  Hash,
  Building2,
  Save,
  Search,
  Check,
} from 'lucide-react';
import { Button, Input, Select, Textarea } from '../../../components/ui';
import { useCreateBatch, useUpdateBatch, useDrugs } from '../hooks/usePharmacy';
import {
  DrugBatchDTO,
  CreateBatchDTO,
  UpdateBatchDTO,
  BatchStatus,
  DrugDTO,
} from '../dtos/pharmacy.dto';
import { useToast } from '../../../components/ui/Toast';

// =============================================================================
// Types
// =============================================================================

interface BatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch?: DrugBatchDTO | null;
  drugId?: string;
}

interface FormData {
  drug_id: string;
  batch_number: string;
  quantity_received: number;
  expiry_date: string;
  manufacture_date: string;
  cost_price: number;
  selling_price: number;
  supplier_name: string;
  notes: string;
  status: BatchStatus;
}

// =============================================================================
// Component
// =============================================================================

export default function BatchFormModal({
  isOpen,
  onClose,
  batch,
  drugId,
}: BatchFormModalProps) {
  const { showToast } = useToast();
  const isEditing = !!batch;

  // Queries
  const { data: drugsData } = useDrugs({ limit: 1000 });

  // Mutations
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    drug_id: drugId || '',
    batch_number: '',
    quantity_received: 0,
    expiry_date: '',
    manufacture_date: '',
    cost_price: 0,
    selling_price: 0,
    supplier_name: '',
    notes: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );

  // Reset form when batch or drugId changes
  useEffect(() => {
    if (isOpen) {
      if (batch) {
        setFormData({
          drug_id: batch.drug_id,
          batch_number: batch.batch_number,
          quantity_received: batch.quantity_received,
          expiry_date: batch.expiry_date?.split('T')[0] || '',
          manufacture_date: batch.manufacture_date?.split('T')[0] || '',
          cost_price: batch.cost_price || 0,
          selling_price: batch.selling_price || 0,
          supplier_name: batch.supplier_name || '',
          notes: batch.notes || '',
          status: batch.status,
        });
      } else {
        setFormData({
          drug_id: drugId || '',
          batch_number: '',
          quantity_received: 0,
          expiry_date: '',
          manufacture_date: '',
          cost_price: 0,
          selling_price: 0,
          supplier_name: '',
          notes: '',
          status: 'active',
        });
      }
      setErrors({});
    }
  }, [isOpen, batch, drugId]);

  // Update selling price when drug changes
  useEffect(() => {
    if (!isEditing && formData.drug_id && drugsData?.data) {
      const selectedDrug = drugsData.data.find(
        (d) => d.drug_id === formData.drug_id,
      );
      // Prefer nhis_price for NHIS drugs, fallback to price
      const drugPrice =
        (selectedDrug as any)?.nhis_price || (selectedDrug as any)?.price;
      if (drugPrice) {
        setFormData((prev) => ({ ...prev, selling_price: drugPrice }));
      }
    }
  }, [formData.drug_id, drugsData?.data, isEditing]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.drug_id) newErrors.drug_id = 'Drug is required';
    if (!formData.batch_number.trim())
      newErrors.batch_number = 'Batch number is required';
    if (formData.quantity_received <= 0)
      newErrors.quantity_received = 'Quantity must be greater than 0';
    if (!formData.expiry_date)
      newErrors.expiry_date = 'Expiry date is required';
    if (formData.cost_price < 0)
      newErrors.cost_price = 'Cost price cannot be negative';
    if (formData.selling_price < 0)
      newErrors.selling_price = 'Selling price cannot be negative';

    // Validate expiry is in future for new batches
    if (!isEditing && formData.expiry_date) {
      const expiry = new Date(formData.expiry_date);
      if (expiry <= new Date()) {
        newErrors.expiry_date = 'Expiry date must be in the future';
      }
    }

    // Validate manufacture date is before expiry
    if (formData.manufacture_date && formData.expiry_date) {
      const mfg = new Date(formData.manufacture_date);
      const exp = new Date(formData.expiry_date);
      if (mfg >= exp) {
        newErrors.manufacture_date = 'Manufacture date must be before expiry';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (isEditing && batch) {
      // Update existing batch
      const updateData: UpdateBatchDTO = {
        batch_id: batch.batch_id,
        quantity_remaining: batch.quantity_remaining,
        expiry_date: formData.expiry_date,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        notes: formData.notes || undefined,
        status: formData.status,
      };

      updateBatch.mutate(updateData, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Updated',
            message: 'Batch updated successfully',
          });
          onClose();
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to update batch',
          });
          console.error('Failed to update batch:', error);
        },
      });
    } else {
      // Create new batch
      const createData: CreateBatchDTO = {
        drug_id: formData.drug_id,
        batch_number: formData.batch_number,
        quantity_received: formData.quantity_received,
        expiry_date: formData.expiry_date,
        manufacture_date: formData.manufacture_date || undefined,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        supplier_name: formData.supplier_name || undefined,
        notes: formData.notes || undefined,
      };

      createBatch.mutate(createData, {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Created',
            message: 'Batch added successfully',
          });
          onClose();
        },
        onError: (error) => {
          showToast({
            type: 'error',
            title: 'Creation Failed',
            message: 'Failed to create batch',
          });
          console.error('Failed to create batch:', error);
        },
      });
    }
  };

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const drugs = drugsData?.data || [];
  const isLoading = createBatch.isPending || updateBatch.isPending;

  // -- Drug search state (must be before any early return to avoid hooks ordering violation) --
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const drugSearchRef = useRef<HTMLDivElement>(null);

  const selectedDrug = useMemo(() => {
    if (!formData.drug_id) return null;
    return drugs.find((d) => d.drug_id === formData.drug_id) || null;
  }, [formData.drug_id, drugs]);

  const filteredDrugs = useMemo(() => {
    if (!drugSearch.trim()) return drugs.slice(0, 30);
    const q = drugSearch.toLowerCase();
    return drugs
      .filter(
        (d) =>
          d.drug_name?.toLowerCase().includes(q) ||
          d.drug_code?.toLowerCase().includes(q) ||
          d.generic_name?.toLowerCase().includes(q) ||
          d.brand_name?.toLowerCase().includes(q) ||
          d.strength?.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [drugs, drugSearch]);

  const handleSelectDrug = useCallback((drug: DrugDTO) => {
    handleChange('drug_id', drug.drug_id);
    setDrugSearch('');
    setShowDrugDropdown(false);
    // Auto-fill selling price
    const drugPrice =
      drug.nhis_price || drug.price || drug.selling_price || drug.unit_price;
    if (drugPrice) {
      setFormData((prev) => ({
        ...prev,
        selling_price: drugPrice,
        drug_id: drug.drug_id,
      }));
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        drugSearchRef.current &&
        !drugSearchRef.current.contains(e.target as Node)
      ) {
        setShowDrugDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-700 to-primary-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isEditing ? 'Edit Batch' : 'Add New Batch'}
                </h2>
                <p className="text-sm text-green-100">
                  {isEditing
                    ? `Batch: ${batch?.batch_number}`
                    : 'Enter batch details'}
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

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-5">
              {!isEditing && !drugId && (
                <div ref={drugSearchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drug <span className="text-red-500">*</span>
                  </label>

                  {/* Selected drug chip OR search input */}
                  {selectedDrug && !showDrugDropdown ? (
                    <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-emerald-50 border-emerald-200">
                      <Check
                        size={16}
                        className="text-emerald-600 flex-shrink-0"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {selectedDrug.drug_name}
                        {selectedDrug.strength
                          ? ` - ${selectedDrug.strength}`
                          : ''}
                        {selectedDrug.drug_type
                          ? ` (${selectedDrug.drug_type})`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleChange('drug_id', '');
                          setDrugSearch('');
                          setShowDrugDropdown(true);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search drugs by name, code, brand..."
                        value={drugSearch}
                        onChange={(e) => {
                          setDrugSearch(e.target.value);
                          setShowDrugDropdown(true);
                        }}
                        onFocus={() => setShowDrugDropdown(true)}
                        className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border transition-colors outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 ${
                          errors.drug_id ? 'border-red-400' : 'border-gray-300'
                        }`}
                        autoComplete="off"
                      />
                    </div>
                  )}

                  {/* Dropdown */}
                  {showDrugDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredDrugs.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No drugs found
                          {drugSearch ? ` for "${drugSearch}"` : ''}
                        </div>
                      ) : (
                        filteredDrugs.map((drug) => (
                          <button
                            key={drug.drug_id}
                            type="button"
                            onClick={() => handleSelectDrug(drug)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0 ${
                              formData.drug_id === drug.drug_id
                                ? 'bg-primary-50'
                                : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {drug.drug_name}
                                {drug.strength ? ` - ${drug.strength}` : ''}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {[
                                  drug.drug_type,
                                  drug.generic_name,
                                  drug.drug_code,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-gray-500">
                                Stock:{' '}
                                {drug.stock_quantity ??
                                  drug.quantity_in_stock ??
                                  0}
                              </div>
                              {(drug.price || drug.selling_price) && (
                                <div className="text-xs text-emerald-600 font-medium">
                                  ₦
                                  {(
                                    drug.price ||
                                    drug.selling_price ||
                                    0
                                  ).toLocaleString()}
                                </div>
                              )}
                            </div>
                            {formData.drug_id === drug.drug_id && (
                              <Check
                                size={16}
                                className="text-primary-600 flex-shrink-0"
                              />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {errors.drug_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.drug_id}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Batch Number"
                  required
                  leftIcon={Hash}
                  value={formData.batch_number}
                  onChange={(e) => handleChange('batch_number', e.target.value)}
                  error={errors.batch_number}
                  disabled={isEditing}
                  placeholder="e.g., BTH-2024-001"
                />
                <Input
                  label="Quantity Received"
                  required
                  type="number"
                  min={1}
                  value={formData.quantity_received}
                  onChange={(e) =>
                    handleChange(
                      'quantity_received',
                      parseInt(e.target.value) || 0,
                    )
                  }
                  error={errors.quantity_received}
                  disabled={isEditing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Expiry Date"
                  required
                  type="date"
                  leftIcon={Calendar}
                  value={formData.expiry_date}
                  onChange={(e) => handleChange('expiry_date', e.target.value)}
                  error={errors.expiry_date}
                />
                <Input
                  label="Manufacture Date"
                  type="date"
                  leftIcon={Calendar}
                  value={formData.manufacture_date}
                  onChange={(e) =>
                    handleChange('manufacture_date', e.target.value)
                  }
                  error={errors.manufacture_date}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cost Price (₦)"
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  leftIcon={DollarSign}
                  value={formData.cost_price}
                  onChange={(e) =>
                    handleChange('cost_price', parseFloat(e.target.value) || 0)
                  }
                  error={errors.cost_price}
                />
                <Input
                  label="Selling Price (₦)"
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  leftIcon={DollarSign}
                  value={formData.selling_price}
                  onChange={(e) =>
                    handleChange(
                      'selling_price',
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  error={errors.selling_price}
                />
              </div>

              <Input
                label="Supplier"
                leftIcon={Building2}
                value={formData.supplier_name}
                onChange={(e) => handleChange('supplier_name', e.target.value)}
                placeholder="Supplier name"
              />

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onChange={(e) =>
                      handleChange('status', e.target.value as BatchStatus)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="quarantine">Quarantine</option>
                    <option value="expired">Expired</option>
                    <option value="depleted">Depleted</option>
                    <option value="recalled">Recalled</option>
                  </Select>
                </div>
              )}

              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this batch..."
                rows={3}
              />
            </div>
          </form>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              icon={Save}
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {isEditing ? 'Update Batch' : 'Add Batch'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
