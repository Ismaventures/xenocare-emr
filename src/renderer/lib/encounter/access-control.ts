/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - ENCOUNTER ACCESS CONTROL SYSTEM
 * =============================================================================
 *
 * Implements enterprise-grade encounter ownership and access control following:
 * - HL7/FHIR encounter models
 * - Military hospital governance standards
 * - HIPAA-compliant audit trails
 *
 * CORE PRINCIPLES:
 * 1. Each encounter has ONE Primary Assigned Doctor (owner)
 * 2. Ownership determines who can actively document, order, diagnose, prescribe
 * 3. Same-department doctors get READ-ONLY access by default
 * 4. Other-department doctors require formal referral/consultation
 * 5. All access is logged for medico-legal compliance
 */

import { supabase } from '../../api/supabaseClient';
import { UserRole } from '../permissions';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Encounter ownership role - determines access level
 */
export type EncounterRole =
  | 'primary_doctor' // Full ownership - can do everything
  | 'co_managing_doctor' // Shared ownership - full access
  | 'consulting_doctor' // Formal consultation - limited write
  | 'on_call_doctor' // Temporary access during shift
  | 'department_doctor' // Same department - read only
  | 'referred_doctor' // Received referral - specific access
  | 'queue_view_only' // In doctor's queue but not assigned - blurred/read-only
  | 'nurse' // Assigned nurse - vitals/nursing care
  | 'lab_technician' // Lab orders only
  | 'radiologist' // Radiology orders only
  | 'pharmacist' // Prescriptions only
  | 'no_access'; // No access to this encounter

/**
 * Actions that can be performed on an encounter
 */
export type EncounterAction =
  | 'view'
  | 'edit_clinical_notes'
  | 'add_diagnosis'
  | 'prescribe'
  | 'order_lab'
  | 'order_radiology'
  | 'order_procedure'
  | 'add_vitals'
  | 'add_nursing_notes'
  | 'close_encounter'
  | 'transfer_ownership'
  | 'add_to_care_team'
  | 'request_consultation';

/**
 * Encounter care team member with temporal access
 */
export interface EncounterCareTeamMember {
  id: string;
  encounter_id: string;
  staff_id: string;
  staff_name: string;
  role: EncounterRole;
  department: string | null;
  assigned_at: string;
  assigned_by: string;
  expires_at: string | null; // For temporary access (on-call)
  is_active: boolean;
  notes: string | null;
}

/**
 * Encounter access log entry for audit trail
 */
export interface EncounterAccessLog {
  id: string;
  encounter_id: string;
  user_id: string;
  user_role: UserRole;
  action: EncounterAction | 'access_denied' | 'access_granted';
  action_details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  was_authorized: boolean;
}

/**
 * Transfer history entry
 */
export interface EncounterTransfer {
  id: string;
  encounter_id: string;
  from_doctor_id: string;
  to_doctor_id: string;
  transfer_type: 'reassignment' | 'co_management' | 'consultation' | 'handoff';
  reason: string;
  transferred_by: string;
  transferred_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  encounterRole: EncounterRole;
  reason: string;
  restrictions?: string[];
}

// =============================================================================
// PERMISSION MATRIX
// =============================================================================

/**
 * Actions allowed per encounter role
 */
export const ROLE_PERMISSIONS: Record<EncounterRole, EncounterAction[]> = {
  primary_doctor: [
    'view',
    'edit_clinical_notes',
    'add_diagnosis',
    'prescribe',
    'order_lab',
    'order_radiology',
    'order_procedure',
    'add_vitals',
    'add_nursing_notes',
    'close_encounter',
    'transfer_ownership',
    'add_to_care_team',
    'request_consultation',
  ],
  co_managing_doctor: [
    'view',
    'edit_clinical_notes',
    'add_diagnosis',
    'prescribe',
    'order_lab',
    'order_radiology',
    'order_procedure',
    'add_vitals',
    'add_nursing_notes',
    'request_consultation',
    'add_to_care_team',
  ],
  consulting_doctor: [
    'view',
    'edit_clinical_notes',
    'add_diagnosis',
    'prescribe',
    'order_lab',
    'order_radiology',
  ],
  on_call_doctor: [
    'view',
    'edit_clinical_notes',
    'add_diagnosis',
    'prescribe',
    'order_lab',
    'order_radiology',
    'order_procedure',
    'add_vitals',
  ],
  department_doctor: [
    'view', // Read-only by default
  ],
  referred_doctor: ['view', 'edit_clinical_notes', 'add_diagnosis'],
  queue_view_only: [
    'view', // Can only view - encounter in queue but not assigned (shows blurred)
  ],
  nurse: ['view', 'add_vitals', 'add_nursing_notes'],
  lab_technician: [
    'view', // Can only view and process lab orders
  ],
  radiologist: [
    'view', // Can only view and process radiology orders
  ],
  pharmacist: [
    'view', // Can only view and dispense prescriptions
  ],
  no_access: [],
};

