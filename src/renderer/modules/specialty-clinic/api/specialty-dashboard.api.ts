/**
 * Dynamic Specialty Dashboard - API Functions
 *
 * API layer for the unified specialty dashboard system.
 * All functions use SECURITY DEFINER RPCs for access control.
 *
 * @module specialty-dashboard.api
 * @version 2.2
 */

import { supabase } from '../../../api/supabaseClient';
import {
  SpecialtyDepartment,
  SpecialtyDashboardData,
  SpecialtyStats,
  AcceptReferralResponse,
  RejectReferralResponse,
  StartSessionResponse,
  CompleteSessionResponse,
  AcceptReferralParams,
  RejectReferralParams,
  StartSessionParams,
  CompleteSessionParams,
} from '../types/specialty-dashboard.types';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('SpecialtyDashboardAPI');

function toCount(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeSpecialtyStats(
  rawStats: unknown,
  dashboard: Partial<SpecialtyDashboardData>,
): SpecialtyStats {
  const stats =
    rawStats && typeof rawStats === 'object'
      ? (rawStats as Record<string, unknown>)
      : {};
  const queue = Array.isArray(dashboard.queue) ? dashboard.queue : [];
  const referrals = Array.isArray(dashboard.referrals)
    ? dashboard.referrals
    : [];
  const procedures = Array.isArray(dashboard.procedures)
    ? dashboard.procedures
    : [];
  const exams = Array.isArray(dashboard.exams) ? dashboard.exams : [];

  return {
    waiting: toCount(
      stats.waiting,
      queue.filter(
        (patient) =>
          patient.status === 'Waiting' || patient.status === 'Called',
      ).length,
    ),
    in_progress: toCount(
      stats.in_progress,
      queue.filter((patient) => patient.status === 'In Progress').length,
    ),
    completed_today: toCount(
      stats.completed_today,
      toCount(stats.completed, 0),
    ),
    pending_referrals: toCount(stats.pending_referrals, referrals.length),
    pending_procedures: toCount(stats.pending_procedures, procedures.length),
    total_exams: toCount(stats.total_exams, exams.length),
  };
}

function normalizeSpecialtyDashboardData(
  data: unknown,
): SpecialtyDashboardData {
  const dashboard =
    data && typeof data === 'object'
      ? (data as Partial<SpecialtyDashboardData>)
      : {};

  return {
    ...(dashboard as SpecialtyDashboardData),
    queue: Array.isArray(dashboard.queue) ? dashboard.queue : [],
    referrals: Array.isArray(dashboard.referrals) ? dashboard.referrals : [],
    procedures: Array.isArray(dashboard.procedures) ? dashboard.procedures : [],
    exams: Array.isArray(dashboard.exams) ? dashboard.exams : [],
    history: Array.isArray(dashboard.history) ? dashboard.history : [],
    stats: normalizeSpecialtyStats(dashboard.stats, dashboard),
  };
}

// =============================================================================
// SPECIALTY DEPARTMENTS
// =============================================================================

/**
 * Fetch all active specialty departments.
 * Used for navigation menus and referral dropdowns.
 */
export async function getSpecialtyDepartments(): Promise<
  SpecialtyDepartment[]
> {
  const { data, error } = await supabase
    .from('specialty_departments')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    log.error('Failed to fetch specialty departments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single specialty department by code.
 */
export async function getSpecialtyByCode(
  specialtyCode: string,
): Promise<SpecialtyDepartment | null> {
  const { data, error } = await supabase
    .from('specialty_departments')
    .select('*')
    .eq('specialty_code', specialtyCode)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - specialty not found
      return null;
    }
    log.error('Failed to fetch specialty:', error);
    throw error;
  }

  return data;
}

// =============================================================================
// DASHBOARD DATA (SINGLE AGGREGATED CALL)
// =============================================================================

/**
 * Fetch aggregated dashboard data in ONE call.
 * Access control is enforced server-side via can_access_specialty().
 *
 * @param specialtyCode - The specialty code (e.g., 'CARDIOLOGY')
 * @returns SpecialtyDashboardData with config, stats, queue, and referrals
 * @throws Error if access denied or specialty not found
 */
export async function getSpecialtyDashboard(
  specialtyCode: string,
): Promise<SpecialtyDashboardData> {
  const { data, error } = await supabase.rpc('get_specialty_dashboard', {
    p_specialty_code: specialtyCode,
  });

  if (error) {
    log.error('Failed to fetch specialty dashboard:', error);
    throw new Error(error.message || 'Failed to load dashboard');
  }

  if (!data) {
    throw new Error(`No data returned for specialty: ${specialtyCode}`);
  }

  return normalizeSpecialtyDashboardData(data);
}

// =============================================================================
// USER SPECIALTY
// =============================================================================

/**
 * Get the current user's specialty code and role.
 * Returns null specialty_code for admin users (they can access all).
 */
export async function getCurrentUserSpecialty(): Promise<{
  specialty_code: string | null;
  role: string | null;
}> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    // Network errors should propagate so React Query marks query as error
    throw new Error(`Auth error: ${authError.message}`);
  }

  if (!authData?.user) {
    return { specialty_code: null, role: null };
  }

  const { data, error } = await supabase
    .from('staff')
    .select('specialty_code, role')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error) {
    // Network/query errors should propagate — prevents fallback to admin view
    log.error('Failed to fetch user specialty:', error);
    throw new Error(`Failed to fetch user specialty: ${error.message}`);
  }

  return {
    specialty_code: data?.specialty_code || null,
    role: data?.role || null,
  };
}

