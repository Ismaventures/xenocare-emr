/**
 * =============================================================================
 * NDC MEDICAL CENTRE EMR - INTERNAL REFERRAL API
 *
 * API functions for managing internal referrals in the Encounter Office.
 * This module handles the workflow where doctors refer patients to specialty
 * clinics, and Encounter Officers book appointments and create new encounters.
 * =============================================================================
 */

import { supabase } from '../../../api/supabaseClient';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('InternalReferral');

// =============================================================================
// Types
// =============================================================================

export type ReferralWorkflowStatus =
  | 'Pending_Encounter_Office'
  | 'Appointment_Booked'
  | 'Encounter_Created'
  | 'Completed'
  | 'Cancelled'
  | 'Missed';

export type ReferralUrgency = 'Routine' | 'Urgent' | 'Emergency';

export type BookingRequestType = 'Referral' | 'Follow-Up';

export interface PendingReferral {
  referral_id: string;
  referral_number: string;
  referral_date: string;
  request_type: BookingRequestType; // 'Referral' | 'Follow-Up'
  urgency: ReferralUrgency;
  specialty_module: string | null;
  referral_workflow_status: ReferralWorkflowStatus;
  appointment_date: string | null;
  appointment_time: string | null;
  referral_reason: string;
  referral_notes: string | null;

  // Patient Info
  patient_id: string;
  emr_number: string;
  patient_first_name: string;
  patient_middle_name: string | null;
  patient_surname: string;
  date_of_birth: string | null;
  gender: string | null;
  patient_phone: string | null;
  patient_category: string | null;
  insurance_type: string | null;
  patient_rank: string | null;

  // Referring Doctor Info
  referring_doctor_id: string | null;
  referring_doctor_first_name: string | null;
  referring_doctor_last_name: string | null;
  referring_doctor_specialty: string | null;
  source_department_name: string | null;
  source_clinic_name: string | null;

  // Target Department Info
  target_department_id: string | null;
  target_department_name: string | null;
  target_department_code: string | null;

  // Original Encounter Info
  original_encounter_number: string | null;
  original_encounter_date: string | null;
  original_chief_complaint: string | null;
  original_clinical_notes: string | null;

  // NHIS Info
  nhis_approval_status: string | null;

  // Booking Info
  referral_encounter_id: string | null;
  appointment_booked_by: string | null;
  appointment_booked_at: string | null;
  booked_by_first_name: string | null;
  booked_by_last_name: string | null;
}

export interface ReferralEncounter {
  encounter_id: string;
  encounter_number: string;
  encounter_date: string;
  visit_type: string;
  encounter_status: string;
  is_referral_encounter: boolean;
  referral_reason: string | null;
  referral_clinical_notes: string | null;

  // Patient Info
  patient_id: string;
  emr_number: string;
  patient_first_name: string;
  patient_middle_name: string | null;
  patient_surname: string;
  date_of_birth: string | null;
  gender: string | null;

  // Referring Doctor Info
  referring_doctor_id: string | null;
  referring_doctor_first_name: string | null;
  referring_doctor_last_name: string | null;
  referring_doctor_specialty: string | null;

  // Clinic Info
  source_clinic_name: string | null;
  source_clinic_code: string | null;
  destination_clinic_id: string | null;
  destination_clinic_name: string | null;

  // Original Referral Info
  original_referral_id: string | null;
  original_referral_number: string | null;
  original_referral_date: string | null;
  referral_urgency: ReferralUrgency | null;
  specialty_module: string | null;
  referral_clinical_reason: string | null;
  referral_notes: string | null;

  // Original Encounter Info
  original_encounter_number: string | null;
  original_chief_complaint: string | null;
  original_consultation_notes: string | null;
}

export interface BookAppointmentDTO {
  referralId: string;
  appointmentDate: string;
  appointmentTime?: string | null;
  notes?: string | null;
  bookedBy?: string;
}

export interface CreateSelfReferralDTO {
  patientId: string;
  specialtyModule: string;
  appointmentDate: string;
  appointmentTime?: string | null;
  reason?: string;
  notes?: string;
  createdBy?: string;
}

export interface CreateReferralEncounterDTO {
  referralId: string;
  clinicId: string;
  attendingDoctorId?: string | null;
  visitType?: string;
  priority?: string;
  createdBy?: string;
}

