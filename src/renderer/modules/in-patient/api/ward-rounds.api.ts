// =============================================================================
// XENOCARE EMR - Ward Rounds API
// Supabase API functions for ward round documentation
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import type {
  WardRoundNote,
  CreateWardRoundNoteDTO,
  WardRoundType,
} from '../../../types/database.types';

import { createBatchOrders } from '../../clinical-consultation/api/consultation.api';
import { createClinicalRequest } from '../../clinical-requests/api/clinical-requests.api';
import type {
  LabOrderDTO,
  RadiologyOrderDTO,
  PrescriptionOrderDTO,
} from '../../clinical-consultation/dtos/consultation.dto';

type WardRoundInternalReferral = {
  specialty?: string;
  reason?: string;
  urgency?: 'Routine' | 'Urgent' | 'Emergency';
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
};

type WardRoundExternalReferral = {
  enabled?: boolean;
  facilityName?: string;
  facilityAddress?: string;
  doctorName?: string;
  reason?: string;
  clinicalFindings?: string;
  investigationFindings?: string;
  provisionalDiagnosis?: string;
  urgency?: 'Routine' | 'Urgent' | 'Emergency';
};

type WardRoundReferralsPayload = {
  internal?: WardRoundInternalReferral[];
  external?: WardRoundExternalReferral;
};

const INPATIENT_SPECIALTY_REFERRAL_MAP: Record<
  string,
  { specialtyModule: string; targetDepartmentId?: string }
> = {
  Dental: { specialtyModule: 'dental', targetDepartmentId: 'DEPT013' },
  Ophthalmology: {
    specialtyModule: 'ophthalmology',
    targetDepartmentId: 'DEPT014',
  },
  Physiotherapy: {
    specialtyModule: 'physiotherapy',
    targetDepartmentId: 'DEPT015',
  },
  Cardiology: { specialtyModule: 'cardiology', targetDepartmentId: 'DEPT016' },
  Orthopaedics: {
    specialtyModule: 'orthopaedics',
    targetDepartmentId: 'DEPT018',
  },
  Dermatology: {
    specialtyModule: 'dermatology',
    targetDepartmentId: 'DEPT017',
  },
  Urology: { specialtyModule: 'urology', targetDepartmentId: 'DEPT020' },
  Gastroenterology: {
    specialtyModule: 'gastroenterology',
    targetDepartmentId: 'DEPT023',
  },
  Nephrology: { specialtyModule: 'nephrology', targetDepartmentId: 'DEPT024' },
  Paediatrics: {
    specialtyModule: 'paediatrics',
    targetDepartmentId: 'DEPT025',
  },
  Neurosurgery: {
    specialtyModule: 'neurosurgery',
    targetDepartmentId: 'DEPT026',
  },
  Neurology: { specialtyModule: 'neurology', targetDepartmentId: 'DEPT021' },
  Neuropsychiatry: {
    specialtyModule: 'neuropsychiatry',
    targetDepartmentId: 'DEPT022',
  },
  'General Surgery': {
    specialtyModule: 'general_surgery',
    targetDepartmentId: 'DEPT027',
  },
  Gynaecology: {
    specialtyModule: 'gynaecology',
    targetDepartmentId: 'DEPT028',
  },
  'Oral & Maxillofacial': {
    specialtyModule: 'oral_maxillofacial',
    targetDepartmentId: 'DEPT029',
  },
  Pulmonology: {
    specialtyModule: 'pulmonology',
    targetDepartmentId: 'DEPT030',
  },
  Endocrinology: {
    specialtyModule: 'endocrinology',
    targetDepartmentId: 'DEPT031',
  },
  Nutrition: { specialtyModule: 'nutrition', targetDepartmentId: 'DEPT042' },
  'Plastic Surgery': {
    specialtyModule: 'plastic_surgery',
    targetDepartmentId: 'DEPT032',
  },
  'ENT (Ear, Nose & Throat)': {
    specialtyModule: 'ent',
    targetDepartmentId: 'DEPT019',
  },
};

