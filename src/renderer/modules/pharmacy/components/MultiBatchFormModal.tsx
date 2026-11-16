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
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Layers,
  Copy,
} from 'lucide-react';
import { Button, Input, Textarea } from '../../../components/ui';
import { useDrugs } from '../hooks/usePharmacy';
import { DrugDTO, CreateBatchDTO } from '../dtos/pharmacy.dto';
import { useToast } from '../../../components/ui/Toast';

// =============================================================================
// Types
// =============================================================================

interface MultiBatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (batches: CreateBatchDTO[]) => Promise<void>;
  isLoading?: boolean;
}

interface BatchEntry {
  id: string;
  drug_id: string;
  drug_name: string;
  drug_strength: string;
  drug_type: string;
  batch_number: string;
  quantity_received: number;
  expiry_date: string;
  manufacture_date: string;
  cost_price: number;
  selling_price: number;
  supplier_name: string;
  notes: string;
  isExpanded: boolean;
  errors: Record<string, string>;
}

const createEmptyEntry = (): BatchEntry => ({
  id: crypto.randomUUID(),
  drug_id: '',
  drug_name: '',
  drug_strength: '',
  drug_type: '',
  batch_number: '',
  quantity_received: 0,
  expiry_date: '',
  manufacture_date: '',
  cost_price: 0,
  selling_price: 0,
  supplier_name: '',
  notes: '',
  isExpanded: true,
  errors: {},
});

// =============================================================================
// DrugSearchInput Component (reusable within each entry)
// =============================================================================

