// =============================================================================
// Billing Orders API (Normalized Schema)
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('BillingOrders');
import {
  hashPayload,
  prepareIdempotencyFields,
  IdempotencyActions,
  withIdempotency,
  generateIdempotencyKey,
} from '../../../lib/idempotency';
import {
  updateWithLock,
  OptimisticLockError,
  type VersionedRecord,
} from '../../../lib/optimisticLocking';
import { requestDeduper, DedupeKeys } from '../../../lib/requestDeduplication';
import {
  BillingOrderDTO,
  BillingOrderItemDTO,
  CreateBillingOrderDTO,
  VerifyPaymentDTO,
  BatchVerifyPaymentDTO,
  BillingOrderFilters,
  BillingQueueItem,
  BillingOrderStats,
  BillingOrderStatus,
  calculateBillingOrderAmount,
  calculateNHISAmounts,
  getNHISPercentage,
  isNhisPaymentCategory,
  ServiceType,
} from '../dtos/billing-order.dto';
import { generateReceiptNumber } from '../dtos/billing.dto';

// =============================================================================
// Column Lists & Constants
// =============================================================================

const BILLING_ORDER_COLUMNS = `
  id,
  order_number,
  patient_id,
  visit_id,
  encounter_id,
  source_module,
  total_amount,
  discount_amount,
  tax_amount,
  net_amount,
  paid_amount,
  balance_amount,
  status,
  payment_method,
  nhis_covered,
  nhis_percentage,
  nhis_payable,
  patient_payable,
  created_by,
  created_at,
  updated_at
`;

const BILLING_ITEM_COLUMNS = `
  id,
  billing_order_id,
  item_type,
  item_id,
  service_reference_id,
  item_name,
  service_name,
  quantity,
  unit_price,
  unit_cost,
  total_price,
  gross_amount,
  status,
  nhis_covered,
  nhis_percentage,
  nhis_payable,
  patient_payable,
  created_at
`;

const PATIENT_COLUMNS =
  'patient_id, first_name, surname, contact_phone, emr_number, gender, date_of_birth, insurance_type, nhis_number, patient_type';
const VISIT_COLUMNS =
  'visit_id, visit_type, payment_category, insurance_type, priority, status, start_time, clinic_id, is_referral_encounter, source_referral_id, encounter_category';
const VISIT_COLUMNS_BASIC =
  'visit_id, visit_type, payment_category, insurance_type, priority, status, clinic_id, encounter_category';
const STAFF_NAME_COLUMNS = 'staff_id, first_name, last_name';

// Note: receipts table has billing_order_id but no FK constraint, so we cannot join directly
// Receipt info is fetched separately when needed
const BILLING_ORDER_SELECT = `
  ${BILLING_ORDER_COLUMNS},
  items:billing_items(${BILLING_ITEM_COLUMNS}),
  patient:patients(${PATIENT_COLUMNS}),
  visit:visits!billing_orders_encounter_id_fkey(${VISIT_COLUMNS}),
  created_by_staff:staff!billing_orders_created_by_fkey(${STAFF_NAME_COLUMNS})
`;

const PAID_STATUSES: BillingOrderStatus[] = [
  'Paid',
  'Paid_NHIS',
  'Paid_Retainership',
];
const CLOSED_BILLING_ORDER_STATUSES = [
  ...PAID_STATUSES,
  'Waived',
  'Cancelled',
] as const;

type OutstandingBillingOrder = {
  status?: string | null;
  nhis_covered?: boolean | null;
  source_module?: string | null;
  patient_payable?: number | null;
  balance_amount?: number | null;
  net_amount?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
};

// =============================================================================
// Helpers
// =============================================================================

function generateBillingOrderNumber(date: Date = new Date()): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `INV-${year}${month}-${random}`; // Use INV- prefix for consistency
}

function toBillingAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function buildReceiptServiceDescription(
  items: Array<{
    service_name?: string | null;
    item_name?: string | null;
  }>,
  fallback: string,
): string {
  const uniqueNames = [...new Set(
    items
      .map((item) => item.service_name || item.item_name || '')
      .map((name) => name.trim())
      .filter(Boolean),
  )];

  if (uniqueNames.length === 0) {
    return fallback;
  }

  if (uniqueNames.length <= 2) {
    return uniqueNames.join(', ');
  }

  return `${uniqueNames[0]}, ${uniqueNames[1]} +${uniqueNames.length - 2} more`;
}

export function getBillingOrderOutstandingAmount(
  order: OutstandingBillingOrder,
): number {
  if (!order.status || CLOSED_BILLING_ORDER_STATUSES.includes(order.status as any)) {
    return 0;
  }

  const patientPayable = toBillingAmount(order.patient_payable);
  const balanceAmount = toBillingAmount(order.balance_amount);
  const netAmount = toBillingAmount(order.net_amount);
  const totalAmount = toBillingAmount(order.total_amount);
  const paidAmount = toBillingAmount(order.paid_amount);

  if (order.nhis_covered) {
    if (patientPayable <= 0) {
      return 0;
    }

    return balanceAmount > 0 ? Math.min(balanceAmount, patientPayable) : patientPayable;
  }

  if (balanceAmount > 0) {
    return balanceAmount;
  }

  return Math.max((netAmount || totalAmount) - paidAmount, 0);
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

function normalizeItems(rawItems: any[] | null): BillingOrderItemDTO[] {
  if (!rawItems) return [];
  return rawItems.map((item) => {
    const quantity = toNumber(item.quantity, 1);
    const unitCost = toNumber(item.unit_cost, toNumber(item.unit_price, 0));
    const grossAmount = toNumber(
      item.gross_amount,
      toNumber(item.total_price, quantity * unitCost),
    );
    const nhisPayable = toNumber(item.nhis_payable, 0);
    const patientPayable = toNumber(
      item.patient_payable,
      grossAmount - nhisPayable,
    );

    return {
      id: item.id,
      billing_order_id: item.billing_order_id,
      item_type: item.item_type ?? null,
      item_id: item.item_id ?? null,
      service_reference_id: item.service_reference_id ?? null,
      // Audit-safe name snapshot
      item_name: item.item_name ?? item.service_name ?? '',
      service_name: item.service_name ?? item.item_name ?? '',
      // Audit-safe cost snapshots
      quantity,
      unit_price: toNumber(item.unit_price, unitCost),
      unit_cost: unitCost,
      total_price: toNumber(item.total_price, grossAmount),
      gross_amount: grossAmount,
      // NHIS fields
      nhis_covered: Boolean(item.nhis_covered),
      nhis_percentage: toNumber(item.nhis_percentage, 0),
      nhis_payable: nhisPayable,
      patient_payable: patientPayable,
      status: item.status ?? 'Unpaid',
      created_at: item.created_at,
    };
  });
}

function normalizeBillingOrder(record: any): BillingOrderDTO {
  if (!record) return record;

  const patient = ensureSingle(record.patient);
  const visit = ensureSingle(record.visit);
  const createdByStaff = ensureSingle(record.created_by_staff);
  // Receipts are no longer joined due to missing FK - these fields will be null
  // Receipt info can be fetched separately if needed
  const items = normalizeItems(
    Array.isArray(record.items)
      ? record.items
      : record.items
        ? [record.items]
        : null,
  );
  const primaryItem = items[0];

  const totalAmount = toNumber(
    record.total_amount,
    primaryItem?.total_price ?? 0,
  );
  const discountAmount = toNumber(record.discount_amount, 0);
  const taxAmount = toNumber(record.tax_amount, 0);
  const netAmount = toNumber(
    record.net_amount,
    totalAmount - discountAmount + taxAmount,
  );
  const paidAmount = toNumber(record.paid_amount, 0);
  const balanceAmount = toNumber(
    record.balance_amount,
    Math.max(netAmount - paidAmount, 0),
  );

  const discountPercent =
    totalAmount > 0 && discountAmount > 0
      ? Number(((discountAmount / totalAmount) * 100).toFixed(2))
      : undefined;

  // Read NHIS values from database (stored values) or calculate from visit insurance_type
  // Use insurance_type (DHML, Civilian_NHIS, Private) for accurate NHIS calculation
  const insuranceType = visit?.insurance_type || patient?.insurance_type || '';
  const paymentCategory = visit?.payment_category || '';
  const nhisFromDb =
    record.nhis_covered !== undefined && record.nhis_covered !== null;

  let nhisCovered: boolean;
  let nhisPercentage: number;
  let nhisPayable: number;
  let patientPayable: number;

  if (nhisFromDb) {
    // Use stored NHIS values from database
    nhisCovered = Boolean(record.nhis_covered);
    nhisPercentage = toNumber(record.nhis_percentage, 0);
    nhisPayable = toNumber(record.nhis_payable, 0);
    patientPayable = toNumber(record.patient_payable, netAmount);
  } else {
    // Calculate NHIS values based on insurance_type (backward compatibility)
    const nhisCalc = calculateNHISAmounts(
      netAmount,
      insuranceType || paymentCategory, // Prefer insurance_type, fallback to payment_category
      (primaryItem?.item_type as ServiceType) || 'Other',
    );
    nhisCovered = nhisCalc.nhisCovered;
    nhisPercentage = nhisCalc.nhisPercentage;
    nhisPayable = nhisCalc.nhisPayable;
    patientPayable = nhisCalc.patientPayable;
  }

  const order: BillingOrderDTO = {
    id: record.id,
    billing_id: record.id,
    order_number: record.order_number,
    patient_id: record.patient_id,
    visit_id: record.visit_id ?? null,
    encounter_id: record.encounter_id ?? record.visit_id ?? null,
    source_module: record.source_module ?? undefined,
    total_amount: totalAmount,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    net_amount: netAmount,
    paid_amount: paidAmount,
    balance_amount: balanceAmount,
    status: record.status as BillingOrderStatus,
    payment_method: record.payment_method ?? undefined,
    created_by: record.created_by ?? null,
    created_at: record.created_at,
    updated_at: record.updated_at,
    patient,
    visit,
    created_by_staff: createdByStaff,
    items,
    amount_due: netAmount,
    amount_paid: paidAmount,
    balance: balanceAmount,
    payment_status: record.status as BillingOrderStatus,
    service_type: primaryItem?.item_type ?? undefined,
    service_description: primaryItem?.item_name ?? undefined,
    source_record_id: primaryItem?.item_id ?? undefined,
    quantity: primaryItem?.quantity ?? undefined,
    unit_price: primaryItem?.unit_price ?? undefined,
    gross_amount: primaryItem?.total_price ?? totalAmount,
    discount_percent: discountPercent,
    nhis_covered: nhisCovered,
    nhis_percentage: nhisPercentage,
    nhis_payable: nhisPayable,
    patient_payable: patientPayable,
    requested_by: record.created_by ?? undefined,
    requested_by_role: undefined,
    verified_by: undefined,
    verified_at: undefined,
    receipt_number: undefined,
    cashier_id: undefined,
    invoice_id: undefined,
    invoice_item_id: undefined,
    requested_by_staff: createdByStaff,
    verified_by_staff: null,
    cashier: null,
  } as BillingOrderDTO;

  return order;
}

function normalizeBillingOrders(records: any[] | null): BillingOrderDTO[] {
  if (!records) return [];
  return records.map((item) => normalizeBillingOrder(item));
}

/**
 * Resolves a patient identifier to the patients.id (UUID primary key).
 * billing_orders.patient_id FK references patients(id), not patients(patient_id).
 */
async function resolvePatientIdForOrder(
  patientIdInput: string | undefined,
  visitId?: string,
): Promise<string> {
  const trimmedPatientId = patientIdInput?.trim();

  // If we have a visit, the visit.patient_id already references patients(id)
  if (visitId) {
    const { data: visitRecord, error: visitError } = await supabase
      .from('visits')
      .select('patient_id')
      .eq('visit_id', visitId)
      .maybeSingle();

    if (visitError && visitError.code !== 'PGRST116') {
      throw visitError;
    }

    if (visitRecord?.patient_id) {
      return visitRecord.patient_id;
    }
  }

  if (trimmedPatientId) {
    // First, check if the input is already the patients.id (primary key)
    const { data: idMatch, error: idError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', trimmedPatientId)
      .maybeSingle();

    if (idError && idError.code !== 'PGRST116') {
      throw idError;
    }

    if (idMatch?.id) {
      return idMatch.id;
    }

    // Next, check if the input matches patients.patient_id and return the id
    const { data: patientIdMatch, error: patientIdError } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', trimmedPatientId)
      .maybeSingle();

    if (patientIdError && patientIdError.code !== 'PGRST116') {
      throw patientIdError;
    }

    if (patientIdMatch?.id) {
      return patientIdMatch.id;
    }
  }

  throw new Error('Patient record not found for billing order');
}

function getBillingOrderSelect(includeVisit: boolean = true): string {
  if (includeVisit) return BILLING_ORDER_SELECT;
  // Minimal select without visit/patient joins for internal lookups
  return `
    ${BILLING_ORDER_COLUMNS},
    items:billing_items(${BILLING_ITEM_COLUMNS})
  `;
}

function applyBillingFilters(query: any, filters: BillingOrderFilters) {
  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }
  if (filters.visit_id) {
    query = query.eq('visit_id', filters.visit_id);
  }
  if (filters.source_module) {
    query = query.eq('source_module', filters.source_module);
  }
  const status = filters.status ?? filters.payment_status;
  if (status) {
    query = query.eq('status', status);
  }
  if (filters.from_date) {
    query = query.gte('created_at', filters.from_date);
  }
  if (filters.to_date) {
    query = query.lte('created_at', filters.to_date);
  }
  return query;
}

// =============================================================================
// Get Billing Orders
// =============================================================================

export async function getBillingOrders(
  filters: BillingOrderFilters = {},
): Promise<BillingOrderDTO[]> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 50));
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('billing_orders')
    .select(BILLING_ORDER_SELECT)
    .neq('status', 'Cancelled') // Exclude cancelled billing orders
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  query = applyBillingFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  // Also filter out orders linked to cancelled encounters
  const orders = normalizeBillingOrders((data as any[]) ?? null);
  return orders.filter((order) => order.visit?.status !== 'Cancelled');
}

