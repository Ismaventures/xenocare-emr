// Notification Types for EMR System
// Generated: December 20, 2025

// =====================================================
// ENUMS
// =====================================================

export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Critical';

export type NotificationType =
  | 'Queue'
  | 'Payment'
  | 'LabResult'
  | 'RadiologyResult'
  | 'Prescription'
  | 'Referral'
  | 'Triage'
  | 'CriticalValue'
  | 'SystemAlert'
  | 'Reminder'
  | 'Message'
  | 'MedicationDue'
  | 'MedicationOverdue'
  | 'CareTeamAction'
  | 'NHISRequest'
  | 'ModuleRequest';

export type NotificationStatus = 'Unread' | 'Read' | 'Archived' | 'Dismissed';

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export interface Notification {
  id: string;

  // Targeting
  user_id?: string;
  target_role?: string;
  department_id?: string;

  // Content
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;

  // Related entity
  entity_type?: string;
  entity_id?: string;

  // Action
  action_url?: string;
  action_label?: string;

  // Status
  status: NotificationStatus;
  is_read: boolean;
  read_at?: string;

  // Metadata
  metadata: Record<string, unknown>;

  // Expiration
  expires_at?: string;

  // Persistent notification fields
  is_persistent: boolean;
  requires_acknowledgement: boolean;
  acknowledged_at?: string;
  repeat_interval_seconds?: number;
  max_repeats?: number;
  repeat_count: number;
  last_repeated_at?: string;
  escalation_level: number;
  snoozed_until?: string;
  source_module?: string;

  // Timestamps
  created_at: string;
  created_by?: string;
}

export interface NotificationWithRelations extends Notification {
  created_by_user?: {
    id: string;
    full_name: string;
  };
}

// =====================================================
// NOTIFICATION PREFERENCES
// =====================================================

export interface NotificationPreferences {
  id: string;
  user_id: string;

  // Channel preferences
  in_app_enabled: boolean;
  sound_enabled: boolean;
  desktop_enabled: boolean;
  email_enabled: boolean;

  // Type preferences
  enabled_types: NotificationType[];

  // Priority threshold
  min_priority: NotificationPriority;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;

  // Grouping
  group_similar: boolean;
  group_interval_seconds: number;

  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesDTO {
  in_app_enabled?: boolean;
  sound_enabled?: boolean;
  desktop_enabled?: boolean;
  email_enabled?: boolean;
  enabled_types?: NotificationType[];
  min_priority?: NotificationPriority;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  group_similar?: boolean;
  group_interval_seconds?: number;
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

export interface NotificationTemplate {
  id: string;
  code: string;
  type: NotificationType;
  priority: NotificationPriority;
  title_template: string;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// CREATE NOTIFICATION DTOs
// =====================================================

export interface CreateNotificationDTO {
  user_id?: string;
  target_role?: string;
  department_id?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
  is_persistent?: boolean;
  requires_acknowledgement?: boolean;
  repeat_interval_seconds?: number;
  max_repeats?: number;
  source_module?: string;
}

export interface CreateBulkNotificationDTO {
  user_ids?: string[];
  target_roles?: string[];
  department_ids?: string[];
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
}

// =====================================================
// NOTIFICATION COUNT
// =====================================================

export interface NotificationCount {
  total: number;
  unread: number;
  high_priority: number;
  by_type: Partial<Record<NotificationType, number>>;
}

// =====================================================
// NOTIFICATION EVENTS (for real-time)
// =====================================================

export interface NotificationEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  notification: Notification;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    Queue: '👥',
    Payment: '💳',
    LabResult: '🧪',
    RadiologyResult: '📷',
    Prescription: '💊',
    Referral: '↗️',
    Triage: '🏥',
    CriticalValue: '⚠️',
    SystemAlert: '🔔',
    Reminder: '⏰',
    Message: '💬',
    MedicationDue: '💊',
    MedicationOverdue: '🚨',
    CareTeamAction: '👨‍⚕️',
    NHISRequest: '🛡️',
    ModuleRequest: '📥',
  };
  return icons[type] || '📢';
}

export function getNotificationColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    Low: 'text-gray-500',
    Normal: 'text-blue-500',
    High: 'text-orange-500',
    Critical: 'text-red-500',
  };
  return colors[priority];
}

export function getNotificationBgColor(priority: NotificationPriority): string {
  const colors: Record<NotificationPriority, string> = {
    Low: 'bg-gray-50',
    Normal: 'bg-blue-50',
    High: 'bg-orange-50',
    Critical: 'bg-red-50',
  };
  return colors[priority];
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function shouldPlaySound(
  notification: Notification,
  preferences: NotificationPreferences,
): boolean {
  if (!preferences.sound_enabled) return false;
  if (!preferences.in_app_enabled) return false;
  if (!preferences.enabled_types.includes(notification.type)) return false;

  const priorityOrder: NotificationPriority[] = [
    'Low',
    'Normal',
    'High',
    'Critical',
  ];
  const minIndex = priorityOrder.indexOf(preferences.min_priority);
  const notifIndex = priorityOrder.indexOf(notification.priority);

  if (notifIndex < minIndex) return false;

  // Check quiet hours
  if (
    preferences.quiet_hours_enabled &&
    preferences.quiet_hours_start &&
    preferences.quiet_hours_end
  ) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (
      currentTime >= preferences.quiet_hours_start &&
      currentTime <= preferences.quiet_hours_end
    ) {
      // In quiet hours - only play for Critical
      return notification.priority === 'Critical';
    }
  }

  return true;
}

export function groupNotifications(
  notifications: Notification[],
  intervalSeconds: number = 60,
): Notification[][] {
  if (notifications.length === 0) return [];

  const sorted = [...notifications].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const groups: Notification[][] = [];
  let currentGroup: Notification[] = [sorted[0]];
  let currentGroupTime = new Date(sorted[0].created_at).getTime();

  for (let i = 1; i < sorted.length; i++) {
    const notification = sorted[i];
    const notifTime = new Date(notification.created_at).getTime();

    // Check if same type and within interval
    if (
      notification.type === currentGroup[0].type &&
      currentGroupTime - notifTime <= intervalSeconds * 1000
    ) {
      currentGroup.push(notification);
    } else {
      groups.push(currentGroup);
      currentGroup = [notification];
      currentGroupTime = notifTime;
    }
  }

  groups.push(currentGroup);
  return groups;
}