// =============================================================================
// CORE ACCESS CONTROL FUNCTIONS
// =============================================================================

/**
 * Determine a user's role within an encounter
 * This is the core function that determines access level
 */
export async function getEncounterRole(
  encounterId: string,
  userId: string,
  userRole: UserRole,
  userDepartment: string | null,
): Promise<{ role: EncounterRole; details: EncounterCareTeamMember | null }> {
  // Super admins have full access for emergencies (but logged)
  if (userRole === 'super_admin') {
    return { role: 'primary_doctor', details: null };
  }

  // Get encounter with care team
  const { data: encounter, error: encError } = await supabase
    .from('visits')
    .select(
      `
      id,
      attending_doctor_id,
      clinic_id,
      status,
      clinic:clinics!visits_clinic_id_fkey(clinic_name)
    `,
    )
    .eq('id', encounterId)
    .single();

  if (encError || !encounter) {
    return { role: 'no_access', details: null };
  }

  // Check if user is the primary doctor
  if (encounter.attending_doctor_id === userId) {
    return { role: 'primary_doctor', details: null };
  }

  // Check encounter care team
  const { data: careTeam } = await supabase
    .from('encounter_care_team')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('staff_id', userId)
    .eq('is_active', true)
    .single();

  if (careTeam) {
    // Check if temporary access has expired
    if (careTeam.expires_at && new Date(careTeam.expires_at) < new Date()) {
      return { role: 'no_access', details: careTeam };
    }
    return { role: careTeam.role as EncounterRole, details: careTeam };
  }

  // Check if this is a doctor viewing the queue - they can see unassigned encounters but read-only
  if (['doctor', 'medical_director'].includes(userRole)) {
    // If encounter has no attending_doctor_id OR is in a visible queue state,
    // the doctor can see it but with queue_view_only access (blurred/read-only)
    const queueVisibleStages = [
      'consultation',
      'doctor_review',
      'lab_results',
      'radiology_results',
    ];
    if (
      !encounter.attending_doctor_id ||
      queueVisibleStages.includes(encounter.status)
    ) {
      return { role: 'queue_view_only', details: null };
    }
  }

  // Department-based access (same clinic/department)
  const clinicName = (encounter.clinic as any)?.clinic_name;
  if (clinicName && userDepartment === clinicName) {
    // Same department doctors get read-only by default
    if (['doctor', 'medical_director'].includes(userRole)) {
      return { role: 'department_doctor', details: null };
    }
    // Same department nurses can view and add vitals
    if (userRole === 'nurse') {
      return { role: 'nurse', details: null };
    }
  }

  // Role-based department access for service departments
  switch (userRole) {
    case 'lab_technician':
      // Can access if there are pending lab orders
      const { count: labCount } = await supabase
        .from('lab_requests')
        .select('*', { count: 'exact', head: true })
        .eq('encounter_id', encounterId);
      if (labCount && labCount > 0) {
        return { role: 'lab_technician', details: null };
      }
      break;

    case 'radiologist':
      // Can access if there are pending radiology orders
      const { count: radCount } = await supabase
        .from('radiology_requests')
        .select('*', { count: 'exact', head: true })
        .eq('encounter_id', encounterId);
      if (radCount && radCount > 0) {
        return { role: 'radiologist', details: null };
      }
      break;

    case 'pharmacist':
      // Can access if there are prescriptions
      const { count: rxCount } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('encounter_id', encounterId);
      if (rxCount && rxCount > 0) {
        return { role: 'pharmacist', details: null };
      }
      break;

    case 'nurse':
      // Nurses in queue/nursing department can access active encounters
      if (encounter.status === 'Active') {
        return { role: 'nurse', details: null };
      }
      break;
  }

  // Medical director can view all encounters in their facility
  if (userRole === 'medical_director') {
    return { role: 'department_doctor', details: null };
  }

  return { role: 'no_access', details: null };
}

/**
 * Check if a user can perform a specific action on an encounter
 */