export interface ReferralFilters {
  workflowStatus?: ReferralWorkflowStatus | ReferralWorkflowStatus[];
  urgency?: ReferralUrgency | ReferralUrgency[];
  specialtyModule?: string | string[];
  targetDepartmentId?: string;
  appointmentDateFrom?: string;
  appointmentDateTo?: string;
  search?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get pending internal referrals for the Encounter Office
 * These are referrals awaiting appointment booking or encounter creation
 */
export async function getPendingReferrals(
  filters?: ReferralFilters,
): Promise<PendingReferral[]> {
  // Use direct query since the view might not exist yet in all environments
  // ALL internal referrals (including NHIS patients) appear here for booking.
  // After encounter creation, NHIS patients are routed to NHIS specialty queue for verification.
  let query = supabase
    .from('clinical_requests')
    .select(
      `
      id,
      request_number,
      request_type,
      created_at,
      urgency,
      specialty_module,
      referral_workflow_status,
      appointment_date,
      appointment_time,
      clinical_reason,
      notes,
      nhis_approval_status,
      referral_encounter_id,
      appointment_booked_by,
      appointment_booked_at,
      patient:patients!patient_id (
        id,
        emr_number,
        first_name,
        middle_name,
        surname,
        date_of_birth,
        gender,
        contact_phone,
        patient_category,
        insurance_type,
        rank
      ),
      requesting_doctor:staff!requesting_doctor_id (
        id,
        first_name,
        last_name,
        department
      ),
      requesting_department:departments!requesting_department_id (
        name
      ),
      source_clinic:clinics!source_clinic_id (
        clinic_name
      ),
      target_department:departments!target_department_id (
        id,
        name,
        code
      ),
      original_encounter:visits!clinical_requests_encounter_id_fkey (
        encounter_number,
        encounter_date,
        chief_complaint
      ),
      booked_by:staff!appointment_booked_by (
        first_name,
        last_name
      )
    `,
    )
    .in('request_type', ['Referral', 'Follow-Up'])
    .not('status', 'in', '("Cancelled","Rejected")');

  // Apply filters
  if (filters?.workflowStatus) {
    const statuses = Array.isArray(filters.workflowStatus)
      ? filters.workflowStatus
      : [filters.workflowStatus];
    query = query.in('referral_workflow_status', statuses);
  } else {
    // Default: show pending and appointment_booked.
    // Also include NULL referral_workflow_status to catch referrals created
    // before the DB trigger was deployed or where the column default was
    // overridden by a null value from the Supabase client serialization.
    query = query.or(
      'referral_workflow_status.in.(Pending_Encounter_Office,Appointment_Booked),referral_workflow_status.is.null',
    );
  }

  if (filters?.urgency) {
    const urgencies = Array.isArray(filters.urgency)
      ? filters.urgency
      : [filters.urgency];
    query = query.in('urgency', urgencies);
  }

  if (filters?.specialtyModule) {
    const modules = Array.isArray(filters.specialtyModule)
      ? filters.specialtyModule
      : [filters.specialtyModule];
    query = query.in('specialty_module', modules);
  }

  if (filters?.targetDepartmentId) {
    query = query.eq('target_department_id', filters.targetDepartmentId);
  }

  if (filters?.appointmentDateFrom) {
    query = query.gte('appointment_date', filters.appointmentDateFrom);
  }

  if (filters?.appointmentDateTo) {
    query = query.lte('appointment_date', filters.appointmentDateTo);
  }

  // Order by urgency and date
  query = query
    .order('urgency', { ascending: true })
    .order('created_at', { ascending: true });

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching pending referrals:', error);
    throw new Error(`Failed to fetch pending referrals: ${error.message}`);
  }

