// Notification API Functions
// Generated: December 20, 2025

import { supabase } from '../../api/supabaseClient';
import type {
  Notification,
  NotificationWithRelations,
  NotificationPreferences,
  NotificationTemplate,
  CreateNotificationDTO,
  UpdateNotificationPreferencesDTO,
  NotificationCount,
  NotificationType,
} from '../../types/notifications.types';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('NotificationsAPI');

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================

export async function getNotifications(
  userId: string,
  options?: {
    status?: 'Unread' | 'Read' | 'All';
    type?: NotificationType;
    limit?: number;
    offset?: number;
  },
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'All') {
    query = query.eq('is_read', options.status === 'Read');
  }

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1,
    );
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
}

export async function getUnreadNotifications(
  userId: string,
): Promise<Notification[]> {
  return getNotifications(userId, { status: 'Unread' });
}

export async function getNotificationCount(
  userId: string,
): Promise<NotificationCount> {
  const { data, error } = await supabase
    .from('notifications')
    .select('type, priority')
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    log.error('Error fetching notification count:', error);
    throw error;
  }

  const notifications = data || [];

  const byType: Partial<Record<NotificationType, number>> = {};
  let highPriority = 0;

  notifications.forEach((n) => {
    byType[n.type as NotificationType] =
      (byType[n.type as NotificationType] || 0) + 1;
    if (n.priority === 'High' || n.priority === 'Critical') {
      highPriority++;
    }
  });

  // All notifications in this query are unread (filtered by .eq('status', 'Unread'))
  return {
    total: notifications.length,
    unread: notifications.length,
    high_priority: highPriority,
    by_type: byType,
  };
}

