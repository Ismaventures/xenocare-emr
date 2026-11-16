// =============================================================================
// Unified Notification Trigger Service
// =============================================================================
// Central service for triggering notifications across all modules with:
// - Sound playback based on user preferences
// - Desktop notifications
// - In-app notifications
// - Real-time subscription handling
// =============================================================================

import { supabase } from '../../api/supabaseClient';
import { createNotification } from './api';
import {
  playPresetSound,
  getEffectiveNotificationSettings,
  isInQuietHours,
  getUserMasterNotificationSettings,
} from './sound.service';
import type {
  CreateNotificationDTO,
  NotificationPriority,
} from '../../types/notifications.types';

// =============================================================================
// Types
// =============================================================================

export type ModuleNotificationType =
  | 'lab_request'
  | 'lab_result'
  | 'lab_critical'
  | 'radiology_request'
  | 'radiology_result'
  | 'procedure_request'
  | 'prescription'
  | 'consultation_request'
  | 'referral'
  | 'treatment_plan'
  | 'vitals_alert'
  | 'nursing_note'
  | 'doctor_note'
  | 'patient_queue'
  | 'patient_admission'
  | 'patient_discharge'
  | 'encounter_assigned'
  | 'encounter_transferred'
  | 'billing_invoice'
  | 'payment_received'
  | 'billing_alert'
  | 'new_message'
  | 'message_reply'
  | 'broadcast_message'
  | 'system_alert'
  | 'reminder'
  | 'announcement'
  // eMAR types
  | 'emar_medication_due'
  | 'emar_medication_overdue'
  | 'emar_medication_administered'
  | 'emar_medication_refused'
  // Care team types
  | 'care_team_note_added'
  | 'care_team_order_placed'
  | 'ward_round_completed'
  | 'care_team_action_performed'
  // NHIS types
  | 'nhis_request_received'
  | 'nhis_claim_status_update'
  | 'nhis_authorization_needed'
  | 'nhis_authorization_approved'
  // Cross-module types
  | 'module_request_received'
  | 'module_request_completed'
  | 'patient_critical_event';

export interface TriggerNotificationOptions {
  /** The type of notification (determines sound and settings) */
  notificationType: ModuleNotificationType;

  /** Notification title */
  title: string;

  /** Notification message/body */
  message: string;

  /** Priority level */
  priority?: NotificationPriority;

  /** Target user ID (for direct notifications) */
  targetUserId?: string;

  /** Target role (for role-based notifications) */
  targetRole?: string;

  /** Target department ID */
  targetDepartmentId?: string;

  /** Related entity type (e.g., 'lab_request', 'prescription') */
  entityType?: string;

  /** Related entity ID */
  entityId?: string;

  /** Action URL for the notification */
  actionUrl?: string;

  /** Action button label */
  actionLabel?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Force sound even in quiet hours (for emergencies) */
  forceSound?: boolean;

  /** Play sound immediately (for local notifications) */
  playSound?: boolean;

  /** Current user ID (for sound playback) */
  currentUserId?: string;

  /** Whether notification should persist until acknowledged */
  isPersistent?: boolean;

  /** Whether notification requires explicit acknowledgement */
  requiresAcknowledgement?: boolean;

  /** How often to re-alert (seconds) */
  repeatIntervalSeconds?: number;

  /** Max number of repeat alerts */
  maxRepeats?: number;

  /** Source module name */
  sourceModule?: string;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  soundPlayed: boolean;
  desktopNotificationShown: boolean;
  error?: string;
}

// =============================================================================
// Module Type to Notification Type Mapping
// =============================================================================