export async function canPerformAction(
  encounterId: string,
  userId: string,
  userRole: UserRole,
  userDepartment: string | null,
  action: EncounterAction,
): Promise<PermissionCheckResult> {
  const { role: encounterRole, details } = await getEncounterRole(
    encounterId,
    userId,
    userRole,
    userDepartment,
  );

  const allowedActions = ROLE_PERMISSIONS[encounterRole] || [];
  const allowed = allowedActions.includes(action);

  // Log the access attempt
  await logEncounterAccess(encounterId, userId, userRole, action, allowed);

  if (!allowed) {
    return {
      allowed: false,
      encounterRole,
      reason: getAccessDeniedReason(encounterRole, action),
      restrictions: getAllowedActionsForRole(encounterRole),
    };
  }

  return {
    allowed: true,
    encounterRole,
    reason: 'Access granted',
  };
}

/**
 * Get human-readable reason for access denial
 */
function getAccessDeniedReason(
  role: EncounterRole,
  action: EncounterAction,
): string {
  switch (role) {
    case 'no_access':
      return 'You do not have access to this encounter. Request a formal consultation or referral.';
    case 'queue_view_only':
      return 'This encounter is not assigned to you. You can only view. Request assignment from the medical officer.';
    case 'department_doctor':
      return 'Same-department access is read-only. Request ownership transfer or co-management.';
    case 'consulting_doctor':
      return `Consultants cannot ${action.replace(/_/g, ' ')}. Contact the primary doctor.`;
    case 'on_call_doctor':
      return 'On-call access is limited. For full access, request ownership transfer.';
    case 'nurse':
      return 'Nursing access is limited to vitals and nursing notes.';
    case 'lab_technician':
      return 'Lab access is limited to viewing and processing lab orders.';
    case 'radiologist':
      return 'Radiology access is limited to viewing and processing imaging orders.';
    case 'pharmacist':
      return 'Pharmacy access is limited to viewing and dispensing prescriptions.';
    default:
      return `You cannot ${action.replace(/_/g, ' ')} on this encounter.`;
  }
}

/**
 * Get allowed actions for display
 */
