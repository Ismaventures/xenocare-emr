import { supabase } from '../../../api/supabaseClient';
import {
  LabRequestDTO,
  LabTestDTO,
  UpdateLabRequestDTO,
  LabRequestFilters,
  LabStats,
  LabRequestStatus,
  CreateLabResultDTO,
} from '../dtos/lab.dto';
import { validateEncounterForModification } from '../../../lib/encounter/validation';
import { auditCreate, auditUpdate } from '../../../lib/audit';
import { Staff } from '../../../types/database.types';
import { createBillingOrder } from '../../billing/api/billing-order.api';
import { calculateNhisServiceCoverage } from '../../billing/utils/coverage.utils';
import { requestDeduper, DedupeKeys } from '../../../lib/requestDeduplication';
import { createScopedLogger } from '../../../utils/logger';

const log = createScopedLogger('LabAPI');

const SUPPORTED_LAB_TEMPLATE_TYPES = new Set([
  'numeric_table',
  'panel_numeric',
  'culture_sensitivity',
  'parasite_report',
  'qualitative_quantitative',
  'urinalysis_checklist',
  'narrative_diagnostic',
  'numeric_timing',
  'binary_metadata',
]);

export interface LabFormTemplateRecord {
  id: string;
  test_id: string;
  template_type: string;
  template_payload: Record<string, unknown>;
  version: number;
  is_active: boolean;
  source_request_id?: string | null;
  saved_by?: string | null;
  rollback_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SaveLabFormTemplateInput {
  test_id: string;
  template_type: string;
  template_payload: Record<string, unknown>;
  source_request_id?: string;
  change_reason?: string;
}

export interface RollbackLabFormTemplateInput {
  test_id: string;
  template_id: string;
  rollback_reason?: string;
}

function isMissingLabFormTemplatesRelation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const message = String(candidate.message || '').toLowerCase();
  const details = String(candidate.details || '').toLowerCase();
  const hint = String(candidate.hint || '').toLowerCase();

  return (
    candidate.code === 'PGRST205' ||
    message.includes('lab_form_templates') ||
    details.includes('lab_form_templates') ||
    hint.includes('lab_form_templates') ||
    message.includes('could not find') ||
    message.includes('not found in the schema cache')
  );
}

function toLabTemplateApiError(error: unknown, fallbackMessage: string): Error {
  if (isMissingLabFormTemplatesRelation(error)) {
    return new Error(
      'Lab form templates are not initialized in this environment. Apply migration 232_lab_form_templates.sql, then retry.',
    );
  }

  if (error instanceof Error) return error;

  if (error && typeof error === 'object') {
    const candidate = error as { message?: string };
    if (candidate.message) return new Error(candidate.message);
  }

  return new Error(fallbackMessage);
}

// =============================================================================
// Encounter Validation Helper
// =============================================================================

async function ensureEncounterActive(encounterId: string): Promise<void> {
  const validation = await validateEncounterForModification(encounterId);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Cannot modify data on this encounter');
  }
}

// =============================================================================
// Payment Verification Helper
// =============================================================================

const PAID_STATUSES = ['Paid', 'Paid_NHIS', 'Paid_Retainership'];

/**
 * Check if payment has been verified for a lab request.
 * Looks up billing_items by service_reference_id and checks billing_order status.
 */
async function ensurePaymentVerified(requestId: string): Promise<void> {
  // Find billing item linked to this request
  const { data: billingItem, error: itemError } = await supabase
    .from('billing_items')
    .select('billing_order_id')
    .eq('service_reference_id', requestId)
    .maybeSingle();

  if (itemError) {
    log.error('Error checking billing item:', itemError);
    throw new Error('Unable to verify payment status. Please try again.');
  }

  // If no billing record exists, allow proceeding (billing not yet generated)
  if (!billingItem?.billing_order_id) {
    return;
  }

  // Check if the billing order is paid
  const { data: billingOrder, error: orderError } = await supabase
    .from('billing_orders')
    .select('status')
    .eq('id', billingItem.billing_order_id)
    .single();

  if (orderError) {
    log.error('Error checking billing order:', orderError);
    throw new Error('Unable to verify payment status. Please try again.');
  }

  // Only block if billing exists but is not paid
  if (billingOrder && !PAID_STATUSES.includes(billingOrder.status)) {
    throw new Error(
      'Payment required. Please verify payment before proceeding.',
    );
  }
}

// =============================================================================
// Relation Helpers
// =============================================================================

const STAFF_PROFILE_SELECT = `
  id,
  staff_id,
  user_id,
  email,
  first_name,
  last_name,
  role,
  staff_category,
  military_branch,
  rank,
  service_number,
  department_id,
  department,
  phone,
  is_active,
  last_login,
  created_at,
  updated_at
`;

// All FK joins removed - PostgREST schema cache doesn't detect relationships properly
// Patient, test, and staff data are hydrated separately after fetching
const LAB_REQUEST_SELECT = `*`;

const LAB_REQUEST_DETAIL_SELECT = `*`;

/**
 * Hydrate lab requests with patient data
 * Workaround for PostgREST FK relationship detection issues
 */
