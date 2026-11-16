// =============================================================================
// NHIS Approval Status Badge & Components
//
// Reusable UI components for displaying NHIS approval status across modules
// =============================================================================

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { StatusBadge } from '../ui/DataDisplay';
import { Button } from '../ui/FormElements';
import type { NhisApprovalStatus } from '../../types/database.types';

// =============================================================================
// Types
// =============================================================================

interface NhisApprovalBadgeProps {
  status: NhisApprovalStatus | null | undefined;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface NhisApprovalStatusCardProps {
  status: NhisApprovalStatus | null | undefined;
  approvalId?: string;
  decidedBy?: string;
  decidedAt?: string;
  rejectionReason?: string;
  estimatedCost?: number;
  thresholdAmount?: number;
  onRequestApproval?: () => void;
  onViewDetails?: () => void;
  isLoading?: boolean;
}

interface NhisApprovalBlockerProps {
  status: NhisApprovalStatus;
  rejectionReason?: string;
  onRequestApproval?: () => void;
  onContactNhis?: () => void;
}

// =============================================================================
// Status Config
// =============================================================================

const statusConfig: Record<
  NhisApprovalStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    icon: React.ElementType;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  not_required: {
    label: 'No Approval',
    variant: 'neutral',
    icon: Shield,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    description: 'This service does not require NHIS pre-approval',
  },
  pending: {
    label: 'Pending',
    variant: 'warning',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    description: 'Awaiting NHIS office approval',
  },
  provisional: {
    label: 'Provisional',
    variant: 'info',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Provisional approval granted - awaiting final confirmation',
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    description: 'NHIS has approved this service',
  },
  rejected: {
    label: 'Rejected',
    variant: 'danger',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'NHIS has rejected this service request',
  },
  expired: {
    label: 'Expired',
    variant: 'warning',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'NHIS approval has expired - resubmission required',
  },
};

// =============================================================================
// NHIS Approval Status Badge
// =============================================================================

