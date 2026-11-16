// =============================================================================
// Ophthalmology Module API
// =============================================================================
// Follows encounter-centric patterns from radiology.api.ts

import { supabase } from '../../../api/supabaseClient';
import { validateEncounterForModification } from '../../../lib/encounter/validation';
import { logAudit, EntityType, AuditAction } from '../../../lib/audit';
import { createBillingOrder } from '../../billing/api/billing-order.api';
import { calculateNhisServiceCoverage } from '../../billing/utils/coverage.utils';
import { isNhisFeatureEnabled } from '../../../config/features';
import type {
  EyeExamDTO,
  CreateEyeExamDTO,
  UpdateEyeExamDTO,
  EyeProcedureDTO,
  CreateEyeProcedureDTO,
  CompleteEyeProcedureDTO,
  GlassesPrescriptionDTO,
  CreateGlassesPrescriptionDTO,
  ContactLensPrescriptionDTO,
  EyeMedicationPrescriptionDTO,
  CreateEyeMedicationDTO,
} from '../types/ophthalmology.types';

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership'];

// Helper to check if patient is NHIS (includes all NHIS categories + DHML which is Military NHIS HMO)
function isNhisPatient(insuranceType: string): boolean {
  if (!isNhisFeatureEnabled()) return false;
  const normalized = (insuranceType || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
  return (
    normalized.includes('nhis') ||
    normalized === 'dhml' ||
    normalized === 'gifship'
  );
}

// Helper to get insurance type from visit
async function getPatientInsuranceType(encounterId: string): Promise<string> {
  const { data } = await supabase
    .from('visits')
    .select('payment_category, insurance_type')
    .eq('id', encounterId)
    .maybeSingle();

  return data?.insurance_type || data?.payment_category || 'Cash';
}

// Helper to get patient info for NHIS approval display
async function getPatientInfo(
  patientId: string,
): Promise<{ id: string; name: string; emr_number: string } | null> {
  const { data } = await supabase
    .from('patients')
    .select('id, first_name, surname, emr_number, patient_id')
    .eq('patient_id', patientId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id, // UUID for foreign key
    name: `${data.first_name || ''} ${data.surname || ''}`.trim(),
    emr_number: data.emr_number || data.patient_id,
  };
}

// Helper to create NHIS approval entry for ophthalmology services
async function createNhisApprovalEntry(params: {
  serviceRequestId: string;
  serviceType: 'eye_exam' | 'eye_procedure' | 'eye_prescription';
  encounterId: string;
  patientId: string;
  serviceName: string;
  serviceCode?: string;
  estimatedCost: number;
  requestedBy: string;
  clinicalFindings?: string;
  provisionalDiagnosis?: string;
}): Promise<void> {
  const patientInfo = await getPatientInfo(params.patientId);

  if (!patientInfo) {
    console.error('Failed to resolve patient info for NHIS approval entry');
    return;
  }

  const { error } = await supabase.from('nhis_approvals').insert({
    service_request_id: params.serviceRequestId,
    service_type: params.serviceType,
    service_category: 'ophthalmology',
    encounter_id: params.encounterId,
    patient_id: patientInfo.id, // Use UUID for foreign key constraint
    patient_emr_number: patientInfo.emr_number,
    patient_name: patientInfo.name,
    service_name: params.serviceName,
    service_code: params.serviceCode,
    estimated_cost: params.estimatedCost,
    requested_by: params.requestedBy,
    requested_at: new Date().toISOString(),
    request_reason: `Ophthalmology: ${params.serviceName} - requires NHIS pre-authorization`,
    clinical_justification: params.clinicalFindings,
    clinical_findings: params.clinicalFindings,
    provisional_diagnosis: params.provisionalDiagnosis,
    status: 'pending',
  });

  if (error) {
    console.error('Failed to create NHIS approval entry:', error);
    // Don't throw - the specialty record is already created
  }
}

// Helper to resolve patient UUID from patient_id string
async function resolvePatientUUID(patientId: string): Promise<string | null> {
  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('patient_id', patientId)
    .single();

  return data?.id || null;
}

/** Filters for querying eye exams */
export interface EyeExamFilters {
  patient_id?: string;
  encounter_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  facility_id?: string;
  limit?: number;
  offset?: number;
  includeNhisPending?: boolean; // If false (default), exclude pending NHIS approvals
}

/** Filters for querying eye procedures */
export interface EyeProcedureFilters {
  patient_id?: string;
  encounter_id?: string;
  exam_id?: string;
  procedure_type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  facility_id?: string;
  limit?: number;
  offset?: number;
  includeNhisPending?: boolean; // If false (default), exclude pending NHIS approvals
}

const CHIEF_COMPLAINT_MAX_LENGTH = 100;

function sanitizeEyeExamPayload<T extends Record<string, unknown>>(
  input: T,
): T {
  const sanitized = { ...input };

  if (typeof sanitized.chief_complaint === 'string') {
    sanitized.chief_complaint = sanitized.chief_complaint
      .trim()
      .slice(0, CHIEF_COMPLAINT_MAX_LENGTH);
  }

  return sanitized as T;
}

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

// Keep select compact to avoid oversized REST query URLs in Electron/proxy setups.
const EYE_EXAM_COLUMNS = '*';

const EYE_PROCEDURE_COLUMNS = `
  procedure_id,
  patient_id,
  encounter_id,
  exam_id,
  facility_id,
  procedure_type,
  procedure_category,
  affected_eye,
  procedure_notes,
  findings,
  interpretation,
  machine_used,
  parameters,
  images_attached,
  anesthesia_used,
  materials_used,
  complications,
  fee,
  status,
  performed_by,
  performed_at,
  created_by,
  created_at,
  updated_at
`;

const GLASSES_RX_COLUMNS = `
  prescription_id,
  patient_id,
  encounter_id,
  exam_id,
  facility_id,
  prescription_type,
  right_sphere,
  right_cylinder,
  right_axis,
  right_add,
  right_prism,
  left_sphere,
  left_cylinder,
  left_axis,
  left_add,
  left_prism,
  pd,
  pd_right,
  pd_left,
  lens_type,
  lens_material,
  lens_coating,
  tint,
  frame_recommendation,
  prescribed_by,
  prescribed_at,
  valid_until,
  status
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the currently authenticated staff member
 */
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
    .single();

  return data;
}

/**
 * Hydrate eye exam records with patient, encounter, and provider data
 */
async function hydrateEyeExams(exams: EyeExamDTO[]): Promise<EyeExamDTO[]> {
  if (!exams.length) return exams;

  // Get unique patient IDs
  const patientIds = [...new Set(exams.map((e) => e.patient_id))];
  const { data: patients, error: patientError } = await supabase
    .from('patients')
    .select('patient_id, first_name, surname, date_of_birth, emr_number')
    .in('patient_id', patientIds);

  if (patientError) {
    console.error('[hydrateEyeExams] Patient fetch error:', patientError);
  }

  // Get unique encounter IDs
  const encounterIds = [
    ...new Set(exams.map((e) => e.encounter_id).filter(Boolean)),
  ];
  console.log('[hydrateEyeExams] Encounter IDs to fetch:', encounterIds);

  const { data: encounters, error: encounterError } = encounterIds.length
    ? await supabase
        .from('visits')
        .select('id, encounter_number, visit_id, visit_type, created_at')
        .in('id', encounterIds)
    : { data: [], error: null };

  if (encounterError) {
    console.error('[hydrateEyeExams] Encounter fetch error:', encounterError);
  }
  console.log('[hydrateEyeExams] Fetched encounters:', encounters);

  // Get unique staff IDs
  const staffIds = [
    ...new Set(exams.filter((e) => e.created_by).map((e) => e.created_by!)),
  ];
  const { data: staff } = staffIds.length
    ? await supabase
        .from('staff')
        .select('id, first_name, last_name, role')
        .in('id', staffIds)
    : { data: [] };

  const patientMap = new Map(patients?.map((p) => [p.patient_id, p]));
  const encounterMap = new Map(encounters?.map((e) => [e.id, e]));
  const staffMap = new Map(staff?.map((s) => [s.id, s]));

  return exams.map((exam) => {
    const encounter = exam.encounter_id
      ? encounterMap.get(exam.encounter_id)
      : undefined;
    // Use encounter_number if available, fallback to visit_id
    const encounterData = encounter
      ? {
          id: encounter.id,
          encounter_number:
            encounter.encounter_number ||
            encounter.visit_id ||
            `ENC-${exam.encounter_id?.slice(0, 8)}`,
          visit_type: encounter.visit_type,
          created_at: encounter.created_at,
        }
      : undefined;

    return {
      ...exam,
      // Map DB column "color_vision" to form field "colour_vision" (British spelling)
      colour_vision: exam.color_vision || (exam as any).colour_vision,
      patient: patientMap.get(exam.patient_id),
      encounter: encounterData,
      provider: exam.created_by ? staffMap.get(exam.created_by) : undefined,
    };
  });
}

/**
 * Hydrate eye procedure records with performer data
 */
async function hydrateEyeProcedures(
  procedures: EyeProcedureDTO[],
): Promise<EyeProcedureDTO[]> {
  if (!procedures.length) return procedures;

  const staffIds = [
    ...new Set(
      procedures.filter((p) => p.performed_by).map((p) => p.performed_by!),
    ),
  ];
  const { data: staff } = staffIds.length
    ? await supabase
        .from('staff')
        .select('id, first_name, last_name')
        .in('id', staffIds)
    : { data: [] };

  const staffMap = new Map(staff?.map((s) => [s.id, s]));

  return procedures.map((proc) => ({
    ...proc,
    performer: proc.performed_by ? staffMap.get(proc.performed_by) : undefined,
  }));
}

/**
 * Check if an eye procedure has been paid for
 */
async function isEyeProcedurePaid(procedureId: string): Promise<boolean> {
  const { data: billingItem } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('source_type', 'EyeProcedure')
    .eq('source_id', procedureId)
    .single();

  if (!billingItem) return false;

  const { data: order } = await supabase
    .from('billing_orders')
    .select('status')
    .eq('id', billingItem.billing_order_id)
    .single();

  return order ? PAID_STATUSES.includes(order.status) : false;
}

// =============================================================================
// EYE EXAM CRUD
// =============================================================================

/**
 * Get eye exams with filters
 */
export async function getEyeExams(
  filters: EyeExamFilters = {},
): Promise<EyeExamDTO[]> {
  let query = supabase.from('eye_exams').select(EYE_EXAM_COLUMNS);

  if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
  if (filters.encounter_id)
    query = query.eq('encounter_id', filters.encounter_id);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.facility_id) query = query.eq('facility_id', filters.facility_id);
  if (filters.from_date) query = query.gte('created_at', filters.from_date);
  if (filters.to_date) query = query.lte('created_at', filters.to_date);

  // Filter out pending NHIS approvals unless explicitly included
  if (!filters.includeNhisPending) {
    query = query.neq('nhis_approval_status', 'pending');
  }

  query = query.order('created_at', { ascending: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset)
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1,
    );

  const { data, error } = await query;
  if (error) throw error;

  return hydrateEyeExams((data || []) as EyeExamDTO[]);
}

/**
 * Get a single eye exam by ID
 */
export async function getEyeExam(examId: string): Promise<EyeExamDTO | null> {
  const { data, error } = await supabase
    .from('eye_exams')
    .select(EYE_EXAM_COLUMNS)
    .eq('exam_id', examId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const hydrated = await hydrateEyeExams([data as EyeExamDTO]);
  return hydrated[0] || null;
}

/**
 * Get eye exams for a patient
 */
export async function getPatientEyeExams(
  patientId: string,
): Promise<EyeExamDTO[]> {
  return getEyeExams({ patient_id: patientId });
}

/**
 * Get eye exams for an encounter
 */
export async function getEncounterEyeExams(
  encounterId: string,
): Promise<EyeExamDTO[]> {
  return getEyeExams({ encounter_id: encounterId });
}

/**
 * Create a new eye exam
 */
export async function createEyeExam(
  input: CreateEyeExamDTO,
): Promise<EyeExamDTO> {
  const sanitizedInput = sanitizeEyeExamPayload(
    input as unknown as Record<string, unknown>,
  ) as CreateEyeExamDTO;

  const validation = await validateEncounterForModification(
    sanitizedInput.encounter_id,
  );
  if (!validation.isValid) {
    throw new Error(validation.error || 'Encounter validation failed');
  }

  const staff = await getCurrentStaff();

  // Build insert object - only include defined values
  const insertData: Record<string, unknown> = {
    patient_id: sanitizedInput.patient_id,
    encounter_id: sanitizedInput.encounter_id,
    status: 'Pending',
  };

  // Add all optional fields if they are defined
  const optionalFields = [
    'consultation_id',
    'facility_id',
    // Chief complaint
    'chief_complaint',
    'complaint_duration',
    'affected_eye',
    // History
    'ocular_history',
    'ocular_surgery_history',
    'systemic_history',
    'family_history',
    'drug_allergy',
    'current_medications',
    'glasses_history',
    'contact_lens_history',
    // Visual Acuity
    'va_right_unaided',
    'va_left_unaided',
    'va_right_aided',
    'va_left_aided',
    'va_right_pinhole',
    'va_left_pinhole',
    'va_right_near',
    'va_left_near',
    // Auto-Refraction
    'ar_right_sphere',
    'ar_right_cylinder',
    'ar_right_axis',
    'ar_left_sphere',
    'ar_left_cylinder',
    'ar_left_axis',
    // Cycloplegic Refraction
    'cyclo_agent',
    'cyclo_instillation_time',
    'cyclo_right_sphere',
    'cyclo_right_cylinder',
    'cyclo_right_axis',
    'cyclo_left_sphere',
    'cyclo_left_cylinder',
    'cyclo_left_axis',
    // Subjective Refraction
    'rx_right_sphere',
    'rx_right_cylinder',
    'rx_right_axis',
    'rx_right_add',
    'rx_right_prism',
    'rx_left_sphere',
    'rx_left_cylinder',
    'rx_left_axis',
    'rx_left_add',
    'rx_left_prism',
    'rx_pd',
    'rx_pd_right',
    'rx_pd_left',
    // BCVA
    'bcva_right',
    'bcva_left',
    // IOP
    'iop_right',
    'iop_left',
    'iop_method',
    'iop_time',
    'iop_classification',
    'cct_right',
    'cct_left',
    // Pupil
    'pupil_right_size',
    'pupil_left_size',
    'pupil_right_reaction',
    'pupil_left_reaction',
    // Motility
    'cover_test',
    'ocular_motility',
    'convergence',
    'npc',
    'visual_fields_confrontation',
    // Anterior Segment - Right
    'anterior_right_lids',
    'anterior_right_lacrimal',
    'anterior_right_conjunctiva',
    'anterior_right_sclera',
    'anterior_right_cornea',
    'anterior_right_ac',
    'anterior_right_ac_depth',
    'anterior_right_iris',
    'anterior_right_pupil',
    'anterior_right_lens',
    'anterior_right_lens_status',
    // Anterior Segment - Left
    'anterior_left_lids',
    'anterior_left_lacrimal',
    'anterior_left_conjunctiva',
    'anterior_left_sclera',
    'anterior_left_cornea',
    'anterior_left_ac',
    'anterior_left_ac_depth',
    'anterior_left_iris',
    'anterior_left_pupil',
    'anterior_left_lens',
    'anterior_left_lens_status',
    // Gonioscopy
    'gonioscopy_right',
    'gonioscopy_left',
    'angle_right',
    'angle_left',
    // Posterior Segment
    'dilation_performed',
    'dilation_agent',
    // Posterior Segment - Right
    'posterior_right_media',
    'posterior_right_disc',
    'posterior_right_disc_color',
    'posterior_right_cdr',
    'posterior_right_rim',
    'posterior_right_macula',
    'posterior_right_foveal_reflex',
    'posterior_right_vessels',
    'posterior_right_av_ratio',
    'posterior_right_periphery',
    'posterior_right_dr_grading',
    // Posterior Segment - Left
    'posterior_left_media',
    'posterior_left_disc',
    'posterior_left_disc_color',
    'posterior_left_cdr',
    'posterior_left_rim',
    'posterior_left_macula',
    'posterior_left_foveal_reflex',
    'posterior_left_vessels',
    'posterior_left_av_ratio',
    'posterior_left_periphery',
    'posterior_left_dr_grading',
    // Additional Tests
    'color_vision',
    'color_vision_method',
    'contrast_sensitivity',
    'amsler_grid',
    'schirmer_test_right',
    'schirmer_test_left',
    'visual_field_notes',
    'refractive_error_classification',
    'spectacle_recommendation',
    // Diagnosis
    'provisional_diagnosis',
    'final_diagnosis',
    'icd_codes',
    // Treatment Plan
    'treatment_plan',
    'glasses_prescribed',
    'contact_lens_prescribed',
    'medications_prescribed',
    'surgery_recommended',
    'surgery_type',
    // Referral
    'referral_needed',
    'referral_to',
    'referral_reason',
    // Follow-up
    'follow_up_interval',
    'follow_up_date',
    'follow_up_notes',
  ];

  optionalFields.forEach((field) => {
    const value = (sanitizedInput as unknown as Record<string, unknown>)[field];
    if (value !== undefined && value !== null && value !== '') {
      insertData[field] = value;
    }
  });

  // Map British spelling "colour_vision" from form to DB column "color_vision"
  const colourVision = (sanitizedInput as unknown as Record<string, unknown>)
    .colour_vision;
  if (
    colourVision !== undefined &&
    colourVision !== null &&
    colourVision !== '' &&
    !insertData.color_vision
  ) {
    insertData.color_vision = colourVision;
  }

  // Add created_by if staff is available
  if (staff) {
    insertData.created_by = staff.id;
  }

  const { data, error } = await supabase
    .from('eye_exams')
    .insert(insertData)
    .select(EYE_EXAM_COLUMNS)
    .single();

  if (error) throw error;

  // Update queue status to Completed - patient leaves queue after exam is saved
  await supabase
    .from('queue')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('visit_id', sanitizedInput.encounter_id)
    .eq('location', 'Ophthalmology');

  if (staff) {
    await logAudit({
      encounterId: sanitizedInput.encounter_id,
      patientId: sanitizedInput.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.exam_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as EyeExamDTO;
}

/**
 * Update an eye exam
 */
export async function updateEyeExam(
  examId: string,
  input: UpdateEyeExamDTO,
): Promise<EyeExamDTO> {
  const sanitizedInput = sanitizeEyeExamPayload(
    input as unknown as Record<string, unknown>,
  ) as UpdateEyeExamDTO;

  // Get existing exam
  const { data: existing, error: fetchError } = await supabase
    .from('eye_exams')
    .select('*')
    .eq('exam_id', examId)
    .single();

  if (fetchError || !existing) throw new Error('Eye exam not found');
  if (existing.status === 'Completed')
    throw new Error('Cannot modify completed exam');

  await validateEncounterForModification(existing.encounter_id);

  const immutableKeys = new Set([
    'exam_id',
    'patient_id',
    'encounter_id',
    'created_at',
    'created_by',
    'finalized_at',
    'finalized_by',
  ]);
  const updatableColumnKeys = new Set(Object.keys(existing || {}));

  // Build update object (exclude undefined values)
  const updateData: Record<string, unknown> = {};
  Object.entries(sanitizedInput).forEach(([key, value]) => {
    if (value !== undefined) {
      // Map British spelling "colour_vision" from form to DB column "color_vision"
      const dbKey = key === 'colour_vision' ? 'color_vision' : key;
      if (!updatableColumnKeys.has(dbKey)) return;
      if (immutableKeys.has(dbKey)) return;
      updateData[dbKey] = value;
    }
  });
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('eye_exams')
    .update(updateData)
    .eq('exam_id', examId)
    .select(EYE_EXAM_COLUMNS)
    .single();

  if (error) throw error;

  const staff = await getCurrentStaff();
  if (staff) {
    await logAudit({
      encounterId: existing.encounter_id,
      patientId: existing.patient_id,
      action: 'UPDATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: examId,
      performedBy: staff.staff_id,
      oldValue: existing,
      newValue: data,
    });
  }

  return data as EyeExamDTO;
}

/**
 * Complete an eye exam
 */
export async function completeEyeExam(
  examId: string,
  staffId: string,
): Promise<EyeExamDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('eye_exams')
    .select('exam_id, encounter_id, patient_id, status')
    .eq('exam_id', examId)
    .single();

  if (fetchError || !existing) throw new Error('Eye exam not found');
  if (existing.status === 'Completed')
    throw new Error('Exam already completed');

  await validateEncounterForModification(existing.encounter_id);

  const { data, error } = await supabase
    .from('eye_exams')
    .update({
      status: 'Completed',
      finalized_at: new Date().toISOString(),
      finalized_by: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq('exam_id', examId)
    .select(EYE_EXAM_COLUMNS)
    .single();

  if (error) throw error;

  await logAudit({
    encounterId: existing.encounter_id,
    patientId: existing.patient_id,
    action: 'UPDATE' as AuditAction,
    entityType: 'consultation' as EntityType,
    entityId: examId,
    performedBy: staffId,
    oldValue: existing,
    newValue: { status: 'Completed', finalized_at: data.finalized_at },
  });

  return data as EyeExamDTO;
}

// =============================================================================
// EYE PROCEDURE CRUD
// =============================================================================

/**
 * Get eye procedures with filters
 */
export async function getEyeProcedures(
  filters: EyeProcedureFilters = {},
): Promise<EyeProcedureDTO[]> {
  // Include patient join for display in the queue/list views
  const selectWithPatient = `${EYE_PROCEDURE_COLUMNS}, patient:patients!eye_procedures_patient_id_fkey(id, patient_id, first_name, surname, emr_number)`;

  let query = supabase.from('eye_procedures').select(selectWithPatient);

  if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
  if (filters.encounter_id)
    query = query.eq('encounter_id', filters.encounter_id);
  if (filters.exam_id) query = query.eq('exam_id', filters.exam_id);
  if (filters.procedure_type)
    query = query.eq('procedure_type', filters.procedure_type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.facility_id) query = query.eq('facility_id', filters.facility_id);
  if (filters.from_date) query = query.gte('created_at', filters.from_date);
  if (filters.to_date) query = query.lte('created_at', filters.to_date);

  // Filter out pending NHIS approvals unless explicitly included
  if (!filters.includeNhisPending) {
    query = query.neq('nhis_approval_status', 'pending');
  }

  query = query.order('created_at', { ascending: false });

  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset)
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1,
    );

  const { data, error } = await query;
  if (error) throw error;

  // Transform patient array to object (Supabase returns array for FK joins)
  const transformedData = (data || []).map((item: any) => ({
    ...item,
    patient: Array.isArray(item.patient) ? item.patient[0] : item.patient,
  })) as unknown as EyeProcedureDTO[];

  return hydrateEyeProcedures(transformedData);
}

/**
 * Get a single eye procedure by ID
 */
export async function getEyeProcedure(
  procedureId: string,
): Promise<EyeProcedureDTO | null> {
  const { data, error } = await supabase
    .from('eye_procedures')
    .select(EYE_PROCEDURE_COLUMNS)
    .eq('procedure_id', procedureId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const hydrated = await hydrateEyeProcedures([data as EyeProcedureDTO]);
  return hydrated[0] || null;
}

/**
 * Create an eye procedure
 */
export async function createEyeProcedure(
  input: CreateEyeProcedureDTO,
): Promise<EyeProcedureDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  // Check if patient is NHIS - trigger will auto-set nhis_approval_status
  const insuranceType = await getPatientInsuranceType(input.encounter_id);
  const isNhis = isNhisPatient(insuranceType);

  const { data, error } = await supabase
    .from('eye_procedures')
    .insert({
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      exam_id: input.exam_id,
      facility_id: input.facility_id,
      procedure_type: input.procedure_type,
      procedure_category: input.procedure_category,
      affected_eye: input.affected_eye,
      procedure_notes: input.procedure_notes,
      fee: input.fee,
      status: 'Pending',
      // nhis_approval_status is set by database trigger for NHIS patients
    })
    .select(EYE_PROCEDURE_COLUMNS)
    .single();

  if (error) throw error;

  // Create NHIS approval entry for NHIS patients
  if (isNhis && staff) {
    await createNhisApprovalEntry({
      serviceRequestId: data.procedure_id,
      serviceType: 'eye_procedure',
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      serviceName: `Eye: ${input.procedure_type}${input.affected_eye ? ` (${input.affected_eye})` : ''}`,
      estimatedCost: input.fee || 0,
      requestedBy: staff.id,
      clinicalFindings: input.procedure_notes,
    });
  }

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.procedure_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as EyeProcedureDTO;
}

/**
 * Accept an eye procedure request and create billing order.
 * This follows the same pattern as lab/radiology acceptance.
 */
export async function acceptEyeProcedure(
  procedureId: string,
): Promise<EyeProcedureDTO> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  // Get the procedure with patient info
  const { data: procedure, error: fetchError } = await supabase
    .from('eye_procedures')
    .select(
      `${EYE_PROCEDURE_COLUMNS}, patient:patients!eye_procedures_patient_id_fkey(id, patient_id)`,
    )
    .eq('procedure_id', procedureId)
    .single();

  if (fetchError) throw fetchError;
  if (!procedure) throw new Error('Eye procedure not found');
  if (procedure.status !== 'Pending') {
    throw new Error(`Cannot accept procedure in ${procedure.status} status`);
  }

  // Get insurance type for NHIS calculation
  const insuranceType = await getPatientInsuranceType(procedure.encounter_id);
  const isNhis = isNhisPatient(insuranceType);

  // Get patient UUID for billing
  // Note: The joined 'patient' field might be an array or object depending on query result
  const patientData = procedure.patient;
  const patientRecord = Array.isArray(patientData)
    ? (patientData[0] as { id: string; patient_id: string } | undefined)
    : (patientData as { id: string; patient_id: string } | null);
  const patientUuid = patientRecord?.id;
  if (!patientUuid) {
    throw new Error('Patient UUID not found');
  }

  // Update procedure status to Scheduled
  const { data: updatedProcedure, error: updateError } = await supabase
    .from('eye_procedures')
    .update({
      status: 'Scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('procedure_id', procedureId)
    .select(EYE_PROCEDURE_COLUMNS)
    .single();

  if (updateError) throw updateError;

  // Calculate pricing using proper NHIS coverage utility
  const coverage = calculateNhisServiceCoverage({
    insuranceType,
    serviceType: 'Ophthalmology',
    regularPrice: procedure.fee || 0,
    nhisPrice: null, // Eye procedures typically don't have separate NHIS prices
    isServiceNhisCovered: true,
    serviceNhisPercentage: null, // Use default based on insurance type
    quantity: 1,
  });

  // Create billing order
  const serviceName = `Ophthalmology: ${procedure.procedure_type}${procedure.affected_eye ? ` - ${procedure.affected_eye} Eye` : ''}`;
  await createBillingOrder({
    patient_id: patientUuid,
    encounter_id: procedure.encounter_id || undefined,
    source_module: 'ophthalmology',
    service_reference_id: procedureId,
    service_description: serviceName,
    service_name: serviceName,
    quantity: 1,
    unit_price: coverage.grossAmount,
    unit_cost: coverage.grossAmount,
    gross_amount: coverage.grossAmount,
    service_type: 'Ophthalmology',
    nhis_covered: coverage.isNhis,
    nhis_percentage: coverage.nhisPercentage,
    nhis_payable: coverage.nhisPayable,
    patient_payable: coverage.patientPayable,
  });

  // Audit log
  await logAudit({
    encounterId: procedure.encounter_id,
    patientId: procedure.patient_id,
    action: 'UPDATE' as AuditAction,
    entityType: 'consultation' as EntityType,
    entityId: procedureId,
    performedBy: staff.staff_id,
    oldValue: { status: 'Pending' },
    newValue: { status: 'Scheduled' },
  });

  return updatedProcedure as EyeProcedureDTO;
}

/**
 * Reject an eye procedure request.
 * No billing is created for rejected procedures.
 */
export async function rejectEyeProcedure(
  procedureId: string,
  reason: string,
): Promise<EyeProcedureDTO> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  if (!reason?.trim()) {
    throw new Error('Rejection reason is required');
  }

  // Get the procedure
  const { data: procedure, error: fetchError } = await supabase
    .from('eye_procedures')
    .select('procedure_id, status, encounter_id, patient_id')
    .eq('procedure_id', procedureId)
    .single();

  if (fetchError) throw fetchError;
  if (!procedure) throw new Error('Eye procedure not found');
  if (procedure.status !== 'Pending') {
    throw new Error(`Cannot reject procedure in ${procedure.status} status`);
  }

  // Update status to Cancelled with reason
  const { data: updatedProcedure, error: updateError } = await supabase
    .from('eye_procedures')
    .update({
      status: 'Cancelled',
      procedure_notes: `Rejected: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('procedure_id', procedureId)
    .select(EYE_PROCEDURE_COLUMNS)
    .single();

  if (updateError) throw updateError;

  // Audit log
  await logAudit({
    encounterId: procedure.encounter_id,
    patientId: procedure.patient_id,
    action: 'UPDATE' as AuditAction,
    entityType: 'consultation' as EntityType,
    entityId: procedureId,
    performedBy: staff.staff_id,
    oldValue: { status: 'Pending' },
    newValue: { status: 'Cancelled', reason },
  });

  return updatedProcedure as EyeProcedureDTO;
}

