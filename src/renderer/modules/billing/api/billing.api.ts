import { supabase } from '../../../api/supabaseClient';
import { sanitizeFilterValue } from '../../../lib/filterSanitizer';
import { createScopedLogger } from '../../../utils/logger';
import { Priority } from '../../../types/database.types';
import {
  InvoiceDTO,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  PaymentDTO,
  CreatePaymentDTO,
  PriceItemDTO,
  CreatePriceItemDTO,
  InvoiceFilters,
  PaymentFilters,
  BillingStats,
  InvoiceStatus,
  generateInvoiceNumber,
  generateReceiptNumber,
  calculateItemTotal,
} from '../dtos/billing.dto';
import { moveToQueue } from '../../../lib/workflow';

const log = createScopedLogger('Billing');

// =============================================================================
// Invoice API Functions
// =============================================================================

/**
 * Get invoices with filters - combines legacy invoices AND billing_orders
 */
export async function getInvoices(filters: InvoiceFilters = {}) {
  const { patient_id, status, from_date, to_date, search } = filters;
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize || 50));
  const offset = (page - 1) * pageSize;

  // Calculate end of day for to_date to include all records from that day
  let toDateQuery: string | undefined;
  if (to_date) {
    const endOfDay = new Date(to_date);
    endOfDay.setDate(endOfDay.getDate() + 1);
    toDateQuery = endOfDay.toISOString().split('T')[0];
  }

  // Fetch from legacy invoices table
  let legacyQuery = supabase
    .from('invoices')
    .select(
      `
      *,
      patient:patients!patient_id(
        patient_id,
        first_name,
        surname,
        contact_phone,
        emr_number,
        insurance_type,
        nhis_number,
        patient_type,
        nhis_patient_source,
        referral_code,
        referring_facility_name,
        payer_info
      ),
      items:invoice_items(*),
      payments:payments(*)
    `,
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (patient_id) {
    legacyQuery = legacyQuery.eq('patient_id', patient_id);
  }

  if (status) {
    legacyQuery = legacyQuery.eq('status', status);
  }

  if (from_date) {
    legacyQuery = legacyQuery.gte('created_at', from_date);
  }

  if (toDateQuery) {
    legacyQuery = legacyQuery.lt('created_at', toDateQuery);
  }

  if (search) {
    legacyQuery = legacyQuery.or(
      `invoice_number.ilike.%${sanitizeFilterValue(search)}%`,
    );
  }

  const { data: legacyInvoices, error: legacyError } = await legacyQuery;
  if (legacyError) throw legacyError;

  // Fetch from billing_orders table (new unified billing system)
  let ordersQuery = supabase
    .from('billing_orders')
    .select(
      `
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
      created_by,
      created_at,
      updated_at,
      patient:patients(
        patient_id,
        first_name,
        surname,
        contact_phone,
        emr_number,
        insurance_type,
        nhis_number,
        patient_type,
        nhis_patient_source,
        referral_code,
        referring_facility_name,
        payer_info
      ),
      visit:visits!billing_orders_encounter_id_fkey(id, visit_id, encounter_number, visit_type, chief_complaint, payment_category, priority),
      items:billing_items(*)
    `,
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Map status filter to billing_order statuses
  if (status) {
    const statusMap: Record<string, string[]> = {
      Pending: ['Pending', 'Awaiting_Payment'],
      Partial: ['Partially_Paid'],
      Paid: ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'],
      Cancelled: ['Cancelled'],
    };
    const mappedStatuses = statusMap[status];
    if (mappedStatuses) {
      ordersQuery = ordersQuery.in('status', mappedStatuses);
    }
  }

  if (from_date) {
    ordersQuery = ordersQuery.gte('created_at', from_date);
  }

  if (toDateQuery) {
    ordersQuery = ordersQuery.lt('created_at', toDateQuery);
  }

  if (search) {
    ordersQuery = ordersQuery.or(
      `order_number.ilike.%${sanitizeFilterValue(search)}%`,
    );
  }

  const { data: ordersData, error: ordersError } = await ordersQuery;
  if (ordersError) {
    log.error('[Billing] Error fetching billing orders:', ordersError);
  }

  // Group billing orders by source_module + encounter_id for consolidated invoices
  // This ensures one invoice per category (pharmacy, lab, etc.) per encounter
  const ordersGroupedByCategory = new Map<string, any[]>();
  for (const order of ordersData || []) {
    const module = order.source_module || 'other';
    const encounterId = order.encounter_id || order.visit_id || 'unknown';
    const groupKey = `${module}::${encounterId}`;

    if (!ordersGroupedByCategory.has(groupKey)) {
      ordersGroupedByCategory.set(groupKey, []);
    }
    ordersGroupedByCategory.get(groupKey)!.push(order);
  }

  // Create consolidated invoices from grouped orders
  const normalizedOrders: (InvoiceDTO & { _source: string })[] = [];

  for (const [groupKey, orders] of ordersGroupedByCategory) {
    const [sourceModule] = groupKey.split('::');
    const primaryOrder = orders[0];

    // Combine all items from all orders in this group
    const allItems: any[] = [];
    let totalAmount = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    // Determine overall status from all orders
    let hasUnpaid = false;
    let hasPartial = false;
    let allPaid = true;
    let allCancelled = true;

    // Paid statuses - orders with these statuses have 0 effective balance
    const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'];

    for (const order of orders) {
      totalAmount +=
        Number(order.net_amount) || Number(order.total_amount) || 0;
      totalPaid += Number(order.paid_amount) || 0;

      // Only add balance for orders that are NOT fully paid
      // Paid NHIS/Retainership orders should have 0 effective balance
      if (!PAID_STATUSES.includes(order.status)) {
        totalBalance += Number(order.balance_amount) || 0;
      }

      totalDiscount += Number(order.discount_amount) || 0;
      totalTax += Number(order.tax_amount) || 0;

      // Collect all items
      const orderItems = (order.items || []).map((item: any) => ({
        item_id: item.id,
        invoice_id: primaryOrder.id,
        description: item.item_name,
        category: item.item_type || sourceModule || 'Other',
        quantity: item.quantity,
        unit_price: Number(item.unit_price) || 0,
        discount_percent: 0,
        discount_amount: 0,
        total: Number(item.total_price) || 0,
        reference_id: item.item_id,
        reference_type: item.item_type,
        created_at: item.created_at,
      }));
      allItems.push(...orderItems);

      // Track status
      if (
        !['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'].includes(
          order.status,
        )
      ) {
        allPaid = false;
      }
      if (order.status !== 'Cancelled') {
        allCancelled = false;
      }
      if (['Pending', 'Awaiting_Payment'].includes(order.status)) {
        hasUnpaid = true;
      }
      if (order.status === 'Partially_Paid') {
        hasPartial = true;
      }
    }

    // Determine consolidated invoice status
    let invoiceStatus: InvoiceStatus = 'Pending';
    if (allPaid) {
      invoiceStatus = 'Paid';
    } else if (allCancelled) {
      invoiceStatus = 'Cancelled';
    } else if (hasPartial || (totalPaid > 0 && totalBalance > 0)) {
      invoiceStatus = 'Partial';
    }

    // Create consolidated invoice
    const sourceModuleLabel =
      sourceModule === 'pharmacy'
        ? 'Pharmacy'
        : sourceModule === 'lab'
          ? 'Laboratory'
          : sourceModule === 'radiology'
            ? 'Radiology'
            : sourceModule === 'consultation'
              ? 'Consultation'
              : sourceModule === 'nursing'
                ? 'Nursing'
                : sourceModule === 'registration'
                  ? 'Registration'
                  : sourceModule === 'admission'
                    ? 'Admission'
                    : 'Services';

    normalizedOrders.push({
      invoice_id: primaryOrder.id,
      invoice_number: primaryOrder.order_number,
      patient_id: primaryOrder.patient?.patient_id || primaryOrder.patient_id,
      consultation_id: primaryOrder.encounter_id,
      subtotal: totalAmount + totalDiscount,
      discount_total: totalDiscount,
      tax_amount: totalTax,
      total_amount: totalAmount,
      amount_paid: totalPaid,
      balance: totalBalance,
      status: invoiceStatus,
      due_date: undefined,
      notes:
        allItems.length > 1
          ? `${allItems.length} ${sourceModuleLabel} items`
          : undefined,
      created_by: primaryOrder.created_by,
      created_at: primaryOrder.created_at,
      updated_at:
        orders[orders.length - 1].updated_at || primaryOrder.updated_at,
      patient: primaryOrder.patient,
      encounter: primaryOrder.visit
        ? {
            visit_id: primaryOrder.visit.visit_id,
            encounter_number:
              primaryOrder.visit.encounter_number ||
              primaryOrder.visit.visit_id,
            visit_type: primaryOrder.visit.visit_type,
            chief_complaint: primaryOrder.visit.chief_complaint,
          }
        : undefined,
      items: allItems,
      payments: [],
      _source: 'billing_order',
      _sourceModule: sourceModule,
      _orderCount: orders.length,
    } as InvoiceDTO & {
      _source: string;
      _sourceModule?: string;
      _orderCount?: number;
    });
  }

  log.info(
    `[Billing] Grouped ${ordersData?.length || 0} billing orders into ${normalizedOrders.length} consolidated invoices`,
  );

  // Combine and sort by date
  let combined = [
    ...(legacyInvoices || []).map((inv: any) => ({
      ...inv,
      _source: 'invoice',
    })),
    ...normalizedOrders,
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Client-side search filter for patient name (Supabase doesn't allow searching joined tables in or clause easily)
  if (search) {
    const searchLower = search.toLowerCase();
    combined = combined.filter((inv: any) => {
      const invoiceNumber = (inv.invoice_number || '').toLowerCase();
      const patientFirstName = (inv.patient?.first_name || '').toLowerCase();
      const patientSurname = (inv.patient?.surname || '').toLowerCase();
      const emrNumber = (inv.patient?.emr_number || '').toLowerCase();

      return (
        invoiceNumber.includes(searchLower) ||
        patientFirstName.includes(searchLower) ||
        patientSurname.includes(searchLower) ||
        emrNumber.includes(searchLower)
      );
    });
  }

  return combined as InvoiceDTO[];
}

/**
 * Get single invoice by ID
 */
export async function getInvoiceById(invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      *,
      patient:patients!patient_id(
        patient_id,
        first_name,
        surname,
        contact_phone,
        email,
        residential_address,
        emr_number,
        insurance_type,
        nhis_number,
        patient_type,
        nhis_patient_source,
        referral_code,
        referring_facility_name,
        payer_info
      ),
      items:invoice_items(*),
      payments:payments(*)
    `,
    )
    .eq('invoice_id', invoiceId)
    .single();

  if (error) throw error;
  return data as InvoiceDTO;
}

/**
 * Get consolidated invoice for a visit/encounter
 * Combines all billing orders (lab, radiology, pharmacy, consultation) into one invoice
 */
export async function getConsolidatedInvoiceForVisit(
  encounterId: string,
): Promise<InvoiceDTO | null> {
  // Get visit details
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .select(
      `
      id,
      visit_id,
      encounter_number,
      visit_type,
      chief_complaint,
      payment_category,
      insurance_type,
      patient_id
    `,
    )
    .eq('id', encounterId)
    .single();

  if (visitError || !visit) {
    log.error('Visit not found:', visitError);
    return null;
  }

  // Get patient details
  const { data: patient } = await supabase
    .from('patients')
    .select(
      `
      patient_id,
      first_name,
      surname,
      contact_phone,
      email,
      residential_address,
      emr_number,
      insurance_type,
      nhis_number,
      patient_type,
      nhis_patient_source,
      referral_code,
      referring_facility_name,
      payer_info
    `,
    )
    .eq('id', visit.patient_id)
    .single();

  // Get all billing orders for this encounter
  const { data: billingOrders, error: ordersError } = await supabase
    .from('billing_orders')
    .select(
      `
      *,
      items:billing_items(*)
    `,
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: true });

  if (ordersError) {
    log.error('Error fetching billing orders:', ordersError);
    return null;
  }

  if (!billingOrders || billingOrders.length === 0) {
    return null;
  }

  // Combine all items from all billing orders
  const allItems: any[] = [];
  let totalAmount = 0;
  let totalPaid = 0;
  let totalDiscount = 0;
  let nhisPayable = 0;
  let patientPayable = 0;

  for (const order of billingOrders) {
    totalAmount += Number(order.total_amount) || 0;
    totalPaid += Number(order.paid_amount) || 0;
    totalDiscount += Number(order.discount_amount) || 0;
    nhisPayable += Number(order.nhis_payable) || 0;
    patientPayable += Number(order.patient_payable) || 0;

    // Add items from this order
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        allItems.push({
          item_id: item.id,
          invoice_id: order.id,
          description: item.item_name || item.service_name || 'Service',
          category: item.item_type || order.source_module || 'Other',
          quantity: item.quantity || 1,
          unit_price: Number(item.unit_price) || 0,
          discount_percent: 0,
          discount_amount: Number(item.discount_amount) || 0,
          total: Number(item.total_price) || Number(item.gross_amount) || 0,
          reference_id: item.item_id,
          reference_type: item.item_type,
          created_at: item.created_at,
          // NHIS info
          nhis_covered: item.nhis_covered,
          nhis_percentage: item.nhis_percentage,
          nhis_payable: item.nhis_payable,
          patient_payable: item.patient_payable,
        });
      }
    }
  }

  // Generate a consolidated invoice number using visit ID
  const invoiceNumber = `INV-${visit.visit_id}`;

  // Build consolidated invoice
  const consolidatedInvoice: InvoiceDTO = {
    invoice_id: encounterId, // Use encounter ID as the consolidated invoice ID
    invoice_number: invoiceNumber,
    patient_id: patient?.patient_id || '',
    encounter_id: encounterId,
    consultation_id: null,
    subtotal: totalAmount,
    discount_amount: totalDiscount,
    discount_percent: 0,
    tax_amount: 0,
    tax_percent: 0,
    total_amount: totalAmount,
    amount_paid: totalPaid,
    balance: (patientPayable || totalAmount) - totalPaid,
    status:
      totalPaid >= (patientPayable || totalAmount)
        ? 'Paid'
        : totalPaid > 0
          ? 'Partial'
          : 'Pending',
    due_date: null,
    notes: null,
    created_by: billingOrders[0]?.created_by,
    created_at: billingOrders[0]?.created_at,
    updated_at: billingOrders[billingOrders.length - 1]?.updated_at,
    patient: patient as any,
    encounter: {
      id: visit.id,
      visit_id: visit.visit_id,
      encounter_number: visit.encounter_number,
      visit_type: visit.visit_type,
      chief_complaint: visit.chief_complaint,
    } as any,
    items: allItems,
    payments: [],
    // NHIS totals
    nhis_covered: nhisPayable > 0,
    nhis_payable: nhisPayable,
    patient_payable: patientPayable || totalAmount,
    _isConsolidated: true,
    _billingOrderIds: billingOrders.map((o) => o.id),
  };

  return consolidatedInvoice;
}

/**
 * Create new invoice
 */
export async function createInvoice(
  data: CreateInvoiceDTO,
): Promise<InvoiceDTO> {
  const {
    patient_id,
    encounter_id,
    consultation_id,
    items,
    discount_percent = 0,
    tax_percent = 0,
    due_date,
    notes,
  } = data;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('email', user.email)
    .single();

  // Calculate totals
  let subtotal = 0;
  let discountTotal = 0;

  const processedItems = items.map((item) => {
    const { discount, total } = calculateItemTotal(
      item.quantity,
      item.unit_price,
      item.discount_percent || 0,
    );
    subtotal += item.quantity * item.unit_price;
    discountTotal += discount;
    return {
      ...item,
      discount_percent: item.discount_percent || 0,
      discount_amount: discount,
      total,
    };
  });

  // Apply invoice-level discount
  const invoiceDiscount = subtotal * (discount_percent / 100);
  discountTotal += invoiceDiscount;

  const taxableAmount = subtotal - discountTotal;
  const taxAmount = taxableAmount * (tax_percent / 100);
  const totalAmount = taxableAmount + taxAmount;

  // Create invoice with encounter linkage (EMR ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Encounter ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Invoice hierarchy)
  const invoiceNumber = generateInvoiceNumber();
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      patient_id,
      encounter_id, // Required: Links to visits.id for hierarchy compliance
      consultation_id,
      subtotal,
      discount_total: discountTotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      amount_paid: 0,
      balance: totalAmount,
      status: 'Pending',
      due_date,
      notes,
      created_by: staffData?.staff_id,
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items
  const itemsToInsert = processedItems.map((item) => ({
    invoice_id: invoice.invoice_id,
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount_percent: item.discount_percent,
    discount_amount: item.discount_amount,
    total: item.total,
    reference_id: item.reference_id,
    reference_type: item.reference_type,
  }));

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  return getInvoiceById(invoice.invoice_id);
}

/**
 * Update invoice
 */
export async function updateInvoice(
  data: UpdateInvoiceDTO,
): Promise<InvoiceDTO> {
  const { invoice_id, ...updateData } = data;

  const { error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('invoice_id', invoice_id);

  if (error) throw error;
  return getInvoiceById(invoice_id);
}

/**
 * Cancel invoice
 */
export async function cancelInvoice(invoiceId: string): Promise<InvoiceDTO> {
  return updateInvoice({
    invoice_id: invoiceId,
    status: 'Cancelled',
  });
}

/**
 * Waive remaining balance (e.g. for Insurance/NHIS)
 */
export async function waiveBalance(
  invoiceId: string,
  reason: string,
  waivedBy?: string,
): Promise<InvoiceDTO> {
  // Get current invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('balance, patient_id')
    .eq('invoice_id', invoiceId)
    .single();

  if (!invoice) throw new Error('Invoice not found');

  if (invoice.balance <= 0) {
    return getInvoiceById(invoiceId);
  }

  // Create a "payment" record for the waiver/insurance coverage so we have a receipt/audit trail
  // Or just update the invoice. The workflow says "Receipt issued in ALL cases".
  // If we waive, we should probably issue a receipt for the waived amount or just clear the balance.

  // Let's record it as a payment with method 'NHIS' or 'Insurance' or 'Waiver' if we want to track it that way.
  // But strictly speaking, a waiver might not be a payment.
  // However, to clear the balance and keep accounting straight (Total = Paid + Waived), we might need a column for waived_amount.
  // The schema has `discount_total` but not `waived_amount`.
  // It has `status` = 'Waived'.

  // If we just set status to 'Waived' but leave balance > 0, it might be confusing.
  // Let's set balance to 0 and status to 'Waived' (or 'Paid' if we consider insurance payment as payment).

  // For now, let's update status to 'Waived' and balance to 0.

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'Paid', // Or 'Waived' - but 'Paid' implies settled.
      balance: 0,
      notes: `Balance waived/covered by insurance. Reason: ${reason}`,
    })
    .eq('invoice_id', invoiceId);

  if (error) throw error;

  // We should also create a receipt for the waiver if required by "Receipt issued in ALL cases"
  // This acts as proof of clearance.
  const { data: staffData } = await supabase.auth
    .getUser()
    .then(async ({ data: { user } }) => {
      if (!user) return { data: null };
      return supabase
        .from('staff')
        .select('staff_id')
        .eq('email', user.email)
        .single();
    });

  await supabase.from('receipts').insert({
    receipt_number: generateReceiptNumber(),
    invoice_id: invoiceId,
    patient_id: invoice.patient_id,
    amount_paid: invoice.balance, // The amount covered
    payment_method: 'NHIS', // or 'Insurance'
    reference_number: `WAIVER-${new Date().getTime()}`,
    issued_by: staffData?.staff_id,
  });

  return getInvoiceById(invoiceId);
}

// =============================================================================
// Payment API Functions
// =============================================================================

/**
 * Get payments with filters - combines legacy payments AND receipts from billing_orders
 */
export async function getPayments(filters: PaymentFilters = {}) {
  const { invoice_id, payment_method, from_date, to_date } = filters;

  // Calculate end of day for to_date to include all records from that day
  let toDateQuery: string | undefined;
  if (to_date) {
    const endOfDay = new Date(to_date);
    endOfDay.setDate(endOfDay.getDate() + 1);
    toDateQuery = endOfDay.toISOString().split('T')[0];
  }

  // Fetch from legacy payments table
  let legacyQuery = supabase
    .from('payments')
    .select(
      `
      *,
      invoice:invoices!invoice_id(
        invoice_id,
        invoice_number,
        encounter_id,
        total_amount,
        patient:patients!patient_id(
          patient_id,
          first_name,
          surname,
          emr_number,
          contact_phone,
          insurance_type,
          nhis_number,
          patient_type,
          nhis_patient_source,
          referral_code,
          referring_facility_name,
          payer_info
        ),
        items:invoice_items(item_id, description, category, quantity, unit_price, total)
      ),
      received_by_staff:staff(first_name, last_name)
    `,
    )
    .order('created_at', { ascending: false });

  if (invoice_id) {
    legacyQuery = legacyQuery.eq('invoice_id', invoice_id);
  }

  if (payment_method) {
    legacyQuery = legacyQuery.eq('payment_method', payment_method);
  }

  if (from_date) {
    legacyQuery = legacyQuery.gte('created_at', from_date);
  }

  if (toDateQuery) {
    legacyQuery = legacyQuery.lt('created_at', toDateQuery);
  }

  const { data: legacyPayments, error: legacyError } = await legacyQuery;
  if (legacyError) throw legacyError;

  // Fetch from receipts table (new billing_orders system)
  let receiptsQuery = supabase
    .from('receipts')
    .select(
      `
      receipt_id,
      receipt_number,
      billing_order_id,
      patient_id,
      visit_id,
      amount_paid,
      payment_method,
      reference_number,
      issued_by,
      issue_date,
      created_at,
      patient:patients!patient_id(
        patient_id,
        first_name,
        surname,
        emr_number,
        contact_phone,
        insurance_type,
        nhis_number,
        patient_type,
        nhis_patient_source,
        referral_code,
        referring_facility_name,
        payer_info
      ),
      visit:visits!visit_id(id, visit_id, encounter_number, visit_type),
      issued_by_staff:staff!receipts_issued_by_fkey(first_name, last_name),
      billing_order:billing_orders!billing_order_id(
        id,
        order_number,
        total_amount,
        items:billing_items(id, item_name, item_type, quantity, unit_price, total_price)
      )
    `,
    )
    .not('billing_order_id', 'is', null) // Only receipts tied to billing_orders
    .order('created_at', { ascending: false });

  if (payment_method) {
    receiptsQuery = receiptsQuery.eq('payment_method', payment_method);
  }

  if (from_date) {
    receiptsQuery = receiptsQuery.gte('created_at', from_date);
  }

  if (toDateQuery) {
    receiptsQuery = receiptsQuery.lt('created_at', toDateQuery);
  }

  const { data: receiptsData, error: receiptsError } = await receiptsQuery;
  if (receiptsError) {
    log.error('[Billing] Error fetching receipts:', receiptsError);
  }

  // Normalize receipts to match PaymentDTO structure
  // Using 'as any' to bypass strict type checking since we're creating a hybrid structure
  const normalizedReceipts = (receiptsData || []).map((r: any) => ({
    payment_id: r.receipt_id,
    invoice_id: r.billing_order_id, // Use billing_order_id as reference
    receipt_number: r.receipt_number,
    amount: Number(r.amount_paid) || 0,
    payment_method: r.payment_method,
    reference_number: r.reference_number,
    received_by: r.issued_by,
    notes: undefined,
    created_at: r.created_at || r.issue_date,
    // Create a partial invoice-like structure for display compatibility
    invoice: {
      invoice_id: r.billing_order_id,
      invoice_number:
        r.billing_order?.order_number ||
        `BO-${r.billing_order_id?.slice(0, 8) || 'N/A'}`,
      encounter_id: r.visit?.id,
      total_amount: r.billing_order?.total_amount || 0,
      patient: r.patient,
      encounter: r.visit
        ? {
            id: r.visit.id,
            visit_id: r.visit.visit_id,
            encounter_number: r.visit.encounter_number || r.visit.visit_id,
            visit_type: r.visit.visit_type,
          }
        : undefined,
      // Include billing items normalized to match invoice_items structure
      items: (r.billing_order?.items || []).map((item: any) => ({
        item_id: item.id,
        description: item.item_name,
        category: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total_price || item.quantity * item.unit_price,
      })),
    } as any,
    received_by_staff: r.issued_by_staff,
    // The admin who issued the receipt IS the admin who verified the payment
    verified_by_staff: r.issued_by_staff,
    verified_by: r.issued_by_staff
      ? `${r.issued_by_staff.first_name || ''} ${r.issued_by_staff.last_name || ''}`.trim()
      : r.issued_by,
    // Flag to identify source
    _source: 'billing_order',
  }));

  // Combine and sort by date
  const combined = [
    ...(legacyPayments || []).map((p: any) => ({ ...p, _source: 'invoice' })),
    ...normalizedReceipts,
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return combined as PaymentDTO[];
}

/**
 * Record payment
 */
export async function recordPayment(
  data: CreatePaymentDTO,
): Promise<PaymentDTO> {
  const { invoice_id, amount, payment_method, reference_number, notes } = data;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('staff_id')
    .eq('email', user.email)
    .single();

  // Get current invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('amount_paid, balance, total_amount, patient_id, consultation_id')
    .eq('invoice_id', invoice_id)
    .single();

  if (!invoice) throw new Error('Invoice not found');

  // Create payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id,
      receipt_number: generateReceiptNumber(),
      amount,
      payment_method,
      reference_number,
      received_by: staffData?.staff_id,
      notes,
      patient_id: invoice.patient_id,
    })
    .select(
      `
      *,
      received_by_staff:staff(first_name, last_name)
    `,
    )
    .single();

  if (paymentError) throw paymentError;

  // Create Receipt (Always issued)
  const { error: receiptError } = await supabase.from('receipts').insert({
    receipt_number: payment.receipt_number,
    invoice_id,
    patient_id: invoice.patient_id,
    amount_paid: amount,
    payment_method,
    reference_number,
    issued_by: staffData?.staff_id,
    // visit_id: ... (if we can link it)
  });

  if (receiptError) {
    log.error('Failed to create receipt record:', receiptError);
    // We don't throw here to avoid rolling back payment, but it should be logged
  }

  // Update invoice amounts
  const newAmountPaid = invoice.amount_paid + amount;
  const newBalance = invoice.total_amount - newAmountPaid;
  let newStatus: InvoiceStatus = 'Partial';

  if (newBalance <= 0) {
    newStatus = 'Paid';
  } else if (payment_method === 'NHIS' || payment_method === 'Insurance') {
    // If paid by NHIS/Insurance and balance remains, check if it should be waived or if this covers it
    // For now, if balance is small or explicit waiver logic is needed, we might need another step.
    // But per workflow "Waived" is a status.
    // If amount matches expected patient portion, we might mark as Paid or Waived.
    // For simplicity, if balance > 0, it remains Partial unless explicitly waived.
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      balance: Math.max(0, newBalance),
      status: newStatus,
    })
    .eq('invoice_id', invoice_id);

  if (updateError) throw updateError;

  const isFullyPaid = newStatus === 'Paid';

  if (isFullyPaid) {
    try {
      // Resolve the internal patient UUID from the external patient_id stored on the invoice
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', invoice.patient_id)
        .maybeSingle();

      if (!patientRecord?.id) {
        log.warn('[Billing] Auto-transfer skipped: patient not found', {
          invoiceId: invoice_id,
          patientIdentifier: invoice.patient_id,
        });
        return payment as PaymentDTO;
      }

      // Locate the latest active visit for the patient
      const { data: activeVisit } = await supabase
        .from('visits')
        .select(
          'id, visit_id, clinic_id, priority, current_stage, encounter_category, visit_type',
        )
        .eq('patient_id', patientRecord.id)
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeVisit?.id) {
        log.warn('[Billing] Auto-transfer skipped: no active visit found', {
          invoiceId: invoice_id,
          patientIdentifier: invoice.patient_id,
        });
        return payment as PaymentDTO;
      }

      // A&E encounters follow their own triage ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ emergency flow; skip nursing auto-route
      const isAeVisit =
        activeVisit.encounter_category === 'emergency' ||
        activeVisit.visit_type === 'Emergency' ||
        activeVisit.visit_type === 'A&E';
      if (isAeVisit) {
        log.info(
          '[Billing] A&E encounter ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â skipping Nursing auto-route (patient follows A&E triage path)',
        );
        return payment as PaymentDTO;
      }

      // Ensure we do not duplicate an existing nursing queue entry
      const { data: existingNursingEntry } = await supabase
        .from('queue')
        .select('id')
        .eq('visit_id', activeVisit.id)
        .eq('location', 'Nursing')
        .in('status', [
          'Waiting',
          'Ready_For_Consultation',
          'Called',
          'In Progress',
        ])
        .limit(1)
        .maybeSingle();

      if (!existingNursingEntry) {
        // Close the latest billing queue entry if it is still open
        const { data: billingQueue } = await supabase
          .from('queue')
          .select('id')
          .eq('visit_id', activeVisit.id)
          .eq('location', 'Billing')
          .in('status', ['Waiting', 'Called', 'In Progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (billingQueue?.id) {
          await supabase
            .from('queue')
            .update({
              status: 'Completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', billingQueue.id);
        }

        await moveToQueue({
          visit_id: activeVisit.id,
          patient_id: patientRecord.id,
          department: 'Nursing',
          clinic_id: activeVisit.clinic_id || undefined,
          priority: (activeVisit.priority as Priority) || 'Normal',
          notes: 'Auto-transfer after payment completion',
        });
      }

      await supabase
        .from('visits')
        .update({
          current_stage: 'nursing_vitals',
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeVisit.id);

      log.info('ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Patient automatically routed to Nursing after payment', {
        invoiceId: invoice_id,
        visitId: activeVisit.visit_id,
      });
    } catch (transitionError) {
      log.error(
        'Failed to route patient to Nursing after payment:',
        transitionError,
      );
      // Do not rethrow ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ payment should remain recorded even if workflow transition fails
    }
  }

  return payment as PaymentDTO;
}

// =============================================================================
// Price List API Functions
// =============================================================================

/**
 * Get price list
 */
export async function getPriceList(category?: string) {
  let query = supabase
    .from('price_list')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('item_name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as PriceItemDTO[];
}

/**
 * Create price item
 */
export async function createPriceItem(
  data: CreatePriceItemDTO,
): Promise<PriceItemDTO> {
  const { data: priceItem, error } = await supabase
    .from('price_list')
    .insert({
      ...data,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return priceItem as PriceItemDTO;
}

/**
 * Update price item
 */
export async function updatePriceItem(
  priceId: string,
  updates: Partial<CreatePriceItemDTO & { is_active: boolean }>,
): Promise<PriceItemDTO> {
  const { data, error } = await supabase
    .from('price_list')
    .update(updates)
    .eq('price_id', priceId)
    .select()
    .single();

  if (error) throw error;
  return data as PriceItemDTO;
}

// =============================================================================
// Delete API Functions
// =============================================================================

/**
 * Delete invoice and its related items and payments
 * Handles both legacy invoices table AND billing_orders table
 * Only allows deletion of Draft or Cancelled invoices, or by admin
 */
export async function deleteInvoice(
  invoiceId: string,
  forceDelete: boolean = false,
): Promise<void> {
  // First try to find in legacy invoices table
  const { data: legacyInvoice, error: legacyFetchError } = await supabase
    .from('invoices')
    .select('status, amount_paid')
    .eq('invoice_id', invoiceId)
    .single();

  if (!legacyFetchError && legacyInvoice) {
    // Found in legacy invoices table
    if (
      !forceDelete &&
      legacyInvoice.status !== 'Draft' &&
      legacyInvoice.status !== 'Cancelled'
    ) {
      if (legacyInvoice.amount_paid > 0) {
        throw new Error(
          'Cannot delete invoice with payments. Cancel the invoice instead or delete payments first.',
        );
      }
    }

    // Delete invoice items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      log.error('Error deleting invoice items:', itemsError);
    }

    // Delete any payments linked to this invoice
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('invoice_id', invoiceId);

    if (paymentsError) {
      log.error('Error deleting payments:', paymentsError);
    }

    // Delete any receipts linked to this invoice
    const { error: receiptsError } = await supabase
      .from('receipts')
      .delete()
      .eq('invoice_id', invoiceId);

    if (receiptsError) {
      log.error('Error deleting receipts:', receiptsError);
    }

    // Delete the invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('invoice_id', invoiceId);

    if (invoiceError) throw invoiceError;
    return;
  }

  // Try billing_orders table (new unified billing system)
  // Note: billing_orders uses 'id' as primary key and 'paid_amount' for amount paid
  const { data: billingOrder, error: orderFetchError } = await supabase
    .from('billing_orders')
    .select('id, status, paid_amount')
    .eq('id', invoiceId)
    .single();

  if (orderFetchError || !billingOrder) {
    throw new Error(
      'Invoice not found in either invoices or billing_orders table',
    );
  }

  // Found in billing_orders table
  if (
    !forceDelete &&
    billingOrder.status !== 'draft' &&
    billingOrder.status !== 'cancelled' &&
    billingOrder.status !== 'Draft' &&
    billingOrder.status !== 'Cancelled'
  ) {
    if (billingOrder.paid_amount > 0) {
      throw new Error(
        'Cannot delete billing order with payments. Cancel it instead or delete payments first.',
      );
    }
  }

  // Delete billing items first (foreign key constraint)
  const { error: billingItemsError } = await supabase
    .from('billing_items')
    .delete()
    .eq('billing_order_id', invoiceId);

  if (billingItemsError) {
    log.error('Error deleting billing items:', billingItemsError);
  }

  // Delete any receipts linked to this billing order
  const { error: receiptsError } = await supabase
    .from('receipts')
    .delete()
    .eq('billing_order_id', invoiceId);

  if (receiptsError) {
    log.error('Error deleting receipts:', receiptsError);
  }

  // Delete the billing order
  const { error: orderError } = await supabase
    .from('billing_orders')
    .delete()
    .eq('id', invoiceId);

  if (orderError) throw orderError;
}

/**
 * Delete a payment record
 * This will also update the associated invoice balance
 */
export async function deletePayment(paymentId: string): Promise<void> {
  // Get payment details first
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('payment_id, invoice_id, amount')
    .eq('payment_id', paymentId)
    .single();

  if (fetchError) {
    // Try receipts table
    const { data: receipt, error: receiptFetchError } = await supabase
      .from('receipts')
      .select('receipt_id, billing_order_id, amount_paid')
      .eq('receipt_id', paymentId)
      .single();

    if (receiptFetchError) throw new Error('Payment/Receipt not found');

    // Delete from receipts and update billing_order
    if (receipt.billing_order_id) {
      // Get billing order to update paid/balance amounts
      const { data: order } = await supabase
        .from('billing_orders')
        .select('paid_amount, balance_amount, net_amount')
        .eq('id', receipt.billing_order_id)
        .single();

      if (order) {
        const newPaidAmount = Math.max(
          0,
          (order.paid_amount || 0) - receipt.amount_paid,
        );
        const newBalance = (order.net_amount || 0) - newPaidAmount;
        const newStatus =
          newPaidAmount <= 0
            ? 'Pending'
            : newBalance <= 0
              ? 'Paid'
              : 'Partially_Paid';

        await supabase
          .from('billing_orders')
          .update({
            paid_amount: newPaidAmount,
            balance_amount: newBalance,
            status: newStatus,
          })
          .eq('id', receipt.billing_order_id);
      }
    }

    const { error: deleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('receipt_id', paymentId);

    if (deleteError) throw deleteError;
    return;
  }

  // Update invoice balance before deleting payment
  if (payment.invoice_id) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('amount_paid, balance, total_amount')
      .eq('invoice_id', payment.invoice_id)
      .single();

    if (invoice) {
      const newAmountPaid = Math.max(
        0,
        (invoice.amount_paid || 0) - payment.amount,
      );
      const newBalance = (invoice.total_amount || 0) - newAmountPaid;
      const newStatus =
        newAmountPaid <= 0 ? 'Pending' : newBalance <= 0 ? 'Paid' : 'Partial';

      await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
        })
        .eq('invoice_id', payment.invoice_id);
    }
  }

  // Delete the payment
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('payment_id', paymentId);

  if (deleteError) throw deleteError;
}

/**
 * Delete multiple invoices
 */
export async function deleteMultipleInvoices(
  invoiceIds: string[],
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of invoiceIds) {
    try {
      await deleteInvoice(id, true);
      success++;
    } catch (error) {
      log.error(`Failed to delete invoice ${id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Delete multiple payments
 */
export async function deleteMultiplePayments(
  paymentIds: string[],
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of paymentIds) {
    try {
      await deletePayment(id);
      success++;
    } catch (error) {
      log.error(`Failed to delete payment ${id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

// =============================================================================
// Statistics API Functions
// =============================================================================

/**
 * Billing stats filter interface
 */
export interface BillingStatsFilters {
  dateFrom?: string; // YYYY-MM-DD format
  dateTo?: string; // YYYY-MM-DD format
}

/**
 * Get billing statistics - combines legacy invoices + unified billing_orders
 * Stats are filtered by date range if provided, otherwise defaults to today
 */
export async function getBillingStats(
  filters: BillingStatsFilters = {},
): Promise<BillingStats> {
  const today = new Date().toISOString().split('T')[0];

  // Use filter dates or default to today
  const dateFrom = filters.dateFrom || today;
  const dateTo = filters.dateTo || today;

  // For range queries, add 1 day to dateTo to include the full day
  const dateToInclusive = new Date(dateTo);
  dateToInclusive.setDate(dateToInclusive.getDate() + 1);
  const dateToQuery = dateToInclusive.toISOString().split('T')[0];

  // ==========================================================================
  // LEGACY INVOICES (for backward compatibility)
  // ==========================================================================

  // Total invoiced (all time) from legacy invoices
  const { data: invoiceTotalData } = await supabase
    .from('invoices')
    .select('total_amount')
    .neq('status', 'Cancelled');

  const legacyTotalInvoiced =
    invoiceTotalData?.reduce(
      (sum, inv) => sum + (Number(inv.total_amount) || 0),
      0,
    ) || 0;

  // Total collected from legacy invoices
  const { data: invoicePaidData } = await supabase
    .from('invoices')
    .select('amount_paid')
    .neq('status', 'Cancelled');

  const legacyTotalCollected =
    invoicePaidData?.reduce(
      (sum, inv) => sum + (Number(inv.amount_paid) || 0),
      0,
    ) || 0;

  // Outstanding from legacy invoices
  const { data: invoiceOutstandingData } = await supabase
    .from('invoices')
    .select('balance')
    .in('status', ['Pending', 'Partial']);

  const legacyOutstanding =
    invoiceOutstandingData?.reduce(
      (sum, inv) => sum + (Number(inv.balance) || 0),
      0,
    ) || 0;

  // Legacy invoices in date range
  const { count: legacyInvoicesInRange } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateFrom)
    .lt('created_at', dateToQuery);

  // Legacy invoices in date range - for calculating period totals
  const { data: legacyInvoicesInRangeData } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, balance')
    .gte('created_at', dateFrom)
    .lt('created_at', dateToQuery)
    .neq('status', 'Cancelled');

  const legacyInvoicedInRange =
    legacyInvoicesInRangeData?.reduce(
      (sum, inv) => sum + (Number(inv.total_amount) || 0),
      0,
    ) || 0;
  const legacyOutstandingInRange =
    legacyInvoicesInRangeData?.reduce(
      (sum, inv) => sum + (Number(inv.balance) || 0),
      0,
    ) || 0;

  // Legacy payments in date range
  const { data: legacyPaymentsInRange } = await supabase
    .from('payments')
    .select('amount')
    .gte('created_at', dateFrom)
    .lt('created_at', dateToQuery);

  const legacyPaymentsInRangeTotal =
    legacyPaymentsInRange?.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    ) || 0;

  // ==========================================================================
  // UNIFIED BILLING ORDERS (Lab, Radiology, Pharmacy, Consultation)
  // ==========================================================================

  const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'];

  // Total from billing_orders (all time - net_amount represents total billed)
  const { data: ordersTotalData } = await supabase
    .from('billing_orders')
    .select('net_amount')
    .neq('status', 'Cancelled');

  const ordersTotalInvoiced =
    ordersTotalData?.reduce(
      (sum, ord) => sum + (Number(ord.net_amount) || 0),
      0,
    ) || 0;

  // Total collected from billing_orders (paid_amount from paid orders)
  // Only count actual cash collected — NOT NHIS net_amount
  const { data: ordersPaidData } = await supabase
    .from('billing_orders')
    .select('paid_amount, net_amount, nhis_covered, patient_payable')
    .in('status', PAID_STATUSES);

  const ordersTotalCollected =
    ordersPaidData?.reduce((sum, ord) => {
      // For NHIS orders, only count what the patient actually paid
      if (ord.nhis_covered) {
        return sum + (Number(ord.patient_payable) || 0);
      }
      // For non-NHIS, use paid_amount (null-safe: 0 is a valid paid amount)
      const paidAmt = ord.paid_amount != null ? Number(ord.paid_amount) : Number(ord.net_amount) || 0;
      return sum + paidAmt;
    }, 0) || 0;

  // Outstanding from billing_orders (pending orders)
  // IMPORTANT: Exclude NHIS consultations where patient_payable = 0
  // These are fully covered by NHIS and should not appear as outstanding
  const { data: ordersOutstandingData } = await supabase
    .from('billing_orders')
    .select(
      'balance_amount, net_amount, patient_payable, source_module, nhis_covered',
    )
    .in('status', ['Pending', 'Awaiting_Payment', 'Partially_Paid']);

  // Filter out NHIS consultations with patient_payable = 0 from outstanding
  const ordersOutstanding =
    ordersOutstandingData?.reduce((sum, ord) => {
      // Skip NHIS consultations where patient pays nothing
      const isNhisConsultationFullyCovered =
        ord.nhis_covered === true &&
        ord.source_module === 'consultation' &&
        (Number(ord.patient_payable) || 0) === 0;

      if (isNhisConsultationFullyCovered) {
        return sum; // Don't add to outstanding
      }

      // For all other orders, use patient_payable if NHIS, otherwise balance_amount
      const outstandingAmount = ord.nhis_covered
        ? Number(ord.patient_payable) || 0
        : Number(ord.balance_amount) || Number(ord.net_amount) || 0;

      return sum + outstandingAmount;
    }, 0) || 0;

  // Billing orders created in date range
  const { count: ordersInRangeCount } = await supabase
    .from('billing_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', dateFrom)
    .lt('created_at', dateToQuery);

  // Billing orders in date range - for calculating period totals
  const { data: ordersInRangeData } = await supabase
    .from('billing_orders')
    .select(
      'net_amount, paid_amount, balance_amount, status, patient_payable, source_module, nhis_covered',
    )
    .gte('created_at', dateFrom)
    .lt('created_at', dateToQuery)
    .neq('status', 'Cancelled');

  const ordersInvoicedInRange =
    ordersInRangeData?.reduce(
      (sum, ord) => sum + (Number(ord.net_amount) || 0),
      0,
    ) || 0;

  // Filter out NHIS consultations with patient_payable = 0 from outstanding in range
  const ordersOutstandingInRange =
    ordersInRangeData
      ?.filter((ord) => !PAID_STATUSES.includes(ord.status))
      .reduce((sum, ord) => {
        // Skip NHIS consultations where patient pays nothing
        const isNhisConsultationFullyCovered =
          ord.nhis_covered === true &&
          ord.source_module === 'consultation' &&
          (Number(ord.patient_payable) || 0) === 0;

        if (isNhisConsultationFullyCovered) {
          return sum; // Don't add to outstanding
        }

        // For all other orders, use patient_payable if NHIS, otherwise balance_amount
        const outstandingAmount = ord.nhis_covered
          ? Number(ord.patient_payable) || 0
          : Number(ord.balance_amount) || Number(ord.net_amount) || 0;

        return sum + outstandingAmount;
      }, 0) || 0;

  // Billing orders paid in date range (from receipts or paid_amount updated in range)
  // Only count actual cash collected — NOT NHIS net_amount
  const { data: ordersPaidInRange } = await supabase
    .from('billing_orders')
    .select('paid_amount, net_amount, nhis_covered, patient_payable')
    .in('status', PAID_STATUSES)
    .gte('updated_at', dateFrom)
    .lt('updated_at', dateToQuery);

  const ordersPaidInRangeTotal =
    ordersPaidInRange?.reduce((sum, ord) => {
      // For NHIS orders, only count what the patient actually paid
      if (ord.nhis_covered) {
        return sum + (Number(ord.patient_payable) || 0);
      }
      // For non-NHIS, use paid_amount (null-safe: 0 is a valid paid amount)
      const paidAmt = ord.paid_amount != null ? Number(ord.paid_amount) : Number(ord.net_amount) || 0;
      return sum + paidAmt;
    }, 0) || 0;

  // Also get receipts created in date range (for billing_orders)
  // Exclude NHIS receipts — those aren't cash collected at the counter
  const { data: receiptsInRangeData } = await supabase
    .from('receipts')
    .select('amount_paid, payment_method')
    .gte('created_at', dateFrom)
    .lt('created_at', dateToQuery)
    .neq('payment_method', 'NHIS');

  const receiptsInRangeTotal =
    receiptsInRangeData?.reduce(
      (sum, r) => sum + (Number(r.amount_paid) || 0),
      0,
    ) || 0;

  // ==========================================================================
  // COMBINED TOTALS
  // ==========================================================================

  // Combine legacy + billing orders (avoiding double counting by using max of receipts vs orders paid in range)
  const totalInvoiced = legacyTotalInvoiced + ordersTotalInvoiced;
  const totalCollected = legacyTotalCollected + ordersTotalCollected;
  const outstanding = legacyOutstanding + ordersOutstanding;
  const invoicesInRange =
    (legacyInvoicesInRange || 0) + (ordersInRangeCount || 0);

  // Period figures (based on filter date range)
  const invoicedInRange = legacyInvoicedInRange + ordersInvoicedInRange;
  const outstandingInRange =
    legacyOutstandingInRange + ordersOutstandingInRange;

  // For payments in range, use the higher of legacy payments + order payments or receipts total
  // This handles the case where receipts might have invoice_id (legacy) or billing_order_id (new)
  const paymentsInRange = Math.max(
    legacyPaymentsInRangeTotal + ordersPaidInRangeTotal,
    receiptsInRangeTotal,
  );

  // Overdue invoices (legacy only - billing_orders don't have due_date)
  const { count: overdue } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Pending', 'Partial'])
    .lt('due_date', today);

  return {
    total_invoiced: totalInvoiced,
    total_collected: totalCollected,
    outstanding,
    outstanding_today: outstandingInRange,
    invoices_today: invoicesInRange,
    payments_today: paymentsInRange,
    invoiced_today: invoicedInRange,
    overdue_invoices: overdue || 0,
  };
}
