import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface DebtAgingBucket {
  bucket: string;
  count: number;
  amount: number;
}

export interface GrossNetRevenue {
  gross: number;
  discounts: number;
  waivers: number;
  net: number;
  discountRate: number;
}

export interface CollectionEfficiency {
  billed: number;
  collected: number;
  efficiency: number;
  outstanding: number;
}

export interface DiscountAnalysis {
  total: number;
  count: number;
  byReason: { reason: string; amount: number; count: number }[];
  byAuthorizer: { name: string; amount: number; count: number }[];
}

export interface RevenueByService {
  service: string;
  gross: number;
  net: number;
  count: number;
}

export interface RevenueByDepartment {
  department: string;
  revenue: number;
  count: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  collected: number;
}

// =============================================================================
// Financial Analytics Functions
// =============================================================================

/**
 * Get debt aging report - invoices grouped by age buckets
 */
export async function getDebtAging(): Promise<DebtAgingBucket[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, balance, created_at, patient_id')
    .in('status', ['Pending', 'Partial'])
    .gt('balance', 0);

  if (error) {
    console.error('Error fetching debt aging:', error);
    return [];
  }

  const buckets: Record<string, { count: number; amount: number }> = {
    '0-30 days': { count: 0, amount: 0 },
    '31-60 days': { count: 0, amount: 0 },
    '61-90 days': { count: 0, amount: 0 },
    '90+ days': { count: 0, amount: 0 },
  };

  const today = new Date();
  (data || []).forEach((inv) => {
    const created = new Date(inv.created_at);
    const days = Math.floor(
      (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );

    let bucket: string;
    if (days <= 30) bucket = '0-30 days';
    else if (days <= 60) bucket = '31-60 days';
    else if (days <= 90) bucket = '61-90 days';
    else bucket = '90+ days';

    buckets[bucket].count++;
    buckets[bucket].amount += inv.balance || 0;
  });

  return Object.entries(buckets).map(([bucket, data]) => ({
    bucket,
    count: data.count,
    amount: data.amount,
  }));
}

/**
 * Get gross vs net revenue analysis
 */
export async function getGrossNetRevenue(
  filters: DateFilters,
): Promise<GrossNetRevenue> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select('gross_amount, discount_amount, net_amount, status')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching gross/net revenue:', error);
    return { gross: 0, discounts: 0, waivers: 0, net: 0, discountRate: 0 };
  }

  const totals = (data || []).reduce(
    (acc, order) => ({
      gross: acc.gross + (order.gross_amount || 0),
      discounts: acc.discounts + (order.discount_amount || 0),
      waivers:
        acc.waivers + (order.status === 'Waived' ? order.net_amount || 0 : 0),
      net: acc.net + (order.net_amount || 0),
    }),
    { gross: 0, discounts: 0, waivers: 0, net: 0 },
  );

  return {
    ...totals,
    discountRate:
      totals.gross > 0
        ? Math.round((totals.discounts / totals.gross) * 100)
        : 0,
  };
}

/**
 * Get collection efficiency metrics
 */
export async function getCollectionEfficiency(
  filters: DateFilters,
): Promise<CollectionEfficiency> {
  // Total billed
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, balance')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  // Total collected
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  const totalBilled = (invoices || []).reduce(
    (sum, i) => sum + (i.total_amount || 0),
    0,
  );
  const totalCollected = (payments || []).reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );
  const outstanding = (invoices || []).reduce(
    (sum, i) => sum + (i.balance || 0),
    0,
  );

  return {
    billed: totalBilled,
    collected: totalCollected,
    efficiency:
      totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
    outstanding,
  };
}

/**
 * Get discount and waiver analysis
 */
export async function getDiscountAnalysis(
  filters: DateFilters,
): Promise<DiscountAnalysis> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select(
      'discount_amount, discount_reason, discount_authorized_by, profiles!billing_orders_discount_authorized_by_fkey(full_name)',
    )
    .gt('discount_amount', 0)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching discount analysis:', error);
    return { total: 0, count: 0, byReason: [], byAuthorizer: [] };
  }

  let total = 0;
  const byReasonMap: Record<string, { amount: number; count: number }> = {};
  const byAuthorizerMap: Record<string, { amount: number; count: number }> = {};

  (data || []).forEach((order) => {
    const amount = order.discount_amount || 0;
    total += amount;

    const reason = order.discount_reason || 'Unspecified';
    if (!byReasonMap[reason]) byReasonMap[reason] = { amount: 0, count: 0 };
    byReasonMap[reason].amount += amount;
    byReasonMap[reason].count++;

    const authorizer = (order.profiles as any)?.full_name || 'Unknown';
    if (!byAuthorizerMap[authorizer])
      byAuthorizerMap[authorizer] = { amount: 0, count: 0 };
    byAuthorizerMap[authorizer].amount += amount;
    byAuthorizerMap[authorizer].count++;
  });

  return {
    total,
    count: data?.length || 0,
    byReason: Object.entries(byReasonMap).map(([reason, d]) => ({
      reason,
      ...d,
    })),
    byAuthorizer: Object.entries(byAuthorizerMap).map(([name, d]) => ({
      name,
      ...d,
    })),
  };
}

