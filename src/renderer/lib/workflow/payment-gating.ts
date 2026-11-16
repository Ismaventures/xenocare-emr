// =============================================================================
// Payment Gating - Service Execution Control
// =============================================================================
// This module enforces payment verification before services can be executed.
// Lab, Radiology, and Pharmacy modules must verify payment before processing.
// Now checks the billing_orders table as the source of truth.
// =============================================================================

import { supabase } from '../../api/supabaseClient';
import { createScopedLogger } from '../../utils/logger';
import { isNhisFeatureEnabled } from '../../config/features';

const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'];
const log = createScopedLogger('PaymentGating');

function isPaidStatus(status?: string | null): boolean {
  if (!status) return false;
  return PAID_STATUSES.includes(status);
}

export type ServiceType = 'Lab' | 'Radiology' | 'Pharmacy';

export interface PaymentGatingResult {
  canProceed: boolean;
  reason?: string;
  requiresPayment: boolean;
  billingOrderId?: string;
  billingOrderStatus?: string;
  invoiceId?: string;
  invoiceStatus?: string;
  paymentCategory?: string;
  amountDue?: number;
  amountPaid?: number;
}

// =============================================================================
// Helper: Look up billing order via billing_items
// =============================================================================
// The billing_orders table does NOT have source_record_id.
// The relationship is: billing_items.item_id or billing_items.service_reference_id -> prescription_id/request_id
// billing_items.billing_order_id -> billing_orders.id
// =============================================================================

interface BillingOrderLookupResult {
  order: {
    id: string;
    status: string | null;
    net_amount: number | null;
    paid_amount: number | null;
    balance_amount: number | null;
    visit_id: string | null;
    patient_id: string | null;
    receipt_number?: string;
  } | null;
  error?: string;
}

async function lookupBillingOrderByServiceRecord(
  serviceRecordId: string,
  sourceModule: string,
): Promise<BillingOrderLookupResult> {
  // First, find the billing item that references this service record
  const { data: billingItem, error: itemError } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .or(
      `item_id.eq.${serviceRecordId},service_reference_id.eq.${serviceRecordId}`,
    )
    .maybeSingle();

  if (itemError) {
    log.error('Failed to look up billing item', itemError, {
      sourceModule,
      hasServiceRecordId: Boolean(serviceRecordId),
    });
    return { order: null, error: itemError.message };
  }

  if (!billingItem?.billing_order_id) {
    return { order: null };
  }

  // Now get the billing order with the matching source_module
  const { data: billingOrder, error: orderError } = await supabase
    .from('billing_orders')
    .select(
      'id, status, net_amount, paid_amount, balance_amount, visit_id, patient_id',
    )
    .eq('id', billingItem.billing_order_id)
    .eq('source_module', sourceModule)
    .maybeSingle();

  if (orderError) {
    log.error('Failed to look up billing order', orderError, {
      sourceModule,
      hasServiceRecordId: Boolean(serviceRecordId),
    });
    return { order: null, error: orderError.message };
  }

  if (!billingOrder) {
    return { order: null };
  }

  // Try to get receipt number if order is paid
  let receiptNumber: string | undefined;
  if (isPaidStatus(billingOrder.status)) {
    const { data: receipt } = await supabase
      .from('receipts')
      .select('receipt_number')
      .eq('billing_order_id', billingOrder.id)
      .maybeSingle();
    receiptNumber = receipt?.receipt_number;
  }

  return {
    order: {
      ...billingOrder,
      receipt_number: receiptNumber,
    },
  };
}

// =============================================================================
// Check if service can proceed based on billing order payment status
// =============================================================================

/**
 * Verifies if a service request can proceed based on billing order payment status.
 *
 * Rules:
 * - NHIS and Retainership patients can proceed without upfront payment
 * - Cash and POS patients must have their billing order verified as Paid
 * - Checks billing_orders table first, then falls back to invoices
 */
