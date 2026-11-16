// =============================================================================
// Patient Journey Dashboard
// Unified view showing a patient's current visit status, pending orders,
// payment status, and next steps
// =============================================================================

import React, { useState } from 'react';
import {
  User,
  Clock,
  CreditCard,
  FlaskConical,
  Image,
  Pill,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  FileText,
} from 'lucide-react';
import { Card, Button, StatusBadge } from '../ui';
import PaymentStatusBadge, {
  getPaymentStatusFromBillingOrder,
} from './PaymentStatusBadge';
import { useVisitBillingOrders } from '../../modules/billing/hooks/useBillingOrders';
import { BillingOrderDTO } from '../../modules/billing/dtos/billing-order.dto';

// =============================================================================
// Types
// =============================================================================

interface PatientJourneyDashboardProps {
  patientId: string;
  visitId: string;
  patientName: string;
  patientCategory: string;
  visitType: string;
  currentStage: string;
  startTime: string;
  onGoToPayment?: () => void;
  onGoToLab?: () => void;
  onGoToRadiology?: () => void;
  onGoToPharmacy?: () => void;
}

interface JourneyStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  status: 'completed' | 'current' | 'pending' | 'blocked';
  description?: string;
}

// =============================================================================
// Stage to Journey Step Mapping
// =============================================================================

const STAGE_ORDER = [
  'registration',
  'payment',
  'queue_waiting',
  'nursing_vitals',
  'consultation',
  'lab_pending',
  'lab_results',
  'radiology_pending',
  'radiology_results',
  'pharmacy_pending',
  'pharmacy_dispense',
  'billing_final',
  'completed',
];

function getStageIndex(stage: string): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? index : 0;
}

// =============================================================================
// Component
// =============================================================================