/**
 * Get revenue breakdown by service type
 */
export async function getRevenueByServiceType(
  filters: DateFilters,
): Promise<RevenueByService[]> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select('source_module, gross_amount, net_amount')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching revenue by service:', error);
    return [];
  }

  const byService: Record<
    string,
    { gross: number; net: number; count: number }
  > = {};

  (data || []).forEach((order) => {
    const service = order.source_module || 'Other';
    if (!byService[service])
      byService[service] = { gross: 0, net: 0, count: 0 };
    byService[service].gross += order.gross_amount || 0;
    byService[service].net += order.net_amount || 0;
    byService[service].count++;
  });

  return Object.entries(byService)
    .map(([service, data]) => ({ service, ...data }))
    .sort((a, b) => b.net - a.net);
}

/**
 * Get monthly revenue trends for a year
 */
export async function getMonthlyRevenueTrends(
  year: number,
): Promise<MonthlyRevenue[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // Get paid billing orders
  const { data: orders } = await supabase
    .from('billing_orders')
    .select('net_amount, created_at')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get actual payments
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthlyRevenue: number[] = Array(12).fill(0);
  const monthlyCollected: number[] = Array(12).fill(0);

  (orders || []).forEach((o) => {
    const month = new Date(o.created_at).getMonth();
    monthlyRevenue[month] += o.net_amount || 0;
  });

  (payments || []).forEach((p) => {
    const month = new Date(p.created_at).getMonth();
    monthlyCollected[month] += p.amount || 0;
  });

  return months.map((month, i) => ({
    month,
    revenue: monthlyRevenue[i],
    collected: monthlyCollected[i],
  }));
}

/**
 * Get revenue by payment method with date range
 */
export async function getRevenueByPaymentMethodRange(
  filters: DateFilters,
): Promise<
  {
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }[]
> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select('payment_method, net_amount')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching revenue by payment method:', error);
    return [];
  }

  const byMethod: Record<string, { amount: number; count: number }> = {};
  let total = 0;

  (data || []).forEach((order) => {
    const method = order.payment_method || 'Unknown';
    if (!byMethod[method]) byMethod[method] = { amount: 0, count: 0 };
    byMethod[method].amount += order.net_amount || 0;
    byMethod[method].count++;
    total += order.net_amount || 0;
  });

  return Object.entries(byMethod)
    .map(([method, data]) => ({
      method,
      ...data,
      percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Get NHIS claims reconciliation
 */
export async function getNHISReconciliation(filters: DateFilters): Promise<{
  submitted: { count: number; amount: number };
  pending: { count: number; amount: number };
  approved: { count: number; amount: number };
  rejected: { count: number; amount: number };
  details: any[];
}> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select(
      'id, patient_id, net_amount, status, nhis_claim_status, nhis_claim_date, created_at',
    )
    .eq('payment_method', 'NHIS')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching NHIS reconciliation:', error);
    return {
      submitted: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      details: [],
    };
  }

  const result = {
    submitted: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    details: data || [],
  };

  (data || []).forEach((order) => {
    const amount = order.net_amount || 0;
    result.submitted.count++;
    result.submitted.amount += amount;

    const claimStatus = order.nhis_claim_status || 'pending';
    if (claimStatus === 'approved') {
      result.approved.count++;
      result.approved.amount += amount;
    } else if (claimStatus === 'rejected') {
      result.rejected.count++;
      result.rejected.amount += amount;
    } else {
      result.pending.count++;
      result.pending.amount += amount;
    }
  });

  return result;
}

/**
 * Get daily revenue for a date range (for charts)
 */
export async function getDailyRevenue(filters: DateFilters): Promise<
  {
    date: string;
    cash: number;
    pos: number;
    nhis: number;
    retainership: number;
    transfer: number;
    total: number;
  }[]
> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select('payment_method, net_amount, created_at')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching daily revenue:', error);
    return [];
  }

  const dailyMap: Record<
    string,
    {
      cash: number;
      pos: number;
      nhis: number;
      retainership: number;
      transfer: number;
    }
  > = {};

  (data || []).forEach((order) => {
    const date = order.created_at.split('T')[0];
    if (!dailyMap[date]) {
      dailyMap[date] = {
        cash: 0,
        pos: 0,
        nhis: 0,
        retainership: 0,
        transfer: 0,
      };
    }

    const amount = order.net_amount || 0;
    const method = (order.payment_method || '').toLowerCase();

    if (method === 'cash') dailyMap[date].cash += amount;
    else if (method === 'pos') dailyMap[date].pos += amount;
    else if (method === 'nhis') dailyMap[date].nhis += amount;
    else if (method === 'retainership') dailyMap[date].retainership += amount;
    else if (method === 'transfer' || method === 'bank_transfer')
      dailyMap[date].transfer += amount;
  });

  return Object.entries(dailyMap)
    .map(([date, data]) => ({
      date,
      ...data,
      total:
        data.cash + data.pos + data.nhis + data.retainership + data.transfer,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
