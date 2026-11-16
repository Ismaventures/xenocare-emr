// Persistent Notification Engine
// Polls for unacknowledged notifications and re-triggers sound alerts
// until the user acknowledges or snoozes them.

import { getUnacknowledgedNotifications, incrementRepeatCount } from './api';
import { playPresetSound } from './sound.service';
import type { Notification } from '../../types/notifications.types';

// =====================================================
// TYPES
// =====================================================

export interface PersistentNotificationState {
  /** All unacknowledged notifications currently being tracked */
  notifications: Notification[];
  /** Notification IDs that are actively alerting (sound playing) */
  alertingIds: Set<string>;
  /** Callbacks registered by UI components to show popups */
  listeners: Set<PersistentNotificationListener>;
  /** The polling interval ID */
  pollIntervalId: ReturnType<typeof setInterval> | null;
  /** Whether the engine is running */
  isRunning: boolean;
  /** Current user ID */
  userId: string | null;
}

export type PersistentNotificationListener = (
  notifications: Notification[],
  newAlerts: Notification[],
) => void;

// =====================================================
// ENGINE STATE (singleton)
// =====================================================

const state: PersistentNotificationState = {
  notifications: [],
  alertingIds: new Set(),
  listeners: new Set(),
  pollIntervalId: null,
  isRunning: false,
  userId: null,
};

/** Consecutive network failure count to suppress repeated error logs */
let consecutiveFailures = 0;

/** Default poll interval: 15 seconds for faster re-alerts */
const DEFAULT_POLL_INTERVAL_MS = 15_000;

/** Minimum time between re-alerts for the same notification (seconds) */
const MIN_RE_ALERT_GAP_SECONDS = 30;

// =====================================================
// CORE ENGINE
// =====================================================

/**
 * Start the persistent notification engine for a user.
 * Call this once when the user logs in / app mounts.
 */
export function startPersistentEngine(
  userId: string,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
): void {
  if (state.isRunning && state.userId === userId) return;

  // Stop any existing engine first
  stopPersistentEngine();

  state.userId = userId;
  state.isRunning = true;

  // Immediate first poll
  pollAndAlert();

  // Set up recurring poll
  state.pollIntervalId = setInterval(pollAndAlert, pollIntervalMs);

  console.log(
    `[PersistentNotification] Engine started for user ${userId}, poll every ${pollIntervalMs}ms`,
  );
}

/**
 * Stop the persistent notification engine.
 * Call this on logout / unmount.
 */
export function stopPersistentEngine(): void {
  if (state.pollIntervalId) {
    clearInterval(state.pollIntervalId);
    state.pollIntervalId = null;
  }
  state.isRunning = false;
  state.notifications = [];
  state.alertingIds.clear();
  state.userId = null;

  console.log('[PersistentNotification] Engine stopped');
}

/**
 * Register a listener to receive notification updates.
 * Returns an unsubscribe function.
 */
export function onPersistentNotifications(
  listener: PersistentNotificationListener,
): () => void {
  state.listeners.add(listener);
  // Immediately call with current state
  if (state.notifications.length > 0) {
    listener(state.notifications, []);
  }
  return () => {
    state.listeners.delete(listener);
  };
}

/**
 * Get current unacknowledged notifications
 */
export function getCurrentPersistentNotifications(): Notification[] {
  return [...state.notifications];
}

/**
 * Force an immediate poll (e.g., after a new notification arrives via realtime)
 */
export function triggerImmediatePoll(): void {
  if (state.isRunning) {
    pollAndAlert();
  }
}

/**
 * Remove a notification from the local tracking (after acknowledge/dismiss).
 * The next poll will confirm it's truly gone.
 */
export function removeFromTracking(notificationId: string): void {
  state.notifications = state.notifications.filter(
    (n) => n.id !== notificationId,
  );
  state.alertingIds.delete(notificationId);
  notifyListeners([]);
}

// =====================================================
// INTERNAL: Polling & Alert Logic
// =====================================================