const MODULE_TO_NOTIFICATION_TYPE: Record<ModuleNotificationType, string> = {
  lab_request: 'LabResult',
  lab_result: 'LabResult',
  lab_critical: 'CriticalValue',
  radiology_request: 'RadiologyResult',
  radiology_result: 'RadiologyResult',
  procedure_request: 'SystemAlert',
  prescription: 'Prescription',
  consultation_request: 'Referral',
  referral: 'Referral',
  treatment_plan: 'SystemAlert',
  vitals_alert: 'CriticalValue',
  nursing_note: 'SystemAlert',
  doctor_note: 'SystemAlert',
  patient_queue: 'Queue',
  patient_admission: 'SystemAlert',
  patient_discharge: 'SystemAlert',
  encounter_assigned: 'SystemAlert',
  encounter_transferred: 'SystemAlert',
  billing_invoice: 'Payment',
  payment_received: 'Payment',
  billing_alert: 'Payment',
  new_message: 'Message',
  message_reply: 'Message',
  broadcast_message: 'Message',
  system_alert: 'SystemAlert',
  reminder: 'Reminder',
  announcement: 'SystemAlert',
  // eMAR types
  emar_medication_due: 'MedicationDue',
  emar_medication_overdue: 'MedicationOverdue',
  emar_medication_administered: 'CareTeamAction',
  emar_medication_refused: 'CareTeamAction',
  // Care team types
  care_team_note_added: 'CareTeamAction',
  care_team_order_placed: 'CareTeamAction',
  ward_round_completed: 'CareTeamAction',
  care_team_action_performed: 'CareTeamAction',
  // NHIS types
  nhis_request_received: 'NHISRequest',
  nhis_claim_status_update: 'NHISRequest',
  nhis_authorization_needed: 'NHISRequest',
  nhis_authorization_approved: 'NHISRequest',
  // Cross-module
  module_request_received: 'ModuleRequest',
  module_request_completed: 'ModuleRequest',
  patient_critical_event: 'CriticalValue',
};

// =============================================================================
// Main Trigger Function
// =============================================================================

/**
 * Trigger a notification with sound, desktop notification, and database entry
 */
export async function triggerNotification(
  options: TriggerNotificationOptions,
): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    soundPlayed: false,
    desktopNotificationShown: false,
  };

  try {
    // Map module type to notification type
    const notificationType =
      MODULE_TO_NOTIFICATION_TYPE[options.notificationType] || 'SystemAlert';

    // Create the notification DTO
    const dto: CreateNotificationDTO = {
      user_id: options.targetUserId,
      target_role: options.targetRole,
      department_id: options.targetDepartmentId,
      type: notificationType as any,
      priority: options.priority || 'Normal',
      title: options.title,
      message: options.message,
      entity_type: options.entityType,
      entity_id: options.entityId,
      action_url: options.actionUrl,
      action_label: options.actionLabel,
      is_persistent: options.isPersistent,
      requires_acknowledgement: options.requiresAcknowledgement,
      repeat_interval_seconds: options.repeatIntervalSeconds,
      max_repeats: options.maxRepeats,
      source_module: options.sourceModule,
      metadata: {
        ...options.metadata,
        module_notification_type: options.notificationType,
      },
    };

    // Create notification in database
    const notification = await createNotification(dto);
    result.notificationId = notification.id;
    result.success = true;

    // Handle sound and desktop notification for current user
    if (options.playSound && options.currentUserId) {
      await handleLocalNotification(
        options.currentUserId,
        options.notificationType,
        options.title,
        options.message,
        options.priority || 'Normal',
        options.forceSound,
        result,
      );
    }

    return result;
  } catch (error) {
    console.error('Error triggering notification:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Handle local notification (sound + desktop) for the current user
 */
async function handleLocalNotification(
  userId: string,
  notificationType: ModuleNotificationType,
  title: string,
  message: string,
  priority: NotificationPriority,
  forceSound?: boolean,
  result?: NotificationResult,
): Promise<void> {
  try {
    // Get master settings
    const masterSettings = await getUserMasterNotificationSettings(userId);

    // Check if notifications are enabled
    if (masterSettings && !masterSettings.notifications_enabled) {
      return;
    }

    // Check quiet hours (unless forced or urgent/critical)
    const isUrgent = priority === 'High' || priority === 'Critical';
    if (!forceSound && !isUrgent) {
      const inQuietHours = await isInQuietHours(userId);
      if (inQuietHours) {
        // Check if urgent notifications are allowed in quiet hours
        if (masterSettings?.quiet_hours_allow_urgent && !isUrgent) {
          return;
        }
      }
    }

    // Get effective settings for this notification type
    const settings = await getEffectiveNotificationSettings(
      userId,
      notificationType,
    );

    if (!settings || !settings.is_enabled) {
      return;
    }

    // Play sound if enabled
    if (masterSettings?.sound_enabled !== false && settings.sound !== 'none') {
      playPresetSound(settings.sound, settings.volume);
      if (result) result.soundPlayed = true;
    }

    // Show desktop notification if enabled
    if (settings.desktop_notification && 'Notification' in window) {
      await showDesktopNotification(title, message, result);
    }
  } catch (error) {
    console.error('Error handling local notification:', error);
  }
}

/**
 * Show a desktop notification
 */
async function showDesktopNotification(
  title: string,
  body: string,
  result?: NotificationResult,
): Promise<void> {
  try {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
      });
      if (result) result.desktopNotificationShown = true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
        });
        if (result) result.desktopNotificationShown = true;
      }
    }
  } catch (error) {
    console.error('Error showing desktop notification:', error);
  }
}