  // Transform to PendingReferral type
  return (data || []).map((r: any) => ({
    referral_id: r.id,
    referral_number: r.request_number,
    referral_date: r.created_at,
    request_type: (r.request_type || 'Referral') as BookingRequestType,
    urgency: r.urgency,
    specialty_module: r.specialty_module,
    referral_workflow_status:
      r.referral_workflow_status || 'Pending_Encounter_Office',
    appointment_date: r.appointment_date,
    appointment_time: r.appointment_time,
    referral_reason: r.clinical_reason,
    referral_notes: r.notes,

    patient_id: r.patient?.id,
    emr_number: r.patient?.emr_number,
    patient_first_name: r.patient?.first_name,
    patient_middle_name: r.patient?.middle_name,
    patient_surname: r.patient?.surname,
    date_of_birth: r.patient?.date_of_birth,
    gender: r.patient?.gender,
    patient_phone: r.patient?.contact_phone,
    patient_category: r.patient?.patient_category,
    insurance_type: r.patient?.insurance_type,
    patient_rank: r.patient?.rank,

    referring_doctor_id: r.requesting_doctor?.id,
    referring_doctor_first_name: r.requesting_doctor?.first_name,
    referring_doctor_last_name: r.requesting_doctor?.last_name,
    referring_doctor_specialty: r.requesting_doctor?.department,
    source_department_name: r.requesting_department?.name,
    source_clinic_name: r.source_clinic?.clinic_name,

    target_department_id: r.target_department?.id,
    target_department_name: r.target_department?.name,
    target_department_code: r.target_department?.code,

    original_encounter_number: r.original_encounter?.encounter_number,
    original_encounter_date: r.original_encounter?.encounter_date,
    original_chief_complaint: r.original_encounter?.chief_complaint,
    original_clinical_notes: r.original_encounter?.clinical_notes,

    referral_encounter_id: r.referral_encounter_id,
    nhis_approval_status: r.nhis_approval_status || null,
    appointment_booked_by: r.appointment_booked_by,
    appointment_booked_at: r.appointment_booked_at,
    booked_by_first_name: r.booked_by?.first_name,
    booked_by_last_name: r.booked_by?.last_name,
  }));
}

/**
 * Get a single referral by ID with full details
 */