function DrugSearchInput({
  drugs,
  selectedDrugId,
  onSelect,
  error,
}: {
  drugs: DrugDTO[];
  selectedDrugId: string;
  onSelect: (drug: DrugDTO) => void;
  error?: string;
}) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedDrug = useMemo(() => {
    if (!selectedDrugId) return null;
    return drugs.find((d) => d.drug_id === selectedDrugId) || null;
  }, [selectedDrugId, drugs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return drugs.slice(0, 30);
    const q = search.toLowerCase();
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
  }, [drugs, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {selectedDrug && !showDropdown ? (
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-emerald-50 border-emerald-200">
          <Check size={14} className="text-emerald-600 flex-shrink-0" />
          <span className="flex-1 text-sm font-medium text-gray-900 truncate">
            {selectedDrug.drug_name}
            {selectedDrug.strength ? ` - ${selectedDrug.strength}` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setShowDropdown(true);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search drug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 ${
              error ? 'border-red-400' : 'border-gray-300'
            }`}
            autoComplete="off"
          />
        </div>
      )}

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">
              No drugs found
            </div>
          ) : (
            filtered.map((drug) => (
              <button
                key={drug.drug_id}
                type="button"
                onClick={() => {
                  onSelect(drug);
                  setSearch('');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary-50 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {drug.drug_name}
                    {drug.strength ? ` - ${drug.strength}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {[drug.drug_type, drug.generic_name, drug.drug_code]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right flex-shrink-0">
                  Stk: {drug.stock_quantity ?? drug.quantity_in_stock ?? 0}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function MultiBatchFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: MultiBatchFormModalProps) {
  const { showToast } = useToast();
  const { data: drugsData } = useDrugs({ limit: 1000 });
  const drugs = drugsData?.data || [];

  const [entries, setEntries] = useState<BatchEntry[]>([createEmptyEntry()]);

  // Shared default fields
  const [sharedSupplier, setSharedSupplier] = useState('');
  const [sharedExpiryDate, setSharedExpiryDate] = useState('');
  const [useSharedDefaults, setUseSharedDefaults] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setEntries([createEmptyEntry()]);
      setSharedSupplier('');
      setSharedExpiryDate('');
      setUseSharedDefaults(false);
    }
  }, [isOpen]);

  // Update entry field
  const updateEntry = useCallback(
    (id: string, field: keyof BatchEntry, value: any) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const newErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(e.errors)) {
            if (k !== field) newErrors[k] = v;
          }
          return { ...e, [field]: value, errors: newErrors } as BatchEntry;
        }),
      );
    },
    [],
  );

  // Select drug for entry
  const handleSelectDrug = useCallback((entryId: string, drug: DrugDTO) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const newErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.errors)) {
          if (k !== 'drug_id') newErrors[k] = v;
        }
        const updated: BatchEntry = {
          ...e,
          drug_id: drug.drug_id,
          drug_name: drug.drug_name,
          drug_strength: drug.strength || '',
          drug_type: drug.drug_type || '',
          selling_price:
            drug.nhis_price ||
            drug.price ||
            drug.selling_price ||
            drug.unit_price ||
            0,
          errors: newErrors,
        };
        return updated;
      }),
    );
  }, []);

  // Add new entry
  const addEntry = useCallback(() => {
    const newEntry = createEmptyEntry();
    if (useSharedDefaults) {
      newEntry.supplier_name = sharedSupplier;
      newEntry.expiry_date = sharedExpiryDate;
    }
    setEntries((prev) => [...prev, newEntry]);
  }, [useSharedDefaults, sharedSupplier, sharedExpiryDate]);

  // Remove entry
  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  // Duplicate entry
  const duplicateEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const source = prev.find((e) => e.id === id);
      if (!source) return prev;
      const clone: BatchEntry = {
        ...source,
        id: crypto.randomUUID(),
        batch_number: '',
        quantity_received: 0,
        isExpanded: true,
        errors: {},
      };
      const idx = prev.findIndex((e) => e.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  // Toggle expand
  const toggleExpand = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isExpanded: !e.isExpanded } : e)),
    );
  }, []);

  // Apply shared defaults to all entries
  const applySharedDefaults = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        supplier_name: sharedSupplier || e.supplier_name,
        expiry_date: sharedExpiryDate || e.expiry_date,
      })),
    );
  }, [sharedSupplier, sharedExpiryDate]);

  // Validate all entries
  const validateAll = (): boolean => {
    let valid = true;
    setEntries((prev) =>
      prev.map((e) => {
        const errs: Record<string, string> = {};
        if (!e.drug_id) {
          errs.drug_id = 'Required';
          valid = false;
        }
        if (!e.batch_number.trim()) {
          errs.batch_number = 'Required';
          valid = false;
        }
        if (e.quantity_received <= 0) {
          errs.quantity_received = 'Must be > 0';
          valid = false;
        }
        if (!e.expiry_date) {
          errs.expiry_date = 'Required';
          valid = false;
        } else if (new Date(e.expiry_date) <= new Date()) {
          errs.expiry_date = 'Must be future';
          valid = false;
        }
        if (e.cost_price < 0) {
          errs.cost_price = 'Invalid';
          valid = false;
        }
        return { ...e, errors: errs };
      }),
    );
    return valid;
  };

  // Submit all entries
  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix errors in all batch entries',
      });
      // Expand entries with errors
      setEntries((prev) =>
        prev.map((ent) =>
          Object.keys(ent.errors).length > 0
            ? { ...ent, isExpanded: true }
            : ent,
        ),
      );
      return;
    }

    const batchDTOs: CreateBatchDTO[] = entries.map((e) => ({
      drug_id: e.drug_id,
      batch_number: e.batch_number,
      quantity_received: e.quantity_received,
      expiry_date: e.expiry_date,
      manufacture_date: e.manufacture_date || undefined,
      cost_price: e.cost_price,
      selling_price: e.selling_price || undefined,
      supplier_name: e.supplier_name || undefined,
      notes: e.notes || undefined,
    }));

    await onSubmit(batchDTOs);
  };

  // Stats
  const totalItems = entries.length;
  const totalQty = entries.reduce((s, e) => s + e.quantity_received, 0);
  const totalValue = entries.reduce(
    (s, e) => s + e.cost_price * e.quantity_received,
    0,
  );
  const errorCount = entries.filter(
    (e) => Object.keys(e.errors).length > 0,
  ).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-700 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add Multiple Batches
                </h2>
                <p className="text-sm text-indigo-100">
                  Select drugs and configure batch details for each
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-indigo-200">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Shared defaults section */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSharedDefaults}
                  onChange={(e) => setUseSharedDefaults(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Use shared defaults
              </label>
              {useSharedDefaults && (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <Building2 size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Shared supplier name"
                      value={sharedSupplier}
                      onChange={(e) => setSharedSupplier(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 flex-1 max-w-[200px] outline-none focus:ring-1 focus:ring-primary-300"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <input
                      type="date"
                      value={sharedExpiryDate}
                      onChange={(e) => setSharedExpiryDate(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary-300"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={applySharedDefaults}
                  >
                    Apply to All
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Entries list */}
          <form
            onSubmit={handleSubmitAll}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  Object.keys(entry.errors).length > 0
                    ? 'border-red-300 bg-red-50/30'
                    : entry.drug_id
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-gray-200'
                }`}
              >
                {/* Entry header */}
                <div
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50/50"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">
                      {entry.drug_name
                        ? `${entry.drug_name}${entry.drug_strength ? ` - ${entry.drug_strength}` : ''}`
                        : 'Select a drug...'}
                    </span>
                    {entry.batch_number && (
                      <span className="text-xs text-gray-500">
                        Batch: {entry.batch_number} · Qty:{' '}
                        {entry.quantity_received}
                      </span>
                    )}
                  </div>
                  {Object.keys(entry.errors).length > 0 && (
                    <AlertTriangle
                      size={14}
                      className="text-red-500 flex-shrink-0"
                    />
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateEntry(entry.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEntry(entry.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {entry.isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expandable form */}
                {entry.isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                    {/* Drug search */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Drug <span className="text-red-500">*</span>
                      </label>
                      <DrugSearchInput
                        drugs={drugs}
                        selectedDrugId={entry.drug_id}
                        onSelect={(drug) => handleSelectDrug(entry.id, drug)}
                        error={entry.errors.drug_id}
                      />
                    </div>

                    {/* Row 1: Batch # + Quantity */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Batch # <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Hash
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="e.g., BTH-2024-001"
                            value={entry.batch_number}
                            onChange={(e) =>
                              updateEntry(
                                entry.id,
                                'batch_number',
                                e.target.value,
                              )
                            }
                            className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-primary-200 ${
                              entry.errors.batch_number
                                ? 'border-red-400'
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {entry.errors.batch_number && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {entry.errors.batch_number}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={entry.quantity_received || ''}
                          onChange={(e) =>
                            updateEntry(
                              entry.id,
                              'quantity_received',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-primary-200 ${
                            entry.errors.quantity_received
                              ? 'border-red-400'
                              : 'border-gray-300'
                          }`}
                        />
                        {entry.errors.quantity_received && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {entry.errors.quantity_received}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Expiry + Manufacture */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={entry.expiry_date}
                          onChange={(e) =>
                            updateEntry(entry.id, 'expiry_date', e.target.value)
                          }
                          className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-primary-200 ${
                            entry.errors.expiry_date
                              ? 'border-red-400'
                              : 'border-gray-300'
                          }`}
                        />
                        {entry.errors.expiry_date && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {entry.errors.expiry_date}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Manufacture Date
                        </label>
                        <input
                          type="date"
                          value={entry.manufacture_date}
                          onChange={(e) =>
                            updateEntry(
                              entry.id,
                              'manufacture_date',
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-primary-200"
                        />
                      </div>
                    </div>

                    {/* Row 3: Cost + Selling */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Cost Price (₦)
                        </label>
                        <div className="relative">
                          <DollarSign
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={entry.cost_price || ''}
                            onChange={(e) =>
                              updateEntry(
                                entry.id,
                                'cost_price',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-primary-200 ${
                              entry.errors.cost_price
                                ? 'border-red-400'
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Selling Price (₦)
                        </label>
                        <div className="relative">
                          <DollarSign
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={entry.selling_price || ''}
                            onChange={(e) =>
                              updateEntry(
                                entry.id,
                                'selling_price',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-primary-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Supplier + Notes */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Supplier
                        </label>
                        <div className="relative">
                          <Building2
                            size={14}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Supplier name"
                            value={entry.supplier_name}
                            onChange={(e) =>
                              updateEntry(
                                entry.id,
                                'supplier_name',
                                e.target.value,
                              )
                            }
                            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-primary-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          placeholder="Optional notes"
                          value={entry.notes}
                          onChange={(e) =>
                            updateEntry(entry.id, 'notes', e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-primary-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add more button */}
            <button
              type="button"
              onClick={addEntry}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
            >
              <Plus size={16} />
              Add Another Drug
            </button>
          </form>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
            {/* Summary */}
            <div className="flex items-center gap-6 mb-3 text-xs text-gray-500">
              <span>
                <Package size={12} className="inline mr-1" />
                {totalItems} drug{totalItems !== 1 ? 's' : ''}
              </span>
              <span>
                <Layers size={12} className="inline mr-1" />
                {totalQty.toLocaleString()} total units
              </span>
              <span>
                <DollarSign size={12} className="inline mr-1" />₦
                {totalValue.toLocaleString()} total cost
              </span>
              {errorCount > 0 && (
                <span className="text-red-500">
                  <AlertTriangle size={12} className="inline mr-1" />
                  {errorCount} error{errorCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                icon={Save}
                onClick={handleSubmitAll}
                isLoading={isLoading}
              >
                Add {totalItems} Batch{totalItems !== 1 ? 'es' : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
