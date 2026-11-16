import React, { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../../components/ui/FormElements';
import { CreateInventoryItemDTO } from '../dtos/inventory.dto';
import { useInventoryCategories } from '../hooks/useInventory';

interface InventoryItemFormProps {
  onSubmit: (payload: CreateInventoryItemDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InventoryItemForm({
  onSubmit,
  onCancel,
  isLoading,
}: InventoryItemFormProps) {
  const { data: categories } = useInventoryCategories();
  const categoryOptions = useMemo(
    () =>
      (categories || []).map((c) => ({ value: c.category_id, label: c.name })),
    [categories],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payload, setPayload] = useState<CreateInventoryItemDTO>({
    item_code: '',
    item_name: '',
    description: '',
    category_id: '',
    quantity_in_stock: 0,
    reorder_level: 10,
    unit_of_measure: 'units',
    unit_cost: 0,
    selling_price: 0,
    supplier: '',
    batch_number: '',
    expiry_date: '',
  });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!payload.item_code?.trim()) next.item_code = 'Item code is required';
    if (!payload.item_name?.trim()) next.item_name = 'Item name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      ...payload,
      category_id: payload.category_id || undefined,
      description: payload.description || undefined,
      supplier: payload.supplier || undefined,
      batch_number: payload.batch_number || undefined,
      expiry_date: payload.expiry_date || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Item Code"
          value={payload.item_code}
          onChange={(e) =>
            setPayload((p) => ({ ...p, item_code: e.target.value }))
          }
          error={errors.item_code}
        />
        <Input
          label="Item Name"
          value={payload.item_name}
          onChange={(e) =>
            setPayload((p) => ({ ...p, item_name: e.target.value }))
          }
          error={errors.item_name}
        />
      </div>

      <Select
        label="Category (optional)"
        value={payload.category_id || ''}
        onChange={(e) =>
          setPayload((p) => ({ ...p, category_id: e.target.value }))
        }
        options={categoryOptions}
      />

      <Textarea
        label="Description (optional)"
        value={payload.description || ''}
        onChange={(e) =>
          setPayload((p) => ({ ...p, description: e.target.value }))
        }
        rows={3}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Quantity"
          type="number"
          min={0}
          value={payload.quantity_in_stock ?? 0}
          onChange={(e) =>
            setPayload((p) => ({
              ...p,
              quantity_in_stock: Number(e.target.value),
            }))
          }
        />
        <Input
          label="Reorder Level"
          type="number"
          min={0}
          value={payload.reorder_level ?? 10}
          onChange={(e) =>
            setPayload((p) => ({ ...p, reorder_level: Number(e.target.value) }))
          }
        />
        <Input
          label="Unit"
          value={payload.unit_of_measure || 'units'}
          onChange={(e) =>
            setPayload((p) => ({ ...p, unit_of_measure: e.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Unit Cost"
          type="number"
          min={0}
          value={payload.unit_cost ?? 0}
          onChange={(e) =>
            setPayload((p) => ({ ...p, unit_cost: Number(e.target.value) }))
          }
        />
        <Input
          label="Selling Price"
          type="number"
          min={0}
          value={payload.selling_price ?? 0}
          onChange={(e) =>
            setPayload((p) => ({ ...p, selling_price: Number(e.target.value) }))
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Supplier (optional)"
          value={payload.supplier || ''}
          onChange={(e) =>
            setPayload((p) => ({ ...p, supplier: e.target.value }))
          }
        />
        <Input
          label="Batch (optional)"
          value={payload.batch_number || ''}
          onChange={(e) =>
            setPayload((p) => ({ ...p, batch_number: e.target.value }))
          }
        />
        <Input
          label="Expiry (optional)"
          type="date"
          value={payload.expiry_date || ''}
          onChange={(e) =>
            setPayload((p) => ({ ...p, expiry_date: e.target.value }))
          }
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={!!isLoading}>
          Save
        </Button>
      </div>
    </form>
  );
}
