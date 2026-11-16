/**
 * Clinical Requests API
 * =====================
 * API functions for Clinical Requests CRUD operations, approvals, scheduling, etc.
 */

import { supabase } from '../../../api/supabaseClient';
import { createBillingOrder } from '../../billing/api/billing-order.api';
import { calculateNhisServiceCoverage } from '../../billing/utils/coverage.utils';
import { requestDeduper, DedupeKeys } from '../../../lib/requestDeduplication';
import {
  ClinicalRequestDTO,
  ClinicalRequestWithDetailsDTO,
  CreateClinicalRequestDTO,
  CreateAdmissionRequestDTO,
  CreateProcedureRequestDTO,
  UpdateClinicalRequestDTO,
  UpdateStatusDTO,
  ApproveRequestDTO,
  RejectRequestDTO,
  ScheduleRequestDTO,
  CompleteRequestDTO,
  ClinicalRequestFiltersDTO,
  ClinicalRequestStatusHistoryDTO,
  ClinicalRequestStatsDTO,
  ClinicalRequestType,
  ClinicalRequestStatus,
} from '../dtos/clinical-request.dto';
import type { AdmissionType } from '../dtos/clinical-request.dto';

const CLINICAL_REQUESTS_TABLE = 'clinical_requests';
const STATUS_HISTORY_TABLE = 'clinical_request_status_history';

/** Narrow type for admission rows returned with ward/bed/patient joins. */
interface AdmissionWithJoins {
  id: string;
  patient_id: string;
  encounter_id: string;
  current_ward?: { id: string; name: string; ward_type?: string; price?: number; nhis_price?: number; is_nhis_covered?: boolean; nhis_percentage?: number };
  current_bed?: { id: string; bed_number: string };
  patient?: { id: string; insurance_type?: string };
}

/**
 * Normalize a raw admission_type string → valid AdmissionType.
 * Capitalises the first letter to satisfy the DB CHECK constraint and
 * maps deprecated 'Transfer' values to 'Elective'.
 */
function normalizeAdmissionType(raw: string): AdmissionType {
  const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (capitalized === 'Transfer') return 'Elective';
  if (capitalized === 'Emergency') return 'Emergency';
  return 'Elective';
}

// ==========================================
// READ OPERATIONS
// ==========================================

/**
 * Get all clinical requests with optional filters
 */
export async function getClinicalRequests(
  filters?: ClinicalRequestFiltersDTO,
): Promise<ClinicalRequestWithDetailsDTO[]> {
  // Get clinical requests data
  let query = supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select(
      `
      *
    `,
    )
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters) {
    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      query = query.in('status', statuses);
    }
    if (filters.request_type) {
      const types = Array.isArray(filters.request_type)
        ? filters.request_type
        : [filters.request_type];
      query = query.in('request_type', types);
    }
    if (filters.urgency) {
      const urgencies = Array.isArray(filters.urgency)
        ? filters.urgency
        : [filters.urgency];
      query = query.in('urgency', urgencies);
    }
    if (filters.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }
    if (filters.encounter_id) {
      query = query.eq('encounter_id', filters.encounter_id);
    }
    if (filters.requesting_doctor_id) {
      query = query.eq('requesting_doctor_id', filters.requesting_doctor_id);
    }
    if (filters.requesting_department_id) {
      query = query.eq(
        'requesting_department_id',
        filters.requesting_department_id,
      );
    }
    if (filters.target_department_id) {
      query = query.eq('target_department_id', filters.target_department_id);
    }
    if (filters.target_ward_id) {
      query = query.eq('target_ward_id', filters.target_ward_id);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters.scheduled_date) {
      query = query.eq('scheduled_date', filters.scheduled_date);
    }
    if (filters.specialty_module) {
      query = query.eq('specialty_module', filters.specialty_module);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ClinicalRequests API] Error fetching requests:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch related data separately to avoid FK hint issues
  const patientIds = [
    ...new Set(data.map((r) => r.patient_id).filter(Boolean)),
  ];
  const doctorIds = [
    ...new Set(data.map((r) => r.requesting_doctor_id).filter(Boolean)),
  ];
  const encounterIds = [
    ...new Set(data.map((r) => r.encounter_id).filter(Boolean)),
  ];

  // Fetch patients
  const { data: patients } =
    patientIds.length > 0
      ? await supabase
          .from('patients')
          .select(
            'id, patient_id, first_name, surname, emr_number, gender, date_of_birth, contact_phone, patient_category, insurance_type',
          )
          .in('id', patientIds)
      : { data: [] };

  // Fetch doctors (staff)
  const { data: doctors } =
    doctorIds.length > 0
      ? await supabase
          .from('staff')
          .select('id, first_name, last_name')
          .in('id', doctorIds)
      : { data: [] };

  // Fetch encounters
  const { data: encounters } =
    encounterIds.length > 0
      ? await supabase
          .from('visits')
          .select('id, visit_id')
          .in('id', encounterIds)
      : { data: [] };

  // Fetch billing status for approved requests
  // Billing is linked via billing_items.service_reference_id -> billing_orders
  const requestIds = data.map((r) => r.id);
  const { data: billingItems } =
    requestIds.length > 0
      ? await supabase
          .from('billing_items')
          .select(
            'service_reference_id, billing_order_id, billing_orders!inner(status)',
          )
          .in('service_reference_id', requestIds)
      : { data: [] };

  // Create lookup maps
  const patientMap = new Map((patients || []).map((p) => [p.id, p]));
  const doctorMap = new Map((doctors || []).map((d) => [d.id, d]));
  const encounterMap = new Map((encounters || []).map((e) => [e.id, e]));
  // Map service_reference_id to billing order status
  const billingMap = new Map(
    (billingItems || []).map((b) => [
      b.service_reference_id,
      // billing_orders can be an array or object - handle both cases
      Array.isArray(b.billing_orders)
        ? (b.billing_orders[0] as { status: string } | undefined)?.status ||
          'Pending'
        : (b.billing_orders as { status: string } | null)?.status || 'Pending',
    ]),
  );

  // Transform to flat structure with related data
  return data.map((request) => {
    const patient = patientMap.get(request.patient_id);
    const doctor = doctorMap.get(request.requesting_doctor_id);
    const encounter = encounterMap.get(request.encounter_id);
    const billingStatus = billingMap.get(request.id);

    return {
      ...request,
      // Patient info
      patient_name: patient
        ? `${patient.first_name} ${patient.surname}`
        : undefined,
      patient_public_id: patient?.patient_id, // VARCHAR patient_id for eye_exams FK
      emr_number: patient?.emr_number,
      patient_gender: patient?.gender,
      patient_dob: patient?.date_of_birth,
      patient_phone: patient?.contact_phone,
      patient_category: patient?.patient_category,
      insurance_type: patient?.insurance_type,
      // Encounter info
      encounter_number: encounter?.visit_id,
      // Requesting doctor
      requesting_doctor_name: doctor
        ? `${doctor.first_name} ${doctor.last_name}`
        : undefined,
      // Billing status
      billing_status: billingStatus || 'Pending',
    } as ClinicalRequestWithDetailsDTO;
  });
}