export function NhisApprovalBadge({
  status,
  showLabel = true,
  size = 'md',
  className,
}: NhisApprovalBadgeProps) {
  if (!status || status === 'not_required') {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  if (!showLabel) {
    return (
      <span
        className={`inline-flex items-center ${config.color} ${className || ''}`}
        title={config.description}
      >
        <Icon size={iconSize} />
      </span>
    );
  }

  return <StatusBadge status={config.label} variant={config.variant} />;
}

// =============================================================================
// NHIS Approval Status Indicator (inline icon only)
// =============================================================================

export function NhisApprovalIndicator({
  status,
  className,
}: {
  status: NhisApprovalStatus | null | undefined;
  className?: string;
}) {
  if (!status || status === 'not_required') {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex ${config.color} ${className || ''}`}
      title={config.description}
    >
      <Icon size={16} />
    </span>
  );
}

// =============================================================================
// NHIS Approval Status Card (detailed view)
// =============================================================================

export function NhisApprovalStatusCard({
  status,
  approvalId,
  decidedBy,
  decidedAt,
  rejectionReason,
  estimatedCost,
  thresholdAmount,
  onRequestApproval,
  onViewDetails,
  isLoading,
}: NhisApprovalStatusCardProps) {
  if (!status) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-600">
          <Shield size={20} />
          <span className="font-medium">NHIS Status Unknown</span>
        </div>
        {onRequestApproval && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRequestApproval}
            disabled={isLoading}
            className="mt-3"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Check NHIS Requirements
          </Button>
        )}
      </div>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className={config.color} size={20} />
          <div>
            <span className={`font-medium ${config.color}`}>
              {config.label}
            </span>
            {approvalId && (
              <p className="text-xs text-gray-500">
                ID: {approvalId.slice(0, 8)}
              </p>
            )}
          </div>
        </div>
        {onViewDetails && (
          <Button variant="secondary" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
        )}
      </div>

      <p className="mt-2 text-sm text-gray-500">{config.description}</p>

      {/* Cost Information */}
      {estimatedCost !== undefined && (
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span>
            <span className="text-gray-500">Estimated Cost:</span>{' '}
            <span className="font-medium">
              ₦{estimatedCost.toLocaleString()}
            </span>
          </span>
          {thresholdAmount !== undefined && (
            <span>
              <span className="text-gray-500">Threshold:</span>{' '}
              <span className="font-medium">
                ₦{thresholdAmount.toLocaleString()}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Decision Info */}
      {(decidedBy || decidedAt) && (
        <div className="mt-3 text-sm">
          {decidedBy && (
            <p>
              <span className="text-gray-500">Decided by:</span>{' '}
              <span className="font-medium">{decidedBy}</span>
            </p>
          )}
          {decidedAt && (
            <p>
              <span className="text-gray-500">Date:</span>{' '}
              <span>{new Date(decidedAt).toLocaleDateString()}</span>
            </p>
          )}
        </div>
      )}

      {/* Rejection Reason */}
      {status === 'rejected' && rejectionReason && (
        <div className="mt-3 rounded-md bg-red-100 p-2">
          <p className="text-sm text-red-800">
            <span className="font-medium">Reason:</span> {rejectionReason}
          </p>
        </div>
      )}

      {/* Actions */}
      {status === 'rejected' && onRequestApproval && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRequestApproval}
          disabled={isLoading}
          className="mt-3"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Resubmit for Approval
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// NHIS Approval Blocker (blocks action when pending/rejected)
// =============================================================================

export function NhisApprovalBlocker({
  status,
  rejectionReason,
  onRequestApproval,
  onContactNhis,
}: NhisApprovalBlockerProps) {
  if (status === 'approved' || status === 'not_required') {
    return null;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-6 text-center ${config.bgColor}`}
    >
      <Icon className={`mx-auto h-12 w-12 ${config.color}`} />
      <h3 className={`mt-4 text-lg font-semibold ${config.color}`}>
        {status === 'pending' && 'Awaiting NHIS Approval'}
        {status === 'rejected' && 'NHIS Approval Rejected'}
        {status === 'expired' && 'NHIS Approval Expired'}
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        {status === 'pending' &&
          'This service request is pending NHIS office approval. Please wait for a decision.'}
        {status === 'rejected' &&
          (rejectionReason
            ? `Rejection reason: ${rejectionReason}`
            : 'The NHIS office has rejected this request. Please contact them for more information.')}
        {status === 'expired' &&
          'The approval window has expired. Please submit a new approval request.'}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        {status !== 'pending' && onRequestApproval && (
          <Button onClick={onRequestApproval}>
            {status === 'expired' ? 'Submit New Request' : 'Resubmit Request'}
          </Button>
        )}
        {onContactNhis && (
          <Button variant="secondary" onClick={onContactNhis}>
            Contact NHIS Office
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// NHIS Approval Required Alert
// =============================================================================

export function NhisApprovalRequiredAlert({
  serviceName,
  estimatedCost,
  thresholdAmount,
  onSubmitForApproval,
  onSkip,
  isLoading,
}: {
  serviceName: string;
  estimatedCost: number;
  thresholdAmount?: number;
  onSubmitForApproval: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-amber-800">
            NHIS Approval Required
          </h4>
          <p className="mt-1 text-sm text-amber-700">
            The service <strong>"{serviceName}"</strong> requires NHIS
            pre-approval before it can be processed.
          </p>
          <div className="mt-2 text-sm">
            <span className="text-amber-700">Estimated Cost: </span>
            <span className="font-semibold">
              ₦{estimatedCost.toLocaleString()}
            </span>
            {thresholdAmount && (
              <>
                <span className="text-amber-700 ml-3">
                  Auto-Approval Threshold:{' '}
                </span>
                <span className="font-semibold">
                  ₦{thresholdAmount.toLocaleString()}
                </span>
              </>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={onSubmitForApproval} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for NHIS Approval
            </Button>
            {onSkip && (
              <Button variant="secondary" onClick={onSkip} disabled={isLoading}>
                Skip (Non-NHIS)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// NHIS Service Status Cell (for tables/lists)
// =============================================================================

export function NhisServiceStatusCell({
  isNhisPatient,
  approvalStatus,
  className,
}: {
  isNhisPatient: boolean;
  approvalStatus: NhisApprovalStatus | null | undefined;
  className?: string;
}) {
  if (!isNhisPatient) {
    return (
      <span className={`text-xs text-gray-400 ${className || ''}`}>
        Non-NHIS
      </span>
    );
  }

  return (
    <NhisApprovalBadge
      status={approvalStatus || 'pending'}
      size="sm"
      className={className}
    />
  );
}
