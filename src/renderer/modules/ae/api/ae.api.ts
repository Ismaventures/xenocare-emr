// =============================================================================
// A&E Module — Supabase API Layer
// All operations link to existing visits.id (encounter_id)
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  AeArrival,
  AePrimarySurvey,
  AeDisposition,
  AeTimelineEvent,
  AeFluidChart,
  AeProcedure,
  AeEncounterSummary,
  AeDashboardStats,
  TimelineEventCategory,
  TimelineSeverity,
  TriageLevel,
} from './ae.types';
import { triageLevelToAcuityColor } from './ae.types';
import type {
  ArrivalFormDTO,
  TriageFormDTO,
  PrimarySurveyFormDTO,
  DispositionFormDTO,
  FluidChartFormDTO,
  AeProcedureFormDTO,
} from '../dtos/ae.dto';

// =============================================================================
// A&E Order Creation (Lab, Radiology, Prescription, Procedure)
// Reuses same tables as Consultation module but with A&E context
// =============================================================================

import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
  ProcedureOrderDTO,
  AdmissionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';

import {
  isPatientNhis,
  createServiceApprovalRequest,
} from '../../../lib/nhis/serviceApprovalWorkflow';

import { resolvePatientVarcharId } from '../../../lib/patient-id-resolver';

// =============================================================================
// Helpers
// =============================================================================

async function getCurrentStaffId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();
  return data?.id ?? null;
}

// =============================================================================
// Timeline Events — Audit trail for all A&E actions
// =============================================================================

export async function logTimelineEvent(params: {
  encounter_id: string;
  patient_id: string;
  event_type: string;
  event_category: TimelineEventCategory;
  title: string;
  description?: string;
  details?: any;
  severity?: TimelineSeverity;
  source_table?: string;
  source_id?: string;
  performed_by?: string | null;
}): Promise<void> {
  const { performed_by, ...payload } = params;
  const staffId = performed_by ?? (await getCurrentStaffId());
  const { error } = await supabase.from('ae_timeline_events').insert({
    ...payload,
    severity: payload.severity || 'info',
    performed_by: staffId,
    performed_at: new Date().toISOString(),
  });
  if (error) {
    console.error('[A&E] Timeline event insert failed:', error.message, {
      event_type: params.event_type,
      encounter_id: params.encounter_id,
    });
  }
}