/**
 * Get pending requests (for Operations Dashboard)
 */
export async function getPendingRequests(
  requestType?: ClinicalRequestType | ClinicalRequestType[],
): Promise<ClinicalRequestWithDetailsDTO[]> {
  const filters: ClinicalRequestFiltersDTO = {
    status: ['Pending', 'Under_Review'],
  };
  if (requestType) {
    filters.request_type = requestType;
  }
  return getClinicalRequests(filters);
}

/**
 * Get admission requests
 */
export async function getAdmissionRequests(
  status?: ClinicalRequestStatus | ClinicalRequestStatus[],
): Promise<ClinicalRequestWithDetailsDTO[]> {
  const filters: ClinicalRequestFiltersDTO = {
    request_type: 'Admission',
  };
  if (status) {
    filters.status = status;
  }
  return getClinicalRequests(filters);
}

/**
 * Get procedure/surgery requests
 */
export async function getProcedureRequests(
  status?: ClinicalRequestStatus | ClinicalRequestStatus[],
): Promise<ClinicalRequestWithDetailsDTO[]> {
  const filters: ClinicalRequestFiltersDTO = {
    request_type: ['Procedure', 'Surgery'],
  };
  if (status) {
    filters.status = status;
  }
  return getClinicalRequests(filters);
}

/**
 * Get a single clinical request by ID
 */
export async function getClinicalRequestById(
  id: string,
): Promise<ClinicalRequestWithDetailsDTO | null> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  // Fetch related data separately
  const [patientResult, doctorResult, encounterResult] = await Promise.all([
    data.patient_id
      ? supabase
          .from('patients')
          .select(
            'id, first_name, surname, emr_number, gender, date_of_birth, contact_phone, patient_category, insurance_type',
          )
          .eq('id', data.patient_id)
          .single()
      : { data: null },
    data.requesting_doctor_id
      ? supabase
          .from('staff')
          .select('id, first_name, last_name')
          .eq('id', data.requesting_doctor_id)
          .single()
      : { data: null },
    data.encounter_id
      ? supabase
          .from('visits')
          .select('id, visit_id')
          .eq('id', data.encounter_id)
          .single()
      : { data: null },
  ]);

  const patient = patientResult.data;
  const doctor = doctorResult.data;
  const encounter = encounterResult.data;

  return {
    ...data,
    patient_name: patient
      ? `${patient.first_name} ${patient.surname}`
      : undefined,
    emr_number: patient?.emr_number,
    patient_gender: patient?.gender,
    patient_dob: patient?.date_of_birth,
    patient_phone: patient?.contact_phone,
    patient_category: patient?.patient_category,
    insurance_type: patient?.insurance_type,
    encounter_number: encounter?.visit_id,
    requesting_doctor_name: doctor
      ? `${doctor.first_name} ${doctor.last_name}`
      : undefined,
  } as ClinicalRequestWithDetailsDTO;
}

/**
 * Get clinical request by request number
 */
export async function getClinicalRequestByNumber(
  requestNumber: string,
): Promise<ClinicalRequestWithDetailsDTO | null> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select(
      `
      *,
      patient:patients (*),
      encounter:visits (*),
      requesting_doctor:staff (*)
    `,
    )
    .eq('request_number', requestNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return transformToDetailsDTO(data);
}

/**
 * Get requests for a specific patient
 */
export async function getPatientRequests(
  patientId: string,
  filters?: ClinicalRequestFiltersDTO,
): Promise<ClinicalRequestWithDetailsDTO[]> {
  return getClinicalRequests({ ...filters, patient_id: patientId });
}

/**
 * Get requests for a specific encounter
 */
