// =============================================================================
// ANC Module — Supabase API Layer
// Integrates with existing visits, consultations, lab_requests, prescriptions
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  PregnancyEpisode,
  AncVisit,
  AncObservation,
  AncRiskFlag,
  PregnancyOutcome,
  AncDashboardStats,
} from './anc.types';
import {
  calculateGestationalAge,
  calculateEDD,
  getTrimester,
} from './anc.types';
import type {
  PregnancyEpisodeFormDTO,
  AncObservationFormDTO,
  AncDoctorReviewFormDTO,
  DeliveryOutcomeFormDTO,
  AncRiskFlagFormDTO,
} from '../dtos/anc.dto';

// =============================================================================
// Helpers
// =============================================================================

/** Convert Supabase error object to a proper Error with readable message */
function throwSupabaseError(error: any): never {
  const msg = error?.message || error?.details || JSON.stringify(error);
  throw new Error(msg);
}

async function getCurrentStaff(): Promise<{
  id: string;
  staff_id: string;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user.email)
    .maybeSingle();
  return data ?? null;
}

// =============================================================================
// Pregnancy Episodes
// =============================================================================

export async function getActivePregnancies(): Promise<PregnancyEpisode[]> {
  const { data, error } = await supabase
    .from('pregnancy_episodes')
    .select(
      `
      *,
      patient:patient_id(id, first_name, surname, date_of_birth, contact_phone, patient_id, emr_number, gender, blood_group, patient_category, insurance_type, nhis_number),
      primary_doctor:primary_doctor_id(id, first_name, last_name),
      primary_midwife:primary_midwife_id(id, first_name, last_name)
    `,
    )
    .eq('status', 'active')
    .order('edd', { ascending: true });
  if (error) throwSupabaseError(error);
  return (data || []) as PregnancyEpisode[];
}

export async function getAllPregnancies(
  patientId?: string,
): Promise<PregnancyEpisode[]> {
  let query = supabase
    .from('pregnancy_episodes')
    .select(
      `
      *,
      patient:patient_id(id, first_name, surname, date_of_birth, contact_phone, patient_id, emr_number, gender, blood_group, patient_category, insurance_type, nhis_number),
      primary_doctor:primary_doctor_id(id, first_name, last_name),
      primary_midwife:primary_midwife_id(id, first_name, last_name)
    `,
    )
    .order('created_at', { ascending: false });
  if (patientId) {
    query = query.eq('patient_id', patientId);
  }
  const { data, error } = await query;
  if (error) throwSupabaseError(error);
  return (data || []) as PregnancyEpisode[];
}

export async function getPregnancyEpisode(
  episodeId: string,
): Promise<PregnancyEpisode | null> {
  const { data, error } = await supabase
    .from('pregnancy_episodes')
    .select(
      `
      *,
      patient:patient_id(id, first_name, surname, date_of_birth, contact_phone, patient_id, emr_number, gender, blood_group),
      primary_doctor:primary_doctor_id(id, first_name, last_name),
      primary_midwife:primary_midwife_id(id, first_name, last_name)
    `,
    )
    .eq('id', episodeId)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  return data as PregnancyEpisode | null;
}

export async function getActivePregnancyByPatient(
  patientId: string,
): Promise<PregnancyEpisode | null> {
  const { data, error } = await supabase
    .from('pregnancy_episodes')
    .select(
      `
      *,
      patient:patient_id(id, first_name, surname, date_of_birth, contact_phone, patient_id, emr_number, gender, blood_group),
      primary_doctor:primary_doctor_id(id, first_name, last_name),
      primary_midwife:primary_midwife_id(id, first_name, last_name)
    `,
    )
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throwSupabaseError(error);
  return data as PregnancyEpisode | null;
}