function normalizeSpecialtyModuleFromLabel(specialtyLabel: string): string {
  const known = INPATIENT_SPECIALTY_REFERRAL_MAP[specialtyLabel];
  if (known) return known.specialtyModule;

  return specialtyLabel
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildInternalReferralNotes(
  referral: WardRoundInternalReferral,
): string | undefined {
  const notes: string[] = ['Source: Inpatient Ward Round'];

  if (referral.clinicalFindings?.trim()) {
    notes.push(`Clinical Findings: ${referral.clinicalFindings.trim()}`);
  }
  if (referral.provisionalDiagnosis?.trim()) {
    notes.push(
      `Provisional Diagnosis: ${referral.provisionalDiagnosis.trim()}`,
    );
  }

  return notes.join('\n');
}

function buildExternalReferralNotes(
  referral: WardRoundExternalReferral,
): string {
  const notes: string[] = ['Source: Inpatient Ward Round (External Referral)'];

  if (referral.facilityName?.trim()) {
    notes.push(`Target Facility: ${referral.facilityName.trim()}`);
  }
  if (referral.facilityAddress?.trim()) {
    notes.push(`Facility Address: ${referral.facilityAddress.trim()}`);
  }
  if (referral.doctorName?.trim()) {
    notes.push(`Target Doctor: ${referral.doctorName.trim()}`);
  }
  if (referral.clinicalFindings?.trim()) {
    notes.push(`Clinical Findings: ${referral.clinicalFindings.trim()}`);
  }
  if (referral.investigationFindings?.trim()) {
    notes.push(
      `Investigation Findings: ${referral.investigationFindings.trim()}`,
    );
  }
  if (referral.provisionalDiagnosis?.trim()) {
    notes.push(
      `Provisional Diagnosis: ${referral.provisionalDiagnosis.trim()}`,
    );
  }

  return notes.join('\n');
}

async function createInternalSpecialtyReferralRequests(params: {
  internalReferrals: WardRoundInternalReferral[];
  patientId: string;
  encounterId: string;
  requestingDoctorId: string;
  facilityId?: string;
}) {
  const {
    internalReferrals,
    patientId,
    encounterId,
    requestingDoctorId,
    facilityId,
  } = params;

  for (const referral of internalReferrals) {
    const specialtyLabel = (referral.specialty || '').trim();
    const clinicalReason = (referral.reason || '').trim();

    if (!specialtyLabel || !clinicalReason) continue;

    const specialtyConfig = INPATIENT_SPECIALTY_REFERRAL_MAP[specialtyLabel];
    const specialtyModule = normalizeSpecialtyModuleFromLabel(specialtyLabel);

    const basePayload: any = {
      patient_id: patientId,
      encounter_id: encounterId,
      requesting_doctor_id: requestingDoctorId,
      request_type: 'Referral' as const,
      clinical_reason: clinicalReason,
      urgency: referral.urgency || 'Routine',
      notes: buildInternalReferralNotes(referral),
      specialty_module: specialtyModule,
      facility_id: facilityId,
      // Align with specialty referral UIs:
      // - Nutrition referrals tab filters on `status` (Pending/Approved/In_Progress)
      // - Encounter Office filters on `referral_workflow_status`
      status: 'Pending',
      referral_workflow_status: 'Pending_Encounter_Office',
      created_by: requestingDoctorId,
    };

    try {
      await createClinicalRequest(
        specialtyConfig?.targetDepartmentId
          ? {
              ...basePayload,
              target_department_id: specialtyConfig.targetDepartmentId,
            }
          : basePayload,
      );
    } catch (error: any) {
      // If the mapped department is unavailable in a deployment, retry without target_department_id
      if (!specialtyConfig?.targetDepartmentId) {
        console.error(
          `[WardRound] Failed to create internal referral for ${specialtyLabel}:`,
          error,
        );
        continue;
      }

      try {
        await createClinicalRequest(basePayload);
      } catch (fallbackError: any) {
        console.error(
          `[WardRound] Failed to create internal referral for ${specialtyLabel} (fallback):`,
          fallbackError,
        );
      }
    }
  }
}

async function createExternalReferralRequest(params: {
  externalReferral: WardRoundExternalReferral;
  patientId: string;
  encounterId: string;
  requestingDoctorId: string;
  facilityId?: string;
}) {
  const {
    externalReferral,
    patientId,
    encounterId,
    requestingDoctorId,
    facilityId,
  } = params;

  if (!externalReferral.enabled) return;

  const clinicalReason = (externalReferral.reason || '').trim();
  if (!clinicalReason) return;

  try {
    await createClinicalRequest({
      patient_id: patientId,
      encounter_id: encounterId,
      requesting_doctor_id: requestingDoctorId,
      request_type: 'Referral',
      clinical_reason: clinicalReason,
      urgency: externalReferral.urgency || 'Routine',
      notes: buildExternalReferralNotes(externalReferral),
      facility_id: facilityId,
      status: 'Pending',
      referral_workflow_status: 'Pending_Encounter_Office',
      created_by: requestingDoctorId,
    } as any);
  } catch (error) {
    console.error(
      '[WardRound] Failed to create external referral request:',
      error,
    );
  }
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get ward round notes for an admission
 */
export async function getWardRoundNotes(admissionId: string) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(
      `
      *,
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name, role),
      created_by_user:staff!ward_round_notes_created_by_fkey(id, first_name, last_name, role)
    `,
    )
    .eq('admission_id', admissionId)
    .order('round_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WardRoundNote[];
}

/**
 * Get ward round notes for a specific date
 */
export async function getWardRoundNotesByDate(
  admissionId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(
      `
      *,
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name, role)
    `,
    )
    .eq('admission_id', admissionId)
    .eq('round_date', date)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WardRoundNote[];
}

/**
 * Get latest ward round note for an admission
 */
export async function getLatestWardRoundNote(admissionId: string) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(
      `
      *,
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name, role)
    `,
    )
    .eq('admission_id', admissionId)
    .order('round_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data as WardRoundNote | null;
}

/**
 * Get ward round notes by physician
 */
export async function getWardRoundNotesByPhysician(
  physicianId: string,
  startDate?: string,
  endDate?: string,
) {
  let query = supabase
    .from('ward_round_notes')
    .select(
      `
      *,
      admission:admissions(
        id,
        admission_number,
        patient:patients(id, first_name, surname, emr_number),
        current_ward:wards(id, name)
      )
    `,
    )
    .eq('attending_physician_id', physicianId)
    .order('round_date', { ascending: false });

  if (startDate) {
    query = query.gte('round_date', startDate);
  }
  if (endDate) {
    query = query.lte('round_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as WardRoundNote[];
}

/**
 * Get today's ward round notes for a ward
 */
export async function getTodaysWardRoundNotes(wardId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(
      `
      *,
      admission:admissions!inner(
        id,
        admission_number,
        current_ward_id,
        patient:patients(id, first_name, surname, emr_number),
        current_bed:beds(id, bed_number)
      ),
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('admission.current_ward_id', wardId)
    .eq('round_date', today)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as WardRoundNote[];
}

/**
 * Get a single ward round note by ID
 */
export async function getWardRoundNoteById(noteId: string) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(
      `
      *,
      admission:admissions(
        id,
        admission_number,
        patient:patients(*),
        current_ward:wards(id, name, ward_type),
        current_bed:beds(id, bed_number)
      ),
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .eq('id', noteId)
    .single();

  if (error) throw error;
  return data as WardRoundNote;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new ward round note with auto-generated encounter
 * Each ward round creates a linked encounter for traceability
 */
export async function createWardRoundNote(
  noteData: CreateWardRoundNoteDTO,
  userId: string,
) {
  const referralsPayload = noteData.referrals as
    | WardRoundReferralsPayload
    | undefined;

  // 1. Get admission details to access patient and facility info
  const { data: admission, error: admissionError } = await supabase
    .from('admissions')
    .select('patient_id, facility_id, encounter_id')
    .eq('id', noteData.admission_id)
    .single();

  if (admissionError) throw admissionError;

  // 2. Create an encounter (visit) for this ward round if not provided
  let encounterId = noteData.encounter_id || admission.encounter_id;

  if (!encounterId) {
    const { data: encounter, error: encounterError } = await supabase
      .from('visits')
      .insert({
        patient_id: admission.patient_id,
        // Note: clinic_id is not included as ward rounds are facility-level, not clinic-level
        visit_type: 'Ward Round',
        status: 'Completed',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        attending_doctor_id: userId,
        chief_complaint: `Ward round ${noteData.round_type} - ${new Date().toISOString().split('T')[0]}`,
        registered_by: userId,
      })
      .select('id')
      .single();

    if (encounterError) throw encounterError;
    encounterId = encounter.id;
  }

  // 3. Create the ward round note with encounter link
  const { data, error } = await supabase
    .from('ward_round_notes')
    .insert({
      admission_id: noteData.admission_id,
      encounter_id: encounterId,
      round_date: new Date().toISOString().split('T')[0],
      round_type: noteData.round_type,
      subjective_notes: noteData.subjective_notes,
      objective_findings: noteData.objective_findings,
      vital_signs: noteData.vital_signs,
      assessment: noteData.assessment,
      plan: noteData.plan,
      new_orders: noteData.new_orders || [],
      discontinued_orders: [],
      nursing_instructions: noteData.nursing_instructions,
      patient_condition: noteData.patient_condition,
      estimated_discharge_date: noteData.estimated_discharge_date,
      discharge_planning_notes: noteData.discharge_planning_notes,
      attending_physician_id: userId,
      participants: [],
      created_by: userId,
    })
    .select(
      `
      *,
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .single();

  if (error) throw error;

  // Resolve patients.patient_id (EMR public id) for clinical_requests.patient_id,
  // which is what specialty/referral modules join/filter on.
  const { data: patientData, error: patientError } = await supabase
    .from('patients')
    .select('patient_id, first_name, surname, emr_number')
    .eq('id', admission.patient_id)
    .single();

  if (patientError) throw patientError;

  const patientDisplayId = patientData?.patient_id || '';
  const patientName = patientData
    ? `${patientData.first_name || ''} ${patientData.surname || ''}`.trim()
    : undefined;
  const patientEmrNumber = patientData?.emr_number;

  if (!patientDisplayId) {
    throw new Error(
      '[WardRound] Failed to resolve patients.patient_id for ward-round orders/referrals',
    );
  }

  // 4. Dispatch orders via createBatchOrders (same flow as consultation wizard)
  //    This handles NHIS gating, catalogue lookups, and nhis_approvals creation
  if (noteData.new_orders && noteData.new_orders.length > 0 && encounterId) {
    // Staff display IDs needed for createBatchOrders
    const { data: staffData } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('id', userId)
      .single();

    const staffDisplayId = staffData?.staff_id || '';

    // Convert ward round orders to the DTO format used by createBatchOrders
    const { labOrders, radiologyOrders, prescriptions } =
      convertWardRoundOrdersToBatchDTOs(noteData.new_orders);

    const hasOrders =
      labOrders.length > 0 ||
      radiologyOrders.length > 0 ||
      prescriptions.length > 0;

    if (hasOrders) {
      try {
        const batchResult = await createBatchOrders({
          patientId: patientDisplayId, // VARCHAR like 'PT-00001'
          encounterId, // UUID
          orderedBy: staffDisplayId, // VARCHAR like 'DOC-7430'
          labOrders,
          radiologyOrders,
          prescriptions,
          procedureOrders: [],
          diagnosis: noteData.assessment ? [noteData.assessment] : [],
          clinicalFindings: noteData.objective_findings || undefined,
          patientName,
          patientEmrNumber,
        });

        console.log(
          `[WardRound] Dispatched via createBatchOrders: ${batchResult.labRequests.length} lab, ` +
            `${batchResult.radiologyRequests.length} radiology, ${batchResult.prescriptionRecords.length} Rx${
              batchResult.nhisRequestsCount > 0
                ? `, ${batchResult.nhisRequestsCount} sent to NHIS approval`
                : ''
            }`,
        );
      } catch (dispatchError) {
        // Don't fail the ward round note creation if order dispatch fails
        console.error(
          '[WardRound] Failed to dispatch orders via createBatchOrders:',
          dispatchError,
        );
      }
    }
  }

  // 4.1 Create a Nutrition queue ticket from ward-round Dietary / Nutrition orders.
  // Ward-round "dietary" orders are not converted by createBatchOrders.
  const dietaryOrders = (noteData.new_orders || []).filter(
    (o) => String(o?.type || '').toLowerCase() === 'dietary',
  );

  if (dietaryOrders.length > 0 && encounterId) {
    const hasStat = dietaryOrders.some(
      (o) => String(o?.priority || o?.urgency || '').toLowerCase() === 'stat',
    );
    const hasUrgent = dietaryOrders.some(
      (o) => String(o?.priority || o?.urgency || '').toLowerCase() === 'urgent',
    );
    const queuePriority: 'Emergency' | 'Urgent' | 'Normal' = hasStat
      ? 'Emergency'
      : hasUrgent
        ? 'Urgent'
        : 'Normal';

    const dietaryNotes = dietaryOrders
      .map((o) => String(o?.description || '').trim())
      .filter(Boolean)
      .join('; ');

    const nutritionNotes = `Inpatient dietary/nutrition order — Nutrition assessment${
      dietaryNotes ? `: ${dietaryNotes}` : ''
    }`;

    // Complete any existing active Nutrition queue entries for this encounter.
    await supabase
      .from('queue')
      .update({
        status: 'Completed',
        completed_at: new Date().toISOString(),
      })
      .or(`visit_id.eq.${encounterId},encounter_id.eq.${encounterId}`)
      .eq('location', 'Nutrition')
      .in('status', [
        'Waiting',
        'Called',
        'In Progress',
        'Ready_For_Consultation',
      ]);

    // Create new queue entry (atomic RPC if available; fallback insert otherwise).
    try {
      await supabase.rpc('create_queue_ticket', {
        p_dept: 'Nutrition',
        p_patient_id: admission.patient_id, // patients.id (UUID)
        p_visit_id: encounterId,
        p_encounter_id: encounterId,
        p_clinic_id: null,
        p_priority: queuePriority,
        p_notes: nutritionNotes,
      });
    } catch (queueError) {
      console.warn(
        '[WardRound] Failed to create Nutrition queue ticket via RPC; using fallback insert:',
        queueError,
      );

      const fallbackTicket = `Q-${Math.floor(Math.random() * 9000 + 1000)}`;

      const { error: insertError } = await supabase.from('queue').insert({
        patient_id: admission.patient_id, // patients.id (UUID)
        visit_id: encounterId,
        encounter_id: encounterId,
        location: 'Nutrition',
        ticket_number: fallbackTicket,
        priority: queuePriority,
        clinic_id: null,
        status: 'Waiting',
        notes: nutritionNotes,
      });

      if (insertError) {
        console.error(
          '[WardRound] Nutrition queue fallback insert failed:',
          insertError,
        );
      }
    }
  }

  // 5. Create specialty referral requests from inpatient ward round referral section
  // This makes inpatient referrals actionable in specialty modules (including Nutrition).
  if (encounterId && referralsPayload) {
    const internalReferrals = Array.isArray(referralsPayload.internal)
      ? referralsPayload.internal
      : [];

    if (internalReferrals.length > 0) {
      await createInternalSpecialtyReferralRequests({
        internalReferrals,
        patientId: patientDisplayId,
        encounterId,
        requestingDoctorId: userId,
        facilityId: admission.facility_id || undefined,
      });
    }

    if (referralsPayload.external?.enabled) {
      await createExternalReferralRequest({
        externalReferral: referralsPayload.external,
        patientId: patientDisplayId,
        encounterId,
        requestingDoctorId: userId,
        facilityId: admission.facility_id || undefined,
      });
    }
  }

  return data as WardRoundNote;
}

/**
 * Convert ward round order objects to the standard DTO format
 * used by createBatchOrders (same as consultation wizard)
 */
function convertWardRoundOrdersToBatchDTOs(orders: any[]): {
  labOrders: LabOrderDTO[];
  radiologyOrders: RadiologyOrderDTO[];
  prescriptions: PrescriptionOrderDTO[];
} {
  const labOrders: LabOrderDTO[] = [];
  const radiologyOrders: RadiologyOrderDTO[] = [];
  const prescriptions: PrescriptionOrderDTO[] = [];

  const priorityMap: Record<string, 'Normal' | 'Urgent' | 'Stat'> = {
    stat: 'Stat',
    urgent: 'Urgent',
    routine: 'Normal',
  };

  for (const order of orders) {
    const priority =
      priorityMap[order.urgency || order.priority || 'routine'] || 'Normal';

    switch (order.type) {
      case 'medication': {
        prescriptions.push({
          drug_id: order.catalogueId || undefined,
          drug_name: order.description || 'Medication',
          dosage: order.dosage || '',
          frequency: order.frequency || '',
          duration: order.duration || undefined,
          route: order.route || undefined,
          quantity_prescribed: order.quantity || 1,
          instructions: order.instructions || undefined,
          clinical_notes: 'Ordered during ward round',
        });
        break;
      }
      case 'lab': {
        if (order.catalogueId) {
          labOrders.push({
            test_id: order.catalogueId,
            clinical_notes:
              order.description || 'Lab test ordered during ward round',
            priority,
          });
        }
        break;
      }
      case 'radiology':
      case 'xray':
      case 'ct_scan':
      case 'ultrasound':
      case 'mri':
      case 'ecg': {
        if (order.catalogueId) {
          radiologyOrders.push({
            imaging_id: order.catalogueId,
            clinical_indication:
              order.description || 'Imaging ordered during ward round',
            priority,
          });
        }
        break;
      }
      // procedure, nursing, dietary, physiotherapy, other — stay as ward round orders only
      default:
        break;
    }
  }

  return { labOrders, radiologyOrders, prescriptions };
}

/**
 * Update a ward round note
 */
export async function updateWardRoundNote(
  noteId: string,
  updates: Partial<CreateWardRoundNoteDTO>,
  userId: string,
) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', noteId)
    .select(
      `
      *,
      attending_physician:staff!ward_round_notes_attending_physician_id_fkey(id, first_name, last_name)
    `,
    )
    .single();

  if (error) throw error;
  return data as WardRoundNote;
}

/**
 * Add participant to ward round note
 */
export async function addWardRoundParticipant(
  noteId: string,
  participantId: string,
  role: string,
  userId: string,
) {
  // First get current participants
  const { data: note } = await supabase
    .from('ward_round_notes')
    .select('participants')
    .eq('id', noteId)
    .single();

  const participants = note?.participants || [];

  // Check if participant already exists
  if (
    !participants.some((p: { user_id: string }) => p.user_id === participantId)
  ) {
    participants.push({ user_id: participantId, role });
  }

  const { data, error } = await supabase
    .from('ward_round_notes')
    .update({
      participants,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data as WardRoundNote;
}

/**
 * Add order to ward round note
 */
export async function addWardRoundOrder(
  noteId: string,
  orderType: string,
  description: string,
  urgency: string,
  userId: string,
) {
  const { data: note } = await supabase
    .from('ward_round_notes')
    .select('new_orders')
    .eq('id', noteId)
    .single();

  const orders = note?.new_orders || [];
  orders.push({ type: orderType, description, urgency });

  const { data, error } = await supabase
    .from('ward_round_notes')
    .update({
      new_orders: orders,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data as WardRoundNote;
}

/**
 * Delete a ward round note (only if created today and by same user)
 */
export async function deleteWardRoundNote(noteId: string, userId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('ward_round_notes')
    .delete()
    .eq('id', noteId)
    .eq('created_by', userId)
    .eq('round_date', today);

  if (error) throw error;
}

/**
 * Get ward round summary for a date range
 */
export async function getWardRoundSummary(
  wardId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('ward_round_notes')
    .select(
      `
      round_date,
      round_type,
      admission:admissions!inner(current_ward_id)
    `,
    )
    .eq('admission.current_ward_id', wardId)
    .gte('round_date', startDate)
    .lte('round_date', endDate);

  if (error) throw error;

  // Group by date and type
  const summary: Record<string, Record<WardRoundType, number>> = {};

  data.forEach((note) => {
    if (!summary[note.round_date]) {
      summary[note.round_date] = {
        morning: 0,
        evening: 0,
        night: 0,
        consultant: 0,
        multidisciplinary: 0,
        teaching: 0,
      };
    }
    summary[note.round_date][note.round_type as WardRoundType]++;
  });

  return summary;
}