export async function getTimelineEvents(
  encounterId: string,
): Promise<AeTimelineEvent[]> {
  // Fetch from ae_timeline_events (may be empty if inserts failed)
  const { data: tlData } = await supabase
    .from('ae_timeline_events')
    .select('*, staff:performed_by(first_name, last_name, role)')
    .eq('encounter_id', encounterId)
    .order('performed_at', { ascending: false });
  const existingEvents = (tlData || []) as AeTimelineEvent[];

  // Build set of source records already represented in timeline
  const coveredSources = new Set(
    existingEvents
      .filter((e) => e.source_table && e.source_id)
      .map((e) => `${e.source_table}:${e.source_id}`),
  );

  // Helper to create a synthetic timeline event
  const synth = (
    id: string,
    patientId: string,
    category: TimelineEventCategory,
    eventType: string,
    title: string,
    description: string,
    performedAt: string,
    details?: any,
    severity?: TimelineSeverity,
    staffObj?: { first_name: string; last_name: string; role?: string } | null,
  ): AeTimelineEvent => ({
    id: `synth-${id}`,
    encounter_id: encounterId,
    patient_id: patientId,
    event_type: eventType,
    event_category: category,
    title,
    description,
    details,
    severity: severity || 'info',
    performed_by: null,
    performed_at: performedAt,
    created_at: performedAt,
    staff: staffObj || null,
  });

  const compositeEvents: AeTimelineEvent[] = [];

  // ── Arrivals ──────────────────────────────────────────────────────────────
  const { data: arrivals } = await supabase
    .from('ae_arrivals')
    .select('*, staff:created_by(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const a of arrivals || []) {
    if (coveredSources.has(`ae_arrivals:${a.id}`)) continue;
    compositeEvents.push(
      synth(
        `arr-${a.id}`,
        a.patient_id,
        'arrival',
        'arrival_registered',
        `Patient arrived via ${(a.arrival_mode || 'unknown').replace(/_/g, ' ')}`,
        `Chief Complaint: ${a.chief_complaint || 'Not specified'} | Arrival Mode: ${(a.arrival_mode || '').replace(/_/g, ' ')}${a.referral_source ? ` | Referral: ${a.referral_source}` : ''}`,
        a.arrival_time || a.created_at,
        {
          arrival_mode: a.arrival_mode,
          chief_complaint: a.chief_complaint,
          referral_source: a.referral_source,
          incident_type: a.incident_type,
          medico_legal: a.medico_legal_flag,
        },
        'info',
        a.staff,
      ),
    );
  }

  // ── Triage ────────────────────────────────────────────────────────────────
  const { data: triageRows } = await supabase
    .from('triage_assessments')
    .select('*, staff:assessor_id(first_name, last_name, role)')
    .eq('visit_id', encounterId)
    .eq('is_ae_triage', true);
  for (const t of triageRows || []) {
    if (coveredSources.has(`triage_assessments:${t.id}`)) continue;
    const lvl = t.triage_level || t.acuity_level;
    compositeEvents.push(
      synth(
        `tri-${t.id}`,
        t.patient_id,
        'triage',
        'triage_completed',
        `Triage: Level ${lvl || '?'}${t.acuity_color ? ` (${t.acuity_color})` : ''}`,
        [
          t.consciousness ? `Consciousness: ${t.consciousness}` : null,
          t.bp_systolic && t.bp_diastolic ? `BP: ${t.bp_systolic}/${t.bp_diastolic}` : null,
          t.pulse_rate ? `HR: ${t.pulse_rate}` : null,
          t.temperature ? `Temp: ${t.temperature}°C` : null,
          t.oxygen_saturation ? `SpO2: ${t.oxygen_saturation}%` : null,
          t.triage_notes ? `Notes: ${t.triage_notes}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || 'Triage assessment completed',
        t.created_at,
        {
          triage_level: lvl,
          consciousness: t.consciousness,
          bp: t.bp_systolic && t.bp_diastolic ? `${t.bp_systolic}/${t.bp_diastolic}` : null,
          pulse_rate: t.pulse_rate,
          temperature: t.temperature,
          oxygen_saturation: t.oxygen_saturation,
        },
        lvl && Number(lvl) <= 2 ? 'critical' : 'info',
        t.staff,
      ),
    );
  }

  // ── Primary Survey ────────────────────────────────────────────────────────
  const { data: surveys } = await supabase
    .from('ae_primary_surveys')
    .select('*, staff:assessed_by(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const s of surveys || []) {
    if (coveredSources.has(`ae_primary_surveys:${s.id}`)) continue;
    const gcsTotal =
      s.gcs_eye && s.gcs_verbal && s.gcs_motor
        ? s.gcs_eye + s.gcs_verbal + s.gcs_motor
        : null;
    compositeEvents.push(
      synth(
        `ps-${s.id}`,
        s.patient_id,
        'assessment',
        'primary_survey',
        `ABCDE Survey${gcsTotal ? ` (GCS: ${gcsTotal}/15)` : ''}`,
        [
          s.airway_status ? `Airway: ${s.airway_status}` : null,
          s.breathing_status ? `Breathing: ${s.breathing_status}` : null,
          s.circulation_status ? `Circulation: ${s.circulation_status}` : null,
          gcsTotal ? `GCS: ${gcsTotal}/15` : null,
          s.consciousness ? `Consciousness: ${s.consciousness}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || 'Primary survey completed',
        s.created_at,
        {
          airway: s.airway_status,
          breathing: s.breathing_status,
          circulation: s.circulation_status,
          gcs_total: gcsTotal,
          consciousness: s.consciousness,
        },
        gcsTotal && gcsTotal <= 8 ? 'critical' : 'info',
        s.staff,
      ),
    );
  }

  // ── Consultations ─────────────────────────────────────────────────────────
  const { data: consults } = await supabase
    .from('consultations')
    .select('*, doctor:doctor_id(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const c of consults || []) {
    if (coveredSources.has(`consultations:${c.id}`)) continue;
    compositeEvents.push(
      synth(
        `con-${c.id}`,
        c.patient_id,
        'assessment',
        'consultation',
        `Consultation: ${c.diagnosis || c.presenting_complaint || 'Assessment'}`,
        [
          c.presenting_complaint ? `Complaint: ${c.presenting_complaint}` : null,
          c.diagnosis ? `Diagnosis: ${c.diagnosis}` : null,
          c.plan ? `Plan: ${c.plan}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || 'Clinical consultation',
        c.created_at,
        {
          diagnosis: c.diagnosis,
          presenting_complaint: c.presenting_complaint,
        },
        'info',
        c.doctor,
      ),
    );
  }

  // ── Disposition ───────────────────────────────────────────────────────────
  const { data: dispos } = await supabase
    .from('ae_dispositions')
    .select('*, staff:decided_by(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const d of dispos || []) {
    if (coveredSources.has(`ae_dispositions:${d.id}`)) continue;
    compositeEvents.push(
      synth(
        `dsp-${d.id}`,
        d.patient_id,
        'disposition',
        'disposition',
        `Disposition: ${(d.disposition_type || 'Unknown').replace(/_/g, ' ')}`,
        [
          d.final_diagnosis ? `Diagnosis: ${d.final_diagnosis}` : null,
          d.condition_at_disposition ? `Condition: ${d.condition_at_disposition}` : null,
          d.disposition_notes ? `Notes: ${d.disposition_notes}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || 'Disposition recorded',
        d.created_at,
        { type: d.disposition_type, diagnosis: d.final_diagnosis },
        'warning',
        d.staff,
      ),
    );
  }

  // ── Vitals ────────────────────────────────────────────────────────────────
  const { data: vitals } = await supabase
    .from('vitals')
    .select('*, staff:nurse_id(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const v of vitals || []) {
    if (coveredSources.has(`vitals:${v.id}`)) continue;
    const parts = [
      v.blood_pressure_systolic && v.blood_pressure_diastolic
        ? `BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
        : null,
      v.pulse ? `HR: ${v.pulse}` : null,
      v.respiratory_rate ? `RR: ${v.respiratory_rate}` : null,
      v.oxygen_saturation ? `SpO2: ${v.oxygen_saturation}%` : null,
      v.temperature ? `Temp: ${v.temperature}°C` : null,
    ].filter(Boolean);
    if (parts.length === 0) continue; // skip empty vitals
    compositeEvents.push(
      synth(
        `vit-${v.id}`,
        v.patient_id,
        'observation',
        'vital_observation',
        'Vital signs recorded',
        parts.join(' | '),
        v.created_at,
        {
          bp:
            v.blood_pressure_systolic && v.blood_pressure_diastolic
              ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
              : null,
          hr: v.pulse,
          rr: v.respiratory_rate,
          spo2: v.oxygen_saturation,
          temp: v.temperature,
        },
        'info',
        v.staff,
      ),
    );
  }

  // ── Fluid Charts ──────────────────────────────────────────────────────────
  const { data: fluids } = await supabase
    .from('ae_fluid_charts')
    .select('*, staff:administered_by(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const f of fluids || []) {
    if (coveredSources.has(`ae_fluid_charts:${f.id}`)) continue;
    compositeEvents.push(
      synth(
        `flu-${f.id}`,
        f.patient_id,
        'treatment',
        'fluid_started',
        `Fluid: ${f.fluid_type || 'IV Fluid'} (${(f.route || 'IV').toUpperCase()})`,
        `${f.fluid_type || 'Fluid'} via ${(f.route || 'IV').toUpperCase()}${f.rate_ml_hr ? ` at ${f.rate_ml_hr} ml/hr` : ''}${f.volume_ml ? `, Vol: ${f.volume_ml} ml` : ''}`,
        f.start_time || f.created_at,
        { fluid_type: f.fluid_type, route: f.route, rate: f.rate_ml_hr },
        'info',
        f.staff,
      ),
    );
  }

  // ── Procedures ────────────────────────────────────────────────────────────
  const { data: procs } = await supabase
    .from('ae_procedures')
    .select('*, staff:performed_by(first_name, last_name, role)')
    .eq('encounter_id', encounterId);
  for (const p of procs || []) {
    if (coveredSources.has(`ae_procedures:${p.id}`)) continue;
    compositeEvents.push(
      synth(
        `prc-${p.id}`,
        p.patient_id,
        'procedure',
        'procedure_performed',
        `Procedure: ${p.procedure_name || 'Procedure'}${p.outcome ? ` (${p.outcome})` : ''}`,
        [
          p.indication ? `Indication: ${p.indication}` : null,
          p.technique ? `Technique: ${p.technique}` : null,
          p.outcome ? `Outcome: ${p.outcome}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || 'Procedure performed',
        p.start_time || p.created_at,
        { procedure: p.procedure_name, outcome: p.outcome },
        'info',
        p.staff,
      ),
    );
  }

  // ── Lab Orders ────────────────────────────────────────────────────────────
  const { data: labs } = await supabase
    .from('lab_requests')
    .select('*, test:lab_test_catalogue(name, code, category)')
    .eq('encounter_id', encounterId);
  for (const l of labs || []) {
    if (coveredSources.has(`lab_requests:${l.id}`)) continue;
    compositeEvents.push(
      synth(
        `lab-${l.id}`,
        l.patient_id,
        'order',
        'lab_ordered',
        `Lab ordered: ${l.test?.name || l.test_name || 'Lab Test'}`,
        `Test: ${l.test?.name || l.test_name || 'Lab Test'} | Priority: ${l.priority || 'Routine'} | Status: ${l.status || 'Pending'}`,
        l.created_at,
        { test: l.test?.name, priority: l.priority, status: l.status },
        'info',
        null,
      ),
    );
  }

  // ── Radiology Orders ──────────────────────────────────────────────────────
  const { data: rads } = await supabase
    .from('radiology_requests')
    .select('*')
    .eq('encounter_id', encounterId);
  for (const r of rads || []) {
    if (coveredSources.has(`radiology_requests:${r.id}`)) continue;
    compositeEvents.push(
      synth(
        `rad-${r.id}`,
        r.patient_id,
        'order',
        'imaging_ordered',
        `Imaging ordered: ${r.study_name || r.modality || 'Imaging'}`,
        `Study: ${r.study_name || 'Imaging'} | Modality: ${r.modality || 'N/A'} | Status: ${r.status || 'Pending'}`,
        r.created_at,
        { study: r.study_name, modality: r.modality, status: r.status },
        'info',
        null,
      ),
    );
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────
  const { data: rxs } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('encounter_id', encounterId);
  for (const rx of rxs || []) {
    if (coveredSources.has(`prescriptions:${rx.id}`)) continue;
    compositeEvents.push(
      synth(
        `rx-${rx.id}`,
        rx.patient_id,
        'order',
        'medication_ordered',
        `Rx: ${rx.drug_name || 'Medication'} ${rx.dosage || ''}`.trim(),
        `Drug: ${rx.drug_name || 'Medication'} | Dosage: ${rx.dosage || 'N/A'} | Frequency: ${rx.frequency || 'N/A'} | Status: ${rx.status || 'Pending'}`,
        rx.created_at,
        { drug: rx.drug_name, dosage: rx.dosage, frequency: rx.frequency },
        'info',
        null,
      ),
    );
  }

  // ── Merge & sort chronologically (newest first) ───────────────────────────
  const all = [...existingEvents, ...compositeEvents];
  all.sort(
    (a, b) =>
      new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime(),
  );
  return all;
}

// =============================================================================
// Consultations — Fetch all consultations for an encounter
// =============================================================================

export async function getEncounterConsultations(encounterId: string) {
  const { data, error } = await supabase
    .from('consultations')
    .select('*, doctor:doctor_id(first_name, last_name, role)')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// =============================================================================
// Arrival
// =============================================================================

export async function createArrival(
  dto: ArrivalFormDTO,
  encounterId: string,
): Promise<AeArrival> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Staff not authenticated');

  const { data, error } = await supabase
    .from('ae_arrivals')
    .insert({
      encounter_id: encounterId,
      patient_id: dto.patient_id,
      arrival_time: dto.arrival_time || new Date().toISOString(),
      arrival_mode: dto.arrival_mode,
      referral_source: dto.referral_source,
      referral_source_detail: dto.referral_source_detail || null,
      chief_complaint: dto.chief_complaint,
      incident_type: dto.incident_type || null,
      incident_time: dto.incident_time || null,
      incident_location: dto.incident_location || null,
      medico_legal_flag: dto.medico_legal_flag,
      medico_legal_notes: dto.medico_legal_notes || null,
      brought_by_name: dto.brought_by_name || null,
      brought_by_phone: dto.brought_by_phone || null,
      brought_by_relationship: dto.brought_by_relationship || null,
      created_by: staffId,
    })
    .select()
    .single();

  if (error) throw error;

  // Update encounter stage
  await supabase
    .from('visits')
    .update({ current_stage: 'ae_arrival' })
    .eq('id', encounterId);

  // Update queue location to Triage
  await supabase
    .from('queue')
    .update({ location: 'Triage', status: 'Waiting' })
    .eq('encounter_id', encounterId)
    .eq('status', 'Waiting');

  // Log timeline
  const arrivalDescParts: string[] = [];
  arrivalDescParts.push(
    `Chief Complaint: ${dto.chief_complaint || 'Not specified'}`,
  );
  arrivalDescParts.push(`Arrival Mode: ${dto.arrival_mode.replace(/_/g, ' ')}`);
  arrivalDescParts.push(`Referral Source: ${dto.referral_source || 'N/A'}`);
  if (dto.referral_source_detail)
    arrivalDescParts.push(`Referral Detail: ${dto.referral_source_detail}`);
  if (dto.incident_type)
    arrivalDescParts.push(
      `Incident Type: ${dto.incident_type.replace(/_/g, ' ')}`,
    );
  if (dto.incident_time)
    arrivalDescParts.push(
      `Incident Time: ${new Date(dto.incident_time).toLocaleString()}`,
    );
  if (dto.incident_location)
    arrivalDescParts.push(`Incident Location: ${dto.incident_location}`);
  if (dto.medico_legal_flag) arrivalDescParts.push(`Medico-Legal Case: Yes`);
  if (dto.medico_legal_notes)
    arrivalDescParts.push(`Medico-Legal Notes: ${dto.medico_legal_notes}`);
  if (dto.brought_by_name)
    arrivalDescParts.push(
      `Brought By: ${dto.brought_by_name} (${dto.brought_by_relationship || 'N/A'}) — ${dto.brought_by_phone || 'No phone'}`,
    );

  await logTimelineEvent({
    encounter_id: encounterId,
    patient_id: dto.patient_id,
    event_type: 'arrival_registered',
    event_category: 'arrival',
    title: `Patient arrived via ${dto.arrival_mode.replace(/_/g, ' ')}`,
    description: arrivalDescParts.join(' | '),
    details: {
      arrival_mode: dto.arrival_mode,
      chief_complaint: dto.chief_complaint,
      referral_source: dto.referral_source,
      referral_source_detail: dto.referral_source_detail,
      incident_type: dto.incident_type,
      incident_time: dto.incident_time,
      incident_location: dto.incident_location,
      medico_legal: dto.medico_legal_flag,
      medico_legal_notes: dto.medico_legal_notes,
      brought_by_name: dto.brought_by_name,
      brought_by_phone: dto.brought_by_phone,
      brought_by_relationship: dto.brought_by_relationship,
    },
    source_table: 'ae_arrivals',
    source_id: data.id,
  });

  return data as AeArrival;
}

export async function getArrival(
  encounterId: string,
): Promise<AeArrival | null> {
  const { data } = await supabase
    .from('ae_arrivals')
    .select('*')
    .eq('encounter_id', encounterId)
    .maybeSingle();
  return data as AeArrival | null;
}

// =============================================================================
// Triage — Saves vitals + triage_assessments
// =============================================================================

export async function saveAeTriage(dto: TriageFormDTO): Promise<void> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Staff not authenticated');

  const acuityColor = triageLevelToAcuityColor(dto.triage_level as TriageLevel);

  // 1. Save vitals
  const { error: vitalsError } = await supabase.from('vitals').insert({
    encounter_id: dto.encounter_id,
    patient_id: dto.patient_id,
    temperature: dto.temperature || null,
    blood_pressure_systolic: dto.bp_systolic || null,
    blood_pressure_diastolic: dto.bp_diastolic || null,
    pulse: dto.pulse_rate || null,
    respiratory_rate: dto.respiratory_rate || null,
    oxygen_saturation: dto.oxygen_saturation || null,
    blood_glucose: dto.blood_glucose || null,
    weight: dto.weight || null,
    pain_level: dto.pain_score || null,
    nurse_id: staffId,
    is_critical: dto.triage_level <= 2,
  });

  if (vitalsError) throw vitalsError;

  // 2. Save triage_assessments (check existing first, then insert or update)
  const { data: existingTriage } = await supabase
    .from('triage_assessments')
    .select('id')
    .eq('visit_id', dto.encounter_id)
    .maybeSingle();

  const triagePayload = {
    visit_id: dto.encounter_id,
    patient_id: dto.patient_id,
    temperature: dto.temperature || null,
    pulse_rate: dto.pulse_rate || null,
    respiratory_rate: dto.respiratory_rate || null,
    blood_pressure_systolic: dto.bp_systolic || null,
    blood_pressure_diastolic: dto.bp_diastolic || null,
    oxygen_saturation: dto.oxygen_saturation || null,
    blood_glucose: dto.blood_glucose || null,
    weight: dto.weight || null,
    pain_score: dto.pain_score || null,
    chief_complaint_text: null,
    consciousness: dto.consciousness,
    triage_level: dto.triage_level,
    triage_color: acuityColor,
    acuity_color: acuityColor,
    trauma_mechanism: dto.trauma_mechanism || null,
    red_flags: dto.red_flags,
    allergies_noted: dto.allergies_noted || null,
    triage_notes: dto.triage_notes || null,
    is_ae_triage: true,
    status: 'Completed',
    triaged_by: staffId,
  };

  let triageError: any;
  if (existingTriage?.id) {
    const result = await supabase
      .from('triage_assessments')
      .update(triagePayload)
      .eq('id', existingTriage.id);
    triageError = result.error;
  } else {
    const insertResult = await supabase
      .from('triage_assessments')
      .insert(triagePayload);
    if (insertResult.error && insertResult.error.code === '23505') {
      // Race condition: another request inserted between check and insert
      const { data: retryExisting } = await supabase
        .from('triage_assessments')
        .select('id')
        .eq('visit_id', dto.encounter_id)
        .maybeSingle();
      if (retryExisting?.id) {
        const updateResult = await supabase
          .from('triage_assessments')
          .update(triagePayload)
          .eq('id', retryExisting.id);
        triageError = updateResult.error;
      } else {
        triageError = insertResult.error;
      }
    } else {
      triageError = insertResult.error;
    }
  }

  if (triageError) throw triageError;

  // 3. Update encounter stage + priority based on acuity
  const newPriority =
    dto.triage_level <= 2
      ? 'Emergency'
      : dto.triage_level === 3
        ? 'Urgent'
        : 'Normal';
  await supabase
    .from('visits')
    .update({
      current_stage: 'ae_triage',
      priority: newPriority,
    })
    .eq('id', dto.encounter_id);

  // 4. Route queue based on acuity
  const queueLocation = dto.triage_level <= 2 ? 'Resuscitation' : 'Emergency';
  await supabase
    .from('queue')
    .update({
      location: queueLocation,
      priority: newPriority,
      status: 'Waiting',
    })
    .eq('encounter_id', dto.encounter_id);

  // 5. Log timeline with comprehensive details
  const triageDescParts: string[] = [];
  triageDescParts.push(`ESI Level: ${dto.triage_level} (${acuityColor})`);
  triageDescParts.push(`Consciousness: ${dto.consciousness || 'N/A'}`);
  if (dto.bp_systolic && dto.bp_diastolic)
    triageDescParts.push(`BP: ${dto.bp_systolic}/${dto.bp_diastolic} mmHg`);
  if (dto.pulse_rate) triageDescParts.push(`Pulse: ${dto.pulse_rate} bpm`);
  if (dto.temperature) triageDescParts.push(`Temp: ${dto.temperature}°C`);
  if (dto.respiratory_rate)
    triageDescParts.push(`RR: ${dto.respiratory_rate} cpm`);
  if (dto.oxygen_saturation)
    triageDescParts.push(`SpO2: ${dto.oxygen_saturation}%`);
  if (dto.blood_glucose)
    triageDescParts.push(`Blood Glucose: ${dto.blood_glucose} mmol/L`);
  if (dto.weight) triageDescParts.push(`Weight: ${dto.weight} kg`);
  if (dto.pain_score) triageDescParts.push(`Pain Score: ${dto.pain_score}/10`);
  const gcsTriageTotal =
    dto.gcs_eye && dto.gcs_verbal && dto.gcs_motor
      ? dto.gcs_eye + dto.gcs_verbal + dto.gcs_motor
      : null;
  if (gcsTriageTotal)
    triageDescParts.push(
      `GCS: ${gcsTriageTotal}/15 (E${dto.gcs_eye}V${dto.gcs_verbal}M${dto.gcs_motor})`,
    );
  if (dto.trauma_mechanism)
    triageDescParts.push(`Trauma Mechanism: ${dto.trauma_mechanism}`);
  if (dto.red_flags && dto.red_flags.length > 0)
    triageDescParts.push(
      `Red Flags: ${dto.red_flags.map((f: string) => f.replace(/_/g, ' ')).join(', ')}`,
    );
  if (dto.allergies_noted)
    triageDescParts.push(`Allergies: ${dto.allergies_noted}`);
  if (dto.triage_notes)
    triageDescParts.push(`Triage Notes: ${dto.triage_notes}`);

  await logTimelineEvent({
    encounter_id: dto.encounter_id,
    patient_id: dto.patient_id,
    event_type: 'triage_completed',
    event_category: 'triage',
    title: `Triage: Level ${dto.triage_level} (${acuityColor})`,
    description: triageDescParts.join(' | '),
    details: {
      triage_level: dto.triage_level,
      acuity_color: acuityColor,
      consciousness: dto.consciousness,
      bp:
        dto.bp_systolic && dto.bp_diastolic
          ? `${dto.bp_systolic}/${dto.bp_diastolic}`
          : null,
      pulse_rate: dto.pulse_rate,
      temperature: dto.temperature,
      respiratory_rate: dto.respiratory_rate,
      oxygen_saturation: dto.oxygen_saturation,
      blood_glucose: dto.blood_glucose,
      weight: dto.weight,
      pain_score: dto.pain_score,
      gcs: gcsTriageTotal,
      trauma_mechanism: dto.trauma_mechanism,
      red_flags: dto.red_flags,
      allergies: dto.allergies_noted,
      triage_notes: dto.triage_notes,
    },
    severity:
      dto.triage_level <= 2
        ? 'critical'
        : dto.triage_level === 3
          ? 'warning'
          : 'info',
  });
}

export async function getAeTriage(encounterId: string) {
  const { data } = await supabase
    .from('triage_assessments')
    .select('*')
    .eq('visit_id', encounterId)
    .eq('is_ae_triage', true)
    .maybeSingle();
  return data;
}

// =============================================================================
// Primary Survey (ABCDE)
// =============================================================================

export async function savePrimarySurvey(
  dto: PrimarySurveyFormDTO,
): Promise<AePrimarySurvey> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Staff not authenticated');

  const { data, error } = await supabase
    .from('ae_primary_surveys')
    .insert({
      encounter_id: dto.encounter_id,
      patient_id: dto.patient_id,
      airway_status: dto.airway_status || null,
      airway_interventions: dto.airway_interventions,
      airway_notes: dto.airway_notes || null,
      breathing_status: dto.breathing_status || null,
      breathing_rate: dto.breathing_rate || null,
      spo2: dto.spo2 || null,
      chest_findings: dto.chest_findings || null,
      breathing_interventions: dto.breathing_interventions,
      breathing_notes: dto.breathing_notes || null,
      circulation_status: dto.circulation_status || null,
      heart_rate: dto.heart_rate || null,
      bp_systolic: dto.bp_systolic || null,
      bp_diastolic: dto.bp_diastolic || null,
      capillary_refill: dto.capillary_refill || null,
      bleeding_sites: dto.bleeding_sites,
      iv_access: dto.iv_access,
      circulation_interventions: dto.circulation_interventions,
      circulation_notes: dto.circulation_notes || null,
      gcs_eye: dto.gcs_eye || null,
      gcs_verbal: dto.gcs_verbal || null,
      gcs_motor: dto.gcs_motor || null,
      pupil_left: dto.pupil_left || null,
      pupil_right: dto.pupil_right || null,
      consciousness: dto.consciousness,
      disability_notes: dto.disability_notes || null,
      exposure_findings: dto.exposure_findings || null,
      injuries: dto.injuries,
      exposure_notes: dto.exposure_notes || null,
      performed_by: staffId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log timeline
  const gcsTotal =
    dto.gcs_eye && dto.gcs_verbal && dto.gcs_motor
      ? dto.gcs_eye + dto.gcs_verbal + dto.gcs_motor
      : null;

  const surveyDescParts: string[] = [];
  surveyDescParts.push(`Airway: ${dto.airway_status || 'N/A'}`);
  if (dto.airway_interventions?.length)
    surveyDescParts.push(
      `Airway Interventions: ${dto.airway_interventions.join(', ')}`,
    );
  if (dto.airway_notes)
    surveyDescParts.push(`Airway Notes: ${dto.airway_notes}`);
  surveyDescParts.push(`Breathing: ${dto.breathing_status || 'N/A'}`);
  if (dto.breathing_rate)
    surveyDescParts.push(`Breathing Rate: ${dto.breathing_rate}`);
  if (dto.spo2) surveyDescParts.push(`SpO2: ${dto.spo2}%`);
  if (dto.chest_findings)
    surveyDescParts.push(`Chest Findings: ${dto.chest_findings}`);
  if (dto.breathing_interventions?.length)
    surveyDescParts.push(
      `Breathing Interventions: ${dto.breathing_interventions.join(', ')}`,
    );
  if (dto.breathing_notes)
    surveyDescParts.push(`Breathing Notes: ${dto.breathing_notes}`);
  surveyDescParts.push(`Circulation: ${dto.circulation_status || 'N/A'}`);
  if (dto.heart_rate) surveyDescParts.push(`HR: ${dto.heart_rate} bpm`);
  if (dto.bp_systolic && dto.bp_diastolic)
    surveyDescParts.push(`BP: ${dto.bp_systolic}/${dto.bp_diastolic}`);
  if (dto.capillary_refill)
    surveyDescParts.push(`Cap Refill: ${dto.capillary_refill}`);
  if (dto.bleeding_sites?.length)
    surveyDescParts.push(`Bleeding Sites: ${dto.bleeding_sites.join(', ')}`);
  if (dto.iv_access?.length)
    surveyDescParts.push(`IV Access: ${dto.iv_access.join(', ')}`);
  if (dto.circulation_interventions?.length)
    surveyDescParts.push(
      `Circulation Interventions: ${dto.circulation_interventions.join(', ')}`,
    );
  if (dto.circulation_notes)
    surveyDescParts.push(`Circulation Notes: ${dto.circulation_notes}`);
  if (gcsTotal)
    surveyDescParts.push(
      `GCS: ${gcsTotal}/15 (E${dto.gcs_eye}V${dto.gcs_verbal}M${dto.gcs_motor})`,
    );
  if (dto.pupil_left || dto.pupil_right)
    surveyDescParts.push(
      `Pupils: L=${dto.pupil_left || 'N/A'} R=${dto.pupil_right || 'N/A'}`,
    );
  if (dto.consciousness)
    surveyDescParts.push(`Consciousness: ${dto.consciousness}`);
  if (dto.disability_notes)
    surveyDescParts.push(`Disability Notes: ${dto.disability_notes}`);
  if (dto.exposure_findings)
    surveyDescParts.push(`Exposure Findings: ${dto.exposure_findings}`);
  if (dto.injuries?.length)
    surveyDescParts.push(`Injuries: ${dto.injuries.join(', ')}`);
  if (dto.exposure_notes)
    surveyDescParts.push(`Exposure Notes: ${dto.exposure_notes}`);

  await logTimelineEvent({
    encounter_id: dto.encounter_id,
    patient_id: dto.patient_id,
    event_type: 'primary_survey',
    event_category: 'assessment',
    title: `ABCDE Survey${gcsTotal ? ` (GCS: ${gcsTotal}/15)` : ''}`,
    description: surveyDescParts.join(' | '),
    details: {
      airway: dto.airway_status,
      airway_interventions: dto.airway_interventions,
      airway_notes: dto.airway_notes,
      breathing: dto.breathing_status,
      breathing_rate: dto.breathing_rate,
      spo2: dto.spo2,
      chest_findings: dto.chest_findings,
      breathing_interventions: dto.breathing_interventions,
      breathing_notes: dto.breathing_notes,
      circulation: dto.circulation_status,
      heart_rate: dto.heart_rate,
      bp:
        dto.bp_systolic && dto.bp_diastolic
          ? `${dto.bp_systolic}/${dto.bp_diastolic}`
          : null,
      capillary_refill: dto.capillary_refill,
      bleeding_sites: dto.bleeding_sites,
      iv_access: dto.iv_access,
      circulation_interventions: dto.circulation_interventions,
      circulation_notes: dto.circulation_notes,
      gcs_total: gcsTotal,
      pupils: { left: dto.pupil_left, right: dto.pupil_right },
      consciousness: dto.consciousness,
      disability_notes: dto.disability_notes,
      exposure_findings: dto.exposure_findings,
      injuries: dto.injuries,
      exposure_notes: dto.exposure_notes,
    },
    severity:
      dto.airway_status === 'obstructed' || dto.circulation_status === 'arrest'
        ? 'critical'
        : 'info',
    source_table: 'ae_primary_surveys',
    source_id: data.id,
  });

  return data as AePrimarySurvey;
}

export async function getPrimarySurvey(
  encounterId: string,
): Promise<AePrimarySurvey | null> {
  const { data } = await supabase
    .from('ae_primary_surveys')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as AePrimarySurvey | null;
}

// =============================================================================
// Disposition
// =============================================================================

export async function createDisposition(
  dto: DispositionFormDTO,
): Promise<AeDisposition> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Staff not authenticated');

  const { data, error } = await supabase
    .from('ae_dispositions')
    .insert({
      encounter_id: dto.encounter_id,
      patient_id: dto.patient_id,
      disposition_type: dto.disposition_type,
      disposition_time: new Date().toISOString(),
      final_diagnosis: dto.final_diagnosis,
      final_diagnosis_icd10: dto.final_diagnosis_icd10 || null,
      secondary_diagnoses: dto.secondary_diagnoses,
      condition_at_disposition: dto.condition_at_disposition,
      discharge_instructions: dto.discharge_instructions || null,
      return_precautions: dto.return_precautions || null,
      follow_up_date: dto.follow_up_date || null,
      follow_up_clinic_id: dto.follow_up_clinic_id || null,
      medications_on_discharge: dto.medications_on_discharge,
      admission_ward_id: dto.admission_ward_id || null,
      admission_reason: dto.admission_reason || null,
      transfer_destination: dto.transfer_destination || null,
      transfer_reason: dto.transfer_reason || null,
      disposition_by: staffId,
    })
    .select()
    .single();

  if (error) throw error;

  // Handle disposition type outcomes
  if (
    dto.disposition_type === 'discharge' ||
    dto.disposition_type === 'death' ||
    dto.disposition_type === 'absconded' ||
    dto.disposition_type === 'left_against_advice'
  ) {
    // Close the encounter
    await supabase
      .from('visits')
      .update({
        status: dto.disposition_type === 'death' ? 'Completed' : 'Completed',
        current_stage: 'completed',
        end_time: new Date().toISOString(),
      })
      .eq('id', dto.encounter_id);

    // Complete queue entry
    await supabase
      .from('queue')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('encounter_id', dto.encounter_id);
  }

  if (dto.disposition_type === 'admit' && dto.admission_ward_id) {
    // Create admission record
    const { data: admission } = await supabase
      .from('admissions')
      .insert({
        encounter_id: dto.encounter_id,
        patient_id: dto.patient_id,
        admission_type: 'emergency',
        admission_source: 'emergency',
        current_ward_id: dto.admission_ward_id,
        admission_reason: dto.admission_reason || dto.final_diagnosis,
        admission_status: 'admitted',
        admitted_by: staffId,
      })
      .select()
      .single();

    // Update disposition with admission ID
    if (admission) {
      await supabase
        .from('ae_dispositions')
        .update({ admission_id: admission.id })
        .eq('id', data.id);
    }

    // Update encounter to inpatient
    await supabase
      .from('visits')
      .update({
        encounter_category: 'inpatient',
        status: 'Active',
        current_stage: 'ae_disposition',
      })
      .eq('id', dto.encounter_id);
  }

  if (dto.disposition_type === 'transfer') {
    // Create clinical_request for transfer
    await supabase.from('clinical_requests').insert({
      encounter_id: dto.encounter_id,
      patient_id: dto.patient_id,
      request_type: 'Transfer',
      urgency: 'Emergency',
      reason: dto.transfer_reason || `Transfer to ${dto.transfer_destination}`,
      status: 'Pending',
      requested_by: staffId,
    });
  }

  // Generate handover summary
  const handover = await generateHandoverSummary(dto.encounter_id);
  if (handover) {
    await supabase
      .from('ae_dispositions')
      .update({ handover_summary: handover })
      .eq('id', data.id);
  }

  // Log timeline
  const dispoDescParts: string[] = [];
  dispoDescParts.push(
    `Disposition: ${dto.disposition_type.replace(/_/g, ' ')}`,
  );
  dispoDescParts.push(`Final Diagnosis: ${dto.final_diagnosis || 'N/A'}`);
  if (dto.final_diagnosis_icd10)
    dispoDescParts.push(`ICD-10: ${dto.final_diagnosis_icd10}`);
  if (dto.secondary_diagnoses?.length)
    dispoDescParts.push(
      `Secondary Diagnoses: ${dto.secondary_diagnoses.join(', ')}`,
    );
  dispoDescParts.push(`Condition: ${dto.condition_at_disposition}`);
  if (dto.discharge_instructions)
    dispoDescParts.push(
      `Discharge Instructions: ${dto.discharge_instructions}`,
    );
  if (dto.return_precautions)
    dispoDescParts.push(`Return Precautions: ${dto.return_precautions}`);
  if (dto.follow_up_date)
    dispoDescParts.push(
      `Follow-Up: ${new Date(dto.follow_up_date).toLocaleDateString()}`,
    );
  if (dto.medications_on_discharge?.length)
    dispoDescParts.push(
      `Medications: ${dto.medications_on_discharge.join(', ')}`,
    );
  if (dto.admission_ward_id) dispoDescParts.push(`Admitted to Ward`);
  if (dto.admission_reason)
    dispoDescParts.push(`Admission Reason: ${dto.admission_reason}`);
  if (dto.transfer_destination)
    dispoDescParts.push(`Transfer To: ${dto.transfer_destination}`);
  if (dto.transfer_reason)
    dispoDescParts.push(`Transfer Reason: ${dto.transfer_reason}`);

  await logTimelineEvent({
    encounter_id: dto.encounter_id,
    patient_id: dto.patient_id,
    event_type: 'disposition',
    event_category: 'disposition',
    title: `Disposition: ${dto.disposition_type.replace(/_/g, ' ')} — ${dto.condition_at_disposition}`,
    description: dispoDescParts.join(' | '),
    details: {
      type: dto.disposition_type,
      diagnosis: dto.final_diagnosis,
      icd10: dto.final_diagnosis_icd10,
      secondary_diagnoses: dto.secondary_diagnoses,
      condition: dto.condition_at_disposition,
      discharge_instructions: dto.discharge_instructions,
      return_precautions: dto.return_precautions,
      follow_up_date: dto.follow_up_date,
      medications: dto.medications_on_discharge,
      admission_reason: dto.admission_reason,
      transfer_destination: dto.transfer_destination,
      transfer_reason: dto.transfer_reason,
    },
    severity: dto.disposition_type === 'death' ? 'critical' : 'success',
    source_table: 'ae_dispositions',
    source_id: data.id,
  });

  return data as AeDisposition;
}

export async function getDisposition(
  encounterId: string,
): Promise<AeDisposition | null> {
  const { data } = await supabase
    .from('ae_dispositions')
    .select('*')
    .eq('encounter_id', encounterId)
    .maybeSingle();
  return data as AeDisposition | null;
}

// =============================================================================
// Fluid Charts
// =============================================================================

export async function createFluidChart(
  dto: FluidChartFormDTO,
): Promise<AeFluidChart> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Staff not authenticated');

  const { data, error } = await supabase
    .from('ae_fluid_charts')
    .insert({
      encounter_id: dto.encounter_id,
      patient_id: dto.patient_id,
      fluid_type: dto.fluid_type,
      route: (dto.route || 'iv').toLowerCase(),
      rate_ml_hr: dto.rate_ml_hr || null,
      volume_ml: dto.volume_ml || null,
      start_time: dto.start_time || new Date().toISOString(),
      end_time: dto.end_time || null,
      urine_output_ml: dto.urine_output_ml || null,
      notes: dto.notes || null,
      administered_by: staffId,
    })
    .select()
    .single();

  if (error) throw error;

  await logTimelineEvent({
    encounter_id: dto.encounter_id,
    patient_id: data.patient_id,
    event_type: 'fluid_started',
    event_category: 'treatment',
    title: `Fluid: ${dto.fluid_type} (${dto.route.toUpperCase()})`,
    description: `${dto.fluid_type} via ${dto.route.toUpperCase()}${dto.rate_ml_hr ? ` at ${dto.rate_ml_hr} ml/hr` : ''}${dto.volume_ml ? `, Volume: ${dto.volume_ml} ml` : ''}${dto.notes ? ` — ${dto.notes}` : ''}`,
    details: {
      fluid_type: dto.fluid_type,
      route: dto.route,
      rate: dto.rate_ml_hr,
      volume: dto.volume_ml,
      notes: dto.notes,
    },
    source_table: 'ae_fluid_charts',
    source_id: data.id,
  });

  return data as AeFluidChart;
}