export async function getReferralById(
  referralId: string,
): Promise<PendingReferral | null> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .select(
      `
      id,
      request_number,
      created_at,
      urgency,
      specialty_module,
      referral_workflow_status,
      appointment_date,
      appointment_time,
      clinical_reason,
      notes,
      referral_encounter_id,
      appointment_booked_by,
      appointment_booked_at,
      patient:patients!patient_id (
        id,
        emr_number,
        first_name,
        middle_name,
        surname,
        date_of_birth,
        gender,
        contact_phone,
        patient_category,
        insurance_type,
        rank
      ),
      requesting_doctor:staff!requesting_doctor_id (
        id,
        first_name,
        last_name,
        department
      ),
      requesting_department:departments!requesting_department_id (
        name
      ),
      source_clinic:clinics!source_clinic_id (
        clinic_name
      ),
      target_department:departments!target_department_id (
        id,
        name,
        code
      ),
      original_encounter:visits!clinical_requests_encounter_id_fkey (
        encounter_number,
        encounter_date,
        chief_complaint
      ),
      booked_by:staff!appointment_booked_by (
        first_name,
        last_name
      )
    `,
    )
    .eq('id', referralId)
    .in('request_type', ['Referral', 'Follow-Up'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch referral: ${error.message}`);
  }

  if (!data) return null;

  const r = data as any;
  return {
    referral_id: r.id,
    referral_number: r.request_number,
    referral_date: r.created_at,
    request_type: (r.request_type || 'Referral') as BookingRequestType,
    urgency: r.urgency,
    specialty_module: r.specialty_module,
    referral_workflow_status:
      r.referral_workflow_status || 'Pending_Encounter_Office',
    appointment_date: r.appointment_date,
    appointment_time: r.appointment_time,
    referral_reason: r.clinical_reason,
    referral_notes: r.notes,

    patient_id: r.patient?.id,
    emr_number: r.patient?.emr_number,
    patient_first_name: r.patient?.first_name,
    patient_middle_name: r.patient?.middle_name,
    patient_surname: r.patient?.surname,
    date_of_birth: r.patient?.date_of_birth,
    gender: r.patient?.gender,
    patient_phone: r.patient?.contact_phone,
    patient_category: r.patient?.patient_category,
    insurance_type: r.patient?.insurance_type,
    patient_rank: r.patient?.rank,

    referring_doctor_id: r.requesting_doctor?.id,
    referring_doctor_first_name: r.requesting_doctor?.first_name,
    referring_doctor_last_name: r.requesting_doctor?.last_name,
    referring_doctor_specialty: r.requesting_doctor?.department,
    source_department_name: r.requesting_department?.name,
    source_clinic_name: r.source_clinic?.clinic_name,

    target_department_id: r.target_department?.id,
    target_department_name: r.target_department?.name,
    target_department_code: r.target_department?.code,

    original_encounter_number: r.original_encounter?.encounter_number,
    original_encounter_date: r.original_encounter?.encounter_date,
    original_chief_complaint: r.original_encounter?.chief_complaint,
    original_clinical_notes: r.original_encounter?.clinical_notes,

    referral_encounter_id: r.referral_encounter_id,
    nhis_approval_status: r.nhis_approval_status || null,
    appointment_booked_by: r.appointment_booked_by,
    appointment_booked_at: r.appointment_booked_at,
    booked_by_first_name: r.booked_by?.first_name,
    booked_by_last_name: r.booked_by?.last_name,
  };
}

/**
 * Book an appointment for a referral
 * Called by Encounter Office when scheduling the patient's visit
 */
export async function bookReferralAppointment(
  dto: BookAppointmentDTO,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .update({
      appointment_date: dto.appointmentDate,
      appointment_time: dto.appointmentTime || null,
      appointment_notes: dto.notes || null,
      appointment_booked_by: dto.bookedBy || null,
      appointment_booked_at: new Date().toISOString(),
      referral_workflow_status: 'Appointment_Booked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.referralId)
    .in('request_type', ['Referral', 'Follow-Up'])
    .select('id')
    .single();

  if (error) {
    log.error('Error booking appointment:', error);
    throw new Error(`Failed to book appointment: ${error.message}`);
  }

  return !!data;
}

/**
 * Create a new encounter from a referral
 * Called by Encounter Office after patient pays for the referral visit
 */
export async function createReferralEncounter(
  dto: CreateReferralEncounterDTO,
): Promise<{ encounterId: string; encounterNumber: string }> {
  // First, get the referral details
  const referral = await getReferralById(dto.referralId);

  if (!referral) {
    throw new Error('Referral not found');
  }

  if (referral.referral_encounter_id) {
    throw new Error('Referral has already been converted to an encounter');
  }

  // DATE ENFORCEMENT: Block encounter creation if today is not the scheduled appointment date
  if (referral.appointment_date) {
    const today = new Date().toISOString().split('T')[0];
    const scheduled = referral.appointment_date.split('T')[0];
    if (today !== scheduled) {
      const formatted = new Date(`${scheduled}T00:00:00`).toLocaleDateString(
        'en-GB',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      );
      throw new Error(
        `Encounter cannot be created until the scheduled appointment date: ${formatted}`,
      );
    }
  }

  // Generate encounter number
  const encounterNumber = `ENC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    Math.random() * 10000,
  )
    .toString()
    .padStart(4, '0')}`;

  // Determine if this is an NHIS patient
  const isNhisPatient = !!(
    referral.insurance_type?.toLowerCase().includes('nhis') ||
    referral.patient_category?.toLowerCase().includes('nhis')
  );

  // Create the encounter
  const { data: newEncounter, error: encounterError } = await supabase
    .from('visits')
    .insert({
      patient_id: referral.patient_id,
      clinic_id: dto.clinicId,
      attending_doctor_id: dto.attendingDoctorId || null,
      visit_type: dto.visitType || 'Follow-up',
      priority: dto.priority || 'Normal',
      status: 'Active',
      encounter_number: encounterNumber,
      encounter_date: new Date().toISOString().slice(0, 10),

      // Referral-specific fields
      is_referral_encounter: true,
      source_referral_id: dto.referralId,
      referring_doctor_id: referral.referring_doctor_id,
      referring_clinic_id: null, // Will be set from source_clinic
      referral_reason: referral.referral_reason,
      referral_clinical_notes: referral.referral_notes,

      // NHIS patients need approval via NHIS Specialty Queue before proceeding
      // Valid nhis_verification_status enum: not_applicable, unverified, blocked, verified, expired, emergency_override
      // NOTE: nhis_approval_status does NOT exist on visits table (only on clinical_requests)
      nhis_verification_status: isNhisPatient ? 'unverified' : 'verified',

      // Chief complaint from referral
      chief_complaint:
        `Referral from ${referral.referring_doctor_first_name || ''} ${referral.referring_doctor_last_name || ''}: ${referral.referral_reason || 'See referral notes'}`.trim(),

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, encounter_number')
    .single();

  if (encounterError) {
    log.error('Error creating referral encounter:', encounterError);
    throw new Error(`Failed to create encounter: ${encounterError.message}`);
  }

  // Update the referral with the new encounter ID
  const referralUpdate: Record<string, any> = {
    referral_encounter_id: newEncounter.id,
    referral_workflow_status: 'Encounter_Created',
    updated_at: new Date().toISOString(),
  };

  if (isNhisPatient) {
    // NHIS patients need approval via NHIS Specialty Queue first
    referralUpdate.status = 'Under_Review'; // Valid enum — awaiting NHIS desk review
    referralUpdate.nhis_approval_status = 'pending';
    log.info(
      `[Internal Referral] NHIS patient encounter ${encounterNumber} — routing to NHIS Specialty Queue for approval`,
    );
  } else {
    // Non-NHIS patients are approved immediately
    referralUpdate.status = 'Approved';
    referralUpdate.approved_at = new Date().toISOString();
    referralUpdate.approved_by = dto.createdBy || null;
    log.info(
      `[Internal Referral] Non-NHIS patient encounter ${encounterNumber} — routing to Nursing then Specialty`,
    );
  }

  const { error: updateError } = await supabase
    .from('clinical_requests')
    .update(referralUpdate)
    .eq('id', dto.referralId);

  if (updateError) {
    log.error('Error updating referral:', updateError);
    throw new Error(
      `Encounter created but failed to update referral: ${updateError.message}`,
    );
  }

  // =========================================================================
  // ROUTING:
  //   NHIS patients → NHIS Specialty Approval Queue (approval needed first)
  //   Non-NHIS patients → Nursing first (vitals) → then Specialty Queue
  // =========================================================================
  const targetLocation = getSpecialtyQueueLocation(referral.specialty_module);

  if (isNhisPatient) {
    // NHIS patients go to NHIS Specialty Approval Queue for approval
    // After approval, nhis.api.ts approveSpecialtyReferral() routes them to Nursing → Specialty
    try {
      const { data: queueResult, error: queueError } = await supabase.rpc(
        'create_queue_ticket',
        {
          p_dept: 'NHIS Specialty Queue',
          p_patient_id: referral.patient_id,
          p_visit_id: newEncounter.id,
          p_encounter_id: newEncounter.id,
          p_clinic_id: dto.clinicId,
          p_priority: dto.priority || 'Normal',
          p_notes: `NHIS Internal Referral - Awaiting NHIS Specialty Approval for ${targetLocation} [SPECIALTY_NEXT:${targetLocation}]`,
        },
      );

      if (queueError) {
        log.warn(
          '[Internal Referral] Atomic queue creation failed, using fallback:',
          queueError,
        );
        const fallbackTicket = `Q-${Math.floor(Math.random() * 9000 + 1000)}`;
        await supabase.from('queue').insert({
          patient_id: referral.patient_id,
          visit_id: newEncounter.id,
          encounter_id: newEncounter.id,
          clinic_id: dto.clinicId,
          ticket_number: fallbackTicket,
          location: 'NHIS Specialty Queue',
          priority: dto.priority || 'Normal',
          status: 'Waiting',
          notes: `NHIS Internal Referral - Awaiting NHIS Specialty Approval for ${targetLocation} [SPECIALTY_NEXT:${targetLocation}]`,
        });
        log.info(
          `[Internal Referral] NHIS patient routed to NHIS Specialty Queue with ticket #${fallbackTicket}`,
        );
      } else if (queueResult?.success) {
        log.info(
          `[Internal Referral] NHIS patient routed to NHIS Specialty Queue with ticket #${queueResult.ticket_number}`,
        );
      }
    } catch (routingError) {
      log.error(
        '[Internal Referral] Failed to route NHIS patient to specialty approval queue:',
        routingError,
      );
    }
  } else {
    // Non-NHIS patients go to Nursing first, tagged with specialty target
    try {
      const { data: queueResult, error: queueError } = await supabase.rpc(
        'create_queue_ticket',
        {
          p_dept: 'Nursing',
          p_patient_id: referral.patient_id,
          p_visit_id: newEncounter.id,
          p_encounter_id: newEncounter.id,
          p_clinic_id: dto.clinicId,
          p_priority: dto.priority || 'Normal',
          p_notes: `Internal Referral - proceeding to Nursing for vitals before ${targetLocation} [SPECIALTY_NEXT:${targetLocation}]`,
        },
      );

      if (queueError) {
        log.warn(
          '[Internal Referral] Atomic queue creation failed, using fallback:',
          queueError,
        );
        const fallbackTicket = `Q-${Math.floor(Math.random() * 9000 + 1000)}`;
        await supabase.from('queue').insert({
          patient_id: referral.patient_id,
          visit_id: newEncounter.id,
          encounter_id: newEncounter.id,
          clinic_id: dto.clinicId,
          ticket_number: fallbackTicket,
          location: 'Nursing',
          priority: dto.priority || 'Normal',
          status: 'Waiting',
          notes: `Internal Referral - proceeding to Nursing for vitals before ${targetLocation} [SPECIALTY_NEXT:${targetLocation}]`,
        });
        log.info(
          `[Internal Referral] Patient routed to Nursing with ticket #${fallbackTicket} (will proceed to ${targetLocation} after vitals)`,
        );
      } else if (queueResult?.success) {
        log.info(
          `[Internal Referral] Patient routed to Nursing queue with ticket #${queueResult.ticket_number} (will proceed to ${targetLocation} after vitals)`,
        );
      }
    } catch (routingError) {
      log.error(
        '[Internal Referral] Failed to route patient to nursing queue:',
        routingError,
      );
    }
  }

  return {
    encounterId: newEncounter.id,
    encounterNumber: newEncounter.encounter_number,
  };
}

