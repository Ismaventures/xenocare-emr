// =============================================================================
// NDC MEDICAL CENTRE EMR - Procedure Consumables API
// Supabase API functions for tracking items used during procedures
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  ProcedureConsumable,
  CreateProcedureConsumableDTO,
} from '../../../types/database.types';

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get consumables for a procedure
 */
export async function getProcedureConsumables(procedureId: string) {
  const { data, error } = await supabase
    .from('procedure_consumables')
    .select('*')
    .eq('procedure_id', procedureId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return data as ProcedureConsumable[];
}

/**
 * Get consumable by ID
 */
export async function getConsumableById(consumableId: string) {
  const { data, error } = await supabase
    .from('procedure_consumables')
    .select('*')
    .eq('id', consumableId)
    .single();

  if (error) throw error;
  return data as ProcedureConsumable;
}

/**
 * Get total cost of consumables for a procedure
 */
export async function getProcedureConsumablesTotalCost(procedureId: string) {
  const { data, error } = await supabase
    .from('procedure_consumables')
    .select('total_cost, billable')
    .eq('procedure_id', procedureId);

  if (error) throw error;

  const totals = {
    total: 0,
    billable: 0,
    nonBillable: 0,
  };

  data.forEach((item) => {
    const cost = item.total_cost || 0;
    totals.total += cost;
    if (item.billable) {
      totals.billable += cost;
    } else {
      totals.nonBillable += cost;
    }
  });

  return totals;
}

/**
 * Get consumables usage summary for date range
 */
export async function getConsumablesUsageSummary(
  facilityId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('procedure_consumables')
    .select(
      `
      item_name,
      item_code,
      category,
      quantity_used,
      unit,
      total_cost,
      procedure:procedures!inner(facility_id, scheduled_date)
    `,
    )
    .eq('procedure.facility_id', facilityId)
    .gte('procedure.scheduled_date', startDate)
    .lte('procedure.scheduled_date', endDate);

  if (error) throw error;

  // Aggregate by item
  const summary: Record<
    string,
    {
      item_name: string;
      item_code: string | null;
      category: string | null;
      total_quantity: number;
      unit: string;
      total_cost: number;
      procedure_count: number;
    }
  > = {};

  data.forEach((item) => {
    const key = item.item_name;
    if (!summary[key]) {
      summary[key] = {
        item_name: item.item_name,
        item_code: item.item_code,
        category: item.category,
        total_quantity: 0,
        unit: item.unit,
        total_cost: 0,
        procedure_count: 0,
      };
    }
    summary[key].total_quantity += item.quantity_used;
    summary[key].total_cost += item.total_cost || 0;
    summary[key].procedure_count += 1;
  });

  return Object.values(summary).sort((a, b) => b.total_cost - a.total_cost);
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Add consumable to procedure
 */
export async function addProcedureConsumable(
  consumableData: CreateProcedureConsumableDTO,
  userId: string,
) {
  // Calculate total cost
  const totalCost = consumableData.unit_cost
    ? consumableData.unit_cost * consumableData.quantity_used
    : null;

  const { data, error } = await supabase
    .from('procedure_consumables')
    .insert({
      procedure_id: consumableData.procedure_id,
      item_id: consumableData.item_id,
      item_name: consumableData.item_name,
      item_code: consumableData.item_code,
      category: consumableData.category,
      quantity_used: consumableData.quantity_used,
      unit: consumableData.unit,
      unit_cost: consumableData.unit_cost,
      total_cost: totalCost,
      billable: true,
      batch_number: consumableData.batch_number,
      serial_number: consumableData.serial_number,
      expiry_date: consumableData.expiry_date,
      notes: consumableData.notes,
      recorded_by: userId,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureConsumable;
}

/**
 * Add multiple consumables at once
 */
export async function addBulkProcedureConsumables(
  procedureId: string,
  consumables: Omit<CreateProcedureConsumableDTO, 'procedure_id'>[],
  userId: string,
) {
  const items = consumables.map((c) => ({
    procedure_id: procedureId,
    item_id: c.item_id,
    item_name: c.item_name,
    item_code: c.item_code,
    category: c.category,
    quantity_used: c.quantity_used,
    unit: c.unit,
    unit_cost: c.unit_cost,
    total_cost: c.unit_cost ? c.unit_cost * c.quantity_used : null,
    billable: true,
    batch_number: c.batch_number,
    serial_number: c.serial_number,
    expiry_date: c.expiry_date,
    notes: c.notes,
    recorded_by: userId,
    recorded_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('procedure_consumables')
    .insert(items)
    .select();

  if (error) throw error;
  return data as ProcedureConsumable[];
}

/**
 * Update consumable quantity
 */
export async function updateConsumableQuantity(
  consumableId: string,
  quantity: number,
) {
  // First get current unit cost to recalculate total
  const { data: current } = await supabase
    .from('procedure_consumables')
    .select('unit_cost')
    .eq('id', consumableId)
    .single();

  const totalCost = current?.unit_cost ? current.unit_cost * quantity : null;

  const { data, error } = await supabase
    .from('procedure_consumables')
    .update({
      quantity_used: quantity,
      total_cost: totalCost,
    })
    .eq('id', consumableId)
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureConsumable;
}

/**
 * Update consumable billable status
 */
export async function updateConsumableBillable(
  consumableId: string,
  billable: boolean,
) {
  const { data, error } = await supabase
    .from('procedure_consumables')
    .update({ billable })
    .eq('id', consumableId)
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureConsumable;
}

/**
 * Remove consumable from procedure
 */
export async function removeProcedureConsumable(consumableId: string) {
  const { error } = await supabase
    .from('procedure_consumables')
    .delete()
    .eq('id', consumableId);

  if (error) throw error;
}

/**
 * Link consumable to inventory item (for deduction)
 */
export async function linkConsumableToInventory(
  consumableId: string,
  inventoryItemId: string,
) {
  const { data, error } = await supabase
    .from('procedure_consumables')
    .update({ item_id: inventoryItemId })
    .eq('id', consumableId)
    .select()
    .single();

  if (error) throw error;
  return data as ProcedureConsumable;
}
