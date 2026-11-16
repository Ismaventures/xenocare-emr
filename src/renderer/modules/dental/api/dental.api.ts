// =============================================================================
// Dental Module API
// =============================================================================

import { supabase } from '../../../api/supabaseClient';
import { validateEncounterForModification } from '../../../lib/encounter/validation';
import { logAudit, EntityType, AuditAction } from '../../../lib/audit';
import { createBillingOrder } from '../../billing/api/billing-order.api';
import { calculateNhisServiceCoverage } from '../../billing/utils/coverage.utils';
import type {
  DentalExamDTO,
  DentalChartEntryDTO,
  DentalProcedureDTO,
  DentalPrescriptionDTO,
  CreateDentalExamDTO,
  UpdateDentalExamDTO,
  CreateDentalChartEntryDTO,
  CreateDentalProcedureDTO,
  UpdateDentalProcedureDTO,
  CreateDentalPrescriptionDTO,
} from '../types/dental.types';

// =============================================================================
// Filter Types
// =============================================================================

export interface DentalExamFilters {
  page?: number;
  limit?: number;
  patient_id?: string;
  encounter_id?: string;
  status?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface DentalProcedureFilters {
  page?: number;
  limit?: number;
  patient_id?: string;
  encounter_id?: string;
  exam_id?: string;
  status?: string;
  performed_by?: string;
  date_from?: string;
  date_to?: string;
  includeNhisPending?: boolean; // If false (default), exclude pending NHIS approvals
}

// =============================================================================
// Constants
// =============================================================================

const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership'];

// Helper to check if patient is NHIS (includes all NHIS categories + DHML which is Military NHIS HMO)
function isNhisPatient(insuranceType: string): boolean {
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

// Helper to create NHIS approval entry for specialty services
async function createNhisApprovalEntry(params: {
  serviceRequestId: string;
  serviceType:
    | 'dental_procedure'
    | 'dental_prescription'
    | 'eye_exam'
    | 'eye_prescription';
  serviceCategory: string;
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
    service_category: params.serviceCategory,
    encounter_id: params.encounterId,
    patient_id: patientInfo.id, // Use UUID for foreign key constraint
    patient_emr_number: patientInfo.emr_number,
    patient_name: patientInfo.name,
    service_name: params.serviceName,
    service_code: params.serviceCode,
    estimated_cost: params.estimatedCost,
    requested_by: params.requestedBy,
    requested_at: new Date().toISOString(),
    request_reason: `${params.serviceCategory.charAt(0).toUpperCase() + params.serviceCategory.slice(1)}: ${params.serviceName} - requires NHIS pre-authorization`,
    clinical_justification: params.clinicalFindings,
    clinical_findings: params.clinicalFindings,
    provisional_diagnosis: params.provisionalDiagnosis,
    status: 'pending',
  });

  if (error) {
    console.error('Failed to create NHIS approval entry:', error);
    // Don't throw - the specialty record is already created
    // NHIS desk can still see pending approvals by querying specialty tables directly
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

const DENTAL_EXAM_COLUMNS = '*';

const DENTAL_CHART_COLUMNS = `
  chart_id, exam_id, patient_id, encounter_id,
  tooth_number, tooth_status, condition, caries_classification, mobility_grade,
  mesial, occlusal, distal, buccal, lingual, incisal,
  periapical_status, restoration_material, restoration_date, prosthesis_type, sensitivity, notes,
  recorded_by, recorded_at, updated_at
`;

const DENTAL_PROCEDURE_COLUMNS = '*';

// =============================================================================
// Helper Functions
// =============================================================================

async function ensureEncounterActive(encounterId: string): Promise<void> {
  const validation = await validateEncounterForModification(encounterId);
  if (!validation.isValid) {
    throw new Error(
      validation.error || 'Encounter is not active for modifications',
    );
  }
}

async function ensurePaymentVerified(procedureId: string): Promise<void> {
  const { data: billingItems, error: billingError } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('service_reference_id', procedureId)
    .limit(1);

  if (billingError || !billingItems?.length) {
    throw new Error(
      'No billing record found. Please create a billing order first.',
    );
  }

  const { data: billingOrder } = await supabase
    .from('billing_orders')
    .select('status')
    .eq('id', billingItems[0].billing_order_id)
    .single();

  if (!billingOrder || !PAID_STATUSES.includes(billingOrder.status)) {
    throw new Error('Payment must be verified before proceeding');
  }
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
    .single();

  return data;
}

// Hydrate patient info
async function hydratePatients<T extends { patient_id: string; patient?: any }>(
  records: T[],
): Promise<T[]> {
  if (!records.length) return records;

  const patientIds = [
    ...new Set(records.map((r) => r.patient_id).filter(Boolean)),
  ];
  if (!patientIds.length) return records;

  const { data: patients } = await supabase
    .from('patients')
    .select(
      'patient_id, first_name, surname, date_of_birth, gender, emr_number',
    )
    .in('patient_id', patientIds);

  const patientMap = new Map(
    patients?.map((p) => [
      p.patient_id,
      {
        patient_id: p.patient_id,
        first_name: p.first_name,
        last_name: p.surname,
        date_of_birth: p.date_of_birth,
        emr_number: p.emr_number,
      },
    ]) || [],
  );

  return records.map((r) => ({
    ...r,
    patient: patientMap.get(r.patient_id),
  }));
}

// Hydrate staff/provider info
async function hydrateProvider<
  T extends { created_by?: string; provider?: any },
>(records: T[]): Promise<T[]> {
  if (!records.length) return records;

  const staffIds = [
    ...new Set(records.map((r) => r.created_by).filter(Boolean)),
  ] as string[];
  if (!staffIds.length) return records;

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id, first_name, last_name')
    .in('id', staffIds);

  const staffMap = new Map(
    staffData?.map((s) => [
      s.id,
      {
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
      },
    ]) || [],
  );

  return records.map((r) => ({
    ...r,
    provider: r.created_by ? staffMap.get(r.created_by) : undefined,
  }));
}

// =============================================================================
// Dental Exam API
// =============================================================================

export async function getDentalExams(filters: DentalExamFilters = {}): Promise<{
  data: DentalExamDTO[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    page = 1,
    limit = 10,
    patient_id,
    encounter_id,
    status,
    created_by,
    date_from,
    date_to,
    search,
  } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('dental_exams')
    .select(DENTAL_EXAM_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (patient_id) query = query.eq('patient_id', patient_id);
  if (encounter_id) query = query.eq('encounter_id', encounter_id);
  if (status) query = query.eq('status', status);
  if (created_by) query = query.eq('created_by', created_by);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

  const { data, error, count } = await query;
  if (error) throw error;

  let hydratedData = await hydratePatients(data || []);
  hydratedData = await hydrateProvider(hydratedData);

  // Client-side search filter
  if (search) {
    const searchLower = search.toLowerCase();
    hydratedData = hydratedData.filter((exam) => {
      const examWithPatient = exam as DentalExamDTO;
      return (
        examWithPatient.patient?.first_name
          ?.toLowerCase()
          .includes(searchLower) ||
        examWithPatient.patient?.last_name
          ?.toLowerCase()
          .includes(searchLower) ||
        examWithPatient.chief_complaint?.toLowerCase().includes(searchLower) ||
        examWithPatient.provisional_diagnosis
          ?.toLowerCase()
          .includes(searchLower) ||
        examWithPatient.final_diagnosis?.toLowerCase().includes(searchLower)
      );
    });
  }

  return {
    data: hydratedData as DentalExamDTO[],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getDentalExam(examId: string): Promise<DentalExamDTO> {
  const { data, error } = await supabase
    .from('dental_exams')
    .select(DENTAL_EXAM_COLUMNS)
    .eq('exam_id', examId)
    .single();

  if (error) throw error;

  let [hydrated] = await hydratePatients([data]);
  [hydrated] = await hydrateProvider([hydrated]);

  return hydrated as DentalExamDTO;
}

export async function getPatientDentalExams(
  patientId: string,
): Promise<DentalExamDTO[]> {
  const { data, error } = await supabase
    .from('dental_exams')
    .select(DENTAL_EXAM_COLUMNS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  let hydratedData = await hydratePatients(data || []);
  hydratedData = await hydrateProvider(hydratedData);

  return hydratedData as DentalExamDTO[];
}

export async function getEncounterDentalExams(
  encounterId: string,
): Promise<DentalExamDTO[]> {
  const { data, error } = await supabase
    .from('dental_exams')
    .select(DENTAL_EXAM_COLUMNS)
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  let hydratedData = await hydratePatients(data || []);
  hydratedData = await hydrateProvider(hydratedData);

  return hydratedData as DentalExamDTO[];
}

export async function createDentalExam(
  input: CreateDentalExamDTO,
): Promise<DentalExamDTO> {
  await ensureEncounterActive(input.encounter_id);

  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('dental_exams')
    .insert({
      ...input,
      status: 'Pending',
      created_by: staff?.id,
    })
    .select(DENTAL_EXAM_COLUMNS)
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
    .eq('visit_id', input.encounter_id)
    .eq('location', 'Dental');

  // Audit log
  if (staff) {
    await logAudit({
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      action: 'CREATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: data.exam_id,
      performedBy: staff.staff_id,
      newValue: data,
    });
  }

  let [hydrated] = await hydratePatients([data]);
  [hydrated] = await hydrateProvider([hydrated]);

  return hydrated as DentalExamDTO;
}

export async function updateDentalExam(
  examId: string,
  input: UpdateDentalExamDTO,
): Promise<DentalExamDTO> {
  const { data: current } = await supabase
    .from('dental_exams')
    .select('encounter_id, patient_id')
    .eq('exam_id', examId)
    .single();

  if (current?.encounter_id) {
    await ensureEncounterActive(current.encounter_id);
  }

  const { data, error } = await supabase
    .from('dental_exams')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('exam_id', examId)
    .select(DENTAL_EXAM_COLUMNS)
    .single();

  if (error) throw error;

  // Audit log
  const staff = await getCurrentStaff();
  if (staff && current) {
    await logAudit({
      encounterId: current.encounter_id,
      patientId: current.patient_id,
      action: 'UPDATE' as AuditAction,
      entityType: 'consultation' as EntityType,
      entityId: examId,
      performedBy: staff.staff_id,
      oldValue: current,
      newValue: data,
    });
  }

  let [hydrated] = await hydratePatients([data]);
  [hydrated] = await hydrateProvider([hydrated]);

  return hydrated as DentalExamDTO;
}

export async function completeDentalExam(
  examId: string,
): Promise<DentalExamDTO> {
  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('dental_exams')
    .update({
      status: 'Completed',
      finalized_at: new Date().toISOString(),
      finalized_by: staff?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('exam_id', examId)
    .select(DENTAL_EXAM_COLUMNS)
    .single();

  if (error) throw error;

  let [hydrated] = await hydratePatients([data]);
  [hydrated] = await hydrateProvider([hydrated]);

  return hydrated as DentalExamDTO;
}

// =============================================================================
// Dental Chart API
// =============================================================================

export async function getDentalChart(
  examId: string,
): Promise<DentalChartEntryDTO[]> {
  const { data, error } = await supabase
    .from('dental_chart')
    .select(DENTAL_CHART_COLUMNS)
    .eq('exam_id', examId)
    .order('tooth_number', { ascending: true });

  if (error) throw error;
  return (data || []) as DentalChartEntryDTO[];
}

export async function getPatientDentalChart(
  patientId: string,
): Promise<DentalChartEntryDTO[]> {
  const { data, error } = await supabase
    .from('dental_chart')
    .select(DENTAL_CHART_COLUMNS)
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DentalChartEntryDTO[];
}

export async function getToothHistory(
  patientId: string,
  toothNumber: number,
): Promise<DentalChartEntryDTO[]> {
  const { data, error } = await supabase
    .from('dental_chart')
    .select(DENTAL_CHART_COLUMNS)
    .eq('patient_id', patientId)
    .eq('tooth_number', toothNumber)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DentalChartEntryDTO[];
}

export async function createDentalChartEntry(
  input: CreateDentalChartEntryDTO,
): Promise<DentalChartEntryDTO> {
  const { data: exam } = await supabase
    .from('dental_exams')
    .select('encounter_id')
    .eq('exam_id', input.exam_id)
    .single();

  if (exam?.encounter_id) {
    await ensureEncounterActive(exam.encounter_id);
  }

  const staff = await getCurrentStaff();

  const { data, error } = await supabase
    .from('dental_chart')
    .insert({
      ...input,
      recorded_by: staff?.id,
    })
    .select(DENTAL_CHART_COLUMNS)
    .single();

  if (error) throw error;
  return data as DentalChartEntryDTO;
}

export async function updateDentalChartEntry(
  chartId: string,
  input: Partial<CreateDentalChartEntryDTO>,
): Promise<DentalChartEntryDTO> {
  const { data, error } = await supabase
    .from('dental_chart')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('chart_id', chartId)
    .select(DENTAL_CHART_COLUMNS)
    .single();

  if (error) throw error;
  return data as DentalChartEntryDTO;
}

export async function batchCreateDentalChart(
  examId: string,
  entries: Omit<CreateDentalChartEntryDTO, 'exam_id'>[],
): Promise<DentalChartEntryDTO[]> {
  if (!entries.length) return [];

  const { data: exam } = await supabase
    .from('dental_exams')
    .select('encounter_id, patient_id')
    .eq('exam_id', examId)
    .single();

  if (exam?.encounter_id) {
    await ensureEncounterActive(exam.encounter_id);
  }

  const staff = await getCurrentStaff();

  const insertData = entries.map((entry) => ({
    ...entry,
    exam_id: examId,
    patient_id: entry.patient_id || exam?.patient_id,
    encounter_id: entry.encounter_id || exam?.encounter_id,
    recorded_by: staff?.id,
  }));

  const { data, error } = await supabase
    .from('dental_chart')
    .insert(insertData)
    .select(DENTAL_CHART_COLUMNS);

  if (error) throw error;
  return (data || []) as DentalChartEntryDTO[];
}

// =============================================================================
// Dental Procedure API
// =============================================================================

export async function getDentalProcedures(
  filters: DentalProcedureFilters = {},
): Promise<{
  data: DentalProcedureDTO[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    page = 1,
    limit = 10,
    patient_id,
    encounter_id,
    exam_id,
    status,
    performed_by,
    date_from,
    date_to,
    includeNhisPending = false,
  } = filters;
  const offset = (page - 1) * limit;

  // Include patient join for display in the queue/list views
  const selectWithPatient = `${DENTAL_PROCEDURE_COLUMNS}, patient:patients!dental_procedures_patient_id_fkey(id, patient_id, first_name, surname, emr_number)`;

  let query = supabase
    .from('dental_procedures')
    .select(selectWithPatient, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (patient_id) query = query.eq('patient_id', patient_id);
  if (encounter_id) query = query.eq('encounter_id', encounter_id);
  if (exam_id) query = query.eq('exam_id', exam_id);
  if (status) query = query.eq('status', status);
  if (performed_by) query = query.eq('performed_by', performed_by);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);

  // Filter out pending NHIS approvals unless explicitly included
  // These should go through NHIS approval queue first
  if (!includeNhisPending) {
    query = query.neq('nhis_approval_status', 'pending');
  }

  const { data, error, count } = await query;
  if (error) throw error;

  // Transform patient array to object (Supabase returns array for FK joins)
  const transformedData = (data || []).map((item: any) => ({
    ...item,
    patient: Array.isArray(item.patient) ? item.patient[0] : item.patient,
  })) as unknown as DentalProcedureDTO[];

  return {
    data: transformedData,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getDentalProcedure(
  procedureId: string,
): Promise<DentalProcedureDTO> {
  const { data, error } = await supabase
    .from('dental_procedures')
    .select(DENTAL_PROCEDURE_COLUMNS)
    .eq('procedure_id', procedureId)
    .single();

  if (error) throw error;
  return data as DentalProcedureDTO;
}

export async function createDentalProcedure(
  input: CreateDentalProcedureDTO,
): Promise<DentalProcedureDTO> {
  await ensureEncounterActive(input.encounter_id);

  const staff = await getCurrentStaff();

  // Check if patient is NHIS - trigger will auto-set nhis_approval_status
  const insuranceType = await getPatientInsuranceType(input.encounter_id);
  const isNhis = isNhisPatient(insuranceType);

  const { data, error } = await supabase
    .from('dental_procedures')
    .insert({
      ...input,
      status: 'Pending', // Start as Pending, requires acceptance to create billing
      created_by: staff?.id,
      // nhis_approval_status is set by database trigger for NHIS patients
    })
    .select(DENTAL_PROCEDURE_COLUMNS)
    .single();

  if (error) throw error;

  // Create NHIS approval entry for NHIS patients
  if (isNhis && staff) {
    await createNhisApprovalEntry({
      serviceRequestId: data.procedure_id,
      serviceType: 'dental_procedure',
      serviceCategory: 'dental',
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      serviceName: `Dental: ${input.procedure_type}${input.tooth_numbers?.length ? ` - Teeth ${input.tooth_numbers.join(', ')}` : ''}`,
      serviceCode: input.procedure_code,
      estimatedCost: input.fee || 0,
      requestedBy: staff.id,
      clinicalFindings: (input as any).clinical_findings,
      provisionalDiagnosis: (input as any).provisional_diagnosis,
    });
  }

  // Audit log
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

  return data as DentalProcedureDTO;
}

/**
 * Accept a dental procedure request and create billing order.
 * This follows the same pattern as lab/radiology acceptance.
 */
export async function acceptDentalProcedure(
  procedureId: string,
): Promise<DentalProcedureDTO> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  // Get the procedure
  const { data: procedure, error: fetchError } = await supabase
    .from('dental_procedures')
    .select(
      `${DENTAL_PROCEDURE_COLUMNS}, patient:patients!dental_procedures_patient_id_fkey(id, patient_id)`,
    )
    .eq('procedure_id', procedureId)
    .single();

  if (fetchError) throw fetchError;
  if (!procedure) throw new Error('Dental procedure not found');
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
    .from('dental_procedures')
    .update({
      status: 'Scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('procedure_id', procedureId)
    .select(DENTAL_PROCEDURE_COLUMNS)
    .single();

  if (updateError) throw updateError;

  // Calculate pricing using proper NHIS coverage utility
  const coverage = calculateNhisServiceCoverage({
    insuranceType,
    serviceType: 'Dental',
    regularPrice: procedure.estimated_cost || 0,
    nhisPrice: null, // Dental procedures typically don't have separate NHIS prices
    isServiceNhisCovered: true,
    serviceNhisPercentage: null, // Use default based on insurance type
    quantity: 1,
  });

  // Create billing order
  const serviceName = `Dental: ${procedure.procedure_type}${procedure.tooth_numbers?.length ? ` - Teeth ${procedure.tooth_numbers.join(', ')}` : ''}`;
  await createBillingOrder({
    patient_id: patientUuid,
    encounter_id: procedure.encounter_id || undefined,
    source_module: 'dental',
    service_reference_id: procedureId,
    service_code: procedure.procedure_code || undefined,
    service_description: serviceName,
    service_name: serviceName,
    quantity: 1,
    unit_price: coverage.grossAmount,
    unit_cost: coverage.grossAmount,
    gross_amount: coverage.grossAmount,
    service_type: 'Dental',
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

  return updatedProcedure as DentalProcedureDTO;
}

/**
 * Reject a dental procedure request.
 * No billing is created for rejected procedures.
 */
export async function rejectDentalProcedure(
  procedureId: string,
  reason: string,
): Promise<DentalProcedureDTO> {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error('Not authenticated');

  if (!reason?.trim()) {
    throw new Error('Rejection reason is required');
  }

  // Get the procedure
  const { data: procedure, error: fetchError } = await supabase
    .from('dental_procedures')
    .select('procedure_id, status, encounter_id, patient_id')
    .eq('procedure_id', procedureId)
    .single();

  if (fetchError) throw fetchError;
  if (!procedure) throw new Error('Dental procedure not found');
  if (procedure.status !== 'Pending') {
    throw new Error(`Cannot reject procedure in ${procedure.status} status`);
  }

  // Update status to Cancelled with reason
  const { data: updatedProcedure, error: updateError } = await supabase
    .from('dental_procedures')
    .update({
      status: 'Cancelled',
      pre_procedure_notes: `Rejected: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq('procedure_id', procedureId)
    .select(DENTAL_PROCEDURE_COLUMNS)
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

  return updatedProcedure as DentalProcedureDTO;
}

export async function updateDentalProcedure(
  procedureId: string,
  input: UpdateDentalProcedureDTO,
): Promise<DentalProcedureDTO> {
  const { data: current } = await supabase
    .from('dental_procedures')
    .select('encounter_id')
    .eq('procedure_id', procedureId)
    .single();

  if (current?.encounter_id) {
    await ensureEncounterActive(current.encounter_id);
  }

  const { data, error } = await supabase
    .from('dental_procedures')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('procedure_id', procedureId)
    .select(DENTAL_PROCEDURE_COLUMNS)
    .single();

  if (error) throw error;
  return data as DentalProcedureDTO;
}

export async function startDentalProcedure(
  procedureId: string,
): Promise<DentalProcedureDTO> {
  await ensurePaymentVerified(procedureId);

  const staff = await getCurrentStaff();

  return updateDentalProcedure(procedureId, {
    status: 'In Progress',
    performed_by: staff?.id,
    procedure_date: new Date().toISOString(),
  } as UpdateDentalProcedureDTO);
}

export async function completeDentalProcedure(
  procedureId: string,
  notes?: string,
  complications?: string,
): Promise<DentalProcedureDTO> {
  return updateDentalProcedure(procedureId, {
    status: 'Completed',
    complications,
    post_procedure_instructions: notes,
  } as UpdateDentalProcedureDTO);
}

export async function cancelDentalProcedure(
  procedureId: string,
  reason?: string,
): Promise<DentalProcedureDTO> {
  return updateDentalProcedure(procedureId, {
    status: 'Cancelled',
    pre_procedure_notes: reason,
  } as UpdateDentalProcedureDTO);
}

// =============================================================================
// Dental Prescription API
// =============================================================================

export async function getDentalPrescriptions(
  examId: string,
  includeNhisPending: boolean = false,
): Promise<DentalPrescriptionDTO[]> {
  let query = supabase
    .from('dental_prescriptions')
    .select('*')
    .eq('exam_id', examId)
    .order('prescribed_at', { ascending: false });

  // Filter out pending NHIS approvals unless explicitly included
  if (!includeNhisPending) {
    query = query.neq('nhis_approval_status', 'pending');
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as DentalPrescriptionDTO[];
}

export async function createDentalPrescription(
  input: CreateDentalPrescriptionDTO,
): Promise<DentalPrescriptionDTO> {
  await ensureEncounterActive(input.encounter_id);

  const staff = await getCurrentStaff();

  // Check if patient is NHIS - trigger will auto-set nhis_approval_status
  const insuranceType = await getPatientInsuranceType(input.encounter_id);
  const isNhis = isNhisPatient(insuranceType);

  const { data, error } = await supabase
    .from('dental_prescriptions')
    .insert({
      ...input,
      status: 'Pending',
      prescribed_by: staff?.id,
      prescribed_at: new Date().toISOString(),
      // nhis_approval_status is set by database trigger for NHIS patients
    })
    .select('*')
    .single();

  if (error) throw error;

  // Create NHIS approval entry for NHIS patients
  if (isNhis && staff) {
    await createNhisApprovalEntry({
      serviceRequestId: data.prescription_id,
      serviceType: 'dental_prescription',
      serviceCategory: 'dental',
      encounterId: input.encounter_id,
      patientId: input.patient_id,
      serviceName: `Dental Rx: ${input.medication_name} (${input.dosage})`,
      estimatedCost: 0, // Dental prescriptions go to pharmacy for costing
      requestedBy: staff.id,
      clinicalFindings: (input as any).clinical_findings,
      provisionalDiagnosis: (input as any).provisional_diagnosis,
    });
  }

  return data as DentalPrescriptionDTO;
}

// =============================================================================
// Statistics
// =============================================================================

export async function getDentalStats(
  providerId?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{
  totalExams: number;
  completedExams: number;
  totalProcedures: number;
  completedProcedures: number;
  proceduresByCategory: Record<string, number>;
}> {
  let examQuery = supabase
    .from('dental_exams')
    .select('exam_id, status', { count: 'exact' });
  let procedureQuery = supabase
    .from('dental_procedures')
    .select('procedure_id, status, procedure_category', { count: 'exact' });

  if (providerId) {
    examQuery = examQuery.eq('created_by', providerId);
    procedureQuery = procedureQuery.eq('performed_by', providerId);
  }
  if (dateFrom) {
    examQuery = examQuery.gte('created_at', dateFrom);
    procedureQuery = procedureQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    examQuery = examQuery.lte('created_at', dateTo);
    procedureQuery = procedureQuery.lte('created_at', dateTo);
  }

  const [examResult, procedureResult] = await Promise.all([
    examQuery,
    procedureQuery,
  ]);

  const exams = examResult.data || [];
  const procedures = procedureResult.data || [];

  const proceduresByCategory: Record<string, number> = {};
  procedures.forEach((p: any) => {
    const category = p.procedure_category || 'Other';
    proceduresByCategory[category] = (proceduresByCategory[category] || 0) + 1;
  });

  return {
    totalExams: exams.length,
    completedExams: exams.filter((e: any) => e.status === 'Completed').length,
    totalProcedures: procedures.length,
    completedProcedures: procedures.filter((p: any) => p.status === 'Completed')
      .length,
    proceduresByCategory,
  };
}