/**
 * Determine the queue location based on specialty module
 * Covers all 20+ specialty clinics configured in the system
 */
export function getSpecialtyQueueLocation(
  specialtyModule: string | null,
): string {
  switch (specialtyModule?.toLowerCase()) {
    case 'dental':
      return 'Dental';
    case 'ophthalmology':
    case 'eye':
      return 'Ophthalmology';
    case 'physiotherapy':
    case 'physio':
      return 'Physiotherapy';
    case 'surgery':
    case 'general_surgery':
      return 'Surgery';
    case 'ent':
      return 'ENT';
    case 'cardiology':
      return 'Cardiology';
    case 'orthopedics':
    case 'orthopaedics':
      return 'Orthopaedics';
    case 'dermatology':
      return 'Dermatology';
    case 'urology':
      return 'Urology';
    case 'neurology':
      return 'Neurology';
    case 'neuropsychiatry':
      return 'Neuropsychiatry';
    case 'gastroenterology':
      return 'Gastroenterology';
    case 'nephrology':
      return 'Nephrology';
    case 'paediatrics':
    case 'pediatrics':
      return 'Paediatrics';
    case 'neurosurgery':
      return 'Neurosurgery';
    case 'gynaecology':
    case 'gynecology':
      return 'Gynaecology';
    case 'oral_maxillofacial':
    case 'oral & maxillofacial':
      return 'Oral & Maxillofacial';
    case 'pulmonology':
      return 'Pulmonology';
    case 'endocrinology':
      return 'Endocrinology';
    case 'plastic_surgery':
      return 'Plastic Surgery';
    case 'nutrition':
    case 'dietetics':
      return 'Nutrition';
    default:
      // Fallback: capitalize the module name, or default to Consultation
      if (specialtyModule) {
        return (
          specialtyModule.charAt(0).toUpperCase() + specialtyModule.slice(1)
        );
      }
      return 'Consultation';
  }
}

