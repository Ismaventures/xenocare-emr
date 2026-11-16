import { supabase } from '../../../api/supabaseClient';
import {
  CreateInventoryItemDTO,
  InventoryCategoryDTO,
  InventoryItemDTO,
  UpdateInventoryItemDTO,
} from '../dtos/inventory.dto';

export interface InventoryFilters {
  query?: string;
  category_id?: string;
  low_stock?: boolean;
}

export const inventoryApi = {
  async getCategories(): Promise<InventoryCategoryDTO[]> {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as InventoryCategoryDTO[];
  },

  async getItems(filters: InventoryFilters = {}): Promise<InventoryItemDTO[]> {
    let query = supabase
      .from('inventory_items')
      .select(`*, category:inventory_categories(*)`)
      .order('item_name');

    if (filters.query) {
      query = query.or(
        `item_name.ilike.%${filters.query}%,item_code.ilike.%${filters.query}%`,
      );
    }
    if (filters.category_id)
      query = query.eq('category_id', filters.category_id);

    const { data, error } = await query;
    if (error) throw error;

    let items = (data || []) as InventoryItemDTO[];
    if (filters.low_stock) {
      items = items.filter(
        (i) => i.quantity_in_stock <= (i.reorder_level ?? 0),
      );
    }
    return items;
  },

  async createItem(payload: CreateInventoryItemDTO): Promise<InventoryItemDTO> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        ...payload,
        description: payload.description || null,
        category_id: payload.category_id || null,
        supplier: payload.supplier || null,
        batch_number: payload.batch_number || null,
        expiry_date: payload.expiry_date || null,
        quantity_in_stock: payload.quantity_in_stock ?? 0,
        reorder_level: payload.reorder_level ?? 10,
        unit_of_measure: payload.unit_of_measure || 'units',
        unit_cost: payload.unit_cost ?? 0,
        selling_price: payload.selling_price ?? 0,
        is_active: payload.is_active ?? true,
        is_consumable: payload.is_consumable ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as InventoryItemDTO;
  },

  async updateItem(payload: UpdateInventoryItemDTO): Promise<InventoryItemDTO> {
    const { item_id, ...rest } = payload;
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        ...rest,
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', item_id)
      .select()
      .single();

    if (error) throw error;
    return data as InventoryItemDTO;
  },
};