// =============================================================================
// Convenience Functions for Each Module
// =============================================================================

/**
 * Notify about a new lab request
 */
export async function notifyLabRequest(
  patientName: string,
  testName: string,
  urgency: 'Routine' | 'Urgent' | 'Emergency',
  requestId: string,
  targetDepartmentId?: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  const priority: NotificationPriority =
    urgency === 'Emergency'
      ? 'Critical'
      : urgency === 'Urgent'
        ? 'High'
        : 'Normal';

  return triggerNotification({
    notificationType: 'lab_request',
    title: `New Lab Request: ${testName}`,
    message: `${patientName} - ${urgency} priority`,
    priority,
    targetDepartmentId,
    entityType: 'lab_request',
    entityId: requestId,
    actionUrl: `/lab-requests/${requestId}`,
    actionLabel: 'View Request',
    playSound: true,
    currentUserId,
    metadata: { patient_name: patientName, test_name: testName, urgency },
  });
}

/**
 * Notify about lab result ready
 */
export async function notifyLabResult(
  patientName: string,
  testName: string,
  isCritical: boolean,
  resultId: string,
  doctorId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: isCritical ? 'lab_critical' : 'lab_result',
    title: isCritical
      ? `🚨 CRITICAL LAB VALUE: ${testName}`
      : `Lab Result Ready: ${testName}`,
    message: `${patientName} - ${isCritical ? 'Immediate action required' : 'Results available for review'}`,
    priority: isCritical ? 'Critical' : 'Normal',
    targetUserId: doctorId,
    entityType: 'lab_result',
    entityId: resultId,
    actionUrl: `/lab-results/${resultId}`,
    actionLabel: 'View Result',
    playSound: true,
    currentUserId,
    forceSound: isCritical,
    metadata: {
      patient_name: patientName,
      test_name: testName,
      is_critical: isCritical,
    },
  });
}

/**
 * Notify about a new radiology request
 */
export async function notifyRadiologyRequest(
  patientName: string,
  examType: string,
  urgency: 'Routine' | 'Urgent' | 'Emergency',
  requestId: string,
  targetDepartmentId?: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  const priority: NotificationPriority =
    urgency === 'Emergency'
      ? 'Critical'
      : urgency === 'Urgent'
        ? 'High'
        : 'Normal';

  return triggerNotification({
    notificationType: 'radiology_request',
    title: `New Radiology Request: ${examType}`,
    message: `${patientName} - ${urgency} priority`,
    priority,
    targetDepartmentId,
    entityType: 'radiology_request',
    entityId: requestId,
    actionUrl: `/radiology-requests/${requestId}`,
    actionLabel: 'View Request',
    playSound: true,
    currentUserId,
    metadata: { patient_name: patientName, exam_type: examType, urgency },
  });
}

/**
 * Notify about consultation request
 */
export async function notifyConsultationRequest(
  patientName: string,
  fromDoctor: string,
  specialty: string,
  consultationId: string,
  targetDoctorId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'consultation_request',
    title: `Consultation Request: ${specialty}`,
    message: `Dr. ${fromDoctor} requesting consultation for ${patientName}`,
    priority: 'High',
    targetUserId: targetDoctorId,
    entityType: 'consultation',
    entityId: consultationId,
    actionUrl: `/consultations/${consultationId}`,
    actionLabel: 'View Request',
    playSound: true,
    currentUserId,
    metadata: { patient_name: patientName, from_doctor: fromDoctor, specialty },
  });
}

/**
 * Notify about new prescription
 */