// =============================================================================
// Get Verified Receipts
// =============================================================================

export interface ReceiptFilters {
  from_date?: string;
  to_date?: string;
  payment_method?: string;
  search?: string;
}

export async function getVerifiedReceipts(
  filters: ReceiptFilters = {},
): Promise<BillingOrderDTO[]> {
  // First, fetch receipts (which represent consolidated category payments)
  // Join with staff table to get issuer name
  let receiptQuery = supabase
    .from('receipts')
    .select(
      `
      receipt_id,
      receipt_number,
      billing_order_id,
      patient_id,
      encounter_id,
      amount_paid,
      payment_method,
      issue_date,
      issued_by,
      issued_by_staff:staff!receipts_issued_by_fkey(staff_id, first_name, last_name)
    `,
    )
    .order('issue_date', { ascending: false });

  if (filters.from_date) {
    receiptQuery = receiptQuery.gte('issue_date', filters.from_date);
  }
  if (filters.to_date) {
    receiptQuery = receiptQuery.lte(
      'issue_date',
      `${filters.to_date}T23:59:59.999Z`,
    );
  }
  if (filters.payment_method) {
    receiptQuery = receiptQuery.eq('payment_method', filters.payment_method);
  }

  const { data: receiptsData, error: receiptsError } = await receiptQuery;
  if (receiptsError) throw receiptsError;
  if (!receiptsData || receiptsData.length === 0) return [];

  // Get all encounter IDs from receipts
  const encounterIds = [
    ...new Set(receiptsData.map((r) => r.encounter_id).filter(Boolean)),
  ];

  // Also get billing_order_ids directly from receipts for direct lookup
  const billingOrderIds = [
    ...new Set(receiptsData.map((r) => r.billing_order_id).filter(Boolean)),
  ];

  // Fetch ALL paid billing orders for these encounters
  // First try by encounter_id, then by billing_order_id
  let allBillingOrders: any[] = [];
  let ordersError: any = null;

  if (encounterIds.length > 0) {
    const result = await supabase
      .from('billing_orders')
      .select(BILLING_ORDER_SELECT)
      .in('status', PAID_STATUSES)
      .in('encounter_id', encounterIds);
    allBillingOrders = result.data || [];
    ordersError = result.error;
  }

  // Also fetch by billing_order_id for orders without encounter_id (like admissions)
  if (billingOrderIds.length > 0 && !ordersError) {
    const existingIds = new Set(allBillingOrders.map((o: any) => o.id));
    const missingIds = billingOrderIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      const result = await supabase
        .from('billing_orders')
        .select(BILLING_ORDER_SELECT)
        .in('status', PAID_STATUSES)
        .in('id', missingIds);
      if (result.data) {
        allBillingOrders = [...allBillingOrders, ...result.data];
      }
      ordersError = result.error;
    }
  }

  if (ordersError) throw ordersError;

  const allOrders = normalizeBillingOrders((allBillingOrders as any[]) ?? null);

  // Group billing orders by encounter_id + source_module
  const ordersByEncounterAndModule = new Map<string, typeof allOrders>();
  for (const order of allOrders) {
    const key = `${order.encounter_id || order.visit_id}::${order.source_module}`;
    if (!ordersByEncounterAndModule.has(key)) {
      ordersByEncounterAndModule.set(key, []);
    }
    ordersByEncounterAndModule.get(key)!.push(order);
  }

  // Build consolidated receipt objects - one per receipt with all items
  const consolidatedReceipts: BillingOrderDTO[] = [];
  const processedReceipts = new Set<string>();

  for (const receipt of receiptsData) {
    // Skip if we've already processed this receipt number
    if (processedReceipts.has(receipt.receipt_number)) continue;
    processedReceipts.add(receipt.receipt_number);

    // Find the primary billing order for this receipt
    const primaryOrder = allOrders.find(
      (o) => o.id === receipt.billing_order_id,
    );
    if (!primaryOrder) continue;

    // Find ALL billing orders for this encounter+module combination
    const groupKey = `${receipt.encounter_id || primaryOrder.encounter_id}::${primaryOrder.source_module}`;
    const relatedOrders = ordersByEncounterAndModule.get(groupKey) || [
      primaryOrder,
    ];

    // Collect ALL items from ALL related billing orders
    const allItems: BillingOrderItemDTO[] = [];
    let totalGross = 0;
    let totalNhis = 0;
    let totalPatient = 0;

    for (const order of relatedOrders) {
      if (order.items) {
        allItems.push(...order.items);
      }
      totalGross += order.gross_amount ?? order.net_amount ?? 0;
      totalNhis += order.nhis_payable ?? 0;
      totalPatient += order.patient_payable ?? order.amount_due ?? 0;
    }

    // Create a consolidated receipt object with all items
    // Get staff name from joined data
    const issuedByStaff = (receipt as any).issued_by_staff;
    const consolidatedReceipt: BillingOrderDTO = {
      ...primaryOrder,
      receipt_number: receipt.receipt_number,
      verified_at: receipt.issue_date,
      verified_by: issuedByStaff
        ? `${issuedByStaff.first_name || ''} ${issuedByStaff.last_name || ''}`.trim()
        : receipt.issued_by,
      cashier_id: receipt.issued_by,
      verified_by_staff: issuedByStaff
        ? {
            first_name: issuedByStaff.first_name || '',
            last_name: issuedByStaff.last_name || '',
          }
        : null,
      // Aggregated amounts
      items: allItems,
      gross_amount: totalGross,
      nhis_payable: totalNhis,
      patient_payable: totalPatient,
      amount_due: totalPatient,
      amount_paid: receipt.amount_paid,
      // Service description showing all items
      service_description: buildReceiptServiceDescription(
        allItems,
        primaryOrder.service_description || primaryOrder.source_module || 'Service',
      ),
    };

    consolidatedReceipts.push(consolidatedReceipt);
  }

  return consolidatedReceipts;
}

// =============================================================================
// Get Receipt by Number - Returns consolidated receipt with all items
// =============================================================================

export async function getReceiptByNumber(
  receiptNumber: string,
): Promise<BillingOrderDTO | null> {
  // First, get the receipt to find the encounter and billing info
  const { data: receiptData, error: receiptError } = await supabase
    .from('receipts')
    .select(
      'receipt_id, receipt_number, billing_order_id, encounter_id, patient_id, amount_paid, payment_method, issue_date, issued_by',
    )
    .eq('receipt_number', receiptNumber)
    .maybeSingle();

  if (receiptError) throw receiptError;
  if (!receiptData?.billing_order_id) return null;

  // Fetch the primary billing order to get source_module
  const primaryOrder = await getBillingOrderById(receiptData.billing_order_id);
  if (!primaryOrder) return null;

  // Fetch ALL paid billing orders for this encounter + source_module
  // This gets all items that should be on this receipt
  const { data: allRelatedOrders, error: relatedError } = await supabase
    .from('billing_orders')
    .select(BILLING_ORDER_SELECT)
    .in('status', PAID_STATUSES)
    .eq('encounter_id', receiptData.encounter_id || primaryOrder.encounter_id)
    .eq('source_module', primaryOrder.source_module);

  if (relatedError) throw relatedError;

  const relatedOrders = normalizeBillingOrders(
    (allRelatedOrders as any[]) ?? null,
  );

  // Collect ALL items from ALL related billing orders
  const allItems: BillingOrderItemDTO[] = [];
  let totalGross = 0;
  let totalNhis = 0;
  let totalPatient = 0;

  for (const order of relatedOrders) {
    if (order.items) {
      allItems.push(...order.items);
    }
    totalGross += order.gross_amount || order.net_amount || 0;
    totalNhis += order.nhis_payable || 0;
    totalPatient += order.patient_payable || order.amount_due || 0;
  }

  // Create consolidated receipt with all items
  const consolidatedReceipt: BillingOrderDTO = {
    ...primaryOrder,
    receipt_number: receiptData.receipt_number,
    verified_at: receiptData.issue_date,
    verified_by: receiptData.issued_by,
    cashier_id: receiptData.issued_by,
    items: allItems,
    gross_amount: totalGross,
    nhis_payable: totalNhis,
    patient_payable: totalPatient,
    amount_due: totalPatient,
    amount_paid: receiptData.amount_paid,
    service_description: buildReceiptServiceDescription(
      allItems,
      primaryOrder.service_description || primaryOrder.source_module || 'Service',
    ),
  };

  return consolidatedReceipt;
}

// =============================================================================
// Pending Billing Orders & Queue
// =============================================================================

export async function getPendingBillingOrders(): Promise<BillingOrderDTO[]> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select(BILLING_ORDER_SELECT)
    .in('status', ['Pending', 'Awaiting_Payment'])
    .order('created_at', { ascending: true })
    .limit(500); // Safety cap ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â pending queue should always be bounded

  if (error) throw error;

  // Filter out orders from cancelled encounters
  // ALL billing orders require admin verification before receipt is issued
  const orders = normalizeBillingOrders((data as any[]) ?? null);
  return orders.filter((order) => order.visit?.status !== 'Cancelled');
}

export async function getBillingQueue(): Promise<BillingQueueItem[]> {
  const orders = await getPendingBillingOrders(); // Already filtered for cancelled encounters
  const groupedMap = new Map<string, BillingQueueItem>();

  for (const order of orders) {
    // Additional safety check - skip orders from cancelled visits/encounters
    if (order.visit?.status === 'Cancelled') {
      continue;
    }

    const key = order.visit_id || order.patient_id;
    // Use insurance_type for accurate NHIS detection, fallback to payment_category
    const insuranceType =
      order.visit?.insurance_type ||
      order.patient?.insurance_type ||
      order.visit?.payment_category ||
      'Private';
    const isNhis = isNhisPaymentCategory(insuranceType);
    // Don't use generic category percentage - will calculate from actual items below
    const nhisPercentage = 0; // Will be recalculated based on actual totals

    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        patient_id: order.patient_id,
        visit_id: order.visit_id || '',
        patient: order.patient || {
          first_name: 'Unknown',
          surname: 'Patient',
        },
        visit: order.visit
          ? {
              ...order.visit,
              start_time: order.visit.start_time || order.created_at,
            }
          : {
              visit_type: 'General',
              payment_category: 'Private',
              priority: 'Normal',
              start_time: order.created_at,
            },
        orders: [],
        total_gross_amount: 0,
        total_nhis_payable: 0,
        total_patient_payable: 0,
        total_amount_paid: 0,
        total_balance: 0,
        total_amount_due: 0,
        total_paid: 0,
        pending_count: 0,
        has_pending: false,
        is_nhis: isNhis,
        nhis_percentage: nhisPercentage,
      });
    }

    const item = groupedMap.get(key)!;
    item.orders.push(order);

    if (
      order.payment_status === 'Pending' ||
      order.payment_status === 'Awaiting_Payment'
    ) {
      // Use the stored NHIS values from the order which are calculated per-item
      // based on each item's individual nhis_percentage, not the global category percentage
      const grossAmount = order.gross_amount || order.amount_due;
      const nhisPayable = order.nhis_payable || 0;
      const patientPayable = order.patient_payable ?? grossAmount - nhisPayable;

      item.total_gross_amount += grossAmount;
      item.total_nhis_payable += nhisPayable;
      item.total_patient_payable += patientPayable;
      item.total_balance += order.balance || patientPayable;
      item.total_amount_due += order.amount_due;
      // Count individual billing items (line items) for accurate item count
      item.pending_count += order.items?.length || 1;
      item.has_pending = true;
    } else {
      item.total_amount_paid += order.amount_paid || order.amount_due;
      item.total_paid += order.amount_due;
    }
  }

  // Calculate effective NHIS percentage from actual totals for each queue item
  for (const item of groupedMap.values()) {
    if (item.is_nhis && item.total_gross_amount > 0) {
      // Calculate actual percentage: (NHIS pays / total gross) * 100
      const effectivePercentage = Math.round(
        (item.total_nhis_payable / item.total_gross_amount) * 100,
      );
      item.nhis_percentage = effectivePercentage;
    }
  }

  const queue = Array.from(groupedMap.values());
  queue.sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      Emergency: 0,
      Urgent: 1,
      Normal: 2,
    };
    const aPriority = priorityOrder[a.visit.priority] ?? 2;
    const bPriority = priorityOrder[b.visit.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (
      new Date(a.visit.start_time).getTime() -
      new Date(b.visit.start_time).getTime()
    );
  });

  return queue;
}

