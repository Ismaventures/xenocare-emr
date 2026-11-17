import { supabase } from '../../../api/supabaseClient';

export type DashboardRangePreset =
  | 'today'
  | 'week'
  | 'month'
  | 'year'
  | 'custom';

export interface DashboardRange {
  preset: DashboardRangePreset;
  from: string;
  to: string;
  label: string;
  customFrom?: string;
  customTo?: string;
}

export interface DepartmentFinance {
  department: string;
  collected: number;
  billed: number;
  outstanding: number;
}

export interface MonthlyTrendPoint {
  key: string;
  label: string;
  revenue: number;
  visits: number;
}

export interface PaymentMethodTotal {
  method: string;
  amount: number;
  count: number;
}

export interface MedicalDirectorDashboardData {
  periodLabel: string;
  patientsSeen: number;
  totalVisits: number;
  newPatients: number;
  returningPatients: number;
  consultations: number;
  admissions: number;
  currentlyAdmitted: number;
  collectedSelected: number;
  collectedToday: number;
  collectedMonth: number;
  collectedYear: number;
  collectedPreviousYear: number;
  billedSelected: number;
  outstandingSelected: number;
  outstandingTotal: number;
  openBillCount: number;
  partialBillCount: number;
  patientsOwing: number;
  departments: DepartmentFinance[];
  monthlyTrend: MonthlyTrendPoint[];
  paymentMethods: PaymentMethodTotal[];
  visitsPreviousYear: number;
  generatedAt: string;
}

interface RawReceipt {
  amount_paid: number | null;
  billing_order_id: string | null;
  payment_method: string | null;
  created_at: string;
}

interface RawBillingItem {
  item_type: string | null;
  item_name: string | null;
  total_price: number | null;
  patient_payable: number | null;
}

interface RawBillingOrder {
  id: string;
  patient_id: string | null;
  status: string;
  source_module: string | null;
  net_amount: number | null;
  paid_amount: number | null;
  balance_amount: number | null;
  patient_payable: number | null;
  created_at: string;
  billing_items: RawBillingItem[] | null;
}

interface RawVisit {
  patient_id: string | null;
  created_at: string;
}

interface RawPatient {
  id: string;
}

const OPEN_BILL_STATUSES = [
  'Pending',
  'Awaiting_Payment',
  'Partially_Paid',
];
const DEPARTMENT_ORDER = [
  'Laboratory',
  'Pharmacy',
  'Consultation / OPD',
  'Nursing',
  'Dental',
  'Ward / Admissions',
  'Radiology',
  'Procedures',
  'Physiotherapy',
  'Other',
];

const ITEM_TYPE_DEPARTMENT: Record<string, string> = {
  Laboratory: 'Laboratory',
  Pharmacy: 'Pharmacy',
  Consultation: 'Consultation / OPD',
  Nursing: 'Nursing',
  Admission: 'Ward / Admissions',
  Dental: 'Dental',
  Radiology: 'Radiology',
  Procedure: 'Procedures',
  Physiotherapy: 'Physiotherapy',
  Surgery: 'Procedures',
  Supplies: 'Other',
  Other: 'Other',
};

const SOURCE_MODULE_DEPARTMENT: Record<string, string> = {
  lab: 'Laboratory',
  pharmacy: 'Pharmacy',
  consultation: 'Consultation / OPD',
  nursing: 'Nursing',
  dental: 'Dental',
  admission: 'Ward / Admissions',
  radiology: 'Radiology',
  procedure: 'Procedures',
  physiotherapy: 'Physiotherapy',
  registration: 'Other',
  supplies: 'Other',
};

function toNumber(value: number | null | undefined): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sumReceipts(receipts: RawReceipt[]): number {
  return receipts.reduce((total, receipt) => {
    return total + toNumber(receipt.amount_paid);
  }, 0);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function resolveRange(
  preset: DashboardRangePreset,
  customFrom: string,
  customTo: string,
): DashboardRange {
  const now = new Date();
  const tomorrow = addDays(startOfDay(now), 1);

  switch (preset) {
    case 'today':
      return {
        preset,
        from: startOfDay(now).toISOString(),
        to: tomorrow.toISOString(),
        label: formatShortDate(now),
      };
    case 'week': {
      const start = addDays(startOfDay(now), -6);
      return {
        preset,
        from: start.toISOString(),
        to: tomorrow.toISOString(),
        label: `${formatShortDate(start)} – ${formatShortDate(now)}`,
      };
    }
    case 'year': {
      const start = startOfYear(now);
      return {
        preset,
        from: start.toISOString(),
        to: tomorrow.toISOString(),
        label: `${now.getFullYear()}`,
      };
    }
    case 'custom': {
      const fromDate = customFrom
        ? new Date(`${customFrom}T00:00:00`)
        : startOfMonth(now);
      const toDate = customTo ? new Date(`${customTo}T23:59:59.999`) : now;
      const safeFrom = Number.isNaN(fromDate.getTime())
        ? startOfMonth(now)
        : fromDate;
      const safeTo = Number.isNaN(toDate.getTime()) ? now : toDate;
      return {
        preset,
        from: safeFrom.toISOString(),
        to: addDays(startOfDay(safeTo), 1).toISOString(),
        label: `${formatShortDate(safeFrom)} – ${formatShortDate(safeTo)}`,
        customFrom,
        customTo,
      };
    }
    case 'month':
    default: {
      const start = startOfMonth(now);
      return {
        preset: 'month',
        from: start.toISOString(),
        to: tomorrow.toISOString(),
        label: now.toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        }),
      };
    }
  }
}

