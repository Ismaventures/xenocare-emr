// =============================================================================
// Enhanced Referral Tracking - Additional Features
// =============================================================================
// Extends the base referral API with:
// 1. Referral chain tracking (linked referrals)
// 2. External referral support (to/from external facilities)
// 3. Referral response time monitoring
// 4. Referral outcome tracking
// =============================================================================

import { supabase } from '../../api/supabaseClient';
import type { ReferralWithDetails } from '../../types/referrals.types';

// =============================================================================
// Types
// =============================================================================

export interface ReferralChainLink {
  referral_id: string;
  referral_number: string;
  from_department: string;
  to_department: string;
  status: string;
  created_at: string;
  sequence: number;
}

export interface ExternalReferral {
  id: string;
  referral_number: string;
  direction: 'incoming' | 'outgoing';
  patient_id: string;
  encounter_id?: string;

  // External facility info
  external_facility_name: string;
  external_facility_address?: string;
  external_facility_phone?: string;
  external_physician_name?: string;
  external_physician_contact?: string;

  // Internal department (receiving for incoming, sending for outgoing)
  internal_department_id: string;
  internal_physician_id?: string;

  // Referral details
  reason: string;
  clinical_summary?: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  status:
    | 'Pending'
    | 'Accepted'
    | 'InProgress'
    | 'Completed'
    | 'Rejected'
    | 'Cancelled';

  // Documents
  referral_letter_path?: string;
  response_letter_path?: string;

  // Dates
  referral_date: string;
  expected_date?: string;
  completed_date?: string;

