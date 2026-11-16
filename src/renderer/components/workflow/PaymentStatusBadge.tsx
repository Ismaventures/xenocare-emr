// =============================================================================
// Payment Status Badge Component
// Displays payment status for orders in Lab/Radiology/Pharmacy modules
// =============================================================================

import React from 'react';
import {
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Building2,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type PaymentStatus =
  | 'Not_Billed'
  | 'Pending'
  | 'Awaiting_Payment'
  | 'Partially_Paid'
  | 'Paid'
  | 'Paid_NHIS'
  | 'Paid_Retainership'
  | 'Waived'
  | 'Cancelled'
  | 'Unknown';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<
  PaymentStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    borderColor: string;
    iconColor: string;
  }
> = {
  Not_Billed: {
    label: 'Not Billed',
    icon: Clock,
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    iconColor: 'text-slate-400',
  },
  Pending: {
    label: 'Awaiting Payment',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  Awaiting_Payment: {
    label: 'Awaiting Payment',
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
  Partially_Paid: {
    label: 'Partially Paid',
    icon: CreditCard,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-500',
  },
  Paid: {
    label: 'Paid',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
  },
  Paid_NHIS: {
    label: 'NHIS Covered',
    icon: Shield,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
  Paid_Retainership: {
    label: 'Retainership',
    icon: Building2,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-500',
  },
  Waived: {
    label: 'Waived',
    icon: CheckCircle,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-500',
  },
  Cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
  },
  Unknown: {
    label: 'Unknown',
    icon: CreditCard,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
  },
};

const SIZE_CONFIG = {
  sm: {
    padding: 'px-1.5 py-0.5',
    fontSize: 'text-xs',
    iconSize: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2 py-1',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
    gap: 'gap-2',
  },
};

// =============================================================================
// Component
// =============================================================================

export default function PaymentStatusBadge({
  status,
  showLabel = true,
  size = 'sm',
  className = '',
}: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Unknown;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center ${sizeConfig.gap} ${sizeConfig.padding}
        ${config.bgColor} ${config.textColor} ${sizeConfig.fontSize}
        border ${config.borderColor} rounded-full font-medium
        ${className}
      `}
      title={config.label}
    >
      <Icon className={`${sizeConfig.iconSize} ${config.iconColor}`} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// =============================================================================
// Utility Function to get payment status from billing order
// =============================================================================

export function getPaymentStatusFromBillingOrder(
  billingStatus?: string | null,
): PaymentStatus {
  if (!billingStatus) return 'Not_Billed';

  switch (billingStatus) {
    case 'Pending':
      return 'Pending';
    case 'Awaiting_Payment':
      return 'Awaiting_Payment';
    case 'Partially_Paid':
      return 'Partially_Paid';
    case 'Paid':
      return 'Paid';
    case 'Paid_NHIS':
      return 'Paid_NHIS';
    case 'Paid_Retainership':
      return 'Paid_Retainership';
    case 'Waived':
      return 'Waived';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// Payment Blocking Check
// =============================================================================

export function isPaymentBlocking(
  paymentStatus: PaymentStatus,
  paymentCategory?: string,
): boolean {
  // NHIS and Retainership patients don't need to pay upfront
  if (paymentCategory === 'NHIS' || paymentCategory === 'Retainership') {
    return false;
  }

  // Cash/POS patients must pay first
  return paymentStatus === 'Pending';
}

// =============================================================================
// Compact Badge for Table Cells
// =============================================================================

export function PaymentStatusDot({
  status,
  className = '',
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Unknown;

  const dotColor = {
    Pending: 'bg-amber-500',
    Paid: 'bg-green-500',
    Paid_NHIS: 'bg-blue-500',
    Paid_Retainership: 'bg-purple-500',
    Waived: 'bg-gray-500',
    Cancelled: 'bg-red-500',
    Unknown: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={config.label}
    >
      <span
        className={`w-2 h-2 rounded-full ${dotColor[status] || dotColor.Unknown}`}
      />
      <span className="text-xs text-gray-600">{config.label}</span>
    </span>
  );
}