/**
 * Complete an eye procedure with findings
 */
export async function completeEyeProcedure(
  input: CompleteEyeProcedureDTO,
): Promise<EyeProcedureDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('eye_procedures')
    .select('procedure_id, encounter_id, patient_id, status')
    .eq('procedure_id', input.procedure_id)
    .single();

  if (fetchError || !existing) throw new Error('Eye procedure not found');
  if (existing.status === 'Completed')
    throw new Error('Procedure already completed');

  await validateEncounterForModification(existing.encounter_id);

  // Check payment status
  const isPaid = await isEyeProcedurePaid(input.procedure_id);
  if (!isPaid) throw new Error('Procedure must be paid before completing');

  const { data, error } = await supabase
    .from('eye_procedures')
    .update({
      findings: input.findings,
      interpretation: input.interpretation,
      machine_used: input.machine_used,
      parameters: input.parameters,
      images_attached: input.images_attached,
      complications: input.complications,
      performed_by: input.performed_by,
      performed_at: input.performed_at,
      status: 'Completed',
      updated_at: new Date().toISOString(),
    })
    .eq('procedure_id', input.procedure_id)
    .select(EYE_PROCEDURE_COLUMNS)
    .single();

  if (error) throw error;

  const staff = await getCurrentStaff();
  if (staff) {
    await logAudit({
      encounterId: existing.encounter_id,
      patientId: existing.patient_id,
      action: 'UPDATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: input.procedure_id,
      performedBy: staff.staff_id,
      oldValue: existing,
      newValue: data,
    });
  }

  return data as EyeProcedureDTO;
}