// =============================================================================
// Single Billing Order
// =============================================================================

export async function getBillingOrderById(
  billingId: string,
): Promise<BillingOrderDTO> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select(BILLING_ORDER_SELECT)
    .eq('id', billingId)
    .single();

  if (error) throw error;
  return normalizeBillingOrder(data);
}

// =============================================================================
// Create Billing Order - Audit-Safe with Mandatory NHIS Fields
// =============================================================================

/**
 * Validates that all mandatory billing fields are present
 * Throws an error if any required field is missing or invalid
 */
function validateBillingOrderDTO(dto: CreateBillingOrderDTO): void {
  const errors: string[] = [];

  // Required identifiers
  if (!dto.patient_id) errors.push('patient_id is required');
  if (!dto.source_module) errors.push('source_module is required');
  if (!dto.service_type) errors.push('service_type is required');

  // Audit-safe billing fields (ALL REQUIRED)
  if (!dto.service_name && !dto.service_description) {
    errors.push('service_name is required');
  }
  if (dto.unit_cost === undefined && dto.unit_price === undefined) {
    errors.push('unit_cost is required');
  }
  if (dto.quantity === undefined || dto.quantity < 1) {
    errors.push('quantity must be at least 1');
  }
  if (dto.gross_amount === undefined) {
    errors.push('gross_amount is required');
  }

  // NHIS fields (ALL REQUIRED - no exceptions)
  if (dto.nhis_covered === undefined) {
    errors.push('nhis_covered is required');
  }
  if (dto.nhis_percentage === undefined) {
    errors.push('nhis_percentage is required');
  }
  if (dto.nhis_payable === undefined) {
    errors.push('nhis_payable is required');
  }
  if (dto.patient_payable === undefined) {
    errors.push('patient_payable is required');
  }

  if (errors.length > 0) {
    throw new Error(`Billing validation failed: ${errors.join(', ')}`);
  }
}

