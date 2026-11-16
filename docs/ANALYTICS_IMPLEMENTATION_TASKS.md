# NDC EMR Analytics Implementation Tasks

## Phase 1: Replace Mock Data with Real Data (Priority: CRITICAL)

### Task 1.1: Update ComprehensiveAnalytics.tsx
- [ ] Remove all `Math.random()` mock data
- [ ] Replace `monthlyPatientData` with real API call
- [ ] Replace `monthlyRevenueData` with real API call
- [ ] Replace `revenueByService` with real API call
- [ ] Replace `queueData` with real API call
- [ ] Replace `bedOccupancy` with real API call
- [ ] Replace drug category revenue hardcodes

### Task 1.2: New Analytics API Functions Required

```typescript
// Add to analytics.api.ts

// 1. Monthly Patient Trends (Real Data)
export async function getMonthlyPatientTrends(year: number) {
  const { data } = await supabase
    .from('patients')
    .select('created_at')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`);
  
  // Group by month
  const monthlyData = Array(12).fill(0);
  data?.forEach(p => {
    const month = new Date(p.created_at).getMonth();
    monthlyData[month]++;
  });
  
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    .map((name, i) => ({ name, value: monthlyData[i] }));
}

// 2. Monthly Revenue Trends (Real Data)
export async function getMonthlyRevenueTrends(year: number) {
  const { data } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .gte('payment_date', `${year}-01-01`)
    .lte('payment_date', `${year}-12-31`);
  
  const monthlyData = Array(12).fill(0);
  data?.forEach(p => {
    const month = new Date(p.payment_date).getMonth();
    monthlyData[month] += p.amount || 0;
  });
  
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    .map((name, i) => ({ name, value: monthlyData[i] }));
}

// 3. Revenue by Service Type (Real Data)
export async function getRevenueByServiceType(filters: DateFilters) {
  const { data } = await supabase
    .from('billing_orders')
    .select('source_module, net_amount')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const byService: Record<string, number> = {};
  data?.forEach(order => {
    const service = order.source_module || 'Other';
    byService[service] = (byService[service] || 0) + (order.net_amount || 0);
  });
  
  return Object.entries(byService).map(([name, value]) => ({ name, value }));
}

// 4. Queue Distribution (Real Data)
export async function getQueueDistribution() {
  const { data } = await supabase
    .from('queue')
    .select('department, status')
    .eq('created_at::date', new Date().toISOString().split('T')[0]);
  
  const byDept: Record<string, { waiting: number; inProgress: number; completed: number }> = {};
  
  data?.forEach(q => {
    const dept = q.department || 'Unknown';
    if (!byDept[dept]) byDept[dept] = { waiting: 0, inProgress: 0, completed: 0 };
    if (q.status === 'Waiting') byDept[dept].waiting++;
    else if (q.status === 'In_Progress') byDept[dept].inProgress++;
    else if (q.status === 'Completed') byDept[dept].completed++;
  });
  
  return Object.entries(byDept).map(([name, data]) => ({ name, ...data }));
}

// 5. Bed Occupancy (Real Data)
export async function getBedOccupancy() {
  // This requires a wards/beds table - may need schema update
  const { data: wards } = await supabase
    .from('wards')
    .select('id, name, total_beds');
  
  const { data: admissions } = await supabase
    .from('admissions')
    .select('ward_id')
    .eq('status', 'Active');
  
  const occupiedByWard: Record<string, number> = {};
  admissions?.forEach(a => {
    occupiedByWard[a.ward_id] = (occupiedByWard[a.ward_id] || 0) + 1;
  });
  
  return wards?.map(w => ({
    name: w.name,
    occupied: occupiedByWard[w.id] || 0,
    available: w.total_beds - (occupiedByWard[w.id] || 0),
    total: w.total_beds,
    occupancyRate: Math.round((occupiedByWard[w.id] || 0) / w.total_beds * 100)
  })) || [];
}

