// eMAR Reminder Service
// Polls for overdue and upcoming medications and triggers persistent notifications.
// This service runs on the client and checks the medication_schedule table.

import { supabase } from '../../api/supabaseClient';
import {
  notifyMedicationDue,
  notifyMedicationOverdue,
  notifyMedicationAdministered,
  notifyMedicationRefused,
} from './trigger.service';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('EmarReminder');

// =====================================================
// TYPES
// =====================================================

export interface MedicationScheduleItem {
  id: string;
  encounter_id: string;
  patient_id: string;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  scheduled_time: string;
  window_minutes: number;
  status: 'pending' | 'administered' | 'missed' | 'refused' | 'held';
  assigned_nurse_id: string | null;
  prescribed_by: string | null;
  shift: string;
  escalation_count: number;
  notes: string | null;
  created_at: string;
  // Joined fields
  patient_name?: string;
}

interface EmarEngineState {
  userId: string | null;
  userRole: string | null;
  intervalId: ReturnType<typeof setInterval> | null;
  isRunning: boolean;
  // Track which schedule items we've already notified about to avoid duplication
  notifiedDueIds: Set<string>;
  notifiedOverdueIds: Set<string>;
}

// =====================================================
// STATE (singleton)
// =====================================================

const state: EmarEngineState = {
  userId: null,
  userRole: null,
  intervalId: null,
  isRunning: false,
  notifiedDueIds: new Set(),
  notifiedOverdueIds: new Set(),
};

/** Consecutive network failure count to suppress repeated error logs */
let emarConsecutiveFailures = 0;

/** Check every 30 seconds for faster alerts */
const DEFAULT_CHECK_INTERVAL_MS = 30_000;

/** Notify 15 minutes before scheduled time */
const PRE_ALERT_MINUTES = 15;

// =====================================================
// ENGINE LIFECYCLE
// =====================================================

/**
 * Start the eMAR reminder engine.
 * Only runs for nurse roles. Call once on mount.
 */
export function startEmarReminderEngine(
  userId: string,
  userRole: string,
  checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
): void {
  // Only nurses (and super_admin for testing) need medication reminders
  const nurseRoles = [
    'nurse',
    'nursing_admin',
    'matron',
    'charge_nurse',
    'super_admin',
    'admin',
  ];
  if (!nurseRoles.includes(userRole)) {
    log.info('[eMAR] User is not a nurse/admin, skipping eMAR engine');
    return;
  }

  if (state.isRunning && state.userId === userId) return;

  stopEmarReminderEngine();

  state.userId = userId;
  state.userRole = userRole;
  state.isRunning = true;

  // Immediate first check
  checkMedications();

  // Recurring check
  state.intervalId = setInterval(checkMedications, checkIntervalMs);

  log.info(`[eMAR] Reminder engine started for nurse ${userId}`);
}

/**
 * Stop the eMAR reminder engine.
 */
export function stopEmarReminderEngine(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  state.notifiedDueIds.clear();
  state.notifiedOverdueIds.clear();
  state.userId = null;
  state.userRole = null;
  log.info('[eMAR] Reminder engine stopped');
}

// =====================================================
// MEDICATION CHECKING
// =====================================================

async function checkMedications(): Promise<void> {
  if (!state.userId) return;

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60_000); // 1 hour ago
    const windowEnd = new Date(now.getTime() + PRE_ALERT_MINUTES * 60_000); // N min ahead

    // Fetch pending medications for the current window
    const { data: schedules, error } = await supabase
      .from('medication_schedule')
      .select(
        `
        *,
        patients!medication_schedule_patient_id_fkey (
          first_name,
          surname
        )
      `,
      )
      .eq('status', 'pending')
      .or(`assigned_nurse_id.eq.${state.userId},assigned_nurse_id.is.null`)
      .gte('scheduled_time', windowStart.toISOString())
      .lte('scheduled_time', windowEnd.toISOString())
      .order('scheduled_time', { ascending: true });

    if (error) {
      // Network/fetch errors: suppress repeated logs
      emarConsecutiveFailures++;
      if (emarConsecutiveFailures === 1 || emarConsecutiveFailures % 10 === 0) {
        log.warn(
          `[eMAR] Error fetching medication schedules (attempt ${emarConsecutiveFailures}):`,
          error.message || error,
        );
      }
      return;
    }

    // Reset failure counter on success
    if (emarConsecutiveFailures > 0) {
      log.info('[eMAR] Connection restored');
    }
    emarConsecutiveFailures = 0;

    if (!schedules || schedules.length === 0) return;

    // Process each schedule item
    for (const schedule of schedules) {
      const scheduledTime = new Date(schedule.scheduled_time);
      const minutesUntilDue =
        (scheduledTime.getTime() - now.getTime()) / 60_000;
      const minutesOverdue = -minutesUntilDue;
      const windowMinutes = schedule.window_minutes || 30;

      // Build patient name from joined data
      const patientData = (schedule as any).patients;
      const patientName = patientData
        ? `${patientData.first_name || ''} ${patientData.surname || ''}`.trim()
        : 'Unknown Patient';

      const formattedTime = scheduledTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (minutesOverdue > 0) {
        // OVERDUE - medication past its scheduled time
        if (!state.notifiedOverdueIds.has(schedule.id)) {
          state.notifiedOverdueIds.add(schedule.id);

          await notifyMedicationOverdue(
            patientName,
            schedule.medication_name,
            schedule.dose,
            Math.round(minutesOverdue),
            schedule.id,
            state.userId!,
            schedule.encounter_id,
            undefined, // no currentUserId needed since this is system-generated
          ).catch((err) =>
            log.error('[eMAR] Failed to notify overdue:', err),
          );
        }
      } else if (minutesUntilDue <= PRE_ALERT_MINUTES) {
        // DUE SOON - within the pre-alert window
        if (!state.notifiedDueIds.has(schedule.id)) {
          state.notifiedDueIds.add(schedule.id);

          await notifyMedicationDue(
            patientName,
            schedule.medication_name,
            schedule.dose,
            formattedTime,
            schedule.id,
            state.userId!,
            schedule.encounter_id,
            undefined,
          ).catch((err) => log.error('[eMAR] Failed to notify due:', err));
        }
      }
    }

    // Also check for medications that were missed (past the window)
    await checkMissedMedications(now);
  } catch (error) {
    emarConsecutiveFailures++;
    if (emarConsecutiveFailures === 1 || emarConsecutiveFailures % 10 === 0) {
      log.warn(
        `[eMAR] Check medications error (attempt ${emarConsecutiveFailures}):`,
        (error as any)?.message || error,
      );
    }
  }
}