/**
 * Cancel an eye procedure
 */
export async function cancelEyeProcedure(
  procedureId: string,
  reason?: string,
): Promise<EyeProcedureDTO> {
  const { data: existing, error: fetchError } = await supabase
    .from('eye_procedures')
    .select('procedure_id, encounter_id, patient_id, status')
    .eq('procedure_id', procedureId)
    .single();

  if (fetchError || !existing) throw new Error('Eye procedure not found');
  if (existing.status === 'Completed')
    throw new Error('Cannot cancel completed procedure');

  await validateEncounterForModification(existing.encounter_id);

  const { data, error } = await supabase
    .from('eye_procedures')
    .update({
      status: 'Cancelled',
      procedure_notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('procedure_id', procedureId)
    .select(EYE_PROCEDURE_COLUMNS)
    .single();

  if (error) throw error;

  const staff = await getCurrentStaff();
  if (staff) {
    await logAudit({
      encounterId: existing.encounter_id,
      patientId: existing.patient_id,
      action: 'UPDATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: procedureId,
      performedBy: staff.staff_id,
      oldValue: existing,
      newValue: { status: 'Cancelled' },
    });
  }

  return data as EyeProcedureDTO;
}

// =============================================================================
// PRESCRIPTIONS
// =============================================================================

/**
 * Create glasses prescription
 */
export async function createGlassesPrescription(
  input: CreateGlassesPrescriptionDTO,
): Promise<GlassesPrescriptionDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('eye_prescriptions')
    .insert({
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      exam_id: input.exam_id,
      facility_id: input.facility_id,
      prescription_type: 'Glasses',
      right_sphere: input.right_sphere,
      right_cylinder: input.right_cylinder,
      right_axis: input.right_axis,
      right_add: input.right_add,
      right_prism: input.right_prism,
      left_sphere: input.left_sphere,
      left_cylinder: input.left_cylinder,
      left_axis: input.left_axis,
      left_add: input.left_add,
      left_prism: input.left_prism,
      pd: input.pd,
      pd_right: input.pd_right,
      pd_left: input.pd_left,
      lens_type: input.lens_type,
      lens_material: input.lens_material,
      lens_coating: input.lens_coating,
      tint: input.tint,
      frame_recommendation: input.frame_recommendation,
      status: 'Active',
    })
    .select(GLASSES_RX_COLUMNS)
    .single();

  if (error) throw error;

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'prescription' as EntityType,
      entityId: data.prescription_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as GlassesPrescriptionDTO;
}

/**
 * Create contact lens prescription
 */
export async function createContactLensPrescription(input: {
  patient_id: string;
  encounter_id: string;
  exam_id?: string;
  facility_id?: string;
  right_sphere?: number;
  right_cylinder?: number;
  right_axis?: number;
  right_base_curve?: number;
  right_diameter?: number;
  left_sphere?: number;
  left_cylinder?: number;
  left_axis?: number;
  left_base_curve?: number;
  left_diameter?: number;
  contact_lens_brand?: string;
  contact_lens_type?: string;
  wearing_schedule?: string;
  care_instructions?: string;
}): Promise<ContactLensPrescriptionDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('eye_prescriptions')
    .insert({
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      exam_id: input.exam_id,
      facility_id: input.facility_id,
      prescription_type: 'Contact_Lens',
      right_sphere: input.right_sphere,
      right_cylinder: input.right_cylinder,
      right_axis: input.right_axis,
      right_base_curve: input.right_base_curve,
      right_diameter: input.right_diameter,
      left_sphere: input.left_sphere,
      left_cylinder: input.left_cylinder,
      left_axis: input.left_axis,
      left_base_curve: input.left_base_curve,
      left_diameter: input.left_diameter,
      contact_lens_brand: input.contact_lens_brand,
      contact_lens_type: input.contact_lens_type,
      wearing_schedule: input.wearing_schedule,
      care_instructions: input.care_instructions,
      status: 'Active',
    })
    .select('*')
    .single();

  if (error) throw error;

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'prescription' as EntityType,
      entityId: data.prescription_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as ContactLensPrescriptionDTO;
}