// 6. Drug Revenue by Category (Real Data)
export async function getDrugRevenueByCategory(filters: DateFilters) {
  const { data } = await supabase
    .from('prescription_items')
    .select(`
      quantity,
      unit_price,
      pharmacy_inventory!inner(drug_category)
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const byCategory: Record<string, number> = {};
  data?.forEach(item => {
    const category = item.pharmacy_inventory?.drug_category || 'Other';
    const revenue = (item.quantity || 0) * (item.unit_price || 0);
    byCategory[category] = (byCategory[category] || 0) + revenue;
  });
  
  return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
}
```

---

## Phase 2: Financial Analytics API (Week 1)

### Task 2.1: Create financial.analytics.api.ts
```typescript
// src/renderer/modules/analytics/api/financial.analytics.api.ts

// Debt Aging Report
export async function getDebtAging() {
  const { data } = await supabase
    .from('invoices')
    .select('id, balance, created_at, patient_id')
    .in('status', ['Pending', 'Partial'])
    .gt('balance', 0);
  
  const buckets = {
    '0-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 }
  };
  
  const today = new Date();
  data?.forEach(inv => {
    const days = Math.floor((today - new Date(inv.created_at)) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
    buckets[bucket].count++;
    buckets[bucket].amount += inv.balance || 0;
  });
  
  return buckets;
}

// Gross vs Net Revenue
export async function getGrossNetRevenue(filters: DateFilters) {
  const { data } = await supabase
    .from('billing_orders')
    .select('gross_amount, discount_amount, net_amount')
    .in('status', ['Paid', 'Paid_NHIS', 'Paid_Retainership'])
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const totals = data?.reduce((acc, order) => ({
    gross: acc.gross + (order.gross_amount || 0),
    discounts: acc.discounts + (order.discount_amount || 0),
    net: acc.net + (order.net_amount || 0)
  }), { gross: 0, discounts: 0, net: 0 });
  
  return totals;
}

// Collection Efficiency
export async function getCollectionEfficiency(filters: DateFilters) {
  const { data: billed } = await supabase
    .from('invoices')
    .select('total_amount')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const { data: collected } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', filters.startDate)
    .lte('payment_date', filters.endDate);
  
  const totalBilled = billed?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
  const totalCollected = collected?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  return {
    billed: totalBilled,
    collected: totalCollected,
    efficiency: totalBilled > 0 ? Math.round(totalCollected / totalBilled * 100) : 0
  };
}

// Discount/Waiver Analysis
export async function getDiscountAnalysis(filters: DateFilters) {
  const { data } = await supabase
    .from('billing_orders')
    .select(`
      discount_amount,
      discount_reason,
      discount_authorized_by,
      source_module,
      created_at
    `)
    .gt('discount_amount', 0)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const byReason: Record<string, number> = {};
  const byAuthorizer: Record<string, number> = {};
  let total = 0;
  
  data?.forEach(order => {
    total += order.discount_amount || 0;
    const reason = order.discount_reason || 'Unspecified';
    const auth = order.discount_authorized_by || 'Unknown';
    byReason[reason] = (byReason[reason] || 0) + (order.discount_amount || 0);
    byAuthorizer[auth] = (byAuthorizer[auth] || 0) + (order.discount_amount || 0);
  });
  
  return { total, byReason, byAuthorizer, count: data?.length || 0 };
}
```

### Task 2.2: Create useFinancialAnalytics.ts hook
```typescript
// src/renderer/modules/analytics/hooks/useFinancialAnalytics.ts

import { useQuery } from '@tanstack/react-query';
import * as api from '../api/financial.analytics.api';

export function useDebtAging() {
  return useQuery({
    queryKey: ['analytics', 'debt-aging'],
    queryFn: api.getDebtAging
  });
}

export function useGrossNetRevenue(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'gross-net', filters],
    queryFn: () => api.getGrossNetRevenue(filters)
  });
}

export function useCollectionEfficiency(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'collection-efficiency', filters],
    queryFn: () => api.getCollectionEfficiency(filters)
  });
}

export function useDiscountAnalysis(filters: DateFilters) {
  return useQuery({
    queryKey: ['analytics', 'discounts', filters],
    queryFn: () => api.getDiscountAnalysis(filters)
  });
}
```

---

## Phase 3: Clinical Analytics API (Week 1-2)

### Task 3.1: Create clinical.analytics.api.ts
```typescript
// src/renderer/modules/analytics/api/clinical.analytics.api.ts

// Average Length of Stay
export async function getALOS(filters: DateFilters) {
  const { data } = await supabase
    .from('admissions')
    .select('admission_date, discharge_date, ward_id, wards(name)')
    .not('discharge_date', 'is', null)
    .gte('discharge_date', filters.startDate)
    .lte('discharge_date', filters.endDate);
  
  const byWard: Record<string, { totalDays: number; count: number }> = {};
  let totalDays = 0;
  let totalDischarges = 0;
  
  data?.forEach(a => {
    const days = (new Date(a.discharge_date) - new Date(a.admission_date)) / (1000 * 60 * 60 * 24);
    const ward = a.wards?.name || 'Unknown';
    
    if (!byWard[ward]) byWard[ward] = { totalDays: 0, count: 0 };
    byWard[ward].totalDays += days;
    byWard[ward].count++;
    
    totalDays += days;
    totalDischarges++;
  });
  
  return {
    overall: totalDischarges > 0 ? (totalDays / totalDischarges).toFixed(1) : 0,
    byWard: Object.entries(byWard).map(([name, data]) => ({
      name,
      alos: (data.totalDays / data.count).toFixed(1),
      discharges: data.count
    }))
  };
}

// Bed Occupancy Rate
export async function getBOR() {
  const { data: wards } = await supabase
    .from('wards')
    .select('id, name, total_beds');
  
  const { data: activeAdmissions } = await supabase
    .from('admissions')
    .select('ward_id')
    .eq('status', 'Active');
  
  const occupiedByWard: Record<string, number> = {};
  activeAdmissions?.forEach(a => {
    occupiedByWard[a.ward_id] = (occupiedByWard[a.ward_id] || 0) + 1;
  });
  
  let totalBeds = 0;
  let totalOccupied = 0;
  
  const wardData = wards?.map(w => {
    const occupied = occupiedByWard[w.id] || 0;
    totalBeds += w.total_beds;
    totalOccupied += occupied;
    
    return {
      name: w.name,
      totalBeds: w.total_beds,
      occupied,
      available: w.total_beds - occupied,
      rate: Math.round(occupied / w.total_beds * 100)
    };
  }) || [];
  
  return {
    overall: totalBeds > 0 ? Math.round(totalOccupied / totalBeds * 100) : 0,
    byWard: wardData
  };
}

// Patient Volume by Type
export async function getPatientVolume(filters: DateFilters) {
  const { data } = await supabase
    .from('visits')
    .select('visit_type, patient_type')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const byType = {
    OPD: 0,
    SOPD: 0,
    IPD: 0,
    Emergency: 0
  };
  
  data?.forEach(v => {
    const type = v.visit_type || v.patient_type || 'OPD';
    if (byType[type] !== undefined) byType[type]++;
    else byType.OPD++;
  });
  
  return Object.entries(byType).map(([name, value]) => ({ name, value }));
}

// Doctor Productivity
export async function getDoctorProductivity(filters: DateFilters) {
  const { data } = await supabase
    .from('consultations')
    .select(`
      doctor_id,
      profiles!consultations_doctor_id_fkey(full_name)
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const byDoctor: Record<string, { name: string; count: number }> = {};
  
  data?.forEach(c => {
    const id = c.doctor_id;
    const name = c.profiles?.full_name || 'Unknown';
    if (!byDoctor[id]) byDoctor[id] = { name, count: 0 };
    byDoctor[id].count++;
  });
  
  return Object.values(byDoctor)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
```

---

## Phase 4: Pharmacy Analytics API (Week 2)

### Task 4.1: Create pharmacy.analytics.api.ts
```typescript
// src/renderer/modules/analytics/api/pharmacy.analytics.api.ts

// Drug Revenue with Cost Analysis
export async function getDrugFinancials(filters: DateFilters) {
  const { data } = await supabase
    .from('prescription_items')
    .select(`
      quantity,
      unit_price,
      pharmacy_inventory!inner(
        drug_name,
        drug_category,
        cost_price,
        selling_price
      )
    `)
    .gte('dispensed_at', filters.startDate)
    .lte('dispensed_at', filters.endDate);
  
  let totalRevenue = 0;
  let totalCost = 0;
  const byCategory: Record<string, { revenue: number; cost: number; margin: number }> = {};
  
  data?.forEach(item => {
    const qty = item.quantity || 0;
    const revenue = qty * (item.unit_price || 0);
    const cost = qty * (item.pharmacy_inventory?.cost_price || 0);
    const category = item.pharmacy_inventory?.drug_category || 'Other';
    
    totalRevenue += revenue;
    totalCost += cost;
    
    if (!byCategory[category]) byCategory[category] = { revenue: 0, cost: 0, margin: 0 };
    byCategory[category].revenue += revenue;
    byCategory[category].cost += cost;
  });
  
  Object.keys(byCategory).forEach(cat => {
    byCategory[cat].margin = byCategory[cat].revenue > 0
      ? Math.round((byCategory[cat].revenue - byCategory[cat].cost) / byCategory[cat].revenue * 100)
      : 0;
  });
  
  return {
    totalRevenue,
    totalCost,
    grossMargin: totalRevenue > 0 ? Math.round((totalRevenue - totalCost) / totalRevenue * 100) : 0,
    byCategory
  };
}

// Expiry Tracking
export async function getExpiryTracking() {
  const today = new Date();
  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDays = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  
  const { data } = await supabase
    .from('pharmacy_inventory')
    .select('drug_name, batch_number, expiry_date, quantity_in_stock, selling_price')
    .lte('expiry_date', ninetyDays.toISOString())
    .gt('quantity_in_stock', 0);
  
  const buckets = {
    expired: [] as any[],
    within30: [] as any[],
    within60: [] as any[],
    within90: [] as any[]
  };
  
  data?.forEach(item => {
    const expiry = new Date(item.expiry_date);
    const value = (item.quantity_in_stock || 0) * (item.selling_price || 0);
    const record = { ...item, value };
    
    if (expiry < today) buckets.expired.push(record);
    else if (expiry <= thirtyDays) buckets.within30.push(record);
    else if (expiry <= sixtyDays) buckets.within60.push(record);
    else buckets.within90.push(record);
  });
  
  return {
    expired: { count: buckets.expired.length, value: buckets.expired.reduce((s, i) => s + i.value, 0), items: buckets.expired },
    within30: { count: buckets.within30.length, value: buckets.within30.reduce((s, i) => s + i.value, 0), items: buckets.within30 },
    within60: { count: buckets.within60.length, value: buckets.within60.reduce((s, i) => s + i.value, 0), items: buckets.within60 },
    within90: { count: buckets.within90.length, value: buckets.within90.reduce((s, i) => s + i.value, 0), items: buckets.within90 }
  };
}

// Stock Velocity (Fast/Slow Moving)
export async function getStockVelocity() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: consumption } = await supabase
    .from('prescription_items')
    .select('inventory_id, quantity')
    .gte('dispensed_at', thirtyDaysAgo);
  
  const { data: inventory } = await supabase
    .from('pharmacy_inventory')
    .select('id, drug_name, quantity_in_stock, selling_price');
  
  const consumptionMap: Record<string, number> = {};
  consumption?.forEach(c => {
    consumptionMap[c.inventory_id] = (consumptionMap[c.inventory_id] || 0) + (c.quantity || 0);
  });
  
  const analysis = inventory?.map(item => ({
    name: item.drug_name,
    stock: item.quantity_in_stock,
    consumed30d: consumptionMap[item.id] || 0,
    stockValue: (item.quantity_in_stock || 0) * (item.selling_price || 0),
    velocity: consumptionMap[item.id] ? 'Fast' : item.quantity_in_stock > 0 ? 'Slow' : 'Out'
  })) || [];
  
  return {
    fast: analysis.filter(i => i.velocity === 'Fast'),
    slow: analysis.filter(i => i.velocity === 'Slow'),
    outOfStock: analysis.filter(i => i.velocity === 'Out'),
    deadStockValue: analysis.filter(i => i.velocity === 'Slow').reduce((s, i) => s + i.stockValue, 0)
  };
}
```

---

## Phase 5: Laboratory Analytics API (Week 2)

### Task 5.1: Create lab.analytics.api.ts
```typescript
// src/renderer/modules/analytics/api/lab.analytics.api.ts