export async function notifyPrescription(
  patientName: string,
  drugCount: number,
  prescriptionId: string,
  targetDepartmentId?: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'prescription',
    title: 'New Prescription',
    message: `${patientName} - ${drugCount} medication(s) to dispense`,
    priority: 'Normal',
    targetDepartmentId,
    entityType: 'prescription',
    entityId: prescriptionId,
    actionUrl: `/pharmacy/prescriptions/${prescriptionId}`,
    actionLabel: 'View Prescription',
    playSound: true,
    currentUserId,
    metadata: { patient_name: patientName, drug_count: drugCount },
  });
}

/**
 * Notify about new message
 */
export async function notifyNewMessage(
  senderName: string,
  subject: string,
  messageId: string,
  recipientId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'new_message',
    title: `New Message from ${senderName}`,
    message: subject,
    priority: 'Normal',
    targetUserId: recipientId,
    entityType: 'message',
    entityId: messageId,
    actionUrl: `/messages?id=${messageId}`,
    actionLabel: 'Read Message',
    playSound: true,
    currentUserId,
    metadata: { sender_name: senderName, subject },
  });
}

/**
 * Notify about payment received
 */
export async function notifyPaymentReceived(
  patientName: string,
  amount: number,
  invoiceNumber: string,
  paymentId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'payment_received',
    title: 'Payment Received',
    message: `₦${amount.toLocaleString()} received from ${patientName} (${invoiceNumber})`,
    priority: 'Normal',
    entityType: 'payment',
    entityId: paymentId,
    actionUrl: `/billing/payments/${paymentId}`,
    actionLabel: 'View Payment',
    playSound: true,
    currentUserId,
    metadata: {
      patient_name: patientName,
      amount,
      invoice_number: invoiceNumber,
    },
  });
}

/**
 * Notify about patient in queue
 */
export async function notifyPatientQueue(
  patientName: string,
  department: string,
  queuePosition: number,
  encounterId: string,
  targetUserId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'patient_queue',
    title: 'New Patient in Queue',
    message: `${patientName} is #${queuePosition} in ${department} queue`,
    priority: 'Normal',
    targetUserId,
    entityType: 'encounter',
    entityId: encounterId,
    actionUrl: `/encounters/${encounterId}`,
    actionLabel: 'View Patient',
    playSound: true,
    currentUserId,
    metadata: {
      patient_name: patientName,
      department,
      queue_position: queuePosition,
    },
  });
}

/**
 * Notify about vital signs alert
 */
export async function notifyVitalsAlert(
  patientName: string,
  alertType: string,
  vitalValue: string,
  encounterId: string,
  targetUserId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'vitals_alert',
    title: `⚠️ Vitals Alert: ${alertType}`,
    message: `${patientName} - ${vitalValue}`,
    priority: 'High',
    targetUserId,
    entityType: 'encounter',
    entityId: encounterId,
    actionUrl: `/encounters/${encounterId}/vitals`,
    actionLabel: 'View Vitals',
    playSound: true,
    currentUserId,
    forceSound: true,
    metadata: {
      patient_name: patientName,
      alert_type: alertType,
      vital_value: vitalValue,
    },
  });
}

/**
 * Notify about procedure request
 */
export async function notifyProcedureRequest(
  patientName: string,
  procedureName: string,
  urgency: 'Routine' | 'Urgent' | 'Emergency',
  requestId: string,
  targetDepartmentId?: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  const priority: NotificationPriority =
    urgency === 'Emergency'
      ? 'Critical'
      : urgency === 'Urgent'
        ? 'High'
        : 'Normal';

  return triggerNotification({
    notificationType: 'procedure_request',
    title: `New Procedure Request: ${procedureName}`,
    message: `${patientName} - ${urgency} priority`,
    priority,
    targetDepartmentId,
    entityType: 'procedure_request',
    entityId: requestId,
    actionUrl: `/procedures/${requestId}`,
    actionLabel: 'View Request',
    playSound: true,
    currentUserId,
    metadata: {
      patient_name: patientName,
      procedure_name: procedureName,
      urgency,
    },
  });
}

// =============================================================================
// Real-time Subscription for Incoming Notifications
// =============================================================================

/**
 * Subscribe to notifications for a user and play sounds
 */