export function resolveDashboardRange(
  preset: DashboardRangePreset,
  customFrom = '',
  customTo = '',
): DashboardRange {
  return resolveRange(preset, customFrom, customTo);
}

async function fetchPaged<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }
    const page = data ?? [];
    rows.push(...page);
    hasMore = page.length === pageSize;
    from += pageSize;
  }

  return rows;
}

function departmentForItem(
  itemType: string | null,
  sourceModule: string | null,
): string {
  if (sourceModule && SOURCE_MODULE_DEPARTMENT[sourceModule]) {
    return SOURCE_MODULE_DEPARTMENT[sourceModule];
  }
  if (itemType && ITEM_TYPE_DEPARTMENT[itemType]) {
    return ITEM_TYPE_DEPARTMENT[itemType];
  }
  return 'Other';
}

function allocateOrderAmount(
  order: RawBillingOrder,
  amount: number,
): Map<string, number> {
  const allocation = new Map<string, number>();
  if (amount <= 0) return allocation;

  const items = order.billing_items ?? [];
  const weightedItems = items
    .map((item) => ({
      item,
      weight: toNumber(item.patient_payable) || toNumber(item.total_price),
    }))
    .filter((entry) => entry.weight > 0);

  const totalWeight = weightedItems.reduce(
    (total, entry) => total + entry.weight,
    0,
  );

  if (totalWeight <= 0) {
    const department = departmentForItem(null, order.source_module);
    allocation.set(department, amount);
    return allocation;
  }

  let allocated = 0;
  weightedItems.forEach((entry, index) => {
    const value =
      index === weightedItems.length - 1
        ? amount - allocated
        : (amount * entry.weight) / totalWeight;
    allocated += value;
    const department = departmentForItem(
      entry.item.item_type,
      order.source_module,
    );
    allocation.set(department, (allocation.get(department) ?? 0) + value);
  });

  return allocation;
}

function addToDepartment(
  departments: Map<string, DepartmentFinance>,
  department: string,
  field: keyof Pick<DepartmentFinance, 'collected' | 'billed' | 'outstanding'>,
  amount: number,
): void {
  const current = departments.get(department) ?? {
    department,
    collected: 0,
    billed: 0,
    outstanding: 0,
  };
  current[field] += amount;
  departments.set(department, current);
}

async function fetchOrdersByIds(ids: string[]): Promise<RawBillingOrder[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const rows: RawBillingOrder[] = [];
  const chunkSize = 200;

  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const chunkRows = await fetchPaged<RawBillingOrder>((from, to) =>
      supabase
        .from('billing_orders')
        .select(
          'id, patient_id, status, source_module, net_amount, paid_amount, balance_amount, patient_payable, created_at, billing_items(item_type, item_name, total_price, patient_payable)',
        )
        .in('id', chunk)
        .range(from, to),
    );
    rows.push(...chunkRows);
  }

  return rows;
}