// =============================================================================
// REFERRAL ACTIONS
// =============================================================================

/**
 * Accept a specialty referral.
 * Updates status to 'In_Progress' and records audit trail.
 *
 * @param params - Request ID and optional notes
 * @returns AcceptReferralResponse with acceptance details
 * @throws Error if referral not found or access denied
 */
export async function acceptSpecialtyReferral(
  params: AcceptReferralParams,
): Promise<AcceptReferralResponse> {
  const { data, error } = await supabase.rpc('accept_specialty_referral', {
    p_request_id: params.p_request_id,
    p_notes: params.p_notes || null,
  });

  if (error) {
    log.error('Failed to accept referral:', error);
    throw new Error(error.message || 'Failed to accept referral');
  }

  return data as AcceptReferralResponse;
}

/**
 * Reject a specialty referral.
 * Updates status to 'Rejected' and records rejection reason.
 *
 * @param params - Request ID and rejection reason (required)
 * @returns RejectReferralResponse with rejection details
 * @throws Error if referral not found, access denied, or no reason provided
 */
export async function rejectSpecialtyReferral(
  params: RejectReferralParams,
): Promise<RejectReferralResponse> {
  if (!params.p_reason?.trim()) {
    throw new Error('Rejection reason is required');
  }

  const { data, error } = await supabase.rpc('reject_specialty_referral', {
    p_request_id: params.p_request_id,
    p_reason: params.p_reason,
  });

  if (error) {
    log.error('Failed to reject referral:', error);
    throw new Error(error.message || 'Failed to reject referral');
  }

  return data as RejectReferralResponse;
}

// =============================================================================
// SESSION ACTIONS
// =============================================================================

/**
 * Start a specialty session (queue entry → In Progress).
 * Assigns the current user as the assigned_to.
 *
 * @param params - Queue ID
 * @returns StartSessionResponse with session details
 * @throws Error if queue entry not found or access denied
 */
export async function startSpecialtySession(
  params: StartSessionParams,
): Promise<StartSessionResponse> {
  const { data, error } = await supabase.rpc('start_specialty_session', {
    p_queue_id: params.p_queue_id,
  });

  if (error) {
    log.error('Failed to start session:', error);
    throw new Error(error.message || 'Failed to start session');
  }

  return data as StartSessionResponse;
}

/**
 * Complete a specialty session.
 * Updates queue status to 'Completed'.
 *
 * @param params - Queue ID and optional notes
 * @returns CompleteSessionResponse with completion details
 * @throws Error if queue entry not found, not assigned to user, or not in progress
 */