export async function getNotificationById(
  id: string,
): Promise<NotificationWithRelations | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      *,
      created_by_user:staff!notifications_created_by_fkey(staff_id, full_name)
    `,
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    log.error('Error fetching notification:', error);
    throw error;
  }

  return data;
}

export async function createNotification(
  dto: CreateNotificationDTO,
): Promise<Notification> {
  // Build insertion payload, conditionally including persistent fields
  const insertPayload: Record<string, unknown> = {
    user_id: dto.user_id,
    target_role: dto.target_role,
    department_id: dto.department_id,
    type: dto.type,
    priority: dto.priority || 'Normal',
    title: dto.title,
    message: dto.message,
    entity_type: dto.entity_type,
    entity_id: dto.entity_id,
    action_url: dto.action_url,
    action_label: dto.action_label,
    metadata: dto.metadata || {},
    expires_at: dto.expires_at,
  };

  // Persistent notification fields
  if (dto.is_persistent !== undefined)
    insertPayload.is_persistent = dto.is_persistent;
  if (dto.requires_acknowledgement !== undefined)
    insertPayload.requires_acknowledgement = dto.requires_acknowledgement;
  if (dto.repeat_interval_seconds !== undefined)
    insertPayload.repeat_interval_seconds = dto.repeat_interval_seconds;
  if (dto.max_repeats !== undefined)
    insertPayload.max_repeats = dto.max_repeats;
  if (dto.source_module) insertPayload.source_module = dto.source_module;

  const { data, error } = await supabase
    .from('notifications')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    log.error('Error creating notification:', error);
    throw error;
  }

  return data;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      status: 'Read',
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) {
    log.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      status: 'Read',
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'Unread')
    .select('id');

  if (error) {
    log.error('Error marking all notifications as read:', error);
    throw error;
  }

  return data?.length || 0;
}

export async function dismissNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'Dismissed' })
    .eq('id', notificationId);

  if (error) {
    log.error('Error dismissing notification:', error);
    throw error;
  }
}

export async function archiveNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'Archived' })
    .eq('id', notificationId);

  if (error) {
    log.error('Error archiving notification:', error);
    throw error;
  }
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    log.error('Error deleting notification:', error);
    throw error;
  }
}

// =====================================================
// NOTIFICATION PREFERENCES
// =====================================================

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    log.error('Error fetching notification preferences:', error);
    throw error;
  }

  return data;
}

export async function updateNotificationPreferences(
  userId: string,
  dto: UpdateNotificationPreferencesDTO,
): Promise<NotificationPreferences> {
  // Try to update, if no row exists, insert
  const { data: existing } = await supabase
    .from('notification_preferences')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('notification_preferences')
      .update(dto)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      log.error('Error updating notification preferences:', error);
      throw error;
    }

    return data;
  }
  const { data, error } = await supabase
    .from('notification_preferences')
    .insert({
      user_id: userId,
      ...dto,
    })
    .select()
    .single();

  if (error) {
    log.error('Error creating notification preferences:', error);
    throw error;
  }

  return data;
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

export async function getNotificationTemplates(): Promise<
  NotificationTemplate[]
> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('is_active', true)
    .order('code');

  if (error) {
    log.error('Error fetching notification templates:', error);
    throw error;
  }

  return data || [];
}

export async function getNotificationTemplateByCode(
  code: string,
): Promise<NotificationTemplate | null> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    log.error('Error fetching notification template:', error);
    throw error;
  }

  return data;
}

// =====================================================
// REAL-TIME SUBSCRIPTION
// =====================================================

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// =====================================================
// PERSISTENT NOTIFICATION FUNCTIONS
// =====================================================

/**
 * Acknowledge a persistent notification - stops re-alerting
 */
export async function acknowledgeNotification(
  notificationId: string,
  userId?: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Update the notification itself
  const { error: notifError } = await supabase
    .from('notifications')
    .update({
      acknowledged_at: now,
      is_read: true,
      read_at: now,
    })
    .eq('id', notificationId);

  if (notifError) {
    log.error('Error acknowledging notification:', notifError);
    throw notifError;
  }

  // Also insert into acknowledgements table for audit trail (needs user_id)
  if (userId) {
    const { error: ackError } = await supabase
      .from('notification_acknowledgements')
      .upsert(
        {
          notification_id: notificationId,
          user_id: userId,
          acknowledged_at: now,
          action_taken: 'actioned',
        },
        { onConflict: 'notification_id,user_id' },
      );

    if (ackError) {
      // Non-fatal - the notification is already acknowledged
      log.warn('Error recording acknowledgement:', ackError);
    }
  }
}

/**
 * Snooze a persistent notification for given minutes
 */
export async function snoozeNotification(
  notificationId: string,
  snoozeMinutes: number,
): Promise<void> {
  const snoozedUntil = new Date(
    Date.now() + snoozeMinutes * 60_000,
  ).toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({ snoozed_until: snoozedUntil })
    .eq('id', notificationId);

  if (error) {
    log.error('Error snoozing notification:', error);
    throw error;
  }
}

/**
 * Get all unacknowledged persistent notifications for a user
 * Includes those that are due for re-alerting
 */
export async function getUnacknowledgedNotifications(
  userId: string,
): Promise<Notification[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_persistent', true)
    .eq('requires_acknowledgement', true)
    .is('acknowledged_at', null)
    .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
    .order('priority', { ascending: true }) // Critical first
    .order('created_at', { ascending: false });

  if (error) {
    // Suppress verbose logging for network errors (ERR_NAME_NOT_RESOLVED, Failed to fetch)
    const isNetworkError =
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError');
    if (!isNetworkError) {
      log.error('Error fetching unacknowledged notifications:', error);
    }
    throw error;
  }

  return data || [];
}

/**
 * Increment the repeat count for a persistent notification
 */
export async function incrementRepeatCount(
  notificationId: string,
): Promise<void> {
  // We use a raw rpc or manual increment
  const { data: current } = await supabase
    .from('notifications')
    .select('repeat_count, max_repeats')
    .eq('id', notificationId)
    .single();

  if (!current) return;

  const newCount = (current.repeat_count || 0) + 1;

  // If max repeats exhausted, auto-acknowledge
  if (current.max_repeats && newCount >= current.max_repeats) {
    await supabase
      .from('notifications')
      .update({
        repeat_count: newCount,
        last_repeated_at: new Date().toISOString(),
        // Don't auto-acknowledge - let it stay as final escalation
      })
      .eq('id', notificationId);
    return;
  }

  await supabase
    .from('notifications')
    .update({
      repeat_count: newCount,
      last_repeated_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function applyTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>,
): { title: string; message: string } {
  let title = template.title_template;
  let message = template.message_template;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), value);
    message = message.replace(new RegExp(placeholder, 'g'), value);
  });

  return { title, message };
}

// Convenience functions for common notifications
export async function notifyPaymentVerified(
  userId: string,
  patientName: string,
  visitId: string,
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: 'Payment',
    priority: 'Normal',
    title: 'Payment Verified',
    message: `Payment for ${patientName} has been verified. Patient is ready for next step.`,
    entity_type: 'visit',
    entity_id: visitId,
  });
}

export async function notifyLabResult(
  userId: string,
  patientName: string,
  testName: string,
  labRequestId: string,
  isCritical: boolean = false,
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: isCritical ? 'CriticalValue' : 'LabResult',
    priority: isCritical ? 'Critical' : 'Normal',
    title: isCritical ? 'CRITICAL Lab Result' : 'Lab Result Ready',
    message: isCritical
      ? `Critical lab value detected for ${patientName}: ${testName}`
      : `Lab results for ${patientName} (${testName}) are now available.`,
    entity_type: 'lab_request',
    entity_id: labRequestId,
  });
}

export async function notifyNewReferral(
  userId: string,
  patientName: string,
  sourceDepartment: string,
  referralId: string,
  priority: 'Routine' | 'Urgent' | 'Emergent',
): Promise<Notification> {
  return createNotification({
    user_id: userId,
    type: 'Referral',
    priority:
      priority === 'Emergent'
        ? 'Critical'
        : priority === 'Urgent'
          ? 'High'
          : 'Normal',
    title: `${priority} Referral Received`,
    message: `New referral for ${patientName} from ${sourceDepartment}.`,
    entity_type: 'referral',
    entity_id: referralId,
  });
}