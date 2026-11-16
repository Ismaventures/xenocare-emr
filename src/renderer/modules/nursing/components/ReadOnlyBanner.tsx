/**
 * =============================================================================
 * NURSING MODULE - READ-ONLY BANNER COMPONENT
 * =============================================================================
 *
 * Displays a prominent banner when viewing historical/closed encounters.
 * Ensures nurses understand they cannot modify records.
 */

import React from 'react';
import { Lock, AlertTriangle, Info, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui';

// =============================================================================
// TYPES
// =============================================================================

interface ReadOnlyBannerProps {
  encounterStatus: string;
  encounterDate?: string;
  onSwitchToActive?: () => void;
  hasActiveEncounter?: boolean;
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ReadOnlyBanner({
  encounterStatus,
  encounterDate,
  onSwitchToActive,
  hasActiveEncounter = false,
  variant = 'full',
  className = '',
}: ReadOnlyBannerProps) {
  // Determine banner style based on status
  const getBannerStyle = () => {
    switch (encounterStatus) {
      case 'Closed':
        return {
          bg: 'bg-gray-100 border-gray-300',
          icon: Lock,
          iconColor: 'text-gray-600',
          textColor: 'text-gray-700',
          title: 'Encounter Closed',
          message: 'This encounter has been closed. All records are read-only.',
        };
      case 'Completed':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: Info,
          iconColor: 'text-blue-600',
          textColor: 'text-blue-700',
          title: 'Encounter Completed',
          message: 'This encounter is completed. Records are read-only.',
        };
      case 'Cancelled':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          textColor: 'text-red-700',
          title: 'Encounter Cancelled',
          message: 'This encounter was cancelled. Records are read-only.',
        };
      default:
        return {
          bg: 'bg-amber-50 border-amber-200',
          icon: Clock,
          iconColor: 'text-amber-600',
          textColor: 'text-amber-700',
          title: 'Historical Encounter',
          message: 'You are viewing a past encounter. Records are read-only.',
        };
    }
  };

  const style = getBannerStyle();
  const Icon = style.icon;

  // ==========================================================================
  // FULL BANNER (Default)
  // ==========================================================================
  if (variant === 'full') {
    return (
      <div className={`${style.bg} border rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${style.bg}`}>
            <Icon className={`w-5 h-5 ${style.iconColor}`} />
          </div>

          <div className="flex-1">
            <h4 className={`font-semibold ${style.textColor}`}>
              {style.title}
            </h4>
            <p className={`text-sm mt-0.5 ${style.textColor} opacity-80`}>
              {style.message}
              {encounterDate && (
                <span className="ml-1">
                  (Encounter from{' '}
                  {new Date(encounterDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  )
                </span>
              )}
            </p>
          </div>

          {hasActiveEncounter && onSwitchToActive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSwitchToActive}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Active Encounter
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // COMPACT BANNER
  // ==========================================================================
  if (variant === 'compact') {
    return (
      <div
        className={`${style.bg} border rounded-lg px-3 py-2 flex items-center gap-2 ${className}`}
      >
        <Icon className={`w-4 h-4 ${style.iconColor}`} />
        <span className={`text-sm font-medium ${style.textColor}`}>
          {style.title}
        </span>
        {hasActiveEncounter && onSwitchToActive && (
          <button
            onClick={onSwitchToActive}
            className="text-xs text-blue-600 hover:underline ml-auto"
          >
            Go to Active
          </button>
        )}
      </div>
    );
  }

  // ==========================================================================
  // INLINE BANNER
  // ==========================================================================
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.textColor} ${className}`}
    >
      <Icon className="w-3 h-3" />
      Read Only
    </span>
  );
}

// =============================================================================
// FORM DISABLED OVERLAY
// =============================================================================

interface FormDisabledOverlayProps {
  message?: string;
  children: React.ReactNode;
}

export function FormDisabledOverlay({
  message = 'This form is read-only for historical encounters.',
  children,
}: FormDisabledOverlayProps) {
  return (
    <div className="relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-100/60 backdrop-blur-[1px] z-10 rounded-lg flex items-center justify-center">
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{message}</span>
        </div>
      </div>

      {/* Disabled Content */}
      <div className="pointer-events-none opacity-60">{children}</div>
    </div>
  );
}

// =============================================================================
// INPUT DISABLED WRAPPER
// =============================================================================

interface DisabledInputWrapperProps {
  isDisabled: boolean;
  reason?: string;
  children: React.ReactNode;
}

export function DisabledInputWrapper({
  isDisabled,
  reason = 'Read-only in this encounter',
  children,
}: DisabledInputWrapperProps) {
  if (!isDisabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      <div className="pointer-events-none opacity-60">{children}</div>
      <div className="absolute inset-0 cursor-not-allowed" title={reason} />

      {/* Tooltip on hover */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block z-20">
        <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {reason}
        </div>
      </div>
    </div>
  );
}