/**
 * Get referral encounters for a specialty clinic
 * Shows encounters that originated from internal referrals
 */
export async function getReferralEncounters(
  specialtyModule?: string,
  clinicId?: string,
): Promise<ReferralEncounter[]> {
  let query = supabase
    .from('visits')
    .select(
      `
      id,
      encounter_number,
      encounter_date,
      visit_type,
      status,
      is_referral_encounter,
      referral_reason,
      referral_clinical_notes,
      patient:patients!patient_id (
        id,
        emr_number,
        first_name,
        middle_name,
        surname,
        date_of_birth,
        gender
      ),
      referring_doctor:staff!referring_doctor_id (
        id,
        first_name,
        last_name,
        specialty
      ),
      referring_clinic:clinics!referring_clinic_id (
        clinic_name,
        clinic_code
      ),
      destination_clinic:clinics!clinic_id (
        id,
        clinic_name
      ),
      source_referral:clinical_requests!source_referral_id (
        id,
        request_number,
        created_at,
        urgency,
        specialty_module,
        clinical_reason,
        notes,
        original_encounter:visits!clinical_requests_encounter_id_fkey (
          encounter_number,
          chief_complaint
        )
      )
    `,
    )
    .eq('is_referral_encounter', true)
    .order('encounter_date', { ascending: false });

  if (clinicId) {
    query = query.eq('clinic_id', clinicId);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching referral encounters:', error);
    throw new Error(`Failed to fetch referral encounters: ${error.message}`);
  }

  // Filter by specialty module if provided
  let results = (data || []).map((e: any) => ({
    encounter_id: e.id,
    encounter_number: e.encounter_number,
    encounter_date: e.encounter_date,
    visit_type: e.visit_type,
    encounter_status: e.status,
    is_referral_encounter: e.is_referral_encounter,
    referral_reason: e.referral_reason,
    referral_clinical_notes: e.referral_clinical_notes,

    patient_id: e.patient?.id,
    emr_number: e.patient?.emr_number,
    patient_first_name: e.patient?.first_name,
    patient_middle_name: e.patient?.middle_name,
    patient_surname: e.patient?.surname,
    date_of_birth: e.patient?.date_of_birth,
    gender: e.patient?.gender,

    referring_doctor_id: e.referring_doctor?.id,
    referring_doctor_first_name: e.referring_doctor?.first_name,
    referring_doctor_last_name: e.referring_doctor?.last_name,
    referring_doctor_specialty: e.referring_doctor?.specialty,

    source_clinic_name: e.referring_clinic?.clinic_name,
    source_clinic_code: e.referring_clinic?.clinic_code,
    destination_clinic_id: e.destination_clinic?.id,
    destination_clinic_name: e.destination_clinic?.clinic_name,

    original_referral_id: e.source_referral?.id,
    original_referral_number: e.source_referral?.request_number,
    original_referral_date: e.source_referral?.created_at,
    referral_urgency: e.source_referral?.urgency,
    specialty_module: e.source_referral?.specialty_module,
    referral_clinical_reason: e.source_referral?.clinical_reason,
    referral_notes: e.source_referral?.notes,

    original_encounter_number:
      e.source_referral?.original_encounter?.encounter_number,
    original_chief_complaint:
      e.source_referral?.original_encounter?.chief_complaint,
    original_consultation_notes:
      e.source_referral?.original_encounter?.clinical_notes,
  }));

  if (specialtyModule) {
    results = results.filter(
      (r) =>
        r.specialty_module?.toLowerCase() === specialtyModule.toLowerCase(),
    );
  }

  return results;
}