export async function getFluidCharts(
  encounterId: string,
): Promise<AeFluidChart[]> {
  const { data } = await supabase
    .from('ae_fluid_charts')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('start_time', { ascending: false });
  return (data || []) as AeFluidChart[];
}

// =============================================================================
// A&E Procedures
// =============================================================================

export async function createAeProcedure(
  dto: AeProcedureFormDTO,
): Promise<AeProcedure> {
  const staffId = await getCurrentStaffId();
  if (!staffId) throw new Error('Staff not authenticated');

  const { data, error } = await supabase
    .from('ae_procedures')
    .insert({
      encounter_id: dto.encounter_id,
      patient_id: dto.patient_id,
      procedure_name: dto.procedure_name,
      procedure_catalogue_id: dto.procedure_catalogue_id || null,
      consent_obtained: dto.consent_obtained,
      consent_notes: dto.consent_notes || null,
      indication: dto.indication || null,
      technique: [dto.site ? `Site: ${dto.site}` : '', dto.anaesthesia ? `Anaesthesia: ${dto.anaesthesia}` : '', dto.technique || ''].filter(Boolean).join('\n') || null,
      findings: [dto.findings || '', dto.notes ? `Notes: ${dto.notes}` : ''].filter(Boolean).join('\n') || null,
      outcome: dto.outcome || null,
      complications: dto.complications || null,
      performed_by: staffId,
      assisted_by: dto.assisted_by,
      start_time: dto.start_time || new Date().toISOString(),
      end_time: dto.end_time || null,
    })
    .select()
    .single();

  if (error) throw error;

  const procDescParts: string[] = [];
  procDescParts.push(`Procedure: ${dto.procedure_name}`);
  if (dto.indication) procDescParts.push(`Indication: ${dto.indication}`);
  procDescParts.push(`Consent: ${dto.consent_obtained ? 'Yes' : 'No'}`);
  if (dto.consent_notes)
    procDescParts.push(`Consent Notes: ${dto.consent_notes}`);
  if (dto.technique) procDescParts.push(`Technique: ${dto.technique}`);
  if (dto.findings) procDescParts.push(`Findings: ${dto.findings}`);
  if (dto.outcome) procDescParts.push(`Outcome: ${dto.outcome}`);
  if (dto.complications)
    procDescParts.push(`Complications: ${dto.complications}`);

  await logTimelineEvent({
    encounter_id: dto.encounter_id,
    patient_id: data.patient_id,
    event_type: 'procedure_performed',
    event_category: 'procedure',
    title: `Procedure: ${dto.procedure_name}${dto.outcome ? ` (${dto.outcome})` : ''}`,
    description: procDescParts.join(' | '),
    details: {
      procedure: dto.procedure_name,
      indication: dto.indication,
      consent: dto.consent_obtained,
      consent_notes: dto.consent_notes,
      technique: dto.technique,
      findings: dto.findings,
      outcome: dto.outcome,
      complications: dto.complications,
    },
    source_table: 'ae_procedures',
    source_id: data.id,
  });

  return data as AeProcedure;
}

