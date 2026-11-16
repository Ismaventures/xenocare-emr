// Care Team Notification Service
// Provides utility functions for notifying care team members
// (admitting doctor, primary doctor, nurses, consultants)
// when actions are performed on a patient's encounter.

import { supabase } from '../../api/supabaseClient';
import { notifyCareTeamAction } from './trigger.service';

// =====================================================
// TYPES
// =====================================================

export interface CareTeamMember {
  id: string;
  encounter_id: string;
  staff_id: string;
  staff_name: string;
  role: string; // 'primary_doctor', 'consulting_doctor', 'nurse', 'pharmacist', etc.
  is_active: boolean;
}

export type CareTeamActionType =
  | 'care_team_note_added'
  | 'care_team_order_placed'
  | 'ward_round_completed'
  | 'care_team_action_performed';

// =====================================================
// CORE: Get Care Team Members
// =====================================================

/**
 * Fetch all active care team members for an encounter.
 * Returns their staff IDs and roles.
 */
export async function getEncounterCareTeam(
  encounterId: string,
): Promise<CareTeamMember[]> {
  const { data, error } = await supabase
    .from('encounter_care_team')
    .select(
      `
      id,
      encounter_id,
      staff_id,
      staff_name,
      role,
      is_active
    `,
    )
    .eq('encounter_id', encounterId)
    .eq('is_active', true);

  if (error) {
    console.error('[CareTeam] Error fetching care team:', error);
    return [];
  }

  return data || [];
}

/**
 * Get only the doctor(s) on the care team (primary + consulting).
 */
export async function getEncounterDoctors(
  encounterId: string,
): Promise<CareTeamMember[]> {
  const team = await getEncounterCareTeam(encounterId);
  return team.filter(
    (m) =>
      m.role === 'primary_doctor' ||
      m.role === 'consulting_doctor' ||
      m.role === 'admitting_doctor',
  );
}

/**
 * Get the primary/admitting doctor for an encounter.
 */
export async function getPrimaryDoctor(
  encounterId: string,
): Promise<CareTeamMember | null> {
  const team = await getEncounterCareTeam(encounterId);
  return (
    team.find((m) => m.role === 'primary_doctor') ||
    team.find((m) => m.role === 'admitting_doctor') ||
    null
  );
}

// =====================================================
// NOTIFY CARE TEAM FUNCTIONS
// =====================================================

/**
 * Notify the entire care team about an action.
 * Call this when any significant event occurs on a patient encounter.
 */
export async function notifyCareTeamAboutAction(
  encounterId: string,
  patientName: string,
  actionDescription: string,
  performedByName: string,
  actionType: CareTeamActionType,
  entityType: string,
  entityId: string,
  currentUserId: string,
): Promise<void> {
  try {
    const team = await getEncounterCareTeam(encounterId);
    if (team.length === 0) return;

    const targetUserIds = team
      .map((m) => m.staff_id)
      .filter((id) => id !== currentUserId); // Don't notify yourself

    if (targetUserIds.length === 0) return;

    await notifyCareTeamAction(
      patientName,
      actionDescription,
      performedByName,
      actionType,
      entityType,
      entityId,
      encounterId,
      targetUserIds,
      currentUserId,
    );
  } catch (error) {
    console.error('[CareTeam] Failed to notify care team:', error);
  }
}

/**
 * Notify care team when a clinical note is added (progress note, nursing note, etc.)
 */
export async function notifyNoteAdded(
  encounterId: string,
  patientName: string,
  noteType: string,
  authorName: string,
  noteId: string,
  currentUserId: string,
): Promise<void> {
  await notifyCareTeamAboutAction(
    encounterId,
    patientName,
    `${noteType} added`,
    authorName,
    'care_team_note_added',
    'clinical_note',
    noteId,
    currentUserId,
  );
}

/**
 * Notify care team when an order is placed (lab, radiology, procedure, prescription)
 */
export async function notifyOrderPlaced(
  encounterId: string,
  patientName: string,
  orderType: string,
  orderDescription: string,
  orderedBy: string,
  orderId: string,
  currentUserId: string,
): Promise<void> {
  await notifyCareTeamAboutAction(
    encounterId,
    patientName,
    `${orderType}: ${orderDescription}`,
    orderedBy,
    'care_team_order_placed',
    `${orderType.toLowerCase()}_order`,
    orderId,
    currentUserId,
  );
}

/**
 * Notify care team when a ward round is completed
 */
export async function notifyWardRoundCompleted(
  encounterId: string,
  patientName: string,
  doctorName: string,
  wardRoundId: string,
  currentUserId: string,
): Promise<void> {
  await notifyCareTeamAboutAction(
    encounterId,
    patientName,
    'Ward round completed',
    doctorName,
    'ward_round_completed',
    'ward_round',
    wardRoundId,
    currentUserId,
  );
}

/**
 * Notify primary doctor specifically about a nursing action
 * (useful for medication refusal, vitals alert, patient status change)
 */
export async function notifyPrimaryDoctorAboutAction(
  encounterId: string,
  patientName: string,
  actionDescription: string,
  performedByName: string,
  entityType: string,
  entityId: string,
  currentUserId: string,
): Promise<void> {
  try {
    const primaryDoc = await getPrimaryDoctor(encounterId);
    if (!primaryDoc || primaryDoc.staff_id === currentUserId) return;

    await notifyCareTeamAction(
      patientName,
      actionDescription,
      performedByName,
      'care_team_action_performed',
      entityType,
      entityId,
      encounterId,
      [primaryDoc.staff_id],
      currentUserId,
    );
  } catch (error) {
    console.error('[CareTeam] Failed to notify primary doctor:', error);
  }
}