async function pollAndAlert(): Promise<void> {
  if (!state.userId) return;

  try {
    const notifications = await getUnacknowledgedNotifications(state.userId);

    // Reset failure counter on success
    if (consecutiveFailures > 0) {
      console.log('[PersistentNotification] Connection restored');
    }
    consecutiveFailures = 0;

    // Determine which ones are NEW (not previously tracked) or due for re-alert
    const newAlerts: Notification[] = [];
    const now = Date.now();

    for (const notif of notifications) {
      const wasTracked = state.alertingIds.has(notif.id);

      if (!wasTracked) {
        // Brand new unacknowledged notification
        newAlerts.push(notif);
        state.alertingIds.add(notif.id);
      } else {
        // Already tracked - check if it's time to re-alert
        if (shouldReAlert(notif, now)) {
          newAlerts.push(notif);
          // Increment the repeat count in DB
          incrementRepeatCount(notif.id).catch((err) =>
            console.warn(
              '[PersistentNotification] Failed to increment repeat count:',
              err,
            ),
          );
        }
      }
    }

    // Update state
    state.notifications = notifications;

    // Clean up alertingIds for notifications that are no longer in the list
    const currentIds = new Set(notifications.map((n) => n.id));
    for (const id of state.alertingIds) {
      if (!currentIds.has(id)) {
        state.alertingIds.delete(id);
      }
    }

    // Play sound for new alerts
    if (newAlerts.length > 0) {
      playAlertSound(newAlerts);
    }

    // Notify UI listeners
    notifyListeners(newAlerts);
  } catch (error) {
    consecutiveFailures++;
    // Only log the first failure and every 10th after that to reduce console noise
    if (consecutiveFailures === 1 || consecutiveFailures % 10 === 0) {
      console.warn(
        `[PersistentNotification] Poll error (attempt ${consecutiveFailures}):`,
        (error as any)?.message || error,
      );
    }
  }
}

function shouldReAlert(notif: Notification, nowMs: number): boolean {
  const intervalSec = notif.repeat_interval_seconds || 300; // default 5 min
  const maxRepeats = notif.max_repeats || 999;
  const repeatCount = notif.repeat_count || 0;

  // Check max repeats
  if (repeatCount >= maxRepeats) return false;

  // Check minimum gap
  if (intervalSec < MIN_RE_ALERT_GAP_SECONDS) return false;

  // Check time since last repeat
  const lastRepeat = notif.last_repeated_at
    ? new Date(notif.last_repeated_at).getTime()
    : new Date(notif.created_at).getTime();

  const elapsedSec = (nowMs - lastRepeat) / 1000;

  return elapsedSec >= intervalSec;
}

function playAlertSound(alerts: Notification[]): void {
  // Determine the most urgent alert to pick the sound
  const hasCritical = alerts.some((a) => a.priority === 'Critical');
  const hasHigh = alerts.some((a) => a.priority === 'High');

  if (hasCritical) {
    playPresetSound('urgent', 100);
  } else if (hasHigh) {
    playPresetSound('alert', 90);
  } else {
    playPresetSound('bell', 80);
  }

  // Also show a desktop notification for the most important one
  const topAlert = alerts.sort((a, b) => {
    const priorityOrder = { Critical: 0, High: 1, Normal: 2, Low: 3 };
    return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
  })[0];

  if (
    topAlert &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    try {
      const desktopNotif = new Notification(topAlert.title, {
        body: topAlert.message,
        icon: '/icons/notification-icon.png',
        tag: topAlert.id,
        requireInteraction: true,
      });
      desktopNotif.onclick = () => {
        window.focus();
        desktopNotif.close();
      };
    } catch (e) {
      // Desktop notifications not available in some environments
    }
  }
}

function notifyListeners(newAlerts: Notification[]): void {
  for (const listener of state.listeners) {
    try {
      listener(state.notifications, newAlerts);
    } catch (e) {
      console.error('[PersistentNotification] Listener error:', e);
    }
  }
}