export async function getEncounterRequests(
  encounterId: string,
): Promise<ClinicalRequestWithDetailsDTO[]> {
  return getClinicalRequests({ encounter_id: encounterId });
}

// ==========================================
// CREATE OPERATIONS
// ==========================================

/**
 * Create a new clinical request
 * ENFORCES: All clinical requests MUST have patient_id and encounter_id
 */
export async function createClinicalRequest(
  request: CreateClinicalRequestDTO,
): Promise<ClinicalRequestDTO> {
  // Validate encounter-centric requirements
  if (!request.patient_id) {
    throw new Error(
      'patient_id is required - all clinical requests must be tied to a patient EMR number',
    );
  }
  if (!request.encounter_id) {
    throw new Error(
      'encounter_id is required - all clinical requests must be tied to an encounter',
    );
  }

  // Normalize admission_type to match database constraint (capitalized: 'Emergency' | 'Elective')
  const normalizedRequest = { ...request };
  if (normalizedRequest.admission_type) {
    normalizedRequest.admission_type = normalizeAdmissionType(normalizedRequest.admission_type);
  }

  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .insert(normalizedRequest)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create an admission request
 */
export async function createAdmissionRequest(
  request: CreateAdmissionRequestDTO,
): Promise<ClinicalRequestDTO> {
  return createClinicalRequest({
    ...request,
    request_type: 'Admission',
  });
}

/**
 * Create a procedure/surgery request
 */
export async function createProcedureRequest(
  request: CreateProcedureRequestDTO,
): Promise<ClinicalRequestDTO> {
  return createClinicalRequest(request);
}

/**
 * Bulk create clinical requests
 * ENFORCES: All clinical requests MUST have patient_id and encounter_id
 */
export async function createBulkClinicalRequests(
  requests: CreateClinicalRequestDTO[],
): Promise<ClinicalRequestDTO[]> {
  // Validate encounter-centric requirements for all requests
  for (const request of requests) {
    if (!request.patient_id) {
      throw new Error(
        'patient_id is required for all clinical requests - all records must be tied to a patient EMR number',
      );
    }
    if (!request.encounter_id) {
      throw new Error(
        'encounter_id is required for all clinical requests - all records must be tied to an encounter',
      );
    }
  }

  // Normalize admission_type values to match database constraint (capitalized: 'Emergency' | 'Elective')
  const normalizedRequests = requests.map((request) => {
    const normalized = { ...request };
    if (normalized.admission_type) {
      normalized.admission_type = normalizeAdmissionType(normalized.admission_type);
    }
    return normalized;
  });

  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .insert(normalizedRequests)
    .select();

  if (error) throw error;
  return data;
}

// ==========================================
// UPDATE OPERATIONS
// ==========================================

/**
 * Update a clinical request
 */
export async function updateClinicalRequest(
  id: string,
  updates: UpdateClinicalRequestDTO,
): Promise<ClinicalRequestDTO> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update request status
 */
export async function updateRequestStatus(
  id: string,
  statusUpdate: UpdateStatusDTO,
): Promise<ClinicalRequestDTO> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update({
      status: statusUpdate.status,
      reviewed_by: statusUpdate.reviewed_by,
      reviewed_at: new Date().toISOString(),
      review_notes: statusUpdate.review_notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Approve a clinical request
 */
export async function approveRequest(
  id: string,
  approval: ApproveRequestDTO,
): Promise<ClinicalRequestDTO> {
  return requestDeduper.dedupe(DedupeKeys.approveProcedure(id), async () => {
    const { data, error } = await supabase
      .from(CLINICAL_REQUESTS_TABLE)
      .update({
        status: 'Approved',
        approved_by: approval.approved_by,
        approved_at: new Date().toISOString(),
        reviewed_by: approval.approved_by,
        reviewed_at: new Date().toISOString(),
        review_notes: approval.review_notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Reject a clinical request
 */
export async function rejectRequest(
  id: string,
  rejection: RejectRequestDTO,
): Promise<ClinicalRequestDTO> {
  return requestDeduper.dedupe(DedupeKeys.rejectProcedure(id), async () => {
    const { data, error } = await supabase
      .from(CLINICAL_REQUESTS_TABLE)
      .update({
        status: 'Rejected',
        reviewed_by: rejection.reviewed_by,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection.rejection_reason,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Schedule a clinical request (e.g., schedule admission, procedure)
 */
export async function scheduleRequest(
  id: string,
  schedule: ScheduleRequestDTO,
): Promise<ClinicalRequestDTO> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update({
      status: 'Scheduled',
      scheduled_date: schedule.scheduled_date,
      scheduled_time: schedule.scheduled_time,
      scheduled_by: schedule.scheduled_by,
      scheduling_notes: schedule.scheduling_notes,
      target_ward_id: schedule.target_ward_id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark request as in progress
 */
export async function startRequest(
  id: string,
  staffId: string,
): Promise<ClinicalRequestDTO> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update({
      status: 'In_Progress',
      reviewed_by: staffId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete a clinical request
 */
export async function completeRequest(
  id: string,
  completion: CompleteRequestDTO,
): Promise<ClinicalRequestDTO> {
  const updateData: Record<string, unknown> = {
    status: 'Completed',
    reviewed_by: completion.reviewed_by,
    reviewed_at: new Date().toISOString(),
    review_notes: completion.review_notes,
  };

  // Link to created entities
  if (completion.admission_id)
    updateData.admission_id = completion.admission_id;
  if (completion.procedure_id)
    updateData.procedure_id = completion.procedure_id;
  if (completion.referral_id) updateData.referral_id = completion.referral_id;
  if (completion.follow_up_visit_id)
    updateData.follow_up_visit_id = completion.follow_up_visit_id;

  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel a clinical request
 */
export async function cancelRequest(
  id: string,
  staffId: string,
  reason?: string,
): Promise<ClinicalRequestDTO> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update({
      status: 'Cancelled',
      reviewed_by: staffId,
      reviewed_at: new Date().toISOString(),
      review_notes: reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// STATUS HISTORY
// ==========================================

/**
 * Get status history for a request
 */
export async function getRequestStatusHistory(
  requestId: string,
): Promise<ClinicalRequestStatusHistoryDTO[]> {
  const { data, error } = await supabase
    .from(STATUS_HISTORY_TABLE)
    .select(
      `
      *,
      changed_by_staff:staff!changed_by (
        id,
        first_name,
        surname
      )
    `,
    )
    .eq('request_id', requestId)
    .order('changed_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((item: Record<string, unknown>) => ({
    ...item,
    changed_by_name: item.changed_by_staff
      ? `${(item.changed_by_staff as Record<string, string>).first_name} ${(item.changed_by_staff as Record<string, string>).surname}`
      : undefined,
  })) as ClinicalRequestStatusHistoryDTO[];
}

// ==========================================
// STATISTICS
// ==========================================

/**
 * Get clinical request statistics
 */
export async function getClinicalRequestStats(): Promise<
  ClinicalRequestStatsDTO[]
> {
  const { data, error } = await supabase
    .from('clinical_request_stats')
    .select('*');

  if (error) throw error;
  return data || [];
}

/**
 * Get summary counts by status
 */
export async function getRequestSummary(): Promise<
  Record<ClinicalRequestStatus, number>
> {
  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select('status');

  if (error) throw error;

  const summary: Record<string, number> = {
    Pending: 0,
    Under_Review: 0,
    Approved: 0,
    Rejected: 0,
    Scheduled: 0,
    In_Progress: 0,
    Completed: 0,
    Cancelled: 0,
  };

  (data || []).forEach((item: { status: ClinicalRequestStatus }) => {
    summary[item.status] = (summary[item.status] || 0) + 1;
  });

  return summary as Record<ClinicalRequestStatus, number>;
}

/**
 * Get today's pending requests count
 */
export async function getTodaysPendingCount(): Promise<{
  total: number;
  admissions: number;
  procedures: number;
  emergency: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select('request_type, urgency')
    .in('status', ['Pending', 'Under_Review'])
    .gte('created_at', today);

  if (error) throw error;

  const result = {
    total: data?.length || 0,
    admissions: 0,
    procedures: 0,
    emergency: 0,
  };

  (data || []).forEach(
    (item: { request_type: ClinicalRequestType; urgency: string }) => {
      if (item.request_type === 'Admission') result.admissions++;
      if (item.request_type === 'Procedure' || item.request_type === 'Surgery')
        result.procedures++;
      if (item.urgency === 'Emergency') result.emergency++;
    },
  );

  return result;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Transform database result to flat DTO
 */
function transformToDetailsDTO(
  data: Record<string, unknown>,
): ClinicalRequestWithDetailsDTO {
  const patient = data.patient as Record<string, unknown> | null;
  const encounter = data.encounter as Record<string, unknown> | null;
  const requestingDoctor = data.requesting_doctor as Record<
    string,
    unknown
  > | null;
  const requestingDept = data.requesting_department as Record<
    string,
    unknown
  > | null;
  const targetDept = data.target_department as Record<string, unknown> | null;
  const targetWard = data.target_ward as Record<string, unknown> | null;
  const targetDoctor = data.target_doctor as Record<string, unknown> | null;
  const procCatalogue = data.procedure_catalogue as Record<
    string,
    unknown
  > | null;

  return {
    ...data,
    // Patient info
    patient_name: patient
      ? `${patient.first_name} ${patient.surname}`
      : undefined,
    emr_number: patient?.emr_number as string | undefined,
    patient_gender: patient?.gender as string | undefined,
    patient_dob: patient?.date_of_birth as string | undefined,
    patient_phone: patient?.contact_phone as string | undefined,
    patient_category: patient?.patient_category as string | undefined,
    insurance_type: patient?.insurance_type as string | undefined,
    // Encounter info
    encounter_number: encounter?.visit_id as string | undefined,
    // Requesting doctor (staff table uses last_name, not surname)
    requesting_doctor_name: requestingDoctor
      ? `${requestingDoctor.first_name} ${requestingDoctor.last_name}`
      : undefined,
    requesting_department_name: requestingDept?.name as string | undefined,
    // Target info
    target_department_name: targetDept?.name as string | undefined,
    target_ward_name: targetWard?.name as string | undefined,
    target_ward_type: targetWard?.ward_type as string | undefined,
    available_beds: targetWard?.available_beds as number | undefined,
    target_doctor_name: targetDoctor
      ? `${targetDoctor.first_name} ${targetDoctor.last_name}`
      : undefined,
    // Procedure catalogue
    procedure_code: procCatalogue?.code as string | undefined,
    procedure_category: procCatalogue?.category as string | undefined,
  } as ClinicalRequestWithDetailsDTO;
}

/**
 * Check if user can approve requests (based on role/permissions)
 * This should integrate with the auth context
 */
export async function canUserApproveRequests(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return false;

  // Only certain roles can approve
  const approverRoles = [
    'admin',
    'doctor',
    'matron',
    'unit_head',
    'medical_director',
  ];
  return approverRoles.includes(data?.role?.toLowerCase() || '');
}

// ==========================================
// EXECUTION OPERATIONS
// ==========================================

/**
 * Data for executing an admission from a clinical request
 */
export interface ExecuteAdmissionData {
  request_id: string;
  patient_id: string;
  encounter_id: string;
  ward_id: string;
  bed_id: string;
  facility_id: string;
  admission_type:
    | 'emergency'
    | 'elective'
    | 'transfer'
    | 'observation'
    | 'day_case';
  admitting_diagnosis: string;
  chief_complaint?: string;
  reason_for_admission?: string;
  attending_physician_id?: string;
  acuity_level?: string;
  isolation_required?: boolean;
  isolation_type?: string;
  expected_discharge_date?: string;
  notes?: string;
  executed_by: string;
}

/**
 * Execute an admission from an approved clinical request
 * Creates admission record, updates bed status, updates patient status, marks request complete
 */
export async function executeAdmission(data: ExecuteAdmissionData): Promise<{
  admission: Record<string, unknown>;
  request: ClinicalRequestDTO;
}> {
  // 1. Generate admission number
  const admissionNumber = `ADM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  // 2. Create admission record
  const { data: admission, error: admissionError } = await supabase
    .from('admissions')
    .insert({
      admission_number: admissionNumber,
      patient_id: data.patient_id,
      encounter_id: data.encounter_id,
      facility_id: data.facility_id,
      clinical_request_id: data.request_id,
      admission_date: new Date().toISOString(),
      admission_type: data.admission_type.toLowerCase(),
      admission_source: 'outpatient',
      current_ward_id: data.ward_id,
      current_bed_id: data.bed_id,
      admitting_diagnosis: data.admitting_diagnosis,
      chief_complaint: data.chief_complaint,
      reason_for_admission: data.reason_for_admission,
      admitting_doctor_id: data.executed_by,
      attending_physician_id: data.attending_physician_id || data.executed_by,
      acuity_level: data.acuity_level || 'moderate',
      isolation_required: data.isolation_required || false,
      isolation_type: data.isolation_type,
      expected_discharge_date: data.expected_discharge_date,
      notes: data.notes,
      admission_status: 'admitted',
      created_by: data.executed_by,
    })
    .select(
      `
      *,
      current_ward:wards(id, name, ward_type, price, nhis_price, is_nhis_covered, nhis_percentage),
      current_bed:beds(id, bed_number),
      patient:patients(id, insurance_type)
    `,
    )
    .single();

  if (admissionError) throw admissionError;

  // 3. Update bed status to occupied
  const { error: bedError } = await supabase
    .from('beds')
    .update({
      status: 'Occupied',
      current_patient_id: data.patient_id,
      current_admission_id: admission.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.bed_id);

  if (bedError) throw bedError;

  // 4. Update patient status to In-Patient
  const { error: patientError } = await supabase
    .from('patients')
    .update({
      current_status: 'In-Patient',
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.patient_id);

  if (patientError) throw patientError;

  // 5. Update ward available beds count
  // Note: Ideally this would be handled by a database trigger
  const { data: wardData } = await supabase
    .from('wards')
    .select('available_beds')
    .eq('id', data.ward_id)
    .single();

  if (wardData) {
    await supabase
      .from('wards')
      .update({
        available_beds: Math.max(0, (wardData.available_beds || 0) - 1),
      })
      .eq('id', data.ward_id);
  }

  // 6. Complete the clinical request
  const { data: request, error: requestError } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update({
      status: 'Completed',
      admission_id: admission.id,
      reviewed_by: data.executed_by,
      reviewed_at: new Date().toISOString(),
      review_notes: `Admission executed. Assigned to bed in ward.`,
    })
    .eq('id', data.request_id)
    .select()
    .single();

  if (requestError) throw requestError;

  // 7. Create billing order for admission
  try {
    const admissionData = admission as unknown as AdmissionWithJoins;
    const ward = admissionData.current_ward;

    // Calculate NHIS coverage using proper utility
    const coverage = calculateNhisServiceCoverage({
      insuranceType: admissionData.patient?.insurance_type,
      serviceType: 'Admission',
      regularPrice: Number(ward?.price || 0),
      nhisPrice: ward?.nhis_price,
      isServiceNhisCovered: ward?.is_nhis_covered !== false,
      serviceNhisPercentage: ward?.nhis_percentage,
      quantity: 1,
    });

    await createBillingOrder({
      patient_id: admissionData.patient_id,
      visit_id: admissionData.encounter_id,
      encounter_id: admissionData.encounter_id,
      source_module: 'nursing',
      service_type: 'Admission',
      service_name: 'Inpatient Admission',
      service_description: `Admission from Clinical Request - ${ward?.name || 'Ward'} (Bed ${admissionData.current_bed?.bed_number || 'N/A'})`,
      unit_cost: coverage.grossAmount,
      quantity: 1,
      gross_amount: coverage.grossAmount,
      nhis_covered: coverage.isNhis && ward?.is_nhis_covered !== false,
      nhis_percentage: coverage.nhisPercentage,
      nhis_payable: coverage.nhisPayable,
      patient_payable: coverage.patientPayable,
    });
  } catch (billingError) {
    console.error(
      'Failed to create billing order for admission (request execution):',
      billingError,
    );
  }

  return { admission, request };
}

/**
 * Data for scheduling a procedure from a clinical request
 */
export interface ParticipatingStaff {
  staff_id: string;
  name: string;
  role: string;
}

export interface ScheduleProcedureData {
  request_id: string;
  patient_id: string;
  encounter_id: string;
  facility_id: string;
  scheduled_date: string;
  scheduled_time: string;
  scheduled_duration_minutes?: number;
  estimated_duration_minutes?: number;
  theatre_room?: string;
  surgeon_id?: string;
  anesthesiologist_id?: string;
  assistant_surgeons?: ParticipatingStaff[];
  pre_op_instructions?: string;
  special_equipment?: string;
  notes?: string;
  scheduled_by: string;
}

/**
 * Schedule a procedure from an approved clinical request
 * Creates procedure record, schedules in calendar, updates request status
 */
export async function scheduleProcedure(data: ScheduleProcedureData): Promise<{
  procedure?: Record<string, unknown>;
  request: ClinicalRequestDTO;
}> {
  // 1. Get the request details to get procedure catalogue info
  const { data: requestData, error: fetchError } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select('*, procedure_catalogue:procedure_catalogue(*)')
    .eq('id', data.request_id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Always create procedure record for Procedure/Surgery requests
  // This ensures procedures appear in the Procedures module after scheduling
  let procedure: Record<string, unknown> | undefined;
  if (
    requestData.request_type === 'Procedure' ||
    requestData.request_type === 'Surgery'
  ) {
    const procedureNumber = `PROC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Combine date and time into a single TIMESTAMPTZ value
    const scheduledDateTime = data.scheduled_time
      ? `${data.scheduled_date}T${data.scheduled_time}:00`
      : data.scheduled_date;

    // Get procedure name from catalogue or directly from request
    const procedureName =
      requestData.procedure_catalogue?.name ||
      requestData.procedure_name ||
      'Unknown Procedure';
    const procedureCode = requestData.procedure_catalogue?.code || null;

    // Build pre-op checklist object if pre_op_instructions provided
    const preOpChecklist = data.pre_op_instructions
      ? {
          instructions: data.pre_op_instructions,
          special_equipment: data.special_equipment || null,
          created_at: new Date().toISOString(),
        }
      : null;

    // Build assistant surgeons array for JSONB storage
    const assistantSurgeonsJson =
      data.assistant_surgeons && data.assistant_surgeons.length > 0
        ? data.assistant_surgeons.map((s) => ({
            user_id: s.staff_id,
            name: s.name,
            role: s.role,
          }))
        : [];

    const { data: procData, error: procError } = await supabase
      .from('procedures')
      .insert({
        procedure_number: procedureNumber,
        patient_id: data.patient_id,
        encounter_id: data.encounter_id,
        facility_id: data.facility_id || null,
        catalogue_id: requestData.procedure_catalogue_id || null,
        clinical_request_id: requestData.id, // Link back to clinical request
        procedure_name: procedureName,
        procedure_code: procedureCode,
        scheduled_date: scheduledDateTime,
        scheduled_duration_minutes:
          data.estimated_duration_minutes ||
          data.scheduled_duration_minutes ||
          60,
        priority: (requestData.urgency || 'routine').toLowerCase(),
        room_number: data.theatre_room || null,
        location: data.theatre_room || null, // Also set location for display
        indication:
          requestData.clinical_reason || 'Scheduled from Clinical Request',
        primary_surgeon_id: data.surgeon_id || null,
        anesthesiologist_id: data.anesthesiologist_id || null,
        assistant_surgeons: assistantSurgeonsJson,
        status: 'scheduled',
        notes: data.notes || null,
        pre_op_checklist: preOpChecklist,
        post_op_instructions: data.pre_op_instructions || null, // Store pre-op instructions here for display
        created_by: data.scheduled_by || null,
      })
      .select()
      .single();

    if (procError) {
      console.warn('Could not create procedure record:', procError);
      // Continue without procedure record - just schedule the request
    } else {
      procedure = procData;
    }
  }

  // 3. Update clinical request to Scheduled status
  const updateData: Record<string, unknown> = {
    status: 'Scheduled',
    scheduled_date: data.scheduled_date,
    scheduled_time: data.scheduled_time,
    scheduled_by: data.scheduled_by,
    scheduling_notes: data.notes,
  };

  if (procedure) {
    updateData.procedure_id = procedure.id;
  }

  const { data: request, error: requestError } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update(updateData)
    .eq('id', data.request_id)
    .select()
    .single();

  if (requestError) throw requestError;

  return { procedure, request };
}

/**
 * Check if a request can be executed (is approved or scheduled)
 */
export function canExecuteRequest(status: ClinicalRequestStatus): boolean {
  return status === 'Approved' || status === 'Scheduled';
}

// ==========================================
// DISCHARGE EXECUTION
// ==========================================

/**
 * Data for executing a discharge from an approved clinical request
 */
export interface ExecuteDischargeData {
  request_id: string;
  patient_id: string;
  admission_id: string;
  encounter_id: string;
  ward_id: string;
  bed_id: string;
  discharge_date: string;
  discharge_time: string;
  discharge_condition: string;
  discharge_disposition: string;
  primary_discharge_diagnosis: string;
  secondary_diagnoses?: string[];
  procedures_performed?: string[];
  discharge_medications?: {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
  }[];
  follow_up_instructions?: string;
  activity_restrictions?: string;
  dietary_instructions?: string;
  warning_signs?: string[];
  discharge_summary_data?: Record<string, unknown>;
  notes?: string;
  executed_by: string;
}

/**
 * Execute a discharge from an approved clinical request
 * - Updates admission record with discharge details
 * - Releases bed (sets status to 'available')
 * - Updates ward available_beds count
 * - Updates patient status to 'Out-Patient'
 * - Completes the clinical request
 */
export async function executeDischarge(data: ExecuteDischargeData): Promise<{
  admission: Record<string, unknown>;
  request: ClinicalRequestDTO;
}> {
  // 1. Update the admission record with discharge details
  const { data: admission, error: admissionError } = await supabase
    .from('admissions')
    .update({
      discharge_date: data.discharge_date,
      discharge_time: data.discharge_time,
      discharge_condition: data.discharge_condition,
      discharge_disposition: data.discharge_disposition,
      primary_discharge_diagnosis: data.primary_discharge_diagnosis,
      secondary_diagnoses: data.secondary_diagnoses,
      procedures_performed: data.procedures_performed,
      discharge_medications: data.discharge_medications,
      follow_up_instructions: data.follow_up_instructions,
      activity_restrictions: data.activity_restrictions,
      dietary_instructions: data.dietary_instructions,
      warning_signs: data.warning_signs,
      discharge_summary: data.discharge_summary_data,
      discharge_notes: data.notes,
      status: 'Discharged',
      discharged_by: data.executed_by,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.admission_id)
    .select()
    .single();

  if (admissionError) throw admissionError;

  // 2. Release the bed (set status to available)
  const { error: bedError } = await supabase
    .from('beds')
    .update({
      status: 'Available',
      current_patient_id: null,
      current_admission_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.bed_id);

  if (bedError) throw bedError;

  // 3. Update patient status to Out-Patient
  const { error: patientError } = await supabase
    .from('patients')
    .update({
      current_status: 'Out-Patient',
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.patient_id);

  if (patientError) throw patientError;

  // 4. Update ward available beds count (increment)
  const { data: wardData } = await supabase
    .from('wards')
    .select('available_beds, total_beds')
    .eq('id', data.ward_id)
    .single();

  if (wardData) {
    const newAvailable = Math.min(
      (wardData.available_beds || 0) + 1,
      wardData.total_beds || 999,
    );
    await supabase
      .from('wards')
      .update({
        available_beds: newAvailable,
      })
      .eq('id', data.ward_id);
  }

  // 5. Complete the clinical request (with admission_id link)
  const { data: request, error: requestError } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .update({
      status: 'Completed',
      admission_id: data.admission_id, // Link the admission to the request
      reviewed_by: data.executed_by,
      reviewed_at: new Date().toISOString(),
      review_notes: `Discharge completed. Condition: ${data.discharge_condition}, Disposition: ${data.discharge_disposition}`,
    })
    .eq('id', data.request_id)
    .select()
    .single();

  if (requestError) throw requestError;

  // 6. Complete the associated encounter if exists
  if (data.encounter_id) {
    await supabase
      .from('visits')
      .update({
        status: 'Completed',
        checkout_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.encounter_id);
  }

  return { admission, request };
}

// ==========================================
// BATCH APPROVAL DTOs
// ==========================================

export interface BatchApproveProcedureRequestsDTO {
  request_ids: string[];
  approved_by: string;
  review_notes?: string;
}

export interface BatchRejectProcedureRequestsDTO {
  request_ids: string[];
  reviewed_by: string;
  rejection_reason: string;
}

export interface BatchResultDTO {
  successful: string[];
  failed: { id: string; error: string }[];
}

// ==========================================
// BATCH PROCEDURE APPROVAL FUNCTIONS
// ==========================================

/**
 * Batch approve procedure requests - creates billing for all approved procedures
 *
 * OPTIMIZED: Pre-fetches all data in bulk, then processes with Promise.allSettled
 */
export async function batchApproveProcedureRequests(
  dto: BatchApproveProcedureRequestsDTO,
): Promise<BatchResultDTO> {
  const results: BatchResultDTO = { successful: [], failed: [] };

  if (dto.request_ids.length === 0) {
    return results;
  }

  // 1. Pre-fetch all requests
  const { data: requests, error: fetchError } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select('*')
    .in('id', dto.request_ids);

  if (fetchError) {
    for (const id of dto.request_ids) {
      results.failed.push({ id, error: fetchError.message });
    }
    return results;
  }

  const requestMap = new Map(requests?.map((r) => [r.id, r]) || []);

  // 2. Collect unique procedure catalogue IDs
  const catalogueIds = [
    ...new Set(
      requests?.map((r) => r.procedure_catalogue_id).filter(Boolean) || [],
    ),
  ];

  // 3. Pre-fetch all procedure catalogues
  const { data: catalogues } =
    catalogueIds.length > 0
      ? await supabase
          .from('procedure_catalogue')
          .select('*')
          .in('id', catalogueIds)
      : { data: [] };

  const catalogueMap = new Map(catalogues?.map((c) => [c.id, c]) || []);

  // 4. Collect unique patient IDs
  const patientIds = [
    ...new Set(requests?.map((r) => r.patient_id).filter(Boolean) || []),
  ];

  // 5. Pre-fetch all patients
  const { data: patients } =
    patientIds.length > 0
      ? await supabase
          .from('patients')
          .select('id, insurance_type')
          .in('id', patientIds)
      : { data: [] };

  const patientMap = new Map(patients?.map((p) => [p.id, p]) || []);

  // 6. Process each request with Promise.allSettled for isolation
  const processingPromises = dto.request_ids.map(
    async (
      requestId,
    ): Promise<{ id: string; success: boolean; error?: string }> => {
      try {
        const request = requestMap.get(requestId);
        if (!request) {
          return { id: requestId, success: false, error: 'Request not found' };
        }

        // Verify it's a procedure/surgery request
        if (
          request.request_type !== 'Procedure' &&
          request.request_type !== 'Surgery'
        ) {
          return {
            id: requestId,
            success: false,
            error: 'Request is not a procedure or surgery type',
          };
        }

        if (request.status === 'Approved' || request.status === 'Completed') {
          return {
            id: requestId,
            success: false,
            error: `Request already ${request.status}`,
          };
        }

        const catalogueData = request.procedure_catalogue_id
          ? catalogueMap.get(request.procedure_catalogue_id)
          : null;

        const patient = patientMap.get(request.patient_id);

        // Update the request to Approved
        const { error: updateError } = await supabase
          .from(CLINICAL_REQUESTS_TABLE)
          .update({
            status: 'Approved',
            approved_by: dto.approved_by,
            approved_at: new Date().toISOString(),
            reviewed_by: dto.approved_by,
            reviewed_at: new Date().toISOString(),
            review_notes: dto.review_notes,
          })
          .eq('id', requestId);

        if (updateError) {
          return { id: requestId, success: false, error: updateError.message };
        }

        // Create billing order for the procedure
        try {
          const procedureName =
            catalogueData?.name || request.procedure_name || 'Procedure';
          const regularPrice = Number(catalogueData?.base_price || 0);

          const coverage = calculateNhisServiceCoverage({
            insuranceType: patient?.insurance_type,
            serviceType: 'Procedure',
            regularPrice,
            nhisPrice: catalogueData?.nhis_price,
            isServiceNhisCovered: true,
            serviceNhisPercentage: null,
            quantity: 1,
          });

          await createBillingOrder({
            patient_id: request.patient_id,
            visit_id: request.encounter_id,
            encounter_id: request.encounter_id,
            source_module: 'procedure',
            service_type: 'Procedure',
            service_name: procedureName,
            service_description: `${request.request_type}: ${procedureName} - ${request.clinical_reason || 'Clinical request'}`,
            unit_cost: coverage.grossAmount,
            quantity: 1,
            gross_amount: coverage.grossAmount,
            nhis_covered: coverage.isNhis,
            nhis_percentage: coverage.nhisPercentage,
            nhis_payable: coverage.nhisPayable,
            patient_payable: coverage.patientPayable,
            service_reference_id: requestId,
          });
        } catch (billingError) {
          console.error(
            'Failed to create billing for procedure:',
            billingError,
          );
          // Continue - request is still approved
        }

        return { id: requestId, success: true };
      } catch (error) {
        return {
          id: requestId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  const outcomes = await Promise.allSettled(processingPromises);

  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      const { id, success, error } = outcome.value;
      if (success) {
        results.successful.push(id);
      } else {
        results.failed.push({ id, error: error || 'Unknown error' });
      }
    } else {
      results.failed.push({
        id: 'unknown',
        error: outcome.reason?.message || 'Promise rejected',
      });
    }
  }

  return results;
}

/**
 * Batch reject procedure requests - no billing created
 *
 * OPTIMIZED: Uses bulk .in() query instead of N sequential queries
 */
export async function batchRejectProcedureRequests(
  dto: BatchRejectProcedureRequestsDTO,
): Promise<BatchResultDTO> {
  const results: BatchResultDTO = { successful: [], failed: [] };

  if (dto.request_ids.length === 0) {
    return results;
  }

  // Pre-fetch all requests to validate they exist and are in valid status
  const { data: existingRequests, error: fetchError } = await supabase
    .from(CLINICAL_REQUESTS_TABLE)
    .select('id, status')
    .in('id', dto.request_ids);

  if (fetchError) {
    for (const id of dto.request_ids) {
      results.failed.push({ id, error: fetchError.message });
    }
    return results;
  }

  // Build map of existing requests
  const existingMap = new Map(
    existingRequests?.map((r) => [r.id, r.status]) || [],
  );
  const validIds: string[] = [];

  for (const id of dto.request_ids) {
    const status = existingMap.get(id);
    if (!status) {
      results.failed.push({ id, error: 'Request not found' });
    } else if (
      status === 'Rejected' ||
      status === 'Approved' ||
      status === 'Completed'
    ) {
      results.failed.push({
        id,
        error: `Cannot reject request with status: ${status}`,
      });
    } else {
      validIds.push(id);
    }
  }

  // Bulk update all valid requests
  if (validIds.length > 0) {
    const { error: updateError } = await supabase
      .from(CLINICAL_REQUESTS_TABLE)
      .update({
        status: 'Rejected',
        reviewed_by: dto.reviewed_by,
        reviewed_at: new Date().toISOString(),
        rejection_reason: dto.rejection_reason,
      })
      .in('id', validIds);

    if (updateError) {
      for (const id of validIds) {
        results.failed.push({ id, error: updateError.message });
      }
    } else {
      results.successful = validIds;
    }
  }

  return results;
}