/**
 * Create eye medication prescription
 */
export async function createEyeMedicationPrescription(
  input: CreateEyeMedicationDTO,
): Promise<EyeMedicationPrescriptionDTO> {
  await validateEncounterForModification(input.encounter_id);

  const staff = await getCurrentStaff();

  // Check if patient is NHIS - trigger will auto-set nhis_approval_status
  const insuranceType = await getPatientInsuranceType(input.encounter_id);
  const isNhis = isNhisPatient(insuranceType);

  const { data, error } = await supabase
    .from('eye_prescriptions')
    .insert({
      patient_id: input.patient_id,
      encounter_id: input.encounter_id,
      exam_id: input.exam_id,
      facility_id: input.facility_id,
      prescription_type: input.prescription_type,
      medication_name: input.medication_name,
      generic_name: input.generic_name,
      concentration: input.concentration,
      dosage: input.dosage,
      frequency: input.frequency,
      duration: input.duration,
      affected_eye: input.affected_eye,
      special_instructions: input.special_instructions,
      quantity: input.quantity,
      refills_allowed: input.refills_allowed,
      status: 'Active',
      // nhis_approval_status is set by database trigger for NHIS patients
    })
    .select('*')
    .single();

  if (error) throw error;

  // Create NHIS approval entry for NHIS patients
  if (isNhis && staff) {
    await createNhisApprovalEntry({
      serviceRequestId: data.prescription_id,
      serviceType: 'eye_prescription',
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      serviceName:
        `Eye Rx: ${input.medication_name} ${input.concentration || ''} (${input.affected_eye})`.trim(),
      estimatedCost: 0, // Eye prescriptions go to pharmacy for costing
      requestedBy: staff.id,
      clinicalFindings: input.special_instructions,
    });
  }

  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'prescription' as EntityType,
      entityId: data.prescription_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  return data as EyeMedicationPrescriptionDTO;
}

