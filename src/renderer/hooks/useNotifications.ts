/**
 * useNotifications Hook
 *
 * Provides real-time notification management for the EMR system.
 * Supports subscribing to new notifications and managing notification state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('Notifications');

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'treatment_plan_created'
  | 'treatment_plan_updated'
  | 'order_placed'
  | 'order_accepted'
  | 'order_rejected'
  | 'result_ready'
  | 'result_critical'
  | 'admission_request'
  | 'admission_confirmed'
  | 'discharge_ready'
  | 'vitals_overdue'
  | 'medication_due'
  | 'shift_handover'
  | 'consultation_request'
  | 'encounter_assigned'
  | 'encounter_transferred'
  | 'system_alert'
  | 'billing_alert';

export type NotificationPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  target_user_id: string | null;
  target_role: string | null;
  target_department: string | null;
  encounter_id: string | null;
  patient_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  read_at: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
}

export interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  dismissAll: () => Promise<void>;
  refresh: () => Promise<void>;
  createNotification: (data: CreateNotificationData) => Promise<string>;
}

export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  targetUserId?: string;
  targetRole?: string;
  targetDepartment?: string;
  encounterId?: string;
  patientId?: string;
  referenceType?: string;
  referenceId?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useNotifications(
  filters: NotificationFilters = {},
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { user, staff } = useAuth();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user || !staff?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build query for notifications targeted to this user
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('is_dismissed', false)
        .or(
          `target_user_id.eq.${staff.id},` +
            `and(target_user_id.is.null,target_role.eq.${staff.role}),` +
            `and(target_user_id.is.null,target_role.is.null),` +
            `target_user_id.is.null`,
        )
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(50); // Default limit
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Filter out expired notifications
      const now = new Date();
      const validNotifications = (data || []).filter((n: Notification) => {
        if (!n.expires_at) return true;
        return new Date(n.expires_at) > now;
      });

      setNotifications(validNotifications);
      setUnreadCount(
        validNotifications.filter((n: Notification) => !n.is_read).length,
      );
    } catch (err) {
      log.error('Error fetching notifications:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to fetch notifications'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    staff?.id,
    staff?.role,
    filters.type,
    filters.priority,
    filters.isRead,
    filters.limit,
  ]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !staff?.id) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Check if this notification is targeted to the current user
          const isTargeted =
            newNotification.target_user_id === staff.id ||
            (newNotification.target_user_id === null &&
              newNotification.target_role === staff.role) ||
            (newNotification.target_user_id === null &&
              newNotification.target_role === null);

          if (isTargeted) {
            setNotifications((prev) => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }

            // Show browser notification for high priority
            if (
              ['high', 'urgent', 'critical'].includes(newNotification.priority)
            ) {
              showBrowserNotification(newNotification);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updatedNotification.id ? updatedNotification : n,
            ),
          );
          // Recalculate unread count
          setNotifications((current) => {
            setUnreadCount(current.filter((n) => !n.is_read).length);
            return current;
          });
        },
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Initial fetch
    fetchNotifications();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, staff?.id, staff?.role, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      log.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!staff?.id) return;

    try {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (err) {
      log.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, [staff?.id, notifications]);

  // Dismiss notification
  const dismiss = useCallback(
    async (notificationId: string) => {
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            is_dismissed: true,
            dismissed_at: new Date().toISOString(),
          })
          .eq('id', notificationId);

        if (updateError) throw updateError;

        const dismissedNotification = notifications.find(
          (n) => n.id === notificationId,
        );
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (dismissedNotification && !dismissedNotification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        log.error('Error dismissing notification:', err);
        throw err;
      }
    },
    [notifications],
  );

  // Dismiss all notifications
  const dismissAll = useCallback(async () => {
    if (notifications.length === 0) return;

    try {
      const ids = notifications.map((n) => n.id);

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .in('id', ids);

      if (updateError) throw updateError;

      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      log.error('Error dismissing all notifications:', err);
      throw err;
    }
  }, [notifications]);

  // Create a new notification
  const createNotification = useCallback(
    async (data: CreateNotificationData): Promise<string> => {
      const { data: result, error: insertError } = await supabase
        .from('notifications')
        .insert({
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority || 'normal',
          target_user_id: data.targetUserId || null,
          target_role: data.targetRole || null,
          target_department: data.targetDepartment || null,
          encounter_id: data.encounterId || null,
          patient_id: data.patientId || null,
          reference_type: data.referenceType || null,
          reference_id: data.referenceId || null,
          action_url: data.actionUrl || null,
          action_label: data.actionLabel || null,
          created_by: staff?.id,
          expires_at: data.expiresAt || null,
          metadata: data.metadata || {},
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return result.id;
    },
    [staff?.id],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
    refresh: fetchNotifications,
    createNotification,
  };
}

// =============================================================================
// Helper: Browser Notification
// =============================================================================

function showBrowserNotification(notification: Notification) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/notification.png',
      tag: notification.id,
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/notification.png',
          tag: notification.id,
        });
      }
    });
  }
}

// =============================================================================
// Utility: Create notification from API
// =============================================================================

export async function createNotificationAPI(
  data: CreateNotificationData,
  createdBy?: string,
): Promise<string> {
  const { data: result, error: insertError } = await supabase
    .from('notifications')
    .insert({
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority || 'normal',
      target_user_id: data.targetUserId || null,
      target_role: data.targetRole || null,
      target_department: data.targetDepartment || null,
      encounter_id: data.encounterId || null,
      patient_id: data.patientId || null,
      reference_type: data.referenceType || null,
      reference_id: data.referenceId || null,
      action_url: data.actionUrl || null,
      action_label: data.actionLabel || null,
      created_by: createdBy || null,
      expires_at: data.expiresAt || null,
      metadata: data.metadata || {},
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return result.id;
}

export default useNotifications;