// Lab Revenue by Category
export async function getLabRevenue(filters: DateFilters) {
  const { data } = await supabase
    .from('lab_requests')
    .select(`
      price,
      test_category,
      lab_tests!inner(category)
    `)
    .eq('status', 'Completed')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const byCategory: Record<string, number> = {};
  let total = 0;
  
  data?.forEach(req => {
    const category = req.test_category || req.lab_tests?.category || 'Other';
    const price = req.price || 0;
    byCategory[category] = (byCategory[category] || 0) + price;
    total += price;
  });
  
  return {
    total,
    byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value }))
  };
}

// Turnaround Time Analysis
export async function getLabTAT(filters: DateFilters) {
  const { data } = await supabase
    .from('lab_requests')
    .select('test_name, created_at, result_entered_at, status')
    .eq('status', 'Completed')
    .not('result_entered_at', 'is', null)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const tatMinutes: number[] = [];
  const byTest: Record<string, { total: number; count: number }> = {};
  
  data?.forEach(req => {
    const tat = (new Date(req.result_entered_at).getTime() - new Date(req.created_at).getTime()) / (1000 * 60);
    tatMinutes.push(tat);
    
    if (!byTest[req.test_name]) byTest[req.test_name] = { total: 0, count: 0 };
    byTest[req.test_name].total += tat;
    byTest[req.test_name].count++;
  });
  
  const avgTAT = tatMinutes.length > 0 ? tatMinutes.reduce((a, b) => a + b, 0) / tatMinutes.length : 0;
  
  // Distribution buckets
  const distribution = {
    under1hr: tatMinutes.filter(t => t < 60).length,
    '1to2hr': tatMinutes.filter(t => t >= 60 && t < 120).length,
    '2to4hr': tatMinutes.filter(t => t >= 120 && t < 240).length,
    '4to8hr': tatMinutes.filter(t => t >= 240 && t < 480).length,
    over8hr: tatMinutes.filter(t => t >= 480).length
  };
  
  return {
    averageMinutes: Math.round(avgTAT),
    averageHours: (avgTAT / 60).toFixed(1),
    distribution,
    byTest: Object.entries(byTest).map(([name, d]) => ({
      name,
      avgMinutes: Math.round(d.total / d.count),
      count: d.count
    }))
  };
}

