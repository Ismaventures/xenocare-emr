import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  CheckCircle,
  Package,
  ShoppingCart,
  DollarSign,
  Tag,
} from 'lucide-react';
import { useSurgeryConsumables, useSurgeries } from '../hooks/useSurgery';
import { SurgeryConsumableFormData } from '../types/surgery.types';

const SurgeryConsumableForm: React.FC = () => {
  const navigate = useNavigate();
  const { surgeryId } = useParams<{ surgeryId: string }>();

  const { getSurgeryById } = useSurgeries();
  const { addConsumable } = useSurgeryConsumables();

  const [surgeryInfo, setSurgeryInfo] = useState<{
    number: string;
    patient: string;
  }>({
    number: '',
    patient: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isImplant, setIsImplant] = useState(false);

  // Implant specifics
  const [implantLocation, setImplantLocation] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  useEffect(() => {
    if (surgeryId) {
      loadData();
    }
  }, [surgeryId]);

  const loadData = async () => {
    if (!surgeryId) return;
    const surgery = await getSurgeryById(surgeryId);
    if (surgery) {
      setSurgeryInfo({
        number: surgery.surgery_number,
        patient: surgery.patient_name || 'Unknown',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryId) return;

    setSaving(true);
    setError(null);

    const formData: SurgeryConsumableFormData = {
      item_name: itemName,
      category,
      quantity_used: quantity,
      unit,
      batch_number: batchNumber,
      expiry_date: expiryDate,
      is_implant: isImplant,
      serial_number: serialNumber,
      implant_details: isImplant
        ? {
            implant_name: itemName,
            location: implantLocation,
            serial_number: serialNumber,
            lot_number: batchNumber,
          }
        : undefined,
    };

    const result = await addConsumable(surgeryId, formData);

    setSaving(false);
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        navigate(`/surgery/${surgeryId}`);
      }, 1000);
    } else {
      setError('Failed to add consumable item.');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/surgery/${surgeryId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Add Consumable / Implant
          </h1>
          <p className="text-sm text-gray-500">
            {surgeryInfo.number} • {surgeryInfo.patient}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-700">Item added successfully!</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Surgical Sutures 3-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Category...</option>
                <option value="Sutures">Sutures</option>
                <option value="Dressings">Dressings</option>
                <option value="Implants">Implants</option>
                <option value="Medicines">Medicines</option>
                <option value="Instruments">Disposable Instruments</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Unit"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch / Lot Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isImplant}
                onChange={(e) => setIsImplant(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="font-medium text-gray-900">
                This is an Implant
              </span>
            </label>

            {isImplant && (
              <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-900 mb-1">
                    Implant Location
                  </label>
                  <input
                    type="text"
                    required={isImplant}
                    value={implantLocation}
                    onChange={(e) => setImplantLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm"
                    placeholder="e.g. Left Knee, L4-L5 Vertebra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-900 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/surgery/${surgeryId}`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Add Item
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SurgeryConsumableForm;