export async function createPregnancyEpisode(
  dto: PregnancyEpisodeFormDTO,
): Promise<PregnancyEpisode> {
  const staff = await getCurrentStaff();

  // Compute EDD from LMP if not provided
  const edd = dto.edd || (dto.lmp ? calculateEDD(dto.lmp) : null);
  const ga = dto.lmp ? calculateGestationalAge(dto.lmp) : null;

  // Count existing episodes for this patient
  const { count } = await supabase
    .from('pregnancy_episodes')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', dto.patient_id);

  const { data, error } = await supabase
    .from('pregnancy_episodes')
    .insert({
      patient_id: dto.patient_id,
      episode_number: (count || 0) + 1,
      enrollment_date: new Date().toISOString().split('T')[0],
      lmp: dto.lmp || null,
      edd: edd || null,
      gestational_age_at_booking:
        ga?.weeks ?? dto.gestational_age_at_booking ?? null,
      gravida: dto.gravida,
      parity: dto.parity,
      abortions: dto.abortions,
      living_children: dto.living_children,
      blood_group: dto.blood_group || null,
      rhesus_factor: dto.rhesus_factor || null,
      genotype: dto.genotype || null,
      risk_level: dto.risk_level,
      primary_doctor_id: dto.primary_doctor_id || null,
      primary_midwife_id: dto.primary_midwife_id || null,
      clinic_id: dto.clinic_id || null,
      medical_history: dto.medical_history || null,
      surgical_history: dto.surgical_history || null,
      family_history: dto.family_history || null,
      allergy_history: dto.allergy_history || null,
      obstetric_history: dto.obstetric_history || [],
      status: 'active',
      booking_status: 'booked',
      created_by: staff?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throwSupabaseError(error);
  return data as PregnancyEpisode;
}

export async function updatePregnancyEpisode(
  episodeId: string,
  updates: Partial<PregnancyEpisode>,
): Promise<void> {
  const { error } = await supabase
    .from('pregnancy_episodes')
    .update(updates)
    .eq('id', episodeId);
  if (error) throwSupabaseError(error);
}

// =============================================================================
// ANC Visits
// =============================================================================

export async function getAncVisits(episodeId: string): Promise<AncVisit[]> {
  const { data, error } = await supabase
    .from('anc_visits')
    .select('*, encounter:encounter_id(id, visit_id, status)')
    .eq('pregnancy_episode_id', episodeId)
    .order('visit_date', { ascending: false });
  if (error) throwSupabaseError(error);
  return (data || []) as AncVisit[];
}

export async function getAncVisit(visitId: string): Promise<AncVisit | null> {
  const { data, error } = await supabase
    .from('anc_visits')
    .select('*, encounter:encounter_id(id, visit_id, status)')
    .eq('id', visitId)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  return data as AncVisit | null;
}

export async function getAncVisitByEncounter(
  encounterId: string,
): Promise<AncVisit | null> {
  const { data, error } = await supabase
    .from('anc_visits')
    .select('*')
    .eq('encounter_id', encounterId)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  return data as AncVisit | null;
}

export async function createAncVisit(params: {
  pregnancy_episode_id: string;
  encounter_id: string;
  visit_type: 'booking' | 'routine_followup' | 'urgent_review';
  visit_date?: string;
}): Promise<AncVisit> {
  const staff = await getCurrentStaff();

  // Get pregnancy episode to calculate GA
  const episode = await getPregnancyEpisode(params.pregnancy_episode_id);
  const ga = episode?.lmp ? calculateGestationalAge(episode.lmp) : null;
  const trimester = ga ? getTrimester(ga.weeks) : null;

  // Count existing visits
  const { count } = await supabase
    .from('anc_visits')
    .select('id', { count: 'exact', head: true })
    .eq('pregnancy_episode_id', params.pregnancy_episode_id);

  const { data, error } = await supabase
    .from('anc_visits')
    .insert({
      pregnancy_episode_id: params.pregnancy_episode_id,
      encounter_id: params.encounter_id,
      visit_number: (count || 0) + 1,
      visit_type: params.visit_type,
      visit_date: params.visit_date || new Date().toISOString().split('T')[0],
      gestational_age_weeks: ga?.weeks ?? null,
      gestational_age_days: ga?.days ?? null,
      trimester,
      visit_status: 'in_progress',
      created_by: staff?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throwSupabaseError(error);
  return data as AncVisit;
}

export async function updateAncVisit(
  visitId: string,
  updates: Partial<AncVisit>,
): Promise<void> {
  const { error } = await supabase
    .from('anc_visits')
    .update(updates)
    .eq('id', visitId);
  if (error) throwSupabaseError(error);
}

export async function completeAncVisit(visitId: string): Promise<void> {
  const { error } = await supabase
    .from('anc_visits')
    .update({ visit_status: 'completed' })
    .eq('id', visitId);
  if (error) throwSupabaseError(error);
}

// =============================================================================
// ANC Observations
// =============================================================================

export async function getObservationsForVisit(
  visitId: string,
): Promise<AncObservation[]> {
  const { data, error } = await supabase
    .from('anc_observations')
    .select('*')
    .eq('anc_visit_id', visitId)
    .order('created_at', { ascending: false });
  if (error) throwSupabaseError(error);
  return (data || []) as AncObservation[];
}

export async function getObservationsForPregnancy(
  episodeId: string,
): Promise<AncObservation[]> {
  const { data, error } = await supabase
    .from('anc_observations')
    .select('*')
    .eq('pregnancy_episode_id', episodeId)
    .order('created_at', { ascending: true });
  if (error) throwSupabaseError(error);
  return (data || []) as AncObservation[];
}

export async function createObservation(
  dto: AncObservationFormDTO,
): Promise<AncObservation> {
  const staff = await getCurrentStaff();

  // Calculate BMI if weight + height given
  let bmi: number | undefined;
  if (dto.weight_kg && dto.height_cm) {
    const heightM = dto.height_cm / 100;
    bmi = parseFloat((dto.weight_kg / (heightM * heightM)).toFixed(1));
  }

  const { data, error } = await supabase
    .from('anc_observations')
    .insert({
      ...dto,
      bmi: bmi ?? null,
      recorded_by: staff?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throwSupabaseError(error);

  // Also save standard vitals to vitals table for consistency
  // Get the encounter_id from the ANC visit
  const visit = await getAncVisit(dto.anc_visit_id);
  if (visit?.encounter_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: staffRow } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user?.email ?? '')
      .maybeSingle();
    await supabase.from('vitals').insert({
      encounter_id: visit.encounter_id,
      patient_id: (await getPregnancyEpisode(dto.pregnancy_episode_id))
        ?.patient_id,
      blood_pressure_systolic: dto.systolic_bp || null,
      blood_pressure_diastolic: dto.diastolic_bp || null,
      pulse: dto.pulse || null,
      temperature: dto.temperature || null,
      respiratory_rate: dto.respiratory_rate || null,
      weight: dto.weight_kg || null,
      height: dto.height_cm || null,
      bmi: bmi || null,
      nurse_id: staffRow?.id || null,
      date_recorded: new Date().toISOString(),
    });
  }

  // Mark nurse as completed on the visit
  await supabase
    .from('anc_visits')
    .update({ nurse_completed: true })
    .eq('id', dto.anc_visit_id);

  return data as AncObservation;
}

// =============================================================================
// Risk Flags
// =============================================================================

export async function getRiskFlags(episodeId: string): Promise<AncRiskFlag[]> {
  const { data, error } = await supabase
    .from('anc_risk_flags')
    .select('*')
    .eq('pregnancy_episode_id', episodeId)
    .order('detected_at', { ascending: false });
  if (error) throwSupabaseError(error);
  return (data || []) as AncRiskFlag[];
}

export async function getActiveRiskFlags(
  episodeId: string,
): Promise<AncRiskFlag[]> {
  const { data, error } = await supabase
    .from('anc_risk_flags')
    .select('*')
    .eq('pregnancy_episode_id', episodeId)
    .eq('active', true)
    .order('severity', { ascending: false });
  if (error) throwSupabaseError(error);
  return (data || []) as AncRiskFlag[];
}

export async function createRiskFlag(
  dto: AncRiskFlagFormDTO,
): Promise<AncRiskFlag> {
  const staff = await getCurrentStaff();
  const { data, error } = await supabase
    .from('anc_risk_flags')
    .insert({
      ...dto,
      active: true,
      detected_at: new Date().toISOString(),
      created_by: staff?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throwSupabaseError(error);

  // Update pregnancy episode risk level if new flag is higher
  const episode = await getPregnancyEpisode(dto.pregnancy_episode_id);
  if (episode) {
    const riskOrder = { low: 0, moderate: 1, high: 2, critical: 3 };
    const episodeRiskOrder = { low: 0, moderate: 1, high: 2 };
    const newSeverity = dto.severity === 'critical' ? 'high' : dto.severity;
    if (riskOrder[dto.severity] > (episodeRiskOrder[episode.risk_level] ?? 0)) {
      await updatePregnancyEpisode(dto.pregnancy_episode_id, {
        risk_level: newSeverity as 'low' | 'moderate' | 'high',
      });
    }
  }

  return data as AncRiskFlag;
}

export async function resolveRiskFlag(flagId: string): Promise<void> {
  const { error } = await supabase
    .from('anc_risk_flags')
    .update({ active: false, resolved_at: new Date().toISOString() })
    .eq('id', flagId);
  if (error) throwSupabaseError(error);
}

// =============================================================================
// Pregnancy Outcomes
// =============================================================================

export async function getPregnancyOutcome(
  episodeId: string,
): Promise<PregnancyOutcome | null> {
  const { data, error } = await supabase
    .from('pregnancy_outcomes')
    .select('*')
    .eq('pregnancy_episode_id', episodeId)
    .maybeSingle();
  if (error) throwSupabaseError(error);
  return data as PregnancyOutcome | null;
}

export async function createPregnancyOutcome(
  dto: DeliveryOutcomeFormDTO,
): Promise<PregnancyOutcome> {
  const staff = await getCurrentStaff();
  const { data, error } = await supabase
    .from('pregnancy_outcomes')
    .insert({
      ...dto,
      recorded_by: staff?.id ?? null,
    })
    .select('*')
    .single();
  if (error) throwSupabaseError(error);

  // Close the pregnancy episode
  await supabase
    .from('pregnancy_episodes')
    .update({ status: 'delivered' })
    .eq('id', dto.pregnancy_episode_id);

  return data as PregnancyOutcome;
}

// =============================================================================
// ANC Visit + Encounter Creation (integrated with existing encounter engine)
// =============================================================================

export async function createAncEncounterAndVisit(params: {
  patient_id: string;
  pregnancy_episode_id: string;
  visit_type: 'booking' | 'routine_followup' | 'urgent_review';
  clinic_id?: string;
  attending_doctor_id?: string;
  chief_complaint?: string;
}): Promise<{ encounter_id: string; anc_visit_id: string }> {
  const staff = await getCurrentStaff();

  // 1. Create encounter in existing visits table
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .insert({
      patient_id: params.patient_id,
      visit_type: 'Antenatal',
      encounter_category: 'outpatient',
      payment_category: 'Cash',
      priority: params.visit_type === 'urgent_review' ? 'Urgent' : 'Normal',
      chief_complaint:
        params.chief_complaint || `ANC ${params.visit_type.replace('_', ' ')}`,
      clinic_id: params.clinic_id || null,
      attending_doctor_id: params.attending_doctor_id || null,
      status: 'Active',
      current_stage: 'nursing_vitals',
      registered_by: staff?.id ?? null,
      start_time: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (visitError) throwSupabaseError(visitError);

  // 2. Create ANC visit linked to encounter and pregnancy
  const ancVisit = await createAncVisit({
    pregnancy_episode_id: params.pregnancy_episode_id,
    encounter_id: visit.id,
    visit_type: params.visit_type,
  });

  return { encounter_id: visit.id, anc_visit_id: ancVisit.id };
}

// =============================================================================
// Doctor Review — saves to existing consultations table
// =============================================================================

export async function saveAncDoctorReview(
  dto: AncDoctorReviewFormDTO,
): Promise<void> {
  const staff = await getCurrentStaff();

  // Consultations table has legacy FK columns referencing non-PK fields:
  //   patient_id -> patients(patient_id), NOT patients(id)
  //   doctor_id  -> staff(staff_id), NOT staff(id)
  // Look up the legacy patient_id value
  const { data: patientRow } = await supabase
    .from('patients')
    .select('patient_id')
    .eq('id', dto.patient_id)
    .single();

  // Save consultation in existing consultations table
  const { error: consError } = await supabase.from('consultations').insert({
    encounter_id: dto.encounter_id,
    patient_id: patientRow?.patient_id ?? dto.patient_id,
    patient_uuid: dto.patient_id,
    doctor_id: staff?.staff_id ?? null,
    doctor_uuid: staff?.id ?? null,
    subjective: dto.subjective,
    objective: dto.objective || null,
    assessment: dto.assessment || null,
    plan: dto.plan || null,
    treatment_plan: dto.plan || null,
    follow_up_date: dto.next_visit_date || null,
    follow_up_notes: dto.follow_up_notes || null,
    notes: `ANC Review | Risk: ${dto.risk_classification} | ${dto.delivery_plan ? `Delivery Plan: ${dto.delivery_plan}` : ''}`,
    status: 'Completed',
  });
  if (consError) throwSupabaseError(consError);

  // Update ANC visit: doctor completed
  await supabase
    .from('anc_visits')
    .update({
      doctor_completed: true,
      next_visit_date: dto.next_visit_date || null,
    })
    .eq('id', dto.anc_visit_id);

  // Update pregnancy risk level
  await supabase
    .from('pregnancy_episodes')
    .update({ risk_level: dto.risk_classification })
    .eq('id', dto.pregnancy_episode_id);

  // Create follow-up appointment if next_visit_date is set
  // appointments.doctor_id references staff(id) UUID
  if (dto.next_visit_date) {
    const episode = await getPregnancyEpisode(dto.pregnancy_episode_id);
    await supabase.from('appointments').insert({
      patient_id: dto.patient_id,
      doctor_id: episode?.primary_doctor_id || staff?.id || null,
      department_id: episode?.department_id || null,
      appointment_date: dto.next_visit_date,
      type: 'Follow-up',
      status: 'Scheduled',
      reason: 'ANC Follow-up Visit',
      notes: dto.follow_up_notes || null,
    });
  }
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export async function getAncDashboardStats(): Promise<AncDashboardStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split('T')[0];

    // Active pregnancies
    const { count: totalActive } = await supabase
      .from('pregnancy_episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // Today's visits
    const { count: todayVisits } = await supabase
      .from('anc_visits')
      .select('id', { count: 'exact', head: true })
      .eq('visit_date', today);

    // High-risk pregnancies
    const { count: highRisk } = await supabase
      .from('pregnancy_episodes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('risk_level', 'high');

    // Overdue visits (next_visit_date < today and visit was completed)
    const { count: overdueVisits } = await supabase
      .from('anc_visits')
      .select('id', { count: 'exact', head: true })
      .lt('next_visit_date', today)
      .eq('visit_status', 'completed');

    // Deliveries this month
    const { count: deliveriesThisMonth } = await supabase
      .from('pregnancy_outcomes')
      .select('id', { count: 'exact', head: true })
      .gte('delivery_date', monthStart);

    return {
      totalActive: totalActive || 0,
      todayVisits: todayVisits || 0,
      highRisk: highRisk || 0,
      overdueVisits: overdueVisits || 0,
      deliveriesThisMonth: deliveriesThisMonth || 0,
    };
  } catch {
    return {
      totalActive: 0,
      todayVisits: 0,
      highRisk: 0,
      overdueVisits: 0,
      deliveriesThisMonth: 0,
    };
  }
}

// =============================================================================
// Today's ANC Schedule
// =============================================================================

export async function getTodayAncSchedule(): Promise<AncVisit[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('anc_visits')
    .select(
      `
      *,
      pregnancy_episode:pregnancy_episode_id(
        id, patient_id, lmp, edd, risk_level, gravida, parity,
        patient:patient_id(id, first_name, surname, patient_id, contact_phone, date_of_birth)
      ),
      encounter:encounter_id(id, visit_id, status, current_stage)
    `,
    )
    .eq('visit_date', today)
    .order('created_at', { ascending: true });
  if (error) throwSupabaseError(error);
  return (data || []) as any[];
}

// =============================================================================
// Encounter-level Orders (Lab, Radiology, Prescriptions)
// Reuses same tables as other modules — keyed by encounter_id
// =============================================================================

export async function getAncEncounterLabRequests(encounterId: string) {
  const { data } = await supabase
    .from('lab_requests')
    .select(
      '*, test:lab_test_catalogue(name, code, category), results:lab_results(id, result_value, unit, reference_range, is_abnormal, is_critical, comments, interpretation, workflow_status, reported_at, approved_at)',
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getAncEncounterRadiologyRequests(encounterId: string) {
  const { data } = await supabase
    .from('radiology_requests')
    .select(
      '*, imaging:imaging_catalogue(name, code, modality, body_part)',
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getAncEncounterPrescriptions(encounterId: string) {
  const { data } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}