// Abnormal Results Tracking
export async function getAbnormalResults(filters: DateFilters) {
  const { data } = await supabase
    .from('lab_requests')
    .select('test_name, result_status, is_critical')
    .eq('status', 'Completed')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  let total = 0;
  let abnormal = 0;
  let critical = 0;
  
  data?.forEach(req => {
    total++;
    if (req.result_status === 'Abnormal' || req.result_status === 'High' || req.result_status === 'Low') {
      abnormal++;
    }
    if (req.is_critical) critical++;
  });
  
  return {
    total,
    abnormal,
    critical,
    abnormalRate: total > 0 ? Math.round(abnormal / total * 100) : 0,
    criticalRate: total > 0 ? Math.round(critical / total * 100) : 0
  };
}
```

---

## Phase 6: Medical Records Analytics (Week 3)

### Task 6.1: Create records.analytics.api.ts
```typescript
// src/renderer/modules/analytics/api/records.analytics.api.ts

// Documentation Completeness Score
export async function getDocumentationCompleteness(filters: DateFilters) {
  const { data: consultations } = await supabase
    .from('consultations')
    .select(`
      id,
      chief_complaint,
      history_of_present_illness,
      physical_examination,
      diagnosis,
      treatment_plan,
      icd_code
    `)
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  let totalScore = 0;
  const incomplete: any[] = [];
  
  consultations?.forEach(c => {
    let score = 0;
    const missing: string[] = [];
    
    if (c.chief_complaint) score += 15; else missing.push('Chief Complaint');
    if (c.history_of_present_illness) score += 20; else missing.push('HPI');
    if (c.physical_examination) score += 20; else missing.push('Physical Exam');
    if (c.diagnosis) score += 25; else missing.push('Diagnosis');
    if (c.treatment_plan) score += 10; else missing.push('Treatment Plan');
    if (c.icd_code) score += 10; else missing.push('ICD Code');
    
    totalScore += score;
    
    if (score < 100) {
      incomplete.push({ id: c.id, score, missing });
    }
  });
  
  const count = consultations?.length || 1;
  
  return {
    averageScore: Math.round(totalScore / count),
    totalRecords: count,
    completeRecords: consultations?.filter(c => 
      c.chief_complaint && c.history_of_present_illness && 
      c.physical_examination && c.diagnosis
    ).length || 0,
    incompleteRecords: incomplete.length,
    sampleIncomplete: incomplete.slice(0, 10)
  };
}