async function hydrateLabPatients(
  requests: LabRequestDTO[],
): Promise<LabRequestDTO[]> {
  if (!requests.length) {
    return requests;
  }

  // Get unique patient IDs
  const patientIds = Array.from(
    new Set(
      requests
        .map((req) => req.patient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!patientIds.length) {
    return requests;
  }

  // Fetch patient data
  const { data: patients, error } = await supabase
    .from('patients')
    .select(
      'patient_id, emr_number, first_name, surname, date_of_birth, gender',
    )
    .in('patient_id', patientIds);

  if (error) {
    log.error('Failed to fetch patient data:', error);
    return requests;
  }

  // Create lookup map
  const patientMap = new Map((patients || []).map((p) => [p.patient_id, p]));

  // Merge patient data into requests
  return requests.map((req) => ({
    ...req,
    patient: req.patient_id
      ? patientMap.get(req.patient_id) || req.patient
      : req.patient,
  })) as LabRequestDTO[];
}

/**
 * Hydrate lab requests with test data from lab_test_catalogue
 * This is a workaround for PostgREST FK relationship detection issues
 */
async function hydrateLabTests(
  requests: LabRequestDTO[],
): Promise<LabRequestDTO[]> {
  if (!requests.length) {
    return requests;
  }

  // Get unique test IDs
  const testIds = Array.from(
    new Set(
      requests
        .map((req) => req.test_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!testIds.length) {
    return requests;
  }

  // Fetch test data
  const { data: testData, error } = await supabase
    .from('lab_test_catalogue')
    .select(
      'id, code, name, category, category_code, specimen_type, price, nhis_price, nhis_code, is_nhis_covered, nhis_percentage, result_template_type, test_parameters',
    )
    .in('id', testIds);

  if (error) {
    log.error('Failed to fetch lab test data:', error);
    return requests;
  }

  // Create lookup map with all LabTestCatalogue properties
  const testMap = new Map(
    (testData || []).map((test) => [
      test.id,
      {
        test_id: test.id,
        test_code: test.code,
        test_name: test.name,
        category: test.category,
        description: null,
        normal_range: null,
        unit: null,
        price: test.price || 0,
        nhis_eligible: test.is_nhis_covered ?? false,
        nhis_percentage: test.nhis_percentage,
        turnaround_time: null,
        sample_type: test.specimen_type,
        is_active: true,
        category_code: test.category_code,
        result_template_type: test.result_template_type,
        test_parameters: test.test_parameters,
        created_at: new Date().toISOString(),
      } as import('../../../types/database.types').LabTestCatalogue,
    ]),
  );

  // Merge test data into requests
  return requests.map((req) => ({
    ...req,
    test: req.test_id ? testMap.get(req.test_id) || req.test : req.test,
  }));
}

/**
 * Hydrate lab requests with lab_results data (including structured_result)
 * This fetches the actual lab results from lab_results table
 */
async function hydrateLabResults(
  requests: LabRequestDTO[],
): Promise<LabRequestDTO[]> {
  if (!requests.length) {
    return requests;
  }

  // Get unique request IDs
  const requestIds = Array.from(
    new Set(
      requests
        .map((req) => req.request_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!requestIds.length) {
    return requests;
  }

  // Fetch lab_results data with all relevant fields
  const { data: labResults, error } = await supabase
    .from('lab_results')
    .select(
      `
      id,
      request_id,
      patient_id,
      test_id,
      result_value,
      unit,
      reference_range,
      is_abnormal,
      is_critical,
      technician_id,
      verified_by,
      verified_at,
      comments,
      structured_result,
      result_template_type,
      workflow_status,
      collected_at,
      reported_at,
      approved_by,
      approved_at,
      version,
      created_at,
      updated_at,
      interpretation,
      methodology
    `,
    )
    .in('request_id', requestIds);

  if (error) {
    log.error('Failed to fetch lab results:', error);
    return requests;
  }

  // Create lookup map by request_id
  const resultMap = new Map((labResults || []).map((r) => [r.request_id, r]));

  // Merge lab_result data into requests
  return requests.map((req) => {
    const labResult = req.request_id
      ? resultMap.get(req.request_id)
      : undefined;
    return {
      ...req,
      lab_result: labResult
        ? {
            ...labResult,
            // Map to DTO structure
            result: labResult.result_value,
            result_unit: labResult.unit,
            remarks: labResult.comments,
          }
        : req.lab_result,
    };
  }) as LabRequestDTO[];
}

async function hydrateLabRequestStaff(
  requests: LabRequestDTO[],
): Promise<LabRequestDTO[]> {
  if (!requests.length) {
    return requests;
  }

  const staffIdentifiers = Array.from(
    new Set(
      requests.flatMap((request) =>
        [request.ordered_by, request.processed_by].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  );

  if (staffIdentifiers.length === 0) {
    return requests;
  }

  const { data: staffRows, error } = await supabase
    .from('staff')
    .select(STAFF_PROFILE_SELECT)
    .in('staff_id', staffIdentifiers);

  if (error) throw error;

  const staffMap = new Map<string, Staff>();
  for (const row of staffRows || []) {
    const profile = row as Staff;
    if (profile.staff_id) {
      staffMap.set(profile.staff_id, profile);
    }
    if (profile.id) {
      staffMap.set(profile.id, profile);
    }
  }

  return requests.map((request) => {
    const doctorProfile = request.ordered_by
      ? staffMap.get(request.ordered_by)
      : undefined;
    const technicianProfile = request.processed_by
      ? staffMap.get(request.processed_by)
      : undefined;

    return {
      ...request,
      doctor: doctorProfile ?? request.doctor,
      technician: technicianProfile ?? request.technician,
    };
  });
}


/**
 * Attach visit/clinic context used by the printable laboratory report.
 */
async function hydrateLabEncounter(
  requests: LabRequestDTO[],
): Promise<LabRequestDTO[]> {
  if (!requests.length) return requests;

  const encounterIds = Array.from(
    new Set(
      requests
        .map((request) => request.encounter_id || request.visit_id)
        .filter(
          (id): id is string =>
            typeof id === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              id,
            ),
        ),
    ),
  );

  if (!encounterIds.length) return requests;

  const { data: visits, error } = await supabase
    .from('visits')
    .select('id, visit_id, encounter_number, created_at, status, clinic_id')
    .in('id', encounterIds);

  if (error) {
    log.warn('Could not hydrate lab encounter context', {
      error: error.message,
    });
    return requests;
  }

  const clinicIds = Array.from(
    new Set((visits || []).map((visit) => visit.clinic_id).filter(Boolean)),
  );
  const { data: clinics } = clinicIds.length
    ? await supabase
        .from('clinics')
        .select('id, clinic_name')
        .in('id', clinicIds)
    : { data: [] as Array<{ id: string; clinic_name: string }> };

  const clinicMap = new Map(
    (clinics || []).map((clinic) => [clinic.id, clinic]),
  );
  const visitMap = new Map((visits || []).map((visit) => [visit.id, visit]));

  return requests.map((request) => {
    const encounterId = request.encounter_id || request.visit_id;
    const visit = encounterId ? visitMap.get(encounterId) : undefined;
    if (!visit) return request;
    const clinic = visit.clinic_id ? clinicMap.get(visit.clinic_id) : undefined;
    return {
      ...request,
      encounter: {
        id: visit.id,
        visit_id: visit.visit_id || '',
        encounter_number: visit.encounter_number || null,
        encounter_date: visit.created_at || null,
        status: visit.status || '',
        clinic_id: visit.clinic_id || null,
        clinic_name: clinic?.clinic_name || null,
      },
    };
  }) as LabRequestDTO[];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get lab requests with filters
 */
export async function getLabRequests(filters: LabRequestFilters = {}) {
  const {
    page = 1,
    limit = 10,
    status,
    patient_id,
    test_id,
    doctor_id,
    date_from,
    date_to,
    search,
    category,
    includeNhisPending = false, // Default: hide pending NHIS requests from Lab queue
  } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('lab_requests')
    .select(LAB_REQUEST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter out pending NHIS requests unless explicitly included
  // These requests should only be visible in the NHIS Specialty Approval queue
  if (!includeNhisPending) {
    query = query.neq('nhis_approval_status', 'pending');
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (patient_id) {
    query = query.eq('patient_id', patient_id);
  }

  if (test_id) {
    query = query.eq('test_id', test_id);
  }

  if (doctor_id) {
    query = query.eq('ordered_by', doctor_id);
  }

  if (date_from) {
    query = query.gte('request_date', date_from);
  }

  if (date_to) {
    query = query.lte('request_date', date_to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Hydrate patient, test, staff, and lab results data
  let enrichedData = await hydrateLabPatients((data as LabRequestDTO[]) || []);
  enrichedData = await hydrateLabTests(enrichedData);
  enrichedData = await hydrateLabRequestStaff(enrichedData);
  enrichedData = await hydrateLabEncounter(enrichedData);
  enrichedData = await hydrateLabResults(enrichedData); // Fetch lab_results with structured_result

  // Filter by category if specified (need to do client-side since it's hydrated)
  if (category) {
    enrichedData = enrichedData.filter(
      (req) => req.test?.category === category,
    );
  }

  return {
    data: enrichedData,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get a single lab request
 */
export async function getLabRequest(requestId: string): Promise<LabRequestDTO> {
  const { data, error } = await supabase
    .from('lab_requests')
    .select(LAB_REQUEST_DETAIL_SELECT)
    .eq('request_id', requestId)
    .single();

  if (error) throw error;

  // Hydrate patient, test, staff, and lab results data
  let [hydrated] = await hydrateLabPatients([data as LabRequestDTO]);
  [hydrated] = await hydrateLabTests([hydrated]);
  [hydrated] = await hydrateLabRequestStaff([hydrated]);
  [hydrated] = await hydrateLabEncounter([hydrated]);
  [hydrated] = await hydrateLabResults([hydrated]); // Include lab_results with structured_result
  return hydrated;
}

/**
 * Fetch every laboratory request that belongs to the same submission/report.
 * New requests carry lab_request_group_id. Historical rows fall back to the
 * encounter so their reports remain accessible.
 */
export async function getLabReportRequests(
  request: LabRequestDTO,
): Promise<LabRequestDTO[]> {
  let query = supabase.from('lab_requests').select(LAB_REQUEST_SELECT);

  if (request.lab_request_group_id) {
    query = query.eq('lab_request_group_id', request.lab_request_group_id);
  } else if (request.encounter_id) {
    query = query.eq('encounter_id', request.encounter_id);
  } else {
    query = query.eq('request_id', request.request_id);
  }

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;

  let hydrated = await hydrateLabPatients((data as LabRequestDTO[]) || []);
  hydrated = await hydrateLabTests(hydrated);
  hydrated = await hydrateLabRequestStaff(hydrated);
  hydrated = await hydrateLabEncounter(hydrated);
  hydrated = await hydrateLabResults(hydrated);
  return hydrated;
}

/**
 * Update lab request (collect sample, enter results, etc.)
 * Validates encounter is active before modification.
 */
export async function updateLabRequest(
  data: UpdateLabRequestDTO,
): Promise<LabRequestDTO> {
  const { request_id, ...updateData } = data;

  // Get current request to validate encounter
  const { data: currentRequest } = await supabase
    .from('lab_requests')
    .select('visit_id, encounter_id, patient_id')
    .eq('request_id', request_id)
    .single();

  // Validate encounter is active (use encounter_id or fall back to visit_id)
  const encounterId = currentRequest?.encounter_id || currentRequest?.visit_id;
  if (encounterId) {
    await ensureEncounterActive(encounterId);
  }

  // Get current user as technician if processing
  let performedBy: string | null = null;
  if (
    updateData.status === 'In Progress' ||
    updateData.status === 'Completed'
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('email', user.email)
        .single();

      if (staffData) {
        // Use id (UUID) for FK, not staff_id (VARCHAR)
        (updateData as any).processed_by = staffData.id;
        performedBy = staffData.staff_id;
      }
    }
  }

  // Set result date if completing
  if (updateData.status === 'Completed' && !updateData.result_date) {
    updateData.result_date = new Date().toISOString();
  }

  // Set sample collected time
  if (
    updateData.status === 'Sample Collected' &&
    !updateData.sample_collected_at
  ) {
    updateData.sample_collected_at = new Date().toISOString();
  }

  const { data: request, error } = await supabase
    .from('lab_requests')
    .update(updateData)
    .eq('request_id', request_id)
    .select(LAB_REQUEST_SELECT)
    .single();

  if (error) throw error;

  // Hydrate patient, test, and staff data
  let [hydrated] = await hydrateLabPatients([request as LabRequestDTO]);
  [hydrated] = await hydrateLabTests([hydrated]);
  [hydrated] = await hydrateLabRequestStaff([hydrated]);
  return hydrated;
}

/**
 * Collect sample for a lab request
 * Payment must be verified before sample collection.
 */
export async function collectSample(requestId: string): Promise<LabRequestDTO> {
  // Verify payment before proceeding
  await ensurePaymentVerified(requestId);

  return updateLabRequest({
    request_id: requestId,
    status: 'Sample Collected',
    sample_collected_at: new Date().toISOString(),
  });
}

/**
 * Start processing a lab request
 * Payment must be verified before processing.
 */
export async function startProcessing(
  requestId: string,
): Promise<LabRequestDTO> {
  // Verify payment before proceeding
  await ensurePaymentVerified(requestId);

  return updateLabRequest({
    request_id: requestId,
    status: 'In Progress',
  });
}

/**
 * Enter lab result
 */
export async function enterResult(
  data: CreateLabResultDTO,
): Promise<LabRequestDTO> {
  return updateLabRequest({
    request_id: data.lab_request_id,
    status: 'Completed',
    result: data.result,
    result_value: data.result_value,
    result_unit: data.result_unit,
    result_status: data.result_status,
    reference_range: data.reference_range,
    interpretation: data.interpretation,
    methodology: data.methodology,
    result_notes: data.remarks,
    result_date: new Date().toISOString(),
  });
}

// =============================================================================
// Enhanced Lab Results with Structured Data (New Template System)
// =============================================================================

export interface EnhancedLabResultInput {
  lab_request_id: string;
  result: string;
  result_value?: number;
  result_unit?: string;
  result_status?: string;
  reference_range?: string;
  remarks?: string;
  interpretation?: string;
  methodology?: string;
  // Enhanced fields
  structured_result?: Record<string, unknown>;
  result_template_type?: string;
  workflow_status?:
    | 'pending'
    | 'verified'
    | 'approved'
    | 'released'
    | 'amended';
  is_critical?: boolean;
  collected_at?: string;
  specimen_type?: string;
  specimen_identifier?: string;
}

/**
 * Enter enhanced lab result with structured data support
 *
 * This function:
 * 1. Creates/updates lab_results record with structured_result JSONB
 * 2. Creates audit trail entry in lab_result_history
 * 3. Creates critical notification if is_critical = true
 * 4. Updates the lab_request status
 */
export async function enterEnhancedResult(
  data: EnhancedLabResultInput,
): Promise<LabRequestDTO> {
  const {
    lab_request_id,
    result,
    result_value,
    result_unit,
    result_status,
    reference_range,
    remarks,
    interpretation,
    methodology,
    structured_result,
    result_template_type,
    workflow_status = 'pending',
    is_critical = false,
    collected_at,
    specimen_type,
    specimen_identifier,
  } = data;

  // Payment is verified by the laboratory workflow before this action.
  // Do not re-check every sibling request in a grouped report here.

  // Get current user for audit
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let performedById: string | null = null;

  if (user) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('email', user.email)
      .single();
    performedById = staffData?.id || null;
  }

  // Get lab_request details to link patient_id and test_id
  const { data: labRequestData } = await supabase
    .from('lab_requests')
    .select('patient_id, test_id, encounter_id, visit_id')
    .eq('request_id', lab_request_id)
    .single();

  // IMPORTANT: lab_requests.patient_id references patients(patient_id) varchar field
  // But lab_results.patient_id FK references patients(id) - the internal UUID
  // We need to look up the actual patients.id from patients.patient_id
  let actualPatientId: string | null = null;
  if (labRequestData?.patient_id) {
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('patient_id', labRequestData.patient_id)
      .single();
    actualPatientId = patientData?.id || null;
  }

  // Check if a result already exists for this request (using request_id per schema)
  const { data: existingResult } = await supabase
    .from('lab_results')
    .select('id, version, critical_notified_at')
    .eq('request_id', lab_request_id)
    .maybeSingle();

  const currentVersion = existingResult?.version || 0;
  const newVersion = currentVersion + 1;
  const requiresCriticalEscalation =
    is_critical &&
    ['approved', 'released'].includes(workflow_status.toLowerCase());
  const validatedAt = ['verified', 'approved', 'released'].includes(
    workflow_status.toLowerCase(),
  )
    ? new Date().toISOString()
    : null;
  const criticalNotifiedAt = is_critical
    ? existingResult?.critical_notified_at ||
      (requiresCriticalEscalation ? new Date().toISOString() : null)
    : null;

  // Prepare result data matching lab_results schema
  const resultData = {
    request_id: lab_request_id, // FK to lab_requests(request_id)
    patient_id: actualPatientId, // FK to patients(id) - the internal UUID, not patient_id varchar
    test_id: labRequestData?.test_id || null, // FK to lab_test_catalogue(id)
    result_value: result || (result_value ? String(result_value) : null), // text field per schema
    unit: result_unit || null, // varchar(50)
    reference_range: reference_range || null, // varchar(100)
    is_abnormal: result_status === 'Abnormal' || result_status === 'Critical',
    is_critical,
    technician_id: performedById, // FK to staff(id) - who entered the result
    comments: remarks || null, // text field for technician observations
    structured_result: structured_result || null, // jsonb for template data
    result_template_type: result_template_type || null, // varchar(50)
    workflow_status: workflow_status || 'Pending', // varchar(50)
    verified_by: validatedAt ? performedById : null,
    verified_at: validatedAt,
    collected_at: collected_at || null, // timestamp
    sample_collected_at: collected_at || null,
    sample_type: specimen_type || null,
    reported_at: new Date().toISOString(), // timestamp
    critical_notified_at: criticalNotifiedAt,
    last_modified_by: performedById, // FK to staff(id) - audit trail
    interpretation: interpretation || null, // text field for clinical interpretation
    methodology: methodology || null, // varchar(255) for test method used
  };

  const getMissingColumn = (error: unknown): string | null => {
    if (!error || typeof error !== 'object') return null;
    const candidate = error as {
      code?: string;
      message?: string;
      details?: string;
    };
    if (
      candidate.code !== 'PGRST204' &&
      candidate.code !== '42703' &&
      !String(candidate.message || '').toLowerCase().includes('column') &&
      !String(candidate.details || '').toLowerCase().includes('column')
    ) {
      return null;
    }
    const text = `${candidate.message || ''} ${candidate.details || ''}`;
    return (
      text.match(/Could not find the '([^']+)' column/i)?.[1] ||
      text.match(/column "([^"]+)"/i)?.[1] ||
      text.match(/column '([^']+)'/i)?.[1] ||
      null
    );
  };

  const runWithOptionalColumnFallback = async <T>(
    operation: (payload: Record<string, unknown>) => Promise<T>,
  ): Promise<T> => {
    const payload: Record<string, unknown> = { ...resultData };
    const protectedColumns = new Set([
      'request_id',
      'patient_id',
      'test_id',
      'result_value',
      'unit',
      'reference_range',
      'is_abnormal',
      'is_critical',
      'technician_id',
      'comments',
    ]);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        return await operation(payload);
      } catch (error) {
        const missingColumn = getMissingColumn(error);
        if (
          !missingColumn ||
          protectedColumns.has(missingColumn) ||
          !(missingColumn in payload)
        ) {
          throw error;
        }
        log.warn('[LabResults] Removing unsupported result column and retrying', {
          column: missingColumn,
        });
        delete payload[missingColumn];
      }
    }

    throw new Error('Unable to save laboratory result after schema fallback.');
  };

  let resultId: string;

  if (existingResult?.id) {
    // Update existing result
    const updatedResult = await runWithOptionalColumnFallback(
      async (payload) => {
        const { data, error } = await supabase
          .from('lab_results')
          .update(payload)
          .eq('id', existingResult.id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      },
    );
    resultId = updatedResult.id;

    // Create history entry for amendment
    try {
      await supabase.from('lab_result_history').insert({
        lab_result_id: resultId,
        version: newVersion,
        result: resultData.result_value || null,
        result_value: resultData.result_value
          ? parseFloat(resultData.result_value) || null
          : null,
        structured_result: resultData.structured_result || null,
        result_status: resultData.workflow_status || null,
        modified_by: performedById,
        modification_type: newVersion > 1 ? 'Amendment' : 'Initial Entry',
        modification_reason:
          newVersion > 1 ? 'Result amended' : 'Initial result entry',
      });
    } catch (historyError) {
      // Log but don't fail - history table might not exist yet
      log.warn('Could not create result history entry:', historyError);
    }
  } else {
    // Insert new result
    const newResult = await runWithOptionalColumnFallback(async (payload) => {
      const { data, error } = await supabase
        .from('lab_results')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    });
    resultId = newResult.id;

    // Create initial history entry
    try {
      await supabase.from('lab_result_history').insert({
        lab_result_id: resultId,
        version: 1,
        result: resultData.result_value || null,
        result_value: resultData.result_value
          ? parseFloat(resultData.result_value) || null
          : null,
        structured_result: resultData.structured_result || null,
        result_status: resultData.workflow_status || null,
        modified_by: performedById,
        modification_type: 'Initial Entry',
        modification_reason: 'Initial result entry',
      });
    } catch (historyError) {
      log.warn('Could not create result history entry:', historyError);
    }
  }

  // The lab_results trigger normally synchronizes request status. Mirror the
  // convenience fields directly as a best-effort step, but never discard a
  // successfully saved result because the parent request could not be touched.
  const requestStatus =
    workflow_status === 'released' ? 'Completed' : 'Result_Ready';
  const { error: requestSyncError } = await supabase
    .from('lab_requests')
    .update({
      status: requestStatus,
      result,
      result_value,
      result_unit,
      result_status,
      reference_range,
      interpretation,
      methodology,
      result_notes: remarks,
      result_date: new Date().toISOString(),
      processed_by: performedById,
    })
    .eq('request_id', lab_request_id);

  if (requestSyncError) {
    log.warn('Lab result saved but request sync failed', {
      requestId: lab_request_id,
      error: requestSyncError.message,
    });
  }

  return getLabRequest(lab_request_id);
}

/**
 * Get result history for a lab result
 */
export async function getResultHistory(labResultId: string) {
  const { data, error } = await supabase
    .from('lab_result_history')
    .select(
      `
      id,
      lab_result_id,
      version,
      result,
      result_value,
      structured_result,
      result_status,
      modified_by,
      modification_type,
      modification_reason,
      created_at,
      modified_by_staff:staff!lab_result_history_modified_by_fkey(
        id, first_name, last_name, staff_id
      )
    `,
    )
    .eq('lab_result_id', labResultId)
    .order('version', { ascending: false });

  if (error) {
    log.warn('Could not fetch result history:', error);
    return [];
  }

  return data || [];
}

// =============================================================================
// Comprehensive Lab Results (Using Optimized Views)
// =============================================================================

export interface LabResultComplete {
  result_id: string;
  request_id: string;
  patient_id: string | null;
  test_id: string | null;
  test_name: string | null;
  test_category: string | null;
  category_code: string | null;
  template_type: string | null;
  required_sample_type: string | null;
  result_value: string | null;
  unit: string | null;
  reference_range: string | null;
  structured_result: Record<string, unknown> | null;
  result_template_type: string | null;
  is_abnormal: boolean | null;
  is_critical: boolean | null;
  comments: string | null;
  workflow_status: string | null;
  collected_at: string | null;
  reported_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  technician_id: string | null;
  last_modified_by: string | null;
  created_at: string;
  updated_at: string | null;
  version: number | null;
  request_status: string | null;
  priority: string | null;
  clinical_notes: string | null;
  ordered_by: string | null;
  requested_at: string | null;
  emr_number: string | null;
  patient_first_name: string | null;
  patient_surname: string | null;
  patient_dob: string | null;
  patient_gender: string | null;
}

/**
 * Get comprehensive lab results using the optimized view
 * This returns complete result data with joined patient and test info
 */
export async function getLabResultsComplete(
  filters: {
    patientId?: string;
    testCategory?: string;
    workflowStatus?: string;
    isCritical?: boolean;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ data: LabResultComplete[]; total: number }> {
  const {
    patientId,
    testCategory,
    workflowStatus,
    isCritical,
    fromDate,
    toDate,
    limit = 50,
    offset = 0,
  } = filters;

  let query = supabase
    .from('v_lab_results_complete')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  if (testCategory) {
    query = query.eq('test_category', testCategory);
  }

  if (workflowStatus) {
    query = query.eq('workflow_status', workflowStatus);
  }

  if (isCritical !== undefined) {
    query = query.eq('is_critical', isCritical);
  }

  if (fromDate) {
    query = query.gte('created_at', fromDate);
  }

  if (toDate) {
    query = query.lte('created_at', toDate);
  }

  const { data, error, count } = await query;

  if (error) {
    log.error('Error fetching comprehensive lab results:', error);
    throw error;
  }

  return {
    data: (data || []) as LabResultComplete[],
    total: count || 0,
  };
}

export interface LabWorkflowSummary {
  request_id: string;
  status: string | null;
  priority: string | null;
  requested_at: string | null;
  patient_id: string | null;
  test_name: string | null;
  test_category: string | null;
  result_template_type: string | null;
  workflow_stage: string;
  result_id: string | null;
  result_workflow_status: string | null;
  is_critical: boolean | null;
  is_abnormal: boolean | null;
  accepted_at: string | null;
  sample_collected_at: string | null;
  result_collected_at: string | null;
  reported_at: string | null;
  verified_at: string | null;
  approved_at: string | null;
  acceptance_to_collection_mins: number | null;
  collection_to_result_mins: number | null;
  total_turnaround_mins: number | null;
}

/**
 * Get lab workflow summary for dashboard/monitoring
 * Uses the optimized v_lab_workflow_summary view
 */
export async function getLabWorkflowSummary(
  filters: {
    workflowStage?:
      | 'Pending'
      | 'Accepted'
      | 'Sample Collected'
      | 'Result Entered';
    testCategory?: string;
    isCritical?: boolean;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  } = {},
): Promise<LabWorkflowSummary[]> {
  const {
    workflowStage,
    testCategory,
    isCritical,
    fromDate,
    toDate,
    limit = 100,
  } = filters;

  let query = supabase
    .from('v_lab_workflow_summary')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(limit);

  if (workflowStage) {
    query = query.eq('workflow_stage', workflowStage);
  }

  if (testCategory) {
    query = query.eq('test_category', testCategory);
  }

  if (isCritical !== undefined) {
    query = query.eq('is_critical', isCritical);
  }

  if (fromDate) {
    query = query.gte('requested_at', fromDate);
  }

  if (toDate) {
    query = query.lte('requested_at', toDate);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching lab workflow summary:', error);
    throw error;
  }

  return (data || []) as LabWorkflowSummary[];
}

/**
 * Update workflow status for a lab result
 */
export async function updateResultWorkflowStatus(
  labResultId: string,
  status: 'pending' | 'verified' | 'approved' | 'released',
  approvedBy?: string,
) {
  const updateData: Record<string, unknown> = {
    workflow_status: status,
  };

  if (status === 'approved' && approvedBy) {
    updateData.approved_by = approvedBy;
    updateData.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('lab_results')
    .update(updateData)
    .eq('id', labResultId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get lab statistics
 */
export async function getLabStats(): Promise<LabStats> {
  const today = new Date().toISOString().split('T')[0];

  // Pending
  const { count: pending } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pending');

  // Sample collected
  const { count: sampleCollected } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Sample Collected');

  // In progress
  const { count: inProgress } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'In Progress');

  // Completed today
  const { count: completedToday } = await supabase
    .from('lab_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Completed')
    .gte('result_date', today);

  return {
    pending: pending || 0,
    accepted: 0, // Would need additional query
    awaiting_payment: 0, // Would need additional query
    sample_collected: sampleCollected || 0,
    processing: inProgress || 0,
    result_ready: 0, // Would need additional query
    completed_today: completedToday || 0,
    rejected_today: 0, // Would need additional query
    average_turnaround: '2.5 hrs', // Would calculate from actual data
  };
}

/**
 * Get the active form template for a specific lab test.
 */
export async function getActiveLabFormTemplate(
  testId: string,
): Promise<LabFormTemplateRecord | null> {
  if (!testId) return null;

  const { data, error } = await supabase
    .from('lab_form_templates')
    .select('*')
    .eq('test_id', testId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isMissingLabFormTemplatesRelation(error)) {
      log.warn('Could not load lab form template:', error);
    }
    return null;
  }

  return (data as LabFormTemplateRecord | null) || null;
}

/**
 * List template history for a specific lab test.
 */
export async function getLabFormTemplateHistory(
  testId: string,
): Promise<LabFormTemplateRecord[]> {
  if (!testId) return [];

  const { data, error } = await supabase
    .from('lab_form_templates')
    .select('*')
    .eq('test_id', testId)
    .order('version', { ascending: false });

  if (error) {
    if (!isMissingLabFormTemplatesRelation(error)) {
      log.warn('Could not load lab template history:', error);
    }
    return [];
  }

  return (data as LabFormTemplateRecord[]) || [];
}

/**
 * Save a new active template version for a specific lab test.
 */
export async function saveLabFormTemplate(
  input: SaveLabFormTemplateInput,
): Promise<LabFormTemplateRecord> {
  const {
    test_id,
    template_type,
    template_payload,
    source_request_id,
    change_reason,
  } = input;

  if (!test_id) {
    throw new Error('Test ID is required to save template');
  }

  if (!template_payload || Object.keys(template_payload).length === 0) {
    throw new Error('Template payload is empty');
  }

  if (!SUPPORTED_LAB_TEMPLATE_TYPES.has(template_type)) {
    throw new Error(`Unsupported template type: ${template_type}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  const savedBy = staffData?.id || null;

  const { data: lastTemplate, error: lastTemplateError } = await supabase
    .from('lab_form_templates')
    .select('version')
    .eq('test_id', test_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastTemplateError) {
    throw toLabTemplateApiError(
      lastTemplateError,
      'Failed to determine next lab form template version.',
    );
  }

  const nextVersion = (lastTemplate?.version || 0) + 1;

  const { error: deactivateError } = await supabase
    .from('lab_form_templates')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('test_id', test_id)
    .eq('is_active', true);

  if (deactivateError) {
    throw toLabTemplateApiError(
      deactivateError,
      'Failed to deactivate previous template version.',
    );
  }

  const { data, error } = await supabase
    .from('lab_form_templates')
    .insert({
      test_id,
      template_type,
      template_payload,
      version: nextVersion,
      is_active: true,
      source_request_id: source_request_id || null,
      saved_by: savedBy,
      rollback_reason: change_reason || null,
    })
    .select('*')
    .single();

  if (error) {
    throw toLabTemplateApiError(error, 'Failed to save lab form template.');
  }

  // Best-effort: keep catalogue timestamp/user in sync for audit traces.
  try {
    await supabase
      .from('lab_test_catalogue')
      .update({
        updated_at: new Date().toISOString(),
        updated_by: savedBy,
      })
      .eq('id', test_id);
  } catch (catalogueError) {
    log.warn(
      'Could not update lab_test_catalogue audit fields:',
      catalogueError,
    );
  }

  return data as LabFormTemplateRecord;
}

/**
 * Roll back active template to a previous version.
 */
export async function rollbackLabFormTemplate(
  input: RollbackLabFormTemplateInput,
): Promise<LabFormTemplateRecord> {
  const { test_id, template_id, rollback_reason } = input;

  if (!test_id || !template_id) {
    throw new Error('Test ID and template ID are required for rollback');
  }

  const { error: deactivateError } = await supabase
    .from('lab_form_templates')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('test_id', test_id)
    .eq('is_active', true);

  if (deactivateError) {
    throw toLabTemplateApiError(
      deactivateError,
      'Failed to deactivate current template during rollback.',
    );
  }

  const { data, error } = await supabase
    .from('lab_form_templates')
    .update({
      is_active: true,
      rollback_reason: rollback_reason || 'Manual rollback',
      updated_at: new Date().toISOString(),
    })
    .eq('id', template_id)
    .eq('test_id', test_id)
    .select('*')
    .single();

  if (error) {
    throw toLabTemplateApiError(
      error,
      'Failed to roll back lab form template.',
    );
  }

  return data as LabFormTemplateRecord;
}

/**
 * Get lab test catalogue
 */
export async function getLabTestCatalogue(
  category?: string,
): Promise<LabTestDTO[]> {
  let query = supabase
    .from('lab_test_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Map database columns to LabTestDTO interface
  return (data || []).map((item) => ({
    test_id: item.id,
    test_code: item.code,
    test_name: item.name,
    category: item.category,
    description: item.description,
    normal_range: null,
    unit: null,
    price: item.price ?? 0,
    nhis_eligible: item.is_nhis_covered ?? false,
    nhis_percentage: item.nhis_percentage,
    turnaround_time: item.tat_minutes ? `${item.tat_minutes} mins` : null,
    sample_type: item.specimen_type,
    is_active: item.is_active ?? true,
    created_at: item.created_at,
    updated_at: item.updated_at,
    // Alias fields
    lab_test_id: item.id,
    cost: item.price ?? 0,
    nhis_covered: item.is_nhis_covered ?? false,
  })) as LabTestDTO[];
}

/**
 * Get patient's lab history
 */
export async function getPatientLabHistory(
  patientId: string,
  limit: number = 10,
) {
  const { data, error } = await supabase
    .from('lab_requests')
    .select(LAB_REQUEST_SELECT)
    .eq('patient_id', patientId)
    .order('request_date', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Hydrate patient, test, and staff data
  let hydratedData = await hydrateLabPatients((data || []) as LabRequestDTO[]);
  hydratedData = await hydrateLabTests(hydratedData);
  hydratedData = await hydrateLabRequestStaff(hydratedData);
  return hydratedData;
}

/**
 * Get pending requests for a specific patient
 */
export async function getPendingLabRequests(patientId?: string) {
  let query = supabase
    .from('lab_requests')
    .select(LAB_REQUEST_SELECT)
    .in('status', ['Pending', 'Sample Collected'])
    .order('created_at', { ascending: true });

  if (patientId) {
    query = query.eq('patient_id', patientId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Hydrate patient, test, and staff data
  let hydratedData = await hydrateLabPatients((data || []) as LabRequestDTO[]);
  hydratedData = await hydrateLabTests(hydratedData);
  hydratedData = await hydrateLabRequestStaff(hydratedData);
  return hydratedData;
}

// =============================================================================
// UUID Resolver Helpers
// =============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve external patient_id (e.g. PT-00001) to internal UUID (patients.id).
 */
async function resolvePatientUuid(identifier: string): Promise<string> {
  if (!identifier) {
    throw new Error('Patient identifier is required');
  }

  if (UUID_REGEX.test(identifier)) {
    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('id', identifier)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const { data } = await supabase
    .from('patients')
    .select('id')
    .eq('patient_id', identifier)
    .maybeSingle();

  if (!data?.id) {
    throw new Error(`Patient not found: ${identifier}`);
  }
  return data.id;
}

/**
 * Check if patient is NHIS eligible based on insurance type
 * DHML = Defence Health Maintenance Limited (default HMO for Military NHIS, NOT a separate category)
 */
function isNhisPatient(insuranceType: string | null | undefined): boolean {
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

// =============================================================================
// Accept/Reject Lab Request (Approval Workflow)
// =============================================================================

export interface AcceptLabRequestDTO {
  request_id: string;
  notes?: string;
}

export interface RejectLabRequestDTO {
  request_id: string;
  rejection_reason: string;
}

/**
 * Accept a lab request and create billing order.
 * This is called when lab technician reviews and accepts a pending request.
 * Billing is ONLY created upon acceptance, not when the request is first ordered.
 */
export async function acceptLabRequest(
  dto: AcceptLabRequestDTO,
): Promise<LabRequestDTO> {
  const { request_id, notes } = dto;

  // Deduplicate by request_id to prevent double acceptance
  return requestDeduper.dedupe(
    DedupeKeys.acceptLabRequest(request_id),
    async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('email', user.email)
        .single();

      // Get the lab request (without FK join - PostgREST doesn't detect the relationship)
      const { data: labRequest, error: fetchError } = await supabase
        .from('lab_requests')
        .select('*')
        .eq('request_id', request_id)
        .single();

      if (fetchError) throw fetchError;
      if (!labRequest) throw new Error('Lab request not found');

      // Validate request is in Pending status
      if (labRequest.status !== 'Pending') {
        throw new Error(
          `Cannot accept request with status: ${labRequest.status}`,
        );
      }

      // Fetch lab test catalogue data separately (workaround for PostgREST FK detection)
      if (!labRequest.test_id) {
        throw new Error('Test ID not found on request');
      }

      const { data: test, error: testError } = await supabase
        .from('lab_test_catalogue')
        .select('*')
        .eq('id', labRequest.test_id)
        .single();

      if (testError) throw testError;
      if (!test) {
        throw new Error('Lab test details not found in catalogue');
      }

      // Resolve patient UUID for billing
      const patientUuid = await resolvePatientUuid(labRequest.patient_id);

      // Get visit/encounter insurance info
      const encounterId = labRequest.encounter_id || labRequest.visit_id;
      let insuranceType = '';
      if (encounterId) {
        const { data: visitData } = await supabase
          .from('visits')
          .select('insurance_type, payment_category')
          .eq('id', encounterId)
          .maybeSingle();
        insuranceType =
          visitData?.insurance_type || visitData?.payment_category || '';
      }

      // Update request status to Accepted
      const { data: updatedRequest, error: updateError } = await supabase
        .from('lab_requests')
        .update({
          status: 'Accepted',
          accepted_by: staffData?.id,
          accepted_at: new Date().toISOString(),
          clinical_notes: notes
            ? `${labRequest.clinical_notes || ''}\n[Acceptance Note]: ${notes}`
            : labRequest.clinical_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', request_id)
        .select(LAB_REQUEST_SELECT)
        .single();

      if (updateError) throw updateError;

      // Calculate pricing and NHIS using the proper coverage utility
      // NHIS Price is the single source of truth for NHIS billing
      const coverage = calculateNhisServiceCoverage({
        insuranceType,
        serviceType: 'Laboratory',
        regularPrice: test.nhis_price || test.price || 0,
        nhisPrice: test.nhis_price,
        isServiceNhisCovered: test.is_nhis_covered !== false,
        serviceNhisPercentage: test.nhis_percentage,
        quantity: 1,
      });

      // Create billing order NOW (upon acceptance)
      const serviceName = `Lab Test: ${test.name}`;
      await createBillingOrder({
        patient_id: patientUuid,
        encounter_id: encounterId || undefined,
        source_module: 'lab',
        service_reference_id: request_id,
        service_code: test.code,
        service_description: serviceName,
        service_name: serviceName,
        quantity: 1,
        unit_price: coverage.grossAmount,
        unit_cost: coverage.grossAmount,
        gross_amount: coverage.grossAmount,
        service_type: 'Laboratory',
        nhis_covered: coverage.isNhis && test.is_nhis_covered !== false,
        nhis_percentage: coverage.nhisPercentage,
        nhis_payable: coverage.nhisPayable,
        patient_payable: coverage.patientPayable,
      });

      // Hydrate and return
      let [hydrated] = await hydrateLabPatients([
        updatedRequest as LabRequestDTO,
      ]);
      [hydrated] = await hydrateLabTests([hydrated]);
      [hydrated] = await hydrateLabRequestStaff([hydrated]);
      return hydrated;
    },
  ); // End of requestDeduper.dedupe
}

/**
 * Reject a lab request.
 * No billing is created for rejected requests.
 */
export async function rejectLabRequest(
  dto: RejectLabRequestDTO,
): Promise<LabRequestDTO> {
  const { request_id, rejection_reason } = dto;

  // Deduplicate by request_id to prevent double rejection
  return requestDeduper.dedupe(
    DedupeKeys.rejectLabRequest(request_id),
    async () => {
      if (!rejection_reason?.trim()) {
        throw new Error('Rejection reason is required');
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, staff_id')
        .eq('email', user.email)
        .single();

      // Validate request exists and is pending
      const { data: labRequest, error: fetchError } = await supabase
        .from('lab_requests')
        .select('status')
        .eq('request_id', request_id)
        .single();

      if (fetchError) throw fetchError;
      if (!labRequest) throw new Error('Lab request not found');

      if (labRequest.status !== 'Pending') {
        throw new Error(
          `Cannot reject request with status: ${labRequest.status}`,
        );
      }

      // Update request status to Rejected
      const { data: updatedRequest, error: updateError } = await supabase
        .from('lab_requests')
        .update({
          status: 'Rejected',
          rejected_by: staffData?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', request_id)
        .select(LAB_REQUEST_SELECT)
        .single();

      if (updateError) throw updateError;

      // Hydrate and return - NO billing created for rejected requests
      let [hydrated] = await hydrateLabPatients([
        updatedRequest as LabRequestDTO,
      ]);
      [hydrated] = await hydrateLabTests([hydrated]);
      [hydrated] = await hydrateLabRequestStaff([hydrated]);
      return hydrated;
    },
  ); // End of requestDeduper.dedupe
}

// =============================================================================
// Batch Accept/Reject Functions
// =============================================================================

export interface BatchAcceptLabRequestsDTO {
  request_ids: string[];
  notes?: string;
}

export interface BatchRejectLabRequestsDTO {
  request_ids: string[];
  rejection_reason: string;
}

export interface BatchResultDTO {
  successful: string[];
  failed: Array<{ request_id: string; error: string }>;
}

/**
 * Accept multiple lab requests in a single operation.
 * Each request creates its own billing order.
 *
 * OPTIMIZED: Pre-fetches all data, then processes with Promise.allSettled
 */
export async function batchAcceptLabRequests(
  dto: BatchAcceptLabRequestsDTO,
): Promise<BatchResultDTO> {
  const { request_ids, notes } = dto;
  const result: BatchResultDTO = { successful: [], failed: [] };

  if (request_ids.length === 0) {
    return result;
  }

  // Get current user once
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, staff_id')
    .eq('email', user.email)
    .single();

  // Pre-fetch all lab requests
  const { data: labRequests, error: fetchError } = await supabase
    .from('lab_requests')
    .select('*')
    .in('request_id', request_ids);

  if (fetchError) {
    for (const id of request_ids) {
      result.failed.push({ request_id: id, error: fetchError.message });
    }
    return result;
  }

  const requestMap = new Map(labRequests?.map((r) => [r.request_id, r]) || []);

  // Collect test IDs for bulk fetch
  const testIds = [
    ...new Set(labRequests?.map((r) => r.test_id).filter(Boolean) || []),
  ];

  // Pre-fetch all lab tests
  const { data: tests } = await supabase
    .from('lab_test_catalogue')
    .select('*')
    .in('id', testIds);

  const testMap = new Map(tests?.map((t) => [t.id, t]) || []);

  // Collect encounter IDs for bulk insurance fetch
  const encounterIds = [
    ...new Set(
      labRequests?.map((r) => r.encounter_id || r.visit_id).filter(Boolean) ||
        [],
    ),
  ];

  // Pre-fetch all visit insurance info
  const { data: visits } = await supabase
    .from('visits')
    .select('id, insurance_type, payment_category')
    .in('id', encounterIds);

  const visitMap = new Map(visits?.map((v) => [v.id, v]) || []);

  // Process each request
  const processingPromises = request_ids.map(
    async (
      request_id,
    ): Promise<{ id: string; success: boolean; error?: string }> => {
      try {
        const labRequest = requestMap.get(request_id);
        if (!labRequest) {
          return {
            id: request_id,
            success: false,
            error: 'Lab request not found',
          };
        }

        if (labRequest.status !== 'Pending') {
          return {
            id: request_id,
            success: false,
            error: `Cannot accept request with status: ${labRequest.status}`,
          };
        }

        const test = testMap.get(labRequest.test_id);
        if (!test) {
          return {
            id: request_id,
            success: false,
            error: 'Lab test not found in catalogue',
          };
        }

        const encounterId = labRequest.encounter_id || labRequest.visit_id;
        const visit = encounterId ? visitMap.get(encounterId) : null;
        const insuranceType =
          visit?.insurance_type || visit?.payment_category || '';

        // Update request status
        const { error: updateError } = await supabase
          .from('lab_requests')
          .update({
            status: 'Accepted',
            accepted_by: staffData?.id,
            accepted_at: new Date().toISOString(),
            clinical_notes: notes
              ? `${labRequest.clinical_notes || ''}\n[Acceptance Note]: ${notes}`
              : labRequest.clinical_notes,
            updated_at: new Date().toISOString(),
          })
          .eq('request_id', request_id);

        if (updateError) {
          return { id: request_id, success: false, error: updateError.message };
        }

        // Calculate pricing and create billing
        // NHIS Price is the single source of truth for NHIS billing
        const coverage = calculateNhisServiceCoverage({
          insuranceType,
          serviceType: 'Laboratory',
          regularPrice: test.nhis_price || test.price || 0,
          nhisPrice: test.nhis_price,
          isServiceNhisCovered: test.is_nhis_covered !== false,
          serviceNhisPercentage: test.nhis_percentage,
          quantity: 1,
        });

        const patientUuid = await resolvePatientUuid(labRequest.patient_id);
        const serviceName = `Lab Test: ${test.name}`;

        await createBillingOrder({
          patient_id: patientUuid,
          encounter_id: encounterId || undefined,
          source_module: 'lab',
          service_reference_id: request_id,
          service_code: test.code,
          service_description: serviceName,
          service_name: serviceName,
          quantity: 1,
          unit_price: coverage.grossAmount,
          unit_cost: coverage.grossAmount,
          gross_amount: coverage.grossAmount,
          service_type: 'Laboratory',
          nhis_covered: coverage.isNhis,
          nhis_percentage: coverage.nhisPercentage,
          nhis_payable: coverage.nhisPayable,
          patient_payable: coverage.patientPayable,
        });

        return { id: request_id, success: true };
      } catch (error) {
        return {
          id: request_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // Run all with proper error isolation
  const outcomes = await Promise.allSettled(processingPromises);

  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      const { id, success, error } = outcome.value;
      if (success) {
        result.successful.push(id);
      } else {
        result.failed.push({ request_id: id, error: error || 'Unknown error' });
      }
    } else {
      // This shouldn't happen but handle it
      result.failed.push({
        request_id: 'unknown',
        error: outcome.reason?.message || 'Promise rejected',
      });
    }
  }

  return result;
}

/**
 * Reject multiple lab requests in a single operation.
 * No billing is created for rejected requests.
 *
 * OPTIMIZED: Uses bulk .in() query instead of N sequential queries
 */
export async function batchRejectLabRequests(
  dto: BatchRejectLabRequestsDTO,
): Promise<BatchResultDTO> {
  const { request_ids, rejection_reason } = dto;
  const result: BatchResultDTO = { successful: [], failed: [] };

  if (request_ids.length === 0) {
    return result;
  }

  // Get current user once
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('email', user.email)
    .single();

  // Pre-fetch all requests to validate status
  const { data: existingRequests, error: fetchError } = await supabase
    .from('lab_requests')
    .select('request_id, status')
    .in('request_id', request_ids);

  if (fetchError) {
    // All failed due to fetch error
    for (const id of request_ids) {
      result.failed.push({ request_id: id, error: fetchError.message });
    }
    return result;
  }

  // Separate valid (Pending) from invalid requests
  const existingMap = new Map(
    existingRequests?.map((r) => [r.request_id, r.status]) || [],
  );
  const validIds: string[] = [];

  for (const id of request_ids) {
    const status = existingMap.get(id);
    if (!status) {
      result.failed.push({ request_id: id, error: 'Lab request not found' });
    } else if (status !== 'Pending') {
      result.failed.push({
        request_id: id,
        error: `Cannot reject request with status: ${status}`,
      });
    } else {
      validIds.push(id);
    }
  }

  // Bulk update all valid requests
  if (validIds.length > 0) {
    const { error: updateError } = await supabase
      .from('lab_requests')
      .update({
        status: 'Rejected',
        rejected_by: staffData?.id,
        rejected_at: new Date().toISOString(),
        rejection_reason,
        updated_at: new Date().toISOString(),
      })
      .in('request_id', validIds);

    if (updateError) {
      // All valid IDs failed
      for (const id of validIds) {
        result.failed.push({ request_id: id, error: updateError.message });
      }
    } else {
      result.successful = validIds;
    }
  }

  return result;
}