export async function createBillingOrder(
  dto: CreateBillingOrderDTO,
): Promise<BillingOrderDTO> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const patientId = await resolvePatientIdForOrder(
    dto.patient_id,
    dto.visit_id,
  );

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id, role')
    .eq('email', user.email)
    .single();

  // Use encounter_id as PRIMARY, fall back to visit_id for backward compatibility
  const encounterId = dto.encounter_id ?? dto.visit_id ?? null;

  // Get service name (prefer service_name, fallback to service_description)
  const serviceName = dto.service_name || dto.service_description || '';

  // Get unit cost (prefer unit_cost, fallback to unit_price)
  const unitCost = dto.unit_cost ?? dto.unit_price ?? 0;

  // Get quantity (default to 1)
  const quantity = dto.quantity ?? 1;

  // Calculate or use provided gross_amount
  const grossAmount = dto.gross_amount ?? quantity * unitCost;

  // Apply discount if any
  const discountPercent = dto.discount_percent ?? 0;
  const discountAmount = grossAmount * (discountPercent / 100);
  const netAmount = grossAmount - discountAmount;

  // Determine NHIS values - use provided values or calculate
  let nhisCovered = dto.nhis_covered;
  let nhisPercentage = dto.nhis_percentage;
  let nhisPayable = dto.nhis_payable;
  let patientPayable = dto.patient_payable;

  // If NHIS fields not provided, calculate them from insurance_type
  if (
    nhisCovered === undefined ||
    nhisPercentage === undefined ||
    nhisPayable === undefined ||
    patientPayable === undefined
  ) {
    // Fetch insurance_type from visit for NHIS calculation
    let insuranceType = '';
    if (encounterId) {
      const { data: visitData } = await supabase
        .from('visits')
        .select('payment_category, insurance_type')
        .eq('visit_id', encounterId)
        .maybeSingle();
      insuranceType =
        visitData?.insurance_type || visitData?.payment_category || '';
    }

    // Calculate NHIS amounts
    const nhisCalc = calculateNHISAmounts(
      netAmount,
      insuranceType,
      dto.service_type || 'Other',
    );

    nhisCovered = dto.nhis_covered ?? nhisCalc.nhisCovered;
    nhisPercentage = dto.nhis_percentage ?? nhisCalc.nhisPercentage;
    nhisPayable = dto.nhis_payable ?? nhisCalc.nhisPayable;
    patientPayable = dto.patient_payable ?? nhisCalc.patientPayable;
  }

  // =========================================================================
  // ENCOUNTER CONSOLIDATION: Standard EMR Practice ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 1 Invoice per Encounter
  // If a pending billing_order already exists for this encounter, append a
  // billing_item (line item) to it instead of creating a separate invoice.
  // This ensures:
  //   - 1 invoice number per encounter (audit-compliant)
  //   - Multiple line items (services) under one invoice
  //   - 1 receipt per payment transaction referencing the single invoice
  // =========================================================================
  if (encounterId) {
    const { data: existingOrder } = await supabase
      .from('billing_orders')
      .select(
        'id, order_number, source_module, total_amount, discount_amount, net_amount, nhis_payable, patient_payable, balance_amount, paid_amount, nhis_covered',
      )
      .eq('encounter_id', encounterId)
      .in('status', ['Pending', 'Awaiting_Payment'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingOrder) {
      // Add billing_item (line item) to the existing encounter invoice
      const itemType = dto.service_type || dto.source_module || 'Other';
      const { error: itemError } = await supabase.from('billing_items').insert({
        billing_order_id: existingOrder.id,
        item_type:
          itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase(),
        item_id: dto.service_reference_id || encounterId,
        service_reference_id: dto.service_reference_id || null,
        item_name: serviceName,
        service_name: serviceName,
        quantity,
        unit_price: unitCost,
        unit_cost: unitCost,
        total_price: grossAmount,
        gross_amount: grossAmount,
        nhis_covered: nhisCovered,
        nhis_percentage: nhisPercentage,
        nhis_payable: nhisPayable,
        patient_payable: patientPayable,
        status: 'Unpaid',
      });

      if (itemError) {
        log.error(
          '[Billing] Failed to add item to existing invoice:',
          itemError,
        );
        // Fall through to create a new billing_order if item insert fails
      } else {
        // Update the encounter invoice totals to include the new line item
        const newTotalAmount = (existingOrder.total_amount || 0) + grossAmount;
        const newDiscountAmount =
          (existingOrder.discount_amount || 0) + discountAmount;
        const newNetAmount = (existingOrder.net_amount || 0) + netAmount;
        const newNhisPayable =
          (existingOrder.nhis_payable || 0) + (nhisPayable ?? 0);
        const newPatientPayable =
          (existingOrder.patient_payable || 0) + (patientPayable ?? 0);
        const newBalanceAmount =
          (existingOrder.balance_amount || 0) + (patientPayable ?? 0);
        const newNhisCovered = existingOrder.nhis_covered || nhisCovered;

        const { error: updateError } = await supabase
          .from('billing_orders')
          .update({
            total_amount: newTotalAmount,
            discount_amount: newDiscountAmount,
            net_amount: newNetAmount,
            nhis_payable: newNhisPayable,
            patient_payable: newPatientPayable,
            balance_amount: newBalanceAmount,
            nhis_covered: newNhisCovered,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingOrder.id);

        if (updateError) {
          log.error(
            '[Billing] Failed to update invoice totals:',
            updateError,
          );
        }

        const result = await getBillingOrderById(existingOrder.id);
        await logBillingAudit(existingOrder.id, 'ITEM_ADDED', null, result);
        log.info(
          `[Billing] Consolidated: Added "${serviceName}" to encounter invoice ${existingOrder.order_number}`,
        );

        // Auto-verify if entire consolidated order is 100% NHIS covered (all service types)
        if (
          newNhisCovered &&
          newPatientPayable <= 0 &&
          newNhisPayable >= newTotalAmount
        ) {
          try {
            await autoVerifyNhisBillingOrder(existingOrder.id);
            log.info(
              `[Billing] Auto-verified consolidated order ${existingOrder.order_number} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100% NHIS covered`,
            );
          } catch (autoVerifyError) {
            log.error(
              '[Billing] Auto-verify failed for consolidated NHIS order:',
              autoVerifyError,
            );
          }
        }

        return result;
      }
    }
  }

  const orderNumber = generateBillingOrderNumber();

  // Prepare idempotency fields to prevent duplicate orders on retry.
  // If caller provided a key, keep it stable across retries/replays.
  const idempotencyFields = dto.idempotency_key
    ? {
        idempotency_key: dto.idempotency_key,
        idempotency_hash: hashPayload(dto),
      }
    : prepareIdempotencyFields(dto, {
        userId: user.id,
        action: IdempotencyActions.CREATE_BILLING_ORDER,
        includeHash: true,
      });

  const { data: createdOrder, error: orderError } = await supabase
    .from('billing_orders')
    .insert({
      order_number: orderNumber,
      patient_id: patientId,
      visit_id: encounterId, // Keep for backward compatibility
      encounter_id: encounterId, // PRIMARY link to visits.id
      source_module: dto.source_module,
      total_amount: grossAmount,
      discount_amount: discountAmount,
      tax_amount: 0,
      net_amount: netAmount,
      paid_amount: 0,
      balance_amount: patientPayable, // Patient only needs to pay their portion
      status: 'Pending',
      payment_method: null,
      // Store NHIS calculation values (audit-safe snapshots)
      nhis_covered: nhisCovered,
      nhis_percentage: nhisPercentage,
      nhis_payable: nhisPayable,
      patient_payable: patientPayable,
      created_by: staffData?.id ?? null,
      // Idempotency fields for duplicate prevention
      ...idempotencyFields,
    })
    .select(BILLING_ORDER_COLUMNS)
    .single();

  if (orderError) throw orderError;

  // Create billing_item record with the service details
  // This is required for the billing queue to display item information
  const itemType = dto.service_type || dto.source_module || 'Other';
  const { error: itemError } = await supabase.from('billing_items').insert({
    billing_order_id: createdOrder.id,
    item_type:
      itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase(),
    item_id: dto.service_reference_id || encounterId,
    service_reference_id: dto.service_reference_id || null,
    // Audit-safe snapshots (NEVER recalculated even if prices change)
    item_name: serviceName,
    service_name: serviceName,
    quantity,
    unit_price: unitCost,
    unit_cost: unitCost,
    total_price: grossAmount,
    gross_amount: grossAmount,
    // NHIS snapshots (NEVER recalculated)
    nhis_covered: nhisCovered,
    nhis_percentage: nhisPercentage,
    nhis_payable: nhisPayable,
    patient_payable: patientPayable,
    status: 'Unpaid',
  });

  if (itemError) {
    log.error('[Billing] Failed to create billing item:', itemError);
    // Don't throw - the order was created successfully
  }

  // ==========================================================================
  // AUTO-VERIFY: If NHIS covers 100%, auto-verify ALL service types.
  // No admin click needed ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â billing admin sees verified receipt directly.
  // ==========================================================================
  if (nhisCovered && nhisPercentage >= 100) {
    try {
      await autoVerifyNhisBillingOrder(createdOrder.id);
      log.info(
        `[Billing] Auto-verified order ${createdOrder.order_number} (${dto.source_module || 'unknown'}) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100% NHIS covered`,
      );
    } catch (autoVerifyError) {
      log.error(
        '[Billing] Auto-verify failed for 100% NHIS order:',
        autoVerifyError,
      );
      // Don't throw ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â the order was created, it can be manually verified
    }
  }

  const result = await getBillingOrderById(createdOrder.id);
  await logBillingAudit(createdOrder.id, 'CREATED', null, result);
  return result;
}

// =============================================================================
// Verify Payment - ATOMIC VERSION using DB RPC
// Single transaction: verify ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ update billing ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ create receipt ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ route to queue
// =============================================================================

/**
 * Track whether the atomic RPC exists to avoid repeated 404 calls.
 * null = unknown, true = available, false = not available
 */
let atomicRpcAvailable: boolean | null = null;

/**
 * Atomic payment verification using verify_payment_and_route RPC.
 * All operations happen in a single DB transaction for reliability.
 * Caches availability check to avoid spamming 404s.
 */
async function verifyPaymentAtomic(
  billingId: string,
  paymentMethod: string,
  staffId: string | null,
): Promise<{ success: boolean; data?: any; error?: string }> {
  // If we already know the RPC doesn't exist, skip immediately
  if (atomicRpcAvailable === false) {
    return { success: false, error: 'Atomic RPC not available (cached)' };
  }

  // Stable idempotency key to make retries/replays safe for same billing verification intent.
  const idempotencyKey = `verify-${billingId}-${paymentMethod.toLowerCase()}`;

  const { data, error } = await supabase.rpc('verify_payment_and_route', {
    p_billing_id: billingId,
    p_payment_method: paymentMethod,
    p_idempotency_key: idempotencyKey,
    p_verified_by_staff_id: staffId,
  });

  if (error) {
    // Check if the RPC function doesn't exist (404 / function not found)
    const errMsg = error.message?.toLowerCase() || '';
    if (
      errMsg.includes('function') ||
      errMsg.includes('not found') ||
      errMsg.includes('does not exist') ||
      error.code === '42883'
    ) {
      atomicRpcAvailable = false;
      console.info('[Billing] Atomic RPC not deployed yet, using legacy flow');
    } else {
      log.warn('[Billing] Atomic verification RPC error:', error.message);
    }
    return { success: false, error: error.message };
  }

  // RPC exists and worked
  atomicRpcAvailable = true;

  if (!data?.success) {
    return { success: false, error: data?.error || 'Unknown error' };
  }

  log.info(`[Billing] Atomic verification complete:`, data);
  return { success: true, data };
}

function detectSpecialtyTargetFromClinic(
  clinic: {
    clinic_name?: string | null;
    clinic_code?: string | null;
    clinic_id?: string | null;
  } | null,
): 'Dental' | 'Ophthalmology' | 'Physiotherapy' | 'Nutrition' | null {
  if (!clinic) return null;

  const clinicName = (clinic.clinic_name || '').toLowerCase();
  const clinicCode = (clinic.clinic_code || '').toLowerCase();
  const clinicIdStr = (clinic.clinic_id || '').toLowerCase();

  if (
    clinicName.includes('dental') ||
    clinicCode === 'dent' ||
    clinicIdStr === 'cln-dental'
  ) {
    return 'Dental';
  }
  if (
    clinicName.includes('eye') ||
    clinicName.includes('ophthal') ||
    clinicCode === 'eye' ||
    clinicIdStr === 'cln-eye'
  ) {
    return 'Ophthalmology';
  }
  if (
    clinicName.includes('physio') ||
    clinicName.includes('rehab') ||
    clinicCode === 'physio' ||
    clinicIdStr === 'cln-physio'
  ) {
    return 'Physiotherapy';
  }
  if (
    clinicName.includes('nutrition') ||
    clinicName.includes('diet') ||
    clinicCode === 'nut' ||
    clinicIdStr === 'cln-042'
  ) {
    return 'Nutrition';
  }

  return null;
}

async function backfillSpecialtyTagOnNursingQueue(
  order: BillingOrderDTO,
  visitUuid: string,
  receiptNumber?: string,
): Promise<void> {
  const clinicId = order.visit?.clinic_id;
  if (!clinicId) return;

  const { data: clinicData } = await supabase
    .from('clinics')
    .select('clinic_id, clinic_name, clinic_code')
    .eq('id', clinicId)
    .maybeSingle();

  const targetLocation = detectSpecialtyTargetFromClinic(clinicData);
  if (!targetLocation) return;

  // Keep parity with legacy routing: specialty referral requests should transition
  // to Approved once billing is verified for the referral encounter.
  if (order.visit?.is_referral_encounter && order.visit?.source_referral_id) {
    const { error: referralUpdateError } = await supabase
      .from('clinical_requests')
      .update({
        status: 'Approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.visit.source_referral_id);

    if (referralUpdateError) {
      log.warn(
        '[Billing] Failed to backfill specialty referral approval state:',
        referralUpdateError,
      );
    }
  }

  const specialtyTag = `[SPECIALTY_NEXT:${targetLocation}]`;
  const handoffNotes =
    `Payment verified, proceeding to Nursing for vitals before ${targetLocation}${receiptNumber ? ` (Receipt: ${receiptNumber})` : ''} ${specialtyTag}`.trim();

  const { data: activeQueues } = await supabase
    .from('queue')
    .select('id, location, notes')
    .eq('visit_id', visitUuid)
    .in('status', ['Waiting', 'Called', 'In Progress'])
    .order('created_at', { ascending: false });

  const nursingQueue = (activeQueues || []).find(
    (q: any) => q.location === 'Nursing',
  );

  // Old atomic DB versions can place specialty patients directly in specialty queue.
  // Standard workflow is always Billing -> Nursing -> Specialty, so repair here.
  if (!nursingQueue) {
    const nonNursingActiveIds = (activeQueues || [])
      .filter((q: any) => q.location !== 'Nursing')
      .map((q: any) => q.id);

    if (nonNursingActiveIds.length > 0) {
      await supabase
        .from('queue')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .in('id', nonNursingActiveIds);
    }

    const { data: queueResult, error: queueError } = await supabase.rpc(
      'create_queue_ticket',
      {
        p_dept: 'Nursing',
        p_patient_id: order.patient_id,
        p_visit_id: visitUuid,
        p_encounter_id: visitUuid,
        p_clinic_id: order.visit?.clinic_id ?? null,
        p_priority: order.visit?.priority || 'Normal',
        p_notes: handoffNotes,
      },
    );

    if (queueError || !queueResult?.success) {
      const fallbackTicket = Math.floor(Date.now() % 10000).toString();
      const { error: fallbackInsertError } = await supabase
        .from('queue')
        .insert({
          patient_id: order.patient_id,
          visit_id: visitUuid,
          encounter_id: visitUuid,
          clinic_id: order.visit?.clinic_id ?? null,
          ticket_number: fallbackTicket,
          location: 'Nursing',
          priority: order.visit?.priority || 'Normal',
          status: 'Waiting',
          notes: handoffNotes,
        });

      if (fallbackInsertError) {
        log.warn(
          '[Billing] Failed to create nursing queue fallback during specialty handoff backfill:',
          fallbackInsertError,
        );
        return;
      }
    }

    await supabase
      .from('visits')
      .update({
        current_stage: 'queue_waiting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', visitUuid);

    log.info(
      `[Billing] Repaired specialty handoff to Nursing for visit ${visitUuid} (${targetLocation})`,
    );
    return;
  }

  const existingNotes = (nursingQueue.notes || '').trim();
  if (existingNotes.includes(specialtyTag)) return;

  const notePrefix =
    existingNotes.length > 0
      ? `${existingNotes} `
      : `Payment verified, proceeding to Nursing for vitals before ${targetLocation}${receiptNumber ? ` (Receipt: ${receiptNumber})` : ''} `;

  const { error: updateError } = await supabase
    .from('queue')
    .update({ notes: `${notePrefix}${specialtyTag}`.trim() })
    .eq('id', nursingQueue.id);

  if (updateError) {
    log.warn(
      '[Billing] Failed to backfill specialty handoff tag on Nursing queue:',
      updateError,
    );
    return;
  }

  log.info(
    `[Billing] Backfilled ${specialtyTag} on Nursing queue for visit ${visitUuid}`,
  );
}

export async function verifyPayment(
  dto: VerifyPaymentDTO,
): Promise<BillingOrderDTO> {
  // Deduplicate by billing_id to prevent double verification
  const dedupeKey = DedupeKeys.verifyPayment(dto.billing_id);

  return requestDeduper.dedupe(dedupeKey, async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: staffData } = await supabase
      .from('staff')
      .select('id, staff_id')
      .eq('email', user.email)
      .single();

    // ==========================================================================
    // TRY ATOMIC RPC FIRST (single transaction, idempotent)
    // ==========================================================================
    const atomicResult = await verifyPaymentAtomic(
      dto.billing_id,
      dto.payment_method,
      staffData?.staff_id ?? null,
    );

    if (atomicResult.success) {
      // Atomic verification succeeded - fetch and return the updated order
      log.info(
        '[Billing] Atomic verification succeeded:',
        atomicResult.data?.message,
      );
      const result = await getBillingOrderById(dto.billing_id);

      // Log audit for successful atomic verification
      const oldOrder = await getBillingOrderById(dto.billing_id);
      await logBillingAudit(dto.billing_id, 'VERIFIED', oldOrder, result);

      // Sync physio plan payment status (client-side fallback in case DB trigger is absent)
      if (result.source_module === 'physiotherapy') {
        await syncPhysioPaymentStatus(dto.billing_id);
      }

      // Some deployed DB RPC versions may miss specialty handoff tags for newer clinics
      // (e.g. Nutrition). Backfill the nursing handoff tag so Nursing routes correctly.
      const visitUuid = result.encounter_id || result.visit_id;
      if (
        visitUuid &&
        ['consultation', 'registration'].includes(result.source_module || '')
      ) {
        await backfillSpecialtyTagOnNursingQueue(
          result,
          visitUuid,
          atomicResult.data?.receipt_number,
        );
      }

      return result;
    }

    // Atomic RPC not available or failed - fallback to legacy multi-step approach
    log.warn(
      '[Billing] Atomic RPC unavailable, using legacy verification:',
      atomicResult.error,
    );

    const oldOrder = await getBillingOrderById(dto.billing_id);

    let paymentStatus: BillingOrderStatus;
    switch (dto.payment_method) {
      case 'NHIS':
        paymentStatus = 'Paid_NHIS';
        break;
      case 'Retainership':
        paymentStatus = 'Paid_Retainership';
        break;
      default:
        paymentStatus = 'Paid';
    }

    // Use client-side receipt number generation (server RPC may not exist)
    const receiptNumber = generateReceiptNumber();

    const paymentAmount = Math.max(
      oldOrder.balance_amount ?? oldOrder.balance ?? 0,
      0,
    );
    const newPaidAmount = oldOrder.paid_amount + paymentAmount;

    // For NHIS/Retainership payments, the balance should be 0 after verification
    // because the insurance covers the remaining amount
    const isInsurancePayment =
      dto.payment_method === 'NHIS' || dto.payment_method === 'Retainership';
    const newBalance = isInsurancePayment
      ? 0
      : Math.max(oldOrder.net_amount - newPaidAmount, 0);

    // Use optimistic locking if version is provided
    const updateData = {
      status: paymentStatus,
      payment_method: dto.payment_method,
      paid_amount: newPaidAmount,
      balance_amount: newBalance,
    };

    if (dto.version !== undefined && staffData?.id) {
      // Use type-safe RPC with optimistic locking
      try {
        await updateWithLock(
          'billing_orders',
          dto.billing_id,
          updateData,
          dto.version,
          { modifiedBy: staffData.id, logConflict: true },
        );
      } catch (error) {
        if (error instanceof OptimisticLockError) {
          throw new Error(
            `Payment verification failed: This billing order was modified by another user. ` +
              `Please refresh and try again.`,
          );
        }
        throw error;
      }
    } else {
      // Fallback to regular update (no version check)
      const { error: updateError } = await supabase
        .from('billing_orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dto.billing_id);

      if (updateError) throw updateError;
    }

    await supabase
      .from('billing_items')
      .update({ status: 'Paid' })
      .eq('billing_order_id', dto.billing_id);

    // receipts table uses VARCHAR patient_id and visit_id (display IDs), not UUIDs
    // Get VARCHAR IDs from the joined patient and visit objects
    const patientDisplayId = oldOrder.patient?.patient_id; // VARCHAR display ID
    const visitDisplayId = oldOrder.visit?.visit_id; // VARCHAR display ID

    if (patientDisplayId) {
      const { error: receiptError } = await supabase.from('receipts').insert({
        receipt_number: receiptNumber,
        billing_order_id: dto.billing_id,
        patient_id: patientDisplayId, // VARCHAR - references patients(patient_id)
        visit_id: visitDisplayId ?? null, // VARCHAR - for display/legacy
        encounter_id: oldOrder.encounter_id ?? oldOrder.visit_id ?? null, // UUID - PRIMARY link
        amount_paid: paymentAmount != null ? paymentAmount : (oldOrder.net_amount || 0),
        payment_method: dto.payment_method,
        issued_by: staffData?.staff_id ?? null,
      });

      if (receiptError) {
        log.error(
          '[Billing] Failed to create receipt record',
          receiptError,
        );
      }
    } else {
      log.error(
        '[Billing] Cannot create receipt - patient display ID not available',
      );
    }

    const result = await getBillingOrderById(dto.billing_id);
    await logBillingAudit(dto.billing_id, 'VERIFIED', oldOrder, result);

    // Sync physio plan payment status (client-side fallback in case DB trigger is absent)
    if (result.source_module === 'physiotherapy') {
      await syncPhysioPaymentStatus(dto.billing_id);
    }

    // Auto-route to Nursing after consultation/registration payment
    // Use encounter_id (UUID) for queue lookup since queue.visit_id stores UUID
    const visitUuid = result.encounter_id || result.visit_id;
    if (visitUuid && result.source_module) {
      const isInitialPayment = ['consultation', 'registration'].includes(
        result.source_module,
      );

      // A&E encounters follow their own triage ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ emergency flow; skip nursing auto-route
      const isAeBillingVisit =
        result.visit?.encounter_category === 'emergency' ||
        result.visit?.visit_type === 'Emergency' ||
        result.visit?.visit_type === 'A&E';
      if (isAeBillingVisit && isInitialPayment) {
        log.info(
          '[Billing] A&E encounter ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â skipping Nursing auto-route (patient follows A&E triage path)',
        );
      } else if (isInitialPayment) {
        // Default location is Nursing, may be updated to specialty clinic
        let targetLocation = 'Nursing';
        let isSpecialtyClinic = false;

        try {
          // Check if this is a referral encounter to a specialty clinic
          const isSpecialtyReferral =
            result.visit?.is_referral_encounter &&
            result.visit?.source_referral_id;

          // Detect if this is a specialty clinic (Dental, Eye, Physio)
          const clinicId = result.visit?.clinic_id;

          if (clinicId) {
            // Fetch clinic details to detect specialty
            const { data: clinicData } = await supabase
              .from('clinics')
              .select('clinic_id, clinic_name, clinic_code')
              .eq('id', clinicId)
              .maybeSingle();

            if (clinicData) {
              const clinicName = (clinicData.clinic_name || '').toLowerCase();
              const clinicCode = (clinicData.clinic_code || '').toLowerCase();
              const clinicIdStr = (clinicData.clinic_id || '').toLowerCase();

              // Check for Dental
              if (
                clinicName.includes('dental') ||
                clinicCode === 'dent' ||
                clinicIdStr === 'cln-dental'
              ) {
                targetLocation = 'Dental';
                isSpecialtyClinic = true;
              }
              // Check for Ophthalmology/Eye
              else if (
                clinicName.includes('eye') ||
                clinicName.includes('ophthal') ||
                clinicCode === 'eye' ||
                clinicIdStr === 'cln-eye'
              ) {
                targetLocation = 'Ophthalmology';
                isSpecialtyClinic = true;
              }
              // Check for Physiotherapy
              else if (
                clinicName.includes('physio') ||
                clinicName.includes('rehab') ||
                clinicCode === 'physio' ||
                clinicIdStr === 'cln-physio'
              ) {
                targetLocation = 'Physiotherapy';
                isSpecialtyClinic = true;
              }
              // Check for Nutrition / Dietetics
              else if (
                clinicName.includes('nutrition') ||
                clinicName.includes('diet') ||
                clinicCode === 'nut' ||
                clinicIdStr === 'cln-042'
              ) {
                targetLocation = 'Nutrition';
                isSpecialtyClinic = true;
              }
            }
          }

          // REFERRAL WORKFLOW: For specialty referrals, update clinical_request status
          // and route to NURSING first (patient goes through vitals before specialty queue)
          if (isSpecialtyReferral && isSpecialtyClinic) {
            const { error: referralUpdateError } = await supabase
              .from('clinical_requests')
              .update({
                status: 'Approved',
                updated_at: new Date().toISOString(),
              })
              .eq('id', result.visit!.source_referral_id);

            if (referralUpdateError) {
              log.error(
                '[Billing] Failed to update referral status:',
                referralUpdateError,
              );
            } else {
              log.info(`[Billing] Referral status updated to Approved`);
            }

            // Complete the billing queue entry if it exists
            const { data: currentQueue } = await supabase
              .from('queue')
              .select('id, location, status')
              .eq('visit_id', visitUuid)
              .eq('location', 'Billing')
              .neq('status', 'Completed')
              .neq('status', 'Cancelled')
              .limit(1)
              .maybeSingle();

            if (currentQueue) {
              await supabase
                .from('queue')
                .update({
                  status: 'Completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', currentQueue.id);
            }

            // Route referral patient to NURSING for vitals, tagged with specialty target
            const referralQueueNote = `Specialty referral - proceeding to Nursing for vitals before ${targetLocation} (Receipt: ${receiptNumber}) [SPECIALTY_NEXT:${targetLocation}]`;
            const { data: refQueueResult, error: refQueueError } =
              await supabase.rpc('create_queue_ticket', {
                p_dept: 'Nursing',
                p_patient_id: result.patient_id,
                p_visit_id: visitUuid,
                p_encounter_id: visitUuid,
                p_clinic_id: result.visit?.clinic_id ?? null,
                p_priority: result.visit?.priority || 'Normal',
                p_notes: referralQueueNote,
              });

            if (refQueueError) {
              log.warn(
                '[Billing] Atomic queue creation failed for referral, using fallback:',
                refQueueError,
              );
              const fallbackTicket = Math.floor(Date.now() % 10000).toString();
              await supabase.from('queue').insert({
                patient_id: result.patient_id,
                visit_id: visitUuid,
                encounter_id: visitUuid,
                clinic_id: result.visit?.clinic_id ?? null,
                ticket_number: fallbackTicket,
                location: 'Nursing',
                priority: result.visit?.priority || 'Normal',
                status: 'Waiting',
                notes: referralQueueNote,
              });
            } else if (refQueueResult?.success) {
              log.info(
                `[Billing] Specialty referral patient routed to Nursing with ticket #${refQueueResult.ticket_number} (will proceed to ${targetLocation} after vitals)`,
              );
            }

            // CRITICAL: Update current_stage for specialty referral patients
            await supabase
              .from('visits')
              .update({
                current_stage: 'queue_waiting',
                updated_at: new Date().toISOString(),
              })
              .eq('id', visitUuid);
            log.info(
              `[Billing] Updated visit current_stage to queue_waiting for specialty referral`,
            );
          } else {
            // Non-referral patients: add to queue as before
            // ALL patients (including specialty clinics) go to Nursing first for vitals.
            // Specialty clinics are tagged with [SPECIALTY_NEXT:X] so nursing routes them correctly.
            const { data: currentQueue } = await supabase
              .from('queue')
              .select('id, location, status')
              .eq('visit_id', visitUuid)
              .neq('status', 'Completed')
              .neq('status', 'Cancelled')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const clinicalDepartments = [
              'Nursing',
              'Consultation',
              'Laboratory',
              'Radiology',
              'Pharmacy',
              // Specialty Departments
              'Dental',
              'Ophthalmology',
              'Physiotherapy',
              'Nutrition',
            ];
            const alreadyInClinic =
              currentQueue &&
              clinicalDepartments.includes(currentQueue.location);

            if (!alreadyInClinic) {
              const priority = result.visit?.priority || 'Normal';

              if (currentQueue) {
                await supabase
                  .from('queue')
                  .update({
                    status: 'Completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', currentQueue.id);
              }

              // ALL patients go to Nursing first; specialty clinics carry a tag for post-nursing routing
              const actualTarget = 'Nursing';
              const queueNote = isSpecialtyClinic
                ? `Payment verified, proceeding to Nursing for vitals before ${targetLocation} (Receipt: ${receiptNumber}) [SPECIALTY_NEXT:${targetLocation}]`
                : `Auto-routed after payment verification (Receipt: ${receiptNumber})`;

              // Use atomic create_queue_ticket RPC for reliable ticket generation
              // ALL patients go to Nursing first (actualTarget = 'Nursing')
              const { data: queueResult, error: queueError } =
                await supabase.rpc('create_queue_ticket', {
                  p_dept: actualTarget,
                  p_patient_id: result.patient_id,
                  p_visit_id: visitUuid,
                  p_encounter_id: visitUuid,
                  p_clinic_id: result.visit?.clinic_id ?? null,
                  p_priority: priority,
                  p_notes: queueNote,
                });

              if (queueError) {
                log.error(
                  '[Billing] Atomic queue creation failed:',
                  queueError,
                );
                // Fallback to direct insert if RPC doesn't exist
                const fallbackTicket = Math.floor(
                  Date.now() % 10000,
                ).toString();
                await supabase.from('queue').insert({
                  patient_id: result.patient_id,
                  visit_id: visitUuid,
                  encounter_id: visitUuid,
                  clinic_id: result.visit?.clinic_id ?? null,
                  ticket_number: fallbackTicket,
                  location: actualTarget,
                  priority,
                  status: 'Waiting',
                  notes: queueNote,
                });
                log.info(
                  `[Billing] Fallback: Patient routed to ${actualTarget} with ticket #${fallbackTicket}`,
                );

                // CRITICAL: Update current_stage after fallback queue creation
                await supabase
                  .from('visits')
                  .update({
                    current_stage: 'queue_waiting',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', visitUuid);
                log.info(
                  `[Billing] Updated visit current_stage to queue_waiting (RPC fallback)`,
                );
              } else if (queueResult?.success) {
                log.info(
                  `[Billing] Patient routed to ${actualTarget} queue with ticket #${queueResult.ticket_number}${isSpecialtyClinic ? ` (will proceed to ${targetLocation} after nursing)` : ''}`,
                );

                // CRITICAL: Update current_stage to queue_waiting after successful queue creation
                await supabase
                  .from('visits')
                  .update({
                    current_stage: 'queue_waiting',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', visitUuid);
                log.info(
                  `[Billing] Updated visit current_stage to queue_waiting`,
                );
              } else {
                log.error(
                  '[Billing] Queue creation returned error:',
                  queueResult?.error,
                );
                throw new Error(
                  queueResult?.error || 'Failed to create queue entry',
                );
              }
            }
          }
        } catch (routingError) {
          log.error(
            '[Auto-Routing] Failed to route patient:',
            routingError,
          );
          // Try one more time with a simple queue insert ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â always go to Nursing first
          try {
            const fallbackQueueNumber = Math.floor(
              Date.now() % 10000,
            ).toString();
            const fallbackNote = isSpecialtyClinic
              ? `Fallback routing after payment verification (Receipt: ${receiptNumber}) [SPECIALTY_NEXT:${targetLocation}]`
              : `Fallback routing after payment verification (Receipt: ${receiptNumber})`;
            await supabase.from('queue').insert({
              patient_id: result.patient_id,
              visit_id: visitUuid,
              encounter_id: visitUuid,
              clinic_id: result.visit?.clinic_id ?? null,
              ticket_number: fallbackQueueNumber,
              location: 'Nursing',
              priority: result.visit?.priority || 'Normal',
              status: 'Waiting',
              notes: fallbackNote,
            });
            log.info(
              `[Billing] Fallback: Patient routed to Nursing with ticket #${fallbackQueueNumber}${isSpecialtyClinic ? ` (will proceed to ${targetLocation} after nursing)` : ''}`,
            );

            // CRITICAL: Update current_stage even in fallback
            await supabase
              .from('visits')
              .update({
                current_stage: 'queue_waiting',
                updated_at: new Date().toISOString(),
              })
              .eq('id', visitUuid);
            log.info(
              `[Billing] Updated visit current_stage to queue_waiting (fallback)`,
            );
          } catch (fallbackError) {
            log.error(
              '[Auto-Routing] Fallback routing also failed:',
              fallbackError,
            );
          }
        }
      }
    }

    return result;
  }); // End of requestDeduper.dedupe
}

// =============================================================================
// Batch Verify - ATOMIC VERSION with RPC fallback
// Groups by source_module AND encounter for consolidated receipts
// =============================================================================

export async function batchVerifyPayments(
  dto: BatchVerifyPaymentDTO,
): Promise<BillingOrderDTO[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch staff data
  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user.email)
    .single();

  // ==========================================================================
  // TRY ATOMIC RPC FOR EACH ORDER (parallel, idempotent)
  // ==========================================================================
  const atomicResults = await Promise.all(
    dto.billing_ids.map(async (billingId) => {
      const result = await verifyPaymentAtomic(
        billingId,
        dto.payment_method,
        staffData?.staff_id ?? null,
      );
      return { billingId, ...result };
    }),
  );

  // Check if all atomic calls succeeded
  const allSucceeded = atomicResults.every((r) => r.success);

  if (allSucceeded) {
    log.info('[Billing] All atomic verifications succeeded');
    // Fetch all updated orders and return
    const results = await Promise.all(
      dto.billing_ids.map((id) => getBillingOrderById(id)),
    );

    // Log audits (fire-and-forget)
    results.forEach((result) => {
      logBillingAudit(result.id, 'VERIFIED', null, result).catch((e) =>
        log.error('[Audit] Failed to log:', e),
      );
    });

    return results;
  }

  // Some atomic calls failed - check if RPC doesn't exist (fallback needed)
  const rpcMissing = atomicResults.some(
    (r) => r.error?.includes('function') || r.error?.includes('does not exist'),
  );

  if (!rpcMissing) {
    // RPC exists but verification failed for some other reason
    const failedIds = atomicResults
      .filter((r) => !r.success)
      .map((r) => r.billingId);
    log.error('[Billing] Some verifications failed:', failedIds);
    // Continue with fallback for failed ones, return successful ones
    const successfulResults = await Promise.all(
      atomicResults
        .filter((r) => r.success)
        .map((r) => getBillingOrderById(r.billingId)),
    );
    if (successfulResults.length > 0) {
      return successfulResults;
    }
  }

  // Fallback to legacy multi-step approach
  log.warn(
    '[Billing] Atomic RPC unavailable, using legacy batch verification',
  );

  // Re-fetch all billing orders for legacy approach
  const ordersToVerify = await Promise.all(
    dto.billing_ids.map((id) => getBillingOrderById(id)),
  );

  // Group billing orders by BOTH source_module AND encounter_id for consolidated receipts
  // Key format: "module::encounter_id" to ensure one receipt per category per encounter
  const ordersByModuleAndEncounter = new Map<string, typeof ordersToVerify>();
  for (const order of ordersToVerify) {
    const module = order.source_module || 'other';
    const encounterId = order.encounter_id || order.visit_id || 'unknown';
    const groupKey = `${module}::${encounterId}`;

    if (!ordersByModuleAndEncounter.has(groupKey)) {
      ordersByModuleAndEncounter.set(groupKey, []);
    }
    ordersByModuleAndEncounter.get(groupKey)!.push(order);
  }

  // Determine payment status based on payment method
  let paymentStatus: BillingOrderStatus;
  switch (dto.payment_method) {
    case 'NHIS':
      paymentStatus = 'Paid_NHIS';
      break;
    case 'Retainership':
      paymentStatus = 'Paid_Retainership';
      break;
    default:
      paymentStatus = 'Paid';
  }

  // For NHIS/Retainership payments, the balance should be 0 after verification
  const isInsurancePayment =
    dto.payment_method === 'NHIS' || dto.payment_method === 'Retainership';
  const nowIso = new Date().toISOString();

  // PARALLEL PROCESSING: Process all groups concurrently for maximum speed
  const groupPromises = Array.from(ordersByModuleAndEncounter.entries()).map(
    async ([groupKey, orders]) => {
      const [sourceModule] = groupKey.split('::');

      // Generate ONE receipt number for all orders in this module+encounter group
      // Use client-side generation (server RPC may not exist)
      const receiptNumber = generateReceiptNumber();

      let totalAmountForGroup = 0;
      let totalNhisAmount = 0;
      let totalPatientAmount = 0;
      const billingOrderIds: string[] = [];

      // Prepare all updates for this group
      const orderUpdates: Array<{
        id: string;
        oldOrder: any;
        newPaidAmount: number;
        newBalance: number;
      }> = [];

      for (const order of orders) {
        const paymentAmount = Math.max(
          order.balance_amount ?? order.balance ?? 0,
          0,
        );
        const newPaidAmount = order.paid_amount + paymentAmount;
        // For insurance payments, balance is 0; otherwise calculate remaining
        const newBalance = isInsurancePayment
          ? 0
          : Math.max(order.net_amount - newPaidAmount, 0);
        totalAmountForGroup += paymentAmount || order.net_amount;
        totalNhisAmount += order.nhis_payable || 0;
        totalPatientAmount +=
          order.patient_payable || paymentAmount || order.net_amount;
        billingOrderIds.push(order.id);

        orderUpdates.push({
          id: order.id,
          oldOrder: order,
          newPaidAmount,
          newBalance,
        });
      }

      // BATCH UPDATE: Update all billing orders in parallel
      await Promise.all(
        orderUpdates.map(async ({ id, newPaidAmount, newBalance }) => {
          await supabase
            .from('billing_orders')
            .update({
              status: paymentStatus,
              payment_method: dto.payment_method,
              paid_amount: newPaidAmount,
              balance_amount: newBalance,
              updated_at: nowIso,
            })
            .eq('id', id);
        }),
      );

      // BATCH UPDATE: Update all billing items status in parallel
      await Promise.all(
        billingOrderIds.map((orderId) =>
          supabase
            .from('billing_items')
            .update({ status: 'Paid' })
            .eq('billing_order_id', orderId),
        ),
      );

      // Fetch updated orders and log audits in parallel
      const updatedOrdersInGroup = await Promise.all(
        orderUpdates.map(async ({ id, oldOrder }) => {
          const updatedOrder = await getBillingOrderById(id);
          // Fire-and-forget audit logging to not block response
          logBillingAudit(id, 'VERIFIED', oldOrder, updatedOrder).catch((e) =>
            log.error('[Audit] Failed to log:', e),
          );
          return updatedOrder;
        }),
      );

      // Create ONE consolidated receipt for ALL orders in this category+encounter group
      // All items (e.g., all drugs, all lab tests) will share this receipt number
      const firstOrder = orders[0];
      const patientDisplayId = firstOrder.patient?.patient_id;
      const visitDisplayId = firstOrder.visit?.visit_id;

      if (patientDisplayId) {
        // Create ONE receipt that covers ALL items in this category for this encounter
        // Store metadata about all billing orders in this receipt
        const { error: receiptError } = await supabase.from('receipts').insert({
          receipt_number: receiptNumber,
          billing_order_id: billingOrderIds[0], // Primary billing order reference
          patient_id: patientDisplayId,
          visit_id: visitDisplayId ?? null,
          encounter_id: firstOrder.encounter_id ?? firstOrder.visit_id ?? null,
          amount_paid: totalPatientAmount, // Total patient payable amount
          payment_method: dto.payment_method,
          issued_by: staffData?.staff_id ?? null,
        });

        if (receiptError) {
          log.error(
            `[Billing] Failed to create ${sourceModule} receipt:`,
            receiptError,
          );
          // Still return orders but without receipt_number
          return updatedOrdersInGroup;
        }
        log.info(
          `[Billing] Created consolidated ${sourceModule} receipt: ${receiptNumber} for ${orders.length} items`,
        );

        // Return orders with receipt_number attached
        return updatedOrdersInGroup.map((updatedOrder) => ({
          ...updatedOrder,
          receipt_number: receiptNumber,
        }));
      }
      // No patient ID - still return orders
      return updatedOrdersInGroup;
    },
  );

  // Wait for all groups to complete in parallel
  const groupResults = await Promise.all(groupPromises);
  const results: BillingOrderDTO[] = groupResults.flat();

  // FIRE-AND-FORGET: Auto-routing for consultation/registration payments
  // This runs in background without blocking the response
  const firstOrder = ordersToVerify[0];
  const sourceModule = firstOrder?.source_module || 'other';
  const visitUuid = firstOrder?.encounter_id || firstOrder?.visit_id;

  if (visitUuid && ['consultation', 'registration'].includes(sourceModule)) {
    // Don't await - let it run in background
    handleAutoRouting(firstOrder, visitUuid, results[0]?.receipt_number).catch(
      (err) => log.error('[Auto-Routing] Background routing failed:', err),
    );
  }

  return results;
}

/**
 * Background auto-routing after payment verification
 * Runs asynchronously to not block payment verification response
 */
async function handleAutoRouting(
  firstOrder: BillingOrderDTO,
  visitUuid: string,
  receiptNumber?: string,
): Promise<void> {
  try {
    // Check if this is a referral encounter to a specialty clinic
    const isSpecialtyReferral =
      firstOrder.visit?.is_referral_encounter &&
      firstOrder.visit?.source_referral_id;

    // Detect if this is a specialty clinic (Dental, Eye, Physio)
    const clinicId = firstOrder.visit?.clinic_id;
    let targetLocation = 'Nursing';
    let isSpecialtyClinic = false;

    if (clinicId) {
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('clinic_id, clinic_name, clinic_code')
        .eq('id', clinicId)
        .maybeSingle();

      if (clinicData) {
        const clinicName = (clinicData.clinic_name || '').toLowerCase();
        const clinicCode = (clinicData.clinic_code || '').toLowerCase();
        const clinicIdStr = (clinicData.clinic_id || '').toLowerCase();

        if (
          clinicName.includes('dental') ||
          clinicCode === 'dent' ||
          clinicIdStr === 'cln-dental'
        ) {
          targetLocation = 'Dental';
          isSpecialtyClinic = true;
        } else if (
          clinicName.includes('eye') ||
          clinicName.includes('ophthal') ||
          clinicCode === 'eye' ||
          clinicIdStr === 'cln-eye'
        ) {
          targetLocation = 'Ophthalmology';
          isSpecialtyClinic = true;
        } else if (
          clinicName.includes('physio') ||
          clinicName.includes('rehab') ||
          clinicCode === 'physio' ||
          clinicIdStr === 'cln-physio'
        ) {
          targetLocation = 'Physiotherapy';
          isSpecialtyClinic = true;
        } else if (
          clinicName.includes('nutrition') ||
          clinicName.includes('diet') ||
          clinicCode === 'nut' ||
          clinicIdStr === 'cln-042'
        ) {
          targetLocation = 'Nutrition';
          isSpecialtyClinic = true;
        }
      }
    }

    // REFERRAL WORKFLOW: For specialty referrals, update clinical_request status
    // and route to NURSING first (patient goes through vitals before specialty queue)
    if (isSpecialtyReferral && isSpecialtyClinic) {
      const { error: referralUpdateError } = await supabase
        .from('clinical_requests')
        .update({
          status: 'Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', firstOrder.visit!.source_referral_id);

      if (referralUpdateError) {
        log.error(
          '[Auto-Routing] Failed to update referral status:',
          referralUpdateError,
        );
      } else {
        log.info(`[Auto-Routing] Referral status updated to Approved`);
      }

      // Complete the billing queue entry if it exists
      const { data: billingQueue } = await supabase
        .from('queue')
        .select('id')
        .eq('visit_id', visitUuid)
        .eq('location', 'Billing')
        .neq('status', 'Completed')
        .neq('status', 'Cancelled')
        .limit(1)
        .maybeSingle();

      if (billingQueue) {
        await supabase
          .from('queue')
          .update({
            status: 'Completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', billingQueue.id);
      }

      // Route referral patient to NURSING for vitals, tagged with specialty target
      const refQueueNote = `Specialty referral - proceeding to Nursing for vitals before ${targetLocation}${receiptNumber ? ` (Receipt: ${receiptNumber})` : ''} [SPECIALTY_NEXT:${targetLocation}]`;
      const { data: queueNumRef } = await supabase.rpc(
        'get_next_queue_number',
        {
          dept: 'Nursing',
        },
      );
      await supabase.from('queue').insert({
        patient_id: firstOrder.patient_id,
        visit_id: visitUuid,
        encounter_id: visitUuid,
        clinic_id: firstOrder.visit?.clinic_id ?? null,
        ticket_number: (
          queueNumRef || Math.floor(Math.random() * 1000)
        ).toString(),
        location: 'Nursing',
        priority: firstOrder.visit?.priority || 'Normal',
        status: 'Waiting',
        notes: refQueueNote,
      });
      log.info(
        `[Auto-Routing] Specialty referral patient routed to Nursing (will proceed to ${targetLocation} after vitals)`,
      );

      // CRITICAL: Update current_stage for specialty referral patients
      await supabase
        .from('visits')
        .update({
          current_stage: 'queue_waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitUuid);
      log.info(
        `[Auto-Routing] Updated visit current_stage to queue_waiting for specialty referral`,
      );
      return;
    }

    // Non-referral patients: ALL go to Nursing first (specialty clinics tagged for post-nursing routing)
    const { data: currentQueue } = await supabase
      .from('queue')
      .select('id, location, status')
      .eq('visit_id', visitUuid)
      .neq('status', 'Completed')
      .neq('status', 'Cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const clinicalDepartments = [
      'Nursing',
      'Consultation',
      'Laboratory',
      'Radiology',
      'Pharmacy',
      'Dental',
      'Ophthalmology',
      'Physiotherapy',
      'Nutrition',
    ];
    const alreadyInClinic =
      currentQueue && clinicalDepartments.includes(currentQueue.location);

    if (!alreadyInClinic) {
      const priority = firstOrder.visit?.priority || 'Normal';

      const { data: queueNumResult } = await supabase.rpc(
        'get_next_queue_number',
        {
          dept: 'Nursing',
        },
      );

      if (currentQueue) {
        await supabase
          .from('queue')
          .update({
            status: 'Completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', currentQueue.id);
      }

      const queueNote = isSpecialtyClinic
        ? `Payment verified, proceeding to Nursing for vitals before ${targetLocation}${receiptNumber ? ` (Receipt: ${receiptNumber})` : ''} [SPECIALTY_NEXT:${targetLocation}]`
        : `Auto-routed after payment verification${receiptNumber ? ` (Receipt: ${receiptNumber})` : ''}`;

      await supabase.from('queue').insert({
        patient_id: firstOrder.patient_id,
        visit_id: visitUuid,
        encounter_id: visitUuid,
        clinic_id: firstOrder.visit?.clinic_id ?? null,
        ticket_number: (
          queueNumResult || Math.floor(Math.random() * 1000)
        ).toString(),
        location: 'Nursing',
        priority,
        status: 'Waiting',
        notes: queueNote,
      });

      // CRITICAL: Update current_stage after successful queue creation
      await supabase
        .from('visits')
        .update({
          current_stage: 'queue_waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitUuid);
      log.info(
        `[Auto-Routing] Updated visit current_stage to queue_waiting`,
      );
    }
  } catch (routingError) {
    log.error('[Auto-Routing] Failed to route patient:', routingError);
  }
}

// =============================================================================
// Waive & Cancel
// =============================================================================

export async function waivePayment(
  billingId: string,
  reason: string,
): Promise<BillingOrderDTO> {
  const oldOrder = await getBillingOrderById(billingId);

  const { error } = await supabase
    .from('billing_orders')
    .update({
      status: 'Waived',
      paid_amount: oldOrder.paid_amount,
      balance_amount: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', billingId);

  if (error) throw error;

  const updated = await getBillingOrderById(billingId);
  await logBillingAudit(billingId, 'WAIVED', oldOrder, updated, reason);
  return updated;
}

export async function cancelBillingOrder(
  billingId: string,
  reason: string,
): Promise<BillingOrderDTO> {
  const oldOrder = await getBillingOrderById(billingId);

  if (
    oldOrder.payment_status !== 'Pending' &&
    oldOrder.payment_status !== 'Awaiting_Payment'
  ) {
    throw new Error('Only pending billing orders can be cancelled');
  }

  const { error } = await supabase
    .from('billing_orders')
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('id', billingId);

  if (error) throw error;

  const updated = await getBillingOrderById(billingId);
  await logBillingAudit(billingId, 'CANCELLED', oldOrder, updated, reason);
  return updated;
}

// =============================================================================
// Statistics & Checks
// =============================================================================

export async function getBillingOrderStats(): Promise<BillingOrderStats> {
  const today = new Date().toISOString().split('T')[0];

  // Get pending orders with visit info to filter cancelled encounters
  const { data: pendingData } = await supabase
    .from('billing_orders')
    .select(
      `
      net_amount,
      balance_amount,
      visit:visits!billing_orders_visit_id_fkey(visit_id, status)
    `,
    )
    .in('status', ['Pending', 'Awaiting_Payment'])
    .neq('status', 'Cancelled');

  // Get paid today with visit info to filter cancelled encounters
  const { data: paidTodayData } = await supabase
    .from('billing_orders')
    .select(
      `
      net_amount,
      paid_amount,
      payment_method,
      updated_at,
      visit:visits!billing_orders_visit_id_fkey(visit_id, status)
    `,
    )
    .in('status', PAID_STATUSES)
    .gte('updated_at', today);

  // Filter out orders from cancelled encounters
  const pending = (pendingData || []).filter(
    (p: any) => p.visit?.status !== 'Cancelled',
  );
  const paidToday = (paidTodayData || []).filter(
    (p: any) => p.visit?.status !== 'Cancelled',
  );

  const pendingCount = pending.length;
  const pendingAmount = pending.reduce(
    (sum, p) => sum + (Number(p.balance_amount) || Number(p.net_amount) || 0),
    0,
  );
  const paidTodayCount = paidToday.length;
  const paidTodayAmount = paidToday.reduce(
    (sum, p) => sum + (Number(p.net_amount) || 0),
    0,
  );

  const byMethodMap = new Map<string, { count: number; amount: number }>();
  for (const p of paidToday) {
    const method = p.payment_method || 'Unknown';
    const current = byMethodMap.get(method) || { count: 0, amount: 0 };
    current.count++;
    current.amount += Number(p.net_amount) || 0;
    byMethodMap.set(method, current);
  }

  return {
    pending_count: pendingCount,
    pending_amount: pendingAmount,
    paid_today_count: paidTodayCount,
    paid_today_amount: paidTodayAmount,
    by_payment_method: Array.from(byMethodMap.entries()).map(
      ([method, data]) => ({
        method,
        ...data,
      }),
    ),
    by_source_module: [],
  };
}

export async function hasUnpaidBillingOrders(
  visitId: string,
): Promise<boolean> {
  // First check if the encounter is cancelled
  const { data: visitData } = await supabase
    .from('visits')
    .select('status')
    .eq('visit_id', visitId)
    .single();

  // If encounter is cancelled, there are no billable orders
  if (visitData?.status === 'Cancelled') {
    return false;
  }

  const { data, error } = await supabase
    .from('billing_orders')
    .select('id')
    .eq('visit_id', visitId)
    .in('status', ['Pending', 'Awaiting_Payment'])
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function getVisitBillingOrders(
  visitId: string,
): Promise<BillingOrderDTO[]> {
  // First check if the encounter/visit is cancelled
  const { data: visitData } = await supabase
    .from('visits')
    .select('status')
    .eq('visit_id', visitId)
    .single();

  // If encounter is cancelled, return empty array (no billable orders)
  if (visitData?.status === 'Cancelled') {
    return [];
  }

  const { data, error } = await supabase
    .from('billing_orders')
    .select(BILLING_ORDER_SELECT)
    .eq('visit_id', visitId)
    .neq('status', 'Cancelled') // Exclude cancelled billing orders
    .order('created_at', { ascending: true });

  if (error) throw error;
  return normalizeBillingOrders((data as any[]) ?? null);
}

// =============================================================================
// Physiotherapy Payment Status Sync
// =============================================================================

/**
 * After a physiotherapy billing order is paid, update the linked physio_plan's
 * payment_status from 'awaiting_payment' to 'paid' so sessions unlock.
 * This is a client-side fallback ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a DB trigger also does this.
 */
async function syncPhysioPaymentStatus(billingOrderId: string): Promise<void> {
  try {
    // Find physio plan IDs linked via billing_items
    const { data: items } = await supabase
      .from('billing_items')
      .select('service_reference_id, item_id')
      .eq('billing_order_id', billingOrderId);

    if (!items?.length) return;

    const planIds = new Set<string>();
    for (const item of items) {
      if (item.service_reference_id) planIds.add(item.service_reference_id);
      if (item.item_id) planIds.add(item.item_id);
    }

    // Update matching physio_plans
    for (const planId of planIds) {
      const { error } = await supabase
        .from('physio_plans')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('plan_id', planId)
        .in('payment_status', ['pending_billing', 'awaiting_payment']);

      if (error) {
        // plan_id might be a session ID not a plan ID ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ignore gracefully
        log.debug(
          '[Billing] syncPhysioPaymentStatus skip:',
          planId,
          error.message,
        );
      } else {
        log.info(`[Billing] Physio plan ${planId} payment_status ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ paid`);
      }
    }
  } catch (err) {
    log.warn(
      '[Billing] Failed to sync physio payment status (non-blocking):',
      err,
    );
  }
}

// =============================================================================
// Audit Logging
// =============================================================================

async function logBillingAudit(
  billingId: string,
  action: string,
  oldValues: any,
  newValues: any,
  notes?: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let staffId = null;

    if (user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, role')
        .eq('email', user.email)
        .single();
      staffId = staffData?.id;
    }

    // Skip audit if no staff identified (performed_by is NOT NULL in DB)
    if (!staffId) {
      log.warn('[Audit] Skipping audit log - no staff ID found');
      return;
    }

    // Map action names to billing_audit_event enum values from migration 064
    const eventTypeMap: Record<string, string> = {
      ITEM_ADDED: 'ITEM_CREATED',
      CREATED: 'ITEM_CREATED',
      VERIFIED: 'ITEM_VERIFIED',
      WAIVED: 'ITEM_ADJUSTED',
      CANCELLED: 'ITEM_REJECTED',
      PAYMENT: 'PAYMENT_RECORDED',
    };
    const eventType = eventTypeMap[action] || 'ITEM_CREATED';

    // Column names must match the DB schema (migration 064):
    // event_type (enum), entity_type, entity_id, old_value, new_value, performed_by, notes
    await supabase.from('billing_audit_log').insert({
      event_type: eventType,
      entity_type: 'billing_order',
      entity_id: billingId,
      performed_by: staffId,
      old_value: oldValues,
      new_value: newValues,
      notes,
    });
  } catch (error) {
    // Audit logging should never break billing operations
    log.warn('[Audit] Failed to log billing audit (non-blocking):', error);
  }
}

// =============================================================================
// Payment Status Lookups
// =============================================================================

export interface PaymentStatusMapEntry {
  billing_id: string;
  order_number?: string;
  payment_status: BillingOrderStatus;
  payment_method?: string;
  amount_due: number;
  paid_amount?: number;
  balance_amount?: number;
  patient_payable?: number;
  receipt_number?: string;
  service_description?: string;
  visit_payment_category?: string;
}

export interface PaymentStatusMap {
  [sourceRecordId: string]: PaymentStatusMapEntry;
}

export async function getPaymentStatusBySourceRecords(
  sourceRecordIds: string[],
  sourceModule: 'lab' | 'radiology' | 'pharmacy',
): Promise<PaymentStatusMap> {
  const normalizedIds = Array.from(
    new Set(sourceRecordIds.filter((id): id is string => Boolean(id))),
  );
  if (normalizedIds.length === 0) return {};

  // Query both keys separately for reliable PostgREST parsing and merge the results.
  const [itemsByServiceRefResult, itemsByItemResult] = await Promise.all([
    supabase
      .from('billing_items')
      .select('id, item_id, service_reference_id, billing_order_id')
      .in('service_reference_id', normalizedIds),
    supabase
      .from('billing_items')
      .select('id, item_id, service_reference_id, billing_order_id')
      .in('item_id', normalizedIds),
  ]);

  if (itemsByServiceRefResult.error || itemsByItemResult.error) {
    log.error('Error fetching billing items for source records:', {
      by_service_reference: itemsByServiceRefResult.error,
      by_item_id: itemsByItemResult.error,
    });
    return {};
  }

  const mergedItems = [
    ...(itemsByServiceRefResult.data || []),
    ...(itemsByItemResult.data || []),
  ];
  const itemMap = new Map<string, any>();
  for (const item of mergedItems) {
    if (!item?.id) continue;
    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, item);
    }
  }
  const items = Array.from(itemMap.values());

  const orderIds = Array.from(
    new Set((items || []).map((item) => item.billing_order_id).filter(Boolean)),
  );
  if (orderIds.length === 0) return {};

  const { data: ordersData, error: ordersError } = await supabase
    .from('billing_orders')
    .select(getBillingOrderSelect(false))
    .in('id', orderIds);

  if (ordersError) {
    log.error(
      'Error fetching billing orders for source records:',
      ordersError,
    );
    return {};
  }

  const orders = normalizeBillingOrders((ordersData as any[]) ?? null).filter(
    (order) => !order.source_module || order.source_module === sourceModule,
  );
  const orderMap = new Map<string, BillingOrderDTO>(
    orders.map((order) => [order.id, order]),
  );

  const statusMap: PaymentStatusMap = {};
  for (const item of items || []) {
    // Use either item_id or service_reference_id as the key
    const sourceId = item.service_reference_id || item.item_id;
    if (!sourceId) continue;
    const order = item.billing_order_id
      ? orderMap.get(item.billing_order_id)
      : undefined;
    if (!order) continue;

    statusMap[sourceId] = {
      billing_id: order.id,
      order_number: order.order_number,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      amount_due: order.amount_due,
      paid_amount: order.amount_paid,
      balance_amount: order.balance,
      patient_payable: order.patient_payable ?? order.amount_due,
      receipt_number: order.receipt_number,
      service_description: order.service_description,
      visit_payment_category: order.visit?.payment_category,
    };
  }

  return statusMap;
}

export async function hasOrderPendingPayment(
  sourceRecordId: string,
  sourceModule: 'lab' | 'radiology' | 'pharmacy',
): Promise<boolean> {
  const { data: item, error: itemError } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('item_id', sourceRecordId)
    .maybeSingle();

  if (itemError || !item?.billing_order_id) return false;

  const { data: order, error: orderError } = await supabase
    .from('billing_orders')
    .select('status')
    .eq('id', item.billing_order_id)
    .maybeSingle();

  if (orderError || !order) return false;

  return ['Pending', 'Awaiting_Payment'].includes(
    order.status as BillingOrderStatus,
  );
}

// =============================================================================
// Receipts Grouped by Category (using existing tables)
// =============================================================================

export interface ReceiptByCategory {
  receipt_id: string;
  receipt_number: string;
  patient_id: string;
  encounter_id: string | null;
  billing_order_id: string | null;
  amount_paid: number;
  payment_method: string;
  issued_by: string | null;
  issue_date: string;
  category: string;
  category_total: number;
  category_nhis_amount: number;
  category_patient_amount: number;
  item_count: number;
  items: Array<{
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    nhis_payable: number;
    patient_payable: number;
  }>;
  patient?: {
    patient_id: string;
    first_name: string;
    last_name: string;
    hospital_number?: string;
  };
}

export interface ReceiptsByCategoryFilters {
  from_date?: string;
  to_date?: string;
  payment_method?: string;
  category?: string;
  encounter_id?: string;
  patient_id?: string;
}

/**
 * Get receipts grouped by service category (item_type from billing_items)
 * This provides the category-based view using existing tables
 */
export async function getReceiptsGroupedByCategory(
  filters?: ReceiptsByCategoryFilters,
): Promise<ReceiptByCategory[]> {
  // Fetch receipts with billing orders and items
  let query = supabase
    .from('receipts')
    .select(
      `
      receipt_id,
      receipt_number,
      patient_id,
      encounter_id,
      billing_order_id,
      amount_paid,
      payment_method,
      issued_by,
      issue_date
    `,
    )
    .order('issue_date', { ascending: false });

  // Apply filters
  if (filters?.from_date) {
    query = query.gte('issue_date', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('issue_date', `${filters.to_date}T23:59:59.999Z`);
  }
  if (filters?.payment_method) {
    query = query.eq('payment_method', filters.payment_method);
  }
  if (filters?.encounter_id) {
    query = query.eq('encounter_id', filters.encounter_id);
  }
  if (filters?.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }

  const { data: receipts, error: receiptsError } = await query;

  if (receiptsError) {
    log.error('[Receipts] Error fetching receipts:', receiptsError);
    throw receiptsError;
  }

  if (!receipts || receipts.length === 0) {
    return [];
  }

  // Get all billing order IDs
  const billingOrderIds = receipts
    .map((r) => r.billing_order_id)
    .filter((id): id is string => Boolean(id));

  if (billingOrderIds.length === 0) {
    // No billing orders, return receipts without category breakdown
    return receipts.map((r) => ({
      receipt_id: r.receipt_id,
      receipt_number: r.receipt_number,
      patient_id: r.patient_id,
      encounter_id: r.encounter_id,
      billing_order_id: r.billing_order_id,
      amount_paid: Number(r.amount_paid) || 0,
      payment_method: r.payment_method,
      issued_by: r.issued_by,
      issue_date: r.issue_date,
      category: 'Other',
      category_total: Number(r.amount_paid) || 0,
      category_nhis_amount: 0,
      category_patient_amount: Number(r.amount_paid) || 0,
      item_count: 0,
      items: [],
    }));
  }

  // Fetch billing items for these orders
  const { data: billingItems, error: itemsError } = await supabase
    .from('billing_items')
    .select(
      `
      id,
      billing_order_id,
      item_type,
      item_name,
      quantity,
      unit_price,
      total_price,
      nhis_payable,
      patient_payable
    `,
    )
    .in('billing_order_id', billingOrderIds);

  if (itemsError) {
    log.error('[Receipts] Error fetching billing items:', itemsError);
  }

  // Fetch patient info
  const patientIds = [
    ...new Set(receipts.map((r) => r.patient_id).filter(Boolean)),
  ];
  const { data: patients } = await supabase
    .from('patients')
    .select('patient_id, first_name, surname, hospital_number')
    .in('patient_id', patientIds);

  const patientMap = new Map(
    (patients || []).map((p) => [
      p.patient_id,
      {
        patient_id: p.patient_id,
        first_name: p.first_name,
        last_name: p.surname,
        hospital_number: p.hospital_number || p.patient_id,
      },
    ]),
  );

  // Group items by billing_order_id and category
  const itemsByOrderAndCategory = new Map<
    string,
    Map<string, typeof billingItems>
  >();

  for (const item of billingItems || []) {
    const orderId = item.billing_order_id;
    const category = item.item_type || 'Other';

    if (!itemsByOrderAndCategory.has(orderId)) {
      itemsByOrderAndCategory.set(orderId, new Map());
    }
    const orderCategories = itemsByOrderAndCategory.get(orderId)!;

    if (!orderCategories.has(category)) {
      orderCategories.set(category, []);
    }
    orderCategories.get(category)!.push(item);
  }

  // Build category-grouped receipts
  const result: ReceiptByCategory[] = [];

  for (const receipt of receipts) {
    const orderId = receipt.billing_order_id;
    const patient = patientMap.get(receipt.patient_id);

    if (!orderId || !itemsByOrderAndCategory.has(orderId)) {
      // No items found, return as single "Other" category
      result.push({
        receipt_id: receipt.receipt_id,
        receipt_number: receipt.receipt_number,
        patient_id: receipt.patient_id,
        encounter_id: receipt.encounter_id,
        billing_order_id: receipt.billing_order_id,
        amount_paid: Number(receipt.amount_paid) || 0,
        payment_method: receipt.payment_method,
        issued_by: receipt.issued_by,
        issue_date: receipt.issue_date,
        category: 'Other',
        category_total: Number(receipt.amount_paid) || 0,
        category_nhis_amount: 0,
        category_patient_amount: Number(receipt.amount_paid) || 0,
        item_count: 0,
        items: [],
        patient,
      });
      continue;
    }

    const orderCategories = itemsByOrderAndCategory.get(orderId)!;

    // Apply category filter if specified
    const categoriesToInclude = filters?.category
      ? [filters.category]
      : Array.from(orderCategories.keys());

    for (const category of categoriesToInclude) {
      const categoryItems = orderCategories.get(category);
      if (!categoryItems || categoryItems.length === 0) continue;

      const categoryTotal = categoryItems.reduce(
        (sum, item) => sum + (Number(item.total_price) || 0),
        0,
      );
      const categoryNhisAmount = categoryItems.reduce(
        (sum, item) => sum + (Number(item.nhis_payable) || 0),
        0,
      );
      const categoryPatientAmount = categoryItems.reduce(
        (sum, item) => {
          const pp = Number(item.patient_payable);
          return sum + (pp != null && !isNaN(pp) ? pp : Number(item.total_price) || 0);
        },
        0,
      );

      result.push({
        receipt_id: receipt.receipt_id,
        receipt_number: receipt.receipt_number,
        patient_id: receipt.patient_id,
        encounter_id: receipt.encounter_id,
        billing_order_id: receipt.billing_order_id,
        amount_paid: Number(receipt.amount_paid) || 0,
        payment_method: receipt.payment_method,
        issued_by: receipt.issued_by,
        issue_date: receipt.issue_date,
        category,
        category_total: categoryTotal,
        category_nhis_amount: categoryNhisAmount,
        category_patient_amount: categoryPatientAmount,
        item_count: categoryItems.length,
        items: categoryItems.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity || 1,
          unit_price: Number(item.unit_price) || 0,
          total_price: Number(item.total_price) || 0,
          nhis_payable: Number(item.nhis_payable) || 0,
          patient_payable:
            item.patient_payable != null ? Number(item.patient_payable) : Number(item.total_price) || 0,
        })),
        patient,
      });
    }
  }

  return result;
}

/**
 * Get encounter receipts summary with category breakdown
 */
export async function getEncounterReceiptsSummary(
  encounterId: string,
): Promise<{
  total_paid: number;
  receipt_count: number;
  categories: Record<
    string,
    {
      total: number;
      nhis_amount: number;
      patient_amount: number;
      item_count: number;
      items: Array<{
        item_name: string;
        quantity: number;
        total_price: number;
      }>;
    }
  >;
  receipts: ReceiptByCategory[];
}> {
  const receipts = await getReceiptsGroupedByCategory({
    encounter_id: encounterId,
  });

  const totalPaid = receipts.reduce((sum, r) => sum + r.category_total, 0);
  const uniqueReceiptIds = new Set(receipts.map((r) => r.receipt_id));

  // Group by category
  const categories: Record<
    string,
    {
      total: number;
      nhis_amount: number;
      patient_amount: number;
      item_count: number;
      items: Array<{
        item_name: string;
        quantity: number;
        total_price: number;
      }>;
    }
  > = {};

  for (const receipt of receipts) {
    if (!categories[receipt.category]) {
      categories[receipt.category] = {
        total: 0,
        nhis_amount: 0,
        patient_amount: 0,
        item_count: 0,
        items: [],
      };
    }
    const cat = categories[receipt.category];
    cat.total += receipt.category_total;
    cat.nhis_amount += receipt.category_nhis_amount;
    cat.patient_amount += receipt.category_patient_amount;
    cat.item_count += receipt.item_count;
    cat.items.push(
      ...receipt.items.map((i) => ({
        item_name: i.item_name,
        quantity: i.quantity,
        total_price: i.total_price,
      })),
    );
  }

  return {
    total_paid: totalPaid,
    receipt_count: uniqueReceiptIds.size,
    categories,

    receipts,
  };
}

// =============================================================================
// OUTSTANDING BALANCE HELPERS
// =============================================================================

/**
 * Get total outstanding balance for a patient.
 * Sums up all unpaid or partially paid billing orders for the patient.
 * Useful for checking before discharge.
 */
export async function getPatientOutstandingBalance(patientId: string) {
  const { data, error } = await supabase
    .from('billing_orders')
    .select(
      'total_amount, paid_amount, balance_amount, net_amount, patient_payable, nhis_covered, source_module, status',
    )
    .eq('patient_id', patientId)
    .not('status', 'in', `(${CLOSED_BILLING_ORDER_STATUSES.join(',')})`);

  if (error) {
    log.error('Error fetching outstanding balance:', error);
    return 0;
  }

  const totalOutstanding = (data || []).reduce(
    (sum, order) => sum + getBillingOrderOutstandingAmount(order),
    0,
  );

  return totalOutstanding;
}

/**
 * Check whether a patient has any unverified (unpaid) billing orders.
 * Returns detailed info for discharge gating:
 * - hasUnverifiedBills: true if any billing orders are not in a paid/verified state
 * - unverifiedCount: number of unverified billing orders
 * - unverifiedTotal: total amount of unverified billing orders
 * - details: array of unverified order summaries
 */
export async function getPatientUnverifiedBills(patientId: string): Promise<{
  hasUnverifiedBills: boolean;
  unverifiedCount: number;
  unverifiedTotal: number;
  details: Array<{
    id: string;
    order_number: string;
    source_module: string;
    total_amount: number;
    outstanding_amount: number;
    status: string;
    service_name?: string;
  }>;
}> {
  const { data, error } = await supabase
    .from('billing_orders')
    .select(
      `
      id, order_number, source_module, total_amount, balance_amount, net_amount, paid_amount, patient_payable, nhis_covered, status,
      billing_items:billing_items (service_name)
    `,
    )
    .eq('patient_id', patientId)
    .not('status', 'in', `(${CLOSED_BILLING_ORDER_STATUSES.join(',')})`);

  if (error) {
    log.error('Error fetching unverified bills:', error);
    return {
      hasUnverifiedBills: false,
      unverifiedCount: 0,
      unverifiedTotal: 0,
      details: [],
    };
  }

  const unverified = (data || [])
    .map((order) => {
      const outstandingAmount = getBillingOrderOutstandingAmount(order);

      return {
        id: order.id,
        order_number: order.order_number,
        source_module: order.source_module || 'Unknown',
        total_amount: order.total_amount || 0,
        outstanding_amount: outstandingAmount,
        status: order.status || 'Pending',
        service_name:
          (order.billing_items as any)?.[0]?.service_name || undefined,
      };
    })
    .filter((order) => order.outstanding_amount > 0);

  return {
    hasUnverifiedBills: unverified.length > 0,
    unverifiedCount: unverified.length,
    unverifiedTotal: unverified.reduce(
      (sum, order) => sum + order.outstanding_amount,
      0,
    ),
    details: unverified,
  };
}

/**
 * Auto-verify a billing order as Paid_NHIS when NHIS covers 100%.
 * Creates the receipt and updates billing items status accordingly.
 * Used during billing order creation when nhis_percentage === 100.
 */
export async function autoVerifyNhisBillingOrder(
  billingOrderId: string,
): Promise<boolean> {
  try {
    // Fetch the billing order WITH patient info + items for service name & correct receipt IDs
    const { data: order, error: fetchError } = await supabase
      .from('billing_orders')
      .select(
        `
        id, order_number, total_amount, net_amount, nhis_covered, nhis_percentage,
        nhis_payable, patient_payable, patient_id, encounter_id, visit_id,
        source_module, status,
        patient:patients(patient_id),
        visit:visits!billing_orders_encounter_id_fkey(visit_id),
        items:billing_items(service_name, item_name, item_type, gross_amount, nhis_percentage, nhis_payable, patient_payable)
      `,
      )
      .eq('id', billingOrderId)
      .single();

    if (fetchError || !order) {
      log.error('[Billing] Auto-verify: Order not found', fetchError);
      return false;
    }

    // Only auto-verify if still Pending
    if (order.status !== 'Pending' && order.status !== 'Awaiting_Payment') {
      console.info(
        `[Billing] Auto-verify: Order ${order.order_number} already ${order.status}`,
      );
      return true; // Already processed
    }

    // Build service description from billing items for audit trail
    const items = Array.isArray(order.items) ? order.items : [];
    const serviceDescription = buildReceiptServiceDescription(
      items,
      order.source_module || 'Service',
    );

    // Update billing order to Paid_NHIS
    const receiptNumber = generateReceiptNumber();
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('billing_orders')
      .update({
        status: 'Paid_NHIS',
        payment_method: 'NHIS',
        paid_amount: order.total_amount || 0,
        balance_amount: 0,
        updated_at: now,
      })
      .eq('id', billingOrderId);

    if (updateError) {
      log.error(
        '[Billing] Auto-verify: Failed to update order',
        updateError,
      );
      return false;
    }

    // Update all billing items to Paid
    await supabase
      .from('billing_items')
      .update({ status: 'Paid', updated_at: now })
      .eq('billing_order_id', billingOrderId);

    // Resolve patient display ID (VARCHAR) for receipts table FK
    const patientRecord = ensureSingle(order.patient);
    const patientDisplayId = patientRecord?.patient_id;
    const visitRecord = ensureSingle(order.visit);
    const visitDisplayId = visitRecord?.visit_id;

    if (patientDisplayId) {
      const { error: receiptError } = await supabase.from('receipts').insert({
        receipt_number: receiptNumber,
        billing_order_id: billingOrderId,
        patient_id: patientDisplayId, // VARCHAR ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â references patients(patient_id)
        visit_id: visitDisplayId ?? null, // VARCHAR ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â for display/legacy
        encounter_id: order.encounter_id ?? order.visit_id ?? null, // UUID
        amount_paid: 0, // Patient pays nothing when 100% NHIS covered
        payment_method: 'NHIS',
      });

      if (receiptError) {
        log.error(
          '[Billing] Auto-verify: Failed to create receipt',
          receiptError,
        );
      }
    } else {
      log.warn(
        '[Billing] Auto-verify: No patient display ID ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â receipt skipped for',
        order.order_number,
      );
    }

    log.info(
      `[Billing] Auto-verified NHIS order ${order.order_number} (${serviceDescription}) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Receipt: ${receiptNumber}`,
    );
    return true;
  } catch (err) {
    log.error('[Billing] Auto-verify failed:', err);
    return false;
  }
}