// ICD Coding Coverage
export async function getICDCoverage(filters: DateFilters) {
  const { data } = await supabase
    .from('consultations')
    .select('id, diagnosis, icd_code')
    .gte('created_at', filters.startDate)
    .lte('created_at', filters.endDate);
  
  const withICD = data?.filter(c => c.icd_code).length || 0;
  const withDiagnosis = data?.filter(c => c.diagnosis).length || 0;
  const total = data?.length || 0;
  
  return {
    total,
    withDiagnosis,
    withICD,
    icdCoverageRate: total > 0 ? Math.round(withICD / total * 100) : 0,
    diagnosisCoverageRate: total > 0 ? Math.round(withDiagnosis / total * 100) : 0
  };
}
```

---

## Phase 7: UI Dashboard Components (Week 3-4)

### Task 7.1: Create separate dashboard components
- [ ] `FinancialDashboard.tsx` - Dedicated financial analytics
- [ ] `ClinicalDashboard.tsx` - Clinical operations metrics
- [ ] `PharmacyDashboard.tsx` - Pharmacy-specific analytics
- [ ] `LabDashboard.tsx` - Laboratory analytics
- [ ] `HIMDashboard.tsx` - Medical records/HIM dashboard

### Task 7.2: Add Export Functionality
- [ ] `ExportManager.tsx` - PDF and Excel export
- [ ] Add print-friendly CSS styles
- [ ] Date range selector for reports

---

## Phase 8: Database Schema Updates (If Needed)

### Task 8.1: Add missing columns
```sql
-- migrations/037_analytics_enhancements.sql