/**
 * Get prescriptions for an exam
 */
export async function getExamPrescriptions(examId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('eye_prescriptions')
    .select('*')
    .eq('exam_id', examId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get prescriptions for a patient
 */
export async function getPatientEyePrescriptions(
  patientId: string,
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('eye_prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('prescribed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =============================================================================
// TREND QUERIES (for clinical decision support)
// =============================================================================

/**
 * Get IOP trend for a patient (for glaucoma monitoring)
 */
export async function getPatientIOPTrend(
  patientId: string,
  limit = 10,
): Promise<
  Array<{
    date: string;
    iop_right?: number;
    iop_left?: number;
    iop_method?: string;
  }>
> {
  const { data, error } = await supabase
    .from('eye_exams')
    .select('created_at, iop_right, iop_left, iop_method')
    .eq('patient_id', patientId)
    .not('iop_right', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    date: row.created_at,
    iop_right: row.iop_right,
    iop_left: row.iop_left,
    iop_method: row.iop_method,
  }));
}

/**
 * Get visual acuity trend for a patient
 */
export async function getPatientVisualAcuityTrend(
  patientId: string,
  limit = 10,
): Promise<
  Array<{
    date: string;
    va_right_unaided?: string;
    va_left_unaided?: string;
    va_right_aided?: string;
    va_left_aided?: string;
    bcva_right?: string;
    bcva_left?: string;
  }>
> {
  const { data, error } = await supabase
    .from('eye_exams')
    .select(
      'created_at, va_right_unaided, va_left_unaided, va_right_aided, va_left_aided, bcva_right, bcva_left',
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    date: row.created_at,
    va_right_unaided: row.va_right_unaided,
    va_left_unaided: row.va_left_unaided,
    va_right_aided: row.va_right_aided,
    va_left_aided: row.va_left_aided,
    bcva_right: row.bcva_right,
    bcva_left: row.bcva_left,
  }));
}

