// =============================================================================
// Verify Payment Modal
// Modal for billing officers to verify payments and issue receipts
// =============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle,
  CreditCard,
  Banknote,
  Building,
  Users,
  Receipt,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button, Textarea } from '../../../components/ui/FormElements';
import { useBatchVerifyPayments } from '../hooks/useBillingOrders';
import {
  BillingOrderDTO,
  formatCurrency,
  getSourceModuleLabel,
  getSourceModuleColor,
  calculateNHISAmounts,
  getNHISPercentage,
  isNhisPaymentCategory,
} from '../dtos/billing-order.dto';

interface VerifyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: BillingOrderDTO[];
  patientName: string;
  paymentCategory: string;
  /** Callback when payment verification is successful - receives verified orders for receipt display */
  onVerificationSuccess?: (verifiedOrders: BillingOrderDTO[]) => void;
}

type PaymentMethodOption = 'Cash' | 'POS' | 'NHIS' | 'Retainership';

const PAYMENT_METHODS: {
  value: PaymentMethodOption;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: 'Cash',
    label: 'Cash Payment',
    icon: <Banknote className="h-5 w-5" />,
    description: 'Patient pays with cash',
  },
  {
    value: 'POS',
    label: 'POS / Card',
    icon: <CreditCard className="h-5 w-5" />,
    description: 'Card payment via POS terminal',
  },
  {
    value: 'NHIS',
    label: 'NHIS Coverage',
    icon: <Building className="h-5 w-5" />,
    description: 'Covered by National Health Insurance',
  },
  {
    value: 'Retainership',
    label: 'Retainership / Corporate',
    icon: <Users className="h-5 w-5" />,
    description: 'Covered by corporate arrangement',
  },
];