export function subscribeToUserNotifications(
  userId: string,
  onNotification?: (notification: any) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `target_user_id=eq.${userId}`,
      },
      async (payload) => {
        const notification = payload.new as any;

        // Get the module notification type from metadata
        const moduleType = notification.metadata?.module_notification_type as
          | ModuleNotificationType
          | undefined;

        if (moduleType) {
          // Handle local notification (sound + desktop)
          await handleLocalNotification(
            userId,
            moduleType,
            notification.title,
            notification.message,
            notification.priority,
          );
        }

        // Call custom handler
        onNotification?.(notification);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// =============================================================================
// Broadcast Notification (for announcements)
// =============================================================================

/**
 * Send a broadcast notification to multiple recipients
 */
export async function sendBroadcastNotification(
  title: string,
  message: string,
  options: {
    targetRoles?: string[];
    targetDepartmentIds?: string[];
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  // Create notifications for each target
  if (options.targetRoles) {
    for (const role of options.targetRoles) {
      const result = await triggerNotification({
        notificationType: 'broadcast_message',
        title,
        message,
        priority: options.priority || 'High',
        targetRole: role,
        metadata: options.metadata,
      });
      results.push(result);
    }
  }

  if (options.targetDepartmentIds) {
    for (const deptId of options.targetDepartmentIds) {
      const result = await triggerNotification({
        notificationType: 'broadcast_message',
        title,
        message,
        priority: options.priority || 'High',
        targetDepartmentId: deptId,
        metadata: options.metadata,
      });
      results.push(result);
    }
  }

  return results;
}

// =============================================================================
// eMAR Medication Notification Functions
// =============================================================================

/**
 * Notify nurse about medication due for administration
 * This is a PERSISTENT notification - it will keep popping up until acknowledged
 */
export async function notifyMedicationDue(
  patientName: string,
  medicationName: string,
  dose: string,
  scheduledTime: string,
  scheduleId: string,
  targetNurseId: string,
  encounterId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'emar_medication_due',
    title: `💊 Medication Due: ${medicationName}`,
    message: `${patientName} - ${dose} due at ${scheduledTime}`,
    priority: 'High',
    targetUserId: targetNurseId,
    entityType: 'medication_schedule',
    entityId: scheduleId,
    actionUrl: `/in-patient?encounter=${encounterId}&tab=medications`,
    actionLabel: 'Administer Now',
    playSound: true,
    currentUserId,
    isPersistent: true,
    requiresAcknowledgement: true,
    repeatIntervalSeconds: 120, // Re-alert every 2 minutes
    maxRepeats: 30,
    sourceModule: 'emar',
    metadata: {
      patient_name: patientName,
      medication_name: medicationName,
      dose,
      scheduled_time: scheduledTime,
      encounter_id: encounterId,
    },
  });
}

/**
 * Notify nurse about OVERDUE medication (escalation)
 */
export async function notifyMedicationOverdue(
  patientName: string,
  medicationName: string,
  dose: string,
  minutesOverdue: number,
  scheduleId: string,
  targetNurseId: string,
  encounterId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'emar_medication_overdue',
    title: `🚨 OVERDUE Medication: ${medicationName}`,
    message: `${patientName} - ${dose} is ${minutesOverdue} min overdue! Immediate attention required.`,
    priority: 'Critical',
    targetUserId: targetNurseId,
    entityType: 'medication_schedule',
    entityId: scheduleId,
    actionUrl: `/in-patient?encounter=${encounterId}&tab=medications`,
    actionLabel: 'Administer Now',
    playSound: true,
    currentUserId,
    forceSound: true,
    isPersistent: true,
    requiresAcknowledgement: true,
    repeatIntervalSeconds: 60, // Escalate every 1 minute for overdue
    maxRepeats: 60,
    sourceModule: 'emar',
    metadata: {
      patient_name: patientName,
      medication_name: medicationName,
      dose,
      minutes_overdue: minutesOverdue,
      encounter_id: encounterId,
    },
  });
}

/**
 * Notify doctor that medication has been administered
 */