export async function getAeProcedures(
  encounterId: string,
): Promise<AeProcedure[]> {
  const { data } = await supabase
    .from('ae_procedures')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('start_time', { ascending: false });
  return (data || []) as AeProcedure[];
}

// =============================================================================
// A&E Encounter List (Dashboard / Board)
// =============================================================================

export async function getActiveAeEncounters(): Promise<AeEncounterSummary[]> {
  // Get all active A&E visits (encounter_category = 'emergency' and not completed)
  const { data: visits, error } = await supabase
    .from('visits')
    .select(
      `
      id, visit_id, encounter_number, patient_id, status, priority,
      current_stage, chief_complaint, start_time, attending_doctor_id,
      patient:patients(id, first_name, surname, date_of_birth, gender, contact_phone, service_number)
    `,
    )
    .eq('encounter_category', 'emergency')
    .in('status', ['Active', 'Registered', 'Created'])
    .order('start_time', { ascending: false });

  if (error) throw error;
  if (!visits?.length) return [];

  const encounterIds = visits.map((v: any) => v.id);

  // Batch-fetch A&E data
  const [arrivals, triages, dispositions, timelineCounts] = await Promise.all([
    supabase.from('ae_arrivals').select('*').in('encounter_id', encounterIds),
    supabase
      .from('triage_assessments')
      .select(
        'visit_id, triage_level, triage_color, consciousness, is_ae_triage, acuity_color',
      )
      .in('visit_id', encounterIds)
      .eq('is_ae_triage', true),
    supabase
      .from('ae_dispositions')
      .select('*')
      .in('encounter_id', encounterIds),
    supabase
      .from('ae_timeline_events')
      .select('encounter_id')
      .in('encounter_id', encounterIds),
  ]);

  const arrivalMap = new Map(
    (arrivals.data || []).map((a: any) => [a.encounter_id, a]),
  );
  const triageMap = new Map(
    (triages.data || []).map((t: any) => [t.visit_id, t]),
  );
  const dispoMap = new Map(
    (dispositions.data || []).map((d: any) => [d.encounter_id, d]),
  );

  // Count timeline events per encounter
  const timelineCountMap = new Map<string, number>();
  (timelineCounts.data || []).forEach((t: any) => {
    timelineCountMap.set(
      t.encounter_id,
      (timelineCountMap.get(t.encounter_id) || 0) + 1,
    );
  });

  return visits.map((v: any) => {
    const p = v.patient;
    const arrival = arrivalMap.get(v.id) || null;
    const triage = triageMap.get(v.id) as any;
    return {
      encounter_id: v.id,
      visit_id: v.visit_id,
      encounter_number: v.encounter_number,
      patient_id: v.patient_id,
      patient: p
        ? { ...p, last_name: p.surname, phone_number: p.contact_phone }
        : p,
      patient_name: p ? `${p.first_name} ${p.surname}`.trim() : 'Unknown',
      status: v.status,
      priority: v.priority,
      current_stage: v.current_stage,
      chief_complaint: v.chief_complaint,
      start_time: v.start_time,
      attending_doctor_id: v.attending_doctor_id,
      arrival,
      arrival_time: arrival?.arrival_time || null,
      acuity_color: triage?.acuity_color || null,
      triage: triage || null,
      disposition: dispoMap.get(v.id) || null,
      timeline_count: timelineCountMap.get(v.id) || 0,
    };
  }) as AeEncounterSummary[];
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export async function getAeDashboardStats(): Promise<AeDashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [activeRes, todayRes, dischargedRes, admittedRes, criticalRes] =
    await Promise.all([
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('encounter_category', 'emergency')
        .in('status', ['Active', 'Registered', 'Created']),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('encounter_category', 'emergency')
        .gte('start_time', todayISO),
      supabase
        .from('ae_dispositions')
        .select('id', { count: 'exact', head: true })
        .eq('disposition_type', 'discharge')
        .gte('created_at', todayISO),
      supabase
        .from('ae_dispositions')
        .select('id', { count: 'exact', head: true })
        .eq('disposition_type', 'admit')
        .gte('created_at', todayISO),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('encounter_category', 'emergency')
        .eq('priority', 'Emergency')
        .in('status', ['Active', 'Registered', 'Created']),
    ]);

  // Waiting for triage = A&E encounters still at ae_arrival or in Triage queue
  const { count: waitingTriage } = await supabase
    .from('queue')
    .select('id', { count: 'exact', head: true })
    .eq('location', 'Triage')
    .eq('status', 'Waiting');

  return {
    active_encounters: activeRes.count || 0,
    awaiting_triage: waitingTriage || 0,
    critical_count: criticalRes.count || 0,
    today_total: todayRes.count || 0,
    discharged_today: dischargedRes.count || 0,
    admitted_today: admittedRes.count || 0,
    avg_wait_minutes: null, // Could compute from timeline events
    avg_time_to_triage_min: null,
    avg_length_of_stay_min: null,
  };
}