/**
 * Cancel a referral
 * Can be called by Encounter Office or the referring doctor
 */
export async function cancelReferral(
  referralId: string,
  reason: string,
  cancelledBy?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .update({
      status: 'Cancelled',
      referral_workflow_status: 'Cancelled',
      rejection_reason: reason,
      reviewed_by: cancelledBy || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', referralId)
    .eq('request_type', 'Referral')
    .select('id')
    .single();

  if (error) {
    log.error('Error cancelling referral:', error);
    throw new Error(`Failed to cancel referral: ${error.message}`);
  }

  return !!data;
}

/**
 * Get referral statistics for dashboard
 */
export async function getReferralStats(): Promise<{
  pending: number;
  appointmentBooked: number;
  encounterCreated: number;
  total: number;
  byUrgency: { routine: number; urgent: number; emergency: number };
  bySpecialty: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('clinical_requests')
    .select(
      'id, request_type, referral_workflow_status, urgency, specialty_module',
    )
    .in('request_type', ['Referral', 'Follow-Up'])
    .not('status', 'in', '("Cancelled","Rejected")');

  if (error) {
    throw new Error(`Failed to fetch referral stats: ${error.message}`);
  }

  const referrals = data || [];

  const stats = {
    pending: 0,
    appointmentBooked: 0,
    encounterCreated: 0,
    total: referrals.length,
    byUrgency: { routine: 0, urgent: 0, emergency: 0 },
    bySpecialty: {} as Record<string, number>,
  };

  for (const r of referrals) {
    // Count by workflow status
    if (r.referral_workflow_status === 'Pending_Encounter_Office') {
      stats.pending++;
    } else if (r.referral_workflow_status === 'Appointment_Booked') {
      stats.appointmentBooked++;
    } else if (
      r.referral_workflow_status === 'Encounter_Created' ||
      r.referral_workflow_status === 'Completed'
    ) {
      stats.encounterCreated++;
    }

    // Count by urgency
    const urgency = (r.urgency || 'Routine').toLowerCase();
    if (urgency === 'routine') stats.byUrgency.routine++;
    else if (urgency === 'urgent') stats.byUrgency.urgent++;
    else if (urgency === 'emergency') stats.byUrgency.emergency++;

    // Count by specialty — Follow-Up entries show under 'follow_up' key
    const specialty =
      r.request_type === 'Follow-Up'
        ? 'follow_up'
        : r.specialty_module || 'other';
    stats.bySpecialty[specialty] = (stats.bySpecialty[specialty] || 0) + 1;
  }

  return stats;
}

// =============================================================================
// Follow-Up Booking
// =============================================================================

export interface UpsertFollowupBookingDTO {
  encounterId: string; // The originating encounter UUID
  patientId: string; // Patient UUID
  requestingDoctorId: string; // Staff UUID
  sourceClinicId?: string; // Clinic UUID (optional)
  followUpDate: string; // ISO date string e.g. '2026-03-15' — pass null/undefined to cancel
  followUpNotes?: string; // Doctor instructions
}

/**
 * Creates or updates a Follow-Up booking entry in clinical_requests.
 * Calls the upsert_followup_booking Postgres RPC.
 *
 * - If followUpDate is set    → INSERT new or UPDATE existing row for this encounter.
 * - If followUpDate is null   → Cancels the existing booking (if any).
 *
 * The Follow-Up entry will appear in the Encounter Module → Booking tab.
 */
export async function upsertFollowupBooking(
  dto: UpsertFollowupBookingDTO,
): Promise<string | null> {
  // Parse the date to ensure it's a plain date string (YYYY-MM-DD)
  let parsedDate: string | null = null;
  if (dto.followUpDate) {
    // Handle both date-only and full ISO timestamp strings
    parsedDate = dto.followUpDate.includes('T')
      ? dto.followUpDate.split('T')[0]
      : dto.followUpDate;
  }

  const { data, error } = await supabase.rpc('upsert_followup_booking', {
    p_encounter_id: dto.encounterId,
    p_patient_id: dto.patientId,
    p_requesting_doctor_id: dto.requestingDoctorId,
    p_source_clinic_id: dto.sourceClinicId || null,
    p_follow_up_date: parsedDate,
    p_follow_up_notes: dto.followUpNotes || null,
  });

  if (error) {
    log.error(
      '[FollowUp] Failed to upsert follow-up booking:',
      error.message,
    );
    throw new Error(`Failed to create follow-up booking: ${error.message}`);
  }

  return data as string | null; // Returns the clinical_request UUID
}

/**
 * Cancels an active follow-up booking for a given encounter.
 * This is the same as calling upsertFollowupBooking with followUpDate = null.
 */
export async function cancelFollowupBooking(
  encounterId: string,
  requestingDoctorId: string,
  patientId: string,
): Promise<void> {
  const { error } = await supabase.rpc('upsert_followup_booking', {
    p_encounter_id: encounterId,
    p_patient_id: patientId,
    p_requesting_doctor_id: requestingDoctorId,
    p_source_clinic_id: null,
    p_follow_up_date: null,
    p_follow_up_notes: null,
  });

  if (error) {
    log.error(
      '[FollowUp] Failed to cancel follow-up booking:',
      error.message,
    );
    throw new Error(`Failed to cancel follow-up booking: ${error.message}`);
  }
}