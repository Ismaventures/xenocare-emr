// PersistentNotificationPopup.tsx
// Full-screen overlay-style persistent notification popup that stays until acknowledged.
// Plays sound on each re-alert and supports snooze.

import React, { useState, useCallback } from 'react';
import {
  X,
  Bell,
  BellRing,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Pill,
  Shield,
  FileText,
  Volume2,
} from 'lucide-react';
import type { Notification } from '../../types/notifications.types';
import {
  acknowledgeNotification,
  snoozeNotification,
} from '../../lib/notifications/api';
import { removeFromTracking } from '../../lib/notifications/persistent-notification.service';
import { useAuth } from '../../contexts/AuthContext';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('PersistentNotification');

interface PersistentNotificationPopupProps {
  notifications: Notification[];
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onDismissAll: () => void;
}

const PRIORITY_STYLES: Record<
  string,
  { bg: string; border: string; icon: string; pulse: string }
> = {
  Critical: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    icon: 'text-red-600',
    pulse: 'animate-pulse',
  },
  High: {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    icon: 'text-orange-600',
    pulse: '',
  },
  Normal: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    icon: 'text-blue-600',
    pulse: '',
  },
  Low: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    icon: 'text-gray-500',
    pulse: '',
  },
};

function getNotificationIcon(notif: Notification) {
  const iconClass = 'h-6 w-6';
  switch (notif.type) {
    case 'MedicationDue':
    case 'MedicationOverdue':
      return (
        <Pill
          className={`${iconClass} ${notif.priority === 'Critical' ? 'text-red-600' : 'text-orange-500'}`}
        />
      );
    case 'NHISRequest':
      return <Shield className={`${iconClass} text-green-600`} />;
    case 'CareTeamAction':
      return <FileText className={`${iconClass} text-blue-600`} />;
    case 'ModuleRequest':
      return <Bell className={`${iconClass} text-purple-600`} />;
    case 'CriticalValue':
      return <AlertCircle className={`${iconClass} text-red-600`} />;
    default:
      return <BellRing className={`${iconClass} text-blue-600`} />;
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const SNOOZE_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

function SingleNotificationCard({
  notif,
  onAcknowledge,
  onSnooze,
}: {
  notif: Notification;
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
}) {
  const [showSnooze, setShowSnooze] = useState(false);
  const [loading, setLoading] = useState(false);
  const { staff } = useAuth();
  const style = PRIORITY_STYLES[notif.priority] || PRIORITY_STYLES.Normal;

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      await acknowledgeNotification(notif.id, staff?.id);
      removeFromTracking(notif.id);
      onAcknowledge(notif.id);
    } catch (e) {
      log.error('Failed to acknowledge:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async (minutes: number) => {
    setLoading(true);
    try {
      await snoozeNotification(notif.id, minutes);
      removeFromTracking(notif.id);
      onSnooze(notif.id, minutes);
    } catch (e) {
      log.error('Failed to snooze:', e);
    } finally {
      setLoading(false);
      setShowSnooze(false);
    }
  };

  return (
    <div
      className={`
        relative flex flex-col gap-2 p-4 rounded-lg border-2 shadow-lg
        ${style.bg} ${style.border} ${style.pulse}
        transition-all duration-300
      `}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notif)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-gray-900 truncate">
              {notif.title}
            </h4>
            {notif.priority === 'Critical' && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-red-600 text-white rounded uppercase">
                Critical
              </span>
            )}
            {notif.priority === 'High' && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-orange-500 text-white rounded uppercase">
                Urgent
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-snug">{notif.message}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(notif.created_at)}
            </span>
            {notif.source_module && (
              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs capitalize">
                {notif.source_module}
              </span>
            )}
            {(notif.repeat_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-orange-600">
                <Volume2 className="h-3 w-3" />
                Alert #{(notif.repeat_count ?? 0) + 1}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-1 pl-9">
        <button
          onClick={handleAcknowledge}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Acknowledge
        </button>

        {notif.action_url && (
          <button
            onClick={() => {
              // Navigate to the action URL - use window location or router
              if (notif.action_url) {
                window.location.hash = notif.action_url;
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {notif.action_label || 'View'}
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setShowSnooze(!showSnooze)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            Snooze
          </button>

          {showSnooze && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSnooze(opt.value)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PersistentNotificationPopup({
  notifications,
  onAcknowledge,
  onSnooze,
  onDismissAll,
}: PersistentNotificationPopupProps) {
  const [minimized, setMinimized] = useState(false);

  if (notifications.length === 0) return null;

  const criticalCount = notifications.filter(
    (n) => n.priority === 'Critical',
  ).length;
  const highCount = notifications.filter((n) => n.priority === 'High').length;

  // Minimized view - floating badge
  if (minimized) {
    return (
      <div className="fixed top-4 right-4 z-[9999]">
        <button
          onClick={() => setMinimized(false)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full shadow-xl border-2
            ${
              criticalCount > 0
                ? 'bg-red-600 border-red-700 text-white animate-pulse'
                : highCount > 0
                  ? 'bg-orange-500 border-orange-600 text-white'
                  : 'bg-blue-600 border-blue-700 text-white'
            }
            hover:scale-105 transition-transform
          `}
        >
          <BellRing className="h-5 w-5" />
          <span className="font-bold text-sm">
            {notifications.length} Alert{notifications.length > 1 ? 's' : ''}
          </span>
        </button>
      </div>
    );
  }

  // Full notification panel
  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Semi-transparent overlay for critical notifications */}
      {criticalCount > 0 && (
        <div className="absolute inset-0 bg-red-900/10 pointer-events-auto" />
      )}

      {/* Notification Panel - slides in from the right */}
      <div className="absolute top-0 right-0 bottom-0 w-full max-w-md pointer-events-auto">
        <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm shadow-2xl border-l border-gray-200">
          {/* Header */}
          <div
            className={`
              flex items-center justify-between px-4 py-3 border-b
              ${
                criticalCount > 0
                  ? 'bg-red-600 text-white'
                  : highCount > 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-blue-600 text-white'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              <h3 className="font-semibold text-sm">
                Pending Alerts ({notifications.length})
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Minimize"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <rect x="3" y="7" width="10" height="2" rx="1" />
                </svg>
              </button>
              <button
                onClick={onDismissAll}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Acknowledge All"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Warning Banner for critical */}
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 border-b border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
              <span className="text-xs font-bold text-red-700">
                {criticalCount} CRITICAL alert{criticalCount > 1 ? 's' : ''}{' '}
                require immediate attention
              </span>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Sort: Critical first, then High, then by created_at */}
            {[...notifications]
              .sort((a, b) => {
                const order: Record<string, number> = {
                  Critical: 0,
                  High: 1,
                  Normal: 2,
                  Low: 3,
                };
                const pDiff =
                  (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
                if (pDiff !== 0) return pDiff;
                return (
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
                );
              })
              .map((notif) => (
                <SingleNotificationCard
                  key={notif.id}
                  notif={notif}
                  onAcknowledge={onAcknowledge}
                  onSnooze={onSnooze}
                />
              ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onDismissAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Acknowledge All ({notifications.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersistentNotificationPopup;