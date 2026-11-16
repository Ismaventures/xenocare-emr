// GlobalNotificationProvider.tsx
// App-level provider that manages:
// 1. Persistent notification engine lifecycle (start/stop on auth)
// 2. Real-time notification subscription for all notification types
// 3. Rendering the persistent notification popup overlay
// 4. Audio context initialization on user interaction

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  startPersistentEngine,
  stopPersistentEngine,
  onPersistentNotifications,
  triggerImmediatePoll,
  removeFromTracking,
} from '../../lib/notifications/persistent-notification.service';
import {
  acknowledgeNotification,
  subscribeToNotifications,
  getUnacknowledgedNotifications,
} from '../../lib/notifications/api';
import {
  initializeAudioContext,
  playPresetSound,
} from '../../lib/notifications/sound.service';
import {
  startEmarReminderEngine,
  stopEmarReminderEngine,
} from '../../lib/notifications/emar-reminder.service';
import { PersistentNotificationPopup } from './PersistentNotificationPopup';
import type { Notification } from '../../types/notifications.types';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('GlobalNotification');

// =====================================================
// CONTEXT
// =====================================================

interface GlobalNotificationContextType {
  /** Current unacknowledged persistent notifications */
  persistentNotifications: Notification[];
  /** Total count of persistent notifications */
  persistentCount: number;
  /** Whether there are critical unacknowledged notifications */
  hasCritical: boolean;
  /** Manually trigger a poll (e.g., after creating a notification) */
  refreshNotifications: () => void;
  /** Whether audio context has been initialized */
  audioReady: boolean;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType>({
  persistentNotifications: [],
  persistentCount: 0,
  hasCritical: false,
  refreshNotifications: () => {},
  audioReady: false,
});

export function useGlobalNotifications() {
  return useContext(GlobalNotificationContext);
}

// =====================================================
// PROVIDER COMPONENT
// =====================================================

export function GlobalNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { staff } = useAuth();
  const userId = staff?.id;

  const [persistentNotifications, setPersistentNotifications] = useState<
    Notification[]
  >([]);
  const [audioReady, setAudioReady] = useState(false);
  const unsubscribeRealtime = useRef<(() => void) | null>(null);
  const unsubscribePersistent = useRef<(() => void) | null>(null);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      const ctx = initializeAudioContext();
      if (ctx) {
        setAudioReady(true);
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };

    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    // Request desktop notification permission
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  // Start/stop persistent engine based on auth
  useEffect(() => {
    if (!userId) {
      stopPersistentEngine();
      stopEmarReminderEngine();
      setPersistentNotifications([]);

      // Clean up subscriptions
      if (unsubscribeRealtime.current) {
        unsubscribeRealtime.current();
        unsubscribeRealtime.current = null;
      }
      if (unsubscribePersistent.current) {
        unsubscribePersistent.current();
        unsubscribePersistent.current = null;
      }
      return;
    }

    // Start the persistent notification engine
    startPersistentEngine(userId, 30_000); // Poll every 30s

    // Start the eMAR reminder engine (only runs for nurse roles)
    const userRole = staff?.role || '';
    startEmarReminderEngine(userId, userRole, 60_000); // Check every 60s

    // Listen for persistent notification updates
    unsubscribePersistent.current = onPersistentNotifications(
      (notifications, newAlerts) => {
        setPersistentNotifications([...notifications]);
      },
    );

    // Subscribe to real-time notifications to handle new non-persistent ones
    unsubscribeRealtime.current = subscribeToNotifications(
      userId,
      (newNotif) => {
        // If this notification is persistent, trigger an immediate poll to pick it up
        if ((newNotif as Notification).is_persistent) {
          triggerImmediatePoll();
        } else {
          // For non-persistent notifications, play sound for high/critical ones
          if (newNotif.priority === 'Critical') {
            playPresetSound('urgent', 90);
          } else if (newNotif.priority === 'High') {
            playPresetSound('alert', 80);
          } else {
            playPresetSound('default', 70);
          }

          // Show desktop notification
          if (
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: '/icons/notification-icon.png',
                tag: newNotif.id,
              });
            } catch (e) {
              // Ignore
            }
          }
        }
      },
    );

    return () => {
      stopPersistentEngine();
      stopEmarReminderEngine();
      if (unsubscribeRealtime.current) {
        unsubscribeRealtime.current();
        unsubscribeRealtime.current = null;
      }
      if (unsubscribePersistent.current) {
        unsubscribePersistent.current();
        unsubscribePersistent.current = null;
      }
    };
  }, [userId, staff?.role]);

  // Handlers for popup actions
  const handleAcknowledge = useCallback((id: string) => {
    setPersistentNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleSnooze = useCallback((id: string, _minutes: number) => {
    setPersistentNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleDismissAll = useCallback(async () => {
    // Acknowledge all persistent notifications
    const promises = persistentNotifications.map(async (n) => {
      try {
        await acknowledgeNotification(n.id, userId);
        removeFromTracking(n.id);
      } catch (e) {
        log.error('Failed to acknowledge notification:', e);
      }
    });
    await Promise.all(promises);
    setPersistentNotifications([]);
  }, [persistentNotifications]);

  const refreshNotifications = useCallback(() => {
    triggerImmediatePoll();
  }, []);

  const hasCritical = persistentNotifications.some(
    (n) => n.priority === 'Critical',
  );

  const contextValue: GlobalNotificationContextType = {
    persistentNotifications,
    persistentCount: persistentNotifications.length,
    hasCritical,
    refreshNotifications,
    audioReady,
  };

  return (
    <GlobalNotificationContext.Provider value={contextValue}>
      {children}
      <PersistentNotificationPopup
        notifications={persistentNotifications}
        onAcknowledge={handleAcknowledge}
        onSnooze={handleSnooze}
        onDismissAll={handleDismissAll}
      />
    </GlobalNotificationContext.Provider>
  );
}

export default GlobalNotificationProvider;