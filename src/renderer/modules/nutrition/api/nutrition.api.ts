/**
 * =============================================================================
 * NUTRITION MODULE - API
 * =============================================================================
 * Domain API built on shared specialty care plan infrastructure:
 * - specialty_careplans
 * - careplan_sessions
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';
import type {
  SpecialtyCareplan,
  CareplanSession,
  CreateSessionDTO,
  CompleteSessionDTO,
} from '../../specialty-common/dtos/specialty-clinic.dto';
import type {
  NutritionCarePlanDTO,
  NutritionSessionData,
  NutritionStats,
} from '../types/nutrition.types';

const SPECIALTY_CODE = 'NUTRITION';

function normalizeCareplanStatus(status: unknown): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isActiveLikeStatus(status: unknown): boolean {
  const normalized = normalizeCareplanStatus(status);
  return normalized === 'active' || normalized === 'on_hold';
}

function isTableNotFound(error: unknown): boolean {
  const e = error as { code?: string } | null;
  return e?.code === 'PGRST205' || e?.code === '42P01';
}

async function getCurrentStaff(): Promise<{ id: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  return data;
}

// -----------------------------------------------------------------------------
// Care plans
// -----------------------------------------------------------------------------

export async function getNutritionCarePlans(
  patientId?: string,
): Promise<SpecialtyCareplan[]> {
  let query = supabase
    .from('specialty_careplans')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number, date_of_birth, gender),
      creator:staff!specialty_careplans_created_by_fkey(id, first_name, last_name)
    `,
    )
    .ilike('specialty_code', SPECIALTY_CODE)
    .order('created_at', { ascending: false });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;
  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }

  return (data || []) as SpecialtyCareplan[];
}

export async function getActiveNutritionCarePlans(): Promise<
  SpecialtyCareplan[]
> {
  const { data, error } = await supabase
    .from('specialty_careplans')
    .select(
      `
      *,
      patient:patients(id, first_name, surname, emr_number, date_of_birth, gender),
      creator:staff!specialty_careplans_created_by_fkey(id, first_name, last_name)
    `,
    )
    .ilike('specialty_code', SPECIALTY_CODE)
    .order('created_at', { ascending: false });

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }

  return ((data || []) as SpecialtyCareplan[]).filter((plan) =>
    isActiveLikeStatus(plan.status),
  );
}

export async function createNutritionCarePlan(
  dto: NutritionCarePlanDTO,
): Promise<SpecialtyCareplan> {
  const staff = await getCurrentStaff();
  if (!staff?.id) {
    throw new Error('Must be logged in to create a nutrition care plan');
  }

  const baselineData = {
    source_referral_request_id: dto.source_referral_request_id,
    current_weight_kg: dto.current_weight_kg,
    target_weight_kg: dto.target_weight_kg,
    height_cm: dto.height_cm,
    bmi: dto.bmi,
    muac_cm: dto.muac_cm,
    malnutrition_risk: dto.malnutrition_risk,
    physical_activity_level: dto.physical_activity_level,
    comorbidities: dto.comorbidities,
    diet_type: dto.diet_type,
    calorie_target_kcal: dto.calorie_target_kcal,
    protein_target_g: dto.protein_target_g,
    fluid_target_ml: dto.fluid_target_ml,
    sodium_limit_mg: dto.sodium_limit_mg,
    meal_schedule: dto.meal_schedule,
    dietary_restrictions: dto.dietary_restrictions,
    supplements: dto.supplements,
    counseling_notes: dto.counseling_notes,
  };

  const { data, error } = await supabase
    .from('specialty_careplans')
    .insert({
      patient_id: dto.patient_id,
      encounter_id: dto.encounter_id || null,
      specialty_code: SPECIALTY_CODE,
      plan_type: dto.plan_type,
      plan_name: dto.plan_name,
      status: 'Active',
      diagnosis: dto.diagnosis || [],
      goals: dto.goals || [],
      baseline_data: baselineData,
      total_sessions: dto.total_sessions || null,
      frequency: dto.frequency,
      expected_duration: dto.expected_duration,
      billing_category: 'NUTRITION',
      created_by: staff.id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as SpecialtyCareplan;
}

export async function updateNutritionCarePlanStatus(
  planId: string,
  status: 'Active' | 'Completed' | 'Cancelled' | 'On_Hold',
): Promise<void> {
  const { error } = await supabase
    .from('specialty_careplans')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', planId);

  if (error) throw error;
}

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------

export async function getNutritionCarePlanSessions(
  careplanId: string,
): Promise<CareplanSession[]> {
  const { data, error } = await supabase
    .from('careplan_sessions')
    .select(
      `
      *,
      recorder:staff(id, first_name, last_name)
    `,
    )
    .eq('careplan_id', careplanId)
    .order('session_number', { ascending: true });

  if (error) {
    if (isTableNotFound(error)) return [];
    throw error;
  }

  return (data || []) as CareplanSession[];
}

export async function createNutritionSession(
  dto: CreateSessionDTO,
): Promise<CareplanSession> {
  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('careplan_sessions')
    .insert({
      careplan_id: dto.careplan_id,
      session_number: dto.session_number,
      status: 'Scheduled',
      scheduled_date: dto.scheduled_date || null,
      session_data: dto.session_data || {},
      notes: dto.notes || null,
      assessment: dto.assessment || null,
      plan_for_next: dto.plan_for_next || null,
      recorded_by: staff?.id || dto.recorded_by || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as CareplanSession;
}

export async function completeNutritionSession(
  sessionId: string,
  dto: CompleteSessionDTO,
): Promise<CareplanSession> {
  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('careplan_sessions')
    .update({
      status: 'Completed',
      completed_date: new Date().toISOString(),
      session_data: dto.session_data,
      notes: dto.notes || null,
      assessment: dto.assessment || null,
      plan_for_next: dto.plan_for_next || null,
      recorded_by: staff?.id || dto.recorded_by,
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw error;
  return data as CareplanSession;
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

export async function getNutritionStats(): Promise<NutritionStats> {
  try {
    const { data: activePlans, error: plansError } = await supabase
      .from('specialty_careplans')
      .select('id, baseline_data, status')
      .ilike('specialty_code', SPECIALTY_CODE);

    if (plansError) {
      if (isTableNotFound(plansError)) {
        return {
          active_care_plans: 0,
          high_risk_patients: 0,
          followups_this_month: 0,
          average_adherence_rate: 0,
        };
      }
      throw plansError;
    }

    const plans = (activePlans || []).filter((plan: any) =>
      isActiveLikeStatus(plan.status),
    );
    const highRiskPatients = plans.filter((plan) => {
      const baseline = (plan.baseline_data || {}) as Record<string, unknown>;
      return String(baseline.malnutrition_risk || '').toLowerCase() === 'high';
    }).length;

    let followupsThisMonth = 0;
    let averageAdherence = 0;

    if (plans.length > 0) {
      const careplanIds = plans.map((plan) => plan.id);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const { data: sessions, error: sessionsError } = await supabase
        .from('careplan_sessions')
        .select('session_data, completed_date, careplan_id')
        .in('careplan_id', careplanIds)
        .eq('status', 'Completed')
        .gte('completed_date', cutoff.toISOString());

      if (sessionsError && !isTableNotFound(sessionsError)) {
        throw sessionsError;
      }

      const completedSessions = sessions || [];
      followupsThisMonth = completedSessions.length;

      const adherenceValues = completedSessions
        .map((session) => {
          const payload = (session.session_data || {}) as NutritionSessionData;
          const adherence = Number(payload.adherence_percentage);
          return Number.isFinite(adherence) ? adherence : null;
        })
        .filter((value): value is number => value !== null);

      if (adherenceValues.length > 0) {
        const total = adherenceValues.reduce((sum, value) => sum + value, 0);
        averageAdherence =
          Math.round((total / adherenceValues.length) * 10) / 10;
      }
    }

    return {
      active_care_plans: plans.length,
      high_risk_patients: highRiskPatients,
      followups_this_month: followupsThisMonth,
      average_adherence_rate: averageAdherence,
    };
  } catch {
    return {
      active_care_plans: 0,
      high_risk_patients: 0,
      followups_this_month: 0,
      average_adherence_rate: 0,
    };
  }
}