/**
 * Get refraction history for a patient
 */
export async function getPatientRefractionHistory(
  patientId: string,
  limit = 10,
): Promise<
  Array<{
    date: string;
    rx_right: {
      sphere?: number;
      cylinder?: number;
      axis?: number;
      add?: number;
    };
    rx_left: {
      sphere?: number;
      cylinder?: number;
      axis?: number;
      add?: number;
    };
  }>
> {
  const { data, error } = await supabase
    .from('eye_exams')
    .select(
      `
      created_at,
      rx_right_sphere,
      rx_right_cylinder,
      rx_right_axis,
      rx_right_add,
      rx_left_sphere,
      rx_left_cylinder,
      rx_left_axis,
      rx_left_add
    `,
    )
    .eq('patient_id', patientId)
    .not('rx_right_sphere', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    date: row.created_at,
    rx_right: {
      sphere: row.rx_right_sphere,
      cylinder: row.rx_right_cylinder,
      axis: row.rx_right_axis,
      add: row.rx_right_add,
    },
    rx_left: {
      sphere: row.rx_left_sphere,
      cylinder: row.rx_left_cylinder,
      axis: row.rx_left_axis,
      add: row.rx_left_add,
    },
  }));
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get ophthalmology statistics
 */
export async function getOphthalmologyStats(
  ophthalmologistId?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{
  total_exams: number;
  exams_by_status: Record<string, number>;
  total_procedures: number;
  procedures_by_type: Record<string, number>;
  common_diagnoses: Array<{ diagnosis: string; count: number }>;
}> {
  let examsQuery = supabase
    .from('eye_exams')
    .select('exam_id, status, final_diagnosis', { count: 'exact' });
  let proceduresQuery = supabase
    .from('eye_procedures')
    .select('procedure_id, procedure_type', { count: 'exact' });

  if (ophthalmologistId) {
    examsQuery = examsQuery.eq('created_by', ophthalmologistId);
    proceduresQuery = proceduresQuery.eq('performed_by', ophthalmologistId);
  }
  if (dateFrom) {
    examsQuery = examsQuery.gte('created_at', dateFrom);
    proceduresQuery = proceduresQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    examsQuery = examsQuery.lte('created_at', dateTo);
    proceduresQuery = proceduresQuery.lte('created_at', dateTo);
  }

  const [examsResult, proceduresResult] = await Promise.all([
    examsQuery,
    proceduresQuery,
  ]);

  const exams = examsResult.data || [];
  const procedures = proceduresResult.data || [];

  // Count exams by status
  const examsByStatus: Record<string, number> = {};
  exams.forEach((e) => {
    examsByStatus[e.status] = (examsByStatus[e.status] || 0) + 1;
  });

  // Count procedures by type
  const proceduresByType: Record<string, number> = {};
  procedures.forEach((p) => {
    proceduresByType[p.procedure_type] =
      (proceduresByType[p.procedure_type] || 0) + 1;
  });

  // Count diagnoses
  const diagnosisCounts: Record<string, number> = {};
  exams.forEach((e) => {
    if (e.final_diagnosis) {
      diagnosisCounts[e.final_diagnosis] =
        (diagnosisCounts[e.final_diagnosis] || 0) + 1;
    }
  });

  const commonDiagnoses = Object.entries(diagnosisCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total_exams: examsResult.count || exams.length,
    exams_by_status: examsByStatus,
    total_procedures: proceduresResult.count || procedures.length,
    procedures_by_type: proceduresByType,
    common_diagnoses: commonDiagnoses,
  };
}