async function checkMissedMedications(now: Date): Promise<void> {
  if (!state.userId) return;

  try {
    // Medications where the window has expired and still pending
    const cutoff = new Date(now.getTime() - 60 * 60_000); // 1 hour ago = default window expired

    const { data: missed, error } = await supabase
      .from('medication_schedule')
      .select('id')
      .eq('status', 'pending')
      .or(`assigned_nurse_id.eq.${state.userId},assigned_nurse_id.is.null`)
      .lt('scheduled_time', cutoff.toISOString())
      .limit(50);

    if (error || !missed) return;

    // Mark them as missed
    for (const item of missed) {
      await supabase
        .from('medication_schedule')
        .update({ status: 'missed' })
        .eq('id', item.id)
        .eq('status', 'pending'); // Safety check
    }
  } catch (e) {
    log.error('[eMAR] Check missed medications error:', e);
  }
}

// =====================================================
// MANUAL TRIGGER FUNCTIONS
// (Call these from MedicationAdministrationTab when nurse records an action)
// =====================================================

/**
 * Call when a nurse administers a medication.
 * Notifies the prescribing doctor and care team.
 */
export async function recordMedicationAdministered(
  scheduleId: string,
  patientName: string,
  medicationName: string,
  dose: string,
  nurseName: string,
  prescribingDoctorId: string,
  encounterId: string,
  currentUserId: string,
): Promise<void> {
  // Update the schedule status
  await supabase
    .from('medication_schedule')
    .update({
      status: 'administered',
    })
    .eq('id', scheduleId);

  // Remove from notification tracking
  state.notifiedDueIds.delete(scheduleId);
  state.notifiedOverdueIds.delete(scheduleId);

  // Notify the prescribing doctor
  await notifyMedicationAdministered(
    patientName,
    medicationName,
    dose,
    nurseName,
    scheduleId,
    prescribingDoctorId,
    encounterId,
    currentUserId,
  ).catch((err) =>
    log.error('[eMAR] Failed to notify medication administered:', err),
  );
}

/**
 * Call when a nurse records medication refusal or hold.
 * Notifies the prescribing doctor with higher urgency.
 */
export async function recordMedicationRefused(
  scheduleId: string,
  patientName: string,
  medicationName: string,
  reason: string,
  nurseName: string,
  prescribingDoctorId: string,
  encounterId: string,
  currentUserId: string,
): Promise<void> {
  await supabase
    .from('medication_schedule')
    .update({
      status: 'refused',
      notes: reason,
    })
    .eq('id', scheduleId);

  state.notifiedDueIds.delete(scheduleId);
  state.notifiedOverdueIds.delete(scheduleId);

  await notifyMedicationRefused(
    patientName,
    medicationName,
    reason,
    nurseName,
    scheduleId,
    prescribingDoctorId,
    encounterId,
    currentUserId,
  ).catch((err) =>
    log.error('[eMAR] Failed to notify medication refused:', err),
  );
}

/**
 * Create medication schedule entries from prescriptions.
 * Call this when a doctor prescribes medications for an encounter.
 */
export async function createMedicationScheduleFromPrescription(
  encounterId: string,
  patientId: string,
  medicationName: string,
  dose: string,
  route: string,
  frequency: string,
  prescribedBy: string,
  scheduledTimes: string[], // Array of ISO datetime strings
  assignedNurseId?: string,
): Promise<void> {
  const entries = scheduledTimes.map((time) => ({
    encounter_id: encounterId,
    patient_id: patientId,
    medication_name: medicationName,
    dose,
    route,
    frequency,
    scheduled_time: time,
    window_minutes: 30, // default 30-minute administration window
    status: 'pending' as const,
    assigned_nurse_id: assignedNurseId || null,
    prescribed_by: prescribedBy,
    shift: getShiftForTime(new Date(time)),
  }));

  const { error } = await supabase.from('medication_schedule').insert(entries);

  if (error) {
    log.error('[eMAR] Failed to create medication schedule:', error);
    throw error;
  }
}

// =====================================================
// HELPERS
// =====================================================

function getShiftForTime(date: Date): string {
  const hour = date.getHours();
  if (hour >= 7 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 22) return 'afternoon';
  return 'night';
}