export async function checkServicePaymentStatus(
  visitId: string,
  serviceType: ServiceType,
  serviceRequestId?: string,
): Promise<PaymentGatingResult> {
  // UUID regex to determine if visitId is UUID or VARCHAR
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Map service type to source module
  const sourceModuleMap: Record<ServiceType, string> = {
    Lab: 'lab',
    Radiology: 'radiology',
    Pharmacy: 'pharmacy',
  };
  const sourceModule = sourceModuleMap[serviceType];

  // ==========================================================================
  // IF NO VISIT ID, CHECK BY SERVICE REQUEST ID DIRECTLY
  // ==========================================================================
  if (!visitId && serviceRequestId) {
    log.debug('No visit ID provided; checking payment by service request', {
      serviceType,
      hasServiceRequestId: true,
    });

    const { order: billingOrder } = await lookupBillingOrderByServiceRecord(
      serviceRequestId,
      sourceModule,
    );

    if (billingOrder) {
      const status = billingOrder.status as string | null;
      const statusLabel = status || 'Pending';
      const isPaid = isPaidStatus(status);
      log.info('Resolved payment status via billing order lookup', {
        path: 'billing_order_by_service_id',
        serviceType,
        status: statusLabel,
      });

      return {
        canProceed: isPaid,
        requiresPayment: !isPaid,
        billingOrderId: billingOrder.id,
        billingOrderStatus: statusLabel,
        amountDue:
          billingOrder.net_amount ?? billingOrder.balance_amount ?? undefined,
        amountPaid: billingOrder.paid_amount ?? undefined,
        reason: isPaid
          ? billingOrder.receipt_number
            ? `Payment verified (Receipt: ${billingOrder.receipt_number})`
            : 'Payment verified'
          : `Payment required - Billing order ${statusLabel}`,
      };
    }

    // No billing order found - allow to proceed (might be legacy record)
    log.info(
      'No billing order found for service request; treating as legacy record',
      {
        path: 'legacy_no_billing_order',
        serviceType,
      },
    );
    return {
      canProceed: true,
      requiresPayment: false,
      reason: 'No billing order found - legacy record',
    };
  }

  const isUuid = UUID_REGEX.test(visitId);

  // Get visit with payment category - try appropriate column based on ID format
  let visit: any = null;
  let visitError: any = null;

  if (isUuid) {
    // Try by UUID (id column) first
    const { data, error } = await supabase
      .from('visits')
      .select(
        'id, visit_id, patient_id, payment_category, insurance_type, status',
      )
      .eq('id', visitId)
      .maybeSingle();

    if (data) {
      visit = data;
    } else {
      // Fallback to visit_id column
      const { data: visitByVisitId, error: visitByVisitIdError } =
        await supabase
          .from('visits')
          .select(
            'id, visit_id, patient_id, payment_category, insurance_type, status',
          )
          .eq('visit_id', visitId)
          .maybeSingle();
      visit = visitByVisitId;
      visitError = visitByVisitIdError;
    }
  } else {
    // Search by visit_id (VARCHAR like "V-00001")
    const { data, error } = await supabase
      .from('visits')
      .select(
        'id, visit_id, patient_id, payment_category, insurance_type, status',
      )
      .eq('visit_id', visitId)
      .maybeSingle();
    visit = data;
    visitError = error;
  }

  if (visitError || !visit) {
    log.error('Visit not found during payment gating', visitError, {
      serviceType,
      hasVisitId: Boolean(visitId),
      visitIdFormat: isUuid ? 'uuid' : 'external',
    });
    return {
      canProceed: false,
      reason: 'Visit not found',
      requiresPayment: false,
    };
  }

  const paymentCategory = visit.payment_category;
  const insuranceType = visit.insurance_type;

  // Check if patient is NHIS using both payment_category and insurance_type
  // DHML = Defence Health Maintenance Limited — default HMO for Military NHIS, NOT a separate category
  const normalizedInsurance = (insuranceType || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  const isNhisPatient =
    isNhisFeatureEnabled() &&
    (paymentCategory === 'NHIS' ||
      normalizedInsurance.includes('nhis') ||
      normalizedInsurance === 'dhml' ||
      normalizedInsurance === 'gifship');

  // NHIS and Retainership patients can proceed without upfront payment
  if (isNhisPatient || paymentCategory === 'Retainership') {
    log.info('Payment gate bypassed for deferred-payment category', {
      path: 'nhis_or_retainership',
      category: isNhisPatient ? 'NHIS' : paymentCategory,
      serviceType,
    });
    return {
      canProceed: true,
      requiresPayment: false,
      paymentCategory: isNhisPatient ? 'NHIS' : paymentCategory,
      reason: `${isNhisPatient ? 'NHIS' : paymentCategory} patient - payment deferred`,
    };
  }

  // ==========================================================================
  // CHECK BILLING ORDERS TABLE (New Central Billing System)
  // ==========================================================================

  // Check for billing order for this specific service request
  if (serviceRequestId) {
    const { order: billingOrder } = await lookupBillingOrderByServiceRecord(
      serviceRequestId,
      sourceModule,
    );

    if (billingOrder) {
      const status = billingOrder.status as string | null;
      const statusLabel = status || 'Pending';
      const isPaid = isPaidStatus(status);
      log.info('Resolved payment status via billing order', {
        path: 'billing_order',
        serviceType,
        status: statusLabel,
      });

      return {
        canProceed: isPaid,
        requiresPayment: !isPaid,
        billingOrderId: billingOrder.id,
        billingOrderStatus: statusLabel,
        paymentCategory,
        amountDue:
          billingOrder.net_amount ?? billingOrder.balance_amount ?? undefined,
        amountPaid: billingOrder.paid_amount ?? undefined,
        reason: isPaid
          ? billingOrder.receipt_number
            ? `Payment verified (Receipt: ${billingOrder.receipt_number})`
            : 'Payment verified'
          : `Payment required - Billing order ${statusLabel}`,
      };
    }
  }

  // Check if there are ANY unpaid billing orders for this visit
  const { data: pendingOrders } = await supabase
    .from('billing_orders')
    .select('id, status, net_amount')
    .eq('visit_id', visitId)
    .eq('status', 'Pending');

  if (pendingOrders && pendingOrders.length > 0) {
    const totalPending = pendingOrders.reduce(
      (sum, o) => sum + (o.net_amount || 0),
      0,
    );
    return {
      canProceed: false,
      requiresPayment: true,
      paymentCategory,
      amountDue: totalPending,
      reason: `${pendingOrders.length} pending billing order(s) - payment required`,
    };
  }

  // Check if visit has at least one verified billing order (consultation fee paid)
  const { data: paidOrders } = await supabase
    .from('billing_orders')
    .select('id, status, receipts(receipt_number)')
    .eq('visit_id', visitId)
    .in('status', PAID_STATUSES)
    .limit(1);

  if (paidOrders && paidOrders.length > 0) {
    const receiptNumber = paidOrders[0].receipts?.[0]?.receipt_number;
    return {
      canProceed: true,
      requiresPayment: false,
      billingOrderId: paidOrders[0].id,
      billingOrderStatus: paidOrders[0].status,
      paymentCategory,
      reason: receiptNumber
        ? `Payment verified (Receipt: ${receiptNumber})`
        : 'Visit payment verified',
    };
  }

  // ==========================================================================
  // FALLBACK: Check legacy invoice system
  // ==========================================================================

  // For Cash/POS patients, check if there's a paid invoice for this service
  // First, check if there's an invoice item for this specific request
  if (serviceRequestId) {
    const { data: invoiceItem } = await supabase
      .from('invoice_items')
      .select(
        `
        item_id,
        invoice:invoices(invoice_id, status, total_amount, amount_paid, balance)
      `,
      )
      .eq('reference_id', serviceRequestId)
      .eq('reference_type', serviceType)
      .maybeSingle();

    if (invoiceItem?.invoice) {
      const invoice = invoiceItem.invoice as any;
      const isPaid = invoice.status === 'Paid' || invoice.status === 'Partial';

      return {
        canProceed: isPaid,
        requiresPayment: !isPaid,
        invoiceId: invoice.invoice_id,
        invoiceStatus: invoice.status,
        paymentCategory,
        amountDue: invoice.total_amount,
        amountPaid: invoice.amount_paid,
        reason: isPaid
          ? 'Payment verified (legacy invoice)'
          : `Payment required - Invoice ${invoice.status}`,
      };
    }
  }

  // Check if there's a general visit-level invoice that's been paid
  const { data: visitInvoices } = await supabase
    .from('invoices')
    .select('invoice_id, status, total_amount, amount_paid, balance')
    .eq('patient_id', visit.patient_id)
    .in('status', ['Paid', 'Partial'])
    .order('created_at', { ascending: false })
    .limit(1);

  // If there's a paid invoice for this patient recently, allow proceeding
  // This handles cases where payment was made upfront at registration
  if (visitInvoices && visitInvoices.length > 0) {
    const invoice = visitInvoices[0];
    log.info('Resolved payment status via invoice items', {
      path: 'invoice_items',
      serviceType,
      status: invoice.status,
    });
    return {
      canProceed: true,
      requiresPayment: false,
      invoiceId: invoice.invoice_id,
      invoiceStatus: invoice.status,
      paymentCategory,
      amountDue: invoice.total_amount,
      amountPaid: invoice.amount_paid,
      reason: 'Prior payment found (legacy invoice)',
    };
  }

  // No payment found - service requires payment
  return {
    canProceed: false,
    requiresPayment: true,
    paymentCategory,
    reason: 'Payment required before service can be processed',
  };
}

// =============================================================================
// Check payment for Lab Request
// =============================================================================

export async function checkLabPaymentStatus(
  requestId: string,
): Promise<PaymentGatingResult> {
  // First, check the billing_orders table via billing_items for this request
  const { order: billingOrder } = await lookupBillingOrderByServiceRecord(
    requestId,
    'lab',
  );

  if (billingOrder) {
    const status = billingOrder.status as string | null;
    const statusLabel = status || 'Pending';
    const isPaid = isPaidStatus(status);

    // Get payment category from visit if available
    let paymentCategory = 'Cash';
    if (billingOrder.visit_id) {
      const { data: visit } = await supabase
        .from('visits')
        .select('payment_category')
        .eq('visit_id', billingOrder.visit_id)
        .single();
      paymentCategory = visit?.payment_category || 'Cash';
    }

    return {
      canProceed: isPaid,
      requiresPayment: !isPaid,
      billingOrderId: billingOrder.id,
      billingOrderStatus: statusLabel,
      paymentCategory,
      amountDue:
        billingOrder.net_amount ?? billingOrder.balance_amount ?? undefined,
      amountPaid: billingOrder.paid_amount ?? undefined,
      reason: isPaid
        ? billingOrder.receipt_number
          ? `Payment verified (Receipt: ${billingOrder.receipt_number})`
          : 'Payment verified'
        : `Payment required - Status: ${statusLabel}`,
    };
  }

  // If no billing order found, check the lab request
  const { data: request, error } = await supabase
    .from('lab_requests')
    .select('request_id, visit_id, patient_id, test:lab_test_catalogue(price)')
    .eq('request_id', requestId)
    .single();

  if (error || !request) {
    return {
      canProceed: false,
      reason: 'Lab request not found',
      requiresPayment: false,
    };
  }

  // No billing order exists - this shouldn't happen if doctor created order properly
  return {
    canProceed: false,
    requiresPayment: true,
    paymentCategory: 'Cash',
    reason: 'No billing order found for this request. Please contact billing.',
  };
}

// =============================================================================
// Check payment for Radiology Request
// =============================================================================

export async function checkRadiologyPaymentStatus(
  requestId: string,
): Promise<PaymentGatingResult> {
  // First, check the billing_orders table via billing_items for this request
  const { order: billingOrder } = await lookupBillingOrderByServiceRecord(
    requestId,
    'radiology',
  );

  if (billingOrder) {
    const status = billingOrder.status as string | null;
    const statusLabel = status || 'Pending';
    const isPaid = isPaidStatus(status);

    // Get payment category from visit if available
    let paymentCategory = 'Cash';
    if (billingOrder.visit_id) {
      const { data: visit } = await supabase
        .from('visits')
        .select('payment_category')
        .eq('visit_id', billingOrder.visit_id)
        .single();
      paymentCategory = visit?.payment_category || 'Cash';
    }

    return {
      canProceed: isPaid,
      requiresPayment: !isPaid,
      billingOrderId: billingOrder.id,
      billingOrderStatus: statusLabel,
      paymentCategory,
      amountDue:
        billingOrder.net_amount ?? billingOrder.balance_amount ?? undefined,
      amountPaid: billingOrder.paid_amount ?? undefined,
      reason: isPaid
        ? billingOrder.receipt_number
          ? `Payment verified (Receipt: ${billingOrder.receipt_number})`
          : 'Payment verified'
        : `Payment required - Status: ${statusLabel}`,
    };
  }

  // If no billing order found, check the radiology request
  const { data: request, error } = await supabase
    .from('radiology_requests')
    .select(
      'request_id, visit_id, patient_id, imaging:imaging_catalogue(price)',
    )
    .eq('request_id', requestId)
    .single();

  if (error || !request) {
    return {
      canProceed: false,
      reason: 'Radiology request not found',
      requiresPayment: false,
    };
  }

  // No billing order exists - this shouldn't happen if doctor created order properly
  // Return that payment is required
  return {
    canProceed: false,
    requiresPayment: true,
    paymentCategory: 'Cash',
    reason: 'No billing order found for this request. Please contact billing.',
  };
}

// =============================================================================
// Check payment for Prescription
// =============================================================================

export async function checkPharmacyPaymentStatus(
  prescriptionId: string,
): Promise<PaymentGatingResult> {
  // First, check the billing_orders table via billing_items for this prescription
  const { order: billingOrder } = await lookupBillingOrderByServiceRecord(
    prescriptionId,
    'pharmacy',
  );

  if (billingOrder) {
    const status = billingOrder.status as string | null;
    const statusLabel = status || 'Pending';
    const isPaid = isPaidStatus(status);

    // Get payment category from visit if available
    let paymentCategory = 'Cash';
    if (billingOrder.visit_id) {
      const { data: visit } = await supabase
        .from('visits')
        .select('payment_category')
        .eq('visit_id', billingOrder.visit_id)
        .single();
      paymentCategory = visit?.payment_category || 'Cash';
    }

    return {
      canProceed: isPaid,
      requiresPayment: !isPaid,
      billingOrderId: billingOrder.id,
      billingOrderStatus: statusLabel,
      paymentCategory,
      amountDue:
        billingOrder.net_amount ?? billingOrder.balance_amount ?? undefined,
      amountPaid: billingOrder.paid_amount ?? undefined,
      reason: isPaid
        ? billingOrder.receipt_number
          ? `Payment verified (Receipt: ${billingOrder.receipt_number})`
          : 'Payment verified'
        : `Payment required - Status: ${statusLabel}`,
    };
  }

  // If no billing order found, check the prescription
  const { data: prescription, error } = await supabase
    .from('prescriptions')
    .select(
      'prescription_id, visit_id, patient_id, drug:drug_catalogue(selling_price)',
    )
    .eq('prescription_id', prescriptionId)
    .single();

  if (error || !prescription) {
    return {
      canProceed: false,
      reason: 'Prescription not found',
      requiresPayment: false,
    };
  }

  // No billing order exists - this shouldn't happen if doctor created order properly
  return {
    canProceed: false,
    requiresPayment: true,
    paymentCategory: 'Cash',
    reason:
      'No billing order found for this prescription. Please contact billing.',
  };
}

// =============================================================================
// Create Billing Invoice for Service Orders
// =============================================================================

/**
 * Creates an invoice for service orders (lab tests, radiology, prescriptions)
 * Called when doctor orders tests/prescriptions during consultation
 */
export async function createServiceInvoice(
  patientId: string,
  visitId: string,
  items: Array<{
    description: string;
    category: 'Laboratory' | 'Radiology' | 'Pharmacy' | 'Consultation';
    quantity: number;
    unitPrice: number;
    referenceId: string;
    referenceType: string;
  }>,
): Promise<string> {
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
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const totalAmount = subtotal; // No tax for now

  // Generate invoice number
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoiceNumber = `INV-${timestamp}-${random}`;

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      patient_id: patientId,
      encounter_id: visitId || null, // Link invoice to encounter for NHIS claims tracking
      subtotal,
      discount_total: 0,
      tax_amount: 0,
      total_amount: totalAmount,
      amount_paid: 0,
      balance: totalAmount,
      status: 'Pending',
      created_by: staffData?.staff_id,
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items
  const invoiceItems = items.map((item) => ({
    invoice_id: invoice.invoice_id,
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    discount_percent: 0,
    discount_amount: 0,
    total: item.quantity * item.unitPrice,
    reference_id: item.referenceId,
    reference_type: item.referenceType,
  }));

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) throw itemsError;

  return invoice.invoice_id;
}

