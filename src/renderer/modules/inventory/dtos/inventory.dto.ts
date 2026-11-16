export interface InventoryCategoryDTO {
  category_id: string;
  name: string;
  description: string | null;
  parent_category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemDTO {
  item_id: string;
  item_code: string;
  item_name: string;
  description: string | null;
  category_id: string | null;
  quantity_in_stock: number;
  reorder_level: number;
  unit_of_measure: string;
  unit_cost: number;
  selling_price: number;
  supplier: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  is_active: boolean;
  is_consumable: boolean;
  created_at: string;
  updated_at: string;

  category?: InventoryCategoryDTO;
}

export interface CreateInventoryItemDTO {
  item_code: string;
  item_name: string;
  description?: string;
  category_id?: string;
  quantity_in_stock?: number;
  reorder_level?: number;
  unit_of_measure?: string;
  unit_cost?: number;
  selling_price?: number;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string;
  is_active?: boolean;
  is_consumable?: boolean;
}

export interface UpdateInventoryItemDTO extends Partial<CreateInventoryItemDTO> {
  item_id: string;
}
