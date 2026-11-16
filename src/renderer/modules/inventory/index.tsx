import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import {
  DataTable,
  EmptyState,
  StatsCard,
} from '../../components/ui/DataDisplay';
import { Button, Input, Select } from '../../components/ui/FormElements';
import { Modal } from '../../components/ui/Modal';
import {
  useCreateInventoryItem,
  useInventoryCategories,
  useInventoryItems,
  useInventorySubscription,
} from './hooks/useInventory';
import { InventoryItemDTO } from './dtos/inventory.dto';
import { InventoryItemForm } from './components/InventoryItemForm';
import { useToast } from '../../components/ui/Toast';
import { InlineGuidance } from '../../components/guidance/InlineGuidance';

const EMPTY_CATEGORIES: any[] = [];
const EMPTY_ITEMS: any[] = [];

export default function Inventory() {
  // Enable real-time updates
  useInventorySubscription();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { showToast } = useToast();

  const categoriesQuery = useInventoryCategories();
  const itemsQuery = useInventoryItems({
    query,
    category_id: categoryId || undefined,
    low_stock: lowStock,
  });
  const createItem = useCreateInventoryItem();

  const categories = useMemo(
    () => categoriesQuery.data || EMPTY_CATEGORIES,
    [categoriesQuery.data],
  );
  const items = useMemo(
    () => itemsQuery.data || EMPTY_ITEMS,
    [itemsQuery.data],
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'All Categories' },
      ...categories.map((c) => ({ value: c.category_id, label: c.name })),
    ],
    [categories],
  );

  const stats = useMemo(() => {
    const low = items.filter(
      (i) => i.quantity_in_stock <= (i.reorder_level ?? 0),
    ).length;
    return { total: items.length, low };
  }, [items]);

  const columns = [
    {
      key: 'item_code',
      header: 'Code',
      render: (i: InventoryItemDTO) => (
        <span className="font-medium">{i.item_code}</span>
      ),
    },
    {
      key: 'item_name',
      header: 'Item',
      render: (i: InventoryItemDTO) => (
        <span className="text-sm text-gray-900">{i.item_name}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (i: InventoryItemDTO) => (
        <span className="text-sm text-gray-600">{i.category?.name || '—'}</span>
      ),
    },
    {
      key: 'quantity_in_stock',
      header: 'Stock',
      render: (i: InventoryItemDTO) => (
        <span
          className={`text-sm font-medium ${
            i.quantity_in_stock <= (i.reorder_level ?? 0)
              ? 'text-red-600'
              : 'text-gray-900'
          }`}
        >
          {i.quantity_in_stock}
        </span>
      ),
    },
    {
      key: 'reorder_level',
      header: 'Reorder',
      render: (i: InventoryItemDTO) => (
        <span className="text-sm">{i.reorder_level}</span>
      ),
    },
  ];

  let tableContent: React.ReactNode;
  if (itemsQuery.isLoading && !itemsQuery.data) {
    tableContent = (
      <div className="p-4">
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  } else if (items.length > 0) {
    tableContent = <DataTable data={items} columns={columns as any} />;
  } else {
    tableContent = (
      <EmptyState
        icon={Search}
        title="No inventory items"
        description="Create an inventory item to get started"
        action={<Button onClick={() => setShowCreate(true)}>New Item</Button>}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Manage stock for non-drug items</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>
          New Item
        </Button>
      </div>

      <InlineGuidance
        module="inventory"
        id="inventory-guidance"
        title="General Inventory"
        message="Track non-medication consumables and hospital supplies. Set reorder levels to get alerts when stock is low."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="Total Items" value={stats.total} />
        <StatsCard
          title="Low Stock"
          value={stats.low}
          variant={stats.low > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex flex-wrap gap-4">
          <div className="flex-1 min-w-[220px]">
            <Input
              placeholder="Search by code or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={Search}
            />
          </div>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
          />
          <Button
            variant={lowStock ? 'primary' : 'outline'}
            onClick={() => setLowStock((v) => !v)}
          >
            Low Stock
          </Button>
        </div>

        {tableContent}
      </div>

      {showCreate && (
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="New Inventory Item"
          size="lg"
        >
          <InventoryItemForm
            onCancel={() => setShowCreate(false)}
            isLoading={createItem.isPending}
            onSubmit={async (payload) => {
              try {
                await createItem.mutateAsync(payload);
                showToast({
                  type: 'success',
                  title: 'Item Created',
                  message: 'Inventory item added successfully',
                });
                setShowCreate(false);
              } catch (error) {
                showToast({
                  type: 'error',
                  title: 'Create Failed',
                  message: 'Failed to create inventory item',
                });
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