  // Notes
  notes?: string;
  outcome?: string;

  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ReferralResponseTime {
  referral_id: string;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  time_to_accept_hours?: number;
  time_to_start_hours?: number;
  time_to_complete_hours?: number;
  total_turnaround_hours?: number;
  is_within_sla: boolean;
}

export interface ReferralOutcome {
  referral_id: string;
  outcome_type:
    | 'diagnosis_confirmed'
    | 'diagnosis_changed'
    | 'treatment_initiated'
    | 'procedure_performed'
    | 'medication_changed'
    | 'admission_required'
    | 'follow_up_scheduled'
    | 'referred_further'
    | 'discharged'
    | 'other';
  outcome_description: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  created_at: string;
  created_by: string;
}

// =============================================================================
// Referral Chain Tracking
// =============================================================================

/**
 * Get the full referral chain for a patient visit.
 * This shows how a referral may have cascaded through multiple departments.
 */
export async function getReferralChain(
  patientId: string,
  visitId?: string,
): Promise<ReferralChainLink[]> {
  let query = supabase
    .from('referrals')
    .select(
      `
      id,
      referral_number,
      source_department:departments!referrals_source_department_id_fkey(name),
      target_department:departments!referrals_target_department_id_fkey(name),
      status,
      created_at,
      parent_referral_id
    `,
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (visitId) {
    query = query.eq('visit_id', visitId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Build chain with sequence numbers
  const chain: ReferralChainLink[] = (data || []).map(
    (r: any, index: number) => ({
      referral_id: r.id,
      referral_number: r.referral_number,
      from_department: r.source_department?.name || 'Unknown',
      to_department: r.target_department?.name || 'Unknown',
      status: r.status,
      created_at: r.created_at,
      sequence: index + 1,
    }),
  );

  return chain;
}

/**
 * Link a new referral to a parent referral (for cascade referrals)
 */
export async function linkReferralToParent(
  referralId: string,
  parentReferralId: string,
): Promise<void> {
  const { error } = await supabase
    .from('referrals')
    .update({ parent_referral_id: parentReferralId })
    .eq('id', referralId);

  if (error) throw error;
}

/**
 * Get all child referrals (cascaded from a parent referral)
 */
export async function getChildReferrals(
  parentReferralId: string,
): Promise<ReferralWithDetails[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select(
      `
      *,
      patient:patients!referrals_patient_id_fkey(id, first_name, surname, date_of_birth, gender),
      source_department:departments!referrals_source_department_id_fkey(id, name, code),
      target_department:departments!referrals_target_department_id_fkey(id, name, code)
    `,
    )
    .eq('parent_referral_id', parentReferralId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// =============================================================================
// External Referral Support
// =============================================================================

/**
 * Create an external referral (to/from external facility)
 */
export async function createExternalReferral(
  referral: Omit<
    ExternalReferral,
    'id' | 'referral_number' | 'created_at' | 'updated_at' | 'created_by'
  >,
): Promise<ExternalReferral> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('external_referrals')
    .insert({
      ...referral,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get external referrals for a patient
 */
export async function getPatientExternalReferrals(
  patientId: string,
): Promise<ExternalReferral[]> {
  const { data, error } = await supabase
    .from('external_referrals')
    .select('*')
    .eq('patient_id', patientId)
    .order('referral_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get incoming external referrals (from external facilities)
 */
export async function getIncomingExternalReferrals(
  departmentId?: string,
  status?: string[],
): Promise<ExternalReferral[]> {
  let query = supabase
    .from('external_referrals')
    .select('*')
    .eq('direction', 'incoming')
    .order('referral_date', { ascending: false });

  if (departmentId) {
    query = query.eq('internal_department_id', departmentId);
  }

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get outgoing external referrals (to external facilities)
 */
export async function getOutgoingExternalReferrals(
  departmentId?: string,
  status?: string[],
): Promise<ExternalReferral[]> {
  let query = supabase
    .from('external_referrals')
    .select('*')
    .eq('direction', 'outgoing')
    .order('referral_date', { ascending: false });

  if (departmentId) {
    query = query.eq('internal_department_id', departmentId);
  }

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Update external referral status
 */
export async function updateExternalReferralStatus(
  id: string,
  status: ExternalReferral['status'],
  notes?: string,
): Promise<ExternalReferral> {
  const updates: Partial<ExternalReferral> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (notes) {
    updates.notes = notes;
  }

  if (status === 'Completed') {
    updates.completed_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('external_referrals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// Response Time Monitoring
// =============================================================================

/**
 * Calculate response times for a referral
 */
export async function getReferralResponseTime(
  referralId: string,
): Promise<ReferralResponseTime | null> {
  const { data, error } = await supabase
    .from('referrals')
    .select('id, created_at, accepted_at, started_at, completed_at')
    .eq('id', referralId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const response: ReferralResponseTime = {
    referral_id: data.id,
    created_at: data.created_at,
    accepted_at: data.accepted_at,
    started_at: data.started_at,
    completed_at: data.completed_at,
    is_within_sla: true, // Will be calculated below
  };

  // Calculate time differences
  const createdTime = new Date(data.created_at).getTime();

  if (data.accepted_at) {
    const acceptedTime = new Date(data.accepted_at).getTime();
    response.time_to_accept_hours =
      (acceptedTime - createdTime) / (1000 * 60 * 60);

    // SLA: Accept within 4 hours
    if (response.time_to_accept_hours > 4) {
      response.is_within_sla = false;
    }
  }

  if (data.started_at) {
    const startedTime = new Date(data.started_at).getTime();
    response.time_to_start_hours =
      (startedTime - createdTime) / (1000 * 60 * 60);
  }

  if (data.completed_at) {
    const completedTime = new Date(data.completed_at).getTime();
    response.time_to_complete_hours =
      (completedTime - createdTime) / (1000 * 60 * 60);
    response.total_turnaround_hours = response.time_to_complete_hours;

    // SLA: Complete within 48 hours (routine), 24 hours (urgent), 4 hours (emergency)
    // This is a simplified check - actual SLA should consider priority
    if (response.total_turnaround_hours > 48) {
      response.is_within_sla = false;
    }
  }

  return response;
}

/**
 * Get SLA compliance report for referrals
 */
export async function getReferralSLAReport(
  fromDate: string,
  toDate: string,
  departmentId?: string,
): Promise<{
  total_referrals: number;
  within_sla: number;
  outside_sla: number;
  sla_compliance_rate: number;
  avg_acceptance_time_hours: number;
  avg_completion_time_hours: number;
}> {
  let query = supabase
    .from('referrals')
    .select('id, created_at, accepted_at, completed_at, priority')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  if (departmentId) {
    query = query.eq('target_department_id', departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const referrals = data || [];
  let withinSLA = 0;
  let outsideSLA = 0;
  let totalAcceptanceTime = 0;
  let totalCompletionTime = 0;
  let acceptedCount = 0;
  let completedCount = 0;

  for (const r of referrals) {
    const createdTime = new Date(r.created_at).getTime();
    let isWithinSLA = true;

    if (r.accepted_at) {
      const acceptedTime = new Date(r.accepted_at).getTime();
      const acceptanceHours = (acceptedTime - createdTime) / (1000 * 60 * 60);
      totalAcceptanceTime += acceptanceHours;
      acceptedCount++;

      // SLA for acceptance: 4 hours
      if (acceptanceHours > 4) {
        isWithinSLA = false;
      }
    }

    if (r.completed_at) {
      const completedTime = new Date(r.completed_at).getTime();
      const completionHours = (completedTime - createdTime) / (1000 * 60 * 60);
      totalCompletionTime += completionHours;
      completedCount++;

      // SLA for completion based on priority
      const maxHours =
        r.priority === 'Stat' ? 4 : r.priority === 'Urgent' ? 24 : 48;
      if (completionHours > maxHours) {
        isWithinSLA = false;
      }
    }

    if (isWithinSLA) {
      withinSLA++;
    } else {
      outsideSLA++;
    }
  }

  return {
    total_referrals: referrals.length,
    within_sla: withinSLA,
    outside_sla: outsideSLA,
    sla_compliance_rate:
      referrals.length > 0 ? (withinSLA / referrals.length) * 100 : 0,
    avg_acceptance_time_hours:
      acceptedCount > 0 ? totalAcceptanceTime / acceptedCount : 0,
    avg_completion_time_hours:
      completedCount > 0 ? totalCompletionTime / completedCount : 0,
  };
}

// =============================================================================
// Outcome Tracking
// =============================================================================

/**
 * Record outcome for a referral
 */
export async function recordReferralOutcome(
  referralId: string,
  outcome: Omit<ReferralOutcome, 'referral_id' | 'created_at' | 'created_by'>,
): Promise<ReferralOutcome> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('referral_outcomes')
    .insert({
      referral_id: referralId,
      ...outcome,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get outcomes for a referral
 */
export async function getReferralOutcomes(
  referralId: string,
): Promise<ReferralOutcome[]> {
  const { data, error } = await supabase
    .from('referral_outcomes')
    .select('*')
    .eq('referral_id', referralId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get outcome statistics
 */
export async function getReferralOutcomeStats(
  fromDate: string,
  toDate: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('referral_outcomes')
    .select('outcome_type')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  if (error) throw error;

  const stats: Record<string, number> = {};
  for (const outcome of data || []) {
    stats[outcome.outcome_type] = (stats[outcome.outcome_type] || 0) + 1;
  }

  return stats;
}