-- Add discount tracking to billing_orders
ALTER TABLE billing_orders 
ADD COLUMN IF NOT EXISTS discount_reason text,
ADD COLUMN IF NOT EXISTS discount_authorized_by uuid REFERENCES profiles(id);

-- Add result timing to lab_requests
ALTER TABLE lab_requests
ADD COLUMN IF NOT EXISTS result_entered_at timestamptz,
ADD COLUMN IF NOT EXISTS result_status text,
ADD COLUMN IF NOT EXISTS is_critical boolean DEFAULT false;

-- Add cost price to pharmacy_inventory if missing
ALTER TABLE pharmacy_inventory
ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0;

-- Add visit_type to visits if missing
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS visit_type text DEFAULT 'OPD';
```

---

## Testing Checklist

### Financial Dashboard Tests
- [ ] Revenue by service type shows correct breakdown
- [ ] Debt aging buckets calculate correctly
- [ ] Gross vs Net matches manual calculation
- [ ] Discount analysis lists all discounted items

### Clinical Dashboard Tests
- [ ] ALOS matches discharge records
- [ ] BOR matches active admissions / total beds
- [ ] Patient volume by type is accurate
- [ ] Doctor productivity counts are correct

### Pharmacy Dashboard Tests
- [ ] Drug revenue matches prescription items
- [ ] Expiry dates are correctly categorized
- [ ] Stock velocity identifies slow movers

### Laboratory Dashboard Tests
- [ ] TAT calculation is accurate
- [ ] Revenue by category is correct
- [ ] Abnormal results are properly flagged

---

## Success Criteria

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Mock data usage | 70% | 0% | Code review |
| Financial audit readiness | 30% | 90% | Can produce audit reports |
| Chart interactivity | 20% | 80% | Click-through drill-down |
| Export capability | 0% | 100% | PDF/Excel export works |
| Filter responsiveness | 40% | 95% | All filters work |

---

## Timeline

| Week | Deliverables |
|------|--------------|
| Week 1 | Replace mock data, Financial API |
| Week 2 | Clinical API, Pharmacy API, Lab API |
| Week 3 | Medical Records API, UI Components |
| Week 4 | Export functionality, Testing, Polish |

---

## Assigned Resources

| Task Area | Complexity | Estimated Hours |
|-----------|------------|-----------------|
| Replace Mock Data | Medium | 8 hours |
| Financial Analytics API | High | 16 hours |
| Clinical Analytics API | High | 12 hours |
| Pharmacy Analytics API | Medium | 10 hours |
| Laboratory Analytics API | Medium | 8 hours |
| Medical Records API | Medium | 6 hours |
| UI Dashboard Components | High | 20 hours |
| Export Functionality | Medium | 8 hours |
| Testing & QA | Medium | 12 hours |
| **Total** | | **100 hours** |