function getAllowedActionsForRole(role: EncounterRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

// =============================================================================
// CARE TEAM MANAGEMENT
// =============================================================================

/**
 * Add a member to the encounter care team
 */
export async function addToCareTeam(
  encounterId: string,
  staffId: string,
  role: EncounterRole,
  assignedBy: string,
  expiresAt?: string,
  notes?: string,
): Promise<EncounterCareTeamMember> {
  // Get staff details
  const { data: staff } = await supabase
    .from('staff')
    .select('first_name, last_name, department')
    .eq('id', staffId)
    .single();

  const staffName = staff
    ? `${staff.first_name} ${staff.last_name}`
    : 'Unknown';

  // Check if a row already exists (including soft-deleted ones)
  const { data: existing } = await supabase
    .from('encounter_care_team')
    .select('id, is_active')
    .eq('encounter_id', encounterId)
    .eq('staff_id', staffId)
    .eq('role', role)
    .maybeSingle();

  let data: any;
  let error: any;

  if (existing) {
    // Re-activate / update the existing row
    ({ data, error } = await supabase
      .from('encounter_care_team')
      .update({
        staff_name: staffName,
        department: staff?.department,
        assigned_by: assignedBy,
        expires_at: expiresAt,
        notes,
        is_active: true,
      })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    // Insert new row
    ({ data, error } = await supabase
      .from('encounter_care_team')
      .insert({
        encounter_id: encounterId,
        staff_id: staffId,
        staff_name: staffName,
        role,
        department: staff?.department,
        assigned_by: assignedBy,
        expires_at: expiresAt,
        notes,
        is_active: true,
      })
      .select()
      .single());
  }

  if (error) throw error;

  // Log the action
  await logEncounterAccess(
    encounterId,
    assignedBy,
    'doctor',
    'add_to_care_team',
    true,
    `Added ${staffName} as ${role}`,
  );

  return data as EncounterCareTeamMember;
}

/**
 * Remove a member from the encounter care team
 */
export async function removeFromCareTeam(
  encounterId: string,
  staffId: string,
  removedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('encounter_care_team')
    .update({ is_active: false })
    .eq('encounter_id', encounterId)
    .eq('staff_id', staffId);

  if (error) throw error;

  await logEncounterAccess(
    encounterId,
    removedBy,
    'doctor',
    'add_to_care_team',
    true,
    `Removed staff from care team`,
  );
}

/**
 * Get the full care team for an encounter
 */
export async function getEncounterCareTeam(
  encounterId: string,
): Promise<EncounterCareTeamMember[]> {
  const { data, error } = await supabase
    .from('encounter_care_team')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  if (error) throw error;
  return (data || []) as EncounterCareTeamMember[];
}

// =============================================================================
// OWNERSHIP TRANSFER
// =============================================================================

/**
 * Transfer encounter ownership to another doctor
 */
export async function transferEncounterOwnership(
  encounterId: string,
  fromDoctorId: string,
  toDoctorId: string,
  transferType: EncounterTransfer['transfer_type'],
  reason: string,
  transferredBy: string,
): Promise<EncounterTransfer> {
  // Create transfer record
  const { data: transfer, error: transferError } = await supabase
    .from('encounter_transfers')
    .insert({
      encounter_id: encounterId,
      from_doctor_id: fromDoctorId,
      to_doctor_id: toDoctorId,
      transfer_type: transferType,
      reason,
      transferred_by: transferredBy,
      status: transferType === 'handoff' ? 'accepted' : 'pending',
    })
    .select()
    .single();

  if (transferError) throw transferError;

  // For immediate handoffs, update the encounter
  if (transferType === 'handoff') {
    await supabase
      .from('visits')
      .update({ attending_doctor_id: toDoctorId })
      .eq('id', encounterId);

    // Add old doctor as co-manager if they want visibility
    await addToCareTeam(
      encounterId,
      fromDoctorId,
      'department_doctor',
      transferredBy,
      undefined,
      'Previous primary doctor - retained for continuity',
    );
  }

  // For co-management, add new doctor to care team
  if (transferType === 'co_management') {
    await addToCareTeam(
      encounterId,
      toDoctorId,
      'co_managing_doctor',
      transferredBy,
    );
  }

  // For consultation, add with limited role
  if (transferType === 'consultation') {
    await addToCareTeam(
      encounterId,
      toDoctorId,
      'consulting_doctor',
      transferredBy,
    );
  }

  // Log the transfer
  await logEncounterAccess(
    encounterId,
    transferredBy,
    'doctor',
    'transfer_ownership',
    true,
    `${transferType} from ${fromDoctorId} to ${toDoctorId}: ${reason}`,
  );

  return transfer as EncounterTransfer;
}

/**
 * Accept or decline a transfer request
 */
export async function respondToTransfer(
  transferId: string,
  response: 'accepted' | 'declined',
  userId: string,
): Promise<void> {
  const { data: transfer, error: fetchError } = await supabase
    .from('encounter_transfers')
    .select('*')
    .eq('id', transferId)
    .single();

  if (fetchError || !transfer) throw new Error('Transfer not found');

  const { error } = await supabase
    .from('encounter_transfers')
    .update({
      status: response,
      accepted_at: response === 'accepted' ? new Date().toISOString() : null,
    })
    .eq('id', transferId);

  if (error) throw error;

  // If accepted, update encounter ownership
  if (response === 'accepted' && transfer.transfer_type === 'reassignment') {
    await supabase
      .from('visits')
      .update({ attending_doctor_id: transfer.to_doctor_id })
      .eq('id', transfer.encounter_id);
  }

  await logEncounterAccess(
    transfer.encounter_id,
    userId,
    'doctor',
    'transfer_ownership',
    true,
    `Transfer ${response}`,
  );
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log an encounter access event
 */
export async function logEncounterAccess(
  encounterId: string,
  userId: string,
  userRole: UserRole,
  action: EncounterAction | 'access_denied' | 'access_granted',
  wasAuthorized: boolean,
  details?: string,
): Promise<void> {
  try {
    await supabase.from('encounter_access_logs').insert({
      encounter_id: encounterId,
      user_id: userId,
      user_role: userRole,
      action,
      action_details: details,
      was_authorized: wasAuthorized,
      ip_address: null, // To be populated by edge function if available
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (err) {
    console.error('Failed to log encounter access:', err);
    // Don't throw - logging failures shouldn't block operations
  }
}

/**
 * Get access logs for an encounter (for audit review)
 */
export async function getEncounterAccessLogs(
  encounterId: string,
  limit: number = 100,
): Promise<EncounterAccessLog[]> {
  const { data, error } = await supabase
    .from('encounter_access_logs')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as EncounterAccessLog[];
}

// =============================================================================
// ON-CALL MANAGEMENT
// =============================================================================

/**
 * Grant temporary on-call access to a doctor
 */
export async function grantOnCallAccess(
  encounterId: string,
  doctorId: string,
  grantedBy: string,
  hoursValid: number = 8,
): Promise<EncounterCareTeamMember> {
  const expiresAt = new Date(
    Date.now() + hoursValid * 60 * 60 * 1000,
  ).toISOString();

  return addToCareTeam(
    encounterId,
    doctorId,
    'on_call_doctor',
    grantedBy,
    expiresAt,
    `On-call access granted for ${hoursValid} hours`,
  );
}

/**
 * Clean up expired on-call access (run periodically)
 */
export async function cleanupExpiredAccess(): Promise<number> {
  const { data, error } = await supabase
    .from('encounter_care_team')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)
    .select();

  if (error) throw error;
  return data?.length || 0;
}

// =============================================================================
// ENCOUNTER VISIBILITY QUERIES
// =============================================================================

/**
 * Get encounters visible to a specific user
 * Filters based on ownership, care team membership, and department
 */
export async function getVisibleEncounters(
  userId: string,
  userRole: UserRole,
  userDepartment: string | null,
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  },
): Promise<string[]> {
  const encounterIds: Set<string> = new Set();

  // 1. Encounters where user is primary doctor
  const { data: primaryEncs } = await supabase
    .from('visits')
    .select('id')
    .eq('attending_doctor_id', userId);

  (primaryEncs || []).forEach((e) => encounterIds.add(e.id));

  // 2. Encounters where user is in care team
  const { data: careTeamEncs } = await supabase
    .from('encounter_care_team')
    .select('encounter_id')
    .eq('staff_id', userId)
    .eq('is_active', true);

  (careTeamEncs || []).forEach((e) => encounterIds.add(e.encounter_id));

  // 3. Same department encounters (for doctors)
  if (userDepartment && ['doctor', 'medical_director'].includes(userRole)) {
    const { data: deptEncs } = await supabase
      .from('visits')
      .select('id, clinic:clinics!visits_clinic_id_fkey(clinic_name)')
      .eq('status', 'Active');

    (deptEncs || []).forEach((e) => {
      if ((e.clinic as any)?.clinic_name === userDepartment) {
        encounterIds.add(e.id);
      }
    });
  }

  // 4. Service department access (lab, radiology, pharmacy)
  if (userRole === 'lab_technician') {
    const { data: labEncs } = await supabase
      .from('lab_requests')
      .select('encounter_id')
      .not('status', 'eq', 'Completed');
    (labEncs || []).forEach(
      (e) => e.encounter_id && encounterIds.add(e.encounter_id),
    );
  }

  if (userRole === 'radiologist') {
    const { data: radEncs } = await supabase
      .from('radiology_requests')
      .select('encounter_id')
      .not('status', 'eq', 'Completed');
    (radEncs || []).forEach(
      (e) => e.encounter_id && encounterIds.add(e.encounter_id),
    );
  }

  if (userRole === 'pharmacist') {
    const { data: rxEncs } = await supabase
      .from('prescriptions')
      .select('encounter_id')
      .not('status', 'eq', 'Dispensed');
    (rxEncs || []).forEach(
      (e) => e.encounter_id && encounterIds.add(e.encounter_id),
    );
  }

  // 5. Nurses see active encounters
  if (userRole === 'nurse') {
    const { data: activeEncs } = await supabase
      .from('visits')
      .select('id')
      .eq('status', 'Active');
    (activeEncs || []).forEach((e) => encounterIds.add(e.id));
  }

  // Super admin and medical director see all
  if (['super_admin', 'admin', 'medical_director'].includes(userRole)) {
    const { data: allEncs } = await supabase
      .from('visits')
      .select('id')
      .limit(filters?.limit || 500);
    (allEncs || []).forEach((e) => encounterIds.add(e.id));
  }

  return Array.from(encounterIds);
}

// =============================================================================
// EXPORT SUMMARY
// =============================================================================

export const encounterAccessControl = {
  getEncounterRole,
  canPerformAction,
  addToCareTeam,
  removeFromCareTeam,
  getEncounterCareTeam,
  transferEncounterOwnership,
  respondToTransfer,
  logEncounterAccess,
  getEncounterAccessLogs,
  grantOnCallAccess,
  cleanupExpiredAccess,
  getVisibleEncounters,
  ROLE_PERMISSIONS,
};

export default encounterAccessControl;