export async function notifyMedicationAdministered(
  patientName: string,
  medicationName: string,
  dose: string,
  nurseName: string,
  scheduleId: string,
  targetDoctorId: string,
  encounterId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'emar_medication_administered',
    title: `✅ Medication Given: ${medicationName}`,
    message: `${patientName} - ${dose} administered by ${nurseName}`,
    priority: 'Normal',
    targetUserId: targetDoctorId,
    entityType: 'medication_schedule',
    entityId: scheduleId,
    actionUrl: `/in-patient?encounter=${encounterId}&tab=medications`,
    actionLabel: 'View Record',
    playSound: true,
    currentUserId,
    sourceModule: 'emar',
    metadata: {
      patient_name: patientName,
      medication_name: medicationName,
      dose,
      nurse_name: nurseName,
      encounter_id: encounterId,
    },
  });
}

/**
 * Notify doctor that medication was refused/held
 */
export async function notifyMedicationRefused(
  patientName: string,
  medicationName: string,
  reason: string,
  nurseName: string,
  scheduleId: string,
  targetDoctorId: string,
  encounterId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'emar_medication_refused',
    title: `⚠️ Medication Refused/Held: ${medicationName}`,
    message: `${patientName} - ${reason}. Reported by ${nurseName}`,
    priority: 'High',
    targetUserId: targetDoctorId,
    entityType: 'medication_schedule',
    entityId: scheduleId,
    actionUrl: `/in-patient?encounter=${encounterId}&tab=medications`,
    actionLabel: 'Review',
    playSound: true,
    currentUserId,
    isPersistent: true,
    requiresAcknowledgement: true,
    repeatIntervalSeconds: 300, // Every 5 min
    maxRepeats: 12,
    sourceModule: 'emar',
    metadata: {
      patient_name: patientName,
      medication_name: medicationName,
      reason,
      nurse_name: nurseName,
      encounter_id: encounterId,
    },
  });
}

// =============================================================================
// Care Team Notification Functions
// =============================================================================

/**
 * Notify care team (admitting doctor + primary care team) about an action
 */
export async function notifyCareTeamAction(
  patientName: string,
  actionDescription: string,
  performedBy: string,
  actionType:
    | 'care_team_note_added'
    | 'care_team_order_placed'
    | 'ward_round_completed'
    | 'care_team_action_performed',
  entityType: string,
  entityId: string,
  encounterId: string,
  targetUserIds: string[],
  currentUserId?: string,
): Promise<NotificationResult[]> {
  const TITLES: Record<string, string> = {
    care_team_note_added: '📝 Note Added',
    care_team_order_placed: '📋 Order Placed',
    ward_round_completed: '🩺 Ward Round Completed',
    care_team_action_performed: '✅ Action Performed',
  };

  const results: NotificationResult[] = [];

  for (const targetId of targetUserIds) {
    if (targetId === currentUserId) continue; // Don't notify yourself
    const result = await triggerNotification({
      notificationType: actionType,
      title: `${TITLES[actionType] || 'Care Team Update'}: ${patientName}`,
      message: `${performedBy}: ${actionDescription}`,
      priority: 'Normal',
      targetUserId: targetId,
      entityType,
      entityId,
      actionUrl: `/in-patient?encounter=${encounterId}`,
      actionLabel: 'View Patient',
      playSound: true,
      currentUserId,
      isPersistent: true,
      requiresAcknowledgement: true,
      repeatIntervalSeconds: 600, // Every 10 min
      maxRepeats: 6,
      sourceModule: 'care_team',
      metadata: {
        patient_name: patientName,
        action_description: actionDescription,
        performed_by: performedBy,
        encounter_id: encounterId,
      },
    });
    results.push(result);
  }

  return results;
}

// =============================================================================
// NHIS Notification Functions
// =============================================================================

/**
 * Notify NHIS desk about a new request
 */
export async function notifyNHISRequest(
  patientName: string,
  requestType: string,
  requestDescription: string,
  requestId: string,
  targetDepartmentId?: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'nhis_request_received',
    title: `🛡️ NHIS Request: ${requestType}`,
    message: `${patientName} - ${requestDescription}`,
    priority: 'High',
    targetRole: 'billing_clerk',
    targetDepartmentId,
    entityType: 'nhis_request',
    entityId: requestId,
    actionUrl: `/nhis?request=${requestId}`,
    actionLabel: 'Process Request',
    playSound: true,
    currentUserId,
    isPersistent: true,
    requiresAcknowledgement: true,
    repeatIntervalSeconds: 300, // Every 5 min
    maxRepeats: 12,
    sourceModule: 'nhis',
    metadata: {
      patient_name: patientName,
      request_type: requestType,
      request_description: requestDescription,
    },
  });
}