export function VerifyPaymentModal({
  isOpen,
  onClose,
  orders,
  patientName,
  paymentCategory,
  onVerificationSuccess,
}: VerifyPaymentModalProps) {
  // Debug: Log the payment category received
  console.log(
    '[VerifyPaymentModal] Payment category received:',
    paymentCategory,
  );

  // Check if patient is registered as NHIS (includes DHML which is Military NHIS)
  const isNhisPatient = isNhisPaymentCategory(paymentCategory);
  console.log('[VerifyPaymentModal] isNhisPatient:', isNhisPatient);

  // Payment method state - auto-select NHIS for NHIS patients
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodOption | null>(isNhisPatient ? 'NHIS' : null);
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptNumbers, setReceiptNumbers] = useState<string[]>([]);

  // Reset selectedMethod when payment category changes (different patient selected)
  useEffect(() => {
    console.log(
      '[VerifyPaymentModal] useEffect triggered, paymentCategory:',
      paymentCategory,
      'isNhisPatient:',
      isNhisPatient,
    );
    if (isNhisPatient) {
      setSelectedMethod('NHIS');
    } else {
      setSelectedMethod(null);
    }
    setNotes('');
  }, [paymentCategory, isNhisPatient]);

  const batchVerify = useBatchVerifyPayments();

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.payment_status === 'Pending' ||
          o.payment_status === 'Awaiting_Payment',
      ),
    [orders],
  );

  // For NHIS patients, always use NHIS calculation regardless of selected method
  const effectivePaymentMethod = isNhisPatient
    ? 'NHIS'
    : selectedMethod || 'Cash';
  const isNhisPayment = effectivePaymentMethod === 'NHIS' || isNhisPatient;
  const isRetainerPayment = selectedMethod === 'Retainership';
  const effectivePaymentCategory = isNhisPatient
    ? paymentCategory
    : selectedMethod || 'Cash';

  // Calculate totals using PRE-CALCULATED values from billing orders (which include NHIS prices from service catalogues)
  // For NHIS patients, use the stored nhis_payable and patient_payable values
  // These values are calculated at order creation using NHIS prices from service catalogues
  const {
    totalGross,
    totalNhisPayable,
    totalPatientPayable,
    avgNhisPercentage,
  } = useMemo(() => {
    let gross = 0;
    let nhisPayable = 0;
    let patientPayable = 0;
    let totalPercentage = 0;
    let nhisOrderCount = 0;

    for (const order of pendingOrders) {
      const amount = order.gross_amount || order.amount_due;
      gross += amount;

      // Use stored NHIS values from billing order (pre-calculated with NHIS prices)
      if (isNhisPayment && order.nhis_covered) {
        // Use pre-calculated values from billing order - these use NHIS prices from catalogues
        nhisPayable += order.nhis_payable || 0;
        patientPayable += order.patient_payable ?? amount;
        if (order.nhis_percentage && order.nhis_percentage > 0) {
          totalPercentage += order.nhis_percentage;
          nhisOrderCount++;
        }
      } else if (isNhisPayment) {
        // Fallback: recalculate for orders not marked as NHIS covered
        const nhisCalc = calculateNHISAmounts(
          amount,
          effectivePaymentCategory,
          (order.service_type as any) || 'Other',
        );
        nhisPayable += nhisCalc.nhisPayable;
        patientPayable += nhisCalc.patientPayable;
        if (nhisCalc.nhisPercentage > 0) {
          totalPercentage += nhisCalc.nhisPercentage;
          nhisOrderCount++;
        }
      } else {
        // Non-NHIS: patient pays full amount
        patientPayable += amount;
      }
    }

    // Calculate average NHIS percentage for display
    const avgPercentage =
      nhisOrderCount > 0 ? Math.round(totalPercentage / nhisOrderCount) : 0;

    return {
      totalGross: gross,
      totalNhisPayable: nhisPayable,
      totalPatientPayable: patientPayable,
      avgNhisPercentage: avgPercentage,
    };
  }, [pendingOrders, effectivePaymentCategory, isNhisPayment]);

  // Use average percentage or fall back to general category percentage
  const nhisPercentage =
    avgNhisPercentage > 0
      ? avgNhisPercentage
      : getNHISPercentage(effectivePaymentCategory);

  const totalAmount = useMemo(
    () => pendingOrders.reduce((sum, o) => sum + o.amount_due, 0),
    [pendingOrders],
  );

  const handleVerify = async () => {
    // For NHIS patients, use NHIS as payment method even if not explicitly selected
    const paymentMethod = isNhisPatient ? 'NHIS' : selectedMethod;
    if (!paymentMethod || pendingOrders.length === 0) return;

    const billingIds = pendingOrders
      .map((o) => o.billing_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    let finalNotes = notes;
    if (isNhisPatient && totalPatientPayable === 0) {
      finalNotes =
        `NHIS Full Coverage - Consultation Fee Waived. ${finalNotes}`.trim();
    }

    // Close modal INSTANTLY - optimistic update will handle UI
    onClose();

    // Fire mutation in background (optimistic update already updated the queue)
    batchVerify.mutate(
      {
        billing_ids: billingIds,
        payment_method: paymentMethod,
        notes: finalNotes,
      },
      {
        onSuccess: (verifiedOrders) => {
          // Trigger auto-receipt popup callback with verified orders
          if (
            onVerificationSuccess &&
            verifiedOrders &&
            verifiedOrders.length > 0
          ) {
            onVerificationSuccess(verifiedOrders);
          }
        },
        onError: (error) => {
          console.error('Payment verification failed:', error);
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      {showSuccess ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Payment Verified
          </h3>
          <p className="text-gray-500 mb-6">
            {receiptNumbers.length} receipt(s) generated successfully
          </p>
          {receiptNumbers.length > 0 && (
            <div className="inline-flex flex-col gap-1 bg-gray-50 rounded-lg px-5 py-3 border border-gray-200">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Receipt Number(s)
              </span>
              {receiptNumbers.map((rn) => (
                <span
                  key={rn}
                  className="font-mono font-bold text-emerald-700 text-lg"
                >
                  {rn}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Modal Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <Receipt className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                Verify Payment
              </h3>
              <p className="text-sm text-gray-500">
                Review and confirm billing items
              </p>
            </div>
            {isNhisPatient && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                <Building className="h-3.5 w-3.5" />
                NHIS Enrollee
              </span>
            )}
          </div>

          {/* Patient Card */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
              {patientName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">
                {patientName}
              </h4>
              <p className="text-sm text-gray-500">
                {paymentCategory}
                {isNhisPatient && totalPatientPayable === 0 && (
                  <span className="ml-2 text-emerald-600 font-medium">
                    • Fully Covered
                  </span>
                )}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500 mb-0.5">
                {isNhisPayment ? 'Patient Pays' : 'Amount Due'}
              </p>
              <p
                className={`text-xl font-bold ${
                  isNhisPayment && totalPatientPayable === 0
                    ? 'text-emerald-600'
                    : 'text-gray-900'
                }`}
              >
                {formatCurrency(
                  isNhisPayment ? totalPatientPayable : totalAmount,
                )}
              </p>
            </div>
          </div>

          {/* Payment Method Selection */}
          {isNhisPatient ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <Building className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">
                Payment method auto-set to{' '}
                <span className="font-semibold">NHIS</span>.
                {totalPatientPayable === 0
                  ? ' No payment required from patient.'
                  : ` Co-payment: ${formatCurrency(totalPatientPayable)}.`}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedMethod(method.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedMethod === method.value
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg ${
                        selectedMethod === method.value
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {method.icon}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {method.label}
                      </span>
                      <p className="text-xs text-gray-500 leading-tight">
                        {method.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {!selectedMethod && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Select a payment method to proceed
                </p>
              )}
            </div>
          )}

          {/* Billing Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Billing Items (
                {pendingOrders.reduce(
                  (count, o) => count + (o.items?.length || 1),
                  0,
                )}
                )
              </span>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      {isNhisPayment && (
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Coverage
                        </th>
                      )}
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingOrders.flatMap((order, orderIndex) => {
                      // Service name header row for each billing order (consultation service name)
                      const orderServiceName =
                        order.service_description ||
                        order.items?.[0]?.service_name ||
                        order.items?.[0]?.item_name ||
                        '';
                      const headerRow = (
                        <tr
                          key={`order-header-${order.id || order.billing_id || orderIndex}`}
                          className="bg-blue-50/60"
                        >
                          <td
                            colSpan={isNhisPayment ? 3 : 2}
                            className="px-4 py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getSourceModuleColor(order.source_module ?? 'consultation')}`}
                              >
                                {getSourceModuleLabel(
                                  order.source_module ?? 'consultation',
                                )}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {orderServiceName || 'Service'}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {order.order_number}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );

                      const itemRows =
                        order.items && order.items.length > 0
                          ? order.items.map((billingItem) => {
                              const itemGross =
                                billingItem.gross_amount ||
                                billingItem.total_price;
                              const itemNhisPayable =
                                isNhisPayment && billingItem.nhis_covered
                                  ? billingItem.nhis_payable || 0
                                  : 0;
                              const itemPatientPayable =
                                isNhisPayment && billingItem.nhis_covered
                                  ? (billingItem.patient_payable ?? itemGross)
                                  : itemGross;
                              const itemNhisPercentage =
                                billingItem.nhis_percentage || 0;
                              return (
                                <tr
                                  key={billingItem.id}
                                  className="hover:bg-gray-50/50"
                                >
                                  <td className="px-4 py-2.5 pl-8">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-medium text-gray-800">
                                        {billingItem.service_name ||
                                          billingItem.item_name ||
                                          order.service_description}
                                      </span>
                                      {/* Service fee details for billing admin verification */}
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>
                                          Fee: {formatCurrency(itemGross)}
                                        </span>
                                        {isNhisPayment &&
                                          billingItem.nhis_covered && (
                                            <>
                                              <span className="text-emerald-600">
                                                NHIS:{' '}
                                                {formatCurrency(
                                                  itemNhisPayable,
                                                )}
                                              </span>
                                              <span className="text-amber-600">
                                                Patient:{' '}
                                                {formatCurrency(
                                                  itemPatientPayable,
                                                )}
                                              </span>
                                            </>
                                          )}
                                      </div>
                                    </div>
                                  </td>
                                  {isNhisPayment && (
                                    <td className="px-3 py-2.5 text-center">
                                      {billingItem.nhis_covered ? (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                                          {itemNhisPercentage > 0
                                            ? `${itemNhisPercentage}%`
                                            : '100%'}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          N/A
                                        </span>
                                      )}
                                    </td>
                                  )}
                                  <td className="px-4 py-2.5 text-right">
                                    {isNhisPayment &&
                                      billingItem.nhis_covered &&
                                      itemGross > 0 && (
                                        <span className="text-xs text-gray-400 line-through mr-2">
                                          {formatCurrency(itemGross)}
                                        </span>
                                      )}
                                    <span className="text-sm font-semibold text-gray-900">
                                      {formatCurrency(itemPatientPayable)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          : [
                              <tr
                                key={order.billing_id || order.id}
                                className="hover:bg-gray-50/50"
                              >
                                <td className="px-4 py-2.5 pl-8">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium text-gray-800">
                                      {order.service_description || 'Service'}
                                    </span>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                      <span>
                                        Fee:{' '}
                                        {formatCurrency(
                                          order.gross_amount ||
                                            order.amount_due,
                                        )}
                                      </span>
                                      {isNhisPayment && order.nhis_covered && (
                                        <>
                                          <span className="text-emerald-600">
                                            NHIS:{' '}
                                            {formatCurrency(
                                              order.nhis_payable || 0,
                                            )}
                                          </span>
                                          <span className="text-amber-600">
                                            Patient:{' '}
                                            {formatCurrency(
                                              order.patient_payable ??
                                                (order.gross_amount ||
                                                  order.amount_due),
                                            )}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {isNhisPayment && (
                                  <td className="px-3 py-2.5 text-center">
                                    {order.nhis_covered ? (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                                        {(order.nhis_percentage || 0) > 0
                                          ? `${order.nhis_percentage}%`
                                          : '100%'}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400">
                                        N/A
                                      </span>
                                    )}
                                  </td>
                                )}
                                <td className="px-4 py-2.5 text-right">
                                  {isNhisPayment &&
                                    order.nhis_covered &&
                                    (order.gross_amount || order.amount_due) >
                                      0 && (
                                      <span className="text-xs text-gray-400 line-through mr-2">
                                        {formatCurrency(
                                          order.gross_amount ||
                                            order.amount_due,
                                        )}
                                      </span>
                                    )}
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(
                                      order.patient_payable ??
                                        (order.gross_amount ||
                                          order.amount_due),
                                    )}
                                  </span>
                                </td>
                              </tr>,
                            ];

                      return [headerRow, ...itemRows];
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 space-y-1.5">
                {isNhisPayment && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Gross Total</span>
                      <span>{formatCurrency(totalGross)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>NHIS Coverage</span>
                      <span>−{formatCurrency(totalNhisPayable)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                  <span className="font-bold text-gray-900">
                    {isNhisPayment
                      ? 'Patient Pays'
                      : isRetainerPayment
                        ? 'Corporate Account'
                        : 'Total Due'}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      isNhisPayment && totalPatientPayable === 0
                        ? 'text-emerald-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {formatCurrency(
                      isNhisPayment ? totalPatientPayable : totalAmount,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Textarea
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this payment..."
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={
                (!selectedMethod && !isNhisPatient) || batchVerify.isPending
              }
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {batchVerify.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {isNhisPatient && totalPatientPayable === 0
                    ? 'Issue NHIS Receipt (₦0 Due)'
                    : selectedMethod || isNhisPatient
                      ? 'Verify & Issue Receipt'
                      : 'Select Payment Method'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
