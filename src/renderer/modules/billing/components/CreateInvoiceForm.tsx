import React, { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  CreateInvoiceDTO,
  CreateInvoiceItemDTO,
  ChargeCategory,
  CHARGE_CATEGORIES,
  formatCurrency,
  calculateItemTotal,
} from '../dtos/billing.dto';
import { useCreateInvoice, usePriceList } from '../hooks/useBilling';
import {
  usePatients,
  usePatient,
} from '../../patient-registration/hooks/usePatient';
import { useClinic } from '../../encounter/hooks/useEncounter';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../components/ui/Toast';
import {
  useActiveEncounters,
  usePatientActiveEncounter,
} from '../../../lib/workflow';

interface CreateInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: any) => void;
  preselectedPatientId?: string;
}

export function CreateInvoiceForm({
  isOpen,
  onClose,
  onSuccess,
  preselectedPatientId,
}: CreateInvoiceFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(
    preselectedPatientId || '',
  );

  React.useEffect(() => {
    if (preselectedPatientId) {
      setSelectedPatientId(preselectedPatientId);
    }
  }, [preselectedPatientId]);

  const [items, setItems] = useState<CreateInvoiceItemDTO[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Price list modal
  const [showPriceList, setShowPriceList] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ChargeCategory>('Consultation');

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { data: patientsData, isLoading: loadingPatients } = usePatients({
    query: debouncedSearch,
  });
  const patients = patientsData?.patients || [];

  // Fetch specific patient if ID is selected (to ensure we have data even if not in search results)
  const { data: specificPatient } = usePatient(selectedPatientId);

  const { data: priceList } = usePriceList(selectedCategory);
  const createInvoice = useCreateInvoice();
  const { showToast } = useToast();

  const selectedPatient =
    specificPatient ||
    patients?.find((p) => p.patient_id === selectedPatientId);

  const { data: activeEncounter, isLoading: isLoadingEncounter } =
    usePatientActiveEncounter(selectedPatientId);

  // Fetch clinic details to get consultation fee
  const { data: clinic, isLoading: isLoadingClinic } = useClinic(
    activeEncounter?.clinic_id,
  );

  // Reset items when patient changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setItems([]);
    }
  }, [isOpen, selectedPatientId]);

  // Auto-populate consultation fee
  React.useEffect(() => {
    // Only run if we have clinic data, an active encounter, and NO items yet
    if (clinic && items.length === 0 && activeEncounter) {
      // Determine fee based on visit type or priority
      let fee = clinic.consultation_fee || 0;
      const clinicLabel = clinic.clinic_name || 'Clinic';
      let description = `${clinicLabel} - Consultation`;

      const visitType = activeEncounter.visit_type;
      const isFollowUp = visitType === 'Follow-up' || visitType === 'Follow-Up';
      const isEmergency =
        activeEncounter.priority === 'Emergency' || visitType === 'Emergency';

      console.log('DEBUG FEE CALCULATION:', {
        visitType,
        priority: activeEncounter.priority,
        isFollowUp,
        isEmergency,
        clinicFees: {
          standard: clinic.consultation_fee,
          followUp: clinic.follow_up_fee,
          emergency: clinic.emergency_fee,
        },
      });

      if (isFollowUp && clinic.follow_up_fee) {
        fee = clinic.follow_up_fee;
        description = `${clinicLabel} - Follow-up Consultation`;
      } else if (isEmergency && clinic.emergency_fee) {
        fee = clinic.emergency_fee;
        description = `${clinicLabel} - Emergency Consultation`;
      } else if (clinic.consultation_fee) {
        fee = clinic.consultation_fee;
        description = `${clinicLabel} - Consultation`;
      }

      // Ensure we don't add 0 fee items
      if (fee > 0) {
        setItems([
          {
            description,
            category: 'Consultation',
            quantity: 1,
            unit_price: fee,
            discount_percent: 0,
          },
        ]);
      }
    }
  }, [clinic, activeEncounter, items.length]); // Added items.length to dependency array to trigger after reset

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.unit_price;
  }, 0);

  const itemDiscounts = items.reduce((sum, item) => {
    const { discount } = calculateItemTotal(
      item.quantity,
      item.unit_price,
      item.discount_percent || 0,
    );
    return sum + discount;
  }, 0);

  const invoiceDiscount = subtotal * (discountPercent / 100);
  const totalDiscount = itemDiscounts + invoiceDiscount;
  const taxableAmount = subtotal - totalDiscount;
  const taxAmount = taxableAmount * (taxPercent / 100);
  const totalAmount = taxableAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId) {
      showToast({
        title: 'Error',
        message: 'Please select a patient',
        type: 'error',
      });
      return;
    }

    if (!activeEncounter?.id) {
      showToast({
        title: 'Error',
        message:
          'No active encounter found for this patient. Please create an encounter first.',
        type: 'error',
      });
      return;
    }

    if (items.length === 0) {
      showToast({
        title: 'Error',
        message: 'Please add at least one item',
        type: 'error',
      });
      return;
    }

    // Check for existing unpaid invoices
    if (
      activeEncounter &&
      (activeEncounter as any).invoices &&
      (activeEncounter as any).invoices.length > 0
    ) {
      const hasUnpaidInvoice = (activeEncounter as any).invoices.some(
        (inv: any) => inv.status === 'Pending' || inv.status === 'Draft',
      );
      if (hasUnpaidInvoice) {
        showToast({
          title: 'Error',
          message:
            'This patient already has an unpaid invoice. Please process payment first.',
          type: 'error',
        });
        return;
      }
    }

    try {
      const data: CreateInvoiceDTO = {
        patient_id: selectedPatient.patient_id,
        encounter_id: activeEncounter.id, // Required: Links invoice to encounter (EMR → Encounter → Invoice)
        items,
        discount_percent: discountPercent,
        tax_percent: taxPercent,
        due_date: dueDate || undefined,
        notes: notes || undefined,
      };

      const result = await createInvoice.mutateAsync(data);
      showToast({
        title: 'Success',
        message: 'Invoice created successfully',
        type: 'success',
      });
      if (onSuccess) {
        onSuccess(result);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      showToast({
        title: 'Error',
        message: 'Failed to create invoice',
        type: 'error',
      });
    }
  };

  const resetForm = () => {
    setSelectedPatientId('');
    setSearchQuery('');
    setItems([]);
    setDiscountPercent(0);
    setTaxPercent(0);
    setDueDate('');
    setNotes('');
  };

  const addItem = (item?: Partial<CreateInvoiceItemDTO>) => {
    setItems([
      ...items,
      {
        description: item?.description || '',
        category: item?.category || 'Other',
        quantity: item?.quantity || 1,
        unit_price: item?.unit_price || 0,
        discount_percent: item?.discount_percent || 0,
      },
    ]);
  };

  const updateItem = (
    index: number,
    updates: Partial<CreateInvoiceItemDTO>,
  ) => {
    setItems(
      items.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addFromPriceList = (priceItem: {
    item_name: string;
    category: ChargeCategory;
    unit_price: number;
  }) => {
    addItem({
      description: priceItem.item_name,
      category: priceItem.category,
      unit_price: priceItem.unit_price,
    });
    setShowPriceList(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Invoice"
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="invoice-form"
              variant="primary"
              disabled={
                !selectedPatientId ||
                items.length === 0 ||
                createInvoice.isPending
              }
            >
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient <span className="text-red-500">*</span>
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedPatient.first_name} {selectedPatient.surname}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedPatient.patient_id} •{' '}
                    {selectedPatient.contact_phone}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPatientId('')}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingPatients ? (
                      <div className="p-3 text-center text-gray-500">
                        Searching...
                      </div>
                    ) : patients && patients.length > 0 ? (
                      patients.slice(0, 5).map((patient) => (
                        <button
                          key={patient.patient_id}
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(patient.patient_id);
                            setItems([]);
                            setSearchQuery('');
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium">
                            {patient.first_name} {patient.surname}
                          </p>
                          <p className="text-sm text-gray-500">
                            {patient.patient_id}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500">
                        No patients found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Items <span className="text-red-500">*</span>
                </label>
                {(isLoadingEncounter || isLoadingClinic) && (
                  <span className="text-xs text-blue-600 flex items-center animate-pulse bg-blue-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-1.5" />
                    Loading fee...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPriceList(true)}
                >
                  From Price List
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addItem()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  No items added. Click "Add Item" or "From Price List" to add
                  items.
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="col-span-4">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, { description: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={item.category}
                        onChange={(e) =>
                          updateItem(index, {
                            category: e.target.value as ChargeCategory,
                          })
                        }
                        options={CHARGE_CATEGORIES.map((c) => ({
                          value: c,
                          label: c,
                        }))}
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        min={0}
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, {
                            unit_price: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 text-right font-medium pt-2">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="Discount (%)"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) =>
                  setDiscountPercent(parseFloat(e.target.value) || 0)
                }
              />
              <Input
                type="number"
                label="Tax (%)"
                min={0}
                max={100}
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-1">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Due Date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
          />
        </form>
      </Modal>

      {/* Price List Modal */}
      <Modal
        isOpen={showPriceList}
        onClose={() => setShowPriceList(false)}
        title="Add from Price List"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Category"
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as ChargeCategory)
            }
            options={CHARGE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
            {priceList && priceList.length > 0 ? (
              priceList.map((item) => (
                <button
                  key={item.price_id}
                  type="button"
                  onClick={() => addFromPriceList(item)}
                  className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-sm text-gray-500">{item.item_code}</p>
                  </div>
                  <span className="font-medium text-primary-600">
                    {formatCurrency(item.unit_price)}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No items in this category
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
