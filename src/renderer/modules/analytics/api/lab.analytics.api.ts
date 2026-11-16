import { supabase } from '../../../api/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface DateFilters {
  startDate: string;
  endDate: string;
}

export interface LabRevenue {
  total: number;
  byCategory: { category: string; revenue: number; count: number }[];
}

export interface LabTAT {
  averageMinutes: number;
  averageHours: string;
  distribution: {
    under1hr: number;
    '1to2hr': number;
    '2to4hr': number;
    '4to8hr': number;
    over8hr: number;
  };
  byTest: { test: string; avgMinutes: number; count: number }[];
  complianceRate: number; // % meeting target TAT
}

export interface AbnormalResults {
  total: number;
  normal: number;
  abnormal: number;
  critical: number;
  abnormalRate: number;
  criticalRate: number;
}

export interface LabTestVolume {
  testName: string;
  count: number;
  revenue: number;
  avgTAT: number;
}

// =============================================================================
// Laboratory Analytics Functions
// =============================================================================

/**
 * Get lab revenue breakdown by category
 */
export async function getLabRevenue(filters: DateFilters): Promise<LabRevenue> {
  const { data, error } = await supabase
    .from('lab_requests')
    .select('test_name, price, category')
    .eq('status', 'Completed')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching lab revenue:', error);
    return { total: 0, byCategory: [] };
  }

  let total = 0;
  const byCategory: Record<string, { revenue: number; count: number }> = {};

  (data || []).forEach((req) => {
    const price = req.price || 0;
    total += price;

    // Try to categorize by test name if category is not set
    const category = req.category || categorizeLabTest(req.test_name);
    if (!byCategory[category]) byCategory[category] = { revenue: 0, count: 0 };
    byCategory[category].revenue += price;
    byCategory[category].count++;
  });

  return {
    total,
    byCategory: Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

/**
 * Helper to categorize lab tests
 */
function categorizeLabTest(testName: string): string {
  const name = (testName || '').toLowerCase();

  if (
    name.includes('fbc') ||
    name.includes('cbc') ||
    name.includes('hemo') ||
    name.includes('blood count')
  ) {
    return 'Hematology';
  }
  if (name.includes('mp') || name.includes('malaria')) {
    return 'Parasitology';
  }
  if (
    name.includes('glucose') ||
    name.includes('lipid') ||
    name.includes('liver') ||
    name.includes('renal') ||
    name.includes('electrolyte')
  ) {
    return 'Chemistry';
  }
  if (name.includes('urine') || name.includes('urinalysis')) {
    return 'Urinalysis';
  }
  if (name.includes('culture') || name.includes('sensitivity')) {
    return 'Microbiology';
  }
  if (
    name.includes('hiv') ||
    name.includes('hepatitis') ||
    name.includes('vdrl') ||
    name.includes('widal')
  ) {
    return 'Serology';
  }
  if (name.includes('pregnancy') || name.includes('hcg')) {
    return 'Immunology';
  }

  return 'Other';
}

/**
 * Get lab turnaround time analysis
 */
export async function getLabTAT(filters: DateFilters): Promise<LabTAT> {
  const { data, error } = await supabase
    .from('lab_requests')
    .select('test_name, created_at, completed_at, status')
    .eq('status', 'Completed')
    .not('completed_at', 'is', null)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching lab TAT:', error);
    return {
      averageMinutes: 0,
      averageHours: '0',
      distribution: {
        under1hr: 0,
        '1to2hr': 0,
        '2to4hr': 0,
        '4to8hr': 0,
        over8hr: 0,
      },
      byTest: [],
      complianceRate: 0,
    };
  }

  const tatMinutes: number[] = [];
  const byTest: Record<string, { total: number; count: number }> = {};
  const TARGET_TAT_MINUTES = 120; // 2 hours target

  (data || []).forEach((req) => {
    if (!req.created_at || !req.completed_at) return;

    const created = new Date(req.created_at);
    const completed = new Date(req.completed_at);
    const tat = Math.round((completed.getTime() - created.getTime()) / 60000);

    if (tat >= 0 && tat < 10000) {
      // Filter out unreasonable values
      tatMinutes.push(tat);

      const test = req.test_name || 'Unknown';
      if (!byTest[test]) byTest[test] = { total: 0, count: 0 };
      byTest[test].total += tat;
      byTest[test].count++;
    }
  });

  const avgTAT =
    tatMinutes.length > 0
      ? tatMinutes.reduce((a, b) => a + b, 0) / tatMinutes.length
      : 0;

  const distribution = {
    under1hr: tatMinutes.filter((t) => t < 60).length,
    '1to2hr': tatMinutes.filter((t) => t >= 60 && t < 120).length,
    '2to4hr': tatMinutes.filter((t) => t >= 120 && t < 240).length,
    '4to8hr': tatMinutes.filter((t) => t >= 240 && t < 480).length,
    over8hr: tatMinutes.filter((t) => t >= 480).length,
  };

  const metTarget = tatMinutes.filter((t) => t <= TARGET_TAT_MINUTES).length;
  const complianceRate =
    tatMinutes.length > 0
      ? Math.round((metTarget / tatMinutes.length) * 100)
      : 0;

  return {
    averageMinutes: Math.round(avgTAT),
    averageHours: (avgTAT / 60).toFixed(1),
    distribution,
    byTest: Object.entries(byTest)
      .map(([test, d]) => ({
        test,
        avgMinutes: Math.round(d.total / d.count),
        count: d.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    complianceRate,
  };
}

/**
 * Get abnormal results analysis
 */
export async function getAbnormalResults(
  filters: DateFilters,
): Promise<AbnormalResults> {
  const { data, error } = await supabase
    .from('lab_requests')
    .select('id, result_status, is_critical, result')
    .eq('status', 'Completed')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching abnormal results:', error);
    return {
      total: 0,
      normal: 0,
      abnormal: 0,
      critical: 0,
      abnormalRate: 0,
      criticalRate: 0,
    };
  }

  let total = 0;
  let normal = 0;
  let abnormal = 0;
  let critical = 0;

  (data || []).forEach((req) => {
    total++;

    const status = (req.result_status || '').toLowerCase();
    if (
      status === 'abnormal' ||
      status === 'high' ||
      status === 'low' ||
      status === 'positive'
    ) {
      abnormal++;
    } else {
      normal++;
    }

    if (req.is_critical) {
      critical++;
    }
  });

  return {
    total,
    normal,
    abnormal,
    critical,
    abnormalRate: total > 0 ? Math.round((abnormal / total) * 100) : 0,
    criticalRate: total > 0 ? Math.round((critical / total) * 1000) / 10 : 0, // per 1000
  };
}

/**
 * Get lab test volume with revenue
 */
export async function getLabTestVolume(
  filters: DateFilters,
  limit: number = 15,
): Promise<LabTestVolume[]> {
  const { data, error } = await supabase
    .from('lab_requests')
    .select('test_name, price, created_at, completed_at')
    .eq('status', 'Completed')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);

  if (error) {
    console.error('Error fetching lab test volume:', error);
    return [];
  }

  const byTest: Record<
    string,
    { count: number; revenue: number; tatSum: number; tatCount: number }
  > = {};

  (data || []).forEach((req) => {
    const test = req.test_name || 'Unknown';
    if (!byTest[test])
      byTest[test] = { count: 0, revenue: 0, tatSum: 0, tatCount: 0 };

    byTest[test].count++;
    byTest[test].revenue += req.price || 0;

    if (req.created_at && req.completed_at) {
      const tat = Math.round(
        (new Date(req.completed_at).getTime() -
          new Date(req.created_at).getTime()) /
          60000,
      );
      if (tat >= 0 && tat < 10000) {
        byTest[test].tatSum += tat;
        byTest[test].tatCount++;
      }
    }
  });

  return Object.entries(byTest)
    .map(([testName, data]) => ({
      testName,
      count: data.count,
      revenue: data.revenue,
      avgTAT: data.tatCount > 0 ? Math.round(data.tatSum / data.tatCount) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get daily lab test trends
 */
export async function getLabDailyTrends(days: number = 30): Promise<
  {
    date: string;
    ordered: number;
    completed: number;
    revenue: number;
  }[]
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('lab_requests')
    .select('status, price, created_at, completed_at')
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('Error fetching lab daily trends:', error);
    return [];
  }

  const dailyMap: Record<
    string,
    { ordered: number; completed: number; revenue: number }
  > = {};

  (data || []).forEach((req) => {
    const orderDate = (req.created_at || '').split('T')[0];
    if (!dailyMap[orderDate])
      dailyMap[orderDate] = { ordered: 0, completed: 0, revenue: 0 };
    dailyMap[orderDate].ordered++;

    if (req.status === 'Completed' && req.completed_at) {
      const completedDate = req.completed_at.split('T')[0];
      if (!dailyMap[completedDate])
        dailyMap[completedDate] = { ordered: 0, completed: 0, revenue: 0 };
      dailyMap[completedDate].completed++;
      dailyMap[completedDate].revenue += req.price || 0;
    }
  });

  // Generate full date range
  const trends: {
    date: string;
    ordered: number;
    completed: number;
    revenue: number;
  }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    trends.push({
      date: dateStr,
      ordered: dailyMap[dateStr]?.ordered || 0,
      completed: dailyMap[dateStr]?.completed || 0,
      revenue: dailyMap[dateStr]?.revenue || 0,
    });
  }

  return trends;
}

/**
 * Get lab workload distribution
 */
export async function getLabWorkload(): Promise<{
  pending: number;
  sampleCollected: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('lab_requests')
    .select('status')
    .gte('created_at', today);

  if (error) {
    console.error('Error fetching lab workload:', error);
    return {
      pending: 0,
      sampleCollected: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };
  }

  const counts = {
    pending: 0,
    sampleCollected: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  (data || []).forEach((req) => {
    const status = (req.status || '').toLowerCase().replace(/\s+/g, '');
    if (status === 'ordered' || status === 'pending') counts.pending++;
    else if (status === 'samplecollected') counts.sampleCollected++;
    else if (status === 'inprogress') counts.inProgress++;
    else if (status === 'completed') counts.completed++;
    else if (status === 'cancelled') counts.cancelled++;
  });

  return counts;
}
