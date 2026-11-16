// =============================================================================
// XENOCARE EMR - Consumables Tracker Component
// Track materials and consumables used during procedures
// =============================================================================

import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  useProcedureConsumables,
  useAddProcedureConsumable,
} from '../hooks/useProcedures';
import type {
  ProcedureStatus,
  ProcedureConsumable,
} from '../../../types/database.types';

interface ConsumablesTrackerProps {
  procedureId: string;
  status: ProcedureStatus;
}

interface LocalConsumable {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
}

// Common consumables for quick add
const commonConsumables = [
  { name: 'Surgical Gloves (Sterile)', unit: 'pair', category: 'PPE' },
  { name: 'Surgical Gown', unit: 'piece', category: 'PPE' },
  { name: 'Gauze Pads 4x4', unit: 'pack', category: 'Dressing' },
  { name: 'Suture 3-0 Vicryl', unit: 'pack', category: 'Sutures' },
  { name: 'Suture 4-0 Nylon', unit: 'pack', category: 'Sutures' },
  { name: 'IV Cannula 20G', unit: 'piece', category: 'IV Access' },
  { name: 'Normal Saline 500ml', unit: 'bag', category: 'Fluids' },
  { name: 'Syringe 10ml', unit: 'piece', category: 'Injection' },
  { name: 'Needle 21G', unit: 'piece', category: 'Injection' },
  { name: 'Surgical Blade #10', unit: 'piece', category: 'Instruments' },
  { name: 'Betadine Solution', unit: 'ml', category: 'Antiseptic' },
  { name: 'Lidocaine 2%', unit: 'ml', category: 'Anesthetic' },
];

const ConsumablesTracker: React.FC<ConsumablesTrackerProps> = ({
  procedureId,
  status,
}) => {
  const [consumables, setConsumables] = useState<LocalConsumable[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newConsumable, setNewConsumable] = useState({
    name: '',
    quantity: 1,
    unit: 'piece',
    batch_number: '',
    expiry_date: '',
    notes: '',
  });

  const isEditable = status === 'scheduled' || status === 'in_progress';

  const addConsumable = (item?: (typeof commonConsumables)[0]) => {
    const consumable: LocalConsumable = {
      id: Date.now().toString(),
      name: item?.name || newConsumable.name,
      quantity: newConsumable.quantity,
      unit: item?.unit || newConsumable.unit,
      batch_number: newConsumable.batch_number || undefined,
      expiry_date: newConsumable.expiry_date || undefined,
      notes: newConsumable.notes || undefined,
    };

    setConsumables((prev) => [...prev, consumable]);
    setNewConsumable({
      name: '',
      quantity: 1,
      unit: 'piece',
      batch_number: '',
      expiry_date: '',
      notes: '',
    });
    setShowAddForm(false);
    setSearchTerm('');
  };

  const updateConsumable = (id: string, updates: Partial<LocalConsumable>) => {
    setConsumables((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const removeConsumable = (id: string) => {
    setConsumables((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredCommon = commonConsumables.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalItems = consumables.reduce((acc, c) => acc + c.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Consumables Used</h3>
          <p className="text-sm text-gray-500">
            Track materials and supplies used during this procedure
          </p>
        </div>
        {isEditable && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Add Consumable Form */}
      {showAddForm && isEditable && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="font-medium text-gray-900 mb-4">Add Consumable</h4>

          {/* Quick Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search common consumables..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Add Common Items */}
          {searchTerm && filteredCommon.length > 0 && (
            <div className="mb-4 max-h-48 overflow-y-auto">
              <p className="text-xs text-gray-500 uppercase mb-2">Quick Add</p>
              <div className="grid grid-cols-2 gap-2">
                {filteredCommon.slice(0, 6).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => addConsumable(item)}
                    className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.unit} • {item.category}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Entry Form */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Or enter manually:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  value={newConsumable.name}
                  onChange={(e) =>
                    setNewConsumable((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter consumable name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={newConsumable.quantity}
                  onChange={(e) =>
                    setNewConsumable((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 1,
                    }))
                  }
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Unit</label>
                <select
                  value={newConsumable.unit}
                  onChange={(e) =>
                    setNewConsumable((prev) => ({
                      ...prev,
                      unit: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="piece">Piece</option>
                  <option value="pack">Pack</option>
                  <option value="pair">Pair</option>
                  <option value="ml">ml</option>
                  <option value="bag">Bag</option>
                  <option value="vial">Vial</option>
                  <option value="box">Box</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={newConsumable.batch_number}
                  onChange={(e) =>
                    setNewConsumable((prev) => ({
                      ...prev,
                      batch_number: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newConsumable.expiry_date}
                  onChange={(e) =>
                    setNewConsumable((prev) => ({
                      ...prev,
                      expiry_date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => addConsumable()}
                disabled={!newConsumable.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consumables List */}
      {consumables.length > 0 ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Items Used</h4>
              <p className="text-sm text-gray-500">
                {consumables.length} items, {totalItems} total units
              </p>
            </div>
            {status === 'completed' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Finalized</span>
              </div>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Expiry
                </th>
                {isEditable && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {consumables.map((item) => {
                const isEditing = editingId === item.id;
                const isExpiringSoon =
                  item.expiry_date &&
                  new Date(item.expiry_date) <
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateConsumable(item.id, {
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          min="1"
                          className="w-20 px-2 py-1 border rounded"
                        />
                      ) : (
                        <span className="text-gray-700">
                          {item.quantity} {item.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {item.batch_number || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {item.expiry_date ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isExpiringSoon
                                ? 'text-amber-600'
                                : 'text-gray-500'
                            }
                          >
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </span>
                          {isExpiringSoon && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {isEditable && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingId(item.id)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeConsumable(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 font-medium">No consumables recorded</h3>
          <p className="text-gray-500 text-sm mt-1">
            {isEditable
              ? 'Add items used during this procedure.'
              : 'No consumables were recorded for this procedure.'}
          </p>
          {isEditable && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Item
            </button>
          )}
        </div>
      )}

      {/* Inventory Warning */}
      {isEditable && consumables.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Inventory Tracking</p>
              <p className="text-sm text-blue-600 mt-1">
                Consumables will be deducted from inventory when the procedure
                is completed. Ensure all items are accurately recorded.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumablesTracker;
