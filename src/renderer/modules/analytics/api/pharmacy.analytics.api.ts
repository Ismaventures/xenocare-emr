import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface DrugFinancials {
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  marginPercentage: number;
  byCategory: {
    category: string;
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
  }[];
}

export interface ExpiryTracking {
  expired: { count: number; value: number; items: ExpiryItem[] };
  within30: { count: number; value: number; items: ExpiryItem[] };
  within60: { count: number; value: number; items: ExpiryItem[] };
  within90: { count: number; value: number; items: ExpiryItem[] };
}

export interface ExpiryItem {
  drugName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  value: number;
}

export interface StockVelocity {
  fast: StockItem[];
  slow: StockItem[];
  outOfStock: StockItem[];
  deadStockValue: number;
}

export interface StockItem {
  name: string;
  stock: number;
  consumed30d: number;
  stockValue: number;
  velocity: 'Fast' | 'Slow' | 'Out';
}

export interface TopDrugByRevenue {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  margin: number;
}

// =============================================================================
// Pharmacy Analytics Functions
// =============================================================================

/**
 * Get comprehensive drug financials with cost analysis
 */
export async function getDrugFinancials(
  filters: DateFilters,
): Promise<DrugFinancials> {
  // Get dispensed items with inventory data
  const { data, error } = await supabase
    .from('prescription_items')
    .select(
      `
      quantity,
      unit_price,
      medication_name,
      pharmacy_inventory!inner(drug_category, cost_price, selling_price)
    `,
    )
    .eq('status', 'Dispensed')
    .gte('updated_at', filters.startDate)
    .lte('updated_at', filters.endDate);

  if (error) {
    console.error('Error fetching drug financials:', error);
    // Try alternative query without join
    return getDrugFinancialsSimple(filters);
  }

  let totalRevenue = 0;
  let totalCost = 0;
  const byCategory: Record<string, { revenue: number; cost: number }> = {};

  (data || []).forEach((item) => {
    const qty = item.quantity || 0;
    const revenue =
      qty *
      (item.unit_price || (item.pharmacy_inventory as any)?.selling_price || 0);
    const cost = qty * ((item.pharmacy_inventory as any)?.cost_price || 0);
    const category = (item.pharmacy_inventory as any)?.drug_category || 'Other';

    totalRevenue += revenue;
    totalCost += cost;

    if (!byCategory[category]) byCategory[category] = { revenue: 0, cost: 0 };
    byCategory[category].revenue += revenue;
    byCategory[category].cost += cost;
  });

  const grossMargin = totalRevenue - totalCost;

  return {
    totalRevenue,
    totalCost,
    grossMargin,
    marginPercentage:
      totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0,
    byCategory: Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        cost: data.cost,
        margin: data.revenue - data.cost,
        marginPercent:
          data.revenue > 0
            ? Math.round(((data.revenue - data.cost) / data.revenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

/**
 * Simple drug financials without joins
 */
async function getDrugFinancialsSimple(
  filters: DateFilters,
): Promise<DrugFinancials> {
  const { data } = await supabase
    .from('prescription_items')
    .select('quantity, unit_price, medication_name')
    .eq('status', 'Dispensed')
    .gte('updated_at', filters.startDate)
    .lte('updated_at', filters.endDate);

  let totalRevenue = 0;
  const byMedication: Record<string, number> = {};

  (data || []).forEach((item) => {
    const revenue = (item.quantity || 0) * (item.unit_price || 0);
    totalRevenue += revenue;

    const med = item.medication_name || 'Unknown';
    byMedication[med] = (byMedication[med] || 0) + revenue;
  });

  // Estimate cost at 60% of revenue
  const estimatedCost = totalRevenue * 0.6;

  return {
    totalRevenue,
    totalCost: estimatedCost,
    grossMargin: totalRevenue - estimatedCost,
    marginPercentage: 40,
    byCategory: Object.entries(byMedication)
      .map(([category, revenue]) => ({
        category,
        revenue,
        cost: revenue * 0.6,
        margin: revenue * 0.4,
        marginPercent: 40,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}

/**
 * Get expiry tracking for pharmacy inventory
 */
export async function getExpiryTracking(): Promise<ExpiryTracking> {
  const today = new Date();
  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .select('drug_name, batch_number, expiry_date, quantity, selling_price')
    .lte('expiry_date', ninetyDays.toISOString())
    .gt('quantity', 0);

  if (error) {
    console.error('Error fetching expiry tracking:', error);
    return {
      expired: { count: 0, value: 0, items: [] },
      within30: { count: 0, value: 0, items: [] },
      within60: { count: 0, value: 0, items: [] },
      within90: { count: 0, value: 0, items: [] },
    };
  }

  const result: ExpiryTracking = {
    expired: { count: 0, value: 0, items: [] },
    within30: { count: 0, value: 0, items: [] },
    within60: { count: 0, value: 0, items: [] },
    within90: { count: 0, value: 0, items: [] },
  };

  (data || []).forEach((item) => {
    const expiry = new Date(item.expiry_date);
    const value = (item.quantity || 0) * (item.selling_price || 0);
    const record: ExpiryItem = {
      drugName: item.drug_name,
      batchNumber: item.batch_number || 'N/A',
      expiryDate: item.expiry_date,
      quantity: item.quantity || 0,
      value,
    };

    if (expiry < today) {
      result.expired.count++;
      result.expired.value += value;
      result.expired.items.push(record);
    } else if (expiry <= thirtyDays) {
      result.within30.count++;
      result.within30.value += value;
      result.within30.items.push(record);
    } else if (expiry <= sixtyDays) {
      result.within60.count++;
      result.within60.value += value;
      result.within60.items.push(record);
    } else {
      result.within90.count++;
      result.within90.value += value;
      result.within90.items.push(record);
    }
  });

  return result;
}

/**
 * Get stock velocity analysis (fast/slow moving)
 */
export async function getStockVelocity(): Promise<StockVelocity> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Get consumption in last 30 days
  const { data: consumption } = await supabase
    .from('prescription_items')
    .select('medication_name, quantity')
    .eq('status', 'Dispensed')
    .gte('updated_at', thirtyDaysAgo);

  // Get current inventory
  const { data: inventory } = await supabase
    .from('pharmacy_inventory')
    .select('id, drug_name, quantity, selling_price');

  const consumptionMap: Record<string, number> = {};
  (consumption || []).forEach((c) => {
    const name = c.medication_name || '';
    consumptionMap[name] = (consumptionMap[name] || 0) + (c.quantity || 0);
  });

  const analysis: StockItem[] = (inventory || []).map((item) => {
    const consumed = consumptionMap[item.drug_name] || 0;
    const stockValue = (item.quantity || 0) * (item.selling_price || 0);

    let velocity: 'Fast' | 'Slow' | 'Out';
    if (item.quantity <= 0) velocity = 'Out';
    else if (consumed > 0) velocity = 'Fast';
    else velocity = 'Slow';

    return {
      name: item.drug_name,
      stock: item.quantity || 0,
      consumed30d: consumed,
      stockValue,
      velocity,
    };
  });

  const fast = analysis
    .filter((i) => i.velocity === 'Fast')
    .sort((a, b) => b.consumed30d - a.consumed30d);
  const slow = analysis
    .filter((i) => i.velocity === 'Slow')
    .sort((a, b) => b.stockValue - a.stockValue);
  const outOfStock = analysis.filter((i) => i.velocity === 'Out');
  const deadStockValue = slow.reduce((sum, i) => sum + i.stockValue, 0);

  return { fast, slow, outOfStock, deadStockValue };
}

/**
 * Get top drugs by revenue
 */
export async function getTopDrugsByRevenue(
  filters: DateFilters,
  limit: number = 10,
): Promise<TopDrugByRevenue[]> {
  const { data, error } = await supabase
    .from('prescription_items')
    .select('medication_name, quantity, unit_price')
    .eq('status', 'Dispensed')
    .gte('updated_at', filters.startDate)
    .lte('updated_at', filters.endDate);

  if (error) {
    console.error('Error fetching top drugs by revenue:', error);
    return [];
  }

  const byDrug: Record<string, { quantity: number; revenue: number }> = {};

  (data || []).forEach((item) => {
    const name = item.medication_name || 'Unknown';
    const qty = item.quantity || 0;
    const revenue = qty * (item.unit_price || 0);

    if (!byDrug[name]) byDrug[name] = { quantity: 0, revenue: 0 };
    byDrug[name].quantity += qty;
    byDrug[name].revenue += revenue;
  });

  return Object.entries(byDrug)
    .map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: data.revenue,
      cost: data.revenue * 0.6, // Estimate
      margin: data.revenue * 0.4,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get low stock items
 */
export async function getLowStockItems(threshold: number = 50): Promise<
  {
    name: string;
    currentStock: number;
    reorderLevel: number;
    sellingPrice: number;
  }[]
> {
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .select('drug_name, quantity, reorder_level, selling_price')
    .or(`quantity.lte.${threshold},quantity.lte.reorder_level`)
    .order('quantity', { ascending: true });

  if (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }

  return (data || []).map((item) => ({
    name: item.drug_name,
    currentStock: item.quantity || 0,
    reorderLevel: item.reorder_level || threshold,
    sellingPrice: item.selling_price || 0,
  }));
}

/**
 * Get drug dispensing trends
 */
export async function getDrugDispensingTrends(days: number = 30): Promise<
  {
    date: string;
    count: number;
    revenue: number;
  }[]
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('prescription_items')
    .select('quantity, unit_price, updated_at')
    .eq('status', 'Dispensed')
    .gte('updated_at', startDate.toISOString());

  if (error) {
    console.error('Error fetching dispensing trends:', error);
    return [];
  }

  const dailyMap: Record<string, { count: number; revenue: number }> = {};

  (data || []).forEach((item) => {
    const date = (item.updated_at || '').split('T')[0];
    if (!dailyMap[date]) dailyMap[date] = { count: 0, revenue: 0 };
    dailyMap[date].count += item.quantity || 0;
    dailyMap[date].revenue += (item.quantity || 0) * (item.unit_price || 0);
  });

  // Generate full date range
  const trends: { date: string; count: number; revenue: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    trends.push({
      date: dateStr,
      count: dailyMap[dateStr]?.count || 0,
      revenue: dailyMap[dateStr]?.revenue || 0,
    });
  }

  return trends;
}

/**
 * Get stock status summary
 */
export async function getStockStatusSummary(): Promise<{
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}> {
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .select('quantity, reorder_level, selling_price');

  if (error) {
    console.error('Error fetching stock status:', error);
    return {
      totalItems: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
    };
  }

  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalValue = 0;

  (data || []).forEach((item) => {
    const qty = item.quantity || 0;
    const reorder = item.reorder_level || 50;
    totalValue += qty * (item.selling_price || 0);

    if (qty <= 0) outOfStock++;
    else if (qty <= reorder) lowStock++;
    else inStock++;
  });

  return {
    totalItems: data?.length || 0,
    inStock,
    lowStock,
    outOfStock,
    totalValue,
  };
}