// =============================================================================
// Get Visit Invoice Summary
// =============================================================================

export interface VisitInvoiceSummary {
  visitId: string;
  patientId: string;
  paymentCategory: string;
  totalCharges: number;
  totalPaid: number;
  balance: number;
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    status: string;
    amount: number;
    paid: number;
  }>;
  pendingServices: {
    lab: number;
    radiology: number;
    pharmacy: number;
  };
}

export async function getVisitInvoiceSummary(
  visitId: string,
): Promise<VisitInvoiceSummary | null> {
  // Get visit
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .select('visit_id, patient_id, payment_category')
    .eq('visit_id', visitId)
    .single();

  if (visitError || !visit) return null;

  // Get invoices for this visit's patient
  const { data: invoices } = await supabase
    .from('invoices')
    .select('invoice_id, invoice_number, status, total_amount, amount_paid')
    .eq('patient_id', visit.patient_id)
    .neq('status', 'Cancelled')
    .order('created_at', { ascending: false });

  // Get pending service counts
  const { count: pendingLab } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('visit_id', visitId)
    .in('status', ['Pending', 'Sample Collected', 'In Progress']);

  const { count: pendingRadiology } = await supabase
    .from('radiology_requests')
    .select('*', { count: 'exact', head: true })
    .eq('visit_id', visitId)
    .in('status', ['Pending', 'Scheduled', 'In Progress']);

  const { count: pendingPharmacy } = await supabase
    .from('prescriptions')
    .select('*', { count: 'exact', head: true })
    .eq('visit_id', visitId)
    .eq('status', 'Pending');

  const invoiceList = (invoices || []).map((inv) => ({
    invoiceId: inv.invoice_id,
    invoiceNumber: inv.invoice_number,
    status: inv.status,
    amount: inv.total_amount,
    paid: inv.amount_paid,
  }));

  const totalCharges = invoiceList.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoiceList.reduce((sum, inv) => sum + inv.paid, 0);

  return {
    visitId: visit.visit_id,
    patientId: visit.patient_id,
    paymentCategory: visit.payment_category,
    totalCharges,
    totalPaid,
    balance: totalCharges - totalPaid,
    invoices: invoiceList,
    pendingServices: {
      lab: pendingLab || 0,
      radiology: pendingRadiology || 0,
      pharmacy: pendingPharmacy || 0,
    },
  };
}