export default function PatientJourneyDashboard({
  patientId,
  visitId,
  patientName,
  patientCategory,
  visitType,
  currentStage,
  startTime,
  onGoToPayment,
  onGoToLab,
  onGoToRadiology,
  onGoToPharmacy,
}: PatientJourneyDashboardProps) {
  const [isOrdersExpanded, setIsOrdersExpanded] = useState(true);

  // Fetch billing orders for this visit
  const { data: billingOrders, isLoading } = useVisitBillingOrders(visitId);

  // Calculate order summaries
  const orderSummary = React.useMemo(() => {
    if (!billingOrders) {
      return {
        lab: [],
        radiology: [],
        pharmacy: [],
        total: 0,
        pending: 0,
        paid: 0,
      };
    }

    const lab = billingOrders.filter((o) => o.source_module === 'lab');
    const radiology = billingOrders.filter(
      (o) => o.source_module === 'radiology',
    );
    const pharmacy = billingOrders.filter(
      (o) => o.source_module === 'pharmacy',
    );
    const pending = billingOrders.filter((o) => o.payment_status === 'Pending');
    const paid = billingOrders.filter((o) =>
      ['Paid', 'Paid_NHIS', 'Paid_Retainership', 'Waived'].includes(
        o.payment_status,
      ),
    );

    return {
      lab,
      radiology,
      pharmacy,
      total: billingOrders.length,
      pending: pending.length,
      paid: paid.length,
    };
  }, [billingOrders]);

  // Calculate total amounts
  const financialSummary = React.useMemo(() => {
    if (!billingOrders) return { totalDue: 0, totalPaid: 0, balance: 0 };

    const totalDue = billingOrders.reduce(
      (sum, o) => sum + (o.amount_due || 0),
      0,
    );
    const totalPaid = billingOrders
      .filter(
        (o) =>
          o.payment_status !== 'Pending' && o.payment_status !== 'Cancelled',
      )
      .reduce((sum, o) => sum + (o.amount_due || 0), 0);

    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  }, [billingOrders]);

  // Determine journey steps based on current stage
  const journeySteps: JourneyStep[] = React.useMemo(() => {
    const currentIndex = getStageIndex(currentStage);

    return [
      {
        id: 'registration',
        label: 'Registration',
        icon: User,
        status: currentIndex > 0 ? 'completed' : 'current',
        description: 'Patient checked in',
      },
      {
        id: 'payment',
        label: 'Payment Verification',
        icon: CreditCard,
        status:
          currentIndex > 1
            ? 'completed'
            : currentIndex === 1
              ? 'current'
              : 'pending',
        description:
          orderSummary.pending > 0
            ? `${orderSummary.pending} pending payment(s)`
            : 'All payments verified',
      },
      {
        id: 'consultation',
        label: 'Consultation',
        icon: Stethoscope,
        status:
          currentIndex > 4
            ? 'completed'
            : currentIndex >= 3 && currentIndex <= 4
              ? 'current'
              : 'pending',
        description: 'Doctor consultation',
      },
      {
        id: 'lab',
        label: 'Laboratory',
        icon: FlaskConical,
        status:
          orderSummary.lab.length === 0
            ? 'pending'
            : orderSummary.lab.every(
                  (o) =>
                    o.payment_status !== 'Pending' &&
                    o.payment_status !== 'Cancelled',
                )
              ? 'completed'
              : currentStage.includes('lab')
                ? 'current'
                : 'blocked',
        description:
          orderSummary.lab.length > 0
            ? `${orderSummary.lab.length} test(s)`
            : 'No tests ordered',
      },
      {
        id: 'radiology',
        label: 'Radiology',
        icon: Image,
        status:
          orderSummary.radiology.length === 0
            ? 'pending'
            : orderSummary.radiology.every(
                  (o) =>
                    o.payment_status !== 'Pending' &&
                    o.payment_status !== 'Cancelled',
                )
              ? 'completed'
              : currentStage.includes('radiology')
                ? 'current'
                : 'blocked',
        description:
          orderSummary.radiology.length > 0
            ? `${orderSummary.radiology.length} scan(s)`
            : 'No scans ordered',
      },
      {
        id: 'pharmacy',
        label: 'Pharmacy',
        icon: Pill,
        status:
          orderSummary.pharmacy.length === 0
            ? 'pending'
            : orderSummary.pharmacy.every(
                  (o) =>
                    o.payment_status !== 'Pending' &&
                    o.payment_status !== 'Cancelled',
                )
              ? 'completed'
              : currentStage.includes('pharmacy')
                ? 'current'
                : 'blocked',
        description:
          orderSummary.pharmacy.length > 0
            ? `${orderSummary.pharmacy.length} medication(s)`
            : 'No medications',
      },
      {
        id: 'discharge',
        label: 'Discharge',
        icon: CheckCircle,
        status: currentStage === 'completed' ? 'completed' : 'pending',
        description: 'Visit complete',
      },
    ];
  }, [currentStage, orderSummary]);

  // Format elapsed time
  const elapsedTime = React.useMemo(() => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, [startTime]);

  // Status colors
  const getStatusStyles = (status: JourneyStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-blue-500 text-white animate-pulse';
      case 'blocked':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-200 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {patientName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{patientName}</h2>
              <div className="flex items-center gap-4 mt-1 text-green-100">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {elapsedTime} elapsed
                </span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {visitType}
                </span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {patientCategory}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-100">Total Amount</div>
            <div className="text-3xl font-bold">
              ₦{financialSummary.totalDue.toLocaleString()}
            </div>
            {financialSummary.balance > 0 && (
              <div className="text-amber-300 text-sm">
                Balance: ₦{financialSummary.balance.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Journey Progress */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Patient Journey
        </h3>
        <div className="flex items-center justify-between overflow-x-auto pb-4">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center min-w-[100px]">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusStyles(step.status)}`}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < journeySteps.length - 1 && (
                  <ArrowRight
                    className={`flex-shrink-0 mx-2 ${
                      journeySteps[index + 1].status === 'completed' ||
                      journeySteps[index + 1].status === 'current'
                        ? 'text-green-500'
                        : 'text-gray-300'
                    }`}
                    size={20}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Pending Actions */}
      {orderSummary.pending > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500" size={24} />
              <div>
                <h4 className="font-semibold text-amber-800">
                  Payment Required
                </h4>
                <p className="text-sm text-amber-600">
                  {orderSummary.pending} order(s) awaiting payment before
                  services can proceed
                </p>
              </div>
            </div>
            {onGoToPayment && (
              <Button variant="primary" size="sm" onClick={onGoToPayment}>
                Go to Payment
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Orders Breakdown */}
      <Card>
        <button
          onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Orders & Services ({orderSummary.total})
          </h3>
          {isOrdersExpanded ? (
            <ChevronUp size={20} />
          ) : (
            <ChevronDown size={20} />
          )}
        </button>

        {isOrdersExpanded && (
          <div className="mt-4 space-y-4">
            {/* Lab Orders */}
            {orderSummary.lab.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="text-green-600" size={20} />
                    <span className="font-medium">Laboratory</span>
                    <span className="text-sm text-gray-500">
                      ({orderSummary.lab.length})
                    </span>
                  </div>
                  {onGoToLab && (
                    <Button variant="secondary" size="sm" onClick={onGoToLab}>
                      View in Lab
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {orderSummary.lab.map((order) => (
                    <OrderRow key={order.billing_id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Radiology Orders */}
            {orderSummary.radiology.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Image className="text-blue-600" size={20} />
                    <span className="font-medium">Radiology</span>
                    <span className="text-sm text-gray-500">
                      ({orderSummary.radiology.length})
                    </span>
                  </div>
                  {onGoToRadiology && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onGoToRadiology}
                    >
                      View in Radiology
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {orderSummary.radiology.map((order) => (
                    <OrderRow key={order.billing_id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Pharmacy Orders */}
            {orderSummary.pharmacy.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="text-purple-600" size={20} />
                    <span className="font-medium">Pharmacy</span>
                    <span className="text-sm text-gray-500">
                      ({orderSummary.pharmacy.length})
                    </span>
                  </div>
                  {onGoToPharmacy && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onGoToPharmacy}
                    >
                      View in Pharmacy
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {orderSummary.pharmacy.map((order) => (
                    <OrderRow key={order.billing_id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* No Orders */}
            {orderSummary.total === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                <FileText size={40} className="mx-auto mb-2 opacity-50" />
                <p>No orders placed yet</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Next Steps */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
        <div className="space-y-3">
          {orderSummary.pending > 0 && (
            <NextStepItem
              icon={CreditCard}
              title="Complete Payment"
              description={`Pay ₦${financialSummary.balance.toLocaleString()} for ${orderSummary.pending} pending order(s)`}
              actionLabel="Go to Billing"
              onAction={onGoToPayment}
              priority="high"
            />
          )}
          {orderSummary.lab.some((o) => o.payment_status !== 'Pending') && (
            <NextStepItem
              icon={FlaskConical}
              title="Laboratory Tests"
              description="Proceed to laboratory for sample collection"
              actionLabel="View Lab"
              onAction={onGoToLab}
            />
          )}
          {orderSummary.radiology.some(
            (o) => o.payment_status !== 'Pending',
          ) && (
            <NextStepItem
              icon={Image}
              title="Radiology Imaging"
              description="Proceed to radiology for imaging"
              actionLabel="View Radiology"
              onAction={onGoToRadiology}
            />
          )}
          {orderSummary.pharmacy.some(
            (o) => o.payment_status !== 'Pending',
          ) && (
            <NextStepItem
              icon={Pill}
              title="Collect Medications"
              description="Proceed to pharmacy for medication dispensing"
              actionLabel="View Pharmacy"
              onAction={onGoToPharmacy}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function OrderRow({ order }: { order: BillingOrderDTO }) {
  const paymentStatus = getPaymentStatusFromBillingOrder(order.payment_status);

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">
          {order.service_description}
        </div>
        {order.service_code && (
          <div className="text-xs text-gray-500">{order.service_code}</div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-gray-900">
          ₦{order.amount_due.toLocaleString()}
        </div>
        <PaymentStatusBadge status={paymentStatus} size="sm" />
      </div>
    </div>
  );
}

function NextStepItem({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  priority = 'normal',
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  priority?: 'high' | 'normal';
}) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg ${
        priority === 'high'
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            priority === 'high' ? 'bg-amber-100' : 'bg-gray-200'
          }`}
        >
          <Icon
            size={20}
            className={priority === 'high' ? 'text-amber-600' : 'text-gray-600'}
          />
        </div>
        <div>
          <div className="font-medium text-gray-900">{title}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
      </div>
      {actionLabel && onAction && (
        <Button
          variant={priority === 'high' ? 'primary' : 'secondary'}
          size="sm"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