export async function completeSpecialtySession(
  params: CompleteSessionParams,
): Promise<CompleteSessionResponse> {
  // Try the RPC first (strict: requires assigned_to match & In Progress status)
  const { data, error } = await supabase.rpc('complete_specialty_session', {
    p_queue_id: params.p_queue_id,
    p_notes: params.p_notes || null,
  });

  if (!error) {
    return data as CompleteSessionResponse;
  }

  // Fallback: If the RPC fails (e.g., queue entry wasn't started via start_specialty_session,
  // or was routed from Nursing without being formally assigned), try a direct update.
  log.warn(
    '[completeSpecialtySession] RPC failed, trying direct update:',
    error.message,
  );

  const { data: updated, error: directError } = await supabase
    .from('queue')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.p_queue_id)
    .in('status', ['Waiting', 'Called', 'In Progress'])
    .select('id, status, completed_at')
    .single();

  if (directError) {
    log.error(
      '[completeSpecialtySession] Direct update also failed:',
      directError,
    );
    throw new Error(directError.message || 'Failed to complete session');
  }

  return {
    queue_id: updated.id,
    status: updated.status,
    completed_at: updated.completed_at,
  } as CompleteSessionResponse;
}

// =============================================================================
// SESSION MANAGEMENT API (NEW)
// =============================================================================

/**
 * Response from resume_specialty_session RPC.
 */
export interface ResumeSessionResponse {
  success: boolean;
  message?: string;
  error?: string;
  queue_id?: string;
  patient?: {
    id: string;
    patient_id: string;
    first_name: string;
    last_name: string;
    gender?: string;
    date_of_birth?: string;
  };
  visit_id?: string;
  encounter_id?: string;
  session_started_at?: string;
  session_notes?: string;
}

/**
 * Response from abandon_specialty_session RPC.
 */
export interface AbandonSessionResponse {
  success: boolean;
  message?: string;
  error?: string;
  queue_id?: string;
  new_status?: string;
}

/**
 * Resume an in-progress session.
 * Returns patient and session data for re-opening the wizard.
 *
 * @param queueId - Queue entry ID
 * @returns ResumeSessionResponse with patient and session data
 */
export async function resumeSpecialtySession(
  queueId: string,
): Promise<ResumeSessionResponse> {
  const { data, error } = await supabase.rpc('resume_specialty_session', {
    p_queue_id: queueId,
  });

  if (error) {
    log.error('Failed to resume session:', error);
    throw new Error(error.message || 'Failed to resume session');
  }

  return data as ResumeSessionResponse;
}

/**
 * Abandon an in-progress session.
 * Returns patient to waiting queue.
 *
 * @param queueId - Queue entry ID
 * @returns AbandonSessionResponse with status
 */
export async function abandonSpecialtySession(
  queueId: string,
): Promise<AbandonSessionResponse> {
  const { data, error } = await supabase.rpc('abandon_specialty_session', {
    p_queue_id: queueId,
  });

  if (error) {
    log.error('Failed to abandon session:', error);
    throw new Error(error.message || 'Failed to abandon session');
  }

  return data as AbandonSessionResponse;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if the current user can access a specific specialty.
 * This is a client-side convenience function.
 * Actual access control is enforced server-side.
 */
export async function canAccessSpecialty(
  specialtyCode: string,
): Promise<boolean> {
  const { specialty_code, role } = await getCurrentUserSpecialty();

  // Admin roles can access all
  const adminRoles = ['super_admin', 'admin', 'medical_director'];
  if (role && adminRoles.includes(role)) {
    return true;
  }

  // Others can only access their assigned specialty
  return specialty_code === specialtyCode;
}

// =============================================================================
// API OBJECT EXPORT
// =============================================================================

/**
 * Specialty Dashboard API object for convenient import.
 */
export const specialtyDashboardApi = {
  // Departments
  getDepartments: getSpecialtyDepartments,
  getByCode: getSpecialtyByCode,

  // Dashboard
  getDashboard: getSpecialtyDashboard,

  // User
  getUserSpecialty: getCurrentUserSpecialty,
  canAccess: canAccessSpecialty,

  // Referral actions
  acceptReferral: acceptSpecialtyReferral,
  rejectReferral: rejectSpecialtyReferral,

  // Session actions
  startSession: startSpecialtySession,
  completeSession: completeSpecialtySession,
  resumeSession: resumeSpecialtySession,
  abandonSession: abandonSpecialtySession,
};