/**
 * Notify about NHIS authorization needed
 */
export async function notifyNHISAuthorizationNeeded(
  patientName: string,
  procedureName: string,
  requestId: string,
  targetUserId?: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'nhis_authorization_needed',
    title: `⚠️ NHIS Authorization Required`,
    message: `${patientName} - ${procedureName} requires NHIS pre-authorization`,
    priority: 'High',
    targetUserId,
    targetRole: !targetUserId ? 'billing_clerk' : undefined,
    entityType: 'nhis_authorization',
    entityId: requestId,
    actionUrl: `/nhis/authorizations?id=${requestId}`,
    actionLabel: 'Process Authorization',
    playSound: true,
    currentUserId,
    forceSound: true,
    isPersistent: true,
    requiresAcknowledgement: true,
    repeatIntervalSeconds: 300,
    maxRepeats: 12,
    sourceModule: 'nhis',
    metadata: { patient_name: patientName, procedure_name: procedureName },
  });
}

/**
 * Notify about NHIS claim status update
 */
export async function notifyNHISClaimUpdate(
  patientName: string,
  claimNumber: string,
  newStatus: string,
  claimId: string,
  targetUserId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'nhis_claim_status_update',
    title: `NHIS Claim Update: ${claimNumber}`,
    message: `${patientName} - Claim status: ${newStatus}`,
    priority: 'Normal',
    targetUserId,
    entityType: 'nhis_claim',
    entityId: claimId,
    actionUrl: `/nhis/claims?id=${claimId}`,
    actionLabel: 'View Claim',
    playSound: true,
    currentUserId,
    sourceModule: 'nhis',
    metadata: {
      patient_name: patientName,
      claim_number: claimNumber,
      new_status: newStatus,
    },
  });
}

// =============================================================================
// Generic Module Request Notification
// =============================================================================

/**
 * Notify a department/user about a new module request (lab, radiology, pharmacy, etc.)
 */
export async function notifyModuleRequest(
  moduleName: string,
  patientName: string,
  requestDescription: string,
  requestId: string,
  options: {
    targetUserId?: string;
    targetRole?: string;
    targetDepartmentId?: string;
    priority?: NotificationPriority;
    encounterId?: string;
    currentUserId?: string;
    actionUrl?: string;
  } = {},
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'module_request_received',
    title: `📥 New ${moduleName} Request`,
    message: `${patientName} - ${requestDescription}`,
    priority: options.priority || 'High',
    targetUserId: options.targetUserId,
    targetRole: options.targetRole,
    targetDepartmentId: options.targetDepartmentId,
    entityType: `${moduleName.toLowerCase()}_request`,
    entityId: requestId,
    actionUrl:
      options.actionUrl || `/${moduleName.toLowerCase()}?request=${requestId}`,
    actionLabel: 'View Request',
    playSound: true,
    currentUserId: options.currentUserId,
    isPersistent: true,
    requiresAcknowledgement: true,
    repeatIntervalSeconds: 300, // Every 5 min
    maxRepeats: 12,
    sourceModule: moduleName.toLowerCase(),
    metadata: {
      module_name: moduleName,
      patient_name: patientName,
      request_description: requestDescription,
      encounter_id: options.encounterId,
    },
  });
}

/**
 * Notify the requester that their module request has been completed
 */
export async function notifyModuleRequestCompleted(
  moduleName: string,
  patientName: string,
  requestDescription: string,
  requestId: string,
  targetUserId: string,
  currentUserId?: string,
): Promise<NotificationResult> {
  return triggerNotification({
    notificationType: 'module_request_completed',
    title: `✅ ${moduleName} Request Completed`,
    message: `${patientName} - ${requestDescription}`,
    priority: 'Normal',
    targetUserId,
    entityType: `${moduleName.toLowerCase()}_request`,
    entityId: requestId,
    actionUrl: `/${moduleName.toLowerCase()}?request=${requestId}`,
    actionLabel: 'View Result',
    playSound: true,
    currentUserId,
    sourceModule: moduleName.toLowerCase(),
    metadata: {
      module_name: moduleName,
      patient_name: patientName,
      request_description: requestDescription,
    },
  });
}