function buildMonthlyTrend(
  receipts: RawReceipt[],
  visits: RawVisit[],
): MonthlyTrendPoint[] {
  const now = new Date();
  const points: MonthlyTrendPoint[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${monthDate.getFullYear()}-${String(
      monthDate.getMonth() + 1,
    ).padStart(2, '0')}`;
    points.push({
      key,
      label: monthDate.toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit',
      }),
      revenue: 0,
      visits: 0,
    });
  }

  const pointMap = new Map(points.map((point) => [point.key, point]));
  receipts.forEach((receipt) => {
    const date = new Date(receipt.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}`;
    const point = pointMap.get(key);
    if (point) point.revenue += toNumber(receipt.amount_paid);
  });
  visits.forEach((visit) => {
    const date = new Date(visit.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}`;
    const point = pointMap.get(key);
    if (point) point.visits += 1;
  });

  return points;
}

function buildPaymentMethods(
  receipts: RawReceipt[],
): PaymentMethodTotal[] {
  const methods = new Map<string, PaymentMethodTotal>();
  receipts.forEach((receipt) => {
    const method = receipt.payment_method || 'Other';
    const current = methods.get(method) ?? { method, amount: 0, count: 0 };
    current.amount += toNumber(receipt.amount_paid);
    current.count += 1;
    methods.set(method, current);
  });
  return Array.from(methods.values()).sort((a, b) => b.amount - a.amount);
}

export async function getMedicalDirectorDashboardData(
  range: DashboardRange,
): Promise<MedicalDirectorDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const tomorrow = addDays(startOfDay(now), 1).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const yearStart = startOfYear(now).toISOString();
  const previousYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString();
  const trendStart = new Date(
    now.getFullYear(),
    now.getMonth() - 5,
    1,
  ).toISOString();

  const SELECTED_RECEIPT_COLUMNS =
    'amount_paid, billing_order_id, payment_method, created_at';
  const ORDER_COLUMNS =
    'id, patient_id, status, source_module, net_amount, paid_amount, balance_amount, patient_payable, created_at, billing_items(item_type, item_name, total_price, patient_payable)';

  const [
    selectedReceipts,
    selectedOrders,
    openOrders,
    selectedVisits,
    newPatients,
    consultationResult,
    admissionResult,
    admittedResult,
    todayReceipts,
    monthReceipts,
    yearReceipts,
    previousYearReceipts,
    trendReceipts,
    trendVisits,
    previousYearVisits,
  ] = await Promise.all([
    fetchPaged<RawReceipt>((from, to) =>
      supabase
        .from('receipts')
        .select(SELECTED_RECEIPT_COLUMNS)
        .gte('created_at', range.from)
        .lt('created_at', range.to)
        .range(from, to),
    ),
    fetchPaged<RawBillingOrder>((from, to) =>
      supabase
        .from('billing_orders')
        .select(ORDER_COLUMNS)
        .neq('status', 'Cancelled')
        .gte('created_at', range.from)
        .lt('created_at', range.to)
        .range(from, to),
    ),
    fetchPaged<RawBillingOrder>((from, to) =>
      supabase
        .from('billing_orders')
        .select(ORDER_COLUMNS)
        .in('status', OPEN_BILL_STATUSES)
        .range(from, to),
    ),
    fetchPaged<RawVisit>((from, to) =>
      supabase
        .from('visits')
        .select('patient_id, created_at')
        .gte('created_at', range.from)
        .lt('created_at', range.to)
        .range(from, to),
    ),
    fetchPaged<RawPatient>((from, to) =>
      supabase
        .from('patients')
        .select('id')
        .gte('created_at', range.from)
        .lt('created_at', range.to)
        .range(from, to),
    ),
    supabase
      .from('consultations')
      .select('consultation_id', { count: 'exact', head: true })
      .gte('created_at', range.from)
      .lt('created_at', range.to),
    supabase
      .from('admissions')
      .select('id', { count: 'exact', head: true })
      .gte('admission_date', range.from)
      .lt('admission_date', range.to),
    supabase
      .from('admissions')
      .select('id', { count: 'exact', head: true })
      .is('actual_discharge_date', null),
    fetchPaged<RawReceipt>((from, to) =>
      supabase
        .from('receipts')
        .select('amount_paid, billing_order_id, payment_method, created_at')
        .gte('created_at', todayStart)
        .lt('created_at', tomorrow)
        .range(from, to),
    ),
    fetchPaged<RawReceipt>((from, to) =>
      supabase
        .from('receipts')
        .select('amount_paid, billing_order_id, payment_method, created_at')
        .gte('created_at', monthStart)
        .lt('created_at', tomorrow)
        .range(from, to),
    ),
    fetchPaged<RawReceipt>((from, to) =>
      supabase
        .from('receipts')
        .select('amount_paid, billing_order_id, payment_method, created_at')
        .gte('created_at', yearStart)
        .lt('created_at', tomorrow)
        .range(from, to),
    ),
    fetchPaged<RawReceipt>((from, to) =>
      supabase
        .from('receipts')
        .select('amount_paid, billing_order_id, payment_method, created_at')
        .gte('created_at', previousYearStart)
        .lt('created_at', yearStart)
        .range(from, to),
    ),
    fetchPaged<RawReceipt>((from, to) =>
      supabase
        .from('receipts')
        .select('amount_paid, billing_order_id, payment_method, created_at')
        .gte('created_at', trendStart)
        .lt('created_at', tomorrow)
        .range(from, to),
    ),
    fetchPaged<RawVisit>((from, to) =>
      supabase
        .from('visits')
        .select('patient_id, created_at')
        .gte('created_at', trendStart)
        .lt('created_at', tomorrow)
        .range(from, to),
    ),
    fetchPaged<RawVisit>((from, to) =>
      supabase
        .from('visits')
        .select('patient_id, created_at')
        .gte('created_at', previousYearStart)
        .lt('created_at', yearStart)
        .range(from, to),
    ),
  ]);

  const selectedOrderMap = new Map(
    selectedOrders.map((order) => [order.id, order]),
  );
  const receiptOrderIds = selectedReceipts
    .map((receipt) => receipt.billing_order_id)
    .filter((id): id is string => Boolean(id))
    .filter((id) => !selectedOrderMap.has(id));
  const receiptOrders = await fetchOrdersByIds(receiptOrderIds);
  const receiptOrderMap = new Map(
    receiptOrders.map((order) => [order.id, order]),
  );

  const departments = new Map<string, DepartmentFinance>();
  DEPARTMENT_ORDER.forEach((department) => {
    departments.set(department, {
      department,
      collected: 0,
      billed: 0,
      outstanding: 0,
    });
  });

  selectedOrders.forEach((order) => {
    addToDepartment(
      departments,
      departmentForItem(null, order.source_module),
      'billed',
      toNumber(order.net_amount),
    );
    if (OPEN_BILL_STATUSES.includes(order.status)) {
      allocateOrderAmount(order, toNumber(order.balance_amount)).forEach(
        (amount, department) => {
          addToDepartment(departments, department, 'outstanding', amount);
        },
      );
    }
  });

  selectedReceipts.forEach((receipt) => {
    const amount = toNumber(receipt.amount_paid);
    if (amount <= 0) return;
    const order = receipt.billing_order_id
      ? receiptOrderMap.get(receipt.billing_order_id) ??
        selectedOrderMap.get(receipt.billing_order_id)
      : undefined;
    if (!order) {
      addToDepartment(departments, 'Other', 'collected', amount);
      return;
    }
    if (order.status === 'Cancelled') return;
    allocateOrderAmount(order, amount).forEach((departmentAmount, dept) => {
      addToDepartment(departments, dept, 'collected', departmentAmount);
    });
  });

  const distinctVisitPatients = new Set(
    selectedVisits
      .map((visit) => visit.patient_id)
      .filter((id): id is string => Boolean(id)),
  );
  const newPatientIds = new Set(newPatients.map((patient) => patient.id));
  let returningPatients = 0;
  distinctVisitPatients.forEach((patientId) => {
    if (!newPatientIds.has(patientId)) returningPatients += 1;
  });

  const outstandingTotal = openOrders.reduce(
    (total, order) => total + toNumber(order.balance_amount),
    0,
  );
  const outstandingSelected = selectedOrders.reduce((total, order) => {
    if (!OPEN_BILL_STATUSES.includes(order.status)) return total;
    return total + toNumber(order.balance_amount);
  }, 0);
  const billedSelected = selectedOrders.reduce(
    (total, order) => total + toNumber(order.net_amount),
    0,
  );
  const patientsOwing = new Set(
    openOrders
      .map((order) => order.patient_id)
      .filter((id): id is string => Boolean(id)),
  ).size;
  const partialBillCount = openOrders.filter(
    (order) => order.status === 'Partially_Paid',
  ).length;

  const departmentRows = Array.from(departments.values())
    .filter(
      (department) =>
        department.collected > 0 ||
        department.billed > 0 ||
        department.outstanding > 0,
    )
    .sort((a, b) => b.collected - a.collected);

  return {
    periodLabel: range.label,
    patientsSeen: distinctVisitPatients.size,
    totalVisits: selectedVisits.length,
    newPatients: newPatients.length,
    returningPatients,
    consultations: consultationResult.count ?? 0,
    admissions: admissionResult.count ?? 0,
    currentlyAdmitted: admittedResult.count ?? 0,
    collectedSelected: sumReceipts(selectedReceipts),
    collectedToday: sumReceipts(todayReceipts),
    collectedMonth: sumReceipts(monthReceipts),
    collectedYear: sumReceipts(yearReceipts),
    collectedPreviousYear: sumReceipts(previousYearReceipts),
    billedSelected,
    outstandingSelected,
    outstandingTotal,
    openBillCount: openOrders.length,
    partialBillCount,
    patientsOwing,
    departments: departmentRows,
    monthlyTrend: buildMonthlyTrend(trendReceipts, trendVisits),
    paymentMethods: buildPaymentMethods(selectedReceipts),
    visitsPreviousYear: previousYearVisits.length,
    generatedAt: new Date().toISOString(),
  };
}