// =============================================================================
// Vitals (repeat observations)
// =============================================================================

export async function getEncounterVitals(encounterId: string) {
  const { data } = await supabase
    .from('vitals')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addVitalObservation(params: {
  encounter_id: string;
  patient_id: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  blood_glucose?: number;
  pain_level?: number;
}) {
  const staffId = await getCurrentStaffId();
  const { data, error } = await supabase
    .from('vitals')
    .insert({
      ...params,
      nurse_id: staffId,
    })
    .select()
    .single();

  if (error) throw error;

  const vitalParts: string[] = [];
  if (params.blood_pressure_systolic && params.blood_pressure_diastolic)
    vitalParts.push(
      `BP: ${params.blood_pressure_systolic}/${params.blood_pressure_diastolic} mmHg`,
    );
  if (params.pulse) vitalParts.push(`HR: ${params.pulse} bpm`);
  if (params.respiratory_rate)
    vitalParts.push(`RR: ${params.respiratory_rate} /min`);
  if (params.oxygen_saturation)
    vitalParts.push(`SpO2: ${params.oxygen_saturation}%`);
  if (params.temperature) vitalParts.push(`Temp: ${params.temperature}°C`);
  if (params.pain_level) vitalParts.push(`Pain: ${params.pain_level}/10`);

  await logTimelineEvent({
    encounter_id: params.encounter_id,
    patient_id: params.patient_id,
    event_type: 'vital_observation',
    event_category: 'observation',
    title: 'Vital signs recorded',
    description: vitalParts.join(' | ') || 'Vitals recorded',
    details: {
      bp:
        params.blood_pressure_systolic && params.blood_pressure_diastolic
          ? `${params.blood_pressure_systolic}/${params.blood_pressure_diastolic}`
          : null,
      hr: params.pulse,
      rr: params.respiratory_rate,
      spo2: params.oxygen_saturation,
      temp: params.temperature,
    },
    source_table: 'vitals',
    source_id: data.id,
  });

  return data;
}

// =============================================================================
// Lab / Radiology Results linked to encounter (read-only from A&E)
// =============================================================================

export async function getEncounterLabRequests(encounterId: string) {
  const { data } = await supabase
    .from('lab_requests')
    .select(
      '*, test:lab_test_catalogue(name, code, category), results:lab_results(id, result_value, unit, reference_range, is_abnormal, is_critical, comments, structured_result, result_template_type, workflow_status, verified_at)',
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getEncounterRadiologyRequests(encounterId: string) {
  const { data } = await supabase
    .from('radiology_requests')
    .select(
      '*, imaging:imaging_catalogue(name, code, modality, body_part)',
    )
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getEncounterPrescriptions(encounterId: string) {
  const { data } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });
  return data || [];
}

function requiresRadiologyNhisApproval(params: {
  requiresNhisAuthorization?: boolean | null;
  isNhisCovered?: boolean | null;
  nhisPercentage?: number | null;
}): boolean {
  const { requiresNhisAuthorization, isNhisCovered, nhisPercentage } = params;

  if (requiresNhisAuthorization === true) return true;
  if (isNhisCovered === false) return true;

  if (
    typeof nhisPercentage === 'number' &&
    nhisPercentage >= 0 &&
    nhisPercentage < 100
  ) {
    return true;
  }

  return false;
}

interface AeLabCatalogueRow {
  name: string | null;
  code: string | null;
  price: number | null;
  requires_nhis_authorization: boolean | null;
}

interface AeImagingCatalogueRow {
  name: string | null;
  modality: string | null;
  code: string | null;
  price: number | null;
  requires_nhis_authorization: boolean | null;
  is_nhis_covered: boolean | null;
  nhis_percentage: number | null;
}

interface AeOrderExecutionContext {
  staffId?: string | null;
  patientIsNhis?: boolean;
  labCatalogueById?: Map<string, AeLabCatalogueRow>;
  imagingCatalogueById?: Map<string, AeImagingCatalogueRow>;
}

export async function createAeLabOrder(
  encounterId: string,
  patientId: string,
  order: LabOrderDTO,
  context?: AeOrderExecutionContext,
): Promise<void> {
  patientId = await resolvePatientVarcharId(patientId);
  const staffId = context?.staffId ?? (await getCurrentStaffId());
  if (!staffId) throw new Error('Staff not authenticated');

  const patientIsNhis =
    typeof context?.patientIsNhis === 'boolean'
      ? context.patientIsNhis
      : await isPatientNhis(patientId);

  let labTest = context?.labCatalogueById?.get(order.test_id);
  if (!labTest) {
    const { data } = await supabase
      .from('lab_test_catalogue')
      .select('name, code, price, requires_nhis_authorization')
      .eq('id', order.test_id)
      .single();

    labTest = data
      ? {
          name: data.name ?? null,
          code: data.code ?? null,
          price: data.price ?? null,
          requires_nhis_authorization: data.requires_nhis_authorization ?? null,
        }
      : undefined;
  }

  const serviceRequiresNhisApproval =
    patientIsNhis && labTest?.requires_nhis_authorization === true;

  const { data: insertedRequest, error } = await supabase
    .from('lab_requests')
    .insert({
      encounter_id: encounterId,
      patient_id: patientId,
      test_id: order.test_id,
      ordered_by: staffId,
      clinical_notes: order.clinical_notes || null,
      priority: order.priority || 'Urgent',
      status: 'Pending',
      nhis_approval_status: serviceRequiresNhisApproval
        ? 'pending'
        : 'not_required',
    })
    .select('request_id')
    .single();
  if (error) throw error;

  // Create NHIS approval request if needed
  if (serviceRequiresNhisApproval && insertedRequest) {
    await createServiceApprovalRequest({
      serviceType: 'lab_request',
      serviceId: insertedRequest.request_id,
      serviceName: labTest?.name || 'Lab Test',
      serviceCode: labTest?.code || undefined,
      encounterId,
      patientId,
      estimatedCost: labTest?.price || 0,
      requestedBy: staffId,
      clinicalJustification: order.clinical_notes,
      requestReason: 'A&E lab test ordered - requires NHIS pre-authorization',
    });
  }

  await logTimelineEvent({
    encounter_id: encounterId,
    patient_id: patientId,
    event_type: 'lab_ordered',
    event_category: 'order',
    title: `Lab ordered: ${labTest?.name || order.test_name || 'Lab Test'}`,
    description: `Test: ${labTest?.name || order.test_name || 'Lab Test'} | Priority: ${order.priority || 'Urgent'}${order.clinical_notes ? ` | Notes: ${order.clinical_notes}` : ''}`,
    details: {
      test_id: order.test_id,
      priority: order.priority,
      nhis: serviceRequiresNhisApproval,
    },
    performed_by: staffId,
  });
}

export async function createAeRadiologyOrder(
  encounterId: string,
  patientId: string,
  order: RadiologyOrderDTO,
  context?: AeOrderExecutionContext,
): Promise<void> {
  patientId = await resolvePatientVarcharId(patientId);
  const staffId = context?.staffId ?? (await getCurrentStaffId());
  if (!staffId) throw new Error('Staff not authenticated');

  const patientIsNhis =
    typeof context?.patientIsNhis === 'boolean'
      ? context.patientIsNhis
      : await isPatientNhis(patientId);

  let imaging = context?.imagingCatalogueById?.get(order.imaging_id);
  if (!imaging) {
    const { data } = await supabase
      .from('imaging_catalogue')
      .select(
        'name, modality, code, price, requires_nhis_authorization, is_nhis_covered, nhis_percentage',
      )
      .eq('id', order.imaging_id)
      .single();

    imaging = data
      ? {
          name: data.name ?? null,
          modality: data.modality ?? null,
          code: data.code ?? null,
          price: data.price ?? null,
          requires_nhis_authorization: data.requires_nhis_authorization ?? null,
          is_nhis_covered: data.is_nhis_covered ?? null,
          nhis_percentage: data.nhis_percentage ?? null,
        }
      : undefined;
  }

  const serviceRequiresNhisApproval =
    patientIsNhis &&
    requiresRadiologyNhisApproval({
      requiresNhisAuthorization: imaging?.requires_nhis_authorization,
      isNhisCovered: imaging?.is_nhis_covered,
      nhisPercentage: imaging?.nhis_percentage,
    });

  const { data: insertedRequest, error } = await supabase
    .from('radiology_requests')
    .insert({
      encounter_id: encounterId,
      patient_id: patientId,
      imaging_id: order.imaging_id,
      imaging_type: imaging?.modality || 'Other',
      body_part: order.body_part || null,
      ordered_by: staffId,
      clinical_indication: order.clinical_indication || null,
      priority: order.priority || 'Urgent',
      status: 'Pending',
      nhis_approval_status: serviceRequiresNhisApproval
        ? 'pending'
        : 'not_required',
    })
    .select('request_id')
    .single();
  if (error) throw error;

  if (serviceRequiresNhisApproval && insertedRequest) {
    await createServiceApprovalRequest({
      serviceType: 'radiology_request',
      serviceId: insertedRequest.request_id,
      serviceName: imaging?.name || 'Imaging Study',
      serviceCode: imaging?.code || undefined,
      encounterId,
      patientId,
      estimatedCost: imaging?.price || 0,
      requestedBy: staffId,
      clinicalJustification: order.clinical_indication,
      requestReason: 'A&E radiology ordered - requires NHIS pre-authorization',
    });
  }

  await logTimelineEvent({
    encounter_id: encounterId,
    patient_id: patientId,
    event_type: 'imaging_ordered',
    event_category: 'order',
    title: `Imaging ordered: ${imaging?.name || 'Imaging Study'}`,
    description: `Study: ${imaging?.name || 'Imaging'} | Modality: ${imaging?.modality || 'N/A'} | Priority: ${order.priority || 'Urgent'}${order.body_part ? ` | Body Part: ${order.body_part}` : ''}${order.clinical_indication ? ` | Indication: ${order.clinical_indication}` : ''}`,
    details: {
      imaging_id: order.imaging_id,
      priority: order.priority,
      nhis: serviceRequiresNhisApproval,
    },
    performed_by: staffId,
  });
}

export async function createAePrescription(
  encounterId: string,
  patientId: string,
  prescription: PrescriptionOrderDTO,
  context?: AeOrderExecutionContext,
): Promise<void> {
  patientId = await resolvePatientVarcharId(patientId);
  const staffId = context?.staffId ?? (await getCurrentStaffId());
  if (!staffId) throw new Error('Staff not authenticated');

  const { error } = await supabase.from('prescriptions').insert({
    encounter_id: encounterId,
    patient_id: patientId,
    drug_id: prescription.drug_id,
    doctor_id: staffId,
    dosage: prescription.dosage,
    frequency: prescription.frequency,
    duration: prescription.duration || null,
    route: prescription.route || 'Oral',
    quantity_prescribed: prescription.quantity_prescribed,
    instructions: prescription.instructions || null,
    status: 'Pending',
  });
  if (error) throw error;

  await logTimelineEvent({
    encounter_id: encounterId,
    patient_id: patientId,
    event_type: 'medication_ordered',
    event_category: 'order',
    title: `Rx: ${prescription.drug_name} ${prescription.dosage}`,
    description: `Drug: ${prescription.drug_name} | Dosage: ${prescription.dosage} | Frequency: ${prescription.frequency} | Route: ${prescription.route || 'Oral'}${prescription.duration ? ` | Duration: ${prescription.duration}` : ''}${prescription.instructions ? ` | Instructions: ${prescription.instructions}` : ''}`,
    details: {
      drug: prescription.drug_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
    },
    performed_by: staffId,
  });
}

export async function createAeProcedureOrder(
  encounterId: string,
  patientId: string,
  order: ProcedureOrderDTO,
  context?: AeOrderExecutionContext,
): Promise<void> {
  patientId = await resolvePatientVarcharId(patientId);
  const staffId = context?.staffId ?? (await getCurrentStaffId());
  if (!staffId) throw new Error('Staff not authenticated');

  const { error } = await supabase.from('procedure_requests').insert({
    encounter_id: encounterId,
    patient_id: patientId,
    procedure_id: order.procedure_id,
    ordered_by: staffId,
    clinical_notes: order.clinical_notes || order.notes || null,
    priority: order.priority || 'Urgent',
    status: 'Pending',
  });
  if (error) throw error;

  await logTimelineEvent({
    encounter_id: encounterId,
    patient_id: patientId,
    event_type: 'procedure_ordered',
    event_category: 'order',
    title: `Procedure ordered: ${order.procedure_name}`,
    description: `Procedure: ${order.procedure_name} | Priority: ${order.priority || 'Urgent'}${order.clinical_notes || order.notes ? ` | Notes: ${order.clinical_notes || order.notes}` : ''}`,
    details: { procedure_id: order.procedure_id, priority: order.priority },
    performed_by: staffId,
  });
}

export async function createAeAdmission(
  encounterId: string,
  patientId: string,
  order: AdmissionOrderDTO,
  context?: AeOrderExecutionContext,
): Promise<string> {
  const staffId = context?.staffId ?? (await getCurrentStaffId());
  if (!staffId) throw new Error('Staff not authenticated');

  const { data, error } = await supabase
    .from('admissions')
    .insert({
      encounter_id: encounterId,
      patient_id: patientId,
      admission_type: 'emergency',
      admission_source: 'emergency',
      current_ward_id: order.ward_id || null,
      admission_reason: order.reason,
      admission_status: 'admitted',
      admitted_by: staffId,
    })
    .select('id')
    .single();

  if (error) throw error;

  // Update encounter category to inpatient
  await supabase
    .from('visits')
    .update({
      encounter_category: 'inpatient',
      current_stage: 'ae_disposition',
    })
    .eq('id', encounterId);

  await logTimelineEvent({
    encounter_id: encounterId,
    patient_id: patientId,
    event_type: 'admission_created',
    event_category: 'disposition',
    title: `Admitted to ${order.ward_name || 'ward'} (Emergency)`,
    description: `Ward: ${order.ward_name || 'N/A'} | Reason: ${order.reason || 'Emergency admission'}`,
    details: { ward: order.ward_name, reason: order.reason },
    severity: 'warning',
    performed_by: staffId,
  });

  return data.id;
}

// Submit all A&E orders in batch
export async function submitAeOrders(params: {
  encounterId: string;
  patientId: string;
  labOrders: LabOrderDTO[];
  radiologyOrders: RadiologyOrderDTO[];
  prescriptions: PrescriptionOrderDTO[];
  procedureOrders: ProcedureOrderDTO[];
  admissionOrder?: AdmissionOrderDTO | null;
  staffId?: string | null;
}): Promise<void> {
  const {
    encounterId,
    patientId,
    labOrders,
    radiologyOrders,
    prescriptions,
    procedureOrders,
    admissionOrder,
    staffId: providedStaffId,
  } = params;

  const staffId = providedStaffId ?? (await getCurrentStaffId());
  if (!staffId) throw new Error('Staff not authenticated');

  const [patientIsNhis, labCatalogueRes, imagingCatalogueRes] =
    await Promise.all([
      labOrders.length > 0 || radiologyOrders.length > 0
        ? isPatientNhis(patientId)
        : Promise.resolve(false),
      labOrders.length > 0
        ? supabase
            .from('lab_test_catalogue')
            .select('id, name, code, price, requires_nhis_authorization')
            .in(
              'id',
              Array.from(new Set(labOrders.map((order) => order.test_id))),
            )
        : Promise.resolve({ data: [] as Array<any>, error: null as any }),
      radiologyOrders.length > 0
        ? supabase
            .from('imaging_catalogue')
            .select(
              'id, name, modality, code, price, requires_nhis_authorization, is_nhis_covered, nhis_percentage',
            )
            .in(
              'id',
              Array.from(
                new Set(radiologyOrders.map((order) => order.imaging_id)),
              ),
            )
        : Promise.resolve({ data: [] as Array<any>, error: null as any }),
    ]);

  if (labCatalogueRes.error) {
    console.warn(
      '[A&E] Failed to prefetch lab catalogue rows for batch submit:',
      labCatalogueRes.error,
    );
  }
  if (imagingCatalogueRes.error) {
    console.warn(
      '[A&E] Failed to prefetch imaging catalogue rows for batch submit:',
      imagingCatalogueRes.error,
    );
  }

  const labCatalogueById = new Map<string, AeLabCatalogueRow>(
    ((labCatalogueRes.data || []) as Array<any>).map((row) => [
      row.id,
      {
        name: row.name ?? null,
        code: row.code ?? null,
        price: row.price ?? null,
        requires_nhis_authorization: row.requires_nhis_authorization ?? null,
      },
    ]),
  );

  const imagingCatalogueById = new Map<string, AeImagingCatalogueRow>(
    ((imagingCatalogueRes.data || []) as Array<any>).map((row) => [
      row.id,
      {
        name: row.name ?? null,
        modality: row.modality ?? null,
        code: row.code ?? null,
        price: row.price ?? null,
        requires_nhis_authorization: row.requires_nhis_authorization ?? null,
        is_nhis_covered: row.is_nhis_covered ?? null,
        nhis_percentage: row.nhis_percentage ?? null,
      },
    ]),
  );

  const orderContext: AeOrderExecutionContext = {
    staffId,
    patientIsNhis,
    labCatalogueById,
    imagingCatalogueById,
  };

  // Submit all orders in parallel
  await Promise.all([
    ...labOrders.map((o) =>
      createAeLabOrder(encounterId, patientId, o, orderContext),
    ),
    ...radiologyOrders.map((o) =>
      createAeRadiologyOrder(encounterId, patientId, o, orderContext),
    ),
    ...prescriptions.map((o) =>
      createAePrescription(encounterId, patientId, o, orderContext),
    ),
    ...procedureOrders.map((o) =>
      createAeProcedureOrder(encounterId, patientId, o, orderContext),
    ),
  ]);

  if (admissionOrder) {
    await createAeAdmission(
      encounterId,
      patientId,
      admissionOrder,
      orderContext,
    );
  }
}

// =============================================================================
// Handover Summary Auto-Generation
// =============================================================================

async function generateHandoverSummary(
  encounterId: string,
): Promise<object | null> {
  try {
    const [
      arrival,
      triage,
      survey,
      timeline,
      vitals,
      labs,
      rads,
      prescriptions,
    ] = await Promise.all([
      getArrival(encounterId),
      getAeTriage(encounterId),
      getPrimarySurvey(encounterId),
      getTimelineEvents(encounterId),
      getEncounterVitals(encounterId),
      getEncounterLabRequests(encounterId),
      getEncounterRadiologyRequests(encounterId),
      getEncounterPrescriptions(encounterId),
    ]);

    const latestVitals = vitals[0] || null;

    return {
      generated_at: new Date().toISOString(),
      chief_complaint: arrival?.chief_complaint,
      arrival_mode: arrival?.arrival_mode,
      incident_type: arrival?.incident_type,
      triage_level: triage?.triage_level,
      acuity_color: triage?.acuity_color || triage?.triage_color,
      gcs_total: survey?.gcs_total,
      latest_vitals: latestVitals
        ? {
            bp:
              latestVitals.blood_pressure_systolic &&
              latestVitals.blood_pressure_diastolic
                ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}`
                : null,
            hr: latestVitals.pulse,
            rr: latestVitals.respiratory_rate,
            spo2: latestVitals.oxygen_saturation,
            temp: latestVitals.temperature,
          }
        : null,
      key_events_count: timeline.length,
      treatments_given: timeline
        .filter((e) =>
          ['treatment', 'medication', 'procedure'].includes(e.event_category),
        )
        .map((e) => e.title),
      lab_results_count: labs.filter((l: any) => l.status === 'Completed')
        .length,
      lab_pending_count: labs.filter((l: any) => l.status !== 'Completed')
        .length,
      imaging_results_count: rads.filter((r: any) => r.status === 'Completed')
        .length,
      imaging_pending_count: rads.filter((r: any) => r.status !== 'Completed')
        .length,
      medications_given: prescriptions.length,
    };
  } catch {
    console.error('[A&E] Failed to generate handover summary');
    return null;
  }
}

// =============================================================================
// Check for duplicate active A&E encounters
// =============================================================================

export async function hasActiveAeEncounter(
  patientId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('visits')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .eq('encounter_category', 'emergency')
    .in('status', ['Active', 'Registered', 'Created']);
  return (count || 0) > 0;
}
